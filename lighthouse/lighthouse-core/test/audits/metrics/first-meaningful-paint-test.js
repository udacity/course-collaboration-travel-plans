/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const FMPAudit = require('../../../audits/metrics/first-meaningful-paint.js');
const Audit = require('../../../audits/audit.js');
const assert = require('assert');
const options = FMPAudit.defaultOptions;
const trace = require('../../fixtures/traces/progressive-app-m60.json');
const devtoolsLogs = require('../../fixtures/traces/progressive-app-m60.devtools.log.json');

const Runner = require('../../../runner.js');
const computedArtifacts = Runner.instantiateComputedArtifacts();

/* eslint-env jest */
describe('Performance: first-meaningful-paint audit', () => {
  it('computes FMP correctly for valid trace', async () => {
    const artifacts = Object.assign({
      traces: {[Audit.DEFAULT_PASS]: trace},
      devtoolsLogs: {[Audit.DEFAULT_PASS]: devtoolsLogs},
    }, computedArtifacts);
    const context = {options, settings: {throttlingMethod: 'provided'}};
    const fmpResult = await FMPAudit.audit(artifacts, context);

    assert.equal(fmpResult.score, 1);
    assert.equal(fmpResult.rawValue, 783.328);
    expect(fmpResult.displayValue).toBeDisplayString('0.8\xa0s');
  });

  it('computes FMP correctly for simulated', async () => {
    const artifacts = Object.assign({
      traces: {[Audit.DEFAULT_PASS]: trace},
      devtoolsLogs: {[Audit.DEFAULT_PASS]: devtoolsLogs},
    }, computedArtifacts);
    const context = {options, settings: {throttlingMethod: 'simulate'}};
    const fmpResult = await FMPAudit.audit(artifacts, context);

    expect({
      score: fmpResult.score,
      rawValue: fmpResult.rawValue,
    }).toMatchSnapshot();
  });
});
