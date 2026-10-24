// @cf title 5-inch racing quad
// @cf use engine/drone.js
// @cf use engine/drone-geo.js
// @cf use engine/drone-frames.js
// @cf use engine/drone-pieces.js
// @cf use engine/drone-sheet.js
/* Fig. 05, the 5-inch racing quad on Betaflight (docs/facts/racer.md).
   Stretched-X frame: motors at x +-86, y +-70 mm (172 mm front to back, 140 mm side to side, 221.8 mm motor to
   motor), 12 mm wide 4 mm carbon arms, a 120 x 32 mm centre plate, a 20 x 20 mm stack (45 A 4-in-1 ESC, F7 flight
   controller, race VTX) under a 92 x 34 mm top plate on 20 mm standoffs, a 14 mm nano camera at 40 deg uptilt,
   ELRS receiver with its T antenna on the rear-right arm, eight WS2812B LEDs on the rear arms, XT60 to the tail.
   Craft-local mm: x forward, y left, z up, z = 0 on the mat. Betaflight QUAD X order, props in. */
(() => {
  const SD = SL.drone, g = SD.g, W = SD.W;
  const H20 = [[10, 10], [10, -10], [-10, 10], [-10, -10]];
  const ARM_TOP = 4;
  const unit = (x, y) => { const L = Math.hypot(x, y); return [x / L, y / L]; };
  const along = (u, r, z, side = 0) => [u[0] * r - u[1] * side, u[1] * r + u[0] * side, z];

  // the 8-pin ESC harness on the stack's right-hand edge: GND, VBAT, M1-M4, CUR, TEL (four strands drawn)
  const harness = ctx => {
    const out = [];
    [['#2c2926', -4.2], ['#d8473a', -3], ['#e8d36a', -1.8], ['#e8d36a', -.6]].forEach(([col, x]) =>
      out.push(...g.wire([[x, -11.8, 9.9], [x, -15.4, 10.4], [x, -15.4, 12.8], [x, -11.8, 13.2]], col, .6, 4)));
    ctx.flows.push({ kind: 'signal', pts: [[-2.4, -11.8, 10.2], [-2.4, -15.4, 10.6], [-2.4, -15.4, 13], [-2.4, -11.8, 13.4]].map(p => W(...p)) });
    return out;
  };

  // camera: 3 wires (video, 5 V, GND) from the back of the camera to the CAM pads at the front of the FC
  const camWires = ctx => {
    const out = [];
    [['#e8d36a', 0], ['#d8473a', 1.2], ['#2c2926', -1.2]].forEach(([col, dy]) =>
      out.push(...g.wire([[38, dy, 10.5], [28, dy + 2, 12.5], [18, dy + 2.5, 14.4], [12.8, dy + 2.5, 14.6]], col, .6, 5)));
    ctx.flows.push({ kind: 'video', pts: [[38, 0, 10.8], [28, 2, 12.8], [18, 2.5, 14.7], [12.8, 2.5, 14.9]].map(p => W(...p)) });
    return out;
  };

  // VTX: u.FL coax from the VTX board out the back to the antenna mount
  const vtxCoax = ctx => {
    ctx.flows.push({ kind: 'video', pts: [[-6, 0, 21.5], [-12.6, 0, 19.6]].map(p => W(...p)) });
    return g.wire([[-12.6, 0, 19.6], [-30, 0, 21.4], [-49, 0, 22.4], [-54, 0, 26]], '#2c2926', 1.2, 7);
  };

  // receiver: four wires to the UART2 pads (5 V, GND, TX, RX), then the coax along the rear-right arm to a T dipole
  const RR = unit(-86, -70);
  const rxWiring = ctx => {
    const out = [];
    [['#d8473a', -3.6], ['#2c2926', -4.8], ['#43a35a', -6.0], ['#f4f1e8', -7.2]].forEach(([col, y]) =>
      out.push(...g.wire([[-24.2, y + .4, 6], [-19, y - 1, 9.5], [-13.8, y - 3, 13.6], [-12.4, y - 3, 14.6]], col, .55, 4)));
    ctx.flows.push({ kind: 'signal', pts: [[-24.2, -5, 6.2], [-19, -6, 9.7], [-13.8, -8, 13.8]].map(p => W(...p)) });
    const tip = along(RR, 60, ARM_TOP + 1.4, 5.4);
    out.push(...g.wire([[-35.6, -9, 5.6], along(RR, 40, ARM_TOP + 1.2, 5.4), tip], '#2c2926', 1, 6));
    const up = [0, 0, 1], side = [-RR[1], RR[0], 0];
    for (const s of [-1, 1]){
      const d = SD.normd([side[0] * s * .82 + up[0] * .57, side[1] * s * .82 + up[1] * .57, up[2] * .57]);
      out.push(...g.rod(tip, [tip[0] + d[0] * 22, tip[1] + d[1] * 22, tip[2] + d[2] * 22], .75, 'white', 8, 6));
    }
    return out;
  };

  // LED strips: four WS2812B LEDs on each rear arm, one chain of eight. The FC's LED pad feeds the rear-left strip at its
  // outer end (LED 0), the chain runs inward, crosses the rear of the frame and runs out along the rear-right arm (LED 7).
  const REAR = [unit(-86, 70), unit(-86, -70)];
  const RACE_GREEN = '#43c25c';
  const ledStrips = ctx => {
    const items = [], on = ctx.powered, n = [0, 0, 1];
    REAR.forEach((u, s) => {
      const v = [-u[1], u[0], 0], uu = [u[0], u[1], 0];
      items.push(g.oblock([u[0] * 62, u[1] * 62, ARM_TOP + .3], uu, v, n, 24, 4, .3, 'white', .6));
      for (let i = 0; i < 4; i++){
        const r = 44 + i * 12, c = [u[0] * r, u[1] * r, ARM_TOP + .6];
        const it = g.oblock([c[0], c[1], c[2] + .8], uu, v, n, 2.5, 2.5, .8, '#f4f1e8', .6);
        it.svg += g.led(c[0], c[1], c[2] + 1.7, RACE_GREEN, on, 1.6);
        items.push(it);
      }
    });
    const L = REAR[0], R = REAR[1];
    const feed = [[-11.4, 11.4, 14.6], [-17, 15, 11], along(L, 30, ARM_TOP + .7, -5), along(L, 88, ARM_TOP + .7, -5)];
    const chain = [along(L, 38, ARM_TOP + .7, 4.6), [-40, 9, ARM_TOP + .7], [-40, -9, ARM_TOP + .7], along(R, 38, ARM_TOP + .7, -4.6)];
    [['#d8473a', -.9], ['#43a35a', 0], ['#2c2926', .9]].forEach(([col, o]) => {
      items.push(...g.wire(feed.map(p => [p[0], p[1] + o, p[2]]), col, .5, 5));
      items.push(...g.wire(chain.map(p => [p[0] + o, p[1], p[2]]), col, .5, 5));
    });
    ctx.flows.push({ kind: 'signal', pts: feed.map(p => W(...p)) });
    return items;
  };

  // extra bench checks; the engine reports state.checks.<id> once it exposes api.pass (docs/requests/item-racer.md)
  const pass = (api, id) => {
    if (typeof api.pass === 'function') api.pass(id);
    else if (api.st) api.st.checks = Object.assign({}, api.st.checks, { [id]: true });
    api.render();
  };
  const failsafeTest = api => {
    if (!api.isOn('RX') || !api.isOn('FC')) return api.say('Fit the receiver and the flight controller first', 2600, 'buzz');
    if (api.isOn('PROPS')) return api.say('PROPS OFF! Never spin motors on the bench with props on', 2600, 'buzz');
    if (!api.st || !api.st.plugged || api.st.fault) return api.say('Plug in the battery for the failsafe test (props off)', 2600, 'buzz');
    api.log('$ props off, arm on the bench, switch the radio off');
    api.log('RXLOSS: failsafe stage 1 for failsafe_delay = 15 (1.5 s)');
    api.log('failsafe stage 2: DROP, motors stopped, disarmed');
    api.say('Radio off: after 1.5 s the motors stopped and the quad disarmed (DROP). Failsafe works', 3600, 'ding');
    pass(api, 'failsafe');
  };
  const rxTest = api => {
    if (!api.isOn('RX') || !api.isOn('FC')) return api.say('Fit the receiver and the flight controller first', 2600, 'buzz');
    api.log('$ receiver tab: CRSF on UART2, link quality 100 %');
    api.log('roll, pitch, yaw 1000-1500-2000 us, throttle 1000 us at low stick');
    api.log('AUX1 arm switch 1000 / 2000 us');
    api.say('Receiver bound: every channel moves the right way, 1000-2000 µs, arm switch on AUX1', 3200, 'ding');
    pass(api, 'rx');
  };

  SD.define({
    id: 'racer', fig: '05', title: '5-inch racing quad', palette: 'mustard',
    mat: 320, height: 100, explode: 12, log: 'betaflight',
    bounds: [-96, 96, -76, 76, 0, 40],
    frame: {
      layout: 'stretch-x', wheelbase: 221.8, stretch: 86 / 70, numbering: 'betaflight',
      motors: [
        { id: 'M1', at: [-86, -70], dir: 'CW' },
        { id: 'M2', at: [86, -70], dir: 'CCW' },
        { id: 'M3', at: [-86, 70], dir: 'CCW' },
        { id: 'M4', at: [86, 70], dir: 'CW' },
      ],
      arm: { w: 12, t: 4, from: 18, pad: 13 }, plate: { l: 120, w: 32, z: 0, r: 6 }, motorZ: ARM_TOP,
    },
    design: {
      default: { batt: '4s1300', motor: '2207-2500', prop: '5x4.8x3' },
      batts: {
        '4s1300': { cells: 4, mah: 1300, size: [72, 38, 25], color: '#2b2a28', label: '4S 1300' },
        '4s1500': { cells: 4, mah: 1500, size: [76, 36, 30], color: '#d9a520', label: '4S 1500' },
        '6s1000': { cells: 6, mah: 1000, size: [72, 33, 36], color: '#2f5fa8', label: '6S 1000' },
      },
      motors: {
        '2207-2500': { stator: [22, 7], bell: [27.1, 16.5], kv: 2500, label: '2207 2500KV' },
        '2306-2700': { stator: [23, 6], bell: [27.9, 15.5], kv: 2700, label: '2306 2700KV' },
        '2207-1950': { stator: [22, 7], bell: [27.1, 16.5], kv: 1950, label: '2207 1950KV' },
      },
      props: {
        '5x4.8x3': { d: 5, pitch: 4.8, blades: 3, color: '#4fa3d1', label: '5x4.8x3' },
        '5.1x3.6x3': { d: 5.1, pitch: 3.6, blades: 3, color: '#71b693', label: '5.1x3.6x3' },
        '5x5.2x3': { d: 5, pitch: 5.2, blades: 3, color: '#d8473a', label: '5x5.2x3' },
      },
    },
    parts: [
      { id: 'FRAME', short: 'FRAME', name: 'Stretched-X carbon race frame', z: 0,
        piece: { kind: 'frame' }, tag: { at: [62, 52, 4], dx: 40, dy: -40 } },
      { id: 'MOTORS', short: 'MOTORS', name: '4 race motors (2207)', after: ['FRAME'], z: 1.6,
        piece: { kind: 'motors' }, tag: { at: [86, 70, 24], dx: 72, dy: 30 },
        xr: [{ at: [86, -70, 14], text: 'STATOR 22 x 7 MM' }] },
      { id: 'ESC', short: '4-IN-1 ESC', name: '45 A 4-in-1 ESC (AM32), 20 x 20 mm', after: ['FRAME'], z: 1,
        piece: [
          { kind: 'standoffs', at: H20, z0: ARM_TOP, z1: 8, r: 2.2, color: '#3d3b39' },
          { kind: 'board', at: [0, 0, 8], size: [27, 27], t: 1.6, color: 'pcbBlack', holes: 20, fets: 4,
            chips: [{ at: [0, 3.6], size: [2.6, 2.6, .7] }, { at: [0, -3.6], size: [2.6, 2.6, .7] }, { at: [3.6, 0], size: [2.6, 2.6, .7] }, { at: [-3.6, 0], size: [2.6, 2.6, .7] }],
            pads: [{ at: [-11.6, -4.5], size: [3.6, 6] }, { at: [-11.6, 4.5], size: [3.6, 6] }] },
        ],
        tag: { at: [13, -13, 9.6], dx: 92, dy: 40 } },
      { id: 'WIRES', short: 'MOTOR WIRES', name: 'Motor wires, cut short and soldered', after: ['MOTORS', 'ESC'], z: 1.3,
        piece: { kind: 'wires', from: [0, 0, 9.6], padR: 16.5, edge: 3 },
        tag: { at: [54, 44, 5], dx: -70, dy: 44 } },
      { id: 'XT60', short: 'XT60 + CAP', name: 'XT60 pigtail + 1000 µF 35 V low-ESR capacitor', after: ['ESC'], z: 2,
        polar: ['stripe to minus', 'stripe to plus'],
        piece: { kind: 'xt60', at: [-82, 0, 4.2], dir: [-1, 0, 0], lead: [[-12.6, 0, 10], [-22, 0, 10], [-46, 0, 7.4], [-73, 0, 4.4]],
          cap: { at: [-16, 12, 10.3], dir: [-1, 0, 0], r: 6.25, l: 20, stripe: [0, 1, 0],
            leads: [[[-16, 9.6, 10.3], [-12.6, -3.6, 10.2]], [[-16, 14.4, 10.3], [-12.6, 5.4, 10]]] } },
        tag: { at: [-82, 0, 9], dx: -54, dy: -30 } },
      { id: 'FC', short: 'FLIGHT CTRL', name: 'F7 flight controller, 20 x 20 mm', after: ['ESC'], z: 2.6,
        polar: ['arrow forward', 'arrow backward'],
        piece: [
          { kind: 'standoffs', at: H20, z0: 9.6, z1: 13, r: 2.1, color: '#3d3b39' },
          { kind: 'board', at: [0, 0, 13], size: [27, 27], t: 1.6, color: 'pcbBlue', holes: 20, arrow: true, arrowAt: [-5.5, 0],
            chips: [{ at: [5, 2.5], size: [9, 9, 1.3], label: 'F722' }, { at: [-6, -8], size: [3, 3, .9] }, { at: [-5.5, 7], size: [5.5, 4, .9] }],
            led: '#4aa3ff', ledAt: [-10.5, 4], usb: [0, -12] },
          { kind: 'custom', draw: harness },
        ],
        tag: { at: [12, 12, 15.5], dx: -100, dy: 6 },
        xr: [{ at: [5, 2.5, 16], text: 'F722 MCU + GYRO' }] },
      { id: 'VTX', short: 'VTX', name: '25-200 mW race VTX (SmartAudio)', after: ['FC'], z: 3.8,
        piece: [
          { kind: 'standoffs', at: H20, z0: 14.6, z1: 18, r: 2, color: '#3d3b39' },
          { kind: 'board', at: [0, 0, 18], size: [27, 27], t: 1.2, color: 'pcbBlack', holes: 20,
            chips: [{ at: [2, 0], size: [15, 15, 2.2], color: 'alu' }], led: '#e2483d', ledAt: [-10.5, -4] },
          { kind: 'custom', draw: vtxCoax },
          { kind: 'antenna', at: [-54, 0, 26], type: 'lollipop', dir: [-.5, 0, .87], len: 24, head: 7 },
        ],
        tag: { at: [-8, 8, 21], dx: -84, dy: -50 }, xr: [{ at: [2, 0, 21.6], text: 'RACEBAND R4, 25 MW' }] },
      { id: 'CAM', short: 'CAMERA', name: 'Nano low-latency camera, 40° uptilt', after: ['FRAME'], z: 2,
        piece: [{ kind: 'camera', at: [44, 0, 14.5], size: 14, tilt: 40, depth: 14, lens: 5, plates: { gap: 1, l: 20, h: 21, t: 2, color: 'pal' } },
          { kind: 'custom', draw: camWires }],
        tag: { at: [52, 0, 22], dx: 74, dy: 18 }, xr: [{ at: [48, 0, 20], text: 'NANO CAM, 40° UP' }] },
      { id: 'RX', short: 'RECEIVER', name: 'ELRS 2.4 GHz receiver (CRSF)', after: ['FC'], z: 2.4,
        piece: [{ kind: 'module', at: [-30, -6, ARM_TOP], size: [12, 10, 3], color: 'pcbBlack', label: 'ELRS', labelSize: .3, led: '#43c463', ledAt: [3.8, 3] },
          { kind: 'custom', draw: rxWiring }],
        tag: { at: [-30, -6, 7], dx: 46, dy: -70 }, xr: [{ at: [-30, -6, 7.4], text: 'ELRS RX, UART2 CRSF' }] },
      { id: 'LED', short: 'LED STRIP', name: 'LED strips on the rear arms', after: ['FRAME', 'FC'], z: 1.2,
        piece: { kind: 'custom', draw: ledStrips },
        tag: { at: [-50, 41, 6], dx: -66, dy: 30 }, xr: [{ at: [-48, 39, 7], text: 'WS2812B x8 LEDS' }] },
      { id: 'TOP', short: 'TOP PLATE', name: 'Thin top plate + 20 mm standoffs', after: ['FC', 'CAM', 'RX', 'VTX'], z: 4.8, cover: true,
        piece: [{ kind: 'standoffs', at: [[40, 13], [40, -13], [-40, 13], [-40, -13]], z0: ARM_TOP, z1: 24, r: 2.5, split: 10 },
          { kind: 'plate', l: 92, w: 34, r: 5, z: 24, t: 2, color: 'carbon' }],
        tag: { at: [40, -13, 26], dx: 84, dy: -30 } },
      { id: 'BATT', short: 'BATTERY', name: 'Race LiPo + strap and grip pad', after: ['TOP', 'XT60'], z: 6.2, cover: true,
        piece: { kind: 'battery', at: [0, 0, 26], strap: true, pad: true },
        tag: { at: [-8, 0, 54], dx: 0, dy: -42 } },
      { id: 'PROPS', short: 'PROPS', name: 'Race propellers, 2 CW + 2 CCW', after: ['MOTORS', 'TOP'], z: 3.4,
        polar: ['props in (correct)', 'swapped CW/CCW'],
        piece: { kind: 'props' }, tag: { at: [148, -70, 26], dx: 50, dy: -10 } },
    ],
    tests: {
      smoke: { needs: ['XT60', 'ESC'], at: [-135, 0] },
      motors: { needs: ['WIRES', 'FC'] },
      calibrate: { needs: ['FC'] },
      plug: { needs: ['BATT', 'XT60'] },
    },
    buttons: [
      { id: 'rxtest', label: 'Receiver test', onClick: rxTest },
      { id: 'failsafe', label: 'Failsafe test (radio off)', onClick: failsafeTest },
    ],
    wiring: {
      nodes: {
        BATT: { at: [10, 22], title: 'BATTERY', sub: 'batt', color: 'tomato' },
        XT60: { at: [10, 145], title: 'XT60 + CAP', sub: '1000 µF 35 V', color: 'tomato' },
        ESC: { at: [215, 145], title: '4-IN-1 ESC', sub: '45 A x4, AM32', color: '#f08a2b' },
        MOTORS: { at: [215, 268], title: 'MOTORS x4', sub: 'motor', color: '#f08a2b' },
        FC: { at: [420, 145], title: 'FLIGHT CTRL', sub: 'F7, Betaflight', color: '#43a35a', led: '#4aa3ff' },
        CAM: { at: [420, 22], title: 'CAMERA', sub: 'nano analog, 40° up', color: '#f2c230' },
        VTX: { at: [420, 268], title: 'RACE VTX', sub: 'R4 5769 MHz, 25 mW', color: '#f2c230', led: '#e2483d' },
        RX: { at: [610, 22], title: 'RECEIVER', sub: 'ELRS 2.4 GHz', color: '#5a82c6', led: '#43c463' },
        LED: { at: [610, 268], title: 'LED STRIPS', sub: 'WS2812B x8', color: '#43a35a', led: RACE_GREEN },
      },
      edges: [
        { from: 'BATT', to: 'XT60', kind: 'power', n: 2, label: 'V' },
        { from: 'XT60', to: 'ESC', kind: 'power', n: 2, label: 'VBAT' },
        { from: 'ESC', to: 'MOTORS', kind: 'phase', n: 3, label: '3-phase x4' },
        { from: 'FC', to: 'ESC', kind: 'signal', label: 'DShot600' },
        { from: 'CAM', to: 'FC', kind: 'video', label: 'CAM pad' },
        { from: 'FC', to: 'VTX', kind: 'video', label: 'video + OSD, SmartAudio', labelAt: [-24, 0] },
        { from: 'RX', to: 'FC', kind: 'signal', label: 'UART2 CRSF' },
        { from: 'FC', to: 'LED', kind: 'signal', label: 'LED pad + 5 V', labelAt: [26, 0] },
      ],
    },
  });
})();
