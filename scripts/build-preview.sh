#!/bin/sh
set -eu
# Publish only explicitly selected static files. Never copy the checkout wholesale.
mkdir -p public
cp index.html styles.css script.js public/
cp "LOGO PNG.png" "public/LOGO PNG.png"
mkdir -p public/assets
for asset in cim-studio-logo-ink.png collection.webp collection-detail.webp collection-space.webp cover-pool.webp cover-volcan.webp cover-soporte.webp cover-tramuntana.webp cover-tramuntana-final.webp; do
  if [ -f "assets/$asset" ]; then
    cp "assets/$asset" "public/assets/$asset"
  fi
done
