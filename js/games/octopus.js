/* Octopus Treasure Hunt - chests carry look-alike words; the octopus opens the one you pick */
(function (PH) {
  'use strict';
  var U = PH.util;
  var EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';

  PH.games.octopus = {
    id: 'octopus',
    name: 'Octopus Treasure Hunt',
    icon: '🐙',
    blurb: 'The chests have words that look almost the same. Read carefully and pick the one you hear.',

    create: function (api) {
      var ROUNDS = 6;
      var OCTO = { x: api.W / 2, y: 236 };
      var round = 0, target = null, chests = [], recent = [], treasure = 0;
      var hits = 0, misses = 0, state = 'play', timer = 0, active = null;
      var reach = 0;   /* 0 = tentacle curled up, 1 = touching the chest */
      var bubbles = [];
      for (var b = 0; b < 18; b++) {
        bubbles.push({ x: U.rand(0, api.W), y: U.rand(0, api.H), r: U.rand(2, 7), v: U.rand(18, 50) });
      }

      function newRound() {
        round++;
        if (round > ROUNDS) {
          api.finish(null, hits + misses ? hits / (hits + misses) : 1);
          state = 'over';
          return;
        }
        var pool = api.words.filter(function (w) { return recent.indexOf(w.w) < 0; });
        target = U.pick(pool.length > 6 ? pool : api.words);
        recent.push(target.w);
        if (recent.length > 5) { recent.shift(); }

        var n = api.pre ? 3 : (round <= 2 ? 3 : 4);
        /* ages 3 and 4: other real pictures or letters, never made-up words */
        var misses3 = api.pre
          ? U.shuffle(api.words.filter(function (w) { return w.w !== target.w; })).slice(0, n - 1)
            .map(function (w) { return { w: w.w, real: true }; })
          : PH.nearMisses(target, api.words, n - 1);
        /* top up with ordinary words if the generator came up short */
        var extra = U.shuffle(api.words.filter(function (w) { return w.w !== target.w; }));
        while (misses3.length < n - 1 && extra.length) {
          var e = extra.pop();
          if (!misses3.some(function (m) { return m.w === e.w; })) { misses3.push({ w: e.w, real: true }); }
        }
        var list = U.shuffle([{ w: target.w, real: true, right: true }].concat(misses3));
        var xs = n === 3 ? [210, 500, 790] : [140, 380, 620, 860];
        var loot = U.shuffle(['🥾', '🐚', '🦀', '🧦', '🪸']);
        chests = list.map(function (item, i) {
          return {
            text: item.w, real: item.real, right: !!item.right,
            x: xs[i], y: 500, w: 176, h: 104,
            lid: 0, shake: 0, junk: loot[i % loot.length], opened: false
          };
        });
        active = null; reach = 0; state = 'play';
        api.setProgress(round, ROUNDS);
        api.setPrompt(api.mode === 'pictures' ? 'Find the treasure' : 'Find the treasure word', { word: target.w, repeat: sayPrompt });
        sayPrompt();
      }

      function sayPrompt() {
        api.say(api.mode === 'pictures' ? 'Which chest has the' : 'Which chest says');
        api.sayWord(target.w, { queue: true });
      }

      function down(p) {
        if (state !== 'play') { return; }
        for (var i = 0; i < chests.length; i++) {
          var c = chests[i];
          if (Math.abs(p.x - c.x) <= c.w / 2 + 6 && p.y >= c.y - c.h / 2 - 30 && p.y <= c.y + c.h / 2 + 10) {
            active = c; state = 'reach'; timer = 0;
            api.sfx.whoosh();
            return;
          }
        }
      }

      function update(dt) {
        bubbles.forEach(function (bb) {
          bb.y -= bb.v * dt;
          if (bb.y < -10) { bb.y = api.H + 10; bb.x = U.rand(0, api.W); }
        });
        chests.forEach(function (c) { if (c.shake > 0) { c.shake -= dt; } });

        if (state === 'reach') {
          timer += dt;
          reach = U.clamp(timer / 0.4, 0, 1);
          if (reach >= 1) { state = 'open'; timer = 0; api.sfx.clank(); }
        } else if (state === 'open') {
          timer += dt;
          active.lid = U.clamp(timer / 0.3, 0, 1);
          if (active.lid >= 1) {
            active.opened = true;
            state = 'result'; timer = 0;
            if (active.right) {
              hits++; treasure++;
              api.addStar(1);
              api.sfx.coins();
              api.burst(active.x, active.y - 40, ['#ffd23f', '#ffb000', '#fff3a0'], 34, { lift: 260 });
              api.say('Treasure!');
              api.sayWord(target.w, { queue: true });
            } else {
              misses++;
              active.shake = 0.5;
              api.sfx.boing();
              if (active.real) {
                api.say(api.mode === 'pictures' ? 'That is a' : 'That one says');
                api.sayWord(active.text, { queue: true });
              } else {
                api.say('Not that one. Look again.');
              }
            }
          }
        } else if (state === 'result') {
          timer += dt;
          if (timer > 1.5) {
            if (active.right) { newRound(); return; }
            state = 'close'; timer = 0;
          }
        } else if (state === 'close') {
          timer += dt;
          active.lid = U.clamp(1 - timer / 0.25, 0, 1);
          reach = U.clamp(1 - timer / 0.35, 0, 1);
          if (reach <= 0) { active.opened = false; active = null; state = 'play'; }
        }
      }

      /* a tapered tentacle from the octopus to (tx, ty) */
      function tentacle(ctx, sx, sy, tx, ty, bend, width, color, suckers) {
        var cx = (sx + tx) / 2 + bend, cy = (sy + ty) / 2;
        var steps = 22, prev = null, i;
        ctx.lineCap = 'round';
        ctx.strokeStyle = color;
        for (i = 0; i <= steps; i++) {
          var t = i / steps;
          var x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * tx;
          var y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ty;
          if (prev) {
            ctx.lineWidth = width * (1 - t * 0.75);
            ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(x, y); ctx.stroke();
            if (suckers && i % 3 === 0) {
              ctx.fillStyle = '#ffd1e3';
              ctx.beginPath(); ctx.arc(x, y + ctx.lineWidth * 0.25, ctx.lineWidth * 0.18, 0, Math.PI * 2); ctx.fill();
            }
          }
          prev = { x: x, y: y };
        }
      }

      function drawOctopus(ctx) {
        var t = performance.now() / 1000;
        var ox = OCTO.x, oy = OCTO.y + Math.sin(t * 1.6) * 8;
        /* idle legs */
        for (var i = 0; i < 7; i++) {
          var a = -0.9 + i * 0.3;
          var lx = ox + Math.sin(a) * 150 + Math.sin(t * 2 + i) * 16;
          var ly = oy + 120 + Math.cos(a) * 20 + Math.cos(t * 2.3 + i) * 10;
          tentacle(ctx, ox + (i - 3) * 16, oy + 40, lx, ly, Math.sin(t * 2 + i) * 40, 24, '#e2568f', true);
        }
        /* the reaching leg */
        if (active && reach > 0) {
          var tx = U.lerp(ox, active.x, reach);
          var ty = U.lerp(oy + 80, active.y - active.h / 2 - 6, reach);
          tentacle(ctx, ox, oy + 40, tx, ty, (active.x < ox ? -1 : 1) * 60 * (1 - reach), 28, '#ef6aa0', true);
        }
        /* head */
        var g = ctx.createRadialGradient(ox - 30, oy - 40, 10, ox, oy, 100);
        g.addColorStop(0, '#ffa6c9');
        g.addColorStop(1, '#e2568f');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(ox, oy - 10, 92, 84, 0, 0, Math.PI * 2); ctx.fill();
        [-32, 32].forEach(function (ex) {
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(ox + ex, oy - 20, 22, 0, Math.PI * 2); ctx.fill();
          var look = active ? U.clamp((active.x - ox) / 300, -1, 1) * 7 : 0;
          ctx.fillStyle = '#1f2340';
          ctx.beginPath(); ctx.arc(ox + ex + look, oy - 14, 10, 0, Math.PI * 2); ctx.fill();
        });
        ctx.strokeStyle = '#8a1f4f';
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(ox, oy + 16, 18, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.beginPath(); ctx.ellipse(ox - 40, oy - 58, 22, 12, -0.5, 0, Math.PI * 2); ctx.fill();
      }

      function drawChest(ctx, c) {
        var dx = c.shake > 0 ? Math.sin(c.shake * 60) * 8 : 0;
        var x = c.x - c.w / 2 + dx, y = c.y - c.h / 2;
        ctx.save();
        /* inside glow + contents once open */
        if (c.lid > 0.3) {
          if (c.right) {
            ctx.fillStyle = 'rgba(255,220,90,' + (0.5 * c.lid) + ')';
            ctx.beginPath(); ctx.arc(c.x + dx, y, 90, 0, Math.PI * 2); ctx.fill();
          }
          ctx.font = '54px ' + EMOJI;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(c.right ? '💎' : c.junk, c.x + dx, y - 26 * c.lid);
        }
        /* box */
        ctx.fillStyle = '#9c5b2e';
        U.roundRect(ctx, x, y, c.w, c.h, 12); ctx.fill();
        ctx.fillStyle = '#7a4320';
        ctx.fillRect(x, y + 18, c.w, 10);
        ctx.fillStyle = '#e8b64a';
        ctx.fillRect(x + 14, y, 12, c.h);
        ctx.fillRect(x + c.w - 26, y, 12, c.h);
        /* word plaque */
        var shown = api.label(c.text);
        var fs = api.mode === 'letters' ? 40 : (shown.length > 7 ? 20 : (shown.length > 5 ? 25 : 30));
        ctx.fillStyle = '#fff6dc';
        U.roundRect(ctx, x + 22, y + 38, c.w - 44, 50, 10); ctx.fill();
        ctx.fillStyle = '#3b2412';
        ctx.font = U.font(fs);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(shown, c.x + dx, y + 64);
        /* lid, hinged at the back */
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, 1 - c.lid * 1.6);
        ctx.fillStyle = '#b36a36';
        U.roundRect(ctx, 0, -30, c.w, 32, 14); ctx.fill();
        ctx.fillStyle = '#e8b64a';
        ctx.fillRect(c.w / 2 - 10, -18, 20, 20);
        ctx.restore();
        ctx.restore();
      }

      function draw(ctx) {
        var sea = ctx.createLinearGradient(0, 0, 0, api.H);
        sea.addColorStop(0, '#46c3e8');
        sea.addColorStop(1, '#0d3f6e');
        ctx.fillStyle = sea;
        ctx.fillRect(0, 0, api.W, api.H);

        ctx.fillStyle = 'rgba(255,255,255,.35)';
        bubbles.forEach(function (bb) { ctx.beginPath(); ctx.arc(bb.x, bb.y, bb.r, 0, Math.PI * 2); ctx.fill(); });

        /* sand + rocks + weed */
        ctx.fillStyle = '#e9cf93';
        ctx.beginPath();
        ctx.moveTo(0, api.H);
        ctx.lineTo(0, 540);
        ctx.quadraticCurveTo(250, 510, 500, 545);
        ctx.quadraticCurveTo(760, 575, api.W, 530);
        ctx.lineTo(api.W, api.H);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#2f9e6b';
        [40, 960, 270, 730].forEach(function (sx, k) {
          ctx.save();
          ctx.translate(sx, 560);
          ctx.rotate(Math.sin(performance.now() / 800 + k) * 0.15);
          U.roundRect(ctx, -8, -130, 16, 132, 8); ctx.fill();
          ctx.restore();
        });

        drawOctopus(ctx);
        chests.forEach(function (c) { drawChest(ctx, c); });

        ctx.font = '28px ' + EMOJI;
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText('💰', 22, 40);
        ctx.fillStyle = '#fff';
        ctx.font = U.font(26);
        ctx.fillText('x ' + treasure, 62, 42);
      }

      newRound();
      return { update: update, draw: draw, down: down };
    }
  };
})(window.PH = window.PH || {});
