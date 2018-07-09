/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../../../audits/dobetterweb/doctype.js');
const assert = require('assert');

/* eslint-env jest */

describe('DOBETTERWEB: doctype audit', () => {
  it('fails when document does not contain a doctype', () => {
    const auditResult = Audit.audit({
      Doctype: null,
    });
    assert.equal(auditResult.rawValue, false);
    assert.equal(auditResult.explanation, 'Document must contain a doctype');
  });

  it('fails when the value of the name attribute is a value other then lowercase "html"', () => {
    const auditResult = Audit.audit({
      Doctype: {
        name: 'xml',
        publicId: '',
        systemId: '',
      },
    });
    assert.equal(auditResult.rawValue, false);
    assert.equal(auditResult.explanation, 'Doctype name must be the lowercase string `html`');
  });

  it('fails when the value of the name attribute is not the lowercase string "html"', () => {
    const auditResult = Audit.audit({
      Doctype: {
        name: 'HTML',
        publicId: '',
        systemId: '',
      },
    });
    assert.equal(auditResult.rawValue, false);
    assert.equal(auditResult.explanation, 'Doctype name must be the lowercase string `html`');
  });

  it('fails when the publicId attribute is not an empty string', () => {
    const auditResult = Audit.audit({
      Doctype: {
        name: 'html',
        publicId: '189655',
        systemId: '',
      },
    });
    assert.equal(auditResult.rawValue, false);
    assert.equal(auditResult.explanation, 'Expected publicId to be an empty string');
  });

  it('fails when the systemId attribute is not an empty string', () => {
    const auditResult = Audit.audit({
      Doctype: {
        name: 'html',
        publicId: '',
        systemId: '189655',
      },
    });
    assert.equal(auditResult.rawValue, false);
    assert.equal(auditResult.explanation, 'Expected systemId to be an empty string');
  });

  it('succeeds when document contains a doctype, and the name value is "html"', () => {
    const auditResult = Audit.audit({
      Doctype: {
        name: 'html',
        publicId: '',
        systemId: '',
      },
    });
    assert.equal(auditResult.rawValue, true);
  });
});
