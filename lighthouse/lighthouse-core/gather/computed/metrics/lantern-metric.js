/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ComputedArtifact = require('../computed-artifact');
const BaseNode = require('../../../lib/dependency-graph/base-node');
const NetworkRequest = require('../../../lib/network-request');

/** @typedef {BaseNode.Node} Node */
/** @typedef {import('../../../lib/dependency-graph/network-node')} NetworkNode */
/** @typedef {import('../../../lib/dependency-graph/simulator/simulator')} Simulator */

class LanternMetricArtifact extends ComputedArtifact {
  /**
   * @param {Node} dependencyGraph
   * @param {function(NetworkNode):boolean=} condition
   * @return {Set<string>}
   */
  static getScriptUrls(dependencyGraph, condition) {
    /** @type {Set<string>} */
    const scriptUrls = new Set();

    dependencyGraph.traverse(node => {
      if (node.type === BaseNode.TYPES.CPU) return;
      if (node.record.resourceType !== NetworkRequest.TYPES.Script) return;
      if (condition && !condition(node)) return;
      scriptUrls.add(node.record.url);
    });

    return scriptUrls;
  }

  /**
   * @return {LH.Gatherer.Simulation.MetricCoefficients}
   */
  get COEFFICIENTS() {
    throw new Error('COEFFICIENTS unimplemented!');
  }

  /**
   * @param {Node} dependencyGraph
   * @param {LH.Artifacts.TraceOfTab} traceOfTab
   * @return {Node}
   */
  getOptimisticGraph(dependencyGraph, traceOfTab) { // eslint-disable-line no-unused-vars
    throw new Error('Optimistic graph unimplemented!');
  }

  /**
   * @param {Node} dependencyGraph
   * @param {LH.Artifacts.TraceOfTab} traceOfTab
   * @return {Node}
   */
  getPessimisticGraph(dependencyGraph, traceOfTab) { // eslint-disable-line no-unused-vars
    throw new Error('Pessmistic graph unimplemented!');
  }

  /**
   * @param {LH.Gatherer.Simulation.Result} simulationResult
   * @param {any=} extras
   * @return {LH.Gatherer.Simulation.Result}
   */
  getEstimateFromSimulation(simulationResult, extras) { // eslint-disable-line no-unused-vars
    return simulationResult;
  }

  /**
   * @param {LH.Artifacts.MetricComputationDataInput} data
   * @param {LH.ComputedArtifacts} artifacts
   * @param {any=} extras
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  async computeMetricWithGraphs(data, artifacts, extras) {
    const {trace, devtoolsLog, settings} = data;
    const metricName = this.name.replace('Lantern', '');
    const graph = await artifacts.requestPageDependencyGraph({trace, devtoolsLog});
    const traceOfTab = await artifacts.requestTraceOfTab(trace);
    /** @type {Simulator} */
    const simulator = data.simulator ||
        await artifacts.requestLoadSimulator({devtoolsLog, settings});

    const optimisticGraph = this.getOptimisticGraph(graph, traceOfTab);
    const pessimisticGraph = this.getPessimisticGraph(graph, traceOfTab);

    /** @type {{flexibleOrdering?: boolean, label?: string}} */
    let simulateOptions = {label: `optimistic${metricName}`};
    const optimisticSimulation = simulator.simulate(optimisticGraph, simulateOptions);

    simulateOptions = {label: `optimisticFlex${metricName}`, flexibleOrdering: true};
    const optimisticFlexSimulation = simulator.simulate(optimisticGraph, simulateOptions);

    simulateOptions = {label: `pessimistic${metricName}`};
    const pessimisticSimulation = simulator.simulate(pessimisticGraph, simulateOptions);

    const optimisticEstimate = this.getEstimateFromSimulation(
      optimisticSimulation.timeInMs < optimisticFlexSimulation.timeInMs ?
        optimisticSimulation : optimisticFlexSimulation,
      Object.assign({}, extras, {optimistic: true})
    );

    const pessimisticEstimate = this.getEstimateFromSimulation(
      pessimisticSimulation,
      Object.assign({}, extras, {optimistic: false})
    );

    // Estimates under 1s don't really follow the normal curve fit, minimize the impact of the intercept
    const interceptMultiplier = this.COEFFICIENTS.intercept > 0 ?
      Math.min(1, optimisticEstimate.timeInMs / 1000) : 1;
    const timing =
      this.COEFFICIENTS.intercept * interceptMultiplier +
      this.COEFFICIENTS.optimistic * optimisticEstimate.timeInMs +
      this.COEFFICIENTS.pessimistic * pessimisticEstimate.timeInMs;

    return {
      timing,
      optimisticEstimate,
      pessimisticEstimate,
      optimisticGraph,
      pessimisticGraph,
    };
  }

  /**
   * @param {LH.Artifacts.MetricComputationDataInput} data
   * @param {LH.ComputedArtifacts} computedArtifacts
   * @return {Promise<LH.Artifacts.LanternMetric>}
   */
  compute_(data, computedArtifacts) {
    return this.computeMetricWithGraphs(data, computedArtifacts);
  }
}

module.exports = LanternMetricArtifact;
