/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Runner = require('../runner');
const GatherRunner = require('../gather/gather-runner');
const driverMock = require('./gather/fake-driver');
const Config = require('../config/config');
const Audit = require('../audits/audit');
const Gatherer = require('../gather/gatherers/gatherer.js');
const assetSaver = require('../lib/asset-saver');
const fs = require('fs');
const assert = require('assert');
const path = require('path');
const sinon = require('sinon');
const rimraf = require('rimraf');
const LHError = require('../lib/lh-error.js');

/* eslint-env jest */

describe('Runner', () => {
  const saveArtifactsSpy = sinon.spy(assetSaver, 'saveArtifacts');
  const loadArtifactsSpy = sinon.spy(assetSaver, 'loadArtifacts');
  const gatherRunnerRunSpy = sinon.spy(GatherRunner, 'run');
  const runAuditSpy = sinon.spy(Runner, '_runAudit');

  function resetSpies() {
    saveArtifactsSpy.reset();
    loadArtifactsSpy.reset();
    gatherRunnerRunSpy.reset();
    runAuditSpy.reset();
  }

  beforeEach(() => {
    resetSpies();
  });

  const basicAuditMeta = {
    id: 'test-audit',
    title: 'A test audit',
    description: 'An audit for testing',
    requiredArtifacts: [],
  };

  describe('Gather Mode & Audit Mode', () => {
    const url = 'https://example.com';
    const generateConfig = settings => new Config({
      passes: [{
        gatherers: ['viewport-dimensions'],
      }],
      audits: ['content-width'],
      settings,
    });
    const artifactsPath = '.tmp/test_artifacts';
    const resolvedPath = path.resolve(process.cwd(), artifactsPath);

    afterAll(() => {
      rimraf.sync(resolvedPath);
    });

    it('-G gathers, quits, and doesn\'t run audits', () => {
      const opts = {url, config: generateConfig({gatherMode: artifactsPath}), driverMock};
      return Runner.run(null, opts).then(_ => {
        assert.equal(loadArtifactsSpy.called, false, 'loadArtifacts was called');

        assert.equal(saveArtifactsSpy.called, true, 'saveArtifacts was not called');
        const saveArtifactArg = saveArtifactsSpy.getCall(0).args[0];
        assert.ok(saveArtifactArg.ViewportDimensions);
        assert.ok(saveArtifactArg.devtoolsLogs.defaultPass.length > 100);

        assert.equal(gatherRunnerRunSpy.called, true, 'GatherRunner.run was not called');
        assert.equal(runAuditSpy.called, false, '_runAudit was called');

        assert.ok(fs.existsSync(resolvedPath));
        assert.ok(fs.existsSync(`${resolvedPath}/artifacts.json`));
      });
    });

    // uses the files on disk from the -G test. ;)
    it('-A audits from saved artifacts and doesn\'t gather', () => {
      const opts = {config: generateConfig({auditMode: artifactsPath}), driverMock};
      return Runner.run(null, opts).then(_ => {
        assert.equal(loadArtifactsSpy.called, true, 'loadArtifacts was not called');
        assert.equal(gatherRunnerRunSpy.called, false, 'GatherRunner.run was called');
        assert.equal(saveArtifactsSpy.called, false, 'saveArtifacts was called');
        assert.equal(runAuditSpy.called, true, '_runAudit was not called');
      });
    });

    it('-A throws if the settings change', async () => {
      const settings = {auditMode: artifactsPath, disableDeviceEmulation: true};
      const opts = {config: generateConfig(settings), driverMock};
      try {
        await Runner.run(null, opts);
        assert.fail('should have thrown');
      } catch (err) {
        assert.ok(/Cannot change settings/.test(err.message), 'should have prevented run');
      }
    });

    it('-A throws if the URL changes', async () => {
      const settings = {auditMode: artifactsPath, disableDeviceEmulation: true};
      const opts = {url: 'https://differenturl.com', config: generateConfig(settings), driverMock};
      try {
        await Runner.run(null, opts);
        assert.fail('should have thrown');
      } catch (err) {
        assert.ok(/different URL/.test(err.message), 'should have prevented run');
      }
    });

    it('-GA is a normal run but it saves artifacts to disk', () => {
      const settings = {auditMode: artifactsPath, gatherMode: artifactsPath};
      const opts = {url, config: generateConfig(settings), driverMock};
      return Runner.run(null, opts).then(_ => {
        assert.equal(loadArtifactsSpy.called, false, 'loadArtifacts was called');
        assert.equal(gatherRunnerRunSpy.called, true, 'GatherRunner.run was not called');
        assert.equal(saveArtifactsSpy.called, true, 'saveArtifacts was not called');
        assert.equal(runAuditSpy.called, true, '_runAudit was not called');
      });
    });

    it('non -G/-A run doesn\'t save artifacts to disk', () => {
      const opts = {url, config: generateConfig(), driverMock};
      return Runner.run(null, opts).then(_ => {
        assert.equal(loadArtifactsSpy.called, false, 'loadArtifacts was called');
        assert.equal(gatherRunnerRunSpy.called, true, 'GatherRunner.run was not called');
        assert.equal(saveArtifactsSpy.called, false, 'saveArtifacts was called');
        assert.equal(runAuditSpy.called, true, '_runAudit was not called');
      });
    });
  });

  it('expands gatherers', () => {
    const url = 'https://example.com';
    const config = new Config({
      passes: [{
        gatherers: ['viewport-dimensions'],
      }],
      audits: [
        'content-width',
      ],
    });

    return Runner.run(null, {url, config, driverMock}).then(_ => {
      assert.equal(gatherRunnerRunSpy.called, true, 'GatherRunner.run was not called');
      assert.ok(typeof config.passes[0].gatherers[0] === 'object');
    });
  });


  it('rejects when given neither passes nor artifacts', () => {
    const url = 'https://example.com';
    const config = new Config({
      audits: [
        'content-width',
      ],
    });

    return Runner.run(null, {url, config, driverMock})
      .then(_ => {
        assert.ok(false);
      }, err => {
        assert.ok(/No browser artifacts are either/.test(err.message));
      });
  });

  it('accepts audit options', () => {
    const url = 'https://example.com/';

    const calls = [];
    class EavesdropAudit extends Audit {
      static get meta() {
        return {
          id: 'eavesdrop-audit',
          title: 'It eavesdrops',
          failureTitle: 'It does not',
          description: 'Helpful when eavesdropping',
          requiredArtifacts: [],
        };
      }
      static audit(artifacts, context) {
        calls.push(context.options);
        return {rawValue: true};
      }
    }

    const config = new Config({
      settings: {
        auditMode: __dirname + '/fixtures/artifacts/empty-artifacts/',
      },
      audits: [
        {implementation: EavesdropAudit, options: {x: 1}},
        {implementation: EavesdropAudit, options: {x: 2}},
      ],
    });

    return Runner.run({}, {url, config}).then(results => {
      assert.equal(results.lhr.requestedUrl, url);
      assert.equal(results.lhr.audits['eavesdrop-audit'].rawValue, true);
      // assert that the options we received matched expectations
      assert.deepEqual(calls, [{x: 1}, {x: 2}]);
    });
  });

  it('accepts trace artifacts as paths and outputs appropriate data', () => {
    const config = new Config({
      settings: {
        auditMode: __dirname + '/fixtures/artifacts/perflog/',
      },
      audits: [
        'user-timings',
      ],
    });

    return Runner.run({}, {config}).then(results => {
      const audits = results.lhr.audits;
      assert.equal(audits['user-timings'].displayValue, '2 user timings');
      assert.equal(audits['user-timings'].rawValue, false);
    });
  });

  it('rejects when given an invalid trace artifact', () => {
    const url = 'https://example.com';
    const config = new Config({
      passes: [{
        recordTrace: true,
        gatherers: [],
      }],
    });

    // Arrange for driver to return bad trace.
    const badTraceDriver = Object.assign({}, driverMock, {
      endTrace() {
        return Promise.resolve({
          traceEvents: 'not an array',
        });
      },
    });

    return Runner.run({}, {url, config, driverMock: badTraceDriver})
      .then(_ => {
        assert.ok(false);
      }, _ => {
        assert.ok(true);
      });
  });

  describe('Bad required artifact handling', () => {
    it('outputs an error audit result when trace required but not provided', () => {
      const config = new Config({
        settings: {
          auditMode: __dirname + '/fixtures/artifacts/empty-artifacts/',
        },
        audits: [
          // requires traces[Audit.DEFAULT_PASS]
          'user-timings',
        ],
      });

      return Runner.run({}, {config}).then(results => {
        const auditResult = results.lhr.audits['user-timings'];
        assert.strictEqual(auditResult.rawValue, null);
        assert.strictEqual(auditResult.scoreDisplayMode, 'error');
        assert.ok(auditResult.errorMessage.includes('traces'));
      });
    });

    it('outputs an error audit result when missing a required artifact', () => {
      const config = new Config({
        settings: {
          auditMode: __dirname + '/fixtures/artifacts/empty-artifacts/',
        },
        audits: [
          // requires the ViewportDimensions artifact
          'content-width',
        ],
      });

      return Runner.run({}, {config}).then(results => {
        const auditResult = results.lhr.audits['content-width'];
        assert.strictEqual(auditResult.rawValue, null);
        assert.strictEqual(auditResult.scoreDisplayMode, 'error');
        assert.ok(auditResult.errorMessage.includes('ViewportDimensions'));
      });
    });

    // TODO: need to support save/load of artifact errors.
    // See https://github.com/GoogleChrome/lighthouse/issues/4984
    it.skip('outputs an error audit result when required artifact was a non-fatal Error', () => {
      const errorMessage = 'blurst of times';
      const artifactError = new Error(errorMessage);

      const url = 'https://example.com';
      const config = new Config({
        audits: [
          'content-width',
        ],

        artifacts: {
          // Error objects don't make it through the Config constructor due to
          // JSON.stringify/parse step, so populate with test error below.
          ViewportDimensions: null,
        },
      });
      config.artifacts.ViewportDimensions = artifactError;

      return Runner.run({}, {url, config}).then(results => {
        const auditResult = results.lhr.audits['content-width'];
        assert.strictEqual(auditResult.rawValue, null);
        assert.strictEqual(auditResult.scoreDisplayMode, 'error');
        assert.ok(auditResult.errorMessage.includes(errorMessage));
      });
    });
  });

  describe('Bad audit behavior handling', () => {
    const testAuditMeta = {
      id: 'throwy-audit',
      title: 'Always throws',
      failureTitle: 'Always throws is failing, natch',
      description: 'Test for always throwing',
      requiredArtifacts: [],
    };

    it('produces an error audit result when an audit throws a non-fatal Error', () => {
      const errorMessage = 'Audit yourself';
      const config = new Config({
        settings: {
          auditMode: __dirname + '/fixtures/artifacts/empty-artifacts/',
        },
        audits: [
          class ThrowyAudit extends Audit {
            static get meta() {
              return testAuditMeta;
            }
            static audit() {
              throw new Error(errorMessage);
            }
          },
        ],
      });

      return Runner.run({}, {config}).then(results => {
        const auditResult = results.lhr.audits['throwy-audit'];
        assert.strictEqual(auditResult.rawValue, null);
        assert.strictEqual(auditResult.scoreDisplayMode, 'error');
        assert.ok(auditResult.errorMessage.includes(errorMessage));
      });
    });

    it('rejects if an audit throws a fatal error', () => {
      const errorMessage = 'Uh oh';
      const config = new Config({
        settings: {
          auditMode: __dirname + '/fixtures/artifacts/empty-artifacts/',
        },
        audits: [
          class FatalThrowyAudit extends Audit {
            static get meta() {
              return testAuditMeta;
            }
            static audit() {
              const fatalError = new Error(errorMessage);
              fatalError.fatal = true;
              throw fatalError;
            }
          },
        ],
      });

      return Runner.run({}, {config}).then(
        _ => assert.ok(false),
        err => assert.strictEqual(err.message, errorMessage));
    });
  });

  it('accepts devtoolsLog in artifacts', () => {
    const config = new Config({
      settings: {
        auditMode: __dirname + '/fixtures/artifacts/perflog/',
      },
      audits: [
        'critical-request-chains',
      ],
    });

    return Runner.run({}, {config}).then(results => {
      const audits = results.lhr.audits;
      assert.equal(audits['critical-request-chains'].displayValue, '5 chains found');
      assert.equal(audits['critical-request-chains'].rawValue, false);
    });
  });

  it('rejects when not given audits to run (and not -G)', () => {
    const url = 'https://example.com';
    const config = new Config({
      passes: [{
        gatherers: ['viewport-dimensions'],
      }],
    });

    return Runner.run(null, {url, config, driverMock})
      .then(_ => {
        assert.ok(false);
      }, err => {
        assert.ok(/No audits to evaluate/.test(err.message));
      });
  });

  it('returns data even if no config categories are provided', () => {
    const url = 'https://example.com/';
    const config = new Config({
      passes: [{
        gatherers: ['viewport-dimensions'],
      }],
      audits: [
        'content-width',
      ],
    });

    return Runner.run(null, {url, config, driverMock}).then(results => {
      assert.ok(results.lhr.lighthouseVersion);
      assert.ok(results.lhr.fetchTime);
      assert.equal(results.lhr.requestedUrl, url);
      assert.equal(gatherRunnerRunSpy.called, true, 'GatherRunner.run was not called');
      assert.equal(results.lhr.audits['content-width'].id, 'content-width');
    });
  });


  it('returns categories', () => {
    const url = 'https://example.com/';
    const config = new Config({
      passes: [{
        gatherers: ['viewport-dimensions'],
      }],
      audits: [
        'content-width',
      ],
      categories: {
        category: {
          title: 'Category',
          description: '',
          auditRefs: [
            {id: 'content-width', weight: 1},
          ],
        },
      },
    });

    return Runner.run(null, {url, config, driverMock}).then(results => {
      assert.ok(results.lhr.lighthouseVersion);
      assert.ok(results.lhr.fetchTime);
      assert.equal(results.lhr.requestedUrl, url);
      assert.equal(gatherRunnerRunSpy.called, true, 'GatherRunner.run was not called');
      assert.equal(results.lhr.audits['content-width'].id, 'content-width');
      assert.equal(results.lhr.audits['content-width'].score, 1);
      assert.equal(results.lhr.categories.category.score, 1);
      assert.equal(results.lhr.categories.category.auditRefs[0].id, 'content-width');
    });
  });


  it('rejects when not given a URL', () => {
    return Runner.run({}, {}).then(_ => assert.ok(false), _ => assert.ok(true));
  });

  it('rejects when given a URL of zero length', () => {
    return Runner.run({}, {url: ''}).then(_ => assert.ok(false), _ => assert.ok(true));
  });

  it('rejects when given a URL without protocol', () => {
    return Runner.run({}, {url: 'localhost'}).then(_ => assert.ok(false), _ => assert.ok(true));
  });

  it('rejects when given a URL without hostname', () => {
    return Runner.run({}, {url: 'https://'}).then(_ => assert.ok(false), _ => assert.ok(true));
  });

  it('only supports core audits with names matching their filename', () => {
    const coreAudits = Runner.getAuditList();
    coreAudits.forEach(auditFilename => {
      const auditPath = '../audits/' + auditFilename;
      const auditExpectedName = path.basename(auditFilename, '.js');
      const AuditClass = require(auditPath);
      assert.strictEqual(AuditClass.meta.id, auditExpectedName);
    });
  });

  it('can create computed artifacts', () => {
    const computedArtifacts = Runner.instantiateComputedArtifacts();
    assert.ok(Object.keys(computedArtifacts).length, 'there are a few computed artifacts');
    Object.keys(computedArtifacts).forEach(artifactRequest => {
      assert.equal(typeof computedArtifacts[artifactRequest], 'function');
    });
  });

  it('results include artifacts when given artifacts and audits', () => {
    const config = new Config({
      settings: {
        auditMode: __dirname + '/fixtures/artifacts/perflog/',
      },
      audits: [
        'content-width',
      ],
    });

    return Runner.run({}, {config}).then(results => {
      assert.strictEqual(results.artifacts.ViewportDimensions.innerWidth, 412);
      assert.strictEqual(results.artifacts.ViewportDimensions.innerHeight, 732);
    });
  });

  it('results include artifacts when given passes and audits', () => {
    const url = 'https://example.com';
    const config = new Config({
      passes: [{
        passName: 'firstPass',
        gatherers: ['viewport', 'viewport-dimensions'],
      }],

      audits: [
        'content-width',
      ],
    });

    return Runner.run(null, {url, config, driverMock}).then(results => {
      // User-specified artifact.
      assert.ok(results.artifacts.ViewportDimensions);

      // Default artifact.
      const artifacts = results.artifacts;
      const devtoolsLogs = artifacts.devtoolsLogs['firstPass'];
      assert.equal(Array.isArray(devtoolsLogs), true, 'devtoolsLogs is not an array');
    });
  });

  it('includes any LighthouseRunWarnings from artifacts in output', () => {
    const config = new Config({
      settings: {
        auditMode: __dirname + '/fixtures/artifacts/perflog/',
      },
      audits: [],
    });

    return Runner.run(null, {config, driverMock}).then(results => {
      assert.deepStrictEqual(results.lhr.runWarnings, [
        'I\'m a warning!',
        'Also a warning',
      ]);
    });
  });

  it('includes any LighthouseRunWarnings from audits in LHR', () => {
    const warningString = 'Really important audit warning!';

    const config = new Config({
      settings: {
        auditMode: __dirname + '/fixtures/artifacts/empty-artifacts/',
      },
      audits: [
        class WarningAudit extends Audit {
          static get meta() {
            return basicAuditMeta;
          }
          static audit(artifacts, context) {
            context.LighthouseRunWarnings.push(warningString);
            return {
              rawValue: 5,
            };
          }
        },
      ],
    });

    return Runner.run(null, {config, driverMock}).then(results => {
      assert.deepStrictEqual(results.lhr.runWarnings, [warningString]);
    });
  });

  it('includes any LighthouseRunWarnings from errored audits in LHR', () => {
    const warningString = 'Audit warning just before a terrible error!';

    const config = new Config({
      settings: {
        auditMode: __dirname + '/fixtures/artifacts/empty-artifacts/',
      },
      audits: [
        class WarningAudit extends Audit {
          static get meta() {
            return basicAuditMeta;
          }
          static audit(artifacts, context) {
            context.LighthouseRunWarnings.push(warningString);
            throw new Error('Terrible.');
          }
        },
      ],
    });

    return Runner.run(null, {config, driverMock}).then(results => {
      assert.deepStrictEqual(results.lhr.runWarnings, [warningString]);
    });
  });

  it('includes a top-level runtimeError when a gatherer throws one', async () => {
    const NO_FCP = LHError.errors.NO_FCP;
    class RuntimeErrorGatherer extends Gatherer {
      afterPass() {
        throw new LHError(NO_FCP);
      }
    }
    class WarningAudit extends Audit {
      static get meta() {
        return {
          id: 'test-audit',
          title: 'A test audit',
          description: 'An audit for testing',
          requiredArtifacts: ['RuntimeErrorGatherer'],
        };
      }
      static audit() {
        throw new Error('Should not get here');
      }
    }

    const config = new Config({
      passes: [{gatherers: [RuntimeErrorGatherer]}],
      audits: [WarningAudit],
    });
    const {lhr} = await Runner.run(null, {url: 'https://example.com/', config, driverMock});

    // Audit error included the runtimeError
    assert.strictEqual(lhr.audits['test-audit'].scoreDisplayMode, 'error');
    assert.ok(lhr.audits['test-audit'].errorMessage.includes(NO_FCP.code));
    // And it bubbled up to the runtimeError.
    assert.strictEqual(lhr.runtimeError.code, NO_FCP.code);
    assert.ok(lhr.runtimeError.message.includes(NO_FCP.message));
  });

  it('can handle array of outputs', async () => {
    const url = 'https://example.com';
    const config = new Config({
      extends: 'lighthouse:default',
      settings: {
        onlyCategories: ['performance'],
        output: ['json', 'html'],
      },
    });

    const results = await Runner.run(null, {url, config, driverMock});
    assert.ok(Array.isArray(results.report) && results.report.length === 2,
      'did not return multiple reports');
    assert.ok(JSON.parse(results.report[0]), 'did not return json output');
    assert.ok(/<!doctype/.test(results.report[1]), 'did not return html output');
  });
});
