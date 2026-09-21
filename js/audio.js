/* Phonics Playground - voice + sound effects.
   Speech comes from recordings in audio/ when they exist (listed in audio/clips.js),
   and from the device's own text-to-speech voice for everything else.             */
(function (PH) {
  'use strict';

  /* ---------------- Voices ---------------- */
  var voice = null;
  var voiceIndex = 0;
  var enabled = true;

  function englishVoices() {
    if (!('speechSynthesis' in window)) { return []; }
    return window.speechSynthesis.getVoices().filter(function (v) {
      return /^en(-|_|$)/i.test(v.lang || '');
    });
  }

  /* The games teach American English sounds, so an American voice is always preferred. */
  var ACCENT = 'en-us';

  /* How natural a voice is likely to sound. Every platform names its good voices differently:
     Edge "... Online (Natural)", Chrome "Google ...", Apple "(Enhanced)" / "(Premium)" / Siri.
     The old desktop voices (David, Zira, eSpeak ...) are the robotic ones.                   */
  var GOOD = ['aria', 'jenny', 'ava', 'emma', 'michelle', 'ana', 'samantha', 'allison', 'susan',
    'google us english', 'zira'];
  function score(v) {
    var n = v.name.toLowerCase(), s = 0;
    if (/natural|neural|premium|enhanced|siri/.test(n)) { s += 100; }
    else if (/online|google/.test(n) || v.localService === false) { s += 60; }
    if (/espeak|david|mark|hazel|george|fred|albert|bad news|bahh|bells|boing|bubbles|cellos|jester|organ|trinoids|whisper|zarvox|wobble|superstar|junior|ralph/.test(n)) { s -= 80; }
    for (var i = 0; i < GOOD.length; i++) { if (n.indexOf(GOOD[i]) >= 0) { s += 30 - i; break; } }
    if ((v.lang || '').toLowerCase().replace('_', '-') === ACCENT) { s += 60; }
    return s;
  }

  /* best first, so the Voice button also steps from better to worse */
  function rankedVoices() {
    return englishVoices().sort(function (a, b) { return score(b) - score(a); });
  }

  function chooseVoice() {
    var list = rankedVoices();
    if (!list.length) { return; }
    var saved = null;
    try { saved = localStorage.getItem('ph-voice'); } catch (e) { /* private mode */ }
    for (var j = 0; j < list.length; j++) {
      if (saved && list[j].name === saved) { voice = list[j]; voiceIndex = j; return; }
    }
    voice = list[0];
    voiceIndex = 0;
  }

  if ('speechSynthesis' in window) {
    chooseVoice();
    window.speechSynthesis.onvoiceschanged = chooseVoice;
  }

  /* ---------------- The 44 sounds of American English ----------------
     A sound is passed around as "/id" (for example "/ee"), never as a made-up spelling,
     so it can be played from a recording. `say` is only the fallback text for the device
     voice, which cannot say a sound on its own and has to be nudged with a spelling.    */
  var SOUNDS = {
    b: { say: 'bah', as: 'bat' }, d: { say: 'duh', as: 'dog' }, f: { say: 'fuh', as: 'fan' },
    g: { say: 'gguh', as: 'goat' }, h: { say: 'huh', as: 'hat' }, j: { say: 'juh', as: 'jam' },
    k: { say: 'kuh', as: 'kite, cat, duck' }, l: { say: 'lluh', as: 'leg' }, m: { say: 'muh', as: 'map' },
    n: { say: 'nuh', as: 'net' }, p: { say: 'puh', as: 'pig' }, r: { say: 'ruh', as: 'run' },
    s: { say: 'ssuh', as: 'sun' }, t: { say: 'tuh', as: 'top' }, v: { say: 'vuh', as: 'van' },
    w: { say: 'wuh', as: 'web' }, y: { say: 'yyuh', as: 'yes' }, z: { say: 'zah', as: 'zip' },
    kw: { say: 'kwuh', as: 'queen' }, ks: { say: 'ukss', as: 'box (the end sound)' },
    sh: { say: 'shuh', as: 'ship' }, ch: { say: 'chuh', as: 'chip' }, th: { say: 'thuh', as: 'thin' },
    ng: { say: 'ing', as: 'ring (the end sound)' },
    a: { say: 'ah', as: 'cat' }, e: { say: 'eh', as: 'bed' }, i: { say: 'ihh', as: 'sit' },
    o: { say: 'aw', as: 'hot' }, u: { say: 'uh', as: 'cup' },
    ay: { say: 'eigh', as: 'rain, cake' }, ee: { say: 'eeh', as: 'seed, me' }, igh: { say: 'eye', as: 'night, bike' },
    oh: { say: 'oh', as: 'boat, home' }, yoo: { say: 'yoo', as: 'cube' }, oo: { say: 'ooh', as: 'moon' },
    ow: { say: 'ow', as: 'cow, out' }, oi: { say: 'oy', as: 'coin, boy' }, aw: { say: 'aw', as: 'saw' },
    ar: { say: 'are', as: 'car' }, or: { say: 'or', as: 'fork' }, er: { say: 'irr', as: 'her, bird, fur' }
  };
  PH.SOUNDS = SOUNDS;

  /* which sound each spelling makes */
  var SOUND_OF = {
    a: 'a', b: 'b', c: 'k', d: 'd', e: 'e', f: 'f', g: 'g', h: 'h', i: 'i', j: 'j', k: 'k',
    l: 'l', m: 'm', n: 'n', o: 'o', p: 'p', q: 'kw', r: 'r', s: 's', t: 't', u: 'u', v: 'v',
    w: 'w', x: 'ks', y: 'y', z: 'z',
    sh: 'sh', ch: 'ch', th: 'th', ck: 'k', ll: 'l', ss: 's', ff: 'f', zz: 'z', ng: 'ng',
    wh: 'w', ph: 'f', qu: 'kw',
    ai: 'ay', ay: 'ay', ee: 'ee', ea: 'ee', oa: 'oh', oo: 'oo', ow: 'ow', ou: 'ow',
    oi: 'oi', oy: 'oi', aw: 'aw', igh: 'igh', ar: 'ar', or: 'or', ir: 'er', ur: 'er', er: 'er'
  };
  /* word-ending chunks from the spelling level have no single sound; the voice says them */
  var CHUNKS = { et: 'eht', an: 'ann', le: 'ul' };

  /* the sound a spelling makes, as "/id"; anything else (a syllable, a word) comes back as is */
  PH.soundHint = function (g) {
    if (SOUND_OF[g]) { return '/' + SOUND_OF[g]; }
    return CHUNKS[g] || g;
  };

  /* The spoken sounds of a whole word, in order. A magic e (c-a-k-e) is silent and
     turns the vowel before it long, so "cake" is /k/ /ay/ /k/, never /k/ /a/ /k/. */
  var LONG = { a: 'ay', e: 'ee', i: 'igh', o: 'oh', u: 'yoo' };
  PH.soundHintsFor = function (word) {
    var sounds = PH.soundGraphemes(word);
    var magic = sounds.length < word.g.length;   /* soundGraphemes dropped a final e */
    return sounds.map(function (g, i) {
      if (magic && i === sounds.length - 2 && LONG[g]) { return '/' + LONG[g]; }
      return PH.soundHint(g);
    });
  };

  /* ---------------- Recordings ---------------- */
  function clips() { return PH.CLIPS || { sounds: [], words: [] }; }
  function clipFor(text) {
    var c = clips();
    if (text.charAt(0) === '/') {
      var id = text.slice(1);
      return c.sounds.indexOf(id) >= 0 ? 'audio/sounds/' + id + '.mp3' : null;
    }
    var w = text.toLowerCase().replace(/[.?!,]/g, '').trim();
    return c.words.indexOf(w) >= 0 ? 'audio/words/' + w + '.mp3' : null;
  }

  /* ---------------- One queue for recordings and the device voice ----------------
     Everything is played strictly one after another. Each item has a safety timer so
     a browser that forgets to report "finished" can never stall the queue.          */
  var queue = [], busy = false, current = null, turn = 0, guard = 0;

  function next() {
    if (busy || !queue.length) { return; }
    var item = queue.shift();
    busy = true;
    var mine = ++turn;
    function done() {
      if (mine !== turn) { return; }
      clearTimeout(guard);
      busy = false; current = null;
      next();
    }
    if (item.clip) {
      var a = new Audio(item.clip);
      current = a;
      a.onended = done;
      a.onerror = function () { fallback(); };
      guard = setTimeout(done, 6000);
      var p = a.play();
      if (p && p.catch) { p.catch(function () { fallback(); }); }
    } else {
      speakNow(item.text, item.opts, done);
    }
    /* a recording that will not play: say it with the device voice instead */
    function fallback() {
      if (mine !== turn || !busy) { return; }
      clearTimeout(guard);
      speakNow(item.text, item.opts, done);
    }
  }

  function speakNow(text, opts, done) {
    if (!speech.supported) { done(); return; }
    if (text.charAt(0) === '/') { text = (SOUNDS[text.slice(1)] || { say: text.slice(1) }).say; }
    var u = new SpeechSynthesisUtterance(String(text));
    if (voice) { u.voice = voice; u.lang = voice.lang; }
    u.rate = opts.rate === undefined ? 0.85 : opts.rate;
    u.pitch = opts.pitch === undefined ? 1.05 : opts.pitch;
    u.volume = 1;
    u.onend = done; u.onerror = done;
    current = u;
    clearTimeout(guard);
    guard = setTimeout(done, 1500 + String(text).length * 110 / u.rate);
    try { window.speechSynthesis.speak(u); } catch (e) { done(); }
  }

  var speech = {
    supported: ('speechSynthesis' in window),

    /* cycle through the installed English voices - some sound much clearer than others */
    nextVoice: function () {
      var list = rankedVoices();
      if (!list.length) { return 'No voices installed'; }
      voiceIndex = (voiceIndex + 1) % list.length;
      voice = list[voiceIndex];
      try { localStorage.setItem('ph-voice', voice.name); } catch (e) { /* private mode */ }
      speech.say('Hello, I am ' + voice.name.split(/[ (]/)[1]);
      return voice.name;
    },

    cancel: function () {
      queue = []; busy = false; turn++;
      clearTimeout(guard);
      if (current && current.pause) { try { current.pause(); } catch (e) { /* ignore */ } }
      current = null;
      if (speech.supported) { try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ } }
    },

    /* say(text) or say(text, {rate, pitch, queue}). "/ee" says a single sound. */
    say: function (text, opts) {
      if (!enabled || !text) { return; }
      opts = opts || {};
      if (!opts.queue) { speech.cancel(); }
      text = String(text);
      queue.push({ text: text, opts: opts, clip: clipFor(text) });
      next();
    },

    /* a single word, said slowly and clearly */
    sayWord: function (word, opts) {
      opts = opts || {};
      speech.say(word, { rate: opts.rate || 0.72, pitch: 1.05, queue: opts.queue });
    },

    /* "/k/ ... /a/ ... /t/ ... cat" (magic e stays silent and makes the vowel long) */
    soundOut: function (word) {
      speech.cancel();
      PH.soundHintsFor(word).forEach(function (h) {
        speech.say(h, { rate: 0.55, queue: true });
      });
      speech.say(word.w, { rate: 0.7, queue: true });
    },

    setEnabled: function (on) { enabled = on; if (!on) { speech.cancel(); } }
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
