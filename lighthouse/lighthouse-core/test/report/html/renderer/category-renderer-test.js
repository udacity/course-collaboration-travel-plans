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

describe('CategoryRenderer', () => {
  let renderer;
  let sampleResults;

  beforeAll(() => {
    global.URL = URL;
    global.Util = Util;
    global.CriticalRequestChainRenderer = CriticalRequestChainRenderer;

    const document = jsdom.jsdom(TEMPLATE_FILE);
    const dom = new DOM(document);
    const detailsRenderer = new DetailsRenderer(dom);
    renderer = new CategoryRenderer(dom, detailsRenderer);

    sampleResults = Util.prepareReportResult(sampleResultsOrig);
  });

  afterAll(() => {
    global.URL = undefined;
    global.Util = undefined;
    global.CriticalRequestChainRenderer = undefined;
  });

  it('renders an audit', () => {
    const auditRef = sampleResults.reportCategories
      .find(c => c.id === 'pwa').auditRefs
      .find(a => a.id === 'works-offline');

    const auditDOM = renderer.renderAudit(auditRef);
    assert.equal(auditDOM.nodeType, 1, 'Audit returns an element');

    const title = auditDOM.querySelector('.lh-audit__title');
    const description = auditDOM.querySelector('.lh-audit__description');

    assert.equal(title.textContent, auditRef.result.title);
    assert.ok(description.querySelector('a'), 'audit help text contains coverted markdown links');
    assert.ok(auditDOM.classList.contains('lh-audit--fail'));
    assert.ok(auditDOM.classList.contains(`lh-audit--${auditRef.result.scoreDisplayMode}`));
  });

  it('renders an audit explanation when appropriate', () => {
    const audit1 = renderer.renderAudit({
      scoreDisplayMode: 'binary', score: 0,
      result: {description: 'help text', explanation: 'A reason', title: 'Audit title'},
    });
    assert.ok(audit1.querySelector('.lh-audit-explanation'));

    const audit2 = renderer.renderAudit({
      scoreDisplayMode: 'binary', score: 0,
      result: {description: 'help text', title: 'Audit title'},
    });
    assert.ok(!audit2.querySelector('.lh-audit-explanation'));
  });

  it('renders an informative audit', () => {
    const auditDOM = renderer.renderAudit({
      id: 'informative', score: 0,
      result: {title: 'It informs', description: 'help text', scoreDisplayMode: 'informative'},
    });

    assert.ok(auditDOM.matches('.lh-audit--informative'));
  });

  it('renders audits with a warning', () => {
    const auditResult = {
      title: 'Audit',
      description: 'Learn more',
      warnings: ['It may not have worked!'],
      score: 1,
    };
    const auditDOM = renderer.renderAudit({id: 'foo', score: 1, result: auditResult});
    const warningEl = auditDOM.querySelector('.lh-warnings');
    assert.ok(warningEl, 'did not render warning message');
    assert.ok(warningEl.textContent.includes(auditResult.warnings[0]), 'warning message provided');
  });

  it('renders audits with multiple warnings', () => {
    const auditResult = {
      title: 'Audit',
      description: 'Learn more',
      warnings: ['It may not have worked!', 'You should read this, though'],
      score: 1,
    };
    const auditDOM = renderer.renderAudit({id: 'foo', score: 1, result: auditResult});
    const warningEl = auditDOM.querySelector('.lh-warnings');
    assert.ok(warningEl, 'did not render warning message');
    assert.ok(warningEl.textContent.includes(auditResult.warnings[0]), '1st warning provided');
    assert.ok(warningEl.textContent.includes(auditResult.warnings[1]), '2nd warning provided');
  });

  it('renders a category', () => {
    const category = sampleResults.reportCategories.find(c => c.id === 'pwa');
    const categoryDOM = renderer.render(category, sampleResults.categoryGroups);

    const categoryEl = categoryDOM.querySelector('.lh-category-header');
    const value = categoryDOM.querySelector('.lh-gauge__percentage');
    const title = categoryEl.querySelector('.lh-category-header__title');

    assert.deepEqual(categoryEl, categoryEl.firstElementChild, 'first child is a score');
    const scoreInDom = Number(value.textContent);
    assert.ok(Number.isInteger(scoreInDom) && scoreInDom > 10, 'category score is rounded');
    assert.equal(title.textContent, category.title, 'title is set');

    const audits = categoryDOM.querySelectorAll('.lh-audit');
    assert.equal(audits.length, category.auditRefs.length, 'renders correct number of audits');
  });

  it('handles markdown in category descriptions a category', () => {
    const category = sampleResults.reportCategories.find(c => c.id === 'pwa');
    const prevDesc = category.description;
    category.description += ' [link text](http://example.com).';
    const categoryDOM = renderer.render(category, sampleResults.categoryGroups);
    const description = categoryDOM.querySelector('.lh-category-header__description');
    assert.ok(description.querySelector('a'), 'description contains converted markdown links');
    category.description = prevDesc;
  });

  it('renders manual audits if the category contains them', () => {
    const pwaCategory = sampleResults.reportCategories.find(cat => cat.id === 'pwa');
    const categoryDOM = renderer.render(pwaCategory, sampleResults.categoryGroups);
    assert.ok(categoryDOM.querySelector('.lh-audit-group--manual .lh-audit-group__summary'));
    assert.equal(categoryDOM.querySelectorAll('.lh-audit--manual').length, 3,
        'score shows informative and dash icon');
  });

  it('renders not applicable audits if the category contains them', () => {
    const a11yCategory = sampleResults.reportCategories.find(cat => cat.id === 'accessibility');
    const categoryDOM = renderer.render(a11yCategory, sampleResults.categoryGroups);
    assert.ok(categoryDOM.querySelector(
        '.lh-audit-group--not-applicable .lh-audit-group__summary'));

    const notApplicableCount = a11yCategory.auditRefs.reduce((sum, audit) =>
        sum += audit.result.scoreDisplayMode === 'not-applicable' ? 1 : 0, 0);
    assert.equal(
      categoryDOM.querySelectorAll('.lh-audit-group--not-applicable .lh-audit').length,
      notApplicableCount,
      'score shows informative and dash icon'
    );

    const bestPracticeCat = sampleResults.reportCategories.find(cat => cat.id === 'best-practices');
    const categoryDOM2 = renderer.render(bestPracticeCat, sampleResults.categoryGroups);
    assert.ok(!categoryDOM2.querySelector('.lh-audit-group--not-applicable'));
  });

  describe('category with groups', () => {
    let category;

    beforeEach(() => {
      category = sampleResults.reportCategories.find(cat => cat.id === 'accessibility');
    });

    it('renders the category header', () => {
      const categoryDOM = renderer.render(category, sampleResults.categoryGroups);

      const gauge = categoryDOM.querySelector('.lh-gauge__percentage');
      assert.equal(gauge.textContent.trim(), '35', 'score is 0-100');

      const score = categoryDOM.querySelector('.lh-category-header');
      const value = categoryDOM.querySelector('.lh-gauge__percentage');
      const title = score.querySelector('.lh-category-header__title');
      const description = score.querySelector('.lh-category-header__description');

      assert.deepEqual(score, score.firstElementChild, 'first child is a score');
      const scoreInDom = Number(value.textContent);
      assert.ok(Number.isInteger(scoreInDom) && scoreInDom > 10, 'score is rounded out of 100');
      assert.equal(title.textContent, category.title, 'title is set');
      assert.ok(description.querySelector('a'), 'description contains converted markdown links');
    });

    // TODO waiting for decision regarding this header
    it.skip('renders the failed audits grouped by group', () => {
      const categoryDOM = renderer.render(category, sampleResults.categoryGroups);
      const failedAudits = category.auditRefs.filter(audit => {
        return audit.result.score !== 1 && !audit.result.scoreDisplayMode === 'not-applicable';
      });
      const failedAuditTags = new Set(failedAudits.map(audit => audit.group));

      const failedAuditGroups = categoryDOM.querySelectorAll('.lh-category > div.lh-audit-group');
      assert.equal(failedAuditGroups.length, failedAuditTags.size);
    });

    it('renders the passed audits grouped by group', () => {
      const categoryDOM = renderer.render(category, sampleResults.categoryGroups);
      const passedAudits = category.auditRefs.filter(audit =>
          audit.result.scoreDisplayMode !== 'not-applicable' && audit.result.score === 1);
      const passedAuditTags = new Set(passedAudits.map(audit => audit.group));

      const passedAuditGroups = categoryDOM.querySelectorAll('.lh-passed-audits .lh-audit-group');
      assert.equal(passedAuditGroups.length, passedAuditTags.size);
    });

    it('renders all the audits', () => {
      const categoryDOM = renderer.render(category, sampleResults.categoryGroups);
      const auditsElements = categoryDOM.querySelectorAll('.lh-audit');
      assert.equal(auditsElements.length, category.auditRefs.length);
    });
  });

  describe('grouping passed/failed/manual', () => {
    it('separates audits in the DOM', () => {
      const category = sampleResults.reportCategories.find(c => c.id === 'pwa');
      const elem = renderer.render(category, sampleResults.categoryGroups);
      const passedAudits = elem.querySelectorAll('.lh-passed-audits .lh-audit');
      const failedAudits = elem.querySelectorAll('.lh-failed-audits .lh-audit');
      const manualAudits = elem.querySelectorAll('.lh-audit-group--manual .lh-audit');

      assert.equal(passedAudits.length, 4);
      assert.equal(failedAudits.length, 7);
      assert.equal(manualAudits.length, 3);
    });

    it('doesnt create a passed section if there were 0 passed', () => {
      const origCategory = sampleResults.reportCategories.find(c => c.id === 'pwa');
      const category = JSON.parse(JSON.stringify(origCategory));
      category.auditRefs.forEach(audit => audit.result.score = 0);
      const elem = renderer.render(category, sampleResults.categoryGroups);
      const passedAudits = elem.querySelectorAll('.lh-passed-audits > .lh-audit');
      const failedAudits = elem.querySelectorAll('.lh-failed-audits > .lh-audit');

      assert.equal(passedAudits.length, 0);
      assert.equal(failedAudits.length, 11);

      assert.equal(elem.querySelector('.lh-passed-audits-summary'), null);
    });
  });

  it('can set a custom templateContext', () => {
    assert.equal(renderer.templateContext, renderer.dom.document());

    const otherDocument = jsdom.jsdom(TEMPLATE_FILE);
    renderer.setTemplateContext(otherDocument);
    assert.equal(renderer.templateContext, otherDocument);
  });
});
