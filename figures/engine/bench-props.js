/* Lesson props: the scenery a lesson's world inputs name (FIGURES-BENCH §9.1). A circuit lists them as
   props: [{ id, prop, at: [x, y] board mm, aim?: part or prop id, rot?, ...params }]; each stands on the mat at `at`,
   turned to face its `aim`. They are not in the circuit: the solver never sees them. A host param `value` moves the
   world quantity the prop stands for (lux for the lamp, cm for the obstacle, °C for the dryer); without it the prop
   shows its everyday state. The UNO R3 lessons use every one:
     desk-lamp      a small anglepoise whose shade points at its aim (the LDR); value = lux, 0 is off
     hairdryer      standing on its handle, nozzle at its aim (the TMP36); value = °C at the sensor, warm air above 30
     obstacle       kind 'car' | 'box' | 'ball' | 'wall' in front of its aim (the HC-SR04); value = cm, moves it
     watering-can   spout toward its aim (the soil sensor's pot)
     strength-meter a card dial on its aim servo's case, the horn as the needle, a bell at full swing (180°)
     weights        50, 100, 200 and 500 g brass weights on cork coasters beside the FSR
   The stepper's prize wheel is the stepper part's own `wheel: 'wheel'` param, and the plant pot is the soil
   sensor's own pot (soil-moisture with `at`): neither is a prop. */
(() => {
const B = SL.bench;
const LAMP = matOf('#e2483d'), STEEL = B.M.steel, DRYER = matOf('#4fb8ad'), NOZZLE = matOf('#4a4642'), CARD = B.M.tan;
const RED = matOf('#d9483b'), GLASS = matOf('#9cc6e8'), TYRE = matOf('#2f2c29'), BALL = matOf('#e2483d'), BRICK = matOf('#b65a3c');
const CAN = matOf('#43b05c'), BRASS = B.M.gold, CORK = matOf('#c9a46e');
const clamp = B.clamp;

// the prop's own frame: x toward its aim (or along rot), y to its left, z up from the mat
const frame = ctx => {
  const o = ctx.origin, a = ctx.aim;
  let ax = null;
  if (a){ const dx = a[0] - o[0], dy = a[1] - o[1], L = Math.hypot(dx, dy); if (L > 1) ax = [dx / L, dy / L, 0]; }
  if (!ax){ const r = (+ctx.p.rot || 0) * Math.PI / 180; ax = [Math.cos(r), Math.sin(r), 0]; }
  const ay = [-ax[1], ax[0], 0];
  const W = (x, y, z) => [o[0] + ax[0] * x + ay[0] * y, o[1] + ax[1] * x + ay[1] * y, o[2] + z];
  return { W, o, ax, ay, dist: a ? Math.hypot(a[0] - o[0], a[1] - o[1]) : 40, aimZ: a ? a[2] - o[2] : 10 };
};
const ringW = (W, x, y, z, r, n = 24) => Array.from({ length: n }, (_, i) => { const q = i / n * 2 * Math.PI; return W(x + r * Math.cos(q), y + r * Math.sin(q), z); });
// a ring of radius r round centre c, square to the unit axis u
const ringAbout = (c, u, r, n = 20) => {
  const s = norm(cross(u, Math.abs(u[2]) < .9 ? [0, 0, 1] : [1, 0, 0])), t = cross(u, s);
  return Array.from({ length: n }, (_, i) => { const q = i / n * 2 * Math.PI, cq = Math.cos(q) * r, sq = Math.sin(q) * r;
    return [c[0] + s[0] * cq + t[0] * sq, c[1] + s[1] * cq + t[1] * sq, c[2] + s[2] * cq + t[2] * sq]; });
};
const along = (a, u, d) => [a[0] + u[0] * d, a[1] + u[1] * d, a[2] + u[2] * d];
const towards = (a, b) => norm(sub(b, a));
// a sphere: flat bands toward the light, an ink outline (orthographic, so its outline is a circle)
const ball = (c, r, m) => { const [X, Y] = P(...c), R = r * CAM_K;
  return `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(R)}" fill="${m.d}"/><circle cx="${f(X - R * .12)}" cy="${f(Y - R * .14)}" r="${f(R * .84)}" fill="${m.m}"/>`
    + `<circle cx="${f(X - R * .3)}" cy="${f(Y - R * .34)}" r="${f(R * .42)}" fill="${m.l}"/><circle cx="${f(X)}" cy="${f(Y)}" r="${f(R)}" fill="none" stroke="${INK}" stroke-width="1.2"/>`; };
const shadow = (pts, o) => ({ box: B.aabb(pts.map(q => [q[0], q[1], o[2]])).map((v, i) => v.map(c => c + (i ? .05 : 0))), svg: castShadow(pts, o[2]) });
// see-through fades the scenery so the circuit shows
const fade = (k, svg) => k > .02 ? `<g opacity="${f(1 - .55 * k)}">${svg}</g>` : svg;
const out = (ctx, items) => { for (const it of items) if (it.svg) ctx.put(it.box, fade(ctx.k || 0, it.svg)); };
const val = (p, d) => typeof p.value === 'number' && Number.isFinite(p.value) ? p.value : d;

B.prop('desk-lamp', {
  name: 'Desk lamp', foot: [26, 26, 58], params: { value: [0, 100000] },
  draw(ctx){
    const { W, o, dist, aimZ } = frame(ctx), lux = val(ctx.p, 300), lit = lux > 0 ? clamp(Math.log10(1 + lux) / 3, .25, 1) : 0;
    const elbow = W(-5, 0, 36), head = W(clamp(dist - 22, 6, 30), 0, 50), target = W(dist, 0, aimZ);
    const u = towards(head, target), mouth = along(head, u, 13), items = [];
    items.push(shadow([...ringW(W, 0, 0, 0, 11), ...ringW(W, 0, 0, 3, 11)], o), shadow([...ringAbout(mouth, u, 8.5, 12), along(head, u, -2)], o));
    items.push({ box: B.aabb([W(-11, -11, 0), W(11, 11, 4)]), svg: cyl(...W(0, 0, 0).slice(0, 2), o[2], o[2] + 3, 11, LAMP, toneI, 1.2, 28)
      + B.slabW(W, 4, -2.2, 7.5, 2.2, 3, 4.6, B.M.blackPl, toneI, .6) });
    items.push({ box: B.aabb([W(-3, 0, 3), elbow]).map((v, i) => v.map(c => c + (i ? 2 : -2))), svg: rod(W(-2, 0, 3), elbow, 1.4, STEEL, toneI, .9) });
    items.push({ box: B.aabb([elbow, head]).map((v, i) => v.map(c => c + (i ? 2 : -2))), svg: rod(elbow, head, 1.4, STEEL, toneI, .9)
      + rod(W(-5, -2.8, 36), W(-5, 2.8, 36), 2.2, LAMP, toneI, .8) });
    // the shade: a cone opening toward the aim, the bulb glowing in its mouth while lit
    let shade = rod(along(head, u, -2), mouth, 3.2, LAMP, toneI, 1.1, 8.5, 22);
    if (vis(u)) shade += shape(ringAbout(mouth, u, 7.8, 22), lit ? mix('#fff3c4', '#ffd36a', 1 - lit) : '#5a5550', .6);
    items.push({ box: B.aabb([...ringAbout(mouth, u, 8.5, 8), along(head, u, -3)]), svg: shade });
    if (lit){
      // the light falling on the aim: a soft cone from the mouth to a spot round the target
      const spot = ringAbout(target, u, 10, 16), cone = hull([...ringAbout(mouth, u, 7.8, 16), ...spot].map(q => P(...q)));
      items.push({ box: B.aabb([mouth, target]), svg: fill(sp(cone), '#ffe08a', `opacity="${f(.12 + .2 * lit)}"`) });
    }
    out(ctx, items);
  },
});

B.prop('hairdryer', {
  name: 'Hair dryer', foot: [50, 24, 46], params: { value: [-40, 125] },
  draw(ctx){
    const { W, o, dist, aimZ } = frame(ctx), st = ctx.st || {}, t = val(ctx.p, 22), heat = clamp((t - 30) / 50, 0, 1), items = [];
    const hub = W(-8, 0, 33), u = towards(hub, W(dist, 0, aimZ)), back = along(hub, u, -15), front = along(hub, u, 14), tip = along(front, u, 13);
    items.push(shadow([...ringW(W, -10, 0, 0, 4.6), ...ringW(W, -8, 0, 26, 4.2)], o), shadow([...ringAbout(back, u, 10, 12), ...ringAbout(tip, u, 5.5, 12)], o));
    items.push({ box: B.aabb([W(-14, -6, 0), W(-2, 6, 28)]), svg: rod(W(-10, 0, 0), W(-8, 0, 26), 4.6, DRYER, toneI, 1.1, 4.2)
      + B.slabW(W, -8.2, -1.6, -5.8, 1.6, 14, 19, B.M.white, toneI, .6) });
    // the cord leaves the foot of the handle and trails off over the mat
    const cord = [W(-12, 0, .8), W(-20, 4, .8), W(-30, 2, .8), W(-38, 8, .8)];
    for (let i = 0; i < cord.length - 1; i++) items.push({ box: B.aabb([cord[i], cord[i + 1]]).map((v, j) => v.map(c => c + (j ? 1 : -1))), svg: rod(cord[i], cord[i + 1], .9, B.M.blackPl, toneI, .6) });
    let body = rod(back, front, 10, DRYER, toneI, 1.4, 10, 26);
    // the intake grille on the back, when the back faces the viewer
    if (!vis(u)) for (const r of [3, 6, 8.6]) body += `<path d="${pd(ringAbout(back, u, r, 22))}" fill="none" stroke="${INK}" stroke-width=".6" opacity=".7"/>`;
    items.push({ box: B.aabb([...ringAbout(back, u, 10, 8), ...ringAbout(front, u, 10, 8)]), svg: body });
    items.push({ box: B.aabb([...ringAbout(front, u, 8.5, 8), ...ringAbout(tip, u, 5.5, 8)]), svg: rod(front, tip, 8.5, NOZZLE, toneI, 1.1, 5.5, 20) });
    if (heat > 0){
      // warm air: wavy streaks from the nozzle to the sensor, moving with the clock
      const ph = ((st.t || 0) * 1.6) % 1, to = W(dist, 0, aimZ), L = Math.hypot(...sub(to, tip));
      let s = '';
      for (const off of [-3.5, 0, 3.5]){
        const side = norm(cross(u, [0, 0, 1])), pts = Array.from({ length: 12 }, (_, i) => { const d = (i / 11) * L * .9;
          const w = Math.sin(i * 1.4 + ph * 6.28) * 1.6; return along(along(tip, u, d), side, off + w); });
        s += `<path d="${pd(pts, false)}" fill="none" stroke="${mix('#f08a2b', '#e2483d', heat)}" stroke-width="1.2" stroke-linecap="round" opacity="${f(.3 + .5 * heat)}"/>`;
      }
      items.push({ box: B.aabb([tip, to]), svg: s });
    }
    out(ctx, items);
  },
});

// the HC-SR04 sees 2-450 cm; on the mat that is squeezed to 0.3-2.2 times the prop's own distance (its at is 30 cm)
const obstacleShift = (p, dist) => { if (typeof p.value !== 'number') return 0; const d = clamp(dist * Math.pow(Math.max(2, p.value) / 30, .45), 12, dist * 2.2); return dist - d; };
// each kind returns its items, the first one its shadow (o is the mat point under it)
const slabShadow = (W, o, x0, y0, x1, y1, h) => shadow([[x0, y0], [x1, y0], [x1, y1], [x0, y1]].flatMap(([x, y]) => [W(x, y, 0), W(x, y, h)]), o);
const OBSTACLES = {
  box: (W, o) => [slabShadow(W, o, -13, -15, 13, 15, 24), { box: B.aabb([W(-13, -15, 0), W(13, 15, 24)]), svg: B.slabW(W, -13, -15, 13, 15, 0, 24, CARD, toneI, 1.2)
    + B.slabW(W, -13, -2, 13, 2, 24, 24.3, matOf('#d7c49a'), toneI, .4) }],
  car: (W, o) => {
    const items = [slabShadow(W, o, -10, -17, 10, 17, 18)], body = B.slabW(W, -9, -17, 9, 17, 4, 13, RED, toneI, 1.2) + B.slabW(W, -7, -8, 7, 7, 13, 20, RED, toneI, 1);
    let win = '';
    for (const s of [-1, 1]) if (vis(sub(W(s, 0, 0), W(0, 0, 0)))) win += shape([W(s * 7.05, -6.5, 14), W(s * 7.05, -1.2, 14), W(s * 7.05, -1.2, 19), W(s * 7.05, -6.5, 19)], GLASS.m, .6)
      + shape([W(s * 7.05, .2, 14), W(s * 7.05, 5.5, 14), W(s * 7.05, 5.5, 19), W(s * 7.05, .2, 19)], GLASS.m, .6);
    items.push({ box: B.aabb([W(-9, -17, 4), W(9, 17, 20)]), svg: body + win });
    for (const y of [-11, 11]) for (const s of [-1, 1]) items.push({ box: B.aabb([W(s * 7.5, y - 4.5, 0), W(s * 10.5, y + 4.5, 9)]),
      svg: rod(W(s * 7.5, y, 4.5), W(s * 10.5, y, 4.5), 4.5, TYRE, toneI, .9) });
    return items;
  },
  ball: (W, o) => [shadow([...ringW(W, 0, 0, 0, 3, 8), ...ringW(W, 0, 0, 14, 14, 20)], o), { box: B.aabb([W(-14, -14, 0), W(14, 14, 28)]), svg: ball(W(0, 0, 14), 14, BALL) }],
  wall: (W, o) => {
    let s = B.slabW(W, -4, -32, 4, 32, 0, 36, BRICK, toneI, 1.2);
    for (const fx of [-4.02, 4.02]){
      if (!vis(sub(W(fx, 0, 0), W(0, 0, 0)))) continue;
      let d = '';
      for (let z = 6; z < 36; z += 6) d += `M${P(...W(fx, -32, z)).map(f).join(' ')}L${P(...W(fx, 32, z)).map(f).join(' ')}`;
      for (let row = 0; row < 6; row++) for (let y = -32 + (row % 2 ? 6 : 12); y < 32; y += 12) d += `M${P(...W(fx, y, row * 6)).map(f).join(' ')}L${P(...W(fx, y, row * 6 + 6)).map(f).join(' ')}`;
      s += `<path d="${d}" fill="none" stroke="#e8d9c4" stroke-width=".7" opacity=".85"/>`;
    }
    return [slabShadow(W, o, -4, -32, 4, 32, 36), { box: B.aabb([W(-4, -32, 0), W(4, 32, 36)]), svg: s }];
  },
};
B.prop('obstacle', {
  name: 'Obstacle', foot: [30, 64, 36], params: { kind: Object.keys(OBSTACLES), value: [2, 450] }, defaults: { kind: 'box' },
  draw(ctx){
    const F = frame(ctx), sh = obstacleShift(ctx.p, F.dist), W = (x, y, z) => F.W(x + sh, y, z);
    out(ctx, (OBSTACLES[ctx.p.kind] || OBSTACLES.box)(W, F.o));
  },
});

B.prop('watering-can', {
  name: 'Watering can', foot: [50, 26, 36], params: {},
  draw(ctx){
    const { W, o } = frame(ctx), items = [];
    items.push(shadow([...ringW(W, 0, 0, 0, 12), ...ringW(W, 0, 0, 22, 12)], o));
    let body = cyl(...W(0, 0, 0).slice(0, 2), o[2], o[2] + 22, 12, CAN, toneI, 1.4, 28) + cyl(...W(0, 0, 0).slice(0, 2), o[2] + 21, o[2] + 22.6, 12.6, CAN, toneI, .8, 28);
    body += shape(ringW(W, -4, 0, 22.62, 5.5, 18), '#2b2825', .5);
    items.push({ box: B.aabb([W(-12.6, -12.6, 0), W(12.6, 12.6, 22.6)]), svg: body });
    items.push({ box: B.aabb([W(8, -3, 4), W(31, 3, 28)]), svg: rod(W(9, 0, 5), W(30, 0, 26), 2.6, CAN, toneI, .9, 1.7) });
    // the rose: a flared cap with its holes on the face, when the face is toward the viewer
    const rose = towards(W(9, 0, 5), W(30, 0, 26)), face = along(W(30, 0, 26), rose, 4.05);
    let rs = rod(W(30, 0, 26), along(W(30, 0, 26), rose, 4), 1.7, CAN, toneI, .8, 4.2);
    if (vis(rose)) for (const h of [face, ...ringAbout(face, rose, 2.4, 6)]){ const [X, Y] = P(...h); rs += `<circle cx="${f(X)}" cy="${f(Y)}" r=".6" fill="#1f3d24"/>`; }
    items.push({ box: B.aabb([W(29, -4.5, 22), W(35, 4.5, 30)]), svg: rs });
    const handle = [W(-10, 0, 21), W(-9, 0, 30), W(-4, 0, 35), W(3, 0, 34), W(7, 0, 22)];
    for (let i = 0; i < handle.length - 1; i++) items.push({ box: B.aabb([handle[i], handle[i + 1]]).map((v, j) => v.map(c => c + (j ? 1.6 : -1.6))), svg: rod(handle[i], handle[i + 1], 1.5, CAN, toneI, .8) });
    out(ctx, items);
  },
});

// the meter is built on its aim servo: a card on the case top, centred on the output shaft, under the horn
B.prop('strength-meter', {
  name: 'Strength meter', foot: [50, 30, 42], params: {},
  draw(ctx){
    const q = ctx.aimPart, def = q && B.parts[q.part], sh = def && def.shaft;
    if (!q || !sh || !Array.isArray(q.at)){ B.note(`prop ${ctx.p.id}: a strength-meter needs a servo on the mat as its aim`); return; }
    const o = ctx.at(q.at[0], q.at[1]), r = (+q.rot || 0) * Math.PI / 180, ax = [Math.cos(r), Math.sin(r), 0], ay = [-ax[1], ax[0], 0];
    const W = (x, y, z) => [o[0] + ax[0] * x + ay[0] * y, o[1] + ax[1] * x + ay[1] * y, o[2] + z];
    const st = ctx.st || {}, drv = st.drv && st.drv[q.id], m = ctx.m || {};
    const angle = drv && Number.isFinite(drv.a) ? drv.a : Number.isFinite(m.angle) ? m.angle : 90;
    // horn direction for an angle, as the servo draws it: 0° along -x, 90° along +y, 180° along +x
    const dirAt = a => { const t = Math.PI - a * Math.PI / 180; return [Math.cos(t), Math.sin(t)]; };
    const z = sh.top + .3, R0 = 10, R1 = 25, at = (a, rr, zz = z) => { const [dx, dy] = dirAt(a); return W(sh.x + dx * rr, dy * rr, zz); };
    const items = [];
    let card = '';
    for (const [a0, a1, col] of [[0, 70, '#5cb85c'], [70, 120, '#f2c230'], [120, 160, '#f08a2b'], [160, 180, '#e2483d']]){
      const n = Math.max(3, Math.round((a1 - a0) / 6)), pts = [];
      for (let i = 0; i <= n; i++) pts.push(at(a0 + (a1 - a0) * i / n, R1));
      for (let i = n; i >= 0; i--) pts.push(at(a0 + (a1 - a0) * i / n, R0));
      card += shape(pts, col, 0);
    }
    const rim = []; for (let i = 0; i <= 30; i++) rim.push(at(i * 6, R1)); for (let i = 30; i >= 0; i--) rim.push(at(i * 6, R0));
    card += `<path d="${pd(rim)}" fill="none" stroke="${INK}" stroke-width="1"/>`;
    let ticks = ''; for (let a = 0; a <= 180; a += 20) ticks += `M${P(...at(a, R1 - 4)).map(f).join(' ')}L${P(...at(a, R1)).map(f).join(' ')}`;
    card += `<path d="${ticks}" stroke="${INK}" stroke-width=".7" fill="none"/>`;
    items.push({ box: B.aabb([W(sh.x - R1, -1, z - .1), W(sh.x + R1, R1, z + .1)]), svg: card });
    // the bell on a post at full swing, where the horn's tip just reaches it
    const post0 = at(180, sh.tip + 5, z), post1 = at(180, sh.tip + 5, sh.horn + 6), ring = angle >= 172;
    let bell = rod(post0, post1, .8, STEEL, toneI, .6) + rod(at(180, sh.tip + 3.4, sh.horn + 6), at(180, sh.tip + 3.4, sh.horn - 1), 1.2, BRASS, toneI, .9, 4.4, 18);
    if (ring){ const [X, Y] = P(...at(180, sh.tip + 3.4, sh.horn + 3)); bell += `<path d="M${f(X + 7)} ${f(Y - 7)}q4 5 0 10M${f(X + 11)} ${f(Y - 9)}q6 7 0 14M${f(X - 7)} ${f(Y - 7)}q-4 5 0 10" fill="none" stroke="#f2c230" stroke-width="1.4" stroke-linecap="round"/>`; }
    items.push({ box: B.aabb([at(180, sh.tip, z), at(180, sh.tip + 6, sh.horn + 6)]).map((v, i) => v.map(c => c + (i ? 2 : -2))), svg: bell });
    out(ctx, items);
  },
});

const WEIGHTS = [[50, 4.5, 7], [100, 5.5, 9], [200, 7, 11], [500, 9.5, 15]];
B.prop('weights', {
  name: 'Weights', foot: [26, 80, 22], params: {},
  draw(ctx){
    const { W, o, ay } = frame(ctx), items = [];
    let y = -(WEIGHTS.reduce((s, [, r]) => s + 2 * r + 9, 0) - 9) / 2;
    // text along the row, as a board direction (B.flatText reads board axes)
    const bd = [-ay[1], -ay[0]];
    for (const [g, r, h] of WEIGHTS){
      const cy = y + r + 3;
      items.push(shadow([...ringW(W, 0, cy, 0, r + 3, 14), ...ringW(W, 0, cy, h + 2, r, 14)], o));
      let s = cyl(...W(0, cy, 0).slice(0, 2), o[2], o[2] + 2, r + 3, CORK, toneI, .8, 24)
        + cyl(...W(0, cy, 0).slice(0, 2), o[2] + 2, o[2] + 2 + h, r, BRASS, toneI, 1.1, 24)
        + cyl(...W(0, cy, 0).slice(0, 2), o[2] + 2 + h, o[2] + 4 + h, r * .45, BRASS, toneI, .7, 16)
        + cyl(...W(0, cy, 0).slice(0, 2), o[2] + 4 + h, o[2] + 6.5 + h, r * .62, BRASS, toneI, .8, 16);
      s += B.flatText(W(-(r + 7), cy, .1), bd[0], bd[1], `${g} g`, 3.2, INK, 800);
      items.push({ box: B.aabb([W(-(r + 9), cy - r - 3, 0), W(r + 3, cy + r + 3, h + 6.5)]), svg: s });
      y += 2 * r + 9;
    }
    out(ctx, items);
  },
});
})();
