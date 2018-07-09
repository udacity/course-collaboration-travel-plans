/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const BaseNode = require('../../../lib/dependency-graph/base-node');
const FirstCPUIdle = require('./first-cpu-idle');
const LanternInteractive = require('./lantern-interactive');

class LanternFirstCPUIdle extends LanternInteractive {
  get name() {
    return 'LanternFirstCPUIdle';
  }

  /**
   * @return {LH.Gatherer.Simulation.MetricCoefficients}
   */
  get COEFFICIENTS() {
    return {
      intercept: 0,
      optimistic: 1,
      pessimistic: 0,
    };
  }


  /**
   * @param {LH.Gatherer.Simulation.Result} simulation
   * @param {Object} extras
   * @return {LH.Gatherer.Simulation.Result}
   */
  getEstimateFromSimulation(simulation, extras) {
    const fmpTimeInMs = extras.optimistic
      ? extras.fmpResult.optimisticEstimate.timeInMs
      : extras.fmpResult.pessimisticEstimate.timeInMs;

    return {
      timeInMs: LanternFirstCPUIdle.getFirstCPUIdleWindowStart(simulation.nodeTimings, fmpTimeInMs),
      nodeTimings: simulation.nodeTimings,
    };
  }

  /**
   *
   * @param {LH.Gatherer.Simulation.Result['nodeTimings']} nodeTimings
   * @param {number} fmpTimeInMs
   */
  static getFirstCPUIdleWindowStart(nodeTimings, fmpTimeInMs, longTaskLength = 50) {
    /** @type {Array<{start: number, end: number}>} */
    const longTasks = [];
    for (const [node, timing] of nodeTimings.entries()) {
      if (node.type !== BaseNode.TYPES.CPU) continue;
      if (timing.duration < longTaskLength) continue;
      longTasks.push({start: timing.startTime, end: timing.endTime});
    }

    return FirstCPUIdle.findQuietWindow(fmpTimeInMs, Infinity, longTasks);
  }
}

module.exports = LanternFirstCPUIdle;
