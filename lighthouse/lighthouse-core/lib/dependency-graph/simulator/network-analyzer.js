/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const INITIAL_CWD = 14 * 1024;

module.exports = class NetworkAnalyzer {
  /**
   * @return {string}
   */
  static get SUMMARY() {
    return '__SUMMARY__';
  }

  /**
   * @param {LH.NetworkRequest[]} records
   * @return {Map<string, LH.NetworkRequest[]>}
   */
  static groupByOrigin(records) {
    const grouped = new Map();
    records.forEach(item => {
      const key = item.origin;
      const group = grouped.get(key) || [];
      group.push(item);
      grouped.set(key, group);
    });
    return grouped;
  }

  /**
   * @param {number[]} values
   * @return {NetworkAnalyzer.Summary}
   */
  static getSummary(values) {
    values.sort((a, b) => a - b);

    return {
      min: values[0],
      max: values[values.length - 1],
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      median: values[Math.floor((values.length - 1) / 2)],
    };
  }

  /**
   * @param {Map<string,number[]>} values
   * @return {Map<string, NetworkAnalyzer.Summary>}
   */
  static summarize(values) {
    const summaryByKey = new Map();
    const allEstimates = [];
    for (const [key, estimates] of values) {
      summaryByKey.set(key, NetworkAnalyzer.getSummary(estimates));
      allEstimates.push(...estimates);
    }

    summaryByKey.set(NetworkAnalyzer.SUMMARY, NetworkAnalyzer.getSummary(allEstimates));
    return summaryByKey;
  }

  /**
   * @param {LH.NetworkRequest[]} records
   * @param {function(any):any} iteratee
   * @return {Map<string, number[]>}
   */
  static _estimateValueByOrigin(records, iteratee) {
    const connectionWasReused = NetworkAnalyzer.estimateIfConnectionWasReused(records);
    const groupedByOrigin = NetworkAnalyzer.groupByOrigin(records);

    const estimates = new Map();
    for (const [origin, originRecords] of groupedByOrigin.entries()) {
      /** @type {number[]} */
      let originEstimates = [];

      for (const record of originRecords) {
        const timing = record._timing;
        if (!timing) continue;

        const value = iteratee({
          record,
          timing,
          connectionReused: connectionWasReused.get(record.requestId),
        });
        if (typeof value !== 'undefined') {
          originEstimates = originEstimates.concat(value);
        }
      }

      if (!originEstimates.length) continue;
      estimates.set(origin, originEstimates);
    }

    return estimates;
  }

  /**
   * Estimates the observed RTT to each origin based on how long the TCP handshake took.
   * This is the most accurate and preferred method of measurement when the data is available.
   *
   * @param {LH.NetworkRequest[]} records
   * @return {Map<string, number[]>}
   */
  static _estimateRTTByOriginViaTCPTiming(records) {
    return NetworkAnalyzer._estimateValueByOrigin(records, ({timing, connectionReused}) => {
      if (connectionReused) return;

      // If the request was SSL we get two estimates, one for the SSL negotiation and another for the
      // regular handshake. SSL can also be more than 1 RT but assume False Start was used.
      if (timing.sslStart > 0 && timing.sslEnd > 0) {
        return [timing.connectEnd - timing.sslStart, timing.sslStart - timing.connectStart];
      } else if (timing.connectStart > 0 && timing.connectEnd > 0) {
        return timing.connectEnd - timing.connectStart;
      }
    });
  }

  /**
   * Estimates the observed RTT to each origin based on how long a download took on a fresh connection.
   * NOTE: this will tend to overestimate the actual RTT quite significantly as the download can be
   * slow for other reasons as well such as bandwidth constraints.
   *
   * @param {LH.NetworkRequest[]} records
   * @return {Map<string, number[]>}
   */
  static _estimateRTTByOriginViaDownloadTiming(records) {
    return NetworkAnalyzer._estimateValueByOrigin(records, ({record, timing, connectionReused}) => {
      if (connectionReused) return;
      // Only look at downloads that went past the initial congestion window
      if (record.transferSize <= INITIAL_CWD) return;
      if (!Number.isFinite(timing.receiveHeadersEnd) || timing.receiveHeadersEnd < 0) return;

      // Compute the amount of time downloading everything after the first congestion window took
      const totalTime = (record.endTime - record.startTime) * 1000;
      const downloadTimeAfterFirstByte = totalTime - timing.receiveHeadersEnd;
      const numberOfRoundTrips = Math.log2(record.transferSize / INITIAL_CWD);

      // Ignore requests that required a high number of round trips since bandwidth starts to play
      // a larger role than latency
      if (numberOfRoundTrips > 5) return;
      return downloadTimeAfterFirstByte / numberOfRoundTrips;
    });
  }

  /**
   * Estimates the observed RTT to each origin based on how long it took until Chrome could
   * start sending the actual request when a new connection was required.
   * NOTE: this will tend to overestimate the actual RTT as the request can be delayed for other
   * reasons as well such as DNS lookup.
   *
   * @param {LH.NetworkRequest[]} records
   * @return {Map<string, number[]>}
   */
  static _estimateRTTByOriginViaSendStartTiming(records) {
    return NetworkAnalyzer._estimateValueByOrigin(records, ({record, timing, connectionReused}) => {
      if (connectionReused) return;
      if (!Number.isFinite(timing.sendStart) || timing.sendStart < 0) return;

      // Assume everything before sendStart was just a TCP handshake
      // 1 RT needed for http, 2 RTs for https
      let roundTrips = 1;
      if (record.parsedURL.scheme === 'https') roundTrips += 1;
      return timing.sendStart / roundTrips;
    });
  }

  /**
   * Given the RTT to each origin, estimates the observed server response times.
   *
   * @param {LH.NetworkRequest[]} records
   * @param {Map<string, number>} rttByOrigin
   * @return {Map<string, number[]>}
   */
  static _estimateResponseTimeByOrigin(records, rttByOrigin) {
    return NetworkAnalyzer._estimateValueByOrigin(records, ({record, timing}) => {
      if (!Number.isFinite(timing.receiveHeadersEnd) || timing.receiveHeadersEnd < 0) return;
      if (!Number.isFinite(timing.sendEnd) || timing.sendEnd < 0) return;

      const ttfb = timing.receiveHeadersEnd - timing.sendEnd;
      const origin = record.origin;
      const rtt = rttByOrigin.get(origin) || rttByOrigin.get(NetworkAnalyzer.SUMMARY) || 0;
      return Math.max(ttfb - rtt, 0);
    });
  }

  /**
   * Returns a map of requestId -> connectionReused, estimating the information if the information
   * available in the records themselves appears untrustworthy.
   *
   * @param {LH.NetworkRequest[]} records
   * @param {object} [options]
   * @return {Map<string, boolean>}
   */
  static estimateIfConnectionWasReused(records, options) {
    options = Object.assign({forceCoarseEstimates: false}, options);

    const connectionIds = new Set(records.map(record => record.connectionId));
    // If the records actually have distinct connectionIds we can reuse these.
    if (!options.forceCoarseEstimates && connectionIds.size > 1) {
      // @ts-ignore
      return new Map(records.map(record => [record.requestId, !!record.connectionReused]));
    }

    // Otherwise we're on our own, a record may not have needed a fresh connection if...
    //   - It was not the first request to the domain
    //   - It was H2
    //   - It was after the first request to the domain ended
    const connectionWasReused = new Map();
    const groupedByOrigin = NetworkAnalyzer.groupByOrigin(records);
    for (const [_, originRecords] of groupedByOrigin.entries()) {
      const earliestReusePossible = originRecords
        .map(record => record.endTime)
        .reduce((a, b) => Math.min(a, b), Infinity);

      for (const record of originRecords) {
        connectionWasReused.set(
          record.requestId,
          record.startTime >= earliestReusePossible || record.protocol === 'h2'
        );
      }

      // TODO(phulce): compute the maximum number of parallel requests (N) and ensure we have at
      // least N requests that required new connections
      const firstRecord = originRecords.reduce((a, b) => (a.startTime > b.startTime ? b : a));
      connectionWasReused.set(firstRecord.requestId, false);
    }

    return connectionWasReused;
  }

  /**
   * Estimates the RTT to each origin by examining observed network timing information.
   * Attempts to use the most accurate information first and falls back to coarser estimates when it
   * is unavailable.
   *
   * @param {LH.NetworkRequest[]} records
   * @param {object} [options]
   * @return {Map<string, !NetworkAnalyzer.Summary>}
   */
  static estimateRTTByOrigin(records, options) {
    options = Object.assign(
      {
        // TCP connection handshake information will be used when available, but for testing
        // it's useful to see how the coarse estimates compare with higher fidelity data
        forceCoarseEstimates: false,
        // coarse estimates include lots of extra time and noise
        // multiply by some factor to deflate the estimates a bit
        coarseEstimateMultiplier: 0.5,
      },
      options
    );

    let estimatesByOrigin = NetworkAnalyzer._estimateRTTByOriginViaTCPTiming(records);
    if (!estimatesByOrigin.size || options.forceCoarseEstimates) {
      estimatesByOrigin = new Map();
      const estimatesViaDownload = NetworkAnalyzer._estimateRTTByOriginViaDownloadTiming(records);
      const estimatesViaSendStart = NetworkAnalyzer._estimateRTTByOriginViaSendStartTiming(records);

      for (const [origin, estimates] of estimatesViaDownload.entries()) {
        estimatesByOrigin.set(origin, estimates);
      }

      for (const [origin, estimates] of estimatesViaSendStart.entries()) {
        const existing = estimatesByOrigin.get(origin) || [];
        estimatesByOrigin.set(origin, existing.concat(estimates));
      }

      for (const estimates of estimatesByOrigin.values()) {
        estimates.forEach((x, i) => (estimates[i] = x * options.coarseEstimateMultiplier));
      }
    }

    if (!estimatesByOrigin.size) throw new Error('No timing information available');
    return NetworkAnalyzer.summarize(estimatesByOrigin);
  }

  /**
   * Estimates the server response time of each origin. RTT times can be passed in or will be
   * estimated automatically if not provided.
   *
   * @param {LH.NetworkRequest[]} records
   * @param {Object=} options
   * @return {Map<string, !NetworkAnalyzer.Summary>}
   */
  static estimateServerResponseTimeByOrigin(records, options) {
    options = Object.assign(
      {
        rttByOrigin: null,
      },
      options
    );

    let rttByOrigin = options.rttByOrigin;
    if (!rttByOrigin) {
      rttByOrigin = NetworkAnalyzer.estimateRTTByOrigin(records, options);
      for (const [origin, summary] of rttByOrigin.entries()) {
        rttByOrigin.set(origin, summary.min);
      }
    }

    const estimatesByOrigin = NetworkAnalyzer._estimateResponseTimeByOrigin(records, rttByOrigin);
    return NetworkAnalyzer.summarize(estimatesByOrigin);
  }
};

/**
 * @typedef NetworkAnalyzer.Summary
 * @property {number} min
 * @property {number} max
 * @property {number} avg
 * @property {number} median
 */
