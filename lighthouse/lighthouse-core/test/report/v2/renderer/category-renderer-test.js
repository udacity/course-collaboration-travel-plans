/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha, browser */

const assert = require('assert');
const fs = require('fs');
const jsdom = require('jsdom');
const Util = require('../../../../report/v2/renderer/util.js');
const URL = require('../../../../lib/url-shim');
const DOM = require('../../../../report/v2/renderer/dom.js');
const DetailsRenderer = require('../../../../report/v2/renderer/details-renderer.js');
const CriticalRequestChainRenderer = require(
    '../../../../report/v2/renderer/crc-details-renderer.js');
const CategoryRenderer = require('../../../../report/v2/renderer/category-renderer.js');
const sampleResults = require('../../../results/sample_v2.json');

const TEMPLATE_FILE = fs.readFileSync(__dirname + '/../../../../report/v2/templates.html', 'utf8');

describe('CategoryRenderer', () => {
  let renderer;

  before(() => {
    global.URL = URL;
    global.Util = Util;
    global.CriticalRequestChainRenderer = CriticalRequestChainRenderer;

    const document = jsdom.jsdom(TEMPLATE_FILE);
    const dom = new DOM(document);
    const detailsRenderer = new DetailsRenderer(dom);
    renderer = new CategoryRenderer(dom, detailsRenderer);
  });

  after(() => {
    global.URL = undefined;
    global.Util = undefined;
    global.CriticalRequestChainRenderer = undefined;
  });

  it('renders an audit', () => {
    const audit = sampleResults.reportCategories[0].audits[0];
    const auditDOM = renderer.renderAudit(audit);

    const title = auditDOM.querySelector('.lh-score__title');
    const description = auditDOM.querySelector('.lh-score__description');
    const score = auditDOM.querySelector('.lh-score__value');

    assert.equal(title.textContent, audit.result.description);
    assert.ok(description.querySelector('a'), 'audit help text contains coverted markdown links');
    assert.equal(score.textContent, '0');
    assert.ok(score.classList.contains('lh-score__value--fail'));
    assert.ok(score.classList.contains(`lh-score__value--${audit.result.scoringMode}`));
  });

  it('renders an audit debug str when appropriate', () => {
    const audit1 = renderer.renderAudit({
      scoringMode: 'binary', score: 0,
      result: {helpText: 'help text', debugString: 'Debug string', description: 'Audit title'},
    });
    assert.ok(audit1.querySelector('.lh-debug'));

    const audit2 = renderer.renderAudit({
      scoringMode: 'binary', score: 0, result: {helpText: 'help text', description: 'Audit title'},
    });
    assert.ok(!audit2.querySelector('.lh-debug'));
  });

  it('renders an informative audit', () => {
    const auditDOM = renderer.renderAudit({
      id: 'informative', score: 0,
      result: {description: 'It informs', helpText: 'help text', informative: true},
    });

    assert.ok(auditDOM.querySelector('.lh-score--informative'));
  });

  it('renders a category', () => {
    const category = sampleResults.reportCategories[0];
    const categoryDOM = renderer.render(category, sampleResults.reportGroups);

    const score = categoryDOM.querySelector('.lh-score');
    const value = categoryDOM.querySelector('.lh-score  > .lh-score__value');
    const title = score.querySelector('.lh-score__title');
    const description = score.querySelector('.lh-score__description');

    assert.deepEqual(score, score.firstElementChild, 'first child is a score');
    assert.ok(value.classList.contains('lh-score__value--numeric'),
              'category score is numeric');
    assert.equal(value.textContent, Math.round(category.score), 'category score is rounded');
    assert.equal(title.textContent, category.name, 'title is set');
    assert.ok(description.querySelector('a'), 'description contains converted markdown links');

    const audits = categoryDOM.querySelectorAll('.lh-audit');
    assert.equal(audits.length, category.audits.length, 'renders correct number of audits');
  });

  it('renders audits with debugString as failed', () => {
    const auditResult = {
      description: 'Audit',
      helpText: 'Learn more',
      debugString: 'It may not have worked!',
      score: 100,
    };
    const audit = {result: auditResult, score: 100};
    const category = {name: 'Fake', description: '', score: 100, audits: [audit]};
    const categoryDOM = renderer.render(category, sampleResults.reportGroups);
    assert.ok(categoryDOM.querySelector(
        '.lh-category > .lh-audit-group:not(.lh-passed-audits) > .lh-audit'),
        'did not render as failed');
    assert.ok(categoryDOM.querySelector('.lh-debug'), 'did not render debug message');
  });

  it('renders manual audits if the category contains them', () => {
    const pwaCategory = sampleResults.reportCategories.find(cat => cat.id === 'pwa');
    const categoryDOM = renderer.render(pwaCategory, sampleResults.reportGroups);
    assert.ok(categoryDOM.querySelector('.lh-audit-group--manual .lh-audit-group__summary'));
    assert.equal(categoryDOM.querySelectorAll('.lh-score--informative.lh-score--manual').length, 3,
        'score shows informative and dash icon');

    const perfCategory = sampleResults.reportCategories.find(cat => cat.id === 'performance');
    const categoryDOM2 = renderer.render(perfCategory, sampleResults.reportGroups);
    assert.ok(!categoryDOM2.querySelector('.lh-audit-group--manual'));
  });

  it('renders not applicable audits if the category contains them', () => {
    const a11yCategory = sampleResults.reportCategories.find(cat => cat.id === 'accessibility');
    const categoryDOM = renderer.render(a11yCategory, sampleResults.reportGroups);
    assert.ok(categoryDOM.querySelector('.lh-audit-group--notapplicable .lh-audit-group__summary'));
    assert.equal(categoryDOM.querySelectorAll('.lh-score--informative').length, 1,
        'score shows informative and dash icon');

    const perfCategory = sampleResults.reportCategories.find(cat => cat.id === 'performance');
    const categoryDOM2 = renderer.render(perfCategory, sampleResults.reportGroups);
    assert.ok(!categoryDOM2.querySelector('.lh-audit-group--notapplicable'));
  });

  describe('category with groups', () => {
    const category = sampleResults.reportCategories.find(cat => cat.id === 'accessibility');

    it('renders the category header', () => {
      const categoryDOM = renderer.render(category, sampleResults.reportGroups);
      const score = categoryDOM.querySelector('.lh-score');
      const value = categoryDOM.querySelector('.lh-score  > .lh-score__value');
      const title = score.querySelector('.lh-score__title');
      const description = score.querySelector('.lh-score__description');

      assert.deepEqual(score, score.firstElementChild, 'first child is a score');
      assert.ok(value.classList.contains('lh-score__value--numeric'),
                'category score is numeric');
      assert.equal(value.textContent, Math.round(category.score), 'category score is rounded');
      assert.equal(title.textContent, category.name, 'title is set');
      assert.ok(description.querySelector('a'), 'description contains converted markdown links');
    });

    // TODO waiting for decision regarding this header
    xit('renders the failed audits grouped by group', () => {
      const categoryDOM = renderer.render(category, sampleResults.reportGroups);
      const failedAudits = category.audits.filter(audit => {
        return audit.score !== 100 && !audit.result.notApplicable;
      });
      const failedAuditTags = new Set(failedAudits.map(audit => audit.group));

      const failedAuditGroups = categoryDOM.querySelectorAll('.lh-category > div.lh-audit-group');
      assert.equal(failedAuditGroups.length, failedAuditTags.size);
    });

    it('renders the passed audits grouped by group', () => {
      const categoryDOM = renderer.render(category, sampleResults.reportGroups);

      const passedAudits = category.audits.filter(audit => audit.score === 100);
      const passedAuditTags = new Set(passedAudits.map(audit => audit.group));

      const passedAuditGroups = categoryDOM.querySelectorAll('.lh-passed-audits .lh-audit-group');
      assert.equal(passedAuditGroups.length, passedAuditTags.size);
    });

    it('renders all the audits', () => {
      const categoryDOM = renderer.render(category, sampleResults.reportGroups);
      const auditsElements = categoryDOM.querySelectorAll('.lh-audit');
      assert.equal(auditsElements.length, category.audits.length);
    });
  });

  describe('grouping passed/failed/manual', () => {
    it('separates audits in the DOM', () => {
      const category = sampleResults.reportCategories[0];
      const elem = renderer.render(category, sampleResults.reportGroups);
      const passedAudits = elem.querySelectorAll('.lh-passed-audits > .lh-audit');
      const failedAudits = elem.querySelectorAll('.lh-failed-audits > .lh-audit');
      const manualAudits = elem.querySelectorAll('.lh-audit-group--manual .lh-audit');

      assert.equal(passedAudits.length, 4);
      assert.equal(failedAudits.length, 7);
      assert.equal(manualAudits.length, 3);
    });

    it('doesnt create a passed section if there were 0 passed', () => {
      const category = JSON.parse(JSON.stringify(sampleResults.reportCategories[0]));
      category.audits.forEach(audit => audit.score = 0);
      const elem = renderer.render(category, sampleResults.reportGroups);
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
