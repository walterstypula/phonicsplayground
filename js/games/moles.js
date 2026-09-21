/* Tricky Word Whack-a-Mole - bonk the mole holding the word you hear. Tricky words are learnt by sight */
(function (PH) {
  'use strict';
  var U = PH.util;

  PH.games.moles = {
    id: 'moles',
    name: 'Whack-a-Mole',
    icon: '🔨',
    blurb: 'Moles pop up holding tricky words like "said" and "the". Bonk the one you hear with the squeaky hammer!',

    create: function (api) {
      var pics = api.mode === 'pictures', letters = api.mode === 'letters';
      var ROUNDS = 5, NEED = api.pre ? 2 : 3;
      /* two rows, spaced so a mole's raised sign never hides the mole behind it */
      var HOLES = api.pre
        ? [[220, 300], [500, 300], [780, 300], [220, 560], [500, 560], [780, 560]]
        : [[140, 300], [380, 300], [620, 300], [860, 300], [140, 560], [380, 560], [620, 560], [860, 560]];
      var holes = HOLES.map(function (h) { return { x: h[0], y: h[1], mole: null }; });
      var round = 0, target = null, choices = [], got = 0, recent = [];
      var hits = 0, misses = 0, streak = 0, state = 'play', timer = 0, spawnT = 1;
      var hammer = { x: 500, y: 320, swing: 0 };
      var flowers = [], i;
      for (i = 0; i < 16; i++) { flowers.push({ x: U.rand(20, 980), y: U.rand(150, 630), c: U.pick(PH.COLORS) }); }

      /* the list of things moles can hold at this level */
      var BANK = pics ? PH.PICTURES.map(function (p) { return p.w; })
        : letters ? api.words.map(function (w) { return w.w; })
        : PH.TRICKY[api.level.id].slice();

      /* letters that are easy to mix up, so lowercase practice is real practice */
      var LOOKALIKE = { b: 'dpq', d: 'bpq', p: 'bdq', q: 'bdp', m: 'nw', n: 'mhu', u: 'nv', w: 'mv', h: 'nb', f: 't', t: 'f', i: 'l', l: 'i' };

      function upTime() {
        var base = api.pre ? 2.8 : 2.1;
        return Math.max(api.pre ? 1.8 : 1.05, base - streak * 0.12);   /* quicker as the child gets better */
      }

      function newRound() {
        round++;
        if (round > ROUNDS) {
          api.finish(null, hits + misses ? hits / (hits + misses) : 1);
          state = 'over';
          return;
        }
        var fresh = BANK.filter(function (w) { return recent.indexOf(w) < 0; });
        target = U.pick(fresh.length ? fresh : BANK);
        recent.push(target);
        if (recent.length > 4) { recent.shift(); }
        var others = BANK.filter(function (w) { return w !== target; });
        if (letters && LOOKALIKE[target]) {
          var look = LOOKALIKE[target].split('').filter(function (c) { return BANK.indexOf(c) >= 0; });
          others = look.concat(U.shuffle(others)).filter(function (c, n, arr) { return arr.indexOf(c) === n && c !== target; });
        } else {
          others = U.shuffle(others);
        }
        choices = others.slice(0, api.pre ? 3 : 5);
        got = 0;
        holes.forEach(function (h) { h.mole = null; });
        spawnT = 0.8;
        state = 'play';
        api.setProgress(round, ROUNDS);
        if (letters) {
          api.setPrompt('Bonk the small partner of', { word: target.toUpperCase(), show: true, repeat: sayPrompt });
        } else {
          api.setPrompt('Bonk', { word: target, repeat: sayPrompt });
        }
        sayPrompt();
      }

      function sayPrompt() {
        if (letters) {
          api.say('Bonk the little letter that goes with big');
          api.say(target.toUpperCase(), { queue: true });
          return;
        }
        api.say(pics ? 'Bonk the' : 'Bonk the word');
        api.sayWord(target, { queue: true });
      }

      function spawn() {
        var empty = holes.filter(function (h) { return !h.mole; });
        if (!empty.length) { return; }
        var showing = holes.some(function (h) { return h.mole && h.mole.label === target && h.mole.phase !== 'down'; });
        var wantTarget = !showing && Math.random() < 0.5;
        var h = U.pick(empty);
        h.mole = {
          label: wantTarget ? target : U.pick(choices),
          up: 0, phase: 'rise', life: upTime(), hit: 0, raz: 0
        };
      }

      /* ---------------- input ---------------- */
      function move(p) { hammer.x = p.x; hammer.y = p.y; }

      function down(p) {
        hammer.x = p.x; hammer.y = p.y; hammer.swing = 0.18;
        if (state !== 'play') { return; }
        /* a tap counts on the mole's body or on the sign it holds; nearest mole wins */
        var pick = null, bestD = 1e9;
        holes.forEach(function (hh) {
          var mm = hh.mole;
          if (!mm || mm.hit || mm.raz || mm.up < 0.45) { return; }
          var top = hh.y + 70 - mm.up * 120;
          var r = signRect(hh, mm, top);
          var onBody = Math.abs(p.x - hh.x) < 60 && p.y > top - 95 && p.y < hh.y + 20;
          var onSign = p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
          if (onBody || onSign) {
            var d = U.dist(p.x, p.y, hh.x, top - 40);
            if (d < bestD) { bestD = d; pick = hh; }
          }
        });
        if (!pick) { api.sfx.whoosh(); return; }
        var h = pick, m = pick.mole;
        api.sfx.bonk();
        if (m.label === target) {
          m.hit = 1; m.phase = 'stay';
          hits++; got++; streak++;
          api.addStar(1);
          api.sfx.good();
          api.burst(h.x, h.y - 80, ['#ffd23f', '#ffffff', '#ff9f40'], 16);
          if (got >= NEED) {
            state = 'between'; timer = 0;
            api.sfx.great();
            api.say('Bonk bonk! Brilliant!');
          }
        } else {
          m.raz = 1; m.phase = 'stay';
          misses++; streak = 0;
          api.sfx.raspberry();
          if (!letters) {
            api.say(pics ? 'That is a' : 'That says');
            api.sayWord(m.label, { queue: true });
          }
        }
      }

      /* where a mole's sign is, shared by drawing and tapping */
      function signFont(m) {
        var text = api.label(m.label);
        return letters ? 46 : (text.length > 8 ? 22 : (text.length > 5 ? 26 : 32));
      }
      function signRect(h, m, top) {
        var ctx = PH.Engine.ctx, fs = signFont(m);
        ctx.font = U.font(fs);
        var tw = Math.max(70, ctx.measureText(api.label(m.label)).width + 30);
        return { x: h.x + 48 - tw / 2, y: top - 190, w: tw, h: fs + 22 };
      }

      /* ---------------- update ---------------- */
      function update(dt) {
        if (hammer.swing > 0) { hammer.swing -= dt; }
        holes.forEach(function (h) {
          var m = h.mole;
          if (!m) { return; }
          if (m.phase === 'rise') {
            m.up = Math.min(1, m.up + dt * 5);
            if (m.up >= 1) { m.phase = 'up'; }
          } else if (m.phase === 'up') {
            m.life -= dt;
            if (m.life <= 0) { m.phase = 'down'; }
          } else if (m.phase === 'stay') {
            m.hit = m.hit ? m.hit + dt : 0;
            m.raz = m.raz ? m.raz + dt : 0;
            if ((m.hit || m.raz) > 0.9) { m.phase = 'down'; }
          } else if (m.phase === 'down') {
            m.up -= dt * 4;
            if (m.up <= 0) { h.mole = null; }
          }
        });
        if (state === 'play') {
          spawnT -= dt;
          if (spawnT <= 0) {
            spawn();
            spawnT = api.pre ? U.rand(0.9, 1.4) : U.rand(0.5, 1.0);
          }
        } else if (state === 'between') {
          timer += dt;
          holes.forEach(function (h) { if (h.mole && h.mole.phase !== 'stay') { h.mole.phase = 'down'; } });
          if (timer > 1.6) { newRound(); }
        }
      }

      /* ---------------- drawing ---------------- */
      function drawMole(ctx, h) {
        var m = h.mole;
        var rise = m.up * 120;
        var dizzy = m.hit > 0;
        ctx.save();
        /* only the part above the hole is visible */
        ctx.beginPath(); ctx.rect(h.x - 120, h.y - 330, 240, 330); ctx.clip();
        ctx.translate(h.x, h.y + 70 - rise);
        /* sign on a stick */
        var text = api.label(m.label);
        var fs = signFont(m);
        ctx.font = U.font(fs);
        var tw = Math.max(70, ctx.measureText(text).width + 30);
        ctx.fillStyle = '#7a4a2b';
        ctx.fillRect(44, -150, 7, 110);
        U.plate(ctx, 48 - tw / 2, -190, tw, fs + 22, { fill: '#fff4d6', r: 10, edge: '#b07a3a' });
        ctx.fillStyle = '#1f2340';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, 48, -190 + (fs + 22) / 2 + 1);
        /* body: velvety fur with a soft highlight */
        var fur = ctx.createRadialGradient(-14, -58, 6, 0, -30, 70);
        fur.addColorStop(0, '#b07a52'); fur.addColorStop(1, '#6f4327');
        ctx.fillStyle = fur;
        ctx.beginPath(); ctx.ellipse(0, -30, 46, 60, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#4a2a14'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.fillStyle = '#c69c7a';
        ctx.beginPath(); ctx.ellipse(0, -10, 28, 34, 0, 0, Math.PI * 2); ctx.fill();
        /* face */
        if (dizzy) {
          ctx.strokeStyle = '#1f2340'; ctx.lineWidth = 3;
          [-15, 15].forEach(function (ex) {
            ctx.beginPath(); ctx.moveTo(ex - 6, -60); ctx.lineTo(ex + 6, -48); ctx.moveTo(ex + 6, -60); ctx.lineTo(ex - 6, -48); ctx.stroke();
          });
          ctx.fillStyle = '#ffd23f';
          for (var s = 0; s < 3; s++) {
            var a = performance.now() / 200 + s * 2.1;
            U.star(ctx, Math.cos(a) * 36, -96 + Math.sin(a) * 10, 9, 4); ctx.fill();
          }
        } else {
          ctx.fillStyle = '#1f2340';
          ctx.beginPath(); ctx.arc(-15, -54, 6, 0, Math.PI * 2); ctx.arc(15, -54, 6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(-13, -56, 2, 0, Math.PI * 2); ctx.arc(17, -56, 2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = '#ff8fa8';
        ctx.beginPath(); ctx.ellipse(0, -38, 11, 8, 0, 0, Math.PI * 2); ctx.fill();
        if (m.raz > 0) {
          /* blowing a raspberry */
          ctx.fillStyle = '#ff5d8f';
          ctx.beginPath(); ctx.ellipse(0, -18, 10, 14 + Math.sin(m.raz * 40) * 3, 0, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.fillStyle = '#fff';
          ctx.fillRect(-7, -28, 6, 9); ctx.fillRect(1, -28, 6, 9);
        }
        /* paws on the rim */
        ctx.fillStyle = '#8d5a3b';
        ctx.beginPath(); ctx.ellipse(-32, 22, 14, 9, 0, 0, Math.PI * 2); ctx.ellipse(32, 22, 14, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      function drawHammer(ctx) {
        var ang = hammer.swing > 0 ? -0.2 + (1 - hammer.swing / 0.18) * 1.1 : -0.5;
        ctx.save();
        ctx.translate(hammer.x + 30, hammer.y + 50);
        ctx.rotate(ang);
        ctx.fillStyle = '#c69c6d';
        U.roundRect(ctx, -6, -90, 12, 100, 6); ctx.fill();
        ctx.fillStyle = '#ff5d5d';
        U.roundRect(ctx, -42, -122, 84, 44, 16); ctx.fill();
        ctx.fillStyle = '#ffd23f';
        U.roundRect(ctx, -46, -118, 12, 36, 6); ctx.fill();
        U.roundRect(ctx, 34, -118, 12, 36, 6); ctx.fill();
        ctx.restore();
      }

      function draw(ctx) {
        var now = performance.now() / 1000;
        var sky = ctx.createLinearGradient(0, 0, 0, 170);
        sky.addColorStop(0, '#74c0fc');
        sky.addColorStop(1, '#e7f5ff');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, api.W, 170);
        /* sun and a couple of lazy clouds */
        var sg = ctx.createRadialGradient(90, 50, 10, 90, 50, 90);
        sg.addColorStop(0, 'rgba(255,236,150,.95)'); sg.addColorStop(1, 'rgba(255,236,150,0)');
        ctx.fillStyle = sg; ctx.fillRect(0, 0, 200, 150);
        ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(90, 50, 30, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        [[(now * 12) % 1200 - 100, 60, 1], [(now * 8 + 600) % 1200 - 100, 95, 0.7]].forEach(function (c) {
          ctx.beginPath(); ctx.arc(c[0], c[1], 22 * c[2], 0, Math.PI * 2); ctx.arc(c[0] + 26 * c[2], c[1] + 6, 17 * c[2], 0, Math.PI * 2);
          ctx.arc(c[0] - 24 * c[2], c[1] + 6, 15 * c[2], 0, Math.PI * 2); ctx.fill();
        });
        /* bushes along the back */
        ctx.fillStyle = '#40a95a';
        for (var bx = -20; bx < api.W + 40; bx += 70) {
          ctx.beginPath(); ctx.arc(bx, 160, 42 + (bx % 3) * 6, Math.PI, Math.PI * 2); ctx.fill();
        }
        /* a white picket fence */
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 138, api.W, 7);
        for (var fx = 8; fx < api.W; fx += 34) {
          ctx.beginPath(); ctx.moveTo(fx, 170); ctx.lineTo(fx, 118); ctx.lineTo(fx + 9, 110); ctx.lineTo(fx + 18, 118); ctx.lineTo(fx + 18, 170); ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = 'rgba(0,0,0,.08)';
        ctx.fillRect(0, 152, api.W, 5);
        /* mown lawn stripes */
        for (var ly = 160; ly < api.H; ly += 60) {
          ctx.fillStyle = (ly / 60 | 0) % 2 ? '#69db7c' : '#5fcf72';
          ctx.fillRect(0, ly, api.W, 60);
        }
        flowers.forEach(function (f) {
          ctx.fillStyle = f.c;
          for (var p = 0; p < 5; p++) {
            ctx.beginPath(); ctx.arc(f.x + Math.cos(p * 1.26) * 6, f.y + Math.sin(p * 1.26) * 6, 4, 0, Math.PI * 2); ctx.fill();
          }
          ctx.fillStyle = '#ffd23f';
          ctx.beginPath(); ctx.arc(f.x, f.y, 3, 0, Math.PI * 2); ctx.fill();
        });

        holes.forEach(function (h) {
          /* a mound of dug-up earth, then the dark hole in it */
          var mound = ctx.createRadialGradient(h.x, h.y - 6, 20, h.x, h.y, 96);
          mound.addColorStop(0, '#a47148'); mound.addColorStop(1, '#6f4524');
          ctx.fillStyle = mound;
          ctx.beginPath(); ctx.ellipse(h.x, h.y + 2, 92, 32, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#2b1a0c';
          ctx.beginPath(); ctx.ellipse(h.x, h.y + 2, 64, 18, 0, 0, Math.PI * 2); ctx.fill();
          if (h.mole) { drawMole(ctx, h); }
          /* front lip of the hole hides the mole's bottom */
          var lip = ctx.createLinearGradient(0, h.y, 0, h.y + 30);
          lip.addColorStop(0, '#9c6b43'); lip.addColorStop(1, '#6f4524');
          ctx.fillStyle = lip;
          ctx.beginPath(); ctx.ellipse(h.x, h.y + 10, 82, 20, 0, 0, Math.PI); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.12)';
          ctx.beginPath(); ctx.ellipse(h.x - 30, h.y + 14, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
        });

        U.badge(ctx, 16, 14, 'Bonked ' + got + ' of ' + NEED, { icon: '🔨' });
        if (streak >= 3) {
          U.badge(ctx, api.W - 16, 14, streak + ' in a row!', { align: 'right', icon: '🔥', top: 'rgba(255,146,43,.95)', bottom: 'rgba(232,89,12,.95)' });
        }

        drawHammer(ctx);
      }

      newRound();
      return { update: update, draw: draw, down: down, move: move,
        /* read-only peek at the state, used by automated play-through checks */
        debug: function () { return { target: target, holes: holes, state: state, round: round, choices: choices }; } };
    }
  };
})(window.PH = window.PH || {});
