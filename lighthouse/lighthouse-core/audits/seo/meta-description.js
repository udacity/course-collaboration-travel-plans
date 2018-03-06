/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit');

class Description extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      name: 'meta-description',
      description: 'Document has a meta description',
      failureDescription: 'Document does not have a meta description',
      helpText: 'Meta descriptions may be included in search results to concisely summarize ' +
          'page content. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/description).',
      requiredArtifacts: ['MetaDescription'],
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    if (artifacts.MetaDescription === null) {
      return {
        rawValue: false,
      };
    }

    if (artifacts.MetaDescription.trim().length === 0) {
      return {
        rawValue: false,
        debugString: 'Description text is empty.',
      };
    }

    return {
      rawValue: true,
    };
  }
}

module.exports = Description;
