/* Phonics Playground - the story shelf.
 *
 * Everything between the square brackets is plain JSON, and the one line above it is
 * there only so the file can be opened straight off a disk with no web server. A page
 * loaded from file:// is not allowed to fetch its own folder, and this game is meant to
 * work on a laptop with no internet at all, so the stories arrive as a script instead of
 * as a download. Edit it exactly as you would edit JSON.
 *
 * To add a story, copy the last one, change it, and leave a comma between entries.
 * stories/README.md says what makes a story readable at each level, and stories.html
 * checks yours against those rules and reads it back to you.
 *
 *   id     something short and hyphenated, unique across the shelf
 *   title  what a child sees at the top
 *   level  1-5, matching the levels in the menu; 0 for the very first readers
 *   emoji  one picture for the title
 *   by     whoever wrote it
 *   lines  one sentence each, in the order they are read
 */
PH.STORIES = [
  {
    "id": "the-sun-is-up",
    "title": "The Sun Is Up",
    "level": 0,
    "emoji": "☀️",
    "by": "Phonics Playground",
    "lines": [
      "The sun is up.",
      "A cat is on a mat.",
      "A dog sat in a box.",
      "The sun is hot."
    ]
  },
  {
    "id": "cat-and-rat",
    "title": "Cat and Rat",
    "level": 1,
    "emoji": "🐱",
    "by": "Phonics Playground",
    "lines": [
      "The cat sat on a red mat.",
      "A rat ran up the big log.",
      "The rat had a nut in his bag.",
      "The cat had a nap.",
      "The rat sat on top of the cat."
    ]
  },
  {
    "id": "the-bug-and-the-mug",
    "title": "The Bug and the Mug",
    "level": 1,
    "emoji": "🐛",
    "by": "Phonics Playground",
    "lines": [
      "A bug sat in a mug.",
      "The mug was hot.",
      "The bug ran to the tap.",
      "He hid in a wet cup.",
      "The bug is not hot."
    ]
  },
  {
    "id": "the-fish-and-the-ship",
    "title": "The Fish and the Ship",
    "level": 2,
    "emoji": "🐟",
    "by": "Phonics Playground",
    "lines": [
      "A fish had a wish.",
      "The wish was for a ship.",
      "A frog swam up with a stick.",
      "They put the stick on a shell.",
      "The fish and the frog went off in the ship."
    ]
  },
  {
    "id": "chip-the-duck",
    "title": "Chip the Duck",
    "level": 2,
    "emoji": "🦆",
    "by": "Phonics Playground",
    "lines": [
      "Chip is a duck with a black neck.",
      "He sat on a rock in the pond.",
      "A big fish sent a splash up.",
      "Chip got wet from his neck to his back.",
      "Chip did not wish to sit on that rock."
    ]
  },
  {
    "id": "the-snail-and-the-snake",
    "title": "The Snail and the Snake",
    "level": 3,
    "emoji": "🐌",
    "by": "Phonics Playground",
    "lines": [
      "A snail made a home by the lake.",
      "A snake came to the gate.",
      "Come and see my cake, said the snail.",
      "They ate it in the sun.",
      "Then the snake gave the snail a ride home."
    ]
  },
  {
    "id": "the-green-boat",
    "title": "The Green Boat",
    "level": 3,
    "emoji": "⛵",
    "by": "Phonics Playground",
    "lines": [
      "Pete had a green boat.",
      "He rode it on the deep lake.",
      "A seal came to see the boat.",
      "The seal ate a fish by the reeds.",
      "Pete and the seal went home."
    ]
  },
  {
    "id": "the-night-storm",
    "title": "The Night Storm",
    "level": 4,
    "emoji": "⛈️",
    "by": "Phonics Playground",
    "lines": [
      "The owl sat high in the dark.",
      "A storm came down on the farm.",
      "Rain fell hard and the barn shook.",
      "The owl saw a light in the north.",
      "By morning the storm had gone."
    ]
  },
  {
    "id": "the-coin-in-the-dirt",
    "title": "The Coin in the Dirt",
    "level": 4,
    "emoji": "🪙",
    "by": "Phonics Playground",
    "lines": [
      "A girl found a coin in the dirt.",
      "It was round and it was gold.",
      "She saw a bird fly down to the ground.",
      "The bird took the coin to its nest.",
      "The girl just had to smile."
    ]
  },
  {
    "id": "the-dinosaur-picnic",
    "title": "The Dinosaur Picnic",
    "level": 5,
    "emoji": "🦕",
    "by": "Phonics Playground",
    "lines": [
      "The dinosaur planned a picnic in the garden.",
      "He packed a basket with muffins and jam.",
      "A rabbit and a monkey came along.",
      "They sat under the umbrella until sunset.",
      "It was a wonderful afternoon."
    ]
  },
  {
    "id": "the-helicopter",
    "title": "The Helicopter",
    "level": 5,
    "emoji": "🚁",
    "by": "Phonics Playground",
    "lines": [
      "A helicopter landed in the garden.",
      "Out came a spider with a little basket.",
      "Inside was a magnet and a pencil.",
      "The spider gave them to the rabbit.",
      "Then the helicopter went back up into the clouds."
    ]
  }
];
