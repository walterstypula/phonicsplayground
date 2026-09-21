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
        var t = performance.now() / 1000;
        var breathe = Math.sin(t * 1.3) * 5;
        /* bed */
        ctx.fillStyle = '#7a4a2b';
        U.roundRect(ctx, 6, 330, 30, 300, 10); ctx.fill();
        ctx.fillStyle = '#ffffff';
        U.roundRect(ctx, 40, 440, 150, 70, 30); ctx.fill();   /* pillow */
        /* blanket body */
        ctx.fillStyle = '#4d8dff';
        ctx.beginPath();
        ctx.moveTo(40, api.H);
        ctx.quadraticCurveTo(60, 480 - breathe, 200, 490 - breathe);
        ctx.quadraticCurveTo(300, 500, 310, api.H);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.25)';
        for (var s = 0; s < 4; s++) { ctx.fillRect(60 + s * 60, 520, 24, 120); }
        /* head */
        var shake = giantT > 0 ? Math.sin(giantT * 40) * 4 : 0;
        var hx = 120 + shake, hy = 420;
        ctx.fillStyle = '#f2c29b';
        ctx.beginPath(); ctx.ellipse(hx, hy, 78, 70, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e7a57c';
        ctx.beginPath(); ctx.ellipse(hx + 6, hy + 8, 16, 12, 0, 0, Math.PI * 2); ctx.fill();   /* nose */
        /* nightcap */
        ctx.fillStyle = '#ff5d8f';
        ctx.beginPath();
        ctx.moveTo(hx - 76, hy - 26); ctx.quadraticCurveTo(hx - 10, hy - 140, hx + 90, hy - 90);
        ctx.lineTo(hx + 70, hy - 30); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(hx + 92, hy - 92, 14, 0, Math.PI * 2); ctx.fill();
        /* eyes and mouth */
        ctx.strokeStyle = '#5a3a2a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        if (state === 'awake') {
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(hx - 26, hy - 14, 14, 0, Math.PI * 2); ctx.arc(hx + 30, hy - 14, 14, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#1f2340';
          ctx.beginPath(); ctx.arc(hx - 22, hy - 12, 6, 0, Math.PI * 2); ctx.arc(hx + 34, hy - 12, 6, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#7a2b2b';
          ctx.beginPath(); ctx.ellipse(hx + 4, hy + 34, 20, 14, 0, 0, Math.PI * 2); ctx.fill();
        } else {
          var peek = giantT > 0 ? 0.5 : 0;
          ctx.beginPath(); ctx.arc(hx - 26, hy - 16, 12, 0.1 * Math.PI - peek, 0.9 * Math.PI + peek); ctx.stroke();
          ctx.beginPath(); ctx.arc(hx + 30, hy - 16, 12, 0.1 * Math.PI - peek, 0.9 * Math.PI + peek); ctx.stroke();
          ctx.beginPath(); ctx.arc(hx + 4, hy + 30, 10 + breathe * 0.6, 0, Math.PI * 2); ctx.stroke();
        }
        /* Zs or a grumpy bubble */
        if (state === 'awake') {
          ctx.fillStyle = '#fff';
          U.roundRect(ctx, 30, 250, 250, 70, 24); ctx.fill();
          ctx.beginPath(); ctx.moveTo(120, 318); ctx.lineTo(110, 350); ctx.lineTo(150, 318); ctx.fill();
          ctx.fillStyle = '#1f2340';
          ctx.font = U.font(28);
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText("WHO'S THERE?!", 155, 286);
        } else {
          zs.forEach(function (z) {
            ctx.globalAlpha = U.clamp(1 - z.age / 3, 0, 1);
            ctx.fillStyle = '#9b5de5';
            ctx.font = U.font(22 + z.age * 10);
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
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
