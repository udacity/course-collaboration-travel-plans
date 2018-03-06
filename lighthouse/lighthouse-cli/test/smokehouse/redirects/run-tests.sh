#!/usr/bin/env bash

node lighthouse-cli/test/fixtures/static-server.js &

sleep 0.5s

config="lighthouse-cli/test/smokehouse/redirects-config.js"
expectations="lighthouse-cli/test/smokehouse/redirects/expectations.js"

# run smoketest, expecting results found in offline-expectations
yarn smokehouse --config-path=$config --expectations-path=$expectations
exit_code=$?

# kill test servers
kill $(jobs -p)

exit "$exit_code"
