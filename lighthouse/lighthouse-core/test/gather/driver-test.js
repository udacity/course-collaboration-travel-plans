/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

let sendCommandParams = [];

const Driver = require('../../gather/driver.js');
const Connection = require('../../gather/connections/connection.js');
const Element = require('../../lib/element.js');
const assert = require('assert');
const EventEmitter = require('events').EventEmitter;

const connection = new Connection();
const driverStub = new Driver(connection);

const redirectDevtoolsLog = require('../fixtures/wikipedia-redirect.devtoolslog.json');
const MAX_WAIT_FOR_PROTOCOL = 20;

function createOnceStub(events) {
  return (eventName, cb) => {
    if (events[eventName]) {
      return cb(events[eventName]);
    }

    throw Error(`Stub not implemented: ${eventName}`);
  };
}

function createSWRegistration(id, url, isDeleted) {
  return {
    isDeleted: !!isDeleted,
    registrationId: id,
    scopeURL: url,
  };
}

function createActiveWorker(id, url, controlledClients, status = 'activated') {
  return {
    registrationId: id,
    scriptURL: url,
    controlledClients,
    status,
  };
}

connection.sendCommand = function(command, params) {
  sendCommandParams.push({command, params});
  switch (command) {
    case 'DOM.getDocument':
      return Promise.resolve({root: {nodeId: 249}});
    case 'DOM.querySelector':
      return Promise.resolve({
        nodeId: params.selector === 'invalid' ? 0 : 231,
      });
    case 'DOM.querySelectorAll':
      return Promise.resolve({
        nodeIds: params.selector === 'invalid' ? [] : [231],
      });
    case 'Runtime.evaluate':
      return Promise.resolve({result: {value: 123}});
    case 'Runtime.getProperties':
      return Promise.resolve({
        result: params.objectId === 'invalid' ? [] : [{
          name: 'test',
          value: {
            value: '123',
          },
        }, {
          name: 'novalue',
        }],
      });
    case 'Page.getResourceTree':
      return Promise.resolve({frameTree: {frame: {id: 1}}});
    case 'Page.createIsolatedWorld':
      return Promise.resolve({executionContextId: 1});
    case 'Network.getResponseBody':
      return new Promise(res => setTimeout(res, MAX_WAIT_FOR_PROTOCOL + 20));
    case 'Page.enable':
    case 'Network.enable':
    case 'Tracing.start':
    case 'ServiceWorker.enable':
    case 'ServiceWorker.disable':
    case 'Network.setExtraHTTPHeaders':
    case 'Network.emulateNetworkConditions':
    case 'Emulation.setCPUThrottlingRate':
      return Promise.resolve({});
    case 'Tracing.end':
      return Promise.reject(new Error('tracing not started'));
    default:
      throw Error(`Stub not implemented: ${command}`);
  }
};

/* eslint-env jest */

describe('Browser Driver', () => {
  beforeEach(() => {
    sendCommandParams = [];
  });

  it('returns null when DOM.querySelector finds no node', () => {
    return driverStub.querySelector('invalid').then(value => {
      assert.equal(value, null);
    });
  });

  it('returns element when DOM.querySelector finds node', () => {
    return driverStub.querySelector('meta head').then(value => {
      assert.equal(value instanceof Element, true);
    });
  });

  it('returns [] when DOM.querySelectorAll finds no node', () => {
    return driverStub.querySelectorAll('invalid').then(value => {
      assert.deepEqual(value, []);
    });
  });

  it('returns element when DOM.querySelectorAll finds node', () => {
    return driverStub.querySelectorAll('a').then(value => {
      assert.equal(value.length, 1);
      assert.equal(value[0] instanceof Element, true);
    });
  });

  it('returns value when getObjectProperty finds property name', () => {
    return driverStub.getObjectProperty('test', 'test').then(value => {
      assert.deepEqual(value, 123);
    });
  });

  it('returns null when getObjectProperty finds no property name', () => {
    return driverStub.getObjectProperty('invalid', 'invalid').then(value => {
      assert.deepEqual(value, null);
    });
  });

  it('returns null when getObjectProperty finds property name with no value', () => {
    return driverStub.getObjectProperty('test', 'novalue').then(value => {
      assert.deepEqual(value, null);
    });
  });

  it('throws if getRequestContent takes too long', () => {
    return driverStub.getRequestContent('', MAX_WAIT_FOR_PROTOCOL).then(_ => {
      assert.ok(false, 'long-running getRequestContent supposed to reject');
    }, e => {
      assert.equal(e.code, 'REQUEST_CONTENT_TIMEOUT');
    });
  });

  it('evaluates an expression', () => {
    return driverStub.evaluateAsync('120 + 3').then(value => {
      assert.deepEqual(value, 123);
      assert.equal(sendCommandParams[0].command, 'Runtime.evaluate');
    });
  });

  it('evaluates an expression in isolation', () => {
    return driverStub.evaluateAsync('120 + 3', {useIsolation: true}).then(value => {
      assert.deepEqual(value, 123);

      assert.ok(sendCommandParams.length > 1, 'did not create execution context');
      const evaluateCommand = sendCommandParams.find(data => data.command === 'Runtime.evaluate');
      assert.equal(evaluateCommand.params.contextId, 1);

      // test repeat isolation evaluations
      sendCommandParams = [];
      return driverStub.evaluateAsync('120 + 3', {useIsolation: true});
    }).then(value => {
      assert.deepEqual(value, 123);
      assert.ok(sendCommandParams.length === 1, 'created unnecessary 2nd execution context');
    });
  });

  it('will track redirects through gotoURL load', () => {
    const delay = _ => new Promise(resolve => setTimeout(resolve));

    class ReplayConnection extends EventEmitter {
      connect() {
        return Promise.resolve();
      }
      disconnect() {
        return Promise.resolve();
      }
      replayLog() {
        redirectDevtoolsLog.forEach(msg => this.emit('protocolevent', msg));
      }
      sendCommand(method) {
        const resolve = Promise.resolve();

        // If navigating, wait, then replay devtools log in parallel to resolve.
        if (method === 'Page.navigate') {
          resolve.then(delay).then(_ => this.replayLog());
        }

        return resolve;
      }
    }
    const replayConnection = new ReplayConnection();
    const driver = new Driver(replayConnection);

    // Redirect in log will go through
    const startUrl = 'http://en.wikipedia.org/';
    // then https://en.wikipedia.org/
    // then https://en.wikipedia.org/wiki/Main_Page
    const finalUrl = 'https://en.m.wikipedia.org/wiki/Main_Page';

    const loadOptions = {
      waitForLoad: true,
      passContext: {
        passConfig: {
          networkQuietThresholdMs: 1,
        },
      },
    };

    return driver.gotoURL(startUrl, loadOptions).then(loadedUrl => {
      assert.equal(loadedUrl, finalUrl);
    });
  });

  it('will request default traceCategories', () => {
    return driverStub.beginTrace().then(() => {
      const traceCmd = sendCommandParams.find(obj => obj.command === 'Tracing.start');
      const categories = traceCmd.params.categories;
      assert.ok(categories.includes('devtools.timeline'), 'contains devtools.timeline');
    });
  });

  it('will use requested additionalTraceCategories', () => {
    return driverStub.beginTrace({additionalTraceCategories: 'v8,v8.execute,toplevel'}).then(() => {
      const traceCmd = sendCommandParams.find(obj => obj.command === 'Tracing.start');
      const categories = traceCmd.params.categories;
      assert.ok(categories.includes('blink'), 'contains default categories');
      assert.ok(categories.includes('v8.execute'), 'contains added categories');
      assert.ok(categories.indexOf('toplevel') === categories.lastIndexOf('toplevel'),
          'de-dupes categories');
    });
  });

  it('should send the Network.setExtraHTTPHeaders command when there are extra-headers', () => {
    return driverStub.setExtraHTTPHeaders({
      'Cookie': 'monster',
      'x-men': 'wolverine',
    }).then(() => {
      assert.equal(sendCommandParams[0].command, 'Network.setExtraHTTPHeaders');
    });
  });

  it('should not send the Network.setExtraHTTPHeaders command when there no extra-headers', () => {
    return driverStub.setExtraHTTPHeaders().then(() => {
      assert.equal(sendCommandParams[0], undefined);
    });
  });
});

describe('Multiple tab check', () => {
  beforeEach(() => {
    sendCommandParams = [];
  });

  it('will pass if there are no current service workers', () => {
    const pageUrl = 'https://example.com/';
    driverStub.once = createOnceStub({
      'ServiceWorker.workerRegistrationUpdated': {
        registrations: [],
      },
    });

    driverStub.on = createOnceStub({
      'ServiceWorker.workerVersionUpdated': {
        versions: [],
      },
    });

    return driverStub.assertNoSameOriginServiceWorkerClients(pageUrl);
  });

  it('will pass if there is an active service worker for a different origin', () => {
    const pageUrl = 'https://example.com/';
    const secondUrl = 'https://example.edu';
    const swUrl = `${secondUrl}sw.js`;

    const registrations = [
      createSWRegistration(1, secondUrl),
    ];
    const versions = [
      createActiveWorker(1, swUrl, ['uniqueId']),
    ];

    driverStub.once = createOnceStub({
      'ServiceWorker.workerRegistrationUpdated': {
        registrations,
      },
    });

    driverStub.on = createOnceStub({
      'ServiceWorker.workerVersionUpdated': {
        versions,
      },
    });

    return driverStub.assertNoSameOriginServiceWorkerClients(pageUrl);
  });

  it('will fail if a service worker with a matching origin has a controlled client', () => {
    const pageUrl = 'https://example.com/';
    const swUrl = `${pageUrl}sw.js`;
    const registrations = [
      createSWRegistration(1, pageUrl),
    ];
    const versions = [
      createActiveWorker(1, swUrl, ['uniqueId']),
    ];

    driverStub.once = createOnceStub({
      'ServiceWorker.workerRegistrationUpdated': {
        registrations,
      },
    });

    driverStub.on = createOnceStub({
      'ServiceWorker.workerVersionUpdated': {
        versions,
      },
    });

    return driverStub.assertNoSameOriginServiceWorkerClients(pageUrl)
      .then(_ => assert.ok(false),
          err => {
            assert.ok(err.message.toLowerCase().includes('multiple tabs'));
          });
  });

  it('will succeed if a service worker with a matching origin has no controlled clients', () => {
    const pageUrl = 'https://example.com/';
    const swUrl = `${pageUrl}sw.js`;
    const registrations = [createSWRegistration(1, pageUrl)];
    const versions = [createActiveWorker(1, swUrl, [])];

    driverStub.once = createOnceStub({
      'ServiceWorker.workerRegistrationUpdated': {
        registrations,
      },
    });

    driverStub.on = createOnceStub({
      'ServiceWorker.workerVersionUpdated': {
        versions,
      },
    });

    return driverStub.assertNoSameOriginServiceWorkerClients(pageUrl);
  });

  it('will wait for serviceworker to be activated', () => {
    const pageUrl = 'https://example.com/';
    const swUrl = `${pageUrl}sw.js`;
    const registrations = [createSWRegistration(1, pageUrl)];
    const versions = [createActiveWorker(1, swUrl, [], 'installing')];

    driverStub.once = createOnceStub({
      'ServiceWorker.workerRegistrationUpdated': {
        registrations,
      },
    });

    driverStub.on = (eventName, cb) => {
      if (eventName === 'ServiceWorker.workerVersionUpdated') {
        cb({versions});

        setTimeout(() => {
          cb({
            versions: [
              createActiveWorker(1, swUrl, [], 'activated'),
            ],
          });
        }, 1000);

        return;
      }

      throw Error(`Stub not implemented: ${eventName}`);
    };

    return driverStub.assertNoSameOriginServiceWorkerClients(pageUrl);
  });

  describe('.goOnline', () => {
    it('re-establishes previous throttling settings', async () => {
      await driverStub.goOnline({
        passConfig: {useThrottling: true},
        settings: {
          throttlingMethod: 'devtools',
          throttling: {
            requestLatencyMs: 500,
            downloadThroughputKbps: 1000,
            uploadThroughputKbps: 1000,
          },
        },
      });

      const emulateCommand = sendCommandParams
        .find(item => item.command === 'Network.emulateNetworkConditions');
      assert.ok(emulateCommand, 'did not call emulate network');
      assert.deepStrictEqual(emulateCommand.params, {
        offline: false,
        latency: 500,
        downloadThroughput: 1000 * 1024 / 8,
        uploadThroughput: 1000 * 1024 / 8,
      });
    });

    it('clears network emulation when throttling is not devtools', async () => {
      await driverStub.goOnline({
        passConfig: {useThrottling: true},
        settings: {
          throttlingMethod: 'provided',
        },
      });

      const emulateCommand = sendCommandParams
        .find(item => item.command === 'Network.emulateNetworkConditions');
      assert.ok(emulateCommand, 'did not call emulate network');
      assert.deepStrictEqual(emulateCommand.params, {
        offline: false,
        latency: 0,
        downloadThroughput: 0,
        uploadThroughput: 0,
      });
    });

    it('clears network emulation when useThrottling is false', async () => {
      await driverStub.goOnline({
        passConfig: {useThrottling: false},
        settings: {
          throttlingMethod: 'devtools',
          throttling: {
            requestLatencyMs: 500,
            downloadThroughputKbps: 1000,
            uploadThroughputKbps: 1000,
          },
        },
      });

      const emulateCommand = sendCommandParams
        .find(item => item.command === 'Network.emulateNetworkConditions');
      assert.ok(emulateCommand, 'did not call emulate network');
      assert.deepStrictEqual(emulateCommand.params, {
        offline: false,
        latency: 0,
        downloadThroughput: 0,
        uploadThroughput: 0,
      });
    });
  });

  describe('.goOffline', () => {
    it('should send offline emulation', async () => {
      await driverStub.goOffline();
      const emulateCommand = sendCommandParams
        .find(item => item.command === 'Network.emulateNetworkConditions');
      assert.ok(emulateCommand, 'did not call emulate network');
      assert.deepStrictEqual(emulateCommand.params, {
        offline: true,
        latency: 0,
        downloadThroughput: 0,
        uploadThroughput: 0,
      });
    });
  });
});
