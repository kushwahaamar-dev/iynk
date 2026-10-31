import { checkAll, checkField, isOutOfRange, type OutOfRange, type Range } from './guards';

export type V3 = readonly [number, number, number];
export type Mat3 = readonly [V3, V3, V3];

export type ShapeIn =
  | { kind: 'box'; size_mm: V3 }
  | { kind: 'cylinder'; radius_mm: number; height_mm: number }
  | { kind: 'sphere'; radius_mm: number }
  | { kind: 'mesh' };

export interface PlacedBody {
  id: string;
  mass_g: number;
  shape: ShapeIn;
  /** Centre of mass in the body's own frame; the origin when absent. */
  com_mm?: V3;
  /** Principal moments about the centre of mass, in the body's own frame. */
  inertia_g_mm2?: V3;
  position_mm: V3;
  rpy_deg: V3;
}

export interface MassProps {
  mass_g: number;
  com_mm: V3;
  inertia_g_mm2: Mat3;
}

const SIZE: Range = { min: 0, max: 1e6, minExclusive: true };

/** Principal moments about the shape's own centre. */
export function shapeInertia(s: ShapeIn, mass_g: number): V3 | OutOfRange {
  const bad = checkField('mass_g', mass_g, { min: 0, max: 1e6 });
  if (bad) return bad;
  switch (s.kind) {
    case 'box': {
      const [a, b, c] = s.size_mm;
      const dims = checkAll([
        ['size_mm.0', a, SIZE],
        ['size_mm.1', b, SIZE],
        ['size_mm.2', c, SIZE],
      ]);
      if (dims) return dims;
      const k = mass_g / 12;
      return [k * (b * b + c * c), k * (a * a + c * c), k * (a * a + b * b)];
    }
    case 'cylinder': {
      const dims = checkAll([
        ['radius_mm', s.radius_mm, SIZE],
        ['height_mm', s.height_mm, SIZE],
      ]);
      if (dims) return dims;
      const r2 = s.radius_mm * s.radius_mm;
      const side = (mass_g / 12) * (3 * r2 + s.height_mm * s.height_mm);
      return [side, side, (mass_g * r2) / 2];
    }
    case 'sphere': {
      const dims = checkField('radius_mm', s.radius_mm, SIZE);
      if (dims) return dims;
      const i = 0.4 * mass_g * s.radius_mm * s.radius_mm;
      return [i, i, i];
    }
    case 'mesh':
      return { error: 'out-of-range', field: 'shape', value: NaN, min: 0, max: 0 };
  }
}

/** Fixed-axis roll, pitch, yaw (URDF): R = Rz(yaw) Ry(pitch) Rx(roll). */
export function rotationFromRpy(rpy_deg: V3): Mat3 {
  const [r, p, y] = rpy_deg.map((d) => (d * Math.PI) / 180);
  const [cr, sr, cp, sp, cy, sy] = [Math.cos(r), Math.sin(r), Math.cos(p), Math.sin(p), Math.cos(y), Math.sin(y)];
  return [
    [cy * cp, cy * sp * sr - sy * cr, cy * sp * cr + sy * sr],
    [sy * cp, sy * sp * sr + cy * cr, sy * sp * cr - cy * sr],
    [-sp, cp * sr, cp * cr],
  ];
}

const mulVec = (m: Mat3, v: V3): V3 => [
  m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
  m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
  m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
];

/** R diag(I) R^T */
function rotateInertia(R: Mat3, diag: V3): Mat3 {
  const at = (i: number, j: number) => R[i][0] * diag[0] * R[j][0] + R[i][1] * diag[1] * R[j][1] + R[i][2] * diag[2] * R[j][2];
  return [
    [at(0, 0), at(0, 1), at(0, 2)],
    [at(1, 0), at(1, 1), at(1, 2)],
    [at(2, 0), at(2, 1), at(2, 2)],
  ];
}

export function assemble(bodies: readonly PlacedBody[]): MassProps | OutOfRange {
  const total = bodies.reduce((sum, b) => sum + (Number.isFinite(b.mass_g) ? Math.max(0, b.mass_g) : 0), 0);
  const empty = checkField('bodies', total, { min: 0, max: Infinity, minExclusive: true });
  if (empty) return empty;

  const placed: Array<{ m: number; c: V3; I: Mat3 }> = [];
  for (const b of bodies) {
    const massBad = checkField(`bodies.${b.id}.mass_g`, b.mass_g, { min: 0, max: 1e6 });
    if (massBad) return massBad;
    const principal = b.inertia_g_mm2 ?? shapeInertia(b.shape, b.mass_g);
    if (isOutOfRange(principal)) return { ...principal, field: `bodies.${b.id}.${principal.field}` };
    const R = rotationFromRpy(b.rpy_deg);
    const off = mulVec(R, b.com_mm ?? [0, 0, 0]);
    placed.push({
      m: b.mass_g,
      c: [b.position_mm[0] + off[0], b.position_mm[1] + off[1], b.position_mm[2] + off[2]],
      I: rotateInertia(R, principal),
    });
  }

  const com: V3 = [0, 1, 2].map((k) => placed.reduce((s, p) => s + p.m * p.c[k], 0) / total) as unknown as V3;
  const I = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (const p of placed) {
    const d = [p.c[0] - com[0], p.c[1] - com[1], p.c[2] - com[2]];
    const dd = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) I[i][j] += p.I[i][j] + p.m * ((i === j ? dd : 0) - d[i] * d[j]);
    }
  }
  return { mass_g: total, com_mm: com, inertia_g_mm2: I as unknown as Mat3 };
}

/** Leading principal minors all positive. */
export function isPositiveDefinite(m: Mat3): boolean {
  const d2 = m[0][0] * m[1][1] - m[0][1] * m[1][0];
  const d3 =
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  return m[0][0] > 0 && d2 > 0 && d3 > 0;
}

/** How far the centre of mass sits from the middle of the motors, as a fraction of the mean motor arm. */
export function cgOffsetFraction(
  p: MassProps,
  axes_mm: ReadonlyArray<readonly [number, number]>,
): { offset_mm: number; meanArm_mm: number; fraction: number } | OutOfRange {
  const n = axes_mm.length;
  if (n === 0) return { error: 'out-of-range', field: 'axes_mm', value: 0, min: 1, max: Infinity };
  const cx = axes_mm.reduce((s, a) => s + a[0], 0) / n;
  const cy = axes_mm.reduce((s, a) => s + a[1], 0) / n;
  const meanArm_mm = axes_mm.reduce((s, a) => s + Math.hypot(a[0] - cx, a[1] - cy), 0) / n;
  const arm = checkField('axes_mm', meanArm_mm, { min: 0, max: Infinity, minExclusive: true });
  if (arm) return arm;
  const offset_mm = Math.hypot(p.com_mm[0] - cx, p.com_mm[1] - cy);
  return { offset_mm, meanArm_mm, fraction: offset_mm / meanArm_mm };
}
