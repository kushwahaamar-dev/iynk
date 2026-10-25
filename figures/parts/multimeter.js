// @cf title Pocket multimeter
// @cf use engine/bench.list
/* A yellow pocket digital multimeter lying face up on the mat, 54 x 30 x 9 mm (the same pocket meter the LED trainer
   draws on its own board), with a 3½-digit LCD (shows up to 1999), a rotary range dial and three jacks: COM (black),
   V/Ω/mA (red) and 10 A. Two test leads run from COM and V to probes whose steel tips touch what is measured. Legs
   [COM, V]: the two probe tips; `tipZ` lifts them (mm above the mat) so a bench can touch a trimpot or a screw
   terminal that stands above the mat.
   Readings come from the bench that uses it, through m = { state, text, unit, range } (its model readings by part id):
   state 'ok' | 'off' (dial at OFF, blank) | 'ol' (over range: the LCD shows 1 with blank digits, as real meters do),
   text the digits as the meter shows them ('0.54', '5.02'), unit 'V' | 'mV' | 'mA' | 'A', range the dial position
   ('20V' | '2V' | '200mA' | '10A' | 'off'). A meter never reads more digits than it has: the bench formats `text`. */
(() => {
const B = SL.bench, T = B.T;
const ML = 54, Wd = 30, H = 9;
const BODY = { l: '#f6d24a', m: '#dcb22a', d: '#94740f' }, FACE = '#3b3834', LCD = '#c7d2ab', LCD_INK = '#28302a';
const RED = { l: '#ef6a5b', m: '#d8453a', d: '#8e2a21' }, BLACK = { l: '#5a5550', m: '#3a3632', d: '#24221f' };
// dial positions and their angle from 12 o'clock (degrees, clockwise seen from above)
const DIAL = { off: 0, '2V': 60, '20V': 90, '200mA': 200, '10A': 235 };
const DEMO = {
  'reading 5 V': { state: 'ok', text: '5.02', unit: 'V', range: '20V' },
  'reading 0.54 V': { state: 'ok', text: '0.544', unit: 'V', range: '2V' },
  'over range': { state: 'ol', text: '', unit: 'V', range: '2V' },
  off: { state: 'off', text: '', unit: '', range: 'off' },
};
const sense = ctx => {
  const m = ctx.m || {}, st = ctx.st || {}, p = ctx.p;
  if (m.state) return m;
  const r = (st.readings || {})[p.id];
  if (r && r.state) return r;
  return DEMO[p.demo] || DEMO['reading 5 V'];
};

B.part('multimeter', {
  name: 'Pocket multimeter', fig: 'P24', legs: ['COM', 'V'], span: [2, 30],
  params: { demo: Object.keys(DEMO) },
  paramNames: { demo: 'Show' },
  example: { demo: 'reading 5 V' },
  foot: [ML, Wd + 20, 26],
  matSize: [ML, Wd],
  show: { breadboard: 'mini', parts: [{ id: 'MM1', part: 'multimeter', at: [-2, -44], rot: 0, demo: 'reading 5 V', holes: ['c6', 'c12'] }], wires: [] },
  tag: (p, m) => {
    const id = p.id; if (!m || !m.state) return id;
    if (m.state === 'off') return T('{id} · off', { id });
    if (m.state === 'ol') return T('{id} · over range', { id });
    return T('{id} · {v} {unit}', { id, v: m.text, unit: m.unit || '' });
  },
  draw(ctx){
    const p = ctx.p, legs = ctx.legs || [], m = sense(ctx), k = ctx.k || 0;
    const o = ctx.origin || legs[0] || [0, 0, 0], r = (+p.rot || 0) * Math.PI / 180, ax = [Math.cos(r), Math.sin(r), 0], ay = [-ax[1], ax[0], 0];
    const W = (x, y, z) => [o[0] + ax[0] * x + ay[0] * y, o[1] + ax[1] * x + ay[1] * y, o[2] + z];
    const items = [], put = (box, svg) => items.push({ box, svg });
    const flat = (pts, z, col, w = .5) => shape(pts.map(([a, b]) => W(a, b, z)), col, w);
    // face text reads across the meter (along its y), as on a real one held with the jacks toward you
    const text = (a, b, str, size, col, weight = 700) => B.flatText(W(a, b, H + .08), ax[0], -ax[1], str, size, col, weight);
    const hx = ML / 2, hy = Wd / 2;

    put(B.aabb([W(-hx, -hy, 0), W(hx, hy, .05)]), castShadow([W(-hx, -hy, 0), W(hx, -hy, 0), W(hx, hy, 0), W(-hx, hy, 0), W(-hx, -hy, H), W(hx, hy, H)], o[2]));
    let s = B.slabW(W, -hx, -hy, hx, hy, 0, H, BODY, toneI, 1.1);
    s += flat([[-hx + 2.5, -hy + 2.5], [hx - 2.5, -hy + 2.5], [hx - 2.5, hy - 2.5], [-hx + 2.5, hy - 2.5]], H + .02, FACE, .6);
    // the LCD at the far end: digits, unit, DC sign; blank when the dial is at OFF
    s += flat([[-24, -11.5], [-8.5, -11.5], [-8.5, 11.5], [-24, 11.5]], H + .04, LCD, .5);
    if (m.state === 'ok' && m.text) s += text(-14.2, 0, m.text, 7, LCD_INK);
    if (m.state === 'ol') s += text(-14.2, 6, '1', 7, LCD_INK);
    if (m.state !== 'off'){ s += text(-10.6, -8.2, m.unit || 'V', 2.6, LCD_INK); s += text(-21.6, 8.6, 'DC', 2.2, LCD_INK); }
    // the range dial in the middle: a knob with a white pointer at the range in use, the range marks round it
    const q = (DIAL[m.range] != null ? DIAL[m.range] : DIAL['20V']) * Math.PI / 180, dx = 3.5;
    const ring = (rr, a0 = dx, b0 = 0, n = 20) => Array.from({ length: n }, (_, i) => [a0 + rr * Math.cos(i / n * 2 * Math.PI), b0 + rr * Math.sin(i / n * 2 * Math.PI)]);
    s += flat(ring(7.2), H + .05, '#2b2926', .6) + flat(ring(4.9), H + .3, '#4a4743', .5);
    // 12 o'clock is toward the LCD (-x); clockwise, as the reader sees it, turns toward -y
    const dial = (rr, deg) => [dx - rr * Math.cos(deg), -rr * Math.sin(deg)];
    s += `<path d="${pd([W(dx, 0, H + .35), W(...dial(4.3, q), H + .35)], false)}" stroke="#f6f1e3" stroke-width="1.1" stroke-linecap="round" fill="none"/>`;
    for (const [lab, deg] of [['OFF', 0], ['2V', 60], ['20V', 90], ['200m', 200], ['10A', 235]]) s += text(...dial(9.6, deg * Math.PI / 180), lab, 1.3, '#f6f1e3', 600);
    // jacks in a row at the near end: 10 A, COM (black), V/Ω/mA (red)
    const jacks = { A10: [20, -8], COM: [20, 0], V: [20, 8] };
    for (const [id, [a, b]] of Object.entries(jacks)){
      s += flat(ring(1.9, a, b), H + .05, id === 'COM' ? '#2b2825' : '#d8453a', .6) + flat(ring(.8, a, b), H + .07, '#151311', 0);
      s += text(a + 3.4, b, id === 'V' ? 'VΩmA' : id === 'COM' ? 'COM' : '10A', 1.2, '#f6f1e3', 600);
    }
    put(B.aabb([W(-hx, -hy, 0), W(hx, hy, H + .4)]), s);

    // the probes: a lead from each jack to a probe standing on its tip, leaning back toward the meter
    const tz = +p.tipZ || 0;
    [['COM', BLACK], ['V', RED]].forEach(([id, mat], i) => {
      const [ja, jb] = jacks[id], jack = W(ja, jb, H + .3), leg = legs[i];
      const tip = leg ? [leg[0], leg[1], leg[2] + tz] : W(hx + 12 + i * 8, -hy - 8, 0);
      const back = norm([jack[0] - tip[0], jack[1] - tip[1], 0]), lean = [back[0] * 4, back[1] * 4, 0];
      const t0 = [tip[0], tip[1], tip[2] + .2], h0 = [tip[0] + lean[0] * .3, tip[1] + lean[1] * .3, tip[2] + 4], h1 = [tip[0] + lean[0], tip[1] + lean[1], tip[2] + 16];
      put(B.aabb([t0, h0]).map((v, j) => v.map(x => x + (j ? .5 : -.5))), rod(t0, h0, .35, B.M.steel, toneI, .4, .5));
      put(B.aabb([h0, h1]).map((v, j) => v.map(x => x + (j ? 1.8 : -1.8))), rod(h0, h1, 1.6, mat, toneI, .7, 1.3));
      // the lead: a sagging curve from the jack to the top of the probe, in short boxed pieces
      const q0 = jack, q2 = h1, mid = [(q0[0] + q2[0]) / 2, (q0[1] + q2[1]) / 2, Math.max(q0[2], q2[2]) + 8], pts = [];
      for (let j = 0; j <= 10; j++){ const t = j / 10, u = 1 - t; pts.push([0, 1, 2].map(c => u * u * q0[c] + 2 * u * t * mid[c] + t * t * q2[c])); }
      for (let j = 0; j < 10; j++){ const a0 = pts[j], a1 = pts[j + 1];
        put(B.aabb([a0, a1]).map((v, h) => v.map(x => x + (h ? .6 : -.6))), rod(a0, a1, .6, mat, toneI, .6)); }
    });
    if (k > .5 && ctx.sel) put(B.aabb([W(-10, 0, H), W(-9, 1, H + 1)]), tag(W(-13, 0, H), -30, -26, T('Volts: red on the point, black on GND'), m.state === 'ok'));
    for (const it of items) ctx.put(it.box, it.svg);
  },
});
})();
