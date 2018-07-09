/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * Adjustments needed for DevTools network throttling to simulate
 * more realistic network conditions.
 * See: crbug.com/721112
 */
const DEVTOOLS_RTT_ADJUSTMENT_FACTOR = 3.75;
const DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR = 0.9;

const throttling = {
  DEVTOOLS_RTT_ADJUSTMENT_FACTOR,
  DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR,
  mobile3G: {
    rttMs: 150,
    throughputKbps: 1.6 * 1024,
    requestLatencyMs: 150 * DEVTOOLS_RTT_ADJUSTMENT_FACTOR,
    downloadThroughputKbps: 1.6 * 1024 * DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR,
    uploadThroughputKbps: 750 * DEVTOOLS_THROUGHPUT_ADJUSTMENT_FACTOR,
    cpuSlowdownMultiplier: 4,
  },
};

/** @type {LH.Config.Settings} */
const defaultSettings = {
  output: 'json',
  maxWaitForLoad: 45 * 1000,
  throttlingMethod: 'simulate',
  throttling: throttling.mobile3G,
  auditMode: false,
  gatherMode: false,
  disableStorageReset: false,
  disableDeviceEmulation: false,

  // the following settings have no defaults but we still want ensure that `key in settings`
  // in config will work in a typechecked way
  locale: 'en-US', // actual default determined by Config using lib/i18n
  blockedUrlPatterns: null,
  additionalTraceCategories: null,
  extraHeaders: null,
  onlyAudits: null,
  onlyCategories: null,
  skipAudits: null,
};

/** @type {LH.Config.Pass} */
const defaultPassConfig = {
  passName: 'defaultPass',
  recordTrace: false,
  useThrottling: false,
  pauseAfterLoadMs: 0,
  networkQuietThresholdMs: 0,
  cpuQuietThresholdMs: 0,
  blockedUrlPatterns: [],
  blankPage: 'about:blank',
  blankDuration: 300,
  gatherers: [],
};

const nonSimulatedPassConfigOverrides = {
  pauseAfterLoadMs: 5250,
  networkQuietThresholdMs: 5250,
  cpuQuietThresholdMs: 5250,
};

module.exports = {
  throttling,
  defaultSettings,
  defaultPassConfig,
  nonSimulatedPassConfigOverrides,
};
