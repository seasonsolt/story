  /* Save data: shape, sanitizing, version check and merge. Pure functions, no DOM, no storage. Plain global script. */
  const SETTING_CHECK = {
    subtitles: v => typeof v === 'boolean',
    sound: v => typeof v === 'boolean',
    eyeCare: v => typeof v === 'boolean',
  };
  const SAVE_VERSION = 1;
  const SKILL_KEYS = ['sequence', 'sentence', 'classify', 'reason', 'twist', 'episode'];
  const TIER_KEYS = ['cloze', 'director', 'anchor'];
  const PORTFOLIO_MAX = 30;

  function emptySkills() {
    const out = {};
    for (const sk of SKILL_KEYS) out[sk] = 0;
    return out;
  }

  function defaultSave() {
    return {
      v: SAVE_VERSION,
      settings: { subtitles: false, sound: true, eyeCare: true },
      rooms: {},
      skills: emptySkills(),
      studioTier: 'director',
      freeSentences: 0,
      recordingsCount: 0,
      speechSamples: 0,
      totalSpeechMs: 0,
      totalPlaySeconds: 0,
      creations: [],
      diary: [],
      unlocked: { rooms: 1 },
      flags: { prologue: false },
    };
  }
  const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const nat = (v, d) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : d);
  const bool3 = a => [0, 1, 2].map(i => !!(Array.isArray(a) && a[i]));

  function sanitizeTimeline(raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    for (const item of raw) {
      if (!isObj(item)) continue;
      out.push({ cardIdx: nat(item.cardIdx, 0), ms: nat(item.ms, 0) });
      if (out.length >= 24) break;
    }
    return out;
  }

  function sanitizeCreations(raw) {
    if (!Array.isArray(raw)) return [];
    const seen = new Set();
    const out = [];
    for (const item of raw) {
      if (!isObj(item) || typeof item.id !== 'string' || !item.id || seen.has(item.id)) continue;
      seen.add(item.id);
      const cards = Array.isArray(item.cards) ? item.cards.filter(c => typeof c === 'string' && c).slice(0, 5) : [];
      out.push({
        id: item.id,
        mode: item.mode === 'mountain' ? 'mountain' : 'train',
        cards,
        createdAt: nat(item.createdAt, 0),
        durationMs: nat(item.durationMs, 0),
        activeSpeechMs: nat(item.activeSpeechMs, 0),
        timeline: sanitizeTimeline(item.timeline),
      });
    }
    out.sort((a, b) => b.createdAt - a.createdAt);
    return out.slice(0, PORTFOLIO_MAX);
  }

  function sanitizeDiary(raw) {
    if (!Array.isArray(raw)) return [];
    const seen = new Set();
    const out = [];
    for (const item of raw) {
      if (!isObj(item) || typeof item.id !== 'string' || !item.id || seen.has(item.id)) continue;
      seen.add(item.id);
      out.push({
        id: item.id,
        topicId: typeof item.topicId === 'string' ? item.topicId : 'play',
        createdAt: nat(item.createdAt, 0),
        durationMs: nat(item.durationMs, 0),
        activeSpeechMs: nat(item.activeSpeechMs, 0),
      });
    }
    out.sort((a, b) => b.createdAt - a.createdAt);
    return out.slice(0, PORTFOLIO_MAX);
  }

  function sanitizeSave(raw) {
    const s = defaultSave();
    if (!isObj(raw)) return s;
    for (const k of Object.keys(raw)) if (!(k in s) && k !== '__proto__') s[k] = raw[k];
    if (isObj(raw.settings)) for (const k of Object.keys(SETTING_CHECK)) if (SETTING_CHECK[k](raw.settings[k])) s.settings[k] = raw.settings[k];
    if (TIER_KEYS.includes(raw.studioTier)) s.studioTier = raw.studioTier;
    if (isObj(raw.rooms)) {
      for (const id of Object.keys(raw.rooms)) {
        const r = raw.rooms[id];
        if (!isObj(r)) continue;
        const stars = bool3(r.stars);
        const rec = { cleared: !!r.cleared, recorded: !!r.recorded, stars, tier3: !!r.tier3 };
        if (Number.isFinite(r.firstSpeechMs) && r.firstSpeechMs >= 0) rec.firstSpeechMs = Math.floor(r.firstSpeechMs);
        if (Number.isFinite(r.lastSpeechMs) && r.lastSpeechMs >= 0) rec.lastSpeechMs = Math.floor(r.lastSpeechMs);
        if (Number.isFinite(r.recCount) && r.recCount >= 0) rec.recCount = Math.floor(r.recCount);
        s.rooms[id] = rec;
      }
    }
    if (isObj(raw.skills)) {
      for (const sk of SKILL_KEYS) s.skills[sk] = nat(raw.skills[sk], 0);
    }
    s.freeSentences = nat(raw.freeSentences, 0);
    s.recordingsCount = nat(raw.recordingsCount, 0);
    s.speechSamples = nat(raw.speechSamples, 0);
    s.totalSpeechMs = nat(raw.totalSpeechMs, 0);
    s.totalPlaySeconds = nat(raw.totalPlaySeconds, 0);
    s.creations = sanitizeCreations(raw.creations);
    s.diary = sanitizeDiary(raw.diary);
    if (isObj(raw.unlocked)) s.unlocked.rooms = Math.max(1, nat(raw.unlocked.rooms, 1));
    if (isObj(raw.flags)) for (const k of Object.keys(s.flags)) s.flags[k] = !!raw.flags[k];
    return s;
  }

  function saveVersionTooNew(raw) { return isObj(raw) && Number.isFinite(raw.v) && raw.v > SAVE_VERSION; }
  function storedSaveIsNewer(text) {
    if (!text) return false;
    try { return saveVersionTooNew(JSON.parse(text)); } catch (e) { return false; }
  }

  function mergeSaveInto(mine, theirs) {
    if (!isObj(mine) || !isObj(theirs)) return mine;
    for (const id of Object.keys(theirs.rooms || {})) {
      const o = theirs.rooms[id];
      const r = mine.rooms[id] || (mine.rooms[id] = { cleared: false, recorded: false, stars: [false, false, false], tier3: false });
      r.cleared = !!r.cleared || !!o.cleared;
      r.recorded = !!r.recorded || !!o.recorded;
      r.tier3 = !!r.tier3 || !!o.tier3;
      if (!Array.isArray(r.stars)) r.stars = [false, false, false];
      for (let i = 0; i < 3; i++) r.stars[i] = !!r.stars[i] || !!(o.stars && o.stars[i]);
      if (r.cleared) r.stars[0] = true;
      if (Number.isFinite(o.firstSpeechMs) && !Number.isFinite(r.firstSpeechMs)) r.firstSpeechMs = Math.floor(o.firstSpeechMs);
      if (Number.isFinite(o.lastSpeechMs)) r.lastSpeechMs = Math.max(nat(r.lastSpeechMs, 0), Math.floor(o.lastSpeechMs));
      if (Number.isFinite(o.recCount)) r.recCount = Math.max(nat(r.recCount, 0), Math.floor(o.recCount));
      for (const k of Object.keys(o)) if (!(k in r)) r[k] = o[k];
    }
    if (!isObj(mine.skills)) mine.skills = emptySkills();
    for (const sk of SKILL_KEYS) mine.skills[sk] = Math.max(nat(mine.skills[sk], 0), nat(theirs.skills && theirs.skills[sk], 0));
    mine.freeSentences = Math.max(nat(mine.freeSentences, 0), nat(theirs.freeSentences, 0));
    mine.recordingsCount = Math.max(nat(mine.recordingsCount, 0), nat(theirs.recordingsCount, 0));
    mine.speechSamples = Math.max(nat(mine.speechSamples, 0), nat(theirs.speechSamples, 0));
    mine.totalSpeechMs = Math.max(nat(mine.totalSpeechMs, 0), nat(theirs.totalSpeechMs, 0));
    mine.totalPlaySeconds = Math.max(nat(mine.totalPlaySeconds, 0), nat(theirs.totalPlaySeconds, 0));
    mine.creations = sanitizeCreations([...(mine.creations || []), ...(theirs.creations || [])]);
    mine.diary = sanitizeDiary([...(mine.diary || []), ...(theirs.diary || [])]);
    mine.unlocked.rooms = Math.max(1, nat(mine.unlocked.rooms, 1), nat(theirs.unlocked && theirs.unlocked.rooms, 1));
    for (const k of Object.keys(theirs.flags || {})) mine.flags[k] = !!mine.flags[k] || !!theirs.flags[k];
    for (const k of Object.keys(theirs)) if (!(k in mine) && k !== '__proto__') mine[k] = theirs[k];
    return mine;
  }
  function mergeSaves(a, b) { return mergeSaveInto(sanitizeSave(JSON.parse(JSON.stringify(a))), sanitizeSave(JSON.parse(JSON.stringify(b)))); }
