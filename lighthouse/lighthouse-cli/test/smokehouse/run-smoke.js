/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-disable no-console */
const {promisify} = require('util');
const execAsync = promisify(require('child_process').exec);

const {server, serverForOffline} = require('../fixtures/static-server');
const log = require('lighthouse-logger');

const purpleify = str => `${log.purple}${str}${log.reset}`;
const smokehouseDir = 'lighthouse-cli/test/smokehouse/';

/**
 * @typedef {object} SmoketestDfn
 * @property {string} id
 * @property {string} expectations
 * @property {string} config
 * @property {string | undefined} batch
 */

/** @type {Array<SmoketestDfn>} */
const SMOKETESTS = [{
  id: 'ally',
  config: smokehouseDir + 'a11y/a11y-config.js',
  expectations: 'a11y/expectations.js',
  batch: 'parallel-first',
}, {
  id: 'pwa',
  expectations: smokehouseDir + 'pwa-expectations.js',
  config: smokehouseDir + 'pwa-config.js',
  batch: 'parallel-second',
}, {
  id: 'pwa2',
  expectations: smokehouseDir + 'pwa2-expectations.js',
  config: smokehouseDir + 'pwa-config.js',
  batch: 'parallel-second',
}, {
  id: 'pwa3',
  expectations: smokehouseDir + 'pwa3-expectations.js',
  config: smokehouseDir + 'pwa-config.js',
  batch: 'parallel-first',
}, {
  id: 'dbw',
  expectations: 'dobetterweb/dbw-expectations.js',
  config: smokehouseDir + 'dbw-config.js',
  batch: 'parallel-second',
}, {
  id: 'redirects',
  expectations: 'redirects/expectations.js',
  config: smokehouseDir + 'redirects-config.js',
  batch: 'parallel-first',
}, {
  id: 'seo',
  expectations: 'seo/expectations.js',
  config: smokehouseDir + 'seo-config.js',
  batch: 'parallel-first',
}, {
  id: 'offline',
  expectations: 'offline-local/offline-expectations.js',
  config: smokehouseDir + 'offline-config.js',
  batch: 'offline',
}, {
  id: 'byte',
  expectations: 'byte-efficiency/expectations.js',
  config: smokehouseDir + 'byte-config.js',
  batch: 'perf-opportunity',
}, {
  id: 'perf',
  expectations: 'perf/expectations.js',
  config: 'lighthouse-core/config/perf-config.js',
  batch: 'perf-metric',
}, {
  id: 'tti',
  expectations: 'tricky-tti/expectations.js',
  config: 'lighthouse-core/config/perf-config.js',
  batch: 'parallel-second',
}];

/**
 * Display smokehouse output from child process
 * @param {{id: string, process: NodeJS.Process} || {id: string, error: Error & {stdout : NodeJS.WriteStream, stderr: NodeJS.WriteStream}}} result
 */
function displaySmokehouseOutput(result) {
  console.log(`\n${purpleify(result.id)} smoketest results:`);
  if (result.error) {
    console.log(result.error.message);
    process.stdout.write(result.error.stdout);
    process.stderr.write(result.error.stderr);
  } else {
    process.stdout.write(result.process.stdout);
    process.stderr.write(result.process.stderr);
  }
  console.timeEnd(`smoketest-${result.id}`);
  console.log(`${purpleify(result.id)} smoketest complete. \n`);
  return result;
}

/**
 * Run smokehouse in child processes for selected smoketests
 * Display output from each as soon as they finish, but resolve function when ALL are complete
 * @param {Array<SmoketestDfn>} smokes
 * @return {Promise<Array<{id: string, error?: Error}>>}
 */
async function runSmokehouse(smokes) {
  const cmdPromises = [];
  for (const {id, expectations, config} of smokes) {
    console.log(`${purpleify(id)} smoketest starting…`);
    console.time(`smoketest-${id}`);
    const cmd = [
      'node lighthouse-cli/test/smokehouse/smokehouse.js',
      `--config-path=${config}`,
      `--expectations-path=${expectations}`,
    ].join(' ');

    // The promise ensures we output immediately, even if the process errors
    const p = execAsync(cmd, {timeout: 6 * 60 * 1000, encoding: 'utf8'})
      .then(cp => ({id: id, process: cp}))
      .catch(err => ({id: id, error: err}))
      .then(result => displaySmokehouseOutput(result));

    // If the machine is terribly slow, we'll run all smoketests in succession, not parallel
    if (process.env.APPVEYOR) {
      await p;
    }
    cmdPromises.push(p);
  }

  return Promise.all(cmdPromises);
}

/**
 * Determine batches of smoketests to run, based on argv
 * @param {string[]} argv
 * @return {Map<string|undefined, Array<SmoketestDfn>>}
 */
function getSmoketestBatches(argv) {
  let smokes = [];
  const usage = `    ${log.dim}yarn smoke ${SMOKETESTS.map(t => t.id).join(' ')}${log.reset}\n`;

  if (argv.length === 0) {
    smokes = SMOKETESTS;
    console.log('Running ALL smoketests. Equivalent to:');
    console.log(usage);
  } else {
    smokes = SMOKETESTS.filter(test => argv.includes(test.id));
    console.log(`Running ONLY smoketests for: ${smokes.map(t => t.id).join(' ')}\n`);
  }

  const unmatchedIds = argv.filter(requestedId => !SMOKETESTS.map(t => t.id).includes(requestedId));
  if (unmatchedIds.length) {
    console.log(log.redify(`Smoketests not found for: ${unmatchedIds.join(' ')}`));
    console.log(usage);
  }

  // Split into serial batches that will run their tests concurrently
  const batches = smokes.reduce((map, test) => {
    const batch = map.get(test.batch) || [];
    batch.push(test);
    return map.set(test.batch, batch);
  }, new Map());

  return batches;
}

/**
 * Main function. Run webservers, smokehouse, then report on failures
 */
async function cli() {
  server.listen(10200, 'localhost');
  serverForOffline.listen(10503, 'localhost');

  const argv = process.argv.slice(2);
  const batches = getSmoketestBatches(argv);

  const smokeDefns = new Map();
  const smokeResults = [];
  for (const [batchName, batch] of batches) {
    console.log(`Smoketest batch: ${batchName || 'default'}`);
    for (const defn of batch) {
      smokeDefns.set(defn.id, defn);
    }

    const results = await runSmokehouse(batch);
    smokeResults.push(...results);
  }

  let failingTests = smokeResults.filter(result => !!result.error);

  // Automatically retry failed tests in CI to prevent flakes
  if (failingTests.length && (process.env.RETRY_SMOKES || process.env.CI)) {
    console.log('Retrying failed tests...');
    for (const failedResult of failingTests) {
      const resultIndex = smokeResults.indexOf(failedResult);
      const smokeDefn = smokeDefns.get(failedResult.id);
      smokeResults[resultIndex] = (await runSmokehouse([smokeDefn]))[0];
    }
  }

  failingTests = smokeResults.filter(result => !!result.error);

  await new Promise(resolve => server.close(resolve));
  await new Promise(resolve => serverForOffline.close(resolve));

  if (failingTests.length) {
    const testNames = failingTests.map(t => t.id).join(', ');
    console.error(log.redify(`We have ${failingTests.length} failing smoketests: ${testNames}`));
    process.exit(1);
  }

  process.exit(0);
}

cli().catch(e => {
  console.error(e);
  process.exit(1);
});
