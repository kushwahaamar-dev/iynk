// @cf title QTR-8RC line follower
// @cf use engine/bench.list
// @cf use parts/tt-motor.js
// @cf use parts/lipo-2s.js
// @cf use boards/nano.js
// @cf use modules/tb6612fng.js
// @cf use modules/qtr-8rc.js
/* Robotics Bench Fig. 11: a line follower. The board you build is the Pololu QTR-8RC array (figures/modules/qtr-8rc.js:
   its RC read model, B.qtr); on the mat an Arduino Nano reads it, a SparkFun TB6612FNG (figures/modules/tb6612fng.js)
   drives two TT gear motors from a 2S LiPo, and a white test card with 19 mm black tape lies under the array.
   Wiring: the array's GND, VCC and LEDON to the Nano's GND, 5V and D2, OUT1-OUT6 to A0-A5, OUT7 and OUT8 to D11 and
   D12; the driver as on Fig. 05 except BIN2, which moves to D4 (D11 reads a sensor): PWMA D5, AIN1 D7, AIN2 D8, STBY
   D9, BIN1 D10, BIN2 D4, PWMB D6, its VCC on the Nano's 5V; motor L on A01/A02, motor R on B01/B02, the pack on VM.
   The model: each frame the array reads the card (B.qtr.read with the faults in force), readLineBlack() turns that into
   0-7000, and the Follow sketch sets the wheels to 150 ± error/20 (Kp 0.05). The card's tape drifts sideways as the
   track curves and comes back as the robot turns toward it: the robot's turn rate is the wheel difference, so with the
   motors swapped it turns away and loses the line. Motors as on Fig. 05: duty x (VM - I x 0.5 Ω) into the TT motor's
   own speed and current. */
(() => {
const B = SL.bench;
const Q = B.qtr, TB = B.tb6612, MOT = B.parts['tt-motor'].model;
const base = B.defs.module['qtr-8rc'];
const VBAT = 7.4, RIN = .1;
const BASE = 150, KP = .05, G = 8;               // wheel duty, gain (duty per unit of error), turn rate (sensor pitches/s at full difference)
const CARD = { l: '#fbf8ef', m: '#e7e2d3', d: '#c4bdab' }, TAPE = '#24221f';
const r1 = v => Math.round(v * 10) / 10;
const PIN_MAP = { D2: 'LEDON', A0: 'OUT1', A1: 'OUT2', A2: 'OUT3', A3: 'OUT4', A4: 'OUT5', A5: 'OUT6', D11: 'OUT7', D12: 'OUT8',
  D5: 'PWMA', D7: 'AIN1', D8: 'AIN2', D9: 'STBY', D10: 'BIN1', D4: 'BIN2', D6: 'PWMB' };

// the test card: white board with a strip of black tape across it, ticks under each sensor; m.x is the tape's centre
// in card mm (null: no tape under the array)
B.part('qtr-track', {
  name: 'Test card with black tape', legs: [], matSize: [80, 26], foot: [80, 26, .5],
  draw(ctx){
    const m = ctx.m || {}, pl = ctx.pl, W = (x, y, z) => pl.at(x, y, pl.zTop + z);
    let s = B.slabW(W, 0, 0, 80, 26, 0, .5, CARD, toneI, .9);
    if (m.x != null){
      const a = Math.max(0, m.x - 9.5), b = Math.min(80, m.x + 9.5);
      if (b > a) s += shape([W(a, 0, .52), W(b, 0, .52), W(b, 26, .52), W(a, 26, .52)], TAPE, .4);
    }
    for (const x of Q.SX) s += `<path d="${pd([W(x + 2.5, 22, .55), W(x + 2.5, 25.5, .55)], false)}" fill="none" stroke="#e2483d" stroke-width=".8"/>`;
    ctx.put(B.aabb([W(0, 0, 0), W(80, 26, .6)]), s);
  },
});

// the track under the array, in sensor pitches: drifts as it curves, comes back as the robot turns toward it
const drift = t => 1.6 * Math.sin(2 * Math.PI * t / 6) + .9 * Math.sin(2 * Math.PI * t / 2.7 + 1);
const sweep = t => 3.5 + 3.5 * Math.sin(2 * Math.PI * t / 8);

// one TB6612 channel: the motor's average volts, speed and current
function channel(in1, in2, pwm, stby, vm){
  const br = TB.bridge(in1 > .5, in2 > .5, pwm, stby > .5);
  let v = 0;
  if (br.dir){ let i = TB.IRUN; for (let k = 0; k < 4; k++){ v = br.dir * pwm * Math.max(0, vm - i * TB.RON); i = Math.abs(MOT.steady(v).i); } }
  const mo = MOT.steady(v);
  return { state: br.dir && Math.abs(mo.rpm) > 0 ? 'ok' : 'off', v: r1(v), i_mA: Math.round(Math.abs(mo.i) * 1000), rpm: Math.round(mo.rpm), duty: br.dir ? pwm : 0, dir: br.dir };
}

const stepOn = (st, id) => { const steps = B.matSetup().steps, i = steps.findIndex(s => s.id === id); return i >= 0 && st.matStep >= i; };

function model(st, dt){
  const s = st.lf || (st.lf = { e: 3.5, last: 3500, L: 0, R: 0, run: false });
  const ev = st.ev || { rails: {} }, rails = ev.rails || {}, faults = st.faults || [], has = f => faults.includes(f);
  const run = ev.status === 'running' && !st.up && st.t >= 0, mode = st.mode, follow = run && mode === 'follow';
  const card = stepOn(st, 'track');
  if (!follow) s.e = sweep(run ? st.t : 0);
  // the array reads the card: 10 mm up, a tenth as much IR comes back (Pololu app note: 120 µs white becomes 780 µs)
  const r = Q.read(st, card ? s.e : null, { surface: card, gain: has('lifted') ? .154 : 1 });
  const p = Q.position(r.us, s.last);
  if (run) s.last = p.pos;
  // the sketch's wheel duties: Follow steers, the others leave the driver in standby
  const err = p.pos - 3500, turn = Math.round(err / 20);
  s.L = follow ? Math.max(0, Math.min(255, BASE + turn)) : 0;
  s.R = follow ? Math.max(0, Math.min(255, BASE - turn)) : 0;
  const vm0 = st.power && stepOn(st, 'battery') ? VBAT : 0;
  let a = channel(1, 0, s.L / 255, follow ? 1 : 0, vm0), b = channel(1, 0, s.R / 255, follow ? 1 : 0, vm0);
  const iBatt = (a.i_mA * a.duty + b.i_mA * b.duty) / 1000, vm = Math.max(0, vm0 - RIN * iBatt);
  if (vm0 && vm0 - vm > .01){ a = channel(1, 0, s.L / 255, follow ? 1 : 0, vm); b = channel(1, 0, s.R / 255, follow ? 1 : 0, vm); }
  if (has('motors-swapped')){ const t = a; a = b; b = t; }
  // the robot turns by the difference of what the wheels really do
  if (follow && dt > 0 && card){
    const wl = a.rpm / 220, wr = b.rpm / 220;
    s.e = Math.max(-3, Math.min(10, s.e + (drift(st.t) - G * (wl - wr)) * dt));
  }
  const batt = { state: 'ok', v: r1(vm0 ? vm : 0), i_mA: Math.round(iBatt * 1000) };
  const lost = run && p.lost;
  let status = 'Unpowered';
  if (st.power && ev.status === 'no-power') status = 'No power: set out the Nano and the LiPo';
  else if (st.power && ev.status === 'fault') status = 'Fault: unplug and repair';
  else if (st.power && ev.status === 'brownout') status = 'Brown-out: the Nano keeps resetting';
  else if (st.power && !run) status = 'Powered, nothing running';
  else if (run && !card) status = 'Nothing under the array: all black';
  else if (run && r.lit.every(x => !x)) status = 'No IR: every sensor reads black';
  else if (run && p.cal.every(v => v > 200)) status = 'Every sensor sees black';
  else if (follow && lost) status = has('motors-swapped') ? 'Lost the line: it steers away' : 'Lost the line';
  else if (follow) status = Math.abs(err) < 400 ? 'On the line' : err < 0 ? 'Line on the left: turning left' : 'Line on the right: turning right';
  else if (run) status = lost ? 'No line under the array' : 'Line at ' + p.pos;
  const stats = st.power ? [
    ['Position', run ? String(p.pos) : '-'], ['Sensor 1', run ? r.us[0] + ' µs' : '-'],
    ...(follow ? [['Wheels', 'L ' + s.L + ' · R ' + s.R]] : []),
  ] : [];
  st.qtr = { run, us: r.us, lit: r.lit, pos: p.pos, line: s.e };
  return {
    readings: { MOTL: a, MOTR: b, BATT: batt, TRACK: { x: card ? 2.5 + Q.SX[0] + 9.525 * s.e : null } },
    report: { qtr: { us: run ? r.us : null, cal: run ? p.cal : null, pos: run ? p.pos : null, lost: run ? p.lost : null }, drive: { L: s.L, R: s.R } },
    status, stats,
    flow: { VCC: run, LEDON: run, OUT1: run, OUT8: run },
    accent: lost && follow ? ['TRACK'] : [],
  };
}

// the Nano's sketches: LEDON on D2, the driver as wired; Follow's wheel duties come from the model's last read
const drive = st => ({ D2: 1, D9: 1, D7: 1, D8: 0, D10: 1, D4: 0, D5: (st.lf ? st.lf.L : 0) / 255, D6: (st.lf ? st.lf.R : 0) / 255 });
const posLine = (k, st) => st.qtr && st.qtr.run ? 'position ' + st.qtr.pos : null;
const modes = {
  raw: { title: 'Raw RC times', bytes: 4410, banner: 'raw: OUT1-OUT8 in us, 2500 = timeout', out: () => ({ D2: 1 }),
    serial: (k, st) => st.qtr && st.qtr.run ? st.qtr.us.join(' ') : null },
  line: { title: 'Line position', bytes: 4652, banner: 'calibrated: position 0-7000', out: () => ({ D2: 1 }), serial: posLine },
  follow: { title: 'Follow the line', bytes: 5086, banner: 'follow: Kp 0.05, base 150', out: drive,
    serial: (k, st) => st.qtr && st.qtr.run && st.lf ? 'pos ' + st.qtr.pos + ' L ' + st.lf.L + ' R ' + st.lf.R : null },
};

const W = (from, to, color, step) => ({ from, to, color, step });
B.bench({
  id: 'qtr-8rc', fig: '11', board: 'qtr-8rc', pal: 'tomato', view: 'board',
  name: 'QTR-8RC line follower',
  sub: 'Build the sensor array, wire a Nano, a TB6612FNG and two motors, then make it follow a line',
  mat: { front: 6, back: 6, left: 6, right: 6 },
  pinMap: PIN_MAP,
  modes, mode: 'raw',
  power: Object.assign({}, base.power, {
    // one switch: the Nano on USB (its 5 V feeds the array and the driver's logic) and the LiPo on VM
    sources: { bench: { label: 'Nano on USB, 2S LiPo on VM', v: 5, parts: ['NANO', 'BATT'] } },
    default: 'bench',
    rails: { VCC: { from: [{ src: 'bench', via: ['J1'] }], max: 9, victim: 'U1' } },
    upload: { source: 'bench', needs: [], tool: 'none' },
  }),
  periph: [
    // the Nano in front of the header, the driver to its right, the motors and the pack behind the card
    { id: 'NANO', board: 'nano', at: [6, -36], step: 'nano', name: 'Arduino Nano' },
    { id: 'DRV', board: 'tb6612fng', at: [60, -40], step: 'driver', name: 'TB6612FNG motor driver' },
    { id: 'MOTL', part: 'tt-motor', at: [-84, 50], params: { rot: 0 }, step: 'motors', name: 'Motor L (left wheel)' },
    { id: 'MOTR', part: 'tt-motor', at: [12, 50], params: { rot: 0 }, step: 'motors', name: 'Motor R (right wheel)' },
    { id: 'BATT', part: 'lipo-2s', at: [86, -46], params: { rot: 0 }, step: 'battery', name: '2S LiPo' },
    { id: 'TRACK', part: 'qtr-track', at: [-2.5, 17], step: 'track', name: 'Test card with black tape' },
  ],
  matSteps: [
    { id: 'nano', label: 'Put the Nano down and wire the array: GND, VCC, LEDON, OUT1-OUT8' },
    { id: 'driver', label: 'Put the driver down and wire it to the Nano' },
    { id: 'motors', label: 'Put the motors down and wire A01/A02, B01/B02' },
    { id: 'battery', label: 'Put the LiPo down and wire VM and GND' },
    { id: 'track', label: 'Slide the test card under the array' },
  ],
  wires: [
    W('J1.1', 'NANO.GND', 'black', 'nano'), W('J1.2', 'NANO.5V', 'red', 'nano'), W('J1.3', 'NANO.D2', 'white', 'nano'),
    W('J1.4', 'NANO.A0', 'yellow', 'nano'), W('J1.5', 'NANO.A1', 'green', 'nano'), W('J1.6', 'NANO.A2', 'blue', 'nano'), W('J1.7', 'NANO.A3', 'purple', 'nano'),
    W('J1.8', 'NANO.A4', 'yellow', 'nano'), W('J1.9', 'NANO.A5', 'green', 'nano'), W('J1.10', 'NANO.D11', 'blue', 'nano'), W('J1.11', 'NANO.D12', 'purple', 'nano'),
    W('DRV.PWMA', 'NANO.D5', 'yellow', 'driver'), W('DRV.AIN1', 'NANO.D7', 'blue', 'driver'), W('DRV.AIN2', 'NANO.D8', 'green', 'driver'),
    W('DRV.STBY', 'NANO.D9', 'white', 'driver'), W('DRV.BIN1', 'NANO.D10', 'purple', 'driver'), W('DRV.BIN2', 'NANO.D4', 'grey', 'driver'),
    W('DRV.PWMB', 'NANO.D6', 'orange', 'driver'), W('DRV.JP2.8', 'NANO.GND', 'black', 'driver'), W('DRV.VCC', 'NANO.5V', 'red', 'driver'),
    W('DRV.A01', 'MOTL.+', 'red', 'motors'), W('DRV.A02', 'MOTL.-', 'black', 'motors'), W('DRV.B01', 'MOTR.+', 'red', 'motors'), W('DRV.B02', 'MOTR.-', 'black', 'motors'),
    W('DRV.VM', 'BATT.+', 'red', 'battery'), W('DRV.JP1.1', 'BATT.-', 'black', 'battery'),
  ],
  faults: [['wrong-voltage:bench:3.3', 'Array VCC on the 3.3V pin'], ['lifted', 'Array 10 mm above the floor'], ['motors-swapped', 'Left and right motors swapped']],
  model,
});
})();
