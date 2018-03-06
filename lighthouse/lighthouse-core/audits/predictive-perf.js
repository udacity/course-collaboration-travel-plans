/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const Util = require('../report/v2/renderer/util');
const LoadSimulator = require('../lib/dependency-graph/simulator/simulator');
const NetworkAnalyzer = require('../lib/dependency-graph/simulator/network-analyzer');
const Node = require('../lib/dependency-graph/node');
const WebInspector = require('../lib/web-inspector');

// Parameters (in ms) for log-normal CDF scoring. To see the curve:
//   https://www.desmos.com/calculator/rjp0lbit8y
const SCORING_POINT_OF_DIMINISHING_RETURNS = 1700;
const SCORING_MEDIAN = 10000;

// Any CPU task of 20 ms or more will end up being a critical long task on mobile
const CRITICAL_LONG_TASK_THRESHOLD = 20;

const COEFFICIENTS = {
  FCP: {
    intercept: 1440,
    optimistic: -1.75,
    pessimistic: 2.73,
  },
  FMP: {
    intercept: 1532,
    optimistic: -0.3,
    pessimistic: 1.33,
  },
  TTCI: {
    intercept: 1582,
    optimistic: 0.97,
    pessimistic: 0.49,
  },
};

class PredictivePerf extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      name: 'predictive-perf',
      description: 'Predicted Performance (beta)',
      helpText:
        'Predicted performance evaluates how your site will perform under ' +
        'a 3G connection on a mobile device.',
      scoringMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['traces', 'devtoolsLogs'],
    };
  }

  /**
   * @param {!Node} dependencyGraph
   * @param {function()=} condition
   * @return {!Set<string>}
   */
  static getScriptUrls(dependencyGraph, condition) {
    const scriptUrls = new Set();

    dependencyGraph.traverse(node => {
      if (node.type === Node.TYPES.CPU) return;
      if (node.record._resourceType !== WebInspector.resourceTypes.Script) return;
      if (condition && !condition(node)) return;
      scriptUrls.add(node.record.url);
    });

    return scriptUrls;
  }

  /**
   * @param {!Node} dependencyGraph
   * @return {!Object}
   */
  static computeRTTAndServerResponseTime(dependencyGraph) {
    const records = [];
    dependencyGraph.traverse(node => {
      if (node.type === Node.TYPES.NETWORK) records.push(node.record);
    });

    // First pass compute the estimated observed RTT to each origin's servers.
    const rttByOrigin = new Map();
    for (const [origin, summary] of NetworkAnalyzer.estimateRTTByOrigin(records).entries()) {
      rttByOrigin.set(origin, summary.min);
    }

    // We'll use the minimum RTT as the assumed connection latency since we care about how much addt'l
    // latency each origin introduces as Lantern will be simulating with its own connection latency.
    const minimumRtt = Math.min(...Array.from(rttByOrigin.values()));
    // We'll use the observed RTT information to help estimate the server response time
    const responseTimeSummaries = NetworkAnalyzer.estimateServerResponseTimeByOrigin(records, {
      rttByOrigin,
    });

    const additionalRttByOrigin = new Map();
    const serverResponseTimeByOrigin = new Map();
    for (const [origin, summary] of responseTimeSummaries.entries()) {
      additionalRttByOrigin.set(origin, rttByOrigin.get(origin) - minimumRtt);
      serverResponseTimeByOrigin.set(origin, summary.median);
    }

    return {additionalRttByOrigin, serverResponseTimeByOrigin};
  }

  /**
   * @param {!Node} dependencyGraph
   * @param {!TraceOfTabArtifact} traceOfTab
   * @return {!Node}
   */
  static getOptimisticFCPGraph(dependencyGraph, traceOfTab) {
    const fcp = traceOfTab.timestamps.firstContentfulPaint;
    const blockingScriptUrls = PredictivePerf.getScriptUrls(dependencyGraph, node => {
      return (
        node.endTime <= fcp && node.hasRenderBlockingPriority() && node.initiatorType !== 'script'
      );
    });

    return dependencyGraph.cloneWithRelationships(node => {
      if (node.endTime > fcp) return false;
      // Include EvaluateScript tasks for blocking scripts
      if (node.type === Node.TYPES.CPU) return node.isEvaluateScriptFor(blockingScriptUrls);
      // Include non-script-initiated network requests with a render-blocking priority
      return node.hasRenderBlockingPriority() && node.initiatorType !== 'script';
    });
  }

  /**
   * @param {!Node} dependencyGraph
   * @param {!TraceOfTabArtifact} traceOfTab
   * @return {!Node}
   */
  static getPessimisticFCPGraph(dependencyGraph, traceOfTab) {
    const fcp = traceOfTab.timestamps.firstContentfulPaint;
    const blockingScriptUrls = PredictivePerf.getScriptUrls(dependencyGraph, node => {
      return node.endTime <= fcp && node.hasRenderBlockingPriority();
    });

    return dependencyGraph.cloneWithRelationships(node => {
      if (node.endTime > fcp) return false;
      // Include EvaluateScript tasks for blocking scripts
      if (node.type === Node.TYPES.CPU) return node.isEvaluateScriptFor(blockingScriptUrls);
      // Include all network requests that had render-blocking priority (even script-initiated)
      return node.hasRenderBlockingPriority();
    });
  }

  /**
   * @param {!Node} dependencyGraph
   * @param {!TraceOfTabArtifact} traceOfTab
   * @return {!Node}
   */
  static getOptimisticFMPGraph(dependencyGraph, traceOfTab) {
    const fmp = traceOfTab.timestamps.firstMeaningfulPaint;
    const requiredScriptUrls = PredictivePerf.getScriptUrls(dependencyGraph, node => {
      return (
        node.endTime <= fmp && node.hasRenderBlockingPriority() && node.initiatorType !== 'script'
      );
    });

    return dependencyGraph.cloneWithRelationships(node => {
      if (node.endTime > fmp) return false;
      // Include EvaluateScript tasks for blocking scripts
      if (node.type === Node.TYPES.CPU) return node.isEvaluateScriptFor(requiredScriptUrls);
      // Include non-script-initiated network requests with a render-blocking priority
      return node.hasRenderBlockingPriority() && node.initiatorType !== 'script';
    });
  }

  /**
   * @param {!Node} dependencyGraph
   * @param {!TraceOfTabArtifact} traceOfTab
   * @return {!Node}
   */
  static getPessimisticFMPGraph(dependencyGraph, traceOfTab) {
    const fmp = traceOfTab.timestamps.firstMeaningfulPaint;
    const requiredScriptUrls = PredictivePerf.getScriptUrls(dependencyGraph, node => {
      return node.endTime <= fmp && node.hasRenderBlockingPriority();
    });

    return dependencyGraph.cloneWithRelationships(node => {
      if (node.endTime > fmp) return false;

      // Include CPU tasks that performed a layout or were evaluations of required scripts
      if (node.type === Node.TYPES.CPU) {
        return node.didPerformLayout() || node.isEvaluateScriptFor(requiredScriptUrls);
      }

      // Include all network requests that had render-blocking priority (even script-initiated)
      return node.hasRenderBlockingPriority();
    });
  }

  /**
   * @param {!Node} dependencyGraph
   * @return {!Node}
   */
  static getOptimisticTTCIGraph(dependencyGraph) {
    // Adjust the critical long task threshold for microseconds
    const minimumCpuTaskDuration = CRITICAL_LONG_TASK_THRESHOLD * 1000;

    return dependencyGraph.cloneWithRelationships(node => {
      // Include everything that might be a long task
      if (node.type === Node.TYPES.CPU) return node.event.dur > minimumCpuTaskDuration;
      // Include all scripts and high priority requests, exclude all images
      const isImage = node.record._resourceType === WebInspector.resourceTypes.Image;
      const isScript = node.record._resourceType === WebInspector.resourceTypes.Script;
      return (
        !isImage &&
        (isScript || node.record.priority() === 'High' || node.record.priority() === 'VeryHigh')
      );
    });
  }

  /**
   * @param {!Node} dependencyGraph
   * @return {!Node}
   */
  static getPessimisticTTCIGraph(dependencyGraph) {
    return dependencyGraph;
  }

  /**
   * @param {!Map<!Node, {startTime, endTime}>} nodeTiming
   * @return {number}
   */
  static getLastLongTaskEndTime(nodeTiming, duration = 50) {
    return Array.from(nodeTiming.entries())
      .filter(
        ([node, timing]) =>
          node.type === Node.TYPES.CPU && timing.endTime - timing.startTime > duration
      )
      .map(([_, timing]) => timing.endTime)
      .reduce((max, x) => Math.max(max, x), 0);
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLogs = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    return Promise.all([
      artifacts.requestPageDependencyGraph(trace, devtoolsLogs),
      artifacts.requestTraceOfTab(trace),
    ]).then(([graph, traceOfTab]) => {
      const graphs = {
        optimisticFCP: PredictivePerf.getOptimisticFCPGraph(graph, traceOfTab),
        pessimisticFCP: PredictivePerf.getPessimisticFCPGraph(graph, traceOfTab),
        optimisticFMP: PredictivePerf.getOptimisticFMPGraph(graph, traceOfTab),
        pessimisticFMP: PredictivePerf.getPessimisticFMPGraph(graph, traceOfTab),
        optimisticTTCI: PredictivePerf.getOptimisticTTCIGraph(graph, traceOfTab),
        pessimisticTTCI: PredictivePerf.getPessimisticTTCIGraph(graph, traceOfTab),
      };

      const values = {};
      const options = PredictivePerf.computeRTTAndServerResponseTime(graph);
      Object.keys(graphs).forEach(key => {
        const estimate = new LoadSimulator(graphs[key], options).simulate();
        const longTaskThreshold = key.startsWith('optimistic') ? 100 : 50;
        const lastLongTaskEnd = PredictivePerf.getLastLongTaskEndTime(
          estimate.nodeTiming,
          longTaskThreshold
        );

        switch (key) {
          case 'optimisticFCP':
          case 'pessimisticFCP':
          case 'optimisticFMP':
          case 'pessimisticFMP':
            values[key] = estimate.timeInMs;
            break;
          case 'optimisticTTCI':
            values[key] = Math.max(values.optimisticFMP, lastLongTaskEnd);
            break;
          case 'pessimisticTTCI':
            values[key] = Math.max(values.pessimisticFMP, lastLongTaskEnd);
            break;
        }
      });

      values.roughEstimateOfFCP =
        COEFFICIENTS.FCP.intercept +
        COEFFICIENTS.FCP.optimistic * values.optimisticFCP +
        COEFFICIENTS.FCP.pessimistic * values.pessimisticFCP;
      values.roughEstimateOfFMP =
        COEFFICIENTS.FMP.intercept +
        COEFFICIENTS.FMP.optimistic * values.optimisticFMP +
        COEFFICIENTS.FMP.pessimistic * values.pessimisticFMP;
      values.roughEstimateOfTTCI =
        COEFFICIENTS.TTCI.intercept +
        COEFFICIENTS.TTCI.optimistic * values.optimisticTTCI +
        COEFFICIENTS.TTCI.pessimistic * values.pessimisticTTCI;

      // While the raw values will never be lower than following metric, the weights make this
      // theoretically possible, so take the maximum if this happens.
      values.roughEstimateOfFMP = Math.max(values.roughEstimateOfFCP, values.roughEstimateOfFMP);
      values.roughEstimateOfTTCI = Math.max(values.roughEstimateOfFMP, values.roughEstimateOfTTCI);

      const score = Audit.computeLogNormalScore(
        values.roughEstimateOfTTCI,
        SCORING_POINT_OF_DIMINISHING_RETURNS,
        SCORING_MEDIAN
      );

      return {
        score,
        rawValue: values.roughEstimateOfTTCI,
        displayValue: Util.formatMilliseconds(values.roughEstimateOfTTCI),
        extendedInfo: {value: values},
      };
    });
  }
}

module.exports = PredictivePerf;
