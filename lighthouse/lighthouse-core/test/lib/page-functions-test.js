/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert');
const jsdom = require('jsdom');
const DOM = require('../../report/html/renderer/dom.js');
const pageFunctions = require('../../lib/page-functions');

/* eslint-env jest */

describe('DetailsRenderer', () => {
  let dom;

  beforeAll(() => {
    const document = jsdom.jsdom();
    dom = new DOM(document);
  });

  describe('get outer HTML snippets', () => {
    it('gets full HTML snippet', () => {
      assert.equal(pageFunctions.getOuterHTMLSnippet(
        dom.createElement('div', '', {id: '1', style: 'style'})), '<div id="1" style="style">');
    });

    it('removes a specific attribute', () => {
      assert.equal(pageFunctions.getOuterHTMLSnippet(
        dom.createElement('div', '', {id: '1', style: 'style'}), ['style']), '<div id="1">');
    });

    it('removes multiple attributes', () => {
      assert.equal(pageFunctions.getOuterHTMLSnippet(
        dom.createElement('div', '', {'id': '1', 'style': 'style', 'aria-label': 'label'}),
        ['style', 'aria-label']
      ), '<div id="1">');
    });

    it('ignores when attribute not found', () => {
      assert.equal(pageFunctions.getOuterHTMLSnippet(
        dom.createElement('div', '', {'id': '1', 'style': 'style', 'aria-label': 'label'}),
        ['style-missing', 'aria-label-missing']
      ), '<div id="1" style="style" aria-label="label">');
    });
  });
});
