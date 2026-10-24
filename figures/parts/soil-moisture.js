// @cf title Capacitive soil moisture sensor (v1.2)
// @cf use engine/bench.list
/* Capacitive soil moisture sensor v1.2: a black 98 x 23 mm board, the electronics (a TLC555 at about 1.5 MHz and a
   regulator) at the top under a 3-pin JST-PH socket, the sensing pad running down the long tip, which is pushed
   into the soil as far as the white line. No bare metal touches the soil, so it does not corrode. Legs ['AOUT',
   'VCC','GND'] in the board's silk order: the three header pins its cable plugs onto. 3.3-5.5 V, 5 mA. AOUT is
   about 2.5 V in dry air and about 1.3 V in water: wetter reads lower.
   With `at` (board mm), the sensor stands in a plant pot there and a three-wire cable runs to the holes. The
   `moisture` param (0-100 %) only darkens the soil; the reading itself comes from the lesson's world input. */
(() => {
const B = SL.bench, T = B.T;
const PCB = { l: '#3a3836', m: '#2b2927', d: '#191817' }, POT = { l: '#c96f45', m: '#a85a36', d: '#7a3f24' };
const DEF = { moisture: 40 };
const COLS = ['#f2c230', '#e2483d', '#34302c'];          // AOUT yellow, VCC red, GND black
const RP = 11, HP = 16, ABOVE = 34;                        // pot radius and height; board standing above the soil

B.part('soil-moisture', {
  name: 'Soil moisture sensor (capacitive)',
  legs: ['AOUT', 'VCC', 'GND'],
  span: [2, 2],
  params: { moisture: [0, 100] },
  paramNames: { moisture: 'Soil moisture (%)' },
  defaults: DEF,
  show: { breadboard: 'mini', parts: [{ id: 'S1', part: 'soil-moisture', at: [30, 12], holes: ['a5', 'a6', 'a7'] }], wires: [] },
  tag: p => T('{id} · {n} %', { id: p.id, n: Math.round(+(p.moisture != null ? p.moisture : DEF.moisture)) }),
  draw(ctx){
    const p = Object.assign({}, DEF, ctx.p), legs = ctx.legs || [], o = ctx.origin || legs[0] || [0, 0, 0];
    const W = (x, y, z) => [o[0] + x, o[1] + y, o[2] + z];
    const wet = Math.max(0, Math.min(100, +p.moisture || 0)) / 100;
    // the pot and its soil
    let pot = cyl(o[0], o[1], o[2], o[2] + HP, RP, POT, toneI, 1.1, 24);
    pot += shape(Array.from({ length: 24 }, (_, i) => { const q = i / 24 * 2 * Math.PI; return W((RP - 1) * Math.cos(q), (RP - 1) * Math.sin(q), HP - .6); }), mix('#8a6a48', '#3b2a1c', wet), .5);
    ctx.put(B.aabb([W(-RP, -RP, 0), W(RP, RP, HP)]), pot);
    // the board standing out of the soil, its white line at the surface, the socket on top
    const z0 = HP - .6, z1 = z0 + ABOVE;
    let s = B.slabW(W, -11.5, -.8, 11.5, .8, z0, z1, PCB, toneI, .8);
    s += B.slabW(W, -11.5, -.82, 11.5, -.8, z0 + 1, z0 + 1.8, matOf('#ece6d6'), toneI, 0);
    s += B.slabW(W, -4, -2.8, 4, .8, z1 - 5, z1 - 1, matOf('#ece6d6'), toneI, .5);
    s += B.slabW(W, -3.5, -2.2, 0, -.8, z1 - 12, z1 - 8, B.M.black, toneI, .4);
    ctx.put(B.aabb([W(-11.5, -2.8, z0), W(11.5, .8, z1)]), s);
    // the cable from the socket to the header pins in the holes
    if (legs.length === 3) COLS.forEach((col, i) => {
      const a = W((i - 1) * 2, -2, z1 - 3), e = legs[i], e2 = [e[0], e[1], e[2] + 9], pts = [];
      for (let j = 0; j <= 10; j++){ const t = j / 10, sn = Math.sin(t * Math.PI); pts.push([a[0] + (e2[0] - a[0]) * t, a[1] + (e2[1] - a[1]) * t, a[2] + (e2[2] - a[2]) * t + sn * 8]); }
      for (let j = 0; j < pts.length - 1; j++) ctx.put(B.aabb([pts[j], pts[j + 1]]).map((v, h) => v.map(c => c + (h ? .5 : -.5))), rod(pts[j], pts[j + 1], .45, matOf(col), toneI, .4));
      ctx.put(B.aabb([[e[0] - 1.3, e[1] - 1.3, e[2]], [e[0] + 1.3, e[1] + 1.3, e[2] + 9.5]]), B.slabW((x, y, z) => [e[0] + x, e[1] + y, e[2] + z], -1.25, -1.25, 1.25, 1.25, 1.5, 9.5, B.M.black, toneI, .5) + rod(e, [e[0], e[1], e[2] + 1.5], .32, B.M.gold, toneI, .3));
    });
  },
});
})();
