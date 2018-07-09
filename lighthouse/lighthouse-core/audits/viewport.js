/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const Parser = require('metaviewport-parser');

class Viewport extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'viewport',
      title: 'Has a `<meta name="viewport">` tag with `width` or `initial-scale`',
      failureTitle: 'Does not have a `<meta name="viewport">` tag with `width` ' +
          'or `initial-scale`',
      description: 'Add a viewport meta tag to optimize your app for mobile screens. ' +
          '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/has-viewport-meta-tag).',
      requiredArtifacts: ['Viewport'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    if (artifacts.Viewport === null) {
      return {
        explanation: 'No viewport meta tag found',
        rawValue: false,
      };
    }

    const warnings = [];
    const parsedProps = Parser.parseMetaViewPortContent(artifacts.Viewport);

    if (Object.keys(parsedProps.unknownProperties).length) {
      warnings.push(`Invalid properties found: ${JSON.stringify(parsedProps.unknownProperties)}`);
    }
    if (Object.keys(parsedProps.invalidValues).length) {
      warnings.push(`Invalid values found: ${JSON.stringify(parsedProps.invalidValues)}`);
    }

    const viewportProps = parsedProps.validProperties;
    const hasMobileViewport = viewportProps.width || viewportProps['initial-scale'];

    return {
      rawValue: !!hasMobileViewport,
      warnings,
    };
  }
}

module.exports = Viewport;
