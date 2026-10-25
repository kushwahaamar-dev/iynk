// @cf title 2S LiPo battery
// @cf use engine/bench.list
/* A 2S (two cells in series) lithium-polymer pack lying on the mat: 70 x 35 x 18 mm in blue shrink wrap with a
   label band, 1000 mAh. 8.4 V full, 7.4 V nominal, 6.0 V empty (3.0 V a cell is the floor; below that the cells are
   damaged). The thick red (+) and black (-) main leads come out of one end, with a small white JST-XH balance plug on
   three thin wires beside them. Legs [+, -]: the main lead ends.
   The bench that uses it says what it does through m = { state, v, i_mA } (its model readings by part id): state 'ok',
   'reverse' (plugged in backwards: no protection on the driver boards, the pack dumps current into their diodes) or
   'low' (below 6.4 V under load: the logic regulator drops out). */
(() => {
const B = SL.bench, T = B.T;
const LEN = 70, Wd = 35, H = 18;
const WRAP = { l: '#4f86d6', m: '#3d6cb2', d: '#25446f' }, LABEL = { l: '#f4f1e6', m: '#ded8c6', d: '#a8a08b' };
const DEMO = { full: { state: 'ok', v: 8.4, i_mA: 0 }, nominal: { state: 'ok', v: 7.4, i_mA: 300 }, low: { state: 'low', v: 6.2, i_mA: 300 } };
const sense = ctx => {
  const m = ctx.m || {}, st = ctx.st || {}, p = ctx.p;
  if (m.state) return m;
  const r = (st.readings || {})[p.id];
  if (r && r.state) return r;
  return DEMO[p.demo] || DEMO.nominal;
};

B.part('lipo-2s', {
  name: '2S LiPo battery (7.4 V)', fig: 'P22', legs: ['+', '-'], span: [1, 30],
  params: { demo: Object.keys(DEMO) },
  paramNames: { demo: 'Show' },
  example: { demo: 'nominal' },
  foot: [LEN, Wd, H],
  matSize: [LEN, Wd],
  show: { breadboard: 'mini', parts: [{ id: 'BATT', part: 'lipo-2s', at: [8, -30], rot: 0, holes: ['a4', 'a8'] }], wires: [] },
  tag: (p, m) => {
    const id = p.id; if (!m || !m.state) return id;
    if (m.state === 'reverse') return T('{id} · leads swapped', { id });
    return T('{id} · {v} V', { id, v: (+m.v || 0).toFixed(1) });
  },
  draw(ctx){
    const p = ctx.p, legs = ctx.legs || [], m = sense(ctx), k = ctx.k || 0;
    const o = ctx.origin || legs[0] || [0, 0, 0], r = (+p.rot || 0) * Math.PI / 180, ax = [Math.cos(r), Math.sin(r), 0], ay = [-ax[1], ax[0], 0];
    const W = (x, y, z) => [o[0] + ax[0] * x + ay[0] * y, o[1] + ax[1] * x + ay[1] * y, o[2] + z];
    const items = [], put = (box, svg) => items.push({ box, svg });
    const hx = LEN / 2, hy = Wd / 2;
    put(B.aabb([W(-hx, -hy, 0), W(hx, hy, .05)]), castShadow([W(-hx, -hy, 0), W(hx, -hy, 0), W(hx, hy, 0), W(-hx, hy, 0), W(-hx, -hy, H), W(hx, hy, H)], o[2]));
    let s = B.slabW(W, -hx, -hy, hx, hy, 0, H, WRAP, toneI, 1.4);
    s += B.slabW(W, -hx + 14, -hy - .05, hx - 18, hy + .05, .8, H + .05, LABEL, toneI, .6);
    if (k < .5){
      s += B.flatText(W(-2, 3, H + .1), -ax[1], -ax[0], '7.4V LIPO', 4.2, '#2b2825');
      s += B.flatText(W(-2, -4.5, H + .1), -ax[1], -ax[0], '2S 1000mAh', 3, '#2b2825', 700);
    }
    if (m.state === 'low') s += B.flatText(W(-2, -10.5, H + .1), -ax[1], -ax[0], 'LOW', 3, '#e2483d');
    put(B.aabb([W(-hx, -hy, 0), W(hx, hy, H)]), s);
    if (m.state === 'reverse'){ const [X, Y] = P(...W(hx - 6, 0, H + 6));
      put(B.aabb([W(hx - 8, -2, H), W(hx - 4, 2, H + 8)]), `<path d="M${f(X - 3)} ${f(Y)}q2 -3 0 -6q-2 -3 0 -6M${f(X + 2)} ${f(Y - 1)}q2 -3 0 -6q-2 -3 0 -6" fill="none" stroke="#e2483d" stroke-width=".9" opacity=".75"/>`); }
    // the balance lead: three thin wires to a white JST-XH plug lying beside the main leads
    const plug = [hx + 9, -hy + 4];
    put(B.aabb([W(plug[0] - 2.5, plug[1] - 4, 0), W(plug[0] + 2.5, plug[1] + 4, 4.5)]), B.slabW(W, plug[0] - 2.5, plug[1] - 4, plug[0] + 2.5, plug[1] + 4, 0, 4.5, B.M.white, toneI, .6));
    ['#e2483d', '#ece6d6', '#3a3632'].forEach((c, i) => {
      const y = -hy + 2.5 + i * 1.5, a = W(hx, y, H * .5), b = W(plug[0] - 2.5, plug[1] - 1.5 + i * 1.5, 2.2);
      put(B.aabb([a, b]).map((v, h) => v.map(q => q + (h ? .4 : -.4))), rod(a, b, .3, matOf(c), toneI, .35));
    });
    // main leads (thicker silicone wire), arching over to their holes
    [[hx, 7], [hx, 2.5]].forEach(([x, y], i) => {
      const a = W(x, y, H * .5), end = legs[i] || W(x + 16, y * 2.5, 0), col = i === 0 ? matOf('#e2483d') : matOf('#3a3632');
      const top = Math.max(a[2], end[2]) + 6, pts = [];
      for (let j = 0; j <= 14; j++){ const t = j / 14, sn = Math.sin(t * Math.PI);
        pts.push([a[0] + (end[0] - a[0]) * t, a[1] + (end[1] - a[1]) * t, (a[2] * (1 - t) + (end[2] + 3) * t) + (top - Math.max(a[2], end[2])) * sn * .5]); }
      for (let j = 0; j < pts.length - 1; j++){ const q0 = pts[j], q1 = pts[j + 1];
        put(B.aabb([q0, q1]).map((v, h) => v.map(c => c + (h ? .6 : -.6))), rod(q0, q1, .8, col, toneI, .55)); }
      if (legs[i]) put(B.aabb([end, [end[0], end[1], end[2] + 3]]).map((v, h) => v.map(c => c + (h ? .4 : -.4))), rod(end, [end[0], end[1], end[2] + 3], .35, B.M.tin, toneI, .4));
    });
    for (const it of items) ctx.put(it.box, it.svg);
  },
});
})();
