 <a name="2.9.1"></a>
# 2.9.1 (2018-02-12)
[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v2.9.0...v2.9.1)


## New Contributors!
Thanks to @GaryJones for [helping us spel gud](https://github.com/GoogleChrome/lighthouse/pull/4485)!


## Core

* REVERT: gather-runner: load a blank data URI, rather than about:blank ([#4518](https://github.com/googlechrome/lighthouse/pull/4518))
* fonts: fix infinite loop ([#4488](https://github.com/googlechrome/lighthouse/pull/4488))
* responsive-images: move images with no dimensions to offscreen audit ([#4487](https://github.com/googlechrome/lighthouse/pull/4487))
* tracing-processor: fix scheduleable task logic ([#4480](https://github.com/googlechrome/lighthouse/pull/4480))
* webfonts: patch fonts gatherer to handle missing font item ([#4465](https://github.com/googlechrome/lighthouse/pull/4465))
* computed-artifact: use deep equality over strict ([#4409](https://github.com/googlechrome/lighthouse/pull/4409))

## Docs & Tests

* docs: examples of combining puppeteer & lighthouse ([#4408](https://github.com/googlechrome/lighthouse/pull/4408))
* appveyor: quietly unzip Chrome to keep appveyor logs cleaner ([ecedb32](https://github.com/googlechrome/lighthouse/commit/ecedb32))
* appveyor: only run tests against master and PRs ([#4484](https://github.com/googlechrome/lighthouse/pull/4484))
* smokehouse: improve smokehouse failure output ([#4482](https://github.com/googlechrome/lighthouse/pull/4482))
* spelling: fix discernable to discernible ([#4485](https://github.com/googlechrome/lighthouse/pull/4485))


 <a name="2.9.0"></a>
# 2.9.0 (2018-02-08)
[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v2.8.0...v2.9.0)

## New Contributors!
Thanks to @FadySamirSadek, @christhompson and @rupesh1 for their first contributions! Awesome stuff.


## New Audits

* mixed-content https upgradeability ([#3953](https://github.com/googlechrome/lighthouse/pull/3953))
* preload: Adding `<link rel=preload>` audit ([#3450](https://github.com/googlechrome/lighthouse/pull/3450))
* font-display: Recommend `font-display: optional` ([#3831](https://github.com/googlechrome/lighthouse/pull/3831))

## CLI

* Add `--extra-headers`: Enable sending additional HTTP Headers ([#3732](https://github.com/googlechrome/lighthouse/pull/3732))
* Add `--mixed-content`: triggers the mixed content audit ([#4441](https://github.com/googlechrome/lighthouse/pull/4441))

## Core

* centralize error strings ([#4280](https://github.com/googlechrome/lighthouse/pull/4280))
* gather-runner: load a branded data URI, rather than `about:blank` ([#4310](https://github.com/googlechrome/lighthouse/pull/4310))
* mobile-friendly: convey MFT covers add'l mobile-friendly auditing ([#4307](https://github.com/googlechrome/lighthouse/pull/4307))
* response-compression: Exclude binary files from auditing ([#4144](https://github.com/googlechrome/lighthouse/pull/4144))
* screenshot-thumbnails: increase size to 120px ([#4383](https://github.com/googlechrome/lighthouse/pull/4383))
* start-url: switch to plain old fetch ([#4301](https://github.com/googlechrome/lighthouse/pull/4301))
* unminified-js: add tolerant option to esprima ([#4338](https://github.com/googlechrome/lighthouse/pull/4338))
* a11y: aXe perf: only collect provided resultTypes ([#4380](https://github.com/googlechrome/lighthouse/pull/4380))

## Deps

* bump metaviewport-parser to 0.2.0 ([#4382](https://github.com/googlechrome/lighthouse/pull/4382))
* snyk: update snyk snapshot ([#4439](https://github.com/googlechrome/lighthouse/pull/4439))

## Misc

* coverage: minimize impact of timeout due to istanbul's instrumentation ([#4396](https://github.com/googlechrome/lighthouse/pull/4396))
* escape usage of '#' in data URIs ([#4381](https://github.com/googlechrome/lighthouse/pull/4381))
* package: scripts don't require "--" for options to be forwarded ([#4437](https://github.com/googlechrome/lighthouse/pull/4437))
* sentry: update sampled errors list ([#4277](https://github.com/googlechrome/lighthouse/pull/4277))
* travis: Only build on Node 6 for PRs. Don't do the `push` build for non-master. ([af8dbd0](https://github.com/googlechrome/lighthouse/commit/af8dbd0))
* Extension: Fix scrollbar from showing on Options page ([#4263](https://github.com/googlechrome/lighthouse/pull/4263))

 <a name="2.8.0"></a>
# 2.8.0 (2018-01-12)
[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v2.7.0...v2.8.0)

## New Contributors!
Thanks to @jianzhoufeng and @nhodges for their first contributions!

## New Audits

* avoid plugins ([#4218](https://github.com/googlechrome/lighthouse/pull/4218))
* rel canonical: document has a valid rel=canonical ([#4163](https://github.com/googlechrome/lighthouse/pull/4163))
* unminified-css: identifies savings from unminified CSS ([#4127](https://github.com/googlechrome/lighthouse/pull/4127))
* unminified-javascript: detect savings from minifcation ([#3950](https://github.com/googlechrome/lighthouse/pull/3950))
* manual SEO audits (structured data & mobile friendly) ([#4108](https://github.com/googlechrome/lighthouse/pull/4108))

## Core

* lifecycle: allow gathering & auditing to run separately ([#3743](https://github.com/googlechrome/lighthouse/pull/3743))
* gather-runner: covert assertPageLoaded into soft failure ([#4048](https://github.com/googlechrome/lighthouse/pull/4048))
* network-recorder: use findNetworkQuietPeriods for networkIdle ([#4102](https://github.com/googlechrome/lighthouse/pull/4102))
* report-generator: extract scoring into separate module ([#4161](https://github.com/googlechrome/lighthouse/pull/4161))
* screenshots: fix getParsedImage of null ([#4189](https://github.com/googlechrome/lighthouse/pull/4189))
* trace-of-tab: error when TracingStartedInPage is missing ([#4164](https://github.com/googlechrome/lighthouse/pull/4164))
* errors-in-console: If exception info is not present use exception text ([#4191](https://github.com/googlechrome/lighthouse/pull/4191))
* estimated-input-latency: remove target reference ([#4069](https://github.com/googlechrome/lighthouse/pull/4069))
* bootup-time: Add 10ms threshold to bootup-time audits ([#4223](https://github.com/googlechrome/lighthouse/pull/4223))
* font-size: make font size artifact serializable ([#4194](https://github.com/googlechrome/lighthouse/pull/4194))

## Report

* a11y: Don't count non-applicable a11y audits toward score ([#4052](https://github.com/googlechrome/lighthouse/pull/4052))
* more attractive table/URL rendering ([#4190](https://github.com/googlechrome/lighthouse/pull/4190))
* improve devtools dark mode rendering ([#4232](https://github.com/googlechrome/lighthouse/pull/4232))
* categories: performance first, then pwa, then the others ([#4095](https://github.com/googlechrome/lighthouse/pull/4095))
* grammar: do not finalize audit titles with a period ([c5f6d05](https://github.com/googlechrome/lighthouse/commit/c5f6d05))
* change 'app' => 'web app' ([29eecce](https://github.com/googlechrome/lighthouse/commit/29eecce))
* Update vulnerability links ([#4198](https://github.com/googlechrome/lighthouse/pull/4198))

## Deps

* bump js-library-detector ([#4086](https://github.com/googlechrome/lighthouse/pull/4086))
* chrome-launcher: Upgrade chrome-launcher to 0.10.2 ([#4192](https://github.com/googlechrome/lighthouse/pull/4192))

## Docs

* readme: update CLI options, output examples. add GAR/Lifecycle examples ([#4185](https://github.com/googlechrome/lighthouse/pull/4185))
* readme: demo flags in example of programmatic use ([#3841](https://github.com/googlechrome/lighthouse/pull/3841))
* lantern: update accuracy data ([#4180](https://github.com/googlechrome/lighthouse/pull/4180))
* extract Release Guide into own docs file ([#4200](https://github.com/googlechrome/lighthouse/pull/4200))
* releasing: document the LH Release Process ([#4201](https://github.com/googlechrome/lighthouse/pull/4201))
* results: describe audit's notApplicable/error ([#4186](https://github.com/googlechrome/lighthouse/pull/4186))

## Extension

* extract a new ext-bg file, splitting extn/devtools usecases ([#4162](https://github.com/googlechrome/lighthouse/pull/4162))

## Tests

* remove global timeout, set timeouts individually ([#4224](https://github.com/googlechrome/lighthouse/pull/4224))
* trace-parser: use fs over require ([#4209](https://github.com/googlechrome/lighthouse/pull/4209))
* travis: force use of GCE, remove dSE calls ([#4222](https://github.com/googlechrome/lighthouse/pull/4222))
* travis: remove upload artifacts ([#4219](https://github.com/googlechrome/lighthouse/pull/4219))
* travis: test on Node 9, drop testing on Node 7 ([#4181](https://github.com/googlechrome/lighthouse/pull/4181))

## Misc

* remove CLI's legacy domhtml output ([#4176](https://github.com/googlechrome/lighthouse/pull/4176))
* viewer: retain /plots/ when deploying new viewer version ([#4079](https://github.com/googlechrome/lighthouse/pull/4079))


 <a name="2.7.0"></a>
# 2.7.0 (2017-12-14)
[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v2.6.0...v2.7.0)

## New Contributors!
Thanks to @sanjsanj, @dennismartensson, @daannijkamp, @crimeminister!

## New Audits

* accessibility: add accessibility manual audits ([#3834](https://github.com/googlechrome/lighthouse/pull/3834))
* font-size: legible font sizes audit ([#3533](https://github.com/googlechrome/lighthouse/pull/3533))
* hreflang: document has a valid hreflang code ([#3815](https://github.com/googlechrome/lighthouse/pull/3815))

## CLI

* compile out remaining typescript; add tsc type checking via jsdocs ([#3747](https://github.com/googlechrome/lighthouse/pull/3747))
* sentry: handle configstore errors; don't enabling error reporting ([#3878](https://github.com/googlechrome/lighthouse/pull/3878))

## Core

* config: show SEO audits in the UI ([#4057](https://github.com/googlechrome/lighthouse/pull/4057))
* critical-request-chains: corrected help text ([#4009](https://github.com/googlechrome/lighthouse/pull/4009))
* devtools-timeline-model: extract model generation to a computed artifact...    ([46f6d2a](https://github.com/googlechrome/lighthouse/commit/46f6d2a))
* driver: add driver.wsEndpoint() ([#3864](https://github.com/googlechrome/lighthouse/pull/3864))
* gather-runner: fix headless chrome UA check ([#4019](https://github.com/googlechrome/lighthouse/pull/4019))
* noopener-audit: Only test http/https links ([#4036](https://github.com/googlechrome/lighthouse/pull/4036))
* optimized-images: skip mismatched mimeTypes ([#4045](https://github.com/googlechrome/lighthouse/pull/4045))
* seo: consistent help text links ([#3901](https://github.com/googlechrome/lighthouse/pull/3901))
* uses-webp: tweak text to be more next-gen focused ([#3985](https://github.com/googlechrome/lighthouse/pull/3985))
* vulnerable-libs: add fix for recovering from bad versions ([#3932](https://github.com/googlechrome/lighthouse/pull/3932))
* web-inspector: keep all experiments disabled, fixing conflict when running in DevTools ([#4010](https://github.com/googlechrome/lighthouse/pull/4010))

## Deps

* Bump ws to 3.3.2 ([#3949](https://github.com/googlechrome/lighthouse/pull/3949))

## Docs

* error-reporting: improve clarity for opt-out folks ([#3876](https://github.com/googlechrome/lighthouse/pull/3876))
* add lantern accuracy data ([#3826](https://github.com/googlechrome/lighthouse/pull/3826))
* fox mobile device testing example ([#3887](https://github.com/googlechrome/lighthouse/pull/3887))
* readme: Add Greta Lighthouse to list of Integrations ([#4031](https://github.com/googlechrome/lighthouse/pull/4031))

## Report

* perf-audits: adjust presentation of runtime cost audits ([#4020](https://github.com/googlechrome/lighthouse/pull/4020))
* warnings: warn only if using an old headless ([#4021](https://github.com/googlechrome/lighthouse/pull/4021))

## Tests

* smokehouse: adopt URLSearchParams for querystring manipulation ([#3941](https://github.com/googlechrome/lighthouse/pull/3941))

## Misc

* changelog: tweaks to changelog template and instructions ([#3849](https://github.com/googlechrome/lighthouse/pull/3849))
* changelog: minor changelog generation usability bumps ([#3847](https://github.com/googlechrome/lighthouse/pull/3847))
* codeowners: represent brendan's leave ([#3991](https://github.com/googlechrome/lighthouse/pull/3991))
* error-reporting: report unhandled promise rejections, take 2 ([#3930](https://github.com/googlechrome/lighthouse/pull/3930))
* error-reporting: tweak sentry levels and ignore list ([#3890](https://github.com/googlechrome/lighthouse/pull/3890))
* error-reporting: report unhandled promise rejections ([#3886](https://github.com/googlechrome/lighthouse/pull/3886))
* Update wording ([6036117](https://github.com/googlechrome/lighthouse/commit/6036117))

 <a name="2.6.0"></a>
# 2.6.0 (2017-11-18)
[Full Changelog](https://github.com/googlechrome/lighthouse/compare/v2.5.1...v2.6.0)

## New Contributors!
@peterjanes, @stevector, @AkshayIyer12, @manekinekko, @alekseykulikov, @coliff, @emazzotta

## New Audits

* `redirects`: avoid page redirects ([#3308](https://github.com/googlechrome/lighthouse/pull/3308))
* `link-text`: descriptive anchor text audit ([#3490](https://github.com/googlechrome/lighthouse/pull/3490))
* `is-crawlable`: page is blocked from indexing ([#3657](https://github.com/googlechrome/lighthouse/pull/3657))
* `bootup-time`: JS bootup time per script ([#3563](https://github.com/googlechrome/lighthouse/pull/3563))
* `uses-long-cache-ttl`: detects savings from leveraging caching ([#3531](https://github.com/googlechrome/lighthouse/pull/3531))
* `mainthread-work-breakdown`: audit for page-execution timings ([#3520](https://github.com/googlechrome/lighthouse/pull/3520))

## CLI

* do not double quote `chromeFlags` ([#3775](https://github.com/googlechrome/lighthouse/pull/3775))

## Core

* `aspect-ratio`: skip aspect ratio audit for svg ([#3722](https://github.com/googlechrome/lighthouse/pull/3722))
* audit: Ignore `href=javascript:.*` for `rel=noopener` audit ([#3574](https://github.com/googlechrome/lighthouse/pull/3574))
* bootup-time: refactor task/group iteration ([33b1574](https://github.com/googlechrome/lighthouse/commit/33b1574))
* config: add silent seo audits to default config ([#3582](https://github.com/googlechrome/lighthouse/pull/3582))
* config: re-weight a11y scores based on severity and frequency ([#3515](https://github.com/googlechrome/lighthouse/pull/3515))
* config: add category weight to perf config ([#3529](https://github.com/googlechrome/lighthouse/pull/3529))
* `critical-request-chains`: Remove iframe as Critical Request ([#3583](https://github.com/googlechrome/lighthouse/pull/3583))
* `dependency-graph`: add acyclic check ([#3592](https://github.com/googlechrome/lighthouse/pull/3592))
* `devtools-model`: fix missing `Runtime.experiments` object ([#3514](https://github.com/googlechrome/lighthouse/pull/3514))
* driver: increase default timeout to 45s ([#3741](https://github.com/googlechrome/lighthouse/pull/3741))
* driver: use execution context isolation when necessary ([#3500](https://github.com/googlechrome/lighthouse/pull/3500))
* emulation: remove use of deprecated `Emulation.setVisibleSize` ([#3536](https://github.com/googlechrome/lighthouse/pull/3536))
* `errors-in-console`: include runtime exceptions ([#3494](https://github.com/googlechrome/lighthouse/pull/3494))
* `image-aspect-ratio`: pass audit when no images are missized ([#3552](https://github.com/googlechrome/lighthouse/pull/3552))
* `image-usage`: add null check for parentElement ([#3779](https://github.com/googlechrome/lighthouse/pull/3779))
* add error reporting (CLI only) ([#2420](https://github.com/googlechrome/lighthouse/pull/2420))
* meta tag gatherers: meta tag search should be case-insensitive ([#3729](https://github.com/googlechrome/lighthouse/pull/3729))
* `predictive-perf`: predict FCP ([#3730](https://github.com/googlechrome/lighthouse/pull/3730))
* `predictive-perf`: refactor simulation logic ([#3489](https://github.com/googlechrome/lighthouse/pull/3489))
* `response-compression`: add transferSize sanity check ([#3606](https://github.com/googlechrome/lighthouse/pull/3606))
* record top-level warnings in LHR and display in report ([#3692](https://github.com/googlechrome/lighthouse/pull/3692))
* remove useless `optimalValue` ([#3774](https://github.com/googlechrome/lighthouse/pull/3774))
* `speed-index`: only compute perceptual speed index ([#3845](https://github.com/googlechrome/lighthouse/pull/3845))
* tags blocking first-paint: exclude script type=module ([#3676](https://github.com/googlechrome/lighthouse/pull/3676))

## Docs

* `changelog-generator`: Generate changelogs ([#3632](https://github.com/googlechrome/lighthouse/pull/3632))
* scoring: create documentation on scoring ([#3436](https://github.com/googlechrome/lighthouse/pull/3535))
* `bug-labels.md`: Create bug-labels.md ([#3522](https://github.com/googlechrome/lighthouse/pull/3535), [#3525](https://github.com/googlechrome/lighthouse/pull/3525), [#3535](https://github.com/googlechrome/lighthouse/pull/3535))
* contributing: pr title guidelines ([#3590](https://github.com/googlechrome/lighthouse/pull/3590))
* correct capitalization of GitHub ([#3669](https://github.com/googlechrome/lighthouse/pull/3669))
* add results object explainer ([#3495](https://github.com/googlechrome/lighthouse/pull/3495))
* `new-audits.md`: Principles and guidance for new audits ([#3617](https://github.com/googlechrome/lighthouse/pull/3617))
* readme: add MagicLight WebBLE integration ([#3613](https://github.com/googlechrome/lighthouse/pull/3613))
* readme: add Treo to the list of integrations ([#3484](https://github.com/googlechrome/lighthouse/pull/3484))
* throttling: because `comcast` throttles the websocket ([bedb9a1](https://github.com/googlechrome/lighthouse/commit/bedb9a1))

## Report

* Add print summary and print expanded options ([#3578](https://github.com/googlechrome/lighthouse/pull/3578))
* `image-aspect-ratio`: fix audit description ([#3843](https://github.com/googlechrome/lighthouse/pull/3843))
* redirects: reformat results, incl all requests and wasted time, ([#3492](https://github.com/googlechrome/lighthouse/pull/3492))
* `render-blocking-stylesheets`: improve actionability of helpText ([#3544](https://github.com/googlechrome/lighthouse/pull/3544))

## Tests

* update `eslint` (and goog config) to latest ([#3396](https://github.com/googlechrome/lighthouse/pull/3396))
* `eslint`: use `--quiet` flag rather than `--silent` ([#3491](https://github.com/googlechrome/lighthouse/pull/3491))
* smokehouse: add long task to `byte-efficiency` tester to deflake appveyor ([#3804](https://github.com/googlechrome/lighthouse/pull/3804))
* smokehouse: disable multiple shadow root deprecation test ([#3695](https://github.com/googlechrome/lighthouse/pull/3695))
* smokehouse: Passive event listener violation doesn't report on passive:false now ([#3498](https://github.com/googlechrome/lighthouse/pull/3498))
* `web-inspector`: add test for `setImmediate` polyfill ([#3670](https://github.com/googlechrome/lighthouse/pull/3670))

## Misc

* codereview: add CODEOWNERS file ([#3591](https://github.com/googlechrome/lighthouse/pull/3591))
* Bump `chrome-launcher` to 0.8.1 ([#3479](https://github.com/googlechrome/lighthouse/pull/3479))
* web-inspector: fall back to page's `Runtime` and `queryParam()` ([#3497](https://github.com/googlechrome/lighthouse/pull/3497))
* use undated Apache 2 LICENSE file ([#3700](https://github.com/googlechrome/lighthouse/pull/3700))
* audits: removed unused audit `meta.category` ([#3554](https://github.com/googlechrome/lighthouse/pull/3554))
* changelog: add commitlint config (for commitlintbot) ([21e25aa](https://github.com/googlechrome/lighthouse/commit/21e25aa))
* `commitizen`: new-audit => new_audit ([#3534](https://github.com/googlechrome/lighthouse/pull/3534))
* jsconfig: Enable type checking for JavaScript ([#3589](https://github.com/googlechrome/lighthouse/pull/3589))
* logos: provide svg logo as png ([8b3d7f0](https://github.com/googlechrome/lighthouse/commit/8b3d7f0))
* Fix minor grammatical error ([#3638](https://github.com/googlechrome/lighthouse/pull/3638))
* add `cz-customizable` to establish a commit message convention ([#3499](https://github.com/googlechrome/lighthouse/pull/3499))
* typo: fix typo in `image-aspect-ratio` audit ([#3513](https://github.com/googlechrome/lighthouse/pull/3513))

<a name="2.5.1"></a>
# 2.5.1 (2017-10-06)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v2.5.0...v2.5.1)

* Fix compat with DevTools via Runtime mock object

<a name="2.5.0"></a>
# 2.5.0 (2017-10-04)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v2.4.0...v2.5.0)

## New Contributors!
* Huge contributions from new contributors with all-new audits, Chrome launching improvements, and more complete documentation. Thanks to @mikecardwell, @rviscomi, @siddharthkp, @ThisIzKp, @rootulp, @kdzwinel, @LCartwright, @siteriaitaliana, @vinamratasingal, @alanyin0322, and @tkadlec!

## New audits
* `image-aspect-ratio` best practice audit (#3084)
* `time-to-first-byte` perf audit (last fixes and now enabled) (#2231)
* `errors-in-console` best practice audit (#2836)
* `no-vulnerable-libraries` best practice audit (#2372)

### New audits in [full-config](https://github.com/GoogleChrome/lighthouse/blob/master/lighthouse-core/config/full-config.js)
* `unused-javascript` coverage audit (#3085)

### New audits in new [SEO config](https://github.com/GoogleChrome/lighthouse/blob/master/lighthouse-core/config/seo.js) (#2999)
* `meta-description` SEO audit (#3227)
* `http-status-code` SEO audit (#3311)

## [FastMode](https://github.com/GoogleChrome/lighthouse/issues/2703)
* add `predictive-perf` shell and base audit (#2720, #3189)
* add network estimation (#3187, cf5638d6)
* add CPU estimation (#3162, 18837dad, 5b459a1e)

## Core
* update `unused-css-rules` audit to support new coverage format (full-config only) (#2518)
* perf: use `Audits.getEncodedResponse` in `optimized-images` audit (#3087)
* don't wait for `Page.navigate` to resolve to listen for page load (#3413)
* include `v8.execute` trace event category (ab6aabde)

## Report
* clarify wording of category descriptions (#3000)
* add a linked-text type to details renderer (#3165)
* fix: tame greedy markdown-link regex (#3312)
* fix: prevent `\u2028` and `\u2029` from breaking the report (#3442)
* improve descriptions for a11y audits (#3474)

## Testing
* smokehouse: adjust `unused-css-rules` audit expectations (#3036)
* bundlesize: fix reporting in github UI (ede05c0a, #3392)
* smokehouse: add basic smoke test for SEO audits (#3267)
* travis: unset `\_JAVA_OPTIONS` for DevTools' `compile_frontend.py` test (#3354)
* eslint: enable `comma-dangle` rule, fix all new errors (#3324)
* smokehouse: add `time-to-first-byte` smoke test (#3310)

## Docs
* import [audit glossary](https://github.com/GoogleChrome/lighthouse/blob/190b8abb9c39d469c09aa167e6a72fa9e01740d1/docs/architecture.md#components--terminology) from SEO doc (#3207)
* add [advanced throttling guide](https://github.com/GoogleChrome/lighthouse/blob/190b8abb9c39d469c09aa167e6a72fa9e01740d1/docs/throttling.md) (#3205)
* readme: reduce minimum Chrome version to current stable (#3287, 5382f37c)
* readme: add explanation for [Lighthouse Integrations](https://github.com/GoogleChrome/lighthouse/blob/190b8abb9c39d469c09aa167e6a72fa9e01740d1/readme.md#lighthouse-integrations) section (#3418)
contributing.md: fix grammatical errors (#3419)

## CLI
* add [`blockedUrlPatterns` support to CLI](https://github.com/GoogleChrome/lighthouse/blob/190b8abb9c39d469c09aa167e6a72fa9e01740d1/readme.md#cli-options) (#3125)
* adopt `yargsParser` directly for `chromeFlags` parsing (#3408)

## Chrome-launcher
_chrome-launcher has moved to a [standalone npm package](https://npmjs.org/package/chrome-launcher)_
* docs: add changelog (#2987)
* improve `SIGINT` handling (#2959)
* mute audio (#3028)
* rev to 0.6.0 (ec38bcd9, 970d3cad, e9d569c5, 5e9a3aba)
* handle errors inside `spawnPromise` (#2939)
* switch to using standalone package (#3410)

## Misc
* apply small license header to remaining files (#3309)
* fix: remove redundant `lighthouse-logger/` from npm package (#3411)
* remove old `perfX` code (#3431)
* update plots-config to use newer quiet parameters (#3464)
* collect even malformed error messages in extension (#3473)

## Deps
* upgrade `bundlesize` to 0.13.2 (#3122)
* upgrade `axe-core` to 2.4.1 (#3284, #3320)
* upgrade `ws` to 1.1.2 (2d2206b8)
* add yargs-parser at 7.0.0 (#3477, #3478)

<a name="2.4.0"></a>
# 2.4.0 (2017-08-14)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v2.3.0...v2.4.0)

## Core
* Refactor error throwing from assertPageLoaded (#2785) ([07817f9](https://github.com/GoogleChrome/lighthouse/commit/07817f9))
* refactor: cleanup unused waitFor properties (#2716) ([9d8a32f](https://github.com/GoogleChrome/lighthouse/commit/9d8a32f))
* All audits must specify helpText and failureDescription (#2737) ([db3f324](https://github.com/GoogleChrome/lighthouse/commit/db3f324))
*  "shrink-to-fit" property in "viewport" meta is no longer invalid (#2863) ([e1a04dd](https://github.com/GoogleChrome/lighthouse/commit/e1a04dd))
* driver: add compat comment on PerfObserver GC bug ([d7ffec1](https://github.com/GoogleChrome/lighthouse/commit/d7ffec1))
* emulation comment: can remove injectedTouchEventsFunction in October (#2889) ([a6b71c9](https://github.com/GoogleChrome/lighthouse/commit/a6b71c9))
* Ignoring other extension assets in request compression audit (#2733) ([428f637](https://github.com/GoogleChrome/lighthouse/commit/428f637))
* fix(anchors-with-no-rel): ignore same origin links (#2749) ([78ec647](https://github.com/GoogleChrome/lighthouse/commit/78ec647))
* add flag to FMP to indicate if it fell back to FMP candidate (#2851) ([46d9ba7](https://github.com/GoogleChrome/lighthouse/commit/46d9ba7))
* fix(script-blocking-first-paint): ignore latent resources (#2721) ([ac99084](https://github.com/GoogleChrome/lighthouse/commit/ac99084))
* Include version and commit in lighthouse-background.js bundle (#2236) ([7fe3574](https://github.com/GoogleChrome/lighthouse/commit/7fe3574))


## Report
* link all a11y audits to 2.2 aXe docs (#2709) ([924e1f1](https://github.com/GoogleChrome/lighthouse/commit/924e1f1))
* Update consistently-interactive.js helpText (#2740) ([6f7bf29](https://github.com/GoogleChrome/lighthouse/commit/6f7bf29))
* Update first-interactive.js helpText (#2739) ([a829811](https://github.com/GoogleChrome/lighthouse/commit/a829811))
* Report: add lighthouse query param to axe helpText links (#2767) ([4b9cbb5](https://github.com/GoogleChrome/lighthouse/commit/4b9cbb5))
* Report: Close export dropdown when printing (#2914) ([a45ece8](https://github.com/GoogleChrome/lighthouse/commit/a45ece8)), closes [#2914](https://github.com/GoogleChrome/lighthouse/issues/2914)
* report: draw metric lines over the screenshots. (#2848) ([5832761](https://github.com/GoogleChrome/lighthouse/commit/5832761))
* fix(report): proper arrow state and consistent capitalization (#2750) ([7c461bf](https://github.com/GoogleChrome/lighthouse/commit/7c461bf))

## Testing
* testing: prune smokehouse configs to improve testing perf (#2732) ([e72483b](https://github.com/GoogleChrome/lighthouse/commit/e72483b))

## CLI
* Fix: Basic chrome-flags parsing for embedded quotes (#2754) ([78a8bd7](https://github.com/GoogleChrome/lighthouse/commit/78a8bd7))
* Add hostname CLI flag and option for CriConnection (#2728) ([0455283](https://github.com/GoogleChrome/lighthouse/commit/0455283)), closes [GoogleChrome/lighthouse#2727](https://github.com/GoogleChrome/lighthouse/issues/2727)

## Chrome launcher
* launcher: clarify priority of chromePath options ([494f991](https://github.com/GoogleChrome/lighthouse/commit/494f991))
* chrome-launcher: add support for finding Chromium on Linux (#2950) ([1c11021](https://github.com/GoogleChrome/lighthouse/commit/1c11021))
* launcher: support enabling extension loading (#2650) ([c942d17](https://github.com/GoogleChrome/lighthouse/commit/c942d17))
* [chrome-launcher] Publish type definitions instead of source TypeScript files (#2898) ([391e204](https://github.com/GoogleChrome/lighthouse/commit/391e204))

## Misc
* Lowercase fix for "service worker" (#2729) ([15068bd](https://github.com/GoogleChrome/lighthouse/commit/15068bd)), closes [#2729](https://github.com/GoogleChrome/lighthouse/issues/2729)
* open extension's report in new window. (fix for incognito) (#2734) ([934aa42](https://github.com/GoogleChrome/lighthouse/commit/934aa42)), closes [#2734](https://github.com/GoogleChrome/lighthouse/issues/2734)
* pass --enable-extensions on from manual-chrome-launcher (#2735) ([37fd38c](https://github.com/GoogleChrome/lighthouse/commit/37fd38c))
* Update lighthouse-logger location in readme (#2867) ([1347b15](https://github.com/GoogleChrome/lighthouse/commit/1347b15))
* readme: added CHROME_PATH description from CLI help (#2757) ([af003d4](https://github.com/GoogleChrome/lighthouse/commit/af003d4))
* readme: update example using deprecated `LIGHTHOUSE_CHROMIUM_PATH` (#2929) ([de408ad](https://github.com/GoogleChrome/lighthouse/commit/de408ad))
* docs: Add a changelog.md (#2986) ([626ce68](https://github.com/GoogleChrome/lighthouse/commit/626ce68))
* Viewer: log expected URL (#2724) ([6478f15](https://github.com/GoogleChrome/lighthouse/commit/6478f15))
* Fix eslint max length in github-api.js (#2730) ([1ca40de](https://github.com/GoogleChrome/lighthouse/commit/1ca40de)), closes [#2730](https://github.com/GoogleChrome/lighthouse/issues/2730)
* add license file to launcher package. (#2849) ([8bc6d18](https://github.com/GoogleChrome/lighthouse/commit/8bc6d18))
* Add license to lighthouse-logger. (#2846) ([367ea7a](https://github.com/GoogleChrome/lighthouse/commit/367ea7a))
* Clarification of hasOfflineStartUrl rule (#2775) ([7097d5c](https://github.com/GoogleChrome/lighthouse/commit/7097d5c))
* gulpfile. add commented out lines for sourcemap generation. ([6f53ab9](https://github.com/GoogleChrome/lighthouse/commit/6f53ab9))


<a name="2.3.0"></a>
# 2.3.0 (2017-07-20)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v2.2.0...v2.3.0)

* test: fix clang-format error (#2691) ([fedc76a](https://github.com/GoogleChrome/lighthouse/commit/fedc76a)), closes [#2691](https://github.com/GoogleChrome/lighthouse/issues/2691)
* test(format-helpers): TZ independent check (#2653) ([56e8f9b](https://github.com/GoogleChrome/lighthouse/commit/56e8f9b))
* add bundlesize to track our build size (#2676) ([5172ff7](https://github.com/GoogleChrome/lighthouse/commit/5172ff7))
* Add failureDescription to audit. display on fail (#2478) ([b0df777](https://github.com/GoogleChrome/lighthouse/commit/b0df777))
* Added CHROME_PATH to readme (#2694) ([5728695](https://github.com/GoogleChrome/lighthouse/commit/5728695))
* bump extension to 2.2.1 ([e5f3a7b](https://github.com/GoogleChrome/lighthouse/commit/e5f3a7b))
* Expose LHR to modules consuming cli/run.ts (#2654) ([9c0c078](https://github.com/GoogleChrome/lighthouse/commit/9c0c078))
* Fix chrome finder on linux/osx when process.env isn't populated (#2687) ([112c2c7](https://github.com/GoogleChrome/lighthouse/commit/112c2c7)), closes [#2687](https://github.com/GoogleChrome/lighthouse/issues/2687)
* fix launcher w/ arbitrary flags (#2670) ([8c9724e](https://github.com/GoogleChrome/lighthouse/commit/8c9724e)), closes [#2670](https://github.com/GoogleChrome/lighthouse/issues/2670)
* Gather-runner: Get useragent before emulating (#2715) ([f8c1dc1](https://github.com/GoogleChrome/lighthouse/commit/f8c1dc1))
* launcher to 0.3.1 ([2004363](https://github.com/GoogleChrome/lighthouse/commit/2004363))
* launcher to 0.3.2 ([fc48c8a](https://github.com/GoogleChrome/lighthouse/commit/fc48c8a))
* remove duplicate url check in core/index.js (#2658) ([425b5fb](https://github.com/GoogleChrome/lighthouse/commit/425b5fb))
* track number of completed requests in total-byte-weight extendedInfo (#2697) ([eecf525](https://github.com/GoogleChrome/lighthouse/commit/eecf525))
* tweak codecov config. ([e9d5a0f](https://github.com/GoogleChrome/lighthouse/commit/e9d5a0f))
* update "page load fast enough on 3G" helpText ([1d0d4ff](https://github.com/GoogleChrome/lighthouse/commit/1d0d4ff))
* Update the helpText in uses-webp-images.js (#2681) ([b93ca14](https://github.com/GoogleChrome/lighthouse/commit/b93ca14))
* update uses-optimized-images.js helpText (#2669) ([5b41ebc](https://github.com/GoogleChrome/lighthouse/commit/5b41ebc))
* update webapp-install-banner.js helpText (#2622) ([a2e4e1e](https://github.com/GoogleChrome/lighthouse/commit/a2e4e1e))
* upgrade rimraf to latest (#2641) ([ef08106](https://github.com/GoogleChrome/lighthouse/commit/ef08106))
* v2.3.0 ([232c99b](https://github.com/GoogleChrome/lighthouse/commit/232c99b))
* perf(uses-http2): check protocol first (#2701) ([bbe2191](https://github.com/GoogleChrome/lighthouse/commit/bbe2191))
* feat: add base fast mode config (#2702) ([5d61056](https://github.com/GoogleChrome/lighthouse/commit/5d61056))
* feat(computed-artifact): support arbitrarily many inputs (#2705) ([4143aac](https://github.com/GoogleChrome/lighthouse/commit/4143aac))
* refactor: extract computeLogNormalScore method (#2710) ([648cce6](https://github.com/GoogleChrome/lighthouse/commit/648cce6))
* refactor(StartUrl): switch from error to debugString object (#2549) ([64b015e](https://github.com/GoogleChrome/lighthouse/commit/64b015e))
* docs(config): add explanations for gatherers property (#2704) ([76cdb54](https://github.com/GoogleChrome/lighthouse/commit/76cdb54))
* docs(readme): link to config docs from readme ([98d85cc](https://github.com/GoogleChrome/lighthouse/commit/98d85cc))
* Report: improvements w/ new density... (#2706) ([97c7170](https://github.com/GoogleChrome/lighthouse/commit/97c7170))
* Report: Updated styles (#2297) ([a9867d5](https://github.com/GoogleChrome/lighthouse/commit/a9867d5))
* fix(config): keep defaultPass on rebuild (#2671) ([78e761a](https://github.com/GoogleChrome/lighthouse/commit/78e761a))
* fix(domstats): enable DOM domain (#2640) ([3ee5215](https://github.com/GoogleChrome/lighthouse/commit/3ee5215))
* fix(driver): prevent PerfObserver from being garbage collected (#2682) ([36c2df5](https://github.com/GoogleChrome/lighthouse/commit/36c2df5))
* launcher: log the specific chrome spawn command. ([3f143b1](https://github.com/GoogleChrome/lighthouse/commit/3f143b1))
* launcher: nuke 'as string' ([a6bbcab](https://github.com/GoogleChrome/lighthouse/commit/a6bbcab))
* launcher: support custom port via chrome-debug binary (#2644) ([6df6b0e](https://github.com/GoogleChrome/lighthouse/commit/6df6b0e))
* cli: remove --select-chrome,--skip-autolaunch. Support CHROME_PATH env  (#2659) ([41df647](https://github.com/GoogleChrome/lighthouse/commit/41df647))
* connection: log the protocol error data field (#2645) ([d587357](https://github.com/GoogleChrome/lighthouse/commit/d587357))
* plots: dashboard - identify variance over lighthouse versions (#2520) ([9561330](https://github.com/GoogleChrome/lighthouse/commit/9561330))



<a name="2.2.1"></a>
## 2.2.1 (2017-06-30)

* v2.2.1 ([187c6d5](https://github.com/GoogleChrome/lighthouse/commit/187c6d5))
* fix(extension): Restore status logging to extension (#2629) ([fe99052](https://github.com/GoogleChrome/lighthouse/commit/fe99052))



<a name="2.2.0"></a>
# 2.2.0 (2017-06-30)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v2.1.0...v2.2.0)

### `chrome-launcher` shipped as a standalone module
The [`chrome-launcher`](https://www.npmjs.com/package/chrome-launcher) module is now on npm. Great for working with [Chrome headless](https://developers.google.com/web/updates/2017/04/headless-chrome).

### Lighthouse viewer updated for Lighthouse 2.0
The [Lighthouse Report Viewer](https://googlechrome.github.io/lighthouse/viewer/) can now view data from Lighthouse 2.x, including JSON saved from the CLI, exported from the Chrome extension or DevTools Audits panel. (#2521)

### New contributors
Thanks to Katie Hempenius, Artur M, Kevin Farrugia, Piper Chester, Robin Drexler, and Mike Deverell. Due to the effort of these developers we now have an audit for checking for paste-blocked password fields, unified usage of toLocaleString(), a correct gulp recipe, a well-functioning chrome-launcher module, and improved clarity in the audit test descriptions.  **We truly appreciate all these improvements!**

-------------

Since 2.1.0 we've had a number of other features, fixes, and improvements. Presented by category:

#### Report
* use locale string for all our number output (#2553)
* fixes viewer CSS specificity and event listener removal (#2575)
* freshen up audit helpText
* Report: don't display score gauge header if there's only one. (#2261)
* Remove report v1 and dependencies (#2596)
* better debug message for missing network times (#2451)
* spelling fix in link-name audit (#2496)
* Theme Color wording fixes (#2466)

#### Audit + Gather
* fix(driver): wait for CPU idle via clientside perfObserver (#2473)
* Remove /deep/ usage as it is being deprecated (#2371)
* Remove BOM encoding from manifest (#2175)
* Throw better error message when url is not auditable (#2527)
* Critical Request Chain audit: fix incorrect transfersize. (#2610)
* domstats: prevent infinite loop (#2561)

#### Performance & Traces
* docs: add trace interpretation guide (#2472)
* use a stable sort for trace events (#2415)
* remove old TTI code (#2452)
* refactor(trace-of-tab): return timestamps in microseconds (#2454)
* add streaming json parser
* add streaming trace writer in saveAssets

#### Plots
* better support power use cases (#2464)
* disable flaky smoke test (#2606)
* smoke test for happy case (#2411)


#### Configurability
* feat(config): add audit blacklist support (#2499)
* feat(config): add extends lighthouse:full (#2557)
* docs(config): add config documentation (#2592)

#### Misc
* Add script to capture travis build durations (#2541)
* Expose launch/lighthouse/report flow to consuming modules (#2602)
* harden security of static-server (#2563)
* is-on-https: check record.protocol for blob urls (#2538)
* LH implementation of LogNormalDistribution; remove traceviewer (#2456)
* move computed artifacts dependent on networkRecords to devtoolsLog (#2467)
* Enable typescript coverage metrics for coveralls.


<a name="2.1.0"></a>
# 2.1.0 (2017-06-07)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v2.0.0...v2.1.0)

**Fixed bugs:**

- Friendlier message for multiple tabs to same origin [\#2299](https://github.com/GoogleChrome/lighthouse/issues/2299)
- de-jsonify default.js [\#2445](https://github.com/GoogleChrome/lighthouse/pull/2445)
- Compact the license headers [\#2444](https://github.com/GoogleChrome/lighthouse/pull/2444)
- update smokehouse PWA expectations [\#2443](https://github.com/GoogleChrome/lighthouse/pull/2443)
- Disable the dismissJavaScriptDialogs smoketest.  [\#2437](https://github.com/GoogleChrome/lighthouse/pull/2437)
- Large DOM size increases memory usage, not memory \(fix wording\) [\#2433](https://github.com/GoogleChrome/lighthouse/pull/2433) ([khempenius](https://github.com/khempenius))
- Fix US-centric wording [\#2432](https://github.com/GoogleChrome/lighthouse/pull/2432) ([khempenius](https://github.com/khempenius))
- add units to LoadFastEnough debug string [\#2427](https://github.com/GoogleChrome/lighthouse/pull/2427)
- remove aggregations [\#2426](https://github.com/GoogleChrome/lighthouse/pull/2426)
- link to "offscreen images" reference [\#2417](https://github.com/GoogleChrome/lighthouse/pull/2417) ([kaycebasques](https://github.com/kaycebasques))
- readme: add notes on per runs [\#2410](https://github.com/GoogleChrome/lighthouse/pull/2410)
- Updated readme to add port number when testing a site with authentication [\#2409](https://github.com/GoogleChrome/lighthouse/pull/2409) ([mikerhyssmith](https://github.com/mikerhyssmith))
- Update optimized-images overview jsdoc [\#2408](https://github.com/GoogleChrome/lighthouse/pull/2408)
- fix\(report\): footer height on small viewports [\#2400](https://github.com/GoogleChrome/lighthouse/pull/2400)
- rmtraceviewer branch: reduce -\> for..of [\#2399](https://github.com/GoogleChrome/lighthouse/pull/2399)
- feat: tooltips for all formatted URLs [\#2398](https://github.com/GoogleChrome/lighthouse/pull/2398)
- travis: include node 8.0.0 [\#2395](https://github.com/GoogleChrome/lighthouse/pull/2395)
- fixed incorrect comments [\#2392](https://github.com/GoogleChrome/lighthouse/pull/2392) ([mixed](https://github.com/mixed))
- Appveyor fixes: fresh yarn, only node6 build [\#2382](https://github.com/GoogleChrome/lighthouse/pull/2382)
- Run npm install/build tasks in parallel [\#2381](https://github.com/GoogleChrome/lighthouse/pull/2381)
- Re-enable AppVeyor support. [\#2380](https://github.com/GoogleChrome/lighthouse/pull/2380) ([XhmikosR](https://github.com/XhmikosR))
- Fix icons on firefox by decoding svg imgs [\#2378](https://github.com/GoogleChrome/lighthouse/pull/2378) ([ev1stensberg](https://github.com/ev1stensberg))
- revise package.json script to the correct folder [\#2373](https://github.com/GoogleChrome/lighthouse/pull/2373) ([ev1stensberg](https://github.com/ev1stensberg))
- update help text for a11y audits [\#2370](https://github.com/GoogleChrome/lighthouse/pull/2370) ([kaycebasques](https://github.com/kaycebasques))
- fix: deprecate old HTML report [\#2367](https://github.com/GoogleChrome/lighthouse/pull/2367)
- add audit to check if paste is allowed in password inputs [\#2366](https://github.com/GoogleChrome/lighthouse/pull/2366) ([robin-drexler](https://github.com/robin-drexler))
- swap math.round with util.formatNumber [\#2361](https://github.com/GoogleChrome/lighthouse/pull/2361) ([ev1stensberg](https://github.com/ev1stensberg))
- 😈 Fix disconnect promise race. [\#2359](https://github.com/GoogleChrome/lighthouse/pull/2359) ([samccone](https://github.com/samccone))
- Enable passing of a custom userDataDir to launcher [\#2357](https://github.com/GoogleChrome/lighthouse/pull/2357) ([samccone](https://github.com/samccone))
- test\(smokehouse\): add numeric comparisons [\#2356](https://github.com/GoogleChrome/lighthouse/pull/2356)
- ✨ Add Calibre and WPT to Readme [\#2355](https://github.com/GoogleChrome/lighthouse/pull/2355) ([benschwarz](https://github.com/benschwarz))
- fix: bump jpeg quality [\#2354](https://github.com/GoogleChrome/lighthouse/pull/2354)
- fix: hide violations with no URL information [\#2352](https://github.com/GoogleChrome/lighthouse/pull/2352)
- fix\(connection\): gracefully handle missing method [\#2351](https://github.com/GoogleChrome/lighthouse/pull/2351)
- fix: normalize all times to navStart, remove traceviewer model [\#2347](https://github.com/GoogleChrome/lighthouse/pull/2347)
- extension: Fix formatting of bug reports [\#2343](https://github.com/GoogleChrome/lighthouse/pull/2343)
- Docs: update readme, add docs/readme, modernize a bit [\#2341](https://github.com/GoogleChrome/lighthouse/pull/2341)
- Total byte audit reports full URL [\#2312](https://github.com/GoogleChrome/lighthouse/pull/2312) ([johnboxall](https://github.com/johnboxall))
- polish: show audits with debug string, don't fail loadfast4pwa on network latencies, works-offline change [\#2294](https://github.com/GoogleChrome/lighthouse/pull/2294)
- fix: always ensure tracing is off before starting [\#2279](https://github.com/GoogleChrome/lighthouse/pull/2279)
- polish: listen for network idle after DCL [\#2271](https://github.com/GoogleChrome/lighthouse/pull/2271)
- Switch to containerized Trusty [\#2234](https://github.com/GoogleChrome/lighthouse/pull/2234) ([stramel](https://github.com/stramel))
- Plots: make measure script more flexible \(CLI args\) [\#2183](https://github.com/GoogleChrome/lighthouse/pull/2183) ([wwwillchen](https://github.com/wwwillchen))


# 2.0.0 (2017-05-19)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v1.6.0...v2.0.0)

## Big changes
### Brand new report
<a href="https://user-images.githubusercontent.com/39191/28991453-b9061d48-793c-11e7-957f-1399ae992e84.png"><img src="https://user-images.githubusercontent.com/39191/28991453-b9061d48-793c-11e7-957f-1399ae992e84.png" height=300 align=right></a>
Everything is brand new UI. header footer, left nav, export, score gauges… screenshots! filmstrip . pass and failures seperated. Sparklines. Accessibility by section. Perf sections..

<br clear=all>

### Chrome DevTools Integration
Take a look at the DevTools' Audit tab, where Lighthouse is now integrated

### Lighthouse is much faster now
<img src="https://user-images.githubusercontent.com/39191/28991472-1a1f0b9e-793d-11e7-95c1-34effccb8126.png" align=right>

Overall the **Operation Yaquina Bay** (Issue #2146) effort made massive improvements to the total lighthouse runtime:

* 476e7806 fix: remove afterPass throttling (#1901)
* 7d7bac66 perf: enable speedline fastMode (#2230)
* f7ea9354 perf(config): disable styles gatherer (#2153)
* d99778b4 perf: consolidate DBW pass into defaultPass (#2160)
* ff21a33a fix: only record a trace if needed by an audit (#2117)
* 740c2e99 perf(gather-runner): Clear cache selectively per-pass (#2156)
* 4c515cfa block stylesheets and images on redirect pass (#2168)
* d0cb646a perf(gatherers): skip optimization of cross origin images (#2154)
* d99b5ada perf: make network quiet threshold configurable per pass (#2220)

## New Contributors!

Huge thanks to who contributed 27 epic PRs.

* @abacon - remove images from critical request chains
* @benschwarz - Calibre and WPT to readme
* @chrisdwheatley - add related projects section
* @dandv - Mention where the documentation is
* @dgozman - Add basic rendering to report generator v2
* @ev1stensberg - math.round scores, firefox svg images, package.json correct folder
* @jinjorge - Fix typo in readme
* @jimthedev - readme instructions for running behind a login
* @johnboxall - Total byte audit reports full URL
* @mrbusche - Update outdated link for "Web App Install Banners" article
* @maya - Fix "Installation" spelling mistake
* @stramel - non-critical images, template literal linting, containerized trusty
* @mikerhyssmith - Updated readme to add port number when testing a site with authentication
* @sendilkumarn - handlebars precompiled (we'll pour one out), clearer iconography, helpText fixes.
* @ZZhaoTireless - report `<details>` printing fix
* @cedricbellet - handleJavascriptDialogs
* @thearegee - Readme: Adding lighthouse-cron to Related Projects



## Audits
* Added the "is fast on 3g" audit
* 4c34e28f Fix service worker gatherer by waiting for active state (#1864)
* bbe7f3b9 allow computed artifacts to request other computed artifacts (#2018)
* ba01e2a2 Added audit for request compression (gzip & br) (#1513)
* ef520256 feat(image-usage): add support for CSS images (#1868)
* 17088655 fix: default(.json -> .js). Disable css usage audit (#1911)
* 50349613 Collapse the 9 manifest PWA audits into 3  (#1847)
* 902585b8 feat: add OffscreenImages Audit (#1807)
* bad5bdae Add TTI < 10s audit for PWA (#1840)
* d2cb5a21 feat: add consistently interactive audit (#2023)
* d3a06925 DOMStat Audit: shadow roots don't have .classList (#2131)
* 691157f2 Add audit to check if start_url is cached by SW (#2040)
* df2fae5e PWA Audits: add placeholders for rest of baseline checks. (#2248)
* 3c752a0c refactor: split optimized images into WebP and optimize audit (#2216)
* c908e817 retire TTI (alpha) audit (#2266)


## Metrics & Precision
* ade2d88f Enable CPU throttling (4.5x) (#1778)
* added the TTFI and TTCI metrics
* f1aeb581 Fix screenshot capture bounds (#1839)
* 7b86c71e Enhance error wording around busy traces. (#2247)
* 008c5d91 add lighthouse execution time to json results (#2241)
* f0e0dfaf tests: exclude score checking and flaky link preload assertion. (#2202)
* bd7f862d Update: Use array of non-critical resource types (#2191)
* 0549cca7 fix: always use navStart as speedline timeOrigin (#2114)
* da8e0979 NEW feat: add firstInteractive (#2013)
* 2212ca2e Update network throttling to simulate more realistic network conditions (#2238)
* b5bf067b Remove images from critical request chains. (#2085)
* 0bf1744b fix: add more helpful error messages when fMP is missing (#1959)
* ca2600ac Improve reliability of finding navStart (#1895)
* 04579fe3 Ignore cache hits for "fast on 3g" check (#2143)
* b1784d12 Ignore memory cache hits too. ref #2143
* e84530e7 fix: bump jpeg quality for image optimization audit (#2354)
* 0d0e93f3 fix: do not flag blob urls as insecure (#2330)
* 782acc59 polish: do not fail loadfast4pwa for internal redirects (#2296)


## Plots
* b2eaa086 Plots: A/B screenshot viewer (#2026)
* 618d5f0a plots: metrics-per-site view (#2041)
* c43eb098 plots: measure and visualize perf metrics (#1936)
* 3f7e5a1c Plots: make measure script more flexible (CLI args) (#2183)


## CLI
* Chrome launcher is a thing now.
* 2bb9c5b3 readme: tell developer to have yarn installed. ref #2072
* 65bec1bd feat(cli): add support for custom trace categories (#1866)
* b9bce62b Warn users if they have not yet generated the file. (#2176)


## Testing
* 47ee1b8d travis: include node 8.0.0 (#2395)
* Re-enable AppVeyor support #2380, #2382
* d5854b64 test(smokehouse): add numeric comparisons (#2356)
* 8b47006e Smokehouse: log out the node command we spawn (#2074)
* 4f598c50 ci: save perf trace to S3 on failure (#2051)
* 5945332c Switch to containerized Trusty (#2234)
* fb791e40 update eslint `curly` rule to google js style (#2263)


## Misc
* 07e0aab1 Remove recordNetwork from config (#2102)
* 16b0b048 feat: support Config category and audit whitelisting (#1988)
* b2ccdfcb Allow opn & update-notifier CLI deps to be optional. (#2150)
* 283af871 dismiss any Javascript Dialogs automatically (#1939) (#2106)
* e475bdb5 refactor(aggregations): switch usage of aggregations to categories (#1935)
* 48b72a85 fix: always ensure tracing is off before starting (#2279)
* 131df278 polish: listen for network idle after DCL (#2271)
* d7e4d1bb always construct networkRecords from devtoolsLog (#2133)
* 11a1db3c networkRecords => computed artifact. generate networkRecords during gather via the networkRecorder dispatcher breaking change: performanceLog => devtoolsLogs
* fb3cfbd5 makes non-finished network records available (#2197)
* d7064290 extension: Fix formatting of bug reports (#2343)
* 9f5a8aa9 Add error to chrome extension when url is using the chrome protocol (#2346)

## Docs
* Many readme/contributing changes, related projects
* e46f5401 Architecture docs: add arch diagram and lingo updates (#2158)
* af479e9f Architecture diagram
* 8047ef36 Add custom audit recipe (#2255)
* 6898d09e add CI gulp recipe (#1886)
* 909a4638 add doc for testing site with authentication (#1906)
* 7c1c1c59 improve instructions for running behind a login (#2123)
* fb86d507 Docs: add docs/readme (#2341)
* d926f321 README: update CLI help with latest. Give common examples (#2182)
* 15c5ef13 add related projects section (#1835)

## Deps
* e46244d6 Bump axe-core  (#2090)
* 638760ee Migrate all dev scripts + docs from npm to yarn. (#2071, #2072, #2067)
* d90bce3b fix: bump speedline to fix perceptual speed index (#2046)
* 3716658b Rev axe to address #2206 (#2335)


<a name="1.6.5"></a>
# 1.6.5 (2017-03-04)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v1.6.0...1.6.5)

This is a **maintenance release** on the stable [1.6 branch](https://github.com/GoogleChrome/lighthouse/tree/1.6).

Master branch (tagged at 2.0.0-alpha) is under some heavy refactors, so we're holding off on shipping a new version. Expect one by mid-May.
_( Poke around recent PRs and issues if you're curious what we're up to ;)_

In the meantime, only a few changes here in 1.6.5:

### Audits

* Improve HTTPS audit by using network records rather than Security domain, which is broken on Android.(original pr #1918) (#2054)
* Disable unused css rules audit for now, as we want to revisit correctness later (#1912)

### Report
* Add legend to decipher iconography left to us by the ancient ones (#1841)
* Print doesn't cut off expanded audit details (#1870)
* Biggin icons for a11y (#1856)
* Tweak report colors so that we are WCAG2AA valid.

### CLI
* support multiple output modes (#1813)
* add update-notifier. (#1890)

### Testing
* smokehouse:  fix flakiness of dom-size expectation (#1881)
* include a normal CLI run in the travis build.

### Misc
* remove npm prepublish (#1889)

Thanks to @ebidel and @paulirish for merging this stuff back to stable branch.

<a name="1.6.0"></a>
# 1.6.0 (2017-03-04)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v1.5.2...1.6.0)

There were 44 PRs landed for this release. These are their stories.

### New Contributors!

Huge thanks to @sendilkumarn, who contributed [four epic PRs](https://github.com/GoogleChrome/lighthouse/commits?author=sendilkumarn). Also welcome to @tommycli, @narendrashetty, @mohsen1 and @dentemple. Readme tweaks are how it all starts. ;)

### Notable Changes

- **WebPageTest integration is in beta**

  By popular demand, you will soon have a way to run Lighthouse on demand in the cloud. We've worked closely with WebPageTest to enable Lighthouse auditing and analysis from within a WPT run.
  Our contribution [WPO-Foundation/webpagetest#825](https://github.com/WPO-Foundation/webpagetest/pull/825) was just merged and Lighthouse on WPT is currently in private beta.

<p align="center"><img alt="lighthouse-webpagetest-beta" src="https://cloud.githubusercontent.com/assets/39191/23574976/96be73fa-003a-11e7-9f08-45e104ef2560.gif"></p>

- **Lighthouse's CLI output has taken a chill pill** - #1764

  While you can view all Lighthouse results on the command line, it hasn't scaled well. A few screenworths of report was generally dumped to stdout right as Lighthouse finished up. Now, to keep your terminal happy, you will no longer see the reams of results printed to stdout.
  The HTML report is saved to disk by default, and you can automatically open it with `lighthouse --view`.

<p align="center"><img alt="lighthouse --view flag" src="https://cloud.githubusercontent.com/assets/39191/23574913/8f733424-0039-11e7-8ecd-3fe4758e735a.gif"></p>

  If you still want the stdout output, use `--output=pretty`. Oh so pretty.

- **CI coverage for Windows via AppVeyor** - #1280

<p align="center"><img src="https://cloud.githubusercontent.com/assets/39191/23574765/2f787e50-0037-11e7-9bba-ccf57423a815.png" width="450"></p>

  Thanks to a large effort from @XhmikosR, we now have an eye in the sky on Lighthouse's Windows compatibility. Now, all PRs are tested on both Linux and Windows.

## New audits
* **New audit**: DOM stats (total nodes, depth, width). (#1673) Get flagged if the size or depth of your DOM is big enough to cause big slowdowns.
![image](https://cloud.githubusercontent.com/assets/39191/23575128/34caa486-003d-11e7-8cb1-98e7805900ce.png)

* **New audit**: Total byte weight audit (#1759). An extra check to make sure folks don't ship 5MB webpages.
![image](https://cloud.githubusercontent.com/assets/39191/23575150/76da8292-003d-11e7-8288-1c58eb579d87.png)



### Improvements
* **CLI**: Add -`-chrome-flags` option to CLI. (#1761)
* **CLI**: Add `--disable-storage-reset` flag to skip clearing cache and storage (#1675)
* **Report:** Centralize perf audits within Performance section (#1724)
* **Report:** Collapse sections when all audits pass (#1742)
* **Config**: Allow extension of default config (#1731)
* **Config**: Configurable blank page options (#1732)
* **Config**: Configurable page timeout (#1672)
* Disable throttling for non-performance passes (#1740)
* Reduce build size by 33% (#1756)
* Enhanced display URLs (#1793)

### Bug Fixes
* Improve reliability of TTI metric by extending trace (#1785)
* Do not fail if chrome could not be killed (#1735)
* Headless fix: reuse existing tab if creating new tab fails (#1760)
* Fix code escaping (#1790)
* Speculative fix for getCurrentTabURL (#1753)
* Rewrite chrome:// URLs to compare them. (#1777)
* Responsive image audit correctly handles SVG and duplicates (#1749)

### Testing
* Use download-chrome.sh to download Chrome on Windows too.
* Add AppVeyor CI support for Windows testing.

### Docs
* Link to PWA Checklist (#1734)
* Reorganization and new "Using programmatically" section (#1721)
* fix typo in promise chain
* minor yarn typo fix (#1736)
* Fix typo s/console.err/console.error (#1772)

### Refactor
* DRY byte efficiency audits (#1635)
* Add explicit strict null checks for TS. (#1763)
* CSS consistency changes. (#1698)
* Switch to two space indention. (#1693)
* Refactor handlebar helpers into static methods

### Report Improvements
* Use ! for aggregation icon when some audits dont pass (#1789)
* Clearer iconography in Perf metrics and Fancier Stuff (#1750)
* Adopt the non-failure iconography for perf audits  (#1812)
* Reformat the critical chain details (#1647)
* Reformat the usertiming details (#1810)
* Adjust table em color val for WCAG2AA. (#1743)
* Better colors. Still accessible (#1758)
* Brand the header (#1797)
* Quazzle the tardiplums for best quality fleekdrops.

### Report Bug fixes
* Fix table overflow with Firefox. (#1704)
* Use pre instead of inline code for listener snippets. (#1786)
* Use the same favicon as the viewer. (#1657)
* Tweak colors so that we are WCAG2AA valid. (#1686)
* CSS icon alignment for FF (#1796)
* Clean up table styling (#1726)



<a name="1.5.1"></a>
## 1.5.1 (2017-02-10)

[Full changelog](https://github.com/GoogleChrome/lighthouse/compare/1.5.0...1.5.1) (2017-02-10)

### Bug Fixes
- HTML hygiene - #1682, #1683, #1684
- **Extension:** Rollback of `management` permission to study effect first (#1689) - #1687




<a name="1.5.0"></a>
# 1.5.0 (2017-02-10)
[Full Changelog](https://github.com/GoogleChrome/lighthouse/compare/v1.4.1...1.5.0)

There were 128 PRs landed for this release. These are their stories.

### New Contributors!

@graph1994, @denar90, and @kiermasp

### Notable Changes
- **Dropped support for Node earlier than v6** - #1519

  Node v6 became the [Node long-term-support version](https://github.com/nodejs/LTS#lts-schedule) in October 2016. After a suitable mourning period for v4 with a `--harmony` flag, Lighthouse has moved on and will only support v6+ going forward.
- **Improved selection of First Contentful and Meaningful Paint events from unusual traces** - #1632, #1634

  Lighthouse has banished the dreaded `-1` score that has long plagued runs for [certain sites](https://airhorner.com/).

  ![image](https://cloud.githubusercontent.com/assets/316891/22815981/ea000d68-ef13-11e6-95f5-258e2cacdd54.png)

  First Meaningful Paint is now detected much more robustly. While it is [not yet a completely solved problem](https://github.com/GoogleChrome/lighthouse/issues/1464), a large class of these errors should be eliminated. Reporting on these errors has also improved over the ambiguous `-1`, clearly differentiating between an issue with Lighthouse and an issue with the page being tested.
- **Open local report in online report Viewer** - #1179

  When viewing a Lighthouse HTML report generated locally—in the extension or from the command line—a new option is available in the "Export..." dropdown that allows you to upload to the [Lighthouse Online Viewer](https://googlechrome.github.io/lighthouse/viewer/).

  ![localreport](https://cloud.githubusercontent.com/assets/316891/22817784/3d865302-ef1e-11e6-9535-50937f5929ef.png)

  ![viewer](https://cloud.githubusercontent.com/assets/316891/22817839/9b477ab6-ef1e-11e6-8fc7-bafbedfd2872.png)

  You can then use the Viewer share button to get a report URL that you can share freely.

  Behind the scenes, Viewer gets your permission via OAuth to create a GitHub [secret gist](https://help.github.com/articles/about-gists/#secret-gists) and saves the report there. Since it's done as _your_ gist, you maintain full control over the sharing of the report and you can delete it at any time. You can revoke the Viewer's permission to create gists under your [GitHub settings](https://github.com/settings/applications).
- **Performance metrics are injected into trace saved with `--save-assets` for viewing in timeline** - #1446

  Lighthouse metrics like "First meaningful paint", "Time to Interactive", etc are mocked out as User Timing measures and injected back into the trace taken by Lighthouse.

  ![image](https://cloud.githubusercontent.com/assets/39191/21796487/f35ad136-d6bd-11e6-9447-2260adcf1d65.png)

  If you save a run's trace with `--save-assets` and then open it in DevTools or [Timeline Viewer](https://chromedevtools.github.io/timeline-viewer/), you'll be able to see your key metrics in context with the full trace of the page load.
- **Throttling and emulation information in report** - #1485, #1608, fc858ea

  <img width="719" alt="screen shot 2017-02-09 at 22 43 27" src="https://cloud.githubusercontent.com/assets/316891/22816879/3c913ac0-ef19-11e6-812b-7e728543318b.png">

  It's easy to forget what throttling and emulation settings were used for a particular Lighthouse run after some time has passed. The settings used are now saved in the raw JSON results and are printed at the top of the HTML report under the arrow dropdown.
- **UI to interactively block certain page resources and measure the load performance difference**

  The first version of the [Performance Experiment](https://docs.google.com/document/d/1FYt5Es_Kf5IyC_bkTHj2G_a_sTvRvIq5iZCEN8VZY5o/edit#heading=h.cetla8h0y4o) project is landing in 1.5.0. When Lighthouse is run with the `--interactive` flag, a special report is generated that allows interactive selection of costly page resources. The experiment server then reruns Lighthouse on that page with those resources blocked.

  <img width="720" alt="screen shot 2017-02-09 at 23 45 34" src="https://cloud.githubusercontent.com/assets/316891/22818415/f19058e0-ef21-11e6-82f6-aa6b49013e11.png">

  This lets you experiment with your page load performance, interactively testing the effects of blocking or delaying assets in your critical path.

### New Audits
- **CSS usage** - #1421, #1479, #1466, #1496, #1557

  Reports the number of unused style rules in your page and the byte/time savings of removing them:

  <img width="831" alt="screen shot 2017-02-09 at 23 43 17" src="https://cloud.githubusercontent.com/assets/316891/22818581/d4fd379c-ef22-11e6-9143-36cc7c7245ae.png">
- **Image optimization** - #1452, #1579

  Reports images that are unoptimized and the byte/time savings of optimizing them:

  <img width="630" alt="screen shot 2017-02-09 at 23 43 49" src="https://cloud.githubusercontent.com/assets/316891/22818588/dd3994aa-ef22-11e6-8fee-7469a8866aa6.png">
- **Report Chrome's deprecated API warnings** - #1470

  Lists console warnings from Chrome if your page is using deprecated APIs or features that have [interventions](https://www.chromestatus.com/features#intervention):

  <img width="675" alt="screen shot 2017-02-10 at 00 05 25" src="https://cloud.githubusercontent.com/assets/316891/22818969/b317e9d6-ef24-11e6-89db-9ee596ba8539.png">
- **Responsive image sizing** - #1497

  Reports images that are too big and the potential byte/time savings of sizing them correctly for the given device:

  <img width="758" alt="screen shot 2017-02-09 at 23 44 23" src="https://cloud.githubusercontent.com/assets/316891/22818602/ef802c82-ef22-11e6-9e77-138bd743aca8.png">

### Improvements
- **Audit:** Catch more obsolete cases in `no-old-flexbox` audit - #1374
- **Audit:** Add extended timing data to `speed-index` audit results - #1430, #1558
- **Audit:** Base bytes- and time-saved estimates on mean throughput for that load - #1536
- **CLI:** Disable more Chrome background features that may interfere with auditing - #1416
- **CLI:** Close tab when Lighthouse is done with it - #1543, #1592
- **CLI:** Use `--output-path` when saving artifacts and assets from run - #1601
- **CLI:** Update `--perf` config to include latest perf audits - #1640
- **Extension:** Move from a persistent background page to an event page - #1487
- **Extension:** ~~Option to disable other extensions during run for improved accuracy~~ - #1492, #1604 (see #1689)
- **Gatherer:** Issue `all-event-listeners` collection commands in parallel to improve performance - #1667
- **PerformanceExperiment:** Create server to rerun Lighthouse with new options on POST request - #1393
- **PerformanceExperiment:** Add UI for options to block asset loading on rerun - #1455, #1577
- **PerformanceExperiment:** Add report sidebar to switch between multiple Lighthouse run results - #1477, #1597
- **Report:** Expand audit `<details>` on print - #1468
- **Report:** Add table formatter for audit details - #1505, #1538, #1546, #1547, #1545, #1622, #1636, #1678
- **Report:** Reduce visual noise by auto-collapsing audit details and removing redundant info - #1561, #1598, #1606, #1617
- **Report:** Remove 'Coming Soon' results from report - #1637
- **Report:** Share save and export code in report and Viewer - #1594
- **Viewer:** Make Viewer a PWA - #1554, #1571

### Bug Fixes
- Stop Lighthouse run if initial page request fails (404, domain not found, etc) - #1174, #1603, #1677
- **Audit:** Check for proper mimetype in tags-that-block audit - #1432
- **Audit:** Add proper parsing of meta viewport content - #1267
- **Audit:** Ignore fragment in document URL comparison to correctly test offline loading - #1319, #1566
- **Audit:** Filter out `goog_*` from user timings - #1563
- **Audit:** Report proper first paint delay for blocking tags audits - #1555
- **Audit:** Handle empty chain in critical-request-chains audit - #1620
- **Audit:** Warn that `geolocation-on-start` gatherer cannot be run on insecure origins - #1679
- **CLI:** Guard against launching multiple Chrome processes - #1436
- **CLI:** Add support to find Chrome via `LIGHTHOUSE_CHROMIUM_PATH` variable on Windows - #1572
- **PerformanceExperiment:** Fix various cross-browser report issues - #1593
- **Report:** Improve filename eliding in audit details - #1437
- **Report:** Various fixes for mobile and cross-browser issues - #1429, #1551, #1590, #1626
- **Report:** Change generated HTML to be mostly valid; improve CSS consistency - #1575, #1627

### Testing
- Viewer: Add tests for file uploader - #1184
- Update smokehouse to support deep comparisons of test expectations - #1450, #1457
- Fix eslint base config, improve rules - #1462, #1440
- Deal with Shop test site flakiness - #1491, #1493, #1654
- Remove global installation of typescript on Travis - #1520
- Use `bash` and `node` explicitly in npm scripts for cross-platform compatibility - #1510
- Switch to a more concise unit test reporter - #1650

### Docs
- Add Chrome webstore extension screenshots - #1481, #1531, #1526
- Various JSDoc, markdown, and capitalization fixes - #1441, #1494, #1503, #1533, #1523, #1553, #1565
- **Audit:** Change messaging for uses-h2 audit - #1445
- **Report:** Add help text (with links to docs) to manifest and a11y audits - #1428, #1589

### Refactor
- Use `json-stringify-safe` only when necessary - #1435
- Centralize console special characters for cross-platform compatibility - #1438, #1509
- Add JS information to categories traced - #1442, #1444
- Track enabled debugger domains for safe simultaneous use - #1474
- Node v6+: switch to rest parameters, `[].includes()`, and default parameters - #1524, #1580, #1633
- Introduce `TraceOfTab` computed artifact to centralize extraction of key trace events - #1549
- Handle gatherer errors as native exceptions instead of `-1` ad hoc system - #1560, #1623, #1641, #1624
- Create audit error result to rid report of `-1`s and score more consistently - #1591, #1649, f92b8ed
- Save log of debugger protocol messages for `Page` and `Network` events - #1665, #1669
- Move `tracingModel` to computed artifact to halve time spent constructing timeline model - #1668
- **CLI:** Simplification of asset saving format and filenames - #1433, bba5818
- **Report:** Turn report script into class, Viewer into subclass - #1471, #1559
- **Report:** Include each partial's CSS only once - #1652

### Release
- Add release checklist to contribution guide - #1409, #1423
- Add npmignore file - #1411, #1681
- Add install/build scripts for each `package.json` - #1439, #1488, #1522

### Dependencies
- Lock `package.json` dependencies to specific versions - #1422
- Update `mocha` to 3.2.0 - #1585



<a name="1.4.1"></a>
## 1.4.1 (2017-01-05)

* 1.4.1 (#1406) ([179783b](https://github.com/GoogleChrome/lighthouse/commit/179783b))
* Add LH images assets. Fixes #1401 ([0d5a4bc](https://github.com/GoogleChrome/lighthouse/commit/0d5a4bc)), closes [#1401](https://github.com/GoogleChrome/lighthouse/issues/1401)
* Allow FMP trace event to appear slightly before the FCP (#1404) ([a7648e7](https://github.com/GoogleChrome/lighthouse/commit/a7648e7))
* fix: don't extend URL in url-shim to support es5 transpilation (#1407) ([b03b0db](https://github.com/GoogleChrome/lighthouse/commit/b03b0db))



<a name="1.4.0"></a>
# 1.4.0 (2017-01-04)
[Full changelog](https://github.com/GoogleChrome/lighthouse/compare/1.4.0...1.3.2)

### New Contributors!

@dracos, @lokson, and @AdrianoCahete

### Improvements
- Add URL blocking by pattern to driver - #1195
- **Extension:** Add test URL to "Report Error" template - #1357
- **Extension:** Keep Lighthouse extension popup active while running - #1185
- **Extension:** Use live icon and badge text while running - #1367
- **Gather:** Only run axe tests that we have audits for - #1257
- **Report:** Only use markdown for injected HTML - #1226
- **Report:** Style tweaks for DevTools report - 4a2f97a21644989c325e1203be2af7230773934f, 68ccb6401143f18ac9702bb8d05a82936c1c8b0e
- **Report:** Include total score in JSON and pretty output modes - #1356
- **Viewer:** Add input for gist URL on mobile - #1341

### Bug Fixes
- **Audit:** Handle invalid URLs in `external-anchors-use-rel-noopener` audit - #1358
- **Audit:** Handle invalid URLs in `no-console-time` and `no-datenow` audits - #1288
- **Audit:** Make zero-length critical-request chains pass the test - #1303
- **Audit:** Add `"minimal-ui"` as an allowed Manifest `display` value - #1268
- **Audit:** Improved handling of invalid URLs in call site and event listener audits - #1390
- **Audit:** Async stylesheet handling to limit false positives for stylesheets blocking first paint - #1389
- **CLI:** Improve Windows console support - #1307
- **CLI:** Ignore `which` failures when looking for Linux Chrome executable - #1395

### Docs
- Closure type check fixes - #1293

### Refactor
- Return artifacts from Runner (and move assets/artifacts saving to CLI) - #1163, #1400
- **PerformanceExperiment:** Centralize more implementation in `server.js` - #1189

### Dependencies
- Only list `mkdirp` dependency once - #1284
- Add `marked` - #1226



<a name="1.3.2"></a>
## 1.3.2 (2016-12-23)

* 1.3.2 (#1281) ([aa1059b](https://github.com/GoogleChrome/lighthouse/commit/aa1059b))
* handle Date.now uses with call site URL (#1277) ([2299f94](https://github.com/GoogleChrome/lighthouse/commit/2299f94))



<a name="1.3.1"></a>
## 1.3.1 (2016-12-22)


### New Contributor!

@XhmikosR

### Improvements
- **Report:** remove `noreferrer` from `helpText` links (#1190)
- **Viewer:** add consolidated export button - #1182

### Bug Fixes
- Remove Node v7 URL parsing while bugs are being fixed - #1187
- Fix `driver.captureFunctionCallSites` in the face of Error polyfills - #1218
- **Audit:** handle anchor tags with no href in 'external-anchors-use-rel-noopener' audit - #1238
- **CLI:** use exec, not spawn, to kill Chrome process on Windows - #1206
- **Viewer:** don't check upload's file type, try to parse json file directly - #1234

### Docs
- **readme:** improve definition - #1216




<a name="1.3.0"></a>
# 1.3.0 (2016-12-20)
[full changelog](https://github.com/GoogleChrome/lighthouse/compare/1.2.2...1.3.0)

### New Contributors!

@Janpot, @robdodson, and @WeiweiAtGit

### Major Changes
- New hosted [Lighthouse report viewer](https://googlechrome.github.io/lighthouse/viewer/) - #1109, #1139
- New Lighthouse [logo](https://github.com/GoogleChrome/lighthouse/blob/029e1f0d7809e27f9826dae4d31cced468e135c3/lighthouse-viewer/app/images/lh_logo_bg.png) - #1129, #1144

### Improvements
- Use [`whatwg-url`](https://www.npmjs.com/package/whatwg-url) to parse URLs - #997
- Use `firstMeaningfulPaint` trace event directly - #1066
- Remove whitespace and comments from traceviewer-js - #1095, #1103
- **Audit:** Remove browser-generated `paintNonDefaultBackgroundColor` event from `user-timings` - #1077
- **Audit:** Handle where `tracingStartedInPage` doesn't precede `navStart` in trace - #1152, 9c8d13e5
- **Audit:** Add new required attr and attr-value accessibility audits - #1156
- **CLI:** Add improved search for Chrome executable on Linux - #856
- **CLI:** Add check that TypeScript files have been compiled before running - #1113
- **CLI:** Add `--view` flag which serves generated report after Lighthouse run - #1130, f6afd225
- **Driver:** Return meaningful errors from page context when `evaluateAsync` rejects - #1037
- **Report:** Create "Fancier Stuff" section for newer (but not necessarily better) APIs - #1087
- **Report:** Convert `helpText` toggle to pure CSS - #1104
- **Report:** Stick header to top of page - #1121, #1132, #1133
- **Report:** Make mobile-friendly and responsive - #1134
- **Report:** Don't emit script tags in devtools report - #1105
- **Report:** Use same favicon throughout all reports - #1172
- **Viewer:** Move share button to core report - #1117
- **Viewer:** Add support for copy and paste of report JSON - #1126, #1128
- **Viewer:** Concat CSS files - #1153

### Bug Fixes
- Unmute some smoke test failures - #1081
- **CLI:** Make `rimraf` async for deleting Chrome temp profile - #1127
- **CLI:** Eliminate errors from calling `ChromeLauncher.kill()` twice - #1131
- **CLI:** Fix html `reportContext` when generated by the CLI - #1171
- **Driver:** Fix `evaluateAsync` when page has overridden native Promise - #1037, #1178
- **Report:** Fix for formatting with unknown time zone - #1086
- **Report:** Fix report color issues in Safari - #1114
- **Report:** Fix print styling - #1180
- **Testing:** Handle critical-request-chains audit promise rejections - #1100
- **Testing:** Fix failing lint test - aa6d38b3
- **Viewer:** Disable sharing button if gist is already saved - #1118

### Testing
- Don't run Closure type checking on Travis - 558a26
- Update `eslint` and `eslint-config-google` to latest - #1136, #1159, #1160
- **Audit:** Add tests for `notification-on-start` - #1089
- **CLI:** Add test for obsolete CLI flags - #1168
- **Viewer:** Add analytics #1120, #1162
- **Viewer:** Add build of viewer to CI test suite - #1160

### Docs
- Update jsconfig for intellisense - 835ae985
- **Audit:** Fix type in `no-console-time` `helpText` - #1142
- **Audit:** Add links to DoBetterWeb `helpText` docs - #1161
- **readme:** Add Viewer to readme - #1164

### Refactor
- **Audit:** Add check for an audit's `requiredArtifacts` before running - #1088
- **Audit:** Centralize auditing of `axe-core` results - #1167
- **CLI:** Unify `bin.ts` execution and error-handling paths - #1141
- **Gatherer:** Gatherers now return artifacts directly rather than setting `this.artifact` - #1122
- **Viewer:** Split code into modules - #1116
- **Viewer:** Use `tsc` to es3ify viewer code - #1150

### Dependencies
- Add [`whatwg-url`](https://www.npmjs.com/package/whatwg-url) - #997
- Add [`opn`](https://www.npmjs.com/package/opn) - #1130
- Remove [`jszip`](https://www.npmjs.com/package/jszip) - #1094
- Update [`eslint`](https://www.npmjs.com/package/eslint) and [`eslint-config-google`](https://www.npmjs.com/package/eslint-config-google) - #1136
- Update [`axe-core`](https://www.npmjs.com/package/axe-core) to 2.1.7; now 8x faster - #1155




<a name="1.2.2"></a>
## 1.2.2 (2016-11-29)

[full changelog](https://github.com/GoogleChrome/lighthouse/compare/1.2.1...1.2.2)

### New Contributor!

@beaufortfrancois

### Improvements
- **Extension:** remove "tabs" extension permission - #1032

### Bug Fixes
- Ensure `driver.captureFunctionCallSites` resolves to an array - #1036
- Handle call sites in `eval`'d code in `driver.captureFunctionCallSites` - #1073
- **Audit:** identify `noopener` when in list of link types in `rel` - #1035
- **CLI:** explicitly close outfile and errfile in chrome launcher - #1057
- **Extension:** set minimum supported Chrome to m54 - #1027
- **Extension:** better error message if user attempts to audit the Chrome Web Store - #1025
- **Report:** work around unsupported timezones when pretty printing dates - #1067
- **Report:** fix coloring by score - #1070

### Docs
- **Report:** better formatting for Manifest icon size list - #1041, #1044
- **Report:** improve language consistency in audit `description` strings - #1045
- **Report:** add `helpText` to remaining audits - #998
- **Report:** remove scores from performance metrics; change to pass/fail - #1072



<a name="1.2.1"></a>
## 1.2.1 (2016-11-23)
[full changelog](https://github.com/GoogleChrome/lighthouse/compare/1.2.0...1.2.1)

### Improvements
- **Audit:** add DBW audit for `<script>` elements in head that block first paint - #965
- **Extension:** Add error description to title of auto-generated github issues - #992

### Bug Fixes
- fix typo in default config file - f9f7c25
- **Audit:** treat non-strings as an error in `without-javascript` gatherer and audit - #971
- **Audit:** catch driver errors (and set on `artifact.debugString`) in geolocation gatherer - #999
- **Audit:** fix property name used for error value in `all-event-listeners` gatherer - #1013
- **CLI:** fix implicit-any-typed `_` in chrome launcher - #981
- **Extension:** fix aggregation category filtering based on selection in options panel - #973
- **Report:** escape </script> tags when embedding raw results in the html page - #1003

### Testing
- Force `npm install` (for now) on Travis after [their change](https://github.com/travis-ci/travis-build/pull/895) to prefer yarn - #994

### Docs
- **readme:** new report screenshot - cb2ebfd

### Refactor
- Unify CLI and extension implementations of debugger protocol error handling - #977



<a name="1.2.0"></a>
# 1.2.0 (2016-11-17)
[full changelog](https://github.com/GoogleChrome/lighthouse/compare/1.1.7...1.2.0)

### New Contributors!

@Bassoon08, @karanjthakkar, @chowse, @hsingh23, @olingern, and @patrickhulce

### Major Changes
- Launch [DoBetterWeb](https://github.com/GoogleChrome/lighthouse#do-better-web) (DBW) audits and gatherers as part of default Lighthouse run - #917
- **Report:** Lighthouse report refactor and refresh - #926, #935

### Improvements
- Log errors in red, warnings in yellow - #860, #915
- **Audit:** Add DBW audit for Mutation Events - #786
- **Audit:** Add DBW audit for `<link>` elements in head that block first paint - #892
- **Audit:** Add DBW audit for `rel=noopener` on external links - #912
- **Audit:** Make geolocation audit return error if permission already granted - #925
- **CLI:** Handle `--quiet` logging as silent - #881
- **Extension:** Add integrated 'Report Error' button with pre-populated data - #944
- **Gatherer:** Add support for collecting event listeners across all DOM nodes - #930
- **Report:** Remove excessive EIL percentiles from report - #851
- **Report:** Update TTI scoring label to 5000ms to match guidance - #947
- **Report:** Cleanup of event listener extended info display - #952
- **Report:** Group event listener extended info by call site location - #960

### Bug Fixes
- Restore log's status event payload - #883
- Ignore protocol error from defensive `DOM.disable` call - #895, #907
- Remove cache-contents gatherer from default config since currently no audit requires it - #900
- Enforce audit naming consistency in the config file and filenames - #914
- **Audit:** Handle error case from htmlwithoutjs gatherer and audit - #891
- **Audit:** Prevent attempts to parse script URLs when no URL was found - #893
- **Audit:** Don't include disabled `<link>`s in link-blocking-first-paint audit - #911
- **Audit:** Handle undefined Accessibility violations array - #942
- **Audit:** Only create a manifest display debugString when there is an error - #954
- **Audit:** Look for non-async `<link>`s and fix unit of time in link-blocking-first-paint audit - #963
- **CLI:** Add `main` field to CLI's package.json - #875
- **CLI:** Disable Chrome's Google Translate service during Lighthouse run - #897
- **CLI:** Disable Chrome's default Apps during Lighthouse run - #918
- **Driver:** Dedupe function call site entries on location, not stack trace - #958
- **Extension:** Properly filter the audits to run - #946
- **Gatherer:** Handle CSS parse errors in stylesheet gatherer - #906
- **Report:** Move `gt` handlebars helper to accessibility formatter - #929
- **Report:** Fix handlebars `and` helper to show `displayValue` in reports - #938

### Testing
- Add DBW to smokehouse tests - #843, #901
- Add script for bumping Travis to restart timing-out test runs - #913
- Fix Travis timeouts by rerunning with random Chrome debug ports - #922

### Docs
- **Audit:** Update EQT/EIL design doc links to latest docs - #923
- **Audit:** Fix no-datenow `helpText` typo - #955
- **Audit:** Update uses-passive-event-listeners `description` text - #956
- **readme:** Add DBW to readme - #863
- **readme:** Update development section with TypeScript info - #859
- **readme:** Document yarn install command - #939

### Refactor
- **Audit:** Rewrite geolocation-on-start audit to use DBW tooling and testing - #903
- **CLI:** Migrate `chrome-debug` binary to use internal Chrome launcher - #898
- **Report:** Refactor report generation to be blob based and simpler - #908

### Dependencies
- Yarn lock file cleanup - 3e9e88c


<a name="1.1.7"></a>
## 1.1.7 (2016-10-31)

[full changelog](https://github.com/GoogleChrome/lighthouse/compare/1.1.6...1.1.7)

### Features
- Add cpu throttling option (initially disabled by default) - #747
- Stop Lighthouse run if tabs with a shared Service Worker are found - #639
- Add Web Worker entry point to `lighthouse-background.js` - #803
- **Audit:** add DBW stylesheet gatherer and old flexbox audit - #767
- **Audit:** adopt [Perceptual Speed Index](http://www.parvez-ahammad.org/blog/perceptual-speed-index-psi-for-measuring-above-fold-visual-performance-of-webpages) - #785
- **Audit:** add DBW audit for passive event listeners - #830
- **CLI:** add support for using stable Google Chrome on MacOS - #782

### Bug Fixes
- Fix function call location from `driver.captureJSCallUsage` - #779
- Update `driver.captureFunctionCallSites` to use updated `driver.evaluateAsync` - #809
- Stop interpreting manifest parse errors as failure to fetch manifest - #823
- Update `npm run dbw` to use new emulation flags - #834
- Make network emulation numbers always integers - #839
- Trim `extendedInfo` returned from DBW http2 audit to prevent circular references - #842
- Navigate to about:blank before driver setup - #850
- Fix handling of errors from the debugging protocol - #853
- Stop spreading strings in `log` - #835
- Allow debugger protocol's `DOM` domain to be redundantly disabled - #861
- Remove tab `targetId` requirement for checking if other tabs will share a service worker - #852
- Consistently reject Promises with an `Error` - #862
- Don't throw an error in stylesheet gatherer if no stylesheets are found - #864
- **CLI:** Disable extension system in launched Chrome instance - #771
- **CLI:** make Chrome Launcher respect `--quiet` flag - #774
- **CLI:** use about:blank as initial URL - #776
- **CLI:** make HTML report have gitignorable filename - #790
- **CLI:** fix `outputMode` conditional - #846
- **CLI:** add warning if `tsc` has not been run before use - #857
- **Report:** fix pluralization of "resources" - #773

### Testing
- Add smokehouse, an end-to-end test runner, and use for smoke tests - #781, #788
- Run default smoke tests with full config - #801
- Add `prefer-const` eslint rule - #804
- Run well-known-PWA smokehouse tests in CI - #824
- Fix several eslint warnings - #831
- Test node v6 and v7 explicitly in CI - #832
- Add tests for `getLogNormalDistribution` and `getRiskToResponsiveness` on `TracingProcessor` - #806

### Docs
- **CLI:** clarify description of `--select-chrome` flag - #829
- **readme:** add basic instructions for custom audits/gatherers - 8d696af
- **readme:** update module diagram - ee1dc0d
- **readme:** add node debugging getting started tip - #807
- **readme:** add CLI TS development notes - #818
- **readme:** matching parentheses - #855

### Refactor
- Make [`web-inspector.js`](https://github.com/GoogleChrome/lighthouse/blob/694baf61d587eda360e89fde4bb17e6cd46fcbf0/lighthouse-core/lib/web-inspector.js) worker friendly - #795
- Migrate `driver.evaluateAsync` to `Runtime.evaluate(awaitPromise)` - #793
- Extract a `Connection` abstraction from driver - #800
- Create `connections/` directory for debugger protocol connection classes - #822
- **CLI:** convert CLI to typescript - #702
- **CLI:** split mobile emulation and network emulation into separate `--disable-device-emulation` and `--disable-network-throttling` flags - #747
- **CLI:** add more explicit TS typing - #825
- **Extension:** simplify reloading clean state at end of run - #813, #816

### Dependencies
- Bump speedline to 1.0.3 - #785
- Added [typescript](https://www.npmjs.com/package/typescript) - #702
- Removed [chrome-remote-interface](https://www.npmjs.com/package/chrome-remote-interface); added [ws](https://www.npmjs.com/package/ws) - #800




<a name="1.1.6"></a>
## 1.1.6 (2016-10-12)

* 1.1.6 ([f80e121](https://github.com/GoogleChrome/lighthouse/commit/f80e121))
* Add yarn.lock (#765) ([b44e69d](https://github.com/GoogleChrome/lighthouse/commit/b44e69d))
* Fix NaN% in CLI report (#763) ([a21ec65](https://github.com/GoogleChrome/lighthouse/commit/a21ec65)), closes [#763](https://github.com/GoogleChrome/lighthouse/issues/763)
* Replace instances of 'not unfunctioning' with 'still functional' (#764) ([5476243](https://github.com/GoogleChrome/lighthouse/commit/5476243))
* Temporarily disable cache contains start_url audit in config (#766) ([f444703](https://github.com/GoogleChrome/lighthouse/commit/f444703))
* docs: favor installing stable package from npm instead of Github master ([4b8ef79](https://github.com/GoogleChrome/lighthouse/commit/4b8ef79))
* chore: tweak eslintignore. ([fde5452](https://github.com/GoogleChrome/lighthouse/commit/fde5452))



<a name="1.1.5"></a>
## 1.1.5 (2016-10-10)
[full changelog](https://github.com/GoogleChrome/lighthouse/compare/1.1.4...1.1.5)

### Features
- Enable passing in a custom `pauseAfterLoad` option #697
- Wait until network has settled before considering page as loaded #714
- Support dynamic plugins in lighthouse config #730
- **Audit:** add DBW AppCache audit #681, #687
- **Audit:** add DBW WebSQL audit #691
- **Audit:** add DBW requests-should-be-over-h2 audit #700
- **Audit:** add DBW `Date.now()` -> `performance.now()` audit #707
- **Audit:** add DBW `console.time()` -> `performance.mark()` audit #712
- **Audit:** add DBW `document.write()` audit #716
- **CLI:** add `chrome-debug` binary to launch the debuggable standalone chrome #678
- **CLI:** reporter pretty formatting #682
- **CLI:** add `npm run dbw` to run DoBetterWeb audits #696
- **Extension:** print errors thrown from handlebars #731
- **Report:** add version number #673
- **Report:** add `helpText` associated with audit results #695
- **Report:** add version number on all report formats #749
- **Report:** tighter vertical whitespace in HTML report #754
- **Report:** add `generatedTime` property in json output #752
- **Report:** add toggle to display `helpText` #751

### Bug Fixes
- Remove old `auditWhitelist` argument #676
- Stop clearing cookies when run #717
- Allow updated speedline to display results for traces with fewer than three frames #745
- Sort trace events by timestamp before calculating FMP #756
- **CLI:** add support for Windows 10 without Chrome Canary #690
- **CLI:** fix screenshot save via `--save-assets` #711
- **CLI:** fix `--mobile` flag #721
- **Extension:** fixes for updated dependencies #734
- **Report:** add fallback font for url heading #674
- **Testing:** loosen path requirement for closure formatter replacement #701
- **Testing:** handle http-redirect gatherer promise rejections #729
- **Testing:** handle https gatherer promise rejections #738
- **Testing:** handle promise rejections in runner testing #739

### Refactor
- Automatically cache computed artifacts #675
- Streamline extensible gather and audit loading #679, #692
- Add `'use strict';` to files where it was missing #694
- Handle `sendCommand` promise rejections #703
- Rename of some `config.json` properties #727
- **Extension:** improve `queryCurrentTab` impl #680
- **Testing:** stronger `user-timing` test assertions #732
- **Testing:** run coveralls only after build success #733
- **Testing:** fix tests which were unconditionally passing failed assertions #737

### Dependencies
- Bump [catapult/traceviewer](https://github.com/catapult-project/catapult/) to latest #723
- Bump [chrome-devtools-frontend](https://github.com/ChromeDevTools/devtools-frontend) to 1.0.401423 #724
- Bump speedline to 1.0.0 #726
- Bump speedline to 1.0.1 (now handles traces with one, two, or three screenshots) #728




<a name="1.1.3"></a>
## 1.1.3 (2016-09-06)

* 1.1.3 ([a5bbe23](https://github.com/GoogleChrome/lighthouse/commit/a5bbe23))
* about:blank navigation moved to before gatherer.beforeClass() ([8cf3841](https://github.com/GoogleChrome/lighthouse/commit/8cf3841))
* add comment on npm explore ([5b36ebb](https://github.com/GoogleChrome/lighthouse/commit/5b36ebb))
* add context to aggregator error strings ([ab96e71](https://github.com/GoogleChrome/lighthouse/commit/ab96e71))
* Add custom config example. Just the perf stuff. (#603) ([ef4044a](https://github.com/GoogleChrome/lighthouse/commit/ef4044a))
* Add empty API-and-internals.md doc ([fb690be](https://github.com/GoogleChrome/lighthouse/commit/fb690be))
* add goOffline/goOnline methods to driver ([ceb5f36](https://github.com/GoogleChrome/lighthouse/commit/ceb5f36))
* added some docs about running LH headless. ([8a176e1](https://github.com/GoogleChrome/lighthouse/commit/8a176e1))
* Added test suffix to all tests ([e9110bf](https://github.com/GoogleChrome/lighthouse/commit/e9110bf))
* Addresses comments ([8c0c05c](https://github.com/GoogleChrome/lighthouse/commit/8c0c05c))
* Adds support for custom audits and gatherers ([bab838b](https://github.com/GoogleChrome/lighthouse/commit/bab838b))
* Asset saver test fixup. ([d24c91e](https://github.com/GoogleChrome/lighthouse/commit/d24c91e))
* assetsaver. write real traces to disk. ([034e9a6](https://github.com/GoogleChrome/lighthouse/commit/034e9a6))
* Attempt to fix the tests ([34509b1](https://github.com/GoogleChrome/lighthouse/commit/34509b1))
* cache start url audit is Alpha ([65778d1](https://github.com/GoogleChrome/lighthouse/commit/65778d1))
* Changed config/index.js to config/config.js ([2e717fe](https://github.com/GoogleChrome/lighthouse/commit/2e717fe))
* config/config. ([5572aab](https://github.com/GoogleChrome/lighthouse/commit/5572aab))
* correctly fall back on erroneous manifest display modes ([fc10f5b](https://github.com/GoogleChrome/lighthouse/commit/fc10f5b))
* delete page reload/navigate logic since we always navigate ([1810c61](https://github.com/GoogleChrome/lighthouse/commit/1810c61))
* eliminate non-functional loadPage cli flag ([990a3c7](https://github.com/GoogleChrome/lighthouse/commit/990a3c7))
* filterPasses -> validatePasses (#608) ([1fb77ae](https://github.com/GoogleChrome/lighthouse/commit/1fb77ae))
* fix audit, gatherer, artifact browserify import ([1ddb8b1](https://github.com/GoogleChrome/lighthouse/commit/1ddb8b1))
* Fix eslint issues in extension ([6be4acf](https://github.com/GoogleChrome/lighthouse/commit/6be4acf))
* fix jsconfig for vscode. ([02dfba2](https://github.com/GoogleChrome/lighthouse/commit/02dfba2))
* Fixed headless documentation ([58e5be5](https://github.com/GoogleChrome/lighthouse/commit/58e5be5))
* Fixes TTI not being counted in overall score ([82c5051](https://github.com/GoogleChrome/lighthouse/commit/82c5051))
* headless docs: adjustments to pr #623 ([364ba40](https://github.com/GoogleChrome/lighthouse/commit/364ba40))
* Introduce computedArtifacts (#583) ([c8662e3](https://github.com/GoogleChrome/lighthouse/commit/c8662e3))
* Keep track of the document URL post-redirects (#582) ([ac70731](https://github.com/GoogleChrome/lighthouse/commit/ac70731))
* launch-chrome: inform user about Chrome launch. refactor & cleanup. ([fdff2ae](https://github.com/GoogleChrome/lighthouse/commit/fdff2ae))
* merge latest manifest/display tests. ([af716df](https://github.com/GoogleChrome/lighthouse/commit/af716df))
* mocha tests unfortch can't rely on globbing ([35e649a](https://github.com/GoogleChrome/lighthouse/commit/35e649a))
* move manifest parser test to correct directory ([35eb5a1](https://github.com/GoogleChrome/lighthouse/commit/35eb5a1))
* move SW version test to audit to use possibly redirected URL ([46e1458](https://github.com/GoogleChrome/lighthouse/commit/46e1458))
* Moves from XHR to DevTools Protocol for manifest retrieval (#600) ([74690f1](https://github.com/GoogleChrome/lighthouse/commit/74690f1))
* overwrite loadData only when configured to ([b798f89](https://github.com/GoogleChrome/lighthouse/commit/b798f89))
* parse URLs in Web App Manifest relative to manifest itself ([f45ae69](https://github.com/GoogleChrome/lighthouse/commit/f45ae69))
* properly throw debug error when page does not include manifest ([6d2ae74](https://github.com/GoogleChrome/lighthouse/commit/6d2ae74))
* Readded $DISPLAY ([1b14da8](https://github.com/GoogleChrome/lighthouse/commit/1b14da8))
* refactor of gather-runner to clarify lifecycle ([8c5e7d1](https://github.com/GoogleChrome/lighthouse/commit/8c5e7d1))
* Refactor the JSON output. (#567) ([703ded6](https://github.com/GoogleChrome/lighthouse/commit/703ded6))
* Remove find command in runmocha ([81653a4](https://github.com/GoogleChrome/lighthouse/commit/81653a4))
* remove redundant gatherer lifecycle methods ([ac2f62d](https://github.com/GoogleChrome/lighthouse/commit/ac2f62d))
* rename computed artifact tests. ([5d20fa8](https://github.com/GoogleChrome/lighthouse/commit/5d20fa8))
* Rename lighthouse-cli tests as well ([9ee4c57](https://github.com/GoogleChrome/lighthouse/commit/9ee4c57))
* Revamp of the offline.js gatherer ([2b39d27](https://github.com/GoogleChrome/lighthouse/commit/2b39d27))
* Revamp smoketest, include offline & SW test ([543b422](https://github.com/GoogleChrome/lighthouse/commit/543b422))
* review feedback ([6add53a](https://github.com/GoogleChrome/lighthouse/commit/6add53a))
* Run audits sequentially. ([8fe81d8](https://github.com/GoogleChrome/lighthouse/commit/8fe81d8))
* s/traceName/passName ([f300f67](https://github.com/GoogleChrome/lighthouse/commit/f300f67))
* Save audit list into storage so it's kept for the next run (#595) ([5c72d72](https://github.com/GoogleChrome/lighthouse/commit/5c72d72))
* smoke test: clean up backgrounded processes. ([74c5f9c](https://github.com/GoogleChrome/lighthouse/commit/74c5f9c))
* squish saveArtifacts and saveAssets together. ([ea23dbd](https://github.com/GoogleChrome/lighthouse/commit/ea23dbd))
* support collecting network records per pass ([4ef3c98](https://github.com/GoogleChrome/lighthouse/commit/4ef3c98))
* terminology fixes and docs added to extension ([8dbd6fa](https://github.com/GoogleChrome/lighthouse/commit/8dbd6fa))
* Update first-meaningful-paint.js ([add0f03](https://github.com/GoogleChrome/lighthouse/commit/add0f03))
* update offline gatherer to use network recording changes ([db69edd](https://github.com/GoogleChrome/lighthouse/commit/db69edd))
* Update tracing-processor.js ([b526eb3](https://github.com/GoogleChrome/lighthouse/commit/b526eb3))
* readme: updates about m52, etc. ([54b93b9](https://github.com/GoogleChrome/lighthouse/commit/54b93b9))
* eslint: no longer ignore all of lighthouse-extension (#613) ([5e42394](https://github.com/GoogleChrome/lighthouse/commit/5e42394))
* docs: headless setup. ([9cb1536](https://github.com/GoogleChrome/lighthouse/commit/9cb1536))
* README: add link to debugging protocol and viewer ([7ba8830](https://github.com/GoogleChrome/lighthouse/commit/7ba8830))
* README: remove outdated install instructions ([5996db7](https://github.com/GoogleChrome/lighthouse/commit/5996db7))



<a name="1.1.2"></a>
## 1.1.2 (2016-08-06)

* 1.1.2 ([0269917](https://github.com/GoogleChrome/lighthouse/commit/0269917))
* addressing brendan's review for ALL the brownie points. ([685bda0](https://github.com/GoogleChrome/lighthouse/commit/685bda0))
* bump extension to 1.1.2 ([1d745c3](https://github.com/GoogleChrome/lighthouse/commit/1d745c3))
* Fixed links to small buttons ([f9de055](https://github.com/GoogleChrome/lighthouse/commit/f9de055))
* Generate audit list from configJson ([1b1cbdf](https://github.com/GoogleChrome/lighthouse/commit/1b1cbdf))
* Generate audit options in extension from configJSON ([a4bfc04](https://github.com/GoogleChrome/lighthouse/commit/a4bfc04))
* Update manifest-background-color.js ([38ba8a2](https://github.com/GoogleChrome/lighthouse/commit/38ba8a2))



<a name="1.1.1"></a>
## 1.1.1 (2016-08-05)

* 1.1.1 ([ed8e056](https://github.com/GoogleChrome/lighthouse/commit/ed8e056))
* Add and adjust cache-start-url test coverage ([81e98d0](https://github.com/GoogleChrome/lighthouse/commit/81e98d0))
* Add extra assertions on the state of debugString ([c7884d7](https://github.com/GoogleChrome/lighthouse/commit/c7884d7))
* Added audit configurations to extension ([561efc2](https://github.com/GoogleChrome/lighthouse/commit/561efc2))
* bump extension to 1.1.0 (now matches npm module) ([699eafd](https://github.com/GoogleChrome/lighthouse/commit/699eafd))
* bump extension to 1.1.1 ([ac4785e](https://github.com/GoogleChrome/lighthouse/commit/ac4785e))
* Clean up CLI logging, moving protocol work to --verbose. (#556) ([6663f6b](https://github.com/GoogleChrome/lighthouse/commit/6663f6b))
* cleanTrace acts on the whole trace ([fa837c3](https://github.com/GoogleChrome/lighthouse/commit/fa837c3))
* Delete launch-chrome.sh ([e90b128](https://github.com/GoogleChrome/lighthouse/commit/e90b128))
* Fix exception on missing manifest start_url ([269b5a8](https://github.com/GoogleChrome/lighthouse/commit/269b5a8))
* handle old and new trace object format ([7c9c44f](https://github.com/GoogleChrome/lighthouse/commit/7c9c44f))
* Manifest tests: Always use the manifest parser ([12bfb3a](https://github.com/GoogleChrome/lighthouse/commit/12bfb3a))
* sourcemaps for the extension off, to avoid the 4MB of tax. ([bfd3b02](https://github.com/GoogleChrome/lighthouse/commit/bfd3b02))
* Tweak to status messages. ([b914ea1](https://github.com/GoogleChrome/lighthouse/commit/b914ea1))



<a name="1.1.0"></a>
# 1.1.0 (2016-08-02)

* 1.1.0 ([d9a7f84](https://github.com/GoogleChrome/lighthouse/commit/d9a7f84))
* add test for traceviewer's require not throwing. ([7293f6e](https://github.com/GoogleChrome/lighthouse/commit/7293f6e))
* bump traceviewer to master. ([a628f62](https://github.com/GoogleChrome/lighthouse/commit/a628f62))
* clarify chrome remote interface var in CLI driver ([b6592d4](https://github.com/GoogleChrome/lighthouse/commit/b6592d4))
* cleanup of extension driver attachment and event registration ([69622b8](https://github.com/GoogleChrome/lighthouse/commit/69622b8))
* fix off-by-one error causing Infinity in 100% EIL ([2737165](https://github.com/GoogleChrome/lighthouse/commit/2737165))
* Fix traceviewer update instructions in README ([2f29085](https://github.com/GoogleChrome/lighthouse/commit/2f29085))
* Fixed version argument in yargs to display current cli version ([504ea95](https://github.com/GoogleChrome/lighthouse/commit/504ea95))
* handle new require for Mann-Whitney U statistics test. ([e0e1052](https://github.com/GoogleChrome/lighthouse/commit/e0e1052))
* Improve check for used JS features (#544) ([4f43470](https://github.com/GoogleChrome/lighthouse/commit/4f43470))
* move driver event handling to base class ([07b3ccb](https://github.com/GoogleChrome/lighthouse/commit/07b3ccb))
* Refactor npm scripts for mocha ([59fdea9](https://github.com/GoogleChrome/lighthouse/commit/59fdea9))
* switch to trace viewer's lean_config, instead of including ALL importers. ([7202494](https://github.com/GoogleChrome/lighthouse/commit/7202494))
* trace reading: only bind to the first tracingComplete event. ([fe634e7](https://github.com/GoogleChrome/lighthouse/commit/fe634e7))
* Update readme.md with trace changes. ([ab76af1](https://github.com/GoogleChrome/lighthouse/commit/ab76af1))
* extension: Don't lint in the watch loop. ([999d3bf](https://github.com/GoogleChrome/lighthouse/commit/999d3bf))
* extension: exclude source-map module from browserified bundles. ([61b8de3](https://github.com/GoogleChrome/lighthouse/commit/61b8de3))
* extension: log exceptions to bg page console. ([9d9642c](https://github.com/GoogleChrome/lighthouse/commit/9d9642c))



<a name="1.0.6"></a>
## 1.0.6 (2016-07-28)

* 1.0.6 ([e8bb926](https://github.com/GoogleChrome/lighthouse/commit/e8bb926))
* Adds auto-requested geolocation audit (#510) ([60a06c5](https://github.com/GoogleChrome/lighthouse/commit/60a06c5))
* Adds content width audit (#493) ([f9bdc7f](https://github.com/GoogleChrome/lighthouse/commit/f9bdc7f))
* Checks cache for start URL (#507) ([4a66309](https://github.com/GoogleChrome/lighthouse/commit/4a66309))
* Cleanup harmony scripts #513 (#516) ([da09ffb](https://github.com/GoogleChrome/lighthouse/commit/da09ffb))
* compat note about firstContentfulPaint trace event. ([3e81a6d](https://github.com/GoogleChrome/lighthouse/commit/3e81a6d))
* config requires absolute paths ([9560a42](https://github.com/GoogleChrome/lighthouse/commit/9560a42))
* delete lighthouse-core/package.json ([d07719e](https://github.com/GoogleChrome/lighthouse/commit/d07719e))
* Do the last (clean-state) reload in parallel with finishing the report (#522) ([c14e7a3](https://github.com/GoogleChrome/lighthouse/commit/c14e7a3))
* Extension popup: styling ([50c3ced](https://github.com/GoogleChrome/lighthouse/commit/50c3ced))
* Faster smoketest. Fix Flaky works-offline gather (#506) ([2fdde48](https://github.com/GoogleChrome/lighthouse/commit/2fdde48)), closes [#506](https://github.com/GoogleChrome/lighthouse/issues/506)
* Fix (and speed up) extension browserify post-config refactor. (#499) ([563ae0c](https://github.com/GoogleChrome/lighthouse/commit/563ae0c)), closes [#499](https://github.com/GoogleChrome/lighthouse/issues/499)
* Fix cachecontents test on HTTP pages ([e6fa594](https://github.com/GoogleChrome/lighthouse/commit/e6fa594))
* Fix scoring exception in handlebars (#509) ([bcff128](https://github.com/GoogleChrome/lighthouse/commit/bcff128)), closes [#509](https://github.com/GoogleChrome/lighthouse/issues/509)
* Fixes lint errors ([bd5f8e1](https://github.com/GoogleChrome/lighthouse/commit/bd5f8e1))
* Handles ports for SW. (#535) ([8c39f91](https://github.com/GoogleChrome/lighthouse/commit/8c39f91)), closes [#532](https://github.com/GoogleChrome/lighthouse/issues/532)
* incl critical-request-chains in traceprocessor example ([4636ffe](https://github.com/GoogleChrome/lighthouse/commit/4636ffe))
* manifest display must be one of the 3 allowed values. ([98c4980](https://github.com/GoogleChrome/lighthouse/commit/98c4980))
* move driver/ to gather/ ([35d0360](https://github.com/GoogleChrome/lighthouse/commit/35d0360))
* Moved everything from lighthouse-core to ligthouse ([1b998a3](https://github.com/GoogleChrome/lighthouse/commit/1b998a3))
* note about excluded cpu profile trace category. ([4f66e0d](https://github.com/GoogleChrome/lighthouse/commit/4f66e0d))
* Removes the 'module' folder from main. ([07e4958](https://github.com/GoogleChrome/lighthouse/commit/07e4958))
* Removes unused test ([3585eef](https://github.com/GoogleChrome/lighthouse/commit/3585eef))
* rename gatherer base class to gatherer ([0c7bef7](https://github.com/GoogleChrome/lighthouse/commit/0c7bef7))
* Reuse existing tab fallback (for Chrome headless) ([27d3ed8](https://github.com/GoogleChrome/lighthouse/commit/27d3ed8))
* Show the test progress (#517) ([ffde8e7](https://github.com/GoogleChrome/lighthouse/commit/ffde8e7))
* Skip offline-ready smoketest (#520) ([5d97d38](https://github.com/GoogleChrome/lighthouse/commit/5d97d38))
* smoke test: simplify --harmony branching. check for viewport ([d45883a](https://github.com/GoogleChrome/lighthouse/commit/d45883a))
* This is a 0.1 definition of Time to Interactive (TTI) which considers ([d0d3829](https://github.com/GoogleChrome/lighthouse/commit/d0d3829))
* Trace buckets (#531) ([1275762](https://github.com/GoogleChrome/lighthouse/commit/1275762))
* Traces that are passed in through the config file are cleaned ([1c62db3](https://github.com/GoogleChrome/lighthouse/commit/1c62db3))
* update error message on failed connection to use the npm explore npm run chrome cmd ([466beff](https://github.com/GoogleChrome/lighthouse/commit/466beff))
* Update manifest-display.js ([3b3e3de](https://github.com/GoogleChrome/lighthouse/commit/3b3e3de))
* Wait for trace data to arrive before continuing (#541) ([df6e013](https://github.com/GoogleChrome/lighthouse/commit/df6e013))
* tti: simplify logic grabbing 85% vis complete ([3906dee](https://github.com/GoogleChrome/lighthouse/commit/3906dee))
* smoketest: do full default run against our basic html page. (#534) ([3e632f9](https://github.com/GoogleChrome/lighthouse/commit/3e632f9))
* cli: use logger to print status messages (#530) ([cc3cca4](https://github.com/GoogleChrome/lighthouse/commit/cc3cca4))
* travis: force install extension deps. ([b17f026](https://github.com/GoogleChrome/lighthouse/commit/b17f026))
* readme: include CLI flags ([d34e5bb](https://github.com/GoogleChrome/lighthouse/commit/d34e5bb))
* readme: notes for config & trace-processor usage ([eb81929](https://github.com/GoogleChrome/lighthouse/commit/eb81929))
* readme: notes on node/chrome version compat ([d960c79](https://github.com/GoogleChrome/lighthouse/commit/d960c79))
* readme: update dep graph visualization ([0435803](https://github.com/GoogleChrome/lighthouse/commit/0435803))
* Travis: enable testing of node v4 + --harmony (#501) ([fe5f57d](https://github.com/GoogleChrome/lighthouse/commit/fe5f57d))



<a name="1.0.5"></a>
## 1.0.5 (2016-07-08)

* 1.0.5 ([90ffa1a](https://github.com/GoogleChrome/lighthouse/commit/90ffa1a))
* CLI shouldn't necc exit on semver check ([dec44de](https://github.com/GoogleChrome/lighthouse/commit/dec44de))
* Install child folder deps through helper script (#500) ([e28ee77](https://github.com/GoogleChrome/lighthouse/commit/e28ee77))



<a name="1.0.4"></a>
## 1.0.4 (2016-07-08)
