"""Assemble ../story.html and sw.js from sources. Never reads the built page."""
import argparse
import hashlib
import json
import re
from pathlib import Path

ART = Path(__file__).resolve().parent
ROOT = ART.parent
SRC = ROOT / 'src'
OUT = ROOT / 'story.html'

args = argparse.ArgumentParser(description='Assemble story.html from sources.')
args.add_argument('--out', type=Path, default=OUT)
OUT = args.parse_args().out


def join(files):
    parts = []
    for f in files:
        t = f.read_text(encoding='utf8')
        assert t.endswith('\n'), f'{f} must end with a newline'
        parts.append(t)
    return ''.join(parts)


def once(text, marker, replacement, where):
    assert text.count(marker) == 1, f'{where}: expected exactly one {marker!r}, found {text.count(marker)}'
    return text.replace(marker, replacement)


logic_files = sorted(SRC.glob('*.js'))
lib_files = sorted((SRC / 'lib').glob('*.js'))
view_files = sorted((SRC / 'view').glob('*.js'))
assert logic_files and lib_files and view_files, 'no sources found under src/'

logic = join(logic_files)
view = join(lib_files) + join(view_files)
MANIFEST = ROOT / 'manifest.webmanifest'
SW_TEMPLATE = ART / 'sw.template.js'
asset_hash = hashlib.sha256()
GAME = ROOT / 'game'
hd_dir = GAME / 'hd'
hd_assets = sorted(hd_dir.glob('*.webp')) if hd_dir.is_dir() else []
for asset in sorted(list(GAME.iterdir())) + hd_assets:
    if asset.suffix not in ('.webp', '.mp3', '.json', '.png', '.woff2'):
        continue
    asset_hash.update(asset.relative_to(GAME).as_posix().encode())
    asset_hash.update(hashlib.sha256(asset.read_bytes()).digest())
asset_hash.update(b'manifest.webmanifest')
asset_hash.update(hashlib.sha256(MANIFEST.read_bytes()).digest())
asset_version = asset_hash.hexdigest()[:12]

view = once(view, "/*ASSET_VERSION*/'dev'", json.dumps(asset_version), 'view')
sizes_path = ART / 'sizes.json'
view = once(view, '/*SIZES*/{}', json.dumps(json.load(open(sizes_path, encoding='utf8')) if sizes_path.exists() else {}, separators=(',', ':')), 'view')
HD_INDEX = ART / 'hd.json'
hd_names = sorted(json.loads(HD_INDEX.read_text(encoding='utf8'))) if HD_INDEX.exists() else []
view = once(view, '/*HD*/[]', json.dumps(hd_names, separators=(',', ':')), 'view')
view = once(view, '/*LINES*/{}', json.dumps(json.load(open(SRC / 'content' / 'lines.json', encoding='utf8')), ensure_ascii=False, separators=(',', ':')), 'view')
for name, text in (('logic', logic), ('view', view)):
    assert '</script' not in text.lower(), f'{name} contains </script>'

page = (ART / 'page.template.html').read_text(encoding='utf8')
page = re.sub(r'href="(game/[^"?]+)"', lambda m: f'href="{m[1]}?v={asset_version}"', page)
page = re.sub(r'url\("(game/[^"?]+)"\)', lambda m: f'url("{m[1]}?v={asset_version}")', page)
page = once(page, '/*LOGIC*/\n', logic, 'template')
page = once(page, '/*VIEW*/\n', '(() => {\n' + view + '})();\n', 'template')

APP_HEAD = """<meta name="theme-color" content="#162044">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="game/icon-192.png">
<link rel="apple-touch-icon" href="game/apple-touch-icon.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="冰雪小导演">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
"""
page = once(page, '<title>冰雪故事小导演</title>\n', '<title>冰雪故事小导演</title>\n' + APP_HEAD, 'template')
OUT.write_text(page, encoding='utf8')


def make_sw():
    shell = ['story.html', 'manifest.webmanifest', 'game/icon-192.png', 'game/icon-512.png', 'game/icon-maskable-512.png', 'game/apple-touch-icon.png']
    fonts = [f'game/{f}?v={asset_version}' for f in ('font_zh.woff2',) if (GAME / f).is_file()]
    sd_webp = sorted(f'game/{p.name}?v={asset_version}' for p in GAME.glob('*.webp'))
    precache = shell + fonts + [f'game/subs.json?v={asset_version}'] + sd_webp
    for path in precache:
        assert (ROOT / path.split('?')[0]).is_file() or path == 'story.html', f'precache entry without a file: {path}'
    sw = SW_TEMPLATE.read_text(encoding='utf8')
    assert sw.endswith('\n')
    sw = once(sw, "/*ASSET_VERSION*/'dev'", json.dumps(asset_version), 'sw template')
    sw = once(sw, "/*PAGE_HASH*/'dev'", json.dumps(hashlib.sha256(page.encode('utf8')).hexdigest()[:12]), 'sw template')
    sw = once(sw, '/*PRECACHE*/[]', json.dumps(precache, ensure_ascii=False, indent=2), 'sw template')
    return sw


sw_out = OUT.with_name('sw.js')
sw_out.write_text(make_sw(), encoding='utf8')
print(f'{OUT}: {len(page)} chars; asset version {asset_version}')
