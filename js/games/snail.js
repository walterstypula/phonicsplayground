/* Stretchy Snail - drag the snail under a word and stretch each sound into the next one.
   Blending falls apart when a child says the sounds as separate words ("c" ... "a" ... "t"
   and back to the beginning); it comes together when one sound runs into the next without
   a gap. The snail sets that pace: it cannot be hurried, and the sound under it holds for
   as long as it sits there. "Sound it with me" decides who does the saying. */
(function (PH) {
  'use strict';
  var U = PH.util;

  /* sounds that can be held (mmmm, ssss, a vowel) as against the ones that stop dead.
     /t/ cannot be stretched, and asking a child to try is what produces "tuh". */
  var STOPS = { b: 1, d: 1, g: 1, k: 1, p: 1, t: 1, ch: 1, j: 1, kw: 1, ks: 1 };

  PH.games.snail = {
    id: 'snail',
    name: 'Stretchy Snail',
    icon: '🐌',
    blurb: 'Slide the snail under a word and stretch each sound into the next: mmm-aaa-nnn. Then say the whole word!',

    create: function (api) {
      var ROUNDS = api.pre ? 4 : 5;
      var measure = document.createElement('canvas').getContext('2d');
      var LIT = ['#ff9f40', '#4d8dff', '#3ddc84', '#9b5de5', '#ff5d8f', '#2ec4b6'];

      /* Who says the sounds. On for the youngest and for the first levels, off once a
         child is reading longer words: hearing the answer every time is a fine way to
         learn to wait for it instead of to blend. A grown-up can flip it at any point and
         that choice is remembered. */
      var voiceOn = api.level.id <= 2;
      try {
        var saved = localStorage.getItem('ph-blend-voice');
        if (saved) { voiceOn = saved === 'on'; }
      } catch (e) { /* private mode */ }

      var round = 0, word = null, parts = [], next = 0;
      var trackX0 = 0, trackX1 = 0, snailX = 0, snailBob = 0;
      var dragging = false, linger = 0, state = 'slide', timer = 0, idle = 0, held = null;
      var trail = [], queue = [], hints = 0;
      var flowers = [], i;
      for (i = 0; i < 26; i++) {
        flowers.push({ x: U.rand(20, api.W - 20), y: U.rand(api.H - 150, api.H - 20), c: U.pick(['#ff8fab', '#ffd23f', '#fff', '#c77dff']), r: U.rand(4, 8) });
      }
      var TOGGLE = { x: 26, y: api.H - 62, w: 250, h: 44 };

      /* ---------------- the word, in the pieces it is blended from ----------------
         Every level blends sounds, never syllables. The word bank splits the longest
         words into syllables for the clapping games, but a snail stretching "rab" into
         "bit" is not blending, it is reading two small words; the child has to hear
         r-a-b-b-i-t. A silent e is shown but never sounded, so it gets no hint of its
         own and the snail passes over it without stopping. */
      function partsFor(w) { return PH.soundOut(w); }

      function plan() {
        var pool = api.pre ? PH.PICTURES : api.words;
        pool = pool.filter(function (w) { return partsFor(w).length >= 2; });
        /* short words first: nine sounds in a row is a long slide for a small reader */
        var easy = pool.filter(function (w) { return partsFor(w).length <= (api.pre ? 4 : 5); });
        if (easy.length >= ROUNDS) { pool = easy; }
        return U.shuffle(pool).slice(0, ROUNDS);
      }

      /* lay the word out big and centred, and remember where each piece sits */
      function layout(w) {
        var list = partsFor(w);
        var size = 112, gap = 18, total = 0;
        while (size > 44) {
          measure.font = U.font(size);
          total = gap * (list.length - 1);
          list.forEach(function (p) { total += measure.measureText(p.text).width; });
          if (total <= 720) { break; }
          size -= 6;
        }
        var x = api.W / 2 - total / 2;
        list.forEach(function (p) {
          p.size = size;
          p.w = measure.measureText(p.text).width;
          p.x = x;
          p.cx = x + p.w / 2;
          p.lit = 0;
          x += p.w + gap;
        });
        trackX0 = list[0].x - 70;
        trackX1 = list[list.length - 1].x + list[list.length - 1].w + 70;
        return list;
      }

      function newRound() {
        round++;
        if (round > ROUNDS || !queue.length) {
          api.finish('You blended them all!', hints ? 0.8 : 1);
          state = 'over';
          return;
        }
        word = queue.shift();
        parts = layout(word);
        /* decode this word's sounds now, so the first one does not arrive late */
        var needed = [];
        parts.forEach(function (p) {
          if (!p.hint) { return; }
          needed.push(p.hint);                               /* the syllable's own recording */
          needed = needed.concat(soundsOf(p.hint));          /* and the sounds to fall back on */
        });
        PH.blend.warm(needed);
        next = 0; snailX = trackX0; dragging = false; linger = 0; trail = []; idle = 0;
        state = 'slide'; timer = 0;
        api.setProgress(round, ROUNDS);
        api.setPrompt('Slide and blend', { word: word.w, show: true, repeat: sayPrompt });
        if (round === 1) { sayPrompt(); }
      }

      /* Never the word itself: hearing it first gives away the very thing the child is
         about to blend. The instruction is said once, at the start; after that the word
         on screen and the snail are prompt enough, and more talk only gets in the way. */
      function sayPrompt() {
        if (!word) { return; }
        api.say('Slide the snail');
      }

      function setVoice(on) {
        voiceOn = on;
        try { localStorage.setItem('ph-blend-voice', on ? 'on' : 'off'); } catch (e) { /* private mode */ }
        api.sfx.click();       /* the button's own label says what changed */
      }

      /* ---------------- sliding ---------------- */
      /* One of the 43 sounds is played and held for as long as the snail sits on it. A
         syllable - "ap", "oon", "ter" - is none of them, and handing it to the voice as
         text gets it read out as letters ("A. P.") or as whatever word it resembles ("to"
         becomes "two"), so syllables are recorded too, spoken as one piece. Failing that
         its own sounds are run together, which is passable but audibly stitched. */
      function sound(hint) {
        if (!voiceOn || !hint) { return; }
        if (PH.blend.play(hint, true)) { return; }
        if (PH.blend.sequence(soundsOf(hint))) { return; }
        api.say(hint, { rate: 0.6 });
      }

      function soundsOf(hint) {
        return String(hint).charAt(0) === '/' ? [hint] : PH.soundsIn(hint);
      }

      function lightUpTo(x) {
        while (next < parts.length && x >= parts[next].cx) {
          var p = parts[next];
          p.lit = 0.001;          /* counts up from here, so the letter pops as it lights */
          next++;
          linger = 0;
          if (p.hint) {
            sound(p.hint);
            held = p;
            api.sfx.twinkle();
            api.burst(p.cx, 250, ['#fff3a0', '#8ef0ff'], 6, { gravity: 40, minSpeed: 30, maxSpeed: 90 });
          }
        }
        if (next >= parts.length && x >= trackX1 - 12) { finishWord(); }
      }

      function finishWord() {
        if (state !== 'slide') { return; }
        state = 'done'; timer = 0; dragging = false;
        /* the last sound gives way to the whole word, but a short one like the g of "pig"
           is let finish first rather than clipped */
        PH.blend.release(); held = null;
        api.addStar(1);
        api.sfx.great();
        api.sayWord(word.w);     /* the word they just blended, and nothing else */
        parts.forEach(function (p) {
          api.burst(p.cx, 250, ['#ffd23f', '#8ef0ff', '#ff8fab'], 10, { gravity: 60, minSpeed: 40, maxSpeed: 150, shape: 'star' });
        });
      }

      /* the piece the snail is sitting on, or null between pieces */
      function under(x) {
        for (var n = 0; n < parts.length; n++) {
          if (x >= parts[n].x - 10 && x <= parts[n].x + parts[n].w + 10) { return parts[n]; }
        }
        return null;
      }

      function down(p) {
        if (state === 'over') { return; }
        if (p.x >= TOGGLE.x && p.x <= TOGGLE.x + TOGGLE.w && p.y >= TOGGLE.y && p.y <= TOGGLE.y + TOGGLE.h) {
          setVoice(!voiceOn);
          return;
        }
        if (state !== 'slide') { return; }
        idle = 0;
        if (Math.abs(p.x - snailX) <= 90 && p.y > 300) {
          dragging = true;
        } else {
          api.sfx.click();
        }
      }

      function move(p) {
        if (!dragging || state !== 'slide') { return; }
        idle = 0;
        var x = U.clamp(p.x, trackX0, trackX1);
        if (x > snailX) { trail.push({ x: snailX, t: 0 }); }
        snailX = x;
        lightUpTo(snailX);
      }

      function up() {
        dragging = false;
        PH.blend.release();      /* letting go of the snail lets go of the sound */
        held = null;
      }

      function update(dt) {
        snailBob += dt;
        trail.forEach(function (t) { t.t += dt; });
        trail = trail.filter(function (t) { return t.t < 1.4; });
        parts.forEach(function (p) { if (p.lit > 0 && p.lit < 1.6) { p.lit += dt; } });

        if (state === 'slide') {
          idle += dt;
          /* A held sound sustains itself, so all this has to do is decide when to let go:
             when the snail leaves the letter, when the finger lifts, or after a few
             seconds, so a snail parked on an "mmm" does not drone on for ever. */
          var p = under(snailX);
          if (held && p === held && dragging) {
            linger += dt;
            if (linger > 3) { PH.blend.release(); held = null; }
          } else if (held) {
            PH.blend.release(); held = null; linger = 0;
          }
        } else if (state === 'done') {
          timer += dt;
          if (PH.speech.settled(timer, 2.4)) { newRound(); }
        }
      }

      /* ---------------- drawing ---------------- */
      function drawSnail(ctx, x, y) {
        var bob = Math.sin(snailBob * 3) * 2;
        U.shadow(ctx, x, y + 26, 34, 8, 0.18);
        ctx.strokeStyle = PH.art.INK; ctx.lineWidth = 3; ctx.lineJoin = 'round';
        /* foot */
        ctx.fillStyle = '#ffd6a5';
        ctx.beginPath();
        ctx.moveTo(x - 40, y + 22);
        ctx.quadraticCurveTo(x - 46, y + 4 + bob, x - 22, y + 2 + bob);
        ctx.lineTo(x + 30, y + 2 + bob);
        ctx.quadraticCurveTo(x + 46, y + 6 + bob, x + 40, y + 22);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        /* shell */
        var sx = x + 4, sy = y - 10 + bob;
        ctx.fillStyle = '#f2a65a';
        ctx.beginPath(); ctx.arc(sx, sy, 26, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#b9682a'; ctx.lineWidth = 4;
        ctx.beginPath();
        for (var a = 0; a < Math.PI * 4; a += 0.2) {
          var r = 4 + a * 2.6;
          var px = sx + Math.cos(a) * r, py = sy + Math.sin(a) * r;
          if (a === 0) { ctx.moveTo(px, py); } else { ctx.lineTo(px, py); }
        }
        ctx.stroke();
        /* head and stalks */
        ctx.strokeStyle = PH.art.INK; ctx.lineWidth = 3;
        var hx = x - 34, hy = y + 4 + bob;
        [-9, 3].forEach(function (off) {
          ctx.beginPath();
          ctx.moveTo(hx + 4, hy - 4);
          ctx.quadraticCurveTo(hx - 6 + off, hy - 20, hx - 10 + off, hy - 26);
          ctx.stroke();
          ctx.fillStyle = PH.art.INK;
          ctx.beginPath(); ctx.arc(hx - 10 + off, hy - 28, 3.5, 0, Math.PI * 2); ctx.fill();
        });
        PH.art.eyes(ctx, hx + 2, hy - 2, 9, 2.4, { dot: true, blink: PH.art.blink(13) });
        PH.art.mouth(ctx, hx + 2, hy + 6, 7, 'smile', { lineWidth: 1.8 });
      }

      function draw(ctx) {
        var sky = ctx.createLinearGradient(0, 0, 0, api.H);
        sky.addColorStop(0, '#bde0fe');
        sky.addColorStop(1, '#e8f7e4');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, api.W, api.H);
        ctx.fillStyle = '#8fd694';
        ctx.beginPath(); ctx.moveTo(0, api.H);
        for (var hx = 0; hx <= api.W; hx += 30) { ctx.lineTo(hx, api.H - 120 - Math.sin(hx * 0.005) * 26); }
        ctx.lineTo(api.W, api.H); ctx.closePath(); ctx.fill();
        flowers.forEach(function (f) {
          ctx.fillStyle = f.c;
          ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2); ctx.fill();
        });
        if (!parts.length) { return; }

        /* the word */
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        parts.forEach(function (p, n) {
          var grow = p.lit ? 1 + Math.max(0, 0.18 - Math.abs(p.lit - 0.18)) : 1;
          ctx.save();
          ctx.translate(p.x + p.w / 2, 250);
          ctx.scale(grow, grow);
          ctx.font = U.font(p.size);
          ctx.textAlign = 'center';
          if (!p.hint) {                                   /* the silent e: there, but quiet */
            ctx.fillStyle = 'rgba(43,35,70,.28)';
          } else if (p.lit) {
            ctx.fillStyle = LIT[n % LIT.length];
          } else {
            ctx.fillStyle = '#2b2346';
          }
          ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 8; ctx.lineJoin = 'round';
          ctx.strokeText(p.text, 0, 0);
          ctx.fillText(p.text, 0, 0);
          ctx.restore();
        });

        /* the track the snail runs along, dotted so it reads as a path */
        ctx.strokeStyle = 'rgba(43,35,70,.18)'; ctx.lineWidth = 8; ctx.lineCap = 'round';
        ctx.setLineDash([2, 18]);
        ctx.beginPath(); ctx.moveTo(trackX0, 352); ctx.lineTo(trackX1, 352); ctx.stroke();
        ctx.setLineDash([]);
        /* the shiny trail it leaves behind */
        trail.forEach(function (t) {
          ctx.fillStyle = 'rgba(255,255,255,' + (0.5 * (1 - t.t / 1.4)) + ')';
          ctx.beginPath(); ctx.ellipse(t.x, 352, 16, 7, 0, 0, Math.PI * 2); ctx.fill();
        });

        drawSnail(ctx, snailX, 352);

        /* a nudge to start, and a hand-off once the snail is moving */
        if (state === 'slide' && !dragging && idle > 2.2 && next === 0) {
          U.badge(ctx, api.W / 2, 430, 'Put your finger on the snail', { align: 'center', icon: '👆', size: 19 });
        }
        if (state === 'done') {
          U.badge(ctx, api.W / 2, 430, word.w, { align: 'center', icon: '⭐', size: 24 });
        }

        /* who says the sounds */
        var t = TOGGLE;
        ctx.fillStyle = voiceOn ? 'rgba(45,110,80,.92)' : 'rgba(43,35,70,.55)';
        U.roundRect(ctx, t.x, t.y, t.w, t.h, 22); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2;
        U.roundRect(ctx, t.x + 1, t.y + 1, t.w - 2, t.h - 2, 21); ctx.stroke();
        ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
        ctx.font = '20px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
        ctx.fillStyle = '#fff';
        ctx.fillText(voiceOn ? '🔊' : '🤫', t.x + 16, t.y + t.h / 2 + 1);
        ctx.font = U.font(17);
        ctx.fillText(voiceOn ? 'Sounding out with you' : 'Your turn to sound out', t.x + 48, t.y + t.h / 2 + 1);
      }

      queue = plan();
      newRound();
      return { update: update, draw: draw, down: down, move: move, up: up,
        /* read-only peek at the state, used by automated play-through checks */
        debug: function () {
          return { word: word, parts: parts, next: next, snailX: snailX, state: state,
            round: round, voiceOn: voiceOn, track: [trackX0, trackX1], toggle: TOGGLE };
        } };
    }
  };
})(window.PH = window.PH || {});
