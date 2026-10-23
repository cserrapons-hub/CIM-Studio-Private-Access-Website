"""Offline authoring only: colour-managed WebP copies, no enhancement or source writes."""
from pathlib import Path
from io import BytesIO
from PIL import Image, ImageCms, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {'Tramuntana.jpg': 'tramuntana', 'binari.jpg': 'binari', 'fita.jpg': 'fita', 'cleda.jpg': 'cleda'}
srgb = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB'))
for source, name in SOURCES.items():
    with Image.open(ROOT / 'assets' / 'editorial-originals' / source) as image:
        profile = image.info.get('icc_profile')
        if not profile:
            raise ValueError(f'Missing source colour profile: {source}; do not guess its colour space')
        oriented = ImageOps.exif_transpose(image)
        converted = ImageCms.profileToProfile(oriented, ImageCms.ImageCmsProfile(BytesIO(profile)), srgb, outputMode='RGB', renderingIntent=0)
        target = ROOT / 'assets' / f'editorial-{name}-srgb.webp'
        converted.save(target, 'WEBP', quality=92, method=6, icc_profile=srgb.tobytes())
        print(f'{source}: {converted.width}×{converted.height} → {target.name}, {target.stat().st_size:,} bytes')
