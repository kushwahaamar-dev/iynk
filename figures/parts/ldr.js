// @cf title Light sensor (LDR)
// @cf use engine/bench.list
/* GL5528 cadmium-sulphide photoresistor (LDR): a 5.1 mm ceramic disc about 2 mm thick under an epoxy coat, an
   orange CdS track snaking between two silver comb electrodes, two non-polar legs about 3.4 mm apart. Resistance
   from the maker's table: 10-20 kOhm at 10 lux (a dim room, not daylight), at least 1 MOhm in the dark, gamma 0.6:
   R = 15 kOhm x (E / 10 lux)^-0.6, so 100 lux gives 3.8 kOhm, 1000 lux 0.95 kOhm and daylight (10 000 lux) about
   240 Ohm. It responds in about 20 ms when the light comes on and 30 ms when it goes off; 100 mW max, 150 V max. In
   the usual divider (LDR from 5 V to A0, 10 kOhm from A0 to GND) more light gives a higher reading. Wired straight
   across 5 V in daylight it takes 21 mA and 105 mW, over its rating. See-through: the epoxy clears to show the
   ceramic base, the comb electrodes and the CdS track, where light frees charge carriers that drift between the
   combs (more light, more of them). */
(() => {
const B = SL.bench, T = B.T;
const DEF = { lux: 300, fault: 'none' };
// faults the page can set; in a circuit the solver's verdict (m.state) is used unless one is set here
const FAULTS = { none: null, overheated: 'burnt' };
const stateOf = (p, m) => FAULTS[p.fault] || (m && m.state) || null;
const R10 = 15000, GAMMA = .6, RDARK = 1e6, PRESETS = [1, 10, 100, 1000, 10000];
const CDS = '#c8553a', SILVER = { l: '#eef0f0', m: '#c9cfd1', d: '#8f989b' }, CER = { l: '#f6f1e4', m: '#e2d9c3', d: '#b7ab8f' };

const frame = (legs, i0, i1) => {
  const n = legs.length, o = [0, 1, 2].map(k => legs.reduce((s, q) => s + q[k], 0) / n);
  const dx = legs[i1][0] - legs[i0][0], dy = legs[i1][1] - legs[i0][1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
  const W = (a, b, z) => [o[0] + ux * a - uy * b, o[1] + uy * a + ux * b, o[2] + z];
  return { o, W,
    loc: q => { const x = q[0] - o[0], y = q[1] - o[1]; return [x * ux + y * uy, -x * uy + y * ux]; },
    bx: (a0, b0, z0, a1, b1, z1) => B.aabb([W(a0, b0, z0), W(a1, b1, z1), W(a0, b1, z0), W(a1, b0, z1)]) };
};
const xrK = ctx => ctx.k != null ? ctx.k : ease(Math.min(1, Math.max(0, (ctx.st && ctx.st.xr) || 0)));
const ring = (F, a, b, z, r, n = 24) => B.circ(a, b, r, n).map(([u, v]) => F.W(u, v, z));
const luxOf = p => Math.max(0, Math.min(100000, +p.lux || 0));
// the maker's gamma curve, clamped at the dark resistance
const ohmsAt = lux => lux <= 0 ? RDARK : Math.min(RDARK, R10 * Math.pow(lux / 10, -GAMMA));
const luxText = lux => lux >= 1000 ? (+(lux / 1000).toFixed(lux >= 10000 ? 0 : 1)) + 'k' : lux >= 10 ? String(Math.round(lux)) : String(+lux.toFixed(1));

B.part('ldr', {
  name: 'Light sensor (LDR)',
  legs: ['1', '2'],
  span: [1, 4],
  params: { lux: [0, 100000], fault: Object.keys(FAULTS) },
  paramNames: { fault: 'Break it' },
  steps: { lux: [0, 1, 10, 100, 300, 1000, 10000, 100000] },
  defaults: DEF,
  elec: p => ({ type: 'res', ohms: ohmsAt(luxOf(Object.assign({}, DEF, p))), pmax: .1, vmax: 150, lag: [.02, .03] }),
  ohmsAt,
  // each press steps the light: covered, dim room, room, desk lamp, daylight
  press: (p, down) => { if (!down) return null; const lux = luxOf(Object.assign({}, DEF, p)), i = PRESETS.findIndex(v => v > lux * 1.01); return { lux: PRESETS[i < 0 ? 0 : i] }; },
  tag: (p, m) => {
    const lux = luxOf(Object.assign({}, DEF, p));
    if (stateOf(Object.assign({}, DEF, p), m) === 'burnt') return T('{id} · overheated', { id: p.id });
    return T('{id} · {lux} lx · {r}', { id: p.id, lux: luxText(lux), r: B.ohmsText(Math.round(ohmsAt(lux))) });
  },
  draw(ctx){
    const p = Object.assign({}, DEF, ctx.p), legs = ctx.legs, k = xrK(ctx), m = ctx.m || {}, lux = luxOf(p);
    const F = frame(legs, 0, legs.length - 1), z0 = 5.6, z1 = 7.6, r = 2.55, burnt = stateOf(p, m) === 'burnt';
    const light = Math.max(0, Math.min(1, Math.log10(Math.max(lux, .1) * 10) / 5));      // 0.1 lux -> 0, 10 000 lux -> 1
    let s = '';
    for (const L of legs){ const [a, b] = F.loc(L), ea = a < 0 ? -1.7 : 1.7;
      s += rod(F.W(a, b, -.3), F.W(a, b, 2.2), .25, B.M.tin, toneI, .4) + rod(F.W(a, b, 2.2), F.W(ea, 0, z0), .25, B.M.tin, toneI, .4); }
    const c = F.W(0, 0, z0);
    // ceramic disc in its epoxy coat; the coat clears in see-through
    s += cyl(c[0], c[1], c[2], c[2] + (z1 - z0), r, burnt ? matOf('#6b5a48') : CER, toneI, .7, 24);
    // the face: silver combs with the CdS track snaking between them
    const zf = z1 + .01, comb = ring(F, 0, 0, zf, r - .25);
    let fc = fill(pd(comb), SILVER.m);
    // serpentine: along one row, step to the next at that end, back along it
    const zz = [];
    for (let i = 0; i <= 8; i++){ const b = -1.75 + i * .4375, w = Math.sqrt(Math.max(0, (r - .55) * (r - .55) - b * b)), e = i % 2 ? [w, -w] : [-w, w];
      zz.push(F.W(e[0], b, zf + .01), F.W(e[1], b, zf + .01)); }
    fc += `<path d="${pd(zz, false)}" fill="none" stroke="${burnt ? '#4a2d22' : CDS}" stroke-width="${f(1.1 + .4 * k)}" stroke-linejoin="round"/>`;
    // the two comb electrodes' busbars at the edges where the legs join
    fc += `<path d="${pd(B.circ(0, 0, r - .35, 24).slice(3, 10).map(([u, v]) => F.W(u, v, zf + .02)), false)}" fill="none" stroke="${SILVER.d}" stroke-width=".8"/>`
      + `<path d="${pd(B.circ(0, 0, r - .35, 24).slice(15, 22).map(([u, v]) => F.W(u, v, zf + .02)), false)}" fill="none" stroke="${SILVER.d}" stroke-width=".8"/>`;
    s += fc;
    // epoxy gloss (fades in see-through)
    s += `<path d="${pd(ring(F, 0, 0, zf + .03, r - .05))}" fill="#fffdf4" opacity="${f(.22 * (1 - k))}"/>`;
    // light falling on it: a warm glow that grows with the light level, a shadow when it is covered
    const [X, Y] = P(...F.W(0, 0, zf));
    if (light > .45) s += `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(3 + 9 * light)}" fill="#ffe680" opacity="${f(.12 + .3 * (light - .45))}"/>`;
    else if (light < .3) s += `<path d="${pd(ring(F, 0, 0, zf + .04, r))}" fill="#1c1a24" opacity="${f(.45 * (1 - light / .3))}"/>`;
    // see-through: charge carriers drifting along the track, as many as the conductance allows
    if (k > .3 && !burnt){
      const g = Math.min(1, Math.max(0, Math.log10(RDARK / ohmsAt(lux)) / 4)), n = Math.round(2 + 7 * g), t = (ctx.st && ctx.st.t) || 0;
      let d = '';
      for (let i = 0; i < n; i++){ const u = ((i / n) + t * .25) % 1, j = Math.min(zz.length - 2, Math.floor(u * (zz.length - 1))), w = u * (zz.length - 1) - j;
        const q = zz[j].map((v, kk) => v + (zz[j + 1][kk] - v) * w), [qx, qy] = P(...q); d += `<circle cx="${f(qx)}" cy="${f(qy)}" r=".42" fill="#1f4f9a" stroke="#f6f3ea" stroke-width=".15"/>`; }
      s += `<g opacity="${f(k)}">${d}</g>`;
    }
    if ((ctx.solo || (B.md && B.md.def && B.md.def.partPage)) && k > .5){
      ctx.label(F.W(.4, .4, zf), 'CdS track');
      ctx.label(F.W(-r + .3, 0, zf), 'Comb electrode');
      ctx.label(F.W(0, r, z0 + .8), 'Ceramic base');
    }
    ctx.put(F.bx(-3, -3, -.3, 3, 3, z1 + .2), s);
  },
  show: { breadboard: 'mini', holes: ['e8', 'e10'], params: { lux: 300 } },
});
})();
