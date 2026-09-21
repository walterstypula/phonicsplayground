/* Word Munchers - walk the grid and munch every word that fits the rule; dodge the Troggle */
(function (PH) {
  'use strict';
  var U = PH.util;

  PH.games.munchers = {
    id: 'munchers',
    name: 'Word Munchers',
    icon: '🐸',
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
        var p = cellXY(me.c, me.r);
        var x = p.x + me.dx, y = p.y + me.dy;
        var open = me.munch > 0 ? Math.sin((0.35 - me.munch) / 0.35 * Math.PI * 3) * 0.5 + 0.5 : 0.1;
        ctx.save();
        ctx.translate(x, y);
        if (me.sick > 0) { ctx.rotate(Math.sin(me.sick * 30) * 0.15); }
        if (me.safe > 0 && Math.floor(me.safe * 8) % 2) { ctx.globalAlpha = 0.45; }
        ctx.fillStyle = me.sick > 0 ? '#a8c65a' : '#3ddc84';
        ctx.beginPath(); ctx.ellipse(0, 6, 46, 40, 0, 0, Math.PI * 2); ctx.fill();
        [-18, 18].forEach(function (ex) {
          ctx.fillStyle = me.sick > 0 ? '#a8c65a' : '#3ddc84';
          ctx.beginPath(); ctx.arc(ex, -30, 15, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(ex, -31, 10, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#1f2340';
          ctx.beginPath(); ctx.arc(ex + 2, -30, 5, 0, Math.PI * 2); ctx.fill();
        });
        ctx.fillStyle = '#1a5c3a';
        ctx.beginPath(); ctx.ellipse(0, 14, 30, 6 + open * 18, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff7aa2';
        ctx.beginPath(); ctx.ellipse(0, 18 + open * 8, 14, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      function drawTroggle(ctx) {
        if (!trog) { return; }
        var p = cellXY(trog.c, trog.r);
        var x = p.x + trog.drawX, y = p.y + trog.drawY + Math.sin(performance.now() / 150) * 3;
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = '#9b5de5';
        ctx.beginPath();
        ctx.moveTo(-38, 34);
        ctx.quadraticCurveTo(-44, -40, 0, -40);
        ctx.quadraticCurveTo(44, -40, 38, 34);
        for (var i = 0; i < 4; i++) { ctx.lineTo(28 - i * 19, 24 + (i % 2) * 10); }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(-13, -12, 10, 0, Math.PI * 2); ctx.arc(13, -12, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1f2340';
        ctx.beginPath(); ctx.arc(-11, -10, 4.5, 0, Math.PI * 2); ctx.arc(15, -10, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#1f2340'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-24, -28); ctx.lineTo(-6, -22); ctx.moveTo(24, -28); ctx.lineTo(6, -22); ctx.stroke();
        ctx.restore();
      }

      function draw(ctx) {
        var bg = ctx.createLinearGradient(0, 0, 0, api.H);
        bg.addColorStop(0, '#1c2b4a');
        bg.addColorStop(1, '#27406b');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, api.W, api.H);

        ctx.fillStyle = '#ffd23f';
        ctx.font = U.font(26);
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(rule ? rule.label + ':' : '', 30, 42);
        if (rule) {
          var lw = ctx.measureText(rule.label + ': ').width;
          ctx.fillStyle = '#ffffff';
          ctx.font = U.font(34);
          ctx.fillText(api.label(rule.show), 30 + lw, 40);
        }
        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.font = U.font(20);
        ctx.textAlign = 'right';
        ctx.fillText('Left to munch: ' + left(), api.W - 30, 42);

        for (var r = 0; r < ROWS; r++) {
          for (var c = 0; c < COLS; c++) {
            var cell = cells[r * COLS + c];
            var x = GX + c * CW, y = GY + r * CH;
            var here = me.c === c && me.r === r;
            ctx.fillStyle = here ? 'rgba(255,210,63,.22)' : 'rgba(255,255,255,.06)';
            U.roundRect(ctx, x + 4, y + 4, CW - 8, CH - 8, 14); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,.18)';
            ctx.lineWidth = 2; ctx.stroke();
            if (cell && !cell.eaten && !here) {
              var dx = cell.wobble > 0 ? Math.sin(cell.wobble * 50) * 6 : 0;
              var t = api.label(cell.word.w);
              ctx.fillStyle = cell.wobble > 0 ? '#ff8fb0' : '#ffffff';
              ctx.font = U.font(api.mode === 'letters' ? 46 : (t.length > 7 ? 24 : 30));
              ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              ctx.fillText(t, x + CW / 2 + dx, y + CH / 2);
            }
          }
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
