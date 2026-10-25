// @cf title ESP32-S3-DevKitC-1
// @cf use engine/bench.list
// @cf use parts/potentiometer.js
/* Espressif ESP32-S3-DevKitC-1 v1.1 (default) and v1.0, modelled from Espressif's own design files: every centre below is
   the pad-extent centre from PCB_ESP32-S3-DevKitC-1_V1.1_20220429.asc (origin bottom-left, y up towards the antenna,
   board 25.40 x 62.74 mm, corner radius 0.5 mm, no mounting holes). Fact sheet: docs/facts/esp32-s3-devkitc-1.md.
   How it works: two Micro-USB ports. J2 "UART" goes to the CP2102N bridge (U3) and UART0 (GPIO43/44); J4 "USB" goes
   straight to the S3's own USB on GPIO19/20. Each VBUS passes a 1N5819 Schottky (D1, D7) onto VCC_5V, so both cables
   can be in at once; the 5V header pin sits after the diodes and has no protection. The SGM2212 LDO (U2, 20 V in max,
   800 mA) makes VCC_3V3, which lights the red D5 and feeds the module and the 3V3 header pins through the 0 ohm R24.
   The CP2102N's DTR/RTS drive Q1/Q2 to pull EN and GPIO0 low, so esptool enters download mode with no button press.
   SW1 BOOT pulls GPIO0 (a strapping pin) low; SW2 RESET pulls EN low. The SK68XXMINI-HS RGB LED (WS2812 protocol)
   takes its data from GPIO38 through the 0 ohm R17 on v1.1, from GPIO48 on v1.0. */
(() => {
const B = SL.bench;

/* ---------- colour and timing helpers for the demo programs ---------- */
const hexOf = (r, g, b) => '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const hsl = (h, s, l) => {
  const a = s * Math.min(l, 1 - l), k = n => (n + h / 30) % 12, ch = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return hexOf(255 * ch(0), 255 * ch(8), 255 * ch(4));
};
// The ROM keeps the app from starting when GPIO0 is low at reset (BOOT held, or a circuit holding it low)
const download = st => st.boot === 'download' || st.faults.includes('strap:GPIO0');
const ROM = 'ESP-ROM:esp32s3-20210327';
const bootLine = (k, st) => k === 0 ? (download(st) ? 'rst:0x1 (POWERON),boot:0x0 (DOWNLOAD(USB/UART0))' : 'rst:0x1 (POWERON),boot:0x8 (SPI_FAST_FLASH_BOOT)')
  : download(st) ? (k === 1 ? 'waiting for download' : null) : undefined;
const gpioDead = (st, net) => st.faults.includes('gpio5v:' + net);
// one RGB pixel on the data pin: level 1 lights the drawing, net.rgb carries the colour
// level .6: the demos write 64 of 255 per channel (RGB_BRIGHTNESS), dimmer than full drive
const rgb = (net, col) => col ? { [net]: .6, [net + '.rgb']: col } : { [net]: 0 };

const modesFor = net => ({
  'blink-rgb': { title: 'Blink RGB', bytes: 289520, banner: ROM,
    out: (st, t) => download(st) ? {} : Object.assign(rgb(net, t % 1 < .5 ? '#ff2a1f' : null), { GPIO4: gpioDead(st, 'GPIO4') ? 0 : t % 1 < .5 ? 1 : 0 }),
    serial: (k, st) => { const b = bootLine(k, st); return b !== undefined ? b : 'blink #' + k; } },
  rainbow: { title: 'RGB rainbow', bytes: 290112, banner: ROM,
    out: (st, t) => download(st) ? {} : rgb(net, hsl((t % 4) / 4 * 360, .85, .5)),
    // the hue actually shown at each whole second: 0, 90, 180, 270 deg in turn
    serial: (k, st) => { const b = bootLine(k, st); return b !== undefined ? b : 'hue ' + (k * 90) % 360 + ' deg'; } },
  'boot-button': { title: 'BOOT button as an input', bytes: 289904, banner: ROM,
    out: st => download(st) ? {} : Object.assign(rgb(net, st.ctl.SW1 ? '#43c25c' : null), { GPIO4: st.ctl.SW1 && !gpioDead(st, 'GPIO4') ? 1 : 0 }),
    serial: (k, st) => { const b = bootLine(k, st); return b !== undefined ? b : st.ctl.SW1 ? 'BOOT pressed' : null; } },
  wifi: { title: 'Wi-Fi web server', bytes: 851264, banner: ROM,
    out: (st, t) => download(st) ? {} : rgb(net, t < 2.6 ? (t % .5 < .25 ? '#3e86d9' : '#1d2a4a') : '#43c25c'),
    serial: (k, st) => { const b = bootLine(k, st); if (b !== undefined) return b;
      if (k === 1) return 'Connecting to bench-lab'; if (k === 2) return '....';
      if (k === 3) return 'WiFi connected, IP 192.168.4.42';
      return k % 3 === 0 ? 'GET / from 192.168.4.17 200 OK' : null; } },
  'deep-sleep': { title: 'Deep sleep', bytes: 271856, banner: ROM,
    out: (st, t) => download(st) ? {} : rgb(net, t % 12 < 2 ? '#cfe4ff' : null),
    serial: (k, st) => { const b = bootLine(k, st); if (b !== undefined) return b;
      return k % 12 === 1 ? 'boot #' + (Math.floor(k / 12) + 1) + ', sleeping 10 s' : null; } },
});

/* ---------- the WROOM-1 module: like the library 'module', but its shield label reads across the module, as printed,
   and it has the real pad count (14 per long side, 12 across the end opposite the antenna) ---------- */
B.kind('esp32-s3-devkitc-1-wroom', {
  group: 'smd', size: () => [25.5, 18], h: 3.1,
  draw(ctx){
    const p = ctx.p, [l, w] = p.size, h = p.h, ant = p.ant || 6.3, M = B.M;
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, .8, matOf('#2c2e33'), toneI, .7);
    s += ctx.slab(-l / 2 + .6, -w / 2 + .6, l / 2 - ant, w / 2 - .6, .8, h, M.steel, toneI, .7);
    const zz = [];
    for (let i = 0; i <= 12; i++) zz.push(ctx.W(l / 2 - ant + .9 + (i % 2 ? ant - 2 : 0), -w / 2 + 1.6 + i * (w - 3.2) / 12, .82));
    s += `<path d="${pd(zz, false)}" fill="none" stroke="#b9974a" stroke-width=".55" stroke-linejoin="round"/>`;
    for (let i = 0; i < 14; i++){ const a = -l / 2 + 1.5 + i * 1.27; s += ctx.disc(a, w / 2 - .25, .81, .3, M.gold.l, 0) + ctx.disc(a, -w / 2 + .25, .81, .3, M.gold.l, 0); }
    for (let i = 0; i < 12; i++) s += ctx.disc(-l / 2 + .25, -6.985 + i * 1.27, .81, .3, M.gold.l, 0);
    const lines = String(p.label || '').split('|'), a0 = (-ant + .6) / 2 + (lines.length - 1) * 1.2;
    lines.forEach((ln, i) => { s += B.flatText(ctx.W(a0 - i * 2.4, 0, h + .01), 1, 0, ln, i ? 1.3 : 1.45, '#5b6163'); });
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), ctx.k > 0 ? `<g opacity="${(1 - .7 * ctx.k).toFixed(2)}">${s}</g>` : s);
  },
  xr: ctx => B.kinds.module.xr(ctx), xrLabel: p => p.short || 'SOC',
});

/* ---------- parts (centres from the PADS design file, rotations as placed) ---------- */
const chip = (id, x, y, rot, size, name, extra) => Object.assign({ id, kind: 'chip', name, at: [x, y], rot,
  size: size === '0402' ? [1, .5] : [1.6, .8], h: size === '0402' ? .35 : .8 }, extra || {});
const cap = { cap: true };
const J1 = ['3V3', '3V3', 'EN', 'GPIO4', 'GPIO5', 'GPIO6', 'GPIO7', 'GPIO15', 'GPIO16', 'GPIO17', 'GPIO18', 'GPIO8', 'GPIO3', 'GPIO46', 'GPIO9',
  'GPIO10', 'GPIO11', 'GPIO12', 'GPIO13', 'GPIO14', '5V', 'GND'];
const J1L = ['3V3', '3V3', 'RST', '4', '5', '6', '7', '15', '16', '17', '18', '8', '3', '46', '9', '10', '11', '12', '13', '14', '5V', 'G'];
const J3 = ['GND', 'GPIO43', 'GPIO44', 'GPIO1', 'GPIO2', 'GPIO42', 'GPIO41', 'GPIO40', 'GPIO39', 'GPIO38', 'GPIO37', 'GPIO36', 'GPIO35', 'GPIO0',
  'GPIO45', 'GPIO48', 'GPIO47', 'GPIO21', 'GPIO20', 'GPIO19', 'GND', 'GND'];
const J3L = ['G', 'TX', 'RX', '1', '2', '42', '41', '40', '39', '38', '37', '36', '35', '0', '45', '48', '47', '21', '20', '19', 'G', 'G'];
const pinY = n => 61.30 - 2.54 * (n - 1);

const partsFor = net => [
  { id: 'U4', kind: 'esp32-s3-devkitc-1-wroom', name: 'ESP32-S3-WROOM-1-N8R8 module', short: 'ESP32-S3 MODULE', at: [12.75, 56.40], rot: 90, size: [25.5, 18], h: 3.1,
    ant: 6.3, label: 'ESP32-S3-WROOM-1|N8R8',
    nets: { 3: '3V3', 4: 'EN', 27: 'GPIO0', 31: 'GPIO38', 37: 'GPIO43', 36: 'GPIO44', 13: 'GPIO19', 14: 'GPIO20' } },
  { id: 'U3', kind: 'qfn', name: 'CP2102N USB-to-UART bridge', short: 'USB-UART', at: [13.589, 20.142], rot: 270, size: [5, 5], h: .8, n: 7, label: 'CP2102N|SILABS' },
  { id: 'U2', kind: 'sot223', name: 'SGM2212 3.3 V regulator (LDO)', short: '3V3 LDO', at: [13.488, 36.373], rot: 270, h: 1.8, label: 'SGM2212' },
  { id: 'D6', kind: 'rgb', name: 'SK68XXMINI-HS addressable RGB LED', short: 'RGB LED', at: [7.493, 29.083], rot: 270, size: [3.5, 3.5], h: 1.9,
    led: { color: '#ffffff', net, via: ['R17'] } },
  { id: 'D5', kind: 'led', name: 'Red power LED (3.3 V)', short: 'POWER LED', at: [19.101, 34.976], rot: 270, size: [1.6, .8], h: .6,
    led: { color: '#e2483d', rail: 'VCC_3V3', via: ['R11'] }, polar: { fault: 'dark', opts: ['cathode mark down, as printed', 'cathode mark up (backwards)'] } },
  { id: 'SW1', kind: 'button-smd', name: 'BOOT button (GPIO0 to GND)', short: 'BOOT', at: [7.525, 13.959], rot: 180, size: [4.2, 3.2], h: 2.5,
    control: { type: 'button', action: 'boot', net: 'GPIO0', active: 0 } },
  { id: 'SW2', kind: 'button-smd', name: 'RESET button (EN to GND)', short: 'RESET', at: [17.905, 13.959], rot: 180, size: [4.2, 3.2], h: 2.5,
    control: { type: 'button', action: 'reset', net: 'EN', active: 0 } },
  { id: 'J2', kind: 'usb-micro', name: 'Micro-USB port "UART" (to the CP2102N)', short: 'UART PORT', at: [6.0, 3.662], rot: 90, size: [5.4, 7.5], h: 3, plug: true },
  { id: 'J4', kind: 'usb-micro', name: 'Micro-USB port "USB" (native ESP32-S3 USB)', short: 'USB PORT', at: [19.4, 3.662], rot: 90, size: [5.4, 7.5], h: 3 },
  { id: 'Q1', kind: 'sot23', name: 'L8050 transistor: auto-reset (DTR to EN)', short: 'Q1', at: [17.78, 29.083], rot: 90, h: 1.11 },
  { id: 'Q2', kind: 'sot23', name: 'L8050 transistor: auto-boot (RTS to GPIO0)', short: 'Q2', at: [12.573, 29.083], rot: 90, h: 1.11 },
  { id: 'D1', kind: 'sod', name: '1N5819 Schottky diode: UART port VBUS to 5 V', short: 'D1', at: [10.439, 8.95], rot: 180, size: [2.7, 1.6], h: 1.35,
    polar: { fault: 'dark', opts: ['band toward the 5 V rail, as printed', 'band toward the port (backwards)'] } },
  { id: 'D7', kind: 'sod', name: '1N5819 Schottky diode: USB port VBUS to 5 V', short: 'D7', at: [14.884, 8.95], rot: 0, size: [2.7, 1.6], h: 1.35,
    polar: { fault: 'dark', opts: ['band toward the 5 V rail, as printed', 'band toward the port (backwards)'] } },
  ...[['D2', 4.59, 'VBUS'], ['D3', 5.994, 'D-'], ['D4', 7.01, 'D+'], ['D8', 17.55, 'VBUS'], ['D9', 19.07, 'D- (GPIO19)'], ['D10', 20.09, 'D+ (GPIO20)']]
    .map(([id, x, line]) => ({ id, kind: 'sod', name: 'ESD protection diode on ' + line, at: [x, 9.0], rot: 270, size: [1.2, .8], h: .7 })),
  chip('C3', 12.725, 13.059, 0, '0603', '10 µF capacitor on 5 V', cap),
  chip('C7', 7.29, 33.833, 180, '0603', '10 µF capacitor (LDO input)', cap),
  chip('C8', 8.306, 35.611, 90, '0402', '100 nF capacitor (LDO input)', cap),
  chip('C9', 6.147, 35.611, 270, '0402', '100 nF capacitor (LDO output)', cap),
  chip('C10', 7.29, 37.389, 180, '0603', '10 µF capacitor (LDO output)', cap),
  chip('C1', 6.528, 39.675, 90, '0603', '10 µF capacitor on 3.3 V (Wi-Fi bursts)', cap),
  chip('C2', 7.036, 35.611, 270, '0402', '100 nF capacitor on 3.3 V', cap),
  chip('R24', 8.179, 39.675, 90, '0603', 'R24 0 Ω link: 3.3 V to the module and 3V3 pins', { label: '0' }),
  chip('R5', 10.465, 40.437, 0, '0402', '10 kΩ EN pull-up'),
  chip('C6', 12.497, 40.437, 0, '0402', '1 µF EN delay capacitor', cap),
  chip('R11', 19.101, 38.405, 270, '0402', '5.1 kΩ resistor for the power LED'),
  chip('R17', 8.89, 25.781, 180, '0402', 'R17 0 Ω link: data pin to the RGB LED'),
  chip('R8', 13.97, 25.781, 180, '0402', '0 Ω link: Q1 to EN'),
  chip('R13', 11.684, 25.781, 180, '0402', '0 Ω link: Q2 to GPIO0'),
  chip('R10', 16.383, 25.781, 0, '0402', '10 kΩ base resistor (DTR)'),
  chip('R12', 18.669, 25.781, 0, '0402', '10 kΩ base resistor (RTS)'),
  chip('R7', 18.669, 21.031, 0, '0402', '0 Ω link: CP2102N TXD to RX (GPIO44)'),
  chip('R9', 18.669, 19.761, 0, '0402', '0 Ω link: TX (GPIO43) to CP2102N RXD'),
  chip('R19', 6.731, 20.015, 0, '0402', '22.1 kΩ VBUS sense resistor'),
  chip('R18', 6.731, 21.031, 0, '0402', '47.5 kΩ VBUS sense resistor'),
  chip('C12', 8.255, 20.523, 90, '0402', '1 µF VBUS sense capacitor', cap),
  chip('R16', 6.731, 18.745, 0, '0402', '1 kΩ CP2102N reset pull-up'),
  chip('C11', 7.239, 22.428, 180, '0603', '10 µF capacitor (CP2102N supply)', cap),
  { id: 'J1', kind: 'male', name: 'Left pin header J1 (22 pins)', short: 'J1', at: [1.27, 34.63], rot: 270, side: 'bottom', h: 8.5, pins: J1, labels: J1L },
  { id: 'J3', kind: 'male', name: 'Right pin header J3 (22 pins)', short: 'J3', at: [24.13, 34.63], rot: 270, side: 'bottom', h: 8.5, pins: J3, labels: J3L },
];

const silkFor = rgbSilk => [
  // pins 1-7 sit beside the module, so their labels shrink into the 1.6 mm gap between the pads and the can
  ...J1L.map((t, i) => i < 7 ? [2.78, pinY(i + 1) - .35, t, .78] : [3.45, pinY(i + 1) - .45, t, 1.05]),
  ...J3L.map((t, i) => i < 7 ? [22.62, pinY(i + 1) - .35, t, .78] : [21.95, pinY(i + 1) - .45, t, 1.05]),
  [7.49, 31.75, rgbSilk, .95], [7.53, 16.55, 'BOOT', 1.1], [17.9, 16.55, 'RESET', 1.1], [6.0, 7.1, 'UART', 1.1], [19.4, 7.1, 'USB', 1.1],
  [13.6, 23.5, 'U3', .8], [16.6, 38.9, 'U2', .8], [21.2, 34.9, 'D5', .8], [12.75, 43.0, 'U4', .8],
];

/* ---------- lesson circuits: the LED on GPIO4 (J1-4) through 330 Ω, the board left of the breadboard ---------- */
const ledCircuit = (title, extra) => ({
  title, breadboard: 'half',
  parts: [
    { id: 'R1', part: 'resistor', ohms: 330, holes: ['b10', 'b14'] },
    { id: 'LED1', part: 'led', color: 'red', holes: ['c14', 'c15'] },
    ...((extra && extra.parts) || []),
  ],
  wires: [
    { from: 'GPIO4', to: 'a10', color: 'orange' },
    { from: 'GND', to: 'a15', color: 'black' },
    ...((extra && extra.wires) || []),
  ],
});
// the dimmer adds a 10 kΩ pot: pin 1 to G, wiper to GPIO1 (ADC1_CH0, readable while Wi-Fi is on), pin 3 to 3V3
const POT = {
  parts: [{ id: 'POT1', part: 'potentiometer', ohms: 10000, pos: .25, holes: ['e20', 'e21', 'e22'] }],
  wires: [{ from: 'GND', to: 'a20', color: 'black' }, { from: 'GPIO1', to: 'a21', color: 'green' }, { from: '3V3', to: 'a22', color: 'red' }],
};

function build(variant){
  const v10 = variant === 'v1.0', net = v10 ? 'GPIO48' : 'GPIO38';
  return {
    id: 'esp32-s3-devkitc-1', fig: '05', name: v10 ? 'ESP32-S3-DevKitC-1 v1.0' : 'ESP32-S3-DevKitC-1 v1.1',
    sub: v10 ? 'ESP32-S3 dual-core 240 MHz, Wi-Fi + BLE, 3.3 V logic, RGB LED on GPIO48' : 'ESP32-S3 dual-core 240 MHz, Wi-Fi + BLE, 3.3 V logic, RGB LED on GPIO38',
    pcb: { w: 25.4, h: 62.74, thick: 1.6, r: .5, color: '#26272b', silk: '#f2f1ea', standoff: 8.6 },
    mat: { front: 16, back: 12, left: 10, right: 10 },
    height: 12, pal: 'mustard',
    holes: [],
    silk: silkFor(v10 ? 'RGB@IO48' : 'RGB@IO38'),
    parts: partsFor(net),
    power: {
      sources: {
        uart: { label: 'USB cable in the UART port', part: 'J2', plug: 'usb-micro', v: 5.0, ilim: .5 },
        usb: { label: 'USB cable in the USB port', part: 'J4', plug: 'usb-micro', v: 5.0, ilim: .5 },
        pin5: { label: '5V pin', pin: '5V', v: 5, range: [4.75, 5.25], max: 20, burns: 'U2' },
        pin3: { label: '3V3 pin', pin: '3V3', v: 3.3, range: [3.0, 3.6], max: 3.6, burns: 'U4' },
      },
      default: 'uart',
      rails: {
        VBUS: { from: [{ src: 'uart', via: ['J2'] }] },
        VBUSB: { from: [{ src: 'usb', via: ['J4'] }] },
        // The engine burns the last part of a feed's via on reverse polarity: a reversed 5V pin takes out the LDO's input
        // (U2), a reversed 3V3 pin the module (U4), as on the real board (fact sheet section 6)
        '5V': { from: [{ rail: 'VBUS', via: ['D1'], drop: .35 }, { rail: 'VBUSB', via: ['D7'], drop: .35 }, { src: 'pin5', via: ['U2'] }] },
        VCC_3V3: { from: [{ rail: '5V', via: ['U2'], reg: 3.3, dropout: .42, max: 20 }, { src: 'pin3', via: ['R24', 'U4'] }], max: 3.6 },
        '3V3': { from: [{ rail: 'VCC_3V3', via: ['R24'] }, { src: 'pin3' }], max: 3.6 },
      },
      mcu: { part: 'U4', rail: '3V3', min: 2.7, needs: ['U4', 'R5'] },
      upload: { source: 'uart', needs: ['U3', 'Q1', 'Q2', 'R8', 'R13', 'R10', 'R12', 'R7', 'R9', 'U4'], tool: 'esptool', also: ['usb'] },
    },
    mode: 'blink-rgb',
    modes: modesFor(net),
    faults: ['short:5V:GND', 'short:3V3:GND', 'wrong-voltage:pin3:5', 'wrong-voltage:pin5:3', 'strap:GPIO0', 'gpio5v:GPIO4',
      'missing:R17', 'missing:R24', 'missing:R5', 'cold:J1.4', 'cold:J2'],
    xr: {
      flow: [
        ['VBUS', [[6.0, 6.4], [6.0, 8.95], [9.1, 8.95]]],
        ['VBUSB', [[19.4, 6.4], [19.4, 8.95], [16.2, 8.95]]],
        ['5V', [[11.8, 8.95], [12.7, 8.95], [12.7, 13.06], [10.0, 16.5], [10.0, 34.07]]],
        ['VCC_3V3', [[17.1, 36.37], [17.1, 39.4], [19.1, 38.4], [19.1, 34.98]]],
        ['3V3', [[17.1, 39.4], [8.18, 39.68], [8.18, 43.6], [12.75, 44.6]]],
        [net, [[21.9, 45.2], [21.9, v10 ? pinY(16) : pinY(10)], [20.6, 27.6], [8.89, 25.78], [7.49, 27.6]]],
        ['GPIO43', [[22.6, 45.2], [22.6, pinY(2)], [24.13, pinY(2)]]],
        ['GPIO43', [[21.2, 45.2], [21.2, 22.4], [18.67, 19.76], [16.3, 19.9]]],
      ],
      notes: [['U4', 'ESP32-S3 + FLASH + 40 MHZ CRYSTAL'], ['U3', 'USB-UART BRIDGE'], ['U2', 'LDO PASS TRANSISTOR'], ['D6', 'R, G, B DIES + DRIVER']],
    },
    tags: [['U4', 46, -34], ['U3', 46, 6], ['U2', -46, 14], ['D6', -48, -6], ['SW1', -40, 26], ['SW2', 40, 24], ['J2', -40, 34], ['J4', 36, 38], ['D5', 44, -14]],
    circuit: 'blink',
    circuits: {
      blink: ledCircuit('Blink an LED on GPIO4'),
      'boot-button': ledCircuit('BOOT button toggles the LED'),
      dimmer: ledCircuit('Potentiometer dims the LED with PWM', POT),
      'web-server': ledCircuit('LED switched from a web page'),
    },
    variants: {
      'v1.1': { name: 'v1.1: RGB LED on GPIO38', patch: () => build('v1.1') },
      'v1.0': { name: 'v1.0: RGB LED on GPIO48', patch: () => build('v1.0') },
    },
    variant: variant,
    // the ESP-IDF brown-out detector's line before the ROM banner, when the rail sags and the chip resets
    brownoutLine: 'Brownout detector was triggered',
  };
}

B.board(build('v1.1'));
})();
