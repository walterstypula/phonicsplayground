# Recordings

The games speak with the device's own voice unless a recording exists here. A device
voice is fine for whole words but cannot say a single sound on its own: asked for the
"s" in "seed" it says something like "suh". Children learn to blend from these sounds,
so they are the recordings that matter most.

## The sounds that ship with the game

`sounds/` holds all 43 sounds the games use, spoken by the Azure voice `en-US-AvaNeural`
and made by `tools/make-sounds-azure.ps1`. Given ordinary text a voice says "suh" for s;
given the sound as a phonetic symbol it says just the sound. The script stretches the
sounds that can be held, keeps t, p, k and friends short, trims each clip and evens out
the volume. Making them needs an Azure Speech key in your own environment (`SPEECH_KEY`
and `SPEECH_REGION`); the game itself never calls a service, it only plays these files.

```
powershell -ExecutionPolicy Bypass -File tools/make-sounds-azure.ps1
powershell -ExecutionPolicy Bypass -File tools/make-sounds-azure.ps1 -Only s,z,f
```

Not every voice can say a bare sound. The conversational "HD" voices treat a phonetic
symbol as a hint and say the letter's name instead: asked for /s/ they answer "ess", and
/t/ comes back as "tuh", which is the one thing that stops a child blending. To hear
what a voice really does before trusting it with all 41, write a few somewhere else:

```
powershell -ExecutionPolicy Bypass -File tools/make-sounds-azure.ps1 -Only s,t,ee,sh -OutDir audio\_compare -Tag test
```

`tools/make-sounds.ps1` does the same job offline with the voices built into Windows. It
needs no key and no network, but David and Zira sound robotic next to a neural voice.

These are clean, even sounds, but a real person still sounds warmer. A recording saved
under the same name (say `sounds/ee.mp3`) replaces the generated `ee.wav`: the scripts
prefer a `.wav` they just made, so delete it when you add your own.

## How to add a recording

1. Save it as an `.mp3` in `sounds/` or `words/`, named exactly as below.
2. Add its name to the list in `clips.js` (the browser cannot look inside this folder
   by itself when the game is opened from a file).

```
sounds/ee.mp3      ->  sounds: [..., 'ee.mp3', ...]
words/seed.mp3     ->  words:  ['seed.mp3']
```

Anything missing is simply spoken by the device voice, so recordings can be added a few
at a time.

## The 43 sounds (American English)

Record each sound **on its own**, short and clean. Stretch the sounds that can be held
(`sss`, `mmm`, `fff`, `shhh`, vowels). Keep the "stop" sounds (`b`, `d`, `g`, `k`, `p`,
`t`) crisp, with **no "uh" after them**: a clipped /t/, not "tuh". Adding "uh" is the
most common mistake, and it is what makes blending hard ("tuh-a-puh" does not blend to "tap").

| File | Sound as in | File | Sound as in | File | Sound as in |
| --- | --- | --- | --- | --- | --- |
| `b` | **b**at | `r` | **r**un | `i` | s**i**t |
| `d` | **d**og | `s` | **s**un | `o` | h**o**t |
| `f` | **f**an | `t` | **t**op | `u` | c**u**p |
| `g` | **g**oat | `v` | **v**an | `ay` | r**ai**n, c**a**ke |
| `h` | **h**at | `w` | **w**eb | `ee` | s**ee**d, m**e** |
| `j` | **j**am | `y` | **y**es | `igh` | n**igh**t, b**i**ke |
| `k` | **k**ite, **c**at, du**ck** | `z` | **z**ip | `oh` | b**oa**t, h**o**me |
| `l` | **l**eg | `kw` | **qu**een | `yoo` | c**u**be |
| `m` | **m**ap | `ks` | bo**x** | `oo` | m**oo**n |
| `n` | **n**et | `sh` | **sh**ip | `ow` | c**ow**, **ou**t |
| `p` | **p**ig | `ch` | **ch**ip | `oi` | c**oi**n, b**oy** |
| `a` | c**a**t | `th` | **th**in | `aw` | s**aw** |
| `e` | b**e**d | `ng` | ri**ng** | `ar` | c**ar** |
| | | `dh` | **th**at, **th**is | `or` | f**or**k |
| | | | | `er` | h**er**, b**ir**d, f**ur** |
| | | | | `uu` | b**oo**k, f**oo**t |

The same list lives in `PH.SOUNDS` in `js/audio.js`.

Two pairs look alike on the page and are not: `th` is the quiet one in "thin", `dh` the
buzzing one in "that"; `oo` is the long one in "moon", `uu` the short one in "book". One
spelling, two sounds, and nothing in the letters says which - so the handful of words in
the bank that need it are listed in `WORD_SOUNDS` in `js/audio.js`, where each says what
it sounds like. Same for the `s` of "nose", which says /z/. Add a word there when it is
sounded out wrongly; there is no rule to fix instead.

`SOUND_OUT`, in the same file, does the same job for the blending games, which need a
word broken all the way down into its sounds - `b ea=e r` for "bear", `a pp le=ul` for
"apple". It is written as the letters a child sees, each with the sound it makes where
that is not the usual one, and `-` where the letters are silent. Most words need no
entry: the rules get them right, and the word bank's own split covers the rest.

The three stops `b`, `d` and `g` are recorded as a burst plus about a tenth of a second
of the release after it. That tail is not sloppiness - the bursts of the three are nearly
alike, and what tells them apart is the way the release bends out of them. Cut it off and
all three collapse into the same click.

## Which format goes where, and why

Three folders, three formats. The rule is not about how important a clip is, it is about
**whether the clip gets blended into another one**, and the answer decides everything.

| folder | what is in it | format | why that one |
| --- | --- | --- | --- |
| `sounds/` | the 43 single sounds | 48 kHz wav | blended, and all high-frequency detail |
| `words/` | syllables the long words split into | 24 kHz wav | blended |
| `spoken/` | whole words, phrases, sentences | 24 kHz mp3, 48 kbps | played on their own |

**Why the blended ones stay uncompressed.** Every mp3 decoder inserts about 1,152 samples
of padding at the start of the file. Play a clip on its own and nobody will ever notice.
Overlap it with the one before, which is the whole of blending, and that padding is a gap
at every join - the exact thing the blending exists to remove. Keeping them as PCM avoids
the problem rather than working around it.

**Why `sounds/` alone stays at 48 kHz.** An s, an f and a th are almost entirely above
5 kHz, and they are heard alone, with no word around them to make them out from. Nothing
else here needs that: a syllable or a word carries its own context.

**Why `spoken/` is compressed.** These are never blended, so the padding does not matter,
and they are far the bulk of the audio - 596 clips against 176. As wav they were 34 MB;
as mp3 they are around 4 MB. The reason to care is not a tidy repository, it is that a
tablet fetches a clip the first time it is needed, and 54 KB on slow wifi is a child
waiting mid-game where 7 KB is not.

Formats that were measured and turned down: **Ogg Opus** is the better codec but Azure
gives no control of its bitrate, so what actually arrives is *larger* than the mp3 (17.2 KB
against 12.8 KB for the same sentence), and Safari only learned to play Ogg recently, so
an older iPad would get silence. **FLAC** and **AAC** both need ffmpeg installed and buy
little. Anything below 24 kHz or 48 kbps starts to be audible.

Only `sounds/` and `words/` go through the trim-and-level pass in the generator, because
an mp3 cannot be edited without decoding and re-encoding it. That pass earns its keep on a
130 ms sound, where 50 ms of leading silence is a third of the clip. On a two-second
sentence it is nothing.

## Tips

- One adult voice for everything, recorded in a quiet room with a phone held at the same
  distance each time.
- Trim silence from both ends, so the sounds follow each other quickly when a word is
  sounded out.
- A human recording saved under the same name simply replaces a generated one. Match the
  format of the folder you put it in.

## Making them again

Three commands, one per folder. Each skips clips that are already there, so a second run
only fills what is missing; add `-Force` to remake everything.

```
# the 43 sounds
powershell -ExecutionPolicy Bypass -File tools/make-sounds-azure.ps1

# the syllables, from tools/word-clips.txt
powershell -ExecutionPolicy Bypass -File tools/make-sounds-azure.ps1 `
  -WordsFile tools\word-clips.txt -Rate 24000

# the whole words and phrases, from tools/spoken-clips.txt
powershell -ExecutionPolicy Bypass -File tools/make-sounds-azure.ps1 `
  -WordsFile tools\spoken-clips.txt -Spoken -Rate 24000 -Mp3
```

Get the flags wrong and nothing will complain: a blended clip recorded as mp3 will simply
sound very slightly gappy, which is easy to miss and annoying to track down later. The
table above is the contract.

`SPEECH_KEY` and `SPEECH_REGION` come from the environment and must never be written into
a file here - this repository is public.

After any of them, check nothing was left to the device voice. Open the game and run in
the browser console:

```js
var sp={}, wd={}, sn={};
PH.CLIPS.spoken.forEach(f => sp[f.replace(/\.\w+$/,'')] = 1);
PH.CLIPS.words.forEach(f => wd[f.replace(/\.\w+$/,'')] = 1);
PH.CLIPS.sounds.forEach(f => sn[f.replace(/\.\w+$/,'')] = 1);
var slug = t => String(t).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
var ok = t => t[0] === '/' ? !!sn[t.slice(1)] : !!(sp[slug(t)] || wd[slug(t)]);
var missed = [], os = PH.speech.say, ow = PH.speech.sayWord;
PH.speech.say = t => { if (!ok(String(t))) missed.push(String(t)); };
PH.speech.sayWord = t => { if (!ok(String(t))) missed.push(String(t)); };
for (var p = 0; p < 12; p++) {
  Object.keys(PH.games).forEach(id => [-1,0,1,2,3,4,5].forEach(lv => {
    try { PH.Engine.start(PH.games[id], PH.levelById(lv));
      for (var i = 0; i < 80; i++) { PH.Engine.game.update(0.05); } } catch (e) {}
  }));
}
PH.speech.say = os; PH.speech.sayWord = ow;
console.log([...new Set(missed)]);
```

An empty list means every game, at every level, says only things that have a recording.
Twelve passes because the games pick their words and rules at random, and a single pass
misses the rarer ones. Anything it prints wants adding to `tools/spoken-clips.txt`.

## Words and syllables

Whole words go in `spoken/` and syllables in `words/`, both named in lower case. The
clapping and spelling games work in syllables rather than single sounds (`rab.bit`,
`pen.cil`), and a syllable is not one of the 43 sounds, so it needs a recording of its
own. `words/` holds the 133 syllables the longest words split into; the list they are
made from is `tools/word-clips.txt`, which also says how to rebuild it if the word bank
changes:

```
powershell -ExecutionPolicy Bypass -File tools/make-sounds-azure.ps1 -WordsFile tools\word-clips.txt
```

A clip already in `words/` is kept, so running it again only fills what is missing; pass
`-Force` to remake everything.

Whole words themselves are still spoken by the device voice. Adding them is the same
command with more lines in the list - it is only a question of how many megabytes of
recordings belong in the repository.
