#!/bin/sh

# Step 0. Setup environment
export KTLINT_VERSION=$1
export GITHUB_TOKEN=$2

# Step 1. Install ktlint
if [ "$KTLINT_VERSION" = "latest" ] ; then
  curl -sSL https://api.github.com/repos/pinterest/ktlint/releases/latest \
    | grep "browser_download_url.*ktlint\"" \
    | cut -d : -f 2,3 \
    | tr -d \" \
    | wget -qi -\
    && chmod a+x ktlint \
    && mv ktlint /usr/local/bin/
else
  curl -sSLO https://github.com/pinterest/ktlint/releases/download/"$KTLINT_VERSION"/ktlint \
    && chmod a+x ktlint \
    && mv ktlint /usr/local/bin/
fi

# Step 2. Run ktlint
ktlint --reporter=json,output=report.json --verbose || true

# Step 3. run nodejs
