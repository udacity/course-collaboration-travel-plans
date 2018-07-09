/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const NetworkRecorder = require('../../lib/network-recorder');
const assert = require('assert');
const devtoolsLogItems = require('../fixtures/artifacts/perflog/defaultPass.devtoolslog.json');
const redirectsDevtoolsLog = require('../fixtures/wikipedia-redirect.devtoolslog.json');

/* eslint-env jest */
describe('network recorder', function() {
  it('recordsFromLogs expands into records', function() {
    assert.equal(devtoolsLogItems.length, 555);
    const records = NetworkRecorder.recordsFromLogs(devtoolsLogItems);
    assert.equal(records.length, 76);
  });

  it('handles redirects properly', () => {
    const records = NetworkRecorder.recordsFromLogs(redirectsDevtoolsLog);
    assert.equal(records.length, 25);

    const [redirectA, redirectB, redirectC, mainDocument] = records.slice(0, 4);
    assert.equal(redirectA.initiatorRequest, undefined);
    assert.equal(redirectA.redirectSource, undefined);
    assert.equal(redirectA.redirectDestination, redirectB);
    assert.equal(redirectB.initiatorRequest, redirectA);
    assert.equal(redirectB.redirectSource, redirectA);
    assert.equal(redirectB.redirectDestination, redirectC);
    assert.equal(redirectC.initiatorRequest, redirectB);
    assert.equal(redirectC.redirectSource, redirectB);
    assert.equal(redirectC.redirectDestination, mainDocument);
    assert.equal(mainDocument.initiatorRequest, redirectC);
    assert.equal(mainDocument.redirectSource, redirectC);
    assert.equal(mainDocument.redirectDestination, undefined);

    const redirectURLs = mainDocument.redirects.map(request => request.url);
    assert.deepStrictEqual(redirectURLs, [redirectA.url, redirectB.url, redirectC.url]);

    assert.equal(redirectA.resourceType, undefined);
    assert.equal(redirectB.resourceType, undefined);
    assert.equal(redirectC.resourceType, undefined);
    assert.equal(mainDocument.resourceType, 'Document');
  });

  describe('#findNetworkQuietPeriods', () => {
    function record(data) {
      const url = data.url || 'https://example.com';
      const scheme = url.split(':')[0];
      return Object.assign({
        url,
        finished: !!data.endTime,
        parsedURL: {scheme},
      }, data);
    }

    it('should find the 0-quiet periods', () => {
      const records = [
        record({startTime: 0, endTime: 1}),
        record({startTime: 2, endTime: 3}),
        record({startTime: 4, endTime: 5}),
      ];

      const periods = NetworkRecorder.findNetworkQuietPeriods(records, 0);
      assert.deepStrictEqual(periods, [
        {start: 1000, end: 2000},
        {start: 3000, end: 4000},
        {start: 5000, end: Infinity},
      ]);
    });

    it('should find the 2-quiet periods', () => {
      const records = [
        record({startTime: 0, endTime: 1.5}),
        record({startTime: 0, endTime: 2}),
        record({startTime: 0, endTime: 2.5}),
        record({startTime: 2, endTime: 3}),
        record({startTime: 4, endTime: 5}),
      ];

      const periods = NetworkRecorder.findNetworkQuietPeriods(records, 2);
      assert.deepStrictEqual(periods, [
        {start: 1500, end: Infinity},
      ]);
    });

    it('should handle unfinished requests', () => {
      const records = [
        record({startTime: 0, endTime: 1.5}),
        record({startTime: 0, endTime: 2}),
        record({startTime: 0, endTime: 2.5}),
        record({startTime: 2, endTime: 3}),
        record({startTime: 2}),
        record({startTime: 2}),
        record({startTime: 4, endTime: 5}),
        record({startTime: 5.5}),
      ];

      const periods = NetworkRecorder.findNetworkQuietPeriods(records, 2);
      assert.deepStrictEqual(periods, [
        {start: 1500, end: 2000},
        {start: 3000, end: 4000},
        {start: 5000, end: 5500},
      ]);
    });

    it('should ignore data URIs', () => {
      const records = [
        record({startTime: 0, endTime: 1}),
        record({startTime: 0, endTime: 2, url: 'data:image/png;base64,'}),
      ];

      const periods = NetworkRecorder.findNetworkQuietPeriods(records, 0);
      assert.deepStrictEqual(periods, [
        {start: 1000, end: Infinity},
      ]);
    });

    it('should handle iframe requests', () => {
      const iframeRequest = {
        finished: false,
        url: 'https://iframe.com',
        documentURL: 'https://iframe.com',
        responseReceivedTime: 1.2,
      };

      const records = [
        record({startTime: 0, endTime: 1}),
        record({startTime: 0, endTime: 1.2, ...iframeRequest}),
      ];

      const periods = NetworkRecorder.findNetworkQuietPeriods(records, 0);
      assert.deepStrictEqual(periods, [
        {start: 1200, end: Infinity},
      ]);
    });

    it('should handle QUIC requests', () => {
      const quicRequest = {
        finished: false,
        responseHeaders: [{name: 'ALT-SVC', value: 'hq=":49288";quic="1,1abadaba,51303334,0"'}],
        timing: {receiveHeadersEnd: 1.28},
      };

      const records = [
        record({startTime: 0, endTime: 1}),
        record({startTime: 0, endTime: 2, ...quicRequest}),
      ];

      const periods = NetworkRecorder.findNetworkQuietPeriods(records, 0);
      assert.deepStrictEqual(periods, [
        {start: 2000, end: Infinity},
      ]);
    });
  });
});
