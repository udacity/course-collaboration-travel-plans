/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
// @ts-nocheck
'use strict';

const NetworkManager = require('./web-inspector').NetworkManager;
const EventEmitter = require('events').EventEmitter;
const log = require('lighthouse-logger');

const IGNORED_NETWORK_SCHEMES = ['data', 'ws'];

class NetworkRecorder extends EventEmitter {
  /**
   * Creates an instance of NetworkRecorder.
   * @param {!Array} recordArray
   */
  constructor(recordArray) {
    super();

    this._records = recordArray;
    this.networkManager = NetworkManager.createWithFakeTarget();

    this.networkManager.addEventListener(
      this.EventTypes.RequestStarted,
      this.onRequestStarted.bind(this)
    );
    this.networkManager.addEventListener(
      this.EventTypes.RequestFinished,
      this.onRequestFinished.bind(this)
    );
  }

  get EventTypes() {
    return NetworkManager.Events;
  }

  isIdle() {
    return !!this._getActiveIdlePeriod(0);
  }

  is2Idle() {
    return !!this._getActiveIdlePeriod(2);
  }

  _getActiveIdlePeriod(allowedRequests) {
    const quietPeriods = NetworkRecorder.findNetworkQuietPeriods(this._records, allowedRequests);
    return quietPeriods.find(period => !Number.isFinite(period.end));
  }

  _emitNetworkStatus() {
    const zeroQuiet = this._getActiveIdlePeriod(0);
    const twoQuiet = this._getActiveIdlePeriod(2);

    if (twoQuiet && zeroQuiet) {
      log.verbose('NetworkRecorder', 'network fully-quiet');
      this.emit('network-2-idle');
      this.emit('networkidle');
    } else if (twoQuiet && !zeroQuiet) {
      log.verbose('NetworkRecorder', 'network semi-quiet');
      this.emit('network-2-idle');
      this.emit('networkbusy');
    } else {
      log.verbose('NetworkRecorder', 'network busy');
      this.emit('network-2-busy');
      this.emit('networkbusy');
    }
  }

  /**
   * Finds all time periods where the number of inflight requests is less than or equal to the
   * number of allowed concurrent requests.
   * @param {!Array<!WebInspector.NetworkRequest>} networkRecords
   * @param {number} allowedConcurrentRequests
   * @param {number=} endTime
   * @return {!Array<{start: number, end: number}>}
   */
  static findNetworkQuietPeriods(networkRecords, allowedConcurrentRequests, endTime = Infinity) {
    // First collect the timestamps of when requests start and end
    let timeBoundaries = [];
    networkRecords.forEach(record => {
      const scheme = record.parsedURL && record.parsedURL.scheme;
      if (IGNORED_NETWORK_SCHEMES.includes(scheme)) {
        return;
      }

      // convert the network record timestamp to ms
      timeBoundaries.push({time: record.startTime * 1000, isStart: true});
      if (record.finished) {
        timeBoundaries.push({time: record.endTime * 1000, isStart: false});
      }
    });

    timeBoundaries = timeBoundaries
      .filter(boundary => boundary.time <= endTime)
      .sort((a, b) => a.time - b.time);

    let numInflightRequests = 0;
    let quietPeriodStart = 0;
    const quietPeriods = [];
    timeBoundaries.forEach(boundary => {
      if (boundary.isStart) {
        // we've just started a new request. are we exiting a quiet period?
        if (numInflightRequests === allowedConcurrentRequests) {
          quietPeriods.push({start: quietPeriodStart, end: boundary.time});
        }
        numInflightRequests++;
      } else {
        numInflightRequests--;
        // we've just completed a request. are we entering a quiet period?
        if (numInflightRequests === allowedConcurrentRequests) {
          quietPeriodStart = boundary.time;
        }
      }
    });

    // Check we ended in a quiet period
    if (numInflightRequests <= allowedConcurrentRequests) {
      quietPeriods.push({start: quietPeriodStart, end: endTime});
    }

    return quietPeriods;
  }

  /**
   * Listener for the DevTools SDK NetworkManager's RequestStarted event, which includes both
   * web socket and normal request creation.
   * @private
   */
  onRequestStarted(request) {
    this._records.push(request.data);
    this._emitNetworkStatus();
  }

  /**
   * Listener for the DevTools SDK NetworkManager's RequestFinished event, which includes
   * request finish, failure, and redirect, as well as the closing of web sockets.
   * @param {!WebInspector.NetworkRequest} request
   * @private
   */
  onRequestFinished(request) {
    this.emit('requestloaded', request.data);
    this._emitNetworkStatus();
  }

  // The below methods proxy network data into the DevTools SDK network layer.
  // There are a few differences between the debugging protocol naming and
  // the parameter naming used in NetworkManager. These are noted below.

  onRequestWillBeSent(data) {
    // NOTE: data.timestamp -> time, data.type -> resourceType
    this.networkManager._dispatcher.requestWillBeSent(data.requestId,
        data.frameId, data.loaderId, data.documentURL, data.request,
        data.timestamp, data.wallTime, data.initiator, data.redirectResponse,
        data.type);
  }

  onRequestServedFromCache(data) {
    this.networkManager._dispatcher.requestServedFromCache(data.requestId);
  }

  onResponseReceived(data) {
    // NOTE: data.timestamp -> time, data.type -> resourceType
    this.networkManager._dispatcher.responseReceived(data.requestId,
        data.frameId, data.loaderId, data.timestamp, data.type, data.response);
  }

  onDataReceived(data) {
    // NOTE: data.timestamp -> time
    this.networkManager._dispatcher.dataReceived(data.requestId, data.timestamp,
        data.dataLength, data.encodedDataLength);
  }

  onLoadingFinished(data) {
    // NOTE: data.timestamp -> finishTime
    this.networkManager._dispatcher.loadingFinished(data.requestId,
        data.timestamp, data.encodedDataLength);
  }

  onLoadingFailed(data) {
    // NOTE: data.timestamp -> time, data.type -> resourceType,
    // data.errorText -> localizedDescription
    this.networkManager._dispatcher.loadingFailed(data.requestId,
        data.timestamp, data.type, data.errorText, data.canceled,
        data.blockedReason);
  }

  onResourceChangedPriority(data) {
    this.networkManager._dispatcher.resourceChangedPriority(data.requestId,
        data.newPriority, data.timestamp);
  }

  /**
   * Routes network events to their handlers, so we can construct networkRecords
   * @param {!string} method
   * @param {!Object<string, *>=} params
   */
  dispatch(method, params) {
    if (!method.startsWith('Network.')) {
      return;
    }

    switch (method) {
      case 'Network.requestWillBeSent': return this.onRequestWillBeSent(params);
      case 'Network.requestServedFromCache': return this.onRequestServedFromCache(params);
      case 'Network.responseReceived': return this.onResponseReceived(params);
      case 'Network.dataReceived': return this.onDataReceived(params);
      case 'Network.loadingFinished': return this.onLoadingFinished(params);
      case 'Network.loadingFailed': return this.onLoadingFailed(params);
      case 'Network.resourceChangedPriority': return this.onResourceChangedPriority(params);
      default: return;
    }
  }

  /**
   * Construct network records from a log of devtools protocol messages.
   * @param {!DevtoolsLog} devtoolsLog
   * @return {!Array<!WebInspector.NetworkRequest>}
   */
  static recordsFromLogs(devtoolsLog) {
    const records = [];
    const nr = new NetworkRecorder(records);
    devtoolsLog.forEach(message => {
      nr.dispatch(message.method, message.params);
    });
    return records;
  }
}

module.exports = NetworkRecorder;
