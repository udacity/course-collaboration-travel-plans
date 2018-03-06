
/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ManualAudit = require('../../manual/manual-audit');

/**
 * @fileoverview Manual A11y audit to avoid trapping keyboard focus in a region.
 */

class FocusTraps extends ManualAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return Object.assign({
      name: 'focus-traps',
      helpText: 'A user can tab into and out of any control or region without accidentally trapping their focus. [Learn more](https://developers.google.com/web/fundamentals/accessibility/how-to-review#start_with_the_keyboard).',
      description: 'User focus is not accidentally trapped in a region',
    }, super.meta);
  }
}

module.exports = FocusTraps;
