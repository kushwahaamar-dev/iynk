// @cf title Arduino Nano
// @cf use engine/bench.list
// @cf use parts/push-button.js
// @cf use parts/potentiometer.js
/* Arduino Nano (classic), SKU A000005, board revision 3.3, as produced today. Every position is the part's centre
   from Arduino's own Eagle file NanoV3.3.brd (origin bottom-left, y up, 43.18 x 17.78 mm, square corners), as listed
   in docs/facts/nano.md section 2. Production parts follow the official photos: an FT232RNL USB-UART and an ST
   LD1117S50 regulator (15 V absolute maximum on VIN), the silk reads "ON" and "3.3V" and carries no branding on top.
   How it works: USB Mini-B (J3) VBUS goes through the 500 mA polyfuse F1 to VUSB and through the SS1P3L Schottky D1
   to +5V (about 4.65 V). VIN (7-12 V) feeds the LDO IC2, whose 5.0 V output is higher than VUSB minus the diode drop,
   so D1 turns off and the board runs from VIN: there is no switch and no reverse-polarity diode on VIN. The 5V pin
   ties straight to +5V. The 3V3 pin is the FT232's internal 3.3 V regulator (50 mA). The ATmega328P-MU (IC3, VQFN-32
   turned 45 degrees) runs from the 16 MHz ceramic resonator Y1; its brown-out detector trips at 2.7 V (fuse 0xFD).
   The FT232's DTR pulse reaches RESET through C4, which starts Optiboot for an upload; L flashes, then the sketch
   runs. The two 1x15 headers are fitted with their plastic underneath and the pins pointing down, so the board
   straddles a breadboard; on the mat it stands on its pins. The ICSP pads (J4) are left bare. */
(() => {
const B = SL.bench;
const blink = (t, on, off) => (t % (on + off)) < on ? 1 : 0;
const hx = k => 39.37 - 2.54 * (k - 1);         // header pin k (1..15) of J1 and J2, from the right-hand end

// The library's `male` draws a header standing on the component side. The Nano's headers hang under the board
// (plastic below, pins pointing down) and only short pin stubs with solder fillets show on top. side:'bottom' makes
// ctx.W measure z downward from the underside, so the stubs on top sit at negative z. `h` is the wire-end height:
// the engine plugs a wire 2 mm below a header's h, so h 3.2 puts it on the 1.2 mm stub.
B.kind('nano-header', {
  group: 'low', size: p => [p.pins.length * (p.pitch || 2.54), 2.54], h: 3.2, pins: p => B.rowPins(p),
  draw(ctx){
    const p = ctx.p, [l, w] = p.size, th = B.md.pcb.thick, pl = 2.5, len = 6, stub = 1.2, q = .32;
    const sold = !!(ctx.st.placed[p.id] && ctx.st.placed[p.id].sold);
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, pl), ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, pl, B.M.blackPl, toneI, .6));
    B.rowPins(p).forEach(([bx, by], i) => {
      if (p.pins[i] === null) return;
      const [a, b] = B.localOf(p, bx, by);
      ctx.put(ctx.B(a - q, b - q, pl, a + q, b + q, pl + len), ctx.slab(a - q, b - q, a + q, b + q, pl, pl + len, B.M.tin, toneI, .35));
      const top = -th - stub, fillet = sold ? ctx.disc(a, b, -th - .05, .72, B.M.tin.l, .35) : '';
      ctx.put(ctx.B(a - .8, b - .8, top, a + .8, b + .8, -th), fillet + ctx.slab(a - q, b - q, a + q, b + q, top, -th, B.M.tin, toneI, .35));
    });
  },
});

const J1 = ['D1', 'D0', 'RESET', 'GND', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12'];
const J1L = ['TX1', 'RX0', 'RST', 'GND', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12'];
const J2 = ['VIN', 'GND', 'RESET', '5V', 'A7', 'A6', 'A5', 'A4', 'A3', 'A2', 'A1', 'A0', 'AREF', '3V3', 'D13'];
const J2L = ['VIN', 'GND', 'RST', '5V', 'A7', 'A6', 'A5', 'A4', 'A3', 'A2', 'A1', 'A0', 'REF', '3.3V', 'D13'];

const VUSB_RUN = [[7.06, 10.49], [7.9, 11.6], [7.9, 13.9], [19.2, 13.9], [19.6, 14.4], [27.0, 14.4], [28.58, 13.97]];
const V5_RUN = [[28.58, 11.62], [27.4, 10.6], [20.6, 10.6], [18.2, 9.9]];
const LDO_RUN = [[30.05, 6.48], [26.6, 6.48], [26.6, 10.6]];
const VIN_RUN = [[39.37, 1.27], [37.4, 2.6], [36.25, 4.17]];
const D13_RUN = [[3.81, 1.27], [5.4, 3.6], [12.7, 6.2]];
const L_RUN = [[18.4, 11.4], [22.6, 11.6], [26.9, 5.4], [28.0, 4.32]];

B.board({
  id: 'nano', fig: '02', name: 'Arduino Nano', sub: 'ATmega328P at 16 MHz, 5 V logic, USB Mini-B through an FT232RNL',
  pcb: { w: 43.18, h: 17.78, thick: 1.6, r: 0, color: '#16818a', silk: '#f4f6ef', standoff: 8.5, standoffs: false },
  mat: { front: 9, back: 9, left: 24, right: 9 },
  height: 8, pal: 'cobalt', logic: 5,
  holes: [[1.27, 1.27, 1.651], [41.91, 1.27, 1.651], [1.27, 16.51, 1.651], [41.91, 16.51, 1.651]],
  bootloader: { led: 'L', flashes: 3, hz: 8, wait: 1 },
  silk: [
    ...J1L.map((t, i) => [hx(i + 1), 14.93, t, .81]),
    ...J2L.map((t, i) => [hx(i + 1), 2.85, t, .81]),
    ...[5.41, 7.93, 10.49, 18.11, 20.68, 25.73].map(sx => [sx, 15.29, '*', .51]),
    [40.54, 13.4, 'ICSP', .81], [41.9, 4.3, '1', 1.4, 270],
    [31.6, 13.46, 'TX', .81, 270], [31.6, 10.41, 'RX', .81, 270], [31.6, 7.37, 'ON', .81, 270], [31.6, 4.32, 'L', .81, 270],
    [22.6, 8.89, 'RESET', .81, 270],
  ],
  traces: [VUSB_RUN, V5_RUN, LDO_RUN, VIN_RUN, D13_RUN, L_RUN],
  parts: [
    // top side
    { id: 'IC3', kind: 'qfn', name: 'ATmega328P microcontroller (VQFN-32)', short: 'MCU', at: [15.49, 8.84], rot: 225, size: [5, 5], n: 8, h: .9,
      label: 'ATMEL|M328P|U-TH', nets: { 17: 'D13', 30: 'D0', 31: 'D1', 29: 'RESET', 4: '5V', 18: '5V', 20: 'AREF' } },
    { id: 'Y1', kind: 'resonator', name: '16 MHz ceramic resonator', short: 'RESONATOR', at: [20.85, 13.21], rot: 315, size: [3.2, 1.3], h: 1, color: '#c9cdcf' },
    { id: 'SW1', kind: 'button-smd', name: 'RESET button', short: 'RESET', at: [24.51, 8.89], rot: 270, size: [3, 2.5], h: 1.6,
      control: { type: 'button', action: 'reset' } },
    { id: 'TX', kind: 'led', name: 'TX LED (the Nano sends)', short: 'TX', at: [28.96, 13.46], led: { color: '#4cc65a', serial: 'tx', via: ['IC1', 'RP2'] } },
    { id: 'RX', kind: 'led', name: 'RX LED (the computer sends)', short: 'RX', at: [28.96, 10.41], led: { color: '#e8392e', serial: 'rx', via: ['IC1', 'RP2'] } },
    { id: 'PWR', kind: 'led', name: 'ON LED (5 V present)', short: 'ON', at: [28.96, 7.37], led: { color: '#4cc65a', rail: '5V', via: ['RP1'] } },
    { id: 'L', kind: 'led', name: 'L LED (pin 13)', short: 'L LED', at: [28.96, 4.32], led: { color: '#f2b12e', net: 'D13', via: ['RP2'] } },
    { id: 'J3', kind: 'usb-mini', name: 'USB Mini-B socket', short: 'MINI-USB', at: [2.5, 8.89], size: [9.2, 7.7], h: 3.9, plug: true },
    { id: 'J4', kind: 'pads', name: 'ICSP pads (no header fitted)', short: 'ICSP', at: [40.54, 8.89], rot: 270, rows: 2, mirror: true, d: 1.55, fixed: true,
      pins: ['D12', '5V', 'D13', 'D11', 'RESET', 'GND'], labels: ['MISO', '5V', 'SCK', 'MOSI', 'RESET', 'GND'] },
    // the two 1x15 headers: plastic underneath, pins down
    { id: 'J1', kind: 'nano-header', name: 'Header J1: TX1, RX0, RST, GND, D2-D12', short: 'J1', at: [21.59, 16.51], mirror: true, side: 'bottom', pins: J1, labels: J1L },
    { id: 'J2', kind: 'nano-header', name: 'Header J2: D13, 3.3V, REF, A0-A7, 5V, RST, GND, VIN', short: 'J2', at: [21.59, 1.27], mirror: true, side: 'bottom', pins: J2, labels: J2L },
    // bottom side (drawn under the board, in the same top-view frame)
    { id: 'IC1', kind: 'soic', name: 'FT232RNL USB-to-serial bridge', short: 'USB-SERIAL', at: [10.38, 8.86], size: [10.2, 5.3], n: 14, pitch: .65, h: 2, side: 'bottom',
      label: 'FTDI|FT232RNL', nets: { 1: 'D0', 5: 'D1', 2: 'DTR', 17: '3V3', 20: '5V' } },
    { id: 'IC2', kind: 'sot223', name: 'LD1117 5 V regulator (VIN)', short: '5V REG', at: [33.16, 6.48], rot: 90, side: 'bottom', label: 'LD1117',
      polar: { fault: 'hot', opts: ['tab towards the LEDs, as printed', 'turned round (backwards)'] } },
    { id: 'D1', kind: 'sod', name: 'SS1P3L Schottky diode: USB to 5 V', short: 'DIODE', at: [28.58, 12.35], rot: 90, size: [3, 1.9], h: 1, side: 'bottom' },
    { id: 'F1', kind: 'fuse', name: '500 mA resettable polyfuse (USB)', short: 'POLYFUSE', at: [2.08, 4.5], size: [1.6, .8], h: .8, side: 'bottom' },
    { id: 'C2', kind: 'tant', name: '4.7 µF tantalum capacitor (USB)', at: [2.54, 9.02], size: [3.2, 1.6], h: 1.6, side: 'bottom',
      polar: { fault: 'hot', opts: ['band to the right, as printed', 'band to the left (backwards)'] } },
    { id: 'C5', kind: 'tant', name: '4.7 µF tantalum capacitor (5 V)', at: [32.92, 11.15], size: [3.2, 1.6], h: 1.6, side: 'bottom',
      polar: { fault: 'hot', opts: ['band to the right, as printed', 'band to the left (backwards)'] } },
    { id: 'C1', kind: 'chip', name: '100 nF capacitor on AREF', at: [7.04, 3.02], cap: true, side: 'bottom' },
    { id: 'C3', kind: 'chip', name: '1 µF decoupling capacitor (5 V)', at: [19.86, 6.12], cap: true, side: 'bottom' },
    { id: 'C4', kind: 'chip', name: '100 nF auto-reset capacitor (DTR to RESET)', short: 'AUTO-RESET', at: [16.81, 6.05], cap: true, side: 'bottom' },
    { id: 'C6', kind: 'chip', name: '100 nF capacitor on the FT232 3.3 V output', at: [4.57, 9.02], cap: true, side: 'bottom' },
    { id: 'C7', kind: 'chip', name: '1 µF capacitor on the regulator output', at: [29.64, 9.27], cap: true, side: 'bottom' },
    { id: 'C8', kind: 'chip', name: '1 µF capacitor on 5 V', at: [28.57, 3.56], cap: true, side: 'bottom' },
    { id: 'C9', kind: 'chip', name: '100 nF capacitor on VUSB', at: [31.29, 13.84], cap: true, side: 'bottom' },
    { id: 'RP1', kind: 'chip', name: '4 x 1 kΩ array: D0 and D1 to the FT232, ON LED, RESET pull-up', at: [23.62, 5.79], size: [3.2, 1.6], h: .55, side: 'bottom' },
    { id: 'RP2', kind: 'chip', name: '4 x 1 kΩ array: L, TX and RX LEDs', at: [23.62, 12.19], size: [3.2, 1.6], h: .55, side: 'bottom' },
  ],
  power: {
    sources: {
      usb: { label: 'USB cable', part: 'J3', plug: 'usb-mini', v: 5.0, ilim: .5 },
      vin: { label: 'VIN pin', pin: 'VIN', v: 9, range: [7, 12], max: 15 },
      pin5: { label: '5V pin', pin: '5V', v: 5, range: [4.75, 5.25], max: 6 },
      pin3: { label: '3.3V pin (an output)', pin: '3V3', v: 3.3, range: [3.3, 3.3], max: 3.6 },
    },
    default: 'usb',
    // order matters: 5V is evaluated before VIN so a reversed or too-high VIN names the regulator it destroys
    rails: {
      VUSB: { from: [{ src: 'usb', via: ['J3', 'F1'] }] },
      '5V': { from: [{ src: 'vin', via: ['IC2'], reg: 5, dropout: 1.1, max: 15 }, { rail: 'VUSB', via: ['D1'], drop: .35 }, { src: 'pin5' }], max: 6 },
      VIN: { from: [{ src: 'vin' }] },
      '3V3': { from: [{ rail: '5V', via: ['IC1'], reg: 3.3, dropout: .3 }, { src: 'pin3', via: ['IC1'], max: 3.6 }], max: 3.6 },
    },
    mcu: { part: 'IC3', rail: '5V', min: 2.7, needs: ['IC3', 'Y1'] },
    upload: { source: 'usb', needs: ['IC1', 'C4', 'RP1', 'IC3'], tool: 'avrdude' },
  },
  mode: 'blink',
  modes: {
    blink: { title: 'Blink', bytes: 924, out: (st, t) => ({ D13: blink(t, 1, 1) }) },
    fast: { title: 'Blink without delay()', bytes: 1006, out: (st, t) => ({ D13: blink(t, .2, .2) }) },
    hello: { title: 'Serial hello', bytes: 1490, banner: 'Nano ready', out: () => ({}), serial: k => 'hello from the Nano #' + k },
  },
  faults: ['short:5V:GND', 'short:3V3:GND', 'cold:J3', 'cold:IC2', 'cold:J1.12', 'wrong-voltage:vin:3.5', 'wrong-voltage:pin3:5'],
  xr: {
    flow: [['VUSB', VUSB_RUN], ['5V', V5_RUN], ['5V', LDO_RUN], ['VIN', VIN_RUN], ['D13', D13_RUN], ['D13', L_RUN]],
    notes: [['IC3', 'SILICON DIE'], ['Y1', 'CERAMIC'], ['IC1', 'USB BRIDGE'], ['IC2', '5V REGULATOR'], ['F1', 'POLYFUSE'], ['D1', 'SCHOTTKY']],
  },
  tags: [['IC3', -30, 36], ['J3', -40, 14], ['SW1', 22, -34], ['L', 40, 22], ['PWR', 44, -6], ['Y1', 8, -40], ['J4', 38, -24], ['J1', -18, -42], ['J2', 10, 44]],
  circuit: 'blink',
  circuits: {
    blink: {
      title: 'Blink an LED', breadboard: 'half',
      parts: [
        { id: 'R1', part: 'resistor', ohms: 220, holes: ['g10', 'g14'] },
        { id: 'LED1', part: 'led', color: 'red', holes: ['h14', 'h15'] },
      ],
      wires: [
        { from: 'J2.15', to: 'j10', color: 'orange' },
        { from: 'J2.2', to: 'j15', color: 'black' },
      ],
    },
    'button-sensor': {
      title: 'A button and a knob', breadboard: 'half',
      parts: [
        { id: 'SW2', part: 'push-button', holes: ['e10', 'f10', 'e12', 'f12'] },
        { id: 'RV1', part: 'potentiometer', ohms: 10000, pos: .5, holes: ['h20', 'h21', 'h22'] },
      ],
      wires: [
        { from: 'J1.5', to: 'a10', color: 'blue' },
        { from: 'J1.4', to: 'a12', color: 'black' },
        { from: 'J2.2', to: 'j20', color: 'black' },
        { from: 'J2.12', to: 'j21', color: 'yellow' },
        { from: 'J2.4', to: 'j22', color: 'red' },
      ],
    },
    fade: {
      title: 'Fade an LED with a knob', breadboard: 'half',
      parts: [
        { id: 'R1', part: 'resistor', ohms: 220, holes: ['b14', 'b18'] },
        { id: 'LED1', part: 'led', color: 'red', holes: ['c18', 'c19'] },
        { id: 'RV1', part: 'potentiometer', ohms: 10000, pos: .25, holes: ['h20', 'h21', 'h22'] },
      ],
      wires: [
        { from: 'J1.12', to: 'a14', color: 'orange' },
        { from: 'J1.4', to: 'a19', color: 'black' },
        { from: 'J2.2', to: 'j20', color: 'black' },
        { from: 'J2.12', to: 'j21', color: 'yellow' },
        { from: 'J2.4', to: 'j22', color: 'red' },
      ],
    },
    i2c: {
      title: 'Talk to an MPU-6050 over I2C', breadboard: 'half',
      // GY-521 breakout, header VCC GND SCL SDA XDA XCL AD0 INT in row i (drawn once a breadboard part 'mpu6050' exists)
      parts: [{ id: 'M1', part: 'mpu6050', holes: ['i3', 'i4', 'i5', 'i6', 'i7', 'i8', 'i9', 'i10'] }],
      wires: [
        { from: 'J2.4', to: 'j3', color: 'red' },
        { from: 'J2.2', to: 'j4', color: 'black' },
        { from: 'J2.7', to: 'j5', color: 'yellow' },
        { from: 'J2.8', to: 'j6', color: 'blue' },
      ],
    },
  },
});
})();
