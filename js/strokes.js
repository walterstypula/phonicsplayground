/* Phonics Playground - how to write each letter, for Comet Trails.
   A letter is a list of strokes, drawn in order; each stroke is a list of points.
   Lowercase box: x 0-60, top of tall letters y 0, middle line y 40, baseline y 100, tails to y 140.
   Capitals box:  x 0-60, top y 0, baseline y 100.                                         */
(function (PH) {
  'use strict';

  function line(x1, y1, x2, y2) {
    var n = Math.max(2, Math.ceil(Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)) / 4));
    var out = [];
    for (var i = 0; i <= n; i++) { out.push([x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n]); }
    return out;
  }

  /* angles in degrees on the canvas: 0 = right, 90 = down, -90 = up; sweeps either way */
  function arc(cx, cy, rx, ry, a0, a1) {
    var n = Math.max(6, Math.ceil(Math.abs(a1 - a0) / 6));
    var out = [];
    for (var i = 0; i <= n; i++) {
      var a = (a0 + (a1 - a0) * i / n) * Math.PI / 180;
      out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    }
    return out;
  }

  /* a smooth Catmull-Rom curve through the given points */
  function smooth(pts) {
    var out = [];
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (var t = 0; t < 1; t += 0.1) {
        var t2 = t * t, t3 = t2 * t;
        out.push([
          0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
        ]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  function dot(x, y) { return [[x, y], [x, y + 1]]; }
  function join() { return [].concat.apply([], arguments); }

  var lower = {
    a: [arc(30, 70, 26, 30, -30, -390), line(56, 40, 56, 100)],
    b: [line(6, 0, 6, 100), arc(30, 70, 24, 30, 180, 540)],
    c: [arc(32, 70, 28, 30, -40, -320)],
    d: [arc(28, 70, 26, 30, -30, -390), line(54, 0, 54, 100)],
    e: [join(line(4, 70, 58, 70), arc(31, 70, 27, 30, 0, -320))],
    f: [smooth([[50, 8], [38, 0], [26, 6], [24, 22], [24, 100]]), line(8, 42, 44, 42)],
    g: [arc(28, 70, 26, 30, -30, -390), join(line(54, 40, 54, 122), arc(34, 122, 20, 18, 0, 160))],
    h: [line(6, 0, 6, 100), smooth([[6, 62], [20, 44], [40, 42], [52, 52], [54, 70], [54, 100]])],
    i: [line(30, 40, 30, 100), dot(30, 16)],
    j: [join(line(36, 40, 36, 125), arc(20, 125, 16, 15, 0, 150)), dot(36, 16)],
    k: [line(8, 0, 8, 100), join(line(48, 40, 8, 72), line(8, 72, 50, 100))],
    l: [line(30, 0, 30, 100)],
    m: [line(6, 40, 6, 100), smooth([[6, 60], [16, 42], [28, 46], [32, 60], [32, 100]]),
      smooth([[32, 60], [42, 42], [54, 46], [58, 60], [58, 100]])],
    n: [line(8, 40, 8, 100), smooth([[8, 62], [20, 44], [40, 42], [52, 52], [54, 70], [54, 100]])],
    o: [arc(30, 70, 28, 30, -90, -450)],
    p: [line(8, 40, 8, 140), arc(32, 70, 24, 30, 180, 540)],
    q: [arc(28, 70, 26, 30, -30, -390), line(54, 40, 54, 140)],
    r: [line(10, 40, 10, 100), smooth([[10, 62], [22, 45], [38, 40], [52, 46]])],
    s: [smooth([[54, 48], [40, 40], [18, 42], [8, 54], [20, 66], [40, 74], [52, 86], [44, 98], [22, 100], [6, 92]])],
    t: [line(28, 6, 28, 100), line(8, 42, 50, 42)],
    u: [smooth([[8, 40], [8, 80], [20, 99], [38, 98], [52, 84], [54, 40]]), line(54, 40, 54, 100)],
    v: [join(line(4, 40, 30, 100), line(30, 100, 56, 40))],
    w: [join(line(2, 40, 16, 100), line(16, 100, 30, 56), line(30, 56, 44, 100), line(44, 100, 58, 40))],
    x: [line(6, 40, 54, 100), line(54, 40, 6, 100)],
    y: [line(6, 40, 30, 100), line(54, 40, 20, 140)],
    z: [join(line(6, 40, 54, 40), line(54, 40, 6, 100), line(6, 100, 54, 100))]
  };

  var upper = {
    A: [line(30, 0, 4, 100), line(30, 0, 56, 100), line(14, 64, 46, 64)],
    B: [line(6, 0, 6, 100), join(line(6, 0, 34, 0), arc(34, 24, 18, 24, -90, 90), line(34, 48, 6, 48)),
      join(line(6, 48, 36, 48), arc(36, 74, 20, 26, -90, 90), line(36, 100, 6, 100))],
    C: [arc(34, 50, 30, 50, -40, -320)],
    D: [line(6, 0, 6, 100), join(line(6, 0, 24, 0), arc(24, 50, 32, 50, -90, 90), line(24, 100, 6, 100))],
    E: [join(line(54, 0, 6, 0), line(6, 0, 6, 100), line(6, 100, 54, 100)), line(6, 50, 44, 50)],
    F: [join(line(54, 0, 6, 0), line(6, 0, 6, 100)), line(6, 50, 44, 50)],
    G: [arc(32, 50, 28, 50, -40, -360), line(60, 50, 38, 50)],
    H: [line(6, 0, 6, 100), line(54, 0, 54, 100), line(6, 50, 54, 50)],
    I: [line(30, 0, 30, 100), line(12, 0, 48, 0), line(12, 100, 48, 100)],
    J: [join(line(44, 0, 44, 72), arc(26, 72, 18, 26, 0, 180))],
    K: [line(8, 0, 8, 100), line(52, 0, 8, 56), line(22, 42, 54, 100)],
    L: [join(line(8, 0, 8, 100), line(8, 100, 52, 100))],
    M: [join(line(4, 100, 4, 0), line(4, 0, 30, 60), line(30, 60, 56, 0), line(56, 0, 56, 100))],
    N: [join(line(6, 100, 6, 0), line(6, 0, 54, 100), line(54, 100, 54, 0))],
    O: [arc(30, 50, 28, 50, -90, -450)],
    P: [line(6, 0, 6, 100), join(line(6, 0, 30, 0), arc(30, 26, 22, 26, -90, 90), line(30, 52, 6, 52))],
    Q: [arc(30, 50, 28, 50, -90, -450), line(34, 70, 58, 104)],
    R: [line(6, 0, 6, 100), join(line(6, 0, 30, 0), arc(30, 26, 22, 26, -90, 90), line(30, 52, 6, 52)),
      line(26, 52, 54, 100)],
    S: [smooth([[52, 12], [36, 0], [14, 4], [6, 22], [22, 42], [42, 56], [54, 76], [44, 96], [20, 100], [4, 88]])],
    T: [line(4, 0, 56, 0), line(30, 0, 30, 100)],
    U: [join(line(6, 0, 6, 70), arc(30, 70, 24, 30, 180, 0), line(54, 70, 54, 0))],
    V: [join(line(4, 0, 30, 100), line(30, 100, 56, 0))],
    W: [join(line(2, 0, 16, 100), line(16, 100, 30, 40), line(30, 40, 44, 100), line(44, 100, 58, 0))],
    X: [line(6, 0, 54, 100), line(54, 0, 6, 100)],
    Y: [line(6, 0, 30, 48), join(line(54, 0, 30, 48), line(30, 48, 30, 100))],
    Z: [join(line(6, 0, 54, 0), line(54, 0, 6, 100), line(6, 100, 54, 100))]
  };

  /* pre-writing patterns for three year olds, drawn in the lowercase box */
  var shapes = {
    'a line down': [line(30, 0, 30, 110)],
    'a line across': [line(-20, 60, 80, 60)],
    'a circle': [arc(30, 60, 40, 40, -90, -450)],
    'a zigzag': [join(line(-20, 30, 5, 90), line(5, 90, 30, 30), line(30, 30, 55, 90), line(55, 90, 80, 30))],
    'a wave': [smooth([[-20, 60], [0, 30], [20, 60], [40, 90], [60, 60], [80, 30]])],
    'a rainbow': [arc(30, 90, 50, 60, 180, 360)]
  };

  PH.STROKES = { lower: lower, upper: upper, shapes: shapes };

})(window.PH = window.PH || {});
