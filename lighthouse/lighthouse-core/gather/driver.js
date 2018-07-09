/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const NetworkRecorder = require('../lib/network-recorder');
const emulation = require('../lib/emulation');
const Element = require('../lib/element');
const LHError = require('../lib/lh-error');
const NetworkRequest = require('../lib/network-request');
const EventEmitter = require('events').EventEmitter;
const URL = require('../lib/url-shim');
const constants = require('../config/constants');

const log = require('lighthouse-logger');
const DevtoolsLog = require('./devtools-log');

const pageFunctions = require('../lib/page-functions.js');

// Pulled in for Connection type checking.
// eslint-disable-next-line no-unused-vars
const Connection = require('./connections/connection.js');

// Controls how long to wait after onLoad before continuing
const DEFAULT_PAUSE_AFTER_LOAD = 0;
// Controls how long to wait between network requests before determining the network is quiet
const DEFAULT_NETWORK_QUIET_THRESHOLD = 5000;
// Controls how long to wait between longtasks before determining the CPU is idle, off by default
const DEFAULT_CPU_QUIET_THRESHOLD = 0;

/**
 * @typedef {LH.Protocol.StrictEventEmitter<LH.CrdpEvents>} CrdpEventEmitter
 */

class Driver {
  /**
   * @param {Connection} connection
   */
  constructor(connection) {
    this._traceCategories = Driver.traceCategories;
    /**
     * An event emitter that enforces mapping between Crdp event names and payload types.
     */
    this._eventEmitter = /** @type {CrdpEventEmitter} */ (new EventEmitter());
    this._connection = connection;
    // currently only used by WPT where just Page and Network are needed
    this._devtoolsLog = new DevtoolsLog(/^(Page|Network)\./);
    this.online = true;
    /** @type {Map<string, number>} */
    this._domainEnabledCounts = new Map();
    /** @type {number|undefined} */
    this._isolatedExecutionContextId = undefined;

    /**
     * Used for monitoring network status events during gotoURL.
     * @type {?NetworkRecorder}
     * @private
     */
    this._networkStatusMonitor = null;

    /**
     * Used for monitoring url redirects during gotoURL.
     * @type {?string}
     * @private
     */
    this._monitoredUrl = null;

    connection.on('protocolevent', event => {
      this._devtoolsLog.record(event);
      if (this._networkStatusMonitor) {
        this._networkStatusMonitor.dispatch(event);
      }

      // @ts-ignore TODO(bckenny): tsc can't type event.params correctly yet,
      // typing as property of union instead of narrowing from union of
      // properties. See https://github.com/Microsoft/TypeScript/pull/22348.
      this._eventEmitter.emit(event.method, event.params);
    });
  }

  static get traceCategories() {
    return [
      '-*', // exclude default
      'toplevel',
      'v8.execute',
      'blink.console',
      'blink.user_timing',
      'benchmark',
      'loading',
      'latencyInfo',
      'devtools.timeline',
      'disabled-by-default-devtools.timeline',
      'disabled-by-default-devtools.timeline.frame',
      'disabled-by-default-devtools.timeline.stack',
      // Flipped off until bugs.chromium.org/p/v8/issues/detail?id=5820 is fixed in Stable
      // 'disabled-by-default-v8.cpu_profiler',
      // 'disabled-by-default-v8.cpu_profiler.hires',
      'disabled-by-default-devtools.screenshot',
    ];
  }

  /**
   * @return {Promise<string>}
   */
  getUserAgent() {
    // FIXME: use Browser.getVersion instead
    return this.evaluateAsync('navigator.userAgent');
  }

  /**
   * Computes the ULTRADUMB™ benchmark index to get a rough estimate of device class.
   * @return {Promise<number>}
   */
  getBenchmarkIndex() {
    return this.evaluateAsync(`(${pageFunctions.ultradumbBenchmarkString})()`);
  }

  /**
   * @return {Promise<void>}
   */
  connect() {
    return this._connection.connect();
  }

  /**
   * @return {Promise<void>}
   */
  disconnect() {
    return this._connection.disconnect();
  }

  /**
   * Get the browser WebSocket endpoint for devtools protocol clients like Puppeteer.
   * Only works with WebSocket connection, not extension or devtools.
   * @return {Promise<string>}
   */
  wsEndpoint() {
    return this._connection.wsEndpoint();
  }

  /**
   * Bind listeners for protocol events.
   * @template {keyof LH.CrdpEvents} E
   * @param {E} eventName
   * @param {(...args: LH.CrdpEvents[E]) => void} cb
   */
  on(eventName, cb) {
    if (this._eventEmitter === null) {
      throw new Error('connect() must be called before attempting to listen to events.');
    }

    // log event listeners being bound
    log.formatProtocol('listen for event =>', {method: eventName}, 'verbose');
    this._eventEmitter.on(eventName, cb);
  }

  /**
   * Bind a one-time listener for protocol events. Listener is removed once it
   * has been called.
   * @template {keyof LH.CrdpEvents} E
   * @param {E} eventName
   * @param {(...args: LH.CrdpEvents[E]) => void} cb
   */
  once(eventName, cb) {
    if (this._eventEmitter === null) {
      throw new Error('connect() must be called before attempting to listen to events.');
    }
    // log event listeners being bound
    log.formatProtocol('listen once for event =>', {method: eventName}, 'verbose');
    this._eventEmitter.once(eventName, cb);
  }

  /**
   * Unbind event listener.
   * @template {keyof LH.CrdpEvents} E
   * @param {E} eventName
   * @param {Function} cb
   */
  off(eventName, cb) {
    if (this._eventEmitter === null) {
      throw new Error('connect() must be called before attempting to remove an event listener.');
    }

    this._eventEmitter.removeListener(eventName, cb);
  }

  /**
   * Debounce enabling or disabling domains to prevent driver users from
   * stomping on each other. Maintains an internal count of the times a domain
   * has been enabled. Returns false if the command would have no effect (domain
   * is already enabled or disabled), or if command would interfere with another
   * user of that domain (e.g. two gatherers have enabled a domain, both need to
   * disable it for it to be disabled). Returns true otherwise.
   * @param {string} domain
   * @param {boolean} enable
   * @return {boolean}
   * @private
   */
  _shouldToggleDomain(domain, enable) {
    const enabledCount = this._domainEnabledCounts.get(domain) || 0;
    const newCount = enabledCount + (enable ? 1 : -1);
    this._domainEnabledCounts.set(domain, Math.max(0, newCount));

    // Switching to enabled or disabled, respectively.
    if ((enable && newCount === 1) || (!enable && newCount === 0)) {
      log.verbose('Driver', `${domain}.${enable ? 'enable' : 'disable'}`);
      return true;
    } else {
      if (newCount < 0) {
        log.error('Driver', `Attempted to disable domain '${domain}' when already disabled.`);
      }
      return false;
    }
  }

  /**
   * Call protocol methods.
   * @template {keyof LH.CrdpCommands} C
   * @param {C} method
   * @param {LH.CrdpCommands[C]['paramsType']} params,
   * @return {Promise<LH.CrdpCommands[C]['returnType']>}
   */
  sendCommand(method, ...params) {
    const domainCommand = /^(\w+)\.(enable|disable)$/.exec(method);
    if (domainCommand) {
      const enable = domainCommand[2] === 'enable';
      if (!this._shouldToggleDomain(domainCommand[1], enable)) {
        return Promise.resolve();
      }
    }

    return this._connection.sendCommand(method, ...params);
  }

  /**
   * Returns whether a domain is currently enabled.
   * @param {string} domain
   * @return {boolean}
   */
  isDomainEnabled(domain) {
    // Defined, non-zero elements of the domains map are enabled.
    return !!this._domainEnabledCounts.get(domain);
  }

  /**
   * Add a script to run at load time of all future page loads.
   * @param {string} scriptSource
   * @return {Promise<LH.Crdp.Page.AddScriptToEvaluateOnLoadResponse>} Identifier of the added script.
   */
  evaluateScriptOnNewDocument(scriptSource) {
    return this.sendCommand('Page.addScriptToEvaluateOnLoad', {
      scriptSource,
    });
  }

  /**
   * Evaluate an expression in the context of the current page. If useIsolation is true, the expression
   * will be evaluated in a content script that has access to the page's DOM but whose JavaScript state
   * is completely separate.
   * Returns a promise that resolves on the expression's value.
   * @param {string} expression
   * @param {{useIsolation?: boolean}=} options
   * @return {Promise<*>}
   */
  evaluateAsync(expression, options = {}) {
    // tsc won't convert {Promise<number>|Promise<undefined>}, so cast manually.
    // https://github.com/Microsoft/TypeScript/issues/7294
    /** @type {Promise<number|undefined>} */
    const contextIdPromise = options.useIsolation ?
        this._getOrCreateIsolatedContextId() :
        Promise.resolve(undefined);
    return contextIdPromise.then(contextId => this._evaluateInContext(expression, contextId));
  }

  /**
   * Evaluate an expression in the given execution context; an undefined contextId implies the main
   * page without isolation.
   * @param {string} expression
   * @param {number|undefined} contextId
   * @return {Promise<*>}
   */
  _evaluateInContext(expression, contextId) {
    return new Promise((resolve, reject) => {
      // If this gets to 60s and it hasn't been resolved, reject the Promise.
      const asyncTimeout = setTimeout(
        (_ => reject(new Error('The asynchronous expression exceeded the allotted time of 60s'))),
        60000
      );

      const evaluationParams = {
        // We need to explicitly wrap the raw expression for several purposes:
        // 1. Ensure that the expression will be a native Promise and not a polyfill/non-Promise.
        // 2. Ensure that errors in the expression are captured by the Promise.
        // 3. Ensure that errors captured in the Promise are converted into plain-old JS Objects
        //    so that they can be serialized properly b/c JSON.stringify(new Error('foo')) === '{}'
        expression: `(function wrapInNativePromise() {
          const __nativePromise = window.__nativePromise || Promise;
          const URL = window.__nativeURL || window.URL;
          return new __nativePromise(function (resolve) {
            return __nativePromise.resolve()
              .then(_ => ${expression})
              .catch(${pageFunctions.wrapRuntimeEvalErrorInBrowserString})
              .then(resolve);
          });
        }())`,
        includeCommandLineAPI: true,
        awaitPromise: true,
        returnByValue: true,
        contextId,
      };

      this.sendCommand('Runtime.evaluate', evaluationParams).then(result => {
        clearTimeout(asyncTimeout);
        const value = result.result.value;

        if (result.exceptionDetails) {
          // An error occurred before we could even create a Promise, should be *very* rare
          reject(new Error('an unexpected driver error occurred'));
        } if (value && value.__failedInBrowser) {
          reject(Object.assign(new Error(), value));
        } else {
          resolve(value);
        }
      }).catch(err => {
        clearTimeout(asyncTimeout);
        reject(err);
      });
    });
  }

  /**
   * @return {Promise<{url: string, data: string}|null>}
   */
  getAppManifest() {
    return this.sendCommand('Page.getAppManifest')
      .then(response => {
        // We're not reading `response.errors` however it may contain critical and noncritical
        // errors from Blink's manifest parser:
        //   https://chromedevtools.github.io/debugger-protocol-viewer/tot/Page/#type-AppManifestError
        if (!response.data) {
          // If the data is empty, the page had no manifest.
          return null;
        }

        return /** @type {Required<LH.Crdp.Page.GetAppManifestResponse>} */ (response);
      });
  }

  /**
   * @return {Promise<LH.Crdp.ServiceWorker.WorkerVersionUpdatedEvent>}
   */
  getServiceWorkerVersions() {
    return new Promise((resolve, reject) => {
      /**
       * @param {LH.Crdp.ServiceWorker.WorkerVersionUpdatedEvent} data
       */
      const versionUpdatedListener = data => {
        // find a service worker with runningStatus that looks like active
        // on slow connections the serviceworker might still be installing
        const activateCandidates = data.versions.filter(sw => {
          return sw.status !== 'redundant';
        });
        const hasActiveServiceWorker = activateCandidates.find(sw => {
          return sw.status === 'activated';
        });

        if (!activateCandidates.length || hasActiveServiceWorker) {
          this.off('ServiceWorker.workerVersionUpdated', versionUpdatedListener);
          this.sendCommand('ServiceWorker.disable')
            .then(_ => resolve(data), reject);
        }
      };

      this.on('ServiceWorker.workerVersionUpdated', versionUpdatedListener);

      this.sendCommand('ServiceWorker.enable').catch(reject);
    });
  }

  /**
   * @return {Promise<LH.Crdp.ServiceWorker.WorkerRegistrationUpdatedEvent>}
   */
  getServiceWorkerRegistrations() {
    return new Promise((resolve, reject) => {
      this.once('ServiceWorker.workerRegistrationUpdated', data => {
        this.sendCommand('ServiceWorker.disable')
          .then(_ => resolve(data), reject);
      });

      this.sendCommand('ServiceWorker.enable').catch(reject);
    });
  }

  /**
   * Rejects if any open tabs would share a service worker with the target URL.
   * This includes the target tab, so navigation to something like about:blank
   * should be done before calling.
   * @param {string} pageUrl
   * @return {Promise<void>}
   */
  assertNoSameOriginServiceWorkerClients(pageUrl) {
    /** @type {Array<LH.Crdp.ServiceWorker.ServiceWorkerRegistration>} */
    let registrations;
    /** @type {Array<LH.Crdp.ServiceWorker.ServiceWorkerVersion>} */
    let versions;

    return this.getServiceWorkerRegistrations().then(data => {
      registrations = data.registrations;
    }).then(_ => this.getServiceWorkerVersions()).then(data => {
      versions = data.versions;
    }).then(_ => {
      const origin = new URL(pageUrl).origin;

      registrations
        .filter(reg => {
          const swOrigin = new URL(reg.scopeURL).origin;

          return origin === swOrigin;
        })
        .forEach(reg => {
          versions.forEach(ver => {
            // Ignore workers unaffiliated with this registration
            if (ver.registrationId !== reg.registrationId) {
              return;
            }

            // Throw if service worker for this origin has active controlledClients.
            if (ver.controlledClients && ver.controlledClients.length > 0) {
              throw new Error('You probably have multiple tabs open to the same origin.');
            }
          });
        });
    });
  }

  /**
   * Returns a promise that resolves when the network has been idle (after DCL) for
   * `networkQuietThresholdMs` ms and a method to cancel internal network listeners/timeout.
   * @param {number} networkQuietThresholdMs
   * @return {{promise: Promise<void>, cancel: function(): void}}
   * @private
   */
  _waitForNetworkIdle(networkQuietThresholdMs) {
    /** @type {NodeJS.Timer|undefined} */
    let idleTimeout;
    /** @type {(() => void)} */
    let cancel = () => {
      throw new Error('_waitForNetworkIdle.cancel() called before it was defined');
    };

    // Check here for _networkStatusMonitor to satisfy type checker. Any further race condition
    // will be caught at runtime on calls to it.
    if (!this._networkStatusMonitor) {
      throw new Error('Driver._waitForNetworkIdle called with no networkStatusMonitor');
    }
    const networkStatusMonitor = this._networkStatusMonitor;

    const promise = new Promise((resolve, reject) => {
      const onIdle = () => {
        // eslint-disable-next-line no-use-before-define
        networkStatusMonitor.once('network-2-busy', onBusy);
        idleTimeout = setTimeout(_ => {
          cancel();
          resolve();
        }, networkQuietThresholdMs);
      };

      const onBusy = () => {
        networkStatusMonitor.once('network-2-idle', onIdle);
        idleTimeout && clearTimeout(idleTimeout);
      };

      const domContentLoadedListener = () => {
        if (networkStatusMonitor.is2Idle()) {
          onIdle();
        } else {
          onBusy();
        }
      };

      this.once('Page.domContentEventFired', domContentLoadedListener);
      cancel = () => {
        idleTimeout && clearTimeout(idleTimeout);
        this.off('Page.domContentEventFired', domContentLoadedListener);
        networkStatusMonitor.removeListener('network-2-busy', onBusy);
        networkStatusMonitor.removeListener('network-2-idle', onIdle);
      };
    });

    return {
      promise,
      cancel,
    };
  }

  /**
   * Resolves when there have been no long tasks for at least waitForCPUQuiet ms.
   * @param {number} waitForCPUQuiet
   * @return {{promise: Promise<void>, cancel: function(): void}}
   */
  _waitForCPUIdle(waitForCPUQuiet) {
    if (!waitForCPUQuiet) {
      return {
        promise: Promise.resolve(),
        cancel: () => undefined,
      };
    }

    /** @type {NodeJS.Timer|undefined} */
    let lastTimeout;
    let cancelled = false;

    const checkForQuietExpression = `(${pageFunctions.checkTimeSinceLastLongTaskString})()`;
    /**
     * @param {Driver} driver
     * @param {() => void} resolve
     */
    function checkForQuiet(driver, resolve) {
      if (cancelled) return;

      return driver.evaluateAsync(checkForQuietExpression)
        .then(timeSinceLongTask => {
          if (cancelled) return;

          if (typeof timeSinceLongTask === 'number') {
            if (timeSinceLongTask >= waitForCPUQuiet) {
              log.verbose('Driver', `CPU has been idle for ${timeSinceLongTask} ms`);
              resolve();
            } else {
              log.verbose('Driver', `CPU has been idle for ${timeSinceLongTask} ms`);
              const timeToWait = waitForCPUQuiet - timeSinceLongTask;
              lastTimeout = setTimeout(() => checkForQuiet(driver, resolve), timeToWait);
            }
          }
        });
    }

    /** @type {(() => void)} */
    let cancel = () => {
      throw new Error('_waitForCPUIdle.cancel() called before it was defined');
    };
    const promise = new Promise((resolve, reject) => {
      checkForQuiet(this, resolve);
      cancel = () => {
        cancelled = true;
        if (lastTimeout) clearTimeout(lastTimeout);
        reject(new Error('Wait for CPU idle cancelled'));
      };
    });

    return {
      promise,
      cancel,
    };
  }

  /**
   * Return a promise that resolves `pauseAfterLoadMs` after the load event
   * fires and a method to cancel internal listeners and timeout.
   * @param {number} pauseAfterLoadMs
   * @return {{promise: Promise<void>, cancel: function(): void}}
   * @private
   */
  _waitForLoadEvent(pauseAfterLoadMs) {
    /** @type {(() => void)} */
    let cancel = () => {
      throw new Error('_waitForLoadEvent.cancel() called before it was defined');
    };

    const promise = new Promise((resolve, reject) => {
      /** @type {NodeJS.Timer|undefined} */
      let loadTimeout;
      const loadListener = function() {
        loadTimeout = setTimeout(resolve, pauseAfterLoadMs);
      };
      this.once('Page.loadEventFired', loadListener);

      cancel = () => {
        this.off('Page.loadEventFired', loadListener);
        loadTimeout && clearTimeout(loadTimeout);
      };
    });

    return {
      promise,
      cancel,
    };
  }

  /**
   * Returns a promise that resolves when:
   * - All of the following conditions have been met:
   *    - pauseAfterLoadMs milliseconds have passed since the load event.
   *    - networkQuietThresholdMs milliseconds have passed since the last network request that exceeded
   *      2 inflight requests (network-2-quiet has been reached).
   *    - cpuQuietThresholdMs have passed since the last long task after network-2-quiet.
   * - maxWaitForLoadedMs milliseconds have passed.
   * See https://github.com/GoogleChrome/lighthouse/issues/627 for more.
   * @param {number} pauseAfterLoadMs
   * @param {number} networkQuietThresholdMs
   * @param {number} cpuQuietThresholdMs
   * @param {number} maxWaitForLoadedMs
   * @return {Promise<void>}
   * @private
   */
  async _waitForFullyLoaded(pauseAfterLoadMs, networkQuietThresholdMs, cpuQuietThresholdMs,
      maxWaitForLoadedMs) {
    /** @type {NodeJS.Timer|undefined} */
    let maxTimeoutHandle;

    // Listener for onload. Resolves pauseAfterLoadMs ms after load.
    const waitForLoadEvent = this._waitForLoadEvent(pauseAfterLoadMs);
    // Network listener. Resolves when the network has been idle for networkQuietThresholdMs.
    const waitForNetworkIdle = this._waitForNetworkIdle(networkQuietThresholdMs);
    // CPU listener. Resolves when the CPU has been idle for cpuQuietThresholdMs after network idle.
    /** @type {{promise: Promise<void>, cancel: function(): void}|null} */
    let waitForCPUIdle = null;

    // Wait for both load promises. Resolves on cleanup function the clears load
    // timeout timer.
    const loadPromise = Promise.all([
      waitForLoadEvent.promise,
      waitForNetworkIdle.promise,
    ]).then(() => {
      waitForCPUIdle = this._waitForCPUIdle(cpuQuietThresholdMs);
      return waitForCPUIdle.promise;
    }).then(() => {
      return function() {
        log.verbose('Driver', 'loadEventFired and network considered idle');
        maxTimeoutHandle && clearTimeout(maxTimeoutHandle);
      };
    });

    // Last resort timeout. Resolves maxWaitForLoadedMs ms from now on
    // cleanup function that removes loadEvent and network idle listeners.
    const maxTimeoutPromise = new Promise((resolve, reject) => {
      maxTimeoutHandle = setTimeout(resolve, maxWaitForLoadedMs);
    }).then(_ => {
      return function() {
        log.warn('Driver', 'Timed out waiting for page load. Moving on...');
        waitForLoadEvent.cancel();
        waitForNetworkIdle.cancel();
        waitForCPUIdle && waitForCPUIdle.cancel();
      };
    });

    // Wait for load or timeout and run the cleanup function the winner returns.
    const cleanupFn = await Promise.race([
      loadPromise,
      maxTimeoutPromise,
    ]);
    cleanupFn();
  }

  /**
   * Set up listener for network quiet events and URL redirects. Passed in URL
   * will be monitored for redirects, with the final loaded URL passed back in
   * _endNetworkStatusMonitoring.
   * @param {string} startingUrl
   * @return {Promise<void>}
   * @private
   */
  _beginNetworkStatusMonitoring(startingUrl) {
    this._networkStatusMonitor = new NetworkRecorder();

    // Update startingUrl if it's ever redirected.
    this._monitoredUrl = startingUrl;
    /** @param {LH.Artifacts.NetworkRequest} redirectRequest */
    const requestLoadedListener = redirectRequest => {
      // Ignore if this is not a redirected request.
      if (!redirectRequest.redirectSource) {
        return;
      }
      const earlierRequest = redirectRequest.redirectSource;
      if (earlierRequest.url === this._monitoredUrl) {
        this._monitoredUrl = redirectRequest.url;
      }
    };
    this._networkStatusMonitor.on('requestloaded', requestLoadedListener);

    return this.sendCommand('Network.enable');
  }

  /**
   * End network status listening. Returns the final, possibly redirected,
   * loaded URL starting with the one passed into _endNetworkStatusMonitoring.
   * @return {string}
   * @private
   */
  _endNetworkStatusMonitoring() {
    this._networkStatusMonitor = null;
    const finalUrl = this._monitoredUrl;
    this._monitoredUrl = null;

    if (!finalUrl) {
      throw new Error('Network Status Monitoring ended with an undefined finalUrl');
    }

    return finalUrl;
  }

  /**
   * Returns the cached isolated execution context ID or creates a new execution context for the main
   * frame. The cached execution context is cleared on every gotoURL invocation, so a new one will
   * always be created on the first call on a new page.
   * @return {Promise<number>}
   */
  async _getOrCreateIsolatedContextId() {
    if (typeof this._isolatedExecutionContextId === 'number') {
      return this._isolatedExecutionContextId;
    }

    const resourceTreeResponse = await this.sendCommand('Page.getResourceTree');
    const mainFrameId = resourceTreeResponse.frameTree.frame.id;

    const isolatedWorldResponse = await this.sendCommand('Page.createIsolatedWorld', {
      frameId: mainFrameId,
      worldName: 'lighthouse_isolated_context',
    });

    this._isolatedExecutionContextId = isolatedWorldResponse.executionContextId;
    return isolatedWorldResponse.executionContextId;
  }

  _clearIsolatedContextId() {
    this._isolatedExecutionContextId = undefined;
  }

  /**
   * Navigate to the given URL. Direct use of this method isn't advised: if
   * the current page is already at the given URL, navigation will not occur and
   * so the returned promise will only resolve after the MAX_WAIT_FOR_FULLY_LOADED
   * timeout. See https://github.com/GoogleChrome/lighthouse/pull/185 for one
   * possible workaround.
   * Resolves on the url of the loaded page, taking into account any redirects.
   * @param {string} url
   * @param {{waitForLoad?: boolean, passContext?: LH.Gatherer.PassContext}} options
   * @return {Promise<string>}
   */
  async gotoURL(url, options = {}) {
    const waitForLoad = options.waitForLoad || false;
    const passContext = /** @type {Partial<LH.Gatherer.PassContext>} */ (options.passContext || {});
    const disableJS = passContext.disableJavaScript || false;

    await this._beginNetworkStatusMonitoring(url);
    await this._clearIsolatedContextId();

    // These can 'race' and that's OK.
    // We don't want to wait for Page.navigate's resolution, as it can now
    // happen _after_ onload: https://crbug.com/768961
    this.sendCommand('Page.enable');
    this.sendCommand('Emulation.setScriptExecutionDisabled', {value: disableJS});
    this.sendCommand('Page.navigate', {url});

    if (waitForLoad) {
      const passConfig = /** @type {Partial<LH.Config.Pass>} */ (passContext.passConfig || {});
      let {pauseAfterLoadMs, networkQuietThresholdMs, cpuQuietThresholdMs} = passConfig;
      let maxWaitMs = passContext.settings && passContext.settings.maxWaitForLoad;

      /* eslint-disable max-len */
      if (typeof pauseAfterLoadMs !== 'number') pauseAfterLoadMs = DEFAULT_PAUSE_AFTER_LOAD;
      if (typeof networkQuietThresholdMs !== 'number') networkQuietThresholdMs = DEFAULT_NETWORK_QUIET_THRESHOLD;
      if (typeof cpuQuietThresholdMs !== 'number') cpuQuietThresholdMs = DEFAULT_CPU_QUIET_THRESHOLD;
      if (typeof maxWaitMs !== 'number') maxWaitMs = constants.defaultSettings.maxWaitForLoad;
      /* eslint-enable max-len */

      await this._waitForFullyLoaded(pauseAfterLoadMs, networkQuietThresholdMs, cpuQuietThresholdMs,
          maxWaitMs);
    }

    return this._endNetworkStatusMonitoring();
  }

  /**
   * @param {string} objectId Object ID for the resolved DOM node
   * @param {string} propName Name of the property
   * @return {Promise<string|null>} The property value, or null, if property not found
  */
  async getObjectProperty(objectId, propName) {
    const propertiesResponse = await this.sendCommand('Runtime.getProperties', {
      objectId,
      accessorPropertiesOnly: true,
      generatePreview: false,
      ownProperties: false,
    });

    const propertyForName = propertiesResponse.result
        .find(property => property.name === propName);

    if (propertyForName && propertyForName.value) {
      return propertyForName.value.value;
    } else {
      return null;
    }
  }

  /**
   * Return the body of the response with the given ID. Rejects if getting the
   * body times out.
   * @param {string} requestId
   * @param {number} [timeout]
   * @return {Promise<string>}
   */
  getRequestContent(requestId, timeout = 1000) {
    requestId = NetworkRequest.getRequestIdForBackend(requestId);

    return new Promise((resolve, reject) => {
      // If this takes more than 1s, reject the Promise.
      // Why? Encoding issues can lead to hanging getResponseBody calls: https://github.com/GoogleChrome/lighthouse/pull/4718
      const err = new LHError(LHError.errors.REQUEST_CONTENT_TIMEOUT);
      const asyncTimeout = setTimeout((_ => reject(err)), timeout);

      this.sendCommand('Network.getResponseBody', {requestId}).then(result => {
        clearTimeout(asyncTimeout);
        // Ignoring result.base64Encoded, which indicates if body is already encoded
        resolve(result.body);
      }).catch(e => {
        clearTimeout(asyncTimeout);
        reject(e);
      });
    });
  }

  /**
   * @param {string} name The name of API whose permission you wish to query
   * @return {Promise<string>} The state of permissions, resolved in a promise.
   *    See https://developer.mozilla.org/en-US/docs/Web/API/Permissions/query.
   */
  queryPermissionState(name) {
    const expressionToEval = `
      navigator.permissions.query({name: '${name}'}).then(result => {
        return result.state;
      })
    `;

    return this.evaluateAsync(expressionToEval);
  }

  /**
   * @param {string} selector Selector to find in the DOM
   * @return {Promise<Element|null>} The found element, or null, resolved in a promise
   */
  async querySelector(selector) {
    const documentResponse = await this.sendCommand('DOM.getDocument');
    const rootNodeId = documentResponse.root.nodeId;

    const targetNode = await this.sendCommand('DOM.querySelector', {
      nodeId: rootNodeId,
      selector,
    });

    if (targetNode.nodeId === 0) {
      return null;
    }
    return new Element(targetNode, this);
  }

  /**
   * @param {string} selector Selector to find in the DOM
   * @return {Promise<Array<Element>>} The found elements, or [], resolved in a promise
   */
  async querySelectorAll(selector) {
    const documentResponse = await this.sendCommand('DOM.getDocument');
    const rootNodeId = documentResponse.root.nodeId;

    const targetNodeList = await this.sendCommand('DOM.querySelectorAll', {
      nodeId: rootNodeId,
      selector,
    });

    /** @type {Array<Element>} */
    const elementList = [];
    targetNodeList.nodeIds.forEach(nodeId => {
      if (nodeId !== 0) {
        elementList.push(new Element({nodeId}, this));
      }
    });
    return elementList;
  }

  /**
   * Returns the flattened list of all DOM elements within the document.
   * @param {boolean=} pierce Whether to pierce through shadow trees and iframes.
   *     True by default.
   * @return {Promise<Array<Element>>} The found elements, or [], resolved in a promise
   */
  getElementsInDocument(pierce = true) {
    return this.getNodesInDocument(pierce)
      .then(nodes => nodes
        .filter(node => node.nodeType === 1)
        .map(node => new Element({nodeId: node.nodeId}, this))
      );
  }

  /**
   * Returns the flattened list of all DOM nodes within the document.
   * @param {boolean=} pierce Whether to pierce through shadow trees and iframes.
   *     True by default.
   * @return {Promise<Array<LH.Crdp.DOM.Node>>} The found nodes, or [], resolved in a promise
   */
  async getNodesInDocument(pierce = true) {
    const flattenedDocument = await this.sendCommand('DOM.getFlattenedDocument',
        {depth: -1, pierce});

    return flattenedDocument.nodes ? flattenedDocument.nodes : [];
  }

  /**
   * @param {{additionalTraceCategories?: string|null}=} settings
   * @return {Promise<void>}
   */
  beginTrace(settings) {
    const additionalCategories = (settings && settings.additionalTraceCategories &&
        settings.additionalTraceCategories.split(',')) || [];
    const traceCategories = this._traceCategories.concat(additionalCategories);
    const uniqueCategories = Array.from(new Set(traceCategories));

    // Check any domains that could interfere with or add overhead to the trace.
    if (this.isDomainEnabled('Debugger')) {
      throw new Error('Debugger domain enabled when starting trace');
    }
    if (this.isDomainEnabled('CSS')) {
      throw new Error('CSS domain enabled when starting trace');
    }
    if (this.isDomainEnabled('DOM')) {
      throw new Error('DOM domain enabled when starting trace');
    }

    // Enable Page domain to wait for Page.loadEventFired
    return this.sendCommand('Page.enable')
      .then(_ => this.sendCommand('Tracing.start', {
        categories: uniqueCategories.join(','),
        options: 'sampling-frequency=10000', // 1000 is default and too slow.
      }));
  }

  /**
   * @return {Promise<LH.Trace>}
   */
  endTrace() {
    /** @type {Array<LH.TraceEvent>} */
    const traceEvents = [];

    /**
     * Listener for when dataCollected events fire for each trace chunk
     * @param {LH.Crdp.Tracing.DataCollectedEvent} data
     */
    const dataListener = function(data) {
      traceEvents.push(...data.value);
    };
    this.on('Tracing.dataCollected', dataListener);

    return new Promise((resolve, reject) => {
      this.once('Tracing.tracingComplete', _ => {
        this.off('Tracing.dataCollected', dataListener);
        resolve({traceEvents});
      });

      return this.sendCommand('Tracing.end').catch(reject);
    });
  }

  /**
   * Begin recording devtools protocol messages.
   */
  beginDevtoolsLog() {
    this._devtoolsLog.reset();
    this._devtoolsLog.beginRecording();
  }

  /**
   * Stop recording to devtoolsLog and return log contents.
   * @return {LH.DevtoolsLog}
   */
  endDevtoolsLog() {
    this._devtoolsLog.endRecording();
    return this._devtoolsLog.messages;
  }

  /**
   * @return {Promise<void>}
   */
  enableRuntimeEvents() {
    return this.sendCommand('Runtime.enable');
  }

  /**
   * @param {LH.Config.Settings} settings
   * @return {Promise<void>}
   */
  async beginEmulation(settings) {
    if (!settings.disableDeviceEmulation) {
      await emulation.enableNexus5X(this);
    }

    await this.setThrottling(settings, {useThrottling: true});
  }

  /**
   * @param {LH.Config.Settings} settings
   * @param {{useThrottling?: boolean}} passConfig
   * @return {Promise<void>}
   */
  async setThrottling(settings, passConfig) {
    if (settings.throttlingMethod !== 'devtools') {
      return emulation.clearAllNetworkEmulation(this);
    }

    const cpuPromise = passConfig.useThrottling ?
        emulation.enableCPUThrottling(this, settings.throttling) :
        emulation.disableCPUThrottling(this);
    const networkPromise = passConfig.useThrottling ?
        emulation.enableNetworkThrottling(this, settings.throttling) :
        emulation.clearAllNetworkEmulation(this);

    await Promise.all([cpuPromise, networkPromise]);
  }

  /**
   * Emulate internet disconnection.
   * @return {Promise<void>}
   */
  async goOffline() {
    await this.sendCommand('Network.enable');
    await emulation.goOffline(this);
    this.online = false;
  }

  /**
   * Enable internet connection, using emulated mobile settings if applicable.
   * @param {{settings: LH.Config.Settings, passConfig: LH.Config.Pass}} options
   * @return {Promise<void>}
   */
  async goOnline(options) {
    await this.setThrottling(options.settings, options.passConfig);
    this.online = true;
  }

  /**
   * Emulate internet disconnection.
   * @return {Promise<void>}
   */
  cleanBrowserCaches() {
    // Wipe entire disk cache
    return this.sendCommand('Network.clearBrowserCache')
      // Toggle 'Disable Cache' to evict the memory cache
      .then(_ => this.sendCommand('Network.setCacheDisabled', {cacheDisabled: true}))
      .then(_ => this.sendCommand('Network.setCacheDisabled', {cacheDisabled: false}));
  }

  /**
   * @param {LH.Crdp.Network.Headers|null} headers key/value pairs of HTTP Headers.
   * @return {Promise<void>}
   */
  async setExtraHTTPHeaders(headers) {
    if (!headers) {
      return;
    }

    return this.sendCommand('Network.setExtraHTTPHeaders', {headers});
  }

  /**
   * @param {string} url
   * @return {Promise<void>}
   */
  clearDataForOrigin(url) {
    const origin = new URL(url).origin;

    // Clear all types of storage except cookies, so the user isn't logged out.
    //   https://chromedevtools.github.io/debugger-protocol-viewer/tot/Storage/#type-StorageType
    const typesToClear = [
      'appcache',
      // 'cookies',
      'file_systems',
      'indexeddb',
      'local_storage',
      'shader_cache',
      'websql',
      'service_workers',
      'cache_storage',
    ].join(',');

    return this.sendCommand('Storage.clearDataForOrigin', {
      origin: origin,
      storageTypes: typesToClear,
    });
  }

  /**
   * Cache native functions/objects inside window
   * so we are sure polyfills do not overwrite the native implementations
   * @return {Promise<void>}
   */
  async cacheNatives() {
    await this.evaluateScriptOnNewDocument(`window.__nativePromise = Promise;
        window.__nativeError = Error;
        window.__nativeURL = URL;`);
  }

  /**
   * Install a performance observer that watches longtask timestamps for waitForCPUIdle.
   * @return {Promise<void>}
   */
  async registerPerformanceObserver() {
    const scriptStr = `(${pageFunctions.registerPerformanceObserverInPageString})()`;
    await this.evaluateScriptOnNewDocument(scriptStr);
  }

  /**
   * @param {Array<string>} urls URL patterns to block. Wildcards ('*') are allowed.
   * @return {Promise<void>}
   */
  blockUrlPatterns(urls) {
    return this.sendCommand('Network.setBlockedURLs', {urls})
      .catch(err => {
        // TODO: remove this handler once m59 hits stable
        if (!/wasn't found/.test(err.message)) {
          throw err;
        }
      });
  }

  /**
   * Dismiss JavaScript dialogs (alert, confirm, prompt), providing a
   * generic promptText in case the dialog is a prompt.
   * @return {Promise<void>}
   */
  async dismissJavaScriptDialogs() {
    await this.sendCommand('Page.enable');

    this.on('Page.javascriptDialogOpening', data => {
      log.warn('Driver', `${data.type} dialog opened by the page automatically suppressed.`);

      // rejection intentionally unhandled
      this.sendCommand('Page.handleJavaScriptDialog', {
        accept: true,
        promptText: 'Lighthouse prompt response',
      });
    });
  }
}

module.exports = Driver;
