/**
 * @license Copyright 2016 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const isDeepEqual = require('lodash.isequal');
const Driver = require('./gather/driver.js');
const GatherRunner = require('./gather/gather-runner');
const ReportScoring = require('./scoring');
const Audit = require('./audits/audit');
const log = require('lighthouse-logger');
const i18n = require('./lib/i18n/i18n.js');
const assetSaver = require('./lib/asset-saver');
const fs = require('fs');
const path = require('path');
const URL = require('./lib/url-shim');
const Sentry = require('./lib/sentry');
const generateReport = require('./report/report-generator').generateReport;
const LHError = require('./lib/lh-error.js');

/** @typedef {import('./gather/connections/connection.js')} Connection */
/** @typedef {import('./config/config.js')} Config */

class Runner {
  /**
   * @param {Connection} connection
   * @param {{config: Config, url?: string, driverMock?: Driver}} runOpts
   * @return {Promise<LH.RunnerResult|undefined>}
   */
  static async run(connection, runOpts) {
    try {
      const startTime = Date.now();
      const settings = runOpts.config.settings;

      /**
       * List of top-level warnings for this Lighthouse run.
       * @type {Array<string>}
       */
      const lighthouseRunWarnings = [];

      const sentryContext = Sentry.getContext();
      Sentry.captureBreadcrumb({
        message: 'Run started',
        category: 'lifecycle',
        data: sentryContext && sentryContext.extra,
      });

      // User can run -G solo, -A solo, or -GA together
      // -G and -A will run partial lighthouse pipelines,
      // and -GA will run everything plus save artifacts to disk

      // Gather phase
      // Either load saved artifacts off disk or from the browser
      let artifacts;
      let requestedUrl;
      if (settings.auditMode && !settings.gatherMode) {
        // No browser required, just load the artifacts from disk.
        const path = Runner._getArtifactsPath(settings);
        artifacts = await assetSaver.loadArtifacts(path);
        requestedUrl = artifacts.URL.requestedUrl;

        if (!requestedUrl) {
          throw new Error('Cannot run audit mode on empty URL');
        }
        if (runOpts.url && !URL.equalWithExcludedFragments(runOpts.url, requestedUrl)) {
          throw new Error('Cannot run audit mode on different URL');
        }
      } else {
        if (typeof runOpts.url !== 'string' || runOpts.url.length === 0) {
          throw new Error(`You must provide a url to the runner. '${runOpts.url}' provided.`);
        }

        try {
          // Use canonicalized URL (with trailing slashes and such)
          requestedUrl = new URL(runOpts.url).href;
        } catch (e) {
          throw new Error('The url provided should have a proper protocol and hostname.');
        }

        artifacts = await Runner._gatherArtifactsFromBrowser(requestedUrl, runOpts, connection);
        // -G means save these to ./latest-run, etc.
        if (settings.gatherMode) {
          const path = Runner._getArtifactsPath(settings);
          await assetSaver.saveArtifacts(artifacts, path);
        }
      }

      // Potentially quit early
      if (settings.gatherMode && !settings.auditMode) return;

      // Audit phase
      if (!runOpts.config.audits) {
        throw new Error('No audits to evaluate.');
      }
      const auditResults = await Runner._runAudits(settings, runOpts.config.audits, artifacts,
          lighthouseRunWarnings);

      // LHR construction phase
      log.log('status', 'Generating results...');

      if (artifacts.LighthouseRunWarnings) {
        lighthouseRunWarnings.push(...artifacts.LighthouseRunWarnings);
      }

      // Entering: conclusion of the lighthouse result object
      const lighthouseVersion = require('../package.json').version;

      /** @type {Object<string, LH.Audit.Result>} */
      const resultsById = {};
      for (const audit of auditResults) {
        resultsById[audit.id] = audit;
      }

      /** @type {Object<string, LH.Result.Category>} */
      let categories = {};
      if (runOpts.config.categories) {
        categories = ReportScoring.scoreAllCategories(runOpts.config.categories, resultsById);
      }

      /** @type {LH.Result} */
      const lhr = {
        userAgent: artifacts.HostUserAgent,
        environment: {
          networkUserAgent: artifacts.NetworkUserAgent,
          hostUserAgent: artifacts.HostUserAgent,
          benchmarkIndex: artifacts.BenchmarkIndex,
        },
        lighthouseVersion,
        fetchTime: artifacts.fetchTime,
        requestedUrl: requestedUrl,
        finalUrl: artifacts.URL.finalUrl,
        runWarnings: lighthouseRunWarnings,
        runtimeError: Runner.getArtifactRuntimeError(artifacts),
        audits: resultsById,
        configSettings: settings,
        categories,
        categoryGroups: runOpts.config.groups || undefined,
        timing: {total: Date.now() - startTime},
        i18n: {
          rendererFormattedStrings: i18n.getRendererFormattedStrings(settings.locale),
          icuMessagePaths: {},
        },
      };

      // Replace ICU message references with localized strings; save replaced paths in lhr.
      lhr.i18n.icuMessagePaths = i18n.replaceIcuMessageInstanceIds(lhr, settings.locale);

      const report = generateReport(lhr, settings.output);
      return {lhr, artifacts, report};
    } catch (err) {
      await Sentry.captureException(err, {level: 'fatal'});
      throw err;
    }
  }

  /**
   * Establish connection, load page and collect all required artifacts
   * @param {string} requestedUrl
   * @param {{config: Config, driverMock?: Driver}} runnerOpts
   * @param {Connection} connection
   * @return {Promise<LH.Artifacts>}
   */
  static async _gatherArtifactsFromBrowser(requestedUrl, runnerOpts, connection) {
    if (!runnerOpts.config.passes) {
      throw new Error('No browser artifacts are either provided or requested.');
    }

    const driver = runnerOpts.driverMock || new Driver(connection);
    const gatherOpts = {
      driver,
      requestedUrl,
      settings: runnerOpts.config.settings,
    };
    const artifacts = await GatherRunner.run(runnerOpts.config.passes, gatherOpts);
    return artifacts;
  }

  /**
   * Run all audits with specified settings and artifacts.
   * @param {LH.Config.Settings} settings
   * @param {Array<LH.Config.AuditDefn>} audits
   * @param {LH.Artifacts} artifacts
   * @param {Array<string>} runWarnings
   * @return {Promise<Array<LH.Audit.Result>>}
   */
  static async _runAudits(settings, audits, artifacts, runWarnings) {
    log.log('status', 'Analyzing and running audits...');
    artifacts = Object.assign({}, Runner.instantiateComputedArtifacts(), artifacts);

    if (artifacts.settings) {
      const overrides = {
        locale: undefined,
        gatherMode: undefined,
        auditMode: undefined,
        output: undefined,
      };
      const normalizedGatherSettings = Object.assign({}, artifacts.settings, overrides);
      const normalizedAuditSettings = Object.assign({}, settings, overrides);

      // TODO(phulce): allow change of throttling method to `simulate`
      if (!isDeepEqual(normalizedGatherSettings, normalizedAuditSettings)) {
        throw new Error('Cannot change settings between gathering and auditing');
      }
    }

    // Members of LH.Audit.Context that are shared across all audits.
    const sharedAuditContext = {
      settings,
      LighthouseRunWarnings: runWarnings,
      computedCache: new Map(),
    };

    // Run each audit sequentially
    const auditResults = [];
    for (const auditDefn of audits) {
      const auditResult = await Runner._runAudit(auditDefn, artifacts, sharedAuditContext);
      auditResults.push(auditResult);
    }

    return auditResults;
  }

  /**
   * Checks that the audit's required artifacts exist and runs the audit if so.
   * Otherwise returns error audit result.
   * @param {LH.Config.AuditDefn} auditDefn
   * @param {LH.Artifacts} artifacts
   * @param {Pick<LH.Audit.Context, 'settings'|'LighthouseRunWarnings'|'computedCache'>} sharedAuditContext
   * @return {Promise<LH.Audit.Result>}
   * @private
   */
  static async _runAudit(auditDefn, artifacts, sharedAuditContext) {
    const audit = auditDefn.implementation;
    const status = `Evaluating: ${i18n.getFormatted(audit.meta.title, 'en-US')}`;

    log.log('status', status);
    let auditResult;
    try {
      // Return an early error if an artifact required for the audit is missing or an error.
      for (const artifactName of audit.meta.requiredArtifacts) {
        const noArtifact = artifacts[artifactName] === undefined;

        // If trace required, check that DEFAULT_PASS trace exists.
        // TODO: need pass-specific check of networkRecords and traces.
        const noTrace = artifactName === 'traces' && !artifacts.traces[Audit.DEFAULT_PASS];

        if (noArtifact || noTrace) {
          log.warn('Runner',
              `${artifactName} gatherer, required by audit ${audit.meta.id}, did not run.`);
          throw new Error(`Required ${artifactName} gatherer did not run.`);
        }

        // If artifact was an error, it must be non-fatal (or gatherRunner would
        // have thrown). Output error result on behalf of audit.
        if (artifacts[artifactName] instanceof Error) {
          /** @type {Error} */
          // @ts-ignore An artifact *could* be an Error, but caught here, so ignore elsewhere.
          const artifactError = artifacts[artifactName];

          Sentry.captureException(artifactError, {
            tags: {gatherer: artifactName},
            level: 'error',
          });

          log.warn('Runner', `${artifactName} gatherer, required by audit ${audit.meta.id},` +
            ` encountered an error: ${artifactError.message}`);

          // Create a friendlier display error and mark it as expected to avoid duplicates in Sentry
          const error = new Error(
              `Required ${artifactName} gatherer encountered an error: ${artifactError.message}`);
          // @ts-ignore Non-standard property added to Error
          error.expected = true;
          throw error;
        }
      }

      // all required artifacts are in good shape, so we proceed
      const auditOptions = Object.assign({}, audit.defaultOptions, auditDefn.options);
      const auditContext = {
        options: auditOptions,
        ...sharedAuditContext,
      };

      const product = await audit.audit(artifacts, auditContext);
      auditResult = Audit.generateAuditResult(audit, product);
    } catch (err) {
      log.warn(audit.meta.id, `Caught exception: ${err.message}`);
      if (err.fatal) {
        throw err;
      }

      Sentry.captureException(err, {tags: {audit: audit.meta.id}, level: 'error'});
      // Non-fatal error become error audit result.
      const errorMessage = err.friendlyMessage ?
        `${err.friendlyMessage} (${err.message})` :
        `Audit error: ${err.message}`;
      auditResult = Audit.generateErrorAuditResult(audit, errorMessage);
    }

    log.verbose('statusEnd', status);
    return auditResult;
  }

  /**
   * Returns first runtimeError found in artifacts.
   * @param {LH.Artifacts} artifacts
   * @return {LH.Result['runtimeError']}
   */
  static getArtifactRuntimeError(artifacts) {
    for (const possibleErrorArtifact of Object.values(artifacts)) {
      if (possibleErrorArtifact instanceof LHError && possibleErrorArtifact.lhrRuntimeError) {
        const errorMessage = possibleErrorArtifact.friendlyMessage || possibleErrorArtifact.message;

        return {
          code: possibleErrorArtifact.code,
          message: errorMessage,
        };
      }
    }

    return {
      code: LHError.NO_ERROR,
      message: '',
    };
  }

  /**
   * Returns list of audit names for external querying.
   * @return {Array<string>}
   */
  static getAuditList() {
    const ignoredFiles = [
      'audit.js',
      'violation-audit.js',
      'accessibility/axe-audit.js',
      'multi-check-audit.js',
      'byte-efficiency/byte-efficiency-audit.js',
      'manual/manual-audit.js',
    ];

    const fileList = [
      ...fs.readdirSync(path.join(__dirname, './audits')),
      ...fs.readdirSync(path.join(__dirname, './audits/dobetterweb')).map(f => `dobetterweb/${f}`),
      ...fs.readdirSync(path.join(__dirname, './audits/metrics')).map(f => `metrics/${f}`),
      ...fs.readdirSync(path.join(__dirname, './audits/seo')).map(f => `seo/${f}`),
      ...fs.readdirSync(path.join(__dirname, './audits/seo/manual')).map(f => `seo/manual/${f}`),
      ...fs.readdirSync(path.join(__dirname, './audits/accessibility'))
          .map(f => `accessibility/${f}`),
      ...fs.readdirSync(path.join(__dirname, './audits/accessibility/manual'))
          .map(f => `accessibility/manual/${f}`),
      ...fs.readdirSync(path.join(__dirname, './audits/byte-efficiency'))
          .map(f => `byte-efficiency/${f}`),
      ...fs.readdirSync(path.join(__dirname, './audits/manual')).map(f => `manual/${f}`),
    ];
    return fileList.filter(f => {
      return /\.js$/.test(f) && !ignoredFiles.includes(f);
    }).sort();
  }

  /**
   * Returns list of gatherer names for external querying.
   * @return {Array<string>}
   */
  static getGathererList() {
    const fileList = [
      ...fs.readdirSync(path.join(__dirname, './gather/gatherers')),
      ...fs.readdirSync(path.join(__dirname, './gather/gatherers/seo')).map(f => `seo/${f}`),
      ...fs.readdirSync(path.join(__dirname, './gather/gatherers/dobetterweb'))
          .map(f => `dobetterweb/${f}`),
    ];
    return fileList.filter(f => /\.js$/.test(f) && f !== 'gatherer.js').sort();
  }

  /**
   * Returns list of computed gatherer names for external querying.
   * @return {Array<string>}
   */
  static getComputedGathererList() {
    const filenamesToSkip = [
      'computed-artifact.js', // the base class which other artifacts inherit
      'metrics', // the sub folder that contains metric names
      'metrics/lantern-metric.js', // lantern metric base class
      'metrics/metric.js', // computed metric base class

      // Computed artifacts switching to the new system.
      'new-computed-artifact.js',
      'manifest-values.js',
    ];

    const fileList = [
      ...fs.readdirSync(path.join(__dirname, './gather/computed')),
      ...fs.readdirSync(path.join(__dirname, './gather/computed/metrics')).map(f => `metrics/${f}`),
    ];

    return fileList.filter(f => /\.js$/.test(f) && !filenamesToSkip.includes(f)).sort();
  }

  /**
   * TODO(bckenny): refactor artifact types
   * @return {LH.ComputedArtifacts}
   */
  static instantiateComputedArtifacts() {
    const computedArtifacts = {};
    Runner.getComputedGathererList().forEach(function(filename) {
      // Drop `.js` suffix to keep browserify import happy.
      filename = filename.replace(/\.js$/, '');
      const ArtifactClass = require('./gather/computed/' + filename);
      const artifact = new ArtifactClass(computedArtifacts);
      // define the request* function that will be exposed on `artifacts`
      // @ts-ignore - doesn't have an index signature, so can't be set dynamically.
      computedArtifacts['request' + artifact.name] = artifact.request.bind(artifact);
    });

    return /** @type {LH.ComputedArtifacts} */ (computedArtifacts);
  }

  /**
   * Resolves the location of the specified plugin and returns an absolute
   * string path to the file. Used for loading custom audits and gatherers.
   * Throws an error if no plugin is found.
   * @param {string} plugin
   * @param {string=} configDir The absolute path to the directory of the config file, if there is one.
   * @param {string=} category Optional plugin category (e.g. 'audit') for better error messages.
   * @return {string}
   * @throws {Error}
   */
  static resolvePlugin(plugin, configDir, category) {
    // First try straight `require()`. Unlikely to be specified relative to this
    // file, but adds support for Lighthouse plugins in npm modules as
    // `require()` walks up parent directories looking inside any node_modules/
    // present. Also handles absolute paths.
    try {
      return require.resolve(plugin);
    } catch (e) {}

    // See if the plugin resolves relative to the current working directory.
    // Most useful to handle the case of invoking Lighthouse as a module, since
    // then the config is an object and so has no path.
    const cwdPath = path.resolve(process.cwd(), plugin);
    try {
      return require.resolve(cwdPath);
    } catch (e) {}

    const errorString = 'Unable to locate ' +
        (category ? `${category}: ` : '') +
        `${plugin} (tried to require() from '${__dirname}' and load from '${cwdPath}'`;

    if (!configDir) {
      throw new Error(errorString + ')');
    }

    // Finally, try looking up relative to the config file path. Just like the
    // relative path passed to `require()` is found relative to the file it's
    // in, this allows plugin paths to be specified relative to the config file.
    const relativePath = path.resolve(configDir, plugin);
    try {
      return require.resolve(relativePath);
    } catch (requireError) {}

    throw new Error(errorString + ` and '${relativePath}')`);
  }

  /**
   * Get path to use for -G and -A modes. Defaults to $CWD/latest-run
   * @param {LH.Config.Settings} settings
   * @return {string}
   */
  static _getArtifactsPath(settings) {
    const {auditMode, gatherMode} = settings;

    // This enables usage like: -GA=./custom-folder
    if (typeof auditMode === 'string') return path.resolve(process.cwd(), auditMode);
    if (typeof gatherMode === 'string') return path.resolve(process.cwd(), gatherMode);

    return path.join(process.cwd(), 'latest-run');
  }
}

module.exports = Runner;
