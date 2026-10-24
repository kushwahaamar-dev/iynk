// @cf title Traffic-light LED module
// @cf use engine/bench.list
/* Generic 4-pin traffic-light LED module (docs/facts/la-components.md §19): a black PCB about 56 x 21 mm with three
   8 mm LEDs, red, yellow and green, stacked like a real traffic light, each behind its own SMD series resistor, with
   the cathodes tied together on GND. Each LED lights when its pin is HIGH (active high), so the module plugs straight
   into Uno pins. The layout is the common one read from product photos (the sheet marks the size unverified).
   Pin order varies by maker: the default variant is GND R Y G, the order Learn Arduino lesson 16 wires (b20-b23);
   the other variant is R Y G GND. Read the silk.
   Electrical model, used by the LED drawings: I = (V_pin·duty − Vf) / R with R = 330 Ω (220-330 Ω on real modules)
   and Vf 2.0 / 2.1 / 2.2 V, so about 9 mA each at 5 V and 3-4 mA from a 3.3 V board. With a resistor removed the pin
   driver (about 25 Ω, the same as the breadboard solver) is all that limits the current: about 120 mA, the LED flares
   and burns out in half a second and the pin is far past its 40 mA limit. A reversed LED stays dark (no damage at 5 V).
   See-through shows the die in its reflector cup and the gold bond wire to the anode post (§31). */
(() => {
const B = SL.bench, T = B.T;
const VF = { red: 2.0, yellow: 2.1, green: 2.2 };
const HEX = { red: '#e8392e', yellow: '#f2c23a', green: '#3fbf6a' };
const R_SERIES = 330, R_PIN = 25, I_REF = .0136;
const LEDS = [['LED_R', 'R_R', 'red', 'R', 44.5], ['LED_Y', 'R_Y', 'yellow', 'Y', 31.5], ['LED_G', 'R_G', 'green', 'G', 18.5]];
const LED_X = 12, RES_X = 5, PIN_PITCH = 2.54;
const mod = st => st.tl || (st.tl = { burnt: {}, since: {} });

// current through one LED from its pin level, the IO voltage and whether its resistor is in
const ledCurrent = (st, id) => {
  const row = LEDS.find(r => r[0] === id), v = (st.ev && st.ev.rails.IO) || 0;
  const r = B.isSet(row[1]) ? R_SERIES : R_PIN;
  return { i: Math.max(0, (v - VF[row[2]]) / r), noRes: r === R_PIN };
};

/* parts on the back of the module: hidden behind the PCB, shown through it in see-through */
const underPCB = svg => {
  const md = B.md, pts = [];
  for (const [x, y] of B.pcbOutline()) pts.push(P(...B.BP(x, y, 0)), P(...B.BP(x, y, -md.pcb.thick)));
  const d = 'M-5000 -5000H5000V5000H-5000ZM' + hull(pts).map(q => f(q[0]) + ' ' + f(q[1])).join('L') + 'Z';
  return `<clipPath id="slUnderPcbTl"><path clip-rule="evenodd" d="${d}"/></clipPath><g clip-path="url(#slUnderPcbTl)">${svg}</g>`;
};
const below = base => ({ group: base.group, size: base.size, h: base.h, pins: base.pins, xrLabel: base.xrLabel,
  draw(ctx){ const c2 = Object.create(ctx); c2.put = (bx, svg) => ctx.put(bx, ctx.k > .05 ? svg : underPCB(svg)); base.draw(c2); } });
B.kind('traffic-light-back-male', below(B.kinds.male));

/* 8 mm through-hole LED standing on the module: two legs 2.54 mm apart, flange, cylinder and dome */
B.kind('traffic-light-led', {
  group: 'low', size: () => [9, 9], h: 12.2,
  draw(ctx){
    const p = ctx.p, st = ctx.st, col = HEX[p.color], m = mod(st);
    for (const [id] of LEDS) if (!B.isIn(id)){ delete m.burnt[id]; delete m.since[id]; }
    const { i, noRes } = ledCurrent(st, p.id), duty = ctx.lit;
    // no resistor: it flares, then the die cracks; it stays dead until the LED is replaced
    if (noRes && duty > .05 && i > .05 && !m.burnt[p.id]){
      if (m.since[p.id] == null || st.t < m.since[p.id]) m.since[p.id] = st.t;
      if (st.t - m.since[p.id] > .5){ m.burnt[p.id] = true; B.sfx('pop'); B.say('{name} burned out: about {n} mA with no resistor', { name: T(p.name), n: Math.round(i * 1000) }, 3200); }
    } else if (!noRes) delete m.since[p.id];
    const burnt = !!m.burnt[p.id], lit = burnt ? 0 : duty * Math.min(1, Math.pow(i / I_REF, .55)), flare = !burnt && noRes && duty > .05 && i > .05;
    const body = matOf(burnt ? '#5a4330' : mix(col, '#ffffff', lit > .05 ? .2 + .35 * lit : 0)), ghost = ctx.k > 0 ? 1 - .75 * ctx.k : 1;
    let s = '';
    for (const a of [-PIN_PITCH / 2, PIN_PITCH / 2]) s += ctx.rod([a, 0, -1.2], [a, 0, 1.2], .25, B.M.tin, toneI, .4);
    let shell = ctx.cyl(0, 0, 1.2, 2.2, 4.5, body, toneI, .8, 22) + ctx.cyl(0, 0, 2.2, 8.8, 4, body, toneI, .9, 22)
      + rod(ctx.W(0, 0, 8.8), ctx.W(0, 0, 12.2), 4, body, toneI, .9, 1.6);
    if (ctx.k > 0){
      // inside: the cathode's reflector cup holds the die; a gold wire arcs to the anode post
      let inner = ctx.rod([PIN_PITCH / 2, 0, 2.2], [PIN_PITCH / 2, 0, 6.8], .32, B.M.steel, toneI, .4) + ctx.rod([-PIN_PITCH / 2, 0, 2.2], [-PIN_PITCH / 2, 0, 7.4], .32, B.M.steel, toneI, .4)
        + ctx.cyl(PIN_PITCH / 2 - .4, 0, 6.8, 7.6, 1.1, B.M.steel, toneI, .4, 14) + ctx.slab(PIN_PITCH / 2 - .55, -.15, PIN_PITCH / 2 - .25, .15, 7.6, 7.85, matOf(col), toneI, .3);
      inner += `<path d="${pd([ctx.W(PIN_PITCH / 2 - .4, 0, 7.85), ctx.W(0, 0, 9), ctx.W(-PIN_PITCH / 2, 0, 7.4)], false)}" fill="none" stroke="#e8c36a" stroke-width=".4"/>`;
      shell = `<g opacity="${f(ghost)}">${shell}</g>` + inner;
    }
    s += shell;
    if (lit > .05 || flare){ const g = flare ? 1 : lit, [X, Y] = ctx.P(0, 0, 9);
      s += `<circle cx="${f(X)}" cy="${f(Y)}" r="${f((flare ? 14 : 6) + 9 * g)}" fill="${col}" opacity="${f(.28 * g)}"/><circle cx="${f(X)}" cy="${f(Y)}" r="${f(2.2 + 2.4 * g)}" fill="#fffbe8" opacity="${f(.85 * g)}"/>`; }
    if (burnt){ const [X, Y] = ctx.P(0, 0, 13); s += `<circle cx="${f(X + 1.5)}" cy="${f(Y - 3)}" r="3.2" fill="#8a847a" opacity=".4"/>`; }
    ctx.put(ctx.B(-4.6, -4.6, -1.2, 4.6, 4.6, 12.2), s);
  },
  xrLabel: () => 'DIE IN A REFLECTOR CUP',
});

function make(order){
  const pins = order === 'gnd-last' ? ['R', 'Y', 'G', 'GND'] : ['GND', 'R', 'Y', 'G'];
  const px = net => 10.5 + (pins.indexOf(net) - 1.5) * PIN_PITCH;
  const parts = [{ id: 'PINS', kind: 'traffic-light-back-male', name: '4-pin header (' + pins.join(' ') + ')', short: pins.join(' '), at: [10.5, 2.6], side: 'bottom', h: 8.5, pins }];
  const flow = [], traces = [];
  LEDS.forEach(([id, rid, color, net, y], k) => {
    parts.push({ id, kind: 'traffic-light-led', name: { red: 'Red LED', yellow: 'Yellow LED', green: 'Green LED' }[color], short: { red: 'RED', yellow: 'YELLOW', green: 'GREEN' }[color],
      at: [LED_X, y], color, led: { color: HEX[color], net }, polar: { fault: 'dark', opts: ['flat side to the right, as printed', 'flat side to the left (backwards)'] } });
    parts.push({ id: rid, kind: 'chip', name: { red: '330 Ω resistor for red', yellow: '330 Ω resistor for yellow', green: '330 Ω resistor for green' }[color], short: '330 Ω',
      at: [RES_X, y - 3.2], rot: 90, size: [2, 1.25], h: .6, label: '331' });
    const bus = 1.6 + k * 1.3, path = [[px(net), 2.6], [px(net), 5.2 + k], [bus, 6.4 + k], [bus, y - 5.4], [RES_X, y - 4.2], [RES_X, y - 2.2], [LED_X - PIN_PITCH / 2, y]];
    traces.push(path); flow.push([net, path]);
    traces.push([[LED_X + PIN_PITCH / 2, y], [18.9, y]]);
  });
  traces.push([[18.9, 44.5], [18.9, 1.2], [px('GND'), 1.2], [px('GND'), 2.6]]);
  return {
    id: 'traffic-light', name: 'Traffic-light LED module', sub: 'Red, yellow and green 8 mm LEDs with built-in resistors, active high',
    pcb: { w: 21, h: 56, thick: 1.6, r: 1.5, color: '#1f1e1c', silk: '#f2efe6', standoff: 9 },
    mat: { front: 10, back: 10, left: 10, right: 10 }, height: 14, pal: 'tomato', logic: 5,
    holes: [[10.5, 52.6, 3.2]],
    silk: [[17, 44.5, 'R', 2.2], [17, 31.5, 'Y', 2.2], [17, 18.5, 'G', 2.2], ...pins.map(n => [px(n), 5.8, n, 1.3, 90]), [10.5, 11.4, 'TRAFFIC LIGHT', 1.5]],
    traces,
    parts,
    power: {
      sources: {
        uno: { label: 'Uno pins (5 V logic)', v: 5, range: [4.5, 5.5], max: 8 },
        io3: { label: 'Pins of a 3.3 V board (ESP32, Pico)', v: 3.3, range: [3, 3.6], max: 8 },
      },
      default: 'uno',
      rails: { IO: { from: [{ src: 'uno', via: ['PINS'] }, { src: 'io3', via: ['PINS'] }], max: 9 } },
      // the red LED draws the most current on an over-voltage, so it is the part that fails first
      mcu: { part: 'LED_R', rail: 'IO', min: 1.9, needs: [] },
      upload: { source: 'uno', needs: [], tool: 'none' },
    },
    mode: 'cycle',
    modes: {
      cycle: { title: 'Traffic cycle', instant: true, bytes: 1180,
        out: (st, t) => { const u = t % 7; return { G: u < 3 ? 1 : 0, Y: u >= 3 && u < 4 ? 1 : 0, R: u >= 4 ? 1 : 0 }; } },
      parking: { title: 'Parking sensor', instant: true, bytes: 2210,
        out: (st, t) => { const cm = parkCm(t); return { G: cm > 30 ? 1 : 0, Y: cm > 15 && cm <= 30 ? 1 : 0, R: cm <= 15 ? 1 : 0 }; },
        serial: k => { const cm = Math.round(parkCm(k)); return cm > 30 ? cm + ' cm · GREEN · all clear' : cm > 15 ? cm + ' cm · YELLOW · slow down' : cm + ' cm · RED · stop!'; } },
      fade: { title: 'Fade green (PWM)', instant: true, bytes: 1320, out: (st, t) => ({ R: 0, Y: 0, G: Math.round(127.5 + 127.5 * Math.sin(t * 2.2)) / 255 }) },
      night: { title: 'Night flash', instant: true, bytes: 1040, out: (st, t) => ({ R: 0, Y: t % 1 < .5 ? 1 : 0, G: 0 }) },
      test: { title: 'Lamp test', instant: true, bytes: 960, out: () => ({ R: 1, Y: 1, G: 1 }) },
    },
    faults: ['cold:PINS'],
    xr: { flow, notes: [['LED_R', 'DIE IN A REFLECTOR CUP']] },
    tags: [['LED_R', 34, -26], ['LED_Y', 38, -6], ['LED_G', 40, 16], ['PINS', -34, 22], ['R_Y', -40, -16]],
    // what a bench or circuit needs to drive the module from its pins (docs/requests/parts-modules.md)
    elec: {
      pins: Object.fromEntries(pins.map(n => [n, n === 'GND' ? { role: 'gnd' }
        : { role: 'in', load: { type: 'led', part: LEDS.find(r => r[3] === n)[0], ohms: R_SERIES, vf: VF[LEDS.find(r => r[3] === n)[2]], to: 'GND', imax: .02 } }])),
      logic: [1.8, 5.5],
    },
    variants: {
      'gnd-first': { name: 'Pins GND R Y G', patch: () => make('gnd-first') },
      'gnd-last': { name: 'Pins R Y G GND', patch: () => make('gnd-last') },
    },
    variant: 'gnd-first',
  };
}
// lesson 16's obstacle drives back and forth between 6 and 58 cm, 8 s a round trip
const parkCm = t => 32 + 26 * Math.sin(t * Math.PI / 4);
B.module(make('gnd-first'));
})();
