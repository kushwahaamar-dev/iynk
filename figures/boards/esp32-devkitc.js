// @cf title ESP32-DevKitC V4
// @cf use engine/bench.list
/* Espressif ESP32-DevKitC V4 (ordering code ESP32-DevKitC-32E), 27.94 x 48.26 mm. Every centre below comes from
   docs/facts/esp32-devkitc.md, which took them from Espressif's DXF (copper layer) and named them with the layout PDF;
   board origin bottom-left, USB edge at y = 0, module and antenna at the top.
   How it works: micro-USB VBUS goes through the BAT760 Schottky (D3) to the 5V rail, which is also the 5V header pin
   (no diode, no fuse there). The AMS1117-3.3 (U2) makes 3V3 for the ESP32-WROOM-32E module (U3) and the CP2102N
   USB-UART bridge (U1); a supply on the 3V3 pin bypasses the regulator. The red LED D1 (through R2, 2 kOhm) shows 5V,
   and there is no user LED. EN (SW2) resets the chip; Boot (SW1) holds GPIO0 low, so holding Boot while EN is
   released starts the ROM serial downloader. Two SS8050s (Q1, Q2) let esptool do that through DTR/RTS. GPIO12 high
   at reset sets the flash supply to 1.8 V and the board boot-loops. GPIO34-39 are inputs only; the six flash pins
   (D0-D3, CMD, CLK) are not connected on the WROOM-32E. */
(() => {
const B = SL.bench;
const sq = (t, on, off) => (t % (on + off)) < on ? 1 : 0;
const tri = t => { const u = (t % 2) / 2; return u < .5 ? u * 2 : 2 - u * 2; };

// The DevKitC's 2.54 mm male headers point down into the breadboard; from above you see the pad rings, the solder
// fillets and the short pin ends. One kind draws a whole 19-pin row.
B.kind('esp32-devkitc-header', {
  group: 'low',
  size: p => [p.pins.length * 2.54, 2.54],
  h: 2.4,
  pins: p => B.rowPins(p),
  draw(ctx){
    const p = ctx.p, top = p.h, sold = !ctx.o || ctx.o.sold !== false;
    B.rowPins(p).forEach(([x, y], i) => {
      const [a, b] = B.localOf(p, x, y);
      let s = ctx.disc(a, b, .03, .78, B.M.tin.l, .3);
      if (sold) s += ctx.cyl(a, b, .03, .6, .6, B.M.tin, toneI, .3, 12);
      else s += ctx.disc(a, b, .04, .45, B.M.hole, 0);
      if (p.pins[i] !== null) s += ctx.slab(a - .32, b - .32, a + .32, b + .32, sold ? .6 : .05, top, B.M.gold, toneI, .3);
      ctx.put(ctx.B(a - .8, b - .8, 0, a + .8, b + .8, top), s);
    });
  },
  pads(ctx){
    const p = ctx.p; let s = '';
    for (const [x, y] of B.rowPins(p)){ const [a, b] = B.localOf(p, x, y); s += ctx.disc(a, b, .03, .78, B.M.tin.l, .3) + ctx.disc(a, b, .04, .5, B.M.hole, 0); }
    return s;
  },
});

const J2_NETS = ['3V3', 'EN', 'GPIO36', 'GPIO39', 'GPIO34', 'GPIO35', 'GPIO32', 'GPIO33', 'GPIO25', 'GPIO26', 'GPIO27', 'GPIO14', 'GPIO12', 'GND', 'GPIO13', '', '', '', '5V'];
const J2_SILK = ['3V3', 'EN', 'VP', 'VN', '34', '35', '32', '33', '25', '26', '27', '14', '12', 'GND', '13', 'D2', 'D3', 'CMD', '5V'];
const J3_NETS = ['GND', 'GPIO23', 'GPIO22', 'GPIO1', 'GPIO3', 'GPIO21', 'GND', 'GPIO19', 'GPIO18', 'GPIO5', 'GPIO17', 'GPIO16', 'GPIO4', 'GPIO0', 'GPIO2', 'GPIO15', '', '', ''];
const J3_SILK = ['GND', '23', '22', 'TX', 'RX', '21', 'GND', '19', '18', '5', '17', '16', '4', '0', '2', '15', 'D1', 'D0', 'CLK'];
const pinY = n => 47.01 - 2.54 * (n - 1);

// ROM boot log lines (esptool docs, boot mode selection) and what the board's own faults print
const ROM = 'rst:0x1 (POWERON_RESET),boot:0x13 (SPI_FAST_FLASH_BOOT)';
const ROM_DL = 'rst:0x1 (POWERON_RESET),boot:0x3 (DOWNLOAD_BOOT(UART0/UART1/SDIO_REI_REO_V2))';
const strapped = st => (st.faults || []).includes('strap:GPIO12');
const halted = st => st.boot === 'download' || strapped(st);
const log = line => (k, st) => {
  // the ROM samples GPIO0 every time the chip leaves reset (power-up, EN, esptool's RTS reset): Boot held = downloader
  if (k === 0) st.boot = st.ctl && st.ctl.SW1 ? 'download' : null;
  if (st.boot === 'download') return k === 0 ? ROM_DL : k === 1 ? 'waiting for download' : null;
  if (strapped(st)) return 'flash read err, 1000';
  if (k === 0) return ROM;
  return line ? line(k, st) : null;
};

// every lesson uses the same LED on GPIO23 (220 Ohm, red); the touch lesson adds a bare jumper on T0 = GPIO4
const ledCircuit = (title, extra = []) => ({
  title, breadboard: 'half',
  parts: [
    { id: 'R1', part: 'resistor', ohms: 220, holes: ['b10', 'b14'] },
    { id: 'LED1', part: 'led', color: 'red', holes: ['c14', 'c15'] },
  ],
  wires: [
    { from: 'GPIO23', to: 'a10', color: 'orange' },
    { from: 'GND', to: 'a15', color: 'black' },
    ...extra,
  ],
});

B.board({
  id: 'esp32-devkitc', fig: '04', name: 'ESP32-DevKitC V4', sub: 'ESP32-WROOM-32E: dual-core Xtensa LX6 at 240 MHz, Wi-Fi and Bluetooth, 3.3 V logic',
  pcb: { w: 27.94, h: 48.26, thick: 1.6, r: 1, color: '#2b2f36', silk: '#f4f6ef', standoff: 4 },
  mat: { front: 10, back: 10, left: 12, right: 10 },
  height: 14, pal: 'mustard', logic: 3.3,
  holes: [],
  silk: [
    ...J2_SILK.map((t, i) => [3.15, pinY(i + 1), t, .85, -90]),
    ...J3_SILK.map((t, i) => [24.8, pinY(i + 1), t, .85, 90]),
    [6, 7.75, 'EN', 1.05], [22, 7.75, 'Boot', 1.05],
  ],
  traces: [
    [[13.3, 4.9], [13.3, 7.2], [13.6, 9.8]], [[13.95, 4.9], [13.95, 7.2], [14.1, 9.8]],
    [[12.65, 4.9], [12.65, 6.4], [10.2, 8.38]], [[8.09, 8.38], [7.2, 9.4], [7.2, 16.88], [10.92, 16.88]],
    [[8.09, 8.38], [3.4, 5.8], [1.25, 1.29]], [[17.22, 19.18], [17.22, 23.3], [3.6, 23.3], [3.6, 45.6], [1.25, 47.01]],
    [[15.5, 14.65], [18.03, 14.35]], [[16.4, 13.9], [18.92, 14.35]], [[18.92, 15.2], [22.4, 18.2], [22.4, 39.4], [26.65, 39.39]],
    [[18.03, 15.2], [21.9, 18.6], [21.9, 36.85], [26.65, 36.85]], [[21.59, 12.7], [20.2, 26.5], [5.0, 26.5], [3.2, 44.47], [1.25, 44.47]],
    [[21.59, 20.6], [24.3, 22], [24.3, 13.99], [26.65, 13.99]], [[19.3, 6.35], [22, 6.36]], [[6.0, 6.36], [6.35, 16.51]],
  ],
  parts: [
    { id: 'U3', kind: 'module', name: 'ESP32-WROOM-32E module', short: 'ESP32 MODULE',
      at: [14.0, 41.55], size: [25.5, 18], rot: 90, h: 3.1, ant: 6.04, label: 'ESPRESSIF|ESP32-WROOM-32E' },
    { id: 'U1', kind: 'qfn', name: 'CP2102N USB-to-UART bridge', short: 'USB-UART', at: [14.0, 12.25], size: [5, 5], rot: 270, n: 7, h: .85, label: 'CP2102N|A02' },
    { id: 'U2', kind: 'sot223', name: 'AMS1117-3.3 regulator', short: '3V3 LDO', at: [14.07, 19.18], rot: 270, h: 1.7, label: 'AMS1117' },
    { id: 'J1', kind: 'usb-micro', name: 'Micro-USB socket', short: 'MICRO-USB', at: [13.95, 2.3], size: [5.8, 7.5], rot: 90, h: 2.6 },
    { id: 'SW2', kind: 'button-smd', name: 'EN (reset) button', short: 'EN', at: [6.0, 3.86], size: [6, 3.5], rot: 90, h: 1.8,
      control: { type: 'button', action: 'reset', net: 'EN', active: 0 } },
    { id: 'SW1', kind: 'button-smd', name: 'Boot button on GPIO0', short: 'BOOT', at: [22.0, 3.86], size: [6, 3.5], rot: 90, h: 1.8,
      control: { type: 'button', action: 'boot', net: 'GPIO0', active: 0 } },
    { id: 'D1', kind: 'led', name: 'Red power LED', short: 'PWR LED', at: [6.22, 13.12], size: [1.6, .8], rot: 90, h: .8,
      led: { color: '#e2483d', rail: '5V', via: ['R2'] } },
    { id: 'R2', kind: 'chip', name: 'Power LED resistor (2 kΩ)', at: [6.22, 10.29], size: [1, .5], rot: 90, h: .35 },
    { id: 'D3', kind: 'sod', name: 'BAT760 Schottky diode', short: 'SCHOTTKY', at: [9.15, 8.38], size: [2.5, 1.25], h: 1,
      polar: { fault: 'dark', opts: ['cathode band toward the 5V rail, as fitted', 'cathode band toward USB (backwards)'] } },
    { id: 'D6', kind: 'sod', name: 'LESD5D5.0 ESD diode on a USB data line', at: [12.45, 7.87], size: [1.6, .8], rot: 90, h: .6 },
    { id: 'D4', kind: 'sod', name: 'LESD5D5.0 ESD diode on a USB data line', at: [13.84, 7.87], size: [1.6, .8], rot: 90, h: .6 },
    { id: 'D5', kind: 'sod', name: 'LESD5D5.0 ESD diode on USB VBUS', at: [15.24, 7.87], size: [1.6, .8], rot: 90, h: .6 },
    { id: 'Q1', kind: 'sot23', name: 'Auto-program transistor (EN)', short: 'AUTO-PROGRAM', at: [21.59, 11.56], rot: 90, h: 1 },
    { id: 'Q2', kind: 'sot23', name: 'Auto-program transistor (GPIO0)', at: [21.59, 19.43], rot: 90, h: 1 },
    { id: 'R21', kind: 'chip', name: 'Auto-program base resistor (DTR)', at: [18.92, 9.91], size: [1, .5], rot: 90, h: .35 },
    { id: 'R22', kind: 'chip', name: 'Auto-program base resistor (RTS)', at: [18.03, 9.91], size: [1, .5], rot: 90, h: .35 },
    { id: 'R17', kind: 'chip', name: '0 Ω link on TXD0 (GPIO1)', at: [18.92, 14.35], size: [1, .5], rot: 90, h: .35, label: '0' },
    { id: 'R18', kind: 'chip', name: '0 Ω link on RXD0 (GPIO3)', at: [18.03, 14.35], size: [1, .5], rot: 90, h: .35, label: '0' },
    { id: 'C15', kind: 'chip', name: '100 nF capacitor on GPIO0', at: [19.3, 6.35], size: [1, .5], rot: 90, h: .5, cap: true },
    { id: 'C14', kind: 'chip', name: '100 nF capacitor', at: [8.64, 6.35], size: [1, .5], rot: 90, h: .5, cap: true },
    { id: 'C1', kind: 'chip', name: 'Regulator input capacitor (22 µF)', at: [8.38, 17.4], size: [2, 1.25], rot: 90, h: 1.25, cap: true },
    { id: 'C3', kind: 'chip', name: 'Regulator output capacitor (22 µF)', at: [8.38, 20.96], size: [2, 1.25], rot: 90, h: 1.25, cap: true },
    { id: 'C21', kind: 'chip', name: '3V3 decoupling capacitor (module)', at: [6.22, 20.96], size: [1.6, .8], h: .8, cap: true },
    { id: 'C22', kind: 'chip', name: '100 nF decoupling capacitor (module)', at: [6.35, 18.54], size: [1, .5], h: .5, cap: true },
    { id: 'R11', kind: 'chip', name: '10 kΩ EN pull-up resistor', at: [6.35, 17.53], size: [1, .5], h: .35 },
    { id: 'C9', kind: 'chip', name: '100 nF EN delay capacitor', at: [6.35, 16.51], size: [1, .5], h: .5, cap: true },
    { id: 'C19', kind: 'chip', name: '100 nF capacitor (CP2102N supply)', at: [9.14, 13.84], size: [1, .5], h: .5, cap: true },
    { id: 'C20', kind: 'chip', name: '10 µF capacitor (CP2102N supply)', at: [9.14, 14.73], size: [1, .5], h: .5, cap: true },
    { id: 'R24', kind: 'chip', name: '2 kΩ resistor (CP2102N side)', at: [9.14, 12.83], size: [1, .5], h: .35 },
    { id: 'R25', kind: 'chip', name: '22.1 kΩ VBUS sense resistor', at: [9.65, 10.29], size: [1, .5], rot: 90, h: .35 },
    { id: 'R26', kind: 'chip', name: '47.5 kΩ VBUS sense resistor', at: [8.64, 10.29], size: [1, .5], rot: 90, h: .35 },
    { id: 'J2', kind: 'esp32-devkitc-header', name: 'Header J2 (left side, 19 pins)', short: 'J2', at: [1.245, 24.15], rot: 270, h: 2.4,
      pins: J2_NETS, labels: J2_SILK },
    { id: 'J3', kind: 'esp32-devkitc-header', name: 'Header J3 (right side, 19 pins)', short: 'J3', at: [26.645, 24.15], rot: 270, h: 2.4,
      pins: J3_NETS, labels: J3_SILK },
  ],
  power: {
    sources: {
      usb: { label: 'USB cable', part: 'J1', plug: 'usb-micro', v: 5.0, ilim: .5 },
      pin5: { label: '5V pin', pin: '5V', v: 5, range: [4.75, 5.25], max: 10 },
      pin3v3: { label: '3V3 pin', pin: '3V3', v: 3.3, range: [3.0, 3.6], max: 3.6 },
    },
    default: 'usb',
    rails: {
      '5V': { from: [{ src: 'usb', via: ['J1', 'D3'], drop: .35 }, { src: 'pin5' }] },
      '3V3': { from: [{ rail: '5V', via: ['U2'], reg: 3.3, dropout: 1.1, max: 10 }, { src: 'pin3v3' }], max: 3.6 },
    },
    mcu: { part: 'U3', rail: '3V3', min: 2.43, needs: ['U3', 'R11'] },
    upload: { source: 'usb', needs: ['U1', 'R17', 'R18'], tool: 'esptool', seconds: 3 },
  },
  mode: 'blink',
  modes: {
    blink: { title: 'Blink GPIO23', bytes: 289456, out: (st, t) => halted(st) ? {} : { GPIO23: sq(t, .5, .5) }, serial: log(null) },
    fade: { title: 'LEDC fade on GPIO23', bytes: 291232, out: (st, t) => halted(st) ? {} : { GPIO23: tri(t) }, serial: log(null) },
    hello: { title: 'Serial hello', bytes: 290896, out: () => ({}), serial: log(k => 'hello from the ESP32 #' + k) },
  },
  faults: ['strap:GPIO12', 'wrong-voltage:pin3v3:5', 'cold:J3.2', 'short:5V:GND', 'short:3V3:GND'],
  xr: {
    flow: [
      ['5V', [[12.65, 4.9], [12.65, 6.4], [10.2, 8.38]]],
      ['5V', [[8.09, 8.38], [7.2, 9.4], [7.2, 16.88], [10.92, 16.88]]],
      ['5V', [[8.09, 8.38], [3.4, 5.8], [1.25, 1.29]]],
      ['3V3', [[17.22, 19.18], [17.22, 23.3], [3.6, 23.3], [3.6, 45.6], [1.25, 47.01]]],
      ['GPIO23', [[23.0, 44.47], [26.65, 44.47]]],
    ],
    notes: [['U3', 'ESP32 + 4 MB FLASH'], ['U1', 'USB-UART BRIDGE'], ['U2', '3.3 V LDO'], ['D1', 'LED DIE']],
  },
  tags: [['U3', 40, -34], ['U2', 60, -26], ['U1', 64, -6], ['J1', -10, 44], ['SW1', 46, 8], ['SW2', -42, 34], ['D1', -64, 14]],
  circuit: 'blink',
  circuits: {
    blink: ledCircuit('Blink an LED on GPIO23'),
    'boot-button': ledCircuit('Boot button toggles the LED'),
    touch: ledCircuit('Touch pin T0 (GPIO4) lights the LED', [{ from: 'GPIO4', to: 'a3', color: 'blue' }]),
    fade: ledCircuit('LEDC fade on GPIO23'),
    'web-switch': ledCircuit('Wi-Fi web switch for the LED'),
  },
});
})();
