// @cf title 7-inch long-range quad
// @cf use engine/drone.js
// @cf use engine/drone-geo.js
// @cf use engine/drone-frames.js
// @cf use engine/drone-pieces.js
// @cf use engine/drone-sheet.js
// Fig. 04: a 7-inch long-range quad on Betaflight 2026.6 with GPS Rescue, an ExpressLRS 900 MHz link and a
// 6S1P 21700 Li-ion pack. Geometry and wiring from docs/facts/longrange.md (315 mm True-X, 6 mm arms,
// 30.5 mm stack, M10 GPS + QMC5883L compass on a rear mast with the module kept level).
(() => {
  const g = SL.drone.g;

  // the craft's own bench tests (compass, GPS lock, failsafe) keep their results here
  const own = st => st.lr || (st.lr = { compass: null, gps: null, fs: null });
  const seated = (st, rec, ids) => !!rec && ids.every(id => {
    const pl = st.placed[id];
    return !!pl && !pl.leave && pl === rec.seats[id] && pl.orient === rec.orients[id];
  });
  const finished = (st, rec) => !!rec && st.t >= rec.at;
  const snapshot = (st, ids) => ({
    seats: Object.fromEntries(ids.map(id => [id, st.placed[id]])),
    orients: Object.fromEntries(ids.map(id => [id, st.placed[id] ? st.placed[id].orient : 0])),
  });

  const MSG = {
    busy: 'Wait for the test to finish',
    exploded: 'Close the exploded view first',
    needGps: 'Fit the GPS + compass module first: the compass is inside it',
    compassOk: 'Compass calibrated. Heading checked against a phone compass: N, E, S and W agree within 10°',
    compassBack: 'Compass calibrated, but the heading reads 180° off: the GPS arrow points backwards. Turn the module round before you trust it',
    gpsOk: 'GPS 3D fix: 14 satellites (8 needed to arm). The green LED blinks once a second; home is set when you arm',
    needRxGps: 'Fit the receiver and the GPS first',
    propsOff: 'PROPS OFF! Never spin motors on the bench with props on',
    needPlug: 'Plug in the battery: the failsafe test arms the quad (props off)',
    fault: 'Fix the fault first (unplug, replace the capacitor)',
    noAcc: 'Arming blocked: NO_ACC_CAL. Calibrate the accelerometer first',
    noFix: 'Arming blocked: GPS. No 3D fix with 8 or more satellites, so no home point. Get a GPS lock first',
    fsOk: 'Radio off: RXLOSS, then after 1.5 s failsafe stage 2: GPS RESCUE on the OSD, motors spool up, SOS beeps. Radio back on and sticks moved: control is yours again',
    fsWrong: 'Radio off: failsafe, GPS RESCUE, but the OSD home arrow points away from home: the compass is reversed. Turn the GPS module round',
  };
  const LOG = {
    compass: '$ calibrate magnetometer: turn the quad through every axis for 30 s',
    gps: '$ GPS tab, outdoors under a clear sky: waiting for a 3D fix',
    failsafe: '$ props off, arm, switch the radio off',
  };

  function busy(api){
    const st = api.st;
    if (st.test || st.queue.length) { api.say(MSG.busy, 1600, 'tick'); return true; }
    if (st.exT || st.ex > 0.01) { api.say(MSG.exploded, 2000, 'buzz'); return true; }
    return false;
  }

  function compassTest(api){
    const st = api.st;
    if (!st || busy(api)) return;
    if (!api.isOn('GPS')) return api.say(MSG.needGps, 2400, 'buzz');
    const back = api.orient('GPS') === 1, dur = 2.6;
    own(st).compass = { ...snapshot(st, ['GPS', 'FC']), at: st.t + dur, ok: !back };
    st.test = { kind: 'compass', t: 0, dur };
    st.later.push({ t: dur, say: back ? MSG.compassBack : MSG.compassOk, sfx: back ? 'buzz' : 'ding' });
    api.log(LOG.compass);
    api.sfx('click');
  }

  function gpsTest(api){
    const st = api.st;
    if (!st || busy(api)) return;
    if (!api.isOn('GPS')) return api.say(MSG.needGps, 2400, 'buzz');
    const dur = 3.2;
    own(st).gps = { ...snapshot(st, ['GPS']), at: st.t + dur };
    st.test = { kind: 'gps', t: 0, dur };
    st.later.push({ t: dur, say: MSG.gpsOk, sfx: 'ding' });
    api.log(LOG.gps);
    api.sfx('click');
  }

  function gpsFix(st){
    const r = own(st).gps;
    return finished(st, r) && seated(st, r, ['GPS']);
  }

  function failsafeTest(api){
    const st = api.st;
    if (!st || busy(api)) return;
    if (!api.isOn('RX') || !api.isOn('GPS')) return api.say(MSG.needRxGps, 2400, 'buzz');
    if (st.placed.PROPS && !st.placed.PROPS.leave) return api.say(MSG.propsOff, 2800, 'buzz');
    if (st.fault) return api.say(MSG.fault, 2600, 'buzz');
    if (!st.plugged) return api.say(MSG.needPlug, 2600, 'buzz');
    if (!st.accOk) return api.say(MSG.noAcc, 3000, 'buzz');
    if (!gpsFix(st)) return api.say(MSG.noFix, 3400, 'buzz');
    const back = api.orient('GPS') === 1, dur = 3.4;
    own(st).fs = { ...snapshot(st, ['RX', 'GPS', 'FC']), at: st.t + dur, ok: !back };
    st.test = { kind: 'failsafe', t: 0, dur };
    st.later.push({ t: dur, say: back ? MSG.fsWrong : MSG.fsOk, sfx: back ? 'buzz' : 'ding' });
    api.log(LOG.failsafe);
    api.sfx('buzz');
  }

  // the rear GPS mast: printed TPU, leaning back 22°, with a level platform so the compass stays flat
  const MAST = { base: [-54, 0, 38], lean: 22, h: 36 };
  const mastTop = (() => {
    const a = MAST.lean * Math.PI / 180;
    return [MAST.base[0] - MAST.h * Math.sin(a), 0, MAST.base[2] + MAST.h * Math.cos(a)];
  })();
  const drawMast = () => {
    const a = MAST.lean * Math.PI / 180, n = [-Math.sin(a), 0, Math.cos(a)], u = [Math.cos(a), 0, Math.sin(a)];
    const items = [];
    for (let i = 0; i < 3; i++){
      const c = [MAST.base[0] + n[0] * MAST.h * (i + .5) / 3, 0, MAST.base[2] + n[2] * MAST.h * (i + .5) / 3];
      items.push(g.oblock(c, u, [0, 1, 0], n, 4, 7, MAST.h / 6, 'pal'));
    }
    items.push(g.box(mastTop[0] - 12, -12, mastTop[2], mastTop[0] + 12, 12, mastTop[2] + 2, 'pal'));
    items.push(g.box(MAST.base[0] - 9, -10, MAST.base[2], MAST.base[0] + 9, 10, MAST.base[2] + 2, 'pal'));
    return items;
  };

  // ELRS signal and analog video along their cables, for the see-through current flow
  const flows = (ctx, kind, pts) => ctx.flows.push({ kind, pts: pts.map(p => SL.drone.W(...p)) });

  SL.drone.define({
    id: 'longrange', fig: '04', title: '7-inch long-range quad', palette: 'mint',
    mat: 440, height: 150, explode: 20, log: 'Betaflight 2026.6',
    bounds: [-70, 70, -60, 60, 0, 90],
    messages: { powered: 'ESC tones: FC, VTX, receiver and GPS on. GPS LED solid: searching for satellites' },
    frame: {
      layout: 'quad-x', wheelbase: 315,
      arm: { w: 13, t: 6 },
      plate: { l: 132, w: 52, t: 6, z: 0, r: 8 },
    },
    design: {
      default: { batt: '6s1p4000', motor: '2807-1300', prop: '7x3.5x2' },
      batts: {
        '6s1p4000': { cells: 6, mah: 4000, size: [71, 65, 44], color: '#2f6f8f', label: '6S1P 21700', chem: 'liion' },
        '6s1p5000': { cells: 6, mah: 5000, size: [72, 65, 44], color: '#7a3f8f', label: '6S1P P50B', chem: 'liion' },
        '6s1800': { cells: 6, mah: 1800, size: [104, 36, 42], color: '#2b2a28', label: '6S 1800', chem: 'lipo' },
      },
      motors: {
        '2807-1300': { stator: [28, 7], bell: [33.5, 16], kv: 1300, label: '2807 1300KV' },
        '3008-1100': { stator: [30, 8], bell: [36, 17], kv: 1100, label: '3008 1100KV' },
        '2807-1700': { stator: [28, 7], bell: [33.5, 16], kv: 1700, label: '2807 1700KV' },
      },
      props: {
        '7x3.5x2': { d: 7, pitch: 3.5, blades: 2, color: '#3fa8d8', label: '7x3.5 bi-blade' },
        '7.5x3.7x2': { d: 7.5, pitch: 3.7, blades: 2, color: '#5a82c6', label: '7.5x3.7 bi-blade' },
        '7x4x3': { d: 7, pitch: 4, blades: 3, color: '#f08a2b', label: '7x4 tri-blade' },
      },
    },
    parts: [
      { id: 'FRAME', short: 'FRAME', name: '7-inch carbon True-X frame', z: 0,
        piece: { kind: 'frame' },
        tag: { at: [86, -86, 6], dx: 40, dy: 26 },
        },
      { id: 'MOTORS', short: 'MOTORS', name: 'Four 2807 low-KV motors', after: ['FRAME'], z: 1,
        piece: { kind: 'motors' },
        tag: { at: [111.4, -111.4, 26], dx: 40, dy: -22 },
        xr: [{ at: [111.4, 111.4, 14], text: 'STATOR 12N14P' }] },
      { id: 'ESC', short: 'ESC', name: '50 A 4-in-1 ESC (AM32)', after: ['FRAME'], z: 1.2,
        piece: { kind: 'board', at: [0, 0, 10], size: [44, 44], t: 1.6, holes: 30.5, color: 'pcbBlack', fets: 12,
          label: 'AM32 50A', labelAt: [0, -12],
          chips: [{ at: [-8, 8], size: [4, 4, .9] }, { at: [8, 8], size: [4, 4, .9] }, { at: [-8, -2], size: [4, 4, .9] }, { at: [8, -2], size: [4, 4, .9] }],
          pads: [{ at: [-19.5, 5], size: [4, 7] }, { at: [-19.5, -5], size: [4, 7] }] },
        tag: { at: [22, 22, 12], dx: 52, dy: 30 },
        xr: [{ at: [16, -16, 12.5], text: 'MOSFETS x12' }] },
      { id: 'WIRES', short: 'MOTOR WIRES', name: 'Motor phase wires', after: ['MOTORS', 'ESC'], z: 1.6,
        piece: { kind: 'wires', from: [0, 0, 11.6], padR: 25, edge: 4 },
        tag: { at: [-62, -62, 8], dx: -46, dy: 30 } },
      { id: 'XT60', short: 'XT60 + CAP', name: 'XT60 lead + 1000 µF 35 V low-ESR cap', after: ['ESC'], z: 1.4,
        polar: ['stripe to minus', 'stripe to plus'],
        piece: { kind: 'xt60', at: [-108, 0, 9], dir: [-1, 0, 0],
          lead: [[-20, 2, 12.4], [-46, 1, 9], [-82, 0, 8.5], [-99, 0, 9]],
          cap: { at: [-26, 0, 17], dir: [-1, 0, 0], r: 6.25, l: 20, stripe: [0, 1, 0] } },
        tag: { at: [-110, 0, 13], dx: -46, dy: 24 },
        xr: [{ at: [-36, 0, 23], text: '1000 µF CAP' }] },
      { id: 'FC', short: 'FLIGHT CTRL', name: 'F7 flight controller + baro', after: ['ESC'], z: 2.6,
        polar: ['arrow forward', 'arrow backward'],
        piece: { kind: 'board', at: [0, 0, 19], size: [36.5, 36.5], t: 1.6, holes: 30.5, color: 'pcbBlue', arrow: true, arrowAt: [7, 0],
          led: '#4aa3ff', ledAt: [-12, -12], label: 'F722',
          chips: [{ at: [-5, 0], size: [9, 9, 1.1], label: 'MCU' }, { at: [-12, 10], size: [3, 3, .9] }, { at: [11, -11], size: [3, 3, .9] }, { at: [-12, -2], size: [5, 5, .9] }],
          usb: [0, 15.5] },
        tag: { at: [18, 0, 22], dx: 58, dy: -44 },
        xr: [{ at: [-12, 10, 21.5], text: 'GYRO + BARO' }] },
      { id: 'VTX', short: 'VTX', name: '5.8 GHz 1 W VTX + stubby', after: ['FC'], z: 3.8,
        piece: { kind: 'module', at: [0, 0, 27.5], size: [36, 36, 1.6], color: 'pcb', label: '1W VTX', labelSize: .14,
          led: '#e2483d', ledAt: [12, 12],
          antenna: { type: 'stubby', at: [-18, 10, 30.5], dir: [-1, .16, .06], len: 54, color: 'black' } },
        tag: { at: [-71, 18, 40], dx: -54, dy: -12 },
        xr: [{ at: [8, -10, 30], text: 'VTX 1 W' }] },
      { id: 'CAM', short: 'CAMERA', name: 'Analog FPV camera, 20° uptilt', after: ['FC'], z: 2.2,
        piece: [
          { kind: 'camera', at: [53, 0, 21], size: 19, tilt: 20, depth: 20, plates: { gap: 1.2, h: 28, l: 26, t: 2.5, color: 'pal', z: 6 } },
          { kind: 'custom', draw: ctx => {
            const pts = [[43, -4, 16], [32, -6, 22], [18, -8, 22]];
            if (ctx.powered) flows(ctx, 'video', pts);
            return g.wire(pts, '#f2c230', 1.2);
          } },
        ],
        tag: { at: [64, 0, 32], dx: 46, dy: -22 },
        xr: [{ at: [62, 0, 30], text: 'CAM 20° UP' }] },
      { id: 'RX', short: 'RECEIVER', name: 'ELRS 900 MHz diversity receiver + T-antenna', after: ['FC'], z: 1.6,
        piece: [
          { kind: 'module', at: [-39, -18, 6], size: [22, 13, 3.5], color: 'pcbBlack', label: 'ELRS 900', labelSize: .17,
            led: '#43c25c', ledAt: [7, 3],
            antenna: { type: 't', at: [-50, -18, 9.5], dir: [-.85, 0, .5], len: 74, spread: 48 } },
          { kind: 'custom', draw: ctx => {
            const pts = [[-28, -16, 9.5], [-20, -12, 14], [-14, -10, 20.6]];
            if (ctx.powered) flows(ctx, 'signal', pts);
            return g.wire(pts, '#43a35a', 1);
          } },
        ],
        tag: { at: [-98, -48, 34], dx: -30, dy: -26 },
        xr: [{ at: [-39, -18, 10], text: 'ELRS 900 MHZ' }] },
      { id: 'TOP', short: 'TOP PLATE', name: 'Top plate, standoffs + GPS mast', after: ['FC', 'CAM', 'RX', 'VTX'], z: 5, cover: true,
        piece: [
          { kind: 'standoffs', at: [[-50, -18], [50, -18], [-50, 18], [50, 18]], z0: 6, z1: 36, r: 2.6 },
          { kind: 'plate', l: 124, w: 44, r: 6, z: 36, t: 2, color: 'carbon' },
          { kind: 'custom', draw: () => drawMast() },
        ],
        tag: { at: [46, 22, 38], dx: 44, dy: -34 } },
      { id: 'GPS', short: 'GPS', name: 'M10 GPS + QMC5883L compass', after: ['TOP'], z: 6.4,
        polar: ['arrow forward', 'arrow backward'], mistake: 'gps-reversed',
        piece: [
          { kind: 'module', at: [mastTop[0], 0, mastTop[2] + 2], size: [20, 20, 1.6], color: 'pcbBlue' },
          { kind: 'module', at: [mastTop[0], 0, mastTop[2] + 3.6], size: [17, 17, 5], color: 'ceramic', arrow: true, led: '#43c25c', ledAt: [-6.5, 6.5] },
        ],
        tag: { at: [mastTop[0], 0, mastTop[2] + 9], dx: -44, dy: -36 },
        xr: [{ at: [mastTop[0], 0, mastTop[2] + 6], text: 'GPS + COMPASS' }] },
      { id: 'BATT', short: 'BATTERY', name: '6S1P 21700 Li-ion pack', after: ['TOP', 'XT60'], z: 6.6, cover: true,
        piece: { kind: 'battery', at: [6, 0, 38], strap: true, pad: true },
        tag: { at: [6, 0, 84], dx: 6, dy: -44 },
        xr: [{ at: [6, 0, 62], text: '6 CELLS, 6S' }] },
      { id: 'PROPS', short: 'PROPS', name: '7-inch bi-blade props', after: ['MOTORS', 'TOP'], z: 3,
        polar: ['props in', 'props swapped'],
        piece: { kind: 'props' },
        tag: { at: [111.4, 111.4, 32], dx: -40, dy: -30 } },
    ],
    tests: {
      smoke: { needs: ['XT60', 'ESC'] },
      motors: { needs: ['WIRES', 'FC'] },
      calibrate: { needs: ['FC'] },
      plug: { needs: ['BATT', 'XT60'] },
    },
    buttons: [
      { id: 'compass', label: 'Calibrate compass', onClick: compassTest },
      { id: 'gps', label: 'GPS lock (outdoors)', onClick: gpsTest },
      { id: 'failsafe', label: 'Failsafe test (props off)', onClick: failsafeTest },
    ],
    // extra state for the host (docs/requests/item-longrange.md: the engine merges it as state.extra)
    report: st => {
      const s = own(st), c = s.compass, fs = s.fs, fix = gpsFix(st);
      const compassDone = finished(st, c) && seated(st, c, ['GPS', 'FC']);
      const fsDone = finished(st, fs) && seated(st, fs, ['RX', 'GPS', 'FC']);
      return {
        compassOk: compassDone && c.ok,
        compassBack: compassDone && !c.ok,
        gpsFix: fix,
        sats: fix ? 14 : 0,
        failsafeOk: fsDone && fs.ok,
        rescue: fsDone ? (fs.ok ? 'ok' : 'wrong-way') : null,
      };
    },
    wiring: {
      nodes: {
        BATT: { at: [20, 24], title: 'BATTERY', sub: 'batt', color: 'tomato' },
        XT60: { at: [20, 142], title: 'XT60 + CAP', sub: '1000 µF 35 V', color: 'tomato' },
        ESC: { at: [215, 142], title: '4-IN-1 ESC', sub: '50 A ×4 · AM32', color: 'mustard' },
        MOTORS: { at: [215, 260], title: 'MOTORS ×4', sub: 'motor', color: '#f08a2b' },
        FC: { at: [410, 142], title: 'FLIGHT CTRL', sub: 'F7 + baro', color: 'cobalt', led: '#4aa3ff' },
        RX: { at: [410, 24], title: 'RECEIVER', sub: 'ELRS 900 MHz', color: 'mint', led: '#43c25c' },
        GPS: { at: [600, 24], title: 'GPS + COMPASS', sub: 'M10 + QMC5883L', color: 'mint', led: '#43c25c' },
        CAM: { at: [600, 142], title: 'CAMERA', sub: 'analog · 20° up', color: 'mustard' },
        VTX: { at: [600, 260], title: 'VTX', sub: '5.8 GHz · 1 W', color: 'mustard', led: '#e2483d' },
      },
      edges: [
        { from: 'BATT', to: 'XT60', kind: 'power', label: 'V', n: 2 },
        { from: 'XT60', to: 'ESC', kind: 'power', label: 'VBAT', n: 2 },
        { from: 'ESC', to: 'MOTORS', kind: 'phase', label: '3-phase ×4', n: 3 },
        { from: 'FC', to: 'ESC', kind: 'signal', label: 'DShot600 ×4', labelAt: [0, -34] },
        { from: 'RX', to: 'FC', kind: 'signal', label: 'UART2 · CRSF', labelAt: [-46, 0] },
        { from: 'GPS', to: 'FC', kind: 'signal', label: 'UART3 + I2C', via: [[675, 110], [485, 110]] },
        { from: 'CAM', to: 'FC', kind: 'video', label: 'video in', labelAt: [0, -34] },
        { from: 'FC', to: 'VTX', kind: 'video', label: 'video · SmartAudio', via: [[485, 229], [675, 229]] },
      ],
      legend: ['power', 'signal', 'video', 'phase'],
    },
  });
})();
