/* Phonics Playground - the recordings that exist in this folder.
   A browser opened from the file system cannot look inside a folder, so every clip is
   listed here. Anything not listed is spoken by the device's own voice instead.
     sounds: files named after ids in PH.SOUNDS (js/audio.js)  e.g. 'ee.wav' -> audio/sounds/ee.wav
     words:  files named after the word, in lower case         e.g. 'seed.mp3' -> audio/words/seed.mp3
   tools/make-sounds-azure.ps1 makes the sounds and rewrites the sounds list (or
   tools/make-sounds.ps1, which needs no key but sounds robotic); a human recording
   saved under the same name simply replaces a generated one. */
(function (PH) {
  'use strict';
  PH.CLIPS = {
    sounds: ['b.wav', 'd.wav', 'g.wav', 'k.wav', 'p.wav', 't.wav', 'ch.wav', 'j.wav', 'kw.wav', 'ks.wav', 'h.wav', 'f.wav', 'l.wav', 'm.wav', 'n.wav', 'r.wav', 's.wav', 'v.wav', 'w.wav', 'y.wav', 'z.wav', 'sh.wav', 'th.wav', 'dh.wav', 'ng.wav', 'a.wav', 'e.wav', 'i.wav', 'o.wav', 'u.wav', 'ay.wav', 'ee.wav', 'igh.wav', 'oh.wav', 'yoo.wav', 'oo.wav', 'uu.wav', 'ow.wav', 'oi.wav', 'aw.wav', 'ar.wav', 'or.wav', 'er.wav'],
    words: ['ad.wav', 'bas.wav', 'birth.wav', 'bit.wav', 'blan.wav', 'brel.wav', 'but.wav', 'chic.wav', 'cil.wav', 'com.wav', 'croc.wav', 'day.wav', 'den.wav', 'der.wav', 'di.wav', 'dile.wav', 'dra.wav', 'el.wav', 'est.wav', 'fast.wav', 'fin.wav', 'fly.wav', 'ful.wav', 'gar.wav', 'gon.wav', 'hel.wav', 'hos.wav', 'ing.wav', 'jac.wav', 'jump.wav', 'ken.wav', 'ket.wav', 'kind.wav', 'kit.wav', 'la.wav', 'mag.wav', 'mer.wav', 'met.wav', 'mon.wav', 'muf.wav', 'nel.wav', 'ness.wav', 'net.wav', 'nic.wav', 'ning.wav', 'no.wav', 'pen.wav', 'pet.wav', 'phant.wav', 'pi.wav', 'pic.wav', 'pu.wav', 'pup.wav', 'rab.wav', 'roc.wav', 'run.wav', 'sand.wav', 'saur.wav', 'set.wav', 'ster.wav', 'sum.wav', 'sun.wav', 'tal.wav', 'ten.wav', 'ter.wav', 'thun.wav', 'tun.wav', 'ture.wav', 'um.wav', 'ven.wav', 'wich.wav', 'win.wav', 'won.wav']
  };
})(window.PH = window.PH || {});
