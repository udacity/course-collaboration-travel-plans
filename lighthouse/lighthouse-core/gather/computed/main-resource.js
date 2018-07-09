/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ComputedArtifact = require('./computed-artifact');
const URL = require('../../lib/url-shim');

/**
 * @fileoverview This artifact identifies the main resource on the page. Current solution assumes
 * that the main resource is the first non-rediected one.
 */
class MainResource extends ComputedArtifact {
  get name() {
    return 'MainResource';
  }

  /**
   * @param {{URL: LH.Artifacts['URL'], devtoolsLog: LH.DevtoolsLog}} data
   * @param {LH.ComputedArtifacts} artifacts
   * @return {Promise<LH.Artifacts.NetworkRequest>}
   */
  async compute_(data, artifacts) {
    const finalUrl = data.URL.finalUrl;
    const requests = await artifacts.requestNetworkRecords(data.devtoolsLog);
    // equalWithExcludedFragments is expensive, so check that the finalUrl starts with the request first
    const mainResource = requests.find(request => finalUrl.startsWith(request.url) &&
      URL.equalWithExcludedFragments(request.url, finalUrl));

    if (!mainResource) {
      throw new Error('Unable to identify the main resource');
    }

    return mainResource;
  }
}

module.exports = MainResource;
