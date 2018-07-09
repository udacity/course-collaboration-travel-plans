/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

// TODO(phulce): assert more score values once Lantern can tie more trace events back to images.
// See https://github.com/GoogleChrome/lighthouse/issues/4600.

/**
 * Expected Lighthouse audit values for byte efficiency tests
 */
module.exports = [
  {
    requestedUrl: 'http://localhost:10200/byte-efficiency/tester.html',
    finalUrl: 'http://localhost:10200/byte-efficiency/tester.html',
    audits: {
      'unminified-css': {
        details: {
          overallSavingsBytes: '>17000',
          items: {
            length: 1,
          },
        },
      },
      'unminified-javascript': {
        score: '<1',
        details: {
          overallSavingsBytes: '>45000',
          overallSavingsMs: '>500',
          items: {
            length: 1,
          },
        },
      },
      'unused-css-rules': {
        details: {
          overallSavingsBytes: '>39000',
          items: {
            length: 2,
          },
        },
      },
      'unused-javascript': {
        score: '<1',
        details: {
          overallSavingsBytes: '>=25000',
          overallSavingsMs: '>300',
          items: {
            length: 2,
          },
        },
      },
      'offscreen-images': {
        details: {
          items: [
            {
              url: /lighthouse-unoptimized.jpg$/,
            }, {
              url: /lighthouse-480x320.webp$/,
            }, {
              url: /lighthouse-480x320.webp\?invisible$/,
            }, {
              url: /large.svg$/,
            },
          ],
        },
      },
      'uses-webp-images': {
        details: {
          overallSavingsBytes: '>60000',
          items: {
            length: 4,
          },
        },
      },
      'uses-text-compression': {
        score: '<1',
        details: {
          overallSavingsMs: '>700',
          overallSavingsBytes: '>50000',
          items: {
            length: 2,
          },
        },
      },
      'uses-optimized-images': {
        details: {
          overallSavingsBytes: '>10000',
          items: {
            length: 1,
          },
        },
      },
      'uses-responsive-images': {
        displayValue: 'Potential savings of 75\xa0KB',
        details: {
          overallSavingsBytes: '>75000',
          items: [
            {wastedPercent: '<60'},
            {wastedPercent: '<60'},
            {wastedPercent: '<60'},
          ],
        },
      },
    },
  },
];
