// @cf title A4988 stepper driver
// @cf use engine/bench.list
// @cf use parts/nema17.js
// @cf use parts/lipo-2s.js
// @cf use parts/multimeter.js
// @cf use boards/nano.js
// @cf use modules/a4988.js
/* Robotics Bench Fig. 07: the Pololu A4988 carrier (the board you build: figures/modules/a4988.js, with its power
   tree, the RST-SLP link and the 100 µF cap on VMOT) driving a NEMA 17 stepper from a 2S LiPo, stepped by an Arduino
   Nano, with a pocket multimeter on the current-limit pot. Set out one step at a time: the Nano (STEP D3, DIR D4, MS1
   D5, MS2 D6, MS3 D7, its 5 V on VDD, GND), the motor's four leads straight onto 2B, 2A, 1A, 1B (black, green, red,
   blue), the pack on VMOT and GND, the meter's red probe on the pot's rotor and its black probe on GND.
   A 2S pack is 8.4 V full and 7.4 V nominal; the A4988 wants 8 V or more on VMOT, so the bench starts on a fresh
   pack and the "tired pack" break shows what happens below 8 V. Twelve volts (a 3S pack) is the better supply.
   The model (Allegro A4988 datasheet, docs/facts/a4988.md §3-§6):
   - the current limit: VREF on the pot's rotor (it scales with VDD), I_MAX = VREF / (8 x 0.068 Ω). The pot starts at
     0.30 V; the hold sketch is where you turn it, and it climbs to 0.544 V (1.0 A) while the meter reads it.
   - the coils: full step puts 70.71 % of I_MAX in each coil; half and 1/16 step follow the sine table, so the heat is
     the same in every mode, I_MAX² x the coil path's on-resistance (0.64 Ω at 25 °C, rising 0.48 %/°C, assumed).
   - the heat: into the bare carrier at 60 °C/W (assumed, so that about 1 A a coil sits just under the cut-out, as
     Pololu says), a short bench-time constant, thermal shutdown at 165 °C until it has cooled by 15 °C.
   - the motion: each sketch's step rate from its timing (the figure runs the sketches itself: 200 steps at 5 ms a
     turn, 400 half steps at 5 ms, 3200 sixteenth steps at 1.25 ms), the coil currents from the rotor's electrical
     angle (50 teeth: 50 electrical turns a shaft turn), the pack's sag through 0.1 Ω.
   - the breaks the engine does not know: unplugging the motor live (the coil's L·di/dt spike kills the chip),
     the coil pairs mixed (it buzzes in place), the pot turned up to the motor's 1.68 A (thermal shutdown cycles). */
(() => {
const B = SL.bench;
const A4 = B.a4988, MOT = B.parts.nema17.model;
const RIN = .1;                       // 2S 1000 mAh LiPo, inside
const THETA = 60, TAU = 3, TC = .0048; // °C/W bare carrier, bench seconds, on-resistance tempco (assumed, see above)
const IQ = .004;                      // A from VMOT while operating (datasheet maximum)
const VREF_HIGH = .914;               // the pot turned up to the motor's rated 1.68 A
const VMIN = 8;                       // the A4988's lowest VMOT
const POT_RATE = .15;                 // V a second while you turn the pot
const PIN_MAP = { D3: 'STEP', D4: 'DIR', D5: 'MS1', D6: 'MS2', D7: 'MS3' };
const r1 = v => Math.round(v * 10) / 10, r3 = v => Math.round(v * 1000) / 1000;

// how fast each sketch turns the shaft (degrees a second) at time t since it started, and how far apart its rest
// positions are in electrical degrees (full step 90, half 45, 1/16 5.625)
const RATE = { vref: () => 0, full: t => t % 2 < 1 ? 360 : 0, half: t => t % 3 < 2 ? 180 : 0, micro: () => 90 };
// how far the sketch has asked the shaft to go since it started (exact, so whole turns land on whole turns)
const TRAVEL = { vref: () => 0, full: t => 360 * (Math.floor(t / 2) + Math.min(t % 2, 1)), half: t => 360 * (Math.floor(t / 3) + Math.min(t % 3, 2) / 2), micro: t => 90 * t };
const SNAP = { vref: 90, full: 90, half: 45, micro: 90 / 16 };

function model(st, dt){
  const s = st.a49 || (st.a49 = { deg: 0, base: 0, asked: 0, t0: 0, mode: null, tj: 25, trip: false, pot: A4.VREF_FOUND, set: false });
  const ev = st.ev || { rails: {} }, rails = ev.rails || {}, faults = st.faults || [], has = id => faults.includes(id);
  const run = ev.status === 'running' && !st.up && st.t >= 0, pins = (st.o && st.o.pins) || {};
  const vmot0 = st.power ? rails.VMOT || 0 : 0, vdd = st.power ? rails.VDD || 0 : 0;
  const dead = has('unplug-live'), mixed = has('coils-mixed'), high = has('limit-too-high');

  // the pot: the hold sketch is running while you turn it, the meter reads VREF (which follows VDD)
  if (run && st.mode === 'vref' && !high && !s.set){
    s.pot = Math.min(A4.VREF_SET, s.pot + POT_RATE * dt);
    if (s.pot >= A4.VREF_SET - 1e-4){ s.pot = A4.VREF_SET; s.set = true; }
  }
  const pot = high ? VREF_HIGH : s.pot, vref = vdd > 2.8 ? pot * vdd / 5 : 0, imax = A4.imax(vref);

  // the driver: running (VDD, RST tied to SLP), alive, not in thermal shutdown; under 8 V the outputs drop out
  const active = run && !dead && !s.trip && B.isSet('U1');
  const low = st.power && vmot0 > .5 && vmot0 < VMIN, dropout = low && Math.floor(st.t * 2.7) % 3 === 0;
  const live = active && vmot0 > .5 && !dropout;
  const rate = live && !mixed ? (RATE[st.mode] || RATE.vref)(st.t) : 0;
  // a new sketch (or a restart) starts from where the shaft is; while the outputs are off or the coils are mixed the
  // sketch keeps counting steps the shaft never makes
  const asked = (TRAVEL[st.mode] || TRAVEL.vref)(Math.max(0, st.t || 0));
  if (s.mode !== st.mode || !(st.t >= s.t0)){ s.base = s.deg - asked; s.mode = st.mode; }
  else if (!(live && !mixed)) s.base -= asked - s.asked;
  s.asked = asked; s.t0 = st.t;
  s.deg = s.base + asked;

  // heat: both coils' I² through the switches' on-resistance, which grows as it warms, plus the chip's own draw
  const w = (live ? imax * imax * A4.R_PATH * (1 + TC * (s.tj - 25)) : 0) + (st.power ? IQ * vmot0 : 0);
  if (!st.power){ s.tj = 25; s.trip = false; }
  else if (dt > 0) s.tj += (25 + THETA * w - s.tj) * (1 - Math.exp(-dt / TAU));
  if (s.tj >= A4.TSD) s.trip = true; else if (s.tj <= A4.TSD - A4.TSD_HYST) s.trip = false;

  // coil currents from the rotor's electrical angle, snapped to the sketch's rest positions (45° + 90° k in full step)
  const grid = SNAP[st.mode] || 90, off = grid === 90 ? 45 : 0;
  let th = (s.deg * 50 - off) / grid;
  th = (Math.round(th) * grid + off) * Math.PI / 180;
  if (mixed) th = Math.floor(st.t * 24) % 2 ? Math.PI / 4 : -3 * Math.PI / 4;
  const ia = live ? imax * Math.cos(th) : 0, ib = live ? imax * Math.sin(th) : 0;

  // the pack: what the coils and switches burn, through the chopper, plus the chip's draw; it sags through RIN
  const iBatt = (live ? imax * imax * (MOT.R + A4.R_PATH) / Math.max(vmot0, 1) : 0) + (st.power ? IQ : 0);
  const rev = has('reverse-polarity:bench');
  const pack = st.power ? ((st.supply || {}).bench != null ? st.supply.bench : 8.4) - RIN * iBatt : 0;
  const batt = { state: rev ? 'reverse' : st.power && pack < 6.4 ? 'low' : 'ok', v: r1(pack), i_mA: Math.round(iBatt * 1000) };

  const moving = rate > 0;
  const mot = { state: !st.power ? 'off' : dead ? 'unplugged' : mixed && live ? 'buzz' : low && active ? 'skip' : !live ? 'free' : moving ? 'ok' : 'hold',
    deg: Math.round((s.deg % 360 + 360) % 360 * 10) / 10, ia: r3(ia), ib: r3(ib), rpm: Math.round(rate / 6) };
  const mm = { state: 'ok', text: vref.toFixed(3), unit: 'V', range: '2V' };
  const u1 = { vref: r3(vref), pot: r3(pot), set: s.set, imax: r3(imax), limit_mA: Math.round(imax * 1000), coil_mA: live ? Math.round(imax * 707.1) : 0,
    tj: Math.round(s.tj), trip: s.trip, dead, ia: r3(ia), ib: r3(ib) };

  // sound and a toast, once each time a condition starts (the host plays the sfx)
  const said = s.said || (s.said = {});
  const cue = (key, on, name, msg, v) => { if (on && !said[key]){ said[key] = true; B.sfx(name); if (msg) B.say(msg, v, 3200); } else if (!on) said[key] = false; };
  cue('set', s.set, 'ding', 'Vref 0.544 V on the meter: the limit is 1.0 A');
  cue('trip', s.trip, 'sizzle', 'Thermal shutdown: the chip reached 165 °C');
  cue('dead', st.power && dead, 'pop', 'The coil\'s spike went through the A4988');
  cue('low', run && low, 'buzz', 'VMOT {v} V: under the A4988\'s 8 V minimum', { v: r1(vmot0) });
  if (dt > 0 && mixed && live && Math.floor(st.t * 2) !== s.buzzN){ s.buzzN = Math.floor(st.t * 2); B.sfx('buzz'); }
  // a tick each time the shaft completes a turn
  const turns = Math.floor((asked + 1e-6) / 360);
  if (dt > 0 && live && !mixed && s.turns != null && turns > s.turns) B.sfx('tick');
  s.turns = s.mode === st.mode ? turns : null;

  const lv = net => run ? A4.level(pins, net) : 0;
  const levels = { STEP: lv('STEP') > 0 ? 1 : 0, DIR: lv('DIR') > .5 ? 1 : 0, MS1: lv('MS1') > .5 ? 1 : 0, MS2: lv('MS2') > .5 ? 1 : 0, MS3: lv('MS3') > .5 ? 1 : 0 };

  let status;
  if (!st.power) status = 'Unpowered';
  else if (ev.status === 'fault') status = 'Fault: unplug and repair';
  else if (dead) status = 'A4988 killed by the coil spike';
  else if (!run) status = has('missing:LINK') ? 'RST floating: held in reset' : 'Powered, driver idle';
  else if (s.trip) status = 'Thermal shutdown (165 °C)';
  else if (mixed) status = 'Coils mixed: buzzing';
  else if (low) status = 'Under 8 V: steps lost';
  else if (st.mode === 'vref') status = s.set ? 'Holding, limit 1.0 A' : 'Turning the pot';
  else if (moving) status = { full: 'Full step, 1 turn/s', half: 'Half step, 1/2 turn/s', micro: '1/16 step, 1/4 turn/s' }[st.mode] || 'Stepping';
  else status = 'Holding between turns';
  const stats = st.power ? [
    ['Vref', vref.toFixed(3) + ' V'], ['Limit', imax.toFixed(2) + ' A'], ['Each coil', u1.coil_mA + ' mA'], ['Chip', u1.tj + ' °C'],
    ['Shaft', Math.abs(mot.rpm) + ' rpm'], ['Battery', batt.v + ' V'],
  ] : [];
  return {
    readings: { MOT: mot, BATT: batt, MM: mm },
    meas: { U1: u1, MOT: mot, BATT: batt, MM: mm },
    report: { levels },
    status, stats,
    flow: { VMOT: st.power && vmot0 > .5, VDD: vdd > .5, VREF: vdd > .5, STEP: moving, DIR: !!levels.DIR,
      OUT1A: ia > .05, OUT1B: ia < -.05, OUT2A: ib > .05, OUT2B: ib < -.05 },
    accent: s.trip || dead || high ? ['U1'] : mixed ? ['MOT'] : [],
  };
}

// the Nano's sketches: STEP D3 (a 50 % square wave while it steps), DIR D4, MS1-MS3 on D5-D7
const pinsOut = (rate, ms) => (st, t) => ({ D3: rate(t) > 0 ? .5 : 0, D4: 1, D5: ms[0], D6: ms[1], D7: ms[2] });
const modes = {
  vref: { title: 'Hold, set Vref', bytes: 1580, banner: 'hold: coils on, no steps', out: pinsOut(RATE.vref, [0, 0, 0]) },
  full: { title: 'Full step, 1 turn a second', bytes: 1820, out: pinsOut(RATE.full, [0, 0, 0]), serial: k => k % 2 === 1 ? 'full step: 200 steps = 1 turn' : null },
  half: { title: 'Half step', bytes: 1836, out: pinsOut(RATE.half, [1, 0, 0]), serial: k => k % 3 === 2 ? 'half step: 400 steps = 1 turn' : null },
  micro: { title: '1/16 step, a quarter turn a second', bytes: 1852, out: pinsOut(RATE.micro, [1, 1, 1]), serial: k => k > 0 && k % 4 === 0 ? '1/16 step: 3200 steps = 1 turn' : null },
};

const PIN_Z = 1.57 + 6.5;             // a jumper's end on a header pin, above the mat (board 1.57 + pin 8.5 - 2)
const W = (from, to, color, step) => ({ from, to, color, step });
B.bench({
  id: 'a4988', fig: '07', board: 'a4988', pal: 'mint', view: 'board',
  name: 'A4988 stepper driver',
  sub: 'Build the carrier, set its current limit with a meter, then step a NEMA 17 in full, half and 1/16 steps and break it',
  mat: { front: 6, back: 6, left: 6, right: 6 },
  pinMap: PIN_MAP,
  modes, mode: 'vref',
  power: Object.assign({}, B.defs.module.a4988.power, {
    // one switch for the bench: the Nano on USB (VDD), the pack on VMOT; both have to be on the mat
    sources: { bench: Object.assign({}, B.defs.module.a4988.power.sources.bench, { label: 'Nano on USB, 2S LiPo on VMOT', parts: ['NANO', 'BATT'] }) },
    upload: { source: 'bench', needs: [], tool: 'avrdude' },
  }),
  periph: [
    // the Nano in front on the control side, the meter in front on the pot's side, the motor behind with its leads on
    // the motor pins, the pack behind on the right
    { id: 'NANO', board: 'nano', at: [-54, -32], step: 'nano', name: 'Arduino Nano' },
    { id: 'MOT', part: 'nema17', at: [-8, 30], params: { rot: 90, legZ: PIN_Z }, step: 'motor', name: 'NEMA 17 stepper',
      legs: [[13.97, 13.97], [13.97, 11.43], [13.97, 8.89], [13.97, 6.35]] },
    { id: 'BATT', part: 'lipo-2s', at: [44, 14], size: [35, 70], params: { rot: 0 }, step: 'battery', name: '2S LiPo', legs: [[46, 12], [46, 8]] },
    { id: 'MM', part: 'multimeter', at: [22, -42], params: { rot: 90, tipZ: [6, 2.7] }, step: 'meter', name: 'Multimeter',
      legs: [[14.45, 1.27], [8.73, 2.79]] },
  ],
  matSteps: [
    { id: 'nano', label: 'Put the Nano down and wire STEP, DIR, MS1-MS3, VDD and GND' },
    { id: 'motor', label: 'Put the motor down and plug its leads onto 2B, 2A, 1A, 1B' },
    { id: 'battery', label: 'Put the LiPo down and wire VMOT and GND' },
    { id: 'meter', label: 'Put the meter down: red probe on the pot, black on GND' },
  ],
  wires: [
    W('H1.1', 'NANO.D4', 'blue', 'nano'), W('H1.2', 'NANO.D3', 'yellow', 'nano'),
    W('H1.7', 'NANO.D5', 'white', 'nano'), W('H1.6', 'NANO.D6', 'grey', 'nano'), W('H1.5', 'NANO.D7', 'purple', 'nano'),
    W('H2.2', 'NANO.5V', 'red', 'nano'), W('H2.1', 'NANO.GND', 'black', 'nano'),
    W('H2.8', 'BATT.+', 'red', 'battery'), W('H2.7', 'BATT.-', 'black', 'battery'),
  ],
  faults: [['unplug-live', 'Unplug the motor while it runs'], ['coils-mixed', 'Mix up the coil pairs'], ['limit-too-high', 'Turn the limit up to 1.68 A']],
  model,
});
})();
