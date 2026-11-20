"""Slice 16:9 paintings, 4x3/1x3 chroma-green sprite sheets, standalone heroes & portraits into game/*.webp + art/sizes.json."""
from collections import deque
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import binary_dilation, distance_transform_edt, gaussian_filter, label

ART = Path(__file__).resolve().parent
RAW = ART / 'raw'
GAME = ART.parent / 'game'
SIZES_PATH = ART / 'sizes.json'
CANDIDATES = ART.parent / '.tools' / 'art_candidates'

SCENES = ('key', 'bg_palace', 'bg_cozy', 'bg_garden')

ATLASES = {
    'atlas_olaf': [
        ['olaf_idle', 'olaf_speak', 'olaf_cheer'],
    ],
    'atlas_cards_1': [
        ['card_snowfall', 'card_rollball', 'card_olaf_born', 'card_mix_batter'],
        ['card_bake_oven', 'card_share_cake', 'card_loc_garden', 'card_loc_castle'],
        ['card_loc_hearth', 'card_act_castle', 'card_act_cocoa', 'card_act_rainbow'],
    ],
    'atlas_cards_2': [
        ['card_act_sing', 'card_mood_happy', 'card_mood_warm', 'card_mood_surprise'],
        ['card_strawberry', 'card_cookie', 'card_scarf', 'card_skates'],
        ['card_lantern', 'card_beanie', 'card_mittens', 'card_icecream'],
    ],
    'atlas_cards_3': [
        ['card_shell', 'card_kite', 'card_cloak', 'card_sunhat'],
        ['card_wind_snow', 'card_umbrella', 'card_campfire', 'card_melting'],
        ['card_party_flag', 'card_sky_lanterns', 'prop_mic', 'prop_star'],
    ],
    'atlas_cards_4': [
        ['card_picnic_blanket', 'card_gust_blow', 'card_pin_stones', 'card_picnic_feast'],
        ['card_ice_swan', 'card_warm_sun', 'card_frost_dome', 'card_crystal_show'],
        ['card_snow_bunny', 'card_feel_worried', 'card_star_footprints', 'card_bunny_hug'],
    ],
    'atlas_cards_5': [
        ['card_dark_sky', 'card_feel_brave', 'card_magic_wand', 'card_aurora_crown'],
        ['card_topic_play', 'card_topic_food', 'card_topic_oops', 'card_topic_bedtime'],
    ],
}

HERO_STANDALONES = {
    'elsa_idle': 230,
    'elsa_speak': 230,
    'elsa_cheer': 236,
    'anna_idle': 220,
    'anna_speak': 220,
    'anna_cheer': 226,
}

# Fractional square crop (x0, y0, side_frac_of_w) on 16:9 key.png for expressive bust portraits
PORTRAIT_CROPS = {
    'portrait_elsa': (0.215, 0.05, 0.25),
    'portrait_anna': (0.48, 0.17, 0.23),
    'portrait_olaf': (0.725, 0.24, 0.22),
}


def find_raw(stem):
    for ext in ('.png', '.jpg', '.jpeg', '.webp'):
        p = RAW / f'{stem}{ext}'
        if p.is_file():
            return p
    return None


def cut_chroma_mask(sheet_img):
    """Build full-sheet clean RGBA + foreground mask without hard grid slicing borders."""
    rgba = np.asarray(sheet_img.convert('RGBA'), dtype=np.float32)
    rgb = rgba[..., :3]
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    h, w = r.shape
    ring = np.concatenate([rgb[:6].reshape(-1, 3), rgb[-6:].reshape(-1, 3),
                           rgb[:, :6].reshape(-1, 3), rgb[:, -6:].reshape(-1, 3)], axis=0)
    greenish = ring[(ring[:, 1] - np.maximum(ring[:, 0], ring[:, 2])) > 40]
    bg_rgb = np.median(greenish, axis=0) if len(greenish) > 20 else np.array([0.0, 255.0, 0.0], dtype=np.float32)

    excess = g - np.maximum(r, b)
    dist = np.linalg.norm(rgb - bg_rgb[None, None, :], axis=2)
    is_bg_cand = ((excess > 52) & (g > 115)) | (dist < 78)

    bg = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        if is_bg_cand[0, x]:
            bg[0, x] = True; q.append((0, x))
        if is_bg_cand[h - 1, x]:
            bg[h - 1, x] = True; q.append((h - 1, x))
    for y in range(h):
        if is_bg_cand[y, 0] and not bg[y, 0]:
            bg[y, 0] = True; q.append((y, 0))
        if is_bg_cand[y, w - 1] and not bg[y, w - 1]:
            bg[y, w - 1] = True; q.append((y, w - 1))
    while q:
        cy, cx = q.popleft()
        for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
            if 0 <= ny < h and 0 <= nx < w and not bg[ny, nx] and is_bg_cand[ny, nx]:
                bg[ny, nx] = True
                q.append((ny, nx))

    bg |= (excess > 145) & (g > 200) & (r < 55) & (b < 55)
    alpha = (~bg).astype(np.float32)
    edge_band = binary_dilation(bg, iterations=2) & (~bg)
    alpha[edge_band] = np.clip(1.0 - np.clip((excess[edge_band] - 28.0) / 80.0, 0.0, 1.0), 0.15, 1.0)
    alpha = gaussian_filter(alpha, sigma=0.55)
    alpha[bg & (~binary_dilation(~bg, iterations=1))] = 0.0

    core = alpha > 0.92
    if np.any(core):
        _, idx = distance_transform_edt(~core, return_indices=True)
        replace = (alpha > 0) & (~core)
        rgb[replace] = rgb[idx[0][replace], idx[1][replace]]

    out = np.dstack([np.clip(rgb, 0, 255), np.clip(alpha * 255.0, 0, 255)]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA'), (~bg)


def split_sheet_islands(sheet_img, rows, cols):
    """Split a sheet along empty-green horizontal/vertical valleys, preserving every full subject."""
    clean_rgba, fg = cut_chroma_mask(sheet_img)
    h, w = fg.shape
    row_proj = fg.sum(axis=1)
    y_cuts = [0]
    for k in range(1, rows):
        nom = round(h * k / rows)
        lo, hi = max(1, nom - round(h * 0.10)), min(h - 1, nom + round(h * 0.10))
        seg = row_proj[lo:hi].astype(np.float64) + np.abs(np.arange(lo, hi) - nom) * 0.05
        y_cuts.append(lo + int(np.argmin(seg)))
    y_cuts.append(h)

    out = {}
    for r in range(rows):
        y0, y1 = y_cuts[r], y_cuts[r + 1]
        col_proj = fg[y0:y1].sum(axis=0)
        x_cuts = [0]
        for k in range(1, cols):
            nom = round(w * k / cols)
            lo, hi = max(1, nom - round(w * 0.09)), min(w - 1, nom + round(w * 0.09))
            seg = col_proj[lo:hi].astype(np.float64) + np.abs(np.arange(lo, hi) - nom) * 0.05
            x_cuts.append(lo + int(np.argmin(seg)))
        x_cuts.append(w)
        for c in range(cols):
            x0, x1 = x_cuts[c], x_cuts[c + 1]
            cell = clean_rgba.crop((x0, y0, x1, y1))
            arr = np.asarray(cell)
            solid = arr[..., 3] > 42
            lbl, ncomp = label(solid)
            if ncomp > 1:
                counts = np.bincount(lbl.ravel())
                main_id = int(np.argmax(counts[1:]) + 1)
                cw = arr.shape[1]
                keep = [cid for cid in range(1, ncomp + 1)
                        if counts[cid] >= max(60, counts[main_id] * 0.015)
                        or (not np.any(lbl[:, 0] == cid) and not np.any(lbl[:, cw - 1] == cid))]
                clean_mask = np.isin(lbl, keep)
                arr = arr.copy()
                arr[~clean_mask, 3] = 0
                cell = Image.fromarray(arr, 'RGBA')
            bbox = cell.getchannel('A').point(lambda v: 255 if v > 42 else 0).getbbox()
            out[(r, c)] = cell.crop(bbox) if bbox else cell
    return out


def circle_mask(im, size=220, ring_rgb=(255, 210, 122)):
    sq = max(im.width, im.height)
    canvas = Image.new('RGBA', (sq, sq), (0, 0, 0, 0))
    canvas.paste(im, ((sq - im.width) // 2, (sq - im.height) // 2), im)
    crop = canvas.resize((size, size), Image.LANCZOS)
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).ellipse((2, 2, size - 2, size - 2), fill=255)
    existing_a = crop.getchannel('A')
    merged_a = Image.fromarray(np.minimum(np.asarray(existing_a), np.asarray(mask)), 'L')
    crop.putalpha(merged_a)
    if ring_rgb:
        ImageDraw.Draw(crop).ellipse((3, 3, size - 3, size - 3), outline=ring_rgb + (255,), width=5)
    return crop


def resize_max(im, target_h=None, target_max=None):
    if target_h:
        w = max(1, round(im.width * target_h / im.height))
        return im.resize((w, target_h), Image.LANCZOS)
    if target_max:
        s = target_max / max(im.width, im.height)
        return im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)
    return im


def main():
    GAME.mkdir(exist_ok=True)
    sizes = {}
    thumbs = []

    for name in SCENES:
        src = find_raw(name)
        if not src:
            print(f'WARN missing raw scene: {name}')
            continue
        im = Image.open(src).convert('RGB').resize((1280, 720), Image.LANCZOS)
        im.save(GAME / f'{name}.webp', quality=82, method=6)
        sizes[name] = [1280, 720, 640]
        print(f'  {name}.webp  {(GAME / f"{name}.webp").stat().st_size // 1024} KB')

    for name, target_h in HERO_STANDALONES.items():
        src = find_raw(name)
        if not src:
            print(f'WARN missing standalone hero: {name}')
            continue
        im = Image.open(src).convert('RGBA')
        bbox = im.getchannel('A').point(lambda v: 255 if v > 28 else 0).getbbox()
        if bbox:
            im = im.crop(bbox)
        out = resize_max(im, target_h=target_h)
        out.save(GAME / f'{name}.webp', quality=88, alpha_quality=90, method=6)
        sizes[name] = [out.width, out.height, out.width // 2]
        thumbs.append((name, out))
        print(f'  {name}.webp  {out.width}x{out.height}')

    for atlas_name, grid in ATLASES.items():
        src = find_raw(atlas_name)
        if not src:
            print(f'WARN missing raw atlas: {atlas_name}')
            continue
        sheet = Image.open(src).convert('RGBA')
        cells = split_sheet_islands(sheet, len(grid), len(grid[0]))
        for r, row in enumerate(grid):
            for c, name in enumerate(row):
                cut = cells[(r, c)]
                if name.startswith('olaf_'):
                    out = resize_max(cut, target_h=175)
                elif name.startswith('card_'):
                    out = resize_max(cut, target_max=220)
                else:
                    out = resize_max(cut, target_max=190)
                out.save(GAME / f'{name}.webp', quality=88, alpha_quality=90, method=6)
                sizes[name] = [out.width, out.height, out.width // 2]
                thumbs.append((name, out))
                print(f'  {name}.webp  {out.width}x{out.height}')

    key_src = find_raw('key')
    if key_src:
        key_im = Image.open(key_src).convert('RGBA')
        kw, kh = key_im.size
        for pname, (xf, yf, sf) in PORTRAIT_CROPS.items():
            side = round(kw * sf)
            x0 = max(0, min(kw - side, round(kw * xf)))
            y0 = max(0, min(kh - side, round(kh * yf)))
            crop = key_im.crop((x0, y0, x0 + side, y0 + side))
            out = circle_mask(crop, 220)
            out.save(GAME / f'{pname}.webp', quality=88, alpha_quality=90, method=6)
            sizes[pname] = [220, 220, 110]
            thumbs.append((pname, out))
            print(f'  {pname}.webp  220x220')

    SIZES_PATH.write_text(json.dumps(dict(sorted(sizes.items())), indent=2) + '\n', encoding='utf8')
    if thumbs:
        cols = 8
        rows = (len(thumbs) + cols - 1) // cols
        card = Image.new('RGB', (cols * 140, rows * 140), (24, 34, 68))
        for i, (_, t) in enumerate(thumbs):
            s = min(124 / t.width, 124 / t.height)
            r_im = t.resize((max(1, round(t.width * s)), max(1, round(t.height * s))), Image.LANCZOS)
            x0, y0 = (i % cols) * 140 + (140 - r_im.width) // 2, (i // cols) * 140 + (140 - r_im.height) // 2
            card.paste(r_im, (x0, y0), r_im)
        CANDIDATES.mkdir(parents=True, exist_ok=True)
        card.save(CANDIDATES / 'slice_verify.png')
    print(f'Wrote {len(sizes)} entries to art/sizes.json')


if __name__ == '__main__':
    main()
