/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const ManifestShortNameLengthAudit = require('../../audits/manifest-short-name-length.js');
const assert = require('assert');
const manifestParser = require('../../lib/manifest-parser');

const EXAMPLE_MANIFEST_URL = 'https://example.com/manifest.json';
const EXAMPLE_DOC_URL = 'https://example.com/index.html';

function generateMockArtifacts() {
  return {
    Manifest: null,
  };
}
function generateMockAuditContext() {
  return {
    computedCache: new Map(),
  };
}

/* eslint-env jest */

describe('Manifest: short_name_length audit', () => {
  it('marked as notApplicable if page had no manifest', () => {
    const artifacts = generateMockArtifacts();
    artifacts.Manifest = null;
    const context = generateMockAuditContext();

    return ManifestShortNameLengthAudit.audit(artifacts, context).then(result => {
      assert.strictEqual(result.rawValue, true);
      assert.strictEqual(result.notApplicable, true);
    });
  });

  it('marked as notApplicable if manifest is present but empty', () => {
    const artifacts = generateMockArtifacts();
    artifacts.Manifest = manifestParser('{}', EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
    const context = generateMockAuditContext();
    return ManifestShortNameLengthAudit.audit(artifacts, context).then(result => {
      assert.strictEqual(result.rawValue, true);
      assert.strictEqual(result.notApplicable, true);
    });
  });

  it('marked as notApplicable when a manifest contains no short_name', () => {
    const artifacts = generateMockArtifacts();
    const manifestSrc = JSON.stringify({
      name: 'i\'m much longer than the recommended size',
    });
    artifacts.Manifest = manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
    const context = generateMockAuditContext();
    return ManifestShortNameLengthAudit.audit(artifacts, context).then(result => {
      assert.strictEqual(result.rawValue, true);
      assert.strictEqual(result.notApplicable, true);
      assert.equal(result.explanation, undefined);
    });
  });

  // Need to disable camelcase check for dealing with short_name.
  /* eslint-disable camelcase */
  it('fails when a manifest contains a too long short_name', () => {
    const artifacts = generateMockArtifacts();
    const manifestSrc = JSON.stringify({
      short_name: 'i\'m much longer than the recommended size',
    });
    artifacts.Manifest = manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
    const context = generateMockAuditContext();
    return ManifestShortNameLengthAudit.audit(artifacts, context).then(result => {
      assert.equal(result.rawValue, false);
      assert.ok(result.explanation.includes('without truncation'), result.explanation);
      assert.equal(result.notApplicable, undefined);
    });
  });

  it('passes when a manifest contains a short_name', () => {
    const artifacts = generateMockArtifacts();
    const manifestSrc = JSON.stringify({
      short_name: 'Lighthouse',
    });
    artifacts.Manifest = manifestParser(manifestSrc, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
    const context = generateMockAuditContext();
    return ManifestShortNameLengthAudit.audit(artifacts, context).then(result => {
      assert.equal(result.rawValue, true);
      assert.equal(result.explanation, undefined);
      assert.equal(result.notApplicable, undefined);
    });
  });
  /* eslint-enable camelcase */
});
