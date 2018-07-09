/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const MetricArtifact = require('./metric');

class FirstContentfulPaint extends MetricArtifact {
  get name() {
    return 'FirstContentfulPaint';
  }

  /**
   * @param {LH.Artifacts.MetricComputationData} data
   * @return {Promise<LH.Artifacts.Metric>}
   */
  async computeObservedMetric(data) {
    const {traceOfTab} = data;

    return {
      timing: traceOfTab.timings.firstContentfulPaint,
      timestamp: traceOfTab.timestamps.firstContentfulPaint,
    };
  }
}

module.exports = FirstContentfulPaint;
