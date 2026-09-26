/* Alien Names - an alien lands and says its name; the child finds the tag that spells it.
   The school screening's Nonsense Word Fluency task shows made-up words (sig, ral, fape)
   because a made-up word cannot be known by sight or guessed from a picture: the only
   way through it is letter by letter. Aliens are the one place where a name like "vop"
   is perfectly normal, which makes made-up words a game rather than a trick.

   The wrong tags are the right name with one sound changed - usually the vowel, which is
   where readers most often slip - so reading only the first letter is never enough. */
(function (PH) {
  'use strict';
  var U = PH.util;

  var VOWELS = ['a', 'e', 'i', 'o', 'u'];
  var CONS = 'bdfgjklmnprstvz'.split('');
  var BODY = ['#7bd389', '#8ec5ff', '#c59bff', '#ff9ec7', '#ffcf6b', '#6fe3d6'];

  PH.games.alien = {
    id: 'alien',
    name: 'Alien Names',
    icon: '👽',
    blurb: 'Aliens have made-up names like vop and fape. Listen, then find the name tag that spells it.',

    create: function (api) {
      var ROUNDS = 8;
      var CHOICES = api.pre ? 2 : 3;
      var POOL = PH.nonsenseFor(api.level.id);

      /* every real word the child might know, so a changed name is never a real word */
      var REAL = {};
      PH.wordsUpTo(5).forEach(function (w) { REAL[w.w] = 1; });
      Object.keys(PH.SIGHT).forEach(function (k) { PH.SIGHT[k].forEach(function (w) { REAL[w.toLowerCase()] = 1; }); });
      Object.keys(PH.TRICKY).forEach(function (k) { PH.TRICKY[k].forEach(function (w) { REAL[w.toLowerCase()] = 1; }); });
      function fresh(s, seen) { return !seen[s] && !REAL[s] && PH.isClean(s); }

      var round = 0, target = null, tags = [], alien = null, state = 'land', timer = 0;
      var hits = 0, misses = 0, lit = -1, recent = [];
      var stars = [];
      for (var i = 0; i < 80; i++) { stars.push({ x: U.rand(0, api.W), y: U.rand(0, 420), r: U.rand(0.8, 2.4), t: U.rand(0, 6) }); }

      /* the same name with one letter changed: the vowel first, then a consonant */
      function twins(word, n) {
        var s = word.w, seen = {}, out = [], k, c;
        seen[s] = 1;
        var vi = -1;
        for (k = 0; k < s.length; k++) { if (VOWELS.indexOf(s[k]) >= 0) { vi = k; break; } }
        var swaps = [];
        if (vi >= 0) {
          U.shuffle(VOWELS).forEach(function (v) { if (v !== s[vi]) { swaps.push(s.slice(0, vi) + v + s.slice(vi + 1)); } });
        }
        var consAt = [];
        function vowelOrEdge(at) { return at < 0 || at >= s.length || VOWELS.indexOf(s[at]) >= 0; }
        for (k = 0; k < s.length; k++) {
          /* Only a consonant standing on its own is changed. One inside a blend or digraph
             ("sk", "mp", "sh") can turn into letters nobody could say - "nkab", "vtip" - and
             a silent e and the r of ar/or/ir stay put, since changing them changes the pattern. */
          if (VOWELS.indexOf(s[k]) >= 0 || (k === s.length - 1 && s[k] === 'e') || (s[k] === 'r' && k === vi + 1)) { continue; }
          if (vowelOrEdge(k - 1) && (vowelOrEdge(k + 1) || (k + 1 === s.length - 1 && s[k + 1] === 'e'))) { consAt.push(k); }
        }
        U.shuffle(consAt).forEach(function (at) {
          c = U.pick(CONS.filter(function (x) { return x !== s[at]; }));
          swaps.push(s.slice(0, at) + c + s.slice(at + 1));
        });
        /* one vowel change and one consonant change where there is room for both */
        var vowelOnes = swaps.slice(0, vi >= 0 ? 4 : 0).filter(function (x) { return fresh(x, seen); });
        var consOnes = swaps.slice(vi >= 0 ? 4 : 0).filter(function (x) { return fresh(x, seen); });
        [vowelOnes[0], consOnes[0], vowelOnes[1], consOnes[1]].forEach(function (x) {
          if (x && out.length < n && !seen[x]) { seen[x] = 1; out.push(x); }
        });
        /* and if that ran short, other names of the same kind */
        PH.lookAlikes(word, POOL, n + 2).forEach(function (w) {
          if (out.length < n && !seen[w.w]) { seen[w.w] = 1; out.push(w.w); }
        });
        return out;
      }

      /* An alien's name is played as its sounds run together, from the recorded clips. A
         made-up word handed to the device voice as text comes back however that voice
         guesses - "ep" as "E.P." - so it is never asked. Where clips cannot be blended
         (a page opened from disk) the sounds come one after another instead. */
      function sayName(text) {
        var sounds = PH.soundsIn(text);
        if (PH.blend.sequence(sounds)) { return; }
        sounds.forEach(function (h, k) { api.say(h, { rate: 0.55, queue: k > 0 }); });
      }

      function newRound() {
        round++;
        if (round > ROUNDS) {
          state = 'over';
          api.finish(null, hits + misses ? hits / (hits + misses) : 1);
          return;
        }
        var pool = POOL.filter(function (w) { return recent.indexOf(w.w) < 0; });
        target = U.pick(pool.length ? pool : POOL);
        recent.push(target.w);
        if (recent.length > 10) { recent.shift(); }
        PH.blend.warm(PH.soundsIn(target.w));

        var names = U.shuffle([target.w].concat(twins(target, CHOICES - 1)));
        var tw = CHOICES === 2 ? 260 : 240, gap = 40;
        var x0 = api.W / 2 - (names.length * tw + (names.length - 1) * gap) / 2;
        tags = names.map(function (n, k) {
          return { text: n, right: n === target.w, x: x0 + k * (tw + gap), y: 500, w: tw, h: 96, shake: 0, fly: 0 };
        });
        alien = {
          color: BODY[round % BODY.length], eyes: U.pick([1, 2, 3]), y: -160, bob: 0,
          antenna: U.pick([1, 2]), wave: 0, name: ''
        };
        lit = -1;
        state = 'land'; timer = 0;
        api.setProgress(round, ROUNDS);
        api.setPrompt('Which name did the alien say?', { repeat: function () { sayName(target.w); } });
        if (round === 1) { api.say('Find the alien\'s name'); }
      }

      function down(p) {
        if (state === 'ask' && alien && U.dist(p.x, p.y, api.W / 2, 300) < 110) { sayName(target.w); alien.wave = 1; return; }
        if (state !== 'ask') { return; }
        tags.forEach(function (t) {
          if (p.x < t.x || p.x > t.x + t.w || p.y < t.y || p.y > t.y + t.h + 10) { return; }
          if (t.right) {
            hits++;
            state = 'named'; timer = 0;
            t.fly = 0.001;
            api.addStar(1);
            api.sfx.great();
          } else if (!t.shake) {
            misses++;
            t.shake = 0.5;
            api.sfx.boing();
            setTimeout(function () { if (state === 'ask') { sayName(target.w); } }, 350);
          }
        });
      }

      function update(dt) {
        if (!alien) { return; }
        alien.bob += dt;
        if (alien.wave > 0) { alien.wave = Math.max(0, alien.wave - dt); }
        tags.forEach(function (t) { if (t.shake > 0) { t.shake = Math.max(0, t.shake - dt); } });
        timer += dt;
        if (state === 'land') {
          alien.y = U.lerp(-160, 300, U.clamp(timer / 1.1, 0, 1));
          if (timer > 1.2) { state = 'ask'; timer = 0; sayName(target.w); alien.wave = 1; }
        } else if (state === 'named') {
          var t = tags.filter(function (x) { return x.right; })[0];
          if (t && t.fly < 1) {
            t.fly = Math.min(1, t.fly + dt * 2.2);
            if (t.fly >= 1) {
              alien.name = target.w;
              api.burst(api.W / 2, 330, ['#ffd23f', '#8ef0ff', '#ff8fab'], 26, { shape: 'star' });
              sayName(target.w);
              timer = 0;
            }
          } else {
            /* light each letter as its sound goes by */
            lit = Math.floor(timer / 0.28);
            if (timer > 2.2) { state = 'leave'; timer = 0; tags = []; }
          }
        } else if (state === 'leave') {
          alien.y = U.lerp(300, -200, U.clamp(timer / 0.9, 0, 1));
          if (timer > 1) { newRound(); }
        }
      }

      /* ---------------- drawing ---------------- */
      function drawAlien(ctx, a) {
        var x = api.W / 2, y = a.y + Math.sin(a.bob * 2.4) * 5;
        U.shadow(ctx, x, 392, 70, 12, 0.3);
        ctx.strokeStyle = PH.art.INK; ctx.lineWidth = 3;
        /* antennae */
        var ants = a.antenna === 1 ? [0] : [-26, 26];
        ants.forEach(function (ax) {
          var sway = Math.sin(a.bob * 3 + ax) * 6 + (a.wave ? Math.sin(a.wave * 20) * 8 : 0);
          ctx.beginPath(); ctx.moveTo(x + ax * 0.6, y - 70); ctx.quadraticCurveTo(x + ax + sway, y - 110, x + ax + sway, y - 124); ctx.stroke();
          ctx.fillStyle = '#ffd23f';
          ctx.beginPath(); ctx.arc(x + ax + sway, y - 128, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        });
        /* legs */
        ctx.fillStyle = U.shade(a.color, -0.2);
        [-30, 30].forEach(function (lx) {
          U.roundRect(ctx, x + lx - 12, y + 50, 24, 40, 12); ctx.fill(); ctx.stroke();
        });
        /* body */
        var g = ctx.createLinearGradient(0, y - 80, 0, y + 70);
        g.addColorStop(0, U.shade(a.color, 0.25));
        g.addColorStop(1, U.shade(a.color, -0.15));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.ellipse(x, y, 78, 82, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        /* eyes */
        var ex = a.eyes === 1 ? [0] : (a.eyes === 2 ? [-24, 24] : [-34, 0, 34]);
        ex.forEach(function (o) {
          PH.art.eye(ctx, x + o, y - 26, a.eyes === 1 ? 24 : 15, { blink: PH.art.blink(7 + o), lid: a.color, look: [0, 0.3] });
        });
        PH.art.mouth(ctx, x, y + 10, 18, a.name ? 'grin' : 'smile', { lineWidth: 3 });
        /* its name badge, once it has one */
        if (a.name) {
          ctx.font = U.font(40);
          var w = ctx.measureText(a.name).width + 44;
          U.plate(ctx, x - w / 2, y + 22, w, 54, { fill: '#fff6cc', r: 14 });
          var tx = x - (w - 44) / 2;
          ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          a.name.split('').forEach(function (ch, k) {
            ctx.fillStyle = k === lit ? '#e8456f' : '#1f2340';
            ctx.fillText(ch, tx, y + 50);
            tx += ctx.measureText(ch).width;
          });
        }
      }

      function draw(ctx) {
        var now = performance.now() / 1000;
        var sky = ctx.createLinearGradient(0, 0, 0, api.H);
        sky.addColorStop(0, '#120d3a');
        sky.addColorStop(1, '#3b2a7a');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, api.W, api.H);
        stars.forEach(function (s) {
          ctx.globalAlpha = 0.4 + 0.4 * Math.sin(now * 2 + s.t);
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        });
        ctx.globalAlpha = 1;
        /* a ringed planet and the landing ground */
        ctx.fillStyle = '#ff9f6b';
        ctx.beginPath(); ctx.arc(860, 110, 44, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(255,220,180,.7)'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.ellipse(860, 110, 74, 16, -0.3, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#5b4a9e';
        ctx.beginPath(); ctx.ellipse(api.W / 2, api.H + 120, 720, 300, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.08)';
        [[200, 470, 40], [780, 440, 30], [640, 560, 24]].forEach(function (c) {
          ctx.beginPath(); ctx.ellipse(c[0], c[1], c[2], c[2] * 0.4, 0, 0, Math.PI * 2); ctx.fill();
        });
        /* the beam that brings each alien down */
        if (alien && (state === 'land' || state === 'leave')) {
          var bg = ctx.createLinearGradient(0, 0, 0, 400);
          bg.addColorStop(0, 'rgba(160,255,220,.45)');
          bg.addColorStop(1, 'rgba(160,255,220,0)');
          ctx.fillStyle = bg;
          ctx.beginPath(); ctx.moveTo(api.W / 2 - 40, 0); ctx.lineTo(api.W / 2 + 40, 0);
          ctx.lineTo(api.W / 2 + 140, 400); ctx.lineTo(api.W / 2 - 140, 400); ctx.closePath(); ctx.fill();
        }
        if (alien) { drawAlien(ctx, alien); }

        tags.forEach(function (t) {
          var x = t.x, y = t.y, s = 1;
          if (t.fly > 0) {
            x = U.lerp(t.x, api.W / 2 - t.w / 2, t.fly);
            y = U.lerp(t.y, 330, t.fly);
            s = 1 - t.fly * 0.4;
            if (t.fly >= 1) { return; }
          }
          var dx = t.shake ? Math.sin(t.shake * 40) * 10 * t.shake : 0;
          U.tile(ctx, { x: x + dx, y: y, w: t.w, h: t.h, r: 22, scale: s,
            fill: t.shake ? '#ffd0d6' : '#ffffff', text: t.text, fontSize: 54 });
        });

        if (state === 'ask' && round === 1) {
          U.badge(ctx, api.W / 2, 440, 'Tap the alien to hear its name again', { align: 'center', icon: '👂', size: 18 });
        }
      }

      newRound();
      return { update: update, draw: draw, down: down,
        debug: function () { return { target: target && target.w, tags: tags.map(function (t) { return t.text; }), state: state, round: round }; } };
    }
  };
})(window.PH = window.PH || {});
