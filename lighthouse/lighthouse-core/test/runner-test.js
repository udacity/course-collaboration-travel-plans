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
const assetSaver = require('../lib/asset-saver');
const assert = require('assert');
const path = require('path');
const sinon = require('sinon');

const computedArtifacts = Runner.instantiateComputedArtifacts();

/* eslint-env mocha */

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

  describe('Gather Mode & Audit Mode', () => {
    const url = 'https://example.com';
    const generateConfig = _ => new Config({
      passes: [{
        gatherers: ['viewport-dimensions'],
      }],
      audits: ['content-width'],
    });

    it('-G gathers, quits, and doesn\'t run audits', () => {
      const opts = {url, config: generateConfig(), driverMock, flags: {gatherMode: true}};
      return Runner.run(null, opts).then(_ => {
        assert.equal(loadArtifactsSpy.called, false, 'loadArtifacts was called');

        assert.equal(saveArtifactsSpy.called, true, 'saveArtifacts was not called');
        const saveArtifactArg = saveArtifactsSpy.getCall(0).args[0];
        assert.ok(saveArtifactArg.ViewportDimensions);
        assert.ok(saveArtifactArg.devtoolsLogs.defaultPass.length > 100);

        assert.equal(gatherRunnerRunSpy.called, true, 'GatherRunner.run was not called');
        assert.equal(runAuditSpy.called, false, '_runAudit was called');
      });
    });

    // uses the files on disk from the -G test. ;)
    it('-A audits from saved artifacts and doesn\'t gather', () => {
      const opts = {url, config: generateConfig(), driverMock, flags: {auditMode: true}};
      return Runner.run(null, opts).then(_ => {
        assert.equal(loadArtifactsSpy.called, true, 'loadArtifacts was not called');
        assert.equal(gatherRunnerRunSpy.called, false, 'GatherRunner.run was called');
        assert.equal(saveArtifactsSpy.called, false, 'saveArtifacts was called');
        assert.equal(runAuditSpy.called, true, '_runAudit was not called');
      });
    });

    it('-GA is a normal run but it saves artifacts to disk', () => {
      const opts = {url, config: generateConfig(), driverMock,
        flags: {auditMode: true, gatherMode: true}};
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

  it('accepts existing artifacts', () => {
    const url = 'https://example.com';
    const config = new Config({
      audits: [
        'content-width',
      ],

      artifacts: {
        ViewportDimensions: {},
      },
    });

    return Runner.run({}, {url, config}).then(results => {
      // Mostly checking that this did not throw, but check representative values.
      assert.equal(results.initialUrl, url);
      assert.strictEqual(results.audits['content-width'].rawValue, true);
    });
  });

  it('accepts audit options', () => {
    const url = 'https://example.com';

    const calls = [];
    class EavesdropAudit extends Audit {
      static get meta() {
        return {
          name: 'eavesdrop-audit',
          description: 'It eavesdrops',
          failureDescription: 'It does not',
          helpText: 'Helpful when eavesdropping',
          requiredArtifacts: [],
        };
      }
      static audit(artifacts, context) {
        calls.push(context.options);
        return {rawValue: true};
      }
    }

    const config = new Config({
      audits: [
        {implementation: EavesdropAudit, options: {x: 1}},
        {implementation: EavesdropAudit, options: {x: 2}},
      ],
      artifacts: {},
    });

    return Runner.run({}, {url, config}).then(results => {
      assert.equal(results.initialUrl, url);
      assert.equal(results.audits['eavesdrop-audit'].rawValue, true);
      // assert that the options we received matched expectations
      assert.deepEqual(calls, [{x: 1}, {x: 2}]);
    });
  });

  it('accepts trace artifacts as paths and outputs appropriate data', () => {
    const url = 'https://example.com';

    const config = new Config({
      audits: [
        'user-timings',
      ],

      artifacts: {
        traces: {
          [Audit.DEFAULT_PASS]: path.join(__dirname, '/fixtures/traces/trace-user-timings.json'),
        },
      },
    });

    return Runner.run({}, {url, config}).then(results => {
      const audits = results.audits;
      assert.equal(audits['user-timings'].displayValue, 2);
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
      const url = 'https://example.com';
      const config = new Config({
        audits: [
          // requires traces[Audit.DEFAULT_PASS]
          'user-timings',
        ],
        artifacts: {
          traces: {},
        },
      });

      return Runner.run({}, {url, config}).then(results => {
        const auditResult = results.audits['user-timings'];
        assert.strictEqual(auditResult.rawValue, null);
        assert.strictEqual(auditResult.error, true);
        assert.ok(auditResult.debugString.includes('traces'));
      });
    });

    it('outputs an error audit result when missing a required artifact', () => {
      const url = 'https://example.com';
      const config = new Config({
        audits: [
          // requires the ViewportDimensions artifact
          'content-width',
        ],

        artifacts: {},
      });

      return Runner.run({}, {url, config}).then(results => {
        const auditResult = results.audits['content-width'];
        assert.strictEqual(auditResult.rawValue, null);
        assert.strictEqual(auditResult.error, true);
        assert.ok(auditResult.debugString.includes('ViewportDimensions'));
      });
    });

    it('outputs an error audit result when required artifact was a non-fatal Error', () => {
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
        const auditResult = results.audits['content-width'];
        assert.strictEqual(auditResult.rawValue, null);
        assert.strictEqual(auditResult.error, true);
        assert.ok(auditResult.debugString.includes(errorMessage));
      });
    });
  });

  describe('Bad audit behavior handling', () => {
    const testAuditMeta = {
      name: 'throwy-audit',
      description: 'Always throws',
      failureDescription: 'Always throws is failing, natch',
      helpText: 'Test for always throwing',
      requiredArtifacts: [],
    };

    it('produces an error audit result when an audit throws a non-fatal Error', () => {
      const errorMessage = 'Audit yourself';
      const url = 'https://example.com';
      const config = new Config({
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

        artifacts: {},
      });

      return Runner.run({}, {url, config}).then(results => {
        const auditResult = results.audits['throwy-audit'];
        assert.strictEqual(auditResult.rawValue, null);
        assert.strictEqual(auditResult.error, true);
        assert.ok(auditResult.debugString.includes(errorMessage));
      });
    });

    it('rejects if an audit throws a fatal error', () => {
      const errorMessage = 'Uh oh';
      const url = 'https://example.com';
      const config = new Config({
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

        artifacts: {},
      });

      return Runner.run({}, {url, config}).then(
        _ => assert.ok(false),
        err => assert.strictEqual(err.message, errorMessage));
    });
  });

  it('accepts performance logs as an artifact', () => {
    const url = 'https://example.com';
    const config = new Config({
      audits: [
        'critical-request-chains',
      ],

      artifacts: {
        URL: {
          finalUrl: 'https://www.reddit.com/r/nba',
        },
        devtoolsLogs: {
          defaultPass: path.join(__dirname, '/fixtures/perflog.json'),
        },
      },
    });

    return Runner.run({}, {url, config}).then(results => {
      const audits = results.audits;
      assert.equal(audits['critical-request-chains'].displayValue, 5);
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
    const url = 'https://example.com';
    const config = new Config({
      passes: [{
        gatherers: ['viewport-dimensions'],
      }],
      audits: [
        'content-width',
      ],
    });

    return Runner.run(null, {url, config, driverMock}).then(results => {
      assert.ok(results.lighthouseVersion);
      assert.ok(results.generatedTime);
      assert.equal(results.initialUrl, url);
      assert.equal(gatherRunnerRunSpy.called, true, 'GatherRunner.run was not called');
      assert.equal(results.audits['content-width'].name, 'content-width');
      assert.equal(results.score, 0);
    });
  });


  it('returns reportCategories', () => {
    const url = 'https://example.com';
    const config = new Config({
      passes: [{
        gatherers: ['viewport-dimensions'],
      }],
      audits: [
        'content-width',
      ],
      categories: {
        category: {
          name: 'Category',
          description: '',
          audits: [
            {id: 'content-width', weight: 1},
          ],
        },
      },
    });

    return Runner.run(null, {url, config, driverMock}).then(results => {
      assert.ok(results.lighthouseVersion);
      assert.ok(results.generatedTime);
      assert.equal(results.initialUrl, url);
      assert.equal(gatherRunnerRunSpy.called, true, 'GatherRunner.run was not called');
      assert.equal(results.audits['content-width'].name, 'content-width');
      assert.equal(results.reportCategories[0].score, 100);
      assert.equal(results.reportCategories[0].audits[0].id, 'content-width');
      assert.equal(results.reportCategories[0].audits[0].score, 100);
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
      assert.strictEqual(AuditClass.meta.name, auditExpectedName);
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
    const url = 'https://example.com';
    const ViewportDimensions = {innerHeight: 10, innerWidth: 10};
    const config = new Config({
      audits: [
        'content-width',
      ],

      artifacts: {ViewportDimensions},
    });

    return Runner.run({}, {url, config}).then(results => {
      assert.deepEqual(results.artifacts.ViewportDimensions, ViewportDimensions);

      for (const method of Object.keys(computedArtifacts)) {
        assert.ok(results.artifacts.hasOwnProperty(method));
      }
    });
  });

  it('results include artifacts and computedArtifacts when given passes and audits', () => {
    const url = 'https://example.com';
    const config = new Config({
      passes: [{
        passName: 'firstPass',
        gatherers: ['url', 'viewport-dimensions'],
      }],

      audits: [
        'content-width',
      ],
    });

    return Runner.run(null, {url, config, driverMock}).then(results => {
      // Check whether non-computedArtifacts attributes are returned
      assert.ok(results.artifacts.ViewportDimensions);

      for (const method of Object.keys(computedArtifacts)) {
        assert.ok(results.artifacts.hasOwnProperty(method));
      }

      // Verify a computed artifact
      const artifacts = results.artifacts;
      const devtoolsLogs = artifacts.devtoolsLogs['firstPass'];
      assert.equal(Array.isArray(devtoolsLogs), true, 'devtoolsLogs is not an array');

      return artifacts.requestCriticalRequestChains(devtoolsLogs).then(chains => {
        assert.ok(chains['93149.1']);
        assert.ok(chains['93149.1'].request);
        assert.ok(chains['93149.1'].children);
      });
    });
  });

  it('includes any LighthouseRunWarnings from artifacts in output', () => {
    const url = 'https://example.com';
    const LighthouseRunWarnings = [
      'warning0',
      'warning1',
    ];
    const config = new Config({
      artifacts: {
        LighthouseRunWarnings,
      },
      audits: [],
    });

    return Runner.run(null, {url, config, driverMock}).then(results => {
      assert.deepStrictEqual(results.runWarnings, LighthouseRunWarnings);
    });
  });
});
