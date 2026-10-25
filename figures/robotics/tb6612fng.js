// @cf title TB6612FNG motor driver
// @cf use engine/bench.list
// @cf use parts/tt-motor.js
// @cf use parts/lipo-2s.js
// @cf use boards/nano.js
// @cf use modules/tb6612fng.js
/* Robotics Bench Fig. 05: a SparkFun TB6612FNG breakout (the board you build: figures/modules/tb6612fng.js, with its
   power tree and the six drive commands) driving two TT gear motors from a 2S LiPo, controlled by an Arduino Nano.
   The Nano, the motors and the battery stand on the mat and are set out one step at a time, each with its wires:
   the Nano on JP2 (PWMA D5, AIN2 D8, AIN1 D7, STBY D9, BIN1 D10, BIN2 D11, PWMB D6, GND) and its 5 V on VCC, the
   motors on A01/A02 and B01/B02, the LiPo on VM and GND.
   The model (Toshiba datasheet, docs/facts/tb6612.md): each channel's bridge from IN1, IN2, PWM and STBY (B.tb6612.bridge),
   the motor's average voltage duty x (VM − I x 0.5 Ω), the TT motor's own speed and current (parts/tt-motor.js), a
   2S pack with about 0.1 Ω inside. It reports the logic levels the content's status reads (state.levels.*) and each
   motor's and the pack's readings for their drawings. */
(() => {
const B = SL.bench;
const TB = B.tb6612, MOT = B.parts['tt-motor'].model;
const base = B.defs.module.tb6612fng;
const RIN = .1;                                        // 2S 1000 mAh LiPo, inside
const NETS = ['STBY', 'AIN1', 'AIN2', 'PWMA', 'BIN1', 'BIN2', 'PWMB'];
const PIN_MAP = { D5: 'PWMA', D8: 'AIN2', D7: 'AIN1', D9: 'STBY', D10: 'BIN1', D11: 'BIN2', D6: 'PWMB' };
const r1 = v => Math.round(v * 10) / 10;

// one channel: the motor's average volts, speed and current, and its state for the drawing
function channel(in1, in2, pwm, stby, vm){
  const br = TB.bridge(in1 > .5, in2 > .5, pwm, stby > .5);
  let v = 0;
  if (br.dir){ let i = TB.IRUN; for (let k = 0; k < 4; k++){ v = br.dir * pwm * Math.max(0, vm - i * TB.RON); i = Math.abs(MOT.steady(v).i); } }
  const mo = MOT.steady(v), state = br.dir ? (Math.abs(mo.rpm) > 0 ? 'ok' : 'off') : 'off';
  return { m: { state, v: r1(v), i_mA: Math.round(Math.abs(mo.i) * 1000), rpm: Math.round(mo.rpm) }, brake: br.brake, dir: br.dir, duty: pwm };
}

function model(st){
  const ev = st.ev || { rails: {} }, run = ev.status === 'running' && !st.up && st.t >= 0;
  const pins = (st.o && st.o.pins) || {}, lv = net => TB.level(pins, net);
  const levels = Object.fromEntries(NETS.map(n => [n, run ? (n.startsWith('PWM') ? Math.round(lv(n) * 1000) / 1000 : lv(n) > .5 ? 1 : 0) : 0]));
  const vm0 = (ev.rails || {}).VM || 0, faults = st.faults || [];
  let a = channel(levels.AIN1, levels.AIN2, levels.PWMA, levels.STBY, vm0), b = channel(levels.BIN1, levels.BIN2, levels.PWMB, levels.STBY, vm0);
  // the pack sags a little under the motors' current
  const iBatt = (Math.abs(a.m.i_mA) * a.duty + Math.abs(b.m.i_mA) * b.duty) / 1000;
  const vm = Math.max(0, vm0 - RIN * iBatt);
  if (vm0 && Math.abs(vm - vm0) > .01){ a = channel(levels.AIN1, levels.AIN2, levels.PWMA, levels.STBY, vm); b = channel(levels.BIN1, levels.BIN2, levels.PWMB, levels.STBY, vm); }
  // the pack's own voltage (a wrong-voltage fault swaps the pack), whatever the board does with it
  const rev = faults.includes('reverse-polarity:bench'), live = !!st.power && vm0 > .5;
  const pack = st.power ? ((st.supply || {}).bench != null ? st.supply.bench : base.power.sources.bench.v) - RIN * iBatt : 0;
  const batt = { state: rev ? 'reverse' : st.power && pack < 6.4 ? 'low' : 'ok', v: r1(pack), i_mA: Math.round(iBatt * 1000) };
  if (faults.includes('brownout') && run){
    // the motors hang on the Nano's 5 V: each start drags it down and the Nano resets
    a.m = Object.assign({}, a.m, { state: 'stall', i_mA: 800, rpm: 0 }); b.m = Object.assign({}, b.m, { state: 'stall', i_mA: 800, rpm: 0 });
  }
  const name = ch => !ch.dir ? (ch.brake ? 'brake' : 'coast') : ch.dir > 0 ? 'forward' : 'reverse';
  let status = 'Unpowered';
  if (st.power && ev.status === 'fault') status = 'Fault: unplug and repair';
  else if (st.power && !run) status = ev.status === 'brownout' ? 'Brown-out loop' : ev.status === 'no-power' ? 'No power: the supply is off' : 'Powered, motors idle';
  else if (run && !levels.STBY) status = 'Standby: outputs off';
  else if (run){ const na = name(a), nb = name(b);
    status = na === nb ? { forward: 'Both forward', reverse: 'Both reverse', brake: 'Short brake', coast: 'Coast' }[na] : 'A ' + na + ', B ' + nb; }
  const stats = st.power ? [
    ['Motor A', a.m.v + ' V · ' + Math.abs(a.m.rpm) + ' rpm'], ['Motor B', b.m.v + ' V · ' + Math.abs(b.m.rpm) + ' rpm'],
    ['Battery', batt.v + ' V · ' + batt.i_mA + ' mA'],
  ] : [];
  const high = n => run && levels[n] > 0;
  return {
    readings: { MOTA: a.m, MOTB: b.m, BATT: batt },
    report: { levels },
    status, stats,
    flow: { VM: live, VCC: live, PWMA: high('PWMA'), PWMB: high('PWMB'), STBY: high('STBY'), A01: a.dir > 0, A02: a.dir < 0, B01: b.dir > 0, B02: b.dir < 0 },
  };
}

const W = (from, to, color, step) => ({ from, to, color, step });
B.bench({
  id: 'tb6612fng', fig: '05', board: 'tb6612fng', pal: 'cobalt', view: 'board',
  name: 'TB6612FNG motor driver',
  sub: 'Build the driver, wire a Nano, two TT motors and a 2S LiPo, then drive, brake, coast and break it',
  mat: { front: 6, back: 6, left: 6, right: 6 },
  pinMap: PIN_MAP,
  power: Object.assign({}, base.power, {
    // the bench switch: the Nano on USB feeds VCC, the LiPo feeds VM; both have to be on the mat
    sources: { bench: Object.assign({}, base.power.sources.bench, { label: 'Nano on USB, 2S LiPo on VM', parts: ['NANO', 'BATT'] }) },
  }),
  periph: [
    // the Nano in front (it is low), the LiPo on the left by JP1, the motors behind with their wheels at the back
    { id: 'NANO', board: 'nano', at: [34, -12], step: 'nano', name: 'Arduino Nano' },
    { id: 'MOTA', part: 'tt-motor', at: [-92, 36], params: { rot: 0 }, step: 'motors', name: 'Motor A' },
    { id: 'MOTB', part: 'tt-motor', at: [4, 36], params: { rot: 0 }, step: 'motors', name: 'Motor B' },
    { id: 'BATT', part: 'lipo-2s', at: [-82, -10], params: { rot: 0 }, step: 'battery', name: '2S LiPo' },
  ],
  matSteps: [
    { id: 'nano', label: 'Put the Nano down and wire JP2 and VCC' },
    { id: 'motors', label: 'Put the motors down and wire A01/A02, B01/B02' },
    { id: 'battery', label: 'Put the LiPo down and wire VM and GND' },
  ],
  wires: [
    W('JP2.1', 'NANO.D5', 'yellow', 'nano'), W('JP2.2', 'NANO.D8', 'green', 'nano'), W('JP2.3', 'NANO.D7', 'blue', 'nano'),
    W('JP2.4', 'NANO.D9', 'white', 'nano'), W('JP2.5', 'NANO.D10', 'purple', 'nano'), W('JP2.6', 'NANO.D11', 'grey', 'nano'),
    W('JP2.7', 'NANO.D6', 'orange', 'nano'), W('JP2.8', 'NANO.GND', 'black', 'nano'), W('JP1.7', 'NANO.5V', 'red', 'nano'),
    W('JP1.5', 'MOTA.+', 'red', 'motors'), W('JP1.4', 'MOTA.-', 'black', 'motors'),
    W('JP1.2', 'MOTB.+', 'red', 'motors'), W('JP1.3', 'MOTB.-', 'black', 'motors'),
    W('JP1.8', 'BATT.+', 'red', 'battery'), W('JP1.6', 'BATT.-', 'black', 'battery'),
  ],
  model,
});
})();
