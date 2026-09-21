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
        var x = 150, y = 560;
        var t = performance.now() / 1000;
        var wave = state === 'cast' ? -1.2 : Math.sin(t * 1.5) * 0.08 - 0.3;
        U.shadow(ctx, x, y + 4, 90, 14, 0.4);
        /* robe */
        ctx.fillStyle = '#5b3fc4';
        ctx.beginPath(); ctx.moveTo(x - 70, y); ctx.lineTo(x - 30, y - 190); ctx.lineTo(x + 30, y - 190); ctx.lineTo(x + 70, y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffd23f';
        [[-30, -60], [20, -120], [10, -30]].forEach(function (s) { U.star(ctx, x + s[0], y + s[1], 8, 3.5); ctx.fill(); });
        /* face and beard */
        ctx.fillStyle = '#ffd9b3';
        ctx.beginPath(); ctx.arc(x, y - 212, 30, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f2f2f2';
        ctx.beginPath(); ctx.moveTo(x - 28, y - 204); ctx.quadraticCurveTo(x, y - 110, x + 28, y - 204); ctx.fill();
        ctx.fillStyle = '#1f2340';
        ctx.beginPath(); ctx.arc(x - 10, y - 218, 3.5, 0, Math.PI * 2); ctx.arc(x + 10, y - 218, 3.5, 0, Math.PI * 2); ctx.fill();
        /* hat */
        ctx.fillStyle = '#5b3fc4';
        ctx.beginPath(); ctx.moveTo(x - 46, y - 232); ctx.lineTo(x + 8, y - 340); ctx.lineTo(x + 46, y - 232); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffd23f';
        U.star(ctx, x + 4, y - 280, 12, 5); ctx.fill();
        /* arm and wand */
        ctx.save();
        ctx.translate(x + 28, y - 150);
        ctx.rotate(wave);
        ctx.fillStyle = '#5b3fc4';
        U.roundRect(ctx, 0, -10, 70, 20, 10); ctx.fill();
        ctx.fillStyle = '#7a4a2b';
        ctx.fillRect(66, -4, 60, 8);
        ctx.fillStyle = '#ffd23f';
        U.star(ctx, 130, 0, 12, 5); ctx.fill();
        ctx.restore();
      }

      function drawCauldron(ctx) {
        var t = performance.now() / 1000;
        /* the fire lights the floor under the pot */
        var fireGlow = ctx.createRadialGradient(CAUL.x, 620, 10, CAUL.x, 620, 200);
        fireGlow.addColorStop(0, 'rgba(255,170,60,.45)'); fireGlow.addColorStop(1, 'rgba(255,170,60,0)');
        ctx.fillStyle = fireGlow;
        ctx.fillRect(CAUL.x - 200, 420, 400, 220);
        /* fire */
        for (var f = 0; f < 5; f++) {
          ctx.fillStyle = f % 2 ? '#ff9f40' : '#ffd23f';
          var fh = 26 + Math.sin(t * 9 + f) * 8;
          ctx.beginPath();
          ctx.moveTo(CAUL.x - 60 + f * 30 - 14, 628); ctx.lineTo(CAUL.x - 60 + f * 30, 628 - fh); ctx.lineTo(CAUL.x - 60 + f * 30 + 14, 628);
          ctx.fill();
        }
        /* pot */
        ctx.fillStyle = '#2b2b3a';
        ctx.beginPath(); ctx.ellipse(CAUL.x, CAUL.y + 20, 110, 80, 0, 0, Math.PI); ctx.fill();
        ctx.fillRect(CAUL.x - 110, CAUL.y - 30, 220, 50);
        ctx.fillStyle = state === 'oops' ? '#b36bff' : '#5ee88a';
        ctx.beginPath(); ctx.ellipse(CAUL.x, CAUL.y - 30, 104, 20, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#44445a';
        ctx.beginPath(); ctx.ellipse(CAUL.x, CAUL.y - 30, 114, 24, 0, 0, Math.PI * 2);
        ctx.ellipse(CAUL.x, CAUL.y - 30, 104, 20, 0, 0, Math.PI * 2); ctx.fill('evenodd');
        /* bubbles rising from the brew */
        bubbles.forEach(function (b) {
          ctx.globalAlpha = U.clamp(1 - b.t / 2, 0, 1) * 0.8;
          ctx.fillStyle = state === 'oops' ? '#d9b3ff' : '#a8ffc6';
          ctx.beginPath(); ctx.arc(CAUL.x + b.x, CAUL.y - 36 - b.t * 50, b.r, 0, Math.PI * 2); ctx.fill();
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
        /* stone wall */
        ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 2;
        for (var r = 0; r < 12; r++) {
          for (var c = 0; c < 12; c++) {
            ctx.strokeRect(c * 90 + (r % 2 ? 45 : 0), r * 55, 90, 55);
          }
        }
        /* window with moon */
        ctx.fillStyle = '#0f0a24';
        U.roundRect(ctx, 820, 150, 130, 170, 60); ctx.fill();
        ctx.fillStyle = '#fff4c2';
        ctx.beginPath(); ctx.arc(885, 220, 26, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#0f0a24';
        ctx.beginPath(); ctx.arc(897, 212, 22, 0, Math.PI * 2); ctx.fill();

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
