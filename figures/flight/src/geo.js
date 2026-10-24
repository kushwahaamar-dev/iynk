// World geometry for both views. The host sends the course and the collision solids it flies
// against (src/lib/flight/world.ts buildSolids), so what you see is exactly what you can hit.
const DEG = Math.PI / 180;
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm3 = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Body axes for yaw (from +x, CCW), pitch (nose down +) and roll (left bank +), degrees. Same as src/lib/flight/math.ts. */
function bodyAxes(yaw, pitch, roll) {
  const cy = Math.cos(yaw * DEG), sy = Math.sin(yaw * DEG);
  const cp = Math.cos(pitch * DEG), sp = Math.sin(pitch * DEG);
  const cr = Math.cos(roll * DEG), sr = Math.sin(roll * DEG);
  const rz = (v) => [cy * v[0] - sy * v[1], sy * v[0] + cy * v[1], v[2]];
  return { up: rz([cr * sp, sr, cr * cp]), fwd: rz([cp, 0, -sp]), left: rz([-sr * sp, cr, -sr * cp]) };
}

/** Faces of one collision solid: [{ pts:[[x,y,z]...], n:[...] }]. Convex, so visible faces never overlap. */
function facesOf(o) {
  const faces = [];
  if (o.k === 'box') {
    const ax = [o.c, o.s, 0], ay = [-o.s, o.c, 0];
    const corner = (i, j, z) => [o.x + ax[0] * o.hw * i + ay[0] * o.hd * j, o.y + ax[1] * o.hw * i + ay[1] * o.hd * j, z];
    const b = [corner(1, 1, o.z0), corner(-1, 1, o.z0), corner(-1, -1, o.z0), corner(1, -1, o.z0)];
    const t = b.map((p) => [p[0], p[1], o.z1]);
    faces.push({ pts: t, n: [0, 0, 1] });
    if (o.z0 > 0.02) faces.push({ pts: b.slice().reverse(), n: [0, 0, -1] });
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      const mid = [(b[i][0] + b[j][0]) / 2 - o.x, (b[i][1] + b[j][1]) / 2 - o.y, 0];
      faces.push({ pts: [b[i], b[j], t[j], t[i]], n: norm3(mid) });
    }
  } else {
    const n = o.n || 12;
    const ring = (r, z) => {
      const out = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const lx = Math.cos(a) * r, ly = Math.sin(a) * r;
        out.push([o.x + lx * o.c - ly * o.s, o.y + lx * o.s + ly * o.c, z]);
      }
      return out;
    };
    const lo = ring(o.r0, o.z0), hi = ring(o.r1, o.z1);
    const cone = o.r1 < 0.05;
    const slope = (o.r0 - o.r1) / Math.max(0.01, o.z1 - o.z0);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const a = ((i + 0.5) / n) * Math.PI * 2;
      const lx = Math.cos(a), ly = Math.sin(a);
      const nrm = norm3([lx * o.c - ly * o.s, lx * o.s + ly * o.c, slope]);
      faces.push({ pts: cone ? [lo[i], lo[j], [o.x, o.y, o.z1]] : [lo[i], lo[j], hi[j], hi[i]], n: nrm });
    }
    if (!cone) faces.push({ pts: hi, n: [0, 0, 1] });
    if (o.z0 > 0.02) faces.push({ pts: lo.slice().reverse(), n: [0, 0, -1] });
  }
  return faces;
}

/** Decals (flat ground marks) from the course prims, as polygons at z = 0. */
function decalsOf(course) {
  const out = [];
  for (const p of course.prims || []) {
    if (p.type === 'flat') {
      const c = Math.cos((p.yaw || 0) * DEG), s = Math.sin((p.yaw || 0) * DEG), hw = p.w / 2, hd = p.d / 2;
      const pts = [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([i, j]) => [p.x + c * hw * i - s * hd * j, p.y + s * hw * i + c * hd * j, 0]);
      out.push({ pts, col: p.col || '#d4cfc4', label: p.label, x: p.x, y: p.y, ink: p.ink !== false });
    } else if (p.type === 'disc') {
      const pts = [];
      for (let i = 0; i < 20; i++) pts.push([p.x + Math.cos((i / 20) * Math.PI * 2) * p.r, p.y + Math.sin((i / 20) * Math.PI * 2) * p.r, 0]);
      out.push({ pts, col: p.col || '#f4f1e6', label: p.label, x: p.x, y: p.y, ink: true });
    }
  }
  // the take-off pad is always marked
  const [px, py] = course.pad;
  const pad = [];
  for (let i = 0; i < 20; i++) pad.push([px + Math.cos((i / 20) * Math.PI * 2) * 0.6, py + Math.sin((i / 20) * Math.PI * 2) * 0.6, 0]);
  out.push({ pts: pad, col: '#fbfaf3', label: 'H', x: px, y: py, ink: true, pad: true });
  return out;
}

/** A checkpoint ring as 3D points (circle across the heading), or null for a sphere. */
function ringPts(cp, n = 28) {
  if (cp.heading === undefined || cp.heading === null) return null;
  const c = Math.cos(cp.heading * DEG), s = Math.sin(cp.heading * DEG);
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const lat = Math.cos(a) * cp.r, up = Math.sin(a) * cp.r;
    out.push([cp.x - s * lat, cp.y + c * lat, cp.z + up]);
  }
  return out;
}

/** The craft as 3D line work and blobs in its body frame, placed at a pose. */
function craftParts(look, frame, scale) {
  const ax = bodyAxes(frame.yaw, frame.pitch, frame.roll);
  const at = (f, l, u) => [
    frame.x + (ax.fwd[0] * f + ax.left[0] * l + ax.up[0] * u) * scale,
    frame.y + (ax.fwd[1] * f + ax.left[1] * l + ax.up[1] * u) * scale,
    frame.z + 0.04 + (ax.fwd[2] * f + ax.left[2] * l + ax.up[2] * u) * scale,
  ];
  const motors = [];
  const n = look.arms || 0;
  const frameKind = look.frame || 'x';
  for (let i = 0; i < n; i++) {
    // a tricopter's Y: two front arms at +-60 degrees and the tail straight back
    const a = frameKind === 'y' ? [60, -60, 180][i % 3] * DEG : (i / n) * Math.PI * 2 + (frameKind === 'plus' ? 0 : Math.PI / n);
    motors.push({ f: Math.cos(a) * look.armLen, l: Math.sin(a) * look.armLen });
  }
  return { ax, at, motors };
}
