# Phonics Playground

Twenty listening-and-reading games for children aged 3 to 9. Plain HTML, CSS and
JavaScript: no build step, no frameworks, no asset files, no network calls.

## Playing

Open `index.html` in any modern browser. It works straight from the file system,
so it can be copied onto a tablet or a memory stick and used offline.

Pick an age on the front page to set the phonics level, then pick a game. The
level can be nudged up or down with the **change level** button.

## The games

| Game | What the child does | Skill |
| --- | --- | --- |
| Find Them All | Hears a word, taps every copy drifting in the meadow | Whole word recognition under distraction |
| Claw Machine | Steers a claw to the capsule holding the spoken word | Reading to choose, with a reward loop |
| Sound Pop | Pops only the bubbles whose word contains a target sound | Hearing a sound inside a word |
| Feed the Monster | Builds the spoken word from sound chunks, in order | Segmenting and spelling |
| Rhyme Rockets | Flies to the planet whose word rhymes | Rhyme and word families |
| Sound Fishing | Hooks the fish showing the first or last sound of a word | Isolating onsets and codas |
| Octopus Treasure Hunt | Picks the chest with the spoken word from look-alikes like lip, zip, cip | Careful letter-by-letter decoding |
| The Floor is Lava | Hops stone to stone over lava by tapping the word it hears | Fast recognition, with a goal to reach |
| Pilot Wings | Flies through the ring holding the sound missing from a word | Which spelling makes which sound |
| Word Munchers | Walks a grid munching every word that fits a rule, dodging the Troggle | Sorting by sound, first sound or rhyme |
| Penalty Kick | Counts the sounds in a word, kicks at that number | Segmenting sounds; claps (syllables) at level 5 |
| Don't Wake the Giant | Slides a pillow to catch falling words that fit a rule before they crash | Sorting by sound, first sound or rhyme, under time pressure |
| Burger Time | Sends a chef up ladders to stomp sound chunks onto the burger in order | Building a word sound by sound |
| Leaky Pipes | Hears a word only as separate sounds, then fixes the leak showing it | Blending sounds into a word |
| Space Jumper | Runs and jumps through a space platformer, head-bumping the block with the spoken word to open each star gate | Word recognition, in a Mario-style level |
| Wizard's Spellbook | Reads a spell card with no voice help, then taps the picture it means; older children read short phrases | Independent reading for meaning |
| Comet Trails | Drags a comet along a dotted letter in the right order and direction | Letter formation (handwriting) |
| Frog Hop | Changes one sound to turn one word into the next (cat, hat, hot, dot) to hop up to a fly | Swapping sounds within a word |
| Whack-a-Mole | Bonks the mole holding the tricky word it hears; moles speed up with a streak | Sight words that break the phonics rules |
| Sentence Train | Hooks word carriages onto an engine in order to build a sentence, then watches it chug away | Word order, capital letters and full stops |

Sentence Train keeps a count of carriages earned in the browser, and the menu card
shows the child's train growing. At ages 8 and 9 the sentence is not read aloud:
the words are lower case, the first one gets its capital as it couples on, and
the child chooses between a full stop and a question mark caboose.

Space Jumper plays with the arrow keys and space, with the on-screen buttons, or
by tapping a block, which sends the astronaut to run over and bump it. At the
pre-reader levels there are no gaps or aliens.

Every game gives a star per correct answer and never fails the child: a wrong
tap wobbles and gives a hint, then play continues. The Troggle in Word Munchers
only bumps the Muncher back to the start, and it does not appear at level 1.

Octopus Treasure Hunt makes up look-alike words by swapping one letter. Every
made-up word is checked against a blocklist in `js/words.js` so a swap can never
put a rude or hurtful word in front of a child.

## Levels

The age buttons pick a starting level: 3 is Tiny Tots, 4 is Little Letters, 5 is
Level 1, and so on up to 9. **change level** steps through all seven.

- **Tiny Tots (age 3)** - pictures with the word printed underneath. No reading needed:
  listening and matching, rhymes heard aloud, sorting into animals, food and things that
  go, clapping syllables, and blending by ear ("ba... na... na").
- **Little Letters (age 4)** - single lowercase letters, always spoken as name, sound and
  keyword ("b... buh... like bear"). First sounds, letter matching and first spelling.

Each game keeps its look but changes its task at these two levels. For example, Feed
the Monster asks for one picture or letter instead of a spelled word, and Burger Time
takes a picture order at age 3. Penalty Kick counts claps instead of sounds.
Choices are fewer and everything moves more slowly.

1. **Sounding Out** - three letter words, `c-a-t`
2. **Two Letters, One Sound** - `sh`, `ch`, `th`, `ck` and blends
3. **Long Vowels** - magic e and vowel teams
4. **Tricky Teams** - `ar`, `or`, `ir`, `ur`, `igh`, `ow`, `ou`, `oi`, `aw`
5. **Big Words** - two and three syllable words, clapped out

## Sound

Words are spoken with the browser's built-in speech synthesis, so no audio files
are needed. The voice varies by device: use the **Voice** button on the front
page to cycle through the installed English voices and keep the clearest one.
The **Sound** button mutes everything. If a browser has no voice installed, the
games still work and the word is shown instead.

Sound effects are generated with the Web Audio API.

## Layout of the code

```
index.html          menu, heads-up display, results overlay
css/style.css
js/words.js         the word bank, graded into five levels
js/audio.js         speech synthesis wrapper and generated sound effects
js/engine.js        canvas fitting, input, game loop, particles, scoring
js/rules.js         shared "find every word that ..." rules
js/strokes.js       how each letter is written, stroke by stroke
js/main.js          menu and wiring
js/games/*.js       one file per game
```

A game is an object with `create(api)` returning `{ update, draw, down, key }`.
The `api` passed in carries the level's words, the speech helpers, the star
counter and the particle system, so a new game only has to draw itself and
answer taps.

## Adding words

Each entry in `js/words.js` is `word|chunks|rime`, where the chunks are what a
child sounds out and the rime is optional:

```
'ship|sh.i.p'          -> sh + i + p, rime "ip"
'cake|c.a.k.e|ake'     -> magic e, rime given because it cannot be derived
'rabbit|rab.bit|abbit' -> level 5 chunks are syllables
```

## Other word lists

`js/words.js` also holds pictures for the reading words (used by Wizard's
Spellbook), phrase parts for the oldest Spellbook levels, and the tricky words
for Whack-a-Mole, and the sentences for Sentence Train (with any other fair word
order listed beside each one). Tricky words are kept apart from the phonics bank on purpose,
because they break the sound rules the other games rely on.
