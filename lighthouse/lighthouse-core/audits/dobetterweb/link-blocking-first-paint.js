/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Audit a page to see if it does not use <link> that block first paint.
 */

'use strict';

const Audit = require('../audit');
const Util = require('../../report/v2/renderer/util.js');
const ByteEfficiencyAudit = require('../byte-efficiency/byte-efficiency-audit');

// Because of the way we detect blocking stylesheets, asynchronously loaded
// CSS with link[rel=preload] and an onload handler (see https://github.com/filamentgroup/loadCSS)
// can be falsely flagged as blocking. Therefore, ignore stylesheets that loaded fast enough
// to possibly be non-blocking (and they have minimal impact anyway).
const LOAD_THRESHOLD_IN_MS = 50;

class LinkBlockingFirstPaintAudit extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      name: 'link-blocking-first-paint',
      description: 'Reduce render-blocking stylesheets',
      informative: true,
      helpText: 'External stylesheets are blocking the first paint of your page. Consider ' +
          'delivering critical CSS via `<style>` tags and deferring non-critical ' +
          'styles. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/blocking-resources).',
      requiredArtifacts: ['TagsBlockingFirstPaint', 'traces'],
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @param {string} tagFilter The tagName to filter on
   * @param {number=} endTimeMax The trace milisecond timestamp that offending tags must have ended
   *    before (typically first contentful paint).
   * @param {number=} loadDurationThreshold Filter to resources that took at least this
   *    many milliseconds to load.
   * @return {!AuditResult} The object to pass to `generateAuditResult`
   */
  static computeAuditResultForTags(artifacts, tagFilter, endTimeMax = Infinity,
      loadDurationThreshold = 0) {
    const artifact = artifacts.TagsBlockingFirstPaint;

    const filtered = artifact.filter(item => {
      return item.tag.tagName === tagFilter &&
        (item.endTime - item.startTime) * 1000 >= loadDurationThreshold &&
        item.endTime * 1000 < endTimeMax;
    });

    const startTime = filtered.length === 0 ? 0 :
        filtered.reduce((t, item) => Math.min(t, item.startTime), Number.MAX_VALUE);
    let endTime = 0;

    const results = filtered
      .map(item => {
        endTime = Math.max(item.endTime, endTime);

        return {
          url: item.tag.url,
          totalKb: ByteEfficiencyAudit.bytesDetails(item.transferSize),
          totalMs: {
            type: 'ms',
            value: (item.endTime - startTime) * 1000,
            granularity: 1,
          },
        };
      })
      .sort((a, b) => b.totalMs.value - a.totalMs.value);

    const rawDelayTime = Math.round((endTime - startTime) * 1000);
    const delayTime = Util.formatMilliseconds(rawDelayTime, 1);
    let displayValue = '';
    if (results.length > 1) {
      displayValue = `${results.length} resources delayed first paint by ${delayTime}`;
    } else if (results.length === 1) {
      displayValue = `${results.length} resource delayed first paint by ${delayTime}`;
    }

    const headings = [
      {key: 'url', itemType: 'url', text: 'URL'},
      {key: 'totalKb', itemType: 'text', text: 'Size (KB)'},
      {key: 'totalMs', itemType: 'text', text: 'Delayed Paint By (ms)'},
    ];

    const tableDetails = Audit.makeTableDetails(headings, results);

    return {
      displayValue,
      score: ByteEfficiencyAudit.scoreForWastedMs(rawDelayTime),
      rawValue: rawDelayTime,
      extendedInfo: {
        value: {
          wastedMs: delayTime,
          results,
        },
      },
      details: tableDetails,
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    return artifacts.requestTraceOfTab(trace).then(traceOfTab => {
      const fcpTsInMs = traceOfTab.timestamps.firstContentfulPaint / 1000;
      return this.computeAuditResultForTags(artifacts, 'LINK', fcpTsInMs, LOAD_THRESHOLD_IN_MS);
    });
  }
}

module.exports = LinkBlockingFirstPaintAudit;
