  /* Core DOM, save persistence, HD/SD art loader, lines bundle & drifting winter snow. */
  const NS = 'http://www.w3.org/2000/svg';
  const $ = id => document.getElementById(id);
  const DEV = /[?&]dev=1\b/.test(location.search);

  const SAVE_KEY = 'story.save';
  function lsRead(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } }
  function lsWrite(key, text) { try { window.localStorage.setItem(key, text); return true; } catch (e) { return false; } }

  function loadSave() {
    let raw = null;
    try { const t = lsRead(SAVE_KEY); if (t) raw = JSON.parse(t); } catch (e) { raw = null; }
    return sanitizeSave(raw);
  }

  const save = loadSave();
  let saveTimer = 0;
  function saveWrite() {
    clearTimeout(saveTimer); saveTimer = 0;
    if (storedSaveIsNewer(lsRead(SAVE_KEY))) return false;
    try { return lsWrite(SAVE_KEY, JSON.stringify(save)); } catch (e) { return false; }
  }
  function saveSoon() { if (!saveTimer) saveTimer = setTimeout(saveWrite, 400); }
  addEventListener('pagehide', () => { if (saveTimer) saveWrite(); });
  addEventListener('storage', e => {
    if (!e || e.key !== SAVE_KEY || !e.newValue) return;
    let raw;
    try { raw = JSON.parse(e.newValue); } catch (err) { return; }
    if (!isObj(raw) || saveVersionTooNew(raw)) return;
    const before = JSON.stringify(save);
    mergeSaveInto(save, sanitizeSave(raw));
    if (JSON.stringify(save) !== before) saveWrite();
  });

  function setting(key) {
    const v = save.settings[key];
    return SETTING_CHECK[key] && SETTING_CHECK[key](v) ? v : defaultSave().settings[key];
  }
  function setSetting(key, value) {
    if (!SETTING_CHECK[key] || !SETTING_CHECK[key](value)) return false;
    save.settings[key] = value;
    saveWrite();
    try { onSettingChanged(key, value); } catch (e) { console.error(e); }
    return true;
  }

  const roomIndex = id => LEVELS.findIndex(lv => lv.id === id);
  function markRoom(levelId, patch) {
    const r = save.rooms[levelId] || (save.rooms[levelId] = { cleared: false, recorded: false, stars: [false, false, false] });
    const p = patch || {};
    if (p.cleared) r.cleared = true;
    if (p.recorded) r.recorded = true;
    if (Array.isArray(p.stars)) for (let i = 0; i < 3; i++) if (p.stars[i]) r.stars[i] = true;
    if (r.cleared) r.stars[0] = true;
    if (r.recorded) r.stars[2] = true;
    if (r.cleared) {
      const i = roomIndex(levelId);
      if (i >= 0) save.unlocked.rooms = Math.max(save.unlocked.rooms, Math.min(LEVELS.length, i + 2));
    }
    saveWrite();
    return r;
  }
  const unlockedRooms = () => Math.max(1, Math.min(LEVELS.length, save.unlocked.rooms));
  function nextRoomIndex() {
    const n = unlockedRooms();
    for (let i = 0; i < n; i++) if (!(save.rooms[LEVELS[i].id] || {}).cleared) return i;
    return n - 1;
  }

  const game = createGame();
  const SIZES = /*SIZES*/{};
  const ASSET_VERSION = /*ASSET_VERSION*/'dev';
  const assetURL = file => `game/${file}?v=${ASSET_VERSION}`;

  const HD_NAMES = new Set(/*HD*/[]);
  const HD_FROM = 1700;
  const hd = { on: false, ready: new Set(), asked: new Set(), live: new Set(), timer: 0 };
  const ART_PATIENCE = 1500;
  const artJobs = new Map();
  const artWait = new Set();
  const artLive = new Set();

  function hdWant(n) {
    if (!hd.on || !HD_NAMES.has(n) || hd.asked.has(n) || artWait.has(n)) return;
    hd.asked.add(n);
    const im = new Image();
    hd.live.add(im);
    im.onload = () => { hd.live.delete(im); hd.ready.add(n); hdUpgradeSoon(); };
    im.onerror = () => { hd.live.delete(im); hd.asked.delete(n); };
    im.src = assetURL(`hd/${n}.webp`);
  }
  const SRC = n => {
    hdWant(n);
    const useHd = hd.ready.has(n) || (artWait.has(n) && hd.asked.has(n));
    return assetURL(`${useHd ? 'hd/' : ''}${n}.webp`);
  };
  function hdDowngrade(name) {
    for (const node of document.querySelectorAll('image, img')) {
      const attr = node.tagName === 'IMG' ? 'src' : 'href';
      if ((node.getAttribute(attr) || '').startsWith(`game/hd/${name}.webp`)) node.setAttribute(attr, assetURL(`${name}.webp`));
    }
  }
  function hdUpgrade() {
    hd.timer = 0;
    for (const node of document.querySelectorAll('image, img')) {
      const attr = node.tagName === 'IMG' ? 'src' : 'href';
      const m = /^game\/([\w-]+)\.webp\?/.exec(node.getAttribute(attr) || '');
      if (m && hd.ready.has(m[1])) node.setAttribute(attr, assetURL(`hd/${m[1]}.webp`));
      else if (m) hdWant(m[1]);
    }
  }
  function hdUpgradeSoon() { if (!hd.timer) hd.timer = setTimeout(hdUpgrade, 120); }
  function hdFit(cssWidth) {
    if (hd.on || !HD_NAMES.size || cssWidth * (window.devicePixelRatio || 1) <= HD_FROM) return;
    hd.on = true;
    hdUpgrade();
  }

  function loadArt(names, patience) {
    const jobs = [];
    for (const n of names || []) {
      let p = artJobs.get(n);
      if (!p) {
        const wantHd = hd.on && HD_NAMES.has(n) && !hd.ready.has(n) && (typeof navigator === 'undefined' || navigator.onLine !== false);
        const im = new Image();
        artWait.add(n); artLive.add(im);
        if (wantHd) hd.asked.add(n);
        im.src = assetURL(`${wantHd ? 'hd/' : ''}${n}.webp`);
        const finishOk = usedHd => {
          artWait.delete(n); artLive.delete(im);
          if (usedHd) { hd.ready.add(n); hdUpgradeSoon(); }
        };
        const finishFail = () => {
          artWait.delete(n); artLive.delete(im); artJobs.delete(n);
        };
        p = im.decode().then(() => finishOk(wantHd), () => {
          if (!wantHd) { finishFail(); return; }
          hd.asked.delete(n);
          hdDowngrade(n);
          const sd = new Image();
          artLive.add(sd);
          sd.src = assetURL(`${n}.webp`);
          return sd.decode().then(() => { artLive.delete(sd); finishOk(false); }, () => { artLive.delete(sd); finishFail(); });
        });
        artJobs.set(n, p);
      }
      jobs.push(p);
    }
    const all = Promise.all(jobs).then(() => {});
    return patience > 0 ? Promise.race([all, new Promise(ok => setTimeout(ok, patience))]) : all;
  }

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  const img = (name, x, y, w, h, parent, extra) => el('image', Object.assign({ href: SRC(name), x, y, width: w, height: h, preserveAspectRatio: 'none' }, extra), parent);

  /** @type {{ lines?: Record<string, any> }} */
  const LINES = /*LINES*/{};
  const lineOf = key => (LINES.lines && LINES.lines[key]) || null;
  const hasLineKey = key => !!lineOf(key);

  const wrap = (text, n) => {
    const out = [];
    let line = '';
    for (const ch of text) {
      if (line.length >= n && !'，。、！？：；」…—'.includes(ch)) { out.push(line); line = ''; }
      line += ch;
    }
    if (line) out.push(line);
    return out;
  };

  function fillSnow(box, n, big) {
    if (!box) return;
    for (let i = 0; i < n; i++) {
      el('circle', {
        class: 'snow', cx: Math.random() * 960, cy: 0,
        r: big ? 2.2 + Math.random() * 2.2 : 1.1 + Math.random() * 1.4,
        fill: i % 3 ? '#ffffff' : '#c6eeff', opacity: big ? .5 : .42,
        style: `animation-duration:${(big ? 6 : 9) + Math.random() * 6}s;animation-delay:-${Math.random() * 12}s`,
      }, box);
    }
  }
  fillSnow($('snowBack'), 24, false);
  fillSnow($('snowFront'), 10, true);
