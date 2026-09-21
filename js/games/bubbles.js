/* Sound Pop - hear a sound, pop only the bubbles whose word contains it */
(function (PH) {
  'use strict';
  var U = PH.util;

  PH.games.bubbles = {
    id: 'bubbles',
    name: 'Sound Pop',
    icon: '🫧',
    blurb: 'A sound floats up from the sea bed. Pop every bubble that hides that sound.',

    create: function (api) {
      var ROUNDS = 4, NEED = 4;
      var round = 0, sound = '', keyword = '', bubbles = [], spawnT = 0;
      var got = 0, hits = 0, misses = 0, state = 'play', timer = 0, usedSounds = [];

      /* level 5 words are chunked into syllables, so match on spelling patterns there;
         everywhere else match on the graphemes that actually make a sound */
      var bySpelling = api.level.id === 5;
      var sounds;
      if (bySpelling) {
        sounds = ['er', 'et', 'ing', 'un', 'an', 'in', 'ar', 'or', 'th', 'le', 'ck']
          .filter(function (p) {
            var n = api.words.filter(function (w) { return w.w.indexOf(p) >= 0; }).length;
            return n >= 4 && api.words.length - n >= 6;
          });
      } else {
        sounds = PH.soundsFor(api.level, 4);
      }
      /* ages 3 and 4: the target is a whole picture or letter - "pop every cat" */
      if (api.pre) { sounds = api.words.map(function (w) { return w.w; }); }
      if (!sounds.length) { sounds = ['a']; }

      function matches(w) {
        if (api.pre) { return w.w === sound; }
        return bySpelling ? w.w.indexOf(sound) >= 0 : PH.soundGraphemes(w).indexOf(sound) >= 0;
      }

      function matchPool() { return api.words.filter(matches); }
      function otherPool() { return api.words.filter(function (w) { return !matches(w); }); }

      function newRound() {
        round++;
        if (round > ROUNDS) {
          var acc = hits + misses ? hits / (hits + misses) : 1;
          api.finish(null, acc);
          state = 'over';
          return;
        }
        var choices = sounds.filter(function (s) { return usedSounds.indexOf(s) < 0; });
        sound = U.pick(choices.length ? choices : sounds);
        usedSounds.push(sound);

        var starters = api.words.filter(function (w) { return PH.firstSound(w) === sound; });
        var any = matchPool();
        keyword = (starters.length ? U.pick(starters) : U.pick(any)).w;

        got = 0;
        bubbles = [];
        for (var i = 0; i < 6; i++) { spawn(U.rand(90, api.H - 60)); }
        state = 'play';
        api.setProgress(round, ROUNDS);
        api.setPrompt(api.pre ? 'Pop every' : 'Pop the sound', { word: sound, show: true, repeat: sayPrompt });
        sayPrompt();
      }

      function sayPrompt() {
        if (api.pre) {
          api.say('Pop every');
          api.sayWord(sound, { queue: true });
          return;
        }
        api.say('Pop the words with the sound');
        api.say(PH.soundHint(sound), { rate: 0.55, queue: true });
        api.say('like in', { queue: true });
        api.sayWord(keyword, { queue: true });
      }

      function spawn(startY) {
        var wantMatch = Math.random() < 0.45;
        var pool = wantMatch ? matchPool() : otherPool();
        if (!pool.length) { pool = api.words; }
        var word = U.pick(pool);
        var shown = api.label(word.w);
        var fs = api.mode === 'letters' ? 46 : (shown.length > 7 ? 20 : (shown.length > 5 ? 24 : 29));
        var ctx = PH.Engine.ctx;
        ctx.font = U.font(fs);
        var tw = ctx.measureText(shown).width;
        var r = Math.max(44, tw / 2 + 18);
        bubbles.push({
          word: word, match: matches(word), r: r, fs: fs,
          x: U.rand(r + 14, api.W - r - 14),
          y: startY === undefined ? api.H + r + U.rand(0, 120) : startY,
          vy: U.rand(34, 62),
          phase: U.rand(0, 6), amp: U.rand(10, 26),
          pop: -1, dead: false, grey: 0
        });
      }

      function down(p) {
        if (state !== 'play') { return; }
        for (var i = bubbles.length - 1; i >= 0; i--) {
          var b = bubbles[i];
          if (b.pop >= 0 || b.dead) { continue; }
          if (U.dist(p.x, p.y, b.x, b.y) <= b.r) {
            if (b.match) {
              b.pop = 0; hits++; got++;
              api.addStar(1);
              api.sfx.pop();
              api.burst(b.x, b.y, ['#8ef0ff', '#ffffff', '#4d8dff'], 14, { gravity: 200 });
              if (got >= NEED) {
                state = 'between'; timer = 0;
                api.sfx.great();
                api.say('Brilliant!');
              }
            } else {
              misses++; b.grey = 1.2; b.dead = true; b.vy = -30;
              api.sfx.bad();
            }
            return;
          }
        }
      }

      function update(dt) {
        spawnT -= dt;
        var alive = bubbles.filter(function (b) { return b.pop < 0 && !b.dead; }).length;
        if (state === 'play' && spawnT <= 0 && alive < 8) {
          spawn();
          spawnT = U.rand(0.45, 1.1);
        }
        bubbles.forEach(function (b) {
          if (b.pop >= 0) { b.pop += dt * 3.4; return; }
          b.y -= b.vy * dt;
          b.phase += dt * 1.6;
          b.x += Math.sin(b.phase) * b.amp * dt;
          b.x = U.clamp(b.x, b.r + 6, api.W - b.r - 6);
          if (b.grey > 0) { b.grey -= dt; }
        });
        bubbles = bubbles.filter(function (b) {
          return b.pop < 1.1 && b.y > -b.r - 20;
        });
        if (state === 'between') {
          timer += dt;
          if (timer > 1.2) { newRound(); }
        }
      }

      function draw(ctx) {
        var sea = ctx.createLinearGradient(0, 0, 0, api.H);
        sea.addColorStop(0, '#9ce6ff');
        sea.addColorStop(0.5, '#3fb8e0');
        sea.addColorStop(1, '#125a8a');
        ctx.fillStyle = sea;
        ctx.fillRect(0, 0, api.W, api.H);

        /* sun rays */
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = '#ffffff';
        for (var i = 0; i < 5; i++) {
          ctx.save();
          ctx.translate(180 + i * 170, -40);
          ctx.rotate(0.25);
          ctx.fillRect(0, 0, 60, api.H + 200);
          ctx.restore();
        }
        ctx.restore();

        /* sea bed */
        ctx.fillStyle = '#f3d9a4';
        ctx.beginPath();
        ctx.moveTo(0, api.H);
        ctx.lineTo(0, api.H - 44);
        for (var x = 0; x <= api.W; x += 50) {
          ctx.quadraticCurveTo(x + 25, api.H - 62, x + 50, api.H - 44);
        }
        ctx.lineTo(api.W, api.H);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#2f9e6b';
        [120, 300, 640, 860].forEach(function (sx, k) {
          ctx.save();
          ctx.translate(sx, api.H - 46);
          var sway = Math.sin(performance.now() / 900 + k) * 0.16;
          ctx.rotate(sway);
          U.roundRect(ctx, -9, -110, 18, 112, 9); ctx.fill();
          ctx.restore();
        });

        /* the target sound, big, on the sea bed */
        ctx.save();
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = '#ffffff';
        ctx.font = U.font(120);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(api.label(sound), api.W / 2, api.H - 96);
        ctx.restore();

        bubbles.forEach(function (b) {
          var scale = 1, alpha = 1;
          if (b.pop >= 0) { scale = 1 + b.pop * 0.5; alpha = U.clamp(1 - b.pop, 0, 1); }
          if (b.dead) { alpha = U.clamp(b.grey / 1.2, 0, 1) * 0.8 + 0.2; }
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(b.x, b.y);
          ctx.scale(scale, scale);

          var g = ctx.createRadialGradient(-b.r * 0.35, -b.r * 0.4, b.r * 0.1, 0, 0, b.r);
          if (b.dead) {
            g.addColorStop(0, 'rgba(255,255,255,.7)');
            g.addColorStop(1, 'rgba(120,130,150,.65)');
          } else {
            g.addColorStop(0, 'rgba(255,255,255,.95)');
            g.addColorStop(0.55, 'rgba(190,240,255,.72)');
            g.addColorStop(1, 'rgba(90,190,230,.62)');
          }
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.85)';
          ctx.lineWidth = 3;
          ctx.stroke();

          ctx.fillStyle = 'rgba(255,255,255,.75)';
          ctx.beginPath(); ctx.ellipse(-b.r * 0.35, -b.r * 0.42, b.r * 0.22, b.r * 0.13, -0.6, 0, Math.PI * 2); ctx.fill();

          ctx.fillStyle = '#123a52';
          ctx.font = U.font(b.fs);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(api.label(b.word.w), 0, 2);
          ctx.restore();
        });

        ctx.fillStyle = 'rgba(255,255,255,.9)';
        ctx.font = U.font(26);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('Popped ' + got + ' of ' + NEED, 26, 48);
      }

      newRound();
      return { update: update, draw: draw, down: down };
    }
  };
})(window.PH = window.PH || {});
