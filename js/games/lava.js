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
          if (timer > 0.5) { hop(COLS + 1, 1); }
        }
      }

      /* pillars are drawn in their own pass so they never cover a word on a lower stone */
      function drawPillar(ctx, i, s) {
        var r = stoneRect(i, s);
        if (r.x > api.W + 40 || r.x + r.w < -40) { return; }
        ctx.fillStyle = '#4a3b40';
        ctx.fillRect(r.x + r.w / 2 - 22, r.y + 30, 44, LAVA_Y - r.y);
      }

      function drawStone(ctx, i, s, isNext) {
        var r = stoneRect(i, s);
        if (r.x > api.W + 40 || r.x + r.w < -40) { return; }
        /* slab */
        var hot = s.hot > 0 ? s.hot : 0;
        ctx.fillStyle = hot ? 'rgb(' + Math.round(110 + 145 * hot) + ',70,50)' : '#6d5a60';
        U.roundRect(ctx, r.x, r.y, r.w, r.h, 18); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.18)';
        U.roundRect(ctx, r.x + 8, r.y + 6, r.w - 16, 12, 6); ctx.fill();
        if (cols[i].island) {
          ctx.fillStyle = '#3ddc84';
          U.roundRect(ctx, r.x - 10, r.y - 10, r.w + 20, 26, 12); ctx.fill();
          ctx.fillStyle = '#7a4a2b';
          ctx.fillRect(r.x + r.w / 2 + 40, r.y - 110, 7, 104);
          ctx.fillStyle = '#ff5d8f';
          ctx.beginPath();
          ctx.moveTo(r.x + r.w / 2 + 47, r.y - 110);
          ctx.lineTo(r.x + r.w / 2 + 110, r.y - 90);
          ctx.lineTo(r.x + r.w / 2 + 47, r.y - 70);
          ctx.closePath(); ctx.fill();
        }
        if (isNext && s.text) {
          ctx.fillStyle = '#fffaf0';
          U.roundRect(ctx, r.x + 12, r.y - 34, r.w - 24, 50, 14); ctx.fill();
          ctx.fillStyle = '#1f2340';
          ctx.font = U.font(s.fs);
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(api.label(s.text), r.x + r.w / 2, r.y - 8);
        }
      }

      function drawHero(ctx) {
        var x = hero.x - camX, y = hero.y;
        var sq = hero.squash > 0 ? hero.squash * 0.2 : 0;
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1 + sq, 1 - sq);
        ctx.fillStyle = '#4d8dff';
        U.roundRect(ctx, -18, -58, 36, 44, 12); ctx.fill();
        ctx.fillStyle = '#1f2340';
        ctx.fillRect(-14, -16, 10, 16); ctx.fillRect(4, -16, 10, 16);
        ctx.fillStyle = '#ffd9b3';
        ctx.beginPath(); ctx.arc(0, -76, 20, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff9f40';
        ctx.beginPath(); ctx.arc(0, -82, 21, Math.PI, Math.PI * 2); ctx.fill();
        ctx.fillRect(-4, -84, 30, 7);
        ctx.fillStyle = '#1f2340';
        ctx.beginPath(); ctx.arc(-7, -74, 3, 0, Math.PI * 2); ctx.arc(7, -74, 3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#1f2340'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(0, -68, 6, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
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

        /* distant volcano, slow parallax */
        ctx.fillStyle = '#3a2233';
        var vx = 760 - (camX * 0.15) % (api.W + 400);
        ctx.beginPath();
        ctx.moveTo(vx - 260, LAVA_Y); ctx.lineTo(vx - 60, 170); ctx.lineTo(vx + 60, 170); ctx.lineTo(vx + 260, LAVA_Y);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ff7b2e';
        ctx.beginPath(); ctx.ellipse(vx, 172, 60, 12, 0, 0, Math.PI * 2); ctx.fill();

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
        blobs.forEach(function (bl) {
          var k = bl.t / 3;
          ctx.fillStyle = 'rgba(255,230,120,' + (1 - k) + ')';
          ctx.beginPath(); ctx.arc(bl.x, LAVA_Y + 6 - k * 14, bl.r * (0.4 + k), 0, Math.PI * 2); ctx.fill();
        });
        embers.forEach(function (e) {
          ctx.fillStyle = 'rgba(255,190,80,' + U.clamp(1 - e.age / e.life, 0, 1) + ')';
          ctx.fillRect(e.x, e.y, 3, 3);
        });

        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.font = U.font(24);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('Stones to go: ' + Math.max(0, COLS - col), 22, 44);
      }

      reset();
      return { update: update, draw: draw, down: down };
    }
  };
})(window.PH = window.PH || {});
