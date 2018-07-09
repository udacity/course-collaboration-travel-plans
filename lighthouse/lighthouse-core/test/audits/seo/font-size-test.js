/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const FontSizeAudit = require('../../../audits/seo/font-size.js');
const assert = require('assert');

const URL = 'https://example.com';
const validViewport = 'width=device-width';

/* eslint-env jest */

describe('SEO: Font size audit', () => {
  it('fails when viewport is not set', () => {
    const artifacts = {
      URL,
      Viewport: null,
      FontSize: [],
    };

    const auditResult = FontSizeAudit.audit(artifacts);
    assert.equal(auditResult.rawValue, false);
    assert.ok(auditResult.explanation.includes('missing viewport'));
  });

  it('fails when less than 60% of text is legible', () => {
    const artifacts = {
      URL,
      Viewport: validViewport,
      FontSize: {
        totalTextLength: 100,
        visitedTextLength: 100,
        failingTextLength: 41,
        analyzedFailingTextLength: 41,
        analyzedFailingNodesData: [
          {textLength: 10, fontSize: 10, node: {nodeId: 1, localName: 'p', attributes: []}},
          {textLength: 31, fontSize: 11, node: {nodeId: 2, localName: 'p', attributes: []}},
        ],
      },
    };

    const auditResult = FontSizeAudit.audit(artifacts);
    assert.equal(auditResult.rawValue, false);
    assert.ok(auditResult.explanation.includes('41%'));
  });

  it('passes when there is no text', () => {
    const artifacts = {
      URL,
      Viewport: validViewport,
      FontSize: {
        totalTextLength: 0,
        visitedTextLength: 0,
        failingTextLength: 0,
        analyzedFailingTextLength: 0,
        analyzedFailingNodesData: [
          {textLength: 0, fontSize: 11, node: {nodeId: 1, localName: 'p', attributes: []}},
        ],
      },
    };

    const auditResult = FontSizeAudit.audit(artifacts);
    assert.equal(auditResult.rawValue, true);
  });

  it('passes when more than 60% of text is legible', () => {
    const artifacts = {
      URL,
      Viewport: validViewport,
      FontSize: {
        totalTextLength: 330,
        visitedTextLength: 330,
        failingTextLength: 33,
        analyzedFailingTextLength: 33,
        analyzedFailingNodesData: [
          {textLength: 11, fontSize: 10, node: {nodeId: 1, localName: 'p', attributes: []}},
          {textLength: 22, fontSize: 11, node: {nodeId: 2, localName: 'p', attributes: []}},
        ],
      },
    };
    const auditResult = FontSizeAudit.audit(artifacts);
    assert.equal(auditResult.rawValue, true);
  });

  it('groups entries with same source, sorts them by coverage', () => {
    const style1 = {
      styleSheetId: 1,
      type: 'Regular',
      range: {
        startLine: 123,
        startColumn: 10,
      },
    };
    const style2 = {
      styleSheetId: 1,
      type: 'Regular',
      range: {
        startLine: 0,
        startColumn: 10,
      },
    };
    const artifacts = {
      URL,
      Viewport: validViewport,
      FontSize: {
        totalTextLength: 7,
        visitedTextLength: 7,
        failingTextLength: 7,
        analyzedFailingTextLength: 7,
        analyzedFailingNodesData: [
          {textLength: 3, fontSize: 11, node: {nodeId: 1}, cssRule: style1},
          {textLength: 2, fontSize: 10, node: {nodeId: 2}, cssRule: style2},
          {textLength: 2, fontSize: 10, node: {nodeId: 3}, cssRule: style2},
        ],
      },
    };
    const auditResult = FontSizeAudit.audit(artifacts);

    assert.equal(auditResult.rawValue, false);
    assert.equal(auditResult.details.items.length, 2);
    assert.equal(auditResult.details.items[0].coverage, '57.14%');
  });

  it('adds a category for failing text that wasn\'t analyzed', () => {
    const artifacts = {
      URL,
      Viewport: validViewport,
      FontSize: {
        totalTextLength: 100,
        visitedTextLength: 100,
        failingTextLength: 50,
        analyzedFailingTextLength: 10,
        analyzedFailingNodesData: [
          {textLength: 10, fontSize: 10, node: {nodeId: 1, localName: 'p', attributes: []}},
        ],
      },
    };
    const auditResult = FontSizeAudit.audit(artifacts);
    assert.equal(auditResult.rawValue, false);
    assert.equal(auditResult.details.items.length, 3);
    assert.equal(auditResult.details.items[1].source, 'Add\'l illegible text');
    assert.equal(auditResult.details.items[1].coverage, '40.00%');
  });

  it('informs user if audit haven\'t covered all text on the page', () => {
    const artifacts = {
      URL,
      Viewport: validViewport,
      FontSize: {
        totalTextLength: 100,
        visitedTextLength: 50,
        failingTextLength: 50,
        analyzedFailingTextLength: 50,
        analyzedFailingNodesData: [
          {textLength: 50, fontSize: 10, node: {nodeId: 1, localName: 'p', attributes: []}},
        ],
      },
    };
    const auditResult = FontSizeAudit.audit(artifacts);
    assert.equal(auditResult.rawValue, false);
    assert.ok(auditResult.explanation.includes('50%'));
  });
});
