// @cf title MPU-6050 tilt alarm
// @cf use engine/bench.list
// @cf use parts/piezo-buzzer.js
// @cf use boards/nano.js
// @cf use modules/mpu6050.js
/* Robotics Bench Fig. 09: the GY-521 MPU-6050 breakout (figures/modules/mpu6050.js) read by an Arduino Nano over raw
   Wire calls, with a piezo buzzer on D8: a robot's tilt sensor. Wiring: VCC to the Nano's 5V (the board's 662K makes
   3.3 V), GND, SCL to A5, SDA to A4; the buzzer's + on D8, - on GND. Facts: docs/facts/mpu6050.md (asleep at power-up,
   16384 counts per g at +-2 g, 131 counts per deg/s at +-250 deg/s, the failure table in section 6).
   The model: the module's own rocking (30° about X every 5 s while the Tilt alarm runs, level otherwise) is what the
   chip feels; the sketch reads 14 bytes from 0x3B and takes roll = atan2(ay, az). When nobody answers at 0x68 (AD0
   floating, a cold SDA joint) Wire.read() returns -1 for every byte, every value reads -1 count and the roll comes out
   at -135°: the alarm goes off on a robot standing still. */
(() => {
const B = SL.bench;
const base = B.defs.module.mpu6050;
const BIAS = 2.4, LIMIT = 20, BEEP = 2000;      // gyro zero-rate offset (deg/s, as the module page), alarm angle, tone Hz
const deg = r => r * 180 / Math.PI;
const fx = (v, n = 2) => (v < 0 ? '-' : '') + Math.abs(v).toFixed(n);   // as Serial.print(float) does: -0.00 for a tiny negative

// what the chip feels: the module's own rocking for the Tilt alarm, level otherwise
const rollAt = (mode, t) => (mode === 'tilt' ? 30 * Math.sin(2 * Math.PI * t / 5) : 0);
const rateAt = (mode, t) => (mode === 'tilt' ? 30 * 2 * Math.PI / 5 * Math.cos(2 * Math.PI * t / 5) : 0);
const addrOf = () => (B.isSet('R6') ? 0x68 : 0x69);
// a cold SDA joint drops about one read in three
const dropped = (st, t) => (st.faults || []).includes('cold:H1.4') && Math.floor(t * 3.3) % 3 === 1;

// one read as the sketch sees it at time t: counts turned into g and deg/s, -1 everywhere when nobody answers
function sample(st, t){
  const mode = st.mode, awake = mode === 'flat' || mode === 'tilt';
  if (addrOf() !== 0x68 || dropped(st, t)) { const v = -1 / 16384; return { ax: v, ay: v, az: v, gx: -1 / 131, ok: false }; }
  if (!awake) return { ax: 0, ay: 0, az: 0, gx: 0, ok: true };
  const th = rollAt(mode, t) * Math.PI / 180;
  const gx = B.isSet('C14') ? rateAt(mode, t) + BIAS : 40 * Math.sin(t * 17.3) + 25 * Math.sin(t * 5.1 + 1);
  return { ax: 0, ay: Math.sin(th), az: Math.cos(th), gx, ok: true };
}
const rollOf = s => deg(Math.atan2(s.ay, s.az));
const alarmOf = (st, s) => st.mode === 'tilt' && Math.abs(rollOf(s)) > LIMIT;

const raw = (k, st) => { const s = sample(st, st.t); return `ax ${fx(s.ax)} ay ${fx(s.ay)} az ${fx(s.az)} g | gx ${fx(s.gx, 1)} deg/s`; };
const modes = {
  flat: { title: 'Raw readings', bytes: 4598, banner: 'mpu6050: awake, +-2 g, +-250 deg/s', out: () => ({ A4: 1, A5: 1 }), serial: raw },
  tilt: { title: 'Tilt alarm', bytes: 5874, banner: 'tilt alarm: beeps past 20 deg', out: () => ({ A4: 1, A5: 1 }),
    serial: (k, st) => { const s = sample(st, st.t); return `roll ${Math.round(rollOf(s))} deg${alarmOf(st, s) ? ' ALARM' : ''}`; } },
  asleep: { title: 'Never woken', bytes: 4466, banner: 'mpu6050: reading without waking it', out: () => ({ A4: 1, A5: 1 }), serial: raw },
  scan: { title: 'I2C scan', bytes: 4682, banner: 'I2C scanner', out: () => ({ A4: 1, A5: 1 }),
    serial: (k, st) => (dropped(st, st.t) ? 'No I2C devices found' : `I2C device found at address 0x${addrOf().toString(16)} !`) },
};

function model(st){
  const ev = st.ev || { rails: {} }, faults = st.faults || [];
  const run = ev.status === 'running' && !st.up && st.t >= 0;
  const s = sample(st, st.t || 0), roll = rollOf(s), alarm = run && alarmOf(st, s);
  const addr = addrOf(), wrongAddr = addr !== 0x68;
  let status = 'Unpowered';
  if (st.power && ev.status === 'no-power') status = 'No power: set out the Nano';
  else if (st.power && ev.status === 'fault') status = 'Fault: unplug and repair';
  else if (st.power && !run) status = 'Powered, nothing running';
  else if (st.mode === 'scan') status = dropped(st, st.t) ? 'I2C scan: nothing answered this time' : ['I2C scan: 0x{addr} answers', { addr: addr.toString(16) }];
  else if (wrongAddr) status = 'No answer at 0x68: AD0 floats, the chip is at 0x69';
  else if (!s.ok) status = 'I2C read failed: every byte reads -1';
  else if (st.mode === 'asleep') status = 'Asleep: every reading is 0';
  else if (!B.isSet('C14')) status = 'Gyro noise: no CPOUT capacitor';
  else if (st.mode === 'tilt') status = alarm ? ['Roll {deg}°: ALARM', { deg: Math.round(roll) }] : ['Roll {deg}°: level enough', { deg: Math.round(roll) }];
  else status = ['Level: az {az} g, gx {gx} °/s', { az: s.az.toFixed(2), gx: s.gx.toFixed(1) }];
  // the rows stay while the bench is powered, so the stats column keeps its narrow, wrapping layout in a fault too
  const shown = v => (run ? v : '–');
  const stats = [['Roll', shown(Math.round(roll) + '°')], ['az', shown(s.az.toFixed(2) + ' g')], ['gx', shown(s.gx.toFixed(1) + ' °/s')], ['Address', '0x' + addr.toString(16)]];
  return {
    readings: { BUZ: { f: alarm ? BEEP : 0, v: 0 } },
    report: { imu: { roll: run ? Math.round(roll) : null, az: run ? Math.round(s.az * 100) / 100 : null, gx: run ? Math.round(s.gx * 10) / 10 : null,
      addr: '0x' + addr.toString(16), alarm, faulty: run && !s.ok } },
    status, stats,
    flow: { VCC: !!st.power && run, '3V3': run, SDA: run, SCL: run },
    accent: alarm ? ['BUZ'] : [],
  };
}

const W = (from, to, color, step) => ({ from, to, color, step });
B.bench({
  id: 'mpu6050', fig: '09', board: 'mpu6050', pal: 'mustard', view: 'board',
  name: 'MPU-6050 tilt alarm',
  sub: 'Build the GY-521, read it over I2C from a Nano, then make a buzzer warn when the robot tips past 20°',
  mat: { front: 9, back: 9, left: 12, right: 9 },
  pinMap: { A4: 'SDA', A5: 'SCL' },
  modes, mode: 'flat',
  power: Object.assign({}, base.power, {
    // the Nano on USB: its 5V pin feeds VCC through the header
    sources: { bench: { label: 'Nano on USB, 5V to VCC', pin: 'VCC', v: 5, range: [3.5, 5.5], max: 6, parts: ['NANO'] } },
    default: 'bench',
    rails: {
      VCC: { from: [{ src: 'bench', via: ['H1'], burns: 'U2' }], max: 6, victim: 'U2' },
      '3V3': { from: [{ rail: 'VCC', via: ['U2', 'C3'], reg: 3.3, dropout: .25 }], max: 3.46 },
    },
    upload: { source: 'bench', needs: [], tool: 'none' },
  }),
  periph: [
    { id: 'NANO', board: 'nano', at: [-58, 1], step: 'nano', name: 'Arduino Nano' },
    { id: 'BUZ', part: 'piezo-buzzer', at: [22, 2], step: 'buzzer', name: 'Piezo buzzer on D8' },
  ],
  matSteps: [
    { id: 'nano', label: 'Put the Nano down and wire VCC, GND, SCL and SDA' },
    { id: 'buzzer', label: 'Put the buzzer down: + to D8, - to GND' },
  ],
  wires: [
    W('H1.1', 'NANO.5V', 'red', 'nano'), W('H1.2', 'NANO.GND', 'black', 'nano'), W('H1.3', 'NANO.A5', 'yellow', 'nano'), W('H1.4', 'NANO.A4', 'blue', 'nano'),
    W('BUZ.+', 'NANO.D8', 'orange', 'buzzer'), W('BUZ.-', 'NANO.GND', 'black', 'buzzer'),
  ],
  faults: [['wrong-voltage:bench:7.4', 'A 2S LiPo (7.4 V) on VCC']],
  model,
});
})();
