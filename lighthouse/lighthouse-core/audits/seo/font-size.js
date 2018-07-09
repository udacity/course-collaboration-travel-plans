/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @typedef {LH.Artifacts.FontSize['analyzedFailingNodesData'][0]} FailingNodeData */

const URL = require('../../lib/url-shim');
const Audit = require('../audit');
const ViewportAudit = require('../viewport');
const MINIMAL_PERCENTAGE_OF_LEGIBLE_TEXT = 60;

/**
 * @param {Array<FailingNodeData>} fontSizeArtifact
 * @returns {Array<FailingNodeData>}
 */
function getUniqueFailingRules(fontSizeArtifact) {
  /** @type {Map<string, FailingNodeData>} */
  const failingRules = new Map();

  fontSizeArtifact.forEach(({cssRule, fontSize, textLength, node}) => {
    const artifactId = getFontArtifactId(cssRule, node);
    const failingRule = failingRules.get(artifactId);

    if (!failingRule) {
      failingRules.set(artifactId, {
        node,
        cssRule,
        fontSize,
        textLength,
      });
    } else {
      failingRule.textLength += textLength;
    }
  });

  return [...failingRules.values()];
}

/**
 * @param {Array<string>=} attributes
 * @returns {Map<string, string>}
 */
function getAttributeMap(attributes = []) {
  const map = new Map();

  for (let i = 0; i < attributes.length; i += 2) {
    const name = attributes[i].toLowerCase();
    const value = attributes[i + 1].trim();

    if (value) {
      map.set(name, value);
    }
  }

  return map;
}

/**
 * TODO: return unique selector, like axe-core does, instead of just id/class/name of a single node
 * @param {FailingNodeData['node']} node
 * @returns {string}
 */
function getSelector(node) {
  const attributeMap = getAttributeMap(node.attributes);

  if (attributeMap.has('id')) {
    return '#' + attributeMap.get('id');
  } else {
    const attrClass = attributeMap.get('class');
    if (attrClass) {
      return '.' + attrClass.split(/\s+/).join('.');
    }
  }

  return node.localName.toLowerCase();
}

/**
 * @param {FailingNodeData['node']} node
 * @return {{type: 'node', selector: string, snippet: string}}
 */
function nodeToTableNode(node) {
  const attributes = node.attributes || [];
  const attributesString = attributes.map((value, idx) =>
    (idx % 2 === 0) ? ` ${value}` : `="${value}"`
  ).join('');

  return {
    type: 'node',
    selector: node.parentNode ? getSelector(node.parentNode) : '',
    snippet: `<${node.localName}${attributesString}>`,
  };
}

/**
 * @param {string} baseURL
 * @param {FailingNodeData['cssRule']} styleDeclaration
 * @param {FailingNodeData['node']} node
 * @returns {{source: string, selector: string | {type: 'node', selector: string, snippet: string}}}
 */
function findStyleRuleSource(baseURL, styleDeclaration, node) {
  if (
    !styleDeclaration ||
    styleDeclaration.type === 'Attributes' ||
    styleDeclaration.type === 'Inline'
  ) {
    return {
      selector: nodeToTableNode(node),
      source: baseURL,
    };
  }

  if (styleDeclaration.parentRule &&
    styleDeclaration.parentRule.origin === 'user-agent') {
    return {
      selector: styleDeclaration.parentRule.selectors.map(item => item.text).join(', '),
      source: 'User Agent Stylesheet',
    };
  }

  if (styleDeclaration.type === 'Regular' && styleDeclaration.parentRule) {
    const rule = styleDeclaration.parentRule;
    const stylesheet = styleDeclaration.stylesheet;

    if (stylesheet) {
      let source;
      const selector = rule.selectors.map(item => item.text).join(', ');

      if (stylesheet.sourceURL) {
        const url = new URL(stylesheet.sourceURL, baseURL);
        const range = styleDeclaration.range;
        source = `${url.href}`;

        if (range) {
          // `stylesheet` can be either an external file (stylesheet.startLine will always be 0),
          // or a <style> block (stylesheet.startLine will vary)
          const absoluteStartLine = range.startLine + stylesheet.startLine + 1;
          const absoluteStartColumn = range.startColumn + stylesheet.startColumn + 1;

          source += `:${absoluteStartLine}:${absoluteStartColumn}`;
        }
      } else {
        // dynamically injected to page
        source = 'dynamic';
      }

      return {
        selector,
        source,
      };
    }
  }

  return {
    selector: '',
    source: 'Unknown',
  };
}

/**
 * @param {FailingNodeData['cssRule']} styleDeclaration
 * @param {FailingNodeData['node']} node
 * @return {string}
 */
function getFontArtifactId(styleDeclaration, node) {
  if (styleDeclaration && styleDeclaration.type === 'Regular') {
    const startLine = styleDeclaration.range ? styleDeclaration.range.startLine : 0;
    const startColumn = styleDeclaration.range ? styleDeclaration.range.startColumn : 0;
    return `${styleDeclaration.styleSheetId}@${startLine}:${startColumn}`;
  } else {
    return `node_${node.nodeId}`;
  }
}

class FontSize extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'font-size',
      title: 'Document uses legible font sizes',
      failureTitle: 'Document doesn\'t use legible font sizes',
      description: 'Font sizes less than 12px are too small to be legible and require mobile ' +
      'visitors to “pinch to zoom” in order to read. Strive to have >60% of page text ≥12px. ' +
      '[Learn more](https://developers.google.com/web/tools/lighthouse/audits/font-sizes).',
      requiredArtifacts: ['FontSize', 'URL', 'Viewport'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const hasViewportSet = ViewportAudit.audit(artifacts).rawValue;
    if (!hasViewportSet) {
      return {
        rawValue: false,
        explanation: 'Text is illegible because of a missing viewport config',
      };
    }

    const {
      analyzedFailingNodesData,
      analyzedFailingTextLength,
      failingTextLength,
      visitedTextLength,
      totalTextLength,
    } = artifacts.FontSize;

    if (totalTextLength === 0) {
      return {
        rawValue: true,
      };
    }

    const failingRules = getUniqueFailingRules(analyzedFailingNodesData);
    const percentageOfPassingText =
      (visitedTextLength - failingTextLength) / visitedTextLength * 100;
    const pageUrl = artifacts.URL.finalUrl;

    const headings = [
      {key: 'source', itemType: 'url', text: 'Source'},
      {key: 'selector', itemType: 'code', text: 'Selector'},
      {key: 'coverage', itemType: 'text', text: '% of Page Text'},
      {key: 'fontSize', itemType: 'text', text: 'Font Size'},
    ];

    const tableData = failingRules.sort((a, b) => b.textLength - a.textLength)
      .map(({cssRule, textLength, fontSize, node}) => {
        const percentageOfAffectedText = textLength / visitedTextLength * 100;
        const origin = findStyleRuleSource(pageUrl, cssRule, node);

        return {
          source: origin.source,
          selector: origin.selector,
          coverage: `${percentageOfAffectedText.toFixed(2)}%`,
          fontSize: `${fontSize}px`,
        };
      });

    // all failing nodes that were not fully analyzed will be displayed in a single row
    if (analyzedFailingTextLength < failingTextLength) {
      const percentageOfUnanalyzedFailingText =
        (failingTextLength - analyzedFailingTextLength) / visitedTextLength * 100;

      tableData.push({
        source: 'Add\'l illegible text',
        selector: '',
        coverage: `${percentageOfUnanalyzedFailingText.toFixed(2)}%`,
        fontSize: '< 12px',
      });
    }

    if (percentageOfPassingText > 0) {
      tableData.push({
        source: 'Legible text',
        selector: '',
        coverage: `${percentageOfPassingText.toFixed(2)}%`,
        fontSize: '≥ 12px',
      });
    }

    /** @type {LH.Audit.DisplayValue} */
    const displayValue = ['%.1d% legible text', percentageOfPassingText];
    const details = Audit.makeTableDetails(headings, tableData);
    const passed = percentageOfPassingText >= MINIMAL_PERCENTAGE_OF_LEGIBLE_TEXT;

    let explanation;
    if (!passed) {
      const percentageOfFailingText = parseFloat((100 - percentageOfPassingText).toFixed(2));
      let disclaimer = '';

      // if we were unable to visit all text nodes we should disclose that information
      if (visitedTextLength < totalTextLength) {
        const percentageOfVisitedText = visitedTextLength / totalTextLength * 100;
        disclaimer = ` (based on ${percentageOfVisitedText.toFixed()}% sample)`;
      }

      explanation = `${percentageOfFailingText}% of text is too small${disclaimer}.`;
    }

    return {
      rawValue: passed,
      details,
      displayValue,
      explanation,
    };
  }
}

module.exports = FontSize;
