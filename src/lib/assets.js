  /* Asset loading plan and Service Worker eligibility gate. Plain global script: no DOM access. */
  /*TITLE_ART*/const ART_TITLE = [
    "key.webp", "bg_palace.webp", "bg_cozy.webp", "bg_garden.webp",
    "elsa_idle.webp", "elsa_speak.webp", "elsa_cheer.webp", "portrait_elsa.webp",
    "anna_idle.webp", "anna_speak.webp", "anna_cheer.webp", "portrait_anna.webp",
    "olaf_idle.webp", "olaf_speak.webp", "olaf_cheer.webp", "portrait_olaf.webp",
    "prop_mic.webp", "prop_star.webp"
  ];/*END_TITLE_ART*/

  function roomArt(level, extraCards) {
    const out = [], add = n => { if (n && !out.includes(n)) out.push(n); };
    if (level) {
      add(level.bg);
      add(level.coverCard);
      for (const c of level.choices || []) add(c);
      for (const row of level.steps || []) for (const c of row || []) add(c);
      for (const p of level.puzzles || []) {
        add(p.promptCard);
        for (const c of p.pickChoices || []) add(c);
        for (const c of p.whyChoices || []) add(c);
      }
      for (const c of level.target || []) add(c);
    }
    for (const c of extraCards || []) add(c);
    add('prop_mic'); add('prop_star');
    return out;
  }

  function assetPlan(levels) {
    return {
      title: ART_TITLE.map(f => f.replace(/\.webp$/, '')),
      rooms: (levels || []).map(lv => roomArt(lv)),
    };
  }

  function offlineWorkerAllowed(search, protocol, hasApi) {
    return !!hasApi && /^https?:$/.test(String(protocol)) && !/[?&]dev=1\b/.test(String(search || ''));
  }
