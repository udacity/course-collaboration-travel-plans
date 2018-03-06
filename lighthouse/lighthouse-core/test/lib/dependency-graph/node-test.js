/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Node = require('../../../lib/dependency-graph/node');

const assert = require('assert');

function sortedById(nodeArray) {
  return nodeArray.sort((node1, node2) => node1.id.localeCompare(node2.id));
}

function createComplexGraph() {
  //   B       F
  //  / \     /
  // A   D - E
  //  \ /     \
  //   C       G - H

  const nodeA = new Node('A');
  const nodeB = new Node('B');
  const nodeC = new Node('C');
  const nodeD = new Node('D');
  const nodeE = new Node('E');
  const nodeF = new Node('F');
  const nodeG = new Node('G');
  const nodeH = new Node('H');

  nodeA.addDependent(nodeB);
  nodeA.addDependent(nodeC);
  nodeB.addDependent(nodeD);
  nodeC.addDependent(nodeD);
  nodeD.addDependent(nodeE);
  nodeE.addDependent(nodeF);
  nodeE.addDependent(nodeG);
  nodeG.addDependent(nodeH);

  return {
    nodeA,
    nodeB,
    nodeC,
    nodeD,
    nodeE,
    nodeF,
    nodeG,
    nodeH,
  };
}

/* eslint-env mocha */
describe('DependencyGraph/Node', () => {
  describe('#constructor', () => {
    it('should set the ID', () => {
      const node = new Node('foo');
      assert.equal(node.id, 'foo');
    });
  });

  describe('.addDependent', () => {
    it('should add the correct edge', () => {
      const nodeA = new Node(1);
      const nodeB = new Node(2);
      nodeA.addDependent(nodeB);

      assert.deepEqual(nodeA.getDependents(), [nodeB]);
      assert.deepEqual(nodeB.getDependencies(), [nodeA]);
    });
  });

  describe('.addDependency', () => {
    it('should add the correct edge', () => {
      const nodeA = new Node(1);
      const nodeB = new Node(2);
      nodeA.addDependency(nodeB);

      assert.deepEqual(nodeA.getDependencies(), [nodeB]);
      assert.deepEqual(nodeB.getDependents(), [nodeA]);
    });
  });

  describe('.getRootNode', () => {
    it('should return the root node', () => {
      const graph = createComplexGraph();

      assert.equal(graph.nodeA.getRootNode(), graph.nodeA);
      assert.equal(graph.nodeB.getRootNode(), graph.nodeA);
      assert.equal(graph.nodeD.getRootNode(), graph.nodeA);
      assert.equal(graph.nodeF.getRootNode(), graph.nodeA);
    });
  });

  describe('.cloneWithoutRelationships', () => {
    it('should create a copy', () => {
      const node = new Node(1);
      const neighbor = new Node(2);
      node.addDependency(neighbor);
      const clone = node.cloneWithoutRelationships();

      assert.equal(clone.id, 1);
      assert.notEqual(node, clone);
      assert.equal(clone.getDependencies().length, 0);
    });
  });

  describe('.cloneWithRelationships', () => {
    it('should create a copy of a basic graph', () => {
      const node = new Node(1);
      const neighbor = new Node(2);
      node.addDependency(neighbor);
      const clone = node.cloneWithRelationships();

      assert.equal(clone.id, 1);
      assert.notEqual(node, clone);

      const dependencies = clone.getDependencies();
      assert.equal(dependencies.length, 1);

      const neighborClone = dependencies[0];
      assert.equal(neighborClone.id, neighbor.id);
      assert.notEqual(neighborClone, neighbor);
      assert.equal(neighborClone.getDependents()[0], clone);
    });

    it('should create a copy of a complex graph', () => {
      const graph = createComplexGraph();
      const clone = graph.nodeA.cloneWithRelationships();

      const clonedIdMap = new Map();
      clone.traverse(node => clonedIdMap.set(node.id, node));
      assert.equal(clonedIdMap.size, 8);

      graph.nodeA.traverse(node => {
        const clone = clonedIdMap.get(node.id);
        assert.equal(clone.id, node.id);
        assert.notEqual(clone, node);

        const actualDependents = sortedById(clone.getDependents());
        const expectedDependents = sortedById(node.getDependents());
        actualDependents.forEach((cloneDependent, index) => {
          const originalDependent = expectedDependents[index];
          assert.equal(cloneDependent.id, originalDependent.id);
          assert.notEqual(cloneDependent, originalDependent);
        });
      });
    });

    it('should create a copy of a graph with long dependency chains', () => {
      //   C - D - E - F
      //  /             \
      // A - - - - - - - B
      const nodeA = new Node('A');
      const nodeB = new Node('B');
      const nodeC = new Node('C');
      const nodeD = new Node('D');
      const nodeE = new Node('E');
      const nodeF = new Node('F');

      nodeA.addDependent(nodeB);
      nodeF.addDependent(nodeB);

      nodeA.addDependent(nodeC);
      nodeC.addDependent(nodeD);
      nodeD.addDependent(nodeE);
      nodeE.addDependent(nodeF);

      const clone = nodeA.cloneWithRelationships();

      const clonedIdMap = new Map();
      clone.traverse(node => clonedIdMap.set(node.id, node));
      assert.equal(clonedIdMap.size, 6);
    });

    it('should create a copy when not starting at root node', () => {
      const graph = createComplexGraph();
      const cloneD = graph.nodeD.cloneWithRelationships();
      assert.equal(cloneD.id, 'D');
      assert.equal(cloneD.getRootNode().id, 'A');
    });

    it('should create a partial copy of a complex graph', () => {
      const graph = createComplexGraph();
      // create a clone with F and all its dependencies
      const clone = graph.nodeA.cloneWithRelationships(node => node.id === 'F');

      const clonedIdMap = new Map();
      clone.traverse(node => clonedIdMap.set(node.id, node));

      assert.equal(clonedIdMap.size, 6);
      assert.ok(clonedIdMap.has('F'), 'did not include target node');
      assert.ok(clonedIdMap.has('E'), 'did not include dependency');
      assert.ok(clonedIdMap.has('B'), 'did not include branched dependency');
      assert.ok(clonedIdMap.has('C'), 'did not include branched dependency');
      assert.equal(clonedIdMap.get('G'), undefined);
      assert.equal(clonedIdMap.get('H'), undefined);
    });
  });

  describe('.traverse', () => {
    it('should visit every dependent node', () => {
      const graph = createComplexGraph();
      const ids = [];
      graph.nodeA.traverse(node => ids.push(node.id));

      assert.deepEqual(ids, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    });

    it('should respect getNext', () => {
      const graph = createComplexGraph();
      const ids = [];
      graph.nodeF.traverse(
        node => ids.push(node.id),
        node => node.getDependencies()
      );

      assert.deepEqual(ids, ['F', 'E', 'D', 'B', 'C', 'A']);
    });
  });

  describe('#hasCycle', () => {
    it('should return false for DAGs', () => {
      const graph = createComplexGraph();
      assert.equal(Node.hasCycle(graph.nodeA), false);
    });

    it('should return false for triangular DAGs', () => {
      //   B
      //  / \
      // A - C
      const nodeA = new Node('A');
      const nodeB = new Node('B');
      const nodeC = new Node('C');

      nodeA.addDependent(nodeC);
      nodeA.addDependent(nodeB);
      nodeB.addDependent(nodeC);

      assert.equal(Node.hasCycle(nodeA), false);
    });

    it('should return true for basic cycles', () => {
      const nodeA = new Node('A');
      const nodeB = new Node('B');
      const nodeC = new Node('C');

      nodeA.addDependent(nodeB);
      nodeB.addDependent(nodeC);
      nodeC.addDependent(nodeA);

      assert.equal(Node.hasCycle(nodeA), true);
    });

    it('should return true for complex cycles', () => {
      //   B - D - F - G - C!
      //  /      /
      // A - - C - E - H
      const nodeA = new Node('A');
      const nodeB = new Node('B');
      const nodeC = new Node('C');
      const nodeD = new Node('D');
      const nodeE = new Node('E');
      const nodeF = new Node('F');
      const nodeG = new Node('G');
      const nodeH = new Node('H');

      nodeA.addDependent(nodeB);
      nodeA.addDependent(nodeC);
      nodeB.addDependent(nodeD);
      nodeC.addDependent(nodeE);
      nodeC.addDependent(nodeF);
      nodeD.addDependent(nodeF);
      nodeE.addDependent(nodeH);
      nodeF.addDependent(nodeG);
      nodeG.addDependent(nodeC);

      assert.equal(Node.hasCycle(nodeA), true);
    });

    it('works for very large graphs', () => {
      const root = new Node('root');

      let lastNode = root;
      for (let i = 0; i < 10000; i++) {
        const nextNode = new Node(`child${i}`);
        lastNode.addDependent(nextNode);
        lastNode = nextNode;
      }

      lastNode.addDependent(root);
      assert.equal(Node.hasCycle(root), true);
    });
  });
});
