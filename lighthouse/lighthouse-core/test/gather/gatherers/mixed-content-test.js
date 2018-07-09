/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env jest */

const MixedContentGather = require('../../../gather/gatherers/mixed-content');
const assert = require('assert');
let mixedContentGather;
let driver;

class MockDriver {
  constructor() {}
  on(_) {}
  cb(_) {} // per-test fixture
  sendCommand(name, args) {
    this.cb(args);
  }
}

describe('MixedContent Gatherer', () => {
  beforeEach(() => {
    mixedContentGather = new MixedContentGather();
    driver = new MockDriver();
  });

  it('upgrades URLs to HTTPS', () => {
    return assert.equal(
      mixedContentGather.upgradeURL('http://www.example.org/'),
      'https://www.example.org/'
    );
  });

  it('downgrades URLs to HTTP', () => {
    return assert.equal(
      mixedContentGather.downgradeURL('https://www.example.org/'),
      'http://www.example.org/'
    );
  });

  it('downgrades the provided URL to HTTP', () => {
    const opts = {
      driver: driver,
      url: 'https://www.example.org/',
    };
    mixedContentGather.beforePass(opts);
    return assert.equal(opts.url, 'http://www.example.org/');
  });

  it('sends a HTTP redirect on intercepting a request', () => {
    const event = {
      interceptionId: 1,
      request: {
        url: 'http://www.example.org',
      },
    };
    driver.cb = (args) => {
      assert.strictEqual(Buffer.from(args.rawResponse, 'base64')
          .toString('utf8').includes('302 Found'), true);
    };
    const onRequestIntercepted = mixedContentGather._getRequestInterceptor(undefined, driver);
    onRequestIntercepted(event);
  });

  it('only tries redirecting once', () => {
    const event = {
      interceptionId: 1,
      request: {
        url: 'http://www.example.org/',
      },
    };
    driver.numInterceptions = 0;
    driver.cb = (args) => {
      if (driver.numInterceptions > 0) {
        assert.strictEqual(args.rawResponse, undefined);
      } else {
        assert.strictEqual(Buffer.from(args.rawResponse, 'base64')
            .toString('utf8').includes('302 Found'), true);
      }
      driver.numInterceptions += 1;
    };
    const onRequestIntercepted = mixedContentGather._getRequestInterceptor(undefined, driver);
    onRequestIntercepted(event);
    onRequestIntercepted(event);
  });

  it('does not sent a redirect when intercepting the main URL', () => {
    const url = 'http://www.example.org/';
    const event = {
      interceptionId: 1,
      request: {
        url,
      },
    };
    driver.cb = (args) => {
      assert.strictEqual(args.rawResponse, undefined);
    };
    const onRequestIntercepted = mixedContentGather._getRequestInterceptor(url, driver);
    onRequestIntercepted(event);
  });
});
