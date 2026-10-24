// @cf title 5 V cooling fan
// @cf use engine/bench.list
/* 40 x 40 x 10 mm 5 V brushless axial fan with two leads (red +, black -), standing on the mat on its frame edge
   and blowing along its axis (rot, degrees, turns it). Square black frame with a 38 mm round duct and four M3
   holes on 32 mm centres, seven blades on an 18 mm hub with the rating sticker, three struts at the back.
   It is brushless: a Hall sensor and a driver IC in the hub switch its stator coils, so it needs the right
   polarity (reversed, it does not spin; the usual driver has reverse protection) and it reads PWM as a chopped
   supply: below about 2.5 V average it stalls, starting again above that.
   Ratings, typical of 4010 5 V fans (distributor listings: Delta BFB0405HHA-A 0.16 A, 4-5.5 V; Qualtek
   FAD1-04010BHLW11 0.07 A, 4.5-5.5 V; Wakefield DC0401005U2B-2T0 0.20 A, 8000 rpm): modelled as 0.10 A and
   6000 rpm at 5 V, speed proportional to the average voltage above the stall level. Above 6.5 V the driver IC
   fails (burnt). Like any motor it needs a flyback diode when a transistor switches it (la-components.md §11, §13).

   Solver contract (FIGURES-BENCH §9, type 'motor', brushless): m = { state, v, i_mA }, state 'ok' | 'off' |
   'reverse' | 'over' | 'burnt' | 'spike'. Until the solver handles motors, `drive: 'D6'` (+ `supply`, default '5V',
   and `drop`, default 0.9 V) makes the fan follow that pin through a low-side switch, the lesson 11 circuit. */
(() => {
const B = SL.bench, T = B.T;
const callouts = ctx => !!ctx.sel || !!(B.md && B.md.def && B.md.def.partPage);
const VNOM = 5, INOM = .10, RPM = 6000, VSTALL = 2.5, VRUN = 1.8, VMAX = 6.5;
const steady = v => { if (v < VRUN) return { rpm: 0, i: 0 }; const x = Math.min(VMAX, v); return { rpm: RPM * (x - VRUN) / (VNOM - VRUN), i: INOM * (.35 + .65 * x / VNOM) }; };
const FRAME = { l: '#57524c', m: '#3f3b37', d: '#292624' }, BLADE = { l: '#4c4843', m: '#38342f', d: '#24211e' };
const motion = (st, id, rpm, tau) => {
  const all = st.drv || (st.drv = {}), s = all[id] || (all[id] = { rpm: 0, a: 0, t: st.t || 0 });
  let dt = (st.t || 0) - s.t; s.t = st.t || 0;
  if (!(dt > 0) || dt > .5) dt = 0;
  if (!st.power) s.rpm = 0; else s.rpm += (rpm - s.rpm) * (1 - Math.exp(-dt / tau));
  s.a = (s.a + Math.min(Math.abs(s.rpm), 90) * 6 * dt) % 360;
  return s;
};
const DEMO = {
  stopped: { state: 'off', v: 0, i_mA: 0 },
  half: { state: 'ok', v: 3.3, i_mA: 78 },
  full: { state: 'ok', v: 4.1, i_mA: 88 },
  reversed: { state: 'reverse', v: -4.1, i_mA: 0 },
  burnt: { state: 'burnt', v: 0, i_mA: 0 },
};
const sense = ctx => {
  const m = ctx.m || {}, p = ctx.p, st = ctx.st || {};
  if (m.state) return m;
  if (p.demo && DEMO[p.demo]) return DEMO[p.demo];
  if (!p.drive || !st.ev || st.ev.status !== 'running') return { state: 'off', v: 0, i_mA: 0 };
  const duty = +(st.o && st.o.pins && st.o.pins[p.drive]) || 0, rail = (st.ev.rails && st.ev.rails[p.supply || '5V']) || 0;
  const v = Math.max(0, rail - (p.drop != null ? +p.drop : .9)) * duty;
  return { state: v > VMAX ? 'over' : 'ok', v, i_mA: Math.round(steady(v).i * 1000), fallback: true };
};
B.part('fan', {
  name: 'Cooling fan', fig: 'P15', legs: ['+', '-'], span: [1, 30],
  params: { demo: Object.keys(DEMO) },
  paramNames: { demo: 'Show' },
  example: { demo: 'full' },
  foot: [10, 40, 40],
  show: { breadboard: 'mini', parts: [{ id: 'FAN1', part: 'fan', at: [4, 0], rot: 0, demo: 'full', holes: ['c4', 'c8'] }], wires: [] },
  elec: () => ({ type: 'motor', brushless: true, polar: true, vrated: VNOM, range: [4, 5.5], i: INOM, rpm: RPM, vstart: VSTALL, vstop: VRUN, vmax: VMAX, inductive: true }),
  model: { steady, VNOM, INOM, RPM, VSTALL, VRUN, VMAX },
  tag: (p, m) => {
    const id = p.id; if (!m || !m.state) return id;
    if (m.state === 'burnt') return T('{id} · burnt out', { id });
    if (m.state === 'reverse') return T('{id} · backwards: no spin', { id });
    if (m.state === 'over') return T('{id} · {v} V: too much', { id, v: Math.abs(m.v).toFixed(1) });
    if (m.state === 'spike') return T('{id} · no flyback diode', { id });
    if (m.state === 'ok' && m.v >= VRUN) return T('{id} · {n} rpm', { id, n: Math.round(steady(m.v).rpm / 100) * 100 });
    return id;
  },
  draw(ctx){
    const p = ctx.p, st = ctx.st || {}, k = ctx.k != null ? ctx.k : st.xr || 0, legs = ctx.legs || [];
    const m = sense(ctx), burnt = m.state === 'burnt', ok = (m.state === 'ok' || m.state === 'over' || m.state === 'spike') && (m.v || 0) > 0;
    const prev = st.drv && st.drv[p.id], spinning = ok && ((m.v || 0) >= VSTALL || (prev && prev.rpm > 100 && m.v >= VRUN));
    const target = spinning ? steady(m.v).rpm : 0, mo = motion(st, p.id, target, .6);
    const still = !!p.demo && !(ctx.m && ctx.m.state), rpm = still ? target : mo.rpm, ang = (still ? 12 : mo.a) * Math.PI / 180;
    const o = ctx.origin || legs[0] || [0, 0, 0], r = (+p.rot || 0) * Math.PI / 180, ax = [Math.cos(r), Math.sin(r), 0], ay = [-ax[1], ax[0], 0];
    const W = (x, y, z) => [o[0] + ax[0] * x + ay[0] * y, o[1] + ax[1] * x + ay[1] * y, o[2] + z];
    const zc = 20, items = [];
    // frame: front and back faces are squares with the round duct cut out (even-odd), plus the four outer sides
    const sq = x => [W(x, -20, 0), W(x, 20, 0), W(x, 20, 40), W(x, -20, 40)];
    const circ = (x, rr, n = 30) => Array.from({ length: n }, (_, i) => { const q = i / n * 2 * Math.PI; return W(x, rr * Math.cos(q), zc + rr * Math.sin(q)); });
    const faceAt = (x, nrm) => { const d = pd(sq(x)) + pd(circ(x, 19)); let s = `<path d="${d}" fill="${toneI(nrm, FRAME)}" fill-rule="evenodd"/>` + ink(d, .9);
      for (const [hy, hz] of [[-16, 4], [16, 4], [16, 36], [-16, 36]]){ const h = Array.from({ length: 10 }, (_, i) => { const q = i / 10 * 2 * Math.PI; return W(x, hy + 1.6 * Math.cos(q), hz + 1.6 * Math.sin(q)); }); s += shape(h, '#2b2825', .5); }
      return s; };
    const fwd = vis(ax), nb = ax.map(v => -v);
    const sideF = [[ay.map(v => -v), [W(-5, -20, 0), W(5, -20, 0), W(5, -20, 40), W(-5, -20, 40)]], [ay, [W(-5, 20, 0), W(5, 20, 0), W(5, 20, 40), W(-5, 20, 40)]],
      [[0, 0, 1], [W(-5, -20, 40), W(5, -20, 40), W(5, 20, 40), W(-5, 20, 40)]]];
    const sides = sideF.filter(([nn]) => vis(nn)).map(([nn, q]) => shape(q, toneI(nn, FRAME), 1.1)).join('');
    const duct = loft(circ(-5, 19), circ(5, 19), nr => toneI(nr.map(v => -v), FRAME), true);
    // hub, struts, blades
    const hubC = x => circ(x, 9, 22);
    const hub = loft(hubC(-4), hubC(4), nr => toneI(nr, FRAME)) + (fwd ? fill(pd(hubC(4)), toneI(ax, FRAME)) + ink(pd(hubC(4)), .7) : fill(pd(hubC(-4)), toneI(nb, FRAME)) + ink(pd(hubC(-4)), .7));
    let sticker = '';
    if (fwd && k < .5){ sticker = shape(circ(4.05, 6.6, 20), burnt ? '#9b9387' : '#e8e2d2', .5);
      const U = Dv(...ay.map(v => -v)), V = Dv(0, 0, -1), t1 = P(...W(4.1, 0, zc + 1.2)), t2 = P(...W(4.1, 0, zc - 1.6));
      sticker += `<text transform="${txM(t1, U, V)}" font-size="2.1" fill="#2a2623" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="800">DC 5V</text>`
        + `<text transform="${txM(t2, U, V)}" font-size="1.7" fill="#2a2623" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="700">0.10A</text>`; }
    const struts = [0, 2.09, 4.19].map(q => rod(W(-4.6, 9 * Math.cos(q + .5), zc + 9 * Math.sin(q + .5)), W(-4.6, 19 * Math.cos(q + .5), zc + 19 * Math.sin(q + .5)), .9, FRAME, toneI, .5)).join('');
    let blades = '';
    const blur = Math.min(1, rpm / 2500);
    for (let i = 0; i < 7; i++){ const q = ang + i * 2 * Math.PI / 7, q2 = q + .55;
      const pts = [W(1.5, 9.3 * Math.cos(q), zc + 9.3 * Math.sin(q)), W(-1.5, 18.4 * Math.cos(q + .1), zc + 18.4 * Math.sin(q + .1)), W(-1.5, 18.4 * Math.cos(q2), zc + 18.4 * Math.sin(q2)), W(1.5, 9.3 * Math.cos(q2 - .15), zc + 9.3 * Math.sin(q2 - .15))];
      blades += shape(pts, burnt ? '#6a625a' : (i % 2 ? BLADE.l : BLADE.m), .6); }
    if (blur > .05) blades = `<g opacity="${f(1 - .7 * blur)}">${blades}</g>` + fill(pd(circ(0, 18.4)), '#8fb6d9', `opacity="${f(.25 * blur)}"`);
    let inner = struts + blades + hub + sticker;
    if (k > .02){
      // inside the hub: the stator coils, the Hall sensor and the driver chip on a small round PCB
      let ins = '';
      for (let i = 0; i < 4; i++){ const q = i * Math.PI / 2; ins += rod(W(-2.5, 4.4 * Math.cos(q), zc + 4.4 * Math.sin(q)), W(2.5, 4.4 * Math.cos(q), zc + 4.4 * Math.sin(q)), 1.7, { l: '#f0a46b', m: '#d4834a', d: '#8f5226' }, toneI, .4); }
      ins += shape(circ(-3.2, 8, 18), '#2f7d4a', .5) + B.slabW(W, -3.6, -2, -3.2, 1, zc - 6.5, zc - 4.3, matOf('#2a2725'), toneI, .3);
      inner = `<g opacity="${f(1 - .7 * k)}">${inner}</g><g opacity="${f(k)}">${ins}</g>`;
      if (k > .5 && callouts(ctx)) inner += tag(W(0, 4.4, zc + 4.4), 34, -36, 'Stator coils', spinning) + tag(W(-3.4, 0, zc - 5.4), -36, 20, 'Hall sensor + driver IC', spinning);
    }
    const back = faceAt(-5, nb), front = faceAt(5, ax);
    const body = fwd ? back + duct + inner + front : front + duct + inner + back;
    items.push({ box: B.aabb([W(-5, -20, 0), W(5, 20, .05)]), svg: castShadow([W(-5, -20, 0), W(5, -20, 0), W(5, 20, 0), W(-5, 20, 0), W(-5, -20, 40), W(5, -20, 40), W(5, 20, 40), W(-5, 20, 40)], o[2]) });
    items.push({ box: B.aabb([W(-5, -20, 0), W(5, 20, 40)]), svg: sides + body });
    // airflow along +x while it spins
    if (rpm > 300 && k < .5){ const ph = ((st.t || 0) * 1.4) % 1;
      let s = ''; for (const [dy, dz] of [[-9, 9], [9, -6], [0, 2]]){ const x0 = 8 + ph * 14, a = W(x0, dy, zc + dz), b = W(x0 + 7, dy, zc + dz), [X1, Y1] = P(...a), [X2, Y2] = P(...b), ang2 = Math.atan2(Y2 - Y1, X2 - X1);
        s += `<path d="M${f(X1)} ${f(Y1)}L${f(X2)} ${f(Y2)}M${f(X2)} ${f(Y2)}l${f(-4 * Math.cos(ang2 - .5))} ${f(-4 * Math.sin(ang2 - .5))}M${f(X2)} ${f(Y2)}l${f(-4 * Math.cos(ang2 + .5))} ${f(-4 * Math.sin(ang2 + .5))}" fill="none" stroke="#3e86d9" stroke-width="1.1" stroke-linecap="round" opacity="${f(.35 + .5 * Math.min(1, rpm / RPM))}"/>`; }
      items.push({ box: B.aabb([W(8, -10, zc - 10), W(30, 10, zc + 10)]), svg: s }); }
    // leads out of the frame's lower back corner to the + and - holes
    [['#e2483d', 1.2], ['#3a3632', -1.2]].forEach(([col, dy], i) => {
      const a = W(-5, -18 + dy, 3), end = legs[i] || W(-30, -18 + dy * 4, 0), mat = matOf(col), pts = [];
      const top = Math.max(a[2], end[2]) + 5;
      for (let j = 0; j <= 12; j++){ const t = j / 12, sn = Math.sin(t * Math.PI);
        pts.push([a[0] + (end[0] - a[0]) * t, a[1] + (end[1] - a[1]) * t, a[2] * (1 - t) + (end[2] + 3) * t + (top - Math.max(a[2], end[2])) * sn * .6]); }
      for (let j = 0; j < pts.length - 1; j++){ const q0 = pts[j], q1 = pts[j + 1];
        items.push({ box: B.aabb([q0, q1]).map((v, h) => v.map(c => c + (h ? .5 : -.5))), svg: rod(q0, q1, .45, mat, toneI, .5) }); }
      if (legs[i]) items.push({ box: B.aabb([end, [end[0], end[1], end[2] + 3]]).map((v, h) => v.map(c => c + (h ? .4 : -.4))), svg: rod(end, [end[0], end[1], end[2] + 3], .35, B.M.tin, toneI, .4) });
    });
    if (burnt){ const [X, Y] = P(...W(0, 0, 42)); items.push({ box: B.aabb([W(-1, -1, 40), W(1, 1, 44)]), svg: `<circle cx="${f(X)}" cy="${f(Y - 5)}" r="4" fill="#8a847a" opacity=".45"/>` }); }
    for (const it of items) ctx.put(it.box, it.svg);
  },
});
})();
