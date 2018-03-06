/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('../gatherer');
const DOMHelpers = require('../../../lib/dom-helpers.js');

class EmbeddedContent extends Gatherer {
  /**
   * @param {{driver: !Driver}} options Run options
   * @return {!Promise<Array<{tagName: string, type: ?string, src: ?string, data: ?string, code: ?string, params: Array<{name: string, value: string}>}>>} All <object>s, <embed>s and <applet>s with list of relevant attributes and child properties
   */
  afterPass(options) {
    const expression = `(function() {
      ${DOMHelpers.getElementsInDocumentFnString}; // define function on page
      const selector = 'object, embed, applet';
      const elements = getElementsInDocument(selector);
      return elements
        .map(node => ({
          tagName: node.tagName,
          type: node.getAttribute('type'),
          src: node.getAttribute('src'),
          data: node.getAttribute('data'),
          code: node.getAttribute('code'),
          params: Array.from(node.children)
            .filter(el => el.tagName === 'PARAM')
            .map(el => ({
              name: el.getAttribute('name') || '',
              value: el.getAttribute('value') || '',
            })),
        }));
    })()`;

    return options.driver.evaluateAsync(expression);
  }
}

module.exports = EmbeddedContent;
