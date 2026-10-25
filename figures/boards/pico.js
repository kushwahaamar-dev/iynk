// @cf title Raspberry Pi Pico
// @cf use engine/bench.list
// @cf use parts/push-button.js
// @cf use parts/potentiometer.js
// @cf use parts/mpu6050.js
/* Raspberry Pi Pico family: Pico (Rev3), Pico W, Pico 2 and Pico 2 W, one variant each (?variant=pico|pico-w|pico2|pico2-w).
   Geometry from docs/facts/pico.md: the 21 x 51 mm outline, holes, the 40 castellated pins and the SWD pads come from the
   dimensioned datasheet drawings; Pico and Pico W part centres from the published STEP files (Pico-R3.step, PicoW.stp);
   Pico 2 / Pico 2 W follow the Pico / Pico W layout (their STEP is one merged solid). Board frame: component side up,
   micro-USB at the top edge (y = 51), origin bottom-left.
   How it works: USB VBUS (no fuse) goes through the Schottky D1 to VSYS; the buck-boost U2 (RT6150B on Pico / Pico 2,
   RT6154A on the W boards) makes 3.3 V from anything between 1.8 and 5.5 V on VSYS and feeds the MCU and its pins.
   USB data goes straight into the RP2040 / RP2350: there is no USB-serial chip. The boot ROM checks BOOTSEL (SW1 pulls
   the flash chip-select low) at reset: held, or with a blank flash, the chip shows up as a USB drive (RPI-RP2 or
   RP2350) and takes a .uf2 file. The only LED (D2) is on GP25, except on the W boards where it hangs off the
   CYW43439 radio (WL_GPIO0) and GP23/24/25/29 belong to the radio's SPI bus. There is no reset button and no power LED. */
(() => {
const B = SL.bench;

// leadless two-sided package (WDFN / USON): pads on the long sides, pin-1 dot, laser text
B.kind('pico-dfn', { group: 'smd', size: () => [2.5, 2.5], h: .75,
  draw(ctx){
    const p = ctx.p, [l, w] = p.size, h = p.h, n = p.n || 4, pitch = l * .78 / n, e = pitch * .28;
    let s = '';
    for (let i = 0; i < n; i++){
      const a = (i - (n - 1) / 2) * pitch;
      s += ctx.slab(a - e, w / 2 - .2, a + e, w / 2 + .12, 0, .16, B.M.tin, toneI, .2) + ctx.slab(a - e, -w / 2 - .12, a + e, -w / 2 + .2, 0, .16, B.M.tin, toneI, .2);
    }
    s += ctx.slab(-l / 2, -w / 2, l / 2, w / 2, .06, h, B.M.black, toneI, .55) + ctx.disc(-l / 2 + .45, -w / 2 + .45, h + .01, .18, '#77716a', 0);
    if (p.label) String(p.label).split('|').forEach((ln, i, a) => { s += ctx.text(0, (a.length / 2 - i - .8) * w * .3, h + .01, ln, Math.min(.75, w * .22, l / ln.length * 1.25), '#d8d2c0'); });
    ctx.put(ctx.B(-l / 2, -w / 2 - .12, 0, l / 2, w / 2 + .12, h), ctx.k > 0 ? `<g opacity="${f(1 - .7 * ctx.k)}">${s}</g>` : s);
  },
  xr(ctx){ B.kinds.qfn.xr(ctx); },
  xrLabel: p => p.short || 'DIE',
});

const blink = (t, on, off) => (t % (on + off)) < on ? 1 : 0;
const LEFT = ['GP0', 'GP1', 'GND', 'GP2', 'GP3', 'GP4', 'GP5', 'GND', 'GP6', 'GP7', 'GP8', 'GP9', 'GND', 'GP10', 'GP11', 'GP12', 'GP13', 'GND', 'GP14', 'GP15'];
const RIGHT = ['GP16', 'GP17', 'GND', 'GP18', 'GP19', 'GP20', 'GP21', 'GND', 'GP22', 'RUN', 'GP26', 'GP27', 'AGND', 'GP28', 'ADC_VREF', '3V3', '3V3_EN', 'GND', 'VSYS', 'VBUS'];
const RIGHT_LABELS = ['GP16', 'GP17', 'GND', 'GP18', 'GP19', 'GP20', 'GP21', 'GND', 'GP22', 'RUN', 'GP26_A0', 'GP27_A1', 'AGND', 'GP28_A2', 'ADC_VREF', '3V3', '3V3_EN', 'GND', 'VSYS', 'VBUS'];
// left pin n sits at y = 49.63 - 2.54 (n - 1); right pin n at y = 1.37 + 2.54 (n - 21): both rows centred on y = 25.5
const ROW_Y = 25.5;

// the MicroPython programs the Upload picker offers (main.py); bytes = the file's length
const SCRIPTS = {
  blink: 'from machine import Pin\nimport time\nled = Pin("LED", Pin.OUT)\next = Pin(15, Pin.OUT)\nwhile True:\n    led.toggle()\n    ext.toggle()\n    time.sleep(0.5)\n',
  bootsel: 'import rp2\nfrom machine import Pin\nled = Pin("LED", Pin.OUT)\nwhile True:\n    led.value(rp2.bootsel_button())\n',
  temp: 'from machine import ADC\nimport time\nsensor = ADC(4)\nwhile True:\n    v = sensor.read_u16() * 3.3 / 65535\n    print("temperature", round(27 - (v - 0.706) / 0.001721, 1), "C")\n    time.sleep(1)\n',
  wifi: 'import network, time\nfrom machine import Pin\nled = Pin("LED", Pin.OUT)\nwlan = network.WLAN(network.STA_IF)\nwlan.active(True)\nwlan.connect("HackTX", "hackathon")\nwhile not wlan.isconnected():\n    led.toggle()\n    time.sleep(0.25)\nled.on()\nprint("connected", wlan.ifconfig()[0])\n',
};
// the on-chip sensor: a fixed, slowly wandering ADC reading, converted with the datasheet formula
const tempLine = k => { const raw = 14000 - 8 * (k % 4), v = raw * 3.3 / 65535; return 'temperature ' + (27 - (v - .706) / .001721).toFixed(1) + ' C'; };

function modes(v){
  const led = v.w ? 'WL_GPIO0' : 'GP25', uf2 = st => st.boot === 'uf2';
  const m = {
    blank: { title: v.two ? 'Blank flash (factory): the RP2350 drive' : 'Blank flash (factory): the RPI-RP2 drive', instant: true, out: () => ({}) },
    blink: { title: 'MicroPython blink', bytes: SCRIPTS.blink.length, out: (st, t) => uf2(st) ? {} : { [led]: blink(t, .5, .5), GP15: blink(t, .5, .5) } },
    bootsel: { title: 'LED follows BOOTSEL', bytes: SCRIPTS.bootsel.length, out: st => uf2(st) ? {} : { [led]: st.ctl.SW1 ? 1 : 0 } },
    temp: { title: 'On-chip temperature', bytes: SCRIPTS.temp.length, out: () => ({}), serial: (k, st) => uf2(st) ? null : tempLine(k) },
  };
  if (v.w) m.wifi = { title: 'Wi-Fi connect', bytes: SCRIPTS.wifi.length, out: (st, t) => uf2(st) ? {} : { [led]: t < 2 ? blink(t, .25, .25) : 1 },
    serial: (k, st) => !uf2(st) && k === 2 ? 'connected 192.168.4.20' : null };
  return m;
}

// lesson circuits: the board on the left, a half breadboard on the right (pins from docs/facts/pico.md section 7)
const LED15 = (col) => ({
  parts: [
    { id: 'R1', part: 'resistor', ohms: 330, holes: ['b' + col, 'b' + (col + 4)] },
    { id: 'LED1', part: 'led', color: 'red', holes: ['c' + (col + 4), 'c' + (col + 5)] },
  ],
  wires: [
    { from: 'GP15', to: 'a' + col, color: 'orange' },
    { from: 'GND', to: 'a' + (col + 5), color: 'black' },
  ],
});
const blinkCircuit = () => ({ title: 'Blink an LED on GP15', breadboard: 'half', ...LED15(10) });
function circuits(v){
  const led = LED15(20);
  const c = {
    blink: blinkCircuit(),
    button: { title: 'Button on GP14, LED on GP15', breadboard: 'half',
      // legs 1-2 straddle the trench at column 8 and 3-4 at column 10: pressing joins GP14 to GND
      parts: [{ id: 'BTN1', part: 'push-button', holes: ['e8', 'f8', 'e10', 'f10'] }, ...led.parts],
      wires: [{ from: 'GP14', to: 'a8', color: 'yellow' }, { from: 'GND', to: 'a10', color: 'black' }, ...led.wires] },
    fade: { title: 'Potentiometer on GP26 (ADC0), LED on GP15 (PWM)', breadboard: 'half',
      parts: [{ id: 'POT1', part: 'potentiometer', holes: ['e2', 'e4', 'e6'] }, ...led.parts],
      wires: [{ from: '3V3', to: 'a2', color: 'red' }, { from: 'GP26', to: 'a4', color: 'yellow' }, { from: 'AGND', to: 'a6', color: 'black' }, ...led.wires] },
    'i2c-mpu6050': { title: 'MPU-6050 on I2C0 (GP4 SDA, GP5 SCL)', breadboard: 'half',
      // GY-521 header VCC GND SCL SDA XDA XCL AD0 INT in row i; the board lies over rows f-h, the jumpers go in row j
      parts: [{ id: 'IMU1', part: 'mpu6050', holes: ['i12', 'i13', 'i14', 'i15', 'i16', 'i17', 'i18', 'i19'] }],
      wires: [{ from: '3V3', to: 'j12', color: 'red' }, { from: 'GND', to: 'j13', color: 'black' }, { from: 'GP5', to: 'j14', color: 'yellow' }, { from: 'GP4', to: 'j15', color: 'blue' }] },
    'blink-cpp': blinkCircuit(),
  };
  return c;
}

const VAR = {
  pico: { w: false, two: false, name: 'Raspberry Pi Pico', sub: 'RP2040, dual Cortex-M0+ up to 133 MHz, 3.3 V logic, USB straight into the chip' },
  'pico-w': { w: true, two: false, name: 'Raspberry Pi Pico W', sub: 'RP2040 up to 133 MHz with a CYW43439 Wi-Fi and Bluetooth radio, 3.3 V logic' },
  pico2: { w: false, two: true, name: 'Raspberry Pi Pico 2', sub: 'RP2350, dual Cortex-M33 or Hazard3 RISC-V at 150 MHz, 3.3 V logic' },
  'pico2-w': { w: true, two: true, name: 'Raspberry Pi Pico 2 W', sub: 'RP2350 at 150 MHz with a CYW43439 Wi-Fi and Bluetooth radio, 3.3 V logic' },
};

function make(key){
  const v = VAR[key], W = v.w;
  const mcu = v.two
    ? { id: 'U1', kind: 'qfn', name: 'RP2350A microcontroller (dual Cortex-M33 / Hazard3, 520 KB SRAM)', short: 'RP2350', at: [10.5, W ? 27.05 : 25], size: [7, 7], n: 15, h: .9, label: 'RP2350A0A2' }
    : { id: 'U1', kind: 'qfn', name: 'RP2040 microcontroller (dual Cortex-M0+, 264 KB SRAM)', short: 'RP2040', at: [10.5, W ? 27.05 : 25], size: [7, 7], n: 14, h: .9, label: 'RP2-B2' };
  const flash = v.two
    ? { id: 'U3', kind: 'pico-dfn', name: 'W25Q32RV 4 MB QSPI flash', short: 'FLASH', n: 4, h: .6, label: '25Q32RV' }
    : { id: 'U3', kind: 'pico-dfn', name: 'W25Q16JV 2 MB QSPI flash', short: 'FLASH', n: 4, h: .6, label: '25Q16JV' };
  Object.assign(flash, W ? { at: [7.2, 34.19], size: [3, 2] } : { at: [6.7, 31.9], size: [3, 2], rot: 90 });
  const smps = W
    ? { id: 'U2', kind: 'pico-dfn', name: 'RT6154A buck-boost regulator (VSYS to 3.3 V)', short: 'BUCK-BOOST', at: [12.77, 40.09], size: [4, 3], n: 7, h: .8 }
    : { id: 'U2', kind: 'pico-dfn', name: 'RT6150B buck-boost regulator (VSYS to 3.3 V)', short: 'BUCK-BOOST', at: [13.4, 40.1], size: [2.5, 2.5], n: 5, h: .75 };
  const parts = [
    { id: 'J1', kind: 'usb-micro', name: 'Micro-USB socket (power and USB data)', short: 'USB', at: [10.5, W ? 49.32 : 49.5], size: [W ? 6.06 : 5.6, 8], h: W ? 3.35 : 3.2, rot: -90, plug: true },
    { id: 'SW1', kind: 'button-smd', name: 'BOOTSEL button', short: 'BOOTSEL', at: [7, 39], size: [3.2, 4.25], h: 2.5, control: { type: 'button', action: 'bootsel', net: 'BOOTSEL' } },
    { id: 'D2', kind: 'led', name: W ? 'User LED (driven by the radio, WL_GPIO0)' : 'User LED (GP25)', short: 'LED', at: [4.8, W ? 46.19 : 46.2], size: [W ? 1.95 : 1.6, W ? .73 : .8], h: W ? .68 : .6,
      led: W ? { color: '#57c46b', net: 'WL_GPIO0', via: ['SH1'] } : { color: '#57c46b', net: 'GP25' } },
    { id: 'D1', kind: 'sod', name: 'MBR120 Schottky diode (VBUS to VSYS)', short: 'DIODE', at: [16.5, 44.4], size: [3.6, 1.65], h: W ? .98 : .95, rot: 90,
      polar: { fault: 'dark', opts: ['band toward VSYS, as printed', 'band toward VBUS (backwards)'] } },
    smps,
    { id: 'L1', kind: 'inductor', name: '2.2 µH inductor for the buck-boost', short: 'INDUCTOR', at: [W ? 16.52 : 16.5, W ? 40.11 : 40.1], size: [2, 2.5], h: 1.2 },
    { id: 'C1', kind: 'chip', name: '47 µF capacitor (VSYS side of the buck-boost)', at: W ? [12.42, 43.57] : [13.4, 42.6], size: [2, 1.25], h: 1.25, cap: true },
    { id: 'C2', kind: 'chip', name: '47 µF capacitor (3.3 V side of the buck-boost)', at: W ? [12.51, 36.3] : [13.4, 37.6], size: [2, 1.25], h: 1.25, cap: true },
    flash,
    { id: 'Q1', kind: 'sot23', name: 'DMG1012T MOSFET (stops ADC3 leaking into 3V3)', at: W ? [17.01, 33.26] : [16.9, 32.7], size: [1.6, .8], h: .8 },
    mcu,
    { id: 'X1', kind: 'xtal-smd', name: '12 MHz crystal', short: '12 MHz', at: W ? [5.81, 20.59] : [8.2, 16.45], size: [3.2, 2.5], h: W ? .91 : .6, label: W ? '' : 'AEL12.0' },
    { id: 'PINS1', kind: 'castellated', name: 'Castellated pins 1-20 (GP0-GP15)', short: 'PINS 1-20', at: [1.61, ROW_Y], rot: -90, fixed: true, pins: LEFT },
    { id: 'PINS2', kind: 'castellated', name: 'Castellated pins 21-40 (GP16-GP28, power)', short: 'PINS 21-40', at: [19.39, ROW_Y], rot: 90, fixed: true, pins: RIGHT, labels: RIGHT_LABELS },
    { id: 'H1', kind: 'male', name: '20-pin header, pins 1-20 (you solder it)', short: 'HEADER 1-20', at: [1.61, ROW_Y], rot: -90, side: 'bottom', h: 8.5, group: 'low', pins: LEFT },
    { id: 'H2', kind: 'male', name: '20-pin header, pins 21-40 (you solder it)', short: 'HEADER 21-40', at: [19.39, ROW_Y], rot: 90, side: 'bottom', h: 8.5, group: 'low', pins: RIGHT, labels: RIGHT_LABELS },
  ];
  if (W){
    parts.push(
      { id: 'C3', kind: 'chip', name: '47 µF capacitor (3.3 V rail)', at: [12.51, 34.57], size: [2, 1.25], h: 1.25, cap: true },
      { id: 'J2', kind: 'pads', name: 'SWD debug holes (SWCLK, GND, SWDIO)', short: 'DEBUG', at: [13.62, 19.8], fixed: true, d: 1.7, pins: ['SWCLK', 'GND', 'SWDIO'] },
      { id: 'SH1', kind: 'can', name: 'CYW43439 Wi-Fi and Bluetooth radio under its RF shield', short: 'WI-FI', at: [10.5, 13.2], size: [12, 10], h: 1.7 },
      { id: 'ANT', kind: 'antenna', name: 'Printed 2.4 GHz antenna (keep metal away)', short: 'ANTENNA', at: [10.5, 4.3], size: [6.6, 8.4], rot: 90, fixed: true },
    );
  } else {
    parts.push(
      { id: 'J2', kind: 'castellated', name: 'SWD debug pads (SWCLK, GND, SWDIO)', short: 'DEBUG', at: [10.5, 1.6], fixed: true, pins: ['SWCLK', 'GND', 'SWDIO'] },
      { id: 'TP1', kind: 'pads', name: 'Test pad TP1 (GND, underside)', at: [10.7, 46.3], side: 'bottom', fixed: true, d: 1.2, pins: ['GND'], labels: ['TP1'] },
      { id: 'TP2', kind: 'pads', name: 'Test pads TP3 and TP2 (USB D+ and D-, underside)', at: [10.65, 49.4], side: 'bottom', fixed: true, d: 1.2, pitch: 2.3, pins: ['USB_DP', 'USB_DM'], labels: ['TP3', 'TP2'] },
      { id: 'TP4', kind: 'pads', name: 'Test pads TP6, TP5, TP4 (BOOTSEL, GP25, GP23; underside)', at: [7.9, 40.2], rot: 90, side: 'bottom', fixed: true, d: 1.2, pitch: 2.5, pins: ['BOOTSEL', 'GP25', 'GP23'], labels: ['TP6', 'TP5', 'TP4'] },
    );
  }
  const silk = [
    [3.7, 49.63, '1', 1], [3.7, 47.09, '2', 1], [17.1, 47.09, '39', 1],
    [4.8, 44.7, 'LED', .9], [10.5, 45.3, 'USB', .9], [4.6, 39, 'BOOTSEL', .8, 90],
    W ? [7.8, 19.8, 'DEBUG', .8, 90] : [10.5, 3.9, 'DEBUG', .9],
    ...(v.two && W ? [[10.5, 21.2, 'Pico 2 W', 1.3]] : [[4.1, 15.5, key === 'pico' ? 'Raspberry Pi Pico © 2020' : v.name, .9, 90]]),
  ];
  const rails = {
    VBUS: { from: [{ src: 'usb', via: ['J1'] }, { src: 'echo5', via: ['J1'] }, { src: 'vbus', via: ['D1'], protect: 'D1' }] },
    VSYS: { from: [{ rail: 'VBUS', via: ['D1'], drop: .3 }, { src: 'vsys' }] },
    // buck-boost: holds 3.3 V from 1.8 to 5.5 V in (a negative dropout is the headroom it can boost), off below 1.8 V
    '3V3': { from: [{ rail: 'VSYS', via: ['L1', 'C1', 'C2', 'U2'], reg: 3.3, dropout: -1.6, max: 6, offIf: ['VSYS', '<', 1.8] },
      // a 5 V sensor output on GP17: on the RP2040 the pin's protection diode to 3V3 conducts and drags the rail up;
      // the RP2350's GPIO0-22 are 5 V tolerant while powered, so nothing flows there
      ...(v.two ? [] : [{ src: 'echo5', via: ['U1'], drop: .6 }])], max: 3.63 },
  };
  return {
    id: 'pico', fig: '07', name: v.name, sub: v.sub, logic: 3.3, pal: 'mint', height: 12,
    pcb: { w: 21, h: 51, thick: 1, r: .5, color: '#2b8a57', silk: '#f4f6ef', standoff: 8.5 },
    mat: { front: 10, back: 20, left: 9, right: 9 },
    holes: [[4.8, 2, 2.1], [16.2, 2, 2.1], [4.8, 49, 2.1], [16.2, 49, 2.1]],
    silk,
    traces: [
      [[10.5, 46.4], [14.6, 46.4], [16.5, 46.2]], [[16.5, 42.6], [14.8, 41.6], [13.4, 41.4]], [[13.4, 38.8], [12.2, 33.5], [11.2, 28.6]],
      [[7.6, 27.4], [5.2, 34.5], [4.8, 45.4]], [[7.2, 22.6], [8.2, 17.7]], [[7.4, 36.8], [6.9, 33.4]], [[13.6, 28.6], [16.9, 31.9]],
    ],
    parts,
    power: {
      sources: {
        usb: { label: 'USB cable', part: 'J1', plug: 'usb-micro', v: 5, ilim: .5 },
        vbus: { label: 'VBUS pin', pin: 'VBUS', v: 5, range: [4.5, 5.5], max: 5.5 },
        vsys: { label: 'Battery on VSYS', pin: 'VSYS', v: 3.7, range: [1.8, 5.5], max: 5.5 },
        // a wiring mistake as a supply: USB power plus an HC-SR04 echo (5 V) straight into GP17
        echo5: { label: 'USB, with a 5 V sensor output on GP17', part: 'J1', plug: 'usb-micro', v: 5, range: [0, 3.3], scenario: true },
      },
      default: 'usb',
      rails,
      mcu: { part: 'U1', rail: '3V3', min: 1.62, needs: ['U1', 'U3', 'X1'] },
      upload: { source: 'usb', needs: ['J1', 'U1', 'U3', 'X1'], tool: 'uf2' },
    },
    mode: 'blink',
    modes: modes(v),
    faults: ['short:3V3:GND', 'short:VBUS:GND', 'cold:H1.20', 'cold:H2.11', 'missing:X1', 'missing:C2'],
    xr: {
      flow: [
        ['VBUS', [[10.5, 46.6], [14.6, 46.4], [16.5, 46]]],
        ['VSYS', [[16.5, 42.8], [14.8, 41.6], [smps.at[0], smps.at[1]], [19.39, 47.09]]],
        ['3V3', [[smps.at[0], smps.at[1] - 1.4], [12.2, 33.5], [11.2, 28.6], [19.39, 39.47]]],
        [W ? 'WL_GPIO0' : 'GP25', W ? [[10.5, 18.2], [6, 22], [5.2, 34.5], [4.8, 45.4]] : [[7.6, 27.4], [5.2, 34.5], [4.8, 45.4]]],
        ['GP15', [[7, 23], [3.6, 6], [1.61, 1.37]]],
      ],
      notes: [['U1', 'SILICON DIE'], ['U3', 'FLASH MEMORY'], ['X1', 'QUARTZ'], ['U2', 'BUCK-BOOST'], ...(W ? [['SH1', 'WI-FI RADIO']] : [])],
    },
    tags: [['U1', 40, 30], ['J1', -40, -18], ['SW1', -44, 10], ['D2', -40, -30], ['U3', -46, 20], ['U2', 42, -14], ['X1', 36, 34], ...(W ? [['SH1', 44, 36]] : [])],
    circuit: 'blink',
    circuits: circuits(v),
    variant: key,
    variants: Object.fromEntries(Object.entries(VAR).map(([k, x]) => [k, { name: x.name, patch: () => make(k) }])),
    // pin voltage limits, for an engine "external voltage on a pin" fault (docs/requests/item-pico.md)
    levels: { vmax: 3.63, tolerant: v.two ? LEFT.concat(RIGHT).filter(n => /^GP(\d|1\d|2[0-5])$/.test(n)) : [] },
  };
}

B.board(make('pico'));
})();
