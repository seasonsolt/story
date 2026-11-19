  /* Extras: Meet Heroes Trio, 4-Car Free Sentence Train Sandbox (with local voice recording) & Story Voice Album. */

  function showMeet() {
    const s = uxScreen('meet');
    const heroes = [
      { id: 'elsa', x: 220, name: '艾莎', sprite: 'elsa_idle', bg: '#7dd4ff' },
      { id: 'anna', x: 480, name: '安娜', sprite: 'anna_idle', bg: '#ff9cc4' },
      { id: 'olaf', x: 740, name: '雪宝', sprite: 'olaf_idle', bg: '#ffd27a' },
    ];
    const htmlHeroes = heroes.map(h => `<g class="ux-btn" data-hero="${h.id}" role="button" tabindex="0" aria-label="${h.name}" transform="translate(${h.x} 360)">
      <circle cx="0" cy="-95" r="88" fill="${h.bg}" opacity=".28"/>
      <g class="btn-vis">
        <image href="${SRC(h.sprite)}" x="-76" y="-215" width="152" height="215" preserveAspectRatio="xMidYMax meet"/>
        <rect x="-56" y="16" width="112" height="38" rx="19" fill="#fff9ec" stroke="${h.bg}" stroke-width="3" filter="url(#softShadow)"/>
        <text x="0" y="42" text-anchor="middle" font-size="22" fill="#1e2a58">${h.name}</text>
      </g>
    </g>`).join('');

    const root = uxPaint(`<g class="page">
      <image href="${SRC('bg_palace')}" width="960" height="520" preserveAspectRatio="xMidYMid slice"/>
      <rect width="960" height="520" fill="#101836" opacity=".52"/>
      ${uxButton({ act: 'back', ui: 'back', icon: 'back', x: 56, y: 48, r: 34 })}
      <rect x="300" y="24" width="360" height="44" rx="22" fill="#141c42" opacity=".9" stroke="#ffd27a" stroke-width="2.5"/>
      <text x="480" y="53" text-anchor="middle" font-size="21" fill="#fff9ec">点一点艾莎、安娜或雪宝打个招呼！</text>
      ${htmlHeroes}
    </g>`);
    const back = () => uxEnd(s, () => showTitle());
    s.onKey = back;
    uxBind(root, { back });
    root.querySelectorAll('[data-hero]').forEach(g => {
      g.addEventListener('click', () => {
        const who = g.getAttribute('data-hero');
        uxNudge(g); uxConfetti(root.querySelector('.page'), 480, 220, 14);
        uxLine('me_' + who, { interrupt: true, maxWait: 4500 });
      });
    });
    uxLine('me_elsa', { maxWait: 4500 });
  }

  function showFreeTrain() {
    const s = uxScreen('freeTrain');
    let picked = FREE_TRAIN_POOL.slots.map(row => row[0]);
    let recBusy = false;
    let clipBlob = null;

    const readTrain = async () => {
      if (!uxAlive(s)) return;
      save.freeSentences = (save.freeSentences || 0) + 1;
      saveSoon();
      for (let i = 0; i < picked.length; i++) {
        if (!uxAlive(s) || recBusy) return;
        const m = CARD_META[picked[i]];
        if (m && m.voiceKey && hasLineKey(m.voiceKey)) {
          await voice.line(m.voiceKey, { interrupt: true, tag: 'card', maxWait: 2500 });
        }
      }
      if (uxAlive(s)) uxConfetti(document.querySelector('#overlay .page'), 480, 210, 18);
    };

    const render = () => {
      if (!uxAlive(s)) return;
      const carsHtml = picked.map((cid, i) => {
        const x = 112 + i * 190;
        const meta = CARD_META[cid] || { label: cid };
        return `<g class="card-btn" data-car="${i}" role="button" tabindex="0" transform="translate(${x} 96)">
          ${i < 3 ? '<rect x="164" y="64" width="28" height="8" rx="4" fill="#ffd27a"/>' : ''}
          <circle cx="38" cy="144" r="12" fill="#263876" stroke="#ffd27a" stroke-width="3"/>
          <circle cx="128" cy="144" r="12" fill="#263876" stroke="#ffd27a" stroke-width="3"/>
          <g class="card-vis" filter="url(#softShadow)">
            <rect width="166" height="136" rx="22" fill="#fff9ec" stroke="#7dd4ff" stroke-width="3.5"/>
            <rect x="44" y="-12" width="78" height="24" rx="12" fill="#263876" stroke="#fff9ec" stroke-width="2"/>
            <text x="83" y="5" text-anchor="middle" font-size="14" fill="#fff9ec">${FREE_TRAIN_POOL.labels[i]}</text>
            <image href="${SRC(cid)}" x="38" y="16" width="90" height="86" preserveAspectRatio="xMidYMid meet"/>
            <text x="83" y="124" text-anchor="middle" font-size="18" fill="#1e2a58">${meta.label}</text>
          </g>
        </g>`;
      }).join('');

      const rowsHtml = FREE_TRAIN_POOL.slots.map((row, sIdx) => {
        const x0 = 112 + sIdx * 190;
        return row.map((cid, rIdx) => {
          const y = 264 + rIdx * 52;
          const active = picked[sIdx] === cid;
          const meta = CARD_META[cid] || { label: cid };
          return `<g class="card-btn" data-pick-slot="${sIdx}" data-pick-cid="${cid}" role="button" tabindex="0" transform="translate(${x0} ${y})">
            <g class="card-vis">
              <rect width="166" height="44" rx="16" fill="${active ? '#ffd27a' : '#fff9ec'}" stroke="${active ? '#e67e22' : '#7ea9e8'}" stroke-width="2.5"/>
              <image href="${SRC(cid)}" x="10" y="5" width="34" height="34" preserveAspectRatio="xMidYMid meet"/>
              <text x="98" y="28" text-anchor="middle" font-size="16" fill="#1e2a58">${meta.label}</text>
            </g>
          </g>`;
        }).join('');
      }).join('');

      const playBtn = uxButton({ act: 'speakTrain', ui: 'demo', icon: 'speaker', x: 896, y: 162, r: 34, plate: 'gold' });
      const micBtn = uxButton({ act: 'freeMic', ui: recBusy ? 'stop' : 'mic', icon: recBusy ? 'stop' : 'mic', x: 896, y: 266, r: 36, plate: recBusy ? 'rec' : 'gold', cls: recBusy ? 'ux-pulse' : '' });
      const listenBtn = clipBlob ? uxButton({ act: 'freePlay', ui: 'listen', icon: 'play', x: 896, y: 366, r: 32 }) : '';

      const root = uxPaint(`<g class="page">
        <image href="${SRC('bg_garden')}" width="960" height="520" preserveAspectRatio="xMidYMid slice"/>
        <rect width="960" height="520" fill="#101836" opacity=".56"/>
        ${uxButton({ act: 'back', ui: 'back', icon: 'back', x: 56, y: 48, r: 34 })}
        <rect x="260" y="22" width="440" height="44" rx="22" fill="#141c42" opacity=".9" stroke="#ffd27a" stroke-width="2.5"/>
        <text x="480" y="51" text-anchor="middle" font-size="21" fill="#fff9ec">自由造句小火车（点卡片混搭编故事！）</text>
        ${carsHtml}${rowsHtml}${playBtn}${micBtn}${listenBtn}
      </g>`);

      const cleanup = () => {
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
        btn.addEventListener('click', () => {
          picked[sIdx] = cid;
          uxSfx('tap');
          const m = CARD_META[cid];
          if (m && m.voiceKey && hasLineKey(m.voiceKey)) voice.line(m.voiceKey, { interrupt: true, tag: 'card', maxWait: 2000, subtitle: false });
          render();
        });
      });
      root.querySelectorAll('[data-car]').forEach(car => {
        car.addEventListener('click', () => readTrain());
      });
    };
    render();
    uxLine('free_train_intro', { maxWait: 5500 });
  }

  function showAlbum() {
    const s = uxScreen('album');
    let playingId = '';
    const render = async () => {
      if (!uxAlive(s)) return;
      const keys = new Set(await recorder.listClipKeys());
      if (!uxAlive(s)) return;
      const discs = LEVELS.map((lv, i) => {
        const col = i % 4, row = (i / 4) | 0;
        const x = 112 + col * 196, y = 98 + row * 184;
        const hasRec = keys.has('room_' + lv.id);
        const on = playingId === lv.id;
        return `<g class="ux-btn" data-disc="${lv.id}" data-has="${hasRec ? '1' : '0'}" role="button" tabindex="0" transform="translate(${x} ${y})">
          <g class="btn-vis" filter="url(#softShadow)">
            <rect width="166" height="156" rx="24" fill="${hasRec ? '#fff9ec' : '#1b264f'}" stroke="${on ? '#ff9cc4' : (hasRec ? '#ffd27a' : '#4d659c')}" stroke-width="${on ? 5 : 3.5}"/>
            <image href="${SRC('portrait_' + lv.host)}" x="45" y="16" width="76" height="76" preserveAspectRatio="xMidYMid meet"/>
            <text x="83" y="116" text-anchor="middle" font-size="18" fill="${hasRec ? '#1e2a58' : '#9eb6e6'}">${lv.title}</text>
            <text x="83" y="140" text-anchor="middle" font-size="14" fill="${hasRec ? '#d64579' : '#6c85bd'}">${hasRec ? '● 我的本地录音' : '○ 听标准示范'}</text>
          </g>
        </g>`;
      }).join('');

      const root = uxPaint(`<g class="page">
        <image href="${SRC('bg_cozy')}" width="960" height="520" preserveAspectRatio="xMidYMid slice"/>
        <rect width="960" height="520" fill="#101836" opacity=".64"/>
        ${uxButton({ act: 'back', ui: 'back', icon: 'back', x: 56, y: 48, r: 34 })}
        <rect x="275" y="22" width="410" height="44" rx="22" fill="#141c42" opacity=".9" stroke="#ffd27a" stroke-width="2.5"/>
        <text x="480" y="51" text-anchor="middle" font-size="21" fill="#fff9ec">我的故事留声机（点徽章听声音！）</text>
        ${discs}
      </g>`);
      const back = () => { recorder.stopPlay(); setMicMute(false); uxEnd(s, () => showTitle()); };
      s.onKey = back;
      uxBind(root, { back });
      root.querySelectorAll('[data-disc]').forEach(d => {
        const lid = d.getAttribute('data-disc');
        d.addEventListener('click', async () => {
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
            uxLine(lv.demoKey, { interrupt: true, maxWait: 7000 }).then(() => {
              playingId = '';
              if (uxAlive(s)) render();
            });
          }
        });
      });
    };
    render();
    uxLine('album_intro', { maxWait: 4500 });
  }
