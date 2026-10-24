// @cf title Traffic light LED module
// @cf use engine/bench.list
/* The kit traffic-light module: a black 14 x 30 mm board standing on a 4-pin header (2.54 mm) with three 5 mm
   LEDs, red at the top, yellow, green at the bottom, each with its own series resistor on the board, so its pins
   go straight to Arduino outputs. Legs ['GND','R','Y','G'] left to right from the front. Each LED takes about 10 mA
   from a 5 V pin through its on-board resistor.
   The module has no solver model: each LED lights from the pin its leg is wired to while the sketch runs (a wire
   from a board pin into the same breadboard strip as the leg). */
(() => {
const B = SL.bench;
const PCB = { l: '#3a3836', m: '#2b2927', d: '#191817' };
const LEDS = [['R', '#e2483d', 27], ['Y', '#f2c230', 19.5], ['G', '#43b05c', 12]];
const Z0 = 2.5, Z1 = 32;

const frame = legs => {
  const n = legs.length, o = [0, 1, 2].map(k => legs.reduce((s, q) => s + q[k], 0) / n);
  const dx = legs[n - 1][0] - legs[0][0], dy = legs[n - 1][1] - legs[0][1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
  const W = (a, b, z) => [o[0] + ux * a - uy * b, o[1] + uy * a + ux * b, o[2] + z];
  return { o, W, u: [ux, uy, 0], v: [-uy, ux, 0] };
};

// the board net wired into the same breadboard strip as leg i, if any
const netOf = (ctx, i) => {
  const h = ctx.holes && ctx.holes[i], pl = ctx.pl; if (!h || !pl) return null;
  for (const w of pl.c.wires || []) for (const [x, y] of [[w.from, w.to], [w.to, w.from]]){
    const hx = B.hole(pl.geo, x); if (!hx || hx.node !== h.node) continue;
    const pin = B.pinOf(y); if (pin) return pin.net;
  }
  return null;
};
const litOf = ctx => {
  const st = ctx.st || {}, run = !!(st.ev && st.ev.status === 'running'), pins = (st.o && st.o.pins) || {};
  return LEDS.map((_, i) => { const net = netOf(ctx, i + 1); return run && net != null && +pins[net] > .5; });
};

B.part('traffic-light', {
  name: 'Traffic light module',
  legs: ['GND', 'R', 'Y', 'G'],
  span: [3, 3],
  show: { breadboard: 'mini', holes: ['a5', 'a6', 'a7', 'a8'] },
  tag: p => p.id,
  draw(ctx){
    const legs = ctx.legs, F = frame(legs), W = F.W, lit = litOf(ctx);
    let s = '';
    s += B.slabW(W, -5.1, -1.25, 5.1, 1.25, 0, Z0, B.M.black, toneI, .6);
    for (const L of legs) s += rod(L, [L[0], L[1], L[2] + Z0 + 1], .32, B.M.tin, toneI, .3);
    s += B.slabW(W, -7, -.8, 7, .8, Z0, Z1, PCB, toneI, .8);
    const U = Dv(...F.u), V = Dv(0, 0, -1);
    if (vis(F.v)) ['GND', 'R', 'Y', 'G'].forEach((t, i) => {
      s += `<text transform="${txM(P(...W((i - 1.5) * 2.54, .82, Z0 + 1.1)), U, V)}" font-size=".9" fill="#f2f4f6" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="700">${t}</text>`;
    });
    ctx.put(B.aabb([W(-7, -1.3, 0), W(7, 1.3, Z1)]), s);
    LEDS.forEach(([, col, z], i) => {
      const glow = lit[i], m = matOf(glow ? col : mix(col, '#2b2927', .55));
      let t = rod(W(0, .8, z), W(0, 4.2, z), 2.5, m, toneI, .5, 2.5, 18);
      if (glow){ const [X, Y] = P(...W(0, 4.4, z)); t += `<circle cx="${f(X)}" cy="${f(Y)}" r="5.5" fill="${col}" opacity=".35"/>`; }
      ctx.put(B.aabb([W(-2.5, .8, z - 2.5), W(2.5, 4.4, z + 2.5)]), t);
    });
  },
});
})();
