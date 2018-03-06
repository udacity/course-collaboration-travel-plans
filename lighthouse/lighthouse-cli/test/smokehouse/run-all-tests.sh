#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

for d in "$DIR"/*/ ; do
  bash "${d}run-tests.sh"
  if [ $? -ne 0 ]
  then
    echo "Error: $d smoke test failed"
    exit 1
  fi
done
