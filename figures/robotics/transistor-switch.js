// @cf title Transistor switch: a Nano drives a motor
// @cf use engine/bench.list
// @cf use parts/tip120.js
// @cf use parts/diode-1n4007.js
// @cf use parts/tt-motor.js
// @cf use parts/aa-holder-4.js
// @cf use boards/nano.js
/* Robotics Bench Fig. 03: pin 9 of an Arduino Nano switches a TT gear motor through a TIP120 Darlington on the low
   side. The motor runs from its own 4 x AA pack; a 1N4007 across it catches the switch-off spike; a green LED on its
   own 1 kΩ shows what pin 9 does. The Nano (geometry, build flow, power tree) is figures/boards/nano.js; this file
   adds the breadboard circuits, the four sketches of src/content/robotics/transistor-switch.ts (same mode ids, bytes
   and serial lines) and the bench model.
   Breadboard (back half, rows a-e): LED1 c3-c2 with its own ground wire to the Nano, R2 b3-b7, pin 9 into column 7,
   R1 c7-c11 to the base, Q1 e11/e12/e13 (B, C, E), the emitter to the ground rail T-, D1 b12-b16 (band to plus),
   the motor's leads in d16 (+) and d12 (-), column 16 to the plus rail T+, the battery on T+/T-, and one wire from
   the Nano's GND to T- (the common ground). The motor stands behind the breadboard, the battery beside it.
   The model (numbers: docs/facts/la-components.md §11, §13; Energizer E91; the tip120 and tt-motor part files):
   base current (5 V rail − 1.3 V) / 1 kΩ ≈ 3.4 mA; VCE(sat) 0.7-1.0 V; the motor sees duty x (battery − VCE) on
   average; four fresh alkaline cells 6.4 V open circuit with 0.8 Ω inside; free-air TIP120 62.5 °C/W. */
(() => {
const B = SL.bench, T = B.T;
const TIP = B.parts.tip120.model, MOT = B.parts['tt-motor'].model;
const VOC = 6.4, RINT = .8, VOC_LI = 16.8, RINT_LI = .6;   // 4 x AA alkaline / 4 x 14500 Li-ion, open circuit and inside
const VD = .85;                                            // 1N4007 at a few hundred mA
const R_BASE = 1000, PIN_R = 25;                           // base resistor; an AVR pin's own driver
const VCEO = 60;                                           // the TIP120 breaks down here when nothing clamps the coil
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const r1 = v => Math.round(v * 10) / 10;
// the same stutter the engine gives a cold joint: on and off in bursts, deterministic in time
const coldOpen = t => { const k = Math.floor(t * 3.3), x = Math.sin((k + 1) * 12.9898 + 41 * 78.233) * 43758.5453; return x - Math.floor(x) < .42; };

/* ---------- circuits ---------- */
const DRIVE = [
  { id: 'LED1', part: 'led', color: 'green', holes: ['c3', 'c2'] },
  { id: 'R2', part: 'resistor', ohms: 1000, holes: ['b3', 'b7'] },
  { id: 'R1', part: 'resistor', ohms: 1000, holes: ['c7', 'c11'] },
  { id: 'Q1', part: 'tip120', holes: ['e11', 'e12', 'e13'] },
];
const DRIVE_WIRES = [
  { from: 'J2.2', to: 'e2', color: 'black' },        // LED ground, straight to the Nano
  { from: 'J1.12', to: 'e7', color: 'orange' },      // pin 9
  { from: 'a13', to: 'T-13', color: 'black' },       // emitter to the ground rail
];
// the motor behind the breadboard (wheel up, can end toward the breadboard), the battery holder beside it
const MOTOR_AT = [38, 62.5], BATT_AT = [134, 68.2];
const MOTOR = [
  { id: 'D1', part: 'diode-1n4007', holes: ['b12', 'b16'] },
  { id: 'M1', part: 'tt-motor', at: MOTOR_AT, rot: 90, holes: ['d16', 'd12'] },
];
const MOTOR_WIRES = [{ from: 'a16', to: 'T+16', color: 'red' }];
const POWER = [{ id: 'BT1', part: 'aa-holder-4', at: BATT_AT, rot: 0, holes: ['T+26', 'T-28'] }];
const POWER_WIRES = [{ from: 'J1.4', to: 'T-3', color: 'black' }];   // the common ground
const BENCH = [...DRIVE, ...MOTOR, ...POWER], BENCH_WIRES = [...DRIVE_WIRES, ...MOTOR_WIRES, ...POWER_WIRES];
const STAGE = { 'stage-drive': 1, 'stage-motor': 2, bench: 3, 'speed-knob': 3, 'toggle-button': 3 };

/* ---------- the bench model ---------- */
const FAULT_IDS = ['no-flyback', 'flyback-reversed', 'tip120-reversed', 'no-ground', 'no-base-resistor', 'motor-on-pin',
  'battery-reversed', 'li-ion-cells', 'cold:M1', 'stall'];
const off = { state: 'off', i_mA: 0 };
function model(st, dt){
  const s = st.tsw || (st.tsw = { tj: 25, kickT: 0, pinT: 0, overT: 0, shortT: 0, q1: null, d1: null, m1: null, said: {} });
  const faults = st.faults || [], has = id => faults.includes(id);
  // a repaired fault takes its damage with it (the fix text fits a new part)
  if (!has('no-flyback')){ s.kickT = 0; s.q1 = null; }
  if (!has('no-base-resistor') && !has('motor-on-pin')) s.pinT = 0;
  if (!has('li-ion-cells')){ s.overT = 0; s.m1 = null; }
  if (!has('flyback-reversed')){ s.shortT = 0; s.d1 = null; }
  const once = (key, fn) => { if (!s.said[key]){ s.said[key] = true; fn(); } };
  for (const k of Object.keys(s.said)) if (!has(k.split('|')[0])) delete s.said[k];
  st.cparams = st.cparams || {};
  st.cparams.Q1 = Object.assign(st.cparams.Q1 || {}, { reversed: has('tip120-reversed') });

  const stage = STAGE[st.circuit] || 0, ev = st.ev || { rails: {} };
  const run = ev.status === 'running' && !st.up && st.t >= 0;
  const v5 = (ev.rails || {})['5V'] || 0;
  // pin 9: the program's duty, unless an overload has killed the pin's output stage
  const pinDead = s.pinT > .6;
  const d = run && !pinDead ? clamp(+(st.o.pins || {}).D9 || 0, 0, 1) : 0;
  const meas = {}, stats = [];
  const li = has('li-ion-cells'), voc = li ? VOC_LI : VOC, rint = li ? RINT_LI : RINT;
  const battIn = stage >= 3 && !has('brownout');
  let status = 'Build the circuit';

  // what the base gets: pin 9 through R1 (or straight, with no R1), back through the common ground
  const groundOk = stage >= 3 && !has('no-ground');
  const qIn = stage >= 1 && !has('motor-on-pin');
  const rb = has('no-base-resistor') ? PIN_R : R_BASE;
  const ibOn = qIn && groundOk && !has('tip120-reversed') ? Math.max(0, (v5 || 5) - 1.3) / rb : 0;
  if (ibOn > .04 && d > 0){ s.pinT += dt; once('no-base-resistor', () => { B.sfx('sizzle'); B.say('{n} mA out of pin 9: far past its 40 mA limit', { n: Math.round(ibOn * 1000) }, 3000); }); }

  let q1 = { state: 'off', drive: d, ib_mA: 0, ic_mA: 0, vce: 0, p_W: 0, peak_V: 0 };
  let m1 = { state: 'off', v: 0, i_mA: 0, rpm: 0, supply: battIn ? 'batt' : 'none' };
  let bt = { state: stage >= 3 ? (has('battery-reversed') ? 'reverse' : li ? 'li-ion' : 'ok') : 'off', v: stage >= 3 ? voc : 0, i_mA: 0 };
  let d1 = stage >= 2 ? { state: 'block', i_mA: 0 } : off;

  if (stage >= 2 && has('brownout')){
    // the motor hangs off the Nano's 5 V: each start drags the rail under 2.7 V and the chip resets
    m1 = { state: ev.status === 'brownout' ? 'stall' : 'off', v: r1(v5), i_mA: ev.status === 'brownout' ? 1100 : 0, rpm: 0, supply: 'usb' };
    status = 'Brown-out loop';
  } else if (stage >= 3 && has('battery-reversed')){
    // plus on the ground rail: through the TIP120's built-in diode and D1, two drops across the cells
    const i = Math.max(0, voc - 2 * VD) / (rint + .4);
    bt = { state: 'reverse', v: r1(voc - rint * i), i_mA: Math.round(i * 1000) };
    d1 = { state: 'hot', i_mA: Math.round(i * 1000) };
    status = 'Battery backwards';
    once('battery-reversed', () => { B.sfx('sizzle'); B.say('Reverse polarity: {n} mA through D1, the cells heat up', { n: Math.round(i * 1000) }, 3200); });
  } else if (stage >= 2 && has('motor-on-pin')){
    // motor straight on pin 9: the pin's 25 Ω driver against the motor's 4 Ω winding
    const i = d > 0 ? 5 / (PIN_R + MOT.R) : 0, v = i * MOT.R;
    if (i > 0){ s.pinT += dt; once('motor-on-pin', () => { B.sfx('sizzle'); B.say('Pin 9 tries to give {n} mA: the motor needs over 1 A to start', { n: Math.round(i * 1000) }, 3200); }); }
    m1 = { state: v > MOT.VSTART ? 'ok' : 'off', v: r1(v * d), i_mA: Math.round(i * 1000 * d), rpm: 0, supply: 'pin' };
    status = pinDead ? 'Pin 9 is dead' : 'Motor on pin 9';
  } else if (stage >= 2){
    const q1Short = s.q1 === 'burnt';                       // a TIP120 that failed short conducts whatever the pin says
    const onF = q1Short ? 1 : ibOn > 0 ? d : 0;
    const flyOk = !has('no-flyback') && !has('flyback-reversed') && s.d1 !== 'burnt';
    const coldGap = has('cold:M1') && coldOpen(st.t || 0);
    const vsrc = battIn ? voc : 0;
    // battery sag and the motor solve each other: a few rounds settle it
    let vb = vsrc, mo = { rpm: 0, i: 0 }, vce = 0, ishort = 0, vm = 0;
    for (let k = 0; k < 6; k++){
      vce = onF > 0 ? (q1Short ? .3 : TIP.vcesat(Math.max(.01, Math.abs(mo.i)))) : 0;
      vm = coldGap || s.m1 === 'burnt' ? 0 : onF * Math.max(0, vb - vce);
      mo = MOT.steady(vm, has('stall'));
      ishort = has('flyback-reversed') && s.d1 !== 'burnt' && onF > 0 && battIn ? Math.max(0, vb - VD - vce) / (rint + 1) : 0;
      vb = Math.max(0, vsrc - rint * (onF * Math.abs(mo.i) + onF * ishort));
    }
    const iM = Math.abs(mo.i);
    const pQ = onF * (iM + ishort) * vce;
    // a reversed D1 cooks: about 2.5 A through a 1 A part; it fails open after a few seconds
    if (ishort > 0){ s.shortT += dt; d1 = { state: 'hot', i_mA: Math.round(ishort * onF * 1000) };
      once('flyback-reversed', () => { B.sfx('sizzle'); B.say('D1 conducts straight across the battery: {n} mA', { n: Math.round(ishort * 1000) }, 3000); });
      if (s.shortT > 3 && s.d1 !== 'burnt'){ s.d1 = 'burnt'; B.sfx('pop'); B.say('D1 burned open'); } }
    if (s.d1 === 'burnt') d1 = { state: 'burnt', i_mA: 0 };
    else if (flyOk && onF > 0 && onF < 1 && iM > 0) d1 = { state: 'clamp', i_mA: Math.round((1 - onF) * iM * 1000) };
    // no diode: every switch-off drives the collector to the TIP120's 60 V breakdown; in PWM it gives up in seconds
    const switching = onF > 0 && onF < 1 && iM > .02 && !q1Short;
    if (has('no-flyback') && switching){ s.kickT += dt;
      once('no-flyback', () => B.say('No flyback diode: the collector kicks to 60 V at every switch-off'));
      if (s.kickT > 4 && s.q1 !== 'burnt'){ s.q1 = 'burnt'; B.sfx('pop'); B.say('The TIP120 failed short: the motor runs flat out', null, 3200); } }
    // the motor over its 9 V: it screams, then its winding burns open
    if (vm > MOT.VMAX && s.m1 !== 'burnt'){ s.overT += dt; if (s.overT > 8){ s.m1 = 'burnt'; B.sfx('sizzle'); B.say('The motor burned out: 16 V on a 3-6 V motor', null, 3200); } }
    const peak = onF > 0 ? (flyOk ? vb + VD : VCEO) : 0;
    const tjWant = 25 + 62.5 * pQ;
    s.tj += (tjWant - s.tj) * (1 - Math.exp(-(dt || 0) / 6));
    const qState = q1Short ? 'burnt' : has('tip120-reversed') ? 'off' : onF > 0 ? (pQ > 1.5 ? 'hot' : 'on') : 'off';
    q1 = { state: qState, drive: d, ib_mA: r1(ibOn * d * 1000), ic_mA: Math.round(onF * (iM + ishort) * 1000), vce: onF > 0 ? Math.round(vce * 100) / 100 : r1(vb),
      p_W: Math.round(pQ * 100) / 100, peak_V: r1(peak) };
    const mState = s.m1 === 'burnt' ? 'burnt' : !battIn ? 'off' : has('stall') && vm > 0 ? 'stall' : vm > MOT.VMAX ? 'over'
      : vm > 0 && !flyOk && has('no-flyback') && switching ? 'spike' : Math.abs(mo.rpm) > 0 ? 'ok' : 'off';
    m1 = { state: mState, v: r1(vm), i_mA: Math.round(iM * 1000), rpm: Math.round(Math.abs(mo.rpm)), supply: battIn ? 'batt' : 'none' };
    bt = Object.assign(bt, { v: battIn ? r1(vb) : 0, i_mA: Math.round(onF * (iM + ishort) * 1000) });
    if (!battIn) status = 'No battery yet';
    else if (has('no-ground')) status = 'No common ground';
    else if (has('tip120-reversed')) status = 'TIP120 backwards';
    else if (q1Short) status = 'TIP120 failed short';
    else if (s.d1 === 'burnt') status = 'D1 burned open';
    else if (pinDead) status = 'Pin 9 is dead';
    else if (mState === 'stall') status = 'Wheel held: stalled';
    else if (mState === 'over') status = 'Motor over-voltage';
    else if (mState === 'burnt') status = 'Motor burned out';
    else if (has('cold:M1')) status = 'Motor stutters';
    else if (ishort > 0) status = 'D1 shorts the battery';
    else if (onF >= 1) status = 'Motor on';
    else if (onF > 0) status = 'Motor on PWM';
    else status = 'Motor off';
  } else if (stage >= 1){
    status = 'LED only, no motor yet';
  }
  if (has('no-base-resistor') && stage >= 1) q1 = Object.assign(q1, { ib_mA: r1(ibOn * d * 1000) });
  // the indicator LED goes dark with a dead pin (the engine's solver reads the program's level, not the pin's health)
  if (pinDead && st.meas && st.meas.LED1) meas.LED1 = Object.assign({}, st.meas.LED1, { i_mA: 0, state: 'off' });
  q1.tj_C = Math.round(Math.max(25, s.tj));
  meas.Q1 = q1; meas.M1 = m1; meas.BT1 = bt; meas.D1 = d1;
  if (stage >= 1){
    stats.push(['Pin 9', Math.round(d * 100) + ' %'], ['Base', q1.ib_mA + ' mA']);
    if (stage >= 2) stats.push(['Motor', m1.i_mA + ' mA · ' + m1.rpm + ' rpm'], ['Peak', q1.peak_V + ' V']);
    if (stage >= 3) stats.push(['Battery', bt.v + ' V']);
  }
  const accent = FAULT_IDS.some(has) ? (has('stall') || has('cold:M1') || has('li-ion-cells') ? ['M1'] : has('battery-reversed') ? ['BT1'] : []) : [];
  return { meas, readings: { M1: m1, BT1: bt }, status, stats, flow: { D9: d > 0 }, accent };
}

/* ---------- the four sketches (src/content/robotics/transistor-switch.ts: same ids, bytes, serial lines) ---------- */
const modes = {
  high: { title: 'Input HIGH', bytes: 1568, banner: 'pin 9 HIGH: TIP120 on, motor runs', out: () => ({ D9: 1 }) },
  pwm: { title: 'PWM 50%', bytes: 1690, banner: 'analogWrite(9, 128): 490 Hz, 50% duty', out: () => ({ D9: 128 / 255 }) },
  low: { title: 'Input LOW', bytes: 1581, banner: 'pin 9 LOW: TIP120 off, motor coasts to a stop', out: () => ({ D9: 0 }) },
  // one step every 8 ms from 0 to 255, then full on; the duty is printed once a second
  ramp: { title: 'Soft start ramp', bytes: 2236, banner: 'soft start: 0 to 255 in about 2 s',
    out: (st, t) => ({ D9: Math.min(255, Math.floor(t / .008)) / 255 }),
    serial: k => (k >= 1 ? 'duty ' + Math.min(255, k * 125) : null) },
};

B.bench({
  id: 'transistor-switch', fig: '03', board: 'nano', pal: 'mustard',
  name: 'Transistor switch: a Nano drives a motor',
  sub: 'Pin 9, a 1 kΩ base resistor and a TIP120 switch a TT gear motor on its own 4 x AA battery, with a flyback diode',
  // room behind the breadboard for the motor and the battery holder (the breadboard view grows with the board's mat)
  mat: { front: 9, back: 85, left: 24, right: 9 },
  modes, mode: 'high',
  circuits: {
    'stage-drive': { title: 'The TIP120, its base resistor and the pin 9 LED', breadboard: 'half', parts: DRIVE, wires: DRIVE_WIRES },
    'stage-motor': { title: 'The motor and its flyback diode', breadboard: 'half', parts: [...DRIVE, ...MOTOR], wires: [...DRIVE_WIRES, ...MOTOR_WIRES] },
    bench: { title: 'Battery and common ground: the whole switch', breadboard: 'half', parts: BENCH, wires: BENCH_WIRES },
    'speed-knob': { title: 'A 10 kΩ knob on A0 sets the speed', breadboard: 'half',
      parts: [...BENCH, { id: 'POT1', part: 'potentiometer', ohms: 10000, pos: .5, holes: ['c20', 'c21', 'c22'] }],
      wires: [...BENCH_WIRES, { from: 'J2.4', to: 'a20', color: 'red' }, { from: 'J2.12', to: 'a21', color: 'yellow' }, { from: 'a22', to: 'T-22', color: 'black' }] },
    'toggle-button': { title: 'A button on D2 toggles the motor', breadboard: 'half',
      parts: [...BENCH, { id: 'SW1', part: 'push-button', holes: ['e20', 'f20', 'e22', 'f22'] }],
      wires: [...BENCH_WIRES, { from: 'J1.5', to: 'a20', color: 'blue' }, { from: 'a22', to: 'T-22', color: 'black' }] },
  },
  circuit: 'bench',
  // the motor and the battery stand on the mat in the board view too (same places, same readings)
  periph: [
    { id: 'M1', part: 'tt-motor', at: [MOTOR_AT[0] - 45.25, MOTOR_AT[1] - 23.2], params: { rot: 90 }, name: 'TT gear motor' },
    { id: 'BT1', part: 'aa-holder-4', at: [BATT_AT[0] - 31, BATT_AT[1] - 29], size: [62, 58], params: { rot: 0 }, name: '4 x AA battery holder' },
  ],
  // the wiring faults redraw the breadboard (FIGURES-BENCH §6.4 circuit edits); the model above plays what they do
  faults: [
    ['no-flyback', 'Leave out the flyback diode', { missing: ['D1'] }],
    ['flyback-reversed', 'Flyback diode in backwards', { reversed: ['D1'] }],
    ['tip120-reversed', 'TIP120 in backwards'],
    ['no-ground', 'No common ground', { cut: [['J1.4', 'T-3']] }],
    // a jumper where R1 was: pin 9 straight into the base
    ['no-base-resistor', 'No base resistor', { missing: ['R1'], wires: [{ from: 'c7', to: 'c11', color: 'orange' }] }],
    // the motor's leads moved from the TIP120's collector and the plus rail to pin 9's column and the ground rail
    ['motor-on-pin', 'Motor straight on pin 9', { holes: { M1: ['d7', 'T-9'] } }],
    ['battery-reversed', 'Battery leads swapped', { reversed: ['BT1'] }],
    ['li-ion-cells', 'Li-ion cells in the AA holder'], ['cold:M1', 'Cold joint on the motor tab'], ['stall', 'Hold the wheel'],
  ],
  model,
});
})();
