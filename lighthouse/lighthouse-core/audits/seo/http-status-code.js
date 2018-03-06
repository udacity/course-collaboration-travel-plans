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
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      name: 'http-status-code',
      description: 'Page has successful HTTP status code',
      failureDescription: 'Page has unsuccessful HTTP status code',
      helpText: 'Pages with unsuccessful HTTP status codes may not be indexed properly. ' +
      '[Learn more]' +
      '(https://developers.google.com/web/tools/lighthouse/audits/successful-http-code).',
      requiredArtifacts: ['devtoolsLogs'],
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const devtoolsLogs = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];

    return artifacts.requestMainResource(devtoolsLogs)
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
