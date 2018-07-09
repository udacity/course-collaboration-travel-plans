/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');

const jsdom = require('jsdom');

const URL = require('../../../../lib/url-shim');
const prepareLabData = require('../../../../report/html/renderer/psi.js');
const Util = require('../../../../report/html/renderer/util.js');
const DOM = require('../../../../report/html/renderer/dom.js');
const CategoryRenderer = require('../../../../report/html/renderer/category-renderer');
const DetailsRenderer = require('../../../../report/html/renderer/details-renderer');
const CriticalRequestChainRenderer =
    require('../../../../report/html/renderer/crc-details-renderer');

const sampleResultsStr = fs.readFileSync(__dirname + '/../../../results/sample_v2.json', 'utf-8');
const sampleResults = JSON.parse(sampleResultsStr)
;
const TEMPLATE_FILE = fs.readFileSync(
  __dirname + '/../../../../report/html/templates.html',
  'utf8'
);

/* eslint-env jest */

describe('DOM', () => {
  let document;
  beforeAll(() => {
    global.URL = URL; // COMPAT: Needed for Node < 10
    global.Util = Util;
    global.DOM = DOM;
    global.CategoryRenderer = CategoryRenderer;
    global.DetailsRenderer = DetailsRenderer;

    // Delayed so that CategoryRenderer is in global scope
    const PerformanceCategoryRenderer =
        require('../../../../report/html/renderer/performance-category-renderer');
    global.PerformanceCategoryRenderer = PerformanceCategoryRenderer;
    global.CriticalRequestChainRenderer = CriticalRequestChainRenderer;

    document = jsdom.jsdom(TEMPLATE_FILE);
  });

  afterAll(() => {
    global.URL = undefined;
    global.Util = undefined;
    global.DOM = undefined;
    global.CategoryRenderer = undefined;
    global.DetailsRenderer = undefined;
    global.PerformanceCategoryRenderer = undefined;
    global.CriticalRequestChainRenderer = undefined;
  });

  describe('psi prepareLabData helpers', () => {
    describe('prepareLabData', () => {
      it('reports expected data', () => {
        const result = prepareLabData(sampleResultsStr, document);
        assert.ok(result.scoreGaugeEl instanceof document.defaultView.Element);
        assert.equal(result.scoreGaugeEl.querySelector('.lh-gauge__wrapper').href, '');
        assert.ok(result.scoreGaugeEl.outerHTML.includes('<style>'), 'score gauge comes with CSS');
        assert.ok(result.scoreGaugeEl.outerHTML.includes('<svg'), 'score gauge comes with SVG');

        assert.ok(result.perfCategoryEl instanceof document.defaultView.Element);
        assert.ok(result.perfCategoryEl.outerHTML.length > 50000, 'perfCategory HTML is populated');
        assert.ok(!result.perfCategoryEl.outerHTML.includes('lh-permalink'),
            'PSI\'s perfCategory HTML doesn\'t include a lh-permalink element');

        assert.equal(typeof result.finalScreenshotDataUri, 'string');
        assert.ok(result.finalScreenshotDataUri.startsWith('data:image/jpeg;base64,'));
      });

      it('throws if there is no perf category', () => {
        const lhrWithoutPerf = JSON.parse(sampleResultsStr);
        delete lhrWithoutPerf.categories.performance;
        const lhrWithoutPerfStr = JSON.stringify(lhrWithoutPerf);

        assert.throws(() => {
          prepareLabData(lhrWithoutPerfStr, document);
        }, /no performance category/i);
      });

      it('throws if there is no category groups', () => {
        const lhrWithoutGroups = JSON.parse(sampleResultsStr);
        delete lhrWithoutGroups.categoryGroups;
        const lhrWithoutGroupsStr = JSON.stringify(lhrWithoutGroups);

        assert.throws(() => {
          prepareLabData(lhrWithoutGroupsStr, document);
        }, /no category groups/i);
      });

      it('includes custom title and description', () => {
        const {perfCategoryEl} = prepareLabData(sampleResultsStr, document);
        const metricsGroupEl = perfCategoryEl.querySelector('.lh-audit-group--metrics');

        // Assume using default locale.
        const titleEl = metricsGroupEl.querySelector('.lh-audit-group__header');
        assert.equal(titleEl.textContent, Util.UIStrings.labDataTitle);

        // Description supports markdown links, so take everything after the last link.
        const descriptionEnd = /[^)]+$/.exec(Util.UIStrings.lsPerformanceCategoryDescription)[0];
        assert.ok(descriptionEnd.length > 6); // If this gets too short, pick a different comparison :)
        const descriptionEl = metricsGroupEl.querySelector('.lh-audit-group__description');
        assert.ok(descriptionEl.textContent.endsWith(descriptionEnd));
      });
    });
  });

  describe('_getFinalScreenshot', () => {
    it('gets a datauri as a string', () => {
      const LHResultJsonString = JSON.stringify(sampleResults);
      const datauri = prepareLabData(LHResultJsonString, document).finalScreenshotDataUri;
      assert.equal(typeof datauri, 'string');
      assert.ok(datauri.startsWith('data:image/jpeg;base64,'));
    });

    it('returns null if there is no final-screenshot audit', () => {
      const clonedResults = JSON.parse(JSON.stringify(sampleResults));
      delete clonedResults.audits['final-screenshot'];
      const LHResultJsonString = JSON.stringify(clonedResults);
      const datauri = prepareLabData(LHResultJsonString, document).finalScreenshotDataUri;
      assert.equal(datauri, null);
    });
  });
});
