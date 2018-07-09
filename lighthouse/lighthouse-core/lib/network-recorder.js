/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const NetworkRequest = require('./network-request');
const EventEmitter = require('events').EventEmitter;
const log = require('lighthouse-logger');

const IGNORED_NETWORK_SCHEMES = ['data', 'ws'];

/** @typedef {'requestloaded'|'network-2-idle'|'networkidle'|'networkbusy'|'network-2-busy'} NetworkRecorderEvent */

class NetworkRecorder extends EventEmitter {
  /**
   * Creates an instance of NetworkRecorder.
   */
  constructor() {
    super();

    /** @type {NetworkRequest[]} */
    this._records = [];
    /** @type {Map<string, NetworkRequest>} */
    this._recordsById = new Map();
  }

  getRecords() {
    return Array.from(this._records);
  }

  /**
   * @param {NetworkRecorderEvent} event
   * @param {*} listener
   */
  on(event, listener) {
    return super.on(event, listener);
  }

  /**
   * @param {NetworkRecorderEvent} event
   * @param {*} listener
   */
  once(event, listener) {
    return super.once(event, listener);
  }

  isIdle() {
    return !!this._getActiveIdlePeriod(0);
  }

  is2Idle() {
    return !!this._getActiveIdlePeriod(2);
  }

  /**
   * @param {number} allowedRequests
   */
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
   * QUIC network requests don't always "finish" even when they're done loading data, use recievedHeaders
   * @see https://github.com/GoogleChrome/lighthouse/issues/5254
   * @param {LH.Artifacts.NetworkRequest} record
   * @return {boolean}
   */
  static _isQUICAndFinished(record) {
    const isQUIC = record.responseHeaders && record.responseHeaders
        .some(header => header.name.toLowerCase() === 'alt-svc' && /quic/.test(header.value));
    const receivedHeaders = record.timing && record.timing.receiveHeadersEnd > 0;
    return !!(isQUIC && receivedHeaders && record.endTime);
  }

  /**
   * frame root network requests don't always "finish" even when they're done loading data, use responseReceived instead
   * @see https://github.com/GoogleChrome/lighthouse/issues/6067#issuecomment-423211201
   * @param {LH.Artifacts.NetworkRequest} record
   * @return {boolean}
   */
  static _isFrameRootRequestAndFinished(record) {
    const isFrameRootRequest = record.url === record.documentURL;
    const responseReceived = record.responseReceivedTime > 0;
    return !!(isFrameRootRequest && responseReceived && record.endTime);
  }

  /**
   * Finds all time periods where the number of inflight requests is less than or equal to the
   * number of allowed concurrent requests.
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @param {number} allowedConcurrentRequests
   * @param {number=} endTime
   * @return {Array<{start: number, end: number}>}
   */
  static findNetworkQuietPeriods(networkRecords, allowedConcurrentRequests, endTime = Infinity) {
    // First collect the timestamps of when requests start and end
    /** @type {Array<{time: number, isStart: boolean}>} */
    let timeBoundaries = [];
    networkRecords.forEach(record => {
      const scheme = record.parsedURL && record.parsedURL.scheme;
      if (IGNORED_NETWORK_SCHEMES.includes(scheme)) {
        return;
      }

      // convert the network record timestamp to ms
      timeBoundaries.push({time: record.startTime * 1000, isStart: true});
      if (record.finished ||
          NetworkRecorder._isQUICAndFinished(record) ||
          NetworkRecorder._isFrameRootRequestAndFinished(record)) {
        timeBoundaries.push({time: record.endTime * 1000, isStart: false});
      }
    });

    timeBoundaries = timeBoundaries
      .filter(boundary => boundary.time <= endTime)
      .sort((a, b) => a.time - b.time);

    let numInflightRequests = 0;
    let quietPeriodStart = 0;
    /** @type {Array<{start: number, end: number}>} */
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

    return quietPeriods.filter(period => period.start !== period.end);
  }

  /**
   * Listener for the DevTools SDK NetworkManager's RequestStarted event, which includes both
   * web socket and normal request creation.
   * @param {NetworkRequest} request
   * @private
   */
  onRequestStarted(request) {
    this._records.push(request);
    this._recordsById.set(request.requestId, request);

    this._emitNetworkStatus();
  }

  /**
   * Listener for the DevTools SDK NetworkManager's RequestFinished event, which includes
   * request finish, failure, and redirect, as well as the closing of web sockets.
   * @param {NetworkRequest} request
   * @private
   */
  onRequestFinished(request) {
    this.emit('requestloaded', request);
    this._emitNetworkStatus();
  }

  // The below methods proxy network data into the NetworkRequest object which mimics the
  // DevTools SDK network layer.

  /**
   * @param {LH.Crdp.Network.RequestWillBeSentEvent} data
   */
  onRequestWillBeSent(data) {
    const originalRequest = this._findRealRequest(data.requestId);
    // This is a simple new request, create the NetworkRequest object and finish.
    if (!originalRequest) {
      const request = new NetworkRequest();
      request.onRequestWillBeSent(data);
      this.onRequestStarted(request);
      return;
    }

    // TODO(phulce): log these to sentry?
    if (!data.redirectResponse) {
      return;
    }

    // On redirect, another requestWillBeSent message is fired for the same requestId.
    // Update/finish the previous network request and create a new one for the redirect.
    const modifiedData = {
      ...data,
      // Copy over the initiator as well to match DevTools behavior
      // TODO(phulce): abandon this DT hack and update Lantern graph to handle it
      initiator: originalRequest.initiator,
      requestId: `${originalRequest.requestId}:redirect`,
    };
    const redirectedRequest = new NetworkRequest();

    redirectedRequest.onRequestWillBeSent(modifiedData);
    originalRequest.onRedirectResponse(data);

    originalRequest.redirectDestination = redirectedRequest;
    redirectedRequest.redirectSource = originalRequest;

    // Start the redirect request before finishing the original so we don't get erroneous quiet periods
    this.onRequestStarted(redirectedRequest);
    this.onRequestFinished(originalRequest);
  }

  /**
   * @param {LH.Crdp.Network.RequestServedFromCacheEvent} data
   */
  onRequestServedFromCache(data) {
    const request = this._findRealRequest(data.requestId);
    if (!request) return;
    request.onRequestServedFromCache();
  }

  /**
   * @param {LH.Crdp.Network.ResponseReceivedEvent} data
   */
  onResponseReceived(data) {
    const request = this._findRealRequest(data.requestId);
    if (!request) return;
    request.onResponseReceived(data);
  }

  /**
   * @param {LH.Crdp.Network.DataReceivedEvent} data
   */
  onDataReceived(data) {
    const request = this._findRealRequest(data.requestId);
    if (!request) return;
    request.onDataReceived(data);
  }

  /**
   * @param {LH.Crdp.Network.LoadingFinishedEvent} data
   */
  onLoadingFinished(data) {
    const request = this._findRealRequest(data.requestId);
    if (!request) return;
    request.onLoadingFinished(data);
    this.onRequestFinished(request);
  }

  /**
   * @param {LH.Crdp.Network.LoadingFailedEvent} data
   */
  onLoadingFailed(data) {
    const request = this._findRealRequest(data.requestId);
    if (!request) return;
    request.onLoadingFailed(data);
    this.onRequestFinished(request);
  }

  /**
   * @param {LH.Crdp.Network.ResourceChangedPriorityEvent} data
   */
  onResourceChangedPriority(data) {
    const request = this._findRealRequest(data.requestId);
    if (!request) return;
    request.onResourceChangedPriority(data);
  }

  /**
   * Routes network events to their handlers, so we can construct networkRecords
   * @param {LH.Protocol.RawEventMessage} event
   */
  dispatch(event) {
    if (!event.method.startsWith('Network.')) {
      return;
    }

    switch (event.method) {
      case 'Network.requestWillBeSent': return this.onRequestWillBeSent(event.params);
      case 'Network.requestServedFromCache': return this.onRequestServedFromCache(event.params);
      case 'Network.responseReceived': return this.onResponseReceived(event.params);
      case 'Network.dataReceived': return this.onDataReceived(event.params);
      case 'Network.loadingFinished': return this.onLoadingFinished(event.params);
      case 'Network.loadingFailed': return this.onLoadingFailed(event.params);
      case 'Network.resourceChangedPriority': return this.onResourceChangedPriority(event.params);
      default: return;
    }
  }

  /**
   * Redirected requests all have identical requestIds over the protocol. Once a request has been
   * redirected all future messages referrencing that requestId are about the new destination, not
   * the original. This method is a helper for finding the real request object to which the current
   * message is referring.
   *
   * @param {string} requestId
   * @return {NetworkRequest|undefined}
   */
  _findRealRequest(requestId) {
    let request = this._recordsById.get(requestId);
    if (!request) return undefined;

    while (request.redirectDestination) {
      request = request.redirectDestination;
    }

    return request;
  }

  /**
   * Construct network records from a log of devtools protocol messages.
   * @param {LH.DevtoolsLog} devtoolsLog
   * @return {Array<LH.Artifacts.NetworkRequest>}
   */
  static recordsFromLogs(devtoolsLog) {
    const networkRecorder = new NetworkRecorder();
    // playback all the devtools messages to recreate network records
    devtoolsLog.forEach(message => networkRecorder.dispatch(message));

    // get out the list of records
    const records = networkRecorder.getRecords();

    // create a map of all the records by URL to link up initiator
    const recordsByURL = new Map();
    for (const record of records) {
      if (recordsByURL.has(record.url)) continue;
      recordsByURL.set(record.url, record);
    }

    // set the initiator and redirects array
    for (const record of records) {
      const stackFrames = (record.initiator.stack && record.initiator.stack.callFrames) || [];
      const initiatorURL = record.initiator.url || (stackFrames[0] && stackFrames[0].url);
      const initiator = recordsByURL.get(initiatorURL) || record.redirectSource;
      if (initiator) {
        record.setInitiatorRequest(initiator);
      }

      let finalRecord = record;
      while (finalRecord.redirectDestination) finalRecord = finalRecord.redirectDestination;
      if (finalRecord === record || finalRecord.redirects) continue;

      const redirects = [];
      for (
        let redirect = finalRecord.redirectSource;
        redirect;
        redirect = redirect.redirectSource
      ) {
        redirects.unshift(redirect);
      }

      finalRecord.redirects = redirects;
    }

    return records;
  }
}

module.exports = NetworkRecorder;
