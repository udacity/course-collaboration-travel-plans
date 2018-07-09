/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit');

class PasswordInputsCanBePastedIntoAudit extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'password-inputs-can-be-pasted-into',
      title: 'Allows users to paste into password fields',
      failureTitle: 'Prevents users to paste into password fields',
      description: 'Preventing password pasting undermines good security policy. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/password-pasting).',
      requiredArtifacts: ['PasswordInputsWithPreventedPaste'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const passwordInputsWithPreventedPaste = artifacts.PasswordInputsWithPreventedPaste;

    /** @type {Array<{node: LH.Audit.DetailsRendererNodeDetailsJSON}>} */
    const items = [];
    passwordInputsWithPreventedPaste.forEach(input => {
      items.push({
        node: {type: 'node', snippet: input.snippet},
      });
    });

    const headings = [
      {key: 'node', itemType: 'node', text: 'Failing Elements'},
    ];

    return {
      rawValue: passwordInputsWithPreventedPaste.length === 0,
      extendedInfo: {
        value: passwordInputsWithPreventedPaste,
      },
      details: Audit.makeTableDetails(headings, items),
    };
  }
}

module.exports = PasswordInputsCanBePastedIntoAudit;
