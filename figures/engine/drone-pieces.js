/* SimLab drone engine: piece drawings (docs/FIGURES-DRONE.md §7), the bench mat, the smoke stopper and the
   overlays (motor-test arrows, smoke, see-through current flow). Craft-local millimetres through SL.drone.g. */
(() => {
  const SD = SL.drone, g = SD.g, W = SD.W, K = SD.kinds;
  const TAU = Math.PI * 2;
  const frameTop = c => {
    const F = c.frame;
    if (F.motorZ != null) return F.motorZ;
    if (!F.arm || !F.plate) return F.wing ? (F.wing.z || 0) + (F.wing.t || 8) : 0;
    return (F.plate.z != null ? F.plate.z : (F.gear ? F.gear.h : 0)) + F.arm.t;
  };
  SD.motorZ = frameTop;
  const motorH = d => 3 + d.motor.bell[1];
  // a motor's own frame: offsets (a, b) across the shaft and h along it, from the mount face. tilt (deg) turns the
  // shaft from straight up towards the nose: 90 is a tractor motor, -90 a pusher, in between a tilt-rotor.
  const motorFrame = (mo, z0) => {
    const t = (mo.tilt || 0) * Math.PI / 180, c = Math.cos(t), s = Math.sin(t), zm = mo.z != null ? mo.z : z0;
    return (a, b, h) => [mo.x + a * c + h * s, mo.y + b, zm - a * s + h * c];
  };
  SD.motorFrame = motorFrame;

  function tiltedMotor(mo, i, ctx, z0, bell, base, propsOn){
    const d = ctx.design, R = d.motor.bell[0] / 2, hb = d.motor.bell[1], Mf = motorFrame(mo, z0), k = ctx.k, out = [];
    const q0 = Mf(0, 0, 0), q1 = Mf(0, 0, 1), axis = [q1[0] - q0[0], q1[1] - q0[1], q1[2] - q0[2]];
    out.push(...g.rod(Mf(0, 0, 0), Mf(0, 0, 3), R - .8, base, 99, 18));
    if (k > 0){ const sz = 3 + Math.max(1, (hb - d.motor.stator[1]) / 2); out.push(...g.rod(Mf(0, 0, sz), Mf(0, 0, sz + d.motor.stator[1]), d.motor.stator[0] / 2, 'copper', 99, 16)); }
    const bl = g.rod(Mf(0, 0, 3), Mf(0, 0, 3 + hb), R, bell, 99, 22)[0];
    if (k > 0) bl.svg = `<g opacity="${(1 - .62 * k).toFixed(3)}">${bl.svg}</g>`;
    const zt = 3 + hb, a = ctx.spin[i] || 0;
    if (vis(axis)) for (let j = 0; j < 3; j++){
      const aa = a + j * TAU / 3, p0 = W(...Mf(3.5 * Math.cos(aa), 3.5 * Math.sin(aa), zt + .05)), p1 = W(...Mf((R - 2.4) * Math.cos(aa), (R - 2.4) * Math.sin(aa), zt + .05));
      bl.svg += `<path d="${pd([p0, p1], false)}" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`;
    }
    out.push(bl);
    if (!propsOn) out.push(...g.rod(Mf(0, 0, zt), Mf(0, 0, zt + 7), 2.5, 'metal', 99, 10));
    return out;
  }

  K.motors = (pc, ctx) => {
    const items = [], d = ctx.design, R = d.motor.bell[0] / 2, zMount = frameTop(ctx.craft), hb = d.motor.bell[1];
    let z0 = zMount;
    const k = ctx.k, bell = SD.mat(pc.color || 'pal'), base = SD.mat(pc.base || 'dark');
    const propsOn = SD.isOn(ctx.st, 'PROPS') || (ctx.st.placed.PROPS && !ctx.st.placed.PROPS.leave);
    ctx.craft.motors.forEach((mo, i) => {
      if (mo.tilt) { items.push(...tiltedMotor(mo, i, ctx, z0, bell, base, propsOn)); return; }
      if (mo.z != null) z0 = mo.z; else z0 = zMount;
      let s = g.cyl(mo.x, mo.y, z0, z0 + 3, R - .8, base, 18).svg;
      if (k > 0){
        const sr = d.motor.stator[0] / 2, sz = z0 + 3 + Math.max(1, (hb - d.motor.stator[1]) / 2);
        s += g.cyl(mo.x, mo.y, sz, sz + d.motor.stator[1], sr, 'copper', 16).svg;
      }
      const bellSvg = g.cyl(mo.x, mo.y, z0 + 3, z0 + 3 + hb, R, bell, 22, 1.1).svg;
      s += k > 0 ? `<g opacity="${(1 - .62 * k).toFixed(3)}">${bellSvg}</g>` : bellSvg;
      const zt = z0 + 3 + hb, a = ctx.spin[i] || 0;
      for (let j = 0; j < 3; j++){
        const aa = a + j * TAU / 3, p0 = W(mo.x + 3.5 * Math.cos(aa), mo.y + 3.5 * Math.sin(aa), zt), p1 = W(mo.x + (R - 2.4) * Math.cos(aa), mo.y + (R - 2.4) * Math.sin(aa), zt);
        s += `<path d="${pd([p0, p1], false)}" stroke="${INK}" stroke-width="1.6" stroke-linecap="round" fill="none"/>`;
      }
      s += g.disc(mo.x, mo.y, zt + .01, 3.2, 'metal', 10, .6);
      items.push({ box: SD.bbox([W(mo.x - R, mo.y - R, z0), W(mo.x + R, mo.y + R, zt)]), svg: s });
      if (!propsOn) items.push(g.cyl(mo.x, mo.y, zt, zt + 7, 2.5, 'metal', 10, .8));
      ctx.shadows.push(SD.circ(mo.x, mo.y, R, 10).map(([x, y]) => W(x, y, zt)));
    });
    return items;
  };

  K.props = (pc, ctx) => {
    const items = [], d = ctx.design, R = d.prop.d * 25.4 / 2, hp = motorH(d), col = SD.colOf(d.prop.color || '#3fa8d8');
    const swapped = ctx.part.id === 'PROPS' && ctx.orient === 1, z0 = frameTop(ctx.craft);
    ctx.craft.motors.forEach((mo, i) => {
      const rpm = ctx.rpm[i] || 0, a0 = ctx.spin[i] || 0, Mf = motorFrame(mo, z0), hb = hp + 2.5;
      if (rpm > .12){
        const ring = Array.from({ length: 28 }, (_, j) => { const a = j / 28 * TAU; return W(...Mf(R * Math.cos(a), R * Math.sin(a), hb)); });
        items.push({ box: SD.bbox(ring, 1), svg: `<path d="${pd(ring)}" fill="${col}" opacity="${(.18 + .22 * rpm).toFixed(3)}" stroke="${INK}" stroke-width=".6"/>` });
      } else {
        // leading edge raised: CW props lead toward decreasing angle; swapped props are mirrored (they push air up)
        const lead = (mo.dir === 'CW' ? -1 : 1) * (swapped ? -1 : 1), r0 = 6, n = 6;
        for (let b = 0; b < d.prop.blades; b++){
          const th = a0 + b * TAU / d.prop.blades, ux = Math.cos(th), uy = Math.sin(th), tx = -uy, ty = ux;
          const edge = side => Array.from({ length: n + 1 }, (_, j) => {
            const u = j / n, r = r0 + (R - r0) * u, ch = (R * .17) * (.55 + .7 * Math.sin(Math.PI * Math.min(1, u * 1.15)) ) * (1 - .55 * u) + 1.6;
            const off = side * ch * (side * lead > 0 ? .62 : .38), h = hb + side * lead * (1.4 - .9 * u);
            return Mf(ux * r + tx * off, uy * r + ty * off, h);
          });
          const pts = [...edge(1), ...edge(-1).reverse()].map(p => W(...p));
          items.push({ box: SD.bbox(pts, .3), svg: `<path d="${pd(pts)}" fill="${col}" stroke="${INK}" stroke-width=".8" stroke-linejoin="round"/>`
            + `<path d="${pd(edge(lead > 0 ? 1 : -1).map(p => W(...p)), false)}" fill="none" stroke="${mix(col, '#ffffff', .55)}" stroke-width=".5"/>` });
        }
      }
      const hubCol = d.prop.color && /^#/.test(d.prop.color) ? d.prop.color : 'cobalt';
      if (mo.tilt) items.push(...g.rod(Mf(0, 0, hp), Mf(0, 0, hp + 5.5), 6, hubCol, 99, 14), ...g.rod(Mf(0, 0, hp + 5.5), Mf(0, 0, hp + 10), 4.2, 'metal', 99, 6));
      else {
        const zp = Mf(0, 0, hp)[2], hub = g.cyl(mo.x, mo.y, zp, zp + 5.5, 6, hubCol, 14);
        hub.svg += g.cyl(mo.x, mo.y, zp + 5.5, zp + 10, 4.2, 'metal', 6, .8).svg;
        hub.box = SD.bbox([W(mo.x - 6, mo.y - 6, zp), W(mo.x + 6, mo.y + 6, zp + 10)]);
        items.push(hub);
      }
    });
    return items;
  };

  K.wires = (pc, ctx) => {
    const items = [], d = ctx.design, zArm = frameTop(ctx.craft), Rm = d.motor.bell[0] / 2;
    const col = pc.color || '#33302c';
    ctx.craft.motors.forEach((mo, i) => {
      const ux = Math.cos(mo.ang), uy = Math.sin(mo.ang), px = -uy, py = ux;
      let start, zTop;
      if (pc.from === 'arm') { const al = pc.along || .5; start = [mo.x * al, mo.y * al]; zTop = zArm + (pc.h || 6); }
      else { const c = pc.from, pr = pc.padR || 17; start = [c[0] + ux * pr, c[1] + uy * pr]; zTop = c[2]; }
      const out = pc.from === 'arm' ? 1.5 : (pc.edge || 6);
      const end = mo.r - Rm - 1;
      for (const o of [-1.9, 0, 1.9]){
        const pts = [[start[0] + px * o, start[1] + py * o, zTop + .9], [start[0] + ux * out + px * o, start[1] + uy * out + py * o, zTop + .9],
          [start[0] + ux * (out + 4) + px * o, start[1] + uy * (out + 4) + py * o, zArm + 1], [ux * end + px * o, uy * end + py * o, zArm + 1]];
        items.push(...g.wire(pts, col, 1.5));
        if (i === 0 && o === 0) ctx.wireAt = pts;
        ctx.flows.push({ kind: 'phase', motor: i, pts: pts.map(p => W(...p)) });
      }
    });
    return items;
  };

  K.board = (pc, ctx) => {
    const [x, y, z] = pc.at, [l, w] = pc.size, t = pc.t || 1.6, top = z + t, items = [];
    const it = g.box(x - l / 2, y - w / 2, z, x + l / 2, y + w / 2, top, pc.color || 'pcbBlue', .9);
    let s = it.svg, zMax = top;
    if (pc.holes){ const hh = pc.holes / 2; for (const sx of [-1, 1]) for (const sy of [-1, 1]) s += g.disc(x + sx * hh, y + sy * hh, top + .01, 1.9, '#d8c27a', 10, .4) + g.disc(x + sx * hh, y + sy * hh, top + .02, 1.1, '#2a2622', 8, .3); }
    for (const ch of pc.chips || []){
      const [cx, cy] = ch.at, [cl, cw, chh] = ch.size, zz = top + (chh || 1);
      s += g.box(x + cx - cl / 2, y + cy - cw / 2, top, x + cx + cl / 2, y + cy + cw / 2, zz, ch.color || 'black', .6).svg;
      if (ch.label) s += g.text(x + cx, y + cy, zz + .02, ch.label, Math.min(cl, cw) * .28, '#d9d3c6');
      zMax = Math.max(zMax, zz);
    }
    if (pc.fets){
      const n = pc.fets, per = Math.ceil(n / 4), hl = l / 2 - 5, hw = w / 2 - 5;
      let k = 0;
      for (const [sx, sy] of [[1, 1], [1, -1], [-1, -1], [-1, 1]]) for (let j = 0; j < per && k < n; j++, k++){
        const fx = x + sx * (hl - 2), fy = y + sy * (hw - 3 - j * 6.2);
        s += g.box(fx - 2.6, fy - 2.4, top, fx + 2.6, fy + 2.4, top + 1.1, 'black', .5).svg;
      }
      zMax = Math.max(zMax, top + 1.1);
    }
    if (pc.pads) for (const p of pc.pads) s += g.box(x + p.at[0] - p.size[0] / 2, y + p.at[1] - p.size[1] / 2, top, x + p.at[0] + p.size[0] / 2, y + p.at[1] + p.size[1] / 2, top + .3, 'copper', .4).svg;
    if (pc.arrow) s += g.arrow(x + (pc.arrowAt ? pc.arrowAt[0] : 0), y + (pc.arrowAt ? pc.arrowAt[1] : 0), zMax + .05, Math.min(l, w) * .32, ctx.orient === 1 && ctx.part.polar ? -1 : 1);
    if (pc.label) s += g.text(x + (pc.labelAt ? pc.labelAt[0] : 0), y + (pc.labelAt ? pc.labelAt[1] : -w * .3), top + .05, pc.label, Math.min(l, w) * .1, '#f2efe7');
    if (pc.led) s += g.led(x + (pc.ledAt ? pc.ledAt[0] : -l * .3), y + (pc.ledAt ? pc.ledAt[1] : w * .32), top + .6, pc.led, ctx.powered && !(ctx.testing === 'calibrate' && Math.sin(ctx.t * 20) < 0));
    it.svg = s; it.box = SD.bbox([W(x - l / 2, y - w / 2, z), W(x + l / 2, y + w / 2, zMax)]);
    items.push(it);
    if (pc.usb){ const [ux, uy] = pc.usb; items.push(g.box(x + ux - 4.5, y + uy - 3.6, top, x + ux + 4.5, y + uy + 3.6, top + 3.2, 'metal', .6)); }
    if (ctx.part.id === 'FC') ctx.fcAt = W(x, y, zMax + 1);
    return items;
  };

  function antenna(a, ctx){
    const at = a.at, L = a.len || 30, dir = SD.normd(a.dir || [0, 0, 1]), r = a.r || .9, col = a.color || 'black', items = [];
    const end = [at[0] + dir[0] * L, at[1] + dir[1] * L, at[2] + dir[2] * L];
    const type = a.type || 'whip';
    if (type === 'v' || type === 't'){
      const spread = a.spread || 45, side = SD.normd([-dir[1], dir[0], 0]);
      for (const s of [-1, 1]){
        const c = Math.cos(spread * Math.PI / 180), si = Math.sin(spread * Math.PI / 180);
        const dd = SD.normd([dir[0] * c + side[0] * s * si, dir[1] * c + side[1] * s * si, dir[2] * c + side[2] * s * si]);
        const e = [at[0] + dd[0] * L, at[1] + dd[1] * L, at[2] + dd[2] * L], m = SD.lerp3(at, e, .55);
        items.push(...g.wire([at, m], '#2c2926', 1.3), ...g.rod(m, e, 1.1, 'white', 10, 6));
      }
      return items;
    }
    items.push(...g.rod(at, end, r, col, 10, 6));
    if (type === 'lollipop' || type === 'patch'){
      const hr = a.head || 8, c = SD.lerp3(at, end, 1);
      items.push(g.cyl(c[0], c[1], c[2] - 2.2, c[2] + 2.2, hr, a.headColor || 'pal', 16));
    } else if (type === 'stubby') items.push(g.cyl(end[0], end[1], end[2], end[2] + 6, 3, col, 10));
    else items.push(g.cyl(end[0], end[1], end[2] - .5, end[2] + 1.5, r * 1.6, col, 8));
    return items;
  }
  SD.normd = v => { const L = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / L, v[1] / L, v[2] / L]; };
  K.antenna = (pc, ctx) => antenna(pc, ctx);

  K.module = (pc, ctx) => {
    const [x, y, z] = pc.at, [l, w, h] = pc.size, items = [];
    const it = g.box(x - l / 2, y - w / 2, z, x + l / 2, y + w / 2, z + h, pc.color || 'pcbBlack', .8);
    if (pc.label) it.svg += g.text(x, y, z + h + .02, pc.label, Math.min(l, w) * (pc.labelSize || .2), pc.labelColor || '#f2efe7');
    if (pc.arrow) it.svg += g.arrow(x, y + (pc.label ? -w * .22 : 0), z + h + .03, Math.min(l, w) * .4, ctx.orient === 1 && ctx.part.polar ? -1 : 1);
    if (pc.led) it.svg += g.led(x + (pc.ledAt ? pc.ledAt[0] : l * .3), y + (pc.ledAt ? pc.ledAt[1] : w * .3), z + h + .4, pc.led, ctx.powered);
    items.push(it);
    if (pc.antenna) items.push(...antenna(pc.antenna, ctx));
    return items;
  };

  K.camera = (pc, ctx) => {
    const [x, y, z] = pc.at, s = pc.size || 19, tl = (pc.tilt || 0) * Math.PI / 180, items = [];
    const u = [Math.cos(tl), 0, Math.sin(tl)], n = [-Math.sin(tl), 0, Math.cos(tl)], v = [0, 1, 0], dpt = (pc.depth || s * 1.05) / 2;
    const body = g.oblock([x, y, z], u, v, n, dpt, s / 2, s / 2, pc.color || 'black', .9);
    items.push(body);
    const f0 = [x + u[0] * dpt, y, z + u[2] * dpt], lr = pc.lens || s * .36, f1 = [f0[0] + u[0] * 7, y, f0[2] + u[2] * 7];
    items.push(...g.rod(f0, f1, lr, 'black', 8, 14));
    const [X, Y] = SD.Pb(f1[0] + u[0] * .1, y, f1[2] + u[2] * .1), [X2] = SD.Pb(f1[0], y + lr * .55, f1[2]);
    const ry = Math.abs(X2 - X) || lr * .5;
    items.push({ box: SD.bbox([W(f1[0], y - lr, f1[2] - lr), W(f1[0] + 1, y + lr, f1[2] + lr)]), svg: vis(u) ? `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(ry)}" fill="#5f88b8" stroke="${INK}" stroke-width=".6" opacity=".9"/><circle cx="${f(X - ry * .25)}" cy="${f(Y - ry * .25)}" r="${f(ry * .28)}" fill="#ffffff" opacity=".7"/>` : '' });
    if (pc.plates){
      const p = pc.plates, gap = p.gap || 1, L = p.l || s * 1.3, zb = p.z != null ? p.z : frameTop(ctx.craft), hh = p.h || s * 1.4, th = p.t || 2.5;
      for (const sy of [-1, 1]){
        const y0 = y + sy * (s / 2 + gap), y1 = y0 + sy * th;
        items.push(g.box(x - L / 2, Math.min(y0, y1), zb, x + L / 2, Math.max(y0, y1), zb + hh, p.color || 'pal', .9));
      }
    }
    return items;
  };

  K.xt60 = (pc, ctx) => {
    const items = [], [x, y, z] = pc.at, ax = pc.dir || [-1, 0, 0], st = ctx.st, rev = ctx.orient === 1, fault = st.fault === 'XT60';
    // XT60: about 16 mm long, 15.5 mm wide, 8 mm thick; pc.size [l, w, h] for another housing (an XT90 is 21 x 26 x 11)
    const [sl, sw, sh] = pc.size || [16, 15.5, 8], hx = Math.abs(ax[0]) > .5 ? sl / 2 : sw / 2, hy = Math.abs(ax[0]) > .5 ? sw / 2 : sl / 2;
    items.push(g.box(x - hx, y - hy, z - sh / 2, x + hx, y + hy, z + sh / 2, 'yellow', .9));
    const lead = pc.lead || [];
    if (lead.length > 1){
      const a = lead[0], b = lead[lead.length - 1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ox = -dy / L * 2.6, oy = dx / L * 2.6;
      const plus = lead.map(p => [p[0] + ox, p[1] + oy, p[2]]), minus = lead.map(p => [p[0] - ox, p[1] - oy, p[2]]);
      items.push(...g.wire(plus, '#d8473a', 3.2), ...g.wire(minus, '#2c2926', 3.2));
      ctx.flows.push({ kind: 'power', pts: plus.slice().reverse().map(p => W(...p)) }, { kind: 'power', pts: minus.map(p => W(...p)) });
      ctx.leadPlus = plus; ctx.leadMinus = minus;
    }
    ctx.xt60At = [x, y, z]; ctx.xt60Size = [sl, sw, sh];
    if (pc.cap){
      const c = pc.cap, d = SD.normd(c.dir || [1, 0, 0]), r = c.r || 5, L = c.l || 20;
      const a = c.at, b = [a[0] + d[0] * L, a[1] + d[1] * L, a[2] + d[2] * L];
      const body = fault ? '#7a6a5a' : (c.color || '#3a5fa8');
      items.push(...g.rod(a, b, r, body, 7, 14));
      // the white stripe marks the minus leg: c.stripe is its side (an xy direction) when fitted right; the mistake flips it
      const sv = SD.normd(c.stripe || [0, 1, 0]), side = rev ? sv.map(v => -v) : sv, perp = SD.normd([-d[1], d[0], 0]);
      const ang = 0.75, nrm = SD.normd([side[0] * Math.cos(ang), side[1] * Math.cos(ang), Math.sin(ang)]);
      const off = (s, t) => { const q = [a[0] + d[0] * L * t, a[1] + d[1] * L * t, a[2] + d[2] * L * t]; return W(q[0] + nrm[0] * (r + .15) + perp[0] * s, q[1] + nrm[1] * (r + .15) + perp[1] * s, q[2] + nrm[2] * (r + .15)); };
      if (vis(nrm)) items.push({ box: SD.bbox([off(-1.4, .05), off(1.4, .95)], .5), svg: `<path d="${pd([off(-1.3, .06), off(-1.3, .94), off(1.3, .94), off(1.3, .06)])}" fill="${fault ? '#a69a8a' : '#f2efe7'}" stroke="${INK}" stroke-width=".35"/>` });
      if (fault) items.push(g.cyl(b[0], b[1], b[2] - 1, b[2] + 1.6, r * .7, '#5a4c40', 10));
      ctx.capAt = W(...b);
      if (c.leads) for (const [i, pts] of c.leads.entries()) items.push(...g.wire(pts, i === 0 ? '#c9c4b8' : '#c9c4b8', .9));
    }
    return items;
  };

  K.standoffs = (pc, ctx) => {
    const items = [], r = pc.r || 2.5, step = pc.split || 9;
    for (const [x, y] of pc.at){
      const n = Math.max(1, Math.ceil((pc.z1 - pc.z0) / step));
      for (let i = 0; i < n; i++){ const a = pc.z0 + (pc.z1 - pc.z0) * i / n, b = pc.z0 + (pc.z1 - pc.z0) * (i + 1) / n; items.push(g.cyl(x, y, a, b, r, pc.color || 'alu', 10, .8)); }
    }
    return items;
  };

  K.plate = (pc, ctx) => {
    const outs = pc.outline ? (Array.isArray(pc.outline[0][0]) ? pc.outline : [pc.outline]) : [SD.rrect(pc.l, pc.w, pc.r != null ? pc.r : 5)];
    const m = SD.mat(pc.color || 'carbon');
    const shift = outs.map(o => o.map(([x, y]) => [x + (pc.at ? pc.at[0] : 0), y + (pc.at ? pc.at[1] : 0)]));
    const it = SD.slab(shift, pc.z, pc.t || 2, m);
    if (pc.label) it.svg += g.text(pc.at ? pc.at[0] : 0, pc.at ? pc.at[1] : 0, pc.z + (pc.t || 2) + .05, pc.label, 5, '#8d8882');
    return [it];
  };

  K.battery = (pc, ctx) => {
    const b = ctx.design.batt, [l, w, h] = b.size, [x, y, z0] = pc.at, items = [], col = b.color || '#2b2a28';
    const zp = z0 + (pc.pad !== false ? 1.5 : 0);
    if (pc.pad !== false) items.push(g.box(x - l * .42, y - w * .45, z0, x + l * .42, y + w * .45, zp, '#8a8580', .6));
    const it = g.box(x - l / 2, y - w / 2, zp, x + l / 2, y + w / 2, zp + h, col, 1.1);
    it.svg += g.text(x - l * .3, y, zp + h + .05, b.label || '', Math.min(w * .2, 7), '#f2efe7');
    it.svg += g.text(x + l * .29, y, zp + h + .05, CF_T('{v} V', { v: (b.cells * 3.7).toFixed(1) }), Math.min(w * .2, 6), '#e2b33a');
    items.push(it);
    if (pc.strap !== false){
      const sw = pc.strapW || 16, sc = pc.strapColor || '#5b6478', zs = pc.strapZ != null ? pc.strapZ : z0;
      items.push(g.box(x - sw / 2, y - w / 2 - 1, zp + h, x + sw / 2, y + w / 2 + 1, zp + h + 1, sc, .7));
      for (const s of [-1, 1]) items.push(g.box(x - sw / 2, s > 0 ? y + w / 2 : y - w / 2 - 1, zs, x + sw / 2, s > 0 ? y + w / 2 + 1 : y - w / 2, zp + h, sc, .7));
      const tab = SD.mat('pal');
      items.push(g.box(x - sw / 2, y - w / 2 - 1.2, zp + h * .55, x + sw / 2, y - w / 2 - .2, zp + h + .9, tab, .6));
    }
    if (ctx.st.plugged && ctx.xt60At){
      // the pack's own plug mates with the craft's connector, so it takes that housing's size (k = 1 for an XT60)
      const t = ctx.xt60At, [, cw, ch] = ctx.xt60Size || [16, 15.5, 8], k = cw / 15.5, from = [x - l / 2 - 1, y + 3, zp + h * .7];
      const mid = [Math.min(from[0], t[0]) - 6, (from[1] + t[1]) / 2, (from[2] + t[2]) / 2 + 4], plug = [t[0] - 10 * k, t[1], t[2]];
      items.push(...g.wire([from, mid, [plug[0] - 6 * k, plug[1] + 2.6 * k, plug[2]]], '#d8473a', 3), ...g.wire([[from[0], from[1] - 5, from[2]], [mid[0], mid[1] - 5, mid[2]], [plug[0] - 6 * k, plug[1] - 2.6 * k, plug[2]]], '#2c2926', 3));
      items.push(g.box(plug[0] - 6 * k, plug[1] - cw / 2, plug[2] - ch / 2, plug[0] + 2 * k, plug[1] + cw / 2, plug[2] + ch / 2, pc.plugColor || 'yellow', .9));
    }
    ctx.shadows.push([[x - l / 2, y - w / 2], [x + l / 2, y - w / 2], [x + l / 2, y + w / 2], [x - l / 2, y + w / 2]].map(([a, bb]) => W(a, bb, zp + h)));
    return items;
  };

  K.cyl = (pc, ctx) => {
    const [x, y, z] = pc.at;
    if (pc.axis && pc.axis !== 'z'){ const d = pc.axis === 'x' ? [1, 0, 0] : [0, 1, 0]; return g.rod([x - d[0] * pc.h / 2, y - d[1] * pc.h / 2, z + pc.r], [x + d[0] * pc.h / 2, y + d[1] * pc.h / 2, z + pc.r], pc.r, pc.color || 'pal', pc.h + 1, 18); }
    return [g.cyl(x, y, z, z + pc.h, pc.r, pc.color || 'pal', 20)];
  };
  K.box = (pc, ctx) => { const [x, y, z] = pc.at, [l, w, h] = pc.size; return [g.box(x - l / 2, y - w / 2, z, x + l / 2, y + w / 2, z + h, pc.color || 'pal')]; };
  K.custom = (pc, ctx) => { try { return [].concat(pc.draw(ctx) || []); } catch (e) { CF_NOTE('drone: custom piece ' + ctx.part.id + ': ' + e.message); return []; } };

  // the smoke stopper: a box on the mat with a lamp, its lead running to the craft's XT60
  K._stopper = ctx => {
    const c = ctx.craft, M = c.mat, at = (c.tests.smoke && c.tests.smoke.at) || [-M * .1, M * .4], u = M / 280, items = [], t = ctx.st.test;
    const [x, y] = at, hx = 15 * u, hy = 9 * u, h = 12 * u;
    SD.G.dz = 0;
    const bx = g.box(x - hx, y - hy, 0, x + hx, y + hy, h, 'dark', 1);
    const lit = t && (t.short ? true : Math.sin(t.t * 12) > 0), col = t && t.short ? '#e2483d' : '#f5a13a';
    const [X, Y] = SD.Pb(x, y, h + 4 * u);
    bx.svg += g.cyl(x, y, h, h + 6 * u, 4 * u, 'clear', 12).svg;
    if (lit) bx.svg += `<circle cx="${f(X)}" cy="${f(Y)}" r="${f((t.short ? 16 : 7) * u)}" fill="${col}" opacity=".55"/><circle cx="${f(X)}" cy="${f(Y)}" r="${f(3 * u)}" fill="${col}"/>`;
    bx.svg += g.text(x + hx * .25, y, h + .05, 'STOP', 4.2 * u, '#f2efe7', 'y');
    bx.box = SD.bbox([W(x - hx, y - hy, 0), W(x + hx, y + hy, h + 6 * u)]);
    items.push(bx);
    const to = ctx.xt60At || [0, 0, 8];
    items.push(...g.wire([[x, y - hy, 3], [x, y - hy - 10, 1.5], [to[0] - 18, to[1] + 10, 1.5], [to[0] - 10, to[1], to[2]]], '#d8473a', 2.2));
    return items;
  };

  SD.matSvg = ctx => {
    const M = ctx.mat, MT = 4;
    let s = board(0, 0, M, M, MT, 8, matOf('#d5dccb'));
    for (let v = 40; v < M; v += 40){
      s += `<path d="${pd([[v, 3, MT], [v, M - 3, MT]], false)}" stroke="#f7f5ee" stroke-width=".7" fill="none" opacity=".5"/>`;
      s += `<path d="${pd([[3, v, MT], [M - 3, v, MT]], false)}" stroke="#f7f5ee" stroke-width=".7" fill="none" opacity=".5"/>`;
    }
    return s;
  };

  // drawn over the sorted scene: the motor-test arrow and pill, smoke, calibration pulse, see-through current flow
  function pill(X, Y, text, fill, fg = INK){
    const fs = 8.6 * INK_K, h = fs * 1.8, w = CF_TW(text, fs) + fs * 1.5;
    return `<g class="dpill"><rect x="${f(X - w / 2)}" y="${f(Y - h / 2)}" width="${f(w)}" height="${f(h)}" rx="${f(h / 2)}" fill="${fill}" stroke="${INK}" stroke-width="1.2"/>`
      + `<text x="${f(X)}" y="${f(Y + fs * .36)}" font-size="${f(fs)}" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-weight="800" letter-spacing=".04em" fill="${fg}">${CF_ESC(text)}</text></g>`;
  }
  SD.overlays = ctx => {
    let s = '';
    const st = ctx.st, c = ctx.craft, t = st.test, G = SD.G;
    G.dz = 0;
    if (t && t.kind === 'motors' && t.cur >= 0){
      const mo = c.motors[t.cur], wrong = t.wrong === t.cur, dirShown = wrong ? (mo.dir === 'CW' ? 'CCW' : 'CW') : mo.dir;
      const Mf = motorFrame(mo, frameTop(c)), hz = motorH(ctx.design) + (c.arrowZ || 14), R = 22 * c.mat / 280, sgn = dirShown === 'CW' ? -1 : 1;
      const a0 = (st.spin[t.cur] || 0) * .15, pts = Array.from({ length: 33 }, (_, i) => { const a = a0 + sgn * i / 32 * (288 / 360) * Math.PI * 2; return W(...Mf(R * Math.cos(a), R * Math.sin(a), hz)); });
      const col = wrong ? '#e2483d' : '#2f7d4f';
      s += `<path d="${pd(pts, false)}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linecap="round"/>`;
      const e = P(...pts[32]), e2 = P(...pts[29]), ang = Math.atan2(e[1] - e2[1], e[0] - e2[0]), hs = 6 * INK_K;
      s += `<path d="M${f(e[0] + Math.cos(ang) * hs)} ${f(e[1] + Math.sin(ang) * hs)}L${f(e[0] + Math.cos(ang + 2.4) * hs)} ${f(e[1] + Math.sin(ang + 2.4) * hs)}L${f(e[0] + Math.cos(ang - 2.4) * hs)} ${f(e[1] + Math.sin(ang - 2.4) * hs)}Z" fill="${col}" stroke="${INK}" stroke-width=".6"/>`;
      const [X, Y] = P(...W(...Mf(0, 0, hz + 10)));
      s += pill(X, Y - 14 * INK_K, `${mo.id} ${dirShown}${wrong ? ' ' + CF_T('WRONG') : ''}`, wrong ? '#e2483d' : '#fff4d6', wrong ? '#ffffff' : INK);
    }
    if (t && t.kind === 'calibrate' && ctx.fcAt){
      const [X, Y] = P(...ctx.fcAt), r = (6 + 18 * (t.t / t.dur)) * INK_K;
      s += `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(r)}" fill="none" stroke="#2f7d4f" stroke-width="1.4" opacity="${(1 - t.t / t.dur).toFixed(2)}"/>`;
      s += pill(X, Y - 26 * INK_K, CF_T('LEVEL 0.0 / 0.0'), '#fff4d6');
    }
    if (st.smoke.length && ctx.capAt){
      for (const p of st.smoke){
        const q = [ctx.capAt[0] + p.dx, ctx.capAt[1] + p.dy, ctx.capAt[2] + 30 * p.age];
        const [X, Y] = P(...q);
        s += `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(3 + 9 * p.age)}" fill="#8f8a84" opacity="${Math.max(0, .6 - .55 * p.age).toFixed(2)}"/>`;
      }
    }
    const k = ctx.k;
    if (k > .05){
      const live0 = ctx.powered, spinning = t && t.kind === 'motors' ? t.cur : -1;
      for (const fl of ctx.flows){
        const live = fl.kind === 'power' ? live0 : fl.kind === 'phase' ? fl.motor === spinning : live0;
        if (!live) continue;
        const col = { power: '#e2483d', phase: '#f08a2b', signal: '#43a35a', video: '#f2c230' }[fl.kind] || '#43a35a';
        const speed = fl.kind === 'phase' ? 60 : 34, gap = 7;
        const segs = [];
        let total = 0;
        for (let i = 0; i < fl.pts.length - 1; i++){ const L = SD.len3(fl.pts[i], fl.pts[i + 1]); segs.push([fl.pts[i], fl.pts[i + 1], total, L]); total += L; }
        for (let d = (st.t * speed) % gap; d < total; d += gap){
          const sg = segs.find(q => d >= q[2] && d <= q[2] + q[3]);
          if (!sg) continue;
          const [X, Y] = P(...SD.lerp3(sg[0], sg[1], (d - sg[2]) / (sg[3] || 1)));
          s += `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(1.5 * INK_K)}" fill="${col}" stroke="${INK}" stroke-width=".4" opacity="${k.toFixed(2)}"/>`;
        }
      }
    }
    return s;
  };
})();
