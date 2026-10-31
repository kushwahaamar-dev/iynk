export type Vec3 = readonly [number, number, number];

export interface SweptSolid {
  k: "box" | "cyl";
  x: number;
  y: number;
  z0: number;
  z1: number;
  c: number;
  s: number;
  hw?: number;
  hd?: number;
  r0?: number;
  r1?: number;
  diamond?: boolean;
  pass?: boolean;
}

export interface SweptHit<S extends SweptSolid> {
  solid: S;
  t: number;
  point: [number, number, number];
}

const MAX_SAMPLES = 64;

/** Is the sphere (x, y, z, radius m) inside the solid? The one geometric rule, shared by the point and swept tests. */
export function pointHit(o: SweptSolid, x: number, y: number, z: number, m: number): boolean {
  if (o.pass || z < o.z0 - m || z > o.z1 + m) return false;
  const dx = x - o.x, dy = y - o.y;
  const lx = dx * o.c + dy * o.s, ly = -dx * o.s + dy * o.c;
  if (o.k === "box") return Math.abs(lx) < (o.hw ?? 0) + m && Math.abs(ly) < (o.hd ?? 0) + m;
  const r0 = o.r0 ?? 0, r1 = o.r1 ?? 0;
  const k = Math.max(0, Math.min(1, (z - o.z0) / Math.max(1e-6, o.z1 - o.z0)));
  const r = r0 + (r1 - r0) * k;
  return o.diamond ? Math.abs(lx) + Math.abs(ly) < r + m : lx * lx + ly * ly < (r + m) * (r + m);
}

type Span = [number, number];

// the part of span where lo <= p + t * d <= hi, or null
function clip(span: Span, p: number, d: number, lo: number, hi: number): Span | null {
  if (d === 0) return p >= lo && p <= hi ? span : null;
  let ta = (lo - p) / d, tb = (hi - p) / d;
  if (ta > tb) [ta, tb] = [tb, ta];
  const t0 = Math.max(span[0], ta), t1 = Math.min(span[1], tb);
  return t0 <= t1 ? [t0, t1] : null;
}

// the part of span where the 2D point p + t * d is within radius r of the origin, or null
function clipDisc(span: Span, px: number, py: number, dx: number, dy: number, r: number): Span | null {
  const a = dx * dx + dy * dy, b = px * dx + py * dy, cc = px * px + py * py - r * r;
  if (a === 0) return cc <= 0 ? span : null;
  const disc = b * b - a * cc;
  if (disc < 0) return null;
  const root = Math.sqrt(disc);
  const t0 = Math.max(span[0], (-b - root) / a), t1 = Math.min(span[1], (-b + root) / a);
  return t0 <= t1 ? [t0, t1] : null;
}

function entryOf(o: SweptSolid, a: Vec3, b: Vec3, m: number): number | null {
  const dz = b[2] - a[2];
  const zSpan = clip([0, 1], a[2], dz, o.z0 - m, o.z1 + m);
  if (!zSpan) return null;
  const ax = a[0] - o.x, ay = a[1] - o.y, bx = b[0] - o.x, by = b[1] - o.y;
  const pax = ax * o.c + ay * o.s, pay = -ax * o.s + ay * o.c;
  const pbx = bx * o.c + by * o.s, pby = -bx * o.s + by * o.c;
  const dx = pbx - pax, dy = pby - pay;
  let span: Span | null;
  if (o.k === "box") {
    span = clip(zSpan, pax, dx, -((o.hw ?? 0) + m), (o.hw ?? 0) + m);
    if (span) span = clip(span, pay, dy, -((o.hd ?? 0) + m), (o.hd ?? 0) + m);
  } else {
    span = clipDisc(zSpan, pax, pay, dx, dy, (o.r0 ?? 0) + m);
  }
  return span ? span[0] : null;
}

// cones and roofs are tested at points along the segment: a thin sliver between two samples can be missed
function sampledEntry(o: SweptSolid, a: Vec3, b: Vec3, m: number, len: number): number | null {
  const step = 0.25 * (Math.min(o.r0 ?? 0, o.r1 ?? 0) + m);
  const n = step > 0 ? Math.max(1, Math.min(MAX_SAMPLES, Math.ceil(len / step))) : MAX_SAMPLES;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    if (pointHit(o, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, m)) return t;
  }
  return null;
}

function near(o: SweptSolid, a: Vec3, b: Vec3, m: number): boolean {
  const reach = m + (o.k === "box" ? Math.hypot(o.hw ?? 0, o.hd ?? 0) : Math.max(o.r0 ?? 0, o.r1 ?? 0));
  return Math.max(a[0], b[0]) >= o.x - reach && Math.min(a[0], b[0]) <= o.x + reach
    && Math.max(a[1], b[1]) >= o.y - reach && Math.min(a[1], b[1]) <= o.y + reach
    && Math.max(a[2], b[2]) >= o.z0 - m && Math.min(a[2], b[2]) <= o.z1 + m;
}

/**
 * The first solid the sphere of radius m touches while its centre moves from a to b, with the fraction t of the
 * segment and the contact point. Boxes and straight cylinders are exact; cones and roofs are sampled. A start
 * inside a solid gives t = 0. Bad input gives null.
 */
export function sweptHit<S extends SweptSolid>(solids: readonly S[], a: Vec3, b: Vec3, m: number): SweptHit<S> | null {
  if (!Number.isFinite(m) || !a.every(Number.isFinite) || !b.every(Number.isFinite)) return null;
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  let best: S | null = null;
  let bestT = Infinity;
  for (const o of solids) {
    if (o.pass || !near(o, a, b, m)) continue;
    let t: number | null;
    if (pointHit(o, a[0], a[1], a[2], m)) t = 0;
    else if (o.k === "box" || (o.r0 === o.r1 && !o.diamond)) t = entryOf(o, a, b, m) ?? (pointHit(o, b[0], b[1], b[2], m) ? 1 : null);
    else t = sampledEntry(o, a, b, m, len);
    if (t === null || t >= bestT) continue;
    best = o;
    bestT = t;
    if (t === 0) break;
  }
  if (!best) return null;
  return { solid: best, t: bestT, point: [a[0] + (b[0] - a[0]) * bestT, a[1] + (b[1] - a[1]) * bestT, a[2] + (b[2] - a[2]) * bestT] };
}
