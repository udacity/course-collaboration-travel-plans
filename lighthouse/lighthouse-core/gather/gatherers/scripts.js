/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('./gatherer');
const NetworkRequest = require('../../lib/network-request');

/**
 * @fileoverview Gets JavaScript file contents.
 */
class Scripts extends Gatherer {
  /**
   * @param {LH.Gatherer.PassContext} passContext
   * @param {LH.Gatherer.LoadData} loadData
   * @return {Promise<LH.Artifacts['Scripts']>}
   */
  async afterPass(passContext, loadData) {
    const driver = passContext.driver;

    /** @type {Object<string, string>} */
    const scriptContentMap = {};
    const scriptRecords = loadData.networkRecords
      .filter(record => record.resourceType === NetworkRequest.TYPES.Script);

    for (const record of scriptRecords) {
      try {
        const content = await driver.getRequestContent(record.requestId);
        if (content) {
          scriptContentMap[record.requestId] = content;
        }
      } catch (e) {}
    }

    return scriptContentMap;
  }
}

module.exports = Scripts;
