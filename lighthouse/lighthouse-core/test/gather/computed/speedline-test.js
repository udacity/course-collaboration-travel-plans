/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const assert = require('assert');
const fs = require('fs');
const pwaTrace = require('../../fixtures/traces/progressive-app.json');
const threeFrameTrace = require('../../fixtures/traces/threeframes-blank_content_more.json');
const Runner = require('../../../runner.js');

describe('Speedline gatherer', () => {
  let computedArtifacts;

  beforeEach(() => {
    computedArtifacts = Runner.instantiateComputedArtifacts();
  });

  it('returns an error debugString on faulty trace data', () => {
    return computedArtifacts.requestSpeedline({traceEvents: {boo: 'ya'}}).then(_ => {
      assert.fail(true, true, 'Invalid trace did not throw exception in speedline');
    }, err => {
      assert.ok(err);
      assert.ok(err.message.length);
    });
  });

  it('measures the pwa.rocks example', () => {
    return computedArtifacts.requestSpeedline({traceEvents: pwaTrace}).then(speedline => {
      assert.equal(speedline.speedIndex, undefined);
      assert.equal(Math.floor(speedline.perceptualSpeedIndex), 609);
    });
  }).timeout(10000);

  it('measures SI of 3 frame trace (blank @1s, content @2s, more content @3s)', () => {
    return computedArtifacts.requestSpeedline(threeFrameTrace).then(speedline => {
      assert.equal(speedline.speedIndex, undefined);
      assert.equal(Math.floor(speedline.perceptualSpeedIndex), 2030);
    });
  }).timeout(10000);

  it('uses a cache', () => {
    let start;
    let firstResult;
    const trace = {traceEvents: pwaTrace};
    // repeat with the same input data twice
    return Promise.resolve()
      .then(_ => computedArtifacts.requestSpeedline(trace))
      .then(result => {
        start = Date.now();
        firstResult = result;
      })
      .then(_ => computedArtifacts.requestSpeedline(trace))
      .then(speedline => {
        // on a MacBook Air, one run is  1000-1500ms
        assert.ok(Date.now() - start < 50, 'Quick results come from the cache');
        assert.equal(firstResult, speedline, 'Cache match matches');

        return assert.equal(Math.floor(speedline.perceptualSpeedIndex), 609);
      });
  }).timeout(10000);

  it('does not change order of events in traces', () => {
    // Use fresh trace in case it has been altered by other require()s.
    const pwaJson = fs.readFileSync(__dirname +
        '/../../fixtures/traces/progressive-app.json', 'utf8');
    const pwaTrace = JSON.parse(pwaJson);
    return computedArtifacts.requestSpeedline({traceEvents: pwaTrace})
      .then(_ => {
        // assert.deepEqual has issue with diffing large array, so manually loop.
        const freshTrace = JSON.parse(pwaJson);
        assert.strictEqual(pwaTrace.length, freshTrace.length);
        for (let i = 0; i < pwaTrace.length; i++) {
          assert.deepStrictEqual(pwaTrace[i], freshTrace[i]);
        }
      });
  }).timeout(10000);
});
