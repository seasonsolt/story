  /* Story prologue (distinct vignettes), Chapter intro cards, 3-star Clear, 10-min Eye-Care & Grand Finale. */
  let story = null;
  const storyIsOpen = () => !!story;
  const uxHooks = { replay: /** @type {(i: number) => void} */ (() => {}) };
  const UX_STAR_D = 'M0 -.8L.22 -.25L.8 -.22L.35 .15L.5 .72L0 .4L-.5 .72L-.35 .15L-.8 -.22L-.22 -.25Z';

  function uxLevel(v) { return typeof v === 'number' ? LEVELS[v] : v; }
  function uxLevelIndex(lv) { return LEVELS.indexOf(lv); }
  function uxLine(key, opts) { return hasLineKey(key) ? voice.line(key, opts) : Promise.resolve(false); }
  function uxPreload(keys) { if (typeof voice !== 'undefined' && voice.preload) voice.preload(keys); }
  function uxStopVoice() { if (typeof voice !== 'undefined' && voice.stop) voice.stop(); }

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
    if (kind === 'train') return `<circle cx="${-s * .28}" cy="${-s * .44}" r="${s * .1}" fill="${c}" opacity=".65"/><circle cx="${-s * .12}" cy="${-s * .56}" r="${s * .07}" fill="${c}" opacity=".45"/><path d="M${-s * .42} ${-s * .1}V${-s * .32}H${-s * .26}V${-s * .1}H${s * .04}V${-s * .36}H${s * .48}V${s * .18}H${-s * .48}V${-s * .1}Z" fill="${c}"/><rect x="${s * .12}" y="${-s * .24}" width="${s * .24}" height="${s * .18}" rx="2" fill="#fff9ec" opacity=".88"/><circle cx="${-s * .26}" cy="${s * .32}" r="${s * .14}" fill="${c}"/><circle cx="${s * .24}" cy="${s * .32}" r="${s * .14}" fill="${c}"/>`;
    if (kind === 'mountain') return `<path d="M${-s * .58} ${s * .42}L${-s * .14} ${-s * .36}L${s * .08} ${s * .06}L${s * .28} ${-s * .2}L${s * .6} ${s * .42}Z" fill="${c}"/><path d="${UX_STAR_D}" transform="translate(${-s * .14} ${-s * .52}) scale(${s * .2})" fill="#ffd27a"/>`;
    if (kind === 'fullscreen') return `<path d="M${-s * .48} ${-s * .16}V${-s * .48}H${-s * .16}M${s * .16} ${-s * .48}H${s * .48}V${-s * .16}M${s * .48} ${s * .16}V${s * .48}H${s * .16}M${-s * .16} ${s * .48}H${-s * .48}V${s * .16}" fill="none" stroke="${c}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (kind === 'lock') return `<path d="M${-s * .24} ${-s * .08}V${-s * .24}A${s * .24} ${s * .24} 0 0 1 ${s * .24} ${-s * .24}V${-s * .08}" fill="none" stroke="${c}" stroke-width="3.4" stroke-linecap="round"/><rect x="${-s * .38}" y="${-s * .08}" width="${s * .76}" height="${s * .58}" rx="${s * .14}" fill="${c}"/><circle cx="0" cy="${s * .2}" r="${s * .09}" fill="#1b264f"/>`;
    if (kind === 'album') return `<circle r="${s * .48}" fill="none" stroke="${c}" stroke-width="3"/><circle r="${s * .16}" fill="${c}"/>`;
    if (kind === 'meet') return `<path d="M0 ${s * .42}C${-s * .55} ${s * .05} ${-s * .62} ${-s * .38} ${-s * .26} ${-s * .46}C${-s * .08} ${-s * .5} 0 ${-s * .32} 0 ${-s * .32}C0 ${-s * .32} ${s * .08} ${-s * .5} ${s * .26} ${-s * .46}C${s * .62} ${-s * .38} ${s * .55} ${s * .05} 0 ${s * .42}Z" fill="${c}"/>`;
    if (kind === 'sticker') return `<path d="${UX_STAR_D}" transform="scale(${s * .68})" fill="${c}"/>`;
    if (kind === 'rooms') return `<rect x="${-s * .5}" y="${-s * .5}" width="${s * .42}" height="${s * .42}" rx="4" fill="${c}"/><rect x="${s * .08}" y="${-s * .5}" width="${s * .42}" height="${s * .42}" rx="4" fill="${c}"/><rect x="${-s * .5}" y="${s * .08}" width="${s * .42}" height="${s * .42}" rx="4" fill="${c}"/><rect x="${s * .08}" y="${s * .08}" width="${s * .42}" height="${s * .42}" rx="4" fill="${c}"/>`;
    if (kind === 'gear') return `<circle r="${s * .42}" fill="none" stroke="${c}" stroke-width="3.2" stroke-dasharray="5 3"/><circle r="${s * .16}" fill="${c}"/>`;
    if (kind === 'cloze') return `<circle cx="${-s * .34}" cy="0" r="${s * .16}" fill="${c}"/><path d="M${-s * .14} 0H${s * .14}" stroke="${c}" stroke-width="3" stroke-linecap="round"/><circle cx="${s * .34}" cy="0" r="${s * .16}" fill="none" stroke="${c}" stroke-width="3" stroke-dasharray="4 3"/>`;
    if (kind === 'director') return `<path d="M${-s * .24} ${-s * .36}V${s * .22}L${s * .06} ${s * .06}L${s * .22} ${s * .44}L${s * .36} ${s * .36}L${s * .18} ${-s * .02}L${s * .44} ${-s * .04}Z" fill="${c}"/><circle cx="${-s * .28}" cy="${-s * .44}" r="${s * .12}" fill="#ffd27a"/>`;
    if (kind === 'anchor' || kind === 'crown') return `<path d="M${-s * .48} ${s * .3}L${-s * .54} ${-s * .24}L${-s * .2} ${s * .04}L0 ${-s * .42}L${s * .2} ${s * .04}L${s * .54} ${-s * .24}L${s * .48} ${s * .3}Z" fill="${c}"/>`;
    if (kind === 'fx_normal') return `<circle cx="${-s * .15}" cy="${s * .24}" r="${s * .2}" fill="${c}"/><path d="M${s * .03} ${s * .24}V${-s * .42}L${s * .38} ${-s * .26}" fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`;
    if (kind === 'fx_olaf') return `<circle cx="0" cy="${-s * .22}" r="${s * .22}" fill="${c}"/><circle cx="0" cy="${s * .22}" r="${s * .3}" fill="${c}"/><path d="M${s * .08} ${-s * .24}L${s * .42} ${-s * .3}" stroke="#ff7a33" stroke-width="3.5" stroke-linecap="round"/>`;
    if (kind === 'fx_hall') return `<circle cx="0" cy="0" r="${s * .16}" fill="${c}"/><circle cx="0" cy="0" r="${s * .34}" fill="none" stroke="${c}" stroke-width="2.4" opacity=".75"/><circle cx="0" cy="0" r="${s * .5}" fill="none" stroke="${c}" stroke-width="2" opacity=".45"/>`;
    if (kind === 'download') return `<path d="M0 ${-s * .44}V${s * .16}M${-s * .26} ${-s * .06}L0 ${s * .2}L${s * .26} ${-s * .06}" fill="none" stroke="${c}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M${-s * .44} ${s * .42}H${s * .44}" stroke="${c}" stroke-width="3.2" stroke-linecap="round"/>`;
    if (kind === 'diary') return `<rect x="${-s * .4}" y="${-s * .48}" width="${s * .8}" height="${s * .96}" rx="6" fill="none" stroke="${c}" stroke-width="3"/><path d="M${-s * .12} ${-s * .48}V${s * .48}M${s * .08} ${-s * .18}H${s * .26}M${s * .08} ${s * .06}H${s * .26}" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/>`;
    if (kind === 'moon') return `<path d="M${s * .18} ${-s * .48}A${s * .48} ${s * .48} 0 1 0 ${s * .48} ${s * .18}A${s * .36} ${s * .36} 0 1 1 ${s * .18} ${-s * .48}Z" fill="${c}"/>`;
    return `<circle r="${s * .35}" fill="${c}"/>`;
  }

  function uxSlotBadgeSvg(kind, active, radius) {
    const r = radius || 17;
    const stroke = active ? '#fffdf5' : '#fff9ec';
    const sw = active ? 2.8 : 2.2;
    const ring = active ? `<circle r="${r + 3.5}" fill="none" stroke="#ffd27a" stroke-width="2" opacity=".9"/>` : '';
    if (kind === '1' || kind === '2' || kind === '3') {
      const fill = active ? '#ffbe3d' : '#263876';
      const txtCol = active ? '#3c2105' : '#fff9ec';
      return `${ring}<circle r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/><text x="0" y="6" text-anchor="middle" font-size="18" font-weight="bold" fill="${txtCol}">${kind}</text>`;
    }
    if (kind === 'star1' || kind === 'star2' || kind === 'star3') {
      const n = kind.slice(4);
      const fill = active ? '#ffbe3d' : '#263876';
      const txtCol = active ? '#3c2105' : '#fff9ec';
      return `${ring}<circle r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/><path d="${UX_STAR_D}" transform="translate(-5 0) scale(7.5)" fill="${active ? '#3c2105' : '#ffd27a'}"/><text x="7" y="5" text-anchor="middle" font-size="15" font-weight="bold" fill="${txtCol}">${n}</text>`;
    }
    if (kind === 'who') {
      return `${ring}<circle r="${r}" fill="#ff7eb6" stroke="${stroke}" stroke-width="${sw}"/><circle cx="0" cy="-4" r="5" fill="#fff9ec"/><path d="M-9 9C-9 3 9 3 9 9Z" fill="#fff9ec"/>`;
    }
    if (kind === 'where') {
      return `${ring}<circle r="${r}" fill="#4db8ff" stroke="${stroke}" stroke-width="${sw}"/><path d="M-8 8V-1L0 -9L8 -1V8H3V3H-3V8Z" fill="#fff9ec"/>`;
    }
    if (kind === 'what') {
      return `${ring}<circle r="${r}" fill="#ffaa33" stroke="${stroke}" stroke-width="${sw}"/><path d="M0 -9L2.5 -2.5L9 0L2.5 2.5L0 9L-2.5 2.5L-9 0L-2.5 -2.5Z" fill="#fff9ec"/>`;
    }
    if (kind === 'mood' || kind === 'heart') {
      return `${ring}<circle r="${r}" fill="#a484ff" stroke="${stroke}" stroke-width="${sw}"/><circle cx="-4" cy="-3" r="1.8" fill="#fff9ec"/><circle cx="4" cy="-3" r="1.8" fill="#fff9ec"/><path d="M-5 3Q0 8 5 3" fill="none" stroke="#fff9ec" stroke-width="2.2" stroke-linecap="round"/>`;
    }
    if (kind === 'pick' || kind === 'end') {
      return `${ring}<circle r="${r}" fill="${kind === 'end' ? '#49c598' : '#ff7eb6'}" stroke="${stroke}" stroke-width="${sw}"/><path d="M-7 1L-2 6L8 -5" fill="none" stroke="#fff9ec" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    if (kind === 'why' || kind === 'so') {
      return `${ring}<circle r="${r}" fill="#ffbe3d" stroke="${stroke}" stroke-width="${sw}"/><circle cx="0" cy="-2" r="6" fill="#fff9ec"/><rect x="-3" y="4" width="6" height="4" rx="1.5" fill="#fff9ec"/>`;
    }
    if (kind === 'plan') {
      return `${ring}<circle r="${r}" fill="#4db8ff" stroke="${stroke}" stroke-width="${sw}"/><path d="M-4 -7V8M-4 -6H6L3 -2L6 2H-4" fill="none" stroke="#fff9ec" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    if (kind === 'but' || kind === 'oops') {
      return `${ring}<circle r="${r}" fill="#ff738f" stroke="${stroke}" stroke-width="${sw}"/><path d="M-2 -8L4 -1H-1L3 8" fill="none" stroke="#fff9ec" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    if (kind === 'wand') {
      return `${ring}<circle r="${r}" fill="#45b7e8" stroke="${stroke}" stroke-width="${sw}"/><path d="M-6 6L4 -4M3 -8V-1M0 -5H7" fill="none" stroke="#fff9ec" stroke-width="2.5" stroke-linecap="round"/>`;
    }
    if (kind === 'star_end') {
      return `${ring}<circle r="${r}" fill="#ffbe3d" stroke="${stroke}" stroke-width="${sw}"/><path d="${UX_STAR_D}" transform="scale(10)" fill="#fffdf5"/>`;
    }
    return `${ring}<circle r="${r}" fill="#263876" stroke="${stroke}" stroke-width="${sw}"/>`;
  }

  function uxSlotBadgesFor(lv, count) {
    if (!lv) return [];
    if (lv.skill === 'sequence') return ['1', '2', '3'];
    if (lv.skill === 'sentence') return ['who', 'where', 'what', 'mood'];
    if (lv.skill === 'classify') return ['star1', 'star2', 'star3'];
    if (lv.skill === 'reason') return count === 4 ? ['pick', 'why', 'pick', 'why'] : ['pick', 'why'];
    if (lv.skill === 'twist') return ['plan', 'but', 'so', 'end'];
    if (lv.skill === 'episode') return ['who', 'oops', 'heart', 'wand', 'star_end'];
    return [];
  }

  function uxButton(o) {
    const r = Math.max(32, o.r || 36);
    const hitR = layoutHitRadius(r, !!o.ring);
    const fill = o.plate === 'gold' ? 'url(#goldGrad)' : (o.plate === 'rec' ? 'url(#micRecGrad)' : 'url(#plateGrad)');
    const stroke = o.plate === 'gold' ? '#fff7dc' : (o.plate === 'rec' ? '#ffdbe6' : '#7ea9e8');
    const icCol = o.plate === 'gold' ? '#4a2605' : (o.plate === 'rec' ? '#ffffff' : '#1b2c5c');
    const cls = 'ux-btn' + (o.cls ? ' ' + o.cls : '');
    const pic = o.pic ? uxPic(o.pic, -r * .72, -r * .72, r * 1.44, r * 1.44, '', o.picFit || 'meet') : uxIcon(o.icon || o.ui, r * .66, icCol);
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

  function storyBeatSceneHtml(key) {
    if (key === 'p1') {
      return `<image href="${SRC('bg_palace')}" width="960" height="520" preserveAspectRatio="xMidYMid slice"/>
        <rect width="960" height="520" fill="#101836" opacity=".36"/>
        <circle cx="480" cy="240" r="190" fill="url(#aurora)" opacity=".65"/>
        <image href="${SRC('elsa_speak')}" x="210" y="130" width="246" height="250" preserveAspectRatio="xMidYMid meet" filter="url(#softShadow)"/>
        <rect x="494" y="134" width="234" height="222" rx="30" fill="#fff9ec" opacity=".95" stroke="#ffd27a" stroke-width="4" filter="url(#softShadow)"/>
        ${uxPic('prop_mic', 540, 152, 140, 184, '', 'meet')}`;
    }
    if (key === 'p2') {
      const seq = ['card_snowfall', 'card_rollball', 'card_olaf_born'];
      const seqHtml = seq.map((cid, k) => `<rect x="${190 + k * 140}" y="114" width="118" height="114" rx="22" fill="#fff9ec" stroke="#ffd27a" stroke-width="3.5" filter="url(#softShadow)"/>
        ${uxPic(cid, 202 + k * 140, 126, 94, 90, '', 'meet')}`).join('');
      return `<image href="${SRC('bg_garden')}" width="960" height="520" preserveAspectRatio="xMidYMid slice"/>
        <rect width="960" height="520" fill="#101836" opacity=".42"/>
        ${seqHtml}
        <image href="${SRC('anna_cheer')}" x="630" y="140" width="220" height="240" preserveAspectRatio="xMidYMid meet" filter="url(#softShadow)"/>`;
    }
    if (key === 'p3') {
      return `<image href="${SRC('bg_cozy')}" width="960" height="520" preserveAspectRatio="xMidYMid slice"/>
        <rect width="960" height="520" fill="#101836" opacity=".34"/>
        <circle cx="480" cy="250" r="200" fill="url(#warm)" opacity=".55"/>
        <image href="${SRC('olaf_cheer')}" x="392" y="160" width="184" height="216" preserveAspectRatio="xMidYMid meet" filter="url(#softShadow)"/>
        ${uxPic('card_sky_lanterns', 196, 154, 142, 134, '', 'meet')}
        ${uxPic('card_aurora_crown', 622, 154, 146, 134, '', 'meet')}`;
    }
    if (key === 'win') {
      return `<image href="${SRC('bg_palace')}" width="960" height="520" preserveAspectRatio="xMidYMid slice"/>
        <rect width="960" height="520" fill="#101836" opacity=".34"/>
        <circle cx="480" cy="230" r="210" fill="url(#warm)" opacity=".55"/>
        ${uxPic('card_aurora_crown', 350, 42, 260, 150, '', 'meet')}
        <image href="${SRC('elsa_cheer')}" x="220" y="180" width="166" height="240" preserveAspectRatio="xMidYMid meet"/>
        <image href="${SRC('anna_cheer')}" x="406" y="186" width="166" height="232" preserveAspectRatio="xMidYMid meet"/>
        <image href="${SRC('olaf_cheer')}" x="594" y="216" width="154" height="196" preserveAspectRatio="xMidYMid meet"/>`;
    }
    return `<image href="${SRC('key')}" width="960" height="520" preserveAspectRatio="xMidYMid slice"/>`;
  }

  function showStory(keys, done) {
    const s = uxScreen('story');
    uxPreload(keys);
    let idx = 0;
    const render = () => {
      if (!uxAlive(s)) return;
      const key = keys[idx];
      const root = uxPaint(`<g class="page">
        ${storyBeatSceneHtml(key)}
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
    const preview = lv.skill === 'reason' && lv.puzzles && lv.puzzles[0]
      ? [lv.puzzles[0].promptCard, ...lv.puzzles[0].answer]
      : (lv.target || []).slice(0, 5);
    const badges = uxSlotBadgesFor(lv, preview.length);
    const pn = Math.max(1, preview.length);
    const pw = pn >= 5 ? 90 : 104, ph = pn >= 5 ? 90 : 104, pgap = pn >= 5 ? 16 : (pn >= 4 ? 22 : 38);
    const px0 = 480 - (pn * pw + (pn - 1) * pgap) / 2;
    const py = pn >= 5 ? 224 : 214;
    const previewHtml = preview.map((cid, i) => {
      const px = px0 + i * (pw + pgap);
      const bk = lv.skill === 'reason' ? (i === 0 ? '' : badges[i - 1]) : badges[i];
      const conn = i < pn - 1
        ? (lv.skill === 'sentence'
          ? `<rect x="${px + pw}" y="${py + ph / 2 - 4}" width="${pgap}" height="8" rx="4" fill="#ffd27a"/>`
          : `<path d="M${px + pw + 3} ${py + ph / 2}H${px + pw + pgap - 4}L${px + pw + pgap - 9} ${py + ph / 2 - 5}M${px + pw + pgap - 4} ${py + ph / 2}L${px + pw + pgap - 9} ${py + ph / 2 + 5}" fill="none" stroke="#ffbe3d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`)
        : '';
      const wheels = lv.skill === 'sentence'
        ? `<circle cx="${px + 26}" cy="${py + ph + 8}" r="8" fill="#263876" stroke="#ffd27a" stroke-width="2.5"/><circle cx="${px + pw - 26}" cy="${py + ph + 8}" r="8" fill="#263876" stroke="#ffd27a" stroke-width="2.5"/>`
        : '';
      return `${conn}${wheels}<g><rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="18" fill="#eef6ff" stroke="#7dd4ff" stroke-width="2.6"/>
        <image href="${SRC(cid)}" x="${px + 7}" y="${py + 7}" width="${pw - 14}" height="${ph - 14}" preserveAspectRatio="xMidYMid meet"/>
        ${bk ? `<g transform="translate(${px + pw / 2} ${py - 2})">${uxSlotBadgeSvg(bk, false, 13)}</g>` : ''}</g>`;
    }).join('');

    const root = uxPaint(`<g class="page">
      <image href="${SRC(lv.bg)}" width="960" height="520" preserveAspectRatio="xMidYMid slice"/>
      <rect width="960" height="520" fill="#101836" opacity=".56"/>
      <g filter="url(#softShadow)">
        <rect x="170" y="54" width="620" height="320" rx="34" fill="#fff9ec" stroke="#ffd27a" stroke-width="5"/>
        <image href="${SRC('portrait_' + host)}" x="423" y="72" width="114" height="114" preserveAspectRatio="xMidYMid meet"/>
        <circle cx="530" cy="90" r="20" fill="url(#goldGrad)" stroke="#fff9ec" stroke-width="2.5"/>
        <text x="530" y="97" text-anchor="middle" font-size="22" font-weight="bold" fill="#4a2605">${lv.badge}</text>
        ${previewHtml}
      </g>
      ${uxButton({ act: 'go', ui: 'next', icon: 'play', x: 480, y: 440, r: 46, plate: 'gold', cls: 'ux-pulse' })}
    </g>`);
    const go = () => uxEnd(s, done);
    s.onKey = go;
    uxBind(root, { go });
    uxLine('ui_room_' + lv.id, { maxWait: 4500 });
  }

  function showClear(level, done) {
    const lv = uxLevel(level), idx = uxLevelIndex(lv), s = uxScreen('clear');
    const got = [true, !!(game.demoHeard || game.recorded), !!game.recorded];
    const starsHtml = got.map((g, k) => `<g transform="translate(${(k - 1) * 134} 0)"><g class="ux-pop on">
      ${g ? '<circle r="54" fill="#fff2b5" opacity=".38"/>' : ''}
      <path d="${UX_STAR_D}" transform="scale(50)" fill="${g ? 'url(#goldGrad)' : '#213063'}" stroke="${g ? '#fff5cf' : '#6483ba'}" stroke-width=".06" opacity="${g ? 1 : .85}"/>
    </g></g>`).join('');

    const root = uxPaint(`<g class="page">
      <image href="${SRC(lv.bg)}" width="960" height="520" preserveAspectRatio="xMidYMid slice"/>
      <rect width="960" height="520" fill="#101836" opacity=".54"/>
      <circle cx="480" cy="296" r="190" fill="url(#warm)" opacity=".55" pointer-events="none"/>
      <g transform="translate(480 114)">${starsHtml}</g>
      <image href="${SRC('elsa_cheer')}" x="236" y="178" width="146" height="220" preserveAspectRatio="xMidYMid meet"/>
      <image href="${SRC('anna_cheer')}" x="405" y="184" width="152" height="214" preserveAspectRatio="xMidYMid meet"/>
      <image href="${SRC('olaf_cheer')}" x="576" y="214" width="146" height="180" preserveAspectRatio="xMidYMid meet"/>
      ${uxButton({ act: 'replay', ui: 'replay', icon: 'replay', x: 384, y: 450, r: 38 })}
      ${uxButton({ act: 'next', ui: 'next', icon: 'next', x: 576, y: 450, r: 46, plate: 'gold', cls: 'ux-pulse' })}
    </g>`);
    const next = () => uxEnd(s, done);
    s.onKey = next;
    uxBind(root, { next, replay: () => { if (uxAlive(s)) { uxEnd(s, null); uxHooks.replay(idx); } } });
    uxSfx('star');
    uxConfetti(root.querySelector('.page'), 480, 140, 32);
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
    const pill = (cx, cy, innerHtml) => `<g transform="translate(${cx} ${cy})">
      <rect x="-86" y="-26" width="172" height="52" rx="26" fill="#141c42" opacity=".92" stroke="#ffd27a" stroke-width="2.5"/>
      ${innerHtml}</g>`;

    const dotCols = ['#ff9cc4', '#7dd4ff', '#ffd27a', '#b79cff', '#49c598', '#ff8c66'];
    const starPill = pill(284, 382, `${uxPic('prop_star', -54, -15, 32, 28, '', 'meet')}<text x="16" y="8" text-anchor="middle" font-size="22" font-weight="bold" fill="#fff5cf">${totalStars}/${LEVELS.length * 3}</text>`);
    const dotsPill = pill(480, 382, `${dotCols.map((c, i) => `<circle cx="${-56 + i * 13}" cy="0" r="5" fill="${c}" stroke="#fff9ec" stroke-width="1"/>`).join('')}<text x="44" y="8" text-anchor="middle" font-size="21" font-weight="bold" fill="#fff5cf">${doneSkills}/6</text>`);
    const micPill = pill(676, 382, `${uxPic('prop_mic', -44, -17, 22, 34, '', 'meet')}<text x="16" y="8" text-anchor="middle" font-size="22" font-weight="bold" fill="#fff5cf">${save.recordingsCount || 0}</text>`);

    const root = uxPaint(`<g class="page">
      <image href="${SRC('bg_palace')}" width="960" height="520" preserveAspectRatio="xMidYMid slice"/>
      <rect width="960" height="520" fill="#101836" opacity=".46"/>
      <rect x="200" y="44" width="560" height="298" rx="34" fill="#fff9ec" stroke="#ffd27a" stroke-width="5" filter="url(#softShadow)"/>
      ${uxPic('prop_star', 448, 50, 64, 56, '', 'meet')}
      <path d="${UX_STAR_D}" transform="translate(414 78) scale(15)" fill="#ffd27a"/>
      <path d="${UX_STAR_D}" transform="translate(546 78) scale(15)" fill="#ffd27a"/>
      <image href="${SRC('elsa_cheer')}" x="242" y="104" width="140" height="220" preserveAspectRatio="xMidYMid meet"/>
      <image href="${SRC('anna_cheer')}" x="408" y="108" width="150" height="214" preserveAspectRatio="xMidYMid meet"/>
      <image href="${SRC('olaf_cheer')}" x="576" y="144" width="142" height="175" preserveAspectRatio="xMidYMid meet"/>
      ${starPill}${dotsPill}${micPill}
      ${uxButton({ act: 'album', ui: 'album', pic: 'prop_mic', x: 356, y: 460, r: 34 })}
      ${uxButton({ act: 'train', ui: 'train', icon: 'train', x: 452, y: 460, r: 34 })}
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

  function showEyeCareBreak(done) {
    const s = uxScreen('eyeCare');
    const root = uxPaint(`<g class="page">
      <image href="${SRC('bg_cozy')}" width="960" height="520" preserveAspectRatio="xMidYMid slice"/>
      <rect width="960" height="520" fill="#0d1532" opacity=".76"/>
      <circle cx="480" cy="210" r="150" fill="url(#warm)" opacity=".35"/>
      <g transform="translate(480 130)">
        <circle r="56" fill="#182552" stroke="#ffd27a" stroke-width="4" filter="url(#softShadow)"/>
        <g>${uxIcon('moon', 50, '#ffd27a')}</g>
        <path d="${UX_STAR_D}" transform="translate(-76 -30) scale(12)" fill="#9fe8ff"/>
        <path d="${UX_STAR_D}" transform="translate(82 -24) scale(14)" fill="#ffd27a"/>
      </g>
      <image href="${SRC('olaf_idle')}" x="332" y="218" width="120" height="175" preserveAspectRatio="xMidYMid meet"/>
      <image href="${SRC('anna_idle')}" x="506" y="198" width="126" height="196" preserveAspectRatio="xMidYMid meet"/>
      ${uxButton({ act: 'go', ui: 'continue', icon: 'play', x: 480, y: 446, r: 44, plate: 'gold', cls: 'ux-pulse' })}
    </g>`);
    const go = () => uxEnd(s, done);
    s.onKey = go;
    uxBind(root, { go });
    uxLine('eye_care_rest', { maxWait: 8000 });
  }
