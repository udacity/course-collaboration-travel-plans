/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer');

/**
 * @fileoverview Tracks unused JavaScript
 */
class JsUsage extends Gatherer {
  beforePass(options) {
    return options.driver.sendCommand('Profiler.enable')
      .then(_ => options.driver.sendCommand('Profiler.startPreciseCoverage'));
  }

  /**
   * @param {{driver: !Driver}} options
   * @return {!Promise<!Array<!JsUsageArtifact>}
   */
  afterPass(options) {
    const driver = options.driver;

    return driver.sendCommand('Profiler.takePreciseCoverage').then(results => {
      return driver.sendCommand('Profiler.stopPreciseCoverage')
        .then(_ => driver.sendCommand('Profiler.disable'))
        .then(_ => results.result);
    });
  }
}

module.exports = JsUsage;

/** @typedef {{functions: !Array<{ranges: {count: number, startOffset: number, endOffset: number}}>}} */
JsUsage.JsUsageArtifact; // eslint-disable-line no-unused-expressions
