// @cf title SG90 micro servo
// @cf use engine/bench.list
/* TowerPro SG90 micro servo standing on the mat, output shaft up, a one-arm white horn on it. Blue case
   22.2 x 11.8 mm, 22.7 mm to the top of the case with the mounting ears (32 mm across) at 15.5-18 mm, the gear
   tower over one end and the splined shaft at 31 mm. Its 25 cm lead (brown GND, red +V in the middle, orange
   signal) ends in a 3-pin JR plug at 2.54 mm. Legs [GND, V+, SIG]: the plug's three sockets, pushed onto header
   pins in three breadboard holes, or no holes and the plug lies on the mat.
   Behaviour (TowerPro sheet, la-components.md §14): a pulse every 20 ms; 500-2400 us = 0-180 degrees (1.5 ms is
   the centre; the Arduino Servo library sends 544-2400 us for write(0..180)); dead band 10 us; 0.1 s per 60 degrees
   at 4.8 V; 1.8 kgf·cm. Current: about 8 mA holding, 100-250 mA moving, about 700 mA stalled (seller figures,
   approximate). Pulses past the ends drive it into its stop: it buzzes and draws stall current. Below about 4 V
   (a sagging Uno 5 V rail) it jitters and resets the board; above 6 V it is out of rating.
   Inside: a small DC motor, four nylon spur gears, a 5 kOhm potentiometer on the output shaft that tells the
   control chip where the arm is, and the control board.

   Signal: the solver (type 'servo') reports m = { state, us, angle, i_mA }; until it does, the servo reads its
   signal net (`sig`, default 'D9') from the running program: a pin value v in (0, 0.2] is a duty, us = v x 20 ms
   (so the interpreter sends write(a) as duty (544 + a x 1856/180) / 20000). The `angle` param sets the arm directly
   (part page, host pickers). state 'ok' | 'moving' | 'stop' (pushing its end stop) | 'jitter' (low supply) |
   'off' (no pulses: limp) | 'over' (above 6 V) | 'burnt'. */
(() => {
const B = SL.bench, T = B.T;
const callouts = ctx => typeof ctx.label === 'function' && (!!ctx.sel || !!(B.md && B.md.def && B.md.def.partPage));
const US0 = 500, US1 = 2400, SPEED = 600, DEAD = 10;          // us for 0 and 180 deg, deg/s at 4.8 V, dead band us
const angleOf = us => (us - US0) / (US1 - US0) * 180;
const usOf = a => US0 + a / 180 * (US1 - US0);
const CASE = { l: '#5f8fd6', m: '#4673b8', d: '#2c4f86' }, HORN = { l: '#fbf8ef', m: '#e3ddcc', d: '#b4ac98' };
const GEAR = { l: '#f4efe2', m: '#ddd5c2', d: '#a89f88' }, PCB = { l: '#3f9a5c', m: '#2f7d4a', d: '#1d5230' };
const DEMO = { 'hold 90°': { state: 'ok', angle: 90 }, 'hold 0°': { state: 'ok', angle: 0 }, 'hold 180°': { state: 'ok', angle: 180 },
  'past the stop': { state: 'stop', angle: 180, us: 2600 }, 'low supply': { state: 'jitter', angle: 90 }, burnt: { state: 'burnt', angle: 60 } };
const sense = ctx => {
  const m = ctx.m || {}, p = ctx.p, st = ctx.st || {};
  if (m.state) return m;
  if (p.demo && DEMO[p.demo]) return DEMO[p.demo];
  if (p.angle != null && !(st.ev && st.ev.status === 'running' && st.o && st.o.pins && st.o.pins[p.sig || 'D9'] > 0)) return { state: 'ok', angle: +p.angle };
  if (!st.ev || st.ev.status !== 'running') return { state: st.ev && st.ev.status === 'brownout' ? 'jitter' : 'off' };
  const v = +(st.o && st.o.pins && st.o.pins[p.sig || 'D9']) || 0;
  if (!(v > 0 && v <= .2)) return { state: 'off' };
  const us = v * 20000, a = angleOf(us);
  return { state: a < -3 || a > 183 ? 'stop' : 'ok', us, angle: Math.max(0, Math.min(180, a)), fallback: true };
};
B.part('servo-sg90', {
  name: 'SG90 servo', fig: 'P18', legs: ['GND', 'V+', 'SIG'], span: [2, 2],
  params: { angle: [0, 45, 90, 135, 180], demo: Object.keys(DEMO) },
  paramNames: { angle: 'Angle', demo: 'Show' },
  example: { demo: 'hold 90°' },
  show: { breadboard: 'mini', parts: [{ id: 'SV1', part: 'servo-sg90', at: [2, 0], rot: 90, demo: 'hold 90°', holes: ['c4', 'c5', 'c6'] }], wires: [] },
  foot: [32, 12, 31],
  elec: () => ({ type: 'servo', vrange: [4.8, 6], vmin: 4, vmax: 6, period: .02, us: [US0, US1], dead: DEAD, speed: SPEED, iidle: .008, imove: .2, istall: .7 }),
  model: { angleOf, usOf, US0, US1, SPEED, DEAD },
  tag: (p, m) => {
    const id = p.id; if (!m || !m.state) return id;
    if (m.state === 'burnt') return T('{id} · burnt out', { id });
    if (m.state === 'stop') return T('{id} · pushing its end stop', { id });
    if (m.state === 'jitter') return T('{id} · jitters: supply too low', { id });
    if (m.state === 'off') return T('{id} · no pulses', { id });
    if (m.angle != null) return T('{id} · {n}°', { id, n: Math.round(m.angle) });
    return id;
  },
  legAt: (p, origin, i) => { const r = (+p.rot || 0) * Math.PI / 180, ax = [Math.cos(r), Math.sin(r)], ay = [-ax[1], ax[0]], x = -30, y = (i - 1) * 2.54;
    return [origin[0] + ax[0] * x + ay[0] * y, origin[1] + ax[1] * x + ay[1] * y, origin[2] + 1.5]; },
  draw(ctx){
    const p = ctx.p, st = ctx.st || {}, k = ctx.k != null ? ctx.k : st.xr || 0, legs = ctx.legs || [];
    const m = sense(ctx), burnt = m.state === 'burnt';
    // the arm turns toward its target at 600 deg/s on the virtual clock
    const all = st.drv || (st.drv = {}), s = all[p.id] || (all[p.id] = { a: m.angle != null ? m.angle : 90, t: st.t || 0 });
    let dt = (st.t || 0) - s.t; s.t = st.t || 0; if (!(dt > 0) || dt > .5) dt = 0;
    const live = !!(ctx.m && ctx.m.state) || m.fallback;
    if (m.angle != null && (m.state === 'ok' || m.state === 'stop')){
      if (live){ const d = m.angle - s.a; if (Math.abs(d) > DEAD / (US1 - US0) * 180) s.a += Math.sign(d) * Math.min(Math.abs(d), SPEED * dt); }
      else s.a = m.angle;
    }
    if (m.state === 'burnt' && !live) s.a = m.angle;
    const jit = m.state === 'jitter' || m.state === 'stop' ? Math.sin((st.t || 0) * 61) * 2.5 : 0;
    const arm = (s.a + jit) * Math.PI / 180, moving = live && m.angle != null && Math.abs(m.angle - s.a) > 1;
    const o = ctx.origin || legs[0] || [0, 0, 0], r = (+p.rot || 0) * Math.PI / 180, ax = [Math.cos(r), Math.sin(r), 0], ay = [-ax[1], ax[0], 0];
    const W = (x, y, z) => [o[0] + ax[0] * x + ay[0] * y, o[1] + ax[1] * x + ay[1] * y, o[2] + z];
    const items = [], sx = 5.2;                       // the output shaft sits 5.2 mm from the case centre
    const caseM = burnt ? matOf('#4b5568') : CASE;
    let body = B.slabW(W, -11.1, -5.9, 11.1, 5.9, 0, 22.7, caseM, toneI, 1.3)
      + B.slabW(W, -16, -5.9, 16, 5.9, 15.5, 18, caseM, toneI, 1)
      + cyl(...W(sx, 0, 22.7).slice(0, 2), o[2] + 22.7, o[2] + 26.7, 5.9, caseM, toneI, 1)
      + cyl(...W(sx - 6, 0, 22.7).slice(0, 2), o[2] + 22.7, o[2] + 25.2, 3.2, caseM, toneI, .8);
    // mounting-ear holes
    for (const ex of [-13.8, 13.8]){ const h = Array.from({ length: 10 }, (_, i) => { const q = i / 10 * 2 * Math.PI; return W(ex + 1 * Math.cos(q), 1 * Math.sin(q), 18.02); }); body += shape(h, '#2b2825', .4); }
    if (k < .5 && vis(ay)){ const U = Dv(ax[0], ax[1], 0), V = Dv(0, 0, -1), t1 = P(...W(0, 5.92, 11)), t2 = P(...W(0, 5.92, 7.4));
      body += `<text transform="${txM(t1, U, V)}" font-size="3" fill="#f4f1e8" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="800">SG90</text>`
        + `<text transform="${txM(t2, U, V)}" font-size="1.9" fill="#dfe7f5" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="700">9g servo</text>`; }
    if (k > .02){
      // inside: motor at the far end, four nylon gears stepping down to the output shaft, the pot under it, the board
      const g = (x, y, z, rr, th, teeth, rot) => { let sv = cyl(...W(x, y, z).slice(0, 2), o[2] + z, o[2] + z + th, rr, GEAR, toneI, .5, 20);
        for (let i = 0; i < teeth; i++){ const q = rot + i / teeth * 2 * Math.PI; sv += line([W(x + rr * .8 * Math.cos(q), y + rr * .8 * Math.sin(q), z + th + .02), W(x + rr * Math.cos(q), y + rr * Math.sin(q), z + th + .02)], .35); } return sv; };
      const ga = arm * 3;
      let ins = B.slabW(W, -10.6, -5.4, 10.6, 5.4, 1, 2.4, PCB, toneI, .5)
        + cyl(...W(-6, 0, 3).slice(0, 2), o[2] + 3, o[2] + 15, 3, B.M.steel, toneI, .6)
        + cyl(...W(sx, 0, 3).slice(0, 2), o[2] + 3, o[2] + 8, 3.6, matOf('#d9c08a'), toneI, .6)
        + g(-6, 0, 15.2, 2.2, 1.2, 8, ga * 8) + g(-1, 0, 17, 4.4, 1.2, 14, -ga * 3) + g(3, 0, 19.2, 3.8, 1.2, 12, ga * 1.6) + g(sx, 0, 21, 5.3, 1.4, 18, arm);
      // the pot's wiper turns with the shaft
      const wp = W(sx + 2.6 * Math.cos(arm), 2.6 * Math.sin(arm), 8.1);
      ins += `<path d="M${P(...W(sx, 0, 8.1)).map(f).join(' ')}L${P(...wp).map(f).join(' ')}" stroke="#7a5a2a" stroke-width="1" fill="none"/>`;
      body = `<g opacity="${f(1 - .72 * k)}">${body}</g><g opacity="${f(k)}">${ins}</g>`;
      if (k > .5 && callouts(ctx)){
        ctx.label(W(-6, 0, 12), 'DC motor', moving);
        ctx.label(W(-1, 0, 18.2), 'Nylon gear train', moving);
        ctx.label(W(sx, 0, 6), 'Position pot (5 kΩ)', moving);
        ctx.label(W(0, -5.4, 1.8), 'Control board');
      }
    }
    // the horn: a hub and one arm to 16 mm, turning with the output shaft (0 deg points along -x)
    const hz = 31, hc = W(sx, 0, hz), tip = 16;
    const hd = [Math.cos(Math.PI - arm), Math.sin(Math.PI - arm)];
    const hp = [[0, 3.1], [tip, 1.8], [tip + 1.6, 0], [tip, -1.8], [0, -3.1]].map(([a2, b2]) => W(sx + a2 * hd[0] - b2 * hd[1], a2 * hd[1] + b2 * hd[0], hz));
    let horn = cyl(...W(sx, 0, 26.7).slice(0, 2), o[2] + 26.7, o[2] + 29.4, 1.3, B.M.tin, toneI, .5)
      + loft(hp.map(q => [q[0], q[1], q[2] - 1.6]), hp, nr => toneI(nr, HORN)) + shape(hp, HORN.l, .9)
      + cyl(hc[0], hc[1], hc[2] - 3.6, hc[2] + .4, 3.6, HORN, toneI, .9);
    for (let i = 0; i < 5; i++){ const a2 = 5 + i * 2.6, q = W(sx + a2 * hd[0], a2 * hd[1], hz + .02); const [X, Y] = P(...q); horn += `<circle cx="${f(X)}" cy="${f(Y)}" r=".9" fill="#8a8373"/>`; }
    if (m.state === 'stop' || m.state === 'jitter'){ const [X, Y] = P(...W(sx, 0, hz + 3)); horn += `<path d="M${f(X - 7)} ${f(Y - 4)}l-3 -2M${f(X + 7)} ${f(Y - 4)}l3 -2M${f(X - 8)} ${f(Y + 1)}l-4 0M${f(X + 8)} ${f(Y + 1)}l4 0" stroke="#e2483d" stroke-width=".9" stroke-linecap="round"/>`; }
    if (burnt){ const [X, Y] = P(...W(0, 0, 24)); horn += `<circle cx="${f(X)}" cy="${f(Y - 6)}" r="4" fill="#8a847a" opacity=".45"/>`; }
    items.push({ box: B.aabb([W(-16, -6, 0), W(16, 6, .05)]), svg: castShadow([W(-11.1, -5.9, 0), W(11.1, -5.9, 0), W(11.1, 5.9, 0), W(-11.1, 5.9, 0), W(-11.1, -5.9, 26), W(11.1, -5.9, 26), W(11.1, 5.9, 26), W(-11.1, 5.9, 26)], o[2]) });
    items.push({ box: B.aabb([W(-16, -5.9, 0), W(16, 5.9, 26.7)]), svg: body });
    items.push({ box: B.aabb([W(sx - tip - 2, -tip - 2, 26.7), W(sx + tip + 2, tip + 2, hz + .5)]), svg: horn });
    // the lead: three wires out of the case's far end down to the plug
    const COLS = ['#7a4b2a', '#e2483d', '#f08a2b'];
    const plugAt = legs.length === 3 ? [0, 1, 2].map(i => legs[i]) : [0, 1, 2].map(i => W(-30, (i - 1) * 2.54, 0));
    COLS.forEach((col, i) => {
      const a = W(-11.1, (i - 1) * 1.1, 4), e = plugAt[i], e2 = [e[0], e[1], e[2] + 9], pts = [];
      for (let j = 0; j <= 10; j++){ const t = j / 10, sn = Math.sin(t * Math.PI); pts.push([a[0] + (e2[0] - a[0]) * t, a[1] + (e2[1] - a[1]) * t, a[2] + (e2[2] - a[2]) * t + sn * 4]); }
      for (let j = 0; j < pts.length - 1; j++) items.push({ box: B.aabb([pts[j], pts[j + 1]]).map((v, h) => v.map(c => c + (h ? .5 : -.5))), svg: rod(pts[j], pts[j + 1], .45, matOf(col), toneI, .4) });
    });
    // the black 3-pin JR plug over its three pins
    const pc = plugAt[1], u2 = [plugAt[2][0] - plugAt[0][0], plugAt[2][1] - plugAt[0][1]], ul = Math.hypot(...u2) || 1, uu = [u2[0] / ul, u2[1] / ul, 0], nn = [-uu[1], uu[0], 0];
    const Wp = (x, y, z) => [pc[0] + uu[0] * x + nn[0] * y, pc[1] + uu[1] * x + nn[1] * y, pc[2] + z];
    items.push({ box: B.aabb([Wp(-4, -1.4, 0), Wp(4, 1.4, 9)]), svg: B.slabW(Wp, -3.9, -1.3, 3.9, 1.3, 1.5, 9.5, B.M.black, toneI, .9) + (legs.length === 3 ? plugAt.map(h => rod(h, [h[0], h[1], h[2] + 1.5], .32, B.M.gold, toneI, .3)).join('') : '') });
    for (const it of items) ctx.put(it.box, it.svg);
  },
});
})();
