/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const statistics = require('../lib/statistics');
const Util = require('../report/html/renderer/util');

const DEFAULT_PASS = 'defaultPass';

/**
 * Clamp figure to 2 decimal places
 * @param {number} val
 * @return {number}
 */
const clampTo2Decimals = val => Math.round(val * 100) / 100;

class Audit {
  /**
   * @return {string}
   */
  static get DEFAULT_PASS() {
    return DEFAULT_PASS;
  }

  /**
   * @return {LH.Audit.ScoreDisplayModes}
   */
  static get SCORING_MODES() {
    return {
      NUMERIC: 'numeric',
      BINARY: 'binary',
      MANUAL: 'manual',
      INFORMATIVE: 'informative',
      NOT_APPLICABLE: 'not-applicable',
      ERROR: 'error',
    };
  }

  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    throw new Error('Audit meta information must be overridden.');
  }

  /**
   * @return {Object}
   */
  static get defaultOptions() {
    return {};
  }

  /* eslint-disable no-unused-vars */

  /**
   *
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {LH.Audit.Product|Promise<LH.Audit.Product>}
   */
  static audit(artifacts, context) {
    throw new Error('audit() method must be overriden');
  }

  /* eslint-enable no-unused-vars */

  /**
   * Computes a clamped score between 0 and 1 based on the measured value. Score is determined by
   * considering a log-normal distribution governed by the two control points, point of diminishing
   * returns and the median value, and returning the percentage of sites that have higher value.
   *
   * @param {number} measuredValue
   * @param {number} diminishingReturnsValue
   * @param {number} medianValue
   * @return {number}
   */
  static computeLogNormalScore(measuredValue, diminishingReturnsValue, medianValue) {
    const distribution = statistics.getLogNormalDistribution(
      medianValue,
      diminishingReturnsValue
    );

    let score = distribution.computeComplementaryPercentile(measuredValue);
    score = Math.min(1, score);
    score = Math.max(0, score);
    return clampTo2Decimals(score);
  }

  /**
   * @param {typeof Audit} audit
   * @param {string} errorMessage
   * @return {LH.Audit.Result}
   */
  static generateErrorAuditResult(audit, errorMessage) {
    return Audit.generateAuditResult(audit, {
      rawValue: null,
      errorMessage,
    });
  }

  /**
   * @param {Array<LH.Audit.Heading>} headings
   * @param {Array<Object<string, LH.Audit.DetailsItem>>} results
   * @param {LH.Audit.DetailsRendererDetailsSummary=} summary
   * @return {LH.Audit.DetailsRendererDetailsJSON}
   */
  static makeTableDetails(headings, results, summary) {
    if (results.length === 0) {
      return {
        type: 'table',
        headings: [],
        items: [],
        summary,
      };
    }

    return {
      type: 'table',
      headings: headings,
      items: results,
      summary,
    };
  }

  /**
   * @param {Array<LH.ResultLite.Audit.ColumnHeading>} headings
   * @param {Array<LH.ResultLite.Audit.WastedBytesDetailsItem>|Array<LH.ResultLite.Audit.WastedTimeDetailsItem>} items
   * @param {number} overallSavingsMs
   * @param {number=} overallSavingsBytes
   * @return {LH.Result.Audit.OpportunityDetails}
   */
  static makeOpportunityDetails(headings, items, overallSavingsMs, overallSavingsBytes) {
    return {
      type: 'opportunity',
      headings: items.length === 0 ? [] : headings,
      items,
      overallSavingsMs,
      overallSavingsBytes,
    };
  }

  /**
   * @param {typeof Audit} audit
   * @param {LH.Audit.Product} result
   * @return {{score: number|null, scoreDisplayMode: LH.Audit.ScoreDisplayMode}}
   */
  static _normalizeAuditScore(audit, result) {
    // Cast true/false to 1/0
    let score = result.score === undefined ? Number(result.rawValue) : result.score;

    if (!Number.isFinite(score)) throw new Error(`Invalid score: ${score}`);
    if (score > 1) throw new Error(`Audit score for ${audit.meta.id} is > 1`);
    if (score < 0) throw new Error(`Audit score for ${audit.meta.id} is < 0`);

    score = clampTo2Decimals(score);

    const scoreDisplayMode = audit.meta.scoreDisplayMode || Audit.SCORING_MODES.BINARY;

    return {
      score,
      scoreDisplayMode,
    };
  }

  /**
   * @param {typeof Audit} audit
   * @param {LH.Audit.Product} result
   * @return {LH.Audit.Result}
   */
  static generateAuditResult(audit, result) {
    if (typeof result.rawValue === 'undefined') {
      throw new Error('generateAuditResult requires a rawValue');
    }

    // TODO(bckenny): cleanup the flow of notApplicable/error/binary/numeric
    let {score, scoreDisplayMode} = Audit._normalizeAuditScore(audit, result);

    // If the audit was determined to not apply to the page, set score display mode appropriately
    if (result.notApplicable) {
      scoreDisplayMode = Audit.SCORING_MODES.NOT_APPLICABLE;
      result.rawValue = true;
    }

    if (result.errorMessage) {
      scoreDisplayMode = Audit.SCORING_MODES.ERROR;
    }

    let auditTitle = audit.meta.title;
    if (audit.meta.failureTitle) {
      if (Number(score) < Util.PASS_THRESHOLD) {
        auditTitle = audit.meta.failureTitle;
      }
    }

    if (scoreDisplayMode !== Audit.SCORING_MODES.BINARY &&
        scoreDisplayMode !== Audit.SCORING_MODES.NUMERIC) {
      score = null;
    }

    return {
      id: audit.meta.id,
      title: auditTitle,
      description: audit.meta.description,

      score,
      scoreDisplayMode,
      rawValue: result.rawValue,

      displayValue: result.displayValue,
      explanation: result.explanation,
      errorMessage: result.errorMessage,
      warnings: result.warnings,

      details: result.details,
    };
  }
}

module.exports = Audit;
