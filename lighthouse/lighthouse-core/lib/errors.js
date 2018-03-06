/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const strings = require('./strings');

/**
 * @typedef LighthouseErrorDefinition
 * @property {string} code
 * @property {string} message
 * @property {RegExp|undefined} pattern
 */

class LighthouseError extends Error {
  /**
   * @param {!LighthouseErrorDefinition} errorDefinition
   * @param {!Object=} properties
   */
  constructor(errorDefinition, properties) {
    super(errorDefinition.code);
    this.name = 'LHError';
    this.code = errorDefinition.code;
    this.friendlyMessage = errorDefinition.message;
    if (properties) Object.assign(this, properties);

    Error.captureStackTrace(this, LighthouseError);
  }

  /**
   * @param {LH.LighthouseError} err
   */
  static isPageLoadError(err) {
    return err.code === ERRORS.NO_DOCUMENT_REQUEST.code ||
      err.code === ERRORS.FAILED_DOCUMENT_REQUEST.code;
  }

  /**
   * @param {string} method
   * @param {{message: string, data: string|undefined}} protocolError
   * @return {!Error|LighthouseError}
   */
  static fromProtocolMessage(method, protocolError) {
    // extract all errors with a regex pattern to match against.
    const protocolErrors = Object.keys(ERRORS).filter(k => ERRORS[k].pattern).map(k => ERRORS[k]);
    // if we find one, use the friendly LighthouseError definition
    const matchedErrorDefinition = protocolErrors.find(e => e.pattern.test(protocolError.message));
    if (matchedErrorDefinition) {
      return new LighthouseError(matchedErrorDefinition, {
        protocolMethod: method,
        protocolError: protocolError.message,
      });
    }

    // otherwise fallback to building a generic Error
    let errMsg = `(${method}): ${protocolError.message}`;
    if (protocolError.data) errMsg += ` (${protocolError.data})`;
    const error = new Error(`Protocol error ${errMsg}`);
    return Object.assign(error, {protocolMethod: method, protocolError: protocolError.message});
  }
}

const ERRORS = {
  // Screenshot/speedline errors
  NO_SPEEDLINE_FRAMES: {message: strings.didntCollectScreenshots},
  SPEEDINDEX_OF_ZERO: {message: strings.didntCollectScreenshots},
  NO_SCREENSHOTS: {message: strings.didntCollectScreenshots},

  // Trace parsing errors
  NO_TRACING_STARTED: {message: strings.badTraceRecording},
  NO_NAVSTART: {message: strings.badTraceRecording},
  NO_FMP: {message: strings.badTraceRecording},
  NO_DCL: {message: strings.badTraceRecording},

  // TTFI/TTCI calculation failures
  FMP_TOO_LATE_FOR_FCPUI: {message: strings.pageLoadTookTooLong},
  NO_FCPUI_IDLE_PERIOD: {message: strings.pageLoadTookTooLong},
  NO_TTI_CPU_IDLE_PERIOD: {message: strings.pageLoadTookTooLong},
  NO_TTI_NETWORK_IDLE_PERIOD: {message: strings.pageLoadTookTooLong},

  // Page load failures
  NO_DOCUMENT_REQUEST: {message: strings.pageLoadFailed},
  FAILED_DOCUMENT_REQUEST: {message: strings.pageLoadFailed},

  // Protocol internal failures
  TRACING_ALREADY_STARTED: {message: strings.internalChromeError, pattern: /Tracing.*started/},
  PARSING_PROBLEM: {message: strings.internalChromeError, pattern: /Parsing problem/},
  READ_FAILED: {message: strings.internalChromeError, pattern: /Read failed/},
};

Object.keys(ERRORS).forEach(code => ERRORS[code].code = code);
LighthouseError.errors = ERRORS;
module.exports = LighthouseError;

