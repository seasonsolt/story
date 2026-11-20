  /* Differentiated 6-Structure Stage Builders, Montessori Drag-and-Snap & 3-Tier Little Anchor Studio. */
  const stageState = {
    idx: -1, phase: '', stepIdx: -1, puzzleIdx: -1, assistCard: '', hintCard: '', demoHeard: false,
    recorded: false, hasClip: false, recording: false, premiere: false, activeCardIdx: -1,
    tier: (typeof save === 'object' && save.studioTier) || 'director',
    voiceFx: 'normal',
  };
  let lastHoverMs = 0;

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
    if (m.voiceKey && hasLineKey(m.voiceKey)) return voice.line(m.voiceKey, { interrupt: true, tag: 'card', maxWait: 2000, subtitle: false });
    return Promise.resolve(false);
  }

  function onCardHover(cid) {
    const now = Date.now();
    if (now - lastHoverMs < 450) return;
    lastHoverMs = now;
    speakCard(cid);
  }

  function renderCardTile(parent, opts) {
    const { x, y, w, h, cid, badgeKind, empty, active, glow, dim, actName, dataAttr, onSlotClick } = opts;
    const interactive = cid && !dim;
    const cls = (interactive ? 'card-btn' : '') + (glow || active ? ' ux-pulse' : '') + (empty && active ? ' ux-active-slot' : '');
    const meta = cid ? cardMetaOf(cid) : { label: '空位' };
    const g = el('g', Object.assign({
      class: cls,
      transform: `translate(${x} ${y})`,
    }, interactive ? { role: 'button', tabindex: '0', 'aria-label': meta.label || '图画卡' } : {}), parent);
    if (dataAttr) g.setAttribute(dataAttr[0], dataAttr[1]);
    if (actName) g.setAttribute('data-act', actName);

    const vis = el('g', { class: 'card-vis', filter: 'url(#softShadow)' }, g);
    const fill = empty ? 'rgba(18, 28, 62, .65)' : '#fff9ec';
    const warmEdge = badgeKind === '1' || badgeKind === 'who' || badgeKind === 'pick' || badgeKind === 'plan' || badgeKind === 'but';
    const stroke = glow || active ? '#ffd27a' : (warmEdge ? '#ff9cc4' : '#7dd4ff');
    el('rect', {
      width: w, height: h, rx: 20, fill, stroke,
      'stroke-width': glow || active ? 4.5 : 3.2,
      ...(empty ? { 'stroke-dasharray': '9 7' } : {}),
      ...(dim ? { opacity: '.28' } : {}),
    }, vis);

    if (badgeKind) {
      const bg = el('g', { transform: `translate(${w / 2} -2)` }, vis);
      bg.innerHTML = uxSlotBadgeSvg(badgeKind, !!active, 15);
    }

    if (empty) {
      const q = el('text', { x: w / 2, y: h / 2 + 14, 'text-anchor': 'middle', 'font-size': 38, fill: active ? '#ffd27a' : '#8da7db' }, vis);
      q.textContent = '?';
    } else if (cid) {
      const topPad = badgeKind ? 18 : 10;
      const availW = w - 18, availH = h - topPad - 10;
      const [iw, ih] = SIZES[cid] || [200, 200];
      const sc = Math.min(availW / iw, availH / ih);
      const dw = iw * sc, dh = ih * sc;
      img(cid, (w - dw) / 2, topPad + (availH - dh) / 2, dw, dh, vis, dim ? { opacity: '.28' } : {});
      if (onSlotClick) {
        const speak = () => { uxNudge(g); speakCard(cid); };
        g.addEventListener('click', speak);
        g.addEventListener('keydown', /** @param {KeyboardEvent} e */ e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); speak(); } });
      }
    }
    return g;
  }

  function svgPoint(clientX, clientY) {
    const st = $('stage');
    if (!st) return { x: 480, y: 260 };
    const r = st.getBoundingClientRect();
    if (!r.width || !r.height) return { x: 480, y: 260 };
    return { x: (clientX - r.left) * (960 / r.width), y: (clientY - r.top) * (520 / r.height) };
  }

  function bindChoiceCard(node, cid, dims) {
    const bw = (dims && dims.w) || 156, bh = (dims && dims.h) || 148;
    let pointerId = -1, sx0 = 0, sy0 = 0, dragging = false, suppressClick = false;

    const cleanupDrag = () => {
      node.classList.remove('ux-dragging');
      const dl = $('dragLayer');
      if (dl) dl.textContent = '';
      const activeSlot = $('slots') && $('slots').querySelector('.ux-active-slot');
      if (activeSlot) activeSlot.classList.remove('ux-slot-magnet');
    };

    const nearSlot = sy => sy < 268;

    node.addEventListener('pointerenter', /** @param {PointerEvent} e */ e => { if (e.pointerType !== 'touch' && !dragging) onCardHover(cid); });
    node.addEventListener('focus', () => onCardHover(cid));

    node.addEventListener('pointerdown', /** @param {PointerEvent} e */ e => {
      if (e.button && e.button !== 0) return;
      pointerId = e.pointerId != null ? e.pointerId : 1;
      sx0 = e.clientX; sy0 = e.clientY;
      dragging = false; suppressClick = false;
      try { if (node.setPointerCapture) node.setPointerCapture(pointerId); } catch (err) {}
    });

    node.addEventListener('pointermove', /** @param {PointerEvent} e */ e => {
      if (pointerId < 0) return;
      const dist = Math.hypot(e.clientX - sx0, e.clientY - sy0);
      if (!dragging && dist > 12) {
        dragging = true;
        suppressClick = true;
        onCardHover(cid);
        node.classList.add('ux-dragging');
        const dl = $('dragLayer');
        if (dl) {
          dl.textContent = '';
          const pt = svgPoint(e.clientX, e.clientY);
          const ghost = renderCardTile(dl, { x: pt.x - bw / 2, y: pt.y - bh / 2, w: bw, h: bh, cid, glow: true });
          ghost.setAttribute('data-drag-ghost', '1');
        }
      }
      if (dragging) {
        const pt = svgPoint(e.clientX, e.clientY);
        const dl = $('dragLayer');
        const ghost = dl && dl.querySelector('[data-drag-ghost]');
        if (ghost) ghost.setAttribute('transform', `translate(${(pt.x - bw / 2).toFixed(1)} ${(pt.y - bh / 2).toFixed(1)})`);
        const activeSlot = $('slots') && $('slots').querySelector('.ux-active-slot');
        if (activeSlot) activeSlot.classList.toggle('ux-slot-magnet', nearSlot(pt.y));
      }
    });

    const endDrag = (e, commit) => {
      if (pointerId < 0) return;
      try { if (node.releasePointerCapture) node.releasePointerCapture(pointerId); } catch (err) {}
      pointerId = -1;
      if (dragging) {
        dragging = false;
        const pt = svgPoint(e.clientX || 0, e.clientY || 0);
        cleanupDrag();
        if (commit && nearSlot(pt.y)) onCardPick(cid, node);
      }
    };

    node.addEventListener('pointerup', e => endDrag(e, true));
    node.addEventListener('pointercancel', e => endDrag(e, false));
    node.addEventListener('click', () => {
      if (suppressClick) { suppressClick = false; return; }
      onCardPick(cid, node);
    });
    node.addEventListener('keydown', /** @param {KeyboardEvent} e */ e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCardPick(cid, node); } });
  }

  function drawVisualHeader(host, mode, lv, g) {
    let w, h = 48, y = 18, inner;
    const spk = (cx, cy, r, hot) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${hot ? 'url(#goldGrad)' : '#253978'}" stroke="#fff7de" stroke-width="2"/><g transform="translate(${cx} ${cy})">${uxIcon('speaker', r * .82, hot ? '#4a2605' : '#fff9ec')}</g>`;
    const arr = (x1, x2, cy) => `<path d="M${x1} ${cy}H${x2}L${x2 - 5} ${cy - 4.5}M${x2} ${cy}L${x2 - 5} ${cy + 4.5}" fill="none" stroke="#ffd27a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;

    if (mode === 'sequence') {
      w = 276;
      inner = spk(28, 24, 17, true);
      for (let i = 0; i < 3; i++) {
        const cx = 86 + i * 66;
        inner += `<g transform="translate(${cx} 24)">${uxSlotBadgeSvg(String(i + 1), i === g.stepIdx || !!g.slots[i], 15)}</g>`;
        if (i < 2) inner += arr(cx + 21, cx + 45, 24);
      }
    } else if (mode === 'sentence' || mode === 'twist') {
      w = 320;
      const kinds = uxSlotBadgesFor(lv, 4);
      inner = spk(28, 24, 17, true);
      for (let i = 0; i < 4; i++) {
        const cx = 84 + i * 62;
        inner += `<g transform="translate(${cx} 24)">${uxSlotBadgeSvg(kinds[i], i === g.stepIdx || !!g.slots[i], 15)}</g>`;
        if (i < 3) {
          inner += mode === 'sentence'
            ? `<rect x="${cx + 21}" y="22" width="20" height="4" rx="2" fill="#ffd27a"/>`
            : arr(cx + 20, cx + 42, 24);
        }
      }
    } else if (mode === 'episode') {
      w = 352;
      const kinds = uxSlotBadgesFor(lv, 5);
      inner = spk(26, 24, 16, true);
      for (let i = 0; i < 5; i++) {
        const cx = 76 + i * 60;
        inner += `<g transform="translate(${cx} 24)">${uxSlotBadgeSvg(kinds[i], i === g.stepIdx || !!g.slots[i], 14)}</g>`;
        if (i < 4) inner += arr(cx + 18, cx + 40, 24);
      }
    } else if (mode === 'classify') {
      w = 296;
      const topicPic = lv.id === 'group_picnic' ? 'card_strawberry' : 'card_beanie';
      inner = spk(28, 24, 17, true)
        + `<rect x="58" y="6" width="40" height="36" rx="10" fill="#fff9ec" stroke="#7dd4ff" stroke-width="2"/>`
        + uxPic(topicPic, 62, 8, 32, 32, '', 'meet')
        + arr(106, 130, 24);
      for (let i = 0; i < 3; i++) {
        const cx = 160 + i * 48;
        const on = !!g.slots[i];
        inner += `<circle cx="${cx}" cy="24" r="15" fill="${on ? '#ffbe3d' : '#263876'}" stroke="#fff9ec" stroke-width="2"/>`
          + `<path d="${UX_STAR_D}" transform="translate(${cx} 24) scale(11)" fill="${on ? '#fffdf5' : '#6483ba'}"/>`;
      }
    } else if (mode === 'reason') {
      w = 298; h = 64; y = 12;
      const puz = g.currentPuzzle();
      const cid = (puz && puz.promptCard) || '';
      const [iw, ih] = SIZES[cid] || [200, 200];
      const sc = Math.min(64 / iw, 48 / ih);
      const dw = iw * sc, dh = ih * sc;
      inner = spk(28, 32, 18, true)
        + `<rect x="56" y="5" width="74" height="54" rx="14" fill="#fff9ec" stroke="#7dd4ff" stroke-width="2.2"/>`
        + (cid ? `<image href="${SRC(cid)}" x="${56 + (74 - dw) / 2}" y="${5 + (54 - dh) / 2}" width="${dw}" height="${dh}" preserveAspectRatio="none"/>` : '')
        + arr(137, 159, 32)
        + `<g transform="translate(184 32)">${uxSlotBadgeSvg('pick', g.stepIdx === 0 || !!g.slots[0], 16)}</g>`
        + arr(207, 229, 32)
        + `<g transform="translate(256 32)">${uxSlotBadgeSvg('why', g.stepIdx === 1 || !!g.slots[1], 16)}</g>`;
    } else {
      w = 280;
      const rec = stageState.recording;
      const hasClip = stageState.hasClip;
      inner = spk(48, 24, 16, !g.demoHeard && !rec)
        + arr(74, 106, 24)
        + `<circle cx="140" cy="24" r="16" fill="${rec ? '#ff5b84' : (g.demoHeard ? 'url(#goldGrad)' : '#253978')}" stroke="#fff7de" stroke-width="2"/><g transform="translate(140 24)">${uxIcon('mic', 13, rec ? '#ffffff' : (g.demoHeard ? '#4a2605' : '#fff9ec'))}</g>`
        + arr(166, 198, 24)
        + `<circle cx="232" cy="24" r="16" fill="${hasClip ? 'url(#goldGrad)' : '#253978'}" stroke="#fff7de" stroke-width="2"/><path d="${UX_STAR_D}" transform="translate(232 24) scale(11)" fill="${hasClip ? '#4a2605' : '#9eb6e6'}"/>`;
    }

    const x = Math.round(480 - w / 2);
    const hitY = h < 64 ? -(64 - h) / 2 : 0;
    const hitH = Math.max(64, h);
    host.insertAdjacentHTML('beforeend',
      `<g class="ux-btn" data-act="prompt" role="button" tabindex="0" aria-label="再听一遍" transform="translate(${x} ${y})">
        <rect x="0" y="${hitY}" width="${w}" height="${hitH}" fill="transparent"/>
        <g class="btn-vis" filter="url(#softShadow)">
          <rect width="${w}" height="${h}" rx="${h / 2}" fill="#141c42" opacity=".92" stroke="#ffd27a" stroke-width="2.5"/>
          ${inner}
        </g>
      </g>`
    );
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
    const badges = uxSlotBadgesFor(lv, g.slots.length);

    if (skill === 'sequence') {
      drawVisualHeader(slotsBox, 'sequence', lv, g);
      const cw = 158, ch = 152, gap = 32;
      const x0 = 480 - (3 * cw + 2 * gap) / 2;
      for (let i = 0; i < 3; i++) {
        const x = x0 + i * (cw + gap);
        renderCardTile(slotsBox, {
          x, y: 96, w: cw, h: ch,
          cid: g.slots[i] || '',
          badgeKind: badges[i],
          empty: !g.slots[i],
          active: i === g.stepIdx,
          onSlotClick: true,
        });
        if (i < 2) {
          el('path', { d: `M${x + cw + 7} 172H${x + cw + gap - 13}L${x + cw + gap - 19} 165M${x + cw + gap - 13} 172L${x + cw + gap - 19} 179`, fill: 'none', stroke: '#ffd27a', 'stroke-width': 3.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, slotsBox);
        }
      }
      const bw = 166, bh = 158, bgap = 28, bx0 = 480 - (choices.length * bw + (choices.length - 1) * bgap) / 2;
      choices.forEach((cid, i) => {
        const n = renderCardTile(cardsBox, {
          x: bx0 + i * (bw + bgap), y: 288, w: bw, h: bh, cid,
          glow: g.assistCard === cid || g.hintCard === cid,
          dataAttr: ['data-cid', cid],
        });
        bindChoiceCard(n, cid, { w: bw, h: bh });
      });
    } else if (skill === 'sentence') {
      drawVisualHeader(slotsBox, 'sentence', lv, g);
      const cw = 138, ch = 144, gap = 14;
      const x0 = 480 - (4 * cw + 3 * gap) / 2;
      for (let i = 0; i < 4; i++) {
        const x = x0 + i * (cw + gap);
        if (i < 3) el('rect', { x: x + cw - 2, y: 170, width: gap + 4, height: 8, rx: 4, fill: '#ffd27a' }, slotsBox);
        el('circle', { cx: x + 32, cy: 250, r: 12, fill: '#263876', stroke: '#ffd27a', 'stroke-width': 3 }, slotsBox);
        el('circle', { cx: x + cw - 32, cy: 250, r: 12, fill: '#263876', stroke: '#ffd27a', 'stroke-width': 3 }, slotsBox);
        renderCardTile(slotsBox, {
          x, y: 98, w: cw, h: ch,
          cid: g.slots[i] || '',
          badgeKind: badges[i],
          empty: !g.slots[i],
          active: i === g.stepIdx,
          onSlotClick: true,
        });
      }
      const bw = 166, bh = 158, bgap = 28, bx0 = 480 - (choices.length * bw + (choices.length - 1) * bgap) / 2;
      choices.forEach((cid, i) => {
        const n = renderCardTile(cardsBox, {
          x: bx0 + i * (bw + bgap), y: 288, w: bw, h: bh, cid,
          glow: !lv.openCompose && (g.assistCard === cid || g.hintCard === cid),
          dataAttr: ['data-cid', cid],
        });
        bindChoiceCard(n, cid, { w: bw, h: bh });
      });
    } else if (skill === 'twist') {
      drawVisualHeader(slotsBox, 'twist', lv, g);
      const cw = 140, ch = 138, gap = 18;
      const x0 = 480 - (4 * cw + 3 * gap) / 2;
      for (let i = 0; i < 4; i++) {
        const x = x0 + i * (cw + gap);
        renderCardTile(slotsBox, {
          x, y: 96, w: cw, h: ch,
          cid: g.slots[i] || '',
          badgeKind: badges[i],
          empty: !g.slots[i],
          active: i === g.stepIdx,
          onSlotClick: true,
        });
        if (i < 3) {
          if (i === 1) {
            el('path', { d: `M${x + cw + 2} 164Q${x + cw + gap / 2} 134 ${x + cw + gap - 4} 164`, fill: 'none', stroke: '#ff9cc4', 'stroke-width': 3.5, 'stroke-linecap': 'round' }, slotsBox);
          } else {
            el('path', { d: `M${x + cw + 2} 165H${x + cw + gap - 4}L${x + cw + gap - 9} 160M${x + cw + gap - 4} 165L${x + cw + gap - 9} 170`, fill: 'none', stroke: '#ffd27a', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, slotsBox);
          }
        }
      }
      const bw = 142, bh = 148, bgap = 18, bx0 = 480 - (choices.length * bw + (choices.length - 1) * bgap) / 2;
      choices.forEach((cid, i) => {
        const used = g.slots.includes(cid);
        const n = renderCardTile(cardsBox, {
          x: bx0 + i * (bw + bgap), y: 288, w: bw, h: bh, cid, dim: used,
          glow: !used && (g.assistCard === cid || g.hintCard === cid),
          dataAttr: ['data-cid', cid],
        });
        if (!used) bindChoiceCard(n, cid, { w: bw, h: bh });
      });
    } else if (skill === 'episode') {
      drawVisualHeader(slotsBox, 'episode', lv, g);
      const cw = 114, ch = 122, gap = 12;
      const x0 = 480 - (5 * cw + 4 * gap) / 2;
      const ys = [132, 108, 88, 108, 132];
      const pts = ys.map((yy, i) => `${x0 + i * (cw + gap) + cw / 2} ${yy + ch / 2}`).join(' L ');
      el('path', { d: `M ${pts}`, fill: 'none', stroke: '#ffd27a', 'stroke-width': 4, 'stroke-dasharray': '8 6', opacity: '.65' }, slotsBox);
      for (let i = 0; i < 5; i++) {
        renderCardTile(slotsBox, {
          x: x0 + i * (cw + gap), y: ys[i], w: cw, h: ch,
          cid: g.slots[i] || '',
          badgeKind: badges[i],
          empty: !g.slots[i],
          active: i === g.stepIdx,
          onSlotClick: true,
        });
      }
      const bw = 158, bh = 144, bgap = 26, bx0 = 480 - (choices.length * bw + (choices.length - 1) * bgap) / 2;
      choices.forEach((cid, i) => {
        const n = renderCardTile(cardsBox, {
          x: bx0 + i * (bw + bgap), y: 296, w: bw, h: bh, cid,
          glow: g.assistCard === cid || g.hintCard === cid,
          dataAttr: ['data-cid', cid],
        });
        bindChoiceCard(n, cid, { w: bw, h: bh });
      });
    } else if (skill === 'classify') {
      drawVisualHeader(slotsBox, 'classify', lv, g);
      const cw = 144, ch = 124, gap = 24, x0 = 480 - (3 * cw + 2 * gap) / 2;
      for (let i = 0; i < 3; i++) {
        renderCardTile(slotsBox, {
          x: x0 + i * (cw + gap), y: 86, w: cw, h: ch,
          cid: g.slots[i] || '',
          badgeKind: badges[i],
          empty: !g.slots[i],
          active: i === g.stepIdx,
          onSlotClick: true,
        });
      }
      const bw = 150, bh = 104, bgapX = 20, bgapY = 14, gx0 = 480 - (3 * bw + 2 * bgapX) / 2;
      choices.forEach((cid, i) => {
        const col = i % 3, row = (i / 3) | 0;
        const used = g.slots.includes(cid);
        const n = renderCardTile(cardsBox, {
          x: gx0 + col * (bw + bgapX), y: 232 + row * (bh + bgapY), w: bw, h: bh,
          cid, dim: used,
          glow: !used && (g.assistCard === cid || g.hintCard === cid),
          dataAttr: ['data-cid', cid],
        });
        if (!used) bindChoiceCard(n, cid, { w: bw, h: bh });
      });
    } else {
      drawVisualHeader(slotsBox, 'reason', lv, g);
      const cw = 172, ch = 146, gap = 96, x0 = 480 - (2 * cw + gap) / 2;
      el('path', { d: `M${x0 + cw + 12} 174Q480 126 ${x0 + cw + gap - 14} 174`, fill: 'none', stroke: '#ffd27a', 'stroke-width': 4, 'stroke-dasharray': '8 6' }, slotsBox);
      for (let i = 0; i < 2; i++) {
        renderCardTile(slotsBox, {
          x: x0 + i * (cw + gap), y: 110, w: cw, h: ch,
          cid: g.slots[i] || '',
          badgeKind: badges[i],
          empty: !g.slots[i],
          active: i === g.stepIdx,
          onSlotClick: true,
        });
      }
      const bw = 166, bh = 158, bgap = 28, bx0 = 480 - (choices.length * bw + (choices.length - 1) * bgap) / 2;
      choices.forEach((cid, i) => {
        const n = renderCardTile(cardsBox, {
          x: bx0 + i * (bw + bgap), y: 288, w: bw, h: bh, cid,
          glow: g.assistCard === cid || g.hintCard === cid,
          dataAttr: ['data-cid', cid],
        });
        bindChoiceCard(n, cid, { w: bw, h: bh });
      });
    }

    uxBind(slotsBox, { prompt: () => onHudPrompt() });
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

  function nudgeNextStudioCard(nextIdx) {
    const box = $('studio');
    if (!box) return;
    const node = box.querySelector(`[data-studio-card="${nextIdx}"]`);
    if (node) node.classList.add('ux-pulse');
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
    const n = Math.max(1, list.length);
    const badges = uxSlotBadgesFor(lv, n);
    const rec = stageState.recording;
    const anchorLive = rec && stageState.tier === 'anchor';

    drawVisualHeader(box, 'studio', lv, g);

    const cardHost = anchorLive ? el('g', { transform: 'translate(144 48) scale(.70)' }, box) : box;
    const ys5 = [122, 102, 86, 102, 122];
    const cw = n >= 5 ? 114 : (n === 4 ? 136 : (n === 3 ? 166 : 182));
    const ch = n >= 5 ? 124 : (n === 4 ? 142 : 156);
    const gap = n >= 5 ? 12 : (n === 4 ? 14 : (n === 3 ? 28 : 48));
    const x0 = 480 - (n * cw + (n - 1) * gap) / 2;

    if (lv.skill === 'reason' && n === 2) {
      el('path', { d: `M${x0 + cw + 6} 168Q480 126 ${x0 + cw + gap - 8} 168`, fill: 'none', stroke: '#ffd27a', 'stroke-width': 4, 'stroke-dasharray': '8 6' }, cardHost);
    } else if (lv.skill === 'reason' && n === 4) {
      el('path', { d: `M${x0 + cw + 2} 164Q${x0 + cw + gap / 2} 130 ${x0 + cw + gap - 2} 164`, fill: 'none', stroke: '#ffd27a', 'stroke-width': 3.5, 'stroke-dasharray': '6 5' }, cardHost);
      const x2 = x0 + 2 * (cw + gap);
      el('path', { d: `M${x2 + cw + 2} 164Q${x2 + cw + gap / 2} 130 ${x2 + cw + gap - 2} 164`, fill: 'none', stroke: '#ffd27a', 'stroke-width': 3.5, 'stroke-dasharray': '6 5' }, cardHost);
    } else if (lv.skill === 'episode' && n === 5) {
      const pts = ys5.map((yy, i) => `${x0 + i * (cw + gap) + cw / 2} ${yy + ch / 2}`).join(' L ');
      el('path', { d: `M ${pts}`, fill: 'none', stroke: '#ffd27a', 'stroke-width': 4, 'stroke-dasharray': '8 6', opacity: '.65' }, cardHost);
    }

    list.forEach((cid, i) => {
      const cx = x0 + i * (cw + gap);
      const cy = n >= 5 ? ys5[i] : 92;
      if ((lv.skill === 'sequence' || lv.skill === 'twist') && i < n - 1) {
        if (lv.skill === 'twist' && i === 1) {
          el('path', { d: `M${cx + cw + 2} 164Q${cx + cw + gap / 2} 134 ${cx + cw + gap - 2} 164`, fill: 'none', stroke: '#ff9cc4', 'stroke-width': 3.5 }, cardHost);
        } else {
          el('path', { d: `M${cx + cw + 4} 166H${cx + cw + gap - 6}L${cx + cw + gap - 11} 160M${cx + cw + gap - 6} 166L${cx + cw + gap - 11} 172`, fill: 'none', stroke: '#ffd27a', 'stroke-width': 3.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, cardHost);
        }
      } else if (lv.skill === 'sentence') {
        if (i < n - 1) el('rect', { x: cx + cw - 2, y: 162, width: gap + 4, height: 8, rx: 4, fill: '#ffd27a' }, cardHost);
        el('circle', { cx: cx + 32, cy: 242, r: 11, fill: '#263876', stroke: '#ffd27a', 'stroke-width': 2.8 }, cardHost);
        el('circle', { cx: cx + cw - 32, cy: 242, r: 11, fill: '#263876', stroke: '#ffd27a', 'stroke-width': 2.8 }, cardHost);
      }

      const cardNode = renderCardTile(cardHost, {
        x: cx, y: cy, w: cw, h: ch,
        cid, badgeKind: badges[i],
        active: stageState.activeCardIdx === i,
        dataAttr: ['data-studio-card', String(i)],
      });
      cardNode.addEventListener('click', () => {
        if (typeof onStudioCardTap === 'function') onStudioCardTap(i, cid, cardNode);
        else { uxNudge(cardNode); speakCard(cid); highlightStudioCard(i); }
      });
      cardNode.addEventListener('keydown', /** @param {KeyboardEvent} e */ e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (typeof onStudioCardTap === 'function') onStudioCardTap(i, cid, cardNode);
          else { speakCard(cid); highlightStudioCard(i); }
        }
      });
    });

    if (anchorLive) {
      box.insertAdjacentHTML('beforeend', `<circle cx="480" cy="296" r="110" fill="url(#warm)" opacity=".45" pointer-events="none"/>
        <g transform="translate(480 250)">${uxIcon('crown', 28, '#ffd27a')}</g>`);
    }
    if (stageState.premiere) {
      box.insertAdjacentHTML('beforeend', `<polygon points="480,68 250,480 710,480" fill="url(#warm)" opacity=".22" pointer-events="none"/>`);
    }

    // 7-bar aurora waveform meter (center)
    const waveCols = ['#7dd4ff', '#9fe8ff', '#ff9cc4', '#ffd27a', '#ff9cc4', '#9fe8ff', '#7dd4ff'];
    const wg = el('g', { id: 'studioWaves', transform: 'translate(480 276)' }, box);
    for (let i = 0; i < 7; i++) {
      el('rect', { x: (i - 3) * 26 - 6, y: 17, width: 12, height: 10, rx: 6, fill: waveCols[i], opacity: stageState.recording || stageState.premiere ? '.98' : '.42' }, wg);
    }

    const hasClip = stageState.hasClip;
    let html = '';
    // Left 3-Tier Scaffold Selector (visible when idle)
    if (!rec) {
      const tiers = [['cloze', 184], ['director', 254], ['anchor', 324]];
      for (const [tk, tx] of tiers) {
        html += uxButton({ act: 'tier_' + tk, ui: `tier_${tk}`, icon: tk, x: tx, y: 298, r: 32, plate: stageState.tier === tk ? 'gold' : '' });
      }
    }
    // Right 3 Voice Effect Chips (visible when clip exists & idle)
    if (hasClip && !rec) {
      const fxs = [['normal', 636], ['olaf', 706], ['hall', 776]];
      for (const [fk, fxX] of fxs) {
        html += uxButton({ act: 'fx_' + fk, ui: `fx_${fk}`, icon: 'fx_' + fk, x: fxX, y: 298, r: 32, plate: stageState.voiceFx === fk ? 'gold' : '' });
      }
    }

    html += uxButton({ act: 'demo', ui: 'demo', icon: 'speaker', x: 296, y: 406, r: 38, cls: (!g.demoHeard && !rec) ? 'ux-pulse' : '' });
    if (rec) {
      html += `<circle class="ux-ripple" cx="480" cy="400" r="52" fill="none" stroke="#ff7ca0" stroke-width="4" pointer-events="none"/>`
        + `<circle class="ux-ripple" cx="480" cy="400" r="52" fill="none" stroke="#ffb3c8" stroke-width="3" style="animation-delay:.6s" pointer-events="none"/>`
        + uxButton({ act: 'mic', ui: 'stop', icon: 'stop', x: 480, y: 400, r: 50, plate: 'rec', cls: 'ux-pulse' });
    } else {
      html += uxButton({ act: 'mic', ui: 'mic', pic: 'prop_mic', x: 480, y: 400, r: 50, plate: 'gold', cls: (g.demoHeard && !hasClip) ? 'ux-pulse' : '' });
    }
    if (hasClip) {
      html += uxButton({ act: 'listen', ui: 'listen', icon: 'play', x: 626, y: 406, r: 36 });
      html += uxButton({ act: 'done', ui: 'skip', icon: 'next', x: 738, y: 406, r: 40, plate: 'gold', cls: 'ux-pulse' });
    } else {
      html += uxButton({ act: 'done', ui: 'skip', icon: 'next', x: 668, y: 406, r: 38, plate: 'gold', cls: g.demoHeard ? 'ux-pulse' : '' });
    }
    box.insertAdjacentHTML('beforeend', html);

    uxBind(box, {
      prompt: () => onHudPrompt(),
      demo: () => onStudioDemo(),
      mic: () => onStudioMicToggle(),
      listen: () => onStudioListen(),
      done: () => onStudioDone(),
      tier_cloze: () => setStudioTier('cloze'),
      tier_director: () => setStudioTier('director'),
      tier_anchor: () => setStudioTier('anchor'),
      fx_normal: () => selectVoiceFx('normal'),
      fx_olaf: () => selectVoiceFx('olaf'),
      fx_hall: () => selectVoiceFx('hall'),
    });
  }

  function renderStage(g, force) {
    const lv = g.level();
    if (!lv) return;
    const needStatic = force || stageState.idx !== g.index;
    const needRedraw = needStatic || stageState.phase !== g.phase || stageState.stepIdx !== g.stepIdx
      || stageState.puzzleIdx !== g.puzzleIdx || stageState.assistCard !== g.assistCard
      || stageState.hintCard !== g.hintCard || stageState.demoHeard !== g.demoHeard
      || stageState.recorded !== g.recorded;
    if (needStatic) drawStageStatic(lv);
    if (needRedraw) {
      if (g.phase === 'build') drawBuildScene(g);
      else drawStudioScene(g);
      stageState.idx = g.index; stageState.phase = g.phase; stageState.stepIdx = g.stepIdx;
      stageState.puzzleIdx = g.puzzleIdx; stageState.assistCard = g.assistCard;
      stageState.hintCard = g.hintCard; stageState.demoHeard = g.demoHeard; stageState.recorded = g.recorded;
      if (typeof syncHud === 'function') syncHud();
    }
  }
