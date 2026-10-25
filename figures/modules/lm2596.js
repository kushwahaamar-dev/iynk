// @cf title LM2596 buck converter
// @cf use engine/bench.list
/* The blue "LM2596 DC-DC step-down module with LED voltmeter", the single-button 2596-SDC layout (docs/facts/lm2596.md,
   variant A): 66 x 34 mm, four M3 corner holes, input terminal J1 on the left edge (IN+ above IN-), output terminal J2
   on the right (OUT+ above OUT-), the LM2596S-ADJ in its TO-263-5 with its tab toward the top edge, the 33 µH shielded
   inductor beside it, the SS34 catch diode under its leads, two 220 µF 50 V electrolytics, the blue 25-turn 3296W
   trimmer against the top edge, and a 3-digit red display along the bottom with IN/OUT LEDs and the select button.
   No maker publishes design files: every centre is measured from a top-down product photo (fact sheet §2, ±0.5 mm).
   The converter (TI LM2596 datasheet SNVS124G, fact sheet §3):
   - Vout = 1.23 V x (1 + R2 / 330 Ω), R2 the 10 kΩ trimmer: 400 Ω a turn, so 5 V is 2.53 turns from the low end and
     the top (25 turns) asks for 38.5 V. Clockwise raises it. A pot arrives wherever it was left, often at the top.
   - It only steps down: at 100 % duty Vout = Vin - dropout, 0.745 V + 0.175 V/A (datasheet Fig 7-6: 0.92 V at 1 A,
     1.27 V at 3 A) plus the inductor's copper (0.08 Ω, assumed).
   - Losses: the switch's saturation drop (0.65 + 0.17 V/A, Fig 7-4) for the on-time, the Schottky's forward drop
     (0.35 + 0.05 V/A) for the off-time, the inductor's copper, switching (assumed 1.2 % of Vin x I) and 5 mA quiescent;
     the voltmeter circuit draws 15 mA from the input (unverified, 10-20 mA). About 80 % at 5 V, as Fig 7-3 says.
   - Current limit 4.5 A peak, about 4.2 A average once the ripple is taken off; a heavier load pulls Vout down.
   - Heat: the TO-263 at 50 °C/W on this small board, the SMA-size SS34 at 80 °C/W (assumed), a short bench-time
     constant. The datasheet gives no thermal-shutdown point; the bench uses 150 °C (assumed).
   - The display: IN after power-up, SW1 toggles IN and OUT (LED_IN / LED_OUT show which), x.xx under 10 V, xx.x above;
     it reads 0.03 V high here (the vendors give ±0.1 V), which is why you set the output with a meter.
   - No reverse protection, no fuse, no under-voltage cut-off: the meter goes dark under about 4 V, the converter keeps
     switching to about 3.6 V. B.lm2596 holds the converter for the bench, which adds what hangs on the output. */
(() => {
const B = SL.bench, M = B.M;
const PAL = 'cobalt';                       // src/content/ids.ts ROBOTICS.lm2596.palette
const VFB = 1.23, R1 = 330, OHM_TURN = 400, TURNS = 25;
const DCR = .08, IQ = .005, IMETER = .015, ILIM = 4.2, VMIN = 3.6, VDISP = 4;
const THETA_U1 = 50, THETA_D1 = 80, TAU = 3, TSD = 150, TSD_HYST = 15, D1_FAIL = 150;   // °C, all assumed
const TURN_RATE = 5;                        // turns a second while you work the screwdriver
const DISP_ERR = .03;                       // the module's own voltmeter reads a little high
const vset = turns => VFB * (1 + Math.max(0, Math.min(TURNS, turns)) * OHM_TURN / R1);
const turnsFor = v => R1 * (v / VFB - 1) / OHM_TURN;
const dropout = i => .745 + .175 * i + DCR * i;
const vsat = i => .65 + .17 * i, vf = i => .35 + .05 * i;
// what each instant mode asks the screwdriver for (null: leave the pot where it is)
const TARGET = { found: null, set5: turnsFor(5), set33: turnsFor(3.3), set12: turnsFor(12) };

/* the converter at an input voltage, with the pot asking for vs and a load that draws load(v) amps at v volts */
function convert(vin, vs, load, opts = {}){
  if (vin < VMIN || opts.dead) return { vout: 0, i: 0, d: 0, sat: false, limited: false, pU1: vin > .5 ? vin * IQ : 0, pD1: 0, pL1: 0, iin: vin > .5 ? IQ + (vin >= VDISP ? IMETER : 0) : 0, eff: 0 };
  let vout = vs, i = 0, sat = false, limited = false;
  for (let k = 0; k < 8 && i <= ILIM; k++){
    const vmax = vin - dropout(i);
    sat = vs >= vmax; vout = Math.max(0, Math.min(vs, vmax)); i = load(vout);
  }
  if (i > ILIM){
    // the switch hits its limit: find the voltage at which the load draws exactly what the converter can give
    let lo = 0, hi = vout;
    for (let k = 0; k < 30; k++){ const mid = (lo + hi) / 2; if (load(mid) > ILIM) hi = mid; else lo = mid; }
    vout = lo; i = ILIM; limited = true; sat = false;
  }
  const d = sat ? 1 : Math.min(1, (vout + vf(i)) / Math.max(.1, vin - vsat(i) + vf(i)));
  const pU1 = vsat(i) * i * d + .012 * vin * i + vin * IQ, pD1 = vf(i) * i * (1 - d), pL1 = DCR * i * i;
  const iin = (vout * i + pU1 + pD1 + pL1) / vin + IMETER;
  return { vout, i, d, sat, limited, pU1, pD1, pL1, iin, eff: vout * i > 0 ? vout * i / (vin * iin) : 0 };
}

/* one frame of the module: the pot, the display button, the converter, the heat. `load(v)` is what the bench hangs on
   OUT; `opts.fbOpen` (the trimmer's wiper off), `opts.short` (OUT shorted) come from the bench's faults. */
function step(st, dt, load = () => 0, opts = {}){
  const s = st.lm || (st.lm = { turns: TURNS, set: false, disp: 'IN', sw: 0, tj: 25, td: 25, trip: false, d1dead: false });
  const ev = st.ev || { rails: {} }, run = ev.status === 'running' && st.t >= 0, vin = st.power ? (ev.rails || {}).VIN || 0 : 0;
  // SW1 toggles the display between IN and OUT; the meter boots showing IN
  const sw = (st.ctl || {}).SW1 ? 1 : 0;
  if (sw && !s.sw && vin >= VDISP) s.disp = s.disp === 'IN' ? 'OUT' : 'IN';
  s.sw = sw;
  if (!st.power) s.disp = 'IN';
  // the trimmer: an instant mode is you with a screwdriver, turning toward the voltage it names
  const target = TARGET[st.mode];
  if (target != null && B.isSet('RV1') && dt > 0){
    const dir = Math.sign(target - s.turns);
    s.turns = dir > 0 ? Math.min(target, s.turns + TURN_RATE * dt) : Math.max(target, s.turns - TURN_RATE * dt);
  }
  s.set = target != null && Math.abs(s.turns - target) < 1e-6;
  // the wiper off (or the pot missing): FB sees only R1 to ground, the regulator goes flat out
  const fbOpen = !!opts.fbOpen || !B.isSet('RV1');
  const vs = fbOpen ? 99 : vset(s.turns);
  const c = convert(run ? vin : 0, vs, opts.short ? v => v / .01 : load, { dead: s.trip || s.d1dead });
  // a shorted output: the diode carries the limit current almost all the time; the SS34 cooks
  const pD1 = s.d1dead ? 0 : c.pD1;
  if (!st.power){ s.tj = 25; s.td = 25; s.trip = false; }
  else if (dt > 0){
    const k = 1 - Math.exp(-dt / TAU);
    s.tj += (25 + THETA_U1 * c.pU1 - s.tj) * k; s.td += (25 + THETA_D1 * pD1 - s.td) * k;
  }
  if (s.tj >= TSD) s.trip = true; else if (s.tj <= TSD - TSD_HYST) s.trip = false;
  if (opts.short && s.td >= D1_FAIL) s.d1dead = true;
  if (!opts.short) s.d1dead = false;          // a repair fits a new diode
  const shown = s.disp === 'IN' ? vin : c.vout, lit = st.power && vin >= VDISP && ev.status !== 'fault';
  const text = !lit ? '' : (shown + DISP_ERR < 10 ? (shown + DISP_ERR).toFixed(2) : (shown + DISP_ERR).toFixed(1));
  return { s, c, vin, vs, fbOpen, run, disp: { text, shows: lit ? s.disp : 'off' } };
}
B.lm2596 = { VFB, R1, OHM_TURN, TURNS, ILIM, TARGET, vset, turnsFor, dropout, convert, step };

// the module on its own page: nothing on OUT, the display and the pot as on the bench
function model(st, dt){
  const r = step(st, dt), c = r.c, s = r.s;
  return {
    meas: { U1: { vout: Math.round(c.vout * 100) / 100, vset: Math.round(r.vs * 100) / 100, duty: Math.round(c.d * 100) / 100, turns: Math.round(s.turns * 100) / 100,
      set: s.set, sat: c.sat, limited: c.limited, tj: Math.round(s.tj), trip: s.trip }, DS1: r.disp, D1: { dead: s.d1dead, tc: Math.round(s.td) } },
    status: !st.power ? 'Unpowered' : !r.run ? 'Input too low' : c.sat ? 'Vset > Vin: 100 % duty' : 'Regulating',
    stats: st.power ? [['IN', r.vin.toFixed(2) + ' V'], ['OUT', c.vout.toFixed(2) + ' V'], ['Trimmer', ['{n} turns', { n: s.turns.toFixed(1) }]]] : [],
    flow: { VIN: r.vin > .5, SW: c.vout > .1, VOUT: c.vout > .1, FB: c.vout > .1 },
  };
}

const u1Of = st => (st.meas && st.meas.U1) || {};
const BLUE = { l: '#3f7fd6', m: '#2f63b0', d: '#1d3f78' }, FERRITE = { l: '#5d5a56', m: '#45423f', d: '#2c2a28' };

/* U1: the TO-263-5, tab (pin 3, GND) toward the top edge, five gull-wing leads toward the diode */
B.kind('lm2596-to263', {
  group: 'smd', size: () => [10.1, 15.3], h: 4.4,
  draw(ctx){
    const h = ctx.p.h, u = u1Of(ctx.st), t = ctx.st.t || 0;
    let s = ctx.slab(-4.8, 4.2, 4.8, 7.65, 0, .45, M.tin, toneI, .6);
    for (const a of [-3.5, -1.7, 0, 1.8, 3.5]){
      s += ctx.slab(a - .4, -7.65, a + .4, -5.6, 0, .25, M.tin, toneI, .35);
      s += ctx.line([[a, -2.95, 1.5], [a, -4.9, 1.5], [a, -5.7, .2]], .75, M.tin.m);
    }
    s += ctx.slab(-5.05, -2.95, 5.05, 5.65, .2, h, M.black, toneI, .8);
    s += ctx.text(0, 2.6, h + .01, 'LM2596S', 1.2, '#d8d2c0') + ctx.text(0, 1, h + .01, '-ADJ', 1.05, '#d8d2c0') + ctx.text(0, -.6, h + .01, 'P+', .85, '#d8d2c0');
    ctx.put(ctx.B(-5.05, -7.65, 0, 5.05, 7.65, h), s);
    if (ctx.st.power && u.tj > 60){
      const k = Math.min(1, (u.tj - 60) / 60), [X, Y] = ctx.P(0, 1, h + 1);
      let w = '';
      for (let i = 0; i < 3; i++){ const x = X - 5 + i * 5, ph = Math.sin(t * 5 + i);
        w += `<path d="M${f(x)} ${f(Y)}q${f(2 + ph)} -3 0 -6q${f(-2 - ph)} -3 0 -6" fill="none" stroke="#e2483d" stroke-width=".8" opacity="${f(.25 + .5 * k)}"/>`; }
      ctx.put(ctx.B(-.5, .5, h + .01, .5, 1.5, h + .02), w);
    }
  },
  xr(ctx){
    const h = ctx.p.h, k = ctx.k, u = u1Of(ctx.st), on = ctx.st.power && u.vout > .1 && !u.trip;
    let s = ctx.slab(-1.4, 1.6, 1.4, 4.4, h * .4, h * .5, B.mat('#7d86ad'), toneI, .4);
    s += ctx.slab(-1, 2, .1, 4, h * .5, h * .56, B.mat(on ? '#ffd34d' : '#454b6a'), toneI, .3);
    if (on) s += ctx.glow(-.45, 3, h * .58, 1.6 + (u.duty || 0), '#ffd34d', .35 * k);
    ctx.put(ctx.B(-1.6, 1.4, h + .01, 1.6, 4.6, h + .03), `<g opacity="${f(k)}">${s}</g>`);
  },
  xrLabel: () => 'SWITCH + 1.23 V REFERENCE',
});

/* L1: 33 µH shielded drum inductor, 12 x 12 mm, "330" on top, terminals on its left and right faces */
B.kind('lm2596-ind', {
  group: 'smd', size: () => [12.5, 11.6], h: 7,
  draw(ctx){
    const h = ctx.p.h;
    let s = ctx.slab(-6.25, -2, -5.6, 2, 0, 1.8, M.tin, toneI, .5) + ctx.slab(5.6, -2, 6.25, 2, 0, 1.8, M.tin, toneI, .5);
    s += ctx.slab(-5.6, -5.6, 5.6, 5.6, .2, h, FERRITE, toneI, .8);
    s += ctx.disc(0, 0, h + .01, 4.3, '#3a3734', .5) + ctx.text(0, -.9, h + .02, '330', 2.4, '#e9e4d6');
    ctx.put(ctx.B(-6.25, -5.6, 0, 6.25, 5.6, h), s);
  },
  xr(ctx){
    const h = ctx.p.h, k = ctx.k, u = u1Of(ctx.st), on = ctx.st.power && u.vout > .1;
    const s = ctx.disc(0, 0, h * .5, 3.6, M.copper.m, .6) + ctx.disc(0, 0, h * .5 + .01, 1.6, '#45423f', .4) + (on ? ctx.glow(0, 0, h * .5, 4.4, '#f0a46b', .3 * k) : '');
    ctx.put(ctx.B(-3.6, -3.6, h + .01, 3.6, 3.6, h + .03), `<g opacity="${f(k)}">${s}</g>`);
  },
  xrLabel: () => 'WINDING ON A FERRITE DRUM',
});

/* RV1: the 3296W 25-turn trimmer, blue, its brass screw at the left end; the slot turns with the setting */
B.kind('lm2596-trim', {
  group: 'low', size: () => [9.53, 4.83], h: 10.03,
  draw(ctx){
    const h = ctx.p.h, u = u1Of(ctx.st), turns = u.turns != null ? +u.turns : TURNS, q = turns * 2 * Math.PI, c = Math.cos(q), sn = Math.sin(q);
    let s = ctx.slab(-4.76, -2.41, 4.76, 2.41, 0, h, BLUE, toneI, .8);
    s += ctx.cyl(-3.5, 1, h, h + .5, 1.1, M.gold, toneI, .5, 14);
    s += ctx.line([[-3.5 - .9 * c, 1 - .9 * sn, h + .52], [-3.5 + .9 * c, 1 + .9 * sn, h + .52]], .35, '#5b4a22');
    s += ctx.text(1.4, -.8, h + .01, 'W103', 1.25, '#e9eef8');
    ctx.put(ctx.B(-4.76, -2.41, 0, 4.76, 2.41, h + .5), s);
  },
});

/* J1, J2: blue 2-way 5.0 mm screw terminals, wire entries out of the board edge (the part's -y side) */
const termPins = p => p.pins.map((_, i) => { const r = (p.rot || 0) * Math.PI / 180, a = (i - (p.pins.length - 1) / 2) * 5;
  return [p.at[0] + a * Math.cos(r), p.at[1] + a * Math.sin(r)]; });
B.kind('lm2596-term', {
  group: 'tall', size: p => [p.pins.length * 5, 8.4], h: 10,
  pins: termPins,
  draw(ctx){
    const p = ctx.p, n = p.pins.length, l = n * 5, w = 8.4, h = p.h;
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h * .55, BLUE, toneI, .8) + ctx.slab(-l / 2, -w * .05, l / 2, w / 2, h * .55, h, BLUE, toneI, .8);
    for (let i = 0; i < n; i++){
      const a = (i - (n - 1) / 2) * 5;
      s += ctx.slab(a - 1.7, -w / 2 - .02, a + 1.7, -w / 2 + .3, 1.2, 4.6, B.mat('#1d2c44'), toneI, .4);
      s += ctx.cyl(a, w * .22, h, h + .3, 1.6, M.steel, toneI, .6) + ctx.line([[a - 1.1, w * .22, h + .32], [a + 1.1, w * .22, h + .32]], .5, '#5b6266');
    }
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h + .3), s);
  },
  xrLabel: () => 'SCREW CLAMPS',
});

/* DS1: the 3-digit red 0.36 in display, slanted 10°, a decimal point after each digit; it shows meas.DS1.text */
const SEG = { a: [[-1.5, 4.2], [1.5, 4.2]], b: [[1.9, 3.8], [1.9, .35]], c: [[1.9, -.35], [1.9, -3.8]], d: [[-1.5, -4.2], [1.5, -4.2]],
  e: [[-1.9, -.35], [-1.9, -3.8]], f: [[-1.9, 3.8], [-1.9, .35]], g: [[-1.5, 0], [1.5, 0]] };
const DIGIT = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
B.kind('lm2596-disp', {
  group: 'low', size: () => [22.7, 13.7], h: 7,
  draw(ctx){
    const [l, w] = ctx.p.size, h = ctx.p.h, d = ((ctx.st.meas || {}).DS1) || {}, text = String(d.text || ''), col = '#ff3b2f';
    const chars = text.replace('.', ''), dp = text.indexOf('.') - 1;
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h, B.mat('#2b2927'), toneI, .7);
    const sl = y => y * .18;
    for (let i = 0; i < 3; i++){
      const cx = (i - 1) * 7, code = text ? DIGIT[chars[i]] || '' : '';
      for (const [k, [[a0, b0], [a1, b1]]] of Object.entries(SEG)){ const on = code.includes(k);
        s += `<path d="${pd([ctx.W(cx + a0 + sl(b0), b0, h + .02), ctx.W(cx + a1 + sl(b1), b1, h + .02)], false)}" fill="none" stroke="${on ? col : '#4a4642'}" stroke-width="1.3" stroke-linecap="round"/>`; }
      s += ctx.disc(cx + 2.9 + sl(-4.2), -4.2, h + .02, .45, text && dp === i ? col : '#4a4642', 0);
      if (code) s += ctx.glow(cx, 0, h, 4.6, col, .22);
    }
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), s);
  },
  xrLabel: () => 'LED DIGITS, MULTIPLEXED',
});

/* the meter circuit's small parts and the second SOT-23s, scattered left of the display */
B.kind('lm2596-bits', {
  group: 'smd', size: p => p.size, h: 1.1,
  draw(ctx){
    const p = ctx.p, res = { l: '#3c3935', m: '#2c2a27', d: '#1c1b19' };
    for (const [x, y, kind, r = 0] of p.spots){
      const [a, b] = B.localOf(p, x, y);
      if (kind === 'q'){
        let s = ctx.slab(a - 1.45, b - .65, a + 1.45, b + .65, .1, 1.1, M.black, toneI, .4);
        for (const [da, db] of [[-.95, -1.1], [.95, -1.1], [0, 1.1]]) s += ctx.slab(a + da - .2, b + db - .3, a + da + .2, b + db + .3, 0, .3, M.tin, toneI, .25);
        ctx.put(ctx.B(a - 1.5, b - 1.45, 0, a + 1.5, b + 1.45, 1.1), s); continue;
      }
      const [qa, qb] = r ? [.45, .85] : [.85, .45], hh = kind === 'c' ? .8 : .5, body = kind === 'c' ? M.tan : res;
      const s = ctx.slab(a - qa, b - qb, a + qa, b + qb, 0, hh, body, toneI, .3)
        + (r ? ctx.slab(a - qa, b - qb, a + qa, b - qb + .25, 0, hh + .01, M.tin, toneI, .2) + ctx.slab(a - qa, b + qb - .25, a + qa, b + qb, 0, hh + .01, M.tin, toneI, .2)
          : ctx.slab(a - qa, b - qb, a - qa + .25, b + qb, 0, hh + .01, M.tin, toneI, .2) + ctx.slab(a + qa - .25, b - qb, a + qa, b + qb, 0, hh + .01, M.tin, toneI, .2));
      ctx.put(ctx.B(a - qa, b - qb, 0, a + qa, b + qb, hh), s);
    }
  },
});
const BITS = [[11, 3.5, 'r'], [13, 3.5, 'c'], [15, 3.5, 'r'], [11, 6, 'c', 1], [19.5, 4.5, 'q'], [19.5, 8.5, 'q'], [11.5, 9.5, 'r', 1], [13.5, 9.5, 'r', 1],
  [20.8, 14.2, 'c'], [11.5, 13, 'c'], [13.5, 13.5, 'r'], [20.5, 2, 'r']];
const bitsBox = (() => { const xs = BITS.map(b => b[0]), ys = BITS.map(b => b[1]), x0 = Math.min(...xs) - 1.5, x1 = Math.max(...xs) + 1.5, y0 = Math.min(...ys) - 1.5, y1 = Math.max(...ys) + 1.5;
  return { at: [(x0 + x1) / 2, (y0 + y1) / 2], size: [x1 - x0, y1 - y0] }; })();

const MSG_ON = 'IN+ live: the LM2596 switches at 150 kHz and the display shows the input';
// LED_IN and LED_OUT say which voltage the display shows (the model keeps it in st.lm.disp)
const leds = st => { const d = (st.lm || {}).disp || 'IN'; return { SHOW_IN: d === 'IN' ? 1 : 0, SHOW_OUT: d === 'OUT' ? 1 : 0 }; };
// the paper sum for each screwdriver setting, printed as bench notes every 5 s (the module has no serial port)
const NOTES = {
  found: 'Vset = 1.23 x (1 + 10000 / 330) = 38.5 V, more than IN: OUT = IN - dropout',
  set5: 'Vout = 1.23 x (1 + 1011 / 330) = 5.00 V',
  set33: 'Vout = 1.23 x (1 + 555 / 330) = 3.30 V',
  set12: 'Vset = 1.23 x (1 + 2890 / 330) = 12.0 V, more than IN: OUT = IN - dropout',
};
const BANNER = '-- bench notes --';
const notes = id => k => (k % 5 === 0 ? NOTES[id] : null);
Object.assign(B.lm2596, { leds, NOTES, BANNER, notes });

B.module({
  id: 'lm2596', fig: '12', pal: PAL,
  name: 'LM2596 buck converter module',
  sub: '2596-SDC: LM2596S-ADJ, 4.5-40 V in, 1.25 V up to the input out, 2 A without a heatsink, with a 3-digit voltmeter',
  pcb: { w: 66, h: 34, thick: 1.6, r: .5, color: '#2457a8', silk: '#f4f6ef', standoff: 3 },
  mat: { front: 8, back: 8, left: 12, right: 12 },
  height: 12.5, logic: 5,
  holes: [[2.8, 3.4, 3.1], [2.8, 31.6, 3.1], [63.1, 3.4, 3.1], [63.1, 31.6, 3.1]],
  silk: [
    [53.8, 31.1, '2596-SDC', 1.5], [3.8, 28.0, 'IN+', 1.1], [3.5, 6.2, 'IN-', 1.1], [62.5, 28.0, 'OUT+', 1.1], [62.5, 6.2, 'OUT-', 1.1],
    [48.5, 13.0, 'IN', .9], [55.5, 13.0, 'OUT', .9], [32.0, 29.4, 'R7', .7], [45.2, 28.6, 'C5', .7],
  ],
  traces: [
    [[4.0, 20.0], [9, 20.5], [14.2, 24.2]], [[14.2, 24.2], [18, 19.5], [21.3, 18.6]],
    [[23.1, 18.6], [23.1, 16.6], [27.2, 16.6], [32.75, 21.6]], [[45.25, 21.6], [48, 24.5], [52.9, 24.5]], [[52.9, 24.5], [58, 20], [62.8, 20.0]],
    [[26.6, 18.6], [30, 24], [32.0, 31.7], [35.6, 32.3]], [[4.0, 14.9], [12, 12], [30, 14.5], [62.8, 14.9]],
  ],
  parts: [
    { id: 'U1', kind: 'lm2596-to263', name: 'LM2596S-ADJ buck regulator (TO-263-5)', short: 'LM2596', at: [24.8, 26.15], size: [10.1, 15.3], h: 4.4 },
    { id: 'L1', kind: 'lm2596-ind', name: '33 µH shielded inductor ("330")', short: '33 µH', at: [39.0, 21.6], size: [12.5, 11.6], h: 7 },
    { id: 'D1', kind: 'sod', name: 'SS34 Schottky catch diode', short: 'SS34', at: [24.8, 16.6], size: [6.8, 2.8], h: 2.2 },
    { id: 'U2', kind: 'sot223', name: 'Regulator for the voltmeter circuit (SOT-89)', short: 'METER REG', at: [16.9, 11.4], size: [4.5, 2.5], h: 1.5 },
    { id: 'BITS', kind: 'lm2596-bits', name: 'Voltmeter circuit: divider resistors, decoupling and two SOT-23s', short: 'METER PARTS', ...bitsBox, spots: BITS },
    { id: 'R7', kind: 'chip', name: 'Feedback-network resistor by the trimmer', at: [32.0, 31.7], rot: 90, size: [2, 1.25], h: .5 },
    { id: 'C5', kind: 'chip', name: 'Feedback-network capacitor', at: [45.2, 30.9], rot: 90, size: [2, 1.25], h: .8, cap: true },
    { id: 'X1', kind: 'sod', name: 'Small black two-terminal part by the input (unidentified)', short: 'X1', at: [10.9, 32.1], size: [3.8, 2.2], h: 2 },
    { id: 'LED_IN', kind: 'led', name: 'IN indicator LED (display shows the input)', short: 'IN', at: [48.5, 10.5], led: { color: '#e8392e', net: 'SHOW_IN' } },
    { id: 'LED_OUT', kind: 'led', name: 'OUT indicator LED (display shows the output)', short: 'OUT', at: [55.8, 10.5], led: { color: '#e8392e', net: 'SHOW_OUT' } },
    { id: 'SW1', kind: 'tact', name: 'Display select button (IN / OUT)', short: 'SW1', at: [53.0, 3.7], size: [6, 6], h: 5, group: 'smd', control: { type: 'button', action: 'select' } },
    { id: 'RV1', kind: 'lm2596-trim', name: '10 kΩ 25-turn trimmer (sets Vout)', short: 'TRIMMER', at: [39.1, 31.3], size: [9.53, 4.83], h: 10.03 },
    { id: 'DS1', kind: 'lm2596-disp', name: '3-digit red LED voltmeter display', short: 'DISPLAY', at: [33.1, 7.2], size: [22.7, 13.7], h: 7 },
    { id: 'C1', kind: 'ecap', name: '220 µF 50 V input capacitor', short: '220 µF IN', at: [14.2, 24.2], size: [10, 10], h: 12.5, sleeve: '#2c2b2e',
      polar: { fault: 'pop', rail: 'VIN', opts: ['stripe (minus) toward the board edge, as printed', 'stripe inward (backwards)'] } },
    { id: 'C2', kind: 'ecap', name: '220 µF 50 V output capacitor', short: '220 µF OUT', at: [52.9, 24.5], size: [10, 10], h: 12.5, sleeve: '#2c2b2e',
      polar: { fault: 'pop', rail: 'VIN', opts: ['stripe (minus) toward the board edge, as printed', 'stripe inward (backwards)'] } },
    { id: 'J1', kind: 'lm2596-term', name: 'Input terminal (IN+, IN-)', short: 'IN', at: [4.2, 17.45], rot: 270, pins: ['VIN', 'GND'], labels: ['IN+', 'IN-'] },
    { id: 'J2', kind: 'lm2596-term', name: 'Output terminal (OUT-, OUT+)', short: 'OUT', at: [62.0, 17.45], rot: 90, pins: ['GND', 'VOUT'], labels: ['OUT-', 'OUT+'] },
  ],
  power: {
    sources: {
      bench: { label: 'Supply on IN+ / IN-', part: 'J1', pin: 'J1.1', v: 8.4, range: [4.5, 40], max: 40 },
    },
    default: 'bench',
    rails: {
      // a reversed supply goes straight into U1's substrate diode; past 40 V the SS34 is reverse-biased past its rating
      VIN: { from: [{ src: 'bench', via: ['J1'], burns: 'U1' }], max: 40, victim: 'D1' },
    },
    // "running" is the converter switching: it needs its power path; the trimmer is the bench model's business
    mcu: { part: 'U1', rail: 'VIN', min: 4.5, needs: ['U1', 'L1', 'D1', 'J1', 'J2'] },
    upload: { source: 'bench', needs: [], tool: 'none' },
  },
  mode: 'found',
  // the modes are a screwdriver on the trimmer, not sketches
  modesLabel: { button: 'Turn the trimmer', stat: 'Trimmer' },
  modes: {
    found: { title: 'Trimmer as delivered', instant: true, bytes: 0, powerMsg: MSG_ON, out: leds, banner: BANNER, serial: notes('found') },
    set5: { title: 'Turn the trimmer to 5 V', instant: true, bytes: 0, powerMsg: MSG_ON, out: leds, banner: BANNER, serial: notes('set5') },
  },
  model,
  xr: {
    flow: [
      ['VIN', [[4.0, 20.0], [9, 20.5], [14.2, 24.2], [18, 19.5], [21.3, 18.6]]],
      ['SW', [[23.1, 18.6], [23.1, 16.6], [27.2, 16.6], [32.75, 21.6]]],
      ['VOUT', [[45.25, 21.6], [48, 24.5], [52.9, 24.5], [58, 20], [62.8, 20.0]]],
      ['FB', [[35.6, 32.3], [32.0, 31.7], [30, 24], [26.6, 18.6]]],
    ],
    notes: [['U1', 'SWITCH + 1.23 V REFERENCE'], ['L1', 'STORES ENERGY 150 000 TIMES A SECOND'], ['RV1', 'VOUT = 1.23 x (1 + R2 / 330)']],
  },
  tags: [['U1', -30, 36], ['L1', 34, 34], ['RV1', 0, 44], ['D1', -40, -10], ['DS1', -30, -34], ['J1', -44, 10], ['J2', 44, -10], ['SW1', 30, -30]],
});
})();
