/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable max-len */

const yargs = require('yargs');
// @ts-ignore
const pkg = require('../package.json');
const Driver = require('../lighthouse-core/gather/driver.js');
const printer = require('./printer');

/**
 * @param {string=} manualArgv
 * @return {!LH.Flags}
 */
function getFlags(manualArgv) {
  // @ts-ignore yargs() is incorrectly typed as not returning itself
  const y = manualArgv ? yargs(manualArgv) : yargs;
  return y.help('help')
      .version(() => pkg.version)
      .showHelpOnFail(false, 'Specify --help for available options')

      .usage('lighthouse <url>')
      .example(
          'lighthouse <url> --view', 'Opens the HTML report in a browser after the run completes')
      .example(
          'lighthouse <url> --config-path=./myconfig.js',
          'Runs Lighthouse with your own configuration: custom audits, report generation, etc.')
      .example(
          'lighthouse <url> --output=json --output-path=./report.json --save-assets',
          'Save trace, screenshots, and named JSON report.')
      .example(
          'lighthouse <url> --disable-device-emulation --disable-network-throttling',
          'Disable device emulation')
      .example(
          'lighthouse <url> --chrome-flags="--window-size=412,732"',
          'Launch Chrome with a specific window size')
      .example(
          'lighthouse <url> --quiet --chrome-flags="--headless"',
          'Launch Headless Chrome, turn off logging')
      .example(
          'lighthouse <url> --extra-headers "{\\"Cookie\\":\\"monster=blue\\", \\"x-men\\":\\"wolverine\\"}"',
          'Stringify\'d JSON HTTP Header key/value pairs to send in requests')
      .example(
          'lighthouse <url> --extra-headers=./path/to/file.json',
          'Path to JSON file of HTTP Header key/value pairs to send in requests')

      // List of options
      .group(['verbose', 'quiet'], 'Logging:')
      .describe({
        verbose: 'Displays verbose logging',
        quiet: 'Displays no progress, debug logs or errors',
      })

      .group(
        [
          'save-assets', 'list-all-audits', 'list-trace-categories', 'additional-trace-categories',
          'config-path', 'chrome-flags', 'perf', 'mixed-content', 'port', 'hostname',
          'max-wait-for-load', 'enable-error-reporting', 'gather-mode', 'audit-mode',
        ],
        'Configuration:')
      .describe({
        'enable-error-reporting':
            'Enables error reporting, overriding any saved preference. --no-enable-error-reporting will do the opposite. More: https://git.io/vFFTO',
        'blocked-url-patterns': 'Block any network requests to the specified URL patterns',
        'disable-storage-reset':
            'Disable clearing the browser cache and other storage APIs before a run',
        'disable-device-emulation': 'Disable Nexus 5X emulation',
        'disable-cpu-throttling': 'Disable CPU throttling',
        'disable-network-throttling': 'Disable network throttling',
        'gather-mode':
            'Collect artifacts from a connected browser and save to disk. If audit-mode is not also enabled, the run will quit early.',
        'audit-mode': 'Process saved artifacts from disk',
        'save-assets': 'Save the trace contents & screenshots to disk',
        'list-all-audits': 'Prints a list of all available audits and exits',
        'list-trace-categories': 'Prints a list of all required trace categories and exits',
        'additional-trace-categories':
            'Additional categories to capture with the trace (comma-delimited).',
        'config-path': 'The path to the config JSON.',
        'mixed-content': 'Use the mixed-content auditing configuration.',
        'chrome-flags':
            `Custom flags to pass to Chrome (space-delimited). For a full list of flags, see http://bit.ly/chrome-flags
            Additionally, use the CHROME_PATH environment variable to use a specific Chrome binary. Requires Chromium version 54.0 or later. If omitted, any detected Chrome Canary or Chrome stable will be used.`,
        'perf': 'Use a performance-test-only configuration',
        'hostname': 'The hostname to use for the debugging protocol.',
        'port': 'The port to use for the debugging protocol. Use 0 for a random port',
        'max-wait-for-load':
            'The timeout (in milliseconds) to wait before the page is considered done loading and the run should continue. WARNING: Very high values can lead to large traces and instability',
        'extra-headers': 'Set extra HTTP Headers to pass with request',
      })
      // set aliases
      .alias({'gather-mode': 'G', 'audit-mode': 'A'})

      .group(['output', 'output-path', 'view'], 'Output:')
      .describe({
        'output': `Reporter for the results, supports multiple values`,
        'output-path': `The file path to output the results. Use 'stdout' to write to stdout.
  If using JSON output, default is stdout.
  If using HTML output, default is a file in the working directory with a name based on the test URL and date.
  If using multiple outputs, --output-path is ignored.
  Example: --output-path=./lighthouse-results.html`,
        'view': 'Open HTML report in your browser',
      })

      // boolean values
      .boolean([
        'disable-storage-reset', 'disable-device-emulation', 'disable-cpu-throttling',
        'disable-network-throttling', 'save-assets', 'list-all-audits',
        'list-trace-categories', 'perf', 'view', 'verbose', 'quiet', 'help',
        'gather-mode', 'audit-mode', 'mixed-content',
      ])
      .choices('output', printer.getValidOutputOptions())
      // force as an array
      .array('blocked-url-patterns')
      .string('extra-headers')

      // default values
      .default('chrome-flags', '')
      .default('disable-cpu-throttling', false)
      .default('output', 'html')
      .default('port', 0)
      .default('hostname', 'localhost')
      .default('max-wait-for-load', Driver.MAX_WAIT_FOR_FULLY_LOADED)
      .check(/** @param {!LH.Flags} argv */ (argv) => {
        // Make sure lighthouse has been passed a url, or at least one of --list-all-audits
        // or --list-trace-categories. If not, stop the program and ask for a url
        if (!argv.listAllAudits && !argv.listTraceCategories && argv._.length === 0) {
          throw new Error('Please provide a url');
        }

        return true;
      })
      .epilogue(
          'For more information on Lighthouse, see https://developers.google.com/web/tools/lighthouse/.')
      .wrap(yargs.terminalWidth())
      .argv;
}

module.exports = {
  getFlags,
};
