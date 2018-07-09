/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest, browser */

const assert = require('assert');
const fs = require('fs');
const jsdom = require('jsdom');
const Util = require('../../../../report/html/renderer/util.js');
const URL = require('../../../../lib/url-shim');
const DOM = require('../../../../report/html/renderer/dom.js');
const DetailsRenderer = require('../../../../report/html/renderer/details-renderer.js');
const CriticalRequestChainRenderer = require(
    '../../../../report/html/renderer/crc-details-renderer.js');
const CategoryRenderer = require('../../../../report/html/renderer/category-renderer.js');
const sampleResultsOrig = require('../../../results/sample_v2.json');

const TEMPLATE_FILE = fs.readFileSync(__dirname +
    '/../../../../report/html/templates.html', 'utf8');

describe('PerfCategoryRenderer', () => {
  let category;
  let renderer;
  let sampleResults;

  beforeAll(() => {
    global.URL = URL;
    global.Util = Util;
    global.CriticalRequestChainRenderer = CriticalRequestChainRenderer;
    global.CategoryRenderer = CategoryRenderer;

    const PerformanceCategoryRenderer =
        require('../../../../report/html/renderer/performance-category-renderer.js');

    const document = jsdom.jsdom(TEMPLATE_FILE);
    const dom = new DOM(document);
    const detailsRenderer = new DetailsRenderer(dom);
    renderer = new PerformanceCategoryRenderer(dom, detailsRenderer);

    sampleResults = Util.prepareReportResult(sampleResultsOrig);
    category = sampleResults.reportCategories.find(cat => cat.id === 'performance');
  });

  afterAll(() => {
    global.URL = undefined;
    global.Util = undefined;
    global.CriticalRequestChainRenderer = undefined;
    global.CategoryRenderer = undefined;
  });

  it('renders the category header', () => {
    const categoryDOM = renderer.render(category, sampleResults.categoryGroups);
    const score = categoryDOM.querySelector('.lh-category-header');
    const value = categoryDOM.querySelector('.lh-category-header  .lh-gauge__percentage');
    const title = score.querySelector('.lh-category-header__title');

    assert.deepEqual(score, score.firstElementChild, 'first child is a score');
    const scoreInDom = Number(value.textContent);
    assert.ok(Number.isInteger(scoreInDom) && scoreInDom > 10, 'category score is rounded');
    assert.equal(title.textContent, category.title, 'title is set');
  });

  it('renders the sections', () => {
    const categoryDOM = renderer.render(category, sampleResults.categoryGroups);
    const sections = categoryDOM.querySelectorAll('.lh-category > .lh-audit-group');
    assert.equal(sections.length, 4);
  });

  it('renders the metrics', () => {
    const categoryDOM = renderer.render(category, sampleResults.categoryGroups);
    const metricsSection = categoryDOM.querySelectorAll('.lh-category > .lh-audit-group')[0];

    const metricAudits = category.auditRefs.filter(audit => audit.group === 'metrics');
    const timelineElements = metricsSection.querySelectorAll('.lh-metric');
    const nontimelineElements = metricsSection.querySelectorAll('.lh-audit');
    assert.equal(timelineElements.length + nontimelineElements.length, metricAudits.length);
  });

  it('renders the failing performance opportunities', () => {
    const categoryDOM = renderer.render(category, sampleResults.categoryGroups);

    const oppAudits = category.auditRefs.filter(audit => audit.group === 'load-opportunities' &&
        audit.result.score !== 1);
    const oppElements = categoryDOM.querySelectorAll('.lh-audit--load-opportunity');
    assert.equal(oppElements.length, oppAudits.length);

    const oppElement = oppElements[0];
    const oppSparklineBarElement = oppElement.querySelector('.lh-sparkline__bar');
    const oppSparklineElement = oppElement.querySelector('.lh-load-opportunity__sparkline');
    const oppTitleElement = oppElement.querySelector('.lh-audit__title');
    const oppWastedElement = oppElement.querySelector('.lh-audit__display-text');
    assert.ok(oppTitleElement.textContent, 'did not render title');
    assert.ok(oppSparklineBarElement.style.width, 'did not set sparkline width');
    assert.ok(oppWastedElement.textContent, 'did not render stats');
    assert.ok(oppSparklineElement.title, 'did not set tooltip on sparkline');
  });

  it('renders performance opportunities with an errorMessage', () => {
    const auditWithError = {
      score: 0,
      group: 'load-opportunities',
      result: {
        score: null, scoreDisplayMode: 'error', errorMessage: 'Yikes!!', title: 'Bug #2',
        description: '',
      },
    };

    const fakeCategory = Object.assign({}, category, {auditRefs: [auditWithError]});
    const categoryDOM = renderer.render(fakeCategory, sampleResults.categoryGroups);
    const tooltipEl = categoryDOM.querySelector('.lh-audit--load-opportunity .tooltip--error');
    assert.ok(tooltipEl, 'did not render error message');
    assert.ok(/Yikes!!/.test(tooltipEl.textContent));
  });

  it('renders performance opportunities\' explanation', () => {
    const auditWithExplanation = {
      score: 0,
      group: 'load-opportunities',
      result: {
        score: 0, scoreDisplayMode: 'numeric',
        rawValue: 100, explanation: 'Yikes!!', title: 'Bug #2', description: '',
      },
    };

    const fakeCategory = Object.assign({}, category, {auditRefs: [auditWithExplanation]});
    const categoryDOM = renderer.render(fakeCategory, sampleResults.categoryGroups);

    const selector = '.lh-audit--load-opportunity .lh-audit-explanation';
    const tooltipEl = categoryDOM.querySelector(selector);
    assert.ok(tooltipEl, 'did not render explanation text');
    assert.ok(/Yikes!!/.test(tooltipEl.textContent));
  });

  it('renders the failing diagnostics', () => {
    const categoryDOM = renderer.render(category, sampleResults.categoryGroups);
    const diagnosticSection = categoryDOM.querySelectorAll('.lh-category > .lh-audit-group')[2];

    const diagnosticAudits = category.auditRefs.filter(audit => audit.group === 'diagnostics' &&
        !Util.showAsPassed(audit.result));
    const diagnosticElements = diagnosticSection.querySelectorAll('.lh-audit');
    assert.equal(diagnosticElements.length, diagnosticAudits.length);
  });

  it('renders the passed audits', () => {
    const categoryDOM = renderer.render(category, sampleResults.categoryGroups);
    const passedSection = categoryDOM.querySelector('.lh-category > .lh-passed-audits');

    const passedAudits = category.auditRefs.filter(audit =>
        audit.group && audit.group !== 'metrics' && Util.showAsPassed(audit.result));
    const passedElements = passedSection.querySelectorAll('.lh-audit');
    assert.equal(passedElements.length, passedAudits.length);
  });

  // Unsupported by perf cat renderer right now.
  it.skip('renders any manual audits', () => {
  });

  describe('getWastedMs', () => {
    it('handles erroring opportunities', () => {
      const auditWithDebug = {
        score: 0,
        group: 'load-opportunities',
        result: {
          error: true, score: 0,
          rawValue: 100, explanation: 'Yikes!!', title: 'Bug #2',
        },
      };
      const wastedMs = renderer._getWastedMs(auditWithDebug);
      assert.ok(Number.isFinite(wastedMs), 'Finite number not returned by wastedMs');
    });
  });
});
