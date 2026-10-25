// @cf title A4988 stepper driver carrier
// @cf use engine/bench.list
/* Pololu A4988 Stepper Motor Driver Carrier, item #1182, PCB md09b (docs/facts/a4988.md). Every position is a part
   centre from Pololu's STEP model (fact sheet §2.2): a 15.24 x 20.32 mm green board with square corners and no
   mounting holes, held only by its 16 header pins. On top: the Allegro A4988 in a 5 x 5 mm QFN-28 (U1), the
   current-limit trimpot (RV1, its metal rotor is the VREF node), two white 0.068 Ω sense resistors marked R068
   (RS1 for coil 1, RS2 for coil 2), a 4.7 µF 1206 ceramic on VMOT (C1), six 0603 capacitors and four 0603 resistors
   (drawn as two groups: no source says which body is which designator). The real board prints its pin names on the
   underside only, so the top carries no text.
   As built for the Robotics Bench: the two 1 x 8 headers are soldered with the long pins up, for female jumpers on
   the mat, as on the TB6612FNG bench. Left (H1, control): DIR, STEP, SLP, RST, MS3, MS2, MS1, EN from the bottom.
   Right (H2, power and motor): GND, VDD, 1B, 1A, 2A, 2B, GND, VMOT. Two things go on after soldering: a jumper cap
   across SLP and RST (LINK; RST floats on the board and the driver never runs without it) and the 100 µF
   electrolytic Pololu asks for across VMOT and GND (CB), lying on the mat with its legs on the two pins.
   Electrical model (Allegro A4988 datasheet, fact sheet §3): VMOT 8-35 V (35 V absolute), VDD 3-5.5 V with UVLO at
   2.8 V, no reverse-polarity protection anywhere. The current limit is I_MAX = VREF / (8 x 0.068 Ω), so 0.544 V on the
   rotor sets 1.0 A; full step puts 70.71 % of it in each coil. One coil path (high-side plus low-side DMOS) is about
   0.64 Ω at 25 °C. Thermal shutdown at 165 °C with 15 °C of hysteresis. B.a4988 holds those numbers for the bench. */
(() => {
const B = SL.bench, M = B.M;
const PAL = 'mint';                         // src/content/ids.ts ROBOTICS.a4988.palette
const RS = .068;                            // sense resistors, ohms (white "R068" bodies, since 2017)
const VREF_FOUND = .30;                     // where the bench's pot starts (a pot arrives wherever it was left)
const VREF_SET = .544;                      // 1.0 A, Pololu's figure for a bare carrier
const R_PATH = .64;                         // one coil's path through two DMOS switches at 25 °C, typical
const TSD = 165, TSD_HYST = 15;
const imax = vref => vref / (8 * RS);
B.a4988 = { RS, VREF_FOUND, VREF_SET, R_PATH, TSD, TSD_HYST, imax };

// a pin level from the program: the module's own net, or the controller pin wired to it (a bench's pinMap)
const level = (pins, net) => {
  if (pins[net] != null) return +pins[net] || 0;
  const map = (B.md && B.md.def.pinMap) || {};
  for (const [pin, to] of Object.entries(map)) if (to === net && pins[pin] != null) return +pins[pin] || 0;
  return 0;
};
B.a4988.level = level;
const u1Of = st => (st.meas && st.meas.U1) || {};

/* U1: the QFN-28, and in see-through the die: the translator, and the two H-bridges lit by their coil current */
B.kind('a4988-qfn', {
  group: 'smd', size: () => [5, 5], h: .9,
  draw(ctx){
    B.kinds.qfn.draw(ctx);
    const p = ctx.p, h = p.h, u = u1Of(ctx.st), t = ctx.st.t || 0;
    if (u.dead){
      // a cracked, scorched package and a thin smoke trail: the inductive spike went through the outputs
      const blob = Array.from({ length: 9 }, (_, i) => { const a = i / 9 * 2 * Math.PI, r = 1.1 + .35 * Math.sin(i * 2.3); return [r * Math.cos(a) + .3, r * Math.sin(a) - .2]; });
      let s = ctx.poly(blob, h + .02, '#3a2f29', 0) + ctx.line([[-.6, -1.4, h + .03], [.1, -.2, h + .03], [.9, .5, h + .03], [1.5, 1.6, h + .03]], .3, '#141210');
      if (ctx.st.power) for (let i = 0; i < 3; i++){ const ph = (t * .5 + i / 3) % 1, [X, Y] = ctx.P(.3, -.2, h + 1 + ph * 12);
        s += `<circle cx="${f(X + Math.sin(ph * 6 + i) * 2)}" cy="${f(Y)}" r="${f(1.2 + ph * 3)}" fill="#8f8a84" opacity="${f(.45 * (1 - ph))}"/>`; }
      ctx.put(ctx.B(-1.6, -1.6, h + .01, 1.6, 1.6, h + .04), s);
    } else if (ctx.st.power && u.tj > 95){
      // heat shimmer over the chip, stronger as it nears the 165 °C cut-out
      const k = Math.min(1, (u.tj - 95) / 70), [X, Y] = ctx.P(0, 0, h + 1);
      let s = '';
      for (let i = 0; i < 3; i++){ const x = X - 4 + i * 4, ph = Math.sin(t * 5 + i);
        s += `<path d="M${f(x)} ${f(Y)}q${f(2 + ph)} -3 0 -6q${f(-2 - ph)} -3 0 -6" fill="none" stroke="#e2483d" stroke-width=".8" opacity="${f(.25 + .5 * k)}"/>`; }
      ctx.put(ctx.B(-.5, -.5, h + .01, .5, .5, h + .02), s);
    }
  },
  xr(ctx){
    const p = ctx.p, h = p.h, k = ctx.k, u = u1Of(ctx.st), on = ctx.st.power && !u.dead && !u.trip;
    const DIE = B.mat('#7d86ad'), ON = '#ffd34d', OFF = '#454b6a';
    let s = ctx.slab(-1.9, -1.9, 1.9, 1.9, h * .45, h * .55, DIE, toneI, .4);
    // translator and DAC in the middle; bridge 1 (coil 1, 1A/1B) and bridge 2 (2A/2B) toward the motor header (+x)
    s += ctx.slab(-1.5, -.6, -.2, .6, h * .55, h * .62, B.mat('#9aa1c4'), toneI, .3);
    const cur = [Math.abs(+u.ia || 0), Math.abs(+u.ib || 0)], imx = Math.max(.2, +u.imax || 1);
    [[-.9, 0], [.9, 1]].forEach(([b, i]) => {
      const g = on ? Math.min(1, cur[i] / imx) : 0;
      for (const [da, db] of [[.25, -.35], [.95, -.35], [.25, .35], [.95, .35]]){
        const a0 = da, b0 = b + db;
        s += ctx.slab(a0 - .28, b0 - .28, a0 + .28, b0 + .28, h * .55, h * .62, B.mat(g > .05 ? mix(OFF, ON, .35 + .65 * g) : OFF), toneI, .25);
      }
      if (g > .05) s += ctx.glow(.6, b, h * .64, 1 + g, ON, .35 * g * k);
    });
    ctx.put(ctx.B(-2.5, -2.5, h + .01, 2.5, 2.5, h + .03), `<g opacity="${f(k)}">${s}</g>`);
  },
  xrLabel: () => 'TRANSLATOR + TWO H-BRIDGES',
});

/* RV1: the SMD trimmer that sets VREF; its cross-slotted metal rotor turns with the setting (clockwise raises VREF) */
B.kind('a4988-pot', {
  group: 'smd', size: () => [3.6, 3.1], h: 1.15,
  draw(ctx){
    const p = ctx.p, [l, w] = p.size, h = p.h, u = u1Of(ctx.st), vref = u.pot != null ? +u.pot : VREF_FOUND;
    const q = -vref * 2.4, c = Math.cos(q), s0 = Math.sin(q);
    let s = ctx.slab(-l / 2 + .3, -w / 2, -l / 2 + 1.1, -w / 2 + .5, 0, .2, M.tin, toneI, .3) + ctx.slab(l / 2 - 1.1, -w / 2, l / 2 - .3, -w / 2 + .5, 0, .2, M.tin, toneI, .3)
      + ctx.slab(-.5, w / 2 - .5, .5, w / 2, 0, .2, M.tin, toneI, .3);
    s += ctx.slab(-l / 2 + .1, -w / 2 + .3, l / 2 - .1, w / 2 - .2, 0, .55, M.white, toneI, .5);
    s += ctx.cyl(0, 0, .55, h, 1.05, M.steel, toneI, .5, 16);
    const slot = (a, b) => ctx.line([[-.78 * a, -.78 * b, h + .01], [.78 * a, .78 * b, h + .01]], .36, '#3d4245');
    s += slot(c, s0) + slot(-s0, c);
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), s);
  },
});

/* RS1, RS2: 0.068 Ω current-sense resistors, white bodies marked R068 */
B.kind('a4988-sense', {
  group: 'smd', size: () => [2.2, 1.35], h: .64,
  draw(ctx){
    const p = ctx.p, [l, w] = p.size, h = p.h, e = .45;
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), ctx.slab(-l / 2 + e, -w / 2, l / 2 - e, w / 2, 0, h, M.white, toneI, .45)
      + ctx.slab(-l / 2, -w / 2, -l / 2 + e, w / 2, 0, h, M.tin, toneI, .45) + ctx.slab(l / 2 - e, -w / 2, l / 2, w / 2, 0, h, M.tin, toneI, .45)
      + ctx.text(0, -.22, h + .01, 'R068', .55, '#4b4641', 700));
  },
});

/* the 0603 capacitors and resistors, as two selectable groups */
B.kind('a4988-passives', {
  group: 'smd', size: p => p.size || [6, 6], h: .9,
  draw(ctx){
    const p = ctx.p, res = { l: '#3c3935', m: '#2c2a27', d: '#1c1b19' };
    for (const [x, y, kind, r = 0] of p.spots || []){
      const [a, b] = B.localOf(p, x, y), along = ((r - (p.rot || 0)) % 180) ? [.45, .85] : [.85, .45], hh = kind === 'c' ? .9 : .65;
      const body = kind === 'c' ? M.tan : res, [qa, qb] = along, ea = qa > qb ? .2 : 0, eb = qb > qa ? .2 : 0;
      let s = ctx.slab(a - qa + ea, b - qb + eb, a + qa - ea, b + qb - eb, 0, hh, body, toneI, .3);
      s += ctx.slab(a - qa, b - qb, a - qa + (ea || 2 * qa), b - qb + (eb || 2 * qb), 0, hh, M.tin, toneI, .25)
        + ctx.slab(a + qa - (ea || 2 * qa), b + qb - (eb || 2 * qb), a + qa, b + qb, 0, hh, M.tin, toneI, .25);
      ctx.put(ctx.B(a - qa, b - qb, 0, a + qa, b + qb, hh), s);
    }
  },
});
const scatter = (spots, extra) => {
  const xs = spots.map(s => s[0]), ys = spots.map(s => s[1]);
  const x0 = Math.min(...xs) - 1, x1 = Math.max(...xs) + 1, y0 = Math.min(...ys) - 1, y1 = Math.max(...ys) + 1;
  return Object.assign({ kind: 'a4988-passives', at: [(x0 + x1) / 2, (y0 + y1) / 2], size: [x1 - x0, y1 - y0], spots }, extra);
};

/* LINK: a 2.54 mm jumper cap pushed over the SLP and RST pins, so RESET follows SLEEP's pull-up */
B.kind('a4988-link', {
  group: 'last', size: () => [5.08, 2.54], h: 8.5,
  draw(ctx){
    const z0 = 4.1, z1 = 10.2;
    const s = ctx.slab(-2.45, -1.2, 2.45, 1.2, z0, z1, M.blackPl, toneI, .7) + ctx.poly([[-1.9, -.7], [1.9, -.7], [1.9, .7], [-1.9, .7]], z1 + .01, '#4b4641', .3);
    ctx.put(ctx.B(-2.45, -1.2, z0, 2.45, 1.2, z1), s);
  },
});

/* CB: the 100 µF 35 V electrolytic lying on the mat beside the board, its legs on the VMOT and GND pins. The minus
   stripe faces GND as fitted; backwards it is reverse-biased by the pack, heats and vents. `pins` (board mm) are the
   two pins its legs go to, VMOT first. */
const CAN = { l: '#3f62a8', m: '#2f4f8f', d: '#1f3466' };
B.kind('a4988-bulk', {
  group: 'last', size: () => [11, 6.3], h: 6.3,
  draw(ctx){
    const p = ctx.p, [l, w] = p.size, r = w / 2, zc = r, pop = ctx.pop, rv = ctx.rev ? 1 : -1;
    let s = ctx.rod([-l / 2, 0, zc], [l / 2, 0, zc], r, CAN, toneI, .9);
    // the minus stripe along the -y side (+y when backwards), and the vent cross on the far end
    s += ctx.line([[-l / 2 + .6, rv * r * .98, zc + .4], [l / 2 - .4, rv * r * .98, zc + .4]], 1.3, '#e9e4d6');
    if (pop) s += ctx.rod([l / 2, 0, zc], [l / 2 + 1.3, 0, zc], r * .8, B.mat('#7b6a55'), toneI, .6);
    ctx.put(ctx.B(-l / 2, -r, 0, l / 2 + (pop ? 1.3 : 0), r, w), s);
    // the legs: out of the -x end, bent up onto the two pins (at the height of the pin above the header plastic)
    const pins = p.pins || [];
    pins.forEach(([px, py], i) => {
      const [a, b] = B.localOf(p, px, py), b0 = i ? -1.25 : 1.25, top = -(p.z || 0) + 4;
      const q0 = [-l / 2, b0, zc], q1 = [-l / 2 - .9, b0, zc], q2 = [a + .35, b, top];
      for (const [u, v] of [[q0, q1], [q1, q2]]) ctx.put(B.aabb([ctx.W(...u), ctx.W(...v)]).map((q, j) => q.map(x => x + (j ? .3 : -.3))), ctx.rod(u, v, .25, M.tin, toneI, .3));
    });
    if (pop && ctx.st.power){ const t = ctx.st.t || 0; let sm = '';
      for (let i = 0; i < 3; i++){ const ph = (t * .6 + i / 3) % 1, [X, Y] = ctx.P(l / 2 + 1.3, 0, zc + 2 + ph * 14); sm += `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(1.4 + ph * 3.5)}" fill="#a29c94" opacity="${f(.5 * (1 - ph))}"/>`; }
      ctx.put(ctx.B(l / 2, -1, zc + 2, l / 2 + 1.4, 1, zc + 3), sm); }
  },
});

const H1 = ['DIR', 'STEP', 'SLP', 'RST', 'MS3', 'MS2', 'MS1', 'EN'];
const H2 = ['GND', 'VDD', 'OUT1B', 'OUT1A', 'OUT2A', 'OUT2B', 'GND', 'VMOT'];
const MSG_ON = 'VMOT and VDD on, RST tied to SLP: the A4988 holds the motor at its Home step';

B.module({
  id: 'a4988', fig: '07', pal: PAL,
  name: 'A4988 stepper driver carrier',
  sub: 'Pololu #1182: Allegro A4988, motor supply 8-35 V, logic 3-5.5 V, about 1 A per coil without a heat sink',
  pcb: { w: 15.24, h: 20.32, thick: 1.57, r: 0, color: '#2e8b3a', silk: '#f4f6ef', standoff: 0 },
  mat: { front: 5, back: 5, left: 5, right: 17 },
  height: 10.2, logic: 5,
  holes: [],
  silk: [],
  traces: [
    [[13.97, 19.05], [11.62, 18.41], [8.72, 18.41], [7.0, 15.4], [6.6, 13.8]],
    [[13.97, 8.89], [12.2, 9.6], [8.34, 10.6]], [[13.97, 6.35], [12.0, 7.6], [8.34, 9.8]],
    [[13.97, 11.43], [12.2, 11.6], [8.34, 12.0]], [[13.97, 13.97], [12.2, 13.0], [8.34, 12.8]],
    [[1.27, 3.81], [2.6, 5.4], [4.2, 7.6], [5.0, 8.8]], [[1.27, 1.27], [2.2, 2.4], [2.8, 7.4], [3.34, 9.6]],
    [[8.73, 2.79], [7.6, 5.6], [6.6, 8.8]], [[11.30, 5.38], [11.3, 4.2], [13.97, 1.27]], [[11.30, 16.47], [12.6, 17.2], [13.97, 16.51]],
  ],
  parts: [
    { id: 'U1', kind: 'a4988-qfn', name: 'Allegro A4988 microstepping driver (QFN-28)', short: 'A4988', at: [5.84, 11.30], size: [5, 5], h: .9, n: 7, label: '4988ET',
      nets: { 1: 'OUT2B', 2: 'EN', 3: 'GND', 9: 'MS1', 10: 'MS2', 11: 'MS3', 12: 'RST', 14: 'SLP', 15: 'VDD', 16: 'STEP', 17: 'VREF', 18: 'GND', 19: 'DIR', 21: 'OUT1B',
        22: 'VMOT', 24: 'OUT1A', 26: 'OUT2A', 28: 'VMOT' } },
    { id: 'RV1', kind: 'a4988-pot', name: 'Current-limit trimpot (its rotor is VREF)', short: 'VREF POT', at: [8.73, 2.79], h: 1.15 },
    { id: 'RS1', kind: 'a4988-sense', name: '0.068 Ω sense resistor, coil 1', short: 'R068', at: [11.30, 6.48], rot: 90 },
    { id: 'RS2', kind: 'a4988-sense', name: '0.068 Ω sense resistor, coil 2', short: 'R068', at: [11.30, 15.37], rot: 90 },
    { id: 'C1', kind: 'chip', name: '4.7 µF ceramic capacitor on VMOT', short: '4.7 µF', at: [10.17, 18.41], size: [3.4, 1.8], h: 1.8, cap: true },
    scatter([[5.71, 5.71, 'c', 0], [9.40, 6.35, 'c', 90], [9.40, 15.75, 'c', 90], [5.84, 16.13, 'c', 0], [3.43, 17.02, 'c', 90], [6.60, 18.42, 'c', 90]],
      { id: 'CAPS', name: 'Six 0603 capacitors: VMOT, charge pump, VDD and VREG decoupling', short: 'CAPS' }),
    scatter([[3.43, 1.90, 'r', 90], [3.43, 5.21, 'r', 90], [11.81, 2.79, 'r', 90], [4.32, 19.18, 'r', 0]],
      { id: 'RES', name: 'Four 0603 resistors: SLP pull-up, EN pull-down, ROSC and the VREF divider', short: 'R' }),
    { id: 'H1', kind: 'male', name: 'Control header (DIR, STEP, SLP, RST, MS3, MS2, MS1, EN)', short: 'CONTROL', at: [1.27, 10.16], rot: 90, h: 8.5,
      pins: H1, labels: ['DIR', 'STEP', 'SLP', 'RST', 'MS3', 'MS2', 'MS1', 'EN'] },
    { id: 'H2', kind: 'male', name: 'Power and motor header (GND, VDD, 1B, 1A, 2A, 2B, GND, VMOT)', short: 'POWER + MOTOR', at: [13.97, 10.16], rot: 90, h: 8.5,
      pins: H2, labels: ['GND', 'VDD', '1B', '1A', '2A', '2B', 'GND', 'VMOT'] },
    { id: 'LINK', kind: 'a4988-link', name: 'Jumper cap tying RST to SLP', short: 'RST-SLP', at: [1.27, 7.62], rot: 90, size: [5.08, 2.54] },
    { id: 'CB', kind: 'a4988-bulk', name: '100 µF electrolytic across VMOT and GND', short: '100 µF', at: [21.7, 17.78], size: [11, 6.3], h: 6.3, z: -1.57,
      pins: [[13.97, 19.05], [13.97, 16.51]], polar: { fault: 'pop', rail: 'VMOT', opts: ['stripe (minus) toward GND', 'stripe toward VMOT (backwards)'] } },
  ],
  power: {
    sources: {
      // one switch for both supplies, as on the bench: the controller's 5 V on VDD, the motor supply on VMOT. VDD
      // follows the controller, not the pack, so its feed ignores the pack's voltage (dropout -40).
      bench: { label: 'Bench power: 5 V logic on VDD, motor supply on VMOT', pin: 'VMOT', v: 8.4, range: [8, 35], max: 35 },
    },
    default: 'bench',
    rails: {
      VMOT: { from: [{ src: 'bench', via: ['H2', 'U1'] }], max: 35, victim: 'U1' },
      VDD: { from: [{ src: 'bench', via: ['H2'], reg: 5, dropout: -40 }], max: 5.5 },
    },
    mcu: { part: 'U1', rail: 'VDD', min: 2.8, needs: ['U1', 'H1', 'H2', 'LINK'] },
    upload: { source: 'bench', needs: [], tool: 'none' },
  },
  mode: 'hold',
  modes: {
    hold: { title: 'Hold (no steps)', instant: true, bytes: 0, powerMsg: MSG_ON, out: () => ({ STEP: 0, DIR: 1 }) },
    step: { title: 'Step at 200 per second', instant: true, bytes: 0, powerMsg: MSG_ON, out: (st, t) => ({ STEP: (t * 200) % 1 < .5 ? 1 : 0, DIR: 1 }) },
  },
  faults: ['missing:LINK'],
  xr: {
    flow: [
      ['VMOT', [[13.97, 19.05], [11.62, 18.41], [8.72, 18.41], [7.0, 15.4], [6.6, 13.8]]],
      ['STEP', [[1.27, 3.81], [2.6, 5.4], [4.2, 7.6], [5.0, 8.8]]],
      ['DIR', [[1.27, 1.27], [2.2, 2.4], [2.8, 7.4], [3.34, 9.6]]],
      ['VREF', [[8.73, 2.79], [7.6, 5.6], [6.6, 8.8]]],
      ['OUT1A', [[8.34, 10.6], [12.2, 9.6], [13.97, 8.89]]],
      ['OUT1B', [[8.34, 9.8], [12.0, 7.6], [13.97, 6.35]]],
      ['OUT2A', [[8.34, 12.0], [12.2, 11.6], [13.97, 11.43]]],
      ['OUT2B', [[8.34, 12.8], [12.2, 13.0], [13.97, 13.97]]],
    ],
    notes: [['U1', 'TRANSLATOR + TWO H-BRIDGES'], ['RV1', 'VREF = 8 x I x 0.068']],
  },
  tags: [['U1', -44, 30], ['RV1', 36, -30], ['H1', -46, -16], ['H2', 44, 22], ['CB', 40, -12]],
});
})();
