import { clamp, wrapDeg } from "./math";
import { type SimState } from "./state";

export function formation(i: number, d: number): [number, number] {
  const spots: Array<[number, number]> = [[0, 0], [d, 0], [0, -d], [d, -d], [-d, 0], [-d, -d]];
  return spots[i % spots.length];
}

export function followersStep(s: SimState, dt: number) {
  const sw = s.craft.swarm!;
  s.followers.forEach((f, i) => {
    // each follower holds its slot in the formation around the leader (the mocap frame is shared)
    const [ox, oy] = formation(i + 1, sw.spacing);
    const tx = s.p[0] + ox, ty = s.p[1] + oy;
    if (!s.armed && f.p[2] <= 0.01) return;
    const tz = s.armed ? s.p[2] : 0;
    for (const [k, t] of [[0, tx], [1, ty], [2, tz]] as Array<[0 | 1 | 2, number]>) {
      const want = clamp((t - f.p[k]) * 2.5, -1.5, 1.5);
      f.v[k] += (want - f.v[k]) * Math.min(1, 6 * dt);
      f.p[k] += f.v[k] * dt;
    }
    f.p[2] = Math.max(0, f.p[2]);
    f.yaw += wrapDeg(s.yaw - f.yaw) * Math.min(1, 3 * dt);
  });
}
