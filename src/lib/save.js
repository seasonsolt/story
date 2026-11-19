  /* Save data: shape, sanitizing, version check and merge. Pure functions, no DOM, no storage. Plain global script. */
  const SETTING_CHECK = {
    subtitles: v => typeof v === 'boolean',
    sound: v => typeof v === 'boolean',
  };
  const SAVE_VERSION = 1;
  const SKILL_KEYS = ['sequence', 'sentence', 'classify', 'reason'];

  function defaultSave() {
    return {
      v: SAVE_VERSION,
      settings: { subtitles: true, sound: true },
      rooms: {},
      skills: { sequence: 0, sentence: 0, classify: 0, reason: 0 },
      freeSentences: 0,
      recordingsCount: 0,
      totalPlaySeconds: 0,
      unlocked: { rooms: 1 },
      flags: { prologue: false },
    };
  }
  const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const nat = (v, d) => (Number.isFinite(v) && v >= 0 ? Math.floor(v) : d);
  const bool3 = a => [0, 1, 2].map(i => !!(Array.isArray(a) && a[i]));

  function sanitizeSave(raw) {
    const s = defaultSave();
    if (!isObj(raw)) return s;
    for (const k of Object.keys(raw)) if (!(k in s) && k !== '__proto__') s[k] = raw[k];
    if (isObj(raw.settings)) for (const k of Object.keys(SETTING_CHECK)) if (SETTING_CHECK[k](raw.settings[k])) s.settings[k] = raw.settings[k];
    if (isObj(raw.rooms)) {
      for (const id of Object.keys(raw.rooms)) {
        const r = raw.rooms[id];
        if (!isObj(r)) continue;
        const stars = bool3(r.stars);
        s.rooms[id] = { cleared: !!r.cleared, recorded: !!r.recorded, stars };
      }
    }
    if (isObj(raw.skills)) {
      for (const sk of SKILL_KEYS) s.skills[sk] = nat(raw.skills[sk], 0);
    }
    s.freeSentences = nat(raw.freeSentences, 0);
    s.recordingsCount = nat(raw.recordingsCount, 0);
    s.totalPlaySeconds = nat(raw.totalPlaySeconds, 0);
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
      const r = mine.rooms[id] || (mine.rooms[id] = { cleared: false, recorded: false, stars: [false, false, false] });
      r.cleared = !!r.cleared || !!o.cleared;
      r.recorded = !!r.recorded || !!o.recorded;
      if (!Array.isArray(r.stars)) r.stars = [false, false, false];
      for (let i = 0; i < 3; i++) r.stars[i] = !!r.stars[i] || !!(o.stars && o.stars[i]);
      if (r.cleared) r.stars[0] = true;
      for (const k of Object.keys(o)) if (!(k in r)) r[k] = o[k];
    }
    if (!isObj(mine.skills)) mine.skills = { sequence: 0, sentence: 0, classify: 0, reason: 0 };
    for (const sk of SKILL_KEYS) mine.skills[sk] = Math.max(nat(mine.skills[sk], 0), nat(theirs.skills && theirs.skills[sk], 0));
    mine.freeSentences = Math.max(nat(mine.freeSentences, 0), nat(theirs.freeSentences, 0));
    mine.recordingsCount = Math.max(nat(mine.recordingsCount, 0), nat(theirs.recordingsCount, 0));
    mine.totalPlaySeconds = Math.max(nat(mine.totalPlaySeconds, 0), nat(theirs.totalPlaySeconds, 0));
    mine.unlocked.rooms = Math.max(1, nat(mine.unlocked.rooms, 1), nat(theirs.unlocked && theirs.unlocked.rooms, 1));
    for (const k of Object.keys(theirs.flags || {})) mine.flags[k] = !!mine.flags[k] || !!theirs.flags[k];
    for (const k of Object.keys(theirs)) if (!(k in mine) && k !== '__proto__') mine[k] = theirs[k];
    return mine;
  }
  function mergeSaves(a, b) { return mergeSaveInto(sanitizeSave(JSON.parse(JSON.stringify(a))), sanitizeSave(JSON.parse(JSON.stringify(b)))); }
