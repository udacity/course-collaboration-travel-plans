/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
 * @fileoverview Gathers a list of detected JS libraries and their versions.
 */

/* global window */
/* global d41d8cd98f00b204e9800998ecf8427e_LibraryDetectorTests */

'use strict';

const Gatherer = require('../gatherer');
const fs = require('fs');
const libDetectorSource = fs.readFileSync(
  require.resolve('js-library-detector/library/libraries.js'), 'utf8');

/**
 * Obtains a list of detected JS libraries and their versions.
 * @return {!Array<!{name: string, version: string, npmPkgName: string}>}
 */
/* istanbul ignore next */
/* eslint-disable camelcase */
function detectLibraries() {
  const libraries = [];

  // d41d8cd98f00b204e9800998ecf8427e_ is a consistent prefix used by the detect libraries
  // see https://github.com/HTTPArchive/httparchive/issues/77#issuecomment-291320900
  Object.entries(d41d8cd98f00b204e9800998ecf8427e_LibraryDetectorTests).forEach(([name, lib]) => {
    try {
      const result = lib.test(window);
      if (result) {
        libraries.push({
          name: name,
          version: result.version,
          npmPkgName: lib.npm,
        });
      }
    } catch (e) {}
  });

  return libraries;
}
/* eslint-enable camelcase */

class JSLibraries extends Gatherer {
  /**
   * @param {!Object} options
   * @return {!Promise<!Array<!Object>>}
   */
  afterPass(options) {
    const expression = `(function () {
      ${libDetectorSource};
      return (${detectLibraries.toString()}());
    })()`;

    return options.driver.evaluateAsync(expression);
  }
}

module.exports = JSLibraries;
