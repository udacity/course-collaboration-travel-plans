/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const Util = require('../report/v2/renderer/util');
const WebInspector = require('../lib/web-inspector');
const allowedFontFaceDisplays = ['block', 'fallback', 'optional', 'swap'];

class FontDisplay extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      name: 'font-display',
      description: 'All text remains visible during webfont loads',
      failureDescription: 'Avoid invisible text while webfonts are loading',
      helpText: 'Leverage the font-display CSS feature to ensure text is user-visible while ' +
        'webfonts are loading. ' +
        '[Learn more](https://developers.google.com/web/updates/2016/02/font-display).',
      requiredArtifacts: ['devtoolsLogs', 'Fonts'],
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const devtoolsLogs = artifacts.devtoolsLogs[this.DEFAULT_PASS];
    const fontFaces = artifacts.Fonts;

    // Filter font-faces that do not have a display tag with optional or swap
    const fontsWithoutProperDisplay = fontFaces.filter(fontFace =>
      !fontFace.display || !allowedFontFaceDisplays.includes(fontFace.display)
    );

    return artifacts.requestNetworkRecords(devtoolsLogs).then((networkRecords) => {
      const results = networkRecords.filter(record => {
        const isFont = record._resourceType === WebInspector.resourceTypes.Font;

        return isFont;
      })
        .filter(fontRecord => {
          // find the fontRecord of a font
          return !!fontsWithoutProperDisplay.find(fontFace => {
            return fontFace.src.find(src => fontRecord.url === src);
          });
        })
        // calculate wasted time
        .map(record => {
          // In reality the end time should be calculated with paint time included
          // all browsers wait 3000ms to block text so we make sure 3000 is our max wasted time
          const wastedTime = Math.min((record._endTime - record._startTime) * 1000, 3000);

          return {
            url: record.url,
            wastedTime: Util.formatMilliseconds(wastedTime, 1),
          };
        });

      const headings = [
        {key: 'url', itemType: 'url', text: 'Font URL'},
        {key: 'wastedTime', itemType: 'text', text: 'Font download time'},
      ];
      const details = Audit.makeTableDetails(headings, results);

      return {
        score: results.length === 0,
        rawValue: results.length === 0,
        details,
      };
    });
  }
}

module.exports = FontDisplay;
