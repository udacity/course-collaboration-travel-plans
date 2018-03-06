/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const Audit = require('../../audits/speed-index-metric.js');
const assert = require('assert');
const pwaTrace = require('../fixtures/traces/progressive-app.json');
const Runner = require('../../runner.js');

const emptyTraceStub = {
  traces: {
    defaultPass: {},
  },
};

function mockArtifactsWithSpeedlineResult(result) {
  const mockArtifacts = {
    requestSpeedline: function() {
      return Promise.resolve(result);
    },
  };
  return Object.assign({}, emptyTraceStub, mockArtifacts);
}

describe('Performance: speed-index-metric audit', () => {
  function frame(timestamp = 0, progress = 0) {
    return {
      getTimeStamp: () => timestamp,
      getProgress: () => progress,
      getPerceptualProgress: () => progress,
    };
  }

  it('works on a real trace', () => {
    const artifacts = Object.assign(Runner.instantiateComputedArtifacts(), {
      traces: {defaultPass: {traceEvents: pwaTrace}},
    });

    return Audit.audit(artifacts).then(result => {
      assert.equal(result.score, 100);
      assert.equal(result.rawValue, 609);
      assert.equal(Math.round(result.extendedInfo.value.timings.firstVisualChange), 475);
      assert.equal(Math.round(result.extendedInfo.value.timings.visuallyReady), 700);
      assert.equal(Math.round(result.extendedInfo.value.timings.visuallyComplete), 1105);
      assert.equal(Math.round(result.extendedInfo.value.timings.perceptualSpeedIndex), 609);
    });
  }).timeout(10000);

  it('throws an error if no frames', () => {
    const artifacts = mockArtifactsWithSpeedlineResult({frames: []});
    return Audit.audit(artifacts).then(
      _ => assert.ok(false),
      _ => assert.ok(true));
  });

  it('throws an error if speed index of 0', () => {
    const SpeedlineResult = {
      frames: [frame(), frame(), frame()],
      perceptualSpeedIndex: 0,
    };
    const artifacts = mockArtifactsWithSpeedlineResult(SpeedlineResult);

    return Audit.audit(artifacts).then(
      _ => assert.ok(false),
      _ => assert.ok(true));
  });

  it('scores speed index of 845 as 100', () => {
    const SpeedlineResult = {
      frames: [frame(), frame(), frame()],
      first: 630,
      complete: 930,
      perceptualSpeedIndex: 845,
    };
    const artifacts = mockArtifactsWithSpeedlineResult(SpeedlineResult);

    return Audit.audit(artifacts).then(response => {
      assert.equal(response.rawValue, 845);
      assert.equal(response.extendedInfo.value.timings.firstVisualChange, 630);
      assert.equal(response.extendedInfo.value.timings.visuallyComplete, 930);
      assert.equal(response.extendedInfo.value.timings.perceptualSpeedIndex, 845);
    });
  });
});
