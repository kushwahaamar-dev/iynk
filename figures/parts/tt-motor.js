// @cf title TT gear motor
// @cf use engine/bench.list
/* The yellow "TT" gear motor every robot kit uses (3-6 V, 1:48 plastic gearbox) with its 65 mm yellow wheel, standing
   on a wooden block on the mat so the wheel turns in the air. Gearbox 45 x 18.8 x 22.5 mm, a 130-size motor can (20 mm
   across, flats 15 mm apart) sticking out of the back, a double D-shaft through the gearbox 11 mm from its front end.
   Wheel: 65 mm across, 26 mm wide, black rubber tyre on a yellow six-window rim. Legs [+, -]: a red and a black lead
   from the two motor tabs, ending in two breadboard holes (or on the mat for a bench that wires them itself).
   Numbers (Adafruit 3777 measurements, docs/facts/la-components.md §13): about 160 mA with the wheel free at 6 V,
   about 220 rpm at the wheel, over 1 A held still or for the instant it starts. `model.steady(v)` gives its speed and
   current at an average voltage; the bench that drives it says what it does through m = { state, v, i_mA, rpm } (its model readings by part id):
   state 'off' | 'ok' | 'stall' | 'over' | 'burnt' | 'spike' (switched off with no flyback diode), v the average volts
   from + to - (negative turns it backwards), rpm at the wheel. */
(() => {
const B = SL.bench, T = B.T;
const callouts = ctx => typeof ctx.label === 'function' && (!!ctx.sel || !!(B.md && B.md.def && B.md.def.partPage));
const RPM_AT_6V = 220, WHEEL_R = 32.5, WHEEL_W = 26, ZS = 34.5;
// steady state at an average voltage v (benches call it through B.parts['tt-motor'].model): winding 4 Ω, so a held
// wheel draws 1.5 A at 6 V; back-EMF 24.4 mV per wheel rpm and a running current of 130-160 mA (gear friction rises
// with speed) give 160 mA and 220 rpm at 6 V. Below 1 V it does not start, below 0.6 V it stops.
const R = 4, KE = .02436, VSTART = 1, VSTOP = .6, VMAX = 9;
const i0 = rpm => .13 + .03 * Math.min(2, Math.abs(rpm) / RPM_AT_6V);
const steady = (v, held = false) => {
  const av = Math.abs(v), sg = Math.sign(v) || 1;
  if (held || av < VSTOP) return { rpm: 0, i: sg * av / R };
  let rpm = 0;
  for (let k = 0; k < 10; k++) rpm = Math.max(0, (av - i0(rpm) * R) / KE);
  return { rpm: sg * rpm, i: sg * (av - KE * rpm) / R };
};
const YELLOW = { l: '#f6cf3e', m: '#dcae22', d: '#93700f' }, RUBBER = { l: '#55514c', m: '#3b3834', d: '#24221f' };
const CAN = { l: '#eef0f0', m: '#c3c9cb', d: '#7d878a' }, WOOD = { l: '#e3c79a', m: '#c9a874', d: '#8f7449' }, WHITE = B.M.white;
// footprint in the motor's own frame (x along the gearbox, y along the shaft, wheel on +y): the origin sits in its middle
const X0 = -58, X1 = WHEEL_R, Y0 = -9.4, Y1 = 11 + WHEEL_W, CX = (X0 + X1) / 2, CY = (Y0 + Y1) / 2;

const DEMO = {
  stopped: { state: 'off', v: 0, i_mA: 0, rpm: 0 },
  half: { state: 'ok', v: 3, i_mA: 130, rpm: 105 },
  full: { state: 'ok', v: 6, i_mA: 160, rpm: RPM_AT_6V },
  reversed: { state: 'ok', v: -6, i_mA: 160, rpm: -RPM_AT_6V },
  stalled: { state: 'stall', v: 5.4, i_mA: 1100, rpm: 0 },
  burnt: { state: 'burnt', v: 0, i_mA: 0, rpm: 0 },
};
// what the motor is doing: the solver's result, else the bench model's reading for this part, else the page demo
const sense = ctx => {
  const m = ctx.m || {}, st = ctx.st || {}, p = ctx.p;
  if (m.state) return m;
  const r = (st.readings || {})[p.id];
  if (r && r.state) return r;
  return DEMO[p.demo] || DEMO.stopped;
};
// the wheel's angle, integrated on the figure clock (eased so it spins up and coasts down)
const motion = (st, id, rpm) => {
  const all = st.drv || (st.drv = {}), s = all[id] || (all[id] = { rpm: 0, a: 0, t: st.t || 0 });
  let dt = (st.t || 0) - s.t; s.t = st.t || 0;
  if (!(dt > 0) || dt > .5) dt = 0;
  s.rpm += (rpm - s.rpm) * (1 - Math.exp(-dt / .25));
  // drawn at most one turn a second: faster shows as motion arcs on the tyre
  s.a = (s.a + Math.sign(s.rpm) * Math.min(Math.abs(s.rpm), 60) * 6 * dt) % 360;
  return s;
};

B.part('tt-motor', {
  name: 'TT gear motor', fig: 'P20', legs: ['+', '-'], span: [1, 30],
  params: { demo: Object.keys(DEMO) },
  paramNames: { demo: 'Show' },
  example: { demo: 'full' },
  model: { steady, R, KE, VSTART, VSTOP, VMAX, RPM_AT_6V },
  foot: [X1 - X0, Y1 - Y0, ZS + WHEEL_R],
  matSize: [X1 - X0, Y1 - Y0],
  show: { breadboard: 'mini', parts: [{ id: 'M1', part: 'tt-motor', at: [10, -40], rot: 90, demo: 'full', holes: ['c4', 'c8'] }], wires: [] },
  tag: (p, m) => {
    const id = p.id; if (!m || !m.state) return id;
    if (m.state === 'burnt') return T('{id} · burnt out', { id });
    if (m.state === 'stall') return T('{id} · stalled: {n} mA', { id, n: Math.round(m.i_mA || 0) });
    if (m.state === 'over') return T('{id} · {v} V: too much', { id, v: Math.abs(m.v || 0).toFixed(1) });
    if (m.state === 'spike') return T('{id} · no flyback diode', { id });
    if (m.state === 'ok' && m.rpm) return T('{id} · {n} rpm', { id, n: Math.round(Math.abs(m.rpm)) });
    return id;
  },
  draw(ctx){
    const p = ctx.p, st = ctx.st || {}, k = ctx.k != null ? ctx.k : st.xr || 0, legs = ctx.legs || [];
    const m = sense(ctx), burnt = m.state === 'burnt';
    const live = !!(ctx.m && ctx.m.state) || !!((st.readings || {})[p.id]);
    const mo = motion(st, p.id, m.state === 'ok' || m.state === 'over' || m.state === 'spike' ? +m.rpm || 0 : 0);
    const rpm = live ? mo.rpm : +m.rpm || 0, ang = (live ? mo.a : 20) * Math.PI / 180;
    const o = ctx.origin || legs[0] || [0, 0, 0], r = (+p.rot || 0) * Math.PI / 180, ax = [Math.cos(r), Math.sin(r), 0], ay = [-ax[1], ax[0], 0];
    const W = (x, y, z) => { const a = x - CX, b = y - CY; return [o[0] + ax[0] * a + ay[0] * b, o[1] + ax[1] * a + ay[1] * b, o[2] + z]; };
    const items = [], put = (box, svg) => items.push({ box, svg });
    const z0 = ZS - 11.25, z1 = ZS + 11.25;

    put(B.aabb([W(X0, Y0 - 2, 0), W(X1, Y1, .05)]), castShadow([W(X0, Y0, 0), W(X1, Y0, 0), W(X1, Y1, 0), W(X0, Y1, 0), W(-34, Y0, z1), W(11, Y0, z1), W(0, Y1, ZS + WHEEL_R)], o[2]));
    put(B.aabb([W(-30, -9, 0), W(8, 9, z0)]), B.slabW(W, -30, -9, 8, 9, 0, z0, WOOD, toneI, 1.1));

    // gearbox: two yellow shells and the white clip between them; in see-through it ghosts to show the gear train
    const ghost = svg => k > .02 ? `<g opacity="${f(1 - .7 * k)}">${svg}</g>` : svg;
    let gb = B.slabW(W, -34, -9.4, 11, -.6, z0, z1, burnt ? matOf('#a99a6a') : YELLOW, toneI, 1.2)
      + B.slabW(W, -34, .6, 11, 9.4, z0, z1, burnt ? matOf('#a99a6a') : YELLOW, toneI, 1.2)
      + B.slabW(W, -34.4, -.6, -30, .6, z0 + 2, z1 - 2, WHITE, toneI, .5);
    if (k > .02){
      let gears = '';
      for (const [gx, gr] of [[-24, 7], [-12, 9], [0, 6.5]]) gears += rod(W(gx, -4, ZS), W(gx, 4, ZS), gr, matOf('#f4f1e6'), toneI, .5, gr, 20);
      gb = ghost(gb) + `<g opacity="${f(k)}">${gears}</g>`;
      if (k > .5 && callouts(ctx)){ ctx.label(W(-12, 0, ZS), 'Nylon gear train', Math.abs(rpm) > 5); }
    }
    put(B.aabb([W(-34.4, -9.4, z0), W(11, 9.4, z1)]), gb);

    // the motor can with its flats, the end cap and the two solder tabs
    const ring = x => { const pts = []; for (let i = 0; i < 28; i++){ const q = i / 28 * 2 * Math.PI; pts.push(W(x, Math.max(-7.5, Math.min(7.5, 10 * Math.cos(q))), ZS + 10 * Math.sin(q))); } return pts; };
    const sweep = (xa, xb, mat, w) => { const A = ring(xa), Bq = ring(xb), nx = ax.map(v => -v);
      return loft(A, Bq, nr => toneI(nr, mat)) + (vis(nx) ? fill(pd(A), toneI(nx, mat)) + ink(pd(A), w * .7) : '') + hullInk([...A, ...Bq], w); };
    let can = sweep(-55, -34, burnt ? matOf('#8b8378') : CAN, 1.3) + sweep(-58, -55, B.M.blackPl, 1);
    const tabs = [[-58.6, 3.4], [-58.6, -3.4]];
    for (const [x, y] of tabs) can += B.slabW(W, x - 2, y - .9, x, y + .9, ZS + 5, ZS + 5.3, B.M.tin, toneI, .4);
    if (m.state === 'stall' || m.state === 'over' || m.state === 'spike'){
      const [X, Y] = P(...W(-50, 0, ZS + 13));
      can += `<path d="M${f(X - 3)} ${f(Y)}q2 -3 0 -6q-2 -3 0 -6M${f(X + 2)} ${f(Y - 1)}q2 -3 0 -6q-2 -3 0 -6" fill="none" stroke="#e2483d" stroke-width=".9" opacity=".75"/>`;
    }
    if (burnt){ const [X, Y] = P(...W(-50, 0, ZS + 13)); can += `<circle cx="${f(X)}" cy="${f(Y - 6)}" r="4" fill="#8a847a" opacity=".45"/><circle cx="${f(X + 4)}" cy="${f(Y - 12)}" r="2.6" fill="#8a847a" opacity=".3"/>`; }
    put(B.aabb([W(-60.6, -10, ZS - 10), W(-34, 10, ZS + 10)]), can);

    // the shaft stub and the wheel: tyre, rim with six windows turning with the shaft, hub
    put(B.aabb([W(-2.7, 9.4, ZS - 2.7), W(2.7, 11, ZS + 2.7)]), rod(W(0, 9.4, ZS), W(0, 11, ZS), 2.7, WHITE, toneI, .6));
    const side = vis(ay) ? Y1 + .05 : 10.95, at = (rr, q) => W(rr * Math.cos(q), side, ZS + rr * Math.sin(q));
    const disc = (rr, n = 36) => Array.from({ length: n }, (_, i) => at(rr, i / n * 2 * Math.PI));
    let wheel = rod(W(0, 11, ZS), W(0, Y1, ZS), WHEEL_R, burnt ? matOf('#6a655e') : RUBBER, toneI, 1.4, WHEEL_R, 40);
    wheel += shape(disc(25), YELLOW.l, .8);
    for (let i = 0; i < 6; i++){
      const q0 = ang + i * Math.PI / 3 + .12, q1 = q0 + .8, win = [];
      for (let j = 0; j <= 5; j++) win.push(at(21.5, q0 + (q1 - q0) * j / 5));
      for (let j = 5; j >= 0; j--) win.push(at(9, q0 + (q1 - q0) * j / 5));
      wheel += shape(win, '#2b2825', .5);
    }
    wheel += shape(disc(5.5, 18), YELLOW.m, .6) + shape([at(1.6, ang), at(1.6, ang + Math.PI * .5), at(1.6, ang + Math.PI), at(1.6, ang + Math.PI * 1.5)], '#e9e3d0', .3);
    const blur = Math.min(1, Math.abs(rpm) / 120);
    if (blur > .05){
      const dir = Math.sign(rpm) || 1, arc = (r0, a0) => Array.from({ length: 9 }, (_, i) => at(r0, a0 + dir * i / 8 * .9));
      for (const a0 of [0, 2.1, 4.2]) wheel += `<path d="${pd(arc(29, a0 + ang), false)}" fill="none" stroke="#fff4d6" stroke-width="1" opacity="${f(.75 * blur)}"/>`;
    }
    put(B.aabb([W(-WHEEL_R, 11, ZS - WHEEL_R), W(WHEEL_R, Y1, ZS + WHEEL_R)]), wheel);

    // leads: red to the + hole, black to the - hole, in short pieces so they sort at every angle
    tabs.forEach(([x, y], i) => {
      const a = W(x - 2, y, ZS + 5.15), end = legs[i] || W(x - 14, y * 3, 0), col = i === 0 ? matOf('#e2483d') : matOf('#3a3632');
      const top = Math.max(a[2], end[2]) + 6, pts = [];
      for (let j = 0; j <= 14; j++){ const t = j / 14, sn = Math.sin(t * Math.PI);
        pts.push([a[0] + (end[0] - a[0]) * t, a[1] + (end[1] - a[1]) * t, (a[2] * (1 - t) + (end[2] + 3) * t) + (top - Math.max(a[2], end[2])) * sn * .5]); }
      for (let j = 0; j < pts.length - 1; j++){ const q0 = pts[j], q1 = pts[j + 1];
        put(B.aabb([q0, q1]).map((v, h) => v.map(c => c + (h ? .5 : -.5))), rod(q0, q1, .5, col, toneI, .5)); }
      if (legs[i]) put(B.aabb([end, [end[0], end[1], end[2] + 3]]).map((v, h) => v.map(c => c + (h ? .4 : -.4))), rod(end, [end[0], end[1], end[2] + 3], .35, B.M.tin, toneI, .4));
    });
    for (const it of items) ctx.put(it.box, it.svg);
  },
});
})();
