/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
// @ts-nocheck
'use strict';

const log = require('lighthouse-logger');

// eslint-disable-next-line max-len
const SENTRY_URL = 'https://a6bb0da87ee048cc9ae2a345fc09ab2e:63a7029f46f74265981b7e005e0f69f8@sentry.io/174697';

const noop = () => Promise.resolve();
const sentryApi = {
  captureMessage: noop,
  captureException: noop,
  captureBreadcrumb: noop,
  mergeContext: noop,
  getContext: noop,
};

const SAMPLED_ERRORS = [
  // Error code based sampling
  {pattern: /DOCUMENT_REQUEST$/, rate: 0.1},
  {pattern: /(IDLE_PERIOD|FMP_TOO_LATE)/, rate: 0.1},
  {pattern: /^NO_.*/, rate: 0.1},
  // Message based sampling
  {pattern: /Failed to decode/, rate: 0.1},
  {pattern: /All image optimizations failed/, rate: 0.1},
  {pattern: /No.*resource with given/, rate: 0.01},
  {pattern: /No.*node with given id/, rate: 0.01},
];

/**
 * We'll create a delegate for sentry so that environments without error reporting enabled will use
 * noop functions and environments with error reporting will call the actual Sentry methods.
 */
const sentryDelegate = Object.assign({}, sentryApi);
sentryDelegate.init = function init(opts) {
  if (!opts.flags.enableErrorReporting) {
    // If error reporting is disabled, leave the functions as a noop
    return;
  }

  const environmentData = opts.environmentData || {};
  const sentryConfig = Object.assign({}, environmentData, {captureUnhandledRejections: true});

  try {
    const Sentry = require('raven');
    Sentry.config(SENTRY_URL, sentryConfig).install();
    Object.keys(sentryApi).forEach(functionName => {
      // Have each delegate function call the corresponding sentry function by default
      sentryDelegate[functionName] = (...args) => Sentry[functionName](...args);
    });

    // Special case captureException to return a Promise so we don't process.exit too early
    sentryDelegate.captureException = (err, opts) => {
      opts = opts || {};

      const empty = Promise.resolve();
      // Ignore if there wasn't an error
      if (!err) return empty;
      // Ignore expected errors
      if (err.expected) return empty;
      // Sample known errors that occur at a high frequency
      const sampledErrorMatch = SAMPLED_ERRORS.find(sample => sample.pattern.test(err.message));
      if (sampledErrorMatch && sampledErrorMatch.rate <= Math.random()) return empty;
      // Protocol errors all share same stack trace, so add more to fingerprint
      if (err.protocolMethod) {
        opts.fingerprint = ['{{ default }}', err.protocolMethod, err.protocolError];
      }

      return new Promise(resolve => {
        Sentry.captureException(err, opts, () => resolve());
      });
    };
  } catch (e) {
    log.warn(
      'sentry',
      'Could not load raven library, errors will not be reported.'
    );
  }

  const context = {
    url: opts.url,
    deviceEmulation: !opts.flags.disableDeviceEmulation,
    networkThrottling: !opts.flags.disableNetworkThrottling,
    cpuThrottling: !opts.flags.disableCpuThrottling,
  };

  sentryDelegate.mergeContext({extra: Object.assign({}, environmentData.extra, context)});
  return context;
};

module.exports = sentryDelegate;
