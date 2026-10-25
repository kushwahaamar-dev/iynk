// @cf title Digilent Basys 3
// @cf use engine/bench.list
/* Digilent Basys 3 (PB200-183, rev D), an AMD Artix-7 XC7A35T-1CPG236C teaching board, 121.92 x 71.12 mm with
   square corners. Positions are from docs/facts/basys3.md section 2: through-hole pad centres from Digilent's DXF,
   SMD centres and heights from Digilent's STEP model, origin bottom-left, the switch and LED edge at y = 0. The fact
   sheet places a few bottom-side parts from the product photo only (marked "estimated" below). The unloaded JTAG (J5)
   and PIC24 ICSP (J3) pad rows sit under the JA and JB socket bodies and are not drawn.
   How it works: micro-USB J4 (or 4.5-5.5 V on the EXT header J6, which has no reverse diode and no fuse) reaches VU
   through the JP2 shunt, and the power switch SW16 enables the regulators: the LTC3633 makes 1.0 V, its power-good
   starts the LTC3621 at 1.8 V, whose power-good starts the LTC3633's 3.3 V; LD20 lights when 3.3 V is good. At
   power-up the FPGA reads its design from the Quad-SPI flash (JP1 on QSPI) and DONE (LD19) lights; PROG clears it
   and it loads again. The student's I/O is wired straight to FPGA pins: 16 switches (up = 1), 16 green LEDs
   (1 = on), five buttons in a plus (pressed = 1) and a 4-digit common-anode display whose cathodes CA-CG/DP and
   anodes AN0-AN3 are all active low, so the digits take turns (multiplexing).
   A design run in the Board Lab reaches this drawing as nets: LD0..LD15, SW0..SW15, BTNU/BTNL/BTNC/BTNR/BTND,
   JA1..JC10 and one net per segment, DIG<d>_<A..G|DP> (digit 0 rightmost, brightness 0..1 averaged over the
   multiplexing). */
(() => {
const B = SL.bench;
const RED = '#ff3b2f';
const clamp01 = v => Math.max(0, Math.min(1, +v || 0));
const opensToward = (ctx, a) => vis(norm(sub(ctx.W(a, 0, 0), ctx.W(0, 0, 0))));
const SEGS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
// the segments a..g a hex digit lights (the reference manual's active-low table, inverted)
const GLYPH = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg', 'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg', 'abcefg', 'cdefg', 'adef', 'bcdeg', 'adefg', 'aefg'];
const digitNets = (d, v) => Object.fromEntries(SEGS.map(s => [`DIG${d}_${s}`, v != null && GLYPH[v].includes(s.toLowerCase()) ? 1 : 0]));

const SW_PIN = ['V17', 'V16', 'W16', 'W17', 'W15', 'V15', 'W14', 'W13', 'V2', 'T3', 'T2', 'R3', 'W2', 'U1', 'T1', 'R2'];
const LD_PIN = ['U16', 'E19', 'U19', 'V19', 'W18', 'U15', 'U14', 'V14', 'V13', 'V3', 'W3', 'U3', 'P3', 'N3', 'P1', 'L1'];
const swX = n => 11.40 + 6.6 * (15 - n);
const ldX = n => 11.46 + 6.6 * (15 - n);
const N16 = [...Array(16).keys()];
const BUTTONS = [['BTNU', 'btnU', 'T18', 90.0, 37.0], ['BTNL', 'btnL', 'W19', 81.5, 30.0], ['BTNC', 'btnC', 'U18', 90.0, 30.0],
  ['BTNR', 'btnR', 'T17', 98.5, 30.0], ['BTND', 'btnD', 'U17', 90.0, 23.0]];
const INPUTS = [...N16.map(n => 'SW' + n), ...BUTTONS.map(b => b[0])];
const pmodPins = j => [`${j}1`, `${j}2`, `${j}3`, `${j}4`, 'GND', '3V3', `${j}7`, `${j}8`, `${j}9`, `${j}10`, 'GND', '3V3'];
const PMOD_LABELS = ['1', '2', '3', '4', 'GND', '3V3', '7', '8', '9', '10', 'GND', '3V3'];

/* ---------- the parts the library lacks ---------- */

// DISP1: four digits behind one charcoal face on a white body, digit 3 leftmost. Each segment lights from its net
// DIG<d>_<seg>. A multiplexed digit is lit about a quarter of the time and looks fully lit, so a quarter draws at full
// brightness. Q1 and Q2 are two dual PNP transistors, one per digit anode; which digits each drives is not
// published, here Q1 takes the left pair.
const SEG_PATH = { a: [[-1.5, 3.3], [1.5, 3.3]], b: [[1.85, 3.0], [1.85, .3]], c: [[1.85, -.3], [1.85, -3.0]], d: [[-1.5, -3.3], [1.5, -3.3]],
  e: [[-1.85, -.3], [-1.85, -3.0]], f: [[-1.85, 3.0], [-1.85, .3]], g: [[-1.5, 0], [1.5, 0]] };
const segQuad = ([[a0, b0], [a1, b1]], cx, r = .34) => a0 === a1
  ? [[cx + a0 - r, b0], [cx + a0 + r, b0], [cx + a1 + r, b1], [cx + a1 - r, b1]]
  : [[cx + a0, b0 - r], [cx + a1, b1 - r], [cx + a1, b1 + r], [cx + a0, b0 + r]];
B.kind('basys3-seg7', { group: 'tall', size: () => [32.2, 10.2], h: 5.8,
  draw(ctx){
    const p = ctx.p, [l, w] = p.size, h = p.h, pins = (ctx.o.o || { pins: {} }).pins || {};
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h - .3, B.M.white, toneI, .7) + ctx.slab(-l / 2 + .5, -w / 2 + .5, l / 2 - .5, w / 2 - .5, h - .3, h, matOf('#3b3835'), toneI, .5);
    let glow = '';
    for (let i = 0; i < 4; i++){
      const d = 3 - i, cx = (i - 1.5) * (l / 4), on = B.isSet(d >= 2 ? 'Q1' : 'Q2');
      const lit = k => on ? Math.pow(clamp01((+pins[`DIG${d}_${k}`] || 0) / .25), .6) : 0;
      for (const [k, seg] of Object.entries(SEG_PATH)){
        const v = lit(k.toUpperCase()), [[a0, b0], [a1, b1]] = seg;
        s += ctx.poly(segQuad(seg, cx), h + .02, v > .05 ? mix('#6a5650', RED, v) : '#5f5a54', 0);
        if (v > .05) glow += ctx.glow(cx + (a0 + a1) / 2, (b0 + b1) / 2, h, 2.4, RED, .22 * v);
      }
      const dp = lit('DP');
      s += ctx.disc(cx + 2.7, -3.3, h + .02, .38, dp > .05 ? mix('#6a5650', RED, dp) : '#5f5a54', 0);
      if (dp > .05) glow += ctx.glow(cx + 2.7, -3.3, h, 1.4, RED, .25 * dp);
    }
    // the colon in the middle is moulded but not wired: it never lights
    s += ctx.disc(0, 1.2, h + .02, .3, '#5f5a54', 0) + ctx.disc(0, -1.2, h + .02, .3, '#5f5a54', 0);
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), s + glow);
  },
  xr(ctx){ const p = ctx.p, [l] = p.size, h = p.h; let s = '';
    for (let i = 0; i < 4; i++) for (const [[a0, b0], [a1, b1]] of Object.values(SEG_PATH)){ const a = (i - 1.5) * (l / 4) + (a0 + a1) / 2, b = (b0 + b1) / 2;
      s += ctx.slab(a - .2, b - .2, a + .2, b + .2, h * .3, h * .38, { l: '#8c95b8', m: '#6b7397', d: '#3f4565' }, toneI, .2); }
    ctx.put(ctx.B(-l / 2, -5, h + .01, l / 2, 5, h + .02), `<g opacity="${f(ctx.k)}">${s}</g>`); },
  xrLabel: () => 'ONE LED PER SEGMENT',
});

// A slide switch: black body, an amber strip at the LED end, a 3.2 x 5.74 black lever that slides along y, up (toward
// the LEDs) = ON. The lever follows the control; the power switch SW16 has no control and stands at `lever`.
B.kind('basys3-slide', { group: 'low', size: () => [5.7, 11.5], h: 11.5,
  draw(ctx){
    const p = ctx.p, [l, w] = p.size, body = 7.5, on = p.control ? (ctx.st.ctl[p.id] || 0) : (p.lever || 0), y = on ? 1.2 : -1.2;
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, body, B.M.blackPl, toneI, .7) + ctx.slab(-l / 2 + .2, w / 2 - 1.2, l / 2 - .2, w / 2 - .2, body, body + .02, B.M.tan, toneI, .3);
    s += ctx.slab(-1.8, -4.3, 1.8, 4.3, body - .4, body + .01, matOf('#24221f'), toneI, .4) + ctx.slab(-1.6, y - 2.87, 1.6, y + 2.87, body, p.h, B.M.black, toneI, .6);
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, p.h), s);
  },
});

// A 2.54 mm pin header with a shunt over pins `shunt` (1-based pair), or the pair `shuntFor(st)` picks.
B.kind('basys3-jumper', { group: 'low', size: p => [p.pins.length * 2.54, 2.54], h: 8.5, pins: p => B.rowPins(p),
  draw(ctx){
    const p = ctx.p, [l, w] = p.size, pl = 2.5, q = .32, pts = B.rowPins(p);
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, pl, B.M.blackPl, toneI, .6);
    pts.forEach(([x, y]) => { const [a, b] = B.localOf(p, x, y); s += ctx.slab(a - q, b - q, a + q, b + q, pl, p.h - .3, B.M.gold, toneI, .3); });
    const [i0, i1] = ((p.shuntFor && p.shuntFor(ctx.st)) || p.shunt || [1, 2]).map(n => B.localOf(p, ...pts[n - 1])[0]);
    s += ctx.slab(Math.min(i0, i1) - 1.25, -1.2, Math.max(i0, i1) + 1.25, 1.2, pl + .8, p.h, matOf(p.shuntColor || '#2f2c29'), toneI, .7);
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, p.h), s);
  },
});

// A Pmod port: a 2 x 6 right-angle female socket, its openings at the part's -x end over the board edge. Its pins are
// the holes: pins 1-6 in the inner column (local x 6.13, the upper row of openings), 7-12 in the outer one (3.63).
const pmodHoles = p => { const r = (p.rot || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  return p.pins.map((_, i) => { const a = i < 6 ? 6.13 : 3.63, b = -6.35 + 2.54 * (i % 6); return [p.at[0] + a * c - b * s, p.at[1] + a * s + b * c]; }); };
B.kind('basys3-pmod', { group: 'tall', size: () => [12.95, 15.75], h: 5.07, pins: pmodHoles,
  draw(ctx){
    const p = ctx.p, [l, w] = p.size, h = p.h, e = -l / 2 - .02;
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h, B.M.blackPl, toneI, .7);
    if (opensToward(ctx, -1)) for (let k = 0; k < 6; k++) for (const z of [1.3, 3.84]){ const b = -6.35 + 2.54 * k;
      s += fill(pd([[e, b - .55, z - .55], [e, b + .55, z - .55], [e, b + .55, z + .55], [e, b - .55, z + .55]].map(q => ctx.W(...q))), '#151311'); }
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), s);
  },
});

// The VGA socket J1 (DB15 HD, right angle). Local x runs out of the board: the plastic body from 13 mm inside to
// 4.7 mm past the edge (local -2.32 is the edge), the nickel flange, then the D shroud and the jack posts to 10.7 mm out.
B.kind('basys3-vga', { group: 'tall', size: () => [26.05, 35.1], h: 12.6,
  draw(ctx){
    const p = ctx.p, h = p.h, fl = -7.0, tip = -13.02, zc = 6.3;
    let s = ctx.slab(fl + .5, -12, 13.03, 12, 0, h - .6, matOf('#465068'), toneI, .8) + ctx.slab(fl, -15.4, fl + .5, 15.4, .4, h, B.M.steel, toneI, .7)
      + ctx.slab(tip, -8.4, fl, 8.4, zc - 4.1, zc + 4.1, B.M.steel, toneI, .7);
    for (const b of [-12.5, 12.5]) s += ctx.rod([fl - 4.5, b, zc], [fl, b, zc], 1.1, B.M.steel, toneI, .5);
    if (opensToward(ctx, -1)) s += fill(pd([[tip - .02, -7.2, zc - 3.2], [tip - .02, 7.2, zc - 3.2], [tip - .02, 6.2, zc + 3.2], [tip - .02, -6.2, zc + 3.2]].map(q => ctx.W(...q))), '#2b3346');
    ctx.put(ctx.B(tip, -15.4, 0, 13.03, 15.4, h), s);
  },
});

// The USB-A host socket J2: one port (the library's usb-a is a stacked pair); the opening at the part's -x end.
B.kind('basys3-usba', { group: 'tall', size: () => [14.2, 13.2], h: 7.6,
  draw(ctx){
    const p = ctx.p, [l, w] = p.size, h = p.h, e = -l / 2 - .02;
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h, B.M.steel, toneI, .8);
    if (opensToward(ctx, -1)) s += fill(pd([[e, -5.9, 1.2], [e, 5.9, 1.2], [e, 5.9, h - 1.2], [e, -5.9, h - 1.2]].map(q => ctx.W(...q))), '#2b2825')
      + fill(pd([[e - .01, -4.8, 3.2], [e - .01, 4.8, 3.2], [e - .01, 4.8, 4.6], [e - .01, -4.8, 4.6]].map(q => ctx.W(...q))), '#4a4642');
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), s);
  },
});

// The ring of decoupling capacitors round the FPGA, one selectable part (the library has no scatter kind yet).
B.kind('basys3-caps', { group: 'smd', size: p => p.size, h: .5,
  draw(ctx){
    const p = ctx.p;
    for (const [x, y, r = 0] of p.spots){
      const [a, b] = B.localOf(p, x, y), [u, v] = r ? [.4, .8] : [.8, .4];
      ctx.put(ctx.B(a - u, b - v, 0, a + u, b + v, p.h), ctx.slab(a - u, b - v, a + u, b + v, 0, p.h, B.M.tan, toneI, .3));
    }
  },
});

/* ---------- what the switches and buttons say ---------- */

// A cold joint on a switch leaves its FPGA pin floating (the switch feeds it through 10 K, there is no pull): noise.
const noise = t => { const k = Math.floor(t * 6), x = Math.sin(k * 12.9898 + 4.1) * 43758.5453; return x - Math.floor(x) < .5 ? 1 : 0; };
const level = (st, id) => st.faults.includes('cold:' + id) ? noise(st.t) : (st.ctl[id] ? 1 : 0);
// While a design runs in the Board Lab the host sends the level of every switch and button the design reads (its
// World panel can flip them too); a level that changed moves the lever, so the drawing and the run agree.
const sent = {};
const syncFromHost = st => {
  if (!st.ext) return;
  for (const id of INPUTS){
    const v = st.pins[id];
    if (v === undefined || v === sent[id]) continue;
    sent[id] = v;
    if (!st.faults.includes('cold:' + id)) st.ctl[id] = v > .5 ? 1 : 0;
  }
};

/* ---------- the built-in designs ---------- */

// In flash from the factory: each switch lights the LED above it, the display counts 0-9 on all four digits once a
// second, BTNU, BTNL, BTNR and BTND each blank one digit (Digilent does not say which: here left to right), BTNC
// blanks the display and restarts the count, and the UART prints a line for every press.
let zero = 0;
const gpioDemo = (st, t) => {
  if (zero > t) zero = 0;
  const clear = level(st, 'BTNC');
  if (clear) zero = t;
  const n = Math.floor(t - zero) % 10, blank = { 3: level(st, 'BTNU'), 2: level(st, 'BTNL'), 1: level(st, 'BTNR'), 0: level(st, 'BTND') };
  const out = Object.fromEntries(N16.map(i => ['LD' + i, level(st, 'SW' + i)]));
  for (let d = 0; d < 4; d++) Object.assign(out, digitNets(d, clear || blank[d] ? null : n));
  return out;
};
const anyButton = st => BUTTONS.some(([id]) => level(st, id));
const switches = st => N16.reduce((v, i) => v | (level(st, 'SW' + i) << i), 0);

/* ---------- copper for the see-through flow ---------- */
const VBUS_RUN = [[31.7, 66.4], [31.7, 63.6], [14.6, 63.6], [12.0, 63.96]];
const VU_RUN = [[12.0, 66.5], [16.6, 66.5], [16.6, 44.0], [18.0, 42.5]];
const V3_RUN = [[20.0, 40.5], [21.4, 34.5], [50.0, 35.8], [56.0, 40.0]];
const LD0_RUN = [[66.0, 38.0], [75.0, 33.5], [104.0, 21.0], [ldX(0), 18.7]];
const SW0_RUN = [[swX(0), 14.6], [112.0, 16.0], [104.0, 18.5], [70.0, 34.0], [66.0, 37.5]];
const SEG_RUN = [[56.0, 40.0], [50.0, 33.5], [45.0, 31.5]];

B.board({
  id: 'basys3', fig: '11', name: 'Digilent Basys 3', sub: 'AMD Artix-7 XC7A35T FPGA, 100 MHz clock, 3.3 V I/O, programmed over USB',
  pcb: { w: 121.92, h: 71.12, thick: 1.524, r: 0, color: '#2a62ad', silk: '#f4f6ef', standoff: 3.73 },
  mat: { front: 10, back: 16, left: 10, right: 10 },
  height: 14, pal: 'cobalt', logic: 3.3,
  holes: [[3.81, 3.81, 3.658], [118.11, 3.81, 3.658], [3.81, 67.31, 3.658], [118.11, 67.31, 3.658]],
  silk: [
    ...N16.map(n => [swX(n), 15.4, 'SW' + n, .85]), ...N16.map(n => [swX(n), 1.6, `(${SW_PIN[n]})`, .7]),
    ...N16.map(n => [ldX(n), 19.7, 'LD' + n, .85]), ...N16.map(n => [ldX(n) + 2.0, 17.7, `(${LD_PIN[n]})`, .55, 90]),
    ...BUTTONS.map(([id, , pin, x, y]) => id === 'BTNU' || id === 'BTNR' ? [x + 7.0, y, `${id} (${pin})`, .75]
      : id === 'BTNC' ? [x, y - 3.3, `${id} (${pin})`, .65] : [x - 7.0, y, `${id} (${pin})`, .75]),
    [33.0, 32.6, 'DISP1', .9], [50.0, 33.4, 'CLK100MHz (W5)', .75], [72.0, 46.0, 'BASYS3', 2.6], [72.0, 41.6, 'DIGILENT', 1.2],
    [107.5, 61.7, 'PROG', .9], [24.4, 66.2, 'ON', .8], [24.4, 61.6, 'OFF', .8], [20.0, 57.0, 'POWER', .8],
    [8.8, 68.0, 'LD20', .7], [8.8, 63.4, 'POWER', .7],
    [12.0, 70.3, 'EXT', .75], [12.0, 62.2, 'USB', .75], [14.4, 66.5, 'JP2', .7, 90],
    [20.3, 55.3, 'EXT  GND', .75], [20.3, 51.3, '5V Only!', .8], [23.6, 53.3, 'J6', .75],
    [26.4, 68.6, 'PROG', .75, 90], [34.4, 64.6, 'J4', .75], [38.0, 67.1, 'RX', .7], [42.0, 67.1, 'TX', .7],
    [61.0, 54.5, 'VGA', 1], [65.0, 54.5, 'J1', .75], [79.7, 65.9, 'BUSY', .65], [79.7, 69.1, 'LD16', .65], [87.5, 55.9, 'USB', .9], [92.5, 55.9, 'J2', .75],
    [101.5, 70.2, '1', .7], [99.2, 64.9, 'JP1', .7, 90], [97.9, 64.9, 'MODE', .7, 90],
    [104.4, 67.5, 'QSPI', .55], [104.4, 64.9, 'JTAG', .55], [104.4, 62.4, 'USB', .55],
    [112.9, 63.9, 'DONE', .65], [112.9, 67.1, 'LD19', .65],
    [10.3, 43.3, '1', .7], [4.0, 61.0, 'JA', 1], [4.0, 38.0, 'JXADC', .85], [10.3, 20.5, '1', .7],
    [111.7, 60.7, '1', .7], [117.5, 61.0, 'JB', 1], [111.7, 37.9, '1', .7], [117.5, 20.4, 'JC', 1],
  ],
  traces: [VBUS_RUN, VU_RUN, V3_RUN, LD0_RUN, SW0_RUN, SEG_RUN],
  parts: [
    // the FPGA and its neighbours
    { id: 'IC7', kind: 'bga', name: 'Artix-7 FPGA XC7A35T (your design becomes its wiring)', short: 'FPGA', at: [61.0, 42.0], size: [10, 10], h: 1.2,
      label: 'XILINX|ARTIX-7|XC7A35T|1C' },
    // C45-C103 ring IC7; the fact sheet has no per-capacitor positions, so these stand for the ring
    { id: 'C45', kind: 'basys3-caps', name: 'FPGA decoupling capacitors (C45-C103)', short: 'DECOUPLING', at: [61.0, 42.0], size: [16, 16], h: .5,
      spots: [[53.8, 36.0], [53.8, 39.0], [53.8, 45.0], [53.8, 48.0], [68.2, 36.0], [68.2, 39.0], [68.2, 45.0], [68.2, 48.0],
        [56.0, 34.6, 90], [59.0, 34.6, 90], [63.0, 34.6, 90], [66.0, 34.6, 90], [56.0, 49.4, 90], [59.0, 49.4, 90], [63.0, 49.4, 90], [66.0, 49.4, 90]] },
    { id: 'IC1', kind: 'qfn', name: 'FT2232HQ USB bridge: the JTAG programmer and the USB-UART', short: 'USB-JTAG', at: [31.7, 58.4], size: [9, 9], n: 16, h: .9, label: 'FTDI|FT2232HQ' },
    { id: 'IC2', kind: 'qfn', name: 'PIC24 USB host chip (reads a keyboard, a mouse or a bitstream on a stick)', short: 'USB HOST', at: [90.0, 48.4], size: [9, 9], n: 16, h: .9, label: 'PIC24FJ128|GB106' },
    // the display and its digit drivers (under the board, near DISP1: estimated)
    { id: 'DISP1', kind: 'basys3-seg7', name: '4-digit 7-segment display (common anode, the digits take turns)', short: 'DISPLAY', at: [33.0, 26.4] },
    { id: 'Q1', kind: 'soic', name: 'Dual PNP transistor Q1: switches two digit anodes', short: 'Q1', at: [24.6, 19.6], size: [2.9, 1.6], n: 3, h: 1, side: 'bottom' },
    { id: 'Q2', kind: 'soic', name: 'Dual PNP transistor Q2: switches the other two digit anodes', short: 'Q2', at: [41.4, 19.6], size: [2.9, 1.6], n: 3, h: 1, side: 'bottom' },
    // the student's I/O
    ...N16.map(n => ({ id: 'SW' + n, kind: 'basys3-slide', name: `Slide switch SW${n} (sw[${n}], pin ${SW_PIN[n]}; up = 1)`, short: 'SW' + n, at: [swX(n), 8.8],
      control: { type: 'slide', action: 'input', net: 'SW' + n, positions: ['OFF', 'ON'] } })),
    ...N16.map(n => ({ id: 'LD' + n, kind: 'led', name: `Green LED LD${n} (led[${n}], pin ${LD_PIN[n]}; 1 = on)`, short: 'LD' + n, at: [ldX(n), 17.7], rot: 90, size: [1.95, 1.15], h: .35,
      led: { color: '#4cc65a', net: 'LD' + n, via: ['IC7'] } })),
    ...BUTTONS.map(([id, port, pin, x, y]) => ({ id, kind: 'tact', name: `Push button ${id} (${port}, pin ${pin}; pressed = 1)`, short: id, at: [x, y], size: [4.5, 4.5], h: 3.7, group: 'smd',
      control: { type: 'button', action: 'input', net: id } })),
    { id: 'PROG', kind: 'tact', name: 'PROG button: clears the FPGA, which then loads its design again', short: 'PROG', at: [107.5, 65.5], size: [4.5, 4.5], h: 3.7, group: 'smd', capColor: '#d8392e',
      control: { type: 'button', action: 'reset' } },
    // power
    { id: 'J4', kind: 'usb-micro', name: 'Micro-USB socket J4 (power, programming and the USB-UART)', short: 'MICRO-USB', at: [31.7, 69.57], rot: 270, size: [6.3, 8.2], h: 2.7, plug: true },
    { id: 'J6', kind: 'male', name: 'External power header J6 (4.5-5.5 V only, no reverse protection)', short: 'EXT 5V', at: [20.3, 53.3], pins: ['VEXT', 'GND'], labels: ['EXT', 'GND'] },
    // C27's place is not in the CAD files: next to J6, where the EXT supply comes in
    { id: 'C27', kind: 'chip', cap: true, name: '10 µF input capacitor C27 on VU (a 10 V part)', short: 'C27', at: [16.6, 53.3], size: [2, 1.25], h: .9, label: '106' },
    { id: 'JP2', kind: 'basys3-jumper', name: 'Power-source jumper JP2 (the shunt picks USB or EXT)', short: 'JP2', at: [12.0, 66.5], rot: 90, mirror: true, pins: ['VEXT', 'VU', 'VBUS'],
      labels: ['EXT', 'VU', 'USB'], shunt: [2, 3], shuntFor: st => st.power === 'ext' ? [1, 2] : [2, 3], shuntColor: '#3e6fc4' },
    { id: 'SW16', kind: 'basys3-slide', name: 'Power switch SW16 (ON)', short: 'POWER', at: [20.0, 63.9], lever: 1 },
    { id: 'LD20', kind: 'led', name: 'Power LED LD20 (red: every rail is good)', short: 'LD20', at: [8.8, 65.52], h: .35, led: { color: '#e8392e', rail: '3V3' } },
    { id: 'W1', kind: 'hole', name: 'Test point W1 (3.3 V)', short: 'W1', at: [21.4, 34.5], d: 1, label: 'W1', fixed: true },
    { id: 'W3', kind: 'hole', name: 'Test point W3 (1.0 V)', short: 'W3', at: [28.5, 34.5], d: 1, label: 'W3', fixed: true },
    { id: 'W2', kind: 'hole', name: 'Test point W2 (1.8 V)', short: 'W2', at: [68.7, 26.7], d: 1, label: 'W2', fixed: true },
    // the regulators under the board (lower-left quadrant and next to W2: estimated)
    { id: 'IC10', kind: 'qfn', name: 'LTC3633 dual buck regulator IC10: 1.0 V core and 3.3 V I/O', short: '1V0+3V3', at: [18.0, 40.5], size: [4, 5], n: 4, h: .75, side: 'bottom', label: 'LT|3633' },
    { id: 'L1', kind: 'inductor', name: '1.5 µH inductor L1 (1.0 V)', short: 'L1', at: [11.5, 40.5], size: [5, 5], h: 4, side: 'bottom', label: '1R5' },
    { id: 'L2', kind: 'inductor', name: '2.2 µH inductor L2 (3.3 V)', short: 'L2', at: [24.5, 40.5], size: [5, 5], h: 4, side: 'bottom', label: '2R2' },
    { id: 'IC11', kind: 'soic', name: 'LTC3621 buck regulator IC11: 1.8 V for the FPGA\'s auxiliary circuits', short: '1V8', at: [64.0, 24.0], size: [3, 3], n: 4, pitch: .65, h: 1, side: 'bottom', label: 'LTGDH' },
    { id: 'L3', kind: 'inductor', name: '3.3 µH inductor L3 (1.8 V)', short: 'L3', at: [71.5, 23.0], size: [4, 4], h: 1.8, side: 'bottom', label: '3R3' },
    // programming and configuration
    { id: 'LD17', kind: 'led', name: 'RX LED LD17 (the computer sends on the UART)', short: 'RX', at: [38.0, 68.52], h: .35, led: { color: '#f2b12e', serial: 'rx', via: ['IC1'] } },
    { id: 'LD18', kind: 'led', name: 'TX LED LD18 (the board sends on the UART)', short: 'TX', at: [42.0, 68.52], h: .35, led: { color: '#f2b12e', serial: 'tx', via: ['IC1'] } },
    { id: 'JP1', kind: 'basys3-jumper', name: 'Mode jumper JP1 (shunt on QSPI: load the design from flash)', short: 'MODE', at: [101.5, 64.94], rot: 90, mirror: true, pins: ['GND', 'MODE2', '3V3', 'MODE1'], shunt: [1, 2] },
    // no design drives this net, so the inverted LED is lit for as long as the FPGA holds a design and runs it
    { id: 'LD19', kind: 'led', name: 'DONE LED LD19 (green: the FPGA has its design)', short: 'DONE', at: [112.92, 65.52], h: .35, led: { color: '#4cc65a', net: 'NOT_CONFIGURED', invert: true, via: ['IC7'] } },
    { id: 'LD16', kind: 'led', name: 'BUSY LED LD16 (the USB-host chip is busy)', short: 'BUSY', at: [79.7, 67.52], h: .35, led: { color: '#f2b12e', via: ['IC2'] } },
    { id: 'IC8', kind: 'soic', name: 'Quad-SPI flash IC8 (holds the design the FPGA loads at power-up)', short: 'FLASH', at: [90.67, 30.65], size: [10.3, 7.5], n: 8, pitch: 1.27, h: 2.5, side: 'bottom', label: 'MXIC|MX25L3233F' },
    { id: 'IC9', kind: 'qfn', name: '100 MHz MEMS oscillator IC9 (the clock on pin W5; silicon, no quartz)', short: 'CLOCK', at: [50.7, 26.6], size: [3.2, 2.5], n: 2, h: .85, side: 'bottom', label: '100M' },
    // connectors on the top edge and the Pmod ports on the sides
    { id: 'J1', kind: 'basys3-vga', name: 'VGA socket J1 (4 bits per colour)', short: 'VGA', at: [61.0, 68.8], rot: 270 },
    { id: 'J2', kind: 'basys3-usba', name: 'USB-A host socket J2 (one keyboard or mouse, or a FAT32 stick with a bitstream)', short: 'USB-A', at: [90.0, 64.22], rot: 270 },
    { id: 'JA', kind: 'basys3-pmod', name: 'Pmod port JA (8 FPGA pins, each through 200 Ω)', short: 'JA', at: [4.12, 52.0], pins: pmodPins('JA'), labels: PMOD_LABELS },
    { id: 'JXADC', kind: 'basys3-pmod', name: 'Pmod port JXADC (analog-capable, through 100 Ω)', short: 'JXADC', at: [4.12, 29.2],
      pins: ['XA1_P', 'XA2_P', 'XA3_P', 'XA4_P', 'GND', '3V3', 'XA1_N', 'XA2_N', 'XA3_N', 'XA4_N', 'GND', '3V3'], labels: PMOD_LABELS },
    { id: 'JB', kind: 'basys3-pmod', name: 'Pmod port JB (8 FPGA pins, each through 200 Ω)', short: 'JB', at: [117.92, 52.0], rot: 180, pins: pmodPins('JB'), labels: PMOD_LABELS },
    { id: 'JC', kind: 'basys3-pmod', name: 'Pmod port JC (8 FPGA pins, each through 200 Ω)', short: 'JC', at: [117.92, 29.2], rot: 180, pins: pmodPins('JC'), labels: PMOD_LABELS },
  ],
  power: {
    sources: {
      usb: { label: 'USB cable', part: 'J4', plug: 'usb-micro', v: 5.0, ilim: .5 },
      ext: { label: 'EXT header J6', pin: 'VEXT', v: 5, range: [4.5, 5.5], max: 16 },
    },
    default: 'usb',
    rails: {
      VBUS: { from: [{ src: 'usb', via: ['J4'] }] },
      // no reverse diode and no fuse on EXT: a reversed supply forward-biases the regulators' body diodes
      VEXT: { from: [{ src: 'ext', via: ['J6'], burns: 'IC10' }] },
      // VU feeds the bucks (the LTC3633 takes up to 15 V) and the USB-A port as it is; C27 is a 10 V part. SW16 (fixed
      // ON here) only enables the bucks, so it is not in their feeds
      VU: { from: [{ rail: 'VBUS', via: ['JP2'] }, { rail: 'VEXT', via: ['JP2'] }], max: 10, victim: 'C27' },
      '1V0': { from: [{ rail: 'VU', via: ['IC10'], reg: 1.0, dropout: .3, ilim: 2 }] },
      '1V8': { from: [{ rail: 'VU', via: ['IC11'], reg: 1.8, dropout: .3, ilim: .3, offIf: ['1V0', '<', .9] }] },
      '3V3': { from: [{ rail: 'VU', via: ['IC10'], reg: 3.3, dropout: .3, ilim: 2, offIf: ['1V8', '<', 1.6] }] },
    },
    mcu: { part: 'IC7', rail: '3V3', min: 2.9, needs: ['IC7', 'IC8'] },
    upload: { source: 'usb', needs: ['IC1', 'IC7'], tool: 'vivado' },
  },
  mode: 'gpio',
  modes: {
    gpio: { title: 'Factory GPIO demo', bytes: 2192012, banner: 'BASYS3 GPIO/UART DEMO!', out: gpioDemo,
      serial: (k, st) => anyButton(st) ? 'Button press detected!' : null },
    blink: { title: 'Blink LD0 from a counter', bytes: 2192012, out: (st, t) => ({ LD0: Math.floor(t * 2) % 2 }) },
    chase: { title: 'LED chaser', bytes: 2192012, out: (st, t) => { const k = Math.floor(t * 16) % 30, n = k < 16 ? k : 30 - k;
      return Object.fromEntries(N16.map(i => ['LD' + i, i === n ? 1 : 0])); } },
    hex: { title: 'Switches as a hex number', bytes: 2192012, out: st => { const v = switches(st), out = {};
      for (let d = 0; d < 4; d++) Object.assign(out, digitNets(d, (v >> (4 * d)) & 15));
      return out; } },
  },
  // the engine reports every input control's level as state.inputs; the model only moves levers the host changed
  model: st => { syncFromHost(st); return {}; },
  faults: [
    ['reverse-polarity:ext', 'EXT header wired backwards (J6 has no reverse diode)'],
    ['wrong-voltage:ext:12', '12 V on the EXT header'],
    ['wrong-voltage:ext:3', '3 V on the EXT header'],
    ['short:3V3:GND', 'Pmod 3V3 pin shorted to GND'],
    ['short:VU:GND', 'Solder bridge from VU (5 V) to GND'],
    ['missing:JP2', 'JP2 shunt lost'],
    ['missing:IC8', 'No flash: the design has nowhere to load from'],
  ],
  xr: {
    flow: [['VBUS', VBUS_RUN], ['VU', VU_RUN], ['3V3', V3_RUN], ['LD0', LD0_RUN], ['SW0', SW0_RUN], ['DIG0_A', SEG_RUN]],
    notes: [['IC7', 'SILICON DIE: LOGIC CELLS'], ['IC9', 'MEMS RESONATOR, NO QUARTZ'], ['IC1', 'USB BRIDGE'], ['IC8', 'FLASH: THE DESIGN'], ['IC10', 'BUCK 1.0 V + 3.3 V']],
  },
  tags: [['IC7', -34, -40], ['DISP1', -40, 30], ['BTNC', 34, -30], ['SW0', 40, 26], ['LD0', 44, -10], ['J4', -36, -26], ['J1', 10, -46], ['JB', 44, 6], ['PROG', 40, -30]],
  circuit: 'pmod-led',
  circuits: {
    'pmod-led': {
      title: 'An LED on Pmod JB', breadboard: 'half',
      parts: [
        { id: 'R1', part: 'resistor', ohms: 220, holes: ['b10', 'b14'] },
        { id: 'LED1', part: 'led', color: 'red', holes: ['c14', 'c15'] },
      ],
      wires: [
        { from: 'JB.1', to: 'a10', color: 'orange' },
        { from: 'JB.5', to: 'a15', color: 'black' },
      ],
    },
  },
});
})();
