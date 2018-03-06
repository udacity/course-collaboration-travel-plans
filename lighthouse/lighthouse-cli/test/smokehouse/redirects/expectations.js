/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * Expected Lighthouse audit values for redirects tests
 */
const cacheBuster = Number(new Date());

module.exports = [
  {
    initialUrl: `http://localhost:10200/online-only.html?delay=500&redirect=%2Foffline-only.html%3Fcb=${cacheBuster}%26delay=500%26redirect%3D%2Fredirects-final.html`,
    url: 'http://localhost:10200/redirects-final.html',
    audits: {
      'redirects': {
        score: '<100',
        rawValue: '>=500',
        details: {
          items: {
            length: 3,
          },
        },
      },
    },
  },
  {
    initialUrl: `http://localhost:10200/online-only.html?delay=300&redirect=%2Fredirects-final.html`,
    url: 'http://localhost:10200/redirects-final.html',
    audits: {
      'redirects': {
        score: 100,
        rawValue: '>=250',
        details: {
          items: {
            length: 2,
          },
        },
      },
    },
  },
];
