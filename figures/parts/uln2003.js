// @cf title ULN2003 stepper driver board
// @cf use engine/bench.list
/* The common ULN2003 stepper driver board that comes with the 28BYJ-48: a green 35 x 32 mm board lying on the mat,
   the ULN2003APG (DIP-16, seven Darlington pairs, four used) in the middle, the white 5-pin JST-XH motor socket on
   the back edge, four red LEDs A-D (one per output, lit while that coil is on), and on the front edge the IN1-IN4
   header, the - + power pins (5-12 V) and the ON/OFF jumper. Legs ['IN1','IN2','IN3','IN4','GND','VCC']: the
   header pins a jumper wire pushes onto. The motor plugs in with `plug: '<this id>'` on the stepper; the socket
   is [OUT1, OUT2, OUT3, OUT4, +] = blue, pink, yellow, orange, red.
   Facts as in figures/modules/uln2003.js (the module page of the same board): each input is 2.7 kOhm into a
   Darlington, hFE about 1000; VCE(sat) about 1 V at 100 mA, 500 mA a channel at most; a clamp diode from every output
   to COM, which the board ties to + through the jumper. An input HIGH pulls its output LOW, so the coil between +
   and that output is on (about 80 mA from 5 V), and its LED lights. */
(() => {
const B = SL.bench, T = B.T;
const PCB = { l: '#4fa86a', m: '#2f8a4e', d: '#1d5c33' }, XH = B.M.white, LED_OFF = matOf('#c46a5e'), LED_ON = matOf('#ff5a3c');
const HL = 17.5, HD = 16, Z0 = 1.4, ZT = Z0 + 1.6;               // half length, half depth, board bottom and top
const HP = 2.54, HY = -13.4, PLASTIC = 2.5, PIN = 6;          // front header row, plastic and pin heights
const IN_X = [-14, -11.46, -8.92, -6.38], PWR_X = [3.4, 5.94], JMP_X = [11.6, 14.14];
const SOCK = { x: -3, y: 12.4, w: 12.4, d: 5.8, h: 6 }, LEDS = [8.2, 3.8, -.6, -5];      // socket; LED y at x = 12.6
const DEMO = { stepping: 'stepping', idle: 'idle' };
const callouts = ctx => typeof ctx.label === 'function' && (!!ctx.sel || !!(B.md && B.md.def && B.md.def.partPage));
const frame = (p, origin) => {
  const r = (+p.rot || 0) * Math.PI / 180, ax = [Math.cos(r), Math.sin(r), 0], ay = [-ax[1], ax[0], 0], o = origin;
  return { ax, ay, W: (x, y, z) => [o[0] + ax[0] * x + ay[0] * y, o[1] + ax[1] * x + ay[1] * y, o[2] + z] };
};
const legX = i => i < 4 ? IN_X[i] : PWR_X[i - 4];

B.part('uln2003', {
  name: 'ULN2003 driver board', fig: 'P25', legs: ['IN1', 'IN2', 'IN3', 'IN4', 'GND', 'VCC'],
  // inside: the four outputs and the four Darlington bases behind their 2.7 kOhm resistors
  nodes: ['OUT1', 'OUT2', 'OUT3', 'OUT4', 'B1', 'B2', 'B3', 'B4'],
  socket: ['OUT1', 'OUT2', 'OUT3', 'OUT4', 'VCC'],
  params: { demo: Object.keys(DEMO) },
  paramNames: { demo: 'Show' },
  example: { demo: 'stepping' },
  show: { breadboard: 'mini', parts: [{ id: 'U1', part: 'uln2003', at: [-30, 10], rot: 90, demo: 'stepping' }], wires: [] },
  foot: [35, 32, 12],
  elec: () => [1, 2, 3, 4].flatMap(n => [
    { type: 'res', ohms: 2700, legs: ['IN' + n, 'B' + n], ch: n },
    { type: 'npn', darlington: true, ch: n, pins: { B: 'B' + n, C: 'OUT' + n, E: 'GND' }, hfe: 1000, vbe: 1.4, vcesat: 1, icmax: .5, pmax: .4, theta: 70, tjmax: 150 },
    { type: 'diode', ch: n, legs: ['OUT' + n, 'VCC'], imax: .5 },
  ]),
  tag: (p, m) => {
    const ch = m && m.ch; if (!ch) return p.id;
    const lit = [1, 2, 3, 4].filter(n => ch[n] && ch[n].state === 'on').map(n => 'ABCD'[n - 1]);
    return lit.length ? T('{id} · coils {w} on', { id: p.id, w: lit.join('+') }) : p.id;
  },
  // a jumper wire's housing sits over the pin, a little above the header's plastic
  legAt: (p, origin, i) => frame(p, origin).W(legX(i), HY, ZT + PLASTIC + 1.5),
  // the stepper's plug, pushed into the socket from above: one point per socket pin
  socketAt: (p, origin) => { const { W } = frame(p, origin); return [0, 1, 2, 3, 4].map(i => W(SOCK.x + (i - 2) * 2.5, SOCK.y, ZT + SOCK.h - 2.5)); },
  draw(ctx){
    const p = ctx.p, st = ctx.st || {}, k = ctx.k != null ? ctx.k : st.xr || 0, o = ctx.origin || [0, 0, 0];
    const { ax, ay, W } = frame(p, o), items = [], put = (pts, svg) => items.push({ box: B.aabb(pts), svg });
    // which outputs are on: the solver's channels, else the demo walking the full-step sequence
    const ch = ctx.m && ctx.m.ch, burnt = n => !!(ch && ch[n] && ch[n].state === 'burnt');
    let lit;
    if (ch) lit = [1, 2, 3, 4].map(n => !!(ch[n] && (ch[n].state === 'on' || ch[n].state === 'linear')));
    else if (p.demo === 'stepping' || !p.demo){ const ph = Math.floor((st.t || 0) * 4) % 4; lit = [0, 1, 2, 3].map(i => i === ph || i === (ph + 1) % 4); }
    else lit = [false, false, false, false];
    put([W(-HL - 1, -HD - 1, 0), W(HL + 1, HD + 1, .05)], castShadow([W(-HL, -HD, 0), W(HL, -HD, 0), W(HL, HD, 0), W(-HL, HD, 0), W(-HL, -HD, ZT + 7), W(HL, HD, ZT + 7)], o[2]));
    // the board on its solder stubs, four mounting holes
    let pcb = B.slabW(W, -HL, -HD, HL, HD, Z0, ZT, PCB, toneI, 1.1);
    for (const [x, y] of [[-14.6, 13.2], [14.6, 13.2], [-14.6, -9], [14.6, -9]]) pcb += shape(B.circ(x, y, 1.5, 14).map(([a, b]) => W(a, b, ZT + .02)), '#2b2825', .4);
    if (k < .5 && vis([0, 0, 1])){
      IN_X.forEach((x, i) => { pcb += B.flatText(W(x, HY + 3.4, ZT + .03), -ax[1], -ax[0], 'IN' + (i + 1), 1.5, B.M.silk, 700); });
      pcb += B.flatText(W(PWR_X[0], HY + 3.4, ZT + .03), -ax[1], -ax[0], '−', 2.2, B.M.silk, 800) + B.flatText(W(PWR_X[1], HY + 3.4, ZT + .03), -ax[1], -ax[0], '+', 2.2, B.M.silk, 800)
        + B.flatText(W(4.7, HY + 5.6, ZT + .03), -ax[1], -ax[0], '5-12V', 1.5, B.M.silk, 700)
        + B.flatText(W(12.9, HY + 3.4, ZT + .03), -ax[1], -ax[0], 'ON/OFF', 1.3, B.M.silk, 700);
      LEDS.forEach((y, i) => { pcb += B.flatText(W(9.6, y - .5, ZT + .03), -ax[1], -ax[0], 'ABCD'[i], 1.8, B.M.silk, 800); });
    }
    put([W(-HL, -HD, Z0), W(HL, HD, ZT)], pcb);
    // see-through: the copper from each input to the chip, and from the chip's output to its LED and the socket
    if (k > .02){
      let cu = '';
      [0, 1, 2, 3].forEach(i => {
        const col = lit[i] ? '#e2483d' : B.M.copper.m, w = lit[i] ? 1.4 : .9;
        cu += `<path d="${pd([W(IN_X[i], HY + 1, ZT + .04), W(IN_X[i], -6, ZT + .04), W(-13 + i * 2.54, -4.2, ZT + .04)], false)}" stroke="${col}" stroke-width="${f(w)}" fill="none" opacity="${f(k)}"/>`;
        cu += `<path d="${pd([W(-13 + i * 2.54, 2.6, ZT + .04), W(-8 + i * 2.5, 9, ZT + .04), W(SOCK.x + (i - 2) * 2.5, SOCK.y - 2, ZT + .04)], false)}" stroke="${col}" stroke-width="${f(w)}" fill="none" opacity="${f(k)}"/>`;
      });
      put([W(-HL, -HD, ZT), W(HL, HD, ZT + .1)], cu);
    }
    // the ULN2003APG: 19.3 x 6.4 mm, its long side along x, eight legs a side bent down to the board
    const cx = -4.4, cy = -.8, chipZ = ZT + .5;
    let chip = '';
    for (let i = 0; i < 8; i++) for (const sd of [-1, 1]){ const x = cx - 8.9 + i * HP, y = cy + sd * 3.2;
      chip += B.slabW(W, x - .3, y - (sd < 0 ? 1.2 : 0), x + .3, y + (sd > 0 ? 1.2 : 0), ZT, chipZ + 1.2, B.M.tin, toneI, .3); }
    let body = B.slabW(W, cx - 9.65, cy - 3.2, cx + 9.65, cy + 3.2, chipZ, chipZ + 3.3, B.M.black, toneI, 1);
    if (vis([0, 0, 1])) body += shape(B.circ(cx - 8.2, cy, .8, 12).map(([a, b]) => W(a, b, chipZ + 3.32)), '#2b2825', .3)
      + (k < .5 ? B.flatText(W(cx, cy - .5, chipZ + 3.33), -ax[1], -ax[0], 'ULN2003APG', 1.6, '#bdb8ae', 700) : '');
    if (k > .02){
      // inside: the die and four lit channels
      let die = shape([W(cx - 2.5, cy - 1.8, chipZ + 1.6), W(cx + 2.5, cy - 1.8, chipZ + 1.6), W(cx + 2.5, cy + 1.8, chipZ + 1.6), W(cx - 2.5, cy + 1.8, chipZ + 1.6)], '#9aa4ad', .5);
      for (let i = 0; i < 4; i++) die += shape([W(cx - 2.2 + i * 1.2, cy - 1.4, chipZ + 1.62), W(cx - 1.4 + i * 1.2, cy - 1.4, chipZ + 1.62), W(cx - 1.4 + i * 1.2, cy + 1.4, chipZ + 1.62), W(cx - 2.2 + i * 1.2, cy + 1.4, chipZ + 1.62)], lit[i] ? '#ffb36b' : '#6e7880', .3);
      body = `<g opacity="${f(1 - .7 * k)}">${body}</g><g opacity="${f(k)}">${die}</g>`;
    }
    put([W(cx - 10.2, cy - 4.4, ZT), W(cx + 10.2, cy + 4.4, chipZ + 3.4)], chip + body);
    // LEDs A-D: 3 mm red domes, lit with their coil
    LEDS.forEach((y, i) => {
      const glow = lit[i] && !burnt(i + 1), m = glow ? LED_ON : LED_OFF, [lx, ly] = W(12.6, y, 0);
      let s = cyl(lx, ly, o[2] + ZT, o[2] + ZT + 3.2, 1.5, m, toneI, .6, 14) + cyl(lx, ly, o[2] + ZT + 3.2, o[2] + ZT + 4.2, 1.1, m, toneI, .5, 12);
      if (glow){ const [X, Y] = P(...W(12.6, y, ZT + 4)); s = `<circle cx="${f(X)}" cy="${f(Y)}" r="5" fill="#ff7a4d" opacity=".35"/>` + s; }
      put([W(11, y - 1.6, ZT), W(14.2, y + 1.6, ZT + 4.3)], s);
    });
    // the front header: IN1-IN4, then - +, then the jumper with its black cap
    const header = (xs, cap) => {
      const x0 = xs[0] - 1.27, x1 = xs[xs.length - 1] + 1.27;
      let s = B.slabW(W, x0, HY - 1.27, x1, HY + 1.27, ZT, ZT + PLASTIC, B.M.black, toneI, .7);
      for (const x of xs) s += B.slabW(W, x - .32, HY - .32, x + .32, HY + .32, ZT + PLASTIC, ZT + PLASTIC + PIN, B.M.gold, toneI, .35);
      if (cap) s += B.slabW(W, x0, HY - 1.3, x1, HY + 1.3, ZT + PLASTIC + 1, ZT + PLASTIC + 6.5, B.M.blackPl, toneI, .8);
      put([W(x0, HY - 1.3, ZT), W(x1, HY + 1.3, ZT + PLASTIC + PIN)], s);
    };
    header(IN_X); header(PWR_X); header(JMP_X, true);
    // the motor socket: a white 5-pin JST-XH, open on top
    let sk = B.slabW(W, SOCK.x - SOCK.w / 2, SOCK.y - SOCK.d / 2, SOCK.x + SOCK.w / 2, SOCK.y + SOCK.d / 2, ZT, ZT + SOCK.h, XH, toneI, .9);
    if (vis([0, 0, 1])) for (let i = 0; i < 5; i++) sk += shape([[-.9, -1.4], [.9, -1.4], [.9, 1.4], [-.9, 1.4]].map(([a, b]) => W(SOCK.x + (i - 2) * 2.5 + a, SOCK.y + b, ZT + SOCK.h + .02)), '#3a3633', .3);
    put([W(SOCK.x - SOCK.w / 2, SOCK.y - SOCK.d / 2, ZT), W(SOCK.x + SOCK.w / 2, SOCK.y + SOCK.d / 2, ZT + SOCK.h)], sk);
    if (k > .5 && callouts(ctx)){
      ctx.label(W(cx, cy, chipZ + 3.3), 'ULN2003: Darlington switches', lit.some(Boolean));
      ctx.label(W(IN_X[1], HY, ZT + PLASTIC), 'IN1-IN4 from the board');
      ctx.label(W(12.6, LEDS[1], ZT + 4), 'LED on = coil on', lit.some(Boolean));
      ctx.label(W(SOCK.x, SOCK.y, ZT + SOCK.h), 'Motor socket, red = +');
    }
    for (const it of items) ctx.put(it.box, it.svg);
  },
});
})();
