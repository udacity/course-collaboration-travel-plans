/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit');
const URL = require('../../lib/url-shim');
const BLOCKLIST = new Set([
  'click here',
  'click this',
  'go',
  'here',
  'this',
  'start',
  'right here',
  'more',
  'learn more',
]);

class LinkText extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'link-text',
      title: 'Links have descriptive text',
      failureTitle: 'Links do not have descriptive text',
      description: 'Descriptive link text helps search engines understand your content. ' +
      '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/descriptive-link-text).',
      requiredArtifacts: ['URL', 'CrawlableLinks'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const failingLinks = artifacts.CrawlableLinks
      .filter(link => {
        if (
          link.href.toLowerCase().startsWith('javascript:') ||
          URL.equalWithExcludedFragments(link.href, artifacts.URL.finalUrl)
        ) {
          return false;
        }

        return BLOCKLIST.has(link.text.trim().toLowerCase());
      });

    const headings = [
      {key: 'href', itemType: 'url', text: 'Link destination'},
      {key: 'text', itemType: 'text', text: 'Link Text'},
    ];

    const details = Audit.makeTableDetails(headings, failingLinks, {});
    let displayValue;

    if (failingLinks.length) {
      displayValue = failingLinks.length > 1 ?
        `${failingLinks.length} links found` : '1 link found';
    }

    return {
      rawValue: failingLinks.length === 0,
      details,
      displayValue,
    };
  }
}

module.exports = LinkText;
