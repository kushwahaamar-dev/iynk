// Board Bench breadboard view: the board on the mat beside a breadboard, the lesson circuit on named holes, jumper
// wires from board pins, and a small solver that finds what each LED really does (current, dark, burnt).
// Breadboard parts (led, resistor, wire, the breadboard itself) live in figures/parts/. Format: FIGURES-BENCH.md §8-9.
(() => {
const B = SL.bench, T = B.T;
const BBS = B.BBS = {
  half: { cols: 30, w: 82.5, h: 54.5, rails: true },
  full: { cols: 63, w: 165.1, h: 54.5, rails: true },
  mini: { cols: 17, w: 46, h: 35.5, rails: false },
};
const ROWS = 'abcdefghij';
// hole positions in breadboard mm (origin bottom-left, row a at the back)
B.bbGeom = kind => {
  const g = BBS[kind] || BBS.half, x0 = (g.w - (g.cols - 1) * 2.54) / 2;
  const off = g.rails ? 0 : -9.06;
  const rowY = { j: 12.5, i: 15.04, h: 17.58, g: 20.12, f: 22.66, e: 30.28, d: 32.82, c: 35.36, b: 37.9, a: 40.44 };
  for (const r of ROWS) rowY[r] += off;
  const rails = g.rails ? { 'T+': 48.56, 'T-': 51.1, 'B-': 5.94, 'B+': 3.4 } : {};
  const railCols = []; if (g.rails) for (let k = 0; k < Math.floor(g.cols * 5 / 6); k++){ const c = 2 + k + Math.floor(k / 5); if (c <= g.cols) railCols.push(c); }
  return { ...g, kind, x0, rowY, rails, railCols, colX: c => x0 + (c - 1) * 2.54 };
};
// 'b10' -> {x, y, node}; 'T+12' -> nearest rail hole
B.hole = (geo, ref) => {
  let m = /^([a-j])(\d{1,2})$/.exec(ref);
  if (m){ const c = +m[2]; if (c < 1 || c > geo.cols) return null; const r = m[1];
    return { x: geo.colX(c), y: geo.rowY[r], node: 'S' + c + ('abcde'.includes(r) ? 'u' : 'l'), ref }; }
  m = /^([TB][+-])(\d{1,2})$/.exec(ref);
  if (m && geo.rails[m[1]] != null){ const want = +m[2]; let best = geo.railCols[0];
    for (const c of geo.railCols) if (Math.abs(c - want) < Math.abs(best - want)) best = c;
    return { x: geo.colX(best), y: geo.rails[m[1]], node: 'R' + m[1], ref }; }
  return null;
};

/* placement in board coordinates: the breadboard sits right of the board (or behind it) */
const place = () => {
  const md = B.md, c = md.circuits[B.st.circuit]; if (!c) return null;
  const geo = B.bbGeom(c.breadboard || 'half');
  const behind = c.board === 'back';
  const ox = md.def.noBoard ? 0 : behind ? (md.pcb.w - geo.w) / 2 : md.pcb.w + 14, oy = md.def.noBoard ? 0 : behind ? md.pcb.h + 12 : (md.pcb.h - geo.h) / 2;
  const zTop = B.G.matH + 8.5 - B.G.top;     // breadboard top, in board z
  return { c, geo, ox, oy, zTop, at: (x, y, z = zTop) => B.BP(ox + x, oy + y, z) };
};
B.bbPlace = place;

/* ---------- solver ---------- */
const PIN_R = 25;     // ohms: an AVR output pin's driver, so a missing resistor still has a (fatal) limit
function solve(st){
  const md = B.md, pl = place(); if (!pl) return {};
  const { c, geo } = pl, par = {}, find = a => { while (par[a] && par[a] !== a) a = par[a] = par[par[a]] || par[a]; return a; };
  const uni = (a, b) => { const x = find(a), y = find(b); if (x !== y) par[x] = y; };
  const node = ref => { const h = B.hole(geo, ref) || legHole(c, geo, ref); if (h) return h.node; const pin = pinOf(ref); return pin ? 'N:' + pin.net : null; };
  for (const w of c.wires || []){ const a = node(w.from), b = node(w.to); if (a && b){ par[a] = par[a] || a; par[b] = par[b] || b; uni(a, b); } }
  const parts = (c.parts || []).map(p => Object.assign({}, p, (st.cparams || {})[p.id] || {}));
  const res = [], leds = [];
  for (const p of parts){
    const def = B.parts[p.part];
    if (!def){ unknownPart(p); continue; }
    if (!def.elec) continue;
    const e = def.elec(p), ns = (p.holes || []).map(h => { const n = node(h); if (n) par[n] = par[n] || n; return n; });
    if (e.type === 'res' && ns[0] && ns[1]) res.push({ id: p.id, a: ns[0], b: ns[1], r: e.ohms });
    if (e.type === 'wire' && ns[0] && ns[1]) uni(ns[0], ns[1]);
    if (e.type === 'led' && ns[0] && ns[1]) leds.push({ id: p.id, a: ns[0], k: ns[1], vf: e.vf, imax: e.imax || .02 });
  }
  // voltage sources: board nets (pins driven by the program, rails, GND)
  const logic = md.def.logic || 5, run = st.ev.status === 'running' && !st.up && st.t >= 0;
  const srcOf = root => { for (const key of Object.keys(par)) if (key.startsWith('N:') && find(key) === root){ const net = key.slice(2);
      if (net === 'GND') return { v: 0, r: 0, net };
      if (own(st.ev.rails, net)) return { v: st.ev.rails[net] || 0, r: .5, net };
      const lv = run ? st.o.pins[net] : undefined;
      if (lv != null) return { v: logic, duty: +lv || 0, r: PIN_R, net }; } return null; };
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  // walk resistors from a node to a source; returns {src, r} of the first found (series chains only)
  const walk = (start, seen = new Set()) => {
    const root = find(start); if (seen.has(root)) return null; seen.add(root);
    const s = srcOf(root); if (s) return { src: s, r: 0 };
    for (const e of res){ const ra = find(e.a), rb = find(e.b), nxt = ra === root ? e.b : rb === root ? e.a : null;
      if (nxt == null) continue; const w = walk(nxt, seen); if (w) return { src: w.src, r: w.r + e.r, via: [e.id, ...(w.via || [])] }; }
    return null; };
  const meas = {};
  for (const L of leds){
    const up = walk(L.a), dn = walk(L.k);
    let i = 0, state = 'off';
    if (up && dn){
      const va = up.src.v, vk = dn.src.v, duty = up.src.duty != null ? up.src.duty : 1, r = up.r + dn.r + (up.src.r || 0) + (dn.src.r || 0);
      if (va - vk > L.vf){ i = (va - vk - L.vf) / Math.max(r, 1); state = i > L.imax * 2.5 ? 'burnt' : duty > 0 ? 'ok' : 'off'; i *= duty; }
      else if (vk - va > L.vf) state = 'reverse';
      meas[L.id] = { i_mA: Math.round(i * 1000 * 10) / 10, state, r: Math.round(up.r + dn.r), net: up.src.net };
    } else meas[L.id] = { i_mA: 0, state: 'open' };
  }
  return meas;
}
B.bbSolve = st => solve(st);
// 'M1.VCC': the hole under leg VCC of circuit part M1 (a module on the breadboard)
const legHole = (c, geo, ref) => {
  const m = /^([A-Za-z_][\w-]*)\.([\w+~-]+)$/.exec(ref); if (!m) return null;
  const cp = (c.parts || []).find(p => p.id === m[1]); if (!cp) return null;
  const def = B.parts[cp.part], i = def && def.legs ? def.legs.indexOf(m[2]) : -1;
  return i >= 0 && cp.holes && cp.holes[i] ? Object.assign(B.hole(geo, cp.holes[i]) || {}, { z: def.pinZ || 0 }) : null;
};
B.legHole = legHole;
const pinOf = ref => {
  const md = B.md;
  if (md.pins[ref]) return md.pins[ref];
  const ids = md.netPins[ref]; if (!ids || !ids.length) return null;
  const pl = place(); if (!pl || ids.length === 1) return md.pins[ids[0]];
  // several pins on one net (GND): the one nearest the breadboard
  let best = null, bd = 1e9; for (const id of ids){ const p = md.pins[id], d = Math.hypot(p.at[0] - pl.ox, p.at[1] - (pl.oy + pl.geo.h / 2)); if (d < bd){ bd = d; best = p; } }
  return best;
};
B.pinOf = pinOf;
// burnt LEDs stay burnt until the circuit is changed
B.bbStep = (st) => {
  if (!st.circuit) return;
  const m = solve(st);
  st.burnt = st.burnt || {};
  for (const [id, v] of Object.entries(m)){ if (v.state === 'burnt' && !st.burnt[id]){ st.burnt[id] = true; B.sfx('pop'); B.say('{name} burned out: {n} mA is far above its 20 mA', { name: id, n: Math.round(v.i_mA) }, 3000); } if (st.burnt[id]) v.state = 'burnt'; }
  st.meas = m;
};
B.bbParams = (st, params) => {
  const c = B.md.circuits[st.circuit]; if (!c) return;
  st.cparams = st.cparams || {};
  for (const [id, pv] of Object.entries(params)){
    const p = (c.parts || []).find(q => q.id === id); if (!p || !pv || typeof pv !== 'object') continue;
    const def = B.parts[p.part], allowed = (def && def.params) || {}, out = {};
    for (const [k, v] of Object.entries(pv)){
      if (!own2(allowed, k)) continue;
      const spec = allowed[k];
      if (B.paramRange(spec) ? typeof v === 'number' && v >= spec[0] && v <= spec[1] : spec.includes(v)) out[k] = v;
    }
    st.cparams[id] = Object.assign(st.cparams[id] || {}, out);
    if (st.burnt) delete st.burnt[id];
  }
  B.refresh();
};
const own2 = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
// a param spec is either a list of allowed values or a numeric range [min, max]
B.paramRange = spec => Array.isArray(spec) && spec.length === 2 && spec.every(v => typeof v === 'number') && spec[1] > spec[0];
B.bbPart = id => { const c = B.md.circuits[B.st.circuit]; return c && (c.parts || []).find(p => p.id === id); };

/* ---------- scene ---------- */
B.viewDef('breadboard', {
  bounds: () => {
    const md = B.md, pl = place(), m = md.mat;
    const x1 = pl ? Math.max(md.pcb.w, pl.ox + pl.geo.w) + 8 : md.pcb.w + m.right, y0 = pl ? Math.min(-m.front, pl.oy - 8) : -m.front, y1 = pl ? Math.max(md.pcb.h + m.back, pl.oy + pl.geo.h + 8) : md.pcb.h + m.back;
    const a = B.BP(-m.left, y0, -B.G.top), b = B.BP(x1, y1, md.height + 10);
    return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), 0, Math.max(a[0], b[0]), Math.max(a[1], b[1]), B.G.top + md.height + 10];
  },
  scene: k => {
    const md = B.md, st = B.st, pl = place(), m = md.mat, bnd = VIEWB();
    const x1 = pl ? Math.max(md.pcb.w, pl.ox + pl.geo.w) + 8 : md.pcb.w + m.right, y0 = pl ? Math.min(-m.front, pl.oy - 8) : -m.front, y1 = pl ? Math.max(md.pcb.h + m.back, pl.oy + pl.geo.h + 8) : md.pcb.h + m.back;
    const mat = B.drawMat(-m.left, y0, x1, y1);
    let s = mat.svg;
    const items = [];
    if (!md.def.noBoard){
      const pcb = B.drawBoardBase(k);
      for (const [x, y] of md.def.holes || []){ const w = B.BP(x, y, 0); s += cyl(w[0], w[1], B.G.matH, B.G.z0, 2.3, B.M.gold, toneI, .8, 12); }
      s += castShadow([...pcb.top, ...pcb.bot], B.G.matH, mat.top) + pcb.svg;
      items.push(...B.boardItems(st.o, k));
    }
    if (pl){
      const bbDef = B.parts.breadboard;
      const ctx = { pl, st, put: (bx, svg) => { if (svg) items.push({ box: bx, svg }); } };
      if (bbDef) bbDef.draw(Object.assign({ p: { id: 'BB', kind: pl.geo.kind } }, ctx));
      const meas = st.meas || {};
      for (const q of pl.c.parts || []){
        const p = Object.assign({}, q, (st.cparams || {})[q.id] || {}), def = B.parts[p.part];
        if (!def){ unknownPart(p); continue; }
        const holes = (p.holes || []).map(h => B.hole(pl.geo, h)).filter(Boolean);
        if (holes.length !== (p.holes || []).length){ B.note(`circuit part ${p.id}: bad hole in ${p.holes}`); continue; }
        const legs = holes.map(h => pl.at(h.x, h.y));
        const origin = Array.isArray(p.at) ? B.BP(p.at[0], p.at[1], B.G.matH - B.G.top) : legs[0] || pl.at(0, 0);
        const mm = meas[p.id] || {}, sel = st.sel === p.id;
        const subItems = [];
        try { def.draw({ p, st, legs, holes, origin, pl, m: mm, lit: mm.state === 'ok' ? Math.min(1, Math.pow(Math.max(0, mm.i_mA) / 13.6, .55)) : 0, sel,
          put: (bx, svg) => { if (svg) subItems.push({ box: bx, svg }); } }); } catch (e) { B.note(`${p.id}: ${e.message}`); }
        for (const it of subItems) items.push({ box: it.box, svg: act('bb', sel ? `<g class="bsel">${it.svg}</g>` : it.svg, `data-id="${CF_ESC(p.id)}" data-label="${CF_ESC(T(def.name || p.part) + ' ' + p.id)}"`) });
      }
      const wire = B.parts.wire;
      if (wire) for (const w of pl.c.wires || []){
        const end = ref => { const h = B.hole(pl.geo, ref) || legHole(pl.c, pl.geo, ref); if (h) return { pt: pl.at(h.x, h.y, pl.zTop + (h.z || 0)), down: 0 };
          const pin = pinOf(ref); if (!pin) return null; const part = md.byId[pin.part];
          return { pt: B.BP(pin.at[0], pin.at[1], (part ? part.h + (part.z || 0) : 8.5) - 2), down: 0, pin }; };
        const a = end(w.from), b = end(w.to);
        if (!a || !b){ B.note(`wire ${w.from}-${w.to}: unknown end`); continue; }
        const net = a.pin ? a.pin.net : b.pin ? b.pin.net : '';
        const live = (st.o.pins[net] || 0) > .5 || (st.ev.rails[net] || 0) > .5;
        wire.draw({ a: a.pt, b: b.pt, color: w.color || 'green', live, k, put: (bx, svg) => items.push({ box: bx, svg: act('pin', svg, `data-id="${CF_ESC(a.pin ? a.pin.id : w.from)}" data-part="${CF_ESC(a.pin ? a.pin.part : '')}" data-label="${CF_ESC(T('Wire from {a} to {b}', { a: w.from, b: w.to }))}"`) }) });
      }
    }
    s += byDepth(items);
    // labels on the circuit parts
    if (pl && k < .6) for (const q of pl.c.parts || []){
      const holes = (q.holes || []).map(h => B.hole(pl.geo, h)).filter(Boolean); if (!holes.length) continue;
      const cx = holes.reduce((a, h) => a + h.x, 0) / holes.length, cy = holes.reduce((a, h) => a + h.y, 0) / holes.length, mm = (st.meas || {})[q.id];
      const p = Object.assign({}, q, (st.cparams || {})[q.id] || {}), def = B.parts[q.part];
      const txt = def && def.tag ? def.tag(p, mm) : q.id;
      s += tag(pl.at(cx, cy, pl.zTop + 8), 26, -34 - holes[0].x * .0, txt, !!(mm && mm.state === 'ok' && mm.i_mA > 0));
    }
    return s;
  },
});
const VIEWB = () => null;
// a circuit part whose drawing is not on the page is reported once (the figure probe fails on it), not skipped silently
const noted = new Set();
const unknownPart = p => { const key = p.id + ':' + p.part; if (noted.has(key)) return; noted.add(key);
  B.note(`circuit part ${p.id}: unknown part "${p.part}" (add // @cf use parts/${String(p.part).replace(/[^\w-]/g, '')}.js)`); };

/* ---------- part pages: public/figures/parts/<id>.html shows the part on a breadboard ---------- */
const SHOW = {
  breadboard: { breadboard: 'half', parts: [], wires: [] },
  led: { breadboard: 'mini', parts: ['red', 'yellow', 'green', 'blue', 'white'].map((c, i) => ({ id: 'LED' + (i + 1), part: 'led', color: c, holes: ['e' + (2 + i * 3), 'e' + (3 + i * 3)] })), wires: [] },
  resistor: { breadboard: 'mini', parts: [220, 1000, 4700, 10000].map((r, i) => ({ id: 'R' + (i + 1), part: 'resistor', ohms: r, holes: [('acegi')[i] + 3, ('acegi')[i] + 7] })), wires: [] },
  wire: { breadboard: 'mini', parts: [], wires: [{ from: 'a2', to: 'j9', color: 'red' }, { from: 'c4', to: 'h14', color: 'black' }, { from: 'b12', to: 'f16', color: 'yellow' }] },
};
B.mountPart = name => {
  const def = B.parts[name];
  // show is a whole circuit { breadboard, parts, wires } or one part { breadboard, holes, params };
  // with neither, the part sits in row e from column 5, its legs spread to its smallest span
  const legs = def.legs || [], gap = Math.max(def.span ? def.span[0] : 1, legs.length - 1) / Math.max(1, legs.length - 1);
  const one = sh => ({ breadboard: sh.breadboard || 'mini', wires: [], parts: [Object.assign({ id: 'P1', part: name }, def.example || {}, sh.params || {},
    { holes: sh.holes || legs.map((_, i) => 'e' + (5 + Math.round(i * gap))) })] });
  const sh = def.show || SHOW[name], show = sh && sh.parts ? Object.assign({ wires: [] }, sh) : one(sh || {});
  B.board({ id: '__part_' + name, fig: def.fig || '', name: T(def.name || name), sub: '', noBoard: true, pcb: { w: 1, h: 1 }, mat: { left: 8, right: 8, front: 8, back: 8 },
    parts: [], power: {}, modes: {}, circuits: { show }, circuit: 'show', view: 'breadboard', pal: 'mustard', partPage: { name } });
  B.start(['board', '__part_' + name]);
};
})();
