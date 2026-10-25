// @cf title Heavy-lift cinema octocopter
// @cf use engine/drone.js
// @cf use engine/drone-geo.js
// @cf use engine/drone-frames.js
// @cf use engine/drone-pieces.js
// @cf use engine/drone-sheet.js
/* Fig. 13, the heavy-lift cinema octocopter on ArduPilot Copter 4.7.2 (docs/facts/octo.md). A flat octa X, 1360 mm
   motor to motor: two octagonal carbon plates (r 200 and 180 mm, 60 mm apart) with eight 32 mm carbon tubes clamped
   between them, each folding at a hinge 230-272 mm out, a 6010 170 KV motor on a clamp at r = 680 mm and its 80 A ESC
   on top of the tube in the prop wash. A Pixhawk 6X on dampers on the top plate under a battery tray, two 6S packs in
   series (12S) on the tray, two GPS masts behind it, the power board between the plates, the RC receiver and the
   900 MHz telemetry radio under the bottom plate, a 3-axis gimbal with a cinema camera hung under the front, and
   retractable legs that fold up so the camera can pan all the way round. ArduPilot numbers octa X motors out of order
   (FRAME_TYPE 1): the list below is Mission Planner's Motor Test order, A to H clockwise from the front right.
   Craft-local mm: x forward, y left, z up, z = 0 on the mat; the bottom plate's underside is 400 mm up. */
(() => {
  const SD = SL.drone, g = SD.g, W = SD.W;
  const rad = d => d * Math.PI / 180;
  const R = 680, C22 = R * Math.cos(rad(22.5)), S22 = R * Math.sin(rad(22.5));
  const PZ = 400, BP1 = PZ + 6, TP0 = 460, TP1 = 466;
  const TUBE_Z = 433, TUBE_R = 16, MOUNT_Z = TUBE_Z + 22, HINGE0 = 230, HINGE1 = 272;
  const ESC_R = 480, TRAY_Z = 526;
  const MAST_X = -140, MAST_Y = 65, PUCK_Z = 640;
  const HY = 150, HX = 120, HZ = 394, FOOT_X = 190, FOOT_Y = 270, SKID_R = 12, GEAR_MAX = 70;
  const XT90 = [-160, 0, TP1 + 12];
  const octagon = r => Array.from({ length: 8 }, (_, i) => [r * Math.cos(rad(i * 45)), r * Math.sin(rad(i * 45))]);
  const dirOf = mo => [Math.cos(mo.ang), Math.sin(mo.ang)];
  const along = (mo, r, side, z) => { const [ux, uy] = dirOf(mo); return [ux * r - uy * side, uy * r + ux * side, z]; };
  const armBlock = (mo, r, z, hl, hw, hh, col) => {
    const [ux, uy] = dirOf(mo);
    return g.oblock([ux * r, uy * r, z], [ux, uy, 0], [-uy, ux, 0], [0, 0, 1], hl, hw, hh, col);
  };
  const flow = (ctx, kind, pts, extra) => ctx.flows.push(Object.assign({ kind, pts: pts.map(p => W(...p)) }, extra || {}));

  // a pill in screen pixels over a craft-local point
  function pillAt(p3, text, fill, ink = INK){
    const [X, Y] = SD.Pb(...p3), fs = 8.6 * INK_K, h = fs * 1.8, t = CF_T(text.key || text, text.vars), w = CF_TW(t, fs) + fs * 1.5;
    // a wide, thin box above the whole craft, so the depth sort draws the pill after everything it overlaps
    return { box: SD.bbox([W(-760, -760, p3[2] - 1), W(760, 760, p3[2] + 1)]),
      svg: `<g class="dpill"><rect x="${f(X - w / 2)}" y="${f(Y - h / 2)}" width="${f(w)}" height="${f(h)}" rx="${f(h / 2)}" fill="${fill}" stroke="${INK}" stroke-width="1.2"/>`
        + `<text x="${f(X)}" y="${f(Y + fs * .36)}" font-size="${f(fs)}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="800" fill="${ink}">${CF_ESC(t)}</text></g>` };
  }

  // what the checks show on their pills and log, in one table the figure-string collector reads (pillAt and the
  // delayed messages pass text on to CF_T)
  const MSG = {
    noAcc: 'PreArm: 3D Accel calibration needed',
    noFix: 'PreArm: GPS 1: Bad fix',
    // the red pill of a failed run, in the capitals every pill uses
    noAccPill: 'PREARM: 3D ACCEL CALIBRATION NEEDED',
    noFixPill: 'PREARM: GPS 1: BAD FIX',
    stand: 'ON THE STAND, DISARMED',
    gearUp: 'GEAR SWITCH HIGH: RETRACTING',
    gearClear: 'GEAR UP: THE CAMERA PANS 360°',
    gearDown: 'GEAR SWITCH LOW: DEPLOYING',
    gearDone: 'GEAR DOWN AND LOCKED',
    checking: 'PRE-ARM CHECKS…',
    armed: 'ARMED: MOTORS IDLE',
    gpsSats: 'GPS 1: {a} SATS · GPS 2: {b} SATS',
    gpsFix: 'GPS 1 + GPS 2: 3D FIX, HDOP 0.7',
  };

  /* ---------- the craft's own bench checks: landing gear, dual GPS, pre-arm ---------- */
  const GEAR_T = 7, GPS_T = 4.6, PRE_T = 2.4;
  // the legs' angle this frame (0 = down, GEAR_MAX = folded up) and the switch position the test is at
  function gearPose(st){
    const t = st.test;
    if (!t || t.kind !== 'gear') return { deg: 0, phase: null };
    const s = t.t, k = u => Math.max(0, Math.min(1, u));
    if (s < .8) return { deg: 0, phase: 'stand' };
    if (s < 2.8) return { deg: GEAR_MAX * k((s - .8) / 2), phase: 'up' };
    if (s < 4.4) return { deg: GEAR_MAX, phase: 'clear' };
    if (s < 6.4) return { deg: GEAR_MAX * (1 - k((s - 4.4) / 2)), phase: 'down' };
    return { deg: 0, phase: 'done' };
  }
  function blocked(api){
    const st = api.st;
    if (st.test || st.queue.length) { api.say('Wait for the test to finish', 1600, 'tick'); return true; }
    if (st.exT || st.ex > .01) { api.say('Close the exploded view first', 2000, 'buzz'); return true; }
    return false;
  }
  const gearTest = api => {
    const st = api.st;
    if (!st || blocked(api)) return;
    if (!api.isOn('GEAR') || !api.isOn('FC') || !api.isOn('RX')) return api.say('Fit the landing gear, the Pixhawk and the receiver first: the gear switch is on the transmitter', 2800, 'buzz');
    if (!SD.powered(st)) return api.say('Plug in the packs: the retract servos run from their own BEC', 2600, 'buzz');
    st.test = { kind: 'gear', t: 0, dur: GEAR_T };
    api.log('$ craft on the stand, disarmed: gear switch (RC7_OPTION 29) HIGH, then LOW');
    api.log('SERVO9 (AUX 1) LandingGear: MIN 1000 = up, MAX 2000 = down');
    st.later.push({ t: GEAR_T, sfx: 'ding', say: 'Switch high folded the legs up clear of the camera, switch low brought them down and locked. In the air LGR_RETRACT_ALT 4 and LGR_DEPLOY_ALT 3 (metres) do it for you' });
    api.pass('gear');
    api.sfx('click');
  };
  const gpsTest = api => {
    const st = api.st;
    if (!st || blocked(api)) return;
    if (!api.isOn('GPS') || !api.isOn('FC')) return api.say('Fit the GPS masts and the Pixhawk first', 2600, 'buzz');
    if (!SD.powered(st)) return api.say('Plug in the packs first: the GPS modules run from the Pixhawk', 2400, 'buzz');
    st.test = { kind: 'gps', t: 0, dur: GPS_T };
    api.log('$ outside, clear sky: wait for both receivers');
    api.log('GPS 1 on GPS1 (SERIAL3), GPS 2 on GPS2 (SERIAL4): 3D fix, HDOP under 1');
    st.later.push({ t: GPS_T, sfx: 'ding', say: 'GPS 1 and GPS 2: 3D fix, 16 and 15 satellites, the two positions within a metre and both compasses agree. Loiter can hold the camera on its mark' });
    api.pass('gps');
    api.sfx('click');
  };
  const prearmTest = api => {
    const st = api.st;
    if (!st || blocked(api)) return;
    if (!api.isOn('FC') || !api.isOn('GPS') || !api.isOn('RX')) return api.say('Fit the Pixhawk, the GPS masts and the receiver first', 2600, 'buzz');
    if (api.isOn('PROPS')) return api.say('Props off: once the checks pass it arms, and eight 20-inch props start turning at MOT_SPIN_ARM', 3000, 'buzz');
    if (!SD.powered(st)) return api.say('Plug in the packs first', 2200, 'buzz');
    const fail = !st.accOk ? MSG.noAcc : !(st.passes && st.passes.gps) ? MSG.noFix : null;
    st.test = { kind: 'prearm', t: 0, dur: PRE_T, fail };
    api.log('$ arm throttle (LOITER, props off, ARMING_SKIPCHK 0)');
    if (fail){
      // a run that fails takes back an earlier pass: the checks hold only for the craft as it is now
      if (st.passes.prearm) st.passes = Object.assign({}, st.passes, { prearm: false });
      api.log(fail);
      st.later.push({ t: PRE_T, sfx: 'buzz', say: fail === MSG.noFix ? 'PreArm: GPS 1: Bad fix. Run the GPS check and wait for both receivers to lock, then try again' : 'PreArm: 3D Accel calibration needed. Calibrate the accelerometer, then try again' });
      api.sfx('click');
      return;
    }
    api.log('pre-arm: accels and gyros calibrated, GPS 1 and 2 fixed, compasses consistent, battery above BATT_LOW_VOLT');
    api.log('ARMED: motors idle at MOT_SPIN_ARM 0.1; disarm');
    st.later.push({ t: PRE_T, sfx: 'ding', say: 'Every pre-arm check passed and it armed, the eight motors idling. Disarmed. Read every PreArm message: never skip one with ARMING_SKIPCHK' });
    api.pass('prearm');
    api.sfx('click');
  };

  /* ---------- FRAME: the plates, the clamps, eight folding arms with their motor clamps; the build stand ---------- */
  function stand(){
    const items = [g.box(-205, -90, 0, -125, 90, PZ - 8, '#c9a66b', .9), g.box(-210, -95, PZ - 8, -120, 95, PZ, '#3a3734', .8)];
    for (const x of [-195, -135]) items.push(g.box(x - 4, -96, 40, x + 4, 96, 70, '#a8844f', .7));
    return items;
  }
  function drawFrame(ctx){
    const items = [], st = ctx.st;
    items.push(g.plate(octagon(200), PZ, BP1 - PZ, 'carbon'), g.plate(octagon(180), TP0, TP1 - TP0, 'carbon'));
    // plate standoffs between the arms (the arms sit at 22.5° + k·45°)
    for (let i = 0; i < 8; i++) items.push(g.cyl(150 * Math.cos(rad(i * 45)), 150 * Math.sin(rad(i * 45)), BP1, TP0, 5, 'metal', 10, .7));
    for (const mo of ctx.craft.motors){
      // the clamp between the plates, the inner tube, the fold joint and its lock ring, the outer tube, the motor clamp
      items.push(armBlock(mo, 172, TUBE_Z, 22, 21, (TP0 - BP1) / 2 - .5, 'dark'));
      items.push(...g.rod(along(mo, 194, 0, TUBE_Z), along(mo, HINGE0, 0, TUBE_Z), TUBE_R, 'carbon', 90, 14));
      items.push(armBlock(mo, (HINGE0 + HINGE1) / 2, TUBE_Z, (HINGE1 - HINGE0) / 2, 22, 22, 'pal'));
      items.push(armBlock(mo, HINGE1 + 4, TUBE_Z, 4, 23.5, 23.5, 'dark'));
      items.push(...g.rod(along(mo, HINGE1 + 8, 0, TUBE_Z), along(mo, R - 40, 0, TUBE_Z), TUBE_R, 'carbon', 90, 14));
      items.push(armBlock(mo, R, TUBE_Z, 40, 21, 21, 'dark'));
      ctx.shadows.push([[-TUBE_R, 190], [-TUBE_R, R + 40], [TUBE_R, R + 40], [TUBE_R, 190]].map(([s, r]) => W(...along(mo, r, s, TUBE_Z + TUBE_R))));
    }
    ctx.shadows.push(octagon(200).map(([x, y]) => W(x, y, BP1)));
    // without its legs (or while the gear test folds them) the frame sits on a padded build stand under the rear
    if (!SD.isOn(st, 'GEAR') || gearPose(st).phase) items.push(...stand());
    return items;
  }

  /* ---------- GEAR: two retracting legs a side on their servos, skid tubes, a brace ---------- */
  function drawGear(ctx){
    const items = [], deg = gearPose(ctx.st).deg;
    for (const s of [1, -1]){
      const th = rad(s * deg), c = Math.cos(th), sn = Math.sin(th);
      const turn = ([x, y, z]) => { const dy = y - s * HY, dz = z - HZ; return [x, s * HY + dy * c - dz * sn, HZ + dy * sn + dz * c]; };
      for (const sx of [1, -1]){
        items.push(g.box(sx * HX - 22, s * HY - 16, HZ - 10, sx * HX + 22, s * HY + 16, PZ, 'dark', .9));
        items.push(...g.rod(turn([sx * HX, s * HY, HZ - 4]), turn([sx * FOOT_X, s * FOOT_Y, SKID_R * 2]), 9, 'carbon', 60, 12));
      }
      items.push(...g.rod(turn([-280, s * FOOT_Y, SKID_R]), turn([280, s * FOOT_Y, SKID_R]), SKID_R, 'carbon', 60, 14));
      for (const sx of [1, -1]) items.push(...g.rod(turn([sx * 280, s * FOOT_Y, SKID_R]), turn([sx * 294, s * FOOT_Y, SKID_R]), SKID_R + 1.5, 'black', 20, 12));
      items.push(...g.rod(turn([-150, s * 212, 205]), turn([150, s * 212, 205]), 6, 'carbon', 60, 10));
      if (!deg) ctx.shadows.push([[-280, s * FOOT_Y - SKID_R], [280, s * FOOT_Y - SKID_R], [280, s * FOOT_Y + SKID_R], [-280, s * FOOT_Y + SKID_R]].map(([x, y]) => W(x, y, SKID_R * 2)));
    }
    const p = gearPose(ctx.st);
    if (p.phase){
      const text = p.phase === 'stand' ? MSG.stand : p.phase === 'up' ? MSG.gearUp
        : p.phase === 'clear' ? MSG.gearClear : p.phase === 'down' ? MSG.gearDown : MSG.gearDone;
      items.push(pillAt([0, 0, 840], text, '#fff4d6'));
    }
    return items;
  }

  /* ---------- ESC: an 80 A ESC on top of each tube, under the prop, cooled by its wash ---------- */
  function drawEscs(ctx){
    return ctx.craft.motors.map(mo => {
      const it = armBlock(mo, ESC_R, TUBE_Z + TUBE_R + 8.5, 40, 20, 8.5, '#f08a2b');
      const [x, y] = along(mo, ESC_R, 0, 0);
      it.svg += g.text(x, y, TUBE_Z + TUBE_R + 17.2, '80A', 13, '#2c2926');
      return it;
    });
  }

  /* ---------- WIRES: per arm the 12 AWG pair and the signal lead out over the fold joint, three phases to the motor ---------- */
  function drawWires(ctx){
    const items = [], zt = TUBE_Z + TUBE_R + 2;
    ctx.craft.motors.forEach((mo, i) => {
      // out between the plates, a slack loop over the fold joint so the arm can fold, then along the tube to the ESC
      for (const [col, o] of [['#d8473a', -7], ['#2c2926', 7]]){
        const run = [along(mo, 95, o, BP1 + 3), along(mo, 196, o, zt), along(mo, 236, o, zt + 30), along(mo, 290, o, zt), along(mo, ESC_R - 40, o, zt)];
        items.push(...g.wire(run, col, 6, 40));
        if (o < 0) flow(ctx, 'power', run);
      }
      const sig = [along(mo, 60, 0, TP1 + 30), along(mo, 168, 0, TP1 + 6), along(mo, 236, 0, zt + 36), along(mo, 290, 0, zt + 2), along(mo, ESC_R - 40, 0, zt + 4)];
      items.push(...g.wire(sig, '#f2efe7', 2.6, 40));
      flow(ctx, 'signal', sig);
      [-8, 0, 8].forEach(o => {
        const ph = [along(mo, ESC_R + 40, o * .6, zt + 4), along(mo, ESC_R + 70, o, zt), along(mo, R - 44, o, zt), along(mo, R - 36, o * .5, MOUNT_Z + 4)];
        items.push(...g.wire(ph, '#33302c', 4, 40));
        flow(ctx, 'phase', ph, { motor: i });
      });
    });
    return items;
  }

  /* ---------- FC: the pre-arm pill over the Pixhawk while the checks run ---------- */
  function fcPill(ctx){
    const t = ctx.st.test;
    if (!t || t.kind !== 'prearm') return [];
    const done = t.t > t.dur * .55, at = [0, 0, 840];
    return [!done ? pillAt(at, MSG.checking, '#fff4d6') : !t.fail ? pillAt(at, MSG.armed, '#d6f0dc')
      : pillAt(at, t.fail === MSG.noFix ? MSG.noFixPill : MSG.noAccPill, '#e2483d', '#ffffff')];
  }

  /* ---------- RX: the ELRS receiver and the 900 MHz telemetry radio under the bottom plate, antennas down ---------- */
  function rxLeads(ctx){
    const items = [];
    for (const [y, col] of [[85, '#43a35a'], [-85, '#8c4bd1']]){
      const lead = [[-40, y * .8, PZ - 2], [-20, y * .6, PZ - 1], [0, y * .3, PZ - 1]];
      items.push(...g.wire(lead, col, 2.4, 30));
      flow(ctx, 'signal', lead.slice().reverse());
    }
    return items;
  }

  /* ---------- GPS: two GNSS + compass pucks on masts behind the tray ---------- */
  function drawGps(ctx){
    const items = [], st = ctx.st, t = st.test, fix = st.passes && st.passes.gps;
    [1, -1].forEach((s, i) => {
      const y = s * MAST_Y;
      items.push(g.box(MAST_X - 16, y - 16, TP1, MAST_X + 16, y + 16, TP1 + 10, 'dark', .9));
      items.push(...g.rod([MAST_X, y, TP1 + 10], [MAST_X, y, PUCK_Z], 6, 'carbon', 60, 10));
      const puck = g.cyl(MAST_X, y, PUCK_Z, PUCK_Z + 16, 44, '#2c2926', 24, 1.1);
      puck.svg += g.arrow(MAST_X + 6, y, PUCK_Z + 16.1, 40, 1, '#f2efe7');
      puck.svg += g.text(MAST_X - 24, y, PUCK_Z + 16.1, i ? 'GPS2' : 'GPS1', 11, '#f2efe7', 'y');
      if (ctx.powered) puck.svg += g.led(MAST_X + 26, y + 24, PUCK_Z + 16.2, fix ? '#43c25c' : '#4aa3ff', Math.sin(st.t * 6) > 0, 4);
      items.push(puck);
      const lead = [[MAST_X + 7, y, PUCK_Z - 4], [MAST_X + 7, y, TP1 + 12], [-60, y * .4, TP1 + 24], [-40, y * .2, TP1 + 24]];
      items.push(...g.wire(lead, '#c9c4b8', 2.6, 40));
      flow(ctx, 'signal', lead);
    });
    if (t && t.kind === 'gps'){
      const u = Math.min(1, t.t / t.dur), n1 = Math.round(16 * u), n2 = Math.round(15 * Math.max(0, u * 1.1 - .1));
      const text = u < .85 ? { key: MSG.gpsSats, vars: { a: n1, b: n2 } } : MSG.gpsFix;
      items.push(pillAt([MAST_X, 0, PUCK_Z + 130], text, u < .85 ? '#fff4d6' : '#d6f0dc'));
    }
    return items;
  }

  /* ---------- GIMBAL: damper plate, yaw motor, the arm down the back, roll motor, the cradle and the tilt motor ---------- */
  function drawGimbal(ctx){
    const items = [];
    items.push(g.box(50, -55, PZ - 6, 150, 55, PZ, 'dark', .9));
    for (const x of [62, 138]) for (const y of [-43, 43]) items.push(g.cyl(x, y, PZ - 16, PZ - 6, 6, 'black', 10, .7));
    items.push(g.box(50, -55, PZ - 22, 150, 55, PZ - 16, 'dark', .9));
    const yaw = g.cyl(100, 0, 340, PZ - 22, 30, '#3a3734', 20);
    yaw.svg += g.disc(100, 0, PZ - 21.9, 10, 'metal', 12);
    items.push(yaw);
    items.push(g.box(-100, -12, 326, 116, 12, 340, 'dark', .9));
    items.push(g.box(-100, -12, 268, -76, 12, 326, 'dark', .9));
    items.push(...g.rod([-102, 0, 240], [-72, 0, 240], 30, '#3a3734', 40, 20));
    items.push(g.box(-72, -112, 228, -56, 112, 252, 'dark', .9));
    for (const s of [1, -1]) items.push(g.box(-56, s > 0 ? 100 : -112, 228, 72, s > 0 ? 112 : -100, 252, 'dark', .9));
    items.push(...g.rod([60, -112, 240], [60, -138, 240], 30, '#3a3734', 40, 20));
    items.push(...g.rod([60, 112, 240], [60, 124, 240], 16, 'metal', 40, 14));
    const lead = [[-30, 0, PZ - 1], [60, 0, PZ - 1], [100, -30, PZ - 22]];
    flow(ctx, 'signal', lead);
    return items;
  }

  /* ---------- CAM: the cinema camera and its lens, balanced on the tilt axis ---------- */
  function drawCam(ctx){
    const items = [];
    const body = g.box(-30, -62, 178, 150, 62, 303, '#2c2926', 1.1);
    body.svg += g.text(60, 0, 303.1, 'CINEMA 6K', 16, '#d9d3c6');
    body.svg += g.led(130, 40, 303.2, '#e2483d', ctx.powered && Math.sin(ctx.st.t * 4) > 0, 4);
    items.push(body);
    items.push(g.box(0, 62, 200, 120, 64, 280, '#d8473a', .8));
    items.push(...g.rod([150, 0, 240], [262, 0, 240], 44, 'black', 30, 22));
    items.push(...g.rod([262, 0, 240], [282, 0, 240], 52, '#3a3734', 30, 22));
    items.push(...g.rod([110, 0, 303], [110, 0, 318], 8, 'dark', 20, 10));
    items.push(g.box(40, -14, 318, 130, 14, 326, 'dark', .9));
    ctx.shadows.push([[-30, -62], [282, -62], [282, 62], [-30, 62]].map(([x, y]) => W(x, y, 303)));
    return items;
  }

  /* ---------- TOP: the battery tray on four posts over the Pixhawk ---------- */
  function drawTray(ctx){
    const items = [];
    for (const x of [-100, 100]) for (const y of [-100, 100]) items.push(g.cyl(x, y, TP1, TRAY_Z, 6, 'alu', 10, .8));
    items.push(g.plate(SD.rrect(240, 230, 14, 3), TRAY_Z, 4, 'carbon'));
    ctx.shadows.push(SD.rrect(240, 230, 14, 2).map(([x, y]) => W(x, y, TRAY_Z + 4)));
    return items;
  }

  /* ---------- BATT: two 6S packs side by side in series (12S), or one 6S pack ---------- */
  function drawPacks(ctx){
    const b = ctx.design.batt, [l, w, h] = b.size, two = b.cells === 12, z0 = TRAY_Z + 4, items = [];
    const ys = two ? [w / 2 + 3, -w / 2 - 3] : [0];
    items.push(g.box(-l * .44, -(two ? w + 3 : w / 2) + 4, z0, l * .44, (two ? w + 3 : w / 2) - 4, z0 + 2, '#8a8580', .6));
    for (const y of ys){
      const it = g.box(-l / 2, y - w / 2, z0 + 2, l / 2, y + w / 2, z0 + 2 + h, b.color || '#2b2a28', 1.1);
      it.svg += g.text(-l * .14, y, z0 + 2 + h + .1, b.label || '', 17, '#f2efe7');
      it.svg += g.text(l * .3, y, z0 + 2 + h + .1, '22.2 V', 14, '#e2b33a');
      items.push(it);
      ctx.shadows.push([[-l / 2, y - w / 2], [l / 2, y - w / 2], [l / 2, y + w / 2], [-l / 2, y + w / 2]].map(([x, yy]) => W(x, yy, z0 + 2 + h)));
    }
    const half = two ? w + 4 : w / 2 + 1;
    for (const x of [-l * .25, l * .25]){
      items.push(g.box(x - 12, -half, z0 + 2 + h, x + 12, half, z0 + 3 + h, '#5b6478', .7));
      for (const s of [-1, 1]) items.push(g.box(x - 12, s > 0 ? half - 1 : -half, z0, x + 12, s > 0 ? half : -half + 1, z0 + 2 + h, '#5b6478', .7));
    }
    // the series link at the front: the right pack's plus to the left pack's minus
    if (two) items.push(...g.wire([[l / 2 + 1, -w * .3, z0 + h * .7], [l / 2 + 22, -10, z0 + h * .6], [l / 2 + 22, 10, z0 + h * .6], [l / 2 + 1, w * .3, z0 + h * .7]], '#d8473a', 6, 30));
    if (ctx.st.plugged){
      const t = XT90;
      for (const [col, o] of [['#d8473a', 6], ['#2c2926', -6]]){
        const run = [[-l / 2 - 1, (two ? ys[0] * .4 : 0) + o, z0 + h * .6], [-l / 2 - 30, o, z0 + 10], [t[0] + 20, t[1] + o, t[2] + 20], [t[0] + 16, t[1] + o, t[2]]];
        items.push(...g.wire(run, col, 6, 30));
        if (o > 0) flow(ctx, 'power', run);
      }
      items.push(g.box(t[0] + 11, t[1] - 13, t[2] - 5.5, t[0] + 30, t[1] + 13, t[2] + 5.5, 'yellow', .9));
    }
    return items;
  }

  SD.define({
    id: 'octo', fig: '13', title: 'Heavy-lift cinema octocopter', palette: 'cobalt',
    mat: 2100, height: 820, explode: 40, log: 'ArduCopter 4.7', arrowZ: 120,
    calLabel: 'Calibrate accelerometer',
    bounds: [-230, 290, -220, 220, 170, 680],
    xrCaption: 'See-through: the battery tray, the packs and the camera fade so the Pixhawk, the power board and the wiring show.',
    messages: {
      live: 'Unplug the packs first: never work on a live 44 V craft',
      plugNeeds: 'Fit the power board and put the packs on the tray first',
      smokeNeeds: 'Fit the power board and the ESCs first',
      pop: 'POP: the power board’s capacitor was in backwards and vented. A current-limited first plug-in would have caught it. Unplug and fit a new 63 V one, stripe to minus',
      powered: 'The Pixhawk 6X boots and the eight ESCs chime. GPS LEDs flash blue: no fix yet',
      smokeShort: 'The smoke stopper lamp is lit: something is shorted. The capacitor is in backwards: turn it round before the packs go in',
      smokeOk: 'No short: the lamp only flickered. Safe to plug in the 12S packs',
      motorNeeds: 'Wire the arms and fit the Pixhawk first',
      motorWrong: '{m} spun the wrong way: swap two of its three motor wires (a PWM ESC cannot reverse it in software). All eight spin right now',
      calNeeds: 'Fit the Pixhawk first',
      calBack: 'Calibrated, but the Pixhawk’s arrow points backwards: it flips on take-off unless AHRS_ORIENTATION says so',
      calOk: 'Accelerometer calibrated: six positions with the props off, then Calibrate Level on its legs',
    },
    logs: {
      smoke: '$ first plug-in through a current limiter rated for 12S...',
      motors: '$ Motor Test, props off, 10 %: {list} one at a time, A to H',
      reversed: '{m}: two motor wires swapped',
      calBack: 'accel calibrated (but AHRS_ORIENTATION does not match the Pixhawk!)',
      calOk: '$ accelcal: 6 positions done, then level',
    },
    frame: {
      layout: 'octo-x', wheelbase: 2 * R, numbering: 'ardupilot',
      motors: [
        { id: 'M1', at: [C22, -S22], dir: 'CW' },
        { id: 'M3', at: [S22, -C22], dir: 'CCW' },
        { id: 'M8', at: [-S22, -C22], dir: 'CW' },
        { id: 'M4', at: [-C22, -S22], dir: 'CCW' },
        { id: 'M2', at: [-C22, S22], dir: 'CW' },
        { id: 'M6', at: [-S22, C22], dir: 'CCW' },
        { id: 'M7', at: [S22, C22], dir: 'CW' },
        { id: 'M5', at: [C22, S22], dir: 'CCW' },
      ],
      arm: { w: 32, t: 32 }, plate: { l: 400, w: 400, t: 6, z: PZ, r: 0 }, motorZ: MOUNT_Z,
    },
    design: {
      default: { batt: '12s16000', motor: '6010-170', prop: '2055' },
      batts: {
        '12s16000': { cells: 12, mah: 16000, size: [200, 88, 66], color: '#2b2a28', label: '6S 16000' },
        '12s22000': { cells: 12, mah: 22000, size: [215, 95, 78], color: '#2f5fa8', label: '6S 22000' },
        '6s16000': { cells: 6, mah: 16000, size: [200, 88, 66], color: '#d9a520', label: '6S 16000' },
      },
      motors: {
        '6010-170': { stator: [60, 10], bell: [69, 35], kv: 170, label: '6010 170KV' },
        '6010-130': { stator: [60, 10], bell: [69, 35], kv: 130, label: '6010 130KV' },
        '6215-230': { stator: [62, 15], bell: [70, 40], kv: 230, label: '6215 230KV' },
      },
      props: {
        '2055': { d: 20, pitch: 5.5, blades: 2, color: '#2c2926', label: '20x5.5' },
        '1855': { d: 18, pitch: 5.5, blades: 2, color: '#5b5650', label: '18x5.5' },
        '2255': { d: 22, pitch: 5.5, blades: 2, color: '#8a5a3a', label: '22x5.5' },
      },
    },
    parts: [
      { id: 'FRAME', short: 'FRAME', name: 'Two octagonal carbon plates and eight folding 32 mm arms', z: 3,
        piece: { kind: 'custom', draw: drawFrame }, tag: { at: [C22, -S22 - 120, TUBE_Z], dx: 60, dy: 40 },
        xr: [{ at: [(HINGE0 + HINGE1) / 2 * Math.cos(rad(-67.5)), (HINGE0 + HINGE1) / 2 * Math.sin(rad(-67.5)), TUBE_Z + 24], text: 'FOLD JOINT: PULL EVERY ARM BEFORE FLIGHT' }] },
      { id: 'GEAR', short: 'LANDING GEAR', name: 'Retractable legs on two servos, skid tubes', after: ['FRAME'], z: 0,
        piece: { kind: 'custom', draw: drawGear }, tag: { at: [-280, -FOOT_Y, SKID_R * 2], dx: -60, dy: 40 },
        xr: [{ at: [HX, -HY, HZ - 10], text: 'RETRACT SERVO ON AUX 1 (SERVO9 = 29)' }] },
      { id: 'MOTORS', short: 'MOTORS', name: '8 × 6010 170 KV motors', after: ['FRAME'], z: 6,
        piece: { kind: 'motors', color: 'pal' }, tag: { at: [C22, S22, MOUNT_Z + 40], dx: 40, dy: -40 } },
      { id: 'ESC', short: 'ESCs', name: '8 × 80 A ESCs on the arms (PWM)', after: ['FRAME'], z: 5,
        piece: { kind: 'custom', draw: drawEscs }, tag: { at: [-ESC_R * Math.cos(rad(22.5)), -ESC_R * Math.sin(rad(22.5)), TUBE_Z + 34], dx: -50, dy: 50 } },
      { id: 'WIRES', short: 'WIRING', name: 'Power, signal and motor wires along each arm', after: ['MOTORS', 'ESC'], z: 5.5,
        piece: { kind: 'custom', draw: drawWires }, tag: { at: [-300, 300, TUBE_Z + 40], dx: -40, dy: -50 },
        xr: [{ at: [236 * Math.cos(rad(157.5)), 236 * Math.sin(rad(157.5)), TUBE_Z + 50], text: 'SLACK OVER THE FOLD JOINT' }] },
      { id: 'XT60', short: 'POWER BOARD', name: '12S power board, 63 V capacitor, PM02D power module, XT90-S', after: ['ESC'], z: 4,
        polar: ['stripe to minus', 'stripe to plus'],
        piece: [
          { kind: 'board', at: [0, 0, BP1], size: [160, 160], t: 2, color: 'pcb', label: 'PDB 12S', labelAt: [-30, -55],
            pads: [{ at: [62, 62], size: [18, 14] }, { at: [62, -62], size: [18, 14] }, { at: [-62, 62], size: [18, 14] }, { at: [-62, -62], size: [18, 14] }] },
          { kind: 'module', at: [-50, 45, BP1 + 2], size: [40, 26, 12], color: 'pcbBlue', label: 'PM02D', labelSize: .24 },
          { kind: 'xt60', at: XT90, dir: [-1, 0, 0], size: [21, 26, 11],
            lead: [[-40, 0, BP1 + 4], [-120, 0, BP1 + 14], [-196, 0, TUBE_Z], [-196, 0, TP1 + 8], [-176, 0, XT90[2]]],
            cap: { at: [40, -45, BP1 + 2], dir: [0, 0, 1], r: 11, l: 34, stripe: [0, -1, 0] } },
        ],
        tag: { at: [XT90[0], 0, XT90[2] + 10], dx: -70, dy: -30 },
        xr: [{ at: [40, -45, BP1 + 38], text: '1000 µF 63 V: STRIPE TO MINUS' }, { at: [-50, 45, BP1 + 14], text: 'PM02D HV → POWER1' }] },
      { id: 'FC', short: 'PIXHAWK 6X', name: 'Pixhawk 6X on vibration dampers', after: ['XT60'], z: 7,
        polar: ['arrow forward', 'arrow backward'],
        piece: [
          { kind: 'standoffs', at: [[40, 20], [40, -20], [-40, 20], [-40, -20]], z0: TP1, z1: TP1 + 8, r: 6, color: '#3d3b39', split: 8 },
          { kind: 'box', at: [0, 0, TP1 + 8], size: [103.4, 52.4, 16.7], color: 'black' },
          { kind: 'board', at: [12, 0, TP1 + 24.7], size: [38.8, 31.8], t: 14.6, color: '#4a4d52', arrow: true, label: '6X', labelAt: [-12, 0], led: '#43c25c', ledAt: [14, 11] },
          { kind: 'custom', draw: fcPill },
        ],
        tag: { at: [0, 0, TP1 + 40], dx: 90, dy: -50 },
        xr: [{ at: [12, 0, TP1 + 40], text: 'STM32H753 · 3 IMUS · MAIN OUT 1-8 = MOTORS' }] },
      { id: 'RX', short: 'RC + TELEMETRY', name: 'ELRS receiver and 900 MHz telemetry radio', after: ['FC'], z: 1.5,
        piece: [
          { kind: 'module', at: [-40, 85, PZ - 6], size: [24, 14, 6], color: 'pcbBlack', label: 'ELRS', labelSize: .26, led: '#43c463',
            antenna: { at: [-40, 92, PZ - 6], type: 't', dir: [0, .35, -.94], len: 46, spread: 45 } },
          { kind: 'module', at: [-40, -85, PZ - 14], size: [57, 30, 14], color: 'pcbBlue', label: '900', labelSize: .3, led: '#43c25c',
            antenna: { at: [-40, -100, PZ - 10], type: 'whip', dir: [-.15, -.45, -.88], len: 150, r: 4, color: 'black' } },
          { kind: 'custom', draw: rxLeads },
        ],
        tag: { at: [-40, -85, PZ - 14], dx: -60, dy: 40 },
        xr: [{ at: [-40, 85, PZ - 6], text: 'ELRS ON UART4 (SERIAL6 = 23)' }, { at: [-40, -85, PZ - 14], text: 'TELEMETRY ON TELEM1, MAVLINK2' }] },
      { id: 'GPS', short: 'GPS MASTS', name: 'Two GPS + compass modules on masts', after: ['FC'], z: 9,
        piece: { kind: 'custom', draw: drawGps }, tag: { at: [MAST_X, -MAST_Y, PUCK_Z + 16], dx: -60, dy: -30 },
        xr: [{ at: [MAST_X, MAST_Y, PUCK_Z + 16], text: 'GPS1 + GPS2: UP AND AWAY FROM THE 12S LEADS' }] },
      { id: 'TOP', short: 'BATTERY TRAY', name: 'Battery tray on four posts', after: ['FC'], z: 8, cover: true,
        piece: { kind: 'custom', draw: drawTray }, tag: { at: [110, -100, TRAY_Z + 4], dx: 60, dy: -20 } },
      { id: 'GIMBAL', short: 'GIMBAL', name: '3-axis brushless gimbal', after: ['FRAME', 'GEAR'], z: 1,
        piece: { kind: 'custom', draw: drawGimbal }, tag: { at: [60, -138, 240], dx: 60, dy: 30 },
        xr: [{ at: [100, 0, 340], text: 'MNT1_TYPE 6: MAVLINK ON TELEM2' }] },
      { id: 'CAM', short: 'CINEMA CAMERA', name: 'Cinema camera and lens (the payload)', after: ['GIMBAL'], z: .5, cover: true,
        piece: { kind: 'custom', draw: drawCam }, tag: { at: [282, 0, 240], dx: 60, dy: 20 },
        xr: [{ at: [60, -62, 240], text: 'BALANCED ON THE TILT AXIS BEFORE POWER-UP' }] },
      { id: 'BATT', short: '12S BATTERY', name: 'Two 6S packs in series on the tray', after: ['TOP', 'XT60'], z: 10, cover: true,
        piece: { kind: 'custom', draw: drawPacks }, tag: { at: [60, 100, TRAY_Z + 74], dx: 40, dy: -50 },
        xr: [{ at: [110, 0, TRAY_Z + 50], text: 'TWO 6S IN SERIES: 44.4 V' }] },
      { id: 'PROPS', short: 'PROPS', name: '8 folding carbon props, alternating spin', after: ['MOTORS', 'BATT'], z: 11,
        polar: ['CW/CCW alternating (correct)', 'swapped CW/CCW'],
        piece: { kind: 'props' }, tag: { at: [C22 + 200, -S22, MOUNT_Z + 50], dx: 40, dy: -30 } },
    ],
    tests: {
      smoke: { needs: ['XT60', 'ESC'], at: [-880, 760] },
      motors: { needs: ['WIRES', 'FC'] },
      calibrate: { needs: ['FC'] },
      plug: { needs: ['BATT', 'XT60'] },
    },
    buttons: [
      { id: 'gear', label: 'Landing gear test', onClick: gearTest },
      { id: 'gps', label: 'GPS check (both receivers)', onClick: gpsTest },
      { id: 'prearm', label: 'Pre-arm checks', onClick: prearmTest },
    ],
    // the craft's own tests run on st.test, so the engine keeps drawing until they end; the pre-arm pill reads it too
    inside: [
      { at: [0, 0, TP1 + 30], text: 'MOTOR OUT: THE MIXER SPREADS ITS LIFT OVER THE OTHER SEVEN', part: 'FC' },
    ],
    wiring: {
      nodes: {
        GIMBAL: { at: [205, 22], title: 'GIMBAL + CAMERA', sub: '3-axis, 3.7 kg', color: '#43a35a' },
        RX: { at: [405, 22], title: 'RC + TELEMETRY', sub: 'ELRS + 900 MHz', color: '#8c4bd1', led: '#43c25c' },
        GPS: { at: [10, 145], title: 'GPS + COMPASS ×2', sub: 'on masts', color: '#43a35a', led: '#4aa3ff' },
        FC: { at: [405, 145], title: 'PIXHAWK 6X', sub: 'ArduCopter 4.7.2', color: '#3e86d9', led: '#43c25c' },
        GEAR: { at: [600, 145], title: 'LANDING GEAR', sub: '2 retract servos', color: '#43a35a' },
        BATT: { at: [10, 268], title: '2 × 6S, SERIES', sub: 'batt', color: 'tomato' },
        XT60: { at: [205, 268], title: 'POWER BOARD', sub: 'XT90-S, 63 V cap', color: 'tomato' },
        ESC: { at: [405, 268], title: 'ESCS ×8', sub: '80 A, PWM', color: '#f08a2b' },
        MOTORS: { at: [600, 268], title: 'MOTORS ×8', sub: 'motor', color: '#f08a2b' },
      },
      edges: [
        { from: 'BATT', to: 'XT60', kind: 'power', n: 2, label: '44.4 V' },
        { from: 'XT60', to: 'ESC', kind: 'power', n: 2, label: 'VBAT ×8' },
        { from: 'ESC', to: 'MOTORS', kind: 'phase', n: 3, label: '3-phase ×8' },
        { from: 'XT60', to: 'FC', kind: 'power', label: 'PM02D → POWER1', a: [300, 268], via: [[300, 212], [430, 212]], b: [430, 201], labelAt: [-40, 18] },
        { from: 'FC', to: 'ESC', kind: 'signal', label: 'MAIN OUT 1-8 · PWM', a: [500, 201], via: [[500, 240], [480, 240]], b: [480, 268], labelAt: [20, -2] },
        { from: 'FC', to: 'GEAR', kind: 'signal', label: 'AUX 1' },
        { from: 'GPS', to: 'FC', kind: 'signal', label: 'GPS1 + GPS2' },
        { from: 'RX', to: 'FC', kind: 'signal', label: 'UART4 + TELEM1', labelAt: [44, 0] },
        { from: 'FC', to: 'GIMBAL', kind: 'signal', label: 'TELEM2 · MAVLink', a: [430, 145], via: [[430, 104], [280, 104]], b: [280, 78], labelAt: [0, -8] },
      ],
    },
  });
})();
