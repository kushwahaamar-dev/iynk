// @cf title Force sensor (FSR 402)
// @cf use engine/bench.list
/* Interlink FSR 402 force-sensing resistor: a round polymer-film sensor 18.3 mm across with a 12.7 mm active area,
   about 0.45 mm thick, on a flat tail that ends in two male crimp pins on 2.54 mm pitch (about 56 mm long overall),
   standing up out of two neighbouring holes. Non-polar. Unloaded it is an open circuit (over 10 MOhm); from about
   0.2 N it conducts, and the resistance falls with force along the Adafruit table (5 V, 10 kOhm pull-down): 0.2 N
   30 kOhm, 1 N 6 kOhm, 10 N 1 kOhm, 100 N 250 Ohm, interpolated in log R against log F. Its rated range is about
   0.2-20 N; it tells "how hard", not a weight (part-to-part spread is large). With the FSR from 5 V to A0 and
   10 kOhm from A0 to GND: 1 N reads about 3.1 V, 10 N about 4.5 V. Without the pull-down A0 floats while nobody
   presses. See-through: the layers spread apart, the top film with its interdigitated silver fingers, the spacer
   ring with its air vent along the tail, and the bottom film with the force-sensing ink; under force the films
   touch over a growing area. */
(() => {
const B = SL.bench, T = B.T;
const DEF = { force: 0, fault: 'none' };
// soldering the tabs melts the film and breaks the traces: open for good (use the crimp pins)
const melted = p => p.fault === 'tabs melted';
const TABLE = [[.2, 30000], [1, 6000], [10, 1000], [100, 250]], OPEN = 1e7, FMIN = .2;
const FILM = { l: '#e8d7a8', m: '#d4bf86', d: '#a68f55' }, INKC = '#3a3632', SILV = '#c9cfd1';
const HEAD = 9.15, ACT = 6.35, TAILW = 7.6, H_PIN = 2.6, H_TAIL = 47.4;

const frame = (legs, i0, i1) => {
  const n = legs.length, o = [0, 1, 2].map(k => legs.reduce((s, q) => s + q[k], 0) / n);
  const dx = legs[i1][0] - legs[i0][0], dy = legs[i1][1] - legs[i0][1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
  const W = (a, b, z) => [o[0] + ux * a - uy * b, o[1] + uy * a + ux * b, o[2] + z];
  return { o, W, v: [-uy, ux, 0],
    loc: q => { const x = q[0] - o[0], y = q[1] - o[1]; return [x * ux + y * uy, -x * uy + y * ux]; },
    slab: (a0, b0, a1, b1, z0, z1, m, w = .6) => B.slabW(W, a0, b0, a1, b1, z0, z1, m, toneI, w),
    bx: (a0, b0, z0, a1, b1, z1) => B.aabb([W(a0, b0, z0), W(a1, b1, z1), W(a0, b1, z0), W(a1, b0, z1)]) };
};
const xrK = ctx => ctx.k != null ? ctx.k : ease(Math.min(1, Math.max(0, (ctx.st && ctx.st.xr) || 0)));
// a label pill on the side of the part its anchor is on, as seen now, so pills don't cross when it turns
const pill = (F, pt, dx, dy, text, on) => { const X = P(...pt)[0], Xc = P(...F.o)[0]; return tag(pt, (X < Xc - .5 ? -1 : X > Xc + .5 ? 1 : Math.sign(dx) || 1) * Math.abs(dx), dy, text, on); };
const forceOf = p => Math.max(0, Math.min(100, +p.force || 0));
// log-log interpolation through the table; open below the actuation force
const ohmsAt = F => {
  if (F < FMIN) return OPEN;
  for (let i = 1; i < TABLE.length; i++){ const [f0, r0] = TABLE[i - 1], [f1, r1] = TABLE[i];
    if (F <= f1){ const t = Math.log(F / f0) / Math.log(f1 / f0); return Math.exp(Math.log(r0) + t * Math.log(r1 / r0)); } }
  return TABLE[TABLE.length - 1][1];
};
const nText = F => F >= 10 ? String(Math.round(F)) : String(+F.toFixed(1));
// a disc in the film's vertical plane (normal along b) at height zc
const disc = (F, b, zc, r, n = 28) => Array.from({ length: n }, (_, i) => { const t = i / n * 2 * Math.PI; return F.W(r * Math.cos(t), b, zc + r * Math.sin(t)); });

B.part('fsr402', {
  name: 'Force sensor (FSR 402)',
  legs: ['1', '2'],
  span: [1, 1],
  params: { force: [0, 100], fault: ['none', 'tabs melted'] },
  steps: { force: [0, .2, 1, 5, 10, 20, 100] },
  paramNames: { force: 'Force (N)', fault: 'Break it' },
  defaults: DEF,
  elec: p => { const q = Object.assign({}, DEF, p), F = forceOf(q); return melted(q) ? { type: 'res', ohms: OPEN, open: true } : { type: 'res', ohms: ohmsAt(F), open: F < FMIN }; },
  ohmsAt,
  // a press is a firm fingertip, about 10 N (1 kg); letting go takes the force off
  press: (p, down) => ({ force: down ? 10 : 0 }),
  tag: (p, m) => { const q = Object.assign({}, DEF, p), F = forceOf(q);
    if (melted(q)) return T('{id} · tabs melted: open circuit', { id: p.id });
    return F < FMIN ? T('{id} · no force · open', { id: p.id }) : T('{id} · {n} N · {r}', { id: p.id, n: nText(F), r: B.ohmsText(Math.round(ohmsAt(F))) }); },
  draw(ctx){
    const p = Object.assign({}, DEF, ctx.p), legs = ctx.legs, k = xrK(ctx), Fz = forceOf(p);
    const F = frame(legs, 0, legs.length - 1), zc = H_PIN + H_TAIL - HEAD, front = vis(F.v);
    // how hard the finger pushes (0..1, log scale), and how much of that the film conducts (none once the tabs melted)
    const push = Fz < FMIN ? 0 : Math.min(1, Math.log10(Fz / FMIN) / Math.log10(100 / FMIN)), press = melted(p) ? 0 : push;
    let s = '';
    // crimp pins in the holes and the black clincher housings that grip the tail
    for (const L of legs){ const [a, b] = F.loc(L);
      s += rod(F.W(a, b, -.3), F.W(a, b, H_PIN), .3, B.M.tin, toneI, .4); }
    s += F.slab(-2.6, -.9, 2.6, .9, H_PIN - .6, H_PIN + 2.6, B.M.black, .55);
    // melted tabs: the film has shrunk and browned where the iron touched it, and the traces are broken there
    const burntFilm = melted(p) ? (() => { const [X, Y] = P(...F.W(0, 0, H_PIN + 4.2));
      return `<ellipse cx="${f(X)}" cy="${f(Y)}" rx="4.6" ry="2.6" fill="#6b4a2a" stroke="${INK}" stroke-width=".5" opacity=".9"/>`; })() : '';
    // the film: tail then head, both in the vertical plane through the pins; the layers part in see-through
    const gap = .9 * k, layers = [[-gap, FILM, 'bottom'], [0, FILM, 'spacer'], [gap, FILM, 'top']];
    const tailPts = b => [F.W(-TAILW / 2, b, H_PIN + 2.6), F.W(TAILW / 2, b, H_PIN + 2.6), F.W(TAILW / 2, b, zc - HEAD + 2), F.W(-TAILW / 2, b, zc - HEAD + 2)];
    const order = front ? layers : layers.slice().reverse();
    for (const [b, mat, name] of order){
      if (k < .05 && name !== 'top') continue;
      const op = k < .05 ? 1 : name === 'spacer' ? .85 : .9;
      let x = `<path d="${pd(tailPts(b))}" fill="${mat.m}" stroke="${INK}" stroke-width=".5" opacity="${f(op)}"/>`;
      x += `<path d="${pd(disc(F, b, zc, HEAD))}" fill="${mat.l}" stroke="${INK}" stroke-width=".6" opacity="${f(op)}"/>`;
      if (name === 'top' || k < .05){
        // the silver traces down the tail and the interdigitated fingers on the active area
        x += `<path d="${pd([F.W(-1.27, b, H_PIN + 2.6), F.W(-1.27, b, zc - ACT)], false)}M${pd([F.W(1.27, b, H_PIN + 2.6), F.W(1.27, b, zc - ACT)], false).slice(1)}" stroke="${SILV}" stroke-width="1" fill="none"/>`;
        x += `<path d="${pd(disc(F, b, zc, ACT))}" fill="${mix('#4a4642', '#1d1b19', press)}" stroke="${INK}" stroke-width=".4"/>`;
        let fing = '';
        for (let i = -4; i <= 4; i++){ const zz = zc + i * 1.35, w = Math.sqrt(Math.max(0, ACT * ACT - (i * 1.35) * (i * 1.35))) - .5;
          if (w > .4) fing += (fing ? 'M' : '') + pd([F.W(i % 2 ? -w : -w + 1, b, zz), F.W(i % 2 ? w - 1 : w, b, zz)], false).slice(fing ? 1 : 0); }
        x += `<path d="${fing}" stroke="${SILV}" stroke-width=".55" fill="none" opacity=".85"/>`;
      }
      if (name === 'spacer' && k >= .05){
        // the spacer is a ring: cut the active area out, and show the vent channel down the tail
        x += `<path d="${pd(disc(F, b, zc, ACT + .4))}" fill="#f2efe7" stroke="${INK}" stroke-width=".4" opacity=".9"/>`
          + `<path d="${pd([F.W(0, b, zc - ACT - .4), F.W(0, b, H_PIN + 3)], false)}" stroke="#f2efe7" stroke-width="1.1" fill="none"/>`;
      }
      if (name === 'bottom' && k >= .05){
        x += `<path d="${pd(disc(F, b, zc, ACT - .3))}" fill="#26231f" opacity=".9"/>`;
        // contact patches: the area where the films touch grows with force
        if (press > 0) x += `<path d="${pd(disc(F, b + (front ? .01 : -.01), zc, .6 + (ACT - 1) * press))}" fill="#f4b829" opacity=".55"/>`;
      }
      s += x;
    }
    s += burntFilm;
    // the fingertip pressing on the head
    if (push > 0 && k < .5){
      const tip = F.W(0, (front ? 1 : -1) * (1.6 - .7 * push), zc), [X, Y] = P(...tip);
      s += `<ellipse cx="${f(X)}" cy="${f(Y)}" rx="${f(4.2 + 1.2 * push)}" ry="${f(3.2 + 1 * push)}" fill="#e9b99a" stroke="${INK}" stroke-width=".7" opacity=".92"/>`
        + `<ellipse cx="${f(X - 1)}" cy="${f(Y - 1)}" rx="1.8" ry="1.1" fill="#f6dcc8" opacity=".9"/>`;
    }
    if ((ctx.solo || (B.md && B.md.def && B.md.def.partPage)) && k > .5){
      s += pill(F, F.W(3, gap, zc + 3), 56, -6, T('Silver fingers')) + pill(F, F.W(ACT + 1.2, 0, zc - 2), 60, 30, T('Spacer, air vent'))
        + pill(F, F.W(-2, -gap, zc - 2), -62, 22, T('Force-sensing ink'));
    }
    ctx.put(F.bx(-HEAD - .3, -1.4, -.3, HEAD + .3, 1.4, zc + HEAD + .3), s);
  },
  show: { breadboard: 'mini', holes: ['e8', 'e9'], params: { force: 1 } },
});
})();
