/* Feed the Monster - hear a word, then build it from sound chunks and feed it in */
(function (PH) {
  'use strict';
  var U = PH.util;

  PH.games.builder = {
    id: 'builder',
    name: 'Feed the Monster',
    icon: '👾',
    blurb: 'Build the word you hear from its sound chunks, then feed it to the hungry monster.',

    create: function (api) {
      var ROUNDS = 6;
      var round = 0, target = null, slots = [], tiles = [], recent = [];
      var hits = 0, misses = 0, state = 'play', timer = 0, shake = 0;
      var mouth = 0, chew = 0;
      var SOUND_BTN = { x: 24, y: api.H - 62, w: 220, h: 46 };

      function allGraphemes() {
        var set = {};
        api.words.forEach(function (w) { w.g.forEach(function (g) { set[g] = 1; }); });
        return Object.keys(set);
      }
      var GRAPHEMES = api.pre ? api.words.map(function (w) { return w.w; }) : allGraphemes();

      /* ages 3 and 4: the whole picture or letter is one chunk - "feed me the apple" */
      function chunks(w) { return api.pre ? [w.w] : w.g; }

      function layout() {
        var ctx = PH.Engine.ctx;
        var fs = 40;
        var widths, total;
        for (;;) {
          ctx.font = U.font(fs);
          widths = chunks(target).map(function (g) {
            return Math.max(fs * 1.7, ctx.measureText(api.label(g)).width + 34);
          });
          total = widths.reduce(function (a, b) { return a + b; }, 0) + (chunks(target).length - 1) * 12;
          if (total <= api.W - 120 || fs <= 22) { break; }
          fs -= 4;
        }
        var h = fs + 44;
        var x = (api.W - total) / 2;
        slots = chunks(target).map(function (g, i) {
          var s = { g: g, x: x, y: 150, w: widths[i], h: h, fs: fs, tile: null };
          x += widths[i] + 12;
          return s;
        });

        /* tiles: the real chunks plus a couple of impostors */
        var extras = U.shuffle(GRAPHEMES.filter(function (g) {
          return chunks(target).indexOf(g) < 0;
        })).slice(0, api.mode === 'pictures' ? 2 : (chunks(target).length > 3 ? 2 : 3));
        var bag = U.shuffle(chunks(target).map(function (g) { return { g: g, real: true }; })
          .concat(extras.map(function (g) { return { g: g, real: false }; })));

        ctx.font = U.font(fs);
        var tw = bag.map(function (b) { return Math.max(fs * 1.7, ctx.measureText(api.label(b.g)).width + 34); });
        var rowTotal = tw.reduce(function (a, b) { return a + b; }, 0) + (bag.length - 1) * 14;
        var tx = (api.W - rowTotal) / 2;
        tiles = bag.map(function (b, i) {
          var t = {
            g: b.g, real: b.real, w: tw[i], h: h, fs: fs,
            x: tx, y: api.H - h - 34, homeX: tx, homeY: api.H - h - 34,
            slot: null, anim: null, wobble: 0
          };
          tx += tw[i] + 14;
          return t;
        });
      }

      function newRound() {
        round++;
        if (round > ROUNDS) {
          var acc = hits + misses ? hits / (hits + misses) : 1;
          api.finish(null, acc);
          state = 'over';
          return;
        }
        var pool = api.words.filter(function (w) {
          return recent.indexOf(w.w) < 0 && w.g.length <= 5;
        });
        target = U.pick(pool.length > 5 ? pool : api.words);
        recent.push(target.w);
        if (recent.length > 5) { recent.shift(); }
        layout();
        mouth = 0; chew = 0; state = 'play';
        api.setProgress(round, ROUNDS);
        api.setPrompt(api.pre ? 'Feed me the' : 'Build the word', { word: target.w, repeat: sayPrompt });
        sayPrompt();
      }

      function sayPrompt() {
        api.say(api.pre ? 'Feed me the' : 'Build the word');
        api.sayWord(target.w, { queue: true });
      }

      function fly(tile, toX, toY, then) {
        tile.anim = { fx: tile.x, fy: tile.y, tx: toX, ty: toY, t: 0, then: then || null };
      }

      function firstEmpty() {
        for (var i = 0; i < slots.length; i++) { if (!slots[i].tile) { return slots[i]; } }
        return null;
      }

      function place(tile) {
        var s = firstEmpty();
        if (!s) { return; }
        s.tile = tile;
        tile.slot = s;
        api.sfx.click();
        if (api.pre) { api.sayWord(tile.g); } else { api.say(PH.soundHint(tile.g), { rate: 0.6 }); }
        fly(tile, s.x, s.y, check);
      }

      function unplace(slot) {
        var t = slot.tile;
        if (!t) { return; }
        slot.tile = null;
        t.slot = null;
        api.sfx.click();
        fly(t, t.homeX, t.homeY);
      }

      function check() {
        if (state !== 'play') { return; }
        for (var i = 0; i < slots.length; i++) { if (!slots[i].tile) { return; } }
        var ok = slots.every(function (s) { return s.tile.g === s.g; });
        if (ok) {
          hits++;
          state = 'eat'; timer = 0;
          api.addStar(1);
          api.sfx.great();
          api.say('Yes!');
          api.sayWord(target.w, { queue: true });
        } else {
          misses++;
          shake = 0.6;
          state = 'wrong'; timer = 0;
          api.sfx.bad();
          api.say('Not quite. Listen again');
          api.sayWord(target.w, { queue: true, rate: 0.6 });
        }
      }

      function down(p) {
        if (p.x >= SOUND_BTN.x && p.x <= SOUND_BTN.x + SOUND_BTN.w &&
            p.y >= SOUND_BTN.y && p.y <= SOUND_BTN.y + SOUND_BTN.h) {
          api.soundOut(target);
          return;
        }
        if (state !== 'play') { return; }
        var i;
        for (i = 0; i < slots.length; i++) {
          var s = slots[i];
          if (s.tile && p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h) {
            unplace(s); return;
          }
        }
        for (i = 0; i < tiles.length; i++) {
          var t = tiles[i];
          if (t.slot || t.anim) { continue; }
          if (p.x >= t.x && p.x <= t.x + t.w && p.y >= t.y && p.y <= t.y + t.h) {
            place(t); return;
          }
        }
      }

      function update(dt) {
        tiles.forEach(function (t) {
          if (t.anim) {
            t.anim.t += dt / 0.22;
            var k = U.clamp(t.anim.t, 0, 1);
            var e = 1 - Math.pow(1 - k, 3);
            t.x = U.lerp(t.anim.fx, t.anim.tx, e);
            t.y = U.lerp(t.anim.fy, t.anim.ty, e);
            if (k >= 1) {
              var then = t.anim.then;
              t.anim = null;
              if (then) { then(); }
            }
          }
        });
        if (shake > 0) { shake -= dt; }

        if (state === 'eat') {
          timer += dt;
          mouth = U.clamp(timer / 0.3, 0, 1);
          if (timer > 0.45) {
            /* tiles dive into the mouth */
            slots.forEach(function (s, i) {
              if (s.tile && !s.tile.eaten) {
                s.tile.eaten = true;
                fly(s.tile, api.W / 2 - s.tile.w / 2, 402);
              }
            });
          }
          if (timer > 0.95 && chew === 0) {
            chew = 1;
            api.sfx.chomp();
            api.burst(api.W / 2, 420, ['#ffd23f', '#ff9f40', '#3ddc84'], 26, { lift: 140 });
          }
          if (timer > 1.9) { newRound(); }
        } else if (state === 'wrong') {
          timer += dt;
          if (timer > 0.75) {
            slots.forEach(function (s) {
              if (s.tile && s.tile.g !== s.g) { unplace(s); }
            });
            state = 'play';
          }
        }
      }

      function drawMonster(ctx) {
        var art = PH.art;
        var cx = api.W / 2, cy = 400;
        var now = performance.now() / 1000;
        var eating = state === 'eat';
        var open = eating ? mouth : 0.18 + Math.sin(now * 1.4) * 0.05;
        var PURPLE = '#8a4cf0';
        ctx.save();
        ctx.translate(cx, cy);
        if (chew === 1 && eating) {
          ctx.scale(1 + Math.sin(timer * 22) * 0.04, 1 - Math.sin(timer * 22) * 0.04);
        } else {
          var br = Math.sin(now * 2) * 0.012;
          ctx.scale(1 + br, 1 - br);
        }
        U.shadow(ctx, 0, 108, 130, 20, 0.3);
        /* feet with little claws */
        [-52, 52].forEach(function (fx) {
          ctx.beginPath(); ctx.ellipse(fx, 96, 30, 16, 0, 0, Math.PI * 2);
          art.fillLit(ctx, '#5a2fa5', 80, 112);
        });
        [-66, -52, -38, 38, 52, 66].forEach(function (tx) {
          ctx.beginPath(); ctx.ellipse(tx, 106, 4.5, 5.5, 0, 0, Math.PI * 2);
          ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = art.INK; ctx.lineWidth = 2; ctx.stroke();
        });
        /* curly horns, behind the head */
        [-1, 1].forEach(function (s) {
          ctx.save(); ctx.translate(s * 60, 0); ctx.scale(s, 1);
          ctx.beginPath();
          ctx.moveTo(-16, -74); ctx.quadraticCurveTo(-4, -112, 14, -132);
          ctx.quadraticCurveTo(26, -124, 18, -114);
          ctx.quadraticCurveTo(12, -96, 16, -72);
          ctx.closePath();
          art.fillLit(ctx, '#ffd166', -132, -72, { lineWidth: 3.5 });
          ctx.strokeStyle = 'rgba(180,110,0,.45)'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(-9, -90); ctx.lineTo(9, -94); ctx.moveTo(-6, -104); ctx.lineTo(10, -108); ctx.stroke();
          ctx.restore();
        });
        /* stubby arms that wave while it eats */
        var wave = eating ? Math.sin(now * 14) * 0.5 : Math.sin(now * 1.5) * 0.12;
        [-1, 1].forEach(function (s) {
          ctx.save(); ctx.translate(s * 96, 10); ctx.rotate(-s * (2.2 + wave));
          U.roundRect(ctx, -14, -8, 28, 60, 14);
          art.fillLit(ctx, PURPLE, -8, 52);
          [-8, 0, 8].forEach(function (c) { art.ball(ctx, c, 52, 5, '#ffffff', { lineWidth: 2, shine: false }); });
          ctx.restore();
        });
        /* furry body: a ring of tufts round the edge */
        ctx.beginPath();
        for (var k = 0; k <= 36; k++) {
          var a = k / 36 * Math.PI * 2;
          var rr = k % 2 ? 1 : 1.06;
          ctx.lineTo(Math.cos(a) * 104 * rr, Math.sin(a) * 96 * rr);
        }
        ctx.closePath();
        var g = ctx.createRadialGradient(-34, -44, 16, 0, 0, 126);
        g.addColorStop(0, '#caa6ff');
        g.addColorStop(0.7, PURPLE);
        g.addColorStop(1, '#6a32c8');
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = art.INK; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.stroke();
        /* a hair tuft on top */
        ctx.beginPath();
        ctx.moveTo(-16, -94); ctx.quadraticCurveTo(-20, -124, -2, -126); ctx.quadraticCurveTo(-8, -110, 4, -104);
        ctx.quadraticCurveTo(10, -128, 26, -120); ctx.quadraticCurveTo(14, -110, 16, -94); ctx.closePath();
        art.fillLit(ctx, PURPLE, -126, -94, { lineWidth: 3.5 });
        ctx.fillStyle = 'rgba(255,255,255,.2)';
        ctx.beginPath(); ctx.ellipse(0, 50, 62, 40, 0, 0, Math.PI * 2); ctx.fill();   /* belly */
        ctx.fillStyle = 'rgba(80,30,160,.3)';
        [[70, -40, 7], [80, -14, 5], [-80, -30, 6], [-74, 40, 5], [66, 50, 4]].forEach(function (sp) {
          ctx.beginPath(); ctx.arc(sp[0], sp[1], sp[2], 0, Math.PI * 2); ctx.fill();
        });
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.beginPath(); ctx.ellipse(-50, -56, 22, 11, -0.6, 0, Math.PI * 2); ctx.fill();   /* shine */
        art.cheeks(ctx, 0, 8, 140, 14, 'rgba(255,120,170,.55)');
        /* big eyes that follow the chunks you tap, under bouncy brows */
        var look = eating ? [0, 0.4] : [Math.sin(now * 0.77) * 0.9, 0.3];
        var bl = eating ? 0 : art.blink(17);
        art.eye(ctx, -38, -36, 24, { iris: '#35c28a', irisSize: 0.62, look: look, blink: bl, lid: PURPLE });
        art.eye(ctx, 38, -36, 24, { iris: '#35c28a', irisSize: 0.62, look: look, blink: bl, lid: PURPLE });
        var up = eating ? -8 : Math.sin(now * 1.1) * 2;
        ctx.strokeStyle = art.INK; ctx.lineWidth = 6; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-56, -72 + up); ctx.quadraticCurveTo(-38, -82 + up, -20, -72 + up);
        ctx.moveTo(56, -72 + up); ctx.quadraticCurveTo(38, -82 + up, 20, -72 + up);
        ctx.stroke();
        /* mouth with teeth and a wiggly tongue */
        var mh = 14 + open * 46;
        ctx.save();
        ctx.beginPath(); ctx.ellipse(0, 34, 58, mh, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#3a1160'; ctx.fill();
        ctx.clip();
        ctx.fillStyle = '#ff7aa2';
        ctx.beginPath(); ctx.ellipse(Math.sin(now * 5) * 6, 34 + mh * 0.75, 30, 16, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        for (var i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(i * 20 - 8, 34 - mh - 2);
          ctx.lineTo(i * 20, 34 - mh + 16);
          ctx.lineTo(i * 20 + 8, 34 - mh - 2);
          ctx.closePath(); ctx.fill();
        }
        [-1, 1].forEach(function (s) {
          ctx.beginPath(); ctx.moveTo(s * 30 - 7, 34 + mh + 2); ctx.lineTo(s * 30, 34 + mh - 13); ctx.lineTo(s * 30 + 7, 34 + mh + 2); ctx.fill();
        });
        ctx.restore();
        ctx.strokeStyle = art.INK; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.ellipse(0, 34, 58, mh, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }


      /* a cosy playroom: striped wallpaper, a window, a toy shelf, a wooden floor and a rug */
      function drawRoom(ctx) {
        var FLOOR = 470;
        ctx.fillStyle = '#ffe8cc';
        ctx.fillRect(0, 0, api.W, FLOOR);
        ctx.fillStyle = '#ffdcb0';
        for (var sx = 0; sx < api.W; sx += 56) { ctx.fillRect(sx, 0, 28, FLOOR); }
        ctx.fillStyle = 'rgba(255,255,255,.45)';
        for (var dy = 30; dy < FLOOR - 20; dy += 60) {
          for (var dx = 14 + (dy / 60 % 2) * 28; dx < api.W; dx += 56) { ctx.beginPath(); ctx.arc(dx, dy, 4, 0, Math.PI * 2); ctx.fill(); }
        }
        /* skirting board */
        ctx.fillStyle = '#e8b27d'; ctx.fillRect(0, FLOOR - 18, api.W, 18);
        ctx.fillStyle = '#c98b52'; ctx.fillRect(0, FLOOR - 4, api.W, 4);
        /* window */
        ctx.fillStyle = '#8b5a2b'; U.roundRect(ctx, 40, 150, 170, 150, 12); ctx.fill();
        var sky = ctx.createLinearGradient(0, 160, 0, 290);
        sky.addColorStop(0, '#74c0fc'); sky.addColorStop(1, '#d0ebff');
        ctx.fillStyle = sky; U.roundRect(ctx, 52, 162, 146, 126, 8); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(110, 210, 16, 0, Math.PI * 2); ctx.arc(128, 214, 12, 0, Math.PI * 2); ctx.arc(94, 216, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#8b5a2b'; ctx.fillRect(122, 162, 6, 126); ctx.fillRect(52, 222, 146, 6);
        ctx.fillStyle = '#ff8fab';
        ctx.beginPath(); ctx.moveTo(30, 140); ctx.quadraticCurveTo(70, 220, 44, 310); ctx.lineTo(30, 310); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(220, 140); ctx.quadraticCurveTo(180, 220, 206, 310); ctx.lineTo(220, 310); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#e8456f'; ctx.fillRect(24, 134, 202, 10);
        /* toy shelf */
        ctx.fillStyle = '#c98b52'; U.roundRect(ctx, 780, 250, 190, 16, 6); ctx.fill();
        ctx.fillStyle = '#a0683a'; ctx.fillRect(800, 266, 10, 20); ctx.fillRect(940, 266, 10, 20);
        ctx.font = '40px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ['🧸', '🚂', '🪀', '🎲'].forEach(function (t, n) { ctx.fillText(t, 812 + n * 44, 250); });
        /* floorboards */
        var fl = ctx.createLinearGradient(0, FLOOR, 0, api.H);
        fl.addColorStop(0, '#d9a066'); fl.addColorStop(1, '#b97a42');
        ctx.fillStyle = fl; ctx.fillRect(0, FLOOR, api.W, api.H - FLOOR);
        ctx.strokeStyle = 'rgba(90,50,20,.25)'; ctx.lineWidth = 2;
        for (var py = FLOOR + 34; py < api.H; py += 34) { ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(api.W, py); ctx.stroke(); }
        for (var px = 60; px < api.W; px += 180) {
          for (var row = 0; row < 5; row++) {
            var ox = px + (row % 2) * 90;
            ctx.beginPath(); ctx.moveTo(ox, FLOOR + row * 34); ctx.lineTo(ox, FLOOR + row * 34 + 34); ctx.stroke();
          }
        }
        /* round rug under the monster */
        ctx.fillStyle = '#74c0fc';
        ctx.beginPath(); ctx.ellipse(api.W / 2, 508, 240, 42, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5; ctx.setLineDash([12, 10]);
        ctx.beginPath(); ctx.ellipse(api.W / 2, 508, 214, 32, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }

      function draw(ctx) {
        drawRoom(ctx);

        U.badge(ctx, api.W / 2, 70, api.pre ? 'Tap the one the monster wants' : 'Tap the chunks in order', { align: 'center' });

        drawMonster(ctx);

        /* slots: little inset trays waiting to be filled */
        var sx = shake > 0 ? Math.sin(shake * 55) * 9 : 0;
        slots.forEach(function (s) {
          ctx.save();
          ctx.fillStyle = 'rgba(80,40,10,.18)';
          U.roundRect(ctx, s.x + sx, s.y, s.w, s.h, 14); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.6)';
          U.roundRect(ctx, s.x + sx, s.y + 5, s.w, s.h - 5, 14); ctx.fill();
          ctx.setLineDash([9, 8]);
          ctx.lineWidth = 4;
          ctx.strokeStyle = shake > 0 ? '#ff5d8f' : 'rgba(120,70,30,.45)';
          U.roundRect(ctx, s.x + sx, s.y, s.w, s.h, 14); ctx.stroke();
          ctx.restore();
        });

        /* tiles */
        tiles.forEach(function (t) {
          if (t.eaten && state === 'eat' && !t.anim) { return; }
          var extra = t.slot ? sx : 0;
          U.tile(ctx, {
            x: t.x + extra, y: t.y, w: t.w, h: t.h, r: 14,
            text: api.label(t.g), fontSize: t.fs,
            fill: t.slot ? '#ffd23f' : '#ffffff',
            textColor: '#1f2340',
            stroke: 'rgba(31,35,64,.16)', lineWidth: 3
          });
        });

        /* sound it out button */
        U.tile(ctx, {
          x: SOUND_BTN.x, y: SOUND_BTN.y, w: SOUND_BTN.w, h: SOUND_BTN.h, r: 22,
          text: '🔊 sound it out', fontSize: 20, fill: '#2ec4b6', textColor: '#ffffff'
        });
      }

      newRound();
      return { update: update, draw: draw, down: down };
    }
  };
})(window.PH = window.PH || {});
