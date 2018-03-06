#!/usr/bin/env bash

##
# @license Copyright 2017 Google Inc. All Rights Reserved.
# Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
# Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
##

set -e

random_number="$(shuf -i 1-10000 -n 1)";

# paths
local_path="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
plots_path="$local_path/.."
out_path="$plots_path/out"
out_backup_folder="out_backup_$random_number"
out_backup_path="$plots_path/$out_backup_folder"

analyze_script="$plots_path/analyze.js"
clean_script="$plots_path/clean.js"
measure_script="$plots_path/measure.js"

echo "Starting plots smoke test"

if [ -d "$out_path" ]; then
  mv $out_path $out_backup_path
  echo "Moved existing plots/out folder to plots/$out_backup_folder"
fi

node $measure_script --site https://google.com/ -n 2 --disable-network-throttling --disable-cpu-throttling --out $out_path
node $analyze_script $out_path
node $clean_script

echo "Finished plots smoke test without errors"
