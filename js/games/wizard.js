/* Wizard's Spellbook - read the spell card yourself, then tap the picture it means.
   The voice stays quiet until you have chosen: this is the one game that is real reading. */
(function (PH) {
  'use strict';
  var U = PH.util;
  var EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  var OOPS = ['🐸', '🦆', '🐟', '🦨', '🐌'];   /* silly spell results */

  PH.games.wizard = {
    id: 'wizard',
    name: "Wizard's Spellbook",
    icon: '🧙',
    blurb: 'Read the spell card all by yourself, then tap the picture it means. Cast it right and it pops out of the cauldron!',

    create: function (api) {
      var ROUNDS = 6;
      var CAUL = { x: 560, y: 520 };
      var CARD_Y = 70;
      var round = 0, spell = null, options = [], recent = [], book = [];
      var hits = 0, misses = 0, state = 'read', timer = 0, chosen = null, helpBtn = null;
      var sparkle = [], bubbles = [], i;
      for (i = 0; i < 12; i++) { bubbles.push({ x: U.rand(-60, 60), t: U.rand(0, 2), r: U.rand(5, 12) }); }
      var pics = api.mode === 'pictures', letters = api.mode === 'letters';
      var phrases = api.level.id >= 4;

      /* ---------------- building a spell ---------------- */
      function readPool() {
        return api.words.filter(function (w) { return PH.picOf(w.w); });
      }

      function distinctPictures(list) {
        var seen = {};
        return list.filter(function (w) {
          var p = PH.picOf(w.w);
          if (seen[p]) { return false; }
          seen[p] = 1;
          return true;
        });
      }

      function wordSpell() {
        var pool = pics ? PH.PICTURES : readPool();
        var fresh = pool.filter(function (w) { return recent.indexOf(w.w) < 0; });
        var t = U.pick(fresh.length > 4 ? fresh : pool);
        /* look-alikes that share a sound or an ending make the child read every letter */
        var alike = pool.filter(function (w) {
          return w.w !== t.w && (w.rime === t.rime || PH.firstSound(w) === PH.firstSound(t));
        });
        var rest = pool.filter(function (w) { return w.w !== t.w && alike.indexOf(w) < 0; });
        var others = distinctPictures([t].concat(U.shuffle(alike).slice(0, 1), U.shuffle(rest))).slice(1, 3);
        return {
          key: t.w, card: t.w, speak: t.w, sayCard: pics,
          options: U.shuffle([{ pics: [PH.picOf(t.w)], name: t.w, right: true }].concat(others.map(function (w) {
            return { pics: [PH.picOf(w.w)], name: w.w, right: false };
          })))
        };
      }

      function letterSpell() {
        var L = U.pick(api.words.filter(function (w) { return recent.indexOf(w.w) < 0; }));
        var yes = PH.PICTURES.filter(function (p) { return PH.firstSound(p) === L.w; });
        /* never offer a wrong picture that starts with the same SOUND (key for c, cat for k) */
        var no = PH.PICTURES.filter(function (p) { return PH.soundHint(PH.firstSound(p)) !== PH.soundHint(L.w); });
        var right = U.pick(yes.length ? yes : [PH.PICTURES.filter(function (p) { return p.w === L.key; })[0]]);
        var others = distinctPictures([right].concat(U.shuffle(no))).slice(1, 3);
        return {
          key: L.w, card: L.w, speak: L.w, sayCard: true, rightName: right.w,
          options: U.shuffle([{ pics: [right.pic], name: right.w, right: true }].concat(others.map(function (p) {
            return { pics: [p.pic], name: p.w, right: false };
          })))
        };
      }

      function phraseSpell() {
        var P = PH.PHRASE_PARTS[api.level.id];
        var who = U.pick(P.who), what = U.pick(P.what), frame = U.pick(P.frames);
        var who2 = U.pick(P.who.filter(function (w) { return w !== who; }));
        var what2 = U.pick(P.what.filter(function (w) { return w !== what; }));
        function text(a, b) {
          return frame.replace('%s', a).replace('%o', b).replace(/\ba (?=[aeiou])/g, 'an ');
        }
        return {
          key: who + what, card: text(who, what), speak: text(who, what), sayCard: false,
          options: U.shuffle([
            { pics: [PH.picOf(who), PH.picOf(what)], name: text(who, what), right: true },
            { pics: [PH.picOf(who), PH.picOf(what2)], name: text(who, what2), right: false },
            { pics: [PH.picOf(who2), PH.picOf(what)], name: text(who2, what), right: false }
          ])
        };
      }

      function newRound() {
        round++;
        if (round > ROUNDS) {
          api.finish('Spellbook full!', hits + misses ? hits / (hits + misses) : 1);
          state = 'over';
          return;
        }
        spell = phrases ? phraseSpell() : (letters ? letterSpell() : wordSpell());
        recent.push(spell.key);
        if (recent.length > 5) { recent.shift(); }
        options = spell.options.map(function (o, k) {
          return { pics: o.pics, name: o.name, right: o.right, x: 380 + k * 180, y: 300, r: 72, bob: U.rand(0, 6), gone: 0, shake: 0 };
        });
        chosen = null;
        state = 'read'; timer = 0;
        api.setProgress(round, ROUNDS);
        /* the card is on the canvas; readers get no spoken word here on purpose */
        api.setPrompt(pics ? 'Make a' : (letters ? 'What starts with' : 'Read the spell!'),
          { word: spell.sayCard ? spell.card : '', show: true, repeat: sayPrompt });
        sayPrompt();
      }

      function sayPrompt() {
        if (!spell) { return; }
        if (pics) { api.say('Make a'); api.sayWord(spell.speak, { queue: true }); return; }
        if (letters) { api.say('Which picture starts with'); api.sayWord(spell.speak, { queue: true }); return; }
        api.say(round === 1 ? 'Read the spell card, then tap the picture it makes.' : 'New spell!');
      }

      /* help: sound the word out so the child can blend it, rather than just hearing it */
      function help() {
        api.sfx.twinkle();
        if (pics || letters) { sayPrompt(); return; }
        if (phrases) {
          spell.card.split(' ').forEach(function (w, k) { api.say(w, { rate: 0.6, queue: k > 0 }); });
          return;
        }
        var w = api.words.filter(function (x) { return x.w === spell.card; })[0];
        if (!w) { return; }
        var parts = api.level.id === 5 ? w.g : PH.soundHintsFor(w);
        parts.forEach(function (p, k) { api.say(p, { rate: 0.5, queue: k > 0 }); });
      }

      /* ---------------- input ---------------- */
      function down(p) {
        if (helpBtn && p.x >= helpBtn.x && p.x <= helpBtn.x + helpBtn.w && p.y >= helpBtn.y && p.y <= helpBtn.y + helpBtn.h) {
          help();
          return;
        }
        if (state !== 'read') { return; }
        for (var k = 0; k < options.length; k++) {
          var o = options[k];
          if (!o.gone && U.dist(p.x, p.y, o.x, o.y) <= o.r + 10) {
            chosen = o;
            state = 'cast'; timer = 0;
            api.sfx.zap();
            return;
          }
        }
      }

      /* ---------------- update ---------------- */
      function update(dt) {
        options.forEach(function (o) { o.bob += dt * 2; if (o.shake > 0) { o.shake -= dt; } });
        bubbles.forEach(function (b) { b.t += dt; if (b.t > 2) { b.t = 0; b.x = U.rand(-60, 60); } });
        for (var k = sparkle.length - 1; k >= 0; k--) {
          sparkle[k].t += dt;
          if (sparkle[k].t > sparkle[k].life) { sparkle.splice(k, 1); }
        }

        if (state === 'cast') {
          timer += dt;
          if (timer > 0.45) {
            chosen.gone = 1;
            api.burst(chosen.x, chosen.y, ['#c89bff', '#ffd23f', '#ffffff'], 20);
            if (chosen.right) {
              hits++;
              api.addStar(1);
              api.sfx.great();
              book.push(chosen.pics);
              state = 'reveal'; timer = 0;
              api.say('Abracadabra!');
              if (letters) {
                api.sayWord(spell.speak, { queue: true });
                api.say('is for ' + chosen.name, { queue: true });
              } else {
                api.say(spell.speak, { queue: true, rate: 0.8 });
              }
            } else {
              misses++;
              state = 'oops'; timer = 0;
              api.sfx.raspberry();
              api.say('Oops! That spell makes');
              api.say(chosen.name, { queue: true, rate: 0.8 });
              api.say(pics ? 'Try again.' : 'Read it again.', { queue: true });
            }
          }
        } else if (state === 'reveal') {
          timer += dt;
          if (timer > 2.4) { newRound(); }
        } else if (state === 'oops') {
          timer += dt;
          if (timer > 1.8) {
            chosen.gone = 0; chosen.shake = 0.5; chosen = null;
            state = 'read';
          }
        }
      }

      /* ---------------- drawing ---------------- */
      function drawPics(ctx, list, x, y, size) {
        ctx.font = size + 'px ' + EMOJI;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (list.length === 1) { ctx.fillText(list[0], x, y); return; }
        ctx.fillText(list[0], x - size * 0.42, y);
        ctx.fillText(list[1], x + size * 0.42, y + size * 0.08);
      }

      function drawWizard(ctx) {
        var art = PH.art;
        var x = 150, y = 560;
        var t = performance.now() / 1000;
        var bob = Math.sin(t * 1.6) * 3;
        var casting = state === 'cast', oops = state === 'oops', happy = state === 'reveal';
        var wave = casting ? -1.25 : (happy ? -0.9 + Math.sin(t * 8) * 0.15 : Math.sin(t * 1.5) * 0.08 - 0.3);
        U.shadow(ctx, x, y + 4, 95, 14, 0.4);
        ctx.save();
        ctx.translate(x, y);
        /* curly-toed slippers poking out under the robe */
        [-1, 1].forEach(function (s) {
          ctx.beginPath();
          ctx.moveTo(s * 18, -2); ctx.quadraticCurveTo(s * 44, -16, s * 54, -12);
          ctx.quadraticCurveTo(s * 60, -24, s * 50, -26); ctx.quadraticCurveTo(s * 58, -4, s * 30, 4);
          ctx.quadraticCurveTo(s * 14, 6, s * 18, -2); ctx.closePath();
          art.fillLit(ctx, '#e8455f', -26, 6, { lineWidth: 3 });
        });
        ctx.translate(0, bob);
        /* the robe: a bell that sways a little at the hem */
        var sway = Math.sin(t * 1.3) * 5;
        ctx.beginPath();
        ctx.moveTo(-34, -196);
        ctx.quadraticCurveTo(-60, -110, -78 + sway, -8);
        ctx.quadraticCurveTo(-52, 4, -28 + sway, -6);
        ctx.quadraticCurveTo(-4, 6, 20 + sway, -6);
        ctx.quadraticCurveTo(48, 4, 78 + sway, -10);
        ctx.quadraticCurveTo(58, -110, 34, -196);
        ctx.quadraticCurveTo(0, -206, -34, -196);
        ctx.closePath();
        art.fillLit(ctx, '#6a45d8', -200, 0, { light: 0.2, dark: -0.35, lineWidth: 3.5 });
        /* folds and a gold hem */
        ctx.save(); ctx.clip();
        ctx.strokeStyle = 'rgba(30,10,80,.28)'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-22, -120); ctx.quadraticCurveTo(-34, -60, -40 + sway, -8);
        ctx.moveTo(12, -110); ctx.quadraticCurveTo(22, -50, 30 + sway, -6);
        ctx.stroke();
        ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(-80 + sway, -14);
        ctx.quadraticCurveTo(-52, -2, -28 + sway, -12);
        ctx.quadraticCurveTo(-4, 0, 20 + sway, -12);
        ctx.quadraticCurveTo(48, -2, 80 + sway, -16);
        ctx.stroke();
        ctx.restore();
        /* stars and a moon on the cloth, twinkling */
        [[-38, -58, 9], [26, -128, 7], [18, -40, 8], [-14, -160, 6], [44, -70, 6]].forEach(function (s, i) {
          ctx.fillStyle = '#ffd23f';
          ctx.globalAlpha = 0.75 + Math.sin(t * 3 + i) * 0.25;
          U.star(ctx, s[0], s[1], s[2], s[2] * 0.45); ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#ffe9a6';
        ctx.beginPath(); ctx.arc(-26, -86, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#6346d0';
        ctx.beginPath(); ctx.arc(-22, -89, 8, 0, Math.PI * 2); ctx.fill();
        /* a rope belt with a tassel */
        ctx.strokeStyle = '#ffb627'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.moveTo(-44, -112); ctx.quadraticCurveTo(0, -100, 44, -112); ctx.stroke();
        art.limb(ctx, 10, -106, 14, -80, 5, '#ffb627');
        art.ball(ctx, 14, -78, 5, '#ffb627', { lineWidth: 2, shine: false });

        /* head */
        var hx = 0, hy = -222;
        var bl = casting || happy ? 0 : art.blink(5);
        art.ball(ctx, hx - 30, hy + 4, 9, '#f6c9a0', { shine: false });
        art.ball(ctx, hx + 30, hy + 4, 9, '#f6c9a0', { shine: false });
        ctx.beginPath(); ctx.arc(hx, hy, 31, 0, Math.PI * 2);
        art.fillLit(ctx, '#f6c9a0', hy - 31, hy + 31, { light: 0.18, dark: -0.12 });
        /* the big fluffy beard: a pile of cloud puffs, outlined as one */
        var puffs = [[-27, 16, 14], [27, 16, 14], [-30, 36, 15], [30, 36, 15], [-24, 58, 16], [24, 58, 16],
          [-12, 78, 15], [12, 78, 15], [0, 96, 14], [0, 40, 20], [0, 60, 20]];
        function puffY(p) { return hy + p[1] + Math.sin(t * 1.6 + p[1] * 0.05) * 1.5; }
        ctx.fillStyle = art.INK;
        puffs.forEach(function (p) {
          ctx.beginPath(); ctx.arc(hx + p[0], puffY(p), p[2] + 3, 0, Math.PI * 2); ctx.fill();
        });
        puffs.forEach(function (p) {
          var py = puffY(p);
          var g = ctx.createRadialGradient(hx + p[0] - 5, py - 6, 2, hx + p[0], py, p[2]);
          g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#d6d9ee');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(hx + p[0], py, p[2], 0, Math.PI * 2); ctx.fill();
        });
        /* mouth peeking out of the beard */
        if (oops) { art.mouth(ctx, hx, hy + 25, 14, 'o'); }
        else if (happy || casting) { art.mouth(ctx, hx, hy + 25, 18, 'grin'); }
        /* a curly moustache */
        [-1, 1].forEach(function (s) {
          ctx.beginPath();
          ctx.moveTo(hx, hy + 15);
          ctx.quadraticCurveTo(hx + s * 16, hy + 9, hx + s * 24, hy + 19);
          ctx.quadraticCurveTo(hx + s * 30, hy + 9, hx + s * 21, hy + 6);
          ctx.quadraticCurveTo(hx + s * 22, hy + 13, hx + s * 16, hy + 17);
          ctx.quadraticCurveTo(hx + s * 8, hy + 23, hx, hy + 20);
          ctx.closePath();
          art.fillLit(ctx, '#f2f3fb', hy, hy + 23, { lineWidth: 2.5, light: 0.3, dark: -0.1 });
        });
        /* a round rosy nose */
        art.ball(ctx, hx, hy + 6, 8.5, '#f59a86', { lineWidth: 2.5 });
        art.cheeks(ctx, hx, hy + 6, 40, 7, 'rgba(255,110,140,.35)');
        /* eyes behind half-moon spectacles */
        art.eyes(ctx, hx, hy - 6, 26, 5.6, { dot: true, blink: bl, look: [0.6, 0], happy: happy });
        ctx.strokeStyle = '#c99a2e'; ctx.lineWidth = 2.5;
        [-13, 13].forEach(function (dx) {
          ctx.beginPath(); ctx.arc(hx + dx, hy - 5, 10, 0.05, Math.PI - 0.05);
          ctx.stroke();
        });
        ctx.beginPath(); ctx.moveTo(hx - 3, hy - 5); ctx.quadraticCurveTo(hx, hy - 9, hx + 3, hy - 5); ctx.stroke();
        /* bushy eyebrows that jump when something happens */
        var up = oops || casting ? -6 : 0;
        [-1, 1].forEach(function (s) {
          ctx.beginPath();
          ctx.moveTo(hx + s * 5, hy - 22 + up);
          ctx.quadraticCurveTo(hx + s * 14, hy - 32 + up, hx + s * 25, hy - 22 + up);
          ctx.quadraticCurveTo(hx + s * 16, hy - 24 + up, hx + s * 5, hy - 18 + up);
          ctx.closePath();
          art.fillLit(ctx, '#f2f3fb', hy - 32, hy - 18, { lineWidth: 2.5 });
        });

        /* the hat: a tall cone whose tip flops over, a gold band and a wide brim */
        ctx.save(); ctx.translate(0, -12);
        var flop = Math.sin(t * 1.2) * 4;
        ctx.beginPath();
        ctx.moveTo(hx - 34, hy - 26);
        ctx.quadraticCurveTo(hx - 12, hy - 90, hx + 4, hy - 130);
        ctx.quadraticCurveTo(hx + 30, hy - 150, hx + 56 + flop, hy - 128);
        ctx.quadraticCurveTo(hx + 30, hy - 132, hx + 24, hy - 110);
        ctx.quadraticCurveTo(hx + 30, hy - 70, hx + 36, hy - 26);
        ctx.closePath();
        art.fillLit(ctx, '#6a45d8', hy - 150, hy - 26, { light: 0.25, dark: -0.3, lineWidth: 3.5 });
        U.star(ctx, hx + 58 + flop, hy - 128, 9, 4);
        ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.strokeStyle = art.INK; ctx.lineWidth = 2; ctx.stroke();
        U.star(ctx, hx + 2, hy - 72, 10, 4.5); ctx.fillStyle = '#ffd23f'; ctx.fill();
        ctx.fillStyle = '#ffe9a6';
        ctx.beginPath(); ctx.arc(hx + 14, hy - 104, 4, 0, Math.PI * 2); ctx.arc(hx - 12, hy - 50, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(hx - 34, hy - 26); ctx.quadraticCurveTo(hx, hy - 36, hx + 36, hy - 26);
        ctx.lineTo(hx + 34, hy - 40); ctx.quadraticCurveTo(hx, hy - 50, hx - 30, hy - 40); ctx.closePath();
        art.fillLit(ctx, '#ffb627', hy - 50, hy - 26, { lineWidth: 2.5 });
        ctx.beginPath(); ctx.ellipse(hx + 2, hy - 24, 64, 12, -0.05, 0, Math.PI * 2);
        art.fillLit(ctx, '#5a38c4', hy - 36, hy - 12, { lineWidth: 3.5 });

        ctx.restore();

        /* the wand arm: a big droopy sleeve, a hand and a glowing star */
        ctx.save();
        ctx.translate(34, -176);
        ctx.rotate(wave);
        ctx.save(); ctx.translate(70, 0); ctx.rotate(-0.15);
        U.roundRect(ctx, 0, -5, 80, 10, 5);
        art.fillLit(ctx, '#8a5a34', -5, 5, { lineWidth: 2.5 });
        ctx.fillStyle = '#ffffff'; ctx.fillRect(68, -3.5, 10, 7);
        ctx.restore();
        art.ball(ctx, 70, 0, 11, '#f6c9a0', { lineWidth: 3, shine: false });
        ctx.beginPath();
        ctx.moveTo(-6, -16); ctx.lineTo(50, -14);
        ctx.quadraticCurveTo(70, 0, 66, 28); ctx.quadraticCurveTo(50, 18, 42, 14);
        ctx.lineTo(-4, 16); ctx.closePath();
        art.fillLit(ctx, '#6a45d8', -16, 28, { lineWidth: 3 });
        ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(51, -12); ctx.quadraticCurveTo(69, 0, 65, 25); ctx.stroke();
        var sx = 156, sy = -24;
        var glow = ctx.createRadialGradient(sx, sy, 2, sx, sy, 36);
        glow.addColorStop(0, 'rgba(255,240,150,.8)'); glow.addColorStop(1, 'rgba(255,240,150,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(sx, sy, 36, 0, Math.PI * 2); ctx.fill();
        ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * 1.5);
        U.star(ctx, 0, 0, casting ? 18 : 14, casting ? 8 : 6);
        ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.strokeStyle = art.INK; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#ffffff';
        for (var sp = 0; sp < 3; sp++) {
          var st = (t * 1.4 + sp / 3) % 1;
          ctx.globalAlpha = 1 - st;
          U.star(ctx, sx - st * 40 + sp * 8, sy + st * 30 - sp * 10, 4, 1.6); ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();
        ctx.restore();
      }

      function drawCauldron(ctx) {
        var art = PH.art;
        var t = performance.now() / 1000;
        var brew = state === 'oops' ? '#b36bff' : '#5ee88a';
        /* the fire lights the floor under the pot */
        var fireGlow = ctx.createRadialGradient(CAUL.x, 620, 10, CAUL.x, 620, 200);
        fireGlow.addColorStop(0, 'rgba(255,170,60,.45)'); fireGlow.addColorStop(1, 'rgba(255,170,60,0)');
        ctx.fillStyle = fireGlow;
        ctx.fillRect(CAUL.x - 200, 420, 400, 220);
        /* logs and licking flames */
        [[-40, 0.2], [40, -0.2]].forEach(function (lg) {
          ctx.save(); ctx.translate(CAUL.x + lg[0], 630); ctx.rotate(lg[1]);
          U.roundRect(ctx, -46, -8, 92, 16, 8);
          art.fillLit(ctx, '#8a5a34', -8, 8, { lineWidth: 2.5 });
          ctx.restore();
        });
        for (var f = 0; f < 5; f++) {
          var fx = CAUL.x - 60 + f * 30;
          var fh = 34 + Math.sin(t * 9 + f) * 10;
          [['#ff6b3d', 16, 1], ['#ffd23f', 9, 0.6]].forEach(function (fl) {
            ctx.fillStyle = fl[0];
            ctx.beginPath();
            ctx.moveTo(fx - fl[1], 628);
            ctx.quadraticCurveTo(fx - fl[1], 628 - fh * fl[2] * 0.6, fx + Math.sin(t * 7 + f) * 4, 628 - fh * fl[2]);
            ctx.quadraticCurveTo(fx + fl[1], 628 - fh * fl[2] * 0.6, fx + fl[1], 628);
            ctx.fill();
          });
        }
        /* stubby legs and a round iron pot */
        [-70, 70].forEach(function (lx) {
          ctx.beginPath(); ctx.moveTo(CAUL.x + lx - 12, CAUL.y + 70); ctx.lineTo(CAUL.x + lx * 1.15 - 8, CAUL.y + 104); ctx.lineTo(CAUL.x + lx * 1.15 + 8, CAUL.y + 104); ctx.lineTo(CAUL.x + lx + 12, CAUL.y + 70); ctx.closePath();
          art.fillLit(ctx, '#3a3a4e', CAUL.y + 70, CAUL.y + 104, { lineWidth: 3 });
        });
        ctx.beginPath();
        ctx.moveTo(CAUL.x - 112, CAUL.y - 30);
        ctx.bezierCurveTo(CAUL.x - 130, CAUL.y + 60, CAUL.x - 70, CAUL.y + 100, CAUL.x, CAUL.y + 100);
        ctx.bezierCurveTo(CAUL.x + 70, CAUL.y + 100, CAUL.x + 130, CAUL.y + 60, CAUL.x + 112, CAUL.y - 30);
        ctx.closePath();
        var pot = ctx.createRadialGradient(CAUL.x - 40, CAUL.y, 10, CAUL.x, CAUL.y + 30, 140);
        pot.addColorStop(0, '#5a5a74'); pot.addColorStop(1, '#1e1e2c');
        ctx.fillStyle = pot; ctx.fill();
        ctx.strokeStyle = art.INK; ctx.lineWidth = 4; ctx.stroke();
        /* the brew glows on the pot and a drip runs down the side */
        ctx.fillStyle = 'rgba(255,255,255,.18)';
        ctx.beginPath(); ctx.ellipse(CAUL.x - 60, CAUL.y + 10, 14, 30, 0.3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(CAUL.x + 40, CAUL.y - 26);
        ctx.quadraticCurveTo(CAUL.x + 46, CAUL.y + 4, CAUL.x + 44, CAUL.y + 10 + Math.sin(t * 2) * 4);
        ctx.arc(CAUL.x + 40, CAUL.y + 10 + Math.sin(t * 2) * 4, 5, 0, Math.PI);
        ctx.quadraticCurveTo(CAUL.x + 34, CAUL.y, CAUL.x + 30, CAUL.y - 26);
        ctx.closePath();
        art.fillLit(ctx, brew, CAUL.y - 26, CAUL.y + 16, { lineWidth: 2.5 });
        /* the bubbling surface */
        ctx.beginPath(); ctx.ellipse(CAUL.x, CAUL.y - 30, 104, 20, 0, 0, Math.PI * 2);
        var surf = ctx.createRadialGradient(CAUL.x, CAUL.y - 34, 10, CAUL.x, CAUL.y - 30, 104);
        surf.addColorStop(0, U.shade(brew, 0.45)); surf.addColorStop(1, brew);
        ctx.fillStyle = surf; ctx.fill();
        for (var sb = 0; sb < 4; sb++) {
          var sk = (t * 0.8 + sb / 4) % 1;
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 * (1 - sk)) + ')'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(CAUL.x - 60 + sb * 38, CAUL.y - 30 + (sb % 2) * 6, 3 + sk * 9, Math.PI, 0); ctx.stroke();
        }
        /* a thick rim */
        ctx.beginPath(); ctx.ellipse(CAUL.x, CAUL.y - 30, 118, 26, 0, 0, Math.PI * 2);
        ctx.ellipse(CAUL.x, CAUL.y - 30, 104, 19, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#4c4c64'; ctx.fill('evenodd');
        ctx.strokeStyle = art.INK; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.ellipse(CAUL.x, CAUL.y - 30, 118, 26, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.ellipse(CAUL.x, CAUL.y - 30, 104, 19, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(CAUL.x, CAUL.y - 32, 112, 23, 0, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
        /* bubbles rising from the brew */
        bubbles.forEach(function (b) {
          ctx.globalAlpha = U.clamp(1 - b.t / 2, 0, 1) * 0.85;
          ctx.fillStyle = state === 'oops' ? '#d9b3ff' : '#a8ffc6';
          ctx.beginPath(); ctx.arc(CAUL.x + b.x, CAUL.y - 36 - b.t * 50, b.r, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.stroke();
        });
        ctx.globalAlpha = 1;
      }


      function drawCard(ctx) {
        if (!spell) { return; }
        var fs = letters ? 84 : (phrases ? 44 : 64);
        ctx.font = U.font(fs);
        var tw = ctx.measureText(spell.card).width;
        var w = tw + 150, h = fs + 50;
        var x = CAUL.x - w / 2, y = CARD_Y - h / 2 + 20;
        ctx.fillStyle = 'rgba(0,0,0,.25)';
        U.roundRect(ctx, x + 5, y + 8, w, h, 16); ctx.fill();
        ctx.fillStyle = '#fbeec1';
        U.roundRect(ctx, x, y, w, h, 16); ctx.fill();
        ctx.strokeStyle = '#c9a14a'; ctx.lineWidth = 4; ctx.stroke();
        ctx.fillStyle = '#3b2412';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(spell.card, x + (w - 70) / 2 + 10, y + h / 2 + 2);
        /* the sound-it-out button, tucked into the card */
        helpBtn = { x: x + w - 66, y: y + h / 2 - 26, w: 52, h: 52 };
        ctx.fillStyle = '#9b5de5';
        U.roundRect(ctx, helpBtn.x, helpBtn.y, helpBtn.w, helpBtn.h, 26); ctx.fill();
        ctx.font = '28px ' + EMOJI;
        ctx.fillText('🔊', helpBtn.x + 26, helpBtn.y + 27);
      }

      function draw(ctx) {
        var bg = ctx.createLinearGradient(0, 0, 0, api.H);
        bg.addColorStop(0, '#2a1d4e');
        bg.addColorStop(1, '#4a2f6e');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, api.W, api.H);
        var art = PH.art;
        var now = performance.now() / 1000;
        /* a stone wall: every block a slightly different shade, with a lit top edge */
        for (var r = 0; r < 11; r++) {
          for (var c = -1; c < 12; c++) {
            var bx = c * 90 + (r % 2 ? 45 : 0), by = r * 55;
            var v = ((r * 7 + c * 13) % 5) / 5;
            ctx.fillStyle = 'rgba(' + Math.round(70 + v * 20) + ',' + Math.round(50 + v * 14) + ',' + Math.round(110 + v * 20) + ',.55)';
            U.roundRect(ctx, bx + 3, by + 3, 84, 49, 8); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.06)';
            U.roundRect(ctx, bx + 6, by + 5, 78, 8, 4); ctx.fill();
          }
        }
        /* a warm glow from the fire under the pot */
        var warm = ctx.createRadialGradient(560, 600, 20, 560, 600, 420);
        warm.addColorStop(0, 'rgba(255,150,70,.28)'); warm.addColorStop(1, 'rgba(255,150,70,0)');
        ctx.fillStyle = warm; ctx.fillRect(0, 180, api.W, api.H - 180);
        /* an arched window: stone frame, starry night and a crescent moon */
        ctx.save();
        ctx.beginPath(); ctx.moveTo(810, 330); ctx.lineTo(810, 210); ctx.arc(885, 210, 75, Math.PI, 0); ctx.lineTo(960, 330); ctx.closePath();
        art.fillLit(ctx, '#8a7aa8', 130, 330, { lineWidth: 3.5 });
        ctx.beginPath(); ctx.moveTo(826, 318); ctx.lineTo(826, 212); ctx.arc(885, 212, 59, Math.PI, 0); ctx.lineTo(944, 318); ctx.closePath();
        var night = ctx.createLinearGradient(0, 150, 0, 318);
        night.addColorStop(0, '#0d1240'); night.addColorStop(1, '#3a2c7a');
        ctx.fillStyle = night; ctx.fill();
        ctx.strokeStyle = art.INK; ctx.lineWidth = 3; ctx.stroke();
        ctx.clip();
        ctx.fillStyle = '#fff4c2';
        [[846, 190], [930, 260], [860, 290], [915, 176], [840, 240]].forEach(function (s, i) {
          ctx.globalAlpha = 0.5 + Math.sin(now * 2 + i) * 0.4;
          U.star(ctx, s[0], s[1], 4, 1.6); ctx.fill();
        });
        ctx.globalAlpha = 1;
        var mg = ctx.createRadialGradient(898, 214, 4, 898, 214, 50);
        mg.addColorStop(0, 'rgba(255,244,194,.5)'); mg.addColorStop(1, 'rgba(255,244,194,0)');
        ctx.fillStyle = mg; ctx.fillRect(840, 160, 110, 110);
        ctx.save();
        ctx.beginPath(); ctx.rect(820, 150, 140, 170); ctx.arc(912, 204, 22, 0, Math.PI * 2, true); ctx.clip();
        ctx.fillStyle = '#fff4c2';
        ctx.beginPath(); ctx.arc(898, 214, 26, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        ctx.restore();
        ctx.strokeStyle = art.INK; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(885, 153); ctx.lineTo(885, 318); ctx.moveTo(826, 236); ctx.lineTo(944, 236); ctx.stroke();
        ctx.strokeStyle = '#8a7aa8'; ctx.lineWidth = 2.5; ctx.stroke();
        /* the sill with a candle */
        U.roundRect(ctx, 796, 322, 178, 16, 6);
        art.fillLit(ctx, '#9c8cba', 322, 338, { lineWidth: 3 });
        U.roundRect(ctx, 930, 290, 16, 32, 4);
        art.fillLit(ctx, '#fff4d6', 290, 322, { lineWidth: 2.5 });
        var fl = Math.sin(now * 13) * 1.5;
        var cgl = ctx.createRadialGradient(938, 278, 2, 938, 278, 40);
        cgl.addColorStop(0, 'rgba(255,220,120,.6)'); cgl.addColorStop(1, 'rgba(255,220,120,0)');
        ctx.fillStyle = cgl; ctx.fillRect(898, 238, 80, 80);
        ctx.beginPath(); ctx.moveTo(938, 266 + fl); ctx.quadraticCurveTo(946, 282, 938, 288); ctx.quadraticCurveTo(930, 282, 938, 266 + fl);
        ctx.fillStyle = '#ffb627'; ctx.fill();
        ctx.fillStyle = '#fff3a8';
        ctx.beginPath(); ctx.ellipse(938, 283, 2.5, 4, 0, 0, Math.PI * 2); ctx.fill();
        /* wooden floorboards */
        ctx.beginPath(); ctx.rect(0, 572, api.W, api.H - 572);
        art.fillLit(ctx, '#5a3a5e', 572, api.H, { lineWidth: 3 });
        ctx.strokeStyle = 'rgba(30,15,40,.35)'; ctx.lineWidth = 2;
        for (var fb = 0; fb < 8; fb++) {
          ctx.beginPath(); ctx.moveTo(fb * 140 + (fb % 2) * 40, 574); ctx.lineTo(fb * 140 + (fb % 2) * 40, api.H); ctx.stroke();
        }

        drawWizard(ctx);
        drawCauldron(ctx);

        /* the wand zap */
        if (state === 'cast' && chosen) {
          var k = U.clamp(timer / 0.45, 0, 1);
          ctx.strokeStyle = 'rgba(255,230,120,' + (1 - k * 0.5) + ')';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(300, 410);
          for (var z = 1; z <= 8; z++) {
            var zx = U.lerp(300, chosen.x, z / 8 * k), zy = U.lerp(410, chosen.y, z / 8 * k) + (z % 2 ? -12 : 12);
            ctx.lineTo(zx, zy);
          }
          ctx.stroke();
        }

        /* the choices, in magic bubbles */
        options.forEach(function (o) {
          if (o.gone) { return; }
          var dx = o.shake > 0 ? Math.sin(o.shake * 50) * 8 : 0;
          var y = o.y + Math.sin(o.bob) * 6;
          var g = ctx.createRadialGradient(o.x - 20 + dx, y - 24, 8, o.x + dx, y, o.r);
          g.addColorStop(0, 'rgba(255,255,255,.95)');
          g.addColorStop(1, 'rgba(200,155,255,.55)');
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(o.x + dx, y, o.r, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.stroke();
          drawPics(ctx, o.pics, o.x + dx, y + 4, o.pics.length > 1 ? 56 : 76);
        });

        /* the reveal: the thing rises out of the cauldron, or a silly creature pops out */
        if (state === 'reveal' && chosen) {
          var e = U.clamp(timer / 0.8, 0, 1);
          var size = 60 + e * 90;
          drawPics(ctx, chosen.pics, CAUL.x, CAUL.y - 80 - e * 150, size);
        } else if (state === 'oops' && chosen) {
          var q = U.clamp(timer / 1.2, 0, 1);
          ctx.globalAlpha = 1 - Math.max(0, q - 0.7) / 0.3;
          ctx.fillStyle = 'rgba(217,179,255,.5)';
          ctx.beginPath(); ctx.arc(CAUL.x, CAUL.y - 80 - q * 160, 46, 0, Math.PI * 2); ctx.fill();
          ctx.font = '50px ' + EMOJI;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(OOPS[round % OOPS.length], CAUL.x, CAUL.y - 78 - q * 160);
          ctx.globalAlpha = 1;
        }

        drawCard(ctx);

        /* the spellbook: everything conjured so far */
        U.plate(ctx, 700, 576, 290, 54, { fill: '#6b3fa0', r: 14, edge: '#ffd23f', lineWidth: 2, shine: 0.15 });
        ctx.fillStyle = '#ffd23f';
        ctx.font = U.font(18);
        ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText('Spellbook', 712, 606);
        book.slice(-6).forEach(function (p, k) { drawPics(ctx, p, 830 + k * 28, 606, p.length > 1 ? 16 : 24); });
      }

      newRound();
      return { update: update, draw: draw, down: down,
        /* read-only peek at the state, used by automated play-through checks */
        debug: function () { return { spell: spell, options: options, state: state, round: round }; } };
    }
  };
})(window.PH = window.PH || {});
