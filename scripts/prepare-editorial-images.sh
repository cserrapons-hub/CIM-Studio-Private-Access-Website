#!/bin/sh
# Optional authoring step. Commit generated assets; Cloudflare does not run ImageMagick.
# Requires ImageMagick 7 with LCMS/WebP support and a standard sRGB ICC profile.
set -eu
cd "$(dirname "$0")/.."
profile=${CIM_SRGB_PROFILE:-/usr/share/color/icc/sRGB.icc}
if [ ! -f "$profile" ]; then
  echo 'Set CIM_SRGB_PROFILE to a standard sRGB ICC profile.' >&2
  exit 1
fi
# CSS saturate(1.35), using Filter Effects sRGB coefficients (not HSL modulation).
# Multiplication by 1.20 then reproduces brightness(1.20); no contrast adjustment.
matrix='1.27545 -0.25025 -0.0252 -0.07455 1.09975 -0.0252 -0.07455 -0.25025 1.3248'
render() {
  magick "$1" -auto-orient -profile "$profile" -colorspace sRGB \
    -filter Lanczos -resize "$2" -color-matrix "$matrix" -evaluate multiply 1.20 \
    -strip -profile "$profile" -define webp:method=6 -quality 85 "$3"
}
# Current RGB JPEGs have no ICC and EXIF ColorSpace=65535 (uncalibrated).
# Interpret their pixels as sRGB, matching the prior untagged WebPs in the browser.
# Embedded source ICC profiles, if present, are converted before processing.
# Auto-orient precedes metadata removal.
render 'POOL.jpg' '700x706' 'assets/cover-pool-s135-b120-srgb.webp'
render 'VOLCAN.jpg' '1000x1093' 'assets/cover-volcan-s135-b120-srgb.webp'
render 'SOPORTE JABONERAS.jpg' '1100x719' 'assets/cover-soporte-s135-b120-srgb.webp'
render 'APLIQUE.jpg' '694x1536' 'assets/cover-tramuntana-s135-b120-srgb.webp'
