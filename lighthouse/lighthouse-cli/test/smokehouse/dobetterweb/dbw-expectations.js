/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * Expected Lighthouse audit values for Do Better Web tests.
 */
module.exports = [
  {
    requestedUrl: 'http://localhost:10200/dobetterweb/dbw_tester.html',
    finalUrl: 'http://localhost:10200/dobetterweb/dbw_tester.html',
    audits: {
      'errors-in-console': {
        score: 0,
        details: {
          items: {
            length: 6,
          },
        },
      },
      'is-on-https': {
        score: 0,
        details: {
          items: {
            length: 1,
          },
        },
      },
      'uses-http2': {
        score: 0,
        details: {
          items: {
            length: '>15',
          },
        },
      },
      'external-anchors-use-rel-noopener': {
        score: 0,
        warnings: [/Unable to determine.*<a target="_blank">/],
        details: {
          items: {
            length: 3,
          },
        },
      },
      'appcache-manifest': {
        score: 0,
        displayValue: 'Found "clock.appcache"',
      },
      'geolocation-on-start': {
        score: 0,
      },
      'no-document-write': {
        score: 0,
        details: {
          items: {
            length: 3,
          },
        },
      },
      'no-vulnerable-libraries': {
        score: 0,
        details: {
          items: {
            length: 1,
          },
        },
      },
      'no-websql': {
        score: 0,
        displayValue: 'Found "mydb" (v1.0)',
      },
      'notification-on-start': {
        score: 0,
      },
      'render-blocking-resources': {
        score: '<1',
        rawValue: '>100',
        details: {
          items: {
            length: 7,
          },
        },
      },
      'uses-passive-event-listeners': {
        score: 0,
        details: {
          items: {
            // Note: Originally this was 7 but M56 defaults document-level
            // listeners to passive. See https://www.chromestatus.com/features/5093566007214080
            // Note: It was 4, but {passive:false} doesn't get a warning as of M63: https://crbug.com/770208
            // Note: It was 3, but wheel events are now also passive as of field trial in M71 https://crbug.com/626196
            length: '>=1',
          },
        },
      },
      'deprecations': {
        score: 0,
        details: {
          items: {
            // Note: HTML Imports added to deprecations in m70, so 3 before, 4 after.
            length: '>=3',
          },
        },
      },
      'password-inputs-can-be-pasted-into': {
        score: 0,
        details: {
          items: {
            length: 2,
          },
        },
      },
      'image-aspect-ratio': {
        score: 0,
        details: {
          items: {
            0: {
              displayedAspectRatio: /^480 x 57/,
            },
            length: 1,
          },
        },
      },
      'efficient-animated-content': {
        score: '<0.5',
        details: {
          overallSavingsMs: '>2000',
          items: [
            {
              url: 'http://localhost:10200/dobetterweb/lighthouse-rotating.gif',
              totalBytes: 934285,
              wastedBytes: 682028,
            },
          ],
        },
      },
    },
  },
];
