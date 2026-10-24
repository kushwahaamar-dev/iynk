// @cf title FPV flying wing on INAV
// @cf use engine/drone.js
// @cf use engine/drone-geo.js
// @cf use engine/drone-frames.js
// @cf use engine/drone-pieces.js
// @cf use engine/drone-sheet.js
/* Fig. 09, the 900 mm FPV flying wing on INAV 9.1 (docs/facts/wing.md). Planform from the fact sheet: root chord
   300 mm (LE x +125, TE x -175 at y = 40), tip chord 155 mm (LE -95, TE -250 at y = 450), 28 deg LE sweep, 55 mm
   constant-chord elevons from y = 120 to the tip, winglets, a 305 x 84 x 54 mm pod, one pusher motor behind the
   centre section. SpeedyBee F405 WING style FC + PDB: motor on S1, elevon servos on S3 / S4, ELRS on UART1, GPS on
   UART3 + I2C1. Craft-local mm: x forward, y left, z up, z = 0 on the mat (the pod belly), chord plane at Z0. */
(() => {
  const SD = SL.drone, g = SD.g, W = SD.W;
  const Z0 = 14, YR = 42, YI = 120, YT = 450, HINGE = 55, SERVO_Y = 175, HORN_Y = 186;
  const xLE = y => 125 - 220 * (y - 40) / 410;
  const xTE = y => -175 - 75 * (y - 40) / 410;
  const xH = y => xTE(y) + HINGE;
  const zc = y => Z0 + 3 - 1.5 * (y - 40) / 410;            // camber line: top 12 / bottom -6 at the root
  const hh = y => 9 - 4.5 * (y - 40) / 410;                 // half thickness at 30 % chord
  // NACA four-digit thickness shape, 1 at 30 % chord
  const dn = u => { u = Math.max(0, Math.min(1, u)); return (0.2969 * Math.sqrt(u) - 0.126 * u - 0.3516 * u * u + 0.2843 * u ** 3 - 0.1015 * u ** 4) / 0.1; };
  const topAt = (x, y) => { const c = xLE(y) - xTE(y); return zc(y) + hh(y) * dn((xLE(y) - x) / c); };
  const MOTOR_X = -168, MOTOR_Z = 32;                        // mount face and shaft height
  const rad = d => d * Math.PI / 180;
  const FOAM = matOf('#ece6d6');

  /* ---------- solids: lofts between two matching sections, shaded like core's loft, one silhouette ink ---------- */
  function solid(A, B, m, caps = [false, false], w = 1.2){
    const n = A.length, all = [...A, ...B], cen = avg(all), faces = [];
    for (let i = 0; i < n; i++){ const j = (i + 1) % n; faces.push([A[i], A[j], B[j], B[i]]); }
    if (caps[0]) faces.push(A.slice());
    if (caps[1]) faces.push(B.slice());
    let s = '';
    for (const fc of faces){
      let nr = [0, 0, 0];
      for (let i = 1; i < fc.length - 1 && !(Math.abs(nr[0]) + Math.abs(nr[1]) + Math.abs(nr[2]) > 1e-9); i++)
        nr = cross(sub(fc[i], fc[0]), sub(fc[i + 1], fc[0]));
      if (!(Math.abs(nr[0]) + Math.abs(nr[1]) + Math.abs(nr[2]) > 1e-9)) continue;
      nr = norm(nr);
      if (dot(nr, sub(avg(fc), cen)) < 0) nr = nr.map(v => -v);
      if (vis(nr)) s += face(pd(fc.map(p => W(...p))), tone(nr, m));
    }
    const pts = all.map(p => W(...p));
    return { box: SD.bbox(pts), svg: s + hullInk(pts, w) };
  }
  const fade = (it, op) => op < .999 ? { box: it.box, svg: `<g opacity="${op.toFixed(3)}">${it.svg}</g>` } : it;

  // airfoil section at span station y (s = side), from the leading edge to `aft` (an x on the chord)
  const FR = [.025, .08, .18, .32, .5, .7, .86, 1];
  function section(y, s, aft){
    const le = xLE(y), c = le - xTE(y), ua = (le - aft) / c;
    const us = FR.map(k => k * ua);
    const up = us.map(u => [le - u * c, s * y, zc(y) + hh(y) * dn(u)]);
    const lo = us.slice().reverse().map(u => [le - u * c, s * y, zc(y) - hh(y) * dn(u)]);
    return [[le, s * y, zc(y)], ...up, ...lo];
  }
  // elevon section, hinge to trailing edge
  function elevSection(y, s){
    const le = xLE(y), te = xTE(y), c = le - te, uh = (le - xH(y)) / c, um = uh + (1 - uh) * .5;
    return [[xH(y), s * y, zc(y) + hh(y) * dn(uh)], [le - um * c, s * y, zc(y) + hh(y) * dn(um)], [te, s * y, zc(y) + .5],
      [te, s * y, zc(y) - .5], [le - um * c, s * y, zc(y) - hh(y) * dn(um)], [xH(y), s * y, zc(y) - hh(y) * dn(uh)]];
  }
  // rotate p about the axis a -> b by th radians (Rodrigues)
  function rotAxis(p, a, b, th){
    const k = norm(sub(b, a)), v = sub(p, a), c = Math.cos(th), sn = Math.sin(th), kv = cross(k, v), kd = dot(k, v);
    return [0, 1, 2].map(i => a[i] + v[i] * c + kv[i] * sn + k[i] * kd * (1 - c));
  }
  const hingeAxis = s => [[xH(YI), s * YI, zc(YI)], [xH(YT), s * YT, zc(YT)]];

  /* ---------- the craft's own bench checks: elevons (sticks + stabiliser) and CG ---------- */
  const ELEV_T = 4.5, CG_T = 2.4, REFLEX = 2;
  const phaseOf = t => t < 1.5 ? 0 : t < 3 ? 1 : 2;
  const bump = t => Math.sin(Math.PI * Math.min(1, Math.max(0, (t % 1.5) / 1.5)));
  // elevon deflections in degrees, trailing edge up positive: [left, right]
  function deflections(st){
    const t = st.test;
    if (!t || t.kind !== 'elevons') return [REFLEX, REFLEX];
    const srv = SD.orient(st, 'SERVOS') === 1 ? -1 : 1, fc = SD.orient(st, 'FC') === 1 ? -1 : 1, a = 18 * bump(t.t), ph = phaseOf(t.t);
    if (ph === 0) return [REFLEX + srv * a, REFLEX + srv * a];                         // stick back: both up
    if (ph === 1) return [REFLEX - srv * a, REFLEX + srv * a];                         // stick right: right up, left down
    return [REFLEX + srv * fc * a * .8, REFLEX - srv * fc * a * .8];                   // right wing pushed down: right elevon down
  }
  const PHASES = ['STICK BACK', 'STICK RIGHT', 'TILT RIGHT WING DOWN'];
  const CGS = { ok: 'Balanced: it hangs level on two fingertips at the CG marks (15-20 % of the mean chord)',
    nose: 'Slightly nose-heavy: the nose dips a little. That is the safe side: stable, it just needs a bit more speed',
    tail: 'Tail-heavy: the tail drops when you balance it on two fingertips at the CG marks. It will pitch up and stall. Move the pack forward or add nose weight' };

  function wingState(st){ return st.wing || (st.wing = { elev: null, cg: null }); }
  const powered = st => SD.powered(st);

  function checkElevons(api){
    const st = api.st;
    if (!st) return;
    if (st.test || (st.queue && st.queue.length)) return api.say('Wait for the test to finish', 1600, 'tick');
    if (!api.isOn('SERVOS') || !api.isOn('FC') || !api.isOn('RX')) return api.say('Fit the servos, the flight controller and the receiver first', 2400, 'buzz');
    if (st.exT || st.ex > .01) return api.say('Close the exploded view first', 2000, 'buzz');
    if (!powered(st)) return api.say('Plug in the battery: the servos run from the FC’s servo BEC', 2600, 'buzz');
    const srv = api.orient('SERVOS'), fc = api.orient('FC');
    const ok = srv === 0 && fc === 0;
    const msg = srv === 1 ? 'Stick back should lift BOTH elevons. Yours went DOWN: servos reversed. Fix it: Add next part, SERVOS: direction checked'
      : fc === 1 ? 'The sticks move the elevons the right way, but the stabiliser pushes the wrong way: the FC arrow points backwards. Fix it: Add next part, FLIGHT CTRL: arrow to the nose'
        : 'Stick back: both elevons up. Stick right: right elevon up, left down. Right wing pushed down: the right elevon went down to lift it. Correct';
    st.test = { kind: 'elevons', t: 0, dur: ELEV_T };
    st.later.push({ t: ELEV_T, say: msg, sfx: ok ? 'ding' : 'buzz' });
    wingState(st).elev = { ok, srv, fc };
    api.log('$ INAV Outputs tab: stick back, stick right, then tilt the wing in ANGLE');
    api.log(ok ? 'elevons: stick and stabiliser directions correct' : srv === 1 ? 'elevons: REVERSED (servo direction)' : 'elevons: stabiliser reversed (board alignment)');
    api.sfx('click');
  }

  function checkCG(api){
    const st = api.st;
    if (!st) return;
    if (st.test || (st.queue && st.queue.length)) return api.say('Wait for the test to finish', 1600, 'tick');
    if (!api.isOn('BATT')) return api.say('Put the battery in first: in a wing the battery IS the balance', 2600, 'buzz');
    if (st.exT || st.ex > .01) return api.say('Close the exploded view first', 2000, 'buzz');
    const key = st.design.batt, cg = (SD.craft().design.batts[key] || {}).cg || 'ok';
    st.test = { kind: 'cg', t: 0, dur: CG_T, cg };
    st.later.push({ t: CG_T, say: CGS[cg], sfx: cg === 'tail' ? 'buzz' : 'ding' });
    wingState(st).cg = { ok: cg !== 'tail', cg, batt: key };
    api.log('$ CG check: balance on two fingertips at the CG marks');
    api.log(cg === 'tail' ? 'CG: tail-heavy, not safe to fly' : cg === 'nose' ? 'CG: slightly nose-heavy (safe side)' : 'CG: balanced at 15-20 % MAC');
    api.sfx('click');
  }

  // compass, virtual airspeed and failsafe: short bench checks with their own prerequisites
  const SIMPLE = {
    compass: { needs: ['GPS', 'FC'], needMsg: 'Fit the GPS and the flight controller first', dur: 2.4, pill: 'ROTATE IT THROUGH EVERY AXIS',
      log: ['$ Calibration tab: compass, 30 s, every axis', 'compass calibrated (QMC5883 on I2C1)'],
      done: 'Compass calibrated: turned through every axis, away from the ESC and the battery leads. Check the heading against a real compass' },
    airspeed: { needs: ['GPS', 'FC'], needMsg: 'Fit the GPS and the flight controller first', dur: 1.6, pill: 'AIRSPEED FROM GPS + WIND',
      log: ['$ set pitot_hardware = VIRTUAL', 'virtual airspeed: GPS speed corrected for the wind estimate'],
      done: 'Virtual airspeed on: INAV estimates airspeed from GPS speed and the wind (pitot_hardware = VIRTUAL). A real pitot tube would need zeroing with the tube covered' },
    failsafe: { needs: ['RX', 'FC'], needMsg: 'Fit the receiver and the flight controller first', dur: 3, pill: 'RADIO OFF: FAILSAFE, THEN RTH', props: true,
      log: ['$ radio off with the prop off: watch the OSD', 'FAILSAFE after 0.5 s: failsafe_procedure = RTH'],
      done: 'Radio off: FAILSAFE after 0.5 s, then RTH climbs and flies home. Radio back on: you get control back once the sticks move' },
  };
  function simpleCheck(id){
    const c = SIMPLE[id];
    return api => {
      const st = api.st;
      if (!st) return;
      if (st.test || (st.queue && st.queue.length)) return api.say('Wait for the test to finish', 1600, 'tick');
      const miss = c.needs.find(n => !api.isOn(n));
      if (miss) return api.say(c.needMsg, 2200, 'buzz');
      if (st.exT || st.ex > .01) return api.say('Close the exploded view first', 2000, 'buzz');
      if (c.props && api.isOn('PROPS')) return api.say('PROPS OFF! The motor can spin up when failsafe starts RTH', 2800, 'buzz');
      if (!powered(st)) return api.say('Plug in the battery first', 2200, 'buzz');
      st.test = { kind: id, t: 0, dur: c.dur };
      st.later.push({ t: c.dur, say: c.done, sfx: 'ding' });
      wingState(st)[id] = true;
      for (const line of c.log) api.log(line);
      api.sfx('click');
    };
  }

  // what the host reads for the wing's own checks (docs/requests/item-wing.md asks the engine to report it as `extra`)
  function wingReport(st){
    const w = st.wing || {}, e = w.elev, c = w.cg;
    const elevonOk = !!(e && e.ok && SD.isOn(st, 'SERVOS') && SD.isOn(st, 'FC') && SD.orient(st, 'SERVOS') === e.srv && SD.orient(st, 'FC') === e.fc);
    const cgFresh = !!(c && SD.isOn(st, 'BATT') && st.design.batt === c.batt);
    const fresh = id => !!w[id] && SIMPLE[id].needs.every(n => SD.isOn(st, n));
    const cgOk = cgFresh && c.ok;
    return { elevonOk, cgOk, cg: cgFresh ? c.cg : null, compassOk: fresh('compass'), airspeedOk: fresh('airspeed'), failsafeOk: fresh('failsafe'),
      ready: elevonOk && cgOk };
  }

  /* ---------- pill for the check phases (screen px through the ink scale) ---------- */
  function pillAt(p3, text, fill){
    const [X, Y] = P(...W(...p3)), fs = 8.6 * INK_K, h = fs * 1.8, t = CF_T(text), w = CF_TW(t, fs) + fs * 1.5;
    return `<g class="dpill"><rect x="${f(X - w / 2)}" y="${f(Y - h / 2)}" width="${f(w)}" height="${f(h)}" rx="${f(h / 2)}" fill="${fill}" stroke="${INK}" stroke-width="1.2"/>`
      + `<text x="${f(X)}" y="${f(Y + fs * .36)}" font-size="${f(fs)}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="800" letter-spacing=".04em" fill="${INK}">${CF_ESC(t)}</text></g>`;
  }

  /* ---------- FRAME: wing panels, elevons, winglets, centre section, pod, nose, motor mount, CG marks ---------- */
  function drawFrame(ctx){
    const st = ctx.st, k = ctx.k, items = [];
    if (PALS[st.pal]) SD.G.pal = st.pal;                      // follow the palette swatch (engine pieces read 'pal' too)
    const m = SD.mat('pal'), elev = matOf(mix(m.l, '#000000', .12)), tipM = matOf(mix(m.l, '#000000', .3));
    const op = 1 - .45 * k;
    const [dL, dR] = deflections(st);
    for (const s of [1, -1]){
      // inner panel, root to the start of the elevon, full chord
      items.push(fade(solid(section(YR, s, xTE(YR)), section(YI, s, xTE(YI)), m, [true, false]), op));
      // outer panel ahead of the hinge, cut into strips so the servo and horn sort cleanly
      const cuts = [YI, 160, 190, 300, YT];
      for (let i = 0; i < cuts.length - 1; i++)
        items.push(fade(solid(section(cuts[i], s, xH(cuts[i])), section(cuts[i + 1], s, xH(cuts[i + 1])), m, [false, i === cuts.length - 2]), op));
      // elevons, rotated about the swept hinge line
      const [a, b] = hingeAxis(s), th = s * rad(s > 0 ? dL : dR);
      const ecuts = [YI, 200, 320, YT];
      for (let i = 0; i < ecuts.length - 1; i++){
        const A = elevSection(ecuts[i], s).map(p => rotAxis(p, a, b, th)), B = elevSection(ecuts[i + 1], s).map(p => rotAxis(p, a, b, th));
        items.push(fade(solid(A, B, elev, [i === 0, i === ecuts.length - 2], 1), op));
      }
      // winglet just outboard of the tip
      const wl = [[-150, Z0 + 4], [-250, Z0 + 2], [-262, Z0 + 118], [-212, Z0 + 118]];
      items.push(solid(wl.map(([x, z]) => [x, s * YT, z]), wl.map(([x, z]) => [x, s * (YT + 4), z]), tipM, [true, true], 1.2));
      // CG mark on the top skin: 15-20 % of the mean chord, about 35 mm ahead of the root chord's mid-point
      const cx = 35, cy = s * 100, cz = topAt(cx, 100) + .25, live = st.test && st.test.kind === 'cg';
      const col = live ? (st.test.cg === 'tail' ? '#e2483d' : '#43a35a') : '#231e16';
      const ring = Array.from({ length: 16 }, (_, i) => { const t = i / 16 * 2 * Math.PI; return W(cx + 7 * Math.cos(t), cy + 7 * Math.sin(t), cz); });
      const q = (a0, a1) => [W(cx, cy, cz), ...Array.from({ length: 5 }, (_, i) => { const t = a0 + (a1 - a0) * i / 4; return W(cx + 7 * Math.cos(t), cy + 7 * Math.sin(t), cz); })];
      items.push({ box: SD.bbox(ring, .3), svg: `<path d="${pd(ring)}" fill="#f7f3ea" stroke="${col}" stroke-width="${live ? 1.4 : .8}"/>`
        + `<path d="${pd(q(0, Math.PI / 2))}" fill="${col}"/><path d="${pd(q(Math.PI, 1.5 * Math.PI))}" fill="${col}"/>`
        + (live ? `<path d="${pd(ring)}" fill="none" stroke="${col}" stroke-width="3" opacity=".35"/>` : '') });
    }
    // centre section behind the pod (the motor notch is cut into its trailing edge)
    const cs = y => { const c = 300, u = x => (125 - x) / c;
      return [[-70, y, zc(40) + hh(40) * dn(u(-70))], [-110, y, zc(40) + hh(40) * dn(u(-110))], [-150, y, zc(40) + hh(40) * dn(u(-150))],
        [-150, y, zc(40) - hh(40) * dn(u(-150))], [-110, y, zc(40) - hh(40) * dn(u(-110))], [-70, y, zc(40) - hh(40) * dn(u(-70))]]; };
    items.push(fade(solid(cs(-YR), cs(YR), m), op));
    // pod: an open tub (floor and four walls); the hatch (TOP) closes it
    items.push(g.box(-70, -42, 0, 235, 42, 4, FOAM, 1));
    items.push(g.box(-70, -42, 4, -64, 42, 54, FOAM, 1), g.box(229, -42, 4, 235, 42, 54, FOAM, 1));
    items.push(g.box(-64, 36, 4, 229, 42, 54, FOAM, 1), g.box(-64, -42, 4, 229, -36, 54, FOAM, 1));
    // nose fairing in front of the pod, camera window
    items.push(g.box(235, -30, 6, 252, 30, 46, FOAM, 1.1));
    // motor mount on the centre section's trailing edge
    items.push(g.box(-168, -13, 18, -150, 13, 46, 'dark', .9));
    if (k > .3){
      // see-through: the carbon spar inside the foam, swept with the quarter-chord line
      for (const s of [1, -1]) items.push(...g.rod([30, s * 44, zc(44)], [-128, s * 410, zc(410)], 2.2, 'carbon', 40, 8));
    }
    if (st.test && st.test.kind === 'elevons'){
      items.push({ box: [W(150, -6, 140), W(162, 6, 142)], svg: pillAt([40, 0, 150], PHASES[phaseOf(st.test.t)], '#fff4d6') });
    }
    if (st.test && SIMPLE[st.test.kind]) items.push({ box: [W(150, -6, 140), W(162, 6, 142)], svg: pillAt([40, 0, 150], SIMPLE[st.test.kind].pill, '#fff4d6') });
    if (st.test && st.test.kind === 'cg'){
      const cg = st.test.cg, text = cg === 'tail' ? 'TAIL DROPS' : cg === 'nose' ? 'NOSE DIPS A LITTLE' : 'HANGS LEVEL';
      items.push({ box: [W(150, -6, 140), W(162, 6, 142)], svg: pillAt([35, 0, 150], text, cg === 'tail' ? '#f6b2a8' : '#d6f0dc') });
    }
    return items;
  }

  /* ---------- SERVOS: two 9 g servos on the top skin, arms, pushrods and the horns on the elevons ---------- */
  function drawServos(ctx){
    const st = ctx.st, items = [], [dL, dR] = deflections(st);
    for (const s of [1, -1]){
      const y = s * SERVO_Y, z0 = zc(160) + hh(160) + .35;
      items.push(g.box(-54, y - 6, z0, -31, y + 6, z0 + 10, '#2c2926', .9));
      items.push(g.box(-57, y - 6, z0 + 6, -28, y + 6, z0 + 7.5, '#2c2926', .7));             // mounting flange
      items.push(g.cyl(-38, y, z0 + 10, z0 + 12, 2.4, 'white', 10, .7));
      // horn on the elevon, turned with it
      const [a, b] = hingeAxis(s), th = s * rad(s > 0 ? dL : dR), hy = s * HORN_Y, hx = xH(HORN_Y) - 9;
      const base = rotAxis([hx, hy, topAt(hx, HORN_Y)], a, b, th), top = rotAxis([hx, hy, topAt(hx, HORN_Y) + 13], a, b, th);
      items.push(...g.rod(base, top, 1.3, 'white', 6, 6));
      // servo arm: its tip follows the pushrod
      const rest = rotAxis([hx, hy, topAt(hx, HORN_Y) + 13], a, b, s * rad(REFLEX)), shift = top[0] - rest[0];
      const tip = [-38 + Math.max(-7, Math.min(7, shift)), s * (SERVO_Y + Math.sqrt(Math.max(0, 121 - shift * shift))), z0 + 12.5];
      items.push(...g.rod([-38, y, z0 + 12.5], tip, 1.4, 'white', 8, 6));
      items.push(...g.rod(tip, top, .7, 'metal', 14, 6));
    }
    return items;
  }

  /* ---------- MOTORS: pusher outrunner on the mount, shaft pointing aft ---------- */
  function motorDims(ctx){ const mo = ctx.design.motor; return { R: mo.bell[0] / 2, len: mo.bell[1], stator: mo.stator }; }
  function drawMotor(ctx){
    const items = [], { R, len, stator } = motorDims(ctx), x0 = MOTOR_X - 3, x1 = x0 - len, z = MOTOR_Z, k = ctx.k;
    items.push(...g.rod([MOTOR_X, 0, z], [x0, 0, z], R - 1, 'dark', 10, 18));
    const bell = g.rod([x0, 0, z], [x1, 0, z], R, 'pal', 60, 22);
    if (k > 0){
      items.push(...g.rod([x0 - 1, 0, z], [x0 - 1 - stator[1], 0, z], stator[0] / 2, 'copper', 30, 16));
      for (const it of bell) items.push(fade(it, 1 - .6 * k));
    } else items.push(...bell);
    // three spokes on the aft face turn with the motor (CCW seen from behind when spin grows)
    const a = (ctx.spin && ctx.spin[0]) || 0, xf = x1 - .2;
    const rr = (r, t) => W(xf, -r * Math.cos(t), z + r * Math.sin(t));
    let spk = '';
    for (let j = 0; j < 3; j++){ const t = a + j * 2 * Math.PI / 3; spk += `<path d="${pd([rr(3.5, t), rr(R - 2.5, t)], false)}" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`; }
    if (vis([-1, 0, 0])) items.push({ box: SD.bbox([W(xf - .5, -R, z - R), W(xf, R, z + R)]), svg: spk });
    if (!SD.isOn(ctx.st, 'PROPS')) items.push(...g.rod([x1, 0, z], [x1 - 9, 0, z], 2.5, 'metal', 10, 10));
    ctx.shadows.push([[MOTOR_X, -R], [x1, -R], [x1, R], [MOTOR_X, R]].map(([x, y]) => W(x, y, z - R)));
    return items;
  }

  /* ---------- PROPS: 2-blade pusher; "mounted backwards" puts the printed face and the rounded edge aft ---------- */
  function drawProp(ctx){
    const items = [], { len } = motorDims(ctx), xp = MOTOR_X - 3 - len - 6, z = MOTOR_Z, R = ctx.design.prop.d * 25.4 / 2;
    const col = SD.colOf(ctx.design.prop.color || '#2c2926'), back = ctx.orient === 1, rpm = (ctx.rpm && ctx.rpm[0]) || 0;
    if (rpm > .12){
      const ring = Array.from({ length: 30 }, (_, i) => { const t = i / 30 * 2 * Math.PI; return W(xp, -R * Math.cos(t), z + R * Math.sin(t)); });
      items.push({ box: SD.bbox(ring, 1), svg: `<path d="${pd(ring)}" fill="${col}" opacity="${(.16 + .2 * rpm).toFixed(3)}" stroke="${INK}" stroke-width=".6"/>` });
    } else {
      // parked level (blades along y), the way you leave a pusher on the bench
      const pitch = rad(14), dirSpin = 1;                   // CCW seen from behind: the upper blade moves to +y
      for (let j = 0; j < 2; j++){
        const t = j * Math.PI, rh = [0, -Math.cos(t), Math.sin(t)], tg = [0, Math.sin(t) * dirSpin, Math.cos(t) * dirSpin];
        const chord = norm([Math.sin(pitch), tg[1] * Math.cos(pitch), tg[2] * Math.cos(pitch)]), nn = norm(cross(rh, chord));
        const segs = [[8, .38 * R, 7], [.38 * R, .72 * R, 8.5], [.72 * R, R, 5.5]];
        for (const [r0, r1, hc] of segs){
          const rm = (r0 + r1) / 2, o = [xp + rh[0] * rm, rh[1] * rm, z + rh[2] * rm];
          items.push(g.oblock(o, rh, chord, nn, (r1 - r0) / 2, hc, 1.1, col, .8));
          // the rounded leading edge: a light strip on the edge that leads the turn (aft edge when mounted backwards)
          const e = back ? -1 : 1, lo = [o[0] + chord[0] * hc * .82 * e, o[1] + chord[1] * hc * .82 * e, o[2] + chord[2] * hc * .82 * e];
          items.push(g.oblock(lo, rh, chord, nn, (r1 - r0) / 2 - .5, hc * .16, 1.25, mix(col, '#ffffff', .45), .3));
        }
        // the printed label faces the nose when it is right
        const lr = .55 * R, side = back ? -1 : 1, lo = [xp + side * 1.3, rh[1] * lr, z + rh[2] * lr];
        if (j === 0) items.push(g.oblock(lo, rh, chord, nn.map(v => v * side * Math.sign(nn[0] || 1)), 9, 3.2, .12, '#f2efe7', .3));
      }
    }
    const hub = g.rod([xp + 4, 0, z], [xp - 5, 0, z], 6.5, ctx.design.prop.color && /^#/.test(ctx.design.prop.color) ? ctx.design.prop.color : 'dark', 20, 14);
    items.push(...hub, ...g.rod([xp - 5, 0, z], [xp - 10, 0, z], 3.5, 'metal', 10, 8));
    return items;
  }

  /* ---------- WIRES: three phase leads with bullets, ESC to motor, out through the pod's rear wall ---------- */
  function drawWires(ctx){
    const items = [];
    [-4, 0, 4].forEach(dy => {
      const pts = [[-60, dy, 9], [-63, dy, 28], [-72, dy, 29], [-140, dy * 1.4, 28], [-156, dy * 1.6, 36], [-166, dy * 1.2, MOTOR_Z - 6]];
      items.push(...g.wire(pts, '#2a2724', 1.5));
      items.push(g.box(-118, dy * 1.4 - 1.4, 27, -110, dy * 1.4 + 1.4, 29.6, 'yellow', .5));   // 3.5 mm bullet sleeve
      ctx.flows.push({ kind: 'phase', motor: 0, pts: pts.map(p => W(...p)) });
    });
    return items;
  }

  /* ---------- ESC: shrink-wrapped 40 A plane ESC, battery leads to the PDB, signal lead to S1 ---------- */
  function drawEscLeads(ctx){
    const items = [], plus = [[-20, 6, 8], [-14, 9, 6.5], [-11, 9, 6.2]], minus = [[-20, -6, 8], [-14, -9, 6.5], [-11, -9, 6.2]];
    items.push(...g.wire(plus, '#d8473a', 2.2), ...g.wire(minus, '#2c2926', 2.2));
    const sig = [[-24, 2, 14], [-14, 4, 18], [2, 12, 13], [6, 13.5, 12]];
    items.push(...g.wire(sig, '#f2efe7', .8, 6));
    ctx.flows.push({ kind: 'power', pts: plus.slice().reverse().map(p => W(...p)) }, { kind: 'signal', pts: sig.slice().reverse().map(p => W(...p)) });
    return items;
  }

  /* ---------- FC: servo plugs on S3 / S4 into the wing, the CAM pad, the GPS lead ---------- */
  function drawFcLeads(ctx){
    const items = [];
    for (const s of [1, -1]){
      const pts = [[-2, s * 12.5, 12], [-6, s * 22, 18], [-10, s * 35, 20]];
      items.push(...g.wire(pts, '#e48a2c', .9, 6));
      ctx.flows.push({ kind: 'signal', pts: pts.map(p => W(...p)) });
    }
    return items;
  }
  function drawCamLead(ctx){
    const pts = [[251, 0, 28], [226, 0, 30], [200, 8, 47], [90, 10, 47], [30, 6, 13]];
    ctx.flows.push({ kind: 'video', pts: pts.map(p => W(...p)) });
    return g.wire(pts, '#2c2926', 1.3, 8);
  }
  function drawVtxLead(ctx){
    const pts = [[62, -30, 8.2], [62, -36, 28], [62, -40, 40]], sig = [[14, -12, 12], [36, -20, 12], [48, -20, 8.5]];
    ctx.flows.push({ kind: 'video', pts: sig.map(p => W(...p)) });
    return [...g.wire(pts, '#2c2926', 1.4, 7), ...g.wire(sig, '#f2c230', .8, 6)];
  }
  function drawRxLead(ctx){
    const pts = [[46, 28, 7.5], [46, 36, 28], [46, 40, 36]], sig = [[40, 19, 7], [26, 12, 12], [20, 10, 12]];
    ctx.flows.push({ kind: 'signal', pts: sig.map(p => W(...p)) });
    return [...g.wire(pts, '#2c2926', 1, 7), ...g.wire(sig, '#43a35a', .8, 6)];
  }
  function drawGpsLead(ctx){
    const pts = [[22, 60, topAt(22, 60) + .9], [16, 46, topAt(16, 46) + 1.2], [14, 42, 30], [12, 34, 20], [14, 12, 12.5]];
    ctx.flows.push({ kind: 'signal', pts: pts.slice().reverse().map(p => W(...p)) });
    return g.wire(pts, '#c9c4b8', .9, 6);
  }

  const gpsZ = Math.max(topAt(12, 60), topAt(12, 100), topAt(52, 60), topAt(52, 100), topAt(32, 80)) + .3;

  SD.define({
    id: 'wing', fig: '09', title: 'FPV flying wing on INAV', palette: 'blush',
    mat: 960, height: 150, explode: 26, log: 'inav',
    calLabel: 'Calibrate accelerometer (wing level)',
    bounds: [-210, 270, -160, 160, 0, 70],
    messages: { powered: 'ESC beeps: FC, servos and VTX on' },
    frame: {
      layout: 'wing', wheelbase: 900, numbering: 'wing', motorZ: MOTOR_Z - 17, arrowZ: -12,
      motors: [{ id: 'M1', at: [-185, 0], dir: 'CCW' }],
      wing: { planform: [[125, 42], [-95, 450], [-250, 450], [-175, 42]], t: 18, z: Z0 - 6, pod: { l: 305, w: 84, h: 54, x: 82.5 } },
      colors: { frame: 'pal', plate: 'foam' },
    },
    design: {
      default: { batt: '4s2200', motor: '2212-1400', prop: '8x6' },
      batts: {
        '4s2200': { cells: 4, mah: 2200, size: [106, 35, 33], color: '#d9a520', label: '4S 2200', cg: 'ok' },
        '4s3000li': { cells: 4, mah: 3000, size: [67, 38, 38], color: '#2f5fa8', label: '4S LI-ION', chem: 'liion', cg: 'nose' },
        '3s1300': { cells: 3, mah: 1300, size: [75, 34, 22], color: '#e2483d', label: '3S 1300', cg: 'tail' },
      },
      motors: {
        '2212-1400': { stator: [22, 12], bell: [27.7, 26], kv: 1400, label: '2212 1400KV' },
        '2810-1100': { stator: [28, 10], bell: [34.5, 23], kv: 1100, label: '2810 1100KV' },
        '2306-2400': { stator: [23, 6], bell: [27.9, 15.5], kv: 2400, label: '2306 2400KV' },
      },
      props: {
        '8x6': { d: 8, pitch: 6, blades: 2, color: '#2c2926', label: '8x6 P' },
        '7x5': { d: 7, pitch: 5, blades: 2, color: '#3f6fb5', label: '7x5 P' },
        '9x6': { d: 9, pitch: 6, blades: 2, color: '#f08a2b', label: '9x6 P' },
      },
    },
    parts: [
      { id: 'FRAME', short: 'WING', name: 'EPP foam wing, pod and winglets', z: 0,
        piece: { kind: 'custom', draw: drawFrame }, tag: { at: [-150, 300, 22], dx: -70, dy: -40 },
        xr: [{ at: [-40, 230, 24], text: 'CARBON SPAR IN THE FOAM' }] },
      { id: 'SERVOS', short: 'SERVOS', name: 'Elevon servos, horns and pushrods', after: ['FRAME'], z: 1,
        polar: ['direction checked', 'reversed (untested)'], mistake: 'servo-reversed',
        piece: { kind: 'custom', draw: drawServos }, tag: { at: [-42, -175, 36], dx: 60, dy: 40 },
        xr: [{ at: [-42, 175, 36], text: '9 G METAL-GEAR SERVO, S3 / S4' }] },
      { id: 'MOTORS', short: 'MOTOR', name: 'Pusher motor + mount', after: ['FRAME'], z: 1,
        piece: { kind: 'custom', draw: drawMotor }, tag: { at: [-185, 0, 48], dx: -40, dy: -50 },
        xr: [{ at: [-185, 0, 48], text: 'OUTRUNNER, SHAFT AFT' }] },
      { id: 'ESC', short: 'ESC', name: '40 A ESC with 5 V BEC', after: ['FRAME'], z: 2,
        piece: [{ kind: 'module', at: [-40, 0, 4], size: [40, 24, 10], color: '#3f6fb5', label: '40A ESC', labelSize: .22 },
          { kind: 'custom', draw: drawEscLeads }],
        tag: { at: [-40, 0, 14], dx: 50, dy: 60 }, xr: [{ at: [-40, 0, 14], text: '40 A ESC, ITS BEC LEAD UNUSED' }] },
      { id: 'WIRES', short: 'MOTOR WIRES', name: 'Motor bullets to the ESC', after: ['MOTORS', 'ESC'], z: 2,
        piece: { kind: 'custom', draw: drawWires }, tag: { at: [-114, 0, 30], dx: -60, dy: 50 }, },
      { id: 'FC', short: 'FLIGHT CTRL', name: 'F405 wing flight controller (INAV)', after: ['ESC'], z: 3,
        polar: ['arrow to the nose', 'arrow backwards'],
        piece: [
          { kind: 'board', at: [10, 0, 4], size: [46, 34], t: 1.6, color: 'pcbBlack',
            pads: [{ at: [18, 10], size: [5, 6] }, { at: [18, -10], size: [5, 6] }, { at: [-19, 9], size: [4, 5] }, { at: [-19, -9], size: [4, 5] }] },
          { kind: 'standoffs', at: [[-9, 13], [-9, -13], [29, 13], [29, -13]], z0: 5.6, z1: 10, r: 1.4, color: '#2c2926' },
          { kind: 'board', at: [10, 0, 10], size: [44, 30], t: 1.6, color: 'pcbBlue', arrow: true, arrowAt: [-6, 0],
            chips: [{ at: [8, 4], size: [10, 10, 1.4], label: 'F405' }, { at: [8, -9], size: [6, 6, 1], label: 'OSD' }, { at: [-8, 9], size: [3, 3, .9] }],
            led: '#4aa3ff', ledAt: [-17, -11], usb: [-21, 6],
            pads: [{ at: [-4, 12.5], size: [2.6, 2.6] }, { at: [0, 12.5], size: [2.6, 2.6] }, { at: [4, 12.5], size: [2.6, 2.6] }, { at: [8, 12.5], size: [2.6, 2.6] }] },
          { kind: 'custom', draw: drawFcLeads },
        ],
        tag: { at: [10, 0, 14], dx: -30, dy: -78 },
        xr: [{ at: [18, 4, 14], text: 'F405 FC ON A PDB: 90 A SENSOR, 3 BECS' }] },
      { id: 'XT60', short: 'XT60 + CAP', name: 'XT60 lead + low-ESR capacitor', after: ['FC'], z: 2,
        polar: ['stripe to minus', 'stripe to plus'],
        piece: { kind: 'xt60', at: [84, 26, 12], dir: [-1, 0, 0], lead: [[33, 13, 6.5], [60, 33.2, 7.5], [97, 33.2, 9.5], [93, 27, 12]],
          cap: { at: [30, 16, 8], dir: [0, 1, 0], r: 5, l: 14, stripe: [1, 0, 0], leads: [[[28, 16, 8], [28, 11, 6.2]], [[32, 16, 8], [32, 11, 6.2]]] } },
        tag: { at: [84, 26, 16], dx: 80, dy: -40 }, xr: [{ at: [30, 22, 14], text: '470 µF 35 V LOW-ESR CAP' }] },
      { id: 'GPS', short: 'GPS', name: 'M10 GPS + compass', after: ['FC'], z: 3,
        piece: [{ kind: 'module', at: [32, 80, gpsZ], size: [40, 40, 8], color: '#2c2926', label: 'M10', labelSize: .16, arrow: true, led: '#4aa3ff', ledAt: [-14, -14] },
          { kind: 'custom', draw: drawGpsLead }],
        tag: { at: [32, 80, gpsZ + 8], dx: 60, dy: -60 }, xr: [{ at: [32, 80, gpsZ + 8], text: 'M10 GNSS + COMPASS, UART3 + I2C1' }] },
      { id: 'RX', short: 'RECEIVER', name: 'ELRS receiver', after: ['FC'], z: 4,
        piece: [{ kind: 'module', at: [46, 23, 4], size: [15, 11, 3.5], color: 'pcbBlack', label: 'ELRS', labelSize: .3, led: '#43c463', ledAt: [5, 3] },
          { kind: 'custom', draw: drawRxLead },
          { kind: 'antenna', at: [46, 42.5, 36], type: 't', dir: [0, .55, .84], len: 30, spread: 50 }],
        tag: { at: [46, 60, 60], dx: 50, dy: -50 }, xr: [{ at: [46, 23, 8], text: 'ELRS RX ON UART1 (CRSF)' }] },
      { id: 'CAM', short: 'CAMERA', name: 'FPV camera in the nose', after: ['FRAME'], z: 2,
        piece: [{ kind: 'camera', at: [258, 0, 28], size: 19, tilt: 8, depth: 12 }, { kind: 'custom', draw: drawCamLead }],
        tag: { at: [266, 0, 38], dx: 70, dy: -30 } },
      { id: 'VTX', short: 'VTX', name: '5.8 GHz VTX + antenna', after: ['FC'], z: 4,
        piece: [{ kind: 'board', at: [60, -21, 4], size: [28, 22], t: 1.6, color: 'pcb', chips: [{ at: [1, 0], size: [14, 12, 2.6], color: 'alu' }], led: '#e2483d', ledAt: [-10, 8] },
          { kind: 'custom', draw: drawVtxLead },
          { kind: 'antenna', at: [62, -42.5, 40], type: 'lollipop', dir: [0, -.35, .94], len: 42 }],
        tag: { at: [62, -58, 82], dx: -50, dy: -40 }, xr: [{ at: [60, -21, 9], text: '5.8 GHz VTX, SMARTAUDIO' }] },
      { id: 'BATT', short: 'BATTERY', name: 'Battery (sets the balance)', after: ['XT60', 'FC'], z: 4, cover: true,
        piece: { kind: 'battery', at: [150, 0, 4], strap: true, pad: true },
        tag: { at: [150, 0, 40], dx: 40, dy: -64 }, xr: [{ at: [150, 0, 40], text: 'THE PACK IS THE CG BALLAST' }] },
      { id: 'TOP', short: 'HATCH', name: 'Hatch', after: ['BATT', 'RX', 'VTX'], z: 5, cover: true,
        piece: [{ kind: 'box', at: [82.5, 0, 54], size: [297, 80, 4], color: 'pal' }, { kind: 'box', at: [198, 0, 58], size: [16, 20, 2], color: 'dark' }],
        tag: { at: [140, 0, 60], dx: 60, dy: -50 } },
      { id: 'PROPS', short: 'PROP', name: 'Pusher propeller', after: ['MOTORS', 'TOP'], z: 6,
        polar: ['printed side forward', 'mounted backwards'],
        piece: { kind: 'custom', draw: drawProp }, tag: { at: [-212, -90, 34], dx: -40, dy: 40 } },
    ],
    tests: {
      smoke: { needs: ['XT60', 'ESC'], at: [130, 150] },
      motors: { needs: ['WIRES', 'FC'] },
      calibrate: { needs: ['FC'] },
      plug: { needs: ['BATT', 'XT60'] },
    },
    buttons: [
      { id: 'elevons', label: 'Check elevons', onClick: checkElevons },
      { id: 'cg', label: 'CG check', onClick: checkCG },
      { id: 'compass', label: 'Calibrate compass', onClick: simpleCheck('compass') },
      { id: 'airspeed', label: 'Check airspeed', onClick: simpleCheck('airspeed') },
      { id: 'failsafe', label: 'Failsafe test', onClick: simpleCheck('failsafe') },
    ],
    report: wingReport,
    inside: [
      { at: [35, 100, 28], text: 'CG MARK: 15-20 % OF THE MEAN CHORD' },
    ],
    wiring: {
      nodes: {
        RX: { at: [20, 20], title: 'RECEIVER', sub: 'ELRS 2.4 GHz', color: '#8c4bd1', led: '#43c463' },
        GPS: { at: [20, 142], title: 'GPS + COMPASS', sub: 'M10, QMC5883', color: '#43a35a' },
        BATT: { at: [20, 264], title: 'BATTERY', sub: 'batt', color: 'tomato' },
        XT60: { at: [200, 264], title: 'XT60 + CAP', sub: '470 µF 35 V', color: 'tomato' },
        CAM: { at: [380, 20], title: 'CAMERA', sub: 'analog, 8° up', color: '#f2c230' },
        FC: { at: [380, 142], title: 'FLIGHT CTRL', sub: 'F405 WING, INAV', color: '#3e86d9', led: '#4aa3ff' },
        ESC: { at: [380, 264], title: 'ESC', sub: '40 A, BEC unused', color: '#f08a2b' },
        VTX: { at: [590, 20], title: 'VTX', sub: '5.8 GHz, SmartAudio', color: '#f2c230', led: '#e2483d' },
        SERVOS: { at: [590, 142], title: 'ELEVONS', sub: '2 x 9 g servo', color: '#f08a2b' },
        MOTORS: { at: [590, 264], title: 'PUSHER M1', sub: 'motor', color: '#f08a2b' },
      },
      edges: [
        { from: 'BATT', to: 'XT60', kind: 'power', n: 2, label: 'V' },
        { from: 'XT60', to: 'FC', kind: 'power', n: 2, label: 'VBAT 2-6S' },
        { from: 'XT60', to: 'ESC', kind: 'power', n: 2, label: 'PDB ESC pads' },
        { from: 'FC', to: 'ESC', kind: 'signal', label: 'S1 OneShot125' },
        { from: 'ESC', to: 'MOTORS', kind: 'phase', n: 3, label: '3-phase' },
        { from: 'FC', to: 'SERVOS', kind: 'signal', label: 'S3 S4, 4.9 V' },
        { from: 'RX', to: 'FC', kind: 'signal', label: 'UART1 CRSF' },
        { from: 'GPS', to: 'FC', kind: 'signal', label: 'UART3 + I2C1' },
        { from: 'CAM', to: 'FC', kind: 'video', label: 'CAM pad' },
        { from: 'FC', to: 'VTX', kind: 'video', label: 'video + OSD, 9 V' },
      ],
    },
  });
})();
