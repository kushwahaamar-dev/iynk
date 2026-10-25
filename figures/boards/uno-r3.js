// @cf title Arduino Uno R3
// @cf use engine/bench.list
// @cf use parts/push-button.js
// @cf use parts/potentiometer.js
// @cf use parts/rgb-led.js
// @cf use parts/ldr.js
// @cf use parts/piezo-buzzer.js
// @cf use parts/tip120.js
// @cf use parts/diode-1n4007.js
// @cf use parts/dc-motor.js
// @cf use parts/fan.js
// @cf use parts/tmp36.js
// @cf use parts/servo-sg90.js
// @cf use parts/stepper-28byj48.js
// @cf use parts/fsr402.js
// @cf use parts/hc-sr04.js
// @cf use parts/ssd1306.js
// @cf use parts/traffic-light.js
// @cf use parts/soil-moisture.js
// @cf use engine/bench-props.js
/* Arduino Uno R3 (A000066, the through-hole "UNO-TH Rev3e" layout). Every position below is the part's centre from
   Arduino's own Eagle board file (UNO-TH_Rev3e.brd, board origin bottom-left, y up), 68.58 x 53.34 mm.
   How it works: USB-B (X2) brings 5 V through the 500 mA polyfuse F1 to USBVCC; the P-MOSFET T1 passes it to the
   5 V rail unless the LMV358 comparator U5A sees VIN above 6.6 V (VIN/2 against 3.3 V), when the NCP1117 (U1) makes
   5 V from the barrel jack X1 (7-12 V, through the M7 diode D1 that blocks a reversed supply). The LP2985 (U2)
   makes 3.3 V, 150 mA. The ATmega16U2 (U3, 16 MHz crystal Y1) is the USB-serial bridge; it resets the ATmega328P
   (ZU4, in a DIP-28 socket, 16 MHz ceramic resonator Y2) through C5 when the computer opens the port, which is how
   uploads start. Optiboot then flashes L three times and listens for about a second. U5B buffers D13 for the L LED.
   The 328P's brown-out detector is set to 2.7 V (extended fuse 0xFD). */
(() => {
const B = SL.bench;
const blink = (t, on, off) => (t % (on + off)) < on ? 1 : 0;
const DIG = ['SCL', 'SDA', 'AREF', 'GND', 'D13', 'D12', 'D11', 'D10', 'D9', 'D8'];
B.board({
  id: 'uno-r3', fig: '01', name: 'Arduino Uno R3', sub: 'ATmega328P at 16 MHz, 5 V logic, USB through an ATmega16U2',
  pcb: { w: 68.58, h: 53.34, thick: 1.6, color: '#2f9aa0', silk: '#f4f6ef', standoff: 4,
    outline: [[0, 0], [66.04, 0], [68.58, 2.54], [68.58, 37.85], [66.04, 40.39], [66.04, 51.82], [64.52, 53.34], [0, 53.34]] },
  mat: { front: 9, back: 9, left: 30, right: 8 },
  height: 14, pal: 'cobalt',
  holes: [[13.97, 2.54, 3.2], [15.24, 50.8, 3.2], [66.04, 7.62, 3.2], [66.04, 35.56, 3.2]],
  bootloader: { led: 'L', flashes: 3, hz: 8, wait: 1 },
  silk: [
    [41, 44.6, 'DIGITAL (PWM~)', 1.5], [33.4, 9.4, 'POWER', 1.4], [57.2, 9.4, 'ANALOG IN', 1.4],
    [39.4, 32.6, 'ARDUINO', 2.6], [44.2, 27.6, 'UNO R3', 2.6], [56.5, 23.4, 'ARDUINO.CC', 1.1],
    [25.2, 41.8, 'L', 1.3], [24.6, 36.2, 'TX', 1.3], [24.6, 33.9, 'RX', 1.3], [61.4, 36.2, 'ON', 1.3],
    [64.9, 32.3, 'ICSP', 1.2], [18.3, 49.6, 'ICSP', 1.1], [2.6, 46.8, 'RESET', 1.1, 90], [30.6, 27, 'RST EN', .9],
    ...['SCL', 'SDA', 'AREF', 'GND', '13', '12', '~11', '~10', '~9', '8'].map((t, i) => [18.796 + i * 2.54 + .45, 46.6, t, 1.1, 90]),
    ...['7', '~6', '~5', '4', '~3', '2', 'TX→1', 'RX←0'].map((t, i) => [45.72 + i * 2.54 + .45, 46.6, t, 1.1, 90]),
    ...['IOREF', 'RESET', '3.3V', '5V', 'GND', 'GND', 'VIN'].map((t, i) => [30.48 + i * 2.54 + .45, 4.6, t, 1.1, 90]),
    ...['A0', 'A1', 'A2', 'A3', 'A4', 'A5'].map((t, i) => [50.8 + i * 2.54 + .45, 4.6, t, 1.1, 90]),
  ],
  traces: [
    [[9.9, 38.1], [12.8, 36.8], [16.2, 35.6]], [[4.06, 29], [4.06, 31], [9.9, 31]], [[8.1, 24.5], [8.1, 20.5]], [[7.7, 13.8], [12.1, 12.1], [24, 12.1]],
    [[22.4, 34.7], [27.9, 36.6]], [[22.4, 33.8], [27.9, 34.3]], [[19.05, 22], [24, 22], [27.9, 23.9]], [[40, 12.6], [30, 12.6], [19.05, 18.6]],
    [[20.3, 20.3], [25.5, 40.2], [27.94, 42.16]], [[46.4, 20.4], [46.4, 24.9], [41.3, 24.9]], [[58.4, 33.8], [58.4, 36.6]], [[38.1, 5], [38.1, 8], [44.3, 10.5]],
    [[28.96, 48], [28.96, 44.5], [27.94, 44.45]], [[63.6, 30.5], [62, 26], [52, 20]], [[21.6, 4.2], [21.6, 8.1], [25.5, 9.1]],
  ],
  parts: [
    { id: 'ZU4', kind: 'dip', name: 'ATmega328P microcontroller', short: 'MCU', at: [46.355, 16.383], rot: 180, n: 14, h: 3.4, z: 3, inSocket: 'SK1',
      label: 'ATMEGA328P-PU|ATMEL', polar: { fault: 'hot', opts: ['notch right, as printed', 'notch left (backwards)'] } },
    { id: 'SK1', kind: 'socket', name: 'DIP-28 socket', short: 'SOCKET', at: [46.355, 16.383], rot: 180, n: 14, h: 3 },
    { id: 'U3', kind: 'qfn', name: 'ATmega16U2 USB-to-serial bridge', short: 'USB-SERIAL', at: [19.939, 34.671], size: [5, 5], n: 8, label: 'ATMEGA|16U2' },
    { id: 'Y1', kind: 'xtal', name: '16 MHz crystal for the 16U2 (HC-49/S, through-hole)', short: '16 MHz CRYSTAL', at: [18.923, 26.162], size: [11.4, 4.6], h: 3.6, label: '16.000' },
    { id: 'Y2', kind: 'resonator', name: '16 MHz ceramic resonator for the 328P', short: 'RESONATOR', at: [41.275, 24.892], size: [3.2, 1.3] },
    { id: 'U1', kind: 'sot223', name: 'NCP1117 5 V regulator', short: '5V REG', at: [7.747, 17.399], rot: 90, label: '1117' },
    { id: 'U2', kind: 'sot23', name: 'LP2985 3.3 V regulator', short: '3V3 REG', at: [21.971, 15.24], rot: 90, n: 5, label: 'L33' },
    { id: 'U5', kind: 'soic', name: 'LMV358 op-amp: USB/VIN switch and L buffer', short: 'OP-AMP', at: [19.05, 20.32], size: [3, 3], n: 4, pitch: .65, h: 1.1, rot: 90, label: '358' },
    { id: 'T1', kind: 'sot23', name: 'FDN340P MOSFET: USB power switch', short: 'USB SWITCH', at: [8.128, 26.543], rot: 90 },
    { id: 'F1', kind: 'fuse', name: '500 mA resettable polyfuse', short: 'POLYFUSE', at: [4.064, 26.543], size: [4.5, 3.2], rot: 90 },
    { id: 'D1', kind: 'sod', name: 'M7 diode: reverse-polarity protection', short: 'DIODE', at: [21.59, 2.794], size: [4.4, 3.6], h: 2.2, label: 'M7' },
    { id: 'D2', kind: 'sod', name: 'Reset clamp diode (328P)', at: [59.436, 27.94], size: [3.5, 1.4], rot: 90, melf: true },
    { id: 'D3', kind: 'sod', name: 'Reset clamp diode (16U2)', at: [13.081, 46.228], size: [3.5, 1.4], rot: 90, melf: true },
    { id: 'PC1', kind: 'ecap-smd', name: '47 µF capacitor on VIN', short: '47 µF', at: [25.527, 9.144], rot: 180, label: '47', polar: { fault: 'pop', rail: 'VIN', opts: ['black band to the top, as printed', 'black band to the bottom (backwards)'] } },
    { id: 'PC2', kind: 'ecap-smd', name: '47 µF capacitor on 5 V', short: '47 µF', at: [18.415, 9.144], rot: 180, label: '47', polar: { fault: 'pop', rail: '5V', opts: ['black band to the top, as printed', 'black band to the bottom (backwards)'] } },
    { id: 'L2', kind: 'chip', name: '10 µH inductor: AVCC filter', at: [39.116, 8.128], size: [2, 1.25], h: .8, ferrite: true },
    { id: 'L1', kind: 'chip', name: 'Ferrite bead on the USB shield', at: [7.62, 45.085], size: [2, 1.25], h: .8, ferrite: true },
    { id: 'C1', kind: 'chip', name: '100 nF capacitor (3.3 V regulator in)', at: [18.415, 15.367], rot: 90, cap: true },
    { id: 'C2', kind: 'chip', name: '100 nF capacitor (USB power)', at: [12.065, 29.845], cap: true },
    { id: 'C3', kind: 'chip', name: '1 µF capacitor (3.3 V out)', at: [25.527, 15.367], rot: 90, cap: true },
    { id: 'C4', kind: 'chip', name: '100 nF capacitor (16U2 reset)', at: [27.94, 44.45], cap: true },
    { id: 'C5', kind: 'chip', name: '100 nF auto-reset capacitor (DTR to RESET)', short: 'AUTO-RESET', at: [27.94, 29.845], cap: true },
    { id: 'C6', kind: 'chip', name: '100 nF decoupling capacitor (328P)', at: [45.72, 22.86], cap: true },
    { id: 'C7', kind: 'chip', name: '100 nF decoupling capacitor (16U2)', at: [27.94, 31.496], cap: true },
    { id: 'C8', kind: 'chip', name: '1 µF capacitor (16U2 UCAP)', at: [12.7, 41.91], cap: true },
    { id: 'C9', kind: 'chip', name: '22 pF crystal capacitor', at: [16.002, 29.591], cap: true },
    { id: 'C10', kind: 'chip', name: '100 nF capacitor (AVCC)', at: [44.323, 10.541], cap: true },
    { id: 'C11', kind: 'chip', name: '22 pF crystal capacitor', at: [22.225, 29.591], cap: true },
    { id: 'R1', kind: 'chip', name: '1 MΩ resistor across the crystal', at: [19.05, 29.591] },
    { id: 'R2', kind: 'chip', name: '1 MΩ resistor across the resonator', at: [41.275, 22.733] },
    { id: 'RN1', kind: 'chip', name: '10 kΩ resistor array (reset pull-ups)', at: [27.94, 23.876], size: [3.2, 1.6], rot: 90 },
    { id: 'RN2', kind: 'chip', name: '1 kΩ resistor array (L, TX, RX LEDs)', at: [27.94, 39.37], size: [3.2, 1.6], rot: 90 },
    { id: 'RN3', kind: 'chip', name: '22 Ω resistor array (USB data lines)', at: [12.827, 36.83], size: [3.2, 1.6], rot: 90 },
    { id: 'RN4', kind: 'chip', name: '1 kΩ resistor array (ON LED)', at: [58.42, 33.782], size: [3.2, 1.6], rot: 90 },
    { id: 'Z1', kind: 'chip', name: 'Varistor: ESD guard on USB D+', at: [12.7, 39.37], cap: true },
    { id: 'Z2', kind: 'chip', name: 'Varistor: ESD guard on USB D−', at: [12.7, 33.655], cap: true },
    { id: 'L', kind: 'led', name: 'L LED (pin 13)', short: 'L LED', at: [27.94, 42.164], led: { color: '#f2b12e', net: 'D13', via: ['U5', 'RN2'] } },
    { id: 'TX', kind: 'led', name: 'TX LED', short: 'TX', at: [27.94, 36.576], led: { color: '#f2b12e', serial: 'tx', via: ['U3', 'RN2'] } },
    { id: 'RX', kind: 'led', name: 'RX LED', short: 'RX', at: [27.94, 34.29], led: { color: '#f2b12e', serial: 'rx', via: ['U3', 'RN2'] } },
    { id: 'ON', kind: 'led', name: 'ON LED (5 V)', short: 'ON', at: [58.42, 36.576], rot: 90, led: { color: '#4cc65a', rail: '5V', via: ['RN4'] } },
    { id: 'RESET', kind: 'tact', name: 'RESET button', short: 'RESET', at: [6.35, 49.403], size: [6, 6], h: 3.5, group: 'smd', control: { type: 'button', action: 'reset' } },
    { id: 'JP2', kind: 'pads', name: '16U2 spare pins PB4-PB7 (no header fitted)', at: [19.558, 41.148], rot: 90, rows: 2, fixed: true, pins: ['PB4', 'PB6', 'PB5', 'PB7'] },
    { id: 'RESET-EN', kind: 'pads', name: 'RESET-EN solder jumper (cut it to stop auto-reset)', at: [27.94, 27.305], rows: 1, pitch: 1.3, d: 1, fixed: true, pins: ['DTR', 'RESET'] },
    { id: 'ICSP1', kind: 'male', name: 'ICSP header for the 16U2', short: 'ICSP 16U2', at: [18.288, 46.228], rows: 2, mirror: true, h: 8.5,
      pins: ['MISO2', '5V', 'SCK2', 'MOSI2', 'RESET2', 'GND'], labels: ['MISO', '5V', 'SCK', 'MOSI', 'RESET', 'GND'] },
    { id: 'ICSP', kind: 'male', name: 'ICSP header for the 328P', short: 'ICSP', at: [64.897, 27.94], rot: 90, rows: 2, mirror: true, h: 8.5,
      pins: ['D12', '5V', 'D13', 'D11', 'RESET', 'GND'], labels: ['MISO', '5V', 'SCK', 'MOSI', 'RESET', 'GND'] },
    { id: 'X2', kind: 'usb-b', name: 'USB-B socket', short: 'USB-B', at: [1.8, 38.1], size: [16.3, 12], h: 10.9 },
    { id: 'X1', kind: 'barrel', name: '2.1 mm barrel jack, centre positive, 7-12 V', short: 'POWER JACK', at: [5.3, 7.75], size: [14.2, 8.9], h: 11 },
    { id: 'IOH', kind: 'female', name: 'Digital header D8-D13, GND, AREF, SDA, SCL', short: 'D8-D13', at: [30.226, 50.8], h: 8.5,
      pins: DIG, labels: ['SCL', 'SDA', 'AREF', 'GND', '13', '12', '~11', '~10', '~9', '8'] },
    { id: 'IOL', kind: 'female', name: 'Digital header D0-D7', short: 'D0-D7', at: [54.61, 50.8], h: 8.5,
      pins: ['D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'D1', 'D0'], labels: ['7', '~6', '~5', '4', '~3', '2', 'TX→1', 'RX←0'] },
    { id: 'POWER', kind: 'female', name: 'Power header', short: 'POWER', at: [36.83, 2.54], h: 8.5,
      pins: ['', 'IOREF', 'RESET', '3V3', '5V', 'GND', 'GND', 'VIN'], labels: ['NC', 'IOREF', 'RESET', '3.3V', '5V', 'GND', 'GND', 'VIN'] },
    { id: 'AD', kind: 'female', name: 'Analog header A0-A5', short: 'A0-A5', at: [57.15, 2.54], h: 8.5, pins: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'] },
  ],
  power: {
    sources: {
      usb: { label: 'USB cable', part: 'X2', plug: 'usb-b', v: 5.0, ilim: .5 },
      jack: { label: 'Barrel jack', part: 'X1', plug: 'barrel', v: 9, range: [7, 12], max: 20 },
      vin: { label: 'VIN pin', pin: 'VIN', v: 9, range: [7, 12], max: 20 },
      pin5: { label: '5V pin', pin: '5V', v: 5, range: [4.75, 5.25], max: 6 },
    },
    default: 'usb',
    rails: {
      USBVCC: { from: [{ src: 'usb', via: ['X2', 'F1'] }] },
      // VIN fed backwards on its pin skips D1 and takes out the NCP1117 (facts §6)
      VIN: { from: [{ src: 'jack', via: ['X1', 'D1'], drop: .7, protect: 'D1' }, { src: 'vin', burns: 'U1' }] },
      '5V': { from: [{ rail: 'VIN', via: ['U1'], reg: 5, dropout: 1.1, max: 20 }, { rail: 'USBVCC', via: ['T1', 'U5'], drop: .05, offIf: ['VIN', '>', 6.6] }, { src: 'pin5' }], max: 6 },
      // the LP2985 is rated 150 mA with its own current limit: a 3V3 short folds it back, 5 V keeps running (facts §3.2)
      '3V3': { from: [{ rail: '5V', via: ['U2'], reg: 3.3, dropout: .3, ilim: .15 }], max: 3.6 },
    },
    mcu: { part: 'ZU4', rail: '5V', min: 2.7, needs: ['ZU4', 'SK1', 'Y2', 'RN1'] },
    upload: { source: 'usb', needs: ['U3', 'Y1', 'RN3', 'C5', 'ZU4'], tool: 'avrdude' },
  },
  mode: 'blink',
  modes: {
    blink: { title: 'Blink', bytes: 924, out: (st, t) => ({ D13: blink(t, 1, 1) }) },
    fast: { title: 'Blink without delay()', bytes: 1006, out: (st, t) => ({ D13: blink(t, .2, .2) }) },
    fade13: { title: 'analogWrite on pin 13 (no PWM there)', bytes: 1132, out: (st, t) => ({ D13: Math.floor((t % 2.56) / 2.56 * 256) >= 128 ? 1 : 0 }) },
    hello: { title: 'Serial hello', bytes: 1490, banner: 'Uno ready', out: () => ({}), serial: k => 'hello from the Uno #' + k },
  },
  faults: ['short:5V:GND', 'short:3V3:GND'],
  xr: {
    flow: [
      ['USBVCC', [[9.9, 38.1], [4.06, 31], [4.06, 26.5], [8.1, 26.5]]],
      ['5V', [[8.1, 24.5], [8.1, 20.4], [12, 12.4], [38.1, 12.4], [38.1, 3.4]]],
      ['VIN', [[12.4, 7.75], [21.6, 2.8], [45.72, 3.4]]],
      ['D13', [[40, 12.6], [30, 12.6], [19.05, 18.6], [19.05, 22], [25.5, 40.2], [27.94, 42.16]]],
    ],
    notes: [['ZU4', 'SILICON DIE'], ['U3', 'USB BRIDGE'], ['Y1', 'QUARTZ'], ['U1', '5V REGULATOR'], ['F1', 'POLYFUSE']],
  },
  tags: [['ZU4', 40, 34], ['U3', -46, -16], ['X2', -44, 12], ['X1', -40, 22], ['RESET', -30, -26], ['L', 34, -30], ['ON', 36, -18], ['U1', -40, 34], ['Y1', -34, 40]],
  /* One circuit per lesson (key = lesson id in src/content/boards/uno-r3.ts). Circuit part ids never reuse a board
     designator (the board has its own R1, D1, L...), so selecting RES1 cannot light up the board's R1. Nets with more
     than one header pin are named by pin id so the wire leaves the header the lesson shows: IOH.4 = GND beside D13,
     IOH.5 = D13, IOH.7 = D11, POWER.4 = 3V3, POWER.5 = 5V, POWER.6 / POWER.7 = GND. The ULN2003 driver has no
     breadboard part yet, so the stepper circuit leaves its four signal wires out. */
  circuit: 'blink',
  circuits: {
    blink: {
      title: 'Blink an LED', breadboard: 'half',
      parts: [
        { id: 'RES1', part: 'resistor', ohms: 220, holes: ['b10', 'b14'] },
        { id: 'LED1', part: 'led', color: 'red', holes: ['c14', 'c15'] },
      ],
      wires: [
        { from: 'IOH.5', to: 'a10', color: 'orange' },
        { from: 'IOH.4', to: 'a15', color: 'black' },
      ],
    },
    button: {
      title: 'Push a button', breadboard: 'half',
      parts: [
        { id: 'BTN1', part: 'push-button', holes: ['e8', 'f8', 'e10', 'f10'] },
        { id: 'RES1', part: 'resistor', ohms: 10000, holes: ['b10', 'b14'] },
        { id: 'RES2', part: 'resistor', ohms: 220, holes: ['b15', 'b19'] },
        { id: 'LED1', part: 'led', color: 'red', holes: ['c19', 'c20'] },
      ],
      wires: [
        { from: 'POWER.5', to: 'a8', color: 'red' },
        { from: 'D2', to: 'a10', color: 'blue' },
        { from: 'IOH.4', to: 'a14', color: 'black' },
        { from: 'IOH.5', to: 'a15', color: 'orange' },
        { from: 'e14', to: 'e20', color: 'black' },
      ],
    },
    knob: {
      title: 'Turn a knob', breadboard: 'half',
      parts: [
        { id: 'POT1', part: 'potentiometer', ohms: 10000, holes: ['e9', 'e10', 'e11'] },
        { id: 'RES1', part: 'resistor', ohms: 220, holes: ['b15', 'b19'] },
        { id: 'LED1', part: 'led', color: 'red', holes: ['c19', 'c20'] },
      ],
      wires: [
        { from: 'POWER.6', to: 'a9', color: 'black' },
        { from: 'A0', to: 'a10', color: 'green' },
        { from: 'POWER.5', to: 'a11', color: 'red' },
        { from: 'D9', to: 'a15', color: 'orange' },
        { from: 'b9', to: 'e20', color: 'black' },
      ],
    },
    rgb: {
      title: 'Mix colours', breadboard: 'half',
      parts: [
        { id: 'LED1', part: 'rgb-led', holes: ['d15', 'd16', 'd17', 'd18'] },
        { id: 'RES1', part: 'resistor', ohms: 220, holes: ['b11', 'b15'] },
        { id: 'RES2', part: 'resistor', ohms: 220, holes: ['b17', 'b21'] },
        { id: 'RES3', part: 'resistor', ohms: 220, holes: ['c18', 'c22'] },
      ],
      wires: [
        { from: 'D9', to: 'a11', color: 'orange' },
        { from: 'D10', to: 'a21', color: 'green' },
        { from: 'IOH.7', to: 'a22', color: 'blue' },
        { from: 'IOH.4', to: 'a16', color: 'black' },
      ],
    },
    light: {
      title: 'Sense light', breadboard: 'half',
      parts: [
        { id: 'RES1', part: 'resistor', ohms: 220, holes: ['b8', 'b12'] },
        { id: 'LED1', part: 'led', color: 'yellow', holes: ['c12', 'c13'] },
        { id: 'LDR1', part: 'ldr', holes: ['c20', 'c21'] },
        { id: 'RES2', part: 'resistor', ohms: 10000, holes: ['b17', 'b21'] },
      ],
      props: [{ id: 'LAMP', prop: 'desk-lamp', at: [140, 82], aim: 'LDR1' }],
      wires: [
        { from: 'D9', to: 'a8', color: 'orange' },
        { from: 'IOH.4', to: 'a13', color: 'black' },
        { from: 'POWER.5', to: 'a20', color: 'red' },
        { from: 'A0', to: 'a21', color: 'green' },
        { from: 'POWER.6', to: 'a17', color: 'black' },
      ],
    },
    distance: {
      title: 'Read a sensor', breadboard: 'half',
      parts: [
        { id: 'US1', part: 'hc-sr04', holes: ['a10', 'a11', 'a12', 'a13'] },
      ],
      props: [{ id: 'OBST', prop: 'obstacle', at: [114, -34], aim: 'US1' }],
      wires: [
        { from: 'POWER.5', to: 'e10', color: 'red' },
        { from: 'D9', to: 'e11', color: 'yellow' },
        { from: 'D10', to: 'e12', color: 'green' },
        { from: 'POWER.6', to: 'e13', color: 'black' },
      ],
    },
    sound: {
      title: 'Make a sound', breadboard: 'half',
      parts: [
        { id: 'BUZ1', part: 'piezo-buzzer', holes: ['e11', 'e14'] },
      ],
      wires: [
        { from: 'D8', to: 'a11', color: 'orange' },
        { from: 'IOH.4', to: 'a14', color: 'black' },
      ],
    },
    piano: {
      title: 'Mini piano', breadboard: 'half',
      parts: [
        // key k sits on columns c..c+2 across the trench; D(k+1) reaches column c+2, column c goes to the GND rail
        ...Array.from({ length: 8 }, (_, i) => {
          const c = 28 - 3 * i;
          return { id: 'KEY' + (i + 1), part: 'push-button', holes: ['e' + c, 'f' + c, 'e' + (c + 2), 'f' + (c + 2)] };
        }),
        { id: 'BUZ1', part: 'piezo-buzzer', holes: ['d2', 'd5'] },
      ],
      wires: [
        ...['red', 'orange', 'yellow', 'green', 'white', 'blue', 'purple', 'grey'].flatMap((color, i) => {
          const c = 28 - 3 * i;
          return [{ from: 'D' + (i + 2), to: 'a' + (c + 2), color }, { from: 'a' + c, to: 'T-' + c, color: 'black' }];
        }),
        { from: 'D10', to: 'a2', color: 'brown' },
        { from: 'a5', to: 'T-5', color: 'black' },
        { from: 'IOH.4', to: 'T-1', color: 'black' },
      ],
    },
    motor: {
      title: 'Control a motor', breadboard: 'half',
      parts: [
        { id: 'RES1', part: 'resistor', ohms: 1000, holes: ['b9', 'b13'] },
        { id: 'Q1', part: 'tip120', holes: ['c13', 'c14', 'c15'] },
        { id: 'DIO1', part: 'diode-1n4007', holes: ['d14', 'd20'] },
        { id: 'MOT1', part: 'dc-motor', at: [200, 14], holes: ['a20', 'a14'] },
      ],
      wires: [
        { from: 'D6', to: 'a9', color: 'orange' },
        { from: 'IOH.4', to: 'a15', color: 'black' },
        { from: 'POWER.5', to: 'e20', color: 'red' },
      ],
    },
    heat: {
      title: 'Sense heat', breadboard: 'half',
      parts: [
        { id: 'RES1', part: 'resistor', ohms: 1000, holes: ['b9', 'b13'] },
        { id: 'Q1', part: 'tip120', holes: ['c13', 'c14', 'c15'] },
        { id: 'TMP1', part: 'tmp36', holes: ['c19', 'c20', 'c21'] },
        { id: 'DIO1', part: 'diode-1n4007', holes: ['d14', 'd19'] },
        { id: 'FAN1', part: 'fan', at: [192, 14], holes: ['e19', 'e14'] },
      ],
      props: [{ id: 'DRYER', prop: 'hairdryer', at: [138, 86], aim: 'TMP1' }],
      wires: [
        { from: 'D6', to: 'a9', color: 'orange' },
        { from: 'IOH.4', to: 'a15', color: 'black' },
        { from: 'POWER.5', to: 'a19', color: 'red' },
        { from: 'A0', to: 'a20', color: 'green' },
        { from: 'POWER.6', to: 'a21', color: 'black' },
      ],
    },
    servo: {
      title: 'Sweep a servo', breadboard: 'half',
      parts: [
        { id: 'SRV1', part: 'servo-sg90', at: [188, 26], holes: ['e10', 'e11', 'e12'] },
      ],
      wires: [
        { from: 'POWER.7', to: 'a10', color: 'brown' },
        { from: 'POWER.5', to: 'a11', color: 'red' },
        { from: 'D9', to: 'a12', color: 'orange' },
      ],
    },
    stepper: {
      title: 'Spin the wheel', breadboard: 'half',
      parts: [
        { id: 'BTN1', part: 'push-button', holes: ['e8', 'f8', 'e10', 'f10'] },
        { id: 'RES1', part: 'resistor', ohms: 10000, holes: ['b10', 'b14'] },
        { id: 'STP1', part: 'stepper-28byj48', at: [145, 14], wheel: 'wheel', plug: [126, 14] },
      ],
      wires: [
        { from: 'POWER.5', to: 'a8', color: 'red' },
        { from: 'D2', to: 'a10', color: 'blue' },
        { from: 'IOH.4', to: 'a14', color: 'black' },
      ],
    },
    plant: {
      title: 'Smart plant', breadboard: 'half',
      parts: [
        { id: 'OLED1', part: 'ssd1306', holes: ['g4', 'g5', 'g6', 'g7'] },
        { id: 'SOIL1', part: 'soil-moisture', at: [184, 18], holes: ['a20', 'a21', 'a22'] },
      ],
      props: [{ id: 'CAN', prop: 'watering-can', at: [210, -6], aim: 'SOIL1' }],
      wires: [
        { from: 'IOH.4', to: 'j4', color: 'black' },
        { from: 'POWER.4', to: 'j5', color: 'orange' },
        { from: 'SCL', to: 'j6', color: 'blue' },
        { from: 'SDA', to: 'j7', color: 'purple' },
        { from: 'A0', to: 'e20', color: 'yellow' },
        { from: 'POWER.5', to: 'e21', color: 'red' },
        { from: 'POWER.6', to: 'e22', color: 'black' },
      ],
    },
    force: {
      title: 'Feel the force', breadboard: 'half',
      parts: [
        { id: 'FSR1', part: 'fsr402', holes: ['a13', 'a14'] },
        { id: 'RES1', part: 'resistor', ohms: 10000, holes: ['c10', 'c14'] },
        { id: 'BUZ1', part: 'piezo-buzzer', holes: ['e1', 'e4'] },
        { id: 'SRV1', part: 'servo-sg90', at: [188, 30], holes: ['h20', 'h21', 'h22'] },
      ],
      props: [{ id: 'METER', prop: 'strength-meter', at: [182, 40], aim: 'SRV1' }, { id: 'WEIGHTS', prop: 'weights', at: [124, 80], aim: 'FSR1' }],
      wires: [
        { from: 'POWER.5', to: 'd13', color: 'red' },
        { from: 'A0', to: 'd14', color: 'green' },
        { from: 'POWER.6', to: 'd10', color: 'black' },
        { from: 'D8', to: 'a1', color: 'purple' },
        { from: 'IOH.4', to: 'a4', color: 'black' },
        { from: 'e10', to: 'j20', color: 'brown' },
        { from: 'e13', to: 'j21', color: 'red' },
        { from: 'D9', to: 'j22', color: 'orange' },
      ],
    },
    parking: {
      title: 'Parking sensor', breadboard: 'half',
      parts: [
        { id: 'US1', part: 'hc-sr04', holes: ['a8', 'a9', 'a10', 'a11'] },
        { id: 'TL1', part: 'traffic-light', holes: ['b20', 'b21', 'b22', 'b23'] },
      ],
      props: [{ id: 'OBST', prop: 'obstacle', at: [109, -34], aim: 'US1' }],
      wires: [
        { from: 'POWER.5', to: 'e8', color: 'red' },
        { from: 'D9', to: 'e9', color: 'blue' },
        { from: 'D10', to: 'e10', color: 'purple' },
        { from: 'POWER.6', to: 'e11', color: 'black' },
        { from: 'd11', to: 'd20', color: 'black' },
        { from: 'D4', to: 'e21', color: 'orange' },
        { from: 'D3', to: 'e22', color: 'yellow' },
        { from: 'D2', to: 'e23', color: 'green' },
      ],
    },
  },
});
})();
