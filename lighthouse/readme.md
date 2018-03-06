# Lighthouse  [![Linux Build Status](https://img.shields.io/travis/GoogleChrome/lighthouse/master.svg)](https://travis-ci.org/GoogleChrome/lighthouse) [![Windows Build Status](https://img.shields.io/appveyor/ci/paulirish/lighthouse/master.svg)](https://ci.appveyor.com/project/paulirish/lighthouse/branch/master) [![Coverage Status](https://img.shields.io/coveralls/GoogleChrome/lighthouse/master.svg)](https://coveralls.io/github/GoogleChrome/lighthouse?branch=master) [![NPM lighthouse package](https://img.shields.io/npm/v/lighthouse.svg)](https://npmjs.org/package/lighthouse)

> Lighthouse analyzes web apps and web pages, collecting modern performance metrics and insights on developer best practices.

## Using Lighthouse in Chrome DevTools

Lighthouse is integrated directly into the Chrome Developer Tools, under the "Audits" panel.

**Installation**: install [Chrome](https://www.google.com/chrome/browser).

**Run it**: open Chrome DevTools, select the Audits panel, and hit "Perform an Audit...".

<img width="350px" alt="Lighthouse integration in Chrome DevTools" src="https://cloud.githubusercontent.com/assets/238208/26366636/ada298f8-3fa0-11e7-9da5-ede2c906d10c.png">

## Using the Chrome extension

**Installation**: [install the extension](https://chrome.google.com/webstore/detail/lighthouse/blipmdconlkpinefehnmjammfjpmpbjk) from the Chrome Web Store.

**Run it**: follow the [extension quick-start guide](https://developers.google.com/web/tools/lighthouse/#extension).

## Using the Node CLI

_Lighthouse requires Node 6 or later._

**Installation**:

```sh
npm install -g lighthouse
# or use yarn:
# yarn global add lighthouse
```

**Run it**: `lighthouse https://airhorner.com/`

By default, Lighthouse writes the report to an HTML file. You can control the output format by passing flags.

### CLI options

```sh
$ lighthouse --help

lighthouse <url>

Logging:
  --verbose  Displays verbose logging                                                                                                      [boolean]
  --quiet    Displays no progress, debug logs or errors                                                                                    [boolean]

Configuration:
  --save-assets                  Save the trace contents & screenshots to disk                                                             [boolean]
  --list-all-audits              Prints a list of all available audits and exits                                                           [boolean]
  --list-trace-categories        Prints a list of all required trace categories and exits                                                  [boolean]
  --additional-trace-categories  Additional categories to capture with the trace (comma-delimited).
  --config-path                  The path to the config JSON.
  --chrome-flags                 Custom flags to pass to Chrome (space-delimited). For a full list of flags, see
                                 http://peter.sh/experiments/chromium-command-line-switches/.

                                 Environment variables:
                                 CHROME_PATH: Explicit path of intended Chrome binary. If set must point to an executable of a build of
                                 Chromium version 54.0 or later. By default, any detected Chrome Canary or Chrome (stable) will be launched.
                                                                                                                                       [default: ""]
  --perf                         Use a performance-test-only configuration                                                                 [boolean]
  --port                         The port to use for the debugging protocol. Use 0 for a random port                                    [default: 0]
  --hostname                     The hostname to use for the debugging protocol.                                              [default: "localhost"]
  --max-wait-for-load            The timeout (in milliseconds) to wait before the page is considered done loading and the run should continue.
                                 WARNING: Very high values can lead to large traces and instability                                 [default: 45000]
  --enable-error-reporting       Enables error reporting, overriding any saved preference. --no-enable-error-reporting will do the opposite. More:
                                 https://git.io/vFFTO
  --gather-mode, -G              Collect artifacts from a connected browser and save to disk. If audit-mode is not also enabled, the run will quit
                                 early.                                                                                                    [boolean]
  --audit-mode, -A               Process saved artifacts from disk                                                                         [boolean]

Output:
  --output       Reporter for the results, supports multiple values                        [choices: "json", "html", "domhtml"] [default: "domhtml"]
  --output-path  The file path to output the results. Use 'stdout' to write to stdout.
                 If using JSON output, default is stdout.
                 If using HTML output, default is a file in the working directory with a name based on the test URL and date.
                 If using multiple outputs, --output-path is ignored.
                 Example: --output-path=./lighthouse-results.html
  --view         Open HTML report in your browser                                                                                          [boolean]

Options:
  --help                        Show help                                                                                                  [boolean]
  --version                     Show version number                                                                                        [boolean]
  --blocked-url-patterns        Block any network requests to the specified URL patterns                                                     [array]
  --disable-storage-reset       Disable clearing the browser cache and other storage APIs before a run                                     [boolean]
  --disable-device-emulation    Disable Nexus 5X emulation                                                                                 [boolean]
  --disable-cpu-throttling      Disable CPU throttling                                                                    [boolean] [default: false]
  --disable-network-throttling  Disable network throttling                                                                                 [boolean]
  --extra-headers               Set extra HTTP Headers to pass with request                                                                 [string]

Examples:
  lighthouse <url> --view                                                   Opens the HTML report in a browser after the run completes
  lighthouse <url> --config-path=./myconfig.js                              Runs Lighthouse with your own configuration: custom audits, report
                                                                            generation, etc.
  lighthouse <url> --output=json --output-path=./report.json --save-assets  Save trace, screenshots, and named JSON report.
  lighthouse <url> --disable-device-emulation --disable-network-throttling  Disable device emulation
  lighthouse <url> --chrome-flags="--window-size=412,732"                   Launch Chrome with a specific window size
  lighthouse <url> --quiet --chrome-flags="--headless"                      Launch Headless Chrome, turn off logging
  lighthouse <url> --extra-headers "{\"Cookie\":\"monster=blue\"}"          Stringify\'d JSON HTTP Header key/value pairs to send in requests
  lighthouse <url> --extra-headers=./path/to/file.json                      Path to JSON file of HTTP Header key/value pairs to send in requests

For more information on Lighthouse, see https://developers.google.com/web/tools/lighthouse/.
```

##### Output Examples

```sh
lighthouse
# saves `./<HOST>_<DATE>.report.html`

lighthouse --output json
# json output sent to stdout

lighthouse --output html --output-path ./report.html
# saves `./report.html`

# NOTE: specifying an output path with multiple formats ignores your specified extension for *ALL* formats
lighthouse --output json --output html --output-path ./myfile.json
# saves `./myfile.report.json` and `./myfile.report.html`

lighthouse --output json --output html
# saves `./<HOST>_<DATE>.report.json` and `./<HOST>_<DATE>.report.html`

lighthouse --output-path=~/mydir/foo.out --save-assets
# saves `~/mydir/foo.report.html`
# saves `~/mydir/foo-0.trace.json` and `~/mydir/foo-0.screenshots.html`

lighthouse --output-path=./report.json --output json
# saves `./report.json`
```

##### Lifecycle Examples
You can run a subset of Lighthouse's lifecycle if desired via the `--gather-mode` (`-G`) and  `--audit-mode` (`-A`) CLI flags.

```sh
lighthouse -G http://example.com
# launches browser, collects artifacts, saves them to disk (in `./latest-run/`) and quits

lighthouse -A http://example.com
# skips browser interaction, loads artifacts from disk (in `./latest-run/`), runs audits on them, generates report

lighthouse -GA http://example.com
# Normal gather + audit run, but also saves collected artifacts to disk for subsequent -A runs.
```


#### Notes on Error Reporting

The first time you run the CLI you will be prompted with a message asking you if Lighthouse can anonymously report runtime exceptions. The Lighthouse team uses this information to detect new bugs and avoid regressions. Opting out will not affect your ability to use Lighthouse in any way. [Learn more](https://github.com/GoogleChrome/lighthouse/blob/master/docs/error-reporting.md).

## Viewing a report

Lighthouse can produce a report as JSON or HTML.

HTML report:

![Lighthouse report](https://cloud.githubusercontent.com/assets/238208/26369813/abea39e4-3faa-11e7-8d5c-e116696518b4.png)

### Online Viewer

Running Lighthouse with the `--output=json` flag generates a json dump of the run.
You can view this report online by visiting <https://googlechrome.github.io/lighthouse/viewer/>
and dragging the file onto the app. You can also use the "Export" button from the
top of any Lighthouse HTML report and open the report in the
[Lighthouse Viewer](https://googlechrome.github.io/lighthouse/viewer/).

In the Viewer, reports can be shared by clicking the share icon in the top
right corner and signing in to GitHub.

> **Note**: shared reports are stashed as a secret Gist in GitHub, under your account.

## Docs & Recipes

Useful documentation, examples, and recipes to get you started.

**Docs**

- [Using Lighthouse programmatically](./docs/readme.md#using-programmatically)
- [Testing a site with authentication](./docs/readme.md#testing-on-a-site-with-authentication)
- [Testing on a mobile device](./docs/readme.md#testing-on-a-mobile-device)
- [Lighthouse Architecture](./docs/architecture.md)

**Recipes**

- [gulp](docs/recipes/gulp) - helpful for CI integration
- [Custom Audit example](./docs/recipes/custom-audit) - extend Lighthouse, run your own audits

**Videos**

The session from Google I/O 2017 covers architecture, writing custom audits,
GitHub/Travis/CI integration, headless Chrome, and more:

[![Lighthouse @ Google I/O](https://img.youtube.com/vi/NoRYn6gOtVo/0.jpg)](https://www.youtube.com/watch?v=NoRYn6gOtVo)

_click to watch the video_

## Develop

Read on for the basics of hacking on Lighthouse. Also see [Contributing](./CONTRIBUTING.md)
for detailed information.

### Setup

```sh
# yarn should be installed first

git clone https://github.com/GoogleChrome/lighthouse

cd lighthouse
yarn
yarn install-all
yarn build-all

# The CLI is authored in TypeScript and requires compilation.
# If you need to make changes to the CLI, run the TS compiler in watch mode:
# cd lighthouse-cli && yarn dev
```

### Run

```sh
node lighthouse-cli http://example.com
```

> **Getting started tip**: `node --inspect --debug-brk lighthouse-cli http://example.com` to open up Chrome DevTools and step
through the entire app. See [Debugging Node.js with Chrome
DevTools](https://medium.com/@paul_irish/debugging-node-js-nightlies-with-chrome-devtools-7c4a1b95ae27#.59rma3ukm)
for more info.

### Tests

```sh
# lint and test all files
yarn test

# watch for file changes and run tests
#   Requires http://entrproject.org : brew install entr
yarn watch

## run linting, unit, and smoke tests separately
yarn lint
yarn unit
yarn smoke

## run closure compiler (on whitelisted files)
yarn closure
## import your report renderer into devtools-frontend and run devtools closure compiler
yarn compile-devtools
```

## Lighthouse Integrations
This section details projects that have integrated Lighthouse. If you're working on a cool project integrating Lighthouse and would like to be featured here, file an issue to this repo or tweet at us [@_____lighthouse](https://twitter.com/____lighthouse?lang=en)

* **[Calibre](https://calibreapp.com)** - Calibre is a web performance monitoring tool running Lighthouse continuously or on-demand via an API. Test using emulated devices and connection speeds from a number of geographical locations. Set budgets and improve performance with actionable guidelines. Calibre comes with a free 14-day trial.

* **[Greta Lighthouse](https://lighthouse.greta.io/)** - Greta Lighthouse is a tool that lets you run free Lighthouse tests from anywhere in the world. It provides insights into your users' perceived performance and recommendations on how to improve. The tool considers parameters such as location and type of device to simulate real user conditions. [Greta](https://greta.io/) also provides a new type of platform that helps companies understand, control, and improve their users’ experience via an innovative approach to content delivery.

* **[HTTPArchive](http://httparchive.org/)** - HTTPArchive tracks how the web is built by crawling 500k pages with Web Page Test, including Lighthouse results, and stores the information in BigQuery where it is [publicly available](https://discuss.httparchive.org/t/quickstart-guide-to-exploring-the-http-archive/682).

* **[Treo](https://treo.sh)** - Treo is Lighthouse as a Service. It provides regression testing, geographical regions, custom networks, and integrations with GitHub & Slack. Treo is a paid product with plans for solo-developers and teams.

* **[Web Page Test](https://www.webpagetest.org)** — An [open source](https://github.com/WPO-Foundation/webpagetest) tool for measuring and analyzing the performance of web pages on real devices. Users can choose to produce a Lighthouse report alongside the analysis of WebPageTest results.

## Related Projects

* **[webpack-lighthouse-plugin](https://github.com/addyosmani/webpack-lighthouse-plugin)** - run Lighthouse from a Webpack build.
* **[lighthouse-mocha-example](https://github.com/justinribeiro/lighthouse-mocha-example)** - gather performance metrics via Lighthouse and tests them in Mocha
* **[pwmetrics](https://github.com/paulirish/pwmetrics/)** - gather performance metrics
* **[lighthouse-hue](https://github.com/ebidel/lighthouse-hue)** - set the color of Philips Hue lights based on a Lighthouse score
   * **[lighthouse-magic-light](https://github.com/manekinekko/lighthouse-magic-light)** set the color of the MagicLight Bluetooth Smart Light Bulb based on Lighthouse score
* **[lighthouse-batch](https://www.npmjs.com/package/lighthouse-batch)** - run Lighthouse over a number of sites and generate a summary of their metrics/scores.
* **[lighthouse-cron](https://github.com/thearegee/lighthouse-cron)** - Cron multiple batch Lighthouse audits and emit results for sending to remote server.
* **[lightcrawler](https://github.com/github/lightcrawler)** - Crawl a website and run each page found through Lighthouse.


## FAQ

### How does Lighthouse work?

See [Lighthouse Architecture](./docs/architecture.md).

### Can I configure the lighthouse run?

Yes! Details in [Lighthouse configuration](./docs/configuration.md).

### How does Lighthouse use network throttling, and how can I make it better?

Good question. Network and CPU throttling are applied by default in a Lighthouse run. The network
attempts to emulate 3G and the CPU is slowed down 4x from your machine's default speed. If you
prefer to run Lighthouse without throttling, you'll have to use the CLI and disable it with the
`--disable-*` flags mentioned above.

Read more in our [guide to network throttling](./docs/throttling.md).

### Are results sent to a remote server?

Nope. Lighthouse runs locally, auditing a page using a local version of the Chrome browser installed the
machine. Report results are never processed or beaconed to a remote server.

### How do I author custom audits to extend Lighthouse?

> **Tip**: see [Lighthouse Architecture](./docs/architecture.md) for more information
on terminology and architecture.

Lighthouse can be extended to run custom audits and gatherers that you author.
This is great if you're already tracking performance metrics in your site and
want to surface those metrics within a Lighthouse report.

If you're interested in running your own custom audits, check out our
[Custom Audit Example](./docs/recipes/custom-audit) over in recipes.

### How do I contribute?

We'd love help writing audits, fixing bugs, and making the tool more useful!
See [Contributing](./CONTRIBUTING.md) to get started.

---

<p align="center">
  <img src="https://cloud.githubusercontent.com/assets/39191/22478294/23f662f6-e79e-11e6-8de3-ffd7be7bf628.png" alt="Lighthouse logo" height="150">
  <br>
  <b>Lighthouse</b>, ˈlītˌhous (n): a <s>tower or other structure</s> tool containing a beacon light
  to warn or guide <s>ships at sea</s> developers.
</p>
