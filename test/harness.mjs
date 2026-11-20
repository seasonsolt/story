/* Test harness for 冰雪故事小导演: loads src/*.js (or built story.html <script id="logic">) and solves all 12 rooms in Node. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const DT = 1 / 60;

const EXPORTS = `;({ createGame, LEVELS, CARD_META, FREE_TRAIN_POOL, FREE_MOUNTAIN_POOL, INTERVIEW_TOPICS, SKILL_NAMES, IDLE_HINT_SEC })`;

export function loadLogic({ html = null } = {}) {
  let code, source;
  if (html) {
    const file = path.resolve(html);
    const page = fs.readFileSync(file, 'utf8');
    const m = page.match(/<script id="logic">([\s\S]*?)<\/script>/);
    if (!m) throw new Error(`${file}: no <script id="logic"> found`);
    code = m[1];
    source = `html:${path.relative(ROOT, file) || file}`;
  } else {
    const dir = path.join(ROOT, 'src');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
    code = files.map(f => fs.readFileSync(path.join(dir, f), 'utf8')).join('');
    source = `src:${files.join('+')}`;
  }
  const api = vm.runInNewContext(code + '\n' + EXPORTS, {}, { filename: source });
  return Object.assign(api, { levels: api.LEVELS, source });
}

export function loadLib(names, context = {}, expr = 'undefined') {
  const code = names.map(n => fs.readFileSync(path.join(ROOT, 'src', 'lib', `${n}.js`), 'utf8')).join('');
  return vm.runInNewContext(code + '\n' + expr, context, { filename: `lib:${names.join('+')}` });
}

export function solveRoom(logic, idx) {
  const g = logic.createGame();
  g.start(idx);
  const lv = logic.LEVELS[idx];
  const expectedFinal = idx === logic.LEVELS.length - 1 ? 'win' : 'clear';
  let guard = 0;
  while (g.phase === 'build' && guard++ < 20) {
    const cid = g.expectedCardId();
    if (!cid || !g.pickCard(cid)) throw new Error(`${lv.id}: failed picking ${cid} at step ${g.stepIdx}`);
    for (let k = 0; k < 5; k++) g.step(DT);
  }
  if (g.phase !== 'studio') throw new Error(`${lv.id}: did not reach studio phase (ended in ${g.phase})`);
  g.markDemoHeard();
  g.markRecorded();
  if (!g.completeRoom()) throw new Error(`${lv.id}: completeRoom failed`);
  if (g.state !== expectedFinal) throw new Error(`${lv.id}: ended in ${g.state}, expected ${expectedFinal}`);
  return { state: g.state, time: g.time, events: g.drain() };
}
