/* Letter Dash and Quick Words - one minute against the clock, like the school screening.
   DIBELS times its letter and word tasks because knowing a letter is not enough: a
   reader who has to stop and think about each one has nothing left over for the
   meaning. What the screening rewards is knowing them at a glance. So both games run
   for sixty seconds and count what the child gets, and remember the best minute so
   there is always one number to beat.

   The screening has the child say each letter or word aloud to a grown-up, and a game
   cannot hear. Here the voice says it and the child finds it, which trains the same
   instant link between the sound of a name and the look of it. Practice Minute is the
   one where the child does the saying. */
(function (PH) {
  'use strict';
  var U = PH.util;

  var SECONDS = 60;

  /* letters that are easy to mistake for one another, in either case - the ones a
     sheet of mixed letters is really testing */
  var LOOKS = {
    b: 'dpqh', d: 'bpqa', p: 'qbdg', q: 'pgdb', m: 'nwu', n: 'mhu', w: 'mvu', u: 'nvy',
    i: 'ljt', l: 'itj', j: 'igy', t: 'fil', f: 'tjk', h: 'nbk', c: 'eoa', e: 'coa',
    o: 'cea', a: 'odg', g: 'qpy', v: 'wyu', y: 'vgj', k: 'hxf', x: 'kzy', z: 'sxn',
    s: 'zce', r: 'nvt'
  };
  var CAPS = { B: 'DPER', D: 'BOPQ', P: 'RBF', Q: 'OGC', M: 'NWH', N: 'MHZ', W: 'MVN',
    E: 'FBL', F: 'EPT', O: 'QCD', C: 'GOQ', G: 'CQO', I: 'LJT', L: 'IJT', U: 'VJ',
    V: 'UWY', K: 'XRH', X: 'KYZ', R: 'PBK', S: 'ZC' };

  function make(opts) {
    return {
      id: opts.id,
      name: opts.name,
      icon: opts.icon,
      blurb: opts.blurb,

      create: function (api) {
        var letters = opts.kind === 'letters';
        var BEST_KEY = 'ph-best-' + opts.id + '-' + api.level.id;
        var best = 0;
        try { best = parseInt(localStorage.getItem(BEST_KEY), 10) || 0; } catch (e) { /* private mode */ }

        var words = letters ? null : PH.sightFor(api.level.id);
        var state = 'ready', left = SECONDS, hits = 0, misses = 0, streak = 0;
        var target = null, tiles = [], wait = 0, recent = [];
        var GO = { x: api.W / 2 - 130, y: 380, w: 260, h: 96 };
        var clouds = [];
        for (var i = 0; i < 7; i++) { clouds.push({ x: U.rand(0, api.W), y: U.rand(90, 300), s: U.rand(0.6, 1.3), v: U.rand(8, 20) }); }

        /* ---------------- one item ---------------- */
        function pickLetter() {
          var run = PH.letterRun(6).filter(function (c) { return recent.indexOf(c.toLowerCase()) < 0; });
          var t = run[0] || PH.letterRun(1)[0];
          var low = t.toLowerCase();
          /* look-alikes first, in the same case as the target so shape is all there is to go
             on, then others to fill; never the target's own other case, which would also
             be right */
          var pool = (t === low ? (LOOKS[low] || '') : (CAPS[t] || '')).split('');
          var others = U.shuffle(PH.ALPHABET.filter(function (l) { return l !== low; }))
            .map(function (l) { return Math.random() < 0.5 ? l : l.toUpperCase(); });
          var out = [];
          pool.concat(others).forEach(function (c) {
            if (out.length >= 5) { return; }
            if (c.toLowerCase() === low) { return; }
            /* capital I and small l are the same stroke in most type: never side by side */
            if ((t === 'I' && c === 'l') || (t === 'l' && c === 'I')) { return; }
            if (out.some(function (o) { return o.toLowerCase() === c.toLowerCase(); })) { return; }
            out.push(c);
          });
          return { text: t, say: t.toUpperCase(), key: low, others: out };
        }

        function pickWord() {
          var pool = words.filter(function (w) { return recent.indexOf(w.w) < 0; });
          var t = U.pick(pool.length ? pool : words);
          return { text: t.w, say: t.w, key: t.w, others: PH.lookAlikes(t, words, 3).map(function (w) { return w.w; }) };
        }

        function next() {
          target = letters ? pickLetter() : pickWord();
          recent.push(target.key);
          if (recent.length > (letters ? 4 : 6)) { recent.shift(); }
          var list = U.shuffle([target.text].concat(target.others));
          var cols = letters ? 3 : 2, cw = letters ? 190 : 330, ch = letters ? 150 : 120;
          var gx = 26, gy = 26;
          var rows = Math.ceil(list.length / cols);
          var x0 = api.W / 2 - (cols * cw + (cols - 1) * gx) / 2;
          var y0 = 330 - (rows * ch + (rows - 1) * gy) / 2 + 40;
          tiles = list.map(function (text, n) {
            return {
              text: text, right: text === target.text,
              x: x0 + (n % cols) * (cw + gx), y: y0 + Math.floor(n / cols) * (ch + gy),
              w: cw, h: ch, shake: 0, flash: 0, pop: 0.001
            };
          });
          say();
        }

        function say() {
          if (!target) { return; }
          if (letters) { api.say(target.say, { rate: 0.9 }); } else { api.sayWord(target.say); }
        }

        function start() {
          state = 'run'; left = SECONDS; hits = 0; misses = 0; streak = 0;
          api.sfx.great();
          api.setPrompt(letters ? 'Tap the letter you hear' : 'Tap the word you hear', { repeat: say });
          next();
        }

        function end() {
          state = 'over';
          tiles = [];
          var record = hits > best;
          if (record) {
            best = hits;
            try { localStorage.setItem(BEST_KEY, String(best)); } catch (e) { /* private mode */ }
          }
          var what = letters ? (hits === 1 ? 'letter' : 'letters') : (hits === 1 ? 'word' : 'words');
          api.finish((record ? 'New best! ' : '') + hits + ' ' + what + ' in a minute',
            hits + misses ? hits / (hits + misses) : 1);
        }

        function down(p) {
          if (state === 'ready') {
            if (p.x >= GO.x && p.x <= GO.x + GO.w && p.y >= GO.y && p.y <= GO.y + GO.h) { start(); }
            return;
          }
          if (state !== 'run' || wait > 0) { return; }
          tiles.forEach(function (t) {
            if (p.x < t.x || p.x > t.x + t.w || p.y < t.y || p.y > t.y + t.h) { return; }
            if (t.right) {
              hits++; streak++;
              t.flash = 1;
              api.addStar(1);
              api.sfx.good();
              api.burst(t.x + t.w / 2, t.y + t.h / 2, ['#ffd23f', '#8ef0ff', '#3ddc84'], 12, { shape: streak >= 5 ? 'star' : undefined });
              wait = 0.3;
            } else if (!t.shake) {
              misses++; streak = 0;
              t.shake = 0.5;
              api.sfx.boing();
              say();
            }
          });
        }

        function key(e) {
          if (state === 'ready' && (e.key === 'Enter' || e.key === ' ')) { start(); e.preventDefault(); }
        }

        function update(dt) {
          clouds.forEach(function (c) { c.x += c.v * dt; if (c.x > api.W + 120) { c.x = -120; } });
          tiles.forEach(function (t) {
            if (t.shake > 0) { t.shake = Math.max(0, t.shake - dt); }
            if (t.flash > 0) { t.flash = Math.max(0, t.flash - dt * 2.5); }
            if (t.pop > 0 && t.pop < 1) { t.pop = Math.min(1, t.pop + dt * 6); }
          });
          if (state !== 'run') { return; }
          left -= dt;
          if (left <= 0) { left = 0; end(); return; }
          if (wait > 0) {
            wait -= dt;
            if (wait <= 0) { wait = 0; next(); }
          }
        }

        /* ---------------- drawing ---------------- */
        function draw(ctx) {
          var sky = ctx.createLinearGradient(0, 0, 0, api.H);
          sky.addColorStop(0, letters ? '#ffe1a8' : '#c8f0ff');
          sky.addColorStop(1, letters ? '#ffc2d1' : '#d9ccff');
          ctx.fillStyle = sky; ctx.fillRect(0, 0, api.W, api.H);
          ctx.fillStyle = 'rgba(255,255,255,.55)';
          clouds.forEach(function (c) {
            ctx.beginPath();
            ctx.ellipse(c.x, c.y, 60 * c.s, 22 * c.s, 0, 0, Math.PI * 2);
            ctx.ellipse(c.x + 34 * c.s, c.y - 12 * c.s, 40 * c.s, 20 * c.s, 0, 0, Math.PI * 2);
            ctx.fill();
          });

          /* the clock: a bar that empties, going amber and then red near the end */
          var frac = left / SECONDS;
          var bx = 90, by = 34, bw = api.W - 180, bh = 30;
          ctx.fillStyle = 'rgba(31,35,64,.18)';
          U.roundRect(ctx, bx, by, bw, bh, 15); ctx.fill();
          ctx.fillStyle = frac > 0.33 ? '#3ddc84' : (frac > 0.12 ? '#ffb238' : '#ff5d6c');
          if (frac > 0) { U.roundRect(ctx, bx, by, Math.max(bh, bw * frac), bh, 15); ctx.fill(); }
          ctx.font = U.font(20); ctx.fillStyle = '#1f2340';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(Math.ceil(left) + ' s', api.W / 2, by + bh / 2 + 1);

          U.badge(ctx, 90, 82, hits + ' right', { icon: '⭐' });
          if (best) { U.badge(ctx, api.W - 90, 82, 'Best ' + best, { icon: '🏆', align: 'right' }); }

          if (state === 'ready') {
            ctx.font = U.font(40); ctx.fillStyle = '#1f2340'; ctx.textAlign = 'center';
            ctx.fillText(letters ? 'How many letters in one minute?' : 'How many words in one minute?', api.W / 2, 250);
            ctx.font = U.font(22); ctx.fillStyle = 'rgba(31,35,64,.7)';
            ctx.fillText(letters ? 'Listen for the letter name, then tap it. Big or small both count.'
              : 'Listen for the word, then tap it as fast as you can.', api.W / 2, 305);
            U.plate(ctx, GO.x, GO.y, GO.w, GO.h, { fill: '#3ddc84', r: 30 });
            ctx.font = U.font(46); ctx.fillStyle = '#fff';
            ctx.fillText('Go!', GO.x + GO.w / 2, GO.y + GO.h / 2 + 2);
            return;
          }

          tiles.forEach(function (t) {
            var dx = t.shake ? Math.sin(t.shake * 40) * 10 * t.shake : 0;
            var s = t.pop < 1 ? 0.6 + 0.4 * t.pop : 1;
            U.tile(ctx, {
              x: t.x + dx, y: t.y, w: t.w, h: t.h, scale: s, r: 26,
              fill: t.flash > 0 ? '#b8f5cf' : (t.shake ? '#ffd0d6' : '#ffffff'),
              text: t.text, fontSize: letters ? 92 : 50
            });
          });
        }

        api.setPrompt(letters ? 'Letter Dash' : 'Quick Words');
        api.setProgress(0, 0);
        return { update: update, draw: draw, down: down, key: key,
          /* read-only peek at the state, used by automated play-through checks */
          debug: function () {
            return { state: state, target: target && target.text, hits: hits, misses: misses, left: left,
              tiles: tiles.map(function (t) { return { text: t.text, right: t.right, x: t.x + t.w / 2, y: t.y + t.h / 2 }; }) };
          } };
      }
    };
  }

  PH.games.letterdash = make({
    id: 'letterdash', kind: 'letters', icon: '🔤',
    name: 'Letter Dash',
    blurb: 'Hear a letter name and tap it, big or small. How many can you get in one minute?'
  });

  PH.games.quickwords = make({
    id: 'quickwords', kind: 'words', icon: '⚡',
    name: 'Quick Words',
    blurb: 'Hear a sight word like "was" or "the" and tap it fast. Beat your best minute!'
  });
})(window.PH = window.PH || {});
