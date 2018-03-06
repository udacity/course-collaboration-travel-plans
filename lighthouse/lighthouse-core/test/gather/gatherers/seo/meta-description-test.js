/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const MetaDescriptionGather = require('../../../../gather/gatherers/seo/meta-description');
const assert = require('assert');
const EXAMPLE_DESCRIPTION = 'description text';
let metaDescriptionGather;

describe('Meta description gatherer', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    metaDescriptionGather = new MetaDescriptionGather();
  });

  it('returns an artifact', () => {
    return metaDescriptionGather.afterPass({
      driver: {
        querySelector() {
          return Promise.resolve({
            getAttribute: () => EXAMPLE_DESCRIPTION,
          });
        },
      },
    }).then(artifact => {
      assert.equal(artifact, EXAMPLE_DESCRIPTION);
    });
  });
});
