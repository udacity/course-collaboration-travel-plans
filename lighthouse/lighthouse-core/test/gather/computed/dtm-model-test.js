/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const assert = require('assert');
const fs = require('fs');
const pwaTrace = require('../../fixtures/traces/progressive-app.json');
const Runner = require('../../../runner.js');

/**
 * Remove all objects that DTM mutates so we can use deepStrictEqual
 *
 * @param {*} trace
 */
function removeMutatedDataFromDevtools(trace) {
  return trace.map(traceEvent => {
    // deepclone
    const newTraceEvent = JSON.parse(JSON.stringify(traceEvent));

    if (newTraceEvent.args) {
      if (newTraceEvent.args.data) {
        const data = newTraceEvent.args.data;
        delete data.columnNumber;
        delete data.lineNumber;
        delete data.url;

        if (data.stackTrace) {
          data.stackTrace.forEach(stack => {
            delete stack.columnNumber;
            delete stack.lineNumber;
          });
        }
      }

      if (newTraceEvent.args.beginData && newTraceEvent.args.beginData.stackTrace) {
        newTraceEvent.args.beginData.stackTrace.forEach(stack => {
          delete stack.columnNumber;
          delete stack.lineNumber;
        });
      }
    }

    return newTraceEvent;
  });
}

describe('DTM Model gatherer', () => {
  let computedArtifacts;

  beforeEach(() => {
    computedArtifacts = Runner.instantiateComputedArtifacts();
  });

  it('measures the pwa.rocks example', () => {
    return computedArtifacts.requestDevtoolsTimelineModel({traceEvents: pwaTrace}).then(model => {
      assert.equal(model.timelineModel().mainThreadEvents().length, 3157);
    });
  });

  it('does not change the orignal trace events', () => {
    // Use fresh trace in case it has been altered by other require()s.
    const pwaJson = fs.readFileSync(__dirname +
        '/../../fixtures/traces/progressive-app.json', 'utf8');
    let pwaTrace = JSON.parse(pwaJson);
    return computedArtifacts.requestDevtoolsTimelineModel({traceEvents: pwaTrace})
      .then(_ => {
        const freshTrace = removeMutatedDataFromDevtools(JSON.parse(pwaJson));
        assert.strictEqual(pwaTrace.length, freshTrace.length);

        pwaTrace = removeMutatedDataFromDevtools(pwaTrace);
        for (let i = 0; i < pwaTrace.length; i++) {
          assert.deepStrictEqual(pwaTrace[i], freshTrace[i]);
        }
      });
  }).timeout(20000);
});
