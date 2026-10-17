/* Builds the Phonics Playground feedback form in your own Google account.
 *
 * Google Forms cannot import a file, but a Google Apps Script can build a form, so this
 * is the "import":
 *
 *   1. Go to https://script.google.com and click "New project".
 *   2. Delete what is in the editor, paste in this whole file, and save.
 *   3. Pick makeFeedbackForm in the function list at the top and click Run.
 *   4. Google asks you to allow the script to manage your forms - allow it (it is your
 *      own script, in your own account).
 *   5. Open the "Execution log": it prints a link to edit the form and the short link
 *      to share. Put the short link in js/main.js as FEEDBACK_FORM.
 *
 * Running it again makes a second, separate form; it never changes one already made.
 *
 * The form asks the grown-up about the problem or idea and never about the child: no
 * name, no school, and an email only if the grown-up wants a reply.
 *
 * The first question decides what comes next:
 *   Something isn't working    -> the bug questions
 *   A word, sound or picture   -> which word and what was wrong
 *   An idea                    -> the idea
 *   General comment            -> how it is going
 * and every path ends on the same optional "reply" page.                              */

var GAMES = [
  'Find Them All', 'Claw Machine', 'Sound Pop', 'Feed the Monster', 'Rhyme Rockets',
  'Sound Fishing', 'Octopus Treasure Hunt', 'Hungry Octopus', 'The Floor is Lava',
  'Pilot Wings', 'Penalty Kick', "Don't Wake the Giant", 'Stack the Snack', 'Leaky Pipes',
  'Space Jumper', "Wizard's Spellbook", 'Comet Trails', 'Stretchy Snail', 'Story Time',
  'Frog Hop', 'Whack-a-Mole', 'Sentence Train', 'Letter Dash', 'Quick Words',
  'Alien Names', 'Maze Path', 'Practice Minute', 'The whole app', 'Not sure'
];

function makeFeedbackForm() {
  var form = FormApp.create('Phonics Playground feedback');
  form.setDescription('Thanks for playing! This form is for grown-ups. Tell us what is ' +
    'working, what is not, or what you would like to see next.');
  form.setCollectEmail(false);
  form.setProgressBar(false);
  form.setConfirmationMessage('Thank you! Every message is read.');

  /* ---- page 1: what kind of message ---- */
  var kind = form.addMultipleChoiceItem()
    .setTitle('What would you like to tell us?')
    .setRequired(true);

  /* ---- page 2: something isn't working ---- */
  var bugPage = form.addPageBreakItem()
    .setTitle('Sorry about that!')
    .setHelpText('Tell us what went wrong and we will try to fix it.');
  gameQuestion(form, true);
  form.addParagraphTextItem()
    .setTitle('What happened?')
    .setHelpText('What did you expect, and what happened instead?')
    .setRequired(true);
  form.addMultipleChoiceItem()
    .setTitle('What were you using?')
    .setChoiceValues(['iPad or tablet', 'Phone', 'Chromebook or laptop', 'Desktop computer'])
    .showOtherOption(true);
  form.addMultipleChoiceItem()
    .setTitle('Which browser?')
    .setChoiceValues(['Safari', 'Chrome', 'Edge', 'Firefox', "Don't know"])
    .showOtherOption(true);
  form.addMultipleChoiceItem()
    .setTitle('Did the sound work?')
    .setChoiceValues(['Yes', 'No sound at all', 'Some sounds were wrong or missing']);

  /* ---- page 3: a word, sound or picture is wrong ---- */
  var wordPage = form.addPageBreakItem()
    .setTitle('A word, sound or picture is wrong')
    .setHelpText('Thank you for spotting it.');
  gameQuestion(form, true);
  form.addParagraphTextItem()
    .setTitle('Which word, sound or picture, and what was wrong with it?')
    .setHelpText('For example: "In Stretchy Snail the word ship sounded like sip."')
    .setRequired(true);

  /* ---- page 4: an idea ---- */
  var ideaPage = form.addPageBreakItem()
    .setTitle('We love ideas')
    .setHelpText('A new game, a change to one, more words - anything.');
  form.addParagraphTextItem()
    .setTitle('What is your idea?')
    .setRequired(true);
  gameQuestion(form, false);

  /* ---- page 5: a general comment ---- */
  var generalPage = form.addPageBreakItem()
    .setTitle('How is it going?');
  form.addParagraphTextItem()
    .setTitle('Your message')
    .setRequired(true);
  form.addScaleItem()
    .setTitle('How much does your child enjoy it?')
    .setBounds(1, 5)
    .setLabels('Not much', 'Loves it');
  form.addMultipleChoiceItem()
    .setTitle('Has it helped with reading?')
    .setChoiceValues(['Yes, a lot', 'A little', 'Too early to tell', 'Not really']);
  form.addMultipleChoiceItem()
    .setTitle('Are you using it to get ready for school reading checks such as DIBELS?')
    .setChoiceValues(['Yes', 'No', "What's DIBELS?"]);
  form.addCheckboxItem()
    .setTitle('Which games does your child like most?')
    .setChoiceValues(GAMES.slice(0, GAMES.length - 2));      /* the games, without the catch-alls */

  /* ---- page 6: a reply, if wanted (every path ends here) ---- */
  var replyPage = form.addPageBreakItem()
    .setTitle('Would you like a reply?')
    .setHelpText('Optional.');
  form.addMultipleChoiceItem()
    .setTitle("Child's age")
    .setChoiceValues(['3', '4', '5', '6', '7', '8', '9 or older']);
  form.addMultipleChoiceItem()
    .setTitle('Which level were they playing?')
    .setChoiceValues(['Tiny Tots', 'Little Letters', 'Level 1', 'Level 2', 'Level 3',
      'Level 4', 'Level 5', 'Not sure']);
  form.addTextItem()
    .setTitle('Your email, if you would like a reply')
    .setHelpText('Only used to answer this message.')
    .setValidation(FormApp.createTextValidation().requireTextIsEmail().build());

  /* The first question sends each answer to its own page. */
  kind.setChoices([
    kind.createChoice("Something isn't working", bugPage),
    kind.createChoice('A word, sound or picture is wrong', wordPage),
    kind.createChoice('An idea for a game or feature', ideaPage),
    kind.createChoice('My child loves it / general comment', generalPage)
  ]);

  /* A page break's "go to" sets where the page BEFORE it leads. Without these, someone
     reporting a bug would carry on into the word, idea and comment pages. The comment
     page already runs straight on into the reply page, which comes next. */
  wordPage.setGoToPage(replyPage);       /* end of the bug page     -> reply */
  ideaPage.setGoToPage(replyPage);       /* end of the word page    -> reply */
  generalPage.setGoToPage(replyPage);    /* end of the idea page    -> reply */

  Logger.log('Edit the form:  ' + form.getEditUrl());
  Logger.log('Share this link (put it in js/main.js as FEEDBACK_FORM):  ' + form.shortenFormUrl(form.getPublishedUrl()));
}

/* "Which game is this about?" - asked on more than one page */
function gameQuestion(form, required) {
  form.addListItem()
    .setTitle('Which game is this about?')
    .setChoiceValues(GAMES)
    .setRequired(required);
}
