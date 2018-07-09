/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const assert = require('assert');
const Util = require('../../../../report/html/renderer/util.js');

const NBSP = '\xa0';

/* eslint-env jest */
/* eslint-disable no-console */

describe('util helpers', () => {
  let origConsoleWarn;
  let consoleWarnCalls;

  beforeEach(() => {
    origConsoleWarn = console.warn;
    consoleWarnCalls = [];
    console.warn = msg => consoleWarnCalls.push(msg);
  });

  afterEach(() => {
    console.warn = origConsoleWarn;
  });

  it('formats a number', () => {
    assert.strictEqual(Util.formatNumber(10), '10');
    assert.strictEqual(Util.formatNumber(100.01), '100');
    assert.strictEqual(Util.formatNumber(13000.456), '13,000.5');
  });

  it('formats a date', () => {
    const timestamp = Util.formatDateTime('2017-04-28T23:07:51.189Z');
    assert.ok(
      timestamp.includes('Apr 27, 2017') ||
      timestamp.includes('Apr 28, 2017') ||
      timestamp.includes('Apr 29, 2017')
    );
  });

  it('formats bytes', () => {
    assert.equal(Util.formatBytesToKB(100), `0.1${NBSP}KB`);
    assert.equal(Util.formatBytesToKB(2000), `2${NBSP}KB`);
    assert.equal(Util.formatBytesToKB(1014 * 1024), `1,014${NBSP}KB`);
  });

  it('formats ms', () => {
    assert.equal(Util.formatMilliseconds(123), `120${NBSP}ms`);
    assert.equal(Util.formatMilliseconds(2456.5, 0.1), `2,456.5${NBSP}ms`);
  });

  it('formats a duration', () => {
    assert.equal(Util.formatDuration(60 * 1000), `1${NBSP}m`);
    assert.equal(Util.formatDuration(60 * 60 * 1000 + 5000), `1${NBSP}h 5${NBSP}s`);
    assert.equal(Util.formatDuration(28 * 60 * 60 * 1000 + 5000), `1${NBSP}d 4${NBSP}h 5${NBSP}s`);
  });

  // TODO: need ICU support in node on Travis/Appveyor
  it.skip('formats based on locale', () => {
    const number = 12346.858558;

    const originalLocale = Util.numberDateLocale;
    Util.setNumberDateLocale('de');
    assert.strictEqual(Util.formatNumber(number), '12.346,9');
    Util.setNumberDateLocale(originalLocale); // reset
    assert.strictEqual(Util.formatNumber(number), '12,346.9');
  });

  it.skip('uses decimal comma with en-XA test locale', () => {
    const number = 12346.858558;

    const originalLocale = Util.numberDateLocale;
    Util.setNumberDateLocale('en-XA');
    assert.strictEqual(Util.formatNumber(number), '12.346,9');
    Util.setNumberDateLocale(originalLocale); // reset
    assert.strictEqual(Util.formatNumber(number), '12,346.9');
  });

  it('calculates a score ratings', () => {
    assert.equal(Util.calculateRating(0.0), 'fail');
    assert.equal(Util.calculateRating(0.10), 'fail');
    assert.equal(Util.calculateRating(0.45), 'fail');
    assert.equal(Util.calculateRating(0.5), 'average');
    assert.equal(Util.calculateRating(0.75), 'average');
    assert.equal(Util.calculateRating(0.80), 'average');
    assert.equal(Util.calculateRating(0.90), 'pass');
    assert.equal(Util.calculateRating(1.00), 'pass');
  });

  it('builds device emulation string', () => {
    const get = opts => Util.getEmulationDescriptions(opts).deviceEmulation;
    assert.equal(get({disableDeviceEmulation: true}), 'No emulation');
    assert.equal(get({disableDeviceEmulation: false}), 'Emulated Nexus 5X');
  });

  it('builds throttling strings when provided', () => {
    const descriptions = Util.getEmulationDescriptions({throttlingMethod: 'provided'});
    assert.equal(descriptions.cpuThrottling, 'Provided by environment');
    assert.equal(descriptions.networkThrottling, 'Provided by environment');
  });

  it('builds throttling strings when devtools', () => {
    const descriptions = Util.getEmulationDescriptions({
      throttlingMethod: 'devtools',
      throttling: {
        cpuSlowdownMultiplier: 4.5,
        requestLatencyMs: 565,
        downloadThroughputKbps: 1400.00000000001,
        uploadThroughputKbps: 600,
      },
    });

    // eslint-disable-next-line max-len
    assert.equal(descriptions.networkThrottling, '565\xa0ms HTTP RTT, 1,400\xa0Kbps down, 600\xa0Kbps up (DevTools)');
    assert.equal(descriptions.cpuThrottling, '4.5x slowdown (DevTools)');
  });

  it('builds throttling strings when simulate', () => {
    const descriptions = Util.getEmulationDescriptions({
      throttlingMethod: 'simulate',
      throttling: {
        cpuSlowdownMultiplier: 2,
        rttMs: 150,
        throughputKbps: 1600,
      },
    });

    // eslint-disable-next-line max-len
    assert.equal(descriptions.networkThrottling, '150\xa0ms TCP RTT, 1,600\xa0Kbps throughput (Simulated)');
    assert.equal(descriptions.cpuThrottling, '2x slowdown (Simulated)');
  });

  it('formats display values', () => {
    const format = arg => Util.formatDisplayValue(arg);
    assert.equal(format(undefined), '');
    assert.equal(format('Foo %s %d'), 'Foo %s %d');
    assert.equal(format([]), 'UNKNOWN');
    assert.equal(format(['%s %s', 'Hello', 'formatDisplayValue']), 'Hello formatDisplayValue');
    assert.equal(format(['%s%', 99.9]), '99.9%');
    assert.equal(format(['%d%', 99.9]), '100%');
    assert.equal(format(['%s ms', 12345.678]), '12,345.678 ms');
    assert.equal(format(['%10d ms', 12345.678]), '12,350 ms');
    assert.equal(format(['%.01d ms', 12345.678]), '12,345.68 ms');
    // handle edge cases
    assert.equal(format(['%.01s literal', 1234]), '%.01s literal');
    assert.equal(format(['%1.01.1d junk', 1234]), '%1.01.1d junk');
  });

  it('warns on improper display value formatting', () => {
    assert.equal(Util.formatDisplayValue(['%s']), '%s');
    assert.equal(Util.formatDisplayValue(['%s', 'foo', 'bar']), 'foo');
    assert.deepEqual(consoleWarnCalls, [
      'Not enough replacements given',
      'Too many replacements given',
    ]);
  });

  it('does not mutate the provided array', () => {
    const displayValue = ['one:%s, two:%s', 'foo', 'bar'];
    const cloned = JSON.parse(JSON.stringify(displayValue));
    Util.formatDisplayValue(displayValue);
    assert.deepStrictEqual(displayValue, cloned, 'displayValue was mutated');
  });
});
