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
        var others = U.shuffle(api.words.filter(function (w) { return w.w !== target.w; })).slice(0, n - 1);
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

      function drawCapsule(ctx, c) {
        if (c.gone) { return; }
        var y = c.y + (claw.holding === c || claw.state === 'release' ? 0 : Math.sin(c.bob) * 3);
        var g = ctx.createRadialGradient(c.x - 18, y - 22, 6, c.x, y, CAP_R);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.35, c.color);
        g.addColorStop(1, 'rgba(0,0,0,.35)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(c.x, y, CAP_R, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,.94)';
        U.roundRect(ctx, c.x - CAP_R + 6, y - 20, CAP_R * 2 - 12, 40, 12);
        ctx.fill();

        ctx.fillStyle = '#1f2340';
        ctx.font = U.font(fontFor(api.label(c.word.w)));
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(api.label(c.word.w), c.x, y + 1);

        ctx.fillStyle = 'rgba(255,255,255,.5)';
        ctx.beginPath(); ctx.ellipse(c.x - 22, y - 34, 16, 9, -0.5, 0, Math.PI * 2); ctx.fill();
      }

      function draw(ctx) {
        var bg = ctx.createLinearGradient(0, 0, 0, api.H);
        bg.addColorStop(0, '#2b2a5c');
        bg.addColorStop(1, '#4b2d73');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, api.W, api.H);

        ctx.fillStyle = 'rgba(255,255,255,.55)';
        stars.forEach(function (s) {
          var tw = 0.55 + 0.45 * Math.sin(performance.now() / 600 + s.t);
          ctx.globalAlpha = tw;
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;

        /* prize chute */
        ctx.fillStyle = '#1b1a3d';
        U.roundRect(ctx, 34, 400, 120, api.H - 400, 18); ctx.fill();
        ctx.fillStyle = claw.verdict === 'good' ? '#3ddc84' : '#ffd23f';
        U.roundRect(ctx, 44, 410, 100, 22, 10); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = U.font(20); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('PRIZE', 94, 470);

        /* floor */
        ctx.fillStyle = 'rgba(255,255,255,.08)';
        U.roundRect(ctx, 170, CAP_Y + 28, api.W - 200, 90, 20); ctx.fill();

        /* rail */
        ctx.fillStyle = '#9aa3c7';
        U.roundRect(ctx, 30, RAIL_Y - 46, api.W - 60, 16, 8); ctx.fill();

        capsules.forEach(function (c) { if (claw.holding !== c) { drawCapsule(ctx, c); } });

        /* cable + trolley + claw */
        ctx.strokeStyle = '#cfd6ef';
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(claw.x, RAIL_Y - 34); ctx.lineTo(claw.x, claw.y); ctx.stroke();

        ctx.fillStyle = '#ff9f40';
        U.roundRect(ctx, claw.x - 34, RAIL_Y - 48, 68, 26, 10); ctx.fill();

        ctx.save();
        ctx.translate(claw.x, claw.y);
        ctx.fillStyle = '#d7deff';
        U.roundRect(ctx, -22, -6, 44, 26, 8); ctx.fill();
        var ang = 0.35 + claw.open * 0.75;
        [-1, 1].forEach(function (side) {
          ctx.save();
          ctx.translate(side * 14, 16);
          ctx.rotate(side * ang);
          ctx.fillStyle = '#b9c3f0';
          U.roundRect(ctx, -7, 0, 14, 62, 7); ctx.fill();
          ctx.translate(0, 56);
          ctx.rotate(side * -0.9);
          U.roundRect(ctx, -7, 0, 14, 30, 7); ctx.fill();
          ctx.restore();
        });
        ctx.restore();

        if (claw.holding) { drawCapsule(ctx, claw.holding); }

        ctx.fillStyle = 'rgba(255,255,255,.75)';
        ctx.font = U.font(20);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('Tap a capsule  •  or ← → and SPACE', api.W / 2, api.H - 18);
      }

      newRound();
      return { update: update, draw: draw, down: down, key: key };
    }
  };
})(window.PH = window.PH || {});
