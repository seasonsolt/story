  /* Extras: Meet Trio, Olaf Daily Reporter Interview Mode, 4-Car/5-Mountain Free Studio (30-clip Portfolio) & 3-Tab Album. */

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

  function showInterview() {
    const s = uxScreen('interview');
    const topics = INTERVIEW_TOPICS || [];
    loadArt(topics.map(t => t.card), ART_PATIENCE);

    let activeTopic = null;
    let recBusy = false;
    let playBusy = false;
    let clipBlob = null;
    let voiceFx = 'normal';

    const updateIntWaves = bars => {
      const wg = $('intWaves');
      if (!wg) return;
      wg.querySelectorAll('rect').forEach((r, i) => {
        const v = bars ? Math.max(.14, Math.min(1, bars[i] || .14)) : .14;
        const h = Math.round(8 + v * 34);
        r.setAttribute('y', String(22 - Math.round(h / 2)));
        r.setAttribute('height', String(h));
      });
    };

    const updateIntOlaf = energy => {
      const olaf = $('intOlaf');
      if (olaf) {
        const e = energy || 0;
        const dy = -Math.round(e * 18);
        olaf.setAttribute('transform', `translate(86 ${430 + dy})`);
        const imgNode = olaf.querySelector('image');
        const want = e > .4 ? 'olaf_cheer' : (e > .1 ? 'olaf_speak' : 'olaf_idle');
        if (imgNode && !imgNode.getAttribute('href').includes(want)) imgNode.setAttribute('href', SRC(want));
      }
      if (energy > .16 && typeof fxVoiceSparkle === 'function') fxVoiceSparkle(energy);
    };

    const cleanup = () => {
      if (recBusy) { recorder.stop(); recBusy = false; }
      playBusy = false;
      recorder.stopPlay();
      setRecordingAudioMode('off');
      saveWrite();
    };

    const render = () => {
      if (!uxAlive(s)) return;
      if (!activeTopic) {
        const gridHtml = topics.map((tp, i) => {
          const col = i % 2, row = (i / 2) | 0;
          const x = 216 + col * 284, y = 104 + row * 188;
          const badgeHtml = tp.badges.map((bk, bi) => `<g transform="translate(${74 + bi * 46} 148)">${uxSlotBadgeSvg(bk, false, 14)}</g>`).join('');
          return `<g class="ux-btn" data-topic="${tp.id}" role="button" tabindex="0" aria-label="${tp.title}" transform="translate(${x} ${y})">
            <g class="btn-vis" filter="url(#softShadow)">
              <rect width="244" height="162" rx="26" fill="#fff9ec" stroke="#ffd27a" stroke-width="4"/>
              <image href="${SRC(tp.card)}" x="52" y="14" width="140" height="114" preserveAspectRatio="xMidYMid meet"/>
              ${badgeHtml}
            </g>
          </g>`;
        }).join('');

        const root = uxPaint(`<g class="page">
          <image href="${SRC('bg_cozy')}" width="960" height="520" preserveAspectRatio="xMidYMid slice"/>
          <rect width="960" height="520" fill="#101836" opacity=".56"/>
          ${uxButton({ act: 'back', ui: 'back', icon: 'back', x: 56, y: 46, r: 32 })}
          <g filter="url(#softShadow)">
            <rect x="410" y="18" width="140" height="52" rx="26" fill="#141c42" opacity=".92" stroke="#ffd27a" stroke-width="2.5"/>
            <image href="${SRC('portrait_olaf')}" x="424" y="24" width="40" height="40" preserveAspectRatio="xMidYMid meet"/>
            ${uxPic('prop_mic', 494, 24, 28, 40, '', 'meet')}
          </g>
          <image href="${SRC('olaf_cheer')}" x="44" y="250" width="140" height="186" preserveAspectRatio="xMidYMid meet"/>
          <image href="${SRC('anna_idle')}" x="790" y="220" width="124" height="214" preserveAspectRatio="xMidYMid meet" transform="scale(-1 1) translate(-1704 0)"/>
          ${gridHtml}
        </g>`);

        const back = () => { cleanup(); uxEnd(s, () => showTitle()); };
        s.onKey = back;
        uxBind(root, { back });
        root.querySelectorAll('[data-topic]').forEach(btn => {
          const tid = btn.getAttribute('data-topic');
          const goTopic = () => {
            activeTopic = topics.find(t => t.id === tid) || null;
            clipBlob = null;
            uxSfx('tap');
            render();
            if (activeTopic) uxLine(activeTopic.voiceKey, { interrupt: true, maxWait: 7500 });
          };
          btn.addEventListener('click', goTopic);
          btn.addEventListener('keydown', /** @param {KeyboardEvent} e */ e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTopic(); } });
        });
        return;
      }

      const tp = activeTopic;
      const badgeStrip = tp.badges.map((bk, bi) => `<g transform="translate(${480 + (bi - (tp.badges.length - 1) / 2) * 56} 234)">${uxSlotBadgeSvg(bk, recBusy, 16)}</g>`).join('');
      const waveCols = ['#7dd4ff', '#9fe8ff', '#ff9cc4', '#ffd27a', '#ff9cc4', '#9fe8ff', '#7dd4ff'];
      const wavesHtml = waveCols.map((c, i) => `<rect x="${(i - 3) * 26 - 6}" y="17" width="12" height="10" rx="6" fill="${c}" opacity="${recBusy || playBusy ? '.98' : '.42'}"/>`).join('');

      let fxHtml = '';
      if (clipBlob && !recBusy) {
        const fxs = [['normal', 636], ['olaf', 706], ['hall', 776]];
        for (const [fk, fxX] of fxs) fxHtml += uxButton({ act: 'fx_' + fk, ui: `fx_${fk}`, icon: 'fx_' + fk, x: fxX, y: 298, r: 32, plate: voiceFx === fk ? 'gold' : '' });
      }
      const micRipple = recBusy ? `<circle class="ux-ripple" cx="480" cy="400" r="52" fill="none" stroke="#ff7ca0" stroke-width="4" pointer-events="none"/>` : '';
      const micBtn = micRipple + uxButton(recBusy
        ? { act: 'intMic', ui: 'stop', icon: 'stop', x: 480, y: 400, r: 50, plate: 'rec', cls: 'ux-pulse' }
        : { act: 'intMic', ui: 'mic', pic: 'prop_mic', x: 480, y: 400, r: 50, plate: 'gold' });
      const playBtn = clipBlob && !recBusy ? uxButton({ act: 'intPlay', ui: 'listen', icon: 'play', x: 646, y: 406, r: 38, plate: 'gold' }) : '';

      const root = uxPaint(`<g class="page">
        <image href="${SRC('bg_cozy')}" width="960" height="520" preserveAspectRatio="xMidYMid slice"/>
        <rect width="960" height="520" fill="#101836" opacity=".52"/>
        ${uxButton({ act: 'backTopic', ui: 'back', icon: 'back', x: 56, y: 46, r: 32 })}
        <g id="intOlaf" transform="translate(86 430)"><image href="${SRC('olaf_idle')}" x="-64" y="-190" width="128" height="190" preserveAspectRatio="xMidYMax meet"/></g>
        <g filter="url(#softShadow)">
          <rect x="358" y="42" width="244" height="172" rx="28" fill="#fff9ec" stroke="#ffd27a" stroke-width="4.5"/>
          <image href="${SRC(tp.card)}" x="394" y="54" width="172" height="148" preserveAspectRatio="xMidYMid meet"/>
        </g>
        ${badgeStrip}
        <g id="intWaves" transform="translate(480 276)">${wavesHtml}</g>
        ${fxHtml}
        ${uxButton({ act: 'askAgain', ui: 'demo', icon: 'speaker', x: 314, y: 406, r: 38 })}
        ${micBtn}
        ${playBtn}
      </g>`);

      const backTopic = () => {
        cleanup();
        activeTopic = null;
        clipBlob = null;
        render();
      };
      s.onKey = backTopic;

      const playCurrent = () => {
        if (!clipBlob || recBusy) return;
        playBusy = true;
        render();
        setRecordingAudioMode('premiere');
        recorder.play(clipBlob, () => {
          playBusy = false;
          setRecordingAudioMode('off');
          updateIntWaves(null);
          updateIntOlaf(0);
          if (uxAlive(s)) render();
        }, { fx: voiceFx, onBars: updateIntWaves, onEnergy: updateIntOlaf });
      };

      uxBind(root, {
        backTopic,
        askAgain: () => { if (!recBusy) uxLine(tp.voiceKey, { interrupt: true, maxWait: 7500 }); },
        fx_normal: () => { voiceFx = 'normal'; playCurrent(); },
        fx_olaf: () => { voiceFx = 'olaf'; playCurrent(); },
        fx_hall: () => { voiceFx = 'hall'; playCurrent(); },
        intPlay: playCurrent,
        intMic: async () => {
          unlockAudio();
          if (recBusy) {
            const res = await recorder.stop();
            recBusy = false;
            setRecordingAudioMode('off');
            updateIntWaves(null);
            updateIntOlaf(0);
            uxSfx('mic_stop');
            if (res && res.blob) {
              clipBlob = res.blob;
              const did = 'diary_' + Date.now();
              const meta = { createdAt: Date.now(), topicId: tp.id, durationMs: res.durationMs || 0, activeSpeechMs: res.activeSpeechMs || 0 };
              await recorder.saveClip(did, res.blob);
              await recorder.saveMeta(did, meta);
              save.diary = [{ id: did, topicId: tp.id, createdAt: meta.createdAt, durationMs: meta.durationMs, activeSpeechMs: meta.activeSpeechMs }, ...(save.diary || [])];
              while (save.diary.length > 30) {
                const dropped = save.diary.pop();
                if (dropped) recorder.deleteClip(dropped.id);
              }
              save.recordingsCount = (save.recordingsCount || 0) + 1;
              save.speechSamples = (save.speechSamples || 0) + 1;
              save.totalSpeechMs = (save.totalSpeechMs || 0) + (res.activeSpeechMs || 0);
              saveWrite();
              render();
              playCurrent();
              uxConfetti(root.querySelector('.page'), 480, 220, 26);
            } else render();
            return;
          }
          setRecordingAudioMode('rec_quiet');
          const st = await recorder.start(
            fd => { updateIntWaves(fd.bars); updateIntOlaf(fd.energy); },
            () => { if (recBusy && uxAlive(s)) root.querySelector('[data-act="intMic"]').dispatchEvent(new MouseEvent('click')); },
          );
          if (!st.ok) {
            setRecordingAudioMode('off');
            uxLine('mic_fallback', { interrupt: true, maxWait: 4500 });
            return;
          }
          recBusy = true;
          uxSfx('mic_start');
          render();
        },
      });
    };

    render();
    uxLine('interview_intro', { maxWait: 6500 });
  }

  function showFreeTrain() {
    const s = uxScreen('freeTrain');
    loadArt([...FREE_TRAIN_POOL.slots.flat(), ...FREE_MOUNTAIN_POOL.slots.flat()], ART_PATIENCE);
    let mode = 'train';
    let picked = FREE_TRAIN_POOL.slots.map(row => row[0]);
    let recBusy = false;
    let clipBlob = null;
    let voiceFx = 'normal';
    let activeCarIdx = -1;
    let playSeq = 0;

    let render = () => {};

    const poolFor = () => mode === 'mountain' ? FREE_MOUNTAIN_POOL : FREE_TRAIN_POOL;

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

    render = () => {
      if (!uxAlive(s)) return;
      const isMt = mode === 'mountain';
      const pool = poolFor();
      const kinds = isMt ? ['who', 'oops', 'heart', 'wand', 'star_end'] : ['who', 'where', 'what', 'mood'];
      const n = pool.slots.length;
      const cw = isMt ? 120 : 154;
      const ch = isMt ? 104 : 114;
      const gap = isMt ? 16 : 22;
      const x0 = isMt ? (456 - (n * cw + (n - 1) * gap) / 2) : 110;
      const mtYs = [110, 96, 82, 96, 110];

      const arcHtml = isMt
        ? `<path d="M ${mtYs.map((yy, i) => `${x0 + i * (cw + gap) + cw / 2} ${yy + ch / 2}`).join(' L ')}" fill="none" stroke="#ffd27a" stroke-width="3.5" stroke-dasharray="7 5" opacity=".65"/>`
        : '';

      const carsHtml = picked.map((cid, i) => {
        const x = x0 + i * (cw + gap);
        const y = isMt ? mtYs[i] : 84;
        const meta = CARD_META[cid] || { label: cid };
        const hot = activeCarIdx === i;
        const conn = !isMt && i < 3 ? `<rect x="${cw - 2}" y="54" width="${gap + 4}" height="8" rx="4" fill="#ffd27a"/>` : '';
        const wheels = !isMt ? `<circle cx="36" cy="${ch + 8}" r="11" fill="#263876" stroke="#ffd27a" stroke-width="2.6"/><circle cx="${cw - 36}" cy="${ch + 8}" r="11" fill="#263876" stroke="#ffd27a" stroke-width="2.6"/>` : '';
        return `<g class="card-btn${hot ? ' ux-pulse' : ''}" data-car="${i}" role="button" tabindex="0" aria-label="${meta.label}" transform="translate(${x} ${y})">
          ${conn}${wheels}
          <g class="card-vis" filter="url(#softShadow)">
            <rect width="${cw}" height="${ch}" rx="20" fill="#fff9ec" stroke="${hot ? '#ffd27a' : '#7dd4ff'}" stroke-width="${hot ? 4.5 : 3.2}"/>
            <g transform="translate(${cw / 2} -2)">${uxSlotBadgeSvg(kinds[i], hot, 15)}</g>
            <image href="${SRC(cid)}" x="${(cw - 88) / 2}" y="16" width="88" height="86" preserveAspectRatio="xMidYMid meet"/>
          </g>
        </g>`;
      }).join('');

      const rowsHtml = pool.slots.map((row, sIdx) => {
        const colX = x0 + sIdx * (cw + gap);
        const twoByTwo = row.length === 4;
        return row.map((cid, rIdx) => {
          const active = picked[sIdx] === cid;
          const meta = CARD_META[cid] || { label: cid };
          const w = twoByTwo ? Math.floor((cw - 6) / 2) : cw - 4;
          const h = twoByTwo ? 78 : 70;
          const tx = twoByTwo ? colX + (rIdx % 2) * (w + 6) : colX + 2;
          const ty = twoByTwo ? 244 + ((rIdx / 2) | 0) * 90 : 230 + rIdx * 82;
          const iw = twoByTwo ? Math.min(54, w - 10) : 72;
          const ih = twoByTwo ? 58 : 56;
          return `<g class="card-btn" data-pick-slot="${sIdx}" data-pick-cid="${cid}" role="button" tabindex="0" aria-label="${meta.label}" transform="translate(${tx} ${ty})">
            <g class="card-vis" filter="url(#softShadow)">
              <rect width="${w}" height="${h}" rx="16" fill="${active ? '#ffe08a' : '#fff9ec'}" stroke="${active ? '#f59e0b' : '#7ea9e8'}" stroke-width="${active ? 3.2 : 2.4}"/>
              <image href="${SRC(cid)}" x="${(w - iw) / 2}" y="${(h - ih) / 2}" width="${iw}" height="${ih}" preserveAspectRatio="xMidYMid meet"/>
            </g>
          </g>`;
        }).join('');
      }).join('');

      const playBtn = uxButton({ act: 'speakTrain', ui: 'demo', icon: 'speaker', x: 892, y: 122, r: 36, plate: 'gold' });
      const micRipple = recBusy ? `<circle class="ux-ripple" cx="892" cy="236" r="44" fill="none" stroke="#ff7ca0" stroke-width="4" pointer-events="none"/>` : '';
      const micBtn = micRipple + uxButton(recBusy
        ? { act: 'freeMic', ui: 'stop', icon: 'stop', x: 892, y: 236, r: 42, plate: 'rec', cls: 'ux-pulse' }
        : { act: 'freeMic', ui: 'mic', pic: 'prop_mic', x: 892, y: 236, r: 42, plate: 'gold' });
      const listenBtn = clipBlob ? uxButton({ act: 'freePlay', ui: 'listen', icon: 'play', x: 892, y: 348, r: 34 }) : '';
      const fxBtn = clipBlob && !recBusy ? uxButton({ act: 'cycleFx', ui: `fx_${voiceFx}`, icon: 'fx_' + voiceFx, x: 892, y: 446, r: 32, plate: voiceFx === 'normal' ? '' : 'gold' }) : '';

      const root = uxPaint(`<g class="page">
        <image href="${SRC('bg_garden')}" width="960" height="520" preserveAspectRatio="xMidYMid slice"/>
        <rect width="960" height="520" fill="#101836" opacity=".54"/>
        ${uxButton({ act: 'back', ui: 'back', icon: 'back', x: 52, y: 46, r: 32 })}
        ${uxButton({ act: 'modeTrain', ui: 'mode_train', icon: 'train', x: 430, y: 46, r: 32, plate: !isMt ? 'gold' : '' })}
        ${uxButton({ act: 'modeMountain', ui: 'mode_mountain', icon: 'mountain', x: 526, y: 46, r: 32, plate: isMt ? 'gold' : '' })}
        ${arcHtml}${carsHtml}${rowsHtml}${playBtn}${micBtn}${listenBtn}${fxBtn}
      </g>`);

      const cleanup = () => {
        playSeq++;
        activeCarIdx = -1;
        if (recBusy) { recorder.stop(); recBusy = false; }
        recorder.stopPlay();
        setRecordingAudioMode('off');
        saveWrite();
      };
      const back = () => { cleanup(); uxEnd(s, () => showTitle()); };
      s.onKey = back;

      const playBlob = b => {
        setRecordingAudioMode('premiere');
        recorder.play(b, () => setRecordingAudioMode('off'), { fx: voiceFx });
      };

      uxBind(root, {
        back,
        modeTrain: () => {
          if (recBusy || mode === 'train') return;
          playSeq++; activeCarIdx = -1; mode = 'train';
          picked = FREE_TRAIN_POOL.slots.map(row => row[0]);
          clipBlob = null; uxSfx('tap'); render();
        },
        modeMountain: () => {
          if (recBusy || mode === 'mountain') return;
          playSeq++; activeCarIdx = -1; mode = 'mountain';
          picked = FREE_MOUNTAIN_POOL.slots.map(row => row[0]);
          clipBlob = null; uxSfx('tap'); render();
        },
        speakTrain: () => readTrain(),
        cycleFx: () => {
          if (!clipBlob || recBusy) return;
          const order = ['normal', 'olaf', 'hall'];
          voiceFx = order[(order.indexOf(voiceFx) + 1) % order.length];
          render();
          playBlob(clipBlob);
        },
        freeMic: async () => {
          unlockAudio();
          playSeq++;
          activeCarIdx = -1;
          if (recBusy) {
            const res = await recorder.stop();
            recBusy = false;
            setRecordingAudioMode('off');
            uxSfx('mic_stop');
            if (res && res.blob) {
              clipBlob = res.blob;
              const fid = 'free_' + Date.now();
              const meta = { createdAt: Date.now(), mode, cards: picked.slice(), durationMs: res.durationMs || 0, activeSpeechMs: res.activeSpeechMs || 0 };
              await recorder.saveClip(fid, res.blob);
              await recorder.saveMeta(fid, meta);
              save.creations = [{ id: fid, mode, cards: picked.slice(), createdAt: meta.createdAt, durationMs: meta.durationMs, activeSpeechMs: meta.activeSpeechMs, timeline: [] }, ...(save.creations || [])];
              while (save.creations.length > 30) {
                const dropped = save.creations.pop();
                if (dropped) recorder.deleteClip(dropped.id);
              }
              save.recordingsCount = (save.recordingsCount || 0) + 1;
              save.speechSamples = (save.speechSamples || 0) + 1;
              save.totalSpeechMs = (save.totalSpeechMs || 0) + (res.activeSpeechMs || 0);
              saveWrite();
              render();
              playBlob(res.blob);
            } else render();
            return;
          }
          setRecordingAudioMode('rec_quiet');
          const st = await recorder.start(null, () => { if (recBusy && uxAlive(s)) root.querySelector('[data-act="freeMic"]').dispatchEvent(new MouseEvent('click')); });
          if (!st.ok) {
            setRecordingAudioMode('off');
            uxLine('mic_fallback', { interrupt: true, maxWait: 4500 });
            readTrain();
            return;
          }
          recBusy = true;
          uxSfx('mic_start');
          render();
        },
        freePlay: () => { if (clipBlob) playBlob(clipBlob); },
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
    loadArt([...LEVELS.map(l => l.coverCard), ...INTERVIEW_TOPICS.map(t => t.card)], ART_PATIENCE);
    let tab = 'stories';
    let voiceFx = 'normal';
    let playingId = '';

    const meterSvg = on => `<rect x="34" y="88" width="96" height="26" rx="13" fill="${on ? '#ff9cc4' : '#ffe6a3'}" stroke="#ff9cc4" stroke-width="2"/>
      ${uxPic('prop_mic', 46, 90, 14, 21, '', 'meet')}
      <rect x="68" y="97" width="4" height="8" rx="2" fill="#d64579"/>
      <rect x="76" y="93" width="4" height="16" rx="2" fill="#d64579"/>
      <rect x="84" y="95" width="4" height="12" rx="2" fill="#d64579"/>
      <rect x="92" y="97" width="4" height="8" rx="2" fill="#d64579"/>`;

    const render = async () => {
      if (!uxAlive(s)) return;
      const keys = new Set(await recorder.listClipKeys());
      if (!uxAlive(s)) return;
      let discs;
      if (tab === 'stories') {
        discs = LEVELS.map((lv, i) => {
          const col = i % 4, row = (i / 4) | 0;
          const x = 68 + col * 210, y = 92 + row * 138;
          const hasRec = keys.has('room_' + lv.id);
          const on = playingId === lv.id;
          const pill = hasRec ? meterSvg(on) : `<rect x="34" y="88" width="96" height="26" rx="13" fill="#253978" stroke="#7dd4ff" stroke-width="2"/><g transform="translate(82 101)">${uxIcon('speaker', 13, '#a8ccff')}</g>`;
          return `<g class="ux-btn${on ? ' ux-pulse' : ''}" data-play-key="room_${lv.id}" data-lv="${lv.id}" role="button" tabindex="0" aria-label="${lv.title}" transform="translate(${x} ${y})">
            <g class="btn-vis" filter="url(#softShadow)">
              <rect width="194" height="124" rx="22" fill="${hasRec ? '#fff9ec' : '#1b264f'}" stroke="${on ? '#ff9cc4' : (hasRec ? '#ffd27a' : '#4d659c')}" stroke-width="${on ? 4.5 : 3}"/>
              <image href="${SRC('portrait_' + lv.host)}" x="10" y="10" width="32" height="32" preserveAspectRatio="xMidYMid meet"/>
              <image href="${SRC(lv.coverCard)}" x="56" y="10" width="84" height="72" preserveAspectRatio="xMidYMid meet" opacity="${hasRec ? 1 : .58}"/>
              <text x="172" y="28" text-anchor="middle" font-size="14" font-weight="bold" fill="${hasRec ? '#8a5a10' : '#7c96c8'}">${lv.badge}</text>
              ${pill}
            </g>
          </g>`;
        }).join('');
      } else if (tab === 'free') {
        const list = (save.creations || []).filter(c => keys.has(c.id)).slice(0, 12);
        discs = list.length ? list.map((c, i) => {
          const col = i % 4, row = (i / 4) | 0;
          const x = 68 + col * 210, y = 92 + row * 138;
          const on = playingId === c.id;
          const c0 = (c.cards && c.cards[0]) || 'portrait_olaf';
          const cLast = (c.cards && c.cards[c.cards.length - 1]) || 'card_mood_happy';
          return `<g class="ux-btn${on ? ' ux-pulse' : ''}" data-play-key="${c.id}" role="button" tabindex="0" aria-label="自由创作" transform="translate(${x} ${y})">
            <g class="btn-vis" filter="url(#softShadow)">
              <rect width="194" height="124" rx="22" fill="#fff9ec" stroke="${on ? '#ff9cc4' : '#ffd27a'}" stroke-width="${on ? 4.5 : 3}"/>
              <image href="${SRC(c0)}" x="22" y="12" width="68" height="68" preserveAspectRatio="xMidYMid meet"/>
              <image href="${SRC(cLast)}" x="104" y="12" width="68" height="68" preserveAspectRatio="xMidYMid meet"/>
              <g transform="translate(97 22)">${uxIcon(c.mode === 'mountain' ? 'mountain' : 'train', 14, '#7ea9e8')}</g>
              ${meterSvg(on)}
            </g>
          </g>`;
        }).join('') : `<image href="${SRC('olaf_idle')}" x="424" y="190" width="112" height="175" preserveAspectRatio="xMidYMid meet"/>`;
      } else {
        const list = (save.diary || []).filter(d => keys.has(d.id)).slice(0, 12);
        discs = list.length ? list.map((d, i) => {
          const col = i % 4, row = (i / 4) | 0;
          const x = 68 + col * 210, y = 92 + row * 138;
          const on = playingId === d.id;
          const tp = INTERVIEW_TOPICS.find(t => t.id === d.topicId) || INTERVIEW_TOPICS[0];
          return `<g class="ux-btn${on ? ' ux-pulse' : ''}" data-play-key="${d.id}" role="button" tabindex="0" aria-label="${tp.title}" transform="translate(${x} ${y})">
            <g class="btn-vis" filter="url(#softShadow)">
              <rect width="194" height="124" rx="22" fill="#fff9ec" stroke="${on ? '#ff9cc4' : '#ffd27a'}" stroke-width="${on ? 4.5 : 3}"/>
              <image href="${SRC('portrait_olaf')}" x="10" y="10" width="32" height="32" preserveAspectRatio="xMidYMid meet"/>
              <image href="${SRC(tp.card)}" x="56" y="10" width="84" height="72" preserveAspectRatio="xMidYMid meet"/>
              ${meterSvg(on)}
            </g>
          </g>`;
        }).join('') : `<image href="${SRC('olaf_idle')}" x="424" y="190" width="112" height="175" preserveAspectRatio="xMidYMid meet"/>`;
      }

      const root = uxPaint(`<g class="page">
        <image href="${SRC('bg_cozy')}" width="960" height="520" preserveAspectRatio="xMidYMid slice"/>
        <rect width="960" height="520" fill="#101836" opacity=".62"/>
        ${uxButton({ act: 'back', ui: 'back', icon: 'back', x: 56, y: 46, r: 32 })}
        ${uxButton({ act: 'tab_stories', ui: 'tab_stories', icon: 'rooms', x: 356, y: 46, r: 32, plate: tab === 'stories' ? 'gold' : '' })}
        ${uxButton({ act: 'tab_free', ui: 'tab_free', icon: 'mountain', x: 446, y: 46, r: 32, plate: tab === 'free' ? 'gold' : '' })}
        ${uxButton({ act: 'tab_diary', ui: 'tab_diary', icon: 'diary', x: 536, y: 46, r: 32, plate: tab === 'diary' ? 'gold' : '' })}
        ${uxButton({ act: 'fx_normal', ui: 'fx_normal', icon: 'fx_normal', x: 720, y: 46, r: 32, plate: voiceFx === 'normal' ? 'gold' : '' })}
        ${uxButton({ act: 'fx_olaf', ui: 'fx_olaf', icon: 'fx_olaf', x: 796, y: 46, r: 32, plate: voiceFx === 'olaf' ? 'gold' : '' })}
        ${uxButton({ act: 'fx_hall', ui: 'fx_hall', icon: 'fx_hall', x: 872, y: 46, r: 32, plate: voiceFx === 'hall' ? 'gold' : '' })}
        ${discs}
      </g>`);
      const back = () => { recorder.stopPlay(); setRecordingAudioMode('off'); uxEnd(s, () => showTitle()); };
      s.onKey = back;
      uxBind(root, {
        back,
        tab_stories: () => { recorder.stopPlay(); setRecordingAudioMode('off'); playingId = ''; tab = 'stories'; render(); },
        tab_free: () => { recorder.stopPlay(); setRecordingAudioMode('off'); playingId = ''; tab = 'free'; render(); },
        tab_diary: () => { recorder.stopPlay(); setRecordingAudioMode('off'); playingId = ''; tab = 'diary'; render(); },
        fx_normal: () => { voiceFx = 'normal'; render(); },
        fx_olaf: () => { voiceFx = 'olaf'; render(); },
        fx_hall: () => { voiceFx = 'hall'; render(); },
      });
      root.querySelectorAll('[data-play-key]').forEach(d => {
        const key = d.getAttribute('data-play-key');
        const lid = d.getAttribute('data-lv') || '';
        const playItem = async () => {
          playingId = lid || key;
          const blob = await recorder.loadClip(key);
          if (blob) {
            const meta = await recorder.loadMeta(key);
            setRecordingAudioMode('premiere');
            render();
            recorder.play(blob, () => { playingId = ''; setRecordingAudioMode('off'); if (uxAlive(s)) render(); }, {
              fx: voiceFx,
              timeline: (meta && meta.timeline) || [],
            });
          } else if (lid) {
            const lv = LEVELS.find(x => x.id === lid);
            recorder.stopPlay();
            setRecordingAudioMode('off');
            render();
            if (lv) uxLine(lv.demoKey, { interrupt: true, maxWait: 9000 }).then(() => { playingId = ''; if (uxAlive(s)) render(); });
          }
        };
        d.addEventListener('click', playItem);
        d.addEventListener('keydown', /** @param {KeyboardEvent} e */ e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playItem(); } });
      });
    };
    render();
    uxLine('album_intro', { maxWait: 4500 });
  }
