/* The Floor is Lava - hop stone to stone across the lava by tapping the word you hear */
(function (PH) {
  'use strict';
  var U = PH.util;

  PH.games.lava = {
    id: 'lava',
    name: 'The Floor is Lava',
    icon: '🌋',
    blurb: 'Hop across the bubbling lava. Only the stone with the word you hear is safe!',

    create: function (api) {
      var COLS = api.mode === 'pictures' ? 5 : 8;   /* stones to cross before the island */
      var GAP = 250, X0 = 170;            /* world spacing */
      var LANES = [210, 340, 470];
      var LAVA_Y = 560;
      var col = 0, lane = 1, target = null, cols = [], recent = [];
      var hits = 0, misses = 0, state = 'play', timer = 0, camX = 0;
      var hero = { x: X0, y: LANES[1], fromX: 0, fromY: 0, toX: 0, toY: 0, squash: 0 };
      var embers = [], blobs = [];
      for (var b = 0; b < 7; b++) { blobs.push({ x: U.rand(0, api.W), t: U.rand(0, 3), r: U.rand(6, 14) }); }

      function colX(i) { return X0 + i * GAP; }

      /* column 0 is the start rock, columns 1..COLS carry words, COLS+1 is the island */
      function buildColumn(i) {
        if (i === 0) { return { stones: [{ lane: 1, text: '', right: true, w: 170 }] }; }
        if (i === COLS + 1) { return { island: true, stones: [{ lane: 1, text: '', right: true, w: 230 }] }; }
        return { stones: U.shuffle([0, 1, 2]).map(function (ln) { return { lane: ln, text: '', right: false, w: 180 }; }) };
      }

      function fillColumn(i) {
        var c = cols[i];
        var pool = api.words.filter(function (w) { return recent.indexOf(w.w) < 0; });
        target = U.pick(pool.length > 6 ? pool : api.words);
        recent.push(target.w);
        if (recent.length > 5) { recent.shift(); }
        /* look-alikes that share a first sound or ending make it about real reading */
        var alike = U.shuffle(api.words.filter(function (w) {
          return w.w !== target.w && (w.rime === target.rime || PH.firstSound(w) === PH.firstSound(target));
        }));
        var other = U.shuffle(api.words.filter(function (w) { return w.w !== target.w && alike.indexOf(w) < 0; }));
        var picks = alike.slice(0, 1).concat(other).slice(0, 2);
        var words = U.shuffle([target].concat(picks));
        var ctx = PH.Engine.ctx;
        c.stones.forEach(function (s, k) {
          s.text = words[k].w;
          s.right = words[k].w === target.w;
          var shown = api.label(s.text);
          s.fs = api.mode === 'letters' ? 44 : (shown.length > 7 ? 24 : (shown.length > 5 ? 28 : 34));
          ctx.font = U.font(s.fs);
          s.w = Math.max(170, ctx.measureText(shown).width + 50);
          s.sink = 0; s.hot = 0;
        });
        api.setProgress(i, COLS);
        api.setPrompt('Hop to', { word: target.w, repeat: sayPrompt });
        sayPrompt();
      }

      function sayPrompt() {
        api.say('Hop to');
        api.sayWord(target.w, { queue: true });
      }

      function reset() {
        cols = [];
        for (var i = 0; i <= COLS + 1; i++) { cols.push(buildColumn(i)); }
        col = 0; lane = 1;
        hero.x = colX(0); hero.y = LANES[1];
        camX = 0;
        fillColumn(1);
      }

      function stoneRect(i, s) {
        var x = colX(i) - camX, y = LANES[s.lane] + (s.sink || 0);
        return { x: x - s.w / 2, y: y, w: s.w, h: 56 };
      }

      function down(p) {
        if (state !== 'play') { return; }
        var next = cols[col + 1];
        if (!next || next.island) { return; }
        for (var k = 0; k < next.stones.length; k++) {
          var s = next.stones[k];
          var r = stoneRect(col + 1, s);
          if (p.x >= r.x - 10 && p.x <= r.x + r.w + 10 && p.y >= r.y - 40 && p.y <= r.y + r.h + 30) {
            if (s.right) {
              hits++;
              api.addStar(1);
              hop(col + 1, s.lane);
            } else {
              misses++;
              s.hot = 1;
              api.sfx.sizzle();
              api.burst(colX(col + 1) - camX, LANES[s.lane], ['#ff5a1f', '#ffb000', '#ffe066'], 14, { lift: 200 });
              api.say(api.mode === 'pictures' ? 'Hot hot hot! That is a' : 'Hot hot hot! That says');
              api.sayWord(s.text, { queue: true });
            }
            return;
          }
        }
      }

      function hop(toCol, toLane) {
        hero.fromX = hero.x; hero.fromY = hero.y;
        hero.toX = colX(toCol); hero.toY = LANES[toLane];
        col = toCol; lane = toLane;
        state = 'hop'; timer = 0;
        api.sfx.hop();
      }

      function update(dt) {
        var now = performance.now() / 1000;
        /* embers rising off the lava */
        if (Math.random() < dt * 8) {
          embers.push({ x: U.rand(0, api.W), y: LAVA_Y + 10, v: U.rand(30, 80), life: U.rand(1, 2), age: 0 });
        }
        for (var i = embers.length - 1; i >= 0; i--) {
          var e = embers[i];
          e.age += dt; e.y -= e.v * dt; e.x += Math.sin(now * 3 + i) * 12 * dt;
          if (e.age > e.life) { embers.splice(i, 1); }
        }
        blobs.forEach(function (bl) { bl.t += dt; if (bl.t > 3) { bl.t = 0; bl.x = U.rand(0, api.W); } });

        cols.forEach(function (c) {
          c.stones.forEach(function (s) {
            if (s.hot > 0) {
              s.hot -= dt * 0.9;
              s.sink = Math.sin(U.clamp(1 - s.hot, 0, 1) * Math.PI) * 26;
            } else { s.sink = 0; }
          });
        });
        if (hero.squash > 0) { hero.squash -= dt * 4; }

        /* camera keeps the hero near the left third */
        var want = Math.max(0, hero.x - 230);
        camX += (want - camX) * Math.min(1, dt * 4);

        if (state === 'hop') {
          timer += dt;
          var k = U.clamp(timer / 0.55, 0, 1);
          hero.x = U.lerp(hero.fromX, hero.toX, k);
          hero.y = U.lerp(hero.fromY, hero.toY, k) - Math.sin(k * Math.PI) * 120;
          if (k >= 1) {
            hero.squash = 1;
            api.sfx.clank();
            api.burst(hero.x - camX, hero.y, ['#ffffff', '#ffd23f'], 10, { gravity: 300 });
            if (col === COLS + 1) {
              state = 'over';
              api.setProgress(COLS, COLS);
              api.say('You made it across!');
              api.finish(null, hits + misses ? hits / (hits + misses) : 1);
            } else if (col === COLS) {
              /* last word stone - the island is a free hop */
              state = 'wait'; timer = 0;
            } else {
              state = 'play';
              fillColumn(col + 1);
            }
          }
        } else if (state === 'wait') {
          timer += dt;
          /* the last stone's word finishes before the leap onto the island */
          if (PH.speech.settled(timer, 0.5)) { hop(COLS + 1, 1); }
        }
      }

      /* pillars are drawn in their own pass so they never cover a word on a lower stone */
      function drawPillar(ctx, i, s) {
        var r = stoneRect(i, s);
        if (r.x > api.W + 40 || r.x + r.w < -40) { return; }
        var art = PH.art;
        var cx = r.x + r.w / 2, top = r.y + 30;
        ctx.beginPath();
        ctx.moveTo(cx - 20, top); ctx.lineTo(cx - 24, LAVA_Y + 10); ctx.lineTo(cx + 26, LAVA_Y + 10); ctx.lineTo(cx + 20, top);
        ctx.closePath();
        var g = ctx.createLinearGradient(cx - 24, 0, cx + 26, 0);
        g.addColorStop(0, '#5a4650'); g.addColorStop(0.45, '#6e5862'); g.addColorStop(1, '#3a2c33');
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = art.INK; ctx.lineWidth = 3; ctx.stroke();
        /* glowing cracks, brighter near the lava */
        ctx.strokeStyle = 'rgba(255,140,50,.55)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx - 6, LAVA_Y); ctx.lineTo(cx - 2, LAVA_Y - 30); ctx.lineTo(cx - 9, LAVA_Y - 52);
        ctx.moveTo(cx + 10, LAVA_Y); ctx.lineTo(cx + 6, LAVA_Y - 22);
        ctx.stroke();
        var hg = ctx.createLinearGradient(0, LAVA_Y - 60, 0, LAVA_Y);
        hg.addColorStop(0, 'rgba(255,110,40,0)'); hg.addColorStop(1, 'rgba(255,110,40,.45)');
        ctx.fillStyle = hg; ctx.fillRect(cx - 24, LAVA_Y - 60, 50, 60);
      }

      function drawStone(ctx, i, s, isNext) {
        var r = stoneRect(i, s);
        if (r.x > api.W + 40 || r.x + r.w < -40) { return; }
        var art = PH.art;
        var hot = s.hot > 0 ? s.hot : 0;
        /* the lava lights the underside of every stone */
        ctx.save();
        ctx.translate(r.x + r.w / 2, r.y + r.h);
        ctx.scale(1, 0.3);
        var glow = ctx.createRadialGradient(0, 0, 4, 0, 0, r.w * 0.6);
        glow.addColorStop(0, 'rgba(255,120,40,.5)'); glow.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(0, 0, r.w * 0.6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        /* a chunky rock with a knobbly top */
        var seed = i * 7 + (s.lane || 0) * 3;
        ctx.beginPath();
        ctx.moveTo(r.x + 4, r.y + r.h * 0.45);
        ctx.quadraticCurveTo(r.x, r.y + 6, r.x + 22, r.y + 2);
        for (var k = 1; k <= 4; k++) {
          var px = r.x + 22 + (r.w - 44) * k / 4;
          ctx.quadraticCurveTo(px - (r.w - 44) / 8, r.y - 4 - ((seed + k) % 3) * 2, px, r.y + 1);
        }
        ctx.quadraticCurveTo(r.x + r.w, r.y + 6, r.x + r.w - 4, r.y + r.h * 0.45);
        ctx.quadraticCurveTo(r.x + r.w + 2, r.y + r.h, r.x + r.w - 20, r.y + r.h);
        ctx.lineTo(r.x + 20, r.y + r.h);
        ctx.quadraticCurveTo(r.x - 2, r.y + r.h, r.x + 4, r.y + r.h * 0.45);
        ctx.closePath();
        var stone = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
        if (hot) {
          stone.addColorStop(0, 'rgb(' + Math.round(150 + 105 * hot) + ',110,70)');
          stone.addColorStop(1, 'rgb(' + Math.round(110 + 145 * hot) + ',50,30)');
        } else {
          stone.addColorStop(0, '#9b8891');
          stone.addColorStop(0.55, '#6a5660');
          stone.addColorStop(1, '#c0572e');
        }
        ctx.fillStyle = stone; ctx.fill();
        ctx.strokeStyle = art.INK; ctx.lineWidth = 3.5; ctx.lineJoin = 'round'; ctx.stroke();
        /* a lit top face, pebbles and a crack */
        ctx.save(); ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,.22)';
        U.roundRect(ctx, r.x + 10, r.y + 4, r.w - 20, 12, 6); ctx.fill();
        ctx.fillStyle = 'rgba(40,20,30,.25)';
        ctx.beginPath();
        ctx.ellipse(r.x + r.w * 0.28, r.y + 30, 7, 4, 0, 0, Math.PI * 2);
        ctx.ellipse(r.x + r.w * 0.68, r.y + 26, 5, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(40,20,30,.4)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(r.x + r.w * 0.5, r.y + 18); ctx.lineTo(r.x + r.w * 0.46, r.y + 30); ctx.lineTo(r.x + r.w * 0.52, r.y + 40); ctx.stroke();
        ctx.restore();
        if (cols[i].island) {
          /* the goal: a grassy island with a waving flag */
          ctx.beginPath();
          ctx.moveTo(r.x - 12, r.y + 12);
          ctx.quadraticCurveTo(r.x - 12, r.y - 12, r.x + 20, r.y - 12);
          ctx.lineTo(r.x + r.w - 20, r.y - 12);
          ctx.quadraticCurveTo(r.x + r.w + 12, r.y - 12, r.x + r.w + 12, r.y + 12);
          for (var d = 0; d < 7; d++) {
            var dx = r.x + r.w + 12 - (r.w + 24) * (d + 0.5) / 7;
            ctx.quadraticCurveTo(dx + 4, r.y + 24, dx - (r.w + 24) / 14, r.y + 12);
          }
          ctx.closePath();
          art.fillLit(ctx, '#3ddc84', r.y - 12, r.y + 24, { lineWidth: 3 });
          var t = performance.now() / 1000;
          var fx = r.x + r.w / 2 + 40;
          U.roundRect(ctx, fx, r.y - 112, 8, 106, 4);
          art.fillLit(ctx, '#9a6a3c', r.y - 112, r.y - 6, { lineWidth: 2.5 });
          ctx.beginPath();
          ctx.moveTo(fx + 8, r.y - 108);
          ctx.quadraticCurveTo(fx + 40, r.y - 116 + Math.sin(t * 5) * 6, fx + 72, r.y - 96 + Math.sin(t * 5 + 1) * 5);
          ctx.quadraticCurveTo(fx + 40, r.y - 86 + Math.sin(t * 5) * 6, fx + 8, r.y - 72);
          ctx.closePath();
          art.fillLit(ctx, '#ff5d8f', r.y - 116, r.y - 72, { lineWidth: 2.5 });
          ctx.fillStyle = '#ffd23f'; U.star(ctx, fx + 32, r.y - 94, 8, 3.5); ctx.fill();
          art.ball(ctx, fx + 4, r.y - 114, 6, '#ffd23f', { lineWidth: 2.5 });
          [[-2, -12], [r.w - 14, -12]].forEach(function (f, n) {
            ctx.fillStyle = n ? '#ffd23f' : '#ff9fdf';
            ctx.beginPath(); ctx.arc(r.x + f[0] + 8, r.y + f[1] + 2, 5, 0, Math.PI * 2); ctx.fill();
          });
        }
        if (isNext && s.text) {
          U.plate(ctx, r.x + 12, r.y - 36, r.w - 24, 50, { r: 14 });
          ctx.fillStyle = '#1f2340';
          ctx.font = U.font(s.fs);
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(api.label(s.text), r.x + r.w / 2, r.y - 8);
        }
      }


      function drawHero(ctx) {
        var x = hero.x - camX, y = hero.y;
        var sq = hero.squash > 0 ? hero.squash * 0.2 : 0;
        if (state !== 'hop') { U.shadow(ctx, x, y + 3, 26, 6, 0.4); }
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(0.9 * (1 + sq), 0.9 * (1 - sq));
        var hop = state === 'hop';
        PH.art.kid(ctx, {
          hairStyle: 'cap', capColor: '#ff9f40', shirt: '#4d8dff', pants: '#2f3a73', shoes: '#ff5d8f',
          arms: hop ? [2.4, 2.4] : [0.25, 0.25],
          mouth: hop ? 'grin' : 'smile', look: [0.6, 0], blinkSeed: 1,
          body: function (c) {             /* a star on the t-shirt */
            c.fillStyle = '#ffd23f'; U.star(c, 0, -44, 7, 3.2); c.fill();
          }
        });
        ctx.restore();
      }

      function draw(ctx) {
        var now = performance.now() / 1000;
        var sky = ctx.createLinearGradient(0, 0, 0, api.H);
        sky.addColorStop(0, '#2a1640');
        sky.addColorStop(0.7, '#7a2d3b');
        sky.addColorStop(1, '#c2462b');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, api.W, api.H);

        var art = PH.art;
        /* faint stars high up in the smoky sky */
        ctx.fillStyle = 'rgba(255,220,200,.5)';
        for (var st = 0; st < 26; st++) {
          ctx.fillRect((st * 137 + 40 - camX * 0.03) % api.W, (st * 53) % 170 + 10, 2, 2);
        }
        /* far jagged hills, very slow */
        ctx.fillStyle = '#4a2340';
        ctx.beginPath(); ctx.moveTo(0, LAVA_Y);
        for (var hx = -80; hx <= api.W + 80; hx += 80) {
          var px = hx - (camX * 0.08) % 80;
          ctx.lineTo(px, 380 + Math.sin(hx * 0.9) * 40 + Math.cos(hx * 0.37) * 30);
        }
        ctx.lineTo(api.W, LAVA_Y); ctx.closePath(); ctx.fill();

        /* the volcano, slow parallax, with a glowing crater, lava streams and smoke */
        var vx = 760 - (camX * 0.15) % (api.W + 400);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(vx - 280, LAVA_Y);
        ctx.quadraticCurveTo(vx - 150, 300, vx - 70, 176);
        ctx.quadraticCurveTo(vx, 190, vx + 70, 176);
        ctx.quadraticCurveTo(vx + 150, 300, vx + 280, LAVA_Y);
        ctx.closePath();
        var vg = ctx.createLinearGradient(vx - 200, 0, vx + 200, 0);
        vg.addColorStop(0, '#6a3446'); vg.addColorStop(0.5, '#4d2537'); vg.addColorStop(1, '#2f1624');
        ctx.fillStyle = vg; ctx.fill();
        ctx.strokeStyle = 'rgba(30,10,20,.6)'; ctx.lineWidth = 3; ctx.stroke();
        ctx.clip();
        ctx.strokeStyle = '#ff7b2e'; ctx.lineWidth = 9; ctx.lineCap = 'round';
        [[-30, -90, 0.8], [18, 70, 1]].forEach(function (lv) {
          ctx.globalAlpha = 0.7 + Math.sin(now * 2 + lv[0]) * 0.2;
          ctx.beginPath(); ctx.moveTo(vx + lv[0], 184);
          ctx.quadraticCurveTo(vx + lv[0] + lv[1] * 0.4, 300, vx + lv[1] * lv[2] * 1.6, LAVA_Y);
          ctx.stroke();
        });
        ctx.globalAlpha = 1;
        ctx.restore();
        var cg = ctx.createRadialGradient(vx, 176, 4, vx, 176, 90);
        cg.addColorStop(0, 'rgba(255,170,60,.7)'); cg.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = cg; ctx.fillRect(vx - 90, 86, 180, 180);
        ctx.beginPath(); ctx.ellipse(vx, 178, 64, 12, 0, 0, Math.PI * 2);
        art.fillLit(ctx, '#ff7b2e', 166, 190, { light: 0.4, lineWidth: 3, ink: 'rgba(30,10,20,.7)' });
        for (var sm = 0; sm < 4; sm++) {
          var sk = (now * 0.15 + sm / 4) % 1;
          ctx.fillStyle = 'rgba(90,60,80,' + (0.5 * (1 - sk)) + ')';
          ctx.beginPath(); ctx.arc(vx + Math.sin(sk * 4 + sm) * 20 + sk * 60, 160 - sk * 150, 20 + sk * 40, 0, Math.PI * 2); ctx.fill();
        }

        var i;
        for (i = 0; i < cols.length; i++) {
          cols[i].stones.forEach(function (s) { drawPillar(ctx, i, s); });
        }
        for (i = 0; i < cols.length; i++) {
          cols[i].stones.forEach(function (s) { drawStone(ctx, i, s, i === col + 1 && state === 'play'); });
        }
        drawHero(ctx);

        /* lava */
        var lava = ctx.createLinearGradient(0, LAVA_Y, 0, api.H);
        lava.addColorStop(0, '#ffb000');
        lava.addColorStop(0.4, '#ff5a1f');
        lava.addColorStop(1, '#b3160c');
        ctx.fillStyle = lava;
        ctx.beginPath();
        ctx.moveTo(0, api.H);
        for (var x = 0; x <= api.W; x += 20) {
          ctx.lineTo(x, LAVA_Y + Math.sin(x / 55 + now * 2) * 7 + Math.sin(x / 23 - now * 3) * 3);
        }
        ctx.lineTo(api.W, api.H);
        ctx.closePath(); ctx.fill();
        /* a bright rim and drifting dark crust on the surface */
        ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 4;
        ctx.beginPath();
        for (x = 0; x <= api.W; x += 20) {
          var ly = LAVA_Y + Math.sin(x / 55 + now * 2) * 7 + Math.sin(x / 23 - now * 3) * 3;
          if (x === 0) { ctx.moveTo(x, ly); } else { ctx.lineTo(x, ly); }
        }
        ctx.stroke();
        ctx.fillStyle = 'rgba(120,20,10,.45)';
        for (var cr = 0; cr < 6; cr++) {
          var cx = ((cr * 190 + now * 18 - camX * 0.5) % (api.W + 120) + api.W + 120) % (api.W + 120) - 60;
          ctx.beginPath(); ctx.ellipse(cx, LAVA_Y + 36 + (cr % 3) * 16, 40 - (cr % 2) * 12, 6, 0, 0, Math.PI * 2); ctx.fill();
        }
        blobs.forEach(function (bl) {
          var k = bl.t / 3;
          ctx.fillStyle = 'rgba(255,230,120,' + (1 - k) + ')';
          ctx.beginPath(); ctx.arc(bl.x, LAVA_Y + 6 - k * 14, bl.r * (0.4 + k), 0, Math.PI * 2); ctx.fill();
        });
        embers.forEach(function (e) {
          ctx.fillStyle = 'rgba(255,190,80,' + U.clamp(1 - e.age / e.life, 0, 1) + ')';
          ctx.fillRect(e.x, e.y, 3, 3);
        });

        U.badge(ctx, 18, 16, 'Stones to go: ' + Math.max(0, COLS - col), { icon: '🌋' });
      }

      reset();
      return { update: update, draw: draw, down: down };
    }
  };
})(window.PH = window.PH || {});
