/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const ReportGenerator = require('../lighthouse-core/report/v2/report-generator');
const log = require('lighthouse-logger');

/**
 * An enumeration of acceptable output modes:
 *   'json': JSON formatted results
 *   'html': An HTML report
 */
const OutputMode = {
  json: 'json',
  html: 'html',
};

/**
 * Verify output path to use, either stdout or a file path.
 * @param {string=} path
 * @return {string}
 */
function checkOutputPath(path) {
  if (!path) {
    log.warn('Printer', 'No output path set; using stdout');
    return 'stdout';
  }
  return path;
}

/**
 * Creates the results output in a format based on the `mode`.
 * @param {!LH.Results} results
 * @param {string} outputMode
 * @return {string}
 */
function createOutput(results, outputMode) {
  // HTML report.
  if (outputMode === OutputMode.html) {
    return new ReportGenerator().generateReportHtml(results);
  }
  // JSON report.
  if (outputMode === OutputMode.json) {
    return JSON.stringify(results, null, 2);
  }
  throw new Error('Invalid output mode: ' + outputMode);
}

/**
 * Writes the output to stdout.
 * @param {string} output
 * @return {!Promise<undefined>}
 */
function writeToStdout(output) {
  return new Promise(resolve => {
    // small delay to avoid race with debug() logs
    setTimeout(_ => {
      process.stdout.write(`${output}\n`);
      resolve();
    }, 50);
  });
}

/**
 * Writes the output to a file.
 * @param {string} filePath
 * @param {string} output
 * @param {string} outputMode
 * @return {!Promise<undefined>}
 */
function writeFile(filePath, output, outputMode) {
  return new Promise((resolve, reject) => {
    // TODO: make this mkdir to the filePath.
    fs.writeFile(filePath, output, (err) => {
      if (err) {
        return reject(err);
      }
      log.log('Printer', `${OutputMode[outputMode]} output written to ${filePath}`);
      resolve();
    });
  });
}

/**
 * Writes the results.
 * @param {!LH.Results} results
 * @param {string} mode
 * @param {string} path
 * @return {!Promise<!LH.Results>}
 */
function write(results, mode, path) {
  return new Promise((resolve, reject) => {
    const outputPath = checkOutputPath(path);
    const output = createOutput(results, mode);

    if (outputPath === 'stdout') {
      return writeToStdout(output).then(_ => resolve(results));
    }
    return writeFile(outputPath, output, mode)
      .then(_ => {
        resolve(results);
      })
      .catch(err => reject(err));
  });
}

/**
 * Returns a list of valid output options.
 * @return {!Array<string>}
 */
function getValidOutputOptions() {
  return Object.keys(OutputMode);
}

module.exports = {
  checkOutputPath,
  createOutput,
  write,
  OutputMode,
  getValidOutputOptions,
};
