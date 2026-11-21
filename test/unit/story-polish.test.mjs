export function levelSevenPreservesAllPuzzleCardsInStudio({ logic, assert }) {
  const g = logic.createGame();
  const idx = logic.LEVELS.findIndex(lv => lv.id === 'reason_rain');
  assert.ok(idx >= 0, 'reason_rain level must exist');
  g.start(idx);
  while (g.phase === 'build') {
    const cid = g.expectedCardId();
    assert.ok(g.pickCard(cid), `expected card ${cid} failed`);
  }
  assert.equal(g.phase, 'studio');
  assert.deepEqual(Array.from(g.studioCards()), ['card_cloak', 'card_wind_snow', 'card_umbrella', 'card_melting']);
}

export function openComposeSentenceTrainAcceptsCreativePicksAndFlagsCustom({ logic, assert }) {
  const g = logic.createGame();
  const idx = logic.LEVELS.findIndex(lv => lv.id === 'train_park');
  g.start(idx);
  const picks = ['portrait_anna', 'card_loc_castle', 'card_act_sing', 'card_mood_surprise'];
  for (const cid of picks) {
    assert.equal(g.pickCard(cid), true, `creative choice ${cid} must succeed`);
    assert.equal(g.misses, 0);
  }
  assert.equal(g.phase, 'studio');
  assert.deepEqual(Array.from(g.studioCards()), picks);
  assert.equal(g.isCustomSentence(), true);
}

export function twistAndEpisodeLevelsHaveExpectedSlotsAndSolve({ logic, solveRoom, assert }) {
  assert.equal(logic.LEVELS.length, 12);
  assert.equal(logic.LEVELS[0].id, 'snowman');
  assert.equal(logic.LEVELS[11].id, 'reason_finale');
  const g = logic.createGame();
  for (const id of ['twist_picnic', 'twist_sculpture', 'episode_bunny', 'episode_aurora']) {
    const idx = logic.LEVELS.findIndex(lv => lv.id === id);
    g.start(idx);
    const wantSlots = id.startsWith('episode_') ? 5 : 4;
    assert.equal(g.slots.length, wantSlots, `${id} should have ${wantSlots} slots`);
    const res = solveRoom(logic, idx);
    assert.equal(res.state, idx === logic.LEVELS.length - 1 ? 'win' : 'clear');
  }
}

export function wavEncoderAndVadHelpersProduceValidOutputWithoutDom({ loadLib, assert }) {
  const { encodeWavFromFloat32, computeRmsAndBars } = loadLib(['recorder'], {
    MediaRecorder: { isTypeSupported: () => false },
    indexedDB: undefined,
    window: {},
    navigator: {},
  }, '({ encodeWavFromFloat32, computeRmsAndBars })');

  const wav = encodeWavFromFloat32(new Float32Array([0, 0.5, -0.5, 1.0]), 24000);
  assert.equal(wav.length, 44 + 8);
  assert.equal(String.fromCharCode(wav[0], wav[1], wav[2], wav[3]), 'RIFF');
  assert.equal(String.fromCharCode(wav[8], wav[9], wav[10], wav[11]), 'WAVE');
  assert.equal(String.fromCharCode(wav[12], wav[13], wav[14], wav[15]), 'fmt ');
  assert.equal(String.fromCharCode(wav[36], wav[37], wav[38], wav[39]), 'data');

  const tdLoud = new Uint8Array(64).fill(180);
  const { bars, energy } = computeRmsAndBars(new Uint8Array(32).fill(90), tdLoud);
  assert.equal(bars.length, 7);
  assert.ok(energy > 0.5, `expected loud RMS energy > 0.5, got ${energy}`);
}
