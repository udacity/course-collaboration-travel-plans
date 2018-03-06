/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ByteEfficiencyAudit = require('../../../audits/byte-efficiency/byte-efficiency-audit');
const assert = require('assert');

/* eslint-env mocha */

describe('Byte efficiency base audit', () => {
  const baseHeadings = [
    {key: 'totalKb', itemType: 'text', text: ''},
    {key: 'wastedKb', itemType: 'text', text: ''},
    {key: 'wastedMs', itemType: 'text', text: ''},
  ];

  describe('#estimateTransferSize', () => {
    const estimate = ByteEfficiencyAudit.estimateTransferSize;

    it('should estimate by compression ratio when no network record available', () => {
      const result = estimate(undefined, 1000, '', .345);
      assert.equal(result, 345);
    });

    it('should return transferSize when asset matches', () => {
      const _resourceType = {_name: 'stylesheet'};
      const result = estimate({_transferSize: 1234, _resourceType}, 10000, 'stylesheet');
      assert.equal(result, 1234);
    });

    it('should estimate by network compression ratio when asset does not match', () => {
      const _resourceType = {_name: 'other'};
      const result = estimate({_resourceSize: 2000, _transferSize: 1000, _resourceType}, 100);
      assert.equal(result, 50);
    });

    it('should not error when missing resource size', () => {
      const _resourceType = {_name: 'other'};
      const result = estimate({_transferSize: 1000, _resourceType}, 100);
      assert.equal(result, 100);
    });
  });

  it('should format as extendedInfo', () => {
    const result = ByteEfficiencyAudit.createAuditResult({
      headings: baseHeadings,
      results: [],
    });

    assert.deepEqual(result.details.items, []);
  });

  it('should set the rawValue', () => {
    const result = ByteEfficiencyAudit.createAuditResult({
      headings: baseHeadings,
      results: [{wastedBytes: 2345, totalBytes: 3000, wastedPercent: 65}],
    }, 5000);

    assert.equal(result.rawValue, 470); // 2345 / 5000 * 1000 ~= 470
  });

  it('should score the wastedMs', () => {
    const perfectResult = ByteEfficiencyAudit.createAuditResult({
      headings: baseHeadings,
      results: [{wastedBytes: 400, totalBytes: 4000, wastedPercent: 10}],
    }, 100000);

    const goodResult = ByteEfficiencyAudit.createAuditResult({
      headings: baseHeadings,
      results: [{wastedBytes: 2345, totalBytes: 3000, wastedPercent: 65}],
    }, 10000);

    const averageResult = ByteEfficiencyAudit.createAuditResult({
      headings: baseHeadings,
      results: [{wastedBytes: 2345, totalBytes: 3000, wastedPercent: 65}],
    }, 5000);

    const failingResult = ByteEfficiencyAudit.createAuditResult({
      headings: baseHeadings,
      results: [{wastedBytes: 45000, totalBytes: 45000, wastedPercent: 100}],
    }, 10000);

    assert.equal(perfectResult.score, 100, 'scores perfect wastedMs');
    assert.ok(goodResult.score > 75 && goodResult.score < 100, 'scores good wastedMs');
    assert.ok(averageResult.score > 50 && averageResult.score < 75, 'scores average wastedMs');
    assert.ok(failingResult.score < 50, 'scores failing wastedMs');
  });

  it('should throw on invalid network throughput', () => {
    assert.throws(() => {
      ByteEfficiencyAudit.createAuditResult({
        headings: baseHeadings,
        results: [{wastedBytes: 350, totalBytes: 700, wastedPercent: 50}],
      }, Infinity);
    });
  });

  it('should populate KB', () => {
    const result = ByteEfficiencyAudit.createAuditResult({
      headings: baseHeadings,
      results: [
        {wastedBytes: 2048, totalBytes: 4096, wastedPercent: 50},
        {wastedBytes: 1986, totalBytes: 5436},
      ],
    }, 1000);

    assert.equal(result.details.items[0][1].value, 2048);
    assert.equal(result.details.items[0][0].value, 4096);
    assert.equal(result.details.items[1][1].value, 1986);
    assert.equal(result.details.items[1][0].value, 5436);
  });

  it('should populate Ms', () => {
    const result = ByteEfficiencyAudit.createAuditResult({
      headings: baseHeadings,
      results: [
        {wastedBytes: 350, totalBytes: 700, wastedPercent: 50},
        {wastedBytes: 326, totalBytes: 1954},
        {wastedBytes: 251, totalBytes: 899},
      ],
    }, 1000);

    assert.equal(result.details.items[0][2].value, 350);
    assert.equal(result.details.items[1][2].value, 326);
    assert.equal(result.details.items[2][2].value, 251);
  });

  it('should sort on wastedBytes', () => {
    const result = ByteEfficiencyAudit.createAuditResult({
      headings: baseHeadings,
      results: [
        {wastedBytes: 350, totalBytes: 700, wastedPercent: 50},
        {wastedBytes: 450, totalBytes: 1000, wastedPercent: 50},
        {wastedBytes: 400, totalBytes: 450, wastedPercent: 50},
      ],
    }, 1000);

    assert.equal(result.details.items[0][2].value, 450);
    assert.equal(result.details.items[1][2].value, 400);
    assert.equal(result.details.items[2][2].value, 350);
  });

  it('should create a display value', () => {
    const result = ByteEfficiencyAudit.createAuditResult({
      headings: baseHeadings,
      results: [
        {wastedBytes: 512, totalBytes: 700, wastedPercent: 50},
        {wastedBytes: 512, totalBytes: 1000, wastedPercent: 50},
        {wastedBytes: 1024, totalBytes: 1200, wastedPercent: 50},
      ],
    }, 4096);

    assert.ok(result.displayValue.includes('2048 bytes'), 'contains correct bytes');
  });
});
