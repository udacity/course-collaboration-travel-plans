/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';
const BASE_URL = 'http://localhost:10200/seo/';
const URLSearchParams = require('../../../../lighthouse-core/lib/url-shim').URLSearchParams;

function headersParam(headers) {
  const headerString = new URLSearchParams(headers).toString();
  return new URLSearchParams([['extra_header', headerString]]).toString();
}

const failureHeaders = headersParam([[
  'x-robots-tag',
  'none',
], [
  'link',
  '<http://example.com>;rel="alternate";hreflang="xx"',
], [
  'link',
  '<https://example.com>; rel="canonical"',
]]);

const passHeaders = headersParam([[
  'link',
  '<http://localhost:10200/seo/>; rel="canonical"',
]]);

/**
 * Expected Lighthouse audit values for seo tests
 */
module.exports = [
  {
    requestedUrl: BASE_URL + 'seo-tester.html?' + passHeaders,
    finalUrl: BASE_URL + 'seo-tester.html?' + passHeaders,
    audits: {
      'viewport': {
        score: 1,
      },
      'document-title': {
        score: 1,
      },
      'meta-description': {
        score: 1,
      },
      'http-status-code': {
        score: 1,
      },
      'font-size': {
        rawValue: true,
        details: {
          items: {
            length: 6,
          },
        },
      },
      'link-text': {
        score: 1,
      },
      'is-crawlable': {
        score: 1,
      },
      'hreflang': {
        score: 1,
      },
      'plugins': {
        score: 1,
      },
      'canonical': {
        score: 1,
      },
      'robots-txt': {
        rawValue: true,
        scoreDisplayMode: 'not-applicable',
      },
    },
  },
  {
    requestedUrl: BASE_URL + 'seo-failure-cases.html?' + failureHeaders,
    finalUrl: BASE_URL + 'seo-failure-cases.html?' + failureHeaders,
    audits: {
      'viewport': {
        score: 0,
      },
      'document-title': {
        score: 0,
      },
      'meta-description': {
        score: 0,
      },
      'http-status-code': {
        score: 1,
      },
      'font-size': {
        rawValue: false,
        explanation: 'Text is illegible because of a missing viewport config',
      },
      'link-text': {
        score: 0,
        displayValue: '3 links found',
        details: {
          items: {
            length: 3,
          },
        },
      },
      'is-crawlable': {
        score: 0,
        details: {
          items: {
            length: 2,
          },
        },
      },
      'hreflang': {
        score: 0,
        details: {
          items: {
            length: 3,
          },
        },
      },
      'plugins': {
        score: 0,
        details: {
          items: {
            length: 3,
          },
        },
      },
      'canonical': {
        score: 0,
        explanation: 'Multiple conflicting URLs (https://example.com, https://example.com/)',
      },
    },
  },
  {
    // Note: most scores are null (audit error) because the page 403ed.
    requestedUrl: BASE_URL + 'seo-failure-cases.html?status_code=403',
    finalUrl: BASE_URL + 'seo-failure-cases.html?status_code=403',
    audits: {
      'http-status-code': {
        score: 0,
        displayValue: '403',
      },
      'viewport': {
        score: null,
      },
      'document-title': {
        score: null,
      },
      'meta-description': {
        score: null,
      },
      'font-size': {
        score: null,
      },
      'link-text': {
        score: null,
      },
      'is-crawlable': {
        score: null,
      },
      'hreflang': {
        score: null,
      },
      'plugins': {
        score: null,
      },
      'canonical': {
        score: null,
      },
    },
  },
];
