/* Phonics Playground - voice + sound effects (no audio files needed) */
(function (PH) {
  'use strict';

  /* ---------------- Speech ---------------- */
  var voice = null;
  var voiceIndex = 0;
  var enabled = true;

  function englishVoices() {
    if (!('speechSynthesis' in window)) { return []; }
    return window.speechSynthesis.getVoices().filter(function (v) {
      return /^en(-|_|$)/i.test(v.lang || '');
    });
  }

  function chooseVoice() {
    var list = englishVoices();
    if (!list.length) { return; }
    /* Sonia by default, then other natural sounding female voices if the platform has them */
    var preferred = ['sonia', 'zira', 'samantha', 'karen', 'moira', 'serena', 'google uk english female',
      'google us english', 'hazel', 'fiona', 'libby', 'aria'];
    for (var i = 0; i < preferred.length; i++) {
      for (var j = 0; j < list.length; j++) {
        if (list[j].name.toLowerCase().indexOf(preferred[i]) >= 0) {
          voice = list[j]; voiceIndex = j; return;
        }
      }
    }
    voice = list[0];
    voiceIndex = 0;
  }

  if ('speechSynthesis' in window) {
    chooseVoice();
    window.speechSynthesis.onvoiceschanged = chooseVoice;
  }

  var speech = {
    supported: ('speechSynthesis' in window),

    /* cycle through the installed English voices - some sound much clearer than others */
    nextVoice: function () {
      var list = englishVoices();
      if (!list.length) { return 'No voices installed'; }
      voiceIndex = (voiceIndex + 1) % list.length;
      voice = list[voiceIndex];
      speech.say('Hello, I am ' + voice.name.split(/[ (]/)[1]);
      return voice.name;
    },

    cancel: function () {
      if (speech.supported) { try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
    },

    /* say(text) or say(text, {rate, pitch, queue}) */
    say: function (text, opts) {
      if (!enabled || !speech.supported || !text) { return; }
      opts = opts || {};
      if (!opts.queue) { speech.cancel(); }
      var u = new SpeechSynthesisUtterance(String(text));
      if (voice) { u.voice = voice; u.lang = voice.lang; }
      u.rate = opts.rate === undefined ? 0.85 : opts.rate;
      u.pitch = opts.pitch === undefined ? 1.05 : opts.pitch;
      u.volume = 1;
      try { window.speechSynthesis.speak(u); } catch (e) { /* ignore */ }
    },

    /* a single word, said slowly and clearly */
    sayWord: function (word, opts) {
      opts = opts || {};
      speech.say(word, { rate: opts.rate || 0.72, pitch: 1.05, queue: opts.queue });
    },

    /* "c ... a ... t ... cat" (magic e stays silent and makes the vowel long) */
    soundOut: function (word) {
      speech.cancel();
      PH.soundHintsFor(word).forEach(function (h) {
        speech.say(h, { rate: 0.55, queue: true });
      });
      speech.say(word.w, { rate: 0.7, queue: true });
    },

    setEnabled: function (on) { enabled = on; if (!on) { speech.cancel(); } }
  };

  /* Text-to-speech says letter NAMES ("see" for c), so nudge it toward letter SOUNDS.
     Every spelling must read as ONE pronounceable syllable: runs like "lll" or "sss" and
     unknown pairs like "ay", "sh", "er" get spelled out letter by letter ("el el el").
     Each one was checked against the phonemes the Windows voices actually produce. */
  var HINTS = {
    a: 'ah', b: 'bah', c: 'kuh', d: 'duh', e: 'eh', f: 'fuh', g: 'gguh', h: 'huh',
    i: 'ihh', j: 'juh', k: 'kuh', l: 'lluh', m: 'muh', n: 'nuh', o: 'aw', p: 'puh',
    q: 'kwuh', r: 'ruh', s: 'ssuh', t: 'tuh', u: 'uh', v: 'vuh', w: 'wuh',
    x: 'ukss', y: 'yyuh', z: 'zah',
    sh: 'shuh', ch: 'chuh', th: 'thuh', ck: 'kuh', ll: 'lluh', ng: 'ing',
    ai: 'eigh', ay: 'eigh', ee: 'eeh', ea: 'eeh', oa: 'oh', oo: 'ooh', ow: 'ow',
    ou: 'ow', oi: 'oy', oy: 'oy', aw: 'aw', igh: 'eye', ar: 'are', or: 'or',
    ir: 'irr', ur: 'irr', er: 'irr',
    /* word-ending chunks from the spelling level */
    et: 'eht', an: 'ann', le: 'ul'
  };
  PH.soundHint = function (g) { return HINTS[g] || g; };

  /* The spoken sounds of a whole word, in order. A magic e (c-a-k-e) is silent and
     turns the vowel before it long, so "cake" is "kuh - ay - kuh", never "kuh - ah - kuh". */
  var LONG = { a: 'eigh', e: 'eeh', i: 'eye', o: 'oh', u: 'yoo' };
  PH.soundHintsFor = function (word) {
    var sounds = PH.soundGraphemes(word);
    var magic = sounds.length < word.g.length;   /* soundGraphemes dropped a final e */
    return sounds.map(function (g, i) {
      if (magic && i === sounds.length - 2 && LONG[g]) { return LONG[g]; }
      return PH.soundHint(g);
    });
  };

  /* ---------------- Sound effects ---------------- */
  var ctx = null;
  var sfxOn = true;

  function ac() {
    if (!ctx) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) { return null; }
      ctx = new C();
    }
    if (ctx.state === 'suspended') { ctx.resume(); }
    return ctx;
  }

  function tone(freq, start, dur, type, gain) {
    var a = ac(); if (!a || !sfxOn) { return; }
    var t = a.currentTime + start;
    var osc = a.createOscillator();
    var g = a.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain === undefined ? 0.22 : gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(a.destination);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  function slide(from, to, start, dur, type, gain) {
    var a = ac(); if (!a || !sfxOn) { return; }
    var t = a.currentTime + start;
    var osc = a.createOscillator();
    var g = a.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain === undefined ? 0.2 : gain, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(a.destination);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  function noise(start, dur, freq, gain) {
    var a = ac(); if (!a || !sfxOn) { return; }
    var t = a.currentTime + start;
    var len = Math.max(1, Math.floor(a.sampleRate * dur));
    var buf = a.createBuffer(1, len, a.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) { data[i] = (Math.random() * 2 - 1) * (1 - i / len); }
    var src = a.createBufferSource();
    src.buffer = buf;
    var filt = a.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(freq || 1200, t);
    var g = a.createGain();
    g.gain.setValueAtTime(gain === undefined ? 0.25 : gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt); filt.connect(g); g.connect(a.destination);
    src.start(t); src.stop(t + dur + 0.02);
  }

  var sfx = {
    setEnabled: function (on) { sfxOn = on; },
    warmUp: function () { ac(); },
    click: function () { tone(660, 0, 0.07, 'triangle', 0.15); },
    good: function () { tone(660, 0, 0.1, 'triangle'); tone(880, 0.08, 0.12, 'triangle'); },
    great: function () {
      [523, 659, 784, 1046].forEach(function (f, i) { tone(f, i * 0.07, 0.16, 'triangle', 0.2); });
    },
    bad: function () { slide(220, 150, 0, 0.22, 'sawtooth', 0.12); },
    pop: function () { slide(900, 300, 0, 0.12, 'sine', 0.25); noise(0, 0.08, 1800, 0.12); },
    whoosh: function () { noise(0, 0.28, 800, 0.16); },
    clank: function () { tone(180, 0, 0.09, 'square', 0.12); tone(300, 0.03, 0.1, 'square', 0.1); },
    splash: function () { noise(0, 0.25, 500, 0.2); slide(600, 200, 0, 0.2, 'sine', 0.1); },
    boing: function () { slide(500, 180, 0, 0.25, 'triangle', 0.18); },
    chomp: function () { slide(300, 90, 0, 0.14, 'square', 0.14); },
    hop: function () { slide(260, 720, 0, 0.16, 'triangle', 0.16); },
    sizzle: function () { noise(0, 0.45, 3200, 0.16); slide(400, 120, 0, 0.3, 'sawtooth', 0.06); },
    coins: function () {
      [1318, 1568, 2093, 1760, 2349].forEach(function (f, i) { tone(f, i * 0.06, 0.12, 'square', 0.07); });
    },
    cheer: function () {
      for (var i = 0; i < 6; i++) { noise(i * 0.09, 0.5, 900 + i * 180, 0.1); }
      [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0.1 + i * 0.08, 0.2, 'triangle', 0.14); });
    },
    crash: function () {
      noise(0, 0.35, 2400, 0.22);
      tone(520, 0, 0.18, 'square', 0.1); tone(390, 0.05, 0.2, 'square', 0.08);
    },
    poof: function () { noise(0, 0.18, 400, 0.12); },
    rumble: function () { slide(90, 50, 0, 0.9, 'sawtooth', 0.14); noise(0, 0.8, 150, 0.2); },
    drip: function () { slide(1400, 700, 0, 0.08, 'sine', 0.12); },
    zap: function () { slide(300, 1800, 0, 0.25, 'sawtooth', 0.08); noise(0.1, 0.3, 3000, 0.1); },
    bonk: function () { slide(700, 200, 0, 0.1, 'square', 0.14); noise(0, 0.06, 900, 0.18); },
    raspberry: function () {
      var a = ac(); if (!a || !sfxOn) { return; }
      /* a buzzy wobbling tone: a low saw wobbled by a fast LFO */
      var t = a.currentTime, osc = a.createOscillator(), lfo = a.createOscillator();
      var lg = a.createGain(), g = a.createGain();
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(110, t);
      lfo.frequency.setValueAtTime(28, t); lg.gain.setValueAtTime(40, t);
      lfo.connect(lg); lg.connect(osc.frequency);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.12, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(g); g.connect(a.destination);
      osc.start(t); lfo.start(t); osc.stop(t + 0.52); lfo.stop(t + 0.52);
    },
    ribbit: function () { slide(220, 140, 0, 0.09, 'square', 0.12); slide(260, 150, 0.12, 0.11, 'square', 0.12); },
    twinkle: function () {
      [1318, 1760, 2093].forEach(function (f, i) { tone(f, i * 0.05, 0.18, 'sine', 0.09); });
    },
    whistle: function () {
      tone(880, 0, 0.35, 'sine', 0.12); tone(1108, 0, 0.35, 'sine', 0.1);
      tone(880, 0.42, 0.5, 'sine', 0.12); tone(1108, 0.42, 0.5, 'sine', 0.1);
    },
    chug: function () { noise(0, 0.12, 300, 0.14); },
    kick: function () { slide(160, 60, 0, 0.12, 'sine', 0.35); noise(0, 0.05, 600, 0.2); },
    win: function () {
      [523, 659, 784, 1046, 1318].forEach(function (f, i) { tone(f, i * 0.09, 0.3, 'triangle', 0.2); });
    }
  };

  PH.speech = speech;
  PH.sfx = sfx;

  PH.setAudioEnabled = function (on) {
    speech.setEnabled(on);
    sfx.setEnabled(on);
  };

})(window.PH = window.PH || {});
