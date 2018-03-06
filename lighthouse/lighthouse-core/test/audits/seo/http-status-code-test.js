/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const HTTPStatusCodeAudit = require('../../../audits/seo/http-status-code.js');
const assert = require('assert');

/* eslint-env mocha */

describe('SEO: HTTP code audit', () => {
  it('fails when status code is unsuccesfull', () => {
    const statusCodes = [403, 404, 500];

    const allRuns = statusCodes.map(statusCode => {
      const mainResource = {
        statusCode,
      };
      const artifacts = {
        devtoolsLogs: {[HTTPStatusCodeAudit.DEFAULT_PASS]: []},
        requestNetworkRecords: () => Promise.resolve(),
        requestMainResource: () => Promise.resolve(mainResource),
      };

      return HTTPStatusCodeAudit.audit(artifacts).then(auditResult => {
        assert.equal(auditResult.rawValue, false);
        assert.ok(auditResult.displayValue.includes(statusCode), false);
      });
    });

    return Promise.all(allRuns);
  });

  it('passes when status code is successful', () => {
    const mainResource = {
      statusCode: 200,
    };

    const artifacts = {
      devtoolsLogs: {[HTTPStatusCodeAudit.DEFAULT_PASS]: []},
      requestNetworkRecords: () => Promise.resolve(),
      requestMainResource: () => Promise.resolve(mainResource),
    };

    return HTTPStatusCodeAudit.audit(artifacts).then(auditResult => {
      assert.equal(auditResult.rawValue, true);
    });
  });
});
