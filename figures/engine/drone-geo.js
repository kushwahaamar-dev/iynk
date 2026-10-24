/* SimLab drone engine: craft-local geometry helpers (SL.drone.g) and materials. Craft-local millimetres,
   x forward, y left, z up, z = 0 on the bench mat (docs/FIGURES-DRONE.md §2). Every helper returns one depth-sorted
   item { box, svg } or an array of them, in bench coordinates. */
(() => {
  const SD = SL.drone;
  const G = SD.G = { ox: 0, oy: 0, oz: 4, dz: 0, pal: 'tomato' };
  const W = SD.W = (x, y, z) => [x + G.ox, y + G.oy, z + G.oz + G.dz];
  SD.Pb = (x, y, z) => P(...W(x, y, z));

  const NAMED = SD.NAMED = {
    carbon: { l: '#6e6a65', m: '#4c4844', d: '#2d2a28' },
    metal: METAL, dark: DARK, clear: CLEAR, ceramic: CERAMIC,
    pcb: matOf('#3f8a55'), pcbBlue: matOf('#3f6fb5'), pcbBlack: matOf('#3d3b39'),
    copper: matOf('#c98a4b'), foam: matOf('#ece6d6'), white: matOf('#f4f1e8'),
    red: matOf('#d8473a'), black: matOf('#2c2926'), yellow: matOf('#f2c230'), alu: matOf('#b9c3cc'),
  };
  const mat = SD.mat = c => {
    if (c && typeof c === 'object' && c.l) return c;
    if (c === 'pal') return PALS[G.pal] || PALS.tomato;
    if (typeof c === 'string' && PALS[c]) return PALS[c];
    if (typeof c === 'string' && NAMED[c]) return NAMED[c];
    return CF_MAT(c);
  };
  const colOf = SD.colOf = c => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c : mat(c).l;

  const bbox = SD.bbox = (pts, pad = 0) => {
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (const p of pts) for (let i = 0; i < 3; i++) { if (p[i] < mn[i]) mn[i] = p[i]; if (p[i] > mx[i]) mx[i] = p[i]; }
    return [mn.map(v => v - pad), mx.map(v => v + pad)];
  };
  const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const len3 = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);

  const g = SD.g = {
    box(x0, y0, z0, x1, y1, z1, c, w = .9){
      const a = W(Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)), b = W(Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1));
      return { box: [a, b], svg: box(a[0], a[1], a[2], b[0], b[1], b[2], mat(c), tone, w) };
    },
    cyl(x, y, z0, z1, r, c, n = 18, w = 1){
      const a = W(x, y, z0), b = W(x, y, z1);
      return { box: [[a[0] - r, a[1] - r, a[2]], [a[0] + r, a[1] + r, b[2]]], svg: cyl(a[0], a[1], a[2], b[2], r, mat(c), tone, w, n) };
    },
    // a rod between two craft-local points, cut into pieces no longer than maxL so it sorts at every angle
    rod(a, b, r, c, maxL = 12, n = 8){
      const L = len3(a, b), k = Math.max(1, Math.ceil(L / maxL)), out = [], m = mat(c);
      for (let i = 0; i < k; i++){
        const p = W(...lerp3(a, b, i / k)), q = W(...lerp3(a, b, (i + 1) / k));
        out.push({ box: bbox([p, q], r), svg: rod(p, q, r, m, tone, .8, r, n) });
      }
      return out;
    },
    // a wire or cable drawn as an inked tube (model-unit widths), cut into short pieces
    wire(pts, color, d = 1.6, maxL = 9){
      const out = [], col = colOf(color);
      for (let i = 0; i < pts.length - 1; i++){
        const L = len3(pts[i], pts[i + 1]), k = Math.max(1, Math.ceil(L / maxL));
        for (let j = 0; j < k; j++){
          const p = W(...lerp3(pts[i], pts[i + 1], j / k)), q = W(...lerp3(pts[i], pts[i + 1], (j + 1) / k));
          const dd = `M${f(P(...p)[0])} ${f(P(...p)[1])}L${f(P(...q)[0])} ${f(P(...q)[1])}`;
          out.push({ box: bbox([p, q], d / 2), svg: `<path d="${dd}" fill="none" stroke="${INK}" style="stroke-width:${(d + .9).toFixed(2)}" stroke-linecap="round"/><path d="${dd}" fill="none" stroke="${col}" style="stroke-width:${d.toFixed(2)}" stroke-linecap="round"/>` });
        }
      }
      return out;
    },
    // an extruded convex outline [[x, y], ...] from z to z + t
    plate(outline, z, t, c, w = 1){
      const m = mat(c), n = outline.length;
      let area = 0;
      for (let i = 0; i < n; i++){ const [x0, y0] = outline[i], [x1, y1] = outline[(i + 1) % n]; area += x0 * y1 - x1 * y0; }
      const sgn = area >= 0 ? 1 : -1;
      const bot = outline.map(([x, y]) => W(x, y, z)), top = outline.map(([x, y]) => W(x, y, z + t));
      let s = '';
      for (let i = 0; i < n; i++){
        const j = (i + 1) % n, ex = outline[j][0] - outline[i][0], ey = outline[j][1] - outline[i][1];
        const nn = norm([ey * sgn, -ex * sgn, 0]);
        if (vis(nn)) s += shape([bot[i], bot[j], top[j], top[i]], tone(nn, m), w * .8);
      }
      s += shape(top, tone([0, 0, 1], m), w);
      return { box: bbox([...bot, ...top]), svg: s };
    },
    // an oriented block: centre o, unit axes u, v, n, half sizes hu, hv, hn
    oblock(o, u, v, n, hu, hv, hn, c, w = .9){
      const m = mat(c), corner = (a, b, e) => W(o[0] + u[0] * a * hu + v[0] * b * hv + n[0] * e * hn, o[1] + u[1] * a * hu + v[1] * b * hv + n[1] * e * hn, o[2] + u[2] * a * hu + v[2] * b * hv + n[2] * e * hn);
      const C8 = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(([a, b, e]) => corner(a, b, e));
      const F = [[n.map(x => -x), [0, 3, 2, 1]], [n, [4, 5, 6, 7]], [u.map(x => -x), [0, 4, 7, 3]], [u, [1, 2, 6, 5]], [v.map(x => -x), [0, 1, 5, 4]], [v, [3, 7, 6, 2]]];
      let s = '';
      for (const [nn, idx] of F) if (vis(nn)) s += shape(idx.map(i => C8[i]), tone(nn, m), w);
      return { box: bbox(C8), svg: s, pts: C8 };
    },
    // text lying on a horizontal face at height z, reading along +x (dir 'x') or +y (dir 'y'); flips to stay readable.
    // U is the text's right and V its down: U x V must be +z (seen from above), or core txM collapses it to nothing.
    text(x, y, z, str, size, col = INK, dir = 'x'){
      const o = P(...W(x, y, z));
      let U = dir === 'x' ? Dv(1, 0, 0) : Dv(0, 1, 0), V = dir === 'x' ? Dv(0, 1, 0) : Dv(-1, 0, 0);
      if (U[0] < 0) { U = U.map(v => -v); V = V.map(v => -v); }
      return `<text transform="${txM(o, U, V)}" font-size="${size}" fill="${colOf(col)}" text-anchor="middle" dominant-baseline="central" font-family="ui-monospace,Menlo,monospace" font-weight="800">${CF_ESC(CF_T(str))}</text>`;
    },
    disc(x, y, z, r, c, n = 16, w = .6){
      const pts = Array.from({ length: n }, (_, i) => { const a = i / n * 2 * Math.PI; return W(x + r * Math.cos(a), y + r * Math.sin(a), z); });
      return shape(pts, typeof c === 'string' && c[0] === '#' ? c : tone([0, 0, 1], mat(c)), w);
    },
    led(x, y, z, color, on, r = 1.1){
      const [X, Y] = P(...W(x, y, z)), col = colOf(color);
      return (on ? `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(r * 4.2)}" fill="${col}" opacity=".38"/>` : '')
        + `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(r)}" fill="${on ? col : mix(col, '#555555', .55)}" stroke="${INK}" stroke-width=".5"/>`;
    },
    // a flat arrow on a horizontal face (FC direction arrows, GPS arrows), pointing along +x when sign = 1
    arrow(x, y, z, L, sign, col = '#ffffff'){
      const s = sign >= 0 ? 1 : -1, h = L / 2;
      const pts = [[-h, -L * .12], [h * .25, -L * .12], [h * .25, -L * .3], [h, 0], [h * .25, L * .3], [h * .25, L * .12], [-h, L * .12]]
        .map(([a, b]) => W(x + a * s, y + b, z));
      return `<path d="${pd(pts)}" fill="${colOf(col)}" stroke="${INK}" stroke-width=".45"/>`;
    },
  };
  SD.lerp3 = lerp3;
  SD.len3 = len3;
})();
