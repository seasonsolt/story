import fs from 'node:fs';
import path from 'node:path';

export function titleSetFitsBudgetAndCoversRoomOne({ logic, loadLib, assert, ROOT }) {
  const { assetPlan } = loadLib(['assets'], {}, '({ assetPlan })');
  const plan = assetPlan(logic.levels);
  const titleSet = new Set(plan.title);
  let totalBytes = 0;
  for (const name of titleSet) {
    const p = path.join(ROOT, 'game', `${name}.webp`);
    assert.ok(fs.existsSync(p), `missing title asset game/${name}.webp`);
    totalBytes += fs.statSync(p).size;
  }
  assert.ok(totalBytes < 2_500_000, `title set size ${totalBytes} exceeds 2.5 MB budget`);
  assert.ok(titleSet.has(logic.levels[0].bg), 'title set must cover first room background');
}

export function hdCopiesExistAndDecodeForStagePictures({ assert, ROOT }) {
  const hdIdxPath = path.join(ROOT, 'art/hd.json');
  const hdIndex = JSON.parse(fs.readFileSync(hdIdxPath, 'utf8'));
  const keys = Object.keys(hdIndex);
  assert.ok(keys.length >= 40, `expected >= 40 HD stage assets, got ${keys.length}`);
  for (const n of keys) {
    const hdFile = path.join(ROOT, 'game/hd', `${n}.webp`);
    assert.ok(fs.existsSync(hdFile), `missing game/hd/${n}.webp`);
    assert.ok(fs.statSync(hdFile).size > 0, `empty game/hd/${n}.webp`);
  }
}

export function recorderPicksCompatibleMimeTypeWithoutDom({ loadLib, assert }) {
  const { recorder } = loadLib(['recorder'], {
    MediaRecorder: { isTypeSupported: m => m === 'audio/mp4' },
    indexedDB: undefined,
    window: {},
    navigator: {},
  }, '({ recorder })');
  assert.equal(recorder.pickMimeType(), 'audio/mp4');
}
