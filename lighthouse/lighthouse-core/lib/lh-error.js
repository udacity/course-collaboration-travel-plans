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
 * @property {RegExp} [pattern]
 * @property {boolean} [lhrRuntimeError] True if it should appear in the top-level LHR.runtimeError property.
 */

class LighthouseError extends Error {
  /**
   * @param {LighthouseErrorDefinition} errorDefinition
   * @param {Record<string, string|boolean|undefined>=} properties
   */
  constructor(errorDefinition, properties) {
    super(errorDefinition.code);
    this.name = 'LHError';
    this.code = errorDefinition.code;
    this.friendlyMessage = errorDefinition.message;
    this.lhrRuntimeError = !!errorDefinition.lhrRuntimeError;
    if (properties) Object.assign(this, properties);

    Error.captureStackTrace(this, LighthouseError);
  }

  /**
   * @param {LighthouseError} err
   * @return {LighthouseError}
   */
  static fromLighthouseError(err) {
    const {code, friendlyMessage: message, ...rest} = err;
    // Note: {...rest} convinces tsc 3.1 that it's assignable to a Record.
    return new LighthouseError({code, message}, {...rest});
  }

  /**
   * @param {string} method
   * @param {{message: string, data?: string|undefined}} protocolError
   * @return {Error|LighthouseError}
   */
  static fromProtocolMessage(method, protocolError) {
    // extract all errors with a regex pattern to match against.
    const protocolErrors = Object.values(LighthouseError.errors).filter(e => e.pattern);
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
  NO_SPEEDLINE_FRAMES: {
    code: 'NO_SPEEDLINE_FRAMES',
    message: strings.didntCollectScreenshots,
    lhrRuntimeError: true,
  },
  SPEEDINDEX_OF_ZERO: {
    code: 'SPEEDINDEX_OF_ZERO',
    message: strings.didntCollectScreenshots,
    lhrRuntimeError: true,
  },
  NO_SCREENSHOTS: {
    code: 'NO_SCREENSHOTS',
    message: strings.didntCollectScreenshots,
    lhrRuntimeError: true,
  },
  INVALID_SPEEDLINE: {
    code: 'INVALID_SPEEDLINE',
    message: strings.didntCollectScreenshots,
    lhrRuntimeError: true,
  },

  // Trace parsing errors
  NO_TRACING_STARTED: {
    code: 'NO_TRACING_STARTED',
    message: strings.badTraceRecording,
    lhrRuntimeError: true,
  },
  NO_NAVSTART: {
    code: 'NO_NAVSTART',
    message: strings.badTraceRecording,
    lhrRuntimeError: true,
  },
  NO_FCP: {
    code: 'NO_FCP',
    message: strings.badTraceRecording,
    lhrRuntimeError: true,
  },
  NO_DCL: {
    code: 'NO_DCL',
    message: strings.badTraceRecording,
    lhrRuntimeError: true,
  },
  NO_FMP: {
    code: 'NO_FMP',
    message: strings.badTraceRecording,
  },

  // TTI calculation failures
  FMP_TOO_LATE_FOR_FCPUI: {code: 'FMP_TOO_LATE_FOR_FCPUI', message: strings.pageLoadTookTooLong},
  NO_FCPUI_IDLE_PERIOD: {code: 'NO_FCPUI_IDLE_PERIOD', message: strings.pageLoadTookTooLong},
  NO_TTI_CPU_IDLE_PERIOD: {code: 'NO_TTI_CPU_IDLE_PERIOD', message: strings.pageLoadTookTooLong},
  NO_TTI_NETWORK_IDLE_PERIOD: {
    code: 'NO_TTI_NETWORK_IDLE_PERIOD',
    message: strings.pageLoadTookTooLong,
  },

  // Page load failures
  NO_DOCUMENT_REQUEST: {
    code: 'NO_DOCUMENT_REQUEST',
    message: strings.pageLoadFailed,
    lhrRuntimeError: true,
  },
  /* Used when DevTools reports loading failed. Usually an internal (Chrome) issue. */
  FAILED_DOCUMENT_REQUEST: {
    code: 'FAILED_DOCUMENT_REQUEST',
    message: strings.pageLoadFailed,
    lhrRuntimeError: true,
  },
  /* Used when status code is 4xx or 5xx. */
  ERRORED_DOCUMENT_REQUEST: {
    code: 'ERRORED_DOCUMENT_REQUEST',
    message: strings.pageLoadFailed,
    lhrRuntimeError: true,
  },

  // Protocol internal failures
  TRACING_ALREADY_STARTED: {
    code: 'TRACING_ALREADY_STARTED',
    message: strings.internalChromeError,
    pattern: /Tracing.*started/,
    lhrRuntimeError: true,
  },
  PARSING_PROBLEM: {
    code: 'PARSING_PROBLEM',
    message: strings.internalChromeError,
    pattern: /Parsing problem/,
    lhrRuntimeError: true,
  },
  READ_FAILED: {
    code: 'READ_FAILED',
    message: strings.internalChromeError,
    pattern: /Read failed/,
    lhrRuntimeError: true,
  },

  // Protocol timeout failures
  REQUEST_CONTENT_TIMEOUT: {
    code: 'REQUEST_CONTENT_TIMEOUT',
    message: strings.requestContentTimeout,
  },

  // URL parsing failures
  INVALID_URL: {
    code: 'INVALID_URL',
    message: strings.urlInvalid,
  },
};

/** @type {Record<keyof typeof ERRORS, LighthouseErrorDefinition>} */
LighthouseError.errors = ERRORS;
LighthouseError.NO_ERROR = 'NO_ERROR';
LighthouseError.UNKNOWN_ERROR = 'UNKNOWN_ERROR';
module.exports = LighthouseError;

