/* Phonics Playground - the character kit: eyes, faces, shading and a posable kid,
   so every game's characters are drawn with the same care and feel like one cast */
(function (PH) {
  'use strict';

  var U = PH.util;
  var TAU = Math.PI * 2;
  var INK = '#2b2346';          /* the soft dark outline every character shares */

  var art = {
    INK: INK,

    now: function () { return performance.now() / 1000; },

    /* 0 = eyes open, 1 = shut. A quick blink every few seconds; seed keeps a crowd out of step */
    blink: function (seed) {
      var t = art.now() + (seed || 0) * 1.37;
      var period = 3.4 + ((seed || 0) % 3) * 0.6;
      var p = t % period;
      return p < 0.14 ? Math.sin(p / 0.14 * Math.PI) : 0;
    },

    /* a ball of colour lit from the top left, with an outline */
    ball: function (ctx, x, y, r, col, o) {
      o = o || {};
      var g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05);
      g.addColorStop(0, U.shade(col, 0.35));
      g.addColorStop(0.55, col);
      g.addColorStop(1, U.shade(col, -0.25));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      if (o.line !== false) {
        ctx.lineWidth = o.lineWidth || 3; ctx.strokeStyle = o.ink || INK; ctx.stroke();
      }
      if (o.shine !== false) {
        ctx.fillStyle = 'rgba(255,255,255,.45)';
        ctx.beginPath(); ctx.ellipse(x - r * 0.38, y - r * 0.45, r * 0.3, r * 0.17, -0.6, 0, TAU); ctx.fill();
      }
    },

    /* fill whatever path is current with a lit gradient, then outline it.
       box = [top, bottom] in y so the light matches the shape                       */
    fillLit: function (ctx, col, top, bottom, o) {
      o = o || {};
      var g = ctx.createLinearGradient(0, top, 0, bottom);
      g.addColorStop(0, U.shade(col, o.light === undefined ? 0.28 : o.light));
      g.addColorStop(0.6, col);
      g.addColorStop(1, U.shade(col, o.dark === undefined ? -0.22 : o.dark));
      ctx.fillStyle = g;
      ctx.fill();
      if (o.line !== false) {
        ctx.lineWidth = o.lineWidth || 3; ctx.lineJoin = 'round';
        ctx.strokeStyle = o.ink || INK; ctx.stroke();
      }
    },

    /* a thick rounded limb from (x1,y1) to (x2,y2) with an outline */
    limb: function (ctx, x1, y1, x2, y2, w, col, o) {
      o = o || {};
      ctx.lineCap = 'round';
      ctx.strokeStyle = o.ink || INK; ctx.lineWidth = w + 5;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.strokeStyle = col; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = w * 0.3;
      ctx.beginPath(); ctx.moveTo(x1 - w * 0.18, y1); ctx.lineTo(x2 - w * 0.18, y2); ctx.stroke();
    },

    /* one glossy cartoon eye. o.look = [-1..1, -1..1], o.blink = 0..1, o.iris colour,
       o.lid = colour of the eyelid (the skin), o.happy = closed smiling arc          */
    eye: function (ctx, x, y, r, o) {
      o = o || {};
      if (o.happy) {
        ctx.strokeStyle = o.ink || INK; ctx.lineWidth = Math.max(2, r * 0.32); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(x, y + r * 0.35, r * 0.75, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke();
        return;
      }
      var ry = r * (o.tall || 1.12);
      var shut = o.blink || 0;
      if (o.dot) {                   /* small faces: a shiny dark bead, squashed flat to blink */
        var h = r * 1.25 * Math.max(0.12, 1 - shut);
        var dx = (o.look ? o.look[0] : 0) * r * 0.25, dy = (o.look ? o.look[1] : 0) * r * 0.2;
        ctx.fillStyle = '#231a38';
        ctx.beginPath(); ctx.ellipse(x + dx, y + dy, r, h, 0, 0, TAU); ctx.fill();
        if (shut < 0.5) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath(); ctx.arc(x + dx - r * 0.3, y + dy - h * 0.38, r * 0.38, 0, TAU); ctx.fill();
          ctx.beginPath(); ctx.arc(x + dx + r * 0.35, y + dy + h * 0.35, r * 0.17, 0, TAU); ctx.fill();
        }
        return;
      }
      ctx.save();
      ctx.beginPath(); ctx.ellipse(x, y, r, ry, 0, 0, TAU);
      ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.clip();
      var lx = (o.look ? o.look[0] : 0) * r * 0.32, ly = (o.look ? o.look[1] : 0) * r * 0.3;
      var ir = r * (o.irisSize || 0.68);
      if (o.iris) {
        var ig = ctx.createRadialGradient(x + lx, y + ly + ir * 0.3, ir * 0.2, x + lx, y + ly, ir);
        ig.addColorStop(0, U.shade(o.iris, 0.35)); ig.addColorStop(1, U.shade(o.iris, -0.2));
        ctx.fillStyle = ig;
        ctx.beginPath(); ctx.arc(x + lx, y + ly, ir, 0, TAU); ctx.fill();
        ctx.fillStyle = '#1b1530';
        ctx.beginPath(); ctx.arc(x + lx, y + ly, ir * 0.55, 0, TAU); ctx.fill();
      } else {
        ctx.fillStyle = '#1b1530';
        ctx.beginPath(); ctx.arc(x + lx, y + ly, ir, 0, TAU); ctx.fill();
      }
      /* two catchlights make an eye look alive */
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(x + lx - ir * 0.35, y + ly - ir * 0.38, ir * 0.36, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(x + lx + ir * 0.4, y + ly + ir * 0.35, ir * 0.16, 0, TAU); ctx.fill();
      /* a hint of shadow from the brow */
      ctx.fillStyle = 'rgba(40,30,80,.12)';
      ctx.fillRect(x - r, y - ry, r * 2, ry * 0.35);
      if (shut > 0.02 || o.sleepy) {
        var cover = Math.max(shut, o.sleepy || 0);
        ctx.fillStyle = o.lid || '#f3c9a2';
        ctx.fillRect(x - r - 1, y - ry - 1, r * 2 + 2, ry * 2 * cover + 1);
        ctx.strokeStyle = o.ink || INK; ctx.lineWidth = Math.max(1.5, r * 0.18);
        ctx.beginPath(); ctx.moveTo(x - r, y - ry + ry * 2 * cover); ctx.lineTo(x + r, y - ry + ry * 2 * cover); ctx.stroke();
      }
      ctx.restore();
      ctx.lineWidth = Math.max(1.5, r * 0.16); ctx.strokeStyle = o.ink || INK;
      ctx.beginPath(); ctx.ellipse(x, y, r, ry, 0, 0, TAU); ctx.stroke();
    },

    /* a pair of eyes. gap is centre to centre */
    eyes: function (ctx, x, y, gap, r, o) {
      art.eye(ctx, x - gap / 2, y, r, o);
      art.eye(ctx, x + gap / 2, y, r, o);
    },

    cheeks: function (ctx, x, y, gap, r, col) {
      ctx.fillStyle = col || 'rgba(255,110,140,.35)';
      ctx.beginPath();
      ctx.ellipse(x - gap / 2, y, r, r * 0.62, 0, 0, TAU);
      ctx.ellipse(x + gap / 2, y, r, r * 0.62, 0, 0, TAU);
      ctx.fill();
    },

    /* kind: 'smile' | 'grin' (open with tongue) | 'o' | 'flat' | 'frown' */
    mouth: function (ctx, x, y, w, kind, o) {
      o = o || {};
      ctx.strokeStyle = o.ink || INK; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineWidth = o.lineWidth || Math.max(2, w * 0.14);
      if (kind === 'grin') {
        var grin = function () {
          ctx.beginPath();
          ctx.moveTo(x - w / 2, y - w * 0.12);
          ctx.quadraticCurveTo(x, y - w * 0.02, x + w / 2, y - w * 0.12);
          ctx.quadraticCurveTo(x + w * 0.4, y + w * 0.55, x, y + w * 0.55);
          ctx.quadraticCurveTo(x - w * 0.4, y + w * 0.55, x - w / 2, y - w * 0.12);
          ctx.closePath();
        };
        grin();
        ctx.fillStyle = '#7a2340'; ctx.fill();
        ctx.save(); ctx.clip();
        ctx.fillStyle = '#ff7b93';
        ctx.beginPath(); ctx.ellipse(x, y + w * 0.52, w * 0.28, w * 0.2, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x - w / 2, y - w * 0.2, w, w * 0.16);
        ctx.restore();
        grin();                        /* outline the mouth itself, not the tongue */
        ctx.stroke();
      } else if (kind === 'o') {
        ctx.fillStyle = '#7a2340';
        ctx.beginPath(); ctx.ellipse(x, y + w * 0.1, w * 0.26, w * 0.32, 0, 0, TAU); ctx.fill(); ctx.stroke();
      } else if (kind === 'flat') {
        ctx.beginPath(); ctx.moveTo(x - w * 0.3, y); ctx.lineTo(x + w * 0.3, y); ctx.stroke();
      } else if (kind === 'frown') {
        ctx.beginPath(); ctx.arc(x, y + w * 0.45, w * 0.4, 1.2 * Math.PI, 1.8 * Math.PI); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(x, y - w * 0.25, w * 0.5, 0.18 * Math.PI, 0.82 * Math.PI); ctx.stroke();
      }
    },

    /* ---------------------------------------------------------------------------
       A posable child. Drawn with the feet at (0,0), about 112 units tall.
         skin, hair, hairStyle ('short' | 'cap' | 'bun' | 'curly' | 'none'), capColor,
         shirt, pants, shoes, walk (phase in radians, or null for standing),
         arms: [left, right] angles, 0 = hanging down, PI = straight up,
         hands: colour for gloves, look, mouth, face (false to skip), blinkSeed,
         hat(ctx) and front(ctx) callbacks for costume pieces drawn in head space
       --------------------------------------------------------------------------- */
    kid: function (ctx, o) {
      o = o || {};
      var skin = o.skin || '#f6c9a0';
      var shirt = o.shirt || '#4d8dff';
      var pants = o.pants || '#2f3a73';
      var shoes = o.shoes || '#e2495b';
      var walking = o.walk !== undefined && o.walk !== null;
      var sw = walking ? Math.sin(o.walk) : 0;
      var arms = o.arms || [0.18 - sw * 0.5, 0.18 + sw * 0.5];
      var HY = -82;             /* head centre */

      /* legs and shoes */
      var lf = [-9 + sw * 7, 0 - Math.max(0, -sw) * 5], rf = [9 - sw * 7, 0 - Math.max(0, sw) * 5];
      art.limb(ctx, -8, -30, lf[0], lf[1] - 6, 11, pants);
      art.limb(ctx, 8, -30, rf[0], rf[1] - 6, 11, pants);
      [lf, rf].forEach(function (f, i) {
        ctx.beginPath(); ctx.ellipse(f[0] + (i ? 3 : -3), f[1] - 3, 10, 6, 0, 0, TAU);
        art.fillLit(ctx, shoes, f[1] - 9, f[1] + 3, { lineWidth: 2.5 });
      });

      /* arms go behind the body when they hang, in front when raised */
      function arm(side, a) {
        var sx = side * 15, sy = -56;
        var ex = sx + side * Math.sin(a) * 27, ey = sy + Math.cos(a) * 27;
        art.limb(ctx, sx, sy, ex, ey, 10, o.sleeve || shirt);
        art.ball(ctx, ex, ey, o.hands ? 8 : 6.5, o.hands || skin, { lineWidth: 2.5, shine: !!o.hands });
      }
      if (arms[0] < 1.2) { arm(-1, arms[0]); }
      if (arms[1] < 1.2) { arm(1, arms[1]); }

      /* body: a soft pear */
      ctx.beginPath();
      ctx.moveTo(-15, -62);
      ctx.quadraticCurveTo(-21, -40, -18, -26);
      ctx.quadraticCurveTo(0, -20, 18, -26);
      ctx.quadraticCurveTo(21, -40, 15, -62);
      ctx.quadraticCurveTo(0, -68, -15, -62);
      ctx.closePath();
      art.fillLit(ctx, shirt, -66, -22);
      if (o.body) { o.body(ctx); }

      if (arms[0] >= 1.2) { arm(-1, arms[0]); }
      if (arms[1] >= 1.2) { arm(1, arms[1]); }

      /* head */
      ctx.save();
      ctx.translate(0, HY);
      if (o.tilt) { ctx.rotate(o.tilt); }
      var hair = o.hair || '#6b3f24';
      var style = o.hairStyle || 'short';
      if (style === 'bun') {
        art.ball(ctx, 0, -27, 11, hair, { shine: false });
      }
      if (style === 'curly') {       /* a ring of little curls peeking round the head */
        for (var k = 0; k <= 8; k++) {
          var ca = Math.PI * (0.95 + k * 0.1375);
          art.ball(ctx, Math.cos(ca) * 22, Math.sin(ca) * 20 - 3, 8.5, hair, { shine: false, lineWidth: 2.5 });
        }
      }
      art.ball(ctx, -22, 3, 6, skin, { shine: false, lineWidth: 2.5 });
      art.ball(ctx, 22, 3, 6, skin, { shine: false, lineWidth: 2.5 });
      ctx.beginPath(); ctx.ellipse(0, 0, 23, 22, 0, 0, TAU);
      art.fillLit(ctx, skin, -22, 22, { light: 0.18, dark: -0.1 });

      if (style === 'short' || style === 'curly' || style === 'bun') {
        ctx.beginPath();
        ctx.moveTo(-23, 2);
        ctx.bezierCurveTo(-26, -28, 26, -30, 23, 2);
        ctx.quadraticCurveTo(18, -10, 8, -12);
        ctx.quadraticCurveTo(2, -4, -6, -12);
        ctx.quadraticCurveTo(-16, -10, -23, 2);
        ctx.closePath();
        art.fillLit(ctx, hair, -26, 0, { lineWidth: 2.5 });
      } else if (style === 'cap') {
        var cap = o.capColor || '#ff9f40';
        ctx.beginPath();
        ctx.moveTo(-24, -3);
        ctx.bezierCurveTo(-24, -32, 24, -32, 24, -3);
        ctx.closePath();
        art.fillLit(ctx, cap, -28, -3, { lineWidth: 2.5 });
        ctx.beginPath();
        ctx.moveTo(8, -6); ctx.quadraticCurveTo(28, -9, 38, -3); ctx.quadraticCurveTo(26, 1, 8, -2); ctx.closePath();
        art.fillLit(ctx, U.shade(cap, -0.12), -9, 1, { lineWidth: 2.5 });
        art.ball(ctx, 0, -26, 3.5, U.shade(cap, -0.2), { shine: false, lineWidth: 2 });
      }
      if (o.hat) { o.hat(ctx); }

      if (o.face !== false) {
        var bl = o.closed ? 1 : art.blink(o.blinkSeed || 0);
        /* little brows give the face its expression */
        ctx.strokeStyle = U.shade(o.hair || '#6b3f24', -0.2); ctx.lineWidth = 2; ctx.lineCap = 'round';
        var brow = o.mouth === 'o' ? -2 : 0;
        ctx.beginPath();
        ctx.moveTo(-12, -8 + brow); ctx.quadraticCurveTo(-8.5, -10.5 + brow, -5, -8.5 + brow);
        ctx.moveTo(12, -8 + brow); ctx.quadraticCurveTo(8.5, -10.5 + brow, 5, -8.5 + brow);
        ctx.stroke();
        art.eyes(ctx, 0, 1, 17, 4, { look: o.look, blink: bl, dot: true });
        art.cheeks(ctx, 0, 9, 28, 4.4);
        ctx.fillStyle = U.shade(skin, -0.2);
        ctx.beginPath(); ctx.ellipse(0, 7, 2.4, 1.8, 0, 0, TAU); ctx.fill();
        art.mouth(ctx, 0, 14, 10, o.mouth || 'smile', { lineWidth: 2.2 });
      }
      if (o.front) { o.front(ctx); }
      ctx.restore();
    }
  };

  PH.art = art;

})(window.PH = window.PH || {});
