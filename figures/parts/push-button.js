// @cf title Push button
// @cf use engine/bench.list
/* 6 x 6 mm through-hole tactile switch (Omron B3F class, the kit part with a 5 mm tall plunger). Legs ['1','2','3',
   '4'] as in Omron's drawing: 1-2 are always joined, 3-4 are always joined, and pressing the plunger joins 1-2 to
   3-4. The joined pairs face each other across the 6.5 mm direction, so on a breadboard that direction straddles the
   trench (legs bent out to 7.62 mm) and the switched pair sits on one side, 4.5 mm apart, bent to 5.08 mm (two
   columns): holes ['e8','f8','e10','f10'] give 1=e8, 2=f8, 3=e10, 4=f10, and pressing joins column 8 to column 10.
   Turned 90 degrees on one side of the trench, the switched pair lands in one strip and the switch reads "pressed"
   for ever: the solver sees that from the holes, nothing here fakes it. Rating 50 mA at 24 V DC, bounce 5 ms max,
   travel 0.25 mm. See-through: the stainless snap dome over the centre contact (3-4) inside the outer ring (1-2). */
(() => {
const B = SL.bench, T = B.T;
const CAP = { black: '#34302c', red: '#e2483d', yellow: '#f2c230', green: '#43b05c', blue: '#3e86d9', white: '#ece6d6' };
const DEF = { pressed: 0, color: 'black', fault: 'none' };
// faults the page can set; in a circuit the solver's verdict (m.state) is used unless one is set here
const FAULTS = { none: null, 'contacts burnt': 'burnt' };
const stateOf = (p, m) => FAULTS[p.fault] || (m && m.state) || null;
const DOME = { l: '#f4f6f6', m: '#c9d0d2', d: '#8e979a' };
const LIVE = '#f4b829';

// a local frame on the legs: a along leg i0 -> leg i1, b toward the front (the viewer when the legs run left to
// right), z up from the breadboard top; every breadboard placement is a multiple of 90 degrees
const frame = (legs, i0, i1) => {
  const n = legs.length, o = [0, 1, 2].map(k => legs.reduce((s, q) => s + q[k], 0) / n);
  const dx = legs[i1][0] - legs[i0][0], dy = legs[i1][1] - legs[i0][1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
  const W = (a, b, z) => [o[0] + ux * a - uy * b, o[1] + uy * a + ux * b, o[2] + z];
  return { o, W,
    loc: q => { const x = q[0] - o[0], y = q[1] - o[1]; return [x * ux + y * uy, -x * uy + y * ux]; },
    slab: (a0, b0, a1, b1, z0, z1, m, w = .6) => B.slabW(W, a0, b0, a1, b1, z0, z1, m, toneI, w),
    bx: (a0, b0, z0, a1, b1, z1) => B.aabb([W(a0, b0, z0), W(a1, b1, z1), W(a0, b1, z0), W(a1, b0, z1)]) };
};
const xrK = ctx => ctx.k != null ? ctx.k : ease(Math.min(1, Math.max(0, (ctx.st && ctx.st.xr) || 0)));
// a label pill on the side of the part its anchor is on, as seen now, so pills don't cross when it turns
const pill = (F, pt, dx, dy, text, on) => { const X = P(...pt)[0], Xc = P(...F.o)[0]; return tag(pt, (X < Xc - .5 ? -1 : X > Xc + .5 ? 1 : Math.sign(dx) || 1) * Math.abs(dx), dy, text, on); };
const ring = (F, a, b, z, r, n = 20) => B.circ(a, b, r, n).map(([u, v]) => F.W(u, v, z));

B.part('push-button', {
  name: 'Push button',
  legs: ['1', '2', '3', '4'],
  span: [0, 3],
  params: { pressed: [0, 1], color: Object.keys(CAP), fault: Object.keys(FAULTS) },
  paramNames: { color: 'Plunger colour', fault: 'Break it' },
  defaults: DEF,
  // 1-2 and 3-4 always joined; pressed joins the two pairs
  elec: p => ({ type: 'button', pressed: +p.pressed > 0, pairs: [[0, 1], [2, 3]], imax: .05, vmax: 24, bounce: .005 }),
  press: (p, down) => ({ pressed: down ? 1 : 0 }),
  tag: (p, m) => stateOf(p, m) === 'shorted' ? T('{id} · always closed: turn it 90°', { id: p.id })
    : stateOf(p, m) === 'burnt' ? T('{id} · contacts burnt', { id: p.id })
    : +p.pressed > 0 ? T('{id} · pressed', { id: p.id }) : T('{id} · released', { id: p.id }),
  draw(ctx){
    const p = Object.assign({}, DEF, ctx.p), legs = ctx.legs, k = xrK(ctx), down = +p.pressed > 0, m = ctx.m || {};
    const F = frame(legs, 0, 2), sg = v => v < 0 ? -1 : 1;
    const zl = .9, zb = 3.4, zt = 3.65, plH = down ? 1.1 : 1.35;
    const sf = stateOf(p, m), burnt = sf === 'burnt', flowing = down && !burnt && (m.i_mA || 0) > .05;
    let s = '';
    // legs: out of the two sides that face across the trench, then bent down into the holes
    for (const L of legs){ const [a, b] = F.loc(L), a0 = sg(a) * 2.25, b0 = sg(b) * 3;
      s += rod(F.W(a0, b0, zl), F.W(a, b, zl), .26, B.M.tin, toneI, .4) + rod(F.W(a, b, zl), F.W(a, b, -.3), .26, B.M.tin, toneI, .4); }
    // see-through: outer ring contact (legs 1-2, at a < 0), centre contact (legs 3-4, at a > 0), the snap dome
    if (k > .02){
      const cu = flowing ? matOf(LIVE) : burnt ? matOf('#4a3b30') : B.M.copper;
      let x = F.slab(-2.6, -3, -2.0, 3, .6, .9, cu, .35) + F.slab(2.0, -3, 2.6, 3, .6, .9, cu, .35) + F.slab(.4, -.35, 2.3, .35, .6, .9, cu, .3);
      x += fill(pd(ring(F, 0, 0, .95, 2.45)), flowing ? LIVE : B.M.copper.m) + fill(pd(ring(F, 0, 0, .97, 1.85)), '#2a2623') + fill(pd(ring(F, 0, 0, 1.0, .85)), flowing ? LIVE : B.M.copper.l);
      const domeTop = down ? 1.15 : 1.75;
      x += rod(F.W(0, 0, 1.02), F.W(0, 0, domeTop), 2.35, DOME, toneI, .4, down ? 2.1 : 1.1);
      if (flowing) x += `<path d="${pd([F.W(-2.3, -2.6, .95), F.W(-1.6, -.6, 1.05), F.W(0, 0, 1.05), F.W(1.6, .3, .95), F.W(2.3, 2.6, .95)], false)}" fill="none" stroke="${LIVE}" stroke-width="1.2" stroke-dasharray="1.2 1.6" opacity=".95"/>`;
      s += `<g opacity="${f(Math.min(1, k * 1.4))}">${x}</g>`;
    }
    // body, metal frame with its two clip tabs, plunger
    let body = F.slab(-3, -3, 3, 3, 0, zb, burnt ? matOf('#4a3b30') : B.M.black, .7) + F.slab(-3, -3, 3, 3, zb, zt, B.M.steel, .45)
      + F.slab(-1.1, -3.14, 1.1, -3, 1.3, zt, B.M.steel, .35) + F.slab(-1.1, 3, 1.1, 3.14, 1.3, zt, B.M.steel, .35);
    for (const [a, b] of [[-2.2, -2.2], [2.2, -2.2], [2.2, 2.2], [-2.2, 2.2]]) body += fill(pd(ring(F, a, b, zt + .01, .32, 8)), B.M.steel.d);
    const c0 = F.W(0, 0, zt), capM = matOf(CAP[p.color] || CAP.black);
    if (down) body += `<path d="${pd(ring(F, 0, 0, zt + .02, 2.25))}" fill="none" stroke="${LIVE}" stroke-width="1.1" opacity=".9"/>`;
    body += cyl(c0[0], c0[1], c0[2], c0[2] + plH, 1.75, capM, toneI, .6, 18);
    s += k > .02 ? `<g opacity="${f(1 - .68 * k)}">${body}</g>` : body;
    if ((ctx.solo || (B.md && B.md.def && B.md.def.partPage)) && k > .5){
      s += pill(F, F.W(0, 0, 1.6), 46, -46, T('Snap dome'), down) + pill(F, F.W(-2.3, -3, .8), -52, 16, T('Ring: pins 1–2'), flowing)
        + pill(F, F.W(2.3, 3, .8), 54, 50, T('Centre: pins 3–4'), flowing);
    }
    ctx.put(F.bx(-4.2, -4.2, -.3, 4.2, 4.2, zt + 1.4), s);
  },
  show: { breadboard: 'mini', holes: ['e8', 'f8', 'e10', 'f10'], params: { pressed: 0, color: 'black' } },
});
})();
