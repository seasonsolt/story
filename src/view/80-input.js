  /* Responsive stage sizing, portrait pause check, keyboard arrows & gamepad focus navigation. */
  let fitRaf = 0;
  const isPortraitView = () => window.matchMedia('(orientation: portrait)').matches && window.matchMedia('(pointer: coarse)').matches;

  function applyFit() {
    fitRaf = 0;
    const availW = window.innerWidth, availH = window.innerHeight;
    const cssW = layoutStageWidth(availW, availH);
    const stage = $('stage');
    if (stage) {
      stage.style.width = cssW + 'px';
      stage.style.height = layoutStageHeight(cssW) + 'px';
      hdFit(cssW);
    }
    if (typeof refreshAudioGains === 'function') refreshAudioGains();
    if (isPortraitView() && typeof voice !== 'undefined') voice.suspend();
  }

  function fitStageSoon() { if (!fitRaf) fitRaf = requestAnimationFrame(applyFit); }
  window.addEventListener('resize', fitStageSoon);
  window.addEventListener('orientationchange', fitStageSoon);
  applyFit();

  function toggleFullscreen() {
    const doc = document, elRoot = document.documentElement;
    const active = doc.fullscreenElement || doc.webkitFullscreenElement;
    if (active) {
      if (doc.exitFullscreen) doc.exitFullscreen().catch(() => {});
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
    } else {
      if (elRoot.requestFullscreen) elRoot.requestFullscreen().catch(() => {});
      else if (elRoot.webkitRequestFullscreen) elRoot.webkitRequestFullscreen();
    }
  }

  let padCur = -1, padLastMove = 0, padLastA = false, padLastB = false;

  function interactiveTargets() {
    const scope = uxState.modal ? $('modal') : storyIsOpen() ? $('overlay') : (game.phase === 'studio' ? $('studio') : $('cards'));
    if (!scope) return [];
    const nodes = [...scope.querySelectorAll('[role="button"]:not([data-state="lock"])')];
    return nodes.map(node => {
      const b = node.getBoundingClientRect();
      const s = $('stage').getBoundingClientRect();
      const k = s.width > 0 ? 960 / s.width : 1;
      return { node, pulse: node.classList.contains('ux-pulse'), x: (b.left - s.left) * k, y: (b.top - s.top) * k, w: b.width * k, h: b.height * k };
    }).filter(r => r.w > 10 && r.h > 10);
  }

  function showPadRing(r) {
    const pf = $('padFocus');
    if (!pf) return;
    if (!r) { pf.setAttribute('visibility', 'hidden'); return; }
    const rect = pf.querySelector('rect');
    rect.setAttribute('x', (r.x - 4).toFixed(1)); rect.setAttribute('y', (r.y - 4).toFixed(1));
    rect.setAttribute('width', (r.w + 8).toFixed(1)); rect.setAttribute('height', (r.h + 8).toFixed(1));
    pf.setAttribute('visibility', 'visible');
  }

  function movePadFocus(dir) {
    const list = interactiveTargets();
    if (!list.length) { showPadRing(null); return false; }
    if (padCur < 0 || padCur >= list.length) { padCur = layoutPadStart(list); showPadRing(list[padCur]); return true; }
    const next = layoutPadPick(dir, padCur, list);
    if (next >= 0) { padCur = next; showPadRing(list[padCur]); list[padCur].node.dispatchEvent(new Event('focus')); return true; }
    return false;
  }

  window.addEventListener('keydown', e => {
    if (uxState.modal) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const dir = e.key === 'ArrowRight' ? 'r' : e.key === 'ArrowLeft' ? 'l' : e.key === 'ArrowDown' ? 'd' : 'u';
      if (movePadFocus(dir)) e.preventDefault();
    } else if (e.key === 'Enter' || e.key === ' ') {
      const active = document.activeElement;
      if (active && $('stage').contains(active) && active instanceof HTMLElement) return;
      if (story && story.onKey) { e.preventDefault(); story.onKey(); }
    } else if (e.key === 'Escape' && story && story.name !== 'title' && story.name !== 'finale') {
      const back = $('overlay').querySelector('[data-act="back"]');
      if (back) back.dispatchEvent(new MouseEvent('click'));
    }
  });

  function padTick(now) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : null;
    const p = pads && pads[0];
    if (!p) { if (!document.activeElement || document.activeElement === document.body) showPadRing(null); return; }
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    const l = (p.buttons[14] && p.buttons[14].pressed) || ax < -.5;
    const r = (p.buttons[15] && p.buttons[15].pressed) || ax > .5;
    const u = (p.buttons[12] && p.buttons[12].pressed) || ay < -.5;
    const d = (p.buttons[13] && p.buttons[13].pressed) || ay > .5;
    if ((l || r || u || d) && now - padLastMove > .22) { padLastMove = now; movePadFocus(r ? 'r' : l ? 'l' : d ? 'd' : 'u'); }
    const aPressed = !!(p.buttons[0] && p.buttons[0].pressed);
    if (aPressed && !padLastA) { const list = interactiveTargets(); if (padCur >= 0 && list[padCur]) list[padCur].node.dispatchEvent(new MouseEvent('click')); }
    padLastA = aPressed;
    const bPressed = !!(p.buttons[1] && p.buttons[1].pressed);
    if (bPressed && !padLastB) { const back = $('overlay').querySelector('[data-act="back"]'); if (back) back.dispatchEvent(new MouseEvent('click')); }
    padLastB = bPressed;
  }
