/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const UsesHTTP2Audit = require('../../../audits/dobetterweb/uses-http2.js');
const assert = require('assert');

const URL = 'https://webtide.com/http2-push-demo/';
const networkRecords = require('../../fixtures/networkRecords-mix.json');

/* eslint-env jest */

describe('Resources are fetched over http/2', () => {
  it('fails when some resources were requested via http/1.x', () => {
    return UsesHTTP2Audit.audit({
      URL: {finalUrl: URL},
      devtoolsLogs: {[UsesHTTP2Audit.DEFAULT_PASS]: []},
      requestNetworkRecords: () => Promise.resolve(networkRecords),
    }).then(auditResult => {
      assert.equal(auditResult.rawValue, false);
      assert.ok(auditResult.displayValue.match('3 requests not'));
      assert.equal(auditResult.details.items.length, 3);
      assert.equal(auditResult.details.items[0].url, 'https://webtide.com/wp-content/plugins/wp-pagenavi/pagenavi-css.css?ver=2.70');
      const headers = auditResult.details.headings;
      assert.equal(headers[0].text, 'URL', 'table headings are correct and in order');
      assert.equal(headers[1].text, 'Protocol', 'table headings are correct and in order');
    });
  });

  it('displayValue is correct when only one resource fails', () => {
    const entryWithHTTP1 = networkRecords.slice(1, 2);
    return UsesHTTP2Audit.audit({
      URL: {finalUrl: URL},
      devtoolsLogs: {[UsesHTTP2Audit.DEFAULT_PASS]: []},
      requestNetworkRecords: () => Promise.resolve(entryWithHTTP1),
    }).then(auditResult => {
      assert.ok(auditResult.displayValue.match('1 request not'));
    });
  });

  it('passes when all resources were requested via http/2', () => {
    const h2Records = JSON.parse(JSON.stringify(networkRecords));
    h2Records.forEach(record => {
      record.protocol = 'h2';
    });

    return UsesHTTP2Audit.audit({
      URL: {finalUrl: URL},
      devtoolsLogs: {[UsesHTTP2Audit.DEFAULT_PASS]: []},
      requestNetworkRecords: () => Promise.resolve(h2Records),
    }).then(auditResult => {
      assert.equal(auditResult.rawValue, true);
      assert.ok(auditResult.displayValue === '');
    });
  });
});
