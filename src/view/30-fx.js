  /* Particle bursts, confetti snowflakes & 14s idle guide sparkle ring over expected card. */
  const fxList = [];

  function uxConfetti(parent, x, y, count) {
    const host = parent || $('fx');
    const cols = ['#ffd27a', '#ff9ec4', '#9fe8ff', '#c9a6ff', '#ffffff'];
    for (let i = 0; i < (count || 16); i++) {
      const a = (Math.PI * 2 * i) / (count || 16) + Math.random() * .4;
      const sp = 55 + Math.random() * 95;
      const node = el('circle', { cx: x, cy: y, r: 3.2 + Math.random() * 2.4, fill: cols[i % cols.length] }, host);
      fxList.push({ node, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 45, g: 210, t: 0, dur: .75 + Math.random() * .35 });
    }
  }

  function renderIdleGuide(g, now) {
    let guide = $('guideRing');
    if (!g.hintCard || g.state !== 'play' || g.phase !== 'build') {
      if (guide) guide.remove();
      return;
    }
    const targetNode = $('cards') && $('cards').querySelector(`[data-cid="${g.hintCard}"]`);
    const stage = $('stage');
    if (!targetNode || !stage) { if (guide) guide.remove(); return; }
    const s = stage.getBoundingClientRect();
    const b = targetNode.getBoundingClientRect();
    if (s.width <= 0 || b.width <= 0) return;
    const k = 960 / s.width;
    const cx = (b.left - s.left + b.width / 2) * k;
    const cy = (b.top - s.top + b.height / 2) * k;
    const r = Math.max(46, Math.max(b.width, b.height) * k * .48) + Math.sin(now * 5) * 4;
    if (!guide) guide = el('g', { id: 'guideRing', 'pointer-events': 'none' }, $('fx'));
    guide.innerHTML = `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="#ffd27a" stroke-width="5" stroke-dasharray="10 6" opacity=".95"/>
      <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(r - 10).toFixed(1)}" fill="#ffe89c" opacity=".14"/>`;
  }

  function fxTick(dt, now, g) {
    for (let i = fxList.length - 1; i >= 0; i--) {
      const f = fxList[i];
      f.t += dt;
      const p = Math.min(1, f.t / f.dur);
      f.vy += f.g * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.node.setAttribute('cx', f.x.toFixed(1));
      f.node.setAttribute('cy', f.y.toFixed(1));
      f.node.setAttribute('opacity', (1 - p).toFixed(2));
      if (f.t >= f.dur) {
        f.node.remove();
        fxList.splice(i, 1);
      }
    }
    if (g) renderIdleGuide(g, now);
  }
