// @cf title Accelerometer and gyroscope (MPU-6050 on a GY-521)
// @cf use engine/bench.list
/* GY-521 breakout (docs/facts/mpu6050.md): a blue 15.6 x 20.3 mm board with the MPU-6050 (4 x 4 mm QFN), a 662K
   (XC6206) 3.3 V regulator, 4.7 kOhm I2C pull-ups to 3.3 V, a 4.7 kOhm pull-down on AD0 (address 0x68), a power LED
   with 1 kOhm, a 10 uF tantalum and an 8-pin 2.54 mm header. Positions are the fact sheet's, measured from a photo of a
   real board (+-0.3 mm) in its own frame: header along the left edge at x = 1.4, VCC at the top (y = 19.03) down to
   INT (y = 1.25). Legs ['VCC','GND','SCL','SDA','XDA','XCL','AD0','INT'], header order. On a breadboard the straight
   header is soldered pointing down with its plastic spacer under the board, component side up, so with VCC in the
   lower-numbered column the board lies over the rows on the trench side of the pins (rows f-h for pins in row i,
   rows b-d for pins in row a), and jumper wires go into the free holes on the other side of the same strips.
   The power LED lights when the VCC strip is wired to a live rail and the GND strip to GND, through the 662K (so it
   lights from 3.3 V or 5 V). The readings themselves come from the interpreter's mpu6050 device on the I2C bus.
   See-through: the QFN holds two dies, the CMOS signal chip and the MEMS die bonded face down on it (the proof masses
   and comb fingers), with gold bond wires to the lead frame. */
(() => {
const B = SL.bench, T = B.T;
const PCB = { l: '#2f7ee0', m: '#1d63c6', d: '#123f86' }, TAN = { l: '#d8bf93', m: '#bba070', d: '#83703f' };
const RES = { l: '#3c3935', m: '#2c2a27', d: '#1c1b19' }, TANT = { l: '#f3cf4a', m: '#d9ad22', d: '#8c6d0c' };
const CMOS = { l: '#8c95b8', m: '#6b7397', d: '#3f4565' }, MEMS = { l: '#c9d3e6', m: '#a3afc8', d: '#6c7896' };
const W0 = 15.6, H0 = 20.3, HX = 1.4, Y1 = 19.03;
const ZS = 2.5, ZB = ZS, ZT = ZS + 1.6, PIN_TOP = ZT + 1.5;
const LABELS = ['VCC', 'GND', 'SCL', 'SDA', 'XDA', 'XCL', 'AD0', 'INT'];
const pinY = i => Y1 - i * 2.54;

// the board's own frame (x right, y up, z up from the breadboard top) on the breadboard: VCC on the first hole
const frame = ctx => {
  const h = ctx.holes, pl = ctx.pl, x0 = h[0].x, y0 = h[0].y;
  const dx = h[h.length - 1].x - x0, dy = h[h.length - 1].y - y0, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
  const W = (x, y, z) => { const a = Y1 - y, b = x - HX; return pl.at(x0 + ux * a - uy * b, y0 + uy * a + ux * b, pl.zTop + z); };
  const dir = (x, y, dx2, dy2) => sub(W(x + dx2, y + dy2, 0), W(x, y, 0));
  const slab = (xa, ya, xb, yb, za, zb, m, w = .5) => B.slabW(W, xa, ya, xb, yb, za, zb, m, toneI, w);
  const text = (x, y, z, str, size, col = '#f2f4f6', rot = 0, anchor = 'middle') => {
    const r = rot * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    return `<text transform="${txM(P(...W(x, y, z)), Dv(...dir(x, y, c, s)), Dv(...dir(x, y, s, -c)))}" font-size="${f(size)}" fill="${col}" text-anchor="${anchor}" font-family="ui-monospace,Menlo,monospace" font-weight="800">${CF_ESC(str)}</text>`;
  };
  const disc = (x, y, z, r, col, w = 0) => { const d = pd(B.circ(x, y, r, 16).map(([u, v]) => W(u, v, z))); return fill(d, col) + (w ? ink(d, w) : ''); };
  return { W, slab, text, disc };
};

// volts on the VCC leg's strip, when its GND leg's strip reaches GND: union the circuit's wires like the solver does
const supply = ctx => {
  const pl = ctx.pl, c = pl && pl.c, st = ctx.st || {}, h = ctx.holes;
  if (!c || !st.ev || !h || h.length < 2) return 0;
  const par = {}, find = a => { while (par[a] !== a) a = par[a] = par[par[a]]; return a; };
  const add = a => { if (!(a in par)) par[a] = a; return a; };
  const node = ref => { const q = B.hole(pl.geo, ref) || B.legHole(c, pl.geo, ref); if (q && q.node) return q.node; const pin = B.pinOf(ref); return pin ? 'N:' + pin.net : null; };
  for (const w of c.wires || []){ const a = node(w.from), b = node(w.to); if (a && b) par[find(add(a))] = find(add(b)); }
  const nets = n => (n in par) ? Object.keys(par).filter(k => k.startsWith('N:') && find(k) === find(n)).map(k => k.slice(2)) : [];
  if (!nets(h[1].node).includes('GND')) return 0;
  return Math.max(0, ...nets(h[0].node).map(n => (st.ev.rails || {})[n] || 0));
};

B.part('mpu6050', {
  name: 'Accelerometer and gyroscope (MPU-6050)',
  legs: LABELS,
  span: [7, 7],
  pinZ: PIN_TOP,
  params: { ad0: ['low', 'high'] },
  paramNames: { ad0: 'AD0 pin' },
  example: { ad0: 'low' },
  tag: p => T('{id} · I2C {addr}', { id: p.id, addr: p.ad0 === 'high' ? '0x69' : '0x68' }),
  draw(ctx){
    const F = frame(ctx), W = F.W, st = ctx.st || {}, legs = ctx.legs;
    const k = ctx.k != null ? ctx.k : ease(Math.min(1, Math.max(0, st.xr || 0)));
    const v = supply(ctx), lit = v >= 2.6 ? Math.min(1, (v - 2.2) / 1.1) : 0;
    let s = '';
    // the header: pins from the holes up through the plastic spacer and the board, the spacer under the board edge
    for (const L of legs) s += rod(L, [L[0], L[1], L[2] + ZB], .32, B.M.tin, toneI, .3);
    s += F.slab(HX - 1.27, pinY(7) - 1.27, HX + 1.27, pinY(0) + 1.27, 0, ZS, B.M.black, .6);
    // the board, its mounting holes and the pads round the header pins
    s += F.slab(0, 0, W0, H0, ZB, ZT, PCB, .8);
    for (const [x, y] of [[12.9, 17.9], [12.9, 2.7]]) s += F.disc(x, y, ZT + .01, 2, B.M.tin.l, .3) + F.disc(x, y, ZT + .02, 1.5, '#1d1b19');
    for (let i = 0; i < 8; i++) s += F.disc(HX, pinY(i), ZT + .01, .85, B.M.tin.l, .3);
    // silkscreen: the pin names beside the pads, ITG/MPU along the right edge, the X and Y axis arrows
    LABELS.forEach((t, i) => { s += F.text(2.45, pinY(i) - .42, ZT + .01, t, 1.1, '#f2f4f6', 0, 'start'); });
    s += F.text(14.7, 10.3, ZT + .01, 'ITG/MPU', 1.15, '#f2f4f6', 90);
    const arrow = (x0, y0, x1, y1) => `<path d="${pd([W(x0, y0, ZT + .01), W(x1, y1, ZT + .01)], false)}" stroke="#f2f4f6" stroke-width=".22" fill="none"/>`;
    s += arrow(10.2, 1.6, 10.2, 4.6) + arrow(9.9, 4.1, 10.2, 4.6) + arrow(10.5, 4.1, 10.2, 4.6) + F.text(11, 3.2, ZT + .01, 'Y', .9);
    s += arrow(5.9, 1.7, 8.9, 1.7) + arrow(8.4, 2, 8.9, 1.7) + arrow(8.4, 1.4, 8.9, 1.7) + F.text(9.6, 1.3, ZT + .01, 'X', .9);
    // passives: 0603 capacitors (tan) and resistors (black, three-digit codes)
    const chip = (x, y, vert, m, h, code) => {
      const [hl, hw] = vert ? [.4, .8] : [.8, .4], e = .3;
      let c = vert ? F.slab(x - hl, y - hw + e, x + hl, y + hw - e, ZT, ZT + h, m, .35) + F.slab(x - hl, y - hw, x + hl, y - hw + e, ZT, ZT + h, B.M.tin, .3) + F.slab(x - hl, y + hw - e, x + hl, y + hw, ZT, ZT + h, B.M.tin, .3)
        : F.slab(x - hl + e, y - hw, x + hl - e, y + hw, ZT, ZT + h, m, .35) + F.slab(x - hl, y - hw, x - hl + e, y + hw, ZT, ZT + h, B.M.tin, .3) + F.slab(x + hl - e, y - hw, x + hl, y + hw, ZT, ZT + h, B.M.tin, .3);
      if (code) c += F.text(x, y - .14, ZT + h + .01, code, .42, '#e9e4d6');
      return c;
    };
    for (const [x, y, vert] of [[10.3, 18.5, true], [6.7, 16.7], [10.1, 15.4], [10.1, 14.0], [6.7, 6.6], [10.1, 6.6]]) s += chip(x, y, vert, TAN, .8);
    for (const [x, y, code] of [[6.7, 15.4, '472'], [6.7, 14.0, '472'], [6.7, 5.1, '472'], [10.1, 5.1, '102']]) s += chip(x, y, false, RES, .45, code);
    // 662K regulator (SOT-23, long axis up the board) and the 10 uF tantalum with its + stripe at the top
    s += F.slab(6.95, 17.5, 8.25, 20.2, ZT, ZT + 1.1, RES, .4) + F.text(7.6, 18.75, ZT + 1.11, '662K', .5, '#d9d4c6', 90);
    for (const y of [17.8, 18.9, 20.0]) s += F.slab(6.55, y - .2, 6.95, y + .2, ZT, ZT + .3, B.M.tin, .25);
    s += F.slab(8.25, 18.7, 8.65, 19.1, ZT, ZT + .3, B.M.tin, .25);
    s += F.slab(11.9, 8.7, 13.5, 11.9, ZT, ZT + 1.6, TANT, .45) + F.slab(11.9, 11.2, 13.5, 11.9, ZT + .01, ZT + 1.61, matOf('#8a5a34'), .3);
    // the power LED: a clear 0603 lens, red when the board has power
    s += chip(6.7, 3.6, false, matOf(lit ? mix('#ff5a4a', '#ffffff', .25) : '#e8e2d2'), .6);
    // the MPU-6050 itself: a 4 x 4 x 0.9 mm QFN, pin 1 dot top left, ghosted in see-through
    let ic = F.slab(6.5, 8.7, 10.5, 12.7, ZT, ZT + .9, B.M.black, .5) + F.disc(6.95, 12.25, ZT + .91, .2, '#55514c');
    for (let i = 0; i < 6; i++){ const t = 9.45 + i * .5;
      ic += F.slab(6.35, t - .12, 6.5, t + .12, ZT, ZT + .2, B.M.tin, .2) + F.slab(10.5, t - .12, 10.65, t + .12, ZT, ZT + .2, B.M.tin, .2)
        + F.slab(t - .7, 8.55, t - .7 + .24, 8.7, ZT, ZT + .2, B.M.tin, .2) + F.slab(t - .7, 12.7, t - .7 + .24, 12.85, ZT, ZT + .2, B.M.tin, .2); }
    ic += F.text(8.5, 10.95, ZT + .91, 'MPU-6050', .5, '#bdb7ab') + F.text(8.5, 10.2, ZT + .91, 'INVENSENSE', .36, '#9d978b');
    s += k > .02 ? `<g opacity="${f(1 - .7 * k)}">${ic}</g>` : ic;
    if (k > .02){
      // two dies: the CMOS chip on the lead frame and the MEMS die on top of it, gold wires out to the pads
      let x = F.slab(7.1, 9.3, 9.9, 12.1, ZT + .25, ZT + .45, CMOS, .35) + F.slab(7.5, 9.7, 9.5, 11.7, ZT + .45, ZT + .62, MEMS, .3);
      for (let i = 0; i < 4; i++) x += `<path d="${pd([W(7.8 + i * .45, 9.85, ZT + .63), W(7.8 + i * .45, 11.55, ZT + .63)], false)}" stroke="#56607e" stroke-width=".18" fill="none"/>`;
      for (let i = 0; i < 6; i++){ const t = 9.45 + i * .5;
        x += `<path d="${pd([W(7.15, t, ZT + .45), W(6.8, t, ZT + .65), W(6.45, t, ZT + .2)], false)}" stroke="#e8c36a" stroke-width=".2" fill="none"/>`
          + `<path d="${pd([W(9.85, t, ZT + .45), W(10.2, t, ZT + .65), W(10.55, t, ZT + .2)], false)}" stroke="#e8c36a" stroke-width=".2" fill="none"/>`; }
      s += `<g opacity="${f(k)}">${x}</g>`;
    }
    // the pin tips above the board in their solder cones, drawn last so they sit on top
    for (let i = 0; i < 8; i++) s += rod(W(HX, pinY(i), ZT), W(HX, pinY(i), ZT + .45), .62, B.M.tin, toneI, .3, .36, 12) + rod(W(HX, pinY(i), ZT + .45), W(HX, pinY(i), PIN_TOP), .32, B.M.tin, toneI, .3);
    if (lit){
      // the glow is sized in millimetres on the board, so it stays the LED's size at any zoom
      const [X, Y] = P(...W(6.7, 3.6, ZT + .6)), [Xe, Ye] = P(...W(8.2, 3.6, ZT + .6)), mm = Math.hypot(Xe - X, Ye - Y) / 1.5;
      s += `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(mm * (1 + 1.2 * lit))}" fill="#ff5a4a" opacity="${f(.35 * lit)}"/><circle cx="${f(X)}" cy="${f(Y)}" r="${f(mm * .55)}" fill="#fff1e6" opacity="${f(.7 * lit)}"/>`;
    }
    if ((ctx.solo || (B.md && B.md.def && B.md.def.partPage)) && k > .5){
      // each pill goes out on the side its anchor is on, as seen now, so the pills never cross as the part turns
      const Xc = P(...W(W0 / 2, H0 / 2, ZT))[0], pill = (pt, dx, dy, text, on) => { const X = P(...pt)[0]; return tag(pt, (X < Xc ? -1 : 1) * dx, dy, text, on); };
      s += pill(W(8.5, 10.7, ZT + .6), 30, -58, T('MEMS die on the CMOS chip')) + pill(W(7.6, 18.9, ZT + 1.1), 64, -6, T('3.3 V regulator (662K)'))
        + pill(W(6.7, 3.6, ZT + .6), 60, 34, T('Power LED'), lit > 0);
    }
    ctx.put(B.aabb([W(0, 0, 0), W(W0, H0, 0), W(0, H0, PIN_TOP), W(W0, 0, PIN_TOP)]), s);
  },
  show: { breadboard: 'mini', holes: ['f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10'] },
});
})();
