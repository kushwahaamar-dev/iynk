// @cf title 1N4007 rectifier diode
// @cf use engine/bench.list
/* 1N4001-1N4007 rectifier diode, DO-41 axial: black epoxy body 4.8 x 2.6 mm (4.1-5.2 x 2.0-2.7 mm), 0.8 mm tinned
   leads, a silver band at the cathode end. Legs [anode, cathode]. Diodes Inc. sheet: IF(AV) 1 A, IFSM 30 A (8.3 ms),
   VF <= 1.0 V at 1 A, VRRM 50 V (4001) to 1000 V (4007). Forward curve from the usual SPICE fit (IS 7.03 nA,
   N 1.81, RS 34 mOhm): 0.56 V at 1 mA, 0.66 V at 10 mA, 0.81 V at 0.2 A, 0.91 V at 1 A.
   Jobs in the lessons: the flyback diode across a motor or fan (band to the + supply, anode to the transistor's
   collector) and reverse-polarity protection in series with a supply. Facts: docs/facts/la-components.md §12, §13.

   Solver contract (FIGURES-BENCH §9, type 'diode'): the solver reports m = { state, i_mA, v }, where state is
   'ok' (conducting forward), 'off' (no current), 'block' (reverse biased while it stops a load's current),
   'clamp' (carrying a motor's flyback current at switch-off) or 'burnt' (average current above 1 A, or a surge
   above 30 A: it fails short, then open). */
(() => {
const B = SL.bench, T = B.T;
const callouts = ctx => !!ctx.sel || !!(B.md && B.md.def && B.md.def.partPage);
const IS = 7.03e-9, NVT = 1.808 * 0.025852, RS = 0.0342;
const VRRM = { '1N4001': 50, '1N4002': 100, '1N4003': 200, '1N4004': 400, '1N4005': 600, '1N4006': 800, '1N4007': 1000 };
// forward drop at a current (A), and the current at a drop (V), from the fit above
const vf = i => (i > 0 ? NVT * Math.log(1 + i / IS) + i * RS : 0);
const iAt = v => { if (v <= 0) return 0; let lo = 0, hi = 30; for (let k = 0; k < 60; k++){ const m = (lo + hi) / 2; if (vf(m) > v) hi = m; else lo = m; } return lo; };
const EPOXY = { l: '#4a4642', m: '#34312e', d: '#1f1d1b' }, BAND = { l: '#e7e9e6', m: '#c3c7c3', d: '#878c88' };
const SI = { l: '#6f7f9a', m: '#4f5d78', d: '#2f3a50' };
const DEMO = { off: { state: 'off', i_mA: 0 }, 'conducting 200 mA': { state: 'ok', i_mA: 200, v: .81 }, blocking: { state: 'block', i_mA: 0 },
  'clamping a motor spike': { state: 'clamp', i_mA: 200 }, burnt: { state: 'burnt', i_mA: 0 } };
const meas = (p, m) => (m && m.state ? m : DEMO[p.demo] || m || {});
B.part('diode-1n4007', {
  name: '1N4007 diode', legs: ['A', 'K'], span: [3, 8],
  params: { type: Object.keys(VRRM), demo: Object.keys(DEMO) },
  paramNames: { type: 'Type', demo: 'Show' },
  elec: p => ({ type: 'diode', vf: 0.8, is: IS, n: 1.808, rs: RS, imax: 1, isurge: 30, vrrm: VRRM[p.type] || 1000, polar: true }),
  model: { vf, iAt, imax: 1, isurge: 30 },
  tag: (p, m0) => {
    const m = meas(p, m0), id = p.id;
    if (!m.state) return id;
    if (m.state === 'burnt') return T('{id} · burnt', { id });
    if (m.state === 'block') return T('{id} · blocking', { id });
    if (m.state === 'clamp') return T('{id} · clamping the motor spike', { id });
    if (m.state === 'ok' && m.i_mA > 0) return T('{id} · {v} V · {n} mA', { id, v: (m.v != null ? m.v : vf(m.i_mA / 1000)).toFixed(2), n: Math.round(m.i_mA) });
    return id;
  },
  draw(ctx){
    const [a, b] = ctx.legs, p = ctx.p, m = meas(p, ctx.m), k = ctx.k != null ? ctx.k : (ctx.st && ctx.st.xr) || 0;
    const burnt = m.state === 'burnt', z = 2.5, d = [b[0] - a[0], b[1] - a[1]], len = Math.hypot(...d) || 1, u = [d[0] / len, d[1] / len];
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, a[2] + z], half = Math.min(2.4, len / 2 - 1.2);
    const at = t => [mid[0] + u[0] * t, mid[1] + u[1] * t, mid[2]];
    const c0 = at(-half), c1 = at(half), lead = .39;
    // legs: down from the holes, a bend, then along the axis into the body
    let s = rod(a, [a[0], a[1], a[2] + z - .4], lead, B.M.tin, toneI, .45) + rod([a[0], a[1], a[2] + z - .4], c0, lead, B.M.tin, toneI, .45)
      + rod(b, [b[0], b[1], b[2] + z - .4], lead, B.M.tin, toneI, .45) + rod([b[0], b[1], b[2] + z - .4], c1, lead, B.M.tin, toneI, .45);
    // the body, ghosted in see-through
    let body = rod(c0, at(half - 1.25), 1.3, burnt ? matOf('#2a2420') : EPOXY, toneI, .8) + rod(at(half - 1.25), at(half - .45), 1.31, BAND, toneI, .5)
      + rod(at(half - .45), c1, 1.3, burnt ? matOf('#2a2420') : EPOXY, toneI, .8);
    // marking along the top of the body, reading from anode to cathode (board direction = inverse of B.wdir)
    if (k < .5) body += B.flatText([mid[0] - u[0] * .5, mid[1] - u[1] * .5, mid[2] + 1.32], -u[1], -u[0], (p.type || '1N4007').replace(/^1N/, ''), .9, '#cfcac0', 700);
    if (k > .02){
      // inside: two tinned lead slugs and the glass-passivated PN chip between them
      const ins = rod(at(-half + .1), at(-.25), .62, B.M.tin, toneI, .5) + rod(at(.25), at(half - .1), .62, B.M.tin, toneI, .5)
        + rod(at(-.25), at(.25), .78, SI, toneI, .5) + (m.state === 'ok' || m.state === 'clamp' ? `<circle cx="${f(P(...mid)[0])}" cy="${f(P(...mid)[1])}" r="2.2" fill="#ffd34d" opacity=".55"/>` : '');
      body = `<g opacity="${f(1 - .65 * k)}">${body}</g>` + `<g opacity="${f(k)}">${ins}</g>`;
      if (k > .5 && callouts(ctx)) body += tag(mid, 26, -30, 'Silicon PN chip', m.state === 'ok' || m.state === 'clamp') + tag(at(half + .4), 30, 18, 'Cathode band');
    }
    s += body;
    if (burnt){ const [X, Y] = P(mid[0], mid[1], mid[2] + 2); s += `<circle cx="${f(X)}" cy="${f(Y - 4)}" r="3" fill="#8a847a" opacity=".45"/><circle cx="${f(X + 3)}" cy="${f(Y - 8)}" r="2.2" fill="#8a847a" opacity=".3"/>`; }
    const lo = [Math.min(a[0], b[0]) - 1.4, Math.min(a[1], b[1]) - 1.4, a[2]], hi = [Math.max(a[0], b[0]) + 1.4, Math.max(a[1], b[1]) + 1.4, a[2] + z + 1.4];
    ctx.put([lo, hi], s);
  },
  fig: 'P13',
  example: { type: '1N4007' },
  show: { breadboard: 'mini', parts: [
    { id: 'D1', part: 'diode-1n4007', type: '1N4007', holes: ['c4', 'c9'] },
    { id: 'D2', part: 'diode-1n4007', type: '1N4001', holes: ['h9', 'h14'] },
  ], wires: [] },
});
})();
