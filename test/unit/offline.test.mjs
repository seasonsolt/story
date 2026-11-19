import fs from 'node:fs';
import path from 'node:path';

export function offlineFontsAndPrecacheContainRequiredShellAndNoRemoteFonts({ assert, ROOT }) {
  const tmpl = fs.readFileSync(path.join(ROOT, 'art/page.template.html'), 'utf8');
  assert.equal(/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(tmpl), false, 'no remote Google Fonts');
  const fontPath = path.join(ROOT, 'game', 'font_zh.woff2');
  assert.ok(fs.existsSync(fontPath), 'missing game/font_zh.woff2');
  assert.ok(fs.statSync(fontPath).size > 5000, 'suspiciously small game/font_zh.woff2');
  const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
  assert.match(sw, /font_zh\.woff2/);
  assert.match(sw, /manifest\.webmanifest/);
  assert.match(sw, /subs\.json/);
}
