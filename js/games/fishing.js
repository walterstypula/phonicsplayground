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
      /* ages 3 and 4: fish carry whole pictures or single letters */
      var BANK = api.pre ? api.words.map(function (w) { return w.w; }) : graphemeBank();
      var pics = api.mode === 'pictures';

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
        if (pics) {
          answer = target.w;                          /* "catch the cat" */
        } else if (api.mode === 'letters') {
          answer = target.w;                          /* "first sound in sun" -> s */
          target = { w: target.key };
        }

        var others = U.shuffle(BANK.filter(function (g) { return g !== answer; })).slice(0, pics ? 3 : 4);
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
            speed: api.pre ? U.rand(36, 56) : U.rand(52, 84) + round * 4,
            color: PH.COLORS[(i + round) % PH.COLORS.length],
            wig: U.rand(0, 6), shake: 0, caught: false
          };
        });

        hook.x = api.W / 2; hook.y = hook.homeY; hook.target = null;
        state = 'play';
        api.setProgress(round, ROUNDS);
        api.setPrompt(pics ? 'Catch the' : (mode === 'first' ? 'First sound in' : 'Last sound in'),
          { word: target.w, show: true, repeat: sayPrompt });
        sayPrompt();
      }

      function sayPrompt() {
        if (pics) {
          api.say('Catch the');
          api.sayWord(target.w, { queue: true });
          return;
        }
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
              if (pics) {
                api.say('That is a');
                api.sayWord(f.g, { queue: true });
              } else {
                api.say('That one says');
                api.say(PH.soundHint(f.g), { rate: 0.55, queue: true });
              }
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
            if (pics) {
              api.say('You caught the');
              api.sayWord(target.w, { queue: true });
            } else {
              api.say('Yes!');
              api.say(PH.soundHint(answer), { rate: 0.55, queue: true });
              api.say('in', { queue: true });
              api.sayWord(target.w, { queue: true });
            }
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
        g.addColorStop(0, U.shade(f.color, 0.55));
        g.addColorStop(0.5, f.color);
        g.addColorStop(1, U.shade(f.color, -0.35));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(0, 0, 62, 36, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = U.shade(f.color, -0.45); ctx.lineWidth = 3; ctx.stroke();
        /* a couple of stripes and a smile */
        ctx.save();
        ctx.beginPath(); ctx.ellipse(0, 0, 62, 36, 0, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,.22)';
        ctx.fillRect(-30, -40, 12, 80); ctx.fillRect(-6, -40, 10, 80);
        ctx.restore();
        ctx.strokeStyle = U.shade(f.color, -0.5); ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(48, 8, 7, 0.2, 1.4); ctx.stroke();
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
        var shown = api.label(f.g);
        ctx.font = U.font(api.mode === 'letters' ? 36 : (shown.length > 2 ? 24 : 32));
        var tw = ctx.measureText(shown).width;
        U.plate(ctx, -tw / 2 - 12, -20, tw + 24, 40, { r: 12, shine: 0.35 });
        ctx.fillStyle = '#1f2340';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(shown, 0, 2);
        ctx.restore();
      }

      function draw(ctx) {
        var now = performance.now() / 1000;
        var sky = ctx.createLinearGradient(0, 0, 0, 125);
        sky.addColorStop(0, '#74c0fc'); sky.addColorStop(1, '#e7f5ff');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, api.W, 125);
        var sg = ctx.createRadialGradient(120, 40, 8, 120, 40, 80);
        sg.addColorStop(0, 'rgba(255,236,150,.95)'); sg.addColorStop(1, 'rgba(255,236,150,0)');
        ctx.fillStyle = sg; ctx.fillRect(40, 0, 160, 120);
        ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(120, 40, 24, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        [[(now * 10) % 1200 - 100, 40], [(now * 6 + 700) % 1200 - 100, 70]].forEach(function (c) {
          ctx.beginPath(); ctx.arc(c[0], c[1], 16, 0, Math.PI * 2); ctx.arc(c[0] + 20, c[1] + 4, 12, 0, Math.PI * 2); ctx.arc(c[0] - 18, c[1] + 4, 11, 0, Math.PI * 2); ctx.fill();
        });
        /* a far green shore */
        ctx.fillStyle = '#8ce99a';
        ctx.beginPath(); ctx.ellipse(160, 124, 220, 26, 0, Math.PI, Math.PI * 2); ctx.ellipse(880, 124, 190, 20, 0, Math.PI, Math.PI * 2); ctx.fill();

        var water = ctx.createLinearGradient(0, 120, 0, api.H);
        water.addColorStop(0, '#4dc3ef');
        water.addColorStop(0.6, '#1c7ed6');
        water.addColorStop(1, '#0b3f6e');
        ctx.fillStyle = water;
        ctx.fillRect(0, 120, api.W, api.H - 120);
        /* shafts of sunlight through the water */
        ctx.save();
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = '#ffffff';
        for (var ray = 0; ray < 6; ray++) {
          var rx = 80 + ray * 170 + Math.sin(now * 0.5 + ray) * 20;
          ctx.beginPath(); ctx.moveTo(rx, 120); ctx.lineTo(rx + 50, 120); ctx.lineTo(rx + 150, api.H); ctx.lineTo(rx + 60, api.H); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
        /* sandy bottom with swaying weed */
        ctx.fillStyle = '#e9cf93';
        ctx.beginPath(); ctx.moveTo(0, api.H);
        for (var bx = 0; bx <= api.W; bx += 40) { ctx.lineTo(bx, api.H - 26 - Math.sin(bx * 0.02) * 8); }
        ctx.lineTo(api.W, api.H); ctx.closePath(); ctx.fill();
        [70, 330, 610, 950].forEach(function (wx, n) {
          ctx.strokeStyle = '#2f9e44'; ctx.lineWidth = 7; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(wx, api.H - 20);
          ctx.quadraticCurveTo(wx + Math.sin(now + n) * 20, api.H - 70, wx + Math.sin(now * 1.3 + n) * 10, api.H - 110);
          ctx.stroke();
        });

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

        U.badge(ctx, api.W - 18, 132, 'Tap the fish with the right sound', { align: 'right', icon: '🎣', size: 18 });
      }

      newRound();
      return { update: update, draw: draw, down: down };
    }
  };
})(window.PH = window.PH || {});
