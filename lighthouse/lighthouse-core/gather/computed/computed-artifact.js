/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ArbitraryEqualityMap = require('../../lib/arbitrary-equality-map');

class ComputedArtifact {
  /**
   * @param {LH.ComputedArtifacts} allComputedArtifacts
   */
  constructor(allComputedArtifacts) {
    const cache = new ArbitraryEqualityMap();
    cache.setEqualityFn(ArbitraryEqualityMap.deepEquals);

    /** @type {Map<FirstParamType<this['compute_']>, Promise<ReturnType<this['compute_']>>>} */
    // @ts-ignore cache is close enough to a Map for our purposes (but e.g. no [Symbol.toStringTag])
    this._cache = cache;

    /** @type {LH.ComputedArtifacts} */
    this._allComputedArtifacts = allComputedArtifacts;
  }

  /**
   * @return {string}
   */
  get name() {
    throw new Error('name getter not implemented for computed artifact ' + this.constructor.name);
  }

  /* eslint-disable no-unused-vars */

  /**
   * Override with more specific `artifact` and return type to implement a
   * computed artifact.
   * @param {*} artifact Input to computation.
   * @param {LH.ComputedArtifacts} allComputedArtifacts Access to all computed artifacts.
   * @return {Promise<*>}
   * @throws {Error}
   */
  async compute_(artifact, allComputedArtifacts) {
    throw new Error('compute_() not implemented for computed artifact ' + this.name);
  }

  /* eslint-enable no-unused-vars */

  /**
   * Request a computed artifact, caching the result on the input artifact.
   * Types of `requiredArtifacts` and the return value are derived from the
   * `compute_` method on classes derived from ComputedArtifact.
   * @param {FirstParamType<this['compute_']>} requiredArtifacts
   * @return {Promise<ReturnType<this['compute_']>>}
   */
  async request(requiredArtifacts) {
    const computed = this._cache.get(requiredArtifacts);
    if (computed) {
      return computed;
    }

    // Need to cast since `this.compute_(...)` returns the concrete return type
    // of the base class's compute_, not the called derived class's.
    const artifactPromise = /** @type {ReturnType<this['compute_']>} */ (
      this.compute_(requiredArtifacts, this._allComputedArtifacts));
    this._cache.set(requiredArtifacts, artifactPromise);

    return artifactPromise;
  }
}

module.exports = ComputedArtifact;
