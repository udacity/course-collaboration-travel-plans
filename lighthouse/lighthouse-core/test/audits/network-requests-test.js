/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const NetworkRequests = require('../../audits/network-requests');
const Runner = require('../../runner.js');
const assert = require('assert');

const acceptableDevToolsLog = require('../fixtures/traces/progressive-app-m60.devtools.log.json');

/* eslint-env jest */
describe('Network requests audit', () => {
  it('should return network requests', () => {
    const artifacts = Object.assign({
      devtoolsLogs: {
        [NetworkRequests.DEFAULT_PASS]: acceptableDevToolsLog,
      },
    }, Runner.instantiateComputedArtifacts());

    return NetworkRequests.audit(artifacts).then(output => {
      assert.equal(output.score, 1);
      assert.equal(output.rawValue, 66);
      assert.equal(output.details.items.length, 66);
      assert.equal(output.details.items[0].url, 'https://pwa.rocks/');
      assert.equal(output.details.items[0].startTime, 0);
      assert.equal(Math.round(output.details.items[0].endTime), 280);
      assert.equal(output.details.items[0].statusCode, 200);
      assert.equal(output.details.items[0].transferSize, 5368);
    });
  });

  it('should handle times correctly', async () => {
    const records = [
      {url: 'https://example.com/0', startTime: 15.0, endTime: 15.5},
      {url: 'https://example.com/1', startTime: 15.5, endTime: -1},
    ];

    const artifacts = {devtoolsLogs: {}, requestNetworkRecords: () => Promise.resolve(records)};
    const output = await NetworkRequests.audit(artifacts);
    assert.equal(output.details.items[0].startTime, 0);
    assert.equal(output.details.items[0].endTime, 500);
    assert.equal(output.details.items[1].startTime, 500);
    assert.equal(output.details.items[1].endTime, undefined);
  });
});
