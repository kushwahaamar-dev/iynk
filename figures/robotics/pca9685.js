// @cf title PCA9685 servo arm
// @cf use engine/bench.list
// @cf use parts/aa-holder-4.js
// @cf use boards/nano.js
// @cf use modules/pca9685.js
/* Robotics Bench Fig. 08: a three-servo desk arm on the Adafruit PCA9685 board (figures/modules/pca9685.js, B.pca9685).
   On the mat an Arduino Nano drives the board over I2C (5V to VCC, GND, A4 to SDA, A5 to SCL), a 4 x AA holder feeds
   the servos through the blue V+ terminal, and in front of the board stands the arm: a base servo turning a turntable
   (channel 0), a shoulder servo lifting a 70 mm link (channel 1) and a gripper servo opening two fingers (channel 2),
   all SG90s, their leads on the first header block. A 16 mm foam cube waits on the mat for the pick-and-place sketch.
   Facts: docs/facts/pca9685.md (50 Hz numbers, 600-2400 µs = 0-180° servo model, 0.1 s per 60°, current 10 mA idle,
   100-250 mA moving, 360-550 mA stalled, the failure table in section 6).
   The model: the Nano's sketch sets each channel's pulse; the chip keeps sending it at the frame the prescaler gives;
   each servo turns toward its pulse at up to 600°/s while V+ holds it up. The pack is four alkaline cells, 6 V with
   about 0.6 Ω inside, so moving servos sag it a little. The arm geometry is this bench's own: shoulder axis 44 mm over
   the mat, link 70 mm, fingers 76-96 mm along it, the link's elevation 0.6° per shoulder degree from level at 90°. */
(() => {
const B = SL.bench;
const P9 = B.pca9685;
const base = B.defs.module.pca9685;
const SPEED = 600, EASE = 125;                   // servo slew at 4.8 V (deg/s); the pick sketch's own easing, 1° every 8 ms
const RPACK = .6;                                // four AA cells, about 0.15 Ω each (aa-holder-4.js)
const r1 = v => Math.round(v * 10) / 10;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- the arm: geometry in the part's own mm (x right, y toward the board, z up from the mat) ---------- */
const AW = 130, AH = 130, AX = 30, AY = 100;     // footprint, base axis
const AXZ = 44, LINK = 70, VC = 12.5, BLK = 16;   // shoulder axis height, link length, the link's side offset, cube size
const PLUGS = [0, 1, 2].map(i => [16 + i * 12, 122]);       // where each servo's plug lies, pins along x at 2.54
const LEG_LOCAL = PLUGS.flatMap(([x, y]) => [-2.54, 0, 2.54].map(d => [x + d, y]));
const CASE = { l: '#5f8fd6', m: '#4673b8', d: '#2c4f86' }, BURNT = { l: '#717a8a', m: '#58606e', d: '#3b414c' };
const ACRYL = { l: '#f7b65a', m: '#ec9a2e', d: '#b86f12' }, HORN = { l: '#fbf8ef', m: '#e3ddcc', d: '#b4ac98' };
const FOAM = { l: '#f0675b', m: '#d94a3e', d: '#a2322a' };
const elev = s => clamp((s - 90) * .6, -28, 54) * Math.PI / 180;
const gapOf = g => 4 + clamp(g, 0, 180) / 180 * 30;     // finger gap (mm) for a gripper angle
const G_CONTACT = (BLK - 4) / 30 * 180;                 // the angle where the fingers meet the cube's sides
const yawOf = b => (b - 135) * Math.PI / 180;           // base 90: the arm points to the front right, 45 to the front, 135 to the right
// a point in the turntable's frame (u forward, v to the arm's left, z up) and in the link's (a along it, c across)
const tw = (b, u, v, z) => { const q = yawOf(b), f = [Math.cos(q), Math.sin(q)], s = [-f[1], f[0]]; return [AX + u * f[0] + v * s[0], AY + u * f[1] + v * s[1], z]; };
const lw = (b, e, a, v, c) => tw(b, a * Math.cos(e) - c * Math.sin(e), v, AXZ + a * Math.sin(e) + c * Math.cos(e));
const grip = (b, s) => lw(b, elev(s), 86, VC, 0);       // the middle between the fingers
const spot = b => { const p = grip(b, 48); return [p[0], p[1], BLK / 2]; };   // where a cube sits for the arm lowered at 48°

// a box between two corners of a frame Wf (all six faces, the ones turned to the viewer)
const obox = (Wf, x0, y0, z0, x1, y1, z1, m, w = .8) => {
  const c = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]].map(q => Wf(...q));
  const cen = avg(c);
  let s = '';
  for (const fc of [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]]){
    const q = fc.map(i => c[i]), n = norm(sub(avg(q), cen));
    if (vis(n)) s += shape(q, toneI(n, m), w);
  }
  return { svg: s, box: B.aabb(c) };
};
const buzz = (W, at) => { const [X, Y] = P(...W(...at));
  return `<path d="M${f(X - 7)} ${f(Y - 4)}l-3 -2M${f(X + 7)} ${f(Y - 4)}l3 -2M${f(X - 8)} ${f(Y + 1)}l-4 0M${f(X + 8)} ${f(Y + 1)}l4 0" stroke="#e2483d" stroke-width=".9" stroke-linecap="round"/>`; };
const smoke = (W, at) => { const [X, Y] = P(...W(...at)); return `<circle cx="${f(X)}" cy="${f(Y - 5)}" r="4" fill="#8a847a" opacity=".45"/><circle cx="${f(X + 3)}" cy="${f(Y - 10)}" r="3" fill="#8a847a" opacity=".3"/>`; };

const DEMO = { a: [90, 90, 90], st: ['off', 'off', 'off'], cube: { at: spot(45), yaw: yawOf(45), held: false } };
B.part('pca-arm', {
  name: 'Three-servo desk arm (3 x SG90)', legs: ['GND0', 'V0', 'SIG0', 'GND1', 'V1', 'SIG1', 'GND2', 'V2', 'SIG2'],
  matSize: [AW, AH], foot: [AW, AH, 110],
  draw(ctx){
    const pl = ctx.pl, arm = (ctx.st && ctx.st.arm) || DEMO, t = (ctx.st && ctx.st.t) || 0;
    const W = (x, y, z) => pl.at(x, y, pl.zTop + z);
    const put = o => ctx.put(o.box, o.svg);
    const shake = i => arm.st[i] === 'jitter' || arm.st[i] === 'stop' || arm.st[i] === 'over' ? Math.sin(t * 61 + i) * 2.5 : 0;
    const [b, s, g] = [0, 1, 2].map(i => arm.a[i] + shake(i));
    const e = elev(s), caseOf = i => arm.st[i] === 'burnt' ? BURNT : CASE;
    const T = (u, v, z) => W(...tw(b, u, v, z)), L = (a, v, c) => W(...lw(b, e, a, v, c));
    // the base plate and the base servo standing in it, shaft up at the axis
    put(obox(W, AX - 26, AY - 26, 0, AX + 26, AY + 26, 3, ACRYL));
    put(obox(W, AX - 6, AY - 5.9, 3, AX + 16.2, AY + 5.9, 25.7, caseOf(0)));
    put(obox(W, AX - 11, AY - 5.9, 18.5, AX + 21.2, AY + 5.9, 21, caseOf(0)));
    // the turntable: a disc on the base servo's horn, a mark showing which way the arm faces
    const [cx, cy] = W(AX, AY, 0);
    const tt = cyl(cx, cy, W(0, 0, 25.7)[2], W(0, 0, 28.5)[2], 17, ACRYL, toneI, .8);
    ctx.put(B.aabb([W(AX - 17, AY - 17, 25.7), W(AX + 17, AY + 17, 28.5)]), tt);
    // the shoulder: a printed block on the turntable carrying the shoulder servo on its side, shaft toward the link
    put(obox(T, -9, -14, 28.5, 9, 9, 38.1, ACRYL));
    put(obox(T, -6, -14, 38.1, 16.2, 8.7, 49.9, caseOf(1)));
    const hub = rod(T(0, 8.7, AXZ), T(0, 11, AXZ), 2.6, HORN, toneI, .5);
    ctx.put(B.aabb([T(-3, 8.7, AXZ - 3), T(3, 11, AXZ + 3)]), hub);
    // the link from the shoulder to the gripper
    put(obox(L, -6, VC - 2.5, -5, LINK, VC + 2.5, 5, ACRYL));
    // the gripper: its servo across the end of the link and two fingers that open sideways
    put(obox(L, LINK - 8, VC - 9, -6, LINK + 6, VC + 9, 6, caseOf(2)));
    const gap = arm.gap != null ? arm.gap : gapOf(g);
    put(obox(L, LINK + 6, VC + gap / 2, -5, 96, VC + gap / 2 + 2, 5, ACRYL));
    put(obox(L, LINK + 6, VC - gap / 2 - 2, -5, 96, VC - gap / 2, 5, ACRYL));
    // the cube: in the fingers, or where it was let go
    const cb = arm.cube, h = BLK / 2, cq = cb.yaw, cf = [Math.cos(cq), Math.sin(cq)];
    const CW = (u, v, z) => W(cb.at[0] + u * cf[0] - v * cf[1], cb.at[1] + u * cf[1] + v * cf[0], cb.at[2] + z);
    put(obox(CW, -h, -h, -h, h, h, h, FOAM, .7));
    // each servo's lead from the base to its plug, the plug's three sockets on its legs
    const leads = ['#6b4a2e', '#d23a2f', '#f08a24'];
    let ls = '';
    PLUGS.forEach(([x, y], i) => {
      for (let k = 0; k < 3; k++){ const dx = (k - 1) * 1.1;
        ls += `<path d="${pd([W(AX - 4 + dx + i * 2, AY + 6, 2), W(AX - 4 + dx + i * 2, AY + 14, 1), W(x + dx, y - 6, 1), W(x + dx, y - 3.6, 1.4)], false)}" fill="none" stroke="${leads[k]}" stroke-width=".9"/>`; }
    });
    ctx.put(B.aabb([W(AX - 8, AY + 6, 0), W(PLUGS[2][0] + 4, PLUGS[2][1], 2)]), ls);
    for (const [x, y] of PLUGS) put(obox(W, x - 3.9, y - 3.6, 0, x + 3.9, y + 1.3, 2.6, B.M.black, .7));
    // what is wrong, at each servo
    const at = [[AX + 5, AY, 27], tw(b, 5, -3, 52), lw(b, e, LINK, VC, 8)];
    let marks = '';
    at.forEach((q, i) => { if (['jitter', 'stop', 'over'].includes(arm.st[i])) marks += buzz(W, q); if (arm.st[i] === 'burnt') marks += smoke(W, q); });
    if (marks) ctx.put(B.aabb([W(0, 0, 60), W(AW, AH, 110)]), marks);
  },
});
B.parts['pca-arm'].legLocal = LEG_LOCAL;

/* ---------- the sketches: what the Nano asks of each channel ---------- */
const sweepDeg = t => { const u = (t % 6) / 3; return 180 * (u < 1 ? u : 2 - u); };
// pick and place: base, shoulder, grip for each 1 s pose; every second round runs mirrored (base 180 - b), so the cube
// goes back and forth
const POSES = [[90, 90, 90], [45, 90, 150], [45, 48, 150], [45, 48, 70], [45, 120, 70], [135, 120, 70], [135, 48, 70], [135, 48, 150]];
const poseAt = (k, stall) => { const p = POSES[k % 8].slice(), flip = Math.floor(k / 8) % 2 === 1;
  if (flip) p[0] = 180 - p[0];
  if (stall && p[2] === 70) p[2] = 0;
  return p; };
const poseLine = (k, stall) => { const p = poseAt(k, stall); return `pose ${k % 8 + 1}: base ${p[0]} shoulder ${p[1]} grip ${p[2]}`; };
const want = (st, stall) => {
  if (st.mode === 'centre') return [90, 90, 90];
  if (st.mode === 'sweep') return [sweepDeg(st.t), 90, 90];
  if (st.mode === 'pick') return poseAt(Math.floor(st.t), stall);
  return null;                                            // scan: no begin(), the chip stays asleep
};
const modes = {
  centre: { title: 'Centre the arm', bytes: 6178, banner: 'pca9685: 50 Hz, ch0-2 at 1500 us (307 ticks)', out: () => ({ A4: 1, A5: 1 }),
    serial: () => null },
  sweep: { title: 'Sweep the base', bytes: 6342, banner: 'sweep: base 0-180-0, 6 s a round trip', out: () => ({ A4: 1, A5: 1 }),
    serial: k => 'base ' + Math.round(sweepDeg(k)) + ' deg' },
  pick: { title: 'Pick and place', bytes: 7206, banner: 'pick and place: 8 poses, 1 s each', out: () => ({ A4: 1, A5: 1 }),
    serial: (k, st) => poseLine(k, (st.faults || []).includes('gripper-stall')) },
  scan: { title: 'I2C scan', bytes: 4682, banner: 'I2C scanner', out: () => ({ A4: 1, A5: 1 }),
    serial: (k, st) => (k % 2 === 0 ? `I2C device found at address 0x${P9.addrOf(st).toString(16)} !` : 'I2C device found at address 0x70 !') },
};

/* ---------- the model ---------- */
const stepOn = (st, id) => { const steps = B.matSetup().steps, i = steps.findIndex(s => s.id === id); return i >= 0 && st.matStep >= i; };
const OFF16 = () => Array(16).fill(0);
const coldSda = st => (st.faults || []).includes('cold:JP3.3') && Math.floor(st.t * 3.3) % 3 === 0;

function model(st, dt){
  const ev = st.ev || { rails: {} }, rails = ev.rails || {}, faults = st.faults || [], has = x => faults.includes(x);
  const arm = st.arm || (st.arm = { a: [90, 90, 90], cmd: [90, 90, 90], st: ['off', 'off', 'off'], cube: { at: spot(45), yaw: yawOf(45), held: false }, hot: 0, mode: null, gap: gapOf(90) });
  const run = ev.status === 'running' && !st.up && st.t >= 0, stall = has('gripper-stall');
  // a new sketch starts its first round with the cube back on its start spot (you put it there before uploading)
  if (st.mode !== arm.mode || (st.mode === 'pick' && st.t < arm.lastT)){ arm.mode = st.mode; if (!arm.cube.held) arm.cube = { at: spot(45), yaw: yawOf(45), held: false }; }
  arm.lastT = st.t;
  // the chip: asleep until the sketch begins it; answers 0x40 only with the jumpers open; a cold SDA joint loses writes
  const hz = has('no-freq') ? 1000 : 50, addrOk = P9.addrOf(st) === 0x40;
  const goal = run && addrOk ? want(st, stall) : null;
  if (goal && st.mode === 'pick' && dt > 0) for (let j = 0; j < 3; j++) arm.cmd[j] += clamp(goal[j] - arm.cmd[j], -EASE * dt, EASE * dt);
  else if (goal) arm.cmd = goal.slice();
  const fresh = goal ? { hz, us: Object.assign(OFF16(), arm.cmd.map(P9.usOf)), asleep: false } : { hz: 0, us: OFF16(), asleep: true };
  st.pca = coldSda(st) && st.pca && run ? st.pca : fresh;
  const pca = st.pca, frame = pca.hz ? P9.frameHz(pca.hz) : 0;
  // servo power: the pack through Q1 (a reversed pack: Q1 stays off), or the Nano's 5 V on a brown-out
  const pack = st.power && stepOn(st, 'pack');
  let vNoLoad = 0;
  if (ev.status === 'brownout') vNoLoad = rails.VCC || 0;
  else if (pack && !has('pack-reversed')) vNoLoad = rails['V+'] || 0;
  const over = vNoLoad > 7.5;
  arm.hot = over && dt > 0 ? arm.hot + dt : over ? arm.hot : 0;
  // each servo: its pulse, the supply, and what stops it
  let ma = 0;
  const pulses = run && !pca.asleep && frame > 0 && frame < 70;
  for (let j = 0; j < 3; j++){
    const us = pca.us[j], target = clamp(P9.degOf(us), 0, 180);
    let state = 'ok', i = 10;
    if (arm.hot > 1.2) { state = 'burnt'; i = 0; }
    else if (vNoLoad < 3) { state = 'off'; i = 0; }
    else if (!run || pca.asleep || !us) state = 'off';
    else if (!pulses || vNoLoad < 4.2) { state = 'jitter'; i = 120; }
    else {
      const lim = j === 2 && arm.cube.held ? G_CONTACT : 0, to = Math.max(lim, target);
      const step = clamp(to - arm.a[j], -SPEED * dt, SPEED * dt);
      if (Math.abs(step) > .05) i = 180;
      arm.a[j] += step;
      if (j === 2 && arm.cube.held && target < G_CONTACT - 10) { state = 'stop'; i = 450; }
      else if (j === 2 && arm.cube.held && target < G_CONTACT) i = 60;
      if (over) { state = 'over'; i = Math.max(i, 300); }
    }
    arm.st[j] = state; ma += i;
  }
  // the cube: caught when the fingers close round it, carried, dropped where the fingers open
  const g = arm.a[2], mid = grip(arm.a[0], arm.a[1]), c = arm.cube;
  const near = Math.hypot(mid[0] - c.at[0], mid[1] - c.at[1], mid[2] - c.at[2]) < 7;
  if (!c.held && near && gapOf(g) < BLK + .5) c.held = true;
  if (c.held && gapOf(g) > BLK + 1.5 && arm.st[2] !== 'burnt') { c.held = false; c.at = [mid[0], mid[1], BLK / 2]; }
  if (c.held){ c.at = mid; c.yaw = yawOf(arm.a[0]); }
  arm.gap = c.held ? Math.max(BLK, gapOf(g)) : gapOf(g);
  const vplus = Math.max(0, vNoLoad - (vNoLoad > 0 && ev.status !== 'brownout' ? RPACK * ma / 1000 : 0));
  // what the bench says
  const deg = Math.round(arm.a[0]);
  let status = 'Unpowered';
  if (st.power && ev.status === 'no-power') status = 'No power: set out the Nano and the pack';
  else if (st.power && ev.status === 'fault') status = 'Fault: unplug and repair';
  else if (st.power && ev.status === 'brownout') status = "Servos on the Nano's 5 V: it browns out and resets";
  else if (st.power && !run) status = 'Powered, nothing running';
  else if (run && !pack) status = 'No servo power: set out the pack';
  else if (run && has('pack-reversed')) status = 'Pack reversed: Q1 blocks it, the servos are limp';
  else if (run && arm.st.includes('burnt')) status = vNoLoad.toFixed(1) + ' V on V+: the servos burnt out';
  else if (run && over) status = vNoLoad.toFixed(1) + ' V on V+: the servos buzz hot';
  else if (run && st.mode === 'scan') status = `I2C scan: 0x${P9.addrOf(st).toString(16)} and 0x70 answer`;
  else if (run && !addrOk) status = 'No answer at 0x40: the board is at 0x41';
  else if (run && !pulses && !pca.asleep) status = Math.round(frame) + ' Hz frame: the servos twitch';
  else if (run && arm.st[2] === 'stop') status = 'Gripper stalled on the cube: ' + ma + ' mA';
  else if (run && st.mode === 'pick') status = (c.held ? 'Carrying the cube: pose ' : 'Pick and place: pose ') + (Math.floor(st.t) % 8 + 1);
  else if (run && st.mode === 'sweep') status = 'Base at ' + deg + '°';
  else if (run) status = 'Servos centred: 1500 µs';
  const live = st.power && run;
  const stats = live ? [['V+', vplus.toFixed(1) + ' V'], ...(frame ? [['Frame', (1000 / frame).toFixed(1) + ' ms']] : []),
    ['Arm', `${deg}° · ${Math.round(arm.a[1])}° · ${Math.round(arm.a[2])}°`], ['Servos', ma + ' mA']] : [];
  return {
    readings: { ARM: { b: deg, s: Math.round(arm.a[1]), g: Math.round(arm.a[2]), i_mA: ma, held: c.held ? 1 : 0 },
      PACK: { state: has('pack-reversed') ? 'reverse' : (st.supply || {}).bench > 10 ? 'li-ion' : 'ok', v: r1(vplus), i_mA: Math.round(ma) } },
    report: {
      pwm: { hz: live && !pca.asleep ? Math.round(frame * 100) / 100 : 0, us: pca.us.slice(0, 4).map(Math.round) },
      arm: { base: deg, shoulder: Math.round(arm.a[1]), grip: Math.round(arm.a[2]), vplus: r1(vplus), ma, held: c.held, states: arm.st.slice() },
    },
    status, stats,
    flow: { SDA: live && !!goal, SCL: live && !!goal, PWM0: pulses && pca.us[0] > 0, PWM1: pulses && pca.us[1] > 0, PWM2: pulses && pca.us[2] > 0, 'V+': vplus > 1 },
    accent: arm.st[2] === 'stop' ? ['ARM'] : has('pack-reversed') && run ? ['PACK'] : [],
  };
}

const AT = [-10, -145];
const W = (from, to, color, step) => ({ from, to, color, step });
const lead = (i, block) => [W(`ARM.SIG${i}`, `${block}.${3 * i + 1}`, 'orange', 'arm'), W(`ARM.V${i}`, `${block}.${3 * i + 2}`, 'red', 'arm'), W(`ARM.GND${i}`, `${block}.${3 * i + 3}`, 'brown', 'arm')];
B.bench({
  id: 'pca9685', fig: '08', board: 'pca9685', pal: 'blush', view: 'board',
  name: 'PCA9685 servo arm',
  sub: 'Build the servo driver, wire a Nano, a 4 x AA pack and a three-servo arm, then make it pick and place',
  mat: { front: 8, back: 8, left: 8, right: 8 },
  pinMap: { A4: 'SDA', A5: 'SCL' },
  modes, mode: 'centre',
  power: Object.assign({}, base.power, {
    // one switch: the Nano on USB (its 5 V is the board's VCC) and the pack on the V+ terminal
    sources: { bench: { label: 'Nano on USB, 4 x AA on the V+ terminal', part: 'J1', v: 6, parts: ['NANO', 'PACK'] } },
    default: 'bench',
  }),
  periph: [
    { id: 'NANO', board: 'nano', at: [-66, 4], step: 'nano', name: 'Arduino Nano' },
    { id: 'ARM', part: 'pca-arm', at: AT, legs: LEG_LOCAL.map(([x, y]) => [AT[0] + x, AT[1] + y]), step: 'arm', name: 'Three-servo arm' },
    { id: 'PACK', part: 'aa-holder-4', at: [2, 34], params: { rot: 0 }, step: 'pack', name: '4 x AA holder' },
  ],
  matSteps: [
    { id: 'nano', label: 'Put the Nano down and wire VCC, GND, SDA and SCL' },
    { id: 'arm', label: 'Stand the arm in front and plug its servos into channels 0-2' },
    { id: 'pack', label: 'Put the AA pack down and screw its leads into V+ and GND' },
  ],
  wires: [
    W('JP3.2', 'NANO.5V', 'red', 'nano'), W('JP3.6', 'NANO.GND', 'black', 'nano'), W('JP3.3', 'NANO.A4', 'blue', 'nano'), W('JP3.4', 'NANO.A5', 'yellow', 'nano'),
    ...lead(0, 'JP2'), ...lead(1, 'JP2'), ...lead(2, 'JP2'),
    W('PACK.+', 'J1.1', 'red', 'pack'), W('PACK.-', 'J1.2', 'black', 'pack'),
  ],
  faults: [['pack-reversed', 'AA pack leads swapped on the terminal'], ['wrong-voltage:bench:16.8', 'Four 14500 Li-ion cells in the AA holder'],
    ['no-freq', 'Sketch without setPWMFreq(50)'], ['gripper-stall', 'Gripper closed all the way on the cube']],
  model,
});
})();
