/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const lighthouse = require('../../../lighthouse-core/index');
const RawProtocol = require('../../../lighthouse-core/gather/connections/raw');
const Config = require('../../../lighthouse-core/config/config');
const defaultConfig = require('../../../lighthouse-core/config/default-config.js');
const i18n = require('../../../lighthouse-core/lib/i18n/i18n.js');
const log = require('lighthouse-logger');

/** @typedef {import('../../../lighthouse-core/gather/connections/connection.js')} Connection */

/**
 * Return a version of the default config, filtered to only run the specified
 * categories.
 * @param {Array<string>} categoryIDs
 * @return {LH.Config.Json}
 */
function getDefaultConfigForCategories(categoryIDs) {
  return {
    extends: 'lighthouse:default',
    settings: {
      onlyCategories: categoryIDs,
    },
  };
}

/**
 * @param {RawProtocol.Port} port
 * @param {string} url
 * @param {LH.Flags} flags Lighthouse flags.
 * @param {Array<string>} categoryIDs Name values of categories to include.
 * @return {Promise<LH.RunnerResult|void>}
 */
function runLighthouseInWorker(port, url, flags, categoryIDs) {
  // Default to 'info' logging level.
  flags.logLevel = flags.logLevel || 'info';
  const config = getDefaultConfigForCategories(categoryIDs);
  const connection = new RawProtocol(port);

  return lighthouse(url, flags, config, connection);
}

/**
 * Returns list of top-level categories from the default config.
 * @return {Array<{title: string, id: string}>}
 */
function getDefaultCategories() {
  const categories = Config.getCategories(defaultConfig);
  categories.forEach(cat => cat.title = i18n.getFormatted(cat.title, 'en-US'));
  return categories;
}

/** @param {(status: [string, string, string]) => void} listenCallback */
function listenForStatus(listenCallback) {
  log.events.addListener('status', listenCallback);
}

if (typeof module !== 'undefined' && module.exports) {
  // export for lighthouse-ext-background to require (via browserify).
  module.exports = {
    getDefaultConfigForCategories,
    runLighthouseInWorker,
    getDefaultCategories,
    listenForStatus,
  };
}

if (typeof window !== 'undefined') {
  // Expose on window for devtools, other consumers of file.
  // @ts-ignore
  window.runLighthouseInWorker = runLighthouseInWorker;
  // @ts-ignore
  window.listenForStatus = listenForStatus;
}
