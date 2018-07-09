/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');

class WithoutJavaScript extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'without-javascript',
      title: 'Contains some content when JavaScript is not available',
      failureTitle: 'Does not provide fallback content when JavaScript is not available',
      description: 'Your app should display some content when JavaScript is disabled, even if ' +
          'it\'s just a warning to the user that JavaScript is required to use the app. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/no-js).',
      requiredArtifacts: ['HTMLWithoutJavaScript'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const artifact = artifacts.HTMLWithoutJavaScript;

    // Fail pages that have empty text and are missing a noscript tag
    if (artifact.bodyText.trim() === '' && !artifact.hasNoScript) {
      return {
        rawValue: false,
        explanation: 'The page body should render some content if its scripts are not available.',
      };
    }

    return {
      rawValue: true,
    };
  }
}

module.exports = WithoutJavaScript;
