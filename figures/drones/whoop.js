// @cf title Tiny Whoop 65 mm
// @cf use engine/drone.js
// @cf use engine/drone-geo.js
// @cf use engine/drone-frames.js
// @cf use engine/drone-pieces.js
// @cf use engine/drone-sheet.js
/* Fig. 02, the 65 mm 1S brushless Tiny Whoop on Betaflight. Geometry from docs/facts/whoop.md: 65 mm motor-to-motor
   (motors at +-22.98 mm), one-piece PP frame with 34.9 mm x 14.5 mm ducts (Air65 frame), 0702 motors on mounts at the
   duct floor, a 29 x 29 mm 5-in-1 AIO on rubber grommets over the duct rims (26 x 26 mm holes), 31 mm props, a 14 mm
   nano camera at 25 deg in the canopy nose, and a 1S BT2.0 pack in the holder under the frame with its plug at the
   rear. Craft-local mm: x forward, y left, z up, z = 0 on the mat. The AIO's battery lead is a BT2.0 pigtail and has
   the engine id XT60, so the smoke stopper and the reverse-polarity fault work on it (there is no capacitor). */
(() => {
  const D = SL.drone, g = D.g;
  const TAU = Math.PI * 2;
  const FZ = 7;                     // frame underside: the pack rides in the holder below it
  const FT = 1.2;                   // floor, braces and motor mounts
  const MZ = FZ + FT;               // motor mount face
  const DUCT = { r: 17.45, t: 1, h: 14.5 };
  const RIM = FZ + DUCT.h;          // duct rim, 21.5 mm
  const BOARD = RIM + 1.5;          // AIO underside on its grommets
  const TOPB = BOARD + 1;           // AIO top (1.0 mm board)
  const HOLE = 13;                  // 26 x 26 mm mounting pattern
  const BASE_H = 1.6;               // 0702 base flange
  const SOCK = [12, 6.2];           // JST1.25 motor sockets on the AIO, one per quadrant
  const PAD_X = -12.6;              // BT2.0 pigtail pads at the rear edge (+ on the left, - on the right)
  const CAM = { at: [14, 0, 33], tilt: 25 };
  const holes = [[HOLE, HOLE], [HOLE, -HOLE], [-HOLE, HOLE], [-HOLE, -HOLE]];
  const sgn = v => (v < 0 ? -1 : 1);
  const bar = (x0, y0, x1, y1, w) => {
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len * w / 2, ny = dx / len * w / 2;
    return [[x0 - nx, y0 - ny], [x1 - nx, y1 - ny], [x1 + nx, y1 + ny], [x0 + nx, y0 + ny]];
  };
  const shift = (pts, dx) => pts.map(([x, y]) => [x + dx, y]);

  // the parts of the moulded frame the engine's frame kind does not draw: the outer motor-mount braces, the
  // battery holder rails and the four grommet posts that stand over the duct rims
  const frameExtras = ctx => {
    const out = [], bw = ctx.design.batt.size[1];
    for (const mo of ctx.craft.motors){
      for (const da of [60, -60]){
        const a = mo.ang + da * Math.PI / 180;
        out.push(g.plate(bar(mo.x, mo.y, mo.x + Math.cos(a) * (DUCT.r + .4), mo.y + Math.sin(a) * (DUCT.r + .4), 2.2), FZ, FT, 'pal'));
      }
    }
    const ry = bw / 2 + .45;
    for (const s of [-1, 1]) out.push(g.box(-11, s > 0 ? ry : -ry - .9, 0, 11, s > 0 ? ry + .9 : -ry, FZ, 'pal', .8));
    for (const [x, y] of holes){
      out.push(...g.rod([x * .79, y * .79, RIM - 1.2], [x, y, RIM - 1.2], .9, 'pal', 6, 6));
      out.push(g.cyl(x, y, RIM - 2.2, RIM + .3, 1.5, 'pal', 10, .7));
    }
    return out;
  };

  // 0702 motors drawn at their real size (docs/requests/item-whoop.md 1): flange, bell, the copper stator in
  // see-through, three spokes that turn with the rotor, and the 1 mm shaft while the props are off
  const motorsDraw = ctx => {
    const out = [], mt = ctx.design.motor, R = mt.bell[0] / 2, hb = mt.bell[1], k = ctx.k;
    const propsOn = !!ctx.st.placed.PROPS && !ctx.st.placed.PROPS.leave;
    ctx.craft.motors.forEach((mo, i) => {
      const z1 = MZ + BASE_H, z2 = z1 + hb;
      const base = g.cyl(mo.x, mo.y, MZ, z1, R * .93, 'dark', 16, .8);
      for (let j = 0; j < 3; j++){ const a = j * TAU / 3 + .5; base.svg += g.disc(mo.x + 3.3 * Math.cos(a), mo.y + 3.3 * Math.sin(a), z1 + .01, .45, 'metal', 6, .3); }
      out.push(base);
      if (k > 0){
        const sz = z1 + (hb - mt.stator[1]) / 2;
        out.push(g.cyl(mo.x, mo.y, sz, sz + mt.stator[1], mt.stator[0] / 2, 'copper', 14, .6));
      }
      const bell = g.cyl(mo.x, mo.y, z1, z2, R, 'metal', 20, 1);
      if (k > 0) bell.svg = `<g opacity="${(1 - .62 * k).toFixed(3)}">${bell.svg}</g>`;
      const a0 = ctx.spin[i] || 0;
      for (let j = 0; j < 3; j++){
        const a = a0 + j * TAU / 3;
        const p0 = D.W(mo.x + 1.1 * Math.cos(a), mo.y + 1.1 * Math.sin(a), z2 + .02), p1 = D.W(mo.x + (R - .9) * Math.cos(a), mo.y + (R - .9) * Math.sin(a), z2 + .02);
        bell.svg += `<path d="${pd([p0, p1], false)}" stroke="${INK}" stroke-width="1" stroke-linecap="round" fill="none"/>`;
      }
      out.push(bell);
      if (!propsOn) out.push(g.cyl(mo.x, mo.y, z2, z2 + 3.4, .5, 'metal', 8, .5));
      ctx.shadows.push(D.circ(mo.x, mo.y, R, 10).map(([x, y]) => D.W(x, y, z2)));
    });
    return out;
  };

  // 31 mm press-fit props: blades with the leading edge raised (mirrored when PROPS is fitted swapped), a
  // translucent disc while spinning, a small hub on the 1 mm shaft
  const propsDraw = ctx => {
    const out = [], pr = ctx.design.prop, R = pr.d * 25.4 / 2, col = D.colOf(pr.color), swapped = ctx.orient === 1;
    const zh = MZ + BASE_H + ctx.design.motor.bell[1] + .25, zb = zh + 1.3;
    ctx.craft.motors.forEach((mo, i) => {
      const rpm = ctx.rpm[i] || 0, a0 = ctx.spin[i] || 0;
      if (rpm > .12){
        const ring = Array.from({ length: 24 }, (_, j) => { const a = j / 24 * TAU; return D.W(mo.x + R * Math.cos(a), mo.y + R * Math.sin(a), zb); });
        out.push({ box: D.bbox(ring, .5), svg: `<path d="${pd(ring)}" fill="${col}" opacity="${(.2 + .22 * rpm).toFixed(3)}" stroke="${INK}" stroke-width=".5"/>` });
      } else {
        const lead = (mo.dir === 'CW' ? -1 : 1) * (swapped ? -1 : 1), r0 = 1.7, n = 6;
        for (let b = 0; b < pr.blades; b++){
          const th = a0 + b * TAU / pr.blades, ux = Math.cos(th), uy = Math.sin(th), tx = -uy, ty = ux;
          const edge = side => Array.from({ length: n + 1 }, (_, j) => {
            const u = j / n, r = r0 + (R - r0) * u;
            const ch = R * .2 * (.55 + .6 * Math.sin(Math.PI * Math.min(1, u * 1.2))) * (1 - .45 * u) + .7;
            const off = side * ch * (side * lead > 0 ? .62 : .38), z = zb + side * lead * (.9 - .6 * u);
            return [mo.x + ux * r + tx * off, mo.y + uy * r + ty * off, z];
          });
          const pts = [...edge(1), ...edge(-1).reverse()].map(p => D.W(...p));
          out.push({ box: D.bbox(pts, .2), svg: `<path d="${pd(pts)}" fill="${col}" stroke="${INK}" stroke-width=".7" stroke-linejoin="round"/>`
            + `<path d="${pd(edge(lead > 0 ? 1 : -1).map(p => D.W(...p)), false)}" fill="none" stroke="${mix(col, '#ffffff', .55)}" stroke-width=".45"/>` });
        }
      }
      out.push(g.cyl(mo.x, mo.y, zh, zh + 2.6, 1.9, col, 12, .7));
    });
    return out;
  };

  // the AIO's own sockets and silkscreen (separate from the board piece so its arrow stays on the board)
  const aioExtras = ctx => {
    const out = [];
    for (const [sx, sy, m] of [[-1, -1, 'M1'], [1, -1, 'M2'], [-1, 1, 'M3'], [1, 1, 'M4']]){
      const x = sx * SOCK[0], y = sy * SOCK[1];
      const it = g.box(x - 1.6, y - 2.7, TOPB, x + 1.6, y + 2.7, TOPB + 2.6, 'white', .6);
      it.svg += g.text(x - sx * 3.1, y, TOPB + .03, m, 1.7, '#d9d3c6');
      out.push(it);
    }
    const silk = g.box(PAD_X - .7, -4.2, TOPB, PAD_X + .7, 4.2, TOPB + .05, 'pcbBlack', .2);
    silk.svg = g.text(PAD_X + 2.4, 2, TOPB + .06, '+', 2.2, '#f2efe7') + g.text(PAD_X + 2.4, -2, TOPB + .06, '-', 2.2, '#f2efe7');
    out.push(silk);
    return out;
  };

  // three motor wires per motor, from the motor base through the duct-floor notch, up the frame centre and into
  // the AIO socket of the same quadrant; the plugs sit in the sockets
  const motorWires = ctx => {
    const out = [], R = ctx.design.motor.bell[0] / 2;
    ctx.craft.motors.forEach((mo, i) => {
      const ux = Math.cos(mo.ang), uy = Math.sin(mo.ang), px = -uy, py = ux, sx = sgn(mo.x), sy = sgn(mo.y);
      const sock = [sx * SOCK[0], sy * SOCK[1]];
      [-.45, 0, .45].forEach((o, j) => {
        const pts = [
          [mo.x - ux * (R + .2) + px * o, mo.y - uy * (R + .2) + py * o, MZ + .6],
          [ux * 13.4 + px * o, uy * 13.4 + py * o, MZ + .6],
          [ux * 12.8 + px * o, uy * 12.8 + py * o, RIM - 1.5],
          [sx * 15.4, sock[1] + sy * o, RIM + .6],
          [sx * 15.4, sock[1] + sy * o, TOPB + 1.3],
          [sock[0] + sx * 1.9, sock[1] + sy * o, TOPB + 1.3],
        ];
        out.push(...g.wire(pts, '#2c2926', .55, 4));
        if (j === 1) ctx.flows.push({ kind: 'phase', motor: i, pts: pts.map(p => D.W(...p)) });
      });
      out.push(g.box(sock[0] + sx * 1.6 - (sx > 0 ? 0 : 1.4), sock[1] - 2.3, TOPB + .2, sock[0] + sx * 1.6 + (sx > 0 ? 1.4 : 0), sock[1] + 2.3, TOPB + 2.4, '#e9e2d0', .5));
    });
    return out;
  };

  // where the pigtail's female BT2.0 housing hangs: mated to the pack's plug, on the smoke stopper's lead, or loose
  const packRear = ctx => -ctx.design.batt.size[0] / 2;
  const plugAt = ctx => {
    const battOn = D.isOn(ctx.st, 'BATT');
    if (ctx.testing === 'smoke') return [-44, 0, 3.4];
    if (battOn && ctx.st.plugged) return [packRear(ctx) - 8.3, 0, 3.2];
    return [Math.min(-38, packRear(ctx) - 10), 0, 7.5];
  };

  // the BT2.0 pigtail: red and black 26 AWG from the AIO's pads down the back to its female plug. Fitted the wrong
  // way round (orient 1) the red lead lands on the minus pad: reverse polarity on the first plug-in
  const pigtail = ctx => {
    const out = [], rev = ctx.orient === 1, [hx, , hz] = plugAt(ctx);
    for (const [col, pad, lane] of [['#d8473a', rev ? -2 : 2, .9], ['#2c2926', rev ? 2 : -2, -.9]]){
      const pts = [[PAD_X, pad, TOPB + .3], [PAD_X - 2.6, pad, TOPB + .3], [-16.6, lane, TOPB - 2.6], [-22, lane, 13], [-29, lane, 9.2], [hx + 2.6, lane * .9, hz + .6], [hx, lane * .9, hz]];
      out.push(...g.wire(pts, col, .8, 4));
      if (col === '#d8473a') ctx.flows.push({ kind: 'power', pts: pts.slice().reverse().map(p => D.W(...p)) });
    }
    const housing = g.box(hx - 4.6, -2.5, hz - 2, hx, 2.5, hz + 2, 'white', .7);
    housing.svg += g.text(hx - 2.3, 0, hz + 2.03, 'BT2.0', 1.3, '#857d6e');
    out.push(housing);
    if (ctx.testing === 'smoke') ctx.xt60At = [hx + 5.4, 0, hz];
    if (ctx.st.fault === 'XT60') ctx.capAt = D.W(PAD_X, 0, TOPB + 1);
    return out;
  };

  // the pack's own short lead and male BT2.0 plug at its rear end
  const packLead = ctx => {
    const out = [], x0 = packRear(ctx), plugged = ctx.st.plugged;
    for (const [col, y] of [['#d8473a', .9], ['#2c2926', -.9]]) out.push(...g.wire([[x0, y, 3.2], [x0 - 2.2, y, 3.2]], col, .8, 3));
    const it = g.box(x0 - 6.6, -2.2, 1.4, x0 - 2.2, 2.2, 5, 'white', .7);
    if (plugged) it.svg += g.led(x0 - 4.4, 0, 5.05, '#e2483d', false, .4);
    out.push(it);
    return out;
  };

  // the camera's 5 V, ground and video wires to the AIO's front pads
  const camWires = ctx => {
    const out = [];
    [['#d8473a', 1.2], ['#2c2926', 0], ['#f2c230', -1.2]].forEach(([col, y]) => {
      const pts = [[9.4, y, 27.6], [10.2, y, 26.2], [12.6, y, TOPB + .4]];
      out.push(...g.wire(pts, col, .5, 3));
      if (col === '#f2c230') ctx.flows.push({ kind: 'video', pts: pts.map(p => D.W(...p)) });
    });
    return out;
  };

  // the canopy: a moulded shell over the AIO, and a cradle (two cheeks and a brow, tilted with the camera) that
  // holds the camera in its nose
  const canopy = ctx => {
    const out = [], t = CAM.tilt * Math.PI / 180, [cx, cy, cz] = CAM.at;
    const u = [Math.cos(t), 0, Math.sin(t)], v = [0, 1, 0], n = [-Math.sin(t), 0, Math.cos(t)];
    const at = (a, b, c) => [cx + u[0] * a + v[0] * b + n[0] * c, cy + v[1] * b, cz + u[2] * a + n[2] * c];
    const layers = [[0, 2, 25, 23, 7.5, -3.5], [2, 4, 23.5, 21.5, 7, -3.8], [4, 6, 21.5, 19.5, 6.5, -4.1],
      [6, 7.6, 19, 17, 6, -4.5], [7.6, 9, 15.5, 14, 5, -5], [9, 10, 11, 10, 3.8, -5.5]];
    for (const [z0, z1, l, w, r, x0] of layers) out.push(g.plate(shift(D.rrect(l, w, r, 3), x0), TOPB + z0, z1 - z0, 'white'));
    for (const s of [-1, 1]) out.push(g.oblock(at(-.5, s * 7.95, 0), u, v, n, 5.2, .45, 7.2, 'white', .8));
    out.push(g.oblock(at(-.5, 0, 7.6), u, v, n, 5.2, 8.4, .45, 'white', .8));
    return out;
  };

  const passes = (api, id) => { if (typeof api.pass === 'function') api.pass(id); };

  SL.drone.define({
    id: 'whoop', fig: '02', title: 'Tiny Whoop 65 mm', palette: 'mint',
    mat: 108, height: 70, explode: 5.8, log: 'betaflight', arrowZ: 8,
    bounds: [-30, 30, -30, 30, 0, 34],
    frame: {
      layout: 'whoop', wheelbase: 65, numbering: 'betaflight',
      arm: { w: 3.2, t: FT, pad: 5.4 }, plate: { l: 30, w: 16, z: FZ, r: 4 }, motorZ: MZ,
      ducts: { r: DUCT.r, h: DUCT.h, t: DUCT.t, z: FZ },
      colors: { frame: 'pal', duct: 'pal' },
    },
    design: {
      default: { batt: '1s300', motor: '0702-25000', prop: '31mm-4' },
      batts: {
        '1s300': { cells: 1, mah: 300, chem: 'lihv', size: [67.3, 11.8, 6.1], color: '#3a3632', label: '1S 300' },
        '1s450': { cells: 1, mah: 450, chem: 'lihv', size: [62, 15.5, 6.7], color: '#2f5fa8', label: '1S 450 HV' },
        '2s300': { cells: 2, mah: 300, chem: 'lihv', size: [67.3, 23.6, 6.1], color: '#d9a520', label: '2S 300' },
      },
      motors: {
        '0702-25000': { stator: [7, 2], bell: [9.5, 4.6], kv: 25000, label: '0702 25000KV' },
        '0702-23000': { stator: [7, 2], bell: [9.5, 4.6], kv: 23000, label: '0702 23000KV' },
        '0702-27000': { stator: [7, 2], bell: [9.5, 4.6], kv: 27000, label: '0702 27000KV' },
      },
      props: {
        '31mm-4': { d: 1.22, pitch: 1, blades: 4, color: '#8fc7e8', label: '31 mm 4-blade' },
        '31mm-3': { d: 1.22, pitch: .8, blades: 3, color: '#f0a35c', label: '31 mm 3-blade' },
        '31mm-2': { d: 1.22, pitch: 1, blades: 2, color: '#c9a6e0', label: '31 mm 2-blade' },
      },
    },
    parts: [
      { id: 'FRAME', short: 'DUCTS', name: '65 mm one-piece ducted frame (PP)', z: 1,
        piece: [{ kind: 'frame' }, { kind: 'custom', draw: frameExtras }],
        tag: { at: [-23, 40.4, RIM], dx: -40, dy: 26 } },
      { id: 'MOTORS', short: 'MOTORS', name: '4 brushless 0702 motors', after: ['FRAME'], z: 1.8,
        piece: { kind: 'custom', draw: motorsDraw }, tag: { at: [23, 23, 15], dx: 58, dy: -30 },
        xr: [{ at: [23, -23, 12], text: '7 MM STATOR 9N12P' }] },
      { id: 'FC', short: 'AIO BOARD', name: '5-in-1 AIO: FC, 4 ESCs, ELRS RX, VTX, OSD', after: ['FRAME'], z: 3.2,
        polar: ['arrow forward', 'arrow backward'],
        piece: [
          { kind: 'standoffs', at: holes, z0: RIM + .3, z1: BOARD, r: 1.5, color: '#2c2926' },
          { kind: 'board', at: [0, 0, BOARD], size: [29, 29], t: 1, color: 'pcbBlack', holes: 26, arrow: true, arrowAt: [1, 0],
            chips: [
              { at: [1, 0], size: [7, 7, .9] }, { at: [-5.5, 0], size: [3, 2.5, .8] }, { at: [1, 7.8], size: [4, 4, .9] },
              { at: [-8.2, -8.6], size: [3.5, 3.5, .8] }, { at: [-6.5, 8.5], size: [5, 4.5, 1.2], color: 'alu' },
              { at: [6.2, 11.6], size: [2.5, 2.5, .7] }, { at: [6.2, -11.6], size: [2.5, 2.5, .7] },
              { at: [-6.2, 11.6], size: [2.5, 2.5, .7] }, { at: [-6.2, -11.6], size: [2.5, 2.5, .7] },
              { at: [9.6, 10], size: [1.8, 1.8, .6] }, { at: [9.6, -10], size: [1.8, 1.8, .6] },
              { at: [-9.6, 10], size: [1.8, 1.8, .6] }, { at: [-9.6, -10], size: [1.8, 1.8, .6] },
              { at: [3.4, 11.8], size: [1.8, 1.8, .6] }, { at: [3.4, -11.8], size: [1.8, 1.8, .6] },
              { at: [-3.4, 11.8], size: [1.8, 1.8, .6] }, { at: [-3.4, -11.8], size: [1.8, 1.8, .6] },
            ],
            pads: [{ at: [PAD_X, 2], size: [2.4, 2.2] }, { at: [PAD_X, -2], size: [2.4, 2.2] },
              { at: [12.6, 1.2], size: [1.4, 1] }, { at: [12.6, 0], size: [1.4, 1] }, { at: [12.6, -1.2], size: [1.4, 1] }],
            led: '#4aa3ff', ledAt: [-2.8, -11.2] },
          { kind: 'custom', draw: aioExtras },
        ],
        tag: { at: [-14, -14, TOPB], dx: -70, dy: 30 },
        xr: [{ at: [1, 0, TOPB + 1], text: 'G473 MCU + GYRO' },
          { at: [6.2, -11.6, TOPB + 1], text: '4 X 5 A ESC' }, { at: [-8.2, -8.6, TOPB + 1], text: 'ELRS RX, UART3' },
          { at: [-6.5, 8.5, TOPB + 1.4], text: 'VTX, SMARTAUDIO' }] },
      { id: 'WIRES', short: 'MOTOR PLUGS', name: 'Motor plugs in the AIO sockets', after: ['MOTORS', 'FC'], z: 2.6,
        piece: { kind: 'custom', draw: motorWires }, tag: { at: [15.4, -6.2, RIM + 2], dx: 64, dy: 34 },
        xr: [{ at: [15.4, 6.2, RIM + 2], text: 'JST1.25 PLUGS' }] },
      { id: 'XT60', short: 'BT2.0 LEAD', name: 'BT2.0 battery pigtail, soldered to the AIO pads', after: ['FC'], z: 3.4,
        polar: ['red lead to +', 'red lead to - (reversed)'], mistake: 'lead-reversed',
        piece: { kind: 'custom', draw: pigtail }, tag: { at: [-40, 0, 9.5], dx: -46, dy: -22 },
        xr: [{ at: [-24, 0, 12], text: 'VBAT 1S, 26 AWG' }] },
      { id: 'VTX', short: 'VTX ANT', name: '5.8 GHz VTX antenna (the VTX is on the AIO)', after: ['FC'], z: 3.6,
        piece: { kind: 'antenna', at: [-12.8, 7.4, TOPB + .6], dir: [-.55, .3, .78], len: 24, r: .5, color: 'black' },
        tag: { at: [-26, 14.7, 43.3], dx: -30, dy: -18 } },
      { id: 'RX', short: 'ELRS ANT', name: 'ExpressLRS 2.4 GHz antenna (the receiver is on the AIO)', after: ['FC'], z: 3.6,
        piece: { kind: 'antenna', at: [-12.8, -7.4, TOPB + .5], dir: [-.92, -.36, .16], len: 30, r: .4, color: 'white' },
        tag: { at: [-40, -18, 29], dx: -38, dy: 20 } },
      { id: 'TOP', short: 'CANOPY', name: 'Canopy that holds the camera', after: ['FC', 'RX', 'VTX'], z: 6, cover: true,
        piece: { kind: 'custom', draw: canopy }, tag: { at: [-5, 0, TOPB + 10], dx: -12, dy: -40 } },
      { id: 'CAM', short: 'CAMERA', name: '14 mm nano FPV camera, 25° uptilt', after: ['TOP'], z: 4.2,
        piece: [{ kind: 'camera', at: CAM.at, size: 14, tilt: CAM.tilt, depth: 9, lens: 4 }, { kind: 'custom', draw: camWires }],
        tag: { at: [24, 0, 35], dx: 52, dy: -16 } },
      { id: 'BATT', short: 'BATTERY', name: '1S LiHV pack and BT2.0 plug, in the holder under the frame', after: ['FRAME', 'XT60'], z: 0,
        piece: [{ kind: 'battery', at: [0, 0, 0], strap: false, pad: false }, { kind: 'custom', draw: packLead }],
        tag: { at: [26, 0, 6], dx: 46, dy: 30 }, xr: [{ at: [0, 0, 3], text: 'LIHV CELL 4.35 V' }] },
      { id: 'PROPS', short: 'PROPS', name: '31 mm press-fit props, 2 CW + 2 CCW', after: ['MOTORS', 'TOP'], z: 2.4,
        polar: ['props in (correct)', 'swapped CW/CCW'],
        piece: { kind: 'custom', draw: propsDraw }, tag: { at: [38, -23, 17], dx: 44, dy: -6 } },
    ],
    tests: {
      smoke: { needs: ['XT60', 'FC'], at: [-36, 44] },
      motors: { needs: ['WIRES', 'FC'] },
      calibrate: { needs: ['FC'] },
      plug: { needs: ['BATT', 'XT60', 'VTX'] },
    },
    messages: {
      powered: 'Beep beep beep: ESCs armed-ready, AIO and VTX on',
      plugNeeds: 'Fit the battery, the BT2.0 lead and the VTX antenna first: never power a VTX without its antenna',
      smokeNeeds: 'Fit the AIO and solder its BT2.0 lead first',
      pop: 'POP: the BT2.0 lead was soldered red-to-minus and the reversed pack burnt the AIO input. A smoke stopper would have caught it. Unplug, re-solder the lead',
      smokeShort: 'The smoke stopper lamp lit up: the BT2.0 lead is soldered the wrong way round. Re-solder it red to + before you plug in for real',
      faultFix: 'Fix the fault first: unplug and re-solder the BT2.0 lead red to +',
    },
    logs: {
      pop: 'POP: reverse polarity on the AIO input (BT2.0 lead reversed)',
      capNew: 'BT2.0 lead re-soldered red to +',
    },
    buttons: [
      { id: 'rxtest', label: 'Receiver test', onClick: api => {
        const st = api.st;
        if (!api.isOn('FC') || !api.isOn('RX')) return api.say('Fit the AIO and the ELRS antenna first', 2200, 'buzz');
        if (!st || !st.plugged || st.fault) return api.say('Plug in a battery: the receiver runs on the AIO', 2200, 'buzz');
        api.log('$ receiver tab: CRSF on UART3, 4 sticks + AUX1-AUX3 move');
        api.say('Bound: sticks move roll, pitch, yaw and throttle; AUX1 arms, AUX2 picks Angle, AUX3 turtle', 3200, 'ding');
        passes(api, 'rxtest');
      } },
      { id: 'failsafe', label: 'Failsafe test', onClick: api => {
        const st = api.st;
        if (!api.isOn('RX')) return api.say('Fit the ELRS antenna first', 2000, 'buzz');
        if (api.isOn('PROPS')) return api.say('PROPS OFF! Never spin motors on the bench with props on', 2800, 'buzz');
        if (!st || !st.plugged || st.fault) return api.say('Plug in a battery: the receiver runs on the AIO', 2200, 'buzz');
        api.log('$ radio off: RXLOSS, failsafe stage 2: DROP');
        api.say('Radio off: the OSD shows RXLOSS and the motors stop (DROP). Right for a 25 g indoor whoop', 3200, 'ding');
        passes(api, 'failsafe');
      } },
    ],
    wiring: {
      nodes: {
        BATT: { at: [20, 20], title: 'BATTERY', sub: 'batt', color: 'tomato' },
        XT60: { at: [20, 150], title: 'BT2.0 LEAD', sub: '1S pigtail, 26 AWG', color: 'tomato' },
        FC: { at: [300, 150], title: 'AIO 5-IN-1', sub: 'G473 FC + 4 x 5 A ESC', color: '#43a35a', led: '#4aa3ff' },
        WIRES: { at: [300, 268], title: 'MOTOR PLUGS', sub: 'JST1.25 x4', color: '#f08a2b' },
        MOTORS: { at: [580, 268], title: 'MOTORS x4', sub: 'motor', color: '#f08a2b' },
        CAM: { at: [300, 20], title: 'NANO CAMERA', sub: '14 mm, 25° up', color: '#f2c230' },
        RX: { at: [580, 20], title: 'ELRS ANTENNA', sub: '2.4 GHz, on the AIO', color: '#5a82c6' },
        VTX: { at: [580, 150], title: 'VTX ANTENNA', sub: '5.8 GHz, 25-400 mW', color: '#5a82c6' },
      },
      edges: [
        { from: 'BATT', to: 'XT60', kind: 'power', n: 2, label: 'V' },
        { from: 'XT60', to: 'FC', kind: 'power', n: 2, label: 'VBAT pads' },
        { from: 'FC', to: 'WIRES', kind: 'phase', n: 3, label: 'ESC M1-M4' },
        { from: 'WIRES', to: 'MOTORS', kind: 'phase', n: 3, label: '3-phase x4' },
        { from: 'CAM', to: 'FC', kind: 'video', label: 'video + 5 V' },
        { from: 'FC', to: 'RX', kind: 'rf', label: 'ELRS UART3 CRSF' },
        { from: 'FC', to: 'VTX', kind: 'rf', label: 'VTX UART2 SmartAudio' },
      ],
    },
  });
})();
