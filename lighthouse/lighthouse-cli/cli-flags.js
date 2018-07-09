/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable max-len */

const yargs = require('yargs');
const pkg = require('../package.json');
const printer = require('./printer');

/**
 * @param {string=} manualArgv
 * @return {LH.CliFlags}
 */
function getFlags(manualArgv) {
  // @ts-ignore yargs() is incorrectly typed as not returning itself
  const y = manualArgv ? yargs(manualArgv) : yargs;
  return y.help('help')
      .version(() => pkg.version)
      .showHelpOnFail(false, 'Specify --help for available options')

      .usage('lighthouse <url> <options>')
      .example(
          'lighthouse <url> --view', 'Opens the HTML report in a browser after the run completes')
      .example(
          'lighthouse <url> --config-path=./myconfig.js',
          'Runs Lighthouse with your own configuration: custom audits, report generation, etc.')
      .example(
          'lighthouse <url> --output=json --output-path=./report.json --save-assets',
          'Save trace, screenshots, and named JSON report.')
      .example(
          'lighthouse <url> --disable-device-emulation --throttling-method=provided',
          'Disable device emulation and all throttling')
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
          'config-path', 'preset', 'chrome-flags', 'port', 'hostname',
          'max-wait-for-load', 'enable-error-reporting', 'gather-mode', 'audit-mode',
          'only-audits', 'only-categories', 'skip-audits',
        ],
        'Configuration:')
      .describe({
        // We don't allowlist specific locales. Why? So we can support the user who requests 'es-MX' (unsupported) and we'll fall back to 'es' (supported)
        'locale': 'The locale/language the report should be formatted in',
        'enable-error-reporting':
            'Enables error reporting, overriding any saved preference. --no-enable-error-reporting will do the opposite. More: https://git.io/vFFTO',
        'blocked-url-patterns': 'Block any network requests to the specified URL patterns',
        'disable-storage-reset':
            'Disable clearing the browser cache and other storage APIs before a run',
        'disable-device-emulation': 'Disable Nexus 5X emulation',
        'throttling-method': 'Controls throttling method',
        'throttling.rttMs': 'Controls simulated network RTT (TCP layer)',
        'throttling.throughputKbps': 'Controls simulated network download throughput',
        'throttling.requestLatencyMs': 'Controls emulated network RTT (HTTP layer)',
        'throttling.downloadThroughputKbps': 'Controls emulated network download throughput',
        'throttling.uploadThroughputKbps': 'Controls emulated network upload throughput',
        'throttling.cpuSlowdownMultiplier': 'Controls simulated + emulated CPU throttling',
        'gather-mode':
            'Collect artifacts from a connected browser and save to disk. (Artifacts folder path may optionally be provided). If audit-mode is not also enabled, the run will quit early.',
        'audit-mode': 'Process saved artifacts from disk. (Artifacts folder path may be provided, otherwise defaults to ./latest-run/)',
        'save-assets': 'Save the trace contents & screenshots to disk',
        'list-all-audits': 'Prints a list of all available audits and exits',
        'list-trace-categories': 'Prints a list of all required trace categories and exits',
        'additional-trace-categories':
            'Additional categories to capture with the trace (comma-delimited).',
        'config-path': 'The path to the config JSON.',
        'preset': 'Use a built-in configuration.',
        'chrome-flags':
            `Custom flags to pass to Chrome (space-delimited). For a full list of flags, see http://bit.ly/chrome-flags
            Additionally, use the CHROME_PATH environment variable to use a specific Chrome binary. Requires Chromium version 66.0 or later. If omitted, any detected Chrome Canary or Chrome stable will be used.`,
        'hostname': 'The hostname to use for the debugging protocol.',
        'port': 'The port to use for the debugging protocol. Use 0 for a random port',
        'max-wait-for-load':
            'The timeout (in milliseconds) to wait before the page is considered done loading and the run should continue. WARNING: Very high values can lead to large traces and instability',
        'extra-headers': 'Set extra HTTP Headers to pass with request',
        'only-audits': 'Only run the specified audits',
        'only-categories': 'Only run the specified categories',
        'skip-audits': 'Run everything except these audits',
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
        'disable-storage-reset', 'disable-device-emulation', 'save-assets', 'list-all-audits',
        'list-trace-categories', 'view', 'verbose', 'quiet', 'help',
      ])
      .choices('output', printer.getValidOutputOptions())
      .choices('throttling-method', ['devtools', 'provided', 'simulate'])
      .choices('preset', ['full', 'perf', 'mixed-content'])
      // force as an array
      // note MUST use camelcase versions or only the kebab-case version will be forced
      .array('blockedUrlPatterns')
      .array('onlyAudits')
      .array('onlyCategories')
      .array('skipAudits')
      .array('output')
      .string('extraHeaders')

      // default values
      .default('chrome-flags', '')
      .default('output', ['html'])
      .default('port', 0)
      .default('hostname', 'localhost')
      .default('enable-error-reporting', undefined) // Undefined so prompted by default
      .check(/** @param {LH.CliFlags} argv */ (argv) => {
        // Lighthouse doesn't need a URL if...
        //   - We're in auditMode (and we have artifacts already)
        //   - We're just listing the available options.
        // If one of these don't apply, stop the program and ask for a url.
        const isListMode = argv.listAllAudits || argv.listTraceCategories;
        const isOnlyAuditMode = !!argv.auditMode && !argv.gatherMode;
        if (!isListMode && !isOnlyAuditMode && argv._.length === 0) {
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
