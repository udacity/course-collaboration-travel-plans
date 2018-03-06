/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer');
const manifestParser = require('../../lib/manifest-parser');
const BOM_LENGTH = 3;
const BOM_FIRSTCHAR = 65279;

/**
 * Uses the debugger protocol to fetch the manifest from within the context of
 * the target page, reusing any credentials, emulation, etc, already established
 * there. The artifact produced is the fetched string, if any, passed through
 * the manifest parser.
 */
class Manifest extends Gatherer {
  /**
   * Returns the parsed manifest or null if the page had no manifest. If the manifest
   * was unparseable as JSON, manifest.value will be undefined and manifest.debugString
   * will have the reason. See manifest-parser.js for more information.
   * @param {!Object} options
   * @return {!Promise<?Manifest>}
   */
  afterPass(options) {
    const manifestPromise = options.driver.getAppManifest();
    const timeoutPromise = new Promise(resolve => setTimeout(resolve, 3000));
    return Promise.race([manifestPromise, timeoutPromise])
      .then(response => {
        if (!response) {
          return null;
        }

        const isBomEncoded = response.data.charCodeAt(0) === BOM_FIRSTCHAR;
        if (isBomEncoded) {
          response.data = Buffer.from(response.data).slice(BOM_LENGTH).toString();
        }

        return manifestParser(response.data, response.url, options.url);
      });
  }
}

module.exports = Manifest;
