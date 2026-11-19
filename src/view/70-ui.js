  /* Title Screen, 8-Room Story Map, Zero-Reading Gameplay HUD, and Parent Structured-Expression Report Modal. */
  const uxState = { modal: false };

  function syncHud() {
    const hud = $('hud');
    if (!hud) return;
    if (game.state !== 'play' || storyIsOpen()) { hud.textContent = ''; return; }
    const lv = game.level();
    const host = (lv && lv.host) || 'elsa';
    const dots = LEVELS.map((l, k) => {
      const done = !!(save.rooms && save.rooms[l.id] && save.rooms[l.id].cleared);
      const cur = k === game.index;
      const r = cur ? 6.2 : (done ? 4.6 : 4);
      const fill = cur ? '#ffd27a' : (done ? '#ffbe3d' : '#49629c');
      const stroke = cur ? ' stroke="#fff9ec" stroke-width="1.8"' : '';
      return `<circle cx="${104 + k * 15}" cy="46" r="${r}" fill="${fill}"${stroke}/>`;
    }).join('');
    hud.innerHTML = `<g class="hud-bar">
      <g class="ux-btn" data-act="prompt" role="button" tabindex="0" aria-label="再听一遍">
        <circle cx="46" cy="46" r="36" fill="transparent"/>
        <g class="btn-vis" filter="url(#softShadow)">
          <circle cx="46" cy="46" r="30" fill="#162044" stroke="#ffd27a" stroke-width="3"/>
          <image href="${SRC('portrait_' + host)}" x="20" y="20" width="52" height="52" preserveAspectRatio="xMidYMid meet"/>
          <circle cx="70" cy="66" r="12" fill="url(#goldGrad)" stroke="#fff9ec" stroke-width="1.8"/>
          <g transform="translate(70 66)">${uxIcon('speaker', 10, '#4a2605')}</g>
        </g>
      </g>
      <g filter="url(#softShadow)">
        <rect x="88" y="29" width="136" height="34" rx="17" fill="#162044" opacity=".9" stroke="#7dd4ff" stroke-width="2.2"/>
        ${dots}
      </g>
      ${uxButton({ act: 'replay', ui: 'replay', icon: 'replay', x: 706, y: 45, r: 32 })}
      ${uxButton({ act: 'home', ui: 'back', icon: 'home', x: 778, y: 45, r: 32 })}
      ${uxButton({ act: 'hint', ui: 'hint', icon: 'sticker', x: 850, y: 45, r: 32, plate: 'gold' })}
      ${uxButton({ act: 'fs', ui: 'fullscreen', icon: 'fullscreen', x: 918, y: 45, r: 32 })}
    </g>`;

    uxBind(hud, {
      prompt: () => onHudPrompt(),
      replay: () => onHudReplay(),
      home: () => { if (typeof stopStudioPlayback === 'function') stopStudioPlayback(); game.state = 'title'; showTitle(); },
      hint: () => triggerHint(),
      fs: () => toggleFullscreen(),
    });
  }

  function showTitle() {
    game.state = 'title';
    syncHud();
    const s = uxScreen('title');
    const playUi = unlockedRooms() > 1 ? 'continue' : 'play';
    const root = uxPaint(`<g class="page">
      <image href="${SRC('key')}" width="960" height="520" preserveAspectRatio="xMidYMid slice"/>
      <rect width="960" height="520" fill="url(#bottomFade)" opacity=".5" pointer-events="none"/>
      <g filter="url(#softShadow)">
        <rect x="255" y="18" width="450" height="62" rx="31" fill="#141c42" opacity=".88" stroke="#ffd27a" stroke-width="3"/>
        <text x="480" y="59" text-anchor="middle" font-size="35" fill="#fff9ec" letter-spacing="2">冰雪故事小导演</text>
      </g>
      ${uxButton({ act: 'play', ui: playUi, icon: 'play', x: 480, y: 266, r: 54, plate: 'gold', cls: 'ux-pulse' })}
      ${uxButton({ act: 'rooms', ui: 'rooms', icon: 'rooms', x: 306, y: 408, r: 38 })}
      ${uxButton({ act: 'train', ui: 'train', icon: 'train', x: 422, y: 408, r: 38 })}
      ${uxButton({ act: 'album', ui: 'album', pic: 'prop_mic', x: 538, y: 408, r: 38 })}
      ${uxButton({ act: 'meet', ui: 'meet', icon: 'meet', x: 654, y: 408, r: 38, plate: 'gold' })}
      ${uxButton({ act: 'gear', ui: 'settings', icon: 'gear', x: 902, y: 458, r: 34 })}
    </g>`);

    const launch = () => { unlockAudio(); uxEnd(s, () => onStartJourney()); };
    s.onKey = launch;
    uxBind(root, {
      play: launch,
      rooms: () => { unlockAudio(); uxEnd(s, () => showRooms()); },
      train: () => { unlockAudio(); uxEnd(s, () => showFreeTrain()); },
      album: () => { unlockAudio(); uxEnd(s, () => showAlbum()); },
      meet: () => { unlockAudio(); uxEnd(s, () => showMeet()); },
    });

    const gear = root.querySelector('[data-act="gear"]');
    if (gear) {
      let timer = 0;
      const down = () => {
        unlockAudio();
        gear.classList.add('is-hold');
        clearTimeout(timer);
        timer = setTimeout(() => { gear.classList.remove('is-hold'); openParentModal(); }, DEV ? 250 : 1500);
      };
      const up = () => { clearTimeout(timer); gear.classList.remove('is-hold'); };
      gear.addEventListener('pointerdown', down);
      gear.addEventListener('pointerup', up);
      gear.addEventListener('pointerleave', up);
      gear.addEventListener('keydown', /** @param {KeyboardEvent} e */ e => { if (e.key === 'Enter' && DEV) openParentModal(); });
    }
  }

  function showRooms() {
    const s = uxScreen('rooms');
    loadArt(LEVELS.map(l => l.coverCard), ART_PATIENCE);
    const unlocked = unlockedRooms();
    let totalStars = 0;
    for (const l of LEVELS) {
      const rr = save.rooms && save.rooms[l.id];
      if (rr && Array.isArray(rr.stars)) totalStars += rr.stars.filter(Boolean).length;
    }
    const cards = LEVELS.map((lv, i) => {
      const col = i % 4, row = (i / 4) | 0;
      const x = 68 + col * 212, y = 92 + row * 182;
      const open = i < unlocked;
      const rSave = save.rooms && save.rooms[lv.id];
      const stars = (rSave && rSave.stars) || [false, false, false];
      const starRow = stars.map((g, k) => `<path d="${UX_STAR_D}" transform="translate(${62 + k * 34} 134) scale(14)" fill="${g ? '#ffd27a' : '#233262'}" stroke="#fff5cf" stroke-width=".08"/>`).join('');
      return `<g class="ux-btn" data-act="${open ? 'pick' : ''}" data-room="${i}" data-ui="${open ? 'room_' + lv.id : ''}" data-state="${open ? 'open' : 'lock'}" role="button" tabindex="${open ? 0 : -1}" aria-label="${lv.title}" transform="translate(${x} ${y})">
        <g class="btn-vis" filter="url(#softShadow)">
          <rect width="192" height="158" rx="22" fill="${open ? '#fff9ec' : '#1b264f'}" stroke="${open ? '#ffd27a' : '#4a6099'}" stroke-width="3.5"/>
          <image href="${SRC(lv.bg)}" x="8" y="8" width="176" height="104" clip-path="url(#rcClip)" preserveAspectRatio="xMidYMid slice" opacity="${open ? .24 : .12}"/>
          <image href="${SRC(lv.coverCard)}" x="46" y="14" width="100" height="96" preserveAspectRatio="xMidYMid meet" opacity="${open ? 1 : .24}"/>
          <circle cx="26" cy="26" r="15" fill="${open ? 'url(#goldGrad)' : '#263876'}" stroke="#fff9ec" stroke-width="2"/>
          <text x="26" y="32" text-anchor="middle" font-size="18" font-weight="bold" fill="${open ? '#4a2605' : '#8da7db'}">${lv.badge}</text>
          ${open
            ? `<image href="${SRC('portrait_' + lv.host)}" x="150" y="10" width="34" height="34" preserveAspectRatio="xMidYMid meet"/>`
            : `<g transform="translate(96 62)">${uxIcon('lock', 36, '#9cb6e8')}</g>`}
          ${starRow}
        </g>
      </g>`;
    }).join('');
    const root = uxPaint(`<g class="page">
      <defs><clipPath id="rcClip"><rect x="8" y="8" width="176" height="104" rx="16"/></clipPath></defs>
      <image href="${SRC('bg_palace')}" width="960" height="520" preserveAspectRatio="xMidYMid slice"/>
      <rect width="960" height="520" fill="#101836" opacity=".64"/>
      ${uxButton({ act: 'back', ui: 'back', icon: 'back', x: 56, y: 48, r: 34 })}
      <g filter="url(#softShadow)">
        <rect x="394" y="22" width="172" height="44" rx="22" fill="#141c42" opacity=".92" stroke="#ffd27a" stroke-width="2.5"/>
        ${uxPic('prop_star', 418, 29, 32, 30, '', 'meet')}
        <text x="500" y="52" text-anchor="middle" font-size="22" font-weight="bold" fill="#fff5cf">${totalStars}/${LEVELS.length * 3}</text>
      </g>
      ${cards}
    </g>`);
    const back = () => uxEnd(s, () => showTitle());
    s.onKey = back;
    uxBind(root, { back });
    root.querySelectorAll('[data-room]').forEach(card => {
      const idx = Number(card.getAttribute('data-room'));
      if (idx >= unlocked) return;
      const go = () => uxEnd(s, () => openRoom(idx));
      card.addEventListener('click', go);
      card.addEventListener('keydown', /** @param {KeyboardEvent} e */ e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
  }

  function openParentModal() {
    const modal = $('modal');
    if (!modal || uxState.modal) return;
    uxState.modal = true;
    const mins = Math.max(1, Math.round((save.totalPlaySeconds || 0) / 60));
    const skList = [
      ['sequence', '时间顺序 (先→接着→最后)', '#ff9cc4'],
      ['sentence', '完整句子 (谁·在哪儿·干什么)', '#7dd4ff'],
      ['classify', '总分归类 (总数+一二三)', '#ffd27a'],
      ['reason', '因果理由 (我选…因为…)', '#b79cff'],
    ];
    let tipIdx = 0;
    const drawModal = () => {
      const bars = skList.map(([k, lbl, col], idx) => {
        const val = Math.min(2, (save.skills && save.skills[k]) || 0);
        const y = 104 + idx * 36;
        return `<text x="48" y="${y}" font-size="16" fill="#233262">${lbl}</text>
          <rect x="300" y="${y - 14}" width="180" height="16" rx="8" fill="#e1ecff"/>
          <rect x="300" y="${y - 14}" width="${Math.round((val / 2) * 180)}" height="16" rx="8" fill="${col}"/>
          <text x="494" y="${y}" font-size="15" fill="#4e5d8c">${val}/2</text>`;
      }).join('');
      const tipLines = wrap(LEVELS[tipIdx].parentTip || '', 28).slice(0, 2);
      modal.innerHTML = `<rect width="960" height="520" fill="#0d1430" opacity=".82"/>
        <g transform="translate(180 38)" filter="url(#softShadow)">
          <rect width="600" height="444" rx="28" fill="#fff9ec" stroke="#ffd27a" stroke-width="4"/>
          <text x="300" y="42" text-anchor="middle" font-size="26" fill="#1e2a58">家长表达力报告与设置</text>
          <text x="300" y="72" text-anchor="middle" font-size="16" fill="#4e5d8c">本地录音：${save.recordingsCount || 0} 次 · 自由造句：${save.freeSentences || 0} 句 · 累计探索：${mins} 分钟</text>
          ${bars}
          <g class="ux-btn" data-m="nextTip" transform="translate(48 242)">
            <rect width="504" height="82" rx="16" fill="#eef5ff" stroke="#7dd4ff" stroke-width="2"/>
            <text x="16" y="24" font-size="14" fill="#b8326a">今日亲子日常提问建议（点我换一条）：</text>
            ${tipLines.map((ln, i) => `<text x="16" y="${48 + i * 22}" font-size="15" fill="#1e2a58">${ln}</text>`).join('')}
          </g>
          <g class="ux-btn" data-m="subs" transform="translate(48 342)"><rect width="160" height="48" rx="14" fill="#eef5ff" stroke="#7ea9e8" stroke-width="2"/><text x="80" y="31" text-anchor="middle" font-size="17" fill="#1e2a58">字幕：${setting('subtitles') ? '开' : '关'}</text></g>
          <g class="ux-btn" data-m="snd" transform="translate(220 342)"><rect width="160" height="48" rx="14" fill="#eef5ff" stroke="#7ea9e8" stroke-width="2"/><text x="80" y="31" text-anchor="middle" font-size="17" fill="#1e2a58">声音：${setting('sound') ? '开' : '关'}</text></g>
          <g class="ux-btn" data-m="close" transform="translate(392 342)"><rect width="160" height="48" rx="14" fill="url(#goldGrad)" stroke="#d6a44e" stroke-width="2"/><text x="80" y="31" text-anchor="middle" font-size="19" fill="#4a2605">关闭返回</text></g>
        </g>`;
      modal.querySelectorAll('[data-m]').forEach(b => {
        b.addEventListener('click', () => {
          const m = b.getAttribute('data-m');
          if (m === 'subs') { setSetting('subtitles', !setting('subtitles')); drawModal(); }
          else if (m === 'snd') { setSetting('sound', !setting('sound')); drawModal(); }
          else if (m === 'nextTip') { tipIdx = (tipIdx + 1) % LEVELS.length; drawModal(); }
          else { uxState.modal = false; modal.textContent = ''; }
        });
      });
    };
    drawModal();
  }
