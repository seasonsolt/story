/* Pure state machine for 冰雪故事小导演 (<script id="logic">). Zero DOM access; runs in Node tests and browser. */
const IDLE_HINT_SEC = 14;

function createGame() {
  const g = {
    state: 'title',     // 'title' | 'play' | 'clear' | 'win'
    index: 0,
    phase: 'build',     // 'build' | 'studio'
    time: 0,
    idleTime: 0,
    hintCard: '',
    assistCard: '',
    misses: 0,
    slots: [],          // chosen card IDs in current structure / active puzzle
    stepIdx: 0,         // build cursor
    puzzleIdx: 0,       // for multi-puzzle reason rooms
    demoHeard: false,
    recorded: false,
    studioPlayed: false,
    heroes: {
      elsa: { state: 'idle', cheer: 0 },
      anna: { state: 'idle', cheer: 0 },
      olaf: { state: 'idle', cheer: 0 },
    },
    events: [],

    level() {
      return LEVELS[g.index];
    },

    emit(ev) {
      g.events.push(ev);
    },

    drain() {
      return g.events.splice(0, g.events.length);
    },

    load(i) {
      const idx = Math.max(0, Math.min(LEVELS.length - 1, i | 0));
      const lv = LEVELS[idx];
      g.index = idx;
      g.phase = 'build';
      g.time = 0;
      g.idleTime = 0;
      g.hintCard = '';
      g.assistCard = '';
      g.misses = 0;
      g.stepIdx = 0;
      g.puzzleIdx = 0;
      g.demoHeard = false;
      g.recorded = false;
      g.studioPlayed = false;
      const nSlots = lv.skill === 'sentence' ? 4 : (lv.skill === 'reason' ? 2 : 3);
      g.slots = new Array(nSlots).fill('');
      for (const k of ['elsa', 'anna', 'olaf']) {
        g.heroes[k] = { state: k === lv.host ? 'speak' : 'idle', cheer: 0 };
      }
      g.events = [];
      g.emit({ type: 'load', index: idx, id: lv.id, skill: lv.skill });
    },

    start(i) {
      g.load(i);
      g.state = 'play';
    },

    currentPuzzle() {
      const lv = g.level();
      if (!lv || lv.skill !== 'reason' || !Array.isArray(lv.puzzles)) return null;
      return lv.puzzles[g.puzzleIdx] || null;
    },

    currentChoices() {
      const lv = g.level();
      if (!lv) return [];
      if (lv.skill === 'sequence' || lv.skill === 'classify') return lv.choices.slice();
      if (lv.skill === 'sentence') return (lv.steps[g.stepIdx] || []).slice();
      const puz = g.currentPuzzle();
      if (lv.skill === 'reason' && puz) return g.stepIdx === 0 ? puz.pickChoices.slice() : puz.whyChoices.slice();
      return [];
    },

    expectedCardId() {
      const lv = g.level();
      if (!lv || g.phase !== 'build') return '';
      if (lv.skill === 'sequence' || lv.skill === 'sentence') return lv.target[g.stepIdx] || '';
      if (lv.skill === 'classify') {
        return lv.target.find(id => !g.slots.includes(id)) || '';
      }
      const puz = g.currentPuzzle();
      if (lv.skill === 'reason' && puz) return puz.answer[g.stepIdx] || '';
      return '';
    },

    studioCards() {
      const lv = g.level();
      if (!lv) return [];
      if (lv.skill === 'reason' && Array.isArray(lv.puzzles)) {
        const last = lv.puzzles[lv.puzzles.length - 1];
        return last ? last.answer.slice() : [];
      }
      return g.slots.filter(Boolean);
    },

    resetIdle() {
      g.idleTime = 0;
      g.hintCard = '';
    },

    pickCard(cardId) {
      if (g.state !== 'play' || g.phase !== 'build') return false;
      const lv = g.level();
      const choices = g.currentChoices();
      if (!choices.includes(cardId)) return false;
      g.resetIdle();

      const valid = lv.skill === 'classify'
        ? lv.target.includes(cardId) && !g.slots.includes(cardId)
        : cardId === g.expectedCardId();

      if (!valid) {
        g.misses++;
        const help = g.expectedCardId();
        g.assistCard = help;
        g.emit({ type: 'card_try', cardId, expected: help, misses: g.misses });
        return false;
      }

      g.slots[g.stepIdx] = cardId;
      g.stepIdx++;
      g.misses = 0;
      g.assistCard = '';
      for (const k of ['elsa', 'anna', 'olaf']) g.heroes[k].cheer = k === lv.host ? 1.0 : 0.6;
      g.emit({ type: 'slot_ok', cardId, slot: g.stepIdx - 1 });

      if (g.stepIdx >= g.slots.length) {
        if (lv.skill === 'reason' && Array.isArray(lv.puzzles) && g.puzzleIdx + 1 < lv.puzzles.length) {
          g.puzzleIdx++;
          g.stepIdx = 0;
          g.slots = ['', ''];
          g.emit({ type: 'puzzle_next', puzzleIdx: g.puzzleIdx });
          return true;
        }
        g.phase = 'studio';
        g.heroes[lv.host].cheer = 1.4;
        g.emit({ type: 'studio_ready', skill: lv.skill, cards: g.studioCards() });
      }
      return true;
    },

    markDemoHeard() {
      if (g.state !== 'play') return;
      g.demoHeard = true;
      g.resetIdle();
      g.emit({ type: 'demo_heard' });
    },

    markRecorded() {
      if (g.state !== 'play') return;
      g.recorded = true;
      g.studioPlayed = true;
      g.resetIdle();
      for (const k of ['elsa', 'anna', 'olaf']) g.heroes[k].cheer = 1.4;
      g.emit({ type: 'recorded', index: g.index });
    },

    cheerHero(who) {
      if (!g.heroes[who]) return false;
      g.heroes[who].cheer = 1.1;
      g.emit({ type: 'cheer', who });
      return true;
    },

    completeRoom() {
      if (g.state !== 'play' || g.phase !== 'studio') return false;
      const last = g.index >= LEVELS.length - 1;
      g.state = last ? 'win' : 'clear';
      g.emit({ type: g.state, index: g.index, id: g.level().id, skill: g.level().skill });
      return true;
    },

    step(dt) {
      if (g.state !== 'play') return;
      const clamped = Math.min(0.05, Math.max(0, dt || 0));
      g.time += clamped;
      g.idleTime += clamped;
      for (const k of ['elsa', 'anna', 'olaf']) {
        const h = g.heroes[k];
        if (h.cheer > 0) h.cheer = Math.max(0, h.cheer - clamped);
      }
      if (!g.hintCard && g.phase === 'build' && g.idleTime >= IDLE_HINT_SEC) {
        g.hintCard = g.expectedCardId();
        if (g.hintCard) g.emit({ type: 'hint_auto', cardId: g.hintCard });
      }
    },
  };
  return g;
}
