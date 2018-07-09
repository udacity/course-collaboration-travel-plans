/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview Audits a page to determine whether it contains console errors.
 * This is done by collecting Chrome console log messages and filtering out the non-error ones.
 */

const Audit = require('./audit');

class ErrorLogs extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'errors-in-console',
      title: 'No browser errors logged to the console',
      description: 'Errors logged to the console indicate unresolved problems. ' +
        'They can come from network request failures and other browser concerns.',
      failureTitle: 'Browser errors were logged to the console',
      requiredArtifacts: ['ChromeConsoleMessages', 'RuntimeExceptions'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @return {LH.Audit.Product}
   */
  static audit(artifacts) {
    const consoleEntries = artifacts.ChromeConsoleMessages;
    const runtimeExceptions = artifacts.RuntimeExceptions;
    /** @type {Array<{source: string, description: string|undefined, url: string|undefined}>} */
    const consoleRows =
      consoleEntries.filter(log => log.entry && log.entry.level === 'error')
      .map(item => {
        return {
          source: item.entry.source,
          description: item.entry.text,
          url: item.entry.url,
        };
      });

    const runtimeExRows =
      runtimeExceptions.filter(entry => entry.exceptionDetails !== undefined)
      .map(entry => {
        const description = entry.exceptionDetails.exception ?
          entry.exceptionDetails.exception.description : entry.exceptionDetails.text;

        return {
          source: 'Runtime.exception',
          description,
          url: entry.exceptionDetails.url,
        };
      });

    const tableRows = consoleRows.concat(runtimeExRows);

    const headings = [
      {key: 'url', itemType: 'url', text: 'URL'},
      {key: 'description', itemType: 'code', text: 'Description'},
    ];

    const details = Audit.makeTableDetails(headings, tableRows);
    const numErrors = tableRows.length;

    return {
      score: Number(numErrors === 0),
      rawValue: numErrors,
      details,
    };
  }
}

module.exports = ErrorLogs;
