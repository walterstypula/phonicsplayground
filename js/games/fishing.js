/* Sound Fishing - hear a word, hook the fish carrying its first (or last) sound */
(function (PH) {
  'use strict';
  var U = PH.util;

  PH.games.fishing = {
    id: 'fishing',
    name: 'Sound Fishing',
    icon: '🎣',
    blurb: 'Listen for the sound at the start or the end of the word, then hook that fish.',

    create: function (api) {
      var ROUNDS = 6;
      var round = 0, target = null, mode = 'first', answer = '', fish = [], recent = [];
      var hits = 0, misses = 0, state = 'play', timer = 0;
      var hook = { x: api.W / 2, y: 118, target: null, homeY: 118 };
      var ripples = [];

      function graphemeBank() {
        var set = {};
        api.words.forEach(function (w) {
          set[PH.firstSound(w)] = 1;
          set[PH.lastSound(w)] = 1;
        });
        return Object.keys(set);
      }
      var BANK = graphemeBank();

      function newRound() {
        round++;
        if (round > ROUNDS) {
          var acc = hits + misses ? hits / (hits + misses) : 1;
          api.finish(null, acc);
          state = 'over';
          return;
        }
        var pool = api.words.filter(function (w) { return recent.indexOf(w.w) < 0; });
        target = U.pick(pool.length > 6 ? pool : api.words);
        recent.push(target.w);
        if (recent.length > 5) { recent.shift(); }

        mode = (api.level.id >= 2 && Math.random() < 0.4) ? 'last' : 'first';
        answer = mode === 'first' ? PH.firstSound(target) : PH.lastSound(target);

        var others = U.shuffle(BANK.filter(function (g) { return g !== answer; })).slice(0, 4);
        var all = U.shuffle([answer].concat(others));

        var lanes = U.shuffle([212, 300, 388, 476, 556]);
        var spots = U.shuffle([130, 320, 500, 680, 870]);
        fish = all.map(function (g, i) {
          var dir = Math.random() < 0.5 ? 1 : -1;
          return {
            g: g, right: g === answer,
            y: lanes[i] + U.rand(-10, 10),
            x: spots[i] + U.rand(-30, 30),
            dir: dir,
            speed: U.rand(52, 84) + round * 4,
            color: PH.COLORS[(i + round) % PH.COLORS.length],
            wig: U.rand(0, 6), shake: 0, caught: false
          };
        });

        hook.x = api.W / 2; hook.y = hook.homeY; hook.target = null;
        state = 'play';
        api.setProgress(round, ROUNDS);
        api.setPrompt(mode === 'first' ? 'First sound in' : 'Last sound in',
          { word: target.w, show: true, repeat: sayPrompt });
        sayPrompt();
      }

      function sayPrompt() {
        api.say('Catch the ' + (mode === 'first' ? 'first' : 'last') + ' sound in');
        api.sayWord(target.w, { queue: true });
      }

      function down(p) {
        if (state !== 'play') { return; }
        for (var i = 0; i < fish.length; i++) {
          var f = fish[i];
          if (f.caught) { continue; }
          if (Math.abs(p.x - f.x) < 76 && Math.abs(p.y - f.y) < 44) {
            if (f.right) {
              hits++;
              f.caught = true;
              hook.target = f;
              state = 'hook'; timer = 0;
              api.sfx.splash();
              ripples.push({ x: f.x, y: f.y, r: 10, life: 0.8, age: 0 });
            } else {
              misses++;
              f.shake = 0.5;
              f.speed += 40;
              api.sfx.bad();
              api.say('That one says');
              api.say(PH.soundHint(f.g), { rate: 0.55, queue: true });
            }
            return;
          }
        }
      }

      function update(dt) {
        fish.forEach(function (f) {
          if (f.caught) { return; }
          f.x += f.dir * f.speed * dt;
          f.wig += dt * 8;
          if (f.shake > 0) { f.shake -= dt; }
          if (f.dir > 0 && f.x > api.W + 150) { f.x = -150; }
          if (f.dir < 0 && f.x < -150) { f.x = api.W + 150; }
        });
        for (var i = ripples.length - 1; i >= 0; i--) {
          var rp = ripples[i];
          rp.age += dt; rp.r += 60 * dt;
          if (rp.age > rp.life) { ripples.splice(i, 1); }
        }

        if (state === 'hook') {
          timer += dt;
          var f = hook.target;
          var k = U.clamp(timer / 0.4, 0, 1);
          hook.x = U.lerp(api.W / 2, f.x, k);
          hook.y = U.lerp(hook.homeY, f.y, k);
          if (k >= 1) { state = 'reel'; timer = 0; }
        } else if (state === 'reel') {
          timer += dt;
          var k2 = U.clamp(timer / 0.7, 0, 1);
          var e = 1 - Math.pow(1 - k2, 2);
          hook.y = U.lerp(hook.target.y, hook.homeY - 12, e);
          hook.x = U.lerp(hook.target.x, api.W / 2, e);
          hook.target.x = hook.x;
          hook.target.y = hook.y + 26;
          if (k2 >= 1) {
            state = 'won'; timer = 0;
            api.addStar(1);
            api.sfx.great();
            api.burst(api.W / 2, hook.homeY, null, 26, { lift: 120 });
            api.say('Yes!');
            api.say(PH.soundHint(answer), { rate: 0.55, queue: true });
            api.say('in', { queue: true });
            api.sayWord(target.w, { queue: true });
          }
        } else if (state === 'won') {
          timer += dt;
          if (timer > 1.6) { newRound(); }
        }
      }

      function drawFish(ctx, f) {
        ctx.save();
        ctx.translate(f.x, f.y + (f.shake > 0 ? Math.sin(f.shake * 60) * 6 : 0));
        ctx.scale(f.dir, 1);
        var wig = Math.sin(f.wig) * 0.18;
        /* tail */
        ctx.fillStyle = f.color;
        ctx.save();
        ctx.translate(-58, 0);
        ctx.rotate(wig);
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(-34, -26); ctx.lineTo(-34, 26);
        ctx.closePath(); ctx.fill();
        ctx.restore();
        /* body */
        var g = ctx.createLinearGradient(0, -34, 0, 34);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.45, f.color);
        g.addColorStop(1, 'rgba(0,0,0,.25)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(0, 0, 62, 36, 0, 0, Math.PI * 2); ctx.fill();
        /* fin */
        ctx.fillStyle = 'rgba(255,255,255,.55)';
        ctx.beginPath(); ctx.ellipse(-4, -30, 20, 10, -0.3, 0, Math.PI * 2); ctx.fill();
        /* eye */
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(38, -8, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1f2340';
        ctx.beginPath(); ctx.arc(40, -8, 5, 0, Math.PI * 2); ctx.fill();
        /* the sound */
        ctx.scale(f.dir, 1);
        ctx.fillStyle = 'rgba(255,255,255,.92)';
        ctx.font = U.font(f.g.length > 2 ? 26 : 32);
        var tw = ctx.measureText(f.g).width;
        U.roundRect(ctx, -tw / 2 - 12, -18, tw + 24, 38, 12);
        ctx.fill();
        ctx.fillStyle = '#1f2340';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(f.g, 0, 2);
        ctx.restore();
      }

      function draw(ctx) {
        ctx.fillStyle = '#bfe9ff';
        ctx.fillRect(0, 0, api.W, api.H);
        var water = ctx.createLinearGradient(0, 120, 0, api.H);
        water.addColorStop(0, '#5ec8f0');
        water.addColorStop(1, '#0f4f7a');
        ctx.fillStyle = water;
        ctx.fillRect(0, 120, api.W, api.H - 120);

        /* surface wobble */
        ctx.strokeStyle = 'rgba(255,255,255,.6)';
        ctx.lineWidth = 5;
        ctx.beginPath();
        for (var x = 0; x <= api.W; x += 12) {
          var y = 120 + Math.sin(x / 42 + performance.now() / 700) * 6;
          if (x === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
        }
        ctx.stroke();

        /* boat */
        ctx.fillStyle = '#c1440e';
        ctx.beginPath();
        ctx.moveTo(api.W / 2 - 96, 78);
        ctx.lineTo(api.W / 2 + 96, 78);
        ctx.lineTo(api.W / 2 + 62, 122);
        ctx.lineTo(api.W / 2 - 62, 122);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffd23f';
        U.roundRect(ctx, api.W / 2 - 96, 66, 192, 16, 8); ctx.fill();
        ctx.fillStyle = '#7a4a2b';
        ctx.fillRect(api.W / 2 + 40, 6, 9, 66);
        ctx.strokeStyle = '#3a2a1a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(api.W / 2 + 45, 12);
        ctx.lineTo(hook.x, hook.y);
        ctx.stroke();

        ripples.forEach(function (rp) {
          ctx.globalAlpha = U.clamp(1 - rp.age / rp.life, 0, 1) * 0.7;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2); ctx.stroke();
          ctx.globalAlpha = 1;
        });

        fish.forEach(function (f) { drawFish(ctx, f); });

        /* hook */
        ctx.strokeStyle = '#e6e9f5';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(hook.x, hook.y + 10, 11, Math.PI * 0.1, Math.PI * 1.25);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255,255,255,.9)';
        ctx.font = U.font(24);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('Tap the fish with the right sound', 24, 50);
      }

      newRound();
      return { update: update, draw: draw, down: down };
    }
  };
})(window.PH = window.PH || {});
