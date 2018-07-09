/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const Runner = require('../../runner.js');
const ScreenshotThumbnailsAudit = require('../../audits/screenshot-thumbnails');
const pwaTrace = require('../fixtures/traces/progressive-app-m60.json');
const pwaDevtoolsLog = require('../fixtures/traces/progressive-app-m60.devtools.log.json');

/* eslint-env jest */

describe('Screenshot thumbnails', () => {
  let computedArtifacts;

  beforeAll(() => {
    computedArtifacts = Runner.instantiateComputedArtifacts();
  });

  it('should extract thumbnails from a trace', () => {
    const options = {minimumTimelineDuration: 500};
    const settings = {throttlingMethod: 'provided'};
    const artifacts = Object.assign({
      traces: {defaultPass: pwaTrace},
      devtoolsLogs: {}, // empty devtools logs to test just thumbnails without TTI behavior
    }, computedArtifacts);

    return ScreenshotThumbnailsAudit.audit(artifacts, {settings, options}).then(results => {
      results.details.items.forEach((result, index) => {
        const framePath = path.join(__dirname,
            `../fixtures/traces/screenshots/progressive-app-frame-${index}.jpg`);
        const expectedData = fs.readFileSync(framePath, 'base64');
        assert.equal(expectedData.length, result.data.length);
      });

      assert.ok(results.rawValue);
      assert.equal(results.details.items[0].timing, 82);
      assert.equal(results.details.items[2].timing, 245);
      assert.equal(results.details.items[9].timing, 818);
      assert.equal(results.details.items[0].timestamp, 225414253815);
    });
  }, 10000);

  it('should scale the timeline to TTI when observed', () => {
    const options = {minimumTimelineDuration: 500};
    const settings = {throttlingMethod: 'devtools'};
    const artifacts = Object.assign({
      traces: {defaultPass: pwaTrace},
      devtoolsLogs: {defaultPass: pwaDevtoolsLog},
    }, computedArtifacts);

    return ScreenshotThumbnailsAudit.audit(artifacts, {settings, options}).then(results => {
      assert.equal(results.details.items[0].timing, 158);
      assert.equal(results.details.items[9].timing, 1582);

      // last 5 frames should be equal to the last real frame
      const extrapolatedFrames = new Set(results.details.items.slice(5).map(f => f.data));
      assert.ok(results.details.items[9].data.length > 100, 'did not have last frame');
      assert.ok(extrapolatedFrames.size === 1, 'did not extrapolate last frame');
    });
  });

  it('should not scale the timeline to TTI when simulate', () => {
    const options = {minimumTimelineDuration: 500};
    const settings = {throttlingMethod: 'simulate'};
    const artifacts = Object.assign({
      traces: {defaultPass: pwaTrace},
    }, computedArtifacts);
    computedArtifacts.requestInteractive = () => ({timing: 20000});

    return ScreenshotThumbnailsAudit.audit(artifacts, {settings, options}).then(results => {
      assert.equal(results.details.items[0].timing, 82);
      assert.equal(results.details.items[9].timing, 818);
    });
  });

  it('should scale the timeline to minimumTimelineDuration', () => {
    const settings = {throttlingMethod: 'simulate'};
    const artifacts = Object.assign({
      traces: {defaultPass: pwaTrace},
    }, computedArtifacts);

    return ScreenshotThumbnailsAudit.audit(artifacts, {settings, options: {}}).then(results => {
      assert.equal(results.details.items[0].timing, 300);
      assert.equal(results.details.items[9].timing, 3000);
    });
  });

  it('should handle nonsense times', async () => {
    const settings = {throttlingMethod: 'simulate'};
    const artifacts = {
      traces: {},
      requestSpeedline: () => ({frames: [], complete: false, beginning: -1}),
      requestInteractive: () => ({timing: NaN}),
    };

    try {
      await ScreenshotThumbnailsAudit.audit(artifacts, {settings, options: {}});
      assert.fail('should have thrown');
    } catch (err) {
      assert.equal(err.message, 'INVALID_SPEEDLINE');
    }
  });
});
