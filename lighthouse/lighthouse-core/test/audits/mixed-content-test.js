/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../../audits/mixed-content.js');
const assert = require('assert');

/* eslint-env jest */

describe('Mixed Content audit', () => {
  function getArtifacts(baseUrl, defaultPassRecords, mixedContentPassRecords) {
    return {
      MixedContent: {url: baseUrl},
      devtoolsLogs: {[Audit.DEFAULT_PASS]: true, ['mixedContentPass']: false},
      requestNetworkRecords: (pass) => {
        if (pass) {
          return Promise.resolve(defaultPassRecords);
        } else {
          return Promise.resolve(mixedContentPassRecords);
        }
      },
    };
  }

  it('passes when there are no insecure resources by default', () => {
    const defaultRecords = [
      {url: 'https://example.org/', isSecure: true, finished: true, documentURL: 'https://example.org/'},
      {url: 'https://example.org/resource1.js', isSecure: true, finished: true, documentURL: 'https://example.org'},
      {url: 'https://third-party.example.com/resource2.js', isSecure: true, finished: true, documentURL: 'https://example.org'},
    ];
    const upgradeRecords = [
      {url: 'https://example.org/', isSecure: true, finished: true, documentURL: 'http://example.org/'},
      {url: 'https://example.org/resource1.js', isSecure: true, finished: true, documentURL: 'https://example.org'},
      {url: 'https://third-party.example.com/resource2.js', isSecure: true, finished: true, documentURL: 'https://example.org'},
    ];
    return Audit.audit(
      getArtifacts('https://example.org', defaultRecords, upgradeRecords)
    ).then(result => {
      assert.strictEqual(result.rawValue, true);
      assert.strictEqual(result.score, 1);
    });
  });

  it('finds resources that could be upgraded to https', () => {
    const defaultRecords = [
      {url: 'http://example.org/', isSecure: false, finished: true, documentURL: 'http://example.org/'},
      {url: 'http://example.org/resource1.js', isSecure: false, finished: true, documentURL: 'https://example.org'},
      {url: 'http://third-party.example.com/resource2.js', isSecure: false, finished: true, documentURL: 'https://example.org'},
      {url: 'http://fourth-party.example.com/resource3.js', isSecure: false, finished: true, documentURL: 'https://third-party.example.com'},
    ];
    const upgradeRecords = [
      {url: 'https://example.org/', isSecure: true, finished: true, documentURL: 'http://example.org/'},
      {url: 'https://example.org/resource1.js', isSecure: true, finished: true, documentURL: 'https://example.org'},
      {url: 'https://third-party.example.com/resource2.js', isSecure: true, finished: true, documentURL: 'https://example.org'},
      {url: 'https://fourth-party.example.com/resource3.js', isSecure: false, finished: true, documentURL: 'https://third-party.example.com'},
    ];
    return Audit.audit(
      getArtifacts('http://example.org', defaultRecords, upgradeRecords)
    ).then(result => {
      // Score for 3 upgradeable out of 4: 100 * (0 + 3*0.5) / 4
      assert.strictEqual(result.rawValue, false);
      assert.strictEqual(result.score, 0.375);
    });
  });
});
