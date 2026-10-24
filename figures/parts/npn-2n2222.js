// @cf title 2N2222 transistor
// @cf use engine/bench.list
/* 2N2222A-family small-signal NPN in a TO-92 package, the hobby-kit PN2222A. Legs are listed left to right with
   the flat, printed face toward you and the leads down: PN2222A (Fairchild-origin sheet) is E B C; onsemi's
   P2N2222A is C B E, so the pin order is a parameter ("pinout") and a wrong guess is a real, reachable fault.
   Package (JEDEC TO-92, typical): 4.8 mm wide, 4.8 mm tall, 3.8 mm from the flat face to the round back, 0.45 mm
   leads 1.27 mm apart at the body, bent out to the 2.54 mm breadboard pitch; the body sits about 3 mm up.
   Ratings (P2N2222A / PN2222A sheets): VCEO 40 V, VCBO 75 V, VEBO 6 V, IC 600 mA continuous, 625 mW at 25 °C
   (200 °C/W in free air), TJ 150 °C; hFE 100-300 at 150 mA (VCE 10 V), 50 min at 150 mA (VCE 1 V);
   VCE(sat) <= 0.3 V at 150 mA / 15 mA and <= 1.0 V at 500 mA / 50 mA; VBE(sat) 0.6-1.2 V at 150 mA / 15 mA.
   Switching rule the lessons teach: saturate it with IB about IC / 10 (forced beta 10, the sheet's test point).

   Solver contract (FIGURES-BENCH §9, type 'npn'): as tip120.js. elec(p).pins maps B/C/E to hole indexes for the
   chosen pinout (and 'reversed'). m = { state, ib_mA, ic_mA, vce, p_W }, state 'off' | 'on' | 'linear' | 'reverse' |
   'overdrive' | 'hot' (above 0.5 W) | 'burnt' (junction past 150 °C, or IC far above 600 mA: it fails open or
   short). */
(() => {
const B = SL.bench, T = B.T;
const callouts = ctx => !!ctx.sel || !!(B.md && B.md.def && B.md.def.partPage);
const HFE = 100, THETA = 200;
const log10 = Math.log10;
// typical curves, approximate (inside the sheet's limits above)
const vbe = ic => Math.min(1.2, Math.max(.6, .75 + .06 * log10(Math.max(ic, 1e-4) / .1)));
const vcesat = ic => .05 + .45 * Math.max(0, ic);          // 0.12 V at 150 mA, 0.28 V at 500 mA (typical)
const lowSide = (vcc, rLoad, ib) => {
  const want = Math.max(0, vcc) / Math.max(rLoad, .01), drive = HFE * Math.max(0, ib);
  if (drive <= 0 || want <= 0) return { ic: 0, vce: Math.max(0, vcc), sat: false };
  let ic = Math.min(drive, want);
  for (let k = 0; k < 8; k++) ic = Math.min(drive, Math.max(0, vcc - vcesat(ic)) / Math.max(rLoad, .01));
  return { ic, vce: Math.max(vcesat(ic), vcc - ic * rLoad), sat: ic < drive * .98 };
};
const tj = (pW, ta = 25) => ta + THETA * pW;
const ORDER = { EBC: { E: 0, B: 1, C: 2 }, CBE: { C: 0, B: 1, E: 2 } };
const NAME = { EBC: 'PN2222A', CBE: 'P2N2222A' };
const DEMO = { off: { state: 'off', ic_mA: 0 }, 'switching 100 mA': { state: 'on', ib_mA: 10, ic_mA: 100, vce: .1, p_W: .01 },
  'half on: hot (150 mA at 4 V)': { state: 'hot', ib_mA: 1.5, ic_mA: 150, vce: 4, p_W: .6 }, burnt: { state: 'burnt', ic_mA: 0 } };
const meas = (p, m) => (m && m.state ? m : DEMO[p.demo] || m || {});
const EPOXY = { l: '#4a4642', m: '#34312e', d: '#1f1d1b' }, SI = { l: '#7b8cab', m: '#566684', d: '#323d55' }, GOLD = '#e0b54a';
B.part('npn-2n2222', {
  name: '2N2222 transistor', legs: ['1', '2', '3'], span: [2, 2],
  params: { pinout: ['EBC', 'CBE'], reversed: [false, true], demo: Object.keys(DEMO) },
  paramNames: { pinout: 'Pinout', reversed: 'Put in backwards', demo: 'Show' },
  elec: p => { const o = ORDER[p.pinout] || ORDER.EBC, pins = {}; for (const [kname, i] of Object.entries(o)) pins[kname] = p.reversed ? 2 - i : i;
    return { type: 'npn', pins, hfe: HFE, vbe: .7, vcesat: .2, icmax: .6, vceo: 40, vebo: 6, pmax: .625, theta: THETA, tjmax: 150 }; },
  model: { vbe, vcesat, lowSide, tj, hfe: HFE },
  tag: (p, m0) => {
    const m = meas(p, m0), id = p.id, st = m.state;
    if (st === 'burnt') return T('{id} · burnt', { id });
    if (st === 'hot') return T('{id} · hot: {w} W', { id, w: (+m.p_W || 0).toFixed(2) });
    if (st === 'reverse') return T('{id} · C and E swapped', { id });
    if (st === 'overdrive') return T('{id} · base on the load side', { id });
    if ((st === 'on' || st === 'linear') && m.ic_mA > 0) return T('{id} · {n} mA', { id, n: Math.round(m.ic_mA) });
    return id;
  },
  draw(ctx){
    const p = ctx.p, L = p.reversed ? ctx.legs.slice().reverse() : ctx.legs, m = meas(p, ctx.m), k = ctx.k != null ? ctx.k : (ctx.st && ctx.st.xr) || 0;
    const a = L[0], c = L[L.length - 1], mid = L[1] || [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2, a[2]];
    const d = [c[0] - a[0], c[1] - a[1]], len = Math.hypot(...d) || 1, u = [d[0] / len, d[1] / len, 0], n = [-u[1], u[0], 0];
    const W = (x, y, z) => [mid[0] + u[0] * x + n[0] * y, mid[1] + u[1] * x + n[1] * y, mid[2] + z];
    const z0 = 3, z1 = z0 + 4.8, yf = 1.4, R = 2.4;
    const burnt = m.state === 'burnt', hot = m.state === 'hot' || burnt, on = (m.state === 'on' || m.state === 'linear') && m.ic_mA > 0;
    const pinout = ORDER[p.pinout] ? p.pinout : 'EBC';
    // legs: straight into the holes, the outer two bent in to 1.27 mm under the body
    let leads = '';
    L.forEach((h, i) => { const xb = (i - 1) * 1.27, kneeZ = 1.6;
      leads += rod(h, [h[0], h[1], h[2] + kneeZ], .23, B.M.tin, toneI, .4) + rod([h[0], h[1], h[2] + kneeZ], W(xb, 0, z0 - .6), .23, B.M.tin, toneI, .4) + rod(W(xb, 0, z0 - .6), W(xb, 0, z0), .23, B.M.tin, toneI, .4); });
    // D-shaped body: semicircle at the back, straight sides, the flat printed face at the front
    const ring = z => { const pts = [W(R, yf, z)]; for (let i = 0; i <= 14; i++){ const q = i / 14 * Math.PI; pts.push(W(R * Math.cos(q), -R * Math.sin(q), z)); } pts.push(W(-R, yf, z)); return pts; };
    const A0 = ring(z0), A1 = ring(z1), mat = hot ? matOf(burnt ? '#2b2420' : '#5b3b30') : EPOXY;
    let body = loft(A0, A1, nr => toneI(nr, mat)) + fill(pd(A1), toneI([0, 0, 1], mat)) + hullInk([...A0, ...A1], 1) + ink(pd(A1), .7);
    if (vis(n) && k < .5){
      const U = Dv(u[0], u[1], 0), V = Dv(0, 0, -1), t1 = P(...W(0, yf + .02, z1 - 1.7)), t2 = P(...W(0, yf + .02, z1 - 3.3));
      const lbl = (pinout === 'EBC' ? 'EBC' : 'CBE').split('');
      body += `<text transform="${txM(t1, U, V)}" font-size=".8" fill="#d9d4ca" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="800">${NAME[pinout]}</text>`
        + `<text transform="${txM(t2, U, V)}" font-size=".8" fill="#a8a296" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="700">${lbl.join(' ')}</text>`;
    }
    if (k > .02){
      // inside: the die sits on the collector lead (its back is the collector); gold wires go to base and emitter
      const ord = ORDER[pinout], xs = i => (i - 1) * 1.27, xc = xs(ord.C), xb = xs(ord.B), xe = xs(ord.E);
      let ins = '';
      for (const x of [xc, xb, xe]) ins += B.slabW(W, x - .3, -.2, x + .3, .2, z0, z0 + (x === xc ? 2.6 : 1.8), B.M.tin, toneI, .35);
      ins += B.slabW(W, xc - .55, -.25, xc + .55, .25, z0 + 2.6, z0 + 3.0, SI, toneI, .4);
      const wire = x => { const p0 = W(xc, .3, z0 + 3.0), p1 = W(x, .2, z0 + 1.8), pm = W((xc + x) / 2, .8, z0 + 3.7);
        return `<path d="M${P(...p0).map(f).join(' ')}Q${P(...pm).map(f).join(' ')} ${P(...p1).map(f).join(' ')}" fill="none" stroke="${GOLD}" stroke-width=".7"/>`; };
      ins += wire(xb) + wire(xe);
      if (on){ const [X, Y] = P(...W(xc, .3, z0 + 2.9)); ins += `<circle cx="${f(X)}" cy="${f(Y)}" r="2" fill="#ffd34d" opacity=".6"/>`; }
      body = `<g opacity="${f(1 - .7 * k)}">${body}</g><g opacity="${f(k)}">${ins}</g>`;
      if (k > .5 && callouts(ctx)) body += tag(W(xc, .3, z0 + 2.9), 30, -30, 'Silicon die on the collector lead', on) + tag(W((xb + xe) / 2, .8, z0 + 3.4), -36, -22, 'Gold bond wires');
    }
    if (burnt){ const [X, Y] = P(...W(0, 0, z1)); body += `<circle cx="${f(X)}" cy="${f(Y - 4)}" r="2.8" fill="#8a847a" opacity=".45"/>`; }
    ctx.put(B.aabb([W(-2.8, -.4, 0), W(2.8, .4, z0)]), leads);
    ctx.put(B.aabb([W(-R, -R, z0), W(R, yf, z1)]), body);
  },
  fig: 'P12',
  example: { pinout: 'EBC' },
  show: { breadboard: 'mini', parts: [
    { id: 'Q1', part: 'npn-2n2222', pinout: 'EBC', holes: ['c4', 'c5', 'c6'] },
    { id: 'Q2', part: 'npn-2n2222', pinout: 'CBE', holes: ['c12', 'c13', 'c14'] },
  ], wires: [] },
});
})();
