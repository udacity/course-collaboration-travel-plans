/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Audit a page to see if it's using document.write()
 */

'use strict';

const ViolationAudit = require('../violation-audit');

class NoDocWriteAudit extends ViolationAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'no-document-write',
      title: 'Avoids `document.write()`',
      failureTitle: 'Uses `document.write()`',
      description: 'For users on slow connections, external scripts dynamically injected via ' +
          '`document.write()` can delay page load by tens of seconds. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/document-write).',
      requiredArtifacts: ['ChromeConsoleMessages'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const results = ViolationAudit.getViolationResults(artifacts, /document\.write/);

    const headings = [
      {key: 'url', itemType: 'url', text: 'URL'},
      {key: 'label', itemType: 'text', text: 'Location'},
    ];
    // TODO(bckenny): see TODO in geolocation-on-start
    const details = ViolationAudit.makeTableDetails(headings, results);

    return {
      rawValue: results.length === 0,
      extendedInfo: {
        value: results,
      },
      details,
    };
  }
}

module.exports = NoDocWriteAudit;
