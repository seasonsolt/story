  /* 100% Local-only Tablet Voice Recorder + IndexedDB Store (zero network upload, iPadOS Safari + Chrome friendly). */
  const recorder = (() => {
    const DB_NAME = 'story_local_audio';
    const STORE = 'clips';
    const MAX_MS = 18000;
    const memStore = new Map();

    let rec = null;
    let stream = null;
    let ac = null;
    let analyser = null;
    let raf = 0;
    let maxTimer = 0;
    let startedAt = 0;
    let chunks = [];
    let activeAudio = null;
    let activeUrl = '';
    let active = false;

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

    async function saveClip(key, blob) {
      if (!key || !blob) return false;
      memStore.set(key, blob);
      const db = await openDb();
      if (!db) return true;
      return new Promise(resolve => {
        try {
          const tx = db.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).put(blob, key);
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => resolve(false);
        } catch (e) { resolve(false); }
      });
    }

    async function loadClip(key) {
      if (memStore.has(key)) return memStore.get(key);
      const db = await openDb();
      if (!db) return null;
      return new Promise(resolve => {
        try {
          const tx = db.transaction(STORE, 'readonly');
          const req = tx.objectStore(STORE).get(key);
          req.onsuccess = () => {
            const b = req.result || null;
            if (b) memStore.set(key, b);
            resolve(b);
          };
          req.onerror = () => resolve(null);
        } catch (e) { resolve(null); }
      });
    }

    async function listClipKeys() {
      const db = await openDb();
      if (!db) return [...memStore.keys()];
      return new Promise(resolve => {
        try {
          const tx = db.transaction(STORE, 'readonly');
          const req = tx.objectStore(STORE).getAllKeys();
          req.onsuccess = () => {
            const keys = new Set([...memStore.keys(), ...((req.result || []).map(String))]);
            resolve([...keys]);
          };
          req.onerror = () => resolve([...memStore.keys()]);
        } catch (e) { resolve([...memStore.keys()]); }
      });
    }

    function cleanupCapture() {
      cancelAnimationFrame(raf); raf = 0;
      clearTimeout(maxTimer); maxTimer = 0;
      if (stream) {
        try { stream.getTracks().forEach(t => t.stop()); } catch (e) {}
        stream = null;
      }
      if (ac) {
        try { ac.close(); } catch (e) {}
        ac = null;
      }
      analyser = null;
      active = false;
    }

    function stopPlay() {
      if (activeAudio) {
        try { activeAudio.pause(); activeAudio.onended = null; activeAudio.onerror = null; } catch (e) {}
        activeAudio = null;
      }
      if (activeUrl) {
        try { URL.revokeObjectURL(activeUrl); } catch (e) {}
        activeUrl = '';
      }
    }

    function play(blob, onEnd) {
      stopPlay();
      if (!blob || typeof Audio === 'undefined') {
        if (typeof onEnd === 'function') onEnd();
        return false;
      }
      try {
        activeUrl = URL.createObjectURL(blob);
        const au = new Audio(activeUrl);
        activeAudio = au;
        const done = () => {
          if (activeAudio === au) stopPlay();
          if (typeof onEnd === 'function') onEnd();
        };
        au.onended = done;
        au.onerror = done;
        const pr = au.play();
        if (pr && typeof pr.catch === 'function') pr.catch(done);
        return true;
      } catch (e) {
        stopPlay();
        if (typeof onEnd === 'function') onEnd();
        return false;
      }
    }

    async function start(onBars, onAutoStop) {
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
      rec.ondataavailable = e => { if (e && e.data && e.data.size > 0) chunks.push(e.data); };

      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC && typeof onBars === 'function') {
        try {
          ac = new AC();
          const src = ac.createMediaStreamSource(stream);
          analyser = ac.createAnalyser();
          analyser.fftSize = 32;
          src.connect(analyser);
          const bins = new Uint8Array(analyser.frequencyBinCount);
          const tick = () => {
            if (!active || !analyser) return;
            analyser.getByteFrequencyData(bins);
            const bars = [0, 1, 2, 3, 4, 5, 6].map(k => Math.max(.12, Math.min(1, (bins[k % bins.length] || 0) / 180)));
            onBars(bars);
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
      return new Promise(resolve => {
        const finish = () => {
          const outChunks = chunks.slice();
          chunks = [];
          rec = null;
          cleanupCapture();
          if (!outChunks.length) { resolve(null); return; }
          const blob = new Blob(outChunks, { type: mime });
          resolve({ blob, durationMs: dur });
        };
        if (r.state === 'inactive') { finish(); return; }
        r.onstop = finish;
        r.onerror = finish;
        try { r.stop(); } catch (e) { finish(); }
      });
    }

    return {
      pickMimeType, start, stop, play, stopPlay, saveClip, loadClip, listClipKeys,
      get recording() { return active; },
    };
  })();
