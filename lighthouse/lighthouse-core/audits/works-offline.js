/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const URL = require('../lib/url-shim');
const Audit = require('./audit');

class WorksOffline extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'works-offline',
      title: 'Responds with a 200 when offline',
      failureTitle: 'Does not respond with a 200 when offline',
      description: 'If you\'re building a Progressive Web App, consider using a service worker ' +
          'so that your app can work offline. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/http-200-when-offline).',
      requiredArtifacts: ['Offline', 'URL'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const warnings = [];
    const passed = artifacts.Offline === 200;
    if (!passed &&
        !URL.equalWithExcludedFragments(artifacts.URL.requestedUrl, artifacts.URL.finalUrl)) {
      warnings.push('You may be not loading offline because your test URL ' +
          `(${artifacts.URL.requestedUrl}) was redirected to "${artifacts.URL.finalUrl}". ` +
          'Try testing the second URL directly.');
    }

    return {
      rawValue: passed,
      warnings,
    };
  }
}

module.exports = WorksOffline;
