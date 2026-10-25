// @cf title Ultrasonic distance sensor (HC-SR04)
// @cf use engine/bench.list
/* HC-SR04 module: a blue 45 x 20 mm board, 1.6 mm thick, standing on its 4-pin header (2.54 mm, centred on the
   bottom edge) with the two 16 mm transducers facing out of the front, 26 mm apart: T (transmit) on the left and
   R (receive) on the right as seen from the front, with the 12 MHz crystal between them. Legs ['VCC','TRIG','ECHO',
   'GND'] left to right from the front. 5 V, 15 mA. A 10 us HIGH on TRIG sends eight 40 kHz cycles; ECHO then stays
   HIGH for the round trip (58 us per cm, 2 cm to about 4 m, 38 ms when nothing echoes). The sensor's behaviour
   runs in the interpreter (the lesson's hc-sr04 world device); this drawing shows the module and, while the
   sketch runs, the 40 kHz bursts leaving T. */
(() => {
const B = SL.bench;
const PCB = { l: '#3b78c9', m: '#2c62a8', d: '#1c4277' }, CAN = { l: '#e9ebec', m: '#c3c7ca', d: '#8d9397' };
const MESH = '#3a3f44', W0 = 22.5, Z0 = 2.5, Z1 = 22.5, ZC = 12.5, RC = 8, DEPTH = 12;

const frame = legs => {
  const n = legs.length, o = [0, 1, 2].map(k => legs.reduce((s, q) => s + q[k], 0) / n);
  const dx = legs[n - 1][0] - legs[0][0], dy = legs[n - 1][1] - legs[0][1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
  const W = (a, b, z) => [o[0] + ux * a - uy * b, o[1] + uy * a + ux * b, o[2] + z];
  return { o, W, u: [ux, uy, 0], v: [-uy, ux, 0] };
};

B.part('hc-sr04', {
  name: 'Ultrasonic distance sensor (HC-SR04)', fig: 'P17',
  legs: ['VCC', 'TRIG', 'ECHO', 'GND'],
  span: [3, 3],
  show: { breadboard: 'mini', holes: ['a5', 'a6', 'a7', 'a8'] },
  tag: p => p.id,
  draw(ctx){
    const legs = ctx.legs, st = ctx.st || {}, F = frame(legs), W = F.W;
    const k = ctx.k != null ? ctx.k : ease(Math.min(1, Math.max(0, st.xr || 0)));
    const running = !!(st.ev && st.ev.status === 'running');
    let s = '';
    // header: the black plastic strip on the breadboard and the four pins through it into the board
    s += B.slabW(W, -5.1, -1.25, 5.1, 1.25, 0, Z0, B.M.black, toneI, .6);
    for (const L of legs) s += rod(L, [L[0], L[1], L[2] + Z0 + 1], .32, B.M.tin, toneI, .3);
    // the board, its silk and the crystal
    s += B.slabW(W, -W0, -.8, W0, .8, Z0, Z1, PCB, toneI, .8);
    s += B.slabW(W, -2.6, .8, 2.6, 2.6, ZC - 1.8, ZC + 1.8, B.M.steel, toneI, .5);
    const U = Dv(...F.u), V = Dv(0, 0, -1);
    if (vis(F.v)){
      s += `<text transform="${txM(P(...W(0, .82, Z1 - 2.2)), U, V)}" font-size="1.7" fill="#f2f4f6" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="800">HC-SR04</text>`;
      ['VCC', 'Trig', 'Echo', 'Gnd'].forEach((t, i) => { s += `<text transform="${txM(P(...W((i - 1.5) * 2.54, .82, Z0 + 1.1)), U, V)}" font-size=".9" fill="#f2f4f6" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="700">${t}</text>`; });
    }
    ctx.put(B.aabb([W(-W0, -1.3, 0), W(W0, 2.6, Z1)]), s);
    // the two transducers: aluminium cans with a dark mesh face
    for (const [a, name] of [[-13, 'T'], [13, 'R']]){
      const c0 = W(a, .8, ZC), c1 = W(a, .8 + DEPTH, ZC);
      let t = rod(c0, c1, RC, CAN, toneI, .8, RC, 24);
      if (vis(F.v)){
        const ring = rr => Array.from({ length: 24 }, (_, i) => { const q = i / 24 * 2 * Math.PI; return W(a + rr * Math.cos(q), .8 + DEPTH + .02, ZC + rr * Math.sin(q)); });
        t += shape(ring(RC - 1.2), MESH, .4);
        t += `<text transform="${txM(P(...W(a, .8 + DEPTH + .05, ZC - .7)), U, V)}" font-size="2.2" fill="#d9dde0" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="800">${name}</text>`;
      }
      ctx.put(B.aabb([W(a - RC, .8, ZC - RC), W(a + RC, .8 + DEPTH, ZC + RC)]), t);
    }
    // while the sketch runs, rings of sound leave T and spread out in front
    if (running && k < .5){
      const t = st.t || 0; let w = '';
      for (let i = 0; i < 3; i++){
        const ph = (t * 1.4 + i / 3) % 1, r = RC + 2 + ph * 14, y = .8 + DEPTH + 2 + ph * 22;
        const pts = Array.from({ length: 13 }, (_, j) => { const q = (j / 12 - .5) * Math.PI * .8; return W(-13 + r * .45 * Math.sin(q), y, ZC + r * .55 * Math.cos(q)); });
        w += `<path d="${pd(pts, false)}" fill="none" stroke="#3e86d9" stroke-width=".8" opacity="${f(.7 * (1 - ph))}"/>`;
      }
      ctx.put(B.aabb([W(-28, DEPTH, ZC - 12), W(2, DEPTH + 40, ZC + 12)]), w);
    }
  },
});
})();
