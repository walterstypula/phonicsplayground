/* Space Jumper - a side-scrolling platformer. Run, jump, and head-bump the block with the word you hear */
(function (PH) {
  'use strict';
  var U = PH.util;

  PH.games.space = {
    id: 'space',
    name: 'Space Jumper',
    icon: '🌠',
    blurb: 'Run and jump across the moons like a platform hero. Bump the block with the word you hear to open the star gate!',

    create: function (api) {
      /* ---------------- tuning ---------------- */
      var GROUND = 480;                 /* y of the moon surface */
      var GRAV = 1250, JUMP = -640;     /* a little floaty: we are in space */
      var SPEED = 250;
      var HW = 18, HH = 58;             /* hero half-width and height */
      var SEC_W = 960, START = 320;     /* each question lives in one section of the level */
      var N = api.pre ? 5 : 6;
      var BLOCK_H = 62, BLOCK_Y = GROUND - 180 - BLOCK_H;
      var GAP_W = 110;
      var WORLD_END = START + N * SEC_W + 560;
      var BTN = { left: { x: 78, y: 582, r: 44 }, right: { x: 184, y: 582, r: 44 }, jump: { x: 912, y: 574, r: 54 } };

      var sections = [], grounds = [], gaps = [], gems = [], enemies = [];
      var sec = 0, target = null, recent = [], announced = -1;
      var hits = 0, misses = 0, state = 'play', timer = 0, gemCount = 0;
      var hero = {
        x: 150, y: GROUND, vx: 0, vy: 0, onGround: true, face: 1,
        coyote: 0, buffer: 0, knock: 0, knockVx: 0, run: 0, lastSafe: 150, hidden: false, poof: 0
      };
      var held = { left: false, right: false, jump: false };
      var pointers = {};
      var auto = null;                  /* tap-to-go: { x, jump } */
      var camX = 0;
      var rocket = { x: WORLD_END - 250, launch: -1 };
      var farStars = [], nearStars = [], i;
      for (i = 0; i < 90; i++) { farStars.push({ x: U.rand(0, 2000), y: U.rand(0, GROUND), r: U.rand(0.6, 1.6) }); }
      for (i = 0; i < 40; i++) { nearStars.push({ x: U.rand(0, 1600), y: U.rand(0, GROUND - 60), r: U.rand(1.4, 2.6) }); }

      /* ---------------- world ---------------- */
      function secStart(k) { return START + k * SEC_W; }

      function build() {
        for (var k = 0; k < N; k++) {
          var s0 = secStart(k);
          /* a gap to jump just inside every section after the first - but never for the littlest */
          if (!api.pre && k > 0) { gaps.push({ x1: s0 + 90, x2: s0 + 90 + GAP_W }); }

          var blocks = [320, 560, 800].map(function (cx) {
            return { cx: cx + s0, x: cx + s0 - 55, y: BLOCK_Y, w: 110, h: BLOCK_H, sec: k,
              text: '', right: false, used: false, spent: false, bump: 0, wrong: 0 };
          });
          sections.push({
            s0: s0, blocks: blocks,
            gate: { x: s0 + SEC_W - 26, w: 26, open: false, fade: 0 }
          });

          /* an arc of crystals over the start of the section (over the gap if there is one) */
          for (var g = 0; g < 4; g++) {
            var t = g / 3;
            gems.push({ x: s0 + 95 + t * 110, y: GROUND - 36 - Math.sin(t * Math.PI) * 120, got: false, spin: g });
          }
          /* a friendly blob alien patrolling under the blocks (readers only) */
          if (!api.pre) {
            enemies.push({ x: s0 + 450, min: s0 + 250, max: s0 + SEC_W - 80, dir: -1,
              speed: 38 + api.level.id * 6, dead: 0, wob: U.rand(0, 6) });
          }
        }
        /* ground = the whole strip with the gaps cut out */
        var x = -200;
        gaps.forEach(function (gp) {
          grounds.push({ x: x, y: GROUND, w: gp.x1 - x, h: 400 });
          x = gp.x2;
        });
        grounds.push({ x: x, y: GROUND, w: WORLD_END + 200 - x, h: 400 });
      }

      function groundAt(x) {
        for (var k = 0; k < grounds.length; k++) {
          var gd = grounds[k];
          if (x >= gd.x && x <= gd.x + gd.w) { return true; }
        }
        return false;
      }

      function fillSection(k) {
        var S = sections[k];
        var pool = api.words.filter(function (w) { return recent.indexOf(w.w) < 0; });
        var t = U.pick(pool.length > 6 ? pool : api.words);
        recent.push(t.w);
        if (recent.length > 5) { recent.shift(); }
        var alike = U.shuffle(api.words.filter(function (w) {
          return w.w !== t.w && (w.rime === t.rime || PH.firstSound(w) === PH.firstSound(t));
        }));
        var other = U.shuffle(api.words.filter(function (w) { return w.w !== t.w && alike.indexOf(w) < 0; }));
        var words = U.shuffle([t].concat(alike.slice(0, 1).concat(other).slice(0, 2)));
        var ctx = PH.Engine.ctx;
        S.blocks.forEach(function (b, n) {
          b.text = words[n].w;
          b.right = words[n].w === t.w;
          var shown = api.label(b.text);
          b.fs = api.mode === 'letters' ? 40 : (shown.length > 7 ? 22 : 28);
          ctx.font = U.font(b.fs);
          b.w = Math.max(120, ctx.measureText(shown).width + 40);
          b.x = b.cx - b.w / 2;
        });
        S.target = t;
      }

      function announce(k) {
        announced = k;
        target = sections[k].target;
        api.setProgress(k + 1, N);
        api.setPrompt(api.mode === 'pictures' ? 'Bump the block with the' : 'Bump the block:', { word: target.w, repeat: sayPrompt });
        sayPrompt();
      }

      function sayPrompt() {
        if (!target) { return; }
        api.say(api.mode === 'pictures' ? 'Bump the block with the' : 'Bump the block that says');
        api.sayWord(target.w, { queue: true });
      }

      /* ---------------- blocks ---------------- */
      function bump(b) {
        b.bump = 0.25;
        if (b.used || b.spent || !b.text || b.sec !== sec || state !== 'play') { api.sfx.clank(); return; }
        if (b.right) {
          hits++;
          b.used = true;
          api.addStar(1);
          api.sfx.coins();
          api.burst(b.cx - camX, b.y, ['#ffd23f', '#fff3a0', '#ffffff'], 30, { lift: 260 });
          sections[sec].blocks.forEach(function (o) { if (o !== b) { o.spent = true; } });
          sections[sec].gate.open = true;
          api.say('Yes!');
          api.sayWord(b.text, { queue: true });
          sec++;
          if (sec < N) {
            fillSection(sec);
            api.say('The star gate is open!', { queue: true });
          } else {
            state = 'rocket';
            api.setProgress(N, N);
            api.setPrompt('Run to the rocket!', {});
            api.say('Now run to the rocket!', { queue: true });
          }
        } else {
          misses++;
          b.wrong = 0.6;
          api.sfx.bad();
          api.say(api.mode === 'pictures' ? 'That is a' : 'That says');
          api.sayWord(b.text, { queue: true });
        }
      }

      /* ---------------- input ---------------- */
      function jumpPressed() { hero.buffer = 0.14; }
      function jumpReleased() { if (hero.vy < -280 && !auto) { hero.vy = -280; } }   /* tap = small hop */

      function buttonAt(p) {
        var names = ['left', 'right', 'jump'];
        for (var k = 0; k < names.length; k++) {
          var b = BTN[names[k]];
          if (U.dist(p.x, p.y, b.x, b.y) <= b.r + 10) { return names[k]; }
        }
        return null;
      }

      function down(p) {
        var name = buttonAt(p);
        if (name) {
          pointers[p.id] = name;
          held[name] = true;
          auto = null;
          if (name === 'jump') { jumpPressed(); }
          return;
        }
        if (hero.hidden) { return; }
        /* tap a block: run under it and jump to bump it */
        var wx = p.x + camX;
        for (var s = 0; s < sections.length; s++) {
          var bl = sections[s].blocks;
          for (var k = 0; k < bl.length; k++) {
            var b = bl[k];
            if (wx >= b.x - 10 && wx <= b.x + b.w + 10 && p.y >= b.y - 20 && p.y <= b.y + b.h + 30) {
              auto = { x: b.cx, jump: true };
              return;
            }
          }
        }
        /* tap the astronaut: jump. Tap anywhere else: walk there */
        if (Math.abs(wx - hero.x) < 40 && p.y > hero.y - HH - 20 && p.y < hero.y + 10) { jumpPressed(); return; }
        auto = { x: U.clamp(wx, 30, WORLD_END - 40), jump: false };
      }

      function up(p) {
        var name = pointers[p.id];
        if (name) {
          held[name] = false;
          delete pointers[p.id];
          if (name === 'jump') { jumpReleased(); }
        }
      }

      function key(e) {
        var k = e.key;
        if (k === 'ArrowLeft' || k === 'a') { held.left = true; auto = null; e.preventDefault(); }
        if (k === 'ArrowRight' || k === 'd') { held.right = true; auto = null; e.preventDefault(); }
        if ((k === ' ' || k === 'ArrowUp' || k === 'w') && !e.repeat) { jumpPressed(); e.preventDefault(); }
      }

      function keyUp(e) {
        var k = e.key;
        if (k === 'ArrowLeft' || k === 'a') { held.left = false; }
        if (k === 'ArrowRight' || k === 'd') { held.right = false; }
        if (k === ' ' || k === 'ArrowUp' || k === 'w') { jumpReleased(); }
      }

      /* ---------------- physics ---------------- */
      function solids() {
        var list = grounds.slice();
        sections.forEach(function (S) {
          S.blocks.forEach(function (b) { list.push({ x: b.x, y: b.y, w: b.w, h: b.h, block: b }); });
          if (!S.gate.open) { list.push({ x: S.gate.x, y: -600, w: S.gate.w, h: GROUND + 600 }); }
        });
        return list;
      }

      function overlap(a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      }
      function heroRect() { return { x: hero.x - HW, y: hero.y - HH, w: HW * 2, h: HH }; }

      function physics(dt) {
        var dir = (held.right ? 1 : 0) - (held.left ? 1 : 0);
        var wantJump = false;
        if (auto && !dir) {
          var dx = auto.x - hero.x;
          if (Math.abs(dx) < 8) {
            dir = 0;
            if (auto.jump && hero.onGround) { wantJump = true; }
            if (!auto.jump || wantJump) { auto = null; }
          } else {
            dir = dx > 0 ? 1 : -1;
            /* the autopilot hops over gaps, and over (or onto) blob aliens, by itself */
            if (hero.onGround && !groundAt(hero.x + dir * (HW + 16))) { wantJump = true; }
            if (hero.onGround && enemies.some(function (e) {
              var ahead = (e.x - hero.x) * dir;
              return !e.dead && ahead > 0 && ahead < 110;
            })) { wantJump = true; }
          }
        }
        if (wantJump) { hero.buffer = 0.14; }

        if (hero.knock > 0) {
          hero.knock -= dt;
          hero.vx = hero.knockVx;
        } else {
          hero.vx = dir * SPEED;
          if (dir) { hero.face = dir; }
        }

        /* jump with a little forgiveness either side of the ledge */
        hero.coyote = hero.onGround ? 0.1 : hero.coyote - dt;
        if (hero.buffer > 0) {
          hero.buffer -= dt;
          if (hero.onGround || hero.coyote > 0) {
            hero.vy = JUMP; hero.onGround = false; hero.coyote = 0; hero.buffer = 0;
            api.sfx.hop();
          }
        }

        var list = solids(), r, k, s;
        /* move across, then resolve */
        hero.x += hero.vx * dt;
        hero.x = U.clamp(hero.x, 20, WORLD_END - 30);
        r = heroRect();
        for (k = 0; k < list.length; k++) {
          s = list[k];
          if (overlap(r, s)) {
            if (hero.vx > 0) { hero.x = s.x - HW - 0.01; } else if (hero.vx < 0) { hero.x = s.x + s.w + HW + 0.01; }
            r = heroRect();
          }
        }
        /* then fall, and resolve */
        hero.vy = Math.min(hero.vy + GRAV * dt, 900);
        hero.y += hero.vy * dt;
        hero.onGround = false;
        r = heroRect();
        for (k = 0; k < list.length; k++) {
          s = list[k];
          if (overlap(r, s)) {
            if (hero.vy >= 0) {
              hero.y = s.y; hero.vy = 0; hero.onGround = true;
            } else {
              hero.y = s.y + s.h + HH; hero.vy = 60;
              if (s.block) { bump(s.block); }
            }
            r = heroRect();
          }
        }

        if (hero.onGround && hero.y === GROUND && groundAt(hero.x - HW) && groundAt(hero.x + HW)) {
          hero.lastSafe = hero.x;
        }
        /* fell into a crater: float back up, no harm done */
        if (hero.y > api.H + 60) {
          hero.x = hero.lastSafe; hero.y = GROUND - 220; hero.vy = 0; hero.knock = 0;
          auto = null;
          hero.poof = 0.6;
          api.sfx.whoosh();
          api.say('Whoosh! Back you float.', { rate: 0.95 });
        }
        if (hero.onGround && Math.abs(hero.vx) > 1) { hero.run += dt * 14; }
      }

      function enemiesUpdate(dt) {
        enemies.forEach(function (e) {
          if (e.dead > 0) { e.dead += dt; return; }
          e.wob += dt * 6;
          e.x += e.dir * e.speed * dt;
          if (e.x < e.min || e.x > e.max || !groundAt(e.x + e.dir * 22)) { e.dir *= -1; e.x += e.dir * 2; }
          var er = { x: e.x - 22, y: GROUND - 38, w: 44, h: 38 };
          if (!hero.hidden && overlap(heroRect(), er)) {
            if (hero.vy > 0 && hero.y - er.y < 24) {
              /* stomped: the blob pops into sparkles */
              e.dead = 0.01;
              hero.vy = -430;
              api.sfx.pop();
              api.burst(e.x - camX, GROUND - 20, ['#7cf29a', '#ffffff', '#ffd23f'], 18);
            } else if (hero.knock <= 0) {
              hero.knock = 0.4;
              hero.knockVx = hero.x < e.x ? -300 : 300;
              hero.vy = -320; hero.onGround = false;
              auto = null;
              api.sfx.boing();
            }
          }
        });
      }

      function update(dt) {
        sections.forEach(function (S) {
          S.blocks.forEach(function (b) {
            if (b.bump > 0) { b.bump -= dt; }
            if (b.wrong > 0) { b.wrong -= dt; }
          });
          if (S.gate.open && S.gate.fade < 1) { S.gate.fade += dt * 1.5; }
        });
        if (hero.poof > 0) { hero.poof -= dt; }

        if (!hero.hidden) { physics(dt); }
        enemiesUpdate(dt);

        gems.forEach(function (g) {
          g.spin += dt * 3;
          if (!g.got && !hero.hidden && Math.abs(g.x - hero.x) < 30 && Math.abs(g.y - (hero.y - HH / 2)) < 40) {
            g.got = true; gemCount++;
            api.sfx.good();
            api.burst(g.x - camX, g.y, ['#8ef0ff', '#ffffff', '#c89bff'], 8, { gravity: 200 });
          }
        });

        /* speak the question once the astronaut is in sight of the blocks */
        if (sec < N && announced < sec && hero.x > sections[sec].s0 - 260) { announce(sec); }

        /* camera */
        var want = U.clamp(hero.x - 360, 0, WORLD_END - api.W);
        camX += (want - camX) * Math.min(1, dt * 6);

        /* the rocket home */
        if (state === 'rocket' && !hero.hidden && Math.abs(hero.x - rocket.x) < 46 && hero.onGround) {
          hero.hidden = true; rocket.launch = 0;
          api.sfx.whoosh();
          api.say('Blast off!');
        }
        if (rocket.launch >= 0) {
          rocket.launch += dt;
          if (Math.random() < 0.6) { api.burst(rocket.x - camX, GROUND - 10 - rocket.launch * rocket.launch * 160, ['#ff9f40', '#ffd23f', '#ff5d5d'], 3, { gravity: 300, lift: -120 }); }
          if (rocket.launch > 2.2 && state !== 'over') {
            state = 'over';
            api.finish(null, hits + misses ? hits / (hits + misses) : 1);
          }
        }
      }

      /* ---------------- drawing ---------------- */
      function drawSky(ctx) {
        var g = ctx.createLinearGradient(0, 0, 0, api.H);
        g.addColorStop(0, '#07051a');
        g.addColorStop(0.7, '#1d1450');
        g.addColorStop(1, '#2d1f6b');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, api.W, api.H);
        ctx.fillStyle = '#ffffff';
        farStars.forEach(function (s) {
          var x = ((s.x - camX * 0.15) % 2000 + 2000) % 2000 - 500;
          ctx.globalAlpha = 0.5;
          ctx.fillRect(x, s.y, s.r, s.r);
        });
        nearStars.forEach(function (s) {
          var x = ((s.x - camX * 0.35) % 1600 + 1600) % 1600 - 300;
          ctx.globalAlpha = 0.6 + 0.4 * Math.sin(performance.now() / 500 + s.x);
          ctx.beginPath(); ctx.arc(x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;
        /* a ringed planet and the Earth, drifting slowly */
        var px = 760 - camX * 0.08;
        var pg = ctx.createRadialGradient(px - 30, 140, 10, px, 160, 80);
        pg.addColorStop(0, '#ffb86b'); pg.addColorStop(1, '#c2552b');
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.arc(px, 160, 70, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,220,170,.7)'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.ellipse(px, 160, 118, 24, -0.25, 0, Math.PI * 2); ctx.stroke();
        var ex = 180 - camX * 0.05;
        ctx.fillStyle = '#3d7bff';
        ctx.beginPath(); ctx.arc(ex, 90, 34, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#4fd07a';
        ctx.beginPath(); ctx.ellipse(ex - 8, 84, 14, 9, 0.4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(ex + 14, 100, 9, 6, -0.3, 0, Math.PI * 2); ctx.fill();
      }

      function drawGround(ctx) {
        grounds.forEach(function (gd) {
          var x = gd.x - camX;
          if (x > api.W || x + gd.w < 0) { return; }
          ctx.fillStyle = '#4b3378';
          ctx.fillRect(x, GROUND, gd.w, api.H - GROUND);
          ctx.fillStyle = '#9b7ae0';
          ctx.fillRect(x, GROUND, gd.w, 10);
          ctx.fillStyle = 'rgba(0,0,0,.18)';
          for (var cx = Math.ceil(gd.x / 140) * 140; cx < gd.x + gd.w - 30; cx += 140) {
            ctx.beginPath(); ctx.ellipse(cx - camX + 40, GROUND + 50 + (cx % 3) * 18, 26, 9, 0, 0, Math.PI * 2); ctx.fill();
          }
        });
      }

      function drawBlock(ctx, b) {
        var x = b.x - camX;
        if (x > api.W + 20 || x + b.w < -20) { return; }
        var y = b.y - (b.bump > 0 ? Math.sin(b.bump / 0.25 * Math.PI) * 12 : 0);
        var dx = b.wrong > 0 ? Math.sin(b.wrong * 50) * 5 : 0;
        ctx.save();
        ctx.translate(dx, 0);
        var dead = b.used || b.spent;
        ctx.fillStyle = 'rgba(0,0,0,.25)';
        U.roundRect(ctx, x + 4, y + 6, b.w, b.h, 10); ctx.fill();
        ctx.fillStyle = dead ? '#7a5a3a' : (b.wrong > 0 ? '#ff8fa8' : '#ffcc33');
        U.roundRect(ctx, x, y, b.w, b.h, 10); ctx.fill();
        ctx.strokeStyle = dead ? '#5a3f26' : '#d99a00'; ctx.lineWidth = 4; ctx.stroke();
        ctx.fillStyle = dead ? '#5a3f26' : '#b37a00';
        [[8, 8], [b.w - 12, 8], [8, b.h - 12], [b.w - 12, b.h - 12]].forEach(function (p) {
          ctx.fillRect(x + p[0], y + p[1], 4, 4);
        });
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (b.used) {
          ctx.fillStyle = '#ffd23f';
          U.star(ctx, x + b.w / 2, y + b.h / 2, 20, 9); ctx.fill();
        } else if (b.text && !b.spent) {
          ctx.fillStyle = '#fffaf0';
          U.roundRect(ctx, x + 10, y + 9, b.w - 20, b.h - 18, 8); ctx.fill();
          ctx.fillStyle = '#1f2340';
          ctx.font = U.font(b.fs);
          ctx.fillText(api.label(b.text), x + b.w / 2, y + b.h / 2 + 1);
        } else if (!b.spent) {
          ctx.fillStyle = '#ffffff';
          ctx.font = U.font(38);
          ctx.fillText('?', x + b.w / 2, y + b.h / 2 + 2);
        }
        ctx.restore();
      }

      function drawGate(ctx, gate) {
        var x = gate.x - camX;
        if (x > api.W + 20 || x < -40 || gate.fade >= 1) { return; }
        var a = 1 - gate.fade;
        var t = performance.now() / 1000;
        ctx.save();
        ctx.globalAlpha = a;
        var g = ctx.createLinearGradient(x, 0, x + gate.w, 0);
        g.addColorStop(0, 'rgba(90,200,255,.15)');
        g.addColorStop(0.5, 'rgba(140,230,255,.75)');
        g.addColorStop(1, 'rgba(90,200,255,.15)');
        ctx.fillStyle = g;
        ctx.fillRect(x, 0, gate.w, GROUND);
        ctx.fillStyle = 'rgba(255,255,255,.8)';
        for (var y = (t * 120) % 40; y < GROUND; y += 40) { ctx.fillRect(x + 6, y, gate.w - 12, 4); }
        ctx.fillStyle = '#6d5a9e';
        ctx.fillRect(x - 6, GROUND - 16, gate.w + 12, 16);
        ctx.restore();
      }

      function drawGem(ctx, g) {
        if (g.got) { return; }
        var x = g.x - camX, y = g.y + Math.sin(g.spin) * 4;
        if (x < -20 || x > api.W + 20) { return; }
        var w = 10 + Math.abs(Math.cos(g.spin)) * 6;
        ctx.fillStyle = '#8ef0ff';
        ctx.beginPath();
        ctx.moveTo(x, y - 14); ctx.lineTo(x + w, y); ctx.lineTo(x, y + 14); ctx.lineTo(x - w, y);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x + w * 0.4, y - 2); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
      }

      function drawEnemy(ctx, e) {
        var x = e.x - camX;
        if (x < -40 || x > api.W + 40) { return; }
        if (e.dead > 0) {
          if (e.dead > 0.3) { return; }
          ctx.fillStyle = '#5ed17c';
          ctx.beginPath(); ctx.ellipse(x, GROUND - 6, 26, 6, 0, 0, Math.PI * 2); ctx.fill();
          return;
        }
        var sq = Math.sin(e.wob) * 3;
        ctx.fillStyle = '#5ed17c';
        ctx.beginPath(); ctx.ellipse(x, GROUND - 20 + sq * 0.3, 24 - sq * 0.5, 20 + sq * 0.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#3f9c5a'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x, GROUND - 40); ctx.lineTo(x + e.dir * 6, GROUND - 56); ctx.stroke();
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath(); ctx.arc(x + e.dir * 6, GROUND - 58, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(x + e.dir * 6, GROUND - 24, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1f2340';
        ctx.beginPath(); ctx.arc(x + e.dir * 9, GROUND - 24, 4.5, 0, Math.PI * 2); ctx.fill();
      }

      function drawRocket(ctx) {
        var x = rocket.x - camX;
        if (x < -120 || x > api.W + 120) { return; }
        var lift = rocket.launch > 0 ? rocket.launch * rocket.launch * 160 : 0;
        var y = GROUND - lift;
        ctx.save();
        ctx.translate(x, y);
        if (rocket.launch > 0 || state === 'rocket') {
          var fl = rocket.launch > 0 ? 1 : 0.35 + Math.sin(performance.now() / 80) * 0.1;
          ctx.fillStyle = '#ff9f40';
          ctx.beginPath(); ctx.moveTo(-18, -20); ctx.lineTo(0, -20 + 70 * fl); ctx.lineTo(18, -20); ctx.fill();
          ctx.fillStyle = '#ffd23f';
          ctx.beginPath(); ctx.moveTo(-9, -20); ctx.lineTo(0, -20 + 40 * fl); ctx.lineTo(9, -20); ctx.fill();
        }
        ctx.fillStyle = '#ff5d5d';
        ctx.beginPath(); ctx.moveTo(-34, -20); ctx.lineTo(-26, -70); ctx.lineTo(-22, -20); ctx.fill();
        ctx.beginPath(); ctx.moveTo(34, -20); ctx.lineTo(26, -70); ctx.lineTo(22, -20); ctx.fill();
        ctx.fillStyle = '#f2f4ff';
        ctx.beginPath();
        ctx.moveTo(0, -190); ctx.quadraticCurveTo(34, -120, 28, -20); ctx.lineTo(-28, -20); ctx.quadraticCurveTo(-34, -120, 0, -190);
        ctx.fill();
        ctx.fillStyle = '#ff5d5d';
        ctx.beginPath(); ctx.moveTo(0, -190); ctx.quadraticCurveTo(18, -165, 22, -150); ctx.lineTo(-22, -150); ctx.quadraticCurveTo(-18, -165, 0, -190); ctx.fill();
        ctx.fillStyle = '#4d8dff';
        ctx.beginPath(); ctx.arc(0, -110, 15, 0, Math.PI * 2); ctx.fill();
        if (hero.hidden) {
          ctx.fillStyle = '#ffd9b3';
          ctx.beginPath(); ctx.arc(0, -108, 8, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }

      function drawHero(ctx) {
        if (hero.hidden) { return; }
        var x = hero.x - camX, y = hero.y;
        var stride = hero.onGround && Math.abs(hero.vx) > 1 ? Math.sin(hero.run) : 0;
        ctx.save();
        if (hero.poof > 0) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(hero.poof * 30); }
        ctx.translate(x, y);
        ctx.scale(hero.face, 1);
        /* legs */
        ctx.fillStyle = '#dfe6f5';
        ctx.save(); ctx.translate(-7, -18); ctx.rotate(stride * 0.5); U.roundRect(ctx, -6, 0, 12, 18, 5); ctx.fill(); ctx.restore();
        ctx.save(); ctx.translate(7, -18); ctx.rotate(-stride * 0.5); U.roundRect(ctx, -6, 0, 12, 18, 5); ctx.fill(); ctx.restore();
        /* backpack + body */
        ctx.fillStyle = '#b8c2d9';
        U.roundRect(ctx, -24, -46, 12, 26, 5); ctx.fill();
        ctx.fillStyle = '#ffffff';
        U.roundRect(ctx, -16, -48, 32, 32, 10); ctx.fill();
        ctx.fillStyle = '#ff5d8f';
        ctx.fillRect(-6, -38, 12, 8);
        /* arm */
        ctx.fillStyle = '#f2f4ff';
        ctx.save(); ctx.translate(4, -42); ctx.rotate(hero.onGround ? -stride * 0.6 : -1.2); U.roundRect(ctx, -4, 0, 9, 18, 4); ctx.fill(); ctx.restore();
        /* helmet */
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(0, -62, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2b3a67';
        ctx.beginPath(); ctx.ellipse(5, -62, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd9b3';
        ctx.beginPath(); ctx.ellipse(6, -61, 8, 7, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1f2340';
        ctx.beginPath(); ctx.arc(9, -63, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.beginPath(); ctx.ellipse(1, -67, 4, 2.5, -0.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      function drawButtons(ctx) {
        var names = ['left', 'right', 'jump'];
        names.forEach(function (n) {
          var b = BTN[n];
          ctx.fillStyle = held[n] ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.22)';
          ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 3; ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          if (n === 'left') { ctx.moveTo(b.x - 16, b.y); ctx.lineTo(b.x + 12, b.y - 18); ctx.lineTo(b.x + 12, b.y + 18); }
          if (n === 'right') { ctx.moveTo(b.x + 16, b.y); ctx.lineTo(b.x - 12, b.y - 18); ctx.lineTo(b.x - 12, b.y + 18); }
          if (n === 'jump') { ctx.moveTo(b.x, b.y - 22); ctx.lineTo(b.x + 22, b.y + 10); ctx.lineTo(b.x - 22, b.y + 10); }
          ctx.closePath(); ctx.fill();
        });
      }

      function draw(ctx) {
        drawSky(ctx);
        drawGround(ctx);
        sections.forEach(function (S) { drawGate(ctx, S.gate); });
        gems.forEach(function (g) { drawGem(ctx, g); });
        sections.forEach(function (S) { S.blocks.forEach(function (b) { drawBlock(ctx, b); }); });
        enemies.forEach(function (e) { drawEnemy(ctx, e); });
        drawRocket(ctx);
        drawHero(ctx);
        drawButtons(ctx);

        ctx.fillStyle = 'rgba(31,35,64,.6)';
        U.roundRect(ctx, 14, 14, 128, 42, 14); ctx.fill();
        ctx.fillStyle = '#8ef0ff';
        ctx.beginPath(); ctx.moveTo(38, 23); ctx.lineTo(48, 35); ctx.lineTo(38, 47); ctx.lineTo(28, 35); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = U.font(24);
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText('x ' + gemCount, 58, 36);
      }

      build();
      fillSection(0);
      api.setProgress(1, N);
      return { update: update, draw: draw, down: down, up: up, key: key, keyUp: keyUp,
        /* read-only peek at the state, used by automated play-through checks */
        debug: function () { return { hero: hero, camX: camX, sec: sec, state: state }; } };
    }
  };
})(window.PH = window.PH || {});
