/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit');
const LinkHeader = require('http-link-header');
const VALID_LANGS = importValidLangs();
const LINK_HEADER = 'link';
const NO_LANGUAGE = 'x-default';

/**
 * Import list of valid languages from axe core without including whole axe-core package
 * This is a huge array of language codes that can be stored more efficiently if we will need to
 * shrink the bundle size.
 * @return {Array<string>}
 */
function importValidLangs() {
  // @ts-ignore - global switcheroo to load axe valid-langs
  const axeCache = global.axe;
  // @ts-ignore
  global.axe = {utils: {}};
  // @ts-ignore
  require('axe-core/lib/commons/utils/valid-langs.js');
  // @ts-ignore
  const validLangs = global.axe.utils.validLangs();
  // @ts-ignore
  global.axe = axeCache;

  return validLangs;
}

/**
 * @param {string} hreflang
 * @returns {boolean}
 */
function isValidHreflang(hreflang) {
  if (hreflang.toLowerCase() === NO_LANGUAGE) {
    return true;
  }

  // hreflang can consist of language-script-region, we are validating only language
  const [lang] = hreflang.split('-');
  return VALID_LANGS.includes(lang.toLowerCase());
}

/**
 * @param {string} headerValue
 * @returns {boolean}
 */
function headerHasValidHreflangs(headerValue) {
  const linkHeader = LinkHeader.parse(headerValue);

  return linkHeader.get('rel', 'alternate')
    .every(link => !!link.hreflang && isValidHreflang(link.hreflang));
}

class Hreflang extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'hreflang',
      title: 'Document has a valid `hreflang`',
      failureTitle: 'Document doesn\'t have a valid `hreflang`',
      description: 'hreflang links tell search engines what version of a page they should ' +
        'list in search results for a given language or region. [Learn more]' +
        '(https://developers.google.com/web/tools/lighthouse/audits/hreflang).',
      requiredArtifacts: ['Hreflang', 'URL'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {Promise<LH.Audit.Product>}
   */
  static audit(artifacts) {
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const URL = artifacts.URL;

    return artifacts.requestMainResource({devtoolsLog, URL})
      .then(mainResource => {
        /** @type {Array<{source: string|{type: 'node', snippet: string}}>} */
        const invalidHreflangs = [];

        if (artifacts.Hreflang) {
          artifacts.Hreflang.forEach(({href, hreflang}) => {
            if (!isValidHreflang(hreflang)) {
              invalidHreflangs.push({
                source: {
                  type: 'node',
                  snippet: `<link name="alternate" hreflang="${hreflang}" href="${href}" />`,
                },
              });
            }
          });
        }

        mainResource.responseHeaders && mainResource.responseHeaders
          .filter(h => h.name.toLowerCase() === LINK_HEADER && !headerHasValidHreflangs(h.value))
          .forEach(h => invalidHreflangs.push({source: `${h.name}: ${h.value}`}));

        const headings = [
          {key: 'source', itemType: 'code', text: 'Source'},
        ];
        const details = Audit.makeTableDetails(headings, invalidHreflangs);

        return {
          rawValue: invalidHreflangs.length === 0,
          details,
        };
      });
  }
}

module.exports = Hreflang;
