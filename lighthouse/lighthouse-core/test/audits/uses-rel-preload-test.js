/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */

'use strict';

/* eslint-env jest */

const UsesRelPreload = require('../../audits/uses-rel-preload.js');
const NetworkNode = require('../../lib/dependency-graph/network-node');
const assert = require('assert');

const Runner = require('../../runner');
const pwaTrace = require('../fixtures/traces/progressive-app-m60.json');
const pwaDevtoolsLog = require('../fixtures/traces/progressive-app-m60.devtools.log.json');

const defaultMainResource = {
  _endTime: 1,
};

describe('Performance: uses-rel-preload audit', () => {
  let mockGraph;
  let mockSimulator;

  const mockArtifacts = (networkRecords, mainResource = defaultMainResource) => {
    return {
      traces: {[UsesRelPreload.DEFAULT_PASS]: {traceEvents: []}},
      devtoolsLogs: {[UsesRelPreload.DEFAULT_PASS]: []},
      requestLoadSimulator: () => mockSimulator,
      requestPageDependencyGraph: () => mockGraph,
      requestNetworkRecords: () => networkRecords,
      requestMainResource: () => {
        return Promise.resolve(mainResource);
      },
    };
  };

  afterEach(() => {
    mockSimulator = undefined;
  });

  it('should suggest preload resource', () => {
    const mainResource = Object.assign({}, defaultMainResource, {
      url: 'http://www.example.com:3000',
      redirects: [''],
    });

    const networkRecords = [
      {
        requestId: '2',
        resourceType: 'Document',
        priority: 'High',
        isLinkPreload: false,
        url: 'http://example.com:3000',
        redirects: [''],
      },
      {
        requestId: '2:redirect',
        resourceType: 'Document',
        priority: 'High',
        isLinkPreload: false,
        url: 'http://www.example.com:3000',
        redirects: [''],
      },
      {
        requestId: '3',
        resourceType: 'Script',
        priority: 'High',
        isLinkPreload: false,
        url: 'http://www.example.com/script.js',
      },
      {
        requestId: '4',
        resourceType: 'Script',
        priority: 'High',
        isLinkPreload: false,
        url: 'http://www.example.com/script-added.js',
      },
      {
        requestId: '5',
        resourceType: 'Script',
        priority: 'High',
        isLinkPreload: false,
        url: 'http://sub.example.com/script-sub.js',
      },
      {
        requestId: '6',
        resourceType: 'Script',
        priority: 'High',
        isLinkPreload: false,
        url: 'http://otherdomain.com/script-other.js',
      },
    ];

    const rootNode = new NetworkNode(networkRecords[0]);
    const mainDocumentNode = new NetworkNode(networkRecords[1]);
    const scriptNode = new NetworkNode(networkRecords[2]);
    const scriptAddedNode = new NetworkNode(networkRecords[3]);
    const scriptSubNode = new NetworkNode(networkRecords[4]);
    const scriptOtherNode = new NetworkNode(networkRecords[5]);

    mainDocumentNode.setIsMainDocument(true);
    mainDocumentNode.addDependency(rootNode);
    scriptNode.addDependency(mainDocumentNode);
    scriptAddedNode.addDependency(scriptNode);
    scriptSubNode.addDependency(scriptNode);
    scriptOtherNode.addDependency(scriptNode);

    mockGraph = rootNode;
    mockSimulator = {
      simulate(graph) {
        const nodesByUrl = new Map();
        graph.traverse(node => nodesByUrl.set(node.record.url, node));

        const rootNodeLocal = nodesByUrl.get(rootNode.record.url);
        const mainDocumentNodeLocal = nodesByUrl.get(mainDocumentNode.record.url);
        const scriptNodeLocal = nodesByUrl.get(scriptNode.record.url);
        const scriptAddedNodeLocal = nodesByUrl.get(scriptAddedNode.record.url);
        const scriptSubNodeLocal = nodesByUrl.get(scriptSubNode.record.url);
        const scriptOtherNodeLocal = nodesByUrl.get(scriptOtherNode.record.url);

        const nodeTimings = new Map([
          [rootNodeLocal, {starTime: 0, endTime: 500}],
          [mainDocumentNodeLocal, {startTime: 500, endTime: 1000}],
          [scriptNodeLocal, {startTime: 1000, endTime: 2000}],
          [scriptAddedNodeLocal, {startTime: 2000, endTime: 3250}],
          [scriptSubNodeLocal, {startTime: 2000, endTime: 3000}],
          [scriptOtherNodeLocal, {startTime: 2000, endTime: 3500}],
        ]);

        if (scriptAddedNodeLocal.getDependencies()[0] === mainDocumentNodeLocal) {
          nodeTimings.set(scriptAddedNodeLocal, {startTime: 1000, endTime: 2000});
        }

        if (scriptSubNodeLocal.getDependencies()[0] === mainDocumentNodeLocal) {
          nodeTimings.set(scriptSubNodeLocal, {startTime: 1000, endTime: 2000});
        }

        if (scriptOtherNodeLocal.getDependencies()[0] === mainDocumentNodeLocal) {
          nodeTimings.set(scriptOtherNodeLocal, {startTime: 1000, endTime: 2500});
        }

        return {timeInMs: 3500, nodeTimings};
      },
    };

    return UsesRelPreload.audit(mockArtifacts(networkRecords, mainResource), {}).then(
      output => {
        assert.equal(output.rawValue, 1250);
        assert.equal(output.details.items.length, 2);
        assert.equal(output.details.items[0].url, 'http://www.example.com/script-added.js');
        assert.equal(output.details.items[1].url, 'http://sub.example.com/script-sub.js');
      }
    );
  });

  it(`shouldn't suggest preload for already preloaded records`, () => {
    const networkRecords = [
      {
        requestId: '3',
        _startTime: 10,
        isLinkPreload: true,
        url: 'http://www.example.com/script.js',
      },
    ];

    return UsesRelPreload.audit(mockArtifacts(networkRecords), {}).then(output => {
      assert.equal(output.rawValue, 0);
      assert.equal(output.details.items.length, 0);
    });
  });

  it(`shouldn't suggest preload for protocol data`, () => {
    const networkRecords = [
      {
        requestId: '3',
        protocol: 'data',
        _startTime: 10,
      },
    ];

    return UsesRelPreload.audit(mockArtifacts(networkRecords), {}).then(output => {
      assert.equal(output.rawValue, 0);
      assert.equal(output.details.items.length, 0);
    });
  });

  it(`shouldn't suggest preload for protocol blob`, () => {
    const networkRecords = [
      {
        requestId: '3',
        protocol: 'blob',
        _startTime: 10,
      },
    ];

    return UsesRelPreload.audit(mockArtifacts(networkRecords), {}).then(output => {
      assert.equal(output.rawValue, 0);
      assert.equal(output.details.items.length, 0);
    });
  });

  it('does not throw on a real trace/devtools log', async () => {
    const artifacts = Object.assign({
      URL: {finalUrl: 'https://pwa.rocks/'},
      traces: {
        [UsesRelPreload.DEFAULT_PASS]: pwaTrace,
      },
      devtoolsLogs: {
        [UsesRelPreload.DEFAULT_PASS]: pwaDevtoolsLog,
      },
    }, Runner.instantiateComputedArtifacts());

    const settings = {throttlingMethod: 'provided'};
    const result = await UsesRelPreload.audit(artifacts, {settings});
    assert.equal(result.score, 1);
    assert.equal(result.rawValue, 0);
  });
});
