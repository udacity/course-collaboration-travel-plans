/**
 * @license Copyright 2017 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const WebappInstallBannerAudit = require('../../audits/webapp-install-banner');
const assert = require('assert');
const manifestParser = require('../../lib/manifest-parser');

const manifestSrc = JSON.stringify(require('../fixtures/manifest.json'));
const manifestDirtyJpgSrc = JSON.stringify(require('../fixtures/manifest-dirty-jpg.json'));
const EXAMPLE_MANIFEST_URL = 'https://example.com/manifest.json';
const EXAMPLE_DOC_URL = 'https://example.com/index.html';

function generateMockArtifacts(src = manifestSrc) {
  const exampleManifest = manifestParser(src, EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);

  const clonedArtifacts = JSON.parse(JSON.stringify({
    Manifest: exampleManifest,
    ServiceWorker: {
      versions: [{
        status: 'activated',
        scriptURL: 'https://example.com/sw.js',
      }],
    },
    StartUrl: {statusCode: 200},
    URL: {finalUrl: 'https://example.com'},
  }));
  return clonedArtifacts;
}
function generateMockAuditContext() {
  return {
    computedCache: new Map(),
  };
}

/* eslint-env jest */
describe('PWA: webapp install banner audit', () => {
  describe('basics', () => {
    it('fails if page had no manifest', () => {
      const artifacts = generateMockArtifacts();
      artifacts.Manifest = null;
      const context = generateMockAuditContext();

      return WebappInstallBannerAudit.audit(artifacts, context).then(result => {
        assert.strictEqual(result.rawValue, false);
        assert.ok(result.explanation.includes('No manifest was fetched'), result.explanation);
      });
    });

    it('fails with a non-parsable manifest', () => {
      const artifacts = generateMockArtifacts();
      artifacts.Manifest = manifestParser('{,:}', EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
      const context = generateMockAuditContext();
      return WebappInstallBannerAudit.audit(artifacts, context).then(result => {
        assert.strictEqual(result.rawValue, false);
        assert.ok(result.explanation.includes('failed to parse as valid JSON'));
      });
    });

    it('fails when an empty manifest is present', () => {
      const artifacts = generateMockArtifacts();
      artifacts.Manifest = manifestParser('{}', EXAMPLE_MANIFEST_URL, EXAMPLE_DOC_URL);
      const context = generateMockAuditContext();
      return WebappInstallBannerAudit.audit(artifacts, context).then(result => {
        assert.strictEqual(result.rawValue, false);
        assert.ok(result.explanation);
        assert.strictEqual(result.details.items[0].failures.length, 4);
      });
    });

    it('passes with complete manifest and SW', () => {
      const context = generateMockAuditContext();
      return WebappInstallBannerAudit.audit(generateMockArtifacts(), context).then(result => {
        assert.strictEqual(result.rawValue, true, result.explanation);
        assert.strictEqual(result.explanation, undefined, result.explanation);
      });
    });
  });

  describe('one-off-failures', () => {
    /* eslint-disable camelcase */ // because start_url
    it('fails when a manifest contains no start_url', () => {
      const artifacts = generateMockArtifacts();
      artifacts.Manifest.value.start_url.value = undefined;
      const context = generateMockAuditContext();

      return WebappInstallBannerAudit.audit(artifacts, context).then(result => {
        assert.strictEqual(result.rawValue, false);
        assert.ok(result.explanation.includes('start_url'), result.explanation);
        const failures = result.details.items[0].failures;
        assert.strictEqual(failures.length, 1, failures);
      });
    });

    /* eslint-disable camelcase */ // because short_name
    it('fails when a manifest contains no short_name', () => {
      const artifacts = generateMockArtifacts();
      artifacts.Manifest.value.short_name.value = undefined;
      const context = generateMockAuditContext();

      return WebappInstallBannerAudit.audit(artifacts, context).then(result => {
        assert.strictEqual(result.rawValue, false);
        assert.ok(result.explanation.includes('short_name'), result.explanation);
        const failures = result.details.items[0].failures;
        assert.strictEqual(failures.length, 1, failures);
      });
    });

    it('fails when a manifest contains no name', () => {
      const artifacts = generateMockArtifacts();
      artifacts.Manifest.value.name.value = undefined;
      const context = generateMockAuditContext();

      return WebappInstallBannerAudit.audit(artifacts, context).then(result => {
        assert.strictEqual(result.rawValue, false);
        assert.ok(result.explanation.includes('name'), result.explanation);
        const failures = result.details.items[0].failures;
        assert.strictEqual(failures.length, 1, failures);
      });
    });

    it('fails if page had no icons in the manifest', () => {
      const artifacts = generateMockArtifacts();
      artifacts.Manifest.value.icons.value = [];
      const context = generateMockAuditContext();

      return WebappInstallBannerAudit.audit(artifacts, context).then(result => {
        assert.strictEqual(result.rawValue, false);
        assert.ok(result.explanation.includes('PNG icon'), result.explanation);
        const failures = result.details.items[0].failures;
        assert.strictEqual(failures.length, 1, failures);
      });
    });
  });

  it('fails if icons were present, but no valid PNG present', () => {
    const artifacts = generateMockArtifacts(manifestDirtyJpgSrc);
    const context = generateMockAuditContext();

    return WebappInstallBannerAudit.audit(artifacts, context).then(result => {
      assert.strictEqual(result.rawValue, false);
      assert.ok(result.explanation.includes('PNG icon'), result.explanation);
      const failures = result.details.items[0].failures;
      assert.strictEqual(failures.length, 1, failures);
    });
  });

  it('fails if page had no SW', () => {
    const artifacts = generateMockArtifacts();
    artifacts.ServiceWorker.versions = [];
    artifacts.StartUrl = {statusCode: -1};
    const context = generateMockAuditContext();

    return WebappInstallBannerAudit.audit(artifacts, context).then(result => {
      assert.strictEqual(result.rawValue, false);
      assert.ok(result.explanation.includes('service worker'), result.explanation);
      const failures = result.details.items[0].failures;
      assert.strictEqual(failures.length, 1, failures);
    });
  });

  it('fails if start_url is not cached', () => {
    const artifacts = generateMockArtifacts();
    artifacts.StartUrl = {statusCode: -1};
    const context = generateMockAuditContext();

    return WebappInstallBannerAudit.audit(artifacts, context).then(result => {
      assert.strictEqual(result.rawValue, false);
      assert.ok(result.explanation.includes('start_url'), result.explanation);
      const failures = result.details.items[0].failures;
      assert.strictEqual(failures.length, 1, failures);
    });
  });

  it('includes warning from start_url', () => {
    const artifacts = generateMockArtifacts();
    artifacts.StartUrl = {statusCode: 200, explanation: 'Warning!'};
    const context = generateMockAuditContext();

    return WebappInstallBannerAudit.audit(artifacts, context).then(result => {
      assert.strictEqual(result.rawValue, true);
      assert.equal(result.warnings[0], 'Warning!');
    });
  });
});
