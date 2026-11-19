  /* Story prologue, Chapter intro cards, 3-star Clear overlay (with Parent Tip) & Grand Finale celebration. */
  let story = null;
  const storyIsOpen = () => !!story;
  const uxHooks = { replay: /** @type {(i: number) => void} */ (() => {}) };
  const UX_STAR_D = 'M0 -.8L.22 -.25L.8 -.22L.35 .15L.5 .72L0 .4L-.5 .72L-.35 .15L-.8 -.22L-.22 -.25Z';

  function uxLevel(v) { return typeof v === 'number' ? LEVELS[v] : v; }
  function uxLevelIndex(lv) { return LEVELS.indexOf(lv); }
  function uxLine(key, opts) { return hasLineKey(key) ? voice.line(key, opts) : Promise.resolve(false); }
  function uxPreload(keys) { if (typeof voice !== 'undefined' && voice.preload) voice.preload(keys); }
  function uxStopVoice() { if (typeof voice !== 'undefined' && voice.stop) voice.stop(); }
  function uxWait(ms) { return new Promise(ok => setTimeout(ok, ms)); }

  function uxScreen(name) { story = { name, onKey: null }; return story; }
  const uxAlive = s => story === s;
  function uxEnd(s, done) {
    if (story !== s) return;
    story = null;
    $('overlay').textContent = '';
    uxStopVoice();
    if (typeof done === 'function') done();
  }

  function uxPaint(html) { const root = $('overlay'); root.innerHTML = html; return root; }

  function uxPic(name, x, y, w, h, fallback, fit) {
    if (SIZES[name]) return `<image href="${SRC(name)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid ${fit || 'slice'}"/>`;
    return fallback || '';
  }

  function uxIcon(kind, r, col) {
    const s = r || 20, c = col || '#fff9ec';
    if (kind === 'next') return `<path d="M${-s * .35} ${-s * .4}L${s * .4} 0L${-s * .35} ${s * .4}Z" fill="${c}"/>`;
    if (kind === 'back') return `<path d="M${s * .35} ${-s * .4}L${-s * .4} 0L${s * .35} ${s * .4}Z" fill="${c}"/>`;
    if (kind === 'home') return `<path d="M0 ${-s * .55}L${s * .58} ${-s * .05}V${s * .55}H${s * .18}V${s * .12}H${-s * .18}V${s * .55}H${-s * .58}V${-s * .05}Z" fill="none" stroke="${c}" stroke-width="3" stroke-linejoin="round"/>`;
    if (kind === 'replay') return `<path d="M${s * .45} ${-s * .15}A${s * .48} ${s * .48} 0 1 0 ${s * .35} ${s * .32}" fill="none" stroke="${c}" stroke-width="3.4" stroke-linecap="round"/><path d="M${s * .25} ${-s * .35}L${s * .52} ${-s * .08}L${s * .18} ${s * .04}Z" fill="${c}"/>`;
    if (kind === 'play') return `<path d="M${-s * .28} ${-s * .45}L${s * .52} 0L${-s * .28} ${s * .45}Z" fill="${c}"/>`;
    if (kind === 'stop') return `<rect x="${-s * .36}" y="${-s * .36}" width="${s * .72}" height="${s * .72}" rx="4" fill="${c}"/>`;
    if (kind === 'mic') return `<rect x="${-s * .22}" y="${-s * .52}" width="${s * .44}" height="${s * .62}" rx="${s * .22}" fill="${c}"/><path d="M${-s * .42} ${-s * .05}A${s * .42} ${s * .42} 0 0 0 ${s * .42} ${-s * .05}M0 ${s * .38}V${s * .58}M${-s * .25} ${s * .58}H${s * .25}" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`;
    if (kind === 'speaker') return `<path d="M${-s * .45} ${-s * .22}H${-s * .18}L${s * .14} ${-s * .48}V${s * .48}L${-s * .18} ${s * .22}H${-s * .45}Z" fill="${c}"/><path d="M${s * .28} ${-s * .26}A${s * .36} ${s * .36} 0 0 1 ${s * .28} ${s * .26}M${s * .45} ${-s * .44}A${s * .6} ${s * .6} 0 0 1 ${s * .45} ${s * .44}" fill="none" stroke="${c}" stroke-width="2.8" stroke-linecap="round"/>`;
    if (kind === 'train') return `<rect x="${-s * .52}" y="${-s * .35}" width="${s * 1.04}" height="${s * .56}" rx="6" fill="none" stroke="${c}" stroke-width="2.8"/><circle cx="${-s * .28}" cy="${s * .34}" r="${s * .12}" fill="${c}"/><circle cx="${s * .28}" cy="${s * .34}" r="${s * .12}" fill="${c}"/>`;
    if (kind === 'album') return `<circle r="${s * .48}" fill="none" stroke="${c}" stroke-width="3"/><circle r="${s * .16}" fill="${c}"/>`;
    if (kind === 'meet') return `<path d="M0 ${s * .42}C${-s * .55} ${s * .05} ${-s * .62} ${-s * .38} ${-s * .26} ${-s * .46}C${-s * .08} ${-s * .5} 0 ${-s * .32} 0 ${-s * .32}C0 ${-s * .32} ${s * .08} ${-s * .5} ${s * .26} ${-s * .46}C${s * .62} ${-s * .38} ${s * .55} ${s * .05} 0 ${s * .42}Z" fill="${c}"/>`;
    if (kind === 'sticker') return `<path d="${UX_STAR_D}" transform="scale(${s * .68})" fill="${c}"/>`;
    if (kind === 'rooms') return `<rect x="${-s * .5}" y="${-s * .5}" width="${s * .42}" height="${s * .42}" rx="4" fill="${c}"/><rect x="${s * .08}" y="${-s * .5}" width="${s * .42}" height="${s * .42}" rx="4" fill="${c}"/><rect x="${-s * .5}" y="${s * .08}" width="${s * .42}" height="${s * .42}" rx="4" fill="${c}"/><rect x="${s * .08}" y="${s * .08}" width="${s * .42}" height="${s * .42}" rx="4" fill="${c}"/>`;
    if (kind === 'gear') return `<circle r="${s * .42}" fill="none" stroke="${c}" stroke-width="3.2" stroke-dasharray="5 3"/><circle r="${s * .16}" fill="${c}"/>`;
    return `<circle r="${s * .35}" fill="${c}"/>`;
  }

  function uxButton(o) {
    const r = Math.max(32, o.r || 36);
    const hitR = layoutHitRadius(r, !!o.ring);
    const fill = o.plate === 'gold' ? 'url(#goldGrad)' : (o.plate === 'rec' ? 'url(#micRecGrad)' : 'url(#plateGrad)');
    const stroke = o.plate === 'gold' ? '#fff7dc' : (o.plate === 'rec' ? '#ffdbe6' : '#7ea9e8');
    const icCol = o.plate === 'gold' ? '#4a2605' : (o.plate === 'rec' ? '#ffffff' : '#1b2c5c');
    const cls = 'ux-btn' + (o.cls ? ' ' + o.cls : '');
    const pic = o.pic ? uxPic(o.pic, -r * .78, -r * .78, r * 1.56, r * 1.56) : uxIcon(o.icon || o.ui, r * .66, icCol);
    return `<g class="${cls}" data-act="${o.act}" data-ui="${o.ui || o.act}" role="button" tabindex="0" aria-label="${o.ui || o.act}" transform="translate(${o.x} ${o.y})">
      <circle r="${hitR}" fill="transparent"/><g class="btn-vis" filter="url(#softShadow)">
      <circle r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="3.5"/>${pic}</g></g>`;
  }

  function uxNudge(node) {
    if (!node) return;
    node.classList.remove('ux-shake');
    void node.getBoundingClientRect();
    node.classList.add('ux-shake');
  }

  function uxPopSlot(root, k) {
    const n = root && root.querySelector(`[data-pop="${k}"]`);
    if (n) n.classList.add('on');
  }

  function uxBind(root, handlers) {
    if (!root) return;
    root.querySelectorAll('[data-act]').forEach(btn => {
      const act = btn.getAttribute('data-act'), ui = btn.getAttribute('data-ui');
      btn.addEventListener('pointerenter', () => { if (ui && typeof voice !== 'undefined') voice.ui(ui); });
      btn.addEventListener('focus', () => { if (ui && typeof voice !== 'undefined') voice.ui(ui); });
      btn.addEventListener('click', () => { if (handlers[act]) handlers[act](btn); });
      btn.addEventListener('keydown', /** @param {KeyboardEvent} e */ e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (handlers[act]) handlers[act](btn); } });
    });
  }

  function showStory(keys, done) {
    const s = uxScreen('story');
    uxPreload(keys);
    let idx = 0;
    const render = () => {
      if (!uxAlive(s)) return;
      const key = keys[idx];
      const root = uxPaint(`<g class="page">
        <image href="${SRC('key')}" width="960" height="520" preserveAspectRatio="xMidYMid slice"/>
        <rect width="960" height="520" fill="url(#bottomFade)" opacity=".55" pointer-events="none"/>
        <g transform="translate(480 488)">${keys.map((_, k) => `<circle cx="${(k - (keys.length - 1) / 2) * 20}" cy="0" r="${k === idx ? 6 : 4.5}" fill="${k === idx ? '#ffd27a' : '#96b4e8'}"/>`).join('')}</g>
        ${uxButton({ act: 'next', ui: 'next', icon: 'next', x: 886, y: 452, r: 38, plate: 'gold' })}
      </g>`);
      const next = () => {
        if (!uxAlive(s)) return;
        uxStopVoice();
        if (++idx < keys.length) render();
        else uxEnd(s, done);
      };
      s.onKey = next;
      uxBind(root, { next });
      uxLine(key).then(() => {
        if (!uxAlive(s)) return;
        const b = root.querySelector('[data-act="next"]');
        if (b) b.classList.add('ux-pulse');
      });
    };
    render();
  }

  function showChapter(level, done) {
    const lv = uxLevel(level), s = uxScreen('chapter');
    const host = lv.host || 'elsa';
    const root = uxPaint(`<g class="page">
      <image href="${SRC(lv.bg)}" width="960" height="520" preserveAspectRatio="xMidYMid slice"/>
      <rect width="960" height="520" fill="#101836" opacity=".58"/>
      <g filter="url(#softShadow)">
        <rect x="210" y="92" width="540" height="310" rx="34" fill="#fff9ec" stroke="#ffd27a" stroke-width="5"/>
        <image href="${SRC('portrait_' + host)}" x="415" y="114" width="130" height="130" preserveAspectRatio="xMidYMid meet"/>
        <rect x="330" y="256" width="300" height="38" rx="19" fill="#e5f2ff" stroke="#7dd4ff" stroke-width="2.5"/>
        <text x="480" y="281" text-anchor="middle" font-size="20" fill="#1e3468">${SKILL_NAMES[lv.skill] || ''} · ${lv.scaffoldLabels.join(' · ')}</text>
        <text x="480" y="346" text-anchor="middle" font-size="38" fill="#1e2a58">第 ${lv.badge} 关：${lv.title}</text>
      </g>
      ${uxButton({ act: 'go', ui: 'next', icon: 'next', x: 480, y: 446, r: 44, plate: 'gold', cls: 'ux-pulse' })}
    </g>`);
    const go = () => uxEnd(s, done);
    s.onKey = go;
    uxBind(root, { go });
    uxLine('ui_room_' + lv.id, { maxWait: 4500 });
  }

  function showClear(level, done) {
    const lv = uxLevel(level), idx = uxLevelIndex(lv), s = uxScreen('clear');
    const got = [true, !!(game.demoHeard || game.recorded), !!game.recorded];
    const starsHtml = got.map((g, k) => `<g transform="translate(${(k - 1) * 126} 0)"><g class="ux-pop on">
      ${g ? '<circle r="54" fill="#fff2b5" opacity=".35"/>' : ''}
      <path d="${UX_STAR_D}" transform="scale(50)" fill="${g ? 'url(#goldGrad)' : '#213063'}" stroke="${g ? '#fff5cf' : '#6483ba'}" stroke-width=".06" opacity="${g ? 1 : .85}"/>
    </g></g>`).join('');

    const root = uxPaint(`<g class="page">
      <image href="${SRC(lv.bg)}" width="960" height="520" preserveAspectRatio="xMidYMid slice"/>
      <rect width="960" height="520" fill="#101836" opacity=".62"/>
      <g transform="translate(480 128)">${starsHtml}</g>
      <g filter="url(#softShadow)">
        <rect x="190" y="218" width="580" height="148" rx="28" fill="#fff9ec" stroke="#ffd27a" stroke-width="4"/>
        <text x="480" y="262" text-anchor="middle" font-size="24" fill="#b8326a">亲子日常表达小贴士</text>
        ${wrap(lv.parentTip || '', 26).slice(0, 2).map((ln, i) => `<text x="480" y="${304 + i * 32}" text-anchor="middle" font-size="20" fill="#233262">${ln}</text>`).join('')}
      </g>
      ${uxButton({ act: 'replay', ui: 'replay', icon: 'replay', x: 382, y: 440, r: 38 })}
      ${uxButton({ act: 'next', ui: 'next', icon: 'next', x: 578, y: 440, r: 44, plate: 'gold', cls: 'ux-pulse' })}
    </g>`);
    const next = () => uxEnd(s, done);
    s.onKey = next;
    uxBind(root, { next, replay: () => { if (uxAlive(s)) { uxEnd(s, null); uxHooks.replay(idx); } } });
    uxSfx('star');
    uxConfetti(root.querySelector('.page'), 480, 150, 28);
    uxLine(lv.clearKey, { maxWait: 5500 });
  }

  function showFinale(done) {
    const s = uxScreen('finale');
    const finish = () => uxEnd(s, done);
    s.onKey = finish;
    let totalStars = 0;
    for (const lv of LEVELS) {
      const r = save.rooms && save.rooms[lv.id];
      if (r && Array.isArray(r.stars)) totalStars += r.stars.filter(Boolean).length;
    }
    const doneSkills = Object.values(save.skills || {}).filter(n => n > 0).length;
    const badge = (cx, cy, label, num) => `<g transform="translate(${cx} ${cy})">
      <rect x="-86" y="-26" width="172" height="52" rx="26" fill="#141c42" opacity=".9" stroke="#ffd27a" stroke-width="2.5"/>
      <text x="0" y="8" text-anchor="middle" font-size="20" fill="#fff5cf">${label} ${num}</text></g>`;

    const root = uxPaint(`<g class="page">
      <image href="${SRC('bg_palace')}" width="960" height="520" preserveAspectRatio="xMidYMid slice"/>
      <rect width="960" height="520" fill="#101836" opacity=".46"/>
      <rect x="200" y="42" width="560" height="306" rx="34" fill="#fff9ec" stroke="#ffd27a" stroke-width="5" filter="url(#softShadow)"/>
      <image href="${SRC('elsa_cheer')}" x="242" y="90" width="140" height="220" preserveAspectRatio="xMidYMid meet"/>
      <image href="${SRC('anna_cheer')}" x="410" y="96" width="150" height="214" preserveAspectRatio="xMidYMid meet"/>
      <image href="${SRC('olaf_cheer')}" x="578" y="132" width="142" height="175" preserveAspectRatio="xMidYMid meet"/>
      <text x="480" y="78" text-anchor="middle" font-size="28" fill="#1e2a58">冰雪故事小导演勋章</text>
      ${badge(284, 386, '金星', `${totalStars}/${LEVELS.length * 3}`)}
      ${badge(480, 386, '结构力', `${doneSkills}/4`)}
      ${badge(676, 386, '录音条数', String(save.recordingsCount || 0))}
      ${uxButton({ act: 'album', ui: 'album', icon: 'album', x: 356, y: 462, r: 34 })}
      ${uxButton({ act: 'train', ui: 'train', icon: 'train', x: 452, y: 462, r: 34 })}
      ${uxButton({ act: 'done', ui: 'back', icon: 'home', x: 584, y: 460, r: 42, plate: 'gold', cls: 'ux-pulse' })}
    </g>`);
    uxBind(root, {
      done: finish,
      album: () => uxEnd(s, () => { if (typeof showAlbum === 'function') showAlbum(); else showTitle(); }),
      train: () => uxEnd(s, () => { if (typeof showFreeTrain === 'function') showFreeTrain(); else showTitle(); }),
    });
    uxSfx('gliss');
    uxConfetti(root.querySelector('.page'), 480, 170, 36);
    uxLine('end', { maxWait: 6000 });
  }
