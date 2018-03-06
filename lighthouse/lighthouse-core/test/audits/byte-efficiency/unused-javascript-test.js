/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const UnusedJavaScript = require('../../../audits/byte-efficiency/unused-javascript');
const assert = require('assert');

/* eslint-env mocha */

function generateRecord(url, _transferSize, _resourceType) {
  url = `https://google.com/${url}`;
  return {url, _transferSize, _resourceType};
}

function generateScript(url, ranges, transferSize = 1000) {
  url = `https://google.com/${url}`;
  const functions = ranges.map(range => {
    return {
      ranges: [
        {
          startOffset: range[0],
          endOffset: range[1],
          count: range[2] ? 1 : 0,
        },
      ],
    };
  });

  return {url, functions, networkRecord: {transferSize}};
}

describe('UnusedJavaScript audit', () => {
  describe('#computeWaste', () => {
    it('should identify used', () => {
      const usage = generateScript('myscript.js', [[0, 100, true]]);
      const result = UnusedJavaScript.computeWaste(usage);
      assert.equal(result.unusedLength, 0);
      assert.equal(result.contentLength, 100);
    });

    it('should identify unused', () => {
      const usage = generateScript('myscript.js', [[0, 100, false]]);
      const result = UnusedJavaScript.computeWaste(usage);
      assert.equal(result.unusedLength, 100);
      assert.equal(result.contentLength, 100);
    });

    it('should identify nested unused', () => {
      const usage = generateScript('myscript.js', [
        [0, 100, true], // 40% used overall

        [0, 10, true],
        [0, 40, true],
        [20, 40, false],

        [60, 100, false],
        [70, 80, false],

        [100, 150, false],
        [180, 200, false],
        [100, 200, true], // 30% used overall
      ]);

      const result = UnusedJavaScript.computeWaste(usage);
      assert.equal(result.unusedLength, 130);
      assert.equal(result.contentLength, 200);
    });
  });

  describe('audit_', () => {
    const scriptUnknown = generateScript('', [[0, 3000, false]]);
    const scriptA = generateScript('scriptA.js', [[0, 100, true]]);
    const scriptB = generateScript('scriptB.js', [[0, 200, true], [0, 50, false]]);
    const inlineA = generateScript('inline.html', [[0, 5000, true], [5000, 6000, false]]);
    const inlineB = generateScript('inline.html', [[0, 15000, true], [0, 5000, false]]);
    const recordA = generateRecord('scriptA.js', 35000, {_name: 'script'});
    const recordB = generateRecord('scriptB.js', 50000, {_name: 'script'});
    const recordInline = generateRecord('inline.html', 1000000, {_name: 'document'});

    const result = UnusedJavaScript.audit_(
      {JsUsage: [scriptA, scriptB, scriptUnknown, inlineA, inlineB]},
      [recordA, recordB, recordInline]
    );

    it('should merge duplicates', () => {
      assert.equal(result.results.length, 2);

      const scriptBWaste = result.results[0];
      assert.equal(scriptBWaste.totalBytes, 50000);
      assert.equal(scriptBWaste.wastedBytes, 12500);
      assert.equal(scriptBWaste.wastedPercent, 25);

      const inlineWaste = result.results[1];
      assert.equal(inlineWaste.totalBytes, 21000);
      assert.equal(inlineWaste.wastedBytes, 6000);
      assert.equal(Math.round(inlineWaste.wastedPercent), 29);
    });
  });
});
