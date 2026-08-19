#!/usr/bin/env bash
set -euo pipefail

command -v cwebp >/dev/null || { echo 'Brak cwebp. Fedora/Nobara: sudo dnf install libwebp-tools'; exit 1; }

mkdir -p assets/optimized

# Docelowe warianty do list i artykułów. Oryginały zostają jako źródła.
cwebp -quiet -q 82 -resize 1200 0 assets/chlopiec.png -o assets/optimized/chlopiec-1200.webp
cwebp -quiet -q 82 -resize 1200 0 assets/schody.png -o assets/optimized/schody-1200.webp
cwebp -quiet -q 82 -resize 1200 0 assets/martwa-mysz.png -o assets/optimized/martwa-mysz-1200.webp

cwebp -quiet -q 78 -resize 480 0 assets/chlopiec.png -o assets/optimized/chlopiec-480.webp
cwebp -quiet -q 78 -resize 480 0 assets/schody.png -o assets/optimized/schody-480.webp
cwebp -quiet -q 78 -resize 480 0 assets/martwa-mysz.png -o assets/optimized/martwa-mysz-480.webp

printf '\nWygenerowano warianty WebP w assets/optimized/.\n'
ls -lh assets/optimized/*.webp
