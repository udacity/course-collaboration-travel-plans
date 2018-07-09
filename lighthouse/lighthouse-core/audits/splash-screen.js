/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const MultiCheckAudit = require('./multi-check-audit');
const ManifestValues = require('../gather/computed/manifest-values');

/**
 * @fileoverview
 * Audits if a page is configured for a custom splash screen when launched
 * https://github.com/GoogleChrome/lighthouse/issues/24
 *
 * Requirements:
 *   * manifest is not empty
 *   * manifest has a valid name
 *   * manifest has a valid background_color
 *   * manifest has a valid theme_color
 *   * manifest contains icon that's a png and size >= 512px
 */

class SplashScreen extends MultiCheckAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'splash-screen',
      title: 'Configured for a custom splash screen',
      failureTitle: 'Is not configured for a custom splash screen',
      description: 'A themed splash screen ensures a high-quality experience when ' +
          'users launch your app from their homescreens. [Learn ' +
          'more](https://developers.google.com/web/tools/lighthouse/audits/custom-splash-screen).',
      requiredArtifacts: ['Manifest'],
    };
  }

  /**
   * @param {LH.Artifacts.ManifestValues} manifestValues
   * @param {Array<string>} failures
   */
  static assessManifest(manifestValues, failures) {
    if (manifestValues.isParseFailure && manifestValues.parseFailureReason) {
      failures.push(manifestValues.parseFailureReason);
      return;
    }

    const splashScreenCheckIds = [
      'hasName',
      'hasBackgroundColor',
      'hasThemeColor',
      'hasIconsAtLeast512px',
    ];

    manifestValues.allChecks
      .filter(item => splashScreenCheckIds.includes(item.id))
      .forEach(item => {
        if (!item.passing) {
          failures.push(item.failureText);
        }
      });
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<{failures: Array<string>, manifestValues: LH.Artifacts.ManifestValues}>}
   */
  static async audit_(artifacts, context) {
    /** @type {Array<string>} */
    const failures = [];

    const manifestValues = await ManifestValues.request(context, artifacts.Manifest);
    SplashScreen.assessManifest(manifestValues, failures);

    return {
      failures,
      manifestValues,
    };
  }
}

module.exports = SplashScreen;
