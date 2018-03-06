/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ScriptBlockingFirstPaintAudit =
    require('../../../audits/dobetterweb/script-blocking-first-paint.js');
const assert = require('assert');
const NBSP = '\xa0';

/* eslint-env mocha */

describe('Script Block First Paint audit', () => {
  it('fails when there are scripts found which block first paint', () => {
    const scriptDetails = {
      tagName: 'SCRIPT',
      src: 'http://google.com/js/app.js',
      url: 'http://google.com/js/app.js',
    };
    const timestamps = {firstContentfulPaint: 5600 * 1000};
    return ScriptBlockingFirstPaintAudit.audit({
      traces: {},
      requestTraceOfTab: () => Promise.resolve({timestamps}),
      TagsBlockingFirstPaint: [
        {
          tag: scriptDetails,
          transferSize: 100,
          startTime: 1,
          endTime: 1.1,
        },
        {
          tag: scriptDetails,
          transferSize: 100,
          startTime: 15, // well after FCP and should be ignored
          endTime: 15.1,
        },
        {
          tag: scriptDetails,
          transferSize: 50,
          startTime: .95,
          endTime: 1,
        },
        {
          tag: {tagName: 'LINK'},
          transferSize: 110,
          spendTime: 110,
        },
      ],
    }).then(auditResult => {
      assert.equal(auditResult.rawValue, 150);
      assert.equal(auditResult.displayValue, `2 resources delayed first paint by 150${NBSP}ms`);
      const results = auditResult.details.items;
      assert.equal(results.length, 2);
      assert.ok(results[0][0].text.includes('js/app.js'), 'has a url');
      assert.equal(Math.round(results[0][2].value), 150);
      assert.equal(Math.round(results[1][2].value), 50);
    });
  });

  it('passes when there are no scripts found which block first paint', () => {
    return ScriptBlockingFirstPaintAudit.audit({
      traces: {},
      requestTraceOfTab: () => Promise.resolve({timestamps: {}}),
      TagsBlockingFirstPaint: [],
    }).then(auditResult => {
      assert.equal(auditResult.rawValue, 0);
      assert.equal(auditResult.details.items.length, 0);
    });
  });
});
