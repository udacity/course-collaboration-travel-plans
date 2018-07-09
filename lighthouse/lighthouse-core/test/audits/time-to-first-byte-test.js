/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const TimeToFirstByte = require('../../audits/time-to-first-byte.js');
const assert = require('assert');

/* eslint-env jest */
describe('Performance: time-to-first-byte audit', () => {
  it('fails when ttfb of root document is higher than 600ms', () => {
    const mainResource = {
      url: 'https://example.com/',
      requestId: '0',
      timing: {receiveHeadersEnd: 830, sendEnd: 200},
    };

    const artifacts = {
      devtoolsLogs: {[TimeToFirstByte.DEFAULT_PASS]: []},
      requestMainResource: () => Promise.resolve(mainResource),
      URL: {finalUrl: 'https://example.com/'},
    };

    return TimeToFirstByte.audit(artifacts).then(result => {
      assert.strictEqual(result.rawValue, 630);
      assert.strictEqual(result.score, 0);
    });
  });

  it('succeeds when ttfb of root document is lower than 600ms', () => {
    const mainResource = {
      url: 'https://example.com/',
      requestId: '0',
      timing: {receiveHeadersEnd: 400, sendEnd: 200},
    };

    const artifacts = {
      devtoolsLogs: {[TimeToFirstByte.DEFAULT_PASS]: []},
      requestMainResource: () => Promise.resolve(mainResource),
      URL: {finalUrl: 'https://example.com/'},
    };

    return TimeToFirstByte.audit(artifacts).then(result => {
      assert.strictEqual(result.rawValue, 200);
      assert.strictEqual(result.score, 1);
    });
  });
});
