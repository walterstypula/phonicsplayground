/* Practice Minute - the school screening's one-minute tasks, done at home with a grown-up.

   DIBELS 8 is given one to one: the child reads from a sheet for a minute while a grown-up
   marks what they get wrong. Much of a first score is the format itself - a sheet full of
   letters to work along without stopping, a stopwatch, an adult writing things down. A
   child who has done it at the kitchen table a few times shows what they can really do.

   The game cannot hear, so the grown-up does what the tester does: taps anything read
   wrong, and when the minute is up taps the last thing the child reached. Every sheet is
   new each time (the letters, words and made-up words are drawn fresh), so nothing can
   be learnt off by heart, and each score is kept so a family can watch it grow.

   The sheets:
     Letters      Letter Naming Fluency        say the name of each letter, big or small
     Sounds       Phonemic Segmentation        the grown-up says a word, the child says its sounds
     Made-up      Nonsense Word Fluency        read made-up words, whole or sound by sound
     Words        Word Reading Fluency         read real words, many of them sight words
     Story        Oral Reading Fluency         read a story aloud

   These are practice sheets in the test's shapes, not the test's own items, and the
   scores are for watching progress at home, not the school's benchmark goals.        */
(function (PH) {
  'use strict';
  var U = PH.util;

  var SECONDS = 60;
  var BREAK = {};                  /* marks where one story ends and the next begins */
  var AREA = { x: 50, y: 92, w: 900, h: 468 };

  var SHEETS = [
    { id: 'lnf', name: 'Letters', icon: '🔤', test: 'Letter Naming', grades: 'K-1',
      unit: 'letters named', kind: 'grid', cols: 10, font: 40, cellH: 58,
      tell: 'Point to each letter and say its name. Go across the row, then the next row.' },
    { id: 'psf', name: 'Sounds', icon: '👂', test: 'Phonemic Segmentation', grades: 'K-1',
      unit: 'sounds said', kind: 'psf',
      tell: 'Grown-up: say the word. Child: say every sound in it - "ship" is /sh/ /i/ /p/.' },
    { id: 'nwf', name: 'Made-up', icon: '👽', test: 'Nonsense Word Fluency', grades: 'K-3',
      unit: 'made-up words read right', kind: 'grid', cols: 5, font: 40, cellH: 64,
      tell: 'These are made-up words. Read the whole word, or say its sounds and then the word.' },
    { id: 'wrf', name: 'Words', icon: '⚡', test: 'Word Reading Fluency', grades: 'K-3',
      unit: 'words read right', kind: 'grid', cols: 5, font: 38, cellH: 64,
      tell: 'Read each word. Go across the row, then the next row.' },
    { id: 'orf', name: 'Story', icon: '📖', test: 'Oral Reading Fluency', grades: '1-3',
      unit: 'words read correctly', kind: 'text', font: 30, lineH: 50,
      tell: 'Read the story out loud. Do your best reading.' }
  ];

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }

  PH.games.practice = {
    id: 'practice',
    name: 'Practice Minute',
    icon: '⏱️',
    blurb: 'For a grown-up and a reader: the one-minute reading checks schools use, with a score to beat.',

    create: function (api) {
      var lvl = api.level.id;
      var measure = document.createElement('canvas').getContext('2d');
      var state = 'menu', sheet = null, items = [], page = 0, pages = 1, left = SECONDS;
      var used = 0, lastAt = -1, result = null, buttons = [], psf = null;

      /* kept per level: a score on harder words is not a step back from one on easier ones */
      function historyOf(id) {
        try { return JSON.parse(localStorage.getItem('ph-practice-' + id + '-' + lvl)) || []; } catch (e) { return []; }
      }
      function save(id, entry) {
        var h = historyOf(id);
        h.push(entry);
        try { localStorage.setItem('ph-practice-' + id + '-' + lvl, JSON.stringify(h.slice(-30))); } catch (e) { /* private mode */ }
      }

      /* ---------------- what goes on each sheet ---------------- */
      function nonsenseRun(n) {
        /* the test's older forms mix the patterns row by row; this takes the words in
           a shuffled order from all the patterns the level uses, never twice running */
        var pool = PH.nonsenseFor(Math.max(1, lvl)), out = [];
        while (out.length < n) { out = out.concat(U.shuffle(pool)); }
        return out.slice(0, n).map(function (w) { return w.w; });
      }

      function wordRun(n) {
        /* sight words alongside the level's own decodable words, as the test mixes both */
        var sight = PH.sightFor(lvl).map(function (w) { return w.w; });
        var real = PH.wordsUpTo(U.clamp(lvl, 1, 4)).map(function (w) { return w.w; });
        var out = [];
        while (out.length < n) {
          var s = U.shuffle(sight), r = U.shuffle(real);
          for (var k = 0; k < Math.max(s.length, r.length); k++) {
            if (s[k]) { out.push(s[k]); }
            if (k % 2 === 0 && r[k]) { out.push(r[k]); }
          }
        }
        return out.slice(0, n);
      }

      function storyWords() {
        /* the level's stories first, then the ones around it, so a fast reader does not
           run off the end of the page before the minute is out */
        var shelf = (PH.STORIES || []).slice();
        var target = U.clamp(lvl, 0, 5);
        shelf.sort(function (a, b) { return Math.abs(a.level - target) - Math.abs(b.level - target) || a.level - b.level; });
        var words = [];
        shelf.forEach(function (st) {
          if (Math.abs(st.level - target) > 1) { return; }
          if (words.length) { words.push(BREAK); }          /* each story on a fresh line */
          st.lines.forEach(function (line) { words = words.concat(line.split(/\s+/).filter(Boolean)); });
        });
        return words;
      }

      function psfWords() {
        var src = api.pre || lvl <= 0 ? PH.wordsUpTo(1) : PH.wordsUpTo(U.clamp(lvl, 1, 4));
        return U.shuffle(src).map(function (w) {
          var parts = PH.soundOut(w).filter(function (p) { return p.hint; });
          return { w: w.w, parts: parts.map(function (p) { return { text: p.text, id: String(p.hint).replace('/', ''), ok: true }; }) };
        }).filter(function (w) { return w.parts.length >= 2 && w.parts.length <= 6; });
      }

      /* ---------------- laying a sheet out in pages ---------------- */
      function layoutGrid(list) {
        var cw = AREA.w / sheet.cols, rows = Math.floor(AREA.h / sheet.cellH), per = rows * sheet.cols;
        return list.map(function (text, n) {
          var k = n % per;
          return { text: text, wrong: false, page: Math.floor(n / per),
            x: AREA.x + (k % sheet.cols) * cw, y: AREA.y + Math.floor(k / sheet.cols) * sheet.cellH, w: cw, h: sheet.cellH };
        });
      }

      function layoutText(words) {
        measure.font = U.font(sheet.font);
        var space = measure.measureText(' ').width;
        var perPage = Math.floor(AREA.h / sheet.lineH), line = 0, x = 0, out = [];
        words.forEach(function (text) {
          if (text === BREAK) { if (x > 0) { line++; x = 0; } return; }
          var w = measure.measureText(text).width;
          if (x > 0 && x + w > AREA.w) { line++; x = 0; }
          out.push({ text: text, wrong: false, page: Math.floor(line / perPage),
            x: AREA.x + x - 4, y: AREA.y + (line % perPage) * sheet.lineH, w: w + 8, h: sheet.lineH });
          x += w + space;
        });
        return out;
      }

      function open(s) {
        sheet = s; page = 0; left = SECONDS; used = 0; lastAt = -1; result = null; psf = null;
        if (s.kind === 'grid') {
          items = layoutGrid(s.id === 'lnf' ? PH.letterRun(240) : s.id === 'nwf' ? nonsenseRun(160) : wordRun(160));
        } else if (s.kind === 'text') {
          items = layoutText(storyWords());
        } else {
          items = [];
          psf = { list: psfWords(), at: 0, got: 0, wrong: 0 };
        }
        pages = items.length ? items[items.length - 1].page + 1 : 1;
        state = 'ready';
        api.sfx.click();
        api.setPrompt(s.icon + ' ' + s.name + ' - ' + s.test);
      }

      function begin() {
        state = 'run';
        api.sfx.whistle();
      }

      function timeUp() {
        used = SECONDS - left;
        if (sheet.kind === 'psf') { score(); return; }
        state = 'last';
        api.sfx.whistle();
      }

      function score() {
        var got = 0, wrong = 0, reached = 0, extra = '';
        if (sheet.kind === 'psf') {
          /* only words the grown-up moved on from: one cut off by the clock is not scored */
          got = psf.got; wrong = psf.wrong;
          reached = got + wrong;
        } else {
          items.forEach(function (it, n) {
            if (n > lastAt) { return; }
            reached++;
            if (it.wrong) { wrong++; } else { got++; }
          });
          if (sheet.id === 'nwf') {
            /* the test also counts every correct letter sound; a word read right has all
               of its sounds right, which is the most this sheet can tell */
            var sounds = 0;
            items.forEach(function (it, n) { if (n <= lastAt && !it.wrong) { sounds += PH.soundsIn(it.text).length; } });
            extra = sounds + ' letter sounds in the words read right';
          }
          if (sheet.id === 'orf' && reached) {
            extra = Math.round(got / reached * 100) + '% of words read correctly';
          }
        }
        /* stopping early, or a story finished before the minute, counts as a rate */
        var secs = Math.max(1, used || SECONDS);
        var perMin = secs < SECONDS - 0.5 ? Math.round(got * SECONDS / secs) : got;
        result = { got: got, wrong: wrong, perMin: perMin, secs: Math.round(secs), extra: extra };
        var hist = historyOf(sheet.id);
        result.best = hist.reduce(function (m, h) { return Math.max(m, h.s); }, 0);
        save(sheet.id, { d: today(), s: perMin, e: wrong, l: lvl });
        state = 'result';
        api.sfx.win();
        if (perMin > result.best && result.best) { api.confetti(); }
      }

      /* ---------------- input ---------------- */
      function hit(p, b) { return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; }

      function down(p) {
        for (var n = 0; n < buttons.length; n++) {
          if (hit(p, buttons[n])) { buttons[n].act(); return; }
        }
        if (state === 'run' && sheet.kind !== 'psf') {
          items.forEach(function (it) {
            if (it.page === page && hit(p, it)) { it.wrong = !it.wrong; api.sfx.click(); }
          });
        } else if (state === 'run' && sheet.kind === 'psf' && psf.box) {
          psf.box.forEach(function (b, k) {
            if (hit(p, b)) { var part = psf.list[psf.at].parts[k]; part.ok = !part.ok; api.sfx.click(); }
          });
        } else if (state === 'last') {
          items.forEach(function (it, n) {
            if (it.page === page && hit(p, it)) { lastAt = n; api.sfx.good(); score(); }
          });
        }
      }

      function update(dt) {
        if (state === 'run') {
          left -= dt;
          if (left <= 0) { left = 0; timeUp(); }
        }
      }

      /* ---------------- drawing ---------------- */
      function button(ctx, b) {
        U.plate(ctx, b.x, b.y, b.w, b.h, { fill: b.fill || '#ffffff', r: Math.min(22, b.h / 2) });
        ctx.font = U.font(b.size || 24);
        ctx.fillStyle = b.ink || '#1f2340';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 2);
        buttons.push(b);
      }

      function wrapText(ctx, text, x, y, width, lineH) {
        var words = text.split(' '), line = '';
        words.forEach(function (w) {
          var t = line ? line + ' ' + w : w;
          if (ctx.measureText(t).width > width && line) { ctx.fillText(line, x, y); y += lineH; line = w; }
          else { line = t; }
        });
        if (line) { ctx.fillText(line, x, y); y += lineH; }
        return y;
      }

      function drawMenu(ctx) {
        ctx.fillStyle = '#1f2340'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = U.font(36);
        ctx.fillText('One-minute reading practice', api.W / 2, 64);
        ctx.font = U.font(19); ctx.fillStyle = 'rgba(31,35,64,.72)';
        wrapText(ctx, 'For a grown-up and a reader, like the reading check at school. The child reads aloud; you tap anything they get wrong. If they are stuck for 3 seconds, say it for them and tap it wrong.',
          api.W / 2, 104, 860, 26);
        var cw = 172, gap = 14, x0 = api.W / 2 - (SHEETS.length * cw + (SHEETS.length - 1) * gap) / 2;
        SHEETS.forEach(function (s, k) {
          var x = x0 + k * (cw + gap), y = 190, h = 290;
          var hist = historyOf(s.id);
          var best = hist.reduce(function (m, e) { return Math.max(m, e.s); }, 0);
          var lastOne = hist[hist.length - 1];
          U.plate(ctx, x, y, cw, h, { fill: PH.COLORS[k % PH.COLORS.length], r: 22 });
          ctx.textAlign = 'center';
          ctx.font = '52px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
          ctx.fillText(s.icon, x + cw / 2, y + 56);
          ctx.fillStyle = '#1f2340'; ctx.font = U.font(26);
          ctx.fillText(s.name, x + cw / 2, y + 116);
          ctx.font = U.font(15); ctx.fillStyle = 'rgba(31,35,64,.75)';
          wrapText(ctx, s.test, x + cw / 2, y + 148, cw - 20, 19);
          ctx.fillText('Grades ' + s.grades, x + cw / 2, y + 194);
          ctx.font = U.font(18); ctx.fillStyle = '#1f2340';
          ctx.fillText(lastOne ? 'Last: ' + lastOne.s : 'Not tried yet', x + cw / 2, y + 232);
          if (best) { ctx.fillText('Best: ' + best + ' 🏆', x + cw / 2, y + 258); }
          buttons.push({ x: x, y: y, w: cw, h: h, act: function () { open(s); } });
        });
        ctx.font = U.font(16); ctx.fillStyle = 'rgba(31,35,64,.6)';
        wrapText(ctx, 'Practice sheets in the same format as the DIBELS 8 screening - not the test itself. Compare scores with each other, and ask the school for the goal for your child\'s grade.',
          api.W / 2, 530, 860, 22);
      }

      function drawGrid(ctx) {
        items.forEach(function (it, n) {
          if (it.page !== page) { return; }
          var past = state === 'last' || state === 'result';
          var beyond = lastAt >= 0 && n > lastAt;
          ctx.font = U.font(sheet.font);
          ctx.textAlign = sheet.kind === 'text' ? 'left' : 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = beyond ? 'rgba(31,35,64,.25)' : '#1f2340';
          var tx = sheet.kind === 'text' ? it.x + 4 : it.x + it.w / 2, ty = it.y + it.h / 2;
          ctx.fillText(it.text, tx, ty);
          if (it.wrong) {
            ctx.strokeStyle = '#e8456f'; ctx.lineWidth = 5; ctx.lineCap = 'round';
            var w = ctx.measureText(it.text).width, cx = sheet.kind === 'text' ? it.x + 4 + w / 2 : it.x + it.w / 2;
            ctx.beginPath(); ctx.moveTo(cx - w / 2 - 6, ty + 16); ctx.lineTo(cx + w / 2 + 6, ty - 16); ctx.stroke();
          }
          if (n === lastAt) {
            ctx.strokeStyle = '#2f9e44'; ctx.lineWidth = 5;
            var rx = it.x + it.w - 4;
            ctx.beginPath(); ctx.moveTo(rx - 8, it.y + 6); ctx.lineTo(rx, it.y + 6); ctx.lineTo(rx, it.y + it.h - 6); ctx.lineTo(rx - 8, it.y + it.h - 6); ctx.stroke();
          }
          if (past && state === 'last') {
            ctx.strokeStyle = 'rgba(47,158,68,.25)'; ctx.lineWidth = 1;
            ctx.strokeRect(it.x + 2, it.y + 2, it.w - 4, it.h - 4);
          }
        });
        if (pages > 1) {
          if (page < pages - 1) { button(ctx, { x: api.W - 250, y: 572, w: 200, h: 54, label: 'Next page ▶', size: 22, act: function () { page++; api.sfx.click(); } }); }
          if (page > 0) { button(ctx, { x: 50, y: 572, w: 200, h: 54, label: '◀ Back', size: 22, act: function () { page--; api.sfx.click(); } }); }
        }
      }

      function drawPSF(ctx) {
        var w = psf.list[psf.at];
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = U.font(22); ctx.fillStyle = 'rgba(31,35,64,.7)';
        ctx.fillText('Grown-up, say:', api.W / 2, 140);
        ctx.font = U.font(64); ctx.fillStyle = '#1f2340';
        ctx.fillText(w.w, api.W / 2, 200);
        ctx.font = U.font(20); ctx.fillStyle = 'rgba(31,35,64,.7)';
        ctx.fillText('Every sound starts green. Tap one the child missed or got wrong.', api.W / 2, 262);
        var bw = 120, gap = 18, x0 = api.W / 2 - (w.parts.length * bw + (w.parts.length - 1) * gap) / 2;
        psf.box = w.parts.map(function (p, k) {
          var b = { x: x0 + k * (bw + gap), y: 300, w: bw, h: 130 };
          U.plate(ctx, b.x, b.y, b.w, b.h, { fill: p.ok ? '#b8f5cf' : '#ffc9d1', r: 20 });
          ctx.fillStyle = '#1f2340'; ctx.font = U.font(46);
          ctx.fillText(p.text, b.x + bw / 2, b.y + 52);
          ctx.font = U.font(20); ctx.fillStyle = 'rgba(31,35,64,.7)';
          ctx.fillText('/' + p.id + '/', b.x + bw / 2, b.y + 100);
          return b;
        });
        ctx.font = U.font(20); ctx.fillStyle = '#1f2340';
        ctx.fillText(psf.got ? psf.got + ' sounds so far' : '', api.W / 2, 470);
        button(ctx, { x: api.W / 2 - 150, y: 500, w: 300, h: 70, label: 'Next word ▶', fill: '#ffd23f', size: 28, act: function () {
          w.parts.forEach(function (p) { if (p.ok) { psf.got++; } else { psf.wrong++; } });
          if (psf.at < psf.list.length - 1) { psf.at++; }
          api.sfx.click();
        } });
      }

      function drawResult(ctx) {
        var r = result;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = '70px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
        ctx.fillText(r.perMin > r.best && r.best ? '🏆' : '⭐', api.W / 2, 150);
        ctx.fillStyle = '#1f2340'; ctx.font = U.font(76);
        ctx.fillText(String(r.perMin), api.W / 2, 240);
        ctx.font = U.font(28);
        ctx.fillText(sheet.unit + (r.secs < SECONDS ? ' per minute' : ' in one minute'), api.W / 2, 300);
        ctx.font = U.font(20); ctx.fillStyle = 'rgba(31,35,64,.75)';
        var lines = [];
        if (r.wrong) { lines.push(r.wrong + ' marked wrong'); }
        if (r.extra) { lines.push(r.extra); }
        if (r.secs < SECONDS) { lines.push('stopped at ' + r.secs + ' seconds, so this is worked out per minute'); }
        if (r.best) { lines.push(r.perMin > r.best ? 'A new best - the old one was ' + r.best : 'Best so far: ' + r.best); }
        lines.forEach(function (l, k) { ctx.fillText(l, api.W / 2, 344 + k * 28); });

        /* the last few tries, as little bars */
        var hist = historyOf(sheet.id).slice(-8);
        var top = hist.reduce(function (m, h) { return Math.max(m, h.s); }, 1);
        var bw = 46, x0 = api.W / 2 - (hist.length * (bw + 10)) / 2;
        hist.forEach(function (h, k) {
          var bh = 70 * h.s / top, x = x0 + k * (bw + 10);
          ctx.fillStyle = k === hist.length - 1 ? '#ffb238' : 'rgba(77,141,255,.55)';
          U.roundRect(ctx, x, 540 - bh, bw, bh, 6); ctx.fill();
          ctx.fillStyle = '#1f2340'; ctx.font = U.font(14);
          ctx.fillText(String(h.s), x + bw / 2, 530 - bh);
        });
        button(ctx, { x: api.W / 2 - 320, y: 566, w: 300, h: 60, label: 'Try again', fill: '#3ddc84', act: function () { open(sheet); } });
        button(ctx, { x: api.W / 2 + 20, y: 566, w: 300, h: 60, label: 'Choose a sheet', act: function () {
          state = 'menu'; sheet = null; api.sfx.click(); api.setPrompt('Practice Minute');
        } });
      }

      function draw(ctx) {
        buttons = [];
        ctx.fillStyle = '#fbf8f0'; ctx.fillRect(0, 0, api.W, api.H);
        /* faint ruled lines, like a sheet of school paper */
        ctx.strokeStyle = 'rgba(77,141,255,.08)'; ctx.lineWidth = 2;
        for (var y = 30; y < api.H; y += 36) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(api.W, y); ctx.stroke(); }

        if (state === 'menu') { drawMenu(ctx); return; }
        if (state === 'result') { drawResult(ctx); return; }

        /* the clock along the top, and a way to stop */
        var frac = left / SECONDS;
        ctx.fillStyle = 'rgba(31,35,64,.12)';
        U.roundRect(ctx, 250, 26, 500, 34, 17); ctx.fill();
        ctx.fillStyle = frac > 0.25 ? '#4d8dff' : '#ff5d6c';
        if (frac > 0) { U.roundRect(ctx, 250, 26, Math.max(34, 500 * frac), 34, 17); ctx.fill(); }
        ctx.font = U.font(20); ctx.fillStyle = '#1f2340'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(state === 'last' ? 'Time!' : Math.ceil(left) + ' seconds', api.W / 2, 44);

        if (sheet.kind === 'psf') {
          if (state === 'run') { drawPSF(ctx); }
        } else {
          drawGrid(ctx);
        }

        if (state === 'ready') {
          ctx.fillStyle = 'rgba(251,248,240,.86)'; ctx.fillRect(0, 76, api.W, api.H - 76);
          ctx.fillStyle = '#1f2340'; ctx.textAlign = 'center';
          ctx.font = U.font(30);
          wrapText(ctx, sheet.tell, api.W / 2, 190, 820, 40);
          ctx.font = U.font(20); ctx.fillStyle = 'rgba(31,35,64,.72)';
          wrapText(ctx, sheet.kind === 'psf'
            ? 'Start the clock, say the first word, and tap Next word after each one.'
            : 'Start the clock as they begin. Tap anything read wrong - tap again to undo. Turn the page when they reach the bottom.',
            api.W / 2, 320, 820, 28);
          button(ctx, { x: api.W / 2 - 150, y: 420, w: 300, h: 86, label: 'Start the minute', fill: '#3ddc84', size: 28, act: begin });
          button(ctx, { x: 30, y: 20, w: 150, h: 46, label: '◀ Sheets', size: 20, act: function () { state = 'menu'; api.setPrompt('Practice Minute'); } });
        } else if (state === 'run') {
          button(ctx, { x: 30, y: 20, w: 150, h: 46, label: 'Stop', size: 20, fill: '#ffd0d6', act: function () {
            if (sheet.kind === 'psf') { used = SECONDS - left; score(); } else { used = SECONDS - left; state = 'last'; }
          } });
        } else if (state === 'last') {
          U.badge(ctx, api.W / 2, 572, 'Tap the last one they read', { align: 'center', icon: '👆', size: 22, top: 'rgba(47,158,68,.95)', bottom: 'rgba(30,110,50,.95)' });
        }
      }

      api.setPrompt('Practice Minute');
      return { update: update, draw: draw, down: down,
        debug: function () { return { state: state, sheet: sheet && sheet.id, items: items.length, pages: pages, page: page, left: left, result: result, psf: psf && psf.list.length }; } };
    }
  };
})(window.PH = window.PH || {});
