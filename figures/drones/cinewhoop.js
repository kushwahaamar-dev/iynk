// @cf title 3-inch cinewhoop
// @cf use engine/drone.js
// @cf use engine/drone-geo.js
// @cf use engine/drone-frames.js
// @cf use engine/drone-pieces.js
// @cf use engine/drone-sheet.js
/* Fig. 03, the 3-inch ducted cinewhoop on Betaflight. Geometry from docs/facts/cinewhoop.md: true-X with motors at
   +-52 mm (147.1 mm motor to motor), 3 mm carbon bottom plate, ducts r 39.5 / 41.5 mm and 24 mm tall around 3-inch
   props (r 38.1 mm, 1.4 mm tip gap), a 20 x 20 F722 + 35 A AIO-style stack, the DJI O3 air unit (32.5 x 30.5 x 14.5)
   on top of the stack and its camera (21.2 x 20 x 19.5) between the front ducts, a naked action camera on a 14 deg
   TPU wedge, powered from the flight pack through a 5 V BEC. Craft-local mm: x forward, y left, z up, z = 0 on the mat.
   Everything sits outside the four prop discs; parts that overhang them (top plate, battery, action camera) sit above
   the duct tops (z 27). */
(() => {
  const D = SL.drone, g = D.g, W = D.W, TAU = Math.PI * 2;
  const DUCT = { r: 39.5, t: 2, z: 3, h: 24 };       // inner radius, wall, underside, height
  const ESC_Z = 7, FC_Z = 12.5, O3 = { x0: -16.25, x1: 16.25, w: 30.5, z0: 18, h: 14.5 };
  const TOP_Z = 34, TOP_T = 2.5;
  const stack20 = (dx = 0) => [[10 + dx, 10], [10 + dx, -10], [-10 + dx, 10], [-10 + dx, -10]];
  const CAM_TILT = 15, GOPRO_TILT = 14;

  // a convex outline in the x-z plane, extruded along y (the action camera's TPU wedge)
  const prism = (xz, y0, y1, c) => {
    const m = D.mat(c), n = xz.length, A = xz.map(([x, z]) => W(x, y0, z)), B = xz.map(([x, z]) => W(x, y1, z));
    let area = 0;
    for (let i = 0; i < n; i++) { const [x0, z0] = xz[i], [x1, z1] = xz[(i + 1) % n]; area += x0 * z1 - x1 * z0; }
    const sg = area >= 0 ? 1 : -1;
    let s = '';
    if (vis([0, -1, 0])) s += shape(A, tone([0, -1, 0], m), .8);
    if (vis([0, 1, 0])) s += shape(B, tone([0, 1, 0], m), .8);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, ex = xz[j][0] - xz[i][0], ez = xz[j][1] - xz[i][1], nn = norm([ez * sg, 0, -ex * sg]);
      if (vis(nn)) s += shape([A[i], A[j], B[j], B[i]], tone(nn, m), .8);
    }
    return { box: D.bbox([...A, ...B]), svg: s };
  };

  // two carbon spokes per duct at +-60 deg from the outward diagonal: with the arm they hold the duct ring
  const spokes = ctx => {
    const out = [];
    for (const mo of ctx.craft.motors) for (const s of [-1, 1]) {
      const a = mo.ang + s * Math.PI / 3, ux = Math.cos(a), uy = Math.sin(a), px = -uy * 2.6, py = ux * 2.6;
      const r0 = 12, r1 = DUCT.r + DUCT.t;
      out.push(g.plate([[mo.x + ux * r0 - px, mo.y + uy * r0 - py], [mo.x + ux * r1 - px, mo.y + uy * r1 - py],
        [mo.x + ux * r1 + px, mo.y + uy * r1 + py], [mo.x + ux * r0 + px, mo.y + uy * r0 + py]], 0, 3, 'carbon'));
    }
    return out;
  };

  // the ducts: wall segments (inner face, outer face, rim) and a TPU bumper band, one item per segment so the
  // far wall sorts behind the prop and the near wall in front of it
  const ducts = ctx => {
    const items = [], m = D.mat(ctx.st.pal || 'mint'), bump = D.mat('dark'), N = 18, { r, t, z, h } = DUCT, R1 = r + t, RB = R1 + 1.2;
    for (const mo of ctx.craft.motors) {
      const p = (rr, a, zz) => W(mo.x + rr * Math.cos(a), mo.y + rr * Math.sin(a), zz);
      for (let i = 0; i < N; i++) {
        const a0 = i / N * TAU, a1 = (i + 1) / N * TAU, am = (a0 + a1) / 2;
        const no = [Math.cos(am), Math.sin(am), 0], ni = [-no[0], -no[1], 0];
        let s = '';
        if (vis(ni)) s += shape([p(r, a0, z), p(r, a1, z), p(r, a1, z + h), p(r, a0, z + h)], toneI(ni, m), .7);
        if (vis(no)) {
          s += shape([p(R1, a0, z), p(R1, a1, z), p(R1, a1, z + h), p(R1, a0, z + h)], tone(no, m), .7);
          s += shape([p(RB, a0, z + 8), p(RB, a1, z + 8), p(RB, a1, z + 14), p(RB, a0, z + 14)], tone(no, bump), .6);
        }
        s += shape([p(r, a0, z + h), p(r, a1, z + h), p(R1, a1, z + h), p(R1, a0, z + h)], tone([0, 0, 1], m), .6);
        items.push({ box: D.bbox([p(r, a0, z), p(r, a1, z), p(RB, a0, z + h), p(RB, a1, z + h)]), svg: s });
      }
      ctx.shadows.push(D.circ(mo.x, mo.y, R1, 14).map(([x, y]) => W(x, y, z + h)));
    }
    return items;
  };

  // ESC to FC: the 8-pin harness (VBAT, current, M1-M4) as a short hairpin at the back of the stack
  const harness = ctx => {
    const out = [];
    [['#e8d36a', 7.6], ['#d8473a', 9], ['#2c2926', 10.4]].forEach(([col, y]) =>
      out.push(...g.wire([[-12, y, ESC_Z + 1.8], [-15.5, y, ESC_Z + 1.8], [-15.5, y, FC_Z + 1.9], [-12, y, FC_Z + 1.9]], col, .7, 5)));
    ctx.flows.push({ kind: 'signal', pts: [[-12, 9, ESC_Z + 2.2], [-15.5, 9, ESC_Z + 2.2], [-15.5, 9, FC_Z + 2.3], [-12, 9, FC_Z + 2.3]].map(p => W(...p)) });
    return out;
  };

  // the O3 air unit on top of the stack: finned case, status LED, the 3-in-1 lead to the FC (VBAT, GND, UART1),
  // the camera coax and two antennas led out between the rear ducts, behind the top plate
  const airUnit = ctx => {
    const { x0, x1, w, z0, h } = O3, out = [];
    const body = g.box(x0, -w / 2, z0, x1, w / 2, z0 + h, '#5b5f63', 1);
    for (let i = 0; i < 6; i++) { const x = x0 + 4 + i * 4.9; body.svg += g.box(x - .9, -w / 2 + 3, z0 + h, x + .9, w / 2 - 3, z0 + h + 1.4, 'metal', .4).svg; }
    body.svg += g.text(x0 + 6, 0, z0 + h + .05, 'O3', 5, '#d9d3c6', 'y');
    body.svg += g.led(x0 + 3, w / 2 - 3, z0 + h + 1.6, '#43c463', ctx.powered);
    body.box = D.bbox([W(x0, -w / 2, z0), W(x1, w / 2, z0 + h + 1.4)]);
    out.push(body);
    for (const sy of [-1, 1]) out.push(g.box(-12, sy * 13 - 1.5, FC_Z + 2.4, 12, sy * 13 + 1.5, z0, '#3d3b39', .6));
    [['#d8473a', -7.6], ['#2c2926', -9], ['#f4f1e8', -10.4]].forEach(([col, y]) =>
      out.push(...g.wire([[-14, y, z0 + 2], [-17.5, y, z0 + 1], [-17.5, y, FC_Z + 2.2], [-12, y, FC_Z + 2.2]], col, .7, 5)));
    ctx.flows.push({ kind: 'power', pts: [[-12, -7.6, FC_Z + 2.6], [-17.5, -7.6, FC_Z + 2.6], [-17.5, -7.6, z0 + 1.4], [-14, -7.6, z0 + 2.4]].map(p => W(...p)) },
      { kind: 'signal', pts: [[-12, -10.4, FC_Z + 2.6], [-17.5, -10.4, FC_Z + 2.6], [-17.5, -10.4, z0 + 1.4], [-14, -10.4, z0 + 2.4]].map(p => W(...p)) });
    const coax = [[x1, 3, z0 + 6], [19, 8, z0 + 9], [22, 6, z0 + 2], [21.5, 0, 17.5]];
    out.push(...g.wire(coax, '#2c2926', 1.1, 6));
    ctx.flows.push({ kind: 'video', pts: coax.slice().reverse().map(p => W(...p)) });
    for (const sy of [-1, 1]) {
      const base = [-47, sy * 4.5, 30];
      out.push(...g.wire([[x0, sy * 4, z0 + 8], [-30, sy * 4.2, 30.5], [base[0] + 1, base[1], base[2]]], '#2c2926', 1, 6));
      out.push(g.cyl(base[0], base[1], base[2] - 1.5, base[2] + 2.5, 2.2, '#3d3b39', 10));
      out.push(...g.rod([base[0], base[1], base[2] + 2.5], [base[0] - 16, base[1] + sy * 6.5, base[2] + 22], 1.1, '#2c2926', 8, 6));
      out.push(g.cyl(base[0] - 16, base[1] + sy * 6.5, base[2] + 21, base[2] + 27, 1.9, 'pal', 8));
    }
    return out;
  };

  // naked action camera: TPU wedge, a caseless camera board in a light case, lens, REC LED and the 5 V BEC
  const actionCam = ctx => {
    const out = [], z = TOP_Z + TOP_T, xb = 21, xf = 49, rise = (xf - xb) * Math.tan(GOPRO_TILT * Math.PI / 180);
    out.push(prism([[xb, z], [xf, z], [xf, z + 1 + rise], [xb, z + 1]], -17, 17, '#3d3b39'));
    const tl = GOPRO_TILT * Math.PI / 180, u = [Math.cos(tl), 0, Math.sin(tl)], v = [0, 1, 0], n = [-Math.sin(tl), 0, Math.cos(tl)];
    const hu = 11, hv = 19, hn = 14, bc = [(xb + xf) / 2, 0, z + 1 + rise / 2];
    const o = [bc[0] + n[0] * hn, 0, bc[2] + n[2] * hn];
    const body = g.oblock(o, u, v, n, hu, hv, hn, '#4a4744', 1);
    out.push(body);
    const lensAt = [o[0] + u[0] * hu, -6, o[2] + u[2] * hu + 3], tip = [lensAt[0] + u[0] * 6, lensAt[1], lensAt[2] + u[2] * 6];
    out.push(...g.rod(lensAt, tip, 8.5, '#2c2926', 8, 16));
    out.push(...g.rod(tip, [tip[0] + u[0] * .8, tip[1], tip[2] + u[2] * .8], 6, '#5f88b8', 2, 16));
    const topC = [o[0] + n[0] * hn, 0, o[2] + n[2] * hn];
    body.svg += g.led(topC[0] + 4, 12, topC[2] + 1.2, '#e2483d', ctx.powered);
    out.push(g.box(xb - 3.4, 3, z + 9, xb - .4, 17, z + 21, 'pcbBlack', .6));
    const lead = [[xb - 2, 12, z + 10], [14, 25, z + 1], [6, 25, 20], [-4, 21, 12.5], [-12, 6.5, ESC_Z + 2]];
    out.push(...g.wire(lead, '#d8473a', 1, 6), ...g.wire(lead.map(([x, y, zz]) => [x, y - 1.4, zz]), '#2c2926', 1, 6));
    ctx.flows.push({ kind: 'power', pts: lead.slice().reverse().map(p => W(...p)) });
    return out;
  };

  // the receiver's 2.4 GHz dipole, led back between the rear ducts
  const rxAntenna = () => g.rod([-40, 7, 6], [-55, 8.6, 26], .9, '#2c2926', 8, 6)
    .concat([g.cyl(-55, 8.6, 25, 28.5, 1.4, '#2c2926', 8)]);

  // the four checks this craft adds to the engine's three; each result is valid while the parts it was run on stay
  // fitted (a re-fitted part is a new record in st.placed, so the tick goes away on its own)
  const passed = {};
  const NEEDS = { clearance: ['DUCTS', 'PROPS'], osd: ['FC', 'VTX', 'CAM', 'RX'], failsafe: ['FC', 'RX', 'ESC'], arm: ['FC', 'RX', 'BATT'] };
  const fitted = (st, ids) => ids.every(id => D.isOn(st, id));
  const pass = (st, id) => { passed[id] = NEEDS[id].map(p => st.placed[p]); if (D.api.pass) D.api.pass(id); };
  const holds = (st, id) => !!passed[id] && fitted(st, NEEDS[id]) && NEEDS[id].every((p, i) => st.placed[p] === passed[id][i]);
  const busyWith = st => !!st.test || st.queue.length > 0;
  const guard = (api, st, ids) => {
    if (busyWith(st)) { api.say('Wait for the test to finish', 1600, 'tick'); return false; }
    if (st.exT || st.ex > .01) { api.say('Close the exploded view first', 2000, 'buzz'); return false; }
    const miss = ids.find(id => !D.isOn(st, id));
    if (miss) { api.say(CF_T('Fit the {part} first', { part: CF_T(D.craft().byId[miss].short).toLocaleLowerCase() }), 2400, 'buzz'); return false; }
    return true;
  };
  const arming = st => {
    const flags = [];
    if (!D.isOn(st, 'RX')) flags.push('RXLOSS');
    if (!st.accOk) flags.push('NO_ACC_CAL');
    if (st.fault) flags.push('BOOTGRACE');
    return flags;
  };

  D.define({
    id: 'cinewhoop', fig: '03', title: '3-inch cinewhoop', palette: 'mint',
    mat: 240, height: 110, explode: 10, log: 'betaflight',
    bounds: [-75, 75, -75, 75, 0, 72],
    messages: { powered: 'Beep beep beep: ESCs ready, FC, air unit and action cam on' },
    frame: {
      layout: 'whoop', wheelbase: 147.1, numbering: 'betaflight',
      arm: { w: 12, t: 3, pad: 14 }, plate: { l: 88, w: 24, z: 0, r: 6 }, motorZ: 3, ducts: null,
    },
    design: {
      default: { batt: '4s1100', motor: '2004-3000', prop: '3x3x3' },
      batts: {
        '4s1100': { cells: 4, mah: 1100, size: [66, 34, 28], color: '#2b2a28', label: '4S 1100' },
        '4s850': { cells: 4, mah: 850, size: [56, 30, 24], color: '#d9a520', label: '4S 850' },
        '6s850': { cells: 6, mah: 850, size: [66, 34, 30], color: '#2f5fa8', label: '6S 850' },
      },
      motors: {
        '2004-3000': { stator: [20, 4], bell: [25, 12], kv: 3000, label: '2004 3000KV' },
        '2004-1950': { stator: [20, 4], bell: [25, 12], kv: 1950, label: '2004 1950KV' },
        '1404-4600': { stator: [14, 4], bell: [18.5, 10], kv: 4600, label: '1404 4600KV' },
      },
      props: {
        '3x3x3': { d: 3, pitch: 3, blades: 3, color: '#4fa3d1', label: '3x3x3' },
        '3x2x5': { d: 3, pitch: 2, blades: 5, color: '#5b5f63', label: '3x2x5' },
        '3x3.5x3': { d: 3, pitch: 3.5, blades: 3, color: '#d8869c', label: '3x3.5x3' },
      },
    },
    parts: [
      { id: 'FRAME', short: 'FRAME', name: 'Carbon bottom plate, arms and duct spokes', z: 0,
        piece: [{ kind: 'frame' }, { kind: 'custom', draw: spokes }], tag: { at: [-30, -10, 3], dx: -64, dy: 52 } },
      { id: 'DUCTS', short: 'DUCTS', name: 'Ducts (prop guards) with TPU bumpers', after: ['FRAME'], z: 1,
        piece: { kind: 'custom', draw: ducts }, tag: { at: [52, -93.5, 27], dx: 40, dy: 18 },
        xr: [{ at: [52, -52 - DUCT.r, 22], text: '1.4 MM TIP GAP' }] },
      { id: 'MOTORS', short: 'MOTORS', name: '4 brushless motors', after: ['FRAME'], z: 1.4,
        piece: { kind: 'motors' }, tag: { at: [-52, 52, 18], dx: -74, dy: -30 },
        xr: [{ at: [52, 52, 11], text: 'STATOR 12N14P' }] },
      { id: 'ESC', short: '4-IN-1 ESC', name: '35 A 4-in-1 ESC, 20 x 20 (AM32)', after: ['FRAME'], z: 1,
        piece: [
          { kind: 'standoffs', at: stack20(), z0: 3, z1: ESC_Z, r: 2.2, color: '#3d3b39' },
          { kind: 'board', at: [0, 0, ESC_Z], size: [26, 26], t: 1.6, color: 'pcb', holes: 20,
            chips: [{ at: [0, 0], size: [4.5, 4.5, .9], label: 'AT32' },
              ...[[-8.5, -4.5], [-8.5, 4.5], [8.5, -4.5], [8.5, 4.5], [-4.5, -9], [4.5, -9], [-4.5, 9], [4.5, 9]].map(at => ({ at, size: [3.3, 3.3, 1] }))],
            pads: [{ at: [-11.2, 2.6], size: [3, 3.6] }, { at: [-11.2, -2.6], size: [3, 3.6] }] },
        ],
        tag: { at: [12, -12, ESC_Z + 2.6], dx: 92, dy: 40 }, xr: [{ at: [8.5, -4.5, ESC_Z + 3], text: '4 x 35 A MOSFETS' }] },
      { id: 'WIRES', short: 'MOTOR WIRES', name: 'Motor phase wires soldered to the ESC', after: ['MOTORS', 'ESC'], z: 1.2,
        piece: { kind: 'wires', from: [0, 0, ESC_Z + 1.6], padR: 15, edge: 3 },
        tag: { at: [-30, -30, 5], dx: -58, dy: 44 } },
      { id: 'FC', short: 'FLIGHT CTRL', name: 'F722 flight controller, 20 x 20 (Betaflight)', after: ['ESC'], z: 2.2,
        polar: ['arrow forward', 'arrow backward'],
        piece: [
          { kind: 'standoffs', at: stack20(), z0: ESC_Z + 1.6, z1: FC_Z, r: 2, color: '#3d3b39' },
          { kind: 'board', at: [0, 0, FC_Z], size: [26, 26], t: 1.6, color: 'pcbBlue', holes: 20, arrow: true, arrowAt: [-2, 4],
            chips: [{ at: [4, -5], size: [7, 7, 1.2], label: 'F722' }, { at: [-6, -6], size: [3, 3, .9] }, { at: [6, 7], size: [4, 4, 1] }],
            led: '#4aa3ff', ledAt: [-9, 9], usb: [-2, 11.5] },
          { kind: 'custom', draw: harness },
        ],
        tag: { at: [10, 10, FC_Z + 2], dx: -100, dy: 6 },
        xr: [{ at: [-6, -6, FC_Z + 2.6], text: 'GYRO ICM-42688-P' }] },
      { id: 'XT60', short: 'XT60 + CAP', name: 'XT60 pigtail and 470 µF 35 V low-ESR capacitor', after: ['ESC'], z: 1.8,
        polar: ['stripe to minus', 'stripe to plus'],
        piece: { kind: 'xt60', at: [-86, -2, 8], dir: [-1, 0, 0], lead: [[-12, -2, ESC_Z + 1.9], [-22, -2, 5.5], [-50, -2, 5.5], [-66, -2, 7], [-78, -2, 8]],
          cap: { at: [-5.5, 18.5, 9], dir: [1, 0, 0], r: 4, l: 11.5, stripe: [0, -1, 0],
            leads: [[[-5.5, 17, 9], [-11, 4.5, ESC_Z + 1.9]], [[-5.5, 20, 9], [-12.5, -.6, ESC_Z + 2.2]]] } },
        tag: { at: [-86, -2, 12], dx: -40, dy: -30 }, xr: [{ at: [0, 18.5, 13], text: '470 µF 35 V CAP' }] },
      { id: 'CAM', short: 'O3 CAMERA', name: 'DJI O3 camera module, 15° uptilt', after: ['FRAME'], z: 2,
        piece: { kind: 'camera', at: [30, 0, 17], size: 20, tilt: CAM_TILT, depth: 19.5, plates: { gap: .5, l: 20, h: 27, t: 1.5, color: 'pal' } },
        tag: { at: [46, 0, 22], dx: 74, dy: 26 }, xr: [{ at: [40, 0, 24], text: '1/1.7" SENSOR' }] },
      { id: 'VTX', short: 'AIR UNIT', name: 'DJI O3 air unit (HD video transmitter)', after: ['FC', 'CAM'], z: 2.8, cover: true,
        piece: { kind: 'custom', draw: airUnit }, tag: { at: [-14, 12, O3.z0 + O3.h + 1.4], dx: -88, dy: -40 },
        xr: [{ at: [0, 0, O3.z0 + O3.h + 1], text: '5.8 GHZ HD LINK' }] },
      { id: 'RX', short: 'RECEIVER', name: 'ExpressLRS 2.4 GHz receiver (CRSF)', after: ['FC'], z: 1.6,
        piece: [{ kind: 'module', at: [-34, 7, 3], size: [12, 8.5, 3], color: 'pcbBlack', label: 'ELRS', labelSize: .3, led: '#43c463', ledAt: [4, 2.5] },
          { kind: 'custom', draw: rxAntenna }],
        tag: { at: [-34, 7, 6], dx: -70, dy: -58 }, xr: [{ at: [-34, 7, 6.5], text: 'ELRS ON UART2' }] },
      { id: 'TOP', short: 'TOP PLATE', name: 'Top plate and 31 mm standoffs', after: ['FC', 'CAM', 'RX', 'VTX'], z: 3.6, cover: true,
        piece: [{ kind: 'standoffs', at: [[17, 18], [17, -18], [-22, 10.5], [-22, -10.5]], z0: 3, z1: TOP_Z, r: 2.4, split: 7.8 },
          { kind: 'plate', outline: [[48, -14], [48, 14], [32, 21], [-38, 21], [-46, 14], [-46, -14], [-38, -21], [32, -21]], z: TOP_Z, t: TOP_T, color: 'carbon' }],
        tag: { at: [-40, -18, TOP_Z + TOP_T], dx: -72, dy: 30 } },
      { id: 'GOPRO', short: 'ACTION CAM', name: 'Naked action camera, TPU wedge and 5 V BEC', after: ['TOP'], z: 4.6, cover: true,
        piece: { kind: 'custom', draw: actionCam }, tag: { at: [40, -18, 66], dx: 70, dy: -40 },
        xr: [{ at: [19, 10, 48], text: '5 V BEC POWERED' }] },
      { id: 'BATT', short: 'BATTERY', name: 'LiPo battery, strap and grip pad', after: ['TOP', 'XT60'], z: 4.2, cover: true,
        piece: { kind: 'battery', at: [-17, 0, TOP_Z + TOP_T], strap: true, pad: true },
        tag: { at: [-30, 0, 67], dx: -30, dy: -44 }, xr: [{ at: [-17, 0, 52], text: 'CELLS IN SERIES' }] },
      { id: 'PROPS', short: 'PROPS', name: '3-inch ducted props, 2 CW + 2 CCW', after: ['MOTORS', 'DUCTS', 'TOP'], z: 2.4,
        polar: ['props in (correct)', 'swapped CW/CCW'],
        piece: { kind: 'props' }, tag: { at: [-52, -90, 23], dx: -40, dy: 30 } },
    ],
    tests: {
      smoke: { needs: ['XT60', 'ESC'], at: [-36, 104] },
      motors: { needs: ['WIRES', 'FC'] },
      calibrate: { needs: ['FC'] },
      plug: { needs: ['BATT', 'XT60'] },
    },
    inside: [{ at: [-15.5, 9, FC_Z - 1.5], text: '8-PIN HARNESS', part: 'FC' },
      { at: [-17.5, -9, O3.z0 - 1.5], text: 'VBAT + UART1', part: 'VTX' }],
    buttons: [
      { id: 'clearance', label: 'Prop clearance check', onClick: api => {
        const st = api.st;
        if (st.plugged) return api.say('Unplug the battery first: never work on a live quad', 2400, 'buzz');
        if (!guard(api, st, NEEDS.clearance)) return;
        const r = D.resolved(st).prop.d * 25.4 / 2, gap = DUCT.r - r;
        api.log(CF_T('$ prop clearance: prop r {r} mm in a {d} mm duct: {g} mm', { r: r.toFixed(1), d: DUCT.r, g: gap.toFixed(1) }));
        pass(st, 'clearance');
        api.say(CF_T('Turned every prop by hand: {g} mm to the duct wall all round, no rub, no chipped tips', { g: gap.toFixed(1) }), 2800, 'ding');
      } },
      { id: 'osd', label: 'OSD and link check', onClick: api => {
        const st = api.st;
        if (!guard(api, st, NEEDS.osd)) return;
        if (st.fault) return api.say('Fix the fault first (unplug, replace the capacitor)', 2600, 'buzz');
        if (!st.plugged) return api.say('Plug in the battery: the air unit runs on battery voltage', 2600, 'buzz');
        api.log('$ serial UART1 131073 115200 57600 0 115200');
        api.log(CF_T('osd: MSP DisplayPort, HD canvas 53 x 20, link quality on'));
        pass(st, 'osd');
        api.say('Goggles: HD picture with the OSD (battery, link quality, timer). UART1 carries MSP + VTX_MSP', 3000, 'ding');
      } },
      { id: 'failsafe', label: 'Failsafe test', onClick: api => {
        const st = api.st;
        if (!guard(api, st, NEEDS.failsafe)) return;
        if (D.isOn(st, 'PROPS')) return api.say('PROPS OFF! Never spin motors on the bench with props on', 2600, 'buzz');
        if (!st.plugged) return api.say('Plug in a battery (USB alone can’t spin motors)', 2400, 'buzz');
        const flags = arming(st);
        if (flags.length) return api.say(CF_T('Arming refused: {flags}', { flags: flags.join(', ') }), 3000, 'buzz');
        api.log(CF_T('$ armed on the bench, props off; radio switched off'));
        api.log(CF_T('RXLOSS: failsafe stage 1, last sticks for 1.5 s'));
        api.log(CF_T('failsafe stage 2: DROP, motors stopped, disarmed'));
        pass(st, 'failsafe');
        api.say('Radio off: after 1.5 s the motors stopped and it disarmed (failsafe_procedure = DROP)', 3200, 'ding');
      } },
      { id: 'arm', label: 'Pre-arm check', onClick: api => {
        const st = api.st;
        if (!guard(api, st, ['FC'])) return;
        if (!st.plugged) return api.say('Plug in the battery first: arming needs it', 2400, 'buzz');
        const flags = arming(st);
        api.log('$ status');
        api.log(CF_T('arming disable flags: {flags}', { flags: flags.length ? flags.join(' ') : CF_T('none') }));
        if (flags.length) return api.say(CF_T('Arming blocked: {flags}', { flags: flags.join(', ') }), 3000, 'buzz');
        if (D.isOn(st, 'RX') && D.isOn(st, 'BATT')) pass(st, 'arm');
        api.say(D.orient(st, 'FC') === 1
          ? 'No arming flags, yet the FC arrow points backwards: a reversed board passes every check and flips on take-off'
          : 'No arming flags: it would arm. Props still off on the bench', 3200, D.orient(st, 'FC') === 1 ? 'buzz' : 'ding');
      } },
    ],
    report: st => ({ clearanceOk: holds(st, 'clearance'), osdOk: holds(st, 'osd'), failsafeOk: holds(st, 'failsafe'), armOk: holds(st, 'arm') }),
    wiring: {
      nodes: {
        BATT: { at: [20, 274], title: 'BATTERY', sub: 'batt', color: 'tomato' },
        XT60: { at: [210, 274], title: 'XT60 + CAP', sub: '470 µF 35 V', color: 'tomato' },
        ESC: { at: [400, 274], title: '4-IN-1 ESC', sub: '35 A x4, AM32', color: '#f08a2b' },
        MOTORS: { at: [590, 274], title: 'MOTORS x4', sub: 'motor', color: '#f08a2b' },
        GOPRO: { at: [20, 142], title: 'ACTION CAM', sub: 'naked, 4K + gyro', color: '#f2c230', led: '#e2483d' },
        FC: { at: [400, 142], title: 'FLIGHT CTRL', sub: 'F722, Betaflight', color: '#43a35a', led: '#4aa3ff' },
        VTX: { at: [590, 142], title: 'AIR UNIT', sub: 'DJI O3, 1080p/100', color: '#f2c230', led: '#43c463' },
        RX: { at: [210, 10], title: 'RECEIVER', sub: 'ELRS 2.4 GHz', color: '#43a35a', led: '#43c463' },
        CAM: { at: [590, 10], title: 'O3 CAMERA', sub: '155°, 15° up', color: '#f2c230' },
      },
      edges: [
        { from: 'BATT', to: 'XT60', kind: 'power', n: 2, label: 'V' },
        { from: 'XT60', to: 'ESC', kind: 'power', n: 2, label: 'VBAT' },
        { from: 'ESC', to: 'MOTORS', kind: 'phase', n: 3, label: '3-phase x4', labelAt: [0, -36] },
        { from: 'FC', to: 'ESC', kind: 'signal', label: 'DShot300 bidir + VBAT, CUR', labelAt: [0, 0] },
        { from: 'RX', to: 'FC', kind: 'signal', label: 'UART2 CRSF + 5 V', labelAt: [-2, -8] },
        { from: 'VTX', to: 'FC', kind: 'signal', label: 'UART1 MSP + VBAT', labelAt: [0, -36] },
        { from: 'CAM', to: 'VTX', kind: 'video', label: 'coax', labelAt: [22, 4] },
        { from: 'XT60', to: 'GOPRO', kind: 'power', n: 2, label: '5 V BEC', via: [[285, 236], [95, 236]] },
      ],
    },
  });
})();
