/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const TraceParser = require('../../../lib/traces/trace-parser');
const fs = require('fs');
const assert = require('assert');


/* eslint-env jest */
describe('traceParser parser', () => {
  it('returns preact trace data the same as JSON.parse', (done) => {
    const filename = `${__dirname}/../../fixtures/traces/progressive-app-m60.json`;
    const readStream = fs.createReadStream(filename, {
      encoding: 'utf-8',
      // devtools sends traces in 10mb chunks, but this trace is 12MB so we'll do a few chunks
      highWaterMark: 4 * 1024 * 1024,
    });
    const parser = new TraceParser();

    readStream.on('data', (chunk) => {
      parser.parseChunk(chunk);
    });
    readStream.on('end', () => {
      const streamedTrace = parser.getTrace();
      const readTrace = JSON.parse(fs.readFileSync(filename));

      assert.equal(streamedTrace.traceEvents.length, readTrace.traceEvents.length);
      streamedTrace.traceEvents.forEach((evt, i) => {
        assert.deepStrictEqual(evt, readTrace.traceEvents[i]);
      });

      done();
    });
  }, 10000);


  it('parses a trace > 256mb (slow)', () => {
    const parser = new TraceParser();
    let bytesRead = 0;
    // FYI: this trace doesn't have a traceEvents property ;)
    const filename = '/../../fixtures/traces/devtools-homepage-w-screenshots-trace.json';
    const events = JSON.parse(fs.readFileSync(__dirname + filename));

    /**
     * This function will synthesize a trace that's over 256 MB. To do that, we'll take an existing
     * trace and repeat the same events again and again until we've gone over 256 MB.
     * Note: We repeat all but the last event, as it's the CpuProfile event, and it triggers
     * specific handling in the devtools streaming parser.
     * Once we reach > 256 MB, we add in the CpuProfile event.
     */
    function buildAndParse256mbTrace() {
      const stripOuterBrackets = str => str.replace(/^\[/, '').replace(/\]$/, '');
      const partialEventsStr = events => stripOuterBrackets(JSON.stringify(events));
      const traceEventsStr = partialEventsStr(events.slice(0, events.length-2)) + ',';

      // read the trace intro
      parser.parseChunk(`{"traceEvents": [${traceEventsStr}`);
      bytesRead += traceEventsStr.length;

      // just keep reading until we've gone over 256 MB
      // 256 MB is hard limit of a string in v8
      // https://mobile.twitter.com/bmeurer/status/879276976523157505
      while (bytesRead <= (Math.pow(2, 28)) - 16) {
        parser.parseChunk(traceEventsStr);
        bytesRead += traceEventsStr.length;
      }

      // the CPU Profiler event is last (and big), inject it just once
      const lastEventStr = partialEventsStr(events.slice(-1));
      parser.parseChunk(lastEventStr + ']}');
      bytesRead += lastEventStr.length;
    }

    buildAndParse256mbTrace();
    const streamedTrace = parser.getTrace();

    assert.ok(bytesRead > 256 * 1024 * 1024, `${bytesRead} bytes read`);
    assert.strictEqual(bytesRead, 270128965, `${bytesRead} bytes read`);

    // if > 256 MB are read we should have ~480,000 trace events
    assert.ok(streamedTrace.traceEvents.length > 400 * 1000, 'not >400,000 trace events');
    assert.ok(streamedTrace.traceEvents.length > events.length * 5, 'not way more trace events');
    assert.strictEqual(streamedTrace.traceEvents.length, 480151);

    assert.deepStrictEqual(
        streamedTrace.traceEvents[events.length - 2],
        events[0]);
  }, 40 * 1000);
});
