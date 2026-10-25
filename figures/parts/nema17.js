// @cf title NEMA 17 stepper motor
// @cf use engine/bench.list
/* A NEMA 17 hybrid bipolar stepper standing on its rear end cap, shaft up, with a strip of red tape on the shaft as a
   pointer so you can count turns. Modelled on the SOYO SY42STH38-1684A (Pololu #2267, docs/facts/a4988.md §2.5):
   42.3 mm square with chamfered corners, 38 mm long (an 8 mm aluminium cap at each end round a 22 mm black laminated
   stator stack), a 22 mm pilot boss, a 5 mm shaft 24 mm long with a D-flat, four M3 holes on a 31 mm square in the
   flange. 1.8° a step (200 full steps a turn), 1.68 A rated, 1.65 Ω and 3.2 mH a coil, 36 N·cm holding torque.
   Four leads leave the rear cap through a black boot: black and green are one coil (the A4988's 2B and 2A), red and
   blue the other (1A and 1B). Legs [BLK, GRN, RED, BLU]: the four lead ends; `legZ` lifts them (mm above the mat) so a
   bench can end them on pins that stand above the mat.
   Inside (see-through): eight stator poles, coil A on poles 1-3-5-7 and coil B on 2-4-6-8, round a rotor of two
   50-tooth cups; 50 teeth x 4 = 200 full steps. The bench that drives it says what it does through
   m = { state, deg, ia, ib, rpm } (its model readings by part id): state 'off' (no current) | 'hold' (coils on, still) |
   'ok' (turning) | 'skip' (turning but losing steps) | 'buzz' (coil pairs mixed: it shakes in place) | 'free' (outputs
   off: the shaft turns by hand) | 'unplugged' (the leads are off the driver) | 'hot'; deg the shaft angle, ia and ib
   the coil currents in amps (signed), rpm the speed. */
(() => {
const B = SL.bench, T = B.T;
const SQ = 42.3, CH = 4.2, HB = 38, BOSS = 11, SHAFT = 24;          // square, corner chamfer, body length, boss radius, shaft length (mm)
const R_COIL = 1.65, L_COIL = 3.2e-3, STEPS = 200, I_RATED = 1.68, HOLD_NM = .36;
const ALU = { l: '#eef0f0', m: '#c6cbcd', d: '#80898c' }, STACK = { l: '#5b5753', m: '#3e3a37', d: '#262321' };
const TAPE = { l: '#ef6a5b', m: '#d8483a', d: '#8e2a21' }, BOOT = { l: '#4a4642', m: '#33302d', d: '#1f1d1b' };
const LEADS = ['#3a3632', '#43b05c', '#e2483d', '#3e86d9'];        // BLK GRN RED BLU
const COIL_ON = '#ffb347', COPPER = { l: '#f0a46b', m: '#d4834a', d: '#8f5226' };
const DEMO = {
  idle: { state: 'off', deg: 0, ia: 0, ib: 0, rpm: 0 },
  holding: { state: 'hold', deg: 0, ia: .71, ib: .71, rpm: 0 },
  turning: { state: 'ok', rpm: 60 },
  microstepping: { state: 'ok', rpm: 15 },
  'missing steps': { state: 'skip', rpm: 40 },
  'coils mixed': { state: 'buzz', rpm: 0 },
};
const callouts = ctx => !!ctx.sel || !!(B.md && B.md.def && B.md.def.partPage);
// what the motor is doing: the bench model's reading for this part, else the page demo (driven by the clock)
const sense = ctx => {
  const m = ctx.m || {}, st = ctx.st || {}, p = ctx.p;
  if (m.state) return m;
  const r = (st.readings || {})[p.id];
  if (r && r.state) return r;
  return DEMO[p.demo] || DEMO.idle;
};
// the octagon of the body, local (a, b), corners chamfered
const OCT = (() => { const h = SQ / 2, c = h - CH; return [[-c, -h], [c, -h], [h, -c], [h, c], [c, h], [-c, h], [-h, c], [-h, -c]]; })();

B.part('nema17', {
  name: 'NEMA 17 stepper motor', fig: 'P23', legs: ['BLK', 'GRN', 'RED', 'BLU'], span: [3, 30],
  params: { demo: Object.keys(DEMO) },
  paramNames: { demo: 'Show' },
  example: { demo: 'turning' },
  model: { R: R_COIL, L: L_COIL, STEPS, I_RATED, HOLD_NM },
  foot: [SQ, SQ + 10, HB + 2 + SHAFT],
  matSize: [SQ, SQ],
  show: { breadboard: 'mini', parts: [{ id: 'MOT1', part: 'nema17', at: [-14, 30], rot: 0, demo: 'turning', holes: ['a4', 'a6', 'a8', 'a10'] }], wires: [] },
  tag: (p, m) => {
    const id = p.id; if (!m || !m.state) return id;
    if (m.state === 'buzz') return T('{id} · coils mixed: it shakes in place', { id });
    if (m.state === 'skip') return T('{id} · missing steps', { id });
    if (m.state === 'free') return T('{id} · outputs off: the shaft turns by hand', { id });
    if (m.state === 'unplugged') return T('{id} · leads off the driver', { id });
    if (m.state === 'hot') return T('{id} · too hot to touch', { id });
    if (m.state === 'hold') return T('{id} · holding', { id });
    if (m.state === 'ok' && m.deg != null) return T('{id} · {n}°', { id, n: Math.round(((m.deg % 360) + 360) % 360) });
    return id;
  },
  draw(ctx){
    const p = ctx.p, st = ctx.st || {}, k = ctx.k != null ? ctx.k : st.xr || 0, legs = ctx.legs || [];
    const m = sense(ctx), live = !!((st.readings || {})[p.id] && (st.readings || {})[p.id].state);
    // the page demo turns on the figure clock; a bench gives the angle itself
    const all = st.drv || (st.drv = {}), s = all[p.id] || (all[p.id] = { a: 0, t: st.t || 0 });
    let dt = (st.t || 0) - s.t; s.t = st.t || 0; if (!(dt > 0) || dt > .5) dt = 0;
    if (!live && m.rpm) s.a = (s.a + m.rpm * 6 * dt * (m.state === 'skip' ? (Math.sin(st.t * 9) > .3 ? 0 : 1.4) : 1)) % 360;
    let deg = live && m.deg != null ? +m.deg : s.a;
    if (m.state === 'buzz') deg += 3.6 * Math.sin((st.t || 0) * 40);
    const th = deg * Math.PI / 180;
    const o = ctx.origin || legs[0] || [0, 0, 0], r = (+p.rot || 0) * Math.PI / 180, ax = [Math.cos(r), Math.sin(r), 0], ay = [-ax[1], ax[0], 0];
    const W = (x, y, z) => [o[0] + ax[0] * x + ay[0] * y, o[1] + ax[1] * x + ay[1] * y, o[2] + z];
    const items = [], put = (box, svg) => items.push({ box, svg });
    const ghost = svg => k > .02 ? `<g opacity="${f(1 - .72 * k)}">${svg}</g>` : svg;
    // an octagonal prism between z0 and z1, faces culled and shaded from their own normals
    const prism = (z0, z1, mat, w = 1.2) => {
      const lo = OCT.map(([a, b]) => W(a, b, z0)), hi = OCT.map(([a, b]) => W(a, b, z1)), cen = B.mean([...lo, ...hi]);
      let svg = '';
      for (let i = 0; i < 8; i++){ const j = (i + 1) % 8, fq = [lo[i], lo[j], hi[j], hi[i]], n = norm(sub(B.mean(fq), cen)); if (vis(n)) svg += shape(fq, toneI(n, mat), w); }
      return svg + shape(hi, toneI([0, 0, 1], mat), w);
    };

    put(B.aabb([W(-SQ / 2, -SQ / 2 - 6, 0), W(SQ / 2, SQ / 2, .05)]), castShadow([...OCT.map(([a, b]) => W(a, b, 0)), ...OCT.map(([a, b]) => W(a, b, HB))], o[2]));
    // rear cap, stator stack, front cap; the lead boot on the rear cap's -y face
    let body = prism(0, 8, ALU) + prism(8, 30, STACK, 1.3) + prism(30, HB, ALU);
    body += B.slabW(W, -6, -SQ / 2 - 3.2, 6, -SQ / 2 + .5, 1.2, 6.6, BOOT, toneI, .8);
    // the top face: four M3 holes on a 31 mm square, the label ring round the boss
    for (const [a, b] of [[-15.5, -15.5], [15.5, -15.5], [15.5, 15.5], [-15.5, 15.5]]){
      const ring = Array.from({ length: 12 }, (_, i) => W(a + 1.6 * Math.cos(i / 12 * 2 * Math.PI), b + 1.6 * Math.sin(i / 12 * 2 * Math.PI), HB + .02));
      body += shape(ring, '#2b2825', .5);
    }
    put(B.aabb([W(-SQ / 2, -SQ / 2 - 3.2, 0), W(SQ / 2, SQ / 2, HB)]), ghost(body));

    // see-through: the eight poles of the stator (coil A on 1-3-5-7, B on 2-4-6-8) lit by their current, the rotor
    if (k > .02){
      const zc = 19, ia = +m.ia || 0, ib = +m.ib || 0;
      let inside = '';
      for (let i = 0; i < 8; i++){
        const q = i * Math.PI / 4, cur = i % 2 ? ib : ia, mag = Math.min(1, Math.abs(cur) / 1.2), c = Math.cos(q), sn = Math.sin(q);
        const pole = (r0, r1, w2) => [W(r0 * c - w2 * sn, r0 * sn + w2 * c, zc + 5), W(r1 * c - w2 * sn, r1 * sn + w2 * c, zc + 5), W(r1 * c + w2 * sn, r1 * sn - w2 * c, zc + 5), W(r0 * c + w2 * sn, r0 * sn - w2 * c, zc + 5)];
        inside += shape(pole(9.6, 18, 2.6), mag > .05 ? mix(COPPER.m, COIL_ON, mag) : COPPER.d, .5) + shape(pole(8.6, 9.8, 3.4), '#9aa1a3', .4);
      }
      // the rotor: 50 teeth round its edge, turning with the shaft
      const teeth = [];
      for (let i = 0; i < 100; i++){ const q = th + i / 100 * 2 * Math.PI, rr = i % 2 ? 7.4 : 8.2; teeth.push(W(rr * Math.cos(q), rr * Math.sin(q), zc + 5.2)); }
      inside += shape(teeth, '#b7bdbf', .4) + shape(Array.from({ length: 16 }, (_, i) => W(2.5 * Math.cos(i / 16 * 2 * Math.PI), 2.5 * Math.sin(i / 16 * 2 * Math.PI), zc + 5.3)), '#e9ecec', .4);
      put(B.aabb([W(-18, -18, zc), W(18, 18, zc + 6)]), `<g opacity="${f(k)}">${inside}</g>`);
      if (k > .5 && callouts(ctx)){
        put(B.aabb([W(18, 0, zc), W(19, 1, zc + 6)]), tag(W(14, 0, zc + 5), 46, -34, T('Coil A: black and green'), Math.abs(ia) > .05));
        put(B.aabb([W(-18, 0, zc), W(-17, 1, zc + 6)]), tag(W(-10, 10, zc + 5), -46, 30, T('Coil B: red and blue'), Math.abs(ib) > .05));
      }
    }

    // pilot boss, shaft and the red tape pointer that turns with it
    put(B.aabb([W(-BOSS, -BOSS, HB), W(BOSS, BOSS, HB + 2)]), rod(W(0, 0, HB), W(0, 0, HB + 2), BOSS, ALU, toneI, .9, BOSS, 28));
    const z0 = HB + 2, z1 = z0 + SHAFT;
    put(B.aabb([W(-2.5, -2.5, z0), W(2.5, 2.5, z1)]), rod(W(0, 0, z0), W(0, 0, z1), 2.5, B.M.steel, toneI, .7, 2.5, 14));
    const c = Math.cos(th), sn = Math.sin(th), F = (a, b, z) => W(a * c - b * sn, a * sn + b * c, z);
    const flag = B.slabW(F, 2.4, -.45, 17, .45, z1 - 7, z1 - 1, TAPE, toneI, .8);
    put(B.aabb([F(2.4, -.5, z1 - 7), F(17, .5, z1 - 1)].concat([W(-17, -17, z1 - 7), W(17, 17, z1 - 1)])), flag);
    if (m.state === 'hot'){ const [X, Y] = P(...W(0, -SQ / 2, 28));
      put(B.aabb([W(-3, -SQ / 2 - 1, 26), W(3, -SQ / 2, 34)]), `<path d="M${f(X - 3)} ${f(Y)}q2 -3 0 -6q-2 -3 0 -6M${f(X + 2)} ${f(Y - 1)}q2 -3 0 -6q-2 -3 0 -6" fill="none" stroke="#e2483d" stroke-width=".9" opacity=".75"/>`); }

    // the four leads from the boot to their ends, in short pieces so they sort at every angle; unplugged, they stop
    // short and lie on the mat
    const lz = +p.legZ || 0, loose = m.state === 'unplugged';
    LEADS.forEach((col, i) => {
      const a = W(-2.4 + i * 1.6, -SQ / 2 - 3.2, 3.6), leg = legs[i];
      let end = leg ? [leg[0], leg[1], leg[2] + lz] : W(-12 + i * 8, -SQ / 2 - 22, 0);
      if (loose && leg) end = [a[0] + (leg[0] - a[0]) * .7, a[1] + (leg[1] - a[1]) * .7 + (i - 1.5) * 3, o[2] + .4];
      const top = Math.max(a[2], end[2]) + 5, pts = [];
      for (let j = 0; j <= 14; j++){ const t = j / 14, sw = Math.sin(t * Math.PI);
        pts.push([a[0] + (end[0] - a[0]) * t, a[1] + (end[1] - a[1]) * t, a[2] * (1 - t) + end[2] * t + (top - Math.max(a[2], end[2])) * sw * .6]); }
      for (let j = 0; j < pts.length - 1; j++){ const q0 = pts[j], q1 = pts[j + 1];
        put(B.aabb([q0, q1]).map((v, h) => v.map(x => x + (h ? .45 : -.45))), rod(q0, q1, .45, matOf(col), toneI, .45)); }
      // a female jumper housing on each end
      put(B.aabb([end, [end[0], end[1], end[2] + 2.5]]).map((v, h) => v.map(x => x + (h ? 1.2 : -1.2))), rod(end, [end[0], end[1], end[2] + 2.5], 1.1, B.M.blackPl, toneI, .5));
    });
    for (const it of items) ctx.put(it.box, it.svg);
  },
});
})();
