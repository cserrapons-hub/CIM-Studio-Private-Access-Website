#!/bin/sh
set -eu
# Publish only explicitly selected static files. Never copy the checkout wholesale.
mkdir -p public
cp index.html styles.css script.js public/
mkdir -p public/assets
for asset in cim-studio-logo.png collection.jpg; do
  if [ -f "assets/$asset" ]; then
    cp "assets/$asset" "public/assets/$asset"
  fi
done
