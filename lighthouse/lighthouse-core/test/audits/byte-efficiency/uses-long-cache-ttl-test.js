/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const CacheHeadersAudit = require('../../../audits/byte-efficiency/uses-long-cache-ttl.js');
const assert = require('assert');
const WebInspector = require('../../../lib/web-inspector');

/* eslint-env mocha */

function networkRecord(options = {}) {
  const headers = [];
  Object.keys(options.headers || {}).forEach(name => {
    headers.push({name, value: options.headers[name]});
  });

  return {
    _url: options.url || 'https://example.com/asset',
    statusCode: options.statusCode || 200,
    _resourceType: options.resourceType || WebInspector.resourceTypes.Script,
    _transferSize: options.transferSize || 10000,
    _responseHeaders: headers,
  };
}

describe('Cache headers audit', () => {
  let artifacts;
  let networkRecords;

  beforeEach(() => {
    artifacts = {
      devtoolsLogs: {},
      requestNetworkRecords: () => Promise.resolve(networkRecords),
      requestNetworkThroughput: () => Promise.resolve(1000),
    };
  });

  describe('#linearInterpolation', () => {
    it('correctly interpolates when slope is 2', () => {
      const slopeOf2 = x => CacheHeadersAudit.linearInterpolation(0, 0, 10, 20, x);
      assert.equal(slopeOf2(-10), -20);
      assert.equal(slopeOf2(5), 10);
      assert.equal(slopeOf2(10), 20);
    });

    it('correctly interpolates when slope is 0', () => {
      const slopeOf0 = x => CacheHeadersAudit.linearInterpolation(0, 0, 10, 0, x);
      assert.equal(slopeOf0(-10), 0);
      assert.equal(slopeOf0(5), 0);
      assert.equal(slopeOf0(10), 0);
    });
  });

  it('detects missing cache headers', () => {
    networkRecords = [networkRecord()];
    return CacheHeadersAudit.audit(artifacts).then(result => {
      const items = result.extendedInfo.value.results;
      assert.equal(items.length, 1);
      assert.equal(items[0].cacheLifetimeInSeconds, 0);
      assert.equal(items[0].wastedBytes, 10000);
      assert.equal(result.displayValue, '1 asset found');
    });
  });

  it('detects low value max-age headers', () => {
    networkRecords = [
      networkRecord({headers: {'cache-control': 'max-age=3600'}}), // an hour
      networkRecord({headers: {'cache-control': 'max-age=3600'}, transferSize: 100000}), // an hour
      networkRecord({headers: {'cache-control': 'max-age=86400'}}), // a day
      networkRecord({headers: {'cache-control': 'max-age=31536000'}}), // a year
    ];

    return CacheHeadersAudit.audit(artifacts).then(result => {
      const items = result.extendedInfo.value.results;
      assert.equal(items.length, 3);
      assert.equal(items[0].cacheLifetimeInSeconds, 3600);
      assert.equal(items[0].cacheLifetimeDisplay.value, 3600);
      assert.equal(items[0].cacheHitProbability, .2);
      assert.equal(Math.round(items[0].wastedBytes), 80000);
      assert.equal(items[1].cacheLifetimeInSeconds, 3600);
      assert.equal(Math.round(items[1].wastedBytes), 8000);
      assert.equal(items[2].cacheLifetimeInSeconds, 86400);
      assert.equal(Math.round(items[2].wastedBytes), 4000);
      assert.equal(result.displayValue, '3 assets found');
    });
  });

  it('detects low value expires headers', () => {
    const expiresIn = seconds => new Date(Date.now() + seconds * 1000).toGMTString();
    const closeEnough = (actual, exp) => assert.ok(Math.abs(actual - exp) <= 1, 'invalid expires');

    networkRecords = [
      networkRecord({headers: {expires: expiresIn(86400 * 365)}}), // a year
      networkRecord({headers: {expires: expiresIn(86400 * 90)}}), // 3 months
      networkRecord({headers: {expires: expiresIn(86400)}}), // a day
      networkRecord({headers: {expires: expiresIn(3600)}}), // an hour
    ];

    return CacheHeadersAudit.audit(artifacts).then(result => {
      const items = result.extendedInfo.value.results;
      assert.equal(items.length, 3);
      closeEnough(items[0].cacheLifetimeInSeconds, 3600);
      assert.equal(Math.round(items[0].wastedBytes), 8000);
      closeEnough(items[1].cacheLifetimeInSeconds, 86400);
      assert.equal(Math.round(items[1].wastedBytes), 4000);
      closeEnough(items[2].cacheLifetimeInSeconds, 86400 * 90);
      assert.equal(Math.round(items[2].wastedBytes), 768);
    });
  });

  it('respects expires/cache-control priority', () => {
    const expiresIn = seconds => new Date(Date.now() + seconds * 1000).toGMTString();

    networkRecords = [
      networkRecord({headers: {
        'cache-control': 'must-revalidate,max-age=3600',
        'expires': expiresIn(86400),
      }}),
      networkRecord({headers: {
        'cache-control': 'private,must-revalidate',
        'expires': expiresIn(86400),
      }}),
    ];

    return CacheHeadersAudit.audit(artifacts).then(result => {
      const items = result.extendedInfo.value.results;
      assert.equal(items.length, 2);
      assert.ok(Math.abs(items[0].cacheLifetimeInSeconds - 3600) <= 1, 'invalid expires parsing');
      assert.equal(Math.round(items[0].wastedBytes), 8000);
      assert.ok(Math.abs(items[1].cacheLifetimeInSeconds - 86400) <= 1, 'invalid expires parsing');
      assert.equal(Math.round(items[1].wastedBytes), 4000);
    });
  });

  it('catches records with Etags', () => {
    networkRecords = [
      networkRecord({headers: {etag: 'md5hashhere'}}),
      networkRecord({headers: {'etag': 'md5hashhere', 'cache-control': 'max-age=60'}}),
    ];

    return CacheHeadersAudit.audit(artifacts).then(result => {
      const items = result.extendedInfo.value.results;
      assert.equal(items.length, 2);
    });
  });

  it('ignores explicit no-cache policies', () => {
    networkRecords = [
      networkRecord({headers: {expires: '-1'}}),
      networkRecord({headers: {'cache-control': 'no-store'}}),
      networkRecord({headers: {'cache-control': 'no-cache'}}),
      networkRecord({headers: {'cache-control': 'max-age=0'}}),
      networkRecord({headers: {pragma: 'no-cache'}}),
    ];

    return CacheHeadersAudit.audit(artifacts).then(result => {
      const items = result.extendedInfo.value.results;
      assert.equal(result.score, 100);
      assert.equal(items.length, 0);
    });
  });

  it('ignores potentially uncacheable records', () => {
    networkRecords = [
      networkRecord({statusCode: 500}),
      networkRecord({url: 'https://example.com/dynamic.js?userId=crazy'}),
      networkRecord({url: 'data:image/jpeg;base64,what'}),
      networkRecord({resourceType: WebInspector.resourceTypes.XHR}),
    ];

    return CacheHeadersAudit.audit(artifacts).then(result => {
      assert.equal(result.score, 100);
      const items = result.extendedInfo.value.results;
      assert.equal(items.length, 1);
      assert.equal(result.extendedInfo.value.queryStringCount, 1);
    });
  });
});
