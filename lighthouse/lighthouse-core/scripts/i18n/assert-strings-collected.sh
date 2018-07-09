#!/usr/bin/env bash

##
# @license Copyright 2018 Google Inc. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

pwd="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
lhroot_path="$pwd/../../.."
lh_tmp_path="$lhroot_path/.tmp"
mkdir -p "$lh_tmp_path"

purple='\033[1;35m'
red='\033[1;31m'
green='\033[1;32m'
colorText() {
  printf "\\n$2$1%b\\n" '\033[0m'
}

collectedstringsPath="$lhroot_path/lighthouse-core/lib/i18n/en-US.json";
currentstringsPath="$lh_tmp_path/current_strings.json";
freshstringsPath="$lh_tmp_path/fresh_strings.json";

# always run this before exiting
function teardown { rm -f "$currentstringsPath" "$freshstringsPath"; }
trap teardown EXIT

cp "$collectedstringsPath" "$currentstringsPath"

colorText "Collecting strings..." "$purple"
set -x
node "$lhroot_path/lighthouse-core/scripts/i18n/collect-strings.js" || exit 1
set +x

cp "$collectedstringsPath" "$freshstringsPath"

colorText "Diff'ing golden strings against the fresh strings" "$purple"
git --no-pager diff --color=always --no-index "$currentstringsPath" "$freshstringsPath"

# Use the return value from last command
retVal=$?

if [ $retVal -eq 0 ]; then
  colorText "✅  PASS. All strings have been collected." "$green"
else
  colorText "❌  FAIL. Strings have changed." "$red"
  echo "Commit the changes to lighthouse-core/lib/i18n/ update the strings."
fi
exit $retVal
