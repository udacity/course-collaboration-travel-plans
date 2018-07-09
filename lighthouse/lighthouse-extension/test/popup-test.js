/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const path = require('path');
const assert = require('assert');
const puppeteer = require('../../node_modules/puppeteer/index.js');

const lighthouseExtensionPath = path.resolve(__dirname, '../dist');

const defaultCategoriesStub = [
  {
    id: 'performance',
    title: 'Performance',
  },
  {
    id: 'pwa',
    title: 'Progressive Web App',
  },
  {
    id: 'seo',
    title: 'SEO',
  },
];

describe('Lighthouse chrome popup', function() {
  // eslint-disable-next-line no-console
  console.log('\n✨ Be sure to have recently run this: yarn build-extension');

  let browser;
  let page;
  const pageErrors = [];

  before(async function() {
    // eslint-disable-next-line
    this.timeout(90 * 1000);

    // start puppeteer
    browser = await puppeteer.launch({
      headless: false,
      executablePath: process.env.CHROME_PATH,
    });

    page = await browser.newPage();
    await page.evaluateOnNewDocument((defaultCategoriesStub) => {
      const backgroundMock = {
        isRunning: () => false,
        listenForStatus: () => {},
        loadSettings: () => Promise.resolve({
          selectedCategories: [],
          useDevTools: false,
        }),
        getDefaultCategories: () => defaultCategoriesStub,
      };

      Object.defineProperty(chrome, 'tabs', {
        get: () => ({
          query: (args, cb) => {
            cb([{
              url: 'http://example.com',
            }]);
          },
        }),
      });
      Object.defineProperty(chrome, 'runtime', {
        get: () => ({
          getBackgroundPage: cb => {
            cb(backgroundMock);
          },
        }),
      });
    }, defaultCategoriesStub);

    page.on('pageerror', err => {
      pageErrors.push(err);
    });

    await page.goto('file://' + path.join(lighthouseExtensionPath, 'popup.html'), {waitUntil: 'networkidle2'});
  });

  after(async () => {
    if (browser) {
      await browser.close();
    }
  });

  it('should load without errors', async function() {
    assert.equal(pageErrors.length, 0);
  });

  it('should load the popup with an url', async () => {
    const titleText = await page.evaluate(() =>
      document.querySelector('.header-titles__main').textContent);
    const urlText = await page.evaluate(() =>
      document.querySelector('.header-titles__url').textContent);

    // check if the popup is showing the lighthouse page
    const subPageIsVisible = await page.evaluate(() =>
      document.querySelector('.status').classList.contains('subpage--visible'));

    assert.ok(!subPageIsVisible, 'Popup is stuck on the splash screen');
    assert.equal(titleText, 'Lighthouse');
    assert.equal(urlText, 'http://example.com');
  });


  it('should populate the category checkboxes correctly', async function() {
    const checkboxTitles = await page.$$eval('li label', els => els.map(e => e.textContent));
    const checkboxValues = await page.$$eval('li label input', els => els.map(e => e.value));

    for (const {title, id} of defaultCategoriesStub) {
      assert.ok(checkboxTitles.includes(title));
      assert.ok(checkboxValues.includes(id));
    }
  });
});
