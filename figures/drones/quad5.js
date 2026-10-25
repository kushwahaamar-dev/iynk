// @cf title 5-inch freestyle quad
// @cf use engine/drone.js
// @cf use engine/drone-geo.js
// @cf use engine/drone-frames.js
// @cf use engine/drone-pieces.js
// @cf use engine/drone-sheet.js
/* Fig. 01, the 5-inch freestyle quad on Betaflight: the worked example of docs/FIGURES-DRONE.md.
   Geometry from docs/facts/quad5.md: true-X, 225 mm motor-to-motor (motors at +-79.5 mm), 5 mm carbon arms,
   30.5 x 30.5 mm stack, 2306 motors on 16 x 16 mm mounts, 5-inch tri-blade props (r 63.5 mm), 19 mm camera at 30 deg,
   battery on the top plate with the XT60 to the rear. Craft-local mm: x forward, y left, z up, z = 0 on the mat. */
(() => {
  const STACK = 30.5 / 2;
  const holes = [[STACK, STACK], [STACK, -STACK], [-STACK, STACK], [-STACK, -STACK]];
  const harness = ctx => {
    const out = [];
    [['#e8d36a', -16.6], ['#d8473a', -15.2], ['#2c2926', -13.8]].forEach(([col, y]) =>
      out.push(...SL.drone.g.wire([[-14, y, 17.8], [-21.6, y, 17.8], [-21.6, y, 11.4], [-15, y, 11.4]], col, .7, 5)));
    ctx.flows.push({ kind: 'signal', pts: [[-14, -15.2, 18.3], [-21.6, -15.2, 18.3], [-21.6, -15.2, 11.4], [-15, -15.2, 11.4]].map(p => SL.drone.W(...p)) });
    return out;
  };
  // Betaflight's failsafe on the bench (docs/facts/quad5.md §5.8: failsafe_delay 15 = 1.5 s, then DROP); a pass
  // reports state.extra.failsafe until a part is re-seated or the quad is stripped
  const failsafeTest = api => {
    if (!api.isOn('RX') || !api.isOn('FC')) return api.say('Fit the receiver and the flight controller first', 2600, 'buzz');
    if (api.isOn('PROPS')) return api.say('PROPS OFF! Never spin motors on the bench with props on', 2600, 'buzz');
    if (!api.st || !api.st.plugged || api.st.fault) return api.say('Plug in the battery for the failsafe test (props off)', 2600, 'buzz');
    api.log('$ props off, arm on the bench, switch the radio off');
    api.log('RXLOSS: failsafe stage 1 for failsafe_delay = 15 (1.5 s)');
    api.log('failsafe stage 2: DROP, motors stopped, disarmed');
    api.say('Radio off: after 1.5 s the motors stopped and the quad disarmed (DROP). Failsafe works', 3600, 'ding');
    api.pass('failsafe');
  };
  // the camera's 3-wire lead (video, 5 V, ground) to the FC's camera pads; the video then goes on to the VTX
  const camLead = ctx => {
    const out = [];
    [['#e8d36a', 2], ['#d8473a', 3.2], ['#2c2926', 4.4]].forEach(([col, y]) =>
      out.push(...SL.drone.g.wire([[24, y, 14.5], [21, y, 17.9], [16.5, y, 17.9]], col, .7, 5)));
    ctx.flows.push({ kind: 'video', pts: [[24, 2, 15], [21, 2, 18.4], [16.5, 2, 18.4]].map(p => SL.drone.W(...p)) });
    return out;
  };
  // the VTX's coax to its antenna behind the top plate, and the video path through the stack
  const vtxCoax = ctx => {
    ctx.flows.push({ kind: 'video', pts: [[16.5, 2, 18.4], [-14, 0, 26.5], [-18, 0, 26.8], [-58.5, 0, 28.4], [-58.5, 0, 35.5]].map(p => SL.drone.W(...p)) });
    return SL.drone.g.wire([[-18, 0, 26.4], [-58.5, 0, 28], [-58.5, 0, 35.5]], '#2c2926', 1.4, 7);
  };

  SL.drone.define({
    id: 'quad5', fig: '01', title: '5-inch freestyle quad', palette: 'tomato',
    mat: 300, height: 120, explode: 12, log: 'betaflight',
    xrCaption: 'See-through: the top plate and battery fade so the stack, the power path and the signals show.',
    bounds: [-75, 75, -50, 50, 0, 76],
    frame: {
      layout: 'quad-x', wheelbase: 225, numbering: 'betaflight',
      arm: { w: 14, t: 5, pad: 15.5 }, plate: { l: 112, w: 46, z: 0, r: 8 }, motorZ: 5,
    },
    design: {
      default: { batt: '6s1100', motor: '2306-1750', prop: '5x4.3x3' },
      batts: {
        '6s1100': { cells: 6, mah: 1100, size: [75, 35, 37], color: '#2b2a28', label: '6S 1100' },
        '6s1800': { cells: 6, mah: 1800, size: [84, 38, 44], color: '#2f5fa8', label: '6S 1800' },
        '4s1500': { cells: 4, mah: 1500, size: [72, 35, 34], color: '#d9a520', label: '4S 1500' },
      },
      motors: {
        '2306-1750': { stator: [23, 6], bell: [27.9, 15.5], kv: 1750, label: '2306 1750KV' },
        '2207-1950': { stator: [22, 7], bell: [27.1, 16.5], kv: 1950, label: '2207 1950KV' },
        '2306-2450': { stator: [23, 6], bell: [27.9, 15.5], kv: 2450, label: '2306 2450KV' },
      },
      props: {
        '5x4.3x3': { d: 5, pitch: 4.3, blades: 3, color: '#4fa3d1', label: '5x4.3x3' },
        '5.1x2.5x3': { d: 5.1, pitch: 2.5, blades: 3, color: '#71b693', label: '5.1x2.5x3' },
        '5x5x3': { d: 5, pitch: 5, blades: 3, color: '#d8869c', label: '5x5x3' },
      },
    },
    parts: [
      { id: 'FRAME', short: 'FRAME', name: 'Carbon frame: bottom plate and arms', z: 0,
        piece: { kind: 'frame' }, tag: { at: [-62, 62, 5], dx: -56, dy: 30 } },
      { id: 'MOTORS', short: 'MOTORS', name: '4 brushless motors (2306)', after: ['FRAME'], z: 1.6,
        piece: { kind: 'motors' }, tag: { at: [79.5, 79.5, 23.5], dx: 70, dy: 34 },
        xr: [{ at: [79.5, -79.5, 15], text: 'STATOR 12N14P' }] },
      { id: 'ESC', short: '4-IN-1 ESC', name: '45 A 4-in-1 ESC (AM32)', after: ['FRAME'], z: 1,
        piece: [
          { kind: 'standoffs', at: holes, z0: 5, z1: 9, r: 2.6, color: '#3d3b39' },
          { kind: 'board', at: [0, 0, 9], size: [40, 40], t: 1.6, color: 'pcb', holes: 30.5, fets: 12,
            chips: [{ at: [6, 0], size: [5, 5, .9], label: 'AT32' }, { at: [-6, 0], size: [5, 5, .9] }],
            pads: [{ at: [-17, 4], size: [5, 6] }, { at: [-17, -4], size: [5, 6] }] },
        ],
        tag: { at: [18, 18, 10.6], dx: -24, dy: 74 }, xr: [{ at: [17, -14, 11.5], text: 'MOSFETS x12' }] },
      { id: 'WIRES', short: 'MOTOR WIRES', name: 'Motor phase wires, soldered to the ESC pads', after: ['MOTORS', 'ESC'], z: 1.3,
        piece: { kind: 'wires', from: [0, 0, 10.6], padR: 18, edge: 5 },
        tag: { at: [48, -48, 6.5], dx: 76, dy: 44 } },
      { id: 'FC', short: 'FLIGHT CTRL', name: 'F405 flight controller (Betaflight)', after: ['ESC'], z: 3,
        polar: ['arrow forward', 'arrow backward'],
        piece: [
          { kind: 'standoffs', at: holes, z0: 11.7, z1: 16, r: 2.4, color: '#3d3b39' },
          { kind: 'board', at: [0, 0, 16], size: [37, 37], t: 1.6, color: 'pcbBlue', holes: 30.5, arrow: true, arrowAt: [-10, 0],
            chips: [{ at: [6, 5], size: [10, 10, 1.4], label: 'F405' }, { at: [-2, -8], size: [3, 3, .9] }, { at: [8, -9], size: [5, 5, 1] }],
            led: '#4aa3ff', ledAt: [-13, 13], usb: [0, 17] },
          { kind: 'custom', draw: harness },
        ],
        tag: { at: [16, 16, 17.6], dx: -96, dy: 8 },
        xr: [{ at: [-2, -8, 18.5], text: 'GYRO ICM-42688-P' }, { at: [6, 5, 19], text: 'MCU STM32F405' }] },
      { id: 'XT60', short: 'XT60 + CAP', name: 'XT60 pigtail and 1000 µF 35 V low-ESR capacitor', after: ['ESC'], z: 2,
        polar: ['stripe to minus', 'stripe to plus'],
        piece: { kind: 'xt60', at: [-72, 0, 9], dir: [-1, 0, 0], lead: [[-17, 0, 11], [-30, 0, 11], [-50, 0, 9.5], [-64, 0, 9]],
          cap: { at: [-25, 15, 10.6], dir: [-1, 0, 0], r: 5, l: 20, stripe: [0, 1, 0],
            leads: [[[-25, 13, 10.6], [-20.5, 6.5, 11]], [[-25, 17, 10.6], [-18.5, 7, 11.2]]] } },
        tag: { at: [-72, 0, 13], dx: -60, dy: -14 }, xr: [{ at: [-35, 15, 15.6], text: '1000 µF CAP' }] },
      { id: 'CAM', short: 'CAMERA', name: '19 mm analog FPV camera, 30° uptilt', after: ['FRAME'], z: 2,
        piece: [{ kind: 'camera', at: [43, 0, 18.5], size: 19, tilt: 30, depth: 20, plates: { gap: 1, l: 26, h: 27.5, t: 2.5, color: 'pal' } },
          { kind: 'custom', draw: camLead }],
        tag: { at: [53, 0, 22], dx: 84, dy: 6 } },
      { id: 'RX', short: 'RECEIVER', name: 'ExpressLRS 2.4 GHz receiver (CRSF)', after: ['FC'], z: 2.5,
        piece: [{ kind: 'module', at: [-39, -13, 5], size: [13, 10, 3], color: 'pcbBlack', label: 'ELRS', labelSize: .3, led: '#43c463', ledAt: [4, 3] },
          { kind: 'antenna', at: [-46, -11, 7], dir: [-.5, .1, .86], len: 34 },
          { kind: 'antenna', at: [-46, -15, 7], dir: [-.98, -.08, .16], len: 30 }],
        tag: { at: [-39, -13, 8], dx: 40, dy: -64 }, xr: [{ at: [-39, -13, 8], text: 'ELRS RX ON UART2' }] },
      { id: 'VTX', short: 'VTX', name: '5.8 GHz analog VTX and antenna', after: ['FC'], z: 4,
        piece: [
          { kind: 'standoffs', at: holes, z0: 19, z1: 24, r: 2.3, color: '#3d3b39' },
          { kind: 'board', at: [0, 0, 24], size: [36, 36], t: 1.6, color: 'pcbBlack', holes: 30.5,
            chips: [{ at: [2, 0], size: [20, 20, 3.4], color: 'alu' }], led: '#e2483d', ledAt: [-13, -13] },
          { kind: 'antenna', at: [-58.5, 0, 35.5], type: 'lollipop', dir: [-.62, 0, .78], len: 34 },
          { kind: 'custom', draw: vtxCoax },
        ],
        tag: { at: [-8, 8, 29], dx: -80, dy: -52 } },
      { id: 'TOP', short: 'TOP PLATE', name: 'Top plate and 27.5 mm standoffs', after: ['FC', 'CAM', 'RX', 'VTX'], z: 5.5, cover: true,
        piece: [{ kind: 'standoffs', at: [[46, 16], [46, -16], [-46, 16], [-46, -16]], z0: 5, z1: 32.5, r: 2.6, split: 9.2 },
          { kind: 'plate', l: 104, w: 40, r: 7, z: 32.5, t: 2, color: 'carbon' }],
        tag: { at: [48, -16, 34.5], dx: 80, dy: -34 } },
      { id: 'BATT', short: 'BATTERY', name: 'LiPo battery, strap and grip pad', after: ['TOP', 'XT60'], z: 7, cover: true,
        piece: { kind: 'battery', at: [0, 0, 34.5], strap: true, pad: true },
        tag: { at: [-10, 0, 73], dx: 0, dy: -44 } },
      { id: 'PROPS', short: 'PROPS', name: '5-inch tri-blade props, 2 CW + 2 CCW', after: ['MOTORS', 'TOP'], z: 3.6,
        polar: ['props in (correct)', 'swapped CW/CCW'],
        piece: { kind: 'props' }, tag: { at: [118, -79.5, 26], dx: 54, dy: -8 } },
    ],
    tests: {
      smoke: { needs: ['XT60', 'ESC'], at: [-30, 120] },
      motors: { needs: ['WIRES', 'FC'] },
      calibrate: { needs: ['FC'] },
      plug: { needs: ['BATT', 'XT60'] },
    },
    buttons: [
      { id: 'failsafe', label: 'Failsafe test (radio off)', onClick: failsafeTest },
    ],
    inside: [{ at: [-21.6, -15.2, 14.5], text: 'ESC HARNESS 8-PIN', part: 'FC' }],
    wiring: {
      nodes: {
        BATT: { at: [10, 20], title: 'BATTERY', sub: 'batt', color: 'tomato' },
        XT60: { at: [10, 150], title: 'XT60 + CAP', sub: '1000 µF 35 V', color: 'tomato' },
        ESC: { at: [200, 150], title: '4-IN-1 ESC', sub: '45 A x4, AM32', color: '#f08a2b' },
        MOTORS: { at: [200, 268], title: 'MOTORS x4', sub: 'motor', color: '#f08a2b' },
        FC: { at: [420, 150], title: 'FLIGHT CTRL', sub: 'F405, Betaflight', color: '#43a35a', led: '#4aa3ff' },
        RX: { at: [420, 20], title: 'RECEIVER', sub: 'ELRS 2.4 GHz', color: '#43a35a', led: '#43c463' },
        CAM: { at: [605, 60], title: 'CAMERA', sub: 'analog, 30° up', color: '#f2c230' },
        VTX: { at: [605, 250], title: 'VTX', sub: '5.8 GHz, SmartAudio', color: '#f2c230', led: '#e2483d' },
      },
      edges: [
        { from: 'BATT', to: 'XT60', kind: 'power', n: 2, label: 'V', labelAt: [42, 0] },
        { from: 'XT60', to: 'ESC', kind: 'power', n: 2, label: 'VBAT' },
        { from: 'ESC', to: 'MOTORS', kind: 'phase', n: 3, label: '3-phase x4', labelAt: [44, 0] },
        { from: 'FC', to: 'ESC', kind: 'signal', label: 'DShot600' },
        { from: 'RX', to: 'FC', kind: 'signal', label: 'UART2 CRSF', labelAt: [42, 0] },
        { from: 'CAM', to: 'FC', kind: 'video' },
        { from: 'FC', to: 'VTX', kind: 'video' },
      ],
    },
  });
})();
