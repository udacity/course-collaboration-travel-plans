/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../audit');
const robotsParser = require('robots-parser');
const URL = require('../../lib/url-shim');
const BLOCKLIST = new Set([
  'noindex',
  'none',
]);
const ROBOTS_HEADER = 'x-robots-tag';
const UNAVAILABLE_AFTER = 'unavailable_after';

/**
 * Checks if given directive is a valid unavailable_after directive with a date in the past
 * @param {string} directive
 * @returns {boolean}
 */
function isUnavailable(directive) {
  const parts = directive.split(':');

  if (parts.length <= 1 || parts[0] !== UNAVAILABLE_AFTER) {
    return false;
  }

  const date = Date.parse(parts.slice(1).join(':'));

  return !isNaN(date) && date < Date.now();
}

/**
 * Returns true if any of provided directives blocks page from being indexed
 * @param {string} directives
 * @returns {boolean}
 */
function hasBlockingDirective(directives) {
  return directives.split(',')
    .map(d => d.toLowerCase().trim())
    .some(d => BLOCKLIST.has(d) || isUnavailable(d));
}

/**
 * Returns true if robots header specifies user agent (e.g. `googlebot: noindex`)
 * @param {string} directives
 * @returns {boolean}
 */
function hasUserAgent(directives) {
  const parts = directives.match(/^([^,:]+):/);

  // Check if directives are prefixed with `googlebot:`, `googlebot-news:`, `otherbot:`, etc.
  // but ignore `unavailable_after:` which is a valid directive
  return !!parts && parts[1].toLowerCase() !== UNAVAILABLE_AFTER;
}

class IsCrawlable extends Audit {
  /**
   * @return {!AuditMeta}
   */
  static get meta() {
    return {
      name: 'is-crawlable',
      description: 'Page isn’t blocked from indexing',
      failureDescription: 'Page is blocked from indexing',
      helpText: 'The "Robots" directives tell crawlers how your content should be indexed. ' +
      '[Learn more](https://developers.google.com/search/reference/robots_meta_tag).',
      requiredArtifacts: ['MetaRobots', 'RobotsTxt'],
    };
  }

  /**
   * @param {!Artifacts} artifacts
   * @return {!AuditResult}
   */
  static audit(artifacts) {
    return artifacts.requestMainResource(artifacts.devtoolsLogs[Audit.DEFAULT_PASS])
      .then(mainResource => {
        const blockingDirectives = [];

        if (artifacts.MetaRobots) {
          const isBlocking = hasBlockingDirective(artifacts.MetaRobots);

          if (isBlocking) {
            blockingDirectives.push({
              source: {
                type: 'node',
                snippet: `<meta name="robots" content="${artifacts.MetaRobots}" />`,
              },
            });
          }
        }

        mainResource.responseHeaders
          .filter(h => h.name.toLowerCase() === ROBOTS_HEADER && !hasUserAgent(h.value) &&
            hasBlockingDirective(h.value))
          .forEach(h => blockingDirectives.push({source: `${h.name}: ${h.value}`}));

        if (artifacts.RobotsTxt.content) {
          const robotsFileUrl = new URL('/robots.txt', mainResource.url);
          const robotsTxt = robotsParser(robotsFileUrl.href, artifacts.RobotsTxt.content);

          if (!robotsTxt.isAllowed(mainResource.url)) {
            blockingDirectives.push({
              source: {
                type: 'url',
                text: robotsFileUrl.href,
              },
            });
          }
        }

        const headings = [
          {key: 'source', itemType: 'code', text: 'Blocking Directive Source'},
        ];
        const details = Audit.makeTableDetails(headings, blockingDirectives);

        return {
          rawValue: blockingDirectives.length === 0,
          details,
        };
      });
  }
}

module.exports = IsCrawlable;
