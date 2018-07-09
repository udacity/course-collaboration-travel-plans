/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Base class for all aXe audits. Provides a consistent way to
 * generate audit results using aXe rule names.
 */

const Audit = require('../audit');

class AxeAudit extends Audit {
  /**
   * @param {LH.Artifacts} artifacts Accessibility gatherer artifacts. Note that AxeAudit
   * expects the meta name for the class to match the rule id from aXe.
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    // Indicate if a test is not applicable.
    // This means aXe did not find any nodes which matched these checks.
    // Note in Lighthouse we use the phrasing "Not Applicable" (aXe uses "inapplicable", which sounds weird).
    const notApplicables = artifacts.Accessibility.notApplicable || [];
    const isNotApplicable = notApplicables.find(result => result.id === this.meta.id);
    if (isNotApplicable) {
      return {
        rawValue: true,
        notApplicable: true,
      };
    }

    const violations = artifacts.Accessibility.violations || [];
    const rule = violations.find(result => result.id === this.meta.id);
    const impact = rule && rule.impact;
    const tags = rule && rule.tags;

    /** @type {Array<{node: LH.Audit.DetailsRendererNodeDetailsJSON}>} */
    let items = [];
    if (rule && rule.nodes) {
      items = rule.nodes.map(node => ({
        node: /** @type {LH.Audit.DetailsRendererNodeDetailsJSON} */ ({
          type: 'node',
          selector: Array.isArray(node.target) ? node.target.join(' ') : '',
          path: node.path,
          snippet: node.html || node.snippet,
          explanation: node.failureSummary,
        }),
      }));
    }

    const headings = [
      {key: 'node', itemType: 'node', text: 'Failing Elements'},
    ];

    return {
      rawValue: typeof rule === 'undefined',
      extendedInfo: {
        value: rule,
      },
      details: {...Audit.makeTableDetails(headings, items), impact, tags},
    };
  }
}

module.exports = AxeAudit;
