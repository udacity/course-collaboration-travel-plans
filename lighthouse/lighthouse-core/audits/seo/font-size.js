/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const URL = require('../../lib/url-shim');
const Audit = require('../audit');
const ViewportAudit = require('../viewport');
const CSSStyleDeclaration = require('../../lib/web-inspector').CSSStyleDeclaration;
const MINIMAL_PERCENTAGE_OF_LEGIBLE_TEXT = 60;

/**
 * @param {Array<{cssRule: SimplifiedStyleDeclaration, fontSize: number, textLength: number, node: Node}>} fontSizeArtifact
 * @returns {Array<{cssRule: SimplifiedStyleDeclaration, fontSize: number, textLength: number, node: Node}>}
 */
function getUniqueFailingRules(fontSizeArtifact) {
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

  return failingRules.valuesArray();
}

/**
 * @param {Array<string>} attributes
 * @returns {Map<string, string>}
 */
function getAttributeMap(attributes) {
  const map = new Map();

  for (let i=0; i<attributes.length; i+=2) {
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
 * @param {Node} node
 * @returns {string}
 */
function getSelector(node) {
  const attributeMap = getAttributeMap(node.attributes);

  if (attributeMap.has('id')) {
    return '#' + attributeMap.get('id');
  } else if (attributeMap.has('class')) {
    return '.' + attributeMap.get('class').split(/\s+/).join('.');
  }

  return node.localName.toLowerCase();
}

/**
 * @param {Node} node
 * @return {{type:string, selector: string, snippet:string}}
 */
function nodeToTableNode(node) {
  const attributesString = node.attributes.map((value, idx) =>
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
 * @param {SimplifiedStyleDeclaration} styleDeclaration
 * @param {Node} node
 * @returns {{source:!string, selector:string|object}}
 */
function findStyleRuleSource(baseURL, styleDeclaration, node) {
  if (
    !styleDeclaration ||
    styleDeclaration.type === CSSStyleDeclaration.Type.Attributes ||
    styleDeclaration.type === CSSStyleDeclaration.Type.Inline
  ) {
    return {
      source: baseURL,
      selector: nodeToTableNode(node),
    };
  }

  if (styleDeclaration.parentRule &&
    styleDeclaration.parentRule.origin === global.CSSAgent.StyleSheetOrigin.USER_AGENT) {
    return {
      selector: styleDeclaration.parentRule.selectors.map(item => item.text).join(', '),
      source: 'User Agent Stylesheet',
    };
  }

  if (styleDeclaration.type === CSSStyleDeclaration.Type.Regular && styleDeclaration.parentRule) {
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
    source: 'Unknown',
  };
}

/**
 * @param {SimplifiedStyleDeclaration} styleDeclaration
 * @param {Node} node
 * @return string
 */
function getFontArtifactId(styleDeclaration, node) {
  if (styleDeclaration && styleDeclaration.type === CSSStyleDeclaration.Type.Regular) {
    const startLine = styleDeclaration.range ? styleDeclaration.range.startLine : 0;
    const startColumn = styleDeclaration.range ? styleDeclaration.range.startColumn : 0;
    return `${styleDeclaration.styleSheetId}@${startLine}:${startColumn}`;
  } else {
    return `node_${node.nodeId}`;
  }
}

class FontSize extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      name: 'font-size',
      description: 'Document uses legible font sizes',
      failureDescription: 'Document doesn\'t use legible font sizes',
      helpText: 'Font sizes less than 12px are too small to be legible and require mobile ' +
      'visitors to “pinch to zoom” in order to read. Strive to have >60% of page text ≥12px. ' +
      '[Learn more](https://developers.google.com/web/fundamentals/design-and-ux/responsive/#optimize_text_for_reading).',
      requiredArtifacts: ['FontSize', 'URL', 'Viewport'],
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    const hasViewportSet = ViewportAudit.audit(artifacts).rawValue;
    if (!hasViewportSet) {
      return {
        rawValue: false,
        debugString: 'Text is illegible because of a missing viewport config',
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
        selector: null,
        coverage: `${percentageOfUnanalyzedFailingText.toFixed(2)}%`,
        fontSize: '< 12px',
      });
    }

    if (percentageOfPassingText > 0) {
      tableData.push({
        source: 'Legible text',
        selector: null,
        coverage: `${percentageOfPassingText.toFixed(2)}%`,
        fontSize: '≥ 12px',
      });
    }

    const details = Audit.makeTableDetails(headings, tableData);
    const passed = percentageOfPassingText >= MINIMAL_PERCENTAGE_OF_LEGIBLE_TEXT;
    let debugString = null;

    if (!passed) {
      const percentageOfFailingText = parseFloat((100 - percentageOfPassingText).toFixed(2));
      let disclaimer = '';

      // if we were unable to visit all text nodes we should disclose that information
      if (visitedTextLength < totalTextLength) {
        const percentageOfVisitedText = visitedTextLength / totalTextLength * 100;
        disclaimer = ` (based on ${percentageOfVisitedText.toFixed()}% sample)`;
      }

      debugString = `${percentageOfFailingText}% of text is too small${disclaimer}.`;
    }

    return {
      rawValue: passed,
      details,
      debugString,
    };
  }
}

module.exports = FontSize;
