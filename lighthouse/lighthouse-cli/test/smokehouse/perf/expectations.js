/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * Expected Lighthouse audit values for --preset=perf tests
 */
module.exports = [
  {
    requestedUrl: 'http://localhost:10200/preload.html',
    finalUrl: 'http://localhost:10200/preload.html',
    audits: {
      'speed-index': {
        score: '>=0.80',
      },
      'first-meaningful-paint': {
        score: '>=0.90',
      },
      'first-cpu-idle': {
        score: '>=0.90',
      },
      'interactive': {
        score: '>=0.90',
      },
      'time-to-first-byte': {
        // Can be flaky, so test float rawValue instead of boolean score
        rawValue: '<1000',
      },
      'network-requests': {
        details: {
          items: {
            length: '>5',
          },
        },
      },
      'uses-rel-preload': {
        score: '<1',
        rawValue: '>500',
        details: {
          items: {
            length: 1,
          },
        },
      },
      'uses-rel-preconnect': {
        score: '<1',
        details: {
          items: {
            length: 1,
          },
        },
      },
    },
  },
  {
    requestedUrl: 'http://localhost:10200/perf/fonts.html',
    finalUrl: 'http://localhost:10200/perf/fonts.html',
    audits: {
      'font-display': {
        score: 0,
        rawValue: false,
        details: {
          items: {
            length: 2,
          },
        },
      },
    },
  },
];
