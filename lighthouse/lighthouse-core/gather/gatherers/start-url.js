/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer');
const manifestParser = require('../../lib/manifest-parser');
const Driver = require('../driver.js'); // eslint-disable-line no-unused-vars

class StartUrl extends Gatherer {
  /**
   * Grab the manifest, extract it's start_url, attempt to `fetch()` it while offline
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Artifacts['StartUrl']>}
   */
  afterPass(passContext) {
    const driver = passContext.driver;
    return driver.goOnline(passContext)
      .then(() => driver.getAppManifest())
      .then(response => driver.goOffline().then(() => response))
      .then(response => response && manifestParser(response.data, response.url, passContext.url))
      .then(manifest => {
        const startUrlInfo = this._readManifestStartUrl(manifest);
        if (startUrlInfo.isReadFailure) {
          return {statusCode: -1, explanation: startUrlInfo.reason};
        }

        return this._attemptManifestFetch(passContext.driver, startUrlInfo.startUrl);
      }).catch(() => {
        return {statusCode: -1, explanation: 'Unable to fetch start URL via service worker'};
      });
  }

  /**
   * Read the parsed manifest and return failure reasons or the startUrl
   * @param {?{value?: {start_url: {value?: string, warning?: string}}, warning?: string}} manifest
   * @return {{isReadFailure: true, reason: string}|{isReadFailure: false, startUrl: string}}
   */
  _readManifestStartUrl(manifest) {
    if (!manifest || !manifest.value) {
      const detailedMsg = manifest && manifest.warning;

      if (detailedMsg) {
        return {isReadFailure: true, reason: `Error fetching web app manifest: ${detailedMsg}`};
      } else {
        return {isReadFailure: true, reason: `No usable web app manifest found on page`};
      }
    }

    // Even if the start URL had an error, the browser will still supply a fallback URL.
    // Therefore, we only set the warning here and continue with the fetch.
    if (manifest.value.start_url.warning) {
      return {isReadFailure: true, reason: manifest.value.start_url.warning};
    }

    // @ts-ignore - TODO(bckenny): should actually be testing value above, not warning
    return {isReadFailure: false, startUrl: manifest.value.start_url.value};
  }

  /**
   * Try to `fetch(start_url)`, return true if fetched by SW
   * Resolves when we have a matched network request
   * @param {Driver} driver
   * @param {string} startUrl
   * @return {Promise<{statusCode: number, explanation: string}>}
   */
  _attemptManifestFetch(driver, startUrl) {
    // Wait up to 3s to get a matched network request from the fetch() to work
    const timeoutPromise = new Promise(resolve =>
      setTimeout(
        () => resolve({statusCode: -1, explanation: 'Timed out waiting for fetched start_url'}),
        3000
      )
    );

    const fetchPromise = new Promise(resolve => {
      driver.on('Network.responseReceived', onResponseReceived);

      /** @param {LH.Crdp.Network.ResponseReceivedEvent} responseEvent */
      function onResponseReceived(responseEvent) {
        const {response} = responseEvent;
        // ignore mismatched URLs
        if (response.url !== startUrl) return;
        driver.off('Network.responseReceived', onResponseReceived);

        if (!response.fromServiceWorker) {
          return resolve({
            statusCode: -1,
            explanation: 'Unable to fetch start URL via service worker',
          });
        }
        // Successful SW-served fetch of the start_URL
        return resolve({statusCode: response.status});
      }
    });

    return driver
      .evaluateAsync(`window.location = '${startUrl}'`)
      .then(() => Promise.race([fetchPromise, timeoutPromise]));
  }
}

module.exports = StartUrl;
