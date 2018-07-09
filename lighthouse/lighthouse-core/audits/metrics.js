/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');

class Metrics extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'metrics',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      title: 'Metrics',
      description: 'Collects all available metrics.',
      requiredArtifacts: ['traces', 'devtoolsLogs'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const metricComputationData = {trace, devtoolsLog, settings: context.settings};

    const traceOfTab = await artifacts.requestTraceOfTab(trace);
    const speedline = await artifacts.requestSpeedline(trace);
    const firstContentfulPaint = await artifacts.requestFirstContentfulPaint(metricComputationData);
    const firstMeaningfulPaint = await artifacts.requestFirstMeaningfulPaint(metricComputationData);
    const firstCPUIdle = await artifacts.requestFirstCPUIdle(metricComputationData);
    const interactive = await artifacts.requestInteractive(metricComputationData);
    const speedIndex = await artifacts.requestSpeedIndex(metricComputationData);
    const estimatedInputLatency = await artifacts.requestEstimatedInputLatency(metricComputationData); // eslint-disable-line max-len

    /** @type {UberMetricsItem} */
    const metrics = {
      // Include the simulated/observed performance metrics
      firstContentfulPaint: firstContentfulPaint.timing,
      firstContentfulPaintTs: firstContentfulPaint.timestamp,
      firstMeaningfulPaint: firstMeaningfulPaint.timing,
      firstMeaningfulPaintTs: firstMeaningfulPaint.timestamp,
      firstCPUIdle: firstCPUIdle.timing,
      firstCPUIdleTs: firstCPUIdle.timestamp,
      interactive: interactive.timing,
      interactiveTs: interactive.timestamp,
      speedIndex: speedIndex.timing,
      speedIndexTs: speedIndex.timestamp,
      estimatedInputLatency: estimatedInputLatency.timing,
      estimatedInputLatencyTs: estimatedInputLatency.timestamp,

      // Include all timestamps of interest from trace of tab
      observedNavigationStart: traceOfTab.timings.navigationStart,
      observedNavigationStartTs: traceOfTab.timestamps.navigationStart,
      observedFirstPaint: traceOfTab.timings.firstPaint,
      observedFirstPaintTs: traceOfTab.timestamps.firstPaint,
      observedFirstContentfulPaint: traceOfTab.timings.firstContentfulPaint,
      observedFirstContentfulPaintTs: traceOfTab.timestamps.firstContentfulPaint,
      observedFirstMeaningfulPaint: traceOfTab.timings.firstMeaningfulPaint,
      observedFirstMeaningfulPaintTs: traceOfTab.timestamps.firstMeaningfulPaint,
      observedTraceEnd: traceOfTab.timings.traceEnd,
      observedTraceEndTs: traceOfTab.timestamps.traceEnd,
      observedLoad: traceOfTab.timings.load,
      observedLoadTs: traceOfTab.timestamps.load,
      observedDomContentLoaded: traceOfTab.timings.domContentLoaded,
      observedDomContentLoadedTs: traceOfTab.timestamps.domContentLoaded,

      // Include some visual metrics from speedline
      observedFirstVisualChange: speedline.first,
      observedFirstVisualChangeTs: (speedline.first + speedline.beginning) * 1000,
      observedLastVisualChange: speedline.complete,
      observedLastVisualChangeTs: (speedline.complete + speedline.beginning) * 1000,
      observedSpeedIndex: speedline.speedIndex,
      observedSpeedIndexTs: (speedline.speedIndex + speedline.beginning) * 1000,
    };

    for (const [name, value] of Object.entries(metrics)) {
      const key = /** @type {keyof UberMetricsItem} */ (name);
      if (typeof value !== 'undefined') {
        metrics[key] = Math.round(value);
      }
    }

    /** @type {MetricsDetails} */
    const details = {items: [metrics]};

    return {
      score: 1,
      rawValue: interactive.timing,
      details,
    };
  }
}

/**
 * @typedef UberMetricsItem
 * @property {number} firstContentfulPaint
 * @property {number=} firstContentfulPaintTs
 * @property {number} firstMeaningfulPaint
 * @property {number=} firstMeaningfulPaintTs
 * @property {number} firstCPUIdle
 * @property {number=} firstCPUIdleTs
 * @property {number} interactive
 * @property {number=} interactiveTs
 * @property {number} speedIndex
 * @property {number=} speedIndexTs
 * @property {number} estimatedInputLatency
 * @property {number=} estimatedInputLatencyTs
 * @property {number} observedNavigationStart
 * @property {number} observedNavigationStartTs
 * @property {number=} observedFirstPaint
 * @property {number=} observedFirstPaintTs
 * @property {number} observedFirstContentfulPaint
 * @property {number} observedFirstContentfulPaintTs
 * @property {number=} observedFirstMeaningfulPaint
 * @property {number=} observedFirstMeaningfulPaintTs
 * @property {number=} observedTraceEnd
 * @property {number=} observedTraceEndTs
 * @property {number=} observedLoad
 * @property {number=} observedLoadTs
 * @property {number=} observedDomContentLoaded
 * @property {number=} observedDomContentLoadedTs
 * @property {number} observedFirstVisualChange
 * @property {number} observedFirstVisualChangeTs
 * @property {number} observedLastVisualChange
 * @property {number} observedLastVisualChangeTs
 * @property {number} observedSpeedIndex
 * @property {number} observedSpeedIndexTs
 */

/** @typedef {{items: [UberMetricsItem]}} MetricsDetails */

module.exports = Metrics;
