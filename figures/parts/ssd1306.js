// @cf title OLED display 128 x 64 (SSD1306, I2C)
// @cf use engine/bench.list
/* The common 0.96 inch I2C OLED module: a 27.3 x 27.8 mm board with an SSD1306 driver under a 26.7 x 19.3 mm glass
   panel (21.7 x 10.9 mm active area, 128 x 64 pixels), held on a 4-pin header along one edge. Legs ['GND','VCC',
   'SCL','SDA'] as printed on most of these boards (some swap GND and VCC: read the silk). 3.3-5 V, about 20 mA
   with half the pixels lit; I2C address 0x3C (0x3D with the jumper moved). On a breadboard it sits flat on its
   header, the board and glass reaching forward over the rows in front of the pins.
   The page does not run the SSD1306 driver: the glass shows dark, and glows faintly while the sketch runs and
   the module has power. */
(() => {
const B = SL.bench, T = B.T;
const PCB = { l: '#2a5fa8', m: '#204c88', d: '#14325c' }, GLASS = { l: '#2a2f36', m: '#1d2127', d: '#0f1215' };
const Z0 = 2.5, ZP = 4.1, ZG = 5.5;

const frame = legs => {
  const n = legs.length, o = [0, 1, 2].map(k => legs.reduce((s, q) => s + q[k], 0) / n);
  const dx = legs[n - 1][0] - legs[0][0], dy = legs[n - 1][1] - legs[0][1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
  const W = (a, b, z) => [o[0] + ux * a - uy * b, o[1] + uy * a + ux * b, o[2] + z];
  return { o, W, u: [ux, uy, 0], v: [-uy, ux, 0] };
};

B.part('ssd1306', {
  name: 'OLED display (SSD1306)',
  legs: ['GND', 'VCC', 'SCL', 'SDA'],
  span: [3, 3],
  show: { breadboard: 'mini', holes: ['a5', 'a6', 'a7', 'a8'] },
  tag: p => T('{id} · 0x3C', { id: p.id }),
  draw(ctx){
    const legs = ctx.legs, st = ctx.st || {}, F = frame(legs), W = F.W;
    const running = !!(st.ev && st.ev.status === 'running');
    let s = '';
    s += B.slabW(W, -5.1, -1.25, 5.1, 1.25, 0, Z0, B.M.black, toneI, .6);
    for (const L of legs) s += rod(L, [L[0], L[1], L[2] + ZP + .8], .32, B.M.tin, toneI, .3);
    // the board reaches forward (-b) from the header row, the glass on top of it
    s += B.slabW(W, -13.65, -26.4, 13.65, 1.4, Z0, ZP, PCB, toneI, .7);
    s += B.slabW(W, -13.35, -24.6, 13.35, -5.3, ZP, ZG, GLASS, toneI, .5);
    const area = [[-10.85, -9.4], [10.85, -9.4], [10.85, -20.3], [-10.85, -20.3]].map(([a, b]) => W(a, b, ZG + .02));
    s += fill(pd(area), running ? '#0f2d4a' : '#08090b');
    if (running) s += `<path d="${pd(area)}" fill="none" stroke="#5fb4ff" stroke-width=".5" opacity=".6"/>`;
    // silk over the pins, readable from the front
    const U = Dv(...F.u), V = Dv(-F.v[0], -F.v[1], 0);
    ['GND', 'VCC', 'SCL', 'SDA'].forEach((t, i) => {
      s += `<text transform="${txM(P(...W((i - 1.5) * 2.54, -1.6, ZP + .02)), U, V)}" font-size=".85" fill="#f2f4f6" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="700">${t}</text>`;
    });
    ctx.put(B.aabb([W(-13.65, -26.4, 0), W(13.65, 1.4, ZG)]), s);
  },
});
})();
