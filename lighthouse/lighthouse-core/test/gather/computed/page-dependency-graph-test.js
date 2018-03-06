/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const PageDependencyGraph = require('../../../gather/computed/page-dependency-graph');
const Node = require('../../../lib/dependency-graph/node');
const Runner = require('../../../runner.js');
const WebInspector = require('../../../lib/web-inspector');

const sampleTrace = require('../../fixtures/traces/progressive-app-m60.json');
const sampleDevtoolsLog = require('../../fixtures/traces/progressive-app-m60.devtools.log.json');

const assert = require('assert');

function createRequest(requestId, url, startTime = 0, _initiator = null, _resourceType = null) {
  startTime = startTime / 1000;
  const endTime = startTime + .1;
  return {requestId, url, startTime, endTime, _initiator, _resourceType};
}

/* eslint-env mocha */
describe('PageDependencyGraph computed artifact:', () => {
  let computedArtifacts;
  let traceOfTab;

  function addTaskEvents(startTs, duration, evts) {
    const mainEvent = {
      name: 'TaskQueueManager::ProcessTaskFromWorkQueue',
      tid: 1,
      ts: startTs * 1000,
      dur: duration * 1000,
      args: {},
    };

    traceOfTab.mainThreadEvents.push(mainEvent);

    let i = 0;
    for (const evt of evts) {
      i++;
      traceOfTab.mainThreadEvents.push({
        name: evt.name,
        ts: (evt.ts * 1000) || (startTs * 1000 + i),
        args: {data: evt.data},
      });
    }
  }

  beforeEach(() => {
    computedArtifacts = Runner.instantiateComputedArtifacts();
    traceOfTab = {mainThreadEvents: []};
  });

  describe('#compute_', () => {
    it('should compute the dependency graph', () => {
      return computedArtifacts.requestPageDependencyGraph(
        sampleTrace,
        sampleDevtoolsLog
      ).then(output => {
        assert.ok(output instanceof Node, 'did not return a graph');

        const dependents = output.getDependents();
        const nodeWithNestedDependents = dependents.find(node => node.getDependents().length);
        assert.ok(nodeWithNestedDependents, 'did not link initiators');
      });
    });
  });

  describe('#getNetworkNodeOutput', () => {
    const request1 = createRequest(1, 'urlA');
    const request2 = createRequest(2, 'urlB');
    const request3 = createRequest(3, 'urlB');
    const networkRecords = [request1, request2, request3];

    it('should create network nodes', () => {
      const networkNodeOutput = PageDependencyGraph.getNetworkNodeOutput(networkRecords);
      for (let i = 0; i < networkRecords.length; i++) {
        const node = networkNodeOutput.nodes[i];
        assert.ok(node, `did not create node at index ${i}`);
        assert.equal(node.id, i + 1);
        assert.equal(node.type, 'network');
        assert.equal(node.record, networkRecords[i]);
      }
    });

    it('should index nodes by ID', () => {
      const networkNodeOutput = PageDependencyGraph.getNetworkNodeOutput(networkRecords);
      const indexedById = networkNodeOutput.idToNodeMap;
      for (const record of networkRecords) {
        assert.equal(indexedById.get(record.requestId).record, record);
      }
    });

    it('should index nodes by URL', () => {
      const networkNodeOutput = PageDependencyGraph.getNetworkNodeOutput(networkRecords);
      const nodes = networkNodeOutput.nodes;
      const indexedByUrl = networkNodeOutput.urlToNodeMap;
      assert.deepEqual(indexedByUrl.get('urlA'), [nodes[0]]);
      assert.deepEqual(indexedByUrl.get('urlB'), [nodes[1], nodes[2]]);
    });
  });

  describe('#getCPUNodes', () => {
    it('should create CPU nodes', () => {
      addTaskEvents(0, 100, [
        {name: 'MyCustomEvent'},
        {name: 'OtherEvent'},
        {name: 'OutsideTheWindow', ts: 200},
        {name: 'OrphanedEvent'}, // should be ignored since we stopped at OutsideTheWindow
      ]);

      addTaskEvents(250, 50, [
        {name: 'LaterEvent'},
      ]);

      assert.equal(traceOfTab.mainThreadEvents.length, 7);
      const nodes = PageDependencyGraph.getCPUNodes(traceOfTab);
      assert.equal(nodes.length, 2);

      const node1 = nodes[0];
      assert.equal(node1.id, '1.0');
      assert.equal(node1.type, 'cpu');
      assert.equal(node1.event, traceOfTab.mainThreadEvents[0]);
      assert.equal(node1.childEvents.length, 2);
      assert.equal(node1.childEvents[1].name, 'OtherEvent');

      const node2 = nodes[1];
      assert.equal(node2.id, '1.250000');
      assert.equal(node2.type, 'cpu');
      assert.equal(node2.event, traceOfTab.mainThreadEvents[5]);
      assert.equal(node2.childEvents.length, 1);
      assert.equal(node2.childEvents[0].name, 'LaterEvent');
    });
  });

  describe('#createGraph', () => {
    it('should compute a simple network graph', () => {
      const request1 = createRequest(1, '1', 0);
      const request2 = createRequest(2, '2', 5);
      const request3 = createRequest(3, '3', 5);
      const request4 = createRequest(4, '4', 10, {url: '2'});
      const networkRecords = [request1, request2, request3, request4];

      const graph = PageDependencyGraph.createGraph(traceOfTab, networkRecords);
      const nodes = [];
      graph.traverse(node => nodes.push(node));

      assert.equal(nodes.length, 4);
      assert.deepEqual(nodes.map(node => node.id), [1, 2, 3, 4]);
      assert.deepEqual(nodes[0].getDependencies(), []);
      assert.deepEqual(nodes[1].getDependencies(), [nodes[0]]);
      assert.deepEqual(nodes[2].getDependencies(), [nodes[0]]);
      assert.deepEqual(nodes[3].getDependencies(), [nodes[1]]);
    });

    it('should compute a simple network and CPU graph', () => {
      const request1 = createRequest(1, '1', 0);
      const request2 = createRequest(2, '2', 50);
      const request3 = createRequest(3, '3', 50);
      const request4 = createRequest(4, '4', 300, null, WebInspector.resourceTypes.XHR);
      const networkRecords = [request1, request2, request3, request4];

      addTaskEvents(200, 200, [
        {name: 'EvaluateScript', data: {url: '2'}},
        {name: 'ResourceSendRequest', data: {requestId: 4}},
      ]);

      addTaskEvents(700, 50, [
        {name: 'InvalidateLayout', data: {stackTrace: [{url: '3'}]}},
        {name: 'XHRReadyStateChange', data: {readyState: 4, url: '4'}},
      ]);

      const graph = PageDependencyGraph.createGraph(traceOfTab, networkRecords);
      const nodes = [];
      graph.traverse(node => nodes.push(node));

      const getIds = nodes => nodes.map(node => node.id);
      const getDependencyIds = node => getIds(node.getDependencies());

      assert.equal(nodes.length, 6);
      assert.deepEqual(getIds(nodes), [1, 2, 3, 4, '1.200000', '1.700000']);
      assert.deepEqual(getDependencyIds(nodes[0]), []);
      assert.deepEqual(getDependencyIds(nodes[1]), [1]);
      assert.deepEqual(getDependencyIds(nodes[2]), [1]);
      assert.deepEqual(getDependencyIds(nodes[3]), [1, '1.200000']);
      assert.deepEqual(getDependencyIds(nodes[4]), [2]);
      assert.deepEqual(getDependencyIds(nodes[5]), [3, 4]);
    });

    it('should compute a network graph with duplicate URLs', () => {
      const request1 = createRequest(1, '1', 0);
      const request2 = createRequest(2, '2', 5);
      const request3 = createRequest(3, '2', 5); // duplicate URL
      const request4 = createRequest(4, '4', 10, {url: '2'});
      const networkRecords = [request1, request2, request3, request4];

      const graph = PageDependencyGraph.createGraph(traceOfTab, networkRecords);
      const nodes = [];
      graph.traverse(node => nodes.push(node));

      assert.equal(nodes.length, 4);
      assert.deepEqual(nodes.map(node => node.id), [1, 2, 3, 4]);
      assert.deepEqual(nodes[0].getDependencies(), []);
      assert.deepEqual(nodes[1].getDependencies(), [nodes[0]]);
      assert.deepEqual(nodes[2].getDependencies(), [nodes[0]]);
      assert.deepEqual(nodes[3].getDependencies(), [nodes[0]]); // should depend on rootNode instead
    });
  });
});
