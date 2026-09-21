/* Phonics Playground - tiny 2D engine shared by every mini game */
(function (PH) {
  'use strict';

  var W = 1000, H = 640;

  /* ---------------- helpers ---------------- */
  var util = {
    W: W, H: H,
    clamp: function (v, a, b) { return v < a ? a : (v > b ? b : v); },
    lerp: function (a, b, t) { return a + (b - a) * t; },
    rand: function (a, b) { return a + Math.random() * (b - a); },
    randInt: function (a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
    pick: function (arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    shuffle: function (arr) {
      var a = arr.slice();
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    },
    /* n distinct items from arr, optionally excluding some */
    sample: function (arr, n, exclude) {
      var pool = util.shuffle(arr).filter(function (x) {
        return !exclude || exclude.indexOf(x) < 0;
      });
      return pool.slice(0, n);
    },
    dist: function (x1, y1, x2, y2) {
      var dx = x1 - x2, dy = y1 - y2;
      return Math.sqrt(dx * dx + dy * dy);
    },
    roundRect: function (ctx, x, y, w, h, r) {
      r = Math.min(r, w / 2, h / 2);
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    },
    star: function (ctx, x, y, outer, inner, points) {
      points = points || 5;
      ctx.beginPath();
      for (var i = 0; i < points * 2; i++) {
        var r = i % 2 ? inner : outer;
        var a = (Math.PI / points) * i - Math.PI / 2;
        var px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
        if (i === 0) { ctx.moveTo(px, py); } else { ctx.lineTo(px, py); }
      }
      ctx.closePath();
    },
    font: function (size, weight) {
      return (weight || 'bold') + ' ' + size + 'px "Comic Sans MS","Chalkboard SE","Trebuchet MS",sans-serif';
    },
    /* chunky word tile used by most games */
    tile: function (ctx, o) {
      var x = o.x, y = o.y, w = o.w, h = o.h;
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2);
      if (o.rot) { ctx.rotate(o.rot); }
      if (o.scale && o.scale !== 1) { ctx.scale(o.scale, o.scale); }
      ctx.translate(-w / 2, -h / 2);
      /* drop shadow */
      ctx.fillStyle = 'rgba(31,35,64,.18)';
      util.roundRect(ctx, 3, 7, w, h, o.r || 16);
      ctx.fill();
      ctx.fillStyle = o.fill || '#ffffff';
      util.roundRect(ctx, 0, 0, w, h, o.r || 16);
      ctx.fill();
      if (o.stroke) {
        ctx.lineWidth = o.lineWidth || 5;
        ctx.strokeStyle = o.stroke;
        ctx.stroke();
      }
      if (o.text) {
        ctx.fillStyle = o.textColor || '#1f2340';
        ctx.font = util.font(o.fontSize || 40);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(o.text, w / 2, h / 2 + 2);
      }
      ctx.restore();
    },
    measureTile: function (ctx, text, fontSize, padX, padY) {
      ctx.font = util.font(fontSize);
      var m = ctx.measureText(text);
      return { w: Math.ceil(m.width) + padX * 2, h: fontSize + padY * 2 };
    }
  };
  PH.util = util;

  /* Picture labels look like "🐱 cat". Drawn as plain text the emoji is only as big as the
     letters, which is too small for a three year old. This teaches the canvas to draw the
     emoji about 1.7x larger in a dedicated emoji font, and to measure it that way too,
     so every game's tiles, bubbles and signs make room for it automatically.            */
  var PIC_SCALE = 1.7;
  var EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  var LABEL_RE = /^(\p{Extended_Pictographic}️?)\s(.+)$/u;
  function bigPictures(ctx) {
    var rawFill = ctx.fillText.bind(ctx);
    var rawMeasure = ctx.measureText.bind(ctx);
    function px() {
      var m = /(\d+(?:\.\d+)?)px/.exec(ctx.font);
      return m ? parseFloat(m[1]) : 20;
    }
    function parts(text) {
      var m = LABEL_RE.exec(String(text));
      if (!m) { return null; }
      var font = ctx.font, size = Math.round(px() * PIC_SCALE);
      ctx.font = size + 'px ' + EMOJI_FONT;
      var ew = rawMeasure(m[1]).width;
      ctx.font = font;
      var ww = rawMeasure(' ' + m[2]).width;
      return { pic: m[1], word: ' ' + m[2], size: size, ew: ew, ww: ww, font: font };
    }
    ctx.measureText = function (text) {
      var p = parts(text);
      if (!p) { return rawMeasure(text); }
      return { width: p.ew + p.ww };
    };
    ctx.fillText = function (text, x, y, maxWidth) {
      var p = parts(text);
      if (!p) { return rawFill(text, x, y, maxWidth); }
      var total = p.ew + p.ww;
      var align = ctx.textAlign;
      var left = align === 'center' ? x - total / 2 : (align === 'right' || align === 'end') ? x - total : x;
      ctx.save();
      ctx.textAlign = 'left';
      ctx.font = p.size + 'px ' + EMOJI_FONT;
      rawFill(p.pic, left, y);
      ctx.font = p.font;
      rawFill(p.word, left + p.ew, y);
      ctx.restore();
    };
  }

  PH.COLORS = ['#ff5d8f', '#ff9f40', '#ffd23f', '#3ddc84', '#2ec4b6', '#4d8dff', '#9b5de5'];

  /* ---------------- particles ---------------- */
  function Particles() { this.items = []; }
  Particles.prototype.burst = function (x, y, colors, count, opts) {
    opts = opts || {};
    colors = colors || PH.COLORS;
    for (var i = 0; i < (count || 18); i++) {
      var a = util.rand(0, Math.PI * 2);
      var sp = util.rand(opts.minSpeed || 90, opts.maxSpeed || 320);
      this.items.push({
        x: x, y: y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - (opts.lift || 60),
        life: util.rand(0.5, 1.1),
        age: 0,
        size: util.rand(5, 12),
        color: colors[Math.floor(Math.random() * colors.length)],
        spin: util.rand(-8, 8),
        rot: util.rand(0, 6),
        shape: opts.shape || (Math.random() < 0.35 ? 'star' : 'rect'),
        gravity: opts.gravity === undefined ? 620 : opts.gravity
      });
    }
  };
  Particles.prototype.rain = function (count) {
    for (var i = 0; i < (count || 60); i++) {
      this.items.push({
        x: util.rand(0, W), y: util.rand(-260, -10),
        vx: util.rand(-40, 40), vy: util.rand(90, 220),
        life: util.rand(1.6, 2.8), age: 0,
        size: util.rand(7, 14),
        color: PH.COLORS[Math.floor(Math.random() * PH.COLORS.length)],
        spin: util.rand(-6, 6), rot: util.rand(0, 6),
        shape: Math.random() < 0.4 ? 'star' : 'rect',
        gravity: 60
      });
    }
  };
  Particles.prototype.update = function (dt) {
    for (var i = this.items.length - 1; i >= 0; i--) {
      var p = this.items[i];
      p.age += dt;
      if (p.age >= p.life) { this.items.splice(i, 1); continue; }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
    }
  };
  Particles.prototype.draw = function (ctx) {
    for (var i = 0; i < this.items.length; i++) {
      var p = this.items[i];
      var alpha = util.clamp(1 - p.age / p.life, 0, 1);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === 'star') {
        util.star(ctx, 0, 0, p.size, p.size * 0.45);
        ctx.fill();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
      }
      ctx.restore();
    }
  };
  Particles.prototype.clear = function () { this.items.length = 0; };

  /* ---------------- engine ---------------- */
  var Engine = {
    canvas: null, ctx: null, game: null, def: null, level: null,
    running: false, last: 0, raf: 0,
    stars: 0, done: 0, total: 0,
    particles: new Particles(),
    onExit: null,

    init: function (canvas, dom) {
      var self = this;
      this.canvas = canvas;
      this.dom = dom;
      canvas.width = W;
      canvas.height = H;
      this.ctx = canvas.getContext('2d');
      bigPictures(this.ctx);

      this.fit();
      window.addEventListener('resize', function () { self.fit(); });

      /* pointer input */
      function toLocal(e) {
        var r = canvas.getBoundingClientRect();
        return {
          x: (e.clientX - r.left) / r.width * W,
          y: (e.clientY - r.top) / r.height * H,
          id: e.pointerId          /* lets a game track two fingers: hold "right" and tap "jump" */
        };
      }
      canvas.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
        PH.sfx.warmUp();
        if (self.game && self.game.down) { self.game.down(toLocal(e)); }
      });
      canvas.addEventListener('pointermove', function (e) {
        if (self.game && self.game.move) { self.game.move(toLocal(e)); }
      });
      canvas.addEventListener('pointerup', function (e) {
        if (self.game && self.game.up) { self.game.up(toLocal(e)); }
      });
      canvas.addEventListener('pointercancel', function (e) {
        if (self.game && self.game.up) { self.game.up(toLocal(e)); }
      });
      window.addEventListener('keydown', function (e) {
        if (!self.running) { return; }
        if (self.game && self.game.key) { self.game.key(e); }
      });
      window.addEventListener('keyup', function (e) {
        if (!self.running) { return; }
        if (self.game && self.game.keyUp) { self.game.keyUp(e); }
      });
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) { PH.speech.cancel(); }
      });
    },

    fit: function () {
      var stage = this.canvas.parentElement;
      if (!stage) { return; }
      var pad = 16;
      var aw = stage.clientWidth - pad, ah = stage.clientHeight - pad;
      if (aw <= 0 || ah <= 0) { return; }
      var s = Math.min(aw / W, ah / H);
      var cssW = Math.floor(W * s), cssH = Math.floor(H * s);
      this.canvas.style.width = cssW + 'px';
      this.canvas.style.height = cssH + 'px';
      /* draw at the real screen resolution so text and pictures stay sharp at any size */
      var dpr = Math.min(window.devicePixelRatio || 1, 3);
      var bw = Math.round(cssW * dpr), bh = Math.round(cssH * dpr);
      if (this.canvas.width !== bw || this.canvas.height !== bh) {
        this.canvas.width = bw;
        this.canvas.height = bh;
      }
      this.ctx.setTransform(bw / W, 0, 0, bh / H, 0, 0);
      this.ctx.imageSmoothingQuality = 'high';
    },

    /* ---- the api handed to each mini game ---- */
    makeApi: function () {
      var self = this;
      return {
        W: W, H: H,
        level: this.level,
        words: this.level.words,
        util: util,
        sfx: PH.sfx,
        particles: this.particles,

        /* pre-reader levels (ages 3 and 4) */
        mode: this.level.mode || 'words',
        pre: this.level.id <= 0,
        label: function (text) { return self.labelFor(text); },

        say: function (t, o) { PH.speech.say(t, o); },
        sayWord: function (w, o) { self.sayWord(w, o); },
        soundOut: function (wordObj) { PH.speech.soundOut(wordObj); },

        /* label shows in the banner; word is what the speaker/peek buttons use */
        setPrompt: function (label, opts) { self.setPrompt(label, opts); },
        setProgress: function (done, total) { self.setProgress(done, total); },
        addStar: function (n) { self.addStar(n === undefined ? 1 : n); },
        burst: function (x, y, colors, count, opts) { self.particles.burst(x, y, colors, count, opts); },
        confetti: function () { self.particles.rain(70); },
        finish: function (title, accuracy) { self.finish(title, accuracy); }
      };
    },

    /* how a word is shown: at the pre-reader levels a picture word gets its emoji */
    labelFor: function (text) {
      text = String(text);
      if (this.level && this.level.id <= 0 && PH.picFor[text]) { return PH.picFor[text] + ' ' + text; }
      return text;
    },

    /* the same label for the prompt bar, with the picture in its own bigger span */
    htmlLabel: function (text) {
      text = String(text);
      if (this.level && this.level.id <= 0 && PH.picFor[text]) {
        return '<span class="pic">' + PH.picFor[text] + '</span> ' + text;
      }
      return text;
    },

    /* at the letters level a letter is said as name, sound and keyword: "b... buh... like bear" */
    sayWord: function (text, o) {
      o = o || {};
      var item = null;
      if (this.level && this.level.mode === 'letters') {
        item = this.level.words.filter(function (w) { return w.w === text; })[0];
      }
      if (item) {
        PH.speech.say(item.w, { rate: 0.7, queue: o.queue });
        PH.speech.say(PH.soundHint(item.w), { rate: 0.55, queue: true });
        PH.speech.say('like ' + item.key, { rate: 0.75, queue: true });
      } else {
        PH.speech.sayWord(text, o);
      }
    },

    setPrompt: function (label, opts) {
      opts = opts || {};
      var el = this.dom.promptText;
      var word = opts.word || '';
      /* three year olds cannot read yet, so the picture is always on show */
      var show = opts.show || (this.level && this.level.mode === 'pictures');
      this.repeatFn = opts.repeat || null;
      this.peekWord = word;
      if (word && show) {
        el.innerHTML = label + ' <span class="target">' + this.htmlLabel(word) + '</span>';
      } else {
        el.textContent = label;
      }
      this.dom.peek.classList.toggle('hidden', !(word && !show));
    },

    peek: function () {
      if (!this.peekWord) { return; }
      var el = this.dom.promptText;
      var old = el.innerHTML;
      el.innerHTML = '<span class="target">' + this.htmlLabel(this.peekWord) + '</span>';
      clearTimeout(this._peekT);
      var self = this;
      this._peekT = setTimeout(function () { el.innerHTML = old; }, 1700);
    },

    repeat: function () {
      PH.sfx.warmUp();
      if (this.repeatFn) { this.repeatFn(); }
    },

    setProgress: function (done, total) {
      this.done = done; this.total = total;
      this.dom.progress.textContent = done + ' / ' + total;
    },

    addStar: function (n) {
      this.stars += n;
      this.dom.stars.textContent = '⭐ ' + this.stars;
      this.dom.stars.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }],
        { duration: 320, easing: 'ease-out' }
      );
    },

    start: function (def, level) {
      this.stop();
      this.def = def;
      this.level = level;
      this.stars = 0;
      this.particles.clear();
      this.dom.results.classList.add('hidden');
      this.setProgress(0, 0);
      this.dom.stars.textContent = '⭐ 0';
      this.game = def.create(this.makeApi());
      this.running = true;
      this.last = performance.now();
      var self = this;
      cancelAnimationFrame(this.raf);
      this.raf = requestAnimationFrame(function (t) { self.loop(t); });
      this.fit();
    },

    stop: function () {
      this.running = false;
      cancelAnimationFrame(this.raf);
      if (this.game && this.game.destroy) { this.game.destroy(); }
      this.game = null;
      PH.speech.cancel();
    },

    loop: function (t) {
      if (!this.running) { return; }
      var dt = Math.min((t - this.last) / 1000, 0.05);
      this.last = t;
      var ctx = this.ctx;
      if (this.game && this.game.update) { this.game.update(dt); }
      this.particles.update(dt);
      ctx.clearRect(0, 0, W, H);
      if (this.game && this.game.draw) { this.game.draw(ctx); }
      this.particles.draw(ctx);
      var self = this;
      this.raf = requestAnimationFrame(function (n) { self.loop(n); });
    },

    finish: function (title, accuracy) {
      var self = this;
      this.particles.rain(90);
      PH.sfx.win();
      var pct = (accuracy === undefined || accuracy === null)
        ? (this.total ? this.stars / this.total : 1)
        : accuracy;
      var big = pct >= 0.9 ? 3 : (pct >= 0.6 ? 2 : 1);
      setTimeout(function () {
        self.dom.resultsTitle.textContent = title || (big === 3 ? 'Superstar!' : big === 2 ? 'Well done!' : 'Good try!');
        self.dom.resultsStars.textContent = '⭐'.repeat(big) + '☆'.repeat(3 - big);
        self.dom.resultsSub.textContent = 'You collected ' + self.stars + ' star' +
          (self.stars === 1 ? '' : 's') + '.';
        self.dom.results.classList.remove('hidden');
        PH.speech.say(big === 3 ? 'Superstar! Well done!' : 'Nice work!');
      }, 700);
    }
  };

  PH.Engine = Engine;
  PH.games = {};

})(window.PH = window.PH || {});
