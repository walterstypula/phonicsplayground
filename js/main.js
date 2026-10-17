/* Phonics Playground - menu and wiring */
(function (PH) {
  'use strict';

  var ORDER = ['wordhunt', 'claw', 'bubbles', 'builder', 'rhyme', 'fishing',
    'octopus', 'hungry', 'lava', 'pilot', 'soccer', 'giant', 'sandwich', 'pipes', 'space',
    'wizard', 'tracing', 'snail', 'story', 'ladder', 'moles', 'train',
    /* practice for the DIBELS 8 reading screening schools give */
    'letterdash', 'quickwords', 'alien', 'maze', 'practice'];
  var $ = function (id) { return document.getElementById(id); };

  /* Where a parent or teacher can reach the developer: a Google Form, so no email address
     sits on the page for spam robots to collect. The link stays hidden until this is set.
     Paste the form's "Send" link here (Send > link icon in the form editor). */
  var FEEDBACK_FORM = 'https://forms.gle/Bf5ckkmsLLLiYdTP6';

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

  /* ---------- the grown-ups check ----------
     The feedback button is on every screen, so a child will tap it. Before anything
     leaves the game, a grown-up answers a sum written out in words - "What is fourteen
     times seven?" - which takes an adult a moment and a child who cannot read the words
     no time at all to give up on. A new sum every time, so it cannot be learnt. */
  var TEENS = ['twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  var ONES = ['three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  var gateAnswer = 0;

  function askGrownUp(note) {
    var a = Math.floor(Math.random() * TEENS.length), b = Math.floor(Math.random() * ONES.length);
    gateAnswer = (a + 12) * (b + 3);
    $('gate-q').textContent = 'What is ' + TEENS[a] + ' times ' + ONES[b] + '?';
    $('gate-msg').textContent = note || '';
    $('gate-answer').value = '';
    $('gate').classList.remove('hidden');
    $('gate-answer').focus();
  }

  function closeGate() { $('gate').classList.add('hidden'); }

  function openFeedback() {
    PH.sfx.click();
    PH.speech.cancel();
    askGrownUp();
  }
  $('btn-feedback').addEventListener('click', openFeedback);
  $('btn-feedback-play').addEventListener('click', openFeedback);
  $('gate-cancel').addEventListener('click', closeGate);
  $('gate').addEventListener('click', function (e) { if (e.target === this) { closeGate(); } });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('gate').classList.contains('hidden')) { closeGate(); }
  });
  $('gate-form').addEventListener('submit', function (e) {
    e.preventDefault();
    if (parseInt($('gate-answer').value, 10) === gateAnswer) {
      closeGate();
      window.open(FEEDBACK_FORM, '_blank', 'noopener');
    } else {
      askGrownUp('Not quite - here is another one.');
    }
  });

  /* ---------- boot ---------- */
  state.levelId = PH.levelForAge(state.age);
  PH.setAudioEnabled(state.soundOn);
  $('btn-sound').textContent = state.soundOn ? '🔊 Sound: on' : '🔇 Sound: off';
  if (FEEDBACK_FORM) {
    $('btn-feedback').hidden = false;
    $('btn-feedback-play').hidden = false;
  }
  renderAges();
  renderLevelNote();
  renderCards();
  PH.Engine.init($('canvas'), dom);

  if (!PH.speech.supported) {
    dom.levelNote.insertAdjacentHTML('beforeend',
      '<br><small>This browser has no speech voice, so words are shown instead of spoken.</small>');
  }

  /* Opened straight off the disk everything plays, but the sounds arrive one after
     another instead of running into each other - and running into each other is the
     whole of blending. Better to say so than to let a grown-up conclude the game simply
     sounds like that. */
  if (location.protocol === 'file:') {
    dom.levelNote.insertAdjacentHTML('beforeend',
      '<br><small>Opened from a folder, so the sounds play one at a time rather than ' +
      'blending. Run <code>tools/serve.ps1</code> and open ' +
      '<code>http://localhost:5173</code> to hear them blended.</small>');
  }

})(window.PH = window.PH || {});
