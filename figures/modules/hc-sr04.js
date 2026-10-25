// @cf title HC-SR04 ultrasonic distance sensor
// @cf use engine/bench.list
/* HC-SR04, the classic three-chip board (docs/facts/hcsr04.md). No maker publishes a design file: the 45 x 20 mm
   outline, the two diagonal mounting holes and every part centre are read off one straight-on photo of a blue board
   (+-0.5 mm), the nets from the reverse-engineered "HC-SR04 Ultrasound Echo Locator" schematic. Board frame: front
   (transducer) side up, header edge at y = 0. The front carries only T and R (16 mm aluminium cans, 40 kHz piezo
   transducers), the 4 MHz crystal between them and the header's four solder joints under "Vcc Trig Echo Gnd"; every
   SMD part is on the back, so those show in see-through only: the MAX3232 transmit driver behind T, the EM78P153S
   microcontroller over the header, the LM324 receive amplifier behind R, two SOT-23 transistors and the 0603
   passives (their positions are illustrative: the photo shows them spread over the back, densest behind R). The
   right-angle header's plastic sits on the back and its pins run 6.2 mm past the bottom edge.
   How it works: a 10 us HIGH on Trig makes the MCU send eight 40 kHz cycles to T through the MAX3232 (its charge pump
   only runs during the burst), then Echo goes HIGH until the receive chain hears the echo: 58 us per cm of distance,
   2 cm to 4 m, about 38 ms when nothing comes back. The built-in programs are what a host sketch prints from it
   ("30.02 cm" or "no echo", one ping a second here; at least 60 ms apart on a real board). Soft targets swallow the
   sound, so a cushion reads "no echo", now and then the wall behind it.
   Power: 5 V only (4.5-5.5 V, about 15 mA), straight onto every chip: no regulator, no reverse-polarity diode, no
   fuse. Reversed it burns the MCU; above 6 V the MAX3232 and the MCU die; on 3.3 V the MCU runs but the drive and
   the receiver gain are too low, so every ping reads "no echo". Echo is a 5 V output: divide it for a 3.3 V board. */
(() => {
const B = SL.bench;
const CAN_R = 8, CAN_H = 12.4, RISE = 26;
const CAN = { l: '#eef0f1', m: '#c6cacd', d: '#8f959a' }, BRASS = { l: '#f0d58c', m: '#cfae5a', d: '#8a6d2a' };
const WAVE = '#3e86d9';
const ghostK = (ctx, s) => ctx.k > 0 ? `<g opacity="${f(1 - .7 * ctx.k)}">${s}</g>` : s;

/* the target in front of the sensor for each program: cm, or null for no echo; `soft` swallows most pings */
const target = (mode, t) => {
  if (mode === 'wall') return { cm: 30 };
  if (mode === 'approach') return { cm: 100 - 95 * ((t % 12) / 12) };
  if (mode === 'cushion') return { cm: 40, soft: true };
  return null;
};
const vcc = st => (st.ev && st.ev.rails && st.ev.rails.VCC) || 0;
const live = st => !!(st.ev && st.ev.status === 'running');
// below 4.5 V the MAX3232 drive and the LM324 gain drop: the burst goes out weak and no echo is heard
const strong = st => vcc(st) >= 4.5;
// the echo this ping, as the receiver hears it (null: nothing above the comparator threshold)
const echo = (st, k) => {
  const tg = target(st.mode, st.t);
  if (!live(st) || !strong(st) || !tg || !B.isSet('R') || !B.isSet('U3')) return null;
  if (tg.soft) return k % 4 === 3 ? { cm: 183.4, weak: true } : null;
  return { cm: tg.cm };
};
const reading = (st, k) => {
  if (st.faults.includes('cold:J1.3') && k % 3 === 1) return 'no echo';
  const e = echo(st, k);
  if (!e) return 'no echo';
  const us = Math.round(e.cm * 58 + Math.sin(k * 7.1) * 9);   // a few us of jitter, as a real reading has
  return (us / 58).toFixed(2) + ' cm';
};
const program = title => ({ title, instant: true, bytes: 0, out: () => ({}), serial: (k, st) => reading(st, k) });

/* a 16 mm transducer: aluminium can, silver wire mesh over dark cloth; inside, a piezo disc on a brass plate and a
   small aluminium cone. While the sketch pings, rings of sound leave T and the echo comes back down onto R. */
B.kind('hcsr04-can', {
  group: 'tall', size: () => [2 * CAN_R, 2 * CAN_R], h: CAN_H,
  draw(ctx){
    const p = ctx.p, h = p.h, r = CAN_R, st = ctx.st;
    let s = ctx.cyl(0, 0, 0, h, r, CAN, toneI, .9, 28) + ctx.disc(0, 0, h + .01, r - .6, '#2f3236', .4);
    for (let u = -r + 1.3; u < r - .7; u += .9){
      const hw = Math.sqrt(Math.max(0, (r - .8) ** 2 - u * u));
      s += ctx.line([[u, -hw, h + .02], [u, hw, h + .02]], .22, '#aab0b6') + ctx.line([[-hw, u, h + .02], [hw, u, h + .02]], .22, '#aab0b6');
    }
    ctx.put(ctx.B(-r, -r, 0, r, r, h), ghostK(ctx, s));
    if (!live(st) || st.ev.fault) return;
    const ph = st.t % 1, k = Math.floor(st.t);
    const ring = (z, rad, op) => `<path d="${pd(B.circ(0, 0, rad, 28).map(([a, b]) => ctx.W(a, b, z)))}" fill="none" stroke="${WAVE}" stroke-width="1.3" opacity="${f(op)}"/>`;
    let w = '';
    if (p.role === 'tx' && ph < .45){
      for (let i = 0; i < 3; i++){ const u = ph / .45 - i * .12; if (u > 0 && u < 1) w += ring(h + 1 + u * RISE, r * (.8 + u * .9), (strong(st) ? .9 : .3) * (1 - u)); }
    }
    const e = echo(st, k);
    if (p.role === 'rx' && e && ph >= .5 && ph < .95){
      for (let i = 0; i < 3; i++){ const u = (ph - .5) / .45 - i * .12; if (u > 0 && u < 1) w += ring(h + 1 + (1 - u) * RISE, r * (1.7 - u * .9), (e.weak ? .3 : .8) * u); }
    }
    if (w) ctx.put(ctx.B(-2 * r, -2 * r, h + 1, 2 * r, 2 * r, h + RISE + 1), w);
  },
  xr(ctx){
    const p = ctx.p, h = p.h, st = ctx.st, ph = st.t % 1, z0 = h * .4;
    // the disc rings while T sends its burst and while R hears the echo
    const buzz = live(st) && ((p.role === 'tx' && ph < .1) || (p.role === 'rx' && ph >= .9 && echo(st, Math.floor(st.t)))) ? Math.sin(st.t * 90) * .25 : 0;
    let s = ctx.rod([0, -5, -1.6], [0, -5, .6], .3, B.M.tin, toneI, .3) + ctx.rod([0, 5, -1.6], [0, 5, .6], .3, B.M.tin, toneI, .3)
      + ctx.line([[0, -5, .6], [0, -2.6, z0]], .35, '#c2523c') + ctx.line([[0, 5, .6], [0, 2.6, z0]], .35, '#3a3632')
      + ctx.cyl(0, 0, 0, z0, 1, B.M.blackPl, toneI, .4, 12);
    s += ctx.cyl(0, 0, z0 + buzz, z0 + .4 + buzz, 5, BRASS, toneI, .5, 24) + ctx.cyl(0, 0, z0 + .4 + buzz, z0 + .9 + buzz, 3.6, B.M.ceramic, toneI, .5, 24);
    for (let i = 0; i < 12; i++){ const q = i / 12 * 2 * Math.PI;
      s += ctx.line([[.8 * Math.cos(q), .8 * Math.sin(q), z0 + .9 + buzz], [4.6 * Math.cos(q), 4.6 * Math.sin(q), h - 2 + buzz]], .3, '#9aa1a6'); }
    s += `<path d="${pd(B.circ(0, 0, 4.6, 24).map(([a, b]) => ctx.W(a, b, h - 2 + buzz)))}" fill="none" stroke="${INK}" stroke-width=".5"/>`;
    ctx.put(ctx.B(-5, -5, 0, 5, 5, h - 1.8), `<g opacity="${f(ctx.k)}">${s}</g>`);
  },
  xrLabel: () => 'PIEZO DISC + CONE',
});

/* the right-angle header: the front shows four solder joints; under the board the black body sits flush with the
   bottom edge and the pins leave it in the board's plane */
B.kind('hcsr04-header', {
  group: 'low', size: () => [10.16, 2.5], h: 2.5, pins: p => B.rowPins(p),
  draw(ctx){
    const p = ctx.p, [l, w] = p.size, th = B.md.pcb.thick, zp = w / 2, tip = -w / 2 - 6.2;
    const at = B.rowPins(p).map(([x, y]) => B.localOf(p, x, y)[0]);
    let joints = '', under = '', out = '';
    for (const a of at){
      joints += ctx.cyl(a, 0, -th - .5, -th, .8, B.M.tin, toneI, .4, 12) + ctx.cyl(a, 0, -th - 1.1, -th - .5, .32, B.M.tin, toneI, .3, 8);
      under += ctx.slab(a - .32, -.32, a + .32, .32, -th, zp + .32, B.M.gold, toneI, .35);
      out += ctx.slab(a - .32, tip, a + .32, -w / 2, zp - .32, zp + .32, B.M.gold, toneI, .35);
    }
    ctx.put(ctx.B(-l / 2, -1, -th - 1.1, l / 2, 1, -th), joints);
    // the body is under the board: drawn only from the side where the bottom edge faces the camera, or see-through
    if (vis(sub(ctx.W(0, -1, zp), ctx.W(0, 0, zp))) || ctx.k > 0)
      ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, w), ghostK(ctx, ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, w, B.M.blackPl, toneI, .6) + under));
    ctx.put(ctx.B(-l / 2, tip, zp - .4, l / 2, -w / 2, zp + .4), out);
  },
});

/* a back-side SMD part, drawn with its usual kind but only when the board is see-through */
B.kind('hcsr04-back', {
  group: 'smd', size: p => B.kinds[p.base].size(p), h: p => B.kinds[p.base].h,
  draw(ctx){ if (ctx.k > 0) B.kinds[ctx.p.base].draw(fade(ctx)); },
  xr(ctx){ const kd = B.kinds[ctx.p.base]; if (kd.xr) kd.xr(fade(ctx)); },
  xrLabel: p => { const kd = B.kinds[p.base]; return kd.xrLabel ? kd.xrLabel(p) : null; },
});
const fade = ctx => Object.assign({}, ctx, { put: (bx, svg) => ctx.put(bx, `<g opacity="${f(Math.min(1, ctx.k * 1.5))}">${svg}</g>`) });

/* the back's 0603 resistors and capacitors as one part; illustrative spots, densest behind R */
const SPOTS = [[9.5, 4.2, 'r'], [9.5, 6.0, 'c'], [9.5, 14.2, 'c'], [9.5, 16.0, 'c'], [12.8, 15.6, 'r'], [16.2, 15.8, 'c'], [16.8, 13.4, 'c'],
  [27.8, 13.6, 'r'], [27.8, 15.6, 'c'], [17.6, 5.0, 'r'], [27.2, 5.0, 'r'], [30.4, 4.2, 'r'], [30.4, 6.0, 'c'], [30.4, 12.4, 'r'], [30.4, 14.4, 'c'],
  [34.2, 4.0, 'r'], [36.2, 4.0, 'r'], [38.2, 4.0, 'c'], [40.2, 4.0, 'r'], [42.2, 4.0, 'r'], [34.2, 14.4, 'r'], [36.2, 14.4, 'c'], [38.2, 14.4, 'r'],
  [40.2, 14.4, 'r'], [42.2, 14.4, 'c'], [35.4, 16.4, 'r'], [37.4, 16.4, 'c'], [39.4, 16.4, 'r'], [41.4, 16.4, 'r'], [43.4, 12.2, 'c', 90]];
B.kind('hcsr04-passives', {
  group: 'smd', size: p => p.size, h: .5,
  draw(ctx){
    if (!(ctx.k > 0)) return;
    const p = ctx.p, op = f(Math.min(1, ctx.k * 1.5)), res = { l: '#3c3935', m: '#2c2a27', d: '#1c1b19' };
    for (const [x, y, kind, r = 0] of SPOTS){
      const [a, b] = B.localOf(p, x, y), q = r ? [.4, .8] : [.8, .4];
      ctx.put(ctx.B(a - q[0], b - q[1], 0, a + q[0], b + q[1], .5), `<g opacity="${op}">${ctx.slab(a - q[0], b - q[1], a + q[0], b + q[1], 0, .5, kind === 'c' ? B.M.tan : res, toneI, .3)}</g>`);
    }
  },
});

B.module({
  id: 'hc-sr04', name: 'HC-SR04 ultrasonic distance sensor',
  sub: 'Times a 40 kHz ping to the target and back: 58 µs per cm, 2 cm to 4 m, on 5 V',
  pcb: { w: 45, h: 20, thick: 1.6, r: 0, color: '#2d6cc0', silk: '#f2f4f6', standoff: 2.6 },
  mat: { front: 9, back: 9, left: 9, right: 9 }, height: 16, pal: 'cobalt', logic: 5,
  holes: [[2.2, 1.9, 2], [43.2, 18.3, 2]],
  silk: [[18.74, 4.6, 'Vcc', .8, 90], [21.28, 4.6, 'Trig', .8, 90], [23.82, 4.6, 'Echo', .8, 90], [26.36, 4.6, 'Gnd', .8, 90],
    [1.7, 18.7, 'T', 1.3], [43.6, 1.6, 'R', 1.3]],
  traces: [[[18.74, 1.25], [18.74, 6.2], [16.2, 9.9]], [[26.36, 1.25], [26.36, 6.2], [28.2, 9.9]]],
  parts: [
    { id: 'T', kind: 'hcsr04-can', role: 'tx', name: '40 kHz ultrasonic transmitter (T): a piezo disc in a 16 mm can', short: 'TRANSMITTER', at: [9.2, 9.9] },
    { id: 'R', kind: 'hcsr04-can', role: 'rx', name: '40 kHz ultrasonic receiver (R): a piezo disc in a 16 mm can', short: 'RECEIVER', at: [34.7, 9.9] },
    { id: 'Y1', kind: 'xtal', name: '4 MHz crystal: the MCU\'s clock, which times the 40 kHz burst', short: '4 MHz', at: [22.6, 17.6], size: [11, 4.65], h: 3.5, label: '4.000' },
    { id: 'J1', kind: 'hcsr04-header', name: '4-pin right-angle header: Vcc, Trig, Echo, Gnd', short: 'HEADER', side: 'bottom',
      at: [22.55, 1.25], pins: ['VCC', 'TRIG', 'ECHO', 'GND'], labels: ['Vcc', 'Trig', 'Echo', 'Gnd'] },
    { id: 'U1', kind: 'hcsr04-back', base: 'soic', side: 'bottom', name: 'EM78P153S microcontroller: sends the burst, times the echo', short: 'MCU',
      at: [22.3, 10.1], n: 7, label: 'EM78P153S', nets: { 4: 'VCC', 11: 'GND', 1: 'TRIG', 2: 'ECHO' } },
    { id: 'U2', kind: 'hcsr04-back', base: 'soic', side: 'bottom', name: 'MAX3232 transmit driver: drives T in antiphase from its charge pump', short: 'TX DRIVER',
      at: [4.5, 10.1], rot: 90, n: 8, label: 'MAX3232' },
    { id: 'U3', kind: 'hcsr04-back', base: 'soic', side: 'bottom', name: 'LM324 quad op-amp: amplifies, filters and compares what R hears', short: 'RX AMP',
      at: [40.3, 9.1], n: 7, label: 'LM324' },
    // which SOT-23 is which is not legible on the board: paired with their schematic roles by position
    { id: 'Q1', kind: 'hcsr04-back', base: 'sot23', side: 'bottom', name: 'PNP switch: powers the driver only during a ping (BC857 in the schematic)', at: [7.9, 17.9] },
    { id: 'Q2', kind: 'hcsr04-back', base: 'sot23', side: 'bottom', name: 'NPN comparator output to the MCU (BC847 in the schematic)', at: [32.0, 18.1] },
    { id: 'RC', kind: 'hcsr04-passives', side: 'bottom', name: 'Resistors and capacitors on the back (R1-R21, C1-C16)', short: 'PASSIVES', at: [26.45, 10.2], size: [35, 14] },
  ],
  power: {
    sources: {
      v5: { label: '5 V from the board', pin: 'VCC', v: 5, range: [4.5, 5.5], max: 6 },
      v33: { label: '3.3 V from the board', pin: 'VCC', v: 3.3, range: [4.5, 5.5], max: 6 },
    },
    default: 'v5',
    rails: {
      VCC: { from: [{ src: 'v5', via: ['J1'], burns: 'U1' }, { src: 'v33', via: ['J1'], burns: 'U1' }], max: 6 },
    },
    // the MCU itself keeps running on 3.3 V; what fails there is the analogue drive and gain (strong() above)
    mcu: { part: 'U1', rail: 'VCC', min: 2.5, needs: ['U1', 'Y1', 'U2', 'T'] },
    upload: { source: 'v5', needs: [], tool: 'none' },
  },
  mode: 'approach',
  modes: {
    approach: program('Hand coming closer'),
    wall: program('Wall at 30 cm'),
    cushion: program('Cushion at 40 cm (soft)'),
    open: program('Nothing in range'),
  },
  // the engine adds reverse polarity and too high or too low a voltage on each source
  faults: [['cold:J1.3', 'Cold joint on the Echo pin'], ['missing:R', 'Leave out the receiver'], 'missing:Y1', 'short:VCC:GND'],
  xr: {
    flow: [
      ['VCC', [[18.74, 1.25], [18.74, 6.2], [10.8, 6.2], [4.5, 10.1]], [[18.74, 6.2], [36.2, 6.2], [40.3, 9.1]]],
      ['TRIG', [[21.28, 1.25], [21.28, 10.1]]],
      ['ECHO', [[23.82, 10.1], [23.82, 1.25]]],
    ],
    notes: [['T', '40 kHz BURST OUT'], ['R', 'ECHO IN'], ['U1', 'TIMES THE ECHO'], ['U3', 'AMPLIFIER + COMPARATOR']],
  },
  tags: [['T', -40, -30], ['R', 40, -30], ['Y1', 0, -44], ['J1', -30, 34]],
  elec: {
    pins: { VCC: { role: 'supply', range: [4.5, 5.5], max: 6, mA: 15 }, GND: { role: 'gnd' },
      TRIG: { role: 'in', pullup: { ohms: 10000, to: 'VCC' }, note: 'a HIGH of 10 µs or more starts a ping' },
      ECHO: { role: 'out', rail: 'VCC', pullup: { ohms: 10000, to: 'VCC' }, note: 'HIGH for the round trip, 58 µs per cm; 5 V, so divide it for a 3.3 V board' } },
    ranging: { usPerCm: 58, cm: [2, 400], timeoutUs: 38000, cycleMs: 60, burst: { hz: 40000, cycles: 8 } },
  },
});
})();
