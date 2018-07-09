/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const URL = require('../lib/url-shim');
const Util = require('../report/html/renderer/util');

const SECURE_SCHEMES = ['data', 'https', 'wss', 'blob', 'chrome', 'chrome-extension', 'about'];
const SECURE_DOMAINS = ['localhost', '127.0.0.1'];

class HTTPS extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'is-on-https',
      title: 'Uses HTTPS',
      failureTitle: 'Does not use HTTPS',
      description: 'All sites should be protected with HTTPS, even ones that don\'t handle ' +
          'sensitive data. HTTPS prevents intruders from tampering with or passively listening ' +
          'in on the communications between your app and your users, and is a prerequisite for ' +
          'HTTP/2 and many new web platform APIs. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/https).',
      requiredArtifacts: ['devtoolsLogs'],
    };
  }

  /**
   * @param {{parsedURL: {scheme: string, host: string}, protocol: string}} record
   * @return {boolean}
   */
  static isSecureRecord(record) {
    return SECURE_SCHEMES.includes(record.parsedURL.scheme) ||
           SECURE_SCHEMES.includes(record.protocol) ||
           SECURE_DOMAINS.includes(record.parsedURL.host);
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {Promise<LH.Audit.Product>}
   */
  static audit(artifacts) {
    const devtoolsLogs = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    return artifacts.requestNetworkRecords(devtoolsLogs).then(networkRecords => {
      const insecureURLs = networkRecords
          .filter(record => !HTTPS.isSecureRecord(record))
          .map(record => URL.elideDataURI(record.url));

      let displayValue = '';
      if (insecureURLs.length > 1) {
        displayValue = `${Util.formatNumber(insecureURLs.length)} insecure requests found`;
      } else if (insecureURLs.length === 1) {
        displayValue = `${insecureURLs.length} insecure request found`;
      }

      const items = Array.from(new Set(insecureURLs)).map(url => ({url}));

      const headings = [
        {key: 'url', itemType: 'url', text: 'Insecure URL'},
      ];

      return {
        rawValue: items.length === 0,
        displayValue,
        extendedInfo: {
          value: items,
        },
        details: Audit.makeTableDetails(headings, items),
      };
    });
  }
}

module.exports = HTTPS;
