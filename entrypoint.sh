#!/bin/sh

# Step 1. Install ktlint
if [ "$INPUT_KTLINT_VERSION" = "latest" ] ; then
  curl -sSL https://api.github.com/repos/pinterest/ktlint/releases/latest \
    | grep "browser_download_url.*ktlint\"" \
    | cut -d : -f 2,3 \
    | tr -d \" \
    | wget -qi -\
    && chmod a+x ktlint \
    && mv ktlint /usr/local/bin/
else
  curl -sSLO https://github.com/pinterest/ktlint/releases/download/"$INPUT_KTLINT_VERSION"/ktlint \
    && chmod a+x ktlint \
    && mv ktlint /usr/local/bin/
fi

# Step 2. run nodejs
node index.js
