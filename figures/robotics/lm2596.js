// @cf title LM2596 buck converter
// @cf use engine/bench.list
// @cf use parts/tt-motor.js
// @cf use parts/lipo-2s.js
// @cf use parts/multimeter.js
// @cf use modules/lm2596.js
/* Robotics Bench Fig. 12: the blue LM2596 buck module (the board you build: figures/modules/lm2596.js, with its
   converter model, the trimmer and the voltmeter) between a 2S LiPo and a TT gear motor, with a pocket multimeter's
   probes on the output screws. Set out one step at a time: the pack on IN+ / IN-, the meter on OUT+ / OUT- (20 V DC),
   then, once the output is set with nothing on it, the motor on OUT+ / OUT-. That is the order the fact sheet's
   procedure gives (docs/facts/lm2596.md §5): set the voltage with the output open, power off, connect the load.
   The trimmer arrives at the top of its 25 turns, asking for 38.5 V: until it is turned down past about 4.3 turns the
   output just follows the input, a volt under it. The modes are you with a screwdriver: as delivered, 5 V, 3.3 V, and
   "12 V", which a buck cannot make from 8.4 V.
   The model: B.lm2596.step (the module) with the motor as the load (parts/tt-motor.js, 4 Ω winding, about 0.15 A free
   at 5 V, 1.25 A held), plus the breaks the engine does not know: the trimmer's wiper open (FB at 0 V, flat out),
   the motor held (the rail holds: 1.25 A is far under the 4.2 A limit, the battery current climbs), and the output
   shorted (current limit; the SS34 carries almost all of it, cooks and fails). */
(() => {
const B = SL.bench;
const LM = B.lm2596, MOT = B.parts['tt-motor'].model;
const r2 = v => Math.round(v * 100) / 100;
const onMat = (st, id) => { const mat = B.matSetup(), it = mat.byId[id]; return !!it && mat.steps.findIndex(s => s.id === it.step) <= st.matStep; };

function model(st, dt){
  const faults = st.faults || [], has = id => faults.includes(id), ev = st.ev || {};
  const held = has('stall'), short = has('short-out'), fbOpen = has('cold:RV1');
  const motor = onMat(st, 'MOT'), meter = onMat(st, 'MM');
  const load = v => motor ? Math.abs(MOT.steady(v, held).i) : 0;
  const r = LM.step(st, dt, load, { fbOpen, short });
  const { s, c, vin } = r, vout = c.vout, live = st.power && r.run;
  const mo = motor && !short && vout > 0 ? MOT.steady(vout, held) : { rpm: 0, i: 0 };
  const mot = { state: !motor || !live || vout < .6 || short ? 'off' : held ? 'stall' : vout > 6.5 ? 'over' : 'ok', v: r2(motor && !short ? vout : 0),
    i_mA: Math.round(Math.abs(mo.i) * 1000), rpm: Math.round(Math.abs(mo.rpm)) };
  const rev = has('reverse-polarity:bench');
  const batt = { state: rev ? 'reverse' : st.power && vin < 6 ? 'low' : 'ok', v: r2(vin), i_mA: Math.round(c.iin * 1000) };
  const mm = { state: meter && st.power ? 'ok' : 'off', text: vout.toFixed(2), unit: 'V', range: meter && st.power ? '20V' : 'off' };
  const u1 = { vout: r2(vout), vset: r2(r.vs), duty: r2(c.d), turns: r2(s.turns), set: s.set, sat: c.sat, limited: c.limited, eff: r2(c.eff),
    iout_mA: Math.round(c.i * 1000), iin_mA: Math.round(c.iin * 1000), loss: r2(c.pU1 + c.pD1 + c.pL1), tj: Math.round(s.tj), trip: s.trip };

  // sound and a toast, once each time a condition starts
  const said = s.said || (s.said = {});
  const cue = (key, on, name, msg, v) => { if (on && !said[key]){ said[key] = true; B.sfx(name); if (msg) B.say(msg, v, 3400); } else if (!on) said[key] = false; };
  cue('set', live && s.set && st.mode !== 'set12', 'ding', 'The meter reads {v} V', { v: vout.toFixed(2) });
  cue('sat', live && c.sat && !fbOpen && st.mode !== 'found' && (st.mode !== 'set12' || s.set), 'buzz', 'Asked for {v} V from {vin} V: a buck only steps down', { v: Math.min(r.vs, 99).toFixed(1), vin: vin.toFixed(1) });
  cue('fb', live && fbOpen, 'pop', 'The trimmer\'s wiper is off: FB sees 0 V and the output jumps to the input');
  cue('short', live && short, 'sizzle', 'OUT shorted: the LM2596 holds 4.2 A, the SS34 carries it');
  cue('d1', s.d1dead, 'pop', 'The SS34 burned out');
  cue('trip', s.trip, 'sizzle', 'Thermal shutdown');
  cue('stall', live && held && motor, 'buzz', 'Motor held: {n} mA, and the rail holds', { n: mot.i_mA });
  const whole = Math.floor(s.turns + 1e-6);
  if (dt > 0 && s.lastWhole != null && whole !== s.lastWhole && live) B.sfx('tick');
  s.lastWhole = whole;

  let status;
  if (!st.power) status = 'Unpowered';
  else if (ev.status === 'fault') status = 'Fault: unplug and repair';
  else if (ev.status === 'brownout' || !r.run) status = 'Input too low';
  else if (s.d1dead) status = 'SS34 burned: no output';
  else if (s.trip) status = 'Thermal shutdown';
  else if (short) status = 'Output shorted: current limit';
  else if (fbOpen) status = 'Feedback open: OUT follows IN';
  else if (c.sat) status = 'Vset > Vin: 100 % duty';
  else if (LM.TARGET[st.mode] != null && !s.set) status = 'Turning the trimmer';
  else if (held && motor) status = 'Motor held: the rail holds';
  else status = 'Regulating';                  // the voltage is in the stats; the status stays one translatable string
  const stats = st.power ? [
    ['IN', vin.toFixed(2) + ' V · ' + batt.i_mA + ' mA'], ['OUT', vout.toFixed(2) + ' V · ' + u1.iout_mA + ' mA'],
    ['Duty', Math.round(c.d * 100) + ' %'], ['Efficiency', Math.round(c.eff * 100) + ' %'], ['LM2596', u1.tj + ' °C'], ['Trimmer', ['{n} turns', { n: s.turns.toFixed(1) }]],
  ] : [];
  return {
    readings: { MOT: mot, BATT: batt, MM: mm },
    meas: { U1: u1, DS1: r.disp, D1: { dead: s.d1dead, tc: Math.round(s.td) }, MOT: mot, BATT: batt, MM: mm },
    status, stats,
    flow: { VIN: vin > .5, SW: vout > .1 || short, VOUT: vout > .1, FB: vout > .1 && !fbOpen },
    accent: s.d1dead || short ? ['D1'] : s.trip ? ['U1'] : fbOpen ? ['RV1'] : held && motor ? ['MOT'] : [],
  };
}

// the screwdriver on the trimmer: each mode turns it toward a voltage (the module's B.lm2596.TARGET)
const mode = (id, title, powerMsg) => ({ title, instant: true, bytes: 0, out: LM.leds, banner: LM.BANNER, serial: LM.notes(id), ...(powerMsg ? { powerMsg } : {}) });
const modes = {
  found: mode('found', 'Trimmer as delivered', 'IN+ live: the display shows the input, the trimmer is still at the top'),
  set5: mode('set5', 'Turn the trimmer to 5 V'),
  set33: mode('set33', 'Turn the trimmer to 3.3 V'),
  set12: mode('set12', 'Turn the trimmer to 12 V'),
};

const W = (from, to, color, step) => ({ from, to, color, step });
B.bench({
  id: 'lm2596', fig: '12', board: 'lm2596', pal: 'cobalt', view: 'board',
  name: 'LM2596 buck converter',
  sub: 'Build the module, set 5 V with a meter before anything is on the output, run a motor from it, then break it',
  mat: { front: 6, back: 6, left: 6, right: 6 },
  modes, mode: 'found',
  power: Object.assign({}, B.defs.module.lm2596.power, {
    sources: { bench: Object.assign({}, B.defs.module.lm2596.power.sources.bench, { label: '2S LiPo on IN+ / IN-', parts: ['BATT'] }) },
  }),
  periph: [
    // the pack on the left of the input terminal, the meter in front of the output, the motor on the right
    { id: 'BATT', part: 'lipo-2s', at: [-86, 0], params: { rot: 0 }, step: 'battery', name: '2S LiPo', legs: [[-12, 21], [-12, 14]] },
    { id: 'MM', part: 'multimeter', at: [30, -48], params: { rot: 90, tipZ: 14.9 }, step: 'meter', name: 'Multimeter', legs: [[62.8, 14.95], [62.8, 19.95]] },
    { id: 'MOT', part: 'tt-motor', at: [76, -6], params: { rot: 0 }, step: 'motor', name: 'TT gear motor' },
  ],
  matSteps: [
    { id: 'battery', label: 'Put the LiPo down and wire IN+ and IN-' },
    { id: 'meter', label: 'Put the meter down: probes on OUT+ and OUT-, 20 V DC' },
    { id: 'motor', label: 'Put the motor down and wire it to OUT+ and OUT-' },
  ],
  wires: [
    W('J1.1', 'BATT.+', 'red', 'battery'), W('J1.2', 'BATT.-', 'black', 'battery'),
    W('J2.2', 'MOT.+', 'red', 'motor'), W('J2.1', 'MOT.-', 'black', 'motor'),
  ],
  faults: [['wrong-voltage:bench:5.5', 'Run the pack flat (5.5 V)'], ['cold:RV1', 'Cold joint on the trimmer\'s wiper'], ['stall', 'Hold the wheel'],
    ['short-out', 'Short OUT+ to OUT-']],
  model,
});
})();
