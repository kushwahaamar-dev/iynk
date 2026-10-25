// @cf title RGB LED
// @cf use engine/bench.list
/* 5 mm diffused RGB LED, common cathode (a common-anode version is a parameter). Legs ['R','COM','G','B']: with the
   flat of the rim on the left and the legs toward you, red, the common lead (the longest), green, blue; they leave
   the body 1.27 mm apart and splay out to four neighbouring holes. Three dies in one cup: red AlGaInP about 2.0 V,
   green and blue InGaN about 3.1 V, 20 mA each. With 220 Ohm on every colour at 5 V: red (5 - 2.0) / 220 = 13.6 mA,
   green and blue (5 - 3.1) / 220 = 8.6 mA, so equal duty looks red-heavy (330 Ohm on red balances it). Common
   cathode: the long lead to GND, a colour lights when its pin is HIGH. Common anode: the long lead to 5 V and the
   colours are active LOW (analogWrite(pin, 255 - v)); wired as the other kind, every colour stays dark. Without its
   resistor a colour takes far more than 20 mA and burns out. Brightness per colour follows (I / 13.6 mA)^0.55 like
   the single LED. See-through: the three dies in the common lead's reflector cup, each bonded to its own lead. */
(() => {
const B = SL.bench, T = B.T;
const DEF = { common: 'cathode', r: 0, g: 0, b: 0, fault: 'none' };
const CH = [['R', 0, '#ff3b2f', 2.0], ['G', 2, '#36e07a', 3.1], ['B', 3, '#3d7bff', 3.1]];  // channel, leg, light colour, Vf
const VS = 5, RSER = 220, IREF = .0136;
const DIFF = { l: '#f8f5ee', m: '#e6e1d5', d: '#bdb5a3' };

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
const ring = (F, a, b, z, r, n = 24) => B.circ(a, b, r, n).map(([u, v]) => F.W(u, v, z));
const duty = v => Math.max(0, Math.min(1, +v || 0));
// per colour: the solver's result when the LED is in a circuit, else the duty params through 220 Ohm (its own page)
const channels = (p, m) => {
  const out = {};
  for (const [ch, , , vf] of CH){
    const got = m && m.ch && m.ch[ch];
    const d = duty(p[ch.toLowerCase()]);
    // set on its page: in backwards nothing lights; with no resistors every colour that is driven burns out
    if (p.fault === 'backwards') out[ch] = { i: 0, state: 'reverse' };
    else if (p.fault === 'no resistors') out[ch] = { i: 0, state: d > 0 ? 'burnt' : 'off' };
    else if (got) out[ch] = { i: Math.max(0, +got.i_mA || 0) / 1000, state: got.state || 'off' };
    else out[ch] = { i: d * (VS - vf) / RSER, state: d > 0 ? 'ok' : 'off' };
  }
  return out;
};
const levelOf = c => c.state === 'ok' ? Math.min(1, Math.pow(c.i / IREF, .55)) : 0;
// the 5.8 mm rim with its flat 2.45 mm from the centre on the red (-a) side
const RIM = (() => { const o = [], t0 = Math.acos(-2.45 / 2.9); for (let i = 0; i <= 20; i++){ const t = -t0 + 2 * t0 * i / 20; o.push([2.9 * Math.cos(t), 2.9 * Math.sin(t)]); } return o; })();

B.part('rgb-led', {
  name: 'RGB LED',
  legs: ['R', 'COM', 'G', 'B'],
  span: [3, 3],
  params: { common: ['cathode', 'anode'], r: [0, 1], g: [0, 1], b: [0, 1], fault: ['none', 'no resistors', 'backwards'] },
  paramNames: { common: 'Common lead', r: 'Red duty', g: 'Green duty', b: 'Blue duty', fault: 'Break it' },
  defaults: DEF,
  // three LEDs sharing the long lead: anode to cathode for each colour
  elec: p => { const ca = (p.common || DEF.common) === 'anode';
    return CH.map(([ch, leg, , vf]) => ({ type: 'led', ch, legs: ca ? [1, leg] : [leg, 1], vf, imax: .02 })); },
  // on its own page a press steps through red, green, blue, white and off
  press: (p, down) => { if (!down) return null; const q = Object.assign({}, DEF, p), seq = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 1], [0, 0, 0]];
    const i = seq.findIndex(([r, g, b]) => duty(q.r) === r && duty(q.g) === g && duty(q.b) === b), [r, g, b] = seq[(i + 1) % seq.length]; return { r, g, b }; },
  tag: (p, m) => { const c = channels(Object.assign({}, DEF, p), m), burnt = CH.filter(([ch]) => c[ch].state === 'burnt').map(([ch]) => ch);
    if (burnt.length) return T('{id} · {ch} burnt', { id: p.id, ch: burnt.join(' ') });
    if (CH.some(([ch]) => c[ch].state === 'reverse')) return T('{id} · backwards: dark', { id: p.id });
    const mA = ch => (c[ch].i * 1000).toFixed(1);
    return T('{id} · R {r} · G {g} · B {b} mA', { id: p.id, r: mA('R'), g: mA('G'), b: mA('B') }); },
  draw(ctx){
    const p = Object.assign({}, DEF, ctx.p), legs = ctx.legs, k = xrK(ctx), c = channels(p, ctx.m);
    const F = frame(legs, 0, legs.length - 1), zl = 7, zt = zl + 7.4;
    const lv = { R: levelOf(c.R), G: levelOf(c.G), B: levelOf(c.B) }, total = lv.R + lv.G + lv.B;
    const burnt = CH.some(([ch]) => c[ch].state === 'burnt');
    // the colour the diffuser shows: the lit dies added together
    const rgb = [0, 0, 0];
    for (const [ch, , col] of CH) [1, 3, 5].forEach((o, i) => { rgb[i] += parseInt(col.substr(o, 2), 16) * lv[ch]; });
    const peak = Math.max(1, ...rgb), mixCol = '#' + rgb.map(v => Math.round(v / peak * 255).toString(16).padStart(2, '0')).join('');
    const glow = Math.min(1, total / 1.6);
    let s = '';
    // legs: out of the body 1.27 mm apart, splayed to the holes; the common lead has a knee so it reads as the longest
    legs.forEach((L, i) => { const [a, b] = F.loc(L), ea = (i - 1.5) * 1.27, top = F.W(ea, 0, zl);
      if (i === 1){ const kn = F.W(a, b, zl * .55);
        s += rod(F.W(a, b, -.3), kn, .24, B.M.tin, toneI, .45) + rod(kn, F.W((a + ea) / 2 - .5, b, zl * .75), .24, B.M.tin, toneI, .45) + rod(F.W((a + ea) / 2 - .5, b, zl * .75), top, .24, B.M.tin, toneI, .45); }
      else s += rod(F.W(a, b, -.3), F.W(a, b, zl * .45), .24, B.M.tin, toneI, .45) + rod(F.W(a, b, zl * .45), top, .24, B.M.tin, toneI, .45); });
    // see-through: lead posts, the cup on the common lead, three dies and their bond wires
    if (k > .02){
      let x = '';
      for (let i = 0; i < 4; i++) x += rod(F.W((i - 1.5) * 1.27, 0, zl), F.W((i - 1.5) * 1.27, 0, zl + (i === 1 ? 2.6 : 3.4)), .26, B.M.tin, toneI, .3);
      const cupC = F.W(-.64, 0, zl + 2.6);
      x += cyl(cupC[0], cupC[1], cupC[2], cupC[2] + .7, 1.2, B.M.steel, toneI, .35, 14);
      CH.forEach(([ch, leg, col], j) => { const da = -.64 + (j - 1) * .7, die = F.W(da, 0, zl + 3.32), lead = F.W((leg - 1.5) * 1.27, 0, zl + 3.4);
        const [X, Y] = P(...die), on = lv[ch] > .02, dead = c[ch].state === 'burnt';
        x += `<rect x="${f(X - 1.2)}" y="${f(Y - 1.2)}" width="2.4" height="2.4" fill="${dead ? '#2a2623' : on ? col : mix(col, '#6b655c', .55)}" stroke="${INK}" stroke-width=".3"/>`;
        x += `<path d="${pd([die, F.W((da + (leg - 1.5) * 1.27) / 2, 0, zl + 4.6), lead], false)}" fill="none" stroke="#e8c15a" stroke-width=".5"/>`; });
      s += `<g opacity="${f(Math.min(1, k * 1.4))}">${x}</g>`;
    }
    // body: rim with the flat on the red side, the epoxy column and the dome, tinted by the mixed light
    const body = matOf(burnt && total < .05 ? '#6a5f52' : glow > .05 ? mix('#f8f5ee', mixCol, .35 + .45 * glow) : DIFF.l);
    const c0 = F.W(0, 0, zl);
    const A = RIM.map(([a, b]) => F.W(a, b, zl)), Bt = RIM.map(([a, b]) => F.W(a, b, zl + .9));
    let shell = loft(A, Bt, n => toneI(n, body)) + fill(pd(Bt), toneI([0, 0, 1], body)) + hullInk([...A, ...Bt], .8) + ink(pd(Bt), .5);
    shell += cyl(c0[0], c0[1], c0[2] + .9, c0[2] + 5, 2.5, body, toneI, .9, 24) + rod(F.W(0, 0, zl + 5), F.W(0, 0, zt), 2.5, body, toneI, .9, .9);
    s += k > .02 ? `<g opacity="${f(1 - .7 * k)}">${shell}</g>` : shell;
    if (glow > .05){ const [X, Y] = P(...F.W(0, 0, zl + 5.5));
      s += `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(5 + 9 * glow)}" fill="${mixCol}" opacity="${f(.28 * glow)}"/><circle cx="${f(X)}" cy="${f(Y)}" r="${f(2 + 2 * glow)}" fill="#fffbe8" opacity="${f(.7 * glow)}"/>`; }
    if (burnt){ const [X, Y] = P(...F.W(0, 0, zt + .6)); s += `<circle cx="${f(X)}" cy="${f(Y - 4)}" r="3" fill="#8a847a" opacity=".45"/>`; }
    if ((ctx.solo || (B.md && B.md.def && B.md.def.partPage)) && k > .5){
      ctx.label(F.W(-.64, 0, zl + 3.32), 'Red, green and blue dies');
      ctx.label(F.W(-.64, 0, zl + 2.6), (p.common === 'anode') ? 'Common anode cup' : 'Common cathode cup');
    }
    ctx.put(F.bx(-4.2, -3.2, -.3, 4.2, 3.2, zt + .4), s);
  },
  show: { breadboard: 'mini', holes: ['e7', 'e8', 'e9', 'e10'], params: { r: 1, g: .25, b: .6 } },
});
})();
