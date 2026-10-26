#!/bin/sh
set -eu
# Publish only explicitly selected static files. Never copy the checkout wholesale.
mkdir -p public
cp index.html styles.css script.js integrations.js _headers public/
cp assets/favicon.png assets/apple-touch-icon.png public/
cp "LOGO PNG.png" "public/LOGO PNG.png"
mkdir -p public/assets/fonts
cp assets/fonts/*.woff2 assets/fonts/OFL-Montserrat.txt public/assets/fonts/
for asset in cim-studio-logo-ink.png collection.webp collection-detail.webp collection-space.webp cover-pool.webp cover-volcan.webp cover-soporte.webp cover-tramuntana.webp cover-tramuntana-final.webp cover-pool-s135-b120-srgb.webp cover-volcan-s135-b120-srgb.webp cover-soporte-s135-b120-srgb.webp cover-tramuntana-s135-b120-srgb.webp cover-jaboneras-s135-b120-srgb.webp; do
  if [ -f "assets/$asset" ]; then
    cp "assets/$asset" "public/assets/$asset"
  fi
done

mkdir -p public/bienvenida
cp welcome/index.html welcome/welcome.css welcome/welcome.js public/bienvenida/
mkdir -p public/careers/preferences
cp careers/preferences/index.html careers/preferences/preferences.css careers/preferences/preferences.js public/careers/preferences/
mkdir -p public/controlled/newsletter
cp controlled/newsletter/index.html controlled/newsletter/test.css controlled/newsletter/test.js public/controlled/newsletter/
mkdir -p public/controlled/registrations
cp controlled/registrations/index.html controlled/registrations/test.css controlled/registrations/test.js public/controlled/registrations/
node scripts/prepare-legal.mjs
node scripts/prepare-launch.mjs
node scripts/build-subscription-welcome.mjs
cp _redirects public/
node scripts/prepare-editorial.mjs
