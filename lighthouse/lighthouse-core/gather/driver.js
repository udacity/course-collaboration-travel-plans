/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
// @ts-nocheck
'use strict';

const NetworkRecorder = require('../lib/network-recorder');
const emulation = require('../lib/emulation');
const Element = require('../lib/element');
const EventEmitter = require('events').EventEmitter;
const URL = require('../lib/url-shim');
const TraceParser = require('../lib/traces/trace-parser');

const log = require('lighthouse-logger');
const DevtoolsLog = require('./devtools-log');

// Controls how long to wait after onLoad before continuing
const DEFAULT_PAUSE_AFTER_LOAD = 0;
// Controls how long to wait between network requests before determining the network is quiet
const DEFAULT_NETWORK_QUIET_THRESHOLD = 5000;
// Controls how long to wait between longtasks before determining the CPU is idle, off by default
const DEFAULT_CPU_QUIET_THRESHOLD = 0;

const _uniq = arr => Array.from(new Set(arr));

class Driver {
  static get MAX_WAIT_FOR_FULLY_LOADED() {
    return 45 * 1000;
  }

  /**
   * @param {!Connection} connection
   */
  constructor(connection) {
    this._traceEvents = [];
    this._traceCategories = Driver.traceCategories;
    this._eventEmitter = new EventEmitter();
    this._connection = connection;
    // currently only used by WPT where just Page and Network are needed
    this._devtoolsLog = new DevtoolsLog(/^(Page|Network)\./);
    this.online = true;
    this._domainEnabledCounts = new Map();
    this._isolatedExecutionContextId = undefined;

    /**
     * Used for monitoring network status events during gotoURL.
     * @private {?NetworkRecorder}
     */
    this._networkStatusMonitor = null;

    /**
     * Used for monitoring url redirects during gotoURL.
     * @private {?string}
     */
    this._monitoredUrl = null;

    connection.on('notification', event => {
      this._devtoolsLog.record(event);
      if (this._networkStatusMonitor) {
        this._networkStatusMonitor.dispatch(event.method, event.params);
      }
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
   * @return {!Promise<string>}
   */
  getUserAgent() {
    // FIXME: use Browser.getVersion instead
    return this.evaluateAsync('navigator.userAgent');
  }

  /**
   * @return {!Promise<null>}
   */
  connect() {
    return this._connection.connect();
  }

  disconnect() {
    return this._connection.disconnect();
  }

  /**
   * Get the browser WebSocket endpoint for devtools protocol clients like Puppeteer.
   * Only works with WebSocket connection, not extension or devtools.
   * @return {!Promise<string>}
   */
  wsEndpoint() {
    return this._connection.wsEndpoint();
  }

  /**
   * Bind listeners for protocol events
   * @param {!string} eventName
   * @param {function(...args)} cb
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
   * @param {!string} eventName
   * @param {function(...args)} cb
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
   * Unbind event listeners
   * @param {!string} eventName
   * @param {function(...args)} cb
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
   * Call protocol methods
   * @param {!string} method
   * @param {!Object} params
   * @param {{silent: boolean}=} cmdOpts
   * @return {!Promise}
   */
  sendCommand(method, params, cmdOpts) {
    const domainCommand = /^(\w+)\.(enable|disable)$/.exec(method);
    if (domainCommand) {
      const enable = domainCommand[2] === 'enable';
      if (!this._shouldToggleDomain(domainCommand[1], enable)) {
        return Promise.resolve();
      }
    }

    return this._connection.sendCommand(method, params, cmdOpts);
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
   * @return {!Promise<string>} Identifier of the added script.
   */
  evaluteScriptOnNewDocument(scriptSource) {
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
   * @param {{useIsolation: boolean}=} options
   * @return {!Promise<*>}
   */
  evaluateAsync(expression, options = {}) {
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
   * @return {!Promise<*>}
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
          return new __nativePromise(function (resolve) {
            return __nativePromise.resolve()
              .then(_ => ${expression})
              .catch(${wrapRuntimeEvalErrorInBrowser.toString()})
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

        return response;
      });
  }

  getServiceWorkerVersions() {
    return new Promise((resolve, reject) => {
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
   * @param {!string} pageUrl
   * @return {!Promise}
   */
  assertNoSameOriginServiceWorkerClients(pageUrl) {
    let registrations;
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
   * @return {{promise: !Promise, cancel: function()}}
   * @private
   */
  _waitForNetworkIdle(networkQuietThresholdMs) {
    let idleTimeout;
    let cancel;

    const promise = new Promise((resolve, reject) => {
      const onIdle = () => {
        // eslint-disable-next-line no-use-before-define
        this._networkStatusMonitor.once('network-2-busy', onBusy);
        idleTimeout = setTimeout(_ => {
          cancel();
          resolve();
        }, networkQuietThresholdMs);
      };

      const onBusy = () => {
        this._networkStatusMonitor.once('network-2-idle', onIdle);
        clearTimeout(idleTimeout);
      };

      const domContentLoadedListener = () => {
        if (this._networkStatusMonitor.is2Idle()) {
          onIdle();
        } else {
          onBusy();
        }
      };

      this.once('Page.domContentEventFired', domContentLoadedListener);
      cancel = () => {
        clearTimeout(idleTimeout);
        this.off('Page.domContentEventFired', domContentLoadedListener);
        this._networkStatusMonitor.removeListener('network-2-busy', onBusy);
        this._networkStatusMonitor.removeListener('network-2-idle', onIdle);
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
   * @return {{promise: !Promise, cancel: function()}}
   */
  _waitForCPUIdle(waitForCPUQuiet) {
    if (!waitForCPUQuiet) {
      return {
        promise: Promise.resolve(),
        cancel: () => undefined,
      };
    }

    let lastTimeout;
    let cancelled = false;

    const checkForQuietExpression = `(${checkTimeSinceLastLongTask.toString()})()`;
    function checkForQuiet(driver, resolve) {
      if (cancelled) return;

      return driver.evaluateAsync(checkForQuietExpression)
        .then(timeSinceLongTask => {
          if (cancelled) return;

          if (typeof timeSinceLongTask === 'number' && timeSinceLongTask >= waitForCPUQuiet) {
            log.verbose('Driver', `CPU has been idle for ${timeSinceLongTask} ms`);
            resolve();
          } else {
            log.verbose('Driver', `CPU has been idle for ${timeSinceLongTask} ms`);
            const timeToWait = waitForCPUQuiet - timeSinceLongTask;
            lastTimeout = setTimeout(() => checkForQuiet(driver, resolve), timeToWait);
          }
        });
    }

    let cancel;
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
   * @return {{promise: !Promise, cancel: function()}}
   * @private
   */
  _waitForLoadEvent(pauseAfterLoadMs) {
    let loadListener;
    let loadTimeout;

    const promise = new Promise((resolve, reject) => {
      loadListener = function() {
        loadTimeout = setTimeout(resolve, pauseAfterLoadMs);
      };
      this.once('Page.loadEventFired', loadListener);
    });
    const cancel = () => {
      this.off('Page.loadEventFired', loadListener);
      clearTimeout(loadTimeout);
    };

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
   * @return {!Promise}
   * @private
   */
  _waitForFullyLoaded(pauseAfterLoadMs, networkQuietThresholdMs, cpuQuietThresholdMs,
      maxWaitForLoadedMs) {
    let maxTimeoutHandle;

    // Listener for onload. Resolves pauseAfterLoadMs ms after load.
    const waitForLoadEvent = this._waitForLoadEvent(pauseAfterLoadMs);
    // Network listener. Resolves when the network has been idle for networkQuietThresholdMs.
    const waitForNetworkIdle = this._waitForNetworkIdle(networkQuietThresholdMs);
    // CPU listener. Resolves when the CPU has been idle for cpuQuietThresholdMs after network idle.
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
        clearTimeout(maxTimeoutHandle);
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
    return Promise.race([
      loadPromise,
      maxTimeoutPromise,
    ]).then(cleanup => cleanup());
  }

  /**
   * Set up listener for network quiet events and URL redirects. Passed in URL
   * will be monitored for redirects, with the final loaded URL passed back in
   * _endNetworkStatusMonitoring.
   * @param {string} startingUrl
   * @return {!Promise}
   * @private
   */
  _beginNetworkStatusMonitoring(startingUrl) {
    this._networkStatusMonitor = new NetworkRecorder([]);

    // Update startingUrl if it's ever redirected.
    this._monitoredUrl = startingUrl;
    this._networkStatusMonitor.on('requestloaded', redirectRequest => {
      // Ignore if this is not a redirected request.
      if (!redirectRequest.redirectSource) {
        return;
      }
      const earlierRequest = redirectRequest.redirectSource;
      if (earlierRequest.url === this._monitoredUrl) {
        this._monitoredUrl = redirectRequest.url;
      }
    });

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
    return finalUrl;
  }

  /**
   * Returns the cached isolated execution context ID or creates a new execution context for the main
   * frame. The cached execution context is cleared on every gotoURL invocation, so a new one will
   * always be created on the first call on a new page.
   * @return {!Promise<number>}
   */
  _getOrCreateIsolatedContextId() {
    if (typeof this._isolatedExecutionContextId === 'number') {
      return Promise.resolve(this._isolatedExecutionContextId);
    }

    return this.sendCommand('Page.getResourceTree')
      .then(data => {
        const mainFrameId = data.frameTree.frame.id;
        return this.sendCommand('Page.createIsolatedWorld', {
          frameId: mainFrameId,
          worldName: 'lighthouse_isolated_context',
        });
      })
      .then(data => this._isolatedExecutionContextId = data.executionContextId);
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
   * @param {!Object} options
   * @return {!Promise<string>}
   */
  gotoURL(url, options = {}) {
    const waitForLoad = options.waitForLoad || false;
    const disableJS = options.disableJavaScript || false;

    let pauseAfterLoadMs = options.config && options.config.pauseAfterLoadMs;
    let networkQuietThresholdMs = options.config && options.config.networkQuietThresholdMs;
    let cpuQuietThresholdMs = options.config && options.config.cpuQuietThresholdMs;
    let maxWaitMs = options.flags && options.flags.maxWaitForLoad;

    /* eslint-disable max-len */
    if (typeof pauseAfterLoadMs !== 'number') pauseAfterLoadMs = DEFAULT_PAUSE_AFTER_LOAD;
    if (typeof networkQuietThresholdMs !== 'number') networkQuietThresholdMs = DEFAULT_NETWORK_QUIET_THRESHOLD;
    if (typeof cpuQuietThresholdMs !== 'number') cpuQuietThresholdMs = DEFAULT_CPU_QUIET_THRESHOLD;
    if (typeof maxWaitMs !== 'number') maxWaitMs = Driver.MAX_WAIT_FOR_FULLY_LOADED;
    /* eslint-enable max-len */

    return this._beginNetworkStatusMonitoring(url)
      .then(_ => this._clearIsolatedContextId())
      .then(_ => {
        // These can 'race' and that's OK.
        // We don't want to wait for Page.navigate's resolution, as it can now
        // happen _after_ onload: https://crbug.com/768961
        this.sendCommand('Page.enable');
        this.sendCommand('Emulation.setScriptExecutionDisabled', {value: disableJS});
        this.sendCommand('Page.navigate', {url});
      })
      .then(_ => waitForLoad && this._waitForFullyLoaded(pauseAfterLoadMs,
          networkQuietThresholdMs, cpuQuietThresholdMs, maxWaitMs))
      .then(_ => this._endNetworkStatusMonitoring());
  }

  /**
   * @param {string} objectId Object ID for the resolved DOM node
   * @param {string} propName Name of the property
   * @return {!Promise<string>} The property value, or null, if property not found
  */
  getObjectProperty(objectId, propName) {
    return new Promise((resolve, reject) => {
      this.sendCommand('Runtime.getProperties', {
        objectId,
        accessorPropertiesOnly: true,
        generatePreview: false,
        ownProperties: false,
      })
      .then(properties => {
        const propertyForName = properties.result
          .find(property => property.name === propName);

        if (propertyForName && propertyForName.value) {
          resolve(propertyForName.value.value);
        } else {
          resolve(null);
        }
      }).catch(reject);
    });
  }

  /**
   * Return the body of the response with the given ID.
   * @param {string} requestId
   * @return {string}
   */
  getRequestContent(requestId) {
    return this.sendCommand('Network.getResponseBody', {
      requestId,
    // Ignoring result.base64Encoded, which indicates if body is already encoded
    }).then(result => result.body);
  }

  /**
   * @param {string} name The name of API whose permission you wish to query
   * @return {!Promise<string>} The state of permissions, resolved in a promise.
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
   * @return {!Promise<Element>} The found element, or null, resolved in a promise
   */
  querySelector(selector) {
    return this.sendCommand('DOM.getDocument')
      .then(result => result.root.nodeId)
      .then(nodeId => this.sendCommand('DOM.querySelector', {
        nodeId,
        selector,
      }))
      .then(element => {
        if (element.nodeId === 0) {
          return null;
        }
        return new Element(element, this);
      });
  }

  /**
   * @param {string} selector Selector to find in the DOM
   * @return {!Promise<!Array<!Element>>} The found elements, or [], resolved in a promise
   */
  querySelectorAll(selector) {
    return this.sendCommand('DOM.getDocument')
      .then(result => result.root.nodeId)
      .then(nodeId => this.sendCommand('DOM.querySelectorAll', {
        nodeId,
        selector,
      }))
      .then(nodeList => {
        const elementList = [];
        nodeList.nodeIds.forEach(nodeId => {
          if (nodeId !== 0) {
            elementList.push(new Element({nodeId}, this));
          }
        });
        return elementList;
      });
  }

  /**
   * Returns the flattened list of all DOM elements within the document.
   * @param {boolean=} pierce Whether to pierce through shadow trees and iframes.
   *     True by default.
   * @return {!Promise<!Array<!Element>>} The found elements, or [], resolved in a promise
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
   * @return {!Promise<!Array<!Node>>} The found nodes, or [], resolved in a promise
   */
  getNodesInDocument(pierce = true) {
    return this.sendCommand('DOM.getFlattenedDocument', {depth: -1, pierce})
      .then(result => result.nodes ? result.nodes : []);
  }

  /**
   * @param {{additionalTraceCategories: string=}=} flags
   */
  beginTrace(flags) {
    const additionalCategories = (flags && flags.additionalTraceCategories &&
        flags.additionalTraceCategories.split(',')) || [];
    const traceCategories = this._traceCategories.concat(additionalCategories);
    const tracingOpts = {
      categories: _uniq(traceCategories).join(','),
      transferMode: 'ReturnAsStream',
      options: 'sampling-frequency=10000', // 1000 is default and too slow.
    };

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
      // ensure tracing is stopped before we can start
      // see https://github.com/GoogleChrome/lighthouse/issues/1091
      .then(_ => this.endTraceIfStarted())
      .then(_ => this.sendCommand('Tracing.start', tracingOpts));
  }

  endTraceIfStarted() {
    return new Promise((resolve) => {
      const traceCallback = () => resolve();
      this.once('Tracing.tracingComplete', traceCallback);
      return this.sendCommand('Tracing.end', undefined, {silent: true}).catch(() => {
        this.off('Tracing.tracingComplete', traceCallback);
        traceCallback();
      });
    });
  }

  endTrace() {
    return new Promise((resolve, reject) => {
      // When the tracing has ended this will fire with a stream handle.
      this.once('Tracing.tracingComplete', streamHandle => {
        this._readTraceFromStream(streamHandle)
            .then(traceContents => resolve(traceContents), reject);
      });

      // Issue the command to stop tracing.
      return this.sendCommand('Tracing.end').catch(reject);
    });
  }

  _readTraceFromStream(streamHandle) {
    return new Promise((resolve, reject) => {
      let isEOF = false;
      const parser = new TraceParser();

      const readArguments = {
        handle: streamHandle.stream,
      };

      const onChunkRead = response => {
        if (isEOF) {
          return;
        }

        parser.parseChunk(response.data);

        if (response.eof) {
          isEOF = true;
          return resolve(parser.getTrace());
        }

        return this.sendCommand('IO.read', readArguments).then(onChunkRead);
      };

      this.sendCommand('IO.read', readArguments).then(onChunkRead).catch(reject);
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
   * @return {!Array<{method: string, params: (!Object<string, *>|undefined)}>}
   */
  endDevtoolsLog() {
    this._devtoolsLog.endRecording();
    return this._devtoolsLog.messages;
  }

  enableRuntimeEvents() {
    return this.sendCommand('Runtime.enable');
  }

  beginEmulation(flags) {
    return Promise.resolve().then(_ => {
      if (!flags.disableDeviceEmulation) return emulation.enableNexus5X(this);
    }).then(_ => this.setThrottling(flags, {useThrottling: true}));
  }

  setThrottling(flags, passConfig) {
    const throttleCpu = passConfig.useThrottling && !flags.disableCpuThrottling;
    const throttleNetwork = passConfig.useThrottling && !flags.disableNetworkThrottling;
    const cpuPromise = throttleCpu ?
        emulation.enableCPUThrottling(this) :
        emulation.disableCPUThrottling(this);
    const networkPromise = throttleNetwork ?
        emulation.enableNetworkThrottling(this) :
        emulation.disableNetworkThrottling(this);

    return Promise.all([cpuPromise, networkPromise]);
  }

  /**
   * Emulate internet disconnection.
   * @return {!Promise}
   */
  goOffline() {
    return this.sendCommand('Network.enable')
      .then(_ => emulation.goOffline(this))
      .then(_ => this.online = false);
  }

  /**
   * Enable internet connection, using emulated mobile settings if
   * `options.flags.disableNetworkThrottling` is false.
   * @param {!Object} options
   * @return {!Promise}
   */
  goOnline(options) {
    return this.setThrottling(options.flags, options.config)
        .then(_ => this.online = true);
  }

  cleanBrowserCaches() {
    // Wipe entire disk cache
    return this.sendCommand('Network.clearBrowserCache')
      // Toggle 'Disable Cache' to evict the memory cache
      .then(_ => this.sendCommand('Network.setCacheDisabled', {cacheDisabled: true}))
      .then(_ => this.sendCommand('Network.setCacheDisabled', {cacheDisabled: false}));
  }

  /**
   * @param {!Object} headers key/value pairs of HTTP Headers.
   * @return {!Promise}
   */
  setExtraHTTPHeaders(headers) {
    if (headers) {
      return this.sendCommand('Network.setExtraHTTPHeaders', {
        headers,
      });
    }

    return Promise.resolve({});
  }

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
   * @return {!Promise}
   */
  cacheNatives() {
    return this.evaluteScriptOnNewDocument(`window.__nativePromise = Promise;
        window.__nativeError = Error;`);
  }

  /**
   * Install a performance observer that watches longtask timestamps for waitForCPUIdle.
   * @return {!Promise}
   */
  registerPerformanceObserver() {
    return this.evaluteScriptOnNewDocument(`(${registerPerformanceObserverInPage.toString()})()`);
  }

  /**
   * Keeps track of calls to a JS function and returns a list of {url, line, col}
   * of the usage. Should be called before page load (in beforePass).
   * @param {string} funcName The function name to track ('Date.now', 'console.time').
   * @return {function(): !Promise<!Array<{url: string, line: number, col: number}>>}
   *     Call this method when you want results.
   */
  captureFunctionCallSites(funcName) {
    const globalVarToPopulate = `window['__${funcName}StackTraces']`;
    const collectUsage = () => {
      return this.evaluateAsync(
          `Array.from(${globalVarToPopulate}).map(item => JSON.parse(item))`)
        .then(result => {
          if (!Array.isArray(result)) {
            throw new Error(
                'Driver failure: Expected evaluateAsync results to be an array ' +
                `but got "${JSON.stringify(result)}" instead.`);
          }
          // Filter out usage from extension content scripts.
          return result.filter(item => !item.isExtension);
        });
    };

    const funcBody = captureJSCallUsage.toString();

    this.evaluteScriptOnNewDocument(`
        ${globalVarToPopulate} = new Set();
        (${funcName} = ${funcBody}(${funcName}, ${globalVarToPopulate}))`);

    return collectUsage;
  }

  /**
   * @param {!Array<string>} urls URL patterns to block. Wildcards ('*') are allowed.
   * @return {!Promise}
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
   * @return {!Promise}
   */
  dismissJavaScriptDialogs() {
    return this.sendCommand('Page.enable').then(_ => {
      this.on('Page.javascriptDialogOpening', data => {
        log.warn('Driver', `${data.type} dialog opened by the page automatically suppressed.`);

        // rejection intentionally unhandled
        this.sendCommand('Page.handleJavaScriptDialog', {
          accept: true,
          promptText: 'Lighthouse prompt response',
        });
      });
    });
  }
}

/**
 * Tracks function call usage. Used by captureJSCalls to inject code into the page.
 * @param {function(...*): *} funcRef The function call to track.
 * @param {!Set} set An empty set to populate with stack traces. Should be
 *     on the global object.
 * @return {function(...*): *} A wrapper around the original function.
 */
/* istanbul ignore next */
function captureJSCallUsage(funcRef, set) {
  /* global window */
  const __nativeError = window.__nativeError || Error;
  const originalFunc = funcRef;
  const originalPrepareStackTrace = __nativeError.prepareStackTrace;

  return function(...args) {
    // Note: this function runs in the context of the page that is being audited.

    // See v8's Stack Trace API https://github.com/v8/v8/wiki/Stack-Trace-API#customizing-stack-traces
    __nativeError.prepareStackTrace = function(error, structStackTrace) {
      // First frame is the function we injected (the one that just threw).
      // Second, is the actual callsite of the funcRef we're after.
      const callFrame = structStackTrace[1];
      let url = callFrame.getFileName() || callFrame.getEvalOrigin();
      const line = callFrame.getLineNumber();
      const col = callFrame.getColumnNumber();
      const isEval = callFrame.isEval();
      let isExtension = false;
      const stackTrace = structStackTrace.slice(1).map(callsite => callsite.toString());

      // If we don't have an URL, (e.g. eval'd code), use the 2nd entry in the
      // stack trace. First is eval context: eval(<context>):<line>:<col>.
      // Second is the callsite where eval was called.
      // See https://crbug.com/646849.
      if (isEval) {
        url = stackTrace[1];
      }

      // Chrome extension content scripts can produce an empty .url and
      // "<anonymous>:line:col" for the first entry in the stack trace.
      if (stackTrace[0].startsWith('<anonymous>')) {
        // Note: Although captureFunctionCallSites filters out crx usage,
        // filling url here provides context. We may want to keep those results
        // some day.
        url = stackTrace[0];
        isExtension = true;
      }

      // TODO: add back when we want stack traces.
      // Stack traces were removed from the return object in
      // https://github.com/GoogleChrome/lighthouse/issues/957 so callsites
      // would be unique.
      return {url, args, line, col, isEval, isExtension}; // return value is e.stack
    };
    const e = new __nativeError(`__called ${funcRef.name}__`);
    set.add(JSON.stringify(e.stack));

    // Restore prepareStackTrace so future errors use v8's formatter and not
    // our custom one.
    __nativeError.prepareStackTrace = originalPrepareStackTrace;

    // eslint-disable-next-line no-invalid-this
    return originalFunc.apply(this, args);
  };
}

/**
 * The `exceptionDetails` provided by the debugger protocol does not contain the useful
 * information such as name, message, and stack trace of the error when it's wrapped in a
 * promise. Instead, map to a successful object that contains this information.
 * @param {string|Error} err The error to convert
 */
/* istanbul ignore next */
function wrapRuntimeEvalErrorInBrowser(err) {
  err = err || new Error();
  const fallbackMessage = typeof err === 'string' ? err : 'unknown error';

  return {
    __failedInBrowser: true,
    name: err.name || 'Error',
    message: err.message || fallbackMessage,
    stack: err.stack || (new Error()).stack,
  };
}

/**
 * Used by _waitForCPUIdle and executed in the context of the page, updates the ____lastLongTask
 * property on window to the end time of the last long task.
 */
/* istanbul ignore next */
function registerPerformanceObserverInPage() {
  window.____lastLongTask = window.performance.now();
  const observer = new window.PerformanceObserver(entryList => {
    const entries = entryList.getEntries();
    for (const entry of entries) {
      if (entry.entryType === 'longtask') {
        const taskEnd = entry.startTime + entry.duration;
        window.____lastLongTask = Math.max(window.____lastLongTask, taskEnd);
      }
    }
  });

  observer.observe({entryTypes: ['longtask']});
  // HACK: A PerformanceObserver will be GC'd if there are no more references to it, so attach it to
  // window to ensure we still receive longtask notifications. See https://crbug.com/742530.
  // For an example test of this behavior see https://gist.github.com/patrickhulce/69d8bed1807e762218994b121d06fea6.
  //   FIXME COMPAT: This hack isn't neccessary as of Chrome 62.0.3176.0
  //   https://bugs.chromium.org/p/chromium/issues/detail?id=742530#c7
  window.____lhPerformanceObserver = observer;
}


/**
 * Used by _waitForCPUIdle and executed in the context of the page, returns time since last long task.
 */
/* istanbul ignore next */
function checkTimeSinceLastLongTask() {
  // Wait for a delta before returning so that we're sure the PerformanceObserver
  // has had time to register the last longtask
  return new Promise(resolve => {
    const timeoutRequested = window.performance.now() + 50;

    setTimeout(() => {
      // Double check that a long task hasn't happened since setTimeout
      const timeoutFired = window.performance.now();
      const timeSinceLongTask = timeoutFired - timeoutRequested < 50 ?
          timeoutFired - window.____lastLongTask : 0;
      resolve(timeSinceLongTask);
    }, 50);
  });
}

module.exports = Driver;
