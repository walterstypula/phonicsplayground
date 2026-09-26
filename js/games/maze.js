/* Maze Path - read a little story with a word missing from each sentence, and pick the
   word that makes sense. This is the Maze task of the school screening, which starts in
   second grade: it checks that a child is reading for meaning, not only turning letters
   into sounds. A child who reads "Hen sat on a ran" and does not blink is decoding
   without understanding, and Maze is where that shows.

   Nothing is read aloud. Hearing the sentence would turn it into a listening task, and
   the whole point is that the child reads it. */
(function (PH) {
  'use strict';
  var U = PH.util;

  PH.games.maze = {
    id: 'maze',
    name: 'Maze Path',
    icon: '🧀',
    blurb: 'Each sentence has a word missing. Pick the one that makes sense to lead the mouse to the cheese.',

    create: function (api) {
      var lvl = U.clamp(api.level.id, 1, 5);
      var shelf = PH.MAZE[lvl];
      var LAST_KEY = 'ph-maze-last-' + lvl;
      var last = '';
      try { last = localStorage.getItem(LAST_KEY) || ''; } catch (e) { /* private mode */ }
      var passage = U.pick(shelf.filter(function (p) { return p.title !== last; })) || shelf[0];
      try { localStorage.setItem(LAST_KEY, passage.title); } catch (e) { /* private mode */ }

      /* "Hen sat on a [log|ran|hot]." -> before, choices (right one first), after */
      var items = passage.lines.map(function (line) {
        var m = /^(.*)\[([^\]]+)\](.*)$/.exec(line);
        var opts = m[2].split('|');
        return { before: m[1], after: m[3], right: opts[0], opts: opts, chosen: null };
      });

      var at = 0, hits = 0, misses = 0, state = 'ask', timer = 0, choices = [];
      var mouse = { step: 0, x: 0, hop: 0 };
      var FONT = lvl >= 4 ? 28 : 32, LINE = FONT + 16, TEXT_W = 860;
      var measure = document.createElement('canvas').getContext('2d');

      function stepX(k) { return 110 + k * (api.W - 250) / items.length; }

      function newItem() {
        if (at >= items.length) {
          state = 'over';
          api.finish('You found the way!', hits + misses ? hits / (hits + misses) : 1);
          return;
        }
        var it = items[at];
        measure.font = U.font(40);
        var widest = 0;
        it.opts.forEach(function (o) { widest = Math.max(widest, measure.measureText(o).width); });
        var tw = Math.max(170, widest + 60), gap = 30;
        var x0 = api.W / 2 - (3 * tw + 2 * gap) / 2;
        choices = U.shuffle(it.opts).map(function (o, k) {
          return { text: o, right: o === it.right, x: x0 + k * (tw + gap), y: 520, w: tw, h: 84, shake: 0, dead: false };
        });
        state = 'ask';
        api.setProgress(at + 1, items.length);
      }

      function down(p) {
        if (state !== 'ask') { return; }
        choices.forEach(function (c) {
          if (c.dead || p.x < c.x || p.x > c.x + c.w || p.y < c.y || p.y > c.y + c.h) { return; }
          if (c.right) {
            items[at].chosen = c.text;
            hits++;
            api.addStar(1);
            api.sfx.good();
            api.sfx.hop();
            mouse.hop = 0.001;
            state = 'step'; timer = 0;
          } else {
            misses++;
            c.shake = 0.5; c.dead = true;
            api.sfx.boing();
          }
        });
      }

      function update(dt) {
        choices.forEach(function (c) { if (c.shake > 0) { c.shake = Math.max(0, c.shake - dt); } });
        var goal = stepX(mouse.step);
        mouse.x = mouse.x ? U.lerp(mouse.x, goal, Math.min(1, dt * 6)) : goal;
        if (mouse.hop > 0) { mouse.hop = mouse.hop >= 1 ? 0 : Math.min(1, mouse.hop + dt * 2.2); }
        if (state === 'step') {
          timer += dt;
          if (timer > 0.15 && mouse.step === at) { mouse.step = at + 1; }
          if (timer > 1.0) {
            at++;
            if (at >= items.length) {
              api.burst(stepX(items.length), 112, ['#ffd23f', '#fff3a0', '#ff8fab'], 40, { shape: 'star' });
              api.sfx.chomp();
            }
            newItem();
          }
        }
      }

      /* ---------------- drawing ---------------- */
      /* Lay a sentence out word by word so it can wrap, with the gap as a box of its own.
         Returns the lines, each a list of {text, gap} pieces with x positions. */
      function layout(ctx, it, filled) {
        ctx.font = U.font(FONT);
        var pieces = [];
        it.before.trim().split(/\s+/).forEach(function (w) { if (w) { pieces.push({ text: w }); } });
        var tail = it.after.match(/^\S*/)[0];                 /* punctuation stuck to the gap */
        pieces.push({ text: filled || '', gap: true, tail: tail });
        it.after.slice(tail.length).trim().split(/\s+/).forEach(function (w) { if (w) { pieces.push({ text: w }); } });
        var space = ctx.measureText(' ').width;
        var lines = [[]], x = 0;
        pieces.forEach(function (pc) {
          var w = pc.gap ? Math.max(120, ctx.measureText(pc.text).width + 28) + ctx.measureText(pc.tail).width
            : ctx.measureText(pc.text).width;
          if (x > 0 && x + w > TEXT_W) { lines.push([]); x = 0; }
          pc.x = x; pc.w = w;
          lines[lines.length - 1].push(pc);
          x += w + space;
        });
        return lines;
      }

      function drawSentence(ctx, it, y, current) {
        var lines = layout(ctx, it, it.chosen);
        lines.forEach(function (line) {
          var width = line.length ? line[line.length - 1].x + line[line.length - 1].w : 0;
          var left = api.W / 2 - width / 2;
          line.forEach(function (pc) {
            ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.font = U.font(FONT);
            if (pc.gap) {
              var tw = ctx.measureText(pc.tail).width, bw = pc.w - tw;
              if (pc.text) {
                ctx.fillStyle = 'rgba(61,220,132,.28)';
                U.roundRect(ctx, left + pc.x, y - LINE / 2 + 4, bw, LINE - 8, 10); ctx.fill();
                ctx.fillStyle = '#17753f';
                ctx.fillText(pc.text, left + pc.x + 14, y + 1);
              } else {
                ctx.fillStyle = current ? 'rgba(255,210,63,.55)' : 'rgba(31,35,64,.1)';
                U.roundRect(ctx, left + pc.x, y - LINE / 2 + 4, bw, LINE - 8, 10); ctx.fill();
                ctx.strokeStyle = 'rgba(31,35,64,.35)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
                U.roundRect(ctx, left + pc.x, y - LINE / 2 + 4, bw, LINE - 8, 10); ctx.stroke();
                ctx.setLineDash([]);
              }
              ctx.fillStyle = current ? '#1f2340' : 'rgba(31,35,64,.55)';
              ctx.fillText(pc.tail, left + pc.x + bw, y + 1);
            } else {
              ctx.fillStyle = current ? '#1f2340' : 'rgba(31,35,64,.55)';
              ctx.fillText(pc.text, left + pc.x, y + 1);
            }
          });
          y += LINE;
        });
        return y;
      }

      function draw(ctx) {
        /* hedges and a garden path */
        var bg = ctx.createLinearGradient(0, 0, 0, api.H);
        bg.addColorStop(0, '#d7f5c4');
        bg.addColorStop(1, '#a8dd8e');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, api.W, api.H);
        ctx.fillStyle = '#6fbf5a';
        for (var hx = 0; hx < api.W; hx += 46) {
          ctx.beginPath(); ctx.arc(hx + 20, 20, 30, 0, Math.PI * 2); ctx.fill();
        }

        /* the path along the top: a stone for each sentence, cheese at the end */
        var py = 118;
        ctx.strokeStyle = 'rgba(120,84,40,.35)'; ctx.lineWidth = 16; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(stepX(0), py + 16); ctx.lineTo(stepX(items.length), py + 16); ctx.stroke();
        for (var k = 0; k <= items.length; k++) {
          ctx.fillStyle = k < mouse.step ? '#ffe7a3' : '#e9dcc4';
          ctx.beginPath(); ctx.ellipse(stepX(k), py + 16, 26, 11, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.font = '48px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🧀', stepX(items.length), py - 8);
        var lift = mouse.hop > 0 ? Math.sin(mouse.hop * Math.PI) * 26 : 0;
        ctx.save();
        ctx.translate(mouse.x, py - 6 - lift);
        ctx.scale(-1, 1);                      /* the mouse emoji faces left; ours goes right */
        ctx.fillText('🐭', 0, 0);
        ctx.restore();

        /* the story so far on a sheet of paper */
        U.plate(ctx, 50, 170, api.W - 100, 318, { fill: '#fffdf5', r: 22 });
        ctx.font = U.font(22); ctx.fillStyle = 'rgba(31,35,64,.6)'; ctx.textAlign = 'center';
        ctx.fillText(passage.title, api.W / 2, 198);
        /* the current sentence and up to two before it, as many as fit */
        var shown = [];
        for (var n = Math.min(at, items.length - 1); n >= 0 && shown.length < 3; n--) { shown.unshift(n); }
        var heights = shown.map(function (n2) { return layout(ctx, items[n2], items[n2].chosen).length * LINE; });
        while (heights.reduce(function (a, b) { return a + b; }, 0) > 250 && shown.length > 1) { shown.shift(); heights.shift(); }
        var y = 236 + LINE / 2;
        shown.forEach(function (n2) { y = drawSentence(ctx, items[n2], y, n2 === at); });

        if (state === 'ask' || state === 'step') {
          choices.forEach(function (c) {
            var dx = c.shake ? Math.sin(c.shake * 40) * 10 * c.shake : 0;
            ctx.globalAlpha = c.dead && !c.shake ? 0.35 : 1;
            U.tile(ctx, { x: c.x + dx, y: c.y, w: c.w, h: c.h, r: 20,
              fill: c.dead ? '#e6e6ee' : '#ffffff', text: c.text, fontSize: 40 });
            ctx.globalAlpha = 1;
          });
        }
      }

      api.setPrompt('Pick the word that makes sense');
      if (lvl <= 2 || api.pre) { api.say('Pick the word that makes sense'); }
      newItem();
      return { update: update, draw: draw, down: down,
        debug: function () { return { passage: passage.title, at: at, choices: choices.map(function (c) { return c.text; }) }; } };
    }
  };
})(window.PH = window.PH || {});
