// @cf title PCA9685 16-channel servo driver
// @cf use engine/bench.list
/* Adafruit 16-Channel 12-bit PWM/Servo Driver, product 815, board rev C (docs/facts/pca9685.md). Every position is the
   part centre from Adafruit's Eagle file ("Adafruit PCA9685 rev C.brd", origin moved to the outline's bottom-left
   corner): a 62.23 x 25.40 mm blue board, corners r 3.175, four 2.5 mm plated holes. Bottom edge: the four 3 x 4 servo
   header blocks (channels 0-15, each column PWM / V+ / GND from the chip side); top edge: the blue V+/GND terminal, the
   AOD417 P-MOSFET that protects it, the empty footprint for a bulk capacitor (C2) and the six address jumpers; the 6-pin
   I2C header on the left edge (V+, VCC, SDA, SCL, OE, GND from the bottom), the same pads unfitted on the right edge for
   chaining. The SMD side ships assembled; the kit's loose parts are the 1x6 header, four 3x4 blocks and the terminal.
   No capacitor comes in the kit: this bench fits a 470 µF 10 V electrolytic in C2, as Adafruit's guide asks
   (about 100 µF per servo).
   How it works (NXP PCA9685 datasheet rev 4): the chip has its own 25 MHz RC oscillator, a prescaler and sixteen 12-bit
   ON/OFF counters. The host writes each channel's counts once over I2C and the chip keeps making the pulses, so two wires
   run 16 servos. It powers up asleep (MODE1 SLEEP, every output LOW); the library's begin() wakes it at 1000 Hz and
   setPWMFreq(50) sets the 20 ms servo frame: prescale round(25 MHz / (4096 x 50)) - 1 = 121, one tick 4.88 µs, so
   1500 µs is 307 ticks. One frequency for all 16 channels. VCC (logic, 3-5 V) and V+ (servo power, 6 V max) are not
   connected on the board; V+ comes in on the terminal through Q1 (drain on the input, gate to GND), so a reversed
   pack only turns Q1 off. The side-header V+ pins are after Q1 and unprotected. 220 Ω in every output; 10 kΩ pull-ups
   on SDA and SCL to VCC; the address is 0x40 plus the bridged jumpers (open = 0), and every board also answers the
   All Call address 0x70. The green LED says VCC is there, nothing about V+. */
(() => {
const B = SL.bench;
const PAL = 'blush';                                // src/content/ids.ts ROBOTICS.pca9685.palette
const OSC = 25e6;
const prescale = hz => Math.max(3, Math.min(255, Math.round(OSC / (4096 * hz)) - 1));
const frameHz = hz => OSC / (4096 * (prescale(hz) + 1));
const ticksOf = (us, hz) => Math.round(us * frameHz(hz) * 4096 / 1e6);
const US0 = 600, US1 = 2400;                         // SG90 0° and 180° (the libraries' range, 10 µs a degree)
const usOf = deg => US0 + Math.max(0, Math.min(180, deg)) / 180 * (US1 - US0);
const degOf = us => (us - US0) / (US1 - US0) * 180;
const COL_X = [6.985, 9.525, 12.065, 14.605, 19.685, 22.225, 24.765, 27.305, 34.925, 37.465, 40.005, 42.545, 47.625, 50.165, 52.705, 55.245];
const HDR_Y = [6.477, 9.017, 11.557, 14.097, 16.637, 19.177];
const SJ_X = [53.594, 51.054, 48.514, 45.974, 43.434, 40.894];     // A0 (rightmost) to A5

// the chip as the host programs it: { hz, us[16] (0 = no pulses), asleep, addr }. A bench's model writes st.pca; the
// module page's own programs below fill it in otherwise.
const OFF16 = () => Array(16).fill(0);
const addrOf = st => 0x40 + ((st.faults || []).includes('addr-a0') ? 1 : 0);
B.pca9685 = { prescale, frameHz, ticksOf, usOf, degOf, US0, US1, COL_X, addrOf };

// a 0603 x 4 convex resistor array: black body, four tinned terminations along each long side
B.kind('pca9685-array', {
  group: 'smd', size: () => [3.2, 1.6], h: .45,
  draw(ctx){
    const p = ctx.p, [l, w] = p.size, h = p.h;
    let s = '';
    for (let i = 0; i < 4; i++){ const a = (i - 1.5) * .8;
      s += ctx.slab(a - .22, w / 2 - .32, a + .22, w / 2, 0, h * .8, B.M.tin, toneI, .3) + ctx.slab(a - .22, -w / 2, a + .22, -w / 2 + .32, 0, h * .8, B.M.tin, toneI, .3); }
    s += ctx.slab(-l / 2, -w / 2 + .3, l / 2, w / 2 - .3, 0, h, { l: '#3c3935', m: '#2c2a27', d: '#1c1b19' }, toneI, .45);
    if (p.label) s += ctx.text(0, -.25, h + .01, p.label, .55, '#e8e2d2');
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), s);
  },
});

// an address solder jumper: two bare gold pads (VCC above, the address pin below); bridged it carries a solder blob
B.kind('pca9685-sj', {
  group: 'smd', size: () => [1.6, 3.3], h: .05,
  draw(ctx){
    const p = ctx.p, bridged = p.id === 'SJ_A0' && (ctx.st.faults || []).includes('addr-a0');
    let s = ctx.poly([[-.58, .25], [.58, .25], [.58, 1.55], [-.58, 1.55]], .03, B.M.gold.l, .3) + ctx.poly([[-.58, -1.55], [.58, -1.55], [.58, -.25], [-.58, -.25]], .03, B.M.gold.l, .3);
    if (bridged) s += ctx.slab(-.6, -1.2, .6, 1.2, .03, .55, B.M.tin, toneI, .4);
    ctx.put(ctx.B(-.8, -1.65, 0, .8, 1.65, bridged ? .6 : .06), s);
  },
});

// the blue 2-way rising-clamp terminal, 3.5 mm pitch, wire entries facing the top edge (+y)
B.kind('pca9685-term', {
  group: 'tall', size: () => [7, 7], h: 8.5,
  pins: p => [-1.75, 1.75].map(a => [p.at[0] + a * Math.cos((p.rot || 0) * Math.PI / 180), p.at[1] + a * Math.sin((p.rot || 0) * Math.PI / 180)]),
  draw(ctx){
    const p = ctx.p, h = p.h, BLUE = B.mat('#2f6fc4');
    let s = ctx.slab(-3.5, -3.5, 3.5, 3.5, 0, h * .6, BLUE, toneI, .8) + ctx.slab(-3.5, -3.5, 3.5, 1.2, h * .6, h, BLUE, toneI, .8);
    for (const a of [-1.75, 1.75]){
      s += ctx.slab(a - 1.2, 3.5 - .02, a + 1.2, 3.5 + .25, 1, 4, B.mat('#1d2c44'), toneI, .4);
      s += ctx.cyl(a, -1.2, h, h + .3, 1.25, B.M.steel, toneI, .6) + ctx.line([[a - .9, -1.2, h + .32], [a + .9, -1.2, h + .32]], .45, '#5b6266');
    }
    ctx.put(ctx.B(-3.5, -3.5, 0, 3.5, 3.6, h + .3), s);
  },
  xrLabel: () => 'SCREW CLAMPS',
});

// U1: the TSSOP-28, and in see-through its die: the oscillator, the prescaler and sixteen output stages, each lit while
// its channel sends pulses (brighter for a longer pulse)
B.kind('pca9685-tssop', {
  group: 'smd', size: () => [9.7, 4.4], h: 1.1,
  draw: ctx => B.kinds.soic.draw(ctx),
  xr(ctx){
    const p = ctx.p, [l, w] = p.size, h = p.h, k = ctx.k, pca = ctx.st.pca || { us: OFF16(), hz: 0 };
    const run = ctx.st.ev && ctx.st.ev.status === 'running', DIE = B.mat('#7d86ad'), ON = '#ffd34d', OFFC = '#454b6a';
    let s = ctx.slab(-l * .36, -w * .32, l * .36, w * .32, h * .45, h * .55, DIE, toneI, .5);
    // the RC oscillator at the top of the die: a ring that pulses while the chip is awake
    const osc = run && pca.hz > 0 && !pca.asleep;
    s += ctx.disc(-l * .28, 0, h * .56, .45, osc ? ON : OFFC, .25);
    for (let i = 0; i < 16; i++){
      const side = i < 8 ? -1 : 1, j = i < 8 ? i : 15 - i, a = -l * .2 + j * l * .06, us = run ? pca.us[i] || 0 : 0;
      const lit = us > 0 ? Math.min(1, .35 + us / 2600) : 0;
      s += ctx.slab(a - .2, side * w * .08, a + .2, side * w * .26, h * .56, h * .6, B.mat(lit ? mix(OFFC, ON, lit) : OFFC), toneI, .25);
      if (lit) s += ctx.glow(a, side * w * .17, h * .62, .7, ON, .3 * lit * k);
    }
    for (let i = 0; i < 14; i++){ const a = (i - 6.5) * .65;
      for (const sy of [-1, 1]) s += `<path d="${pd([ctx.W(a * .55, sy * w * .32, h * .55), ctx.W(a * .8, sy * w * .42, h * .78), ctx.W(a, sy * (w / 2 + .3), h * .3)], false)}" fill="none" stroke="#e8c36a" stroke-width=".25"/>`; }
    ctx.put(ctx.B(-l / 2, -w / 2, h + .01, l / 2, w / 2, h + .03), `<g opacity="${f(k)}">${s}</g>`);
  },
  xrLabel: () => '16 PWM COUNTERS',
});

// the module page's own programs: what a Nano sketch makes the chip do
const program = (title, fill, serial) => ({ title, instant: true, bytes: 0, out: () => ({}), fill, serial });
const servo = deg => Array.from({ length: 16 }, (_, i) => (i < 3 ? usOf(deg) : 0));
const sweepDeg = t => { const u = (t % 6) / 3; return 180 * (u < 1 ? u : 2 - u); };
const modes = {
  centre: program('Centre the servos (1500 µs)', () => ({ hz: 50, us: servo(90) }), k => (k === 0 ? 'ch0-2: writeMicroseconds(1500) at 50 Hz: 307 ticks of 4.88 us' : null)),
  sweep: program('Sweep channel 0', st => { const us = servo(90); us[0] = usOf(sweepDeg(st.t)); return { hz: 50, us }; },
    (k, st) => 'ch0 ' + Math.round(usOf(sweepDeg(st.t))) + ' us'),
  asleep: program('Never begun (asleep)', () => ({ hz: 0, us: OFF16(), asleep: true }), k => (k === 0 ? 'no begin(): MODE1 SLEEP is set, every output stays LOW' : null)),
  scan: program('I2C scan', () => ({ hz: 0, us: OFF16(), asleep: true }), (k, st) => (k % 2 === 0 ? `I2C device found at address 0x${addrOf(st).toString(16)} !` : 'I2C device found at address 0x70 ! (All Call)')),
};

// a cold joint on SDA (JP3 pin 3): some writes never arrive, so the outputs keep the counts from before
const coldSda = st => (st.faults || []).includes('cold:JP3.3') && Math.floor(st.t * 3.3) % 3 === 0;
function model(st){
  const md = modes[st.mode], run = st.ev && st.ev.status === 'running' && st.t >= 0;
  const want = run && md ? md.fill(st) : { hz: 0, us: OFF16(), asleep: true };
  const prev = st.pcaHold || want;
  st.pca = addrOf(st) !== 0x40 && run ? { hz: 0, us: OFF16(), asleep: true } : coldSda(st) ? prev : want;
  st.pcaHold = st.pca;
  const pca = st.pca, live = !!st.power;
  let status = 'Unpowered';
  if (live && st.ev.status === 'fault') status = 'Fault: unplug and repair';
  else if (live && !run) status = 'Powered, chip asleep';
  else if (run && pca.asleep) status = addrOf(st) !== 0x40 ? 'No answer at 0x40: the board is at 0x41' : 'Asleep: every output LOW';
  else if (run) status = ['{hz} Hz frame, ch0 {us} µs', { hz: Math.round(frameHz(pca.hz) * 10) / 10, us: Math.round(pca.us[0]) }];
  return {
    status,
    stats: live && run && !pca.asleep ? [['Frame', (1000 / frameHz(pca.hz)).toFixed(2) + ' ms'], ['Ch 0', Math.round(pca.us[0]) + ' µs · ' + ticksOf(pca.us[0], pca.hz) + ' ticks']] : [],
    report: { pwm: { hz: run && !pca.asleep ? Math.round(frameHz(pca.hz) * 100) / 100 : 0, us: pca.us.slice(0, 4).map(Math.round) } },
    flow: { SDA: run, SCL: run, PWM0: run && pca.us[0] > 0, PWM1: run && pca.us[1] > 0, PWM2: run && pca.us[2] > 0 },
  };
}

const column = n => ['PWM' + n, 'V+', 'GND'];
const block = (id, c0, x, name) => ({ id, kind: 'male', name, short: `CH ${c0}-${c0 + 3}`, at: [x, 3.937], rows: 3, h: 8.5,
  pins: [0, 1, 2, 3].flatMap(i => column(c0 + i)) });

B.module({
  id: 'pca9685', fig: '08', pal: PAL,
  name: 'PCA9685 16-channel servo driver',
  sub: 'Sixteen 12-bit PWM outputs on two I2C wires (0x40): servo pulses at 50 Hz with no CPU time',
  pcb: { w: 62.23, h: 25.4, thick: 1.6, r: 3.175, color: '#1f4fa8', silk: '#f2f4f6', standoff: 4 },
  mat: { front: 8, back: 8, left: 8, right: 8 },
  height: 14, logic: 5,
  holes: [[3.175, 3.175, 2.5], [3.175, 22.225, 2.5], [59.055, 3.175, 2.5], [59.055, 22.225, 2.5]],
  silk: [
    [15.9, 15.75, 'PCA9685', 1.27], [15.6, 13.85, '16 x 12-bit PWM', 1.0], [23.3, 11.2, 'adafruit!', .9], [24.3, 16.5, 'POWER', .8],
    [12.1, 18.4, 'C2', 1.0], [27.0, 21.3, 'V+', .9, 90], [35.5, 21.6, 'GND', .9, 90],
    [45.1, 15.2, 'I2C Address', 1.0], [44.6, 13.8, '(Open=0/Closed=1)', .75],
    ...SJ_X.map((x, i) => [x, 20.6, 'A' + i, .75]), [38.4, 20.6, '1+', .75], [55.5, 20.6, '+RW', .7],
    ...COL_X.map((x, i) => [x, 8.4, String(i), .8]),
    [31.1, 6.4, 'PWM', .85], [31.1, 3.9, 'V+', .85], [31.1, 1.4, 'GND', .85],
    ...['V+', 'VCC', 'SDA', 'SCL', 'OE', 'GND'].map((t, i) => [4.4, HDR_Y[i] - .3, t, .75]),
    ...['V+', 'VCC', 'SDA', 'SCL', 'OE', 'GND'].map((t, i) => [57.8, HDR_Y[i] - .3, t, .75, 180]),
  ],
  traces: [
    [[1.905, 11.557], [5.4, 11.557], [7.4, 17.4], [26.8, 17.4], [27.6, 16.53]], [[1.905, 14.097], [5.2, 14.097], [6.8, 16.6], [26.6, 16.6], [27.6, 15.88]],
    [[1.905, 9.017], [5.6, 9.017], [8.684, 14.415], [26.4, 18.3], [35.3, 18.3], [35.3, 17.18], [34.03, 17.18]],
    [[29.315, 21.59], [24.9, 21.66], [16.0, 21.66], [13.589, 21.209]], [[15.66, 19.375], [15.66, 18.6], [3.8, 18.6], [3.2, 5.1], [58.4, 5.1]],
    [[28.2, 13.93], [24.4, 12.6], [12.7, 11.6], [6.985, 6.477]], [[28.2, 13.28], [24.6, 12.1], [13.3, 11.2], [9.525, 6.477]], [[28.2, 12.63], [24.8, 11.6], [14.0, 10.8], [12.065, 6.477]],
    [[34.03, 8.73], [36.6, 9.6], [45.5, 10.7], [47.625, 6.477]], [[34.03, 9.38], [36.3, 10.3], [44.0, 10.9], [42.545, 6.477]],
  ],
  parts: [
    { id: 'U1', kind: 'pca9685-tssop', name: 'PCA9685PW 16-channel 12-bit PWM controller (TSSOP-28)', short: 'PCA9685', at: [31.115, 12.954], size: [9.7, 4.4], rot: 270, h: 1.1, n: 14, pitch: .65,
      label: 'PCA9685PW', nets: { 23: 'OE', 26: 'SCL', 27: 'SDA', 28: 'VCC', 14: 'GND', 6: 'PWM0', 7: 'PWM1', 8: 'PWM2', 9: 'PWM3' } },
    { id: 'Q1', kind: 'sot223', name: 'AOD417 P-channel MOSFET: reverse-polarity protection on V+', short: 'PROTECT FET', at: [20.46, 21.655], size: [6.6, 6.1], rot: 270, h: 2.3, label: 'D417' },
    { id: 'C1', kind: 'chip', name: '10 µF capacitor on VCC (the only capacitor fitted)', at: [8.684, 14.415], rot: 270, size: [2, 1.25], h: 1.25, cap: true },
    { id: 'R7', kind: 'chip', name: '10 kΩ OE pull-down (outputs enabled)', at: [6.858, 20.764], rot: 90, size: [2, 1.25], h: .5 },
    { id: 'R10', kind: 'chip', name: '470 Ω resistor for the power LED', at: [37.338, 18.796], rot: 270, size: [2, 1.25], h: .5 },
    { id: 'LED1', kind: 'led', name: 'Green power LED (VCC only, says nothing about V+)', short: 'POWER LED', at: [37.338, 22.987], rot: 270, size: [2, 1.25], h: .8,
      led: { color: '#43d06a', rail: 'VCC', via: ['R10'] } },
    { id: 'R13', kind: 'pca9685-array', name: '4 x 220 Ω in outputs 0-3', short: '220 Ω', at: [11.43, 10.795], rot: 180, label: '221' },
    { id: 'R11', kind: 'pca9685-array', name: '4 x 220 Ω in outputs 4-7', at: [17.78, 10.795], rot: 180, label: '221' },
    { id: 'R14', kind: 'pca9685-array', name: '4 x 220 Ω in outputs 8-11', at: [45.466, 10.668], rot: 180, label: '221' },
    { id: 'R12', kind: 'pca9685-array', name: '4 x 220 Ω in outputs 12-15', at: [53.086, 10.668], rot: 180, label: '221' },
    { id: 'R1', kind: 'pca9685-array', name: '4 x 10 kΩ pull-downs on A2-A5', at: [44.069, 18.161], label: '103' },
    { id: 'R2', kind: 'pca9685-array', name: '4 x 10 kΩ: pull-downs on A0, A1, pull-ups on SDA and SCL', short: 'I2C PULL-UPS', at: [51.054, 18.161], label: '103' },
    ...SJ_X.map((x, i) => ({ id: 'SJ_A' + i, kind: 'pca9685-sj', name: `Address jumper A${i} (open = 0, bridged = 1)`, short: 'A' + i, at: [x, 23.082], fixed: true })),
    { id: 'JP4', kind: 'pads', name: 'Chain-out pads (V+, VCC, SDA, SCL, OE, GND), no header fitted', short: 'CHAIN OUT', at: [60.325, 12.827], rot: 90, d: 1.6, fixed: true,
      pins: ['V+', 'VCC', 'SDA', 'SCL', 'OE', 'GND'] },
    { id: 'JP3', kind: 'male', name: 'I2C header: V+, VCC, SDA, SCL, OE, GND', short: 'I2C HEADER', at: [1.905, 12.827], rot: 90, h: 8.5,
      pins: ['V+', 'VCC', 'SDA', 'SCL', 'OE', 'GND'] },
    block('JP2', 0, 10.795, 'Servo header, channels 0-3 (PWM, V+, GND)'),
    block('JP1', 4, 23.495, 'Servo header, channels 4-7'),
    block('JP6', 8, 38.735, 'Servo header, channels 8-11'),
    block('JP5', 12, 51.435, 'Servo header, channels 12-15'),
    { id: 'J1', kind: 'pca9685-term', name: 'V+ / GND screw terminal: servo power, reverse protected', short: 'V+ TERMINAL', at: [31.115, 21.59], h: 8.5,
      pins: ['V+', 'GND'], labels: ['V+', 'GND'] },
    { id: 'C2', kind: 'ecap', name: '470 µF 10 V capacitor on V+ (fitted by you, not in the kit)', short: '470 µF', at: [11.811, 21.209], size: [8, 8], h: 12.5, rot: 270,
      sleeve: '#3a3a3e', polar: { fault: 'pop', rail: 'V+', opts: ['stripe (minus) to the left, + pad toward Q1', 'stripe to the right (backwards)'] } },
  ],
  power: {
    sources: {
      // one switch for the bench: VCC comes from the controller's 5 V whatever the servo pack is, V+ from the pack
      bench: { label: 'VCC 5 V from the controller, 4 x AA (6 V) on V+', part: 'J1', v: 6 },
    },
    default: 'bench',
    rails: {
      VCC: { from: [{ src: 'bench', via: ['JP3'], reg: 5, dropout: -20 }], max: 6 },
      'V+': { from: [{ src: 'bench', via: ['J1', 'Q1'], drop: .03 }] },
    },
    mcu: { part: 'U1', rail: 'VCC', min: 2.3, needs: ['U1', 'JP3'] },
    upload: { source: 'bench', needs: [], tool: 'none' },
  },
  mode: 'centre',
  modes,
  faults: [['addr-a0', 'Bridge the A0 jumper (address 0x41)'], ['cold:JP3.3', 'Cold joint on the SDA pin'], 'missing:C2', 'short:VCC:GND'],
  model,
  xr: {
    flow: [
      ['V+', [[29.315, 21.59], [24.9, 21.66], [16.0, 21.66], [13.589, 21.209]]],
      ['V+', [[15.66, 19.375], [15.66, 18.6], [3.8, 18.6], [3.2, 5.1], [58.4, 5.1]]],
      ['VCC', [[1.905, 9.017], [5.6, 9.017], [8.684, 14.415], [26.4, 18.3], [35.3, 18.3], [35.3, 17.18], [34.03, 17.18]]],
      ['SDA', [[1.905, 11.557], [5.4, 11.557], [7.4, 17.4], [26.8, 17.4], [27.6, 16.53]]],
      ['SCL', [[1.905, 14.097], [5.2, 14.097], [6.8, 16.6], [26.6, 16.6], [27.6, 15.88]]],
      ['PWM0', [[28.2, 13.93], [24.4, 12.6], [12.7, 11.6], [6.985, 6.477]]],
      ['PWM1', [[28.2, 13.28], [24.6, 12.1], [13.3, 11.2], [9.525, 6.477]]],
      ['PWM2', [[28.2, 12.63], [24.8, 11.6], [14.0, 10.8], [12.065, 6.477]]],
    ],
    notes: [['U1', '16 PWM COUNTERS'], ['Q1', 'REVERSE PROTECTION'], ['J1', 'SERVO POWER IN']],
  },
  tags: [['U1', 44, 28], ['J1', 36, -30], ['Q1', -30, -32], ['JP3', -46, 6], ['JP2', -36, 34], ['C2', -44, -20], ['LED1', 46, -14]],
  elec: {
    pins: { GND: { role: 'gnd' }, VCC: { role: 'supply', range: [3, 5.5], max: 6, mA: 12 }, 'V+': { role: 'supply', range: [4.8, 6], note: 'servo power only' },
      SDA: { role: 'i2c-sda', pullup: { ohms: 10000, to: 'VCC' } }, SCL: { role: 'i2c-scl', pullup: { ohms: 10000, to: 'VCC' } },
      OE: { role: 'in', pulldown: { ohms: 10000 }, note: 'HIGH turns every output off' } },
    i2c: { addr: 0x40, alt: 0x70, note: 'asleep at power-up; begin() wakes it at 1000 Hz, setPWMFreq(50) for servos' },
  },
});
})();
