  /* Extras: Zero-Reading Meet Heroes Trio, Pure-Picture 4-Car Free Sentence Train & Visual Story Voice Album. */

  function showMeet() {
    const s = uxScreen('meet');
    const heroes = [
      { id: 'elsa', x: 220, name: '艾莎', sprite: 'elsa_idle', bg: '#7dd4ff' },
      { id: 'anna', x: 480, name: '安娜', sprite: 'anna_idle', bg: '#ff9cc4' },
      { id: 'olaf', x: 740, name: '雪宝', sprite: 'olaf_idle', bg: '#ffd27a' },
    ];
    const htmlHeroes = heroes.map(h => `<g class="ux-btn" data-hero="${h.id}" role="button" tabindex="0" aria-label="${h.name}" transform="translate(${h.x} 400)">
      <circle cx="0" cy="-120" r="98" fill="${h.bg}" opacity=".26"/>
      <ellipse cx="0" cy="4" rx="76" ry="18" fill="${h.bg}" opacity=".45" stroke="#fff9ec" stroke-width="2"/>
      <g class="btn-vis" filter="url(#softShadow)">
        <image href="${SRC(h.sprite)}" x="-88" y="-245" width="176" height="245" preserveAspectRatio="xMidYMax meet"/>
      </g>
    </g>`).join('');

    const root = uxPaint(`<g class="page">
      <image href="${SRC('bg_palace')}" width="960" height="520" preserveAspectRatio="xMidYMid slice"/>
      <rect width="960" height="520" fill="#101836" opacity=".48"/>
      ${uxButton({ act: 'back', ui: 'back', icon: 'back', x: 56, y: 48, r: 34 })}
      ${htmlHeroes}
    </g>`);
    const back = () => uxEnd(s, () => showTitle());
    s.onKey = back;
    uxBind(root, { back });
    root.querySelectorAll('[data-hero]').forEach(g => {
      const tap = () => {
        const who = g.getAttribute('data-hero');
        uxNudge(g); uxConfetti(root.querySelector('.page'), 480, 220, 14);
        uxLine('me_' + who, { interrupt: true, maxWait: 4500 });
      };
      g.addEventListener('click', tap);
      g.addEventListener('keydown', /** @param {KeyboardEvent} e */ e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); } });
    });
    uxLine('me_elsa', { maxWait: 4500 });
  }

  function showFreeTrain() {
    const s = uxScreen('freeTrain');
    loadArt(FREE_TRAIN_POOL.slots.flat(), ART_PATIENCE);
    let picked = FREE_TRAIN_POOL.slots.map(row => row[0]);
    let recBusy = false;
    let clipBlob = null;
    let activeCarIdx = -1;
    let playSeq = 0;

    let render = () => {};

    const readTrain = async () => {
      if (!uxAlive(s)) return;
      const seq = ++playSeq;
      save.freeSentences = (save.freeSentences || 0) + 1;
      saveSoon();
      for (let i = 0; i < picked.length; i++) {
        if (!uxAlive(s) || recBusy || seq !== playSeq) return;
        activeCarIdx = i;
        render();
        const m = CARD_META[picked[i]];
        if (m && m.voiceKey && hasLineKey(m.voiceKey)) {
          await voice.line(m.voiceKey, { interrupt: true, tag: 'card', maxWait: 2500, subtitle: false });
        }
      }
      if (uxAlive(s) && seq === playSeq) {
        activeCarIdx = -1;
        render();
        uxConfetti(document.querySelector('#overlay .page'), 480, 200, 18);
      }
    };

    const carKinds = ['who', 'where', 'what', 'mood'];
    render = () => {
      if (!uxAlive(s)) return;
      const carsHtml = picked.map((cid, i) => {
        const x = 110 + i * 188;
        const meta = CARD_META[cid] || { label: cid };
        const hot = activeCarIdx === i;
        return `<g class="card-btn${hot ? ' ux-pulse' : ''}" data-car="${i}" role="button" tabindex="0" aria-label="${meta.label}" transform="translate(${x} 44)">
          ${i < 3 ? '<rect x="164" y="60" width="26" height="8" rx="4" fill="#ffd27a"/>' : ''}
          <circle cx="38" cy="136" r="12" fill="#263876" stroke="#ffd27a" stroke-width="3"/>
          <circle cx="128" cy="136" r="12" fill="#263876" stroke="#ffd27a" stroke-width="3"/>
          <g class="card-vis" filter="url(#softShadow)">
            <rect width="166" height="128" rx="22" fill="#fff9ec" stroke="${hot ? '#ffd27a' : '#7dd4ff'}" stroke-width="${hot ? 4.5 : 3.5}"/>
            <g transform="translate(83 -2)">${uxSlotBadgeSvg(carKinds[i], hot, 16)}</g>
            <image href="${SRC(cid)}" x="23" y="18" width="120" height="98" preserveAspectRatio="xMidYMid meet"/>
          </g>
        </g>`;
      }).join('');

      const rowsHtml = FREE_TRAIN_POOL.slots.map((row, sIdx) => {
        const x0 = 110 + sIdx * 188;
        const twoByTwo = row.length === 4;
        return row.map((cid, rIdx) => {
          const active = picked[sIdx] === cid;
          const meta = CARD_META[cid] || { label: cid };
          const w = twoByTwo ? 80 : 158;
          const h = twoByTwo ? 80 : 70;
          const tx = twoByTwo ? x0 + (rIdx % 2) * 86 : x0 + 4;
          const ty = twoByTwo ? 230 + ((rIdx / 2) | 0) * 90 : 212 + rIdx * 82;
          const iw = twoByTwo ? 64 : 74;
          const ih = twoByTwo ? 64 : 58;
          return `<g class="card-btn" data-pick-slot="${sIdx}" data-pick-cid="${cid}" role="button" tabindex="0" aria-label="${meta.label}" transform="translate(${tx} ${ty})">
            <g class="card-vis" filter="url(#softShadow)">
              <rect width="${w}" height="${h}" rx="18" fill="${active ? '#ffe08a' : '#fff9ec'}" stroke="${active ? '#f59e0b' : '#7ea9e8'}" stroke-width="${active ? 3.5 : 2.5}"/>
              <image href="${SRC(cid)}" x="${(w - iw) / 2}" y="${(h - ih) / 2}" width="${iw}" height="${ih}" preserveAspectRatio="xMidYMid meet"/>
            </g>
          </g>`;
        }).join('');
      }).join('');

      const playBtn = uxButton({ act: 'speakTrain', ui: 'demo', icon: 'speaker', x: 894, y: 146, r: 36, plate: 'gold' });
      const micRipple = recBusy ? `<circle class="ux-ripple" cx="894" cy="258" r="44" fill="none" stroke="#ff7ca0" stroke-width="4" pointer-events="none"/>` : '';
      const micBtn = micRipple + uxButton(recBusy
        ? { act: 'freeMic', ui: 'stop', icon: 'stop', x: 894, y: 258, r: 42, plate: 'rec', cls: 'ux-pulse' }
        : { act: 'freeMic', ui: 'mic', pic: 'prop_mic', x: 894, y: 258, r: 42, plate: 'gold' });
      const listenBtn = clipBlob ? uxButton({ act: 'freePlay', ui: 'listen', icon: 'play', x: 894, y: 368, r: 34 }) : '';

      const root = uxPaint(`<g class="page">
        <image href="${SRC('bg_garden')}" width="960" height="520" preserveAspectRatio="xMidYMid slice"/>
        <rect width="960" height="520" fill="#101836" opacity=".54"/>
        ${uxButton({ act: 'back', ui: 'back', icon: 'back', x: 48, y: 46, r: 32 })}
        ${carsHtml}${rowsHtml}${playBtn}${micBtn}${listenBtn}
      </g>`);

      const cleanup = () => {
        playSeq++;
        activeCarIdx = -1;
        if (recBusy) { recorder.stop(); recBusy = false; }
        recorder.stopPlay();
        setMicMute(false);
        saveWrite();
      };
      const back = () => { cleanup(); uxEnd(s, () => showTitle()); };
      s.onKey = back;

      uxBind(root, {
        back,
        speakTrain: () => readTrain(),
        freeMic: async () => {
          unlockAudio();
          playSeq++;
          activeCarIdx = -1;
          if (recBusy) {
            const res = await recorder.stop();
            recBusy = false;
            setMicMute(false);
            uxSfx('mic_stop');
            if (res && res.blob) {
              clipBlob = res.blob;
              save.recordingsCount = (save.recordingsCount || 0) + 1;
              saveWrite();
              recorder.saveClip('free_train_latest', res.blob);
              render();
              recorder.play(res.blob);
            } else render();
            return;
          }
          setMicMute(true);
          const st = await recorder.start(null, () => { if (recBusy) root.querySelector('[data-act="freeMic"]').dispatchEvent(new MouseEvent('click')); });
          if (!st.ok) {
            setMicMute(false);
            uxLine('mic_fallback', { interrupt: true, maxWait: 4500 });
            readTrain();
            return;
          }
          recBusy = true;
          uxSfx('mic_start');
          render();
        },
        freePlay: () => {
          if (!clipBlob) return;
          setMicMute(true);
          recorder.play(clipBlob, () => setMicMute(false));
        },
      });

      root.querySelectorAll('[data-pick-cid]').forEach(btn => {
        const sIdx = Number(btn.getAttribute('data-pick-slot'));
        const cid = btn.getAttribute('data-pick-cid');
        const pick = () => {
          playSeq++;
          activeCarIdx = -1;
          picked[sIdx] = cid;
          uxSfx('tap');
          const m = CARD_META[cid];
          if (m && m.voiceKey && hasLineKey(m.voiceKey)) voice.line(m.voiceKey, { interrupt: true, tag: 'card', maxWait: 2000, subtitle: false });
          render();
        };
        btn.addEventListener('click', pick);
        btn.addEventListener('keydown', /** @param {KeyboardEvent} e */ e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
      });
      root.querySelectorAll('[data-car]').forEach(car => {
        car.addEventListener('click', () => readTrain());
        car.addEventListener('keydown', /** @param {KeyboardEvent} e */ e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); readTrain(); } });
      });
    };
    render();
    uxLine('free_train_intro', { maxWait: 5500 });
  }

  function showAlbum() {
    const s = uxScreen('album');
    loadArt(LEVELS.map(l => l.coverCard), ART_PATIENCE);
    let playingId = '';
    const render = async () => {
      if (!uxAlive(s)) return;
      const keys = new Set(await recorder.listClipKeys());
      if (!uxAlive(s)) return;
      const discs = LEVELS.map((lv, i) => {
        const col = i % 4, row = (i / 4) | 0;
        const x = 104 + col * 196, y = 94 + row * 186;
        const hasRec = keys.has('room_' + lv.id);
        const on = playingId === lv.id;
        const statusPill = hasRec
          ? `<rect x="36" y="114" width="100" height="30" rx="15" fill="${on ? '#ff9cc4' : '#ffe6a3'}" stroke="#ff9cc4" stroke-width="2"/>
             ${uxPic('prop_mic', 50, 117, 16, 24, '', 'meet')}
             <rect x="74" y="125" width="5" height="8" rx="2.5" fill="#d64579"/>
             <rect x="83" y="121" width="5" height="16" rx="2.5" fill="#d64579"/>
             <rect x="92" y="123" width="5" height="12" rx="2.5" fill="#d64579"/>
             <rect x="101" y="125" width="5" height="8" rx="2.5" fill="#d64579"/>`
          : `<rect x="36" y="114" width="100" height="30" rx="15" fill="#253978" stroke="#7dd4ff" stroke-width="2"/>
             <g transform="translate(86 129)">${uxIcon('speaker', 15, '#a8ccff')}</g>`;
        return `<g class="ux-btn${on ? ' ux-pulse' : ''}" data-disc="${lv.id}" data-has="${hasRec ? '1' : '0'}" role="button" tabindex="0" aria-label="${lv.title}" transform="translate(${x} ${y})">
          <g class="btn-vis" filter="url(#softShadow)">
            <rect width="172" height="158" rx="24" fill="${hasRec ? '#fff9ec' : '#1b264f'}" stroke="${on ? '#ff9cc4' : (hasRec ? '#ffd27a' : '#4d659c')}" stroke-width="${on ? 5 : 3.5}"/>
            <image href="${SRC('portrait_' + lv.host)}" x="10" y="10" width="38" height="38" preserveAspectRatio="xMidYMid meet"/>
            <image href="${SRC(lv.coverCard)}" x="44" y="20" width="102" height="84" preserveAspectRatio="xMidYMid meet" opacity="${hasRec ? 1 : .58}"/>
            ${statusPill}
          </g>
        </g>`;
      }).join('');

      const root = uxPaint(`<g class="page">
        <image href="${SRC('bg_cozy')}" width="960" height="520" preserveAspectRatio="xMidYMid slice"/>
        <rect width="960" height="520" fill="#101836" opacity=".62"/>
        ${uxButton({ act: 'back', ui: 'back', icon: 'back', x: 56, y: 48, r: 34 })}
        <g filter="url(#softShadow)">
          <rect x="422" y="20" width="116" height="46" rx="23" fill="#141c42" opacity=".92" stroke="#ffd27a" stroke-width="2.5"/>
          ${uxPic('prop_mic', 442, 24, 24, 38, '', 'meet')}
          <rect x="478" y="36" width="6" height="14" rx="3" fill="#7dd4ff"/>
          <rect x="490" y="30" width="6" height="26" rx="3" fill="#ff9cc4"/>
          <rect x="502" y="34" width="6" height="18" rx="3" fill="#ffd27a"/>
        </g>
        ${discs}
      </g>`);
      const back = () => { recorder.stopPlay(); setMicMute(false); uxEnd(s, () => showTitle()); };
      s.onKey = back;
      uxBind(root, { back });
      root.querySelectorAll('[data-disc]').forEach(d => {
        const lid = d.getAttribute('data-disc');
        const playDisc = async () => {
          const lv = LEVELS.find(x => x.id === lid);
          if (!lv) return;
          playingId = lid;
          const blob = await recorder.loadClip('room_' + lid);
          if (blob) {
            setMicMute(true);
            render();
            recorder.play(blob, () => { playingId = ''; setMicMute(false); if (uxAlive(s)) render(); });
          } else {
            recorder.stopPlay();
            setMicMute(false);
            render();
            uxLine(lv.demoKey, { interrupt: true, maxWait: 7000 }).then(() => {
              playingId = '';
              if (uxAlive(s)) render();
            });
          }
        };
        d.addEventListener('click', playDisc);
        d.addEventListener('keydown', /** @param {KeyboardEvent} e */ e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playDisc(); } });
      });
    };
    render();
    uxLine('album_intro', { maxWait: 4500 });
  }
