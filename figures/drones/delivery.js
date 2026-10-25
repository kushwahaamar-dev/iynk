// @cf title Autonomous delivery quad
// @cf use engine/drone.js
// @cf use engine/drone-geo.js
// @cf use engine/drone-frames.js
// @cf use engine/drone-pieces.js
// @cf use engine/drone-sheet.js
/* Fig. 07, the autonomous delivery quad on ArduPilot Copter 4.7. Facts: docs/facts/delivery.md.
   A 690 mm X quad (motors at +-243.95 mm) on four folding 25 mm carbon-tube arms and two skids, a Pixhawk 6C on a
   damped plate, a Raspberry Pi 5 companion on TELEM2 (MAVLink2, 921600 baud), a forward stereo depth camera, an
   M10 GPS + compass on a 129 mm mast, an LTE modem on the Pi's USB, SiK telemetry on TELEM1, an ELRS backup
   receiver on TELEM3, four 40 A ESCs out on the arms, 15-inch two-blade props and a PWM servo winch whose line
   lowers a 1 kg parcel out of an open-bottom cargo cage. Craft-local mm: x forward, y left, z up, z = 0 on the mat;
   the skids lift the bottom plate to z = 208. The motors are listed in Mission Planner's Motor Test order
   (A = M1 front right, B = M4 rear right, C = M2 rear left, D = M3 front left), so the bench check spins them
   the way ArduPilot does. */
(() => {
  const SD = SL.drone, gg = SD.g, Wp = SD.W;
  const TAU = Math.PI * 2;
  const MA = 690 / (2 * Math.SQRT2);       // 243.95 mm: motor offset on each axis
  const SKID_Z = 8;                         // skid tube centre (16 mm tubes resting on the mat)
  const HUB0 = 208, HUB1 = 213;             // bottom plate underside and top
  const TUBE_R = 12.5, TUBE_Z = HUB1 + TUBE_R;
  const TUBE_TOP = HUB1 + 2 * TUBE_R;       // 238: top of the arm tubes
  const MOUNT_Z = TUBE_TOP + 4;             // 242: motor mount face
  const TOP0 = 253, TOP1 = 256;             // top plate on 40 mm standoffs
  const MAST_X = -112, PUCK_Z = TOP1 + 129;
  const DRUM_Z = 186, CAGE_Z = 31, PARCEL_Z = 36, PARCEL_H = 120;
  const ESC_R = 240;                        // ESC centre along each arm: under the prop, clear of the fold hinge
  const HINGE_R = 165;

  const dirOf = mo => [Math.cos(mo.ang), Math.sin(mo.ang)];
  const along = (mo, r, side, z) => { const [ux, uy] = dirOf(mo); return [ux * r - uy * side, uy * r + ux * side, z]; };
  const armBlock = (mo, r, z, hl, hw, hh, col) => {
    const [ux, uy] = dirOf(mo);
    return gg.oblock([ux * r, uy * r, z], [ux, uy, 0], [-uy, ux, 0], [0, 0, 1], hl, hw, hh, col);
  };
  // a disc on a face that looks forward (+x): the depth camera's windows
  const frontDisc = (x, y, z, r, col) => {
    if (!vis([1, 0, 0])) return '';
    const pts = Array.from({ length: 16 }, (_, i) => { const a = i / 16 * TAU; return Wp(x, y + r * Math.cos(a), z + r * Math.sin(a)); });
    return shape(pts, col, .5);
  };
  const flow = (ctx, kind, pts) => ctx.flows.push({ kind, pts: pts.map(p => Wp(...p)) });

  /* ---------- the craft's own bench checks: compass, GPS lock, winch, failsafe ---------- */
  // A check is passed when its run has finished and the parts it ran on are still the same fitted parts the same
  // way round (taking a part off, re-seating it or flipping it makes a fresh part object or orientation).
  const fresh = (() => { try { return /[?&]fresh=1(&|$)/.test(location.search); } catch (e) { return false; } })();
  const NEEDS = { compass: ['FC', 'GPS'], gps: ['FC', 'GPS'], winch: ['FC', 'CARGO'], failsafe: ['FC', 'RX', 'TEL'] };
  const stamp = (st, ids) => ids.map(id => [id, st.placed[id] || null, st.placed[id] ? st.placed[id].orient : -1]);
  const still = (st, s) => !!s && s.every(([id, p, o]) => p && st.placed[id] === p && !p.leave && p.orient === o);
  const xs = st => {
    if (!st.dl) {
      st.dl = { run: null, ok: {}, rot: 0 };
      if (!fresh) for (const k of Object.keys(NEEDS)) st.dl.ok[k] = { end: 0, parts: stamp(st, NEEDS[k]) };
      if (!fresh && st.placed.GPS && st.placed.GPS.orient === 1) st.dl.rot = 4;
    }
    return st.dl;
  };
  const passed = (st, k) => { const r = xs(st).ok[k]; return !!r && st.t >= r.end && still(st, r.parts); };
  const running = st => { const r = xs(st).run; return r && st.t < r.end ? r : null; };
  const progress = (st, r) => r ? Math.max(0, Math.min(1, (st.t - r.t0) / (r.end - r.t0))) : 0;
  // winch bench test: 30 mm out and back in, the parcel never reaches the mat (it hangs 36 mm above it)
  const lineMm = st => { const r = running(st); return r && r.kind === 'winch' ? 30 * Math.sin(Math.PI * progress(st, r)) : 0; };

  function begin(api, kind, dur, endText, sound){
    const st = api.st, x = xs(st);
    x.run = { kind, t0: st.t, end: st.t + dur };
    x.ok[kind] = { end: st.t + dur, parts: stamp(st, NEEDS[kind]) };
    st.later.push({ t: dur, say: endText, sfx: sound || 'ding' });
  }
  function blocked(api){
    const st = api.st;
    if (st.test || st.queue.length || running(st)) { api.say('Wait for the test to finish', 1600, 'tick'); return true; }
    if (st.exT || st.ex > 0.01) { api.say('Close the exploded view first', 2000, 'buzz'); return true; }
    return false;
  }
  const need = (api, ids, text) => { if (ids.every(id => api.isOn(id))) return false; api.say(text, 2600, 'buzz'); return true; };
  const live = (api, text) => { if (SD.powered(api.st)) return false; api.say(text, 2600, 'buzz'); return true; };

  const buttons = [
    { id: 'compass', label: 'Calibrate compass', onClick: api => {
      if (blocked(api) || need(api, NEEDS.compass, 'Fit the Pixhawk and the GPS mast first: the compass is in the GPS puck')) return;
      if (api.isOn('PROPS')) return api.say('Props off for the compass dance: you turn the drone over in your hands', 3000, 'buzz');
      const x = xs(api.st), back = api.orient('GPS') === 1;
      x.rot = back ? 4 : 0;
      api.log('$ onboard compass calibration: rotate the drone through every side');
      begin(api, 'compass', 4, back
        ? 'Compass calibrated. It found the puck turned 180° and set COMPASS_ORIENT 4 (auto-rotation). Better: mount it arrow forward'
        : 'Compass calibrated: offsets saved, orientation matches. Reboot the autopilot');
      api.sfx('tick');
    } },
    { id: 'gps', label: 'Wait for GPS lock', onClick: api => {
      if (blocked(api) || need(api, NEEDS.gps, 'Fit the Pixhawk and the GPS mast first: the compass is in the GPS puck')) return;
      if (live(api, 'Plug in the battery: the GPS needs the Pixhawk powered')) return;
      if (passed(api.st, 'gps')) return api.say('GPS 1: 3D fix, 18 satellites, HDOP 0.7. EKF3 is using GPS', 2200, 'tick');
      api.log('GPS 1: u-blox detected on GPS1 (SERIAL3)');
      begin(api, 'gps', 5, 'GPS 1: 3D fix, 18 satellites, HDOP 0.7. EKF3 is using GPS');
      api.sfx('click');
    } },
    { id: 'winch', label: 'Winch test', onClick: api => {
      if (blocked(api) || need(api, NEEDS.winch, 'Fit the Pixhawk and the winch first')) return;
      if (live(api, 'Plug in the battery: the winch servo runs from the 6 V BEC on the servo rail')) return;
      api.log('$ MAV_CMD_DO_WINCH: relative length 0.03 m, then back to 0');
      api.log('winch: PWM sets the line speed; line length is an estimate (no encoder)');
      begin(api, 'winch', 3, 'Winch ok: 3 cm out, held, reeled back in. The length is estimated, so re-zero it at every retract');
      api.sfx('spin');
    } },
    { id: 'failsafe', label: 'Failsafe test (props off)', onClick: api => {
      if (blocked(api)) return;
      if (api.isOn('PROPS')) return api.say('PROPS OFF! Never spin motors on the bench with props on', 3000, 'buzz');
      if (need(api, NEEDS.failsafe, 'Fit the Pixhawk, the receiver and the telemetry radio first')) return;
      if (live(api, 'Plug in the battery: the ESCs need power to arm')) return;
      const st = api.st, ui = SD.ui();
      api.log('$ armed on the bench in Stabilize, props off: motors idle');
      api.log('$ transmitter off: no RC frames');
      begin(api, 'failsafe', 2.6, 'Radio failsafe: on the ground it disarms at once. In the air FS_THR_ENABLE 1 flies RTL, and FS_GCS_ENABLE does the same when telemetry drops', 'unplug');
      if (ui) ui.animate(dt => {
        const r = running(st), idle = r && r.kind === 'failsafe' && st.t - r.t0 < 1.4 ? .3 : 0;
        motorsIdle(st, idle, dt);
        return !!r || st.rpm.some(v => v > 0);
      });
    } },
  ];
  // motors at arming idle (MOT_SPIN_ARM) during the failsafe test, then they stop
  function motorsIdle(st, idle, dt){
    const ms = SD.craft().motors;
    st.rpm = ms.map((m, i) => idle > 0 ? Math.min(idle, (st.rpm[i] || 0) + dt) : Math.max(0, (st.rpm[i] || 0) - dt * 2));
    ms.forEach((m, i) => { st.spin[i] += (m.dir === 'CW' ? -1 : 1) * 20 * dt * st.rpm[i]; });
  }

  function report(st){
    const r = running(st);
    return {
      compassOk: passed(st, 'compass'), compassOrient: passed(st, 'compass') ? xs(st).rot : null,
      gpsFix: passed(st, 'gps'), winchOk: passed(st, 'winch'), failsafeOk: passed(st, 'failsafe'),
      run: r ? r.kind : null, parcel: 'aboard',
    };
  }

  /* ---------- drawings ---------- */
  function frame(ctx){
    const out = [];
    out.push(gg.plate(SD.rrect(240, 220, 14), HUB0, HUB1 - HUB0, 'carbon'));
    for (const mo of ctx.craft.motors){
      const sx = Math.sign(mo.x), sy = Math.sign(mo.y), r0 = 80 * Math.SQRT2, end = mo.r - 22;
      const p0 = [sx * 80, sy * 80, TUBE_Z];
      out.push(...gg.rod(p0, along(mo, HINGE_R - 17, 0, TUBE_Z), TUBE_R, 'carbon', 40));
      out.push(...gg.rod(along(mo, HINGE_R + 17, 0, TUBE_Z), along(mo, end, 0, TUBE_Z), TUBE_R, 'carbon', 40));
      out.push(armBlock(mo, HINGE_R, TUBE_Z, 17, 16, 15, 'pal'));                  // fold hinge
      out.push(armBlock(mo, HINGE_R - 4, TUBE_Z + 17, 8, 5, 2, 'dark'));           // its latch
      out.push(armBlock(mo, mo.r - 4, HUB1 + 12.5, 18, 15, 12.5, 'dark'));         // tube clamp under the mount
      out.push(armBlock(mo, mo.r, TUBE_TOP + 2, 26, 26, 2, 'carbon'));             // 52 mm motor mount
      const a = Wp(...along(mo, r0, -TUBE_R, TUBE_TOP)), b = Wp(...along(mo, end, -TUBE_R, TUBE_TOP));
      const c = Wp(...along(mo, end, TUBE_R, TUBE_TOP)), d = Wp(...along(mo, r0, TUBE_R, TUBE_TOP));
      ctx.shadows.push([a, b, c, d]);
    }
    for (const sy of [-1, 1]){
      out.push(...gg.rod([-175, sy * 150, SKID_Z], [175, sy * 150, SKID_Z], 8, 'carbon', 50));
      for (const sx of [-1, 1]) out.push(...gg.rod([sx * 80, sy * 150, SKID_Z + 6], [sx * 80, sy * 100, HUB0], 6, 'carbon', 40));
      ctx.shadows.push([[-175, sy * 150 - 8], [175, sy * 150 - 8], [175, sy * 150 + 8], [-175, sy * 150 + 8]].map(([x, y]) => Wp(x, y, SKID_Z + 8)));
    }
    ctx.shadows.push(SD.rrect(240, 220, 14, 2).map(([x, y]) => Wp(x, y, HUB1)));
    return out;
  }

  function escs(ctx){
    return ctx.craft.motors.map(mo => {
      const it = armBlock(mo, ESC_R, TUBE_TOP + 4.5, 22, 12, 4.5, '#2f4f7a');
      const [x, y] = along(mo, ESC_R + 6, 0, 0);
      it.svg += gg.text(x, y, TUBE_TOP + 9.1, '40A', 7, '#e9eef5');
      return it;
    });
  }

  // battery power from the PDB pads to each ESC: a red and a black lead along the plate and up the arm
  function powerLeads(ctx){
    const out = [];
    for (const mo of ctx.craft.motors){
      const sx = Math.sign(mo.x), sy = Math.sign(mo.y), zp = HUB1 + 2.4, zt = TUBE_TOP + 1;
      for (const [col, o] of [['#d8473a', -2.4], ['#2c2926', 2.4]]){
        const run = sx < 0
          ? [[-60, sy * (28 + o), zp], [-82, sy * (62 + o), zp], along(mo, 130, o, zt), along(mo, ESC_R - 22, o, zt)]
          : [[-50, sy * (32 + o), zp], [-32, sy * (96 + o), zp], [64, sy * (96 + o), zp], along(mo, 140, o, zt), along(mo, ESC_R - 22, o, zt)];
        out.push(...gg.wire(run, col, 2.2, 10));
        if (col === '#d8473a') flow(ctx, 'power', run);
      }
    }
    return out;
  }

  function depthCam(ctx){
    const zc = HUB1 + 16.5;
    const foot = gg.box(98, -30, HUB1, 112, 30, HUB1 + 4, 'dark');
    const body = gg.box(108, -45, HUB1 + 4, 133, 45, HUB1 + 29, '#3a3a40');
    body.svg += frontDisc(133.2, 25, zc, 5.5, '#2c4f6e') + frontDisc(133.2, -25, zc, 5.5, '#2c4f6e')
      + frontDisc(133.2, 5, zc, 3.6, '#7a3b52') + frontDisc(133.2, -12, zc, 4.4, '#33415a');
    body.svg += gg.text(120, 0, HUB1 + 29.1, 'DEPTH', 6.5, '#d9d3c6', 'y');
    return [foot, body];
  }

  // the Pi's cables: TELEM2 to the Pixhawk (a 3-wire JST-GH lead: TX, RX, GND; never the +5 V pin) and USB 3 to the depth camera
  function piCables(ctx){
    const out = [];
    if (SD.isOn(ctx.st, 'FC')){
      const run = [[-14, 107, TOP1 + 8], [-14, 116, TOP1 + 4], [-14, 117, TOP0 - 4], [-14, 60, TOP0 - 10], [-30, 24, HUB1 + 14]];
      [['#f2efe7', -2], ['#43a35a', 0], ['#2c2926', 2]].forEach(([col, o]) => out.push(...gg.wire(run.map(([x, y, z]) => [x + o, y, z]), col, 1, 9)));
      flow(ctx, 'signal', run);
    }
    if (SD.isOn(ctx.st, 'DEPTH')){
      const run = [[121, 46, HUB1 + 20], [128, 62, HUB1 + 34], [126, 70, TOP1 + 3], [62, 70, TOP1 + 3], [46, 70, TOP1 + 8]];
      out.push(...gg.wire(run, '#2c2926', 2, 10));
      flow(ctx, 'signal', run.slice().reverse());
    }
    return out;
  }

  function lteCable(ctx){
    if (!SD.isOn(ctx.st, 'COMP')) return [];
    const run = [[-38, -84, TOP1 + 3], [-100, -70, TOP1 + 2], [-101, 64, TOP1 + 2], [-42, 64, TOP1 + 4], [-42, 72, TOP1 + 9]];
    flow(ctx, 'signal', run);
    return gg.wire(run, '#2c2926', 2, 10);
  }

  function gpsMast(ctx){
    const out = [], back = ctx.orient === 1, st = ctx.st;
    out.push(gg.box(MAST_X - 10, -10, TOP1, MAST_X + 10, 10, TOP1 + 8, 'dark'));
    out.push(...gg.rod([MAST_X, 0, TOP1 + 8], [MAST_X, 0, PUCK_Z], 6, 'carbon', 14));
    const puck = gg.cyl(MAST_X, 0, PUCK_Z, PUCK_Z + 14, 36, '#ece6d6', 22);
    puck.svg += gg.arrow(MAST_X + (back ? 6 : -6), 0, PUCK_Z + 14.05, 30, back ? -1 : 1, '#231e16');
    puck.svg += gg.text(MAST_X - 4, 0, PUCK_Z + 14.05, 'GPS', 6, '#7a7262', 'y');
    // ArduPilot's LED: flashing blue = disarmed, no fix; flashing green = disarmed with a 3D fix
    const pw = ctx.powered, fix = passed(st, 'gps'), blink = Math.sin(st.t * 6) > 0;
    const r = running(st), searching = r && r.kind === 'gps';
    if (pw) puck.svg += gg.led(MAST_X + 18, 18, PUCK_Z + 14.4, fix ? '#43c25c' : '#4aa3ff', blink || (!fix && !searching), 1.6);
    out.push(puck);
    if (SD.isOn(st, 'FC')){
      const run = [[MAST_X + 6, -6, PUCK_Z - 2], [MAST_X + 6, -6, TOP1 + 10], [-128, -8, TOP1 - 2], [-128, -8, HUB1 + 20], [-44, -8, HUB1 + 13]];
      out.push(...gg.wire(run, '#2c2926', 1.6, 10));
      flow(ctx, 'signal', run);
    }
    return out;
  }

  function cargo(ctx){
    const out = [], line = lineMm(ctx.st), pz = PARCEL_Z - line, hookZ = pz + PARCEL_H;
    for (const [x, y] of [[100, 82], [100, -82], [-100, 82], [-100, -82]]) out.push(...gg.rod([x, y, HUB0], [x, y, CAGE_Z], 4, 'metal', 45));
    for (const s of [-1, 1]){
      out.push(...gg.rod([s * 100, -82, CAGE_Z], [s * 100, 82, CAGE_Z], 4, 'metal', 45));
      out.push(...gg.rod([-100, s * 82, CAGE_Z], [100, s * 82, CAGE_Z], 4, 'metal', 45));
      out.push(gg.box(-26, s * 46 - 2, DRUM_Z - 24, 26, s * 46 + 2, HUB0, 'pal'));       // drum brackets
    }
    out.push(...gg.rod([0, -44, DRUM_Z], [0, 44, DRUM_Z], 18, 'pal', 12));               // winch drum
    out.push(gg.box(-20, 48, DRUM_Z - 20, 20, 68, DRUM_Z + 20, 'black'));                // winch servo
    out.push(...gg.rod([0, 0, DRUM_Z - 18], [0, 0, hookZ + 10], .9, 'white', 10, 6));     // the line
    out.push(gg.box(-5, -5, hookZ, 5, 5, hookZ + 10, 'metal'));                          // release hook
    const parcel = gg.box(-84, -68, pz, 84, 68, pz + PARCEL_H, '#c9a46c');
    parcel.svg += gg.text(30, 0, pz + PARCEL_H + .4, 'PARCEL 1 KG', 11, '#6b5534', 'y');
    out.push(parcel, gg.box(-84, -10, pz + PARCEL_H, 84, 10, pz + PARCEL_H + .8, '#e7dcc0'));
    return out;
  }

  SD.define({
    id: 'delivery', fig: '07', title: 'Autonomous delivery quad', palette: 'mustard',
    mat: 920, height: 520, explode: 16, log: 'ArduCopter 4.7',
    bounds: [-170, 170, -150, 150, 0, 400],
    calLabel: 'Calibrate accelerometer',
    messages: { powered: 'Pixhawk and Pi 5 boot, the ESCs play their ready tones. GPS LED flashing blue: no fix yet' },
    frame: {
      layout: 'quad-x', wheelbase: 690, numbering: 'ardupilot',
      motors: [
        { id: 'M1', at: [MA, -MA], dir: 'CCW' },
        { id: 'M4', at: [-MA, -MA], dir: 'CW' },
        { id: 'M2', at: [-MA, MA], dir: 'CCW' },
        { id: 'M3', at: [MA, MA], dir: 'CW' },
      ],
      arm: { w: 25, t: 25 }, plate: { l: 240, w: 220, t: 5, z: HUB0, r: 14 }, motorZ: MOUNT_Z,
    },
    design: {
      default: { batt: '6s10000', motor: '4114-400', prop: '15x5.5' },
      batts: {
        '6s10000': { cells: 6, mah: 10000, size: [175, 65, 58], color: '#2b2a28', label: '6S 10000' },
        '6s16000': { cells: 6, mah: 16000, size: [196, 77, 64], color: '#2f5fa8', label: '6S 16000' },
        '4s10000': { cells: 4, mah: 10000, size: [166, 69, 41], color: '#d9a520', label: '4S 10000' },
      },
      motors: {
        '4114-400': { stator: [41, 14], bell: [47, 24], kv: 400, label: '4114 400KV' },
        '5010-360': { stator: [50, 10], bell: [56, 20], kv: 360, label: '5010 360KV' },
        '2814-700': { stator: [28, 14], bell: [35, 24], kv: 700, label: '2814 700KV' },
      },
      props: {
        '15x5.5': { d: 15, pitch: 5.5, blades: 2, color: '#3a3734', label: '15x5.5' },
        '14x4.8': { d: 14, pitch: 4.8, blades: 2, color: '#5a554f', label: '14x4.8' },
        '16x5.4': { d: 16, pitch: 5.4, blades: 2, color: '#262422', label: '16x5.4' },
      },
    },
    parts: [
      { id: 'FRAME', short: 'FRAME', name: 'Carbon frame: hub, four folding 25 mm tube arms, landing skids', z: 3,
        piece: { kind: 'custom', draw: frame }, tag: { at: [175, -150, 16], dx: 60, dy: 30 } },
      { id: 'MOTORS', short: 'MOTORS', name: '4 low-KV outrunner motors (4114 class)', after: ['FRAME'], z: 6,
        piece: { kind: 'motors', color: 'pal' }, tag: { at: [MA, MA, MOUNT_Z + 27], dx: -40, dy: -40 } },
      { id: 'ESC', short: 'ESCs', name: '4 × 40 A ESCs out on the arms', after: ['FRAME'], z: 4.5,
        piece: { kind: 'custom', draw: escs }, tag: { at: [-ESC_R / Math.SQRT2, -ESC_R / Math.SQRT2, TUBE_TOP + 9], dx: -50, dy: 40 },
        xr: [{ at: [-ESC_R / Math.SQRT2, -ESC_R / Math.SQRT2, TUBE_TOP + 9], text: '40 A ESC · DSHOT600' }] },
      { id: 'WIRES', short: 'WIRING', name: 'Motor phase wires and ESC power leads', after: ['MOTORS', 'ESC'], z: 5,
        piece: [{ kind: 'wires', from: 'arm', along: (ESC_R + 22) / 345, h: 5 }, { kind: 'custom', draw: powerLeads }],
        tag: { at: [-150, 150, TUBE_TOP + 2], dx: -30, dy: -50 } },
      { id: 'XT60', short: 'PDB + CAP', name: 'Power board: XT90-S lead, power module, 1000 µF cap, BECs', after: ['ESC'], z: 4,
        polar: ['stripe to minus', 'stripe to plus'],
        piece: [
          { kind: 'board', at: [-76, 0, HUB1], size: [60, 76], t: 1.6, color: 'pcb', label: 'PDB', labelAt: [4, 26],
            pads: [{ at: [22, 30], size: [8, 6] }, { at: [22, -30], size: [8, 6] }, { at: [-22, 30], size: [8, 6] }, { at: [-22, -30], size: [8, 6] }] },
          { kind: 'module', at: [-56, 26, HUB1 + 1.6], size: [18, 14, 6], color: 'pcbBlack', label: '5V 5A', labelSize: .24 },
          { kind: 'module', at: [-56, -26, HUB1 + 1.6], size: [18, 14, 6], color: 'pcbBlack', label: '6V', labelSize: .3 },
          { kind: 'module', at: [-114, 0, HUB1], size: [16, 26, 8], color: 'pcbBlue', label: 'PM', labelSize: .3 },
          { kind: 'xt60', at: [-152, 0, 224], dir: [-1, 0, 0], lead: [[-122, 0, HUB1 + 9], [-136, 0, HUB1 + 10], [-144, 0, 224]],
            cap: { at: [-98, -18, HUB1 + 8.6], dir: [1, 0, 0], r: 7, l: 28, stripe: [0, -1, 0] } },
        ],
        tag: { at: [-152, 0, 230], dx: -70, dy: -10 },
        xr: [{ at: [-84, -18, HUB1 + 16], text: '1000 µF CAP: STRIPE TO MINUS' },
          { at: [-114, 0, HUB1 + 9], text: 'POWER MODULE → POWER1' }] },
      { id: 'FC', short: 'PIXHAWK 6C', name: 'Pixhawk 6C flight controller on a damped plate', after: ['XT60'], z: 7,
        polar: ['arrow forward', 'arrow backward'],
        piece: [
          { kind: 'box', at: [0, 0, HUB1], size: [92, 52, 5], color: 'black' },
          { kind: 'board', at: [0, 0, HUB1 + 5], size: [84.8, 44], t: 12.4, color: '#3d4147', arrow: true, arrowAt: [-20, 0],
            label: 'PIXHAWK 6C', labelAt: [16, 0], led: '#43c25c', ledAt: [36, 15] },
        ],
        tag: { at: [30, 0, HUB1 + 18], dx: 90, dy: -30 },
        xr: [{ at: [10, 8, HUB1 + 18], text: 'STM32H743 · 2 IMUS · EKF3' }] },
      { id: 'RX', short: 'RC BACKUP', name: 'ExpressLRS backup receiver (CRSF on TELEM3)', after: ['FC'], z: 7.5,
        piece: { kind: 'module', at: [62, -73, HUB1], size: [22, 16, 5], color: 'pcbBlack', label: 'ELRS', labelSize: .28, led: '#4aa3ff',
          antenna: { at: [64, -81, HUB1 + 4], type: 'v', spread: 36, dir: [.12, -.98, .12], len: 40 } },
        tag: { at: [62, -73, HUB1 + 5], dx: 70, dy: 20 } },
      { id: 'TEL', short: 'TELEMETRY', name: 'SiK telemetry radio (915 MHz US / 433 MHz EU)', after: ['FC'], z: 7.5,
        piece: { kind: 'module', at: [-20, 67, HUB1], size: [40, 34, 14], color: 'dark', label: 'SiK', labelSize: .3, led: '#43c25c',
          antenna: { at: [-20, 84, HUB1 + 10], type: 'whip', dir: [-.1, .9, .42], len: 92, r: 2 } },
        tag: { at: [-20, 67, HUB1 + 14], dx: -80, dy: -16 } },
      { id: 'DEPTH', short: 'DEPTH CAM', name: 'Stereo depth camera (RealSense D435i class), forward-facing', after: ['FRAME'], z: 5.5,
        piece: { kind: 'custom', draw: depthCam }, tag: { at: [133, 0, HUB1 + 29], dx: 80, dy: 10 },
        xr: [{ at: [133, 0, HUB1 + 20], text: 'STEREO IR DEPTH CAMERA' }] },
      { id: 'TOP', short: 'TOP PLATE', name: 'Top plate on 40 mm standoffs, battery straps', after: ['FC', 'RX', 'TEL'], z: 10, cover: true,
        piece: [{ kind: 'standoffs', at: [[100, 95], [100, -95], [-100, 95], [-100, -95]], z0: HUB1, z1: TOP0, r: 3, split: 10 },
          { kind: 'plate', l: 250, w: 224, r: 12, z: TOP0, t: TOP1 - TOP0, color: 'carbon' }],
        tag: { at: [118, -100, TOP1], dx: 70, dy: -20 } },
      { id: 'COMP', short: 'COMPANION', name: 'Raspberry Pi 5 companion computer (MAVLink on TELEM2)', after: ['TOP'], z: 12.5,
        piece: [
          { kind: 'board', at: [5, 80, TOP1], size: [85, 56], t: 1.6, color: 'pcb', label: 'Pi 5', labelAt: [28, -20],
            chips: [{ at: [6, 0], size: [36, 34, 9], color: 'black', label: 'FAN' }, { at: [-33.5, 17], size: [18, 14, 16], color: 'metal' },
              { at: [-33.5, -1], size: [18, 14, 16], color: 'metal' }, { at: [-32, -19], size: [21, 16, 13.5], color: 'metal' },
              { at: [8, 24.5], size: [51, 5, 8.5], color: 'black' }],
            led: '#43c25c', ledAt: [38, -23] },
          { kind: 'custom', draw: piCables },
        ],
        tag: { at: [20, 80, TOP1 + 12], dx: 40, dy: -60 },
        xr: [{ at: [8, 104, TOP1 + 9], text: 'PI 5 UART ↔ TELEM2 (3.3 V)' }] },
      { id: 'LTE', short: 'LTE MODEM', name: '4G/LTE USB modem and antennas', after: ['COMP'], z: 12.5,
        piece: [{ kind: 'module', at: [-8, -84, TOP1], size: [60, 40, 6], color: 'pcbBlue', label: 'LTE', labelSize: .3, led: '#4aa3ff' },
          { kind: 'antenna', at: [-30, -98, TOP1 + 6], type: 'whip', dir: [0, -.12, 1], len: 65, r: 3.2, color: 'black' },
          { kind: 'antenna', at: [14, -98, TOP1 + 6], type: 'whip', dir: [0, -.12, 1], len: 65, r: 3.2, color: 'black' },
          { kind: 'custom', draw: lteCable }],
        tag: { at: [-8, -84, TOP1 + 6], dx: 60, dy: 40 } },
      { id: 'GPS', short: 'GPS MAST', name: 'M10 GPS + compass on a 129 mm mast', after: ['TOP'], z: 13,
        polar: ['arrow forward', 'arrow backward'], mistake: 'gps-reversed',
        piece: { kind: 'custom', draw: gpsMast }, tag: { at: [MAST_X, 0, PUCK_Z + 14], dx: -80, dy: -20 },
        xr: [{ at: [MAST_X, 0, PUCK_Z + 7], text: 'COMPASS FAR FROM THE AMPS' }] },
      { id: 'CARGO', short: 'WINCH', name: 'Servo winch, release hook, cargo cage and 1 kg parcel', after: ['FRAME'], z: 0,
        piece: { kind: 'custom', draw: cargo }, tag: { at: [84, -68, PARCEL_Z + 60], dx: 80, dy: 30 },
        xr: [{ at: [0, 44, DRUM_Z], text: 'PWM WINCH ON AUX5' },
          { at: [0, 0, PARCEL_Z + PARCEL_H + 5], text: 'HOOK OPENS ON A SLACK LINE' }] },
      { id: 'BATT', short: 'BATTERY', name: '6S LiPo and straps', after: ['TOP', 'XT60'], z: 14, cover: true,
        piece: { kind: 'battery', at: [0, 0, TOP1], strap: true, pad: true }, tag: { at: [40, 0, TOP1 + 60], dx: 0, dy: -50 } },
      { id: 'PROPS', short: 'PROPS', name: '15-inch carbon props, 2 CW + 2 CCW', after: ['MOTORS', 'TOP'], z: 11,
        polar: ['props matched to motor spin', 'swapped CW/CCW'],
        piece: { kind: 'props' }, tag: { at: [MA + 150, -MA, MOUNT_Z + 30], dx: 40, dy: -10 } },
    ],
    tests: {
      smoke: { needs: ['XT60', 'ESC'], at: [-420, 0] },
      motors: { needs: ['WIRES', 'FC'] },
      calibrate: { needs: ['FC'] },
      plug: { needs: ['BATT', 'XT60'] },
    },
    buttons, report,
    wiring: {
      nodes: {
        LTE: { at: [0, 8], title: 'LTE MODEM', sub: '4G, USB to the Pi', color: '#8c4bd1', led: '#4aa3ff' },
        COMP: { at: [203, 8], title: 'RASPBERRY PI 5', sub: 'companion, MAVSDK', color: '#3e86d9', led: '#43c25c' },
        DEPTH: { at: [406, 8], title: 'DEPTH CAMERA', sub: 'D435i class, USB 3', color: '#43a35a' },
        GPS: { at: [610, 8], title: 'GPS + COMPASS', sub: 'u-blox M10, mast', color: '#43a35a' },
        TEL: { at: [0, 142], title: 'TELEMETRY', sub: 'SiK 915/433 MHz', color: '#8c4bd1', led: '#43c25c' },
        FC: { at: [203, 142], title: 'PIXHAWK 6C', sub: 'ArduCopter, 2 IMUs', color: '#3e86d9', led: '#43c25c' },
        RX: { at: [406, 142], title: 'RC RECEIVER', sub: 'ExpressLRS, CRSF', color: '#8c4bd1', led: '#4aa3ff' },
        CARGO: { at: [610, 142], title: 'WINCH + HOOK', sub: 'PWM winch, 1 kg', color: '#f08a2b' },
        BATT: { at: [0, 276], title: 'BATTERY', sub: 'batt', color: 'tomato' },
        XT60: { at: [203, 276], title: 'POWER BOARD', sub: 'XT90, PM, BECs', color: 'tomato' },
        ESC: { at: [406, 276], title: 'ESCs ×4', sub: '40 A, DShot600', color: '#f08a2b' },
        MOTORS: { at: [610, 276], title: 'MOTORS ×4', sub: 'motor', color: '#f08a2b' },
      },
      edges: [
        { from: 'BATT', to: 'XT60', kind: 'power', n: 2, label: 'V' },
        { from: 'XT60', to: 'ESC', kind: 'power', n: 2, label: 'V' },
        { from: 'ESC', to: 'MOTORS', kind: 'phase', n: 3, label: '3-ph ×4' },
        { from: 'XT60', to: 'FC', kind: 'power', label: 'POWER1 · PM', labelAt: [40, 0] },
        { from: 'XT60', to: 'COMP', kind: 'power', label: '5 V 5 A', a: [203, 292], b: [203, 24],
          via: [[176, 292], [176, 24]], labelAt: [0, 64] },
        { from: 'COMP', to: 'FC', kind: 'signal', label: 'TELEM2 · 921600', labelAt: [46, 0] },
        { from: 'TEL', to: 'FC', kind: 'signal', label: 'TELEM1' },
        { from: 'RX', to: 'FC', kind: 'signal', label: 'TELEM3' },
        { from: 'GPS', to: 'FC', kind: 'signal', label: 'GPS1 · UART + I2C', a: [650, 64], b: [353, 152],
          via: [[650, 103], [378, 103], [378, 152]] },
        { from: 'FC', to: 'ESC', kind: 'signal', label: 'AUX 1-4 · DShot600', a: [330, 198], b: [440, 276],
          via: [[330, 237], [440, 237]] },
        { from: 'FC', to: 'CARGO', kind: 'signal', label: 'AUX5 · PWM + 6 V', a: [353, 188], b: [610, 188],
          via: [[384, 188], [384, 222], [588, 222], [588, 188]], labelAt: [102, 11] },
        { from: 'DEPTH', to: 'COMP', kind: 'signal', label: 'USB 3' },
        { from: 'LTE', to: 'COMP', kind: 'signal', label: 'USB' },
      ],
    },
  });
})();
