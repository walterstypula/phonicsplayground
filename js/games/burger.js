/* Burger Time - the chef climbs to each ingredient and stomps it down to build the ordered word */
(function (PH) {
  'use strict';
  var U = PH.util;

  PH.games.burger = {
    id: 'burger',
    name: 'Burger Time',
    icon: '🍔',
    blurb: 'A customer orders a word. Send the chef up the ladders to stomp the sound chunks onto the burger in order.',

    create: function (api) {
      var ROUNDS = 5;
      var FLOORS = [196, 336, 476];            /* y of each walkway (top of the girder) */
      var LADDERS = [70, 500, 930];
      var SLOT_X = [285, 715];
      var COUNTER_Y = 612, PLATE_X = 500;
      var FILLINGS = [
        { fill: '#8b4a2b', edge: '#5e2f18', text: '#ffffff' },   /* patty */
        { fill: '#ffd23f', edge: '#e0a800', text: '#3b2412' },   /* cheese */
        { fill: '#6ccf5a', edge: '#3f9c33', text: '#123a12' },   /* lettuce */
        { fill: '#ff5d5d', edge: '#c83232', text: '#ffffff' },   /* tomato */
        { fill: '#d9a5e8', edge: '#9b5de5', text: '#3a1a4a' }    /* onion */
      ];

      var round = 0, target = null, parts = [], built = [], recent = [];
      var hits = 0, misses = 0, state = 'play', timer = 0;
      var chef = { floor: 2, x: 500, y: FLOORS[2], plan: [], walkT: 0, face: 1, stomp: 0 };
      var busy = null;   /* the ingredient currently falling */

      function allChunks() {
        var set = {};
        api.words.forEach(function (w) { w.g.forEach(function (g) { set[g] = 1; }); });
        return Object.keys(set);
      }
      /* age 3 builds a picture burger, age 4 spells a word with letters */
      var FOOD = { cheese: '🧀', lettuce: '🥬', tomato: '🍅', bacon: '🥓',
        pickle: '🥒', onion: '🧅', egg: '🥚', mushroom: '🍄' };
      var pics = api.mode === 'pictures';
      var CHUNKS = pics ? Object.keys(FOOD) : allChunks();
      function shown(g) { return pics ? FOOD[g] + ' ' + g : g; }
      function spellable() {
        var have = {};
        api.words.forEach(function (w) { have[w.w] = 1; });
        return PH.levelById(1).words.filter(function (w) { return w.g.every(function (c) { return have[c]; }); });
      }

      function newRound() {
        round++;
        if (round > ROUNDS) {
          api.finish(null, hits + misses ? hits / (hits + misses) : 1);
          state = 'over';
          return;
        }
        var pool = api.words.filter(function (w) {
          return recent.indexOf(w.w) < 0 && w.g.length <= 5;
        });
        target = U.pick(pool.length > 5 ? pool : api.words);
        if (pics) {
          target = { w: 'burger', g: U.shuffle(CHUNKS).slice(0, round <= 2 ? 2 : 3) };
        } else if (api.mode === 'letters') {
          target = U.pick(spellable());
        }
        recent.push(target.w);
        if (recent.length > 5) { recent.shift(); }

        var decoys = U.shuffle(CHUNKS.filter(function (g) { return target.g.indexOf(g) < 0; }))
          .slice(0, Math.max(1, Math.min(2, 6 - target.g.length)));
        var bag = U.shuffle(target.g.concat(decoys));
        var slots = U.shuffle([0, 1, 2, 3, 4, 5]);
        var colors = U.shuffle(FILLINGS.concat(FILLINGS));
        parts = bag.map(function (g, i) {
          var s = slots[i];
          var floor = s % 3, x = SLOT_X[Math.floor(s / 3)];
          return {
            g: g, floor: floor, x: x, y: FLOORS[floor], homeY: FLOORS[floor],
            look: colors[i % colors.length], state: 'rest', vy: 0, wobble: 0, tx: 0, ty: 0, t: 0
          };
        });
        built = [];
        busy = null;
        state = 'play';
        api.setProgress(round, ROUNDS);
        if (pics) { api.setPrompt('Make my burger!', { repeat: sayPrompt }); }
        else { api.setPrompt('Order up:', { word: target.w, repeat: sayPrompt }); }
        sayPrompt();
      }

      function sayPrompt() {
        if (pics) {
          api.say('A burger with');
          target.g.forEach(function (g, i) { api.say((i ? 'then ' : '') + g, { queue: true, rate: 0.8 }); });
          return;
        }
        api.say('One burger. Please make');
        api.sayWord(target.w, { queue: true });
        if (api.mode === 'letters') {
          api.say('with the letters', { queue: true });
          target.g.forEach(function (g) { api.say(g, { queue: true, rate: 0.7 }); });
        }
      }

      /* ---- chef movement: walk to a ladder, climb, walk to the ingredient ---- */
      function planTo(floor, x) {
        var plan = [];
        if (floor !== chef.floor) {
          var best = LADDERS[0];
          LADDERS.forEach(function (l) {
            if (Math.abs(chef.x - l) + Math.abs(x - l) < Math.abs(chef.x - best) + Math.abs(x - best)) { best = l; }
          });
          plan.push({ type: 'walk', x: best });
          plan.push({ type: 'climb', floor: floor });
        }
        plan.push({ type: 'walk', x: x });
        return plan;
      }

      function down(p) {
        if (state !== 'play') { return; }
        for (var i = 0; i < parts.length; i++) {
          var pt = parts[i];
          if (pt.state !== 'rest') { continue; }
          if (Math.abs(p.x - pt.x) <= 90 && p.y >= pt.y - 60 && p.y <= pt.y + 20) {
            chef.plan = planTo(pt.floor, pt.x);
            chef.goal = pt;
            api.sfx.click();
            return;
          }
        }
      }

      function stomp(pt) {
        chef.stomp = 0.3;
        var need = target.g[built.length];
        if (pt.g === need) {
          hits++;
          api.sfx.hop();
          pt.state = 'drop'; pt.vy = 0; busy = pt;
          api.say(PH.soundHint(pt.g), { rate: 0.6 });
        } else {
          misses++;
          pt.wobble = 0.5;
          api.sfx.bad();
          api.say('Not that one yet. Listen:');
          if (api.pre) { sayPrompt(); } else { api.sayWord(target.w, { queue: true, rate: 0.6 }); }
        }
      }

      function update(dt) {
        if (chef.stomp > 0) { chef.stomp -= dt; }
        parts.forEach(function (pt) { if (pt.wobble > 0) { pt.wobble -= dt; } });

        /* chef follows the plan */
        if (chef.plan.length && state === 'play') {
          var step = chef.plan[0];
          if (step.type === 'walk') {
            var dx = step.x - chef.x, sp = 280 * dt;
            if (Math.abs(dx) <= sp) { chef.x = step.x; chef.plan.shift(); }
            else { chef.x += Math.sign(dx) * sp; chef.face = Math.sign(dx); }
            chef.walkT += dt;
          } else {
            var ty = FLOORS[step.floor], dy = ty - chef.y, cs = 220 * dt;
            if (Math.abs(dy) <= cs) { chef.y = ty; chef.floor = step.floor; chef.plan.shift(); }
            else { chef.y += Math.sign(dy) * cs; }
            chef.walkT += dt;
          }
        }
        /* arrived: stomp, but wait politely if the last ingredient is still falling */
        if (!chef.plan.length && chef.goal && !busy && state === 'play') {
          var g = chef.goal; chef.goal = null;
          if (g.state === 'rest') { stomp(g); }
        }

        /* the falling ingredient: floor by floor, then onto the plate */
        if (busy) {
          var pt = busy;
          if (pt.state === 'drop') {
            pt.vy += 1400 * dt;
            pt.y += pt.vy * dt;
            var nextFloor = pt.floor + 1;
            var landY = nextFloor < FLOORS.length ? FLOORS[nextFloor] : COUNTER_Y - 6;
            if (pt.y >= landY) {
              pt.y = landY; pt.floor = nextFloor;
              api.sfx.clank();
              if (nextFloor >= FLOORS.length) {
                pt.state = 'slide'; pt.t = 0; pt.fx = pt.x; pt.fy = pt.y;
              } else {
                pt.vy = -160;   /* a little bounce on each walkway, like the arcade */
              }
            }
          } else if (pt.state === 'slide') {
            pt.t += dt / 0.45;
            var k = U.clamp(pt.t, 0, 1);
            var stackY = COUNTER_Y - 30 - built.length * 26;
            pt.x = U.lerp(pt.fx, PLATE_X, k);
            pt.y = U.lerp(pt.fy, stackY, k) - Math.sin(k * Math.PI) * 60;
            if (k >= 1) {
              pt.state = 'stacked'; pt.y = stackY;
              built.push(pt);
              busy = null;
              api.burst(PLATE_X, stackY, ['#ffd23f', '#ffffff'], 10, { gravity: 300 });
              if (built.length === target.g.length) {
                state = 'done'; timer = 0;
                api.addStar(1);
                api.sfx.great();
                api.say('Order up!');
                api.sayWord(target.w, { queue: true });
              }
            }
          }
        }

        if (state === 'done') {
          timer += dt;
          if (timer > 2.2) { newRound(); }
        }
      }

      /* ---- drawing ---- */
      function bun(ctx, x, y, top) {
        ctx.fillStyle = '#e8a33c';
        ctx.beginPath();
        if (top) {
          ctx.ellipse(x, y, 84, 36, 0, Math.PI, Math.PI * 2);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#fff3c4';
          for (var i = -3; i <= 3; i++) {
            ctx.beginPath(); ctx.ellipse(x + i * 18, y - 18 - Math.abs(i) * -2 - (3 - Math.abs(i)) * 4, 4, 2.5, 0.4, 0, Math.PI * 2); ctx.fill();
          }
        } else {
          U.roundRect(ctx, x - 82, y - 8, 164, 26, 12); ctx.fill();
        }
      }

      function ingredient(ctx, pt) {
        var dx = pt.wobble > 0 ? Math.sin(pt.wobble * 50) * 6 : 0;
        var x = pt.x + dx, y = pt.y;
        var w = 150, h = 30;
        ctx.save();
        ctx.fillStyle = pt.look.fill;
        ctx.strokeStyle = pt.look.edge; ctx.lineWidth = 3;
        if (pt.look === FILLINGS[2]) {
          /* wavy lettuce */
          ctx.beginPath();
          ctx.moveTo(x - w / 2, y - h);
          for (var i = 0; i <= 10; i++) { ctx.lineTo(x - w / 2 + i * w / 10, y - h + (i % 2 ? -6 : 2)); }
          ctx.lineTo(x + w / 2, y); ctx.lineTo(x - w / 2, y); ctx.closePath();
          ctx.fill(); ctx.stroke();
        } else {
          U.roundRect(ctx, x - w / 2, y - h, w, h, 12); ctx.fill(); ctx.stroke();
        }
        ctx.fillStyle = pt.look.text;
        var label = shown(pt.g);
        ctx.font = U.font(api.mode === 'letters' ? 28 : (label.length > 5 ? 19 : 24));
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label, x, y - h / 2 + 1);
        ctx.restore();
      }

      function drawChef(ctx) {
        var x = chef.x, y = chef.y;
        var climbing = chef.plan.length && chef.plan[0].type === 'climb';
        var bob = chef.plan.length ? Math.abs(Math.sin(chef.walkT * 12)) * 4 : 0;
        var squash = chef.stomp > 0 ? 0.15 : 0;
        ctx.save();
        ctx.translate(x, y - bob);
        ctx.scale((climbing ? 1 : chef.face) * (1 + squash), 1 - squash);
        ctx.fillStyle = '#1f2340';
        ctx.fillRect(-12, -18, 9, 18); ctx.fillRect(3, -18, 9, 18);
        ctx.fillStyle = '#ffffff';
        U.roundRect(ctx, -18, -56, 36, 42, 10); ctx.fill();
        ctx.fillStyle = '#ff5d8f';
        ctx.fillRect(-18, -30, 36, 6);
        ctx.fillStyle = '#ffd9b3';
        ctx.beginPath(); ctx.arc(0, -70, 17, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        U.roundRect(ctx, -15, -106, 30, 26, 10); ctx.fill();
        ctx.beginPath(); ctx.arc(-9, -104, 10, 0, Math.PI * 2); ctx.arc(9, -104, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1f2340';
        ctx.beginPath(); ctx.arc(5, -72, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#7a4a2b'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-2, -63); ctx.quadraticCurveTo(6, -58, 13, -63); ctx.stroke();
        ctx.restore();
      }

      function drawTicket(ctx) {
        if (!target) { return; }
        var n = target.g.length, cw = 70, gap = 10;
        var total = n * cw + (n - 1) * gap + 150;
        var x = api.W / 2 - total / 2;
        ctx.fillStyle = '#fffaf0';
        U.roundRect(ctx, x, 16, total, 72, 14); ctx.fill();
        ctx.strokeStyle = '#e0c9a0'; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = '#b8860b';
        ctx.font = U.font(22);
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText('ORDER', x + 18, 52);
        var sx = x + 130;
        for (var i = 0; i < n; i++) {
          var have = built[i];
          ctx.fillStyle = have ? '#3ddc84' : '#f1ead8';
          U.roundRect(ctx, sx, 28, cw, 48, 10); ctx.fill();
          ctx.fillStyle = '#1f2340';
          ctx.font = pics ? '32px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif' : U.font(target.g[i].length > 3 ? 20 : 28);
          ctx.textAlign = 'center';
          /* little ones see the whole order; readers get a question mark for the next chunk */
          var cellText = have ? have.g : (api.pre ? target.g[i] : (i === built.length ? '?' : ''));
          ctx.fillText(pics ? FOOD[cellText] || '' : cellText, sx + cw / 2, 53);
          sx += cw + gap;
        }
      }

      function draw(ctx) {
        var bg = ctx.createLinearGradient(0, 0, 0, api.H);
        bg.addColorStop(0, '#12213f');
        bg.addColorStop(1, '#1d3561');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, api.W, api.H);

        /* ladders */
        LADDERS.forEach(function (lx) {
          ctx.strokeStyle = '#8fd3ff'; ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(lx - 18, FLOORS[0] - 4); ctx.lineTo(lx - 18, FLOORS[2] + 4);
          ctx.moveTo(lx + 18, FLOORS[0] - 4); ctx.lineTo(lx + 18, FLOORS[2] + 4);
          ctx.stroke();
          ctx.lineWidth = 4;
          for (var y = FLOORS[0] + 10; y < FLOORS[2]; y += 22) {
            ctx.beginPath(); ctx.moveTo(lx - 18, y); ctx.lineTo(lx + 18, y); ctx.stroke();
          }
        });
        /* girders */
        FLOORS.forEach(function (fy) {
          ctx.fillStyle = '#ff9f40';
          ctx.fillRect(20, fy, api.W - 40, 10);
          ctx.fillStyle = 'rgba(0,0,0,.25)';
          for (var x = 20; x < api.W - 20; x += 30) { ctx.fillRect(x, fy + 3, 14, 4); }
        });
        /* counter + plate + bottom bun */
        ctx.fillStyle = '#c9ced9';
        ctx.fillRect(0, COUNTER_Y, api.W, api.H - COUNTER_Y);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.ellipse(PLATE_X, COUNTER_Y + 4, 110, 14, 0, 0, Math.PI * 2); ctx.fill();
        bun(ctx, PLATE_X, COUNTER_Y - 18, false);
        if (state === 'done') { bun(ctx, PLATE_X, COUNTER_Y - 36 - built.length * 26, true); }

        parts.forEach(function (pt) { if (pt.state !== 'stacked') { ingredient(ctx, pt); } });
        built.forEach(function (pt) { ingredient(ctx, pt); });
        drawChef(ctx);
        drawTicket(ctx);

        ctx.fillStyle = 'rgba(255,255,255,.7)';
        ctx.font = U.font(18);
        ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
        ctx.fillText('Tap an ingredient to send the chef', api.W - 24, api.H - 8);
      }

      newRound();
      return { update: update, draw: draw, down: down };
    }
  };
})(window.PH = window.PH || {});
