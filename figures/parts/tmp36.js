// @cf title Temperature sensor (TMP36)
// @cf use engine/bench.list
/* Analog Devices TMP36 in TO-92: black epoxy, 4.8 mm flat face, 3.7 mm deep, 4.8 mm tall, marked "TMP" / "36GZ".
   Legs ['+VS','VOUT','GND']: with the flat face toward you and the legs down, +Vs is on the left, Vout in the
   middle, GND on the right. Supply 2.7-5.5 V (7 V absolute maximum), under 50 uA. Output 10 mV per degree C with a
   0.5 V offset: 0.5 V at 0 C, 0.75 V at 25 C, 0.1 V at -40 C, 1.75 V at 125 C (specified range; it works to 150 C,
   2.0 V, less accurately), +-2 C typical. T = (Vout - 0.5 V) x 100. Put in backwards (+Vs and GND swapped) it
   conducts through its substrate, gets hot enough to burn a finger within seconds and dies; below 2.7 V the output
   is not valid; above 7 V it is damaged. See-through: the epoxy clears to show the lead frame, the silicon die on
   the middle lead's paddle (a bandgap temperature core and an output amplifier) and the gold bond wires. */
(() => {
const B = SL.bench, T = B.T;
const DEF = { tempC: 22, fault: 'none' };
// faults the page can set; in a circuit the solver's verdict (m.state) is used unless one is set here
const FAULTS = { none: null, backwards: 'hot', destroyed: 'dead', 'supply too low': 'low' };
const stateOf = (p, m) => FAULTS[p.fault] || (m && m.state) || null;
const EPOXY = { l: '#4a4642', m: '#33302d', d: '#1f1d1b' };

const frame = (legs, i0, i1) => {
  const n = legs.length, o = [0, 1, 2].map(k => legs.reduce((s, q) => s + q[k], 0) / n);
  const dx = legs[i1][0] - legs[i0][0], dy = legs[i1][1] - legs[i0][1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
  const W = (a, b, z) => [o[0] + ux * a - uy * b, o[1] + uy * a + ux * b, o[2] + z];
  return { o, W, u: [ux, uy, 0], v: [-uy, ux, 0],
    loc: q => { const x = q[0] - o[0], y = q[1] - o[1]; return [x * ux + y * uy, -x * uy + y * ux]; },
    slab: (a0, b0, a1, b1, z0, z1, m, w = .6) => B.slabW(W, a0, b0, a1, b1, z0, z1, m, toneI, w),
    bx: (a0, b0, z0, a1, b1, z1) => B.aabb([W(a0, b0, z0), W(a1, b1, z1), W(a0, b1, z0), W(a1, b0, z1)]) };
};
const xrK = ctx => ctx.k != null ? ctx.k : ease(Math.min(1, Math.max(0, (ctx.st && ctx.st.xr) || 0)));
const tempOf = p => Math.max(-40, Math.min(150, +p.tempC || 0));
const voutAt = c => .5 + .01 * c;
// TO-92 outline in the part's (a, b) plane: the flat face at b = BF, straight sides 1.3 mm, a half round back
const BF = 1.0, RB = 2.4;
const outline = () => { const o = [[-RB, BF], [RB, BF], [RB, BF - 1.3]];
  for (let i = 1; i < 12; i++){ const t = -i / 12 * Math.PI; o.push([RB * Math.cos(t), BF - 1.3 + RB * Math.sin(t)]); }
  o.push([-RB, BF - 1.3]); return o; };
const OUT = outline();
// die colour from the temperature, cold blue through warm yellow to hot red
const heatCol = c => c < 20 ? mix('#3e86d9', '#9a958c', Math.max(0, (c + 40) / 60)) : c < 60 ? mix('#9a958c', '#f2c230', (c - 20) / 40) : mix('#f2c230', '#e2483d', Math.min(1, (c - 60) / 60));

B.part('tmp36', {
  name: 'Temperature sensor (TMP36)',
  legs: ['+VS', 'VOUT', 'GND'],
  span: [2, 2],
  params: { tempC: [-40, 150], fault: Object.keys(FAULTS) },
  steps: { tempC: [-40, 0, 22, 33, 60, 100, 125, 150] },
  paramNames: { tempC: 'Temperature (°C)', fault: 'Break it' },
  defaults: DEF,
  // an active sensor: powered from legs 0 (+) and 2 (-), it drives leg 1 to 0.5 V + 10 mV per degree C
  elec: p => { const q = Object.assign({}, DEF, p);
    return { type: 'sensor', model: 'tmp36', supply: [0, 2], out: 1, vout: voutAt(tempOf(q)), vmin: 2.7, vmax: 5.5, vabs: 7, iq: 5e-5, polar: true }; },
  voutAt,
  // pinching it between two fingers warms it toward skin temperature; letting go puts it back in the room
  press: (p, down) => ({ tempC: down ? 33 : DEF.tempC }),
  tag: (p, m) => { const q = Object.assign({}, DEF, p), c = tempOf(q);
    const sf = stateOf(q, m);
    if (sf === 'dead' || sf === 'burnt') return T('{id} · destroyed', { id: q.id });
    if (sf === 'hot' || sf === 'reverse') return T('{id} · backwards: burning hot', { id: q.id });
    if (sf === 'low') return T('{id} · supply too low', { id: q.id });
    return T('{id} · {c} °C · {v} V', { id: q.id, c: Math.round(c), v: voutAt(c).toFixed(2) }); },
  draw(ctx){
    const p = Object.assign({}, DEF, ctx.p), legs = ctx.legs, k = xrK(ctx), m = ctx.m || {}, c = tempOf(p);
    const F = frame(legs, 0, legs.length - 1), z0 = 3.0, z1 = 7.8;
    const sf = stateOf(p, m), hot = sf === 'hot' || sf === 'reverse', dead = sf === 'dead' || sf === 'burnt';
    const t = (ctx.st && ctx.st.t) || 0;
    let s = '';
    // legs: 1.27 mm apart where they leave the body, formed out to the 2.54 mm holes
    legs.forEach((L, i) => { const [a, b] = F.loc(L), ea = (i - 1) * 1.27;
      s += rod(F.W(a, b, -.3), F.W(a, b, 1.6), .22, B.M.tin, toneI, .4) + rod(F.W(a, b, 1.6), F.W(ea, 0, z0), .22, B.M.tin, toneI, .4); });
    // see-through: lead frame, paddle, die, bond wires
    if (k > .02){
      let x = '';
      for (let i = 0; i < 3; i++) x += rod(F.W((i - 1) * 1.27, 0, z0), F.W((i - 1) * 1.27, 0, i === 1 ? 5.0 : 5.9), .22, B.M.tin, toneI, .3);
      x += F.slab(-.8, -.25, .8, .25, 5.0, 6.6, B.M.tin, .3);                                       // the paddle on the middle lead
      x += F.slab(-.5, .25, .5, .45, 5.4, 6.4, matOf(dead ? '#2a2623' : heatCol(hot ? 140 : c)), .3); // the die, coloured by its temperature
      for (const sx of [-1, 1]) x += `<path d="${pd([F.W(sx * .35, .46, 6.2), F.W(sx * .9, .7, 6.9), F.W(sx * 1.27, .1, 5.9)], false)}" fill="none" stroke="#e8c15a" stroke-width=".55"/>`;
      x += `<path d="${pd([F.W(0, .46, 6.3), F.W(0, .7, 6.8), F.W(0, .3, 6.6)], false)}" fill="none" stroke="#e8c15a" stroke-width=".55"/>`;
      s += `<g opacity="${f(Math.min(1, k * 1.4))}">${x}</g>`;
    }
    // the epoxy body: loft the TO-92 outline from the base to the top
    const A = OUT.map(([a, b]) => F.W(a, b, z0)), Bt = OUT.map(([a, b]) => F.W(a, b, z1));
    const mat = dead ? matOf('#2b2422') : hot ? matOf(mix(EPOXY.l, '#c0392b', .55)) : EPOXY;
    let body = loft(A, Bt, n => toneI(n, mat)) + fill(pd(Bt), toneI([0, 0, 1], mat)) + hullInk([...A, ...Bt], .8) + ink(pd(Bt), .5);
    // the marking on the flat face, readable only when the face is toward the viewer
    const U = Dv(...F.u), V = Dv(0, 0, -1);
    for (const [txt, z] of [['TMP', 6.7], ['36GZ', 5.4]]){ const o = P(...F.W(0, BF + .02, z));
      body += `<text transform="${txM(o, U, V)}" font-size=".95" fill="#d8d2c4" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="700">${txt}</text>`; }
    if (dead) body += `<path d="${pd([F.W(-1.2, BF + .03, 7.4), F.W(-.2, BF + .03, 6.3), F.W(.5, BF + .03, 6.9), F.W(1.3, BF + .03, 5.6)], false)}" fill="none" stroke="#120f0e" stroke-width=".7"/>`;
    s += k > .02 ? `<g opacity="${f(1 - .72 * k)}">${body}</g>` : body;
    // backwards: heat shimmer, then smoke once it has died
    if (hot && !dead){ let w = '';
      for (let i = 0; i < 3; i++){ const ph = (t * 1.6 + i / 3) % 1, a0 = (i - 1) * 1.6, zz = z1 + 1 + ph * 6, pts = [];
        for (let j = 0; j <= 6; j++) pts.push(F.W(a0 + Math.sin(j * 1.3 + t * 5 + i) * .5, 0, zz + j * .5));
        w += `<path d="${pd(pts, false)}" fill="none" stroke="#e2483d" stroke-width=".7" opacity="${f(.75 * (1 - ph))}"/>`; }
      s += w; }
    if (dead){ const [X, Y] = P(...F.W(0, 0, z1 + 1)); s += `<circle cx="${f(X)}" cy="${f(Y - 5)}" r="3.5" fill="#8a847a" opacity=".45"/><circle cx="${f(X + 2.5)}" cy="${f(Y - 10)}" r="2.6" fill="#8a847a" opacity=".3"/>`; }
    if ((ctx.solo || (B.md && B.md.def && B.md.def.partPage)) && k > .5){
      ctx.label(F.W(0, .4, 5.9), 'Silicon die');
      ctx.label(F.W(.9, .7, 6.9), 'Gold bond wires');
      ctx.label(F.W(-1.27, 0, 4.0), 'Lead frame');
    }
    ctx.put(F.bx(-2.9, BF - 1.3 - RB - .1, -.3, 2.9, BF + .1, z1 + .2), s);
  },
  show: { breadboard: 'mini', holes: ['e8', 'e9', 'e10'], params: { tempC: 25 } },
});
})();
