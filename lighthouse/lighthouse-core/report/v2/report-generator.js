/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');

const REPORT_TEMPLATE = fs.readFileSync(__dirname + '/report-template.html', 'utf8');
const REPORT_JAVASCRIPT = [
  fs.readFileSync(__dirname + '/renderer/util.js', 'utf8'),
  fs.readFileSync(__dirname + '/renderer/dom.js', 'utf8'),
  fs.readFileSync(__dirname + '/renderer/details-renderer.js', 'utf8'),
  fs.readFileSync(__dirname + '/renderer/crc-details-renderer.js', 'utf8'),
  fs.readFileSync(__dirname + '/../../lib/file-namer.js', 'utf8'),
  fs.readFileSync(__dirname + '/renderer/logger.js', 'utf8'),
  fs.readFileSync(__dirname + '/renderer/report-ui-features.js', 'utf8'),
  fs.readFileSync(__dirname + '/renderer/category-renderer.js', 'utf8'),
  fs.readFileSync(__dirname + '/renderer/performance-category-renderer.js', 'utf8'),
  fs.readFileSync(__dirname + '/renderer/report-renderer.js', 'utf8'),
].join(';\n');
const REPORT_CSS = fs.readFileSync(__dirname + '/report-styles.css', 'utf8');
const REPORT_TEMPLATES = fs.readFileSync(__dirname + '/templates.html', 'utf8');

class ReportGeneratorV2 {
  /**
   * @return {string}
   */
  static get reportJs() {
    return REPORT_JAVASCRIPT;
  }

  /**
   * @return {string}
   */
  static get reportCss() {
    return REPORT_CSS;
  }

  /**
   * @return {string}
   */
  static get reportTemplates() {
    return REPORT_TEMPLATES;
  }


  /**
   * Replaces all the specified strings in source without serial replacements.
   * @param {string} source
   * @param {!Array<{search: string, replacement: string}>} replacements
   * @return {string}
   */
  static replaceStrings(source, replacements) {
    if (replacements.length === 0) {
      return source;
    }

    const firstReplacement = replacements[0];
    const nextReplacements = replacements.slice(1);
    return source
        .split(firstReplacement.search)
        .map(part => ReportGeneratorV2.replaceStrings(part, nextReplacements))
        .join(firstReplacement.replacement);
  }


  /**
   * Returns the report HTML as a string with the report JSON and renderer JS inlined.
   * @param {!Object} reportAsJson
   * @return {string}
   */
  generateReportHtml(reportAsJson) {
    const sanitizedJson = JSON.stringify(reportAsJson)
      .replace(/</g, '\\u003c') // replaces opening script tags
      .replace(/\u2028/g, '\\u2028') // replaces line separators ()
      .replace(/\u2029/g, '\\u2029'); // replaces paragraph separators
    const sanitizedJavascript = REPORT_JAVASCRIPT.replace(/<\//g, '\\u003c/');

    return ReportGeneratorV2.replaceStrings(REPORT_TEMPLATE, [
      {search: '%%LIGHTHOUSE_JSON%%', replacement: sanitizedJson},
      {search: '%%LIGHTHOUSE_JAVASCRIPT%%', replacement: sanitizedJavascript},
      {search: '/*%%LIGHTHOUSE_CSS%%*/', replacement: REPORT_CSS},
      {search: '%%LIGHTHOUSE_TEMPLATES%%', replacement: REPORT_TEMPLATES},
    ]);
  }
}

module.exports = ReportGeneratorV2;
