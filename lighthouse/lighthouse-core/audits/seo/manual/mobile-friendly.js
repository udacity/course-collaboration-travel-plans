/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ManualAudit = require('../../manual/manual-audit');

/**
 * @fileoverview Manual SEO audit to check if page is mobile friendly.
 */

class MobileFriendly extends ManualAudit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return Object.assign({
      name: 'mobile-friendly',
      helpText: 'Take the [Mobile-Friendly Test](https://search.google.com/test/mobile-friendly) to check for audits not covered by Lighthouse, like sizing tap targets appropriately. [Learn more](https://developers.google.com/search/mobile-sites/).',
      description: 'Page is mobile friendly',
    }, super.meta);
  }
}

module.exports = MobileFriendly;
