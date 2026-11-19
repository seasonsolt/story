"""Package the built static game (story.html, index.html, sw.js, manifest.webmanifest, game/*)."""
import argparse
import hashlib
import json
import re
from pathlib import Path
import zipfile

from narration import Content, MANIFEST_NAME, current_hashes, load_manifest, manifest_problems

ROOT = Path(__file__).resolve().parent.parent


def package(out):
    page = (ROOT / 'story.html').read_bytes()
    content = Content(ROOT / 'src/content/lines.json')
    voices = load_manifest(ROOT / 'game' / MANIFEST_NAME)
    if voices is None:
        raise ValueError(f'game/{MANIFEST_NAME} is missing')
    stale = manifest_problems(content, voices)
    if stale:
        raise ValueError(f'game/{MANIFEST_NAME} disagrees with lines.json: ' + ', '.join(f'{n} {k}' for n, k in stale[:8]))
    cur = current_hashes(content)
    files = {p.name: p for p in (ROOT / 'game').glob('*.webp')}
    files.update({p.name: p for p in (ROOT / 'game').glob('*.png')})
    files.update({p.name: p for p in (ROOT / 'game').glob('*.woff2')})
    if (ROOT / 'game/hd').is_dir():
        files.update({f'hd/{p.name}': p for p in (ROOT / 'game/hd').glob('*.webp')})
    for name in cur:
        files[name] = ROOT / 'game' / name
    files['subs.json'] = ROOT / 'game/subs.json'
    payload = {
        'index.html': page,
        'story.html': page,
        'sw.js': (ROOT / 'sw.js').read_bytes(),
        'manifest.webmanifest': (ROOT / 'manifest.webmanifest').read_bytes(),
    }
    for name, path in sorted(files.items()):
        data = path.read_bytes()
        if not data:
            raise ValueError(f'Empty release asset: {name}')
        payload['game/' + name] = data
    total = sum(map(len, payload.values()))
    if total > 60_000_000:
        raise ValueError(f'Release exceeds 60 MB: {total}')
    version = re.search(rb'const ASSET_VERSION = "([a-f0-9]+)"', page)
    if not version:
        raise ValueError('Build the page with asset fingerprints before packaging')
    worker = re.search(rb'const ASSET_VERSION = "([a-f0-9]+)"', payload['sw.js'])
    if not worker or worker[1] != version[1]:
        raise ValueError('sw.js belongs to another build than story.html')
    precache = json.loads(re.search(rb'const PRECACHE = (\[.*?\]);', payload['sw.js'], re.S)[1])
    missing = [u for u in precache if u.split('?')[0] not in payload]
    if missing:
        raise ValueError('sw.js precaches files not in release: ' + ', '.join(missing[:5]))
    manifest = {
        'asset_version': version[1].decode(),
        'runtime_bytes': total,
        'audio_files': len(cur),
        'webp_files': sum(n.endswith('.webp') for n in files),
        'files': {name: hashlib.sha256(data).hexdigest() for name, data in sorted(payload.items())},
    }
    payload['manifest.json'] = (json.dumps(manifest, indent=2) + '\n').encode()
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for name, data in sorted(payload.items()):
            z.writestr(name, data)
    return {
        'path': str(out),
        'zip_bytes': out.stat().st_size,
        'runtime_bytes': total,
        'audio_files': len(cur),
        'asset_version': manifest['asset_version'],
        'sha256': hashlib.sha256(out.read_bytes()).hexdigest(),
    }


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--out', required=True)
    args = ap.parse_args()
    print(json.dumps(package(args.out), indent=2))
