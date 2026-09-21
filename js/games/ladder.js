/* Frog Hop Word Ladder - change one sound to turn a word into the next one, and hop up to the fly */
(function (PH) {
  'use strict';
  var U = PH.util;
  var EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';

  PH.games.ladder = {
    id: 'ladder',
    name: 'Frog Hop',
    icon: '🐸',
    blurb: 'Change one sound to make a new word - cat, hat, hot, dot - and hop the frog up the lily pads to catch the flies.',

    create: function (api) {
      var ROUNDS = 4;
      var BASE = { x: 500, y: 520 }, ROW_Y = 250, XS = [230, 500, 770];
      var pics = api.mode === 'pictures', letters = api.mode === 'letters';
      var lv = api.level.id;
      var round = 0, chain = [], step = 0, pads = [], recent = [];
      var hits = 0, misses = 0, state = 'think', timer = 0, chosen = null;
      var frog = { x: BASE.x, y: BASE.y, fx: 0, fy: 0, tx: 0, ty: 0, t: 0, tongue: 0, swim: 0 };
      var baseShift = 0;       /* slides the landed pad down into the home spot */
      /* The reward at the top of the ladder. There are several, and each has to be
         aimed at and tapped: one fly caught by tapping anywhere was a button press
         dressed up as a reward, and a child who has just climbed four words has earned
         something to actually do. */
      var FLIES = 3;
      var flies = [], tongueTo = null, helpedFly = false;

      function makeFlies() {
        flies = [];
        for (var n = 0; n < FLIES; n++) {
          flies.push({
            cx: 500 + (n - (FLIES - 1) / 2) * 200,
            ax: U.rand(45, 80), ay: U.rand(22, 38),
            sx: U.rand(1.7, 2.6), sy: U.rand(2.6, 3.6),
            ph: U.rand(0, 6.3), t: 0, x: 500, y: 90, caught: false
          });
        }
      }

      /* While the frog is still climbing they hover out of reach at the top, as the thing
         being climbed towards; once it arrives they come down into tapping range. */
      function moveFlies(dt, low) {
        flies.forEach(function (f) {
          f.t += dt;
          f.x = f.cx + Math.sin(f.t * f.sx + f.ph) * f.ax;
          f.y = (low ? 220 : 90) + Math.cos(f.t * f.sy + f.ph) * (low ? f.ay : 12);
        });
      }

      function fliesLeft() {
        return flies.filter(function (f) { return !f.caught; });
      }
      var ripples = [], reeds = [], i;
      for (i = 0; i < 9; i++) { reeds.push({ x: i < 5 ? U.rand(0, 120) : U.rand(880, 1000), h: U.rand(90, 180), s: U.rand(0, 6) }); }

      /* ---------------- building chains ---------------- */
      function graphemeWords(pool) {
        return pool.filter(function (w) { return w.g.length >= 2 && w.g.length <= 5; });
      }

      /* where a sound may change, by age */
      function allowed(a, idx) {
        if (lv === 1 || lv === 2) { return idx === 0 || idx === a.g.length - 1; }
        if (lv === 3) { return PH.graphemeClass(a.g[idx]) === 'v'; }
        return true;
      }

      function neighbours(a, pool) {
        return pool.filter(function (b) {
          if (b.w === a.w || b.g.length !== a.g.length) { return false; }
          var diff = -1, n = 0;
          for (var j = 0; j < a.g.length; j++) { if (a.g[j] !== b.g[j]) { n++; diff = j; } }
          return n === 1 && allowed(a, diff) && PH.graphemeClass(a.g[diff]) === PH.graphemeClass(b.g[diff]);
        });
      }

      function changedAt(a, b) {
        for (var j = 0; j < a.g.length; j++) { if (a.g[j] !== b.g[j]) { return j; } }
        return 0;
      }

      /* age 4: picture words whose ending matches, so only the first sound changes */
      function onsetFamilies() {
        var fam = {};
        PH.PICTURES.forEach(function (p) {
          var on = PH.firstSound(p);
          if (on.length > 2 || p.g.length > 1) { return; }
          var rest = p.w.slice(on.length);
          if (!/^[aeiou]/.test(rest)) { return; }          /* skip blends like tr-uck */
          (fam[rest] = fam[rest] || []).push({ w: p.w, g: [on, rest], rime: rest });
        });
        return Object.keys(fam).map(function (k) { return fam[k]; }).filter(function (f) { return f.length >= 2; });
      }

      function buildChain() {
        if (pics) {
          return U.shuffle(PH.PICTURES).slice(0, 5);
        }
        if (letters) {
          var fams = U.shuffle(onsetFamilies());
          var f = fams.filter(function (x) { return recent.indexOf(x[0].rime) < 0; })[0] || fams[0];
          recent.push(f[0].rime);
          return U.shuffle(f).slice(0, 3);
        }
        var pool = graphemeWords(lv >= 2 ? PH.wordsUpTo(2) : PH.levelById(1).words);
        var starts = pool;
        if (lv >= 4) {
          starts = pool.filter(function (w) { return w.g.some(function (g) { return /^(sh|ch|th|ck)$/.test(g); }); });
        }
        var want = lv >= 3 ? 5 : 4, best = [];
        for (var tries = 0; tries < 300; tries++) {
          var c = [U.pick(starts)];
          while (c.length < want) {
            var nb = neighbours(c[c.length - 1], pool).filter(function (w) { return c.indexOf(w) < 0; });
            if (!nb.length) { break; }
            c.push(U.pick(nb));
          }
          if (c.length > best.length && (recent.indexOf(c[0].w) < 0 || best.length < 2)) { best = c; }
          if (best.length >= want) { break; }
        }
        recent.push(best[0].w);
        return best;
      }

      /* ---------------- a hop ---------------- */
      function setupHop() {
        var from = chain[step], to = chain[step + 1];
        if (!to) { return; }
        var opts;
        if (pics) {
          var others = U.shuffle(PH.PICTURES.filter(function (p) { return p.w !== to.w && chain.indexOf(p) < 0; })).slice(0, 2);
          opts = [{ label: to.w, right: true, makes: to.w }].concat(others.map(function (p) {
            return { label: p.w, right: false, makes: p.w };
          }));
        } else {
          var idx = changedAt(from, to);
          var bank = {};
          var source = letters ? PH.levelById(0).words : graphemeWords(PH.wordsUpTo(Math.max(1, Math.min(lv, 2))));
          source.forEach(function (w) { w.g.forEach(function (g) { bank[g] = 1; }); });
          var cls = PH.graphemeClass(to.g[idx]);
          var wrong = U.shuffle(Object.keys(bank).filter(function (g) {
            return g !== to.g[idx] && g !== from.g[idx] && PH.graphemeClass(g) === cls &&
              PH.soundHint(g) !== PH.soundHint(to.g[idx]) &&  /* c and k sound the same: never offer both */
              PH.isClean(from.g.slice(0, idx).concat([g], from.g.slice(idx + 1)).join(''));   /* nor a rude swap */
          })).slice(0, 2);
          opts = [{ label: to.g[idx], right: true, makes: to.w }].concat(wrong.map(function (g) {
            var m = from.g.slice(); m[idx] = g;
            return { label: g, right: false, makes: m.join('') };
          }));
        }
        pads = U.shuffle(opts).map(function (o, n) {
          return { label: o.label, right: o.right, makes: o.makes, x: XS[n], y: ROW_Y, sink: 0, fade: 0 };
        });
        state = 'think';
        announce();
      }

      function announce() {
        var from = chain[step], to = chain[step + 1];
        if (!to) { return; }
        if (pics) {
          api.setPrompt('Hop to the', { word: to.w, show: true, repeat: announce });
          api.say('Hop to the');
          api.sayWord(to.w, { queue: true });
          return;
        }
        api.setPrompt('Change ' + from.w + ' into', { word: to.w, show: true, repeat: announce });
        api.say('Change');
        api.sayWord(from.w, { queue: true });
        api.say('into', { queue: true });
        api.sayWord(to.w, { queue: true });
      }

      function newRound() {
        round++;
        if (round > ROUNDS) {
          api.finish(null, hits + misses ? hits / (hits + misses) : 1);
          state = 'over';
          return;
        }
        chain = buildChain();
        step = 0;
        makeFlies(); tongueTo = null; helpedFly = false;
        frog.x = BASE.x; frog.y = BASE.y; frog.tongue = 0;
        api.setProgress(round, ROUNDS);
        setupHop();
      }

      /* ---------------- input ---------------- */
      function down(p) {
        if (state === 'fly') {
          /* aim for one. A tap that lands on nothing costs nothing - missing a fly is
             part of catching flies, and there is no wrong answer to punish here. */
          var near = fliesLeft().filter(function (f) { return U.dist(p.x, p.y, f.x, f.y) < 52; });
          if (near.length) { catchFly(near[0]); }
          return;
        }
        if (state !== 'think') { return; }
        for (var n = 0; n < pads.length; n++) {
          var pd = pads[n];
          if (U.dist(p.x, p.y, pd.x, pd.y) < 100) {
            chosen = pd;
            frog.fx = frog.x; frog.fy = frog.y; frog.tx = pd.x; frog.ty = pd.y - 10; frog.t = 0;
            state = 'hop';
            api.sfx.ribbit();
            return;
          }
        }
      }

      function catchFly(f) {
        if (!f) { return; }
        tongueTo = f;
        state = 'tongue'; timer = 0;
        api.sfx.chomp();
      }

      /* the one the frog would reach for on its own, if nobody taps */
      function closestFly() {
        var left = fliesLeft(), best = null, bd = 1e9;
        left.forEach(function (f) {
          var d = U.dist(frog.x, frog.y, f.x, f.y);
          if (d < bd) { bd = d; best = f; }
        });
        return best;
      }

      /* ---------------- update ---------------- */
      function update(dt) {
        /* the flies drift in update, not in draw, so that a tap is tested against where
           they actually are rather than where they were last painted */
        moveFlies(dt, state === 'fly' || state === 'tongue');
        reeds.forEach(function (r) { r.s += dt; });
        for (var n = ripples.length - 1; n >= 0; n--) {
          ripples[n].t += dt;
          if (ripples[n].t > 1) { ripples.splice(n, 1); }
        }

        if (state === 'hop') {
          frog.t += dt / 0.5;
          var k = U.clamp(frog.t, 0, 1);
          frog.x = U.lerp(frog.fx, frog.tx, k);
          frog.y = U.lerp(frog.fy, frog.ty, k) - Math.sin(k * Math.PI) * 90;
          if (k >= 1) {
            ripples.push({ x: frog.x, y: frog.y + 20, t: 0 });
            if (chosen.right) {
              hits++;
              api.addStar(1);
              api.sfx.good();
              api.sayWord(chosen.makes);
              pads.forEach(function (pd) { if (pd !== chosen) { pd.fade = 0.01; } });
              state = 'slide'; timer = 0;
            } else {
              misses++;
              chosen.sink = 0.01;
              api.sfx.splash();
              var real = PH.wordsUpTo(5).concat(PH.PICTURES).some(function (w) { return w.w === chosen.makes; });
              if (!pics && real && PH.isClean(chosen.makes)) {
                api.say('Splash! That makes');
                api.sayWord(chosen.makes, { queue: true });
              } else {
                api.say('Splash! Not that one.');
              }
              state = 'swim'; timer = 0;
              frog.fx = frog.x; frog.fy = frog.y + 20; frog.tx = BASE.x; frog.ty = BASE.y;
            }
          }
        } else if (state === 'slide') {
          timer += dt;
          var s = U.clamp(timer / 0.6, 0, 1);
          var e = 1 - Math.pow(1 - s, 3);
          baseShift = e;
          frog.x = U.lerp(chosen.x, BASE.x, e);
          frog.y = U.lerp(chosen.y - 10, BASE.y, e);
          pads.forEach(function (pd) { if (pd.fade > 0) { pd.fade = Math.min(1, pd.fade + dt * 3); } });
          /* the slide takes 0.6s and the word the frog just made takes longer to say, so
             the frog waits on the pad until it has been said: setting up the next hop
             announces it, and announcing cancels whatever is still in the air */
          if (s >= 1 && PH.speech.settled(timer, 0.6)) {
            baseShift = 0;
            step++;
            if (step >= chain.length - 1) {
              pads = [];
              state = 'fly'; timer = 0;
              api.setPrompt('Catch the flies! Tap them', {});
              api.say('You made it! Catch the flies!');
            } else {
              setupHop();
            }
          }
        } else if (state === 'swim') {
          timer += dt;
          var w = U.clamp(timer / 1.1, 0, 1);
          frog.x = U.lerp(frog.fx, frog.tx, w);
          frog.y = U.lerp(frog.fy, frog.ty, w) + Math.sin(w * Math.PI) * 30;
          if (chosen) { chosen.sink = Math.min(1, chosen.sink + dt * 1.5); }
          /* likewise after a splash: "that makes bat" is the whole lesson of a wrong hop,
             and re-announcing the target over the top of it teaches nothing */
          if (w >= 1 && PH.speech.settled(timer, 1.1)) {
            if (chosen) { chosen.sink = 0; }
            chosen = null;
            state = 'think';
            announce();
          }
        } else if (state === 'fly') {
          timer += dt;
          /* help the littlest ones out: a good while to let them aim and try, and then
             briskly, because a child who is not tapping is watching and waiting */
          if (timer > (helpedFly ? 2.5 : 6)) { helpedFly = true; catchFly(closestFly()); }
        } else if (state === 'tongue') {
          timer += dt;
          frog.tongue = timer < 0.25 ? timer / 0.25 : Math.max(0, 1 - (timer - 0.25) / 0.25);
          if (timer > 0.25 && tongueTo && !tongueTo.caught) {
            tongueTo.caught = true;
            api.sfx.great();
            api.burst(tongueTo.x, tongueTo.y, null, 26, { lift: 120 });
            /* said once, at the end: three "gulp, yum"s in a row is not three rewards */
            if (!fliesLeft().length) { api.say('Gulp! Yum!'); }
          }
          if (timer > 0.55) {
            if (fliesLeft().length) {
              state = 'fly'; timer = 0; tongueTo = null; frog.tongue = 0;
            } else if (PH.speech.settled(timer, 1.6)) {
              newRound();
            }
          }
        }
      }

      /* ---------------- drawing ---------------- */
      function pad(ctx, x, y, r, sink, fade) {
        ctx.save();
        ctx.globalAlpha = 1 - (fade || 0);
        ctx.translate(x, y + (sink || 0) * 30);
        /* a dark reflection in the water, then the leaf with its notch, veins and a bright rim */
        ctx.fillStyle = 'rgba(10,50,90,.3)';
        ctx.beginPath(); ctx.ellipse(6, 10, r, r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#237a3a';
        ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.55, 0, 0.25, Math.PI * 2 - 0.25); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
        var leaf = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 4, 0, -6, r);
        leaf.addColorStop(0, '#8ce99a'); leaf.addColorStop(1, '#40c057');
        ctx.fillStyle = leaf;
        ctx.beginPath(); ctx.ellipse(0, -6, r - 8, r * 0.55 - 8, 0, 0.3, Math.PI * 2 - 0.3); ctx.lineTo(0, -6); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(35,122,58,.45)'; ctx.lineWidth = 2;
        for (var v = 0; v < 7; v++) {
          var a = 0.6 + v * 0.8;
          ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(Math.cos(a) * (r - 14), -6 + Math.sin(a) * (r * 0.55 - 12)); ctx.stroke();
        }
        ctx.restore();
      }

      function drawFrog(ctx) {
        var art = PH.art;
        var x = frog.x, y = frog.y;
        var t = performance.now() / 1000;
        var GREEN = '#2fd39b';
        var puff = Math.sin(t * 2.2) * 1.5;
        ctx.save();
        ctx.translate(x, y);
        /* back legs folded at the sides, with webbed toes */
        [-1, 1].forEach(function (s) {
          ctx.beginPath(); ctx.ellipse(s * 28, 8, 17, 11, s * 0.4, 0, Math.PI * 2);
          art.fillLit(ctx, U.shade(GREEN, -0.1), -3, 19, { lineWidth: 2.5 });
          for (var k = -1; k <= 1; k++) { art.ball(ctx, s * (38 + k * 1) + k * 6, 20, 4, GREEN, { lineWidth: 2, shine: false }); }
        });
        /* body and pale belly */
        ctx.beginPath(); ctx.ellipse(0, -8, 38 + puff, 30 + puff, 0, 0, Math.PI * 2);
        art.fillLit(ctx, GREEN, -38, 22, { light: 0.3, dark: -0.25 });
        ctx.beginPath(); ctx.ellipse(0, 4, 22, 14, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#d9f7c4'; ctx.fill();
        ctx.fillStyle = 'rgba(10,110,80,.3)';
        [[-26, -18, 4], [28, -14, 3.5], [-20, -2, 2.5]].forEach(function (s) { ctx.beginPath(); ctx.arc(s[0], s[1], s[2], 0, Math.PI * 2); ctx.fill(); });
        /* front hands */
        [-1, 1].forEach(function (s) { art.ball(ctx, s * 14, 16, 6, GREEN, { lineWidth: 2.5, shine: false }); });
        /* eye bumps with big glossy eyes */
        [-18, 18].forEach(function (ex) {
          ctx.beginPath(); ctx.arc(ex, -34, 14, 0, Math.PI * 2);
          art.fillLit(ctx, GREEN, -48, -20);
          art.eye(ctx, ex, -35, 9.5, { iris: '#ffb627', look: [0, -0.6], blink: art.blink(13), lid: GREEN });
        });
        /* a tiny gold crown, a little tilted */
        ctx.save(); ctx.translate(2, -43); ctx.rotate(0.15);
        ctx.beginPath();
        ctx.moveTo(-12, 0); ctx.lineTo(-14, -14); ctx.lineTo(-6, -7); ctx.lineTo(0, -17); ctx.lineTo(6, -7); ctx.lineTo(14, -14); ctx.lineTo(12, 0);
        ctx.closePath();
        art.fillLit(ctx, '#ffd23f', -17, 0, { lineWidth: 2.5 });
        ctx.fillStyle = '#ff5d8f'; ctx.beginPath(); ctx.arc(0, -5, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        art.cheeks(ctx, 0, -4, 50, 6, 'rgba(255,95,150,.75)');
        art.mouth(ctx, 0, -8, 30, 'smile', { lineWidth: 3 });
        ctx.restore();
        if (frog.tongue > 0) {
          var aim = tongueTo || flies[0] || { x: x, y: y };
          var ex2 = U.lerp(x, aim.x, frog.tongue), ey2 = U.lerp(y + 2, aim.y, frog.tongue);
          ctx.lineCap = 'round';
          ctx.strokeStyle = art.INK; ctx.lineWidth = 10;
          ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(ex2, ey2); ctx.stroke();
          ctx.strokeStyle = '#ff6f91'; ctx.lineWidth = 6;
          ctx.beginPath(); ctx.moveTo(x, y + 2); ctx.lineTo(ex2, ey2); ctx.stroke();
          art.ball(ctx, ex2, ey2, 6, '#ff6f91', { lineWidth: 2.5 });
        }
      }

      function drawWord(ctx, x, y) {
        var from = chain[step];
        if (!from) { return; }
        var to = chain[step + 1];
        /* the word the frog is on, with the sound that will change highlighted for younger readers */
        var idx = to && !pics ? changedAt(from, to) : -1;
        var showSlot = lv <= 2 && lv >= 0 && state !== 'fly';
        var picture = PH.picOf(from.w);
        var parts = pics ? [from.w] : from.g;
        ctx.font = U.font(pics ? 30 : 40);
        var widths = parts.map(function (g) { return ctx.measureText(g).width + 6; });
        var total = widths.reduce(function (a, b) { return a + b; }, 0);
        var w = total + 40 + (picture ? 56 : 0);
        U.plate(ctx, x - w / 2, y - 31, w, 60, { r: 18 });
        var cx = x - w / 2 + 20;
        if (picture) {
          ctx.font = '40px ' + EMOJI;
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText(picture, cx, y + 2);
          cx += 56;
        }
        ctx.font = U.font(pics ? 30 : 40);
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        parts.forEach(function (g, n) {
          if (showSlot && n === idx) {
            ctx.fillStyle = '#ffe066';
            U.roundRect(ctx, cx - 2, y - 24, widths[n], 48, 8); ctx.fill();
          }
          ctx.fillStyle = '#1f2340';
          ctx.fillText(g, cx, y + 2);
          cx += widths[n];
        });
      }

      function draw(ctx) {
        var water = ctx.createLinearGradient(0, 0, 0, api.H);
        water.addColorStop(0, '#74c0fc');
        water.addColorStop(1, '#1c7ed6');
        ctx.fillStyle = water;
        ctx.fillRect(0, 0, api.W, api.H);
        var now = performance.now() / 1000;
        ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 3;
        for (var ry = 60; ry < api.H; ry += 70) {
          ctx.beginPath();
          for (var rx = 0; rx <= api.W; rx += 20) { ctx.lineTo(rx, ry + Math.sin(rx / 50 + now + ry) * 5); }
          ctx.stroke();
        }
        reeds.forEach(function (r) {
          ctx.strokeStyle = '#2b8a3e'; ctx.lineWidth = 8; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(r.x, api.H); ctx.quadraticCurveTo(r.x + Math.sin(r.s) * 16, api.H - r.h / 2, r.x + Math.sin(r.s) * 24, api.H - r.h); ctx.stroke();
          ctx.fillStyle = '#7a4a2b';
          ctx.beginPath(); ctx.ellipse(r.x + Math.sin(r.s) * 24, api.H - r.h, 7, 20, 0, 0, Math.PI * 2); ctx.fill();
        });
        ripples.forEach(function (rp) {
          ctx.strokeStyle = 'rgba(255,255,255,' + (1 - rp.t) + ')'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(rp.x, rp.y, 30 + rp.t * 60, 10 + rp.t * 20, 0, 0, Math.PI * 2); ctx.stroke();
        });

        /* the home pad (sliding down after a good hop) */
        if (state !== 'slide') { pad(ctx, BASE.x, BASE.y + 20, 110, 0, 0); }
        pads.forEach(function (pd) {
          if (state === 'slide' && pd === chosen) {
            pad(ctx, U.lerp(pd.x, BASE.x, baseShift), U.lerp(pd.y, BASE.y, baseShift) + 20, 100 + baseShift * 10, 0, 0);
            return;
          }
          pad(ctx, pd.x, pd.y + 10, 90, pd.sink, pd.fade);
          if (pd.fade >= 1 || (state === 'slide' && pd !== chosen)) { return; }
          ctx.save();
          ctx.globalAlpha = 1 - pd.fade;
          ctx.fillStyle = '#ffffff';
          ctx.font = U.font(pics ? 30 : 52);
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          if (!pics) {
            ctx.strokeStyle = '#1b5e2e'; ctx.lineWidth = 8; ctx.lineJoin = 'round';
            ctx.strokeText(pd.label, pd.x, pd.y + 6 + pd.sink * 30);
          }
          ctx.fillText(pics ? api.label(pd.label) : pd.label, pd.x, pd.y + 6 + pd.sink * 30);
          ctx.restore();
        });

        /* the flies waiting at the top of the ladder */
        if (state === 'fly' || state === 'tongue' || (state !== 'over' && chain.length && step === chain.length - 2)) {
          fliesLeft().forEach(function (f) {
            ctx.fillStyle = 'rgba(255,255,255,.7)';
            ctx.beginPath(); ctx.ellipse(f.x - 10, f.y - 10, 12, 7, -0.5 + Math.sin(f.t * 40) * 0.4, 0, Math.PI * 2);
            ctx.ellipse(f.x + 10, f.y - 10, 12, 7, 0.5 - Math.sin(f.t * 40) * 0.4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#343a40';
            ctx.beginPath(); ctx.ellipse(f.x, f.y, 12, 9, 0, 0, Math.PI * 2); ctx.fill();
          });
        }

        drawFrog(ctx);
        if (state === 'think' || state === 'hop' || state === 'swim') { drawWord(ctx, BASE.x, BASE.y + 88); }

        var left = Math.max(0, chain.length - 1 - step);
        var nf = fliesLeft().length;
        U.badge(ctx, 16, 14,
          (state === 'fly' || state === 'tongue') ? 'Tap the flies! ' + nf + ' left' : 'Hops to the flies: ' + left,
          { icon: '🐸' });
      }

      newRound();
      return { update: update, draw: draw, down: down,
        /* read-only peek at the state, used by automated play-through checks */
        debug: function () { return { chain: chain, step: step, pads: pads, state: state, round: round, flies: flies }; } };
    }
  };
})(window.PH = window.PH || {});
