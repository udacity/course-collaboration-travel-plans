/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */
const BootupTime = require('../../audits/bootup-time.js');
const Runner = require('../../runner.js');
const assert = require('assert');
const {groupIdToName} = require('../../lib/task-groups');

const acceptableTrace = require('../fixtures/traces/progressive-app-m60.json');
const errorTrace = require('../fixtures/traces/airhorner_no_fcp.json');

describe('Performance: bootup-time audit', () => {
  it('should compute the correct BootupTime values', () => {
    const artifacts = Object.assign({
      traces: {
        [BootupTime.DEFAULT_PASS]: acceptableTrace,
      },
    }, Runner.instantiateComputedArtifacts());

    return BootupTime.audit(artifacts).then(output => {
      assert.equal(output.details.items.length, 4);
      assert.equal(output.score, true);
      assert.equal(Math.round(output.rawValue), 176);

      const roundedValueOf = name => {
        const value = output.extendedInfo.value[name];
        const roundedValue = {};
        Object.keys(value).forEach(key => roundedValue[key] = Math.round(value[key] * 10) / 10);
        return roundedValue;
      };

      assert.deepEqual(roundedValueOf('https://pwa.rocks/script.js'), {[groupIdToName.scripting]: 31.8, [groupIdToName.styleLayout]: 5.5, [groupIdToName.scriptParseCompile]: 1.3});
      assert.deepEqual(roundedValueOf('https://www.googletagmanager.com/gtm.js?id=GTM-Q5SW'), {[groupIdToName.scripting]: 25, [groupIdToName.scriptParseCompile]: 5.5, [groupIdToName.styleLayout]: 1.2});
      assert.deepEqual(roundedValueOf('https://www.google-analytics.com/plugins/ua/linkid.js'), {[groupIdToName.scripting]: 25.2, [groupIdToName.scriptParseCompile]: 1.2});
      assert.deepEqual(roundedValueOf('https://www.google-analytics.com/analytics.js'), {[groupIdToName.scripting]: 40.1, [groupIdToName.scriptParseCompile]: 9.6, [groupIdToName.styleLayout]: 0.2});

      assert.ok(output.details.items.length < Object.keys(output.extendedInfo.value).length,
          'Items below 10ms threshold were not filtered out');
    });
  }).timeout(10000);

  it('should get no data when no events are present', () => {
    const artifacts = Object.assign({
      traces: {
        [BootupTime.DEFAULT_PASS]: errorTrace,
      },
    }, Runner.instantiateComputedArtifacts());

    return BootupTime.audit(artifacts)
      .then(output => {
        assert.equal(output.details.items.length, 0);
        assert.equal(output.score, true);
        assert.equal(Math.round(output.rawValue), 0);
      });
  });
});
