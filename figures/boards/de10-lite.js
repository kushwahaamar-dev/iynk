// @cf use engine/bench.list
// @cf title Terasic DE10-Lite
/* Terasic DE10-Lite (P0466), an Intel MAX 10 10M50DAF484C7G teaching board, 97.5 x 80 mm. Terasic publishes no CAD
   file, so every position is from docs/facts/de10-lite.md section 2: measured on the manual's top-view photo (about
   +-1.5 mm, worse for tall parts, which the slightly oblique photo shifts toward the top edge). Parts the fact sheet
   could not place (U2, U3, Y1, the regulators, the op-amps, the diodes) are drawn where it says they are, near what
   they serve, and marked "not measured". Origin bottom-left, the 7-segment and switch edge at y = 0.
   How it works: USB (J3, through Schottky D6) or 5 V on the 2-pin header JP6 (through Schottky D7, which blocks a
   reversed supply) reaches VCC5 through an over-voltage cut-off (Q2 AO3415 with a 5.1 V zener) that opens above about
   5.5 V. Two LTC3612 bucks make 3.3 V (U7) and, once 3.3 V is good, the 1.2 V core (U6); two LTC3025 LDOs make 2.5 V
   and 1.8 V. POWER GOOD (D4) lights with the 1.2 V rail. The MAX 10 loads its design from its own on-chip flash, so
   there is no configuration chip; CONF (D2) lights when it has loaded. A CDCE937 (U3) on a 24 MHz crystal makes the
   two 50 MHz user clocks. The USB-Blaster (FT245BL U2 + MAX II CPLD U10) programs it over JTAG; LOAD (D1) lights while
   the Blaster works. The student's I/O: 10 switches (up = 1), 10 red LEDs (1 = on), two debounced keys (pressed = 0)
   and six separate common-anode 7-segment displays HEX5..HEX0 (a segment lights when its bit is 0, bit 7 = DP).
   A design run in the Board Lab reaches this drawing as nets: LEDR0..LEDR9, SW0..SW9, KEY0/KEY1, D0..D13/SDA/SCL on
   the Arduino header and one net per segment, DIG<d>_<A..G|DP> (DIG0 = HEX0, rightmost). */
(() => {
const B = SL.bench;
const RED = '#ff3b2f';
const clamp01 = v => Math.max(0, Math.min(1, +v || 0));
const opensToward = (ctx, a) => vis(norm(sub(ctx.W(a, 0, 0), ctx.W(0, 0, 0))));
const SEGS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const GLYPH = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg', 'abcefg', 'cdefg', 'adef', 'bcdeg', 'adefg', 'aefg'];
const digitNets = (d, v, dp = 0) => Object.assign(Object.fromEntries(SEGS.map(s => [`DIG${d}_${s}`, v != null && GLYPH[v].includes(s.toLowerCase()) ? 1 : 0])), { [`DIG${d}_DP`]: dp });

const N10 = [...Array(10).keys()];
const SW_PIN = ['C10', 'C11', 'D12', 'C12', 'A12', 'B12', 'A13', 'A14', 'B14', 'F15'];
const LD_PIN = ['A8', 'A9', 'A10', 'B10', 'D13', 'C13', 'E14', 'D14', 'A11', 'B11'];
const colX = n => 93.3 - n * (43.4 / 9);     // SW0 and LEDR0 at the right, SW9 and LEDR9 at the left
const KEYS = [['KEY0', 'B8', 29.6], ['KEY1', 'A7', 20.8]];
const INPUTS = [...N10.map(n => 'SW' + n), 'KEY0', 'KEY1'];
// the keys read 0 while pressed (pulled up, buffered by a Schmitt trigger); switches read 1 when up
const ACTIVE_LOW = { KEY0: true, KEY1: true };

/* ---------- the parts the library lacks ---------- */

// Two 7-segment digits in one grey block (the photo shows three such blocks for HEX5..HEX0); `digits` lists them
// left to right. Each segment lights from its net DIG<d>_<seg>, 0..1.
const SEG_PATH = { a: [[-2.2, 4.9], [2.2, 4.9]], b: [[2.75, 4.5], [2.75, .45]], c: [[2.75, -.45], [2.75, -4.5]], d: [[-2.2, -4.9], [2.2, -4.9]],
  e: [[-2.75, -.45], [-2.75, -4.5]], f: [[-2.75, 4.5], [-2.75, .45]], g: [[-2.2, 0], [2.2, 0]] };
const segQuad = ([[a0, b0], [a1, b1]], cx, r = .45) => a0 === a1
  ? [[cx + a0 - r, b0], [cx + a0 + r, b0], [cx + a1 + r, b1], [cx + a1 - r, b1]]
  : [[cx + a0, b0 - r], [cx + a1, b1 - r], [cx + a1, b1 + r], [cx + a0, b0 + r]];
B.kind('de10-hex', { group: 'tall', size: () => [16.07, 15], h: 7,
  draw(ctx){
    const p = ctx.p, [l, w] = p.size, h = p.h, pins = (ctx.o.o || { pins: {} }).pins || {}, pitch = l / p.digits.length;
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h - .2, matOf('#d9d6cf'), toneI, .7) + ctx.slab(-l / 2 + .4, -w / 2 + .4, l / 2 - .4, w / 2 - .4, h - .2, h, matOf('#8f8b84'), toneI, .5);
    let glow = '';
    p.digits.forEach((d, i) => {
      const cx = (i - (p.digits.length - 1) / 2) * pitch, lit = k => Math.pow(clamp01((+pins[`DIG${d}_${k}`] || 0) / .25), .6);
      for (const [k, seg] of Object.entries(SEG_PATH)){
        const v = lit(k.toUpperCase()), [[a0, b0], [a1, b1]] = seg;
        s += ctx.poly(segQuad(seg, cx), h + .02, v > .05 ? mix('#c9b3ab', RED, v) : '#b9b5ad', 0);
        if (v > .05) glow += ctx.glow(cx + (a0 + a1) / 2, (b0 + b1) / 2, h, 2.8, RED, .22 * v);
      }
      const dp = lit('DP');
      s += ctx.disc(cx + 3.5, -4.9, h + .02, .5, dp > .05 ? mix('#c9b3ab', RED, dp) : '#b9b5ad', 0);
      if (dp > .05) glow += ctx.glow(cx + 3.5, -4.9, h, 1.6, RED, .25 * dp);
    });
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), s + glow);
  },
  xr(ctx){ const p = ctx.p, [l] = p.size, h = p.h, pitch = l / p.digits.length; let s = '';
    p.digits.forEach((_, i) => { for (const [[a0, b0], [a1, b1]] of Object.values(SEG_PATH)){ const a = (i - (p.digits.length - 1) / 2) * pitch + (a0 + a1) / 2, b = (b0 + b1) / 2;
      s += ctx.slab(a - .25, b - .25, a + .25, b + .25, h * .3, h * .38, { l: '#8c95b8', m: '#6b7397', d: '#3f4565' }, toneI, .2); } });
    ctx.put(ctx.B(-l / 2, -7.5, h + .01, l / 2, 7.5, h + .02), `<g opacity="${f(ctx.k)}">${s}</g>`); },
  xrLabel: () => 'ONE LED PER SEGMENT',
});

// A slide switch: black body on a light frame, a black lever that slides along y, up (away from the edge) = 1.
B.kind('de10-slide', { group: 'low', size: () => [4, 9], h: 5,
  draw(ctx){
    const p = ctx.p, [l, w] = p.size, y = ctx.st.ctl[p.id] ? 1.4 : -1.4;
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, .6, matOf('#d8d4ca'), toneI, .5) + ctx.slab(-l / 2 + .3, -w / 2 + .5, l / 2 - .3, w / 2 - .5, .6, 3.4, B.M.blackPl, toneI, .7);
    s += ctx.slab(-.9, -3, .9, 3, 3.0, 3.41, matOf('#24221f'), toneI, .4) + ctx.slab(-.8, y - 1.3, .8, y + 1.3, 3.4, p.h, B.M.black, toneI, .6);
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, p.h), s);
  },
});

// The 2 x 20 GPIO box header JP1: a black shroud with a key slot round two rows of square pins.
B.kind('de10-box', { group: 'tall', size: () => [59, 8.85], h: 9, pins: p => B.rowPins(p),
  draw(ctx){
    const p = ctx.p, [l, w] = p.size, h = p.h, t = 1.1;
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, 1.2, B.M.blackPl, toneI, .6);
    B.rowPins(p).forEach(([x, y]) => { const [a, b] = B.localOf(p, x, y); s += ctx.slab(a - .32, b - .32, a + .32, b + .32, 1.2, h - 1, B.M.gold, toneI, .3); });
    s += ctx.slab(-l / 2, w / 2 - t, l / 2, w / 2, 0, h, B.M.blackPl, toneI, .7) + ctx.slab(-l / 2, -w / 2, -2.25, -w / 2 + t, 0, h, B.M.blackPl, toneI, .7)
      + ctx.slab(2.25, -w / 2, l / 2, -w / 2 + t, 0, h, B.M.blackPl, toneI, .7)
      + ctx.slab(-l / 2, -w / 2, -l / 2 + t, w / 2, 0, h, B.M.blackPl, toneI, .7) + ctx.slab(l / 2 - t, -w / 2, l / 2, w / 2, 0, h, B.M.blackPl, toneI, .7);
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), s);
  },
});

// The VGA socket (DB15 HD, right angle), its opening at the part's -x end: body from 13 mm inside to the edge (local
// -3), the nickel flange, then the D shroud and the jack posts 7 mm past the edge.
B.kind('de10-vga', { group: 'tall', size: () => [23, 31], h: 12.5,
  draw(ctx){
    const p = ctx.p, h = p.h, e = -3, tip = -10, zc = 6.2;
    let s = ctx.slab(e + .5, -12, 13, 12, 0, h - .6, matOf('#465068'), toneI, .8) + ctx.slab(e, -15.5, e + .5, 15.5, .4, h, B.M.steel, toneI, .7)
      + ctx.slab(tip, -8.4, e, 8.4, zc - 4.1, zc + 4.1, B.M.steel, toneI, .7);
    for (const b of [-12.5, 12.5]) s += ctx.rod([e - 4.5, b, zc], [e, b, zc], 1.1, B.M.steel, toneI, .5);
    if (opensToward(ctx, -1)) s += fill(pd([[tip - .02, -7.2, zc - 3.2], [tip - .02, 7.2, zc - 3.2], [tip - .02, 6.2, zc + 3.2], [tip - .02, -6.2, zc + 3.2]].map(q => ctx.W(...q))), '#2b3346');
    ctx.put(ctx.B(tip, -15.5, 0, 13, 15.5, h), s);
  },
});

/* ---------- what the switches and keys say ---------- */

const noise = t => { const k = Math.floor(t * 6), x = Math.sin(k * 12.9898 + 7.3) * 43758.5453; return x - Math.floor(x) < .5 ? 1 : 0; };
// the level the FPGA pin sees: a switch up or a key released reads 1; a cold switch joint floats
const level = (st, id) => st.faults.includes('cold:' + id) ? noise(st.t) : (st.ctl[id] ? 1 : 0) ^ (ACTIVE_LOW[id] ? 1 : 0);
const pressed = (st, id) => level(st, id) === (ACTIVE_LOW[id] ? 0 : 1);
// While a design runs in the Board Lab the host sends the level of every switch and key the design reads; a level
// that changed moves the lever (or holds the key), so the drawing and the run agree.
const sent = {};
const syncFromHost = st => {
  if (!st.ext) return;
  for (const id of INPUTS){
    const v = st.pins[id];
    if (v === undefined || v === sent[id]) continue;
    sent[id] = v;
    if (!st.faults.includes('cold:' + id)) st.ctl[id] = ((v > .5 ? 1 : 0) ^ (ACTIVE_LOW[id] ? 1 : 0)) ? 1 : 0;
  }
};

/* ---------- the built-in designs ---------- */

// In flash from the factory (Terasic's "Default" design): the displays show a sequence of characters and the red LEDs
// blink; KEY0 lights every LED and every segment; with SW0 up the LEDs become a spirit level from the accelerometer
// (flat on the bench: the middle two). Terasic does not list the characters; here the hex digits walk across.
const allSegs = () => Object.assign({}, ...[0, 1, 2, 3, 4, 5].map(d => digitNets(d, 8, 1)));
const demo = (st, t) => {
  if (pressed(st, 'KEY0')) return Object.assign(Object.fromEntries(N10.map(i => ['LEDR' + i, 1])), allSegs());
  const k = Math.floor(t), out = {};
  for (let d = 0; d < 6; d++) Object.assign(out, digitNets(d, (k + 5 - d) % 16));
  const blink = k % 2, level9 = level(st, 'SW0');
  for (const i of N10) out['LEDR' + i] = level9 ? (i === 4 || i === 5 ? 1 : 0) : blink;
  return out;
};
const switches = st => N10.reduce((v, i) => v | (level(st, 'SW' + i) << i), 0);

/* ---------- copper for the see-through flow ---------- */
const USB_RUN = [[11.3, 57.0], [13.0, 62.0], [13.0, 65.0], [14.5, 67.0]];
const V5_RUN = [[14.5, 67.0], [14.5, 48.0], [6.5, 46.0], [6.5, 31.0], [21.0, 30.5], [29.0, 30.5]];
const V3_RUN = [[29.0, 26.0], [33.0, 31.0], [39.0, 33.0], [44.0, 36.0]];
const LED0_RUN = [[60.0, 36.0], [72.0, 31.0], [88.0, 20.0], [colX(0), 16.3]];
const SW0_RUN = [[colX(0), 11.1], [96.0, 13.0], [96.0, 24.0], [70.0, 34.0], [60.0, 38.0]];
const KEY0_RUN = [[91.8, 26.6], [85.5, 33.5], [70.0, 40.0], [62.0, 42.0]];
const HEX0_RUN = [[44.0, 33.0], [43.0, 22.0], [40.2, 15.0]];

const ARD_X0 = 23.33, ARD_A0 = 32.6;       // the Uno R3 hole grid fitted to the measured header ends
const ard = (n, x0, y) => [x0 + (n - 1) * 1.27, y];

B.board({
  id: 'de10-lite', fig: '12', name: 'Terasic DE10-Lite', sub: 'Intel MAX 10 10M50 FPGA, 50 MHz clocks, 3.3 V I/O, USB-Blaster built in',
  pcb: { w: 97.5, h: 80, thick: 1.6, r: 1, color: '#1f4fa8', silk: '#f4f6ef', standoff: 4 },
  mat: { front: 10, back: 12, left: 16, right: 16 },
  height: 14, pal: 'cobalt', logic: 3.3,
  holes: [[2.8, 77.8, 3.2], [94.3, 77.8, 3.2], [13.4, 18.6, 3.2], [82.2, 19.7, 3.2]],
  silk: [
    ...N10.map(n => [colX(n), 17.7, 'LEDR' + n, .75]), ...N10.map(n => [colX(n), 12.4, 'SW' + n, .75]),
    ...[5, 4, 3, 2, 1, 0].map((d, i) => [4.02 + i * 8.03, 16.2, 'HEX' + d, .75]),
    [86.6, 26.1, 'KEY0', .8], [86.6, 24.3, 'KEY1', .8],
    [35.0, 39.0, 'DE10-Lite', 3.2, 90], [44.0, 26.0, 'terasIC', 1.8], [58.0, 59.0, 'UNIVERSITY PROGRAM', .8],
    [11.9, 76.4, 'LOAD', .7], [17.8, 76.4, 'CONF', .7], [2.8, 46.9, '5V', .7], [7.2, 41.3, 'POWER GOOD', .6],
    [80.8, 77.6, 'JP1', .8], [80.8, 75.3, 'GPIO', .8], [6.4, 72.8, 'J1', .7], [2.3, 26.0, 'DC 5V', .7],
    [ARD_X0, 70.6, 'SCL', .6], [ARD_X0 + 2.54, 70.6, 'SDA', .6], [ARD_X0 + 5.08, 70.6, 'AREF', .55], [ARD_X0 + 7.62, 70.6, 'GND', .55],
    [ARD_X0 + 22.86, 70.6, '8', .6], [ARD_X0 + 29.46, 70.6, '7', .6], [ARD_X0 + 47.24, 70.6, '0', .6],
    [ARD_A0 + 2.54, 21.5, 'IOREF', .5], [ARD_A0 + 10.16, 21.5, '5V', .55], [ARD_A0 + 25.4, 21.5, 'A0', .6], [ARD_A0 + 38.1, 21.5, 'A5', .6],
  ],
  traces: [USB_RUN, V5_RUN, V3_RUN, LED0_RUN, SW0_RUN, KEY0_RUN, HEX0_RUN],
  parts: [
    // the FPGA and its memory, clock and programmer
    { id: 'U5', kind: 'bga', name: 'MAX 10 FPGA 10M50DAF484C7G (your design becomes its wiring; it keeps it in its own flash)', short: 'FPGA', at: [50.8, 43.2], size: [23, 23], h: 2,
      label: 'MAX 10|10M50DAF484C7G' },
    { id: 'U4', kind: 'soic', name: '64 MB SDRAM (32M x 16)', short: 'SDRAM', at: [18.5, 38.4], size: [22.2, 10.2], n: 27, pitch: .8, h: 1.2, label: 'ISSI|IS42S16320D' },
    { id: 'U10', kind: 'qfp', name: 'MAX II CPLD EPM240 of the USB-Blaster (shifts JTAG into the FPGA)', short: 'BLASTER CPLD', at: [23.6, 58.1], size: [14, 14], n: 25, h: 1.4, label: 'MAX II|EPM240T100' },
    // U2's place was not measured: drawn beside the CPLD it feeds
    { id: 'U2', kind: 'qfp', name: 'FT245BL USB chip of the USB-Blaster', short: 'USB CHIP', at: [36.5, 60.0], size: [7, 7], n: 8, h: 1.4, label: 'FTDI|FT245BL' },
    { id: 'U11', kind: 'sot23', name: 'TPD2EUSB30 ESD protection on the USB lines', short: 'ESD', at: [13.2, 53.0], size: [1.6, 1.2], h: .5 },
    // the clock generator and its crystal: not measured, drawn beside the FPGA
    { id: 'U3', kind: 'soic', name: 'CDCE937 clock generator U3 (makes the two 50 MHz clocks and the 10 MHz ADC clock)', short: 'CLOCKS', at: [69.0, 47.0], rot: 90, size: [6.5, 4.4], n: 10, pitch: .65, h: 1, label: 'CDCE937' },
    { id: 'Y1', kind: 'xtal-smd', name: '24.00 MHz crystal Y1 for the clock generator', short: '24 MHz', at: [69.0, 39.5], size: [3.2, 2.5], h: .8, label: '24.000' },
    { id: 'U13', kind: 'qfn', name: 'ADXL345 3-axis accelerometer', short: 'ACCEL', at: [44.0, 61.6], size: [3, 5], n: 3, h: 1, label: '345B' },
    // the ADC front end and its reference (between the FPGA and the analog header: not measured)
    { id: 'U8', kind: 'soic', name: 'MCP6244 quad op-amp U8 (halves A0-A5 for the ADC)', short: 'OP-AMP', at: [60.5, 26.0], size: [8.65, 3.9], n: 7, pitch: 1.27, h: 1.5, label: 'MCP6244' },
    { id: 'U9', kind: 'soic', name: 'MCP6244 quad op-amp U9', short: 'OP-AMP', at: [70.5, 26.0], size: [8.65, 3.9], n: 7, pitch: 1.27, h: 1.5, label: 'MCP6244' },
    { id: 'U12', kind: 'sot23', name: 'REF3125 2.5 V reference for the ADC', short: 'VREF', at: [66.0, 31.0] },
    // the student's I/O
    { id: 'HEX54', kind: 'de10-hex', name: '7-segment displays HEX5 and HEX4 (common anode, a segment lights on 0)', short: 'HEX5-4', at: [8.03, 7.5], digits: [5, 4] },
    { id: 'HEX32', kind: 'de10-hex', name: '7-segment displays HEX3 and HEX2', short: 'HEX3-2', at: [24.1, 7.5], digits: [3, 2] },
    { id: 'HEX10', kind: 'de10-hex', name: '7-segment displays HEX1 and HEX0', short: 'HEX1-0', at: [40.17, 7.5], digits: [1, 0] },
    ...N10.map(n => ({ id: 'LEDR' + n, kind: 'led', name: `Red LED LEDR${n} (LEDR[${n}], pin ${LD_PIN[n]}; 1 = on)`, short: 'LEDR' + n, at: [colX(n), 15.3], h: .6,
      led: { color: '#ff3b2f', net: 'LEDR' + n, via: ['U5'] } })),
    ...N10.map(n => ({ id: 'SW' + n, kind: 'de10-slide', name: `Slide switch SW${n} (SW[${n}], pin ${SW_PIN[n]}; up = 1)`, short: 'SW' + n, at: [colX(n), 6.6],
      control: { type: 'slide', action: 'input', net: 'SW' + n, positions: ['DOWN', 'UP'] } })),
    ...KEYS.map(([id, pin, y]) => ({ id, kind: 'tact', name: `Push button ${id} (KEY[${id[3]}], pin ${pin}; reads 0 while pressed)`, short: id, at: [91.8, y],
      control: { type: 'button', action: 'input', net: id, active: 0 } })),
    { id: 'U14', kind: 'soic', name: 'SN74AUC17 Schmitt-trigger buffer (debounces the keys)', short: 'DEBOUNCE', at: [85.5, 33.5], size: [2, 1.25], n: 3, pitch: .5, h: .9 },
    // power: the inputs, their diodes and the over-voltage cut-off (D6, D7, Q2 not measured)
    { id: 'J3', kind: 'usb-b', name: 'USB-B socket J3 (power and the USB-Blaster)', short: 'USB', at: [3.15, 57.0], plug: true },
    { id: 'D6', kind: 'sod', name: 'Schottky diode D6 from USB 5 V', short: 'D6', at: [13.0, 65.0], size: [2.7, 1.6], h: 1.1, label: 'PMEG' },
    { id: 'JP6', kind: 'male', name: '5 V input header JP6 ("DC 5V"; a series diode blocks a reversed supply)', short: 'DC 5V', at: [2.3, 22.6], rot: 90, mirror: true,
      pins: ['VEXT', 'GND'], labels: ['5V', 'GND'], color: '#efebe2' },
    { id: 'D7', kind: 'sod', name: 'Schottky diode D7 from the 5 V header (blocks a reversed supply)', short: 'D7', at: [6.5, 22.6], rot: 90, size: [2.7, 1.6], h: 1.1, label: 'PMEG' },
    { id: 'Q2', kind: 'sot23', name: 'AO3415 MOSFET Q2: the over-voltage cut-off (opens above about 5.5 V)', short: 'OVP', at: [6.5, 28.5], label: 'AO3415' },
    { id: 'U7', kind: 'qfn', name: 'LTC3612 buck regulator U7: 3.3 V for the I/O, memory, LEDs and headers', short: '3V3', at: [29.0, 28.5], size: [3, 4], n: 5, h: .75, label: '3612' },
    { id: 'L6', kind: 'inductor', name: '470 nH inductor L6 (3.3 V)', short: 'L6', at: [29.0, 23.9], size: [4, 4], h: 2, label: 'R47' },
    { id: 'U6', kind: 'qfn', name: 'LTC3612 buck regulator U6: 1.2 V for the FPGA core', short: '1V2', at: [21.0, 28.5], size: [3, 4], n: 5, h: .75, label: '3612' },
    { id: 'L5', kind: 'inductor', name: '470 nH inductor L5 (1.2 V)', short: 'L5', at: [21.0, 23.9], size: [4, 4], h: 2, label: 'R47' },
    { id: 'C18', kind: 'tant', name: '330 µF polymer capacitor C18 on 1.2 V', short: 'C18', at: [11.0, 28.5], size: [7.3, 4.3], h: 1.9, label: '330' },
    { id: 'C145', kind: 'tant', name: '100 µF polymer capacitor C145 on 3.3 V', short: 'C145', at: [11.0, 47.0], size: [7.3, 4.3], h: 1.9, label: '100' },
    { id: 'REG1', kind: 'qfn', name: 'LTC3025 regulator REG1: 2.5 V for the FPGA\'s analog and JTAG circuits', short: '2V5', at: [34.5, 25.0], size: [2, 2], n: 3, h: .75 },
    { id: 'REG2', kind: 'qfn', name: 'LTC3025 regulator REG2: 1.8 V', short: '1V8', at: [38.0, 25.0], size: [2, 2], n: 3, h: .75 },
    { id: 'D4', kind: 'led', name: 'POWER GOOD LED D4 (every rail is up)', short: 'POWER', at: [4.0, 42.7], h: .6, led: { color: '#4cc65a', rail: '3V3', via: ['U6', 'L5'] } },
    { id: 'TP1', kind: 'hole', name: 'Test point TP1', short: 'TP1', at: [74.8, 20.6], d: 1, label: 'TP1', fixed: true },
    { id: 'TP2', kind: 'hole', name: 'Test point TP2', short: 'TP2', at: [78.0, 20.6], d: 1, label: 'TP2', fixed: true },
    // programming
    { id: 'D1', kind: 'led', name: 'LOAD LED D1 (the USB-Blaster is working)', short: 'LOAD', at: [11.9, 74.5], h: .6, led: { color: '#4cc65a', rail: 'USB5', via: ['U2', 'U10'] } },
    // no design drives this net, so the inverted LED is lit for as long as the FPGA holds a design and runs it
    { id: 'D2', kind: 'led', name: 'CONF LED D2 (the FPGA has loaded its design)', short: 'CONF', at: [17.8, 74.5], h: .6, led: { color: '#4cc65a', net: 'NOT_CONFIGURED', invert: true, via: ['U5'] } },
    { id: 'J1', kind: 'pads', name: 'JTAG header J1 (2.5 V; not fitted, the USB-Blaster does the job)', short: 'J1', at: [6.4, 69.9], rows: 2, fixed: true,
      pins: ['TCK', 'GND', 'TDO', '2V5', 'TMS', '', '', '', 'TDI', 'GND'] },
    // connectors
    { id: 'VGA', kind: 'de10-vga', name: 'VGA socket (4 bits per colour)', short: 'VGA', at: [94.5, 60.7], rot: 180 },
    // JP1's pin 1 end is not known: pin 1 is drawn at the left, odd pins in the row nearer the edge
    { id: 'JP1', kind: 'de10-box', name: '2 x 20 GPIO header JP1 (36 FPGA pins, 5 V, 3.3 V, GND)', short: 'GPIO', at: [47.05, 76.3], rows: 2,
      pins: [...Array(40)].map((_, i) => { const n = i + 1; return n === 11 ? '5V' : n === 29 ? '3V3' : n === 12 || n === 30 ? 'GND' : 'GPIO' + (n < 11 ? n - 1 : n < 29 ? n - 3 : n - 5); }) },
    { id: 'JP2', kind: 'female', name: 'Arduino header: SCL, SDA, AREF, GND, D13-D8', short: 'D13-D8', at: ard(10, ARD_X0, 68.2),
      pins: ['SCL', 'SDA', 'AREF', 'GND', 'D13', 'D12', 'D11', 'D10', 'D9', 'D8'], labels: ['SCL', 'SDA', 'AREF', 'GND', '13', '12', '~11', '~10', '~9', '8'] },
    { id: 'JP3', kind: 'female', name: 'Arduino header: D7-D0', short: 'D7-D0', at: ard(8, ARD_X0 + 29.46, 68.2),
      pins: ['D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'D1', 'D0'], labels: ['7', '~6', '~5', '4', '~3', '2', 'TX 1', 'RX 0'] },
    { id: 'JP7', kind: 'female', name: 'Arduino power header (IOREF is 3.3 V)', short: 'POWER', at: ard(8, ARD_A0, 19.1),
      pins: ['', '3V3', 'ARDUINO_RESET_N', '3V3', '5V', 'GND', 'GND', 'VIN'], labels: ['NC', 'IOREF', 'RESET', '3.3V', '5V', 'GND', 'GND', 'VIN'] },
    { id: 'JP8', kind: 'female', name: 'Arduino analog header A0-A5 (0-5 V, halved for the ADC)', short: 'A0-A5', at: ard(6, ARD_A0 + 25.4, 19.1),
      pins: ['A0', 'A1', 'A2', 'A3', 'A4', 'A5'] },
  ],
  power: {
    sources: {
      usb: { label: 'USB cable', part: 'J3', plug: 'usb-b', v: 5.0, ilim: .5 },
      ext: { label: '5 V header JP6', pin: 'VEXT', v: 5, range: [4.75, 5.25] },
    },
    default: 'usb',
    rails: {
      USB5: { from: [{ src: 'usb', via: ['J3', 'D6'], drop: .3 }] },
      // the series Schottky blocks a reversed supply; nothing else on the board sees it
      EXT5: { from: [{ src: 'ext', via: ['JP6', 'D7'], drop: .3, protect: 'D7' }] },
      // the cut-off opens VCC5 when its input passes about 5.5 V
      '5V': { from: [{ rail: 'USB5', via: ['Q2'], offIf: ['USB5', '>', 5.5] }, { rail: 'EXT5', via: ['Q2'], offIf: ['EXT5', '>', 5.5] }] },
      '3V3': { from: [{ rail: '5V', via: ['U7'], reg: 3.3, dropout: .3, ilim: 3 }] },
      '1V2': { from: [{ rail: '5V', via: ['U6'], reg: 1.2, dropout: .3, ilim: 3, offIf: ['3V3', '<', 3.0] }] },
      '2V5': { from: [{ rail: '3V3', via: ['REG1'], reg: 2.5, dropout: .1, ilim: .5 }] },
      '1V8': { from: [{ rail: '3V3', via: ['REG2'], reg: 1.8, dropout: .1, ilim: .5 }] },
    },
    mcu: { part: 'U5', rail: '3V3', min: 3.0, needs: ['U5', 'U3', 'Y1'] },
    upload: { source: 'usb', needs: ['U2', 'U10', 'U5'], tool: 'quartus' },
  },
  mode: 'demo',
  modes: {
    demo: { title: 'Factory demo', bytes: 1048576, out: demo },
    blink: { title: 'Blink LEDR0 from a counter', bytes: 1048576, out: (st, t) => ({ LEDR0: Math.floor(t / 1.342) % 2 ? 0 : 1 }) },
    switches: { title: 'Switches to LEDs', bytes: 1048576, out: st => Object.fromEntries(N10.map(i => ['LEDR' + i, level(st, 'SW' + i)])) },
    hex: { title: 'Switches as a hex number', bytes: 1048576, out: st => { const v = switches(st), out = {};
      for (let d = 0; d < 3; d++) Object.assign(out, digitNets(d, (v >> (4 * d)) & 15));
      return out; } },
  },
  // the engine reports every input control's level as state.inputs; the model only moves levers the host changed
  model: st => { syncFromHost(st); return {}; },
  faults: [
    ['reverse-polarity:ext', '5 V header wired backwards'],
    ['wrong-voltage:ext:12', '12 V on the 5 V header'],
    ['wrong-voltage:ext:3.5', '3.5 V on the 5 V header'],
    ['short:3V3:GND', 'Header 3.3 V pin shorted to GND'],
    ['short:5V:GND', 'Header 5 V pin shorted to GND'],
    ['missing:Y1', 'No 24 MHz crystal: no clocks'],
  ],
  xr: {
    flow: [['USB5', USB_RUN], ['5V', V5_RUN], ['3V3', V3_RUN], ['LEDR0', LED0_RUN], ['SW0', SW0_RUN], ['KEY0', KEY0_RUN], ['DIG0_A', HEX0_RUN]],
    notes: [['U5', 'ONE DIE: LOGIC, RAM, ADC AND FLASH'], ['U4', 'DRAM DIE'], ['U10', 'USB-BLASTER: JTAG'], ['Y1', 'QUARTZ BLANK'], ['U13', 'MEMS PROOF MASS']],
  },
  tags: [['U5', -30, -44], ['HEX10', -40, 30], ['KEY0', 40, -26], ['SW0', 40, 26], ['LEDR0', 44, -10], ['J3', -40, -20], ['VGA', 30, -40], ['JP1', 0, -48], ['JP3', 20, -40]],
  circuit: 'arduino-led',
  circuits: {
    'arduino-led': {
      title: 'An LED on Arduino pin D3', breadboard: 'half',
      parts: [
        { id: 'R1', part: 'resistor', ohms: 220, holes: ['b10', 'b14'] },
        { id: 'LED1', part: 'led', color: 'red', holes: ['c14', 'c15'] },
      ],
      wires: [
        { from: 'D3', to: 'a10', color: 'orange' },
        { from: 'JP2.4', to: 'a15', color: 'black' },
      ],
    },
  },
});
})();
