  /* Orchestration: main game flow, Stage 1 builder, Stage 2 local voice recording studio, animation loop & boot. */
  const playFlow = { phase: 'title', studioTimer: 0, studioNonce: 0 };
  uxHooks.replay = i => openRoom(i);

  const sessionClips = new Map();

  function stopStudioPlayback() {
    playFlow.studioNonce++;
    clearInterval(playFlow.studioTimer);
    playFlow.studioTimer = 0;
    if (recorder.recording) recorder.stop();
    recorder.stopPlay();
    stageState.recording = false;
    stageState.activeCardIdx = -1;
    setMicMute(false);
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
        showStory(['p1', 'p2', 'p3'], go);
      });
    } else go();
  }

  function openRoom(idx) {
    const lv = LEVELS[idx];
    if (!lv) return;
    stopStudioPlayback();
    playFlow.phase = 'story';
    loadArt(roomArt(lv), ART_PATIENCE).then(async () => {
      const existingClip = await recorder.loadClip('room_' + lv.id);
      if (existingClip) sessionClips.set(lv.id, existingClip);
      showChapter(idx, () => {
        playFlow.phase = 'play';
        game.start(idx);
        stageState.idx = -1;
        stageState.hasClip = sessionClips.has(lv.id);
        renderStage(game, true);
        syncHud();
        talkOnEvents(game.drain(), game);
      });
    });
  }

  function onHudReplay() {
    if (game.state !== 'play') return;
    stopStudioPlayback();
    game.start(game.index);
    stageState.idx = -1;
    stageState.hasClip = sessionClips.has(game.level().id);
    renderStage(game, true);
    syncHud();
    talkOnEvents(game.drain(), game);
  }

  function onCardPick(cid, btnNode) {
    if (!canPlay() || game.phase !== 'build') return;
    unlockAudio();
    const ok = game.pickCard(cid);
    const evs = game.drain();
    audioOnEvents(evs);
    talkOnEvents(evs, game);
    if (!ok) {
      uxNudge(btnNode);
      speakCard(cid);
      renderStage(game, false);
      return;
    }
    const meta = CARD_META[cid];
    if (meta && meta.voiceKey && hasLineKey(meta.voiceKey) && game.phase === 'build') {
      voice.line(meta.voiceKey, { interrupt: true, tag: 'card', maxWait: 2000, subtitle: false });
    }
    uxConfetti($('fx'), 480, 210, 16);
    renderStage(game, false);
  }

  function runStudioCardWalk(count) {
    clearInterval(playFlow.studioTimer);
    let c = 0;
    highlightStudioCard(0);
    playFlow.studioTimer = setInterval(() => {
      if (game.state !== 'play' || game.phase !== 'studio' || storyIsOpen()) {
        clearInterval(playFlow.studioTimer);
        highlightStudioCard(-1);
        return;
      }
      c = (c + 1) % Math.max(1, count);
      highlightStudioCard(c);
    }, 1800);
  }

  function onStudioDemo() {
    if (!canPlay() || game.phase !== 'studio' || stageState.recording) return;
    unlockAudio();
    setMicMute(false);
    recorder.stopPlay();
    game.markDemoHeard();
    audioOnEvents(game.drain());
    const lv = game.level();
    const nonce = ++playFlow.studioNonce;
    runStudioCardWalk(game.studioCards().length);
    TK.say(lv.demoKey, { interrupt: true, tag: 'demo', maxWait: 10000 }).then(() => {
      if (nonce !== playFlow.studioNonce) return;
      clearInterval(playFlow.studioTimer);
      highlightStudioCard(-1);
      renderStage(game, true);
    });
  }

  async function onStudioMicToggle() {
    if (!canPlay() || game.phase !== 'studio') return;
    unlockAudio();
    const lv = game.level();
    const nonce = ++playFlow.studioNonce;

    if (stageState.recording) {
      clearInterval(playFlow.studioTimer);
      highlightStudioCard(-1);
      const res = await recorder.stop();
      stageState.recording = false;
      setMicMute(false);
      setStudioWaves(null);
      uxSfx('mic_stop');
      if (res && res.blob) {
        sessionClips.set(lv.id, res.blob);
        stageState.hasClip = true;
        await recorder.saveClip('room_' + lv.id, res.blob);
        save.recordingsCount = (save.recordingsCount || 0) + 1;
        saveWrite();
        game.markRecorded();
        audioOnEvents(game.drain());
        uxConfetti($('fx'), 480, 240, 32);
        stageState.idx = -1;
        renderStage(game, true);
        // Play back the child's own recording cleanly, then celebrate!
        setMicMute(true);
        recorder.play(res.blob, () => {
          setMicMute(false);
          if (nonce === playFlow.studioNonce && canPlay()) {
            TK.say('rec_done_' + (1 + Math.floor(Math.random() * 3)), { interrupt: true, maxWait: 5000 });
          }
        });
      } else {
        stageState.idx = -1;
        renderStage(game, true);
      }
      return;
    }

    recorder.stopPlay();
    setMicMute(true);
    const res = await recorder.start(
      bars => setStudioWaves(bars),
      () => { if (stageState.recording) onStudioMicToggle(); },
    );
    if (!res.ok) {
      setMicMute(false);
      stageState.recording = false;
      setStudioWaves(null);
      game.markDemoHeard();
      renderStage(game, true);
      runStudioCardWalk(game.studioCards().length);
      TK.say('mic_fallback', { interrupt: true, tag: 'demo', maxWait: 6000 }).then(() => {
        if (nonce === playFlow.studioNonce) TK.say(lv.demoKey, { tag: 'demo', maxWait: 9500 });
      });
      return;
    }
    stageState.recording = true;
    uxSfx('mic_start');
    stageState.idx = -1;
    renderStage(game, true);
    runStudioCardWalk(game.studioCards().length);
  }

  async function onStudioListen() {
    if (!canPlay() || game.phase !== 'studio' || stageState.recording) return;
    unlockAudio();
    const lv = game.level();
    let blob = sessionClips.get(lv.id);
    if (!blob) blob = await recorder.loadClip('room_' + lv.id);
    if (!blob) { onStudioDemo(); return; }
    sessionClips.set(lv.id, blob);
    setMicMute(true);
    runStudioCardWalk(game.studioCards().length);
    recorder.play(blob, () => {
      setMicMute(false);
      clearInterval(playFlow.studioTimer);
      highlightStudioCard(-1);
    });
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
      uxSfx('tap');
      TK.say('idle_' + (1 + Math.floor(Math.random() * 3)), { interrupt: true, tag: 'hint', maxWait: 3500 });
    } else {
      onStudioDemo();
    }
  }

  function completeRoom(lvIdx) {
    const lv = LEVELS[lvIdx];
    playFlow.phase = 'clear';
    const stars = [true, !!(game.demoHeard || game.recorded), !!game.recorded];
    markRoom(lv.id, { cleared: true, recorded: !!game.recorded, stars });
    if (!save.skills) save.skills = { sequence: 0, sentence: 0, classify: 0, reason: 0 };
    save.skills[lv.skill] = Math.min(2, (save.skills[lv.skill] || 0) + 1);
    saveWrite();

    showClear(lvIdx, () => {
      if (lvIdx >= LEVELS.length - 1) showStory(['win', 'end'], () => showFinale(showTitle));
      else openRoom(lvIdx + 1);
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
      if (evs.length) { audioOnEvents(evs); talkOnEvents(evs, game); }
      renderHeroes(game, tSec);
      secAcc += dt;
      if (secAcc >= 1) { save.totalPlaySeconds += Math.floor(secAcc); secAcc %= 1; saveSoon(); }
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
    save.skills = { sequence: 2, sentence: 2, classify: 2, reason: 2 };
    save.recordingsCount = 4;
    save.freeSentences = 3;
  }

  loadArt(titlePlan.title, ART_PATIENCE).then(() => {
    registerOfflineWorker();
    if (DEV && qaMode === 'win') {
      save.unlocked.rooms = LEVELS.length;
      for (const lv of LEVELS) markRoom(lv.id, { cleared: true, recorded: true, stars: [true, true, true] });
      save.skills = { sequence: 2, sentence: 2, classify: 2, reason: 2 };
      showStory(['win', 'end'], () => showFinale(showTitle));
    } else {
      showTitle();
    }
    requestAnimationFrame(frame);
  });
