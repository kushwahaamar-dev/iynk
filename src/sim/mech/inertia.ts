/** Shapes in the document's units (mm), minus the mesh: a mesh has no extents here. */
export type InertiaShape =
  | { kind: "box"; size_mm: readonly [number, number, number] }
  | { kind: "cylinder"; radius_mm: number; height_mm: number }
  | { kind: "sphere"; radius_mm: number };

const MM2_TO_M2 = 1e-6;
const SLACK = 1e-9;

/** Principal moments about the centre of mass in kg m2, in the shape's own frame (a cylinder's axis is z). */
export function inertiaOf(shape: InertiaShape, massKg: number): [number, number, number] {
  switch (shape.kind) {
    case "box": {
      const [a, b, c] = shape.size_mm.map((s) => s * s * MM2_TO_M2);
      const k = massKg / 12;
      return [k * (b + c), k * (a + c), k * (a + b)];
    }
    case "cylinder": {
      const r2 = shape.radius_mm * shape.radius_mm * MM2_TO_M2;
      const h2 = shape.height_mm * shape.height_mm * MM2_TO_M2;
      const across = (massKg * (3 * r2 + h2)) / 12;
      return [across, across, (massKg * r2) / 2];
    }
    case "sphere": {
      const i = (2 * massKg * shape.radius_mm * shape.radius_mm * MM2_TO_M2) / 5;
      return [i, i, i];
    }
  }
}

/** Positive moments of which none exceeds the sum of the other two. */
export function triangleOk(i: readonly [number, number, number]): boolean {
  const [x, y, z] = i;
  if (!(x > 0 && y > 0 && z > 0)) return false;
  const slack = SLACK * Math.max(x, y, z);
  return x + y >= z - slack && y + z >= x - slack && z + x >= y - slack;
}
