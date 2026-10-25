// @cf title ULN2003 stepper driver board
// @cf use engine/bench.list
/* The ULN2003 stepper driver board that comes with the 28BYJ-48 (docs/facts/la-components.md §15.2): a 35 x 32 mm
   PCB, the ULN2003APG Darlington array (DIP-16) in the middle, the white 5-pin JST-XH motor socket at the top, IN1-IN4
   on a 1x4 header and the power pins − + (5-12 V) at the bottom, the on/off power jumper beside them, and four red
   LEDs A-D down the right side. The layout is the common one read from product photos; the sheet marks the size as
   unverified.
   How it works: each input goes through the chip's 2.7 kΩ base resistor into a Darlington pair that sinks its output
   to GND, so a 5 V Uno pin switches a 50 Ω motor coil. Every output has a clamp diode to COM (pin 9), which the board
   ties to +: that is the flyback protection. VCE(sat) is about 1 V at 100 mA, so a "5 V" coil sees about 4 V: 80 mA
   per coil, 160 mA with two coils on. LED A-D (1 kΩ from + to the output) light while their output is on.
   Socket pins 1-5: OUT1 blue, OUT2 pink, OUT3 yellow, OUT4 orange, red = + (both coil centre taps).
   Modes are the Uno sketches of Learn Arduino lesson 13 seen at the inputs: AccelStepper FULL4WIRE needs the pin
   order 8, 10, 9, 11 (IN1, IN3, IN2, IN4), which gives IN1+IN2, IN2+IN3, IN3+IN4, IN4+IN1; the wrong order 8, 9, 10,
   11 puts both halves of one coil on together every other step, so the motor only jitters. */
(() => {
const B = SL.bench, T = B.T;
const PIN_PITCH = 2.54, XH = 2.5;
const U = [16.5, 15.5], pinX = k => U[0] + (k - 4.5) * PIN_PITCH;          // DIP-16 pin k (1-8 bottom row, 16-9 above)
const INX = [5.69, 8.23, 10.77, 13.31], JSTX = [12.5, 15, 17.5, 20, 22.5], JST_Y = 27.6;
const LEDY = [22.5, 19.5, 16.5, 13.5];
const WIRES = ['#3e86d9', '#f29bb5', '#f2c230', '#f08a2b', '#e2483d'];
const VCE = 1.0, COIL = 50;

/* white JST-XH 5-pin socket, open side up, 2.5 mm pitch */
B.kind('uln2003-jst', {
  group: 'tall', size: () => [14.9, 5.75], h: 7,
  draw(ctx){
    const [l, w] = ctx.p.size, h = ctx.p.h, wall = .8, body = { l: '#f7f4ea', m: '#e4dfcf', d: '#b9b29d' };
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h * .35, body, toneI, .8)
      + ctx.slab(-l / 2, -w / 2, l / 2, -w / 2 + wall, h * .35, h, body, toneI, .7) + ctx.slab(-l / 2, w / 2 - wall, l / 2, w / 2, h * .35, h, body, toneI, .7)
      + ctx.slab(-l / 2, -w / 2 + wall, -l / 2 + wall, w / 2 - wall, h * .35, h, body, toneI, .6) + ctx.slab(l / 2 - wall, -w / 2 + wall, l / 2, w / 2 - wall, h * .35, h, body, toneI, .6);
    // the latch ramp on the back wall keys the plug
    s += ctx.slab(-2, w / 2, 2, w / 2 + .6, h * .5, h * .9, body, toneI, .5);
    for (let i = 0; i < 5; i++){ const a = (i - 2) * XH; s += ctx.slab(a - .3, -.3, a + .3, .3, h * .35, h * .8, B.M.tin, toneI, .3); }
    s += ctx.text(-l / 2 + 1.2, -w / 2 - 1.1, .02, '1', 1.2, '#f2efe6');
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2 + .6, h), s);
  },
});
/* the motor's plug in the socket, with its five wires running off the back of the mat */
B.kind('uln2003-plug', {
  group: 'last', size: () => [12.6, 4.4], h: 9,
  draw(ctx){
    const [l, w] = ctx.p.size, h = ctx.p.h, body = { l: '#fbf8ef', m: '#e9e4d4', d: '#bdb6a0' };
    ctx.put(ctx.B(-l / 2, -w / 2, 2.5, l / 2, w / 2, h), ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 2.5, h, body, toneI, .8) + ctx.slab(-1.8, w / 2, 1.8, w / 2 + .7, 5, 8, body, toneI, .5));
    // up out of the plug, back over the board edge, down to the mat and along it to the back edge
    const md = B.md, zMat = -(md.pcb.standoff + md.pcb.thick) + .6, edge = md.pcb.h - ctx.p.at[1] + 1.5, far = edge + (md.mat.back || 10) - 1.5;
    for (let i = 0; i < 5; i++){
      const a = (i - 2) * XH, m = matOf(WIRES[i]), pts = [];
      for (let j = 0; j <= 10; j++){ const t = j / 10, y = edge * 1.25 * t, z = h + 3.2 * Math.sin(Math.min(1, t * 1.6) * Math.PI / 2) - (h + 3.2 - zMat) * Math.pow(Math.max(0, t - .35) / .65, 1.6);
        pts.push([a * (1 - .25 * t), y, Math.max(zMat, z)]); }
      pts.push([a * .75, far, zMat]);
      for (let j = 0; j < pts.length - 1; j++){ const p0 = pts[j], p1 = pts[j + 1];
        ctx.put(ctx.B(Math.min(p0[0], p1[0]) - .6, Math.min(p0[1], p1[1]) - .6, Math.min(p0[2], p1[2]) - .6, Math.max(p0[0], p1[0]) + .6, Math.max(p0[1], p1[1]) + .6, Math.max(p0[2], p1[2]) + .6), ctx.rod(p0, p1, .55, m, toneI, .5)); }
    }
  },
});
/* the two jumper pins; while the cap sits on them only the plastic shows */
B.kind('uln2003-pins', {
  group: 'low', size: () => [5.08, 2.54], h: 8.5, pins: p => B.rowPins(p),
  draw(ctx){ const p = ctx.p, [l, w] = p.size, capped = B.isIn('CAP') && B.st.exK < .05;
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, 2.5, B.M.blackPl, toneI, .6);
    if (!capped) for (const a of [-PIN_PITCH / 2, PIN_PITCH / 2]) s += ctx.slab(a - .32, -.32, a + .32, .32, 2.5, p.h, B.M.gold, toneI, .35);
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, capped ? 2.5 : p.h), s); },
});
/* the jumper cap that closes the + supply (power on) */
B.kind('uln2003-cap', {
  group: 'last', size: () => [5.1, 2.5], h: 8.6,
  draw(ctx){ const [l, w] = ctx.p.size; ctx.put(ctx.B(-l / 2, -w / 2, 2.5, l / 2, w / 2, ctx.p.h), ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 2.5, ctx.p.h, matOf('#2f2c29'), toneI, .7)); },
});
/* the A-D indicator LEDs: 1 kΩ from + through the LED into the output, so they dim with a low supply */
B.kind('uln2003-led', {
  group: 'smd', size: () => [2, 1.25], h: .8,
  draw(ctx){ const vm = (ctx.st.ev && ctx.st.ev.rails.VM) || 0, i = Math.max(0, (vm - VCE - 1.8) / 1000);
    const c2 = Object.create(ctx); c2.lit = ctx.lit * Math.min(1, Math.sqrt(i / .0022)); B.kinds.led.draw(c2); },
});

// one step pattern per mode: [IN1, IN2, IN3, IN4]
const FULL = [[1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 1, 1], [1, 0, 0, 1]];
const HALF = [[1, 0, 0, 0], [1, 1, 0, 0], [0, 1, 0, 0], [0, 1, 1, 0], [0, 0, 1, 0], [0, 0, 1, 1], [0, 0, 0, 1], [1, 0, 0, 1]];
const WAVE = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
const WRONG = [[1, 0, 1, 0], [0, 1, 1, 0], [0, 1, 0, 1], [1, 0, 0, 1]];     // FULL4WIRE on 8, 9, 10, 11
const pins = s => ({ IN1: s[0], IN2: s[1], IN3: s[2], IN4: s[3] });
const seq = (tbl, rate) => (st, t) => pins(tbl[Math.floor(t * rate) % tbl.length]);
const coilsText = (s, st) => { const on = s.reduce((a, b) => a + b, 0), vm = (st.ev && st.ev.rails.VM) || 0, ma = Math.round(on * Math.max(0, vm - VCE) / COIL * 1000);
  return ['IN1', 'IN2', 'IN3', 'IN4'].filter((_, i) => s[i]).join('+') + ' · ' + on + (on === 1 ? ' coil' : ' coils') + ' · ' + ma + ' mA'; };
const slow = (tbl, rate) => ({ out: seq(tbl, rate), serial: (k, st) => 'step ' + (k * rate) + ' · ' + coilsText(tbl[(k * rate) % tbl.length], st) });

B.module({
  id: 'uln2003', fig: '17', name: 'ULN2003 stepper driver board', sub: 'Seven Darlington switches with clamp diodes: an Uno pin drives a 28BYJ-48 coil',
  pcb: { w: 35, h: 32, thick: 1.6, r: 1, color: '#1f6e48', silk: '#f2f1e8', standoff: 4 },
  mat: { front: 10, back: 16, left: 10, right: 10 }, height: 14, pal: 'mint', logic: 5,
  holes: [[2.5, 2.5, 3], [32.5, 2.5, 3], [2.5, 29.5, 3], [32.5, 29.5, 3]],
  silk: [
    ...['IN1', 'IN2', 'IN3', 'IN4'].map((t, i) => [INX[i] + .45, 7.6, t, 1.1, 90]),
    [23.13, 6.9, '−', 1.8], [25.67, 6.9, '+', 1.8], [24.4, 1.2, '5-12V', 1.2], [29.4, 12.6, 'ON', 1.1],
    ...['A', 'B', 'C', 'D'].map((t, i) => [33.5, LEDY[i] - .5, t, 1.5]), [17.5, 22.9, 'ULN2003', 1.3],
  ],
  traces: [
    ...INX.map((x, i) => [[x, 4.2], [x, 8], [pinX(i + 1), 10.2], [pinX(i + 1), 11.7]]),
    ...[0, 1, 2, 3].map(i => [[pinX(i + 1), 19.3], [pinX(i + 1), 23 - i * .5], [JSTX[i], 25.5 - i * .5], [JSTX[i], JST_Y]]),
    [[25.67, 4.2], [25.67, 6], [29.4, 7.7]], [[29.4, 10.3], [29.4, 11.6], [27.2, 12.4], [27.2, 22.5]], [[27.2, 18], [pinX(8), 21], [pinX(8), 19.3]],
    [[pinX(8), 21], [pinX(8), 23.5], [22.5, 25.5], [22.5, JST_Y]], [[pinX(8), 11.7], [pinX(8), 8.6], [23.13, 6.4], [23.13, 4.2]],
  ],
  parts: [
    { id: 'U1', kind: 'dip', name: 'ULN2003 Darlington driver', short: 'ULN2003', at: U, n: 8, h: 3.4, group: 'low', label: 'ULN2003APG',
      nets: { 1: 'IN1', 2: 'IN2', 3: 'IN3', 4: 'IN4', 8: 'GND', 9: 'VM', 16: 'OUT1', 15: 'OUT2', 14: 'OUT3', 13: 'OUT4' },
      polar: { fault: 'hot', opts: ['notch left, as printed', 'notch right (backwards)'] } },
    { id: 'MOTOR', kind: 'uln2003-jst', name: 'Motor socket (JST-XH, 5 pins)', short: 'MOTOR', at: [17.5, JST_Y], pitch: XH, pins: ['OUT1', 'OUT2', 'OUT3', 'OUT4', 'VM'] },
    { id: 'CABLE', kind: 'uln2003-plug', name: '28BYJ-48 motor plug', short: 'MOTOR CABLE', at: [17.5, JST_Y] },
    { id: 'IN', kind: 'male', name: 'Input header IN1-IN4', short: 'IN1-IN4', at: [9.5, 4.2], h: 8.5, pins: ['IN1', 'IN2', 'IN3', 'IN4'] },
    { id: 'PWR', kind: 'male', name: 'Power pins − + (5-12 V)', short: '− +', at: [24.4, 4.2], h: 8.5, pins: ['GND', 'VM'], labels: ['−', '+'] },
    { id: 'JP', kind: 'uln2003-pins', name: 'Power jumper pins', at: [29.4, 9], rot: 90, h: 8.5, pins: ['VM_IN', 'VM'] },
    { id: 'CAP', kind: 'uln2003-cap', name: 'Jumper cap (power on)', short: 'ON JUMPER', at: [29.4, 9], rot: 90 },
    ...['A', 'B', 'C', 'D'].flatMap((n, i) => [
      { id: 'LED_' + n, kind: 'uln2003-led', name: 'LED ' + n + ' (coil ' + (i + 1) + ')', short: n, at: [31, LEDY[i]], led: { color: '#ec3b2f', net: 'IN' + (i + 1) },
        polar: { fault: 'dark', opts: ['cathode mark to the left, as printed', 'cathode mark to the right (backwards)'] } },
      { id: 'R_' + n, kind: 'chip', name: '1 kΩ resistor for LED ' + n, at: [28.2, LEDY[i]], size: [2, 1.25], h: .6, label: '102' }]),
  ],
  power: {
    sources: { ext: { label: '5 V supply on − +', pin: 'VM', v: 5, range: [5, 12], max: 20 } },
    default: 'ext',
    rails: { VM: { from: [{ src: 'ext', via: ['PWR', 'JP', 'CAP', 'U1'] }], max: 12.6 } },
    mcu: { part: 'U1', rail: 'VM', min: .5, needs: ['U1'] },
    upload: { source: 'ext', needs: [], tool: 'none' },
  },
  mode: 'full-slow',
  modes: {
    'full-slow': Object.assign({ title: 'Full step, slowed down', instant: true, bytes: 2840 }, slow(FULL, 2)),
    full: { title: 'Full step at 500 steps/s', instant: true, bytes: 2840, out: () => pins([.5, .5, .5, .5]),
      serial: (k, st) => '500 steps/s ≈ 14.7 RPM · 2 coils on at a time · ' + Math.round(2 * Math.max(0, ((st.ev && st.ev.rails.VM) || 0) - VCE) / COIL * 1000) + ' mA' },
    half: Object.assign({ title: 'Half step, slowed down', instant: true, bytes: 2860 }, slow(HALF, 4)),
    wave: Object.assign({ title: 'Wave drive, slowed down', instant: true, bytes: 2810 }, slow(WAVE, 2)),
    wrong: Object.assign({ title: 'Wrong pin order 8, 9, 10, 11', instant: true, bytes: 2840 }, slow(WRONG, 2)),
    stall: { title: 'Too fast: 1000 steps/s', instant: true, bytes: 2840, out: () => pins([.5, .5, .5, .5]),
      serial: () => '1000 steps/s is past the pull-out rate: the motor hums and stalls, the LEDs still cycle' },
    off: { title: 'disableOutputs()', instant: true, bytes: 2900, out: () => pins([0, 0, 0, 0]), serial: () => 'coils off · 0 mA' },
  },
  faults: ['cold:IN', 'cold:MOTOR'],
  xr: {
    flow: [
      ...INX.map((x, i) => ['IN' + (i + 1), [[x, 4.2], [x, 8], [pinX(i + 1), 10.2], [pinX(i + 1), 11.7]]]),
      ...[0, 1, 2, 3].map(i => ['IN' + (i + 1), [[JSTX[i], JST_Y], [JSTX[i], 25.5 - i * .5], [pinX(i + 1), 23 - i * .5], [pinX(i + 1), 19.3]]]),
      ['VM', [[25.67, 4.2], [25.67, 6], [29.4, 7.7], [29.4, 11.6], [27.2, 12.4], [27.2, 18], [pinX(8), 21], [pinX(8), 23.5], [22.5, 25.5], [22.5, JST_Y]]],
    ],
    notes: [['U1', 'SEVEN DARLINGTON PAIRS'], ['MOTOR', 'COILS: BLUE PINK YELLOW ORANGE'], ['CAP', 'POWER ON JUMPER']],
  },
  tags: [['U1', -42, -30], ['MOTOR', 30, -34], ['IN', -40, 22], ['PWR', 26, 30], ['CAP', 40, 14], ['LED_A', 44, -14]],
  elec: {
    pins: {
      IN1: { role: 'in', ohms: 2700, vih: 2.4, drives: 'OUT1' }, IN2: { role: 'in', ohms: 2700, vih: 2.4, drives: 'OUT2' },
      IN3: { role: 'in', ohms: 2700, vih: 2.4, drives: 'OUT3' }, IN4: { role: 'in', ohms: 2700, vih: 2.4, drives: 'OUT4' },
      VM: { role: 'supply', range: [5, 12], max: 50 }, GND: { role: 'gnd' },
      OUT1: { role: 'sink', vsat: VCE, imax: .5, clamp: 'VM' }, OUT2: { role: 'sink', vsat: VCE, imax: .5, clamp: 'VM' },
      OUT3: { role: 'sink', vsat: VCE, imax: .5, clamp: 'VM' }, OUT4: { role: 'sink', vsat: VCE, imax: .5, clamp: 'VM' },
    },
    load: { coil: COIL, perCoil: 'VM - vsat over 50 Ω', led: { ohms: 1000, vf: 1.8 } },
  },
});
})();
