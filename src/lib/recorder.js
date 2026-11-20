  /* 100% Local-only Tablet Voice Recorder, Web Audio VAD, FX Premiere Playback, IndexedDB Store & Local WAV Export. */
  function encodeWavFromFloat32(samples, sampleRate) {
    const len = samples ? samples.length : 0;
    const sr = Math.max(8000, sampleRate | 0 || 24000);
    const buf = new ArrayBuffer(44 + len * 2);
    const v = new DataView(buf);
    const str = (off, s) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
    str(0, 'RIFF');
    v.setUint32(4, 36 + len * 2, true);
    str(8, 'WAVE');
    str(12, 'fmt ');
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, 1, true);
    v.setUint32(24, sr, true);
    v.setUint32(28, sr * 2, true);
    v.setUint16(32, 2, true);
    v.setUint16(34, 16, true);
    str(36, 'data');
    v.setUint32(40, len * 2, true);
    let offset = 44;
    for (let i = 0; i < len; i++) {
      const s = Math.max(-1, Math.min(1, samples[i] || 0));
      v.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
    return new Uint8Array(buf);
  }

  function computeRmsAndBars(freqBins, timeDomain) {
    const fLen = freqBins ? freqBins.length : 0;
    const bars = [0, 1, 2, 3, 4, 5, 6].map(k => {
      const v = fLen ? (freqBins[k % fLen] || 0) / 180 : 0;
      return Math.max(.12, Math.min(1, v));
    });
    let sumSq = 0;
    const tLen = timeDomain ? timeDomain.length : 0;
    if (tLen) {
      for (let i = 0; i < tLen; i++) {
        const d = (timeDomain[i] - 128) / 128;
        sumSq += d * d;
      }
    }
    const rms = tLen ? Math.sqrt(sumSq / tLen) : 0;
    const energy = Math.max(0, Math.min(1, rms * 3.8));
    return { bars, energy, rms };
  }

  const recorder = (() => {
    const DB_NAME = 'story_local_audio';
    const STORE = 'clips';
    const META_PREFIX = 'meta_';
    const MAX_MS = 25000;
    const SPEECH_ON = 0.08;
    const SPEECH_OFF = 0.05;
    const memStore = new Map();
    const memMeta = new Map();

    let rec = null;
    let stream = null;
    let recAc = null;
    let analyser = null;
    let raf = 0;
    let maxTimer = 0;
    let startedAt = 0;
    let chunks = [];
    let active = false;
    let lastVad = { activeSpeechMs: 0, peakEnergy: 0, speechBursts: 0 };

    let playAc = null;
    let playSrc = null;
    let playRaf = 0;
    let playEndTimer = 0;
    let activeAudio = null;
    let activeUrl = '';

    function pickMimeType() {
      if (typeof MediaRecorder === 'undefined') return '';
      if (typeof MediaRecorder.isTypeSupported !== 'function') return '';
      for (const m of ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm']) {
        try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (e) {}
      }
      return '';
    }

    function openDb() {
      return new Promise(resolve => {
        if (typeof indexedDB === 'undefined') { resolve(null); return; }
        try {
          const req = indexedDB.open(DB_NAME, 1);
          req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch (e) { resolve(null); }
      });
    }

    async function idbPut(k, val) {
      const db = await openDb();
      if (!db) return true;
      return new Promise(resolve => {
        try {
          const tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).put(val, k);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (e) { resolve(false); }
      });
    }

    async function idbGet(k) {
      const db = await openDb();
      if (!db) return null;
      return new Promise(resolve => {
        try {
          const tx = db.transaction(STORE, 'readonly');
          const req = tx.objectStore(STORE).get(k);
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        } catch (e) { resolve(null); }
      });
    }

    async function idbDel(k) {
      const db = await openDb();
      if (!db) return true;
      return new Promise(resolve => {
        try {
          const tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).delete(k);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (e) { resolve(false); }
      });
    }

    async function saveClip(key, blob) {
      if (!key || !blob) return false;
      memStore.set(key, blob);
      return idbPut(key, blob);
    }

    async function loadClip(key) {
      if (memStore.has(key)) return memStore.get(key);
      const b = await idbGet(key);
      if (b) memStore.set(key, b);
      return b;
    }

    async function saveMeta(key, meta) {
      if (!key || !meta) return false;
      memMeta.set(key, meta);
      return idbPut(META_PREFIX + key, JSON.stringify(meta));
    }

    async function loadMeta(key) {
      if (memMeta.has(key)) return memMeta.get(key);
      const raw = await idbGet(META_PREFIX + key);
      if (!raw) return null;
      try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (parsed && typeof parsed === 'object') { memMeta.set(key, parsed); return parsed; }
      } catch (e) {}
      return null;
    }

    async function deleteClip(key) {
      if (!key) return false;
      memStore.delete(key);
      memMeta.delete(key);
      await idbDel(key);
      await idbDel(META_PREFIX + key);
      return true;
    }

    async function listClipKeys() {
      const db = await openDb();
      if (!db) return [...memStore.keys()].filter(k => !k.startsWith(META_PREFIX));
      return new Promise(resolve => {
        try {
          const tx = db.transaction(STORE, 'readonly');
          const req = tx.objectStore(STORE).getAllKeys();
          req.onsuccess = () => {
            const keys = new Set([...memStore.keys(), ...((req.result || []).map(String))]);
            resolve([...keys].filter(k => !k.startsWith(META_PREFIX)));
          };
          req.onerror = () => resolve([...memStore.keys()].filter(k => !k.startsWith(META_PREFIX)));
        } catch (e) { resolve([...memStore.keys()].filter(k => !k.startsWith(META_PREFIX))); }
      });
    }

    function cleanupCapture() {
      cancelAnimationFrame(raf); raf = 0;
      clearTimeout(maxTimer); maxTimer = 0;
      if (stream) {
        try { stream.getTracks().forEach(t => t.stop()); } catch (e) {}
        stream = null;
      }
      if (recAc) {
        try { recAc.close(); } catch (e) {}
        recAc = null;
      }
      analyser = null;
      active = false;
    }

    function stopPlay() {
      cancelAnimationFrame(playRaf); playRaf = 0;
      clearTimeout(playEndTimer); playEndTimer = 0;
      if (playSrc) {
        try { playSrc.onended = null; playSrc.stop(); } catch (e) {}
        playSrc = null;
      }
      if (playAc) {
        try { playAc.close(); } catch (e) {}
        playAc = null;
      }
      if (activeAudio) {
        try { activeAudio.pause(); activeAudio.onended = null; activeAudio.onerror = null; } catch (e) {}
        activeAudio = null;
      }
      if (activeUrl) {
        try { URL.revokeObjectURL(activeUrl); } catch (e) {}
        activeUrl = '';
      }
    }

    function driveTimeline(timeline, startPerf, rate, onCard, lastIdxRef) {
      if (!Array.isArray(timeline) || !timeline.length || typeof onCard !== 'function') return;
      const elapsedAudioMs = (performance.now() - startPerf) * rate;
      let curIdx = timeline[0].cardIdx;
      for (const item of timeline) {
        if (elapsedAudioMs >= item.ms) curIdx = item.cardIdx;
        else break;
      }
      if (curIdx !== lastIdxRef.value) {
        lastIdxRef.value = curIdx;
        onCard(curIdx);
      }
    }

    async function playWebAudio(blob, onEnd, opts) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC || typeof blob.arrayBuffer !== 'function') return false;
      const myAc = new AC();
      playAc = myAc;
      try {
        if (myAc.state === 'suspended') await myAc.resume().catch(() => {});
        const rawBuf = await blob.arrayBuffer();
        const audioBuf = await new Promise((ok, no) => myAc.decodeAudioData(rawBuf, ok, no));
        if (playAc !== myAc) return true;

        const src = myAc.createBufferSource();
        src.buffer = audioBuf;
        const fx = opts.fx || 'normal';
        const rate = fx === 'olaf' ? 1.22 : 1.0;
        src.playbackRate.value = rate;

        const outAnalyser = myAc.createAnalyser();
        outAnalyser.fftSize = 64;
        const master = myAc.createGain();
        master.gain.value = 1.0;
        outAnalyser.connect(master);
        master.connect(myAc.destination);

        if (fx === 'hall') {
          const dry = myAc.createGain(); dry.gain.value = 0.88;
          const wet = myAc.createGain(); wet.gain.value = 0.34;
          const delay = myAc.createDelay(0.5); delay.delayTime.value = 0.16;
          const lp = myAc.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600;
          const fb = myAc.createGain(); fb.gain.value = 0.26;
          src.connect(dry); dry.connect(outAnalyser);
          src.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay);
          lp.connect(wet); wet.connect(outAnalyser);
        } else if (fx === 'olaf') {
          const shelf = myAc.createBiquadFilter();
          shelf.type = 'highshelf';
          shelf.frequency.value = 2400;
          shelf.gain.value = 3.5;
          src.connect(shelf);
          shelf.connect(outAnalyser);
        } else {
          src.connect(outAnalyser);
        }

        const fBins = new Uint8Array(outAnalyser.frequencyBinCount);
        const tBins = new Uint8Array(outAnalyser.fftSize);
        const timeline = Array.isArray(opts.timeline) ? opts.timeline : [];
        const startPerf = performance.now();
        const lastIdxRef = { value: -1 };
        let finished = false;
        const finish = () => {
          if (finished) return;
          finished = true;
          if (playAc === myAc) stopPlay();
          if (typeof opts.onBars === 'function') opts.onBars(null);
          if (typeof opts.onEnergy === 'function') opts.onEnergy(0);
          if (typeof opts.onCard === 'function') opts.onCard(-1);
          if (typeof onEnd === 'function') onEnd();
        };

        src.onended = finish;
        const tailMs = fx === 'hall' ? 420 : 40;
        const totalMs = Math.ceil((audioBuf.duration / rate) * 1000) + tailMs;
        playEndTimer = setTimeout(finish, totalMs);
        playSrc = src;
        src.start(0);

        const tick = () => {
          if (playAc !== myAc || finished) return;
          outAnalyser.getByteFrequencyData(fBins);
          outAnalyser.getByteTimeDomainData(tBins);
          const { bars, energy } = computeRmsAndBars(fBins, tBins);
          if (typeof opts.onBars === 'function') opts.onBars(bars);
          if (typeof opts.onEnergy === 'function') opts.onEnergy(energy);
          driveTimeline(timeline, startPerf, rate, opts.onCard, lastIdxRef);
          playRaf = requestAnimationFrame(tick);
        };
        tick();
        return true;
      } catch (e) {
        if (playAc === myAc) stopPlay();
        return false;
      }
    }

    function play(blob, onEnd, opts) {
      stopPlay();
      const o = opts || {};
      if (!blob) {
        if (typeof onEnd === 'function') onEnd();
        return false;
      }
      if (typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext) && typeof blob.arrayBuffer === 'function') {
        playWebAudio(blob, onEnd, o).then(ok => {
          if (!ok && typeof Audio !== 'undefined') playElementFallback(blob, onEnd, o);
          else if (!ok && typeof onEnd === 'function') onEnd();
        });
        return true;
      }
      return playElementFallback(blob, onEnd, o);
    }

    function playElementFallback(blob, onEnd, o) {
      if (!blob || typeof Audio === 'undefined') {
        if (typeof onEnd === 'function') onEnd();
        return false;
      }
      try {
        activeUrl = URL.createObjectURL(blob);
        const au = new Audio(activeUrl);
        const rate = o.fx === 'olaf' ? 1.22 : 1.0;
        au.playbackRate = rate;
        activeAudio = au;
        const timeline = Array.isArray(o.timeline) ? o.timeline : [];
        const startPerf = performance.now();
        const lastIdxRef = { value: -1 };
        const done = () => {
          if (activeAudio === au) stopPlay();
          if (typeof o.onBars === 'function') o.onBars(null);
          if (typeof o.onEnergy === 'function') o.onEnergy(0);
          if (typeof o.onCard === 'function') o.onCard(-1);
          if (typeof onEnd === 'function') onEnd();
        };
        const tick = () => {
          if (activeAudio !== au) return;
          driveTimeline(timeline, startPerf, rate, o.onCard, lastIdxRef);
          playRaf = requestAnimationFrame(tick);
        };
        au.onended = done;
        au.onerror = done;
        const pr = au.play();
        if (pr && typeof pr.then === 'function') pr.then(tick, done);
        else tick();
        return true;
      } catch (e) {
        stopPlay();
        if (typeof onEnd === 'function') onEnd();
        return false;
      }
    }

    async function exportWav(blob, filename) {
      if (!blob || typeof document === 'undefined') return false;
      const base = (filename || 'story_voice').replace(/\.(wav|mp3|webm|m4a)$/i, '');
      const AC = window.AudioContext || window.webkitAudioContext;
      let outBlob = blob;
      let ext = '.webm';
      if (AC && typeof blob.arrayBuffer === 'function') {
        let exAc = null;
        try {
          exAc = new AC();
          const rawBuf = await blob.arrayBuffer();
          const decoded = await new Promise((ok, no) => exAc.decodeAudioData(rawBuf, ok, no));
          const len = decoded.length;
          const nCh = decoded.numberOfChannels || 1;
          const mono = new Float32Array(len);
          for (let ch = 0; ch < nCh; ch++) {
            const data = decoded.getChannelData(ch);
            for (let i = 0; i < len; i++) mono[i] += data[i] / nCh;
          }
          const wavBytes = encodeWavFromFloat32(mono, decoded.sampleRate);
          outBlob = new Blob([wavBytes], { type: 'audio/wav' });
          ext = '.wav';
        } catch (e) {
          ext = (blob.type || '').includes('mp4') ? '.m4a' : '.webm';
        } finally {
          if (exAc) try { exAc.close(); } catch (e2) {}
        }
      }
      const url = URL.createObjectURL(outBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = base + ext;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => { try { URL.revokeObjectURL(url); } catch (e) {} }, 2000);
      return true;
    }

    async function start(onFrame, onAutoStop) {
      stopPlay();
      if (active) await stop();
      if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
        return { ok: false, reason: 'unsupported' };
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (e) {
        return { ok: false, reason: 'denied' };
      }
      const mime = pickMimeType();
      try {
        rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      } catch (e) {
        try { rec = new MediaRecorder(stream); } catch (e2) { cleanupCapture(); return { ok: false, reason: 'unsupported' }; }
      }
      chunks = [];
      startedAt = Date.now();
      active = true;
      lastVad = { activeSpeechMs: 0, peakEnergy: 0, speechBursts: 0 };
      rec.ondataavailable = e => { if (e && e.data && e.data.size > 0) chunks.push(e.data); };

      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        try {
          recAc = new AC();
          const src = recAc.createMediaStreamSource(stream);
          analyser = recAc.createAnalyser();
          analyser.fftSize = 64;
          src.connect(analyser);
          const bins = new Uint8Array(analyser.frequencyBinCount);
          const tBins = new Uint8Array(analyser.fftSize);
          let prevAt = performance.now();
          let inSpeech = false;
          let lastVoiceAt = 0;
          const tick = () => {
            if (!active || !analyser) return;
            const now = performance.now();
            const dtMs = Math.max(0, Math.min(120, now - prevAt));
            prevAt = now;
            analyser.getByteFrequencyData(bins);
            analyser.getByteTimeDomainData(tBins);
            const { bars, energy } = computeRmsAndBars(bins, tBins);
            if (!inSpeech && energy >= SPEECH_ON) { inSpeech = true; lastVad.speechBursts++; }
            else if (inSpeech && energy < SPEECH_OFF) { inSpeech = false; }
            if (inSpeech) {
              lastVad.activeSpeechMs += dtMs;
              lastVoiceAt = now;
            }
            if (energy > lastVad.peakEnergy) lastVad.peakEnergy = energy;
            const silenceAfterSpeechMs = inSpeech ? 0 : (lastVoiceAt > 0 ? now - lastVoiceAt : 0);
            if (typeof onFrame === 'function') {
              onFrame({
                bars, energy,
                vad: {
                  activeSpeechMs: Math.round(lastVad.activeSpeechMs),
                  peakEnergy: lastVad.peakEnergy,
                  speechBursts: lastVad.speechBursts,
                  inSpeech,
                  silenceAfterSpeechMs: Math.round(silenceAfterSpeechMs),
                },
                elapsedMs: Date.now() - startedAt,
              });
            }
            raf = requestAnimationFrame(tick);
          };
          tick();
        } catch (e) { analyser = null; }
      }

      try {
        rec.start(120);
      } catch (e) {
        cleanupCapture();
        return { ok: false, reason: 'start_failed' };
      }
      maxTimer = setTimeout(() => {
        if (active && typeof onAutoStop === 'function') onAutoStop();
      }, MAX_MS);
      return { ok: true };
    }

    function stop() {
      if (!active || !rec) {
        cleanupCapture();
        return Promise.resolve(null);
      }
      const r = rec;
      const mime = r.mimeType || pickMimeType() || 'audio/webm';
      const dur = Math.max(0, Date.now() - startedAt);
      const vadOut = {
        activeSpeechMs: Math.round(lastVad.activeSpeechMs),
        peakEnergy: Number(lastVad.peakEnergy.toFixed(3)),
        speechBursts: lastVad.speechBursts,
      };
      return new Promise(resolve => {
        const finish = () => {
          const outChunks = chunks.slice();
          chunks = [];
          rec = null;
          cleanupCapture();
          if (!outChunks.length) { resolve(null); return; }
          const blob = new Blob(outChunks, { type: mime });
          resolve({ blob, durationMs: dur, ...vadOut });
        };
        if (r.state === 'inactive') { finish(); return; }
        r.onstop = finish;
        r.onerror = finish;
        try { r.stop(); } catch (e) { finish(); }
      });
    }

    return {
      pickMimeType, start, stop, play, stopPlay, saveClip, loadClip, saveMeta, loadMeta, deleteClip, listClipKeys, exportWav,
      get recording() { return active; },
    };
  })();
