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
    words: ['ad.wav', 'air.wav', 'ake.wav', 'an.wav', 'ap.wav', 'at.wav', 'ba.wav', 'bas.wav', 'birth.wav', 'bit.wav', 'blan.wav', 'bra.wav', 'brel.wav', 'but.wav', 'car.wav', 'chic.wav', 'cil.wav', 'com.wav', 'cook.wav', 'cop.wav', 'croc.wav', 'day.wav', 'den.wav', 'der.wav', 'di.wav', 'dile.wav', 'dra.wav', 'ear.wav', 'eese.wav', 'el.wav', 'est.wav', 'fast.wav', 'fin.wav', 'fly.wav', 'ful.wav', 'gar.wav', 'ger.wav', 'gon.wav', 'hel.wav', 'hos.wav', 'ig.wav', 'ike.wav', 'in.wav', 'ing.wav', 'ish.wav', 'jac.wav', 'jump.wav', 'ken.wav', 'ket.wav', 'key.wav', 'kind.wav', 'kit.wav', 'la.wav', 'lane.wav', 'li.wav', 'lock.wav', 'ma.wav', 'mag.wav', 'mel.wav', 'mer.wav', 'met.wav', 'mon.wav', 'muf.wav', 'na.wav', 'nake.wav', 'nel.wav', 'ness.wav', 'net.wav', 'nic.wav', 'ning.wav', 'no.wav', 'oat.wav', 'oc.wav', 'ock.wav', 'og.wav', 'on.wav', 'oon.wav', 'orn.wav', 'ose.wav', 'ouse.wav', 'ox.wav', 'pen.wav', 'pet.wav', 'phant.wav', 'pi.wav', 'pic.wav', 'piz.wav', 'ple.wav', 'poon.wav', 'pu.wav', 'pup.wav', 'pus.wav', 'rab.wav', 'rain.wav', 'read.wav', 'ree.wav', 'roc.wav', 'rog.wav', 'rot.wav', 'ruck.wav', 'run.wav', 'sand.wav', 'saur.wav', 'sect.wav', 'set.wav', 'spi.wav', 'ster.wav', 'sum.wav', 'sun.wav', 'tal.wav', 'tar.wav', 'ten.wav', 'ter.wav', 'thun.wav', 'ti.wav', 'to.wav', 'tor.wav', 'trac.wav', 'tun.wav', 'ture.wav', 'uck.wav', 'ul.wav', 'um.wav', 'un.wav', 'us.wav', 'ven.wav', 'wa.wav', 'wich.wav', 'win.wav', 'won.wav', 'za.wav', 'ze.wav']
  };
})(window.PH = window.PH || {});
