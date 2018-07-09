/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const MetricArtifact = require('./lantern-metric');
const BaseNode = require('../../../lib/dependency-graph/base-node');

/** @typedef {BaseNode.Node} Node */

class SpeedIndex extends MetricArtifact {
  get name() {
    return 'LanternSpeedIndex';
  }

  /**
   * @return {LH.Gatherer.Simulation.MetricCoefficients}
   */
  get COEFFICIENTS() {
    return {
      // Negative intercept is OK because estimate is Math.max(FCP, Speed Index) and
      // the optimistic estimate is based on the real observed speed index rather than a real
      // lantern graph.
      intercept: -250,
      optimistic: 1.4,
      pessimistic: 0.65,
    };
  }

  /**
   * @param {Node} dependencyGraph
   * @return {Node}
   */
  getOptimisticGraph(dependencyGraph) {
    return dependencyGraph;
  }

  /**
   * @param {Node} dependencyGraph
   * @return {Node}
   */
  getPessimisticGraph(dependencyGraph) {
    return dependencyGraph;
  }

  /**
   * @param {LH.Gatherer.Simulation.Result} simulationResult
   * @param {Object} extras
   * @return {LH.Gatherer.Simulation.Result}
   */
  getEstimateFromSimulation(simulationResult, extras) {
    const fcpTimeInMs = extras.fcpResult.pessimisticEstimate.timeInMs;
    const estimate = extras.optimistic
      ? extras.speedline.speedIndex
      : SpeedIndex.computeLayoutBasedSpeedIndex(simulationResult.nodeTimings, fcpTimeInMs);
    return {
      timeInMs: estimate,
      nodeTimings: simulationResult.nodeTimings,
    };
  }

  /**
   * @param {LH.Artifacts.MetricComputationDataInput} data
   * @param {LH.ComputedArtifacts} artifacts
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  async compute_(data, artifacts) {
    const speedline = await artifacts.requestSpeedline(data.trace);
    const fcpResult = await artifacts.requestLanternFirstContentfulPaint(data);
    const metricResult = await this.computeMetricWithGraphs(data, artifacts, {
      speedline,
      fcpResult,
    });
    metricResult.timing = Math.max(metricResult.timing, fcpResult.timing);
    return metricResult;
  }

  /**
   * Approximate speed index using layout events from the simulated node timings.
   * The layout-based speed index is the weighted average of the endTime of CPU nodes that contained
   * a 'Layout' task. log(duration) is used as the weight to stand for "significance" to the page.
   *
   * If no layout events can be found or the endTime of a CPU task is too early, FCP is used instead.
   *
   * This approach was determined after evaluating the accuracy/complexity tradeoff of many
   * different methods. Read more in the evaluation doc.
   *
   * @see https://docs.google.com/document/d/1qJWXwxoyVLVadezIp_Tgdk867G3tDNkkVRvUJSH3K1E/edit#
   * @param {LH.Gatherer.Simulation.Result['nodeTimings']} nodeTimings
   * @param {number} fcpTimeInMs
   * @return {number}
   */
  static computeLayoutBasedSpeedIndex(nodeTimings, fcpTimeInMs) {
    /** @type {Array<{time: number, weight: number}>} */
    const layoutWeights = [];
    for (const [node, timing] of nodeTimings.entries()) {
      if (node.type !== BaseNode.TYPES.CPU) continue;

      if (node.childEvents.some(x => x.name === 'Layout')) {
        const timingWeight = Math.max(Math.log2(timing.endTime - timing.startTime), 0);
        layoutWeights.push({time: timing.endTime, weight: timingWeight});
      }
    }

    if (!layoutWeights.length) {
      return fcpTimeInMs;
    }

    const totalWeightedTime = layoutWeights
      .map(evt => evt.weight * Math.max(evt.time, fcpTimeInMs))
      .reduce((a, b) => a + b, 0);
    const totalWeight = layoutWeights.map(evt => evt.weight).reduce((a, b) => a + b, 0);
    return totalWeightedTime / totalWeight;
  }
}

module.exports = SpeedIndex;
