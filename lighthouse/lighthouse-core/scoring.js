/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';

class ReportScoring {
  /**
   * Computes the weighted-average of the score of the list of items.
   * @param {!Array<{score: number|undefined, weight: number|undefined}>} items
   * @return {number}
   */
  static arithmeticMean(items) {
    const results = items.reduce((result, item) => {
      const score = Number(item.score) || 0;
      const weight = Number(item.weight) || 0;
      return {
        weight: result.weight + weight,
        sum: result.sum + score * weight,
      };
    }, {weight: 0, sum: 0});

    return (results.sum / results.weight) || 0;
  }

  /**
   * Returns the report JSON object with computed scores.
   * @param {{categories: !Object<string, {id: string|undefined, weight: number|undefined, audits: !Array<{id: string, weight: number|undefined}>}>}} config
   * @param {!Object<{score: ?number|boolean|undefined}>} resultsByAuditId
   * @return {{score: number, categories: !Array<{audits: !Array<{score: number, result: !Object}>}>}}
   */
  static scoreAllCategories(config, resultsByAuditId) {
    const categories = Object.keys(config.categories).map(categoryId => {
      const category = config.categories[categoryId];
      category.id = categoryId;

      const audits = category.audits.map(audit => {
        const result = resultsByAuditId[audit.id];
        // Cast to number to catch `null` and undefined when audits error
        let auditScore = Number(result.score) || 0;
        if (typeof result.score === 'boolean') {
          auditScore = result.score ? 100 : 0;
        }
        // If a result was not applicable, meaning its checks did not run against anything on
        // the page, force it's weight to 0. It will not count during the arithmeticMean() but
        // will still be included in the final report json and displayed in the report as
        // "Not Applicable".
        if (result.notApplicable) {
          auditScore = 100;
          audit.weight = 0;
          result.informative = true;
        }

        return Object.assign({}, audit, {result, score: auditScore});
      });

      const categoryScore = ReportScoring.arithmeticMean(audits);
      return Object.assign({}, category, {audits, score: categoryScore});
    });

    const overallScore = ReportScoring.arithmeticMean(categories);
    return {score: overallScore, categories};
  }
}

module.exports = ReportScoring;
