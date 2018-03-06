#!/usr/bin/env node

'use strict';

/**
 * chrome-launcher has moved to its own repository and npm package.
 * https://github.com/GoogleChrome/chrome-launcher
 * https://www.npmjs.com/package/chrome-launcher
 * This script preserved for Lighthouse's chrome-debug binary, but but file and
 * bin entry will be removed in next major release.
 */

/**
 * @fileoverview Script to launch a clean Chrome instance on-demand.
 *
 * Assuming Lighthouse is installed globally or `npm link`ed, use via:
 *     chrome-debug
 * Optionally enable extensions or pass a port, additional chrome flags, and/or a URL
 *     chrome-debug --port=9222
 *     chrome-debug http://goat.com
 *     chrome-debug --show-paint-rects
 *     chrome-debug --enable-extensions
 */

const {launch} = require('chrome-launcher');

const args = process.argv.slice(2);
let chromeFlags;
let startingUrl;
let port;
let enableExtensions;

if (args.length) {
  chromeFlags = args.filter(flag => flag.startsWith('--'));

  const portFlag = chromeFlags.find(flag => flag.startsWith('--port='));
  port = portFlag && portFlag.replace('--port=', '');

  enableExtensions = !!chromeFlags.find(flag => flag === '--enable-extensions');

  startingUrl = args.find(flag => !flag.startsWith('--'));
}

launch({
  startingUrl,
  port,
  enableExtensions,
  chromeFlags,
})
// eslint-disable-next-line no-console
.then(v => console.log(`✨  Chrome debugging port: ${v.port}`));
