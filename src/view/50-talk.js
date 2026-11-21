  /* Pure-Chinese spoken guidance, bottom-safe optional parent subtitle pill, and event hooks. */
  const TK = (() => {
    const subtitlesOn = () => { try { return !!setting('subtitles'); } catch (e) { return false; } };
    let curSub = null, introDone = -1;

    function hideBubble() { const t = $('talk'); if (t) t.textContent = ''; }

    function renderBubble(sub) {
      const t = $('talk');
      if (!t) return;
      t.textContent = '';
      if (!sub || !subtitlesOn() || !sub.text) return;
      const lines = wrap(sub.text, 30).slice(0, 2);
      const w = Math.min(720, Math.max(240, Math.max(...lines.map(l => l.length)) * 17 + 36));
      const lineH = 20;
      const h = lines.length * lineH + 12;
      const y = 516 - h;
      const strokeCol = sub.who === 'elsa' ? '#7dd4ff' : (sub.who === 'anna' ? '#ff9cc4' : '#ffd27a');
      const g = el('g', { transform: `translate(${480 - w / 2} ${y})`, 'pointer-events': 'none' }, t);
      el('rect', { width: w, height: h, rx: 14, fill: '#111834', opacity: '.88', stroke: strokeCol, 'stroke-width': 2 }, g);
      lines.forEach((ln, i) => {
        const tx = el('text', { x: w / 2, y: 20 + i * lineH, 'text-anchor': 'middle', 'font-size': 15, fill: '#fff9ec' }, g);
        tx.textContent = ln;
      });
    }

    if (typeof voice !== 'undefined' && typeof voice.onSubtitle === 'function') {
      voice.onSubtitle(sub => { curSub = sub; renderBubble(sub); });
    }

    function refreshSubtitles() { renderBubble(curSub); }

    function say(key, opts) {
      if (!hasLineKey(key)) return Promise.resolve(false);
      return voice.line(key, opts);
    }

    function talkOnEvents(events, g) {
      g = g || game;
      for (const e of events || []) {
        if (e.type === 'load') {
          introDone = -1;
          hideBubble();
        } else if (e.type === 'puzzle_next') {
          say('reason_puz2_intro', { interrupt: true, tag: 'prompt', maxWait: 5000 });
        } else if (e.type === 'cheer' && e.who) {
          say('cheer_' + e.who, { interrupt: true, tag: 'cheer', maxWait: 2800 });
        } else if (e.type === 'hint_auto') {
          say('idle_' + (1 + Math.floor(Math.random() * 3)), { tag: 'hint', maxWait: 3500 });
        }
      }
      if (g.state === 'play' && introDone !== g.index && !storyIsOpen()) {
        introDone = g.index;
        say(g.level().introKey, { tag: 'intro', maxWait: 6000 });
      }
    }

    return { talkOnEvents, refreshSubtitles, say };
  })();

  const talkOnEvents = TK.talkOnEvents;
