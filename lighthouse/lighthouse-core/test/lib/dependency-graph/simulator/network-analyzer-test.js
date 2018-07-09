/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert');

// eslint-disable-next-line
const NetworkAnalyzer = require('../../../../lib/dependency-graph/simulator/network-analyzer');
const Runner = require('../../../../runner');
const devtoolsLog = require('../../../fixtures/traces/progressive-app-m60.devtools.log.json');

/* eslint-env jest */
describe('DependencyGraph/Simulator/NetworkAnalyzer', () => {
  let computedArtifacts;
  let recordId;

  function createRecord(opts) {
    const url = opts.url || 'https://example.com';
    return Object.assign(
      {
        url,
        requestId: recordId++,
        connectionId: 0,
        connectionReused: false,
        startTime: 0.01,
        endTime: 0.01,
        transferSize: 0,
        protocol: 'http/1.1',
        parsedURL: {scheme: url.match(/https?/)[0], securityOrigin: url.match(/.*\.com/)[0]},
        timing: opts.timing || null,
      },
      opts
    );
  }

  beforeEach(() => {
    recordId = 1;
    computedArtifacts = Runner.instantiateComputedArtifacts();
  });

  function assertCloseEnough(valueA, valueB, threshold = 1) {
    const message = `${valueA} was not close enough to ${valueB}`;
    assert.ok(Math.abs(valueA - valueB) < threshold, message);
  }

  describe('#estimateIfConnectionWasReused', () => {
    it('should use built-in value when trustworthy', () => {
      const records = [
        {requestId: 1, connectionId: 1, connectionReused: false},
        {requestId: 2, connectionId: 1, connectionReused: true},
        {requestId: 3, connectionId: 2, connectionReused: false},
        {requestId: 4, connectionId: 3, connectionReused: false},
        {requestId: 5, connectionId: 2, connectionReused: true},
      ];

      const result = NetworkAnalyzer.estimateIfConnectionWasReused(records);
      const expected = new Map([[1, false], [2, true], [3, false], [4, false], [5, true]]);
      assert.deepStrictEqual(result, expected);
    });

    it('should estimate values when not trustworthy (duplicate IDs)', () => {
      const records = [
        createRecord({requestId: 1, startTime: 0, endTime: 15}),
        createRecord({requestId: 2, startTime: 10, endTime: 25}),
        createRecord({requestId: 3, startTime: 20, endTime: 40}),
        createRecord({requestId: 4, startTime: 30, endTime: 40}),
      ];

      const result = NetworkAnalyzer.estimateIfConnectionWasReused(records);
      const expected = new Map([[1, false], [2, false], [3, true], [4, true]]);
      assert.deepStrictEqual(result, expected);
    });

    it('should estimate values when not trustworthy (connectionReused nonsense)', () => {
      const records = [
        createRecord({
          requestId: 1,
          connectionId: 1,
          connectionReused: true,
          startTime: 0,
          endTime: 15,
        }),
        createRecord({
          requestId: 2,
          connectionId: 1,
          connectionReused: true,
          startTime: 10,
          endTime: 25,
        }),
        createRecord({
          requestId: 3,
          connectionId: 1,
          connectionReused: true,
          startTime: 20,
          endTime: 40,
        }),
        createRecord({
          requestId: 4,
          connectionId: 2,
          connectionReused: false,
          startTime: 30,
          endTime: 40,
        }),
      ];

      const result = NetworkAnalyzer.estimateIfConnectionWasReused(records);
      const expected = new Map([[1, false], [2, false], [3, true], [4, true]]);
      assert.deepStrictEqual(result, expected);
    });

    it('should estimate with earliest allowed reuse', () => {
      const records = [
        createRecord({requestId: 1, startTime: 0, endTime: 40}),
        createRecord({requestId: 2, startTime: 10, endTime: 15}),
        createRecord({requestId: 3, startTime: 20, endTime: 30}),
        createRecord({requestId: 4, startTime: 35, endTime: 40}),
      ];

      const result = NetworkAnalyzer.estimateIfConnectionWasReused(records);
      const expected = new Map([[1, false], [2, false], [3, true], [4, true]]);
      assert.deepStrictEqual(result, expected);
    });

    it('should work on a real devtoolsLog', () => {
      return computedArtifacts.requestNetworkRecords(devtoolsLog).then(records => {
        const result = NetworkAnalyzer.estimateIfConnectionWasReused(records);
        const distinctConnections = Array.from(result.values()).filter(item => !item).length;
        assert.equal(result.size, 66);
        assert.equal(distinctConnections, 3);
      });
    });
  });

  describe('#estimateRTTByOrigin', () => {
    it('should infer from tcp timing when available', () => {
      const timing = {connectStart: 1, connectEnd: 100};
      const record = createRecord({startTime: 0, endTime: 1, timing});
      const result = NetworkAnalyzer.estimateRTTByOrigin([record]);
      const expected = {min: 99, max: 99, avg: 99, median: 99};
      assert.deepStrictEqual(result.get('https://example.com'), expected);
    });

    it('should infer from sendStart when available', () => {
      const timing = {sendStart: 150};
      // this record took 150ms before Chrome could send the request
      // i.e. DNS (maybe) + queuing (maybe) + TCP handshake took ~100ms
      // 150ms / 3 round trips ~= 50ms RTT
      const record = createRecord({startTime: 0, endTime: 1, timing});
      const result = NetworkAnalyzer.estimateRTTByOrigin([record], {coarseEstimateMultiplier: 1});
      const expected = {min: 50, max: 50, avg: 50, median: 50};
      assert.deepStrictEqual(result.get('https://example.com'), expected);
    });

    it('should infer from download timing when available', () => {
      const timing = {receiveHeadersEnd: 100};
      // this record took 1000ms after the first byte was received to download the payload
      // i.e. it took at least one full additional roundtrip after first byte to download the rest
      // 1000ms / 1 round trip ~= 1000ms RTT
      const record = createRecord({startTime: 0, endTime: 1.1, transferSize: 28 * 1024, timing});
      const result = NetworkAnalyzer.estimateRTTByOrigin([record], {
        coarseEstimateMultiplier: 1,
        useHeadersEndEstimates: false,
      });
      const expected = {min: 1000, max: 1000, avg: 1000, median: 1000};
      assert.deepStrictEqual(result.get('https://example.com'), expected);
    });

    it('should infer from TTFB when available', () => {
      const timing = {receiveHeadersEnd: 1000};
      const record = createRecord({startTime: 0, endTime: 1, timing, resourceType: 'Other'});
      const result = NetworkAnalyzer.estimateRTTByOrigin([record], {
        coarseEstimateMultiplier: 1,
      });

      // this record's TTFB was 1000ms, it used SSL and was a fresh connection requiring a handshake
      // which needs ~4 RTs. We don't know its resource type so it'll be assumed that 40% of it was
      // server response time.
      // 600 ms / 4 = 150ms
      const expected = {min: 150, max: 150, avg: 150, median: 150};
      assert.deepStrictEqual(result.get('https://example.com'), expected);
    });

    it('should handle untrustworthy connection information', () => {
      const timing = {sendStart: 150};
      const recordA = createRecord({startTime: 0, endTime: 1, timing, connectionReused: true});
      const recordB = createRecord({
        startTime: 0,
        endTime: 1,
        timing,
        connectionId: 2,
        connectionReused: true,
      });
      const result = NetworkAnalyzer.estimateRTTByOrigin([recordA, recordB], {
        coarseEstimateMultiplier: 1,
      });
      const expected = {min: 50, max: 50, avg: 50, median: 50};
      assert.deepStrictEqual(result.get('https://example.com'), expected);
    });

    it('should work on a real devtoolsLog', () => {
      return computedArtifacts.requestNetworkRecords(devtoolsLog).then(records => {
        const result = NetworkAnalyzer.estimateRTTByOrigin(records);
        assertCloseEnough(result.get('https://pwa.rocks').min, 3);
        assertCloseEnough(result.get('https://www.googletagmanager.com').min, 3);
        assertCloseEnough(result.get('https://www.google-analytics.com').min, 4);
      });
    });

    it('should approximate well with either method', () => {
      return computedArtifacts.requestNetworkRecords(devtoolsLog).then(records => {
        const result = NetworkAnalyzer.estimateRTTByOrigin(records).get(NetworkAnalyzer.SUMMARY);
        const resultApprox = NetworkAnalyzer.estimateRTTByOrigin(records, {
          forceCoarseEstimates: true,
        }).get(NetworkAnalyzer.SUMMARY);
        assertCloseEnough(result.min, resultApprox.min, 20);
        assertCloseEnough(result.avg, resultApprox.avg, 30);
        assertCloseEnough(result.median, resultApprox.median, 30);
      });
    });
  });

  describe('#estimateServerResponseTimeByOrigin', () => {
    it('should estimate server response time using ttfb times', () => {
      const timing = {sendEnd: 100, receiveHeadersEnd: 200};
      const record = createRecord({startTime: 0, endTime: 1, timing});
      const rttByOrigin = new Map([[NetworkAnalyzer.SUMMARY, 0]]);
      const result = NetworkAnalyzer.estimateServerResponseTimeByOrigin([record], {rttByOrigin});
      const expected = {min: 100, max: 100, avg: 100, median: 100};
      assert.deepStrictEqual(result.get('https://example.com'), expected);
    });

    it('should subtract out rtt', () => {
      const timing = {sendEnd: 100, receiveHeadersEnd: 200};
      const record = createRecord({startTime: 0, endTime: 1, timing});
      const rttByOrigin = new Map([[NetworkAnalyzer.SUMMARY, 50]]);
      const result = NetworkAnalyzer.estimateServerResponseTimeByOrigin([record], {rttByOrigin});
      const expected = {min: 50, max: 50, avg: 50, median: 50};
      assert.deepStrictEqual(result.get('https://example.com'), expected);
    });

    it('should compute rtts when not provided', () => {
      const timing = {connectStart: 5, connectEnd: 55, sendEnd: 100, receiveHeadersEnd: 200};
      const record = createRecord({startTime: 0, endTime: 1, timing});
      const result = NetworkAnalyzer.estimateServerResponseTimeByOrigin([record]);
      const expected = {min: 50, max: 50, avg: 50, median: 50};
      assert.deepStrictEqual(result.get('https://example.com'), expected);
    });

    it('should work on a real devtoolsLog', () => {
      return computedArtifacts.requestNetworkRecords(devtoolsLog).then(records => {
        const result = NetworkAnalyzer.estimateServerResponseTimeByOrigin(records);
        assertCloseEnough(result.get('https://pwa.rocks').avg, 162);
        assertCloseEnough(result.get('https://www.googletagmanager.com').avg, 153);
        assertCloseEnough(result.get('https://www.google-analytics.com').avg, 161);
      });
    });

    it('should approximate well with either method', () => {
      return computedArtifacts.requestNetworkRecords(devtoolsLog).then(records => {
        const result = NetworkAnalyzer.estimateServerResponseTimeByOrigin(records).get(
          NetworkAnalyzer.SUMMARY
        );
        const resultApprox = NetworkAnalyzer.estimateServerResponseTimeByOrigin(records, {
          forceCoarseEstimates: true,
        }).get(NetworkAnalyzer.SUMMARY);
        assertCloseEnough(result.min, resultApprox.min, 20);
        assertCloseEnough(result.avg, resultApprox.avg, 30);
        assertCloseEnough(result.median, resultApprox.median, 30);
      });
    });
  });

  describe('#findMainDocument', () => {
    it('should find the main document', async () => {
      const records = await computedArtifacts.requestNetworkRecords(devtoolsLog);
      const mainDocument = NetworkAnalyzer.findMainDocument(records);
      assert.equal(mainDocument.url, 'https://pwa.rocks/');
    });
  });
});
