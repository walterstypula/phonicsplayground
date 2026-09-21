/* Phonics Playground - menu and wiring */
(function (PH) {
  'use strict';

  var ORDER = ['wordhunt', 'claw', 'bubbles', 'builder', 'rhyme', 'fishing',
    'octopus', 'lava', 'pilot', 'munchers', 'soccer', 'giant', 'burger', 'pipes', 'space',
    'wizard', 'tracing', 'snail', 'ladder', 'moles', 'train'];
  var $ = function (id) { return document.getElementById(id); };

  var dom = {
    menu: $('menu'), play: $('play'), cards: $('cards'), ages: $('ages'),
    levelNote: $('level-note'), promptText: $('prompt-text'), peek: $('btn-peek'),
    progress: $('progress'), stars: $('stars'), results: $('results'),
    resultsTitle: $('results-title'), resultsStars: $('results-stars'), resultsSub: $('results-sub')
  };

  var state = {
    age: parseInt(localStorage.getItem('ph-age'), 10) || 5,
    levelId: 1,
    current: null,
    soundOn: localStorage.getItem('ph-sound') !== 'off'
  };

  /* ---------- menu ---------- */
  function renderAges() {
    dom.ages.innerHTML = '';
    [3, 4, 5, 6, 7, 8, 9].forEach(function (age) {
      var b = document.createElement('button');
      b.className = 'age';
      b.textContent = age;
      b.setAttribute('aria-pressed', age === state.age ? 'true' : 'false');
      b.addEventListener('click', function () {
        state.age = age;
        localStorage.setItem('ph-age', String(age));
        state.levelId = PH.levelForAge(age);
        PH.sfx.warmUp();
        PH.sfx.click();
        renderAges();
        renderLevelNote();
      });
      dom.ages.appendChild(b);
    });
  }

  function renderLevelNote() {
    var lv = PH.levelById(state.levelId);
    dom.levelNote.innerHTML = 'Playing <b>' + lv.name + '</b> &mdash; ' + lv.focus +
      ' &nbsp;<button class="mini" id="btn-level">change level</button>';
    $('btn-level').addEventListener('click', function () {
      var ids = PH.LEVELS.map(function (l) { return l.id; });
      state.levelId = ids[(ids.indexOf(state.levelId) + 1) % ids.length];
      PH.sfx.click();
      renderLevelNote();
    });
  }

  /* a little extra line on some cards: the child's own growing train */
  function extraFor(id) {
    if (id !== 'train' || !PH.trainCars) { return ''; }
    var n = PH.trainCars();
    if (!n) { return '<span class="train-line">Your train is waiting for its first carriage!</span>'; }
    var shown = Math.min(n, 10);
    return '<span class="train-line">🚂' + new Array(shown + 1).join('🚃') +
      (n > shown ? ' +' + (n - shown) : '') + '</span>';
  }

  function renderCards() {
    dom.cards.innerHTML = '';
    ORDER.forEach(function (id, i) {
      var g = PH.games[id];
      if (!g) { return; }
      var b = document.createElement('button');
      b.className = 'card c' + (i % 6);
      b.innerHTML = '<span class="icon">' + g.icon + '</span>' +
        '<span class="name">' + g.name + '</span>' +
        '<span class="blurb">' + g.blurb + '</span>' + extraFor(id);
      b.addEventListener('click', function () { startGame(id); });
      dom.cards.appendChild(b);
    });
  }

  /* ---------- play ---------- */
  function startGame(id) {
    PH.sfx.warmUp();
    PH.sfx.click();
    state.current = id;
    dom.menu.classList.add('hidden');
    dom.play.classList.remove('hidden');
    /* the canvas only has a real size once the section is visible */
    requestAnimationFrame(function () {
      PH.Engine.start(PH.games[id], PH.levelById(state.levelId));
    });
  }

  function toMenu() {
    PH.Engine.stop();
    dom.results.classList.add('hidden');
    dom.play.classList.add('hidden');
    dom.menu.classList.remove('hidden');
    renderCards();   /* the Sentence Train card shows carriages earned so far */
  }

  /* ---------- buttons ---------- */
  $('btn-back').addEventListener('click', toMenu);
  $('btn-menu').addEventListener('click', toMenu);
  $('btn-again').addEventListener('click', function () {
    dom.results.classList.add('hidden');
    PH.Engine.start(PH.games[state.current], PH.levelById(state.levelId));
  });
  $('btn-say').addEventListener('click', function () { PH.Engine.repeat(); });
  dom.peek.addEventListener('click', function () { PH.Engine.peek(); });

  $('btn-sound').addEventListener('click', function () {
    state.soundOn = !state.soundOn;
    localStorage.setItem('ph-sound', state.soundOn ? 'on' : 'off');
    PH.setAudioEnabled(state.soundOn);
    this.textContent = state.soundOn ? '🔊 Sound: on' : '🔇 Sound: off';
    this.setAttribute('aria-pressed', String(state.soundOn));
  });

  /* ---------- the voice picker ----------
     The list of voices usually turns up a moment after the page does, so the picker is
     drawn whenever it changes as well as once at the start. */
  function renderVoices() {
    var sel = $('voice-select');
    var list = PH.speech.voices();
    var now = PH.speech.voice();
    if (!list.length) {
      sel.innerHTML = '<option>No voices installed</option>';
      sel.disabled = true;
      $('btn-voice-prev').disabled = $('btn-voice-next').disabled = true;
      return;
    }
    sel.disabled = false;
    $('btn-voice-prev').disabled = $('btn-voice-next').disabled = list.length < 2;
    sel.innerHTML = list.map(function (v) {
      return '<option value="' + v.name.replace(/"/g, '&quot;') + '">' + v.label + '</option>';
    }).join('');
    if (now) { sel.value = now.name; }
  }

  $('voice-select').addEventListener('change', function () {
    PH.sfx.warmUp();
    PH.speech.setVoice(this.value);
  });
  $('btn-voice-prev').addEventListener('click', function () {
    PH.sfx.warmUp();
    var v = PH.speech.stepVoice(-1);
    if (v) { $('voice-select').value = v.name; }
  });
  $('btn-voice-next').addEventListener('click', function () {
    PH.sfx.warmUp();
    var v = PH.speech.stepVoice(1);
    if (v) { $('voice-select').value = v.name; }
  });
  PH.speech.onVoicesChanged(renderVoices);

  /* ---------- boot ---------- */
  state.levelId = PH.levelForAge(state.age);
  PH.setAudioEnabled(state.soundOn);
  $('btn-sound').textContent = state.soundOn ? '🔊 Sound: on' : '🔇 Sound: off';
  renderAges();
  renderLevelNote();
  renderCards();
  renderVoices();
  PH.Engine.init($('canvas'), dom);

  if (!PH.speech.supported) {
    dom.levelNote.insertAdjacentHTML('beforeend',
      '<br><small>This browser has no speech voice, so words are shown instead of spoken.</small>');
  }

})(window.PH = window.PH || {});
