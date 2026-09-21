/* Leaky Pipes - hear the sounds one at a time, blend them, and patch the leak with that word */
(function (PH) {
  'use strict';
  var U = PH.util;

  PH.games.pipes = {
    id: 'pipes',
    name: 'Leaky Pipes',
    icon: '🔧',
    blurb: 'You hear a word one sound at a time. Blend the sounds together and fix that leak before the basement floods!',

    create: function (api) {
      var FIXES = 8;
      var PIPES = [168, 308, 448];
      var SPOT_X = [210, 430, 650, 870];
      var MAX_LEAKS = api.mode === 'pictures' ? 2 : (api.level.id <= 2 ? 3 : 4);
      /* ages 3 and 4 blend picture words by ear */
      var WORDS = api.pre ? PH.PICTURES : api.words;
      function partsOf(w) {
        if (api.pre) {
          if (api.mode === 'pictures' && w.g.length > 1) { return w.g; }          /* ba - na - na */
          var first = PH.firstSound(w);
          return [PH.soundHint(first), w.w.slice(first.length)];                   /* c - at */
        }
        return syllables ? w.g : PH.soundHintsFor(w);
      }
      var syllables = api.level.id === 5;
      var spots = [], drops = [], recent = [];
      var fixed = 0, hits = 0, misses = 0, state = 'play', timer = 0;
      var target = null, depth = 50, glug = 0, spawnT = 0;
      PIPES.forEach(function (py, r) {
        SPOT_X.forEach(function (sx) { spots.push({ x: sx, y: py, row: r, leak: null, patched: false, patchT: 0 }); });
      });

      function active() { return spots.filter(function (s) { return s.leak; }); }

      function spawnLeak() {
        var free = spots.filter(function (s) { return !s.leak && !s.patched; });
        if (!free.length) { free = spots.filter(function (s) { return !s.leak; }); }
        if (!free.length) { return; }
        var spot = U.pick(free);
        var inUse = active().map(function (s) { return s.leak.word.w; });
        var pool = WORDS.filter(function (w) { return inUse.indexOf(w.w) < 0 && recent.indexOf(w.w) < 0; });
        if (!pool.length) { pool = WORDS.filter(function (w) { return inUse.indexOf(w.w) < 0; }); }
        /* often pick a look-alike of a leak already spraying, so blending really matters */
        var alike = pool.filter(function (w) {
          return active().some(function (s) {
            return PH.firstSound(s.leak.word) === PH.firstSound(w) || s.leak.word.rime === w.rime;
          });
        });
        var word = U.pick(alike.length && Math.random() < 0.6 ? alike : pool);
        spot.patched = false;
        spot.leak = { word: word, age: 0, burst: 0, wobble: 0 };
        api.sfx.drip();
      }

      function chooseTarget() {
        var list = active();
        if (!list.length) { target = null; return; }
        var others = list.filter(function (s) { return !target || s.leak.word.w !== target.w; });
        target = U.pick(others.length ? others : list).leak.word;
        recent.push(target.w);
        if (recent.length > 6) { recent.shift(); }
        api.setPrompt('Blend the sounds', { word: target.w, repeat: sayPrompt });
        sayPrompt();
      }

      /* the whole point: say the parts, never the word */
      function sayPrompt() {
        if (!target) { return; }
        var parts = partsOf(target);
        api.say(syllables && !api.pre ? 'Clap it together.' : 'Blend the sounds.');
        parts.forEach(function (p) {
          api.say(p, { rate: 0.5, queue: true });
        });
      }

      function down(p) {
        if (state !== 'play' || !target) { return; }
        var list = active();
        for (var i = 0; i < list.length; i++) {
          var s = list[i];
          if (Math.abs(p.x - s.x) <= 90 && p.y >= s.y - 90 && p.y <= s.y + 40) {
            if (s.leak.word.w === target.w) {
              hits++; fixed++;
              api.addStar(1);
              api.sfx.clank();
              api.say('Fixed!');
              api.sayWord(target.w, { queue: true });
              api.burst(s.x, s.y, ['#9fb4c7', '#ffffff', '#ffd23f'], 14, { gravity: 300 });
              s.leak = null; s.patched = true; s.patchT = 0.5;
              depth = Math.max(30, depth - 55);
              api.setProgress(fixed, FIXES);
              if (fixed >= FIXES) {
                state = 'over';
                api.say('All the leaks are fixed!', { queue: true });
                api.finish(null, hits + misses ? hits / (hits + misses) : 1);
                return;
              }
              state = 'pause'; timer = 0;
            } else {
              misses++;
              s.leak.burst = 0.8; s.leak.wobble = 0.5;
              api.sfx.splash();
              api.say('That one says');
              api.sayWord(s.leak.word.w, { queue: true });
              api.say('Listen again.', { queue: true });
              var parts = partsOf(target);
              parts.forEach(function (pp) {
                api.say(pp, { rate: 0.5, queue: true });
              });
            }
            return;
          }
        }
      }

      function update(dt) {
        var list = active();
        list.forEach(function (s) {
          var L = s.leak;
          L.age += dt;
          if (L.burst > 0) { L.burst -= dt; }
          if (L.wobble > 0) { L.wobble -= dt; }
          var n = L.burst > 0 ? 5 : 1.6;
          if (Math.random() < n * dt * 8) {
            drops.push({ x: s.x + U.rand(-4, 4), y: s.y + 12, vx: U.rand(-70, 70) * (L.burst > 0 ? 2 : 1), vy: U.rand(-40, 30), life: 1.6 });
          }
        });
        spots.forEach(function (s) { if (s.patchT > 0) { s.patchT -= dt; } });

        var waterY = api.H - depth;
        for (var i = drops.length - 1; i >= 0; i--) {
          var d = drops[i];
          d.vy += 700 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt;
          if (d.y >= waterY || d.life <= 0) { drops.splice(i, 1); }
        }

        if (state === 'play' || state === 'pause') {
          depth += list.length * (0.9 + api.level.id * 0.25) * dt;
          if (depth >= api.H - PIPES[0] - 10 && glug <= 0) {
            glug = 2.2;
            api.sfx.rumble();
            api.say('Glug glug! The drain opened. Phew!', { rate: 0.9 });
          }
        }
        if (glug > 0) {
          glug -= dt;
          depth = Math.max(140, depth - 220 * dt);
        }

        if (state === 'play') {
          spawnT -= dt;
          if (list.length < MAX_LEAKS && spawnT <= 0) {
            spawnLeak();
            spawnT = 0.25;
            if (!target && active().length) { chooseTarget(); }
          }
          if (!target && active().length) { chooseTarget(); }
        } else if (state === 'pause') {
          timer += dt;
          if (timer > 1.1) {
            state = 'play'; target = null;
            fillLeaks();
            chooseTarget();
          }
        }
      }

      function drawPipes(ctx) {
        ctx.lineCap = 'round';
        /* feed pipe on the left joining the three runs */
        ctx.strokeStyle = '#7d8ea3'; ctx.lineWidth = 34;
        ctx.beginPath(); ctx.moveTo(60, 60); ctx.lineTo(60, PIPES[2]); ctx.stroke();
        PIPES.forEach(function (py) {
          ctx.strokeStyle = '#7d8ea3'; ctx.lineWidth = 34;
          ctx.beginPath(); ctx.moveTo(60, py); ctx.lineTo(api.W - 40, py); ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 6;
          ctx.beginPath(); ctx.moveTo(66, py - 9); ctx.lineTo(api.W - 46, py - 9); ctx.stroke();
          for (var x = 150; x < api.W - 40; x += 220) {
            ctx.fillStyle = '#5f6f83';
            ctx.fillRect(x - 6, py - 22, 12, 44);
          }
        });
        /* valve wheel */
        ctx.strokeStyle = '#ff5d5d'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(60, 90, 22, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(38, 90); ctx.lineTo(82, 90); ctx.moveTo(60, 68); ctx.lineTo(60, 112); ctx.stroke();
      }

      function drawSpot(ctx, s) {
        if (s.patched) {
          var pop = s.patchT > 0 ? 1 + s.patchT * 0.6 : 1;
          ctx.save();
          ctx.translate(s.x, s.y);
          ctx.scale(pop, pop);
          ctx.fillStyle = '#cfd6e2';
          U.roundRect(ctx, -26, -22, 52, 44, 8); ctx.fill();
          ctx.fillStyle = '#5f6f83';
          [[-17, -13], [17, -13], [-17, 13], [17, 13]].forEach(function (b) {
            ctx.beginPath(); ctx.arc(b[0], b[1], 4, 0, Math.PI * 2); ctx.fill();
          });
          ctx.restore();
          return;
        }
        if (!s.leak) { return; }
        var L = s.leak;
        var dx = L.wobble > 0 ? Math.sin(L.wobble * 50) * 6 : 0;
        ctx.fillStyle = '#1f2a38';
        ctx.beginPath(); ctx.ellipse(s.x, s.y + 6, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
        /* word tag hanging above the hole */
        var shown = api.label(L.word.w);
        var fs = shown.length > 7 ? 20 : 26;
        ctx.font = U.font(fs);
        var tw = ctx.measureText(shown).width + 26;
        var ty = s.y - 64;
        ctx.fillStyle = L.wobble > 0 ? '#ffd7de' : '#fffaf0';
        U.roundRect(ctx, s.x - tw / 2 + dx, ty - 20, tw, 40, 12); ctx.fill();
        ctx.strokeStyle = '#4d8dff'; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = '#1f2340';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(shown, s.x + dx, ty + 1);
        ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(s.x + dx, ty + 20); ctx.lineTo(s.x, s.y - 16); ctx.stroke();
      }

      function draw(ctx) {
        ctx.fillStyle = '#6b5a55';
        ctx.fillRect(0, 0, api.W, api.H);
        /* bricks */
        for (var r = 0; r < 20; r++) {
          for (var c = -1; c < 15; c++) {
            ctx.fillStyle = (r + c) % 3 ? '#76625c' : '#7e6a63';
            ctx.fillRect(c * 76 + (r % 2 ? 38 : 0) + 2, r * 34 + 2, 72, 30);
          }
        }
        drawPipes(ctx);
        spots.forEach(function (s) { drawSpot(ctx, s); });

        ctx.fillStyle = '#6fd0ff';
        drops.forEach(function (d) { ctx.beginPath(); ctx.arc(d.x, d.y, 4, 0, Math.PI * 2); ctx.fill(); });

        /* water */
        var now = performance.now() / 1000;
        var wy = api.H - depth;
        ctx.fillStyle = 'rgba(40,140,220,.62)';
        ctx.beginPath();
        ctx.moveTo(0, api.H);
        for (var x = 0; x <= api.W; x += 20) { ctx.lineTo(x, wy + Math.sin(x / 40 + now * 2.2) * 5); }
        ctx.lineTo(api.W, api.H); ctx.closePath(); ctx.fill();

        /* rubber duck riding the water */
        var duckX = 520 + Math.sin(now * 0.5) * 300;
        var duckY = wy + Math.sin(duckX / 40 + now * 2.2) * 5 - 14;
        ctx.save();
        ctx.translate(duckX, duckY);
        ctx.rotate(Math.sin(now * 2) * 0.1);
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath(); ctx.ellipse(0, 0, 30, 18, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(18, -20, 14, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff9f40';
        ctx.beginPath(); ctx.moveTo(30, -22); ctx.lineTo(44, -18); ctx.lineTo(30, -14); ctx.fill();
        ctx.fillStyle = '#1f2340';
        ctx.beginPath(); ctx.arc(22, -24, 3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        /* flood gauge */
        var full = U.clamp(depth / (api.H - PIPES[0]), 0, 1);
        ctx.fillStyle = 'rgba(31,35,64,.8)';
        U.roundRect(ctx, api.W - 250, 14, 236, 44, 14); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.2)';
        U.roundRect(ctx, api.W - 150, 28, 124, 16, 8); ctx.fill();
        ctx.fillStyle = full < 0.5 ? '#6fd0ff' : (full < 0.8 ? '#ffd23f' : '#ff5d8f');
        U.roundRect(ctx, api.W - 150, 28, Math.max(16, 124 * full), 16, 8); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = U.font(18);
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText('Flood', api.W - 236, 37);

        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.font = U.font(22);
        ctx.fillText('Fixed ' + fixed + ' / ' + FIXES, 110, 36);
      }

      function fillLeaks() {
        for (var guard = 0; guard < 10 && active().length < MAX_LEAKS; guard++) { spawnLeak(); }
      }

      /* every leak is spraying before the first sounds are spoken, so there is a real choice */
      api.setProgress(0, FIXES);
      fillLeaks();
      chooseTarget();
      return { update: update, draw: draw, down: down };
    }
  };
})(window.PH = window.PH || {});
