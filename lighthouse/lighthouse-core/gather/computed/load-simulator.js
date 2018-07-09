/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ComputedArtifact = require('./computed-artifact');
const constants = require('../../config/constants');
const Simulator = require('../../lib/dependency-graph/simulator/simulator');

class LoadSimulatorArtifact extends ComputedArtifact {
  get name() {
    return 'LoadSimulator';
  }

  /**
   * @param {{devtoolsLog: LH.DevtoolsLog, settings: LH.Config.Settings}} data
   * @param {LH.Artifacts} artifacts
   * @return {Promise<Simulator>}
   */
  async compute_(data, artifacts) {
    const {throttlingMethod, throttling} = data.settings;
    const networkAnalysis = await artifacts.requestNetworkAnalysis(data.devtoolsLog);

    /** @type {LH.Gatherer.Simulation.Options} */
    const options = {
      additionalRttByOrigin: networkAnalysis.additionalRttByOrigin,
      serverResponseTimeByOrigin: networkAnalysis.serverResponseTimeByOrigin,
    };

    switch (throttlingMethod) {
      case 'provided':
        options.rtt = networkAnalysis.rtt;
        options.throughput = networkAnalysis.throughput;
        options.cpuSlowdownMultiplier = 1;
        options.layoutTaskMultiplier = 1;
        break;
      case 'devtools':
        if (throttling) {
          options.rtt =
            throttling.requestLatencyMs / constants.throttling.DEVTOOLS_RTT_ADJUSTMENT_FACTOR;
          options.throughput =
            throttling.downloadThroughputKbps * 1024 /
            constants.throttling.DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR;
        }

        options.cpuSlowdownMultiplier = 1;
        options.layoutTaskMultiplier = 1;
        break;
      case 'simulate':
        if (throttling) {
          options.rtt = throttling.rttMs;
          options.throughput = throttling.throughputKbps * 1024;
          options.cpuSlowdownMultiplier = throttling.cpuSlowdownMultiplier;
        }
        break;
      default:
        // intentionally fallback to simulator defaults
        break;
    }

    return new Simulator(options);
  }
}

module.exports = LoadSimulatorArtifact;
