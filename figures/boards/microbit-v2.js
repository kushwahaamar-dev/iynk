// @cf title BBC micro:bit V2
// @cf use engine/bench.list
// @cf use parts/potentiometer.js
/* BBC micro:bit V2 (V2.21). Geometry from docs/facts/microbit-v2.md section 2: the outline, ring and button centres,
   the LED grid and the back-side part centres are measured on the Avnet assembly drawing (vector PDF); small passives,
   diodes and transistors sit at their designator labels (+/- 1.5 mm). Two parts have no drawn position and are left
   out rather than guessed: X2 (the interface chip's 32 MHz crystal) and D57 (the second battery diode, in series with
   D59, named with it). The PCB antenna area is the fact sheet's estimate (top-right corner seen from the front).
   Board frame: front (LEDs, buttons, logo) up, edge connector at the bottom (y = 0), USB at the top edge, origin at
   the bottom-left corner. Everything but the LEDs, buttons A and B, the logo and the rings sits on the back.
   How it works: USB 5 V goes through the Schottky D51, a 2 x AAA pack in J2 through D59 + D57, onto VCOMBINED; the
   NCP114 LDO U3 makes the 3.3 V rail (3V) for both nRF52 chips, the sensors and the 3V ring. The 3V ring and the back
   battery pads feed the rail directly, past every protection part. The nRF52820 (U5) is the USB interface: DAPLink
   firmware, the MICROBIT drive, serial and the yellow USB LED; the nRF52833 (U2) runs your program. Rows and columns
   of the 5 x 5 matrix hang off U2; P3, P4, P6, P7 and P10 on the edge are its columns. */
(() => {
const B = SL.bench;
const blinkAt = (t, on, off) => (t % (on + off)) < on ? 1 : 0;
const RED = '#e2483d';

// 5 x 5 images, one brightness digit (0-9) per LED, row by row from the top (MicroPython's Image strings)
const IMG = {
  heart: '0909099999999990999000900', small: '0000009090099900090000000', happy: '0000009090000009000909990',
  sad: '0000009090000000999090009', centre: '0000000000009000000000000', blank: '0000000000000000000000000',
  note: '0090000900009009990099900',
};

/* the 5 x 5 matrix: 25 red 0603 LEDs on a 4 mm grid (long axis along y). Lit from the run: the built-in programs
   send MATRIX as 25 brightness digits; a host sends MX0..MX24 (0..1, row by row from the top-left LED) */
B.kind('microbit-matrix', { group: 'smd', size: () => [16.8, 17.6], h: .6,
  draw(ctx){
    const p = ctx.p, o = ctx.o.o || { pins: {} }, pins = o.pins || {}, img = pins.MATRIX, h = p.h;
    const level = i => typeof img === 'string' ? (+img[i] || 0) / 9 : Math.max(0, Math.min(1, +pins['MX' + i] || 0));
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++){
      const a = (c - 2) * 4, b = (2 - r) * 4, lit = level(r * 5 + c);
      let s = ctx.slab(a - .4, b + .4, a + .4, b + .8, 0, h * .45, B.M.tin, toneI, .25) + ctx.slab(a - .4, b - .8, a + .4, b - .4, 0, h * .45, B.M.tin, toneI, .25)
        + ctx.slab(a - .4, b - .4, a + .4, b + .4, 0, h, matOf(lit > .05 ? mix(RED, '#ffffff', .25 * lit) : '#ece6d6'), toneI, .3);
      if (lit > .05) s += ctx.glow(a, b, h, .9 + 2.2 * lit, RED, .35 * lit) + ctx.glow(a, b, h, .4 + .8 * lit, '#fff1e8', .7 * lit);
      ctx.put(ctx.B(a - .4, b - .8, 0, a + .4, b + .8, h), s);
    }
  },
  xr(ctx){ const h = ctx.p.h; let s = '';
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) s += ctx.slab((c - 2) * 4 - .15, (2 - r) * 4 - .15, (c - 2) * 4 + .15, (2 - r) * 4 + .15, h * .6, h * .7, { l: '#8c95b8', m: '#6b7397', d: '#3f4565' }, toneI, .2);
    ctx.put(ctx.B(-8.4, -8.8, h + .01, 8.4, 8.8, h + .02), `<g opacity="${f(ctx.k)}">${s}</g>`); },
  xrLabel: () => 'LED DIES',
});

// one edge ring: a gold 4.98 mm pad round a plated 3.98 mm hole, its silk label above it
B.kind('microbit-ring', { group: 'smd', size: () => [4.98, 4.98], h: .05, pins: p => [p.at],
  draw(ctx){
    const p = ctx.p, glow = ctx.sel ? '#ffe6a3' : B.M.gold.l;
    const s = ctx.disc(0, 0, .03, 2.49, glow, .5) + ctx.disc(0, 0, .04, 1.99, B.M.hole, .4) + ctx.disc(0, 0, .045, 1.99, 'none', .3)
      + ctx.text(0, 4.1, .05, (p.labels && p.labels[0]) || '', p.labels && p.labels[0].length > 1 ? 1.7 : 2.2, '#f6f4ea');
    ctx.put(ctx.B(-2.5, -2.5, 0, 2.5, 5.5, .06), s); },
});

/* the gold edge connector: the 20 narrow strips at their measured x (0.9 mm wide, 1.27 mm grid) and the wide fingers
   under the five rings, down to the board edge; the narrow strips are board pins (P3...P20, the 3V and GND guards) */
const STRIPS = [[1.03, 'P3'], [7.38, 'P4'], [8.66, 'P5'], [9.93, 'P6'], [11.2, 'P7'], [17.55, 'P8'], [18.82, 'P9'], [20.09, 'P10'], [21.36, 'P11'], [22.62, 'P12'],
  [28.98, 'P13'], [30.25, 'P14'], [31.52, 'P15'], [32.78, 'P16'], [34.05, '3V'], [40.41, '3V'], [41.67, 'P19'], [42.95, 'P20'], [44.22, 'GND'], [50.56, 'GND']];
const RING_X = [4.21, 14.37, 25.8, 37.23, 47.39];
B.kind('microbit-edge', { group: 'smd', size: () => [51.6, 5.6], h: .05, pins: () => STRIPS.map(([x]) => [x, 2.8]),
  draw(ctx){
    const p = ctx.p; let s = '';
    const at = x => x - p.at[0];
    for (const [x] of STRIPS){ const y0 = x < 2 ? 1.87 : x > 50 ? 2.12 : .28, y1 = x < 2 ? 4.85 : x > 50 ? 4.6 : 5.32;
      s += ctx.poly([[at(x) - .45, y0 - p.at[1]], [at(x) + .45, y0 - p.at[1]], [at(x) + .45, y1 - p.at[1]], [at(x) - .45, y1 - p.at[1]]], .03, B.M.gold.l, .3); }
    for (const x of RING_X) s += ctx.poly([[at(x) - 2.54, .28 - p.at[1]], [at(x) + 2.54, .28 - p.at[1]], [at(x) + 2.54, 5 - p.at[1]], [at(x) - 2.54, 5 - p.at[1]]], .02, B.M.gold.m, .3);
    ctx.put(ctx.B(-25.8, -2.8, 0, 25.8, 2.8, .06), s); },
});

// the touch logo: a gold stadium outline with two round eyes (the micro:bit face), capacitive touch on P1.04; its net
// is P201, the pin the MicroPython runtime reads for pin_logo (the lessons' world input uses the same net)
B.kind('microbit-logo', { group: 'smd', size: () => [8.68, 4.88], h: .05,
  draw(ctx){
    const [l, w] = ctx.p.size, col = ctx.on ? '#ffe6a3' : B.M.gold.l, rr = w / 2;
    const stadium = (hl, r) => { const pts = []; for (let i = 0; i <= 12; i++){ const a = -Math.PI / 2 + i * Math.PI / 12; pts.push([hl - r + r * Math.cos(a), r * Math.sin(a)]); }
      for (let i = 0; i <= 12; i++){ const a = Math.PI / 2 + i * Math.PI / 12; pts.push([-hl + r + r * Math.cos(a), r * Math.sin(a)]); } return pts; };
    let s = ctx.poly(stadium(l / 2, rr), .03, col, .5) + ctx.poly(stadium(l / 2 - .85, rr - .85), .035, '#232326', .3);
    s += ctx.disc(-l * .2, 0, .04, .75, col, .3) + ctx.disc(l * .2, 0, .04, .75, col, .3);
    if (ctx.on) s += ctx.glow(0, 0, .1, 5, '#ffd27a', .35);
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, .06), s); },
});

// MLT-8530 magnetic speaker: a black 8 mm square with cut corners and a round sound port
B.kind('microbit-speaker', { group: 'smd', size: () => [8, 8], h: 3,
  draw(ctx){
    const p = ctx.p, [l] = p.size, h = p.h, e = 1.2, q = l / 2;
    const body = ctx.slab(-q, -q + e, q, q - e, 0, h, B.M.blackPl, toneI, .7) + ctx.slab(-q + e, -q, q - e, q, 0, h, B.M.blackPl, toneI, .7);
    ctx.put(ctx.B(-q, -q, 0, q, q, h), body + ctx.disc(0, 0, h + .01, 1.1, '#151311', .4)); },
  xr(ctx){ const h = ctx.p.h; ctx.put(ctx.B(-3, -3, h + .01, 3, 3, h + .02), `<g opacity="${f(ctx.k)}">${ctx.disc(0, 0, h * .5, 2.6, '#b87333', .4) + ctx.disc(0, 0, h * .55, 1.4, '#7f888b', .3)}</g>`); },
  xrLabel: () => 'COIL AND MAGNET',
});

// the small 0402/DFN parts that only have label positions: one selectable group per job
B.kind('microbit-smalls', { group: 'smd', size: p => p.size || [6, 6], h: .4,
  draw(ctx){
    const p = ctx.p, dark = { l: '#3c3935', m: '#2c2a27', d: '#1c1b19' };
    for (const [x, y, k] of p.spots || []){
      const [a, b] = B.localOf(p, x, y), q = k === 'd' ? [.5, .3] : [.5, .25];
      ctx.put(ctx.B(a - q[0], b - q[1], 0, a + q[0], b + q[1], .4), ctx.slab(a - q[0], b - q[1], a + q[0], b + q[1], 0, .4, k === 'c' ? B.M.tan : dark, toneI, .3));
    }
  },
});
/* Back-side parts hang under the PCB, which the engine draws first, so drawn as usual they would paint over the
   front. They show in see-through (the PCB ghosted) and, faintly, while selected; otherwise the board hides them as
   the real one does. */
const backDraw = (ctx, draw) => {
  if (ctx.k < .05 && !ctx.sel) return;
  const put = ctx.put, op = ctx.k < .05 ? .55 : 1;
  ctx.put = (bx, svg) => put(bx, op < 1 ? `<g opacity="${op}">${svg}</g>` : svg);
  try { draw(ctx); } finally { ctx.put = put; }
};
const back = name => {
  const base = B.kinds[name] || {}, id = 'microbit-back-' + name;
  if (!B.kinds[id]) B.kind(id, Object.assign({}, base, { draw: ctx => backDraw(ctx, c => base.draw(c)) }));
  return id;
};
// the micro-USB socket on the back; the cable comes out past the top edge, under the board, and down to the mat
B.kind('microbit-usb', Object.assign({}, B.kinds['usb-micro'] || {}, {
  draw: ctx => backDraw(ctx, c => B.kinds['usb-micro'].draw(c)),
  plug(ctx){
    const p = ctx.p, x0 = -p.size[0] / 2, zc = p.h / 2, pw = p.size[1] * 1.15, ph = 5, mat = (p.standoff || 6) - 1.4;
    const boot = matOf('#5c5a57'), cable = matOf('#4a4845');
    ctx.put(ctx.B(x0 - 9, -pw / 2, zc - ph / 2, x0 - .4, pw / 2, zc + ph / 2), ctx.slab(x0 - 9, -pw / 2, x0 - .4, pw / 2, zc - ph / 2, zc + ph / 2, boot, toneI, .9));
    const pts = []; for (let i = 0; i <= 8; i++){ const t = i / 8; pts.push([x0 - 9 - t * 22, 0, zc + (mat - zc) * Math.sin(t * Math.PI / 2)]); }
    for (let i = 0; i < 8; i++) ctx.put(ctx.B(Math.min(pts[i][0], pts[i + 1][0]), -1.4, Math.min(pts[i][2], pts[i + 1][2]) - 1.4, Math.max(pts[i][0], pts[i + 1][0]), 1.4, Math.max(pts[i][2], pts[i + 1][2]) + 1.4),
      ctx.rod(pts[i], pts[i + 1], 1.4, cable, toneI, .9));
  },
}));
const group = (id, name, short, spots) => {
  const xs = spots.map(s => s[0]), ys = spots.map(s => s[1]);
  const x0 = Math.min(...xs) - .7, x1 = Math.max(...xs) + .7, y0 = Math.min(...ys) - .7, y1 = Math.max(...ys) + .7;
  return { id, kind: back('microbit-smalls'), name, short, at: [(x0 + x1) / 2, (y0 + y1) / 2], size: [x1 - x0, y1 - y0], side: 'bottom', spots };
};

// the MicroPython programs the Upload picker offers (main.py); bytes = the file's length (the runtime stays on the
// board: the Python Editor's partial flashing only rewrites what changed)
const SCRIPTS = {
  heart: 'from microbit import *\nwhile True:\n    display.show(Image.HEART)\n    sleep(500)\n    display.show(Image.HEART_SMALL)\n    sleep(500)\n',
  blink: 'from microbit import *\nwhile True:\n    display.set_pixel(2, 2, 9)\n    pin1.write_digital(1)\n    sleep(500)\n    display.set_pixel(2, 2, 0)\n    pin1.write_digital(0)\n    sleep(500)\n',
  buttons: 'from microbit import *\nwhile True:\n    if button_a.is_pressed():\n        display.show(Image.HAPPY)\n    elif button_b.is_pressed():\n        display.show(Image.SAD)\n    else:\n        display.clear()\n    sleep(20)\n',
  logo: 'from microbit import *\nwhile True:\n    if pin_logo.is_touched():\n        display.show(Image.MUSIC_CROTCHET)\n    else:\n        display.clear()\n    sleep(20)\n',
  meter: 'from microbit import *\nwhile True:\n    level = microphone.sound_level() // 52\n    display.show(Image("".join(("99999" if 4 - y <= level else "00000") + ":" for y in range(5))))\n    sleep(100)\n',
  temp: 'from microbit import *\nwhile True:\n    print("temperature", temperature(), "C")\n    sleep(1000)\n',
};
const bar = n => Array.from({ length: 5 }, (_, r) => (4 - r < n ? '99999' : '00000')).join('');
const modes = {
  heart: { title: 'Beating heart', bytes: SCRIPTS.heart.length, out: (st, t) => ({ MATRIX: blinkAt(t, .5, .5) ? IMG.heart : IMG.small }) },
  blink: { title: 'Blink pin 1', bytes: SCRIPTS.blink.length, out: (st, t) => { const on = blinkAt(t, .5, .5); return { MATRIX: on ? IMG.centre : IMG.blank, P1: on }; } },
  buttons: { title: 'Button faces', bytes: SCRIPTS.buttons.length,
    out: st => ({ MATRIX: st.ctl.SW2 ? IMG.happy : st.ctl.SW3 ? IMG.sad : IMG.blank }) },
  logo: { title: 'Touch the logo', bytes: SCRIPTS.logo.length, out: st => ({ MATRIX: st.ctl.LOGO ? IMG.note : IMG.blank }) },
  // the microphone's power pin (RUN_MIC) also lights D70; the level is a fixed rhythm, so the run is repeatable
  meter: { title: 'Sound meter', bytes: SCRIPTS.meter.length, out: (st, t) => ({ RUN_MIC: 1, MATRIX: bar(Math.round(2.5 + 2.5 * Math.sin(t * 5) * Math.sin(t * 1.3))) }) },
  temp: { title: 'Temperature', bytes: SCRIPTS.temp.length, out: () => ({}), serial: k => 'temperature ' + (24 + (k % 7 === 6 ? 1 : 0)) + ' C' },
};

// lesson circuits: crocodile leads from the rings to a half breadboard (P1 drives the LED, P2 reads the pot)
const LED_P1 = col => ({
  parts: [
    { id: 'R1', part: 'resistor', ohms: 470, holes: ['b' + col, 'b' + (col + 4)] },
    { id: 'LED1', part: 'led', color: 'red', holes: ['c' + (col + 4), 'c' + (col + 5)] },
  ],
  wires: [{ from: 'P1', to: 'a' + col, color: 'yellow' }, { from: 'GND', to: 'a' + (col + 5), color: 'black' }],
});
const ledCircuit = title => ({ title, breadboard: 'half', ...LED_P1(14) });
const circuits = {
  blink: ledCircuit('Blink an LED on pin 1'),
  buttons: ledCircuit('Buttons A and B, an LED on pin 1'),
  dimmer: { title: 'Potentiometer on pin 2, LED on pin 1 (PWM)', breadboard: 'half',
    parts: [{ id: 'POT1', part: 'potentiometer', holes: ['e4', 'e6', 'e8'] }, ...LED_P1(16).parts],
    wires: [{ from: '3V', to: 'a4', color: 'red' }, { from: 'P2', to: 'a6', color: 'green' }, { from: 'GND', to: 'a8', color: 'black' }, ...LED_P1(16).wires] },
};

const parts = [
  // front
  { id: 'LEDS', kind: 'microbit-matrix', name: '5 x 5 red LED matrix (D2-D50), rows and columns driven by the nRF52833', short: '5 x 5 LEDS', at: [25.8, 20] },
  { id: 'SW2', kind: 'tact', name: 'Button A (P5, reads LOW when pressed)', short: 'A', at: [5.86, 20.96], size: [6, 6.5], h: 4.55, group: 'smd', control: { type: 'button', action: 'input', net: 'P5', active: 0 } },
  { id: 'SW3', kind: 'tact', name: 'Button B (P11, reads LOW when pressed)', short: 'B', at: [45.74, 20.96], size: [6, 6.5], h: 4.55, group: 'smd', control: { type: 'button', action: 'input', net: 'P11', active: 0 } },
  { id: 'LOGO', kind: 'microbit-logo', name: 'Touch logo (capacitive, pin_logo)', short: 'LOGO', at: [25.8, 34.02], fixed: true, control: { type: 'touch', action: 'input', net: 'P201', active: 0 } },
  { id: 'RING0', kind: 'microbit-ring', name: 'Ring 0 (P0: analog, touch; music plays here too)', short: '0', at: [RING_X[0], 6.86], fixed: true, pins: ['P0'], labels: ['0'] },
  { id: 'RING1', kind: 'microbit-ring', name: 'Ring 1 (P1: analog, touch, PWM)', short: '1', at: [RING_X[1], 6.86], fixed: true, pins: ['P1'], labels: ['1'] },
  { id: 'RING2', kind: 'microbit-ring', name: 'Ring 2 (P2: analog, touch, PWM)', short: '2', at: [RING_X[2], 6.86], fixed: true, pins: ['P2'], labels: ['2'] },
  { id: 'RING3V', kind: 'microbit-ring', name: '3V ring (3.3 V out, up to 190 mA; power fed in here skips every protection)', short: '3V', at: [RING_X[3], 6.86], fixed: true, pins: ['3V'], labels: ['3V'] },
  { id: 'RINGGND', kind: 'microbit-ring', name: 'GND ring', short: 'GND', at: [RING_X[4], 6.86], fixed: true, pins: ['GND'], labels: ['GND'] },
  { id: 'EDGE', kind: 'microbit-edge', name: 'Edge connector: 20 narrow strips on a 1.27 mm grid (P3-P16, P19, P20, 3V and GND guards)', short: 'EDGE', at: [25.8, 2.8], fixed: true,
    pins: STRIPS.map(s => s[1]) },
  // back
  { id: 'J3', kind: 'microbit-usb', name: 'Micro-USB socket (power, the MICROBIT drive and serial)', short: 'USB', at: [25.93, 39.57], size: [5, 7.5], h: 2.7, rot: -90, side: 'bottom', plug: true },
  { id: 'J2', kind: back('box'), name: 'Battery socket J2 (2-pin, 2.0 mm, for a 2 x AAA pack)', short: 'BATTERY', at: [6.98, 37.26], size: [7.9, 6], h: 5.5, group: 'smd', side: 'bottom', color: '#efe6cf', labelColor: '#6b6458', label: 'BATT', face: '+y' },
  { id: 'SW1', kind: back('tact'), name: 'Reset button (hold to power off)', short: 'RESET', at: [16.27, 38.86], size: [6.5, 6], h: 4.55, group: 'smd', side: 'bottom', control: { type: 'button', action: 'reset' } },
  { id: 'U2', kind: back('qfn'), name: 'nRF52833 processor (runs your program, Bluetooth radio)', short: 'nRF52833', at: [39.59, 25.15], size: [7, 7], rot: 45, n: 12, h: .85, side: 'bottom', label: 'N52833|QIAA' },
  { id: 'X1', kind: back('xtal-smd'), name: '32 MHz crystal for the nRF52833', short: '32 MHz', at: [46.1, 19.57], size: [3.2, 2.4], h: .6, rot: 45, side: 'bottom' },
  { id: 'U5', kind: back('qfn'), name: 'nRF52820 USB interface chip (the MICROBIT drive and serial)', short: 'nRF52820', at: [10.8, 24.27], size: [5, 5], rot: 45, n: 10, h: .85, side: 'bottom', label: 'N52820' },
  { id: 'U3', kind: back('qfn'), name: 'NCP114 3.3 V regulator (300 mA, current-limited)', short: 'LDO', at: [11.89, 35.43], size: [1.2, 1.2], n: 1, h: .5, side: 'bottom' },
  { id: 'D51', kind: back('sod'), name: 'BAT60J Schottky diode (USB 5 V onto VCOMBINED)', short: 'D51', at: [11.79, 41.12], size: [1.7, 1.25], h: .9, side: 'bottom' },
  { id: 'D59', kind: back('sod'), name: 'BAT60A diode D59 (with D57 behind it) on the battery input', short: 'D59', at: [4.13, 31.23], size: [1.7, 1.25], h: .9, rot: 90, side: 'bottom' },
  { id: 'D1', kind: back('sot23'), name: 'BAT54T diode (keeps the LDO output from rising above its input)', short: 'D1', at: [3.31, 26.4], size: [1.6, .8], h: .7, side: 'bottom' },
  { id: 'L5', kind: back('chip'), name: 'USB common-mode choke (90 Ω, 1210)', short: 'L5', at: [15.33, 30.2], size: [3.2, 2.5], h: 1, ferrite: true, side: 'bottom' },
  { id: 'D62', kind: back('sot23'), name: 'PRTR5V0U2F ESD protection on the USB data lines', short: 'ESD', at: [21.4, 36.3], size: [1.5, 1], h: .6, side: 'bottom' },
  { id: 'D60', kind: back('led'), name: 'Red power LED (bright on USB, dimmer on battery)', short: 'PWR', at: [33.1, 39.95], size: [1.6, .8], h: .6, rot: 90, side: 'bottom', led: { color: RED, rail: '3V' } },
  { id: 'D61', kind: back('led'), name: 'Yellow USB LED (on while a computer is connected, flashes while a program copies)', short: 'USB LED', at: [20.83, 40.28], size: [1.6, .8], h: .6, rot: 90, side: 'bottom', led: { color: '#f2c230', rail: 'VBUS', via: ['U5', 'RLED'] } },
  { id: 'U6', kind: back('qfn'), name: 'LSM303AGR motion sensor (accelerometer and compass)', short: 'MOTION', at: [42.7, 12.08], size: [2, 2], n: 3, h: 1, side: 'bottom' },
  { id: 'SP1', kind: back('microbit-speaker'), name: 'MLT-8530 magnetic speaker (driven from P0.00 through T2)', short: 'SPEAKER', at: [25.8, 21.74], size: [8, 8], h: 3, rot: 45, side: 'bottom' },
  { id: 'T2', kind: back('sot23'), name: 'BSS816NW MOSFET that drives the speaker', short: 'T2', at: [22.59, 25.12], size: [2, 1.25], h: .9, side: 'bottom' },
  { id: 'D5', kind: back('sod'), name: 'BAS16 flyback diode across the speaker coil', short: 'D5', at: [20.21, 27.79], size: [1, .6], h: .4, side: 'bottom' },
  { id: 'U4', kind: back('can'), name: 'MEMS microphone (sound comes in through a hole in the PCB)', short: 'MIC', at: [33.38, 31.26], size: [3.79, 3], h: 1.1, rot: 45, side: 'bottom' },
  { id: 'D70', kind: back('led'), name: 'Red microphone LED (lit while the microphone is on)', short: 'MIC LED', at: [35.72, 33.63], size: [1.2, .8], h: .6, rot: 45, side: 'bottom', led: { color: RED, net: 'RUN_MIC' } },
  { id: 'ANT', kind: back('antenna'), name: 'Printed 2.4 GHz antenna (Bluetooth and radio)', short: 'ANTENNA', at: [47.6, 36.6], size: [8, 5.6], rot: 90, side: 'bottom', fixed: true },
  group('RF', 'RF matching parts for the antenna (L3, L7, C11)', 'RF MATCH', [[43.91, 29.49, 'c'], [44.84, 30.34, 'c']]),
  group('RLED', '220 Ω resistors for the power and USB LEDs (R38, R39)', 'R38 R39', [[34.3, 38.03, 'r'], [18.65, 34.07, 'r']]),
  group('TVS', 'ESD diodes on the edge rings (D71-D74)', 'ESD', [[36.94, 12.08, 'd'], [9.17, 32.63, 'd'], [4.75, 13.23, 'd']]),
  group('TR', 'Digital transistors for power-path sensing and interrupts (T1, T3, T4, T5, T7)', 'T1-T7', [[3.11, 21.76, 'd'], [2.56, 23.93, 'd'], [2.87, 19.86, 'd'], [42.11, 15.4, 'd'], [38.33, 10.73, 'd']]),
];

const def = {
  id: 'microbit-v2', fig: '09', name: 'BBC micro:bit V2', sub: 'nRF52833 at 64 MHz, 5 x 5 LEDs, two buttons, a touch logo, motion sensor, speaker and microphone, 3.3 V logic',
  logic: 3.3, pal: 'blush', height: 10,
  pcb: { w: 51.6, h: 42, thick: 1.6, r: 3, color: '#232326', silk: '#f4f6ef', standoff: 6, standoffs: false },
  mat: { front: 9, back: 22, left: 9, right: 9 },
  holes: [],
  silk: [[5.86, 25.6, 'A', 2.2], [45.74, 25.6, 'B', 2.2]],
  traces: [[[5.86, 17.4], [8.66, 9.6], [8.66, 5.4]], [[45.74, 17.4], [24, 10.4], [21.36, 5.4]], [[17.8, 28.6], [12.4, 31.5], [11.89, 34]]],
  parts,
  power: {
    sources: {
      usb: { label: 'USB cable', part: 'J3', plug: 'usb-micro', v: 5, ilim: .5 },
      batt: { label: 'AAA battery pack', part: 'J2', v: 3.2, range: [2, 3.6], max: 5.5 },
      ring3v: { label: 'Supply on 3V ring', pin: '3V', v: 3, range: [1.8, 3.6], max: 3.6 },
      // a wiring mistake as a supply: USB power plus a 5 V signal straight into pin 0
      pin5v: { label: 'USB + 5 V on pin 0', part: 'J3', plug: 'usb-micro', v: 5, range: [0, 3.3], scenario: true },
    },
    default: 'usb',
    rails: {
      VBUS: { from: [{ src: 'usb', via: ['J3'] }, { src: 'pin5v', via: ['J3'] }] },
      VCOMBINED: { from: [{ rail: 'VBUS', via: ['D51', 'L5'], drop: .3 }, { src: 'batt', via: ['J2', 'D59'], drop: .15, protect: 'D59' }] },
      // NCP114: 3.3 V, low dropout, its own current limit takes a short on the rail
      '3V': { from: [{ rail: 'VCOMBINED', via: ['U3', 'D1'], reg: 3.3, dropout: .05, ilim: .3 }, { src: 'ring3v' },
        // 5 V on pin 0: the pin's protection diode conducts into the 3.3 V rail and drags it up
        { src: 'pin5v', via: ['U2'], drop: .6 }], max: 3.6, victim: 'U6' },
    },
    mcu: { part: 'U2', rail: '3V', min: 1.7, needs: ['U2', 'X1'] },
    upload: { source: 'usb', needs: ['J3', 'D62', 'U5', 'U2'], tool: 'daplink' },
  },
  mode: 'heart',
  modes,
  faults: [['short:3V:GND', 'Short from the 3V ring to GND'], 'short:VBUS:GND', ['cold:RING1.1', 'Loose crocodile clip on ring 1'], 'missing:X1', 'missing:U3'],
  xr: {
    flow: [
      ['VBUS', [[25.93, 39.6], [18.5, 40.6], [11.79, 41.12]]],
      ['VCOMBINED', [[11.79, 41.12], [11.89, 35.43]]],
      ['3V', [[11.89, 35.43], [24, 30], [39.59, 25.15], [37.23, 6.86]]],
      ['P1', [[39.59, 25.15], [26, 14], [14.37, 6.86]]],
      ['P2', [[39.59, 25.15], [30, 12], [25.8, 6.86]]],
      ['RUN_MIC', [[39.59, 25.15], [35.72, 33.63]]],
    ],
    notes: [['U2', 'SILICON DIE + RADIO'], ['U5', 'USB INTERFACE CHIP'], ['U6', 'MEMS ACCELEROMETER'], ['U4', 'MEMS MICROPHONE'], ['SP1', 'COIL AND MAGNET'], ['LEDS', '25 LED DIES']],
  },
  tags: [['LEDS', 40, -34], ['SW2', -40, -20], ['SW3', 40, 22], ['LOGO', -36, 28], ['RING3V', 36, 26], ['RING0', -38, 16]],
  circuit: 'blink',
  circuits,
  levels: { vmax: 3.6, tolerant: [] },
};

B.board(def);
})();
