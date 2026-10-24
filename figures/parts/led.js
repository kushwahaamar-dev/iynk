// @cf title LED
// @cf use engine/bench.list
/* 5 mm through-hole LED on a breadboard. Legs [anode, cathode]: the anode is the longer, bent leg; the cathode side
   of the rim is flat. Forward voltage by colour (red 2.0, yellow 2.1, green 2.2, blue 3.0, white 3.1 V), 20 mA
   continuous. Brightness follows (I / 13.6 mA)^0.55, the curve the Learn Arduino lesson uses. */
(() => {
const B = SL.bench, T = B.T;
const COL = { red: '#e8392e', yellow: '#f2c23a', green: '#3fbf6a', blue: '#3d7be0', white: '#f2efe6' };
const VF = { red: 2.0, yellow: 2.1, green: 2.2, blue: 3.0, white: 3.1 };
B.LED_COLORS = COL;
B.part('led', {
  name: 'LED', fig: 'P2', legs: ['A', 'K'], span: [1, 3],
  params: { color: Object.keys(COL) },
  elec: p => ({ type: 'led', vf: VF[p.color] || 2.0, imax: .02 }),
  tag: (p, m) => m && m.state === 'ok' && m.i_mA > 0 ? T('{id} · {n} mA', { id: p.id, n: m.i_mA.toFixed(1) }) : m && m.state === 'burnt' ? T('{id} · burnt', { id: p.id }) : m && m.state === 'reverse' ? T('{id} · backwards', { id: p.id }) : p.id,
  draw(ctx){
    const { legs, p, lit } = ctx, col = COL[p.color] || COL.red, burnt = ctx.m && ctx.m.state === 'burnt';
    const [A, K] = legs, mid = A.map((v, i) => (v + K[i]) / 2), zl = 7;
    const top = [mid[0], mid[1], mid[2] + zl];
    // legs: the anode has a small knee, so it reads as the longer leg
    let s = rod(A, [A[0], A[1], A[2] + zl * .55], .25, B.M.tin, toneI, .5) + rod([A[0], A[1], A[2] + zl * .55], [A[0] * .7 + mid[0] * .3, A[1] * .7 + mid[1] * .3, top[2]], .25, B.M.tin, toneI, .5)
      + rod(K, [K[0] * .7 + mid[0] * .3, K[1] * .7 + mid[1] * .3, top[2]], .25, B.M.tin, toneI, .5);
    const body = matOf(burnt ? '#5a4330' : mix(col, '#ffffff', lit > .05 ? .25 + .3 * lit : 0));
    s += cyl(top[0], top[1], top[2], top[2] + .9, 2.9, body, toneI, .8) + cyl(top[0], top[1], top[2] + .9, top[2] + 5, 2.5, body, toneI, .9)
      + rod([top[0], top[1], top[2] + 5], [top[0], top[1], top[2] + 7.4], 2.5, body, toneI, .9, .9);
    if (lit > .05 && !burnt){ const [X, Y] = P(top[0], top[1], top[2] + 5.5);
      s += `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(5 + 9 * lit)}" fill="${col}" opacity="${f(.25 * lit)}"/><circle cx="${f(X)}" cy="${f(Y)}" r="${f(2 + 2 * lit)}" fill="#fffbe8" opacity="${f(.8 * lit)}"/>`; }
    if (burnt){ const [X, Y] = P(top[0], top[1], top[2] + 8); s += `<circle cx="${f(X)}" cy="${f(Y - 4)}" r="3" fill="#8a847a" opacity=".45"/>`; }
    const lo = [Math.min(A[0], K[0]) - 3, Math.min(A[1], K[1]) - 3, A[2]], hi = [Math.max(A[0], K[0]) + 3, Math.max(A[1], K[1]) + 3, top[2] + 7.4];
    ctx.put([lo, hi], s);
  },
});
})();
