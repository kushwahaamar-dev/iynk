// @cf title Tricopter
// @cf use engine/drone.js
// @cf use engine/drone-geo.js
// @cf use engine/drone-frames.js
// @cf use engine/drone-pieces.js
// @cf use engine/drone-sheet.js
/* Fig. 12, the 5-inch tricopter on Betaflight 2026.6.2 (docs/facts/tricopter.md). Y frame: a 100 x 64 x 3 mm centre
   plate, front arms on the +-60 deg diagonals to motors at (60, +-104) (208 mm apart, 120 mm from the centre), a
   tail boom to the tail motor at (-150, 0) on a 30 x 30 mm plate hinged along the boom. A metal-gear servo beside
   the boom tilts that plate through a horn and a short pushrod. One single ESC on each arm, an F405 flight
   controller with its own power board on the 30.5 mm stack, the tail servo on SERVO 1 (S9), ELRS on UART2, a SmartAudio VTX
   on UART1, a micro camera at 20 deg uptilt, a 94 x 56 mm top plate on 30 mm standoffs. Betaflight TRI: M1 tail
   CCW, M2 front right CW, M3 front left CCW. Craft-local mm: x forward, y left, z up, z = 0 on the mat. */
(() => {
  const SD = SL.drone, g = SD.g, W = SD.W;
  const ARM_T = 3, FC_Z = 8, TOP_Z = 33, HINGE_Z = 10, TAIL_Z = 13, TAIL_X = -150;
  const SERVO_X = -112, SERVO_Y = 13;
  const unit = (x, y) => { const L = Math.hypot(x, y); return [x / L, y / L]; };
  const along = (u, r, z, side = 0) => [u[0] * r - u[1] * side, u[1] * r + u[0] * side, z];
  const ARMS = { M1: unit(-150, 0), M2: unit(60, -104), M3: unit(60, 104) };
  // each ESC sits on its arm; its outer end is where the phase wires start (WIRES from: 'arm', along .66)
  const escSpan = r => [r * .66 - 24, r * .66];

  /* ---------- the craft's own bench checks: the tail servo sweep and the failsafe ---------- */
  const fresh = (() => { try { return /[?&]fresh=1(&|$)/.test(location.search); } catch (e) { return false; } })();
  const tri = st => st.tri || (st.tri = { t0: null, end: null, rev: false, done: !fresh });
  const SWEEP = 3.6;
  // tail tilt in degrees, + = the tail motor's thrust leans left (+y): the yaw stick goes right, left, right
  const tailTilt = st => {
    const x = tri(st);
    if (x.t0 == null || st.t >= x.end) return 0;
    const s = st.t - x.t0, ramp = Math.min(1, s * 3, (x.end - st.t) * 3);
    return (x.rev ? -1 : 1) * 25 * Math.sin(Math.PI * 2 * s / 1.8) * ramp;
  };
  const sweeping = st => { const x = tri(st); return x.t0 != null && st.t < x.end; };
  function blocked(api){
    const st = api.st;
    if (st.test || st.queue.length || sweeping(st)) { api.say('Wait for the test to finish'); return true; }
    if (st.exT) { api.say('Close the exploded view first'); return true; }
    return false;
  }
  const servoTest = api => {
    const st = api.st;
    if (blocked(api)) return;
    if (!api.isOn('TAILSERVO') || !api.isOn('FC')) return api.say('Fit the tail servo and the flight controller first', 2600, 'buzz');
    if (api.isOn('PROPS')) return api.say('Props off for the servo test: the tail motor sits right next to your fingers', 3000, 'buzz');
    if (!SD.powered(st)) return api.say('Plug in the battery: the servo runs from the 5 V regulator', 2600, 'buzz');
    const x = tri(st);
    x.rev = api.orient('TAILSERVO') === 1;
    x.done = false; x.t0 = st.t; x.end = st.t + SWEEP;
    api.log('$ props off, disarmed: tri_unarmed_servo = ON');
    api.log('servo 5: 1000-2000 us, centre 1500 us, 333 Hz');
    api.log('$ yaw stick right, then left');
    st.later.push({ t: SWEEP, sfx: x.rev ? 'buzz' : 'ding',
      say: x.rev ? 'Yaw right tilted the tail the wrong way: the servo is reversed and the tri would pirouette on take-off. Mount it the right way round'
        : 'Yaw right tilts the tail motor’s thrust to the left: that pushes the tail left and swings the nose right. Servo correct' });
    api.sfx('click');
  };
  const failsafeTest = api => {
    if (blocked(api)) return;
    if (!api.isOn('RX') || !api.isOn('FC')) return api.say('Fit the receiver and the flight controller first', 2600, 'buzz');
    if (api.isOn('PROPS')) return api.say('PROPS OFF! Never spin motors on the bench with props on', 2600, 'buzz');
    if (!SD.powered(api.st)) return api.say('Plug in the battery for the failsafe test (props off)', 2600, 'buzz');
    api.log('$ props off, arm on the bench, switch the radio off');
    api.log('RXLOSS: failsafe stage 1 for failsafe_delay = 15 (1.5 s)');
    api.log('failsafe stage 2: DROP, motors stopped, disarmed');
    api.say('Radio off: after 1.5 s the motors stopped and the tri disarmed (DROP). Failsafe works', 3600, 'ding');
    api.pass('failsafe');
  };
  // the servo check holds for the servo it ran on: a factory build counts as checked unless the page opened fresh
  const report = st => {
    const x = tri(st), ran = x.end != null && st.t >= x.end && !x.rev;
    return { servoOk: SD.isOn(st, 'TAILSERVO') && SD.orient(st, 'TAILSERVO') === 0 && (x.done || ran) };
  };
  // the engine calls this on a strip, a build, or a part put on, taken off or turned round
  const reset = (st, why) => {
    const x = tri(st);
    if (why === 'build') Object.assign(x, { t0: null, end: null, rev: false, done: true });
    else if (['strip', 'TAILSERVO', 'FC'].includes(why)) Object.assign(x, { t0: null, end: null, rev: false, done: false });
  };

  /* ---------- pieces ---------- */
  // the tail mount is frame hardware: a hinge block on the boom end, the pin along the boom, and the 30 x 30 motor
  // plate, which rocks with the tail motor (the motor's own frame this frame, so the two never part)
  const tailFrame = ctx => SD.motorFrame(ctx.craft.motors[0], TAIL_Z);
  const tailMount = ctx => {
    const Mf = tailFrame(ctx), o = Mf(0, 0, 0), ax = (a, b, h) => Mf(a, b, h).map((v, i) => v - o[i]), ht = (TAIL_Z - HINGE_Z - 1.6) / 2;
    return [
      g.box(TAIL_X - 12, -8, ARM_T, TAIL_X + 12, 8, HINGE_Z - 1.6, 'dark', .8),
      ...g.rod([TAIL_X - 15, 0, HINGE_Z], [TAIL_X + 15, 0, HINGE_Z], 1.6, 'metal', 30, 8),
      g.oblock(Mf(0, 0, -ht), ax(1, 0, 0), ax(0, 1, 0), ax(0, 0, 1), 15, 15, ht, 'pal', .9),
    ];
  };

  // one single ESC on each arm; red and black leads run in along the arm to the power-board pads under the FC
  const escs = ctx => {
    const out = [];
    for (const mo of ctx.craft.motors){
      const u = ARMS[mo.id], [r0, r1] = escSpan(mo.r), rc = (r0 + r1) / 2, z = ARM_T + 2;
      const it = g.oblock([u[0] * rc, u[1] * rc, z], [u[0], u[1], 0], [-u[1], u[0], 0], [0, 0, 1], (r1 - r0) / 2, 6, 2, '#3e86d9', .9);
      it.svg += g.text(u[0] * rc, u[1] * rc, z + 2.05, 'ESC', 3.6, '#f2efe7', Math.abs(u[0]) > .7 ? 'x' : 'y');
      out.push(it);
      for (const [s, col] of [[2.6, '#d8473a'], [-2.6, '#2c2926']]){
        const pts = [along(u, r0, z, s), along(u, r0 - 6, ARM_T + 1, s), along(u, 26, ARM_T + 1, s * 1.4), along(u, 17, ARM_T + 3, s * 1.6)];
        out.push(...g.wire(pts, col, 1.3));
        if (s > 0) ctx.flows.push({ kind: 'power', pts: pts.slice().reverse().map(p => W(...p)) });
      }
    }
    return out;
  };

  // the servo on the boom's side, its output shaft pointing aft: the horn turns in the y-z plane and the pushrod
  // lifts one edge of the motor plate. Its lead (brown, red, orange) runs along the boom to the S9 pad. Fitted reversed it
  // sits on the other side of the boom, so the same stick moves the plate the other way.
  const servo = ctx => {
    const out = [], rev = ctx.orient === 1, side = rev ? -1 : 1, a = tailTilt(ctx.st) * Math.PI / 180, sy = side * SERVO_Y;
    const body = g.box(SERVO_X - 11, sy - 6, ARM_T, SERVO_X + 11, sy + 6, ARM_T + 18, '#3e86d9', .9);
    body.svg += g.text(SERVO_X, sy, ARM_T + 18.05, 'MG', 4.4, '#f2efe7');
    out.push(body);
    const shaft = [SERVO_X - 12.5, sy, ARM_T + 13], hornA = Math.PI / 2 - a * 2.2;
    const tip = [shaft[0] - 1.2, sy + side * 8 * Math.cos(hornA), shaft[2] + 8 * Math.sin(hornA)];
    out.push(g.box(SERVO_X - 13.5, sy - 2.2, ARM_T + 11, SERVO_X - 11, sy + 2.2, ARM_T + 15, 'white', .6));
    out.push(...g.rod(shaft, tip, 1.2, 'white', 10, 6));
    out.push(...g.wire([tip, tailFrame(ctx)(14, side * 12, -.6)], 'metal', .9));
    const lead = [[SERVO_X + 11, sy, ARM_T + 4], [SERVO_X + 24, side * 6.6, ARM_T + 1.4], [-30, side * 6.6, ARM_T + 1.4], [-20, side * 8, FC_Z + 1.8], [-14, side * 9, FC_Z + 2.4]];
    [['#6b4a32', -1], ['#d8473a', 0], ['#f08a2b', 1]].forEach(([col, o]) => out.push(...g.wire(lead.map(p => [p[0], p[1] + o * .9, p[2]]), col, .6)));
    ctx.flows.push({ kind: 'signal', pts: lead.slice().reverse().map(p => W(...p)) });
    // during the servo test the tail motor banks with the plate (motorPose below); an arrow along its shaft shows
    // which way the thrust points, and a pill reads the angle
    if (sweeping(ctx.st)) out.push(tiltReadout(tailFrame(ctx), a, rev));
    return out;
  };
  function tiltReadout(Mf, a, rev){
    const L = 56, base = Mf(0, 0, 30), tipT = Mf(0, 0, 30 + L);
    const [X0, Y0] = SD.Pb(...base), [X1, Y1] = SD.Pb(...tipT), ang = Math.atan2(Y1 - Y0, X1 - X0), hs = 9;
    const head = [0, 2.4, -2.4].map(d => `${f(X1 + Math.cos(ang + d) * hs)} ${f(Y1 + Math.sin(ang + d) * hs)}`).join('L');
    const deg = Math.round(Math.abs(a * 180 / Math.PI)), dir = deg < 1 ? '' : ' ' + (a > 0 ? CF_T('LEFT') : CF_T('RIGHT'));
    const label = CF_T('TAIL TILT {n}°', { n: deg }) + dir, fs = 8.6 * INK_K, h = fs * 1.8, w = CF_TW(label, fs) + fs * 1.5;
    const [PX, PY] = SD.Pb(TAIL_X, 0, TAIL_Z + 102);
    return { box: SD.bbox([W(TAIL_X, -L, TAIL_Z + 28), W(TAIL_X, L, TAIL_Z + 108)]),
      svg: `<path d="M${f(X0)} ${f(Y0)}L${f(X1)} ${f(Y1)}" stroke="${INK}" stroke-width="5" stroke-linecap="round" fill="none"/>`
        + `<path d="M${f(X0)} ${f(Y0)}L${f(X1)} ${f(Y1)}" stroke="#2f7d4f" stroke-width="3.2" stroke-linecap="round" fill="none"/>`
        + `<path d="M${head}Z" fill="#2f7d4f" stroke="${INK}" stroke-width=".6"/>`
        + `<g class="dpill"><rect x="${f(PX - w / 2)}" y="${f(PY - h / 2)}" width="${f(w)}" height="${f(h)}" rx="${f(h / 2)}" fill="${rev ? '#e2483d' : '#fff4d6'}" stroke="${INK}" stroke-width="1.2"/>`
        + `<text x="${f(PX)}" y="${f(PY + fs * .36)}" font-size="${f(fs)}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="800" fill="${rev ? '#ffffff' : INK}">${CF_ESC(label)}</text></g>` };
  }

  // FC leads: the three ESC signal wires out along the arms (M1 tail, M2 front right, M3 front left)
  const fcLeads = ctx => {
    const out = [];
    for (const mo of ctx.craft.motors){
      const u = ARMS[mo.id], [r0] = escSpan(mo.r), pts = [along(u, 17, FC_Z + 1.8, 4), along(u, 24, ARM_T + 1.2, 4), along(u, r0 - 3, ARM_T + 1.2, 4), along(u, r0, ARM_T + 3, 4)];
      out.push(...g.wire(pts, '#f4f1e8', .6));
      ctx.flows.push({ kind: 'signal', pts: pts.map(p => W(...p)) });
    }
    return out;
  };

  const camWires = ctx => {
    const out = [];
    [['#e8d36a', 0], ['#d8473a', 1.3], ['#2c2926', -1.3]].forEach(([col, dy]) =>
      out.push(...g.wire([[31, dy, 9], [24, dy + 1, 10], [16, dy + 1.5, FC_Z + 2]], col, .6, 5)));
    ctx.flows.push({ kind: 'video', pts: [[31, 0, 9.3], [24, 1, 10.3], [16, 1.5, FC_Z + 2.3]].map(p => W(...p)) });
    return out;
  };

  const rxWires = ctx => {
    const out = [];
    [['#d8473a', 0], ['#2c2926', 1], ['#43a35a', 2], ['#f4f1e8', 3]].forEach(([col, o]) =>
      out.push(...g.wire([[-24, 11 + o * .9, ARM_T + 2.5], [-19, 10 + o * .9, FC_Z + 1], [-15, 9 + o * .9, FC_Z + 2]], col, .55, 4)));
    ctx.flows.push({ kind: 'signal', pts: [[-24, 12, ARM_T + 2.8], [-19, 11, FC_Z + 1.3], [-15, 10, FC_Z + 2.3]].map(p => W(...p)) });
    return out;
  };

  const vtxWires = ctx => {
    const out = [];
    [['#e8d36a', 0], ['#d8473a', 1], ['#2c2926', 2], ['#5a82c6', 3]].forEach(([col, o]) =>
      out.push(...g.wire([[-22, -12 - o * .9, ARM_T + 4], [-18, -11 - o * .9, FC_Z + 1], [-15, -10 - o * .9, FC_Z + 2]], col, .55, 4)));
    ctx.flows.push({ kind: 'video', pts: [[-15, -10, FC_Z + 2.3], [-18, -11, FC_Z + 1.3], [-22, -12, ARM_T + 4.3]].map(p => W(...p)) });
    return out;
  };

  SD.define({
    id: 'tricopter', fig: '12', title: 'Tricopter', palette: 'mint',
    mat: 460, height: 100, explode: 14, log: 'betaflight',
    bounds: [-160, 70, -110, 110, 0, 75],
    xrCaption: 'See-through: the top plate and the battery fade so the power board, the servo lead and the signals show.',
    frame: {
      layout: 'tri-y',
      motors: [
        { id: 'M1', at: [TAIL_X, 0, TAIL_Z], dir: 'CCW' },
        { id: 'M2', at: [60, -104], dir: 'CW' },
        { id: 'M3', at: [60, 104], dir: 'CCW' },
      ],
      arm: { w: 14, t: ARM_T, from: 24, pad: 15 }, plate: { l: 100, w: 64, z: 0, r: 6 }, motorZ: ARM_T,
    },
    design: {
      default: { batt: '4s2200', motor: '2306-2450', prop: '5x4.3x3' },
      batts: {
        '4s2200': { cells: 4, mah: 2200, size: [96, 36, 33.5], color: '#2b2a28', label: '4S 2200' },
        '4s1800': { cells: 4, mah: 1800, size: [88, 36, 33.5], color: '#2f5fa8', label: '4S 1800' },
        '4s1500': { cells: 4, mah: 1500, size: [80, 36, 33.5], color: '#d9a520', label: '4S 1500' },
      },
      motors: {
        '2306-2450': { stator: [23, 6], bell: [27.5, 15], kv: 2450, label: '2306 2450KV' },
        '2207-2150': { stator: [22, 7], bell: [27.1, 16.5], kv: 2150, label: '2207 2150KV' },
        '2205-2300': { stator: [22, 5], bell: [27.1, 13.5], kv: 2300, label: '2205 2300KV' },
      },
      props: {
        '5x4.3x3': { d: 5, pitch: 4.3, blades: 3, color: '#3fa8d8', label: '5x4.3x3' },
        '6x4x2': { d: 6, pitch: 4, blades: 2, color: '#f2c230', label: '6x4x2' },
        '5x5x3': { d: 5, pitch: 5, blades: 3, color: '#d8473a', label: '5x5x3' },
      },
    },
    parts: [
      { id: 'FRAME', short: 'FRAME', name: 'Y frame: centre plate, two front arms, tail boom, tilt mount', z: 0,
        piece: [{ kind: 'frame' }, { kind: 'custom', draw: tailMount }], tag: { at: [-80, 0, ARM_T], dx: 30, dy: 46 } },
      { id: 'MOTORS', short: 'MOTORS', name: '3 brushless motors (2306)', after: ['FRAME'], z: 1.6,
        piece: { kind: 'motors' }, tag: { at: [60, 104, 22], dx: 60, dy: -30 },
        xr: [{ at: [60, -104, 12], text: 'STATOR 23 X 6 MM' }] },
      { id: 'ESC', short: 'ESCS', name: '3 single ESCs on the arms (Bluejay)', after: ['FRAME'], z: 1,
        piece: { kind: 'custom', draw: escs }, tag: { at: [33, -57, ARM_T + 4], dx: 70, dy: 34 } },
      { id: 'TAILSERVO', short: 'TAIL SERVO', name: 'Metal-gear tail servo, horn and pushrod', after: ['FRAME'], z: 1.2,
        polar: ['servo normal', 'servo reversed'], mistake: 'servo-reversed',
        piece: { kind: 'custom', draw: servo }, tag: { at: [SERVO_X, SERVO_Y, ARM_T + 18], dx: -36, dy: -56 },
        xr: [{ at: [SERVO_X, SERVO_Y, ARM_T + 20], text: 'SERVO 5 ON THE S9 PAD' }] },
      { id: 'WIRES', short: 'MOTOR WIRES', name: 'Motor wires, cut short and soldered', after: ['MOTORS', 'ESC'], z: 1.5,
        piece: { kind: 'wires', from: 'arm', along: .66, h: 3 }, tag: { at: [44, 76, ARM_T + 3], dx: -74, dy: 40 } },
      { id: 'FC', short: 'FLIGHT CTRL', name: 'F405 flight controller + power board, 30.5 mm', after: ['FRAME'], z: 2.4,
        polar: ['arrow forward', 'arrow backward'],
        piece: [
          { kind: 'standoffs', at: [[15.25, 15.25], [15.25, -15.25], [-15.25, 15.25], [-15.25, -15.25]], z0: ARM_T, z1: FC_Z, r: 2.4, color: '#3d3b39' },
          { kind: 'board', at: [0, 0, FC_Z], size: [36, 36], t: 1.6, color: 'pcbBlue', holes: 30.5, arrow: true, arrowAt: [8, 0],
            chips: [{ at: [-3, 3], size: [10, 10, 1.3], label: 'F405' }, { at: [6, -9], size: [4, 4, .9] }],
            pads: [{ at: [-15, 4], size: [4, 4] }, { at: [-15, -4], size: [4, 4] }, { at: [-13, 11], size: [3, 2.4] }],
            led: '#4aa3ff', ledAt: [12, 12], usb: [0, 18] },
          { kind: 'custom', draw: fcLeads },
        ],
        tag: { at: [8, -14, FC_Z + 2], dx: 96, dy: -34 },
        xr: [{ at: [-3, 3, FC_Z + 3.5], text: 'F405 + PDB, TRI MIXER' }] },
      { id: 'XT60', short: 'XT60 + CAP', name: 'XT60 pigtail + 1000 µF 35 V low-ESR capacitor', after: ['FC'], z: 2.8,
        polar: ['stripe to minus', 'stripe to plus'],
        piece: { kind: 'xt60', at: [-46, 0, 8], dir: [-1, 0, 0], lead: [[-15, 0, FC_Z + 2], [-26, 0, FC_Z + 2.5], [-34, 0, 8.5], [-38, 0, 8]],
          cap: { at: [-36, -8, FC_Z + 6.4], dir: [1, 0, 0], r: 4.8, l: 16, stripe: [0, -1, 0],
            leads: [[[-20, -10, FC_Z + 6.4], [-15, -4, FC_Z + 2]], [[-20, -6, FC_Z + 6.4], [-15, 4, FC_Z + 2]]] } },
        tag: { at: [-50, 0, 12], dx: -30, dy: -46 } },
      { id: 'CAM', short: 'CAMERA', name: 'Micro analog camera, 20° uptilt', after: ['FRAME'], z: 2,
        piece: [{ kind: 'camera', at: [40, 0, 15], size: 19, tilt: 20, depth: 16, lens: 6.4, plates: { gap: 1, l: 22, h: 22, t: 2, color: 'pal' } },
          { kind: 'custom', draw: camWires }],
        tag: { at: [52, 0, 26], dx: 78, dy: 14 }, xr: [{ at: [44, 0, 24], text: 'CAMERA, 20° UP' }] },
      { id: 'RX', short: 'RECEIVER', name: 'ELRS 2.4 GHz receiver (CRSF)', after: ['FC'], z: 3,
        piece: [{ kind: 'module', at: [-30, 14, ARM_T], size: [12, 10, 3], color: 'pcbBlack', label: 'ELRS', labelSize: .3, led: '#43c463', ledAt: [3.8, 3] },
          { kind: 'custom', draw: rxWires },
          { kind: 'antenna', at: [-36, 16, ARM_T + 2], type: 't', dir: [-.7, .2, .68], len: 26, spread: 50 }],
        tag: { at: [-30, 14, 7], dx: -60, dy: -40 }, xr: [{ at: [-30, 14, 8], text: 'ELRS, UART2 CRSF' }] },
      { id: 'VTX', short: 'VTX', name: '5.8 GHz VTX (SmartAudio), 25 mW', after: ['FC'], z: 3.2,
        piece: [{ kind: 'module', at: [-30, -18, ARM_T], size: [16, 14, 5], color: 'pcbBlack', label: 'VTX', labelSize: .28, led: '#e2483d', ledAt: [5, -4.5] },
          { kind: 'custom', draw: vtxWires },
          { kind: 'antenna', at: [-38, -20, ARM_T + 4], type: 'lollipop', dir: [-.6, -.25, .76], len: 26, head: 7 }],
        tag: { at: [-30, -18, 9], dx: 30, dy: 50 }, xr: [{ at: [-30, -18, 10], text: 'RACEBAND, 25 MW' }] },
      { id: 'TOP', short: 'TOP PLATE', name: 'Top plate on 30 mm standoffs', after: ['FC', 'CAM', 'RX', 'VTX'], z: 4.6, cover: true,
        piece: [{ kind: 'standoffs', at: [[41, 22], [41, -22], [-41, 22], [-41, -22]], z0: ARM_T, z1: TOP_Z, r: 2.5, split: 10 },
          { kind: 'plate', l: 94, w: 56, r: 6, z: TOP_Z, t: 2, color: 'carbon' }],
        tag: { at: [41, -22, TOP_Z + 2], dx: 80, dy: -30 } },
      { id: 'BATT', short: 'BATTERY', name: '4S LiPo + strap', after: ['TOP', 'XT60'], z: 6, cover: true,
        piece: { kind: 'battery', at: [-6, 0, TOP_Z + 2], strap: true, pad: true },
        tag: { at: [-6, 0, 72], dx: -10, dy: -40 } },
      { id: 'PROPS', short: 'PROPS', name: 'Propellers: 2 CCW + 1 CW', after: ['MOTORS', 'TOP', 'TAILSERVO'], z: 3.6,
        polar: ['front pair opposite (correct)', 'swapped CW/CCW'],
        piece: { kind: 'props' }, tag: { at: [60, -150, 30], dx: 40, dy: -24 } },
    ],
    tests: {
      smoke: { needs: ['XT60', 'ESC'], at: [-84, 150] },
      motors: { needs: ['WIRES', 'FC'] },
      calibrate: { needs: ['FC'] },
      plug: { needs: ['BATT', 'XT60'] },
    },
    buttons: [
      { id: 'servo', label: 'Tail servo test', onClick: servoTest },
      { id: 'failsafe', label: 'Failsafe test (radio off)', onClick: failsafeTest },
    ],
    report,
    reset,
    // the tail motor (M1) banks with the servo during the sweep; the loop keeps drawing until the sweep ends
    motorPose: (st, i) => i === 0 ? { bank: tailTilt(st) } : null,
    animating: sweeping,
    wiring: {
      nodes: {
        BATT: { at: [10, 22], title: 'BATTERY', sub: 'batt', color: 'tomato' },
        XT60: { at: [10, 145], title: 'XT60 + CAP', sub: '1000 µF 35 V', color: 'tomato' },
        ESC: { at: [215, 145], title: 'ESCS X3', sub: 'one per arm, Bluejay', color: '#f08a2b' },
        MOTORS: { at: [215, 268], title: 'MOTORS X3', sub: 'motor', color: '#f08a2b' },
        FC: { at: [420, 145], title: 'FLIGHT CTRL', sub: 'F405 + PDB, TRI mixer', color: '#43a35a', led: '#4aa3ff' },
        CAM: { at: [420, 22], title: 'CAMERA', sub: 'analog, 20° up', color: '#f2c230' },
        VTX: { at: [420, 268], title: 'VTX', sub: '5.8 GHz, 25 mW', color: '#f2c230', led: '#e2483d' },
        RX: { at: [610, 22], title: 'RECEIVER', sub: 'ELRS 2.4 GHz', color: '#5a82c6', led: '#43c463' },
        TAILSERVO: { at: [610, 268], title: 'TAIL SERVO', sub: 'metal gear, 5 V', color: '#43a35a' },
      },
      edges: [
        { from: 'BATT', to: 'XT60', kind: 'power', n: 2, label: 'V' },
        { from: 'XT60', to: 'ESC', kind: 'power', n: 2, label: 'VBAT' },
        { from: 'ESC', to: 'MOTORS', kind: 'phase', n: 3, label: '3-phase x3' },
        { from: 'FC', to: 'ESC', kind: 'signal', label: 'DShot600' },
        { from: 'FC', to: 'TAILSERVO', kind: 'signal', label: 'PWM + 5 V', labelAt: [26, 0] },
        { from: 'RX', to: 'FC', kind: 'signal', label: 'UART2 CRSF' },
        { from: 'CAM', to: 'FC', kind: 'video', label: 'CAM pad' },
        { from: 'FC', to: 'VTX', kind: 'video', label: 'video + OSD, SmartAudio', labelAt: [-24, 0] },
      ],
    },
  });
})();
