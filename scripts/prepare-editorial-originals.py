"""Offline authoring only: colour-managed WebP copies, no enhancement or source writes."""
import argparse
from pathlib import Path
from io import BytesIO
from PIL import Image, ImageCms, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {'Tramuntana.jpg': 'tramuntana', 'binari.jpg': 'binari', 'fita.jpg': 'fita', 'cleda.jpg': 'cleda', 'binari-nueva.jpg': 'binari-nueva', 'cleda-nueva.png': 'cleda-nueva'}
parser = argparse.ArgumentParser()
parser.add_argument('--only', nargs='+', choices=SOURCES)
args = parser.parse_args()
srgb = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB'))
for source, name in SOURCES.items():
    if args.only and source not in args.only:
        continue
    with Image.open(ROOT / 'assets' / 'editorial-originals' / source) as image:
        profile = image.info.get('icc_profile')
        if not profile and source != 'binari-nueva.jpg':
            raise ValueError(f'Missing source colour profile: {source}; do not guess its colour space')
        oriented = ImageOps.exif_transpose(image)
        # The new untagged RGB JPEG is interpreted as web-default sRGB, without enhancement.
        converted = ImageCms.profileToProfile(oriented, ImageCms.ImageCmsProfile(BytesIO(profile)), srgb, outputMode='RGB', renderingIntent=0) if profile else oriented.convert('RGB')
        target = ROOT / 'assets' / f'editorial-{name}-srgb.webp'
        converted.save(target, 'WEBP', quality=92, method=6, icc_profile=srgb.tobytes())
        print(f'{source}: {converted.width}×{converted.height} → {target.name}, {target.stat().st_size:,} bytes')
