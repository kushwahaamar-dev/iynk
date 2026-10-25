// @cf title Arduino UNO R4
// @cf use engine/bench.list
// @cf use parts/push-button.js
// @cf use parts/potentiometer.js
// @cf use parts/mpu6050.js
/* Arduino UNO R4 Minima (ABX00080) and UNO R4 WiFi (ABX00087), switched with ?variant=minima|wifi (default minima).
   Every position is the part's origin in Arduino's own Altium PcbDoc (both CAD zips), shifted so the bottom-left
   outline corner is (0, 0); the facts and their sources are in docs/facts/uno-r4.md. Both boards keep the UNO R3
   outline, header positions and 5 V logic, but run a Renesas RA4M1 (Arm Cortex-M4F, 48 MHz from its internal HOCO:
   no crystal is fitted) and take USB-C.
   Power: USB-C VBUS reaches +5V through a PMEG6020 Schottky (about 0.3 V drop, no polyfuse on either board); VIN and
   the barrel jack (6-24 V) go through a second Schottky that blocks a reversed supply, then an ISL854102 buck makes
   +5V. The 5V pin sits straight on +5V with no protection. Minima: the 3.3V pin is the RA4M1's own USB LDO (VCC_USB).
   WiFi: an SGM2205 LDO makes 3.3 V for the ESP32-S3-MINI-1, which is also the USB-to-serial bridge that programs
   the RA4M1 through a TXB0108 level shifter; NLASB3157 switches route USB; the 12 x 8 matrix is charlieplexed on
   11 RA4M1 pins; the Qwiic connector is Wire1 at 3.3 V behind a 500 mA PTC and two 2N7002 level shifters.
   Straps: the RA4M1 MD pin (BOOT on the power header) low at reset starts the ROM boot mode, not the sketch; on the
   WiFi, ESP_DOWNLOAD (ESP header pin 4) low at reset puts the ESP32-S3 in ROM download mode, so the USB bridge and
   Serial are gone while the RA4M1 keeps running. Both are sampled when the program (re)starts, as the chips do. */
(() => {
const B = SL.bench;
const blink = (t, on, off) => (t % (on + off)) < on ? 1 : 0;

/* the remaining 0402 resistors and capacitors around U1 and the regulators, drawn as one selectable part */
B.kind('uno-r4-passives', {
  group: 'smd',
  size: p => p.size || [10, 10],
  h: .35,
  draw(ctx){
    const p = ctx.p, res = { l: '#3c3935', m: '#2c2a27', d: '#1c1b19' };
    for (const [x, y, k, r = 0] of p.spots || []){
      const [a, b] = B.localOf(p, x, y), q = ((r - (p.rot || 0)) % 180) ? [.25, .5] : [.5, .25];
      ctx.put(ctx.B(a - q[0], b - q[1], 0, a + q[0], b + q[1], .35), ctx.slab(a - q[0], b - q[1], a + q[0], b + q[1], 0, .35, k === 'c' ? B.M.tan : res, undefined, .3));
    }
  },
});
const scatter = (spots, extra) => {
  const xs = spots.map(s => s[0]), ys = spots.map(s => s[1]);
  const x0 = Math.min(...xs) - .6, x1 = Math.max(...xs) + .6, y0 = Math.min(...ys) - .6, y1 = Math.max(...ys) + .6;
  return Object.assign({ kind: 'uno-r4-passives', at: [(x0 + x1) / 2, (y0 + y1) / 2], size: [x1 - x0, y1 - y0], spots }, extra);
};

/* boot straps (FIGURES-BENCH §6.3): the engine latches them when the program (re)starts, as the chips read their mode
   pins at reset. MD low halts the RA4M1 in its ROM boot mode; ESP_DOWNLOAD low parks the ESP32-S3 in download mode,
   so the USB bridge and Serial are gone while the RA4M1 keeps running its sketch. */
const STRAP_MD = { fault: 'short:MD:GND', boot: 'rom', halts: true,
  msg: 'BOOT (MD) was low at reset: the RA4M1 started its ROM boot mode, not your sketch', fix: 'Free the BOOT pin and press RESET' };
const STRAP_ESP = { fault: 'short:ESP_DOWNLOAD:GND', boot: 'esp-download', part: 'M1', blocks: ['upload', 'serial'],
  msg: 'ESP_DOWNLOAD was low at reset: the ESP32-S3 waits in ROM download mode, so USB and Serial are gone', fix: 'Free ESP header pin 4 and press RESET' };
// the WiFi's Serial reaches USB through the ESP32-S3 and the TXB0108
const bridgeUp = () => B.isSet('M1') && B.isSet('U4');

const HEART_BIG = ['011100001110', '111110011111', '111111111111', '011111111110', '001111111100', '000111111000', '000011110000', '000001100000'].join('');
const HEART_SMALL = ['000000000000', '001100001100', '011110011110', '011111111110', '001111111100', '000111111000', '000011110000', '000001100000'].join('');
const one = i => '0'.repeat(i) + '1' + '0'.repeat(95 - i);

const MODES_MINIMA = {
  blink: { title: 'Blink', out: (st, t) => ({ D13: blink(t, 1, 1) }) },
  fast: { title: 'Blink without delay()', out: (st, t) => ({ D13: blink(t, .2, .2) }) },
  hello: { title: 'Serial hello', out: () => ({}), serial: k => k === 0 ? 'UNO R4 Minima ready' : 'hello from the R4 #' + k },
};
const MODES_WIFI = {
  heart: { title: 'Matrix heart', out: (st, t) => ({ MATRIX: blink(t, .6, .4) ? HEART_BIG : HEART_SMALL }) },
  scan: { title: 'Matrix scan', out: (st, t) => ({ MATRIX: one(Math.floor(t * 12) % 96) }) },
  blink: { title: 'Blink', out: (st, t) => ({ D13: blink(t, 1, 1) }) },
  hello: { title: 'Serial hello', out: () => ({}), serial: k => !bridgeUp() ? null : k === 0 ? 'UNO R4 WiFi ready' : 'hello from the R4 #' + k },
};

/* shared geometry: both boards put these at the same place */
const DIG_H = ['SCL', 'SDA', 'AREF', 'GND', 'D13', 'D12', 'D11', 'D10', 'D9', 'D8'];
const silkCommon = [
  [41, 45.2, 'DIGITAL (PWM~)', 1.4], [36.8, 9.4, 'POWER', 1.3], [57.2, 9.4, 'ANALOG IN', 1.3],
  [6.35, 45.3, 'RESET', 1.1], [64.9, 32.3, 'ICSP', 1.1],
  ...['SCL', 'SDA', 'AREF', 'GND', '13', '12', '~11', '~10', '~9', '8'].map((t, i) => [18.796 + i * 2.54 + .45, 46.9, t, 1.05, 90]),
  ...['7', '~6', '~5', '4', '~3', '2', 'TX▸1', 'RX◂0'].map((t, i) => [45.72 + i * 2.54 + .45, 46.9, t, 1.05, 90]),
  ...['IOREF', 'RESET', '3.3V', '5V', 'GND', 'GND', 'VIN'].map((t, i) => [30.48 + i * 2.54 + .45, 5.2, t, 1.05, 90]),
  ...['A0', 'A1', 'A2', 'A3', 'A4', 'A5'].map((t, i) => [50.8 + i * 2.54 + .45, 5.2, t, 1.05, 90]),
];
const headers = [
  { id: 'JDIGITAL_H', kind: 'female', name: 'Digital header D8-D13, GND, AREF, SDA, SCL', short: 'D8-D13', at: [30.226, 50.8], h: 8.5,
    pins: DIG_H, labels: ['SCL', 'SDA', 'AREF', 'GND', '13', '12', '~11', '~10', '~9', '8'] },
  { id: 'JDIGITAL_L', kind: 'female', name: 'Digital header D0-D7', short: 'D0-D7', at: [54.61, 50.8], h: 8.5,
    pins: ['D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'D1', 'D0'], labels: ['7', '~6', '~5', '4', '~3', '2', 'TX▸1', 'RX◂0'] },
  { id: 'JANALOG_P', kind: 'female', name: 'Power header (BOOT, IOREF, RESET, 3.3V, 5V, GND, GND, VIN)', short: 'POWER', at: [36.83, 2.54], h: 8.5,
    pins: ['MD', 'IOREF', 'RESET', '3V3', '5V', 'GND', 'GND', 'VIN'], labels: ['BOOT', 'IOREF', 'RESET', '3.3V', '5V', 'GND', 'GND', 'VIN'] },
  { id: 'JANALOG_A', kind: 'female', name: 'Analog header A0-A5', short: 'A0-A5', at: [57.15, 2.54], h: 8.5, pins: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'] },
];
const icsp = id => ({ id, kind: 'male', name: 'ICSP header (SPI: CIPO, SCK, COPI, RESET)', short: 'ICSP', at: [64.897, 27.94], rot: 90, rows: 2, mirror: true, h: 8.5,
  pins: ['D12', '5V', 'D13', 'D11', 'RESET', 'GND'], labels: ['CIPO', '5V', 'SCK', 'COPI', 'RESET', 'GND'] });
const usbc = id => ({ id, kind: 'usb-c', name: 'USB-C socket (5 V sink, no Power Delivery)', short: 'USB-C', at: [2.54, 37.87], size: [6.8, 8.94], h: 3.3, plug: true });
const jack = id => ({ id, kind: 'barrel', name: '2.1 mm barrel jack, centre positive, 6-24 V', short: 'POWER JACK', at: [5.24, 8.16], size: [14.4, 9.4], h: 9.8 });
const reset = { id: 'PB1', kind: 'tact', name: 'RESET button', short: 'RESET', at: [6.35, 49.403], size: [6, 6], h: 2.6, group: 'smd', control: { type: 'button', action: 'reset' } };
const r402 = (id, name, at, rot = 0) => ({ id, kind: 'chip', name, at, rot, size: [1, .5], h: .35 });
const c402 = (id, name, at, rot = 0) => ({ id, kind: 'chip', name, at, rot, size: [1, .5], h: .35, cap: true });
const c603 = (id, name, at, rot = 0) => ({ id, kind: 'chip', name, at, rot, size: [1.6, .8], h: .8, cap: true });
const c805 = (id, name, at, rot = 0) => ({ id, kind: 'chip', name, at, rot, size: [2, 1.25], h: .7, cap: true });
const schottky = (id, name, at, rot) => ({ id, kind: 'sod', name, short: 'SCHOTTKY', at, rot, size: [2.8, 1.8], h: 1,
  polar: { fault: 'dark', opts: ['cathode band as printed', 'cathode band the other way (backwards)'] } });
const YEL = '#f2b12e', GRN = '#4cc65a';

const CIRCUITS = {
  blink: {
    title: 'Blink an LED through 1 kΩ', breadboard: 'half',
    parts: [
      { id: 'R1', part: 'resistor', ohms: 1000, holes: ['b10', 'b14'] },
      { id: 'LED1', part: 'led', color: 'red', holes: ['c14', 'c15'] },
    ],
    wires: [{ from: 'D13', to: 'a10', color: 'orange' }, { from: 'GND', to: 'a15', color: 'black' }],
  },
  button: {
    title: 'Button on D2 (interrupt), LED on D13', breadboard: 'half',
    parts: [
      { id: 'SW1', part: 'push-button', holes: ['e8', 'f8', 'e10', 'f10'] },
      { id: 'R1', part: 'resistor', ohms: 1000, holes: ['b16', 'b20'] },
      { id: 'LED1', part: 'led', color: 'green', holes: ['c20', 'c21'] },
    ],
    wires: [
      { from: 'D2', to: 'a8', color: 'yellow' }, { from: 'GND', to: 'j10', color: 'black' },
      { from: 'D13', to: 'a16', color: 'orange' }, { from: 'GND', to: 'a21', color: 'black' },
    ],
  },
  'pot-pwm': {
    title: 'Potentiometer on A1, LED on ~9', breadboard: 'half',
    parts: [
      { id: 'POT1', part: 'potentiometer', ohms: 10000, holes: ['e20', 'e22', 'e24'] },
      { id: 'R1', part: 'resistor', ohms: 1000, holes: ['b10', 'b14'] },
      { id: 'LED1', part: 'led', color: 'yellow', holes: ['c14', 'c15'] },
    ],
    wires: [
      { from: 'GND', to: 'a20', color: 'black' }, { from: 'A1', to: 'a22', color: 'blue' }, { from: '5V', to: 'a24', color: 'red' },
      { from: 'D9', to: 'a10', color: 'orange' }, { from: 'GND', to: 'a15', color: 'black' },
    ],
  },
  // the DAC's voltage on A0 goes out to the breadboard, with a ground jumper beside it, for a meter or a scope to probe
  'dac-wave': {
    title: 'DAC out on A0, with ground beside it for a meter', breadboard: 'half',
    parts: [],
    wires: [{ from: 'A0', to: 'a12', color: 'purple' }, { from: 'GND', to: 'a15', color: 'black' }],
  },
  'i2c-scan': {
    title: 'MPU-6050 on the I2C header (SDA, SCL), 5 V', breadboard: 'half',
    // GY-521 header VCC GND SCL SDA XDA XCL AD0 INT in row i; the board lies over rows f-h, the jumpers go in row j.
    // AD0 stays open: the module's own 4.7 kΩ pull-down keeps the address at 0x68
    parts: [{ id: 'MPU1', part: 'mpu6050', holes: ['i12', 'i13', 'i14', 'i15', 'i16', 'i17', 'i18', 'i19'] }],
    wires: [
      { from: '5V', to: 'j12', color: 'red' }, { from: 'GND', to: 'j13', color: 'black' },
      { from: 'SCL', to: 'j14', color: 'yellow' }, { from: 'SDA', to: 'j15', color: 'blue' },
    ],
  },
};

/* ---------- UNO R4 Minima ---------- */
const MINIMA_SPOTS = [
  [7.24, 21.01, 'c', 270], [12.94, 19.28, 'c'], [12.94, 18.18, 'c'], [54.13, 33.10, 'r', 270], [35.64, 29.57, 'r'],
  [35.64, 30.57, 'r'], [38.94, 39.67, 'r', 90], [37.94, 39.67, 'r', 270], [38.44, 41.17, 'r'],
  [14.87, 18.66, 'r', 90], [12.94, 20.38, 'r'], [12.94, 21.48, 'r'], [10.64, 22.58, 'r'], [12.94, 23.68, 'r'],
  [10.64, 23.68, 'r']
];
const minima = {
  id: 'uno-r4', fig: '03', name: 'Arduino UNO R4 Minima', sub: 'Renesas RA4M1 (Cortex-M4F, 48 MHz), 5 V logic, native USB-C',
  pcb: { w: 68.58, h: 53.34, thick: 1.6, color: '#008184', silk: '#f4f6ef', standoff: 4,
    outline: [[1, 0], [65.04, 0], [65.75, .29], [66.04, 1], [66.04, 2.54], [68.58, 5.08], [68.58, 37.846], [66.04, 40.386], [66.04, 51.816],
      [64.516, 53.34], [1, 53.34], [.29, 53.05], [0, 52.34], [0, 1], [.29, .29]] },
  mat: { front: 9, back: 9, left: 30, right: 8 },
  height: 14, pal: 'mint', logic: 5,
  holes: [[13.97, 2.54, 3.2], [15.24, 50.8, 3.2], [66.04, 7.62, 3.2], [66.04, 35.56, 3.2]],
  silk: [...silkCommon, [28, 18.4, 'UNO', 4.2], [28, 13.4, 'R4 MINIMA', 1.8], [25.3, 42.2, 'L', 1.2], [25, 36.6, 'TX', 1.1], [25, 34.3, 'RX', 1.1], [61.2, 36.6, 'ON', 1.1]],
  parts: [
    { id: 'U1', kind: 'qfp', name: 'Renesas RA4M1 microcontroller (R7FA4M1AB3CFM)', short: 'MCU', at: [43.5, 31.5], rot: 270, size: [10, 10], n: 16, h: 1.6, label: 'RENESAS|R7FA4M1AB3CFM' },
    { id: 'U2', kind: 'soic', name: 'ISL854102 buck converter (VIN to 5 V, 1.2 A)', short: 'BUCK', at: [9.738, 19.782], size: [4, 3], n: 6, pitch: .5, h: 1 },
    { id: 'L3', kind: 'inductor', name: '10 µH buck inductor', short: '10 µH', at: [4.836, 17.099], rot: 270, size: [4.5, 4.5], h: 2.05 },
    c805('C13', '22 µF 25 V buck input capacitor', [4.691, 23.708]), c805('C19', '22 µF 25 V buck input capacitor', [4.691, 21.591], 180),
    c805('C15', '22 µF buck output capacitor', [8.936, 15.947], 90), c805('C16', '22 µF buck output capacitor', [10.886, 15.947], 90),
    c805('C17', '22 µF buck output capacitor', [12.834, 15.962], 90), c805('C18', '22 µF buck output capacitor', [14.784, 15.962], 90),
    schottky('D2', 'PMEG6020 Schottky: VIN reverse-polarity guard', [9.738, 25.947], 180),
    schottky('D3', 'PMEG6020 Schottky: USB VBUS to 5 V', [9.738, 28.647], 180),
    { id: 'D4', kind: 'sot23', name: 'PRTR5V0U2X USB ESD protection', short: 'ESD', at: [9.738, 38.366] },
    c805('C21', '4.7 nF 1000 V capacitor (USB shield to GND)', [4.184, 30.978]),
    r402('R23', '1 MΩ shield bleed resistor', [4.559, 29.278]),
    r402('R24', '5.1 kΩ USB-C CC1 pull-down (asks for 5 V)', [7.512, 35.391], 90),
    r402('R25', '5.1 kΩ USB-C CC2 pull-down (asks for 5 V)', [7.512, 41.891], 270),
    { id: 'DL1', kind: 'led', name: 'TX LED (yellow)', short: 'TX', at: [27.94, 36.576], rot: 180, size: [1.6, .8], h: .55, led: { color: YEL, serial: 'tx', via: ['R14'] } },
    { id: 'DL2', kind: 'led', name: 'RX LED (yellow)', short: 'RX', at: [27.94, 34.29], rot: 180, size: [1.6, .8], h: .55, led: { color: YEL, serial: 'rx', via: ['R15'] } },
    { id: 'DL4', kind: 'led', name: 'L LED (pin 13, yellow)', short: 'L LED', at: [27.94, 42.164], rot: 180, size: [1.6, .8], h: .55, led: { color: YEL, net: 'D13', via: ['R17'] } },
    { id: 'DL3', kind: 'led', name: 'ON LED (5 V, green)', short: 'ON LED', at: [58.42, 36.576], rot: 180, size: [1.6, .8], h: .8, led: { color: GRN, rail: '5V', via: ['R16'] } },
    r402('R14', '330 Ω resistor for the TX LED', [30.413, 36.576], 180), r402('R15', '330 Ω resistor for the RX LED', [30.42, 34.276], 180),
    r402('R17', '330 Ω resistor for the L LED', [30.42, 42.164], 180), r402('R16', '330 Ω resistor for the ON LED', [58.42, 38.066]),
    { id: 'L1', kind: 'chip', name: 'Ferrite bead: analog supply filter', at: [52.228, 33.75], rot: 180, size: [1.6, .8], h: .8, ferrite: true },
    { id: 'L2', kind: 'chip', name: 'Ferrite bead: analog reference filter', at: [52.228, 32.45], rot: 180, size: [1.6, .8], h: .8, ferrite: true },
    c603('C4', '4.7 µF capacitor', [35.22, 28.3]), c603('C7', '4.7 µF capacitor', [35.22, 35.076]), c603('C11', '4.7 µF capacitor', [45.538, 40.116], 270),
    c402('C5', '100 nF decoupling capacitor', [35.638, 27]), c402('C6', '100 nF decoupling capacitor', [39.938, 39.666]),
    c402('C8', '100 nF decoupling capacitor', [51.928, 31.25]), c402('C10', '100 nF decoupling capacitor', [46.938, 39.666]),
    c402('C9', '1 µF capacitor', [51.928, 34.95]),
    r402('R3', '5.1 kΩ RESET pull-up', [13.438, 47.166], 90),
    r402('R10', '100 kΩ 0.1 % divider resistor', [51.928, 28]), r402('R26', '13.7 kΩ 0.1 % divider resistor', [51.928, 27]),
    scatter(MINIMA_SPOTS, { id: 'PASSIVES', name: 'Small 0402 resistors and capacitors around the buck and the MCU', short: '0402' }),
    { id: 'Y1', kind: 'pads', name: 'Empty crystal footprint Y1: the RA4M1 runs on its internal 48 MHz oscillator', at: [42.638, 41.551], rows: 2, pitch: 1.6, d: .9, fixed: true, pins: ['', '', '', ''] },
    { id: 'LOVE', kind: 'pads', name: 'LOVE test point on the bottom (an Arduino joke)', at: [38.045, 23.326], side: 'bottom', rows: 1, d: 1, fixed: true, pins: [''] },
    reset, icsp('J1'),
    { id: 'J2', kind: 'male', name: 'SWD/JTAG debug header, 2 x 5, 1.27 mm (pin 1 is +5 V)', short: 'SWD', at: [61.63, 40.7], rot: 270, rows: 2, mirror: true, pitch: 1.27, plastic: 1.5, h: 4,
      pins: ['5V', 'SWDIO', 'GND', 'SWCLK', 'GND', '', 'RXD1', 'TXD1', 'GND', 'RESET'], labels: ['+5V', 'SWDIO', 'GND', 'SWCLK', 'GND', 'NC', 'RX', 'TX', 'GND', 'RESET'] },
    usbc('J3'), jack('J4'), ...headers,
  ],
  power: {
    sources: {
      usb: { label: 'USB-C cable', part: 'J3', plug: 'usb-c', v: 5.0, ilim: .5 },
      jack: { label: 'Barrel jack', part: 'J4', plug: 'barrel', v: 9, range: [6, 24], max: 24 },
      vin: { label: 'VIN pin', pin: 'VIN', v: 9, range: [6, 24], max: 24 },
      pin5: { label: '5V pin', pin: '5V', v: 5, range: [4.75, 5.25], max: 5.5 },
      pin33: { label: '3.3V pin', pin: '3V3', v: 3.3, range: [3.2, 3.4], max: 3.6 },
    },
    default: 'usb',
    rails: {
      USBVCC: { from: [{ src: 'usb', via: ['J3'] }] },
      VIN: { from: [{ src: 'jack', via: ['J4', 'D2'], drop: .35, protect: 'D2' }, { src: 'vin', via: ['D2'], drop: .35, protect: 'D2' }] },
      '5V': { from: [{ rail: 'VIN', via: ['L3', 'U2'], reg: 5, dropout: 1, max: 40 }, { rail: 'USBVCC', via: ['D3'], drop: .3 }, { src: 'pin5' }], max: 6.5 },
      '3V3': { from: [{ rail: '5V', via: ['U1'], reg: 3.3, dropout: .3 }, { src: 'pin33', via: ['U1'], max: 3.6 }], max: 3.6 },
    },
    mcu: { part: 'U1', rail: '5V', min: 1.8, needs: ['U1'] },
    upload: { source: 'usb', needs: ['J3', 'U1'], tool: 'dfu-util' },
  },
  mode: 'blink',
  modes: MODES_MINIMA,
  faults: ['short:5V:GND', 'short:MD:GND', 'wrong-voltage:pin33:5', 'wrong-voltage:usb:2', 'wrong-voltage:jack:48'],
  straps: [STRAP_MD],
  xr: {
    flow: [
      ['USBVCC', [[5.9, 37.9], [8.2, 33.5], [9.7, 28.6]]],
      ['5V', [[9.7, 28.6], [16.5, 28.6], [16.5, 6.8], [38.1, 6.8], [38.1, 3.4]], [[16.5, 28.6], [37.5, 31.5]]],
      ['VIN', [[12.4, 8.3], [14.2, 12.4], [14.2, 25.9], [9.7, 25.9], [9.7, 19.8]], [[45.72, 3.4], [45.72, 6], [14.2, 12.4]]],
      ['D13', [[43.5, 37.5], [36, 42.2], [30.4, 42.2], [27.9, 42.2]], [[28.96, 50.2], [28.96, 44.2], [30.4, 42.2]]],
    ],
    notes: [['U1', 'SILICON DIE'], ['U2', 'BUCK CONVERTER'], ['L3', 'INDUCTOR'], ['D2', 'SCHOTTKY'], ['Y1', 'NO CRYSTAL']],
  },
  tags: [['U1', 40, 30], ['J3', -44, 12], ['J4', -40, 22], ['PB1', -30, -26], ['DL4', 34, -30], ['DL3', 36, -18], ['U2', -40, 30], ['J2', 30, -34]],
  circuit: 'blink',
  circuits: CIRCUITS,
};

/* ---------- UNO R4 WiFi ---------- */
const WIFI_SPOTS = [
  [60.95, 35.88, 'c'], [44.65, 36.78, 'c'], [44.25, 29.88, 'c'], [59.23, 42.63, 'c'], [46.26, 42.63, 'c'],
  [44.65, 39.31, 'c'], [44.35, 37.95, 'c'], [17.59, 10.41, 'c', 90], [19.19, 9.99, 'c', 90], [25.60, 19.60, 'c'],
  [23.20, 17.25, 'c', 90], [27.33, 25.30, 'c', 90], [30.66, 21.30, 'c'], [30.66, 23.25, 'c'], [30.64, 25.20, 'c'],
  [30.64, 27.15, 'c'], [25.22, 17.25, 'c', 270], [28.43, 25.30, 'c', 90], [1.85, 44.15, 'c'],
  [18.15, 36.58, 'c', 270], [19.25, 36.58, 'c', 270], [15.80, 33.28, 'c', 90], [31.03, 12.36, 'c', 90],
  [11.93, 34.23, 'c', 90], [12.53, 41.27, 'c'], [13.12, 34.23, 'r', 90], [59.92, 26.11, 'r', 45],
  [13.47, 47.24, 'r', 270], [44.11, 41.90, 'r', 270], [60.65, 32.38, 'r'], [63.87, 22.83, 'r', 270],
  [67.27, 22.83, 'r', 270], [44.65, 35.68, 'r'], [60.01, 12.18, 'r', 45], [44.65, 33.48, 'r'],
  [60.01, 13.58, 'r', 45], [13.13, 31.46, 'r', 270], [11.93, 31.47, 'r', 270], [44.65, 32.38, 'r'],
  [6.03, 30.67, 'r'], [60.01, 14.98, 'r', 45], [60.01, 16.38, 'r', 45], [60.01, 17.78, 'r', 45],
  [60.01, 19.18, 'r', 45], [60.01, 20.58, 'r', 45], [60.01, 21.98, 'r', 45], [60.01, 23.38, 'r', 45],
  [60.01, 24.78, 'r', 45], [27.95, 27.24, 'r'], [26.23, 25.30, 'r', 270], [4.55, 43.85, 'r'],
  [25.13, 25.30, 'r', 270], [24.03, 23.00, 'r', 270], [22.93, 25.30, 'r', 270], [22.93, 23.00, 'r', 90],
  [17.05, 36.58, 'r', 270], [15.95, 36.58, 'r', 270], [20.35, 36.58, 'r', 270], [21.45, 36.58, 'r', 270],
  [21.60, 33.28, 'r', 90], [9.13, 42.86, 'r'], [3.63, 31.77, 'r'], [16.83, 30.97, 'r'], [26.42, 41.02, 'r'],
  [26.40, 44.30, 'r']
];
const wifi = Object.assign({}, minima, {
  name: 'Arduino UNO R4 WiFi', sub: 'Renesas RA4M1 + ESP32-S3 (Wi-Fi, Bluetooth LE), 12 x 8 LED matrix, Qwiic',
  silk: [...silkCommon, [38.4, 32.4, 'UNO', 3.2], [38.4, 29.2, 'R4 WIFI', 1.5], [23.4, 42.2, 'L', 1.2], [23.2, 36.6, 'TX', 1.1], [22.6, 34.3, 'RX', 1.1], [62, 37.6, 'ON', 1.1],
    ...['OFF', 'GND', 'VRTC'].map((t, i) => [17.78 + i * 2.54 + .45, 5.6, t, 1.05, 90]), [18.8, 45.4, 'ESP', 1.1]],
  parts: [
    { id: 'U1', kind: 'qfp', name: 'Renesas RA4M1 microcontroller (R7FA4M1AB3CFM)', short: 'MCU', at: [52.75, 35.853], size: [10, 10], n: 16, h: 1.6, label: 'RENESAS|R7FA4M1AB3CFM' },
    { id: 'M1', kind: 'module', name: 'ESP32-S3-MINI-1 Wi-Fi and Bluetooth module (USB bridge)', short: 'ESP32-S3', at: [10.575, 21.495], rot: 180, size: [20.5, 15.4], h: 2.4, ant: 5.3, label: 'ESP32-S3-MINI-1' },
    { id: 'U3', kind: 'soic', name: 'ISL854102 buck converter (VIN to 5 V, 1.2 A)', short: 'BUCK', at: [26.825, 22.1], rot: 90, size: [4, 3], n: 6, pitch: .5, h: 1 },
    { id: 'L3', kind: 'inductor', name: '10 µH buck inductor', short: '10 µH', at: [29.508, 17.248], size: [4.5, 4.5], h: 2.05 },
    { id: 'U5', kind: 'sot223', name: 'SGM2205 3.3 V regulator (800 mA)', short: '3V3 REG', at: [26.325, 10.206], rot: 270, h: 1.7 },
    { id: 'U4', kind: 'soic', name: 'TXB0108 level shifter (5 V RA4M1 to 3.3 V ESP32-S3)', short: 'LEVEL SHIFT', at: [18.696, 33.276], rot: 90, size: [4, 2], n: 10, pitch: .4, h: .8 },
    { id: 'U2', kind: 'soic', name: 'NLASB3157 USB data switch (D+)', short: 'USB SW', at: [12.525, 39.266], rot: 180, size: [2, 1.25], n: 3, pitch: .65, h: 1.1 },
    { id: 'U6', kind: 'soic', name: 'NLASB3157 USB data switch (D-)', short: 'USB SW', at: [12.525, 36.466], rot: 180, size: [2, 1.25], n: 3, pitch: .65, h: 1.1 },
    { id: 'Q1', kind: 'sot23', name: '2N7002 MOSFET: Qwiic SDA level shift', at: [63.27, 20.034], rot: 180 },
    { id: 'Q2', kind: 'sot23', name: '2N7002 MOSFET: Qwiic SCL level shift', at: [66.67, 20.034], rot: 180 },
    { id: 'Q3', kind: 'sot23', name: '2N7002 MOSFET: drives the L LED from D13', at: [12.525, 44.066] },
    { id: 'F1', kind: 'fuse', name: '500 mA resettable fuse on the Qwiic 3.3 V', short: 'PTC', at: [9.125, 32.603], rot: 270, size: [4.5, 3.2], h: 1.4 },
    schottky('D1', 'PMEG6020 Schottky: VIN reverse-polarity guard', [15.395, 8.306], 270),
    schottky('D2', 'PMEG6020 Schottky: USB VBUS to 5 V', [26.396, 30.476], 90),
    { id: 'D3', kind: 'sot23', name: 'PRTR5V0U2X USB ESD protection', short: 'ESD', at: [9.125, 37.866], rot: 180 },
    { id: 'DL1', kind: 'led', name: 'TX LED (yellow)', short: 'TX', at: [26.416, 36.576], size: [1.6, .8], h: .55, led: { color: YEL, serial: 'tx', via: ['R22'] } },
    { id: 'DL2', kind: 'led', name: 'RX LED (yellow)', short: 'RX', at: [26.416, 34.29], size: [1.6, .8], h: .55, led: { color: YEL, serial: 'rx', via: ['R20', 'R23'] } },
    { id: 'DL4', kind: 'led', name: 'L LED (pin 13, yellow)', short: 'L LED', at: [26.416, 42.164], size: [1.6, .8], h: .55, led: { color: YEL, net: 'D13', via: ['Q3', 'R25'] } },
    { id: 'DL3', kind: 'led', name: 'ON LED (5 V, green)', short: 'ON LED', at: [64.897, 39.553], rot: 315, size: [1.6, .8], h: .8, led: { color: GRN, rail: '5V', via: ['R24'] } },
    r402('R22', '330 Ω resistor for the TX LED', [26.416, 37.719]), r402('R20', '330 Ω resistor for the RX LED', [24.29, 35.433], 180),
    r402('R23', '330 Ω resistor for the RX LED', [26.416, 35.433]), r402('R24', '330 Ω resistor for the ON LED', [64.384, 41.941], 270),
    r402('R25', '330 Ω resistor for the L LED', [26.416, 43.307]),
    r402('R9', '5.1 kΩ Qwiic SDA pull-up (3.3 V)', [62.67, 22.834], 270), r402('R11', '5.1 kΩ Qwiic SCL pull-up (3.3 V)', [66.07, 22.834], 270),
    r402('R35', '100 kΩ pull-up on the OFF pin (keeps the buck on)', [22.925, 20.8], 90),
    r402('R50', '5.1 kΩ USB-C CC1 pull-down (asks for 5 V)', [9.125, 40.466], 180), r402('R51', '5.1 kΩ USB-C CC2 pull-down (asks for 5 V)', [9.125, 41.66], 180),
    { id: 'L1', kind: 'chip', name: 'Ferrite bead: analog supply filter', at: [45.99, 41.428], size: [1.6, .8], h: .8, ferrite: true },
    { id: 'L2', kind: 'chip', name: 'Ferrite bead: analog reference filter', at: [59.51, 41.428], size: [1.6, .8], h: .8, ferrite: true },
    { id: 'U_LEDMATRIX', kind: 'matrix', name: '12 x 8 red LED matrix (96 LEDs, charlieplexed on 11 pins)', short: 'LED MATRIX', at: [45.962, 19.18], rows: 8, cols: 12, pitch: 2.1, led: { color: '#e2483d', net: 'MATRIX' } },
    scatter(WIFI_SPOTS, { id: 'PASSIVES', name: 'Small 0402 resistors and capacitors around the regulators, the MCU and the matrix', short: '0402' }),
    { id: 'MD', kind: 'pads', name: 'MD test point (RA4M1 boot-mode pin)', at: [60.646, 30.176], rows: 1, d: .8, fixed: true, pins: ['MD'] },
    { id: 'SJ1', kind: 'pads', name: 'SJ1 solder jumper on the bottom, open: bridge it to wire USB straight to the RA4M1', at: [10.825, 34.066], side: 'bottom', rows: 1, pitch: 1.3, d: 1, fixed: true, pins: ['', ''] },
    reset, icsp('J3'),
    { id: 'J6', kind: 'male', name: 'ESP header 2 x 3 (ESP32-S3 pins, 3.3 V only)', short: 'ESP', at: [18.796, 41.964], rows: 2, mirror: true, h: 8.5,
      pins: ['ESP_IO42', 'ESP_IO41', 'ESP_TXD0', 'ESP_DOWNLOAD', 'ESP_RXD0', 'GND'], labels: ['IO42', 'IO41', 'TXD0', 'DOWNLOAD', 'RXD0', 'GND'] },
    { id: 'JOFF', kind: 'male', name: 'OFF / GND / VRTC header (OFF to GND stops the buck)', short: 'OFF VRTC', at: [20.32, 2.54], h: 8.5, pins: ['OFF', 'GND', 'VRTC'] },
    { id: 'J2', kind: 'box', name: 'Qwiic connector (I2C on Wire1, 3.3 V)', short: 'QWIIC', at: [65.735, 14.35], size: [4.95, 6], h: 3, face: '+x', color: '#efe6cf' },
    usbc('J1'), jack('J5'), ...headers,
  ],
  power: {
    sources: {
      usb: { label: 'USB-C cable', part: 'J1', plug: 'usb-c', v: 5.0, ilim: .5 },
      jack: { label: 'Barrel jack', part: 'J5', plug: 'barrel', v: 9, range: [6, 24], max: 24 },
      vin: { label: 'VIN pin', pin: 'VIN', v: 9, range: [6, 24], max: 24 },
      pin5: { label: '5V pin', pin: '5V', v: 5, range: [4.75, 5.25], max: 5.5 },
      pin33: { label: '3.3V pin', pin: '3V3', v: 3.3, range: [3.2, 3.4], max: 3.6 },
    },
    default: 'usb',
    rails: {
      USBVCC: { from: [{ src: 'usb', via: ['J1'] }] },
      VIN: { from: [{ src: 'jack', via: ['J5', 'D1'], drop: .35, protect: 'D1' }, { src: 'vin', via: ['D1'], drop: .35, protect: 'D1' }] },
      '5V': { from: [{ rail: 'VIN', via: ['L3', 'U3'], reg: 5, dropout: 1, max: 40 }, { rail: 'USBVCC', via: ['D2'], drop: .3 }, { src: 'pin5' }], max: 6.5 },
      '3V3': { from: [{ rail: '5V', via: ['U5'], reg: 3.3, dropout: .5 }, { src: 'pin33', via: ['M1'], max: 3.6 }], max: 3.6 },
      '3V3_I2C': { from: [{ rail: '3V3', via: ['F1'] }] },
    },
    mcu: { part: 'U1', rail: '5V', min: 1.8, needs: ['U1'] },
    upload: { source: 'usb', needs: ['J1', 'U2', 'U6', 'M1', 'U4', 'U1'], tool: 'bossac' },
  },
  mode: 'heart',
  modes: MODES_WIFI,
  faults: ['short:5V:GND', 'short:MD:GND', 'short:ESP_DOWNLOAD:GND', 'wrong-voltage:pin33:5', 'wrong-voltage:usb:2', 'wrong-voltage:jack:48'],
  straps: [STRAP_MD, STRAP_ESP],
  xr: {
    flow: [
      ['USBVCC', [[5.9, 37.9], [16, 31], [26.4, 30.5]]],
      ['5V', [[26.4, 30.5], [31.5, 30.5], [31.5, 6.8], [38.1, 6.8], [38.1, 3.4]], [[31.5, 30.5], [46.8, 35.9]], [[31.5, 12], [26.3, 10.2]]],
      ['3V3', [[26.3, 10.2], [21.5, 14.5], [16, 18]]],
      ['VIN', [[12.4, 8.3], [15.4, 8.3], [22, 13.5], [26.8, 22.1]], [[45.72, 3.4], [45.72, 6], [22, 13.5]]],
      ['D13', [[52.75, 41.9], [40, 44.2], [14, 44.2], [12.5, 44.1]], [[28.96, 50.2], [28.96, 44.2]]],
    ],
    notes: [['U1', 'SILICON DIE'], ['M1', 'ESP32-S3 + 8 MB FLASH + 40 MHZ CRYSTAL'], ['U3', 'BUCK CONVERTER'], ['U5', '3.3 V REGULATOR'], ['U4', 'LEVEL SHIFTER']],
  },
  tags: [['U1', 40, -30], ['M1', -40, 30], ['U_LEDMATRIX', 36, 34], ['J1', -44, 12], ['J5', -40, 22], ['PB1', -30, -26], ['DL4', 30, -30], ['J2', 40, 10]],
});
B.board(Object.assign({}, minima, {
  variant: 'minima',
  variants: {
    minima: { name: 'Arduino UNO R4 Minima' },
    wifi: { name: 'Arduino UNO R4 WiFi', patch: () => wifi },
  },
}));
})();
