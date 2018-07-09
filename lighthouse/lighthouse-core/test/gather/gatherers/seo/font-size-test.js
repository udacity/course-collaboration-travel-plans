/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const FontSizeGather = require('../../../../gather/gatherers/seo/font-size');
const assert = require('assert');
let fontSizeGather;

const smallText = ' body small text ';
const bigText = 'body big text';
const failingText = 'failing text';
const bodyNode = {nodeId: 3, nodeName: 'BODY', parentId: 1};
const failingNode = {nodeId: 10, nodeName: 'P', parentId: 3};
const nodes = [
  {nodeId: 1, nodeName: 'HTML'},
  {nodeId: 2, nodeName: 'HEAD', parentId: 1},
  bodyNode,
  {nodeId: 4, nodeValue: 'head text', nodeType: global.Node.TEXT_NODE, parentId: 2},
  {nodeId: 5, nodeValue: smallText, nodeType: global.Node.TEXT_NODE, parentId: 3},
  {nodeId: 6, nodeName: 'H1', parentId: 3},
  {nodeId: 7, nodeValue: bigText, nodeType: global.Node.TEXT_NODE, parentId: 6},
  {nodeId: 8, nodeName: 'SCRIPT', parentId: 3},
  {nodeId: 9, nodeValue: 'script text', nodeType: global.Node.TEXT_NODE, parentId: 8},
  failingNode,
  {nodeId: 11, nodeValue: failingText, nodeType: global.Node.TEXT_NODE, parentId: 10},
];

describe('Font size gatherer', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    fontSizeGather = new FontSizeGather();
  });

  it('returns information about font size\'s used on page', () => {
    return fontSizeGather.afterPass({
      driver: {
        on() {},
        off() {},
        sendCommand(command, params) {
          let result;
          if (command === 'CSS.getComputedStyleForNode') {
            if (params.nodeId === failingNode.nodeId) {
              return Promise.reject();
            }

            result = {computedStyle: [
              {name: 'font-size', value: params.nodeId === bodyNode.nodeId ? 10 : 20},
            ]};
          } else if (command === 'CSS.getMatchedStylesForNode') {
            result = {
              inlineStyle: null,
              attributesStyle: null,
              matchedCSSRules: [],
              inherited: [],
            };
          }

          return Promise.resolve(result);
        },
        getNodesInDocument() {
          return Promise.resolve(nodes);
        },
      },
    }).then(artifact => {
      const expectedFailingTextLength = smallText.trim().length;
      const expectedVisitedTextLength = bigText.trim().length + expectedFailingTextLength;
      const expectedTotalTextLength = failingText.trim().length + expectedVisitedTextLength;
      const expectedAnalyzedFailingTextLength = expectedFailingTextLength;

      assert.deepEqual(artifact, {
        analyzedFailingTextLength: expectedAnalyzedFailingTextLength,
        failingTextLength: expectedFailingTextLength,
        visitedTextLength: expectedVisitedTextLength,
        totalTextLength: expectedTotalTextLength,
        analyzedFailingNodesData: [{
          fontSize: 10,
          node: bodyNode,
          textLength: expectedFailingTextLength,
        }],
      });
    });
  });
});
