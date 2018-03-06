/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';

const Audit = require('./audit');
const Util = require('../report/v2/renderer/util');
const UnusedBytes = require('./byte-efficiency/byte-efficiency-audit');
const THRESHOLD_IN_MS = 100;

class UsesRelPreloadAudit extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      category: 'Performance',
      name: 'uses-rel-preload',
      description: 'Preload key requests',
      informative: true,
      helpText: 'Consider using <link rel=preload> to prioritize fetching late-discovered ' +
        'resources sooner [Learn more](https://developers.google.com/web/updates/2016/03/link-rel-preload).',
      requiredArtifacts: ['devtoolsLogs', 'traces'],
      scoringMode: Audit.SCORING_MODES.NUMERIC,
    };
  }

  static _flattenRequests(chains, maxLevel, minLevel = 0) {
    const requests = [];
    const flatten = (chains, level) => {
      Object.keys(chains).forEach(chain => {
        if (chains[chain]) {
          const currentChain = chains[chain];
          if (level >= minLevel) {
            requests.push(currentChain.request);
          }

          if (level < maxLevel) {
            flatten(currentChain.children, level + 1);
          }
        }
      });
    };

    flatten(chains, 0);

    return requests;
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const devtoolsLogs = artifacts.devtoolsLogs[UsesRelPreloadAudit.DEFAULT_PASS];

    return Promise.all([
      artifacts.requestCriticalRequestChains(devtoolsLogs),
      artifacts.requestMainResource(devtoolsLogs),
    ]).then(([critChains, mainResource]) => {
      const results = [];
      let maxWasted = 0;
      // get all critical requests 2 + mainResourceIndex levels deep
      const mainResourceIndex = mainResource.redirects ? mainResource.redirects.length : 0;

      const criticalRequests = UsesRelPreloadAudit._flattenRequests(critChains,
        3 + mainResourceIndex, 2 + mainResourceIndex);
      criticalRequests.forEach(request => {
        const networkRecord = request;
        if (!networkRecord._isLinkPreload && networkRecord.protocol !== 'data') {
          // calculate time between mainresource.endTime and resource start time
          const wastedMs = Math.min(request._startTime - mainResource._endTime,
            request._endTime - request._startTime) * 1000;

          if (wastedMs >= THRESHOLD_IN_MS) {
            maxWasted = Math.max(wastedMs, maxWasted);
            results.push({
              url: request.url,
              wastedMs: Util.formatMilliseconds(wastedMs),
            });
          }
        }
      });

      // sort results by wastedTime DESC
      results.sort((a, b) => b.wastedMs - a.wastedMs);

      const headings = [
        {key: 'url', itemType: 'url', text: 'URL'},
        {key: 'wastedMs', itemType: 'text', text: 'Potential Savings'},
      ];
      const details = Audit.makeTableDetails(headings, results);

      return {
        score: UnusedBytes.scoreForWastedMs(maxWasted),
        rawValue: maxWasted,
        displayValue: Util.formatMilliseconds(maxWasted),
        extendedInfo: {
          value: results,
        },
        details,
      };
    });
  }
}

module.exports = UsesRelPreloadAudit;
