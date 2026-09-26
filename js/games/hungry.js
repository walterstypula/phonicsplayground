/* Hungry Octopus - steer one of the octopus's tentacles with a finger, grab the sea
   creature carrying the word it asks for, and bring it to its mouth.

   The tentacle goes where the finger goes, but it is a tentacle, not a pointer: it has a
   reach, it bends from its root, and it lags a little behind, so aiming it is part of the
   fun. Anything the tip touches sticks to its suckers; carrying it to the mouth eats it.
   The wrong snack is spat back out and swims off, none the worse. */
(function (PH) {
  'use strict';
  var U = PH.util;

  var FOOD = ['🦀', '🦐', '🐟', '🦞', '🦪', '🐠'];
  var SEGS = 20, SEG_LEN = 40;                 /* reach: 800, enough for every corner of the sea */
  var BASE = { x: 238, y: 404 };               /* where the steered arm leaves the body */
  var MOUTH = { x: 200, y: 402 };               /* the spot food has to reach to be eaten */
  var SWIM = { x0: 380, x1: 900, y0: 130, y1: 500 };
  var EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';

  PH.games.hungry = {
    id: 'hungry',
    name: 'Hungry Octopus',
    icon: '🐙',
    blurb: 'Steer the octopus\'s tentacle with your finger. Grab the sea creature with the word it wants and feed it!',

    create: function (api) {
      var ROUNDS = api.pre ? 5 : 6;
      var round = 0, target = null, food = [], recent = [];
      var hits = 0, misses = 0, state = 'play', timer = 0;
      var finger = null, held = null, chew = 0, yuck = 0, blink = 0;
      var full = 0, gulp = 0;          /* how well fed it looks (0 to 1), and the bulge of a swallow */
      var bubbles = [], weeds = [], i;
      for (i = 0; i < 18; i++) { bubbles.push({ x: U.rand(0, api.W), y: U.rand(0, api.H), r: U.rand(3, 9), v: U.rand(20, 50) }); }
      for (i = 0; i < 9; i++) { weeds.push({ x: 330 + i * 80 + U.rand(-20, 20), h: U.rand(60, 130), p: U.rand(0, 6) }); }

      /* the tentacle: a chain of points from the root to the tip */
      var pts = [];
      for (i = 0; i <= SEGS; i++) { pts.push({ x: BASE.x, y: BASE.y }); }
      /* start already in the resting curl, not untangling itself from a straight line */
      var tip = { x: BASE.x + 190, y: BASE.y - 170 };
      bend(tip);

      /* Bend the chain so its tip reaches the goal and its root stays on the body. This
         is FABRIK: pull the chain tip-first to the goal, then root-first back to the body,
         a few times over. Starting from last frame's shape keeps the bend natural. */
      /* A real octopus arm stretches and shortens. A chain of fixed length reaching for
         something close by has to fold in half to get there, and looks broken; so the
         arm is only ever a little longer than the distance to its goal, which leaves a
         gentle bow in it instead. */
      var segLen = SEG_LEN;
      function reach(goal) {
        var dx = goal.x - BASE.x, dy = goal.y - BASE.y, d = Math.sqrt(dx * dx + dy * dy);
        var max = SEGS * SEG_LEN * 0.98;
        if (d > max) { goal = { x: BASE.x + dx / d * max, y: BASE.y + dy / d * max }; d = max; }
        segLen = U.clamp(d * 1.18 / SEGS, 7, SEG_LEN);
        /* a nearly straight arm pulled shorter could snap to a fold; start from a curve */
        if (U.dist(pts[SEGS].x, pts[SEGS].y, BASE.x, BASE.y) < 1) { bend(goal); }
        for (var pass = 0; pass < 4; pass++) {
          pts[SEGS].x = goal.x; pts[SEGS].y = goal.y;
          for (var k = SEGS - 1; k >= 0; k--) { pull(pts[k], pts[k + 1]); }
          pts[0].x = BASE.x; pts[0].y = BASE.y;
          for (k = 1; k <= SEGS; k++) { pull(pts[k], pts[k - 1]); }
        }
      }
      function pull(p, toward) {
        var dx = p.x - toward.x, dy = p.y - toward.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
        p.x = toward.x + dx / d * segLen;
        p.y = toward.y + dy / d * segLen;
      }
      /* lay the arm out as an arc from the root to the goal */
      function bend(goal) {
        for (var k = 0; k <= SEGS; k++) {
          var t = k / SEGS;
          pts[k].x = U.lerp(BASE.x, goal.x, t);
          pts[k].y = U.lerp(BASE.y, goal.y, t) - Math.sin(Math.PI * t) * 60;
        }
      }

      function place(n) {
        /* spread the creatures out, one per band, so none start on top of another */
        var band = (SWIM.y1 - SWIM.y0) / n;
        return U.shuffle(Array.apply(null, Array(n)).map(function (_, k) { return k; })).map(function (k) {
          return { x: U.rand(SWIM.x0 + 40, SWIM.x1 - 40), y: SWIM.y0 + band * (k + 0.5) };
        });
      }

      function newRound() {
        round++;
        if (round > ROUNDS) {
          state = 'over';
          api.finish(null, hits + misses ? hits / (hits + misses) : 1);
          return;
        }
        var pool = api.words.filter(function (w) { return recent.indexOf(w.w) < 0; });
        target = U.pick(pool.length > 6 ? pool : api.words);
        recent.push(target.w);
        if (recent.length > 5) { recent.shift(); }
        var n = api.pre ? 3 : (round <= 2 ? 3 : 4);
        var list = U.shuffle([target].concat(PH.lookAlikes(target, api.words, n - 1)));
        var spots = place(list.length);
        var kinds = U.shuffle(FOOD);
        food = list.map(function (w, k) {
          return { word: w, right: w.w === target.w, kind: kinds[k % kinds.length],
            x: spots[k].x, y: spots[k].y, vx: U.pick([-1, 1]) * U.rand(30, 60), vy: 0,
            phase: U.rand(0, 6), state: 'swim', t: 0 };
        });
        held = null; state = 'play';
        api.setProgress(round, ROUNDS);
        api.setPrompt('Feed me the', { word: target.w, repeat: sayPrompt });
        sayPrompt(round === 1);
      }

      /* the whole instruction once; after that the word is enough */
      function sayPrompt(full) {
        if (full !== false) { api.say('Feed me the'); api.sayWord(target.w, { queue: true }); return; }
        api.sayWord(target.w);
      }

      /* ---------------- input: the finger steers the tentacle ---------------- */
      function down(p) { if (state === 'play') { finger = { x: p.x, y: p.y }; } }
      function move(p) { if (finger) { finger.x = p.x; finger.y = p.y; } }
      function up() {
        finger = null;
        if (held) { held.state = 'swim'; held.vy = 0; held = null; }   /* let go: it swims off */
      }

      function eat(f) {
        f.state = 'eaten'; held = null;
        chew = 1;
        api.sfx.chomp();
        if (f.right) {
          hits++;
          gulp = 1;
          api.addStar(1);
          api.sfx.great();
          api.burst(MOUTH.x, MOUTH.y - 20, ['#ffd23f', '#8ef0ff', '#ff8fab'], 24, { shape: 'star' });
          state = 'full'; timer = 0; finger = null;
        } else {
          /* not that one: a face, a spit, and it swims away unharmed */
          misses++;
          yuck = 1;
          setTimeout(function () {
            f.state = 'spit'; f.t = 0;
            f.x = MOUTH.x + 40; f.y = MOUTH.y - 30;
            f.vx = U.rand(380, 460); f.vy = U.rand(-260, -160);
            api.sfx.boing();
            api.sayWord(target.w);
          }, 450);
        }
      }

      function update(dt) {
        blink += dt;
        chew = Math.max(0, chew - dt * 1.6);
        gulp = Math.max(0, gulp - dt * 1.4);
        full = U.lerp(full, hits / ROUNDS, Math.min(1, dt * 2.5));
        yuck = Math.max(0, yuck - dt * 1.1);
        bubbles.forEach(function (b) { b.y -= b.v * dt; if (b.y < -10) { b.y = api.H + 10; b.x = U.rand(0, api.W); } });

        /* The tip chases the finger rather than jumping to it, and drifts back to a
           lazy curl when nobody is steering. */
        var goal = finger ? finger : {
          x: BASE.x + 190 + Math.sin(blink * 0.9) * 30,
          y: BASE.y - 170 + Math.cos(blink * 1.3) * 25
        };
        var follow = finger ? 14 : 3;
        tip.x = U.lerp(tip.x, goal.x, Math.min(1, dt * follow));
        tip.y = U.lerp(tip.y, goal.y, Math.min(1, dt * follow));
        reach(tip);
        var end = pts[SEGS];

        food.forEach(function (f) {
          f.phase += dt;
          if (f.state === 'swim') {
            f.x += f.vx * dt;
            f.y += Math.sin(f.phase * 1.7) * 12 * dt + f.vy * dt;
            f.vy *= 0.95;
            if (f.x < SWIM.x0) { f.x = SWIM.x0; f.vx = Math.abs(f.vx); }
            if (f.x > SWIM.x1) { f.x = SWIM.x1; f.vx = -Math.abs(f.vx); }
            f.y = U.clamp(f.y, SWIM.y0, SWIM.y1);
            /* The suckers catch what the tip touches - but only what the finger is aiming
               at, so a tentacle swept across the sea on its way somewhere does not scoop
               up whatever it brushes past. */
            if (finger && !held && state === 'play' && U.dist(end.x, end.y, f.x, f.y) < 58 &&
                U.dist(finger.x, finger.y, f.x, f.y) < 80) {
              held = f; f.state = 'held';
              api.sfx.pop();
            }
          } else if (f.state === 'held') {
            f.x = end.x; f.y = end.y;
            if (U.dist(f.x, f.y, MOUTH.x, MOUTH.y) < 85) { eat(f); }
          } else if (f.state === 'spit') {
            f.t += dt;
            f.x += f.vx * dt; f.y += f.vy * dt;
            f.vy += 420 * dt; f.vx *= 0.985;
            if (f.t > 0.9 || f.x > SWIM.x1) {
              f.state = 'swim'; f.vx = U.rand(30, 60) * U.pick([-1, 1]);
              f.x = U.clamp(f.x, SWIM.x0, SWIM.x1);
            }
          }
        });

        if (state === 'full') {
          timer += dt;
          if (PH.speech.settled(timer, 1.4)) { newRound(); }
        }
      }

      /* ---------------- drawing ---------------- */
      /* the warm red-orange of a cartoon octopus, with peachy suckers and no hard black
         line: its edges are a deep red, so it looks soft rather than drawn round */
      var SKIN = '#f05a3a', SKIN_LIGHT = '#ffa27c', SKIN_DEEP = '#b9321d';
      var BELLY = '#ffc4a3', SUCKER = '#ffe6d2', SUCKER_RIM = '#d9674a';
      var INK = '#7e2414';
      var snow = [];
      for (i = 0; i < 40; i++) { snow.push({ x: U.rand(0, api.W), y: U.rand(0, 580), r: U.rand(0.8, 2.2), v: U.rand(4, 12), p: U.rand(0, 6) }); }

      /* Catmull-Rom through the points, so a chain of 20 joints draws as one smooth curve */
      function smooth(list, steps) {
        var out = [], n = list.length;
        for (var k = 0; k < n - 1; k++) {
          var p0 = list[Math.max(0, k - 1)], p1 = list[k], p2 = list[k + 1], p3 = list[Math.min(n - 1, k + 2)];
          for (var s = 0; s < steps; s++) {
            var t = s / steps, t2 = t * t, t3 = t2 * t;
            out.push({
              x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
              y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
            });
          }
        }
        out.push(list[n - 1]);
        return out;
      }

      /* A limb drawn as one filled, tapering shape with a rounded tip: skin, a paler
         underside, a sheen along the top, and suckers in a row down the underside.
         `side` picks which edge is the underside (1 or -1). Kelp uses it too, without
         the suckers. */
      function limb(ctx, list, w0, w1, o) {
        var P = smooth(list, o.plain ? 2 : 3), n = P.length, L = [], R = [], N = [], W = [], k;
        for (k = 0; k < n; k++) {
          var a = P[Math.max(0, k - 1)], b = P[Math.min(n - 1, k + 1)];
          var tx = b.x - a.x, ty = b.y - a.y, d = Math.sqrt(tx * tx + ty * ty) || 1;
          var nx = -ty / d * o.side, ny = tx / d * o.side;
          var w = U.lerp(w0, w1, Math.pow(k / (n - 1), 0.85)) / 2;
          N.push({ x: nx, y: ny }); W.push(w);
          L.push({ x: P[k].x + nx * w, y: P[k].y + ny * w });
          R.push({ x: P[k].x - nx * w, y: P[k].y - ny * w });
        }
        function outline() {
          ctx.beginPath();
          ctx.moveTo(L[0].x, L[0].y);
          for (var j = 1; j < n; j++) { ctx.lineTo(L[j].x, L[j].y); }
          var ang = Math.atan2(N[n - 1].y, N[n - 1].x);
          ctx.arc(P[n - 1].x, P[n - 1].y, W[n - 1], ang, ang - Math.PI, o.side > 0);
          for (j = n - 1; j >= 0; j--) { ctx.lineTo(R[j].x, R[j].y); }
          ctx.closePath();
        }
        /* outline, drawn wide first so the fill covers its inner half */
        outline();
        ctx.lineJoin = 'round';
        ctx.strokeStyle = o.ink || INK; ctx.lineWidth = 5; ctx.stroke();
        ctx.fillStyle = o.skin; ctx.fill();
        /* scenery that sways in the background needs no more than a sheen down its middle */
        if (o.plain) {
          ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = Math.max(1.5, w1 * 0.4); ctx.lineCap = 'round';
          ctx.beginPath();
          for (k = 0; k < n; k++) {
            var px = P[k].x + N[k].x * W[k] * 0.3, py = P[k].y + N[k].y * W[k] * 0.3;
            if (k === 0) { ctx.moveTo(px, py); } else { ctx.lineTo(px, py); }
          }
          ctx.stroke();
          return;
        }
        ctx.save();
        outline(); ctx.clip();
        /* the underside: a paler band along the R edge */
        ctx.beginPath();
        ctx.moveTo(R[0].x, R[0].y);
        for (k = 1; k < n; k++) { ctx.lineTo(R[k].x, R[k].y); }
        for (k = n - 1; k >= 0; k--) { ctx.lineTo(P[k].x - N[k].x * W[k] * 0.15, P[k].y - N[k].y * W[k] * 0.15); }
        ctx.closePath();
        ctx.fillStyle = o.belly; ctx.fill();
        /* shade under the top edge, and a soft sheen along it */
        /* Stroked in a few chunks, each as wide as its middle, rather than joint by joint:
           the taper looks the same and it is a tenth of the drawing calls, which matters
           on a tablet with a dozen limbs and kelp fronds on screen. */
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        var CH = 5, per = Math.ceil((n - 1) / CH);
        function band(off, style, widthOf) {
          ctx.strokeStyle = style;
          for (var c0 = 0; c0 < n - 1; c0 += per) {
            var c1 = Math.min(n - 1, c0 + per), mid = Math.floor((c0 + c1) / 2);
            ctx.lineWidth = widthOf(W[mid]);
            ctx.beginPath();
            for (var j = c0; j <= c1; j++) {
              var bx = P[j].x + N[j].x * W[j] * off, by = P[j].y + N[j].y * W[j] * off;
              if (j === c0) { ctx.moveTo(bx, by); } else { ctx.lineTo(bx, by); }
            }
            ctx.stroke();
          }
        }
        band(0.72, o.shade || 'rgba(120,20,70,.16)', function (w) { return w * 0.5; });
        band(0.38, 'rgba(255,255,255,.34)', function (w) { return Math.max(1.5, w * 0.22); });
        ctx.restore();
        if (!o.suckers) { return; }
        /* Suckers, spaced by distance along the arm and shrinking toward the tip. They
           are gathered first and then drawn as three shapes - faces, rims, centres -
           rather than each one with its own gradient: five arms carry a hundred of them. */
        var cups = [], run = 0, next = W[0] * 1.2;
        for (k = 1; k < n - 2; k++) {
          run += U.dist(P[k].x, P[k].y, P[k - 1].x, P[k - 1].y);
          if (run < next) { continue; }
          next = run + Math.max(9, W[k] * 1.35);
          cups.push({ x: P[k].x - N[k].x * W[k] * 0.6, y: P[k].y - N[k].y * W[k] * 0.6,
            r: Math.max(2.6, W[k] * 0.34), rot: Math.atan2(N[k].y, N[k].x) });
        }
        function cupPath(sx, sy) {
          ctx.beginPath();
          cups.forEach(function (c) {
            ctx.moveTo(c.x + c.r * 0.8 * sx, c.y);
            ctx.ellipse(c.x, c.y, c.r * 0.8 * sx, c.r * sy, c.rot, 0, Math.PI * 2);
          });
        }
        cupPath(1, 1);
        ctx.fillStyle = SUCKER; ctx.fill();
        ctx.strokeStyle = SUCKER_RIM; ctx.lineWidth = Math.max(1.2, W[0] * 0.06); ctx.stroke();
        cupPath(0.38, 0.4);
        ctx.fillStyle = 'rgba(180,64,111,.55)'; ctx.fill();
      }

      /* Soft glows and shines are drawn once into little images and then stamped, since
         building a gradient costs far more than copying a picture. Twice the size they
         are shown at, so they stay smooth on a sharp screen. */
      var sprites = {};
      function sprite(name) {
        if (sprites[name]) { return sprites[name]; }
        var c = document.createElement('canvas'), s = 128;
        c.width = s; c.height = s;
        var g = c.getContext('2d'), m = s / 2, rg;
        if (name === 'bubble') {
          rg = g.createRadialGradient(m * 0.65, m * 0.65, m * 0.1, m, m, m);
          rg.addColorStop(0, 'rgba(255,255,255,.55)'); rg.addColorStop(0.7, 'rgba(200,240,255,.12)'); rg.addColorStop(1, 'rgba(255,255,255,.45)');
          g.fillStyle = rg; g.beginPath(); g.arc(m, m, m - 1, 0, Math.PI * 2); g.fill();
          g.fillStyle = 'rgba(255,255,255,.9)';
          g.beginPath(); g.arc(m * 0.65, m * 0.6, m * 0.22, 0, Math.PI * 2); g.fill();
        } else {
          /* 'glow' behind the creatures, 'shine' on the octopus's head */
          rg = g.createRadialGradient(m, m, 2, m, m, m);
          rg.addColorStop(0, name === 'shine' ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.35)');
          rg.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = rg; g.fillRect(0, 0, s, s);
        }
        sprites[name] = c;
        return c;
      }

      /* A chain pulled towards a point lies dead straight, which looks like a pole. The
         drawn tentacle gets a slow wave running down it, strongest in the middle and
         nothing at either end, so the root stays on the body and the tip stays exactly
         where the finger put it. Livelier when resting, calmer while being steered. */
      function wriggle() {
        var amp = finger ? 9 : 18, out = [];
        for (var k = 0; k <= SEGS; k++) {
          var a = pts[Math.max(0, k - 1)], b = pts[Math.min(SEGS, k + 1)];
          var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
          var off = Math.sin(k * 0.6 - blink * 3) * amp * Math.sin(Math.PI * k / SEGS);
          out.push({ x: pts[k].x - dy / d * off, y: pts[k].y + dx / d * off });
        }
        return out;
      }

      /* An arm reaching out from the body. It leaves at `ang` and turns steadily by
         `sweep` at each joint, so an arm can rise up beside the head or swing down; then
         its last stretch rolls up the way `roll` says (+ clockwise, - the other), the
         tight curl every octopus arm ends in. A small wave on top keeps it from looking
         drawn with a ruler. */
      function arm(x, y, ang, len, n, sweep, roll, ph) {
        var list = [];
        for (var k = 0; k <= n; k++) {
          var t = k / n;
          list.push({ x: x, y: y });
          ang += sweep + (t > 0.55 ? roll * (t - 0.55) * 0.95 : 0) + Math.sin(k * 0.75 + ph) * 0.07;
          x += Math.cos(ang) * len; y += Math.sin(ang) * len;
          len *= 0.955;                                  /* shorter joints toward the tip */
        }
        return list;
      }


      /* ---- the scenery that never moves, painted once at twice the size so it stays
         sharp on a high-resolution screen ---- */
      var backdrop = null;
      function paintBackdrop() {
        var c = document.createElement('canvas');
        c.width = api.W * 2; c.height = api.H * 2;
        var g = c.getContext('2d');
        g.scale(2, 2);
        var sea = g.createLinearGradient(0, 0, 0, api.H);
        sea.addColorStop(0, '#6fd6f7'); sea.addColorStop(0.35, '#2aa2d6');
        sea.addColorStop(0.75, '#136aa8'); sea.addColorStop(1, '#0a4478');
        g.fillStyle = sea; g.fillRect(0, 0, api.W, api.H);
        /* far-off rocks, fading into the blue */
        [['rgba(14,84,140,.55)', 470, 0.9], ['rgba(10,70,122,.7)', 520, 1.4]].forEach(function (layer, li) {
          g.fillStyle = layer[0];
          g.beginPath(); g.moveTo(0, api.H);
          for (var x = 0; x <= api.W; x += 20) {
            g.lineTo(x, layer[1] - Math.abs(Math.sin(x * 0.006 * layer[2] + li * 2)) * (70 - li * 25) - Math.sin(x * 0.03) * 6);
          }
          g.lineTo(api.W, api.H); g.closePath(); g.fill();
        });
        /* sand */
        var sand = g.createLinearGradient(0, 560, 0, api.H);
        sand.addColorStop(0, '#f6e2ac'); sand.addColorStop(1, '#d6ac64');
        g.fillStyle = sand;
        g.beginPath(); g.moveTo(0, api.H);
        for (var x = 0; x <= api.W; x += 10) { g.lineTo(x, 578 + Math.sin(x * 0.018) * 9 + Math.sin(x * 0.05) * 3); }
        g.lineTo(api.W, api.H); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(160,110,40,.22)'; g.lineWidth = 2; g.lineCap = 'round';
        for (var r = 0; r < 14; r++) {
          var rx = (r * 97) % api.W, ry = 600 + (r * 37) % 32;
          g.beginPath(); g.moveTo(rx, ry); g.quadraticCurveTo(rx + 25, ry - 6, rx + 50, ry); g.stroke();
        }
        /* pebbles */
        for (var p = 0; p < 26; p++) {
          var px = (p * 131 + 40) % api.W, py = 596 + (p * 53) % 38, pr = 3 + (p * 7) % 6;
          g.fillStyle = ['#b9a58a', '#9f8b74', '#cdbba0', '#8d99a6'][p % 4];
          g.beginPath(); g.ellipse(px, py, pr * 1.3, pr, 0, 0, Math.PI * 2); g.fill();
          g.fillStyle = 'rgba(255,255,255,.35)';
          g.beginPath(); g.ellipse(px - pr * 0.4, py - pr * 0.35, pr * 0.45, pr * 0.28, 0, 0, Math.PI * 2); g.fill();
        }
        /* a scallop shell and a starfish */
        shell(g, 560, 612, 16, '#ffb4a2');
        shell(g, 905, 600, 12, '#ffd6a5');
        starfish(g, 760, 612, 20, -0.3);
        /* a rock with its coral, bottom right */
        rock(g, 930, 585, 90, 60);
        coral(g, 880, 575, '#ff7f7f', 1);
        coral(g, 965, 570, '#ffa94d', -1);
        return c;
      }

      function shell(g, x, y, s, col) {
        g.save(); g.translate(x, y);
        g.fillStyle = col; g.strokeStyle = 'rgba(120,60,40,.5)'; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(0, 0);
        g.arc(0, 0, s, Math.PI * 1.05, Math.PI * 1.95); g.closePath(); g.fill(); g.stroke();
        for (var k = 1; k < 6; k++) {
          var a = Math.PI * (1.05 + k * 0.15);
          g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * s, Math.sin(a) * s); g.stroke();
        }
        g.restore();
      }

      function starfish(g, x, y, s, rot) {
        g.save(); g.translate(x, y); g.rotate(rot); g.scale(1, 0.55);
        g.beginPath();
        for (var k = 0; k < 10; k++) {
          var r = k % 2 ? s * 0.42 : s, a = -Math.PI / 2 + k * Math.PI / 5;
          g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        g.closePath();
        g.fillStyle = '#ff8a3d'; g.fill();
        g.strokeStyle = '#c85a1e'; g.lineWidth = 2; g.stroke();
        g.fillStyle = 'rgba(255,230,190,.8)';
        for (k = 0; k < 5; k++) {
          var aa = -Math.PI / 2 + k * Math.PI * 2 / 5;
          g.beginPath(); g.arc(Math.cos(aa) * s * 0.5, Math.sin(aa) * s * 0.5, 1.8, 0, Math.PI * 2); g.fill();
        }
        g.restore();
      }

      function rock(g, x, y, w, h) {
        var rg = g.createLinearGradient(0, y - h, 0, y + 10);
        rg.addColorStop(0, '#7f93a8'); rg.addColorStop(1, '#465a70');
        g.fillStyle = rg;
        g.beginPath();
        g.moveTo(x - w, y + 12);
        g.bezierCurveTo(x - w, y - h * 0.6, x - w * 0.4, y - h, x + w * 0.1, y - h * 0.95);
        g.bezierCurveTo(x + w * 0.7, y - h * 0.9, x + w, y - h * 0.3, x + w, y + 12);
        g.closePath(); g.fill();
        g.strokeStyle = 'rgba(20,30,50,.35)'; g.lineWidth = 2; g.stroke();
        g.fillStyle = 'rgba(255,255,255,.18)';
        g.beginPath(); g.ellipse(x - w * 0.3, y - h * 0.7, w * 0.3, h * 0.12, -0.3, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(80,170,90,.55)';
        [[-0.6, -0.5], [-0.2, -0.85], [0.4, -0.75]].forEach(function (m) {
          g.beginPath(); g.ellipse(x + w * m[0], y + h * m[1], 12, 6, 0.2, 0, Math.PI * 2); g.fill();
        });
      }

      /* branching coral: thick rounded stems that split, with a lighter edge */
      function coral(g, x, y, col, dir) {
        g.lineCap = 'round';
        function branch(bx, by, ang, len, w, depth) {
          var ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
          g.strokeStyle = U.shade(col, -0.25); g.lineWidth = w + 3;
          g.beginPath(); g.moveTo(bx, by); g.lineTo(ex, ey); g.stroke();
          g.strokeStyle = col; g.lineWidth = w;
          g.beginPath(); g.moveTo(bx, by); g.lineTo(ex, ey); g.stroke();
          g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = w * 0.3;
          g.beginPath(); g.moveTo(bx - 2, by); g.lineTo(ex - 2, ey); g.stroke();
          if (depth > 0) {
            branch(ex, ey, ang - 0.45 * dir, len * 0.72, w * 0.72, depth - 1);
            branch(ex, ey, ang + 0.4 * dir, len * 0.66, w * 0.7, depth - 1);
          } else {
            g.fillStyle = U.shade(col, 0.35);
            g.beginPath(); g.arc(ex, ey, w * 0.62, 0, Math.PI * 2); g.fill();
          }
        }
        branch(x, y, -Math.PI / 2 + 0.1 * dir, 48, 15, 3);
      }


      /* ---- the octopus ----
         A big round head floating in the water, with large eyes set low and close
         together, and eight long arms bursting out from one point underneath it in every
         direction: two rising up beside the head, two out to the sides, three swinging
         down, and the one the child steers. Every arm is thick at the root, snakes as it
         goes and rolls up at the tip. The seven that are not steered never change, so
         they are painted once into a picture behind the head, which covers their roots. */
      var ANCHOR = { x: 200, y: 420 };                   /* the point under the head where the arms meet */
      var ARM_BOX = { x: 0, y: 150, w: 470, h: 490 };
      /* [root x, root y (from the anchor), direction, joint length, joints, sweep, roll, width] */
      var ARMS = [
        [-40, -30, Math.PI * 1.06, 17, 14, 0.105, -1.1, 38],   /* rising up the left of the head */
        [40, -30, -Math.PI * 0.06, 17, 14, -0.105, 1.1, 38],   /* rising up the right */
        [-44, -12, Math.PI * 0.97, 15, 13, -0.02, 1.2, 40],    /* out to the left, tip rolled up */
        [-26, -2, Math.PI * 0.74, 15, 13, 0.03, 1.2, 42],      /* down and left */
        [-4, 0, Math.PI * 0.53, 14, 12, -0.03, -1.2, 42],      /* straight down */
        [20, -2, Math.PI * 0.33, 15, 13, -0.03, -1.2, 42],     /* down and right */
        [44, -12, Math.PI * 0.08, 14, 11, 0.04, -1.3, 36]      /* low to the right, under the steered arm */
      ];
      var armsPic = null;
      function armsPicture() {
        if (armsPic) { return armsPic; }
        var c = document.createElement('canvas');
        c.width = ARM_BOX.w * 2; c.height = ARM_BOX.h * 2;
        var g = c.getContext('2d');
        g.scale(2, 2); g.translate(-ARM_BOX.x, -ARM_BOX.y);
        ARMS.forEach(function (a, k) {
          /* the two raised arms are further back, so a shade darker */
          limb(g, arm(ANCHOR.x + a[0], ANCHOR.y + a[1], a[2], a[3], a[4], a[5], a[6], k * 1.7), a[7], 5,
            { skin: k < 2 ? '#dc4a2c' : SKIN, belly: BELLY, side: a[6] > 0 ? -1 : 1, suckers: true });
        });
        armsPic = c;
        return c;
      }

      /* the head, in units around the anchor: a round bulb, widest well above the eyes */
      var HEAD = [
        [0, 2], [28, 6, 54, 2, 66, -14], [80, -34, 92, -76, 92, -118], [92, -186, 50, -226, 0, -226],
        [-50, -226, -92, -186, -92, -118], [-92, -76, -80, -34, -66, -14], [-54, 2, -28, 6, 0, 2]
      ];

      function drawOctopus(ctx) {
        var bob = Math.sin(blink * 1.2) * 4;
        /* It starts out slim and hungry and fills out with every right snack, with a
           quick bulge on each gulp. The base stays put and the head swells up and out
           from it, so the eyes and mouth never move out from under the food. */
        var sx = 1 + 0.22 * full + gulp * 0.07, sy = 0.94 + 0.1 * full + gulp * 0.03;
        var ax = ANCHOR.x, ay = ANCHOR.y + bob;
        function X(lx) { return ax + lx * sx; }
        function Y(ly) { return ay + ly * sy; }

        /* the resting arms float along with the body */
        ctx.drawImage(armsPicture(), ARM_BOX.x, ARM_BOX.y + bob, ARM_BOX.w, ARM_BOX.h);
        /* the arm the child steers, behind the head so it grows out from under it */
        limb(ctx, wriggle(), 44, 10, { skin: SKIN, belly: BELLY, side: 1, suckers: true });

        function head() {
          ctx.beginPath();
          ctx.moveTo(X(HEAD[0][0]), Y(HEAD[0][1]));
          for (var k = 1; k < HEAD.length; k++) {
            var m = HEAD[k];
            ctx.bezierCurveTo(X(m[0]), Y(m[1]), X(m[2]), Y(m[3]), X(m[4]), Y(m[5]));
          }
          ctx.closePath();
        }
        head();
        ctx.lineJoin = 'round';
        ctx.lineWidth = 7; ctx.strokeStyle = INK; ctx.stroke();
        /* lit from above and to the left: bright on the crown, deep red underneath */
        var g = ctx.createRadialGradient(X(-34), Y(-170), 6, X(0), Y(-100), 150 * sx);
        g.addColorStop(0, SKIN_LIGHT); g.addColorStop(0.55, SKIN); g.addColorStop(1, SKIN_DEEP);
        ctx.fillStyle = g; ctx.fill();

        ctx.save();
        head(); ctx.clip();
        /* spots across the crown: flat, see-through dots, soft enough and cheap to draw */
        ctx.fillStyle = 'rgba(150,35,15,.2)';
        ctx.beginPath();
        [[-46, -160, 11], [-8, -196, 8], [26, -170, 14], [54, -128, 9], [-62, -118, 7], [10, -140, 6],
          [-24, -134, 5], [40, -200, 5], [-40, -196, 6], [64, -168, 5]].forEach(function (s) {
          var x = X(s[0]), y = Y(s[1]);
          ctx.moveTo(x + s[2], y); ctx.arc(x, y, s[2], 0, Math.PI * 2);
        });
        ctx.fill();
        /* a darker band low down, where the head turns under toward the arms */
        var sg = ctx.createLinearGradient(0, Y(-40), 0, Y(4));
        sg.addColorStop(0, 'rgba(120,30,10,0)'); sg.addColorStop(1, 'rgba(120,30,10,.32)');
        ctx.fillStyle = sg; ctx.fillRect(X(-100), Y(-40), 200 * sx, 50);
        /* light on the crown, and a wet highlight */
        ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(X(-82), Y(-110)); ctx.bezierCurveTo(X(-84), Y(-180), X(-40), Y(-218), X(10), Y(-218));
        ctx.stroke();
        ctx.drawImage(sprite('shine'), X(-40) - 38, Y(-176) - 26, 76, 52);
        ctx.restore();

        /* big eyes set low and close together, watching the tentacle tip */
        var eyeY = Y(-64), eyeDX = 30 * sx;
        var end = pts[SEGS];
        var lx = U.clamp((end.x - ax) / 300, -1, 1), ly = U.clamp((end.y - eyeY) / 300, -1, 1);
        [-1, 1].forEach(function (s) {
          PH.art.eye(ctx, ax + s * eyeDX, eyeY, 25, { look: [lx, ly], blink: PH.art.blink(5), lid: SKIN, ink: INK });
        });
        PH.art.cheeks(ctx, ax, eyeY + 30, eyeDX * 2 + 40, 11, 'rgba(255,130,100,.4)');

        /* the mouth: opens wide when food comes close, chews, or pulls a face */
        var near = held ? U.clamp(1 - (U.dist(held.x, held.y, MOUTH.x, MOUTH.y) - 80) / 220, 0, 1) : 0;
        var hx = ax, my = MOUTH.y + bob;
        function open(w, h) {
          ctx.fillStyle = '#6b1d3a'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.ellipse(hx, my, w, h, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.save();
          ctx.beginPath(); ctx.ellipse(hx, my, w, h, 0, 0, Math.PI * 2); ctx.clip();
          ctx.fillStyle = '#ff7b9c';
          ctx.beginPath(); ctx.ellipse(hx, my + h * 0.75, w * 0.7, h * 0.5, 0, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        }
        if (yuck > 0) {
          PH.art.mouth(ctx, hx, my, 24, 'frown', { lineWidth: 3.5, ink: INK });
          /* a little green tinge of disgust */
          ctx.fillStyle = 'rgba(120,200,90,' + (0.3 * yuck) + ')';
          ctx.beginPath(); ctx.ellipse(hx, eyeY + 10, 60, 30, 0, 0, Math.PI * 2); ctx.fill();
        } else if (chew > 0) {
          open(15, Math.abs(Math.sin(chew * 18)) * 11 + 4);
        } else if (near > 0.05) {
          open(10 + near * 12, 4 + near * 16);
        } else {
          PH.art.mouth(ctx, hx, my - 4, 20, 'smile', { lineWidth: 3, ink: INK });
        }
      }

      function drawFood(ctx, f) {
        if (f.state === 'eaten') { return; }
        var wig = Math.sin(f.phase * 5) * 0.12;
        var label = api.label(f.word.w);
        ctx.font = U.font(api.pre ? 26 : 30);
        var w = ctx.measureText(label).width + 30;
        /* the tag hangs from the creature on a short line of seaweed string */
        ctx.strokeStyle = 'rgba(30,90,60,.8)'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(f.x, f.y); ctx.quadraticCurveTo(f.x + Math.sin(f.phase * 3) * 6, f.y + 12, f.x, f.y + 20); ctx.stroke();
        U.plate(ctx, f.x - w / 2, f.y + 18, w, 46, { fill: f.state === 'held' ? '#fff3a0' : '#ffffff', r: 14 });
        ctx.fillStyle = '#1f2340'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label, f.x, f.y + 42);

        ctx.save();
        ctx.translate(f.x, f.y);
        if (f.state === 'swim') { ctx.rotate(wig); }
        if (f.state === 'spit') { ctx.rotate(f.t * 12); }
        /* the fish emoji face left; turn them round to face the way they swim */
        if (f.vx > 0 && f.state === 'swim') { ctx.scale(-1, 1); }
        ctx.drawImage(creature(f.kind), -46, -64, 92, 92);
        ctx.restore();
      }

      /* A colour emoji drawn at an angle cannot be reused by the browser: it is painted
         from scratch every frame, and four wiggling creatures cost more than the rest of
         the scene put together. So each creature is painted once, with its glow, into a
         picture of its own, and the picture is what wiggles. */
      var creatures = {};
      function creature(kind) {
        if (creatures[kind]) { return creatures[kind]; }
        var c = document.createElement('canvas'), s = 184;
        c.width = s; c.height = s;
        var g = c.getContext('2d');
        g.drawImage(sprite('glow'), 0, 0, s, s);          /* so it stands out from the water */
        g.font = '124px ' + EMOJI;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(kind, s / 2, s / 2 + 4);
        creatures[kind] = c;
        return c;
      }

      function drawBubble(ctx, x, y, r) { ctx.drawImage(sprite('bubble'), x - r, y - r, r * 2, r * 2); }

      function draw(ctx) {
        if (!backdrop) { backdrop = paintBackdrop(); }
        ctx.drawImage(backdrop, 0, 0, api.W, api.H);

        /* light shimmering on the surface, and rays reaching down through the water */
        ctx.strokeStyle = 'rgba(255,255,255,.16)'; ctx.lineWidth = 3;
        for (var s = 0; s < 4; s++) {
          ctx.beginPath();
          for (var x = 0; x <= api.W; x += 20) {
            var y = 12 + s * 16 + Math.sin(x * 0.02 + blink * (1.2 + s * 0.3) + s) * 5;
            if (x === 0) { ctx.moveTo(x, y); } else { ctx.lineTo(x, y); }
          }
          ctx.stroke();
        }
        [170, 470, 760].forEach(function (rx, k) {
          var sway = Math.sin(blink * 0.35 + k * 2) * 50;
          var rg = ctx.createLinearGradient(0, 0, 0, 560);
          rg.addColorStop(0, 'rgba(255,255,255,.16)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = rg;
          ctx.beginPath();
          ctx.moveTo(rx - 34 + sway, 0); ctx.lineTo(rx + 34 + sway, 0);
          ctx.lineTo(rx + 150, 560); ctx.lineTo(rx - 10, 560); ctx.closePath(); ctx.fill();
        });

        /* specks drifting in the water */
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        snow.forEach(function (p) {
          var sx = p.x + Math.sin(blink * 0.6 + p.p) * 8, sy = (p.y + blink * p.v) % 580;
          ctx.beginPath(); ctx.arc(sx, sy, p.r, 0, Math.PI * 2); ctx.fill();
        });

        /* kelp swaying on the sea floor */
        weeds.forEach(function (w, k) {
          var list = [];
          for (var j = 0; j <= 8; j++) {
            list.push({ x: w.x + Math.sin(blink * 1.1 + w.p + j * 0.45) * j * 2.4, y: 594 - j * w.h / 8 });
          }
          limb(ctx, list, 16, 6, { skin: k % 2 ? '#34b36b' : '#2a9a5c', belly: k % 2 ? '#5fd08e' : '#4cbf7c',
            side: 1, ink: '#1c5e3c', plain: true });
        });

        bubbles.forEach(function (b) { drawBubble(ctx, b.x + Math.sin(b.y * 0.03) * 4, b.y, b.r); });

        food.forEach(function (f) { if (f.state !== 'held') { drawFood(ctx, f); } });
        drawOctopus(ctx);
        if (held) { drawFood(ctx, held); }

        /* a soft glowing ring round the tip while steering, so a child sees what they move */
        if (finger) {
          var e = pts[SEGS], pulse = 30 + Math.sin(blink * 8) * 3;
          var ring = ctx.createRadialGradient(e.x, e.y, pulse - 8, e.x, e.y, pulse + 8);
          ring.addColorStop(0, 'rgba(255,255,255,0)'); ring.addColorStop(0.5, 'rgba(255,255,255,.55)'); ring.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = ring;
          ctx.beginPath(); ctx.arc(e.x, e.y, pulse + 8, 0, Math.PI * 2); ctx.fill();
        }
        if (round === 1 && !finger && !held && state === 'play' && hits + misses === 0 && blink > 2.5) {
          U.badge(ctx, 640, 70, 'Drag your finger to move the tentacle', { align: 'center', icon: '👆', size: 18 });
        }
      }

      newRound();
      return { update: update, draw: draw, down: down, move: move, up: up,
        /* read-only peek at the state, used by automated play-through checks */
        debug: function () {
          return { target: target && target.w, round: round, state: state, held: held && held.word.w,
            tip: { x: pts[SEGS].x, y: pts[SEGS].y },
            food: food.map(function (f) { return { w: f.word.w, right: f.right, x: f.x, y: f.y, state: f.state }; }) };
        } };
    }
  };
})(window.PH = window.PH || {});
