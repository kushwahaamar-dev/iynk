// @cf title TB6612FNG dual motor driver
// @cf use engine/bench.list
/* SparkFun Motor Driver - Dual TB6612FNG (1A), ROB-14451 / ROB-14450, board v1.1c. Every position is the part centre
   from SparkFun's Eagle file (SparkFun_Motor_Driver-TB6612FNG_v11c.brd, origin bottom-left, y up): a 20.32 mm square
   with sharp corners and no mounting holes (docs/facts/tb6612.md). The board carries only the Toshiba TB6612FNG
   (U1, SSOP24), 0.1 µF on VM (C1), 0.1 µF on VCC (C2) and a 10 µF tantalum on VM (C3, + band on the left). No LED,
   no resistor, no regulator, no reverse-polarity protection. JP1 (left) is VM, VCC, GND and the motor outputs; JP2
   (right) is PWMA, AIN2, AIN1, STBY, BIN1, BIN2, PWMB, GND. The headers are soldered with the long pins up, for
   female jumper wires.
   Electrical model (Toshiba datasheet): each channel is an H-bridge of four LDMOS switches. IN1/IN2 pick forward,
   reverse, short brake or stop; PWM high drives, PWM low short-brakes (slow decay), so speed follows duty. STBY low
   (or floating: every input has a 200 kΩ pull-down) turns every output off. The bridge drop is I x 0.5 Ω (both
   switches, typical): 0.15 V at 0.3 A, 0.5 V at 1 A. VM 2.5-13.5 V (15 V absolute), VCC 2.7-5.5 V, UVLO on VCC
   1.9 V off / 2.2 V on. The modes below are the drive commands of Robotics Bench Fig 05; the bench inherits them. */
(() => {
const B = SL.bench;
const PAL = 'cobalt';                     // src/content/ids.ts ROBOTICS.tb6612fng.palette
const VBAT = 7.4, RON = 0.5;              // 2S LiPo nominal; upper + lower switch on-resistance, typical
const IRUN = 0.15;                        // TT gear motor running current at 6-7.4 V, light load (A)

// IN1, IN2, PWM duty, STBY -> what each of the four switches of one bridge does over a PWM period:
// [upper OUT1, upper OUT2, lower OUT1, lower OUT2] as on-fractions 0..1, and the drive sign (+1 CW, -1 CCW, 0 none)
const bridge = (in1, in2, pwm, stby) => {
  if (!stby) return { sw: [0, 0, 0, 0], dir: 0, brake: false };
  if (in1 && in2) return { sw: [0, 0, 1, 1], dir: 0, brake: true };
  if (in1) return { sw: [pwm, 0, 1 - pwm, 1], dir: pwm > 0 ? 1 : 0, brake: pwm <= 0 };
  if (in2) return { sw: [0, pwm, 1, 1 - pwm], dir: pwm > 0 ? -1 : 0, brake: pwm <= 0 };
  return { sw: [0, 0, 0, 0], dir: 0, brake: false };
};
B.tb6612 = { bridge, VBAT, RON, IRUN };

// a pin level from the program: the module's own net, or the controller pin wired to it (a bench's pinMap)
const level = (pins, net) => {
  if (pins[net] != null) return +pins[net] || 0;
  const map = (B.md && B.md.def.pinMap) || {};
  for (const [pin, to] of Object.entries(map)) if (to === net && pins[pin] != null) return +pins[pin] || 0;
  return 0;
};
B.tb6612.level = level;

// the drive outputs a command produces: pins for both channels plus the output levels (high fraction per lead)
const drive = (in1, in2, pwm, stby = 1) => {
  const a = bridge(in1, in2, pwm, stby);
  const hi = s => s.dir > 0 ? [pwm, 0] : s.dir < 0 ? [0, pwm] : [0, 0];
  const [o1, o2] = hi(a);
  return { STBY: stby, AIN1: in1, AIN2: in2, PWMA: pwm, BIN1: in1, BIN2: in2, PWMB: pwm, A01: o1, A02: o2, B01: o1, B02: o2 };
};
const D = n => n / 255;
const every3 = line => k => (k % 3 === 0 ? line : null);
const once = line => k => (k === 0 ? line : null);
const MSG_AWAKE = 'Logic on VCC, battery on VM: the driver is awake (STBY high)';

/* U1: the SSOP24 package, and in see-through the die with its two H-bridges, each switch lit while it conducts */
B.kind('tb6612fng-ssop', {
  group: 'smd',
  draw: ctx => B.kinds.soic.draw(ctx),
  xr(ctx){
    const p = ctx.p, [l, w] = p.size, h = p.h, k = ctx.k, st = ctx.st, o = ctx.o.o || { pins: {} };
    const run = st.ev && st.ev.status === 'running';
    const DIE = B.mat('#7d86ad'), ON = '#ffd34d', OFF = '#454b6a';
    let s = ctx.slab(-l * .36, -w * .3, l * .36, w * .3, h * .45, h * .55, DIE, toneI, .5);
    // bond wires: die edge to every lead (12 a side)
    for (let i = 0; i < 12; i++){
      const a = (i - 5.5) * .65;
      for (const sy of [-1, 1]) s += `<path d="${pd([ctx.W(a * .62, sy * w * .3, h * .55), ctx.W(a * .8, sy * w * .42, h * .78), ctx.W(a, sy * (w / 2 + .3), h * .3)], false)}" fill="none" stroke="#e8c36a" stroke-width=".3"/>`;
    }
    // bridge A sits by pins 1-6 (local a < 0 at rot 270), bridge B by pins 7-12
    const chans = [['A', -1, 'AIN1', 'AIN2', 'PWMA'], ['B', 1, 'BIN1', 'BIN2', 'PWMB']];
    for (const [, side, n1, n2, np] of chans){
      const stby = run ? level(o.pins, 'STBY') > .5 : false;
      const br = run ? bridge(level(o.pins, n1) > .5, level(o.pins, n2) > .5, level(o.pins, np), stby) : { sw: [0, 0, 0, 0] };
      const ca = side * l * .18, q = .42;
      const cells = [[-.8, .75], [.8, .75], [-.8, -.75], [.8, -.75]];
      cells.forEach(([da, db], i) => {
        const duty = br.sw[i], a0 = ca + da - q, b0 = db - q;
        s += ctx.slab(a0, b0, a0 + 2 * q, b0 + 2 * q, h * .55, h * .62, B.mat(duty > .02 ? mix(OFF, ON, Math.min(1, .35 + duty)) : OFF), toneI, .3);
        if (duty > .02) s += ctx.glow(ca + da, db, h * .64, 1.2 + duty, ON, .35 * duty * k);
      });
      // the motor leads between the two half-bridges
      s += ctx.line([[ca - .8, 0, h * .63], [ca + .8, 0, h * .63]], .5, '#e8c36a');
    }
    ctx.put(ctx.B(-l / 2, -w / 2, h + .01, l / 2, w / 2, h + .03), `<g opacity="${f(k)}">${s}</g>`);
  },
  xrLabel: () => 'TWO H-BRIDGES',
});

B.module({
  id: 'tb6612fng', fig: '05', pal: PAL,
  name: 'TB6612FNG dual motor driver',
  sub: 'Two MOSFET H-bridges: motors on VM 2.5-13.5 V, logic on VCC 2.7-5.5 V, 1.2 A per channel',
  pcb: { w: 20.32, h: 20.32, thick: 1.6, r: 0, color: '#c8363a', silk: '#f6f4ea', standoff: 0 },
  mat: { front: 5, back: 5, left: 5, right: 5 },
  height: 10, logic: 5,
  holes: [],
  silk: [
    ...[['VM', 19.05], ['VCC', 16.51], ['GND', 13.97], ['A01', 11.43], ['A02', 8.89], ['B02', 6.35], ['B01', 3.81], ['GND', 1.27]].map(([t, y]) => [5.1, y + .2, t, .62]),
    ...[['PWMA', 19.05], ['AI2', 16.51], ['AI1', 13.97], ['BI1', 8.89], ['BI2', 6.35], ['PWMB', 3.81], ['GND', 1.27]].map(([t, y]) => [15.45, y + .2, t, .62]),
    [15.45, 11.95, 'ST', .62], [15.45, 10.95, 'BY', .62],
    [10.0, 3.05, 'MOTOR', .95], [10.0, 1.55, 'DRIVER', .95],
    [7.55, 16.51, '|', 1.6],
  ],
  traces: [
    [[2.54, 11.43], [4.4, 11.43], [5.8, 12.14]], [[2.54, 8.89], [4.4, 8.89], [5.8, 9.54]], [[2.54, 6.35], [4.4, 6.35], [5.8, 8.24]], [[2.54, 3.81], [4.4, 3.81], [5.8, 5.64]],
    [[2.54, 13.97], [4.6, 13.2], [5.8, 10.84]], [[2.54, 19.05], [7.6, 19.05], [8.51, 16.51]], [[11.81, 16.51], [13.2, 14.6], [14.5, 12.47]], [[2.54, 16.51], [5.4, 15.2], [8.31, 13.97]],
    [[17.78, 19.05], [16.4, 17.4], [15.0, 12.4], [14.5, 11.82]], [[17.78, 16.51], [16.3, 14.6], [14.5, 11.17]], [[17.78, 13.97], [16.2, 12.0], [14.5, 10.52]],
    [[17.78, 11.43], [16.2, 10.0], [14.5, 9.22]], [[17.78, 8.89], [16.2, 8.3], [14.5, 7.92]], [[17.78, 6.35], [16.2, 6.9], [14.5, 7.27]], [[17.78, 3.81], [16.2, 5.0], [14.5, 6.62]],
  ],
  parts: [
    { id: 'U1', kind: 'tb6612fng-ssop', name: 'TB6612FNG dual H-bridge driver', short: 'DRIVER IC', at: [10.16, 8.89], size: [7.8, 5.6], rot: 270, h: 1.5, n: 12, pitch: .65,
      label: 'TB6612FNG', polar: { fault: 'hot', opts: ['pin 1 top left, as printed', 'turned round (backwards)'] },
      nets: { 1: 'A01', 2: 'A01', 3: 'GND', 4: 'GND', 5: 'A02', 6: 'A02', 7: 'B02', 8: 'B02', 9: 'GND', 10: 'GND', 11: 'B01', 12: 'B01',
        13: 'VM', 14: 'VM', 15: 'PWMB', 16: 'BIN2', 17: 'BIN1', 18: 'GND', 19: 'STBY', 20: 'VCC', 21: 'AIN1', 22: 'AIN2', 23: 'PWMA', 24: 'VM' } },
    { id: 'C1', kind: 'chip', name: '0.1 µF capacitor on VM', short: '0.1 µF', at: [11.43, 13.97], size: [1.0, .5], h: .5, cap: true },
    { id: 'C2', kind: 'chip', name: '0.1 µF capacitor on VCC', short: '0.1 µF', at: [8.89, 13.97], size: [1.0, .5], h: .5, cap: true },
    { id: 'C3', kind: 'tant', name: '10 µF tantalum capacitor on VM', short: '10 µF', at: [10.16, 16.51], size: [3.5, 2.8], h: 1.9, rot: 180,
      polar: { fault: 'pop', opts: ['band (+) on the left, toward VM', 'band (+) on the right (backwards)'] } },
    { id: 'JP1', kind: 'male', name: 'Power and motor header (VM, VCC, GND, A01, A02, B02, B01, GND)', short: 'MOTOR + POWER', at: [2.54, 10.16], rot: 90, h: 8.5,
      pins: ['GND', 'B01', 'B02', 'A02', 'A01', 'GND', 'VCC', 'VM'] },
    { id: 'JP2', kind: 'male', name: 'Control header (PWMA, AIN2, AIN1, STBY, BIN1, BIN2, PWMB, GND)', short: 'CONTROL PINS', at: [17.78, 10.16], rot: 270, h: 8.5,
      pins: ['PWMA', 'AIN2', 'AIN1', 'STBY', 'BIN1', 'BIN2', 'PWMB', 'GND'], labels: ['PWMA', 'AI2', 'AI1', 'STBY', 'BI1', 'BI2', 'PWMB', 'GND'] },
  ],
  power: {
    sources: {
      // one switch for both supplies, as on the bench: the controller's 5 V on VCC and the LiPo on VM.
      // VCC follows the controller, not the battery, so its feed ignores the battery voltage (dropout -20).
      bench: { label: 'Bench power: 5 V logic on VCC, 2S LiPo on VM', pin: 'VM', v: VBAT, range: [2.5, 13.5], max: 15 },
    },
    default: 'bench',
    rails: {
      VM: { from: [{ src: 'bench', via: ['JP1', 'U1'] }], max: 15 },
      VCC: { from: [{ src: 'bench', via: ['JP1'], reg: 5, dropout: -20 }], max: 6 },
    },
    mcu: { part: 'U1', rail: 'VCC', min: 2.2, needs: ['U1', 'JP2'] },
    upload: { source: 'bench', needs: [], tool: 'none' },
  },
  mode: 'fwd50',
  modes: {
    fwd50: { title: 'Forward 50%', instant: true, bytes: 2142, powerMsg: MSG_AWAKE, out: () => drive(1, 0, D(128)),
      serial: every3('AIN1=H AIN2=L PWMA=128 -> forward, ~3.7 V average') },
    fwd100: { title: 'Forward 100%', instant: true, bytes: 2142, powerMsg: MSG_AWAKE, out: () => drive(1, 0, D(255)),
      serial: every3('AIN1=H AIN2=L PWMA=255 -> forward, ~7.3 V at the motor') },
    rev: { title: 'Reverse', instant: true, bytes: 2130, powerMsg: MSG_AWAKE, out: () => drive(0, 1, D(160)),
      serial: every3('AIN1=L AIN2=H PWMA=160 -> reverse, ~4.6 V average') },
    brake: { title: 'Brake', instant: true, bytes: 2112, powerMsg: MSG_AWAKE, out: () => drive(1, 1, D(255)),
      serial: once('AIN1=H AIN2=H -> short brake: stopped hard') },
    coast: { title: 'Coast', instant: true, bytes: 2118, powerMsg: MSG_AWAKE, out: () => drive(0, 0, D(255)),
      serial: once('AIN1=L AIN2=L PWMA=H -> coast: outputs off, spinning down freely') },
    standby: { title: 'Standby (STBY low)', instant: true, bytes: 2104, powerMsg: 'Powered, but STBY is low: the whole chip sleeps', out: () => drive(1, 0, D(128), 0),
      serial: once('STBY=L -> standby: every output off, the chip draws under 1 uA') },
  },
  faults: ['missing:U1', 'missing:C3'],
  xr: {
    flow: [
      ['VM', [[2.54, 19.05], [7.6, 19.05], [8.51, 16.51], [11.81, 16.51], [13.2, 14.6], [14.5, 12.47]]],
      ['PWMA', [[17.78, 19.05], [16.4, 17.4], [15.0, 12.4], [14.5, 11.82]]],
      ['STBY', [[17.78, 11.43], [16.2, 10.0], [14.5, 9.22]]],
      ['PWMB', [[17.78, 3.81], [16.2, 5.0], [14.5, 6.62]]],
      ['A01', [[5.8, 12.14], [4.4, 11.43], [2.54, 11.43]]],
      ['A02', [[5.8, 9.54], [4.4, 8.89], [2.54, 8.89]]],
      ['B02', [[5.8, 8.24], [4.4, 6.35], [2.54, 6.35]]],
      ['B01', [[5.8, 5.64], [4.4, 3.81], [2.54, 3.81]]],
    ],
    notes: [['U1', 'TWO H-BRIDGES']],
  },
  tags: [['U1', 44, 30], ['JP1', -48, 14], ['JP2', 46, -22], ['C3', -36, -30]],
});
})();
