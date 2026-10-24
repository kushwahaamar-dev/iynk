// @cf title Resistor
// @cf use engine/bench.list
/* Axial through-hole resistor, 1/4 W, 6.3 mm body, four colour bands worked out from the value (two digits, the
   multiplier, gold for 5 %). Legs bend down into two holes, usually four columns apart. */
(() => {
const B = SL.bench, T = B.T;
const BAND = ['#2a2623', '#8a5a34', '#e2483d', '#f08a2b', '#f2c230', '#43b05c', '#3e86d9', '#8c4bd1', '#9a958c', '#f6f3ea'];
const GOLD = '#d4a93c', SILVER = '#c9cfd1';
B.resBands = ohms => {
  const v = Math.max(.1, +ohms || 0), e = Math.floor(Math.log10(v) + 1e-9) - 1, sig = Math.round(v / Math.pow(10, e));
  const d1 = Math.floor(sig / 10) % 10, d2 = sig % 10, mult = e === -1 ? GOLD : e === -2 ? SILVER : BAND[Math.max(0, Math.min(9, e))];
  return [BAND[d1], BAND[d2], mult, GOLD];
};
B.ohmsText = ohms => ohms >= 1e6 ? (+(ohms / 1e6).toFixed(2)) + ' MΩ' : ohms >= 1e3 ? (+(ohms / 1e3).toFixed(2)) + ' kΩ' : (+(+ohms).toFixed(1)) + ' Ω';
B.part('resistor', {
  name: 'Resistor', fig: 'P3', legs: ['1', '2'], span: [3, 8],
  params: { ohms: [1, 1e7] },
  elec: p => ({ type: 'res', ohms: Math.max(0, +p.ohms || 0) }),
  tag: p => p.id + ' · ' + B.ohmsText(p.ohms),
  draw(ctx){
    const [a, b] = ctx.legs, z = 2.6, d = [b[0] - a[0], b[1] - a[1]], len = Math.hypot(...d) || 1, u = d.map(v => v / len);
    const e0 = [a[0] + u[0] * 1, a[1] + u[1] * 1, a[2] + z], e1 = [b[0] - u[0] * 1, b[1] - u[1] * 1, b[2] + z];
    const bl = Math.min(6.3, len - 2.6), c0 = [(a[0] + b[0]) / 2 - u[0] * bl / 2, (a[1] + b[1]) / 2 - u[1] * bl / 2, a[2] + z], c1 = [(a[0] + b[0]) / 2 + u[0] * bl / 2, (a[1] + b[1]) / 2 + u[1] * bl / 2, a[2] + z];
    let s = rod(a, [a[0], a[1], a[2] + z - .3], .22, B.M.tin, toneI, .45) + rod([a[0], a[1], a[2] + z - .3], c0, .22, B.M.tin, toneI, .45)
      + rod(b, [b[0], b[1], b[2] + z - .3], .22, B.M.tin, toneI, .45) + rod([b[0], b[1], b[2] + z - .3], c1, .22, B.M.tin, toneI, .45);
    s += rod(c0, c1, 1.15, { l: '#e9d3a6', m: '#d1b684', d: '#9c8256' }, toneI, .8);
    const bands = B.resBands(ctx.p.ohms), at = [.16, .32, .48, .8];
    bands.forEach((col, i) => { const t0 = at[i] - .05, t1 = at[i] + .05, p0 = c0.map((v, k) => v + (c1[k] - v) * t0), p1 = c0.map((v, k) => v + (c1[k] - v) * t1);
      s += rod(p0, p1, 1.2, matOf(col), toneI, .3); });
    const lo = [Math.min(a[0], b[0]) - 1.3, Math.min(a[1], b[1]) - 1.3, a[2]], hi = [Math.max(a[0], b[0]) + 1.3, Math.max(a[1], b[1]) + 1.3, a[2] + z + 1.3];
    ctx.put([lo, hi], s);
    void e0; void e1;
  },
});
})();
