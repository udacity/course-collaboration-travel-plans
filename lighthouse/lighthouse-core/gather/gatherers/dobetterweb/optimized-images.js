/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

/**
  * @fileoverview Determines optimized jpeg/webp filesizes for all same-origin and dataURI images by
  *   running the images through canvas in the browser context.
  */
'use strict';

const Gatherer = require('../gatherer');
const URL = require('../../../lib/url-shim');
const NetworkRequest = require('../../../lib/network-request');
const Sentry = require('../../../lib/sentry');
const Driver = require('../../driver.js'); // eslint-disable-line no-unused-vars

const JPEG_QUALITY = 0.92;
const WEBP_QUALITY = 0.85;

const MINIMUM_IMAGE_SIZE = 4096; // savings of <4 KB will be ignored in the audit anyway

const IMAGE_REGEX = /^image\/((x|ms|x-ms)-)?(png|bmp|jpeg)$/;

/** @typedef {{isSameOrigin: boolean, isBase64DataUri: boolean, requestId: string, url: string, mimeType: string, resourceSize: number}} SimplifiedNetworkRecord */

/* global document, Image, atob */

/**
 * Runs in the context of the browser
 * @param {string} url
 * @return {Promise<{jpeg: {base64: number, binary: number}, webp: {base64: number, binary: number}}>}
 */
/* istanbul ignore next */
function getOptimizedNumBytes(url) {
  return new Promise(function(resolve, reject) {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      return reject(new Error('unable to create canvas context'));
    }

    /**
     * @param {'image/jpeg'|'image/webp'} type
     * @param {number} quality
     * @return {{base64: number, binary: number}}
     */
    function getTypeStats(type, quality) {
      const dataURI = canvas.toDataURL(type, quality);
      const base64 = dataURI.slice(dataURI.indexOf(',') + 1);
      return {base64: base64.length, binary: atob(base64).length};
    }

    img.addEventListener('error', reject);
    img.addEventListener('load', () => {
      try {
        canvas.height = img.height;
        canvas.width = img.width;
        context.drawImage(img, 0, 0);

        const jpeg = getTypeStats('image/jpeg', 0.92);
        const webp = getTypeStats('image/webp', 0.85);

        resolve({jpeg, webp});
      } catch (err) {
        reject(err);
      }
    }, false);

    img.src = url;
  });
}

class OptimizedImages extends Gatherer {
  /**
   * @param {string} pageUrl
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @return {Array<SimplifiedNetworkRecord>}
   */
  static filterImageRequests(pageUrl, networkRecords) {
    /** @type {Set<string>} */
    const seenUrls = new Set();
    return networkRecords.reduce((prev, record) => {
      if (seenUrls.has(record.url) || !record.finished) {
        return prev;
      }

      seenUrls.add(record.url);
      const isOptimizableImage = record.resourceType === NetworkRequest.TYPES.Image &&
        IMAGE_REGEX.test(record.mimeType);
      const isSameOrigin = URL.originsMatch(pageUrl, record.url);
      const isBase64DataUri = /^data:.{2,40}base64\s*,/.test(record.url);

      const actualResourceSize = Math.min(record.resourceSize || 0, record.transferSize || 0);
      if (isOptimizableImage && actualResourceSize > MINIMUM_IMAGE_SIZE) {
        prev.push({
          isSameOrigin,
          isBase64DataUri,
          requestId: record.requestId,
          url: record.url,
          mimeType: record.mimeType,
          resourceSize: actualResourceSize,
        });
      }

      return prev;
    }, /** @type {Array<SimplifiedNetworkRecord>} */ ([]));
  }

  /**
   * @param {Driver} driver
   * @param {string} requestId
   * @param {'jpeg'|'webp'} encoding Either webp or jpeg.
   * @return {Promise<LH.Crdp.Audits.GetEncodedResponseResponse>}
   */
  _getEncodedResponse(driver, requestId, encoding) {
    requestId = NetworkRequest.getRequestIdForBackend(requestId);

    const quality = encoding === 'jpeg' ? JPEG_QUALITY : WEBP_QUALITY;
    const params = {requestId, encoding, quality, sizeOnly: true};
    return driver.sendCommand('Audits.getEncodedResponse', params);
  }

  /**
   * @param {Driver} driver
   * @param {SimplifiedNetworkRecord} networkRecord
   * @return {Promise<?{fromProtocol: boolean, originalSize: number, jpegSize: number, webpSize: number}>}
   */
  calculateImageStats(driver, networkRecord) {
    // TODO(phulce): remove this dance of trying _getEncodedResponse with a fallback when Audits
    // domain hits stable in Chrome 62
    return Promise.resolve(networkRecord.requestId).then(requestId => {
      if (this._getEncodedResponseUnsupported) return;
      return this._getEncodedResponse(driver, requestId, 'jpeg').then(jpegData => {
        return this._getEncodedResponse(driver, requestId, 'webp').then(webpData => {
          return {
            fromProtocol: true,
            originalSize: networkRecord.resourceSize,
            jpegSize: jpegData.encodedSize,
            webpSize: webpData.encodedSize,
          };
        });
      }).catch(err => {
        if (/wasn't found/.test(err.message)) {
          // Mark non-support so we don't keep attempting the protocol method over and over
          this._getEncodedResponseUnsupported = true;
        } else {
          throw err;
        }
      });
    }).then(result => {
      if (result) return result;

      // Take the slower fallback path if getEncodedResponse isn't available yet
      // CORS canvas tainting doesn't support cross-origin images, so skip them early
      if (!networkRecord.isSameOrigin && !networkRecord.isBase64DataUri) return null;

      const script = `(${getOptimizedNumBytes.toString()})(${JSON.stringify(networkRecord.url)})`;
      return driver.evaluateAsync(script).then(stats => {
        if (!stats) return null;
        const isBase64DataUri = networkRecord.isBase64DataUri;
        const base64Length = networkRecord.url.length - networkRecord.url.indexOf(',') - 1;
        return {
          fromProtocol: false,
          originalSize: isBase64DataUri ? base64Length : networkRecord.resourceSize,
          jpegSize: isBase64DataUri ? stats.jpeg.base64 : stats.jpeg.binary,
          webpSize: isBase64DataUri ? stats.webp.base64 : stats.webp.binary,
        };
      });
    });
  }

  /**
   * @param {Driver} driver
   * @param {Array<SimplifiedNetworkRecord>} imageRecords
   * @return {Promise<LH.Artifacts['OptimizedImages']>}
   */
  async computeOptimizedImages(driver, imageRecords) {
    /** @type {LH.Artifacts['OptimizedImages']} */
    const results = [];

    for (const record of imageRecords) {
      try {
        const stats = await this.calculateImageStats(driver, record);
        if (stats === null) {
          continue;
        }

        /** @type {LH.Artifacts.OptimizedImage} */
        const image = {failed: false, ...stats, ...record};
        results.push(image);
      } catch (err) {
        // Track this with Sentry since these errors aren't surfaced anywhere else, but we don't
        // want to tank the entire run due to a single image.
        Sentry.captureException(err, {
          tags: {gatherer: 'OptimizedImages'},
          extra: {imageUrl: URL.elideDataURI(record.url)},
          level: 'warning',
        });

        /** @type {LH.Artifacts.OptimizedImageError} */
        const imageError = {failed: true, errMsg: err.message, ...record};
        results.push(imageError);
      }
    }

    return results;
  }

  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @return {Promise<LH.Artifacts['OptimizedImages']>}
   */
  afterPass(passContext, loadData) {
    const networkRecords = loadData.networkRecords;
    const imageRecords = OptimizedImages.filterImageRequests(passContext.url, networkRecords);

    return Promise.resolve()
      .then(_ => this.computeOptimizedImages(passContext.driver, imageRecords))
      .then(results => {
        const successfulResults = results.filter(result => !result.failed);
        if (results.length && !successfulResults.length) {
          throw new Error('All image optimizations failed');
        }

        return results;
      });
  }
}

module.exports = OptimizedImages;
