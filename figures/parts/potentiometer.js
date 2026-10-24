// @cf title Potentiometer
// @cf use engine/bench.list
/* B10K rotary potentiometer, the 9 mm kit part (RK09 class): blue 9.8 mm body, metal bushing, black knurled knob,
   three legs in a row on 2.5 mm pitch so they sit in three neighbouring holes. "B" is the linear taper, 10 kOhm
   +-20 % end to end, about 300 degrees of rotation. Legs ['1','W','3']: with the legs toward you and the shaft up,
   pin 1 is the left (anticlockwise) end, W the wiper, pin 3 the right (clockwise) end; turning clockwise moves the
   wiper from pin 1 toward pin 3. pos 0..1 is the wiper position (0 = full anticlockwise, at pin 1), so with pin 1 on
   GND and pin 3 on 5 V, V(W) = 5 V x pos. Rated about 0.05 W (typical for a 9 mm carbon pot): with 5 V on one end and
   GND on the wiper, turning toward that end shorts 5 V through a sliver of track, which gets hot and burns.
   See-through: the horseshoe carbon track (300 degrees, open toward the legs), the end terminals, the wiper on the
   shaft and the collector ring that carries the wiper to the middle leg; the track between pin 1 and the wiper and
   between the wiper and pin 3 is tinted with its share of the resistance. */
(() => {
const B = SL.bench, T = B.T;
const DEF = { pos: .5, ohms: 10000, fault: 'none' };
// faults the page can set; in a circuit the solver's verdict (m.state) is used unless one is set here
const FAULTS = { none: null, 'track shorted': 'hot', 'track burnt': 'burnt' };
const stateOf = (p, m) => FAULTS[p.fault] || (m && m.state) || null;
const SWEEP = 300;
const BLUE = { l: '#5b8fd9', m: '#3f6fb8', d: '#28487a' }, KNOB = { l: '#5a5550', m: '#3a3632', d: '#24211f' };
const TRACK = '#3b302a', SEG1 = '#e2483d', SEG2 = '#3e86d9', LIVE = '#f4b829';

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
const ring = (F, a, b, z, r, n = 24) => B.circ(a, b, r, n).map(([u, v]) => F.W(u, v, z));
// clockwise angle from 12 o'clock (away from the legs), seen from above: direction in the part's (a, b) plane
const dirOf = deg => { const r = deg * Math.PI / 180; return [Math.sin(r), -Math.cos(r)]; };
const arc = (F, cb, z, r, d0, d1, n) => { const o = []; for (let i = 0; i <= n; i++){ const [x, y] = dirOf(d0 + (d1 - d0) * i / n); o.push(F.W(x * r, cb + y * r, z)); } return o; };
const pos01 = p => Math.max(0, Math.min(1, +p.pos || 0));

B.part('potentiometer', {
  name: 'Potentiometer',
  legs: ['1', 'W', '3'],
  span: [2, 4],
  params: { pos: [0, 1], ohms: [1000, 1000000], fault: Object.keys(FAULTS) },
  paramNames: { fault: 'Break it' },
  steps: { pos: [0, .25, .5, .75, 1], ohms: [1000, 10000, 100000] },
  defaults: DEF,
  // legs [end 1, wiper, end 3]; R(1-W) = ohms x pos, R(W-3) = ohms x (1 - pos)
  elec: p => ({ type: 'pot', ohms: Math.max(1, +p.ohms || DEF.ohms), pos: pos01(Object.assign({}, DEF, p)), pmax: .05, taper: 'linear', sweep: SWEEP }),
  // each press turns the knob an eighth of its travel clockwise, then back to the start
  press: (p, down) => down ? { pos: pos01(Object.assign({}, DEF, p)) >= .999 ? 0 : Math.min(1, Math.round((pos01(Object.assign({}, DEF, p)) + .125) * 8) / 8) } : null,
  tag: (p, m) => {
    const q = Object.assign({}, DEF, p), pct = Math.round(pos01(q) * 100);
    if (stateOf(q, m) === 'burnt') return T('{id} · track burnt', { id: q.id });
    if (stateOf(q, m) === 'hot') return T('{id} · hot: 5 V shorted through the track', { id: q.id });
    if (m && m.v != null) return T('{id} · {pct} % · {v} V', { id: q.id, pct, v: (+m.v).toFixed(2) });
    return T('{id} · {pct} %', { id: q.id, pct });
  },
  draw(ctx){
    const p = Object.assign({}, DEF, ctx.p), legs = ctx.legs, k = xrK(ctx), m = ctx.m || {}, pos = pos01(p);
    const F = frame(legs, 0, legs.length - 1), cb = -2.6;            // the shaft sits 2.6 mm behind the leg row
    const sf = stateOf(p, m), hot = sf === 'hot', burnt = sf === 'burnt', ang = (pos - .5) * SWEEP;
    const zb = 6.2, zbu = 7.6, zk0 = 7.8, zk1 = 13.6, rk = 4.6;
    let s = '';
    // legs: straight down out of the front of the body
    for (const L of legs){ const [a, b] = F.loc(L);
      s += rod(F.W(a, -.4, 1.4), F.W(a, b, 1.4), .3, B.M.tin, toneI, .4) + rod(F.W(a, b, 1.4), F.W(a, b, -.3), .3, B.M.tin, toneI, .4); }
    // see-through internals, under a ghosted body
    if (k > .02){
      const z = 3.4, r = 3.3, d1 = -SWEEP / 2 + SWEEP * pos;
      let x = fill(pd(ring(F, 0, cb, z - .25, 4.3)), '#c9a874');                          // phenolic wafer
      x += `<path d="${pd(arc(F, cb, z, r, -SWEEP / 2, SWEEP / 2, 30), false)}" fill="none" stroke="${burnt ? '#1f1a17' : TRACK}" stroke-width="2.6" stroke-linecap="butt"/>`;
      x += `<path d="${pd(arc(F, cb, z + .02, r, -SWEEP / 2, d1, 22), false)}" fill="none" stroke="${SEG1}" stroke-width="1" opacity=".85"/>`;
      x += `<path d="${pd(arc(F, cb, z + .02, r, d1, SWEEP / 2, 22), false)}" fill="none" stroke="${SEG2}" stroke-width="1" opacity=".85"/>`;
      x += `<path d="${pd(ring(F, 0, cb, z + .03, 1.5))}" fill="none" stroke="${B.M.steel.m}" stroke-width="1.3"/>`;    // collector ring
      // end terminals and the centre terminal, from the arc ends and the ring down to the legs
      const [e1x, e1y] = dirOf(-SWEEP / 2), [e3x, e3y] = dirOf(SWEEP / 2), la = legs.map(L => F.loc(L));
      x += rod(F.W(e1x * r, cb + e1y * r, z), F.W(la[0][0], -.4, z - .8), .35, B.M.tin, toneI, .3) + rod(F.W(e3x * r, cb + e3y * r, z), F.W(la[2][0], -.4, z - .8), .35, B.M.tin, toneI, .3)
        + rod(F.W(0, cb + 1.5, z), F.W(la[1][0], -.4, z - .8), .35, B.M.tin, toneI, .3);
      // wiper: a sprung blade from the collector ring to the track at the knob angle
      const [wx, wy] = dirOf(ang), wc = hot || burnt ? '#e2483d' : B.M.steel.l;
      x += rod(F.W(wx * 1.2, cb + wy * 1.2, z + .5), F.W(wx * r, cb + wy * r, z + .15), .35, matOf(wc), toneI, .35) + fill(pd(ring(F, wx * r, cb + wy * r, z + .2, .45, 10)), LIVE);
      if (hot && !burnt){ const [X, Y] = P(...F.W(wx * r, cb + wy * r, z)); x += `<circle cx="${f(X)}" cy="${f(Y)}" r="5" fill="#f08a2b" opacity=".45"/>`; }
      s += `<g opacity="${f(Math.min(1, k * 1.4))}">${x}</g>`;
    }
    // body, bushing, knob
    let body = F.slab(-4.9, cb - 4.9, 4.9, cb + 4.9, 0, zb - .35, burnt ? matOf('#3f3a3a') : hot ? matOf('#c0504a') : BLUE, .7);
    body += F.slab(-4.6, cb - 4.6, 4.6, cb + 4.6, zb - .35, zb, B.M.steel, .45);                    // the metal cover that holds the bushing
    const c = F.W(0, cb, zb), kc = F.W(0, cb, zk0);
    body += cyl(c[0], c[1], c[2], zbu - zb + c[2], 3.4, B.M.steel, toneI, .6, 18);
    body += cyl(kc[0], kc[1], kc[2], kc[2] + zk1 - zk0, rk, KNOB, toneI, .9, 22);
    // knurls round the side of the knob, on the half that faces the viewer
    const n0 = F.W(0, cb, 0);
    for (let i = 0; i < 20; i++){ const a = i / 20 * 2 * Math.PI, d = [Math.cos(a), Math.sin(a)];
      const n = F.W(d[0], cb + d[1], 0); if (!vis([n[0] - n0[0], n[1] - n0[1], 0])) continue;
      body += `<path d="${pd([F.W(d[0] * rk, cb + d[1] * rk, zk0 + .6), F.W(d[0] * rk, cb + d[1] * rk, zk1 - .4)], false)}" stroke="${KNOB.d}" stroke-width=".45" fill="none"/>`; }
    // indicator line on the knob top shows the angle
    const [ix, iy] = dirOf(ang);
    body += `<path d="${pd([F.W(ix * .8, cb + iy * .8, zk1 + .02), F.W(ix * (rk - .6), cb + iy * (rk - .6), zk1 + .02)], false)}" stroke="#f6f3ea" stroke-width="1.3" stroke-linecap="round" fill="none"/>`;
    // the 300-degree travel marks on the body top, so the angle reads against a scale
    for (const d of [-SWEEP / 2, 0, SWEEP / 2]){ const [mx, my] = dirOf(d);
      body += `<path d="${pd([F.W(mx * 3.9, cb + my * 3.9, zb + .02), F.W(mx * 4.6, cb + my * 4.6, zb + .02)], false)}" stroke="#3a3632" stroke-width=".8" fill="none"/>`; }
    s += k > .02 ? `<g opacity="${f(1 - .7 * k)}">${body}</g>` : body;
    if (hot || burnt){ const [X, Y] = P(...F.W(0, cb, zk1 + 2)); s += `<circle cx="${f(X)}" cy="${f(Y - 6)}" r="4" fill="#8a847a" opacity=".4"/><circle cx="${f(X + 3)}" cy="${f(Y - 12)}" r="3" fill="#8a847a" opacity=".3"/>`; }
    if ((ctx.solo || (B.md && B.md.def && B.md.def.partPage)) && k > .5){
      const [wx, wy] = dirOf(ang);
      s += pill(F, F.W(-3.3, cb, 3.4), -58, -24, T('Carbon track')) + pill(F, F.W(wx * 3.3, cb + wy * 3.3, 3.6), 52, -62, T('Wiper'), true)
        + pill(F, F.W(0, cb + 1.5, 3.4), 40, 34, T('Ring to pin W'));
    }
    ctx.put(F.bx(-5.2, cb - 5.2, -.3, 5.2, cb + 5.2, zk1 + .2), s);
  },
  show: { breadboard: 'mini', holes: ['e8', 'e9', 'e10'], params: { pos: .7 } },
});
})();
