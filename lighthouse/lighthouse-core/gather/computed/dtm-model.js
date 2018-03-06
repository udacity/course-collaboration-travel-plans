/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ComputedArtifact = require('./computed-artifact');
const DTM = require('../../lib/traces/devtools-timeline-model');

class DevtoolsTimelineModel extends ComputedArtifact {
  get name() {
    return 'DevtoolsTimelineModel';
  }

  /**
   * @param {Object} trace
   * @return {Object}
   */
  compute_(trace) {
    return Promise.resolve(new DTM(trace));
  }
}

module.exports = DevtoolsTimelineModel;
