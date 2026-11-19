export function saveSanitizesMergesSkillsAndRecordings({ loadLib, assert }) {
  const { defaultSave, sanitizeSave, mergeSaves } = loadLib(['save'], {}, '({ defaultSave, sanitizeSave, mergeSaves })');
  const d = defaultSave();
  assert.equal(d.unlocked.rooms, 1);
  assert.deepEqual(Object.keys(d.skills), ['sequence', 'sentence', 'classify', 'reason']);

  const a = sanitizeSave({ rooms: { snowman: { cleared: true, stars: [true, true, false] } }, skills: { sequence: 2 }, recordingsCount: 3 });
  const b = sanitizeSave({ rooms: { snowman: { cleared: true, recorded: true, stars: [true, false, true] } }, skills: { sequence: 1, reason: 1 }, recordingsCount: 2, freeSentences: 4 });
  const m = mergeSaves(a, b);
  assert.deepEqual(Array.from(m.rooms.snowman.stars), [true, true, true]);
  assert.equal(m.skills.sequence, 2);
  assert.equal(m.skills.reason, 1);
  assert.equal(m.recordingsCount, 3);
  assert.equal(m.freeSentences, 4);
}
