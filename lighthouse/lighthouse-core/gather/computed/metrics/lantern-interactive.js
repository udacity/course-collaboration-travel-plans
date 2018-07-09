/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const MetricArtifact = require('./lantern-metric');
const BaseNode = require('../../../lib/dependency-graph/base-node');
const NetworkRequest = require('../../../lib/network-request');

/** @typedef {BaseNode.Node} Node */

// Any CPU task of 20 ms or more will end up being a critical long task on mobile
const CRITICAL_LONG_TASK_THRESHOLD = 20;

class Interactive extends MetricArtifact {
  get name() {
    return 'LanternInteractive';
  }

  /**
   * @return {LH.Gatherer.Simulation.MetricCoefficients}
   */
  get COEFFICIENTS() {
    return {
      intercept: 0,
      optimistic: 0.5,
      pessimistic: 0.5,
    };
  }

  /**
   * @param {Node} dependencyGraph
   * @return {Node}
   */
  getOptimisticGraph(dependencyGraph) {
    // Adjust the critical long task threshold for microseconds
    const minimumCpuTaskDuration = CRITICAL_LONG_TASK_THRESHOLD * 1000;

    return dependencyGraph.cloneWithRelationships(node => {
      // Include everything that might be a long task
      if (node.type === BaseNode.TYPES.CPU) {
        return node.event.dur > minimumCpuTaskDuration;
      }

      // Include all scripts and high priority requests, exclude all images
      const isImage = node.record.resourceType === NetworkRequest.TYPES.Image;
      const isScript = node.record.resourceType === NetworkRequest.TYPES.Script;
      return (
        !isImage &&
        (isScript ||
          node.record.priority === 'High' ||
          node.record.priority === 'VeryHigh')
      );
    });
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
    const lastTaskAt = Interactive.getLastLongTaskEndTime(simulationResult.nodeTimings);
    const minimumTime = extras.optimistic
      ? extras.fmpResult.optimisticEstimate.timeInMs
      : extras.fmpResult.pessimisticEstimate.timeInMs;
    return {
      timeInMs: Math.max(minimumTime, lastTaskAt),
      nodeTimings: simulationResult.nodeTimings,
    };
  }

  /**
   * @param {LH.Artifacts.MetricComputationDataInput} data
   * @param {LH.ComputedArtifacts} artifacts
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  async compute_(data, artifacts) {
    const fmpResult = await artifacts.requestLanternFirstMeaningfulPaint(data);
    const metricResult = await this.computeMetricWithGraphs(data, artifacts, {fmpResult});
    metricResult.timing = Math.max(metricResult.timing, fmpResult.timing);
    return metricResult;
  }

  /**
   * @param {LH.Gatherer.Simulation.Result['nodeTimings']} nodeTimings
   * @return {number}
   */
  static getLastLongTaskEndTime(nodeTimings, duration = 50) {
    // @ts-ignore TS can't infer how the object invariants change
    return Array.from(nodeTimings.entries())
      .filter(([node, timing]) => {
        if (node.type !== BaseNode.TYPES.CPU) return false;
        return timing.duration > duration;
      })
      .map(([_, timing]) => timing.endTime)
      .reduce((max, x) => Math.max(max || 0, x || 0), 0);
  }
}

module.exports = Interactive;
