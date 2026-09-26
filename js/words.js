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

  /* ---------- pre-reader levels (ages 3 and 4) ----------
     Pictures: "word|emoji|group|syllables|rime". Groups drive "catch all the animals" style
     rules, syllables drive clapping, and rimes are given so that bear / pear / chair rhyme.  */
  var PICTURES = [
    'cat|🐱|animal|cat|at', 'bat|🦇|animal|bat|at', 'hat|🎩|thing|hat|at',
    'dog|🐶|animal|dog|og', 'frog|🐸|animal|frog|og',
    'bee|🐝|animal|bee|ee', 'tree|🌳|thing|tree|ee', 'key|🔑|thing|key|ee',
    'cake|🍰|food|cake|ake', 'snake|🐍|animal|snake|ake',
    'goat|🐐|animal|goat|oat', 'boat|⛵|go|boat|oat', 'coat|🧥|thing|coat|oat',
    'mouse|🐭|animal|mouse|ouse', 'house|🏠|thing|house|ouse',
    'bear|🐻|animal|bear|air', 'pear|🍐|food|pear|air', 'chair|🪑|thing|chair|air',
    'car|🚗|go|car|ar', 'star|⭐|thing|star|ar',
    'moon|🌙|thing|moon|oon', 'spoon|🥄|thing|spoon|oon',
    'duck|🦆|animal|duck|uck', 'truck|🚚|go|truck|uck',
    'fox|🦊|animal|fox|ox', 'box|📦|thing|box|ox',
    'sock|🧦|thing|sock|ock', 'clock|⏰|thing|clock|ock',
    'ring|💍|thing|ring|ing', 'king|🤴|thing|king|ing',
    'fish|🐟|animal|fish|ish', 'pig|🐷|animal|pig|ig', 'sun|☀️|thing|sun|un',
    'bus|🚌|go|bus|us', 'egg|🥚|food|egg|egg', 'cow|🐄|animal|cow|ow',
    'train|🚂|go|train|ain', 'bike|🚲|go|bike|ike', 'plane|✈️|go|plane|ane',
    'cheese|🧀|food|cheese|eese', 'corn|🌽|food|corn|orn', 'bread|🍞|food|bread|ead',
    'apple|🍎|food|ap.ple|apple', 'banana|🍌|food|ba.na.na|anana',
    'pizza|🍕|food|piz.za|izza', 'carrot|🥕|food|car.rot|arrot',
    'tomato|🍅|food|to.ma.to|omato', 'cookie|🍪|food|cook.ie|ookie',
    'rabbit|🐰|animal|rab.bit|abbit', 'monkey|🐒|animal|mon.key|onkey',
    'tiger|🐯|animal|ti.ger|iger', 'spider|🕷️|animal|spi.der|ider',
    'elephant|🐘|animal|el.e.phant|elephant', 'octopus|🐙|animal|oc.to.pus|octopus',
    'butterfly|🦋|animal|but.ter.fly|utterfly', 'dinosaur|🦕|animal|di.no.saur|osaur',
    'rocket|🚀|go|roc.ket|ocket', 'tractor|🚜|go|trac.tor|actor',
    'helicopter|🚁|go|hel.i.cop.ter|elicopter',
    'insect|🐛|animal|in.sect|insect', 'nose|👃|thing|nose|ose',
    'umbrella|☂️|thing|um.brel.la|ella', 'lion|🦁|animal|li.on|ion',
    'watermelon|🍉|food|wa.ter.mel.on|elon', 'van|🚐|go|van|an',
    'zebra|🦓|animal|ze.bra|ebra'
  ].map(function (line) {
    var b = line.split('|');
    return { w: b[0], pic: b[1], group: b[2], g: b[3].split('.'), rime: b[4], level: -1 };
  });

  /* Letters: "letter|keyword". Every keyword starts with its letter's sound and is a
     picture word, so the prompt can show it: "s says sss, like sun". */
  var LETTERS = [
    's|sun', 'a|apple', 't|tiger', 'p|pig', 'i|insect', 'n|nose', 'm|monkey', 'd|dog', 'g|goat',
    'o|octopus', 'c|cat', 'k|key', 'e|egg', 'u|umbrella', 'r|rabbit', 'h|hat', 'b|bear', 'f|fox',
    'l|lion', 'w|watermelon', 'v|van', 'z|zebra'
  ].map(function (line) {
    var b = line.split('|');
    return { w: b[0], g: [b[0]], rime: b[0], level: 0, letter: true, key: b[1] };
  });

  PH.PICTURES = PICTURES;
  PH.picFor = {};
  PICTURES.forEach(function (p) { PH.picFor[p.w] = p.pic; });

  /* Pictures for reading-level words, used where a child reads a word and must find
     what it means (Wizard's Spellbook). Only words that can be drawn are listed, and
     no two words that share a level share a picture.                                */
  var READ_PICS = {
    /* level 1 */
    cat: '🐱', hat: '🎩', bat: '🦇', rat: '🐀', map: '🗺️',
    cap: '🧢', bag: '👜', ham: '🍖', van: '🚐', man: '👨',
    sad: '😢', sun: '☀️', run: '🏃', bus: '🚌', cup: '🥤',
    mug: '☕', bug: '🐛', hug: '🤗', nut: '🥜', cut: '✂️',
    red: '🟥', bed: '🛏️', net: '🥅', ten: '🔟', hen: '🐔',
    leg: '🦵', pig: '🐷', dig: '⛏️', pin: '📌', win: '🏆',
    tin: '🥫', lip: '👄', zip: '🤐', fix: '🔧', fox: '🦊',
    box: '📦', dog: '🐶', hot: '🔥', dot: '⚫', mop: '🧹',
    /* level 2 */
    ship: '🚢', shop: '🏪', shell: '🐚', fish: '🐟', dish: '🍽️',
    wish: '🌠', cash: '💵', chip: '🍟', rich: '🤑', bath: '🛁',
    duck: '🦆', sock: '🧦', luck: '🍀', frog: '🐸', flag: '🚩',
    clap: '👏', crab: '🦀', drum: '🥁', drip: '💧', stop: '🛑',
    swim: '🏊', lamp: '💡', hand: '✋', sand: '🏖️', milk: '🥛',
    help: '🆘',
    /* level 3 */
    cake: '🍰', lake: '🏞️', game: '🎮', wave: '🌊', bike: '🚲',
    time: '⏰', ride: '🎢', hide: '🙈', home: '🏠', nose: '👃',
    rose: '🌹', bone: '🦴', note: '🎵', cube: '🧊', rain: '🌧️',
    snail: '🐌', seed: '🌱', feet: '👣', tree: '🌳', sleep: '😴',
    leaf: '🍃', read: '📖', boat: '⛵', coat: '🧥', road: '🛣️',
    soap: '🧼', toad: '🐸', moon: '🌙', food: '🍲', spoon: '🥄',
    book: '📕', look: '👀', foot: '🦶',
    /* level 4 */
    star: '⭐', car: '🚗', farm: '🚜', card: '🃏', bird: '🐦',
    girl: '👧', shirt: '👕', corn: '🌽', horn: '📯', fork: '🍴',
    storm: '⛈️', burn: '🔥', hurt: '🤕', night: '🌃', light: '💡',
    fight: '🥊', cow: '🐄', down: '⬇️', town: '🏘️', brown: '🟫',
    house: '🏠', mouse: '🐭', cloud: '☁️', round: '⭕', boy: '👦',
    toy: '🧸', joy: '😄', point: '👉', paw: '🐾', yawn: '🥱',
    /* level 5 */
    rabbit: '🐰', basket: '🧺', sunset: '🌇', magnet: '🧲', helmet: '⛑️',
    kitten: '🐈', muffin: '🧁', dragon: '🐉', garden: '🌷', monster: '👾',
    pencil: '✏️', jacket: '🧥', rocket: '🚀', winter: '⛄', thunder: '⚡',
    chicken: '🐔', hospital: '🏥', elephant: '🐘', computer: '💻',
    dinosaur: '🦕', butterfly: '🦋', umbrella: '☂️', crocodile: '🐊',
    sandwich: '🥪', birthday: '🎂', running: '🏃'
  };
  PH.picOf = function (word) { return PH.picFor[word] || READ_PICS[word] || null; };

  /* Short phrases for the oldest Spellbook levels: the picture shows both things,
     so the child has to read both nouns, not just the first one they spot. */
  PH.PHRASE_PARTS = {
    4: {
      who: ['cat', 'dog', 'fox', 'pig', 'hen', 'frog', 'duck', 'bird', 'cow', 'mouse'],
      what: ['box', 'bus', 'bed', 'boat', 'car', 'hat', 'cup', 'tree', 'house', 'moon'],
      frames: ['a %s in a %o', 'a %s on a %o', 'a %s and a %o', 'the %s by the %o']
    },
    5: {
      who: ['rabbit', 'kitten', 'dragon', 'monster', 'chicken', 'elephant', 'dinosaur', 'crocodile', 'butterfly'],
      what: ['basket', 'rocket', 'garden', 'helmet', 'jacket', 'sandwich', 'umbrella', 'computer', 'muffin'],
      frames: ['a %s in a %o', 'a %s with a %o', 'the %s and the %o', 'a %s next to a %o']
    }
  };

  /* Sentences for Sentence Train: "text|picture" or "text|picture|another fair order".
     Levels 1-3 are read aloud, so the capital and full stop ride on the words.
     Levels 4-5 are not read aloud: words are lower case and the full stop or question
     mark is its own carriage (" ." at the end). Every sentence was checked for other
     orders a child could fairly build; those are listed after the second bar.        */
  PH.SENTENCES = {
    1: ['The cat is big.|🐱', 'A dog can dig.|🐶⛏️', 'I see a bug.|🐛',
      'The sun is hot.|☀️🔥', 'The fox ran.|🦊🏃', 'I got a pet.|🐶',
      'The bus is red.|🚌🟥', 'Mom has a hat.|🎩', 'A pig can run.|🐷🏃',
      'The man is sad.|😢', 'I can hop.|🐇', 'The cup is hot.|☕🔥',
      'I had ten pins.|📌', 'The van is big.|🚐'],
    2: ['The ship is big.|🚢', 'A duck can swim.|🦆🏊', 'The fish can swim.|🐟',
      'I can clap.|👏', 'The frog can jump.|🐸', 'Stop the bus.|🛑🚌',
      'I wish for a ship.|🌠🚢', 'The crab is red.|🦀', 'That is my sock.|🧦',
      'The shop is shut.|🏪', 'I hit the drum.|🥁', 'The lamp is on.|💡',
      'The chick can peck.|🐤'],
    3: ['They like to ride a bike.|🚲', 'The snail was very slow.|🐌', 'We have a green boat.|⛵',
      'Come and see the moon.|🌙', 'Some bees are in the tree.|🐝🌳',
      'The toad said no.|🐸', 'Look at my new coat.|👀🧥',
      'There is soap on my nose.|🧼👃', 'My feet are in the rain.|👣🌧️',
      'What is in the green box?|📦', 'You can play a game.|🎮', 'The little cake is for me.|🍰'],
    4: ['the cow is in the barn .|🐄', 'the mouse ran into the house .|🐭🏠',
      'can you see the star ?|⭐', 'the boy found a toy car .|👦🚗|a boy found the toy car .',
      'a cloud is in the sky .|☁️|the cloud is in a sky .', 'the owl hoots at night .|🦉🌃',
      'where is the dog ?|🐶', 'my cat likes to sleep .|🐱😴',
      'did the bird fly away ?|🐦', 'the girl has a red shirt .|👧👕|a girl has the red shirt .',
      'we went to the farm .|🚜', 'is the light on ?|💡'],
    5: ['the dragon flew over the garden .|🐉🌷',
      'a rabbit is hiding in the basket .|🐰🧺|the rabbit is hiding in a basket .',
      'my kitten likes to chase butterflies .|🐈🦋', 'the rocket zoomed into space .|🚀',
      'have you seen my umbrella ?|☂️', 'the elephant ate my sandwich .|🐘🥪',
      'a crocodile swam under the bridge .|🐊🌉|the crocodile swam under a bridge .',
      'why is the monster so happy ?|👾', 'the dinosaur stomped through the forest .|🦕🌲',
      'it was snowing all winter .|⛄|all winter it was snowing .',
      'we baked muffins for her birthday .|🧁🎂|for her birthday we baked muffins .',
      'can chickens really fly ?|🐔']
  };

  /* Tricky words: common words that break the phonics rules, learnt by sight.
     Kept apart from the phonics bank so they never confuse the sound games. */
  PH.TRICKY = {
    1: ['the', 'to', 'I', 'no', 'go', 'into', 'is', 'he', 'she', 'we', 'me', 'be', 'my', 'you', 'was', 'of'],
    2: ['they', 'all', 'are', 'said', 'have', 'like', 'so', 'do', 'some', 'come', 'were', 'there', 'little', 'one', 'what', 'out'],
    3: ['door', 'floor', 'poor', 'because', 'find', 'kind', 'child', 'wild', 'most', 'only', 'both', 'old', 'every', 'great', 'pretty', 'after', 'father', 'who'],
    4: ['beautiful', 'water', 'again', 'half', 'money', 'busy', 'people', 'whole', 'any', 'many', 'clothes', 'sure', 'sugar', 'eye', 'hour', 'move', 'could', 'should'],
    5: ['actually', 'answer', 'believe', 'breath', 'build', 'caught', 'certain', 'different', 'early', 'enough', 'eight', 'heard', 'heart', 'island', 'minute', 'often', 'promise', 'question', 'though', 'through', 'weight', 'women']
  };

  PH.LEVELS = [
    { id: -1, name: 'Tiny Tots · Pictures', focus: 'Listening, matching, rhymes and clapping', mode: 'pictures', words: PICTURES },
    { id: 0, name: 'Little Letters', focus: 'Letter shapes and the sounds they make', mode: 'letters', words: LETTERS }
  ].concat(RAW.map(function (lv) {
    return { id: lv.id, name: lv.name, focus: lv.focus, words: parse(lv.words, lv.id) };
  }));

  /* every reading word from level 1 up to and including `id`; the pre-reader levels
     stand alone so pictures and letters never leak into the reading games */
  PH.wordsUpTo = function (id) {
    var out = [];
    PH.LEVELS.forEach(function (lv) {
      var take = id >= 1 ? (lv.id >= 1 && lv.id <= id) : lv.id === id;
      if (take) { out = out.concat(lv.words); }
    });
    return out;
  };

  PH.levelById = function (id) {
    return PH.LEVELS.filter(function (l) { return l.id === id; })[0] ||
      PH.LEVELS.filter(function (l) { return l.id === 1; })[0];
  };

  /* age -> starting level */
  PH.levelForAge = function (age) {
    var map = { 3: -1, 4: 0, 5: 1, 6: 2, 7: 3, 8: 4, 9: 5 };
    return map.hasOwnProperty(age) ? map[age] : 1;   /* not `|| 1`: level 0 is a real level */
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

  /* Real words from `pool` to sit beside `word` as the wrong answers, the most alike
     first. Put "pencil" among words that start with other letters and a child finds it
     by its p without reading any further; beside "pig" and "pan" the whole word has to
     be read. So a shared first sound counts for most, then a shared ending, then the
     same length. A little chance mixes up the order, so equally good choices take
     turns. Single letters have nothing to compare, and come back in any order. */
  PH.lookAlikes = function (word, pool, n) {
    var first = PH.firstSound(word), last = PH.lastSound(word);
    return pool
      .filter(function (w) { return w.w !== word.w; })
      .map(function (w) {
        var score = Math.random() * 1.5;
        if (!word.letter) {
          if (PH.firstSound(w) === first) { score += 4; }
          else if (w.w.charAt(0) === word.w.charAt(0)) { score += 3; }
          if (w.rime === word.rime) { score += 2; }
          else if (PH.lastSound(w) === last) { score += 1.5; }
          if (Math.abs(w.w.length - word.w.length) <= 1) { score += 1; }
        }
        return { w: w, score: score };
      })
      .sort(function (a, b) { return b.score - a.score; })
      .slice(0, n)
      .map(function (s) { return s.w; });
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
