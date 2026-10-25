// @cf title GPS camera drone
// @cf use engine/drone.js
// @cf use engine/drone-geo.js
// @cf use engine/drone-frames.js
// @cf use engine/drone-pieces.js
// @cf use engine/drone-sheet.js
/* Fig. 06, the GPS camera drone on ArduPilot Copter 4.7: an F450-class X quad (450 mm motor to motor, motors at
   +-159.1 mm) with a Pixhawk 6C, a PM02 power module, four 30 A ESCs on the arms, 2212 920 KV motors, 10 x 4.5 in
   two-blade props, an M10 GPS + compass on a mast, a 915 MHz SiK telemetry radio, an ELRS receiver on TELEM2 and a
   2-axis brushless gimbal under the nose. Facts: docs/facts/gpscam.md. Craft-local mm: x forward, y left, z up,
   z = 0 on the mat; the landing gear lifts the bottom plate to z = 120. */
(() => {
  const SD = SL.drone, geo = SD.g;
  const PLATE_Z = 120, PLATE_T = 1.6, ARM_T = 24;
  const DECK0 = PLATE_Z + PLATE_T;           // top of the bottom plate (the PCB power board)
  const ARM_TOP = DECK0 + ARM_T;             // motor mount face and the top plate's underside
  const DECK = ARM_TOP + 2;                  // top of the top plate, where the electronics sit
  const FC_AT = [8, 0, DECK + 4];            // Pixhawk 6C on its foam mount, arrow forward
  const MAST = [-48, 0];
  const PUCK_Z = DECK + 86;
  const ESC_IN = 104, ESC_OUT = 140;         // ESC position along each arm, mm from the centre
  const GIMBAL_X = 84;

  const unit = a => [Math.cos(a), Math.sin(a)];
  const at = (mo, r, side, z) => { const [ux, uy] = unit(mo.ang); return [ux * r - uy * side, uy * r + ux * side, z]; };

  // the craft's own bench checks (compass, GPS lock, failsafe, gimbal, pre-arm), kept beside the engine state
  const fresh = (() => { try { return /[?&]fresh=1(&|$)/.test(location.search); } catch (e) { return false; } })();
  const extra = st => st.gc || (st.gc = {
    compassOk: !fresh, compassBack: false, compassAt: null, gpsAt: null, failsafeAt: null, failsafeOk: false,
    gimbalAt: null, gimbalT0: null, gimbalOk: false, preArmOk: false, run: null, runT0: 0,
  });
  const running = st => { const x = extra(st); return x.run && st.t < x.runEnd ? x.run : null; };
  const progress = (st, t0, dur) => t0 == null ? 0 : Math.max(0, Math.min(1, (st.t - t0) / dur));
  const done = (st, end) => end != null && st.t >= end;

  function smooth(u){ return u * u * (3 - 2 * u); }
  // gimbal test: pitch -20 -> -90 (straight down) -> +25 -> -20 degrees over 3.2 s
  function gimbalPitch(st){
    const x = extra(st);
    if (x.gimbalT0 == null) return -20;
    const s = st.t - x.gimbalT0, keys = [[0, -20], [1, -90], [2.2, 25], [3.2, -20]];
    if (s <= 0 || s >= 3.2) return -20;
    for (let i = 0; i < keys.length - 1; i++){
      const [t0, a0] = keys[i], [t1, a1] = keys[i + 1];
      if (s <= t1) return a0 + (a1 - a0) * smooth((s - t0) / (t1 - t0));
    }
    return -20;
  }

  /* ---------- pieces ---------- */
  const gear = () => {
    const out = [];
    for (const s of [-1, 1]){
      out.push(...geo.rod([-108, s * 72, 4], [108, s * 72, 4], 4, 'dark', 14, 10));                 // skid tube
      for (const x of [-62, 62]) out.push(...geo.rod([x, s * 72, 7], [x * 0.55, s * 42, PLATE_Z - 4], 4, 'dark', 12, 10));
      for (const x of [-108, 108]) out.push(geo.cyl(x, s * 72, 0, 8, 4.6, 'black', 10));               // rubber end caps
    }
    out.push(geo.box(-46, -46, PLATE_Z - 4, 40, 46, PLATE_Z, 'carbon', .9));                         // gear mount under the frame
    for (const x of [-40, 34]) for (const s of [-1, 1]) out.push(...geo.rod([x, s * 30, 58], [x, s * 30, PLATE_Z - 4], 2.6, 'alu', 12, 8));
    out.push(geo.box(-106, -33, 56, 46, 33, 58, 'carbon', .8));                                      // battery tray
    return out;
  };

  const frame = ctx => {
    const out = [];
    const plate = geo.plate(SD.rrect(120, 120, 12), PLATE_Z, PLATE_T, 'pcbBlack');
    // the bottom plate is the power board: battery pads at the rear, a + and a - pad at each arm root
    for (const s of [-1, 1]) plate.svg += geo.box(-28, s * 7 - 3, DECK0, -20, s * 7 + 3, DECK0 + .3, 'copper', .4).svg;
    for (const mo of ctx.craft.motors) for (const s of [-1, 1]){
      const [x, y] = at(mo, 34, s * 4.5, 0);
      plate.svg += geo.box(x - 2.6, y - 2.6, DECK0, x + 2.6, y + 2.6, DECK0 + .3, 'copper', .4).svg;
    }
    plate.svg += geo.text(18, 0, DECK0 + .05, 'F450 PDB', 6, '#c9b27a');
    out.push(plate);
    // moulded arms bolted between the plates: the front two in the palette colour, the rear two white
    for (const mo of ctx.craft.motors){
      const [ux, uy] = unit(mo.ang), col = mo.x > 0 ? (PALS[ctx.st.pal] || 'pal') : 'white', r0 = 45, r1 = 238, n = 3, seg = (r1 - r0) / n;
      for (let i = 0; i < n; i++){
        const rc = r0 + seg * (i + .5);
        out.push(geo.oblock([ux * rc, uy * rc, DECK0 + ARM_T / 2], [ux, uy, 0], [-uy, ux, 0], [0, 0, 1], seg / 2, 11, ARM_T / 2, col, 1));
      }
      ctx.shadows.push([at(mo, r0, -11, 0), at(mo, r1, -11, 0), at(mo, r1, 11, 0), at(mo, r0, 11, 0)].map(([x, y]) => SD.W(x, y, ARM_TOP)));
    }
    ctx.shadows.push(SD.rrect(120, 120, 12, 2).map(([x, y]) => SD.W(x, y, ARM_TOP)));
    return out;
  };

  const escs = ctx => {
    const out = [];
    for (const mo of ctx.craft.motors){
      const [ux, uy] = unit(mo.ang), rc = (ESC_IN + ESC_OUT) / 2;
      const it = geo.oblock([ux * rc, uy * rc, ARM_TOP + 3.5], [ux, uy, 0], [-uy, ux, 0], [0, 0, 1], (ESC_OUT - ESC_IN) / 2, 8, 3.5, '#3e86d9', .9);
      it.svg += geo.text(ux * rc, uy * rc, ARM_TOP + 7.05, '30A', 4.2, '#f2efe7');
      out.push(it);
    }
    return out;
  };

  // ESC power leads: red and black from each ESC down to its pads on the power board
  const escPower = ctx => {
    const out = [];
    for (const mo of ctx.craft.motors) for (const [s, col] of [[2.4, '#d8473a'], [-2.4, '#2c2926']]){
      const pts = [at(mo, ESC_IN, s, ARM_TOP + 4), at(mo, 70, s, ARM_TOP + 1.4), at(mo, 47, s, ARM_TOP - 2), at(mo, 40, s * 1.6, DECK0 + 6), at(mo, 34, s * 1.9, DECK0 + .6)];
      out.push(...geo.wire(pts, col, 1.4));
      if (col === '#d8473a') ctx.flows.push({ kind: 'power', pts: pts.slice().reverse().map(p => SD.W(...p)) });
    }
    return out;
  };

  // the PM02's output to the power-board battery pads
  const pmLeads = ctx => {
    const out = [];
    for (const [s, col] of [[1, '#d8473a'], [-1, '#2c2926']]){
      const pts = [[-33.5, s * 5, DECK0 + 4], [-29, s * 6, DECK0 + 3], [-24, s * 7, DECK0 + .6]];
      out.push(...geo.wire(pts, col, 2.2));
      if (s > 0) ctx.flows.push({ kind: 'power', pts: pts.map(p => SD.W(...p)) });
    }
    return out;
  };

  // FC wiring: four ESC signal leads to MAIN OUT 1-4 at the Pixhawk's rear, and the 6-pin POWER1 lead from the PM02
  const fcLeads = ctx => {
    const out = [], rear = FC_AT[0] - 42.4;
    ctx.craft.motors.forEach((mo, i) => {
      const side = mo.y > 0 ? 1 : -1, pin = [rear - 1, side * (3 + 2.4 * (i % 2)), FC_AT[2] + 6];
      const pts = mo.x > 0
        ? [at(mo, ESC_IN + 2, 0, ARM_TOP + 7.2), at(mo, 82, 0, DECK + .8), [36, side * 29, DECK + .8], [-22, side * 27, DECK + .8], [rear - 6, pin[1], DECK + 2], pin]
        : [at(mo, ESC_IN + 2, 0, ARM_TOP + 7.2), at(mo, 82, 0, DECK + .8), [rear - 8, side * 14, DECK + .8], [rear - 6, pin[1], DECK + 3], pin];
      out.push(...geo.wire(pts, '#f08a2b', 1));
      ctx.flows.push({ kind: 'signal', pts: pts.slice().reverse().map(p => SD.W(...p)) });
    });
    const pwr = [[-46, -9, DECK0 + 9], [-40, -15, DECK0 + 16], [-36, -17, DECK + 1], [-30, -18, FC_AT[2] + 5], [rear + 2, -22.5, FC_AT[2] + 6]];
    out.push(...geo.wire(pwr, '#e8e2d2', 1.6));
    ctx.flows.push({ kind: 'power', pts: pwr.map(p => SD.W(...p)) });
    return out;
  };

  const ring = (x, y, z, r, n = 14) => Array.from({ length: n }, (_, i) => { const a = i / n * 2 * Math.PI; return [x + r * Math.cos(a), y + r * Math.sin(a), z]; });

  const gps = ctx => {
    const out = [], st = ctx.st, x = extra(st), [mx, my] = MAST;
    out.push(geo.box(mx - 7, my - 7, DECK, mx + 7, my + 7, DECK + 9, 'dark', .8));                   // folding mast hinge
    out.push(...geo.rod([mx, my, DECK + 9], [mx, my, PUCK_Z], 3, 'alu', 12, 8));
    out.push(...geo.wire([[mx + 3.4, my + 2, PUCK_Z - 2], [mx + 3.4, my + 2, DECK + 12], [mx + 8, my + 4, DECK + 2], [FC_AT[0] - 42.4 - 1, 12, FC_AT[2] + 6]], '#2c2926', 1.1));
    const puck = geo.cyl(mx, my, PUCK_Z, PUCK_Z + 14.4, 25.5, '#2f2c29', 22, 1.1);
    puck.svg += geo.arrow(mx + 2, my, PUCK_Z + 14.45, 24, ctx.orient === 1 ? -1 : 1, '#f4f1e6');
    // ArduPilot's GPS LED: blue blinks while there is no lock, green blinks with a 3D fix
    const fix = done(st, x.gpsAt), blink = Math.sin(st.t * 9) > -0.2;
    puck.svg += geo.led(mx - 13, my + 13, PUCK_Z + 14.6, fix ? '#43c25c' : '#3e86d9', ctx.powered && blink, 1.4);
    out.push(puck);
    // compass dance: six sides, each lights when it has been sampled
    if (running(st) === 'compass'){
      const k = progress(st, x.runT0, 4), pts = ring(mx, my, PUCK_Z + 30, 34, 6);
      let s = '';
      pts.forEach((p, i) => {
        const [sx, sy] = SD.Pb(...p), lit = k * 6 > i;
        s += `<circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="4.2" fill="${lit ? '#43c25c' : '#f4f1e6'}" stroke="#231e16" stroke-width="1"/>`;
      });
      out.push({ box: SD.bbox(pts.map(p => SD.W(...p))), svg: s });
    }
    return out;
  };

  const telemCable = () => geo.wire([[-25, 38, DECK + 4], [-12, 30, DECK + 1.2], [-6, 22.5, FC_AT[2] + 7]], '#2c2926', 1);
  const rxCable = () => geo.wire([[-31, -40, DECK + 2.4], [-14, -30, DECK + 1.2], [-4, -22.5, FC_AT[2] + 7]], '#2c2926', 1);

  const gimbal = ctx => {
    const out = [], X0 = GIMBAL_X, pitch = gimbalPitch(ctx.st) * Math.PI / 180;
    out.push(geo.box(44, -24, PLATE_Z - 4, 102, 24, PLATE_Z, 'carbon', .9));                         // bracket under the nose
    for (const x of [52, 94]) for (const s of [-1, 1]) out.push(geo.cyl(x, s * 18, PLATE_Z - 11, PLATE_Z - 4, 4, 'mustard', 10, .8));
    out.push(geo.box(48, -22, PLATE_Z - 13, 98, 22, PLATE_Z - 11, 'carbon', .8));                     // damped plate
    out.push(geo.box(X0 - 4, -4, PLATE_Z - 24, X0 + 4, 4, PLATE_Z - 13, 'dark', .8));                 // post
    out.push(...geo.rod([X0 - 8, 0, PLATE_Z - 30], [X0 + 6, 0, PLATE_Z - 30], 10, 'dark', 14, 16));   // roll motor
    out.push(geo.box(X0 - 4, -2, PLATE_Z - 38, X0 + 4, 22, PLATE_Z - 34, 'dark', .8));                // yoke
    out.push(geo.box(X0 - 4, 18, 60, X0 + 4, 22, PLATE_Z - 34, 'dark', .8));
    out.push(...geo.rod([X0, 22, 64], [X0, 29, 64], 8, 'dark', 7, 16));                              // pitch motor
    const u = [Math.cos(pitch), 0, Math.sin(pitch)], n = [-Math.sin(pitch), 0, Math.cos(pitch)], o = [X0, 0, 64];
    out.push(geo.oblock(o, u, [0, 1, 0], n, 17, 13, 12, '#2c2926', 1));                               // camera
    const f0 = [o[0] + u[0] * 17, 0, o[2] + u[2] * 17], f1 = [f0[0] + u[0] * 8, 0, f0[2] + u[2] * 8];
    out.push(...geo.rod(f0, f1, 8, 'black', 8, 14), ...geo.rod(f1, [f1[0] + u[0] * .8, 0, f1[2] + u[2] * .8], 5.6, '#5f88b8', 2, 14));
    out.push(...geo.wire([[X0 - 2, 4, PLATE_Z - 18], [60, 10, PLATE_Z - 6], [52, 14, DECK0 + 3], [36, 20, DECK + 1], [FC_AT[0] - 42.4 - 1, -8, FC_AT[2] + 6]], '#f08a2b', 1));
    return out;
  };

  /* ---------- craft buttons: the ArduPilot bench checks ---------- */
  function start(api, kind, dur, sayEnd, sound){
    const st = api.st, x = extra(st);
    x.run = kind; x.runT0 = st.t; x.runEnd = st.t + dur;
    st.later.push({ t: dur, say: sayEnd, sfx: sound || 'ding' });
    return st.t + dur;
  }
  function blocked(api){
    const st = api.st;
    if (st.test || st.queue.length || running(st)) { api.say('Wait for the test to finish'); return true; }
    if (st.exT) { api.say('Close the exploded view first'); return true; }
    return false;
  }

  const buttons = [
    { id: 'compass', label: 'Calibrate compass', onClick: api => {
      const st = api.st, x = extra(st);
      if (blocked(api)) return;
      if (!api.isOn('FC') || !api.isOn('GPS')) return api.say('Fit the Pixhawk and the GPS + compass first', 2600, 'buzz');
      if (api.isOn('PROPS')) return api.say('Props off for the compass dance: you turn the drone over in your hands', 3000, 'buzz');
      x.compassBack = api.orient('GPS') === 1;
      x.preArmOk = false;
      api.log('$ onboard mag calibration: turn each side to the ground');
      x.compassAt = start(api, 'compass', 4, x.compassBack
        ? 'Compass calibrated, but the GPS arrow points backwards: compass and GPS disagree by 180°. Turn the puck round and calibrate again'
        : 'Compass calibrated: offsets saved. Reboot the autopilot');
      api.sfx('tick');
    } },
    { id: 'gps', label: 'Wait for GPS lock', onClick: api => {
      const st = api.st, x = extra(st);
      if (blocked(api)) return;
      if (!api.isOn('FC') || !api.isOn('GPS')) return api.say('Fit the Pixhawk and the GPS + compass first', 2600, 'buzz');
      if (!SD.powered(st)) return api.say('Plug in the battery: the GPS needs the Pixhawk powered', 2600, 'buzz');
      if (done(st, x.gpsAt)) return api.say('GPS 1: 3D fix, 14 satellites, HDOP 0.8', 2200, 'tick');
      api.log('GPS 1: detected as u-blox at 230400 baud');
      x.gpsAt = start(api, 'gps', 6, 'GPS 1: 3D fix, 14 satellites, HDOP 0.8. EKF3 is using GPS');
    } },
    { id: 'failsafe', label: 'Failsafe test (props off)', onClick: api => {
      const st = api.st, x = extra(st);
      if (blocked(api)) return;
      if (api.isOn('PROPS')) return api.say('PROPS OFF! Never spin motors on the bench with props on', 3000, 'buzz');
      if (!api.isOn('FC') || !api.isOn('RX')) return api.say('Fit the Pixhawk and the receiver first', 2600, 'buzz');
      if (!SD.powered(st)) return api.say('Plug in the battery: the ESCs need power to arm', 2600, 'buzz');
      api.log('$ armed on the bench in Stabilize, props off');
      api.log('$ transmitter off: no RC frames');
      x.failsafeAt = start(api, 'failsafe', 2.5, 'Radio failsafe: landed, so it disarms. In the air FS_THR_ENABLE 1 makes it fly RTL', 'unplug');
    } },
    { id: 'gimbal', label: 'Gimbal test', onClick: api => {
      const st = api.st, x = extra(st);
      if (blocked(api)) return;
      if (!api.isOn('GIMBAL') || !api.isOn('FC')) return api.say('Fit the gimbal and the Pixhawk first', 2600, 'buzz');
      if (!SD.powered(st)) return api.say('Plug in the battery: the gimbal controller runs from it', 2600, 'buzz');
      x.gimbalT0 = st.t;
      api.log('$ RC6 tilt knob: pitch to -90°, then +25°');
      x.gimbalAt = start(api, 'gimbal', 3.2, 'Gimbal ok: pitch from -90° (straight down) to +25°, roll held level');
      api.sfx('spin');
    } },
    { id: 'prearm', label: 'Pre-arm checks', onClick: api => {
      const st = api.st, x = extra(st);
      if (blocked(api)) return;
      if (!api.isOn('FC')) return api.say('Mount the flight controller first', 2600, 'buzz');
      if (!SD.powered(st)) return api.say('Plug in the battery: the pre-arm checks read the battery monitor', 2600, 'buzz');
      const fail = !st.accOk ? 'PreArm: 3D Accel calibration needed'
        : !done(st, x.compassAt) && !x.compassOk ? 'PreArm: Compass not calibrated'
        : api.orient('GPS') === 1 || x.compassBack ? 'PreArm: Compasses inconsistent'
        : !api.isOn('RX') ? 'PreArm: RC not found'
        : !done(st, x.gpsAt) ? 'PreArm: GPS 1: Bad fix'
        : null;
      x.preArmOk = !fail;
      if (fail) { api.log(fail); api.say(fail, 3200, 'buzz'); }
      else { api.log('pre-arm checks passed'); api.say('Pre-arm checks passed: ready to arm in Loiter', 2600, 'ding'); }
    } },
  ];

  function report(st){
    const x = extra(st), compassOk = !!(x.compassOk && !x.compassAt) || done(st, x.compassAt);
    const fix = done(st, x.gpsAt), k = progress(st, x.gpsAt == null ? null : x.gpsAt - 6, 6);
    return {
      compassOk, compassBack: compassOk && !!x.compassBack, gpsFix: fix, sats: fix ? 14 : x.gpsAt == null ? 0 : Math.floor(k * 14),
      failsafeOk: done(st, x.failsafeAt), gimbalOk: done(st, x.gimbalAt), preArmOk: !!x.preArmOk,
    };
  }
  // the engine calls this with 'strip', 'build' or the id of a part taken off, re-seated or turned round (also on a
  // step of the host's slider): a check holds only for the parts it ran on
  function reset(st, why){
    const x = extra(st);
    if (why === 'strip') Object.assign(x, { compassOk: false, compassBack: false, compassAt: null, gpsAt: null, failsafeAt: null, gimbalAt: null, gimbalT0: null, preArmOk: false, run: null });
    if (why === 'GPS') Object.assign(x, { compassOk: false, compassBack: false, compassAt: null, gpsAt: null, preArmOk: false });
    if (why === 'FC') Object.assign(x, { gpsAt: null, failsafeAt: null, gimbalAt: null, gimbalT0: null, preArmOk: false });
    if (why === 'RX') Object.assign(x, { failsafeAt: null, preArmOk: false });
    if (why === 'GIMBAL') Object.assign(x, { gimbalAt: null, gimbalT0: null });
  }

  SD.define({
    id: 'gpscam', fig: '06', title: 'GPS camera drone', palette: 'cobalt',
    mat: 600, height: 300, explode: 22, log: 'ardupilot',
    bounds: [-120, 120, -120, 120, 40, 250],
    frame: {
      layout: 'quad-x', wheelbase: 450, numbering: 'ardupilot',
      arm: { w: 22, t: ARM_T, from: 45 }, plate: { l: 120, w: 120, t: PLATE_T, z: PLATE_Z, r: 12 }, motorZ: ARM_TOP,
    },
    design: {
      default: { batt: '4s5000', motor: '2212-920', prop: '1045' },
      batts: {
        '4s5000': { cells: 4, mah: 5000, size: [140, 45, 40], color: '#2b2a28', label: '4S 5000' },
        '4s3300': { cells: 4, mah: 3300, size: [136, 43, 30], color: '#2f5fa8', label: '4S 3300' },
        '3s5000': { cells: 3, mah: 5000, size: [138, 46, 28], color: '#d9a520', label: '3S 5000' },
      },
      motors: {
        '2212-920': { stator: [22, 12], bell: [28, 23], kv: 920, label: '2212 920KV' },
        '2216-880': { stator: [22, 16], bell: [28, 27], kv: 880, label: '2216 880KV' },
        '2212-1400': { stator: [22, 12], bell: [28, 23], kv: 1400, label: '2212 1400KV' },
      },
      props: {
        '1045': { d: 10, pitch: 4.5, blades: 2, color: '#efe9da', label: '10x4.5' },
        '1147': { d: 11, pitch: 4.7, blades: 2, color: '#3a3836', label: '11x4.7' },
        '9450': { d: 9.4, pitch: 5, blades: 2, color: '#9aa3a8', label: '9.4x5.0' },
      },
    },
    parts: [
      { id: 'GEAR', short: 'LANDING GEAR', name: 'Landing gear, skids and battery tray', z: 0,
        piece: { kind: 'custom', draw: gear }, tag: { at: [-62, -72, 30], dx: -40, dy: 30 } },
      { id: 'FRAME', short: 'FRAME', name: 'F450 frame: power-board plate and 4 arms', after: ['GEAR'], z: 1,
        piece: { kind: 'custom', draw: frame }, tag: { at: [-120, 120, ARM_TOP], dx: -40, dy: 28 },
        xr: [{ at: [20, -30, DECK0 + 1], text: 'PCB POWER PLATE' }] },
      { id: 'MOTORS', short: 'MOTORS', name: '4 brushless motors (2212)', after: ['FRAME'], z: 2,
        piece: { kind: 'motors', color: 'metal', base: 'dark' }, tag: { at: [159.1, -159.1, ARM_TOP + 26], dx: 40, dy: -24 },
        xr: [{ at: [-159.1, 159.1, ARM_TOP + 14], text: 'STATOR 12N14P' }] },
      { id: 'ESC', short: 'ESCs', name: '4 separate 30 A ESCs on the arms', after: ['FRAME'], z: 2,
        piece: { kind: 'custom', draw: escs }, tag: { at: [-86, -86, ARM_TOP + 7], dx: 44, dy: 30 },
        xr: [{ at: [86, 86, ARM_TOP + 7], text: '30 A ESC ON ARM' }] },
      { id: 'WIRES', short: 'WIRING', name: 'Motor phase wires and ESC power leads', after: ['MOTORS', 'ESC'], z: 2,
        piece: [{ kind: 'wires', from: 'arm', along: ESC_OUT / 225, h: 7 }, { kind: 'custom', draw: escPower }],
        tag: { at: [124, 124, ARM_TOP + 4], dx: 46, dy: -18 }, xr: [{ at: [180, -180, ARM_TOP + 4], text: '3 PHASE WIRES' }] },
      { id: 'XT60', short: 'POWER MODULE', name: 'PM02 power module, XT60 and low-ESR capacitor', after: ['ESC'], z: 1,
        polar: ['cap stripe to minus', 'cap stripe to plus'],
        piece: [
          { kind: 'module', at: [-46, 0, DECK0], size: [25, 25, 9], color: 'pcbBlue', label: 'PM02', labelSize: .26 },
          { kind: 'xt60', at: [-120, 0, 88], dir: [-1, 0, 0], lead: [[-58.5, 0, DECK0 + 4], [-82, 0, DECK0], [-104, 0, 104], [-111, 0, 90]],
            cap: { at: [-17, 9, DECK0 + 5.2], dir: [0, 1, 0], r: 5, l: 16, stripe: [1, 0, 0],
              leads: [[[-19, 9, DECK0 + 2], [-22, 7, DECK0 + .4]], [[-15, 9, DECK0 + 2], [-21, -7, DECK0 + .4]]] } },
          { kind: 'custom', draw: pmLeads },
        ],
        tag: { at: [-120, 0, 92], dx: -48, dy: 26 }, xr: [{ at: [-46, 0, DECK0 + 9], text: 'PM02 V + I SENSE' }] },
      { id: 'TOP', short: 'TOP PLATE', name: 'Top plate, bolted on the arms', after: ['WIRES', 'XT60'], z: 3, cover: true,
        piece: [{ kind: 'plate', l: 120, w: 120, r: 12, z: ARM_TOP, t: 2, color: 'carbon' },
          { kind: 'custom', draw: ctx => ctx.craft.motors.flatMap(mo => [52, 74].map(r => { const [x, y] = at(mo, r, 0, 0); return geo.cyl(x, y, DECK, DECK + 1.2, 2.6, 'metal', 8, .6); })) }],
        tag: { at: [52, -40, DECK], dx: 52, dy: 40 } },
      { id: 'FC', short: 'PIXHAWK', name: 'Pixhawk 6C flight controller (ArduCopter)', after: ['TOP'], z: 4,
        polar: ['arrow forward', 'arrow backward'],
        piece: [
          { kind: 'box', at: [FC_AT[0], 0, DECK], size: [70, 38, 4], color: 'foam' },
          { kind: 'board', at: FC_AT, size: [84.8, 44], t: 12.4, color: '#4a5260', arrow: true, arrowAt: [16, 0],
            label: 'PIXHAWK 6C', labelAt: [-16, 0], led: '#43c25c', ledAt: [34, 15] },
          { kind: 'custom', draw: fcLeads },
        ],
        tag: { at: [FC_AT[0] + 20, 0, FC_AT[2] + 12.4], dx: 46, dy: -50 },
        xr: [{ at: [FC_AT[0] + 10, 8, FC_AT[2] + 8], text: 'STM32H743 + 2 IMUS' }] },
      { id: 'GPS', short: 'GPS + COMPASS', name: 'M10 GPS + compass on a mast', after: ['TOP'], z: 6,
        polar: ['arrow forward', 'arrow backward'], mistake: 'gps-reversed',
        piece: { kind: 'custom', draw: gps }, tag: { at: [MAST[0], 0, PUCK_Z + 14.4], dx: -52, dy: -30 },
        xr: [{ at: [MAST[0], 0, PUCK_Z + 7], text: 'M10 GPS + COMPASS' }] },
      { id: 'TELEM', short: 'TELEMETRY', name: '915 MHz SiK telemetry radio', after: ['FC'], z: 5,
        piece: [{ kind: 'module', at: [-38, 40, DECK], size: [26, 16, 9], color: 'pcbBlack', label: 'SIK', labelSize: .32, led: '#43c25c', ledAt: [9, -4],
          antenna: { at: [-49, 44, DECK + 9], dir: [0, 0, 1], len: 58, r: 2.2 } }, { kind: 'custom', draw: telemCable }],
        tag: { at: [-49, 44, DECK + 67], dx: -46, dy: -18 }, xr: [{ at: [-38, 40, DECK + 9], text: 'MAVLINK2 TELEM1' }] },
      { id: 'RX', short: 'RECEIVER', name: 'ExpressLRS 2.4 GHz receiver (CRSF)', after: ['FC'], z: 5,
        piece: [{ kind: 'module', at: [-38, -40, DECK], size: [14, 11, 3.5], color: 'pcbBlack', label: 'ELRS', labelSize: .3, led: '#43c463', ledAt: [4, 3] },
          { kind: 'antenna', type: 't', at: [-44, -42, DECK + 3.5], dir: [-.3, -.4, .87], len: 26 }, { kind: 'custom', draw: rxCable }],
        tag: { at: [-38, -40, DECK + 4], dx: 40, dy: 34 }, xr: [{ at: [-38, -40, DECK + 4], text: 'CRSF ON TELEM2' }] },
      { id: 'GIMBAL', short: 'GIMBAL', name: '2-axis brushless gimbal and camera', after: ['FRAME'], z: -1,
        piece: { kind: 'custom', draw: gimbal }, tag: { at: [GIMBAL_X + 18, 0, 52], dx: 54, dy: 26 },
        xr: [{ at: [GIMBAL_X, 0, PLATE_Z - 30], text: 'GIMBAL MOTORS' }] },
      { id: 'BATT', short: 'BATTERY', name: 'LiPo battery and straps', after: ['GEAR', 'XT60'], z: -1,
        piece: { kind: 'battery', at: [-30, 0, 58], strap: true, pad: true }, tag: { at: [-60, -22, 80], dx: -50, dy: 34 },
        xr: [{ at: [-30, 0, 80], text: 'LIPO CELLS' }] },
      { id: 'PROPS', short: 'PROPS', name: '10-inch two-blade props, 2 CW + 2 CCW', after: ['MOTORS', 'TOP'], z: 7,
        polar: ['props on the right motors', 'swapped CW/CCW'],
        piece: { kind: 'props' }, tag: { at: [159.1 + 100, -159.1, ARM_TOP + 32], dx: 30, dy: -20 } },
    ],
    tests: {
      smoke: { needs: ['XT60', 'ESC'], at: [-236, 0] },
      motors: { needs: ['WIRES', 'FC'] },
      calibrate: { needs: ['FC'] },
      plug: { needs: ['BATT', 'XT60'] },
    },
    buttons, report, reset,
    wiring: {
      nodes: {
        TELEM: { at: [20, 14], title: 'TELEMETRY', sub: 'SiK 915 MHz', color: '#5a82c6' },
        GPS: { at: [20, 140], title: 'GPS + COMPASS', sub: 'M10 + IST8310', color: '#43a35a', led: '#3e86d9' },
        BATT: { at: [14, 270], title: 'BATTERY', sub: 'batt', color: 'tomato' },
        FC: { at: [300, 140], title: 'PIXHAWK 6C', sub: 'ArduCopter 4.7.2', color: '#43a35a', led: '#43c25c' },
        XT60: { at: [210, 270], title: 'POWER MODULE', sub: 'PM02, V + I, 5.2 V', color: 'tomato' },
        ESC: { at: [400, 270], title: 'ESC x4', sub: '30 A, DShot600', color: '#f08a2b' },
        RX: { at: [600, 14], title: 'RC RECEIVER', sub: 'ELRS 2.4 GHz', color: '#5a82c6', led: '#43c463' },
        GIMBAL: { at: [600, 140], title: 'GIMBAL + CAM', sub: '2-axis, MNT1', color: '#f2c230' },
        MOTORS: { at: [600, 270], title: 'MOTORS x4', sub: 'motor', color: '#f08a2b' },
      },
      // a bend point inside a block hides the last stub under it, so every wire meets its block at its own spot
      edges: [
        { from: 'BATT', to: 'XT60', kind: 'power', n: 2, label: 'V' },
        { from: 'XT60', to: 'ESC', kind: 'power', n: 2, label: 'VBAT' },
        { from: 'ESC', to: 'MOTORS', kind: 'phase', n: 3, label: '3-phase' },
        { from: 'XT60', to: 'FC', kind: 'power', label: 'POWER1 5.2 V', via: [[285, 236], [330, 236], [330, 180]] },
        { from: 'FC', to: 'ESC', kind: 'signal', label: 'MAIN 1-4 DShot600', labelAt: [50, 4], via: [[420, 186], [420, 236], [475, 236]] },
        { from: 'GPS', to: 'FC', kind: 'signal', label: 'GPS1 UART + I2C' },
        { from: 'TELEM', to: 'FC', kind: 'signal', label: 'TELEM1 MAVLink2', via: [[340, 42], [340, 150]] },
        { from: 'RX', to: 'FC', kind: 'signal', label: 'TELEM2 CRSF', via: [[675, 100], [410, 100], [410, 150]] },
        { from: 'FC', to: 'GIMBAL', kind: 'signal', label: 'AUX 1-2 PWM' },
      ],
    },
  });
})();
