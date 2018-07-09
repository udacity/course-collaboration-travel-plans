/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ComputedArtifact = require('./computed-artifact');
const NetworkAnalyzer = require('../../lib/dependency-graph/simulator/network-analyzer');

class NetworkAnalysis extends ComputedArtifact {
  get name() {
    return 'NetworkAnalysis';
  }

  /**
   * @param {Array<LH.Artifacts.NetworkRequest>} records
   * @return {LH.Artifacts.NetworkAnalysis}
   */
  static computeRTTAndServerResponseTime(records) {
    // First pass compute the estimated observed RTT to each origin's servers.
    /** @type {Map<string, number>} */
    const rttByOrigin = new Map();
    for (const [origin, summary] of NetworkAnalyzer.estimateRTTByOrigin(records).entries()) {
      rttByOrigin.set(origin, summary.min);
    }

    // We'll use the minimum RTT as the assumed connection latency since we care about how much addt'l
    // latency each origin introduces as Lantern will be simulating with its own connection latency.
    const minimumRtt = Math.min(...Array.from(rttByOrigin.values()));
    // We'll use the observed RTT information to help estimate the server response time
    const responseTimeSummaries = NetworkAnalyzer.estimateServerResponseTimeByOrigin(records, {
      rttByOrigin,
    });

    /** @type {Map<string, number>} */
    const additionalRttByOrigin = new Map();
    /** @type {Map<string, number>} */
    const serverResponseTimeByOrigin = new Map();
    for (const [origin, summary] of responseTimeSummaries.entries()) {
      /** @type {number} */
      // @ts-ignore - satisfy the type checker that entry exists.
      const rttForOrigin = rttByOrigin.get(origin);
      additionalRttByOrigin.set(origin, rttForOrigin - minimumRtt);
      serverResponseTimeByOrigin.set(origin, summary.median);
    }

    return {rtt: minimumRtt, additionalRttByOrigin, serverResponseTimeByOrigin, throughput: 0};
  }

  /**
   * @param {LH.DevtoolsLog} devtoolsLog
   * @param {LH.ComputedArtifacts} computedArtifacts
   * @return {Promise<LH.Artifacts.NetworkAnalysis>}
   */
  async compute_(devtoolsLog, computedArtifacts) {
    const records = await computedArtifacts.requestNetworkRecords(devtoolsLog);
    const throughput = await computedArtifacts.requestNetworkThroughput(devtoolsLog);
    const rttAndServerResponseTime = NetworkAnalysis.computeRTTAndServerResponseTime(records);
    rttAndServerResponseTime.throughput = throughput * 8; // convert from KBps to Kbps
    return rttAndServerResponseTime;
  }
}

module.exports = NetworkAnalysis;
