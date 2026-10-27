// Shared by validate-project.mjs and negative-project.mjs.
import Ajv2020 from 'ajv/dist/2020.js';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const sha = (s) => createHash('sha256').update(s).digest('hex');
// RFC 8785 for the value space we use (no NaN or Infinity): sorted keys, JS number formatting, no whitespace.
export function canon(v) {
  if (v === null || typeof v !== 'object') {
    if (typeof v === 'number') { if (!Number.isFinite(v)) throw new Error('non-finite number'); return Object.is(v, -0) ? '0' : JSON.stringify(v); }
    return JSON.stringify(v);
  }
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  return '{' + Object.keys(v).filter((k) => v[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
}
// The on-disk form: same value, sorted keys, two-space indent, LF, trailing newline.
export function pretty(v, ind = '') {
  const next = ind + '  ';
  if (v === null || typeof v !== 'object') return canon(v);
  if (Array.isArray(v)) return v.length === 0 ? '[]' : '[\n' + v.map((x) => next + pretty(x, next)).join(',\n') + '\n' + ind + ']';
  const keys = Object.keys(v).filter((k) => v[k] !== undefined).sort();
  return keys.length === 0 ? '{}' : '{\n' + keys.map((k) => next + JSON.stringify(k) + ': ' + pretty(v[k], next)).join(',\n') + '\n' + ind + '}';
}
export const file = (v) => pretty(v) + '\n';
export const chainStep = (prev, envelope) => sha(prev + canon(envelope));


const read = (name) => JSON.parse(readFileSync(new URL('../' + name, import.meta.url), 'utf8'));
export const projectSchema = read('project.schema.json');
export const robotSchema = read('robotics.domain.schema.json');
export const droneSchema = read('drone.domain.schema.json');
const ajv = new Ajv2020({ strict: true, strictRequired: false, allErrors: true });
ajv.addSchema(robotSchema);
ajv.addSchema(droneSchema);
export const validate = ajv.compile(projectSchema);

// V7: rules the domain schemas cannot express (they need the rest of the document).
const rotRpy = ([r, p, y]) => {
  const [cr, sr, cp, sp, cy, sy] = [r, p, y].flatMap((a) => [Math.cos((a * Math.PI) / 180), Math.sin((a * Math.PI) / 180)]);
  // URDF: R = Rz(yaw) Ry(pitch) Rx(roll), fixed axes
  return [
    [cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr],
    [sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr],
    [-sp, cp * sr, cp * cr],
  ];
};
const mulM = (a, b) => a.map((row) => [0, 1, 2].map((j) => row[0] * b[0][j] + row[1] * b[1][j] + row[2] * b[2][j]));
const mulV = (m, v) => m.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);

export function domainRules(doc) {
  const errs = [];
  const err = (code, msg) => errs.push(`${code}: ${msg}`);
  const mech = doc.mechanical;
  const frames = new Map((mech?.frames || []).map((f) => [f.id, f]));
  const bodies = new Map((mech?.bodies || []).map((b) => [b.id, b]));
  const joints = new Map((mech?.joints || []).map((j) => [j.id, j]));
  const mounts = new Map((mech?.mounts || []).map((m) => [m.id, m]));
  const instances = new Map([...doc.boards, ...doc.components].map((e) => [e.id, e]));
  const worldRot = (frameId) => {
    let m = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    for (let f = frames.get(frameId), hops = 0; f && hops < 600; f = frames.get(f.parent), hops++) m = mulM(rotRpy(f.pose.rpy_deg), m);
    return m;
  };

  const rob = doc.domains?.robotics;
  if (rob) {
    const r = rob.data;
    if (!mech) err('RB-E-TREE', 'domains.robotics needs a mechanical section');
    for (const k of Object.keys(r.bodies)) if (!bodies.has(k)) err('RB-E-REF', `bodies.${k} is not a mechanical body`);
    for (const k of Object.keys(r.joints)) if (!joints.has(k)) err('RB-E-REF', `joints.${k} is not a mechanical joint`);
    // RB-E-TREE: every body has at most one parent joint, no cycles, exactly one root
    const parentOf = new Map();
    for (const j of joints.values()) {
      if (!bodies.has(j.parent) || !bodies.has(j.child)) err('RB-E-TREE', `${j.id}: parent or child is not a body`);
      if (parentOf.has(j.child)) err('RB-E-TREE', `${j.child} is the child of two joints`);
      parentOf.set(j.child, j.parent);
    }
    const roots = [...bodies.keys()].filter((b) => !parentOf.has(b));
    if (bodies.size && roots.length !== 1) err('RB-E-TREE', `expected one root body, found ${roots.length}: ${roots.join(', ')}`);
    for (const b of bodies.keys()) { let c = b, hops = 0; while (parentOf.has(c) && hops++ <= bodies.size) c = parentOf.get(c); if (hops > bodies.size) err('RB-E-TREE', `cycle through ${b}`); }
    for (const b of bodies.values()) {
      if (!(b.mass_g > 0)) err('RB-E-MASS', `${b.id} has no mass above 0`);
      const s = b.shape;
      const thin = s && ((s.kind === 'box' && Math.min(...s.size_mm) < 5) || (s.kind === 'cylinder' && Math.min(2 * s.radius_mm, s.height_mm) < 5) || (s.kind === 'sphere' && 2 * s.radius_mm < 5));
      if (thin) err('RB-E-THIN', `${b.id} has a dimension under 5 mm`);
      if (!r.bodies[b.id]) err('RB-E-REF', `${b.id} has no entry in domains.robotics.data.bodies`);
    }
    const surfaceIds = new Set();
    for (const s of r.surfaces) { if (surfaceIds.has(s.id)) err('RB-E-SURFACE', `duplicate surface ${s.id}`); surfaceIds.add(s.id); }
    const surf = (id, where) => { if (!surfaceIds.has(id)) err('RB-E-SURFACE', `${where} uses undefined surface ${id}`); };
    surf(r.arena.floor.surface, 'arena.floor');
    r.arena.statics.forEach((s) => surf(s.surface, `static ${s.id}`));
    for (const [what, list] of [['track', r.arena.tracks], ['static', r.arena.statics]]) { const seen = new Set(); for (const t of list) { if (seen.has(t.id)) err('RB-E-REF', `duplicate ${what} id ${t.id}`); seen.add(t.id); } }
    for (const j of joints.values()) {
      if (j.axis && Math.hypot(...j.axis) === 0) err('RB-E-AXIS', `${j.id} has a zero axis`);
      if (j.drive && !instances.has(j.drive.component)) err('RB-E-DRIVE', `${j.id}: drive component ${j.drive.component} does not exist`);
      if ((j.kind === 'revolute' || j.kind === 'prismatic') && j.limits && j.limits.min !== undefined && j.limits.max !== undefined && !(j.limits.min < j.limits.max)) err('RB-E-LIMITS', `${j.id}: min is not below max`);
      if (j.kind === 'wheel') {
        if (!r.wheels[j.id]) err('RB-E-WHEEL', `${j.id} is a wheel joint with no WheelSpec`);
        if (!r.joints[j.id]) err('RB-E-REF', `${j.id} has no entry in domains.robotics.data.joints`);
        const axis = j.axis || [0, 0, 1];
        const n = Math.hypot(...axis);
        const pb = bodies.get(j.parent);
        if (n > 0 && pb) {
          const w = mulV(mulM(worldRot(pb.frame), rotRpy(j.origin.rpy_deg)), axis.map((x) => x / n));
          if (Math.abs(w[2]) > Math.sin((1 * Math.PI) / 180)) err('RB-E-WHEEL', `${j.id}: axis is not horizontal in the rest pose (z component ${w[2].toFixed(3)})`);
        }
      }
    }
    for (const k of Object.keys(r.wheels)) if (joints.get(k)?.kind !== 'wheel') err('RB-E-WHEEL', `wheels.${k} is not a wheel joint`);
    const sensorIds = new Set();
    for (const s of r.sensors) {
      if (sensorIds.has(s.id)) err('RB-E-SENSOR', `duplicate sensor id ${s.id}`); sensorIds.add(s.id);
      if (!instances.has(s.component)) err('RB-E-SENSOR', `${s.id}: component ${s.component} does not exist`);
      const m = mounts.get(s.mount);
      if (!m) err('RB-E-SENSOR', `${s.id}: mount ${s.mount} does not exist`);
      else if (m.component !== s.component) err('RB-E-SENSOR', `${s.id}: mount ${s.mount} holds ${m.component}, not ${s.component}`);
    }
    if (r.ros) {
      for (const nd of r.ros.nodes) {
        if (nd.kind === 'diff_drive_controller') for (const jid of [nd.left_joint, nd.right_joint]) if (joints.get(jid)?.kind !== 'wheel') err('RB-E-ROS', `${nd.id}: ${jid} is not a wheel joint`);
        if (nd.kind === 'user' && !doc.sources.some((s) => s.id === nd.source)) err('RB-E-ROS', `${nd.id}: source ${nd.source} does not exist`);
      }
      for (const t of r.ros.sensor_topics) if (!sensorIds.has(t.sensor)) err('RB-E-ROS', `topic ${t.topic}: sensor ${t.sensor} is not in sensors`);
    }
  }

  const dro = doc.domains?.drone;
  if (dro) {
    const d = dro.data;
    const has = (id) => instances.has(id);
    if (d.battery && !has(d.battery)) err('DB-E-REF', `battery ${d.battery} does not exist`);
    if (d.controller && !doc.boards.some((b) => b.id === d.controller)) err('DB-E-REF', `controller ${d.controller} is not a board`);
    const channel = new Set();
    let spinSum = 0;
    for (const m of d.motors || []) {
      for (const k of ['motor', 'prop', 'esc']) if (!has(m[k])) err('DB-E-REF', `${m.id}: ${k} ${m[k]} does not exist`);
      const mt = mounts.get(m.mount);
      if (!mt) err('DB-E-REF', `${m.id}: mount ${m.mount} does not exist`);
      else {
        if (mt.component !== m.motor) err('DB-E-REF', `${m.id}: mount ${m.mount} holds ${mt.component}, not ${m.motor}`);
        const up = mulV(mulM(worldRot(mt.frame), rotRpy(mt.pose.rpy_deg)), [0, 0, 1]);
        if (!(up[2] > 0)) err('DB-E-MOUNT', `${m.id}: thrust axis is not within 90 degrees of body +z`);
      }
      const key = m.esc + '#' + m.esc_channel;
      if (channel.has(key)) err('DB-E-REF', `${m.id}: ESC channel ${key} used twice`);
      channel.add(key);
      spinSum += m.spin === 'ccw' ? 1 : -1;
      if (m.prop_spin !== m.spin) errs.push(`DB-C-11(warn): ${m.id} prop_spin differs from spin`);
    }
    if (d.motors && spinSum !== 0) errs.push(`DB-C-11(warn): spin directions do not cancel (sum ${spinSum})`);
    if (new Set((d.motors || []).map((m) => m.id)).size !== (d.motors || []).length) err('DB-E-REF', 'duplicate motor slot id');
    if (d.flight.model === 'multirotor-rigid@1' && !(d.flight.pid_hz <= d.flight.step_hz && d.flight.step_hz % d.flight.pid_hz === 0)) err('DB-C-12', `pid_hz ${d.flight.pid_hz} must divide step_hz ${d.flight.step_hz} and not exceed it`);
    for (const m of d.fcParams?.modes || []) if (!(m.range_us[0] < m.range_us[1])) err('DB-E-MODE', `${m.mode}: range is empty`);
    if (d.fcParams?.filters.gyro_lpf_hz > 0 && d.flight.model === 'multirotor-rigid@1' && d.fcParams.filters.gyro_lpf_hz >= d.flight.pid_hz / 2) err('DB-C-12', `gyro filter ${d.fcParams.filters.gyro_lpf_hz} Hz is not below the Nyquist rate of pid_hz`);
    const seen = new Set();
    for (const f of d.environment.sensorFailures) { const k = JSON.stringify(f); if (seen.has(k)) err('DB-E-ENV', 'duplicate sensor failure'); seen.add(k); }
  }
  return errs;
}

// V8: definitions copied into a domain schema must equal the project schema's.
export function driftErrors(projectSchema, ...domainSchemas) {
  const errs = [];
  for (const ds of domainSchemas) for (const [name, def] of Object.entries(ds.$defs)) {
    if (projectSchema.$defs[name] && canon(projectSchema.$defs[name]) !== canon(def)) errs.push(`V8-DRIFT: ${ds.$id} $defs.${name} differs from project.schema.json`);
  }
  return errs;
}

