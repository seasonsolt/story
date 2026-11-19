/* Content keys, lines.json <-> view <-> art/sizes.json <-> audio manifest integrity check. */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT, loadLogic } from './harness.mjs';

const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

export function checkAudioFiles(dir = 'game') {
  const run = args => spawnSync('python3', ['art/narration.py', ...args, '--out', dir], { cwd: ROOT, encoding: 'utf8' });
  const missing = run(['--dry-run']), orphan = run(['--prune', '--dry-run']);
  const problems = [];
  if (missing.error || missing.status !== 0) problems.push(`dry-run failed: ${missing.stderr}`);
  if (orphan.error || orphan.status !== 0) problems.push(`prune failed: ${orphan.stderr}`);
  if (problems.length) return problems;
  for (const line of missing.stdout.split('\n').filter(Boolean)) problems.push(`audio: ${dir}/${line.split(' | ')[0]} missing`);
  for (const line of orphan.stdout.split('\n').filter(Boolean)) problems.push(`audio: ${dir}/${line} is orphan`);
  return problems;
}

export function checkVoiceManifest(dir = 'game') {
  const r = spawnSync('python3', ['art/narration.py', '--verify-manifest', '--out', dir], { cwd: ROOT, encoding: 'utf8' });
  if (r.error || r.status > 1) return [`voice manifest failed: ${r.stderr}`];
  return r.stdout.split('\n').filter(Boolean).map(l => `voice manifest: ${l}`);
}

export function checkContentKeys(logic = loadLogic()) {
  const problems = [];
  const doc = JSON.parse(read('src/content/lines.json'));
  const lines = doc.lines || {};
  const viewSrc = ['src/lib', 'src/view'].flatMap(dir =>
    fs.readdirSync(path.join(ROOT, dir)).filter(f => f.endsWith('.js')).sort().map(f => read(`${dir}/${f}`))
  ).join('\n');

  const need = ['p1', 'p2', 'p3', 'win', 'end', 'me_elsa', 'me_anna', 'me_olaf',
    'ui_play', 'ui_continue', 'ui_next', 'ui_replay', 'ui_back', 'ui_rooms', 'ui_train', 'ui_album',
    'ui_meet', 'ui_settings', 'ui_hint', 'ui_fullscreen', 'ui_demo', 'ui_mic', 'ui_stop', 'ui_listen', 'ui_skip',
    'studio_prompt', 'rec_done_1', 'rec_done_2', 'rec_done_3', 'mic_fallback',
    'try_1', 'try_2', 'try_3', 'assist_1', 'idle_1', 'idle_2', 'idle_3',
    'cheer_elsa', 'cheer_anna', 'cheer_olaf', 'free_train_intro', 'album_intro', 'reason_puz2_intro'];

  for (const lv of logic.levels) {
    need.push(`ui_room_${lv.id}`, lv.introKey, lv.demoKey, lv.clearKey);
  }
  for (const [cid, meta] of Object.entries(logic.CARD_META)) {
    if (meta.voiceKey) need.push(meta.voiceKey);
    if (!fs.existsSync(path.join(ROOT, 'game', `${cid}.webp`))) problems.push(`missing game/${cid}.webp`);
  }
  for (const k of new Set(need)) if (!lines[k]) problems.push(`lines.json missing key '${k}'`);
  for (const m of viewSrc.matchAll(/\bui:\s*'([a-z0-9_]+)'/g)) {
    if (!lines['ui_' + m[1]]) problems.push(`view references ui:'${m[1]}' without lines.ui_${m[1]}`);
  }
  if (fs.existsSync(path.join(ROOT, 'art/sizes.json'))) {
    const sizes = JSON.parse(read('art/sizes.json'));
    for (const lv of logic.levels) {
      if (!fs.existsSync(path.join(ROOT, 'game', `${lv.bg}.webp`))) problems.push(`missing game/${lv.bg}.webp`);
      if (!sizes[lv.bg]) problems.push(`sizes.json missing ${lv.bg}`);
    }
    for (const cid of Object.keys(logic.CARD_META)) if (!sizes[cid]) problems.push(`sizes.json missing ${cid}`);
  }
  return problems;
}
