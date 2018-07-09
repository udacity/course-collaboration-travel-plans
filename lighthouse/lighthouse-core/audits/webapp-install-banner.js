/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const MultiCheckAudit = require('./multi-check-audit');
const SWAudit = require('./service-worker');
const ManifestValues = require('../gather/computed/manifest-values');

/**
 * @fileoverview
 * Audits if a page is configured to prompt users with the webapp install banner.
 * https://github.com/GoogleChrome/lighthouse/issues/23#issuecomment-270453303
 *
 * Requirements:
 *   * manifest is not empty
 *   * manifest has valid start url
 *   * manifest has a valid name
 *   * manifest has a valid shortname
 *   * manifest display property is standalone, minimal-ui, or fullscreen
 *   * manifest contains icon that's a png and size >= 192px
 *   * SW is registered, and it owns this page and the manifest's start url
 *   * Site engagement score of 2 or higher

 * This audit covers these requirements with the following exceptions:
 *   * it doesn't consider SW controlling the starturl
 *   * it doesn't consider the site engagement score (naturally)
 */

class WebappInstallBanner extends MultiCheckAudit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'webapp-install-banner',
      title: 'User can be prompted to Install the Web App',
      failureTitle: 'User will not be prompted to Install the Web App',
      description: 'Browsers can proactively prompt users to add your app to their homescreen, ' +
          'which can lead to higher engagement. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/install-prompt).',
      requiredArtifacts: ['URL', 'ServiceWorker', 'Manifest', 'StartUrl'],
    };
  }

  /**
   * @param {LH.Artifacts.ManifestValues} manifestValues
   * @return {Array<string>}
   */
  static assessManifest(manifestValues) {
    if (manifestValues.isParseFailure && manifestValues.parseFailureReason) {
      return [manifestValues.parseFailureReason];
    }

    /** @type {Array<string>} */
    const failures = [];
    const bannerCheckIds = [
      'hasName',
      // Technically shortname isn't required (if name is defined):
      //   https://cs.chromium.org/chromium/src/chrome/browser/installable/installable_manager.cc?type=cs&q=IsManifestValidForWebApp+f:cc+-f:test&sq=package:chromium&l=473
      // Despite this, we think it's better to require it anyway.
      // short_name is preferred for the homescreen icon, but a longer name can be used in
      // the splash screen and app title. Given the different usecases, we'd like to make it clearer
      // that the developer has two possible strings to work with.
      'hasShortName',
      'hasStartUrl',
      'hasPWADisplayValue',
      'hasIconsAtLeast192px',
    ];
    manifestValues.allChecks
      .filter(item => bannerCheckIds.includes(item.id))
      .forEach(item => {
        if (!item.passing) {
          failures.push(item.failureText);
        }
      });

    return failures;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {Array<string>}
   */
  static assessServiceWorker(artifacts) {
    const failures = [];
    const hasServiceWorker = SWAudit.audit(artifacts).rawValue;
    if (!hasServiceWorker) {
      failures.push('Site does not register a service worker');
    }

    return failures;
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {{failures: Array<string>, warnings: Array<string>}}
   */
  static assessOfflineStartUrl(artifacts) {
    const failures = [];
    const warnings = [];
    const hasOfflineStartUrl = artifacts.StartUrl.statusCode === 200;

    if (!hasOfflineStartUrl) {
      failures.push('Service worker does not successfully serve the manifest\'s start_url');
      if (artifacts.StartUrl.explanation) {
        failures.push(artifacts.StartUrl.explanation);
      }
    }

    if (artifacts.StartUrl.explanation) {
      warnings.push(artifacts.StartUrl.explanation);
    }

    return {failures, warnings};
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<{failures: Array<string>, warnings: Array<string>, manifestValues: LH.Artifacts.ManifestValues}>}
   */
  static async audit_(artifacts, context) {
    /** @type {Array<string>} */
    let offlineFailures = [];
    /** @type {Array<string>} */
    let offlineWarnings = [];

    const manifestValues = await ManifestValues.request(context, artifacts.Manifest);
    const manifestFailures = WebappInstallBanner.assessManifest(manifestValues);
    const swFailures = WebappInstallBanner.assessServiceWorker(artifacts);
    if (!swFailures.length) {
      const {failures, warnings} = WebappInstallBanner.assessOfflineStartUrl(artifacts);
      offlineFailures = failures;
      offlineWarnings = warnings;
    }

    return {
      warnings: offlineWarnings,
      failures: [
        ...manifestFailures,
        ...swFailures,
        ...offlineFailures,
      ],
      manifestValues,
    };
  }
}

module.exports = WebappInstallBanner;
