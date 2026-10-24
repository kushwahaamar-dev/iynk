export type Vec3 = [number, number, number];

export const G = 9.81;
export const DEG = Math.PI / 180;

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const hypot3 = (x: number, y: number, z: number) => Math.sqrt(x * x + y * y + z * z);

/** Wraps an angle in degrees to (-180, 180]. */
export function wrapDeg(a: number): number {
  let r = ((a + 180) % 360 + 360) % 360 - 180;
  if (r === -180) r = 180;
  return r;
}

/**
 * Body axes in world coordinates for yaw (from +x, CCW), pitch (nose down
 * positive) and roll (left bank positive), all in degrees. `up` is the thrust
 * direction, `fwd` the nose, `left` the left side.
 */
export function bodyAxes(yawDeg: number, pitchDeg: number, rollDeg: number) {
  const cy = Math.cos(yawDeg * DEG), sy = Math.sin(yawDeg * DEG);
  const cp = Math.cos(pitchDeg * DEG), sp = Math.sin(pitchDeg * DEG);
  const cr = Math.cos(rollDeg * DEG), sr = Math.sin(rollDeg * DEG);
  const rz = (v: Vec3): Vec3 => [cy * v[0] - sy * v[1], sy * v[0] + cy * v[1], v[2]];
  const up = rz([cr * sp, sr, cr * cp]);
  const fwd = rz([cp, 0, -sp]);
  const left = rz([-sr * sp, cr, -sr * cp]);
  return { up, fwd, left };
}

/** Stick expo in the Betaflight sense: 0 = linear. */
export const expo = (v: number, e: number) => v * (1 - e) + v * v * v * e;

/** Deterministic smooth noise, used for gusts. */
export const wave = (t: number, f: number, ph: number) => Math.sin(t * f + ph);
