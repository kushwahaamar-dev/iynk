// @cf title STM32 Nucleo-F401RE
// @cf use engine/bench.list
// @cf use parts/potentiometer.js
// @cf use parts/mpu6050.js
// @cf use parts/hc-sr04.js
/* ST NUCLEO-F401RE, PCB MB1136 rev C (assembly C-04). Every position is the part's pad-box centre from ST's own
   Altium file MB1136.PcbDoc (board design package, readme v2.1), moved into the board frame of docs/facts/nucleo-f401re.md
   section 2: origin at the bottom-left of the outline, USB at the top, 70 x 82.5 mm, white mask, blue silk. Values and
   fitted parts are the C-04 BOM's; the facts and their sources are in the fact sheet.
   Two boards in one: the ST-LINK/V2-1 programmer on top (y > 58, behind a row of snap-off slots) and the target below.
   Power: USB VBUS (U5V) feeds the ST-LINK through the BAT60J D2 and its own LD3985 (U1); the ST-LINK MCU (U2) only
   switches the T2 P-MOSFET on after the PC grants 300 mA, and T2 feeds +5V through the JP5 jumper (on 1-2, U5V).
   VIN (7-12 V) goes straight into the LD1117 (U3, no reverse diode), then through the STPS2L30A Schottky D4 onto E5V,
   which reaches +5V with JP5 on 2-3 (the figure moves the cap there while VIN or E5V powers the board) and also
   feeds the ST-LINK through D3. +5V lights LD3 (PWR) and feeds the LD39050 (U4, 500 mA, current limited) to make
   +3V3, which reaches the STM32F401RE's VDD only through the IDD jumper JP6. LD2 is on D13 (PA5) through 510 Ohm; the
   blue B1 USER button pulls PC13 low against a 4.7 kOhm pull-up; the black B2 shorts NRST. STM32duino runs the target
   on its internal 16 MHz HSI (the X3 crystal footprint is empty), so no crystal is needed for a sketch.
   Programming: the ST-LINK talks SWD to the target through the two CN2 jumper caps; Serial is USART2 (PA2/PA3) to the
   ST-LINK virtual COM port, so D0/D1 on CN9 are not connected (solder bridges SB62/SB63 are open). */
(() => {
const B = SL.bench, M = B.M;
const blink = (t, on, off) => (t % (on + off)) < on ? 1 : 0;

/* jumper caps on a 2.54 mm header: one black cap per entry of `caps` (local x of its centre, spanning two pins).
   JP5's cap moves from 1-2 (U5V) to 2-3 (E5V) while VIN or E5V powers the board, as the user manual says to. */
B.kind('nucleo-cap', {
  group: 'last', size: p => p.size || [5.08, 2.54], h: 6,
  draw(ctx){
    const p = ctx.p, h = p.h, shift = p.moves && ctx.st && (ctx.st.power === 'vin' || ctx.st.power === 'e5v') ? p.moves : 0;
    for (const c of p.caps || [0]){
      const a = c + shift;
      ctx.put(ctx.B(a - 2.5, -1.25, 0, a + 2.5, 1.25, h),
        ctx.slab(a - 2.5, -1.25, a + 2.5, 1.25, 0, h, M.blackPl, toneI, .6) + ctx.disc(a - 1.27, 0, h + .01, .45, '#1d1b19', 0) + ctx.disc(a + 1.27, 0, h + .01, .45, '#1d1b19', 0));
    }
  },
});

/* the 0603 resistors and capacitors not drawn one by one, as one selectable part each side of the snap line */
B.kind('nucleo-passives', {
  group: 'smd', size: p => p.size || [10, 10], h: .5,
  draw(ctx){
    const p = ctx.p, res = { l: '#3c3935', m: '#2c2a27', d: '#1c1b19' };
    for (const [x, y, k, r = 0] of p.spots || []){
      const [a, b] = B.localOf(p, x, y), q = ((r - (p.rot || 0)) % 180) ? [.4, .8] : [.8, .4];
      ctx.put(ctx.B(a - q[0], b - q[1], 0, a + q[0], b + q[1], .5), ctx.slab(a - q[0], b - q[1], a + q[0], b + q[1], 0, .5, k === 'c' ? M.tan : k === 'b' ? M.tin : res, undefined, .3));
    }
  },
});
const scatter = (spots, extra) => {
  const xs = spots.map(s => s[0]), ys = spots.map(s => s[1]);
  const x0 = Math.min(...xs) - 1, x1 = Math.max(...xs) + 1, y0 = Math.min(...ys) - 1, y1 = Math.max(...ys) + 1;
  return Object.assign({ kind: 'nucleo-passives', at: [(x0 + x1) / 2, (y0 + y1) / 2], size: [x1 - x0, y1 - y0], spots }, extra);
};

/* the routed slots (1 mm wide, y 57-58) between the ST-LINK and the target, with the three bridges left standing */
const SLOTS = [[0, 16], [18.5, 38.5], [42.12, 50.45], [53.5, 70]];
B.kind('nucleo-slots', {
  group: 'smd', size: () => [70, 1], h: .05,
  draw(ctx){
    let s = '';
    for (const [x0, x1] of SLOTS){
      const a0 = x0 - 35, a1 = x1 - 35, pts = [];
      for (let i = 0; i <= 6; i++){ const t = Math.PI / 2 + i * Math.PI / 6; pts.push([a0 + (x0 > 0 ? .5 : 0) + (x0 > 0 ? .5 * Math.cos(t) : 0), .5 * Math.sin(t)]); }
      for (let i = 0; i <= 6; i++){ const t = -Math.PI / 2 + i * Math.PI / 6; pts.push([a1 - (x1 < 70 ? .5 : 0) + (x1 < 70 ? .5 * Math.cos(t) : 0), .5 * Math.sin(t)]); }
      s += ctx.poly(pts, .03, M.hole, .3);
    }
    ctx.put(ctx.B(-35, -.5, 0, 35, .5, .05), s);
  },
});

/* LD1 COM: one white 3.2 x 2.8 mm package with a red and a green die. Red while the ST-LINK has power, red and
   green in turn while it talks to the target (an upload) */
B.kind('nucleo-com', {
  group: 'smd', size: () => [3.2, 2.8], h: 1.9,
  draw(ctx){
    const p = ctx.p, [l, w] = p.size, h = p.h, lit = ctx.lit, st = ctx.st || {};
    const green = st.up && Math.floor((st.upT || 0) * 7) % 2 === 1, col = green ? '#4cc65a' : '#e8392e';
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h * .35, M.tin, toneI, .5) + ctx.slab(-l / 2 + .2, -w / 2 + .2, l / 2 - .2, w / 2 - .2, h * .35, h, M.white, toneI, .6);
    if (lit > .05) s += ctx.glow(0, 0, h, 1.6 + 3 * lit, col, .35 * lit) + ctx.glow(0, 0, h, .8 + 1.2 * lit, '#fffbe8', .7 * lit);
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), s);
  },
});

/* headers, pin 1 first; nets as the target sees them (docs/facts/nucleo-f401re.md section 4) */
const CN6 = ['', '3V3', 'NRST', '3V3', '5V', 'GND', 'GND', 'VIN'];
const CN6L = ['NC', 'IOREF', 'NRST', '3V3', '5V', 'GND', 'GND', 'VIN'];
const CN8 = ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'];
const CN5 = ['D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'GND', 'AVDD', 'D14', 'D15'];
const CN5L = ['D8', 'PWM/D9', 'PWM/CS/D10', 'PWM/MOSI/D11', 'MISO/D12', 'SCK/D13', 'GND', 'AVDD', 'SDA/D14', 'SCL/D15'];
// D0 and D1 (PA3, PA2) go to the ST-LINK's virtual COM port, not to this header, until SB62/SB63 are closed
const CN9 = ['', '', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7'];
const CN9L = ['RX/D0', 'TX/D1', 'D2', 'PWM/D3', 'D4', 'PWM/D5', 'PWM/D6', 'D7'];
// PC14/PC15 drive the X2 crystal and reach CN7 only with SB48/SB49 closed; PA2/PA3 on CN10 likewise need SB62/SB63
const CN7 = ['PC10', 'PC11', 'PC12', 'PD2', 'VDD', 'E5V', 'BOOT0', 'GND', '', '', '', '3V3', 'PA13', 'NRST', 'PA14', '3V3', 'PA15', '5V', 'GND', 'GND',
  'PB7', 'GND', 'PC13', 'VIN', '', '', '', 'A0', 'PH0', 'A1', 'PH1', 'A2', 'VBAT', 'A3', 'PC2', 'A4', 'PC3', 'A5'];
const CN7L = ['PC10', 'PC11', 'PC12', 'PD2', 'VDD', 'E5V', 'BOOT0', 'GND', '-', '-', '-', 'IOREF', 'PA13', 'RESET', 'PA14', '+3.3V', 'PA15', '+5V', 'GND', 'GND',
  'PB7', 'GND', 'PC13', 'VIN', 'PC14', '-', 'PC15', 'PA0', 'PH0', 'PA1', 'PH1', 'PA4', 'VBAT', 'PB0', 'PC2', 'PC1', 'PC3', 'PC0'];
const CN10 = ['PC9', 'PC8', 'D15', 'PC6', 'D14', 'PC5', 'AVDD', 'U5V', 'GND', '', 'D13', 'PA12', 'D12', 'PA11', 'D11', 'PB12', 'D10', '', 'D9', 'GND',
  'D8', 'PB2', 'D7', 'PB1', 'D6', 'PB15', 'D5', 'PB14', 'D4', 'PB13', 'D3', 'GND', 'D2', 'PC4', '', '', '', ''];
const CN10L = ['PC9', 'PC8', 'PB8', 'PC6', 'PB9', 'PC5', 'AVDD', 'U5V', 'GND', '-', 'PA5', 'PA12', 'PA6', 'PA11', 'PA7', 'PB12', 'PB6', '-', 'PC7', 'GND',
  'PA9', 'PB2', 'PA8', 'PB1', 'PB10', 'PB15', 'PB4', 'PB14', 'PB5', 'PB13', 'PB3', 'AGND', 'PA10', 'PC4', 'PA2', '-', 'PA3', '-'];

/* fitted 0603 parts from the PcbDoc that the parts list does not draw one by one ('r' resistor, 'c' capacitor) */
const TARGET_SPOTS = [
  [41.35, 43.14, 'c', 90], [42.62, 43.14, 'c', 90], [48.97, 43.14, 'c', 90], [50.24, 43.14, 'c', 90], [26.75, 34.89, 'c', 90],
  [43.29, 30.44, 'c'], [23.57, 20.92, 'c', 90], [43.89, 20.28, 'c'], [26.75, 13.93, 'c', 90], [35.25, 14.69, 'c'],
  [24.21, 13.30, 'c'], [24.21, 5.29, 'c'], [21.67, 20.92, 'r', 90], [28.02, 13.93, 'r', 90], [29.29, 13.93, 'r', 90],
];
const STLINK_SPOTS = [
  [32.46, 75.53, 'c', 90], [51.51, 71.08, 'c'], [22.30, 67.27, 'c', 90], [41.99, 70.45, 'c', 90], [51.51, 69.81, 'c'],
  [18.49, 66.00, 'c'], [28.65, 66.00, 'c', 90], [22.30, 64.73, 'c', 90], [48.97, 65.37, 'c', 90], [37.54, 60.92, 'c'],
  [50.88, 62.19, 'c', 90], [52.78, 62.19, 'c', 90], [12.78, 75.53, 'r'], [29.29, 75.53, 'r', 90], [35.64, 75.53, 'r', 90],
  [12.78, 71.72, 'r'], [34.37, 75.53, 'r', 90], [36.91, 75.53, 'r', 90], [12.78, 69.81, 'r'], [55.96, 70.45, 'r', 90],
  [54.69, 70.45, 'r', 90], [57.23, 70.45, 'r', 90], [12.78, 67.91, 'r'], [18.49, 67.27, 'r'], [43.89, 70.45, 'r', 90],
  [45.80, 70.45, 'r', 90], [47.07, 70.45, 'r', 90], [48.34, 70.45, 'r', 90], [58.50, 70.45, 'r', 90], [59.77, 70.45, 'r', 90],
  [61.04, 70.45, 'r', 90], [12.78, 66.00, 'r'], [18.49, 64.73, 'r'], [43.89, 64.73, 'r'], [43.89, 66.00, 'r'],
  [18.49, 63.46, 'r'], [56.59, 62.25, 'r', 90],
];
/* the closed 0 Ohm solder bridges on the bottom side (SB3-SB65, the C-04 BOM's fitted ones) */
const BRIDGE_SPOTS = [
  [19.13, 79.97, 'b'], [19.13, 77.43, 'b'], [19.13, 74.89, 'b'], [19.13, 72.35, 'b'], [35.64, 62.83, 'b', 90], [38.18, 62.83, 'b', 90],
  [36.91, 62.83, 'b', 90], [39.45, 62.83, 'b', 90], [45.80, 64.10, 'b', 90], [19.13, 49.49, 'b'], [47.70, 38.06, 'b'], [22.94, 18.38, 'b'],
  [31.19, 18.38, 'b', 90], [34.37, 17.11, 'b'], [22.94, 12.66, 'b'], [34.37, 15.84, 'b'], [34.37, 14.57, 'b'], [34.37, 12.66, 'b'],
  [43.89, 36.79, 'b'], [43.89, 34.25, 'b'], [47.70, 35.52, 'b'], [43.89, 31.71, 'b'], [47.70, 32.98, 'b'], [28.02, 34.89, 'b', 90],
  [30.56, 34.89, 'b', 90], [47.70, 30.44, 'b'], [38.81, 30.44, 'b', 90], [43.26, 27.90, 'b'], [47.70, 27.27, 'b'], [47.70, 24.73, 'b'],
  [47.70, 23.46, 'b'], [43.89, 20.92, 'b'], [43.89, 16.47, 'b'], [43.26, 23.46, 'b'],
];

const RED = '#e8392e', GREEN = '#4cc65a';
const CN5Y = n => 26.88 + (n - 1) * 2.54, CN9Y = n => 5.04 + (n - 1) * 2.54, CN6Y = n => 40.60 - (n - 1) * 2.54, CN8Y = n => 17.74 - (n - 1) * 2.54;

/* the factory demo (UM1724 section 6.1): LD2 blinks, and each press of B1 steps the blink rate */
const RATES = [.5, .2, .08];
let demo = { n: 0, down: false, t: 0 };
const factory = (st, t) => {
  if (t < demo.t) demo = { n: 0, down: false, t };
  demo.t = t;
  const down = !!(st.ctl && st.ctl.B1);
  if (down && !demo.down) demo.n++;
  demo.down = down;
  const h = RATES[demo.n % RATES.length];
  return { D13: blink(t, h, h) };
};

B.board({
  id: 'nucleo-f401re', fig: '08', name: 'STM32 Nucleo-F401RE', sub: 'STM32F401RE (Cortex-M4F, 84 MHz), 3.3 V logic, ST-LINK/V2-1 on USB Mini-B',
  pcb: { w: 70, h: 82.5, thick: 1.6, color: '#f3f2ec', silk: '#2d55a6', standoff: 6,
    outline: [[2, 2], [11.5, 2], [13.5, 0], [46.5, 0], [48.5, 2], [68, 2], [69.41, 2.59], [70, 4], [70, 80.5], [69.41, 81.91], [68, 82.5],
      [2, 82.5], [.59, 81.91], [0, 80.5], [0, 4], [.59, 2.59]] },
  mat: { front: 9, back: 30, left: 9, right: 9 },
  height: 14, pal: 'tomato', logic: 3.3,
  holes: [[43.89, 2.5, 3.2], [10.87, 54.57, 3.2], [59.13, 53.30, 3.2]],
  silk: [
    [11.8, 50.85, 'MB1136', 1.5], [10.6, 48.95, 'rev C', 1.5], [28.2, 2.75, 'www.st.com/stm32nucleo', 1.3],
    [8.4, 45.7, 'E5V', 1], [8.4, 43.1, 'GND', 1], [19.4, 55.6, 'USER', 1], [51.9, 55.6, 'RESET', 1],
    [41.1, 47.6, 'E5V', 1, 90], [50.5, 47.6, 'U5V', 1, 90], [45.8, 45.4, 'PWR', 1], [34.6, 39.1, 'IDD', 1],
    ...CN6L.slice(1).map((t, i) => [12.4 + t.length * .4, CN6Y(i + 2), t, 1]), [16.2, 27.9, 'POWER', 1, 90],
    ...CN8.map((t, i) => [13.2, CN8Y(i + 1), t, 1]), [14.9, 14.6, 'AIN', 1, 90],
    ...CN5L.map((t, i) => [57 - t.length * .4, CN5Y(i + 1), t, 1]),
    ...CN9L.map((t, i) => [57 - t.length * .4, CN9Y(i + 1), t, 1]),
    [18.8, 75.3, 'ST-LINK', 1, 90], [26.6, 75.4, 'NUCLEO', 1, 90], [15.2, 60.2, 'RX', 1], [14.5, 62.7, 'TX', 1],
    [8.3, 75.9, 'SWD', 1], [3.2, 73.9, 'GND', 1], [64.5, 77.1, 'GND', 1, 90], [60.1, 73.0, 'COM', 1], [40.1, 77.3, 'USB PWR', 1, 90],
  ],
  parts: [
    /* target */
    { id: 'U5', kind: 'qfp', name: 'STM32F401RE microcontroller (Cortex-M4F, 84 MHz, 512 KB flash)', short: 'MCU', at: [32.46, 24.09], size: [10, 10], n: 16, h: 1.4,
      label: 'ARM|STM32F401|RET6U', nets: { 2: 'PC13', 7: 'NRST', 13: 'AVDD', 14: 'A0', 21: 'D13', 32: 'VDD', 64: 'VDD' } },
    { id: 'U3', kind: 'sot223', name: 'LD1117 5 V regulator (VIN to E5V)', short: '5V REG', at: [29.35, 45.68], rot: 180 },
    { id: 'U4', kind: 'soic', name: 'LD39050 3.3 V regulator (500 mA, current limited)', short: '3V3 REG', at: [45.80, 43.14], rot: 90, size: [3, 3], n: 3, pitch: .95, h: 1 },
    { id: 'D4', kind: 'sod', name: 'STPS2L30A Schottky diode (5 V regulator to E5V)', short: 'SCHOTTKY', at: [21.03, 47.59], size: [4.3, 2.6], h: 2.3,
      polar: { fault: 'dark', opts: ['cathode band towards the E5V pin, as printed', 'cathode band the other way (backwards)'] } },
    { id: 'C16', kind: 'tant', name: '10 µF tantalum capacitor on VIN', at: [21.03, 43.78], size: [3.5, 2.8], h: 1.9,
      polar: { fault: 'hot', rail: 'VIN', opts: ['plus band towards U3, as printed', 'plus band the other way (backwards)'] } },
    { id: 'C17', kind: 'tant', name: '10 µF tantalum capacitor on the 5 V regulator output', at: [35.64, 45.55], rot: 90, size: [3.2, 1.6], h: 1.6,
      polar: { fault: 'hot', rail: 'E5V', opts: ['plus band towards JP5, as printed', 'plus band the other way (backwards)'] } },
    { id: 'SB2', kind: 'chip', name: 'SB2 solder bridge (0 Ω): the 3.3 V regulator output', at: [40.08, 43.14], rot: 90, size: [1.6, .8], h: .5 },
    { id: 'L1', kind: 'chip', name: 'Ferrite bead: VDD to the analog supply (VDDA)', at: [43.89, 19.01], size: [1.6, .8], h: .8, ferrite: true },
    { id: 'LD2', kind: 'led', name: 'LD2 green user LED (D13, PA5)', short: 'LD2', at: [44.53, 39.33], size: [1.6, .8], h: .8, led: { color: GREEN, net: 'D13', via: ['R31'] } },
    { id: 'R31', kind: 'chip', name: '510 Ω resistor for LD2', at: [47.70, 39.33], size: [1.6, .8], h: .5 },
    { id: 'LD3', kind: 'led', name: 'LD3 red power LED (+5V)', short: 'LD3 PWR', at: [22.74, 38.06], size: [1.6, .8], h: .8, led: { color: RED, rail: '5V', via: ['R32'] } },
    { id: 'R32', kind: 'chip', name: '1 kΩ resistor for LD3', at: [22.94, 34.89], size: [1.6, .8], h: .5 },
    { id: 'B1', kind: 'tact', name: 'B1 USER button (blue, PC13, reads LOW when pressed)', short: 'B1 USER', at: [26.74, 53.30], size: [6, 6], h: 4.3, group: 'smd', capColor: '#3a6fd1',
      control: { type: 'button', action: 'input', net: 'PC13', active: 0 } },
    { id: 'R30', kind: 'chip', name: '4.7 kΩ pull-up on PC13 (B1)', at: [35.00, 50.13], size: [1.6, .8], h: .5 },
    { id: 'R29', kind: 'chip', name: '100 Ω resistor in the B1 debounce filter', at: [35.00, 53.94], size: [1.6, .8], h: .5 },
    { id: 'C15', kind: 'chip', name: '100 nF capacitor in the B1 debounce filter', at: [35.00, 52.03], size: [1.6, .8], h: .5, cap: true },
    { id: 'B2', kind: 'tact', name: 'B2 RESET button (black, NRST)', short: 'B2 RESET', at: [43.26, 53.30], size: [6, 6], h: 4.3, group: 'smd',
      control: { type: 'button', action: 'reset' } },
    { id: 'C14', kind: 'chip', name: '100 nF capacitor on NRST', at: [35.00, 55.84], size: [1.6, .8], h: .5, cap: true },
    { id: 'X2', kind: 'xtal-smd', name: '32.768 kHz crystal for the real-time clock (LSE)', short: '32 kHz', at: [20.40, 8.85], size: [8, 3.8], h: 2.5 },
    { id: 'X3', kind: 'pads', name: 'Empty X3 footprint: no 8 MHz crystal is fitted, the sketch runs on the internal 16 MHz clock', at: [30.56, 9.49], pitch: 5.08, d: 1.6, fixed: true, pins: ['', ''] },
    scatter(TARGET_SPOTS, { id: 'PASSIVES', name: 'Small 0603 resistors and capacitors around the MCU and the regulators', short: '0603' }),
    scatter(BRIDGE_SPOTS, { id: 'SB', name: 'Solder bridges SB3-SB65 on the bottom (0 Ω links that route pins)', side: 'bottom' }),
    { id: 'JP5', kind: 'male', name: 'JP5 power source jumper header (1-2 U5V, 2-3 E5V)', short: 'JP5', at: [45.80, 47.59], rot: 180, h: 8.6, pins: ['U5V', '5V', 'E5V'], labels: ['U5V', '+5V', 'E5V'] },
    { id: 'JP5_CAP', kind: 'nucleo-cap', name: 'JP5 jumper cap (power source)', short: 'JP5 CAP', at: [47.07, 47.59], z: 2.5, moves: -2.54 },
    { id: 'JP6', kind: 'male', name: 'JP6 IDD jumper header (3.3 V to the MCU, for measuring its current)', short: 'JP6 IDD', at: [34.37, 41.24], rot: 180, h: 8.6, pins: ['3V3', 'VDD'], labels: ['+3V3', 'VDD'] },
    { id: 'JP6_CAP', kind: 'nucleo-cap', name: 'JP6 jumper cap (IDD)', short: 'JP6 CAP', at: [34.37, 41.24], z: 2.5 },
    { id: 'CN7', kind: 'male', name: 'CN7 ST morpho header, left (2 x 19 pins)', short: 'CN7', at: [4.52, 27.90], rot: 90, rows: 2, mirror: true, h: 12.5, pins: CN7, labels: CN7L },
    { id: 'CN10', kind: 'male', name: 'CN10 ST morpho header, right (2 x 19 pins)', short: 'CN10', at: [65.48, 27.90], rot: 90, rows: 2, mirror: true, h: 12.5, pins: CN10, labels: CN10L },
    { id: 'CN6', kind: 'female', name: 'CN6 Arduino POWER header (IOREF, NRST, 3V3, 5V, GND, VIN)', short: 'POWER', at: [10.87, 31.71], rot: 270, h: 8.5, pins: CN6, labels: CN6L },
    { id: 'CN8', kind: 'female', name: 'CN8 Arduino analog header A0-A5', short: 'A0-A5', at: [10.87, 11.39], rot: 270, h: 8.5, pins: CN8 },
    { id: 'CN5', kind: 'female', name: 'CN5 Arduino digital header D8-D15, GND, AVDD', short: 'D8-D15', at: [59.13, 38.31], rot: 90, h: 8.5, pins: CN5, labels: CN5L },
    { id: 'CN9', kind: 'female', name: 'CN9 Arduino digital header D0-D7', short: 'D0-D7', at: [59.13, 13.93], rot: 90, h: 8.5, pins: CN9, labels: CN9L },
    /* ST-LINK/V2-1 */
    { id: 'SLOTS', kind: 'nucleo-slots', name: 'Snap-off line: routed slots between the ST-LINK and the target board', at: [35, 57.5], fixed: true },
    { id: 'U2', kind: 'qfp', name: 'STM32F103 running the ST-LINK/V2-1 (programmer, virtual COM port, USB drive)', short: 'ST-LINK', at: [35.00, 67.27], rot: 270, size: [7, 7], n: 12, h: 1.4,
      label: 'STM32F103|CBT6' },
    { id: 'X1', kind: 'xtal', name: '8 MHz crystal for the ST-LINK', short: '8 MHz', at: [25.48, 65.99], rot: 90, size: [11, 4.7], h: 3.6 },
    { id: 'U1', kind: 'soic', name: 'LD3985 3.3 V regulator for the ST-LINK (150 mA)', short: 'ST 3V3', at: [51.51, 66.00], rot: 270, size: [2.9, 1.6], n: 3, pitch: .95, h: 1.1 },
    { id: 'T2', kind: 'soic', name: 'STS9P3LLH6 P-MOSFET: switches USB 5 V to the target once the PC grants 300 mA', short: 'USB SWITCH', at: [61.04, 62.83], rot: 180, size: [4.9, 3.9], n: 4, h: 1.75 },
    { id: 'T1', kind: 'sot23', name: 'MMBT9013 transistor that drives the USB switch', at: [55.96, 66.64], rot: 270 },
    { id: 'D2', kind: 'sod', name: 'BAT60J Schottky diode: USB to the ST-LINK supply', at: [51.51, 72.35], size: [1.7, 1.25], h: .9 },
    { id: 'D3', kind: 'sod', name: 'BAT60J Schottky diode: E5V to the ST-LINK supply', at: [54.69, 62.19], rot: 90, size: [1.7, 1.25], h: .9 },
    { id: 'D1', kind: 'sod', name: 'BAT60J Schottky diode on the SWD target voltage sense', at: [12.78, 73.62], size: [1.7, 1.25], h: .9 },
    { id: 'LD1', kind: 'nucleo-com', name: 'LD1 COM LED (red and green): ST-LINK status', short: 'LD1 COM', at: [60.40, 76.16], rot: 270, led: { color: RED, rail: '3V3_ST', via: ['U1', 'U2'] } },
    { id: 'CN1', kind: 'usb-mini', name: 'USB Mini-B socket (ST-LINK: power, programming, virtual COM port)', short: 'USB', at: [47.06, 78.6], rot: 270, size: [9.2, 7.7], h: 3.9, group: 'smd', plug: true },
    { id: 'CN2', kind: 'male', name: 'CN2 ST-LINK / NUCLEO selector header (SWCLK, SWDIO)', short: 'CN2', at: [22.30, 76.16], rot: 270, h: 8.6,
      pins: ['ST_SWCLK', 'SWCLK', 'ST_SWDIO', 'SWDIO'], labels: ['SWCLK', 'T_SWCLK', 'SWDIO', 'T_SWDIO'] },
    { id: 'CN2_CAPS', kind: 'nucleo-cap', name: 'CN2 jumper caps (the ST-LINK programs the target on this board)', short: 'CN2 CAPS', at: [22.30, 76.16], rot: 270, z: 2.5, size: [10.16, 2.54], caps: [-2.54, 2.54] },
    { id: 'CN4', kind: 'male', name: 'CN4 SWD header (program an external target)', short: 'SWD', at: [8.33, 67.27], rot: 270, h: 8.6,
      pins: ['VDD_TARGET', 'SWCLK_EXT', 'GND', 'SWDIO_EXT', 'NRST_EXT', 'SWO'], labels: ['VDD_TARGET', 'SWCLK', 'GND', 'SWDIO', 'NRST', 'SWO'] },
    { id: 'CN3', kind: 'male', name: 'CN3 header: the ST-LINK virtual COM port RX and TX', short: 'CN3', at: [12.14, 61.56], rot: 90, h: 8.6, pins: ['VCP_RX', 'VCP_TX'], labels: ['RX', 'TX'] },
    { id: 'JP1', kind: 'male', name: 'JP1 USB PWR header (fit a cap to run from a USB charger)', short: 'JP1', at: [34.37, 79.97], h: 8.6, pins: ['3V3_ST', 'USB_PWR'] },
    { id: 'JP4', kind: 'pads', name: 'JP4 footprint, not fitted', at: [3.25, 62.19], rot: 90, d: 1.6, fixed: true, pins: ['', ''] },
    { id: 'CN11', kind: 'male', name: 'CN11 header for a spare jumper cap (GND)', at: [66.75, 77.43], rot: 90, h: 8.5, pins: ['GND', 'GND'] },
    { id: 'CN12', kind: 'male', name: 'CN12 header for a spare jumper cap (GND)', at: [3.25, 77.43], rot: 90, h: 8.5, pins: ['GND', 'GND'] },
    scatter(STLINK_SPOTS, { id: 'PASSIVES_ST', name: 'Small 0603 resistors and capacitors around the ST-LINK', short: '0603' }),
  ],
  power: {
    sources: {
      usb: { label: 'USB cable', part: 'CN1', plug: 'usb-mini', v: 5.0, ilim: .5 },
      vin: { label: 'VIN pin', pin: 'VIN', v: 9, range: [7, 12], max: 15 },
      e5v: { label: 'E5V pin', pin: 'E5V', v: 5, range: [4.75, 5.25], max: 6 },
    },
    default: 'usb',
    // order matters: a rail is computed from the rails above it
    rails: {
      VIN: { from: [{ src: 'vin', burns: 'U3' }] },
      E5V: { from: [{ rail: 'VIN', via: ['C16', 'D4', 'U3'], reg: 4.65, dropout: 1.45, max: 15 }, { src: 'e5v', burns: 'U4' }] },
      U5V: { from: [{ src: 'usb', via: ['CN1'] }] },
      // the ST-LINK (U2) turns T2 on only after the PC grants 300 mA; the JP5 cap sits on 1-2 for USB, 2-3 otherwise
      '5V': { from: [{ rail: 'U5V', via: ['U2', 'T2', 'JP5_CAP'], drop: .02 }, { rail: 'E5V', via: ['JP5_CAP'] }], max: 7, victim: 'U4' },
      // the ST-LINK's own 3.3 V, from USB through D2 or from E5V through D3 (LD1 goes dark without U1)
      '3V3_ST': { from: [{ rail: 'U5V', via: ['U1'], reg: 3.3, dropout: .2 }, { rail: 'E5V', reg: 3.3, dropout: .2 }] },
      '3V3': { from: [{ rail: '5V', via: ['U4'], reg: 3.3, dropout: .2, ilim: .5 }], max: 3.6 },
      VDD: { from: [{ rail: '3V3', via: ['JP6_CAP'] }], max: 3.6 },
    },
    mcu: { part: 'U5', rail: 'VDD', min: 1.7, needs: ['U5'] },
    upload: { source: 'usb', needs: ['CN1', 'U1', 'U2', 'X1', 'CN2', 'CN2_CAPS'], tool: 'stlink', seconds: 2.4 },
  },
  mode: 'blink',
  modes: {
    blink: { title: 'Factory demo', bytes: 11468, out: factory },
    button: { title: 'Button to LED', bytes: 10232, out: st => ({ D13: st.ctl && st.ctl.B1 ? 1 : 0 }) },
    hello: { title: 'Serial hello', bytes: 13900, banner: 'NUCLEO-F401RE ready', out: () => ({}), serial: k => 'hello from the Nucleo #' + k },
  },
  faults: ['short:5V:GND', 'short:3V3:GND', ['missing:JP6_CAP', 'Take the JP6 (IDD) jumper off'], ['missing:JP5_CAP', 'Take the JP5 power jumper off'],
    ['missing:CN2_CAPS', 'Take the CN2 ST-LINK jumpers off'], 'cold:CN1', 'cold:CN5.6'],
  xr: {
    flow: [
      ['U5V', [[47.06, 74.4], [52, 72.4], [58, 66], [61.04, 62.83]]],
      ['5V', [[61.04, 62.83], [61.04, 51], [48.34, 47.59]], [[48.34, 47.59], [45.8, 47.59], [45.8, 43.14]], [[45.8, 45.6], [24.5, 45.6], [24.5, 38.06], [22.74, 38.06]], [[24.5, 39.5], [15.5, 39.5], [15.5, 30.44], [10.87, 30.44]]],
      ['VIN', [[10.87, 22.82], [15.5, 22.82], [15.5, 45.68], [29.35, 45.68]]],
      ['E5V', [[29.35, 47.59], [21.03, 47.59]], [[19, 47.59], [19, 49.6], [43.26, 49.6], [43.26, 47.59]], [[19, 47.59], [5.79, 45.68]]],
      ['3V3', [[45.8, 43.14], [40.08, 43.14], [35.64, 41.24]]],
      ['VDD', [[33.1, 41.24], [33.1, 29.99]]],
      ['3V3_ST', [[51.51, 66], [39.8, 66]]],
      ['D13', [[38.36, 22.34], [52, 22.34], [52, 39.58], [59.13, 39.58]], [[52, 39.33], [44.53, 39.33]]],
    ],
    notes: [['U5', 'SILICON DIE'], ['U2', 'ST-LINK/V2-1'], ['U3', '5 V REGULATOR'], ['U4', '3.3 V REGULATOR'], ['X1', 'QUARTZ'], ['T2', 'USB POWER SWITCH']],
  },
  tags: [['U5', 40, 30], ['CN1', -40, 14], ['U2', 36, -24], ['B1', -30, -26], ['LD2', 34, -30], ['LD3', -36, 18], ['JP6', 30, 30], ['LD1', 34, 16], ['CN7', -20, -40]],
  circuit: 'blink',
  circuits: {
    blink: {
      title: 'Blink an LED on D13 beside LD2', breadboard: 'half',
      parts: [
        { id: 'R1', part: 'resistor', ohms: 220, holes: ['b10', 'b14'] },
        { id: 'LED1', part: 'led', color: 'red', holes: ['c14', 'c15'] },
      ],
      wires: [{ from: 'D13', to: 'a10', color: 'orange' }, { from: 'CN5.7', to: 'a15', color: 'black' }],
    },
    'user-button': {
      title: 'B1 USER and a knob on A0, powered from 3.3 V', breadboard: 'half',
      parts: [{ id: 'RV1', part: 'potentiometer', ohms: 10000, pos: .5, holes: ['h20', 'h21', 'h22'] }],
      wires: [
        { from: 'CN6.6', to: 'j20', color: 'black' },
        { from: 'A0', to: 'j21', color: 'yellow' },
        { from: 'CN6.4', to: 'j22', color: 'red' },
      ],
    },
    'pwm-dimmer': {
      title: 'A knob on A0 dims an LED on PWM pin D9', breadboard: 'half',
      parts: [
        { id: 'R1', part: 'resistor', ohms: 220, holes: ['b10', 'b14'] },
        { id: 'LED1', part: 'led', color: 'yellow', holes: ['c14', 'c15'] },
        { id: 'RV1', part: 'potentiometer', ohms: 10000, pos: .25, holes: ['h20', 'h21', 'h22'] },
      ],
      wires: [
        { from: 'D9', to: 'a10', color: 'orange' },
        { from: 'CN5.7', to: 'a15', color: 'black' },
        { from: 'CN6.6', to: 'j20', color: 'black' },
        { from: 'A0', to: 'j21', color: 'yellow' },
        { from: 'CN6.4', to: 'j22', color: 'red' },
      ],
    },
    'i2c-scan': {
      title: 'MPU-6050 on I2C1 (SDA D14, SCL D15), 3.3 V', breadboard: 'half',
      // GY-521 header VCC GND SCL SDA XDA XCL AD0 INT in row i; the module lies over rows f-h, the jumpers go in row j.
      // The Nucleo has no I2C pull-ups of its own: the GY-521's 4.7 kOhm ones do the job
      parts: [{ id: 'MPU1', part: 'mpu6050', holes: ['i12', 'i13', 'i14', 'i15', 'i16', 'i17', 'i18', 'i19'] }],
      wires: [
        { from: 'CN6.4', to: 'j12', color: 'red' }, { from: 'CN6.6', to: 'j13', color: 'black' },
        { from: 'D15', to: 'j14', color: 'yellow' }, { from: 'D14', to: 'j15', color: 'blue' },
      ],
    },
    sonar: {
      title: 'HC-SR04 at 5 V: TRIG on D7, ECHO straight into D8 (a 5 V tolerant pin)', breadboard: 'half',
      parts: [{ id: 'US1', part: 'hc-sr04', holes: ['a10', 'a11', 'a12', 'a13'] }],
      wires: [
        { from: 'CN6.5', to: 'e10', color: 'red' },
        { from: 'D7', to: 'e11', color: 'yellow' },
        { from: 'D8', to: 'e12', color: 'green' },
        { from: 'CN6.7', to: 'e13', color: 'black' },
      ],
    },
  },
});
})();
