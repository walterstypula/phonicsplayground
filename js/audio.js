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

  /* "Microsoft Zira - English (United States)" is the whole truth and far too much of it
     for a button: the part worth showing is the name and where it is from. */
  function shortName(v) {
    var n = (v.name || '')
      .replace(/^(Microsoft|Google|Apple)\s+/i, '')
      .replace(/\s*[-–]\s*English.*$/i, '')
      .replace(/\s*\((Natural|Enhanced|Premium|Online.*?)\)\s*/ig, ' ')
      .replace(/\s+English\s*$/i, '')
      .trim() || v.name;
    var lang = (v.lang || '').replace('_', '-');
    return lang ? n + ' (' + lang + ')' : n;
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

  /* The list usually arrives after the page does, so whoever draws the voice picker asks
     to be told when it lands - and again if the browser swaps the list out later. */
  var voiceWatchers = [];
  function voicesChanged() {
    chooseVoice();
    for (var i = 0; i < voiceWatchers.length; i++) { voiceWatchers[i](); }
  }

  if ('speechSynthesis' in window) {
    chooseVoice();
    window.speechSynthesis.onvoiceschanged = voicesChanged;
  }

  /* ---------------- The 43 sounds of American English the games use ----------------
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
    dh: { say: 'thuh', as: 'that, this (the buzzing one)' },
    ng: { say: 'ing', as: 'ring (the end sound)' },
    a: { say: 'ah', as: 'cat' }, e: { say: 'eh', as: 'bed' }, i: { say: 'ihh', as: 'sit' },
    o: { say: 'aw', as: 'hot' }, u: { say: 'uh', as: 'cup' },
    ay: { say: 'eigh', as: 'rain, cake' }, ee: { say: 'eeh', as: 'seed, me' }, igh: { say: 'eye', as: 'night, bike' },
    oh: { say: 'oh', as: 'boat, home' }, yoo: { say: 'yoo', as: 'cube' }, oo: { say: 'ooh', as: 'moon' },
    uu: { say: 'uuh', as: 'book, foot (the short one)' },
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
    /* a doubled letter is one sound: egg, rabbit, ladder */
    bb: 'b', dd: 'd', gg: 'g', mm: 'm', nn: 'n', pp: 'p', rr: 'r', tt: 't', cc: 'k',
    ai: 'ay', ay: 'ay', ee: 'ee', ea: 'ee', ey: 'ee', ie: 'ee', oa: 'oh', oo: 'oo', ow: 'ow', ou: 'ow',
    oi: 'oi', oy: 'oi', aw: 'aw', igh: 'igh', ar: 'ar', or: 'or', ir: 'er', ur: 'er', er: 'er'
  };
  /* word-ending chunks from the spelling level have no single sound; the voice says them */
  var CHUNKS = { et: 'eht', an: 'ann', le: 'ul' };

  /* the sound a spelling makes, as "/id"; anything else (a syllable, a word) comes back as is */
  PH.soundHint = function (g) {
    if (SOUND_OF[g]) { return '/' + SOUND_OF[g]; }
    return CHUNKS[g] || g;
  };

  /* longest spelling first, so that "igh" is matched before "i" and "sh" before "s" */
  var GRAPHEMES = Object.keys(SOUND_OF).sort(function (a, b) { return b.length - a.length; });

  /* The "-ed" on the end of a word is one chunk, and it says three different things:
     /id/ after t or d (landed, wanted), /t/ after a voiceless sound (packed, jumped),
     and /d/ after anything else (played, called). Sounded letter by letter it comes out
     as an extra vowel and a doubled d - "land-e-d" - which is not a word.

     It only counts as a suffix when there is a word in front of it. "seed" and "bed" end
     in the same two letters and are nothing of the kind, so a stem must be long enough
     to stand on its own and must not end in the e of a vowel team.                     */
  var ED_VOICELESS = { p: 1, k: 1, f: 1, s: 1, x: 1, h: 1 };   /* h covers -shed, -ched */

  function edSuffix(s) {
    if (s.length < 5 || s.slice(-2) !== 'ed') { return null; }
    var before = s.charAt(s.length - 3);
    if ('aeiou'.indexOf(before) >= 0) { return null; }
    if (before === 't' || before === 'd') { return { text: 'ed', id: 'id', ids: ['i', 'd'] }; }
    if (ED_VOICELESS[before]) { return { text: 'ed', id: 't' }; }
    return { text: 'ed', id: 'd' };
  }

  /* The letters of a word, grouped into the chunks that each make one sound, and the
     sound each chunk makes: "cake" comes back as c, a (saying /ay/), k, and a silent e.
     A chunk with no sound is either that silent e or a letter the rules cannot place. */
  function graphemesOf(text) {
    var s = String(text).toLowerCase().replace(/[^a-z]/g, '');
    /* "-le" after a consonant is the /ul/ of apple and little, not /l/ followed by /e/ */
    var tail = null;
    if (s.length > 2 && s.slice(-2) === 'le' && 'aeiou'.indexOf(s.charAt(s.length - 3)) < 0) {
      /* one chunk to look at and one recording to play, but two sounds to fall back on:
         /ul/ is a syllable, not a 44th sound, so it has no clip of its own to list */
      tail = { text: 'le', id: 'ul', ids: ['u', 'l'] };
      s = s.slice(0, -2);
    } else if (edSuffix(s)) {
      tail = edSuffix(s);
      s = s.slice(0, -2);
    } else if (s.length > 1 && s.slice(-1) === 'y' && 'aeiou'.indexOf(s.charAt(s.length - 2)) < 0) {
      /* A y on the end is a vowel, not the y of "yes". With no other vowel in the word it
         is doing the vowel's whole job and says its name - by, my, fly, try - and with one
         already there it settles for /ee/: happy, sunny, body. (A y after a vowel is part
         of a team, "day" and "boy", and is matched as one before ever reaching here.) */
      tail = { text: 'y', id: /[aeiou]/.test(s.slice(0, -1)) ? 'ee' : 'igh' };
      s = s.slice(0, -1);
    }
    var found = [], i = 0, j, hit;
    while (i < s.length) {
      hit = null;
      for (j = 0; j < GRAPHEMES.length; j++) {
        if (s.substr(i, GRAPHEMES[j].length) === GRAPHEMES[j]) { hit = GRAPHEMES[j]; break; }
      }
      if (!hit) { found.push({ text: s.charAt(i), id: null }); i++; continue; }
      found.push({ text: hit, id: SOUND_OF[hit] });
      i += hit.length;
    }
    /* A final e is never sounded. Where it follows a single consonant it is a magic e and
       lengthens the vowel in front of it - "ake" is /ay/ /k/ - and otherwise it is simply
       silent: "ouse" is /ow/ /s/, not /ow/ /s/ /e/. */
    var last = found[found.length - 1];
    if (found.length >= 2 && last && last.text === 'e') {
      if (found.length >= 3 && LONG[found[found.length - 3].id]) {
        found[found.length - 3].id = LONG[found[found.length - 3].id];
      }
      last.id = null;
    }
    if (tail) { found.push(tail); }
    return found;
  }

  /* The sounds a chunk is spelled with, longest spelling first: "oon" is /oo/ /n/, "ap"
     is /a/ /p/, "ight" is /igh/ /t/.

     This exists because a chunk is neither one of the 43 sounds nor a word, and a voice
     handed one as text says whatever it resembles rather than what it spells: "ap" comes
     back as "A. P.", "gg" as "G. G.", "i" as "eye", "to" as "two", "oon" as "un". Played
     as its own sounds, run together, a chunk sounds like itself.                       */
  PH.soundsIn = function (text) {
    var out = [];
    graphemesOf(text).forEach(function (g) {
      if (!g.id) { return; }
      (g.ids || [g.id]).forEach(function (id) { out.push('/' + id); });
    });
    return out;
  };

  /* The spoken sounds of a whole word, in order. A magic e (c-a-k-e) is silent and
     turns the vowel before it long, so "cake" is /k/ /ay/ /k/, never /k/ /a/ /k/. */
  var LONG = { a: 'ay', e: 'ee', i: 'igh', o: 'oh', u: 'yoo' };

  /* The words in the bank whose letters do not make their usual sounds. English writes
     one sound several ways and one spelling several sounds, and no rule short of a
     dictionary sorts them out: the s of "nose" buzzes but the s of "house" hisses, the
     oo of "book" is not the oo of "moon". So these few words simply say what they sound
     like, one sound per chunk the child sees. */
  var WORD_SOUNDS = {
    nose: ['n', 'oh', 'z'], rose: ['r', 'oh', 'z'],          /* s says /z/ */
    book: ['b', 'uu', 'k'], look: ['l', 'uu', 'k'],          /* the short oo */
    cook: ['k', 'uu', 'k'], foot: ['f', 'uu', 't'],
    that: ['dh', 'a', 't'],                                  /* voiced th, not the th of "thin" */
    tune: ['t', 'oo', 'n']                                   /* toon, not tyoon */
  };

  PH.soundHintsFor = function (word) {
    var sounds = PH.soundGraphemes(word);
    var said = WORD_SOUNDS[word.w];
    if (said && said.length === sounds.length) {
      return said.map(function (id) { return '/' + id; });
    }
    var magic = sounds.length < word.g.length;   /* soundGraphemes dropped a final e */
    return sounds.map(function (g, i) {
      if (magic && i === sounds.length - 2 && LONG[g]) { return '/' + LONG[g]; }
      return PH.soundHint(g);
    });
  };

  /* ---------------- Sounding a word out, one sound at a time ----------------

     Blending needs a word broken into its sounds: "seed" is s-ee-d, "apple" is a-p-ul.
     The word bank cannot supply that on its own, because for the longest words it splits
     into syllables instead - rab.bit, hel.i.cop.ter - which is what the clapping and
     spelling games want and the opposite of what blending wants. Neither can the
     spelling rules always work it out, because English will not be ruled: the ea of
     "bear" is not the ea of "bead", the c of "pencil" is not the c of "cat".

     So SOUND_OUT says, for the words the rules get wrong, what the word actually says.
     A piece is written "letters" where the usual sound is right, "letters=sound" where
     it is not, and "letters=-" where the letters are silent. A sound is one of the 43,
     or else the name of a recorded syllable ("ture" for the cher of adventure).       */
  var SOUND_OUT = {
    /* the ea/ai of bear, pear and chair is the vowel of "bed" with an r after it */
    bear: 'b ea=e r', pear: 'p ea=e r', chair: 'ch ai=e r',
    bread: 'b r ea=e d',
    /* an s between vowels buzzes */
    nose: 'n o=oh s=z e=-', rose: 'r o=oh s=z e=-', cheese: 'ch ee s=z e=-',
    /* the oo of "book" is not the oo of "moon" */
    cookie: 'c oo=uu k ie=ee',
    /* an unstressed vowel flattens to /u/, whatever it is spelled with */
    banana: 'b a=u n a n a=u', pizza: 'p i zz a=u', umbrella: 'u m b r e ll a=u',
    zebra: 'z e=ee b r a=u', tomato: 't o=u m a=ay t o=oh',
    monkey: 'm o=u n k ey=ee', octopus: 'o c t o=u p u s',
    lion: 'l i=igh o=u n', watermelon: 'w a=o t er m e l o=u n',
    wonderful: 'w o=u n d er f u l', computer: 'c o=u m p u=yoo t er',
    crocodile: 'c r o c o=u d i=igh l e=-', dragon: 'd r a g o=u n',
    hospital: 'h o s p i t a=u l', elephant: 'e l e=u ph a n t',
    /* the ar of "carrot" is not the ar of "car": the r belongs to the second half */
    carrot: 'c a rr o t',
    /* an e on the end that lengthens nothing, and an o that is long without one */
    gone: 'g o n e=-', gold: 'g o=oh l d', along: 'a=u l o ng',
    /* a lone i saying its name, and the y of butterfly doing the same */
    tiger: 't i=igh g er', spider: 's p i=igh d er', kindness: 'k i=igh n d n e ss',
    butterfly: 'b u tt er f l y=igh',
    dinosaur: 'd i=igh n o=oh s aur=or',
    /* a c before i or e says /s/ */
    pencil: 'p e n c=s i l',
    /* -ture says "cher", which is no single sound, so the recorded syllable says it */
    adventure: 'a d v e n ture=ture'
  };

  function pieces(spec) {
    return spec.split(' ').map(function (tok) {
      var eq = tok.indexOf('=');
      if (eq < 0) { return { text: tok, hint: PH.soundHint(tok) }; }
      var id = tok.slice(eq + 1);
      return {
        text: tok.slice(0, eq),
        hint: id === '-' ? null : SOUNDS[id] ? '/' + id : id
      };
    });
  }

  /* the letters a child sees, paired with the sound each group of them makes */
  PH.soundOut = function (word) {
    if (SOUND_OUT[word.w]) { return pieces(SOUND_OUT[word.w]); }
    /* where the bank already splits into single sounds, use its split: it knows things
       the spelling does not, such as which words the exceptions above apply to */
    var single = word.g.every(function (c, i) {
      return SOUND_OF[c] || (i === word.g.length - 1 && c === 'e');
    });
    if (single) {
      var said = PH.soundHintsFor(word);
      return word.g.map(function (c, i) {
        return { text: c, hint: i < said.length ? said[i] : null };
      });
    }
    return graphemesOf(word.w).map(function (g) {
      return { text: g.text, hint: g.id ? (SOUNDS[g.id] ? '/' + g.id : g.id) : null };
    });
  };

  /* ---------------- Recordings ---------------- */
  function clips() { return PH.CLIPS || { sounds: [], words: [] }; }
  /* the listed file whose name (without .wav / .mp3) is `name` */
  function listed(files, folder, name) {
    for (var i = 0; i < files.length; i++) {
      if (files[i].replace(/\.[a-z0-9]+$/i, '') === name) { return folder + files[i]; }
    }
    return null;
  }
  function clipFor(text) {
    var c = clips();
    if (text.charAt(0) === '/') { return listed(c.sounds, 'audio/sounds/', text.slice(1)); }
    return listed(c.words, 'audio/words/', text.toLowerCase().replace(/[.?!,]/g, '').trim());
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

    /* the installed English voices, best first - some sound much clearer than others */
    voices: function () {
      return rankedVoices().map(function (v) { return { name: v.name, label: shortName(v) }; });
    },

    /* the one being used, as { name, label }, or null before any voice has loaded */
    voice: function () {
      return voice ? { name: voice.name, label: shortName(voice) } : null;
    },

    /* tell me when the browser's list of voices arrives or changes */
    onVoicesChanged: function (fn) { voiceWatchers.push(fn); },

    /* pick one by name. `quiet` skips the hello, for restoring a voice without fuss. */
    setVoice: function (name, quiet) {
      var list = rankedVoices();
      for (var i = 0; i < list.length; i++) {
        if (list[i].name === name) {
          voice = list[i]; voiceIndex = i;
          try { localStorage.setItem('ph-voice', voice.name); } catch (e) { /* private mode */ }
          if (!quiet) { speech.say('Hello, I am ' + shortName(voice).replace(/\s*\(.*\)$/, '')); }
          return speech.voice();
        }
      }
      return speech.voice();
    },

    /* step through the list: +1 for the next voice, -1 to go back to the one before */
    stepVoice: function (by) {
      var list = rankedVoices();
      if (!list.length) { return null; }
      var i = (voiceIndex + (by || 1)) % list.length;
      if (i < 0) { i += list.length; }
      return speech.setVoice(list[i].name);
    },

    cancel: function () {
      queue = []; busy = false; turn++;
      stopBlend(0.03);          /* a held blending sound stops with everything else */
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

    /* Whether anything is still being said or waiting to be. A game that moves on while
       a word is still in the air cuts it off, and the word at the end of a round - the
       one the whole round was about - is the one that gets cut. */
    busy: function () { return busy || queue.length > 0; },

    /* Whether a round that has run for `elapsed` seconds may now give way to the next.
       The wait is at least `min`, and then as much longer as the voice needs to finish
       what it was saying - up to a few seconds, so that a browser which never reports a
       sound as finished cannot leave a child sitting in front of a stopped game. */
    settled: function (elapsed, min) {
      if (elapsed < min) { return false; }
      return !speech.busy() || elapsed > min + 4;
    },

    setEnabled: function (on) { enabled = on; if (!on) { speech.cancel(); } }
  };

  /* ---------------- Blending ----------------
     Sounding a word out is not the same as playing its sounds one after another. A child
     blends by running each sound into the next without a gap, and by holding the ones
     that can be held: mmmaaannn, not "m" ... "a" ... "n".

     An <audio> element cannot do that. It takes about 13 ms to start - 130 ms the first
     time - and the only way to play the next sound is to cut the last one dead, which in
     practice happened 40 ms into a half-second clip. The result is a stutter of chopped
     beginnings. So blending plays through Web Audio from clips decoded up front: the next
     sound fades in across the tail of the one before it, and a sound that can be held
     loops its own middle for as long as the finger rests on it.

     Anything that cannot be played this way answers false, and the caller falls back to
     the ordinary queue.                                                                */
  var STOPS = { b: 1, d: 1, g: 1, k: 1, p: 1, t: 1, ch: 1, j: 1, kw: 1, ks: 1 };
  var buffers = {}, loading = {}, playing = [];

  /* "/m" is one of the 43 sounds; anything else is a syllable or word recorded in words/ */
  function clipUrl(key) {
    if (String(key).charAt(0) === '/') { return listed(clips().sounds, 'audio/sounds/', String(key).slice(1)); }
    return listed(clips().words, 'audio/words/', String(key).toLowerCase());
  }

  function loadClip(key) {
    if (buffers[key] !== undefined || loading[key]) { return; }
    var url = clipUrl(key);
    var a = ac();
    if (!url || !a || !window.fetch) { buffers[key] = null; return; }
    loading[key] = true;
    fetch(url)
      .then(function (r) { return r.arrayBuffer(); })
      .then(function (raw) { return a.decodeAudioData(raw); })
      .then(function (buf) { buffers[key] = buf; loading[key] = false; })
      .catch(function () { buffers[key] = null; loading[key] = false; });
  }

  function stopBlend(fade) {
    if (!playing.length) { return; }
    var a = ac(), list = playing;
    playing = [];
    if (!a) { return; }
    var t = a.currentTime;
    fade = fade === undefined ? 0.06 : fade;
    list.forEach(function (p) {
      try {
        p.gain.gain.cancelScheduledValues(t);
        p.gain.gain.setValueAtTime(p.gain.gain.value, t);
        p.gain.gain.linearRampToValueAtTime(0.0001, t + fade);
        p.node.stop(t + fade + 0.02);
      } catch (e) { /* already stopped */ }
    });
  }

  /* one clip, starting at `at`, fading in over whatever is still sounding */
  function startClip(a, id, buf, at, hold) {
    var src = a.createBufferSource();
    var gain = a.createGain();
    src.buffer = buf;
    if (hold && !STOPS[id] && buf.duration > 0.22) {
      src.loop = true;
      src.loopStart = buf.duration * 0.35;   /* the steady middle, past the attack */
      src.loopEnd = buf.duration * 0.78;     /* and before it tails away */
    }
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(1, at + 0.025);
    src.connect(gain); gain.connect(a.destination);
    src.start(at);
    playing.push({ node: src, gain: gain });
    return src;
  }

  function bufferFor(hint) {
    if (!hint) { return null; }
    if (!buffers[hint]) { loadClip(hint); return null; }
    var id = String(hint).charAt(0) === '/' ? String(hint).slice(1) : '';
    return { id: id, buf: buffers[hint] };
  }

  var blend = {
    /* Blending needs the clips decoded, decoding needs them fetched, and a page opened
       straight off the disk is not allowed to fetch its own folder - window.fetch exists
       there, it just refuses every file:// URL. Saying so up front is better than firing
       off requests that are certain to fail: the games then go directly to playing each
       sound as a plain audio element, which does work from a disk. They arrive one after
       another rather than running together, which is the part that cannot be helped. */
    supported: !!(window.AudioContext || window.webkitAudioContext) && !!window.fetch &&
      window.location.protocol !== 'file:',

    /* decode the sounds a word needs before the child reaches them */
    warm: function (keys) {
      if (!blend.supported) { return; }
      keys.forEach(function (k) { if (k) { loadClip(k); } });
    },

    /* Play one sound, fading in over whatever is still sounding. `hold` keeps a sound
       that can be held going until release() - a real mmmmm, not the same clip restarted.
       Returns false if there is no decoded clip, so the caller can say it the slow way. */
    play: function (hint, hold) {
      if (!enabled || !blend.supported) { return false; }
      var a = ac();
      var clip = bufferFor(hint);
      if (!a || !clip) { return false; }
      stopBlend(0.05);
      startClip(a, clip.id, clip.buf, a.currentTime, hold);
      return true;
    },

    /* A run of sounds played back to back, each starting a little before the last has
       finished, so "a" and "p" arrive as "ap" rather than as two letters. All or nothing:
       if any clip is missing the caller should say the chunk some other way. */
    sequence: function (hints) {
      if (!enabled || !blend.supported || !hints.length) { return false; }
      var a = ac();
      if (!a) { return false; }
      var clips = [], i;
      for (i = 0; i < hints.length; i++) {
        var clip = bufferFor(hints[i]);
        if (!clip) { return false; }
        clips.push(clip);
      }
      stopBlend(0.04);
      var at = a.currentTime + 0.02;
      for (i = 0; i < clips.length; i++) {
        startClip(a, clips[i].id, clips[i].buf, at, false);
        /* the next sound comes in over the tail of this one, which is what makes a run of
           sounds a syllable instead of a list */
        at += Math.max(0.07, clips[i].buf.duration - 0.06);
      }
      return true;
    },

    /* let go of a held sound: it tails off rather than stopping dead */
    release: function () { stopBlend(0.12); },
    stop: function () { stopBlend(0.03); }
  };
  PH.blend = blend;

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
