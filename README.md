# Phonics Playground

Six listening-and-reading games for children aged 4 to 9. Plain HTML, CSS and
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

Every game runs six rounds, gives a star per correct answer, and never fails the
child: a wrong tap wobbles and gives a hint, then play continues.

## Levels

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
