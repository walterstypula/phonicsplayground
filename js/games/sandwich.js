/* Stack the Snack - fillings ride past on a belt; take them in the order the word needs.

   The word is cut into its chunks and those chunks go by on a conveyor. Order is the
   whole point: "bas" then "ket" makes basket, and "ket" then "bas" makes nothing. So the
   ticket shows what has been built so far and a blank for what comes next, and a chunk
   taken out of turn is handed back rather than quietly accepted.

   The belt keeps moving and loops for ever, which means nothing is ever missed - a chunk
   that goes off the left comes round again - and no choice is ever made under time
   pressure. A child who wants to watch a whole lap before deciding is welcome to.      */
(function (PH) {
  'use strict';
  var U = PH.util;

  PH.games.sandwich = {
    id: 'sandwich',
    name: 'Stack the Snack',
    icon: '🥪',
    blurb: 'A customer orders a word. Take the sound chunks off the belt in the right order and build the sandwich.',

    create: function (api) {
      var ROUNDS = 5;
      var BELT_TOP = 292, BELT_H = 62;         /* the belt surface the fillings ride on */
      var ITEM_Y = BELT_TOP + 8;               /* fillings sit just on top of it */
      var COUNTER_Y = 578, PLATE_X = 500;
      var SPACING = 190, SLOTS = 6;
      var LOOP = SPACING * SLOTS;
      var SPEED = api.pre ? 34 : 62;           /* px per second, gentle either way */

      var FILLINGS = [
        { fill: '#8b4a2b', edge: '#5e2f18', text: '#ffffff' },   /* ham */
        { fill: '#ffd23f', edge: '#e0a800', text: '#3b2412' },   /* cheese */
        { fill: '#6ccf5a', edge: '#3f9c33', text: '#123a12' },   /* lettuce */
        { fill: '#ff5d5d', edge: '#c83232', text: '#ffffff' },   /* tomato */
        { fill: '#d9a5e8', edge: '#9b5de5', text: '#3a1a4a' }    /* onion */
      ];

      var round = 0, target = null, parts = [], built = [], recent = [];
      var hits = 0, misses = 0, state = 'play', timer = 0, scroll = 0, idle = 0;
      var chef = { reach: 0, cheer: 0 };
      var busy = null;   /* the filling currently on its way to the plate */

      function allChunks() {
        var set = {};
        api.words.forEach(function (w) { w.g.forEach(function (g) { set[g] = 1; }); });
        return Object.keys(set);
      }
      /* age 3 builds a picture sandwich, age 4 spells a word with letters */
      var FOOD = { cheese: '🧀', lettuce: '🥬', tomato: '🍅', bacon: '🥓',
        pickle: '🥒', onion: '🧅', egg: '🥚', ham: '🍖' };
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
          target = { w: 'sandwich', g: U.shuffle(CHUNKS).slice(0, round <= 2 ? 2 : 3) };
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
          return {
            g: g, slot: slots[i], x: 0, y: ITEM_Y,
            look: colors[i % colors.length], state: 'belt', wobble: 0, t: 0, fx: 0, fy: 0
          };
        });
        built = [];
        busy = null;
        idle = 0;
        state = 'play';
        api.setProgress(round, ROUNDS);
        if (pics) { api.setPrompt('Make my sandwich!', { repeat: sayPrompt }); }
        else { api.setPrompt('Order up:', { word: target.w, repeat: sayPrompt }); }
        sayPrompt();
      }

      function sayPrompt() {
        if (pics) {
          api.say('A sandwich with');
          target.g.forEach(function (g, i) {
            if (i) { api.say('then', { queue: true, rate: 0.8 }); }
            api.say(g, { queue: true, rate: 0.8 });
          });
          return;
        }
        api.say('One sandwich. Please make');
        api.sayWord(target.w, { queue: true });
        if (api.mode === 'letters') {
          api.say('with the letters', { queue: true });
          target.g.forEach(function (g) { api.say(g, { queue: true, rate: 0.7 }); });
        }
      }

      /* where a filling sits along the belt right now. The belt is a loop, so a chunk
         that leaves on the left is back again on the right a few seconds later. */
      function beltX(pt) {
        var x = (pt.slot * SPACING - scroll) % LOOP;
        if (x < 0) { x += LOOP; }
        return x - 90;
      }

      function down(p) {
        if (state !== 'play' || busy) { return; }
        idle = 0;
        for (var i = 0; i < parts.length; i++) {
          var pt = parts[i];
          if (pt.state !== 'belt') { continue; }
          if (Math.abs(p.x - pt.x) <= 78 && p.y >= pt.y - 46 && p.y <= pt.y + 34) {
            pick(pt);
            return;
          }
        }
      }

      function pick(pt) {
        chef.reach = 0.35;
        var need = target.g[built.length];
        if (pt.g === need) {
          hits++;
          api.sfx.hop();
          pt.state = 'fly'; pt.t = 0; pt.fx = pt.x; pt.fy = pt.y;
          busy = pt;
          api.say(PH.soundHint(pt.g), { rate: 0.6 });
        } else {
          /* handed back, with the word again: the mistake is the order, not the chunk */
          misses++;
          pt.wobble = 0.5;
          api.sfx.bad();
          api.say('Not that one yet. Listen:');
          if (api.pre) { sayPrompt(); } else { api.sayWord(target.w, { queue: true, rate: 0.6 }); }
        }
      }

      function update(dt) {
        if (chef.reach > 0) { chef.reach -= dt; }
        if (chef.cheer > 0) { chef.cheer -= dt; }
        parts.forEach(function (pt) { if (pt.wobble > 0) { pt.wobble -= dt; } });

        /* the belt runs while the round is live, and holds still once it is built */
        if (state === 'play') {
          scroll += SPEED * dt;
          idle += dt;
        }
        parts.forEach(function (pt) {
          if (pt.state === 'belt') { pt.x = beltX(pt); pt.y = ITEM_Y; }
        });

        /* the chosen filling arcs from the belt down onto the sandwich */
        if (busy && busy.state === 'fly') {
          var pt = busy;
          pt.t += dt / 0.5;
          var k = U.clamp(pt.t, 0, 1);
          var stackY = COUNTER_Y - 30 - built.length * 26;
          pt.x = U.lerp(pt.fx, PLATE_X, k);
          pt.y = U.lerp(pt.fy, stackY, k) - Math.sin(k * Math.PI) * 70;
          if (k >= 1) {
            pt.state = 'stacked'; pt.y = stackY; pt.x = PLATE_X;
            built.push(pt);
            busy = null;
            api.sfx.clank();
            api.burst(PLATE_X, stackY, ['#ffd23f', '#ffffff'], 10, { gravity: 300 });
            if (built.length === target.g.length) {
              state = 'done'; timer = 0;
              chef.cheer = 1.4;
              api.addStar(1);
              api.sfx.great();
              api.say('Order up!');
              api.sayWord(target.w, { queue: true });
            }
          }
        }

        if (state === 'done') {
          timer += dt;
          if (PH.speech.settled(timer, 2.2)) { newRound(); }
        }
      }

      /* ---- drawing ---- */

      /* Two slices of bread: the bottom one lying flat on the plate, the top one with the
         domed crust a slice actually has. Each is a tan crust with a paler crumb inside,
         which is what tells it apart from the fillings at a glance. */
      function bread(ctx, x, y, top) {
        ctx.save();
        ctx.strokeStyle = '#b3762f'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
        ctx.fillStyle = '#edcb92';
        if (top) {
          ctx.beginPath();
          ctx.moveTo(x - 84, y);
          ctx.lineTo(x - 84, y - 12);
          ctx.quadraticCurveTo(x - 84, y - 42, x - 42, y - 45);
          ctx.quadraticCurveTo(x, y - 58, x + 42, y - 45);
          ctx.quadraticCurveTo(x + 84, y - 42, x + 84, y - 12);
          ctx.lineTo(x + 84, y);
          ctx.closePath();
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#fbedcd';
          ctx.beginPath();
          ctx.moveTo(x - 73, y - 2);
          ctx.lineTo(x - 73, y - 12);
          ctx.quadraticCurveTo(x - 73, y - 34, x - 40, y - 37);
          ctx.quadraticCurveTo(x, y - 48, x + 40, y - 37);
          ctx.quadraticCurveTo(x + 73, y - 34, x + 73, y - 12);
          ctx.lineTo(x + 73, y - 2);
          ctx.closePath(); ctx.fill();
        } else {
          U.roundRect(ctx, x - 84, y - 8, 168, 26, 7); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#fbedcd';
          U.roundRect(ctx, x - 73, y - 3, 146, 16, 5); ctx.fill();
        }
        ctx.restore();
      }

      function ingredient(ctx, pt) {
        var dx = pt.wobble > 0 ? Math.sin(pt.wobble * 50) * 6 : 0;
        var x = pt.x + dx, y = pt.y;
        var w = 150, h = 30;
        if (x < -110 || x > api.W + 110) { return; }
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
        ctx.fillStyle = 'rgba(255,255,255,.35)';
        U.roundRect(ctx, x - w / 2 + 8, y - h + 3, w - 16, 7, 4); ctx.fill();   /* a little shine */
        ctx.restore();
      }

      /* The chef stays behind the counter and reaches up as each filling is taken: the
         thinking in this game is choosing the next chunk, and a character walking about
         between choices is only time spent watching rather than reading. */
      function drawChef(ctx) {
        var x = 150, y = COUNTER_Y - 4;
        var reaching = chef.reach > 0, cheering = chef.cheer > 0;
        var bounce = cheering ? Math.abs(Math.sin(chef.cheer * 9)) * 8 : 0;
        U.shadow(ctx, x, y + 2, 26, 5, 0.3);
        ctx.save();
        ctx.translate(x, y - bounce);
        ctx.scale(0.92, 0.92);
        var art = PH.art;
        art.kid(ctx, {
          skin: '#f2c29b', hairStyle: 'none', shirt: '#ffffff', pants: '#3a3f5c', shoes: '#2b2346',
          arms: (reaching || cheering) ? [2.5, 2.5] : null,
          look: reaching ? [0.3, -1] : [0.5, -0.3], blinkSeed: 2,
          mouth: (reaching || cheering) ? 'grin' : 'smile',
          body: function (c) {             /* apron and neckerchief */
            c.beginPath(); c.moveTo(-12, -48); c.lineTo(12, -48); c.lineTo(14, -24); c.quadraticCurveTo(0, -20, -14, -24); c.closePath();
            art.fillLit(c, '#ff5d8f', -48, -22, { lineWidth: 2.5 });
            c.beginPath(); c.moveTo(-9, -63); c.lineTo(9, -63); c.lineTo(0, -54); c.closePath();
            art.fillLit(c, '#ff5d8f', -63, -54, { lineWidth: 2 });
          },
          hat: function (c) {              /* a tall puffy toque */
            c.beginPath(); c.rect(-17, -30, 34, 16);
            art.fillLit(c, '#ffffff', -30, -14, { light: 0, dark: -0.12, lineWidth: 2.5 });
            [[-12, -38, 12], [12, -38, 12], [0, -46, 15]].forEach(function (p) {
              c.beginPath(); c.arc(p[0], p[1], p[2], 0, Math.PI * 2);
              art.fillLit(c, '#ffffff', p[1] - p[2], p[1] + p[2], { light: 0, dark: -0.14, lineWidth: 2.5 });
            });
            c.fillStyle = '#ffffff'; c.fillRect(-15, -34, 30, 16);
            c.strokeStyle = 'rgba(43,35,70,.25)'; c.lineWidth = 2;
            c.beginPath(); c.moveTo(-6, -28); c.lineTo(-6, -17); c.moveTo(6, -28); c.lineTo(6, -17); c.stroke();
          },
          front: function (c) {            /* a curly moustache */
            c.fillStyle = '#6b3f24';
            c.beginPath(); c.ellipse(-5, 10.5, 6, 3, 0.25, 0, Math.PI * 2); c.ellipse(5, 10.5, 6, 3, -0.25, 0, Math.PI * 2); c.fill();
          }
        });
        ctx.restore();
      }

      function drawTicket(ctx) {
        if (!target) { return; }
        var n = target.g.length, cw = 70, gap = 10;
        var total = n * cw + (n - 1) * gap + 150;
        var x = api.W / 2 - total / 2;
        /* an order ticket: cream paper with a red header stripe */
        U.plate(ctx, x, 16, total, 72, { fill: '#fff8e1', r: 14 });
        ctx.fillStyle = '#e03131';
        U.roundRect(ctx, x + 6, 20, 104, 64, 10); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.25)';
        U.roundRect(ctx, x + 10, 23, 96, 16, 6); ctx.fill();
        ctx.fillStyle = '#ffffff';
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
          /* little ones see the whole order; readers get a blank for the next chunk */
          var cellText = have ? have.g : (api.pre ? target.g[i] : (i === built.length ? '?' : ''));
          ctx.fillText(pics ? FOOD[cellText] || '' : cellText, sx + cw / 2, 53);
          sx += cw + gap;
        }
      }

      /* a sandwich bar: tiled wall, a neon sign, the belt, and the prep counter */
      function drawShop(ctx) {
        var now = performance.now() / 1000;
        var wall = ctx.createLinearGradient(0, 0, 0, api.H);
        wall.addColorStop(0, '#0c4a57');
        wall.addColorStop(1, '#0a2f3d');
        ctx.fillStyle = wall;
        ctx.fillRect(0, 0, api.W, api.H);
        /* white metro tiles, the way a sandwich bar is always tiled */
        ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 2;
        for (var ty = 100; ty < COUNTER_Y; ty += 44) {
          var off = ((ty - 100) / 44) % 2 ? 46 : 0;
          for (var tx = -92; tx < api.W; tx += 92) {
            ctx.strokeRect(tx + off, ty, 92, 44);
          }
        }

        /* neon sign, flickering gently */
        var flick = Math.sin(now * 13) > -0.95 ? 1 : 0.4;
        ctx.save();
        ctx.font = U.font(26);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = '#ff6b9e'; ctx.shadowBlur = 22 * flick;
        ctx.fillStyle = flick > 0.5 ? '#ffd6e6' : '#b9738c';
        ctx.fillText('SANDWICHES', 848, 54);
        ctx.shadowColor = '#74f0ff';
        ctx.strokeStyle = flick > 0.5 ? '#9ff5ff' : '#5a8d94'; ctx.lineWidth = 4;
        U.roundRect(ctx, 735, 26, 226, 56, 18); ctx.stroke();
        ctx.restore();

        /* the window display. An opaque fill first: the tile lines above leave the fill at
           six per cent alpha, which these would otherwise vanish into. */
        ctx.fillStyle = '#ffffff';
        ctx.font = '38px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🥪', 120, 56);
        ctx.fillText('🥤', 170, 60);

        /* pendant lamps with soft cones of light */
        var art = PH.art;
        [340, 735].forEach(function (lx, n) {
          var sw = Math.sin(now * 0.9 + n) * 3;
          var cone = ctx.createLinearGradient(0, 70, 0, 360);
          cone.addColorStop(0, 'rgba(255,230,160,.18)'); cone.addColorStop(1, 'rgba(255,230,160,0)');
          ctx.fillStyle = cone;
          ctx.beginPath(); ctx.moveTo(lx + sw - 20, 66); ctx.lineTo(lx + sw + 20, 66); ctx.lineTo(lx + sw + 130, 360); ctx.lineTo(lx + sw - 130, 360); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = art.INK; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx + sw, 44); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(lx + sw - 28, 68); ctx.quadraticCurveTo(lx + sw, 30, lx + sw + 28, 68); ctx.closePath();
          art.fillLit(ctx, '#ff5d8f', 40, 68, { lineWidth: 3 });
          art.ball(ctx, lx + sw, 70, 7, '#fff3a8', { lineWidth: 2 });
        });

        /* legs down to the counter, so the belt is mounted on something rather than
           hanging in the middle of the room */
        [70, 930].forEach(function (px) {
          var leg = ctx.createLinearGradient(px - 11, 0, px + 11, 0);
          leg.addColorStop(0, '#6c757d'); leg.addColorStop(0.5, '#e9eef2'); leg.addColorStop(1, '#6c757d');
          ctx.fillStyle = leg;
          U.roundRect(ctx, px - 11, BELT_TOP + BELT_H - 10, 22, COUNTER_Y - BELT_TOP - BELT_H + 16, 6);
          ctx.fill();
          ctx.strokeStyle = PH.art.INK; ctx.lineWidth = 2.5; ctx.stroke();
        });

        /* the belt: a dark rubber band on chrome rollers, its tread scrolling with it */
        ctx.fillStyle = '#c9d1d8';
        U.roundRect(ctx, -10, BELT_TOP + BELT_H - 6, api.W + 20, 16, 8); ctx.fill();
        ctx.strokeStyle = art.INK; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = '#3d4654';
        U.roundRect(ctx, -10, BELT_TOP, api.W + 20, BELT_H, 10); ctx.fill();
        ctx.strokeStyle = art.INK; ctx.lineWidth = 3; ctx.stroke();
        /* tread lines, moving at exactly the speed the fillings do */
        ctx.save();
        ctx.beginPath(); ctx.rect(0, BELT_TOP, api.W, BELT_H); ctx.clip();
        ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 5;
        for (var bx = -((scroll % 34) + 34); bx < api.W + 40; bx += 34) {
          ctx.beginPath(); ctx.moveTo(bx + 14, BELT_TOP + 4); ctx.lineTo(bx, BELT_TOP + BELT_H - 4); ctx.stroke();
        }
        ctx.restore();
        /* rollers peeping out at each end */
        [-4, api.W + 4].forEach(function (rx) {
          art.ball(ctx, rx, BELT_TOP + BELT_H / 2, 26, '#e9eef2', { lineWidth: 3 });
        });

        /* the prep counter: stainless steel with a bright edge */
        var steel = ctx.createLinearGradient(0, COUNTER_Y, 0, api.H);
        steel.addColorStop(0, '#dfe5ea'); steel.addColorStop(1, '#9aa5ae');
        ctx.fillStyle = steel;
        ctx.fillRect(0, COUNTER_Y + 6, api.W, api.H - COUNTER_Y);
        ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
        for (var gx = 0; gx < api.W; gx += 26) {
          ctx.beginPath(); ctx.moveTo(gx, COUNTER_Y + 16); ctx.lineTo(gx, api.H); ctx.stroke();
        }
        U.roundRect(ctx, -4, COUNTER_Y - 5, api.W + 8, 16, 6);
        var chrome = ctx.createLinearGradient(0, COUNTER_Y - 5, 0, COUNTER_Y + 11);
        chrome.addColorStop(0, '#ffffff'); chrome.addColorStop(1, '#868e96');
        ctx.fillStyle = chrome; ctx.fill();
        ctx.strokeStyle = art.INK; ctx.lineWidth = 3; ctx.stroke();
      }

      function draw(ctx) {
        drawShop(ctx);

        /* plate + the bottom slice */
        U.shadow(ctx, PLATE_X, COUNTER_Y + 8, 130, 12, 0.35);
        var pg = ctx.createRadialGradient(PLATE_X, COUNTER_Y, 10, PLATE_X, COUNTER_Y + 4, 110);
        pg.addColorStop(0, '#ffffff'); pg.addColorStop(1, '#dee2e6');
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.ellipse(PLATE_X, COUNTER_Y + 4, 110, 14, 0, 0, Math.PI * 2); ctx.fill();
        bread(ctx, PLATE_X, COUNTER_Y - 18, false);
        if (state === 'done') { bread(ctx, PLATE_X, COUNTER_Y - 36 - built.length * 26, true); }

        parts.forEach(function (pt) { if (pt.state !== 'stacked') { ingredient(ctx, pt); } });
        built.forEach(function (pt) { ingredient(ctx, pt); });
        drawChef(ctx);
        drawTicket(ctx);

        if (state === 'play' && idle > 3.5) {
          U.badge(ctx, api.W / 2, 178,
            built.length ? 'Which one comes next?' : 'Tap the one that starts it',
            { align: 'center', icon: '👆', size: 18 });
        }
      }

      newRound();
      return { update: update, draw: draw, down: down,
        move: function () {}, up: function () {},
        debug: function () {
          return { target: target, parts: parts, built: built.map(function (b) { return b.g; }),
            state: state, round: round, belt: { top: BELT_TOP, h: BELT_H, itemY: ITEM_Y } };
        } };
    }
  };
})(window.PH = window.PH || {});
