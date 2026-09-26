/* Claw Machine - hear a word, send the claw down to grab the capsule with that word */
(function (PH) {
  'use strict';
  var U = PH.util;

  PH.games.claw = {
    id: 'claw',
    name: 'Claw Machine',
    icon: '🦾',
    blurb: 'Steer the claw and pick up the word you hear. Tap a capsule or use the arrow keys.',

    create: function (api) {
      var ROUNDS = 6;
      var RAIL_Y = 86, CAP_Y = 468, CAP_R = 62, CHUTE_X = 92;
      var round = 0, target = null, capsules = [], recent = [];
      var hits = 0, misses = 0;

      var claw = {
        x: 500, y: RAIL_Y, open: 1, holding: null,
        state: 'idle',   /* idle | toX | down | close | lift | carry | release | judge */
        wantX: 500, timer: 0, verdict: null
      };
      var stars = [];
      for (var s = 0; s < 26; s++) {
        stars.push({ x: U.rand(0, api.W), y: U.rand(0, 380), r: U.rand(1, 2.6), t: U.rand(0, 6) });
      }

      function fontFor(word) {
        return word.length > 7 ? 19 : (word.length > 5 ? 24 : 31);
      }

      function newRound() {
        round++;
        if (round > ROUNDS) {
          var acc = hits + misses ? hits / (hits + misses) : 1;
          api.finish(null, acc);
          claw.state = 'over';
          return;
        }
        var pool = api.words.filter(function (w) { return recent.indexOf(w.w) < 0; });
        target = U.pick(pool.length > 6 ? pool : api.words);
        recent.push(target.w);
        if (recent.length > 5) { recent.shift(); }

        var n = api.pre ? (round <= 3 ? 3 : 4) : (round <= 2 ? 4 : 5);
        var others = PH.lookAlikes(target, api.words, n - 1);
        var list = U.shuffle([target].concat(others));

        var left = 240, right = api.W - 110;
        var spacing = (right - left) / (n - 1);
        capsules = list.map(function (w, i) {
          var x = left + i * spacing;
          return {
            word: w, x: x, homeX: x, y: CAP_Y, homeY: CAP_Y,
            isTarget: w.w === target.w,
            color: PH.COLORS[i % PH.COLORS.length],
            bob: U.rand(0, 6), gone: false, vy: 0
          };
        });

        claw.state = 'idle'; claw.holding = null; claw.open = 1;
        claw.y = RAIL_Y; claw.verdict = null;
        api.setProgress(round, ROUNDS);
        api.setPrompt('Grab the word', { word: target.w, repeat: sayPrompt });
        sayPrompt();
      }

      function sayPrompt() {
        api.say('Grab the word');
        api.sayWord(target.w, { queue: true });
      }

      function nearest(x, maxDist) {
        var best = null, bd = maxDist === undefined ? 1e9 : maxDist;
        capsules.forEach(function (c) {
          if (c.gone) { return; }
          var d = Math.abs(c.x - x);
          if (d < bd) { bd = d; best = c; }
        });
        return best;
      }

      function sendTo(x) {
        claw.wantX = U.clamp(x, 150, api.W - 60);
        claw.state = 'toX';
        api.sfx.click();
      }

      function down(p) {
        if (claw.state !== 'idle') { return; }
        var c = nearest(p.x, 120);
        sendTo(c ? c.x : p.x);
      }

      function key(e) {
        if (claw.state === 'idle') {
          if (e.key === 'ArrowLeft') { claw.x = U.clamp(claw.x - 26, 150, api.W - 60); e.preventDefault(); }
          if (e.key === 'ArrowRight') { claw.x = U.clamp(claw.x + 26, 150, api.W - 60); e.preventDefault(); }
          if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 'Enter') {
            sendTo(claw.x); e.preventDefault();
          }
        }
      }

      function judge() {
        var c = claw.holding;
        if (!c) { claw.state = 'idle'; return; }
        if (c.isTarget) {
          hits++;
          api.addStar(1);
          api.sfx.great();
          api.burst(CHUTE_X + 30, 430, null, 26, { lift: 120 });
          api.say('Yes! You got');
          api.sayWord(target.w, { queue: true });
          c.gone = true;
          claw.verdict = 'good';
        } else {
          misses++;
          api.sfx.boing();
          api.say(api.mode === 'pictures' ? 'That is a' : 'That says');
          api.sayWord(c.word.w, { queue: true });
          api.say('Try again', { queue: true });
          claw.verdict = 'bad';
          c.x = c.homeX; c.y = c.homeY;
        }
        claw.holding = null;
        claw.state = 'judge';
        claw.timer = 0;
      }

      function update(dt) {
        capsules.forEach(function (c) { c.bob += dt * 2; });

        var st = claw.state;
        if (st === 'toX') {
          var dx = claw.wantX - claw.x;
          var step = 560 * dt;
          if (Math.abs(dx) <= step) { claw.x = claw.wantX; claw.state = 'down'; api.sfx.whoosh(); }
          else { claw.x += Math.sign(dx) * step; }
        } else if (st === 'down') {
          claw.y += 430 * dt;
          if (claw.y >= CAP_Y - 12) {
            claw.y = CAP_Y - 12;
            claw.state = 'close'; claw.timer = 0;
            api.sfx.clank();
          }
        } else if (st === 'close') {
          claw.timer += dt;
          claw.open = U.clamp(1 - claw.timer / 0.3, 0.08, 1);
          if (claw.timer >= 0.3) {
            claw.holding = nearest(claw.x, 78);
            claw.state = 'lift';
          }
        } else if (st === 'lift') {
          claw.y -= 400 * dt;
          if (claw.holding) { claw.holding.x = claw.x; claw.holding.y = claw.y + 78; }
          if (claw.y <= RAIL_Y) {
            claw.y = RAIL_Y;
            if (!claw.holding) { claw.open = 1; claw.state = 'idle'; }
            else { claw.state = 'carry'; }
          }
        } else if (st === 'carry') {
          var d2 = CHUTE_X - claw.x;
          var sp = 520 * dt;
          if (Math.abs(d2) <= sp) { claw.x = CHUTE_X; claw.state = 'release'; claw.timer = 0; }
          else { claw.x += Math.sign(d2) * sp; }
          if (claw.holding) { claw.holding.x = claw.x; claw.holding.y = claw.y + 78; }
        } else if (st === 'release') {
          claw.timer += dt;
          claw.open = U.clamp(claw.timer / 0.25, 0, 1);
          if (claw.holding) {
            claw.holding.vy += 1500 * dt;
            claw.holding.y += claw.holding.vy * dt;
            claw.holding.x = claw.x;
            if (claw.holding.y > 430) { claw.holding.vy = 0; judge(); }
          } else if (claw.timer > 0.25) { claw.state = 'idle'; }
        } else if (st === 'judge') {
          claw.timer += dt;
          if (claw.timer > 1.5) {
            if (claw.verdict === 'good') { newRound(); }
            else {
              claw.state = 'idle'; claw.open = 1; claw.y = RAIL_Y; claw.verdict = null;
            }
          }
        }
      }

      /* a two-tone prize capsule: clear dome on top, coloured base, glossy */
      function drawCapsule(ctx, c) {
        if (c.gone) { return; }
        var held = claw.holding === c || claw.state === 'release';
        var y = c.y + (held ? 0 : Math.sin(c.bob) * 3);
        if (!held) { U.shadow(ctx, c.x, CAP_Y + CAP_R + 4, CAP_R * 0.9, 10, 0.35); }
        ctx.save();
        ctx.beginPath(); ctx.arc(c.x, y, CAP_R, 0, Math.PI * 2); ctx.clip();
        var base = ctx.createLinearGradient(0, y, 0, y + CAP_R);
        base.addColorStop(0, U.shade(c.color, 0.1));
        base.addColorStop(1, U.shade(c.color, -0.35));
        ctx.fillStyle = base;
        ctx.fillRect(c.x - CAP_R, y, CAP_R * 2, CAP_R);
        var dome = ctx.createRadialGradient(c.x - 20, y - 30, 4, c.x, y - 10, CAP_R);
        dome.addColorStop(0, 'rgba(255,255,255,.85)');
        dome.addColorStop(1, 'rgba(190,210,255,.35)');
        ctx.fillStyle = dome;
        ctx.fillRect(c.x - CAP_R, y - CAP_R, CAP_R * 2, CAP_R);
        ctx.restore();
        ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(c.x, y, CAP_R - 1, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = U.shade(c.color, -0.3); ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(c.x - CAP_R + 2, y); ctx.lineTo(c.x + CAP_R - 2, y); ctx.stroke();

        U.plate(ctx, c.x - CAP_R + 4, y - 21, CAP_R * 2 - 8, 42, { r: 12, shine: 0.3 });
        ctx.fillStyle = '#1f2340';
        ctx.font = U.font(fontFor(api.label(c.word.w)));
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(api.label(c.word.w), c.x, y + 1);

        ctx.fillStyle = 'rgba(255,255,255,.75)';
        ctx.beginPath(); ctx.ellipse(c.x - 24, y - 38, 14, 7, -0.6, 0, Math.PI * 2); ctx.fill();
      }

      function metal(ctx, x, y, w, h, r) {
        var g = ctx.createLinearGradient(0, y, 0, y + h);
        g.addColorStop(0, '#f1f3f5');
        g.addColorStop(0.5, '#adb5bd');
        g.addColorStop(1, '#6c757d');
        ctx.fillStyle = g;
        U.roundRect(ctx, x, y, w, h, r); ctx.fill();
      }

      /* chasing marquee bulbs around the cabinet */
      function bulbs(ctx) {
        var t = Math.floor(performance.now() / 160);
        var list = [], x, y;
        for (x = 30; x <= api.W - 30; x += 38) { list.push([x, 12]); }
        for (y = 50; y <= api.H - 30; y += 38) { list.push([api.W - 12, y]); }
        for (x = api.W - 30; x >= 30; x -= 38) { list.push([x, api.H - 10]); }
        for (y = api.H - 48; y >= 50; y -= 38) { list.push([12, y]); }
        list.forEach(function (b, n) {
          var on = (n + t) % 3 === 0;
          if (on) {
            var g = ctx.createRadialGradient(b[0], b[1], 1, b[0], b[1], 16);
            g.addColorStop(0, 'rgba(255,230,120,.9)');
            g.addColorStop(1, 'rgba(255,230,120,0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(b[0], b[1], 16, 0, Math.PI * 2); ctx.fill();
          }
          ctx.fillStyle = on ? '#fff3bf' : '#b3858f';
          ctx.beginPath(); ctx.arc(b[0], b[1], 5, 0, Math.PI * 2); ctx.fill();
        });
      }

      function draw(ctx) {
        var now = performance.now() / 1000;
        /* inside of the cabinet */
        var bg = ctx.createLinearGradient(0, 0, 0, api.H);
        bg.addColorStop(0, '#231a52');
        bg.addColorStop(1, '#4a2a7a');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, api.W, api.H);
        /* spotlight cones from the ceiling */
        [260, 560, 860].forEach(function (sx, n) {
          var sway = Math.sin(now * 0.6 + n) * 30;
          var g = ctx.createLinearGradient(0, 60, 0, CAP_Y + 40);
          g.addColorStop(0, 'rgba(255,240,200,.16)');
          g.addColorStop(1, 'rgba(255,240,200,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(sx - 20, 60); ctx.lineTo(sx + 20, 60);
          ctx.lineTo(sx + 140 + sway, CAP_Y + 60); ctx.lineTo(sx - 140 + sway, CAP_Y + 60);
          ctx.closePath(); ctx.fill();
        });
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        stars.forEach(function (s) {
          ctx.globalAlpha = 0.25 + 0.3 * Math.sin(now * 1.6 + s.t);
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;

        /* a heap of little prize balls behind the capsules */
        for (var bx = 180; bx < api.W - 40; bx += 26) {
          var by = CAP_Y + 44 + Math.sin(bx * 0.13) * 10;
          ctx.fillStyle = PH.COLORS[(bx / 26 | 0) % PH.COLORS.length];
          ctx.globalAlpha = 0.55;
          ctx.beginPath(); ctx.arc(bx, by, 15, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        var floor = ctx.createLinearGradient(0, CAP_Y + 50, 0, api.H);
        floor.addColorStop(0, '#6a3fb0');
        floor.addColorStop(1, '#3a1f6e');
        ctx.fillStyle = floor;
        ctx.fillRect(160, CAP_Y + 52, api.W - 170, api.H - CAP_Y - 52);

        /* prize chute: a metal box with a glowing mouth */
        metal(ctx, 30, 392, 128, api.H - 392, 16);
        ctx.fillStyle = '#1b1537';
        U.roundRect(ctx, 42, 404, 104, api.H - 420, 12); ctx.fill();
        var glowCol = claw.verdict === 'good' ? '61,220,132' : '255,210,63';
        var mouth = ctx.createLinearGradient(0, 404, 0, 470);
        mouth.addColorStop(0, 'rgba(' + glowCol + ',.75)');
        mouth.addColorStop(1, 'rgba(' + glowCol + ',0)');
        ctx.fillStyle = mouth;
        U.roundRect(ctx, 42, 404, 104, 70, 12); ctx.fill();
        U.plate(ctx, 44, 520, 100, 40, { fill: '#ffd23f', r: 12 });
        ctx.fillStyle = '#5c3b00';
        ctx.font = U.font(20); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('PRIZE', 94, 541);

        /* the gantry rail */
        metal(ctx, 30, RAIL_Y - 50, api.W - 60, 22, 11);
        ctx.fillStyle = '#495057';
        for (var rx = 50; rx < api.W - 40; rx += 60) { ctx.beginPath(); ctx.arc(rx, RAIL_Y - 39, 3, 0, Math.PI * 2); ctx.fill(); }

        capsules.forEach(function (c) { if (claw.holding !== c) { drawCapsule(ctx, c); } });

        /* cable + trolley + claw, in brushed metal */
        ctx.strokeStyle = '#dee2e6';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(claw.x, RAIL_Y - 30); ctx.lineTo(claw.x, claw.y); ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(claw.x + 2, RAIL_Y - 30); ctx.lineTo(claw.x + 2, claw.y); ctx.stroke();
        U.plate(ctx, claw.x - 38, RAIL_Y - 56, 76, 32, { fill: '#ff922b', r: 10 });

        ctx.save();
        ctx.translate(claw.x, claw.y);
        var ang = 0.35 + claw.open * 0.75;
        [-1, 1].forEach(function (side) {
          ctx.save();
          ctx.translate(side * 14, 16);
          ctx.rotate(side * ang);
          metal(ctx, -7, 0, 14, 62, 7);
          ctx.translate(0, 56);
          ctx.rotate(side * -0.9);
          metal(ctx, -7, 0, 14, 30, 7);
          ctx.fillStyle = '#ff5d8f';
          ctx.beginPath(); ctx.arc(0, 30, 6, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        });
        metal(ctx, -26, -10, 52, 32, 10);
        ctx.fillStyle = '#ff5d8f';
        ctx.beginPath(); ctx.arc(0, 6, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.beginPath(); ctx.arc(-2, 4, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        if (claw.holding) { drawCapsule(ctx, claw.holding); }

        /* glass: two faint reflection streaks across the front */
        ctx.fillStyle = 'rgba(255,255,255,.05)';
        ctx.beginPath(); ctx.moveTo(620, 0); ctx.lineTo(700, 0); ctx.lineTo(420, api.H); ctx.lineTo(340, api.H); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(740, 0); ctx.lineTo(760, 0); ctx.lineTo(480, api.H); ctx.lineTo(460, api.H); ctx.closePath(); ctx.fill();

        /* the cabinet frame with its chasing lights */
        ctx.strokeStyle = '#e8456f'; ctx.lineWidth = 26;
        U.roundRect(ctx, 0, 0, api.W, api.H, 22); ctx.stroke();
        ctx.strokeStyle = '#ff8fab'; ctx.lineWidth = 3;
        U.roundRect(ctx, 13, 13, api.W - 26, api.H - 26, 14); ctx.stroke();
        bulbs(ctx);

        U.badge(ctx, api.W / 2, api.H - 64, 'Tap a capsule  •  or ← → and SPACE', { align: 'center', size: 18 });
      }

      newRound();
      return { update: update, draw: draw, down: down, key: key };
    }
  };
})(window.PH = window.PH || {});
