/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
/**
 * @fileoverview Checks to see if the aspect ratio of the images used on
 *   the page are equal to the aspect ratio of their display sizes. The
 *   audit will list all images that don't match with their display size
 *   aspect ratio.
 */
'use strict';

const Audit = require('./audit');

const URL = require('../lib/url-shim');
const THRESHOLD = 0.05;

class ImageAspectRatio extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      name: 'image-aspect-ratio',
      description: 'Displays images with correct aspect ratio',
      failureDescription: 'Displays images with incorrect aspect ratio',
      helpText: 'Image display dimensions should match natural aspect ratio.',
      requiredArtifacts: ['ImageUsage'],
    };
  }

  /**
   * @param {!Object} image
   * @return {?Object}
   */
  static computeAspectRatios(image) {
    const url = URL.elideDataURI(image.src);
    const actualAspectRatio = image.naturalWidth / image.naturalHeight;
    const displayedAspectRatio = image.width / image.height;
    const doRatiosMatch = Math.abs(actualAspectRatio - displayedAspectRatio) < THRESHOLD;

    if (!Number.isFinite(actualAspectRatio) ||
      !Number.isFinite(displayedAspectRatio)) {
      return new Error(`Invalid image sizing information ${url}`);
    }

    return {
      url,
      preview: {
        type: 'thumbnail',
        url: image.networkRecord.url,
        mimeType: image.networkRecord.mimeType,
      },
      displayedAspectRatio: `${image.width} x ${image.height}
        (${displayedAspectRatio.toFixed(2)})`,
      actualAspectRatio: `${image.naturalWidth} x ${image.naturalHeight}
        (${actualAspectRatio.toFixed(2)})`,
      doRatiosMatch,
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const images = artifacts.ImageUsage;

    let debugString;
    const results = [];
    images.filter(image => {
      // - filter out images that don't have following properties:
      //   networkRecord, width, height, images that use `object-fit`: `cover` or `contain`
      // - filter all svgs as they have no natural dimensions to audit
      return image.networkRecord &&
        image.networkRecord.mimeType !== 'image/svg+xml' &&
        image.width &&
        image.height &&
        !image.usesObjectFit;
    }).forEach(image => {
      const processed = ImageAspectRatio.computeAspectRatios(image);
      if (processed instanceof Error) {
        debugString = processed.message;
        return;
      }

      if (!processed.doRatiosMatch) results.push(processed);
    });

    const headings = [
      {key: 'preview', itemType: 'thumbnail', text: ''},
      {key: 'url', itemType: 'url', text: 'URL'},
      {key: 'displayedAspectRatio', itemType: 'text', text: 'Aspect Ratio (Displayed)'},
      {key: 'actualAspectRatio', itemType: 'text', text: 'Aspect Ratio (Actual)'},
    ];

    return {
      rawValue: results.length === 0,
      debugString,
      details: Audit.makeTableDetails(headings, results),
    };
  }
}

module.exports = ImageAspectRatio;
