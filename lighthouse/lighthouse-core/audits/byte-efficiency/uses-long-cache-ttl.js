/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert');
const parseCacheControl = require('parse-cache-control');
const ByteEfficiencyAudit = require('./byte-efficiency-audit');
const WebInspector = require('../../lib/web-inspector');
const URL = require('../../lib/url-shim');

// Ignore assets that have very high likelihood of cache hit
const IGNORE_THRESHOLD_IN_PERCENT = 0.925;

// Scoring curve: https://www.desmos.com/calculator/zokzso8umm
const SCORING_POINT_OF_DIMINISHING_RETURNS = 4; // 4 KB
const SCORING_MEDIAN = 768; // 768 KB

class CacheHeaders extends ByteEfficiencyAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Caching',
      name: 'uses-long-cache-ttl',
      description: 'Uses efficient cache policy on static assets',
      failureDescription: 'Uses inefficient cache policy on static assets',
      helpText:
        'A long cache lifetime can speed up repeat visits to your page. ' +
        '[Learn more](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching#cache-control).',
      scoringMode: ByteEfficiencyAudit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['devtoolsLogs'],
    };
  }

  /**
   * Interpolates the y value at a point x on the line defined by (x0, y0) and (x1, y1)
   * @param {number} x0
   * @param {number} y0
   * @param {number} x1
   * @param {number} y1
   * @param {number} x
   * @return {number}
   */
  static linearInterpolation(x0, y0, x1, y1, x) {
    const slope = (y1 - y0) / (x1 - x0);
    return y0 + (x - x0) * slope;
  }

  /**
   * Computes the percent likelihood that a return visit will be within the cache lifetime, based on
   * Chrome UMA stats see the note below.
   * @param {number} maxAgeInSeconds
   * @return {number}
   */
  static getCacheHitProbability(maxAgeInSeconds) {
    // This array contains the hand wavy distribution of the age of a resource in hours at the time of
    // cache hit at 0th, 10th, 20th, 30th, etc percentiles. This is used to compute `wastedMs` since there
    // are clearly diminishing returns to cache duration i.e. 6 months is not 2x better than 3 months.
    // Based on UMA stats for HttpCache.StaleEntry.Validated.Age, see https://www.desmos.com/calculator/7v0qh1nzvh
    // Example: a max-age of 12 hours already covers ~50% of cases, doubling to 24 hours covers ~10% more.
    const RESOURCE_AGE_IN_HOURS_DECILES = [0, 0.2, 1, 3, 8, 12, 24, 48, 72, 168, 8760, Infinity];
    assert.ok(RESOURCE_AGE_IN_HOURS_DECILES.length === 12, 'deciles 0-10 and 1 for overflow');

    const maxAgeInHours = maxAgeInSeconds / 3600;
    const upperDecileIndex = RESOURCE_AGE_IN_HOURS_DECILES.findIndex(
      decile => decile >= maxAgeInHours
    );

    // Clip the likelihood between 0 and 1
    if (upperDecileIndex === RESOURCE_AGE_IN_HOURS_DECILES.length - 1) return 1;
    if (upperDecileIndex === 0) return 0;

    // Use the two closest decile points as control points
    const upperDecileValue = RESOURCE_AGE_IN_HOURS_DECILES[upperDecileIndex];
    const lowerDecileValue = RESOURCE_AGE_IN_HOURS_DECILES[upperDecileIndex - 1];
    const upperDecile = upperDecileIndex / 10;
    const lowerDecile = (upperDecileIndex - 1) / 10;

    // Approximate the real likelihood with linear interpolation
    return CacheHeaders.linearInterpolation(
      lowerDecileValue,
      lowerDecile,
      upperDecileValue,
      upperDecile,
      maxAgeInHours
    );
  }

  /**
   * Computes the user-specified cache lifetime, 0 if explicit no-cache policy is in effect, and null if not
   * user-specified. See https://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html
   *
   * @param {!Map<string,string>} headers
   * @param {!Object} cacheControl Follows the potential settings of cache-control, see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Cache-Control
   * @return {?number}
   */
  static computeCacheLifetimeInSeconds(headers, cacheControl) {
    if (cacheControl) {
      // Cache-Control takes precendence over expires
      if (cacheControl['no-cache'] || cacheControl['no-store']) return 0;
      if (Number.isFinite(cacheControl['max-age'])) return Math.max(cacheControl['max-age'], 0);
    } else if ((headers.get('pragma') || '').includes('no-cache')) {
      // The HTTP/1.0 Pragma header can disable caching if cache-control is not set, see https://tools.ietf.org/html/rfc7234#section-5.4
      return 0;
    }

    if (headers.has('expires')) {
      const expires = new Date(headers.get('expires')).getTime();
      // Invalid expires values MUST be treated as already expired
      if (!expires) return 0;
      return Math.max(0, Math.ceil((expires - Date.now()) / 1000));
    }

    return null;
  }

  /**
   * Given a network record, returns whether we believe the asset is cacheable, i.e. it was a network
   * request that satisifed the conditions:
   *
   *  1. Has a cacheable status code
   *  2. Has a resource type that corresponds to static assets (image, script, stylesheet, etc).
   *
   * Allowing assets with a query string is debatable, PSI considered them non-cacheable with a similar
   * caveat.
   *
   * TODO: Investigate impact in HTTPArchive, experiment with this policy to see what changes.
   *
   * @param {!WebInspector.NetworkRequest} record
   * @return {boolean}
   */
  static isCacheableAsset(record) {
    const CACHEABLE_STATUS_CODES = new Set([200, 203, 206]);

    const STATIC_RESOURCE_TYPES = new Set([
      WebInspector.resourceTypes.Font,
      WebInspector.resourceTypes.Image,
      WebInspector.resourceTypes.Media,
      WebInspector.resourceTypes.Script,
      WebInspector.resourceTypes.Stylesheet,
    ]);

    const resourceUrl = record._url;
    return (
      CACHEABLE_STATUS_CODES.has(record.statusCode) &&
      STATIC_RESOURCE_TYPES.has(record._resourceType) &&
      !resourceUrl.includes('data:')
    );
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const devtoolsLogs = artifacts.devtoolsLogs[ByteEfficiencyAudit.DEFAULT_PASS];
    return artifacts.requestNetworkRecords(devtoolsLogs).then(records => {
      const results = [];
      let queryStringCount = 0;
      let totalWastedBytes = 0;

      for (const record of records) {
        if (!CacheHeaders.isCacheableAsset(record)) continue;

        const headers = new Map();
        for (const header of record._responseHeaders) {
          headers.set(header.name.toLowerCase(), header.value);
        }

        const cacheControl = parseCacheControl(headers.get('cache-control'));
        let cacheLifetimeInSeconds = CacheHeaders.computeCacheLifetimeInSeconds(
          headers,
          cacheControl
        );

        // Ignore assets with an explicit no-cache policy
        if (cacheLifetimeInSeconds === 0) continue;
        cacheLifetimeInSeconds = cacheLifetimeInSeconds || 0;

        const cacheHitProbability = CacheHeaders.getCacheHitProbability(cacheLifetimeInSeconds);
        if (cacheHitProbability > IGNORE_THRESHOLD_IN_PERCENT) continue;

        const url = URL.elideDataURI(record._url);
        const totalBytes = record._transferSize;
        const totalKb = ByteEfficiencyAudit.bytesDetails(totalBytes);
        const wastedBytes = (1 - cacheHitProbability) * totalBytes;
        const cacheLifetimeDisplay = {
          type: 'ms',
          value: cacheLifetimeInSeconds,
          displayUnit: 'duration',
        };

        totalWastedBytes += wastedBytes;
        if (url.includes('?')) queryStringCount++;

        results.push({
          url,
          cacheControl,
          cacheLifetimeInSeconds,
          cacheLifetimeDisplay,
          cacheHitProbability,
          totalKb,
          totalBytes,
          wastedBytes,
        });
      }

      results.sort(
        (a, b) => a.cacheLifetimeInSeconds - b.cacheLifetimeInSeconds || b.totalBytes - a.totalBytes
      );

      // Use the CDF of a log-normal distribution for scoring.
      //   <= 4KB: score≈100
      //   768KB: score=50
      //   >= 4600KB: score≈5
      const score = ByteEfficiencyAudit.computeLogNormalScore(
        totalWastedBytes / 1024,
        SCORING_POINT_OF_DIMINISHING_RETURNS,
        SCORING_MEDIAN
      );

      const headings = [
        {key: 'url', itemType: 'url', text: 'URL'},
        {key: 'cacheLifetimeDisplay', itemType: 'text', text: 'Cache TTL'},
        {key: 'totalKb', itemType: 'text', text: 'Size (KB)'},
      ];

      const tableDetails = ByteEfficiencyAudit.makeTableDetails(headings, results);

      return {
        score,
        rawValue: totalWastedBytes,
        displayValue: `${results.length} asset${results.length !== 1 ? 's' : ''} found`,
        extendedInfo: {
          value: {
            results,
            queryStringCount,
          },
        },
        details: tableDetails,
      };
    });
  }
}

module.exports = CacheHeaders;
