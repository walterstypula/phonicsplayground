/* Sentence Train - hook the word carriages onto the engine in the right order, then off it chugs */
(function (PH) {
  'use strict';
  var U = PH.util;
  var EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  var STORE = 'ph-train-cars';

  /* how many carriages this child has earned, kept between visits */
  PH.trainCars = function () {
    try { return parseInt(localStorage.getItem(STORE), 10) || 0; } catch (e) { return 0; }
  };
  function addCar() {
    try { localStorage.setItem(STORE, String(PH.trainCars() + 1)); } catch (e) { /* private mode: fine */ }
  }

  PH.games.train = {
    id: 'train',
    name: 'Sentence Train',
    icon: '🚂',
    blurb: 'Hook the word carriages onto the engine in the right order to build a sentence, then watch it chug away!',

    create: function (api) {
      var ROUNDS = 5;
      var lv = api.level.id;
      var pics = api.mode === 'pictures', letters = api.mode === 'letters';
      var readAloud = lv <= 3;          /* 8 and 9 year olds read the words themselves */
      var RAIL = 330, SIDING = [470, 600];
      var ENGINE = { x: 24, w: 150 };
      var CAR_H = 60;
      var round = 0, recent = [], cands = [], cars = [], coupled = [], info = null;
      var hits = 0, misses = 0, state = 'build', timer = 0, trainX = 0, fs = 30;
      var smoke = [], clouds = [], i;
      for (i = 0; i < 5; i++) { clouds.push({ x: U.rand(0, api.W), y: U.rand(30, 140), s: U.rand(0.6, 1.2) }); }
      var COLORS = ['#ff6b6b', '#4dabf7', '#ffd43b', '#51cf66', '#cc5de8', '#ff922b', '#20c997'];

      /* ---------------- what to build ---------------- */
      function sentenceFromData() {
        var list = PH.SENTENCES[lv];
        var fresh = list.filter(function (s) { return recent.indexOf(s) < 0; });
        var line = U.pick(fresh.length ? fresh : list);
        recent.push(line);
        if (recent.length > 6) { recent.shift(); }
        var bits = line.split('|');
        var orders = [bits[0]].concat(bits.slice(2)).map(function (s) { return s.split(' '); });
        var tokens = orders[0];
        var extras = [];
        if (!readAloud) {
          /* the full stop or question mark is its own caboose; offer the other one too */
          var end = tokens[tokens.length - 1];
          extras = [end === '?' ? '.' : '?'];
        }
        return {
          tokens: tokens, orders: orders, extras: extras, pic: bits[1],
          question: tokens[tokens.length - 1].indexOf('?') >= 0,
          spoken: bits[0].replace(/ ([.?])$/, '$1')
        };
      }

      function pictureRound() {
        var n = round <= 2 ? 2 : 3;
        var picks = U.shuffle(PH.PICTURES.filter(function (p) { return p.g.length <= 2; })).slice(0, n);
        var names = picks.map(function (p) { return p.w; });
        return { tokens: names, orders: [names], extras: [], pic: picks.map(function (p) { return p.pic; }).join(''),
          spoken: names.join(', then ') };
      }

      function letterRound() {
        var have = {};
        api.words.forEach(function (w) { have[w.w] = 1; });
        var spellable = PH.levelById(1).words.filter(function (w) {
          return w.g.every(function (c) { return have[c]; }) && PH.picOf(w.w) && recent.indexOf(w.w) < 0;
        });
        var w = U.pick(spellable);
        recent.push(w.w);
        var letterList = w.w.split('');
        return { tokens: letterList, orders: [letterList], extras: [], pic: PH.picOf(w.w), word: w.w, spoken: w.w };
      }

      /* ---------------- carriages ---------------- */
      function shown(car) {
        if (car.capital) { return car.text.charAt(0).toUpperCase() + car.text.slice(1); }
        return pics ? api.label(car.text) : car.text;
      }
      function isEnd(t) { return t === '.' || t === '?'; }
      function carWidth(car) {
        if (isEnd(car.text)) { return 64; }
        var ctx = PH.Engine.ctx;
        ctx.font = U.font(fs);
        return Math.max(pics ? 110 : 76, ctx.measureText(shown({ text: car.text, capital: false })).width + 40);
      }

      function build() {
        var all = info.tokens.concat(info.extras);
        /* shrink the words if the whole train would not fit on the line */
        fs = pics ? 28 : (letters ? 40 : 30);
        for (var tries = 0; tries < 8; tries++) {
          var total = ENGINE.w + 20;
          info.tokens.forEach(function (t) { total += carWidth({ text: t }) + 10; });
          if (total < api.W - 40) { break; }
          fs -= 2;
        }
        cars = U.shuffle(all).map(function (t, n) {
          return { text: t, color: isEnd(t) ? '#c92a2a' : COLORS[n % COLORS.length], coupled: false,
            x: 0, y: 0, hx: 0, hy: 0, anim: null, wobble: 0, capital: false, sparkle: 0 };
        });
        cars.forEach(function (c) { c.w = carWidth(c); });
        /* park them on two sidings */
        var rows = [[], []], widths = [0, 0];
        cars.forEach(function (c) {
          var r = widths[0] <= widths[1] ? 0 : 1;
          rows[r].push(c); widths[r] += c.w + 18;
        });
        rows.forEach(function (row, r) {
          var x = (api.W - widths[r]) / 2 + 9;
          row.forEach(function (c) {
            c.hx = c.x = x; c.hy = c.y = SIDING[r] - CAR_H - 10;
            x += c.w + 18;
          });
        });
      }

      function slotX(n) {
        var x = ENGINE.x + ENGINE.w + 8;
        for (var j = 0; j < n; j++) { x += coupled[j].w + 8; }
        return x;
      }

      /* ---------------- rounds ---------------- */
      function newRound() {
        round++;
        if (round > ROUNDS) {
          api.finish('All aboard!', hits + misses ? hits / (hits + misses) : 1);
          state = 'over';
          return;
        }
        info = pics ? pictureRound() : (letters ? letterRound() : sentenceFromData());
        cands = info.orders.slice();
        coupled = [];
        trainX = 0;
        build();
        state = 'build'; timer = 0;
        api.setProgress(round, ROUNDS);
        var label = pics ? 'Hook them on in order!' : letters ? 'Spell' : readAloud ? 'Listen and build the sentence' :
          (info.question ? 'Build a question!' : 'Build a sentence!');
        api.setPrompt(label, { word: letters ? info.word : '', show: true, repeat: sayPrompt });
        sayPrompt();
      }

      function sayPrompt() {
        if (!info) { return; }
        if (pics) { api.say('Hook on the ' + info.tokens.join(', then the ')); return; }
        if (letters) {
          api.say('Spell');
          api.sayWord(info.word, { queue: true });
          info.tokens.forEach(function (t) { api.say(PH.soundHint(t), { queue: true, rate: 0.55 }); });
          return;
        }
        if (readAloud) { api.say(info.spoken, { rate: 0.8 }); return; }
        api.say(info.question ? 'Read the words and build a question.' : 'Read the words and build a sentence.');
      }

      function sayToken(t) {
        if (t === '.') { api.say('period'); return; }
        if (t === '?') { api.say('question mark'); return; }
        if (letters) { api.say(PH.soundHint(t), { rate: 0.6 }); return; }
        api.say(t.replace(/[.?]/g, ''), { rate: 0.85 });
      }

      /* ---------------- input ---------------- */
      function engineButton() { return { x: ENGINE.x + trainX + 96, y: RAIL - 96, r: 26 }; }

      function down(p) {
        var b = engineButton();
        if (U.dist(p.x, p.y, b.x, b.y) <= b.r + 8) { api.sfx.click(); sayPrompt(); return; }
        if (state !== 'build') { return; }
        for (var n = cars.length - 1; n >= 0; n--) {
          var c = cars[n];
          if (c.coupled || c.anim) { continue; }
          if (p.x >= c.x && p.x <= c.x + c.w && p.y >= c.y - 10 && p.y <= c.y + CAR_H + 24) { tryCouple(c); return; }
        }
      }

      function tryCouple(c) {
        var pos = coupled.length;
        var next = cands.filter(function (o) { return o[pos] === c.text; });
        sayToken(c.text);
        if (!next.length) {
          misses++;
          c.wobble = 0.5;
          api.sfx.boing();
          api.say('Hmm, what comes next?', { queue: true });
          return;
        }
        cands = next;
        hits++;
        c.coupled = true;
        /* the first word of a sentence gets its capital letter as it couples on */
        if (!readAloud && pos === 0 && /^[a-z]/.test(c.text)) { c.capital = true; c.sparkle = 0.8; c.w = carWidth(c) + 6; }
        coupled.push(c);
        c.anim = { fx: c.x, fy: c.y, tx: slotX(pos), ty: RAIL - CAR_H - 10, t: 0 };
        api.sfx.clank();
      }

      /* ---------------- update ---------------- */
      function update(dt) {
        clouds.forEach(function (cl) { cl.x += 8 * cl.s * dt; if (cl.x > api.W + 80) { cl.x = -80; } });
        var chimney = { x: ENGINE.x + trainX + 30, y: RAIL - 130 };
        if (Math.random() < dt * (state === 'chug' ? 14 : 2.5)) {
          smoke.push({ x: chimney.x, y: chimney.y, r: 8, t: 0 });
        }
        for (var n = smoke.length - 1; n >= 0; n--) {
          var s = smoke[n];
          s.t += dt; s.y -= 40 * dt; s.x -= (state === 'chug' ? 90 : 10) * dt; s.r += 14 * dt;
          if (s.t > 2) { smoke.splice(n, 1); }
        }
        cars.forEach(function (c) {
          if (c.wobble > 0) { c.wobble -= dt; }
          if (c.sparkle > 0) { c.sparkle -= dt; }
          if (c.anim) {
            c.anim.t += dt / 0.4;
            var k = U.clamp(c.anim.t, 0, 1);
            var e = 1 - Math.pow(1 - k, 3);
            c.x = U.lerp(c.anim.fx, c.anim.tx, e);
            c.y = U.lerp(c.anim.fy, c.anim.ty, e) - Math.sin(k * Math.PI) * 50;
            if (k >= 1) {
              c.anim = null;
              if (state === 'build' && coupled.length === cands[0].length && coupled.every(function (x) { return !x.anim; })) {
                state = 'whistle'; timer = 0;
                api.sfx.whistle();
                api.addStar(1);
                addCar();
                api.say('Toot toot! All aboard!');
              }
            }
          }
        });

        if (state === 'whistle') {
          timer += dt;
          if (timer > 1) { state = 'chug'; timer = 0; }
        } else if (state === 'chug') {
          timer += dt;
          trainX += (60 + timer * 420) * dt;
          if (Math.floor(timer * 6) !== Math.floor((timer - dt) * 6)) { api.sfx.chug(); }
          if (trainX > api.W + 200) {
            state = 'picture'; timer = 0;
            var sentence = coupled.map(shown).join(' ').replace(/ ([.?])$/, '$1');
            if (pics) { api.say(info.spoken); }
            else if (letters) { api.sayWord(info.word); }
            else { api.say(sentence, { rate: 0.8 }); }
            info.finalText = pics ? '' : (letters ? info.word : sentence);
          }
        } else if (state === 'picture') {
          timer += dt;
          if (PH.speech.settled(timer, 3)) { newRound(); }
        }
      }

      /* ---------------- drawing ---------------- */
      function wheels(ctx, x, y, w) {
        ctx.fillStyle = '#343a40';
        [x + 16, x + w - 16].forEach(function (wx) {
          ctx.beginPath(); ctx.arc(wx, y, 11, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#adb5bd';
          ctx.beginPath(); ctx.arc(wx, y, 4, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#343a40';
        });
      }

      function drawCar(ctx, c, dx) {
        var x = c.x + dx + (c.wobble > 0 ? Math.sin(c.wobble * 50) * 6 : 0), y = c.y;
        var end = isEnd(c.text);
        if (end) {
          /* the caboose has a little cupola on top */
          ctx.fillStyle = U.shade(c.color, -0.15);
          U.roundRect(ctx, x + 14, y - 16, c.w - 28, 22, 6); ctx.fill();
        }
        U.plate(ctx, x, y, c.w, CAR_H, { fill: c.color, r: 10, lip: 5, edge: U.shade(c.color, -0.45) });
        /* a roof strip and the white word board */
        ctx.fillStyle = U.shade(c.color, -0.3);
        U.roundRect(ctx, x - 3, y - 5, c.w + 6, 9, 4); ctx.fill();
        U.plate(ctx, x + 8, y + 9, c.w - 16, CAR_H - 20, { r: 8, shadow: false, lip: 2, shine: 0.3 });
        ctx.fillStyle = '#1f2340';
        ctx.font = U.font(end ? 40 : fs);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(shown(c), x + c.w / 2, y + CAR_H / 2 + (end ? -2 : 2));
        if (c.sparkle > 0) {
          ctx.fillStyle = '#ffd23f';
          U.star(ctx, x + 14, y + 4, 12 * c.sparkle + 4, 5 * c.sparkle + 2); ctx.fill();
        }
        wheels(ctx, x, y + CAR_H + 6, c.w);
        ctx.fillStyle = '#495057';
        ctx.fillRect(x - 8, y + CAR_H - 16, 8, 6);   /* coupling hook */
      }

      function drawEngine(ctx) {
        var art = PH.art;
        var now = performance.now() / 1000;
        var x = ENGINE.x + trainX, base = RAIL - 14;
        var chug = state === 'chug' ? Math.abs(Math.sin(now * 12)) * 2 : 0;
        U.shadow(ctx, x + ENGINE.w / 2, base + 16, ENGINE.w * 0.6, 8, 0.3);
        ctx.save();
        ctx.translate(0, -chug);
        /* chimney */
        ctx.beginPath(); ctx.moveTo(x + 22, base - 70); ctx.lineTo(x + 20, base - 114); ctx.lineTo(x + 42, base - 114); ctx.lineTo(x + 40, base - 70); ctx.closePath();
        art.fillLit(ctx, '#5c6470', base - 114, base - 70, { lineWidth: 3 });
        U.roundRect(ctx, x + 12, base - 128, 38, 16, 6);
        art.fillLit(ctx, '#3d434d', base - 128, base - 112, { lineWidth: 3 });
        /* boiler: a red cylinder with gold bands */
        U.roundRect(ctx, x + 10, base - 72, ENGINE.w - 60, 66, 12);
        art.fillLit(ctx, '#e03131', base - 72, base - 6, { light: 0.35, dark: -0.3, lineWidth: 3.5 });
        [50, 78].forEach(function (bx) {
          ctx.beginPath(); ctx.rect(x + bx, base - 72, 7, 66);
          art.fillLit(ctx, '#fab005', base - 72, base - 6, { lineWidth: 2 });
        });
        /* a steam dome */
        ctx.beginPath(); ctx.moveTo(x + 58, base - 72); ctx.bezierCurveTo(x + 58, base - 94, x + 82, base - 94, x + 82, base - 72); ctx.closePath();
        art.fillLit(ctx, '#fab005', base - 92, base - 72, { lineWidth: 3 });
        /* cab */
        U.roundRect(ctx, x + ENGINE.w - 60, base - 118, 60, 112, 10);
        art.fillLit(ctx, '#1971c2', base - 118, base - 6, { lineWidth: 3.5 });
        U.roundRect(ctx, x + ENGINE.w - 50, base - 104, 40, 30, 6);
        art.fillLit(ctx, '#fff3bf', base - 104, base - 74, { lineWidth: 2.5 });
        U.roundRect(ctx, x + ENGINE.w - 66, base - 126, 72, 12, 5);
        art.fillLit(ctx, '#0b3d73', base - 126, base - 114, { lineWidth: 3 });
        /* the smiling smokebox face on the front */
        var fx = x + 8, fy = base - 40;
        art.ball(ctx, fx, fy, 32, '#dfe3ea', { lineWidth: 3.5 });
        ctx.beginPath(); ctx.arc(fx, fy, 25, 0, Math.PI * 2);
        art.fillLit(ctx, '#f6d7b8', fy - 25, fy + 25, { light: 0.15, dark: -0.1, lineWidth: 2.5 });
        var happy = state === 'whistle' || state === 'chug' || state === 'picture';
        art.eyes(ctx, fx, fy - 7, 18, 4.2, { dot: true, blink: art.blink(27), look: [-0.5, 0], happy: happy });
        ctx.strokeStyle = art.INK; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(fx - 14, fy - 17); ctx.lineTo(fx - 5, fy - 18); ctx.moveTo(fx + 5, fy - 18); ctx.lineTo(fx + 14, fy - 17); ctx.stroke();
        art.cheeks(ctx, fx, fy + 3, 30, 4.5, 'rgba(255,100,120,.5)');
        art.mouth(ctx, fx, fy + 8, 14, happy ? 'grin' : 'smile');
        /* lamp with a little glow on top of the face */
        var lg = ctx.createRadialGradient(fx, fy - 40, 2, fx, fy - 40, 30);
        lg.addColorStop(0, 'rgba(255,236,150,.9)'); lg.addColorStop(1, 'rgba(255,236,150,0)');
        ctx.fillStyle = lg; ctx.fillRect(fx - 30, fy - 70, 60, 60);
        art.ball(ctx, fx, fy - 38, 8, '#ffd43b', { lineWidth: 2.5 });
        /* cow-catcher */
        ctx.beginPath(); ctx.moveTo(x + 6, base - 8); ctx.lineTo(x - 22, base + 10); ctx.lineTo(x + 18, base + 10); ctx.closePath();
        art.fillLit(ctx, '#6c757d', base - 8, base + 10, { lineWidth: 3 });
        /* the replay button on the cab */
        var b = engineButton();
        art.ball(ctx, b.x, b.y + chug, b.r, '#ffffff', { lineWidth: 3 });
        ctx.font = '26px ' + EMOJI;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🔊', b.x, b.y + 1 + chug);
        ctx.restore();
        /* spoked wheels that turn as the train moves, joined by a rod */
        var spin = trainX / 14;
        [x + 30, x + 70, x + 116].forEach(function (wx, n) {
          var r = n === 2 ? 16 : 13;
          art.ball(ctx, wx, base + 2, r, '#3d434d', { lineWidth: 3, shine: false });
          ctx.strokeStyle = '#ced4da'; ctx.lineWidth = 2;
          for (var sp = 0; sp < 4; sp++) {
            var a = spin + sp * Math.PI / 4;
            ctx.beginPath(); ctx.moveTo(wx - Math.cos(a) * (r - 3), base + 2 - Math.sin(a) * (r - 3));
            ctx.lineTo(wx + Math.cos(a) * (r - 3), base + 2 + Math.sin(a) * (r - 3)); ctx.stroke();
          }
          art.ball(ctx, wx, base + 2, 4, '#fab005', { lineWidth: 1.5, shine: false });
        });
        ctx.lineCap = 'round';
        ctx.strokeStyle = art.INK; ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(x + 30 + Math.cos(spin) * 7, base + 2 + Math.sin(spin) * 7);
        ctx.lineTo(x + 70 + Math.cos(spin) * 7, base + 2 + Math.sin(spin) * 7);
        ctx.stroke();
        ctx.strokeStyle = '#ced4da'; ctx.lineWidth = 4; ctx.stroke();
      }


      function drawSign(ctx) {
        /* a hint board by the station: pictures for the littlest, the word to spell, or the scene */
        if (!info || state === 'picture') { return; }
        var text = null, emoji = null;
        if (pics) { emoji = info.pic; }
        else if (letters) { emoji = info.pic; text = info.word; }
        else if (!readAloud) { emoji = info.pic; }
        if (!emoji && !text) { return; }
        var w = 90 + (emoji ? emoji.length * 20 : 0) + (text ? 90 : 0);
        var x = api.W - w - 30, y = 50;
        ctx.fillStyle = '#7a4a2b';
        ctx.fillRect(x + w / 2 - 5, y + 70, 10, 90);
        U.plate(ctx, x, y, w, 76, { fill: '#fff4e0', r: 14, edge: '#7a4a2b', lineWidth: 4 });
        ctx.font = '44px ' + EMOJI;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(emoji || '', x + (text ? w * 0.35 : w / 2), y + 40);
        if (text) {
          ctx.fillStyle = '#1f2340';
          ctx.font = U.font(36);
          ctx.fillText(text, x + w * 0.74, y + 40);
        }
      }

      function draw(ctx) {
        var sky = ctx.createLinearGradient(0, 0, 0, 290);
        sky.addColorStop(0, '#74c0fc');
        sky.addColorStop(1, '#e7f5ff');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, api.W, 300);
        var sg = ctx.createRadialGradient(560, 70, 10, 560, 70, 110);
        sg.addColorStop(0, 'rgba(255,236,150,.9)'); sg.addColorStop(1, 'rgba(255,236,150,0)');
        ctx.fillStyle = sg; ctx.fillRect(450, 0, 220, 190);
        ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(560, 70, 30, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        clouds.forEach(function (cl) {
          ctx.beginPath(); ctx.arc(cl.x, cl.y, 24 * cl.s, 0, Math.PI * 2); ctx.arc(cl.x + 26 * cl.s, cl.y + 6, 18 * cl.s, 0, Math.PI * 2);
          ctx.arc(cl.x - 24 * cl.s, cl.y + 6, 16 * cl.s, 0, Math.PI * 2); ctx.fill();
        });
        /* hills with a row of round trees */
        ctx.fillStyle = '#8ce99a';
        ctx.beginPath(); ctx.ellipse(250, 300, 330, 80, 0, Math.PI, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(800, 300, 290, 64, 0, Math.PI, Math.PI * 2); ctx.fill();
        var art = PH.art;
        ctx.strokeStyle = 'rgba(40,120,60,.5)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(250, 300, 330, 80, 0, Math.PI, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(800, 300, 290, 64, 0, Math.PI, Math.PI * 2); ctx.stroke();
        [[90, 238], [150, 228], [380, 236], [700, 250], [760, 242], [900, 252]].forEach(function (t, n) {
          U.roundRect(ctx, t[0] - 4, t[1] - 4, 8, 24, 3);
          art.fillLit(ctx, '#8a5a34', t[1], t[1] + 20, { lineWidth: 2 });
          /* a fluffy crown of three puffs, some with apples */
          ctx.fillStyle = art.INK;
          [[-9, -6, 13], [9, -6, 13], [0, -18, 15]].forEach(function (p) {
            ctx.beginPath(); ctx.arc(t[0] + p[0], t[1] + p[1], p[2] + 2.5, 0, Math.PI * 2); ctx.fill();
          });
          [[-9, -6, 13], [9, -6, 13], [0, -18, 15]].forEach(function (p) {
            var g = ctx.createRadialGradient(t[0] + p[0] - 4, t[1] + p[1] - 5, 2, t[0] + p[0], t[1] + p[1], p[2]);
            g.addColorStop(0, '#8ce99a'); g.addColorStop(1, '#2f9e44');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(t[0] + p[0], t[1] + p[1], p[2], 0, Math.PI * 2); ctx.fill();
          });
          if (n % 2 === 0) {
            ctx.fillStyle = '#ff6b6b';
            ctx.beginPath(); ctx.arc(t[0] - 8, t[1] - 10, 3, 0, Math.PI * 2); ctx.arc(t[0] + 7, t[1] - 18, 3, 0, Math.PI * 2); ctx.fill();
          }
        });
        var grass = ctx.createLinearGradient(0, 290, 0, api.H);
        grass.addColorStop(0, '#8ce99a'); grass.addColorStop(1, '#40c057');
        ctx.fillStyle = grass;
        ctx.fillRect(0, 290, api.W, api.H - 290);

        /* tracks: gravel bed, wooden sleepers, steel rails */
        [RAIL].concat(SIDING).forEach(function (ry) {
          ctx.fillStyle = 'rgba(120,110,100,.35)';
          ctx.fillRect(0, ry - 10, api.W, 22);
          for (var sx = 0; sx < api.W; sx += 28) {
            ctx.fillStyle = '#8d6e63'; ctx.fillRect(sx, ry - 7, 14, 16);
            ctx.fillStyle = '#6d4c41'; ctx.fillRect(sx, ry + 5, 14, 4);
          }
          var rail = ctx.createLinearGradient(0, ry - 5, 0, ry + 9);
          rail.addColorStop(0, '#f1f3f5'); rail.addColorStop(1, '#868e96');
          ctx.fillStyle = rail;
          ctx.fillRect(0, ry - 5, api.W, 5);
          ctx.fillRect(0, ry + 4, api.W, 5);
        });

        drawSign(ctx);

        smoke.forEach(function (s) {
          ctx.fillStyle = 'rgba(255,255,255,' + (0.7 * (1 - s.t / 2)) + ')';
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
        });

        cars.forEach(function (c) { if (!c.coupled) { drawCar(ctx, c, 0); } });
        drawEngine(ctx);
        coupled.forEach(function (c) { drawCar(ctx, c, c.anim ? 0 : trainX); });

        if (state === 'picture' && info) {
          var k = U.clamp(timer / 0.5, 0, 1);
          U.plate(ctx, 150, 120, 700, 300, { r: 30, fill: '#fffdf5' });
          ctx.font = Math.round(60 + k * 50) + 'px ' + EMOJI;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(info.pic || '🚂', 500, 230);
          if (info.finalText) {
            ctx.fillStyle = '#1f2340';
            ctx.font = U.font(info.finalText.length > 30 ? 30 : 38);
            ctx.fillText(info.finalText, 500, 360);
          }
        }

        var n = PH.trainCars();
        U.badge(ctx, 16, 14, 'Your train: ' + n + (n === 1 ? ' carriage' : ' carriages'), { icon: '🚃' });
      }

      newRound();
      return { update: update, draw: draw, down: down,
        /* read-only peek at the state, used by automated play-through checks */
        debug: function () { return { info: info, cars: cars, coupled: coupled, cands: cands, state: state, round: round }; } };
    }
  };
})(window.PH = window.PH || {});
