/* Rhyme Rockets - fly the rocket to the planet whose word rhymes */
(function (PH) {
  'use strict';
  var U = PH.util;

  PH.games.rhyme = {
    id: 'rhyme',
    name: 'Rhyme Rockets',
    icon: '🚀',
    blurb: 'Two words that end the same sound alike. Fly to the planet that rhymes.',

    create: function (api) {
      var ROUNDS = 6;
      var round = 0, target = null, planets = [], recent = [];
      var hits = 0, misses = 0, state = 'play', timer = 0;
      var rocket = { x: api.W / 2, y: 496, hx: api.W / 2, hy: 496, rot: 0, wobble: 0 };
      var stars = [], i;
      for (i = 0; i < 70; i++) {
        stars.push({ x: U.rand(0, api.W), y: U.rand(0, api.H), r: U.rand(0.8, 2.4), t: U.rand(0, 6) });
      }

      /* rhyme families drawn from this level and everything below it */
      /* rhyming is a listening skill for 3 and 4 year olds, so they rhyme pictures */
      var pool = api.pre ? PH.PICTURES : PH.wordsUpTo(api.level.id);
      var families = {};
      pool.forEach(function (w) {
        (families[w.rime] = families[w.rime] || []).push(w);
      });
      var usable = Object.keys(families).filter(function (r) { return families[r].length >= 2; });
      var hard = usable.filter(function (r) {
        return families[r].some(function (w) { return w.level >= api.level.id - 1; });
      });
      var famKeys = hard.length >= 4 ? hard : usable;

      function newRound() {
        round++;
        if (round > ROUNDS) {
          var acc = hits + misses ? hits / (hits + misses) : 1;
          api.finish(null, acc);
          state = 'over';
          return;
        }
        var keys = famKeys.filter(function (k) { return recent.indexOf(k) < 0; });
        var rime = U.pick(keys.length ? keys : famKeys);
        recent.push(rime);
        if (recent.length > 4) { recent.shift(); }

        var fam = U.shuffle(families[rime]);
        target = fam[0];
        var match = fam[1];
        var wrong = U.shuffle(pool.filter(function (w) {
          return w.rime !== rime && w.w !== target.w;
        })).slice(0, 2);

        var picks = U.shuffle([
          { word: match, right: true },
          { word: wrong[0], right: false },
          { word: wrong[1], right: false }
        ]);
        planets = picks.map(function (p, k) {
          return {
            word: p.word, right: p.right,
            x: 190 + k * 310, y: 176, r: 94,
            hue: ['#ff9f40', '#4d8dff', '#3ddc84'][k],
            shake: 0, spin: U.rand(-0.3, 0.3)
          };
        });

        rocket.x = rocket.hx; rocket.y = rocket.hy; rocket.rot = 0;
        state = 'play';
        api.setProgress(round, ROUNDS);
        api.setPrompt('Rhymes with', { word: target.w, show: true, repeat: sayPrompt });
        sayPrompt();
      }

      function sayPrompt() {
        api.say('Which word rhymes with');
        api.sayWord(target.w, { queue: true });
        /* little ones cannot read the planets, so name each picture in turn */
        if (api.pre) {
          planets.forEach(function (pl) { api.sayWord(pl.word.w + '?', { queue: true }); });
        }
      }

      function down(p) {
        if (state !== 'play') { return; }
        for (var k = 0; k < planets.length; k++) {
          var pl = planets[k];
          if (U.dist(p.x, p.y, pl.x, pl.y) <= pl.r + 8) {
            if (pl.right) {
              hits++;
              state = 'fly'; timer = 0;
              rocket.goal = pl;
              api.sfx.whoosh();
              api.sayWord(pl.word.w);            /* the word the child chose, straight away */
            } else {
              misses++;
              pl.shake = 0.6;
              rocket.wobble = 0.5;
              api.sfx.bad();
              api.sayWord(pl.word.w);
              api.say('does not rhyme with', { queue: true });
              api.sayWord(target.w, { queue: true });
            }
            return;
          }
        }
      }

      function update(dt) {
        planets.forEach(function (p) {
          if (p.shake > 0) { p.shake -= dt; }
          p.spin += dt * 0.15;
        });
        if (rocket.wobble > 0) { rocket.wobble -= dt; }

        if (state === 'fly') {
          timer += dt;
          var k = U.clamp(timer / 0.7, 0, 1);
          var e = 1 - Math.pow(1 - k, 3);
          var g = rocket.goal;
          rocket.x = U.lerp(rocket.hx, g.x, e);
          rocket.y = U.lerp(rocket.hy, g.y + g.r * 0.2, e);
          rocket.rot = Math.atan2(g.x - rocket.hx, -(g.y - rocket.hy)) * e;
          if (k >= 1 && state === 'fly') {
            state = 'won'; timer = 0;
            api.addStar(1);
            api.sfx.great();
            api.burst(g.x, g.y, null, 30, { lift: 100 });
            api.say('Yes!', { queue: true });
            api.sayWord(g.word.w, { queue: true });
            api.say('rhymes with', { queue: true });
            api.sayWord(target.w, { queue: true });
          }
        } else if (state === 'won') {
          timer += dt;
          if (PH.speech.settled(timer, 2.6)) { newRound(); }
        }
      }

      function drawRocket(ctx) {
        var art = PH.art;
        var now = performance.now() / 1000;
        ctx.save();
        ctx.translate(rocket.x, rocket.y);
        ctx.rotate(rocket.rot + (rocket.wobble > 0 ? Math.sin(rocket.wobble * 50) * 0.18 : 0));
        ctx.scale(1.5, 1.5);
        /* a flickering flame, three layers deep */
        var flame = state === 'fly' ? 1 : 0.45 + Math.sin(now * 11) * 0.2;
        [['#ff5d5d', 20, 56], ['#ff9f40', 15, 44], ['#fff3a8', 8, 26]].forEach(function (f, i) {
          ctx.fillStyle = f[0];
          ctx.beginPath();
          ctx.moveTo(-f[1] + i, 40);
          ctx.quadraticCurveTo(-f[1] * 0.6, 40 + f[2] * flame * 0.6, Math.sin(now * 30 + i) * 2, 40 + f[2] * flame);
          ctx.quadraticCurveTo(f[1] * 0.6, 40 + f[2] * flame * 0.6, f[1] - i, 40);
          ctx.closePath(); ctx.fill();
        });
        /* fins */
        [-1, 1].forEach(function (s) {
          ctx.beginPath();
          ctx.moveTo(s * 14, 2); ctx.quadraticCurveTo(s * 30, 14, s * 30, 38); ctx.lineTo(s * 14, 32); ctx.closePath();
          art.fillLit(ctx, '#ff5d8f', 2, 38, { lineWidth: 2.5 });
        });
        /* nozzle */
        U.roundRect(ctx, -12, 36, 24, 8, 3);
        art.fillLit(ctx, '#9aa3bf', 36, 44, { lineWidth: 2.5 });
        /* the body */
        ctx.beginPath();
        ctx.moveTo(0, -56);
        ctx.quadraticCurveTo(21, -16, 18, 40);
        ctx.lineTo(-18, 40);
        ctx.quadraticCurveTo(-21, -16, 0, -56);
        ctx.closePath();
        var g = ctx.createLinearGradient(-20, 0, 20, 0);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#eef1ff'); g.addColorStop(1, '#b9c2e6');
        ctx.fillStyle = g; ctx.fill();
        ctx.save(); ctx.clip();
        ctx.fillStyle = '#ff5d8f';                           /* a red nose cone */
        ctx.beginPath(); ctx.moveTo(-30, -30); ctx.quadraticCurveTo(0, -38, 30, -30); ctx.lineTo(30, -70); ctx.lineTo(-30, -70); ctx.fill();
        ctx.fillStyle = '#4d8dff';
        ctx.fillRect(-30, 8, 60, 4);
        ctx.restore();
        ctx.strokeStyle = art.INK; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(0, -56); ctx.quadraticCurveTo(21, -16, 18, 40); ctx.lineTo(-18, 40); ctx.quadraticCurveTo(-21, -16, 0, -56);
        ctx.closePath(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-16, -30); ctx.quadraticCurveTo(0, -38, 16, -30); ctx.stroke();
        /* a porthole with a little astronaut waving inside */
        ctx.beginPath(); ctx.arc(0, -10, 12.5, 0, Math.PI * 2);
        ctx.fillStyle = '#c9ced9'; ctx.fill(); ctx.stroke();
        ctx.save();
        ctx.beginPath(); ctx.arc(0, -10, 9.5, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = '#243268'; ctx.fillRect(-12, -22, 24, 24);
        ctx.fillStyle = '#f6c9a0';
        ctx.beginPath(); ctx.arc(0, -7, 7, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6b3f24';
        ctx.beginPath(); ctx.arc(0, -10, 7, Math.PI, Math.PI * 2); ctx.fill();
        art.eyes(ctx, 0, -7, 5, 1.3, { dot: true, blink: art.blink(25) });
        art.mouth(ctx, 0, -4, 4, state === 'fly' ? 'o' : 'smile', { lineWidth: 1 });
        var wv = Math.sin(now * 8) * 2;
        art.ball(ctx, 6 + wv * 0.3, -12 + wv, 2.2, '#f6c9a0', { lineWidth: 1, shine: false });
        ctx.restore();
        ctx.fillStyle = 'rgba(255,255,255,.6)';
        ctx.beginPath(); ctx.ellipse(-4, -15, 4, 2, -0.6, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#1f2340';
        ctx.font = U.font(target && api.label(target.w).length > 6 ? 14 : 19);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(target ? api.label(target.w) : '', 0, 24);
        ctx.restore();
      }


      function draw(ctx) {
        var bg = ctx.createLinearGradient(0, 0, 0, api.H);
        bg.addColorStop(0, '#120a2e');
        bg.addColorStop(1, '#31145c');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, api.W, api.H);

        /* soft nebula clouds behind everything */
        [[200, 420, 260, '155,93,229'], [820, 470, 300, '77,141,255'], [560, 120, 220, '255,93,143']].forEach(function (n) {
          var ng = ctx.createRadialGradient(n[0], n[1], 10, n[0], n[1], n[2]);
          ng.addColorStop(0, 'rgba(' + n[3] + ',.28)');
          ng.addColorStop(1, 'rgba(' + n[3] + ',0)');
          ctx.fillStyle = ng;
          ctx.fillRect(n[0] - n[2], n[1] - n[2], n[2] * 2, n[2] * 2);
        });
        ctx.fillStyle = '#ffffff';
        stars.forEach(function (s) {
          ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(performance.now() / 800 + s.t));
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;

        planets.forEach(function (p) {
          var dx = p.shake > 0 ? Math.sin(p.shake * 60) * 10 : 0;
          ctx.save();
          ctx.translate(p.x + dx, p.y);
          /* a faint glow, then the back half of the ring, the planet, and the front half */
          var halo = ctx.createRadialGradient(0, 0, p.r * 0.8, 0, 0, p.r * 1.5);
          halo.addColorStop(0, 'rgba(255,255,255,.18)'); halo.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = halo;
          ctx.beginPath(); ctx.arc(0, 0, p.r * 1.5, 0, Math.PI * 2); ctx.fill();
          ctx.save();
          ctx.rotate(0.3);
          ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 8;
          ctx.beginPath(); ctx.ellipse(0, 0, p.r + 24, 20, 0, Math.PI, Math.PI * 2); ctx.stroke();
          ctx.restore();
          var g = ctx.createRadialGradient(-30, -34, 12, 0, 0, p.r);
          g.addColorStop(0, U.shade(p.hue, 0.6));
          g.addColorStop(0.45, p.hue);
          g.addColorStop(1, U.shade(p.hue, -0.55));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill();
          /* surface bands and craters give each planet some texture */
          ctx.save();
          ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.clip();
          ctx.rotate(p.spin * 0.3);
          ctx.fillStyle = 'rgba(255,255,255,.12)';
          ctx.fillRect(-p.r, -p.r * 0.45, p.r * 2, p.r * 0.18);
          ctx.fillRect(-p.r, p.r * 0.2, p.r * 2, p.r * 0.12);
          ctx.fillStyle = 'rgba(0,0,0,.12)';
          ctx.beginPath(); ctx.arc(p.r * 0.45, p.r * 0.4, p.r * 0.14, 0, Math.PI * 2); ctx.arc(-p.r * 0.5, p.r * 0.55, p.r * 0.09, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          ctx.save();
          ctx.rotate(0.3);
          ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 8;
          ctx.beginPath(); ctx.ellipse(0, 0, p.r + 24, 20, 0, 0, Math.PI); ctx.stroke();
          ctx.restore();

          var word = api.label(p.word.w);
          var fs = word.length > 7 ? 24 : (word.length > 5 ? 30 : 36);
          ctx.font = U.font(fs);
          var tw = ctx.measureText(word).width;
          U.plate(ctx, -tw / 2 - 18, -24, tw + 36, 48, { r: 14 });
          ctx.font = U.font(fs);
          ctx.fillStyle = '#1f2340';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(word, 0, 2);
          ctx.restore();
        });

        drawRocket(ctx);

        U.badge(ctx, api.W / 2, api.H - 60, 'Tap the planet that rhymes', { align: 'center', icon: '🚀' });
      }

      newRound();
      return { update: update, draw: draw, down: down };
    }
  };
})(window.PH = window.PH || {});
