/* iynk drone engine: frame layouts, motor numbering and the FRAME drawing (docs/FIGURES-DRONE.md §4).
   Motor angles in data count clockwise from the nose seen from above; positions are craft-local (x forward, y left). */
(() => {
  const SD = SL.drone, g = SD.g, W = SD.W;
  const rad = d => d * Math.PI / 180;
  const fromCW = (R, a) => [R * Math.cos(rad(a)), -R * Math.sin(rad(a))];

  // [id, x, y, dir] tables per numbering; a = half spacing along x, b = half spacing along y
  const QUAD = {
    betaflight: (a, b) => [['M1', -a, -b, 'CW'], ['M2', a, -b, 'CCW'], ['M3', -a, b, 'CCW'], ['M4', a, b, 'CW']],
    ardupilot: (a, b) => [['M1', a, -b, 'CCW'], ['M2', -a, b, 'CCW'], ['M3', a, b, 'CW'], ['M4', -a, -b, 'CW']],
    crazyflie: (a, b) => [['M1', a, -b, 'CCW'], ['M2', -a, -b, 'CW'], ['M3', -a, b, 'CCW'], ['M4', a, b, 'CW']],
  };
  const RING = {
    'hex-x': [['M1', 90, 'CW'], ['M2', 270, 'CCW'], ['M3', 330, 'CW'], ['M4', 150, 'CCW'], ['M5', 30, 'CCW'], ['M6', 210, 'CW']],
    'octo-x': [['M1', 22.5, 'CW'], ['M2', 202.5, 'CW'], ['M3', 67.5, 'CCW'], ['M4', 157.5, 'CCW'], ['M5', 337.5, 'CCW'], ['M6', 247.5, 'CCW'], ['M7', 292.5, 'CW'], ['M8', 112.5, 'CW']],
    'tri-y': [['M1', 180, 'CW'], ['M2', 60, 'CCW'], ['M3', 300, 'CW']],
  };
  RING['vtol-tri'] = RING['tri-y'];
  const DEFAULT_NUM = { 'quad-x': 'betaflight', 'stretch-x': 'betaflight', whoop: 'betaflight', cf2: 'crazyflie' };

  SD.motorsOf = F => {
    if (!F) return [];
    let list = [];
    if (Array.isArray(F.motors) && F.motors.length) list = F.motors.map(m => [m.id, m.at[0], m.at[1], m.dir, m.tilt || 0, m.at[2]]);
    else if (F.layout === 'wing') list = [];
    else if (RING[F.layout]) list = RING[F.layout].map(([id, a, dir]) => { const [x, y] = fromCW(F.wheelbase / 2, a); return [id, x, y, dir, 0]; });
    else {
      let a, b;
      if (F.layout === 'stretch-x'){ const s = F.stretch || 1.2, half = F.wheelbase / 2; b = half / Math.sqrt(1 + s * s); a = s * b; }
      else a = b = F.wheelbase / (2 * Math.SQRT2);
      const num = F.numbering || DEFAULT_NUM[F.layout] || 'betaflight';
      list = (QUAD[num] || QUAD.betaflight)(a, b).map(r => [...r, 0]);
    }
    return list.map(([id, x, y, dir, tilt, z]) => ({ id, x, y, z: z != null ? z : null, dir: dir === 'CCW' ? 'CCW' : 'CW', tilt, r: Math.hypot(x, y), ang: Math.atan2(y, x) }));
  };

  const rrect = (l, w, r, n = 4) => {
    const out = [], hl = l / 2, hw = w / 2;
    r = Math.min(r, hl, hw);
    for (const [cx, cy, a0] of [[hl - r, hw - r, 0], [-hl + r, hw - r, 90], [-hl + r, -hw + r, 180], [hl - r, -hw + r, 270]])
      for (let i = 0; i <= n; i++){ const a = rad(a0 + 90 * i / n); out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
    return out;
  };
  const circ = (cx, cy, r, n = 14) => Array.from({ length: n }, (_, i) => { const a = i / n * 2 * Math.PI; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
  const armRect = (x0, y0, x1, y1, w) => {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L * w / 2, ny = dx / L * w / 2;
    return [[x0 - nx, y0 - ny], [x1 - nx, y1 - ny], [x1 + nx, y1 + ny], [x0 + nx, y0 + ny]];
  };
  SD.rrect = rrect; SD.circ = circ;

  // a flat slab made of convex pieces sharing one thickness, drawn as one item: every visible side, then the tops
  function slab(pieces, z, t, m){
    const sides = [], tops = [], all = [];
    for (const out of pieces){
      const n = out.length;
      let area = 0;
      for (let i = 0; i < n; i++){ const [x0, y0] = out[i], [x1, y1] = out[(i + 1) % n]; area += x0 * y1 - x1 * y0; }
      const sgn = area >= 0 ? 1 : -1, bot = out.map(([x, y]) => W(x, y, z)), top = out.map(([x, y]) => W(x, y, z + t));
      all.push(...bot, ...top);
      for (let i = 0; i < n; i++){
        const j = (i + 1) % n, ex = out[j][0] - out[i][0], ey = out[j][1] - out[i][1], nn = norm([ey * sgn, -ex * sgn, 0]);
        if (vis(nn)) sides.push(shape([bot[i], bot[j], top[j], top[i]], tone(nn, m), .8));
      }
      tops.push(shape(top, tone([0, 0, 1], m), 1));
    }
    return { box: SD.bbox(all), svg: sides.join('') + tops.join('') };
  }
  SD.slab = slab;

  function ducts(F, ctx){
    const d = F.ducts, items = [], m = SD.mat((F.colors && F.colors.duct) || 'pal'), N = 16;
    for (const mo of ctx.craft.motors){
      const r0 = d.r, r1 = d.r + (d.t || 1.4), z0 = d.z || 0, z1 = z0 + d.h;
      for (let i = 0; i < N; i++){
        const a0 = i / N * 2 * Math.PI, a1 = (i + 1) / N * 2 * Math.PI, am = (a0 + a1) / 2;
        const p = (r, a, z) => W(mo.x + r * Math.cos(a), mo.y + r * Math.sin(a), z);
        const out = [p(r1, a0, z0), p(r1, a1, z0), p(r1, a1, z1), p(r1, a0, z1)], inn = [p(r0, a0, z0), p(r0, a1, z0), p(r0, a1, z1), p(r0, a0, z1)];
        const no = [Math.cos(am), Math.sin(am), 0], ni = no.map(v => -v);
        let s = '';
        if (vis(ni)) s += shape(inn, toneI(ni, m), .7);
        if (vis(no)) s += shape(out, tone(no, m), .7);
        s += shape([p(r0, a0, z1), p(r0, a1, z1), p(r1, a1, z1), p(r1, a0, z1)], tone([0, 0, 1], m), .7);
        items.push({ box: SD.bbox([...out, ...inn]), svg: s });
      }
      ctx.shadows.push(circ(mo.x, mo.y, r1, 12).map(([x, y]) => W(x, y, z1)));
    }
    return items;
  }

  function gear(F){
    const G = F.gear, items = [], c = (F.colors && F.colors.gear) || 'carbon', h = G.h, span = G.span || F.plate.w * 1.6, L = G.l || F.plate.l * 1.1, r = (G.w || 6) / 2;
    if (G.kind === 'skids'){
      for (const s of [-1, 1]){
        items.push(...g.rod([-L / 2, s * span / 2, r], [L / 2, s * span / 2, r], r, c, 14));
        for (const x of [-L * .28, L * .28]) items.push(...g.rod([x, s * span / 2, r * 2], [x * .7, s * F.plate.w * .38, h], r * .8, c, 10));
      }
    } else {
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) items.push(...g.rod([sx * L * .45, sy * span / 2, 0], [sx * F.plate.l * .3, sy * F.plate.w * .35, h], r, c, 10));
    }
    return items;
  }

  function wing(F, ctx){
    const Wg = F.wing, items = [], m = (F.colors && F.colors.frame) || 'foam';
    const pieces = Array.isArray(Wg.planform[0][0]) ? Wg.planform : [Wg.planform];
    for (const pc of pieces) for (const s of [1, -1]){
      const out = pc.map(([x, y]) => [x, y * s]);
      items.push(g.plate(s > 0 ? out : out.slice().reverse(), Wg.z || 0, Wg.t || 8, m));
    }
    if (Wg.pod) { const p = Wg.pod; items.push(g.box(p.x - p.l / 2, -p.w / 2, Wg.z || 0, p.x + p.l / 2, p.w / 2, (Wg.z || 0) + p.h, (F.colors && F.colors.plate) || 'pal')); }
    for (const bm of [].concat(Wg.boom || [])) items.push(...g.rod(bm.from, bm.to, bm.r || 4, bm.color || 'carbon', 14));
    return items;
  }

  SD.kinds.frame = (pc, ctx) => {
    const F = ctx.craft.frame;
    if (F.layout === 'wing' || F.layout === 'vtol') { const its = wing(F, ctx); return F.gear ? its.concat(gear(F)) : its; }
    const items = [], t = F.arm.t, z = F.plate.z != null ? F.plate.z : (F.gear ? F.gear.h : 0);
    const m = SD.mat(pc.color || (F.colors && F.colors.frame) || 'carbon');
    const pieces = [], padR = F.arm.pad || F.arm.w * 1.05;
    for (const mo of ctx.craft.motors){
      const from = F.arm.from || 0, ux = Math.cos(mo.ang), uy = Math.sin(mo.ang);
      pieces.push(armRect(ux * from, uy * from, mo.x, mo.y, F.arm.w));
      pieces.push(circ(mo.x, mo.y, padR, 12));
    }
    pieces.push(rrect(F.plate.l, F.plate.w, F.plate.r != null ? F.plate.r : 6));
    items.push(slab(pieces, z, t, m));
    // the carbon weave reads as a faint diagonal sheen on the top faces
    for (const mo of ctx.craft.motors){
      const a = W(mo.x * .25, mo.y * .25, z + t), b = W(mo.x * .82, mo.y * .82, z + t);
      items[0].svg += `<path d="${pd([a, b], false)}" stroke="#8d8882" stroke-width=".5" fill="none" opacity=".7"/>`;
      items[0].svg += g.disc(mo.x, mo.y, z + t + .01, 4.2, '#3a3734', 10, .4);
      ctx.shadows.push(armRect(mo.x * .1, mo.y * .1, mo.x, mo.y, F.arm.w).map(([x, y]) => W(x, y, z + t)));
    }
    ctx.shadows.push(rrect(F.plate.l, F.plate.w, 6, 2).map(([x, y]) => W(x, y, z + t)));
    if (F.ducts) items.push(...ducts(F, ctx));
    if (F.gear) items.push(...gear(F));
    if (F.wing) items.push(...wing(F, ctx));
    return items;
  };
})();
