/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Ensures the contrast between foreground and background colors meets
 * WCAG 2 AA contrast ratio thresholds.
 * See base class in axe-audit.js for audit() implementation.
 */

const AxeAudit = require('./axe-audit');

class ColorContrast extends AxeAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      name: 'color-contrast',
      description: 'Background and foreground colors have a sufficient contrast ratio',
      failureDescription: 'Background and foreground colors do not have a ' +
          'sufficient contrast ratio.',
      helpText: 'Low-contrast text is difficult or impossible for many users to read. ' +
          '[Learn more](https://dequeuniversity.com/rules/axe/2.2/color-contrast?application=lighthouse).',
      requiredArtifacts: ['Accessibility'],
    };
  }
}

module.exports = ColorContrast;
