/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const Util = require('../report/html/renderer/util');

// Parameters (in ms) for log-normal CDF scoring. To see the curve:
//   https://www.desmos.com/calculator/rjp0lbit8y
const SCORING_POINT_OF_DIMINISHING_RETURNS = 1700;
const SCORING_MEDIAN = 10000;

class PredictivePerf extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'predictive-perf',
      title: 'Predicted Performance (beta)',
      description:
        'Predicted performance evaluates how your site will perform under ' +
        'a 3G connection on a mobile device.',
      scoreDisplayMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['traces', 'devtoolsLogs'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    /** @type {LH.Config.Settings} */
    // @ts-ignore - TODO(bckenny): allow optional `throttling` settings
    const settings = {}; // Use default settings.
    const fcp = await artifacts.requestLanternFirstContentfulPaint({trace, devtoolsLog, settings});
    const fmp = await artifacts.requestLanternFirstMeaningfulPaint({trace, devtoolsLog, settings});
    const tti = await artifacts.requestLanternInteractive({trace, devtoolsLog, settings});
    const ttfcpui = await artifacts.requestLanternFirstCPUIdle({trace, devtoolsLog, settings});
    const si = await artifacts.requestLanternSpeedIndex({trace, devtoolsLog, settings});
    const eil = await artifacts.requestLanternEstimatedInputLatency({trace, devtoolsLog, settings});

    const values = {
      roughEstimateOfFCP: fcp.timing,
      optimisticFCP: fcp.optimisticEstimate.timeInMs,
      pessimisticFCP: fcp.pessimisticEstimate.timeInMs,

      roughEstimateOfFMP: fmp.timing,
      optimisticFMP: fmp.optimisticEstimate.timeInMs,
      pessimisticFMP: fmp.pessimisticEstimate.timeInMs,

      roughEstimateOfTTI: tti.timing,
      optimisticTTI: tti.optimisticEstimate.timeInMs,
      pessimisticTTI: tti.pessimisticEstimate.timeInMs,

      roughEstimateOfTTFCPUI: ttfcpui.timing,
      optimisticTTFCPUI: ttfcpui.optimisticEstimate.timeInMs,
      pessimisticTTFCPUI: ttfcpui.pessimisticEstimate.timeInMs,

      roughEstimateOfSI: si.timing,
      optimisticSI: si.optimisticEstimate.timeInMs,
      pessimisticSI: si.pessimisticEstimate.timeInMs,

      roughEstimateOfEIL: eil.timing,
      optimisticEIL: eil.optimisticEstimate.timeInMs,
      pessimisticEIL: eil.pessimisticEstimate.timeInMs,
    };

    const score = Audit.computeLogNormalScore(
      values.roughEstimateOfTTI,
      SCORING_POINT_OF_DIMINISHING_RETURNS,
      SCORING_MEDIAN
    );

    return {
      score,
      rawValue: values.roughEstimateOfTTI,
      displayValue: Util.formatMilliseconds(values.roughEstimateOfTTI),
      details: {items: [values]},
    };
  }
}

module.exports = PredictivePerf;
