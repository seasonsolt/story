  /* Sizes and gamepad focus picking. Pure: no DOM access, no clock. Plain global script. */
  const LAYOUT = Object.freeze({ stageW: 960, stageH: 520, minHitCss: 64, touchKeyCss: 72, refW: 1024, refH: 768, touchBarCss: 0, ringPad: 8 });

  function layoutStageWidth(availW, availH) { return Math.max(240, Math.floor(Math.min(availW, availH * (LAYOUT.stageW / LAYOUT.stageH)))); }
  function layoutStageHeight(width) { return Math.round(width / (LAYOUT.stageW / LAYOUT.stageH)); }
  function layoutCssPx(units, stageCssW) { return units * stageCssW / LAYOUT.stageW; }
  function layoutRefStageWidth() { return layoutStageWidth(LAYOUT.refW, LAYOUT.refH - LAYOUT.touchBarCss); }
  function layoutHitMin(stageCssW) { return Math.ceil(LAYOUT.minHitCss * LAYOUT.stageW / (stageCssW || layoutRefStageWidth())); }
  function layoutHitRadius(r, ring) { return Math.max(r + (ring ? LAYOUT.ringPad : 0), layoutHitMin() / 2); }

  function layoutPadPick(dir, cur, rects) {
    const from = rects[cur];
    if (!from) return -1;
    const fx = from.x + from.w / 2, fy = from.y + from.h / 2;
    let best = -1, bestScore = Infinity;
    rects.forEach((r, i) => {
      if (i === cur) return;
      const dx = r.x + r.w / 2 - fx, dy = r.y + r.h / 2 - fy;
      const along = dir === 'r' ? dx : dir === 'l' ? -dx : dir === 'd' ? dy : -dy;
      const across = dir === 'l' || dir === 'r' ? Math.abs(dy) : Math.abs(dx);
      if (along <= 1 || across > 2 * along) return;
      const score = along + 2 * across;
      if (score < bestScore) { best = i; bestScore = score; }
    });
    return best;
  }

  function layoutPadStart(rects) {
    if (!rects.length) return -1;
    const i = rects.findIndex(r => r.pulse);
    return i >= 0 ? i : 0;
  }
