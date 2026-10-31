import type { BodyState, JointState, Quat, Vec3 } from "./backend.ts";
import { fnv1a64 } from "./ports.ts";

const f32 = new Float32Array(7);
const u32 = new Uint32Array(f32.buffer);

/** The RS-13 fold: float32 bits of p and q, two 32-bit hashes, 16 hex digits. */
export function hashRs13(bodies: ReadonlyArray<{ p: Vec3; q: Quat }>): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193 ^ 0xdeadbeef;
  for (const { p, q } of bodies) {
    f32.set(p, 0);
    f32.set(q, 3);
    for (let i = 0; i < 7; i++) {
      const w = u32[i];
      h1 = Math.imul(h1 ^ w, 0x01000193) >>> 0;
      h2 = Math.imul(h2 ^ ((w >>> 16) | (w << 16)), 0x85ebca6b) >>> 0;
      h2 = (h2 ^ (h2 >>> 13)) >>> 0;
    }
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

const byId = (a: { id: string }, b: { id: string }): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** FNV-1a 64 over the float64 bits of every body (p, q, v, w) and joint (angle, speed), each sorted by id. */
export function hash2(
  bodies: ReadonlyArray<BodyState & { id: string }>,
  joints: ReadonlyArray<Pick<JointState, "angle" | "speed"> & { id: string }>,
): string {
  const view = new DataView(new ArrayBuffer((bodies.length * 13 + joints.length * 2) * 8));
  let at = 0;
  const put = (x: number): void => {
    view.setFloat64(at, x, true);
    at += 8;
  };
  for (const b of [...bodies].sort(byId)) for (const part of [b.p, b.q, b.v, b.w]) part.forEach(put);
  for (const j of [...joints].sort(byId)) {
    put(j.angle);
    put(j.speed);
  }
  return fnv1a64(new Uint8Array(view.buffer));
}
