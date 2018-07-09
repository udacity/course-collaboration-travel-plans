/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const DOMSize = require('../../../audits/dobetterweb/dom-size.js');
const assert = require('assert');
const options = DOMSize.defaultOptions;

/* eslint-env jest */

describe('Num DOM nodes audit', () => {
  const numNodes = DOMSize.MAX_DOM_NODES;
  const artifact = {
    DOMStats: {
      totalDOMNodes: numNodes,
      depth: {max: 1, pathToElement: ['html', 'body', 'div', 'span']},
      width: {max: 2, pathToElement: ['html', 'body']},
    },
  };

  it('calculates score hitting mid distribution', () => {
    const auditResult = DOMSize.audit(artifact, {options});
    assert.equal(auditResult.score, 0.43);
    assert.equal(auditResult.rawValue, numNodes);
    expect(auditResult.displayValue).toBeDisplayString('1,500 nodes');
    assert.equal(auditResult.details.items[0].value, numNodes.toLocaleString());
    assert.equal(auditResult.details.items[1].value, '1');
    assert.equal(auditResult.details.items[2].value, '2');
  });

  it('calculates score hitting top distribution', () => {
    artifact.DOMStats.totalDOMNodes = 400;
    assert.equal(DOMSize.audit(artifact, {options}).score, 1);
  });

  it('calculates score hitting bottom of distribution', () => {
    artifact.DOMStats.totalDOMNodes = 5970;
    assert.equal(DOMSize.audit(artifact, {options}).score, 0);
  });
});
