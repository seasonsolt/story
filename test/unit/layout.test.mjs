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

export function childFacingViewsStayZeroReadingAndCoverCardsExist({ logic, assert, ROOT }) {
  const sizes = JSON.parse(fs.readFileSync(path.join(ROOT, 'art/sizes.json'), 'utf8'));
  for (const lv of logic.levels) {
    assert.ok(lv.coverCard, `level ${lv.id} missing coverCard`);
    assert.ok(sizes[lv.coverCard], `level ${lv.id} coverCard ${lv.coverCard} missing in art/sizes.json`);
  }
  const banned = ['按顺序摆一摆', '小小配音员', '情景线索', '听示范', '点我讲故事', '亲子日常表达小贴士', '我的本地录音', '自由造句小火车'];
  for (const f of ['10-stage.js', '60-story.js', '75-extras.js']) {
    const src = fs.readFileSync(path.join(ROOT, 'src/view', f), 'utf8');
    for (const term of banned) {
      assert.equal(src.includes(term), false, `${f} regressed child-facing prose "${term}"`);
    }
  }
}
