  /* Host & Companion Wing Hero Rendering (Elsa, Anna & Olaf), Live Voice Puppet Bounce & Cheer Tap. */
  const heroDrawn = { built: false, leftWho: '', leftPose: '', rightWho: '', rightPose: '' };
  const liveVoice = { active: false, energy: 0 };

  function setLiveVoice(active, energy) {
    liveVoice.active = !!active;
    liveVoice.energy = Math.max(0, Math.min(1, energy || 0));
  }

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
    const e = liveVoice.active ? liveVoice.energy : 0;
    const poseOf = (who, isLeft) => {
      const h = g.heroes[who];
      if (!h) return 'idle';
      if (h.cheer > 0.05) return 'cheer';
      if (g.phase === 'studio' && liveVoice.active) {
        if (e > .42) return 'cheer';
        if (e > .11 && isLeft) return 'speak';
        if (e > .24 && !isLeft) return 'speak';
        return 'idle';
      }
      return g.phase === 'build' && who === lv.host ? 'speak' : 'idle';
    };
    const lPose = poseOf(leftWho, true), rPose = poseOf(rightWho, false);
    const leftG = $('heroLeft'), rightG = $('heroRight');

    if (heroDrawn.leftWho !== leftWho || heroDrawn.leftPose !== lPose) {
      renderHeroSprite(leftG, leftWho, lPose);
      heroDrawn.leftWho = leftWho; heroDrawn.leftPose = lPose;
    }
    if (heroDrawn.rightWho !== rightWho || heroDrawn.rightPose !== rPose) {
      renderHeroSprite(rightG, rightWho, rPose);
      heroDrawn.rightWho = rightWho; heroDrawn.rightPose = rPose;
    }

    const vBounceL = liveVoice.active ? -e * 18 : 0;
    const vBounceR = liveVoice.active ? -e * 13 : 0;
    const leanL = liveVoice.active ? (1 + e * .06) : 1;
    const lbob = Math.sin(now * 2.5) * 3 + (g.heroes[leftWho].cheer > 0 ? -Math.abs(Math.sin(g.heroes[leftWho].cheer * 10)) * 14 : 0) + vBounceL;
    const rbob = Math.cos(now * 2.3) * 3 + (g.heroes[rightWho].cheer > 0 ? -Math.abs(Math.sin(g.heroes[rightWho].cheer * 10)) * 14 : 0) + vBounceR;
    leftG.setAttribute('transform', `translate(92 ${(466 + lbob).toFixed(1)}) scale(${leanL.toFixed(3)})`);
    rightG.setAttribute('transform', `translate(868 ${(466 + rbob).toFixed(1)}) scale(${(-leanL).toFixed(3)} ${leanL.toFixed(3)})`);
  }
