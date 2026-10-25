// @cf title QTR-8RC reflectance sensor array
// @cf use engine/bench.list
/* Pololu QTR-8RC Reflectance Sensor Array, item 961, PCB IRS02A (docs/facts/qtr8rc.md). Board frame: the component
   side up, the header edge at y = 0, sensor 1 on the left. Every position is from Pololu's drill DXF (holes, header,
   pads) and their STEP model (sensor, resistor and capacitor centres): a red 74.93 x 12.70 mm board, square corners,
   four 2.18 mm holes, eight QRE1113-style sensors in a row at 9.525 mm. Nothing through-hole comes fitted: the kit's
   header goes on the back, so its pins point away from the floor once the sensors face down. Row A (y = 3.81) is the
   11 x 1 header (GND, VCC, LEDON, OUT1-OUT8); row B under it, the 3.3V BYPASS pads, the 2-sensor piece's own pads and
   the break-off resistor pads stay empty. A column of vias at x = 55.88 is where the board snaps into 6 + 2 sensors.
   How it works: each sensor is an IR LED and a phototransistor side by side. The LEDs run as four series pairs (1+2,
   3+4, 5+6, 7+8), each through a 47 Ω resistor, then a shared 47 Ω stage and an N-MOSFET (Q1) whose gate is LEDON,
   pulled up by 47 kΩ, so the LEDs are on unless the host pulls LEDON low. Each output is RC: the host drives OUTn HIGH
   for 10 µs (the 10 nF has nothing across it), lets go, and times the fall. Bright (white) reflects a lot of IR, the
   phototransistor pulls the node down in about 120 µs; black reflects almost nothing and the library gives up at its
   2500 µs timeout. VCC 3.3-5 V, about 100 mA, no regulator, no fuse, no reverse-polarity diode. Below about 3.3 V the
   LEDs fade and every sensor reads black; the bypass pads short the shared stage for 3.3 V use and at 5 V that drives
   the strings past the LEDs' 50 mA rating. */
(() => {
const B = SL.bench;
const PAL = 'tomato';                              // src/content/ids.ts ROBOTICS['qtr-8rc'].palette
const SX = Array.from({ length: 8 }, (_, i) => 4.128 + 9.525 * i), SY = 9.92;
const WHITE_US = 120, TIMEOUT = 2500;              // Pololu app note: 120 µs over white at 3 mm, 2.6 ms over black
const SIGMA = .55;                                 // the line's footprint in sensor pitches (19 mm tape under 9.5 mm pitch)
const PAIRS = [[0, 1], [2, 3], [4, 5], [6, 7]], STRING_R = ['R3', 'R9', 'R13', 'R16'];

const dark = pos => SX.map((_, i) => pos == null ? 0 : Math.exp(-((i - pos) ** 2) / (2 * SIGMA * SIGMA)));
// LED current against 5 V: two 1.2 V LEDs and about 141 Ω per string
const drive = vcc => vcc <= 2.4 ? 0 : (vcc - 2.4) / 2.6;

/* one read of all eight: { us, lit } for a line at `pos` (sensor units, null = no line), with what is fitted, the
   faults in force and VCC. Shared with the robotics bench (figures/robotics/qtr-8rc.js). */
function read(st, pos, opts = {}){
  const faults = st.faults || [], has = f => faults.includes(f), vcc = opts.vcc != null ? opts.vcc : ((st.ev && st.ev.rails && st.ev.rails.VCC) || 0);
  const emit = opts.emitters !== false && B.isSet('Q1') && B.isSet('R1') && B.isSet('R2');
  const burnt = has('bypass-5v') ? [4, 5] : [];
  const lit = SX.map((_, i) => {
    const pair = PAIRS.findIndex(p => p.includes(i));
    return emit && B.isSet(STRING_R[pair]) && !burnt.includes(i) && B.isSet('U' + (PAIRS[pair][0] + 1)) && B.isSet('U' + (PAIRS[pair][1] + 1)) ? drive(vcc) * (has('bypass-5v') ? 2.1 : 1) : 0;
  });
  const d = dark(pos), sun = has('ambient-ir') ? 3 : 0;
  const us = SX.map((_, i) => {
    if (!B.isSet('U' + (i + 1))) return TIMEOUT;
    if (i === 0 && has('cold:J1.4') && Math.floor((st.t || 0) * 3.3) % 3 === 0) return TIMEOUT;
    const light = lit[i] * (1 - .954 * d[i]) + sun;
    return light > 0 ? Math.min(TIMEOUT, Math.round(WHITE_US / light)) : TIMEOUT;
  });
  return { us, lit };
}

// readLineBlack() on readings calibrated against a 5 V white card (120 µs) and black tape (2500 µs)
const calibrated = us => us.map(v => Math.max(0, Math.min(1000, Math.round((v - WHITE_US) * 1000 / (TIMEOUT - WHITE_US)))));
function position(us, last = 3500){
  const v = calibrated(us);
  let num = 0, den = 0, on = false;
  v.forEach((x, i) => { if (x > 200) on = true; if (x > 50){ num += x * i * 1000; den += x; } });
  if (!on) return { pos: last < 3500 ? 0 : 7000, lost: true, cal: v };
  return { pos: Math.round(num / den), lost: false, cal: v };
}
B.qtr = { SX, SY, read, position, calibrated, dark, drive, WHITE_US, TIMEOUT };

/* one sensor: matte black body with two windows stacked along y, two gull-wing leads each side. In see-through the
   LED die glows violet while it emits (what a phone camera shows: IR is invisible to the eye) and the photo-
   transistor lights with the IR coming back. While the host reads, a column over each sensor shows its RC time. */
B.kind('qtr-sensor', {
  group: 'smd', size: () => [2.8, 3.6], h: 1.5,
  draw(ctx){
    const p = ctx.p, h = p.h, q = ctx.st.qtr, i = +p.id.slice(1) - 1;
    let s = '';
    for (const sx of [-1, 1]) for (const sy of [-.9, .9]) s += ctx.slab(sx * 1.4 - (sx < 0 ? .85 : 0), sy - .27, sx * 1.4 + (sx > 0 ? .85 : 0), sy + .27, 0, .3, B.M.tin, toneI, .3);
    s += ctx.slab(-1.4, -1.8, 1.4, 1.8, 0, h, B.M.black, toneI, .55);
    for (const wy of [-.85, .85]) s += ctx.poly([[-.75, wy - .6], [.75, wy - .6], [.75, wy + .6], [-.75, wy + .6]], h + .01, '#14130f', .3);
    ctx.put(ctx.B(-2.25, -1.8, 0, 2.25, 1.8, h), s);
    if (!q || !q.run || !(ctx.k < .5)) return;
    const us = q.us[i], u = us / TIMEOUT, top = h + 1.2 + u * 6;
    const col = B.mat(mix('#f4f1e6', '#26231f', u));
    ctx.put(ctx.B(-.5, -.5, h + 1, .5, .5, top), ctx.slab(-.45, -.45, .45, .45, h + 1, top, col, toneI, .45));
  },
  xr(ctx){
    const p = ctx.p, h = p.h, k = ctx.k, q = ctx.st.qtr, i = +p.id.slice(1) - 1;
    const lit = q && q.run ? Math.min(1, q.lit[i]) : 0, back = q && q.run ? Math.min(1, WHITE_US / q.us[i]) : 0;
    let s = ctx.slab(-.45, .45, .45, 1.25, h * .4, h * .5, B.mat(lit ? '#c58cff' : '#5d5670'), toneI, .3)
      + ctx.slab(-.5, -1.3, .5, -.4, h * .4, h * .5, B.mat(back > .05 ? mix('#4d5578', '#ffd34d', back) : '#4d5578'), toneI, .3);
    if (lit) s += ctx.glow(0, .85, h + .3, 1.6, '#c58cff', .45 * lit * k);
    ctx.put(ctx.B(-1, -1.4, h * .4, 1, 1.4, h * .5 + .02), `<g opacity="${f(k)}">${s}</g>`);
  },
  xrLabel: () => 'IR LED + PHOTOTRANSISTOR',
});

/* the 11-pin header soldered from the back: on the component side only its eleven joints show; the plastic and the
   pins hang under the board and are drawn only from the header's own edge (or see-through), since the engine paints
   the board before its parts */
B.kind('qtr-header', {
  group: 'low', size: p => [p.pins.length * 2.54, 2.54], h: 8.5, pins: p => B.rowPins(p),
  draw(ctx){
    const p = ctx.p, [l, w] = p.size, th = B.md.pcb.thick, at = B.rowPins(p).map(([x, y]) => B.localOf(p, x, y)[0]);
    let joints = '', under = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, 2.5, B.M.blackPl, toneI, .6);
    for (const a of at){
      joints += ctx.cyl(a, 0, -th - .55, -th, .75, B.M.tin, toneI, .35, 12) + ctx.cyl(a, 0, -th - 1.2, -th - .55, .32, B.M.gold, toneI, .3, 8);
      under += ctx.slab(a - .32, -.32, a + .32, .32, 2.5, p.h, B.M.gold, toneI, .35);
    }
    ctx.put(ctx.B(-l / 2, -1, -th - 1.2, l / 2, 1, -th), joints);
    if (vis(sub(ctx.W(0, -1, 0), ctx.W(0, 0, 0))) || ctx.k > 0) ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, p.h), ctx.k > 0 ? `<g opacity="${f(1 - .6 * ctx.k)}">${under}</g>` : under);
  },
});

// the 3.3V BYPASS pads; bridged (the bypass-5v fault) they carry a solder blob
B.kind('qtr-bypass', {
  group: 'smd', size: () => [4.4, 1.8], h: .05,
  draw(ctx){
    const bridged = (ctx.st.faults || []).includes('bypass-5v');
    let s = ctx.disc(-1.27, 0, .03, .8, B.M.tin.l, .35) + ctx.disc(1.27, 0, .03, .8, B.M.tin.l, .35);
    if (bridged) s += ctx.slab(-1.5, -.55, 1.5, .55, .03, .6, B.M.tin, toneI, .45);
    ctx.put(ctx.B(-2.2, -.9, 0, 2.2, .9, bridged ? .65 : .06), s);
  },
});

// the snap line: a column of small vias at x = 55.88
const PERF_Y = [.51, 1.27, 2.03, 2.79, 3.56, 4.32, 6.6, 7.37, 8.13, 8.89, 9.65, 10.41, 12.19];
B.kind('qtr-perf', {
  group: 'smd', size: () => [.8, 12.7], h: .05,
  draw(ctx){
    let s = '';
    for (const y of PERF_Y){ const b = y - 6.35; s += ctx.disc(0, b, .03, .32, B.M.tin.l, .2) + ctx.disc(0, b, .04, .16, B.M.hole, 0); }
    ctx.put(ctx.B(-.4, -6.35, 0, .4, 6.35, .06), s);
  },
});

const r603 = (id, name, at, rot = 0) => ({ id, kind: 'chip', name, at, rot, size: [1.6, .8], h: .65 });
const c603 = (id, name, at, rot = 0) => ({ id, kind: 'chip', name, at, rot, size: [1.6, .8], h: .9, cap: true });

/* the module page's programs: a host sketch reading the array while a card with black tape moves under it */
const sweepPos = t => 3.5 + 3.5 * Math.sin(2 * Math.PI * t / 8);
const programs = {
  raw: { title: 'Raw RC times (read)', line: sweepPos, print: r => r.us.join('\t') },
  line: { title: 'Line position (readLineBlack)', line: sweepPos, print: (r, st) => 'position ' + position(r.us, st.qtrLast).pos },
  white: { title: 'Over a white card', line: () => null, print: r => r.us.join('\t') },
  dark: { title: 'Emitters off (LEDON low)', line: sweepPos, emitters: false, print: r => r.us.join('\t') + '   (LEDON low: no IR)' },
};
const modes = Object.fromEntries(Object.entries(programs).map(([id, pr]) => [id, { title: pr.title, instant: true, bytes: 0, out: () => ({ LEDON: pr.emitters === false ? 0 : 1 }),
  serial: (k, st) => (st.qtr && st.qtr.run ? pr.print(st.qtr, st) : null) }]));

function model(st){
  const pr = programs[st.mode] || programs.raw, run = !!(st.ev && st.ev.status === 'running') && st.t >= 0;
  const pos = run ? pr.line(st.t) : null, r = read(st, pos, { emitters: pr.emitters !== false });
  const p = position(r.us, st.qtrLast);
  if (run) st.qtrLast = p.pos;
  st.qtr = { run, us: r.us, lit: r.lit, pos: p.pos, line: pos };
  const vcc = (st.ev && st.ev.rails && st.ev.rails.VCC) || 0, mA = Math.round(r.lit.reduce((a, x, i) => a + (i % 2 ? 0 : x * 20), 0));
  let status = 'Unpowered';
  if (st.power && st.ev.status === 'fault') status = 'Fault: unplug and repair';
  else if (st.power && !run) status = 'Powered, nothing reading it';
  else if (run) status = r.lit.every(x => !x) ? 'No IR: every sensor reads black' : p.lost ? 'Line lost' : 'Line at ' + p.pos;
  return {
    status,
    stats: run ? [['VCC', vcc.toFixed(1) + ' V · ' + mA + ' mA'], ['Sensor 1', r.us[0] + ' µs']] : [],
    report: { qtr: { us: r.us, pos: run ? p.pos : null, lost: run ? p.lost : null } },
    flow: { LEDON: run && pr.emitters !== false, OUT1: run, OUT8: run },
  };
}

B.module({
  id: 'qtr-8rc', fig: '11', pal: PAL,
  name: 'QTR-8RC reflectance sensor array',
  sub: 'Eight IR reflectance sensors read by timing: about 120 µs over white, past 2.5 ms over black tape',
  pcb: { w: 74.93, h: 12.7, thick: 1.57, r: 0, color: '#cc1f1f', silk: '#f6f4ea', standoff: 8.5 },
  mat: { front: 9, back: 9, left: 8, right: 8 },
  height: 12, logic: 5,
  holes: [[2.54, 2.54, 2.18], [53.34, 2.54, 2.18], [58.42, 2.54, 2.18], [72.39, 2.54, 2.18]],
  silk: [[48.6, .9, 'TOP', .8], ...SX.map((x, i) => [x, 12.05, String(i + 1), .8])],
  traces: [
    [[23.495, 3.81], [23.495, 5.6], [10.53, 5.6], [10.53, 6.48]], [[26.035, 3.81], [26.035, 1.9], [17.4, 1.9], [14.98, 2.49]],
    [[28.575, 3.81], [27.94, 7.62], [5.3, 8.2], [4.128, 9.02]], [[46.355, 3.81], [47.2, 5.2], [69.6, 5.97], [70.803, 9.02]],
  ],
  parts: [
    ...SX.map((x, i) => ({ id: 'U' + (i + 1), kind: 'qtr-sensor', name: `Reflectance sensor ${i + 1}: IR LED and phototransistor (QRE1113 type)`, short: 'SENSOR ' + (i + 1), at: [x, SY] })),
    { id: 'Q1', kind: 'sot23', name: 'N-MOSFET: switches all eight IR LEDs (gate = LEDON, 47 kΩ pull-up)', short: 'LED SWITCH', at: [14.98, 2.49], rot: 90, size: [2.9, 1.4], h: 1.2 },
    r603('R1', '47 Ω shared LED stage (one of two in parallel)', [7.75, 3.56]),
    r603('R2', '47 Ω shared LED stage (one of two in parallel)', [7.75, 5.21]),
    r603('R3', '47 Ω in the LED string of sensors 1 and 2', [8.89, 10.79]),
    r603('R4', '47 kΩ LEDON pull-up (LEDs on unless pulled low)', [12.32, 2.41], 90),
    r603('R9', '47 Ω in the LED string of sensors 3 and 4', [27.94, 10.79]),
    r603('R13', '47 Ω in the LED string of sensors 5 and 6', [46.99, 10.79]),
    r603('R16', '47 Ω in the LED string of sensors 7 and 8', [66.04, 10.79]),
    ...[['R5', [13.08, 5.59]], ['R6', [17.91, 3.36], 90], ['R7', [21.46, 6.98]], ['R8', [27.94, 7.62]], ['R10', [32.64, 6.6]], ['R11', [40.89, 6.73]],
      ['R12', [46.1, 7.87], 90], ['R14', [61.72, 4.95], 90], ['R15', [65.15, 8.13], 90]]
      .map(([id, at, rot]) => r603(id, '220 Ω in series with an output', at, rot)),
    ...[['C1', [8.0, 7.11]], ['C2', [10.53, 6.48], 90], ['C3', [17.51, 8.13], 90], ['C4', [19.29, 9.78], 90], ['C5', [37.47, 7.14]], ['C6', [37.46, 8.93]],
      ['C7', [47.88, 7.87], 90], ['C8', [52.07, 6.86]], ['C9', [64.04, 4.95], 90], ['C10', [66.94, 8.13], 90], ['C11', [67.82, 4.06]], ['C12', [69.6, 5.97]]]
      .map(([id, at, rot]) => c603(id, '10 nF timing or 0.1/1 µF decoupling capacitor', at, rot)),
    { id: 'PERF', kind: 'qtr-perf', name: 'Snap line: break here for a 6-sensor and a 2-sensor board', at: [55.88, 6.35], fixed: true },
    { id: 'BYP', kind: 'qtr-bypass', name: '3.3V BYPASS pads: bridge only for 3.3 V', short: '3.3V BYPASS', at: [8.255, 1.27], fixed: true },
    { id: 'JB', kind: 'pads', name: 'Row B pads (for an 8 x 2 header), left empty', at: [37.465, 1.27], d: 1.6, fixed: true,
      pins: ['LEDON', 'VCC', 'GND', 'GND', 'GND', 'GND', 'GND', 'GND'] },
    { id: 'J2', kind: 'pads', name: 'Pads of the 2-sensor piece (OUT7, OUT8, VCC, GND)', at: [65.405, 1.27], d: 1.6, fixed: true, pins: ['OUT7', 'OUT8', 'VCC', 'GND'] },
    { id: 'RBRK', kind: 'pads', name: 'Pads for the 100 Ω resistor, fitted only after snapping the board', at: [57.404, 8.509], rot: 90, d: 1.4, fixed: true, pins: ['VCC', 'LED78'] },
    { id: 'J1', kind: 'qtr-header', name: '11-pin header on the back: GND, VCC, LEDON, OUT1-OUT8', short: 'HEADER', side: 'bottom', at: [33.655, 3.81], h: 8.5,
      pins: ['GND', 'VCC', 'LEDON', 'OUT1', 'OUT2', 'OUT3', 'OUT4', 'OUT5', 'OUT6', 'OUT7', 'OUT8'], labels: ['GND', 'VCC', 'LEDON', '1', '2', '3', '4', '5', '6', '7', '8'] },
  ],
  power: {
    sources: {
      v5: { label: '5 V from the board', v: 5, range: [3.3, 5] },
    },
    default: 'v5',
    rails: {
      // no regulator: VCC goes straight to the LED strings; past about 9 V they run over their 50 mA rating
      VCC: { from: [{ src: 'v5', via: ['J1'] }], max: 9, victim: 'U1' },
    },
    // no chip on the board: the LED switch stands in for "working"
    mcu: { part: 'Q1', rail: 'VCC', min: 2.5, needs: ['J1'] },
    upload: { source: 'v5', needs: [], tool: 'none' },
  },
  mode: 'raw',
  modes,
  faults: [['bypass-5v', 'Bridge 3.3V BYPASS on 5 V'], ['missing:R9', 'Leave out R9 (LED string 3+4)'], ['cold:J1.4', 'Cold joint on OUT1'],
    ['ambient-ir', 'Sunlight on the floor'], 'missing:Q1'],
  model,
  xr: {
    flow: [
      ['LEDON', [[26.035, 3.81], [26.035, 1.9], [17.4, 1.9], [14.98, 2.49]]],
      ['VCC', [[23.495, 3.81], [23.495, 5.6], [10.53, 5.6], [10.53, 6.48]]],
      ['OUT1', [[28.575, 3.81], [27.94, 7.62], [5.3, 8.2], [4.128, 9.02]]],
      ['OUT8', [[46.355, 3.81], [47.2, 5.2], [69.6, 5.97], [70.803, 9.02]]],
    ],
    notes: [['U1', 'IR LED + PHOTOTRANSISTOR'], ['Q1', 'LED SWITCH (LEDON)']],
  },
  tags: [['U1', -36, -30], ['U8', 36, -30], ['J1', 30, 34], ['Q1', -30, 34], ['BYP', -46, 14]],
  elec: {
    pins: { GND: { role: 'gnd' }, VCC: { role: 'supply', range: [3.3, 5], mA: 100 },
      LEDON: { role: 'in', pullup: { ohms: 47000, to: 'VCC' }, note: 'LOW turns every IR LED off' },
      OUT1: { role: 'rc', note: 'drive HIGH 10 µs, release, time the fall: ~120 µs white, 2500 µs (timeout) black' } },
    rc: { whiteUs: WHITE_US, timeoutUs: TIMEOUT, pitchMm: 9.525, sensors: 8 },
  },
});
})();
