#!/usr/bin/env node

/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/** @fileoverview Read in the snyk snapshot, remove whatever we don't need, write it back */

const {readFileSync, writeFileSync} = require('fs');
const prettyJSONStringify = require('pretty-json-stringify');

const filename = process.argv[2];
if (!filename) throw new Error('No filename provided.');

const data = readFileSync(filename, 'utf8');
const output = cleanAndFormat(data);
JSON.parse(output); // make sure it's parseable
writeFileSync(filename, output, 'utf8');

/** @typedef {import('../audits/dobetterweb/no-vulnerable-libraries.js').SnykDB} SnykDB */

/**
 * @param {string} vulnString
 * @return {string}
 */
function cleanAndFormat(vulnString) {
  const snapshot = /** @type {!SnykDB} */ (JSON.parse(vulnString));
  for (const libEntries of Object.values(snapshot.npm)) {
    libEntries.forEach((entry, i) => {
      const pruned = {
        id: entry.id,
        severity: entry.severity,
        semver: {vulnerable: entry.semver.vulnerable},
      };

      libEntries[i] = pruned;
    });
  }

  // Normal pretty JSON-stringify has too many newlines. This strikes the right signal:noise ratio
  return prettyJSONStringify(snapshot, {
    tab: '  ',
    spaceBeforeColon: '',
    spaceAfterColon: '',
    spaceAfterComma: '',
    spaceInsideObject: '',
    shouldExpand: (_, level) => level < 3,
  });
}
