# Lighthouse Metrics Analysis

Online at https://googlechrome.github.io/lighthouse/plots/

For context and roadmap, please see issue:
https://github.com/GoogleChrome/lighthouse/issues/1924

## Workflow

### Setup

You need to build lighthouse first.

### Generating & viewing charts

```
# Run lighthouse to collect metrics data
$ node measure.js

# OR if you want to specify an out directory
$ node measure.js --out out-123

# Analyze the data to generate a summary file (i.e. out-hello/generated-results.js)
# This will launch the charts web page in the browser
# node analyze.js {out_directory}
$ node analyze.js ./out-hello

# Generate dashboard using a parent folder with multiple batch results
$ node generate-dashboard.js out-parent-folder

# Or you can specify each batch result explicitly
$ node generate-dashboard.js out-1 out-2 out-3


```

### Advanced usage

```
$ node measure.js --help

node measure.js [options]

Lighthouse settings:
  --disable-device-emulation    Disable Nexus 5X emulation                                                     [boolean]
  --disable-cpu-throttling      Disable CPU throttling                                                         [boolean]
  --disable-network-throttling  Disable network throttling                                                     [boolean]

Options to specify sites:
  --sites-path  Include relative path of a json file with urls to run                              [default: "sites.js"]
  --subset      Measure a subset of popular sites
  --site        Include a specific site url to run

Options:
  --help            Show help                                                                                  [boolean]
  --out             Custom out path
  -n                Number of runs per site                                                                 [default: 3]
  --reuse-chrome    Reuse the same Chrome instance across all site runs
  --keep-first-run  If you use --reuse-chrome, by default the first run results are discarded

Examples:
  node measure.js -n 3 --sites-path ./sample-sites.json
  node measure.js --site https://google.com/
  node measure.js --subset
```