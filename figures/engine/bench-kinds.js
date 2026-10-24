// needs: engine/bench
/* Board Bench part drawings. Each kind draws one part in its own frame: centre at the origin, its x along size[0],
   z up from its base (mm). It puts boxed items with ctx.put(box, svg) so they sort against neighbours from every
   side. Fields: group (default build group), size(p) / h (defaults), draw(ctx), xr(ctx) see-through internals,
   xrLabel(p), pads(ctx) footprint while the part is off the board, plug(ctx, src, reversed) the cable it takes,
   pins(p) pin positions in board mm. The data format is docs/FIGURES-BENCH.md section 5. */
(() => {
const B = SL.bench, M = B.M, K = B.kind;
const lw = (p, a = .45, b = .8) => Math.max(p.size[0], p.size[1]) < 4 ? a : b;    // thinner ink on tiny parts
const DIE = { l: '#8c95b8', m: '#6b7397', d: '#3f4565' };
const GLASS = { l: '#f4f1e6', m: '#dcd6c4', d: '#aaa38e' };
const lens = (hex, lit) => mix(mix(hex, '#ffffff', .1), '#4a4238', lit > .05 ? 0 : .38);

// bond wires from the die edge to the leads, drawn over a ghosted body
const dieXr = (ctx, n = 8, frac = .45) => {
  const p = ctx.p, [l, w] = p.size, h = p.h, k = ctx.k, d = Math.min(l, w) * frac / 2;
  let s = ctx.slab(-d, -d, d, d, h * .5, h * .58, DIE, toneI, .5);
  const sides = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  for (const [sx, sy] of sides){
    for (let i = 0; i < n; i++){
      const t = (i + .5) / n - .5, a0 = sx ? sx * d : t * 2 * d, b0 = sy ? sy * d : t * 2 * d;
      const a1 = sx ? sx * l / 2 : t * l * .9, b1 = sy ? sy * w / 2 : t * w * .9;
      s += `<path d="${pd([ctx.W(a0, b0, h * .58), ctx.W((a0 + a1) / 2, (b0 + b1) / 2, h * .8), ctx.W(a1, b1, h * .3)], false)}" fill="none" stroke="#e8c36a" stroke-width=".35"/>`;
    }
  }
  ctx.put(ctx.B(-l / 2, -w / 2, h + .01, l / 2, w / 2, h + .02), `<g opacity="${f(k)}">${s}</g>`);
};
const ghost = (ctx, svg) => ctx.k > 0 ? `<g opacity="${f(1 - .7 * ctx.k)}">${svg}</g>` : svg;

/* ---------- small SMD parts ---------- */
K('chip', { group: 'smd', size: () => [1.6, .8], h: .5,
  draw(ctx){ const p = ctx.p, [l, w] = p.size, h = p.h, e = Math.min(.35, l * .2), wd = lw(p);
    const body = p.cap ? M.tan : p.ferrite ? { l: '#5d5a56', m: '#45423f', d: '#2c2a28' } : { l: '#3c3935', m: '#2c2a27', d: '#1c1b19' };
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), ctx.slab(-l / 2 + e, -w / 2, l / 2 - e, w / 2, 0, h, body, toneI, wd) + ctx.slab(-l / 2, -w / 2, -l / 2 + e, w / 2, 0, h, M.tin, toneI, wd) + ctx.slab(l / 2 - e, -w / 2, l / 2, w / 2, 0, h, M.tin, toneI, wd)); },
  pads(ctx){ const [l, w] = ctx.p.size, e = Math.min(.45, l * .25); return ctx.poly([[-l / 2, -w / 2], [-l / 2 + e, -w / 2], [-l / 2 + e, w / 2], [-l / 2, w / 2]], .04, M.tin.l, 0) + ctx.poly([[l / 2 - e, -w / 2], [l / 2, -w / 2], [l / 2, w / 2], [l / 2 - e, w / 2]], .04, M.tin.l, 0); },
});
K('led', { group: 'smd', size: () => [2, 1.25], h: .8,
  draw(ctx){ const p = ctx.p, [l, w] = p.size, h = p.h, col = (p.led && p.led.color) || '#f7a531', lit = ctx.lit, wd = lw(p);
    let s = ctx.slab(-l / 2, -w / 2, -l / 2 + .35, w / 2, 0, h * .5, M.tin, toneI, wd) + ctx.slab(l / 2 - .35, -w / 2, l / 2, w / 2, 0, h * .5, M.tin, toneI, wd)
      + ctx.slab(-l / 2 + .3, -w / 2, l / 2 - .3, w / 2, 0, h, matOf(lens(col, lit)), toneI, wd);
    if (lit > .05) s += ctx.glow(0, 0, h, 1.2 + 2.6 * lit, col, .3 * lit) + ctx.glow(0, 0, h, .6 + 1 * lit, '#fffbe8', .75 * lit);
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), s); },
  xr(ctx){ const h = ctx.p.h; ctx.put(ctx.B(-.3, -.3, h + .01, .3, .3, h + .02), `<g opacity="${f(ctx.k)}">${ctx.slab(-.25, -.25, .25, .25, h * .6, h * .7, DIE, toneI, .3)}</g>`); },
  xrLabel: () => 'LED DIE',
  pads(ctx){ const [l, w] = ctx.p.size; return ctx.poly([[-l / 2, -w / 2], [-l / 2 + .5, -w / 2], [-l / 2 + .5, w / 2], [-l / 2, w / 2]], .04, M.tin.l, 0) + ctx.poly([[l / 2 - .5, -w / 2], [l / 2, -w / 2], [l / 2, w / 2], [l / 2 - .5, w / 2]], .04, M.tin.l, 0); },
});
K('rgb', { group: 'smd', size: () => [5, 5], h: 1.6,
  draw(ctx){ const p = ctx.p, [l, w] = p.size, h = p.h, o = ctx.o.o || { pins: {} }, net = (p.led && p.led.net) || '';
    const c = (o.pins && o.pins[net + '.rgb']) || null, lit = ctx.lit;
    const hex = typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c : (p.led && p.led.color) || '#ffffff';
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h, M.white, toneI, .6) + ctx.disc(0, 0, h + .01, Math.min(l, w) * .36, lens(hex, lit), .4);
    if (lit > .05) s += ctx.glow(0, 0, h, 3 + 7 * lit, hex, .3 * lit) + ctx.glow(0, 0, h, 1.4 + 2 * lit, '#ffffff', .7 * lit);
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), s); },
});
K('sod', { group: 'smd', size: () => [3.6, 1.8], h: 1.1,
  draw(ctx){ const p = ctx.p, [l, w] = p.size, h = p.h, wd = lw(p, .5, .7), e = l * .14;
    if (p.melf){ ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, w),
        ctx.rod([-l / 2 + e, 0, w / 2], [l / 2 - e, 0, w / 2], w / 2, GLASS, toneI, wd) + ctx.rod([-l / 2, 0, w / 2], [-l / 2 + e, 0, w / 2], w / 2, M.tin, toneI, wd) + ctx.rod([l / 2 - e, 0, w / 2], [l / 2, 0, w / 2], w / 2, M.tin, toneI, wd)
        + ctx.rod([-l / 2 + e + .1, 0, w / 2], [-l / 2 + e + .45, 0, w / 2], w / 2 + .02, M.black, toneI, .3)); return; }
    const band = ctx.rev ? l / 2 - e - .5 : -l / 2 + e;
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), ctx.slab(-l / 2, -w * .35, -l / 2 + e, w * .35, 0, h * .45, M.tin, toneI, wd) + ctx.slab(l / 2 - e, -w * .35, l / 2, w * .35, 0, h * .45, M.tin, toneI, wd)
      + ctx.slab(-l / 2 + e, -w / 2, l / 2 - e, w / 2, 0, h, M.black, toneI, wd) + ctx.poly([[band, -w / 2], [band + .5, -w / 2], [band + .5, w / 2], [band, w / 2]], h + .01, '#d8d2c0', 0)
      + (p.label ? ctx.text(.4, -.3, h + .02, p.label, .8, '#d8d2c0') : '')); },
});
K('fuse', { group: 'smd', size: () => [4.5, 3.2], h: 1,
  draw(ctx){ const p = ctx.p, [l, w] = p.size, h = p.h, e = l * .18, body = matOf(p.color || '#d9a441');
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), ctx.slab(-l / 2, -w / 2, -l / 2 + e, w / 2, 0, h, M.tin, toneI, .6) + ctx.slab(l / 2 - e, -w / 2, l / 2, w / 2, 0, h, M.tin, toneI, .6)
      + ctx.slab(-l / 2 + e, -w / 2, l / 2 - e, w / 2, 0, h, body, toneI, .6) + (p.label ? ctx.text(0, -.4, h + .01, p.label, 1.1, '#5a3d12') : '')); },
  xr(ctx){ const p = ctx.p, [l, w] = p.size, h = p.h, tripped = ctx.st.faults.some(x => x.startsWith('short:'));
    ctx.put(ctx.B(-l / 2, -w / 2, h + .01, l / 2, w / 2, h + .02), `<g opacity="${f(ctx.k)}">${ctx.slab(-l * .3, -w * .3, l * .3, w * .3, h * .3, h * .55, matOf(tripped ? '#e2483d' : '#7a6a58'), toneI, .4)}</g>`); },
  xrLabel: p => 'POLYFUSE',
});
K('sot23', { group: 'smd', size: () => [2.9, 1.6], h: 1.1,
  draw(ctx){ const p = ctx.p, [l, w] = p.size, h = p.h, n = p.n || 3, wd = .5;
    let s = '';
    const leg = (a, side) => ctx.slab(a - .22, side * w / 2, a + .22, side * (w / 2 + .6), 0, .25, M.tin, toneI, .35);
    const top = n === 3 ? [0] : n === 5 ? [-.95, .95] : [-.95, 0, .95], bot = n === 3 ? [-.95, .95] : [-.95, 0, .95];
    for (const a of top) s += leg(a, 1); for (const a of bot) s += leg(a, -1);
    s += ctx.slab(-l / 2, -w / 2, l / 2, w / 2, .1, h, M.black, toneI, wd) + (p.label ? ctx.text(0, -.3, h + .01, p.label, .75, '#d8d2c0') : '');
    ctx.put(ctx.B(-l / 2, -w / 2 - .6, 0, l / 2, w / 2 + .6, h), s); },
  xr: ctx => dieXr(ctx, 1, .5), xrLabel: p => p.short || 'DIE',
});
K('sot223', { group: 'smd', size: () => [6.5, 3.5], h: 1.7,
  draw(ctx){ const p = ctx.p, [l, w] = p.size, h = p.h;
    let s = ctx.slab(-1.5, w / 2, 1.5, w / 2 + 1.9, 0, .3, M.tin, toneI, .5);
    for (const a of [-2.3, 0, 2.3]) s += ctx.slab(a - .35, -w / 2 - 1.7, a + .35, -w / 2, 0, .3, M.tin, toneI, .45);
    s += ctx.slab(-l / 2, -w / 2, l / 2, w / 2, .15, h, M.black, toneI, .7) + (p.label ? ctx.text(0, -.5, h + .01, p.label, 1.1, '#d8d2c0') : '');
    ctx.put(ctx.B(-l / 2, -w / 2 - 1.7, 0, l / 2, w / 2 + 1.9, h), s); },
  xr: ctx => dieXr(ctx, 1, .4), xrLabel: p => p.short || 'REGULATOR',
});
K('soic', { group: 'smd', size: p => [(p.n || 4) * 1.27 * (p.pitch ? p.pitch / 1.27 : 1), 3.9], h: 1.5,
  draw(ctx){ const p = ctx.p, [l, w] = p.size, h = p.h, n = p.n || 4, pitch = p.pitch || Math.min(1.27, l / n);
    let s = '';
    for (let i = 0; i < n; i++){ const a = (i - (n - 1) / 2) * pitch;
      s += ctx.slab(a - pitch * .2, w / 2, a + pitch * .2, w / 2 + .9, 0, .3, M.tin, toneI, .35) + ctx.slab(a - pitch * .2, -w / 2 - .9, a + pitch * .2, -w / 2, 0, .3, M.tin, toneI, .35); }
    s += ctx.slab(-l / 2, -w / 2, l / 2, w / 2, .12, h, M.black, toneI, .6) + ctx.disc(-l / 2 + .7, -w / 2 + .7, h + .01, .3, '#6f6a63', 0)
      + (p.label ? ctx.text(.3, -.4, h + .01, p.label, Math.min(1, w * .3), '#d8d2c0') : '');
    ctx.put(ctx.B(-l / 2, -w / 2 - .9, 0, l / 2, w / 2 + .9, h), ghost(ctx, s)); },
  xr: ctx => dieXr(ctx, ctx.p.n || 4, .5), xrLabel: p => p.short || 'DIE',
});
const quad = (pads) => ({ group: 'smd', size: () => [5, 5], h: pads ? .9 : 1.4,
  draw(ctx){ const p = ctx.p, [l, w] = p.size, h = p.h, n = p.n || 8, lead = pads ? .25 : 1, pitch = Math.min(l, w) * .8 / n;
    let s = '';
    for (let i = 0; i < n; i++){ const t = (i - (n - 1) / 2) * pitch, e = pitch * .22;
      if (pads){
        s += ctx.slab(l / 2 - .1, t - e, l / 2 + lead, t + e, 0, .2, M.tin, toneI, .25) + ctx.slab(-l / 2 - lead, t - e, -l / 2 + .1, t + e, 0, .2, M.tin, toneI, .25)
          + ctx.slab(t - e, w / 2 - .1, t + e, w / 2 + lead, 0, .2, M.tin, toneI, .25) + ctx.slab(t - e, -w / 2 - lead, t + e, -w / 2 + .1, 0, .2, M.tin, toneI, .25);
      } else {
        s += ctx.slab(l / 2, t - e, l / 2 + lead, t + e, 0, .25, M.tin, toneI, .25) + ctx.slab(-l / 2 - lead, t - e, -l / 2, t + e, 0, .25, M.tin, toneI, .25)
          + ctx.slab(t - e, w / 2, t + e, w / 2 + lead, 0, .25, M.tin, toneI, .25) + ctx.slab(t - e, -w / 2 - lead, t + e, -w / 2, 0, .25, M.tin, toneI, .25);
      } }
    s += ctx.slab(-l / 2, -w / 2, l / 2, w / 2, .1, h, M.black, toneI, .7) + ctx.disc(-l / 2 + .8, w / 2 - .8, h + .01, .35, '#77716a', 0);
    if (p.label) String(p.label).split('|').forEach((ln, i, a) => { s += ctx.text(0, (a.length / 2 - i - .8) * w * .16, h + .01, ln, Math.min(1.1, w * .13), '#d8d2c0'); });
    ctx.put(ctx.B(-l / 2 - lead, -w / 2 - lead, 0, l / 2 + lead, w / 2 + lead, h), ghost(ctx, s)); },
  xr: ctx => dieXr(ctx, Math.min(ctx.p.n || 8, 8), .55), xrLabel: p => p.short || 'DIE',
});
K('qfn', quad(true)); K('qfp', quad(false));
K('bga', { group: 'smd', size: () => [15, 15], h: 1.6,
  draw(ctx){ const p = ctx.p, [l, w] = p.size, h = p.h;
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, .3, .9, matOf('#3f6a4a'), toneI, .6);
    s += p.lid ? ctx.slab(-l * .42, -w * .42, l * .42, w * .42, .9, h, M.steel, toneI, .6) : ctx.slab(-l * .47, -w * .47, l * .47, w * .47, .9, h, M.black, toneI, .6);
    if (p.label) String(p.label).split('|').forEach((ln, i, a) => { s += ctx.text(0, (a.length / 2 - i - .7) * w * .12, h + .01, ln, Math.min(1.6, w * .09), p.lid ? '#5b5f60' : '#d8d2c0'); });
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), ghost(ctx, s)); },
  xr: ctx => dieXr(ctx, 10, .6), xrLabel: p => p.short || 'DIE',
});
K('resonator', { group: 'smd', size: () => [3.2, 1.3], h: 1,
  draw(ctx){ const p = ctx.p, [l, w] = p.size, h = p.h;
    let s = '';
    for (const a of [-l / 2 + .3, 0, l / 2 - .3]) s += ctx.slab(a - .3, -w / 2 - .15, a + .3, w / 2 + .15, 0, .3, M.tin, toneI, .3);
    s += ctx.slab(-l / 2, -w / 2, l / 2, w / 2, .1, h, matOf(p.color || '#c9a97a'), toneI, .45);
    ctx.put(ctx.B(-l / 2, -w / 2 - .15, 0, l / 2, w / 2 + .15, h), ghost(ctx, s)); },
  xr(ctx){ const [l, w] = ctx.p.size, h = ctx.p.h; ctx.put(ctx.B(-l / 2, -w / 2, h + .01, l / 2, w / 2, h + .02), `<g opacity="${f(ctx.k)}">${ctx.slab(-l * .38, -w * .3, l * .38, w * .3, h * .4, h * .55, matOf('#e7ddc4'), toneI, .3)}</g>`); },
  xrLabel: () => 'CERAMIC',
});
const stadium = (l, w, n = 6) => { const r = w / 2, pts = [];
  for (let i = 0; i <= n; i++){ const a = -Math.PI / 2 + i / n * Math.PI; pts.push([l / 2 - r + r * Math.cos(a), r * Math.sin(a)]); }
  for (let i = 0; i <= n; i++){ const a = Math.PI / 2 + i / n * Math.PI; pts.push([-l / 2 + r + r * Math.cos(a), r * Math.sin(a)]); }
  return pts; };
B.stadium = stadium;
const can = (ctx, l, w, z0, h, m, label, tcol) => {
  const ring = stadium(l, w), A = ring.map(([a, b]) => ctx.W(a, b, z0)), Bt = ring.map(([a, b]) => ctx.W(a, b, h));
  return loft(A, Bt, n => toneI(n, m)) + fill(pd(Bt), m.l) + ink(pd(Bt), .6) + hullInk([...A, ...Bt], .9) + (label ? ctx.text(0, -.5, h + .01, label, Math.min(1.4, w * .3), tcol || '#6d7476') : '');
};
B.can = can;
K('xtal-smd', { group: 'smd', size: () => [11.4, 4.7], h: 3.6,
  draw(ctx){ const p = ctx.p, [l, w] = p.size, h = p.h;
    let s = ctx.slab(-l / 2 - .8, -1, -l / 2 + 1, 1, 0, .3, M.tin, toneI, .4) + ctx.slab(l / 2 - 1, -1, l / 2 + .8, 1, 0, .3, M.tin, toneI, .4);
    s += ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, .4, M.black, toneI, .5) + can(ctx, l - .6, w - .5, .4, h, M.steel, p.label);
    ctx.put(ctx.B(-l / 2 - .8, -w / 2, 0, l / 2 + .8, w / 2, h), ghost(ctx, s)); },
  xr(ctx){ const p = ctx.p, [l, w] = p.size, h = p.h, run = ctx.st.ev && ctx.st.ev.status === 'running', jig = run ? Math.sin(ctx.st.t * 40) * .15 : 0;
    ctx.put(ctx.B(-l / 2, -w / 2, h + .01, l / 2, w / 2, h + .02), `<g opacity="${f(ctx.k)}">${ctx.slab(-l * .36 + jig, -w * .3, l * .36 + jig, w * .3, h * .45, h * .55, matOf('#cfe6ee'), toneI, .4)}</g>`); },
  xrLabel: () => 'QUARTZ',
});
K('xtal', { group: 'low', size: () => [11, 4.7], h: 3.6,
  draw(ctx){ const p = ctx.p, [l, w] = p.size, h = p.h; ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), ghost(ctx, can(ctx, l, w, 0, h, M.steel, p.label))); },
  xr(ctx){ K && B.kinds['xtal-smd'].xr(ctx); }, xrLabel: () => 'QUARTZ',
});
K('ecap-smd', { group: 'smd', size: () => [6.6, 6.6], h: 5.8,
  draw(ctx){ const p = ctx.p, [l, w] = p.size, h = p.h, r = Math.min(l, w) / 2 - .25, pop = ctx.pop;
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, 1, M.blackPl, toneI, .6);
    s += ctx.cyl(0, 0, 1, h, r, M.steel, toneI, .9);
    // the black half-moon on the can's top marks minus; at orient 0 it faces the part's -y side
    const sgn = ctx.rev ? 1 : -1, arc = [];
    for (let i = 0; i <= 12; i++){ const a = Math.PI + i / 12 * Math.PI; arc.push([r * .92 * Math.cos(a), sgn * -r * .92 * Math.sin(a)]); }
    s += ctx.poly(arc, h + .01, '#2c2a27', 0) + ctx.disc(0, 0, h + .02, r * .45, '#dfe3e3', 0);
    if (p.label && !pop) s += ctx.text(0, sgn * -r * .2 + .2, h + .03, p.label, 1.2, '#4b5052');
    if (pop) s += ctx.cyl(0, 0, h, h + 1.2, r * .8, matOf('#7b6a55'), toneI, .7);
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h + (pop ? 1.2 : 0)), s); },
  xr(ctx){ const p = ctx.p, h = p.h, r = Math.min(...p.size) / 2 - .6; let s = '';
    for (let i = 0; i < 3; i++) s += ctx.disc(0, 0, 1.3 + i * (h - 1.6) / 2, r * (1 - i * .08), 'none', .35);
    ctx.put(ctx.B(-r, -r, h + .04, r, r, h + .05), `<g opacity="${f(ctx.k * .8)}">${s}</g>`); },
  xrLabel: () => 'ELECTROLYTIC',
});
K('ecap', { group: 'tall', size: () => [5, 5], h: 7,
  draw(ctx){ const p = ctx.p, r = Math.min(...p.size) / 2, h = p.h, m = matOf(p.sleeve || '#3f62a8');
    let s = ctx.cyl(0, 0, 0, h, r, m, toneI, .9);
    const sgn = ctx.rev ? 1 : -1, stripe = [];
    for (let i = 0; i <= 6; i++){ const a = -Math.PI / 2 - .5 + i / 6 * 1; stripe.push([r * 1.01 * Math.cos(a), sgn * r * 1.01 * -Math.sin(a)]); }
    s += ctx.line([[0, sgn * -r, h * .1], [0, sgn * -r, h * .95]], 1.4, '#e9e4d6');
    s += ctx.disc(0, 0, h + .01, r * .85, ctx.pop ? '#7b6a55' : '#cfd4d5', .4);
    ctx.put(ctx.B(-r, -r, 0, r, r, h), s); },
  xrLabel: () => 'ELECTROLYTIC',
});
K('tant', { group: 'smd', size: () => [3.5, 2.8], h: 1.9,
  draw(ctx){ const p = ctx.p, [l, w] = p.size, h = p.h, band = ctx.rev ? -l / 2 + .3 : l / 2 - .9;
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), ctx.slab(-l / 2, -w * .35, l / 2, w * .35, 0, .3, M.tin, toneI, .4) + ctx.slab(-l / 2 + .3, -w / 2, l / 2 - .3, w / 2, .1, h, matOf('#e0a93a'), toneI, .6)
      + ctx.poly([[band, -w / 2], [band + .6, -w / 2], [band + .6, w / 2], [band, w / 2]], h + .01, '#8a5a1e', 0)); },
});
K('inductor', { group: 'smd', size: () => [4, 4], h: 2,
  draw(ctx){ const p = ctx.p, [l, w] = p.size, h = p.h;
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h, { l: '#5d5a56', m: '#45423f', d: '#2c2a28' }, toneI, .6) + (p.label ? ctx.text(0, -.4, h + .01, p.label, Math.min(1.2, w * .3), '#d8d2c0') : '')); },
});

/* ---------- through-hole ---------- */
const legs = (ctx, pts, r = .3) => pts.map(([a, b]) => ctx.disc(a, b, .02, r + .35, M.tin.l, .3)).join('');
K('dip', { group: 'last', size: p => [(p.n || 14) * 2.54, 7.4], h: 3.4,
  draw(ctx){ const p = ctx.p, n = p.n || 14, [l, w] = p.size, h = p.h, rv = ctx.rev ? -1 : 1;
    let s = '';
    for (let i = 0; i < n; i++){ const a = (i - (n - 1) / 2) * 2.54;
      for (const sd of [1, -1]) s += ctx.slab(a - .25, sd * w / 2, a + .25, sd * (w / 2 + .5), h * .25, h * .45, M.tin, toneI, .3) + ctx.slab(a - .2, sd * (w / 2 + .3), a + .2, sd * (w / 2 + .5), -2.6, h * .45, M.tin, toneI, .3); }
    s += ctx.slab(-l / 2, -w / 2, l / 2, w / 2, h * .15, h, M.black, toneI, .8);
    // the notch marks pin 1's end (-x at orient 0)
    const nx = rv * (-l / 2 + .05), notch = []; for (let i = 0; i <= 8; i++){ const a = -Math.PI / 2 + i / 8 * Math.PI; notch.push([nx + rv * 1.1 * Math.cos(a), 1.1 * Math.sin(a)]); }
    s += ctx.poly(notch, h + .01, '#2a2826', .4) + ctx.disc(rv * (-l / 2 + 2.6), -w / 2 + 1.5, h + .01, .55, '#2a2826', .3);
    if (p.label) String(p.label).split('|').forEach((ln, i, arr) => { s += B.flatText(ctx.W(0, (arr.length / 2 - i - .75) * 1.7, h + .02), rv * Math.cos(p.rot * Math.PI / 180), rv * Math.sin(p.rot * Math.PI / 180), ln, 1.35, '#d9d4c6', 800); });
    ctx.put(ctx.B(-l / 2, -w / 2 - .5, -2.6, l / 2, w / 2 + .5, h), ghost(ctx, s)); },
  xr: ctx => dieXr(ctx, 7, .3), xrLabel: p => p.short || 'DIE',
});
K('socket', { group: 'low', size: p => [(p.n || 14) * 2.54 + 1, 10.1], h: 3,
  draw(ctx){ const p = ctx.p, n = p.n || 14, [l, w] = p.size, h = p.h, rail = 2.2;
    let s = ctx.slab(-l / 2, w / 2 - rail, l / 2, w / 2, 0, h, M.blackPl, toneI, .6) + ctx.slab(-l / 2, -w / 2, l / 2, -w / 2 + rail, 0, h, M.blackPl, toneI, .6)
      + ctx.slab(-l / 2, -w / 2 + rail, -l / 2 + 1.2, w / 2 - rail, 0, h * .6, M.blackPl, toneI, .5) + ctx.slab(l / 2 - 1.2, -w / 2 + rail, l / 2, w / 2 - rail, 0, h * .6, M.blackPl, toneI, .5);
    for (let i = 0; i < n; i++){ const a = (i - (n - 1) / 2) * 2.54; for (const sd of [1, -1]) s += ctx.disc(a, sd * 3.81, h + .01, .45, '#d9b04e', .25); }
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), s); },
});
K('tact', { group: 'low', size: () => [6, 6], h: 4.3,
  draw(ctx){ const p = ctx.p, [l, w] = p.size, h = p.h, dn = ctx.on ? .6 : 0;
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h * .55, M.blackPl, toneI, .7) + ctx.slab(-l / 2 + .1, -w / 2 + .1, l / 2 - .1, w / 2 - .1, h * .55, h * .65, M.steel, toneI, .6);
    for (const [a, b] of [[-l / 2 + .8, -w / 2 + .8], [l / 2 - .8, -w / 2 + .8], [-l / 2 + .8, w / 2 - .8], [l / 2 - .8, w / 2 - .8]]) s += ctx.disc(a, b, h * .65 + .01, .35, '#9aa2a5', 0);
    s += ctx.cyl(0, 0, h * .65, h - dn, Math.min(l, w) * .29, p.capColor ? matOf(p.capColor) : M.black, toneI, .7);
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), s); },
});
K('button-smd', { group: 'smd', size: () => [4, 3], h: 1.6,
  draw(ctx){ const p = ctx.p, [l, w] = p.size, h = p.h, dn = ctx.on ? .3 : 0;
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h * .6, M.steel, toneI, .5);
    s += p.side ? ctx.slab(-l * .25, -w / 2 - .8 + dn, l * .25, -w / 2, h * .15, h * .5, M.black, toneI, .4) : ctx.cyl(0, 0, h * .6, h - dn, Math.min(l, w) * .28, M.black, toneI, .5);
    ctx.put(ctx.B(-l / 2, -w / 2 - (p.side ? .8 : 0), 0, l / 2, w / 2, h), s); },
});
K('slide', { group: 'low', size: () => [8.6, 3.6], h: 3.5,
  draw(ctx){ const p = ctx.p, [l, w] = p.size, h = p.h, n = ((p.control && p.control.positions) || [0, 1]).length, pos = (ctx.st.ctl[p.id] || 0) / Math.max(1, n - 1);
    const kx = -l * .2 + pos * l * .4;
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h * .7, M.steel, toneI, .6) + ctx.slab(kx - 1, -w * .3, kx + 1, w * .3, h * .7, h, p.knob ? matOf(p.knob) : M.black, toneI, .6);
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), s); },
});
const headerSize = p => { const rows = p.rows || 1, n = (p.pins || []).length || 2, cols = Math.ceil(n / rows), pitch = p.pitch || 2.54; return [cols * pitch, rows * pitch]; };
K('male', { group: 'low', size: headerSize, h: 8.5, pins: p => B.rowPins(p),
  draw(ctx){ const p = ctx.p, [l, w] = p.size, pitch = p.pitch || 2.54, pl = p.plastic || 2.5, pinH = p.h;
    const pts = B.rowPins(p);
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, pl), ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, pl, p.color ? matOf(p.color) : M.blackPl, toneI, .6));
    pts.forEach(([x, y], i) => { const [a, b] = localOf(p, x, y), q = .32;
      if (p.pins[i] === null) return;
      ctx.put(ctx.B(a - q, b - q, pl, a + q, b + q, pinH), ctx.slab(a - q, b - q, a + q, b + q, pl, pinH, M.gold, toneI, .35)); }); },
});
K('female', { group: 'tall', size: headerSize, h: 8.5, pins: p => B.rowPins(p),
  draw(ctx){ const p = ctx.p, [l, w] = p.size, h = p.h;
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h, p.color ? matOf(p.color) : M.blackPl, toneI, .7);
    for (const [x, y] of B.rowPins(p)){ const [a, b] = localOf(p, x, y); s += ctx.poly([[a - .5, b - .5], [a + .5, b - .5], [a + .5, b + .5], [a - .5, b + .5]], h + .01, '#151311', 0); }
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), s); },
});
const localOf = (p, x, y) => { const r = -(p.rot || 0) * Math.PI / 180, dx = x - p.at[0], dy = y - p.at[1]; return [dx * Math.cos(r) - dy * Math.sin(r), dx * Math.sin(r) + dy * Math.cos(r)]; };
B.localOf = localOf;
K('pads', { group: 'smd', size: headerSize, h: .05, pins: p => B.rowPins(p),
  draw(ctx){ const p = ctx.p, d = p.d || 1.7; let s = '';
    for (const [x, y] of B.rowPins(p)){ const [a, b] = localOf(p, x, y); s += ctx.disc(a, b, .03, d / 2, M.tin.l, .35) + ctx.disc(a, b, .04, d * .22, M.hole, 0); }
    const [l, w] = p.size; ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, .06), s); },
});
K('castellated', { group: 'smd', size: headerSize, h: .05, pins: p => B.rowPins(p),
  draw(ctx){ const p = ctx.p; let s = '';
    for (const [x, y] of B.rowPins(p)){ const [a, b] = localOf(p, x, y); s += ctx.poly([[a - .8, b - 1.6], [a + .8, b - 1.6], [a + .8, b + 1.6], [a - .8, b + 1.6]], .03, M.gold.l, .3) + ctx.disc(a, b, .04, .5, M.hole, 0); }
    const [l, w] = p.size; ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, .06), s); },
});
K('edge', { group: 'smd', size: p => [p.size ? p.size[0] : 40, 8], h: .05,
  draw(ctx){ const p = ctx.p, [l, w] = p.size; let s = '';
    for (const [x0, x1] of p.fingers || []){ const a0 = x0 - p.at[0], a1 = x1 - p.at[0]; s += ctx.poly([[a0, -w / 2], [a1, -w / 2], [a1, w / 2], [a0, w / 2]], .03, M.gold.l, .3); }
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, .06), s); },
});

/* ---------- connectors ---------- */
// the opening faces the part's -x end; plug(ctx) draws the cable coming in from there
const plugCable = (ctx, len, pw, ph, zc, boot, cable) => {
  const p = ctx.p, l = p.size[0], x0 = -l / 2;
  ctx.put(ctx.B(x0 - len, -pw / 2, zc - ph / 2, x0 - 1, pw / 2, zc + ph / 2), ctx.slab(x0 - len, -pw / 2, x0 - 1, pw / 2, zc - ph / 2, zc + ph / 2, boot, toneI, .9));
  // cable: a tube curving down to the mat, in short boxed pieces
  const pts = []; for (let i = 0; i <= 8; i++){ const t = i / 8; pts.push([x0 - len - t * 22, 0, zc - (zc + B.G.top - B.G.matH - 1.4) * Math.sin(t * Math.PI / 2)]); }
  for (let i = 0; i < 8; i++){ const a = ctx.W(...pts[i]), b2 = ctx.W(...pts[i + 1]); ctx.put(B.aabb([a, b2]).map((q, j) => q.map(v => v + (j ? 1.4 : -1.4))), rod(a, b2, 1.4, cable, toneI, .9)); }
};
K('usb-b', { group: 'tall', size: () => [16.3, 12], h: 10.9,
  draw(ctx){ const p = ctx.p, [l, w] = p.size, h = p.h;
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h, M.steel, toneI, .9) + ctx.line([[-l / 2 + 3, -w / 2, h], [-l / 2 + 3, w / 2, h]], .5) ;
    const op = [[-l / 2 - .01, -4, 1.5], [-l / 2 - .01, 4, 1.5], [-l / 2 - .01, 4, h - 2.3], [-l / 2 - .01, 2.6, h - 1.2], [-l / 2 - .01, -2.6, h - 1.2], [-l / 2 - .01, -4, h - 2.3]].map(q => ctx.W(...q));
    if (vis(norm(sub(ctx.W(-1, 0, 0), ctx.W(0, 0, 0))))) s += fill(pd(op), '#2b2825') + ink(pd(op), .6);
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), s); },
  plug: (ctx, src) => plugCable(ctx, 16, 11, 10, 5.4, matOf('#9a9a96'), matOf('#7d7b77')),
});
const smallUsb = (w0, h0, len0) => ({ group: 'smd', size: () => [len0, w0], h: h0,
  draw(ctx){ const p = ctx.p, [l, w] = p.size, h = p.h;
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h, M.steel, toneI, .7);
    const op = [[-l / 2 - .01, -w * .38, h * .2], [-l / 2 - .01, w * .38, h * .2], [-l / 2 - .01, w * .38, h * .8], [-l / 2 - .01, -w * .38, h * .8]].map(q => ctx.W(...q));
    if (vis(norm(sub(ctx.W(-1, 0, 0), ctx.W(0, 0, 0))))) s += fill(pd(op), '#2b2825') + ink(pd(op), .4);
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), s); },
  plug: ctx => plugCable(ctx, 9, ctx.p.size[1] * 1.2, ctx.p.h * 1.9, ctx.p.h / 2, matOf('#5c5a57'), matOf('#4a4845')),
});
K('usb-micro', smallUsb(7.5, 2.6, 5.4)); K('usb-mini', smallUsb(7.7, 3.9, 9.2)); K('usb-c', smallUsb(8.9, 3.2, 7.4));
K('usb-a', { group: 'tall', size: () => [17.5, 13.2], h: 15.6, draw(ctx){ const p = ctx.p, [l, w] = p.size, h = p.h;
  let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h, M.steel, toneI, .9);
  for (const z of [h * .28, h * .7]){ const op = [[-l / 2 - .01, -5.5, z - 2.4], [-l / 2 - .01, 5.5, z - 2.4], [-l / 2 - .01, 5.5, z + 2.4], [-l / 2 - .01, -5.5, z + 2.4]].map(q => ctx.W(...q));
    if (vis(norm(sub(ctx.W(-1, 0, 0), ctx.W(0, 0, 0))))) s += fill(pd(op), '#2b2825') + ink(pd(op), .5) + fill(pd([[-l / 2 - .02, -4.5, z - .4], [-l / 2 - .02, 4.5, z - .4], [-l / 2 - .02, 4.5, z + .8], [-l / 2 - .02, -4.5, z + .8]].map(q => ctx.W(...q))), p.tongue || '#3e86d9'); }
  ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), s); } });
K('barrel', { group: 'tall', size: () => [14.2, 8.9], h: 11,
  draw(ctx){ const p = ctx.p, [l, w] = p.size, h = p.h;
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h * .5, M.blackPl, toneI, .8);
    s += ctx.rod([-l / 2, 0, h * .55], [l / 2, 0, h * .55], w / 2, M.blackPl, toneI, .9);
    const fc = norm(sub(ctx.W(-1, 0, 0), ctx.W(0, 0, 0)));
    if (vis(fc)){ const ring = B.circ(0, h * .55, 2.6, 16).map(([b, z]) => ctx.W(-l / 2 - .02, b, z)); s += fill(pd(ring), '#1c1a18') + ink(pd(ring), .5);
      const pin = B.circ(0, h * .55, 1, 10).map(([b, z]) => ctx.W(-l / 2 - .03, b, z)); s += fill(pd(pin), '#d9b04e'); }
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h * .55 + w / 2), s); },
  plug(ctx, src, rev){ const p = ctx.p, l = p.size[0], zc = p.h * .55, x0 = -l / 2;
    ctx.put(ctx.B(x0 - 14, -3, zc - 3, x0 - 1, 3, zc + 3), ctx.rod([x0 - 1, 0, zc], [x0 - 14, 0, zc], 3, matOf(rev ? '#e2483d' : '#3a3632'), toneI, .9));
    const pts = []; for (let i = 0; i <= 6; i++){ const t = i / 6; pts.push([x0 - 14 - t * 18, 0, zc - (zc + B.G.top - B.G.matH - 1.2) * Math.sin(t * Math.PI / 2)]); }
    for (let i = 0; i < 6; i++){ const a = ctx.W(...pts[i]), b2 = ctx.W(...pts[i + 1]); ctx.put(B.aabb([a, b2]).map((q, j) => q.map(v => v + (j ? 1.2 : -1.2))), rod(a, b2, 1.2, matOf('#3a3632'), toneI, .9)); } },
});
K('box', { group: 'tall', size: () => [6, 6], h: 6,
  draw(ctx){ const p = ctx.p, [l, w] = p.size, h = p.h, m = p.color ? matOf(p.color) : M.blackPl;
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h, m, toneI, .8);
    if (p.label) String(p.label).split('|').forEach((ln, i, a) => { s += ctx.text(0, (a.length / 2 - i - .75) * Math.min(1.8, w * .2), h + .01, ln, Math.min(1.5, w * .16), p.labelColor || '#e9e4d6'); });
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), ghost(ctx, s)); },
});
K('can', { group: 'smd', size: () => [10, 10], h: 2.2,
  draw(ctx){ const p = ctx.p, [l, w] = p.size, h = p.h; let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h, M.steel, toneI, .7);
    if (p.label) String(p.label).split('|').forEach((ln, i, a) => { s += ctx.text(0, (a.length / 2 - i - .75) * 1.6, h + .01, ln, Math.min(1.3, w * .1), '#5b6163'); });
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), ghost(ctx, s)); },
  xr: ctx => dieXr(ctx, 6, .4), xrLabel: p => p.short || 'RF CHIP',
});
K('module', { group: 'smd', size: () => [25.5, 18], h: 3.1,
  draw(ctx){ const p = ctx.p, [l, w] = p.size, h = p.h, ant = p.ant || 6.5;
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, .8, matOf('#2f4a6e'), toneI, .7);
    s += ctx.slab(-l / 2 + .6, -w / 2 + .6, l / 2 - ant, w / 2 - .6, .8, h, M.steel, toneI, .7);
    let zz = []; const a0 = l / 2 - ant + .8; for (let i = 0; i <= 10; i++) zz.push([a0 + (i % 2 ? ant - 1.8 : 0), -w / 2 + 1.5 + i * (w - 3) / 10, .82]);
    s += `<path d="${pd(zz.map(q => ctx.W(...q)), false)}" fill="none" stroke="#e7c66b" stroke-width=".6"/>`;
    if (p.label) String(p.label).split('|').forEach((ln, i, a) => { s += ctx.text(-ant / 2, (a.length / 2 - i - .75) * 2.2, h + .01, ln, 1.6, '#5b6163'); });
    for (let i = 0; i < 12; i++){ const a = -l / 2 + 2 + i * (l - ant - 3) / 11; s += ctx.disc(a, w / 2 - .1, .81, .35, M.gold.l, 0) + ctx.disc(a, -w / 2 + .1, .81, .35, M.gold.l, 0); }
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), ghost(ctx, s)); },
  xr: ctx => dieXr(ctx, 6, .35), xrLabel: p => p.short || 'SOC',
});
K('antenna', { group: 'smd', size: () => [6, 15], h: .05,
  draw(ctx){ const p = ctx.p, [l, w] = p.size; let s = '';
    if (p.chip) s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, 1, M.ceramic, toneI, .5);
    else { const zz = []; for (let i = 0; i <= 12; i++) zz.push([-l / 2 + .6 + (i % 2) * (l - 1.2), -w / 2 + .6 + i * (w - 1.2) / 12, .04]); s = `<path d="${pd(zz.map(q => ctx.W(...q)), false)}" fill="none" stroke="#e7c66b" stroke-width=".7"/>`; }
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, p.chip ? 1 : .06), s); },
});
K('matrix', { group: 'smd', size: p => [(p.cols || 5) * (p.pitch || 2.5), (p.rows || 5) * (p.pitch || 2.5)], h: .7,
  draw(ctx){ const p = ctx.p, rows = p.rows || 5, cols = p.cols || 5, pitch = p.pitch || 2.5, col = (p.led && p.led.color) || '#e2483d';
    const o = ctx.o.o || { pins: {} }, img = o.pins[(p.led && p.led.net) || 'MATRIX'];
    let s = '', glow = '';
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++){
      const a = (c - (cols - 1) / 2) * pitch, b = ((rows - 1) / 2 - r) * pitch, on = typeof img === 'string' ? img[r * cols + c] === '1' : 0;
      s += ctx.slab(a - .45, b - .3, a + .45, b + .3, 0, p.h, matOf(on ? mix(col, '#ffffff', .2) : '#e9e4d6'), toneI, .3);
      if (on) glow += ctx.glow(a, b, p.h, 1.8, col, .35);
    }
    const [l, w] = p.size; ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, p.h), s + glow); },
});
K('seg7', { group: 'tall', size: p => [(p.digits || 4) * 7.6, 12.6], h: 7,
  draw(ctx){ const p = ctx.p, n = p.digits || 4, [l, w] = p.size, h = p.h, col = p.color || '#e2483d', o = ctx.o.o || { pins: {} };
    let s = ctx.slab(-l / 2, -w / 2, l / 2, w / 2, 0, h, matOf('#3a3632'), toneI, .7);
    const SEG = { a: [[-1.6, 4], [1.6, 4]], b: [[1.9, 3.6], [1.9, .3]], c: [[1.9, -.3], [1.9, -3.6]], d: [[-1.6, -4], [1.6, -4]], e: [[-1.9, -.3], [-1.9, -3.6]], f: [[-1.9, 3.6], [-1.9, .3]], g: [[-1.6, 0], [1.6, 0]] };
    for (let i = 0; i < n; i++){ const cx = (i - (n - 1) / 2) * (l / n), code = String(o.pins[((p.led && p.led.net) || 'SEG') + i] || '');
      for (const [k, [[a0, b0], [a1, b1]]] of Object.entries(SEG)){ const on = code.includes(k);
        s += `<path d="${pd([ctx.W(cx + a0 - .3, b0, h + .02), ctx.W(cx + a1 - .3, b1, h + .02)], false)}" fill="none" stroke="${on ? col : '#4d4842'}" stroke-width="1.2" stroke-linecap="round"/>`;
        if (on) s += ctx.glow(cx + (a0 + a1) / 2 - .3, (b0 + b1) / 2, h, 2.4, col, .25); } }
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, h), s); },
});
K('pad', { group: 'smd', size: () => [6, 6], h: .05,
  draw(ctx){ const p = ctx.p, [l, w] = p.size, touched = ctx.on;
    const s = p.shape === 'logo' ? ctx.disc(-l * .22, 0, .03, w * .32, touched ? M.gold.l : '#d8b04f', .5) + ctx.disc(l * .22, 0, .03, w * .32, touched ? M.gold.l : '#d8b04f', .5) : ctx.disc(0, 0, .03, Math.min(l, w) / 2, touched ? M.gold.l : '#d8b04f', .5);
    ctx.put(ctx.B(-l / 2, -w / 2, 0, l / 2, w / 2, .06), s); },
});
K('hole', { group: 'smd', size: p => [p.d ? p.d + 3 : 7, p.d ? p.d + 3 : 7], h: .05,
  draw(ctx){ const p = ctx.p, d = p.d || 4; ctx.put(ctx.B(-d, -d, 0, d, d, .06), ctx.disc(0, 0, .03, d / 2 + 1.4, M.gold.l, .5) + ctx.disc(0, 0, .04, d / 2, M.hole, .3) + (p.label ? ctx.text(0, -d / 2 - 2.6, .05, p.label, 1.8, '#f6f4ea') : '')); },
});
})();
