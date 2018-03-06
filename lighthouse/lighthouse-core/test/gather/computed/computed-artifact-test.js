/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const assert = require('assert');

const ComputedArtifact = require('../../../gather/computed/computed-artifact');

class TestComputedArtifact extends ComputedArtifact {
  constructor(...args) {
    super(...args);

    this.lastArguments = [];
    this.computeCounter = 0;
  }

  get name() {
    return 'TestComputedArtifact';
  }

  compute_(...args) {
    this.lastArguments = args;
    return this.computeCounter++;
  }
}

class MultipleInputArtifact extends TestComputedArtifact {
  get requiredNumberOfArtifacts() {
    return 2;
  }
}

describe('ComputedArtifact base class', () => {
  it('tests correct number of inputs', () => {
    const singleInputArtifact = new TestComputedArtifact();
    const multiInputArtifact = new MultipleInputArtifact();

    return Promise.resolve()
      .then(_ => singleInputArtifact.request(1))
      .then(_ => multiInputArtifact.request(1, 2))
      .then(_ => assert.throws(() => singleInputArtifact.request(1, 2)))
      .then(_ => assert.throws(() => multiInputArtifact.request(1)));
  });

  it('caches computed artifacts by strict equality', () => {
    const computedArtifact = new TestComputedArtifact();

    return computedArtifact.request({x: 1}).then(result => {
      assert.equal(result, 0);
    }).then(_ => computedArtifact.request({x: 2})).then(result => {
      assert.equal(result, 1);
    }).then(_ => computedArtifact.request({x: 1})).then(result => {
      assert.equal(result, 0);
    }).then(_ => computedArtifact.request({x: 2})).then(result => {
      assert.equal(result, 1);
      assert.equal(computedArtifact.computeCounter, 2);
    });
  });

  it('caches multiple input arguments', () => {
    const mockComputed = {computed: true};
    const computedArtifact = new MultipleInputArtifact(mockComputed);

    const obj0 = {value: 1};
    const obj1 = {value: 2};
    const obj2 = {value: 3};

    return computedArtifact.request(obj0, obj1)
      .then(result => assert.equal(result, 0))
      .then(_ => assert.deepEqual(computedArtifact.lastArguments, [obj0, obj1, mockComputed]))
      .then(_ => computedArtifact.request(obj1, obj2))
      .then(result => assert.equal(result, 1))
      .then(_ => assert.deepEqual(computedArtifact.lastArguments, [obj1, obj2, mockComputed]))
      .then(_ => computedArtifact.request(obj0, obj1))
      .then(result => assert.equal(result, 0))
      .then(_ => assert.deepEqual(computedArtifact.lastArguments, [obj1, obj2, mockComputed]))
      .then(_ => assert.equal(computedArtifact.computeCounter, 2));
  });
});
