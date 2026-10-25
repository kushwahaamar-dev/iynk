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

/* circuit faults: a fault can change what is on the breadboard. `missing:<id>` leaves a circuit part out, with the
   wires that end on its legs; `reversed:<id>` turns it round (its `reversed` param when the part has one, else its
   holes in the other order). Ids the board itself has stay board faults. A listed fault [id, label, edit] does the
   same for its own id: edit = { missing: [ids], reversed: [ids], cut: [[from, to]] (wires left out), wires: [extra
   wires], holes: { id: [holes] } (parts moved) }, each applied where the circuit has it. The solver, the drawing and
   the schematic all read the changed circuit. */
let faulted = { key: null, md: null, c: null };
const circuitNow = () => {
  const md = B.md, st = B.st, c = md.circuits[st.circuit]; if (!c) return null;
  const fs = st.faults || []; if (!fs.length) return c;
  const key = st.circuit + '|' + fs.join(',');
  if (faulted.key === key && faulted.md === md) return faulted.c;
  const missing = new Set(), reversed = new Set(), cut = [], add = [], holes = {};
  const inCircuit = id => (c.parts || []).some(p => p.id === id);
  for (const f of fs){
    const m = /^(missing|reversed):(.+)$/.exec(f);
    if (m && inCircuit(m[2]) && !md.byId[m[2]]) (m[1] === 'missing' ? missing : reversed).add(m[2]);
    const fd = (md.def.faults || []).find(x => Array.isArray(x) && x[0] === f && x[2] && typeof x[2] === 'object');
    if (!fd) continue;
    const e = fd[2];
    for (const id of e.missing || []) if (inCircuit(id)) missing.add(id);
    for (const id of e.reversed || []) if (inCircuit(id)) reversed.add(id);
    for (const w of e.cut || []) if (Array.isArray(w) && w.length === 2) cut.push(w);
    for (const w of e.wires || []) if (w && typeof w.from === 'string' && typeof w.to === 'string') add.push(w);
    for (const [id, hs] of Object.entries(e.holes || {})) if (inCircuit(id) && Array.isArray(hs)) holes[id] = hs;
  }
  let out = c;
  if (missing.size || reversed.size || cut.length || add.length || Object.keys(holes).length){
    const owner = ref => { const m = /^([A-Za-z_][\w-]*)\./.exec(ref); return m ? m[1] : null; };
    const isCut = w => cut.some(([a, b]) => (w.from === a && w.to === b) || (w.from === b && w.to === a));
    const parts = (c.parts || []).filter(p => !missing.has(p.id)).map(p => {
      let q = holes[p.id] ? Object.assign({}, p, { holes: holes[p.id].slice() }) : p;
      if (reversed.has(p.id)){ const def = B.parts[p.part];
        q = def && def.params && def.params.reversed ? Object.assign({}, q, { reversed: true }) : Object.assign({}, q, { holes: (q.holes || []).slice().reverse() }); }
      return q; });
    const wires = (c.wires || []).filter(w => !missing.has(owner(w.from)) && !missing.has(owner(w.to)) && !isCut(w)).concat(add);
    out = Object.assign({}, c, { parts, wires });
  }
  faulted = { key, md, c: out };
  return out;
};
B.circuitNow = circuitNow;

/* placement in board coordinates: the breadboard sits right of the board (or behind it) */
const place = () => {
  const md = B.md, c = circuitNow(); if (!c) return null;
  const geo = B.bbGeom(c.breadboard || 'half');
  const behind = c.board === 'back';
  const ox = md.def.noBoard ? 0 : behind ? (md.pcb.w - geo.w) / 2 : md.pcb.w + 14, oy = md.def.noBoard ? 0 : behind ? md.pcb.h + 12 : (md.pcb.h - geo.h) / 2;
  const zTop = B.G.matH + 8.5 - B.G.top;     // breadboard top, in board z
  return { c, geo, ox, oy, zTop, at: (x, y, z = zTop) => B.BP(ox + x, oy + y, z) };
};
B.bbPlace = place;

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
/* ---------- the circuit solver runs every frame (bench-solve.js); parts that burn stay burnt until the circuit
   changes; a part's own motion hook def.step({ p, st, m }, dt) runs on the virtual clock ---------- */
B.bbStep = (st, dt) => {
  if (!st.circuit) return;
  const pl = place();
  if (!pl){ st.meas = {}; st.volts = {}; st.circuitLoad = 0; return; }
  const r = B.solveCircuit(st, pl, dt || 0);
  st.meas = r.meas; st.volts = r.volts; st.circuitLoad = r.load;
  // more current than the supply gives (a stalled motor, servos on USB): the board browns out for a while
  const src = st.power && (B.md.power.sources || {})[st.power];
  if (dt > 0 && src && src.ilim && r.load > src.ilim) st.sag = { until: st.t + .6, mA: Math.round(r.load * 1000), max: Math.round(src.ilim * 1000) };
  const parts = (pl.c.parts || []).map(q => Object.assign({}, q, (st.cparams || {})[q.id] || {}));
  if (dt > 0) for (const q of parts){ const def = B.parts[q.part];
    if (def && typeof def.step === 'function') try { def.step({ p: q, st, m: st.meas[q.id] || {} }, dt); } catch (e) { B.note(`${q.id} step: ${e.message}`); } }
  B.solveSound(st, parts);
};
// a press on a part in the scene (pointer or keyboard): def.press(p, down) returns a param patch, or null
B.bbPress = (id, down) => {
  const st = B.st, q = B.bbPart(id), def = q && B.parts[q.part];
  if (!def || typeof def.press !== 'function') return false;
  const p = Object.assign({}, def.defaults || {}, def.example || {}, q, (st.cparams || {})[id] || {});
  let patch = null;
  try { patch = def.press(p, !!down); } catch (e) { B.note(`${id} press: ${e.message}`); }
  if (down) B.sfx('click');
  if (patch && typeof patch === 'object') B.bbParams(st, { [id]: patch });
  return true;
};
B.bbParams = (st, params) => {
  const c = B.md.circuits[st.circuit]; if (!c) return;
  st.cparams = st.cparams || {};
  for (const [id, pv] of Object.entries(params)){
    const p = (c.parts || []).find(q => q.id === id) || (c.props || []).find(q => q.id === id); if (!p || !pv || typeof pv !== 'object') continue;
    const def = p.prop ? B.props[p.prop] : B.parts[p.part], allowed = (def && def.params) || {}, out = {};
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
B.bbPart = id => { const c = circuitNow(); return c && (c.parts || []).find(p => p.id === id); };
B.bbProp = id => { const c = circuitNow(); return c && (c.props || []).find(p => p.id === id); };

/* ---------- scene ---------- */
// the breadboard view's mat in board mm: the board, the breadboard and every circuit part lying on the mat (its `at`
// plus half the diagonal of its foot or matSize and 6 mm, so any rotation fits), and headroom for the tallest part
// (foot[2] or def.height)
const extent = () => {
  const md = B.md, pl = place(), m = md.mat;
  const area = pl ? [-m.left, Math.min(-m.front, pl.oy - 8), Math.max(md.pcb.w, pl.ox + pl.geo.w) + 8, Math.max(md.pcb.h + m.back, pl.oy + pl.geo.h + 8)]
    : [-m.left, -m.front, md.pcb.w + m.right, md.pcb.h + m.back];
  let h = md.height + 10;
  for (const q of (pl && pl.c.parts) || []){
    const def = B.parts[q.part], ft = def && Array.isArray(def.foot) ? def.foot : null, tall = ft ? ft[2] : def && +def.height;
    if (tall > 0) h = Math.max(h, tall + 4);
    if (!Array.isArray(q.at)) continue;
    const sz = ft || (def && Array.isArray(def.matSize) ? def.matSize : [20, 12]), r = Math.hypot(sz[0], sz[1]) / 2 + 6;
    area[0] = Math.min(area[0], q.at[0] - r); area[1] = Math.min(area[1], q.at[1] - r); area[2] = Math.max(area[2], q.at[0] + r); area[3] = Math.max(area[3], q.at[1] + r);
  }
  for (const q of (pl && pl.c.props) || []){
    const def = B.props[q.prop], ft = def && Array.isArray(def.foot) ? def.foot : [30, 30, 30];
    if (!Array.isArray(q.at)) continue;
    const r = Math.hypot(ft[0], ft[1]) / 2 + 6;
    h = Math.max(h, ft[2] + 4);
    area[0] = Math.min(area[0], q.at[0] - r); area[1] = Math.min(area[1], q.at[1] - r); area[2] = Math.max(area[2], q.at[0] + r); area[3] = Math.max(area[3], q.at[1] + r);
  }
  return { box: area, h };
};
// a wire end on the leg of a part that lies on the mat (no hole under it): the part's own def.legAt(p, origin, i)
const matLeg = (c, ref) => {
  const m = /^([A-Za-z_][\w-]*)\.([\w+~-]+)$/.exec(ref), q = m && (c.parts || []).find(x => x.id === m[1]), def = q && B.parts[q.part];
  const i = def && def.legs ? def.legs.indexOf(m[2]) : -1;
  if (i < 0 || (q.holes && q.holes[i]) || typeof def.legAt !== 'function' || !Array.isArray(q.at)) return null;
  const p = Object.assign({}, q, (B.st.cparams || {})[q.id] || {});
  try { return def.legAt(p, B.BP(q.at[0], q.at[1], B.G.matH - B.G.top), i); } catch (e) { B.note(`${q.id} legAt: ${e.message}`); return null; }
};
// one circuit part's drawing: its items (world box + svg) and its labeller; null when it can't be drawn
const drawCircuitPart = (pl, q, k) => {
  const md = B.md, st = B.st, p = Object.assign({}, q, (st.cparams || {})[q.id] || {}), def = B.parts[p.part];
  if (!def){ unknownPart(p); return null; }
  const holes = (p.holes || []).map(h => B.hole(pl.geo, h)).filter(Boolean);
  if (holes.length !== (p.holes || []).length){ B.note(`circuit part ${p.id}: bad hole in ${p.holes}`); return null; }
  const legs = holes.map(h => pl.at(h.x, h.y));
  const origin = Array.isArray(p.at) ? B.BP(p.at[0], p.at[1], B.G.matH - B.G.top) : legs[0] || pl.at(0, 0);
  const mm = (st.meas || {})[p.id] || {}, sel = st.sel === p.id;
  const items = [], lb = B.labeller();
  try { def.draw({ p, st, legs, holes, origin, pl, m: mm, lit: mm.state === 'ok' ? Math.min(1, Math.pow(Math.max(0, mm.i_mA) / 13.6, .55)) : 0, sel, k,
    solo: !!md.def.partPage, label: lb.label, put: (bx, svg) => { if (svg) items.push({ box: bx, svg }); } }); } catch (e) { B.note(`${p.id}: ${e.message}`); }
  return { p, def, sel, items, lb };
};
/* props: the scenery a lesson's world inputs name (a desk lamp over the LDR, the obstacle in front of the HC-SR04).
   circuit.props: [{ id, prop, at: [x, y], aim?, rot?, ...params }]; drawings register with SL.bench.prop(name, def)
   (bench-props.js), def = { name, foot: [w, d, h], params, defaults?, draw(ctx) }. The solver never sees them. */
B.props = {};
B.prop = (name, def) => { if (!def || typeof def.draw !== 'function') return B.note(`prop "${name}" has no draw`); B.props[name] = def; };
const matZ = () => B.G.matH - B.G.top;
// where a prop aims: the middle of a circuit part (its legs' strips, or its spot on the mat) or another prop's foot
const aimPoint = (pl, id) => {
  const q = (pl.c.parts || []).find(x => x.id === id);
  if (q){
    const def = B.parts[q.part], tall = def ? (Array.isArray(def.foot) ? def.foot[2] : +def.height) || 8 : 8;
    if (Array.isArray(q.at)) return B.BP(q.at[0], q.at[1], matZ() + tall / 2);
    const holes = (q.holes || []).map(h => B.hole(pl.geo, h)).filter(Boolean);
    if (holes.length) return pl.at(holes.reduce((t, h) => t + h.x, 0) / holes.length, holes.reduce((t, h) => t + h.y, 0) / holes.length, pl.zTop + Math.min(tall, 14) / 2);
  }
  const pr = (pl.c.props || []).find(x => x.id === id);
  return pr && Array.isArray(pr.at) ? B.BP(pr.at[0], pr.at[1], matZ()) : null;
};
const drawProp = (pl, q, k) => {
  const st = B.st, def = B.props[q.prop];
  if (!def){ unknownProp(q); return null; }
  if (!Array.isArray(q.at)){ B.note(`prop ${q.id}: no at`); return null; }
  const p = Object.assign({}, def.defaults || {}, q, (st.cparams || {})[q.id] || {});
  const target = q.aim ? (pl.c.parts || []).find(x => x.id === q.aim) || (pl.c.props || []).find(x => x.id === q.aim) : null;
  const aim = q.aim ? aimPoint(pl, q.aim) : null;
  if (q.aim && !aim){ unknownAim(q); }
  const items = [], lb = B.labeller(), sel = st.sel === q.id;
  try { def.draw({ p, st, k, sel, origin: B.BP(q.at[0], q.at[1], matZ()), aim, at: (x, y) => B.BP(x, y, matZ()),
    aimPart: target ? Object.assign({}, target, (st.cparams || {})[target.id] || {}) : null, m: target ? (st.meas || {})[target.id] || {} : {},
    label: lb.label, put: (bx, svg) => { if (svg) items.push({ box: bx, svg }); } }); } catch (e) { B.note(`${q.id}: ${e.message}`); }
  return { p, def, sel, items, lb };
};
// a part page frames its part, not the whole breadboard: the parts' drawn box plus 10 mm of breadboard round it
const PART_MARGIN = 10;
const partFrame = () => {
  const pl = place(); if (!pl || !(pl.c.parts || []).length) return null;
  let bx = null;
  for (const q of pl.c.parts){ const d = drawCircuitPart(pl, q, 0); if (!d) continue;
    for (const it of d.items) bx = bx ? [bx[0].map((v, i) => Math.min(v, it.box[0][i])), bx[1].map((v, i) => Math.max(v, it.box[1][i]))] : [it.box[0].slice(), it.box[1].slice()]; }
  return bx && [bx[0][0] - PART_MARGIN, bx[0][1] - PART_MARGIN, Math.max(0, bx[0][2] - 3), bx[1][0] + PART_MARGIN, bx[1][1] + PART_MARGIN, bx[1][2] + 2];
};
B.viewDef('breadboard', {
  bounds: () => {
    const pf = B.md.def.partPage ? partFrame() : null; if (pf) return pf;
    const { box: [x0, y0, x1, y1], h } = extent(), a = B.BP(x0, y0, -B.G.top), b = B.BP(x1, y1, h);
    return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), 0, Math.max(a[0], b[0]), Math.max(a[1], b[1]), B.G.top + h];
  },
  scene: k => {
    const md = B.md, st = B.st, pl = place();
    const mat = B.drawMat(...extent().box);
    let s = mat.svg;
    const items = [];
    if (!md.def.noBoard){
      const pcb = B.drawBoardBase(k);
      if (md.pcb.standoffs !== false) for (const [x, y] of md.def.holes || []){ const w = B.BP(x, y, 0); s += cyl(w[0], w[1], B.G.matH, B.G.z0, 2.3, B.M.gold, toneI, .8, 12); }
      s += castShadow([...pcb.top, ...pcb.bot], B.G.matH, mat.top) + pcb.svg;
      items.push(...B.boardItems(st.o, k));
    }
    if (pl){
      const bbDef = B.parts.breadboard;
      const ctx = { pl, st, put: (bx, svg) => { if (svg) items.push({ box: bx, svg }); } };
      if (bbDef) bbDef.draw(Object.assign({ p: { id: 'BB', kind: pl.geo.kind } }, ctx));
      for (const q of pl.c.parts || []){
        const d = drawCircuitPart(pl, q, k); if (!d) continue;
        const { p, def, sel } = d;
        d.lb.done(d.items.map(it => it.box));
        for (const it of d.items) items.push({ box: it.box, svg: act('bb', sel ? `<g class="bsel">${it.svg}</g>` : it.svg, `data-id="${CF_ESC(p.id)}" data-label="${CF_ESC(T(def.name || p.part) + ' ' + p.id)}"`) });
      }
      // props press as parts ('part' bridge events), so a host can hold or drag the thing its world input names
      for (const q of pl.c.props || []){
        const d = drawProp(pl, q, k); if (!d) continue;
        d.lb.done(d.items.map(it => it.box));
        for (const it of d.items) items.push({ box: it.box, svg: act('part', d.sel ? `<g class="bsel">${it.svg}</g>` : it.svg, `data-id="${CF_ESC(q.id)}" data-label="${CF_ESC(T(d.def.name || q.prop) + ' ' + q.id)}"`) });
      }
      const wire = B.parts.wire;
      if (wire) for (const w of pl.c.wires || []){
        const end = ref => { const h = B.hole(pl.geo, ref) || legHole(pl.c, pl.geo, ref); if (h) return { pt: pl.at(h.x, h.y, pl.zTop + (h.z || 0)), down: 0 };
          const lg = matLeg(pl.c, ref); if (lg) return { pt: lg, down: 0 };
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
// a circuit part whose drawing is not on the page is reported once (the figure probe fails on it), not skipped silently
const noted = new Set();
const unknownPart = p => { const key = p.id + ':' + p.part; if (noted.has(key)) return; noted.add(key);
  B.note(`circuit part ${p.id}: unknown part "${p.part}" (add // @cf use parts/${String(p.part).replace(/[^\w-]/g, '')}.js)`); };
const unknownProp = q => { const key = 'prop:' + q.id + ':' + q.prop; if (noted.has(key)) return; noted.add(key);
  B.note(`prop ${q.id}: unknown prop "${q.prop}" (add // @cf use engine/bench-props.js)`); };
const unknownAim = q => { const key = 'aim:' + q.id + ':' + q.aim; if (noted.has(key)) return; noted.add(key);
  B.note(`prop ${q.id}: aims at "${q.aim}", which is not in the circuit`); };

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
