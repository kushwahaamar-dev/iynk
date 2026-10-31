import { describe, expect, it } from 'vitest';
import { isOutOfRange } from './guards';
import example from '../../../docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/drone-quad.project.json';
import {
  assemble,
  cgOffsetFraction,
  isPositiveDefinite,
  rotationFromRpy,
  shapeInertia,
  type Mat3,
  type PlacedBody,
  type V3,
} from './mass';

const close = (a: number, b: number, rel = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(rel * Math.max(1, Math.abs(b)));

const boxA: PlacedBody = { id: 'a', mass_g: 50, shape: { kind: 'box', size_mm: [100, 40, 10] }, position_mm: [-30, 0, 0], rpy_deg: [0, 0, 0] };
const boxB: PlacedBody = { id: 'b', mass_g: 120, shape: { kind: 'box', size_mm: [60, 60, 20] }, position_mm: [40, 10, 5], rpy_deg: [0, 0, 0] };

describe('assemble', () => {
  it('DA-17: two boxes equal the closed form to 1e-9', () => {
    const p = assemble([boxA, boxB]);
    if (isOutOfRange(p)) throw new Error('out of range');
    const M = 170;
    const com = [(50 * -30 + 120 * 40) / M, (120 * 10) / M, (120 * 5) / M];
    p.com_mm.forEach((v, i) => close(v, com[i]));
    close(p.mass_g, M);

    const ia = [(50 / 12) * (40 ** 2 + 10 ** 2), (50 / 12) * (100 ** 2 + 10 ** 2), (50 / 12) * (100 ** 2 + 40 ** 2)];
    const ib = [(120 / 12) * (60 ** 2 + 20 ** 2), (120 / 12) * (60 ** 2 + 20 ** 2), (120 / 12) * (60 ** 2 + 60 ** 2)];
    const da = [-30 - com[0], 0 - com[1], 0 - com[2]];
    const db = [40 - com[0], 10 - com[1], 5 - com[2]];
    const expected: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (const [m, I, d] of [[50, ia, da], [120, ib, db]] as const) {
      const dd = d[0] ** 2 + d[1] ** 2 + d[2] ** 2;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) expected[i][j] += (i === j ? I[i] : 0) + m * ((i === j ? dd : 0) - d[i] * d[j]);
      }
    }
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) close(p.inertia_g_mm2[i][j], expected[i][j]);
  });

  it('rotates a box with R I R^T', () => {
    const body: PlacedBody = { id: 'r', mass_g: 12, shape: { kind: 'box', size_mm: [10, 4, 2] }, position_mm: [0, 0, 0], rpy_deg: [0, 30, 0] };
    const p = assemble([body]);
    if (isOutOfRange(p)) throw new Error('out of range');
    const [ix, iy, iz] = [20, 104, 116];
    const c = Math.cos(Math.PI / 6), s = Math.sin(Math.PI / 6);
    close(p.inertia_g_mm2[0][0], ix * c * c + iz * s * s);
    close(p.inertia_g_mm2[1][1], iy);
    close(p.inertia_g_mm2[2][2], ix * s * s + iz * c * c);
    close(p.inertia_g_mm2[0][2], (iz - ix) * s * c);
    close(p.inertia_g_mm2[2][0], (iz - ix) * s * c);
  });

  it('uses the given inertia and the body centre offset', () => {
    const body: PlacedBody = { id: 'g', mass_g: 10, shape: { kind: 'mesh' }, inertia_g_mm2: [1, 2, 3], com_mm: [5, 0, 0], position_mm: [0, 0, 0], rpy_deg: [0, 0, 90] };
    const p = assemble([body]);
    if (isOutOfRange(p)) throw new Error('out of range');
    close(p.com_mm[1], 5);
    close(p.com_mm[0], 0);
    close(p.inertia_g_mm2[0][0], 2);
    close(p.inertia_g_mm2[1][1], 1);
  });

  it('reports a mesh without inertia and an empty assembly', () => {
    const mesh = assemble([{ ...boxA, id: 'm', shape: { kind: 'mesh' } }]);
    expect(isOutOfRange(mesh) && mesh.field).toBe('bodies.m.shape');
    expect(isOutOfRange(assemble([]))).toBe(true);
    expect(isOutOfRange(assemble([{ ...boxA, mass_g: 0 }]))).toBe(true);
  });

  it('puts the example centre of mass forward of the origin by the camera and battery', () => {
    const frames = new Map(example.mechanical.frames.map((f) => [f.id, f.pose]));
    const bodies: PlacedBody[] = example.mechanical.bodies.map((b) => {
      const pose = frames.get(b.frame)!;
      return { id: b.id, mass_g: b.mass_g, shape: b.shape as PlacedBody['shape'], position_mm: pose.position_mm as unknown as V3, rpy_deg: pose.rpy_deg as unknown as V3 };
    });
    const p = assemble(bodies);
    if (isOutOfRange(p)) throw new Error('out of range');
    expect(p.com_mm[0]).toBeCloseTo(4.8817, 3);
    expect(p.com_mm[1]).toBeCloseTo(0, 9);
    expect(isPositiveDefinite(p.inertia_g_mm2)).toBe(true);
  });
});

describe('shapeInertia', () => {
  it('matches the cylinder and sphere formulas', () => {
    expect(shapeInertia({ kind: 'cylinder', radius_mm: 10, height_mm: 6 }, 12)).toEqual([336, 336, 600]);
    const sph = shapeInertia({ kind: 'sphere', radius_mm: 10 }, 5);
    expect(sph).toEqual([200, 200, 200]);
  });

  it('rejects non-positive sizes', () => {
    expect(isOutOfRange(shapeInertia({ kind: 'sphere', radius_mm: 0 }, 5))).toBe(true);
  });
});

describe('rotationFromRpy', () => {
  it('turns x into y for a 90 degree yaw', () => {
    const R = rotationFromRpy([0, 0, 90]);
    close(R[1][0], 1);
    close(R[0][0], 0);
  });
});

describe('isPositiveDefinite', () => {
  it('accepts the identity and rejects a negative minor', () => {
    const I: Mat3 = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    expect(isPositiveDefinite(I)).toBe(true);
    expect(isPositiveDefinite([[1, 2, 0], [2, 1, 0], [0, 0, 1]])).toBe(false);
  });
});

describe('cgOffsetFraction', () => {
  const axes = [[-79.5, -79.5], [79.5, -79.5], [-79.5, 79.5], [79.5, 79.5]] as const;
  const props = { mass_g: 1, com_mm: [0, 0, 0] as V3, inertia_g_mm2: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] as Mat3 };

  it('is 0 on a symmetric X', () => {
    const r = cgOffsetFraction(props, axes);
    if (isOutOfRange(r)) throw new Error('out of range');
    expect(r.fraction).toBe(0);
    close(r.meanArm_mm, 79.5 * Math.SQRT2);
  });

  it('measures a forward offset', () => {
    const r = cgOffsetFraction({ ...props, com_mm: [20, 0, 0] }, axes);
    if (isOutOfRange(r)) throw new Error('out of range');
    close(r.fraction, 20 / (79.5 * Math.SQRT2));
  });

  it('reports no motors', () => {
    expect(isOutOfRange(cgOffsetFraction(props, []))).toBe(true);
  });
});
