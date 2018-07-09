/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const commands = require('./commands/commands.js');
const printer = require('./printer.js');
const getFlags = require('./cli-flags.js').getFlags;
const runLighthouse = require('./run').runLighthouse;

const log = require('lighthouse-logger');
const pkg = require('../package.json');
const Sentry = require('../lighthouse-core/lib/sentry');

const updateNotifier = require('update-notifier');
const askPermission = require('./sentry-prompt').askPermission;

/**
 * @return {boolean}
 */
function isDev() {
  return fs.existsSync(path.join(__dirname, '../.git'));
}

// Tell user if there's a newer version of LH.
updateNotifier({pkg}).notify();

const cliFlags = getFlags();

// Process terminating command
if (cliFlags.listAllAudits) {
  commands.listAudits();
}

// Process terminating command
if (cliFlags.listTraceCategories) {
  commands.listTraceCategories();
}

const url = cliFlags._[0];

/** @type {LH.Config.Json|undefined} */
let config;
if (cliFlags.configPath) {
  // Resolve the config file path relative to where cli was called.
  cliFlags.configPath = path.resolve(process.cwd(), cliFlags.configPath);
  config = /** @type {LH.Config.Json} */ (require(cliFlags.configPath));
} else if (cliFlags.preset) {
  if (cliFlags.preset === 'mixed-content') {
    // The mixed-content audits require headless Chrome (https://crbug.com/764505).
    cliFlags.chromeFlags = `${cliFlags.chromeFlags} --headless`;
  }

  config = require(`../lighthouse-core/config/${cliFlags.preset}-config.js`);
}

// set logging preferences
cliFlags.logLevel = 'info';
if (cliFlags.verbose) {
  cliFlags.logLevel = 'verbose';
} else if (cliFlags.quiet) {
  cliFlags.logLevel = 'silent';
}
log.setLevel(cliFlags.logLevel);

if (
  cliFlags.output.length === 1 &&
  cliFlags.output[0] === printer.OutputMode.json &&
  !cliFlags.outputPath
) {
  cliFlags.outputPath = 'stdout';
}

if (cliFlags.extraHeaders) {
  // TODO: LH.Flags.extraHeaders is actually a string at this point, but needs to be
  // copied over to LH.Settings.extraHeaders, which is LH.Crdp.Network.Headers. Force
  // the conversion here, but long term either the CLI flag or the setting should have
  // a different name.
  // @ts-ignore
  let extraHeadersStr = /** @type {string} */ (cliFlags.extraHeaders);
  // If not a JSON object, assume it's a path to a JSON file.
  if (extraHeadersStr.substr(0, 1) !== '{') {
    extraHeadersStr = fs.readFileSync(extraHeadersStr, 'utf-8');
  }

  cliFlags.extraHeaders = JSON.parse(extraHeadersStr);
}

/**
 * @return {Promise<LH.RunnerResult|void>}
 */
function run() {
  return Promise.resolve()
    .then(_ => {
      // By default, cliFlags.enableErrorReporting is undefined so the user is
      // prompted. This can be overriden with an explicit flag or by the cached
      // answer returned by askPermission().
      if (typeof cliFlags.enableErrorReporting === 'undefined') {
        return askPermission().then(answer => {
          cliFlags.enableErrorReporting = answer;
        });
      }
    })
    .then(_ => {
      Sentry.init({
        url,
        flags: cliFlags,
        environmentData: {
          name: 'redacted', // prevent sentry from using hostname
          environment: isDev() ? 'development' : 'production',
          release: pkg.version,
          tags: {
            channel: 'cli',
          },
        },
      });

      return runLighthouse(url, cliFlags, config);
    });
}

module.exports = {
  run,
};
