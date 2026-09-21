/* Comet Trails - trace letters (and, for the littlest, lines and circles) with a comet */
(function (PH) {
  'use strict';
  var U = PH.util;

  PH.games.tracing = {
    id: 'tracing',
    name: 'Comet Trails',
    icon: '☄️',
    blurb: 'Drag the star along the dotted letter to paint it with a comet. Finish it and it turns into a constellation!',

    create: function (api) {
      var S = PH.STROKES;
      var pics = api.mode === 'pictures', letters = api.mode === 'letters';
      var caps = api.level.id === 5;
      var words = api.level.id >= 1 && api.level.id <= 4;
      var ROUNDS = words ? 4 : 6;
      var TOL = api.pre ? 58 : 44;          /* how close the finger must stay to the path */
      var round = 0, item = null, strokes = [], si = 0, k = 0;
      var hits = 0, state = 'trace', timer = 0, idle = 0, dragging = false;
      var tail = [], fizz = 0, ghostT = 0, queue = [], stars = [], i;
      for (i = 0; i < 80; i++) { stars.push({ x: U.rand(0, api.W), y: U.rand(0, api.H), r: U.rand(0.6, 2), t: U.rand(0, 6) }); }

      /* ---------------- what to trace ---------------- */
      function plan() {
        if (pics) {
          var shapes = U.shuffle(Object.keys(S.shapes)).slice(0, 4).map(function (n) { return { kind: 'shape', text: n }; });
          var easy = U.shuffle(['l', 'o', 'c', 'i']).slice(0, 2).map(function (c) { return { kind: 'letter', text: c }; });
          return shapes.concat(easy);
        }
        if (letters) {
          return U.shuffle(api.words).slice(0, ROUNDS).map(function (w) { return { kind: 'letter', text: w.w }; });
        }
        if (caps) {
          return U.shuffle(Object.keys(S.upper)).slice(0, ROUNDS).map(function (c) { return { kind: 'cap', text: c }; });
        }
        var short = api.words.filter(function (w) { return w.w.length >= 3 && w.w.length <= 4 && /^[a-z]+$/.test(w.w); });
        return U.shuffle(short).slice(0, ROUNDS).map(function (w) { return { kind: 'word', text: w.w }; });
      }

      /* lay the glyphs out, scale them up, and resample every stroke to an even spacing */
      function layout(it) {
        var glyphs, boxH, boxW = 60, gap = 24, maxScale;
        if (it.kind === 'shape') { glyphs = [S.shapes[it.text]]; boxH = 110; maxScale = 3.4; }
        else if (it.kind === 'cap') { glyphs = [S.upper[it.text]]; boxH = 100; maxScale = 3.8; }
        else { glyphs = it.text.split('').map(function (c) { return S.lower[c]; }); boxH = 140; maxScale = 3.0; }
        var n = glyphs.length;
        var unitW = n * boxW + (n - 1) * gap;
        var s = Math.min(maxScale, 400 / boxH, 860 / unitW);
        var x0 = api.W / 2 - unitW * s / 2;
        var y0 = 120 + (420 - boxH * s) / 2;
        if (n === 1) {
          /* one letter or shape on its own: fit its real outline, so a small "s" is as big as a tall "l" */
          var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
          glyphs[0].forEach(function (st) {
            st.forEach(function (p) {
              minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]);
              minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]);
            });
          });
          s = Math.min(380 / Math.max(40, maxY - minY), 560 / Math.max(40, maxX - minX), 6);
          x0 = api.W / 2 - (minX + maxX) / 2 * s;
          y0 = 335 - (minY + maxY) / 2 * s;
        }
        var out = [];
        glyphs.forEach(function (g, gi) {
          g.forEach(function (stroke) {
            var pts = stroke.map(function (p) { return { x: x0 + (gi * (boxW + gap) + p[0]) * s, y: y0 + p[1] * s }; });
            out.push({ pts: resample(pts, 9), glyph: gi, width: Math.max(18, 10 * s) });
          });
        });
        return out;
      }

      function resample(pts, step) {
        var out = [pts[0]];
        var carry = 0;
        for (var j = 1; j < pts.length; j++) {
          var a = pts[j - 1], b = pts[j];
          var d = U.dist(a.x, a.y, b.x, b.y);
          var along = step - carry;
          while (along <= d) {
            out.push({ x: a.x + (b.x - a.x) * along / d, y: a.y + (b.y - a.y) * along / d });
            along += step;
          }
          carry = d - (along - step);
        }
        var last = pts[pts.length - 1];
        if (U.dist(out[out.length - 1].x, out[out.length - 1].y, last.x, last.y) > 2) { out.push(last); }
        return out;
      }

      function newRound() {
        round++;
        if (round > ROUNDS || !queue.length) {
          api.finish('The sky is full of stars!', 1);
          state = 'over';
          return;
        }
        item = queue.shift();
        strokes = layout(item);
        si = 0; k = 0; dragging = false; tail = []; idle = 0; ghostT = 0;
        state = 'trace'; timer = 0;
        api.setProgress(round, ROUNDS);
        var label = item.kind === 'shape' ? 'Trace' : item.kind === 'word' ? 'Trace the word' : item.kind === 'cap' ? 'Trace capital' : 'Trace the letter';
        api.setPrompt(label, { word: item.kind === 'shape' ? item.text.replace(/^an? /, '') : item.text, show: true, repeat: sayPrompt });
        sayPrompt();
      }

      function sayPrompt() {
        if (!item) { return; }
        if (item.kind === 'shape') { api.say('Trace ' + item.text + '. Start at the star!'); return; }
        if (item.kind === 'word') { api.say('Trace the word'); api.sayWord(item.text, { queue: true }); return; }
        if (item.kind === 'cap') { api.say('Trace capital ' + item.text); return; }
        api.say('Trace the letter');
        if (letters) { api.sayWord(item.text, { queue: true }); }
        else { api.say(item.text, { queue: true }); api.say(PH.soundHint(item.text), { queue: true, rate: 0.55 }); }
        api.say('Start at the star!', { queue: true });
      }

      function cur() { return strokes[si]; }

      /* ---------------- tracing ---------------- */
      function strokeDone() {
        api.sfx.twinkle();
        si++; k = 0;
        if (si >= strokes.length) {
          dragging = false;
          hits++;
          state = 'done'; timer = 0;
          api.addStar(1);
          api.sfx.great();
          celebrate();
          return;
        }
        /* keep going without lifting only if the next stroke starts right under the finger */
        var last = tail[tail.length - 1];
        if (!last || U.dist(last.x, last.y, cur().pts[0].x, cur().pts[0].y) > TOL) { dragging = false; }
      }

      function celebrate() {
        if (item.kind === 'shape') { api.say('Wow, ' + item.text + '!'); }
        else if (item.kind === 'word') { api.say('You wrote'); api.sayWord(item.text, { queue: true }); }
        else if (item.kind === 'cap') { api.say('Capital ' + item.text + '!'); }
        else if (letters) { api.sayWord(item.text); }
        else { api.say(item.text + '!'); }
        strokes.forEach(function (st) {
          for (var j = 0; j < st.pts.length; j += 6) {
            api.burst(st.pts[j].x, st.pts[j].y, ['#fff3a0', '#8ef0ff'], 1, { gravity: 0, minSpeed: 10, maxSpeed: 40, lift: 0, shape: 'star' });
          }
        });
      }

      function down(p) {
        if (state !== 'trace') { return; }
        idle = 0;
        var pts = cur().pts;
        if (U.dist(p.x, p.y, pts[k].x, pts[k].y) <= TOL + 14) {
          dragging = true;
          tail = [{ x: p.x, y: p.y, t: 0 }];
          if (pts.length <= 3) { k = pts.length - 1; strokeDone(); }   /* the dot on an i or j */
        } else {
          api.sfx.click();   /* a gentle nudge: start at the star */
        }
      }

      function move(p) {
        if (!dragging || state !== 'trace') { return; }
        idle = 0;
        tail.push({ x: p.x, y: p.y, t: 0 });
        if (tail.length > 40) { tail.shift(); }
        var pts = cur().pts;
        /* look a little way ahead so quick fingers are not left behind, but never skip corners */
        var best = -1;
        for (var j = k + 1; j <= Math.min(pts.length - 1, k + 6); j++) {
          if (U.dist(p.x, p.y, pts[j].x, pts[j].y) <= TOL) { best = j; }
        }
        if (best > 0) {
          k = best;
          if (k >= pts.length - 1) { strokeDone(); }
        } else if (U.dist(p.x, p.y, pts[k].x, pts[k].y) > TOL * 2.2) {
          /* wandered off: the comet fizzles back to the last good point, no harm done */
          dragging = false;
          fizz = 0.4;
          api.sfx.poof();
        }
      }

      function up() { dragging = false; }

      function update(dt) {
        tail.forEach(function (t) { t.t += dt; });
        tail = tail.filter(function (t) { return t.t < 0.5; });
        if (fizz > 0) { fizz -= dt; }
        if (state === 'trace') {
          idle += dt;
          ghostT += dt;
        } else if (state === 'done') {
          timer += dt;
          if (timer > 2.2) { newRound(); }
        }
      }

      /* ---------------- drawing ---------------- */
      function path(ctx, pts, upto) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (var j = 1; j <= upto; j++) { ctx.lineTo(pts[j].x, pts[j].y); }
      }

      function draw(ctx) {
        var now = performance.now() / 1000;
        var bg = ctx.createLinearGradient(0, 0, 0, api.H);
        bg.addColorStop(0, '#0b0930');
        bg.addColorStop(1, '#27185e');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, api.W, api.H);
        ctx.fillStyle = '#ffffff';
        stars.forEach(function (s) {
          ctx.globalAlpha = 0.3 + 0.5 * Math.abs(Math.sin(now + s.t));
          ctx.fillRect(s.x, s.y, s.r, s.r);
        });
        ctx.globalAlpha = 1;
        /* a soft nebula, a moon, and dark hills with a little house on the horizon */
        var neb = ctx.createRadialGradient(300, 260, 20, 300, 260, 380);
        neb.addColorStop(0, 'rgba(155,93,229,.22)'); neb.addColorStop(1, 'rgba(155,93,229,0)');
        ctx.fillStyle = neb; ctx.fillRect(0, 0, api.W, api.H);
        var mg = ctx.createRadialGradient(880, 90, 10, 880, 90, 90);
        mg.addColorStop(0, 'rgba(255,244,194,.6)'); mg.addColorStop(1, 'rgba(255,244,194,0)');
        ctx.fillStyle = mg; ctx.fillRect(790, 0, 180, 180);
        ctx.fillStyle = '#fff4c2'; ctx.beginPath(); ctx.arc(880, 90, 32, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.beginPath(); ctx.arc(870, 82, 7, 0, Math.PI * 2); ctx.arc(892, 102, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#140f3a';
        ctx.beginPath(); ctx.moveTo(0, api.H);
        for (var hx = 0; hx <= api.W; hx += 25) { ctx.lineTo(hx, api.H - 70 - Math.sin(hx * 0.006) * 30 - Math.sin(hx * 0.017) * 10); }
        ctx.lineTo(api.W, api.H); ctx.closePath(); ctx.fill();
        ctx.fillRect(120, api.H - 130, 40, 40);
        ctx.beginPath(); ctx.moveTo(114, api.H - 130); ctx.lineTo(140, api.H - 154); ctx.lineTo(166, api.H - 130); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffd43b'; ctx.fillRect(132, api.H - 118, 14, 12);
        if (!strokes.length) { return; }

        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        /* the guide: soft road with a dotted centre line */
        strokes.forEach(function (st) {
          ctx.strokeStyle = 'rgba(255,255,255,.12)';
          ctx.lineWidth = st.width * 2.2;
          path(ctx, st.pts, st.pts.length - 1); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,.55)';
          for (var j = 0; j < st.pts.length; j += 3) {
            ctx.beginPath(); ctx.arc(st.pts[j].x, st.pts[j].y, 3, 0, Math.PI * 2); ctx.fill();
          }
        });

        /* what has been painted so far */
        ctx.save();
        ctx.shadowColor = '#8ef0ff';
        ctx.shadowBlur = 18;
        strokes.forEach(function (st, n) {
          var upto = n < si || state !== 'trace' ? st.pts.length - 1 : (n === si ? k : -1);
          if (upto < 1) { return; }
          var g = ctx.createLinearGradient(st.pts[0].x, st.pts[0].y, st.pts[upto].x, st.pts[upto].y);
          g.addColorStop(0, '#8ef0ff');
          g.addColorStop(1, '#fff3a0');
          ctx.strokeStyle = g;
          ctx.lineWidth = st.width;
          path(ctx, st.pts, upto); ctx.stroke();
        });
        ctx.restore();

        if (state === 'trace') {
          var pts = cur().pts;
          /* the star to start from, pulsing; a small arrow shows the way to go */
          var p0 = pts[k];
          var pulse = 1 + Math.sin(now * 6) * 0.15;
          ctx.fillStyle = fizz > 0 ? '#ff8fa8' : '#ffd23f';
          U.star(ctx, p0.x, p0.y, 22 * pulse, 10 * pulse); ctx.fill();
          if (!dragging && pts.length > 4) {
            var a = pts[Math.min(k + 4, pts.length - 1)];
            var ang = Math.atan2(a.y - p0.y, a.x - p0.x);
            ctx.save();
            ctx.translate(p0.x + Math.cos(ang) * 40, p0.y + Math.sin(ang) * 40);
            ctx.rotate(ang);
            ctx.fillStyle = 'rgba(255,255,255,.85)';
            ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -11); ctx.lineTo(-8, 11); ctx.closePath(); ctx.fill();
            ctx.restore();
          }
          /* waited a while? a ghost star shows how the stroke goes */
          if (!dragging && idle > 2.5) {
            var span = pts.length - 1 - k;
            if (span > 0) {
              var gi = k + Math.floor(((ghostT * 40) % (span + 20)));
              if (gi <= pts.length - 1) {
                ctx.globalAlpha = 0.6;
                ctx.fillStyle = '#ffffff';
                U.star(ctx, pts[gi].x, pts[gi].y, 14, 6); ctx.fill();
                ctx.globalAlpha = 1;
              }
            }
          }
        } else {
          /* finished: the letter twinkles like a constellation */
          ctx.fillStyle = '#ffffff';
          strokes.forEach(function (st) {
            for (var j = 0; j < st.pts.length; j += 8) {
              var tw = 3 + Math.abs(Math.sin(now * 5 + j)) * 5;
              U.star(ctx, st.pts[j].x, st.pts[j].y, tw * 1.6, tw * 0.6); ctx.fill();
            }
          });
        }

        /* the comet tail following the finger */
        tail.forEach(function (t, n) {
          var life = 1 - t.t / 0.5;
          ctx.fillStyle = 'rgba(255,240,170,' + (life * 0.8) + ')';
          ctx.beginPath(); ctx.arc(t.x, t.y, 4 + life * 10 * (n / tail.length), 0, Math.PI * 2); ctx.fill();
        });
        if (dragging && tail.length) {
          var h = tail[tail.length - 1];
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#fff3a0'; ctx.shadowBlur = 20;
          ctx.beginPath(); ctx.arc(h.x, h.y, 13, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        }

        U.badge(ctx, api.W / 2, api.H - 56, 'Put your finger on the star and follow the dots', { align: 'center', icon: '⭐', size: 18 });
      }

      queue = plan();
      newRound();
      return { update: update, draw: draw, down: down, move: move, up: up,
        /* read-only peek at the state, used by automated play-through checks */
        debug: function () { return { item: item, strokes: strokes, si: si, k: k, state: state, round: round, queue: queue }; } };
    }
  };
})(window.PH = window.PH || {});
