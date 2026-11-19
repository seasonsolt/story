  /* Differentiated 4-Structure Stage Builders (Sequence, Sentence Train, Classify Basket, Reason Bridge) & Little Anchor Studio. */
  const stageState = {
    idx: -1, phase: '', stepIdx: -1, puzzleIdx: -1, assistCard: '', demoHeard: false,
    recorded: false, hasClip: false, recording: false, activeCardIdx: -1,
  };

  function drawStageStatic(lv) {
    $('bg').setAttribute('href', SRC(lv.bg));
    const glows = $('glows');
    glows.textContent = '';
    const coords = [[240, 140, 130, 'aurora'], [720, 150, 140, 'warm'], [480, 260, 180, 'rose']];
    coords.forEach(([x, y, r, fill], i) => {
      el('circle', { class: 'flicker', cx: x, cy: y, r, fill: `url(#${fill})`, style: `animation-delay:-${i * .9}s` }, glows);
    });
  }

  function cardMetaOf(cid) {
    return CARD_META[cid] || { label: cid, speech: cid, voiceKey: '' };
  }

  function speakCard(cid) {
    const m = cardMetaOf(cid);
    if (m.voiceKey && hasLineKey(m.voiceKey)) voice.line(m.voiceKey, { interrupt: true, tag: 'card', maxWait: 2000, subtitle: false });
  }

  function renderCardTile(parent, opts) {
    const { x, y, w, h, cid, label, tag, empty, active, glow, dim, actName, dataAttr } = opts;
    const cls = (cid && !dim ? 'card-btn' : '') + (glow || active ? ' ux-pulse' : '');
    const g = el('g', Object.assign({
      class: cls,
      transform: `translate(${x} ${y})`,
    }, cid && !dim ? { role: 'button', tabindex: '0', 'aria-label': label || (cid ? cardMetaOf(cid).label : '空位') } : {}), parent);
    if (dataAttr) g.setAttribute(dataAttr[0], dataAttr[1]);
    if (actName) g.setAttribute('data-act', actName);

    const vis = el('g', { class: 'card-vis', filter: 'url(#softShadow)' }, g);
    const fill = empty ? 'rgba(18, 28, 62, .65)' : '#fff9ec';
    const stroke = glow || active ? '#ffd27a' : (tag === '先' || tag === '我选' ? '#ff9cc4' : '#7dd4ff');
    el('rect', {
      width: w, height: h, rx: 22, fill, stroke,
      'stroke-width': glow || active ? 4.5 : 3.2,
      ...(empty ? { 'stroke-dasharray': '9 7' } : {}),
      ...(dim ? { opacity: '.28' } : {}),
    }, vis);

    if (tag) {
      const pw = Math.min(w - 16, Math.max(58, tag.length * 18 + 20));
      el('rect', { x: w / 2 - pw / 2, y: -13, width: pw, height: 26, rx: 13, fill: active ? '#ffd27a' : '#263876', stroke: '#fff7de', 'stroke-width': 2 }, vis);
      const tTxt = el('text', { x: w / 2, y: 5, 'text-anchor': 'middle', 'font-size': 15, fill: active ? '#3c2105' : '#fff9ec' }, vis);
      tTxt.textContent = tag;
    }

    if (empty) {
      const q = el('text', { x: w / 2, y: h / 2 + 12, 'text-anchor': 'middle', 'font-size': 38, fill: active ? '#ffd27a' : '#8da7db' }, vis);
      q.textContent = '?';
    } else if (cid) {
      const meta = cardMetaOf(cid);
      const textH = label || meta.label ? 30 : 10;
      const topPad = tag ? 16 : 10;
      const availW = w - 20, availH = h - topPad - textH - 4;
      const [iw, ih] = SIZES[cid] || [200, 200];
      const sc = Math.min(availW / iw, availH / ih);
      const dw = iw * sc, dh = ih * sc;
      img(cid, (w - dw) / 2, topPad + (availH - dh) / 2, dw, dh, vis, dim ? { opacity: '.28' } : {});
      if (label || meta.label) {
        const lb = el('text', { x: w / 2, y: h - 11, 'text-anchor': 'middle', 'font-size': w >= 150 ? 20 : 17, fill: dim ? '#8da7db' : '#232e5c' }, vis);
        lb.textContent = label || meta.label;
      }
    }
    return g;
  }

  function bindChoiceCard(node, cid) {
    const go = () => onCardPick(cid, node);
    node.addEventListener('click', go);
    node.addEventListener('keydown', /** @param {KeyboardEvent} e */ e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  }

  function drawHeaderPill(host, text) {
    const w = Math.min(540, Math.max(260, text.length * 22 + 54));
    const g = el('g', { filter: 'url(#softShadow)', transform: `translate(${480 - w / 2} 18)` }, host);
    el('rect', { width: w, height: 42, rx: 21, fill: '#141c42', opacity: '.9', stroke: '#ffd27a', 'stroke-width': 2.5 }, g);
    const tx = el('text', { x: w / 2, y: 28, 'text-anchor': 'middle', 'font-size': 21, fill: '#fff9ec' }, g);
    tx.textContent = text;
  }

  function drawBuildScene(g) {
    $('studio').textContent = '';
    const slotsBox = $('slots');
    const cardsBox = $('cards');
    slotsBox.textContent = '';
    cardsBox.textContent = '';

    const lv = g.level();
    const choices = g.currentChoices();
    const skill = lv.skill;

    if (skill === 'sequence') {
      drawHeaderPill(slotsBox, '按顺序摆一摆：先 → 接着 → 最后');
      const cw = 156, ch = 148, gap = 34;
      const x0 = 480 - (3 * cw + 2 * gap) / 2;
      for (let i = 0; i < 3; i++) {
        const x = x0 + i * (cw + gap);
        renderCardTile(slotsBox, {
          x, y: 98, w: cw, h: ch,
          cid: g.slots[i] || '',
          tag: lv.scaffoldLabels[i],
          empty: !g.slots[i],
          active: i === g.stepIdx,
        });
        if (i < 2) {
          el('path', { d: `M${x + cw + 7} 172H${x + cw + gap - 13}L${x + cw + gap - 19} 165M${x + cw + gap - 13} 172L${x + cw + gap - 19} 179`, fill: 'none', stroke: '#ffd27a', 'stroke-width': 3.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, slotsBox);
        }
      }
      const bw = 166, bh = 160, bgap = 28, bx0 = 480 - (choices.length * bw + (choices.length - 1) * bgap) / 2;
      choices.forEach((cid, i) => {
        const n = renderCardTile(cardsBox, {
          x: bx0 + i * (bw + bgap), y: 294, w: bw, h: bh, cid,
          glow: g.assistCard === cid,
          dataAttr: ['data-cid', cid],
        });
        bindChoiceCard(n, cid);
      });
    } else if (skill === 'sentence') {
      drawHeaderPill(slotsBox, '魔法造句小火车：谁 · 在哪儿 · 干什么 · 怎么样');
      const cw = 136, ch = 142, gap = 14;
      const x0 = 480 - (4 * cw + 3 * gap) / 2;
      for (let i = 0; i < 4; i++) {
        const x = x0 + i * (cw + gap);
        if (i < 3) el('rect', { x: x + cw - 2, y: 170, width: gap + 4, height: 8, rx: 4, fill: '#ffd27a' }, slotsBox);
        el('circle', { cx: x + 32, cy: 250, r: 12, fill: '#263876', stroke: '#ffd27a', 'stroke-width': 3 }, slotsBox);
        el('circle', { cx: x + cw - 32, cy: 250, r: 12, fill: '#263876', stroke: '#ffd27a', 'stroke-width': 3 }, slotsBox);
        renderCardTile(slotsBox, {
          x, y: 100, w: cw, h: ch,
          cid: g.slots[i] || '',
          tag: lv.scaffoldLabels[i],
          empty: !g.slots[i],
          active: i === g.stepIdx,
        });
      }
      const bw = 166, bh = 160, bgap = 28, bx0 = 480 - (choices.length * bw + (choices.length - 1) * bgap) / 2;
      choices.forEach((cid, i) => {
        const n = renderCardTile(cardsBox, {
          x: bx0 + i * (bw + bgap), y: 294, w: bw, h: bh, cid,
          glow: g.assistCard === cid,
          dataAttr: ['data-cid', cid],
        });
        bindChoiceCard(n, cid);
      });
    } else if (skill === 'classify') {
      drawHeaderPill(slotsBox, lv.topicLabel || '归类整理');
      const cw = 142, ch = 126, gap = 24, x0 = 480 - (3 * cw + 2 * gap) / 2;
      for (let i = 0; i < 3; i++) {
        renderCardTile(slotsBox, {
          x: x0 + i * (cw + gap), y: 92, w: cw, h: ch,
          cid: g.slots[i] || '',
          tag: lv.scaffoldLabels[i],
          empty: !g.slots[i],
          active: i === g.stepIdx,
        });
      }
      const bw = 148, bh = 104, bgapX = 20, bgapY = 14, gx0 = 480 - (3 * bw + 2 * bgapX) / 2;
      choices.forEach((cid, i) => {
        const col = i % 3, row = (i / 3) | 0;
        const used = g.slots.includes(cid);
        const n = renderCardTile(cardsBox, {
          x: gx0 + col * (bw + bgapX), y: 248 + row * (bh + bgapY), w: bw, h: bh,
          cid, dim: used,
          glow: !used && g.assistCard === cid,
          dataAttr: ['data-cid', cid],
        });
        if (!used) bindChoiceCard(n, cid);
      });
    } else {
      const puz = g.currentPuzzle();
      const promptCid = puz ? puz.promptCard : '';
      const pMeta = cardMetaOf(promptCid);
      const qPill = el('g', { filter: 'url(#softShadow)', transform: 'translate(220 18)' }, slotsBox);
      el('rect', { width: 520, height: 64, rx: 32, fill: '#141c42', opacity: '.92', stroke: '#ffd27a', 'stroke-width': 3 }, qPill);
      if (promptCid && SIZES[promptCid]) img(promptCid, 14, 6, 52, 52, qPill);
      const qTxt = el('text', { x: 286, y: 40, 'text-anchor': 'middle', 'font-size': 21, fill: '#fff9ec' }, qPill);
      qTxt.textContent = `情景线索：${pMeta.speech}`;

      const cw = 168, ch = 144, gap = 96, x0 = 480 - (2 * cw + gap) / 2;
      el('path', { d: `M${x0 + cw + 12} 172Q480 128 ${x0 + cw + gap - 14} 172`, fill: 'none', stroke: '#ffd27a', 'stroke-width': 4, 'stroke-dasharray': '8 6' }, slotsBox);
      for (let i = 0; i < 2; i++) {
        renderCardTile(slotsBox, {
          x: x0 + i * (cw + gap), y: 112, w: cw, h: ch,
          cid: g.slots[i] || '',
          tag: lv.scaffoldLabels[i],
          empty: !g.slots[i],
          active: i === g.stepIdx,
        });
      }
      const bw = 166, bh = 160, bgap = 28, bx0 = 480 - (choices.length * bw + (choices.length - 1) * bgap) / 2;
      choices.forEach((cid, i) => {
        const n = renderCardTile(cardsBox, {
          x: bx0 + i * (bw + bgap), y: 294, w: bw, h: bh, cid,
          glow: g.assistCard === cid,
          dataAttr: ['data-cid', cid],
        });
        bindChoiceCard(n, cid);
      });
    }
  }

  function highlightStudioCard(idx) {
    stageState.activeCardIdx = idx;
    const box = $('studio');
    if (!box) return;
    box.querySelectorAll('[data-studio-card]').forEach(n => {
      const on = Number(n.getAttribute('data-studio-card')) === idx;
      n.classList.toggle('ux-pulse', on);
      const r = n.querySelector('rect');
      if (r) r.setAttribute('stroke', on ? '#ffd27a' : '#7dd4ff');
    });
  }

  function setStudioWaves(bars) {
    const wg = $('studioWaves');
    if (!wg) return;
    const rects = wg.querySelectorAll('rect');
    rects.forEach((r, i) => {
      const v = bars ? Math.max(.14, Math.min(1, bars[i] || .14)) : .14;
      const h = Math.round(8 + v * 34);
      r.setAttribute('y', String(22 - Math.round(h / 2)));
      r.setAttribute('height', String(h));
    });
  }

  function drawStudioScene(g) {
    $('slots').textContent = '';
    $('cards').textContent = '';
    const box = $('studio');
    box.textContent = '';
    const lv = g.level();
    const list = g.studioCards();

    drawHeaderPill(box, '小小配音员 · 听示范，再用金色话筒讲一遍！');

    const n = Math.max(1, list.length);
    const cw = n >= 4 ? 136 : (n === 3 ? 166 : 182);
    const ch = n >= 4 ? 146 : 158;
    const gap = n >= 4 ? 14 : (n === 3 ? 28 : 48);
    const x0 = 480 - (n * cw + (n - 1) * gap) / 2;

    list.forEach((cid, i) => {
      const cardNode = renderCardTile(box, {
        x: x0 + i * (cw + gap), y: 92, w: cw, h: ch,
        cid, tag: (lv.scaffoldLabels && lv.scaffoldLabels[i]) || String(i + 1),
        active: stageState.activeCardIdx === i,
        dataAttr: ['data-studio-card', String(i)],
      });
      cardNode.addEventListener('click', () => {
        uxNudge(cardNode);
        speakCard(cid);
        highlightStudioCard(i);
      });
      cardNode.addEventListener('keydown', /** @param {KeyboardEvent} e */ e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); speakCard(cid); highlightStudioCard(i); }
      });
    });

    // 7-bar aurora waveform meter
    const waveCols = ['#7dd4ff', '#9fe8ff', '#ff9cc4', '#ffd27a', '#ff9cc4', '#9fe8ff', '#7dd4ff'];
    const wg = el('g', { id: 'studioWaves', transform: 'translate(480 286)' }, box);
    for (let i = 0; i < 7; i++) {
      el('rect', { x: (i - 3) * 26 - 6, y: 17, width: 12, height: 10, rx: 6, fill: waveCols[i], opacity: stageState.recording ? '.98' : '.42' }, wg);
    }

    const rec = stageState.recording;
    const hasClip = stageState.hasClip;
    let html = uxButton({ act: 'demo', ui: 'demo', icon: 'speaker', x: 296, y: 398, r: 36 });
    html += uxButton({ act: 'mic', ui: rec ? 'stop' : 'mic', icon: rec ? 'stop' : 'mic', x: 480, y: 394, r: 46, plate: rec ? 'rec' : 'gold', cls: rec ? 'ux-pulse' : '' });
    if (hasClip) {
      html += uxButton({ act: 'listen', ui: 'listen', icon: 'play', x: 618, y: 398, r: 34 });
      html += uxButton({ act: 'done', ui: 'skip', icon: 'next', x: 728, y: 398, r: 36, plate: 'gold', cls: 'ux-pulse' });
    } else {
      html += uxButton({ act: 'done', ui: 'skip', icon: 'next', x: 664, y: 398, r: 36, plate: 'gold', cls: g.demoHeard ? 'ux-pulse' : '' });
    }
    box.insertAdjacentHTML('beforeend', html);

    const lbl = (cx, cy, text) => {
      const t = el('text', { x: cx, y: cy, 'text-anchor': 'middle', 'font-size': 18, fill: '#fff9ec', filter: 'url(#softShadow)' }, box);
      t.textContent = text;
    };
    lbl(296, 456, '听示范');
    lbl(480, 462, rec ? '点我停止录音' : '点我讲故事');
    if (hasClip) {
      lbl(618, 456, '听我的声音');
      lbl(728, 456, '过关');
    } else {
      lbl(664, 456, '过关下一站');
    }

    uxBind(box, {
      demo: () => onStudioDemo(),
      mic: () => onStudioMicToggle(),
      listen: () => onStudioListen(),
      done: () => onStudioDone(),
    });
  }

  function renderStage(g, force) {
    const lv = g.level();
    if (!lv) return;
    const needStatic = force || stageState.idx !== g.index;
    const needRedraw = needStatic || stageState.phase !== g.phase || stageState.stepIdx !== g.stepIdx
      || stageState.puzzleIdx !== g.puzzleIdx || stageState.assistCard !== g.assistCard
      || stageState.demoHeard !== g.demoHeard || stageState.recorded !== g.recorded;
    if (needStatic) drawStageStatic(lv);
    if (needRedraw) {
      if (g.phase === 'build') drawBuildScene(g);
      else drawStudioScene(g);
      stageState.idx = g.index; stageState.phase = g.phase; stageState.stepIdx = g.stepIdx;
      stageState.puzzleIdx = g.puzzleIdx; stageState.assistCard = g.assistCard;
      stageState.demoHeard = g.demoHeard; stageState.recorded = g.recorded;
      if (typeof syncHud === 'function') syncHud();
    }
  }
