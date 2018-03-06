/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('../gatherer');

/* global fetch, URL, location */

function getRobotsTxtContent() {
  return fetch(new URL('/robots.txt', location.href))
    .then(response => {
      if (!response.ok) {
        return {status: response.status, content: null};
      }

      return response.text()
        .then(content => ({status: response.status, content}));
    })
    .catch(_ => ({status: null, content: null}));
}


class RobotsTxt extends Gatherer {
  /**
   * @param {{driver: !Driver}} options Run options
   * @return {!Promise<!{code: number, content: string}>}
   */
  afterPass(options) {
    return options.driver.evaluateAsync(`(${getRobotsTxtContent.toString()}())`);
  }
}

module.exports = RobotsTxt;
