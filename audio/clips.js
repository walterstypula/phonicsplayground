/* Phonics Playground - the recordings that exist in this folder.
   A browser opened from the file system cannot look inside a folder, so every clip is
   listed here. Anything not listed is spoken by the device's own voice instead.
     sounds: ids from PH.SOUNDS in js/audio.js  ->  audio/sounds/<id>.mp3   e.g. 'ee'
     words:  lower case words                   ->  audio/words/<word>.mp3  e.g. 'seed' */
(function (PH) {
  'use strict';
  PH.CLIPS = {
    sounds: [],
    words: []
  };
})(window.PH = window.PH || {});
