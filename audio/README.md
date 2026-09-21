# Recordings

The games speak with the device's own voice unless a recording exists here. A device
voice is fine for whole words but cannot say a single sound on its own: asked for the
"s" in "seed" it says something like "suh". Children learn to blend from these sounds,
so they are the recordings that matter most.

## How to add a recording

1. Save it as an `.mp3` in `sounds/` or `words/`, named exactly as below.
2. Add its name to the list in `clips.js` (the browser cannot look inside this folder
   by itself when the game is opened from a file).

```
sounds/ee.mp3      ->  sounds: ['ee']
words/seed.mp3     ->  words:  ['seed']
```

Anything missing is simply spoken by the device voice, so recordings can be added a few
at a time.

## The 44 sounds (American English)

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
| | | | | `or` | f**or**k |
| | | | | `er` | h**er**, b**ir**d, f**ur** |

The same list lives in `PH.SOUNDS` in `js/audio.js`.

## Tips

- One adult voice for everything, recorded in a quiet room with a phone held at the same
  distance each time.
- Trim silence from both ends, so the sounds follow each other quickly when a word is
  sounded out.
- Keep each file mono, around 64 kbps: the whole set is well under a megabyte.

## Words

Whole words go in `words/`, named in lower case (`words/seed.mp3`). They can be recorded
the same way, or generated once with a good text-to-speech service and saved here. The
game itself never calls an online service.
