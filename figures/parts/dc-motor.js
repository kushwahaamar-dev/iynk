// @cf title Small DC motor
// @cf use engine/bench.list
/* "130-size" brushed DC hobby motor (Mabuchi FA-130 class, 3-6 V) with a two-blade propeller, lying on the mat on
   one of its flats. Steel can 20 mm across (two flats 15 mm apart) and 25 mm long with the black end cap, 2 mm
   shaft, two solder tabs with a red (+) and a black (-) lead. Legs [+, -]: the leads end in two breadboard holes
   (or give `at` alone and they lie on the mat). Inside: two arc ferrite magnets on the can, a 3-pole wound armature,
   a commutator and two metal-leaf brushes in the end cap.
   Electrical model (la-components.md §13, FA-130RA sheet values, approximate): armature 1.43 Ohm, back-EMF
   0.306 mV per rpm (9100 rpm no-load at 3 V), no-load current 0.12 A, the propeller adds about 0.08 A at full
   speed, so it takes about 0.2 A at 4 V (5 V less a TIP120's drop). It will not start below about 1 V average
   (25 % PWM on 4 V: brush and bearing stiction) and stops below 0.6 V. A held shaft draws the stall current
   V / 1.43 Ohm: 2.9 A at 4.1 V, far past the Uno's 500 mA USB fuse. Above 9 V it overheats and the winding burns
   open after a few seconds. Swap the leads and it turns the other way. Its winding is an inductor: switch it off
   without a flyback diode and the collector sees a spike (the solver reports it).

   Solver contract (FIGURES-BENCH §9, type 'motor'): m = { state, v, i_mA }, v the average volts from + to -,
   state 'ok' | 'off' | 'stall' | 'over' | 'burnt' | 'spike' (running, no flyback diode across it). Until the solver
   handles motors, `drive: 'D6'` (+ optional `supply`, default '5V', and `drop`, default 0.9 V) makes the motor
   follow that pin's PWM through a low-side switch, the lesson 10 circuit. */
(() => {
const B = SL.bench, T = B.T;
const callouts = ctx => !!ctx.sel || !!(B.md && B.md.def && B.md.def.partPage);
const R = 1.43, KE = 3.06e-4, I0 = .12, IPROP = .08, VSTART = 1.0, VSTOP = .6, VMAX = 9;
// steady state at an average voltage v: rpm and current, with the propeller load rising as speed squared
const steady = (v, load = 'prop') => {
  const av = Math.abs(v), sg = Math.sign(v) || 1;
  if (load === 'stalled') return { rpm: 0, i: sg * av / R };
  if (av < VSTOP) return { rpm: 0, i: sg * av / R };
  const r0 = (av - I0 * R) / KE; let rpm = Math.max(0, r0);
  for (let k = 0; k < 12; k++){ const i = I0 + (load === 'prop' ? IPROP * Math.pow(rpm / 12500, 2) : 0); rpm = Math.max(0, (av - i * R) / KE); }
  const i = I0 + (load === 'prop' ? IPROP * Math.pow(rpm / 12500, 2) : 0);
  return { rpm: sg * rpm, i: sg * i };
};
const MAG = { l: '#8f7a6c', m: '#6f5d52', d: '#463a33' }, CAN = { l: '#eef0f0', m: '#c3c9cb', d: '#7d878a' }, CAP = { l: '#5a5550', m: '#403c38', d: '#2a2725' };
const PROP = { l: '#f2c23a', m: '#d9a522', d: '#93700f' }, COPPER = { l: '#f0a46b', m: '#d4834a', d: '#8f5226' };
// per-part motion state on the engine state, integrated on the virtual clock
const motion = (st, id, rpm, tau) => {
  const all = st.drv || (st.drv = {}), s = all[id] || (all[id] = { rpm: 0, a: 0, t: st.t || 0 });
  let dt = (st.t || 0) - s.t; s.t = st.t || 0;
  if (!(dt > 0) || dt > .5) dt = 0;
  if (!st.power) s.rpm = 0;
  else s.rpm += (rpm - s.rpm) * (1 - Math.exp(-dt / tau));
  // the drawn blades turn at most 1.5 turns a second; faster spin shows as a blurred disc
  s.a = (s.a + Math.sign(s.rpm) * Math.min(Math.abs(s.rpm), 90) * 6 * dt) % 360;
  return s;
};
// what the motor sees: the solver's result, else the lesson-10 fallback (a PWM pin through a low-side switch)
const sense = ctx => {
  const m = ctx.m || {}, p = ctx.p, st = ctx.st || {};
  if (m.state) return m;
  if (p.demo && DEMO[p.demo]) return DEMO[p.demo];
  if (!p.drive || !st.ev || st.ev.status !== 'running') return { state: 'off', v: 0, i_mA: 0 };
  const duty = +(st.o && st.o.pins && st.o.pins[p.drive]) || 0, rail = (st.ev.rails && st.ev.rails[p.supply || '5V']) || 0;
  const v = Math.max(0, rail - (p.drop != null ? +p.drop : .9)) * duty, load = p.load || 'prop';
  const ss = steady(v, load), running = load !== 'stalled' && Math.abs(v) >= VSTART;
  return { state: load === 'stalled' && v > .3 ? 'stall' : Math.abs(v) > VMAX ? 'over' : 'ok', v, i_mA: Math.round(Math.abs(running ? ss.i : v / R) * 1000), fallback: true };
};
const DEMO = {
  stopped: { state: 'off', v: 0, i_mA: 0 },
  half: { state: 'ok', v: 2.05, i_mA: 135 },
  full: { state: 'ok', v: 4.1, i_mA: 195 },
  reversed: { state: 'ok', v: -4.1, i_mA: 195 },
  stalled: { state: 'stall', v: 4.1, i_mA: 2870 },
  burnt: { state: 'burnt', v: 0, i_mA: 0 },
};
B.part('dc-motor', {
  name: 'DC motor', fig: 'P14', legs: ['+', '-'], span: [1, 30],
  params: { load: ['prop', 'free', 'stalled'], demo: Object.keys(DEMO) },
  paramNames: { load: 'Load', demo: 'Show' },
  example: { demo: 'full' },
  foot: [46, 40, 44],
  show: { breadboard: 'mini', parts: [{ id: 'MOT1', part: 'dc-motor', at: [-2, 2], rot: 90, demo: 'full', holes: ['c4', 'c8'] }], wires: [] },
  elec: () => ({ type: 'motor', ohms: R, ke: KE, i0: I0, iload: IPROP, vstart: VSTART, vstop: VSTOP, vrated: [3, 6], vmax: VMAX, inductive: true }),
  model: { steady, R, KE, I0, VSTART, VSTOP, VMAX },
  tag: (p, m) => {
    const id = p.id; if (!m || !m.state) return id;
    if (m.state === 'burnt') return T('{id} · burnt out', { id });
    if (m.state === 'stall') return T('{id} · stalled: {n} mA', { id, n: Math.round(m.i_mA) });
    if (m.state === 'over') return T('{id} · {v} V: too much', { id, v: Math.abs(m.v).toFixed(1) });
    if (m.state === 'spike') return T('{id} · no flyback diode', { id });
    if (m.state === 'ok' && m.v) return T('{id} · {v} V · {n} mA', { id, v: m.v.toFixed(1), n: Math.round(m.i_mA) });
    return id;
  },
  draw(ctx){
    const p = ctx.p, st = ctx.st || {}, k = ctx.k != null ? ctx.k : st.xr || 0, legs = ctx.legs || [];
    const m = sense(ctx), load = p.load || 'prop', burnt = m.state === 'burnt';
    const ss = m.state === 'ok' || m.state === 'over' || m.state === 'spike' ? steady(m.v || 0, load) : { rpm: 0 };
    const run = Math.abs(m.v || 0) >= VSTART || (st.drv && st.drv[p.id] && Math.abs(st.drv[p.id].rpm) > 50 && Math.abs(m.v || 0) >= VSTOP);
    const mo = motion(st, p.id, run ? ss.rpm : 0, load === 'prop' ? .35 : .15);
    const still = !!p.demo && !(ctx.m && ctx.m.state), rpm = still ? (run ? ss.rpm : 0) : mo.rpm, ang = (still ? 25 : mo.a) * Math.PI / 180;
    // frame: o on the mat, x along the shaft (rot degrees about z), y across, z up
    const o = ctx.origin || legs[0] || [0, 0, 0], r = (+p.rot || 0) * Math.PI / 180, ax = [Math.cos(r), Math.sin(r), 0], ay = [-ax[1], ax[0], 0];
    const W = (x, y, z) => [o[0] + ax[0] * x + ay[0] * y, o[1] + ax[1] * x + ay[1] * y, o[2] + z];
    // the can rests on a wooden motor block, so the propeller clears the mat
    const zc = 24, zb = zc - 7.5, items = [];
    // can: a circle of 10 mm clipped by the flats at +-7.5 mm, swept along x
    const ring = x => { const pts = []; for (let i = 0; i < 28; i++){ const q = i / 28 * 2 * Math.PI; pts.push(W(x, 10 * Math.cos(q), zc + Math.max(-7.5, Math.min(7.5, 10 * Math.sin(q))))); } return pts; };
    const sweep = (x0, x1, mat, w = 1.2) => { const A = ring(x0), Bq = ring(x1); return loft(A, Bq, nr => toneI(nr, mat)) + (vis(ax) ? fill(pd(Bq), toneI(ax, mat)) + ink(pd(Bq), w * .7) : '') + (vis(ax.map(v => -v)) ? fill(pd(A), toneI(ax.map(v => -v), mat)) + ink(pd(A), w * .7) : '') + hullInk([...A, ...Bq], w); };
    let can = sweep(-9.5, 12.5, burnt ? matOf('#8b8378') : CAN, 1.4);
    // end cap with the two solder tabs, and the leads
    let cap = sweep(-12.5, -9.5, CAP, 1.1);
    const tabs = [[-12.6, 3.2, '+'], [-12.6, -3.2, '-']];
    for (const [x, y] of tabs) cap += B.slabW(W, x - 2.2, y - .9, x, y + .9, zc + 1.6, zc + 1.9, B.M.tin, toneI, .4);
    if (vis(ax.map(v => -v)) && k < .5){ const t0 = P(...W(-12.6, 3.2, zc - 1.6)), U = Dv(-ay[0], -ay[1], 0), V = Dv(0, 0, -1);
      cap += `<text transform="${txM(t0, U, V)}" font-size="2.2" fill="#e2483d" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="800">+</text>`; }
    // shaft, bushing and the propeller
    const front = rod(W(12.5, 0, zc), W(13.8, 0, zc), 3.2, CAN, toneI, .7) + rod(W(13.8, 0, zc), W(20.5, 0, zc), 1, B.M.steel, toneI, .6);
    const blade = (sg) => { const pts = []; for (const [rr, wv] of [[2.2, 2.2], [9, 3.4], [16, 3.2], [20, 1.4], [20, -1.4], [16, -2.2], [9, -2.4], [2.2, -2.2]]){
        const c = Math.cos(ang), s2 = Math.sin(ang), yy = sg * rr * c - wv * s2 * sg, zz = sg * rr * s2 + wv * c * sg; pts.push(W(19.5 + wv * .06, yy, zc + zz)); } return pts; };
    const blur = Math.min(1, Math.abs(rpm) / 3000);
    let prop = '';
    if (load === 'prop'){
      prop += shape(blade(1), burnt ? '#a69c8a' : PROP.l, .9) + shape(blade(-1), burnt ? '#a69c8a' : PROP.m, .9);
      if (blur > .05){ const disc = []; for (let i = 0; i < 32; i++){ const q = i / 32 * 2 * Math.PI; disc.push(W(19.5, 20 * Math.cos(q), zc + 20 * Math.sin(q))); }
        prop = `<g opacity="${f(1 - .75 * blur)}">${prop}</g>` + fill(pd(disc), '#f2c23a', `opacity="${f(.28 * blur)}"`) + ink(pd(disc), .5);
        // motion arcs
        const arc = (r0, a0) => { const pts = []; for (let i = 0; i <= 8; i++){ const q = a0 + i / 8 * 1.1; pts.push(W(19.6, r0 * Math.cos(q), zc + r0 * Math.sin(q))); } return pts; };
        const dir = Math.sign(rpm) || 1;
        for (const a0 of [0, 2.1, 4.2]) prop += `<path d="${pd(arc(22.5, a0 * dir), false)}" fill="none" stroke="${INK}" stroke-width=".8" opacity="${f(.6 * blur)}"/>`; }
      prop += rod(W(18.6, 0, zc), W(21, 0, zc), 2.6, PROP, toneI, .8);
    }
    if (k > .02){
      // inside: magnets on the can wall, the 3-pole armature turning with the shaft, commutator and brushes
      const mag = (sg) => B.slabW(W, -8, sg * 6.6, 11, sg * 8.6, zc - 5.2, zc + 5.2, MAG, toneI, .6);
      let ins = mag(1) + mag(-1);
      for (let i = 0; i < 3; i++){ const q = ang + i * 2 * Math.PI / 3, y = 4.2 * Math.cos(q), z = 4.2 * Math.sin(q);
        ins += rod(W(-4, 0, zc), W(-4, y, zc + z), .8, B.M.steel, toneI, .4) + rod(W(-6, y, zc + z), W(9, y, zc + z), 2, COPPER, toneI, .5); }
      ins += rod(W(-11, 0, zc), W(-8, 0, zc), 1.6, COPPER, toneI, .5) + B.slabW(W, -10.6, 1.4, -9.6, 3.4, zc - .4, zc + .4, B.M.tin, toneI, .3) + B.slabW(W, -10.6, -3.4, -9.6, -1.4, zc - .4, zc + .4, B.M.tin, toneI, .3);
      can = `<g opacity="${f(1 - .72 * k)}">${can}</g><g opacity="${f(k)}">${ins}</g>`;
      if (k > .5 && callouts(ctx)) can += tag(W(2, 7.6, zc + 5), 30, -34, 'Ferrite magnet') + tag(W(4, 0, zc + 4.2), -30, -40, 'Armature coils', run) + tag(W(-10, 2.4, zc), -40, 16, 'Brushes on the commutator', run);
    }
    if (m.state === 'stall' || m.state === 'over'){ const [X, Y] = P(...W(-11, 0, zc + 8)); can += `<path d="M${f(X - 3)} ${f(Y)}q2 -3 0 -6q-2 -3 0 -6M${f(X + 2)} ${f(Y - 1)}q2 -3 0 -6q-2 -3 0 -6" fill="none" stroke="#e2483d" stroke-width=".9" opacity=".75"/>`; }
    if (burnt){ const [X, Y] = P(...W(-11, 0, zc + 8)); can += `<circle cx="${f(X)}" cy="${f(Y - 6)}" r="4" fill="#8a847a" opacity=".45"/><circle cx="${f(X + 4)}" cy="${f(Y - 12)}" r="2.6" fill="#8a847a" opacity=".3"/>`; }
    items.push({ box: B.aabb([W(-12, -12, 0), W(12, 12, .05)]), svg: castShadow([W(-12, -12, 0), W(12, -12, 0), W(12, 12, 0), W(-12, 12, 0), W(-12.5, -7.5, zc + 7.5), W(12.5, -7.5, zc + 7.5), W(12.5, 7.5, zc + 7.5), W(-12.5, 7.5, zc + 7.5)], o[2]) });
    items.push({ box: B.aabb([W(-10, -12, 0), W(10, 12, zb)]), svg: B.slabW(W, -10, -12, 10, 12, 0, zb, { l: '#e3c79a', m: '#c9a874', d: '#8f7449' }, toneI, 1.1) });
    items.push({ box: B.aabb([W(-12.5, -10, zb), W(12.5, 10, zc + 7.5)]), svg: can });
    items.push({ box: B.aabb([W(-14.8, -10, zb), W(-9.5, 10, zc + 7.5)]), svg: cap });
    items.push({ box: B.aabb([W(12.5, -3.2, zc - 3.2), W(18.5, 3.2, zc + 3.2)]), svg: front });
    if (prop) items.push({ box: B.aabb([W(18.5, -20, zc - 20), W(21.5, 20, zc + 20)]), svg: prop });
    // leads: red to the + hole, black to the - hole, in short boxed pieces so they sort at every angle
    tabs.forEach(([x, y], i) => {
      const a = W(x - 2.2, y, zc + 1.75), end = legs[i] || W(-34, y * 3, 0), col = i === 0 ? matOf('#e2483d') : matOf('#3a3632');
      const top = Math.max(a[2], end[2]) + 6, pts = [];
      for (let j = 0; j <= 12; j++){ const t = j / 12, sn = Math.sin(t * Math.PI);
        pts.push([a[0] + (end[0] - a[0]) * t, a[1] + (end[1] - a[1]) * t, (a[2] * (1 - t) + (end[2] + 3) * t) + (top - Math.max(a[2], end[2])) * sn * .6]); }
      for (let j = 0; j < pts.length - 1; j++){ const q0 = pts[j], q1 = pts[j + 1];
        items.push({ box: B.aabb([q0, q1]).map((v, h) => v.map(c => c + (h ? .5 : -.5))), svg: rod(q0, q1, .5, col, toneI, .5) }); }
      if (legs[i]) items.push({ box: B.aabb([end, [end[0], end[1], end[2] + 3]]).map((v, h) => v.map(c => c + (h ? .4 : -.4))), svg: rod(end, [end[0], end[1], end[2] + 3], .35, B.M.tin, toneI, .4) });
    });
    for (const it of items) ctx.put(it.box, it.svg);
  },
});
})();
