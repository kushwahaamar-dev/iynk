// @cf title MPU-6050 accelerometer and gyroscope (GY-521)
// @cf use engine/bench.list
/* GY-521 breakout with a TDK InvenSense MPU-6050 (docs/facts/mpu6050.md). No maker publishes a design file: the
   15.6 x 20.3 mm outline and hole positions are the Fritzing part's and a measured photo's, every part centre is from
   that photo (+-0.3 mm), the nets from the "MPU6050-V1-SCH" schematic. Board frame: header along the left edge at
   x = 1.4, VCC at the top (y = 19.03) down to INT (y = 1.25), the two mounting holes on the right. Populated the common
   way: a 662K (Torex XC6206P332) 3.3 V regulator, 4.7 kOhm ("472") I2C pull-ups to 3.3 V and AD0 pull-down (address
   0x68), a 1 kOhm ("102") power LED resistor, a 10 uF tantalum on 3.3 V. Which unmarked 0603 capacitor is which
   (regulator in/out, decoupling, REGOUT, CPOUT) is read from the routing, not printed on the board.
   How it works: VCC (3.5-5.5 V; 5 V preferred) feeds the 662K, whose 3.3 V runs the chip, the LED and the pull-ups,
   so SDA and SCL idle at 3.3 V even on a 5 V Arduino. The chip powers up asleep (PWR_MGMT_1 = 0x40): every reading is
   0 until the host writes 0 or 1 there. At +-2 g the accelerometer gives 16384 counts per g, at +-250 deg/s the gyro
   131 counts per deg/s; an uncalibrated gyro reads its bias at rest (a few deg/s; the spec allows +-20). The built-in
   programs are what a host sketch prints from it: lying flat, rocking about X, never woken, and an I2C scan.
   No reverse-polarity diode, no fuse: VCC reversed or above the 662K's 6 V burns the regulator. The CPOUT capacitor
   feeds the gyro's charge pump: without it the gyro is noise. Without the AD0 pull-down the pin floats and the chip
   answers at 0x69; a cold joint on the SDA pin drops some reads. See-through: two dies in the QFN, the CMOS chip
   with the MEMS die bonded on it, and the arrow of gravity as the accelerometer sees it. */
(() => {
const B = SL.bench;
const BIAS = 2.4;                       // deg/s: the gyro's zero-rate offset at rest, uncalibrated
const PIN_Y = [19.03, 16.49, 13.95, 11.41, 8.87, 6.33, 3.79, 1.25];

/* roll (deg) about the board's X axis for each built-in program, and its rate */
const roll = (mode, t) => mode === 'tilt' ? 30 * Math.sin(2 * Math.PI * t / 5) : 0;
const rollRate = (mode, t) => mode === 'tilt' ? 30 * 2 * Math.PI / 5 * Math.cos(2 * Math.PI * t / 5) : 0;
const awake = st => st.mode === 'flat' || st.mode === 'tilt';
// a gyro without its CPOUT capacitor has no drive voltage: what comes out is noise
const gyroX = (st, t) => B.isSet('C14') ? rollRate(st.mode, t) + BIAS : 40 * Math.sin(t * 17.3) + 25 * Math.sin(t * 5.1 + 1);
const fx = (v, n = 2) => ' ' + v.toFixed(n);

/* the MPU-6050 QFN plus, while the host reads it, the gravity vector the accelerometer sees above it */
B.kind('gy521-imu', {
  group: 'smd', size: () => [4, 4], h: .9,
  draw(ctx){
    B.kinds.qfn.draw(ctx);
    const st = ctx.st, h = ctx.p.h;
    if (!st.ev || st.ev.status !== 'running' || !awake(st)) return;
    const th = roll(st.mode, st.t) * Math.PI / 180, L = 9;
    // the sensor's +Y is the board's +y, +Z out of the top: gravity reads (0, sin, cos) when rolled about X
    const tip = [0, L * Math.sin(th), h + .2 + L * Math.cos(th)];
    let s = ctx.rod([0, 0, h + .2], tip, .35, matOf('#f08a2b'), toneI, .5);
    const [X, Y] = P(...ctx.W(...tip));
    s += `<circle cx="${f(X)}" cy="${f(Y)}" r="1.6" fill="#f08a2b" stroke="${INK}" stroke-width=".6"/>`;
    ctx.put(ctx.B(-1, -L, h, 1, L, h + L + .5), s);
  },
  xr: ctx => B.kinds.qfn.xr(ctx),
  xrLabel: () => 'MEMS DIE ON CMOS DIE',
});

const r603 = (id, name, at, label) => ({ id, kind: 'chip', name, at, size: [1.6, .8], h: .45, label });
const c603 = (id, name, at, rot = 0) => ({ id, kind: 'chip', name, at, rot, size: [1.6, .8], h: .8, cap: true });

// one line of the host sketch's output; k counts the lines, st.t is the time the arrow above the chip uses
const reading = (st, k) => {
  if (st.faults.includes('cold:H1.4') && k % 3 === 1) return 'I2C error: no ACK from 0x68 (Wire.endTransmission() = 2)';
  if (st.mode === 'scan') return B.isSet('R6') ? 'I2C device found at address 0x68 !' : 'I2C device found at address 0x69 !';
  if (!awake(st)) return 'ax 0.00 ay 0.00 az 0.00 g | gx 0.0 deg/s | 36.5 C';
  const th = roll(st.mode, st.t) * Math.PI / 180;
  return 'ax' + fx(0) + ' ay' + fx(Math.sin(th)) + ' az' + fx(Math.cos(th)) + ' g | gx' + fx(gyroX(st, st.t), 1) + ' deg/s | ' + (27.2 + Math.min(1.5, st.t * .05)).toFixed(1) + ' C';
};
const program = title => ({ title, instant: true, bytes: 0, out: () => ({}), serial: (k, st) => reading(st, k) });

B.module({
  id: 'mpu6050', fig: '09', name: 'MPU-6050 accelerometer and gyroscope (GY-521)',
  sub: 'A 6-axis motion sensor on I2C (0x68): 3-axis gyroscope, 3-axis accelerometer and a 3.3 V regulator',
  pcb: { w: 15.6, h: 20.3, thick: 1.6, r: 0, color: '#1d63c6', silk: '#f2f4f6', standoff: 8.5 },
  mat: { front: 9, back: 9, left: 12, right: 9 }, height: 12, pal: 'cobalt', logic: 3.3,
  holes: [[12.9, 17.9, 3], [12.9, 2.7, 3]],
  silk: [
    ...['VCC', 'GND', 'SCL', 'SDA', 'XDA', 'XCL', 'AD0', 'INT'].map((t, i) => [3.7, PIN_Y[i], t, 1.1]),
    [14.6, 10.3, 'ITG/MPU', 1.2, 90], [8.2, 1.2, 'X →', .9], [11.2, 3.4, 'Y ↑', .9],
  ],
  traces: [
    [[1.4, 19.03], [4.2, 19.03], [6.6, 17.8]], [[8.6, 18.9], [10.3, 18.5], [10.3, 15.4], [9.6, 12.7]],
    [[1.4, 13.95], [4.6, 13.95], [6.5, 11.7]], [[1.4, 11.41], [4.6, 11.41], [6.5, 11.2]],
    [[1.4, 3.79], [4.4, 3.79], [6.7, 5.1]], [[1.4, 1.25], [7.5, 1.25], [8.4, 8.7]],
  ],
  parts: [
    { id: 'IC1', kind: 'gy521-imu', name: 'MPU-6050 motion sensor: 3-axis gyro and accelerometer (4 x 4 mm QFN)', short: 'MPU-6050',
      at: [8.5, 10.7], size: [4, 4], h: .9, n: 6, label: 'MPU-6050',
      nets: { 1: 'GND', 6: 'XDA', 7: 'XCL', 8: '3V3', 9: 'AD0', 12: 'INT', 13: '3V3', 18: 'GND', 23: 'SCL', 24: 'SDA' } },
    { id: 'U2', kind: 'sot23', name: '3.3 V regulator (662K, XC6206): VCC to 3.3 V, 6 V at most', short: '3V3 REG', at: [7.6, 18.9], rot: 90, label: '662K' },
    { id: 'C10', kind: 'tant', name: '10 µF tantalum capacitor on 3.3 V', short: '10 µF', at: [12.7, 10.3], rot: 90, size: [3.2, 1.6], h: 1.6,
      polar: { fault: 'hot', rail: '3V3', opts: ['+ stripe at the top, as printed', '+ stripe at the bottom (backwards)'] } },
    c603('C3', '4.7 µF capacitor: regulator input', [6.7, 16.7]),
    c603('C2', 'Capacitor: regulator output', [10.3, 18.5], 90),
    c603('C12', '100 nF decoupling capacitor (VDD)', [10.1, 15.4]),
    c603('C102', '100 nF decoupling capacitor (VDD)', [10.1, 14.0]),
    c603('C13', '100 nF capacitor on REGOUT (the chip\'s own regulator)', [6.7, 6.6]),
    c603('C14', '2.2 nF capacitor on CPOUT (the gyro\'s charge pump)', [10.1, 6.6]),
    r603('R4', '4.7 kΩ SDA pull-up to 3.3 V', [6.7, 15.4], '472'),
    r603('R5', '4.7 kΩ SCL pull-up to 3.3 V', [6.7, 14.0], '472'),
    r603('R6', '4.7 kΩ AD0 pull-down (address 0x68)', [6.7, 5.1], '472'),
    r603('R201', '1 kΩ resistor for the power LED', [10.1, 5.1], '102'),
    { id: 'D1', kind: 'led', name: 'Power LED (red)', short: 'POWER LED', at: [6.7, 3.6], size: [1.6, .8], h: .6, led: { color: '#e2483d', rail: '3V3', via: ['R201'] } },
    { id: 'H1', kind: 'male', name: '8-pin header: VCC GND SCL SDA XDA XCL AD0 INT', short: 'HEADER', side: 'bottom',
      at: [1.4, 10.14], rot: 270, h: 8.5, pins: ['VCC', 'GND', 'SCL', 'SDA', 'XDA', 'XCL', 'AD0', 'INT'] },
  ],
  power: {
    sources: {
      v5: { label: '5 V from the board', pin: 'VCC', v: 5, range: [3.5, 5.5], max: 6 },
      v33: { label: '3.3 V from the board', pin: 'VCC', v: 3.3, range: [3.5, 5.5], max: 6 },
    },
    default: 'v5',
    rails: {
      VCC: { from: [{ src: 'v5', via: ['H1'], burns: 'U2' }, { src: 'v33', via: ['H1'], burns: 'U2' }], max: 6 },
      '3V3': { from: [{ rail: 'VCC', via: ['U2', 'C3'], reg: 3.3, dropout: .25 }], max: 3.46 },
    },
    mcu: { part: 'IC1', rail: '3V3', min: 2.375, needs: ['IC1', 'C13'] },
    upload: { source: 'v5', needs: [], tool: 'none' },
  },
  mode: 'tilt',
  modes: {
    tilt: program('Rocking about X'),
    flat: program('Lying flat'),
    asleep: program('Never woken up'),
    scan: program('I2C scan'),
  },
  // the engine adds reverse polarity, too high and too low a voltage on each source and C10 in backwards
  faults: [['missing:C14', 'Leave out the CPOUT capacitor'], ['missing:R6', 'Leave out the AD0 pull-down'],
    ['cold:H1.4', 'Cold joint on the SDA pin'], 'short:3V3:GND'],
  xr: {
    flow: [
      ['VCC', [[1.4, 19.03], [4.2, 19.03], [6.6, 17.8]]],
      ['3V3', [[8.6, 18.9], [10.3, 18.5], [10.3, 15.4], [9.6, 12.7]], [[10.3, 15.4], [6.7, 15.4]], [[6.7, 14.0], [6.7, 5.1], [6.7, 3.6]]],
      ['SDA', [[1.4, 11.41], [4.6, 11.41], [6.5, 11.2]]],
      ['SCL', [[1.4, 13.95], [4.6, 13.95], [6.5, 11.7]]],
    ],
    notes: [['IC1', 'MEMS DIE ON CMOS DIE'], ['U2', '3.3 V LDO'], ['C14', 'GYRO CHARGE PUMP']],
  },
  tags: [['IC1', 44, -28], ['U2', -40, -24], ['H1', -46, 12], ['D1', -34, 30], ['C10', 40, 22]],
  elec: {
    pins: { GND: { role: 'gnd' }, VCC: { role: 'supply', range: [3.3, 5.5], max: 6, mA: 5 },
      SCL: { role: 'i2c-scl', pullup: { ohms: 4700, to: '3V3' } }, SDA: { role: 'i2c-sda', pullup: { ohms: 4700, to: '3V3' } },
      AD0: { role: 'in', pulldown: { ohms: 4700 }, note: 'high = address 0x69' }, INT: { role: 'out', rail: '3V3' } },
    i2c: { addr: 0x68, alt: 0x69, note: 'asleep at power-up: write 0 to PWR_MGMT_1 (0x6B) before reading' },
  },
});
})();
