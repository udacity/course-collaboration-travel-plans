/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

/* eslint-env mocha */

const ManifestGather = require('../../../gather/gatherers/manifest');
const assert = require('assert');
let manifestGather;

const EXAMPLE_MANIFEST_URL = 'https://example.com/manifest.json';
const EXAMPLE_DOC_URL = 'https://example.com/index.html';

describe('Manifest gatherer', () => {
  // Reset the Gatherer before each test.
  beforeEach(() => {
    manifestGather = new ManifestGather();
  });

  it('returns an artifact', () => {
    return manifestGather.afterPass({
      driver: {
        getAppManifest() {
          return Promise.resolve({
            data: '{}',
            errors: [],
            url: EXAMPLE_MANIFEST_URL,
          });
        },
      },
      url: EXAMPLE_DOC_URL,
    }).then(artifact => {
      assert.ok(typeof artifact === 'object');
    });
  });

  it('returns an artifact when manifest is saved as BOM UTF-8', () => {
    const fs = require('fs');
    const manifestWithoutBOM = fs.readFileSync(__dirname + '/../../fixtures/manifest.json')
      .toString();
    const manifestWithBOM = fs.readFileSync(__dirname + '/../../fixtures/manifest-bom.json')
      .toString();

    const getDriver = (data) => {
      return {
        driver: {
          getAppManifest() {
            return Promise.resolve({
              data,
              errors: [],
              url: EXAMPLE_MANIFEST_URL,
            });
          },
        },
        url: EXAMPLE_DOC_URL,
      };
    };

    const promises = [];
    promises.push(manifestGather.afterPass(getDriver(manifestWithBOM))
      .then(manifest => {
        assert.strictEqual(manifest.raw, Buffer.from(manifestWithBOM).slice(3).toString());
        assert.strictEqual(manifest.value.name.value, 'Example App');
        assert.strictEqual(manifest.value.short_name.value, 'ExApp');
      })
    );

    promises.push(manifestGather.afterPass(getDriver(manifestWithoutBOM))
      .then(manifest => {
        assert.strictEqual(manifest.raw, manifestWithoutBOM);
        assert.strictEqual(manifest.value.name.value, 'Example App');
        assert.strictEqual(manifest.value.short_name.value, 'ExApp');
      })
    );

    return Promise.all(promises);
  });

  it('throws an error when unable to retrieve the manifest', () => {
    return manifestGather.afterPass({
      driver: {
        getAppManifest() {
          return Promise.reject(
            new Error(`Unable to retrieve manifest at ${EXAMPLE_MANIFEST_URL}.`)
          );
        },
      },
    }).then(
      _ => assert.ok(false),
      err => assert.ok(err.message.includes(EXAMPLE_MANIFEST_URL)));
  });

  it('returns null when the page had no manifest', () => {
    return manifestGather.afterPass({
      driver: {
        getAppManifest() {
          return Promise.resolve(null);
        },
      },
    }).then(artifact => {
      assert.strictEqual(artifact, null);
    });
  });

  it('creates a manifest object for valid manifest content', () => {
    const data = JSON.stringify({
      name: 'App',
    });
    return manifestGather.afterPass({
      driver: {
        getAppManifest() {
          return Promise.resolve({
            errors: [],
            data,
            url: EXAMPLE_MANIFEST_URL,
          });
        },
      },
      url: EXAMPLE_DOC_URL,
    }).then(artifact => {
      assert.ok(typeof artifact.value === 'object');
      assert.strictEqual(artifact.debugString, undefined);
    });
  });
});
