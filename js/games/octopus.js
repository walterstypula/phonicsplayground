/* Octopus Treasure Hunt - chests carry look-alike words; the octopus opens the one you pick */
(function (PH) {
  'use strict';
  var U = PH.util;
  var EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';

  PH.games.octopus = {
    id: 'octopus',
    name: 'Octopus Treasure Hunt',
    icon: '🐙',
    blurb: 'The chests have words that look almost the same. Read carefully and pick the one you hear.',

    create: function (api) {
      var ROUNDS = 6;
      var OCTO = { x: api.W / 2, y: 236 };
      var round = 0, target = null, chests = [], recent = [], treasure = 0;
      var hits = 0, misses = 0, state = 'play', timer = 0, active = null;
      var reach = 0;   /* 0 = tentacle curled up, 1 = touching the chest */
      var bubbles = [];
      for (var b = 0; b < 18; b++) {
        bubbles.push({ x: U.rand(0, api.W), y: U.rand(0, api.H), r: U.rand(2, 7), v: U.rand(18, 50) });
      }

      function newRound() {
        round++;
        if (round > ROUNDS) {
          api.finish(null, hits + misses ? hits / (hits + misses) : 1);
          state = 'over';
          return;
        }
        var pool = api.words.filter(function (w) { return recent.indexOf(w.w) < 0; });
        target = U.pick(pool.length > 6 ? pool : api.words);
        recent.push(target.w);
        if (recent.length > 5) { recent.shift(); }

        var n = api.pre ? 3 : (round <= 2 ? 3 : 4);
        /* ages 3 and 4: other real pictures or letters, never made-up words */
        var misses3 = api.pre
          ? U.shuffle(api.words.filter(function (w) { return w.w !== target.w; })).slice(0, n - 1)
            .map(function (w) { return { w: w.w, real: true }; })
          : PH.nearMisses(target, api.words, n - 1);
        /* top up with ordinary words if the generator came up short */
        var extra = U.shuffle(api.words.filter(function (w) { return w.w !== target.w; }));
        while (misses3.length < n - 1 && extra.length) {
          var e = extra.pop();
          if (!misses3.some(function (m) { return m.w === e.w; })) { misses3.push({ w: e.w, real: true }); }
        }
        var list = U.shuffle([{ w: target.w, real: true, right: true }].concat(misses3));
        var xs = n === 3 ? [210, 500, 790] : [140, 380, 620, 860];
        var loot = U.shuffle(['🥾', '🐚', '🦀', '🧦', '🪸']);
        chests = list.map(function (item, i) {
          return {
            text: item.w, real: item.real, right: !!item.right,
            x: xs[i], y: 500, w: 176, h: 104,
            lid: 0, shake: 0, junk: loot[i % loot.length], opened: false
          };
        });
        active = null; reach = 0; state = 'play';
        api.setProgress(round, ROUNDS);
        api.setPrompt(api.mode === 'pictures' ? 'Find the treasure' : 'Find the treasure word', { word: target.w, repeat: sayPrompt });
        sayPrompt();
      }

      function sayPrompt() {
        api.say(api.mode === 'pictures' ? 'Which chest has the' : 'Which chest says');
        api.sayWord(target.w, { queue: true });
      }

      function down(p) {
        if (state !== 'play') { return; }
        for (var i = 0; i < chests.length; i++) {
          var c = chests[i];
          if (Math.abs(p.x - c.x) <= c.w / 2 + 6 && p.y >= c.y - c.h / 2 - 30 && p.y <= c.y + c.h / 2 + 10) {
            active = c; state = 'reach'; timer = 0;
            api.sfx.whoosh();
            return;
          }
        }
      }

      function update(dt) {
        bubbles.forEach(function (bb) {
          bb.y -= bb.v * dt;
          if (bb.y < -10) { bb.y = api.H + 10; bb.x = U.rand(0, api.W); }
        });
        chests.forEach(function (c) { if (c.shake > 0) { c.shake -= dt; } });

        if (state === 'reach') {
          timer += dt;
          reach = U.clamp(timer / 0.4, 0, 1);
          if (reach >= 1) { state = 'open'; timer = 0; api.sfx.clank(); }
        } else if (state === 'open') {
          timer += dt;
          active.lid = U.clamp(timer / 0.3, 0, 1);
          if (active.lid >= 1) {
            active.opened = true;
            state = 'result'; timer = 0;
            if (active.right) {
              hits++; treasure++;
              api.addStar(1);
              api.sfx.coins();
              api.burst(active.x, active.y - 40, ['#ffd23f', '#ffb000', '#fff3a0'], 34, { lift: 260 });
              api.say('Treasure!');
              api.sayWord(target.w, { queue: true });
            } else {
              misses++;
              active.shake = 0.5;
              api.sfx.boing();
              if (active.real) {
                api.say(api.mode === 'pictures' ? 'That is a' : 'That one says');
                api.sayWord(active.text, { queue: true });
              } else {
                api.say('Not that one. Look again.');
              }
            }
          }
        } else if (state === 'result') {
          timer += dt;
          /* "Treasure! ... fox" - or, on a wrong chest, what that one actually says -
             has to finish before the next round talks over it */
          if (PH.speech.settled(timer, 1.5)) {
            if (active.right) { newRound(); return; }
            state = 'close'; timer = 0;
          }
        } else if (state === 'close') {
          timer += dt;
          active.lid = U.clamp(1 - timer / 0.25, 0, 1);
          reach = U.clamp(1 - timer / 0.35, 0, 1);
          if (reach <= 0) { active.opened = false; active = null; state = 'play'; }
        }
      }

      /* a tapered, outlined tentacle from the octopus to (tx, ty).
         curl (turns, + or -) rolls the tip into a little spiral, like a real octopus arm */
      function tentacle(ctx, sx, sy, tx, ty, bend, width, color, suckers, curl) {
        var cx = (sx + tx) / 2 + bend, cy = (sy + ty) / 2;
        var steps = 22, i, pts = [];
        for (i = 0; i <= steps; i++) {
          var t = i / steps;
          pts.push({
            x: (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * cx + t * t * tx,
            y: (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * cy + t * t * ty,
            w: width * (1 - t * 0.72)
          });
        }
        if (curl) {
          var last = pts[pts.length - 1], prev = pts[pts.length - 2];
          var ang = Math.atan2(last.y - prev.y, last.x - prev.x);
          var seg = Math.hypot(last.x - prev.x, last.y - prev.y), w0 = last.w;
          for (i = 1; i <= 12; i++) {
            ang += curl * 0.42;
            seg *= 0.9;
            last = { x: last.x + Math.cos(ang) * seg, y: last.y + Math.sin(ang) * seg, w: w0 * (1 - i / 16) };
            pts.push(last);
          }
        }
        ctx.lineCap = 'round';
        /* outline, colour, a pale underside and a shine along the top */
        [[PH.art.INK, 5, 0], [color, 0, 0], ['#ffc2dc', -0.45, 0.2], ['rgba(255,255,255,.3)', -0.75, -0.22]].forEach(function (pass) {
          ctx.strokeStyle = pass[0];
          for (i = 1; i < pts.length; i++) {
            ctx.lineWidth = pass[1] < 0 ? pts[i].w * -pass[1] * 0.6 : pts[i].w + pass[1];
            var off = pts[i].w * pass[2];
            ctx.beginPath(); ctx.moveTo(pts[i - 1].x, pts[i - 1].y + off); ctx.lineTo(pts[i].x, pts[i].y + off); ctx.stroke();
          }
        });
        if (suckers) {
          for (i = 4; i < Math.min(pts.length, steps + 1); i += 3) {
            ctx.fillStyle = '#fff0f6';
            ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y + pts[i].w * 0.24, pts[i].w * 0.17, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = 'rgba(170,40,100,.45)'; ctx.lineWidth = 1.5; ctx.stroke();
          }
        }
        return pts[pts.length - 1];
      }

      function drawOctopus(ctx) {
        var art = PH.art;
        var t = performance.now() / 1000;
        var PINK = '#ef6aa0';
        var ox = OCTO.x, oy = OCTO.y + Math.sin(t * 1.6) * 8;
        var happy = active && active.right && active.lid > 0.5;
        /* idle legs, tips curled outward; the far left one holds a spyglass */
        var glassAt = null;
        for (var i = 0; i < 7; i++) {
          var a = -0.9 + i * 0.3;
          var lx = ox + Math.sin(a) * 150 + Math.sin(t * 2 + i) * 16;
          var ly = oy + 120 + Math.cos(a) * 20 + Math.cos(t * 2.3 + i) * 10;
          if (i === 0) { lx = ox - 150; ly = oy + 40 + Math.sin(t * 1.2) * 6; }
          var tip = tentacle(ctx, ox + (i - 3) * 16, oy + 36, lx, ly, i === 0 ? 30 : Math.sin(t * 2 + i) * 40, 24, '#e2568f',
            true, i === 0 ? 0 : (i < 3 ? -1 : 1) * (0.9 + Math.sin(t * 1.7 + i) * 0.25));
          if (i === 0) { glassAt = tip; }
        }
        /* a brass spyglass, raised to look out for treasure */
        ctx.save();
        ctx.translate(glassAt.x, glassAt.y);
        ctx.rotate(-1.15 + Math.sin(t * 1.2) * 0.05);
        [[0, 30, 11, '#c9912e'], [28, 26, 9, '#e0aa45'], [52, 22, 7.5, '#c9912e']].forEach(function (s) {
          U.roundRect(ctx, s[0] - 6, -s[2], s[1], s[2] * 2, 4);
          art.fillLit(ctx, s[3], -s[2], s[2], { lineWidth: 2.5 });
        });
        ctx.beginPath(); ctx.ellipse(76, 0, 4, 8, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#bfe9ff'; ctx.fill(); ctx.strokeStyle = art.INK; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
        art.ball(ctx, glassAt.x, glassAt.y, 9, '#e2568f', { lineWidth: 3, shine: false });   /* the arm wrapped round it */

        /* the reaching leg */
        if (active && reach > 0) {
          var tx = U.lerp(ox, active.x, reach);
          var ty = U.lerp(oy + 80, active.y - active.h / 2 - 6, reach);
          tentacle(ctx, ox, oy + 36, tx, ty, (active.x < ox ? -1 : 1) * 60 * (1 - reach), 28, PINK, true, 0);
        }

        /* the head: a soft bulb, fuller at the top */
        function head() {
          ctx.beginPath();
          ctx.moveTo(ox - 74, oy + 36);
          ctx.bezierCurveTo(ox - 106, oy - 30, ox - 76, oy - 116, ox, oy - 116);
          ctx.bezierCurveTo(ox + 76, oy - 116, ox + 106, oy - 30, ox + 74, oy + 36);
          ctx.quadraticCurveTo(ox, oy + 58, ox - 74, oy + 36);
          ctx.closePath();
        }
        head();
        var g = ctx.createRadialGradient(ox - 34, oy - 60, 10, ox, oy - 20, 124);
        g.addColorStop(0, '#ffc2dc'); g.addColorStop(0.55, PINK); g.addColorStop(1, '#b8386f');
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = art.INK; ctx.lineWidth = 4; ctx.stroke();
        ctx.save(); head(); ctx.clip();
        ctx.fillStyle = 'rgba(190,50,110,.3)';                       /* freckly spots */
        [[-66, -30, 7], [-76, -4, 5], [-58, 12, 4], [66, -26, 6], [76, 0, 4.5], [58, 16, 3.5]].forEach(function (s) {
          ctx.beginPath(); ctx.arc(ox + s[0], oy + s[1], s[2], 0, Math.PI * 2); ctx.fill();
        });
        ctx.fillStyle = 'rgba(255,255,255,.4)';                      /* a big soft shine */
        ctx.beginPath(); ctx.ellipse(ox - 42, oy - 78, 22, 10, -0.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ox - 16, oy - 92, 4, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        /* a captain's tricorn hat with an anchor, tipped at a jaunty angle */
        ctx.save();
        ctx.translate(ox + 6, oy - 100);
        ctx.rotate(0.12 + Math.sin(t * 1.6) * 0.03);
        ctx.beginPath();                                                /* crown of the hat */
        ctx.moveTo(-52, 6); ctx.bezierCurveTo(-50, -44, 50, -44, 52, 6); ctx.closePath();
        art.fillLit(ctx, '#2e3270', -38, 6, { lineWidth: 3.5 });
        ctx.beginPath();                                                /* the upturned brim */
        ctx.moveTo(-86, -6);
        ctx.quadraticCurveTo(-60, 2, -40, -20);
        ctx.quadraticCurveTo(0, -4, 40, -20);
        ctx.quadraticCurveTo(60, 2, 86, -6);
        ctx.quadraticCurveTo(70, 22, 0, 22);
        ctx.quadraticCurveTo(-70, 22, -86, -6);
        ctx.closePath();
        art.fillLit(ctx, '#3a3f86', -20, 22, { lineWidth: 3.5 });
        ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = 3.5;              /* gold trim */
        ctx.beginPath();
        ctx.moveTo(-80, -4); ctx.quadraticCurveTo(-60, 3, -41, -16);
        ctx.quadraticCurveTo(0, -1, 41, -16);
        ctx.quadraticCurveTo(60, 3, 80, -4);
        ctx.stroke();
        /* a gold anchor badge */
        ctx.save(); ctx.translate(0, -14);
        ctx.strokeStyle = art.INK; ctx.lineWidth = 7; ctx.lineCap = 'round';
        function anchor() {
          ctx.beginPath();
          ctx.moveTo(0, -9); ctx.lineTo(0, 9);
          ctx.moveTo(-6, -4); ctx.lineTo(6, -4);
          ctx.moveTo(-9, 3); ctx.quadraticCurveTo(-8, 11, 0, 11); ctx.quadraticCurveTo(8, 11, 9, 3);
          ctx.stroke();
        }
        anchor();
        ctx.strokeStyle = '#f2c14e'; ctx.lineWidth = 3.5; anchor();
        art.ball(ctx, 0, -12, 3.5, '#f2c14e', { lineWidth: 2, shine: false });
        ctx.restore();
        ctx.restore();

        /* big eyes that follow the chest being opened, under bouncy brows */
        var look = active ? [U.clamp((active.x - ox) / 300, -1, 1), 0.6] : [Math.sin(t * 0.7) * 0.5, 0.2];
        var bl = art.blink(11);
        [-30, 30].forEach(function (ex) {
          art.eye(ctx, ox + ex, oy - 22, 20, { iris: '#3a86ff', look: look, blink: bl, lid: '#f07aac', happy: happy });
        });
        var up = active ? -6 : Math.sin(t * 1.3) * 1.5;
        ctx.strokeStyle = art.INK; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ox - 46, oy - 52 + up); ctx.quadraticCurveTo(ox - 32, oy - 60 + up, ox - 16, oy - 54 + up);
        ctx.moveTo(ox + 46, oy - 52 + up); ctx.quadraticCurveTo(ox + 32, oy - 60 + up, ox + 16, oy - 54 + up);
        ctx.stroke();
        art.cheeks(ctx, ox, oy + 6, 100, 13, 'rgba(255,90,140,.45)');
        if (active && !happy) { art.mouth(ctx, ox, oy + 12, 24, 'o'); }
        else { art.mouth(ctx, ox, oy + 12, 30, 'grin'); }
      }

      function drawChest(ctx, c) {
        var dx = c.shake > 0 ? Math.sin(c.shake * 60) * 8 : 0;
        var x = c.x - c.w / 2 + dx, y = c.y - c.h / 2;
        ctx.save();
        /* inside glow + contents once open */
        if (c.lid > 0.3) {
          if (c.right) {
            ctx.fillStyle = 'rgba(255,220,90,' + (0.5 * c.lid) + ')';
            ctx.beginPath(); ctx.arc(c.x + dx, y, 90, 0, Math.PI * 2); ctx.fill();
          }
          ctx.font = '54px ' + EMOJI;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(c.right ? '💎' : c.junk, c.x + dx, y - 26 * c.lid);
        }
        /* box */
        U.shadow(ctx, c.x + dx, y + c.h + 6, c.w * 0.6, 12, 0.35);
        var wood = ctx.createLinearGradient(0, y, 0, y + c.h);
        wood.addColorStop(0, '#b56d37'); wood.addColorStop(1, '#7a4320');
        ctx.fillStyle = wood;
        U.roundRect(ctx, x, y, c.w, c.h, 12); ctx.fill();
        ctx.strokeStyle = 'rgba(60,30,10,.35)'; ctx.lineWidth = 2;
        for (var gy = y + 40; gy < y + c.h - 6; gy += 16) {
          ctx.beginPath(); ctx.moveTo(x + 6, gy); ctx.lineTo(x + c.w - 6, gy); ctx.stroke();
        }
        var art = PH.art;
        ctx.strokeStyle = art.INK; ctx.lineWidth = 3.5;
        U.roundRect(ctx, x, y, c.w, c.h, 12); ctx.stroke();
        ctx.fillStyle = 'rgba(60,30,10,.35)';
        ctx.fillRect(x + 2, y + 18, c.w - 4, 10);
        [x + 12, x + c.w - 28].forEach(function (bx) {
          ctx.beginPath(); ctx.rect(bx, y, 16, c.h);
          art.fillLit(ctx, '#f2c14e', y, y + c.h, { lineWidth: 2.5 });
          [y + 10, y + c.h - 12].forEach(function (ry) { art.ball(ctx, bx + 8, ry, 3, '#fff1b8', { lineWidth: 1.5, shine: false }); });
        });
        /* word plaque */
        var shown = api.label(c.text);
        var fs = api.mode === 'letters' ? 40 : (shown.length > 7 ? 20 : (shown.length > 5 ? 25 : 30));
        U.plate(ctx, x + 22, y + 36, c.w - 44, 50, { fill: '#fff4d6', r: 10, edge: '#8a5a2b', shadow: false });
        ctx.fillStyle = '#3b2412';
        ctx.font = U.font(fs);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(shown, c.x + dx, y + 64);
        /* a domed lid, hinged at the back, with a lock */
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(1, 1 - c.lid * 1.6);
        ctx.beginPath();
        ctx.moveTo(0, 4); ctx.lineTo(0, -14); ctx.quadraticCurveTo(0, -36, 24, -36);
        ctx.lineTo(c.w - 24, -36); ctx.quadraticCurveTo(c.w, -36, c.w, -14); ctx.lineTo(c.w, 4); ctx.closePath();
        art.fillLit(ctx, '#c47a3f', -36, 4, { lineWidth: 3.5 });
        ctx.strokeStyle = 'rgba(60,30,10,.35)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(6, -20); ctx.lineTo(c.w - 6, -20); ctx.stroke();
        [12, c.w - 28].forEach(function (bx) {
          ctx.beginPath(); ctx.rect(bx, -35, 16, 39);
          art.fillLit(ctx, '#f2c14e', -35, 4, { lineWidth: 2.5 });
        });
        U.roundRect(ctx, c.w / 2 - 12, -14, 24, 24, 5);
        art.fillLit(ctx, '#f2c14e', -14, 10, { lineWidth: 2.5 });
        ctx.fillStyle = art.INK;
        ctx.beginPath(); ctx.arc(c.w / 2, -4, 3.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(c.w / 2 - 1.5, -4, 3, 8);
        ctx.restore();
        ctx.restore();
      }

      function draw(ctx) {
        var sea = ctx.createLinearGradient(0, 0, 0, api.H);
        sea.addColorStop(0, '#46c3e8');
        sea.addColorStop(1, '#0d3f6e');
        ctx.fillStyle = sea;
        ctx.fillRect(0, 0, api.W, api.H);

        var art = PH.art;
        var t = performance.now() / 1000;
        /* sunbeams slanting down through the water */
        ctx.fillStyle = 'rgba(255,255,255,.07)';
        for (var ray = 0; ray < 5; ray++) {
          var rx = 80 + ray * 210 + Math.sin(t * 0.3 + ray) * 20;
          ctx.beginPath(); ctx.moveTo(rx, 0); ctx.lineTo(rx + 70, 0); ctx.lineTo(rx - 60, 560); ctx.lineTo(rx - 150, 560); ctx.closePath(); ctx.fill();
        }
        /* far-off rocks in the blue haze */
        ctx.fillStyle = 'rgba(20,80,130,.45)';
        ctx.beginPath(); ctx.moveTo(0, 540);
        ctx.quadraticCurveTo(60, 400, 150, 440); ctx.quadraticCurveTo(210, 360, 300, 470);
        ctx.lineTo(300, 540); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(680, 540);
        ctx.quadraticCurveTo(760, 380, 850, 430); ctx.quadraticCurveTo(930, 340, api.W, 420);
        ctx.lineTo(api.W, 540); ctx.closePath(); ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,.35)';
        bubbles.forEach(function (bb) {
          ctx.beginPath(); ctx.arc(bb.x, bb.y, bb.r, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.5; ctx.stroke();
        });

        /* sand with ripples, shells and a starfish */
        ctx.beginPath();
        ctx.moveTo(0, api.H);
        ctx.lineTo(0, 540);
        ctx.quadraticCurveTo(250, 510, 500, 545);
        ctx.quadraticCurveTo(760, 575, api.W, 530);
        ctx.lineTo(api.W, api.H);
        ctx.closePath();
        art.fillLit(ctx, '#ecd39a', 510, api.H, { light: 0.2, dark: -0.15, lineWidth: 3 });
        ctx.strokeStyle = 'rgba(160,120,60,.3)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        [[120, 590], [380, 600], [620, 612], [860, 590], [240, 620]].forEach(function (p) {
          ctx.beginPath(); ctx.moveTo(p[0] - 30, p[1]); ctx.quadraticCurveTo(p[0], p[1] - 6, p[0] + 30, p[1]); ctx.stroke();
        });
        /* coral and swaying weed behind the chests */
        [[40, '#2f9e6b', 140], [960, '#2f9e6b', 130], [270, '#3fbf7f', 110], [730, '#3fbf7f', 120]].forEach(function (w, k) {
          ctx.save();
          ctx.translate(w[0], 562);
          var sway = Math.sin(t * 1.25 + k) * 0.15;
          ctx.beginPath(); ctx.moveTo(-8, 0);
          for (var sg = 1; sg <= 5; sg++) {
            var sy = -w[2] * sg / 5;
            ctx.quadraticCurveTo((sg % 2 ? 14 : -14) + sway * sy * -0.5, sy + w[2] / 10, sway * sy * -0.9, sy);
          }
          ctx.quadraticCurveTo(sway * w[2] * 0.9 + 12, -w[2] + 10, 8, 0);
          ctx.closePath();
          art.fillLit(ctx, w[1], -w[2], 0, { lineWidth: 2.5 });
          ctx.restore();
        });
        [[150, '#ff7eb6'], [870, '#ff9f40']].forEach(function (cr) {
          ctx.save(); ctx.translate(cr[0], 556);
          ctx.strokeStyle = art.INK; ctx.lineCap = 'round';
          var branches = [[0, 0, 0, -50], [0, -24, -24, -54], [0, -30, 22, -62], [-14, -40, -30, -44], [12, -46, 30, -50]];
          [[12, art.INK], [7, cr[1]]].forEach(function (pass) {
            ctx.strokeStyle = pass[1]; ctx.lineWidth = pass[0];
            branches.forEach(function (b) { ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(b[2], b[3]); ctx.stroke(); });
          });
          ctx.restore();
        });
        ctx.save(); ctx.translate(430, 612); ctx.rotate(0.3);
        U.star(ctx, 0, 0, 16, 8);
        art.fillLit(ctx, '#ff8c5a', -16, 16, { lineWidth: 2.5 });
        ctx.fillStyle = 'rgba(255,255,255,.6)';
        ctx.beginPath(); ctx.arc(0, 0, 2, 0, Math.PI * 2); ctx.arc(-6, -4, 1.5, 0, Math.PI * 2); ctx.arc(6, -3, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        [[560, 624, '#ffd1dc'], [80, 614, '#fff1c9'], [940, 606, '#d9c8ff']].forEach(function (sh) {
          ctx.beginPath(); ctx.moveTo(sh[0] - 11, sh[1] + 5); ctx.quadraticCurveTo(sh[0], sh[1] - 16, sh[0] + 11, sh[1] + 5); ctx.closePath();
          art.fillLit(ctx, sh[2], sh[1] - 12, sh[1] + 5, { lineWidth: 2 });
          ctx.strokeStyle = 'rgba(43,35,70,.4)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(sh[0], sh[1] + 4); ctx.lineTo(sh[0], sh[1] - 8); ctx.moveTo(sh[0] - 5, sh[1] + 4); ctx.lineTo(sh[0] - 3, sh[1] - 6); ctx.moveTo(sh[0] + 5, sh[1] + 4); ctx.lineTo(sh[0] + 3, sh[1] - 6); ctx.stroke();
        });

        drawOctopus(ctx);
        chests.forEach(function (c) { drawChest(ctx, c); });

        U.badge(ctx, 18, 16, 'Treasure: ' + treasure, { icon: '💰' });
      }

      newRound();
      return { update: update, draw: draw, down: down };
    }
  };
})(window.PH = window.PH || {});
