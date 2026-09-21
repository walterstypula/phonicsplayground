/* Penalty Kick - count the sounds in a word, then kick the ball at that number */
(function (PH) {
  'use strict';
  var U = PH.util;

  /* short and long words so the answer is not always 3 for the youngest players */
  var EXTRA = ['at|a.t', 'in|i.n', 'up|u.p', 'on|o.n', 'it|i.t', 'am|a.m', 'go|g.o', 'me|m.e',
    'no|n.o', 'is|i.s', 'stamp|s.t.a.m.p', 'frost|f.r.o.s.t', 'twist|t.w.i.s.t',
    'crisp|c.r.i.s.p', 'plant|p.l.a.n.t', 'blend|b.l.e.n.d'];

  PH.games.soccer = {
    id: 'soccer',
    name: 'Penalty Kick',
    icon: '⚽',
    blurb: 'How many sounds are in the word? Kick the ball at that number and beat the goalie.',

    create: function (api) {
      var ROUNDS = 6;
      /* level 5 and the pre-reader levels count syllables (claps) instead of sounds */
      var claps = api.level.id === 5 || api.pre;
      var GOAL = { x1: 220, x2: 780, top: 104, bottom: 330 };
      var SPOT = { x: 500, y: 560 };
      var round = 0, target = null, count = 0, targets = [], recent = [], goals = 0;
      var hits = 0, misses = 0, state = 'aim', timer = 0, shot = null, lesson = 0;
      var ball = { x: SPOT.x, y: SPOT.y, s: 1 };
      var keeper = { x: 500, dive: 0, dir: 0 };
      var crowd = [];
      for (var i = 0; i < 70; i++) {
        crowd.push({ x: 10 + (i % 35) * 28.5, y: 30 + Math.floor(i / 35) * 32, c: U.pick(PH.COLORS), p: U.rand(0, 6) });
      }

      function chunks(w) { return claps ? w.g : PH.soundGraphemes(w); }

      function buildPool() {
        if (api.pre) { return PH.PICTURES.slice(); }   /* clap picture words: ba-na-na */
        var pool = api.words.filter(function (w) { return w.w.indexOf('x') < 0; });   /* x is two sounds */
        if (api.level.id <= 2) {
          pool = pool.concat(EXTRA.map(function (e) {
            var b = e.split('|');
            return { w: b[0], g: b[1].split('.'), rime: '', level: 0 };
          }));
        }
        return pool;
      }
      var POOL = buildPool();
      var byCount = {};
      POOL.forEach(function (w) { var n = chunks(w).length; (byCount[n] = byCount[n] || []).push(w); });
      var counts = Object.keys(byCount).map(Number);

      function newRound() {
        round++;
        if (round > ROUNDS) {
          api.finish(null, hits + misses ? hits / (hits + misses) : 1);
          state = 'over';
          return;
        }
        /* pick the count first so the right answer moves around */
        var n = U.pick(counts);
        var options = byCount[n].filter(function (w) { return recent.indexOf(w.w) < 0; });
        target = U.pick(options.length ? options : byCount[n]);
        recent.push(target.w);
        if (recent.length > 5) { recent.shift(); }
        count = chunks(target).length;

        /* shift the window so the right answer is not always the middle number */
        var windows = [[-2, -1], [-1, 1], [1, 2]].filter(function (o) { return count + o[0] >= 1; });
        var off = U.pick(windows);
        var nums = [count, count + off[0], count + off[1]];
        nums.sort(function (a, b) { return a - b; });
        var spots = [{ x: 330, y: 250 }, { x: 500, y: 176 }, { x: 670, y: 250 }];
        targets = nums.map(function (k, j) { return { n: k, x: spots[j].x, y: spots[j].y, r: 54, pulse: U.rand(0, 6) }; });

        resetBall();
        state = 'aim'; lesson = 0;
        api.setProgress(round, ROUNDS);
        api.setPrompt(claps ? 'How many claps in' : 'How many sounds in', { word: target.w, show: true, repeat: sayPrompt });
        sayPrompt();
      }

      function resetBall() {
        ball.x = SPOT.x; ball.y = SPOT.y; ball.s = 1;
        keeper.x = 500; keeper.dive = 0; keeper.dir = 0;
        shot = null;
      }

      function sayPrompt() {
        api.say(claps ? 'How many claps in' : 'How many sounds in');
        api.sayWord(target.w, { queue: true });
      }

      function countAloud() {
        (claps ? target.g : PH.soundHintsFor(target)).forEach(function (c) {
          api.say(c, { rate: 0.55, queue: true });
        });
        api.say(count + (claps ? (count === 1 ? ' clap' : ' claps') : (count === 1 ? ' sound' : ' sounds')), { queue: true });
      }

      function down(p) {
        if (state !== 'aim') { return; }
        for (var k = 0; k < targets.length; k++) {
          var t = targets[k];
          if (U.dist(p.x, p.y, t.x, t.y) <= t.r + 12) {
            shot = { t: t, right: t.n === count, fx: ball.x, fy: ball.y };
            /* the keeper guesses wrong on a right answer, and reads a wrong one */
            if (shot.right) {
              var away = t.x < 500 ? 1 : (t.x > 500 ? -1 : U.pick([-1, 1]));
              keeper.dir = away;
            } else {
              keeper.dir = t.x < 500 ? -1 : (t.x > 500 ? 1 : 0);
            }
            state = 'kick'; timer = 0;
            api.sfx.kick();
            return;
          }
        }
      }

      function update(dt) {
        targets.forEach(function (t) { t.pulse += dt * 3; });
        if (lesson > 0) { lesson -= dt; }

        if (state === 'kick') {
          timer += dt;
          var k = U.clamp(timer / 0.55, 0, 1);
          keeper.dive = U.clamp((timer - 0.08) / 0.35, 0, 1);
          var tx = shot.t.x, ty = shot.t.y;
          if (!shot.right) {
            /* a save: the ball stops in the keeper's gloves */
            tx = 500 + keeper.dir * 150 * keeper.dive; ty = shot.t.y + 10;
          }
          ball.x = U.lerp(shot.fx, tx, k);
          ball.y = U.lerp(shot.fy, ty, k) - Math.sin(k * Math.PI) * 60;
          ball.s = U.lerp(1, 0.55, k);
          if (k >= 1) {
            state = 'result'; timer = 0;
            lesson = 2.6;
            if (shot.right) {
              hits++; goals++;
              api.addStar(1);
              api.sfx.cheer();
              api.burst(ball.x, ball.y, null, 40, { lift: 160 });
              api.say('Goal!');
              countAloud();
            } else {
              misses++;
              api.sfx.boing();
              api.say('Saved! Let us count together.');
              countAloud();
            }
          }
        } else if (state === 'result') {
          timer += dt;
          /* the keeper's save is counted out loud, which takes as long as it takes */
          if (PH.speech.settled(timer, 3.2)) {
            if (shot.right) { newRound(); } else { resetBall(); state = 'aim'; }
          }
        }
      }

      function drawKeeper(ctx) {
        var x = 500 + keeper.dir * 150 * keeper.dive;
        var y = 300 - Math.sin(keeper.dive * Math.PI) * 30 * Math.abs(keeper.dir);
        U.shadow(ctx, x, 334, 40, 8, 0.3);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(keeper.dir * keeper.dive * 1.2);
        ctx.translate(0, 32);
        ctx.scale(1.12, 1.12);
        var sway = Math.sin(performance.now() / 260) * 0.12;
        PH.art.kid(ctx, {
          skin: '#b97a4f', hair: '#2b1a12', hairStyle: 'curly', iris: '#3b2414',
          shirt: '#ffd23f', pants: '#2f3a73', shoes: '#3ddc84', hands: '#3ddc84',
          arms: [2.3 + sway, 2.3 - sway], look: [0, 0.6], blinkSeed: 3,
          mouth: keeper.dive > 0.5 ? 'o' : 'smile',
          body: function (c) {
            c.fillStyle = '#2b2346';
            c.font = U.font(18);
            c.textAlign = 'center'; c.textBaseline = 'middle';
            c.fillText('1', 0, -42);
          }
        });
        ctx.restore();
      }

      function drawBall(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,.2)';
        ctx.beginPath(); ctx.ellipse(ball.x, SPOT.y + 26 - (SPOT.y - ball.y) * 0.1, 26 * ball.s, 8 * ball.s, 0, 0, Math.PI * 2); ctx.fill();
        ctx.save();
        ctx.translate(ball.x, ball.y);
        ctx.scale(ball.s, ball.s);
        if (state === 'kick') { ctx.rotate(timer * 14); }
        var bg = ctx.createRadialGradient(-9, -10, 3, 0, 0, 28);
        bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#ced4da');
        ctx.fillStyle = bg;
        ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#1f2340'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#1f2340';
        ctx.beginPath();
        for (var k = 0; k < 5; k++) {
          var a = k / 5 * Math.PI * 2 - Math.PI / 2;
          ctx[k ? 'lineTo' : 'moveTo'](Math.cos(a) * 9, Math.sin(a) * 9);
        }
        ctx.closePath(); ctx.fill();
        for (var j = 0; j < 5; j++) {
          var b = j / 5 * Math.PI * 2 - Math.PI / 2;
          ctx.beginPath(); ctx.arc(Math.cos(b) * 22, Math.sin(b) * 22, 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }

      function drawLesson(ctx) {
        if (lesson <= 0 || !target) { return; }
        var parts = chunks(target);
        var text = (api.pre ? api.label(target.w) + '   ' : '') + parts.join('  •  ') + '   =   ' + count;
        ctx.font = U.font(34);
        var w = ctx.measureText(text).width + 50;
        ctx.globalAlpha = U.clamp(lesson / 0.4, 0, 1);
        ctx.fillStyle = 'rgba(31,35,64,.85)';
        U.roundRect(ctx, 500 - w / 2, 372, w, 62, 20); ctx.fill();
        ctx.fillStyle = shot && shot.right ? '#3ddc84' : '#ffd23f';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, 500, 404);
        ctx.globalAlpha = 1;
      }

      function draw(ctx) {
        var now = performance.now() / 1000;
        /* stands under floodlights */
        var stand = ctx.createLinearGradient(0, 0, 0, 96);
        stand.addColorStop(0, '#1f2350'); stand.addColorStop(1, '#3a3f7a');
        ctx.fillStyle = stand;
        ctx.fillRect(0, 0, api.W, 96);
        ctx.fillStyle = 'rgba(255,255,255,.06)';
        ctx.fillRect(0, 32, api.W, 4); ctx.fillRect(0, 64, api.W, 4);
        var party = state === 'result' && shot && shot.right;
        crowd.forEach(function (c) {
          var hop = party ? Math.abs(Math.sin(now * 10 + c.p)) * 10 : Math.sin(now * 2 + c.p) * 1.5;
          ctx.fillStyle = U.shade(c.c, -0.2);
          U.roundRect(ctx, c.x - 11, c.y - hop + 18, 22, 14, 5); ctx.fill();
          ctx.fillStyle = '#f1c9a5';
          ctx.beginPath(); ctx.arc(c.x, c.y - hop + 10, 9, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = c.c;
          ctx.beginPath(); ctx.arc(c.x, c.y - hop + 7, 9, Math.PI, Math.PI * 2); ctx.fill();   /* team hat */
          if (party) {
            ctx.strokeStyle = '#f1c9a5'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(c.x - 10, c.y - hop + 20); ctx.lineTo(c.x - 16, c.y - hop + 4);
            ctx.moveTo(c.x + 10, c.y - hop + 20); ctx.lineTo(c.x + 16, c.y - hop + 4); ctx.stroke();
          }
        });
        /* pitch, lighter in the distance, with mown stripes */
        for (var s = 0; s < 8; s++) {
          ctx.fillStyle = s % 2 ? '#4cbb5c' : '#44ad53';
          ctx.fillRect(0, 96 + s * 68, api.W, 68);
        }
        var haze = ctx.createLinearGradient(0, 96, 0, 330);
        haze.addColorStop(0, 'rgba(255,255,255,.18)'); haze.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = haze; ctx.fillRect(0, 96, api.W, 234);
        /* floodlight towers with their glow */
        [40, api.W - 40].forEach(function (fx) {
          var fg = ctx.createRadialGradient(fx, 20, 4, fx, 20, 120);
          fg.addColorStop(0, 'rgba(255,255,220,.8)'); fg.addColorStop(1, 'rgba(255,255,220,0)');
          ctx.fillStyle = fg; ctx.fillRect(fx - 120, 0, 240, 140);
          ctx.fillStyle = '#dee2e6';
          U.roundRect(ctx, fx - 22, 6, 44, 26, 6); ctx.fill();
          ctx.fillStyle = '#fff9db';
          for (var lx = 0; lx < 3; lx++) { for (var ly = 0; ly < 2; ly++) { ctx.beginPath(); ctx.arc(fx - 12 + lx * 12, 13 + ly * 12, 4, 0, Math.PI * 2); ctx.fill(); } }
        });
        ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 4;
        ctx.strokeRect(130, GOAL.bottom, 740, 150);
        ctx.beginPath(); ctx.arc(SPOT.x, SPOT.y, 4, 0, Math.PI * 2); ctx.stroke();

        /* net */
        ctx.fillStyle = 'rgba(255,255,255,.12)';
        ctx.fillRect(GOAL.x1, GOAL.top, GOAL.x2 - GOAL.x1, GOAL.bottom - GOAL.top);
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.5;
        var ripple = state === 'result' && shot && shot.right ? Math.sin(timer * 20) * 4 * Math.max(0, 1 - timer) : 0;
        for (var x = GOAL.x1; x <= GOAL.x2; x += 20) {
          ctx.beginPath(); ctx.moveTo(x + ripple, GOAL.top); ctx.lineTo(x - ripple, GOAL.bottom); ctx.stroke();
        }
        for (var y = GOAL.top; y <= GOAL.bottom; y += 20) {
          ctx.beginPath(); ctx.moveTo(GOAL.x1, y); ctx.lineTo(GOAL.x2, y + ripple); ctx.stroke();
        }
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 10; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(GOAL.x1, GOAL.bottom); ctx.lineTo(GOAL.x1, GOAL.top); ctx.lineTo(GOAL.x2, GOAL.top); ctx.lineTo(GOAL.x2, GOAL.bottom);
        ctx.stroke();

        /* number targets */
        targets.forEach(function (t) {
          var grow = state === 'aim' ? Math.sin(t.pulse) * 3 : 0;
          var picked = shot && shot.t === t;
          var face = picked ? (shot.right ? '#3ddc84' : '#ff5d8f') : '#ffffff';
          var tg = ctx.createRadialGradient(t.x - 16, t.y - 18, 6, t.x, t.y, t.r + grow);
          tg.addColorStop(0, '#ffffff'); tg.addColorStop(1, picked ? face : '#dfe7f2');
          ctx.fillStyle = 'rgba(0,0,0,.25)';
          ctx.beginPath(); ctx.arc(t.x + 3, t.y + 6, t.r + grow, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = tg;
          ctx.beginPath(); ctx.arc(t.x, t.y, t.r + grow, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = '#ff922b'; ctx.lineWidth = 7; ctx.stroke();
          ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(t.x, t.y, t.r + grow - 6, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = '#1f2340';
          ctx.font = U.font(48);
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(String(t.n), t.x, t.y + 3);
        });

        drawKeeper(ctx);
        drawBall(ctx);
        drawLesson(ctx);

        if (state === 'result') {
          ctx.font = U.font(64);
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = shot.right ? '#ffd23f' : '#ffffff';
          ctx.strokeStyle = '#1f2340'; ctx.lineWidth = 8;
          var word = shot.right ? 'GOAL!' : 'SAVED!';
          ctx.strokeText(word, 500, 486); ctx.fillText(word, 500, 486);
        }

        /* a stadium scoreboard with glowing digits */
        U.plate(ctx, 14, 106, 158, 58, { fill: '#343a40', r: 12, edge: '#868e96' });
        ctx.save();
        ctx.fillStyle = '#ffd43b';
        ctx.shadowColor = '#ffd43b'; ctx.shadowBlur = 10;
        ctx.font = U.font(24);
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText('GOALS ' + goals, 32, 134);
        ctx.restore();

        U.badge(ctx, 500, api.H - 56, claps ? 'Clap it out, then kick at the number' : 'Say each sound, then kick at the number', { align: 'center', icon: '⚽', size: 18 });
      }

      newRound();
      return { update: update, draw: draw, down: down };
    }
  };
})(window.PH = window.PH || {});
