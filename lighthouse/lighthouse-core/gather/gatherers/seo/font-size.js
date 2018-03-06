/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Extracts information about illegible text from the page.
 *
 * In effort to keep this audit's execution time around 1s, maximum number of protocol calls was limited.
 * Firstly, number of visited nodes (text nodes for which font size was checked) is capped. Secondly, number of failing nodes that are analyzed (for which detailed CSS information is extracted) is also limited.
 *
 * This gatherer collects stylesheet metadata by itself, instead of relying on the styles gatherer which is slow (because it parses the stylesheet content).
 */

const CSSMatchedStyles = require('../../../lib/web-inspector').CSSMatchedStyles;
const Gatherer = require('../gatherer');
const FONT_SIZE_PROPERTY_NAME = 'font-size';
const TEXT_NODE_BLOCK_LIST = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT']);
const MINIMAL_LEGIBLE_FONT_SIZE_PX = 12;
// limit number of protocol calls to make sure that gatherer doesn't take more than 1-2s
const MAX_NODES_VISITED = 500;
const MAX_NODES_ANALYZED = 50;

/**
 * @param {!Node} node
 * @returns {boolean}
 */
function nodeInBody(node) {
  if (!node) {
    return false;
  }
  if (node.nodeName === 'BODY') {
    return true;
  }
  return nodeInBody(node.parentNode);
}

/**
 * Get list of all nodes from the document body.
 *
 * @param {!Object} driver
 * @returns {!Array<!Node>}
 */
function getAllNodesFromBody(driver) {
  return driver.getNodesInDocument()
    .then(nodes => {
      const nodeMap = new Map();
      nodes.forEach(node => nodeMap.set(node.nodeId, node));
      nodes.forEach(node => node.parentNode = nodeMap.get(node.parentId));
      return nodes.filter(nodeInBody);
    });
}

/**
 * Returns effective CSS rule for given CSS property
 *
 * @param {!string} property CSS property name
 * @param {!Node} node
 * @param {!Object} matched CSS rules
 * @returns {WebInspector.CSSStyleDeclaration}
 */
function getEffectiveRule(property, node, {
  inlineStyle,
  attributesStyle,
  matchedCSSRules,
  inherited,
}) {
  const cssModel = {
    styleSheetHeaderForId: id => ({id}),
  };

  const nodeType = node.nodeType;
  node.nodeType = () => nodeType;
  const matchedStyles = new CSSMatchedStyles(
    cssModel,
    node,
    inlineStyle,
    attributesStyle,
    matchedCSSRules,
    null,
    inherited,
    null
  );

  const nodeStyles = matchedStyles.nodeStyles();
  const matchingRule = nodeStyles
    .find(style =>
      // the applicable property will be the only one that isn't in the "overloaded" state.
      style.allProperties.some(item => item.name === property &&
        matchedStyles.propertyState(item) !== CSSMatchedStyles.PropertyState.Overloaded)
    );

  return matchingRule;
}

/**
 * @param {!Node} node
 * @returns {!number}
 */
function getNodeTextLength(node) {
  return !node.nodeValue ? 0 : node.nodeValue.trim().length;
}

/**
 * @param {!Object} driver
 * @param {!Node} node text node
 * @returns {WebInspector.CSSStyleDeclaration}
 */
function getFontSizeSourceRule(driver, node) {
  return driver.sendCommand('CSS.getMatchedStylesForNode', {nodeId: node.nodeId})
    .then(matchedRules => getEffectiveRule(FONT_SIZE_PROPERTY_NAME, node, matchedRules));
}

/**
 * @param {!Object} driver
 * @param {!Node} node text node
 * @returns {!{fontSize: number, textLength: number, node: Node}}
 */
function getFontSizeInformation(driver, node) {
  return driver.sendCommand('CSS.getComputedStyleForNode', {nodeId: node.parentId})
    .then(result => {
      const {computedStyle} = result;
      const fontSizeProperty = computedStyle.find(({name}) => name === FONT_SIZE_PROPERTY_NAME);

      return {
        fontSize: parseInt(fontSizeProperty.value, 10),
        textLength: getNodeTextLength(node),
        node: node.parentNode,
      };
    })
    .catch(err => {
      require('../../../lib/sentry.js').captureException(err);
      return null;
    });
}

/**
 * @param {Node} node
 * @returns {boolean}
 */
function isNonEmptyTextNode(node) {
  return node.nodeType === global.Node.TEXT_NODE &&
    !TEXT_NODE_BLOCK_LIST.has(node.parentNode.nodeName) &&
    getNodeTextLength(node) > 0;
}

class FontSize extends Gatherer {
  /**
   * @param {{driver: !Object}} options Run options
   * @return {!Promise<{totalTextLength: number, failingTextLength: number, visitedTextLength: number, analyzedFailingTextLength: number, analyzedFailingNodesData: Array<{fontSize: number, textLength: number, node: Node, cssRule: SimplifiedStyleDeclaration}>}>} font-size analysis
   */
  afterPass(options) {
    const stylesheets = new Map();
    const onStylesheetAdd = sheet => stylesheets.set(sheet.header.styleSheetId, sheet.header);
    options.driver.on('CSS.styleSheetAdded', onStylesheetAdd);

    const enableDOM = options.driver.sendCommand('DOM.enable');
    const enableCSS = options.driver.sendCommand('CSS.enable');

    let failingTextLength = 0;
    let visitedTextLength = 0;
    let totalTextLength = 0;

    return Promise.all([enableDOM, enableCSS])
      .then(() => getAllNodesFromBody(options.driver))
      .then(nodes => {
        const textNodes = nodes.filter(isNonEmptyTextNode);
        totalTextLength = textNodes.reduce((sum, node) => sum += getNodeTextLength(node), 0);
        const nodesToVisit = textNodes
          .sort((a, b) => getNodeTextLength(b) - getNodeTextLength(a))
          .slice(0, MAX_NODES_VISITED);

        return nodesToVisit;
      })
      .then(textNodes =>
        Promise.all(textNodes.map(node => getFontSizeInformation(options.driver, node))))
      .then(fontSizeInfo => {
        const visitedNodes = fontSizeInfo.filter(Boolean);
        visitedTextLength = visitedNodes.reduce((sum, {textLength}) => sum += textLength, 0);
        const failingNodes = visitedNodes
          .filter(({fontSize}) => fontSize < MINIMAL_LEGIBLE_FONT_SIZE_PX);
        failingTextLength = failingNodes.reduce((sum, {textLength}) => sum += textLength, 0);

        return Promise.all(failingNodes
          .sort((a, b) => b.textLength - a.textLength)
          .slice(0, MAX_NODES_ANALYZED)
          .map(info =>
            getFontSizeSourceRule(options.driver, info.node)
              .then(sourceRule => {
                if (sourceRule) {
                  info.cssRule = {
                    type: sourceRule.type,
                    range: sourceRule.range,
                    styleSheetId: sourceRule.styleSheetId,
                  };

                  if (sourceRule.parentRule) {
                    info.cssRule.parentRule = {
                      origin: sourceRule.parentRule.origin,
                      selectors: sourceRule.parentRule.selectors,
                    };
                  }
                }
                return info;
              })
          )
        );
      })
      .then(analyzedFailingNodesData => {
        options.driver.off('CSS.styleSheetAdded', onStylesheetAdd);

        const analyzedFailingTextLength = analyzedFailingNodesData
          .reduce((sum, {textLength}) => sum += textLength, 0);

        analyzedFailingNodesData
          .filter(data => data.cssRule && data.cssRule.styleSheetId)
          .forEach(data => data.cssRule.stylesheet = stylesheets.get(data.cssRule.styleSheetId));

        return Promise.all([
          options.driver.sendCommand('DOM.disable'),
          options.driver.sendCommand('CSS.disable'),
        ]).then(_ => ({
          analyzedFailingNodesData,
          analyzedFailingTextLength,
          failingTextLength,
          visitedTextLength,
          totalTextLength,
        }));
      });
  }
}

module.exports = FontSize;

/**
 * Simplified, for serializability sake, WebInspector.CSSStyleDeclaration
 * @typedef {Object} SimplifiedStyleDeclaration
 * @property {string} type
 * @property {{startLine: number, startColumn: number}} range
 * @property {{origin: string, selectors: Array<{text: string}>}} parentRule
 * @property {string} styleSheetId
 * @property {WebInspector.CSSStyleSheetHeader} stylesheet
 */
