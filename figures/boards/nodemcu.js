// @cf title NodeMCU ESP8266
// @cf use engine/bench.list
// @cf use parts/ldr.js
// @cf use parts/potentiometer.js
/* NodeMCU DevKit v1.0 "Amica" (ESP-12E module, CP2102 USB-UART, 1117-3.3 regulator), 25.40 x 48.26 mm.
   Every position is the footprint centre from the NodeMCU team's own Altium file (NODEMCU_DEVKIT_V1.0_OFFSET.PcbDoc,
   origin bottom-left, y up), as extracted in docs/facts/nodemcu.md. Two estimates, both flagged there: the ESP-12E
   body outline (from its pad rows and the 16 x 24 mm module size) and the module's blue LED (from photos).
   How it works: USB VBUS goes through the SS14 Schottky D1 to Vin (about 4.7 V), and the 1117 (U4) makes 3.3 V for
   the ESP-12E and the CP2102. D1 also stops a supply on the Vin pin from back-feeding the computer; nothing protects
   Vin against a reversed supply. The ESP8266 reads three strapping pins at reset: GPIO15 (D8) must be low (R5
   pull-down), GPIO0 (D3) and GPIO2 (D4) high (R1, R2 pull-ups); FLASH pulls GPIO0 low, so holding it while RST is
   released starts the ROM's UART download mode. The two S8050 transistors let esptool do that by itself over DTR
   and RTS. A0 reaches the 0-1 V ADC through a 220 k / 100 k divider, so the pin takes 0-3.2 V. Both blue LEDs are
   active low: GPIO2 on the module and GPIO16 (D0) on the board. */
(() => {
const B = SL.bench;
const half = (t, s) => Math.floor(t / s) % 2;   // 0 in the first half of each 2*s period
// FLASH held while RST is released: the ROM's UART download mode. The sketch never starts (both LEDs off) and the
// ROM prints its boot line and waits for esptool
const download = st => st.boot === 'download';
const ROM_DL = ['ets Jan  8 2013,rst cause:2, boot mode:(1,6)', 'waiting for host'];
const rom = md => Object.assign({}, md, {
  out: (st, t) => download(st) ? { D4: 1, D0: 1 } : md.out(st, t),
  serial: (k, st) => download(st) ? (ROM_DL[k] ?? null) : md.serial ? md.serial(k, st) : null,
  banner: st => download(st) ? null : md.banner || null,
});
// the knob on A0: analogRead 0..1023 over the board's 0-3.3 V range (its divider feeds the ESP8266's 1 V ADC)
const knob = st => Math.round(Math.max(0, Math.min(1, ((st.volts || {}).A0 || 0) / 3.3)) * 1023);
// the web server lesson: a phone on the network opens /on, then /off, every 3 s once the board has joined
const phoneOn = t => t >= 5 && Math.floor((t - 5) / 3) % 2 === 0;
const BLUE = '#3f86e8';
const R0402 = { kind: 'chip', size: [1, .5], h: .35 };
const C0402 = { kind: 'chip', size: [1, .5], h: .35, cap: true };
const J1_NETS = ['A0', 'ADC', '', 'SD3', 'SD2', 'SD1', 'CMD', 'SD0', 'CLK', 'GND', '3V3', 'EN', 'RST', 'GND', 'VIN'];
const J1_SILK = ['A0', 'RSV', 'RSV', 'SD3', 'SD2', 'SD1', 'CMD', 'SD0', 'CLK', 'GND', '3V3', 'EN', 'RST', 'GND', 'Vin'];
const J2_NETS = ['D0', 'D1', 'D2', 'D3', 'D4', '3V3', 'GND', 'D5', 'D6', 'D7', 'D8', 'RX', 'TX', 'GND', '3V3'];
const pinY = i => 41.91 - i * 2.54;

B.board({
  id: 'nodemcu', fig: '06', name: 'NodeMCU ESP8266 (DevKit v1.0)',
  sub: 'ESP-12E module: ESP8266EX at 80 MHz, 4 MB flash, 2.4 GHz Wi-Fi, 3.3 V logic',
  pcb: { w: 25.4, h: 48.26, thick: 1.6, r: 2.286, color: '#26282c', silk: '#f1efe6', standoff: 11.4 },
  mat: { front: 12, back: 6, left: 6, right: 6 },
  height: 12, pal: 'blush', logic: 3.3,
  holes: [[2.29, 2.29, 2.92], [23.11, 2.29, 2.92], [2.29, 45.97, 2.92], [23.11, 45.97, 2.92]],
  silk: [
    ...J1_SILK.map((t, i) => [2.75, pinY(i), t, .85, 90]),
    ...J2_NETS.map((t, i) => [22.65, pinY(i), t, .85, 90]),
    [6.48, 6.1, 'RST', 1], [18.92, 6.1, 'FLASH', 1],
    [12.7, 32.4, 'NODEMCU', 1.6], [12.7, 30.1, 'DEVKIT', 1.4], [12.7, 27.9, '14/02/2015', 1],
  ],
  traces: [
    [[11.2, 4.4], [9.42, 8.4], [5.6, 11.2]],
    [[4.9, 8.4], [3.1, 7.0], [2.1, 6.35]],
    [[5.6, 8.6], [8.46, 16.6], [10.6, 18.0]],
    [[17.6, 19.9], [17.6, 22.6], [8.46, 22.6], [4.9, 25.3]],
    [[5.36, 18.0], [3.0, 16.51], [2.1, 16.51]],
    [[20.7, 29.3], [21.74, 30.21], [23.3, 31.75]],
    [[13.89, 12.4], [16.01, 14.0], [16.01, 15.2]],
    [[8.61, 12.6], [11.04, 14.1]],
  ],
  parts: [
    { id: 'U1', kind: 'module', name: 'ESP-12E Wi-Fi module', short: 'ESP-12E',
      at: [12.7, 36], size: [24, 16], h: 3.2, rot: 90, ant: 6.5, label: 'ESP8266MOD|AI-THINKER',
      nets: { 1: 'RST', 2: 'ADC', 3: 'EN', 4: 'D0', 5: 'D5', 6: 'D6', 7: 'D7', 8: '3V3', 9: 'CMD', 10: 'SD0', 11: 'SD2',
        12: 'SD3', 13: 'SD1', 14: 'CLK', 15: 'GND', 16: 'D8', 17: 'D4', 18: 'D3', 19: 'D2', 20: 'D1', 21: 'RX', 22: 'TX' } },
    { id: 'LED_MOD', kind: 'led', name: 'Blue LED on the module (D4)', short: 'LED D4',
      at: [6.3, 42.4], z: .8, size: [1.6, .8], fixed: true, led: { color: BLUE, net: 'D4', invert: true, via: ['U1'] } },
    { id: 'U2', kind: 'qfn', name: 'CP2102 USB-to-UART bridge', short: 'CP2102', at: [13.89, 9.68], rot: 270, size: [5, 5], h: 1, n: 7,
      label: 'SILABS|CP2102' },
    { id: 'U3', kind: 'usb-micro', name: 'Micro-USB socket', short: 'USB', at: [12.7, 1.9], rot: 90, size: [5, 7.5], h: 3 },
    { id: 'U4', kind: 'sot223', name: 'AMS1117-3.3 regulator', short: '3V3 REG', at: [14, 19.91], rot: 270, h: 1.8,
      label: 'AMS1117|3.3', nets: { 1: 'GND', 2: '3V3', 3: 'VIN' } },
    { id: 'D1', kind: 'sod', name: 'SS14 Schottky diode D1', short: 'SS14', at: [4.9, 9.78], rot: 90, size: [2.7, 1.3], h: 1.15,
      polar: { fault: 'dark', opts: ['band toward the USB edge, as printed', 'band toward the module (backwards)'] } },
    { id: 'C2', kind: 'tant', name: 'Tantalum capacitor C2 (100 µF)', short: '100 µF', at: [5.36, 19.91], rot: 90, size: [3.5, 2.8], h: 2.1,
      polar: { fault: 'hot', opts: ['+ band to the top, as printed', '+ band to the bottom (backwards)'] } },
    { id: 'C7', kind: 'chip', name: '10 µF capacitor on Vin (regulator input)', at: [8.46, 18.34], rot: 90, size: [2, 1.25], h: 1.25, cap: true },
    { id: 'C8', ...C0402, name: '10 µF capacitor on 3.3 V (regulator output)', at: [8.46, 22.21] },
    { id: 'C1', ...C0402, name: '100 nF capacitor: reset filter', at: [3.66, 41.68], rot: 90 },
    { id: 'C3', ...C0402, name: '10 µF capacitor: CP2102 supply', at: [14.36, 14.62], rot: 90 },
    { id: 'C4', ...C0402, name: '100 nF capacitor: CP2102 supply', at: [12.7, 14.62], rot: 90 },
    { id: 'C5', ...C0402, name: '10 µF capacitor: USB VBUS', at: [9.42, 9.3], rot: 270 },
    { id: 'C6', ...C0402, name: '100 nF capacitor: USB VBUS', at: [7.78, 9.3], rot: 270 },
    { id: 'R1', ...R0402, name: 'GPIO0 pull-up R1 (12 kΩ)', at: [21.74, 33.1], rot: 270 },
    { id: 'R2', ...R0402, name: 'GPIO2 pull-up R2 (12 kΩ)', at: [21.74, 30.21], rot: 90 },
    { id: 'R5', ...R0402, name: 'GPIO15 pull-down R5 (12 kΩ)', short: 'R5', at: [21.74, 27.33], rot: 90 },
    { id: 'R13', ...R0402, name: '220 kΩ A0 divider, top', at: [3.66, 38.79], rot: 90 },
    { id: 'R14', ...R0402, name: '100 kΩ A0 divider, bottom', at: [3.66, 35.92], rot: 90 },
    { id: 'R3', ...R0402, name: 'EN pull-up R3 (12 kΩ)', short: 'R3', at: [4.42, 14.61], rot: 270 },
    { id: 'R4', ...R0402, name: '12 kΩ pull-up on RST', at: [6.08, 14.61], rot: 270 },
    { id: 'R11', ...R0402, name: '470 Ω in series with the RST button', at: [7.73, 14.61], rot: 270 },
    { id: 'R10', kind: 'pads', name: 'R10 pads, not fitted (D0 to RST link)', at: [9.39, 14.61], rot: 270,
      pitch: 1, d: .5, fixed: true, pins: ['D0', 'RST'] },
    { id: 'R9', ...R0402, name: '470 Ω in series with LED1', at: [11.04, 14.61], rot: 90 },
    { id: 'R6', ...R0402, name: '470 Ω from CP2102 TXD to the ESP RX pin', at: [16.01, 14.61], rot: 90 },
    { id: 'R8', ...R0402, name: '12 kΩ base resistor for VT2 (RTS)', at: [17.67, 14.61], rot: 270 },
    { id: 'R12', ...R0402, name: '470 Ω in series with the FLASH button', at: [19.32, 14.61], rot: 90 },
    { id: 'R7', ...R0402, name: '12 kΩ base resistor for VT1 (DTR)', at: [20.98, 14.61], rot: 90 },
    { id: 'VT1', kind: 'sot23', name: 'S8050 transistor: auto-reset (pulls RST low)', short: 'AUTO-RESET', at: [20.03, 10.9], rot: 180, label: 'J3Y' },
    { id: 'VT2', kind: 'sot23', name: 'S8050 transistor: auto-program (pulls GPIO0 low)', at: [20.03, 18.24], label: 'J3Y' },
    { id: 'LED1', kind: 'led', name: 'Blue LED on the board (D0)', short: 'LED D0', at: [8.61, 12.01], rot: 180, size: [1.6, .8],
      led: { color: BLUE, net: 'D0', invert: true, via: ['R9'] } },
    { id: 'S1', kind: 'button-smd', name: 'RST button', short: 'RST', at: [6.48, 3.05], rot: 270, size: [4.2, 3.2], h: 2,
      control: { type: 'button', action: 'reset', net: 'RST', active: 0 } },
    { id: 'S2', kind: 'button-smd', name: 'FLASH button (GPIO0, D3)', short: 'FLASH', at: [18.92, 3.05], rot: 270, size: [4.2, 3.2], h: 2,
      control: { type: 'button', action: 'boot', net: 'D3', active: 0 } },
    { id: 'J1', kind: 'male', name: 'Left header: A0, flash pins, EN, RST, 3V3, Vin', short: 'LEFT HEADER', side: 'bottom',
      at: [1.27, 24.13], rot: 270, h: 11, pins: J1_NETS, labels: J1_SILK },
    { id: 'J2', kind: 'male', name: 'Right header: D0-D8, RX, TX, 3V3', short: 'RIGHT HEADER', side: 'bottom',
      at: [24.13, 24.13], rot: 270, h: 11, pins: J2_NETS },
  ],
  power: {
    sources: {
      usb: { label: 'USB cable', part: 'U3', plug: 'usb-micro', v: 5, ilim: .5 },
      vin: { label: 'Vin pin', pin: 'VIN', v: 5, range: [5, 9], max: 15 },
      pin3v3: { label: '3V3 pin', pin: '3V3', v: 3.3, range: [3, 3.6], max: 3.6 },
    },
    default: 'usb',
    rails: {
      VIN: { from: [{ src: 'usb', via: ['U3', 'D1'], drop: .35 }, { src: 'vin' }] },
      '3V3': { from: [{ rail: 'VIN', via: ['U4'], reg: 3.3, dropout: 1.1, max: 15 }, { src: 'pin3v3' }], max: 3.6 },
    },
    mcu: { part: 'U1', rail: '3V3', min: 2.5, needs: ['U1', 'R3', 'R5'] },
    upload: { source: 'usb', needs: ['U2', 'VT1', 'VT2', 'R6', 'U1'], tool: 'esptool' },
  },
  mode: 'blink',
  // blink drives the lesson's LED on D1 with the blue LED (on together: D4 is active low); dimmer and web are the
  // dimmer and web server lessons' sketches, picked by their circuits (circuit.mode)
  modes: Object.fromEntries(Object.entries({
    blink: { title: 'Blink', bytes: 265584, out: (st, t) => ({ D4: half(t, 1), D0: 1, D1: 1 - half(t, 1) }) },
    both: { title: 'Both LEDs', out: (st, t) => ({ D4: half(t, .5), D0: 1 - half(t, .5) }) },
    hello: { title: 'Serial hello', banner: 'NodeMCU ready', out: () => ({ D4: 1, D0: 1 }), serial: k => 'hello from the ESP8266 #' + k },
    wifi: { title: 'Wi-Fi server', banner: 'Connecting to simlab', out: (st, t) => ({ D4: t < 2 ? half(t, .25) : 0, D0: 1 }),
      serial: k => k === 2 ? 'IP address: 192.168.1.42' : null },
    dimmer: { title: 'Knob dimmer', bytes: 266112, out: st => ({ D5: knob(st) / 1023, D4: 1, D0: 1 }),
      serial: (k, st) => { const raw = knob(st); return 'knob=' + raw + ' duty=' + Math.round(raw * 255 / 1023); } },
    web: { title: 'Web LED switch', bytes: 301936, banner: 'Connecting....',
      out: (st, t) => { const on = phoneOn(t); return { D1: on ? 1 : 0, D4: on ? 0 : 1, D0: 1 }; },
      serial: k => k === 3 ? 'IP address: 192.168.1.42' : k === 4 ? 'HTTP server started' : null },
  }).map(([k, md]) => [k, rom(md)])),
  faults: ['short:3V3:GND', 'short:VIN:GND', 'missing:R3', 'missing:R5', 'cold:U3', 'cold:J2.2'],
  xr: {
    flow: [
      ['VIN', [[12.7, 4.4], [11.2, 4.4], [9.42, 8.4], [5.6, 11.2]]],
      ['VIN', [[4.9, 8.4], [3.1, 7.0], [1.27, 6.35]]],
      ['VIN', [[5.6, 8.6], [8.46, 16.6], [10.6, 18.0], [12.2, 19.9]]],
      ['3V3', [[15.8, 19.9], [17.6, 19.9], [17.6, 22.6], [8.46, 22.6], [4.9, 25.3]]],
      ['3V3', [[5.36, 18.0], [3.0, 16.51], [1.27, 16.51]]],
      ['D4', [[20.7, 29.3], [21.74, 30.21], [24.13, 31.75]]],
      ['D0', [[4.7, 33.3], [3.4, 31.5], [3.4, 17.0], [7.0, 13.2], [8.61, 12.01]]],
    ],
    notes: [['U1', 'ESP8266EX'], ['U2', 'USB-UART'], ['U4', '3V3 LDO'], ['VT1', 'AUTO-RESET']],
  },
  tags: [['U1', 44, -24], ['U2', -46, 12], ['U3', -40, 26], ['U4', 40, 20], ['S1', -38, -14], ['S2', 34, 30], ['LED1', -40, -20],
    ['LED_MOD', 30, -34], ['D1', -42, 2]],
  circuit: 'blink',
  circuits: {
    blink: {
      title: 'An LED on D1 and the blue LED on D4', breadboard: 'half', mode: 'blink',
      parts: [
        { id: 'R101', part: 'resistor', ohms: 220, holes: ['b10', 'b14'] },
        { id: 'LED101', part: 'led', color: 'red', holes: ['c14', 'c15'] },
      ],
      wires: [
        { from: 'D1', to: 'a10', color: 'orange' },
        { from: 'GND', to: 'a15', color: 'black' },
      ],
    },
    button: {
      title: 'FLASH button and a light sensor on A0', breadboard: 'half',
      parts: [
        { id: 'LDR101', part: 'ldr', holes: ['c5', 'c9'] },
        { id: 'R101', part: 'resistor', ohms: 10000, holes: ['d9', 'd13'] },
      ],
      wires: [
        { from: '3V3', to: 'a5', color: 'red' },
        { from: 'A0', to: 'a9', color: 'yellow' },
        { from: 'GND', to: 'a13', color: 'black' },
      ],
    },
    dimmer: {
      title: 'A knob on A0 dims an LED on D5', breadboard: 'half', mode: 'dimmer',
      parts: [
        { id: 'R101', part: 'resistor', ohms: 220, holes: ['b5', 'b9'] },
        { id: 'LED101', part: 'led', color: 'green', holes: ['c9', 'c10'] },
        { id: 'POT101', part: 'potentiometer', ohms: 10000, holes: ['e20', 'e21', 'e22'] },
      ],
      wires: [
        { from: 'D5', to: 'a5', color: 'green' },
        { from: 'GND', to: 'a10', color: 'black' },
        { from: '3V3', to: 'a20', color: 'red' },
        { from: 'A0', to: 'a21', color: 'yellow' },
        { from: 'GND', to: 'a22', color: 'black' },
      ],
    },
    webserver: {
      title: 'Wi-Fi web server switching an LED on D1', breadboard: 'half', mode: 'web',
      parts: [
        { id: 'R101', part: 'resistor', ohms: 220, holes: ['b10', 'b14'] },
        { id: 'LED101', part: 'led', color: 'yellow', holes: ['c14', 'c15'] },
      ],
      wires: [
        { from: 'D1', to: 'a10', color: 'orange' },
        { from: 'GND', to: 'a15', color: 'black' },
      ],
    },
  },
});
})();
