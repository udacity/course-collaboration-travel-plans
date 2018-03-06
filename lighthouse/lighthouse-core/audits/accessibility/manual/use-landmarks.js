
/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ManualAudit = require('../../manual/manual-audit');

/**
 * @fileoverview Manual A11y audit to check that landmark elements are used whenever possible.
 */

class UseLandmarks extends ManualAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return Object.assign({
      name: 'use-landmarks',
      helpText: 'Landmark elements (<main>, <nav>, etc.) are used to improve the keyboard navigation of the page for assistive technology. [Learn more](https://developers.google.com/web/fundamentals/accessibility/how-to-review#take_advantage_of_headings_and_landmarks).',
      description: 'HTML5 landmark elements are used to improve navigation',
    }, super.meta);
  }
}

module.exports = UseLandmarks;
