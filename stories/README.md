# Stories

Stories for the Story Time game. They all live in one file, `stories.js`, and adding one
means adding an entry to the list in it.

Everything inside the square brackets is plain JSON. The single line above the brackets
is there so the file can be opened straight off a disk: a page loaded from `file://` is
not allowed to fetch its own folder, and this whole game is meant to work on a laptop
with no internet, so the stories arrive as a script rather than as a download. Edit the
file exactly as you would edit JSON.

```json
{
  "id": "cat-and-rat",
  "title": "Cat and Rat",
  "level": 1,
  "emoji": "🐱",
  "by": "your name",
  "lines": [
    "The cat sat on a red mat.",
    "A rat ran up the big log."
  ]
}
```

| field | what it is |
| --- | --- |
| `id` | short, hyphenated, and not already used by another story |
| `title` | what a child sees at the top |
| `level` | 0 to 5, matching the levels in the menu |
| `emoji` | one picture, shown beside the title |
| `by` | whoever wrote it |
| `lines` | one sentence each, in reading order |

Four or five lines is about right. The child reads one line at a time and taps **Next
line** when they are done, so a line is a unit of effort: keep it to something that can
be held in the head while a hard word in the middle of it is worked out.

## Writing for a level

This is the part that matters, and it is the part that is easy to get wrong.

A story is for practising what a child has just been taught. If it contains words they
have no way to work out, the only thing left is guessing from the picture or from the
shape of the word — which is the habit phonics teaching exists to prevent. So every word
should either follow a rule the child has met, or be one of the tricky words below.

Each level adds to the ones before it, so a level 3 story may use anything from levels 1
and 2 as well.

| level | what a child can read by now |
| --- | --- |
| 0 | the simplest three-letter words: `sun`, `cat`, `mat`, `box` |
| 1 | any short-vowel word: `red`, `bug`, `nap`, `top`, `hid` |
| 2 | `sh ch th ck ng`, and blends: `fish`, `duck`, `splash`, `went`, `stick` |
| 3 | magic e and vowel teams: `cake`, `home`, `green`, `boat`, `rain`, `see` |
| 4 | `ar or ir ur er igh ow ou oi oy aw`: `farm`, `storm`, `night`, `found`, `coin` |
| 5 | longer words of two and three syllables: `basket`, `rabbit`, `umbrella` |

### Tricky words

Some words cannot be sounded out at all, and every phonics scheme teaches them by sight
instead. The game knows them and will not try to blend them — it says them out loud and
tells the child that this is one we simply know. They are free to use at any level:

> the, a, I, to, do, of, is, his, has, was, said, you, your, they, all, are, my, her,
> he, she, we, me, be, no, go, so, one, two, come, some, there, what, when, where, here,
> love, have, live, give, little, put, who, why, been, their, were, our, out, about, into

Use them freely — a story without "the" and "said" is a strange thing to read — but a
line that is mostly tricky words is not practising anything.

### Endings

`-ed` and `-s` are handled: "landed" is sounded as `l-a-n-d-ed`, and the game knows that
the `-ed` says /id/ there, /t/ in "packed" and /d/ in "played".

What it does not handle is an ending stuck onto a stem that changed to take it. "liked"
loses the e of "like", and the game cannot see that it was ever there, so it sounds the
`i` short. Prefer "he liked it" written as "he sat and ate", or check the word on the
check page before relying on it.

### Checking your story

Open `listen.html`, type any word into the box, and press **Sound it out**. It prints the
sounds the word will be broken into and plays them. That is exactly what the story game
will do with it, so if it looks wrong there it will sound wrong in the story.

If a word comes out wrong and it is a word worth keeping, it can be taught to the game
directly: `SOUND_OUT` in `js/audio.js` takes an entry per word, and `audio/README.md`
explains the format.
