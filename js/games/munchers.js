/* Word Munchers - walk the grid and munch every word that fits the rule; dodge the Troggle */
(function (PH) {
  'use strict';
  var U = PH.util;

  PH.games.munchers = {
    id: 'munchers',
    name: 'Word Munchers',
    icon: '😋',
    blurb: 'Walk your Muncher around the grid and gobble every word that fits the rule. Watch out for the Troggle!',

    create: function (api) {
      var ROUNDS = 4, COLS = 5, ROWS = 4;
      var GX = 30, GY = 82, CW = (api.W - 60) / COLS, CH = (api.H - GY - 20) / ROWS;
      var round = 0, rule = null, cells = [], usedRules = [];
      var hits = 0, misses = 0, state = 'play', timer = 0;
      var me = { c: 0, r: 0, dx: 0, dy: 0, path: [], stepT: 0, munch: 0, sick: 0, safe: 0 };
      var trog = null;
      var trogEvery = [0, 0, 1.9, 1.6, 1.4, 1.2][api.level.id] || 0;   /* 0 = no troggle */


      function cellXY(c, r) { return { x: GX + c * CW + CW / 2, y: GY + r * CH + CH / 2 }; }

      function newRound() {
        round++;
        if (round > ROUNDS) {
          api.finish(null, hits + misses ? hits / (hits + misses) : 1);
          state = 'over';
          return;
        }
        rule = PH.rules.pick(api, usedRules, 'Munch');
        usedRules.push(rule.key);

        var source = rule.source;
        var yes = U.shuffle(source.filter(function (w) { return rule.test(w); }));
        var no = U.shuffle(PH.rules.nonMatches(api, rule));
        var nYes = Math.min(yes.length, U.randInt(5, 7));
        var list = yes.slice(0, nYes);
        /* a letter rule has one matching item, so scatter several copies of it */
        if (rule.single) { list = []; for (var c5 = U.randInt(5, 6); c5 > 0; c5--) { list.push(yes[0]); } }
        for (var i = 0; list.length < COLS * ROWS && i < no.length; i++) { list.push(no[i]); }
        list = U.shuffle(list);
        cells = [];
        for (var k = 0; k < COLS * ROWS; k++) {
          var w = list[k];
          cells.push(w ? { word: w, match: rule.test(w), eaten: false, wobble: 0 } : null);
        }
        me.c = 0; me.r = 0; me.dx = 0; me.dy = 0; me.path = [];
        if (trogEvery) { trog = { c: COLS - 1, r: ROWS - 1, t: 0, wait: 3, drawX: 0, drawY: 0 }; }
        state = 'play';
        api.setProgress(round, ROUNDS);
        api.setPrompt(rule.label, { word: rule.show, show: true, repeat: rule.say });
        rule.say();
      }

      function left() {
        return cells.filter(function (c) { return c && c.match && !c.eaten; }).length;
      }

      /* ---- actions ---- */
      function munch() {
        if (state !== 'play' || me.sick > 0) { return; }
        var cell = cells[me.r * COLS + me.c];
        me.munch = 0.35;
        api.sfx.chomp();
        if (!cell || cell.eaten) { return; }
        if (cell.match) {
          cell.eaten = true;
          hits++;
          api.addStar(1);
          var p = cellXY(me.c, me.r);
          api.burst(p.x, p.y, null, 14);
          if (left() === 0) {
            state = 'between'; timer = 0;
            api.sfx.great();
            api.say('Yum! All gone!');
          }
        } else {
          misses++;
          cell.wobble = 0.5;
          me.sick = 0.9;
          api.sfx.bad();
          api.say('Yuck!');
          api.sayWord(cell.word.w, { queue: true });
          api.say('does not fit', { queue: true });
        }
      }

      function walkTo(c, r, thenMunch) {
        me.path = [];
        var cc = me.c, rr = me.r;
        while (cc !== c) { cc += cc < c ? 1 : -1; me.path.push({ c: cc, r: rr }); }
        while (rr !== r) { rr += rr < r ? 1 : -1; me.path.push({ c: cc, r: rr }); }
        me.munchAtEnd = thenMunch;
        if (!me.path.length && thenMunch) { munch(); }
      }

      function down(p) {
        if (state !== 'play') { return; }
        var c = Math.floor((p.x - GX) / CW), r = Math.floor((p.y - GY) / CH);
        if (c < 0 || r < 0 || c >= COLS || r >= ROWS) { return; }
        walkTo(c, r, true);
      }

      function key(e) {
        if (state !== 'play') { return; }
        var k = e.key;
        var dc = k === 'ArrowLeft' ? -1 : (k === 'ArrowRight' ? 1 : 0);
        var dr = k === 'ArrowUp' ? -1 : (k === 'ArrowDown' ? 1 : 0);
        if (dc || dr) {
          e.preventDefault();
          me.path = [];
          step(U.clamp(me.c + dc, 0, COLS - 1), U.clamp(me.r + dr, 0, ROWS - 1));
        }
        if (k === ' ' || k === 'Enter') { e.preventDefault(); munch(); }
      }

      function step(c, r) {
        me.dx = (me.c - c) * CW; me.dy = (me.r - r) * CH;   /* offset eases back to zero */
        me.c = c; me.r = r;
        caught();
      }

      function caught() {
        if (!trog || me.safe > 0) { return; }
        if (trog.c === me.c && trog.r === me.r) {
          api.sfx.boing();
          api.say('Boing! The Troggle bumped you!');
          me.path = [];
          me.c = 0; me.r = 0; me.dx = 0; me.dy = 0;
          me.safe = 2;
        }
      }

      function update(dt) {
        me.dx *= Math.pow(0.0005, dt); me.dy *= Math.pow(0.0005, dt);
        if (me.munch > 0) { me.munch -= dt; }
        if (me.sick > 0) { me.sick -= dt; }
        if (me.safe > 0) { me.safe -= dt; }
        cells.forEach(function (c) { if (c && c.wobble > 0) { c.wobble -= dt; } });

        if (state === 'play' && me.path.length && me.sick <= 0) {
          me.stepT -= dt;
          if (me.stepT <= 0) {
            var nx = me.path.shift();
            step(nx.c, nx.r);
            me.stepT = 0.14;
            if (!me.path.length && me.munchAtEnd) { munch(); }
          }
        }

        if (trog && state === 'play') {
          trog.drawX *= Math.pow(0.001, dt); trog.drawY *= Math.pow(0.001, dt);
          trog.wait -= dt;
          if (trog.wait <= 0) {
            trog.wait = trogEvery;
            var moves = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(function (m) {
              var c = trog.c + m[0], r = trog.r + m[1];
              return c >= 0 && r >= 0 && c < COLS && r < ROWS;
            });
            /* mostly wanders, sometimes drifts toward the muncher */
            var mv = Math.random() < 0.35
              ? moves.sort(function (a, b) {
                return (Math.abs(trog.c + a[0] - me.c) + Math.abs(trog.r + a[1] - me.r)) -
                  (Math.abs(trog.c + b[0] - me.c) + Math.abs(trog.r + b[1] - me.r));
              })[0]
              : U.pick(moves);
            trog.drawX = -mv[0] * CW; trog.drawY = -mv[1] * CH;
            trog.c += mv[0]; trog.r += mv[1];
            caught();
          }
        }

        if (state === 'between') {
          timer += dt;
          if (timer > 1.4) { newRound(); }
        }
      }

      function drawMuncher(ctx) {
        var art = PH.art;
        var p = cellXY(me.c, me.r);
        var x = p.x + me.dx, y = p.y + me.dy;
        var t = performance.now() / 1000;
        var open = me.munch > 0 ? Math.sin((0.35 - me.munch) / 0.35 * Math.PI * 3) * 0.5 + 0.5 : 0.1;
        var sick = me.sick > 0;
        var green = sick ? '#b5c95e' : '#3ddc84';
        var bounce = Math.abs(Math.sin(t * 3)) * 3;
        U.shadow(ctx, x, y + 46, 50, 10, 0.4);
        ctx.save();
        ctx.translate(x, y - bounce);
        if (me.sick > 0) { ctx.rotate(Math.sin(me.sick * 30) * 0.15); }
        if (me.safe > 0 && Math.floor(me.safe * 8) % 2) { ctx.globalAlpha = 0.45; }
        /* little feet */
        [-22, 22].forEach(function (fx) {
          ctx.beginPath(); ctx.ellipse(fx, 42 + bounce, 13, 7, 0, 0, Math.PI * 2);
          art.fillLit(ctx, U.shade(green, -0.2), 35, 50, { lineWidth: 2.5 });
        });
        /* the round body */
        ctx.beginPath(); ctx.ellipse(0, 6, 46, 40, 0, 0, Math.PI * 2);
        art.fillLit(ctx, green, -34, 46, { light: 0.35, dark: -0.3 });
        ctx.fillStyle = 'rgba(255,255,255,.4)';
        ctx.beginPath(); ctx.ellipse(-22, -10, 12, 7, -0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(20,110,60,.25)';
        [[26, -4, 4], [32, 8, 3], [-30, 16, 3.5]].forEach(function (s) { ctx.beginPath(); ctx.arc(s[0], s[1], s[2], 0, Math.PI * 2); ctx.fill(); });
        /* frog-like eye bumps */
        [-18, 18].forEach(function (ex) {
          ctx.beginPath(); ctx.arc(ex, -30, 16, 0, Math.PI * 2);
          art.fillLit(ctx, green, -46, -14);
          art.eye(ctx, ex, -31, 10.5, {
            iris: sick ? '#7a8a2a' : '#2e6fd9', blink: art.blink(7), lid: green,
            sleepy: sick ? 0.45 : 0, look: [0.3, 0.2]
          });
        });
        /* a curly hair tuft */
        ctx.strokeStyle = art.INK; ctx.lineWidth = 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0, -30); ctx.quadraticCurveTo(-4, -44, 6, -46); ctx.quadraticCurveTo(12, -42, 6, -38); ctx.stroke();
        art.cheeks(ctx, 0, 6, 66, 8, 'rgba(255,95,150,.7)');
        /* the big munching mouth with teeth and a tongue */
        var mh = 6 + open * 18;
        ctx.save();
        ctx.beginPath(); ctx.ellipse(0, 14, 30, mh, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#5a1d34'; ctx.fill();
        ctx.clip();
        ctx.fillStyle = '#ffffff';
        for (var tt = -2; tt <= 2; tt++) {
          ctx.beginPath(); ctx.moveTo(tt * 10 - 5, 14 - mh); ctx.lineTo(tt * 10, 14 - mh + 8); ctx.lineTo(tt * 10 + 5, 14 - mh); ctx.fill();
        }
        ctx.fillStyle = '#ff7aa2';
        ctx.beginPath(); ctx.ellipse(0, 14 + mh * 0.7, 16, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = art.INK; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, 14, 30, mh, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
      }

      function drawTroggle(ctx) {
        if (!trog) { return; }
        var art = PH.art;
        var t = performance.now() / 1000;
        var p = cellXY(trog.c, trog.r);
        var x = p.x + trog.drawX, y = p.y + trog.drawY + Math.sin(t * 6.7) * 3;
        U.shadow(ctx, x, p.y + trog.drawY + 40, 42, 9, 0.4);
        ctx.save();
        ctx.translate(x, y);
        /* little horns */
        [-1, 1].forEach(function (s) {
          ctx.beginPath();
          ctx.moveTo(s * 14, -34); ctx.quadraticCurveTo(s * 30, -52, s * 26, -62); ctx.quadraticCurveTo(s * 34, -44, s * 28, -28);
          ctx.closePath();
          art.fillLit(ctx, '#ffe0a3', -62, -28, { lineWidth: 2.5 });
        });
        /* a wobbly ghost-like body with a zigzag hem */
        var w = Math.sin(t * 8) * 3;
        ctx.beginPath();
        ctx.moveTo(-38, 34);
        ctx.quadraticCurveTo(-46, -42, 0, -42);
        ctx.quadraticCurveTo(46, -42, 38, 34);
        for (var i = 0; i < 4; i++) { ctx.lineTo(28 - i * 19 + w * (i % 2 ? 1 : -1), 24 + (i % 2) * 10); }
        ctx.closePath();
        art.fillLit(ctx, '#9b5de5', -42, 34, { light: 0.3, dark: -0.3 });
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        ctx.beginPath(); ctx.ellipse(-18, -26, 10, 6, -0.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(60,20,120,.3)';
        [[22, -14, 5], [-26, 10, 4], [18, 16, 3]].forEach(function (s) { ctx.beginPath(); ctx.arc(s[0], s[1], s[2], 0, Math.PI * 2); ctx.fill(); });
        /* cheeky eyes under grumpy brows */
        art.eye(ctx, -13, -12, 10, { iris: '#ff9f40', lid: '#9b5de5', blink: art.blink(9), look: [0.3, 0.3] });
        art.eye(ctx, 13, -12, 10, { iris: '#ff9f40', lid: '#9b5de5', blink: art.blink(9), look: [0.3, 0.3] });
        ctx.strokeStyle = art.INK; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-25, -30); ctx.lineTo(-6, -23); ctx.moveTo(25, -30); ctx.lineTo(6, -23); ctx.stroke();
        /* a toothy grin */
        ctx.beginPath(); ctx.moveTo(-14, 8); ctx.quadraticCurveTo(0, 20, 14, 8); ctx.quadraticCurveTo(0, 14, -14, 8); ctx.closePath();
        ctx.fillStyle = '#4a1d5e'; ctx.fill(); ctx.lineWidth = 2.5; ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.moveTo(-9, 10); ctx.lineTo(-6, 16); ctx.lineTo(-3, 11); ctx.fill();
        ctx.beginPath(); ctx.moveTo(3, 11); ctx.lineTo(6, 16); ctx.lineTo(9, 10); ctx.fill();
        ctx.restore();
      }

      function draw(ctx) {
        var now = performance.now() / 1000;
        /* a glowing arcade board */
        var bg = ctx.createRadialGradient(api.W / 2, api.H / 2, 60, api.W / 2, api.H / 2, 640);
        bg.addColorStop(0, '#2f3d8a');
        bg.addColorStop(1, '#141a45');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, api.W, api.H);
        ctx.strokeStyle = 'rgba(120,160,255,.08)'; ctx.lineWidth = 1;
        for (var gx = 0; gx < api.W; gx += 32) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, api.H); ctx.stroke(); }
        for (var gy = 0; gy < api.H; gy += 32) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(api.W, gy); ctx.stroke(); }

        /* the rule on a yellow banner, and how many are left on a badge */
        if (rule) {
          ctx.font = U.font(24);
          var lab = rule.label + ':  ';
          var lw = ctx.measureText(lab).width;
          ctx.font = U.font(32);
          var sw = ctx.measureText(api.label(rule.show)).width;
          U.plate(ctx, 24, 14, lw + sw + 36, 52, { fill: '#ffd43b', r: 18 });
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillStyle = '#5c3b00'; ctx.font = U.font(24);
          ctx.fillText(lab, 42, 41);
          ctx.fillStyle = '#1f2340'; ctx.font = U.font(32);
          ctx.fillText(api.label(rule.show), 42 + lw, 40);
        }
        U.badge(ctx, api.W - 24, 19, 'Left to munch: ' + left(), { align: 'right', icon: '😋' });

        for (var r = 0; r < ROWS; r++) {
          for (var c = 0; c < COLS; c++) {
            var cell = cells[r * COLS + c];
            var x = GX + c * CW, y = GY + r * CH;
            var here = me.c === c && me.r === r;
            if (cell && !cell.eaten) {
              var dx = cell.wobble > 0 ? Math.sin(cell.wobble * 50) * 6 : 0;
              var fill = cell.wobble > 0 ? '#ffc9d6' : (here ? '#ffe066' : '#e7f0ff');
              U.plate(ctx, x + 8 + dx, y + 6, CW - 16, CH - 20, { fill: fill, r: 16 });
              if (!here) {
                var t = api.label(cell.word.w);
                ctx.fillStyle = '#1f2340';
                ctx.font = U.font(api.mode === 'letters' ? 46 : (t.length > 7 ? 24 : 30));
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText(t, x + CW / 2 + dx, y + CH / 2 - 3);
              }
            } else {
              /* an empty, already-munched hole in the board */
              ctx.fillStyle = 'rgba(0,0,20,.35)';
              U.roundRect(ctx, x + 8, y + 8, CW - 16, CH - 20, 16); ctx.fill();
              ctx.strokeStyle = here ? 'rgba(255,224,102,.8)' : 'rgba(140,170,255,.25)'; ctx.lineWidth = 2;
              U.roundRect(ctx, x + 8, y + 8, CW - 16, CH - 20, 16); ctx.stroke();
            }
          }
        }
        /* a little sparkle drifting over the board */
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        for (var s = 0; s < 6; s++) {
          var sx = (s * 173 + now * 30) % api.W, sy = 80 + (s * 97) % 540;
          U.star(ctx, sx, sy, 3 + Math.sin(now * 3 + s) * 1.5, 1.2); ctx.fill();
        }
        drawTroggle(ctx);
        drawMuncher(ctx);

        /* the muncher hides its own cell, so show that word on a tag above it */
        var mine = cells[me.r * COLS + me.c];
        if (mine && !mine.eaten) {
          var p = cellXY(me.c, me.r);
          var tx = p.x + me.dx, ty = p.y + me.dy - CH / 2 + 14;
          var mineText = api.label(mine.word.w);
          ctx.font = U.font(mineText.length > 7 ? 22 : 26);
          var tw = ctx.measureText(mineText).width + 24;
          ctx.fillStyle = mine.wobble > 0 ? '#ff5d8f' : '#ffd23f';
          U.roundRect(ctx, tx - tw / 2, ty - 16, tw, 34, 12); ctx.fill();
          ctx.fillStyle = '#1f2340';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(mineText, tx, ty + 1);
        }
      }

      newRound();
      return { update: update, draw: draw, down: down, key: key };
    }
  };
})(window.PH = window.PH || {});
