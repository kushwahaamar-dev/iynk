// @cf title L298N dual H-bridge module
// @cf use engine/bench.list
/* The common red L298N motor-driver module (sold as "L298N dual H-bridge", board marking HW-095), 43 x 43 mm,
   27 mm tall with its heatsink. The board is not documented by a maker, so positions are estimated from photos of
   the HW-095 and from the original Robotics Bench figure (±1 mm). What is on it and how it works:
   - U1: ST L298N in a Multiwatt15 package, bolted to a finned heatsink. Two full bridges of bipolar (Darlington-style)
     switches. Datasheet (ST L298, DocID 1773): VS 46 V operating (50 V absolute), VSS logic 4.5-7 V, 2 A DC per
     channel (2.5 A repetitive, 3 A for 100 µs), Ptot 25 W at Tcase 75 °C, Rth j-case 3 °C/W, junction -25..130 °C,
     overtemperature protection. Inputs TTL: low under 1.5 V, high over 2.3 V. Per channel: EN high and IN1 ≠ IN2
     drives, IN1 = IN2 is a fast stop (brake), EN low lets the motor run free. Saturation voltage, typical at 1 A:
     source 1.35 V + sink 1.2 V; at 2 A: 2.0 + 1.7 V. Here that is fitted as drop(I) = 1.4 + 1.15·I volts for the two
     conducting switches: 2.1 V at 0.6 A, 2.55 V at 1 A.
   - J1 (+12V, GND, +5V): the motor supply goes in on +12V (the L298's VS). With the 5V-EN jumper (JP5) on, the 78M05
     regulator U2 makes the logic 5 V from it and +5V is an output; the 78M05 needs about 2 V of headroom, so VS
     must stay above about 7 V. Off, the regulator is disconnected and +5V is an input for an outside 5 V supply.
     Makers say: jumper on only up to 12 V. The capacitors and the 78M05 are 35 V parts.
   - ENA / ENB jumper caps tie each enable to +5V (always on, full speed). Pull a cap and drive the enable pin from a
     PWM pin for speed; with the cap off and nothing wired the enable floats and the bridge does not run reliably.
   - D1-D8: the flyback diodes from each output to +12V and to GND (the datasheet asks for fast ones, trr ≤ 200 ns).
   - The current-sense pins are tied to GND (no sense resistors). No reverse-polarity protection anywhere. */
(() => {
const B = SL.bench;
const PAL = 'tomato';                       // src/content/ids.ts ROBOTICS.l298n.palette
const VBAT = 7.4;                           // 2S LiPo, nominal
const IRUN = 0.6;                           // one TT gear motor pushing a small robot (A), the original's figure
const RM = 3.0;                             // TT motor winding resistance (ohm): stall current at 7.4 V ≈ 1.45 A
const RSA = 12, RJC = 3, RCS = 1;           // heatsink to air (assumed for the stock fin), junction-case (datasheet), case-sink (°C/W)
const drop = i => i > 0 ? 1.4 + 1.15 * i : 0;

// a pin level from the program: the module's own net, or the controller pin a bench wires to it (def.pinMap)
const level = (pins, net) => {
  if (pins[net] != null) return +pins[net] || 0;
  const map = (B.md && B.md.def.pinMap) || {};
  for (const [pin, to] of Object.entries(map)) if (to === net && pins[pin] != null) return +pins[pin] || 0;
  return 0;
};

// one bridge: switches [upper OUT1, upper OUT2, lower OUT1, lower OUT2] as on-fractions, drive sign, current, heat
const OFF = { sw: [0, 0, 0, 0], dir: 0, brake: false, duty: 0, i: 0, v: 0, w: 0, drop: 0 };
const bridge = (in1, in2, en, vs, stalled) => {
  if (en <= .02 || vs <= .5) return OFF;
  const a = in1 > .5, b = in2 > .5;
  if (a === b) return { ...OFF, brake: true, sw: a ? [en, en, 0, 0] : [0, 0, en, en] };
  const ion = stalled ? Math.max(0, vs - 1.4) / (RM + 1.15) : IRUN, dv = drop(ion), d = Math.min(1, en);
  return { sw: a ? [d, 0, 0, d] : [0, d, d, 0], dir: a ? 1 : -1, brake: false, duty: d, i: d * ion, v: d * Math.max(0, vs - dv), w: d * ion * dv, drop: dv };
};

// the whole module from the figure state: what each motor gets and what the chip turns into heat
const model = st => {
  const ev = st.ev || {}, run = ev.status === 'running' && !st.up && st.t >= 0, pins = (st.o && st.o.pins) || {};
  const vs = (ev.rails && ev.rails.VS) || 0, faults = st.faults || [];
  const fitted = id => B.isSet(id) && !faults.includes('cold:' + id);
  const burst = (id, t) => faults.includes('cold:' + id) && Math.floor(t * 3.3 + id.length) % 3 === 0;
  const en = (cap, net) => B.isSet(cap) ? 1 : level(pins, net);
  // overtemperature protection: a stalled bridge cooks the chip, which cuts its outputs, cools and tries again
  const hot = faults.includes('stall') && st.t > 6 && (st.t - 6) % 5 > 3;
  const ok = run && !hot && fitted('U1');
  const A = ok && B.isSet('J2') && !burst('J2', st.t) ? bridge(level(pins, 'IN1'), level(pins, 'IN2'), en('JPA', 'ENA'), vs, faults.includes('stall')) : OFF;
  const Bm = ok && B.isSet('J3') && !burst('J3', st.t) ? bridge(level(pins, 'IN3'), level(pins, 'IN4'), en('JPB', 'ENB'), vs, faults.includes('stall')) : OFF;
  const w = A.w + Bm.w;
  return { run, vs, A, B: Bm, w, sinkC: 25 + w * RSA, junctionC: 25 + w * (RSA + RJC + RCS), hot,
    v5: (ev.rails && ev.rails['5V']) || 0, iBatt: A.i + Bm.i + (vs > .5 ? .05 : 0) };
};
B.l298n = { model, bridge, level, drop, VBAT, IRUN, RM, RSA };

/* ---------- kinds ---------- */
const BLUE = B.mat('#2f6fc4'), SINK = B.mat('#34322f'), PLASTIC = B.M.blackPl;

// U1: the Multiwatt15 package standing in front of its heatsink; legs staggered into the board in two rows
B.kind('l298n-multiwatt', {
  group: 'tall',
  size: () => [27, 13.5], h: 25,
  pins: p => Array.from({ length: 15 }, (_, i) => { const r = (p.rot || 0) * Math.PI / 180, a = (i - 7) * 1.27, b = -p.size[1] / 2 + (i % 2 ? 1.2 : 3.2);
    return [p.at[0] + a * Math.cos(r) - b * Math.sin(r), p.at[1] + a * Math.sin(r) + b * Math.cos(r)]; }),
  draw(ctx){
    const p = ctx.p, [l, w] = p.size, h = p.h, b0 = -w / 2, sinkB = b0 + 6.2;
    // the heatsink: a base plate against the chip's tab and nine fins running front to back
    let s = ctx.slab(-l / 2, sinkB, l / 2, sinkB + 2.2, 0, h, SINK, toneI, .8);
    for (let i = 0; i < 9; i++){ const a = -l / 2 + .4 + i * (l - 1.6) / 8; s += ctx.slab(a, sinkB + 2.2, a + .8, w / 2, 0, h, SINK, toneI, .55); }
    // in see-through the sink and the plastic fade so the die inside shows
    const ghost = svg => ctx.k > 0 ? `<g opacity="${f(1 - .7 * ctx.k)}">${svg}</g>` : svg;
    ctx.put(ctx.B(-l / 2, sinkB, 0, l / 2, w / 2, h), ghost(s));
    // the metal tab against the sink (its top shows above the plastic, with the bolt), then the plastic body
    const body = ctx.slab(-10.2, sinkB - .3, 10.2, sinkB, 4.6, 17.4, B.M.steel, toneI, .5)
      + ctx.cyl(0, sinkB - .25, 15.6, 16.4, 1.6, B.M.steel, toneI, .5)
      + ctx.slab(-9.8, sinkB - 4.6, 9.8, sinkB - .3, 5, 15.2, PLASTIC, toneI, .75);
    let legs = '';
    for (let i = 0; i < 15; i++){ const a = (i - 7) * 1.27, bb = b0 + (i % 2 ? 1.2 : 3.2);
      legs += ctx.rod([a, sinkB - 2.4, 5.2], [a, bb, 3.2], .28, B.M.tin, toneI, .45) + ctx.rod([a, bb, 3.2], [a, bb, 0], .28, B.M.tin, toneI, .45); }
    ctx.put(ctx.B(-10.2, b0, 0, 10.2, sinkB, 17.4), legs + ghost(body + ctx.text(0, sinkB - 2.45, 15.25, 'L298N', 1.7)));
    // heat: shimmer rising off the fins while the bridges dissipate
    const m = model(ctx.st);
    if (m.w > .05 && !ctx.k){
      const t = ctx.st.t || 0, amp = Math.min(1, m.w / 3);
      let wav = '';
      for (let k = 0; k < 4; k++){
        const a = -l / 2 + 3 + k * (l - 6) / 3, pts = [];
        for (let i = 0; i < 11; i++) pts.push(ctx.W(a + Math.sin(.9 * i + 5 * t + 1.7 * k) * 1.1, 0, h + 2 + i * 1.4 * (0.6 + amp)));
        wav += `<path d="${pd(pts, false)}" fill="none" stroke="#fff4d6" stroke-width="1.3" stroke-linecap="round" opacity="${f(.45 + .2 * Math.sin(2 * t))}"/>`;
      }
      ctx.put(ctx.B(-l / 2, -w / 2, h, l / 2, w / 2, h + 20), wav);
    }
  },
  xr(ctx){
    // the die: two bridges of four bipolar switches each, lit while they conduct; the motor leads between them
    const p = ctx.p, k = ctx.k, sinkB = -p.size[1] / 2 + 6.2, m = model(ctx.st), ONC = '#ffd34d', OFFC = '#5a4f4a';
    let s = ctx.slab(-6, sinkB - 3.4, 6, sinkB - 1.4, 9.6, 10.6, B.mat('#8c95b8'), toneI, .5);
    [[m.A, -3], [m.B, 3]].forEach(([br, ca]) => {
      [[-1.1, .8], [1.1, .8], [-1.1, -.8], [1.1, -.8]].forEach(([da, dz], i) => {
        const duty = br.sw[i];
        s += ctx.slab(ca + da - .7, sinkB - 3.6, ca + da + .7, sinkB - 3.4, 10.1 + dz - .55, 10.1 + dz + .55, B.mat(duty > .02 ? mix(OFFC, ONC, Math.min(1, .35 + duty)) : OFFC), toneI, .3);
        if (duty > .02) s += ctx.glow(ca + da, sinkB - 3.7, 10.1 + dz, 1.4 + duty, ONC, .35 * duty * k);
      });
    });
    ctx.put(ctx.B(-6.5, sinkB - 4.8, 9, 6.5, sinkB - 1, 11.4), `<g opacity="${f(k)}">${s}</g>`);
  },
  xrLabel: () => 'TWO BIPOLAR H-BRIDGES',
});

// a blue rising-clamp screw terminal, `n` ways at 5.0 mm, wire entries on the part's -y side
const termPins = p => Array.from({ length: p.pins.length }, (_, i) => { const r = (p.rot || 0) * Math.PI / 180, a = (i - (p.pins.length - 1) / 2) * 5;
  return [p.at[0] + a * Math.cos(r), p.at[1] + a * Math.sin(r)]; });
B.kind('l298n-term', {
  group: 'tall',
  size: p => [p.pins.length * 5, 7.5], h: 10,
  pins: termPins,
  draw(ctx){
    const p = ctx.p, n = p.pins.length, l = n * 5, w = 7.5, h = p.h;
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h * .55, BLUE, toneI, .8) + ctx.slab(-l / 2, -w * .05, l / 2, w / 2, h * .55, h, BLUE, toneI, .8);
    for (let i = 0; i < n; i++){
      const a = (i - (n - 1) / 2) * 5;
      s += ctx.slab(a - 1.7, -w / 2 - .02, a + 1.7, -w / 2 + .3, 1.2, 4.6, B.mat('#1d2c44'), toneI, .4);      // wire entry
      s += ctx.cyl(a, w * .22, h, h + .3, 1.6, B.M.steel, toneI, .6) + ctx.line([[a - 1.1, w * .22, h + .32], [a + 1.1, w * .22, h + .32]], .5, '#5b6266');
    }
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h + .3), s);
  },
  xrLabel: () => 'SCREW CLAMPS',
});

// a jumper cap pressed onto a 2-pin header (it shorts the two pins)
B.kind('l298n-jumper', {
  group: 'last',
  size: () => [5.08, 2.54], h: 6,
  draw(ctx){
    const s = ctx.slab(-2.4, -1.15, 2.4, 1.15, 0, 6, B.mat(ctx.p.color || '#2a2a2c'), toneI, .7) + ctx.slab(-1.9, -.6, 1.9, .6, 6, 6.05, B.mat('#58565a'), toneI, .3);
    ctx.put(ctx.B(-2.4, -1.15, 0, 2.4, 1.15, 6), s);
  },
  xrLabel: () => 'SHORTING CAP',
});

const fwdA = { IN1: 1, IN2: 0 }, revA = { IN1: 0, IN2: 1 }, fwdB = { IN3: 1, IN4: 0 }, revB = { IN3: 0, IN4: 1 };
// the input levels plus what the outputs do, so the see-through copper lights the leads that carry current
const outs = ins => () => {
  const o = { ...ins }, enA = B.isSet('JPA') ? 1 : +(ins.ENA || 0), enB = B.isSet('JPB') ? 1 : +(ins.ENB || 0);
  if (enA && ins.IN1 !== ins.IN2){ o.OUT1 = ins.IN1; o.OUT2 = ins.IN2; }
  if (enB && ins.IN3 !== ins.IN4){ o.OUT3 = ins.IN3; o.OUT4 = ins.IN4; }
  return o;
};
const every3 = line => k => (k % 3 === 0 ? line : null);
const once = line => k => (k === 0 ? line : null);

B.module({
  id: 'l298n', fig: '06', pal: PAL,
  name: 'L298N dual H-bridge module',
  sub: 'Two bipolar H-bridges: motors on +12V (5-35 V), 2 A per channel, about 2 V lost in the switches',
  pcb: { w: 43, h: 43, thick: 1.6, r: 1.5, color: '#c8282e', silk: '#f6f4ea', standoff: 4 },
  mat: { front: 10, back: 8, left: 12, right: 12 },
  height: 27, logic: 5,
  holes: [[3, 3, 3], [40, 3, 3], [3, 40, 3], [40, 40, 3]],
  silk: [
    [21.5, 28.2, 'L298N MODULE', 1.3], [4.2, 23.2, 'PWR', .9],
    [4.3, 9.2, 'OUT1', .85, 90], [4.3, 22.8, 'OUT2', .85, 90], [38.7, 9.2, 'OUT4', .85, 90], [38.7, 22.8, 'OUT3', .85, 90],
    [9.5, 9.1, '+12V', .9], [14.5, 9.1, 'GND', .9], [19.5, 9.1, '+5V', .9], [25, 10.4, '5V-EN', .8],
    [26.33, 6.6, 'ENA', .8], [28.87, 4.3, 'IN1', .75], [31.41, 4.3, 'IN2', .75], [33.95, 4.3, 'IN3', .75], [36.49, 4.3, 'IN4', .75], [39.87, 10.4, 'ENB', .8],
  ],
  traces: [
    [[9.5, 4.2], [9.5, 12], [12.5, 16]], [[12.5, 20], [12.5, 25.5], [21.5, 29.3]], [[24.4, 8.5], [27, 9], [27.5, 13.5]], [[32.5, 13.5], [32.5, 19.5], [22, 26], [22.8, 29.3]],
    [[4.25, 13.5], [9.6, 21], [17, 29.3]], [[4.25, 18.5], [12.4, 21], [18.3, 29.3]], [[38.75, 18.5], [29.2, 21], [26.1, 29.3]], [[38.75, 13.5], [26.4, 21], [24.8, 29.3]],
    [[28.87, 2.27], [28.87, 7], [20, 25], [19.6, 29.3]], [[31.41, 2.27], [31.41, 7.5], [22, 25.5], [21.6, 29.3]], [[33.95, 2.27], [33.95, 8], [24, 26], [23.5, 29.3]], [[36.49, 2.27], [36.49, 8.5], [26, 26.5], [25.4, 29.3]],
  ],
  parts: [
    { id: 'U2', kind: 'sot223', name: '78M05 5 V regulator (logic supply)', short: '5V REG', at: [30, 13.5], size: [6.5, 6.1], h: 2.3, rot: 90, label: '78M05' },
    ...[1, 2, 3, 4, 5, 6, 7, 8].map(n => ({ id: 'D' + n, kind: 'sod', name: `Flyback diode D${n} (${['OUT1 to +12V', 'GND to OUT1', 'OUT2 to +12V', 'GND to OUT2', 'OUT3 to +12V', 'GND to OUT3', 'OUT4 to +12V', 'GND to OUT4'][n - 1]})`,
      short: 'D' + n, at: [9.6 + 2.8 * (n - 1), 23.5], size: [4.3, 2.6], h: 2.1, rot: n % 2 ? 90 : 270 })),
    { id: 'LED1', kind: 'led', name: 'Power LED (+5V)', short: 'PWR LED', at: [3, 25.5], rot: 90, led: { color: '#e8392e', rail: '5V', via: ['R1'] } },
    { id: 'R1', kind: 'chip', name: 'Power LED resistor', at: [3, 28.6], rot: 90, size: [2, 1.25], h: .5 },
    { id: 'C3', kind: 'chip', name: '100 nF capacitor on +12V (VS)', at: [36.2, 26.5], rot: 90, size: [2, 1.25], h: .8, cap: true },
    { id: 'C4', kind: 'chip', name: '100 nF capacitor on +5V (VSS)', at: [38.8, 26.5], rot: 90, size: [2, 1.25], h: .8, cap: true },
    { id: 'C1', kind: 'ecap', name: '220 µF 35 V capacitor on +12V', short: '220 µF', at: [12.5, 16], size: [8, 8], h: 11, group: 'low',
      polar: { fault: 'pop', opts: ['stripe (minus) to the front, as printed', 'stripe to the back (backwards)'] } },
    { id: 'C2', kind: 'ecap', name: '220 µF 35 V capacitor on +5V', short: '220 µF', at: [21.5, 16], size: [8, 8], h: 11, group: 'low',
      polar: { fault: 'pop', opts: ['stripe (minus) to the front, as printed', 'stripe to the back (backwards)'] } },
    { id: 'J4', kind: 'male', name: 'Control header IN1-IN4', short: 'CONTROL', at: [32.68, 2.27], h: 8.5, pins: ['IN1', 'IN2', 'IN3', 'IN4'] },
    { id: 'JEA', kind: 'male', name: 'ENA header (enable A and +5V)', short: 'ENA', at: [26.33, 3.54], rot: 90, h: 8.5, pins: ['ENA', '5V'] },
    { id: 'JEB', kind: 'male', name: 'ENB header (enable B and +5V)', short: 'ENB', at: [39.87, 7.54], rot: 90, h: 8.5, pins: ['ENB', '5V'] },
    { id: 'JE5', kind: 'male', name: '5V-EN header (+12V to the regulator input)', short: '5V-EN', at: [25, 8.5], h: 8.5, pins: ['VS', 'REGIN'] },
    { id: 'U1', kind: 'l298n-multiwatt', name: 'L298N dual H-bridge on its heatsink', short: 'L298N', at: [21.5, 36.25], size: [27, 13.5], h: 25,
      pins: ['GND', 'OUT1', 'OUT2', 'VS', 'IN1', 'ENA', 'IN2', 'GND', '5V', 'IN3', 'ENB', 'IN4', 'OUT3', 'OUT4', 'GND'],
      labels: ['SENSE A', 'OUT1', 'OUT2', 'VS', 'IN1', 'ENA', 'IN2', 'GND', 'VSS', 'IN3', 'ENB', 'IN4', 'OUT3', 'OUT4', 'SENSE B'] },
    { id: 'J1', kind: 'l298n-term', name: 'Power terminal +12V / GND / +5V', short: 'POWER IN', at: [14.5, 4.25], pins: ['VS', 'GND', '5V'], labels: ['+12V', 'GND', '+5V'] },
    { id: 'J2', kind: 'l298n-term', name: 'Motor A terminal (OUT1, OUT2)', short: 'MOTOR A', at: [4.25, 16], rot: 270, pins: ['OUT2', 'OUT1'], labels: ['OUT2', 'OUT1'] },
    { id: 'J3', kind: 'l298n-term', name: 'Motor B terminal (OUT3, OUT4)', short: 'MOTOR B', at: [38.75, 16], rot: 90, pins: ['OUT4', 'OUT3'], labels: ['OUT4', 'OUT3'] },
    { id: 'JPA', kind: 'l298n-jumper', name: 'ENA jumper cap (motor A always enabled)', short: 'ENA CAP', at: [26.33, 3.54], rot: 90, z: 2.5 },
    { id: 'JPB', kind: 'l298n-jumper', name: 'ENB jumper cap (motor B always enabled)', short: 'ENB CAP', at: [39.87, 7.54], rot: 90, z: 2.5 },
    { id: 'JP5', kind: 'l298n-jumper', name: '5V-EN jumper cap (regulator on)', short: '5V-EN CAP', at: [25, 8.5], z: 2.5 },
  ],
  power: {
    sources: {
      bench: { label: '2S LiPo (7.4 V) on +12V', part: 'J1', v: VBAT, range: [7, 12], max: 46 },
    },
    default: 'bench',
    rails: {
      // the regulator feed comes first so a reversed pack burns the 78M05 it reaches first
      '5V': { from: [{ src: 'bench', via: ['J1', 'JP5', 'U2'], reg: 5, dropout: 2, max: 35 }], max: 7 },
      VS: { from: [{ src: 'bench', via: ['J1'] }], max: 46 },
    },
    // the L298N's logic runs from the 78M05, which needs VS ≥ 4.5 V + 2 V dropout
    mcu: { part: 'U1', rail: 'VS', min: 6.5, needs: ['U1', 'J4', 'JP5', 'U2'] },
    upload: { source: 'bench', needs: [], tool: 'none' },
  },
  mode: 'fwd',
  modes: {
    fwd: { title: 'Forward', instant: true, bytes: 0, powerMsg: 'Both bridges on: IN1 high, IN2 low, both motors forward', out: outs({ ...fwdA, ...fwdB }),
      serial: every3('battery 7.4 V -> motors 5.3 V, 2.1 V lost in the bridge') },
    rev: { title: 'Reverse', instant: true, bytes: 0, powerMsg: 'IN1 low, IN2 high: both motors reverse', out: outs({ ...revA, ...revB }),
      serial: every3('reverse: the same 2.1 V lost, the same heat') },
    spin: { title: 'Spin on the spot', instant: true, bytes: 0, powerMsg: 'Motor A forward, motor B reverse', out: outs({ ...fwdA, ...revB }),
      serial: every3('A forward, B reverse: the robot pivots') },
    brake: { title: 'Brake (IN1 = IN2)', instant: true, bytes: 0, powerMsg: 'IN1 = IN2: both motor leads on the same rail, a fast stop', out: outs({ IN1: 1, IN2: 1, IN3: 1, IN4: 1 }),
      serial: once('brake: both leads tied together, 0 A from the battery') },
  },
  faults: ['reverse-polarity:bench', 'stall', 'cold:J2', 'missing:JPA', 'missing:JP5', 'wrong-voltage:bench:6', 'wrong-voltage:bench:36'],
  xr: {
    flow: [
      ['VS', [[9.5, 4.2], [9.5, 12], [12.5, 16], [12.5, 25.5], [21.5, 29.3]]],
      ['5V', [[24.4, 8.5], [27, 9], [27.5, 13.5], [32.5, 13.5], [32.5, 19.5], [22, 26], [22.8, 29.3]]],
      ['IN1', [[28.87, 2.27], [28.87, 7], [20, 25], [19.6, 29.3]]],
      ['IN2', [[31.41, 2.27], [31.41, 7.5], [22, 25.5], [21.6, 29.3]]],
      ['IN3', [[33.95, 2.27], [33.95, 8], [24, 26], [23.5, 29.3]]],
      ['IN4', [[36.49, 2.27], [36.49, 8.5], [26, 26.5], [25.4, 29.3]]],
      ['OUT1', [[17, 29.3], [9.6, 21], [4.25, 13.5]]],
      ['OUT2', [[18.3, 29.3], [12.4, 21], [4.25, 18.5]]],
      ['OUT3', [[26.1, 29.3], [29.2, 21], [38.75, 18.5]]],
      ['OUT4', [[24.8, 29.3], [26.4, 21], [38.75, 13.5]]],
    ],
    notes: [['U1', 'TWO BIPOLAR H-BRIDGES'], ['U2', '5V REGULATOR'], ['D1', 'FLYBACK DIODES']],
  },
  tags: [['U1', 44, 30], ['J1', -40, 26], ['J2', -46, -10], ['J3', 46, 8], ['J4', 40, 30], ['JP5', -36, 34], ['U2', 40, -18]],
});
})();
