/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Gatherer = require('../gatherer');
const Driver = require('../../driver.js'); // eslint-disable-line no-unused-vars

const MAX_WAIT_TIMEOUT = 500;

class WebSQL extends Gatherer {
  /**
   * @param {Driver} driver
   * @return {Promise<?LH.Crdp.Database.AddDatabaseEvent>}
   */
  listenForDatabaseEvents(driver) {
    /** @type {NodeJS.Timer} */
    let timeout;

    return new Promise((resolve, reject) => {
      driver.once('Database.addDatabase', db => {
        clearTimeout(timeout);
        driver.sendCommand('Database.disable').then(_ => resolve(db), reject);
      });

      driver.sendCommand('Database.enable').catch(reject);

      // Wait for a websql db to be opened. Reject the Promise no dbs were created.
      // TODO(ericbidelman): this assumes dbs are opened on page load.
      // load. Figure out a better strategy (code greping, user interaction) later.
      timeout = setTimeout(function() {
        resolve(null);
      }, MAX_WAIT_TIMEOUT);
    });
  }

  /**
   * Returns WebSQL database information or null if none was found.
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<LH.Artifacts['WebSQL']>}
   */
  afterPass(passContext) {
    return this.listenForDatabaseEvents(passContext.driver)
      .then(result => {
        return result && result.database;
      });
  }
}

module.exports = WebSQL;
