#!/bin/sh
set -eu
# Publish only explicitly selected static files. Never copy the checkout wholesale.
mkdir -p public
cp index.html styles.css script.js integrations.js _headers public/
cp assets/favicon.png assets/apple-touch-icon.png public/
cp "LOGO PNG.png" "public/LOGO PNG.png"
mkdir -p public/assets
for asset in cim-studio-logo-ink.png collection.webp collection-detail.webp collection-space.webp cover-pool.webp cover-volcan.webp cover-soporte.webp cover-tramuntana.webp cover-tramuntana-final.webp cover-pool-s135-b120-srgb.webp cover-volcan-s135-b120-srgb.webp cover-soporte-s135-b120-srgb.webp cover-tramuntana-s135-b120-srgb.webp cover-jaboneras-s135-b120-srgb.webp; do
  if [ -f "assets/$asset" ]; then
    cp "assets/$asset" "public/assets/$asset"
  fi
done

node scripts/prepare-legal.mjs
node scripts/prepare-launch.mjs
