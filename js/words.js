/* Phonics Playground - word bank
   Entry format: "word|graphemes(dot separated)|rime(optional)"
   Graphemes are the chunks a child sounds out: ship -> sh.i.p, duck -> d.u.ck
   For the longest words the chunks are syllables: rabbit -> rab.bit             */
(function (PH) {
  'use strict';

  var VOWELS = 'aeiouy';

  function deriveRime(graphemes) {
    for (var i = 0; i < graphemes.length; i++) {
      for (var v = 0; v < VOWELS.length; v++) {
        if (graphemes[i].indexOf(VOWELS[v]) >= 0) {
          return graphemes.slice(i).join('');
        }
      }
    }
    return graphemes.join('');
  }

  function parse(list, levelId) {
    return list.map(function (line) {
      var bits = line.split('|');
      var word = bits[0];
      var graphemes = bits[1] ? bits[1].split('.') : word.split('');
      return {
        w: word,
        g: graphemes,
        rime: bits[2] || deriveRime(graphemes),
        level: levelId
      };
    });
  }

  var RAW = [
    {
      id: 1,
      name: 'Level 1 · Sounding Out',
      focus: 'Three letter words: c-a-t',
      words: [
        'cat|c.a.t', 'hat|h.a.t', 'bat|b.a.t', 'mat|m.a.t', 'rat|r.a.t',
        'map|m.a.p', 'cap|c.a.p', 'tap|t.a.p', 'nap|n.a.p', 'bag|b.a.g',
        'jam|j.a.m', 'ham|h.a.m', 'van|v.a.n', 'man|m.a.n', 'sad|s.a.d',
        'sun|s.u.n', 'bun|b.u.n', 'run|r.u.n', 'bus|b.u.s', 'cup|c.u.p',
        'mug|m.u.g', 'bug|b.u.g', 'hug|h.u.g', 'nut|n.u.t', 'cut|c.u.t',
        'red|r.e.d', 'bed|b.e.d', 'net|n.e.t', 'pet|p.e.t', 'ten|t.e.n',
        'hen|h.e.n', 'leg|l.e.g', 'peg|p.e.g', 'pig|p.i.g', 'big|b.i.g',
        'dig|d.i.g', 'wig|w.i.g', 'pin|p.i.n', 'win|w.i.n', 'tin|t.i.n',
        'lip|l.i.p', 'zip|z.i.p', 'six|s.i.x', 'fix|f.i.x', 'fox|f.o.x',
        'box|b.o.x', 'dog|d.o.g', 'log|l.o.g', 'top|t.o.p', 'hop|h.o.p',
        'mop|m.o.p', 'pot|p.o.t', 'hot|h.o.t', 'dot|d.o.t'
      ]
    },
    {
      id: 2,
      name: 'Level 2 · Two Letters, One Sound',
      focus: 'sh, ch, th, ck and blends',
      words: [
        'ship|sh.i.p', 'shop|sh.o.p', 'shed|sh.e.d', 'shell|sh.e.ll', 'fish|f.i.sh',
        'dish|d.i.sh', 'wish|w.i.sh', 'cash|c.a.sh', 'chin|ch.i.n', 'chip|ch.i.p',
        'chop|ch.o.p', 'chat|ch.a.t', 'chest|ch.e.s.t', 'rich|r.i.ch', 'much|m.u.ch',
        'thin|th.i.n', 'that|th.a.t', 'bath|b.a.th', 'moth|m.o.th', 'with|w.i.th',
        'duck|d.u.ck', 'sock|s.o.ck', 'rock|r.o.ck', 'kick|k.i.ck', 'neck|n.e.ck',
        'back|b.a.ck', 'luck|l.u.ck', 'frog|f.r.o.g', 'flag|f.l.a.g', 'flat|f.l.a.t',
        'clap|c.l.a.p', 'clip|c.l.i.p', 'crab|c.r.a.b', 'grab|g.r.a.b', 'grin|g.r.i.n',
        'drum|d.r.u.m', 'drip|d.r.i.p', 'stop|s.t.o.p', 'step|s.t.e.p', 'spin|s.p.i.n',
        'swim|s.w.i.m', 'slip|s.l.i.p', 'plum|p.l.u.m', 'trap|t.r.a.p', 'twin|t.w.i.n',
        'jump|j.u.m.p', 'lamp|l.a.m.p', 'hand|h.a.n.d', 'sand|s.a.n.d', 'nest|n.e.s.t',
        'best|b.e.s.t', 'milk|m.i.l.k', 'help|h.e.l.p', 'belt|b.e.l.t'
      ]
    },
    {
      id: 3,
      name: 'Level 3 · Long Vowels',
      focus: 'Magic e and vowel teams',
      words: [
        'cake|c.a.k.e|ake', 'lake|l.a.k.e|ake', 'bake|b.a.k.e|ake', 'gate|g.a.t.e|ate',
        'name|n.a.m.e|ame', 'game|g.a.m.e|ame', 'tape|t.a.p.e|ape', 'wave|w.a.v.e|ave',
        'bike|b.i.k.e|ike', 'kite|k.i.t.e|ite', 'time|t.i.m.e|ime', 'five|f.i.v.e|ive',
        'line|l.i.n.e|ine', 'nine|n.i.n.e|ine', 'ride|r.i.d.e|ide', 'hide|h.i.d.e|ide',
        'home|h.o.m.e|ome', 'nose|n.o.s.e|ose', 'rose|r.o.s.e|ose', 'rope|r.o.p.e|ope',
        'bone|b.o.n.e|one', 'hole|h.o.l.e|ole', 'note|n.o.t.e|ote', 'cube|c.u.b.e|ube',
        'tune|t.u.n.e|une', 'mule|m.u.l.e|ule', 'rain|r.ai.n', 'tail|t.ai.l',
        'wait|w.ai.t', 'paint|p.ai.n.t', 'snail|s.n.ai.l|ail', 'tray|t.r.ay|ay',
        'play|p.l.ay|ay', 'seed|s.ee.d', 'feet|f.ee.t', 'tree|t.r.ee|ee',
        'green|g.r.ee.n|een', 'sleep|s.l.ee.p|eep', 'leaf|l.ea.f', 'team|t.ea.m',
        'read|r.ea.d', 'boat|b.oa.t', 'coat|c.oa.t', 'road|r.oa.d', 'soap|s.oa.p',
        'toad|t.oa.d', 'moon|m.oo.n', 'food|f.oo.d', 'spoon|s.p.oo.n|oon',
        'room|r.oo.m', 'book|b.oo.k', 'look|l.oo.k', 'cook|c.oo.k', 'foot|f.oo.t'
      ]
    },
    {
      id: 4,
      name: 'Level 4 · Tricky Teams',
      focus: 'ar, or, ir, ur, igh, ow, ou, oi, aw',
      words: [
        'star|s.t.ar|ar', 'car|c.ar|ar', 'far|f.ar|ar', 'park|p.ar.k', 'farm|f.ar.m',
        'card|c.ar.d', 'sharp|sh.ar.p', 'bird|b.ir.d', 'girl|g.ir.l', 'shirt|sh.ir.t',
        'third|th.ir.d', 'dirt|d.ir.t', 'corn|c.or.n', 'horn|h.or.n', 'fork|f.or.k',
        'storm|s.t.or.m|orm', 'short|sh.or.t', 'born|b.or.n', 'turn|t.ur.n',
        'burn|b.ur.n', 'hurt|h.ur.t', 'curl|c.ur.l', 'herd|h.er.d', 'fern|f.er.n',
        'night|n.igh.t', 'light|l.igh.t', 'right|r.igh.t', 'fight|f.igh.t',
        'high|h.igh|igh', 'sigh|s.igh|igh', 'cow|c.ow|ow', 'now|n.ow|ow',
        'down|d.ow.n', 'town|t.ow.n', 'brown|b.r.ow.n|own', 'house|h.ou.s.e|ouse',
        'mouse|m.ou.s.e|ouse', 'cloud|c.l.ou.d|oud', 'round|r.ou.n.d|ound',
        'found|f.ou.n.d|ound', 'boy|b.oy|oy', 'toy|t.oy|oy', 'joy|j.oy|oy',
        'coin|c.oi.n', 'join|j.oi.n', 'point|p.oi.n.t', 'saw|s.aw|aw', 'paw|p.aw|aw',
        'claw|c.l.aw|aw', 'yawn|y.aw.n', 'crawl|c.r.aw.l|awl'
      ]
    },
    {
      id: 5,
      name: 'Level 5 · Big Words',
      focus: 'Clapping out syllables',
      words: [
        'rabbit|rab.bit|abbit', 'basket|bas.ket|asket', 'sunset|sun.set|unset',
        'picnic|pic.nic|icnic', 'magnet|mag.net|agnet', 'helmet|hel.met|elmet',
        'kitten|kit.ten|itten', 'muffin|muf.fin|uffin', 'dragon|dra.gon|agon',
        'garden|gar.den|arden', 'monster|mon.ster|onster', 'pencil|pen.cil|encil',
        'jacket|jac.ket|acket', 'rocket|roc.ket|ocket', 'puppet|pup.pet|uppet',
        'tunnel|tun.nel|unnel', 'winter|win.ter|inter', 'summer|sum.mer|ummer',
        'thunder|thun.der|under', 'chicken|chic.ken|icken', 'blanket|blan.ket|anket',
        'hospital|hos.pi.tal|ospital', 'elephant|el.e.phant|elephant',
        'computer|com.pu.ter|uter', 'dinosaur|di.no.saur|osaur',
        'butterfly|but.ter.fly|utterfly', 'umbrella|um.brel.la|umbrella',
        'crocodile|croc.o.dile|ocodile', 'adventure|ad.ven.ture|enture',
        'wonderful|won.der.ful|onderful', 'jumping|jump.ing|umping',
        'running|run.ning|unning', 'fastest|fast.est|astest',
        'kindness|kind.ness|indness', 'sandwich|sand.wich|andwich',
        'birthday|birth.day|irthday'
      ]
    }
  ];

  PH.LEVELS = RAW.map(function (lv) {
    return { id: lv.id, name: lv.name, focus: lv.focus, words: parse(lv.words, lv.id) };
  });

  /* every word from level 1 up to and including `id` */
  PH.wordsUpTo = function (id) {
    var out = [];
    PH.LEVELS.forEach(function (lv) { if (lv.id <= id) { out = out.concat(lv.words); } });
    return out;
  };

  PH.levelById = function (id) {
    return PH.LEVELS.filter(function (l) { return l.id === id; })[0] || PH.LEVELS[0];
  };

  /* age -> starting level */
  PH.levelForAge = function (age) {
    return ({ 4: 1, 5: 1, 6: 2, 7: 3, 8: 4, 9: 5 })[age] || 1;
  };

  /* the graphemes of a word that actually make a sound - a final magic e does not */
  PH.soundGraphemes = function (word) {
    var g = word.g.slice();
    if (g.length >= 3 && g[g.length - 1] === 'e') { g.pop(); }
    return g;
  };

  /* first and last sound of a word, worked out from its spelling so that it is
     right even at level 5 where the chunks are syllables rather than graphemes */
  var ONSETS = ['sh', 'ch', 'th', 'wh', 'ph', 'qu'];
  var CODAS3 = ['igh'];
  var CODAS = ['sh', 'ch', 'th', 'ck', 'ng', 'll', 'ss', 'ff', 'zz',
    'ar', 'or', 'ir', 'ur', 'er', 'ay', 'ee', 'ea', 'oo', 'ow', 'oy', 'aw'];

  PH.firstSound = function (word) {
    var s = word.w;
    for (var i = 0; i < ONSETS.length; i++) {
      if (s.indexOf(ONSETS[i]) === 0) { return ONSETS[i]; }
    }
    return s.charAt(0);
  };

  PH.lastSound = function (word) {
    var s = word.w;
    /* drop a magic e (cake -> cak) but not the second e of a vowel team (tree) */
    if (s.length > 3 && s.charAt(s.length - 1) === 'e' &&
        VOWELS.indexOf(s.charAt(s.length - 2)) < 0) {
      s = s.slice(0, -1);
    }
    var i;
    for (i = 0; i < CODAS3.length; i++) {
      if (s.length > 3 && s.slice(-3) === CODAS3[i]) { return CODAS3[i]; }
    }
    for (i = 0; i < CODAS.length; i++) {
      if (s.length > 2 && s.slice(-2) === CODAS[i]) { return CODAS[i]; }
    }
    return s.charAt(s.length - 1);
  };

  /* 'v' for chunks carrying a vowel sound, 'c' for consonant chunks */
  PH.graphemeClass = function (g) { return /[aeiou]/.test(g) ? 'v' : 'c'; };

  /* Swapping one letter can turn an innocent word into a rude or hurtful one
     (duck -> ..., ship -> ...). Every made-up word is checked against this list
     before a child can see it. Substring matches, so it errs on the side of caution. */
  var BLOCK = ['fuc', 'fuk', 'fuq', 'fck', 'shit', 'shat', 'sht', 'cunt', 'cun', 'cum', 'kum',
    'cock', 'cok', 'kok', 'dic', 'dik', 'dyk', 'sex', 'tit', 'twat', 'wank', 'piss', 'pis',
    'ass', 'arse', 'bum', 'butt', 'crap', 'damn', 'hell', 'jiz', 'rape', 'slut', 'slag',
    'whor', 'hoe', 'prick', 'puss', 'vag', 'bich', 'bitch', 'boob', 'poo', 'pee', 'wee',
    'turd', 'fart', 'pube', 'nude', 'nud', 'hump', 'suck', 'kill', 'dead', 'die', 'gun',
    'fag', 'gay', 'homo', 'lez', 'nig', 'nazi', 'kike', 'coon', 'spic', 'wog', 'jap',
    'gook', 'paki', 'chink', 'jew', 'nob', 'knob', 'tard', 'poof', 'fany', 'fann', 'weed',
    'clit', 'porn', 'gash', 'hore', 'shag', 'sod', 'teat', 'cack', 'drug', 'hate', 'fat',
    'twit', 'stup', 'dumb', 'ugly', 'idiot', 'moron', 'spaz', 'mong', 'retar', 'queer',
    'muff', 'dong', 'willy', 'spunk', 'semen', 'anal', 'anus', 'smeg', 'skank', 'bugg',
    'bollo', 'minge', 'titt', 'nipp', 'perv', 'pimp', 'scum', 'vomit', 'barf', 'bomb', 'stab'];

  PH.isClean = function (s) {
    s = String(s).toLowerCase();
    for (var i = 0; i < BLOCK.length; i++) {
      if (s.indexOf(BLOCK[i]) >= 0) { return false; }
    }
    return true;
  };

  function differsByOne(a, b) {
    if (a.length !== b.length) { return false; }
    var d = 0;
    for (var i = 0; i < a.length; i++) { if (a[i] !== b[i]) { d++; } }
    return d === 1;
  }

  /* Words that look almost like `word`: real bank words one chunk away first,
     then made-up ones built by swapping one chunk for another of the same kind.
     Returns [{w, real}] - never the word itself, never anything on the blocklist. */
  PH.nearMisses = function (word, pool, n) {
    var classes = { v: {}, c: {} };
    pool.forEach(function (w) {
      w.g.forEach(function (g) { classes[PH.graphemeClass(g)][g] = 1; });
    });
    var realSet = {};
    PH.wordsUpTo(5).forEach(function (w) { realSet[w.w] = 1; });

    var seen = {};
    seen[word.w] = 1;
    var real = [];
    pool.forEach(function (w) {
      if (!seen[w.w] && differsByOne(w.g, word.g)) { seen[w.w] = 1; real.push({ w: w.w, real: true }); }
    });
    real.sort(function () { return Math.random() - 0.5; });

    /* never swap a silent magic e - that would not change what the word sounds like */
    var swappable = PH.soundGraphemes(word).length;
    var made = [];
    for (var tries = 0; tries < 300 && made.length < n * 2; tries++) {
      var i = Math.floor(Math.random() * swappable);
      var g = word.g[i];
      var opts = Object.keys(classes[PH.graphemeClass(g)]).filter(function (x) { return x !== g; });
      if (!opts.length) { continue; }
      var arr = word.g.slice();
      arr[i] = opts[Math.floor(Math.random() * opts.length)];
      var s = arr.join('');
      if (seen[s] || !PH.isClean(s)) { continue; }
      seen[s] = 1;
      made.push({ w: s, real: !!realSet[s] });
    }

    /* at most one real look-alike, the rest made up, so every round is solvable by reading */
    var out = real.slice(0, 1).concat(made);
    return out.slice(0, n);
  };

  /* graphemes common enough in a level to build a whole round around */
  PH.soundsFor = function (level, minMatches) {
    minMatches = minMatches || 4;
    var counts = {};
    level.words.forEach(function (w) {
      var seen = {};
      PH.soundGraphemes(w).forEach(function (g) {
        if (!seen[g]) { seen[g] = 1; counts[g] = (counts[g] || 0) + 1; }
      });
    });
    return Object.keys(counts).filter(function (g) {
      return counts[g] >= minMatches && level.words.length - counts[g] >= 6;
    });
  };

})(window.PH = window.PH || {});
