/**
 * @license Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ArbitraryEqualityMap = require('../../lib/arbitrary-equality-map.js');

/**
 * @template {string} N
 * @template A
 * @template R
 * @param {{name: N, compute_: (artifact: A) => Promise<R>}} computableArtifact
 * @return {{name: N, request: (context: LH.Audit.Context, artifact: A) => Promise<R>}}
 */
function makeComputedArtifact(computableArtifact) {
  /**
   * @param {LH.Audit.Context} context
   * @param {A} artifact
   */
  const request = ({computedCache}, artifact) => {
    const cache = computedCache.get(computableArtifact.name) || new ArbitraryEqualityMap();
    computedCache.set(computableArtifact.name, cache);

    const computed = /** @type {Promise<R>|undefined} */ (cache.get(artifact));
    if (computed) {
      return computed;
    }

    const artifactPromise = computableArtifact.compute_(artifact);
    cache.set(artifact, artifactPromise);

    return artifactPromise;
  };

  return Object.assign(computableArtifact, {request});
}

module.exports = makeComputedArtifact;
