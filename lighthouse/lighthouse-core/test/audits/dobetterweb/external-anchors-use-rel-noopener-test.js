/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ExternalAnchorsAudit =
  require('../../../audits/dobetterweb/external-anchors-use-rel-noopener.js');
const assert = require('assert');

const URL = 'https://google.com/test';

/* eslint-env jest */

describe('External anchors use rel="noopener"', () => {
  it('passes when links are from same hosts as the page host', () => {
    const auditResult = ExternalAnchorsAudit.audit({
      AnchorsWithNoRelNoopener: [
        {href: 'https://google.com/test'},
        {href: 'https://google.com/test1'},
      ],
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.rawValue, true);
    assert.equal(auditResult.details.items.length, 0);
    assert.equal(auditResult.details.items.length, 0);
  });

  it('passes when links have javascript in href attribute', () => {
    const auditResult = ExternalAnchorsAudit.audit({
      AnchorsWithNoRelNoopener: [
        {href: 'javascript:void(0)'},
        {href: 'JAVASCRIPT:void(0)'},
      ],
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.rawValue, true);
    assert.equal(auditResult.details.items.length, 0);
  });

  it('passes when links have mailto in href attribute', () => {
    const auditResult = ExternalAnchorsAudit.audit({
      AnchorsWithNoRelNoopener: [
        {href: 'mailto:inbox@email.com'},
        {href: 'MAILTO:INBOX@EMAIL.COM'},
      ],
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.rawValue, true);
    assert.equal(auditResult.details.items.length, 0);
  });

  it('fails when links are from different hosts than the page host', () => {
    const auditResult = ExternalAnchorsAudit.audit({
      AnchorsWithNoRelNoopener: [
        {href: 'https://example.com/test'},
        {href: 'https://example.com/test1'},
      ],
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.rawValue, false);
    assert.equal(auditResult.details.items.length, 2);
    assert.equal(auditResult.details.items.length, 2);
  });

  it('fails when links have no href attribute', () => {
    const auditResult = ExternalAnchorsAudit.audit({
      AnchorsWithNoRelNoopener: [
        {href: ''},
      ],
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.rawValue, false);
    assert.equal(auditResult.details.items.length, 1);
    assert.equal(auditResult.details.items.length, 1);
    assert.ok(auditResult.warnings.length, 'includes warning');
  });

  it('fails when links have href attribute starting with a protocol', () => {
    const auditResult = ExternalAnchorsAudit.audit({
      AnchorsWithNoRelNoopener: [
        {href: 'http://'},
        {href: 'http:'},
        {href: 'https://'},
        {href: 'https:'},
      ],
      URL: {finalUrl: URL},
    });
    assert.equal(auditResult.rawValue, false);
    assert.equal(auditResult.details.items.length, 4);
    assert.equal(auditResult.details.items.length, 4);
    assert.equal(auditResult.warnings.length, 4);
  });
});
