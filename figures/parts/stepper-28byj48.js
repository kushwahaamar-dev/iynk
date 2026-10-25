// @cf title 28BYJ-48 stepper motor
// @cf use engine/bench.list
/* 28BYJ-48 5 V unipolar geared stepper standing on a wooden base, shaft up, with a pointer (or an eight-segment
   prize wheel, `wheel`) on the shaft. Can 28 mm across and 19 mm deep; the flange on top has two ears on 35 mm
   centres; the 5 mm shaft (flats 3 mm across) sits 8 mm off the can's centre on a small boss; the blue cover on
   the side lets out the 5-wire lead (1 blue, 2 pink, 3 yellow, 4 orange, 5 red = common +5 V) to a white 5-pin
   JST-XH plug. Legs [B, P, Y, O, R]: the plug's pins, in holes if given; else `plug: '<id>'` pushes the plug into
   that driver board's socket (uln2003: OUT1-OUT4 and +), `plug: [x, y]` lays it on the mat there (board mm), or it
   lies beside the motor.
   Facts (Kiatronics datasheet and teardown counts, la-components.md §15): coils 50 Ohm (5 V / 50 Ohm = 100 mA per
   energised phase; through a ULN2003 that drops about 0.9 V, 82 mA); 32 full steps per rotor turn (11.25°; the
   sheet's 5.625° is the half step); gearbox 9→32, 11→22, 9→26, 10→31 = 63.68395:1, so 2037.8864 full steps or
   4075.7728 half steps per output turn (2048 over-turns by 1.8° a turn). Half-step pull-out above 1000 Hz, pull-in
   above 600 Hz; in practice about 15 rpm (510 full steps/s) without a ramp. Faster than that it hums and stalls
   while the driver LEDs still blink; the wrong pin order (8, 9, 10, 11 instead of 8, 10, 9, 11) energises both ends
   of one winding on every other step, so the field flips 180° and the rotor jitters in place.
   Half-step sequence (wires pulled low): O, O+Y, Y, Y+P, P, P+B, B, B+O: O and P are the two ends of one
   centre-tapped winding, Y and B of the other.

   Inputs, in order: the solver's m.coils = {B, P, Y, O} (energised = true: a coil carrying a fifth of its rated
   current, once the plug is in a driver board that is wired up); else the host's params `steps` (full steps sent
   so far), `rate` (steps/s), `seq` ('full' | 'half' | 'wave') and `order`; else, while the board runs,
   the pins in `in` (default ['D8', 'D9', 'D10', 'D11'] = IN1..IN4 → blue, pink, yellow, orange) through the
   ULN2003 (input high = coil on). Reports m-like state 'ok' | 'off' | 'stall' | 'jitter'. */
(() => {
const B = SL.bench, T = B.T;
const callouts = ctx => typeof ctx.label === 'function' && (!!ctx.sel || !!(B.md && B.md.def && B.md.def.partPage));
const RATIO = 567424 / 8910, FULL = 32 * RATIO, HALF = 64 * RATIO;          // 63.68395, 2037.8864, 4075.7728
const MAXRATE = { full: 510, half: 1000, wave: 400 };                        // steps/s before it stalls (approximate)
const SEQ = { O: 0, OY: 1, Y: 2, PY: 3, P: 4, BP: 5, B: 6, BO: 7 };
// energised wires → half-step field index 0..7, or null (no torque: nothing on, or both ends of one winding)
const field = c => { const on = ['B', 'O', 'P', 'Y'].filter(w => c[w]); const key = on.slice().sort().join('');
  const k2 = { O: 'O', OY: 'OY', Y: 'Y', PY: 'PY', P: 'P', BP: 'BP', B: 'B', BO: 'BO' }[key]; return k2 != null ? SEQ[k2] : null; };
const COLS = { B: '#3e86d9', P: '#f29ab0', Y: '#f2c230', O: '#f08a2b', R: '#e2483d' };
const CAN = { l: '#e9ecec', m: '#bcc3c5', d: '#7f888b' }, COVER = { l: '#6f9fe0', m: '#4f7fc4', d: '#30558c' }, WOOD = { l: '#e3c79a', m: '#c9a874', d: '#8f7449' };
const COPPER = { l: '#f0a46b', m: '#d4834a', d: '#8f5226' }, GEAR = { l: '#f4efe2', m: '#ddd5c2', d: '#a89f88' };
const DEMO = { idle: { state: 'off' }, turning: { state: 'ok', rpm: 10 }, 'too fast': { state: 'stall', rpm: 24 }, 'wrong pin order': { state: 'jitter' } };
const WHEEL = ['#e2483d', '#f2c230', '#43b05c', '#3e86d9', '#f08a2b', '#8c4bd1', '#f29ab0', '#ece6d6'];
B.part('stepper-28byj48', {
  name: '28BYJ-48 stepper', fig: 'P19', legs: ['B', 'P', 'Y', 'O', 'R'], span: [4, 4],
  params: { wheel: ['pointer', 'wheel'], seq: ['full', 'half', 'wave'], order: ['8-10-9-11', '8-9-10-11'], demo: Object.keys(DEMO) },
  paramNames: { wheel: 'On the shaft', seq: 'Stepping', order: 'Pin order in code', demo: 'Show' },
  example: { demo: 'turning' },
  show: { breadboard: 'mini', parts: [{ id: 'ST1', part: 'stepper-28byj48', at: [-6, 0], rot: 0, demo: 'turning', holes: ['c3', 'c4', 'c5', 'c6', 'c7'] }], wires: [] },
  foot: [42, 32, 36],
  elec: () => ({ type: 'stepper', coils: ['B', 'P', 'Y', 'O'], common: 'R', ohms: 50, vrated: 5, fullSteps: FULL, halfSteps: HALF, maxRate: MAXRATE }),
  model: { RATIO, FULL, HALF, MAXRATE, field },
  tag: (p, m) => {
    const id = p.id; if (!m || !m.state) return id;
    if (m.state === 'stall') return T('{id} · too fast: it hums and stalls', { id });
    if (m.state === 'jitter') return T('{id} · wrong coil order: it jitters', { id });
    if (m.state === 'ok' && m.deg != null) return T('{id} · {n}°', { id, n: Math.round(m.deg) });
    return id;
  },
  draw(ctx){
    const p = ctx.p, st = ctx.st || {}, k = ctx.k != null ? ctx.k : st.xr || 0, legs = ctx.legs || [];
    const all = st.drv || (st.drv = {}), s = all[p.id] || (all[p.id] = { h: 0, t: st.t || 0, state: 'off', on: {} });
    let dt = (st.t || 0) - s.t; s.t = st.t || 0; if (!(dt > 0) || dt > .5) dt = 0;
    const seq = p.seq === 'half' ? 'half' : p.seq === 'wave' ? 'wave' : 'full', perRev = seq === 'half' ? HALF : FULL;
    let deg = 0, state = 'off', on = {};
    const mc = ctx.m && ctx.m.coils;
    if (mc || (!p.demo && p.steps == null && st.ev && st.ev.status === 'running')){
      // follow the field: the rotor moves to the nearest equilibrium; a 180° jump has no preferred way: it jitters
      if (mc) on = mc; else { const ins = Array.isArray(p.in) && p.in.length === 4 ? p.in : ['D8', 'D9', 'D10', 'D11']; ['B', 'P', 'Y', 'O'].forEach((w, i) => { on[w] = (+(st.o && st.o.pins && st.o.pins[ins[i]]) || 0) > .5; }); }
      const fh = field(on);
      if (fh != null){ const cur = ((Math.round(s.h) % 8) + 8) % 8; let d = (fh - cur + 8) % 8; if (d > 4) d -= 8;
        if (Math.abs(d) === 4){ s.jit = (s.jit || 0) + 1; state = 'jitter'; } else { s.h = Math.round(s.h) + d; state = d ? 'ok' : (s.state === 'jitter' ? 'jitter' : 'ok'); } }
      else state = Object.values(on).some(Boolean) ? 'jitter' : 'off';
      s.state = state; deg = s.h / HALF * 360;
    } else if (!p.demo && p.steps != null){
      const rate = Math.abs(+p.rate || 0);
      state = p.order === '8-9-10-11' ? 'jitter' : rate > MAXRATE[seq] ? 'stall' : 'ok';
      if (state === 'ok') s.deg = (+p.steps || 0) / perRev * 360;
      deg = s.deg || 0;
      const ph = Math.floor((st.t || 0) * Math.min(rate, 40)) % 4; on = [{ B: 1, O: 1 }, { O: 1, Y: 1 }, { Y: 1, P: 1 }, { P: 1, B: 1 }][ph];
    } else {
      const dm = DEMO[p.demo] || DEMO.idle; state = dm.state;
      deg = dm.rpm && state === 'ok' ? 40 : 0;
      on = state === 'off' ? {} : state === 'jitter' ? { Y: 1, B: 1 } : { O: 1, Y: 1 };
    }
    const jit = state === 'jitter' || state === 'stall' ? Math.sin((st.t || 0) * 47) * 1.6 : 0;
    const a = (deg + jit) * Math.PI / 180;
    const o = ctx.origin || legs[0] || [0, 0, 0], r = (+p.rot || 0) * Math.PI / 180, ax = [Math.cos(r), Math.sin(r), 0], ay = [-ax[1], ax[0], 0];
    const W = (x, y, z) => [o[0] + ax[0] * x + ay[0] * y, o[1] + ax[1] * x + ay[1] * y, o[2] + z];
    const zb = 6, zt = zb + 19, sx = 8, items = [];
    items.push({ box: B.aabb([W(-22, -18, 0), W(22, 18, .05)]), svg: castShadow([W(-22, -18, 0), W(22, -18, 0), W(22, 18, 0), W(-22, 18, 0), W(-16, -14, zt + 10), W(16, -14, zt + 10), W(16, 14, zt + 10), W(-16, 14, zt + 10)], o[2]) });
    items.push({ box: B.aabb([W(-22, -18, 0), W(22, 18, zb)]), svg: B.slabW(W, -22, -18, 22, 18, 0, zb, WOOD, toneI, 1.2) });
    // can, flange with ears, boss, shaft
    const [cx, cy] = W(0, 0, 0);
    let body = cyl(cx, cy, o[2] + zb, o[2] + zt - .8, 14, CAN, toneI, 1.4, 32);
    const fl = [];
    for (let i = 0; i <= 16; i++){ const q = -Math.PI / 2 + i / 16 * Math.PI; fl.push([17.5 + 3.5 * Math.cos(q), 3.5 * Math.sin(q)]); }
    for (let i = 0; i <= 16; i++){ const q = Math.PI / 2 + i / 16 * Math.PI; fl.push([-17.5 + 3.5 * Math.cos(q), 3.5 * Math.sin(q)]); }
    const flPts = z => fl.map(([x, y]) => W(x, y, z));
    body += loft(flPts(zt - .8), flPts(zt), nr => toneI(nr, CAN)) + shape(flPts(zt), CAN.l, .9);
    for (const ex of [-17.5, 17.5]) body += shape(Array.from({ length: 12 }, (_, i) => { const q = i / 12 * 2 * Math.PI; return W(ex + 2.1 * Math.cos(q), 2.1 * Math.sin(q), zt + .02); }), '#2b2825', .4);
    // the blue cover on the side, where the lead leaves: drawn before the can when it is on the far side
    const cover = B.slabW(W, -19, -8.5, -11, 8.5, zb, zb + 15, COVER, toneI, 1);
    body = vis(ax.map(v => -v)) ? body + cover : cover + body;
    if (k < .5 && vis([0, 0, 1])){ body += B.flatText(W(-4, -6, zt + .02), -ax[1], -ax[0], '28BYJ-48', 2.4, '#5d6467', 800) + B.flatText(W(-4, -9.5, zt + .02), -ax[1], -ax[0], '5VDC', 2, '#5d6467', 700); }
    if (k > .02){
      // inside: two centre-tapped windings on the claw-pole stator round the magnet rotor, and the gear train
      let ins = '';
      const coilOn = [[on.O || on.P, 'O/P'], [on.Y || on.B, 'Y/B']];
      ins += cyl(cx, cy, o[2] + zb + 1, o[2] + zb + 6, 12.5, coilOn[0][0] ? matOf('#ffb36b') : COPPER, toneI, .6, 28)
        + cyl(cx, cy, o[2] + zb + 6.5, o[2] + zb + 11.5, 12.5, coilOn[1][0] ? matOf('#ffb36b') : COPPER, toneI, .6, 28);
      // rotor magnet: alternating poles turning with the rotor (63.68 turns per output turn, drawn slowed)
      const ra = a * 4;
      for (let i = 0; i < 8; i++){ const q0 = ra + i * Math.PI / 4, q1 = q0 + Math.PI / 4, pts = [W(0, 0, zb + 12), W(5 * Math.cos(q0), 5 * Math.sin(q0), zb + 12), W(5 * Math.cos(q1), 5 * Math.sin(q1), zb + 12)];
        ins += shape(pts, i % 2 ? '#e2483d' : '#3e86d9', .3); }
      const gear = (x, y, rr, z, rot) => { let sv = cyl(...W(x, y, 0).slice(0, 2), o[2] + z, o[2] + z + 1, rr, GEAR, toneI, .5, 22);
        for (let i = 0; i < 10; i++){ const q = rot + i / 10 * 2 * Math.PI; sv += line([W(x + rr * .75 * Math.cos(q), y + rr * .75 * Math.sin(q), z + 1.02), W(x + rr * Math.cos(q), y + rr * Math.sin(q), z + 1.02)], .3); } return sv; };
      ins += gear(0, 0, 3, zt - 5, ra) + gear(-4, 6, 6.5, zt - 4, -a * 8) + gear(3, -5, 5.5, zt - 3, a * 2.5) + gear(sx, 0, 7.5, zt - 2.2, a);
      body = `<g opacity="${f(1 - .72 * k)}">${body}</g><g opacity="${f(k)}">${ins}</g>`;
      if (k > .5 && callouts(ctx)){
        ctx.label(W(-12.5, 0, zb + 3.5), 'Winding O–P', !!coilOn[0][0]);
        ctx.label(W(12.5, 0, zb + 9), 'Winding Y–B', !!coilOn[1][0]);
        ctx.label(W(0, 0, zb + 12), '32-step magnet rotor');
        ctx.label(W(sx, 0, zt - 1.2), 'Gears 63.68 : 1');
      }
    }
    items.push({ box: B.aabb([W(-21, -14, zb), W(21, 14, zt)]), svg: body });
    // boss, shaft with its flats, and the pointer or the prize wheel
    const [bx, by] = W(sx, 0, 0);
    let top = cyl(bx, by, o[2] + zt, o[2] + zt + 1.5, 4.5, CAN, toneI, .8) + cyl(bx, by, o[2] + zt + 1.5, o[2] + zt + 9.5, 2.5, B.M.steel, toneI, .7, 16);
    const hz = zt + 8, dir = [Math.cos(a), Math.sin(a)];
    if (p.wheel === 'wheel'){
      for (let i = 0; i < 8; i++){ const q0 = a + i * Math.PI / 4, q1 = q0 + Math.PI / 4, pts = [W(sx, 0, hz)];
        for (let j = 0; j <= 4; j++){ const q = q0 + (q1 - q0) * j / 4; pts.push(W(sx + 26 * Math.cos(q), 26 * Math.sin(q), hz)); }
        top += shape(pts, WHEEL[i], .7); }
      top += cyl(bx, by, o[2] + hz, o[2] + hz + 1.6, 3, B.M.white, toneI, .6);
    } else {
      const tipP = [[0, 2.4], [15, 1.2], [19, 0], [15, -1.2], [0, -2.4]].map(([u0, v0]) => W(sx + u0 * dir[0] - v0 * dir[1], u0 * dir[1] + v0 * dir[0], hz));
      top += loft(tipP.map(q => [q[0], q[1], q[2] - 1.2]), tipP, nr => toneI(nr, matOf('#e2483d'))) + shape(tipP, '#e2483d', .8) + cyl(bx, by, o[2] + hz - 1.2, o[2] + hz + .6, 3.4, matOf('#e2483d'), toneI, .7);
    }
    if (state === 'stall'){ const [X, Y] = P(...W(sx, 0, hz + 3)); top += `<path d="M${f(X - 8)} ${f(Y - 3)}q-2 -2 0 -4q2 -2 0 -4M${f(X + 8)} ${f(Y - 3)}q2 -2 0 -4q-2 -2 0 -4" fill="none" stroke="#e2483d" stroke-width=".8"/>`; }
    items.push({ box: B.aabb([W(sx - 26, -26, zt), W(sx + 26, 26, hz + 2)]), svg: top });
    // the lead: five wires from the cover to the JST plug
    const sock = typeof p.plug === 'string' && B.socketOf ? B.socketOf(p.plug) : null;
    const pl0 = legs.length === 5 ? legs : sock && sock.length === 5 ? sock : (Array.isArray(p.plug) ? [0, 1, 2, 3, 4].map(i => B.BP(p.plug[0] + (i - 2) * 2.5, p.plug[1], B.G.matH - B.G.top)) : [0, 1, 2, 3, 4].map(i => W(-8 + (i - 2) * 2.5, -36, 0)));
    ['B', 'P', 'Y', 'O', 'R'].forEach((w, i) => {
      const s0 = W(-19, (i - 2) * 1.2, zb + 4), e = pl0[i], e2 = [e[0], e[1], e[2] + 6.8], pts = [];      // into the plug's top
      for (let j = 0; j <= 10; j++){ const t = j / 10, sn = Math.sin(t * Math.PI); pts.push([s0[0] + (e2[0] - s0[0]) * t, s0[1] + (e2[1] - s0[1]) * t, s0[2] + (e2[2] - s0[2]) * t + sn * 3]); }
      for (let j = 0; j < pts.length - 1; j++) items.push({ box: B.aabb([pts[j], pts[j + 1]]).map((v, h) => v.map(c => c + (h ? .45 : -.45))), svg: rod(pts[j], pts[j + 1], .42, matOf(COLS[w]), toneI, .35) });
    });
    const pc = pl0[2], u2 = [pl0[4][0] - pl0[0][0], pl0[4][1] - pl0[0][1]], ul = Math.hypot(...u2) || 1, uu = [u2[0] / ul, u2[1] / ul, 0], nn = [-uu[1], uu[0], 0];
    const Wp = (x, y, z) => [pc[0] + uu[0] * x + nn[0] * y, pc[1] + uu[1] * x + nn[1] * y, pc[2] + z];
    items.push({ box: B.aabb([Wp(-6.4, -2.9, 0), Wp(6.4, 2.9, 7)]), svg: B.slabW(Wp, -6.2, -2.9, 6.2, 2.9, 0, 6.5, B.M.white, toneI, .9) });
    for (const it of items) ctx.put(it.box, it.svg);
    st.drv[p.id].state = state;
    s.out = { state, deg: Math.round(deg * 10) / 10 };
  },
});
})();
