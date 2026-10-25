// @cf title L298N motor driver
// @cf use engine/bench.list
// @cf use parts/tt-motor.js
// @cf use parts/lipo-2s.js
// @cf use boards/nano.js
// @cf use modules/l298n.js
/* Robotics Bench Fig. 06: the red L298N module (the board you build: figures/modules/l298n.js, with its power tree,
   jumpers and heatsink) driving two TT gear motors from a 2S LiPo, its four direction inputs on an Arduino Nano.
   The Nano, the motors and the pack stand on the mat and are set out one step at a time with their wires: D8, D7, D5
   and D4 to IN1-IN4 and the Nano's GND to the power terminal's GND, the motors on OUT1/OUT2 and OUT3/OUT4, the pack
   on +12V and GND. The ENA and ENB caps stay on as the module ships, so both bridges run at full speed whatever the
   sketch writes to D9 and D3 (the half-speed sketch shows it; the soft-start task pulls the ENA cap).
   The model (ST L298 datasheet, docs/facts/l298n.md §3): each bridge from IN and EN (the cap ties EN to +5V), the two
   conducting bipolar switches dropping 1.4 + 1.15 x I volts (B.l298n.drop), the TT motor's own speed and current on
   what is left (parts/tt-motor.js), the pack's sag, and the heat: the drop times the current plus the chip's own
   quiescent draw, into the stock fin (15 °C/W assumed), the case and the junction. The junction follows that with a
   short time constant (bench time, not the minutes a real sink takes) and the overtemperature protection cuts the
   outputs at 130 °C (the top of the operating range; ST publishes no trip point) until it has cooled by 20 °C. */
(() => {
const B = SL.bench;
const LM = B.l298n, MOT = B.parts['tt-motor'].model;
const RIN = .1;                                   // 2S 1000 mAh LiPo, inside
const RSA = 15, RJC = 3, RCS = 1;                 // fin to air (assumed, the top of the 10-15 guess), junction-case (datasheet), case-fin (°C/W)
const IQ_VS = .03, IQ_5V = .03;                   // L298 quiescent from VS, logic + LED through the 78M05 (datasheet typ)
const TAU = 5, TRIP = 130, RESET = 110;
const PIN_MAP = { D8: 'IN1', D7: 'IN2', D5: 'IN3', D4: 'IN4' };
const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;

// one bridge: direction from IN, enable from the cap (or nothing: a floating enable does not run it), the motor on
// what the two conducting switches leave, a few passes to settle the current against the drop
function channel(in1, in2, en, vs, held){
  const d = Math.min(1, Math.max(0, en)), a = in1 > .5, b = in2 > .5;
  if (d <= .02 || vs <= .5) return { dir: 0, brake: false, v: 0, i: 0, drop: 0, w: 0, m: { state: 'off', v: 0, i_mA: 0, rpm: 0 } };
  if (a === b) return { dir: 0, brake: true, v: 0, i: 0, drop: 0, w: 0, m: { state: 'off', v: 0, i_mA: 0, rpm: 0 } };
  const dir = a ? 1 : -1;
  let i = .2, v = 0, mo = null;
  for (let k = 0; k < 6; k++){ v = Math.max(0, vs - LM.drop(i)); mo = MOT.steady(v, held); i = Math.abs(mo.i); }
  const drop = LM.drop(i);
  return { dir, brake: false, v: d * v, i: d * i, drop, w: d * i * drop,
    m: { state: held ? 'stall' : mo.rpm ? 'ok' : 'off', v: r1(dir * d * v), i_mA: Math.round(d * i * 1000), rpm: Math.round(dir * Math.abs(mo.rpm) * d) } };
}

function model(st, dt){
  const s = st.l298 || (st.l298 = { tj: 25, trip: false });
  const ev = st.ev || { rails: {} }, rails = ev.rails || {}, faults = st.faults || [], has = f => faults.includes(f);
  const run = ev.status === 'running' && !st.up && st.t >= 0, pins = (st.o && st.o.pins) || {};
  const vs0 = rails.VS || 0;
  // no common ground: the inputs see the Nano's pins against nothing, so they wander and the motors twitch
  const noGround = has('no-ground'), wander = k => (Math.sin(st.t * (5.3 + k) + k * 1.7) + Math.sin(st.t * 2.1 * (k + 1))) > .6 ? 1 : 0;
  const lv = (net, k) => noGround ? wander(k) : LM.level(pins, net);
  const levels = Object.fromEntries(['IN1', 'IN2', 'IN3', 'IN4'].map((n, k) => [n, run ? (lv(n, k) > .5 ? 1 : 0) : 0]));
  const enA = B.isSet('JPA') ? 1 : 0, enB = B.isSet('JPB') ? 1 : 0;
  levels.ENA = run ? enA : 0; levels.ENB = run ? enB : 0;
  const coldA = has('cold:J2') && Math.floor(st.t * 3.3) % 3 === 0;
  const held = has('stall'), live = run && !s.trip && B.isSet('U1');
  const solve = vs => [
    live && B.isSet('J2') && !coldA ? channel(levels.IN1, levels.IN2, levels.ENA, vs, held) : channel(0, 0, 0, 0, false),
    live && B.isSet('J3') ? channel(levels.IN3, levels.IN4, levels.ENB, vs, held) : channel(0, 0, 0, 0, false),
  ];
  let [a, b] = solve(vs0);
  const iq = st.power && vs0 > .5 ? IQ_VS + (B.isSet('JP5') ? IQ_5V : 0) : 0;
  const iBatt = a.i + b.i + iq, vs = Math.max(0, vs0 - RIN * iBatt);
  if (vs0 > .5 && vs0 - vs > .02) [a, b] = solve(vs);
  // heat: the two bridges plus the quiescent draw, into the fin and up to the junction
  const w = a.w + b.w + (st.power && vs0 > .5 ? IQ_VS * vs : 0);
  const sinkC = 25 + w * RSA, target = 25 + w * (RSA + RJC + RCS);
  if (dt > 0) s.tj += (target - s.tj) * (1 - Math.exp(-dt / TAU));
  if (!st.power) s.tj = 25;
  if (s.tj >= TRIP) s.trip = true; else if (s.tj <= RESET) s.trip = false;

  const rev = has('reverse-polarity:bench');
  const pack = st.power ? ((st.supply || {}).bench != null ? st.supply.bench : 7.4) - RIN * iBatt : 0;
  const batt = { state: rev ? 'reverse' : st.power && pack < 6.4 ? 'low' : 'ok', v: r1(pack), i_mA: Math.round(iBatt * 1000) };
  const drop = Math.max(a.drop, b.drop);
  const u1 = { drop: r2(drop), w: r2(w), sinkC: Math.round(25 + (s.tj - 25) * RSA / (RSA + RJC + RCS)), tj: Math.round(s.tj), trip: s.trip };

  const name = ch => ch.dir > 0 ? 'forward' : ch.dir < 0 ? 'reverse' : ch.brake ? 'brake' : 'off';
  let status = 'Unpowered';
  if (st.power && ev.status === 'fault') status = 'Fault: unplug and repair';
  else if (st.power && ev.status === 'brownout') status = 'Logic supply too low';
  else if (st.power && ev.status === 'no-power') status = 'No power: the supply is off';
  else if (st.power && !run) status = B.isSet('JP5') ? 'Powered, bridges idle' : 'No 5 V: logic off';
  else if (run && s.trip) status = 'Too hot: outputs cut';
  else if (run && noGround) status = 'No common ground: twitching';
  else if (run){ const na = name(a), nb = name(b);
    status = na === nb ? { forward: 'Both forward', reverse: 'Both reverse', brake: 'Brake', off: 'Motors off' }[na]
      : a.dir && b.dir ? 'Pivoting' : 'A ' + na + ', B ' + nb;
    if (held) status = 'Wheels held: heating'; }
  const stats = st.power ? [
    ['Battery', batt.v + ' V · ' + batt.i_mA + ' mA'],
    ['Motor A', a.m.v + ' V · ' + Math.abs(a.m.rpm) + ' rpm'], ['Motor B', b.m.v + ' V · ' + Math.abs(b.m.rpm) + ' rpm'],
    ['Lost', u1.drop + ' V'], ['Heatsink', u1.sinkC + ' °C'],
  ] : [];
  return {
    readings: { MOTA: a.m, MOTB: b.m, BATT: batt },
    meas: { U1: u1, MOTA: a.m, MOTB: b.m, BATT: batt },
    report: { levels },
    status, stats,
    flow: { VS: st.power && vs0 > .5, '5V': (rails['5V'] || 0) > .5, IN1: !!levels.IN1, IN2: !!levels.IN2, IN3: !!levels.IN3, IN4: !!levels.IN4,
      OUT1: a.dir > 0, OUT2: a.dir < 0, OUT3: b.dir > 0, OUT4: b.dir < 0 },
    accent: s.trip || held ? ['U1'] : [],
  };
}

// the Nano's sketches: IN1 D8, IN2 D7, IN3 D5, IN4 D4; D9 and D3 also write ENA and ENB, which the caps override
const out = (in1, in2, in3, in4, en = 1) => () => ({ D8: in1, D7: in2, D5: in3, D4: in4, D9: en, D3: en });
const modes = {
  fwd: { title: 'Forward', bytes: 2252, banner: 'forward: IN1 H, IN2 L, IN3 H, IN4 L', out: out(1, 0, 1, 0) },
  rev: { title: 'Reverse', bytes: 2252, banner: 'reverse: IN1 L, IN2 H, IN3 L, IN4 H', out: out(0, 1, 0, 1) },
  spin: { title: 'Spin on the spot', bytes: 2250, banner: 'spin: A forward, B reverse', out: out(1, 0, 0, 1) },
  brake: { title: 'Brake', bytes: 2242, banner: 'brake: IN1 = IN2, IN3 = IN4', out: out(1, 1, 1, 1) },
  half: { title: 'Half speed (caps on)', bytes: 2262, banner: 'half speed: analogWrite(ENA, 128), analogWrite(ENB, 128)', out: out(1, 0, 1, 0, 128 / 255) },
};

const W = (from, to, color, step) => ({ from, to, color, step });
B.bench({
  id: 'l298n', fig: '06', board: 'l298n', pal: 'tomato', view: 'board',
  name: 'L298N motor driver',
  sub: 'Build the module, wire a Nano, two TT motors and a 2S LiPo, then drive it and feel the heat',
  mat: { front: 6, back: 6, left: 6, right: 6 },
  pinMap: PIN_MAP,
  modes, mode: 'fwd',
  power: Object.assign({}, B.defs.module.l298n.power, {
    // one switch for the bench: the Nano on USB, the pack on +12V; both have to be on the mat
    sources: { bench: Object.assign({}, B.defs.module.l298n.power.sources.bench, { label: 'Nano on USB, 2S LiPo on +12V', parts: ['NANO', 'BATT'] }) },
  }),
  periph: [
    // the Nano in front of the control header (it is low), the pack on the left, the motors behind the heatsink
    { id: 'NANO', board: 'nano', at: [18, -34], step: 'nano', name: 'Arduino Nano' },
    { id: 'MOTA', part: 'tt-motor', at: [-66, 52], params: { rot: 0 }, step: 'motors', name: 'Motor A' },
    { id: 'MOTB', part: 'tt-motor', at: [30, 52], params: { rot: 0 }, step: 'motors', name: 'Motor B' },
    { id: 'BATT', part: 'lipo-2s', at: [-84, -4], params: { rot: 0 }, step: 'battery', name: '2S LiPo' },
  ],
  matSteps: [
    { id: 'nano', label: 'Put the Nano down and wire IN1-IN4 and GND' },
    { id: 'motors', label: 'Put the motors down and wire OUT1/OUT2, OUT3/OUT4' },
    { id: 'battery', label: 'Put the LiPo down and wire +12V and GND' },
  ],
  wires: [
    W('J4.1', 'NANO.D8', 'yellow', 'nano'), W('J4.2', 'NANO.D7', 'green', 'nano'), W('J4.3', 'NANO.D5', 'white', 'nano'),
    W('J4.4', 'NANO.D4', 'purple', 'nano'), W('J1.2', 'NANO.GND', 'black', 'nano'),
    W('J2.2', 'MOTA.+', 'red', 'motors'), W('J2.1', 'MOTA.-', 'black', 'motors'),
    W('J3.2', 'MOTB.+', 'orange', 'motors'), W('J3.1', 'MOTB.-', 'blue', 'motors'),
    W('J1.1', 'BATT.+', 'red', 'battery'), W('J1.2', 'BATT.-', 'black', 'battery'),
  ],
  faults: [['no-ground', 'No common ground']],
  model,
});
})();
