// @cf title Capacitive soil moisture sensor v1.2
// @cf use engine/bench.list
/* Capacitive soil moisture sensor v1.2 (docs/facts/la-components.md §16): a black FR-4 probe about 98 x 23 mm with a
   pointed tip, the electronics at the top end above a white line that marks how deep it may go into the soil, and a
   3-pin JST-PH (2.0 mm) socket, AOUT VCC GND. The layout is the common one read from product photos (the sheet marks
   the size unverified, ±2 mm); parts carry functional ids because batches print different designators.
   How it works: a 555 timer runs as an astable at about 1.5 MHz; the copper pad inside the probe is one plate of a
   capacitor and the soil around it is the other side, so wetter soil (a higher permittivity) loads the RC and the AC
   amplitude falls. A diode and a capacitor hold the peak, a 1 MΩ bleed resistor lets it fall back, and AOUT is that DC
   level: about 2.6 V in dry air down to about 1.4 V in water, wetter = lower. A 662K (XC6206 class) regulator runs the
   timer from 3.3 V, so the reading does not move with the supply (3.3-5.5 V).
   The two batches: the original design uses a TLC555 (CMOS, runs from 2 V); many clones fit an NE555 (bipolar, needs
   4.5 V), which never starts on the 3.3 V rail, so AOUT sits at a constant level that ignores the water (the level
   depends on where the timer is stuck; we hold it at 1.3 V, which reads as "wet" even in air). Without the bleed
   resistor the reading can only go up: it sticks at the driest value it has seen. */
(() => {
const B = SL.bench, T = B.T;
const LEN = 98, WID = 23, LINE_X = 30, TIP = 11.5;
const MEDIUM = { air: null, dry: 'soil', wet: 'mud', water: 'water', watering: 'cycle' };
const AIR_V = 2.6, WATER_V = 1.4, NE555_V = 1.3;

// soil wetness 0 (dry air) .. 1 (water) for each mode; the watering mode dries for 16 s, then is watered for 4 s
const wetness = (mode, t) => {
  if (mode === 'air') return 0;
  if (mode === 'dry') return .33;
  if (mode === 'wet') return .79;
  if (mode === 'water') return 1;
  const u = ((t % 20) + 20) % 20;
  return u < 16 ? .92 - .045 * u : .2 + (u - 16) / 4 * .72;
};
// AOUT in volts, from the build state: the timer chip, its supply, the bleed resistor
const aoutNow = () => {
  const st = B.st, md = B.md; if (!st || !st.ev || !md) return 0;
  const v3 = (st.ev.rails && st.ev.rails['3V3']) || 0;
  if (md.def.timer === 'ne555') return v3 > 1 ? NE555_V : 0;
  if (v3 < 2) return 0;
  const v = (AIR_V - (AIR_V - WATER_V) * wetness(st.mode, st.t)) * Math.min(1, v3 / 3.3);
  const s = st.soil || (st.soil = { hold: 0, at: -1 });
  if (B.isSet('BLEED')){ s.hold = 0; return v; }
  if (st.t < s.at) s.hold = 0;            // power was cycled: the capacitor has drained
  s.at = st.t; s.hold = Math.max(s.hold, v);
  return s.hold;
};
const reading = v => Math.round(v / 5 * 1023);
const percent = raw => Math.max(0, Math.min(100, Math.round((532 - raw) * 100 / (532 - 286))));

/* the probe: the copper pad under the mask, the max-depth line, and the soil or water it stands in */
B.kind('soil-moisture-probe', {
  group: 'smd', size: () => [LEN - LINE_X - 2, WID - 3], h: .05,
  draw(ctx){
    const st = ctx.st, [l, w] = ctx.p.size, x0 = -l / 2, x1 = l / 2;
    let s = ctx.poly([[x0 + 3, -w / 2 + 2.6], [x1 - TIP - 2, -w / 2 + 2.6], [x1 - 4, 0], [x1 - TIP - 2, w / 2 - 2.6], [x0 + 3, w / 2 - 2.6]], .02, '#2b2a2c', .35);
    s += ctx.poly([[x0 - .3, -w / 2 - 1], [x0 + .3, -w / 2 - 1], [x0 + .3, w / 2 + 1], [x0 - .3, w / 2 + 1]], .03, '#f2efe6', 0);
    const med = MEDIUM[st.mode], wet = wetness(st.mode, st.t);
    if (med && st.power){
      // the soil (or water) the probe stands in, up to the max-depth line: a wash over the probe, not a block
      const col = med === 'water' ? '#5aa9e6' : mix('#b07c4f', '#4a3424', Math.min(1, wet)), op = med === 'water' ? .38 : .5;
      let band = ctx.poly([[x0 + .4, -w / 2 - 1.4], [x1 - TIP + 1.6, -w / 2 - 1.4], [x1 + 1.6, 0], [x1 - TIP + 1.6, w / 2 + 1.4], [x0 + .4, w / 2 + 1.4]], .3, col, 0);
      if (med !== 'water') for (let i = 0; i < 30; i++){ const a = x0 + 2 + ((i * 37) % 97) / 97 * (l - TIP - 2), b = (((i * 53) % 89) / 89 - .5) * w;
        band += ctx.disc(a, b, .32, .3 + (i % 3) * .1, mix('#6b4a2e', '#2f2219', wet), 0); }
      s += `<g opacity="${f(op)}">${band}</g>`;
    }
    if (ctx.k > 0){
      // see-through: the field from the pad reaches into whatever surrounds the probe
      for (let i = 0; i < 7; i++){ const a = x0 + 6 + i * (l - TIP - 10) / 6;
        s += `<path d="${pd([ctx.W(a, w / 2 - 2.6, .1), ctx.W(a, w / 2 + 1.5, 2.2), ctx.W(a, w / 2 + 3, .1)], false)}" fill="none" stroke="#7ec8f0" stroke-width=".5" opacity="${f(ctx.k * .8)}"/>`
          + `<path d="${pd([ctx.W(a, -w / 2 + 2.6, .1), ctx.W(a, -w / 2 - 1.5, 2.2), ctx.W(a, -w / 2 - 3, .1)], false)}" fill="none" stroke="#7ec8f0" stroke-width=".5" opacity="${f(ctx.k * .8)}"/>`; }
    }
    ctx.put(ctx.B(x0, -w / 2 - 3, 0, x1 + 1.5, w / 2 + 3, 1.2), s);
  },
  xrLabel: () => 'PAD + SOIL = A CAPACITOR',
});
/* white 3-pin JST-PH socket, 2.0 mm pitch, opening up */
B.kind('soil-moisture-jst', {
  group: 'tall', size: () => [8, 4.5], h: 6,
  draw(ctx){ const [l, w] = ctx.p.size, h = ctx.p.h, body = { l: '#f7f4ea', m: '#e4dfcf', d: '#b9b29d' };
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h, body, toneI, .8) + ctx.poly([[-l / 2 + .6, -w / 2 + .6], [l / 2 - .6, -w / 2 + .6], [l / 2 - .6, w / 2 - .6], [-l / 2 + .6, w / 2 - .6]], h + .01, '#3b3631', 0);
    for (let i = -1; i <= 1; i++) s += ctx.slab(i * 2 - .25, -.25, i * 2 + .25, .25, h - 2, h + .02, B.M.tin, toneI, .3);
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), s); },
});
/* the cable plug: yellow AOUT, red VCC, black GND, off the end of the mat */
B.kind('soil-moisture-plug', {
  group: 'last', size: () => [6, 3.4], h: 7.5,
  draw(ctx){ const [l, w] = ctx.p.size, h = ctx.p.h, md = B.md;
    ctx.put(ctx.B(-l / 2, -w / 2, 3, l / 2, w / 2, h), ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 3, h, { l: '#fbf8ef', m: '#e9e4d4', d: '#bdb6a0' }, toneI, .7));
    const zMat = -(md.pcb.standoff + md.pcb.thick) + .5, back = ctx.p.at[0] + (md.mat.left || 10) - 1;
    ['#f2c230', '#e2483d', '#3a3632'].forEach((hex, i) => {
      const b = (i - 1) * 2, pts = [];
      for (let j = 0; j <= 8; j++){ const t = j / 8; pts.push([b * (1 - .3 * t), back * t, Math.max(zMat, h + 2.5 * Math.sin(Math.min(1, t * 2) * Math.PI / 2) - (h + 2.5 - zMat) * Math.pow(Math.max(0, t - .3) / .7, 1.5))]); }
      for (let j = 0; j < pts.length - 1; j++){ const p0 = pts[j], p1 = pts[j + 1];
        ctx.put(ctx.B(Math.min(p0[0], p1[0]) - .6, Math.min(p0[1], p1[1]) - .6, Math.min(p0[2], p1[2]) - .6, Math.max(p0[0], p1[0]) + .6, Math.max(p0[1], p1[1]) + .6, Math.max(p0[2], p1[2]) + .6), ctx.rod(p0, p1, .55, matOf(hex), toneI, .5)); }
    }); },
});

const env = (title, key) => ({ title, instant: true, bytes: 2380, out: () => ({ AOUT: 1 }),
  serial: () => { const v = aoutNow(), raw = reading(v); return 'AOUT ' + v.toFixed(2) + ' V · analogRead ' + raw + ' · ' + percent(raw) + ' %'; } });

function make(timer){
  return {
    id: 'soil-moisture', name: 'Capacitive soil moisture sensor v1.2', sub: 'A 555 oscillator and a copper pad: wetter soil gives a lower AOUT voltage',
    timer,
    pcb: { w: LEN, h: WID, thick: 1.6, r: 0, color: '#1b1a1c', silk: '#f2efe6', standoff: .2,
      outline: [[0, 0], [LEN - TIP, 0], [LEN, WID / 2], [LEN - TIP, WID], [0, WID]] },
    mat: { front: 8, back: 8, left: 16, right: 8 }, height: 9, pal: 'mustard', logic: 5,
    holes: [],
    silk: [[8.9, 9.5, 'AOUT', 1.1], [8.9, 11.5, 'VCC', 1.1], [8.9, 13.5, 'GND', 1.1],
      [52, 3.4, 'Capacitive Soil Moisture Sensor v1.2', 1.5], [LINE_X + 2.2, 20.4, 'MAX', 1.1]],
    traces: [[[4.5, 9.5], [12, 9.5], [24.5, 13.8]], [[4.5, 11.5], [9, 14], [10.5, 17.5]], [[10.5, 17.5], [14, 14.5]], [[18, 11.5], [22.5, 8], [26.5, 8]], [[26.5, 8], [LINE_X + 3, 11.5]]],
    parts: [
      { id: 'J1', kind: 'soil-moisture-jst', name: 'Sensor socket (JST-PH, AOUT VCC GND)', short: 'AOUT VCC GND', at: [4.5, 11.5], rot: 90, pitch: 2, pins: ['AOUT', 'VCC', 'GND'] },
      { id: 'CABLE', kind: 'soil-moisture-plug', name: 'Sensor cable plug', short: 'CABLE', at: [4.5, 11.5], rot: 90 },
      { id: 'TIMER', kind: 'soic', name: timer === 'ne555' ? 'NE555 bipolar timer (needs 4.5 V)' : 'TLC555 CMOS timer (runs from 2 V)', short: timer === 'ne555' ? 'NE555' : 'TLC555',
        at: [16, 11.5], n: 4, label: timer === 'ne555' ? 'NE555' : 'TLC555', polar: { fault: 'hot', opts: ['pin 1 dot at the bottom left, as printed', 'pin 1 dot at the top right (backwards)'] },
        nets: { 1: 'GND', 8: '3V3', 3: 'OSC' } },
      { id: 'REG', kind: 'sot23', name: '3.3 V regulator (662K)', short: '662K', at: [10.5, 17.6], rot: 90, label: '662K' },
      { id: 'C_REG', kind: 'chip', name: 'Regulator output capacitor', at: [8.2, 20.2], cap: true, size: [1.6, .8], h: .5 },
      { id: 'R_OSC', kind: 'chip', name: 'Timer resistor (sets the frequency)', at: [12.6, 6.6], size: [1.6, .8], h: .5 },
      { id: 'C_OSC', kind: 'chip', name: 'Timer capacitor', at: [16, 6.6], cap: true, size: [1.6, .8], h: .5 },
      { id: 'R_PAD', kind: 'chip', name: 'Series resistor to the pad (the RC with the soil)', at: [21.4, 14.2], rot: 90, size: [1.6, .8], h: .5 },
      { id: 'DET', kind: 'sod', name: 'Peak-detector diode', at: [22.5, 8.2], size: [2.6, 1.4], h: 1 },
      { id: 'COUT', kind: 'chip', name: 'Output hold capacitor', at: [24.6, 15.4], cap: true, rot: 90, size: [1.6, .8], h: .5 },
      { id: 'BLEED', kind: 'chip', name: '1 MΩ bleed resistor', short: '1 MΩ', at: [26.6, 11], rot: 90, size: [1.6, .8], h: .5, label: '105' },
      { id: 'PAD', kind: 'soil-moisture-probe', name: 'Probe pad (one plate of the capacitor)', short: 'PROBE', at: [LINE_X + (LEN - LINE_X - 2) / 2 + 1, WID / 2], fixed: true },
    ],
    power: {
      sources: {
        v5: { label: '5 V from the board', pin: 'VCC', v: 5, range: [3.3, 5.5], max: 6 },
        v33: { label: '3.3 V from the board', pin: 'VCC', v: 3.3, range: [3.3, 5.5], max: 6 },
      },
      default: 'v5',
      rails: {
        VCC: { from: [{ src: 'v5', via: ['J1', 'CABLE', 'REG'], max: 6 }, { src: 'v33', via: ['J1', 'CABLE', 'REG'], max: 6 }] },
        '3V3': { from: [{ rail: 'VCC', via: ['REG', 'C_REG'], reg: 3.3, dropout: .25 }], max: 3.6 },
        AOUT: { from: [{ rail: '3V3', via: ['TIMER', 'R_OSC', 'C_OSC', 'R_PAD', 'DET', 'COUT'], get reg(){ return aoutNow(); }, dropout: 0 }] },
      },
      mcu: { part: 'TIMER', rail: '3V3', min: 2, needs: ['TIMER'] },
      upload: { source: 'v5', needs: [], tool: 'none' },
    },
    mode: 'watering',
    modes: {
      watering: env('Plant pot', 'watering'),
      air: env('Dry air', 'air'),
      dry: env('Dry soil', 'dry'),
      wet: env('Wet soil', 'wet'),
      water: env('In water', 'water'),
    },
    faults: ['cold:J1'],
    xr: {
      flow: [['3V3', [[10.5, 17.6], [14, 14.5], [16, 11.5]]], ['AOUT', [[26.6, 11], [24.6, 15.4], [12, 9.5], [4.5, 9.5]]], ['VCC', [[4.5, 11.5], [9, 14], [10.5, 17.6]]]],
      notes: [['TIMER', '555 OSCILLATOR ~1.5 MHZ'], ['PAD', 'PAD + SOIL = A CAPACITOR'], ['DET', 'PEAK DETECTOR'], ['BLEED', 'BLEED: LETS IT FALL']],
    },
    tags: [['TIMER', -30, -34], ['REG', -40, 22], ['PAD', 40, -30], ['J1', -40, -14], ['BLEED', 30, 28]],
    elec: {
      pins: { GND: { role: 'gnd' }, VCC: { role: 'supply', range: [3.3, 5.5], max: 6, mA: 5 },
        AOUT: { role: 'analog-out', ohms: 10000, rail: 'AOUT', dry: AIR_V, wet: WATER_V, note: 'wetter = lower; read it with analogRead' } },
      calibrate: { air: reading(AIR_V), water: reading(WATER_V) },
    },
    variants: {
      tlc555: { name: 'TLC555 (works)', patch: () => make('tlc555') },
      ne555: { name: 'NE555 clone (stuck)', patch: () => make('ne555') },
    },
    variant: 'tlc555',
  };
}
B.module(make('tlc555'));
})();
