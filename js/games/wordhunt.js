/* Find Them All - hear a word, tap every copy of it drifting around the meadow */
(function (PH) {
  'use strict';
  var U = PH.util;

  PH.games.wordhunt = {
    id: 'wordhunt',
    name: 'Find Them All',
    icon: '🔍',
    blurb: 'Listen to the word, then tap every copy hiding in the meadow.',

    create: function (api) {
      var ROUNDS = 6, SLOTS = api.mode === 'pictures' ? 8 : 12;
      var words = api.words;
      var round = 0, target = null, tiles = [], state = 'play', timer = 0;
      var hits = 0, misses = 0, recent = [];
      var clouds = [];
      for (var c = 0; c < 4; c++) {
        clouds.push({ x: U.rand(0, api.W), y: U.rand(40, 190), s: U.rand(0.6, 1.3), v: U.rand(6, 16) });
      }

      function similarTo(w) {
        var same = words.filter(function (o) {
          return o.w !== w.w && (o.rime === w.rime || o.g[0] === w.g[0]);
        });
        return same;
      }

      function measure(ctx, text) {
        var fs = api.mode === 'pictures' ? 34
          : api.mode === 'letters' ? 54
          : (text.length > 7 ? 26 : (text.length > 5 ? 32 : 38));
        var m = U.measureTile(ctx, text, fs, 20, api.mode === 'pictures' ? 22 : 14);
        m.fs = fs;
        return m;
      }

      function newRound() {
        round++;
        if (round > ROUNDS) {
          var acc = hits + misses ? hits / (hits + misses) : 1;
          api.finish(null, acc);
          state = 'over';
          return;
        }
        var pool = words.filter(function (w) { return recent.indexOf(w.w) < 0; });
        target = U.pick(pool.length > 6 ? pool : words);
        recent.push(target.w);
        if (recent.length > 5) { recent.shift(); }

        var copies = api.pre ? (round <= 3 ? 2 : 3) : (round <= 2 ? 2 : (round <= 4 ? 3 : 4));
        var sim = U.shuffle(similarTo(target));
        var others = U.shuffle(words.filter(function (o) {
          return o.w !== target.w && sim.indexOf(o) < 0;
        }));
        var fillers = sim.slice(0, Math.min(4, sim.length)).concat(others);
        var list = [];
        var i;
        for (i = 0; i < copies; i++) { list.push({ word: target, isTarget: true }); }
        for (i = 0; list.length < SLOTS && i < fillers.length; i++) {
          list.push({ word: fillers[i], isTarget: false });
        }
        list = U.shuffle(list);

        /* lay them out on a jittered 4 x 3 grid so nothing starts on top of anything */
        var cols = 4, rows = 3;
        var x0 = 70, x1 = api.W - 70, y0 = 120, y1 = api.H - 90;
        var cw = (x1 - x0) / cols, ch = (y1 - y0) / rows;
        /* spread the tiles over every grid slot, even when there are fewer tiles than slots */
        var slotOrder = U.shuffle(Array.apply(null, Array(cols * rows)).map(function (_, k) { return k; }));
        var ctx = PH.Engine.ctx;

        tiles = list.map(function (item, k) {
          var slot = slotOrder[k];
          var cx = x0 + (slot % cols) * cw + cw / 2 + U.rand(-16, 16);
          var cy = y0 + Math.floor(slot / cols) * ch + ch / 2 + U.rand(-14, 14);
          var m = measure(ctx, api.label(item.word.w));
          var a = U.rand(0, Math.PI * 2);
          var sp = U.rand(8, 20);
          return {
            word: item.word, isTarget: item.isTarget,
            w: m.w, h: m.h, fs: m.fs,
            x: U.clamp(cx - m.w / 2, 10, api.W - m.w - 10),
            y: U.clamp(cy - m.h / 2, 100, api.H - m.h - 12),
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            tilt: U.rand(-0.05, 0.05),
            color: item.isTarget ? '#ffffff' : '#ffffff',
            wobble: 0, pop: -1, found: false
          };
        });

        api.setProgress(round, ROUNDS);
        api.setPrompt('Find every', { word: target.w, repeat: sayPrompt });
        state = 'play';
        sayPrompt();
      }

      function sayPrompt() {
        api.say('Find every');
        api.sayWord(target.w, { queue: true });
      }

      function remaining() {
        var n = 0;
        tiles.forEach(function (t) { if (t.isTarget && !t.found) { n++; } });
        return n;
      }

      function down(p) {
        if (state !== 'play') { return; }
        for (var i = tiles.length - 1; i >= 0; i--) {
          var t = tiles[i];
          if (t.found || t.pop >= 0) { continue; }
          if (p.x >= t.x && p.x <= t.x + t.w && p.y >= t.y && p.y <= t.y + t.h) {
            if (t.isTarget) {
              t.found = true; t.pop = 0;
              hits++;
              api.addStar(1);
              api.sfx.pop();
              api.burst(t.x + t.w / 2, t.y + t.h / 2, null, 16);
              if (remaining() === 0) {
                state = 'between'; timer = 0;
                api.sfx.great();
                api.say('You found them all!');
              } else {
                api.say(remaining() === 1 ? 'One more' : remaining() + ' more', { rate: 0.9 });
              }
            } else {
              misses++;
              t.wobble = 0.45;
              api.sfx.bad();
            }
            return;
          }
        }
      }

      function update(dt) {
        clouds.forEach(function (cl) {
          cl.x += cl.v * dt;
          if (cl.x > api.W + 90) { cl.x = -90; }
        });
        tiles.forEach(function (t) {
          if (t.pop >= 0) { t.pop += dt * 2.8; return; }
          t.x += t.vx * dt; t.y += t.vy * dt;
          if (t.x < 8) { t.x = 8; t.vx = Math.abs(t.vx); }
          if (t.x + t.w > api.W - 8) { t.x = api.W - 8 - t.w; t.vx = -Math.abs(t.vx); }
          if (t.y < 96) { t.y = 96; t.vy = Math.abs(t.vy); }
          if (t.y + t.h > api.H - 10) { t.y = api.H - 10 - t.h; t.vy = -Math.abs(t.vy); }
          if (t.wobble > 0) { t.wobble -= dt; }
        });
        /* keep tiles from piling up on each other - overlapping words are hard to read */
        for (var i = 0; i < tiles.length; i++) {
          for (var j = i + 1; j < tiles.length; j++) {
            var a = tiles[i], b = tiles[j];
            if (a.pop >= 0 || b.pop >= 0) { continue; }
            var ax = a.x + a.w / 2, ay = a.y + a.h / 2;
            var bx = b.x + b.w / 2, by = b.y + b.h / 2;
            var ox = (a.w + b.w) / 2 + 8 - Math.abs(ax - bx);
            var oy = (a.h + b.h) / 2 + 8 - Math.abs(ay - by);
            if (ox > 0 && oy > 0) {
              if (ox < oy) {
                var sx = (ax < bx) ? -1 : 1;
                a.x += sx * ox / 2; b.x -= sx * ox / 2;
                a.vx = Math.abs(a.vx) * sx; b.vx = -Math.abs(b.vx) * sx;
              } else {
                var sy = (ay < by) ? -1 : 1;
                a.y += sy * oy / 2; b.y -= sy * oy / 2;
                a.vy = Math.abs(a.vy) * sy; b.vy = -Math.abs(b.vy) * sy;
              }
            }
          }
        }
        tiles = tiles.filter(function (t) { return t.pop < 1.2; });

        if (state === 'between') {
          timer += dt;
          if (timer > 1.1) { newRound(); }
        }
      }

      function draw(ctx) {
        /* meadow */
        var sky = ctx.createLinearGradient(0, 0, 0, api.H);
        sky.addColorStop(0, '#bfe9ff');
        sky.addColorStop(0.62, '#e8f7ff');
        sky.addColorStop(0.63, '#a8e6a1');
        sky.addColorStop(1, '#6fce7a');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, api.W, api.H);

        ctx.fillStyle = '#ffe66d';
        ctx.beginPath(); ctx.arc(895, 88, 46, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,.85)';
        clouds.forEach(function (cl) {
          ctx.save(); ctx.translate(cl.x, cl.y); ctx.scale(cl.s, cl.s);
          ctx.beginPath();
          ctx.arc(0, 0, 26, 0, Math.PI * 2);
          ctx.arc(30, 6, 20, 0, Math.PI * 2);
          ctx.arc(-28, 8, 18, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        var left = remaining();
        ctx.font = U.font(26);
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(31,35,64,.75)';
        ctx.fillText(left > 0 ? 'Still hiding: ' + left : 'All found!', 26, 52);

        tiles.forEach(function (t) {
          var scale = 1, alpha = 1, rot = t.tilt;
          if (t.pop >= 0) {
            scale = 1 + t.pop * 0.55;
            alpha = U.clamp(1 - t.pop, 0, 1);
          }
          if (t.wobble > 0) { rot += Math.sin(t.wobble * 60) * 0.14; }
          ctx.save();
          ctx.globalAlpha = alpha;
          U.tile(ctx, {
            x: t.x, y: t.y, w: t.w, h: t.h, r: 18,
            text: api.label(t.word.w), fontSize: t.fs,
            fill: t.wobble > 0 ? '#ffd7de' : '#ffffff',
            stroke: t.wobble > 0 ? '#ff5d8f' : 'rgba(31,35,64,.12)',
            lineWidth: t.wobble > 0 ? 5 : 3,
            rot: rot, scale: scale
          });
          ctx.restore();
        });
      }

      newRound();
      return { update: update, draw: draw, down: down };
    }
  };
})(window.PH = window.PH || {});
