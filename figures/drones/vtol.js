// @cf title VTOL tiltrotor QuadPlane
// @cf use engine/drone.js
// @cf use engine/drone-geo.js
// @cf use engine/drone-frames.js
// @cf use engine/drone-pieces.js
// @cf use engine/drone-sheet.js
/* Fig. 10, the tilt-tricopter QuadPlane on ArduPilot Plane 4.7.2 (docs/facts/vtol.md). A 370 x 90 x 80 mm foam pod
   on wire skids, a carbon boom to a V-tail, and the 1200 x 195 mm wing the fact sheet's sizing check asks for
   (0.234 m2: the original's 840 x 150 mm wing cannot carry 1.6 kg at 10 m/s). Two front motors on tilting nacelles
   pivot at (175, +-230, 136), 55 mm ahead of the leading edge; the rear lift motor M4 sits fixed on the boom at
   x = -300. ArduPilot's tricopter uses M1 front right, M2 front left, M4 rear (no M3); Q_TILT_TYPE 2 steers yaw by
   tilting the front pair in opposite directions. Matek H743-WING: tilt servos S1 S2, motors S3-S5, V-tail S7 S8,
   ailerons S9 S10. Craft-local mm: x forward, y left, z up, z = 0 on the mat; the pod's belly is 44 mm up. */
(() => {
  const SD = SL.drone, g = SD.g, W = SD.W;
  const GH = 44, FLOOR = GH + 4, TRAY = 104, POD_X0 = -140, POD_X1 = 230, POD_W = 45, POD_Z1 = GH + 80, WALL = 4;
  const LE = 120, TE = -75, C = LE - TE, TIP = 600, WZ = POD_Z1, TH = 13.5, HINGE_U = .75;
  const PIV_X = 175, PIV_Y = 230, PIV_Z = 136, NAC_W = 11;
  const BOOM_Z = 104, BOOM_R = 7, TAIL_X = -515, REAR_X = -300, REAR_Z = 114;
  const GPS_X = -170, GPS_Z = 165, PITOT_Y = -420, BATT_X = 71;
  const FOAM = matOf('#ece6d6');
  const rad = d => d * Math.PI / 180;
  const fade = (it, op) => op < .999 ? { box: it.box, svg: `<g opacity="${op.toFixed(3)}">${it.svg}</g>` } : it;
  const darker = (k = .14) => matOf(mix(SD.mat('pal').l, '#000000', k));

  /* ---------- solids: a closed body between two matching sections, shaded face by face, one ink outline ---------- */
  function newell(fc){
    const n = [0, 0, 0];
    for (let i = 0; i < fc.length; i++){
      const a = fc[i], b = fc[(i + 1) % fc.length];
      n[0] += (a[1] - b[1]) * (a[2] + b[2]); n[1] += (a[2] - b[2]) * (a[0] + b[0]); n[2] += (a[0] - b[0]) * (a[1] + b[1]);
    }
    return n;
  }
  function loft(A, B, m, w = 1.1){
    const n = A.length, all = [...A, ...B], cen = avg(all), faces = [A, B];
    for (let i = 0; i < n; i++){ const j = (i + 1) % n; faces.push([A[i], A[j], B[j], B[i]]); }
    let s = '';
    for (const fc of faces){
      let nr = newell(fc);
      if (Math.hypot(...nr) < 1e-9) continue;
      nr = norm(nr);
      if (dot(nr, sub(avg(fc), cen)) < 0) nr = nr.map(v => -v);
      if (vis(nr)) s += face(pd(fc.map(p => W(...p))), tone(nr, m));
    }
    const pts = all.map(p => W(...p));
    return { box: SD.bbox(pts), svg: s + hullInk(pts, w) };
  }

  /* ---------- the wing section: flat-bottomed, 7 % thick at 30 % chord, u = 0 at the leading edge ---------- */
  const dn = u => { u = Math.max(0, Math.min(1, u)); return (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u ** 3 - 0.1015 * u ** 4) / 0.1; };
  const botZ = u => WZ + 3 * Math.max(0, 1 - u / .12) ** 2;
  const topZ = u => botZ(u) + (u > 0 ? Math.max(TH * dn(u), 1.2) : 0);
  const xAt = u => LE - u * C;
  const STATIONS = [0, .02, .06, .12, .2, .3, .42, .55, .68, .8, .9, 1];
  function section(y, u0, u1){
    const us = [u0, ...STATIONS.filter(u => u > u0 + 1e-6 && u < u1 - 1e-6), u1];
    const top = us.map(u => [xAt(u), y, topZ(u)]);
    const bot = us.slice().reverse().map(u => [xAt(u), y, botZ(u)]);
    return u0 === 0 ? [...top, ...bot.slice(0, -1)] : [...top, ...bot];
  }
  const panel = (y0, y1, u0, u1, m) => loft(section(y0, u0, u1), section(y1, u0, u1), m);
  // a point on the wing's top skin
  const skin = (x, y) => [x, y, topZ((LE - x) / C)];

  // what the checks show on their pills, in one table the figure-string collector reads (pillAt passes text on to CF_T)
  const MSG = {
    checking: 'PRE-ARM CHECKS…',
    armed: 'ARMED: MOTORS IDLE',
    noAcc: 'PREARM: 3D ACCEL CALIBRATION NEEDED',
    airspeed: 'AIRSPEED {v} M/S',
    rotorsUp: 'QSTABILIZE: ROTORS UP',
    manualTilt: 'MANUAL: TILT {n}°',
    backTilt: 'QSTABILIZE: TILT {n}°',
    yawRight: 'YAW RIGHT: LEFT ROTOR FORWARD, RIGHT BACK',
    revTilt: 'MANUAL: TILT {n}° BACKWARDS',
  };

  /* ---------- the craft's own bench checks: the tilt servos, the airspeed sensor, the pre-arm checks ---------- */
  const fresh = (() => { try { return /[?&]fresh=1(&|$)/.test(location.search); } catch (e) { return false; } })();
  const vt = st => st.vt || (st.vt = { t0: null, end: null, rev: false, done: !fresh });
  const TILT_T = 7.6, REV_T = 2.6, YAW_DEG = 10;
  // the nacelle angle this frame (deg from straight up, + towards the nose) and the vectored-yaw split
  function nacelle(st){
    const x = vt(st);
    if (x.t0 == null || st.t >= x.end) return { tilt: 0, yaw: 0, phase: null };
    const s = st.t - x.t0;
    if (s < .5) return { tilt: 0, yaw: 0, phase: 'up' };
    if (x.rev) return { tilt: -Math.min(35, (s - .5) * 90), yaw: 0, phase: 'rev' };
    if (s < 1.5) return { tilt: (s - .5) * 90, yaw: 0, phase: 'manual' };   // MANUAL snaps forward at 90 deg/s
    if (s < 2.3) return { tilt: 90, yaw: 0, phase: 'manual' };
    if (s < 5.9) return { tilt: 90 - (s - 2.3) * 25, yaw: 0, phase: 'back' };  // QSTABILIZE: back up at Q_TILT_RATE_UP
    return { tilt: 0, yaw: YAW_DEG * Math.sin(Math.PI * Math.min(1, (s - 5.9) / 1.5)), phase: 'yaw' };
  }
  const tilting = st => { const x = vt(st); return x.t0 != null && st.t < x.end; };
  function blocked(api){
    const st = api.st;
    if (st.test || st.queue.length || tilting(st)) { api.say('Wait for the test to finish', 1600, 'tick'); return true; }
    if (st.exT || st.ex > .01) { api.say('Close the exploded view first', 2000, 'buzz'); return true; }
    return false;
  }
  const tiltTest = api => {
    const st = api.st;
    if (!st || blocked(api)) return;
    if (!api.isOn('TILT') || !api.isOn('FC')) return api.say('Fit the tilt servos and the flight controller first', 2600, 'buzz');
    if (api.isOn('PROPS')) return api.say('Props off for the tilt test: in MANUAL the rotors swing forward through where your hands are', 3000, 'buzz');
    if (!SD.powered(st)) return api.say('Plug in the battery: the tilt servos run from the 8 A servo BEC', 2600, 'buzz');
    const x = vt(st);
    x.rev = api.orient('TILT') === 1;
    x.done = false; x.t0 = st.t; x.end = st.t + (x.rev ? REV_T : TILT_T);
    api.log('$ props off: mode MANUAL, then QSTABILIZE, then yaw right');
    api.log('Q_TILT_RATE_UP 25 deg/s back to hover; Q_TILT_YAW_ANGLE 10');
    st.later.push({ t: x.rev ? REV_T : TILT_T, sfx: x.rev ? 'buzz' : 'ding',
      say: x.rev ? 'MANUAL tilted the rotors BACK: the tilt servos are reversed. In the first transition the nose would pitch up and flip it over its tail. Reverse SERVO1 and SERVO2 or turn the servos round'
        : 'MANUAL tilted both rotors forward, QSTABILIZE brought them back up at 25°/s, and yaw right swung the left rotor forward and the right one back. Tilt servos correct' });
    api.sfx('click');
  };
  const AIR_T = 2.8, PRE_T = 2.2;
  const airspeedTest = api => {
    const st = api.st;
    if (!st || blocked(api)) return;
    if (!api.isOn('ARSPD') || !api.isOn('FC')) return api.say('Fit the airspeed sensor and the flight controller first', 2600, 'buzz');
    if (!SD.powered(st)) return api.say('Plug in the battery first: cover the pitot while it boots, it zeroes then', 2800, 'buzz');
    st.test = { kind: 'airspeed', t: 0, dur: AIR_T };
    api.log('$ blow gently into the pitot tube');
    api.log('ARSPD_TYPE 1 (MS4525DO on I2C): airspeed rises, then falls back to about 0');
    st.later.push({ t: AIR_T, sfx: 'ding', say: 'Blowing into the pitot raised the airspeed and it fell back to about 0: the sensor reads, and the tubes are on the right ports' });
    api.pass('airspeed');
    api.sfx('click');
  };
  const prearmTest = api => {
    const st = api.st;
    if (!st || blocked(api)) return;
    if (!api.isOn('FC') || !api.isOn('GPS') || !api.isOn('ARSPD')) return api.say('Fit the flight controller, the GPS and the airspeed sensor first', 2600, 'buzz');
    if (api.isOn('PROPS')) return api.say('Props off: once the checks pass, arming spins the motors at Q_M_SPIN_ARM', 2800, 'buzz');
    if (!SD.powered(st)) return api.say('Plug in the battery first', 2200, 'buzz');
    st.test = { kind: 'prearm', t: 0, dur: PRE_T, ok: !!st.accOk };
    api.log('$ arm throttle (QHOVER, props off)');
    if (!st.accOk){
      api.log('PreArm: 3D Accel calibration needed');
      st.later.push({ t: PRE_T, sfx: 'buzz', say: 'PreArm: 3D Accel calibration needed. Calibrate the accelerometer, then try again' });
      api.sfx('click');
      return;
    }
    api.log('pre-arm: GPS 3D fix, airspeed healthy, Q_ASSIST_SPEED 9, RTL_AUTOLAND 0 with Q_RTL_MODE 1');
    api.log('ARMED: motors idle at Q_M_SPIN_ARM; disarm');
    st.later.push({ t: PRE_T, sfx: 'ding', say: 'Every pre-arm check passed and it armed on the bench, the motors idling. Disarmed. Never skip a check with ARMING_SKIPCHK' });
    api.pass('prearm');
    api.sfx('click');
  };
  // the tilt check holds for the servos it ran on: a factory build counts as checked unless the page opened fresh
  const report = st => {
    const x = vt(st), ran = x.end != null && st.t >= x.end && !x.rev;
    return { tiltOk: SD.isOn(st, 'TILT') && SD.orient(st, 'TILT') === 0 && (x.done || ran) };
  };
  // the engine calls this on a strip, a build, or a part put on, taken off or turned round
  const reset = (st, why) => {
    const x = vt(st);
    if (why === 'build') Object.assign(x, { t0: null, end: null, rev: false, done: true });
    else if (['strip', 'TILT', 'FC'].includes(why)) Object.assign(x, { t0: null, end: null, rev: false, done: false });
  };

  // a pill in screen pixels over a craft-local point
  function pillAt(p3, text, fill, ink = INK){
    const [X, Y] = SD.Pb(...p3), fs = 8.6 * INK_K, h = fs * 1.8, t = CF_T(text.key || text, text.vars), w = CF_TW(t, fs) + fs * 1.5;
    return { box: SD.bbox([W(p3[0] - 4, p3[1] - 4, p3[2] - 2), W(p3[0] + 4, p3[1] + 4, p3[2] + 2)]),
      svg: `<g class="dpill"><rect x="${f(X - w / 2)}" y="${f(Y - h / 2)}" width="${f(w)}" height="${f(h)}" rx="${f(h / 2)}" fill="${fill}" stroke="${INK}" stroke-width="1.2"/>`
        + `<text x="${f(X)}" y="${f(Y + fs * .36)}" font-size="${f(fs)}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="800" fill="${ink}">${CF_ESC(t)}</text></g>` };
  }

  /* ---------- FRAME: the pod (an open tub), nose, rear deck, boom, rear motor mount, tail stand, skids ---------- */
  function drawFrame(ctx){
    const items = [], op = 1 - .5 * ctx.k;
    const walls = [
      g.box(POD_X0, -POD_W, GH, POD_X1, POD_W, FLOOR, FOAM, 1),
      g.box(POD_X0, -POD_W, FLOOR, POD_X0 + WALL, POD_W, POD_Z1, FOAM, 1),
      g.box(POD_X1 - WALL, -POD_W, FLOOR, POD_X1, POD_W, POD_Z1, FOAM, 1),
      g.box(POD_X0 + WALL, POD_W - WALL, FLOOR, POD_X1 - WALL, POD_W, POD_Z1, FOAM, 1),
      g.box(POD_X0 + WALL, -POD_W, FLOOR, POD_X1 - WALL, -POD_W + WALL, POD_Z1, FOAM, 1),
      // the rear deck behind the wing, where the VTX sits
      g.box(POD_X0 + WALL, -POD_W + WALL, POD_Z1 - 4, TE, POD_W - WALL, POD_Z1, FOAM, .9),
    ];
    // a plywood tray high in the nose bay carries the electronics, where the open hatch shows them
    items.push(g.box(128, -POD_W + WALL, TRAY - 3, POD_X1 - WALL, POD_W - WALL, TRAY, '#d9c49a', .9));
    items.push(walls[0], ...walls.slice(1).map(it => fade(it, op)));
    // the nose: from the pod's front face to a smaller face that carries the camera
    const oct = (x, hw, z0, z1, c) => [[x, -hw + c, z0], [x, hw - c, z0], [x, hw, z0 + c], [x, hw, z1 - c], [x, hw - c, z1], [x, -hw + c, z1], [x, -hw, z1 - c], [x, -hw, z0 + c]];
    items.push(fade(loft(oct(POD_X1, POD_W, GH, POD_Z1, 10), oct(POD_X1 + 32, 26, GH + 20, POD_Z1 - 16, 8), FOAM), op));
    // the boom from the rear wall to the tail, the rear motor's clamp and plate on top of it
    // (the boom stops at the clamp, so no piece of it sits inside another solid and the drawing order stays clean)
    items.push(...g.rod([POD_X0 - 1, 0, BOOM_Z], [REAR_X + 12, 0, BOOM_Z], BOOM_R, 'carbon', 14, 12));
    items.push(...g.rod([REAR_X - 12, 0, BOOM_Z], [TAIL_X, 0, BOOM_Z], BOOM_R, 'carbon', 14, 12));
    items.push(g.box(REAR_X - 12, -BOOM_R - 2, BOOM_Z - BOOM_R - 1, REAR_X + 12, BOOM_R + 2, REAR_Z - 3, 'dark', .9));
    items.push(g.box(REAR_X - 16, -16, REAR_Z - 3, REAR_X + 16, 16, REAR_Z, 'dark', .9));
    // the tail stand under the boom, and two wire skids under the pod
    items.push(...g.rod([-450, 0, BOOM_Z - BOOM_R], [-450, 0, 4], 2.4, 'carbon', 14, 8));
    items.push(...g.rod([-450, -34, 2.5], [-450, 34, 2.5], 2.5, 'dark', 14, 8));
    for (const s of [1, -1]){
      items.push(...g.rod([-40, s * 66, 2.5], [180, s * 66, 2.5], 2.5, 'metal', 14, 8));
      for (const x of [0, 140]) items.push(...g.rod([x, s * 66, 4], [x + 6, s * (POD_W - 4), GH], 2, 'metal', 12, 8));
    }
    ctx.shadows.push([[POD_X0, -POD_W], [POD_X1 + 32, -POD_W], [POD_X1 + 32, POD_W], [POD_X0, POD_W]].map(([x, y]) => W(x, y, POD_Z1)));
    return items;
  }

  /* ---------- TAIL: a V-tail at 35 deg with ruddervators, two servos on the boom ---------- */
  const DIHED = rad(35), FIN = 150, RUD = 27;
  function drawTail(ctx){
    const items = [], fin = SD.mat('pal'), rud = darker();
    for (const s of [1, -1]){
      const v = [0, s * Math.cos(DIHED), Math.sin(DIHED)], u = [1, 0, 0], n = norm(cross(u, v));
      const at = (x, l) => [x, s * 9 + v[1] * l, BOOM_Z + v[2] * l];
      const xf0 = TAIL_X + RUD, xf1 = TAIL_X + 90;
      for (const [l0, l1] of [[0, 75], [75, FIN]]){
        const lm = (l0 + l1) / 2, hl = (l1 - l0) / 2;
        items.push(g.oblock(at((xf0 + xf1) / 2, lm), u, v, n, (xf1 - xf0) / 2, hl, 2, fin, 1));
        items.push(g.oblock(at(TAIL_X + RUD / 2, lm), u, v, n, RUD / 2 - .6, hl, 1.6, rud, .9));
      }
      ctx.shadows.push([at(TAIL_X, 0), at(TAIL_X + 90, 0), at(TAIL_X + 90, FIN), at(TAIL_X, FIN)].map(p => W(...p)));
      // the servo on the boom's side, its pushrod back to the ruddervator's horn
      const sy = s * (BOOM_R + 6);
      const body = g.box(-432, sy - 6, BOOM_Z - 4, -410, sy + 6, BOOM_Z + 8, '#3e86d9', .9);
      body.svg += g.text(-421, sy, BOOM_Z + 8.05, 'S' + (s > 0 ? 7 : 8), 4.6, '#f2efe7');
      items.push(body);
      const horn = at(TAIL_X + RUD - 6, 22);
      items.push(...g.rod([horn[0], horn[1], horn[2]], [horn[0], horn[1] + n[1] * 9, horn[2] + n[2] * 9], 1.1, 'white', 6, 6));
      items.push(...g.wire([[-433, sy, BOOM_Z + 4], [horn[0] + 2, horn[1] + n[1] * 9, horn[2] + n[2] * 9]], 'metal', .9));
      // the servo lead along the boom into the pod
      const lead = [[-410, sy * .8, BOOM_Z + 2], [-150, s * 6, BOOM_Z + 8], [POD_X0 - 2, s * 10, BOOM_Z + 6]];
      items.push(...g.wire(lead, '#6b4a32', .7));
      ctx.flows.push({ kind: 'signal', pts: lead.slice().reverse().map(p => W(...p)) });
    }
    return items;
  }

  /* ---------- FC: the H743-WING lead harness inside the pod ---------- */
  function fcLeads(ctx){
    const items = [];
    // the ELRS receiver's lead to its UART pads, and its antenna lead up through the left wall
    items.push(...g.wire([[150, 25, TRAY + 3], [158, 19, TRAY + 6.5], [163, 16, TRAY + 7.8]], '#43a35a', .7, 6));
    items.push(...g.wire([[150, 35, TRAY + 3], [150, 38.5, TRAY + 8], [150, 39.5, POD_Z1 - 10]], '#2c2926', .8, 8));
    ctx.flows.push({ kind: 'signal', pts: [[150, 25, TRAY + 3], [163, 16, TRAY + 7.8]].map(p => W(...p)) });
    const t = ctx.st.test;
    if (t && t.kind === 'prearm'){
      const done = t.t > t.dur * .55;
      items.push(!done ? pillAt([172, 0, 320], MSG.checking, '#fff4d6')
        : t.ok ? pillAt([172, 0, 320], MSG.armed, '#d6f0dc') : pillAt([172, 0, 320], MSG.noAcc, '#e2483d', '#ffffff'));
    }
    return items;
  }

  /* ---------- GPS: an M10 puck on a 50 mm mast on the boom, its lead into the pod ---------- */
  function drawGps(ctx){
    const items = [], z0 = BOOM_Z + BOOM_R;
    items.push(...g.rod([GPS_X, 0, z0], [GPS_X, 0, GPS_Z], 2.2, 'carbon', 12, 8));
    const puck = g.cyl(GPS_X, 0, GPS_Z, GPS_Z + 9, 24, '#2c2926', 22, 1.1);
    puck.svg += g.arrow(GPS_X + 2, 0, GPS_Z + 9.05, 22, 1, '#f2efe7');
    puck.svg += g.led(GPS_X - 13, 12, GPS_Z + 9.1, '#4aa3ff', ctx.powered);
    items.push(puck);
    // outside along the mast and the boom, then in through the rear wall and along the left side to the FC
    const out = [[GPS_X, 3, GPS_Z - 1], [GPS_X, 3, z0 + 2], [-150, 4, BOOM_Z + 6], [POD_X0 - 2, 8, BOOM_Z + 6]];
    const inn = [[POD_X0 + WALL + 2, 30, BOOM_Z], [-110, 37, FLOOR + 44], [128, 37, TRAY + 2], [150, 16, TRAY + 8]];
    items.push(...g.wire(out, '#c9c4b8', .9), ...g.wire(inn, '#c9c4b8', .9));
    ctx.flows.push({ kind: 'signal', pts: [...out, ...inn].map(p => W(...p)) });
    return items;
  }

  /* ---------- CAM: the nose camera's coax to the FC, the VTX on the rear deck with its lollipop ---------- */
  function camLeads(ctx){
    // the coax runs back inside the nose; it shows from the pod's front wall to the CAM pad
    const coax = [[POD_X1 - WALL - 1, 4, TRAY + 10], [212, 8, TRAY + 10], [196, 9, TRAY + 7.8]];
    const vtx = [[150, 6, TRAY + 7.8], [128, 34, TRAY + 2], [-60, 34, FLOOR + 52], [-112, 30, FLOOR + 62], [-112, 22, POD_Z1 - 6]];
    ctx.flows.push({ kind: 'video', pts: coax.map(p => W(...p)) }, { kind: 'video', pts: vtx.map(p => W(...p)) });
    return [...g.wire(coax, '#2c2926', 1.3, 8), ...g.wire(vtx, '#f2c230', .8, 9)];
  }

  /* ---------- WING: centre section, panels, ailerons and their servos, CG marks, the spar in see-through ---------- */
  function drawWing(ctx){
    const items = [], m = SD.mat('pal'), ail = darker();
    items.push(panel(-POD_W, POD_W, 0, 1, m));
    for (const s of [1, -1]){
      const [a, b, c, d] = [POD_W, 300, 560, TIP].map(v => s * v);
      const inner = panel(a, b, 0, 1, m);
      // CG marks on the top skin at a quarter of the chord: where the craft balances on two fingertips
      const cy = s * 110, cx = LE - .25 * C, cz = topZ(.25) + .3;
      const ring = Array.from({ length: 16 }, (_, i) => { const t = i / 16 * 2 * Math.PI; return W(cx + 7 * Math.cos(t), cy + 7 * Math.sin(t), cz); });
      const q = (a0, a1) => [W(cx, cy, cz), ...Array.from({ length: 5 }, (_, i) => { const t = a0 + (a1 - a0) * i / 4; return W(cx + 7 * Math.cos(t), cy + 7 * Math.sin(t), cz); })];
      inner.svg += `<path d="${pd(ring)}" fill="#f7f3ea" stroke="${INK}" stroke-width=".8"/><path d="${pd(q(0, Math.PI / 2))}" fill="${INK}"/><path d="${pd(q(Math.PI, 1.5 * Math.PI))}" fill="${INK}"/>`;
      items.push(inner);
      items.push(panel(b, c, 0, HINGE_U, m), panel(b, c, HINGE_U, 1, ail), panel(c, d, 0, 1, m));
      // the aileron servo in a pocket under the wing, its pushrod to the horn on the aileron
      const sy = s * 330, hx = xAt(HINGE_U);
      items.push(g.box(hx + 14, sy - 6, WZ - 10, hx + 36, sy + 6, WZ, '#3e86d9', .8));
      items.push(...g.wire([[hx + 13, sy, WZ - 6], [hx - 12, sy, WZ - 6]], 'metal', .8));
      items.push(...g.rod([hx - 12, sy, WZ - 9], [hx - 12, sy, WZ], 1, 'white', 6, 6));
      const lead = [[hx + 36, sy, WZ - 3], [40, s * 60, WZ - 2], [40, s * (POD_W + 1), WZ - 6]];
      items.push(...g.wire(lead, '#6b4a32', .6));
    }
    if (ctx.k > .3) items.push(...g.rod([LE - .25 * C, -TIP + 10, WZ + 6], [LE - .25 * C, TIP - 10, WZ + 6], 2.4, 'carbon', 60, 8));
    ctx.shadows.push([[LE, -TIP], [LE, TIP], [TE, TIP], [TE, -TIP]].map(([x, y]) => W(x, y, WZ)));
    return items;
  }

  /* ---------- ARSPD: the pitot under the right wing, outside the prop wash; the ASPD-4525 board in the bay ---------- */
  function drawPitot(ctx){
    const items = [], y = PITOT_Y, z = WZ - 7;
    items.push(g.box(30, y - 5, z - 4, 78, y + 5, WZ, '#2c2926', .8));
    items.push(...g.rod([78, y, z], [178, y, z], 2.2, 'metal', 14, 10));
    items.push(...g.rod([178, y, z], [184, y, z], 1.4, 'metal', 8, 8));
    // two silicone tubes, total and static pressure, along the wing's underside into the pod
    [-1.6, 1.6].forEach((o, i) => {
      const out = [[30, y + o, z], [24, y + o, WZ - 2], [24, -150 + o, WZ - 2], [96, -POD_W - 1.5, WZ - 6 + o]];
      const inn = [[100, -POD_W + WALL + 1.5, WZ - 8 + o], [205, -34 + o, TRAY + 14], [212, -28 + o, TRAY + 4]];
      items.push(...g.wire(out, i ? '#d9e6f2' : '#f2d9d9', .9, 12), ...g.wire(inn, i ? '#d9e6f2' : '#f2d9d9', .9, 12));
    });
    const it = g.box(204, -34, TRAY, 222, -22, TRAY + 3, 'pcbBlue', .8);
    it.svg += g.text(213, -28, TRAY + 3.05, '4525', 3.4, '#f2efe7');
    items.push(it);
    const i2c = [[204, -28, TRAY + 2], [198, -18, TRAY + 7.6]];
    items.push(...g.wire(i2c, '#43a35a', .6, 5));
    ctx.flows.push({ kind: 'signal', pts: i2c.map(p => W(...p)) });
    // the airspeed check: puffs of breath into the tip and the reading rising, then falling back
    const t = ctx.st.test;
    if (t && t.kind === 'airspeed'){
      const u = Math.min(1, t.t / t.dur), v = 7.6 * Math.sin(Math.PI * u);
      for (let i = 0; i < 4; i++){
        const k = (t.t * 1.6 + i / 4) % 1, x = 250 - 60 * k, r = 2.4 + 2 * (1 - k);
        items.push({ box: SD.bbox([W(x - r, y - r, z - r), W(x + r, y + r, z + r)]), svg: `<circle cx="${f(SD.Pb(x, y, z)[0])}" cy="${f(SD.Pb(x, y, z)[1])}" r="${f(r * 1.6)}" fill="#d9e6f2" opacity="${(.85 * (1 - k)).toFixed(2)}" stroke="${INK}" stroke-width=".5"/>` });
      }
      items.push(pillAt([180, y, WZ + 130], { key: MSG.airspeed, vars: { v: v.toFixed(1) } }, '#fff4d6'));
    }
    return items;
  }

  /* ---------- TILT: the nacelles, the tilting motor mounts on their pivots, the tilt servos and pushrods ---------- */
  function drawTilt(ctx){
    const items = [], nac = SD.mat('pal'), st = ctx.st;
    ctx.craft.motors.slice(0, 2).forEach(mo => {
      const s = Math.sign(mo.y), y = mo.y, inb = -s;   // inb: the side towards the pod
      // the nacelle under the wing: a tapered fairing and a straight box to the fork
      const sec = (x, hw, z0) => [[x, y - hw, z0], [x, y + hw, z0], [x, y + hw, WZ], [x, y - hw, WZ]];
      items.push(loft(sec(10, 6, WZ - 8), sec(60, NAC_W, WZ - 20), nac));
      items.push(g.box(60, y - NAC_W, WZ - 20, 166, y + NAC_W, WZ, nac, 1));
      // the fork: a floor and two cheeks that carry the pivot axle
      items.push(g.box(166, y - 22, WZ - 8, 186, y + 22, WZ - 5, 'dark', .9));
      for (const c of [-1, 1]) items.push(g.box(166, y + c * 21 - 1.5, WZ - 5, 186, y + c * 21 + 1.5, PIV_Z + 5, 'dark', .9));
      items.push(...g.rod([PIV_X, y - 24, PIV_Z], [PIV_X, y + 24, PIV_Z], 1.8, 'metal', 20, 8));
      // the motor mount turns with the motor (its frame this frame), with a lever below the pivot
      const Mf = SD.motorFrame(mo, PIV_Z), o = Mf(0, 0, 0), ax = (a, b, h) => sub(Mf(a, b, h), o);
      items.push(g.oblock(Mf(0, 0, -2), ax(1, 0, 0), ax(0, 1, 0), ax(0, 0, 1), 16, 16, 2, 'dark', .9));
      const lever = Mf(-14, inb * 18, -10);
      items.push(...g.rod(Mf(0, inb * 18, -3), lever, 1.4, 'dark', 8, 6));
      // the metal-gear tilt servo on the nacelle's inboard side, horn forward, pushrod up to the lever
      const sy = y + inb * (NAC_W + 7);
      const body = g.box(118, sy - 6, WZ - 18, 148, sy + 6, WZ - 2, '#3e86d9', .9);
      items.push(body);
      const tilt = SD.poseOf(mo).tilt, hornA = rad(-50 + tilt * .8), shaft = [146, sy, WZ - 10];
      const tip = [shaft[0] + 8 * Math.sin(hornA), sy, shaft[2] + 8 * Math.cos(hornA)];
      items.push(...g.rod(shaft, tip, 1.3, 'white', 6, 6));
      items.push(...g.wire([tip, lever], 'metal', .9));
      const lead = [[118, sy, WZ - 10], [60, y + inb * 20, WZ - 3], [40, s * 70, WZ - 3], [40, s * (POD_W + 1), WZ - 8]];
      [['#6b4a32', -.9], ['#d8473a', 0], ['#f08a2b', .9]].forEach(([col, dz]) => items.push(...g.wire(lead.map(p => [p[0], p[1], p[2] + dz]), col, .55, 14)));
      ctx.flows.push({ kind: 'signal', pts: lead.slice().reverse().map(p => W(...p)) });
    });
    // during the tilt test: the thrust arrows along the front shafts and a pill that reads the mode and the angle
    const n = nacelle(st);
    if (n.phase){
      for (const mo of ctx.craft.motors.slice(0, 2)) items.push(thrustArrow(SD.motorFrame(mo, PIV_Z), n.phase === 'rev'));
      const deg = Math.round(Math.abs(n.tilt));
      const text = n.phase === 'up' ? MSG.rotorsUp : n.phase === 'manual' ? { key: MSG.manualTilt, vars: { n: deg } }
        : n.phase === 'back' ? { key: MSG.backTilt, vars: { n: deg } } : n.phase === 'yaw' ? MSG.yawRight
          : { key: MSG.revTilt, vars: { n: deg } };
      items.push(n.phase === 'rev' ? pillAt([PIV_X, 0, 320], text, '#e2483d', '#ffffff') : pillAt([PIV_X, 0, 320], text, '#fff4d6'));
    }
    return items;
  }
  function thrustArrow(Mf, bad){
    const base = Mf(0, 0, 44), tipT = Mf(0, 0, 100);
    const [X0, Y0] = SD.Pb(...base), [X1, Y1] = SD.Pb(...tipT), ang = Math.atan2(Y1 - Y0, X1 - X0), hs = 9, col = bad ? '#e2483d' : '#2f7d4f';
    const head = [0, 2.4, -2.4].map(d => `${f(X1 + Math.cos(ang + d) * hs)} ${f(Y1 + Math.sin(ang + d) * hs)}`).join('L');
    return { box: SD.bbox([W(...base), W(...tipT)], 2),
      svg: `<path d="M${f(X0)} ${f(Y0)}L${f(X1)} ${f(Y1)}" stroke="${INK}" stroke-width="5" stroke-linecap="round" fill="none"/>`
        + `<path d="M${f(X0)} ${f(Y0)}L${f(X1)} ${f(Y1)}" stroke="${col}" stroke-width="3.2" stroke-linecap="round" fill="none"/>`
        + `<path d="M${head}Z" fill="${col}" stroke="${INK}" stroke-width=".6"/>` };
  }

  /* ---------- ESC: two 40 A ESCs on the nacelles' outboard sides, one on the boom; their power and signal leads ---------- */
  function drawEscs(ctx){
    const items = [];
    for (const mo of ctx.craft.motors.slice(0, 2)){
      const s = Math.sign(mo.y), y0 = mo.y + s * NAC_W;
      items.push(g.box(40, Math.min(y0, y0 + s * 9), WZ - 18, 100, Math.max(y0, y0 + s * 9), WZ - 4, '#f08a2b', .9));
      // inside the pod to the side wall, then out under the wing to the ESC's back end
      const inn = [[145, s * 12, TRAY + 7.8], [120, s * 36, TRAY + 2], [100, s * (POD_W - WALL - 1.5), WZ - 10]];
      const out = [[96, s * (POD_W + 1.5), WZ - 7], [36, s * 120, WZ - 3], [34, y0 + s * 4, WZ - 8], [40, y0 + s * 4, WZ - 10]];
      for (const path of [inn, out]){
        items.push(...g.wire(path, '#d8473a', 1.6, 12), ...g.wire(path.map(p => [p[0], p[1], p[2] - 2.2]), '#2c2926', 1.6, 12));
        items.push(...g.wire(path.map(p => [p[0] + 2, p[1], p[2] + 1.6]), '#f4f1e8', .5, 12));
      }
      const all = [...inn, ...out];
      ctx.flows.push({ kind: 'power', pts: all.map(p => W(...p)) }, { kind: 'signal', pts: all.map(p => W(p[0] + 2, p[1], p[2] + 1.6)) });
    }
    const re = g.box(-282, BOOM_R + 1, BOOM_Z - 5, -232, BOOM_R + 11, BOOM_Z + 7, '#f08a2b', .9);
    re.svg += g.text(-257, BOOM_R + 6, BOOM_Z + 7.05, 'ESC', 5, '#2c2926');
    items.push(re);
    const rin = [[145, 10, TRAY + 7.8], [124, 32, TRAY], [-60, 32, FLOOR + 46], [POD_X0 + WALL + 2, 12, BOOM_Z + 2]];
    const rout = [[POD_X0 - 2, 10, BOOM_Z + 4], [-232, BOOM_R + 5, BOOM_Z + 2]];
    for (const path of [rin, rout]) items.push(...g.wire(path, '#d8473a', 1.6, 12), ...g.wire(path.map(p => [p[0], p[1] + 2.2, p[2] - 1]), '#2c2926', 1.6, 12));
    ctx.flows.push({ kind: 'power', pts: [...rin, ...rout].map(p => W(...p)) });
    return items;
  }

  /* ---------- WIRES: the three phase leads to each motor, with a slack loop across the tilt pivot ---------- */
  function drawWires(ctx){
    const items = [];
    ctx.craft.motors.forEach((mo, i) => {
      [-3, 0, 3].forEach(o => {
        let pts;
        if (i < 2){
          const s = Math.sign(mo.y), Mf = SD.motorFrame(mo, PIV_Z), y = mo.y + s * (NAC_W + 4.5);
          pts = [[100, y + o * .3, WZ - 11], [150, y + o * .3, WZ - 11], [170, mo.y + s * 26, WZ - 2], [172, mo.y + s * 25, PIV_Z - 6], Mf(-10, s * 10 + o, 1)];
        } else pts = [[-282, BOOM_R + 6 + o * .5, BOOM_Z + 1], [-294, 8 + o * .5, BOOM_Z + 6], [REAR_X - 8, 6 + o, REAR_Z + 1]];
        items.push(...g.wire(pts, '#33302c', 1.2, 8));
        ctx.flows.push({ kind: 'phase', motor: i, pts: pts.map(p => W(...p)) });
      });
    });
    return items;
  }

  SD.define({
    id: 'vtol', fig: '10', title: 'VTOL tiltrotor QuadPlane', palette: 'cobalt',
    mat: 1300, height: 230, explode: 34, log: 'ardupilot',
    calLabel: 'Calibrate accelerometer (6 positions)',
    bounds: [-300, 290, -260, 260, 0, 190],
    xrCaption: 'See-through: the wing, the hatch and the pod walls fade so the pack, the flight controller and the power path show.',
    frame: {
      layout: 'vtol',
      motors: [
        { id: 'M1', at: [PIV_X, -PIV_Y, PIV_Z], dir: 'CW' },
        { id: 'M2', at: [PIV_X, PIV_Y, PIV_Z], dir: 'CCW' },
        { id: 'M4', at: [REAR_X, 0, REAR_Z], dir: 'CW' },
      ],
      wing: { planform: [[LE, POD_W], [LE, TIP], [TE, TIP], [TE, POD_W]], t: TH, z: WZ },
      motorZ: PIV_Z,
    },
    design: {
      default: { batt: '4s2p-li', motor: '2810-1000', prop: '9x5' },
      batts: {
        '4s2p-li': { cells: 4, mah: 8000, size: [102, 60, 42], color: '#3f8f74', label: '4S2P LI-ION', chem: 'liion' },
        '4s-5000': { cells: 4, mah: 5000, size: [140, 46, 36], color: '#d9a520', label: '4S 5000' },
        '6s-4000': { cells: 6, mah: 4000, size: [140, 50, 44], color: '#e2483d', label: '6S 4000' },
      },
      motors: {
        '2810-1000': { stator: [28, 10], bell: [34.5, 22], kv: 1000, label: '2810 1000KV' },
        '2814-700': { stator: [28, 14], bell: [35, 26], kv: 700, label: '2814 700KV' },
        '2306-2400': { stator: [23, 6], bell: [27.9, 15.5], kv: 2400, label: '2306 2400KV' },
      },
      props: {
        '9x5': { d: 9, pitch: 5, blades: 2, color: '#d9c9a3', label: '9x5' },
        '10x5': { d: 10, pitch: 5, blades: 2, color: '#2c2926', label: '10x5' },
        '7x4': { d: 7, pitch: 4, blades: 2, color: '#f08a2b', label: '7x4' },
      },
    },
    parts: [
      { id: 'FRAME', short: 'FUSELAGE', name: 'Foam pod, carbon boom, skids and tail stand', z: 0,
        piece: { kind: 'custom', draw: drawFrame }, tag: { at: [-60, -POD_W, 110], dx: -40, dy: 60 },
        xr: [{ at: [-60, 0, BOOM_Z], text: 'CARBON BOOM INTO THE POD' }] },
      { id: 'TAIL', short: 'V-TAIL', name: 'V-tail, ruddervators and their servos', after: ['FRAME'], z: 1,
        piece: { kind: 'custom', draw: drawTail }, tag: { at: [-470, 70, 160], dx: -30, dy: -40 },
        xr: [{ at: [-421, 13, BOOM_Z + 8], text: 'RUDDERVATORS ON S7 S8 (79 / 80)' }] },
      { id: 'FC', short: 'FLIGHT CTRL', name: 'Matek H743-WING + ELRS receiver', after: ['FRAME'], z: 1.5,
        polar: ['arrow to the nose', 'arrow backwards'],
        piece: [
          { kind: 'standoffs', at: [[187.25, 15.25], [187.25, -15.25], [156.75, 15.25], [156.75, -15.25]], z0: TRAY, z1: TRAY + 6, r: 2.4, color: '#3d3b39' },
          { kind: 'board', at: [172, 0, TRAY + 6], size: [54, 36], t: 1.6, color: 'pcbBlack', holes: 30.5, arrow: true, arrowAt: [12, 0],
            chips: [{ at: [-6, 4], size: [10, 10, 1.3], label: 'H743' }, { at: [6, -10], size: [6, 5, 1], label: 'OSD' }, { at: [-18, -9], size: [4, 4, .9] }],
            pads: [{ at: [-24, -12], size: [4, 5] }, { at: [-24, 12], size: [4, 5] }, { at: [20, 15], size: [12, 2.4] }, { at: [20, -15], size: [12, 2.4] }],
            led: '#4aa3ff', ledAt: [22, 9], usb: [-27, 6] },
          { kind: 'module', at: [150, 30, TRAY], size: [14, 10, 3.5], color: 'pcbBlack', label: 'ELRS', labelSize: .3, led: '#43c463', ledAt: [4.5, 3] },
          { kind: 'antenna', at: [150, POD_W + 1, POD_Z1 - 14], type: 't', dir: [0, .55, .84], len: 30, spread: 50 },
          { kind: 'custom', draw: fcLeads },
        ],
        tag: { at: [180, -10, TRAY + 8], dx: 70, dy: -50 },
        xr: [{ at: [166, 4, TRAY + 10], text: 'H743-WING: SERVOS S1 S2, MOTORS S3-S5' }] },
      { id: 'XT60', short: 'XT60 + CAP', name: 'XT60 lead + 1000 µF 35 V low-ESR capacitor', after: ['FC'], z: 2,
        polar: ['stripe to minus', 'stripe to plus'],
        piece: { kind: 'xt60', at: [4, -29, FLOOR + 12], dir: [-1, 0, 0],
          lead: [[147, -13, TRAY + 8], [138, -35, TRAY + 4], [100, -36, FLOOR + 48], [30, -36, FLOOR + 48], [16, -31, FLOOR + 14], [12, -29, FLOOR + 12]],
          cap: { at: [150, -33, TRAY + 6], dir: [1, 0, 0], r: 5, l: 14, stripe: [0, -1, 0],
            leads: [[[150, -31, TRAY + 4], [146, -17, TRAY + 8]], [[150, -29, TRAY + 6], [148, -15, TRAY + 8]]] } },
        tag: { at: [4, -29, FLOOR + 16], dx: 40, dy: 70 }, xr: [{ at: [157, -33, TRAY + 12], text: '1000 µF 35 V ACROSS THE PADS' }] },
      { id: 'GPS', short: 'GPS', name: 'M10 GPS + compass on a mast', after: ['FC'], z: 2.5,
        piece: { kind: 'custom', draw: drawGps }, tag: { at: [GPS_X, 0, GPS_Z + 9], dx: -30, dy: -50 },
        xr: [{ at: [GPS_X, 0, GPS_Z + 9], text: 'M10 + COMPASS, AWAY FROM THE POWER LEADS' }] },
      { id: 'CAM', short: 'CAMERA', name: 'FPV camera + 800 mW VTX', after: ['FC'], z: 2,
        piece: [{ kind: 'camera', at: [POD_X1 + 46, 0, 86], size: 19, tilt: 8, depth: 12 },
          { kind: 'module', at: [-112, -14, POD_Z1], size: [30, 22, 6], color: 'pcb', label: 'VTX', labelSize: .3, led: '#e2483d', ledAt: [-11, 7] },
          { kind: 'antenna', at: [-124, -18, POD_Z1 + 6], type: 'lollipop', dir: [-.45, -.3, .84], len: 34, head: 8 },
          { kind: 'custom', draw: camLeads }],
        tag: { at: [POD_X1 + 40, 0, 98], dx: 60, dy: -30 }, xr: [{ at: [-112, -14, POD_Z1 + 6], text: 'VTX: 25 MW ON THE BENCH, 800 MW MAX' }] },
      { id: 'WING', short: 'WING', name: 'Wing: carbon spar, ailerons, aileron servos', after: ['FRAME'], z: 3, cover: true,
        piece: { kind: 'custom', draw: drawWing }, tag: { at: [0, 480, WZ + 10], dx: 40, dy: -50 },
        xr: [{ at: [LE - .25 * C, 300, WZ + 8], text: 'CARBON SPAR; AILERONS ON S9 S10' }] },
      { id: 'ARSPD', short: 'AIRSPEED', name: 'Pitot tube + ASPD-4525 sensor', after: ['WING', 'FC'], z: 3.4,
        piece: { kind: 'custom', draw: drawPitot }, tag: { at: [180, PITOT_Y, WZ - 7], dx: 50, dy: 40 },
        xr: [{ at: [213, -28, TRAY + 4], text: 'MS4525DO ON I2C (ARSPD_TYPE 1)' }] },
      { id: 'TILT', short: 'TILT SERVOS', name: 'Nacelles, tilt mounts and metal-gear tilt servos', after: ['WING'], z: 3.6,
        polar: ['servos checked', 'servos reversed'], mistake: 'servo-reversed',
        piece: { kind: 'custom', draw: drawTilt }, tag: { at: [140, PIV_Y, WZ - 6], dx: -60, dy: 50 },
        xr: [{ at: [133, -PIV_Y + 18, WZ - 4], text: 'Q_TILT_TYPE 2: VECTORED YAW' }] },
      { id: 'MOTORS', short: 'MOTORS', name: '3 brushless motors: M1, M2 tilting, M4 fixed', after: ['TILT'], z: 4,
        piece: { kind: 'motors' }, tag: { at: [PIV_X, PIV_Y, PIV_Z + 24], dx: 50, dy: -40 },
        xr: [{ at: [REAR_X, 0, REAR_Z + 14], text: 'M1 FRONT RIGHT, M2 FRONT LEFT, M4 REAR: NO M3' }] },
      { id: 'ESC', short: 'ESCS', name: '3 x 40 A ESCs (AM32)', after: ['TILT'], z: 3.8,
        piece: { kind: 'custom', draw: drawEscs }, tag: { at: [-257, BOOM_R + 6, BOOM_Z + 7], dx: 40, dy: 50 } },
      { id: 'WIRES', short: 'MOTOR WIRES', name: 'Motor wires with a slack loop across each pivot', after: ['MOTORS', 'ESC'], z: 4.2,
        piece: { kind: 'custom', draw: drawWires }, tag: { at: [160, -PIV_Y - 18, WZ - 8], dx: 40, dy: 50 },
        xr: [{ at: [172, -PIV_Y - 25, PIV_Z - 6], text: 'SLACK ACROSS THE PIVOT' }] },
      { id: 'BATT', short: 'BATTERY', name: 'Battery, slid under the wing to the CG', after: ['XT60'], z: 2.6, cover: true,
        piece: { kind: 'battery', at: [BATT_X, 0, FLOOR], strap: true, pad: true },
        tag: { at: [BATT_X, 0, FLOOR + 42], dx: -40, dy: -60 }, xr: [{ at: [BATT_X, 0, FLOOR + 44], text: 'THE PACK SITS ON THE CG' }] },
      { id: 'HATCH', short: 'HATCH', name: 'Nose hatch', after: ['BATT', 'ARSPD'], z: 5, cover: true,
        piece: [{ kind: 'box', at: [175, 0, POD_Z1], size: [110, 90, 4], color: 'pal' }, { kind: 'box', at: [214, 0, POD_Z1 + 4], size: [10, 24, 2], color: 'dark' }],
        tag: { at: [200, 30, POD_Z1 + 4], dx: 60, dy: -40 } },
      { id: 'PROPS', short: 'PROPS', name: 'Propellers: front pair counter-rotating', after: ['MOTORS', 'HATCH', 'TILT'], z: 5.5,
        polar: ['front pair opposite (correct)', 'swapped CW/CCW'],
        piece: { kind: 'props' }, tag: { at: [PIV_X + 90, -PIV_Y, PIV_Z + 36], dx: 40, dy: -30 } },
    ],
    tests: {
      smoke: { needs: ['XT60', 'ESC'], at: [330, 70] },
      motors: { needs: ['WIRES', 'FC'] },
      calibrate: { needs: ['FC'] },
      plug: { needs: ['BATT', 'XT60'] },
    },
    buttons: [
      { id: 'tilt', label: 'Tilt servo test', onClick: tiltTest },
      { id: 'airspeed', label: 'Check airspeed', onClick: airspeedTest },
      { id: 'prearm', label: 'Pre-arm checks', onClick: prearmTest },
    ],
    report,
    reset,
    // the front pair tilts with the nacelles during the tilt test; the loop keeps drawing until it ends
    motorPose: (st, i) => {
      if (i > 1) return null;
      const n = nacelle(st);
      return { tilt: n.tilt + (i === 0 ? -n.yaw : n.yaw) };
    },
    animating: tilting,
    inside: [
      { at: [LE - .25 * C, 110, WZ + 14], text: 'CG MARK: A QUARTER OF THE CHORD', part: 'WING' },
    ],
    wiring: {
      nodes: {
        BATT: { at: [10, 22], title: 'BATTERY', sub: 'batt', color: 'tomato' },
        XT60: { at: [10, 145], title: 'XT60 + CAP', sub: '1000 µF 35 V', color: 'tomato' },
        GPS: { at: [205, 22], title: 'GPS + COMPASS', sub: 'M10 on a mast', color: '#43a35a' },
        ESC: { at: [205, 145], title: 'ESCS X3', sub: '40 A, AM32', color: '#f08a2b' },
        MOTORS: { at: [205, 268], title: 'MOTORS', sub: 'motor', color: '#f08a2b' },
        CAM: { at: [405, 22], title: 'CAMERA + VTX', sub: 'analog, 8° up', color: '#f2c230', led: '#e2483d' },
        FC: { at: [405, 145], title: 'FLIGHT CTRL', sub: 'H743-WING, ArduPlane', color: '#3e86d9', led: '#4aa3ff' },
        WING: { at: [405, 268], title: 'AILERONS', sub: '2 servos', color: '#43a35a' },
        ARSPD: { at: [600, 22], title: 'AIRSPEED', sub: 'ASPD-4525 + pitot', color: '#43a35a' },
        TILT: { at: [600, 145], title: 'TILT SERVOS', sub: 'front nacelles', color: '#43a35a' },
        TAIL: { at: [600, 268], title: 'V-TAIL', sub: '2 ruddervator servos', color: '#43a35a' },
      },
      edges: [
        { from: 'BATT', to: 'XT60', kind: 'power', n: 2, label: 'V' },
        { from: 'XT60', to: 'ESC', kind: 'power', n: 2, label: 'VBAT x3', labelAt: [0, 40] },
        { from: 'ESC', to: 'MOTORS', kind: 'phase', n: 3, label: '3-phase x3' },
        { from: 'FC', to: 'ESC', kind: 'signal', label: 'DShot600 S3-S5', labelAt: [0, 40] },
        { from: 'FC', to: 'TILT', kind: 'signal', label: 'S1 S2', labelAt: [-7, -6] },
        { from: 'FC', to: 'TAIL', kind: 'signal', label: 'S7 S8', a: [555, 190] },
        { from: 'FC', to: 'WING', kind: 'signal', label: 'S9 S10' },
        { from: 'GPS', to: 'FC', kind: 'signal', label: 'UART + I2C', a: [355, 50], via: [[392, 50], [392, 112], [430, 112]], b: [430, 145], labelAt: [-36, 30] },
        { from: 'ARSPD', to: 'FC', kind: 'signal', label: 'I2C', a: [600, 40], via: [[592, 40], [592, 156]], b: [555, 156], labelAt: [-12, 0] },
        { from: 'CAM', to: 'FC', kind: 'video', label: 'CAM + VTX' },
      ],
    },
  });
})();
