A few assorted scripts and tips to make hacking on Lighthouse a bit easier

## Unhandled promise rejections

Getting errors like these?

> (node:12732) UnhandledPromiseRejectionWarning: Unhandled promise rejection (rejection id: 1)
> (node:12732) DeprecationWarning: Unhandled promise rejections are deprecated. In the future, promise rejections that are not handled will terminate the Node.js process with a non-zero exit code.

Use [`--trace-warnings`](https://medium.com/@jasnell/introducing-process-warnings-in-node-v6-3096700537ee) to get actual stack traces.

```sh
node --trace-warnings lighthouse-cli http://example.com
```

## Updating fixture dumps

`lighthouse-core/test/results/samples_v2.json` is generated from running LH against
dbw_tester.html. To update this file, start a local server on port `8080` and serve the directory `lighthouse-cli/test/fixtures`. Then run:

```sh
npm run start -- --output=json --output-path=lighthouse-core/test/results/sample_v2.json http://localhost:8080/dobetterweb/dbw_tester.html
```

After updating, consider deleting any irrelevant changes from the diff (exact timings, timestamps, etc). Be sure to run the tests.

## Iterating on the v2 report

This will generate new reports from the same results json.

```sh
# capture some results first:
lighthouse --output=json http://example.com > temp.report.json

# quickly generate reports:
node generate_report_v2.js > temp.report.html; open temp.report.html
```
```js
// generate_report_v2.js
'use strict';

const ReportGeneratorV2 = require('./lighthouse-core/report/v2/report-generator');
const results = require('./temp.report.json');
const html = new ReportGeneratorV2().generateReportHtml(results);

console.log(html);
```

## Debugging Travis via docker image

You can do a local docker image install of Travis to better inspect a travis build:

* [How to run travis-ci locally - Stack Overflow](https://stackoverflow.com/questions/21053657/how-to-run-travis-ci-locally)
* [Common Build Problems - Travis CI](https://docs.travis-ci.com/user/common-build-problems/#Troubleshooting-Locally-in-a-Docker-Image)

```sh
docker run --name travis-debug -dit travisci/ci-garnet:packer-1496954857 /sbin/init
docker exec -it travis-debug bash -l

# once inside, change to travis user, rather than root
su - travis

# once on the travis user, make a clone of lighthouse and play around
```

```sh
# you may also want to mount a local folder into your docker instance. 
# This will mount your local machines's ~/temp/trav folder into the container's /home/travis/mountpoint folder
docker run -v $HOME/temp/trav:/home/travis/mountpoint --name travis-debug -dit travisci/ci-garnet:packer-1496954857 /sbin/init

```

You can then run the travis commands (e.g. `travis compile`) to install an environment and run the build script:

[travis-ci/travis-build: .travis.yml =&gt; build.sh converter](https://github.com/travis-ci/travis-build#invocation)

