// @cf title 4 x AA battery holder
// @cf use engine/bench.list
/* An open black 4 x AA holder (cells side by side, in series), lying on the mat: 62 x 58 x 16 mm moulded tray with
   steel springs and contacts at the ends, a red (+) and a black (-) lead out of one end. Fresh alkaline cells give
   about 1.6 V each (6.4 V for the pack), 1.5 V nominal (6 V), and each has 0.15-0.3 Ω inside, so the pack sags under
   a motor's start current (Energizer E91 data). Legs [+, -]: the lead ends, in two breadboard holes.
   The bench that uses it says what it does through m = { state, v, i_mA } (its model readings by part id): state 'ok',
   'reverse' (the leads are on the rails the wrong way round) or 'li-ion' (four 14500 Li-ion cells, the size of an AA
   but 3.7-4.2 V each: 16.8 V). */
(() => {
const B = SL.bench, T = B.T;
const LEN = 58, Wd = 62, H = 16, CELL_R = 7.25, CELL_L = 50.5;
const PLASTIC = B.M.blackPl, STEEL = B.M.steel;
const WRAP = { alkaline: { l: '#4f8f6a', m: '#3c7254', d: '#24483a' }, 'li-ion': { l: '#5b6fd6', m: '#4556ad', d: '#2b366d' } };
const DEMO = { fresh: { state: 'ok', v: 6.4, i_mA: 0 }, running: { state: 'ok', v: 6.1, i_mA: 160 }, 'li-ion': { state: 'li-ion', v: 16.8, i_mA: 0 } };
const sense = ctx => {
  const m = ctx.m || {}, st = ctx.st || {}, p = ctx.p;
  if (m.state) return m;
  const r = (st.readings || {})[p.id];
  if (r && r.state) return r;
  return DEMO[p.demo] || DEMO.fresh;
};

B.part('aa-holder-4', {
  name: '4 x AA battery holder', fig: 'P21', legs: ['+', '-'], span: [1, 30],
  params: { demo: Object.keys(DEMO) },
  paramNames: { demo: 'Show' },
  example: { demo: 'fresh' },
  foot: [LEN, Wd, H],
  matSize: [LEN, Wd],
  show: { breadboard: 'mini', parts: [{ id: 'BT1', part: 'aa-holder-4', at: [12, -42], rot: 0, holes: ['a4', 'a8'] }], wires: [] },
  tag: (p, m) => {
    const id = p.id; if (!m || !m.state) return id;
    if (m.state === 'reverse') return T('{id} · leads swapped', { id });
    return T('{id} · {v} V', { id, v: (+m.v || 0).toFixed(1) });
  },
  draw(ctx){
    const p = ctx.p, legs = ctx.legs || [], m = sense(ctx);
    const o = ctx.origin || legs[0] || [0, 0, 0], r = (+p.rot || 0) * Math.PI / 180, ax = [Math.cos(r), Math.sin(r), 0], ay = [-ax[1], ax[0], 0];
    const W = (x, y, z) => [o[0] + ax[0] * x + ay[0] * y, o[1] + ax[1] * x + ay[1] * y, o[2] + z];
    const items = [], put = (box, svg) => items.push({ box, svg });
    const hx = LEN / 2, hy = Wd / 2, wrap = WRAP[m.state === 'li-ion' ? 'li-ion' : 'alkaline'];
    put(B.aabb([W(-hx, -hy, 0), W(hx, hy, .05)]), castShadow([W(-hx, -hy, 0), W(hx, -hy, 0), W(hx, hy, 0), W(-hx, hy, 0), W(-hx, -hy, H * .7), W(hx, hy, H * .7)], o[2]));
    // the tray: floor, the two end walls that hold the contacts, low side walls and the ribs between the cells
    put(B.aabb([W(-hx, -hy, 0), W(hx, hy, 2)]), B.slabW(W, -hx, -hy, hx, hy, 0, 2, PLASTIC, toneI, 1.2));
    for (const sx of [-1, 1]) put(B.aabb([W(sx * hx - 3, -hy, 0), W(sx * hx + 3, hy, H)]), B.slabW(W, sx > 0 ? hx - 3 : -hx, -hy, sx > 0 ? hx : -hx + 3, hy, 2, H, PLASTIC, toneI, 1));
    for (const sy of [-1, 1]) put(B.aabb([W(-hx + 3, sy * hy - 1.5, 2), W(hx - 3, sy * hy + 1.5, 9)]), B.slabW(W, -hx + 3, sy > 0 ? hy - 1.5 : -hy, hx - 3, sy > 0 ? hy : -hy + 1.5, 2, 9, PLASTIC, toneI, .9));
    // four cells, alternating so they chain in series: + at the far end of cells 1 and 3, at the near end of 2 and 4
    for (let i = 0; i < 4; i++){
      const y = -hy + 1.5 + (Wd - 3) * (i + .5) / 4, zc = 2 + CELL_R, flip = i % 2 ? -1 : 1, a = -CELL_L / 2, b = CELL_L / 2;
      let s = rod(W(a, y, zc), W(b, y, zc), CELL_R, wrap, toneI, 1, CELL_R, 20);
      s += rod(W(flip * b, y, zc), W(flip * (b + 1.4), y, zc), 2.6, STEEL, toneI, .5);
      s += rod(W(-flip * b, y, zc), W(-flip * (b + .4), y, zc), CELL_R * .82, STEEL, toneI, .5);
      if (ctx.k < .5) s += B.flatText(W(0, y, zc + CELL_R + .05), -ax[1], -ax[0], m.state === 'li-ion' ? '14500 3.7V' : 'AA 1.5V', 2.6, '#f2efe7');
      put(B.aabb([W(-hx + 3, y - CELL_R, 2), W(hx - 3, y + CELL_R, 2 + 2 * CELL_R)]), s);
    }
    if (m.state === 'li-ion' || m.state === 'reverse'){ const [X, Y] = P(...W(0, 0, H + 6));
      put(B.aabb([W(-2, -2, H), W(2, 2, H + 8)]), `<path d="M${f(X - 3)} ${f(Y)}q2 -3 0 -6q-2 -3 0 -6M${f(X + 2)} ${f(Y - 1)}q2 -3 0 -6q-2 -3 0 -6" fill="none" stroke="#e2483d" stroke-width=".9" opacity=".75"/>`); }
    // leads out of the + end wall, arching over to their holes
    [[hx, 6], [hx, -6]].forEach(([x, y], i) => {
      const a = W(x, y, H - 3), end = legs[i] || W(x + 14, y * 2, 0), col = i === 0 ? matOf('#e2483d') : matOf('#3a3632');
      const top = Math.max(a[2], end[2]) + 6, pts = [];
      for (let j = 0; j <= 14; j++){ const t = j / 14, sn = Math.sin(t * Math.PI);
        pts.push([a[0] + (end[0] - a[0]) * t, a[1] + (end[1] - a[1]) * t, (a[2] * (1 - t) + (end[2] + 3) * t) + (top - Math.max(a[2], end[2])) * sn * .5]); }
      for (let j = 0; j < pts.length - 1; j++){ const q0 = pts[j], q1 = pts[j + 1];
        put(B.aabb([q0, q1]).map((v, h) => v.map(c => c + (h ? .5 : -.5))), rod(q0, q1, .55, col, toneI, .5)); }
      if (legs[i]) put(B.aabb([end, [end[0], end[1], end[2] + 3]]).map((v, h) => v.map(c => c + (h ? .4 : -.4))), rod(end, [end[0], end[1], end[2] + 3], .35, B.M.tin, toneI, .4));
    });
    for (const it of items) ctx.put(it.box, it.svg);
  },
});
})();
