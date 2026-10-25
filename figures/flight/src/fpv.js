// FPV goggles: a perspective view from the craft's camera (near-plane clipping, back-face culling,
// painter's sort), redrawn every frame as one SVG string, with a Betaflight-style OSD on top.
// The picture is framed like 4:3 goggles (FW wide); the drawing is as wide as the frame on screen (st.w), so a
// portrait phone crops the picture's sides but the OSD stays anchored to the edges it can see.
const FW = 1000, FH = 750, NEAR = 0.06;
const SUN = norm3([-0.45, -0.25, 0.86]);

function createFpv(svg) {
  const st = { faces: [], decals: [], rings: [], hills: [], course: null, msg: '', msgUntil: 0, w: FW };

  // the drawing's width in viewBox units for the frame's shape (750 high), between a tall phone and a wide screen
  function fit() {
    const cw = svg.clientWidth, ch = svg.clientHeight;
    const w = cw > 0 && ch > 0 ? Math.round(Math.max(560, Math.min(1400, (FH * cw) / ch))) : FW;
    if (w !== st.w) {
      st.w = w;
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + FH);
    }
  }

  function build(course, solids) {
    st.course = course;
    st.faces = [];
    for (const o of solids || []) {
      for (const f of facesOf(o)) {
        const k = dot3(f.n, SUN);
        const t = tones(o.col);
        st.faces.push({ pts: f.pts, n: f.n, fill: k > 0.55 ? t.l : k > 0.05 ? t.m : t.d, gate: o.gate });
      }
    }
    st.decals = decalsOf(course);
    st.rings = (course.checkpoints || []).map((cp, i) => ({ cp, i, pts: ringPts(cp, 32) }));
    const R = Math.max(500, 4 * course.field), cx = course.field / 2, cy = course.field / 2;
    st.hills = [];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2, w = ((Math.PI * 2 * R) / 28) * 0.9, h = 25 + 45 * Math.abs(Math.sin(1.7 * i));
      const px = cx + Math.cos(a) * R, py = cy + Math.sin(a) * R;
      const tx = -Math.sin(a), ty = Math.cos(a);
      st.hills.push([[px - tx * w, py - ty * w, 0], [px + tx * w, py + ty * w, 0], [px, py, h]]);
    }
  }

  function camera(f, craft, camTilt) {
    const ax = craft.fpvLevel ? bodyAxes(f.yaw, 0, 0) : bodyAxes(f.yaw, f.pitch, f.roll);
    const t = camTilt * DEG;
    const fwd = [ax.fwd[0] * Math.cos(t) + ax.up[0] * Math.sin(t), ax.fwd[1] * Math.cos(t) + ax.up[1] * Math.sin(t), ax.fwd[2] * Math.cos(t) + ax.up[2] * Math.sin(t)];
    const up = [ax.up[0] * Math.cos(t) - ax.fwd[0] * Math.sin(t), ax.up[1] * Math.cos(t) - ax.fwd[1] * Math.sin(t), ax.up[2] * Math.cos(t) - ax.fwd[2] * Math.sin(t)];
    const right = [-ax.left[0], -ax.left[1], -ax.left[2]];
    const pos = [f.x, f.y, f.z + 0.08];
    const foc = FW / 2 / Math.tan((craft.fov || 105) * DEG / 2);
    return { pos, fwd, up, right, foc };
  }

  const toCam = (c, p) => {
    const d = [p[0] - c.pos[0], p[1] - c.pos[1], p[2] - c.pos[2]];
    return [dot3(d, c.right), dot3(d, c.up), dot3(d, c.fwd)];
  };

  // Sutherland-Hodgman against z >= NEAR, in camera space
  function clip(poly, closed = true) {
    const out = [];
    const n = poly.length;
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const a = poly[i], b = poly[(i + 1) % n];
      const ain = a[2] >= NEAR, bin = b[2] >= NEAR;
      if (ain) out.push(a);
      if (ain !== bin) {
        const k = (NEAR - a[2]) / (b[2] - a[2]);
        out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, NEAR]);
      }
    }
    if (!closed && n && poly[n - 1][2] >= NEAR) out.push(poly[n - 1]);
    return out;
  }
  const scr = (c, q) => [st.w / 2 + (c.foc * q[0]) / q[2], FH / 2 - (c.foc * q[1]) / q[2]];
  const path = (pts, close = true) => {
    let d = '';
    for (let i = 0; i < pts.length; i++) d += (i ? 'L' : 'M') + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1);
    return close ? d + 'Z' : d;
  };
  function polyStr(c, pts3, attrs) {
    const cp = clip(pts3.map((p) => toCam(c, p)));
    if (cp.length < 3) return null;
    return '<path d="' + path(cp.map((q) => scr(c, q))) + '" ' + attrs + '/>';
  }

  const one = (text, max) => (text.length > max ? text.slice(0, Math.max(1, max - 1)) + '…' : text);
  // text at most `max` characters wide, split at a space into two lines when it is longer
  function lines(text, max) {
    if (text.length <= max) return [text];
    const cut = text.lastIndexOf(' ', max);
    const head = cut > max / 2 ? text.slice(0, cut) : text.slice(0, max);
    const tail = text.slice(head.length).trim();
    return [head, one(tail, max)];
  }

  function osd(f, craft, nextLabel) {
    const W = st.w, R = W - 40, C = W / 2;
    // narrow (a phone held upright): the flight mode and the messages get rows of their own
    const narrow = W < 800;
    const low = f.low;
    const mm = Math.floor(f.timer / 60), ss = Math.floor(f.timer % 60);
    let s = '<g class="osd">';
    s += '<text x="40" y="58" class="' + (low ? 'red' : '') + '">' + f.volt.toFixed(1) + 'V</text>';
    s += '<text x="40" y="92" class="sm">' + f.amps.toFixed(1) + 'A  ' + f.mah + 'mAh</text>';
    if (f.windOn) s += '<text x="40" y="122" class="sm">W ' + Math.hypot(f.wind[0], f.wind[1]).toFixed(1) + 'm/s</text>';
    s += '<text x="' + R + '" y="58" text-anchor="end">' + String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0') + '</text>';
    s += '<text x="40" y="712">' + esc(T('osd.alt', 'ALT')) + ' ' + f.z.toFixed(1) + 'm</text>';
    s += '<text x="' + R + '" y="712" text-anchor="end">' + Math.round(f.speed * 3.6) + ' km/h</text>';
    const state = f.crashed ? T('osd.crashed', 'CRASHED') : f.armed ? caps(T('mode.' + f.mode, f.mode)) : T('osd.disarmed', 'DISARMED');
    const stateCls = f.crashed ? 'red' : f.armed ? 'green' : 'yellow';
    if (narrow) s += '<text x="' + C + '" y="662" text-anchor="middle" class="sm ' + stateCls + '">' + esc(one(state, Math.floor((W - 80) / 18))) + '</text>';
    else s += '<text x="' + C + '" y="712" text-anchor="middle" class="' + stateCls + '">' + esc(state) + '</text>';
    // crosshair and artificial horizon: nose down moves the bar UP, as the real horizon does
    const cross = 'M' + (C - 12) + ' 375H' + (C + 12) + 'M' + C + ' 363V387';
    s += '<path class="ahi-o" d="' + cross + '"/><path class="cross" d="' + cross + '"/>';
    const off = Math.max(-150, Math.min(150, -f.pitch * 4));
    const bar = Math.min(130, (W - 120) / 2);
    const ahi = 'M' + -bar + ' 0H-40M40 0H' + bar + 'M' + -bar + ' 0v10M' + bar + ' 0v10';
    s += '<g transform="translate(' + C + ' ' + (375 + off).toFixed(1) + ') rotate(' + f.roll.toFixed(1) + ')"><path class="ahi-o" d="' + ahi + '"/><path class="ahi" d="' + ahi + '"/></g>';
    if (low && Math.floor(f.t * 2.5) % 2 === 0) s += '<text x="' + C + '" y="560" text-anchor="middle" class="red">' + esc(T('osd.lowBattery', 'LOW BATTERY')) + '</text>';
    if (f.next) {
      const n = f.next;
      const bearing = ((Math.atan2(n.y - f.y, n.x - f.x) / DEG - f.yaw + 540) % 360) - 180;
      const dist = Math.round(Math.hypot(n.x - f.x, n.y - f.y, n.z - f.z));
      s += '<g transform="translate(' + C + ' 70) rotate(' + (-bearing).toFixed(1) + ')"><path class="arrow" d="M0 -22L14 8L0 1L-14 8Z"/></g>';
      const label = one(nextLabel, Math.floor((W - 80) / (narrow ? 18 : 13.2)) - 6);
      s += '<text x="' + C + '" y="' + (narrow ? 158 : 120) + '" text-anchor="middle" class="sm">' + esc(label + '  ' + dist + 'm') + '</text>';
    }
    if (st.msg && f.t < st.msgUntil) {
      const rows = lines(st.msg, Math.min(46, Math.floor((W - 80) / (narrow ? 18 : 13.2))));
      const y0 = narrow ? 600 - (rows.length - 1) * 34 : 640 - (rows.length - 1) * 28;
      rows.forEach((row, i) => {
        s += '<text x="' + C + '" y="' + (y0 + i * (narrow ? 34 : 28)) + '" text-anchor="middle" class="yellow sm">' + esc(row) + '</text>';
      });
    }
    return s + '</g>';
  }

  function draw(f, craft, camTilt, followers, ghosts) {
    if (!st.course) return;
    fit();
    const c = camera(f, craft, camTilt);
    let s = '<rect width="' + st.w + '" height="' + FH + '" fill="#cfe2ea"/>';
    for (const h of st.hills) {
      const p = polyStr(c, h, 'fill="#b8c7c3" class="fi"');
      if (p) s += p;
    }
    const G = 3000;
    s += polyStr(c, [[-G, -G, 0], [G, -G, 0], [G, G, 0], [-G, G, 0]], 'fill="#e3e6d2"') || '';
    const F = st.course.field;
    s += polyStr(c, [[0, 0, 0], [F, 0, 0], [F, F, 0], [0, F, 0]], 'fill="' + st.course.ground + '" class="fi"') || '';
    const step = Math.max(1, Math.round(F / 30));
    let grid = '';
    for (let v = step; v < F; v += step) {
      for (const seg of [[[v, 0, 0], [v, F, 0]], [[0, v, 0], [F, v, 0]]]) {
        const q = clip(seg.map((p) => toCam(c, p)), false);
        if (q.length === 2) grid += path(q.map((p) => scr(c, p)), false);
      }
    }
    s += '<path d="' + grid + '" class="fgrid"/>';
    for (const dc of st.decals) s += polyStr(c, dc.pts, 'fill="' + dc.col + '" class="fi"') || '';
    // solids and rings, far to near
    const items = [];
    for (const face of st.faces) {
      const p0 = face.pts[0];
      if (dot3(face.n, [c.pos[0] - p0[0], c.pos[1] - p0[1], c.pos[2] - p0[2]]) <= 0) continue;
      const cam = face.pts.map((p) => toCam(c, p));
      let z = 0, any = false;
      for (const q of cam) {
        z += q[2];
        if (q[2] > NEAR) any = true;
      }
      if (!any) continue;
      const cp = clip(cam);
      if (cp.length < 3) continue;
      const next = f.next && f.next.kind === 'gate' && face.gate === f.next.n - 1;
      items.push({ z: z / cam.length, s: '<path d="' + path(cp.map((q) => scr(c, q))) + '" fill="' + (next ? '#f4b829' : face.fill) + '" class="fi"/>' });
    }
    for (const r of st.rings) {
      const isNext = f.next && f.next.kind === 'checkpoint' && f.next.n - 1 === r.i;
      const center = toCam(c, [r.cp.x, r.cp.y, r.cp.z]);
      if (center[2] < NEAR) continue;
      if (r.pts) {
        const q = clip(r.pts.map((p) => toCam(c, p)));
        if (q.length < 3) continue;
        const wdt = Math.max(1.5, Math.min(18, 260 / Math.max(0.5, center[2])));
        items.push({ z: center[2], s: '<path d="' + path(q.map((p) => scr(c, p))) + '" fill="none" stroke="' + (isNext ? '#ef6a4c' : '#f4f1e6') + '" stroke-width="' + wdt.toFixed(1) + '" class="ring"/>' });
      } else {
        const p = scr(c, center);
        items.push({ z: center[2], s: '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + ((c.foc * r.cp.r) / center[2]).toFixed(1) + '" fill="' + (isNext ? 'rgba(239,106,76,.35)' : 'rgba(244,241,230,.35)') + '" class="ring"/>' });
      }
    }
    for (const fl of followers || []) {
      const q = toCam(c, [fl[0], fl[1], fl[2] + 0.03]);
      if (q[2] < NEAR) continue;
      const p = scr(c, q);
      items.push({ z: q[2], s: '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + Math.max(2, (c.foc * 0.06) / q[2]).toFixed(1) + '" fill="#3d3935" class="fi"/>' });
    }
    // ghosts: a ring in the ghost's colour, as big as the craft, with its name over it
    for (const g of ghosts || []) {
      const q = toCam(c, [g.x, g.y, g.z + 0.04]);
      if (q[2] < NEAR) continue;
      const p = scr(c, q);
      const rad = Math.max(5, (c.foc * Math.max(0.08, (craft.look.span || 0) / 2 || craft.look.armLen + craft.look.propR)) / q[2]);
      const col = esc(g.col || '#231e16');
      let svg = '<g class="gfpv"><circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + rad.toFixed(1) + '" fill="none" stroke="' + col + '" stroke-width="4" stroke-dasharray="10 7"/>';
      if (g.label) svg += '<text x="' + p[0].toFixed(1) + '" y="' + (p[1] - rad - 8).toFixed(1) + '" fill="' + col + '">' + esc(g.label) + '</text>';
      items.push({ z: q[2], s: svg + '</g>' });
    }
    items.sort((a, b) => b.z - a.z);
    for (const it of items) s += it.s;
    if (craft.fpvProps && f.armed) {
      const o = (0.12 + 0.2 * f.thr).toFixed(2);
      s += '<circle cx="-30" cy="-40" r="120" fill="#fff" opacity="' + o + '"/><circle cx="' + (st.w + 30) + '" cy="-40" r="120" fill="#fff" opacity="' + o + '"/>';
    }
    s += osd(f, craft, nextLabelOf(f.next));
    svg.innerHTML = s;
  }

  return {
    build,
    draw,
    flash(text, now, ms) {
      st.msg = text;
      st.msgUntil = now + (ms || 3200) / 1000;
    },
  };
}

function nextLabelOf(n) {
  if (!n) return '';
  if (n.kind === 'home') return T('osd.home', 'HOME');
  if (n.kind === 'gate') return T('osd.gate', 'GATE') + ' ' + n.n + '/' + n.total;
  if (n.kind === 'checkpoint') return caps(T(n.label)) || T('osd.cp', 'CP') + ' ' + n.n + '/' + n.total;
  return caps(T(n.label)) + ' ' + n.n + '/' + n.total;
}
