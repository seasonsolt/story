  /* Pure-Chinese voice queue: lazy mp3 clips, priorities, subtitles & ducking. No DOM access. */
  const voice = (() => {
    const FILE_WAIT = 2500, SILENT_MS = 350, CACHE_MAX = 24, QUEUE_MAX = 4, SLEEP_GRACE_MS = 1500;
    const bufs = new Map();
    const queue = [], listeners = [];
    let cur = null, seq = 0, subTimer = 0, uiTimer = 0, uiLast = { name: '', t: -1e9 };
    const warned = new Set();

    const lineDef = key => (typeof LINES === 'object' && LINES && LINES.lines && LINES.lines[key]) || null;
    const storyOpen = () => typeof story !== 'undefined' && !!story;
    const inPlay = () => typeof game === 'object' && game.state === 'play' && !storyOpen();
    function emitSub(payload) { for (const fn of listeners) { try { fn(payload); } catch (e) {} } }

    function load(file) {
      if (!audio) return Promise.resolve(null);
      let p = bufs.get(file);
      if (p) bufs.delete(file);
      else {
        p = fetch(assetURL(file)).then(r => r.ok ? r.arrayBuffer() : null).then(b => b && new Promise((ok, no) => audio.decodeAudioData(b, ok, no))).catch(() => null);
      }
      bufs.set(file, p);
      while (bufs.size > CACHE_MAX) bufs.delete(bufs.keys().next().value);
      return p;
    }

    function duck() {
      voiceOn = cur !== null;
      if (audio && bus) bus.music.gain.setTargetAtTime(musicLevel(), audio.currentTime, voiceOn ? .25 : .45);
    }

    function start(job) {
      cur = job;
      clearTimeout(subTimer);
      emitSub(job.sub && job.text ? { key: job.key, who: job.who, text: job.text, bubble: inPlay() } : null);
      duck();
      const go = buf => {
        if (cur !== job) return;
        if (!buf || !audio || !bus) { job.silent = true; job.timer = setTimeout(() => finish(job, false), SILENT_MS); return; }
        const src = audio.createBufferSource();
        src.buffer = buf; src.connect(bus.voice);
        src.onended = () => finish(job, true);
        job.src = src;
        src.start(audio.currentTime + .06);
        if (audio.state === 'suspended' || audio.state === 'interrupted') job.timer = setTimeout(() => finish(job, false), Math.ceil((buf.duration || 1) * 1000) + SLEEP_GRACE_MS);
      };
      if (job.file && audio) {
        let t = 0;
        Promise.race([load(job.file), new Promise(ok => { t = setTimeout(() => ok(null), FILE_WAIT); })]).then(b => { clearTimeout(t); go(b); });
      } else Promise.resolve().then(() => go(null));
    }

    function finish(job, completed = false) {
      if (cur !== job) return;
      cur = null;
      clearTimeout(job.timer);
      if (job.src) { job.src.onended = null; try { job.src.stop(); } catch (e) {} job.src = null; }
      pump();
      duck();
      if (!cur && job.sub && job.text) {
        if (job.silent) subTimer = setTimeout(() => emitSub(null), Math.max(1000, Math.min(7000, job.text.length * 190)));
        else emitSub(null);
      }
      job.resolve(!!completed);
    }

    function drop(job) { clearTimeout(job.expire); job.resolve(false); }
    function pump() { while (!cur && queue.length) { const j = queue.shift(); clearTimeout(j.expire); start(j); } }

    function submit(job) {
      if (job.tag === 'ui' && ((cur && cur.tag !== 'ui') || queue.some(j => j.tag !== 'ui'))) { job.resolve(false); return; }
      if (job.tag) for (let i = queue.length - 1; i >= 0; i--) if (queue[i].tag === job.tag) drop(queue.splice(i, 1)[0]);
      if (job.interrupt && (!cur || cur.prio <= job.prio)) {
        for (let i = queue.length - 1; i >= 0; i--) if (queue[i].prio <= job.prio) drop(queue.splice(i, 1)[0]);
        if (cur) finish(cur);
      }
      if (!cur && !queue.length) { start(job); return; }
      queue.push(job);
      queue.sort((a, b) => b.prio - a.prio || a.seq - b.seq);
      while (queue.length > QUEUE_MAX) drop(queue.pop());
      if (isFinite(job.maxWait)) job.expire = setTimeout(() => { const i = queue.indexOf(job); if (i >= 0) { queue.splice(i, 1); drop(job); } }, job.maxWait);
    }

    function line(key, opts) {
      const o = opts || {};
      return new Promise(resolve => {
        const def = lineDef(key);
        if (!def || !Array.isArray(def.say)) {
          if (!warned.has(key)) { warned.add(key); try { console.warn('voice.line missing:', key); } catch (e) {} }
          resolve(false); return;
        }
        const prio = o.priority != null ? o.priority : 1;
        submit({
          key, who: def.who || 'elsa', file: `vo_${key}.mp3`,
          text: def.say.join(' '), prio, interrupt: !!o.interrupt, tag: o.tag || '',
          seq: ++seq, maxWait: o.maxWait != null ? o.maxWait : (prio >= 2 ? Infinity : 4500),
          sub: o.subtitle !== false, silent: false, resolve,
        });
      });
    }

    function ui(name) {
      if (storyOpen()) { clearTimeout(uiTimer); return; }
      const now = performance.now();
      if (name === uiLast.name && now - uiLast.t < 420) { clearTimeout(uiTimer); return; }
      const run = () => { if (storyOpen()) return; uiLast = { name, t: performance.now() }; line('ui_' + name, { interrupt: true, priority: 0, tag: 'ui', maxWait: 600, subtitle: false }); };
      clearTimeout(uiTimer);
      const wait = uiLast.t + 420 - now;
      if (wait > 0) uiTimer = setTimeout(run, wait); else run();
    }

    function stop() {
      clearTimeout(uiTimer);
      while (queue.length) drop(queue.pop());
      if (cur) finish(cur);
      clearTimeout(subTimer);
      emitSub(null);
    }

    function suspend() { stop(); duck(); }

    function preload(keys) {
      if (!audio) return Promise.resolve();
      return (keys || []).reduce((p, k) => lineDef(k) ? p.then(() => load(`vo_${k}.mp3`)) : p, Promise.resolve()).then(() => {});
    }

    return {
      line, ui, stop, suspend, preload,
      get busy() { return cur !== null; },
      onSubtitle(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
    };
  })();
