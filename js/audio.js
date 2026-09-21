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
    /* prefer a natural sounding female voice if the platform has one */
    var preferred = ['zira', 'samantha', 'karen', 'moira', 'serena', 'google uk english female',
      'google us english', 'hazel', 'fiona', 'libby', 'sonia', 'aria'];
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
      speech.say('Hello, I am ' + voice.name.split(/[ (]/)[0]);
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

    /* "c ... a ... t ... cat" */
    soundOut: function (word) {
      speech.cancel();
      word.g.forEach(function (g) {
        speech.say(PH.soundHint(g), { rate: 0.55, queue: true });
      });
      speech.say(word.w, { rate: 0.7, queue: true });
    },

    setEnabled: function (on) { enabled = on; if (!on) { speech.cancel(); } }
  };

  /* Text-to-speech says letter NAMES ("see" for c), so nudge it toward letter SOUNDS.
     These spellings are approximations - the keyword prompts carry the real weight. */
  var HINTS = {
    a: 'ah', b: 'buh', c: 'kuh', d: 'duh', e: 'eh', f: 'fff', g: 'guh', h: 'huh',
    i: 'ih', j: 'juh', k: 'kuh', l: 'lll', m: 'mmm', n: 'nnn', o: 'oh', p: 'puh',
    q: 'kwuh', r: 'rrr', s: 'sss', t: 'tuh', u: 'uh', v: 'vvv', w: 'wuh',
    x: 'kss', y: 'yuh', z: 'zzz',
    sh: 'shhh', ch: 'chuh', th: 'thhh', ck: 'kuh', ll: 'lll', ng: 'ng',
    ai: 'ay', ay: 'ay', ee: 'ee', ea: 'ee', oa: 'oh', oo: 'oo', ow: 'ow',
    ou: 'ow', oi: 'oy', oy: 'oy', aw: 'aw', igh: 'eye', ar: 'ar', or: 'or',
    ir: 'er', ur: 'er', er: 'er'
  };
  PH.soundHint = function (g) { return HINTS[g] || g; };

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
