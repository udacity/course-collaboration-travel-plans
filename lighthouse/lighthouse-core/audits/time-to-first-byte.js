/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const Util = require('../report/v2/renderer/util');

const TTFB_THRESHOLD = 600;

class TTFBMetric extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      name: 'time-to-first-byte',
      description: 'Keep server response times low (TTFB)',
      informative: true,
      helpText: 'Time To First Byte identifies the time at which your server sends a response.' +
        ' [Learn more](https://developers.google.com/web/tools/chrome-devtools/network-performance/issues).',
      requiredArtifacts: ['devtoolsLogs', 'URL'],
    };
  }

  static caclulateTTFB(record) {
    const timing = record._timing;

    return timing.receiveHeadersEnd - timing.sendEnd;
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const devtoolsLogs = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];

    return artifacts.requestNetworkRecords(devtoolsLogs)
      .then((networkRecords) => {
        let displayValue = '';

        const finalUrl = artifacts.URL.finalUrl;
        const finalUrlRequest = networkRecords.find(record => record._url === finalUrl);
        const ttfb = TTFBMetric.caclulateTTFB(finalUrlRequest);
        const passed = ttfb < TTFB_THRESHOLD;

        if (!passed) {
          displayValue = `Root document took ${Util.formatMilliseconds(ttfb, 1)} `;
        }

        return {
          rawValue: ttfb,
          score: passed,
          displayValue,
          extendedInfo: {
            value: {
              wastedMs: ttfb - TTFB_THRESHOLD,
            },
          },
        };
      });
  }
}

module.exports = TTFBMetric;
