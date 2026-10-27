// Shared scene description, scripted commands and state hash for the RS-13 spike.
export const DT = 1 / 240;
export const STEPS = 10000;
export const HASH_EVERY = 1000;
const S = Math.SQRT1_2;
// Wheel bodies are turned -90 deg about Z so the cylinder's local Y points along world +X.
export const WHEEL_ROT = [0, 0, -S, S];
export const ID_ROT = [0, 0, 0, 1];

// kind: box (half extents), cyl (halfHeight, radius), ball (radius)
// order is fixed: it is the hash order.
export function buildScene() {
  const bodies = [];
  const add = (b) => { bodies.push(b); return bodies.length - 1; };
  const joints = [];

  // Robot A: four wheel robot. Forward is +Z, wheel axis is X.
  const a = { x: 0, y: 0.05, z: 0 };
  const chA = add({ name: 'A.chassis', kind: 'box', size: [0.12, 0.04, 0.18], pos: [a.x, a.y, a.z], rot: ID_ROT, density: 1000, friction: 0.5 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const w = add({ name: 'A.wheel', kind: 'cyl', size: [0.02, 0.05], pos: [a.x + sx * 0.142, a.y, a.z + sz * 0.12], rot: WHEEL_ROT, density: 1000, friction: 1.0 });
    joints.push({ robot: 'A', side: sx, chassis: chA, wheel: w, maxTorque: 2.0, damping: 10 });
  }

  // Robot B: line follower sized, two wheels and a caster ball under the rear.
  const b = { x: 1.5, y: 0.02, z: 0 };
  const chB = add({ name: 'B.chassis', kind: 'box', size: [0.04, 0.015, 0.05], pos: [b.x, b.y, b.z], rot: ID_ROT, density: 1000, friction: 0.5,
    caster: { pos: [0, -0.01, -0.04], radius: 0.01 } });
  for (const sx of [-1, 1]) {
    const w = add({ name: 'B.wheel', kind: 'cyl', size: [0.005, 0.02], pos: [b.x + sx * 0.046, b.y, b.z], rot: WHEEL_ROT, density: 1000, friction: 1.0 });
    joints.push({ robot: 'B', side: sx, chassis: chB, wheel: w, maxTorque: 0.05, damping: 0.5 });
  }

  // Obstacles: 6 in front of A, 6 in front of B.
  const obs = (name, kind, size, x, y, z, density) => add({ name, kind, size, pos: [x, y, z], rot: ID_ROT, density, friction: 0.5 });
  obs('A.box1', 'box', [0.08, 0.08, 0.08], -0.15, 0.08, 1.2, 500);
  obs('A.box2', 'box', [0.08, 0.08, 0.08], 0.15, 0.08, 1.4, 500);
  obs('A.box3', 'box', [0.08, 0.08, 0.08], 0.0, 0.08, 2.0, 500);
  obs('A.cyl1', 'cyl', [0.08, 0.08], -0.2, 0.08, 2.6, 500);
  obs('A.cyl2', 'cyl', [0.08, 0.08], 0.2, 0.08, 2.8, 500);
  obs('A.ball1', 'ball', [0.1], 0.0, 0.1, 3.4, 500);
  obs('B.box1', 'box', [0.03, 0.03, 0.03], 1.46, 0.03, 0.8, 300);
  obs('B.box2', 'box', [0.03, 0.03, 0.03], 1.54, 0.03, 1.0, 300);
  obs('B.box3', 'box', [0.03, 0.03, 0.03], 1.5, 0.03, 1.5, 300);
  obs('B.cyl1', 'cyl', [0.03, 0.03], 1.45, 0.03, 2.0, 300);
  obs('B.cyl2', 'cyl', [0.03, 0.03], 1.55, 0.03, 2.3, 300);
  obs('B.ball1', 'ball', [0.03], 1.5, 0.03, 2.8, 300);
  return { bodies, joints, ground: { half: [50, 0.5, 50], pos: [0, -0.5, 0], friction: 0.8 } };
}

// Scripted wheel speeds (rad/s, positive = forward) per 1000 step segment.
const CMD_A = [[10, 10], [10, 4], [-6, -6], [4, 10], [0, 0], [12, 12], [12, -12], [8, 8], [-8, 8], [10, 10]];
const CMD_B = [[30, 30], [30, 20], [20, 30], [-25, -25], [30, 10], [10, 30], [0, 0], [35, 35], [35, -35], [25, 25]];
export function command(step, robot) {
  const seg = Math.min(9, Math.floor(step / 1000));
  return (robot === 'A' ? CMD_A : CMD_B)[seg]; // [left, right]
}
// Measured on both engines: with the wheel axis along +X and the chassis frame as built, a positive
// joint target drives the robot toward +Z, so the target is the command itself.
export function motorTarget(step, j) {
  const c = command(step, j.robot);
  return j.side < 0 ? c[0] : c[1];
}

const f32 = new Float32Array(7);
const u32 = new Uint32Array(f32.buffer);
export class StateHasher {
  constructor() { this.reset(); }
  reset() { this.h1 = 0x811c9dc5; this.h2 = 0x01000193 ^ 0xdeadbeef; this.nan = 0; }
  // pos(3) + quat(4) as f32 bit patterns
  add(px, py, pz, qx, qy, qz, qw) {
    f32[0] = px; f32[1] = py; f32[2] = pz; f32[3] = qx; f32[4] = qy; f32[5] = qz; f32[6] = qw;
    for (let i = 0; i < 7; i++) {
      const w = u32[i];
      if ((w & 0x7f800000) === 0x7f800000) this.nan++;
      this.h1 = Math.imul(this.h1 ^ w, 0x01000193) >>> 0;
      this.h2 = Math.imul(this.h2 ^ ((w >>> 16) | (w << 16)), 0x85ebca6b) >>> 0;
      this.h2 = (this.h2 ^ (this.h2 >>> 13)) >>> 0;
    }
  }
  hex() { return this.h1.toString(16).padStart(8, '0') + this.h2.toString(16).padStart(8, '0'); }
}

export function stats(arr) {
  const s = Float64Array.from(arr).sort();
  const n = s.length;
  const mean = s.reduce((a, b) => a + b, 0) / n;
  const q = (p) => s[Math.min(n - 1, Math.floor(p * n))];
  return { n, mean, p50: q(0.5), p95: q(0.95), p99: q(0.99), max: s[n - 1] };
}

// Wraps a step function with per-step and per-100-step-batch timing.
export function summarise(stepTimes) {
  const batch = [];
  for (let i = 0; i + 100 <= stepTimes.length; i += 100) {
    let t = 0; for (let k = i; k < i + 100; k++) t += stepTimes[k];
    batch.push(t / 100);
  }
  return { perStep: stats(stepTimes), batch100: stats(batch) };
}
