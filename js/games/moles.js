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
      var shake = 0, pows = [];
      var flowers = [], i;
      for (i = 0; i < 16; i++) { flowers.push({ x: U.rand(20, 980), y: U.rand(150, 630), c: U.pick(PH.COLORS) }); }

      /* the list of things moles can hold at this level */
      var BANK = pics ? PH.PICTURES.map(function (p) { return p.w; })
        : letters ? api.words.map(function (w) { return w.w; })
        : PH.TRICKY[api.level.id].slice();

      /* letters that are easy to mix up, so lowercase practice is real practice */
      var LOOKALIKE = { b: 'dpq', d: 'bpq', p: 'bdq', q: 'bdp', m: 'nw', n: 'mhu', u: 'nv', w: 'mv', h: 'nb', f: 't', t: 'f', i: 'l', l: 'i' };

      /* How long a mole stays up. This is reading time, not reaction time: a child has to
         look at "said", decide whether it is the word they heard, and only then swing. A
         second of that is not enough, so the floor is set where a slow reader can still
         finish looking. It quickens with a streak, but gently. */
      function upTime() {
        var base = api.pre ? 3.6 : 3;
        return Math.max(api.pre ? 2.8 : 2, base - streak * 0.08);
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

      /* A mole is announced before it arrives: the earth over its hole humps up and
         shivers for a moment first. It is the telegraph that makes a pop-up feel like
         something happening rather than something appearing, and it gives a child a
         breath to look across before there is anything to read. */
      function spawn() {
        var empty = holes.filter(function (h) { return !h.mole && !h.pending; });
        if (!empty.length) { return; }
        var showing = holes.some(function (h) {
          return (h.mole && h.mole.label === target && h.mole.phase !== 'down') ||
            (h.pending && h.pending === target);
        });
        var wantTarget = !showing && Math.random() < 0.5;
        var h = U.pick(empty);
        h.pending = wantTarget ? target : U.pick(choices);
        h.warn = 0.45;
      }

      function emerge(h) {
        h.mole = {
          label: h.pending, up: 0, phase: 'rise', life: upTime(),
          hit: 0, raz: 0, t: 0, wob: 1, squash: 0, sway: U.rand(0, 6)
        };
        h.pending = null;
        /* earth thrown up by the digging */
        api.burst(h.x, h.y - 6, ['#a47148', '#6f4524', '#8b5a2b', '#c08a5a'], 14,
          { gravity: 420, minSpeed: 70, maxSpeed: 190 });
        api.sfx.hop();
      }

      /* a small scatter of earth as it drops back down its hole */
      function duck(h) {
        api.burst(h.x, h.y - 2, ['#8b5a2b', '#6f4524'], 7,
          { gravity: 460, minSpeed: 40, maxSpeed: 110 });
      }

      /* a pop with a bit of overshoot, so the mole springs up rather than slides up */
      function easeOutBack(k) {
        var c1 = 1.9, c3 = c1 + 1;
        return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
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
        /* every bonk lands: the mole squashes, the ground jolts, and a ring of impact
           snaps outward from where the hammer hit */
        m.squash = 1;
        shake = 0.22;
        pows.push({ x: h.x, y: h.y + 70 - m.up * 120 - 60, t: 0, good: m.label === target });
        if (m.label === target) {
          m.hit = 1; m.phase = 'stay';
          hits++; got++; streak++;
          api.addStar(1);
          api.sfx.good();
          api.burst(h.x, h.y - 80, ['#ffd23f', '#ffffff', '#ff9f40'], 16);
          if (got >= NEED) {
            state = 'between'; timer = 0;
            api.sfx.great();
            api.say('Bonk bonk! Awesome!');
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
        if (shake > 0) { shake -= dt; }
        for (var pi = pows.length - 1; pi >= 0; pi--) {
          pows[pi].t += dt * 2.6;
          if (pows[pi].t >= 1) { pows.splice(pi, 1); }
        }
        holes.forEach(function (h) {
          if (h.pending) {
            h.warn -= dt;
            if (h.warn <= 0) { emerge(h); }
            return;
          }
          var m = h.mole;
          if (!m) { return; }
          m.t += dt;
          m.wob = Math.max(0, m.wob - dt * 1.6);
          if (m.squash > 0) { m.squash -= dt * 3.4; }
          if (m.phase === 'rise') {
            m.up = easeOutBack(Math.min(1, m.t / 0.34));
            if (m.t >= 0.34) { m.up = 1; m.phase = 'up'; }
          } else if (m.phase === 'up') {
            m.life -= dt;
            if (m.life <= 0) { m.phase = 'down'; duck(h); }
          } else if (m.phase === 'stay') {
            m.hit = m.hit ? m.hit + dt : 0;
            m.raz = m.raz ? m.raz + dt : 0;
            if ((m.hit || m.raz) > 0.9) { m.phase = 'down'; duck(h); }
          } else if (m.phase === 'down') {
            m.up -= dt * 4;
            if (m.up <= 0) { h.mole = null; }
          }
        });
        if (state === 'play') {
          spawnT -= dt;
          if (spawnT <= 0) {
            spawn();
            spawnT = api.pre ? U.rand(1.3, 2) : U.rand(0.9, 1.5);
          }
        } else if (state === 'between') {
          timer += dt;
          holes.forEach(function (h) { if (h.mole && h.mole.phase !== 'stay') { h.mole.phase = 'down'; } });
          if (PH.speech.settled(timer, 1.6)) { newRound(); }
        }
      }

      /* ---------------- drawing ---------------- */
      function drawMole(ctx, h) {
        var art = PH.art;
        var m = h.mole;
        var rise = m.up * 120;
        var dizzy = m.hit > 0;
        var seed = Math.round(h.x / 10 + h.y / 7);
        var t = performance.now() / 1000;
        ctx.save();
        /* only the part above the hole is visible */
        ctx.beginPath(); ctx.rect(h.x - 120, h.y - 330, 240, 330); ctx.clip();
        ctx.translate(h.x, h.y + 70 - rise);
        /* a slow sway while it waits, and a squash when the hammer lands */
        if (m.phase === 'up') { ctx.rotate(Math.sin((t + m.sway) * 2.1) * 0.035); }
        if (m.squash > 0) {
          var sq = Math.max(0, m.squash);
          ctx.translate(0, 50);
          ctx.scale(1 + 0.28 * sq, 1 - 0.32 * sq);
          ctx.translate(0, -50);
        }
        /* sign on a stick, swinging on the way up and settling */
        var text = api.label(m.label);
        var fs = signFont(m);
        ctx.font = U.font(fs);
        var tw = Math.max(70, ctx.measureText(text).width + 30);
        ctx.save();
        ctx.translate(48, -38);
        ctx.rotate(Math.sin(m.t * 17) * 0.22 * m.wob);
        ctx.translate(-48, 38);
        U.roundRect(ctx, 44, -150, 8, 112, 4);
        art.fillLit(ctx, '#9a6a3c', -150, -38, { lineWidth: 2.5 });
        U.plate(ctx, 48 - tw / 2, -190, tw, fs + 22, { fill: '#fff4d6', r: 10, edge: '#b07a3a' });
        ctx.fillStyle = '#1f2340';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, 48, -190 + (fs + 22) / 2 + 1);
        ctx.restore();
        /* the hand holding the sign */
        art.ball(ctx, 48, -64, 11, '#8d5a3b', { lineWidth: 2.5, shine: false });

        /* round little ears */
        art.ball(ctx, -36, -76, 11, '#7d4d2e', { shine: false });
        art.ball(ctx, 36, -76, 11, '#7d4d2e', { shine: false });
        ctx.fillStyle = '#e8a0a8';
        ctx.beginPath(); ctx.arc(-36, -76, 5, 0, Math.PI * 2); ctx.arc(36, -76, 5, 0, Math.PI * 2); ctx.fill();
        /* body: a velvety pear */
        ctx.beginPath();
        ctx.moveTo(0, -96);
        ctx.bezierCurveTo(34, -96, 50, -60, 50, -20);
        ctx.bezierCurveTo(50, 30, 30, 50, 0, 50);
        ctx.bezierCurveTo(-30, 50, -50, 30, -50, -20);
        ctx.bezierCurveTo(-50, -60, -34, -96, 0, -96);
        ctx.closePath();
        art.fillLit(ctx, '#8f5c38', -96, 40, { light: 0.25, dark: -0.3 });
        /* a soft tummy */
        ctx.beginPath(); ctx.ellipse(0, 4, 30, 36, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#d7ae88'; ctx.fill();
        /* fur tuft on top */
        ctx.strokeStyle = art.INK; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-4, -95); ctx.quadraticCurveTo(-8, -108, 0, -110); ctx.moveTo(4, -95); ctx.quadraticCurveTo(8, -106, 14, -104); ctx.stroke();

        /* each mole wears something different */
        var outfit = seed % 3;
        if (outfit === 0) {                  /* a miner's hard hat with a lamp */
          ctx.beginPath(); ctx.moveTo(-34, -80); ctx.bezierCurveTo(-34, -116, 34, -116, 34, -80); ctx.closePath();
          art.fillLit(ctx, '#ffd23f', -112, -80, { lineWidth: 3 });
          ctx.beginPath(); ctx.ellipse(0, -80, 42, 7, 0, 0, Math.PI * 2);
          art.fillLit(ctx, '#f0b52a', -87, -73, { lineWidth: 3 });
          art.ball(ctx, 0, -100, 8, '#fff6c2', { lineWidth: 2.5 });
        } else if (outfit === 1) {           /* a big spotty bow */
          ctx.save(); ctx.translate(22, -88); ctx.rotate(0.3);
          [-1, 1].forEach(function (s) {
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * 20, -18, s * 22, 0); ctx.quadraticCurveTo(s * 20, 16, 0, 0); ctx.closePath();
            art.fillLit(ctx, '#ff5d8f', -16, 16, { lineWidth: 2.5 });
          });
          art.ball(ctx, 0, 0, 6, '#ff5d8f', { lineWidth: 2.5 });
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(-12, -3, 2.5, 0, Math.PI * 2); ctx.arc(13, 4, 2.5, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        } else {                             /* a little knitted beanie */
          ctx.beginPath(); ctx.moveTo(-32, -82); ctx.bezierCurveTo(-32, -118, 32, -118, 32, -82); ctx.closePath();
          art.fillLit(ctx, '#2ec4b6', -114, -82, { lineWidth: 3 });
          U.roundRect(ctx, -34, -88, 68, 12, 6);
          art.fillLit(ctx, '#1f9e92', -88, -76, { lineWidth: 2.5 });
          art.ball(ctx, 0, -114, 8, '#ffffff', { lineWidth: 2.5 });
        }

        /* face */
        if (dizzy) {
          ctx.strokeStyle = art.INK; ctx.lineWidth = 3.5;
          [-16, 16].forEach(function (ex) {
            ctx.beginPath();
            for (var a = 0; a < 12; a += 0.3) {
              var rr = a * 0.7;
              ctx.lineTo(ex + Math.cos(a + t * 10) * rr, -56 + Math.sin(a + t * 10) * rr);
            }
            ctx.stroke();
          });
          for (var s = 0; s < 3; s++) {
            var a2 = t * 5 + s * 2.1;
            U.star(ctx, Math.cos(a2) * 40, -120 + Math.sin(a2) * 10, 9, 4);
            ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.strokeStyle = art.INK; ctx.lineWidth = 2; ctx.stroke();
          }
        } else {
          var look = hammer ? [U.clamp((hammer.x - h.x) / 200, -1, 1), U.clamp((hammer.y - h.y) / 200, -1, 1)] : null;
          art.eyes(ctx, 0, -56, 30, 6.5, { dot: true, blink: art.blink(seed), look: look });
        }
        art.cheeks(ctx, 0, -38, 52, 7, 'rgba(255,120,140,.4)');
        /* the snout: a muzzle, whiskers and a big pink nose */
        ctx.beginPath(); ctx.ellipse(0, -34, 20, 14, 0, 0, Math.PI * 2);
        art.fillLit(ctx, '#e0bc98', -48, -20, { lineWidth: 2.5 });
        ctx.strokeStyle = 'rgba(43,35,70,.55)'; ctx.lineWidth = 1.8;
        [-1, 1].forEach(function (s) {
          ctx.beginPath();
          ctx.moveTo(s * 14, -34); ctx.lineTo(s * 36, -40);
          ctx.moveTo(s * 14, -30); ctx.lineTo(s * 37, -30);
          ctx.stroke();
        });
        art.ball(ctx, 0, -42, 8.5, '#ff7f9c', { lineWidth: 2.5 });
        if (m.raz > 0) {
          /* blowing a raspberry */
          ctx.beginPath(); ctx.ellipse(0, -16, 9, 12 + Math.sin(m.raz * 40) * 3, 0, 0, Math.PI * 2);
          art.fillLit(ctx, '#ff5d8f', -30, -4, { lineWidth: 2.5 });
        } else {
          ctx.strokeStyle = art.INK; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(-8, -26); ctx.quadraticCurveTo(0, -22, 8, -26); ctx.stroke();
          [-1, 1].forEach(function (s) {           /* two buck teeth */
            U.roundRect(ctx, s > 0 ? 0.5 : -7.5, -25, 7, 10, 2.5);
            ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
          });
        }
        /* paws with little claws on the rim */
        [-1, 1].forEach(function (s) {
          ctx.beginPath(); ctx.ellipse(s * 34, 22, 15, 10, 0, 0, Math.PI * 2);
          art.fillLit(ctx, '#7d4d2e', 12, 32, { lineWidth: 2.5 });
          ctx.fillStyle = '#f3e6d6';
          for (var c = -1; c <= 1; c++) {
            ctx.beginPath(); ctx.ellipse(s * 34 + c * 6, 30, 2.4, 3.5, 0, 0, Math.PI * 2); ctx.fill();
          }
        });
        ctx.restore();
      }

      function drawHammer(ctx) {
        var art = PH.art;
        var ang = hammer.swing > 0 ? -0.2 + (1 - hammer.swing / 0.18) * 1.1 : -0.5;
        ctx.save();
        ctx.translate(hammer.x + 30, hammer.y + 50);
        ctx.rotate(ang);
        U.roundRect(ctx, -6, -90, 12, 100, 6);
        art.fillLit(ctx, '#d9a86c', -90, 10, { lineWidth: 2.5 });
        ctx.strokeStyle = '#ff5d5d'; ctx.lineWidth = 3;
        for (var g = 0; g < 4; g++) { ctx.beginPath(); ctx.moveTo(-6, -10 + g * 6); ctx.lineTo(6, -14 + g * 6); ctx.stroke(); }
        U.roundRect(ctx, -42, -122, 84, 44, 16);
        art.fillLit(ctx, '#ff5d5d', -122, -78, { lineWidth: 3 });
        U.roundRect(ctx, -48, -120, 14, 40, 6);
        art.fillLit(ctx, '#ffd23f', -120, -80, { lineWidth: 2.5 });
        U.roundRect(ctx, 34, -120, 14, 40, 6);
        art.fillLit(ctx, '#ffd23f', -120, -80, { lineWidth: 2.5 });
        ctx.fillStyle = 'rgba(255,255,255,.45)';
        U.roundRect(ctx, -30, -116, 60, 9, 4); ctx.fill();
        ctx.restore();
      }

      function draw(ctx) {
        var now = performance.now() / 1000;
        /* the whole garden jolts on a bonk - but not the hammer, which is the child's
           own hand and would look wrong shaking with the thing it just hit */
        ctx.save();
        if (shake > 0) {
          ctx.translate(Math.sin(now * 72) * shake * 26, Math.cos(now * 91) * shake * 16);
        }
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
          /* a mound of dug-up earth, then the dark hole in it. While a mole is on its way
             the mound humps up and shivers, which is the only warning a child gets - and
             the only one they need. */
          var heave = h.pending ? Math.max(0, 1 - h.warn / 0.45) : 0;
          var shiver = heave ? Math.sin(now * 34) * 3 * heave : 0;
          var mound = ctx.createRadialGradient(h.x, h.y - 6, 20, h.x, h.y, 96);
          mound.addColorStop(0, '#a47148'); mound.addColorStop(1, '#6f4524');
          ctx.fillStyle = mound;
          ctx.beginPath();
          ctx.ellipse(h.x + shiver, h.y + 2 - heave * 7, 92 + heave * 5, 32 + heave * 7, 0, 0, Math.PI * 2);
          ctx.fill();
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

        /* the ring of impact, snapping outward from where the hammer landed */
        pows.forEach(function (p) {
          var k = p.t, r = 26 + k * 74;
          ctx.save();
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = p.good ? '#ffd23f' : '#ffffff';
          ctx.lineWidth = 9 * (1 - k) + 2;
          ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.stroke();
          /* spikes, so it reads as a bonk rather than a ripple */
          ctx.lineWidth = 6 * (1 - k) + 1.5;
          for (var a = 0; a < 8; a++) {
            var ang = a * Math.PI / 4 + k * 0.6;
            ctx.beginPath();
            ctx.moveTo(p.x + Math.cos(ang) * (r + 4), p.y + Math.sin(ang) * (r + 4));
            ctx.lineTo(p.x + Math.cos(ang) * (r + 18), p.y + Math.sin(ang) * (r + 18));
            ctx.stroke();
          }
          ctx.restore();
        });

        ctx.restore();          /* end of the shake */

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
