// @cf title Agricultural spray hexacopter
// @cf use engine/drone.js
// @cf use engine/drone-geo.js
// @cf use engine/drone-frames.js
// @cf use engine/drone-pieces.js
// @cf use engine/drone-sheet.js
/* Fig. 08, the 10 L agricultural spray hexacopter on ArduPilot Copter 4.7.2. Facts: docs/facts/agrihex.md.
   An 1800 mm Hexa X (motors 900 mm from the centre) on six folding 35 mm carbon-tube arms with a locking sleeve at
   r = 300 mm, a 480 x 420 mm hub on four legs and two 940 mm skids, six 8120 100 KV motors with their 80 A ESC pods
   under the motor mounts (Hobbywing X8 class), a Cube Orange+ under the canopy, a dual-antenna RTK GNSS pair on two
   masts 340 mm apart (moving-baseline GPS yaw), a downward radar at the nose, a 10 L tank under the hub with the
   diaphragm pump behind it and a 1640 mm boom with four nozzles. Craft-local mm: x forward, y left, z up, z = 0 on
   the mat (the facts' skid tubes at z = -482 sit on it here). The motors are listed in Mission Planner's Motor Test
   order, clockwise from the front right (A = M5, B = M1, C = M4, D = M6, E = M2, F = M3). */
(() => {
  const SD = SL.drone, gg = SD.g, Wp = SD.W;
  const TAU = Math.PI * 2;
  const R = 900, RX = R * Math.sqrt(3) / 2;  // 779.42 mm: the four diagonal motors' x
  const SKID_R = 12, SKID_Z = SKID_R;
  const HUB0 = 470, HUB1 = 490;               // 20 mm carbon sandwich hub plate
  const TUBE_R = 17.5, TUBE_Z = HUB1 + TUBE_R; // 35 mm arm tubes (the X8 clamps 35 or 40 mm) lying on the hub
  const MOUNT_Z = TUBE_Z + 24;                // 529: motor mount face on the arm-end clamp
  const SLEEVE_R = 300;                       // fold joint and its locking sleeve
  const CANOPY = [[0, 50, 460, 400, 60], [50, 95, 440, 380, 70], [95, 120, 410, 350, 80], [120, 130, 380, 320, 80]];
  const TOPZ = HUB1 + 130;                    // 620: canopy top
  const MAST_X = 170, MAST_Y = 150, MAST_H = 200, ANT_Z = TOPZ + MAST_H;
  const TANK = { x: 160, y: 130, z0: 130, z1: 462 };  // 320 x 260 x 332 mm: 10 L with room for the baffles
  const BOOM_Z = 100, NOZZLES = [-720, -300, 300, 720];
  const PUMP_X = -232;

  const dirOf = mo => [Math.cos(mo.ang), Math.sin(mo.ang)];
  const along = (mo, r, side, z) => { const [ux, uy] = dirOf(mo); return [ux * r - uy * side, uy * r + ux * side, z]; };
  const armBlock = (mo, r, z, hl, hw, hh, col) => {
    const [ux, uy] = dirOf(mo);
    return gg.oblock([ux * r, uy * r, z], [ux, uy, 0], [-uy, ux, 0], [0, 0, 1], hl, hw, hh, col);
  };
  const flow = (ctx, kind, pts) => ctx.flows.push({ kind, pts: pts.map(p => Wp(...p)) });

  /* ---------- the craft's own bench checks: pump, RTK and GPS yaw, pre-arm ---------- */
  // A check is passed when its run has finished and the parts it ran on are still the same fitted parts the same
  // way round (taking a part off, re-seating it or turning it makes a fresh part object or orientation).
  const fresh = (() => { try { return /[?&]fresh=1(&|$)/.test(location.search); } catch (e) { return false; } })();
  const NEEDS = { pump: ['FC', 'TANK', 'PUMP', 'BOOM'], gpsyaw: ['FC', 'GPS', 'RX'], prearm: ['FC', 'GPS', 'RX', 'RADAR'] };
  const stamp = (st, ids) => ids.map(id => [id, st.placed[id] || null, st.placed[id] ? st.placed[id].orient : -1]);
  const still = (st, s) => !!s && s.every(([id, p, o]) => p && st.placed[id] === p && !p.leave && p.orient === o);
  const xs = st => {
    if (!st.ag) {
      st.ag = { run: null, ok: {} };
      if (!fresh) for (const k of Object.keys(NEEDS)) st.ag.ok[k] = { end: 0, parts: stamp(st, NEEDS[k]), good: true };
    }
    return st.ag;
  };
  // `good` is false for a run that finished with a fault (GPS yaw 180° out), so it never counts as passed
  const passed = (st, k) => { const r = xs(st).ok[k]; return !!r && r.good && st.t >= r.end && still(st, r.parts); };
  const running = st => { const r = xs(st).run; return r && st.t < r.end ? r : null; };
  const progress = (st, r) => r ? Math.max(0, Math.min(1, (st.t - r.t0) / (r.end - r.t0))) : 0;
  const swapped = st => !!st.placed.GPS && !st.placed.GPS.leave && st.placed.GPS.orient === 1;

  function begin(api, kind, dur, endText, good = true, sound = 'ding'){
    const st = api.st, x = xs(st);
    x.run = { kind, t0: st.t, end: st.t + dur };
    x.ok[kind] = { end: st.t + dur, parts: stamp(st, NEEDS[kind]), good };
    st.later.push({ t: dur, say: endText, sfx: sound });
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
    { id: 'pump', label: 'Pump test (disarmed)', onClick: api => {
      if (blocked(api) || need(api, NEEDS.pump, 'Fit the Cube, the tank, the pump and the boom first')) return;
      if (live(api, 'Plug in the battery: the pump driver runs from the 12S bus')) return;
      api.log('$ sprayer switch (RC7) high while disarmed: pump test');
      api.log('pump at SPRAY_PUMP_RATE 10 %, the 1 m/s rate: 0.3 L/min of clean water');
      begin(api, 'pump', 4, 'Pump ok: all four nozzles spray at the 1 m/s rate. Catch it in a jug for a minute to calibrate the dose');
      api.sfx('spin');
    } },
    { id: 'gpsyaw', label: 'RTK fix and GPS yaw', onClick: api => {
      if (blocked(api) || need(api, NEEDS.gpsyaw, 'Fit the Cube, the RTK masts and the radio first: the RTK corrections come over the radio')) return;
      if (live(api, 'Plug in the battery: the GPS receivers need the Cube powered')) return;
      const bad = swapped(api.st);
      api.log('GPS 1: u-blox F9P on GPS1, moving-baseline base');
      api.log('GPS 2: u-blox F9P on GPS2, moving-baseline rover');
      begin(api, 'gpsyaw', 5, bad
        ? 'GPS yaw reads 180° from the nose: the base antenna is at the back. EKF3 Yaw inconsistent. Swap the masts so GPS1 is in front, as GPS1_POS_X says'
        : 'GPS 1 and GPS 2: RTK Fixed. GPS yaw matches the nose heading, so no compass is needed', !bad, bad ? 'buzz' : 'ding');
      api.sfx('click');
    } },
    { id: 'prearm', label: 'Pre-arm checks', onClick: api => {
      if (blocked(api) || need(api, ['FC'], 'Fit the Cube first: it runs the pre-arm checks')) return;
      if (live(api, 'Plug in the battery: the pre-arm checks run on a powered autopilot')) return;
      const st = api.st;
      const fail = !api.isOn('RADAR') ? 'PreArm: Rangefinder 1: No Data'
        : !api.isOn('GPS') || !api.isOn('RX') || !passed(st, 'gpsyaw') ? (swapped(st) ? 'PreArm: EKF3 Yaw inconsistent' : 'PreArm: GPS 1: Need 3D Fix')
        : !st.accOk ? 'PreArm: 3D Accel calibration needed'
        : null;
      api.log('$ arm throttle: running the pre-arm checks (ARMING_SKIPCHK 0)');
      if (fail) { api.log(fail); return api.say(fail, 3000, 'buzz'); }
      begin(api, 'prearm', 1.5, 'Pre-arm checks pass: RTK fixed, GPS yaw good, radar reading, accelerometers calibrated. Ready to arm');
    } },
  ];

  function report(st){
    const r = running(st), y = xs(st).ok.gpsyaw;
    return {
      pumpOk: passed(st, 'pump'), yawOk: passed(st, 'gpsyaw'),
      yawErr: y && st.t >= y.end && still(st, y.parts) ? (y.good ? 0 : 180) : null,
      prearmOk: passed(st, 'prearm'), run: r ? r.kind : null,
    };
  }

  /* ---------- drawings ---------- */
  function frame(ctx){
    const out = [];
    out.push(gg.plate(SD.rrect(480, 420, 30), HUB0, HUB1 - HUB0, 'carbon'));
    for (const mo of ctx.craft.motors){
      const end = mo.r - 30;
      out.push(...gg.rod(along(mo, 200, 0, TUBE_Z), along(mo, SLEEVE_R - 32, 0, TUBE_Z), TUBE_R, 'carbon', 100));
      out.push(...gg.rod(along(mo, SLEEVE_R + 32, 0, TUBE_Z), along(mo, end, 0, TUBE_Z), TUBE_R, 'carbon', 100));
      out.push(armBlock(mo, SLEEVE_R, TUBE_Z, 32, 23, 23, 'pal'));                 // fold joint, locking sleeve
      out.push(armBlock(mo, SLEEVE_R + 22, TUBE_Z, 6, 24.5, 24.5, 'dark'));       // its lock ring
      out.push(armBlock(mo, mo.r, TUBE_Z, 46, 27, 23, 'dark'));                   // arm-end clamp and motor mount
      const a = Wp(...along(mo, 200, -TUBE_R, TUBE_Z + TUBE_R)), b = Wp(...along(mo, end, -TUBE_R, TUBE_Z + TUBE_R));
      const c = Wp(...along(mo, end, TUBE_R, TUBE_Z + TUBE_R)), d = Wp(...along(mo, 200, TUBE_R, TUBE_Z + TUBE_R));
      ctx.shadows.push([a, b, c, d]);
    }
    for (const sy of [-1, 1]){
      out.push(...gg.rod([-470, sy * 420, SKID_Z], [470, sy * 420, SKID_Z], SKID_R, 'carbon', 120));
      for (const sx of [-1, 1]) out.push(...gg.rod([sx * 250, sy * 420, SKID_Z + 8], [sx * 170, sy * 150, HUB0], 10, 'carbon', 90));
      out.push(...gg.rod([-210, sy * 330, 160], [210, sy * 330, 160], 7, 'carbon', 100));  // brace between the legs
      ctx.shadows.push([[-470, sy * 420 - 12], [470, sy * 420 - 12], [470, sy * 420 + 12], [-470, sy * 420 + 12]].map(([x, y]) => Wp(x, y, SKID_Z + 12)));
    }
    ctx.shadows.push(SD.rrect(480, 420, 30, 2).map(([x, y]) => Wp(x, y, HUB1)));
    return out;
  }

  // the X8's FOC ESC sits in a finned housing under the motor mount, cooled by the prop wash
  function escs(ctx){
    return ctx.craft.motors.map(mo => {
      const it = gg.cyl(mo.x, mo.y, TUBE_Z - 92, TUBE_Z - 14, 46, '#2b2f36', 20);
      for (let i = 0; i < 6; i++){
        const a = i / 6 * TAU + .3;
        it.svg += gg.cyl(mo.x + 47 * Math.cos(a), mo.y + 47 * Math.sin(a), TUBE_Z - 86, TUBE_Z - 22, 3.5, 'metal', 6, .5).svg;
      }
      return it;
    });
  }

  // 12 AWG power pair from the PDU along each arm to its ESC, and the ESC's PWM signal lead beside it
  function armLeads(ctx){
    const out = [];
    for (const mo of ctx.craft.motors){
      const zt = TUBE_Z + TUBE_R + 1.5;
      for (const [col, o] of [['#d8473a', -6], ['#2c2926', 6]]){
        const run = [[-120 + Math.cos(mo.ang) * 40, Math.sin(mo.ang) * 40 + o, HUB1 + 4], along(mo, 210, o, zt), along(mo, mo.r - 50, o, zt)];
        out.push(...gg.wire(run, col, 7, 40));
        if (col === '#d8473a') flow(ctx, 'power', run);
      }
      const sig = [[110 + Math.cos(mo.ang) * 30, Math.sin(mo.ang) * 30, HUB1 + 14], along(mo, 230, 0, zt + 2), along(mo, mo.r - 50, 0, zt + 2)];
      out.push(...gg.wire(sig, '#f2efe7', 3, 40));
      flow(ctx, 'signal', sig);
    }
    return out;
  }

  // the canopy over the Cube, the radio and the PDU, with the operator's FPV camera in its nose
  function canopy(ctx){
    return CANOPY.map(([z0, z1, l, w, r]) => gg.plate(SD.rrect(l, w, r, 4), HUB1 + z0, z1 - z0, 'pal'));
  }

  function radar(ctx){
    const body = gg.box(160, -60, HUB0 - 70, 240, 60, HUB0, '#e7e2d6');
    const dome = gg.cyl(200, 0, HUB0 - 82, HUB0 - 70, 34, 'white', 18);
    body.svg += gg.text(200, 0, HUB0 + .5, 'RADAR', 18, '#7a7262', 'y');
    return [gg.box(150, -50, HUB0 - 4, 250, 50, HUB0, 'dark'), body, dome];
  }

  // two F9P antennas on carbon masts, 340 mm apart along x: GPS1 (moving-baseline base) in front, GPS2 behind
  function masts(ctx){
    const out = [], st = ctx.st, back = ctx.orient === 1, fix = passed(st, 'gpsyaw'), blink = Math.sin(st.t * 6) > 0;
    for (const sx of [1, -1]){
      const x = sx * MAST_X;
      out.push(gg.box(x - 22, MAST_Y - 22, TOPZ, x + 22, MAST_Y + 22, TOPZ + 12, 'dark'));
      out.push(...gg.rod([x, MAST_Y, TOPZ + 12], [x, MAST_Y, ANT_Z], 9, 'carbon', 50));
      const ant = gg.cyl(x, MAST_Y, ANT_Z, ANT_Z + 20, 42, '#ece6d6', 22);
      ant.svg += gg.text(x, MAST_Y, ANT_Z + 20.5, (sx > 0) !== back ? 'GPS1' : 'GPS2', 15, '#7a7262');
      if (ctx.powered) ant.svg += gg.led(x + 28, MAST_Y + 22, ANT_Z + 21, fix ? '#43c25c' : '#4aa3ff', blink, 5);
      out.push(ant);
      if (SD.isOn(st, 'FC')){
        const run = [[x - 10, MAST_Y - 10, TOPZ + 12], [x * .7, MAST_Y - 40, TOPZ - 30], [100, 20, HUB1 + 24]];
        out.push(...gg.wire(run, '#2c2926', 5, 40));
        flow(ctx, 'signal', run);
      }
    }
    return out;
  }

  function tank(ctx){
    const out = [], { x, y, z0, z1 } = TANK;
    const shell = gg.box(-x, -y, z0, x, y, z1, '#eef0e8');
    shell.svg += gg.text(0, 0, z1 + .5, 'TANK 10 L', 30, '#9a9284');
    out.push(shell);
    // the sight strip on the left side shows the water level for the bench test
    out.push(gg.box(-120, y, z0 + 14, 120, y + 3, z1 - 14, '#bcd6e8'));
    out.push(gg.box(-120, y + .5, z0 + 14, 120, y + 3.5, z0 + 150, '#4c8fd0'));
    out.push(gg.cyl(80, 60, z1, z1 + 4, 34, 'dark', 16));     // filler cap, reached with the canopy off
    for (const sy of [-1, 1]) out.push(gg.box(-x - 6, sy * 80 - 10, z1 - 4, x + 6, sy * 80 + 10, HUB0, 'dark'));  // straps to the hub
    return out;
  }

  function pump(ctx){
    const out = [];
    out.push(gg.box(PUMP_X - 55, -50, 360, PUMP_X + 55, 50, 368, 'dark'));                    // bracket
    out.push(gg.box(PUMP_X - 40, -50, 368, PUMP_X + 40, 50, 395, 'pcbBlack'));                 // driver
    const motor = gg.cyl(PUMP_X, 0, 395, 450, 36, '#3a5fa8', 18);
    motor.svg += gg.text(PUMP_X, 0, 450.5, 'PUMP', 16, '#e9eef5');
    out.push(motor, gg.box(PUMP_X - 4, -8, HUB0 - 20, PUMP_X + 4, 8, HUB0, 'dark'));
    const hose = [[-TANK.x, -20, TANK.z0 + 24], [PUMP_X + 18, -20, TANK.z0 + 24], [PUMP_X + 18, -20, 360]];
    out.push(...gg.wire(hose, '#bcd6e8', 9, 30));
    if (ctx.st.plugged){
      const pw = [[-150, -30, HUB1 + 2], [-200, -60, HUB0 - 10], [PUMP_X, -45, 395]];
      out.push(...gg.wire(pw, '#d8473a', 5, 40));
      flow(ctx, 'power', pw);
    }
    return out;
  }

  // a flat fan of droplets under each nozzle while the pump runs: wide along the boom, narrow across it
  function sprayFan(x, y, z, k, t){
    const reach = z - 4, wide = 230 * k, thin = 70 * k, at = (dx, dy, dz) => Wp(x + dx, y + dy, z + dz);
    const fanY = [at(-4, -6, 0), at(0, -wide, -reach), at(0, wide, -reach), at(4, 6, 0)];
    const fanX = [at(-6, -4, 0), at(-thin, 0, -reach), at(thin, 0, -reach), at(6, 4, 0)];
    let svg = `<path d="${pd(fanY)}" fill="#8fb6ec" opacity="${(.3 + .25 * k).toFixed(3)}"/><path d="${pd(fanX)}" fill="#8fb6ec" opacity="${(.22 + .2 * k).toFixed(3)}"/>`;
    for (let i = 0; i < 7; i++){
      const u = ((t * 1.7 + i * .37) % 1), v = Math.sin(i * 12.9898) * .9, [X, Y] = P(...at(thin * v * .4, wide * v * u, -reach * u));
      svg += `<circle cx="${f(X)}" cy="${f(Y)}" r="1.4" fill="#4c8fd0" opacity=".8"/>`;
    }
    return { box: SD.bbox([...fanY, ...fanX], 2), svg };
  }

  function boom(ctx){
    const out = [], r = running(ctx.st), on = r && r.kind === 'pump';
    for (const sy of [-1, 1]) out.push(...gg.rod([0, sy * 100, TANK.z0], [0, sy * 100, BOOM_Z + 9], 7, 'carbon', 60));
    out.push(...gg.rod([0, -820, BOOM_Z], [0, 820, BOOM_Z], 11, 'alu', 110));
    out.push(...gg.wire([[PUMP_X + 18, 20, 360], [PUMP_X + 18, 20, TANK.z0 - 14], [-40, 20, TANK.z0 - 14], [0, 20, BOOM_Z + 12]], '#bcd6e8', 9, 30));
    out.push(...gg.wire([[0, -720, BOOM_Z + 12], [0, 720, BOOM_Z + 12]], '#bcd6e8', 5, 80));
    for (const y of NOZZLES){
      out.push(gg.cyl(0, y, BOOM_Z - 44, BOOM_Z, 15, 'dark', 14));
      out.push(gg.cyl(0, y, BOOM_Z - 62, BOOM_Z - 44, 12, 'red', 12));
      if (on) out.push(sprayFan(0, y, BOOM_Z - 62, .55 + .45 * Math.min(1, progress(ctx.st, r) * 6), ctx.st.t));
    }
    if (on) flow(ctx, 'signal', [[110, 0, HUB1 + 10], [PUMP_X, 30, 395]]);
    return out;
  }

  // the 12S smart pack on the canopy, with its handle, and its AS150U lead into the PDU when plugged
  function pack(ctx){
    const b = ctx.design.batt, [l, w, h] = b.size, z0 = TOPZ, out = [];
    out.push(gg.box(-l * .42, -w * .45, z0, l * .42, w * .45, z0 + 4, '#8a8580'));
    const it = gg.box(-l / 2, -w / 2, z0 + 4, l / 2, w / 2, z0 + 4 + h, b.color || '#2b2a28');
    it.svg += gg.text(-l * .18, 0, z0 + h + 4.5, b.label || '', 20, '#f2efe7', 'y');
    it.svg += gg.text(l * .3, 0, z0 + h + 4.5, CF_T('{v} V', { v: (b.cells * 3.7).toFixed(1) }), 16, '#e2b33a', 'y');
    out.push(it);
    for (const sy of [-1, 1]) out.push(gg.box(-14, sy * (w * .28) - 9, z0 + 4 + h, 14, sy * (w * .28) + 9, z0 + 4 + h + 34, 'dark'));
    out.push(gg.box(-14, -w * .28 - 9, z0 + h + 26, 14, w * .28 + 9, z0 + h + 38, 'dark'));       // handle
    if (ctx.st.plugged && ctx.xt60At){
      const t = ctx.xt60At, from = [-l / 2 - 2, 0, z0 + 4 + h * .6];
      for (const [col, o] of [['#d8473a', 8], ['#2c2926', -8]]){
        out.push(...gg.wire([[from[0], o, from[2]], [from[0] - 60, o, from[2] - 30], [t[0] - 40, t[1] + o, t[2] + 40], [t[0] - 22, t[1] + o, t[2]]], col, 8, 40));
      }
      out.push(gg.box(t[0] - 50, t[1] - 15, t[2] - 9, t[0] - 18, t[1] + 15, t[2] + 9, 'yellow'));
    }
    ctx.shadows.push([[-l / 2, -w / 2], [l / 2, -w / 2], [l / 2, w / 2], [-l / 2, w / 2]].map(([x, y]) => Wp(x, y, z0 + 4 + h)));
    return out;
  }

  SD.define({
    id: 'agrihex', fig: '08', title: 'Agricultural spray hexacopter', palette: 'mint',
    mat: 2400, height: 860, explode: 48, log: 'ArduCopter 4.7', arrowZ: 70,
    bounds: [-560, 560, -520, 520, 0, 860],
    calLabel: 'Calibrate accelerometer',
    messages: {
      live: 'Unplug the battery first: never work on a live 50 V craft',
      plugNeeds: 'Mount the battery and fit the power distribution first',
      smokeNeeds: 'Fit the power distribution and the ESCs first',
      pop: 'POP: a 63 V capacitor was in backwards and vented. A current-limited first power-up would have caught it. Unplug, replace it',
      powered: 'Cube Orange+ boots and the X8 ESCs beep ready. GPS LEDs flashing blue: no RTK fix yet',
      smokeShort: 'The smoke stopper lamp lit up: something is shorted. A capacitor is in backwards: flip it before you plug in the pack',
      smokeOk: 'No short: the lamp only blinked. Safe to plug in the 12S pack',
      motorNeeds: 'Wire the arms and fit the Cube first',
      motorWrong: '{m} spun the wrong way: swapped two of its three motor wires (a PWM ESC cannot reverse it in software). They all spin right now',
      calNeeds: 'Fit the Cube first',
      calBack: 'Calibrated level. Note: the Cube’s arrow points backwards, so it flips on take-off unless AHRS_ORIENTATION says so',
      calOk: 'Accelerometer calibrated: six positions on the bench, then Calibrate Level on the skids',
    },
    logs: {
      smoke: '$ first power-up through a smoke stopper in the 12S lead...',
      motors: '$ Motor Test, props off, 10 %: {list} one at a time',
      reversed: '{m}: two motor wires swapped',
      calBack: 'accel calibrated (but AHRS_ORIENTATION does not match the Cube!)',
      calOk: '$ accelcal: 6 positions done, then level',
    },
    frame: {
      layout: 'hex-x', wheelbase: 1800, numbering: 'ardupilot',
      motors: [
        { id: 'M5', at: [RX, -R / 2], dir: 'CCW' },
        { id: 'M1', at: [0, -R], dir: 'CW' },
        { id: 'M4', at: [-RX, -R / 2], dir: 'CCW' },
        { id: 'M6', at: [-RX, R / 2], dir: 'CW' },
        { id: 'M2', at: [0, R], dir: 'CCW' },
        { id: 'M3', at: [RX, R / 2], dir: 'CW' },
      ],
      arm: { w: 35, t: 35 }, plate: { l: 480, w: 420, t: 20, z: HUB0, r: 30 }, motorZ: MOUNT_Z,
    },
    design: {
      default: { batt: '12s22', motor: '8120-100', prop: '30x9.9' },
      batts: {
        '12s22': { cells: 12, mah: 22000, size: [240, 180, 150], color: '#2f6b5a', label: '12S 22000' },
        '12s16': { cells: 12, mah: 16000, size: [200, 160, 130], color: '#2b2a28', label: '12S 16000' },
        '14s30': { cells: 14, mah: 30000, size: [300, 210, 180], color: '#2f5fa8', label: '14S 30000' },
      },
      motors: {
        '8120-100': { stator: [81, 20], bell: [88.6, 34], kv: 100, label: '8120 100KV' },
        '10025-80': { stator: [100, 25], bell: [108, 40], kv: 80, label: '10025 80KV' },
        '6215-180': { stator: [62, 15], bell: [68, 28], kv: 180, label: '6215 180KV' },
      },
      props: {
        '30x9.9': { d: 30, pitch: 9.9, blades: 2, color: '#3a3734', label: '30x9.9' },
        '28x9.2': { d: 28, pitch: 9.2, blades: 2, color: '#5a554f', label: '28x9.2' },
        '32x11': { d: 32, pitch: 11, blades: 2, color: '#262422', label: '32x11' },
      },
    },
    parts: [
      { id: 'FRAME', short: 'FRAME', name: 'Carbon hub, six folding 35 mm arms with locking sleeves, legs and skids', z: 3,
        piece: { kind: 'custom', draw: frame }, tag: { at: [470, -420, 24], dx: 70, dy: 40 },
        xr: [{ at: [SLEEVE_R * Math.cos(-Math.PI / 6), SLEEVE_R * Math.sin(-Math.PI / 6), TUBE_Z + 22], text: 'FOLD JOINT: LOCK THE SLEEVE' }] },
      { id: 'MOTORS', short: 'MOTORS', name: '6 × 8120 100 KV motors (Hobbywing X8 class)', after: ['FRAME'], z: 7,
        piece: { kind: 'motors', color: 'pal' }, tag: { at: [RX, R / 2, MOUNT_Z + 40], dx: -30, dy: -50 } },
      { id: 'ESC', short: 'ESCs', name: '6 × 80 A FOC ESCs in the motor pods (PWM)', after: ['FRAME'], z: 5,
        piece: { kind: 'custom', draw: escs }, tag: { at: [-RX, -R / 2, TUBE_Z - 50], dx: -60, dy: 40 },
        xr: [{ at: [-RX, -R / 2, TUBE_Z - 50], text: 'FOC ESC IN THE POD · PWM 1050-1950' }] },
      { id: 'WIRES', short: 'WIRING', name: '12 AWG arm power leads and the ESC signal leads', after: ['MOTORS', 'ESC'], z: 6,
        piece: { kind: 'custom', draw: armLeads }, tag: { at: [-450, 260, TUBE_Z + 18], dx: -50, dy: -46 } },
      { id: 'XT60', short: 'PDU + CAPS', name: 'Power distribution: AS150U lead, power brick, 63 V capacitors', after: ['ESC'], z: 4,
        polar: ['stripe to minus', 'stripe to plus'],
        piece: [
          { kind: 'board', at: [-120, 0, HUB1], size: [130, 110], t: 3, color: 'pcb', label: 'PDU', labelAt: [40, 0],
            pads: [{ at: [52, 40], size: [16, 12] }, { at: [52, -40], size: [16, 12] }, { at: [-52, 40], size: [16, 12] }, { at: [-52, -40], size: [16, 12] }] },
          { kind: 'module', at: [-90, 40, HUB1 + 3], size: [44, 30, 14], color: 'pcbBlue', label: 'PM', labelSize: .32 },
          { kind: 'xt60', at: [-262, 0, HUB1 + 22], dir: [-1, 0, 0], size: [32, 26, 16], lead: [[-170, 0, HUB1 + 10], [-215, 0, HUB1 + 16], [-246, 0, HUB1 + 22]],
            cap: { at: [-150, -36, HUB1 + 15], dir: [1, 0, 0], r: 12, l: 46, stripe: [0, -1, 0] } },
        ],
        tag: { at: [-262, 0, HUB1 + 30], dx: -80, dy: -16 },
        xr: [{ at: [-128, -36, HUB1 + 28], text: '63 V CAPS: STRIPE TO MINUS' }, { at: [-90, 40, HUB1 + 18], text: 'POWER BRICK → POWER1' }] },
      { id: 'FC', short: 'CUBE ORANGE+', name: 'Cube Orange+ autopilot on its carrier board', after: ['XT60'], z: 8,
        polar: ['arrow forward', 'arrow backward'],
        piece: [
          { kind: 'box', at: [110, 0, HUB1], size: [94, 44, 14], color: 'black' },
          { kind: 'board', at: [100, 0, HUB1 + 14], size: [38.3, 38.3], t: 22, color: '#e8792f', arrow: true, label: 'CUBE', labelAt: [0, -13], led: '#43c25c', ledAt: [14, 14] },
        ],
        tag: { at: [110, 0, HUB1 + 36], dx: 90, dy: -40 },
        xr: [{ at: [100, 0, HUB1 + 36], text: 'STM32H757 · 3 IMUS · EKF3' }] },
      { id: 'RX', short: 'RADIO', name: '900 MHz telemetry radio and RC receiver', after: ['FC'], z: 8.5,
        piece: { kind: 'module', at: [-10, -160, HUB1], size: [57, 30, 14], color: 'dark', label: '900', labelSize: .3, led: '#43c25c',
          antenna: { at: [-10, -205, HUB0 + 6], type: 'whip', dir: [.05, -.35, -.94], len: 170, r: 5, color: 'black' } },
        tag: { at: [-10, -160, HUB1 + 14], dx: 60, dy: 46 } },
      { id: 'RADAR', short: 'RADAR', name: 'Downward radar (Ainstein US-D1 class, 0.5-50 m)', after: ['FC'], z: 1,
        piece: { kind: 'custom', draw: radar }, tag: { at: [240, 0, HUB0 - 40], dx: 80, dy: 30 },
        xr: [{ at: [200, 0, HUB0 - 82], text: 'RADAR LOOKS DOWN: NO READING BELOW 0.5 M' }] },
      { id: 'TOP', short: 'CANOPY', name: 'Canopy over the electronics, FPV camera in the nose', after: ['FC', 'RX'], z: 10, cover: true,
        piece: [{ kind: 'custom', draw: canopy }, { kind: 'camera', at: [236, 0, HUB1 + 70], size: 34, tilt: -10, depth: 26, lens: 10 }],
        tag: { at: [180, 160, TOPZ], dx: 70, dy: -40 } },
      { id: 'GPS', short: 'RTK MASTS', name: 'Dual-antenna RTK GNSS (2 × F9P), masts 340 mm apart', after: ['TOP'], z: 13,
        polar: ['GPS1 at the front', 'GPS1 at the back (swapped)'], mistake: 'gps-swapped',
        piece: { kind: 'custom', draw: masts }, tag: { at: [-MAST_X, MAST_Y, ANT_Z + 20], dx: -70, dy: -24 },
        xr: [{ at: [0, MAST_Y, ANT_Z], text: 'MOVING BASELINE: GPS YAW, NO COMPASS' }] },
      { id: 'TANK', short: 'TANK', name: '10 L spray tank with a sight strip', after: ['FRAME'], z: 0,
        piece: { kind: 'custom', draw: tank }, tag: { at: [TANK.x, -TANK.y, 330], dx: 70, dy: 50 } },
      { id: 'PUMP', short: 'PUMP', name: 'Diaphragm pump and its driver, behind the tank', after: ['TANK'], z: 1.5,
        piece: { kind: 'custom', draw: pump }, tag: { at: [PUMP_X - 40, 0, 430], dx: -80, dy: 30 },
        xr: [{ at: [PUMP_X, 0, 395], text: 'SPRAYERPUMP ON AUX1 (SERVO9 = 22)' }] },
      { id: 'BOOM', short: 'BOOM', name: '1640 mm spray boom with four nozzles', after: ['PUMP'], z: 0,
        piece: { kind: 'custom', draw: boom }, tag: { at: [0, -820, BOOM_Z], dx: 50, dy: 46 },
        xr: [{ at: [0, 720, BOOM_Z - 40], text: 'NOZZLES AT ±300 AND ±720 MM' }] },
      { id: 'BATT', short: 'BATTERY', name: '12S smart pack with an AS150U plug', after: ['TOP', 'XT60'], z: 15, cover: true,
        piece: { kind: 'custom', draw: pack }, tag: { at: [60, -60, TOPZ + 160], dx: 30, dy: -60 } },
      { id: 'PROPS', short: 'PROPS', name: '30-inch folding props, 3 CW + 3 CCW', after: ['MOTORS', 'TOP'], z: 11,
        polar: ['props matched to motor spin', 'swapped CW/CCW'],
        piece: { kind: 'props' }, tag: { at: [RX + 300, -R / 2, MOUNT_Z + 40], dx: 40, dy: -20 } },
    ],
    tests: {
      smoke: { needs: ['XT60', 'ESC'], at: [-1000, 0] },
      motors: { needs: ['WIRES', 'FC'] },
      calibrate: { needs: ['FC'] },
      plug: { needs: ['BATT', 'XT60'] },
    },
    buttons, report,
    wiring: {
      nodes: {
        GPS: { at: [203, 8], title: 'RTK GNSS ×2', sub: 'F9P moving baseline', color: '#43a35a', led: '#4aa3ff' },
        RADAR: { at: [406, 8], title: 'RADAR', sub: 'US-D1, 0.5-50 m', color: '#43a35a' },
        RX: { at: [0, 142], title: 'RADIO', sub: '900 MHz MAVLink + RC', color: '#8c4bd1', led: '#43c25c' },
        FC: { at: [203, 142], title: 'CUBE ORANGE+', sub: 'ArduCopter 4.7.2', color: '#3e86d9', led: '#43c25c' },
        PUMP: { at: [610, 142], title: 'PUMP', sub: 'driver on the 12S bus', color: '#f08a2b' },
        BATT: { at: [0, 276], title: 'BATTERY', sub: 'batt', color: 'tomato' },
        XT60: { at: [203, 276], title: 'PDU + CAPS', sub: 'AS150U, power brick', color: 'tomato' },
        ESC: { at: [406, 276], title: 'ESCs ×6', sub: '80 A FOC, PWM', color: '#f08a2b' },
        MOTORS: { at: [610, 276], title: 'MOTORS ×6', sub: 'motor', color: '#f08a2b' },
      },
      edges: [
        { from: 'BATT', to: 'XT60', kind: 'power', n: 2, label: 'V' },
        { from: 'XT60', to: 'ESC', kind: 'power', n: 2, label: 'V' },
        { from: 'ESC', to: 'MOTORS', kind: 'phase', n: 3, label: '3-ph ×6' },
        { from: 'XT60', to: 'FC', kind: 'power', label: 'POWER1', labelAt: [30, 0] },
        { from: 'XT60', to: 'PUMP', kind: 'power', label: '12S', a: [340, 276], b: [665, 198],
          via: [[340, 252], [665, 252]], labelAt: [150, 0] },
        { from: 'FC', to: 'ESC', kind: 'signal', label: 'MAIN 1-6 · PWM', a: [325, 198], b: [455, 276],
          via: [[325, 224], [455, 224]], labelAt: [20, -2] },
        { from: 'FC', to: 'PUMP', kind: 'signal', label: 'AUX1 · SprayerPump' },
        { from: 'RX', to: 'FC', kind: 'signal', label: 'TELEM1 + RCIN' },
        { from: 'GPS', to: 'FC', kind: 'signal', label: 'GPS1 + GPS2', labelAt: [-42, 0] },
        { from: 'RADAR', to: 'FC', kind: 'signal', label: 'TELEM2 · serial', a: [470, 64], b: [330, 142],
          via: [[470, 103], [330, 103]], labelAt: [0, -6] },
      ],
    },
  });
})();
