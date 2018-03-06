/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Config = require('../../config/config');
const assert = require('assert');
const path = require('path');
const defaultConfig = require('../../config/default.js');
const log = require('lighthouse-logger');
const Gatherer = require('../../gather/gatherers/gatherer');
const Audit = require('../../audits/audit');
const Runner = require('../../runner');

/* eslint-env mocha */

describe('Config', () => {
  let origConfig;
  beforeEach(() => {
    origConfig = JSON.parse(JSON.stringify(defaultConfig));
  });

  it('returns new object', () => {
    const config = {
      audits: ['is-on-https'],
    };
    const newConfig = new Config(config);
    assert.notEqual(config, newConfig);
  });

  it('doesn\'t change directly injected plugins', () => {
    class MyGatherer extends Gatherer {}
    class MyAudit extends Audit {
      static get meta() {
        return {
          name: 'MyAudit',
          description: 'My audit',
          failureDescription: 'My failing audit',
          helpText: '.',
          requiredArtifacts: [],
        };
      }
      static audit() {}
    }
    const config = {
      passes: [{
        gatherers: [MyGatherer],
      }],
      audits: [MyAudit],
    };
    const newConfig = new Config(config);
    assert.equal(MyGatherer, newConfig.passes[0].gatherers[0].implementation);
    assert.equal(MyAudit, newConfig.audits[0].implementation);
  });

  it('uses the default config when no config is provided', () => {
    const config = new Config();
    assert.deepStrictEqual(origConfig.categories, config.categories);
    assert.equal(origConfig.audits.length, config.audits.length);
  });

  it('warns when a passName is used twice', () => {
    const unlikelyPassName = 'unlikelyPassName';
    const configJson = {
      passes: [{
        passName: unlikelyPassName,
        gatherers: [],
      }, {
        passName: unlikelyPassName,
        gatherers: [],
      }],
      audits: [],
    };

    assert.throws(_ => new Config(configJson), /unique/);
  });

  it('warns when traced twice with no passNames specified', () => {
    const configJson = {
      passes: [{
        gatherers: [],
      }, {
        gatherers: [],
      }],
      audits: [],
    };

    assert.throws(_ => new Config(configJson), /requires a passName/);
  });

  it('throws for unknown gatherers', () => {
    const config = {
      passes: [{
        gatherers: ['fuzz'],
      }],
      audits: [
        'is-on-https',
      ],
    };

    return assert.throws(_ => new Config(config),
        /Unable to locate/);
  });

  it('doesn\'t mutate old gatherers when filtering passes', () => {
    const configJSON = {
      passes: [{
        gatherers: [
          'url',
          'viewport',
        ],
      }],
      audits: ['is-on-https'],
    };

    const _ = new Config(configJSON);
    assert.equal(configJSON.passes[0].gatherers.length, 2);
  });

  it('expands audits', () => {
    const config = new Config({
      audits: ['user-timings'],
    });

    assert.ok(Array.isArray(config.audits));
    assert.equal(config.audits.length, 1);
    assert.equal(config.audits[0].path, 'user-timings');
    assert.equal(typeof config.audits[0].implementation, 'function');
    assert.deepEqual(config.audits[0].options, {});
  });

  it('throws when an audit is not found', () => {
    return assert.throws(_ => new Config({
      audits: ['/fake-path/non-existent-audit'],
    }), /locate audit/);
  });

  it('throws on a non-absolute config path', () => {
    const configPath = '../../config/default.js';

    return assert.throws(_ => new Config({
      audits: [],
    }, configPath), /absolute path/);
  });

  it('loads an audit relative to a config path', () => {
    const configPath = __filename;

    return assert.doesNotThrow(_ => new Config({
      audits: ['../fixtures/valid-custom-audit'],
    }, configPath));
  });

  it('loads an audit from node_modules/', () => {
    return assert.throws(_ => new Config({
      // Use a lighthouse dep as a stand in for a module.
      audits: ['mocha'],
    }), function(err) {
      // Should throw an audit validation error, but *not* an audit not found error.
      return !/locate audit/.test(err) && /audit\(\) method/.test(err);
    });
  });

  it('loads an audit relative to the working directory', () => {
    // Construct an audit URL relative to current working directory, regardless
    // of where test was started from.
    const absoluteAuditPath = path.resolve(__dirname, '../fixtures/valid-custom-audit');
    assert.doesNotThrow(_ => require.resolve(absoluteAuditPath));
    const relativePath = path.relative(process.cwd(), absoluteAuditPath);

    return assert.doesNotThrow(_ => new Config({
      audits: [relativePath],
    }));
  });

  it('throws but not for missing audit when audit has a dependency error', () => {
    return assert.throws(_ => new Config({
      audits: [path.resolve(__dirname, '../fixtures/invalid-audits/require-error.js')],
    }), function(err) {
      // We're expecting not to find parent class Audit, so only reject on our
      // own custom locate audit error, not the usual MODULE_NOT_FOUND.
      return !/locate audit/.test(err) && err.code === 'MODULE_NOT_FOUND';
    });
  });

  it('throws when it finds invalid audits', () => {
    const basePath = path.resolve(__dirname, '../fixtures/invalid-audits');
    assert.throws(_ => new Config({
      audits: [basePath + '/missing-audit'],
    }), /audit\(\) method/);

    assert.throws(_ => new Config({
      audits: [basePath + '/missing-name'],
    }), /meta.name property/);

    assert.throws(_ => new Config({
      audits: [basePath + '/missing-description'],
    }), /meta.description property/);

    assert.throws(_ => new Config({
      audits: [basePath + '/missing-help-text'],
    }), /meta.helpText property/);

    assert.throws(_ => new Config({
      audits: [basePath + '/missing-required-artifacts'],
    }), /meta.requiredArtifacts property/);
  });

  it('throws when a category references a non-existent audit', () => {
    return assert.throws(_ => new Config({
      audits: [],
      categories: {
        pwa: {
          audits: [
            {id: 'missing-audit'},
          ],
        },
      },
    }), /could not find missing-audit/);
  });

  it('throws when a category fails to specify an audit id', () => {
    return assert.throws(_ => new Config({
      audits: [],
      categories: {
        pwa: {
          audits: [
            'oops-wrong-format',
          ],
        },
      },
    }), 'missing an audit id at pwa[0]');
  });

  it('throws when an accessibility audit does not have a group', () => {
    return assert.throws(_ => new Config({
      audits: ['accessibility/color-contrast'],
      categories: {
        accessibility: {
          audits: [
            {id: 'color-contrast'},
          ],
        },
      },
    }), /does not have a group/);
  });

  it('throws when an audit references an unknown group', () => {
    return assert.throws(_ => new Config({
      groups: {
        'group-a': {
          title: 'Group A',
          description: 'The best group around.',
        },
      },
      audits: ['first-meaningful-paint'],
      categories: {
        pwa: {
          audits: [
            {id: 'first-meaningful-paint', group: 'group-a'},
            {id: 'first-meaningful-paint', group: 'missing-group'},
          ],
        },
      },
    }), /unknown group missing-group/);
  });

  it('filters the config', () => {
    const config = new Config({
      settings: {
        onlyCategories: ['needed-category'],
        onlyAudits: ['color-contrast'],
      },
      passes: [
        {recordTrace: true, gatherers: []},
        {passName: 'a11y', gatherers: ['accessibility']},
      ],
      audits: [
        'accessibility/color-contrast',
        'first-meaningful-paint',
        'first-interactive',
        'estimated-input-latency',
      ],
      categories: {
        'needed-category': {
          audits: [
            {id: 'first-meaningful-paint'},
            {id: 'first-interactive'},
          ],
        },
        'other-category': {
          audits: [
            {id: 'color-contrast'},
            {id: 'estimated-input-latency'},
          ],
        },
        'unused-category': {
          audits: [
            {id: 'estimated-input-latency'},
          ],
        },
      },
    });

    assert.equal(config.audits.length, 3, 'reduces audit count');
    assert.equal(config.passes.length, 2, 'preserves both passes');
    assert.ok(config.passes[0].recordTrace, 'preserves recordTrace pass');
    assert.ok(!config.categories['unused-category'], 'removes unused categories');
    assert.equal(config.categories['needed-category'].audits.length, 2);
    assert.equal(config.categories['other-category'].audits.length, 1);
  });

  it('filters the config w/ skipAudits', () => {
    const config = new Config({
      settings: {
        skipAudits: ['first-meaningful-paint'],
      },
      passes: [
        {recordTrace: true, gatherers: []},
        {passName: 'a11y', gatherers: ['accessibility']},
      ],
      audits: [
        'accessibility/color-contrast',
        'first-meaningful-paint',
        'first-interactive',
        'estimated-input-latency',
      ],
      categories: {
        'needed-category': {
          audits: [
            {id: 'first-meaningful-paint'},
            {id: 'first-interactive'},
            {id: 'color-contrast'},
          ],
        },
        'other-category': {
          audits: [
            {id: 'color-contrast'},
            {id: 'estimated-input-latency'},
          ],
        },
      },
    });

    assert.equal(config.audits.length, 3, 'skips the FMP audit');
    assert.equal(config.passes.length, 2, 'preserves both passes');
    assert.ok(config.passes[0].recordTrace, 'preserves recordTrace pass');
    assert.equal(config.categories['needed-category'].audits.length, 2,
      'removes skipped audit from category');
  });


  it('filtering filters out traces when not needed', () => {
    const warnings = [];
    const saveWarning = evt => warnings.push(evt);
    log.events.addListener('warning', saveWarning);
    const config = new Config({
      extends: true,
      settings: {
        onlyCategories: ['accessibility'],
      },
    });

    log.events.removeListener('warning', saveWarning);
    assert.ok(config.audits.length, 'inherited audits by extension');
    assert.equal(config.passes.length, 1, 'filtered out passes');
    assert.equal(warnings.length, 1, 'warned about dropping trace');
    assert.equal(config.passes[0].recordTrace, false, 'turns off tracing if not needed');
  });

  it('filters works with extension', () => {
    const config = new Config({
      extends: true,
      settings: {
        onlyCategories: ['performance'],
        onlyAudits: ['is-on-https'],
      },
    });

    assert.ok(config.audits.length, 'inherited audits by extension');
    assert.equal(config.audits.length, origConfig.categories.performance.audits.length + 1);
    assert.equal(config.passes.length, 1, 'filtered out passes');
  });

  it('warns for invalid filters', () => {
    const warnings = [];
    const saveWarning = evt => warnings.push(evt);
    log.events.addListener('warning', saveWarning);
    const config = new Config({
      extends: true,
      settings: {
        onlyCategories: ['performance', 'missing-category'],
        onlyAudits: ['first-interactive', 'missing-audit'],
      },
    });

    log.events.removeListener('warning', saveWarning);
    assert.ok(config, 'failed to generate config');
    assert.equal(warnings.length, 3, 'did not warn enough');
  });

  it('throws for invalid use of skipAudits and onlyAudits', () => {
    assert.throws(() => {
      new Config({
        extends: true,
        settings: {
          onlyAudits: ['first-meaningful-paint'],
          skipAudits: ['first-meaningful-paint'],
        },
      });
    });
  });

  it('extends the full config', () => {
    class CustomAudit extends Audit {
      static get meta() {
        return {
          name: 'custom-audit',
          description: 'none',
          failureDescription: 'none',
          helpText: 'none',
          requiredArtifacts: [],
        };
      }

      static audit() {
        throw new Error('Unimplemented');
      }
    }

    const config = new Config({
      extends: 'lighthouse:full',
      audits: [
        CustomAudit,
      ],
    });

    const auditNames = new Set(config.audits.map(audit => audit.implementation.meta.name));
    assert.ok(config, 'failed to generate config');
    assert.ok(auditNames.has('custom-audit'), 'did not include custom audit');
    assert.ok(auditNames.has('unused-css-rules'), 'did not include full audits');
    assert.ok(auditNames.has('first-meaningful-paint'), 'did not include default audits');
  });

  describe('artifact loading', () => {
    it('expands artifacts', () => {
      const config = new Config({
        artifacts: {
          traces: {
            defaultPass: path.resolve(__dirname, '../fixtures/traces/trace-user-timings.json'),
          },
          devtoolsLogs: {
            defaultPass: path.resolve(__dirname, '../fixtures/perflog.json'),
          },
        },
      });
      const computed = Runner.instantiateComputedArtifacts();

      const traceUserTimings = require('../fixtures/traces/trace-user-timings.json');
      assert.deepStrictEqual(config.artifacts.traces.defaultPass.traceEvents, traceUserTimings);
      const devtoolsLogs = config.artifacts.devtoolsLogs.defaultPass;
      assert.equal(devtoolsLogs.length, 555);

      return computed.requestNetworkRecords(devtoolsLogs).then(records => {
        assert.equal(records.length, 76);
      });
    });

    it('expands artifacts with multiple named passes', () => {
      const config = new Config({
        artifacts: {
          traces: {
            defaultPass: path.resolve(__dirname, '../fixtures/traces/trace-user-timings.json'),
            otherPass: path.resolve(__dirname, '../fixtures/traces/trace-user-timings.json'),
          },
          devtoolsLogs: {
            defaultPass: path.resolve(__dirname, '../fixtures/perflog.json'),
            otherPass: path.resolve(__dirname, '../fixtures/perflog.json'),
          },
        },
      });
      const traceUserTimings = require('../fixtures/traces/trace-user-timings.json');
      assert.deepStrictEqual(config.artifacts.traces.defaultPass.traceEvents, traceUserTimings);
      assert.deepStrictEqual(config.artifacts.traces.otherPass.traceEvents, traceUserTimings);
      assert.equal(config.artifacts.devtoolsLogs.defaultPass.length, 555);
      assert.equal(config.artifacts.devtoolsLogs.otherPass.length, 555);
    });

    it('handles traces with no TracingStartedInPage events', () => {
      const config = new Config({
        artifacts: {
          traces: {
            defaultPass: path.resolve(__dirname,
                            '../fixtures/traces/trace-user-timings-no-tracingstartedinpage.json'),
          },
          devtoolsLogs: {
            defaultPass: path.resolve(__dirname, '../fixtures/perflog.json'),
          },
        },
      });

      assert.ok(config.artifacts.traces.defaultPass.traceEvents.find(
            e => e.name === 'TracingStartedInPage' && e.args.data.page === '0xhad00p'));
    });
  });

  describe('#extendConfigJSON', () => {
    it('should merge passes', () => {
      const configA = {
        passes: [
          {passName: 'passA', gatherers: ['a']},
          {passName: 'passB', gatherers: ['b']},
          {gatherers: ['c']},
        ],
      };
      const configB = {
        passes: [
          {passName: 'passB', recordTrace: true, gatherers: ['d']},
          {gatherers: ['e']},
        ],
      };

      const merged = Config.extendConfigJSON(configA, configB);
      assert.equal(merged.passes.length, 4);
      assert.equal(merged.passes[1].recordTrace, true);
      assert.deepEqual(merged.passes[1].gatherers, ['b', 'd']);
      assert.deepEqual(merged.passes[3].gatherers, ['e']);
    });

    it('should merge audits', () => {
      const configA = {audits: ['a', 'b']};
      const configB = {audits: ['c']};
      const merged = Config.extendConfigJSON(configA, configB);
      assert.deepEqual(merged.audits, ['a', 'b', 'c']);
    });

    it('should merge categories', () => {
      const configA = {categories: {A: {name: 'Acat'}, B: {name: 'Bcat'}}};
      const configB = {categories: {C: {name: 'Ccat'}}};
      const merged = Config.extendConfigJSON(configA, configB);
      assert.deepStrictEqual(merged.categories, {
        A: {name: 'Acat'},
        B: {name: 'Bcat'},
        C: {name: 'Ccat'},
      });
    });

    it('should merge other values', () => {
      const artifacts = {
        traces: {defaultPass: '../some/long/path'},
        devtoolsLogs: {defaultPass: 'path/to/devtools/log'},
      };
      const configA = {};
      const configB = {extends: true, artifacts};
      const merged = Config.extendConfigJSON(configA, configB);
      assert.equal(merged.extends, true);
      assert.equal(merged.artifacts, configB.artifacts);
    });
  });

  describe('getCategories', () => {
    it('returns the IDs & names of the categories', () => {
      const categories = Config.getCategories(origConfig);
      assert.equal(Array.isArray(categories), true);
      assert.equal(categories.length, 5, 'Found the correct number of categories');
      const haveName = categories.every(cat => cat.name.length);
      const haveID = categories.every(cat => cat.id.length);
      assert.equal(haveName === haveID === true, true, 'they have IDs and names');
    });
  });

  describe('generateConfigOfCategories', () => {
    it('should not mutate the original config', () => {
      const configCopy = JSON.parse(JSON.stringify(origConfig));
      Config.generateNewFilteredConfig(configCopy, ['performance']);
      assert.deepStrictEqual(configCopy, origConfig, 'no mutations');
    });

    it('should filter out other passes if passed Performance', () => {
      const totalAuditCount = origConfig.audits.length;
      const config = Config.generateNewFilteredConfig(origConfig, ['performance']);
      assert.equal(Object.keys(config.categories).length, 1, 'other categories are present');
      assert.equal(config.passes.length, 1, 'incorrect # of passes');
      assert.ok(config.audits.length < totalAuditCount, 'audit filtering probably failed');
    });

    it('should filter out other passes if passed PWA', () => {
      const totalAuditCount = origConfig.audits.length;
      const config = Config.generateNewFilteredConfig(origConfig, ['pwa']);
      assert.equal(Object.keys(config.categories).length, 1, 'other categories are present');
      assert.ok(config.audits.length < totalAuditCount, 'audit filtering probably failed');
    });

    it('should filter out other passes if passed Best Practices', () => {
      const totalAuditCount = origConfig.audits.length;
      const config = Config.generateNewFilteredConfig(origConfig, ['best-practices']);
      assert.equal(Object.keys(config.categories).length, 1, 'other categories are present');
      assert.equal(config.passes.length, 1, 'incorrect # of passes');
      assert.ok(config.audits.length < totalAuditCount, 'audit filtering probably failed');
    });

    it('should only run audits for ones named by the category', () => {
      const config = Config.generateNewFilteredConfig(origConfig, ['performance']);
      const selectedCategory = origConfig.categories.performance;
      const auditCount = Object.keys(selectedCategory.audits).length;

      assert.equal(config.audits.length, auditCount, '# of audits match category list');
    });

    it('should only run specified audits', () => {
      const config = Config.generateNewFilteredConfig(origConfig, [], ['works-offline']);
      assert.equal(config.passes.length, 2, 'incorrect # of passes');
      assert.equal(config.audits.length, 1, 'audit filtering failed');
    });

    it('should combine audits and categories additively', () => {
      const config = Config.generateNewFilteredConfig(origConfig, ['performance'],
          ['works-offline']);
      const selectedCategory = origConfig.categories.performance;
      const auditCount = Object.keys(selectedCategory.audits).length + 1;
      assert.equal(config.passes.length, 2, 'incorrect # of passes');
      assert.equal(config.audits.length, auditCount, 'audit filtering failed');
    });

    it('should support redundant filtering', () => {
      const config = Config.generateNewFilteredConfig(origConfig, ['pwa'], ['is-on-https']);
      const selectedCategory = origConfig.categories.pwa;
      const auditCount = Object.keys(selectedCategory.audits).length;
      assert.equal(config.passes.length, 3, 'incorrect # of passes');
      assert.equal(config.audits.length, auditCount, 'audit filtering failed');
    });
  });

  describe('#requireGatherers', () => {
    function loadGatherer(gathererEntry) {
      const config = new Config({passes: [{gatherers: [gathererEntry]}]});
      return config.passes[0].gatherers[0];
    }

    it('loads a core gatherer', () => {
      const gatherer = loadGatherer('viewport-dimensions');
      assert.equal(gatherer.instance.name, 'ViewportDimensions');
      assert.equal(typeof gatherer.instance.beforePass, 'function');
    });

    it('loads gatherers from custom paths', () => {
      const customPath = path.resolve(__dirname, '../fixtures/valid-custom-gatherer');
      const gatherer = loadGatherer(customPath);
      assert.equal(gatherer.instance.name, 'CustomGatherer');
      assert.equal(typeof gatherer.instance.beforePass, 'function');
    });

    it('returns gatherer when gatherer class, not package-name string, is provided', () => {
      class TestGatherer extends Gatherer {}
      const gatherer = loadGatherer(TestGatherer);
      assert.equal(gatherer.instance.name, 'TestGatherer');
      assert.equal(typeof gatherer.instance.beforePass, 'function');
    });

    it('throws when a gatherer is not found', () => {
      assert.throws(_ => loadGatherer('/fake-non-existent-gatherer'), /locate gatherer/);
    });

    it('loads a gatherer from node_modules/', () => {
      // Use a lighthouse dep as a stand in for a module.
      assert.throws(_ => loadGatherer('mocha'), function(err) {
        // Should throw a gatherer validation error, but *not* a gatherer not found error.
        return !/locate gatherer/.test(err) && /beforePass\(\) method/.test(err);
      });
    });

    it('loads a gatherer relative to the working directory', () => {
      // Construct a gatherer URL relative to current working directory,
      // regardless of where test was started from.
      const absoluteGathererPath = path.resolve(__dirname, '../fixtures/valid-custom-gatherer');
      assert.doesNotThrow(_ => require.resolve(absoluteGathererPath));
      const relativeGathererPath = path.relative(process.cwd(), absoluteGathererPath);

      const gatherer = loadGatherer(relativeGathererPath);
      assert.equal(gatherer.instance.name, 'CustomGatherer');
      assert.equal(typeof gatherer.instance.beforePass, 'function');
    });

    it('throws but not for missing gatherer when it has a dependency error', () => {
      const gathererPath = path.resolve(__dirname, '../fixtures/invalid-gatherers/require-error');
      return assert.throws(_ => loadGatherer(gathererPath),
          function(err) {
            // We're expecting not to find parent class Gatherer, so only reject on
            // our own custom locate gatherer error, not the usual MODULE_NOT_FOUND.
            return !/locate gatherer/.test(err) && err.code === 'MODULE_NOT_FOUND';
          });
    });

    it('throws for invalid gatherers', () => {
      const root = path.resolve(__dirname, '../fixtures/invalid-gatherers');

      assert.throws(_ => loadGatherer(`${root}/missing-before-pass`),
        /beforePass\(\) method/);

      assert.throws(_ => loadGatherer(`${root}/missing-pass`),
        /pass\(\) method/);

      assert.throws(_ => loadGatherer(`${root}/missing-after-pass`),
        /afterPass\(\) method/);
    });
  });
});
