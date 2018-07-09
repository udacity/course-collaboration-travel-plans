#!/bin/bash

set -e

DIRNAME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
LH_ROOT_PATH="$DIRNAME/../../.."
cd $LH_ROOT_PATH

if [[ -f lantern-data/site-index-plus-golden-expectations.json ]] && ! [[ "$FORCE" ]]; then
  echo "Lantern data already detected, done."
  exit 0
fi

rm -rf lantern-data/
mkdir lantern-data/ && cd lantern-data/

# snapshot of ~100 traces with no throttling recorded 2017-12-06 on a HP z840 workstation
TAR_URL="https://drive.google.com/a/chromium.org/uc?id=1_w2g6fQVLgHI62FApsyUDejZyHNXMLm0&amp;export=download"
curl -o lantern-traces.tar.gz -L $TAR_URL

tar -xzf lantern-traces.tar.gz
rm lantern-traces.tar.gz
