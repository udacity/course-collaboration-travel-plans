/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Diagnostic audit that lists all JavaScript libraries detected on the page
 */

'use strict';

const Audit = require('../audit');

class JsLibrariesAudit extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'js-libraries',
      title: 'Detected JavaScript libraries',
      description: 'All front-end JavaScript libraries detected on the page.',
      requiredArtifacts: ['JSLibraries'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const libDetails = artifacts.JSLibraries.map(lib => ({
      name: lib.name,
      version: lib.version, // null if not detected
      npm: lib.npmPkgName || null, // ~70% of libs come with this field
    }));

    const headings = [
      {key: 'name', itemType: 'text', text: 'Name'},
      {key: 'version', itemType: 'text', text: 'Version'},
    ];
    const details = Audit.makeTableDetails(headings, libDetails, {});

    return {
      rawValue: true, // Always pass for now.
      details,
    };
  }
}

module.exports = JsLibrariesAudit;
