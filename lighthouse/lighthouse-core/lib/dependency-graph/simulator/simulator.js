/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Node = require('../node');
const NetworkNode = require('../network-node'); // eslint-disable-line no-unused-vars
const CpuNode = require('../cpu-node'); // eslint-disable-line no-unused-vars
const TcpConnection = require('./tcp-connection');
const ConnectionPool = require('./connection-pool');
const emulation = require('../../emulation').settings;

// see https://cs.chromium.org/search/?q=kDefaultMaxNumDelayableRequestsPerClient&sq=package:chromium&type=cs
const DEFAULT_MAXIMUM_CONCURRENT_REQUESTS = 10;

// Fast 3G emulation target from DevTools, WPT 3G - Fast setting
const DEFAULT_RTT = emulation.TYPICAL_MOBILE_THROTTLING_METRICS.targetLatency;
const DEFAULT_THROUGHPUT = emulation.TYPICAL_MOBILE_THROTTLING_METRICS.targetDownloadThroughput * 8; // 1.6 Mbps

// same multiplier as Lighthouse uses for CPU emulation
const DEFAULT_CPU_TASK_MULTIPLIER = emulation.CPU_THROTTLE_METRICS.rate;
// layout tasks tend to be less CPU-bound and do not experience the same increase in duration
const DEFAULT_LAYOUT_TASK_MULTIPLIER = DEFAULT_CPU_TASK_MULTIPLIER / 2;
// if a task takes more than 10 seconds it's usually a sign it isn't actually CPU bound and we're overestimating
const DEFAULT_MAXIMUM_CPU_TASK_DURATION = 10000;

const NodeState = {
  NotReadyToStart: 0,
  ReadyToStart: 1,
  InProgress: 2,
  Complete: 3,
};

class Simulator {
  /**
   * @param {Node} graph
   * @param {SimulationOptions} [options]
   */
  constructor(graph, options) {
    this._graph = graph;
    this._options = Object.assign(
      {
        rtt: DEFAULT_RTT,
        throughput: DEFAULT_THROUGHPUT,
        maximumConcurrentRequests: DEFAULT_MAXIMUM_CONCURRENT_REQUESTS,
        cpuTaskMultiplier: DEFAULT_CPU_TASK_MULTIPLIER,
        layoutTaskMultiplier: DEFAULT_LAYOUT_TASK_MULTIPLIER,
      },
      options
    );

    this._rtt = this._options.rtt;
    this._throughput = this._options.throughput;
    this._maximumConcurrentRequests = Math.min(
      TcpConnection.maximumSaturatedConnections(this._rtt, this._throughput),
      this._options.maximumConcurrentRequests
    );
    this._cpuTaskMultiplier = this._options.cpuTaskMultiplier;
    this._layoutTaskMultiplier = this._options.layoutTaskMultiplier;

    this._nodeTiming = new Map();
    this._numberInProgressByType = new Map();
    this._nodes = {};
    // @ts-ignore
    this._connectionPool = /** @type {ConnectionPool} */ (null);
  }

  /**
   *
   */
  _initializeConnectionPool() {
    /** @type {LH.NetworkRequest[]} */
    const records = [];
    this._graph.getRootNode().traverse(node => {
      if (node.type === Node.TYPES.NETWORK) {
        records.push((/** @type {NetworkNode} */ (node)).record);
      }
    });

    this._connectionPool = new ConnectionPool(records, this._options);
  }

  /**
   * Initializes the various state data structures such as _nodesReadyToStart and _nodesCompleted.
   */
  _initializeAuxiliaryData() {
    this._nodeTiming = new Map();
    this._numberInProgressByType = new Map();

    this._nodes = {};
    for (const key of Object.keys(NodeState)) {
      this._nodes[NodeState[key]] = new Set();
    }
  }

  /**
   * @param {string} type
   * @return {number}
   */
  _numberInProgress(type) {
    return this._numberInProgressByType.get(type) || 0;
  }

  /**
   * @param {Node} node
   * @param {NodeTimingData} values
   */
  _setTimingData(node, values) {
    const timingData = this._nodeTiming.get(node) || {};
    Object.assign(timingData, values);
    this._nodeTiming.set(node, timingData);
  }

  /**
   * @param {Node} node
   * @param {number} queuedTime
   */
  _markNodeAsReadyToStart(node, queuedTime) {
    this._nodes[NodeState.ReadyToStart].add(node);
    this._nodes[NodeState.NotReadyToStart].delete(node);
    this._setTimingData(node, {queuedTime});
  }

  /**
   * @param {Node} node
   * @param {number} startTime
   */
  _markNodeAsInProgress(node, startTime) {
    this._nodes[NodeState.InProgress].add(node);
    this._nodes[NodeState.ReadyToStart].delete(node);
    this._numberInProgressByType.set(node.type, this._numberInProgress(node.type) + 1);
    this._setTimingData(node, {startTime});
  }

  /**
   * @param {Node} node
   * @param {number} endTime
   */
  _markNodeAsComplete(node, endTime) {
    this._nodes[NodeState.Complete].add(node);
    this._nodes[NodeState.InProgress].delete(node);
    this._numberInProgressByType.set(node.type, this._numberInProgress(node.type) - 1);
    this._setTimingData(node, {endTime});

    // Try to add all its dependents to the queue
    for (const dependent of node.getDependents()) {
      // Skip dependent node if one of its dependencies hasn't finished yet
      const dependencies = dependent.getDependencies();
      if (dependencies.some(dep => !this._nodes[NodeState.Complete].has(dep))) continue;

      // Otherwise add it to the queue
      this._markNodeAsReadyToStart(dependent, endTime);
    }
  }

  /**
   * @param {Node} node
   * @param {number} totalElapsedTime
   */
  _startNodeIfPossible(node, totalElapsedTime) {
    if (node.type === Node.TYPES.CPU) {
      // Start a CPU task if there's no other CPU task in process
      if (this._numberInProgress(node.type) === 0) {
        this._markNodeAsInProgress(node, totalElapsedTime);
        this._setTimingData(node, {timeElapsed: 0});
      }

      return;
    }

    if (node.type !== Node.TYPES.NETWORK) throw new Error('Unsupported');

    // Start a network request if we're not at max requests and a connection is available
    const numberOfActiveRequests = this._numberInProgress(node.type);
    if (numberOfActiveRequests >= this._maximumConcurrentRequests) return;
    const connection = this._connectionPool.acquire((/** @type {NetworkNode} */ (node)).record);
    if (!connection) return;

    this._markNodeAsInProgress(node, totalElapsedTime);
    this._setTimingData(node, {
      timeElapsed: 0,
      timeElapsedOvershoot: 0,
      bytesDownloaded: 0,
    });
  }

  /**
   * Updates each connection in use with the available throughput based on the number of network requests
   * currently in flight.
   */
  _updateNetworkCapacity() {
    for (const connection of this._connectionPool.connectionsInUse()) {
      connection.setThroughput(this._throughput / this._nodes[NodeState.InProgress].size);
    }
  }

  /**
   * Estimates the number of milliseconds remaining given current condidtions before the node is complete.
   * @param {Node} node
   * @return {number}
   */
  _estimateTimeRemaining(node) {
    if (node.type === Node.TYPES.CPU) {
      const timingData = this._nodeTiming.get(node);
      const multiplier = (/** @type {CpuNode} */ (node)).didPerformLayout()
        ? this._layoutTaskMultiplier
        : this._cpuTaskMultiplier;
      const totalDuration = Math.min(
        Math.round((/** @type {CpuNode} */ (node)).event.dur / 1000 * multiplier),
        DEFAULT_MAXIMUM_CPU_TASK_DURATION
      );
      const estimatedTimeElapsed = totalDuration - timingData.timeElapsed;
      this._setTimingData(node, {estimatedTimeElapsed});
      return estimatedTimeElapsed;
    }

    if (node.type !== Node.TYPES.NETWORK) throw new Error('Unsupported');

    const record = (/** @type {NetworkNode} */ (node)).record;
    const timingData = this._nodeTiming.get(node);
    const connection = /** @type {TcpConnection} */ (this._connectionPool.acquire(record));
    const calculation = connection.simulateDownloadUntil(
      record.transferSize - timingData.bytesDownloaded,
      {timeAlreadyElapsed: timingData.timeElapsed, maximumTimeToElapse: Infinity}
    );

    const estimatedTimeElapsed = calculation.timeElapsed + timingData.timeElapsedOvershoot;
    this._setTimingData(node, {estimatedTimeElapsed});
    return estimatedTimeElapsed;
  }

  /**
   * Computes and returns the minimum estimated completion time of the nodes currently in progress.
   * @return {number}
   */
  _findNextNodeCompletionTime() {
    let minimumTime = Infinity;
    for (const node of this._nodes[NodeState.InProgress]) {
      minimumTime = Math.min(minimumTime, this._estimateTimeRemaining(node));
    }

    return minimumTime;
  }

  /**
   * Given a time period, computes the progress toward completion that the node made durin that time.
   * @param {Node} node
   * @param {number} timePeriodLength
   * @param {number} totalElapsedTime
   */
  _updateProgressMadeInTimePeriod(node, timePeriodLength, totalElapsedTime) {
    const timingData = this._nodeTiming.get(node);
    const isFinished = timingData.estimatedTimeElapsed === timePeriodLength;

    if (node.type === Node.TYPES.CPU) {
      return isFinished
        ? this._markNodeAsComplete(node, totalElapsedTime)
        : (timingData.timeElapsed += timePeriodLength);
    }

    if (node.type !== Node.TYPES.NETWORK) throw new Error('Unsupported');

    const record = (/** @type {NetworkNode} */ (node)).record;
    const connection = /** @type {TcpConnection} */ (this._connectionPool.acquire(record));
    const calculation = connection.simulateDownloadUntil(
      record.transferSize - timingData.bytesDownloaded,
      {
        timeAlreadyElapsed: timingData.timeElapsed,
        maximumTimeToElapse: timePeriodLength - timingData.timeElapsedOvershoot,
      }
    );

    connection.setCongestionWindow(calculation.congestionWindow);
    connection.setH2OverflowBytesDownloaded(calculation.extraBytesDownloaded);

    if (isFinished) {
      connection.setWarmed(true);
      this._connectionPool.release(record);
      this._markNodeAsComplete(node, totalElapsedTime);
    } else {
      timingData.timeElapsed += calculation.timeElapsed;
      timingData.timeElapsedOvershoot += calculation.timeElapsed - timePeriodLength;
      timingData.bytesDownloaded += calculation.bytesDownloaded;
    }
  }

  /**
   * Estimates the time taken to process all of the graph's nodes.
   * @return {{timeInMs: number, nodeTiming: Map<Node, NodeTimingData>}}
   */
  simulate() {
    // initialize the necessary data containers
    this._initializeConnectionPool();
    this._initializeAuxiliaryData();

    const nodesNotReadyToStart = this._nodes[NodeState.NotReadyToStart];
    const nodesReadyToStart = this._nodes[NodeState.ReadyToStart];
    const nodesInProgress = this._nodes[NodeState.InProgress];

    const rootNode = this._graph.getRootNode();
    rootNode.traverse(node => nodesNotReadyToStart.add(node));

    let totalElapsedTime = 0;
    let iteration = 0;

    // root node is always ready to start
    this._markNodeAsReadyToStart(rootNode, totalElapsedTime);

    // loop as long as we have nodes in the queue or currently in progress
    while (nodesReadyToStart.size || nodesInProgress.size) {
      // move all possible queued nodes to in progress
      for (const node of nodesReadyToStart) {
        this._startNodeIfPossible(node, totalElapsedTime);
      }

      // set the available throughput for all connections based on # inflight
      this._updateNetworkCapacity();

      // find the time that the next node will finish
      const minimumTime = this._findNextNodeCompletionTime();
      totalElapsedTime += minimumTime;

      // While this is no longer strictly necessary, it's always better than LH hanging
      if (!Number.isFinite(minimumTime) || iteration > 100000) {
        throw new Error('Graph creation failed, depth exceeded');
      }

      iteration++;
      // update how far each node will progress until that point
      for (const node of nodesInProgress) {
        this._updateProgressMadeInTimePeriod(node, minimumTime, totalElapsedTime);
      }
    }

    return {
      timeInMs: totalElapsedTime,
      nodeTiming: this._nodeTiming,
    };
  }
}

module.exports = Simulator;

/**
 * @typedef NodeTimingData
 * @property {number} [startTime]
 * @property {number} [endTime]
 * @property {number} [queuedTime]
 * @property {number} [estimatedTimeElapsed]
 * @property {number} [timeElapsed]
 * @property {number} [timeElapsedOvershoot]
 * @property {number} [bytesDownloaded]
 */

/**
 * @typedef SimulationOptions
 * @property {number} [rtt]
 * @property {number} [throughput]
 * @property {number} [fallbackTTFB]
 * @property {number} [maximumConcurrentRequests]
 * @property {number} [cpuTaskMultiplier]
 * @property {number} [layoutTaskMultiplier]
 */

