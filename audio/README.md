# Recordings

The games speak with the device's own voice unless a recording exists here. A device
voice is fine for whole words but cannot say a single sound on its own: asked for the
"s" in "seed" it says something like "suh". Children learn to blend from these sounds,
so they are the recordings that matter most.

## The sounds that ship with the game

`sounds/` holds all 41 sounds the games use, spoken by the Azure voice `en-US-AvaNeural`
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

## Tips

- One adult voice for everything, recorded in a quiet room with a phone held at the same
  distance each time.
- Trim silence from both ends, so the sounds follow each other quickly when a word is
  sounded out.
- Keep each file mono, around 64 kbps: an mp3 of a sound is only a few kilobytes.
- The generated set is 48 kHz mono wav, about 1.9 MB for all 41. That is deliberate:
  s, f and th carry most of their sound above 5 kHz, which is the first thing a low
  bitrate throws away. Halve the size by asking for `riff-24khz-16bit-mono-pcm` in
  `tools/make-sounds-azure.ps1` if it ever matters.

## Words and syllables

Whole words go in `words/`, named in lower case (`words/seed.mp3`). The longest words are
sounded out in syllables rather than single sounds (`rab.bit`, `pen.cil`), and a syllable
is not one of the 43 sounds, so it needs a recording of its own. `words/` holds the 73
syllables the level 5 words split into; the list they are made from is
`tools/word-clips.txt`, which also says how to rebuild it if the word bank changes:

```
powershell -ExecutionPolicy Bypass -File tools/make-sounds-azure.ps1 -WordsFile tools\word-clips.txt
```

A clip already in `words/` is kept, so running it again only fills what is missing; pass
`-Force` to remake everything.

Whole words themselves are still spoken by the device voice. Adding them is the same
command with more lines in the list - it is only a question of how many megabytes of
recordings belong in the repository.
