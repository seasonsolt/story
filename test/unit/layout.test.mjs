import fs from 'node:fs';
import path from 'node:path';

export function uiButtonsMeetMinimumTouchSizeAndNeverMixUxPopWithTranslate({ loadLib, assert, ROOT }) {
  const { layoutCssPx, layoutRefStageWidth, layoutHitRadius } = loadLib(['layout'], {}, '({ layoutCssPx, layoutRefStageWidth, layoutHitRadius })');
  const stageW = layoutRefStageWidth();
  for (const f of ['10-stage.js', '60-story.js', '70-ui.js', '75-extras.js']) {
    const src = fs.readFileSync(path.join(ROOT, 'src/view', f), 'utf8');
    for (const m of src.matchAll(/uxButton\(\{[^}]*\br:\s*(\d+)/g)) {
      const r = Number(m[1]);
      assert.ok(layoutCssPx(layoutHitRadius(r, false) * 2, stageW) >= 64, `${f}: button radius r=${r} too small`);
    }
    assert.equal(/uxButton\(\{[^}]*ux-pop/.test(src), false, `${f}: uxButton must never pass ux-pop directly onto translated <g>`);
  }
}
