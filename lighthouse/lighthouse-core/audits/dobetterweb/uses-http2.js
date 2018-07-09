/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Audit a page to ensure that resource loaded over its own
 * origin are over the http/2 protocol.
 */

'use strict';

const URL = require('../../lib/url-shim');
const Audit = require('../audit');
const Util = require('../../report/html/renderer/util.js');

class UsesHTTP2Audit extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'uses-http2',
      title: 'Uses HTTP/2 for its own resources',
      failureTitle: 'Does not use HTTP/2 for all of its resources',
      description: 'HTTP/2 offers many benefits over HTTP/1.1, including binary headers, ' +
          'multiplexing, and server push. [Learn more](https://developers.google.com/web/tools/lighthouse/audits/http2).',
      requiredArtifacts: ['URL', 'devtoolsLogs'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {Promise<LH.Audit.Product>}
   */
  static audit(artifacts) {
    const devtoolsLogs = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    return artifacts.requestNetworkRecords(devtoolsLogs).then(networkRecords => {
      const finalHost = new URL(artifacts.URL.finalUrl).host;

      const seenURLs = new Set();
      // Filter requests that are on the same host as the page and not over h2.
      const resources = networkRecords.filter(record => {
        // test the protocol first to avoid (potentially) expensive URL parsing
        const isOldHttp = /HTTP\/[01][.\d]?/i.test(record.protocol);
        if (!isOldHttp) return false;
        const requestHost = new URL(record.url).host;
        return requestHost === finalHost;
      }).map(record => {
        return {
          protocol: record.protocol,
          url: record.url,
        };
      }).filter(record => {
        if (seenURLs.has(record.url)) return false;
        seenURLs.add(record.url);
        return true;
      });

      let displayValue = '';
      if (resources.length > 1) {
        displayValue =
          `${Util.formatNumber(resources.length)} requests not served via HTTP/2`;
      } else if (resources.length === 1) {
        displayValue = `${resources.length} request not served via HTTP/2`;
      }

      const headings = [
        {key: 'url', itemType: 'url', text: 'URL'},
        {key: 'protocol', itemType: 'text', text: 'Protocol'},
      ];
      const details = Audit.makeTableDetails(headings, resources);

      return {
        rawValue: resources.length === 0,
        displayValue: displayValue,
        extendedInfo: {
          value: {
            results: resources,
          },
        },
        details,
      };
    });
  }
}

module.exports = UsesHTTP2Audit;
