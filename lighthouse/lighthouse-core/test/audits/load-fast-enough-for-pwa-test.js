/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const FastPWAAudit = require('../../audits/load-fast-enough-for-pwa');
const Runner = require('../../runner.js');
const Audit = require('../../audits/audit.js');
const mobile3GThrottling = require('../../config/constants').throttling.mobile3G;
const assert = require('assert');

const trace = require('../fixtures/traces/progressive-app-m60.json');
const devtoolsLog = require('../fixtures/traces/progressive-app-m60.devtools.log.json');

function generateArtifacts(ttiValue) {
  return {
    devtoolsLogs: {
      [Audit.DEFAULT_PASS]: [],
    },
    traces: {
      [Audit.DEFAULT_PASS]: {traceEvents: []},
    },
    requestInteractive: () => Promise.resolve({
      timing: ttiValue,
    }),
  };
}

/* eslint-env jest */
describe('PWA: load-fast-enough-for-pwa audit', () => {
  it('returns boolean based on TTI value', () => {
    const settings = {throttlingMethod: 'devtools', throttling: mobile3GThrottling};
    return FastPWAAudit.audit(generateArtifacts(5000), {settings}).then(result => {
      assert.equal(result.score, true, 'fixture trace is not passing audit');
      assert.equal(result.rawValue, 5000);
    });
  });

  it('fails a bad TTI value', () => {
    const settings = {throttlingMethod: 'devtools', throttling: mobile3GThrottling};
    return FastPWAAudit.audit(generateArtifacts(15000), {settings}).then(result => {
      assert.equal(result.score, false, 'not failing a long TTI value');
      assert.equal(result.rawValue, 15000);
      assert.deepEqual(result.displayValue, ['Interactive at %d\xa0s', 15]);
      assert.ok(result.explanation);
    });
  });

  it('respects the observed result when throttling is preset', async () => {
    const artifacts = Object.assign({
      traces: {defaultPass: trace},
      devtoolsLogs: {defaultPass: devtoolsLog},
    }, Runner.instantiateComputedArtifacts());

    const settings = {throttlingMethod: 'devtools', throttling: mobile3GThrottling};
    const result = await FastPWAAudit.audit(artifacts, {settings});
    assert.equal(Math.round(result.rawValue), 1582);
  });

  it('overrides with simulated result when throttling is modified', async () => {
    const artifacts = Object.assign({
      traces: {defaultPass: trace},
      devtoolsLogs: {defaultPass: devtoolsLog},
    }, Runner.instantiateComputedArtifacts());

    const settings = {throttlingMethod: 'provided', throttling: {rttMs: 40, throughput: 100000}};
    const result = await FastPWAAudit.audit(artifacts, {settings});
    expect(result.rawValue).toBeGreaterThan(2000);
    expect(Math.round(result.rawValue)).toMatchSnapshot();
  });
});
