/* Phonics Playground - sorting rules shared by games that ask "find every word that ..."
   PH.rules.pick(api, usedKeys, verb) returns
   { key, label, show, anchor, source, test(word), say() }                                   */
(function (PH) {
  'use strict';

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function soundRule(api, verb) {
    var bySpelling = api.level.id === 5;
    var sounds = bySpelling
      ? ['er', 'et', 'un', 'in']
      : PH.soundsFor(api.level, 5).filter(function (s) { return s.length > 1 || api.level.id <= 2; });
    if (!sounds.length) { sounds = PH.soundsFor(api.level, 5); }
    if (!sounds.length) { return null; }
    var s = pick(sounds);
    return {
      key: 'sound:' + s, label: verb + ' words with', show: s, source: api.words,
      test: function (w) { return bySpelling ? w.w.indexOf(s) >= 0 : PH.soundGraphemes(w).indexOf(s) >= 0; },
      say: function () {
        api.say(verb + ' the words with the sound');
        api.say(PH.soundHint(s), { rate: 0.55, queue: true });
      }
    };
  }

  function startRule(api, verb) {
    var counts = {};
    api.words.forEach(function (w) { var f = PH.firstSound(w); counts[f] = (counts[f] || 0) + 1; });
    var opts = Object.keys(counts).filter(function (k) { return counts[k] >= 4; });
    if (!opts.length) { return null; }
    var s = pick(opts);
    return {
      key: 'start:' + s, label: verb + ' words starting with', show: s, source: api.words,
      test: function (w) { return PH.firstSound(w) === s; },
      say: function () {
        api.say(verb + ' the words that start with');
        api.say(PH.soundHint(s), { rate: 0.55, queue: true });
      }
    };
  }

  function rhymeRule(api, verb) {
    var all = PH.wordsUpTo(api.level.id);
    var fam = {};
    all.forEach(function (w) { (fam[w.rime] = fam[w.rime] || []).push(w); });
    var opts = Object.keys(fam).filter(function (k) { return fam[k].length >= 4; });
    if (!opts.length) { return null; }
    var r = pick(opts);
    var anchor = pick(fam[r]);
    return {
      key: 'rhyme:' + r, label: verb + ' words that rhyme with', show: anchor.w, anchor: anchor.w, source: all,
      test: function (w) { return w.rime === r && w.w !== anchor.w; },
      say: function () {
        api.say(verb + ' the words that rhyme with');
        api.sayWord(anchor.w, { queue: true });
      }
    };
  }

  PH.rules = {
    /* a rule not in `used`, trying each kind in random order */
    pick: function (api, used, verb) {
      used = used || [];
      var makers = PH.util.shuffle([soundRule, startRule, rhymeRule]);
      for (var i = 0; i < makers.length; i++) {
        for (var tries = 0; tries < 6; tries++) {
          var r = makers[i](api, verb);
          if (r && used.indexOf(r.key) < 0) { return r; }
        }
      }
      return soundRule(api, verb) || startRule(api, verb);
    },

    /* words that break the rule, for use as distractors */
    nonMatches: function (api, rule) {
      return api.words.filter(function (w) { return !rule.test(w) && w.w !== rule.anchor; });
    }
  };

})(window.PH = window.PH || {});
