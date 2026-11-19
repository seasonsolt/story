#!/usr/bin/env node
/* Automated test runner for 冰雪故事小导演. */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { ROOT, loadLogic, loadLib, solveRoom } from './harness.mjs';
import { checkContentKeys } from './content_keys.mjs';

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
let html = null;
const idxHtml = process.argv.indexOf('--html');
if (idxHtml >= 0) html = process.argv[idxHtml + 1];

const logic = loadLogic({ html });
console.log(`logic from ${logic.source}; ${logic.levels.length} levels`);

let failures = 0;
const details = [];

console.log('\nlevel          skill     solve');
console.log('-------------  --------  -----');
for (let i = 0; i < logic.levels.length; i++) {
  const lv = logic.levels[i];
  let status;
  try {
    const res = solveRoom(logic, i);
    status = `ok (${res.state})`;
  } catch (e) {
    failures++;
    status = 'FAIL';
    details.push(`level ${lv.id}: ${e.message}`);
  }
  console.log(`${lv.id.padEnd(13)}  ${lv.skill.padEnd(8)}  ${status}`);
}

const unitDir = path.join(TEST_DIR, 'unit');
const unitOut = [];
if (fs.existsSync(unitDir)) {
  const ctx = { logic, loadLogic, loadLib, solveRoom, assert, ROOT };
  for (const f of fs.readdirSync(unitDir).filter(n => n.endsWith('.test.mjs')).sort()) {
    const base = f.replace(/\.test\.mjs$/, '');
    const mod = await import(pathToFileURL(path.join(unitDir, f)).href);
    for (const [name, fn] of Object.entries(mod)) {
      if (typeof fn !== 'function') continue;
      const full = name === 'default' ? base : `${base}.${name}`;
      try { await fn(ctx); unitOut.push({ name: full, ok: true }); }
      catch (e) { failures++; unitOut.push({ name: full, ok: false }); details.push(`unit ${full}:\n  ${e.stack || e.message}`); }
    }
  }
}

console.log('\nunit tests');
for (const u of unitOut) console.log(`  ${u.ok ? 'ok  ' : 'FAIL'}  ${u.name}`);

const keyProblems = checkContentKeys(logic);
console.log(`\ncontent keys  ${keyProblems.length ? 'FAIL' : 'ok'}`);
if (keyProblems.length) { failures++; details.push(`content keys:\n  ${keyProblems.join('\n  ')}`); }

if (details.length) console.log('\nFAILURES\n' + details.join('\n\n'));
console.log(`\n${failures ? 'FAILED' : 'PASSED'}: ${failures} failure(s), 0 skipped, ${unitOut.filter(u => u.ok).length} unit test(s) ok`);
process.exitCode = failures ? 1 : 0;
