export function saveSanitizesMergesSkillsAndRecordings({ loadLib, assert }) {
  const { defaultSave, sanitizeSave, mergeSaves } = loadLib(['save'], {}, '({ defaultSave, sanitizeSave, mergeSaves })');
  const d = defaultSave();
  assert.equal(d.settings.subtitles, false);
  assert.equal(d.settings.eyeCare, true);
  assert.equal(d.studioTier, 'director');
  assert.equal(d.unlocked.rooms, 1);
  assert.deepEqual(Object.keys(d.skills), ['sequence', 'sentence', 'classify', 'reason', 'twist', 'episode']);

  const a = sanitizeSave({
    rooms: { snowman: { cleared: true, stars: [true, true, false], firstSpeechMs: 3200, tier3: false } },
    skills: { sequence: 2, twist: 1 },
    recordingsCount: 3,
    speechSamples: 2,
    totalSpeechMs: 7000,
    creations: [{ id: 'free_1', mode: 'mountain', cards: ['portrait_elsa'], createdAt: 100, durationMs: 4000, activeSpeechMs: 2800 }],
    diary: [{ id: 'diary_1', topicId: 'play', createdAt: 200, durationMs: 5000, activeSpeechMs: 3100 }],
  });
  const b = sanitizeSave({
    rooms: { snowman: { cleared: true, recorded: true, stars: [true, false, true], lastSpeechMs: 5400, tier3: true } },
    skills: { sequence: 1, reason: 1, episode: 2 },
    recordingsCount: 2,
    freeSentences: 4,
    creations: [{ id: 'free_2', mode: 'train', cards: ['portrait_anna'], createdAt: 300, durationMs: 4500, activeSpeechMs: 3000 }],
  });
  const m = mergeSaves(a, b);
  assert.deepEqual(Array.from(m.rooms.snowman.stars), [true, true, true]);
  assert.equal(m.rooms.snowman.tier3, true);
  assert.equal(m.rooms.snowman.firstSpeechMs, 3200);
  assert.equal(m.rooms.snowman.lastSpeechMs, 5400);
  assert.equal(m.skills.sequence, 2);
  assert.equal(m.skills.reason, 1);
  assert.equal(m.skills.twist, 1);
  assert.equal(m.skills.episode, 2);
  assert.equal(m.recordingsCount, 3);
  assert.equal(m.speechSamples, 2);
  assert.equal(m.totalSpeechMs, 7000);
  assert.equal(m.freeSentences, 4);
  assert.deepEqual(Array.from(m.creations.map(c => c.id)), ['free_2', 'free_1']);
  assert.deepEqual(Array.from(m.diary.map(c => c.id)), ['diary_1']);
}
