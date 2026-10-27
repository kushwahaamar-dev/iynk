// Domain data checks. Each mutation of a valid example must be rejected by the schemas (V2) or by the domain rules (V7);
// each addition that should be valid must be accepted. Prints PASS or FAIL per case.
import fs from 'node:fs';
import { validate, domainRules } from './project-lib.mjs';

const load = (n) => JSON.parse(fs.readFileSync(new URL(`../examples/${n}.project.json`, import.meta.url), 'utf8'));
const R = 'robot-line-follower', D = 'drone-quad';
const rd = (d) => d.domains.robotics.data;
const dd = (d) => d.domains.drone.data;

const bad = [
  ['robot: friction above 3', R, (d) => { rd(d).bodies.bdy_chassis.friction = 3.5; }],
  ['robot: surface reflectance above 1', R, (d) => { rd(d).surfaces[0].reflectance = 1.2; }],
  ['robot: rolling resistance above 0.2', R, (d) => { rd(d).wheels.jnt_wheel_l.crr = 0.5; }],
  ['robot: sleeping bodies (fixed off in v1)', R, (d) => { rd(d).physics.sleeping = true; }],
  ['robot: length scale 5', R, (d) => { rd(d).physics.length_scale = 5; }],
  ['robot: collider thinner than 5 mm', R, (d) => { rd(d).bodies.bdy_chassis.collider = { kind: 'box', size_mm: [100, 100, 2] }; }],
  ['robot: convex collider with 3 points', R, (d) => { rd(d).bodies.bdy_chassis.collider = { kind: 'convex', points_mm: [[0, 0, 0], [10, 0, 0], [0, 10, 0]] }; }],
  ['robot: body key that is not a body id', R, (d) => { rd(d).bodies.chassis = rd(d).bodies.bdy_chassis; }],
  ['robot: missing wheels record', R, (d) => { delete rd(d).wheels; }],
  ['robot: unknown field in a body', R, (d) => { rd(d).bodies.bdy_chassis.colour = 'red'; }],
  ['robot: track with one point', R, (d) => { rd(d).arena.tracks[0].points_mm = [[0, 0]]; }],
  ['robot: 65 tracks', R, (d) => { rd(d).arena.tracks = Array.from({ length: 65 }, (_, i) => ({ ...rd(d).arena.tracks[0], id: 't' + i })); }],
  ['robot: sensor query that does not exist', R, (d) => { rd(d).sensors[0].query = 'lidar'; }],
  ['robot: sensor with a text parameter', R, (d) => { rd(d).sensors[0].params = { h: '3' }; }],
  ['robot: gravity with two numbers', R, (d) => { rd(d).physics.gravity_mps2 = [0, -9.81]; }],
  ['robot: wheel joint without a WheelSpec', R, (d) => { delete rd(d).wheels.jnt_wheel_r; }],
  ['robot: wheel axis pointing up', R, (d) => { d.mechanical.joints.find((j) => j.id === 'jnt_wheel_l').origin.rpy_deg = [0, 0, 0]; }],
  ['robot: two roots (caster joint removed)', R, (d) => { d.mechanical.joints = d.mechanical.joints.filter((j) => j.id !== 'jnt_caster'); }],
  ['robot: body without mass', R, (d) => { delete d.mechanical.bodies.find((b) => b.id === 'bdy_caster').mass_g; }],
  ['robot: undefined surface on the floor', R, (d) => { rd(d).arena.floor.surface = 'carpet'; }],
  ['robot: sensor mount holds another part', R, (d) => { rd(d).sensors[0].mount = 'mnt_imu'; }],
  ['robot: wheels entry for a fixed joint', R, (d) => { rd(d).wheels.jnt_caster = rd(d).wheels.jnt_wheel_l; }],
  ['robot: drive component that does not exist', R, (d) => { d.mechanical.joints.find((j) => j.id === 'jnt_wheel_l').drive.component = 'cmp_nope'; }],
  ['robot: ros node for a non-wheel joint', R, (d) => { rd(d).ros = { namespace: '/r', nodes: [{ id: 'dd', kind: 'diff_drive_controller', left_joint: 'jnt_caster', right_joint: 'jnt_wheel_r' }], sensor_topics: [] }; }],
  ['robot: ros topic for an unknown sensor', R, (d) => { rd(d).ros = { namespace: '/r', nodes: [], sensor_topics: [{ sensor: 'sonar', topic: 'range', message: 'sensor_msgs/Range' }] }; }],
  ['robot: ros address in the document', R, (d) => { rd(d).ros = { namespace: '/r', nodes: [], sensor_topics: [], bridge: 'ws://localhost:9090' }; }],
  ['drone: two motors', D, (d) => { dd(d).motors = dd(d).motors.slice(0, 2); }],
  ['drone: 13 motors', D, (d) => { dd(d).motors = Array.from({ length: 13 }, (_, i) => ({ ...dd(d).motors[0], id: 'x' + i })); }],
  ['drone: multirotor without motors', D, (d) => { delete dd(d).motors; }],
  ['drone: multirotor without flight controller parameters', D, (d) => { delete dd(d).fcParams; }],
  ['drone: multirotor with the legacy thrust source', D, (d) => { dd(d).thrustSource = 'legacy-calc'; }],
  ['drone: legacy block on a multirotor', D, (d) => { dd(d).legacy = { contentId: 'quad5', calcModelId: 'legacy-calc@1', flightModelId: 'flight-game@1' }; }],
  ['drone: step rate 750 Hz', D, (d) => { dd(d).flight.step_hz = 750; }],
  ['drone: rigid model without pid_hz', D, (d) => { delete dd(d).flight.pid_hz; }],
  ['drone: pid rate above the step rate', D, (d) => { dd(d).flight.pid_hz = 2000; }],
  ['drone: props on during bench checks', D, (d) => { dd(d).bench.propsOff = false; }],
  ['drone: spin given as a word', D, (d) => { dd(d).motors[0].spin = 'clockwise'; }],
  ['drone: gain below zero', D, (d) => { dd(d).fcParams.pid.p_roll = -1; }],
  ['drone: expo above 100', D, (d) => { dd(d).fcParams.rates.roll.expo = 120; }],
  ['drone: notch filter field (not modelled yet)', D, (d) => { dd(d).fcParams.filters.notch_hz = 300; }],
  ['drone: failsafe action that does not exist', D, (d) => { dd(d).fcParams.failsafe.rx_loss_action = 'rtl'; }],
  ['drone: failsafe delay in seconds as a float', D, (d) => { dd(d).fcParams.failsafe.delay_ms = 1.5; }],
  ['drone: sensor failure time as a float', D, (d) => { dd(d).environment.sensorFailures = [{ at_ns: 1.5e9 + 0.5, sensor: 'gps', mode: 'dropout' }]; }],
  ['drone: sensor failure time in seconds under the old name', D, (d) => { dd(d).environment.sensorFailures = [{ at_s: 3, sensor: 'gps', mode: 'dropout' }]; }],
  ['drone: 33 sensor failures', D, (d) => { dd(d).environment.sensorFailures = Array.from({ length: 33 }, (_, i) => ({ at_ns: i, sensor: 'gyro', mode: 'bias' })); }],
  ['drone: wind vector with two numbers', D, (d) => { dd(d).environment.wind.mean_mps = [1, 0]; }],
  ['drone: motor mount that does not exist', D, (d) => { dd(d).motors[0].mount = 'mnt_nope'; }],
  ['drone: mount holds another part', D, (d) => { dd(d).motors[0].mount = 'mnt_m2'; }],
  ['drone: two motors on one ESC channel', D, (d) => { dd(d).motors[1].esc_channel = 0; }],
  ['drone: battery that does not exist', D, (d) => { dd(d).battery = 'cmp_nope'; }],
  ['drone: controller that is not a board', D, (d) => { dd(d).controller = 'cmp_esc'; }],
  ['drone: inverted motor mount', D, (d) => { d.mechanical.mounts.find((m) => m.id === 'mnt_m1').pose.rpy_deg = [180, 0, 0]; }],
  ['drone: gyro filter above Nyquist', D, (d) => { dd(d).fcParams.filters.gyro_lpf_hz = 600; }],
  ['drone: 65 course solids', D, (d) => { dd(d).course = { field_m: 100, pad_m: [0, 0], ground: 'grass', solids: Array.from({ length: 65 }, () => ({ type: 'tree', x_m: 1, y_m: 1 })), gates: [], checkpoints: [] }; }],
  ['drone: field of 3 km', D, (d) => { dd(d).course = { field_m: 3000, pad_m: [0, 0], ground: 'grass', solids: [], gates: [], checkpoints: [] }; }],
];

const good = [
  ['robot: ROS graph with a diff-drive node and an IMU topic', R, (d) => { rd(d).ros = { namespace: '/line_follower', nodes: [{ id: 'rsp', kind: 'robot_state_publisher' }, { id: 'dd', kind: 'diff_drive_controller', left_joint: 'jnt_wheel_l', right_joint: 'jnt_wheel_r' }], sensor_topics: [{ sensor: 'imu', topic: 'imu', message: 'sensor_msgs/Imu' }] }; }],
  ['robot: convex collider on the chassis', R, (d) => { rd(d).bodies.bdy_chassis.collider = { kind: 'convex', points_mm: [[-80, -55, -10], [80, -55, -10], [80, 55, -10], [-80, 55, -10], [-80, -55, 10], [80, 55, 10]] }; }],
  ['robot: ramp as a tilted static box', R, (d) => { rd(d).arena.statics.push({ id: 'ramp', pose: { position_mm: [300, 200, 20], rpy_deg: [0, 10, 0] }, size_mm: [400, 300, 20], surface: 'floor' }); }],
  ['drone: user course with a gate, a checkpoint and solids', D, (d) => { dd(d).course = { kind: 'gates', field_m: 120, pad_m: [0, 0], ground: 'grass', ceiling_m: 120, solids: [{ type: 'box', x_m: 10, y_m: 5, w_m: 4, d_m: 4, h_m: 3 }, { type: 'tree', x_m: -8, y_m: 12, h_m: 9 }, { type: 'pole', x_m: 20, y_m: 0, h_m: 6 }], gates: [{ x_m: 15, y_m: 0, heading_deg: 90, w_m: 2, h_m: 2 }], checkpoints: [{ label: 'Hover', x_m: 0, y_m: 20, z_m: 3, r_m: 1.5 }] }; }],
  ['drone: wind with a discrete gust and a GPS dropout', D, (d) => { dd(d).environment.wind = { mean_mps: [3, 0, 0], gust: { kind: 'ou', sigma_mps: 1, tau_s: 2 }, discrete: [{ at_ns: 5000000000, v_g_mps: [4, 0, 0], duration_ns: 1000000000 }] }; dd(d).environment.sensorFailures = [{ at_ns: 8000000000, sensor: 'gps', mode: 'dropout', duration_ns: 2000000000 }]; }],
  ['drone: migrated craft on the game model', D, (d) => { dd(d).kind = 'legacy-craft'; dd(d).thrustSource = 'legacy-calc'; dd(d).legacy = { contentId: 'quad5', calcModelId: 'legacy-calc@1', flightModelId: 'flight-game@1' }; dd(d).flight = { model: 'flight-game@1' }; delete dd(d).motors; delete dd(d).battery; delete dd(d).controller; delete dd(d).fcParams; }],
  ['drone: props swapped is a legal document (it is a fault)', D, (d) => { dd(d).motors[2].prop_spin = 'ccw'; }],
];

let ok = 0;
const run = (list, expectValid) => {
  for (const [name, ex, mutate] of list) {
    const d = load(ex);
    mutate(d);
    const v2 = validate(d);
    const v7 = v2 ? domainRules(d).filter((e) => !e.includes('(warn)')) : [];
    const accepted = v2 && v7.length === 0;
    const why = accepted ? '' : '  <- ' + (!v2 ? 'V2 ' + validate.errors.filter((e) => !['oneOf', 'anyOf', 'if', 'not', 'allOf', 'then', 'else'].includes(e.keyword)).slice(0, 1).map((e) => `${e.instancePath || '/'} ${e.message}`).join('') : 'V7 ' + v7[0]);
    const pass = accepted === expectValid;
    if (pass) ok++;
    console.log((pass ? 'PASS ' : 'FAIL ') + (expectValid ? '(accepted)  ' : '(rejected)  ') + name + (expectValid && !accepted ? why : expectValid ? '' : why));
  }
};
run(good, true);
run(bad, false);
console.log(`${ok} of ${good.length + bad.length} cases behave as expected`);
process.exit(ok === good.length + bad.length ? 0 : 1);
