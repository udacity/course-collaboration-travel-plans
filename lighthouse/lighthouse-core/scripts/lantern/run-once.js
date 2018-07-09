#!/usr/bin/env node
/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const PredictivePerf = require('../../../lighthouse-core/audits/predictive-perf');
const Runner = require('../../../lighthouse-core/runner');
const Simulator = require('../../../lighthouse-core/lib/dependency-graph/simulator/simulator');
const traceSaver = require('../../../lighthouse-core/lib/lantern-trace-saver');

if (process.argv.length !== 4) throw new Error('Usage $0 <trace file> <devtools file>');

async function run() {
  const tracePath = require.resolve(process.argv[2]);
  const traces = {defaultPass: require(tracePath)};
  const devtoolsLogs = {defaultPass: require(process.argv[3])};
  const artifacts = {traces, devtoolsLogs, ...Runner.instantiateComputedArtifacts()};

  // @ts-ignore - We don't need the full artifacts
  const result = await PredictivePerf.audit(artifacts);
  process.stdout.write(JSON.stringify(result.details.items[0], null, 2));

  // Dump the TTI graph with simulated timings to a trace if LANTERN_DEBUG is enabled
  const pessimisticTTINodeTimings = Simulator.ALL_NODE_TIMINGS.get('pessimisticInteractive');
  if (process.env.LANTERN_DEBUG && pessimisticTTINodeTimings) {
    const outputTraceFile = path.basename(tracePath).replace(/.trace.json$/, '.lantern.trace.json');
    const outputTracePath = path.join(__dirname, '../../../.tmp', outputTraceFile);
    const trace = traceSaver.convertNodeTimingsToTrace(pessimisticTTINodeTimings);
    fs.writeFileSync(outputTracePath, JSON.stringify(trace, null, 2));
  }
}

run().catch(err => {
  process.stderr.write(err.stack);
  process.exit(1);
});
