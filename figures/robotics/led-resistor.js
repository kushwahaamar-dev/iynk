// @cf title LED + resistor and Ohm's law
// @cf use engine/bench.list
/* Robotics Bench Fig. 02: the LED trainer. A 60 x 40 mm all-through-hole teaching board, no controller.
   Power comes from a USB-C charger on J1 (a power-only receptacle; R4 and R5 are the 5.1 kΩ CC pull-downs a USB-C
   source needs before it turns VBUS on) or from a bench supply on the screw terminal J2. SW1 switches it; C1
   (100 µF, 16 V) smooths the plug-in. The current then leaves through TP1 (+), runs through the pocket multimeter on
   its 200 mA range (the meter is in series, so it reads the LED current), comes back on TP2 (COM), goes through the
   one resistor the jumper cap on JP1 selects (R1 220 Ω, R2 1 kΩ, R3 10 kΩ or the bare wire link JL1) and through the
   red 5 mm LED D1 to GND. Ohm's law: I = (V − Vf) / R with Vf = 2.0 V (red AlGaInP, docs/facts/la-components.md §4).
   No protection diode on purpose: it would eat 0.7 V of the 3 V the lesson is about, so a reversed bench supply
   reverse-biases C1 (it vents) while the LED just blocks.
   The bench model (current, meter, burn-out, supply limit, faults) runs after the engine's power tree on every frame
   through the SL.bench.bbStep seam; docs/requests/item-led-resistor.md asks engine:bench for a proper bench hook. */
(() => {
const B = SL.bench, M = B.M, K = B.kind, T = B.T;
const ID = 'led-resistor';
const VF = 2.0;                    // red LED forward drop the lesson uses
const LED_MAX = .03;               // A: a 5 mm red LED's absolute maximum continuous current (typ. 20-30 mA)
const LED_POP = .1;                // A: above this the die fails at once (flash, then open)
const R_WATTS = .25;               // 1/4 W resistors
const ROWS = {                     // jumper positions: JP1 pin pair (1 = front), the part it selects, its resistance
  r220: { pair: 4, part: 'R1', ohms: 220 },
  r1k: { pair: 3, part: 'R2', ohms: 1000 },
  r10k: { pair: 2, part: 'R3', ohms: 10000 },
  bypass: { pair: 1, part: 'JL1', ohms: .5 },     // copper only
};
const mine = () => B.md && B.md.id === ID;

/* ---------- drawings this bench needs (the library has no axial or 5 mm through-hole parts) ---------- */
const BAND = ['#2b2825', '#8a4b2a', '#d7372f', '#ef8a2b', '#f2c230', '#43a85a', '#3e74c9', '#8a55b5', '#8f8f8f', '#f6f3ea'];
const bandsOf = ohms => { const e = Math.floor(Math.log10(ohms)) - 1, d = Math.round(ohms / 10 ** e); return [BAND[Math.floor(d / 10)], BAND[d % 10], BAND[e], '#d2a93c']; };
const roundPad = (ctx, a, b, r = .85) => ctx.disc(a, b, .03, r, M.tin.l, .35) + ctx.disc(a, b, .04, r * .42, M.hole, 0);
const leadPair = (ctx, half, z, rad = .28) =>
  ctx.rod([-half, 0, 0], [-half, 0, z], rad, M.tin, toneI, .45) + ctx.rod([half, 0, 0], [half, 0, z], rad, M.tin, toneI, .45);
const lrState = st => st.lr || {};

K('led-resistor-axial', { group: 'low', size: p => [p.span || 10.16, 2.6], h: 2.6,
  draw(ctx){
    const p = ctx.p, half = (p.span || 10.16) / 2, bl = (p.body || 6.3) / 2, r = (p.dia || 2.4) / 2, z = r + .15;
    const hot = lrState(ctx.st).hot === p.id;
    const body = matOf(hot ? '#b06a45' : '#dcc196');
    let s = leadPair(ctx, half, z) + ctx.rod([-half, 0, z], [-bl, 0, z], .28, M.tin, toneI, .45) + ctx.rod([bl, 0, z], [half, 0, z], .28, M.tin, toneI, .45);
    s += ctx.rod([-bl, 0, z], [bl, 0, z], r, body, toneI, .8);
    const bands = bandsOf(p.ohms || 1000), at = [-bl + 1, -bl + 1.9, -bl + 2.8, bl - 1];
    bands.forEach((c, i) => { s += ctx.rod([at[i] - .3, 0, z], [at[i] + .3, 0, z], r * 1.04, matOf(c), toneI, .3); });
    if (hot) s += ctx.glow(0, 0, z + r, 6, '#ff6a3d', .22);
    ctx.put(ctx.B(-half, -r, 0, half, r, z + r), s);
  },
  pads(ctx){ const half = (ctx.p.span || 10.16) / 2; return roundPad(ctx, -half, 0) + roundPad(ctx, half, 0); },
});
K('led-resistor-link', { group: 'low', size: p => [p.span || 10.16, 1.2], h: 1.2,
  draw(ctx){ const half = (ctx.p.span || 10.16) / 2, z = .6;
    ctx.put(ctx.B(-half, -.4, 0, half, .4, z + .4), leadPair(ctx, half, z, .32) + ctx.rod([-half, 0, z], [half, 0, z], .32, M.tin, toneI, .5)); },
  pads(ctx){ const half = (ctx.p.span || 10.16) / 2; return roundPad(ctx, -half, 0) + roundPad(ctx, half, 0); },
});
K('led-resistor-tp', { group: 'low', size: () => [2.6, 2.6], h: 5,
  draw(ctx){ const p = ctx.p, m = matOf(p.color || '#d84a3a');
    let s = ctx.cyl(0, 0, 0, 2, 1.25, m, toneI, .6);
    s += ctx.rod([-.8, 0, 1.9], [-.8, 0, 4.2], .25, M.tin, toneI, .4) + ctx.rod([.8, 0, 1.9], [.8, 0, 4.2], .25, M.tin, toneI, .4)
      + ctx.rod([-.8, 0, 4.2], [0, 0, 4.9], .25, M.tin, toneI, .4) + ctx.rod([0, 0, 4.9], [.8, 0, 4.2], .25, M.tin, toneI, .4);
    ctx.put(ctx.B(-1.3, -1.3, 0, 1.3, 1.3, 5), s); },
  pads(ctx){ return roundPad(ctx, -1.27, 0, .7) + roundPad(ctx, 1.27, 0, .7); },
});
// 5 mm (T-1 3/4) LED standing 2.5 mm up on its legs; anode at local −x, the flat (cathode) at +x as printed
K('led-resistor-led5', { group: 'tall', size: () => [5.8, 5.8], h: 11.1,
  draw(ctx){
    const p = ctx.p, lr = lrState(ctx.st), dead = !!(lr.dead && lr.dead[p.id]), lit = dead ? 0 : ctx.lit;
    const col = (p.led && p.led.color) || '#e5463b', sit = 2.5, top = sit + 1 + 5.4;
    const shell = dead ? matOf('#6a3d31') : matOf(mix(mix(col, '#ffffff', .08), '#ff9a7a', .45 * lit));
    const kx = ctx.rev ? -1 : 1;                 // cathode side
    let s = leadPair(ctx, 1.27, sit + .4, .25);
    s += ctx.cyl(0, 0, sit, sit + 1, 2.9, shell, toneI, .7);
    s += ctx.line([[kx * 2.75, -1.3, sit + 1.02], [kx * 2.75, 1.3, sit + 1.02]], .9, '#f6f1e3');   // the flat
    s += ctx.cyl(0, 0, sit + 1, top, 2.5, shell, toneI, .7);
    s += ctx.disc(0, 0, top + .02, 2.1, mix(shell.l, '#ffffff', dead ? 0 : .25), .4) + ctx.disc(-.6, -.6, top + .04, .8, dead ? '#3e2620' : '#fff6ea', 0);
    if (dead) s += ctx.disc(.3, .2, top + .05, .9, '#2a1d19', 0);
    if (lit > .02) s += ctx.glow(0, 0, top, 4 + 9 * lit, '#ff5a3c', .28 * lit) + ctx.glow(0, 0, top, 1.6 + 3 * lit, '#ffd9c8', .75 * lit);
    if (lr.flash && lr.flash.id === p.id) s += ctx.glow(0, 0, top, 22, '#fff2c4', .85) + ctx.glow(0, 0, top, 11, '#ffffff', .9);
    ctx.put(ctx.B(-2.9, -2.9, 0, 2.9, 2.9, top), s);
  },
  xr(ctx){ const k = ctx.k, sit = 2.5, kx = ctx.rev ? -1 : 1;
    let s = ctx.slab(kx * .3, -.9, kx * 1.6, .9, sit + 1, sit + 4.2, matOf('#b9bfc2'), toneI, .4)        // cathode anvil, the reflector cup
      + ctx.slab(-kx * 1.5, -.35, -kx * .7, .35, sit + 1, sit + 4.6, matOf('#b9bfc2'), toneI, .4)          // anode post
      + ctx.slab(kx * .75, -.3, kx * 1.15, .3, sit + 4.2, sit + 4.45, matOf('#3f4565'), toneI, .3);        // the die in the cup
    s += `<path d="${pd([ctx.W(kx * .95, 0, sit + 4.45), ctx.W(0, 0, sit + 5.6), ctx.W(-kx * 1.1, 0, sit + 4.6)], false)}" fill="none" stroke="#e8c36a" stroke-width=".35"/>`;
    ctx.put(ctx.B(-2.6, -2.6, sit + 6, 2.6, 2.6, sit + 6.1), `<g opacity="${f(k)}">${s}</g>`); },
  xrLabel: () => 'LED DIE',
  pads(ctx){ return roundPad(ctx, -1.27, 0, .8) + ctx.poly([[.47, -.8], [2.07, -.8], [2.07, .8], [.47, .8]], .03, M.tin.l, .35); },
});
// 2-pin 5.08 mm screw terminal, wire entries on its −x face; pin 1 (+) at local +y
K('led-resistor-term', { group: 'tall', size: () => [7.6, 10.16], h: 10,
  draw(ctx){ const [l, w] = ctx.p.size, h = ctx.p.h, body = matOf('#3f9a5a');
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h, body, toneI, .8);
    for (const b of [-2.54, 2.54]){
      s += ctx.disc(.8, b, h + .02, 1.6, '#c9cfd1', .5) + ctx.line([[.8 - 1.1, b - .5, h + .05], [.8 + 1.1, b + .5, h + .05]], .5, '#5a5f61');
      s += ctx.poly([[-l / 2 - .02, b - 1.4], [-l / 2 - .02, b + 1.4], [-l / 2 - .02, b + 1.4], [-l / 2 - .02, b - 1.4]], 2, '#1d1b19', 0);
    }
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), s); },
  plug(ctx, src, reversed){
    const l = ctx.p.size[0], x0 = -l / 2;
    for (const [b, col] of [[2.54, reversed ? WIRE_K : WIRE_R], [-2.54, reversed ? WIRE_R : WIRE_K]]){
      const pts = []; for (let i = 0; i <= 6; i++){ const t = i / 6; pts.push([x0 - t * 24, b * (1 + t * .8), 3.2 - (3.2 + B.G.top - B.G.matH - 1) * Math.sin(t * Math.PI / 2)]); }
      for (let i = 0; i < 6; i++){ const a = ctx.W(...pts[i]), c = ctx.W(...pts[i + 1]); ctx.put(B.aabb([a, c]).map((q, j) => q.map(v => v + (j ? .9 : -.9))), rod(a, c, .9, col, toneI, .8)); }
    } },
  pads(ctx){ return roundPad(ctx, 0, -2.54, 1.1) + roundPad(ctx, 0, 2.54, 1.1); },
});
const WIRE_R = matOf('#d8453a'), WIRE_K = matOf('#3a3632');
// the jumper cap sits on the JP1 pin pair the current position picks, so it moves even while unplugged
K('led-resistor-shunt', { group: 'last', size: () => [5.08, 2.54], h: 6,
  draw(ctx){
    const row = ROWS[ctx.st.mode] || ROWS.r220, pins = B.md.pins, a1 = pins['JP1.' + (2 * row.pair - 1)], a2 = pins['JP1.' + 2 * row.pair];
    if (!a1 || !a2) return;
    const [a, b] = B.localOf(ctx.p, (a1.at[0] + a2.at[0]) / 2, (a1.at[1] + a2.at[1]) / 2), z0 = 2.5, z1 = 8.6;
    const s = ctx.slab(a - 2.45, b - 1.2, a + 2.45, b + 1.2, z0, z1, M.blackPl, toneI, .7) + ctx.poly([[a - 1.9, b - .7], [a + 1.9, b - .7], [a + 1.9, b + .7], [a - 1.9, b + .7]], z1 + .01, '#4b4641', .3);
    ctx.put(ctx.B(a - 2.45, b - 1.2, z0, a + 2.45, b + 1.2, z1), s);
  },
});
// pocket multimeter on the mat, on its 200 mA DC range, probe leads clipped to TP1 (red) and TP2 (black)
const MM = { l: 54, w: 28, h: 8 };
K('led-resistor-meter', { group: 'last', size: () => [MM.l, MM.w], h: MM.h,
  draw(ctx){
    const p = ctx.p, st = ctx.st, { l, w, h } = MM, meas = (st.meas && st.meas.MM1) || {};
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h, matOf('#f2c230'), toneI, 1);
    s += ctx.poly([[-l / 2 + 2.5, -w / 2 + 2.5], [l / 2 - 2.5, -w / 2 + 2.5], [l / 2 - 2.5, w / 2 - 2.5], [-l / 2 + 2.5, w / 2 - 2.5]], h + .02, '#3b3834', .6);
    // LCD: reading and unit
    s += ctx.poly([[-24, -9.5], [-3, -9.5], [-3, 9.5], [-24, 9.5]], h + .04, '#c7d2ab', .5);
    const txt = st.power ? (meas.text || '0.00') : '';
    if (txt) s += ctx.text(-13.5, -3, h + .06, txt, 8, '#28302a', 700);
    if (st.power) s += ctx.text(-7, 5.5, h + .06, 'mA', 2.8, '#28302a', 700) + ctx.text(-20, 5.5, h + .06, 'DC', 2.4, '#28302a', 700);
    // range dial at 200 mA, three jacks
    s += ctx.disc(8, 0, h + .05, 7.2, '#2b2926', .6) + ctx.disc(8, 0, h + .3, 4.9, '#4a4743', .5) + ctx.line([[8, 0, h + .35], [11.8, 2.7, h + .35]], 1.1, '#f6f1e3');
    for (const [lab, b, a] of [['200m', 5.6, 14.6], ['OFF', -8.2, 8], ['V', -5.4, 14]]) s += ctx.text(a, b, h + .06, lab, 1.4, '#f6f1e3', 600);
    const jacks = [[21.5, 7.5, '#d8453a', 'mA'], [21.5, 1, '#2b2825', 'COM'], [21.5, -5.5, '#d8453a', '10A']];
    for (const [a, b, c, lab] of jacks){ s += ctx.disc(a, b, h + .05, 1.9, c, .6) + ctx.disc(a, b, h + .07, .8, '#151311', 0) + ctx.text(a + 3.4, b - .5, h + .06, lab, 1.3, '#f6f1e3', 600); }
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h + .4), s);
    // the leads: a short sag from each jack up and over to its test point, in boxed pieces so they sort
    const lead = (from, tpId, col) => {
      if (!B.isIn(tpId)) return;
      const tp = B.md.byId[tpId], [a1, b1] = B.localOf(p, tp.at[0], tp.at[1]), z1 = 4.9 - p.z, mat = matOf(col);
      const q0 = [from[0], from[1], h + .3], q2 = [a1, b1, z1 + 1.6], q1 = [(q0[0] + q2[0]) / 2, (q0[1] + q2[1]) / 2, Math.max(q0[2], q2[2]) + 9];
      const pts = []; for (let i = 0; i <= 8; i++){ const t = i / 8, u = 1 - t; pts.push([0, 1, 2].map(k => u * u * q0[k] + 2 * u * t * q1[k] + t * t * q2[k])); }
      for (let i = 0; i < 8; i++){ const A0 = ctx.W(...pts[i]), A1 = ctx.W(...pts[i + 1]); ctx.put(B.aabb([A0, A1]).map((q, j) => q.map(v => v + (j ? .7 : -.7))), rod(A0, A1, .7, mat, toneI, .7)); }
      ctx.put(ctx.B(a1 - 1, b1 - 1, z1 - .4, a1 + 1, b1 + 1, z1 + 2.6), ctx.cyl(a1, b1, z1 - .4, z1 + 2.6, .95, mat, toneI, .6));
    };
    lead([21.5, 7.5], 'TP1', '#d8453a'); lead([21.5, 1], 'TP2', '#3a3632');
  },
});

/* ---------- the bench model: current, meter, burn-out, supply limit, faults (pure function of the state plus the
   damage it remembers: a burnt LED or a vented capacitor stays dead until it is replaced) ---------- */
const hashS = s => { let x = 7; for (const ch of String(s)) x = (x * 31 + ch.charCodeAt(0)) % 9973; return x; };
const burst = (id, t) => { const k = Math.floor(t * 3), x = Math.sin((k + 1) * 12.9898 + hashS(id) * 78.233) * 43758.5453; return x - Math.floor(x) < .42; };
const fmt = mA => mA >= 200 ? 'OL' : mA < 1 ? mA.toFixed(2) : mA.toFixed(1);
const clampV = B.clamp;
const brightness = mA => mA > 0 ? clampV(Math.log10(10 * mA) / Math.log10(200), .06, 1) : 0;
const verdict = mA => mA > LED_MAX * 1000 ? 'too much: the LED overheats' : mA >= 5 ? 'bright, safe' : mA >= 1 ? 'dim' : 'barely glowing';
const ohmsTxt = ohms => ohms < 1 ? '0' : String(ohms);
const fresh = () => ({ dead: {}, over: 0, flash: null, sn: -1, hot: null, banner: false, said: {} });
const announce = (lr, key, msg, name) => { if (lr.said[key]) return; lr.said[key] = true; B.sfx(name || 'pop'); B.say(msg, null, 3600); };

function model(st, dt){
  const lr = st.lr || (st.lr = fresh()), md = B.md;
  const isIn = B.isIn, isSet = B.isSet, nm = id => T(md.byId[id].name);
  const rev = id => !!(st.placed[id] && st.placed[id].orient === 1);
  const cold = id => st.faults.includes('cold:' + id) && burst(id, st.t);
  for (const id of Object.keys(lr.dead)) if (!isIn(id)){ delete lr.dead[id]; for (const k of Object.keys(lr.said)) if (k.endsWith(':' + id)) delete lr.said[k]; }
  const i0 = st.faults.indexOf('no-resistor'); if (i0 >= 0){ st.faults.splice(i0, 1); st.mode = 'bypass'; }
  const row = ROWS[st.mode] || ROWS.r220;
  const ev = { rails: {}, status: 'off', fault: null, why: '', load: 0 };
  let mA = 0, led = 'off', vcc = 0, watts = 0;
  const src = st.power ? md.power.sources[st.power] : null;
  if (src){
    const V = st.supply[st.power] != null ? st.supply[st.power] : src.v, swapped = st.faults.includes('reverse-polarity:' + st.power), jack = src.part;
    ev.status = 'no-power';
    if (!isIn(jack)){ ev.why = T('No power: {name} is missing', { name: nm(jack) }); ev.fault = { id: 'missing:' + jack, kind: 'missing', part: jack, msg: ev.why, fix: T('Unplug, fit {name} and solder it', { name: nm(jack) }) }; }
    else if (!isSet(jack)) ev.why = T("{name} isn't soldered: the power pins don't touch the copper", { name: jack });
    else if (st.power === 'usb' && !(isSet('R4') && isSet('R5'))){
      const r = isSet('R4') ? 'R5' : 'R4';
      ev.why = T('No power: a USB-C charger only turns on 5 V when it sees a 5.1 kΩ pull-down on each CC pin, and {name} is missing', { name: r });
      ev.fault = { id: 'missing:' + r, kind: 'missing', part: r, msg: ev.why, fix: T('Unplug, fit {name} and solder it', { name: r }) };
    } else {
      const vin = cold(jack) ? 0 : swapped ? -V : V;
      ev.rails.VIN = vin;
      if (!isIn('SW1') || !isSet('SW1')){ ev.why = T('No power: {name} is missing or unsoldered', { name: 'SW1 (' + nm('SW1') + ')' }); ev.fault = { id: 'missing:SW1', kind: 'missing', part: 'SW1', msg: ev.why, fix: T('Unplug, fit {name} and solder it', { name: 'SW1' }) }; }
      else if ((st.ctl.SW1 || 0) === 1){ ev.why = T('SW1 is OFF: slide it to ON'); ev.rails.VCC = 0; }
      else {
        vcc = cold('SW1') ? 0 : vin; ev.rails.VCC = vcc; ev.status = 'powered';
        // C1 sits across the supply: reverse-biased (put in backwards, or a swapped bench supply) it vents
        if (isSet('C1') && !lr.dead.C1 && (rev('C1') ? -vcc : vcc) < -.5) lr.dead.C1 = swapped ? 'reverse-polarity:' + st.power : 'reversed:C1';
        const path = ['TP1', 'MM1', 'TP2', 'JP1', 'SHUNT', row.part, 'D1'], gone = path.find(id => !isSet(id));
        if (gone){
          ev.why = gone === 'MM1' ? T('Powered, but the meter is not in the loop: nothing joins TP1 to TP2, so no current flows')
            : isIn(gone) ? T("{name} isn't soldered: the power pins don't touch the copper", { name: gone }) : T('Powered, but {name} is missing: no current flows', { name: gone + ' (' + nm(gone) + ')' });
          if (gone === 'D1' && !isIn('D1')) ev.fault = { id: 'missing:D1', kind: 'missing', part: 'D1', msg: ev.why, fix: T('Unplug, fit {name} and solder it', { name: 'D1' }) };
        } else if (lr.dead.D1){ led = 'burnt'; }
        else if (rev('D1')){ led = 'reverse'; }
        else if (!(cold(row.part) || cold('D1') || cold('JP1') || cold('TP1') || cold('TP2'))){
          let i = vcc > VF ? (vcc - VF) / row.ohms : 0;
          const lim = st.faults.includes('brownout') ? .01 : src.ilim;
          if (i > lim){ i = lim; vcc = VF + i * row.ohms; ev.rails.VCC = vcc; lr.sag = lim; } else lr.sag = 0;
          // the LED: a flash and an open die above LED_POP, a few seconds of overheating above LED_MAX
          if (i > LED_POP) lr.over = 99; else if (i > LED_MAX) lr.over += dt; else lr.over = 0;
          if (lr.over > 3){
            lr.dead.D1 = row.part === 'JL1' ? 'no-resistor' : st.supply[st.power] != null ? 'wrong-voltage:' + st.power : 'overcurrent:D1';
            lr.flash = { id: 'D1', t: st.t }; lr.flashMa = i * 1000; lr.over = 0; led = 'burnt'; i = 0;
          }
          mA = i * 1000; watts = i * i * row.ohms; led = led === 'burnt' ? led : mA > 0 ? 'ok' : 'off';
        } else led = 'off';
      }
    }
  } else { lr.over = 0; lr.sag = 0; }
  if (lr.flash && st.t - lr.flash.t > .45) lr.flash = null;
  if (!st.power) lr.flash = null;
  lr.hot = watts > R_WATTS ? row.part : null;
  // what the meter shows: OL while the dying LED pulls far over the 200 mA range, then nothing
  const text = lr.flash ? (lr.flashMa >= 200 ? 'OL' : fmt(lr.flashMa)) : fmt(mA);
  // faults, most serious first
  const sup = src ? st.supply[st.power] : null;
  if (lr.dead.C1 && st.power){
    const c = lr.dead.C1;
    ev.fault = c.startsWith('reverse-polarity')
      ? { id: c, kind: 'pop', part: 'C1', msg: T('Reverse polarity: the supply leads are swapped. C1 is reverse-biased and vents; D1 only blocks, so it survives'), fix: T('Unplug, swap the leads (red to +), then fit a new C1') }
      : { id: c, kind: 'pop', part: 'C1', msg: T('C1 is in backwards: the electrolytic is reverse-biased and vents'), fix: T('Unplug, then fit a new C1 with its stripe (−) toward GND') };
    announce(lr, 'c1:' + c + ':C1', ev.fault.msg);
  } else if (lr.dead.D1 && st.power){
    const c = lr.dead.D1;
    ev.fault = c === 'no-resistor'
      ? { id: c, kind: 'pop', part: 'D1', msg: T('Flash, then dark: with no resistor the LED tries to pass amps and burns out. Unplug, move the jumper back and fit a new LED'), fix: T('Unplug, move the jumper back to 220 Ω, then replace D1') }
      : { id: c, kind: 'pop', part: 'D1', msg: T('{v} V through {r} Ω pushes {ma} mA: D1 overheats and dies', { v: (sup != null ? sup : src.v).toFixed(1), r: ohmsTxt(row.ohms), ma: Math.round(lr.flashMa || 0) }), fix: T('Unplug, set the supply back to 5 V (or use a bigger resistor), then replace D1') };
    announce(lr, 'd1:' + c + ':D1', ev.fault.msg);
  } else if (led === 'reverse'){
    ev.fault = { id: 'reversed:D1', kind: 'dark', part: null, msg: T('D1 is in backwards: an LED only conducts one way, so it stays dark. Unplug and flip it'), fix: T('Unplug, then turn D1 round: long leg (anode) in the + hole') };
  } else if (src && st.faults.includes('reverse-polarity:' + st.power)){
    ev.fault = { id: 'reverse-polarity:' + st.power, kind: 'reverse', part: null, msg: T('Reverse polarity: the supply leads are swapped. D1 blocks and stays dark'), fix: T('Unplug, swap the leads (red to +)') };
  } else if (src && sup != null && src.range && (sup < src.range[0] || sup > src.range[1])){
    ev.fault = { id: 'wrong-voltage:' + st.power, kind: sup > src.range[1] ? 'over' : 'low', part: null,
      msg: T('{v} V on {src}: D1 gets {ma} mA through {r} Ω', { v: sup.toFixed(1), src: T(src.label), ma: fmt(mA), r: ohmsTxt(row.ohms) }), fix: T('Use {range} V', { range: src.range.join('-') }) };
  } else if (lr.sag && src){
    ev.fault = { id: 'brownout', kind: 'sag', part: null, msg: T('Brown-out: the supply hits its {ma} mA limit and sags to {v} V', { ma: Math.round(lr.sag * 1000), v: vcc.toFixed(1) }), fix: T('Raise the supply current limit, or use a bigger resistor') };
  }
  if (src && ev.status === 'powered'){
    if (ev.fault && (ev.fault.kind === 'pop' || ev.fault.kind === 'dark')) ev.status = 'fault';
    else if (lr.sag) ev.status = 'brownout';
    else if (led === 'ok' || (led === 'off' && st.faults.some(x => x.startsWith('cold:')))) ev.status = 'running';
    else if (led === 'off' && vcc <= VF){ ev.why = vcc < 0 ? '' : T('{v} V is not enough to light a red LED: it needs about 2 V', { v: vcc.toFixed(1) }); ev.status = vcc < 0 ? 'fault' : 'powered'; }
    if (ev.fault && ev.fault.kind === 'reverse') ev.status = 'fault';
    if (ev.status === 'running' && st.faults.some(x => x.startsWith('cold:'))) ev.why = T('Cold joint: the LED and the meter cut out and come back');
  }
  ev.load = mA / 1000;
  st.ev = ev; st.o.ev = ev;
  st.o.leds.D1 = led === 'ok' ? brightness(mA) : 0;
  st.meas = {
    D1: { i_mA: Math.round(mA * 100) / 100, state: led },
    MM1: { i_mA: Math.round(mA * 100) / 100, text },
    JP1: { row: st.mode, part: row.part, ohms: row.part === 'JL1' ? 0 : row.ohms, mW: Math.round(watts * 10000) / 10 },
  };
  // bench notes: the paper calculation for the live numbers, every 4 s while current flows
  if (ev.status === 'running' && led === 'ok' && st.t >= 0){
    if (!lr.banner){ lr.banner = true; serial(st, T('-- bench notes --')); }
    const k = Math.floor(st.t / 4);
    if (k !== lr.sn){ lr.sn = k; serial(st, T('I = {v} V / {r} = {ma} mA  {verdict}', { v: (vcc - VF).toFixed(1), r: ohmsTxt(row.ohms), ma: fmt(mA), verdict: T(verdict(mA)) })); }
  }
}
const serial = (st, line) => { st.serial = { n: (st.serial ? st.serial.n : 0) + 1, line }; st.txT = .09; };

/* ---------- actions this bench changes: moving the jumper, its refusals, and what a repair clears ---------- */
const A = B.actions, upload0 = A.upload, mode0 = A.mode, fault0 = A.fault, power0 = A.power, remove0 = A.remove, build0 = A.build, strip0 = A.strip;
const MOVES = { r220: '220 Ω', r1k: '1 kΩ', r10k: '10 kΩ', bypass: 'No resistor' };
const move = key => {
  const st = B.st, lr = st.lr || (st.lr = fresh());
  if (st.exploded){ B.say(B.MSG.exploded); return false; }
  if (st.power && (lr.dead.D1 || lr.dead.C1)){ B.say(T('Fix the fault first: unplug, then replace {name}', { name: lr.dead.C1 ? 'C1' : 'D1' })); return false; }
  st.mode = key; st.ext = false; st.t = 0; lr.sn = -1; lr.over = 0;
  if (!st.power) B.say(key === 'bypass' ? T('Set. Now power the board to see it') : T('Jumper on {name}', { name: T(MOVES[key]) }));
  else B.say(T('Jumper on {name}', { name: T(MOVES[key]) }));
  B.sfx('click'); B.refresh(); return true;
};
A.upload = key => mine() && ROWS[key] ? move(key) : upload0(key);
A.mode = key => mine() && ROWS[key] ? move(key) : mode0(key);
A.fault = id => {
  if (!mine()) return fault0(id);
  const st = B.st, lr = st.lr || (st.lr = fresh());
  if (id === 'no-resistor') return move('bypass');
  if (id == null){ st.lr = fresh(); if (st.mode === 'bypass') st.mode = 'r220'; }
  return fault0(id);
};
// unplugging ends what the supply did wrong (the next connection is made right); the parts it damaged stay damaged
A.power = key => {
  if (mine() && (key == null || key === 'off')){ const st = B.st; st.faults = st.faults.filter(x => !/^(reverse-polarity|wrong-voltage):|^brownout$/.test(x)); st.supply = {}; if (st.lr) st.lr.said = {}; }
  return power0(key);
};
// re-making a joint clears a cold joint on that part
A.remove = id => { const r = remove0(id); if (mine() && !B.isIn(id)) B.st.faults = B.st.faults.filter(x => x !== 'cold:' + id); return r; };
A.build = what => { if (mine() && B.st && !B.st.power) B.st.lr = fresh(); return build0(what); };
A.strip = () => { if (mine() && B.st && !B.st.power) B.st.lr = fresh(); return strip0(); };
const bb0 = B.bbStep;
B.bbStep = (st, dt) => { if (bb0) bb0(st, dt); if (mine()) model(st, dt || 0); };

/* ---------- the board ---------- */
const LOW = ['R1', 'R2', 'R3', 'JL1', 'R4', 'R5', 'SW1', 'TP1', 'TP2', 'JP1'], TALL = ['J1', 'J2', 'C1', 'D1'], LAST = ['SHUNT', 'MM1'];
const allIn = ids => ids.every(id => B.isIn(id));
B.bench({
  id: ID, fig: '02', name: 'LED + resistor', sub: "Ohm's law on a 5 V LED trainer: pick the resistor with the jumper, read the current on the meter",
  board: null, pal: 'mint', height: 14,
  pcb: { w: 60, h: 40, thick: 1.6, r: 2, color: '#3a8f5c', silk: '#f4f6ef', standoff: 4 },
  mat: { front: 40, back: 6, left: 30, right: 8 },
  holes: [[3, 3, 3.2], [57, 3, 3.2], [3, 37, 3.2], [57, 37, 3.2]],
  silk: [
    [30, 37.4, 'LED TRAINER', 2.2], [51.5, 33.6, 'I = V / R', 1.7],
    [19.6, 33, '220', 1.2], [19.6, 28, '1K', 1.2], [19.6, 23, '10K', 1.2], [19.6, 18, 'NONE', 1.1],
    [29, 35.4, 'R1', 1], [29, 30.4, 'R2', 1], [29, 25.4, 'R3', 1], [29, 20.4, 'JL1', 1],
    [40.54, 32.2, 'JP1', 1.1], [48, 28.4, 'D1', 1.2], [44.6, 25.6, '+', 1.6],
    [41, 11.4, 'TP1 +', 1], [46.5, 11.4, 'COM', 1], [46.5, 4.8, 'TP2', 1],
    [9.6, 22.6, 'ON', 1], [16, 22.6, 'OFF', 1], [12.8, 16.6, 'SW1', 1],
    [4, 13.4, '5V IN', 1.1], [9.6, 37.6, 'EXT 5V', 1.1], [9.2, 32.6, '+', 1.4], [9.2, 27.4, '−', 1.4],
    [13.2, 10.6, 'R4 5K1', .9], [13.2, 24, 'R5 5K1', .9], [17.4, 33, 'C1', 1],
  ],
  traces: [
    [[6.2, 20], [8.5, 20]], [[4.3, 32.54], [7, 32.54], [7.6, 22], [8.5, 20.6]],
    [[17.1, 20], [19.2, 20], [19.2, 10], [41, 10], [41, 9.3]], [[13, 30], [13, 28.8], [18.6, 28.8], [19.2, 27]],
    [[46.5, 9.3], [46.5, 15], [22.65, 15], [22.65, 33]],
    [[35.35, 33], [37.6, 33], [39.27, 29.31]], [[35.35, 28], [37.2, 28], [39.27, 26.77]], [[35.35, 23], [37.2, 23], [39.27, 24.23]], [[35.35, 18], [37.6, 18], [39.27, 21.69]],
    [[41.81, 21.69], [41.81, 29.31]], [[41.81, 23.5], [46.73, 23.5]], [[49.27, 23.5], [54, 23.5], [54, 6], [58, 6]],
    [[9.39, 13.2], [6.4, 15.5]], [[9.39, 26.6], [6.4, 24.5]],
  ],
  parts: [
    { id: 'J1', kind: 'usb-c', group: 'tall', name: 'USB-C power jack (power-only receptacle)', short: '5V IN', at: [2.5, 20], size: [7.4, 8.9], h: 3.2 },
    { id: 'J2', kind: 'led-resistor-term', name: 'Screw terminal for a bench supply (EXT 5V)', short: 'EXT 5V', at: [4.3, 30] },
    { id: 'R4', kind: 'led-resistor-axial', name: '5.1 kΩ CC1 pull-down (tells a USB-C charger to turn 5 V on)', short: 'CC1', at: [13.2, 13.2], span: 7.62, body: 5.8, dia: 2.2, ohms: 5100 },
    { id: 'R5', kind: 'led-resistor-axial', name: '5.1 kΩ CC2 pull-down (the other way round of the plug)', short: 'CC2', at: [13.2, 26.6], span: 7.62, body: 5.8, dia: 2.2, ohms: 5100 },
    { id: 'SW1', kind: 'slide', name: 'Slide switch', short: 'POWER', at: [12.8, 20], size: [8.6, 3.6], h: 3.5, control: { type: 'slide', action: 'input', positions: ['ON', 'OFF'] } },
    { id: 'C1', kind: 'ecap', name: '100 µF 16 V electrolytic capacitor', short: '100 µF', at: [13, 33], size: [6.3, 6.3], h: 11, sleeve: '#2f4f8f',
      polar: { fault: 'pop', opts: ['stripe (−) toward GND, as printed', 'stripe toward + (backwards)'] } },
    { id: 'R1', kind: 'led-resistor-axial', name: '220 Ω resistor', short: '220R', at: [29, 33], span: 12.7, ohms: 220 },
    { id: 'R2', kind: 'led-resistor-axial', name: '1 kΩ resistor', short: '1K', at: [29, 28], span: 12.7, ohms: 1000 },
    { id: 'R3', kind: 'led-resistor-axial', name: '10 kΩ resistor', short: '10K', at: [29, 23], span: 12.7, ohms: 10000 },
    { id: 'JL1', kind: 'led-resistor-link', name: 'Wire link (no resistor)', short: 'LINK', at: [29, 18], span: 12.7 },
    { id: 'JP1', kind: 'male', name: 'Jumper header 2x4', short: 'JUMPER', at: [40.54, 25.5], rot: 90, rows: 2,
      pins: ['ROW_NONE', 'LED_A', 'ROW_10K', 'LED_A', 'ROW_1K', 'LED_A', 'ROW_220', 'LED_A'] },
    { id: 'SHUNT', kind: 'led-resistor-shunt', name: 'Jumper cap', short: 'CAP', at: [40.54, 25.5] },
    { id: 'D1', kind: 'led-resistor-led5', name: 'Red 5 mm LED', short: 'LED', at: [48, 23.5], led: { color: '#e5463b' },
      polar: { fault: 'dark', opts: ['long leg in the + hole', 'long leg in the − hole (backwards)'] } },
    { id: 'TP1', kind: 'led-resistor-tp', name: 'Test point (+)', short: 'TP1', at: [41, 8], color: '#d8453a' },
    { id: 'TP2', kind: 'led-resistor-tp', name: 'Test point (COM)', short: 'TP2', at: [46.5, 8], color: '#3a3632' },
    { id: 'MM1', kind: 'led-resistor-meter', name: 'Pocket multimeter on the 200 mA range', short: 'METER', at: [30, -19], z: -5.6 },
  ],
  power: {
    sources: {
      usb: { label: 'USB-C charger', part: 'J1', plug: 'usb-c', v: 5.0, ilim: .5 },
      bench: { label: 'Bench supply on J2', part: 'J2', plug: 'term', pin: 'J2.1', v: 5.0, range: [4.75, 5.25], max: 8, ilim: 1 },
    },
    default: 'usb',
    rails: {
      VIN: { from: [{ src: 'usb', via: ['J1', 'R4', 'R5'] }, { src: 'bench', via: ['J2'] }] },
      VCC: { from: [{ rail: 'VIN', via: ['SW1'] }] },
    },
  },
  mode: 'r220',
  modes: {
    r220: { title: '220 Ω', instant: true, bytes: 0, out: () => ({}), powerMsg: '5 V on: current flows through the meter, the jumper, the resistor and the LED' },
    r1k: { title: '1 kΩ', instant: true, bytes: 0, out: () => ({}), powerMsg: '5 V on: current flows through the meter, the jumper, the resistor and the LED' },
    r10k: { title: '10 kΩ', instant: true, bytes: 0, out: () => ({}), powerMsg: '5 V on: current flows through the meter, the jumper, the resistor and the LED' },
    bypass: { title: 'No resistor', instant: true, bytes: 0, out: () => ({}), powerMsg: '5 V on: nothing but copper between the supply and the LED' },
  },
  faults: ['brownout'],
  xr: {
    flow: [
      ['VIN', [[6.2, 20], [8.5, 20]]],
      ['VCC', [[17.1, 20], [19.2, 20], [19.2, 10], [41, 10], [41, 9.3]]],
    ],
    notes: [['D1', 'LED DIE'], ['C1', 'ELECTROLYTIC'], ['JP1', 'PICKS THE RESISTOR']],
  },
  tags: [['J1', -40, 14], ['J2', -40, -6], ['SW1', -30, 26], ['JP1', 34, -30], ['D1', 40, -10], ['MM1', 0, 40]],
  // build-step conditions the host reads as state.tasks.<id> (practice-task checks run on the host)
  tasks: [
    { id: 'low-in', title: 'Every low part is on', check: () => allIn(LOW) },
    { id: 'tall-in', title: 'Every tall part is on', check: () => allIn(TALL) },
    { id: 'soldered', title: 'Every joint is soldered', check: () => [...LOW, ...TALL].every(id => B.isSet(id)) },
    { id: 'last-in', title: 'Jumper cap and meter on', check: () => allIn(LAST) },
    { id: 'lit', title: 'D1 lit and the meter reading', check: st => !!(st.meas && st.meas.D1 && st.meas.D1.state === 'ok') },
  ],
});
if (mine() && B.st) B.refresh();
})();
