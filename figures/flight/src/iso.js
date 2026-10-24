// The chase view: an isometric drawing of the field, built once per view angle (the measured
// "cached SVG" approach: ~1.5 ms of main thread per frame on a desktop, under 9 ms at 6x CPU
// throttle), with only the craft, its shadow and the labels redrawn each frame.
const SVGNS = 'http://www.w3.org/2000/svg';
const SHADOW_LEN = 0.45;

function hull2(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) {
    while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

function createIso(svg, overlay) {
  const st = {
    az: 45, // the camera looks north-east by default (it stands south-west of the pad)
    el: 32,
    width: 14, // metres across the view
    center: null,
    course: null,
    solids: [],
    groups: [],
    depths: [],
    boxes: [],
    cut: new Set(),
    craftIndex: -1,
  };
  const layer = (id) => {
    const g = document.createElementNS(SVGNS, 'g');
    g.setAttribute('id', id);
    svg.appendChild(g);
    return g;
  };
  const gGround = layer('ground'), gShadow = layer('shadows'), gSolids = layer('solids'), gRings = layer('rings'), gXray = layer('xray');
  const craftG = document.createElementNS(SVGNS, 'g');
  craftG.setAttribute('id', 'craft');
  const craftShadow = document.createElementNS(SVGNS, 'g');

  let R, U, D, L, SH;
  function basis() {
    const a = st.az * DEG, e = st.el * DEG;
    D = [Math.cos(a) * Math.cos(e), Math.sin(a) * Math.cos(e), -Math.sin(e)];
    R = [Math.sin(a), -Math.cos(a), 0];
    U = cross3(R, D);
    // shadows fall to the lower left of the screen whatever the view angle
    const fx = Math.cos(a), fy = Math.sin(a);
    const sx = -R[0] - fx, sy = -R[1] - fy, sl = Math.hypot(sx, sy);
    SH = [(sx / sl) * SHADOW_LEN, (sy / sl) * SHADOW_LEN];
    L = norm3([-SH[0] * 1.6, -SH[1] * 1.6, 1]);
  }
  basis();
  const proj = (p) => [dot3(p, R), -dot3(p, U)];
  const depthOf = (p) => dot3(p, D);
  const tone = (n, col) => {
    const t = tones(col);
    const k = dot3(n, L);
    return k > 0.55 ? t.l : k > 0.05 ? t.m : t.d;
  };
  const AMP = 0.014;

  function solidSvg(o) {
    let s = '';
    for (const f of facesOf(o)) {
      if (dot3(f.n, D) > -0.01) continue; // facing away
      const pts = f.pts.map(proj);
      s += '<path d="' + wobblePath(pts, AMP) + '" fill="' + tone(f.n, o.col) + '"/>';
    }
    return s;
  }

  function shadowOf(o) {
    const pts = [];
    for (const f of facesOf(o)) for (const p of f.pts) pts.push(proj([p[0] + p[2] * SH[0], p[1] + p[2] * SH[1], 0]));
    return '<path d="' + wobblePath(hull2(pts), AMP) + '"/>';
  }

  /** Projects and sorts the whole field. Runs on load and when the view turns. */
  function build(course, solids) {
    st.course = course;
    st.solids = solids || [];
    basis();
    const F = course.field;
    // field slab with a grid
    const corners = [[0, 0, 0], [F, 0, 0], [F, F, 0], [0, F, 0]];
    let g = '';
    for (let i = 0; i < 4; i++) {
      const a = corners[i], b = corners[(i + 1) % 4];
      const n = norm3([(a[0] + b[0]) / 2 - F / 2, (a[1] + b[1]) / 2 - F / 2, 0]);
      if (dot3(n, D) > -0.01) continue;
      const q = [a, b, [b[0], b[1], -0.4], [a[0], a[1], -0.4]].map(proj);
      g += '<path d="' + wobblePath(q, AMP) + '" fill="' + tones(course.ground).d + '" class="ink"/>';
    }
    g += '<path d="' + wobblePath(corners.map(proj), AMP) + '" fill="' + course.ground + '" class="ink"/>';
    const step = Math.max(1, Math.round(F / 30));
    let grid = '';
    for (let v = step; v < F; v += step) {
      const a = proj([v, 0, 0]), b = proj([v, F, 0]), c = proj([0, v, 0]), d = proj([F, v, 0]);
      grid += 'M' + a[0].toFixed(2) + ' ' + a[1].toFixed(2) + 'L' + b[0].toFixed(2) + ' ' + b[1].toFixed(2);
      grid += 'M' + c[0].toFixed(2) + ' ' + c[1].toFixed(2) + 'L' + d[0].toFixed(2) + ' ' + d[1].toFixed(2);
    }
    g += '<path d="' + grid + '" class="grid"/>';
    for (const dc of decalsOf(course)) {
      g += '<path d="' + wobblePath(dc.pts.map(proj), AMP) + '" fill="' + dc.col + '"' + (dc.ink ? ' class="ink"' : '') + '/>';
      if (dc.label) {
        const c = proj([dc.x, dc.y, 0]);
        // tiny font sizes in user units render wrongly in some engines: draw at 12 and scale down
        const k = (dc.pad ? 0.6 : 0.42) / 12;
        g += '<text transform="translate(' + c[0].toFixed(2) + ' ' + c[1].toFixed(2) + ') scale(' + k.toFixed(4) + ')" y="4" class="decal">' + esc(dc.pad ? 'H' : caps(T(dc.label))) + '</text>';
      }
    }
    gGround.innerHTML = g;
    // shadows and solids, far to near
    let sh = '';
    const items = st.solids.map((o, i) => ({ o, i, d: depthOf([o.x, o.y, (o.z0 + o.z1) / 2]) }));
    items.sort((a, b) => b.d - a.d);
    gSolids.textContent = '';
    st.groups = [];
    st.depths = [];
    st.boxes = [];
    for (const it of items) {
      const o = it.o;
      sh += shadowOf(o);
      const el = document.createElementNS(SVGNS, 'g');
      el.setAttribute('class', 'solid' + (o.gate !== undefined ? ' gate g' + o.gate : ''));
      el.innerHTML = solidSvg(o);
      gSolids.appendChild(el);
      st.groups.push(el);
      st.depths.push(it.d);
      // screen box for the cutaway test
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const f of facesOf(o)) for (const p of f.pts) {
        const q = proj(p);
        x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]);
      }
      st.boxes.push([x0, y0, x1, y1]);
    }
    gShadow.innerHTML = '<g class="cast">' + sh + '</g>';
    gShadow.appendChild(craftShadow);
    // checkpoint rings and spheres
    let r = '';
    (course.checkpoints || []).forEach((cp, i) => {
      const ring = ringPts(cp);
      if (ring) {
        const d = wobblePath(ring.map(proj), AMP * 0.6);
        r += '<path class="cpi" d="' + d + '"/><path class="cp c' + i + '" d="' + d + '"/>';
      }
      else {
        const c = proj([cp.x, cp.y, cp.z]);
        r += '<circle class="cp sphere c' + i + '" cx="' + c[0].toFixed(2) + '" cy="' + c[1].toFixed(2) + '" r="' + (cp.r * 1.0).toFixed(2) + '"/>';
      }
    });
    gRings.innerHTML = r;
    st.craftIndex = -1;
    if (!st.center) st.center = proj([course.pad[0], course.pad[1], 0]);
  }

  function craftSvg(look, f, scale, ghost) {
    const P = craftParts(look, f, scale);
    const pal = tones(look.palette || 'tomato');
    const line = (a, b, cls) => {
      const p = proj(a), q = proj(b);
      return '<path class="' + cls + '" d="M' + p[0].toFixed(3) + ' ' + p[1].toFixed(3) + 'L' + q[0].toFixed(3) + ' ' + q[1].toFixed(3) + '"/>';
    };
    const poly = (pts3, fill, cls) => '<path class="' + (cls || 'ink') + '" fill="' + fill + '" d="' + wobblePath(pts3.map(proj), AMP * 0.35) + '"/>';
    let s = '';
    const spinning = f.armed && !f.crashed;
    if (look.span) {
      // a flying wing or the VTOL's wing, in the body plane
      const c = look.chord || 0.3, hs = look.span / 2;
      const wing = look.arms ? [[c * 0.35, hs, 0], [c * 0.35, -hs, 0], [-c * 0.45, -hs, 0], [-c * 0.45, hs, 0]] : [[c * 0.7, 0, 0], [-c * 0.3, -hs, 0], [-c * 0.45, -hs * 0.9, 0], [-c * 0.25, 0, 0], [-c * 0.45, hs * 0.9, 0], [-c * 0.3, hs, 0]];
      s += poly(wing.map((q) => P.at(q[0], q[1], q[2])), ghost ? 'none' : pal.l, ghost ? 'ghost' : 'ink');
      if (!ghost && !look.arms) {
        s += poly([[-c * 0.3, -hs, 0], [-c * 0.45, -hs * 0.9, 0], [-c * 0.4, -hs * 0.45, 0], [-c * 0.26, -hs * 0.5, 0]].map((q) => P.at(...q)), pal.d);
        s += poly([[-c * 0.3, hs, 0], [-c * 0.45, hs * 0.9, 0], [-c * 0.4, hs * 0.45, 0], [-c * 0.26, hs * 0.5, 0]].map((q) => P.at(...q)), pal.d);
        for (const side of [-1, 1]) s += poly([[-c * 0.3, side * hs, 0], [-c * 0.45, side * hs, 0], [-c * 0.42, side * hs, 0.08]].map((q) => P.at(...q)), pal.m);
      }
    }
    const [bl, bw, bh] = look.body || [0.1, 0.05, 0.04];
    // arms first, then props, then the stack on top
    for (const m of P.motors) s += line(P.at(0, 0, 0), P.at(m.f, m.l, 0), ghost ? 'ghost arm' : 'arm');
    P.motors.forEach((m, i) => {
      const out = (f.motorsOut || []).includes(i + 1);
      const ring = [];
      const pr = look.propR;
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        ring.push(P.at(m.f + Math.cos(a) * pr, m.l + Math.sin(a) * pr, 0.02));
      }
      if (look.ducted && !ghost) s += poly(ring, 'none', 'duct');
      if (ghost) s += poly(ring, 'none', 'ghost');
      else if (f.crashed) s += '';
      else if (spinning && !out) s += poly(ring, 'rgba(250,248,240,.55)', 'blur');
      else {
        for (let b = 0; b < 2; b++) {
          const a = (f.spin || 0) + b * Math.PI + i;
          s += line(P.at(m.f, m.l, 0.02), P.at(m.f + Math.cos(a) * pr, m.l + Math.sin(a) * pr, 0.02), 'blade');
        }
      }
      s += poly([[m.f - 0.012, m.l - 0.012, 0], [m.f + 0.012, m.l - 0.012, 0], [m.f + 0.012, m.l + 0.012, 0], [m.f - 0.012, m.l + 0.012, 0]].map((q) => P.at(q[0], q[1], 0.015)), ghost ? 'none' : out ? '#8f989b' : '#3d3935', ghost ? 'ghost' : 'ink');
    });
    if (!look.span || look.arms) {
      const box = [[bl / 2, bw / 2], [bl / 2, -bw / 2], [-bl / 2, -bw / 2], [-bl / 2, bw / 2]];
      const top = box.map(([a, b]) => P.at(a, b, bh));
      const bot = box.map(([a, b]) => P.at(a, b, 0));
      if (ghost) s += poly(top, 'none', 'ghost');
      else {
        for (let i = 0; i < 4; i++) {
          const j = (i + 1) % 4;
          const mid = [(box[i][0] + box[j][0]) / 2, (box[i][1] + box[j][1]) / 2];
          const nw = norm3([P.ax.fwd[0] * mid[0] + P.ax.left[0] * mid[1], P.ax.fwd[1] * mid[0] + P.ax.left[1] * mid[1], P.ax.fwd[2] * mid[0] + P.ax.left[2] * mid[1]]);
          if (dot3(nw, D) < 0) s += poly([bot[i], bot[j], top[j], top[i]], tone(nw, look.palette || 'tomato'));
        }
        s += poly(top, pal.l);
        // the FPV camera at the nose shows which way it faces
        s += poly([[bl / 2, 0.012, bh * 0.4], [bl / 2 + 0.02, 0.012, bh * 0.6], [bl / 2 + 0.02, -0.012, bh * 0.6], [bl / 2, -0.012, bh * 0.4]].map((q) => P.at(...q)), '#272421');
      }
    }
    return s;
  }

  let lastAz = st.az;
  /** Draws one frame. `vw`, `vh` are the view's pixel size. */
  function draw(f, look, followers, dt, vw, vh) {
    if (!st.course) return;
    if (lastAz !== st.az) {
      lastAz = st.az;
      build(st.course, st.solids);
    }
    const scale = look.isoScale || 2;
    const pos = [f.x, f.y, f.z];
    // camera: frame-rate independent follow
    const target = proj([f.x, f.y, f.z * 0.6]);
    const k = 1 - Math.exp(-6 * Math.min(0.1, dt));
    if (!st.center) st.center = target;
    st.center = [st.center[0] + (target[0] - st.center[0]) * k, st.center[1] + (target[1] - st.center[1]) * k];
    const W = st.width, H = (W * vh) / Math.max(1, vw);
    const vb = [st.center[0] - W / 2, st.center[1] - H / 2, W, H];
    svg.setAttribute('viewBox', vb.map((v) => v.toFixed(3)).join(' '));
    // the craft, its shadow and height line
    let html = craftSvg(look, f, scale, false);
    for (const fl of followers || []) html += craftSvg(look, { ...f, x: fl[0], y: fl[1], z: fl[2], yaw: fl[3], pitch: 0, roll: 0 }, scale, false);
    if (f.spray) {
      const P = craftParts(look, f, scale);
      const a = P.at(0, -look.armLen, 0), b = P.at(0, look.armLen, 0);
      const ga = proj([a[0], a[1], Math.max(0, f.z - 2.5)]), gb = proj([b[0], b[1], Math.max(0, f.z - 2.5)]);
      const pa = proj(a), pb = proj(b);
      html = '<path class="spray" d="M' + pa.join(' ') + 'L' + pb.join(' ') + 'L' + (gb[0] + 0.6) + ' ' + gb[1] + 'L' + (ga[0] - 0.6) + ' ' + ga[1] + 'Z"/>' + html;
    }
    craftG.innerHTML = html;
    const ground = proj([f.x, f.y, 0]);
    const cast = proj([f.x + f.z * SH[0], f.y + f.z * SH[1], 0]);
    const span = (look.span ? look.span / 2 : look.armLen + look.propR) * scale;
    let sh = '<ellipse class="cshadow" cx="' + cast[0].toFixed(3) + '" cy="' + cast[1].toFixed(3) + '" rx="' + span.toFixed(3) + '" ry="' + (span * Math.sin(st.el * DEG)).toFixed(3) + '"/>';
    if (f.z > 0.05) {
      const c = proj(pos);
      sh += '<path class="hline" d="M' + c[0].toFixed(3) + ' ' + c[1].toFixed(3) + 'L' + ground[0].toFixed(3) + ' ' + ground[1].toFixed(3) + '"/>';
      sh += '<ellipse class="gdot" cx="' + ground[0].toFixed(3) + '" cy="' + ground[1].toFixed(3) + '" rx="0.09" ry="' + (0.09 * Math.sin(st.el * DEG)).toFixed(3) + '"/>';
    }
    craftShadow.innerHTML = sh;
    // depth order: put the craft between the solids behind it and those in front
    const d = depthOf(pos);
    let lo = 0, hi = st.depths.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (st.depths[mid] > d) lo = mid + 1;
      else hi = mid;
    }
    if (lo !== st.craftIndex || craftG.parentNode !== gSolids) {
      gSolids.insertBefore(craftG, st.groups[lo] || null);
      st.craftIndex = lo;
    }
    // cutaway: anything in front of the craft that covers it turns see-through
    const c2 = proj(pos);
    const m = span * 1.2;
    const now = new Set();
    for (let i = lo; i < st.groups.length; i++) {
      const b = st.boxes[i];
      if (c2[0] > b[0] - m && c2[0] < b[2] + m && c2[1] > b[1] - m && c2[1] < b[3] + m) now.add(i);
    }
    for (const i of st.cut) if (!now.has(i)) st.groups[i].classList.remove('cut');
    for (const i of now) if (!st.cut.has(i)) st.groups[i].classList.add('cut');
    st.cut = now;
    // and an x-ray outline on top, so the craft never vanishes
    gXray.innerHTML = now.size ? craftSvg(look, f, scale, true) : '';
    // next gate / checkpoint highlight
    svg.querySelectorAll('.next').forEach((el) => el.classList.remove('next'));
    if (f.next && f.next.kind === 'gate') svg.querySelectorAll('.g' + (f.next.n - 1)).forEach((el) => el.classList.add('next'));
    if (f.next && f.next.kind === 'checkpoint') svg.querySelectorAll('.c' + (f.next.n - 1)).forEach((el) => el.classList.add('next'));
    drawOverlay(f, vb, vw, vh);
  }

  function drawOverlay(f, vb, vw, vh) {
    let s = '';
    const toPx = (p) => {
      const q = proj(p);
      return [((q[0] - vb[0]) / vb[2]) * vw, ((q[1] - vb[1]) / vb[3]) * vh];
    };
    if (f.next) {
      const n = f.next;
      const label = nextLabelOf(n) + '  ' + Math.round(Math.hypot(n.x - f.x, n.y - f.y, n.z - f.z)) + 'm';
      let [x, y] = toPx([n.x, n.y, n.z + (n.kind === 'gate' ? 1.2 : n.kind === 'home' ? 0.6 : 1.4)]);
      const inside = x > 24 && x < vw - 24 && y > 24 && y < vh - 24;
      const w = textWidth(label, 12) + 18;
      if (!inside) {
        // pinned to the edge with an arrow toward the target
        const cx = vw / 2, cy = vh / 2, ang = Math.atan2(y - cy, x - cx);
        const kx = (vw / 2 - w / 2 - 10) / Math.max(1e-6, Math.abs(Math.cos(ang))), ky = (vh / 2 - 22) / Math.max(1e-6, Math.abs(Math.sin(ang)));
        const kk = Math.min(kx, ky);
        x = cx + Math.cos(ang) * kk;
        y = cy + Math.sin(ang) * kk;
        s += '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + (ang / DEG).toFixed(1) + ')"><path class="parrow" d="M' + (w / 2 + 4) + ' -6L' + (w / 2 + 14) + ' 0L' + (w / 2 + 4) + ' 6Z"/></g>';
      }
      s += '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')"><rect class="pill' + (n.kind === 'home' ? ' home' : '') + '" x="' + (-w / 2).toFixed(1) + '" y="-11" width="' + w.toFixed(1) + '" height="22" rx="8"/><text class="ptext" y="4.5">' + esc(label) + '</text></g>';
    }
    if (f.windOn) {
      const wl = Math.hypot(f.wind[0], f.wind[1]);
      // screen direction of the wind vector
      const sx = dot3([f.wind[0], f.wind[1], 0], R), sy = -dot3([f.wind[0], f.wind[1], 0], U);
      const sl = Math.hypot(sx, sy) || 1;
      const ux = sx / sl, uy = sy / sl;
      const cx = vw - 46, cy = 58;
      s += '<g class="wind"><circle cx="' + cx + '" cy="' + cy + '" r="26"/><path d="M' + (cx - ux * 16).toFixed(1) + ' ' + (cy - uy * 16).toFixed(1) + 'L' + (cx + ux * 16).toFixed(1) + ' ' + (cy + uy * 16).toFixed(1) + '"/><path class="head" d="M' + (cx + ux * 18).toFixed(1) + ' ' + (cy + uy * 18).toFixed(1) + 'L' + (cx + ux * 8 - uy * 6).toFixed(1) + ' ' + (cy + uy * 8 + ux * 6).toFixed(1) + 'L' + (cx + ux * 8 + uy * 6).toFixed(1) + ' ' + (cy + uy * 8 - ux * 6).toFixed(1) + 'Z"/><text x="' + cx + '" y="' + (cy + 42) + '">' + wl.toFixed(1) + ' m/s</text></g>';
    }
    overlay.innerHTML = s;
  }

  return {
    st,
    build,
    draw,
    turn(deg) {
      st.az = ((st.az + deg) % 360 + 360) % 360;
    },
    zoom(k) {
      st.width = Math.max(3, Math.min(80, st.width * k));
    },
    proj,
  };
}
