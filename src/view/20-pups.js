  /* Host & Companion Wing Hero Rendering (Elsa, Anna & Olaf), Interactive Cheer Tap & Grounded Shadows. */
  const heroDrawn = { built: false, leftWho: '', leftPose: '', rightWho: '', rightPose: '' };

  function buildActors() {
    const box = $('actors');
    const sh = $('shadows');
    box.textContent = '';
    sh.textContent = '';
    el('ellipse', { id: 'shLeft', cx: 92, cy: 468, rx: 46, ry: 11, fill: '#0b1024', opacity: '.35' }, sh);
    el('ellipse', { id: 'shRight', cx: 868, cy: 468, rx: 42, ry: 10, fill: '#0b1024', opacity: '.35' }, sh);

    const leftG = el('g', { id: 'heroLeft', class: 'ux-btn', role: 'button', tabindex: '0', 'aria-label': '左侧主角', transform: 'translate(92 466)' }, box);
    const rightG = el('g', { id: 'heroRight', class: 'ux-btn', role: 'button', tabindex: '0', 'aria-label': '右侧伙伴', transform: 'translate(868 466) scale(-1 1)' }, box);
    leftG.addEventListener('click', () => onHeroTap(heroDrawn.leftWho));
    rightG.addEventListener('click', () => onHeroTap(heroDrawn.rightWho));
    heroDrawn.built = true;
    heroDrawn.leftWho = ''; heroDrawn.leftPose = '';
    heroDrawn.rightWho = ''; heroDrawn.rightPose = '';
  }

  function renderHeroSprite(node, who, pose) {
    node.textContent = '';
    const key = `${who}_${pose}`;
    const [pw, ph] = SIZES[key] || SIZES[`${who}_idle`] || [140, 210];
    const targetH = who === 'olaf' ? 168 : 206;
    const scale = targetH / ph;
    const dw = pw * scale, dh = ph * scale;
    const vis = el('g', { class: 'btn-vis' }, node);
    img(key, -dw / 2, -dh, dw, dh, vis);
  }

  function pairForHost(host) {
    if (host === 'olaf') return ['olaf', 'anna'];
    if (host === 'anna') return ['anna', 'olaf'];
    return ['elsa', 'olaf'];
  }

  function renderHeroes(g, now) {
    if (g.state !== 'play') {
      if (heroDrawn.built) { $('actors').textContent = ''; $('shadows').textContent = ''; heroDrawn.built = false; }
      return;
    }
    if (!heroDrawn.built) buildActors();
    const lv = g.level();
    const [leftWho, rightWho] = pairForHost(lv.host);
    const poseOf = who => {
      const h = g.heroes[who];
      if (!h) return 'idle';
      if (h.cheer > 0.05) return 'cheer';
      return g.phase === 'build' && who === lv.host ? 'speak' : 'idle';
    };
    const lPose = poseOf(leftWho), rPose = poseOf(rightWho);
    const leftG = $('heroLeft'), rightG = $('heroRight');

    if (heroDrawn.leftWho !== leftWho || heroDrawn.leftPose !== lPose) {
      renderHeroSprite(leftG, leftWho, lPose);
      heroDrawn.leftWho = leftWho; heroDrawn.leftPose = lPose;
    }
    if (heroDrawn.rightWho !== rightWho || heroDrawn.rightPose !== rPose) {
      renderHeroSprite(rightG, rightWho, rPose);
      heroDrawn.rightWho = rightWho; heroDrawn.rightPose = rPose;
    }

    const lbob = Math.sin(now * 2.5) * 3 + (g.heroes[leftWho].cheer > 0 ? -Math.abs(Math.sin(g.heroes[leftWho].cheer * 10)) * 14 : 0);
    const rbob = Math.cos(now * 2.3) * 3 + (g.heroes[rightWho].cheer > 0 ? -Math.abs(Math.sin(g.heroes[rightWho].cheer * 10)) * 14 : 0);
    leftG.setAttribute('transform', `translate(92 ${(466 + lbob).toFixed(1)})`);
    rightG.setAttribute('transform', `translate(868 ${(466 + rbob).toFixed(1)}) scale(-1 1)`);
  }
