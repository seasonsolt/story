"""Subset ZCOOL KuaiLe into game/font_zh.woff2 for 100% offline Chinese typography."""
from pathlib import Path
import tempfile
import urllib.request
from fontTools.subset import main as subset_main

ART = Path(__file__).resolve().parent
ROOT = ART.parent
GAME = ROOT / 'game'
FONT_URL = 'https://github.com/google/fonts/raw/main/ofl/zcoolkuaile/ZCOOLKuaiLe-Regular.ttf'


def collect_chars():
    chars = set(chr(c) for c in range(32, 127))
    chars.update('，。、！？：；「」『』（）《》—…·～％＋－×÷★☆✓✕●○▶◀')
    for p in list((ROOT / 'src').rglob('*')) + [ART / 'page.template.html', ROOT / 'manifest.webmanifest']:
        if p.is_file() and p.suffix in ('.js', '.json', '.html', '.md', '.webmanifest'):
            chars.update(p.read_text(encoding='utf8'))
    return ''.join(sorted(c for c in chars if c.isprintable()))


def build():
    GAME.mkdir(exist_ok=True)
    text = collect_chars()
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        txt = tmp / 'zh.txt'
        ttf = tmp / 'zh.ttf'
        txt.write_text(text, encoding='utf8')
        req = urllib.request.Request(FONT_URL, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=30) as r:
            ttf.write_bytes(r.read())
        out = GAME / 'font_zh.woff2'
        subset_main([
            str(ttf),
            f'--text-file={txt}',
            '--flavor=woff2',
            '--layout-features=*',
            f'--output-file={out}',
        ])
        print(f'{out.relative_to(ROOT)}: {out.stat().st_size} bytes ({len(text)} glyphs)')


if __name__ == '__main__':
    build()
