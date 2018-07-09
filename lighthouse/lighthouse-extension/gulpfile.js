// generated on 2016-03-19 using generator-chrome-extension 0.5.4

'use strict';

const fs = require('fs');
// HACK: patch astw before it's required to use acorn with ES2018
// We add the right acorn version to package.json deps, resolve the path to it here,
// and then inject the modified require statement into astw's code.
// see https://github.com/GoogleChrome/lighthouse/issues/5152
const acornPath = require.resolve('acorn');
const astwPath = require.resolve('astw/index.js');
const astwOriginalContent = fs.readFileSync(astwPath, 'utf8');
const astwPatchedContent = astwOriginalContent
  .replace('ecmaVersion: opts.ecmaVersion || 8', 'ecmaVersion: 2018')
  .replace(`require('acorn')`, `require(${JSON.stringify(acornPath)})`);
fs.writeFileSync(astwPath, astwPatchedContent);

const del = require('del');
const gutil = require('gulp-util');
const runSequence = require('run-sequence');
const gulp = require('gulp');
const browserify = require('browserify');
const chromeManifest = require('gulp-chrome-manifest');
const debug = require('gulp-debug');
const eslint = require('gulp-eslint');
const livereload = require('gulp-livereload');
const babel = require('babel-core');
const tap = require('gulp-tap');
const zip = require('gulp-zip');
const gulpReplace = require('gulp-replace');
const header = require('gulp-header');
const LighthouseRunner = require('../lighthouse-core/runner');
const pkg = require('../package.json');

const distDir = 'dist';

const VERSION = pkg.version;
const COMMIT_HASH = require('child_process')
  .execSync('git rev-parse HEAD')
  .toString().trim();

const BANNER = `// lighthouse, browserified. ${VERSION} (${COMMIT_HASH})\n`;

const audits = LighthouseRunner.getAuditList()
    .map(f => '../lighthouse-core/audits/' + f.replace(/\.js$/, ''));

const gatherers = LighthouseRunner.getGathererList()
    .map(f => '../lighthouse-core/gather/gatherers/' + f.replace(/\.js$/, ''));

const computedArtifacts = LighthouseRunner.getComputedGathererList()
    .map(f => '../lighthouse-core/gather/computed/' + f.replace(/\.js$/, ''));

gulp.task('extras', () => {
  return gulp.src([
    'app/*.*',
    'app/_locales/**',
    'app/pages/**',
    '!app/src',
    '!app/.DS_Store',
    '!app/*.json',
    '!app/*.html',
  ], {
    base: 'app',
    dot: true,
  })
  .pipe(debug({title: 'copying to dist:'}))
  .pipe(gulp.dest(distDir));
});

gulp.task('lint', () => {
  return gulp.src([
    'app/src/**/*.js',
    'gulpfile.js',
  ])
  .pipe(eslint())
  .pipe(eslint.format())
  .pipe(eslint.failAfterError());
});

gulp.task('images', () => {
  return gulp.src('app/images/**/*')
  .pipe(gulp.dest(`${distDir}/images`));
});

gulp.task('css', () => {
  return gulp.src('app/styles/**/*.css')
  .pipe(gulp.dest(`${distDir}/styles`));
});

gulp.task('html', () => {
  return gulp.src('app/*.html')
  .pipe(gulp.dest(distDir));
});

gulp.task('chromeManifest', () => {
  const manifestOpts = {
    buildnumber: false,
    background: {
      target: 'scripts/lighthouse-ext-background.js',
    },
  };
  return gulp.src('app/manifest.json')
  .pipe(chromeManifest(manifestOpts))
  .pipe(gulp.dest(distDir));
});

function applyBrowserifyTransforms(bundle) {
  // Fix an issue with imported speedline code that doesn't brfs well.
  return bundle.transform('./fs-transform', {global: true})
  // Transform the fs.readFile etc, but do so in all the modules.
  .transform('brfs', {global: true, parserOpts: {ecmaVersion: 9}})
  // Strip everything out of package.json includes except for the version.
  .transform('package-json-versionify');
}

gulp.task('browserify-lighthouse', () => {
  return gulp.src([
    'app/src/lighthouse-background.js',
    'app/src/lighthouse-ext-background.js',
  ], {read: false})
    .pipe(tap(file => {
      let bundle = browserify(file.path); // , {debug: true}); // for sourcemaps
      bundle = applyBrowserifyTransforms(bundle);

      // scripts will need some additional transforms, ignores and requires…
      bundle.ignore('source-map')
      .ignore('debug/node')
      .ignore('intl')
      .ignore('raven')
      .ignore('mkdirp')
      .ignore('rimraf')
      .ignore('pako/lib/zlib/inflate.js');

      // Don't include the desktop protocol connection.
      bundle.ignore(require.resolve('../lighthouse-core/gather/connections/cri.js'));

      // Prevent the DevTools background script from getting the stringified HTML.
      if (/lighthouse-background/.test(file.path)) {
        bundle.ignore(require.resolve('../lighthouse-core/report/html/html-report-assets.js'));
      }

      // Expose the audits, gatherers, and computed artifacts so they can be dynamically loaded.
      const corePath = '../lighthouse-core/';
      const driverPath = `${corePath}gather/`;
      audits.forEach(audit => {
        bundle = bundle.require(audit, {expose: audit.replace(corePath, '../')});
      });
      gatherers.forEach(gatherer => {
        bundle = bundle.require(gatherer, {expose: gatherer.replace(driverPath, '../gather/')});
      });
      computedArtifacts.forEach(artifact => {
        bundle = bundle.require(artifact, {expose: artifact.replace(corePath, './')});
      });

      // browerify's url shim doesn't work with .URL in node_modules,
      // and within robots-parser, it does `var URL = require('url').URL`, so we expose our own.
      // @see https://github.com/GoogleChrome/lighthouse/issues/5273
      const pathToURLShim = require.resolve('../lighthouse-core/lib/url-shim.js');
      bundle = bundle.require(pathToURLShim, {expose: 'url'});

      // Inject the new browserified contents back into our gulp pipeline
      file.contents = bundle.bundle();
    }))
    .pipe(gulp.dest('app/scripts'))
    .pipe(gulp.dest('dist/scripts'));
});

gulp.task('browserify-other', () => {
  return gulp.src([
    'app/src/popup.js',
  ], {read: false})
    .pipe(tap(file => {
      let bundle = browserify(file.path); // , {debug: true}); // for sourcemaps
      bundle = applyBrowserifyTransforms(bundle);

      // Inject the new browserified contents back into our gulp pipeline
      file.contents = bundle.bundle();
    }))
    .pipe(gulpReplace('__COMMITHASH__', COMMIT_HASH))
    .pipe(gulp.dest('app/scripts'))
    .pipe(gulp.dest(`${distDir}/scripts`));
});

gulp.task('browserify', cb => {
  runSequence('browserify-lighthouse', 'browserify-other', cb);
});

gulp.task('compilejs', () => {
  const opts = {
    compact: true, // Do not include superfluous whitespace characters and line terminators.
    retainLines: true, // Keep things on the same line (looks wonky but helps with stacktraces)
    comments: false, // Don't output comments
    shouldPrintComment: _ => false, // Don't include @license or @preserve comments either
    plugins: [
      'syntax-object-rest-spread',
    ],
    // sourceMaps: 'both'
  };

  return gulp.src([
    'dist/scripts/lighthouse-background.js',
    'dist/scripts/lighthouse-ext-background.js'])
    .pipe(tap(file => {
      const minified = babel.transform(file.contents.toString(), opts).code;
      file.contents = new Buffer(minified);
      return file;
    }))
    .pipe(header(BANNER))
    .pipe(gulp.dest('dist/scripts'));
});

gulp.task('clean', () => {
  return del(['.tmp', distDir, 'app/scripts']).then(paths =>
    paths.forEach(path => gutil.log('deleted:', gutil.colors.blue(path)))
  );
});


gulp.task('watch', ['browserify', 'html'], () => {
  livereload.listen();

  gulp.watch([
    'app/*.html',
    'app/scripts/**/*.js',
    'app/images/**/*',
    'app/styles/**/*',
    'app/_locales/**/*.json',
    'node_modules/lighthouse-core/**/*.js',
  ]).on('change', livereload.reload);

  gulp.watch([
    '*.js',
    'app/src/**/*.js',
    '../lighthouse-core/**/*.js',
  ], ['browserify']);
});

gulp.task('package', function() {
  const manifest = require(`./${distDir}/manifest.json`);
  return gulp.src(`${distDir}/**`)
  .pipe(zip(`lighthouse-${manifest.version}.zip`))
  .pipe(gulp.dest('package'));
});

gulp.task('build', cb => {
  runSequence(
    'lint', 'browserify', 'chromeManifest',
    ['html', 'images', 'css', 'extras'], cb);
});

gulp.task('build:production', cb => {
  runSequence('build', 'compilejs', cb);
});

gulp.task('default', ['clean'], cb => {
  runSequence('build', cb);
});
