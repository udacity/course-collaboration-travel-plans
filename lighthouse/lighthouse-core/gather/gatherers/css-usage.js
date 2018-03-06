/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer');

/**
 * @fileoverview Tracks unused CSS rules.
 */
class CSSUsage extends Gatherer {
  afterPass(options) {
    const driver = options.driver;

    const stylesheets = [];
    const onStylesheetAdded = sheet => stylesheets.push(sheet);
    driver.on('CSS.styleSheetAdded', onStylesheetAdded);

    return driver
      .sendCommand('DOM.enable')
      .then(_ => driver.sendCommand('CSS.enable'))
      .then(_ => driver.sendCommand('CSS.startRuleUsageTracking'))
      .then(_ => driver.evaluateAsync('getComputedStyle(document.body)'))
      .then(_ => {
        driver.off('CSS.styleSheetAdded', onStylesheetAdded);
        const promises = stylesheets.map(sheet => {
          const styleSheetId = sheet.header.styleSheetId;
          return driver.sendCommand('CSS.getStyleSheetText', {styleSheetId}).then(content => {
            sheet.content = content.text;
          });
        });

        return Promise.all(promises);
      })
      .then(_ => driver.sendCommand('CSS.stopRuleUsageTracking'))
      .then(results => {
        return driver
          .sendCommand('CSS.disable')
          .then(_ => driver.sendCommand('DOM.disable'))
          .then(_ => {
            const dedupedStylesheets = new Map(stylesheets.map(sheet => [sheet.content, sheet]));
            return {rules: results.ruleUsage, stylesheets: Array.from(dedupedStylesheets.values())};
          });
      });
  }
}

module.exports = CSSUsage;
