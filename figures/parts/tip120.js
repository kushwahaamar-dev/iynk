// @cf title TIP120 Darlington transistor
// @cf use engine/bench.list
/* TIP120 NPN Darlington in a TO-220 package. Legs [B, C, E]: with the printed face toward you and the leads down,
   1 base (left), 2 collector (middle), 3 emitter (right); the metal tab on the back is the collector too. Package
   (JEDEC TO-220AB, typical): epoxy body 10.0 x 9.0 x 4.5 mm, 1.27 mm copper tab rising to 15.5 mm with a 3.7 mm hole,
   0.8 mm leads at 2.54 mm. On a breadboard the shoulders of the leads hold the body about 4.5 mm up.
   Fairchild sheet: VCEO 60 V, VEBO 5 V, IC 5 A (8 A pulse), IB 120 mA, 2 W free air (65 W on an infinite heatsink),
   TJ 150 °C, hFE >= 1000, VCE(sat) <= 2.0 V at 3 A / 12 mA, VBE(on) <= 2.5 V at 3 A. One die holds both transistors,
   R1 about 8 kOhm (driver B-E) and R2 about 120 Ohm (output B-E). At lesson currents (0.1-0.3 A) the typical curves
   give VBE 1.2-1.4 V and VCE(sat) 0.7-1.0 V, so a 5 V motor through it sees about 4 V. Facts: la-components.md §11.

   Solver contract (FIGURES-BENCH §9, type 'npn'): elec(p).pins maps B/C/E to hole indexes ('reversed' turns the
   part: E and B change places). The solver reports m = { state, ib_mA, ic_mA, vce, p_W }, state 'off', 'on'
   (saturated switch), 'linear' (base current too small for the load), 'reverse' (collector and emitter swapped:
   inverted gain, the load barely runs), 'overdrive' (pin wired to the collector, the load hangs on the pin),
   'hot' (above 1.5 W in free air) or 'burnt' (junction past 150 °C: it fails short C-E). */
(() => {
const B = SL.bench, T = B.T;
const callouts = ctx => typeof ctx.label === 'function' && (!!ctx.sel || !!(B.md && B.md.def && B.md.def.partPage));
const HFE = 1000, THETA = 62.5;                          // free-air °C/W: 2 W lifts the junction from 25 to 150 °C
const log10 = Math.log10;
// typical curves, approximate (fits through the points named above)
const vbe = ic => Math.max(1.0, 1.4 + .25 * log10(Math.max(ic, 1e-3)));
const vcesat = ic => Math.max(.6, .9 + .25 * log10(Math.max(ic, 1e-3)));
// a low-side switch: supply vcc through a load of rLoad ohms into the collector, base fed with ib amps
const lowSide = (vcc, rLoad, ib) => {
  const want = Math.max(0, vcc) / Math.max(rLoad, .01), drive = HFE * Math.max(0, ib);
  if (drive <= 0 || want <= 0) return { ic: 0, vce: Math.max(0, vcc), sat: false };
  let ic = Math.min(drive, want);
  for (let k = 0; k < 8; k++){ const vs = vcesat(ic); ic = Math.min(drive, Math.max(0, vcc - vs) / Math.max(rLoad, .01)); }
  const vce = Math.max(vcesat(ic), vcc - ic * rLoad);
  return { ic, vce, sat: ic < drive * .98 };
};
const tj = (pW, ta = 25) => ta + THETA * pW;
const EPOXY = { l: '#4a4642', m: '#34312e', d: '#1f1d1b' }, TAB = { l: '#eceeee', m: '#c1c7c9', d: '#7c8487' };
const SI = { l: '#7b8cab', m: '#566684', d: '#323d55' }, AL = '#c9cdd0';
// part-page states, with the numbers the model gives (1 kOhm from a 5 V pin: IB 3.7 mA)
const DEMO = { off: { state: 'off', ic_mA: 0 }, 'switching 200 mA': { state: 'on', ib_mA: 3.7, ic_mA: 200, vce: .73, p_W: .15 },
  'overheating (2 A, no heatsink)': { state: 'hot', ib_mA: 3.7, ic_mA: 2000, vce: .98, p_W: 1.95 }, burnt: { state: 'burnt', ic_mA: 0 } };
const meas = (p, m) => (m && m.state ? m : DEMO[p.demo] || m || {});
B.part('tip120', {
  name: 'TIP120 transistor', legs: ['B', 'C', 'E'], span: [2, 2],
  params: { reversed: [false, true], demo: Object.keys(DEMO) },
  paramNames: { reversed: 'Put in backwards', demo: 'Show' },
  elec: p => ({ type: 'npn', darlington: true, pins: p.reversed ? { B: 2, C: 1, E: 0 } : { B: 0, C: 1, E: 2 },
    hfe: HFE, vbe: 1.3, vcesat: .9, icmax: 5, ibmax: .12, vceo: 60, vebo: 5, pmax: 2, theta: THETA, tjmax: 150, rBE: [8000, 120] }),
  model: { vbe, vcesat, lowSide, tj, hfe: HFE },
  tag: (p, m0) => {
    const m = meas(p, m0), id = p.id, st = m.state;
    if (st === 'burnt') return T('{id} · burnt', { id });
    if (st === 'hot') return T('{id} · hot: {w} W', { id, w: (+m.p_W || 0).toFixed(1) });
    if (st === 'reverse') return T('{id} · C and E swapped', { id });
    if (st === 'overdrive') return T('{id} · base on the motor side', { id });
    if ((st === 'on' || st === 'linear') && m.ic_mA > 0) return T('{id} · {n} mA', { id, n: Math.round(m.ic_mA) });
    return id;
  },
  draw(ctx){
    const L = ctx.p.reversed ? ctx.legs.slice().reverse() : ctx.legs, m = meas(ctx.p, ctx.m), k = ctx.k != null ? ctx.k : (ctx.st && ctx.st.xr) || 0, t = (ctx.st && ctx.st.t) || 0;
    const a = L[0], c = L[L.length - 1], mid = L[1] || [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, a[2]];
    const d = [c[0] - a[0], c[1] - a[1]], len = Math.hypot(...d) || 1, u = [d[0] / len, d[1] / len, 0], n = [-u[1], u[0], 0];
    const W = (x, y, z) => [mid[0] + u[0] * x + n[0] * y, mid[1] + u[1] * x + n[1] * y, mid[2] + z];
    const z0 = 4.5, zb = z0 + 9, zt = z0 + 15.5, yb = -2.75, yt = -1.48, yf = 1.75;
    const burnt = m.state === 'burnt', hot = m.state === 'hot' || burnt, on = (m.state === 'on' || m.state === 'linear') && m.ic_mA > 0;
    const items = [];
    // leads: narrow from the hole, the wide shoulder under the body
    let leads = '';
    L.forEach((h, i) => { const x = (i - 1) * 2.54, top = W(x, 0, z0), sh = W(x, 0, z0 - 2.2);
      leads += rod(h, [h[0], h[1], h[2] + 1.4], .36, B.M.tin, toneI, .45) + rod([h[0], h[1], h[2] + 1.4], sh, .36, B.M.tin, toneI, .45) + B.slabW(W, x - .65, -.25, x + .65, .25, z0 - 2.2, z0, B.M.tin, toneI, .45);
      void top; });
    items.push({ box: B.aabb([W(-3.4, -1, 0), W(3.4, 1, z0)]), svg: leads });
    // tab (collector) across the whole back, with its hole
    let tab = B.slabW(W, -5, yb, 5, yt, z0, zt, TAB, toneI, .9);
    const hole = y => { const pts = []; for (let i = 0; i < 18; i++){ const q = i / 18 * 2 * Math.PI; pts.push(W(1.85 * Math.cos(q), y, zt - 2.8 + 1.85 * Math.sin(q))); } return pts; };
    if (vis([-n[0], -n[1], 0])) tab += shape(hole(yb - .01), B.M.hole, .7);
    if (vis(n)) tab += shape(hole(yt + .01), B.M.hole, .7);
    // epoxy body with its marking on the front face
    const epoxy = hot ? matOf(burnt ? '#2b2420' : '#5b3b30') : EPOXY;
    let body = B.slabW(W, -5, yt, 5, yf, z0, zb, epoxy, toneI, 1.1);
    if (vis(n) && k < .5){
      const o = P(...W(0, yf + .02, zb - 3.2)), o2 = P(...W(0, yf + .02, zb - 5.4));
      const U = Dv(u[0], u[1], 0), V = Dv(0, 0, -1);
      body += `<text transform="${txM(o, U, V)}" font-size="1.55" fill="#d9d4ca" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="800">TIP120</text>`
        + `<text transform="${txM(o2, U, V)}" font-size="1.1" fill="#a8a296" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="700">B C E</text>`;
    }
    if (k > .02){
      // inside: one silicon die soldered to the tab (collector), two transistors and two resistors on it,
      // aluminium bond wires from its base and emitter pads to leads 1 and 3; lead 2 is the tab itself
      const dz = z0 + 4.4, yd = yt + .05;
      let ins = B.slabW(W, -1.8, yt, 1.8, yt + .35, dz - 1.8, dz + 1.8, SI, toneI, .6)
        + B.slabW(W, -1.5, yt + .35, -.2, yt + .4, dz - 1.1, dz + 1.3, matOf(on ? '#9fb2d6' : '#6f80a3'), toneI, .4)
        + B.slabW(W, .2, yt + .35, 1.5, yt + .4, dz - 1.1, dz + 1.3, matOf(on ? '#c6d4ee' : '#7f90b3'), toneI, .4)
        + B.slabW(W, -1.5, yt + .35, 1.5, yt + .42, dz - 1.6, dz - 1.3, matOf('#b58b4c'), toneI, .3);
      const wire = (x0, z1, x1) => { const p0 = W(x0, yd + .4, z1), p1 = W(x1, .2, z0 + .3), pm = W((x0 + x1) / 2, yd + 1.4, (z1 + z0) / 2 + .8);
        return `<path d="M${P(...p0).map(f).join(' ')}Q${P(...pm).map(f).join(' ')} ${P(...p1).map(f).join(' ')}" fill="none" stroke="${AL}" stroke-width=".9"/>`; };
      ins += wire(-.9, dz + 1.5, -2.54) + wire(.9, dz - 1.45, 2.54);
      // the middle lead joins the tab inside the body
      ins += B.slabW(W, -.5, yt, .5, 0, z0, z0 + 1.6, B.M.tin, toneI, .4);
      if (on){ const q = (t * 1.6) % 1, pe = W(.9 + (2.54 - .9) * q, yd + .6, dz - 1.45 - (dz - 1.45 - z0) * q), [X, Y] = P(...pe);
        ins += `<circle cx="${f(X)}" cy="${f(Y)}" r="1.1" fill="#ffd34d"/>`; }
      body = `<g opacity="${f(1 - .7 * k)}">${body}</g><g opacity="${f(k)}">${ins}</g>`;
      if (k > .5 && callouts(ctx)){
        ctx.label(W(-.85, yt + .4, dz + .2), 'Q1 driver transistor', on);
        ctx.label(W(.85, yt + .4, dz + .2), 'Q2 output transistor', on);
        ctx.label(W(0, yb, zt - 1), 'Tab = collector');
        ctx.label(W(-1.8, .6, z0 + 1.5), 'Base bond wire');
      }
    }
    if (hot && !burnt){ const [X, Y] = P(...W(0, yf, zb + 1)); body += `<path d="M${f(X - 3)} ${f(Y)}q2 -3 0 -6q-2 -3 0 -6M${f(X + 2)} ${f(Y - 1)}q2 -3 0 -6q-2 -3 0 -6" fill="none" stroke="#e2483d" stroke-width=".8" opacity=".7"/>`; }
    if (burnt){ const [X, Y] = P(...W(0, yf, zt)); body += `<circle cx="${f(X)}" cy="${f(Y - 5)}" r="3.4" fill="#8a847a" opacity=".45"/><circle cx="${f(X + 3)}" cy="${f(Y - 10)}" r="2.4" fill="#8a847a" opacity=".3"/>`; }
    if (on && k < .5){ const [X, Y] = P(...W(0, yf, zb - 1.2)); body += `<circle cx="${f(X)}" cy="${f(Y)}" r=".9" fill="#ffd34d" opacity="${f(Math.min(1, .3 + m.ic_mA / 600))}"/>`; }
    items.push({ box: B.aabb([W(-5, yb, z0), W(5, yt, zt)]), svg: tab });
    items.push({ box: B.aabb([W(-5, yt, z0), W(5, yf, zb)]), svg: body });
    for (const it of items) ctx.put(it.box, it.svg);
  },
  fig: 'P11',
  example: { reversed: false },
  show: { breadboard: 'mini', parts: [{ id: 'Q1', part: 'tip120', holes: ['c8', 'c9', 'c10'] }], wires: [] },
});
})();
