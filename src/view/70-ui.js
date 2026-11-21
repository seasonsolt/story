  /* Minimalist Title Screen, 4-Act 12-Room Map, Calm Child HUD & 2-Tab Parent Modal (incl. Tier selector & Export). */
  const uxState = { modal: false };

  function syncHud() {
    const hud = $('hud');
    if (!hud) return;
    if (game.state !== 'play' || storyIsOpen()) { hud.textContent = ''; return; }
    const lv = game.level();
    const host = (lv && lv.host) || 'elsa';
    const actCols = ['#7dd4ff', '#ff9cc4', '#ff9e64', '#ffd27a'];
    const strokeCol = actCols[(lv.act || 1) - 1];

    hud.innerHTML = `<g class="hud-bar">
      <g class="ux-btn" data-act="prompt" role="button" tabindex="0" aria-label="再听一遍">
        <circle cx="46" cy="46" r="36" fill="transparent"/>
        <g class="btn-vis" filter="url(#softShadow)">
          <circle cx="46" cy="46" r="30" fill="#162044" stroke="${strokeCol}" stroke-width="3"/>
          <image href="${SRC('portrait_' + host)}" x="20" y="20" width="52" height="52" preserveAspectRatio="xMidYMid meet"/>
          <circle cx="70" cy="66" r="12" fill="url(#goldGrad)" stroke="#fff9ec" stroke-width="1.8"/>
          <g transform="translate(70 66)">${uxIcon('speaker', 10, '#4a2605')}</g>
        </g>
      </g>
      <g filter="url(#softShadow)">
        <rect x="86" y="30" width="76" height="32" rx="16" fill="#162044" opacity=".9" stroke="${strokeCol}" stroke-width="2"/>
        <text x="124" y="52" text-anchor="middle" font-size="16" font-weight="bold" fill="#fff9ec">${lv.badge} / ${LEVELS.length}</text>
      </g>
      ${uxButton({ act: 'hint', ui: 'hint', icon: 'sticker', x: 836, y: 45, r: 32, plate: 'gold' })}
      ${uxButton({ act: 'home', ui: 'back', icon: 'home', x: 910, y: 45, r: 32 })}
    </g>`;

    uxBind(hud, {
      prompt: () => onHudPrompt(),
      home: () => { if (typeof stopStudioPlayback === 'function') stopStudioPlayback(); game.state = 'title'; maybeEyeCareBreak(showTitle); },
      hint: () => triggerHint(),
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
      ${uxButton({ act: 'play', ui: playUi, icon: 'play', x: 480, y: 262, r: 54, plate: 'gold', cls: 'ux-pulse' })}
      ${uxButton({ act: 'rooms', ui: 'rooms', icon: 'rooms', x: 320, y: 412, r: 40 })}
      ${uxButton({ act: 'workshop', ui: 'workshop', pic: 'portrait_olaf', x: 480, y: 412, r: 40, plate: 'gold' })}
      ${uxButton({ act: 'album', ui: 'album', pic: 'prop_mic', x: 640, y: 412, r: 40 })}
      ${uxButton({ act: 'gear', ui: 'settings', icon: 'gear', x: 902, y: 458, r: 32 })}
    </g>`);

    const launch = () => { unlockAudio(); uxEnd(s, () => onStartJourney()); };
    s.onKey = launch;
    uxBind(root, {
      play: launch,
      rooms: () => { unlockAudio(); uxEnd(s, () => showRooms()); },
      workshop: () => { unlockAudio(); uxEnd(s, () => { if (typeof showWorkshop === 'function') showWorkshop(); }); },
      album: () => { unlockAudio(); uxEnd(s, () => showAlbum()); },
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
    const actCols = ['#7dd4ff', '#ff9cc4', '#ff9e64', '#ffd27a'];
    const cards = LEVELS.map((lv, i) => {
      const col = i % 4, row = (i / 4) | 0;
      const x = 64 + col * 212, y = 84 + row * 142;
      const open = i < unlocked;
      const rSave = save.rooms && save.rooms[lv.id];
      const stars = (rSave && rSave.stars) || [false, false, false];
      const crown = rSave && rSave.tier3 ? `<g transform="translate(172 52)">${uxIcon('crown', 14, '#ffb703')}</g>` : '';
      const borderCol = open ? actCols[(lv.act || 1) - 1] : '#4a6099';
      const starRow = stars.map((g, k) => `<path d="${UX_STAR_D}" transform="translate(${64 + k * 34} 109) scale(12)" fill="${g ? '#ffd27a' : '#233262'}" stroke="#fff5cf" stroke-width=".08"/>`).join('');
      return `<g class="ux-btn" data-act="${open ? 'pick' : ''}" data-room="${i}" data-ui="${open ? 'room_' + lv.id : ''}" data-state="${open ? 'open' : 'lock'}" role="button" tabindex="${open ? 0 : -1}" aria-label="${lv.title}" transform="translate(${x} ${y})">
        <g class="btn-vis" filter="url(#softShadow)">
          <rect width="196" height="128" rx="20" fill="${open ? '#fff9ec' : '#1b264f'}" stroke="${borderCol}" stroke-width="3.4"/>
          <image href="${SRC(lv.bg)}" x="8" y="8" width="180" height="82" clip-path="url(#rcClip)" preserveAspectRatio="xMidYMid slice" opacity="${open ? .24 : .12}"/>
          <image href="${SRC(lv.coverCard)}" x="54" y="10" width="88" height="80" preserveAspectRatio="xMidYMid meet" opacity="${open ? 1 : .24}"/>
          <circle cx="24" cy="24" r="14" fill="${open ? 'url(#goldGrad)' : '#263876'}" stroke="#fff9ec" stroke-width="2"/>
          <text x="24" y="30" text-anchor="middle" font-size="16" font-weight="bold" fill="${open ? '#4a2605' : '#8da7db'}">${lv.badge}</text>
          ${open
            ? `<image href="${SRC('portrait_' + lv.host)}" x="156" y="8" width="32" height="32" preserveAspectRatio="xMidYMid meet"/>${crown}`
            : `<g transform="translate(98 52)">${uxIcon('lock', 30, '#9cb6e8')}</g>`}
          ${starRow}
        </g>
      </g>`;
    }).join('');
    const root = uxPaint(`<g class="page">
      <defs><clipPath id="rcClip"><rect x="8" y="8" width="180" height="82" rx="14"/></clipPath></defs>
      <image href="${SRC('bg_palace')}" width="960" height="520" preserveAspectRatio="xMidYMid slice"/>
      <rect width="960" height="520" fill="#101836" opacity=".64"/>
      ${uxButton({ act: 'back', ui: 'back', icon: 'back', x: 56, y: 46, r: 32 })}
      <g filter="url(#softShadow)">
        <rect x="394" y="20" width="172" height="44" rx="22" fill="#141c42" opacity=".92" stroke="#ffd27a" stroke-width="2.5"/>
        ${uxPic('prop_star', 418, 27, 32, 30, '', 'meet')}
        <text x="500" y="50" text-anchor="middle" font-size="22" font-weight="bold" fill="#fff5cf">${totalStars}/${LEVELS.length * 3}</text>
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
    let tab = 'stats';
    let tipIdx = 0;
    let pageIdx = 0;
    let toast = '';
    let exportItems = [];

    const fmtSec = ms => ms ? (ms / 1000).toFixed(1) + '秒' : '—';
    const fmtDate = ts => {
      if (!ts) return '';
      const d = new Date(ts);
      return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    const tierLabel = t => t === 'cloze' ? '接力(推荐)' : (t === 'director' ? '点卡' : '独立');

    const refreshExportItems = async () => {
      const keySet = new Set(await recorder.listClipKeys());
      const items = [];
      for (const lv of LEVELS) {
        const lk = 'room_' + lv.id;
        const fk = lk + '_first';
        if (keySet.has(lk)) {
          const rSave = (save.rooms && save.rooms[lv.id]) || {};
          items.push({
            kind: 'room', key: lk, firstKey: keySet.has(fk) ? fk : '',
            title: `${lv.badge}. ${lv.title}`,
            sub: `首次 ${fmtSec(rSave.firstSpeechMs)} · 最新 ${fmtSec(rSave.lastSpeechMs)}`,
          });
        }
      }
      for (const c of save.creations || []) {
        if (!keySet.has(c.id)) continue;
        items.push({
          kind: 'free', key: c.id, firstKey: '',
          title: c.mode === 'mountain' ? '自由故事山作品' : '自由造句列车作品',
          sub: `${fmtDate(c.createdAt)} · 开口 ${fmtSec(c.activeSpeechMs || c.durationMs)}`,
        });
      }
      for (const d of save.diary || []) {
        if (!keySet.has(d.id)) continue;
        const tp = (INTERVIEW_TOPICS || []).find(t => t.id === d.topicId);
        items.push({
          kind: 'diary', key: d.id, firstKey: '',
          title: `雪宝日记：${tp ? tp.title : d.topicId}`,
          sub: `${fmtDate(d.createdAt)} · 开口 ${fmtSec(d.activeSpeechMs || d.durationMs)}`,
        });
      }
      exportItems = items;
    };

    const stopModalAudio = () => {
      recorder.stopPlay();
      setRecordingAudioMode('off');
    };

    const drawModal = () => {
      const mins = Math.max(1, Math.round((save.totalPlaySeconds || 0) / 60));
      const avgSec = save.speechSamples > 0 ? ((save.totalSpeechMs / save.speechSamples) / 1000).toFixed(1) : '0.0';
      const worksCount = (save.creations || []).length + (save.diary || []).length;

      const tabsHtml = `<g transform="translate(150 56)">
        <g class="ux-btn" data-m="tab_stats"><rect width="170" height="34" rx="17" fill="${tab === 'stats' ? 'url(#goldGrad)' : '#eef5ff'}" stroke="#d6a44e" stroke-width="2"/><text x="85" y="23" text-anchor="middle" font-size="15" fill="#1e2a58">表达力报告与设置</text></g>
        <g class="ux-btn" data-m="tab_export" transform="translate(190 0)"><rect width="170" height="34" rx="17" fill="${tab === 'export' ? 'url(#goldGrad)' : '#eef5ff'}" stroke="#d6a44e" stroke-width="2"/><text x="85" y="23" text-anchor="middle" font-size="15" fill="#1e2a58">首次/最新对比与导出</text></g>
      </g>`;

      let bodyHtml;
      if (tab === 'stats') {
        const skList = [
          ['sequence', '1. 时间顺序 (先·接着·最后)', '#ff9cc4'],
          ['sentence', '2. 完整句子 (谁·在哪·干什么)', '#7dd4ff'],
          ['classify', '3. 总分归类 (总括+一二三)', '#ffd27a'],
          ['reason', '4. 因果理由 (我选…因为…)', '#b79cff'],
          ['twist', '5. 转折解困 (本来想·可是·于是)', '#49c598'],
          ['episode', '6. 完整故事山 (五要素+心里感受)', '#ff8c66'],
        ];
        const bars = skList.map(([k, lbl, col], idx) => {
          const val = Math.min(2, (save.skills && save.skills[k]) || 0);
          const y = 148 + idx * 27;
          return `<text x="36" y="${y}" font-size="14" fill="#233262">${lbl}</text>
            <rect x="292" y="${y - 13}" width="276" height="14" rx="7" fill="#e1ecff"/>
            <rect x="292" y="${y - 13}" width="${Math.round((val / 2) * 276)}" height="14" rx="7" fill="${col}"/>
            <text x="582" y="${y}" font-size="14" fill="#4e5d8c">${val}/2</text>`;
        }).join('');
        const tipLines = wrap(LEVELS[tipIdx].parentTip || '', 32).slice(0, 2);
        const curTier = save.studioTier || 'cloze';
        bodyHtml = `<text x="330" y="116" text-anchor="middle" font-size="14" fill="#4e5d8c">录音：${save.recordingsCount || 0}次 · 平均开口：${avgSec}秒 · 创作/日记：${worksCount}篇 · 探索：${mins}分</text>
          ${bars}
          <g class="ux-btn" data-m="nextTip" transform="translate(36 312)">
            <rect width="588" height="72" rx="14" fill="#eef5ff" stroke="#7dd4ff" stroke-width="2"/>
            <text x="14" y="22" font-size="13" fill="#b8326a">亲子日常提问建议（点我换一条 · 第${tipIdx + 1}/${LEVELS.length}幕）：</text>
            ${tipLines.map((ln, i) => `<text x="14" y="${44 + i * 20}" font-size="14" fill="#1e2a58">${ln}</text>`).join('')}
          </g>
          <g class="ux-btn" data-m="subs" transform="translate(36 400)"><rect width="94" height="44" rx="12" fill="#eef5ff" stroke="#7ea9e8" stroke-width="2"/><text x="47" y="28" text-anchor="middle" font-size="14" fill="#1e2a58">字幕：${setting('subtitles') ? '开' : '关'}</text></g>
          <g class="ux-btn" data-m="snd" transform="translate(138 400)"><rect width="94" height="44" rx="12" fill="#eef5ff" stroke="#7ea9e8" stroke-width="2"/><text x="47" y="28" text-anchor="middle" font-size="14" fill="#1e2a58">声音：${setting('sound') ? '开' : '关'}</text></g>
          <g class="ux-btn" data-m="eye" transform="translate(240 400)"><rect width="118" height="44" rx="12" fill="#eef5ff" stroke="#7ea9e8" stroke-width="2"/><text x="59" y="28" text-anchor="middle" font-size="14" fill="#1e2a58">护眼：${setting('eyeCare') ? '10分' : '关'}</text></g>
          <g class="ux-btn" data-m="tier" transform="translate(366 400)"><rect width="146" height="44" rx="12" fill="#eef5ff" stroke="#7ea9e8" stroke-width="2"/><text x="73" y="28" text-anchor="middle" font-size="14" fill="#1e2a58">支架：${tierLabel(curTier)}</text></g>
          <g class="ux-btn" data-m="close" transform="translate(520 400)"><rect width="104" height="44" rx="12" fill="url(#goldGrad)" stroke="#d6a44e" stroke-width="2"/><text x="52" y="28" text-anchor="middle" font-size="16" fill="#4a2605">关闭返回</text></g>`;
      } else {
        const perPage = 5;
        const maxPage = Math.max(0, Math.ceil(exportItems.length / perPage) - 1);
        pageIdx = Math.max(0, Math.min(maxPage, pageIdx));
        const slice = exportItems.slice(pageIdx * perPage, (pageIdx + 1) * perPage);
        const rowsHtml = slice.length
          ? slice.map((it, idx) => {
            const ry = 108 + idx * 54;
            const firstBtn = it.firstKey ? `<g class="ux-btn" data-m="play_${it.firstKey}" transform="translate(310 8)"><rect width="74" height="32" rx="10" fill="#fff0c4" stroke="#e2a832" stroke-width="1.5"/><text x="37" y="21" text-anchor="middle" font-size="13" fill="#4a2605">▶ 首次</text></g>` : '';
            const latestLabel = it.kind === 'room' ? '▶ 最新' : '▶ 播放';
            const delBtn = it.kind !== 'room' ? `<g class="ux-btn" data-m="del_${it.kind}_${it.key}" transform="translate(546 8)"><rect width="42" height="32" rx="10" fill="#ffe4ec" stroke="#e26a8b" stroke-width="1.5"/><text x="21" y="21" text-anchor="middle" font-size="13" fill="#8b1e3f">删</text></g>` : '';
            return `<g transform="translate(36 ${ry})">
              <rect width="588" height="48" rx="12" fill="#eef5ff" stroke="#bfd6f6" stroke-width="1.5"/>
              <text x="14" y="21" font-size="14" fill="#1e2a58">${it.title}</text>
              <text x="14" y="39" font-size="12" fill="#526594">${it.sub}</text>
              ${firstBtn}
              <g class="ux-btn" data-m="play_${it.key}" transform="translate(392 8)"><rect width="74" height="32" rx="10" fill="#dbeeff" stroke="#6aaee6" stroke-width="1.5"/><text x="37" y="21" text-anchor="middle" font-size="13" fill="#123a66">${latestLabel}</text></g>
              <g class="ux-btn" data-m="exp_${it.key}" transform="translate(474 8)"><rect width="66" height="32" rx="10" fill="#e2f7ec" stroke="#49b683" stroke-width="1.5"/><text x="33" y="21" text-anchor="middle" font-size="13" fill="#0f5937">导出</text></g>
              ${delBtn}
            </g>`;
          }).join('')
          : `<text x="330" y="240" text-anchor="middle" font-size="16" fill="#5a6d9c">还没有本地录音哦，先去录一段故事吧！</text>`;

        bodyHtml = `${rowsHtml}
          <text x="330" y="390" text-anchor="middle" font-size="13" fill="#b8326a">${toast}</text>
          <g class="ux-btn" data-m="prevPage" transform="translate(36 400)"><rect width="120" height="44" rx="12" fill="#eef5ff" stroke="#7ea9e8" stroke-width="2"/><text x="60" y="28" text-anchor="middle" font-size="15" fill="#1e2a58">上一页</text></g>
          <text x="242" y="427" text-anchor="middle" font-size="14" fill="#4e5d8c">第 ${pageIdx + 1}/${maxPage + 1} 页</text>
          <g class="ux-btn" data-m="nextPage" transform="translate(324 400)"><rect width="120" height="44" rx="12" fill="#eef5ff" stroke="#7ea9e8" stroke-width="2"/><text x="60" y="28" text-anchor="middle" font-size="15" fill="#1e2a58">下一页</text></g>
          <g class="ux-btn" data-m="close" transform="translate(492 400)"><rect width="132" height="44" rx="12" fill="url(#goldGrad)" stroke="#d6a44e" stroke-width="2"/><text x="66" y="28" text-anchor="middle" font-size="17" fill="#4a2605">关闭返回</text></g>`;
      }

      modal.innerHTML = `<rect width="960" height="520" fill="#0d1430" opacity=".82"/>
        <g transform="translate(150 28)" filter="url(#softShadow)">
          <rect width="660" height="464" rx="28" fill="#fff9ec" stroke="#ffd27a" stroke-width="4"/>
          <text x="330" y="40" text-anchor="middle" font-size="24" fill="#1e2a58">家长表达力成长报告与设置</text>
          ${tabsHtml}
          ${bodyHtml}
        </g>`;

      modal.querySelectorAll('[data-m]').forEach(b => {
        b.addEventListener('click', async () => {
          const m = b.getAttribute('data-m') || '';
          if (m === 'subs') { setSetting('subtitles', !setting('subtitles')); drawModal(); }
          else if (m === 'snd') { setSetting('sound', !setting('sound')); drawModal(); }
          else if (m === 'eye') { setSetting('eyeCare', !setting('eyeCare')); drawModal(); }
          else if (m === 'tier') {
            const order = ['cloze', 'director', 'anchor'];
            const next = order[(order.indexOf(save.studioTier || 'cloze') + 1) % order.length];
            save.studioTier = next;
            if (typeof stageState === 'object') stageState.tier = next;
            saveWrite();
            drawModal();
          }
          else if (m === 'nextTip') { tipIdx = (tipIdx + 1) % LEVELS.length; drawModal(); }
          else if (m === 'tab_stats') { stopModalAudio(); tab = 'stats'; drawModal(); }
          else if (m === 'tab_export') { stopModalAudio(); tab = 'export'; await refreshExportItems(); drawModal(); }
          else if (m === 'prevPage') { pageIdx = Math.max(0, pageIdx - 1); drawModal(); }
          else if (m === 'nextPage') { pageIdx++; drawModal(); }
          else if (m.startsWith('play_')) {
            const k = m.slice(5);
            const blob = await recorder.loadClip(k);
            if (blob) { setRecordingAudioMode('rec_quiet'); recorder.play(blob, () => setRecordingAudioMode('off')); }
          } else if (m.startsWith('exp_')) {
            const k = m.slice(4);
            const blob = await recorder.loadClip(k);
            if (blob) {
              await recorder.exportWav(blob, `story_${k}.wav`);
              toast = '已导出为本地 WAV 音频！';
              drawModal();
            }
          } else if (m.startsWith('del_')) {
            const rest = m.slice(4);
            const sep = rest.indexOf('_');
            const kind = rest.slice(0, sep), k = rest.slice(sep + 1);
            await recorder.deleteClip(k);
            if (kind === 'free') save.creations = (save.creations || []).filter(c => c.id !== k);
            else if (kind === 'diary') save.diary = (save.diary || []).filter(d => d.id !== k);
            saveWrite();
            await refreshExportItems();
            toast = '已删除该条作品。';
            drawModal();
          } else {
            stopModalAudio();
            uxState.modal = false;
            modal.textContent = '';
          }
        });
      });
    };
    drawModal();
  }
