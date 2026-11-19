  /* Enchanted Arendelle harp/celesta WebAudio score, tactile SFX & strict microphone mute while recording. */
  const AC = window.AudioContext || window.webkitAudioContext;
  let audio = null, muted = !setting('sound'), voiceOn = false, micMute = false, bus = null, curLevel = 0;

  const soundWanted = () => !muted && !micMute && !(typeof isPortraitView === 'function' && isPortraitView());
  const musicLevel = () => soundWanted() ? (voiceOn ? .03 : .11) : 0;

  function makeAudio() {
    if (audio || !AC) return;
    try {
      audio = new AC();
      const comp = audio.createDynamicsCompressor();
      comp.threshold.value = -16; comp.knee.value = 18; comp.ratio.value = 3;
      const music = audio.createGain(); music.gain.value = musicLevel();
      const sfx = audio.createGain(); sfx.gain.value = soundWanted() ? .9 : 0;
      const vGain = audio.createGain(); vGain.gain.value = 1;
      music.connect(comp); sfx.connect(comp); vGain.connect(comp); comp.connect(audio.destination);
      bus = { comp, music, sfx, voice: vGain };
    } catch (e) { audio = null; }
  }

  function refreshAudioGains() {
    if (!audio || !bus) return;
    const t = audio.currentTime;
    bus.music.gain.setTargetAtTime(musicLevel(), t, .08);
    bus.sfx.gain.setTargetAtTime(soundWanted() ? .9 : 0, t, .05);
  }

  function setMicMute(on) {
    micMute = !!on;
    if (micMute && typeof voice !== 'undefined') voice.stop();
    refreshAudioGains();
  }

  function unlockAudio() {
    makeAudio();
    if (audio && audio.state === 'suspended') audio.resume().catch(() => {});
    refreshAudioGains();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && typeof voice !== 'undefined') voice.suspend();
    refreshAudioGains();
  });

  const midi = n => 440 * Math.pow(2, (n - 69) / 12);

  function envNote(t, f, dur, vol, type, dest, glideF) {
    if (!audio || !bus || !soundWanted()) return;
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = type || 'triangle';
    o.frequency.setValueAtTime(f, t);
    if (glideF) o.frequency.exponentialRampToValueAtTime(glideF, t + dur * .75);
    g.gain.setValueAtTime(.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(.025, dur * .2));
    g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(dest || bus.sfx);
    o.start(t); o.stop(t + dur + .03);
  }

  function uxSfx(kind) {
    unlockAudio();
    if (!audio || !soundWanted()) return;
    const t = audio.currentTime;
    if (kind === 'tap' || kind === 'page') {
      envNote(t, midi(76), .11, .13, 'sine');
    } else if (kind === 'slot_ok') {
      envNote(t, midi(72), .16, .16, 'triangle');
      envNote(t + .07, midi(79), .22, .16, 'sine');
    } else if (kind === 'structure_done') {
      [67, 72, 76, 79, 84].forEach((m, i) => envNote(t + i * .06, midi(m), .32, .15, 'triangle'));
    } else if (kind === 'mic_start') {
      envNote(t, midi(72), .12, .14, 'sine');
      envNote(t + .09, midi(84), .16, .14, 'sine');
    } else if (kind === 'mic_stop') {
      envNote(t, midi(84), .11, .13, 'sine');
      envNote(t + .08, midi(72), .18, .13, 'sine');
    } else if (kind === 'wrong') {
      envNote(t, midi(62), .15, .11, 'triangle', null, midi(58));
    } else if (kind === 'star' || kind === 'cheer') {
      [72, 76, 79, 84, 88].forEach((m, i) => envNote(t + i * .06, midi(m), .34, .15, 'sine'));
    } else if (kind === 'gliss') {
      [60, 62, 64, 65, 67, 69, 71, 72, 76, 79, 84].forEach((m, i) => envNote(t + i * .045, midi(m), .36, .14, 'triangle'));
    }
  }

  const THEMES = [
    { key: 60, tempo: .48, arp: [0, 4, 7, 12, 7, 4], bass: [0, 7, 5, 7], mel: [12, 16, 19, 16, 14, 12] },
    { key: 65, tempo: .46, arp: [0, 4, 7, 12, 9, 7], bass: [0, 5, 7, 5], mel: [12, 14, 16, 19, 16, 14] },
    { key: 62, tempo: .49, arp: [0, 4, 7, 11, 7, 4], bass: [0, 7, 2, 7], mel: [16, 14, 12, 14, 19, 16] },
    { key: 67, tempo: .45, arp: [0, 4, 7, 12, 16, 12], bass: [0, 7, 5, 7], mel: [19, 16, 14, 12, 14, 16] },
  ];

  let nextBeat = 0, stepN = 0;
  function audioTick() {
    if (!audio || !bus || !soundWanted()) return;
    if (audio.state !== 'running') return;
    const now = audio.currentTime;
    if (nextBeat < now - .5) nextBeat = now + .05;
    const th = THEMES[curLevel % THEMES.length];
    while (nextBeat < now + .22) {
      envNote(nextBeat, midi(th.key + th.arp[stepN % th.arp.length]), th.tempo * 1.4, .048, 'triangle', bus.music);
      if (stepN % 3 === 0) envNote(nextBeat, midi(th.key - 12 + th.bass[(stepN / 3) % th.bass.length | 0]), th.tempo * 2.2, .05, 'sine', bus.music);
      if (stepN % 2 === 0) envNote(nextBeat, midi(th.key + 12 + th.mel[((stepN / 2) | 0) % th.mel.length]), th.tempo * 1.6, .03, 'sine', bus.music);
      stepN++;
      nextBeat += th.tempo;
    }
  }

  function audioOnEvents(events) {
    for (const e of events || []) {
      if (e.type === 'load') { curLevel = e.index || 0; stepN = 0; }
      else if (e.type === 'slot_ok') uxSfx('slot_ok');
      else if (e.type === 'studio_ready') uxSfx('structure_done');
      else if (e.type === 'card_try') uxSfx('wrong');
      else if (e.type === 'recorded') uxSfx('gliss');
      else if (e.type === 'cheer') uxSfx('cheer');
    }
  }
