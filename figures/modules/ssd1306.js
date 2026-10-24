// @cf title SSD1306 OLED module
// @cf use engine/bench.list
/* 0.96 inch 128 x 64 I²C OLED module (docs/facts/la-components.md §17): a 27.3 x 27.8 mm PCB with four 2 mm holes,
   the 4-pin 2.54 mm header along the top edge, and the glass panel (26.7 x 19.3 mm, active area 21.74 x 10.86 mm,
   0.17 mm pixels) taped to the front. The SSD1306 controller is a long chip-on-glass die on the glass ledge; a flex
   tail folds round the bottom edge to the back, where the 662K (XC6206 class) 3.3 V regulator, the charge-pump and
   VCOMH capacitors, the I²C pull-ups and the address resistor sit (0x78 position = 7-bit 0x3C, 0x7A = 0x3D).
   Pin order varies by maker: GND VCC SCL SDA (default) or VCC GND SCL SDA. Swapping VCC and GND kills the regulator.
   The module runs from 3.3-5 V. On an Uno the I²C lines are 5 V logic and Wire turns on the ATmega's pull-ups to 5 V,
   so the bus is not 3.3 V whichever supply you pick; almost every module survives it in practice (a level shifter is
   the strictly correct way).
   The screen is a real 128 x 64 frame buffer drawn with a 5 x 7 font at 6 px per character (the Adafruit GFX cell).
   The host can send its own frame: CF_BRIDGE command 'oled' { buf: base64 of the 1024-byte GDDRAM in SSD1306 page
   order, addr: the sketch's I²C address, on, invert, contrast 0-255, color: 'white'|'blue'|'yellow-blue', clear }.
   A frame sent to the wrong address leaves the screen blank: Adafruit begin() does not check the address. */
(() => {
const B = SL.bench, T = B.T;
const FBW = 128, H = 64, PIXEL = .17, ADDR = 0x3c;
const GLASS = [26.7, 19.26, 1.45], AA = [21.74, 10.86];
const PCBW = 27.3, PCBH = 27.8, GLASS_AT = [13.65, 13.03], AA_TOP = 2.4;    // AA top edge 2.4 mm below the glass top
const COLORS = { white: ['#eef6ff', '#eef6ff'], blue: ['#7fd4ff', '#7fd4ff'], 'yellow-blue': ['#ffd84a', '#7fd4ff'] };

/* ---------- 5 x 7 font, drawn for SimLab: one row of five pixels per token ---------- */
const GLYPHS = `
SP ..... ..... ..... ..... ..... ..... .....
!  ..#.. ..#.. ..#.. ..#.. ..#.. ..... ..#..
%  ##... ##..# ...#. ..#.. .#... #..## ...##
(  ...#. ..#.. .#... .#... .#... ..#.. ...#.
)  .#... ..#.. ...#. ...#. ...#. ..#.. .#...
+  ..... ..#.. ..#.. ##### ..#.. ..#.. .....
,  ..... ..... ..... ..... .##.. ..#.. .#...
-  ..... ..... ..... ##### ..... ..... .....
.  ..... ..... ..... ..... ..... .##.. .##..
/  ..... ....# ...#. ..#.. .#... #.... .....
0  .###. #...# #..## #.#.# ##..# #...# .###.
1  ..#.. .##.. ..#.. ..#.. ..#.. ..#.. .###.
2  .###. #...# ....# ...#. ..#.. .#... #####
3  ##### ...#. ..#.. ...#. ....# #...# .###.
4  ...#. ..##. .#.#. #..#. ##### ...#. ...#.
5  ##### #.... ####. ....# ....# #...# .###.
6  ..##. .#... #.... ####. #...# #...# .###.
7  ##### ....# ...#. ..#.. .#... .#... .#...
8  .###. #...# #...# .###. #...# #...# .###.
9  .###. #...# #...# .#### ....# ...#. .##..
:  ..... .##.. .##.. ..... .##.. .##.. .....
=  ..... ..... ##### ..... ##### ..... .....
?  .###. #...# ....# ...#. ..#.. ..... ..#..
A  .###. #...# #...# ##### #...# #...# #...#
B  ####. #...# #...# ####. #...# #...# ####.
C  .###. #...# #.... #.... #.... #...# .###.
D  ###.. #..#. #...# #...# #...# #..#. ###..
E  ##### #.... #.... ####. #.... #.... #####
F  ##### #.... #.... ####. #.... #.... #....
G  .###. #...# #.... #.### #...# #...# .####
H  #...# #...# #...# ##### #...# #...# #...#
I  .###. ..#.. ..#.. ..#.. ..#.. ..#.. .###.
J  ..### ...#. ...#. ...#. ...#. #..#. .##..
K  #...# #..#. #.#.. ##... #.#.. #..#. #...#
L  #.... #.... #.... #.... #.... #.... #####
M  #...# ##.## #.#.# #.#.# #...# #...# #...#
N  #...# #...# ##..# #.#.# #..## #...# #...#
O  .###. #...# #...# #...# #...# #...# .###.
P  ####. #...# #...# ####. #.... #.... #....
Q  .###. #...# #...# #...# #.#.# #..#. .##.#
R  ####. #...# #...# ####. #.#.. #..#. #...#
S  .#### #.... #.... .###. ....# ....# ####.
T  ##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..
U  #...# #...# #...# #...# #...# #...# .###.
V  #...# #...# #...# #...# #...# .#.#. ..#..
FBW  #...# #...# #...# #.#.# #.#.# #.#.# .#.#.
X  #...# #...# .#.#. ..#.. .#.#. #...# #...#
Y  #...# #...# .#.#. ..#.. ..#.. ..#.. ..#..
Z  ##### ....# ...#. ..#.. .#... #.... #####
a  ..... ..... .###. ....# .#### #...# .####
b  #.... #.... #.##. ##..# #...# #...# ####.
c  ..... ..... .###. #.... #.... #...# .###.
d  ....# ....# .##.# #..## #...# #...# .####
e  ..... ..... .###. #...# ##### #.... .###.
f  ..##. .#..# .#... ###.. .#... .#... .#...
g  ..... .#### #...# #...# .#### ....# .###.
h  #.... #.... #.##. ##..# #...# #...# #...#
i  ..#.. ..... .##.. ..#.. ..#.. ..#.. .###.
j  ...#. ..... ..##. ...#. ...#. #..#. .##..
k  #.... #.... #..#. #.#.. ##... #.#.. #..#.
l  .##.. ..#.. ..#.. ..#.. ..#.. ..#.. .###.
m  ..... ..... ##.#. #.#.# #.#.# #...# #...#
n  ..... ..... #.##. ##..# #...# #...# #...#
o  ..... ..... .###. #...# #...# #...# .###.
p  ..... ..... ####. #...# ####. #.... #....
q  ..... ..... .##.# #..## .#### ....# ....#
r  ..... ..... #.##. ##..# #.... #.... #....
s  ..... ..... .###. #.... .###. ....# ####.
t  .#... .#... ###.. .#... .#... .#..# ..##.
u  ..... ..... #...# #...# #...# #..## .##.#
v  ..... ..... #...# #...# #...# .#.#. ..#..
w  ..... ..... #...# #...# #.#.# #.#.# .#.#.
x  ..... ..... #...# .#.#. ..#.. .#.#. #...#
y  ..... ..... #...# #...# .#### ....# .###.
z  ..... ..... ##### ...#. ..#.. .#... #####`;
const FONT = {};
for (const ln of GLYPHS.trim().split('\n')){ const [ch, ...rows] = ln.trim().split(/\s+/); FONT[ch === 'SP' ? ' ' : ch] = rows; }

/* ---------- a tiny GFX: the frame buffer is one byte per pixel ---------- */
const gfx = () => {
  const fb = new Uint8Array(FBW * H);
  const px = (x, y, v = 1) => { if (x >= 0 && x < FBW && y >= 0 && y < H) fb[y * FBW + x] = v; };
  const fillRect = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) px(i, j); };
  const rect = (x, y, w, h) => { fillRect(x, y, w, 1); fillRect(x, y + h - 1, w, 1); fillRect(x, y, 1, h); fillRect(x + w - 1, y, 1, h); };
  const text = (x, y, str, size = 1) => {
    for (const ch of String(str)){ const g = FONT[ch] || FONT['?'];
      g.forEach((row, r) => { for (let c = 0; c < 5; c++) if (row[c] === '#') fillRect(x + c * size, y + r * size, size, size); });
      x += 6 * size; }
  };
  return { fb, px, fillRect, rect, text };
};
// the lesson 14 sketch: "{pct}%" at size 3, a bar at y 28-35, the mood at size 2 at y 46
const moisturePct = t => Math.round(52 + 41 * Math.sin(t * .35));
const FRAMES = {
  moisture: t => { const g = gfx(), pct = moisturePct(t);
    g.text(0, 0, pct + '%', 3); g.rect(0, 28, 128, 8); g.fillRect(0, 28, Math.floor(pct * 128 / 100), 8);
    g.text(0, 46, pct < 30 ? 'Water me!' : pct > 85 ? 'Too wet!' : 'Happy :)', 2); return g.fb; },
  hello: () => { const g = gfx(); g.rect(0, 0, 128, 64); g.text(4, 4, 'Hello, world!', 1); g.text(4, 20, 'SimLab', 2); g.text(4, 44, '128 x 64 at 0x3C', 1); return g.fb; },
  pixels: t => { const g = gfx(), k = Math.floor(t * 2) % 2;
    for (let y = 0; y < H; y++) for (let x = 0; x < FBW; x++) if (y < 16 ? ((x >> 3) + (y >> 3) + k) % 2 === 0 : (x === y * 2 || x === 127 - y * 2 || x % 16 === 0 || y % 16 === 15)) g.px(x, y);
    return g.fb; },
};
const decode = b64 => { try { const bin = atob(String(b64)), fb = new Uint8Array(FBW * H); if (bin.length < 1024) return null;
  for (let i = 0; i < 1024; i++){ const page = Math.floor(i / FBW), col = i % FBW, byte = bin.charCodeAt(i); for (let b = 0; b < 8; b++) if (byte >> b & 1) fb[(page * 8 + b) * FBW + col] = 1; }
  return fb; } catch (e) { return null; } };
const host = { fb: null, addr: ADDR, on: true, invert: false, contrast: 207, color: (CF_Q.get('oled') in COLORS) ? CF_Q.get('oled') : 'white' };
if (window.CF_BRIDGE) CF_BRIDGE.on('oled', m => {
  if (!m || typeof m !== 'object') return;
  if (m.clear){ host.fb = null; host.addr = ADDR; }
  if (typeof m.buf === 'string'){ const fb = decode(m.buf); if (fb) host.fb = fb; else B.note('oled: buf must be base64 of 1024 bytes'); }
  if (Number.isInteger(m.addr)) host.addr = m.addr;
  if (typeof m.on === 'boolean') host.on = m.on;
  if (typeof m.invert === 'boolean') host.invert = m.invert;
  if (Number.isFinite(m.contrast)) host.contrast = Math.max(0, Math.min(255, m.contrast));
  if (m.color in COLORS) host.color = m.color;
  if (B.st){ B.st.ext = !!host.fb; B.refresh(); }
});

// what the panel shows right now: null = dark
let cacheKey = '', cacheFb = null;
const frameNow = st => {
  if (!st.ev || st.ev.status !== 'running') return null;
  if (host.fb && st.ext) return host.on && host.addr === ADDR ? host.fb : null;
  const fn = FRAMES[st.mode]; if (!fn) return null;
  const key = st.mode + ':' + Math.floor(st.t * 4);
  if (key !== cacheKey){ cacheKey = key; cacheFb = fn(st.t); }
  return cacheFb;
};

/* parts on the back of the module: hidden behind the PCB, shown through it in see-through */
const underPCB = svg => {
  const md = B.md, pts = [];
  for (const [x, y] of B.pcbOutline()) pts.push(P(...B.BP(x, y, 0)), P(...B.BP(x, y, -md.pcb.thick)));
  const d = 'M-5000 -5000H5000V5000H-5000ZM' + hull(pts).map(q => f(q[0]) + ' ' + f(q[1])).join('L') + 'Z';
  return `<clipPath id="slUnderPcb"><path clip-rule="evenodd" d="${d}"/></clipPath><g clip-path="url(#slUnderPcb)">${svg}</g>`;
};
const below = base => ({ group: base.group, size: base.size, h: base.h, pins: base.pins, xrLabel: base.xrLabel,
  draw(ctx){ const c2 = Object.create(ctx); c2.put = (bx, svg) => ctx.put(bx, ctx.k > .05 ? svg : underPCB(svg)); base.draw(c2); } });
for (const k of ['male', 'chip', 'sot23']) B.kind('ssd1306-back-' + k, below(B.kinds[k]));

/* the glass: dark panel, lit pixels as merged runs, the COG die on the ledge and the flex round the bottom edge */
B.kind('ssd1306-glass', {
  group: 'last', size: () => [GLASS[0], GLASS[1]], h: GLASS[2],
  draw(ctx){
    const st = ctx.st, [gw, gh, gt] = GLASS, k = ctx.k, z = gt;
    const panel = { l: '#3a3d44', m: '#23262c', d: '#15171b' };
    let s = ctx.slab(-gw / 2, -gh / 2, gw / 2, gh / 2, 0, gt, panel, toneI, .8);
    const a0 = -AA[0] / 2, b0 = gh / 2 - AA_TOP;          // active area: top-left corner in the glass frame
    s += ctx.poly([[a0 - .5, b0 + .5], [a0 + AA[0] + .5, b0 + .5], [a0 + AA[0] + .5, b0 - AA[1] - .5], [a0 - .5, b0 - AA[1] - .5]], z + .01, '#0d0e11', 0);
    // the COG die on the ledge and its flex tail folding round the PCB's bottom edge
    s += ctx.slab(-7, -gh / 2 + 1.6, 7, -gh / 2 + 2.5, z, z + .3, matOf('#2c2c30'), toneI, .4);
    const edge = -(GLASS_AT[1]) + .1;
    s += ctx.slab(-6, edge, 6, -gh / 2, -.05, .1, matOf('#d99a3c'), toneI, .4) + ctx.slab(-6, edge - .15, 6, edge, -B.md.pcb.thick - .6, .1, matOf('#d99a3c'), toneI, .4);
    const fb = frameNow(st), v3 = (st.ev && st.ev.rails['3V3']) || 0, dim = Math.max(0, Math.min(1, (v3 - 2) / 1)) * (.55 + .45 * host.contrast / 255);
    let lit = '';
    if (fb && dim > .02){
      const cols = COLORS[host.color], paths = ['', ''];
      for (let r = 0; r < H; r++){
        let c = 0;
        while (c < FBW){
          const isOn = (fb[r * FBW + c] ? 1 : 0) ^ (host.invert ? 1 : 0);
          if (!isOn){ c++; continue; }
          let e = c; while (e < FBW && ((fb[r * FBW + e] ? 1 : 0) ^ (host.invert ? 1 : 0))) e++;
          const x0 = a0 + c * PIXEL + .012, x1 = a0 + e * PIXEL - .012, y0 = b0 - r * PIXEL - .012, y1 = b0 - (r + 1) * PIXEL + .012;
          paths[r < 16 ? 0 : 1] += 'M' + [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([a, b]) => ctx.P(a, b, z + .02).map(f).join(' ')).join('L') + 'Z';
          c = e;
        }
      }
      paths.forEach((d, i) => { if (d) lit += `<path d="${d}" fill="${cols[i]}" opacity="${f(dim)}"/>`; });
      if (lit) lit = `<g style="filter:drop-shadow(0 0 1.2px ${cols[1]})">${lit}</g>`;
    }
    if (k > 0){
      // see-through: ITO rows and metal columns cross at every pixel; organic layers glow where they cross
      let grid = '';
      for (let r = 0; r <= 8; r++){ const b = b0 - r * AA[1] / 8; grid += `<path d="${pd([ctx.W(a0, b, z + .03), ctx.W(a0 + AA[0], b, z + .03)], false)}" fill="none" stroke="#9fd8ff" stroke-width=".35" opacity="${f(.7 * k)}"/>`; }
      for (let c = 0; c <= 16; c++){ const a = a0 + c * AA[0] / 16; grid += `<path d="${pd([ctx.W(a, b0, z + .04), ctx.W(a, b0 - AA[1], z + .04)], false)}" fill="none" stroke="#c9c2b0" stroke-width=".35" opacity="${f(.7 * k)}"/>`; }
      s += grid;
    }
    ctx.put(ctx.B(-gw / 2, edge - .2, -B.md.pcb.thick - .6, gw / 2, gh / 2, gt + .05), s + lit);
  },
  xr(ctx){ ctx.put(ctx.B(-7, -GLASS[1] / 2 + 1.6, GLASS[2] + .3, 7, -GLASS[1] / 2 + 2.5, GLASS[2] + .5),
    `<g opacity="${f(ctx.k)}">${ctx.slab(-7, -GLASS[1] / 2 + 1.8, 7, -GLASS[1] / 2 + 2.3, GLASS[2] + .3, GLASS[2] + .45, { l: '#8c95b8', m: '#6b7397', d: '#3f4565' }, toneI, .4)}</g>`); },
  xrLabel: () => 'SSD1306 DIE ON THE GLASS',
});

function make(order){
  const pins = order === 'vcc-gnd' ? ['VCC', 'GND', 'SCL', 'SDA'] : ['GND', 'VCC', 'SCL', 'SDA'];
  const hx = i => PCBW / 2 + (i - 1.5) * 2.54;
  return {
    id: 'ssd1306', name: 'SSD1306 OLED module', sub: '0.96 inch, 128 x 64 pixels, I²C at 0x3C, 3.3-5 V',
    pcb: { w: PCBW, h: PCBH, thick: 1.2, r: .8, color: '#1d3f8f', silk: '#f2f1e8', standoff: 9.5 },
    mat: { front: 9, back: 9, left: 9, right: 9 }, height: 6, pal: 'cobalt', logic: 3.3,
    holes: [[2.1, 2.1, 2], [PCBW - 2.1, 2.1, 2], [2.1, PCBH - 2.1, 2], [PCBW - 2.1, PCBH - 2.1, 2]],
    silk: pins.map((n, i) => [hx(i), PCBH - 3.9, n, .8]),
    parts: [
      { id: 'J1', kind: 'ssd1306-back-male', name: '4-pin header (' + pins.join(' ') + ')', short: pins.join(' '), at: [PCBW / 2, PCBH - 1.6], side: 'bottom', h: 8.5, pins },
      { id: 'U1', kind: 'ssd1306-glass', name: 'OLED glass with the SSD1306 controller', short: 'OLED PANEL', at: GLASS_AT,
        nets: { VDD: '3V3', VBAT: '3V3', SCL: 'SCL', SDA: 'SDA' } },
      { id: 'REG', kind: 'ssd1306-back-sot23', name: '3.3 V regulator (662K)', short: '662K', at: [21.6, 9.2], side: 'bottom', label: '662K' },
      { id: 'CP1', kind: 'ssd1306-back-chip', name: 'Charge-pump capacitor 1', at: [9.4, 8.2], side: 'bottom', size: [1.6, .8], h: .5, cap: true },
      { id: 'CP2', kind: 'ssd1306-back-chip', name: 'Charge-pump capacitor 2', at: [11.6, 8.2], side: 'bottom', size: [1.6, .8], h: .5, cap: true },
      { id: 'CV', kind: 'ssd1306-back-chip', name: 'VCOMH capacitor', at: [13.8, 8.2], side: 'bottom', size: [1.6, .8], h: .5, cap: true },
      { id: 'C_IN', kind: 'ssd1306-back-chip', name: 'Regulator input capacitor', at: [21.6, 12.4], side: 'bottom', size: [1.6, .8], h: .5, cap: true },
      { id: 'R_SCL', kind: 'ssd1306-back-chip', name: 'SCL pull-up resistor (to VCC)', at: [hx(2), PCBH - 6.2], side: 'bottom', rot: 90, size: [1.6, .8], h: .5 },
      { id: 'R_SDA', kind: 'ssd1306-back-chip', name: 'SDA pull-up resistor (to VCC)', at: [hx(3), PCBH - 6.2], side: 'bottom', rot: 90, size: [1.6, .8], h: .5 },
      { id: 'ADDR', kind: 'ssd1306-back-chip', name: 'Address resistor (0x78 = 0x3C)', short: '0x3C', at: [6, 14], side: 'bottom', rot: 90, size: [1.6, .8], h: .5 },
    ],
    power: {
      sources: {
        v5: { label: '5 V from the board', pin: 'VCC', v: 5, range: [3.3, 5.5], max: 6 },
        v33: { label: '3.3 V from the board', pin: 'VCC', v: 3.3, range: [3, 5.5], max: 6 },
      },
      default: 'v5',
      rails: {
        VCC: { from: [{ src: 'v5', via: ['J1', 'REG'], max: 6 }, { src: 'v33', via: ['J1', 'REG'], max: 6 }] },
        '3V3': { from: [{ rail: 'VCC', via: ['REG'], reg: 3.3, dropout: .25 }], max: 3.6 },
      },
      mcu: { part: 'U1', rail: '3V3', min: 1.65, needs: ['U1', 'CP1', 'CP2'] },
      upload: { source: 'v5', needs: [], tool: 'none' },
    },
    mode: 'moisture',
    modes: {
      moisture: { title: 'Moisture screen', instant: true, bytes: 13820, out: () => ({ SCL: .5, SDA: .5 }), serial: k => 'Moisture: ' + moisturePct(k) + '%' },
      hello: { title: 'Hello, world', instant: true, bytes: 12960, out: () => ({ SCL: .5, SDA: .5 }), banner: 'display.begin() ok' },
      pixels: { title: 'Pixel test', instant: true, bytes: 11240, out: () => ({ SCL: .5, SDA: .5 }) },
      scan: { title: 'I²C scanner', instant: true, bytes: 4520, out: () => ({ SCL: .5, SDA: .5 }),
        serial: k => k % 2 ? 'Scanning...' : 'I2C device found at address 0x3C' },
      'wrong-addr': { title: 'Wrong address 0x3D', instant: true, bytes: 13820, out: () => ({ SCL: .5, SDA: .5 }),
        serial: () => 'begin(0x3D) returned true, but nothing answers at 0x3D: the screen stays dark' },
      off: { title: 'Display off', instant: true, bytes: 12100, out: () => ({}) },
    },
    faults: ['cold:J1'],
    xr: {
      flow: [
        ['VCC', [[hx(pins.indexOf('VCC')), PCBH - 1.6], [hx(pins.indexOf('VCC')), PCBH - 5], [21.6, 10.6]]],
        ['3V3', [[21.6, 9.2], [18, 6], [8, 6]]],
        ['SCL', [[hx(2), PCBH - 1.6], [hx(2), 23.5], [17, 4.5]]],
        ['SDA', [[hx(3), PCBH - 1.6], [hx(3), 23.5], [19, 4.5]]],
      ],
      notes: [['U1', 'SSD1306 DIE ON THE GLASS']],
    },
    tags: [['U1', 40, -34], ['J1', -36, -24]],
    elec: {
      pins: { GND: { role: 'gnd' }, VCC: { role: 'supply', range: [3.3, 5.5], max: 6, mA: 20 },
        SCL: { role: 'i2c-scl', pullup: { ohms: 4700, to: 'VCC' } }, SDA: { role: 'i2c-sda', pullup: { ohms: 4700, to: 'VCC' } } },
      i2c: { addr: ADDR, alt: 0x3d, ram: 1024, note: 'Adafruit_SSD1306 allocates a 1024-byte buffer at begin()' },
    },
    variants: {
      'gnd-vcc': { name: 'Pins GND VCC SCL SDA', patch: () => make('gnd-vcc') },
      'vcc-gnd': { name: 'Pins VCC GND SCL SDA', patch: () => make('vcc-gnd') },
    },
    variant: 'gnd-vcc',
  };
}
B.module(make('gnd-vcc'));
})();
