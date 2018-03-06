/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const RawProtocol = require('../../../lighthouse-core/gather/connections/raw');
const Runner = require('../../../lighthouse-core/runner');
const Config = require('../../../lighthouse-core/config/config');
const defaultConfig = require('../../../lighthouse-core/config/default.js');
const fastConfig = require('../../../lighthouse-core/config/fast-config.js');
const log = require('lighthouse-logger');

/**
 * @param {!Connection} connection
 * @param {string} url
 * @param {!Object} options Lighthouse options.
 * @param {!Array<string>} categoryIDs Name values of categories to include.
 * @return {!Promise}
 */
window.runLighthouseForConnection = function(
    connection, url, options, categoryIDs,
    updateBadgeFn = function() { }) {
  const config = options && options.fastMode ? new Config(fastConfig) : new Config({
    extends: 'lighthouse:default',
    settings: {onlyCategories: categoryIDs},
  });

  // Add url and config to fresh options object.
  const runOptions = Object.assign({}, options, {url, config});
  updateBadgeFn(url);

  return Runner.run(connection, runOptions) // Run Lighthouse.
    .then(result => {
      updateBadgeFn();
      return result;
    })
    .catch(err => {
      updateBadgeFn();
      throw err;
    });
};

/**
 * @param {!RawProtocol.Port} port
 * @param {string} url
 * @param {!Object} options Lighthouse options.
 * @param {!Array<string>} categoryIDs Name values of categories to include.
 * @return {!Promise}
 */
window.runLighthouseInWorker = function(port, url, options, categoryIDs) {
  // Default to 'info' logging level.
  log.setLevel('info');
  const connection = new RawProtocol(port);
  return window.runLighthouseForConnection(connection, url, options, categoryIDs);
};

/**
 * Returns list of top-level categories from the default config.
 * @return {!Array<{name: string, id: string}>}
 */
window.getDefaultCategories = function() {
  return Config.getCategories(defaultConfig);
};

window.listenForStatus = function(listenCallback) {
  log.events.addListener('status', listenCallback);
};
