// @cf title HC-SR04 parking sensor
// @cf use engine/bench.list
// @cf use parts/piezo-buzzer.js
// @cf use boards/nano.js
// @cf use modules/hc-sr04.js
/* Robotics Bench Fig. 10: the classic HC-SR04 (figures/modules/hc-sr04.js) pinged by an Arduino Nano, with a piezo
   buzzer on D8: a robot's eyes for the wall ahead. Wiring as the Learn Arduino lesson: Vcc to the Nano's 5V, Trig to
   D9, Echo to D10, Gnd to GND; the buzzer's + on D8, - on GND. Facts: docs/facts/hcsr04.md (10 us trigger, 58 us per
   cm, 2 cm to 4 m, about 38 ms of Echo when nothing comes back, 5 V only, the failure table in section 6).
   The module page owns the sound: its programs (and these sketches, which keep their ids) put a wall at 30 cm, a hand
   coming from 1 m to 5 cm, a cushion at 40 cm or nothing in front, and its rings leave T and come back down onto R.
   What the Nano reads each ping is the module's own reading; this file adds what the sketches make of it: the parking
   beeper and, for the "no timeout" break, the board's 38 ms timeout read as a distance. */
(() => {
const B = SL.bench;
const base = B.defs.module['hc-sr04'];
const BEEP = 2000, NO_ECHO_US = 38000;

// one ping as the Nano reads it: cm, or null for "no echo" (the module page's reading, so the rings and the numbers agree)
const pingAt = (st, k) => {
  const r = base.modes[st.mode] ? base.modes[st.mode].serial(k, st) : 'no echo';
  return r === 'no echo' ? null : parseFloat(r);
};
const noTimeout = st => (st.faults || []).includes('no-timeout');
// with no timeout, pulseIn waits out the board's own 38 ms and the sketch prints that as a distance
const shown = (cm, st) => (cm != null ? cm.toFixed(2) + ' cm' : noTimeout(st) ? (NO_ECHO_US / 58).toFixed(2) + ' cm' : 'no echo');
// the beeper: continuous under 10 cm, a 50 ms beep every cm x 10 ms up to 1 m, quiet beyond or with no echo
const beepOf = (cm, t) => (cm == null || cm > 100 ? false : cm < 10 ? true : (t * 1000) % (cm * 10) < 50);

const ping = (k, st) => shown(pingAt(st, k), st);
// Trig's 10 us pulse and Echo's round trip, stretched so they show on the wires
const out = (st, t) => { const ph = t % 1; return { D9: ph < .08 ? 1 : 0, D10: ph >= .5 && ph < .62 && pingAt(st, Math.floor(t)) != null ? 1 : 0 }; };
const modes = {
  wall: { title: 'Ping and print', bytes: 2340, banner: 'hc-sr04: one ping a second', out, serial: ping },
  approach: { title: 'Parking beeper', bytes: 3412, banner: 'parking sensor: beeps faster as you get closer', out,
    serial: (k, st) => {
      const cm = pingAt(st, k);
      if (cm == null) return 'no echo';
      return cm.toFixed(2) + (cm < 10 ? ' cm: STOP' : cm <= 100 ? ` cm: beep every ${Math.floor(cm * 10)} ms` : ' cm');
    } },
  cushion: { title: 'Ping a cushion', bytes: 2340, banner: 'hc-sr04: one ping a second', out, serial: ping },
  open: { title: 'Nothing in range', bytes: 2340, banner: 'hc-sr04: one ping a second', out, serial: ping },
};

function model(st){
  const ev = st.ev || { rails: {} }, faults = st.faults || [];
  const run = ev.status === 'running' && !st.up && st.t >= 0;
  const t = st.t || 0, cm = run ? pingAt(st, Math.floor(t)) : null;
  const beep = run && st.mode === 'approach' && beepOf(cm, t);
  const vcc = (ev.rails && ev.rails.VCC) || 0;
  let status = 'Unpowered';
  if (st.power && ev.status === 'no-power') status = faults.includes('short:VCC:GND') ? 'Short on VCC: the Nano\'s USB fuse trips' : 'No power: set out the Nano';
  else if (st.power && ev.status === 'fault') status = 'Fault: unplug and repair';
  else if (st.power && !run) status = ev.why || 'Powered, nothing running';
  else if (vcc < 4.5) status = ['VCC at {v} V: the burst is too weak, no echo', { v: vcc.toFixed(1) }];
  else if (!B.isSet('R')) status = 'No receiver: the burst goes out, nothing hears it';
  else if (faults.includes('cold:J1.3')) status = cm == null ? 'Echo lost at the cold joint' : ['{cm} cm, when the Echo joint makes contact', { cm: cm.toFixed(1) }];
  else if (noTimeout(st) && cm == null) status = 'No timeout: the board\'s own 38 ms reads as 655 cm';
  else if (st.mode === 'wall') status = cm == null ? 'Wall: no echo this time' : ['Wall at {cm} cm', { cm: cm.toFixed(1) }];
  else if (st.mode === 'approach') status = cm == null ? 'Nothing in range: quiet' : cm < 10 ? ['Hand at {cm} cm: STOP', { cm: Math.round(cm) }] : cm <= 100 ? ['Hand at {cm} cm: beep every {ms} ms', { cm: Math.round(cm), ms: Math.floor(cm * 10) }] : ['Hand at {cm} cm: quiet', { cm: Math.round(cm) }];
  else if (st.mode === 'cushion') status = cm == null ? 'Cushion: the sound soaks in, no echo' : ['Cushion: an echo from the wall behind, {cm} cm', { cm: Math.round(cm) }];
  else status = 'Nothing in range: every ping times out';
  const us = cm != null ? Math.round(cm * 58) : NO_ECHO_US;
  // the rows stay while the bench is powered, so the stats column keeps its narrow, wrapping layout in a fault too
  const stats = [['Distance', run ? (cm != null ? cm.toFixed(1) + ' cm' : 'no echo') : '–'], ['Echo', run ? (us / 1000).toFixed(2) + ' ms' : '–']];
  return {
    readings: { BUZ: { f: beep ? BEEP : 0, v: 0 } },
    report: { sonar: { cm: cm != null ? Math.round(cm * 10) / 10 : null, echo: run && cm != null, us: run ? us : null, beep } },
    status, stats,
    flow: { VCC: run, TRIG: run, ECHO: run && cm != null },
    accent: beep ? ['BUZ'] : [],
  };
}

const W = (from, to, color, step) => ({ from, to, color, step });
B.bench({
  id: 'hc-sr04', fig: '10', board: 'hc-sr04', pal: 'cobalt', view: 'board',
  name: 'HC-SR04 parking sensor',
  sub: 'Build the HC-SR04, ping it from a Nano, then make a buzzer beep faster as a hand comes closer',
  mat: { front: 12, back: 9, left: 9, right: 9 },
  pinMap: { D9: 'TRIG', D10: 'ECHO' },
  modes, mode: 'wall',
  power: Object.assign({}, base.power, {
    // the Nano on USB: its 5V pin feeds Vcc through the header
    sources: { bench: { label: 'Nano on USB, 5V to Vcc', pin: 'VCC', v: 5, range: [4.5, 5.5], max: 6, parts: ['NANO'] } },
    default: 'bench',
    rails: { VCC: { from: [{ src: 'bench', via: ['J1'], burns: 'U1' }], max: 6 } },
    upload: { source: 'bench', needs: [], tool: 'none' },
  }),
  periph: [
    { id: 'NANO', board: 'nano', at: [-8, -46], step: 'nano', name: 'Arduino Nano' },
    { id: 'BUZ', part: 'piezo-buzzer', at: [50, -36], step: 'buzzer', name: 'Piezo buzzer on D8' },
  ],
  matSteps: [
    { id: 'nano', label: 'Put the Nano down and wire Vcc, Trig, Echo and Gnd' },
    { id: 'buzzer', label: 'Put the buzzer down: + to D8, - to GND' },
  ],
  wires: [
    W('J1.1', 'NANO.5V', 'red', 'nano'), W('J1.2', 'NANO.D9', 'yellow', 'nano'), W('J1.3', 'NANO.D10', 'green', 'nano'), W('J1.4', 'NANO.GND', 'black', 'nano'),
    W('BUZ.+', 'NANO.D8', 'orange', 'buzzer'), W('BUZ.-', 'NANO.GND', 'black', 'buzzer'),
  ],
  faults: [['wrong-voltage:bench:3.3', 'Vcc on the Nano\'s 3V3 pin'], ['no-timeout', 'pulseIn() with no timeout']],
  model,
});
})();
