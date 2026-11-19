"""Build offline app icons from game/key.webp on royal sapphire gradient."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
GAME = ROOT / 'game'


def make_square(size):
    src = Image.open(GAME / 'key.webp').convert('RGB')
    w, h = src.size
    side = min(w, h)
    # Center-left-right covering Elsa, Anna & Olaf together inside square crop
    x0 = (w - side) // 2
    y0 = (h - side) // 2
    sq = src.crop((x0, y0, x0 + side, y0 + side)).resize((size, size), Image.LANCZOS)
    return sq


def main():
    big = make_square(512)
    big.save(GAME / 'icon-512.png', optimize=True)
    big.resize((192, 192), Image.LANCZOS).save(GAME / 'icon-192.png', optimize=True)
    big.resize((180, 180), Image.LANCZOS).save(GAME / 'apple-touch-icon.png', optimize=True)
    # Maskable safe-zone icon with midnight aurora border
    mask_bg = Image.new('RGB', (512, 512), (22, 32, 68))
    inner = big.resize((384, 384), Image.LANCZOS)
    mask = Image.new('L', (384, 384), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, 383, 383), radius=64, fill=255)
    mask_bg.paste(inner, (64, 64), mask)
    mask_bg.save(GAME / 'icon-maskable-512.png', optimize=True)
    for name in ('icon-192', 'icon-512', 'icon-maskable-512', 'apple-touch-icon'):
        print(f'game/{name}.png', (GAME / f'{name}.png').stat().st_size, 'bytes')


if __name__ == '__main__':
    main()
