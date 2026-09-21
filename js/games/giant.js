/* Don't Wake the Giant - catch the words that fit the rule on a pillow before they crash */
(function (PH) {
  'use strict';
  var U = PH.util;
  var EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  var THINGS = ['🍳', '📚', '🧸', '⏰', '🥄', '🍎',
    '🔔', '🪴', '☕', '🥁'];

  PH.games.giant = {
    id: 'giant',
    name: "Don't Wake the Giant",
    icon: '😴',
    blurb: 'Things are falling off the shelf! Catch the right words on your pillow so nothing crashes and wakes the giant.',

    create: function (api) {
      var ROUNDS = 4, NEED = 5;
      var LEFT = 330, RIGHT = api.W - 30, FLOOR = 598, SHELF = 70;
      var PILLOW_Y = 552;
      var round = 0, rule = null, used = [], items = [], got = 0;
      var hits = 0, misses = 0, state = 'play', timer = 0, spawnT = 1;
      var noise = 0, giantT = 0, awake = 0;
      var pillow = { x: (LEFT + RIGHT) / 2, want: (LEFT + RIGHT) / 2, w: api.pre ? 250 : 200, squish: 0 };
      var dragging = false, zs = [];
      var fall = api.pre ? 50 : 62 + api.level.id * 8;

      function newRound() {
        round++;
        if (round > ROUNDS) {
          api.finish(null, hits + misses ? hits / (hits + misses) : 1);
          state = 'over';
          return;
        }
        rule = PH.rules.pick(api, used, 'Catch');
        used.push(rule.key);
        got = 0; items = []; spawnT = 1.2;
        state = 'play';
        api.setProgress(round, ROUNDS);
        api.setPrompt(rule.label, { word: rule.show, show: true, repeat: rule.say });
        rule.say();
      }

      function spawn() {
        var yes = rule.source.filter(rule.test);
        var no = PH.rules.nonMatches(api, rule);
        var match = Math.random() < 0.5 && yes.length;
        var word = U.pick(match ? yes : (no.length ? no : yes));
        /* keep a new item away from anything still near the top */
        var x, tries = 0;
        do { x = U.rand(LEFT + 60, RIGHT - 60); tries++; }
        while (tries < 12 && items.some(function (it) { return it.y < 200 && Math.abs(it.x - x) < 150; }));
        items.push({
          word: word, match: rule.test(word), x: x, y: SHELF + 4, vy: 0,
          wobble: 0.8, thing: U.pick(THINGS), done: false, fade: 0, spin: 0
        });
      }

      function makeNoise(n, text) {
        noise = Math.min(100, noise + n);
        giantT = 0.6;   /* the giant stirs */
        if (text) { api.say(text, { rate: 0.9 }); }
        if (noise >= 100 && state === 'play') { wake(); }
      }

      function wake() {
        state = 'awake'; awake = 0;
        api.sfx.rumble();
        api.say('Who is there?', { pitch: 0.3, rate: 0.7 });
        items.forEach(function (it) { if (!it.done) { it.done = true; it.fade = 0.01; } });
      }

      function steer(x) { pillow.want = U.clamp(x, LEFT + pillow.w / 2, RIGHT - pillow.w / 2); }
      function down(p) { dragging = true; steer(p.x); }
      function move(p) { if (dragging) { steer(p.x); } }
      function up() { dragging = false; }
      function key(e) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); steer(pillow.want - 70); }
        if (e.key === 'ArrowRight') { e.preventDefault(); steer(pillow.want + 70); }
      }

      function update(dt) {
        pillow.x += (pillow.want - pillow.x) * Math.min(1, dt * 12);
        if (pillow.squish > 0) { pillow.squish -= dt * 3; }
        if (giantT > 0) { giantT -= dt; }
        noise = Math.max(0, noise - dt * 4);

        /* sleepy Zs drifting up from the giant */
        if (state !== 'awake' && Math.random() < dt * 1.2) { zs.push({ x: 196, y: 400, age: 0 }); }
        for (var z = zs.length - 1; z >= 0; z--) {
          zs[z].age += dt; zs[z].y -= 28 * dt; zs[z].x += 10 * dt;
          if (zs[z].age > 3) { zs.splice(z, 1); }
        }

        if (state === 'play') {
          spawnT -= dt;
          var falling = items.filter(function (it) { return !it.done; }).length;
          if (spawnT <= 0 && falling < 3) {
            spawn();
            spawnT = U.rand(1.5, 2.6) - api.level.id * 0.12;
          }
        }

        items.forEach(function (it) {
          if (it.done) {
            if (it.fade > 0) { it.fade += dt * 2.5; }
            if (it.bounce) { it.vy += 900 * dt; it.y += it.vy * dt; it.x += it.vx * dt; it.spin += dt * 8; }
            return;
          }
          if (it.wobble > 0) { it.wobble -= dt; return; }   /* teeters on the shelf first */
          it.vy = Math.min(it.vy + 120 * dt, fall + 40);
          if (it.vy < fall) { it.vy = fall; }
          it.y += it.vy * dt;

          /* landed on the pillow? */
          if (state === 'play' && it.y + 50 >= PILLOW_Y && it.y + 50 <= PILLOW_Y + 30 &&
              Math.abs(it.x - pillow.x) <= pillow.w / 2 + 8) {
            it.done = true;
            pillow.squish = 1;
            if (it.match) {
              it.fade = 0.01;
              hits++; got++;
              api.addStar(1);
              api.sfx.poof();
              api.burst(it.x, PILLOW_Y, ['#ffffff', '#ffd6e8', '#cfe8ff'], 12, { gravity: 200 });
              if (got >= NEED) {
                state = 'between'; timer = 0;
                api.sfx.great();
                api.say('Shh... well done!', { rate: 0.8 });
              }
            } else {
              misses++;
              it.bounce = true; it.vy = -380; it.vx = it.x < pillow.x ? -160 : 160; it.fade = 0.01;
              api.sfx.crash();
              makeNoise(30);
              api.say('Oops!', { queue: false });
              api.sayWord(it.word.w, { queue: true });
              api.say('does not fit', { queue: true });
            }
            return;
          }
          /* hit the floor */
          if (it.y + 50 >= FLOOR) {
            it.done = true; it.fade = 0.01;
            if (it.match && state === 'play') {
              misses++;
              api.sfx.crash();
              api.burst(it.x, FLOOR, ['#c9ced9', '#ffffff', '#8a93a8'], 14, { lift: 160 });
              makeNoise(34, 'Crash! Shhh!');
            } else {
              api.sfx.poof();   /* the rug is soft for everything else */
            }
          }
        });
        items = items.filter(function (it) { return it.fade < 1 && it.y < api.H + 80; });

        if (state === 'awake') {
          awake += dt;
          if (awake > 3) {
            noise = 30; state = 'play'; spawnT = 1;
            api.say('He is asleep again. Keep it quiet!', { rate: 0.9 });
          }
        } else if (state === 'between') {
          timer += dt;
          if (timer > 1.6) { newRound(); }
        }
      }

      function drawGiant(ctx) {
        var art = PH.art;
        var t = performance.now() / 1000;
        var breathe = Math.sin(t * 1.3) * 5;
        var awakeNow = state === 'awake';
        var SKIN = '#f2c29b', HAIR = '#e0762f';

        /* a carved wooden headboard with a heart */
        ctx.beginPath();
        ctx.moveTo(0, api.H); ctx.lineTo(0, 350);
        ctx.quadraticCurveTo(0, 318, 28, 318); ctx.lineTo(34, 318);
        ctx.lineTo(34, api.H); ctx.closePath();
        art.fillLit(ctx, '#9a5f36', 318, api.H, { lineWidth: 3.5 });
        art.ball(ctx, 18, 312, 14, '#b8743f', { lineWidth: 3 });
        ctx.fillStyle = '#6e3f22';
        ctx.beginPath(); ctx.moveTo(18, 380); ctx.bezierCurveTo(4, 368, 6, 352, 18, 358); ctx.bezierCurveTo(30, 352, 32, 368, 18, 380); ctx.fill();

        /* a plump pillow */
        ctx.beginPath();
        ctx.moveTo(44, 452); ctx.quadraticCurveTo(115, 426, 196, 448);
        ctx.quadraticCurveTo(212, 482, 196, 516); ctx.quadraticCurveTo(115, 530, 44, 514);
        ctx.quadraticCurveTo(28, 482, 44, 452); ctx.closePath();
        art.fillLit(ctx, '#f7f4ff', 430, 525, { light: 0.2, dark: -0.14 });

        /* hair tufts sticking out round the head */
        var shake = giantT > 0 ? Math.sin(giantT * 40) * 4 : 0;
        var hx = 120 + shake, hy = 420;
        var spike = awakeNow ? 14 : 0;
        [[-80, -4, 0.2], [-74, 22, 0.6], [74, 4, -0.3], [80, 26, -0.6]].forEach(function (h) {
          ctx.save(); ctx.translate(hx + h[0], hy + h[1]); ctx.rotate(h[2] + (h[0] < 0 ? -1 : 1) * spike * 0.03);
          ctx.beginPath();
          ctx.moveTo(0, -12); ctx.quadraticCurveTo((h[0] < 0 ? -1 : 1) * (26 + spike), -8, (h[0] < 0 ? -1 : 1) * (30 + spike), 6);
          ctx.quadraticCurveTo((h[0] < 0 ? -1 : 1) * 14, 2, 0, 12); ctx.closePath();
          art.fillLit(ctx, HAIR, -12, 12, { lineWidth: 3 });
          ctx.restore();
        });
        /* big ears */
        [-1, 1].forEach(function (s) {
          ctx.beginPath(); ctx.ellipse(hx + s * 76, hy + 10, 16, 22, s * 0.2, 0, Math.PI * 2);
          art.fillLit(ctx, SKIN, hy - 12, hy + 32);
          ctx.strokeStyle = 'rgba(160,90,60,.5)'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(hx + s * 76, hy + 10, 9, s > 0 ? -1.2 : 1.9, s > 0 ? 1.2 : 4.3); ctx.stroke();
        });
        /* the big round face */
        ctx.beginPath(); ctx.ellipse(hx, hy, 78, 70, 0, 0, Math.PI * 2);
        art.fillLit(ctx, SKIN, hy - 70, hy + 70, { light: 0.16, dark: -0.14, lineWidth: 4 });
        /* stubble and freckles */
        ctx.fillStyle = 'rgba(120,70,50,.28)';
        [[-30, 48], [-18, 56], [-4, 60], [12, 58], [26, 52], [38, 44], [-40, 40], [-10, 50], [20, 46]].forEach(function (d) {
          ctx.beginPath(); ctx.arc(hx + d[0], hy + d[1], 1.8, 0, Math.PI * 2); ctx.fill();
        });
        ctx.fillStyle = 'rgba(190,100,60,.45)';
        [[-46, 8], [-38, 14], [-50, 18], [46, 8], [54, 14], [42, 18]].forEach(function (d) {
          ctx.beginPath(); ctx.arc(hx + d[0], hy + d[1], 2.6, 0, Math.PI * 2); ctx.fill();
        });
        art.cheeks(ctx, hx + 2, hy + 18, 96, 14, 'rgba(255,100,110,.3)');

        /* eyes, brows and mouth change with his mood */
        if (awakeNow) {
          art.eye(ctx, hx - 28, hy - 12, 16, { iris: '#3d7bd9', irisSize: 0.45 });
          art.eye(ctx, hx + 30, hy - 12, 16, { iris: '#3d7bd9', irisSize: 0.45 });
          [-1, 1].forEach(function (s) {           /* cross, furrowed brows */
            ctx.beginPath();
            ctx.moveTo(hx + s * 10 + 2, hy - 30); ctx.lineTo(hx + s * 48 + 2, hy - 46);
            ctx.lineTo(hx + s * 50 + 2, hy - 36); ctx.lineTo(hx + s * 12 + 2, hy - 22); ctx.closePath();
            art.fillLit(ctx, HAIR, hy - 46, hy - 22, { lineWidth: 3 });
          });
          ctx.beginPath(); ctx.ellipse(hx + 4, hy + 38, 24, 18, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#7a2340'; ctx.fill();
          ctx.save(); ctx.clip();
          ctx.fillStyle = '#ffffff'; ctx.fillRect(hx - 24, hy + 18, 56, 9);
          ctx.fillStyle = '#ff7b93'; ctx.beginPath(); ctx.ellipse(hx + 4, hy + 54, 14, 9, 0, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
          ctx.strokeStyle = art.INK; ctx.lineWidth = 3.5;
          ctx.beginPath(); ctx.ellipse(hx + 4, hy + 38, 24, 18, 0, 0, Math.PI * 2); ctx.stroke();
        } else {
          var peek = giantT > 0 ? 0.35 : 0;
          [-28, 30].forEach(function (ex, i) {       /* sleepy lids with lashes */
            ctx.strokeStyle = art.INK; ctx.lineWidth = 4; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.arc(hx + ex, hy - 16, 13, 0.12 * Math.PI - peek, 0.88 * Math.PI + peek); ctx.stroke();
            ctx.lineWidth = 3;
            for (var l = 0; l < 3; l++) {
              var la = (0.3 + l * 0.2) * Math.PI;
              ctx.beginPath();
              ctx.moveTo(hx + ex + Math.cos(la) * 13, hy - 16 + Math.sin(la) * 13);
              ctx.lineTo(hx + ex + Math.cos(la) * 19, hy - 16 + Math.sin(la) * 19);
              ctx.stroke();
            }
            if (peek) {                               /* one eye cracks open when he stirs */
              if (i === 1) { art.eye(ctx, hx + ex, hy - 8, 6, { tall: 0.8 }); }
            }
          });
          [-1, 1].forEach(function (s) {             /* relaxed, droopy brows */
            ctx.beginPath();
            ctx.moveTo(hx + s * 14, hy - 38); ctx.quadraticCurveTo(hx + s * 30, hy - 48, hx + s * 48, hy - 36);
            ctx.quadraticCurveTo(hx + s * 30, hy - 40, hx + s * 14, hy - 32); ctx.closePath();
            art.fillLit(ctx, HAIR, hy - 48, hy - 32, { lineWidth: 3 });
          });
          var snore = 10 + breathe * 0.7;
          ctx.beginPath(); ctx.ellipse(hx + 4, hy + 38, snore * 1.1, snore, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#7a2340'; ctx.fill();
          ctx.strokeStyle = art.INK; ctx.lineWidth = 3.5; ctx.stroke();
        }
        /* a huge bulbous nose */
        art.ball(ctx, hx + 2, hy + 10, 18, '#eba27d', { lineWidth: 3.5 });
        ctx.fillStyle = 'rgba(110,50,40,.45)';
        ctx.beginPath(); ctx.arc(hx - 6, hy + 18, 3.5, 0, Math.PI * 2); ctx.arc(hx + 10, hy + 18, 3.5, 0, Math.PI * 2); ctx.fill();
        /* a snore bubble that swells and shrinks from his nose */
        if (!awakeNow) {
          var br = 7 + Math.max(0, breathe + 5) * 1.6;
          ctx.fillStyle = 'rgba(200,235,255,.45)';
          ctx.beginPath(); ctx.arc(hx + 22 + br * 0.7, hy + 24 + br * 0.2, br, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2; ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(hx + 18 + br * 0.5, hy + 20, br * 0.25, 0, Math.PI * 2); ctx.fill();
        }

        /* a striped nightcap flopping over, with a pompom */
        var capSway = Math.sin(t * 1.3) * 4;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(hx - 80, hy - 20);
        ctx.quadraticCurveTo(hx - 70, hy - 96, hx, hy - 104);
        ctx.quadraticCurveTo(hx + 70, hy - 120, hx + 104 + capSway, hy - 66);
        ctx.quadraticCurveTo(hx + 80, hy - 86, hx + 60, hy - 76);
        ctx.quadraticCurveTo(hx + 82, hy - 50, hx + 78, hy - 22);
        ctx.quadraticCurveTo(hx, hy - 50, hx - 80, hy - 20);
        ctx.closePath();
        art.fillLit(ctx, '#ff5d8f', hy - 120, hy - 20, { lineWidth: 4 });
        ctx.clip();
        ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 12;
        for (var st = -3; st < 6; st++) {
          ctx.beginPath(); ctx.moveTo(hx - 90 + st * 40, hy - 10); ctx.lineTo(hx - 30 + st * 40, hy - 130); ctx.stroke();
        }
        ctx.restore();
        ctx.strokeStyle = art.INK; ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(hx - 80, hy - 20);
        ctx.quadraticCurveTo(hx, hy - 50, hx + 78, hy - 22);
        ctx.stroke();
        /* cap cuff */
        ctx.beginPath();
        ctx.moveTo(hx - 84, hy - 14); ctx.quadraticCurveTo(hx, hy - 48, hx + 82, hy - 16);
        ctx.lineTo(hx + 80, hy - 32); ctx.quadraticCurveTo(hx, hy - 64, hx - 82, hy - 30); ctx.closePath();
        art.fillLit(ctx, '#ffffff', hy - 64, hy - 14, { light: 0, dark: -0.15, lineWidth: 3.5 });
        art.ball(ctx, hx + 108 + capSway, hy - 62, 16, '#ffffff', { lineWidth: 3.5 });

        /* the patchwork quilt, rising and falling as he breathes */
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(30, api.H);
        ctx.quadraticCurveTo(46, 486 - breathe, 190, 494 - breathe);
        ctx.quadraticCurveTo(300, 500, 316, api.H);
        ctx.closePath();
        art.fillLit(ctx, '#4d8dff', 480, api.H, { lineWidth: 4 });
        ctx.clip();
        var patches = ['#ffd23f', '#3ddc84', '#ff9f40', '#9b5de5', '#2ec4b6', '#ff5d8f'];
        for (var py = 0; py < 3; py++) {
          for (var px = 0; px < 5; px++) {
            if ((px + py) % 2) { continue; }
            var qx = 30 + px * 60, qy = 500 - breathe + py * 50;
            ctx.fillStyle = patches[(px + py * 2) % patches.length];
            ctx.globalAlpha = 0.85;
            ctx.fillRect(qx, qy, 60, 50);
            ctx.globalAlpha = 1;
            ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
            ctx.strokeRect(qx + 5, qy + 5, 50, 40);
            ctx.setLineDash([]);
          }
        }
        ctx.fillStyle = 'rgba(255,255,255,.25)';
        ctx.fillRect(0, 486 - breathe, 330, 12);
        ctx.restore();
        /* a sleepy teddy tucked in beside him */
        var tx = 250, ty = 506 - breathe * 0.8;
        [-1, 1].forEach(function (s) { art.ball(ctx, tx + s * 16, ty - 16, 9, '#b07a4a', { shine: false, lineWidth: 3 }); });
        art.ball(ctx, tx, ty, 22, '#b07a4a', { lineWidth: 3 });
        art.ball(ctx, tx, ty + 7, 9, '#e3c29a', { shine: false, lineWidth: 2.5 });
        ctx.fillStyle = art.INK;
        ctx.beginPath(); ctx.ellipse(tx, ty + 3, 3.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = art.INK; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(tx - 8, ty - 5, 3.5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.arc(tx + 8, ty - 5, 3.5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
        /* the quilt edge folded over the teddy, and a giant hand holding it */
        ctx.beginPath();
        ctx.moveTo(214, 526 - breathe); ctx.quadraticCurveTo(250, 516 - breathe, 300, 528 - breathe);
        ctx.lineTo(304, 546 - breathe); ctx.quadraticCurveTo(250, 536 - breathe, 212, 544 - breathe); ctx.closePath();
        art.fillLit(ctx, '#ffffff', 516 - breathe, 546 - breathe, { light: 0, dark: -0.15, lineWidth: 3 });
        for (var fi = 0; fi < 4; fi++) {
          art.ball(ctx, 120 + fi * 20, 506 - breathe + Math.abs(fi - 1.5) * 3, 12, SKIN, { shine: false, lineWidth: 3 });
        }

        /* Zs or a grumpy bubble */
        if (awakeNow) {
          U.plate(ctx, 30, 236, 250, 74, { fill: '#ffffff', r: 28 });
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.moveTo(120, 312); ctx.lineTo(108, 350); ctx.lineTo(152, 312); ctx.fill();
          ctx.strokeStyle = 'rgba(31,35,64,.22)'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(120, 314); ctx.lineTo(108, 350); ctx.lineTo(152, 314); ctx.stroke();
          ctx.fillStyle = '#1f2340';
          ctx.font = U.font(28);
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText("WHO'S THERE?!", 155, 272);
        } else {
          zs.forEach(function (z) {
            ctx.globalAlpha = U.clamp(1 - z.age / 3, 0, 1);
            ctx.font = U.font(22 + z.age * 10);
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.lineWidth = 5; ctx.strokeStyle = '#ffffff'; ctx.lineJoin = 'round';
            ctx.strokeText('z', z.x, z.y);
            ctx.fillStyle = '#9b5de5';
            ctx.fillText('z', z.x, z.y);
          });
          ctx.globalAlpha = 1;
        }
      }

      function drawMeter(ctx) {
        U.plate(ctx, 16, 14, 290, 66, { fill: '#343a6b', r: 16, edge: 'rgba(255,255,255,.3)', shine: 0.12 });
        ctx.fillStyle = '#fff';
        ctx.font = U.font(18);
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText('Noise', 30, 36);
        ctx.fillStyle = 'rgba(255,255,255,.2)';
        U.roundRect(ctx, 30, 50, 262, 18, 9); ctx.fill();
        var col = noise < 45 ? '#3ddc84' : (noise < 75 ? '#ffd23f' : '#ff5d8f');
        ctx.fillStyle = col;
        U.roundRect(ctx, 30, 50, Math.max(18, 262 * noise / 100), 18, 9); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.textAlign = 'right';
        ctx.fillText('Caught ' + got + ' / ' + NEED, 292, 36);
      }

      function drawItem(ctx, it) {
        var alpha = it.fade > 0 ? U.clamp(1 - it.fade, 0, 1) : 1;
        var tilt = it.wobble > 0 ? Math.sin(it.wobble * 30) * 0.25 : it.spin;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(it.x, it.y);
        ctx.rotate(tilt);
        ctx.font = '46px ' + EMOJI;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(it.thing, 0, 0);
        ctx.rotate(-tilt);
        var shown = api.label(it.word.w);
        var fs = api.mode === 'letters' ? 34 : (shown.length > 7 ? 20 : 26);
        ctx.font = U.font(fs);
        var tw = ctx.measureText(shown).width + 22;
        U.plate(ctx, -tw / 2, 22, tw, 34, { r: 10 });
        ctx.font = U.font(fs);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#1f2340';
        ctx.fillText(shown, 0, 41);
        ctx.restore();
      }

      function draw(ctx) {
        var now = performance.now() / 1000;
        /* night-time wallpaper with a pattern of tiny stars */
        var wall = ctx.createLinearGradient(0, 0, 0, api.H);
        wall.addColorStop(0, '#2b2760');
        wall.addColorStop(1, '#433c82');
        ctx.fillStyle = wall;
        ctx.fillRect(0, 0, api.W, api.H);
        ctx.fillStyle = 'rgba(255,255,255,.07)';
        for (var py = 20; py < FLOOR; py += 50) {
          for (var px = 20 + (py / 50 % 2) * 25; px < api.W; px += 50) { U.star(ctx, px, py, 5, 2); ctx.fill(); }
        }
        /* a bedside lamp casting a warm pool of light */
        var lamp = ctx.createRadialGradient(270, 330, 10, 270, 330, 230);
        lamp.addColorStop(0, 'rgba(255,214,140,.35)'); lamp.addColorStop(1, 'rgba(255,214,140,0)');
        ctx.fillStyle = lamp; ctx.fillRect(40, 100, 460, 460);
        /* the window: night sky, moon, curtains */
        ctx.fillStyle = '#6d4c8a'; U.roundRect(ctx, 52, 102, 186, 146, 14); ctx.fill();
        var night = ctx.createLinearGradient(0, 110, 0, 240);
        night.addColorStop(0, '#0b0930'); night.addColorStop(1, '#2a2470');
        ctx.fillStyle = night; U.roundRect(ctx, 60, 110, 170, 130, 10); ctx.fill();
        ctx.fillStyle = '#fff4c2';
        ctx.beginPath(); ctx.arc(170, 160, 28, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0f0c38';
        ctx.beginPath(); ctx.arc(182, 152, 24, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        [[88, 132], [110, 210], [210, 222], [140, 124]].forEach(function (s, n) {
          ctx.globalAlpha = 0.5 + 0.5 * Math.sin(now * 2 + n);
          U.star(ctx, s[0], s[1], 4, 1.6); ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#8f5fb8';
        ctx.beginPath(); ctx.moveTo(44, 96); ctx.quadraticCurveTo(84, 170, 56, 256); ctx.lineTo(44, 256); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(246, 96); ctx.quadraticCurveTo(206, 170, 234, 256); ctx.lineTo(246, 256); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#c29a6b'; ctx.fillRect(36, 92, 218, 8);

        /* wooden shelf */
        var shelf = ctx.createLinearGradient(0, SHELF + 26, 0, SHELF + 40);
        shelf.addColorStop(0, '#c07a45'); shelf.addColorStop(1, '#7a4320');
        ctx.fillStyle = shelf;
        ctx.fillRect(LEFT, SHELF + 26, RIGHT - LEFT, 14);
        ctx.fillStyle = '#6a3a1a';
        ctx.fillRect(LEFT + 20, SHELF + 40, 12, 26); ctx.fillRect(RIGHT - 32, SHELF + 40, 12, 26);

        /* floorboards + a patterned rug */
        var fl = ctx.createLinearGradient(0, FLOOR, 0, api.H);
        fl.addColorStop(0, '#7a5240'); fl.addColorStop(1, '#5a3a2c');
        ctx.fillStyle = fl;
        ctx.fillRect(0, FLOOR, api.W, api.H - FLOOR);
        ctx.strokeStyle = 'rgba(0,0,0,.2)'; ctx.lineWidth = 2;
        for (var fx = 0; fx < api.W; fx += 90) { ctx.beginPath(); ctx.moveTo(fx, FLOOR); ctx.lineTo(fx, api.H); ctx.stroke(); }
        ctx.fillStyle = '#c05a8a';
        U.roundRect(ctx, LEFT + 10, FLOOR + 6, RIGHT - LEFT - 20, 26, 12); ctx.fill();
        ctx.strokeStyle = '#ffd6e8'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]);
        U.roundRect(ctx, LEFT + 18, FLOOR + 11, RIGHT - LEFT - 36, 16, 8); ctx.stroke();
        ctx.setLineDash([]);

        drawGiant(ctx);
        items.forEach(function (it) { drawItem(ctx, it); });

        /* a quilted pillow with a button in the middle */
        var sq = pillow.squish > 0 ? pillow.squish : 0;
        U.shadow(ctx, pillow.x, PILLOW_Y + 48, pillow.w * 0.52, 10, 0.35);
        ctx.save();
        ctx.translate(pillow.x, PILLOW_Y + 20);
        ctx.scale(1 + sq * 0.08, 1 - sq * 0.25);
        var pg = ctx.createLinearGradient(0, -20, 0, 24);
        pg.addColorStop(0, '#fff0f6'); pg.addColorStop(1, '#ffc2da');
        ctx.fillStyle = pg;
        U.roundRect(ctx, -pillow.w / 2, -20, pillow.w, 44, 22); ctx.fill();
        ctx.strokeStyle = '#f783ac'; ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = 'rgba(247,131,172,.5)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-pillow.w / 4, -16); ctx.lineTo(-pillow.w / 4, 20); ctx.moveTo(pillow.w / 4, -16); ctx.lineTo(pillow.w / 4, 20); ctx.stroke();
        ctx.fillStyle = '#f06595';
        ctx.beginPath(); ctx.arc(0, 2, 5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        drawMeter(ctx);

        U.badge(ctx, RIGHT, 14, 'Drag the pillow (or ← →)', { align: 'right', size: 17 });
      }

      newRound();
      return { update: update, draw: draw, down: down, move: move, up: up, key: key };
    }
  };
})(window.PH = window.PH || {});
