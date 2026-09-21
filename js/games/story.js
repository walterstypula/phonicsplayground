/* Story Time - read a whole story, and get help on any word without losing your place.

   Sounding out one word at a time is where blending is learned, but it is not what
   reading is. A child who can blend "cat" on a flashcard and then meets it inside a
   sentence has a second job to do: hold the sentence in mind while the word is worked
   out, and come back to it afterwards. That is the job this game is for.

   So the story stays on screen the whole time and nothing ever hides it. Tapping a word
   makes it the one being worked on; Sound it out breaks it into the same sounds the
   snail stretches, lights them one at a time underneath, and then says the word whole -
   because a word sounded out and not put back together is not read yet.

   Tricky words are not sounded out at all. "said" and "was" do not obey the rules, and
   a child who tries to blend them is being taught that the rules cannot be trusted. The
   game says those out loud and says plainly that they are ones we simply know.        */
(function (PH) {
  'use strict';
  var U = PH.util;

  /* The words English spells in its own way, which every phonics scheme teaches by
     sight rather than by blending. Keeping the list here rather than in the stories
     means a contributor never has to mark them up. */
  var TRICKY = {};
  ('the a I to do of is his has was said you your they all are my her he she we me be ' +
   'no go so one two come some there what when where here love have live give little ' +
   'put who why been their were our out about into').split(' ')
    .forEach(function (w) { TRICKY[w] = 1; });

  PH.games.story = {
    id: 'story',
    name: 'Story Time',
    icon: '📖',
    blurb: 'Read a real story. Stuck on a word? Tap it and sound it out together, then carry on.',

    create: function (api) {
      var measure = document.createElement('canvas').getContext('2d');
      var LIT = ['#ff9f40', '#4d8dff', '#3ddc84', '#9b5de5', '#ff5d8f', '#2ec4b6'];

      var story = pickStory();
      var lines = [], words = [], size = 34;
      var curLine = 0, cur = null, helped = 0, chunkY = 0;
      var sounding = null, state = 'read', timer = 0, idle = 0;

      var HELP = { x: 0, y: 0, w: 260, h: 52 };
      var NEXT = { x: 0, y: 0, w: 190, h: 52 };

      /* ---------------- which story ---------------- */
      function pickStory() {
        var shelf = PH.STORIES || [];
        var want = Math.max(0, api.level.id);       /* the two pre-reader levels share level 0 */
        var mine = shelf.filter(function (s) { return s.level === want; });
        /* nothing written for this level yet: drop to the nearest one below it, so a new
           level never leaves the shelf empty */
        for (var d = want - 1; !mine.length && d >= 0; d--) {
          mine = shelf.filter(function (s) { return s.level === d; });
        }
        if (!mine.length) { mine = shelf; }
        return U.pick(mine) || { title: 'No stories yet', emoji: '📖', lines: ['Add one to stories/stories.js.'] };
      }

      /* ---------------- laying the story out ----------------
         Wrapped to the page and measured once, so that a word keeps its place on the
         screen for as long as the story is open: a line that reflows under a child who
         is reading it has lost them. */
      function layout() {
        /* the sounded-out chunks get a fixed place of their own down here, clear of the
           text: a row of boxes landing on top of the next line is worse than useless to
           a child who is trying to keep their place */
        chunkY = api.H - 152;
        var maxW = api.W - 150, top = 132, gap;
        for (size = 36; size >= 22; size -= 2) {
          measure.font = U.font(size);
          gap = Math.round(size * 1.72);
          lines = []; words = [];
          story.lines.forEach(function (text, n) {
            var row = [], rowW = 0;
            text.split(/\s+/).forEach(function (raw) {
              var w = measure.measureText(raw).width;
              if (row.length && rowW + w + size * 0.34 > maxW) { lines.push({ row: row, n: n }); row = []; rowW = 0; }
              row.push({ text: raw, w: w });
              rowW += w + size * 0.34;
            });
            if (row.length) { lines.push({ row: row, n: n }); }
          });
          if (top + lines.length * gap < chunkY - 70) { break; }
        }
        /* sit the block in the middle of the page rather than against the top of it */
        var block = lines.length * gap;
        var y = Math.max(top, top + ((chunkY - 70 - top) - block) / 2);
        lines.forEach(function (ln) {
          var total = 0;
          ln.row.forEach(function (w) { total += w.w + size * 0.34; });
          var x = api.W / 2 - (total - size * 0.34) / 2;
          ln.y = y;
          ln.row.forEach(function (w) {
            w.x = x; w.y = y; w.line = ln.n;
            w.bare = w.text.toLowerCase().replace(/[^a-z']/g, '');
            w.tricky = !!TRICKY[w.bare];
            words.push(w);
            x += w.w + size * 0.34;
          });
          y += gap;
        });
        HELP.x = api.W / 2 - HELP.w - 10;
        NEXT.x = api.W / 2 + 10;
        HELP.y = NEXT.y = api.H - 78;
      }

      /* ---------------- sounding a word out ---------------- */
      function partsOf(w) {
        return PH.soundOut({ w: w.bare, g: [w.bare] }).filter(function (p) { return p.hint; });
      }

      function soundOut() {
        if (!cur || sounding) { return; }
        helped++;
        idle = 0;
        if (cur.tricky) {
          /* no rule to apply, so none is pretended at */
          api.sfx.click();
          api.say('This one we just know.');
          api.say(cur.bare, { queue: true });
          return;
        }
        var parts = partsOf(cur);
        if (!parts.length) { api.sayWord(cur.bare); return; }
        PH.blend.warm(parts.map(function (p) { return p.hint; }));
        sounding = { parts: parts, i: -1, t: 99, done: false };
      }

      function stepSound() {
        sounding.i++;
        if (sounding.i >= sounding.parts.length) {
          /* the sounds back into the word: without this a child has taken it apart and
             left it in pieces */
          sounding.done = true;
          api.sayWord(cur.bare);
          api.sfx.twinkle();
          return;
        }
        var hint = sounding.parts[sounding.i].hint;
        if (!PH.blend.play(hint)) {
          if (!PH.blend.sequence(hint.charAt(0) === '/' ? [hint] : PH.soundsIn(hint))) {
            api.say(hint, { rate: 0.6 });
          }
        }
      }

      function sayLine() {
        var text = story.lines[curLine];
        if (text) { api.say(text, { rate: 0.72 }); }
      }

      function setLine(n) {
        curLine = n;
        cur = null;
        sounding = null;
        idle = 0;
        api.setProgress(curLine, story.lines.length);
        api.setPrompt('Read this line', { word: story.lines[curLine], show: true, repeat: sayLine });
      }

      function nextLine() {
        if (state !== 'read') { return; }
        PH.blend.stop();
        api.addStar(1);
        api.sfx.great();
        if (curLine + 1 >= story.lines.length) {
          state = 'over';
          api.setProgress(story.lines.length, story.lines.length);
          /* a story finished with help on every other word is still a story finished */
          var asked = helped / Math.max(1, words.length);
          api.confetti();
          api.finish('You read the whole story!', asked > 0.35 ? 0.8 : 1);
          return;
        }
        setLine(curLine + 1);
        api.burst(api.W / 2, lines[0].y, ['#ffd23f', '#8ef0ff'], 8, { gravity: 40, minSpeed: 30, maxSpeed: 90 });
      }

      /* ---------------- input ---------------- */
      function hitBox(b, p) {
        return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
      }

      function down(p) {
        if (state === 'over') { return; }
        idle = 0;
        if (hitBox(HELP, p)) { soundOut(); return; }
        if (hitBox(NEXT, p)) { nextLine(); return; }
        for (var i = 0; i < words.length; i++) {
          var w = words[i];
          if (w.line !== curLine) { continue; }
          if (p.x >= w.x - 6 && p.x <= w.x + w.w + 6 && p.y >= w.y - size && p.y <= w.y + size * 0.36) {
            cur = w;
            sounding = null;
            PH.blend.stop();
            api.sfx.click();
            api.sayWord(w.bare);
            return;
          }
        }
      }

      function update(dt) {
        idle += dt;
        if (sounding) {
          sounding.t += dt;
          if (sounding.done) {
            if (sounding.t > 1.1) { sounding = null; }
          } else if (sounding.t > 0.52) {
            sounding.t = 0;
            stepSound();
          }
        }
        if (state === 'read') { timer += dt; }
      }

      /* ---------------- drawing ---------------- */
      function draw(ctx) {
        var sky = ctx.createLinearGradient(0, 0, 0, api.H);
        sky.addColorStop(0, '#fdf6e8');
        sky.addColorStop(1, '#f2e6d4');
        ctx.fillStyle = sky; ctx.fillRect(0, 0, api.W, api.H);

        /* the page the story sits on */
        ctx.fillStyle = 'rgba(255,255,255,.82)';
        U.roundRect(ctx, 46, 92, api.W - 92, api.H - 190, 22); ctx.fill();
        ctx.strokeStyle = 'rgba(43,35,70,.1)'; ctx.lineWidth = 2;
        U.roundRect(ctx, 46, 92, api.W - 92, api.H - 190, 22); ctx.stroke();

        /* title */
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.font = '30px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
        ctx.fillStyle = '#2b2346';
        ctx.fillText(story.emoji || '📖', api.W / 2 - measureTitle(ctx) / 2 - 22, 66);
        ctx.font = U.font(26, '700');
        ctx.fillText(story.title, api.W / 2 + 18, 66);

        /* the story */
        ctx.textAlign = 'left';
        ctx.font = U.font(size);
        words.forEach(function (w) {
          var here = w.line === curLine;
          if (w === cur) {
            ctx.fillStyle = 'rgba(79,140,255,.16)';
            U.roundRect(ctx, w.x - 7, w.y - size * 0.95, w.w + 14, size * 1.32, 8); ctx.fill();
          }
          ctx.font = U.font(size);
          if (!here) { ctx.fillStyle = 'rgba(43,35,70,.26)'; }
          else if (w.tricky) { ctx.fillStyle = '#8a4bbd'; }
          else { ctx.fillStyle = '#2b2346'; }
          ctx.fillText(w.text, w.x, w.y);
        });

        /* the line being read, underlined so a finger has something to follow */
        var first = null, last = null;
        lines.forEach(function (ln) {
          if (ln.n !== curLine) { return; }
          if (!first) { first = ln; }
          last = ln;
        });
        if (first) {
          ctx.strokeStyle = 'rgba(79,140,255,.35)'; ctx.lineWidth = 3; ctx.lineCap = 'round';
          lines.forEach(function (ln) {
            if (ln.n !== curLine) { return; }
            var a = ln.row[0], z = ln.row[ln.row.length - 1];
            ctx.beginPath();
            ctx.moveTo(a.x - 4, ln.y + size * 0.3);
            ctx.lineTo(z.x + z.w + 4, ln.y + size * 0.3);
            ctx.stroke();
          });
        }

        if (sounding) { drawSounding(ctx); }
        else if (cur) { drawHintRow(ctx); }

        drawButtons(ctx);

        if (state === 'read' && !cur && idle > 3.5) {
          U.badge(ctx, api.W / 2, api.H - 118, 'Stuck on a word? Tap it.',
            { align: 'center', icon: '👆', size: 18 });
        }
      }

      function measureTitle(ctx) {
        ctx.font = U.font(26, '700');
        return ctx.measureText(story.title).width;
      }

      /* the chunks of the word being worked on, lighting one at a time */
      function drawSounding(ctx) {
        var y = chunkY;
        var boxes = sounding.parts.map(function (p) { return p.text; });
        ctx.font = U.font(30, '700');
        var pad = 16, gapX = 10, total = 0, widths = [];
        boxes.forEach(function (t) {
          var w = ctx.measureText(t).width + pad * 2;
          widths.push(w); total += w + gapX;
        });
        var x = api.W / 2 - (total - gapX) / 2;
        boxes.forEach(function (t, i) {
          var on = i <= sounding.i;
          ctx.fillStyle = on ? LIT[i % LIT.length] : 'rgba(43,35,70,.08)';
          U.roundRect(ctx, x, y - 30, widths[i], 46, 12); ctx.fill();
          ctx.fillStyle = on ? '#fff' : 'rgba(43,35,70,.45)';
          ctx.textAlign = 'center';
          ctx.font = U.font(30, '700');
          ctx.fillText(t, x + widths[i] / 2, y + 2);
          x += widths[i] + gapX;
        });
        ctx.textAlign = 'left';
      }

      /* before any sounding out, a quiet reminder of what the word is made of */
      function drawHintRow(ctx) {
        var y = chunkY;
        ctx.textAlign = 'center';
        ctx.font = U.font(18);
        if (cur.tricky) {
          ctx.fillStyle = '#8a4bbd';
          ctx.fillText('"' + cur.bare + '" is one we just know', api.W / 2, y);
        } else {
          ctx.fillStyle = 'rgba(43,35,70,.5)';
          ctx.fillText(partsOf(cur).map(function (p) { return p.text; }).join(' · '), api.W / 2, y);
        }
        ctx.textAlign = 'left';
      }

      function drawButtons(ctx) {
        ctx.textBaseline = 'middle';
        var canHelp = !!cur && state === 'read';
        ctx.fillStyle = canHelp ? 'rgba(45,110,80,.94)' : 'rgba(43,35,70,.22)';
        U.roundRect(ctx, HELP.x, HELP.y, HELP.w, HELP.h, 26); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.font = U.font(19, '700');
        ctx.fillText(canHelp ? '🔊  Sound it out' : 'Tap a word first', HELP.x + HELP.w / 2, HELP.y + HELP.h / 2 + 1);

        ctx.fillStyle = state === 'read' ? 'rgba(47,102,196,.94)' : 'rgba(43,35,70,.22)';
        U.roundRect(ctx, NEXT.x, NEXT.y, NEXT.w, NEXT.h, 26); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = U.font(19, '700');
        ctx.fillText(curLine + 1 >= story.lines.length ? 'Finish  ⭐' : 'Next line  ▶',
          NEXT.x + NEXT.w / 2, NEXT.y + NEXT.h / 2 + 1);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      }

      layout();
      setLine(0);
      api.say('Read the story. Tap any word you get stuck on.');

      return { update: update, draw: draw, down: down,
        move: function () {}, up: function () {},
        debug: function () {
          return { story: story, lines: lines, words: words, curLine: curLine,
            cur: cur, sounding: sounding, state: state, helped: helped,
            help: HELP, next: NEXT };
        } };
    }
  };
})(window.PH = window.PH || {});
