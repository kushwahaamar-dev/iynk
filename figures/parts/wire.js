// @cf title Jumper wire
// @cf use engine/bench.list
/* Male-to-male jumper wire: a 22 AWG lead in an arc from a board pin (it plugs into the female header from above)
   to a breadboard hole, with a black housing at each end. Cut into short boxed pieces so it sorts at every angle. */
(() => {
const B = SL.bench, T = B.T;
B.part('wire', {
  name: 'Jumper wire', fig: 'P4', legs: ['1', '2'],
  elec: () => ({ type: 'wire' }),
  draw(ctx){
    const { a, b } = ctx, col = B.WIRE[ctx.color] || ctx.color || B.WIRE.green, m = matOf(/^#[0-9a-f]{6}$/i.test(col) ? col : '#43b05c');
    const lift = 7 + Math.hypot(b[0] - a[0], b[1] - a[1]) * .18, top = Math.max(a[2], b[2]) + lift;
    const pts = [];
    for (let i = 0; i <= 14; i++){ const t = i / 14, s = Math.sin(t * Math.PI);
      pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, (a[2] + 4.5) * (1 - t) + (b[2] + 4.5) * t + (top - Math.max(a[2], b[2]) - 4.5) * s]); }
    const r = .55;
    for (let i = 0; i < pts.length - 1; i++){ const p = pts[i], q = pts[i + 1];
      ctx.put([[Math.min(p[0], q[0]) - r, Math.min(p[1], q[1]) - r, Math.min(p[2], q[2]) - r], [Math.max(p[0], q[0]) + r, Math.max(p[1], q[1]) + r, Math.max(p[2], q[2]) + r]], rod(p, q, r, m, toneI, .6)); }
    for (const e of [a, b]){ const h = [e[0], e[1], e[2] + 4.5];
      ctx.put([[e[0] - 1.3, e[1] - 1.3, e[2]], [e[0] + 1.3, e[1] + 1.3, e[2] + 4.6]], rod([e[0], e[1], e[2] + .2], [e[0], e[1], e[2] + 1.2], .3, B.M.tin, toneI, .4) + box(e[0] - 1.25, e[1] - 1.25, e[2] + 1.2, e[0] + 1.25, e[1] + 1.25, h[2], B.M.black, toneI, .6)); }
  },
});
})();
