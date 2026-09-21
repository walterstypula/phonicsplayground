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
      var pool = PH.wordsUpTo(api.level.id);
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
            } else {
              misses++;
              pl.shake = 0.6;
              rocket.wobble = 0.5;
              api.sfx.bad();
              api.sayWord(target.w);
              api.say('and', { queue: true });
              api.sayWord(pl.word.w, { queue: true });
              api.say('do not rhyme', { queue: true });
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
            api.sayWord(target.w);
            api.sayWord(g.word.w, { queue: true });
            api.say('They rhyme!', { queue: true });
          }
        } else if (state === 'won') {
          timer += dt;
          if (timer > 1.6) { newRound(); }
        }
      }

      function drawRocket(ctx) {
        ctx.save();
        ctx.translate(rocket.x, rocket.y);
        ctx.rotate(rocket.rot + (rocket.wobble > 0 ? Math.sin(rocket.wobble * 50) * 0.18 : 0));
        ctx.scale(1.5, 1.5);
        var flame = state === 'fly' ? 1 : 0.45 + Math.sin(performance.now() / 90) * 0.2;
        ctx.fillStyle = '#ff9f40';
        ctx.beginPath();
        ctx.moveTo(-16, 42); ctx.lineTo(0, 42 + 48 * flame); ctx.lineTo(16, 42);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath();
        ctx.moveTo(-8, 42); ctx.lineTo(0, 42 + 26 * flame); ctx.lineTo(8, 42);
        ctx.closePath(); ctx.fill();

        ctx.fillStyle = '#ff5d8f';
        ctx.beginPath();
        ctx.moveTo(-26, 30); ctx.lineTo(-14, 6); ctx.lineTo(-14, 34); ctx.closePath(); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(26, 30); ctx.lineTo(14, 6); ctx.lineTo(14, 34); ctx.closePath(); ctx.fill();

        ctx.fillStyle = '#f2f4ff';
        ctx.beginPath();
        ctx.moveTo(0, -56);
        ctx.quadraticCurveTo(20, -16, 18, 42);
        ctx.lineTo(-18, 42);
        ctx.quadraticCurveTo(-20, -16, 0, -56);
        ctx.closePath(); ctx.fill();

        ctx.fillStyle = '#4d8dff';
        ctx.beginPath(); ctx.arc(0, -8, 12, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = '#1f2340';
        ctx.font = U.font(target && target.w.length > 6 ? 15 : 19);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(target ? target.w : '', 0, 24);
        ctx.restore();
      }

      function draw(ctx) {
        var bg = ctx.createLinearGradient(0, 0, 0, api.H);
        bg.addColorStop(0, '#120a2e');
        bg.addColorStop(1, '#31145c');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, api.W, api.H);

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
          var g = ctx.createRadialGradient(-30, -34, 12, 0, 0, p.r);
          g.addColorStop(0, '#ffffff');
          g.addColorStop(0.3, p.hue);
          g.addColorStop(1, 'rgba(0,0,0,.45)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2); ctx.fill();

          ctx.save();
          ctx.rotate(p.spin);
          ctx.strokeStyle = 'rgba(255,255,255,.4)';
          ctx.lineWidth = 7;
          ctx.beginPath(); ctx.ellipse(0, 0, p.r + 20, 18, 0.3, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();

          ctx.fillStyle = 'rgba(255,255,255,.94)';
          var word = p.word.w;
          var fs = word.length > 7 ? 24 : (word.length > 5 ? 30 : 36);
          ctx.font = U.font(fs);
          var tw = ctx.measureText(word).width;
          U.roundRect(ctx, -tw / 2 - 16, -22, tw + 32, 46, 14);
          ctx.fill();
          ctx.fillStyle = '#1f2340';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(word, 0, 2);
          ctx.restore();
        });

        drawRocket(ctx);

        ctx.fillStyle = 'rgba(255,255,255,.8)';
        ctx.font = U.font(24);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('Tap the planet that rhymes', api.W / 2, api.H - 26);
      }

      newRound();
      return { update: update, draw: draw, down: down };
    }
  };
})(window.PH = window.PH || {});
