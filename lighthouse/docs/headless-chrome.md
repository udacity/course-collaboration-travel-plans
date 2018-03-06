# Running Lighthouse using headless Chrome

## CLI (headless)

Setup:

```sh
# get node 6
curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash - &&\
sudo apt-get install -y nodejs

# get chromium (stable)
apt-get install chromium-browser

# install lighthouse
npm i -g lighthouse
```

Kick off run of Lighthouse using headless Chrome:

```sh
lighthouse --chrome-flags="--headless" https://github.com
```

## CLI (xvfb)

Alternatively, you can run full Chrome + xvfb instead of headless mode. These steps worked on Debian Jessie:

```sh
# get node 6
curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
sudo apt-get install -y nodejs

# get chromium (stable) and Xvfb
apt-get install chromium-browser xvfb

# install lighthouse
npm i -g lighthouse
```

Run it:

```sh
export DISPLAY=:1.5
TMP_PROFILE_DIR=$(mktemp -d -t lighthouse.XXXXXXXXXX)

# start up chromium inside xvfb
xvfb-run --server-args='-screen 0, 1024x768x16' \
    chromium-browser --user-data-dir=$TMP_PROFILE_DIR
    --start-maximized \
    --no-first-run \
    --remote-debugging-port=9222 "about:blank"

# Kick off Lighthouse run on same port as debugging port.
lighthouse --port=9222 https://github.com
```

## Node module

Install:

```sh
yarn add lighthouse
```

Run it:

```javascript
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

function launchChromeAndRunLighthouse(url, flags = {}, config = null) {
  return chromeLauncher.launch(flags).then(chrome => {
    flags.port = chrome.port;
    return lighthouse(url, flags, config).then(results =>
      chrome.kill().then(() => results));
  });
}

const flags = {
  chromeFlags: ['--headless']
};

launchChromeAndRunLighthouse('https://github.com', flags).then(results => {
  // Use results!
});
```

## Other resources

Other resources you might find helpful:

- [Getting Started with Headless Chrome](https://developers.google.com/web/updates/2017/04/headless-chrome)
- Example [Dockerfile](https://github.com/ebidel/lighthouse-ci/blob/master/builder/Dockerfile)
- Lighthouse's [`.travis.yml`](https://github.com/GoogleChrome/lighthouse/blob/master/.travis.yml)
