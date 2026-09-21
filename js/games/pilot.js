/* Pilot Wings - a word is missing a sound; steer the plane through the ring that fills the gap */
(function (PH) {
  'use strict';
  var U = PH.util;

  PH.games.pilot = {
    id: 'pilot',
    name: 'Pilot Wings',
    icon: '✈️',
    blurb: 'A word has a sound missing. Steer your plane through the ring that fills the gap.',

    create: function (api) {
      var ROUNDS = 6;
      var PLANE_X = 190;
      var LANES = [190, 340, 490];
      var SPEED = api.pre ? 95 : 120 + api.level.id * 10;
      var round = 0, target = null, gap = 0, answer = '', wave = null, recent = [];
      var hits = 0, misses = 0, state = 'fly', timer = 0, spawnT = 0.6;
      var plane = { y: LANES[1], want: LANES[1], vy: 0 };
      var dragging = false, flash = 0, flashGood = false;
      var clouds = [], hills = [], trail = [], i;
      for (i = 0; i < 7; i++) { clouds.push({ x: U.rand(0, api.W), y: U.rand(60, 520), s: U.rand(0.5, 1.2) }); }
      for (i = 0; i < 6; i++) { hills.push({ x: i * 220, h: U.rand(50, 110) }); }

      var byClass = { v: {}, c: {} };
      api.words.forEach(function (w) { w.g.forEach(function (g) { byClass[PH.graphemeClass(g)][g] = 1; }); });

      function chooseGap(w) {
        var idx = [];
        var n = PH.soundGraphemes(w).length;
        for (var k = 0; k < n; k++) { idx.push(k); }
        if (api.level.id === 1 && Math.random() < 0.7) {
          var v = idx.filter(function (k) { return PH.graphemeClass(w.g[k]) === 'v'; });
          if (v.length) { return U.pick(v); }
        }
        if (api.level.id >= 2 && api.level.id <= 4 && Math.random() < 0.7) {
          var multi = idx.filter(function (k) { return w.g[k].length > 1; });
          if (multi.length) { return U.pick(multi); }
        }
        return U.pick(idx);
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
        gap = chooseGap(target);
        answer = api.pre ? target.w : target.g[gap];
        api.setProgress(round, ROUNDS);
        api.setPrompt(api.pre ? 'Fly through the' : 'Fill the gap in', { word: target.w, repeat: sayPrompt });
        sayPrompt();
        spawnT = 1.4;
        wave = null;
      }

      function sayPrompt() {
        if (api.pre) {
          api.say('Fly through the');
          api.sayWord(target.w, { queue: true });
          return;
        }
        api.say('Fly through the missing sound in');
        api.sayWord(target.w, { queue: true });
      }

      function spawnWave() {
        /* ages 3 and 4: the rings hold whole pictures or letters */
        var bank = api.pre ? api.words.map(function (w) { return w.w; }) : Object.keys(byClass[PH.graphemeClass(answer)]);
        var others = U.shuffle(bank.filter(function (g) {
          return g !== answer;
        })).slice(0, 2);
        while (others.length < 2) { others.push(U.pick(['m', 's', 't', 'a', 'o'].filter(function (g) { return g !== answer && others.indexOf(g) < 0; }))); }
        var labels = U.shuffle([answer].concat(others));
        wave = {
          x: api.W + 70, judged: false,
          rings: labels.map(function (g, k) { return { y: LANES[k], g: g, right: g === answer, hit: 0 }; })
        };
      }

      function judge() {
        wave.judged = true;
        var best = null, bd = 80;
        wave.rings.forEach(function (r) {
          var d = Math.abs(r.y - plane.y);
          if (d < bd) { bd = d; best = r; }
        });
        if (!best) {
          api.sfx.boing();
          api.say('Whoops, you flew past. Try again!');
          state = 'retry'; timer = 0;
          return;
        }
        best.hit = 1;
        if (best.right) {
          hits++;
          api.addStar(1);
          api.sfx.great();
          flash = 1.4; flashGood = true;
          api.burst(PLANE_X + 30, best.y, null, 30, { lift: 60 });
          api.say('Yes!');
          api.sayWord(target.w, { queue: true });
          state = 'won'; timer = 0;
        } else {
          misses++;
          api.sfx.bad();
          flash = 1; flashGood = false;
          if (api.pre) {
            api.say(api.mode === 'pictures' ? 'That was the' : 'That was');
            api.sayWord(best.g, { queue: true });
          } else {
            api.say('That makes');
            var made = target.g.slice(); made[gap] = best.g;
            if (PH.isClean(made.join(''))) { api.sayWord(made.join(''), { queue: true }); }
          }
          api.say('Listen again.', { queue: true });
          api.sayWord(target.w, { queue: true });
          state = 'retry'; timer = 0;
        }
      }

      function steerTo(y) { plane.want = U.clamp(y, 110, 560); }

      function down(p) { dragging = true; steerTo(p.y); }
      function move(p) { if (dragging) { steerTo(p.y); } }
      function up() { dragging = false; }
      function key(e) {
        if (e.key === 'ArrowUp') { e.preventDefault(); steerTo(nearestLane(plane.want) - 150); }
        if (e.key === 'ArrowDown') { e.preventDefault(); steerTo(nearestLane(plane.want) + 150); }
      }
      function nearestLane(y) {
        var best = LANES[0];
        LANES.forEach(function (l) { if (Math.abs(l - y) < Math.abs(best - y)) { best = l; } });
        return best;
      }

      function update(dt) {
        clouds.forEach(function (c) {
          c.x -= SPEED * 0.4 * c.s * dt;
          if (c.x < -140) { c.x = api.W + 140; c.y = U.rand(60, 520); }
        });
        hills.forEach(function (h) {
          h.x -= SPEED * 0.6 * dt;
          if (h.x < -220) { h.x += 6 * 220; h.h = U.rand(50, 110); }
        });

        var prevY = plane.y;
        plane.y += (plane.want - plane.y) * Math.min(1, dt * 5);
        plane.vy = (plane.y - prevY) / Math.max(dt, 0.001);
        trail.push({ x: PLANE_X - 40, y: plane.y + 8, life: 0.6 });
        for (var t = trail.length - 1; t >= 0; t--) {
          trail[t].life -= dt; trail[t].x -= SPEED * dt;
          if (trail[t].life <= 0) { trail.splice(t, 1); }
        }
        if (flash > 0) { flash -= dt; }

        if (state === 'fly') {
          if (!wave) {
            spawnT -= dt;
            if (spawnT <= 0) { spawnWave(); }
          } else {
            wave.x -= SPEED * dt;
            if (!wave.judged && wave.x <= PLANE_X) { judge(); }
          }
        } else {
          if (wave) { wave.x -= SPEED * dt; }
          timer += dt;
          if (state === 'won' && timer > 1.8) { state = 'fly'; newRound(); }
          if (state === 'retry' && timer > 1.8) { state = 'fly'; wave = null; spawnT = 0.4; }
        }
        if (wave && wave.x < -120) { wave = null; }
      }

      function ringHalf(ctx, r, front) {
        var x = wave.x, y = r.y;
        var col = r.hit ? (r.right ? '#3ddc84' : '#ff5d8f') : '#ffd23f';
        ctx.lineWidth = 14;
        ctx.strokeStyle = 'rgba(0,0,0,.15)';
        ctx.beginPath();
        ctx.ellipse(x + 3, y + 4, 36, 66, 0, front ? -Math.PI / 2 : Math.PI / 2, front ? Math.PI / 2 : Math.PI * 1.5);
        ctx.stroke();
        ctx.strokeStyle = col;
        ctx.beginPath();
        ctx.ellipse(x, y, 36, 66, 0, front ? -Math.PI / 2 : Math.PI / 2, front ? Math.PI / 2 : Math.PI * 1.5);
        ctx.stroke();
      }

      function ringLabel(ctx, r) {
        var shown = api.label(r.g);
        var fs = api.mode === 'letters' ? 38 : (shown.length > 3 ? 22 : 30);
        ctx.font = U.font(fs);
        var tw = Math.max(34, ctx.measureText(shown).width + 18);
        U.plate(ctx, wave.x - tw / 2, r.y - 23, tw, 44, { r: 12, shadow: false });
        ctx.font = U.font(fs);
        ctx.fillStyle = '#1f2340';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(shown, wave.x, r.y + 1);
      }

      function drawPlane(ctx) {
        var art = PH.art;
        var now = performance.now() / 1000;
        ctx.save();
        ctx.translate(PLANE_X, plane.y);
        ctx.rotate(U.clamp(plane.vy / 900, -0.35, 0.35));
        /* the pilot's scarf streaming out behind */
        ctx.beginPath();
        ctx.moveTo(-4, -14);
        for (var s = 0; s <= 6; s++) {
          ctx.lineTo(-10 - s * 11, -18 + Math.sin(now * 12 - s * 0.9) * (2 + s * 1.2));
        }
        for (s = 6; s >= 0; s--) {
          ctx.lineTo(-10 - s * 11, -8 + Math.sin(now * 12 - s * 0.9) * (2 + s * 1.2));
        }
        ctx.closePath();
        art.fillLit(ctx, '#ffd23f', -24, -4, { lineWidth: 2.5 });
        /* tail fin and back wing */
        ctx.beginPath(); ctx.moveTo(-54, -6); ctx.lineTo(-74, -36); ctx.quadraticCurveTo(-64, -40, -56, -34); ctx.lineTo(-36, -8); ctx.closePath();
        art.fillLit(ctx, '#e04848', -40, -6, { lineWidth: 3 });
        ctx.beginPath(); ctx.ellipse(-58, 4, 16, 5, 0.1, 0, Math.PI * 2);
        art.fillLit(ctx, '#c93a3a', 0, 9, { lineWidth: 2.5 });
        /* the body */
        ctx.beginPath();
        ctx.moveTo(-64, 0);
        ctx.quadraticCurveTo(-40, -22, 30, -20);
        ctx.quadraticCurveTo(62, -18, 64, 0);
        ctx.quadraticCurveTo(62, 18, 30, 20);
        ctx.quadraticCurveTo(-40, 20, -64, 0);
        ctx.closePath();
        art.fillLit(ctx, '#ff5a5a', -22, 22, { light: 0.35, dark: -0.3, lineWidth: 3.5 });
        /* a white stripe and a star badge */
        ctx.save(); ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,.9)';
        ctx.fillRect(-70, 2, 140, 6);
        ctx.restore();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(-30, -2, 9, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = art.INK; ctx.lineWidth = 2; ctx.stroke();
        U.star(ctx, -30, -2, 6.5, 3); ctx.fillStyle = '#4d8dff'; ctx.fill();
        /* the pilot: leather cap, goggles up, a big grin */
        ctx.save(); ctx.translate(8, -31);
        [-1, 1].forEach(function (s) { U.roundRect(ctx, s * 13 - 4, -2, 8, 13, 4); art.fillLit(ctx, '#8a5a34', -2, 11, { lineWidth: 2.5 }); });
        ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2);
        art.fillLit(ctx, '#f6c9a0', -13, 13, { lineWidth: 2.5 });
        ctx.beginPath(); ctx.arc(0, -1, 14, Math.PI, Math.PI * 2); ctx.closePath();
        art.fillLit(ctx, '#8a5a34', -15, -1, { lineWidth: 2.5 });
        [-5, 6].forEach(function (gx) { art.ball(ctx, gx, -7, 4.2, '#7fd3ff', { lineWidth: 2 }); });
        art.eyes(ctx, 3, 3, 9, 2.4, { dot: true, blink: art.blink(19), look: [1, 0] });
        art.cheeks(ctx, 3, 6, 14, 2.5);
        art.mouth(ctx, 5, 8, 6, 'smile', { lineWidth: 1.8 });
        ctx.restore();
        /* the cockpit rim and windscreen */
        ctx.beginPath(); ctx.moveTo(20, -18); ctx.quadraticCurveTo(28, -34, 34, -18); ctx.closePath();
        ctx.fillStyle = 'rgba(190,235,255,.75)'; ctx.fill(); ctx.strokeStyle = art.INK; ctx.lineWidth = 2.5; ctx.stroke();
        U.roundRect(ctx, -14, -22, 44, 7, 3.5);
        art.fillLit(ctx, '#8a5a34', -22, -15, { lineWidth: 2.5 });
        /* the front wing */
        ctx.beginPath(); ctx.ellipse(6, 8, 34, 8, 0.08, 0, Math.PI * 2);
        art.fillLit(ctx, '#ffd23f', 0, 16, { lineWidth: 3 });
        /* nose, hub and a blurry spinning propeller */
        art.ball(ctx, 64, 0, 7, '#c9ced9', { lineWidth: 2.5 });
        var spin = Math.abs(Math.sin(now * 33));
        ctx.fillStyle = 'rgba(60,60,80,.55)';
        ctx.beginPath(); ctx.ellipse(70, 0, 4, 28 * spin + 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.beginPath(); ctx.ellipse(70, 0, 2, 30, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }


      function drawGappedWord(ctx) {
        if (!target || api.pre) { return; }
        var fs = 44, pad = 8, ctxw = [], total = 0;
        ctx.font = U.font(fs);
        target.g.forEach(function (g, k) {
          var w = k === gap ? Math.max(60, ctx.measureText(g).width + 24) : ctx.measureText(g).width + 4;
          ctxw.push(w); total += w + pad;
        });
        var x = api.W / 2 - total / 2;
        U.plate(ctx, x - 20, 16, total + 30, 66, { r: 20 });
        target.g.forEach(function (g, k) {
          var w = ctxw[k];
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          if (k === gap) {
            var filled = state === 'won';
            ctx.fillStyle = filled ? '#3ddc84' : (flash > 0 && !flashGood ? '#ffd7de' : '#fff3c4');
            U.roundRect(ctx, x, 26, w, 50, 10); ctx.fill();
            ctx.strokeStyle = '#ff9f40'; ctx.lineWidth = 3;
            ctx.setLineDash(filled ? [] : [6, 5]); ctx.stroke(); ctx.setLineDash([]);
            ctx.fillStyle = '#1f2340';
            ctx.font = U.font(fs);
            ctx.fillText(filled ? g : '?', x + w / 2, 52);
          } else {
            ctx.fillStyle = '#1f2340';
            ctx.font = U.font(fs);
            ctx.fillText(g, x + w / 2, 52);
          }
          x += w + pad;
        });
      }

      function draw(ctx) {
        var sky = ctx.createLinearGradient(0, 0, 0, api.H);
        sky.addColorStop(0, '#4dabf7');
        sky.addColorStop(0.7, '#bfe3ff');
        sky.addColorStop(1, '#fff3d6');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, api.W, api.H);
        var sg = ctx.createRadialGradient(860, 120, 10, 860, 120, 170);
        sg.addColorStop(0, 'rgba(255,240,170,.9)'); sg.addColorStop(1, 'rgba(255,240,170,0)');
        ctx.fillStyle = sg; ctx.fillRect(660, 0, 340, 320);
        ctx.fillStyle = '#fff3bf'; ctx.beginPath(); ctx.arc(860, 120, 38, 0, Math.PI * 2); ctx.fill();

        clouds.forEach(function (c) {
          ctx.save(); ctx.translate(c.x, c.y); ctx.scale(c.s, c.s);
          ctx.fillStyle = 'rgba(150,185,220,.4)';
          ctx.beginPath(); ctx.arc(2, 10, 30, 0, Math.PI * 2); ctx.arc(36, 16, 24, 0, Math.PI * 2); ctx.arc(-30, 18, 22, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.arc(34, 8, 24, 0, Math.PI * 2); ctx.arc(-32, 10, 22, 0, Math.PI * 2);
          ctx.fill(); ctx.restore();
        });
        hills.forEach(function (h, n) {
          var hg = ctx.createLinearGradient(0, api.H - h.h, 0, api.H);
          hg.addColorStop(0, n % 2 ? '#8ce99a' : '#69db7c'); hg.addColorStop(1, '#2f9e44');
          ctx.fillStyle = hg;
          ctx.beginPath(); ctx.ellipse(h.x + 110, api.H + 10, 150, h.h, 0, Math.PI, Math.PI * 2); ctx.fill();
        });

        trail.forEach(function (t) {
          ctx.fillStyle = 'rgba(255,255,255,' + (t.life / 0.6 * 0.7) + ')';
          ctx.beginPath(); ctx.arc(t.x, t.y, 6 * (t.life / 0.6) + 2, 0, Math.PI * 2); ctx.fill();
        });

        if (wave) { wave.rings.forEach(function (r) { ringHalf(ctx, r, false); ringLabel(ctx, r); }); }
        drawPlane(ctx);
        if (wave) { wave.rings.forEach(function (r) { ringHalf(ctx, r, true); }); }

        drawGappedWord(ctx);

        U.badge(ctx, api.W / 2, api.H - 56, 'Drag up and down (or ↑ ↓) to steer', { align: 'center', icon: '✈️', size: 18 });
      }

      newRound();
      return { update: update, draw: draw, down: down, move: move, up: up, key: key };
    }
  };
})(window.PH = window.PH || {});
