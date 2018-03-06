/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const jsdom = require('jsdom');
const ReportGeneratorV2 = require('../../../report/v2/report-generator.js');
const TEMPLATES_FILE = fs.readFileSync(__dirname + '/../../../report/v2/templates.html', 'utf8');

/* eslint-env mocha */

describe('ReportGeneratorV2', () => {
  describe('#replaceStrings', () => {
    it('should replace all occurrences', () => {
      const source = '%foo! %foo %bar!';
      const result = ReportGeneratorV2.replaceStrings(source, [
        {search: '%foo', replacement: 'hey'},
        {search: '%bar', replacement: 'you'},
      ]);

      assert.equal(result, 'hey! hey you!');
    });

    it('should not replace serial occurences', () => {
      const result = ReportGeneratorV2.replaceStrings('%1', [
        {search: '%1', replacement: '%2'},
        {search: '%2', replacement: 'pwnd'},
      ]);

      assert.equal(result, '%2');
    });
  });

  describe('#generateHtmlReport', () => {
    it('should return html', () => {
      const result = new ReportGeneratorV2().generateReportHtml({});
      assert.ok(result.includes('doctype html'), 'includes doctype');
      assert.ok(result.trim().match(/<\/html>$/), 'ends with HTML tag');
    });

    it('should inject the report JSON', () => {
      const code = 'hax\u2028hax</script><script>console.log("pwned");%%LIGHTHOUSE_JAVASCRIPT%%';
      const result = new ReportGeneratorV2().generateReportHtml({code});
      assert.ok(result.includes('"code":"hax\\u2028'), 'injects the json');
      assert.ok(result.includes('hax\\u003c/script'), 'escapes HTML tags');
      assert.ok(result.includes('LIGHTHOUSE_JAVASCRIPT'), 'cannot be tricked');
    });

    it('should inject the report templates', () => {
      const page = jsdom.jsdom(new ReportGeneratorV2().generateReportHtml({}));
      const templates = jsdom.jsdom(TEMPLATES_FILE);
      assert.equal(page.querySelectorAll('template[id^="tmpl-"]').length,
          templates.querySelectorAll('template[id^="tmpl-"]').length, 'all templates injected');
    });

    it('should inject the report CSS', () => {
      const result = new ReportGeneratorV2().generateReportHtml({});
      assert.ok(!result.includes('/*%%LIGHTHOUSE_CSS%%*/'));
      assert.ok(result.includes('--pass-color'));
    });

    it('should inject the report renderer javascript', () => {
      const result = new ReportGeneratorV2().generateReportHtml({});
      assert.ok(result.includes('ReportRenderer'), 'injects the script');
      assert.ok(result.includes('robustness: \\u003c/script'), 'escapes HTML tags in javascript');
      assert.ok(result.includes('pre$`post'), 'does not break from String.replace');
      assert.ok(result.includes('LIGHTHOUSE_JSON'), 'cannot be tricked');
    });
  });
});
