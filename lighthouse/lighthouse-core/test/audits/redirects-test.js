/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('../../audits/redirects.js');
const assert = require('assert');

/* eslint-env jest */
const FAILING_THREE_REDIRECTS = {
  startTime: 17,
  url: 'https://m.example.com/final',
  redirects: [
    {
      startTime: 0,
      url: 'http://example.com/',
    },
    {
      startTime: 11,
      url: 'https://example.com/',
    },
    {
      startTime: 12,
      url: 'https://m.example.com/',
    },
  ],
};

const FAILING_TWO_REDIRECTS = {
  startTime: 446.286,
  url: 'https://www.lisairish.com/',
  redirects: [
    {
      startTime: 445.648,
      url: 'http://lisairish.com/',
    },
    {
      startTime: 445.757,
      url: 'https://lisairish.com/',
    },
  ],
};

const SUCCESS_ONE_REDIRECT = {
  startTime: 136.383,
  url: 'https://www.lisairish.com/',
  redirects: [{
    startTime: 135.873,
    url: 'https://lisairish.com/',
  }],
};

const SUCCESS_NOREDIRECT = {
  startTime: 135.873,
  url: 'https://www.google.com/',
  redirects: [],
};

describe('Performance: Redirects audit', () => {
  let nodeTimings;

  const mockArtifacts = (mockChain) => {
    return {
      traces: {},
      devtoolsLogs: {},
      requestLanternInteractive: () => ({pessimisticEstimate: {nodeTimings}}),
      requestTraceOfTab: () => {},
      requestNetworkRecords: () => [],
      requestMainResource: function() {
        return Promise.resolve(mockChain);
      },
    };
  };

  it('fails when 3 redirects detected', () => {
    nodeTimings = new Map([
      [{type: 'network', record: {url: 'http://example.com/'}}, {startTime: 0}],
      [{type: 'network', record: {url: 'https://example.com/'}}, {startTime: 5000}],
      [{type: 'network', record: {url: 'https://m.example.com/'}}, {startTime: 10000}],
      [{type: 'network', record: {url: 'https://m.example.com/final'}}, {startTime: 17000}],
    ]);

    return Audit.audit(mockArtifacts(FAILING_THREE_REDIRECTS), {}).then(output => {
      assert.equal(output.score, 0);
      assert.equal(output.details.items.length, 4);
      assert.equal(output.rawValue, 17000);
    });
  });

  it('fails when 2 redirects detected', () => {
    nodeTimings = new Map([
      [{type: 'network', record: {url: 'http://lisairish.com/'}}, {startTime: 0}],
      [{type: 'network', record: {url: 'https://lisairish.com/'}}, {startTime: 300}],
      [{type: 'network', record: {url: 'https://www.lisairish.com/'}}, {startTime: 638}],
    ]);

    return Audit.audit(mockArtifacts(FAILING_TWO_REDIRECTS), {}).then(output => {
      assert.equal(Math.round(output.score * 100) / 100, 0.56);
      assert.equal(output.details.items.length, 3);
      assert.equal(Math.round(output.rawValue), 638);
    });
  });

  it('passes when one redirect detected', () => {
    nodeTimings = new Map([
      [{type: 'network', record: {url: 'https://lisairish.com/'}}, {startTime: 0}],
      [{type: 'network', record: {url: 'https://www.lisairish.com/'}}, {startTime: 510}],
    ]);

    return Audit.audit(mockArtifacts(SUCCESS_ONE_REDIRECT), {}).then(output => {
      // If === 1 redirect, perfect score is expected, regardless of latency
      assert.equal(output.score, 1);
      // We will still generate a table and show wasted time
      assert.equal(output.details.items.length, 2);
      assert.equal(Math.round(output.rawValue), 510);
    });
  });

  it('passes when no redirect detected', () => {
    return Audit.audit(mockArtifacts(SUCCESS_NOREDIRECT), {}).then(output => {
      assert.equal(output.score, 1);
      assert.equal(output.details.items.length, 0);
      assert.equal(output.rawValue, 0);
    });
  });
});
