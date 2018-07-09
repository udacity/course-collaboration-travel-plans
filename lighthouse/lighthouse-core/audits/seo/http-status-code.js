/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit');
const HTTP_UNSUCCESSFUL_CODE_LOW = 400;
const HTTP_UNSUCCESSFUL_CODE_HIGH = 599;

class HTTPStatusCode extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'http-status-code',
      title: 'Page has successful HTTP status code',
      failureTitle: 'Page has unsuccessful HTTP status code',
      description: 'Pages with unsuccessful HTTP status codes may not be indexed properly. ' +
      '[Learn more]' +
      '(https://developers.google.com/web/tools/lighthouse/audits/successful-http-code).',
      requiredArtifacts: ['devtoolsLogs', 'URL'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {Promise<LH.Audit.Product>}
   */
  static audit(artifacts) {
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const URL = artifacts.URL;

    return artifacts.requestMainResource({devtoolsLog, URL})
      .then(mainResource => {
        const statusCode = mainResource.statusCode;

        if (statusCode >= HTTP_UNSUCCESSFUL_CODE_LOW &&
          statusCode <= HTTP_UNSUCCESSFUL_CODE_HIGH) {
          return {
            rawValue: false,
            displayValue: `${statusCode}`,
          };
        }

        return {
          rawValue: true,
        };
      });
  }
}

module.exports = HTTPStatusCode;
