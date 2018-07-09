/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const ManifestValues = require('../gather/computed/manifest-values');

class ManifestShortNameLength extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'manifest-short-name-length',
      title: 'The `short_name` won\'t be truncated on the homescreen',
      failureTitle: 'The `short_name` will be truncated on the homescreen',
      description: 'Make your app\'s `short_name` fewer than 12 characters to ' +
          'ensure that it\'s not truncated on homescreens. [Learn ' +
          'more](https://developers.google.com/web/tools/lighthouse/audits/manifest-short_name-is-not-truncated).',
      requiredArtifacts: ['Manifest'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const manifestValues = await ManifestValues.request(context, artifacts.Manifest);
    // If there's no valid manifest, this audit is not applicable
    if (manifestValues.isParseFailure) {
      return {
        rawValue: true,
        notApplicable: true,
      };
    }

    const shortNameCheck = manifestValues.allChecks.find(i => i.id === 'hasShortName');
    const shortNameLengthCheck = manifestValues.allChecks.find(i => i.id === 'shortNameLength');

    // If there's no short_name present, this audit is not applicable
    if (shortNameCheck && !shortNameCheck.passing) {
      return {
        rawValue: true,
        notApplicable: true,
      };
    }
    // Shortname is present, but it's too long
    if (shortNameLengthCheck && !shortNameLengthCheck.passing) {
      return {
        rawValue: false,
        explanation: `Failure: ${shortNameLengthCheck.failureText}.`,
      };
    }
    // Has a shortname that's under the threshold
    return {
      rawValue: true,
    };
  }
}

module.exports = ManifestShortNameLength;
