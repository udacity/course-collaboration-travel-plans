/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const KB = 1024;
const UnminifiedJavascriptAudit =
  require('../../../audits/byte-efficiency/unminified-javascript.js');
const assert = require('assert');

/* eslint-env mocha */

const _resourceType = {_name: 'script'};
describe('Page uses optimized responses', () => {
  it('fails when given unminified scripts', () => {
    const auditResult = UnminifiedJavascriptAudit.audit_({
      Scripts: {
        '123.1':
          `
            var foo = new Set();
            foo.add(1);
            foo.add(2);

            if (foo.has(2)) {
              console.log('hello!')
            }
          `,
        '123.2':
          `
            const foo = new Set();
            foo.add(1);

            async function go() {
              await foo.has(1)
              console.log('yay esnext!')
            }
          `,
        '123.3':
          /* eslint-disable no-useless-escape */
          `
            const foo = 1
            /Edge\/\d*\.\d*/.exec('foo')
          `,
        '123.4': '#$*% non sense',
      },
    }, [
      {requestId: '123.1', url: 'foo.js', _transferSize: 20 * KB, _resourceType},
      {requestId: '123.2', url: 'other.js', _transferSize: 50 * KB, _resourceType},
      {requestId: '123.3', url: 'valid-ish.js', _transferSize: 100 * KB, _resourceType},
      {requestId: '123.4', url: 'invalid.js', _transferSize: 100 * KB, _resourceType},
    ]);

    assert.ok(auditResult.debugString);
    assert.equal(auditResult.results.length, 3);
    assert.equal(auditResult.results[0].url, 'foo.js');
    assert.equal(Math.round(auditResult.results[0].wastedPercent), 57);
    assert.equal(Math.round(auditResult.results[0].wastedBytes / 1024), 11);
    assert.equal(auditResult.results[1].url, 'other.js');
    assert.equal(Math.round(auditResult.results[1].wastedPercent), 53);
    assert.equal(Math.round(auditResult.results[1].wastedBytes / 1024), 27);
    assert.equal(auditResult.results[2].url, 'valid-ish.js');
    assert.equal(Math.round(auditResult.results[2].wastedPercent), 72);
    assert.equal(Math.round(auditResult.results[2].wastedBytes / 1024), 72);
  });

  it('passes when scripts are already minified', () => {
    const auditResult = UnminifiedJavascriptAudit.audit_({
      Scripts: {
        '123.1':
          'var f=new Set();f.add(1);f.add(2);if(f.has(2))console.log(1234)',
        '123.2':
          `
            const foo = new Set();
            foo.add(1);

            async function go() {
              await foo.has(1)
              console.log('yay esnext!')
            }
          `,
        '123.3':
          'for{(wtf',
      },
    }, [
      {requestId: '123.1', url: 'foo.js', _transferSize: 20 * KB, _resourceType},
      {requestId: '123.2', url: 'other.js', _transferSize: 3 * KB, _resourceType},
      {requestId: '123.3', url: 'invalid.js', _transferSize: 20 * KB, _resourceType},
    ]);

    assert.equal(auditResult.results.length, 0);
  });
});
