/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const NetworkNode = require('../../../../lib/dependency-graph/network-node');
const CpuNode = require('../../../../lib/dependency-graph/cpu-node');
const Simulator = require('../../../../lib/dependency-graph/simulator/simulator');

const assert = require('assert');
let nextRequestId = 1;
let nextTid = 1;

function request(opts) {
  const scheme = opts.scheme || 'http';
  const url = `${scheme}://example.com`;

  return Object.assign({
    requestId: opts.requestId || nextRequestId++,
    url,
    origin: url,
    transferSize: opts.transferSize || 1000,
    parsedURL: {scheme},
    _timing: opts.timing,
  }, opts);
}

function cpuTask({tid, ts, duration}) {
  tid = tid || nextTid++;
  ts = ts || 0;
  const dur = (duration || 0) * 1000 / 5;
  return {tid, ts, dur};
}

/* eslint-env mocha */
describe('DependencyGraph/Simulator', () => {
  describe('.simulate', () => {
    const serverResponseTimeByOrigin = new Map([['http://example.com', 500]]);

    function assertNodeTiming(result, node, assertions) {
      const timing = result.nodeTiming.get(node);
      assert.ok(timing, 'missing node timing information');
      Object.keys(assertions).forEach(key => {
        assert.equal(timing[key], assertions[key]);
      });
    }

    it('should simulate basic network graphs', () => {
      const rootNode = new NetworkNode(request({}));
      const simulator = new Simulator(rootNode, {serverResponseTimeByOrigin});
      const result = simulator.simulate();
      // should be 2 RTTs and 500ms for the server response time
      assert.equal(result.timeInMs, 300 + 500);
      assertNodeTiming(result, rootNode, {startTime: 0, endTime: 800});
    });

    it('should simulate basic mixed graphs', () => {
      const rootNode = new NetworkNode(request({}));
      const cpuNode = new CpuNode(cpuTask({duration: 200}));
      cpuNode.addDependency(rootNode);

      const simulator = new Simulator(rootNode, {serverResponseTimeByOrigin, cpuTaskMultiplier: 5});
      const result = simulator.simulate();
      // should be 2 RTTs and 500ms for the server response time + 200 CPU
      assert.equal(result.timeInMs, 300 + 500 + 200);
      assertNodeTiming(result, rootNode, {startTime: 0, endTime: 800});
      assertNodeTiming(result, cpuNode, {startTime: 800, endTime: 1000});
    });

    it('should simulate basic network waterfall graphs', () => {
      const nodeA = new NetworkNode(request({startTime: 0, endTime: 1}));
      const nodeB = new NetworkNode(request({startTime: 0, endTime: 3}));
      const nodeC = new NetworkNode(request({startTime: 0, endTime: 5}));
      const nodeD = new NetworkNode(request({startTime: 0, endTime: 7}));

      nodeA.addDependent(nodeB);
      nodeB.addDependent(nodeC);
      nodeC.addDependent(nodeD);

      const simulator = new Simulator(nodeA, {serverResponseTimeByOrigin});
      const result = simulator.simulate();
      // should be 800ms each for A, B, C, D
      assert.equal(result.timeInMs, 3200);
      assertNodeTiming(result, nodeA, {startTime: 0, endTime: 800});
      assertNodeTiming(result, nodeB, {startTime: 800, endTime: 1600});
      assertNodeTiming(result, nodeC, {startTime: 1600, endTime: 2400});
      assertNodeTiming(result, nodeD, {startTime: 2400, endTime: 3200});
    });

    it('should simulate basic CPU queue graphs', () => {
      const nodeA = new NetworkNode(request({}));
      const nodeB = new CpuNode(cpuTask({duration: 100}));
      const nodeC = new CpuNode(cpuTask({duration: 600}));
      const nodeD = new CpuNode(cpuTask({duration: 300}));

      nodeA.addDependent(nodeB);
      nodeA.addDependent(nodeC);
      nodeA.addDependent(nodeD);

      const simulator = new Simulator(nodeA, {serverResponseTimeByOrigin, cpuTaskMultiplier: 5});
      const result = simulator.simulate();
      // should be 800ms A, then 1000 ms total for B, C, D in serial
      assert.equal(result.timeInMs, 1800);
      assertNodeTiming(result, nodeA, {startTime: 0, endTime: 800});
      assertNodeTiming(result, nodeB, {startTime: 800, endTime: 900});
      assertNodeTiming(result, nodeC, {startTime: 900, endTime: 1500});
      assertNodeTiming(result, nodeD, {startTime: 1500, endTime: 1800});
    });

    it('should simulate basic network waterfall graphs with CPU', () => {
      const nodeA = new NetworkNode(request({}));
      const nodeB = new NetworkNode(request({}));
      const nodeC = new NetworkNode(request({}));
      const nodeD = new NetworkNode(request({}));
      const nodeE = new CpuNode(cpuTask({duration: 1000}));
      const nodeF = new CpuNode(cpuTask({duration: 1000}));

      nodeA.addDependent(nodeB);
      nodeB.addDependent(nodeC);
      nodeB.addDependent(nodeE); // finishes 200 ms after C
      nodeC.addDependent(nodeD);
      nodeC.addDependent(nodeF); // finishes 400 ms after D

      const simulator = new Simulator(nodeA, {serverResponseTimeByOrigin, cpuTaskMultiplier: 5});
      const result = simulator.simulate();
      // should be 800ms each for A, B, C, D, with F finishing 400 ms after D
      assert.equal(result.timeInMs, 3600);
    });

    it('should simulate basic parallel requests', () => {
      const nodeA = new NetworkNode(request({}));
      const nodeB = new NetworkNode(request({}));
      const nodeC = new NetworkNode(request({transferSize: 15000}));
      const nodeD = new NetworkNode(request({}));

      nodeA.addDependent(nodeB);
      nodeA.addDependent(nodeC);
      nodeA.addDependent(nodeD);

      const simulator = new Simulator(nodeA, {serverResponseTimeByOrigin});
      const result = simulator.simulate();
      // should be 800ms for A and 950ms for C (2 round trips of downloading)
      assert.equal(result.timeInMs, 800 + 950);
    });

    it('should not reuse connections', () => {
      const nodeA = new NetworkNode(request({startTime: 0, endTime: 1}));
      const nodeB = new NetworkNode(request({startTime: 2, endTime: 3}));
      const nodeC = new NetworkNode(request({startTime: 2, endTime: 5}));
      const nodeD = new NetworkNode(request({startTime: 2, endTime: 7}));

      nodeA.addDependent(nodeB);
      nodeA.addDependent(nodeC);
      nodeA.addDependent(nodeD);

      const simulator = new Simulator(nodeA, {serverResponseTimeByOrigin});
      const result = simulator.simulate();
      // should be 800ms for A and 650ms for the next 3
      assert.equal(result.timeInMs, 800 + 650 * 3);
    });

    it('should adjust throughput based on number of requests', () => {
      const nodeA = new NetworkNode(request({}));
      const nodeB = new NetworkNode(request({}));
      const nodeC = new NetworkNode(request({transferSize: 15000}));
      const nodeD = new NetworkNode(request({}));

      nodeA.addDependent(nodeB);
      nodeA.addDependent(nodeC);
      nodeA.addDependent(nodeD);

      const simulator = new Simulator(nodeA, {serverResponseTimeByOrigin});
      const result = simulator.simulate();
      // should be 800ms for A and 950ms for C (2 round trips of downloading)
      assert.equal(result.timeInMs, 800 + 950);
    });
  });
});
