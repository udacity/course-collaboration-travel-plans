/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
// @ts-nocheck
'use strict';

const WebInspector = require('../web-inspector');

/**
 * Traces > 256MB hit limits in V8, so TraceParser will parse the trace events stream as it's
 * received. We use DevTools' TimelineLoader for the heavy lifting, as it has a fast trace-specific
 * streaming JSON parser.
 * The resulting trace doesn't include the "metadata" property, as it's excluded via DevTools'
 * implementation.
 * FIXME: This can be removed once Node 8 support is dropped. https://stackoverflow.com/a/47781288/89484
 */
class TraceParser {
  constructor() {
    this.traceEvents = [];

    this.tracingModel = {
      reset: _ => this._reset(),
      addEvents: evts => this._addEvents(evts),
    };

    const delegateMock = {
      loadingProgress: _ => {},
      loadingStarted: _ => {},
      loadingComplete: success => {
        if (!success) throw new Error('Parsing problem');
      },
    };
    this.loader = new WebInspector.TimelineLoader(this.tracingModel, delegateMock);
  }

  /**
   * Reset the trace events array
   */
  _reset() {
    this.traceEvents = [];
  }

  /**
   * Adds parsed trace events to array
   * @param {!Array<!TraceEvent>} evts
   */
  _addEvents(evts) {
    this.traceEvents.push(...evts);
  }

  /**
   * Receive chunk of streamed trace
   * @param {string} data
   */
  parseChunk(data) {
    this.loader.write(data);
  }

  /**
   * Returns entire trace
   * @return {{traceEvents: !Array<!TraceEvent>}}
   */
  getTrace() {
    return {
      traceEvents: this.traceEvents,
    };
  }
}

module.exports = TraceParser;
