/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const log = require('lighthouse-logger');
const LHError = require('../lib/lh-error');
const URL = require('../lib/url-shim');
const NetworkRecorder = require('../lib/network-recorder.js');
const constants = require('../config/constants');

const Driver = require('../gather/driver.js'); // eslint-disable-line no-unused-vars

/** @typedef {import('./gatherers/gatherer.js').PhaseResult} PhaseResult */
/**
 * Each entry in each gatherer result array is the output of a gatherer phase:
 * `beforePass`, `pass`, and `afterPass`. Flattened into an `LH.Artifacts` in
 * `collectArtifacts`.
 * @typedef {Record<keyof LH.GathererArtifacts, Array<PhaseResult|Promise<PhaseResult>>>} GathererResults
 */
/** @typedef {Array<[keyof GathererResults, GathererResults[keyof GathererResults]]>} GathererResultsEntries */
/**
 * Class that drives browser to load the page and runs gatherer lifecycle hooks.
 * Execution sequence when GatherRunner.run() is called:
 *
 * 1. Setup
 *   A. navigate to about:blank
 *   B. driver.connect()
 *   C. GatherRunner.setupDriver()
 *     i. assertNoSameOriginServiceWorkerClients
 *     ii. beginEmulation
 *     iii. enableRuntimeEvents
 *     iv. evaluateScriptOnLoad rescue native Promise from potential polyfill
 *     v. register a performance observer
 *     vi. register dialog dismisser
 *     vii. clearDataForOrigin
 *
 * 2. For each pass in the config:
 *   A. GatherRunner.beforePass()
 *     i. navigate to about:blank
 *     ii. Enable network request blocking for specified patterns
 *     iii. all gatherers' beforePass()
 *   B. GatherRunner.pass()
 *     i. cleanBrowserCaches() (if it's a perf run)
 *     ii. beginDevtoolsLog()
 *     iii. beginTrace (if requested)
 *     iv. GatherRunner.loadPage()
 *       a. navigate to options.url (and wait for onload)
 *     v. all gatherers' pass()
 *   C. GatherRunner.afterPass()
 *     i. endTrace (if requested) & endDevtoolsLog & endThrottling
 *     ii. all gatherers' afterPass()
 *
 * 3. Teardown
 *   A. clearDataForOrigin
 *   B. GatherRunner.disposeDriver()
 *   C. collect all artifacts and return them
 *     i. collectArtifacts() from completed passes on each gatherer
 *     ii. add trace data and computed artifact methods
 */
class GatherRunner {
  /**
   * Loads about:blank and waits there briefly. Since a Page.reload command does
   * not let a service worker take over, we navigate away and then come back to
   * reload. We do not `waitForLoad` on about:blank since a page load event is
   * never fired on it.
   * @param {Driver} driver
   * @param {string=} url
   * @param {number=} duration
   * @return {Promise<void>}
   */
  static async loadBlank(
      driver,
      url = constants.defaultPassConfig.blankPage,
      duration = constants.defaultPassConfig.blankDuration
  ) {
    await driver.gotoURL(url);
    await new Promise(resolve => setTimeout(resolve, duration));
  }

  /**
   * Loads options.url with specified options. If the main document URL
   * redirects, options.url will be updated accordingly. As such, options.url
   * will always represent the post-redirected URL. options.requestedUrl is the
   * pre-redirect starting URL.
   * @param {Driver} driver
   * @param {LH.Gatherer.PassContext} passContext
   * @return {Promise<void>}
   */
  static async loadPage(driver, passContext) {
    const finalUrl = await driver.gotoURL(passContext.url, {
      waitForLoad: true,
      passContext,
    });
    passContext.url = finalUrl;
  }

  /**
   * @param {Driver} driver
   * @param {{requestedUrl: string, settings: LH.Config.Settings}} options
   * @return {Promise<void>}
   */
  static async setupDriver(driver, options) {
    log.log('status', 'Initializing…');
    const resetStorage = !options.settings.disableStorageReset;
    // Enable emulation based on settings
    await driver.assertNoSameOriginServiceWorkerClients(options.requestedUrl);
    await driver.beginEmulation(options.settings);
    await driver.enableRuntimeEvents();
    await driver.cacheNatives();
    await driver.registerPerformanceObserver();
    await driver.dismissJavaScriptDialogs();
    if (resetStorage) await driver.clearDataForOrigin(options.requestedUrl);
  }

  /**
   * @param {Driver} driver
   * @return {Promise<void>}
   */
  static disposeDriver(driver) {
    log.log('status', 'Disconnecting from browser...');
    return driver.disconnect().catch(err => {
      // Ignore disconnecting error if browser was already closed.
      // See https://github.com/GoogleChrome/lighthouse/issues/1583
      if (!(/close\/.*status: 500$/.test(err.message))) {
        log.error('GatherRunner disconnect', err.message);
      }
    });
  }

  /**
   * Test any error output from the promise, absorbing non-fatal errors and
   * throwing on fatal ones so that run is stopped.
   * @param {Promise<*>} promise
   * @return {Promise<void>}
   */
  static recoverOrThrow(promise) {
    return promise.catch(err => {
      if (err.fatal) {
        throw err;
      }
    });
  }

  /**
   * Returns an error if the original network request failed or wasn't found.
   * @param {string} url The URL of the original requested page.
   * @param {Array<LH.Artifacts.NetworkRequest>} networkRecords
   * @return {LHError|undefined}
   */
  static getPageLoadError(url, networkRecords) {
    const mainRecord = networkRecords.find(record => {
      // record.url is actual request url, so needs to be compared without any URL fragment.
      return URL.equalWithExcludedFragments(record.url, url);
    });

    let errorDef;
    if (!mainRecord) {
      errorDef = LHError.errors.NO_DOCUMENT_REQUEST;
    } else if (mainRecord.failed) {
      errorDef = {...LHError.errors.FAILED_DOCUMENT_REQUEST};
      errorDef.message += ` ${mainRecord.localizedFailDescription}.`;
    } else if (mainRecord.hasErrorStatusCode()) {
      errorDef = {...LHError.errors.ERRORED_DOCUMENT_REQUEST};
      errorDef.message += ` Status code: ${mainRecord.statusCode}.`;
    }

    if (errorDef) {
      return new LHError(errorDef);
    }
  }

  /**
   * Navigates to about:blank and calls beforePass() on gatherers before tracing
   * has started and before navigation to the target page.
   * @param {LH.Gatherer.PassContext} passContext
   * @param {Partial<GathererResults>} gathererResults
   * @return {Promise<void>}
   */
  static async beforePass(passContext, gathererResults) {
    const blockedUrls = (passContext.passConfig.blockedUrlPatterns || [])
      .concat(passContext.settings.blockedUrlPatterns || []);
    const blankPage = passContext.passConfig.blankPage;
    const blankDuration = passContext.passConfig.blankDuration;
    await GatherRunner.loadBlank(passContext.driver, blankPage, blankDuration);
    // Set request blocking before any network activity
    // No "clearing" is done at the end of the pass since blockUrlPatterns([]) will unset all if
    // neccessary at the beginning of the next pass.
    await passContext.driver.blockUrlPatterns(blockedUrls);
    await passContext.driver.setExtraHTTPHeaders(passContext.settings.extraHeaders);

    for (const gathererDefn of passContext.passConfig.gatherers) {
      const gatherer = gathererDefn.instance;
      // Abuse the passContext to pass through gatherer options
      passContext.options = gathererDefn.options || {};
      const artifactPromise = Promise.resolve().then(_ => gatherer.beforePass(passContext));
      gathererResults[gatherer.name] = [artifactPromise];
      await GatherRunner.recoverOrThrow(artifactPromise);
    }
  }

  /**
   * Navigates to requested URL and then runs pass() on gatherers while trace
   * (if requested) is still being recorded.
   * @param {LH.Gatherer.PassContext} passContext
   * @param {Partial<GathererResults>} gathererResults
   * @return {Promise<void>}
   */
  static async pass(passContext, gathererResults) {
    const driver = passContext.driver;
    const config = passContext.passConfig;
    const settings = passContext.settings;
    const gatherers = config.gatherers;

    const recordTrace = config.recordTrace;
    const isPerfRun = !settings.disableStorageReset && recordTrace && config.useThrottling;

    const gatherernames = gatherers.map(g => g.instance.name).join(', ');
    const status = 'Loading page & waiting for onload';
    log.log('status', status, gatherernames);

    // Clear disk & memory cache if it's a perf run
    if (isPerfRun) await driver.cleanBrowserCaches();
    // Always record devtoolsLog
    await driver.beginDevtoolsLog();
    // Begin tracing if requested by config.
    if (recordTrace) await driver.beginTrace(settings);

    // Navigate.
    await GatherRunner.loadPage(driver, passContext);
    log.log('statusEnd', status);

    for (const gathererDefn of gatherers) {
      const gatherer = gathererDefn.instance;
      // Abuse the passContext to pass through gatherer options
      passContext.options = gathererDefn.options || {};
      const artifactPromise = Promise.resolve().then(_ => gatherer.pass(passContext));

      const gathererResult = gathererResults[gatherer.name] || [];
      gathererResult.push(artifactPromise);
      gathererResults[gatherer.name] = gathererResult;
      await GatherRunner.recoverOrThrow(artifactPromise);
    }
  }

  /**
   * Ends tracing and collects trace data (if requested for this pass), and runs
   * afterPass() on gatherers with trace data passed in. Promise resolves with
   * object containing trace and network data.
   * @param {LH.Gatherer.PassContext} passContext
   * @param {Partial<GathererResults>} gathererResults
   * @return {Promise<LH.Gatherer.LoadData>}
   */
  static async afterPass(passContext, gathererResults) {
    const driver = passContext.driver;
    const config = passContext.passConfig;
    const gatherers = config.gatherers;

    let trace;
    if (config.recordTrace) {
      log.log('status', 'Retrieving trace');
      trace = await driver.endTrace();
      log.verbose('statusEnd', 'Retrieving trace');
    }

    const status = 'Retrieving devtoolsLog and network records';
    log.log('status', status);
    const devtoolsLog = driver.endDevtoolsLog();
    const networkRecords = NetworkRecorder.recordsFromLogs(devtoolsLog);
    log.verbose('statusEnd', status);

    let pageLoadError = GatherRunner.getPageLoadError(passContext.url, networkRecords);
    // If the driver was offline, a page load error is expected, so do not save it.
    if (!driver.online) pageLoadError = undefined;

    if (pageLoadError) {
      log.error('GatherRunner', pageLoadError.message, passContext.url);
      passContext.LighthouseRunWarnings.push(pageLoadError.friendlyMessage);
    }

    // Expose devtoolsLog, networkRecords, and trace (if present) to gatherers
    /** @type {LH.Gatherer.LoadData} */
    const passData = {
      networkRecords,
      devtoolsLog,
      trace,
    };

    // Disable throttling so the afterPass analysis isn't throttled
    await driver.setThrottling(passContext.settings, {useThrottling: false});

    for (const gathererDefn of gatherers) {
      const gatherer = gathererDefn.instance;
      const status = `Retrieving: ${gatherer.name}`;
      log.log('status', status);

      // Add gatherer options to the passContext.
      passContext.options = gathererDefn.options || {};

      // If there was a pageLoadError, fail every afterPass with it rather than bail completely.
      const artifactPromise = pageLoadError ?
        Promise.reject(pageLoadError) :
        // Wrap gatherer response in promise, whether rejected or not.
        Promise.resolve().then(_ => gatherer.afterPass(passContext, passData));

      const gathererResult = gathererResults[gatherer.name] || [];
      gathererResult.push(artifactPromise);
      gathererResults[gatherer.name] = gathererResult;
      await GatherRunner.recoverOrThrow(artifactPromise);
      log.verbose('statusEnd', status);
    }

    // Resolve on tracing data using passName from config.
    return passData;
  }

  /**
   * Takes the results of each gatherer phase for each gatherer and uses the
   * last produced value (that's not undefined) as the artifact for that
   * gatherer. If a non-fatal error was rejected from a gatherer phase,
   * uses that error object as the artifact instead.
   * @param {Partial<GathererResults>} gathererResults
   * @param {LH.BaseArtifacts} baseArtifacts
   * @return {Promise<LH.Artifacts>}
   */
  static async collectArtifacts(gathererResults, baseArtifacts) {
    /** @type {Partial<LH.GathererArtifacts>} */
    const gathererArtifacts = {};

    const resultsEntries = /** @type {GathererResultsEntries} */ (Object.entries(gathererResults));
    for (const [gathererName, phaseResultsPromises] of resultsEntries) {
      if (gathererArtifacts[gathererName] !== undefined) continue;

      try {
        const phaseResults = await Promise.all(phaseResultsPromises);
        // Take last defined pass result as artifact.
        const definedResults = phaseResults.filter(element => element !== undefined);
        const artifact = definedResults[definedResults.length - 1];
        // Typecast pretends artifact always provided here, but checked below for top-level `throw`.
        gathererArtifacts[gathererName] = /** @type {NonVoid<PhaseResult>} */ (artifact);
      } catch (err) {
        // An error result must be non-fatal to not have caused an exit by now,
        // so return it to runner to handle turning it into an error audit.
        gathererArtifacts[gathererName] = err;
      }

      if (gathererArtifacts[gathererName] === undefined) {
        throw new Error(`${gathererName} failed to provide an artifact.`);
      }
    }

    // Take only unique LighthouseRunWarnings.
    baseArtifacts.LighthouseRunWarnings = Array.from(new Set(baseArtifacts.LighthouseRunWarnings));

    // TODO(bckenny): drop cast when ComputedArtifacts not included in Artifacts
    return /** @type {LH.Artifacts} */ ({...baseArtifacts, ...gathererArtifacts});
  }

  /**
   * @param {{driver: Driver, requestedUrl: string, settings: LH.Config.Settings}} options
   * @return {Promise<LH.BaseArtifacts>}
   */
  static async getBaseArtifacts(options) {
    return {
      fetchTime: (new Date()).toJSON(),
      LighthouseRunWarnings: [],
      HostUserAgent: await options.driver.getUserAgent(),
      NetworkUserAgent: '', // updated later
      BenchmarkIndex: 0, // updated later
      traces: {},
      devtoolsLogs: {},
      settings: options.settings,
      URL: {requestedUrl: options.requestedUrl, finalUrl: ''},
    };
  }

  /**
   * @param {Array<LH.Config.Pass>} passes
   * @param {{driver: Driver, requestedUrl: string, settings: LH.Config.Settings}} options
   * @return {Promise<LH.Artifacts>}
   */
  static async run(passes, options) {
    const driver = options.driver;

    /** @type {Partial<GathererResults>} */
    const gathererResults = {};

    try {
      await driver.connect();
      const baseArtifacts = await GatherRunner.getBaseArtifacts(options);
      await GatherRunner.loadBlank(driver);
      baseArtifacts.BenchmarkIndex = await options.driver.getBenchmarkIndex();
      await GatherRunner.setupDriver(driver, options);

      // Run each pass
      let firstPass = true;
      for (const passConfig of passes) {
        const passContext = {
          driver: options.driver,
          // If the main document redirects, we'll update this to keep track
          url: options.requestedUrl,
          settings: options.settings,
          passConfig,
          // *pass() functions and gatherers can push to this warnings array.
          LighthouseRunWarnings: baseArtifacts.LighthouseRunWarnings,
        };

        await driver.setThrottling(options.settings, passConfig);
        await GatherRunner.beforePass(passContext, gathererResults);
        await GatherRunner.pass(passContext, gathererResults);
        const passData = await GatherRunner.afterPass(passContext, gathererResults);

        // Save devtoolsLog, but networkRecords are discarded and not added onto artifacts.
        baseArtifacts.devtoolsLogs[passConfig.passName] = passData.devtoolsLog;

        const userAgentEntry = passData.devtoolsLog.find(entry =>
          entry.method === 'Network.requestWillBeSent' &&
          !!entry.params.request.headers['User-Agent']
        );

        if (userAgentEntry && !baseArtifacts.NetworkUserAgent) {
          // @ts-ignore - guaranteed to exist by the find above
          baseArtifacts.NetworkUserAgent = userAgentEntry.params.request.headers['User-Agent'];
        }

        // If requested by config, save pass's trace.
        if (passData.trace) {
          baseArtifacts.traces[passConfig.passName] = passData.trace;
        }

        if (firstPass) {
          // Copy redirected URL to artifact in the first pass only.
          baseArtifacts.URL.finalUrl = passContext.url;
          firstPass = false;
        }
      }
      const resetStorage = !options.settings.disableStorageReset;
      if (resetStorage) await driver.clearDataForOrigin(options.requestedUrl);
      await GatherRunner.disposeDriver(driver);
      return GatherRunner.collectArtifacts(gathererResults, baseArtifacts);
    } catch (err) {
      // cleanup on error
      GatherRunner.disposeDriver(driver);
      throw err;
    }
  }
}

module.exports = GatherRunner;
