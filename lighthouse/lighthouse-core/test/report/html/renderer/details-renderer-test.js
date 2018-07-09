/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const jsdom = require('jsdom');
const URL = require('../../../../lib/url-shim');
const DOM = require('../../../../report/html/renderer/dom.js');
const Util = require('../../../../report/html/renderer/util.js');
const DetailsRenderer = require('../../../../report/html/renderer/details-renderer.js');

const TEMPLATE_FILE = fs.readFileSync(__dirname +
    '/../../../../report/html/templates.html', 'utf8');

/* eslint-env jest */

describe('DetailsRenderer', () => {
  let renderer;

  beforeAll(() => {
    global.URL = URL;
    global.Util = Util;
    const document = jsdom.jsdom(TEMPLATE_FILE);
    const dom = new DOM(document);
    renderer = new DetailsRenderer(dom);
  });

  afterAll(() => {
    global.URL = undefined;
    global.Util = undefined;
  });

  describe('render', () => {
    it('renders text', () => {
      const el = renderer.render({type: 'text', value: 'My text content'});
      assert.equal(el.textContent, 'My text content');
      assert.ok(el.classList.contains('lh-text'), 'adds classes');
    });

    it('renders code', () => {
      const el = renderer.render({
        type: 'code',
        value: 'code snippet',
        lineNumber: 123,
        source: 'deprecation',
        url: 'https://example.com/feature',
      });

      assert.ok(el.localName === 'pre');
      assert.ok(el.classList.contains('lh-code'));
      assert.equal(el.textContent, 'code snippet');
    });

    it('renders thumbnails', () => {
      const el = renderer.render({
        type: 'thumbnail',
        value: 'http://example.com/my-image.jpg',
        mimeType: 'image/jpeg',
      });

      assert.ok(el.localName === 'img');
      assert.ok(el.classList.contains('lh-thumbnail'));
      assert.equal(el.src, 'http://example.com/my-image.jpg');
    });

    it('renders filmstrips', () => {
      const el = renderer.render({
        type: 'filmstrip',
        items: [
          {timing: 1020, data: 'foobar'},
          {timing: 3030, data: 'foobaz'},
        ],
      });

      assert.ok(el.localName === 'div');
      assert.ok(el.classList.contains('lh-filmstrip'));

      const frames = [...el.querySelectorAll('.lh-filmstrip__frame')];
      assert.equal(frames.length, 2);

      const thumbnails = [...el.querySelectorAll('.lh-filmstrip__thumbnail')];
      assert.equal(thumbnails.length, 2);
      assert.equal(thumbnails[0].src, 'data:image/jpeg;base64,foobar');
      assert.ok(thumbnails[0].alt, 'did not set alt text');
    });

    it('renders tables', () => {
      const el = renderer.render({
        type: 'table',
        headings: [
          {text: 'First', key: 'a', itemType: 'text'},
          {text: 'Second', key: 'b', itemType: 'text'},
          {text: 'Preview', key: 'c', itemType: 'thumbnail'},
        ],
        items: [
          {
            a: 'value A.1',
            b: 'value A.2',
            c: {type: 'thumbnail', value: 'http://example.com/image.jpg'},
          },
          {
            a: 'value B.1',
            b: 'value B.2',
            c: {type: 'thumbnail', value: 'unknown'},
          },
        ],
      });

      assert.equal(el.localName, 'table', 'did not render table');
      assert.ok(el.querySelector('img'), 'did not render recursive items');
      assert.equal(el.querySelectorAll('th').length, 3, 'did not render header items');
      assert.equal(el.querySelectorAll('td').length, 6, 'did not render table cells');
      assert.equal(el.querySelectorAll('.lh-table-column--text').length, 6, '--text not set');
      assert.equal(el.querySelectorAll('.lh-table-column--thumbnail').length, 3,
          '--thumbnail not set');
    });

    it('renders links', () => {
      const linkText = 'Example Site';
      const linkUrl = 'https://example.com/';
      const el = renderer.render({
        type: 'link',
        text: linkText,
        url: linkUrl,
      });

      assert.equal(el.localName, 'a');
      assert.equal(el.textContent, linkText);
      assert.equal(el.href, linkUrl);
      assert.equal(el.rel, 'noopener');
      assert.equal(el.target, '_blank');
    });

    it('renders link as text if URL is not allowed', () => {
      const linkText = 'Evil Link';
      const linkUrl = 'javascript:alert(5)';
      const el = renderer.render({
        type: 'link',
        text: linkText,
        url: linkUrl,
      });

      assert.equal(el.localName, 'div');
      assert.equal(el.textContent, linkText);
      assert.ok(el.classList.contains('lh-text'), 'adds classes');
    });

    it('renders text URLs', () => {
      const urlText = 'https://example.com/';
      const displayUrlText = 'https://example.com';
      const el = renderer.render({
        type: 'url',
        value: urlText,
      });

      assert.equal(el.localName, 'div');
      assert.equal(el.textContent, displayUrlText);
      assert.ok(el.classList.contains('lh-text__url'), 'adds classes');
    });
  });
});
