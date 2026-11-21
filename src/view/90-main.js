  /* Orchestration: seamless 12-chapter narrative flow, Build Bridge, Auto-Demo, Smart Cloze Relay & Premiere. */
  const playFlow = {
    phase: 'title', studioTimer: 0, studioNonce: 0,
    recStartMs: 0, recTimeline: [], clozeResolve: null,
  };
  uxHooks.replay = i => openRoom(i);

  const sessionClips = new Map();
  const sessionMetas = new Map();
  let sessionPlaySec = 0;
  let pendingEyeCare = false;

  function maybeEyeCareBreak(nextFn) {
    if (pendingEyeCare && setting('eyeCare') && typeof showEyeCareBreak === 'function') {
      pendingEyeCare = false;
      sessionPlaySec = 0;
      showEyeCareBreak(nextFn);
      return;
    }
    nextFn();
  }

  function stopStudioPlayback() {
    playFlow.studioNonce++;
    clearInterval(playFlow.studioTimer);
    playFlow.studioTimer = 0;
    if (typeof playFlow.clozeResolve === 'function') {
      const r = playFlow.clozeResolve;
      playFlow.clozeResolve = null;
      r();
    }
    if (recorder.recording) recorder.stop();
    recorder.stopPlay();
    stageState.recording = false;
    stageState.premiere = false;
    stageState.activeCardIdx = -1;
    setLiveVoice(false, 0);
    setRecordingAudioMode('off');
    setStudioWaves(null);
  }

  function registerOfflineWorker() {
    if (!offlineWorkerAllowed(location.search, location.protocol, 'serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  function onSettingChanged(key, value) {
    if (key === 'sound') { muted = !value; if (typeof refreshAudioGains === 'function') refreshAudioGains(); }
    if (key === 'subtitles' && typeof TK !== 'undefined') TK.refreshSubtitles();
  }

  function onStartJourney() {
    const idx = nextRoomIndex();
    const go = () => openRoom(idx);
    if (!save.flags.prologue && idx === 0) {
      loadArt(assetPlan(LEVELS).title, ART_PATIENCE).then(() => {
        save.flags.prologue = true; saveWrite();
        showStory(['p1'], go);
      });
    } else maybeEyeCareBreak(go);
  }

  function openRoom(idx) {
    const lv = LEVELS[idx];
    if (!lv) return;
    stopStudioPlayback();
    playFlow.phase = 'story';
    loadArt(roomArt(lv), ART_PATIENCE).then(async () => {
      const existingClip = await recorder.loadClip('room_' + lv.id);
      const existingMeta = await recorder.loadMeta('room_' + lv.id);
      if (existingClip) sessionClips.set(lv.id, existingClip);
      if (existingMeta) sessionMetas.set(lv.id, existingMeta);
      playFlow.phase = 'play';
      game.start(idx);
      stageState.idx = -1;
      stageState.tier = save.studioTier || 'cloze';
      stageState.hasClip = sessionClips.has(lv.id);
      renderStage(game, true);
      syncHud();
      talkOnEvents(game.drain(), game);
    });
  }

  function onHudReplay() {
    if (game.state !== 'play') return;
    stopStudioPlayback();
    game.start(game.index);
    stageState.idx = -1;
    stageState.tier = save.studioTier || 'cloze';
    stageState.hasClip = sessionClips.has(game.level().id);
    renderStage(game, true);
    syncHud();
    talkOnEvents(game.drain(), game);
  }

  let pickNonce = 0;

  function onHudPrompt() {
    if (!canPlay()) return;
    unlockAudio();
    const lv = game.level();
    if (!lv) return;
    if (game.phase === 'build') {
      const key = (lv.skill === 'reason' && game.puzzleIdx > 0) ? 'reason_puz2_intro' : lv.introKey;
      TK.say(key, { interrupt: true, tag: 'prompt', maxWait: 6000 });
    } else {
      TK.say('studio_prompt', { interrupt: true, tag: 'studio', maxWait: 5500 });
    }
  }

  function cueForSlot(lv, i) {
    if (!lv) return 'cue_first';
    if (lv.skill === 'sequence') return ['cue_first', 'cue_then', 'cue_last'][i] || 'cue_last';
    if (lv.skill === 'sentence') return ['cue_who', 'cue_where', 'cue_what', 'cue_mood'][i] || 'cue_mood';
    if (lv.skill === 'classify') return ['cue_num1', 'cue_num2', 'cue_num3'][i] || 'cue_num3';
    if (lv.skill === 'reason') return i % 2 === 0 ? 'cue_pick' : 'cue_why';
    if (lv.skill === 'twist') return ['cue_plan', 'cue_but', 'cue_so', 'cue_last'][i] || 'cue_last';
    if (lv.skill === 'episode') return ['cue_who', 'cue_problem', 'cue_feel', 'cue_action', 'cue_last'][i] || 'cue_last';
    return 'cue_first';
  }

  function relayForSlot(lv, i) {
    if (!lv) return 'relay_first';
    if (lv.skill === 'sequence') return ['relay_first', 'relay_then', 'relay_last'][i] || 'relay_last';
    if (lv.skill === 'sentence') return ['relay_who', 'relay_where', 'relay_what', 'relay_mood'][i] || 'relay_mood';
    if (lv.skill === 'classify') return ['relay_num1', 'relay_num2', 'relay_num3'][i] || 'relay_num3';
    if (lv.skill === 'reason') return i % 2 === 0 ? 'relay_pick' : 'relay_why';
    if (lv.skill === 'twist') return ['relay_plan', 'relay_but', 'relay_so', 'relay_last'][i] || 'relay_last';
    if (lv.skill === 'episode') return ['relay_who', 'relay_problem', 'relay_feel', 'relay_action', 'relay_last'][i] || 'relay_last';
    return 'relay_first';
  }

  function recastKeyFor(lv, misses) {
    if (misses >= 2) return 'assist_1';
    if (lv.skill === 'sequence' || lv.skill === 'twist' || lv.skill === 'episode') return 'recast_order';
    if (lv.skill === 'classify') return 'recast_classify';
    if (lv.skill === 'reason') return 'recast_reason';
    return 'try_1';
  }

  function onCardPick(cid, btnNode) {
    if (!canPlay() || game.phase !== 'build') return;
    unlockAudio();
    const myNonce = ++pickNonce;
    const ok = game.pickCard(cid);
    const evs = game.drain();
    audioOnEvents(evs);
    talkOnEvents(evs, game);
    if (!ok) {
      uxNudge(btnNode);
      renderStage(game, false);
      const rk = recastKeyFor(game.level(), game.misses);
      speakCard(cid).then(() => {
        if (myNonce === pickNonce && canPlay() && game.phase === 'build') {
          TK.say(rk, { tag: 'try', maxWait: 5000 });
        }
      });
      return;
    }

    uxConfetti($('fx'), 480, 210, 16);
    renderStage(game, false);

    if (evs.some(e => e.type === 'studio_ready')) {
      speakCard(cid).then(() => {
        if (myNonce === pickNonce && canPlay() && game.phase === 'studio' && !stageState.recording) {
          onStudioDemo(true);
        }
      });
    } else if (game.phase === 'build' && !evs.some(e => e.type === 'puzzle_next')) {
      speakCard(cid).then(() => {
        if (myNonce === pickNonce && canPlay() && game.phase === 'build') {
          const nextCue = cueForSlot(game.level(), game.stepIdx);
          if (nextCue) TK.say(nextCue, { tag: 'cue', maxWait: 3200, subtitle: false });
        }
      });
    }
  }

  function onStudioCardTap(idx, cid, cardNode) {
    if (stageState.recording) {
      highlightStudioCard(idx);
      const ms = Math.max(0, Date.now() - playFlow.recStartMs);
      playFlow.recTimeline.push({ cardIdx: idx, ms });
      if (typeof playFlow.clozeResolve === 'function') {
        const r = playFlow.clozeResolve;
        playFlow.clozeResolve = null;
        r();
      }
      return;
    }
    uxNudge(cardNode);
    speakCard(cid);
    highlightStudioCard(idx);
  }

  async function onStudioDemo(isAuto) {
    if (!canPlay() || game.phase !== 'studio' || stageState.recording) return;
    unlockAudio();
    setRecordingAudioMode('off');
    recorder.stopPlay();
    game.markDemoHeard();
    audioOnEvents(game.drain());
    const lv = game.level();
    const cards = game.studioCards();
    const nonce = ++playFlow.studioNonce;

    const finishDemo = () => {
      if (nonce !== playFlow.studioNonce) return;
      clearInterval(playFlow.studioTimer);
      highlightStudioCard(-1);
      renderStage(game, true);
      if (isAuto && canPlay() && game.phase === 'studio' && !stageState.recording) {
        TK.say('studio_turn', { tag: 'studio', maxWait: 5500 });
      }
    };

    if (game.isCustomSentence()) {
      for (let i = 0; i < cards.length; i++) {
        if (nonce !== playFlow.studioNonce || game.phase !== 'studio' || stageState.recording) return;
        highlightStudioCard(i);
        const m = cardMetaOf(cards[i]);
        if (m && m.voiceKey && hasLineKey(m.voiceKey)) {
          await voice.line(m.voiceKey, { interrupt: true, tag: 'demo', maxWait: 3000, subtitle: false });
        }
      }
      finishDemo();
      return;
    }

    clearInterval(playFlow.studioTimer);
    let c = 0;
    const stepMs = Math.max(1200, Math.round(7800 / Math.max(1, cards.length)));
    highlightStudioCard(0);
    playFlow.studioTimer = setInterval(() => {
      if (nonce !== playFlow.studioNonce || game.phase !== 'studio' || storyIsOpen()) {
        clearInterval(playFlow.studioTimer);
        return;
      }
      c = Math.min(cards.length - 1, c + 1);
      highlightStudioCard(c);
    }, stepMs);

    TK.say(lv.demoKey, { interrupt: true, tag: 'demo', maxWait: 14000 }).then(finishDemo);
  }

  function playStudioPremiere(lid, blob, meta, celebrateNew) {
    if (!blob) return;
    const nonce = ++playFlow.studioNonce;
    stageState.premiere = true;
    stageState.idx = -1;
    renderStage(game, true);
    uxSfx('premiere');
    setTimeout(() => {
      if (nonce !== playFlow.studioNonce || !canPlay()) return;
      setRecordingAudioMode('premiere');
      recorder.play(blob, () => {
        stageState.premiere = false;
        setLiveVoice(false, 0);
        setRecordingAudioMode('off');
        setStudioWaves(null);
        highlightStudioCard(-1);
        if (nonce === playFlow.studioNonce && canPlay()) {
          stageState.idx = -1;
          renderStage(game, true);
          uxConfetti($('fx'), 480, 220, celebrateNew ? 34 : 20);
          if (celebrateNew) TK.say('rec_done_' + (1 + Math.floor(Math.random() * 3)), { interrupt: true, maxWait: 5000 });
        }
      }, {
        fx: stageState.voiceFx,
        timeline: (meta && meta.timeline) || [],
        onCard: idx => { if (nonce === playFlow.studioNonce) highlightStudioCard(idx); },
        onBars: bars => setStudioWaves(bars),
        onEnergy: energy => setLiveVoice(true, energy),
      });
    }, 480);
  }

  async function runClozeLoop(lv, cards, nonce) {
    for (let i = 0; i < cards.length; i++) {
      if (nonce !== playFlow.studioNonce || !stageState.recording) return;
      highlightStudioCard(i);
      const ms = Math.max(0, Date.now() - playFlow.recStartMs);
      if (i > 0) playFlow.recTimeline.push({ cardIdx: i, ms });
      const relayKey = relayForSlot(lv, i);
      await TK.say(relayKey, { interrupt: true, tag: 'cue', maxWait: 2500, subtitle: false });
      if (nonce !== playFlow.studioNonce || !stageState.recording) return;
      await new Promise(resolve => {
        const done = () => {
          clearTimeout(t);
          if (playFlow.clozeResolve === done) playFlow.clozeResolve = null;
          resolve(undefined);
        };
        const t = setTimeout(done, 5500);
        playFlow.clozeResolve = done;
      });
      if (nonce === playFlow.studioNonce && stageState.recording && i < cards.length - 1) uxSfx('cloze_cue');
    }
    if (nonce === playFlow.studioNonce && stageState.recording) {
      setTimeout(() => { if (nonce === playFlow.studioNonce && stageState.recording) onStudioMicToggle(); }, 600);
    }
  }

  async function onStudioMicToggle() {
    if (!canPlay() || game.phase !== 'studio') return;
    unlockAudio();
    const lv = game.level();
    const nonce = ++playFlow.studioNonce;

    if (stageState.recording) {
      clearInterval(playFlow.studioTimer);
      if (typeof playFlow.clozeResolve === 'function') {
        const r = playFlow.clozeResolve;
        playFlow.clozeResolve = null;
        r();
      }
      highlightStudioCard(-1);
      const res = await recorder.stop();
      stageState.recording = false;
      setLiveVoice(false, 0);
      setRecordingAudioMode('off');
      setStudioWaves(null);
      uxSfx('mic_stop');
      if (res && res.blob) {
        const meta = {
          createdAt: Date.now(),
          durationMs: res.durationMs || 0,
          activeSpeechMs: res.activeSpeechMs || 0,
          tier: save.studioTier || stageState.tier,
          timeline: playFlow.recTimeline.slice(),
        };
        sessionClips.set(lv.id, res.blob);
        sessionMetas.set(lv.id, meta);
        stageState.hasClip = true;
        await recorder.saveClip('room_' + lv.id, res.blob);
        await recorder.saveMeta('room_' + lv.id, meta);
        const firstExisting = await recorder.loadClip('room_' + lv.id + '_first');
        if (!firstExisting) {
          await recorder.saveClip('room_' + lv.id + '_first', res.blob);
          await recorder.saveMeta('room_' + lv.id + '_first', meta);
        }
        save.recordingsCount = (save.recordingsCount || 0) + 1;
        save.speechSamples = (save.speechSamples || 0) + 1;
        save.totalSpeechMs = (save.totalSpeechMs || 0) + (res.activeSpeechMs || 0);
        const rSave = markRoom(lv.id, { recorded: true, stars: [true, true, true] });
        if (!Number.isFinite(rSave.firstSpeechMs)) rSave.firstSpeechMs = res.activeSpeechMs || 0;
        rSave.lastSpeechMs = res.activeSpeechMs || 0;
        rSave.recCount = (rSave.recCount || 0) + 1;
        if ((save.studioTier || stageState.tier) === 'anchor') rSave.tier3 = true;
        saveWrite();
        game.markRecorded();
        audioOnEvents(game.drain());
        playStudioPremiere(lv.id, res.blob, meta, true);
      } else {
        stageState.idx = -1;
        renderStage(game, true);
      }
      return;
    }

    recorder.stopPlay();
    const tier = save.studioTier || stageState.tier || 'cloze';
    stageState.tier = tier;
    setRecordingAudioMode(tier === 'cloze' ? 'rec_cloze' : 'rec_quiet');
    playFlow.recStartMs = Date.now();
    playFlow.recTimeline = [{ cardIdx: 0, ms: 0 }];
    const cards = game.studioCards();
    let clozeBeatBursts = 0;

    const res = await recorder.start(
      frameData => {
        setStudioWaves(frameData.bars);
        setLiveVoice(true, frameData.energy);
        if (tier === 'cloze' && typeof playFlow.clozeResolve === 'function') {
          if (frameData.vad.speechBursts > clozeBeatBursts && frameData.vad.silenceAfterSpeechMs >= 1400) {
            clozeBeatBursts = frameData.vad.speechBursts;
            const r = playFlow.clozeResolve;
            playFlow.clozeResolve = null;
            r();
          }
        } else if (tier !== 'cloze') {
          if (frameData.vad.speechBursts > 0 && frameData.vad.silenceAfterSpeechMs >= 2600 && stageState.activeCardIdx >= 0 && stageState.activeCardIdx + 1 < cards.length) {
            nudgeNextStudioCard(stageState.activeCardIdx + 1);
          }
          if (frameData.vad.activeSpeechMs >= 1500 && frameData.vad.silenceAfterSpeechMs >= 2800 && stageState.recording) {
            onStudioMicToggle();
          }
        }
      },
      () => { if (stageState.recording) onStudioMicToggle(); },
    );
    if (!res.ok) {
      setLiveVoice(false, 0);
      setRecordingAudioMode('off');
      stageState.recording = false;
      setStudioWaves(null);
      game.markDemoHeard();
      renderStage(game, true);
      TK.say('mic_fallback', { interrupt: true, tag: 'demo', maxWait: 6000 }).then(() => {
        if (nonce === playFlow.studioNonce) onStudioDemo(false);
      });
      return;
    }
    stageState.recording = true;
    uxSfx('mic_start');
    stageState.idx = -1;
    renderStage(game, true);
    if (tier === 'cloze') runClozeLoop(lv, cards, nonce);
    else highlightStudioCard(0);
  }

  async function onStudioListen() {
    if (!canPlay() || game.phase !== 'studio' || stageState.recording) return;
    unlockAudio();
    const lv = game.level();
    let blob = sessionClips.get(lv.id);
    if (!blob) blob = await recorder.loadClip('room_' + lv.id);
    if (!blob) { onStudioDemo(false); return; }
    let meta = sessionMetas.get(lv.id);
    if (!meta) meta = await recorder.loadMeta('room_' + lv.id);
    sessionClips.set(lv.id, blob);
    if (meta) sessionMetas.set(lv.id, meta);
    playStudioPremiere(lv.id, blob, meta, false);
  }

  function onStudioDone() {
    if (!canPlay() || game.phase !== 'studio') return;
    stopStudioPlayback();
    if (!game.completeRoom()) return;
    completeRoom(game.index);
  }

  function onHeroTap(who) {
    if (!canPlay() || !who) return;
    unlockAudio();
    game.cheerHero(who);
    uxConfetti($('fx'), who === heroDrawn.leftWho ? 110 : 850, 340, 14);
    const evs = game.drain();
    audioOnEvents(evs);
    talkOnEvents(evs, game);
  }

  function triggerHint() {
    if (!canPlay()) return;
    unlockAudio();
    if (game.phase === 'build') {
      game.hintCard = game.expectedCardId();
      renderStage(game, false);
      uxSfx('tap');
      TK.say('idle_' + (1 + Math.floor(Math.random() * 3)), { interrupt: true, tag: 'hint', maxWait: 3500 });
    } else {
      onStudioDemo(false);
    }
  }

  function completeRoom(lvIdx) {
    const lv = LEVELS[lvIdx];
    playFlow.phase = 'clear';
    const stars = [true, !!(game.demoHeard || game.recorded), !!game.recorded];
    markRoom(lv.id, { cleared: true, recorded: !!game.recorded, stars });
    if (!save.skills) save.skills = { sequence: 0, sentence: 0, classify: 0, reason: 0, twist: 0, episode: 0 };
    save.skills[lv.skill] = Math.min(2, (save.skills[lv.skill] || 0) + 1);
    saveWrite();

    showClear(lvIdx, () => {
      if (lvIdx >= LEVELS.length - 1) showStory(['win', 'end'], () => maybeEyeCareBreak(() => showFinale(showTitle)));
      else maybeEyeCareBreak(() => openRoom(lvIdx + 1));
    });
  }

  let lastT = performance.now(), secAcc = 0;
  function frame(now) {
    const dt = Math.min(.05, (now - lastT) / 1000);
    lastT = now;
    const tSec = now / 1000;
    if (canPlay()) {
      game.step(dt);
      const evs = game.drain();
      if (evs.length) {
        audioOnEvents(evs);
        talkOnEvents(evs, game);
        if (evs.some(e => e.type === 'hint_auto')) renderStage(game, false);
      }
      renderHeroes(game, tSec);
      secAcc += dt;
      if (secAcc >= 1) {
        const inc = Math.floor(secAcc);
        secAcc %= 1;
        save.totalPlaySeconds += inc;
        sessionPlaySec += inc;
        if (sessionPlaySec >= 600) pendingEyeCare = true;
        saveSoon();
      }
    } else if (heroDrawn.built && game.state !== 'play') {
      renderHeroes(game, tSec);
    }
    fxTick(dt, tSec, game);
    audioTick();
    padTick(tSec);
    requestAnimationFrame(frame);
  }

  const titlePlan = assetPlan(LEVELS);
  const qaMode = DEV ? new URLSearchParams(location.search).get('qa') : null;
  if (DEV && qaMode === 'unlock') {
    save.unlocked.rooms = LEVELS.length;
    for (const lv of LEVELS) markRoom(lv.id, { cleared: true, recorded: true, stars: [true, true, true] });
    save.skills = { sequence: 2, sentence: 2, classify: 2, reason: 2, twist: 2, episode: 2 };
    save.recordingsCount = 6;
    save.speechSamples = 6;
    save.totalSpeechMs = 36000;
    save.freeSentences = 4;
  }

  loadArt(titlePlan.title, ART_PATIENCE).then(() => {
    registerOfflineWorker();
    if (DEV && qaMode === 'win') {
      save.unlocked.rooms = LEVELS.length;
      for (const lv of LEVELS) markRoom(lv.id, { cleared: true, recorded: true, stars: [true, true, true] });
      save.skills = { sequence: 2, sentence: 2, classify: 2, reason: 2, twist: 2, episode: 2 };
      showStory(['win', 'end'], () => showFinale(showTitle));
    } else {
      showTitle();
    }
    requestAnimationFrame(frame);
  });
