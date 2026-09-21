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
        var cx = api.W / 2, cy = 400;
        var open = state === 'eat' ? mouth : 0.18 + Math.sin(performance.now() / 700) * 0.05;
        ctx.save();
        ctx.translate(cx, cy);
        if (chew === 1 && state === 'eat') {
          ctx.scale(1 + Math.sin(timer * 22) * 0.04, 1 - Math.sin(timer * 22) * 0.04);
        }
        /* feet */
        ctx.fillStyle = '#6a3fb5';
        ctx.beginPath(); ctx.ellipse(-52, 96, 30, 16, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(52, 96, 30, 16, 0, 0, Math.PI * 2); ctx.fill();
        /* body */
        var g = ctx.createRadialGradient(-30, -40, 20, 0, 0, 120);
        g.addColorStop(0, '#b98cff');
        g.addColorStop(1, '#7b3fe4');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(0, 0, 104, 96, 0, 0, Math.PI * 2); ctx.fill();
        /* horns */
        ctx.fillStyle = '#ffd23f';
        [-60, 60].forEach(function (hx) {
          ctx.beginPath();
          ctx.moveTo(hx - 12, -80); ctx.lineTo(hx, -124); ctx.lineTo(hx + 12, -78);
          ctx.closePath(); ctx.fill();
        });
        /* eyes */
        [-38, 38].forEach(function (ex) {
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(ex, -36, 24, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#1f2340';
          ctx.beginPath(); ctx.arc(ex + 3, -33, 11, 0, Math.PI * 2); ctx.fill();
        });
        /* mouth */
        ctx.fillStyle = '#3a1160';
        ctx.beginPath();
        ctx.ellipse(0, 34, 58, 14 + open * 46, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        for (var i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(i * 20 - 8, 34 - (14 + open * 46));
          ctx.lineTo(i * 20, 34 - (14 + open * 46) + 16);
          ctx.lineTo(i * 20 + 8, 34 - (14 + open * 46));
          ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      }

      function draw(ctx) {
        var bg = ctx.createLinearGradient(0, 0, 0, api.H);
        bg.addColorStop(0, '#fff3d6');
        bg.addColorStop(1, '#ffd9ec');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, api.W, api.H);

        ctx.fillStyle = 'rgba(31,35,64,.55)';
        ctx.font = U.font(26);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(api.pre ? 'Tap the one the monster wants' : 'Tap the chunks in order', api.W / 2, 96);

        drawMonster(ctx);

        /* slots */
        var sx = shake > 0 ? Math.sin(shake * 55) * 9 : 0;
        slots.forEach(function (s) {
          ctx.save();
          ctx.setLineDash([9, 8]);
          ctx.lineWidth = 4;
          ctx.strokeStyle = shake > 0 ? '#ff5d8f' : 'rgba(31,35,64,.35)';
          ctx.fillStyle = 'rgba(255,255,255,.55)';
          U.roundRect(ctx, s.x + sx, s.y, s.w, s.h, 14);
          ctx.fill();
          ctx.stroke();
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
