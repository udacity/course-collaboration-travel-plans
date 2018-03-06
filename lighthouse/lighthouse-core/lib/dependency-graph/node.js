/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/**
 * @fileoverview This class encapsulates logic for handling resources and tasks used to model the
 * execution dependency graph of the page. A node has a unique identifier and can depend on other
 * nodes/be depended on. The construction of the graph maintains some important invariants that are
 * inherent to the model:
 *
 *    1. The graph is a DAG, there are no cycles.
 *    2. There is always a root node upon which all other nodes eventually depend.
 *
 * This allows particular optimizations in this class so that we do no need to check for cycles as
 * these methods are called and we can always start traversal at the root node.
 */
class Node {
  /**
   * @param {string|number} id
   */
  constructor(id) {
    this._id = id;
    /** @type {Node[]} */
    this._dependents = [];
    /** @type {Node[]} */
    this._dependencies = [];
  }

  /**
   * @return {string|number}
   */
  get id() {
    return this._id;
  }

  /**
   * @return {string}
   */
  get type() {
    throw new Error('Unimplemented');
  }

  /**
   * @return {number}
   */
  get startTime() {
    throw new Error('Unimplemented');
  }

  /**
   * @return {number}
   */
  get endTime() {
    throw new Error('Unimplemented');
  }

  /**
   * @return {Node[]}
   */
  getDependents() {
    return this._dependents.slice();
  }

  /**
   * @return {Node[]}
   */
  getDependencies() {
    return this._dependencies.slice();
  }

  /**
   * @return {number}
   */
  getNumberOfDependencies() {
    return this._dependencies.length;
  }

  /**
   * @return {Node}
   */
  getRootNode() {
    /** @type {Node} */
    let rootNode = this;
    while (rootNode._dependencies.length) {
      rootNode = rootNode._dependencies[0];
    }

    return rootNode;
  }

  /**
   * @param {Node} node
   */
  addDependent(node) {
    node.addDependency(this);
  }

  /**
   * @param {Node} node
   */
  addDependency(node) {
    if (this._dependencies.includes(node)) {
      return;
    }

    node._dependents.push(this);
    this._dependencies.push(node);
  }

  /**
   * Clones the node's information without adding any dependencies/dependents.
   * @return {Node}
   */
  cloneWithoutRelationships() {
    return new Node(this.id);
  }

  /**
   * Clones the entire graph connected to this node filtered by the optional predicate. If a node is
   * included by the predicate, all nodes along the paths between the two will be included. If the
   * node that was called clone is not included in the resulting filtered graph, the return will be
   * undefined.
   * @param {function(Node):boolean=} predicate
   * @return {Node|undefined}
   */
  cloneWithRelationships(predicate) {
    const rootNode = this.getRootNode();

    /** @type {function(Node): boolean} */
    let shouldIncludeNode = () => true;
    if (predicate) {
      const idsToInclude = new Set();
      rootNode.traverse(node => {
        if (predicate(node)) {
          node.traverse(
            node => idsToInclude.add(node.id),
            node => node._dependencies.filter(parent => !idsToInclude.has(parent))
          );
        }
      });

      shouldIncludeNode = node => idsToInclude.has(node.id);
    }

    const idToNodeMap = new Map();
    rootNode.traverse(originalNode => {
      if (!shouldIncludeNode(originalNode)) return;
      const clonedNode = originalNode.cloneWithoutRelationships();
      idToNodeMap.set(clonedNode.id, clonedNode);
    });

    rootNode.traverse(originalNode => {
      if (!shouldIncludeNode(originalNode)) return;
      const clonedNode = idToNodeMap.get(originalNode.id);

      for (const dependency of originalNode._dependencies) {
        const clonedDependency = idToNodeMap.get(dependency.id);
        clonedNode.addDependency(clonedDependency);
      }
    });

    return idToNodeMap.get(this.id);
  }

  /**
   * Traverses all paths in the graph, calling iterator on each node visited. Decides which nodes to
   * visit with the getNext function.
   * @param {function(Node,Node[])} iterator
   * @param {function(Node):Node[]} getNext
   */
  _traversePaths(iterator, getNext) {
    /** @type {Node[][]} */
    const stack = [[this]];
    while (stack.length) {
      /** @type {Node[]} */
      // @ts-ignore - stack has length so it's guaranteed to have an item
      const path = stack.shift();
      const node = path[0];
      iterator(node, path);

      const nodesToAdd = getNext(node);
      for (const nextNode of nodesToAdd) {
        stack.push([nextNode].concat(path));
      }
    }
  }

  /**
   * Traverses all connected nodes exactly once, calling iterator on each. Decides which nodes to
   * visit with the getNext function.
   * @param {function(Node,Node[])} iterator
   * @param {function(Node):Node[]} [getNext] Defaults to returning the dependents.
   */
  traverse(iterator, getNext) {
    if (!getNext) {
      getNext = node => node.getDependents();
    }

    const visited = new Set();
    const originalGetNext = getNext;

    getNext = node => {
      visited.add(node.id);
      const allNodesToVisit = originalGetNext(node);
      const nodesToVisit = allNodesToVisit.filter(nextNode => !visited.has(nextNode.id));
      nodesToVisit.forEach(nextNode => visited.add(nextNode.id));
      return nodesToVisit;
    };

    this._traversePaths(iterator, getNext);
  }

  /**
   * Returns whether the given node has a cycle in its dependent graph by performing a DFS.
   * @param {Node} node
   * @return {boolean}
   */
  static hasCycle(node) {
    const visited = new Set();
    /** @type {Node[]} */
    const currentPath = [];
    const toVisit = [node];
    const depthAdded = new Map([[node, 0]]);

    // Keep going while we have nodes to visit in the stack
    while (toVisit.length) {
      // Get the last node in the stack (DFS uses stack, not queue)
      /** @type {Node} */
      // @ts-ignore - toVisit has length so it's guaranteed to have an item
      const currentNode = toVisit.pop();

      // We've hit a cycle if the node we're visiting is in our current dependency path
      if (currentPath.includes(currentNode)) return true;
      // If we've already visited the node, no need to revisit it
      if (visited.has(currentNode)) continue;

      // Since we're visiting this node, clear out any nodes in our path that we had to backtrack
      // @ts-ignore
      while (currentPath.length > depthAdded.get(currentNode)) currentPath.pop();

      // Update our data structures to reflect that we're adding this node to our path
      visited.add(currentNode);
      currentPath.push(currentNode);

      // Add all of its dependents to our toVisit stack
      for (const dependent of currentNode._dependents) {
        if (toVisit.includes(dependent)) continue;
        toVisit.push(dependent);
        depthAdded.set(dependent, currentPath.length);
      }
    }

    return false;
  }
}

Node.TYPES = {
  NETWORK: 'network',
  CPU: 'cpu',
};

module.exports = Node;
