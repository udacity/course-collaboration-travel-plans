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

/* eslint-env mocha */
describe('Network requests audit', () => {
  it('should return network requests', () => {
    const artifacts = Object.assign({
      devtoolsLogs: {
        [NetworkRequests.DEFAULT_PASS]: acceptableDevToolsLog,
      },
    }, Runner.instantiateComputedArtifacts());

    return NetworkRequests.audit(artifacts).then(output => {
      assert.equal(output.score, 100);
      assert.equal(output.rawValue, 66);
      assert.equal(output.details.items.length, 66);
      assert.equal(output.extendedInfo.value[0].url, 'https://pwa.rocks/');
      assert.equal(output.extendedInfo.value[0].startTime, 0);
      assert.equal(output.extendedInfo.value[0].statusCode, 200);
      assert.equal(output.extendedInfo.value[0].transferSize, 5368);
    });
  });
});
