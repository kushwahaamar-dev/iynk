// Fig. 11, one drone of a Crazyflie 2.1+ swarm, flown from Python with cflib 0.1.34 over a Crazyradio 2.0 on
// crazyflie-firmware 2026.08: the 92 mm PCB is the frame and the flight controller, four 7 x 16 mm coreless motors
// switched by MOSFETs on the board (no ESC), a Flow deck v2 underneath and a Lighthouse deck on long pins on top.
// Facts: docs/facts/swarm.md (Bitcraze datasheets and product pages, firmware and cflib source at those tags).
// Calculator data: src/lib/drone/__fixtures__ (the original's catalogue and constants, unchanged; the labels say
// where the original's options differ from the real parts). Parts, build order, design keys, test buttons and wiring
// edges follow figures/drones/swarm.js; swarm.test.ts keeps the two in step.

import type { Course, DroneContent } from '@/content/schema';

// The firmware's motor table (ARM_LENGTH 46 mm, motors at +-32.5 mm), numbered clockwise from the front right.
// Here y points left, as in the figure.
const M = 32.5;

// The flight arena (x east, y north, metres): a textured foam floor for the Flow deck, two Lighthouse V2 base
// stations high in opposite corners, the laptop with the Crazyradio at the south-east side. The four drones start
// in a 0.6 m square on the pad; the leader's slot is the pad itself and the others sit east and south of it.
const PAD: [number, number] = [2, 1.6];
const ARENA: Pick<Course, 'field' | 'pad' | 'prims' | 'gates' | 'ceiling' | 'ground' | 'wind'> = {
  field: { w: 8, d: 7 },
  pad: PAD,
  ceiling: 5,
  ground: '#d9d6cf',
  wind: { speed: 0, from: 0, gust: 0 },
  prims: [
    { type: 'flat', x: 4, y: 3.5, w: 7, d: 6, col: '#c4b9a4' },
    { type: 'disc', x: 2.3, y: 1.3, r: 0.75, col: '#93d3b0', label: 'CF' },
    { type: 'disc', x: 2, y: 1.6, r: 0.12, col: '#f4b829' },
    { type: 'disc', x: 2.6, y: 1.6, r: 0.12, col: '#f4b829' },
    { type: 'disc', x: 2, y: 1, r: 0.12, col: '#f4b829' },
    { type: 'disc', x: 2.6, y: 1, r: 0.12, col: '#f4b829' },
    { type: 'pole', x: 0.3, y: 6.7, h: 2.4, kind: 'pole' },
    { type: 'box', x: 0.3, y: 6.7, z: 2.4, w: 0.12, d: 0.12, h: 0.1, col: '#2c2926', kind: 'obstacle' },
    { type: 'pole', x: 7.7, y: 0.3, h: 2.4, kind: 'pole' },
    { type: 'box', x: 7.7, y: 0.3, z: 2.4, w: 0.12, d: 0.12, h: 0.1, col: '#2c2926', kind: 'obstacle' },
    { type: 'box', x: 6.6, y: 0.5, w: 1.2, d: 0.6, h: 0.75, col: '#b08a5a', kind: 'obstacle' },
    { type: 'box', x: 6.4, y: 0.5, z: 0.75, w: 0.34, d: 0.24, h: 0.02, col: '#3a3734', solid: false },
  ],
  gates: [],
};

// A five-point star 1.5 m across from the middle, drawn point to point (0, 2, 4, 1, 3, back to 0), the points
// alternately at 1.5 m and 1.2 m. The followers fly the same star in their own slots.
const S = 0.8;

const swarm: DroneContent = {
  lab: 'drone',
  id: 'swarm',
  fig: 11,
  class: 'nano-swarm',
  title: 'title',
  sub: 'sub',
  hint: 'hint',
  noun: 'noun',
  overview: 'overview',
  practice: 'practice',

  frame: {
    layout: 'x',
    sizeMm: 92,
    motors: [
      [M, -M, 'M1', 'CCW'],
      [-M, -M, 'M2', 'CW'],
      [-M, M, 'M3', 'CCW'],
      [M, M, 'M4', 'CW'],
    ],
  },

  design: {
    model: {
      motors: 4,
      thrust: { kind: 'reference', refKv: 14000, grams: 13.4, amps: 1.2 },
      flight: { kind: 'multirotor', gPerW: 4.4, flyFactor: 0.92 },
      usable: 0.8,
      minTW: 1.65,
      over: { kind: 'bigMotor' },
      propPrice: 'pair',
    },
    fixed: [
      { id: 'FRAME', g: 9.5, price: 195, category: 'Electrical', name: 'design.fixed.FRAME' },
      { id: 'FLOW', g: 1.6, price: 50, category: 'Electrical', name: 'design.fixed.FLOW' },
      { id: 'DECKL', g: 1.8, price: 75, category: 'Electrical', name: 'design.fixed.DECKL' },
      { id: 'HDR', g: 0.6, price: 4, category: 'Mechanical', name: 'design.fixed.HDR' },
      { id: 'RADIO', g: 0, price: 35, category: 'Electrical', name: 'design.fixed.RADIO' },
      { id: 'STRAP', g: 0.2, price: 1, category: 'Mechanical', name: 'design.fixed.STRAP' },
    ],
    batts: {
      '1s250': { cells: 1, mah: 250, g: 7.1, price: 8, label: '1S 250 mAh LiPo (stock)' },
      '1s350': { cells: 1, mah: 350, g: 9.6, price: 10, label: '1S 350 mAh LiPo (longer flights, 1 mm thicker)' },
      '1s450': { cells: 1, mah: 450, g: 12.5, price: 11, label: '1S 450 mAh LiPo (heavy)' },
    },
    motors: {
      '7x16': { kv: 14000, g: 1.6, price: 4, label: '7 x 16 mm coreless 14000KV (stock)' },
      '7x16hp': { kv: 15500, g: 1.7, price: 6, label: '7 x 16 mm 15500KV (a hotter winding; Bitcraze sells a 7 x 20 instead)' },
      '8x20': { kv: 12500, g: 3.4, price: 6, big: true, label: '8.5 x 20 mm coreless 12500KV (too big for the 7 mm mounts)' },
    },
    props: {
      '45mm': { pf: 1, eff: 1, g: 0.3, price: 2, label: '45 mm 2-blade (stock on the 2.1)' },
      '47mm': { pf: 1.12, eff: 0.93, g: 0.35, price: 3, label: '47-17 2-blade (stock on the 2.1+)' },
    },
    default: { batt: '1s250', motor: '7x16', prop: '45mm' },
    // Rows of the original's matrix (src/lib/drone/__fixtures__/golden-b.json) at its printed precision.
    golden: [
      {
        pick: { batt: '1s250', motor: '7x16', prop: '45mm' },
        expect: { auw: 28.4, thrust: 13.4, tw: 1.887, hoverThr: 0.728, maxA: 4.8, hoverMin: 6.88, flyMin: 6.33, over: false, weak: false, cost: { electrical: 379, mechanical: 9, total: 388 } },
        verdict: 'design.verdict.ok',
      },
      {
        pick: { batt: '1s250', motor: '7x16', prop: '47mm' },
        expect: { auw: 28.6, thrust: 15, tw: 2.099, hoverThr: 0.69, maxA: 5.4, hoverMin: 6.35, flyMin: 5.84, over: false, weak: false, cost: { electrical: 379, mechanical: 11, total: 390 } },
        verdict: 'design.verdict.ok',
      },
      {
        pick: { batt: '1s350', motor: '7x16hp', prop: '47mm' },
        expect: { auw: 31.5, thrust: 18.4, tw: 2.336, hoverThr: 0.654, maxA: 6.6, hoverMin: 8.07, flyMin: 7.43, over: false, weak: false, cost: { electrical: 389, mechanical: 11, total: 400 } },
        verdict: 'design.verdict.ok',
      },
      {
        pick: { batt: '1s450', motor: '7x16', prop: '45mm' },
        expect: { auw: 33.8, thrust: 13.4, tw: 1.586, hoverThr: 0.794, maxA: 4.8, hoverMin: 10.4, flyMin: 9.57, over: false, weak: true, cost: { electrical: 382, mechanical: 9, total: 391 } },
        verdict: 'design.verdict.weak',
      },
      {
        pick: { batt: '1s250', motor: '8x20', prop: '45mm' },
        expect: { auw: 35.6, thrust: 10.7, tw: 1.2, hoverThr: 0.913, maxA: 3.8, hoverMin: 5.49, flyMin: 5.05, over: true, weak: true, cost: { electrical: 387, mechanical: 9, total: 396 } },
        verdict: 'design.verdict.over',
      },
    ],
  },

  figure: {
    page: '/figures/drones/swarm.html',
    parts: [
      { id: 'MOTORS', short: 'MOTORS + MOUNTS', role: 'other', name: 'parts.MOTORS.name', what: 'parts.MOTORS.what' },
      { id: 'FC', short: 'CF2.1 BOARD', role: 'mcu', name: 'parts.FC.name', what: 'parts.FC.what' },
      { id: 'WIRES', short: 'MOTOR PLUGS', role: 'connector', name: 'parts.WIRES.name', what: 'parts.WIRES.what' },
      { id: 'HDR', short: 'LONG PINS', role: 'header', name: 'parts.HDR.name', what: 'parts.HDR.what' },
      { id: 'FLOW', short: 'FLOW DECK', role: 'sensor', name: 'parts.FLOW.name', what: 'parts.FLOW.what' },
      { id: 'BATT', short: 'BATTERY', role: 'other', name: 'parts.BATT.name', what: 'parts.BATT.what' },
      { id: 'DECKL', short: 'LIGHTHOUSE DECK', role: 'sensor', name: 'parts.DECKL.name', what: 'parts.DECKL.what' },
      { id: 'RADIO', short: 'CRAZYRADIO', role: 'radio', name: 'parts.RADIO.name', what: 'parts.RADIO.what' },
      { id: 'PROPS', short: 'PROPS', role: 'mechanical', name: 'parts.PROPS.name', what: 'parts.PROPS.what' },
    ],
    sheets: ['wiring'],
  },

  parts: [
    { id: 'MOTORS', short: 'MOTORS + MOUNTS', name: 'parts.MOTORS.name', what: 'parts.MOTORS.what' },
    { id: 'FC', short: 'CF2.1 BOARD', name: 'parts.FC.name', what: 'parts.FC.what' },
    { id: 'WIRES', short: 'MOTOR PLUGS', name: 'parts.WIRES.name', what: 'parts.WIRES.what' },
    { id: 'HDR', short: 'LONG PINS', name: 'parts.HDR.name', what: 'parts.HDR.what' },
    { id: 'FLOW', short: 'FLOW DECK', name: 'parts.FLOW.name', what: 'parts.FLOW.what' },
    { id: 'BATT', short: 'BATTERY', name: 'parts.BATT.name', what: 'parts.BATT.what' },
    { id: 'DECKL', short: 'LIGHTHOUSE DECK', name: 'parts.DECKL.name', what: 'parts.DECKL.what' },
    { id: 'RADIO', short: 'CRAZYRADIO', name: 'parts.RADIO.name', what: 'parts.RADIO.what' },
    { id: 'PROPS', short: 'PROPS', name: 'parts.PROPS.name', what: 'parts.PROPS.what' },
  ],

  // The figure's build order. `done` = fitted the right way round.
  build: [
    { id: 'motors', part: 'MOTORS', done: { 'placed.MOTORS': 0 }, title: 'build.motors.title', body: 'build.motors.body' },
    { id: 'board', part: 'FC', done: { 'placed.FC': 0 }, title: 'build.board.title', body: 'build.board.body', refusal: 'build.board.refusal' },
    { id: 'plugs', part: 'WIRES', done: { 'placed.WIRES': 0 }, title: 'build.plugs.title', body: 'build.plugs.body', refusal: 'build.plugs.refusal' },
    { id: 'pins', part: 'HDR', done: { 'placed.HDR': 0 }, title: 'build.pins.title', body: 'build.pins.body', refusal: 'build.pins.refusal' },
    { id: 'flow', part: 'FLOW', done: { 'placed.FLOW': 0 }, title: 'build.flow.title', body: 'build.flow.body', refusal: 'build.flow.refusal' },
    { id: 'batt', part: 'BATT', done: { 'placed.BATT': 0 }, title: 'build.batt.title', body: 'build.batt.body', refusal: 'build.batt.refusal' },
    { id: 'lighthouse', part: 'DECKL', done: { 'placed.DECKL': 0 }, title: 'build.lighthouse.title', body: 'build.lighthouse.body', refusal: 'build.lighthouse.refusal' },
    { id: 'radio', part: 'RADIO', done: { 'placed.RADIO': 0 }, title: 'build.radio.title', body: 'build.radio.body', refusal: 'build.radio.refusal' },
    { id: 'props', part: 'PROPS', done: { 'placed.PROPS': 0 }, title: 'build.props.title', body: 'build.props.body', refusal: 'build.props.refusal' },
  ],

  // The figure's wiring sheet, edge for edge (docs/facts/swarm.md §4).
  wiring: [
    { from: 'BATT', to: 'FC', kind: 'power', label: '1S 3.7 V · Molex 51005 socket', note: 'wiring.BATT-FC' },
    { from: 'FC', to: 'WIRES', kind: 'power', label: 'MOSFET PWM · 328 kHz', note: 'wiring.FC-WIRES' },
    { from: 'WIRES', to: 'MOTORS', kind: 'power', label: 'PicoBlade 2-pin · brushed DC', note: 'wiring.WIRES-MOTORS' },
    { from: 'DECKL', to: 'FC', kind: 'signal', label: 'deck UART + I²C · bcLighthouse4', note: 'wiring.DECKL-FC' },
    { from: 'FLOW', to: 'FC', kind: 'signal', label: 'deck SPI + I²C · bcFlow2', note: 'wiring.FLOW-FC' },
    { from: 'RADIO', to: 'FC', kind: 'rf', label: '2.4 GHz · radio://0/80/2M/E7E7E7E701', note: 'wiring.RADIO-FC' },
  ],

  // The motor check and the sensor calibration are the engine's (a factory-built Crazyflie has no smoke stopper:
  // nothing in its power path is soldered by hand and the cell has its own protection board), then the figure's own
  // cflib bench checks (craft.report -> state.extra.<field>).
  tests: [
    { id: 'motors', kind: 'motor-direction', button: 'motors', done: { motorOk: true }, title: 'tests.motors.title', pass: 'tests.motors.pass', fail: 'tests.motors.fail' },
    { id: 'calibrate', kind: 'accel-calibration', button: 'calibrate', done: { accOk: true }, title: 'tests.calibrate.title', pass: 'tests.calibrate.pass', fail: 'tests.calibrate.fail' },
    { id: 'link', kind: 'radio-link', button: 'link', done: { 'extra.linkOk': true }, title: 'tests.link.title', pass: 'tests.link.pass', fail: 'tests.link.fail' },
    { id: 'position', kind: 'arming-checks', button: 'position', done: { 'extra.positionOk': true }, title: 'tests.position.title', pass: 'tests.position.pass', fail: 'tests.position.fail' },
    { id: 'failsafe', kind: 'failsafe', button: 'failsafe', done: { 'extra.failsafeOk': true }, title: 'tests.failsafe.title', pass: 'tests.failsafe.pass', fail: 'tests.failsafe.fail' },
  ],

  firmware: {
    firmware: 'crazyflie',
    version: 'crazyflie-firmware 2026.08 · cflib 0.1.34',
    cliName: 'cflib',
    snippets: [
      {
        id: 'setup',
        mode: 'build',
        title: 'firmware.setup.title',
        explain: 'firmware.setup.explain',
        code: [
          '# cflib 0.1.34 in Python, connected with SyncCrazyflie: cf = scf.cf',
          "cf.param.set_value('stabilizer.estimator', 2)     # extended Kalman: either deck forces it anyway",
          "cf.param.set_value('stabilizer.controller', 1)    # PID (0, auto select, picks PID too)",
          "cf.param.set_value('lighthouse.systemType', 2)    # Lighthouse V2 base stations",
          "cf.param.set_value('lighthouse.method', 1)        # sweep angles straight into the Kalman filter (default)",
          "cf.param.set_value('posCtlPid.rLimit', 20)        # most roll the position controller asks for, degrees",
          "cf.param.set_value('posCtlPid.pLimit', 20)        # and pitch",
          "cf.param.set_value('posCtlPid.xVelMax', 1)        # m/s it may ask for along x",
          "cf.param.set_value('posCtlPid.yVelMax', 1)        # along y",
          "cf.param.set_value('posCtlPid.zVelMax', 1)        # up and down",
          "cf.param.set_value('supervisor.tmblChckEn', 1)    # motors off if it tumbles",
          "cf.param.set_value('pm.lowVoltage', 3.2)          # V: LED1 goes solid red",
          "cf.param.set_value('pm.criticalLowVoltage', 3.0)  # V",
        ].join('\n'),
      },
      {
        id: 'decks',
        mode: 'build',
        title: 'firmware.decks.title',
        explain: 'firmware.decks.explain',
        code: [
          '# Read-only: 1 means the deck was found at power-on. get_value returns a string',
          "print(cf.param.get_value('deck.bcFlow2'))",
          "print(cf.param.get_value('deck.bcLighthouse4'))",
          "print(cf.param.get_value('stabilizer.estimator'))",
        ].join('\n'),
      },
      {
        id: 'motortest',
        mode: 'build',
        title: 'firmware.motortest.title',
        explain: 'firmware.motortest.explain',
        code: [
          '# PROPS OFF. The override reaches the motors only while the supervisor lets them run (upright and armed)',
          "cf.param.set_value('motorPowerSet.enable', 1)",
          "cf.param.set_value('motorPowerSet.m1', 10000)     # M1, front right: CCW seen from above",
          "cf.param.set_value('motorPowerSet.m1', 0)",
          "cf.param.set_value('motorPowerSet.m2', 10000)     # M2, rear right: CW",
          "cf.param.set_value('motorPowerSet.m2', 0)",
          "cf.param.set_value('motorPowerSet.m3', 10000)     # M3, rear left: CCW",
          "cf.param.set_value('motorPowerSet.m3', 0)",
          "cf.param.set_value('motorPowerSet.m4', 10000)     # M4, front left: CW",
          "cf.param.set_value('motorPowerSet.m4', 0)",
          "cf.param.set_value('motorPowerSet.enable', 0)     # back to the stabilizer",
        ].join('\n'),
      },
      {
        id: 'health',
        mode: 'build',
        title: 'firmware.health.title',
        explain: 'firmware.health.explain',
        code: [
          '# Spins each motor in turn and measures the vibration: a chipped prop or a worn motor stands out',
          "cf.param.set_value('health.startPropTest', 1)",
        ].join('\n'),
      },
      {
        id: 'lights',
        mode: 'build',
        title: 'firmware.lights.title',
        explain: 'firmware.lights.explain',
        code: [
          '# led.bitmask: bit 7 takes the LEDs over from the status blinks, bits 0-5 choose which are lit',
          "cf.param.set_value('led.bitmask', 138)    # 128 + 8 + 2: both green",
          "cf.param.set_value('led.bitmask', 148)    # 128 + 16 + 4: both red",
          "cf.param.set_value('led.bitmask', 129)    # 128 + 1: the left blue",
          "cf.param.set_value('led.bitmask', 0)      # bit 7 clear: the status blinks are back",
        ].join('\n'),
      },
      {
        id: 'hover',
        mode: 'hover',
        title: 'firmware.hover.title',
        explain: 'firmware.hover.explain',
        code: [
          'import time',
          'import cflib.crtp',
          'from cflib.crazyflie import Crazyflie',
          'from cflib.crazyflie.syncCrazyflie import SyncCrazyflie',
          'from cflib.positioning.motion_commander import MotionCommander',
          '',
          "URI = 'radio://0/80/2M/E7E7E7E701'",
          '',
          'cflib.crtp.init_drivers()',
          "with SyncCrazyflie(URI, cf=Crazyflie(rw_cache='./cache')) as scf:",
          "    if scf.cf.param.get_value('deck.bcFlow2') != '1':",
          "        raise SystemExit('no Flow deck: nothing would hold the position')",
          '    scf.cf.supervisor.send_arming_request(True)',
          '    time.sleep(1.0)',
          '    with MotionCommander(scf, default_height=1.0) as mc:   # takes off to 1 m here',
          '        mc.forward(0.6, velocity=0.4)                     # metres and m/s, measured by the Flow deck',
          '        mc.turn_left(90)                                  # degrees, 72 deg/s',
          '        mc.forward(0.6, velocity=0.4)',
          '        mc.back(0.6)                                      # 0.2 m/s when none is given',
          '    # leaving the with block lands it',
        ].join('\n'),
      },
      {
        id: 'althold',
        mode: 'althold',
        title: 'firmware.althold.title',
        explain: 'firmware.althold.explain',
        code: [
          '# Inside the same with SyncCrazyflie(...) as scf: block, armed. Setpoints at 10 Hz: miss them for',
          '# 0.5 s and it levels, for 2 s and the motors stop',
          'cf = scf.cf',
          'for _ in range(30):                                   # 3 s: up to 0.8 m, level',
          '    cf.commander.send_zdistance_setpoint(0, 0, 0, 0.8)  # roll, pitch (deg), yaw rate (deg/s), height (m)',
          '    time.sleep(0.1)',
          'for _ in range(20):                                   # 2 s leaning 5 degrees: it drifts, the height holds',
          '    cf.commander.send_zdistance_setpoint(0, 5, 0, 0.8)',
          '    time.sleep(0.1)',
          'for i in range(30):                                   # 3 s back down',
          '    cf.commander.send_zdistance_setpoint(0, 0, 0, 0.8 - i * 0.025)',
          '    time.sleep(0.1)',
          'cf.commander.send_stop_setpoint()',
          'cf.commander.send_notify_setpoint_stop()',
        ].join('\n'),
      },
      {
        id: 'stabilize',
        mode: 'stabilize',
        title: 'firmware.stabilize.title',
        explain: 'firmware.stabilize.explain',
        code: [
          '# Angles and raw thrust: nothing holds the height or the position. Low, over a net',
          'cf = scf.cf',
          'cf.commander.send_setpoint(0, 0, 0, 0)          # thrust 0 first: until then the firmware locks the thrust',
          'for i in range(20):                             # 2 s: thrust up from 20000 towards hover (60000 is full)',
          '    cf.commander.send_setpoint(0, 0, 0, 20000 + i * 800)',
          '    time.sleep(0.1)',
          'cf.commander.send_setpoint(0, 0, 0, 0)',
          'cf.commander.send_stop_setpoint()',
        ].join('\n'),
      },
      {
        id: 'show',
        mode: 'show',
        title: 'firmware.show.title',
        explain: 'firmware.show.explain',
        code: [
          'import time',
          'import cflib.crtp',
          'from cflib.crazyflie.swarm import CachedCfFactory, Swarm',
          '',
          '# four drones on one Crazyradio: one channel, one address each',
          'URIS = [',
          "    'radio://0/80/2M/E7E7E7E701',",
          "    'radio://0/80/2M/E7E7E7E702',",
          "    'radio://0/80/2M/E7E7E7E703',",
          "    'radio://0/80/2M/E7E7E7E704',",
          ']',
          '# each flies the same star from its own corner of a 0.6 m square, so none sits in another one\'s downwash',
          'SLOT = {URIS[0]: [0.0, 0.0], URIS[1]: [0.6, 0.0], URIS[2]: [0.0, -0.6], URIS[3]: [0.6, -0.6]}',
          '# star points in the Lighthouse frame (m) and the LEDs at each: 138 green, 148 red, 129 blue',
          'STAR = [(4.0, 5.1, 1.5, 138), (3.12, 2.39, 1.2, 148), (5.43, 4.06, 1.5, 138),',
          '        (2.57, 4.06, 1.5, 148), (4.88, 2.39, 1.2, 138), (4.0, 5.1, 1.5, 129)]',
          'LEG = 4.0                                         # s per leg: about 0.8 m/s along a 3 m side',
          '',
          '',
          'def arm(scf):',
          '    scf.cf.supervisor.send_arming_request(True)',
          '    time.sleep(1.0)',
          '',
          '',
          'def show(scf, dx, dy):',
          '    cf = scf.cf',
          '    hl = cf.high_level_commander',
          '    hl.takeoff(1.0, 2.0)                          # to 1 m in 2 s, from wherever it stands',
          '    time.sleep(2.5)',
          '    for x, y, z, leds in STAR:',
          '        hl.go_to(x + dx, y + dy, z, 0.0, LEG)     # yaw in radians; it flies on even if the link drops',
          "        cf.param.set_value('led.bitmask', leds)",
          '        time.sleep(LEG)',
          "    cf.param.set_value('led.bitmask', 0)",
          '    hl.go_to(2.0 + dx, 1.6 + dy, 1.0, 0.0, 5.0)   # back over its slot on the pad',
          '    time.sleep(5.0)',
          '    hl.land(0.0, 2.0)',
          '    time.sleep(2.5)',
          '    hl.stop()',
          '',
          '',
          "if __name__ == '__main__':",
          '    cflib.crtp.init_drivers()',
          "    with Swarm(URIS, factory=CachedCfFactory(rw_cache='./cache')) as swarm:",
          '        swarm.reset_estimators()                  # waits until every Kalman filter has settled',
          '        swarm.parallel_safe(arm)',
          '        swarm.parallel_safe(show, args_dict=SLOT)',
        ].join('\n'),
      },
    ],
    emulator: {
      kind: 'cflib-python',
      prompt: '>>> ',
      // The drone as this lab sets it up: every build snippet entered (a value set twice keeps the last one), the
      // decks found, everything else at its 2026.08 default.
      settings: {
        'stabilizer.estimator': 2,
        'stabilizer.controller': 1,
        'lighthouse.systemType': 2,
        'lighthouse.method': 1,
        'posCtlPid.rLimit': 20,
        'posCtlPid.pLimit': 20,
        'posCtlPid.xVelMax': 1,
        'posCtlPid.yVelMax': 1,
        'posCtlPid.zVelMax': 1,
        'supervisor.tmblChckEn': 1,
        'pm.lowVoltage': 3.2,
        'pm.criticalLowVoltage': 3,
        'deck.bcFlow2': 1,
        'deck.bcLighthouse4': 1,
        'motorPowerSet.enable': 0,
        'motorPowerSet.m1': 0,
        'motorPowerSet.m2': 0,
        'motorPowerSet.m3': 0,
        'motorPowerSet.m4': 0,
        'health.startPropTest': 1,
        'led.bitmask': 0,
      },
      // Value lists from the firmware's parameter definitions at 2026.08 (docs/facts/swarm.md §5); ranges are the
      // ones this lab accepts.
      limits: {
        'stabilizer.estimator': { values: ['0', '1', '2', '3'] },
        'stabilizer.controller': { values: ['0', '1', '2', '3', '4', '5'] },
        'lighthouse.systemType': { values: ['1', '2'] },
        'lighthouse.method': { values: ['0', '1'] },
        'posCtlPid.rLimit': { min: 5, max: 45 },
        'posCtlPid.pLimit': { min: 5, max: 45 },
        'posCtlPid.xVelMax': { min: 0.1, max: 3 },
        'posCtlPid.yVelMax': { min: 0.1, max: 3 },
        'posCtlPid.zVelMax': { min: 0.1, max: 2 },
        'supervisor.tmblChckEn': { values: ['0', '1'] },
        'pm.lowVoltage': { min: 3, max: 3.7 },
        'pm.criticalLowVoltage': { min: 2.8, max: 3.5 },
        'motorPowerSet.enable': { values: ['0', '1', '2', '3'] },
        'motorPowerSet.m1': { min: 0, max: 65535 },
        'motorPowerSet.m2': { min: 0, max: 65535 },
        'motorPowerSet.m3': { min: 0, max: 65535 },
        'motorPowerSet.m4': { min: 0, max: 65535 },
        'health.startPropTest': { values: ['0', '1'] },
        'led.bitmask': { min: 0, max: 255 },
      },
      // 1 when the deck was found at power-on; set_value raises AttributeError for them, as cflib 0.1.34 does
      readOnly: ['deck.bcFlow2', 'deck.bcLighthouse4'],
      commands: ['cf.param.get_value', 'cf.param.set_value', 'help'],
      // Parameters that change how the range flies the drone (src/lib/flight/types.ts FlightCraft names).
      effects: [
        { setting: 'posCtlPid.rLimit', equals: 20, set: { angleLimit: 20 } },
        { setting: 'posCtlPid.rLimit', equals: 30, set: { angleLimit: 30 } },
        { setting: 'posCtlPid.xVelMax', equals: 1, set: { loiterSpeed: 1 } },
        { setting: 'posCtlPid.xVelMax', equals: 0.5, set: { loiterSpeed: 0.5 } },
        { setting: 'posCtlPid.zVelMax', equals: 1, set: { climbRate: 1 } },
        { setting: 'posCtlPid.zVelMax', equals: 0.5, set: { climbRate: 0.5 } },
      ],
    },
    sources: [
      { title: 'crazyflie-firmware 2026.08: position controller parameters (posCtlPid)', url: 'https://github.com/bitcraze/crazyflie-firmware/blob/2026.08/src/modules/src/controller/position_controller_pid.c' },
      { title: 'crazyflie-firmware 2026.08: supervisor (arming, setpoint watchdog, tumble check)', url: 'https://github.com/bitcraze/crazyflie-firmware/blob/2026.08/src/modules/src/supervisor.c' },
      { title: 'crazyflie-firmware 2026.08: estimator and controller selection', url: 'https://github.com/bitcraze/crazyflie-firmware/blob/2026.08/src/modules/src/stabilizer.c' },
      { title: 'crazyflie-firmware 2026.08: battery thresholds (pm.lowVoltage)', url: 'https://github.com/bitcraze/crazyflie-firmware/blob/2026.08/src/hal/src/pm_stm32f4.c' },
      { title: 'crazyflie-firmware 2026.08: propeller test (health.startPropTest)', url: 'https://github.com/bitcraze/crazyflie-firmware/blob/2026.08/src/modules/src/health.c' },
      { title: 'crazyflie-firmware 2026.08: motor power override (motorPowerSet)', url: 'https://github.com/bitcraze/crazyflie-firmware/blob/2026.08/src/drivers/src/motors.c' },
      { title: 'crazyflie-firmware 2026.08: LED parameters (led.bitmask)', url: 'https://github.com/bitcraze/crazyflie-firmware/blob/2026.08/src/drivers/src/led.c' },
      { title: 'crazyflie-firmware 2026.08: legacy RPYT commander (thrust lock)', url: 'https://github.com/bitcraze/crazyflie-firmware/blob/2026.08/src/modules/src/crtp_commander_rpyt.c' },
      { title: 'cflib 0.1.34: Commander, HighLevelCommander, Swarm and MotionCommander', url: 'https://github.com/bitcraze/crazyflie-lib-python/tree/0.1.34/cflib' },
      { title: 'cflib 0.1.34 examples: step-by-step swarm and motion commander', url: 'https://github.com/bitcraze/crazyflie-lib-python/tree/0.1.34/examples/step-by-step' },
    ],
  },

  // Numbers the range flies; the parameters above set the same ones (swarm.test.ts checks).
  flight: {
    physics: 'swarm',
    params: {
      drag: 0.3,
      ceiling: 5,
      hitRadius: 0.07,
      angleLimit: 20,
      acroRate: 300,
      yawRate: 90,
      levelRate: 9,
      climbRate: 1,
      spool: 25,
      camTilt: 0,
      fov: 90,
      loiterSpeed: 1,
      swarmCount: 4,
      swarmSpacing: 0.6,
    },
    modes: [
      { id: 'hover', kind: 'pos-hold', title: 'flight.modes.hover.title', hint: 'flight.modes.hover.hint' },
      { id: 'althold', kind: 'alt-hold', title: 'flight.modes.althold.title', hint: 'flight.modes.althold.hint' },
      { id: 'stabilize', kind: 'angle', title: 'flight.modes.stabilize.title', hint: 'flight.modes.stabilize.hint' },
      { id: 'show', kind: 'mission', mission: 'show', title: 'flight.modes.show.title', hint: 'flight.modes.show.hint' },
    ],
    defaultMode: 'hover',
    fpv: { fovDeg: 90, camTiltDeg: 0, gimbal: false },
    osd: ['battery', 'cell-voltage', 'altitude', 'rangefinder', 'speed', 'flight-mode', 'timer', 'link-quality'],
    failsafes: [
      { id: 'setpoint-500', trigger: 'no-setpoint-500ms', action: 'level-hold-thrust', note: 'flight.failsafes.setpoint-500' },
      { id: 'setpoint-2000', trigger: 'no-setpoint-2000ms', action: 'motors-off', note: 'flight.failsafes.setpoint-2000' },
      { id: 'high-level', trigger: 'link-lost-high-level', action: 'finish-command-hold', note: 'flight.failsafes.high-level' },
      { id: 'tumble', trigger: 'tumbled', action: 'motors-off', note: 'flight.failsafes.tumble' },
      { id: 'low-battery', trigger: 'below-3.2V-5s', action: 'warn', note: 'flight.failsafes.low-battery' },
    ],
    controls: 'flight.controls',
  },

  courses: [
    {
      id: 'show',
      kind: 'mission',
      title: 'courses.show.title',
      brief: 'courses.show.brief',
      ...ARENA,
      goals: [
        { x: PAD[0], y: PAD[1], z: 1, r: 0.4, label: 'courses.show.goals.1' },
        { x: 4, y: 5.1, z: 1.5, r: 0.4, speed: S, hold: 1, label: 'courses.show.goals.2' },
        { x: 3.12, y: 2.39, z: 1.2, r: 0.4, speed: S, label: 'courses.show.goals.3' },
        { x: 5.43, y: 4.06, z: 1.5, r: 0.4, speed: S, label: 'courses.show.goals.4' },
        { x: 2.57, y: 4.06, z: 1.5, r: 0.4, speed: S, label: 'courses.show.goals.5' },
        { x: 4.88, y: 2.39, z: 1.2, r: 0.4, speed: S, label: 'courses.show.goals.6' },
        { x: 4, y: 5.1, z: 1.5, r: 0.4, speed: S, hold: 1, label: 'courses.show.goals.7' },
        { x: PAD[0], y: PAD[1], z: 1, r: 0.4, speed: S, label: 'courses.show.goals.8' },
        { x: PAD[0], y: PAD[1], z: 0, r: 0.4, land: true, label: 'courses.show.goals.9' },
      ],
      // Show mode flies it in about 43 s (silver); gold means flying the star faster than the script, by hand
      parS: 45,
      par: { gold: 32, silver: 45, bronze: 60 },
    },
  ],

  // `answer` is the index into `options` (0-based); option text keys count from 1.
  quizzes: [
    {
      id: 'plugs',
      afterStep: 'plugs',
      questions: [
        { id: 'esc', q: 'quizzes.plugs.esc.q', options: ['quizzes.plugs.esc.options.1', 'quizzes.plugs.esc.options.2', 'quizzes.plugs.esc.options.3'], answer: 2, why: 'quizzes.plugs.esc.why' },
        { id: 'spin', q: 'quizzes.plugs.spin.q', options: ['quizzes.plugs.spin.options.1', 'quizzes.plugs.spin.options.2', 'quizzes.plugs.spin.options.3'], answer: 0, why: 'quizzes.plugs.spin.why' },
      ],
    },
    {
      id: 'lighthouse',
      afterStep: 'lighthouse',
      questions: [
        { id: 'how', q: 'quizzes.lighthouse.how.q', options: ['quizzes.lighthouse.how.options.1', 'quizzes.lighthouse.how.options.2', 'quizzes.lighthouse.how.options.3'], answer: 1, why: 'quizzes.lighthouse.how.why' },
        { id: 'flow', q: 'quizzes.lighthouse.flow.q', options: ['quizzes.lighthouse.flow.options.1', 'quizzes.lighthouse.flow.options.2', 'quizzes.lighthouse.flow.options.3'], answer: 0, why: 'quizzes.lighthouse.flow.why' },
      ],
    },
    {
      id: 'fly',
      afterStep: null,
      questions: [
        { id: 'linkloss', q: 'quizzes.fly.linkloss.q', options: ['quizzes.fly.linkloss.options.1', 'quizzes.fly.linkloss.options.2', 'quizzes.fly.linkloss.options.3'], answer: 1, why: 'quizzes.fly.linkloss.why' },
        { id: 'slots', q: 'quizzes.fly.slots.q', options: ['quizzes.fly.slots.options.1', 'quizzes.fly.slots.options.2', 'quizzes.fly.slots.options.3'], answer: 2, why: 'quizzes.fly.slots.why' },
        { id: 'heavy', q: 'quizzes.fly.heavy.q', options: ['quizzes.fly.heavy.options.1', 'quizzes.fly.heavy.options.2', 'quizzes.fly.heavy.options.3'], answer: 0, why: 'quizzes.fly.heavy.why' },
      ],
    },
  ],

  sources: [
    { title: 'Bitcraze: Crazyflie 2.1+ (kit, 29 g, 47-17 props)', url: 'https://www.bitcraze.io/products/crazyflie-2-1-plus/' },
    { title: 'Crazyflie 2.1+ datasheet rev 1 (motor positions, mass, LEDs)', url: 'https://www.bitcraze.io/documentation/hardware/crazyflie_2_1_plus/crazyflie_2_1_plus-datasheet.pdf' },
    { title: 'Flow deck v2 datasheet (PMW3901 and VL53L1x, 1.6 g)', url: 'https://www.bitcraze.io/documentation/hardware/flow_deck_2/flow_deck_2-datasheet.pdf' },
    { title: 'Lighthouse positioning deck datasheet (4 × TS4231, ICE40UP5K, 2.7 g)', url: 'https://www.bitcraze.io/documentation/hardware/lighthouse_deck/lighthouse_deck-datasheet.pdf' },
    { title: 'Crazyradio 2.0 datasheet (nRF52840)', url: 'https://www.bitcraze.io/documentation/hardware/crazyradio_2_0/crazyradio_2_0-datasheet.pdf' },
    { title: 'Bitcraze 7 x 20 mm thrust upgrade motor datasheet', url: 'https://www.bitcraze.io/documentation/hardware/motor_4x_7x20mm/motor_4x_7x20mm-datasheet.pdf' },
    { title: 'Bitcraze: Propellers 47-17 (CW and CCW)', url: 'https://www.bitcraze.io/products/propellers-47-17/' },
    { title: 'Bitcraze: getting started with the Crazyflie 2.X (assembly, LEDs, self-test)', url: 'https://www.bitcraze.io/documentation/tutorials/getting-started-with-crazyflie-2-x/' },
    { title: 'Bitcraze: getting started with the Flow deck (0.2-3 m, floor texture)', url: 'https://www.bitcraze.io/documentation/tutorials/getting-started-with-flow-deck/' },
    { title: 'Bitcraze: Lighthouse positioning system (accuracy, base stations)', url: 'https://www.bitcraze.io/documentation/system/positioning/ligthouse-positioning-system/' },
  ],
};

export default swarm;
