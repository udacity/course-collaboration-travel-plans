/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const Util = require('../report/v2/renderer/util.js');

// Parameters (in ms) for log-normal CDF scoring. To see the curve:
//   https://www.desmos.com/calculator/rjp0lbit8y
const SCORING_POINT_OF_DIMINISHING_RETURNS = 1700;
const SCORING_MEDIAN = 10000;

class FirstInteractiveMetric extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      name: 'first-interactive',
      description: 'First Interactive (beta)',
      helpText: 'First Interactive marks the time at which the page is ' +
          'minimally interactive. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/first-interactive).',
      scoringMode: Audit.SCORING_MODES.NUMERIC,
      requiredArtifacts: ['traces'],
    };
  }

  /**
   * Identify the time the page is "first interactive"
   * @see https://docs.google.com/document/d/1GGiI9-7KeY3TPqS3YT271upUVimo-XiL5mwWorDUD4c/edit#
   *
   * @param {!Artifacts} artifacts
   * @return {!Promise<!AuditResult>}
   */
  static audit(artifacts) {
    const trace = artifacts.traces[Audit.DEFAULT_PASS];
    return artifacts.requestFirstInteractive(trace)
      .then(firstInteractive => {
        return {
          score: Audit.computeLogNormalScore(
            firstInteractive.timeInMs,
            SCORING_POINT_OF_DIMINISHING_RETURNS,
            SCORING_MEDIAN
          ),
          rawValue: firstInteractive.timeInMs,
          displayValue: Util.formatMilliseconds(firstInteractive.timeInMs),
          extendedInfo: {
            value: firstInteractive,
          },
        };
      });
  }
}

module.exports = FirstInteractiveMetric;
