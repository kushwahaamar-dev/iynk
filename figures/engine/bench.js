// The engine itself: pages load it through engine/bench.list (// @cf use engine/bench.list).
/* SimLab Board Bench engine. Boards, modules and benches are data (docs/FIGURES-BENCH.md); this file turns one of
   them into a Colorfigures figure: the board on its cutting mat, the build flow with its refusals, the power tree
   and faults, built-in programs on a virtual clock, on-board controls, see-through, exploded view, the views
   (board / breadboard / schematic / power) and the bridge traffic (accept / report).
   Part drawings: bench-kinds.js. Breadboard scene and circuit solver: bench-bb.js. Flat sheets: sheets.js. */
(() => {
const SL = window.SL = window.SL || {};
const B = SL.bench = {};
const T = (s, v) => CF_T(s, v);
const note = m => CF_NOTE('bench: ' + m);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const own = (o, k) => o != null && Object.prototype.hasOwnProperty.call(o, k);
const mean = pts => { const s = [0, 0, 0]; for (const p of pts) for (let k = 0; k < 3; k++) s[k] += p[k]; return s.map(v => v / pts.length); };
B.T = T; B.note = note; B.clamp = clamp; B.mean = mean;

/* ---------- registry ---------- */
B.kinds = {}; B.parts = {}; B.defs = { board: {}, module: {}, bench: {} };
const order = [];
B.kind = (name, def) => { if (!def || typeof def.draw !== 'function') return note(`kind "${name}" has no draw`); B.kinds[name] = def; };
B.part = (name, def) => { if (!def || typeof def.draw !== 'function') return note(`part "${name}" has no draw`); B.parts[name] = def; order.push(['part', name]);
  if (mine('part', name)) mountNow(['part', name]); };
// a page mounts its own item as soon as it registers (build.py's TAIL needs #fig right after the scripts):
// the item is the one whose kind and id match the page file, public/figures/<dir>/<id>.html, or ?id=
const DIRS = { board: 'boards', module: 'modules', bench: 'robotics', part: 'parts' };
const mine = (type, id) => CF_Q.get('id') ? CF_Q.get('id') === id : new RegExp('/' + DIRS[type] + '/' + id.replace(/[^\w-]/g, '') + '\\.html$').test(location.pathname);
const register = type => def => { if (!def || typeof def.id !== 'string') return note(type + ' without an id'); B.defs[type][def.id] = def; order.push([type, def.id]);
  if (mine(type, def.id)) mountNow([type, def.id]); };
B.board = register('board'); B.module = register('module'); B.bench = register('bench');

/* ---------- materials ---------- */
const M = B.M = {
  gold: { l: '#f4d37c', m: '#d8b04f', d: '#8d6a24' }, tin: METAL, black: DARK, ceramic: CERAMIC,
  steel: { l: '#e9ecec', m: '#bcc3c5', d: '#7f888b' }, blackPl: { l: '#5a5550', m: '#403c38', d: '#2a2725' },
  white: { l: '#fbf8ef', m: '#e7e2d3', d: '#c4bdab' }, tan: { l: '#e3c79a', m: '#c9a874', d: '#8f7449' },
  fr4: { l: '#d9cf9a', m: '#bfb47c', d: '#8c8352' }, mat: { l: '#dfe3d2', m: '#c6cbb6', d: '#9da38c' },
  copper: { l: '#f0a46b', m: '#d4834a', d: '#8f5226' }, hole: '#2b2825', silk: '#f6f4ea',
};
B.mat = hex => matOf(hex);
const WIRE = B.WIRE = { red: '#e2483d', black: '#3a3632', orange: '#f08a2b', yellow: '#f2c230', green: '#43b05c', blue: '#3e86d9',
  white: '#ece6d6', purple: '#8c4bd1', brown: '#8a5a34', grey: '#9a958c' };

/* ---------- model ---------- */
const GROUPS = ['smd', 'low', 'tall', 'last'];
const LIFT = { smd: 4, low: 9, tall: 14, last: 19 };
B.rowPins = p => {
  const n = p.pins.length, rows = p.rows || 1, pitch = p.pitch || 2.54, cols = Math.ceil(n / rows);
  const r = (p.rot || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  return p.pins.map((_, i) => {
    let col, row;
    if (rows === 1){ col = i; row = 0; } else if (p.order === 'rows'){ row = Math.floor(i / cols); col = i % cols; } else { col = Math.floor(i / rows); row = i % rows; }
    const a = (p.mirror ? -1 : 1) * (col - (cols - 1) / 2) * pitch, b = ((rows - 1) / 2 - row) * pitch;
    return [p.at[0] + a * c - b * s, p.at[1] + a * s + b * c];
  });
};
function prep(def, type){
  const pcb = Object.assign({ w: 50, h: 30, thick: 1.6, r: 1, color: '#2f9ea3', silk: M.silk, standoff: 4 }, def.pcb || {});
  const mat = Object.assign({ front: 8, back: 8, left: 14, right: 8 }, def.mat || {});
  const parts = [], byId = {};
  for (const q of def.parts || []){
    const k = B.kinds[q && q.kind];
    if (!k){ note(`${def.id}: part ${q && q.id} has unknown kind "${q && q.kind}"`); continue; }
    if (!q.id || byId[q.id]){ note(`${def.id}: duplicate or missing part id "${q.id}"`); continue; }
    if (!Array.isArray(q.at) || q.at.length < 2){ note(`${def.id}: part ${q.id} has no "at"`); continue; }
    const p = Object.assign({ rot: 0, z: 0, side: 'top' }, k.defaults || {}, q);
    p.group = q.group || k.group || 'smd';
    if (!GROUPS.includes(p.group)){ note(`${def.id}: part ${p.id} has unknown group "${p.group}"`); p.group = 'smd'; }
    if (!p.size) p.size = k.size ? k.size(p) : [2, 1.2];
    if (p.h == null) p.h = typeof k.h === 'function' ? k.h(p) : k.h != null ? k.h : 1;
    if (!p.name) p.name = p.id;
    parts.push(p); byId[p.id] = p;
  }
  const pins = {}, netPins = {};
  for (const p of parts){
    const k = B.kinds[p.kind];
    if (!Array.isArray(p.pins)) continue;
    const pts = k.pins ? k.pins(p) : B.rowPins(p);
    p.pins.forEach((net, i) => {
      if (net === null) return;
      const id = p.id + '.' + (i + 1), label = (p.labels && p.labels[i]) || net || id;
      pins[id] = { id, part: p.id, n: i + 1, at: pts[i], net: net || id, label };
      if (net) (netPins[net] = netPins[net] || []).push(id);
    });
  }
  const power = def.power || {};
  return { def, type, id: def.id, name: def.name || def.id, sub: def.sub || '', pcb, mat, parts, byId, pins, netPins, power,
    modes: def.modes || {}, circuits: def.circuits || {}, height: def.height || 14 };
}
B.prep = prep;

/* ---------- world mapping: board mm (x right, y up, z up) to Colorfigures world (x depth, y width) ---------- */
const G = B.G = { matH: 3, ox: 0, oy: 0, pw: 0, ph: 0, z0: 0, top: 0 };
function layoutFor(md){
  const { pcb, mat } = md;
  G.ox = mat.back; G.oy = mat.right; G.pw = pcb.w; G.ph = pcb.h;
  G.z0 = G.matH + pcb.standoff; G.top = G.z0 + pcb.thick;
}
const BP = B.BP = (x, y, z = 0) => [G.ox + G.ph - y, G.oy + G.pw - x, G.top + z];
const BPs = B.BPs = (x, y, z = 0) => P(...BP(x, y, z));
const wdir = (vx, vy) => [-vy, -vx, 0];     // a board direction as a world direction
B.wdir = wdir;
// text lying on a horizontal plane, reading along the board direction (dx, dy)
B.flatText = (wpt, dx, dy, str, size, col = INK, weight = 800, anchor = 'middle') => {
  const o = P(...wpt), U = Dv(...wdir(dx, dy)), V = Dv(...wdir(dy, -dx));
  return `<text transform="${txM(o, U, V)}" font-size="${f(size)}" fill="${col}" text-anchor="${anchor}" font-family="ui-monospace,Menlo,monospace" font-weight="${weight}" letter-spacing=".04em">${CF_ESC(str)}</text>`;
};
// a box through any 8 world points: [[lo],[hi]]
const aabb = pts => { const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (const w of pts) for (let k = 0; k < 3; k++){ lo[k] = Math.min(lo[k], w[k]); hi[k] = Math.max(hi[k], w[k]); } return [lo, hi]; };
B.aabb = aabb;
// a box with any rotation: faces culled and shaded from their own normals
const slabW = (W3, a0, b0, a1, b1, z0, z1, m, shade = toneI, w = .9) => {
  const q = [[a0, b0], [a1, b0], [a1, b1], [a0, b1]];
  const lo = q.map(([a, b]) => W3(a, b, z0)), hi = q.map(([a, b]) => W3(a, b, z1)), cen = mean([...lo, ...hi]);
  const faces = []; for (let i = 0; i < 4; i++){ const j = (i + 1) % 4; faces.push([lo[i], lo[j], hi[j], hi[i]]); }
  faces.push(hi);
  let s = '';
  for (const fq of faces){ const n = norm(sub(mean(fq), cen)); if (vis(n)) s += shape(fq, shade(n, m), w); }
  return s;
};
B.slabW = slabW;
const circ = (cx, cy, r, n = 18) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos(i / n * 2 * Math.PI), cy + r * Math.sin(i / n * 2 * Math.PI)]);
B.circ = circ;

/* part context for kinds: local frame (centre origin, own x along size[0]) */
function partCtx(p, st, o){
  const r = (p.rot || 0) * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  const bottom = p.side === 'bottom', th = B.md.pcb.thick, zb = (p.z || 0) + (o.lift || 0);
  const Lb = (a, b) => [p.at[0] + a * c - b * s, p.at[1] + a * s + b * c];
  const W3 = (a, b, z) => { const [x, y] = Lb(a, b); return BP(x, y, bottom ? -th - zb - z : zb + z); };
  const items = [];
  const ctx = {
    p, st, o, T, k: o.k || 0, lit: o.lit || 0, hot: !!o.hot, pop: !!o.pop, rev: !!o.rev, sel: !!o.sel, on: !!o.on,
    L: Lb, W: W3, P: (a, b, z) => P(...W3(a, b, z)),
    B: (a0, b0, z0, a1, b1, z1) => aabb([[a0, b0], [a1, b0], [a1, b1], [a0, b1]].flatMap(([a, b]) => [W3(a, b, z0), W3(a, b, z1)])),
    put: (bx, svg) => { if (svg) items.push({ box: bx, svg }); },
    slab: (a0, b0, a1, b1, z0, z1, m, shade = toneI, w = .9) => slabW(W3, a0, b0, a1, b1, z0, z1, m, shade, w),
    poly: (pts, z, col, w = .6) => { const d = pd(pts.map(([a, b]) => W3(a, b, z))); return fill(d, col) + (w ? ink(d, w) : ''); },
    disc: (a, b, z, rad, col, w = .5) => { const d = pd(circ(a, b, rad).map(([u, v]) => W3(u, v, z))); return fill(d, col) + (w ? ink(d, w) : ''); },
    text: (a, b, z, str, size, col = '#f2efe7', weight = 800) => B.flatText(W3(a, b, z), c, s, str, size, col, weight),
    cyl: (a, b, z0, z1, rad, m, shade = toneI, w = 1, n = 18) => { const [x, y, zA] = W3(a, b, z0), zB = W3(a, b, z1)[2]; return cyl(x, y, Math.min(zA, zB), Math.max(zA, zB), rad, m, shade, w, n); },
    rod: (a, b, rad, m, shade = toneI, w = .8) => rod(W3(...a), W3(...b), rad, m, shade, w),
    line: (pts, w = .6, col = INK) => `<path d="${pd(pts.map(q => W3(...q)), false)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`,
    glow: (a, b, z, rad, col, op = .5) => { const [X, Y] = P(...W3(a, b, z)); return `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(rad)}" fill="${col}" opacity="${f(op)}"/>`; },
  };
  return { ctx, items };
}
B.partCtx = partCtx;

/* ---------- state ---------- */
let MD = null, ui = null, st = null;
const isIn = id => !!(st.placed[id]);
const isSet = id => { const q = st.placed[id]; return !!(q && q.sold); };
const isRev = id => { const q = st.placed[id]; return !!(q && q.orient === 1); };
B.isIn = id => isIn(id); B.isSet = id => isSet(id);
const nameOf = id => { const p = MD.byId[id] || MAT.byId[id]; return p ? T(p.name) : id; };
const partsIn = g => MD.parts.filter(p => p.group === g);
const coldHit = (seed, t) => { const k = Math.floor(t * 3.3), x = Math.sin((k + 1) * 12.9898 + seed * 78.233) * 43758.5453; return x - Math.floor(x) < .42; };
const hashS = s => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) % 9973; return h; };
// fault patterns run on st.on, the time since the supply went in, so a program restart doesn't replay them
const coldOff = id => st.faults.includes('cold:' + id) && coldHit(hashS(id), st.on);

/* ---------- the mat: boards and parts beside the base with fixed, pre-routed wires, set out one step at a time ----------
   def.periph   [{ id, board | part, at: [x, y], size?, legs?, params?, step? }]: at is the item's lower-left corner in
                base board mm; a board is drawn assembled, a part with its breadboard drawing (legs at `legs` or spread
                along its front edge)
   def.wires    [{ from, to, color, step? }]: ends are base pins ('J1.4' or a net), a periph board's pin ('NANO.D5')
                or a periph part's leg ('MOTA.+')
   def.matSteps [{ id, label }] in order; the 'mat' button and set {matStep} reveal items up to that step, items
                without a step are always there. The wires carry no current: the bench's model() says what they do. */
let MAT = { items: [], byId: {}, steps: [], wires: [] };
function prepMat(def){
  const items = [], byId = {};
  for (const q of def.periph || []){
    if (!q || typeof q.id !== 'string' || !Array.isArray(q.at)){ note('periph without an id or "at"'); continue; }
    if (byId[q.id] || MD.byId[q.id]){ note(`periph ${q.id}: the id is already used`); continue; }
    let it;
    if (q.board){
      const reg = B.defs.board[q.board] || B.defs.module[q.board];
      if (!reg){ note(`periph ${q.id}: board "${q.board}" is not on the page (add // @cf use boards/${q.board}.js)`); continue; }
      const pmd = prep(withVariant(reg, q.variant || reg.variant), 'board');
      it = { kind: 'board', md: pmd, w: pmd.pcb.w, h: pmd.pcb.h, name: q.name || pmd.name };
    } else if (q.part){
      const partDef = B.parts[q.part];
      if (!partDef){ note(`periph ${q.id}: unknown part "${q.part}"`); continue; }
      const [w, h] = q.size || partDef.matSize || [20, 12];
      it = { kind: 'part', def: partDef, w, h, name: q.name || partDef.name || q.part };
    } else { note(`periph ${q.id}: give it a board or a part`); continue; }
    Object.assign(it, { id: q.id, q, at: q.at, step: q.step || null });
    items.push(it); byId[q.id] = it;
  }
  const steps = (def.matSteps || []).map(s => typeof s === 'string' ? { id: s, label: s } : s).filter(s => s && typeof s.id === 'string');
  for (const s of steps) if (CF_SLUG(s.id) !== s.id) note(`mat step "${s.id}": use a lower-case slug id`);
  const wires = (def.wires || []).filter(w => w && typeof w.from === 'string' && typeof w.to === 'string');
  for (const x of [...items, ...wires]) if (x.step && !steps.some(s => s.id === x.step)) note(`mat: step "${x.step}" is not in matSteps`);
  MAT = { items, byId, steps, wires };
}
const stepOn = sid => !sid || MAT.steps.findIndex(s => s.id === sid) <= st.matStep;
const periphOn = id => { const it = MAT.byId[id]; return !!it && stepOn(it.step); };
B.matSetup = () => MAT;

/* ---------- messages ---------- */
const MSG = {
  live: 'Unplug the power first: never work on a live board',
  exploded: 'Close the exploded view first',
  smdFirst: 'SMD parts first: run pick and place + reflow. The oven would melt plastic parts',
  lowFirst: 'Low parts first: with tall parts on, the board rocks and loose parts fall out when you flip it to solder',
  lastAfter: 'Solder everything first: this part goes on last',
  socketAfter: 'Solder everything first. Never heat a chip sitting in its socket',
  nothing: 'Nothing to solder yet: place a part first',
  plugFirst: 'Plug in USB first: uploads go over the cable',
  busy: 'Uploading: wait for it',
  faulted: 'Fix the fault first: unplug, then repair',
};
B.MSG = MSG;
const say = (text, vars, ms = 2200) => { const t = T(text, vars); st.msg = t; ui && ui.flash(t, ms); };
B.say = (t, v, ms) => say(t, v, ms);

/* ---------- power tree ---------- */
function evaluate(){
  const pw = MD.power, ev = { rails: {}, status: 'off', fault: null, why: '', load: 0 };
  const src = st.power ? (pw.sources || {})[st.power] : null;
  if (!src){ return ev; }
  // one source can feed several rails at once (a bench supply: feeds { VM: 7.4, VCC: 5 }); a wrong voltage scales them all
  const feeds = src.feeds || {}, v0 = src.v != null ? src.v : Math.max(0, ...Object.values(feeds).map(Number));
  const sv = st.supply[st.power] != null ? st.supply[st.power] : v0, scale = v0 ? sv / v0 : 1;
  const rev = st.faults.includes('reverse-polarity:' + st.power);
  const ok = id => !id || (isSet(id) && !isRev(id) && !coldOff(id));
  const gone = [src.part, ...(src.parts || [])].find(id => id && (MAT.byId[id] ? !periphOn(id) : !isSet(id)));
  if (gone){ ev.status = 'no-power'; ev.why = T('No power: {name} is missing', { name: nameOf(gone) }); return ev; }
  const rails = Object.assign(Object.fromEntries(Object.keys(feeds).map(r => [r, { from: [] }])), pw.rails || {});
  // a feed condition [ref, op, value]: ref a rail (its volts so far) or 'ctl:<id>' (a control's position: a power switch)
  const cmp = ([ref, op, lim]) => { const v2 = typeof ref === 'string' && ref.startsWith('ctl:') ? (st.ctl[ref.slice(4)] || 0) : (ev.rails[ref] || 0);
    return op === '>' ? v2 > lim : op === '<' ? v2 < lim : op === '!=' ? v2 !== lim : v2 === lim; };
  let burned = null;
  const fedBy = {};     // the feed each rail takes its voltage from (null: straight from the source)
  for (const [rid, rail] of Object.entries(rails)){
    let best = 0, bestFd = null;
    if (own(feeds, rid)){
      if (rev) burned = burned || { part: rail.burns || (pw.mcu && pw.mcu.part), kind: 'reverse' };
      else best = +feeds[rid] * scale;
    }
    for (const fd of rail.from || []){
      let vin = 0;
      if (fd.src){ if (fd.src !== st.power) continue; vin = rev ? -sv : sv; }
      else if (fd.rail){ vin = ev.rails[fd.rail] || 0; }
      const via = fd.via || [];
      if (!via.every(ok)){ continue; }
      if (vin < 0){
        if (fd.protect && via.includes(fd.protect)){ ev.why = T('Reverse polarity: {name} blocks it, nothing powers up', { name: nameOf(fd.protect) }); continue; }
        burned = burned || { part: fd.burns || via[via.length - 1] || (pw.mcu && pw.mcu.part), kind: 'reverse' }; continue;
      }
      if (fd.offIf && cmp(fd.offIf)) continue;
      if (fd.onlyIf && !cmp(fd.onlyIf)) continue;
      if (fd.max != null && vin > fd.max){ burned = burned || { part: via[via.length - 1], kind: 'over', v: vin }; continue; }
      let v = vin;
      if (fd.reg != null) v = Math.min(fd.reg, vin - (fd.dropout || 0));
      else v = vin - (fd.drop || 0);
      if (v > best){ best = v; bestFd = fd; }
    }
    // victim: the part an over-voltage damages (a name, or { part, fails: 'short' }: it fails short and takes the rail down)
    if (rail.max != null && best > rail.max){ const vc = rail.victim && typeof rail.victim === 'object' ? rail.victim : { part: rail.victim };
      burned = burned || { part: vc.part || (pw.mcu && pw.mcu.part), kind: 'over', v: best, rail: rid, short: vc.fails === 'short' }; }
    ev.rails[rid] = Math.max(0, best); fedBy[rid] = bestFd;
  }
  // overloads and shorts sag a rail
  // (the circuit on the breadboard can do it too: more current than the source gives, st.sag from bench-bb.js)
  const sag = !!(st.sag && st.sag.until > st.on);
  if (st.faults.includes('brownout') && brownout()){ const r = pw.mcu.rail; if (ev.rails[r]) ev.rails[r] = coldHit(5, st.on * 1.4) ? ev.rails[r] * .42 : ev.rails[r] * .9; }
  else if (sag && pw.mcu){ const r = pw.mcu.rail; if (ev.rails[r]) ev.rails[r] *= .42; }
  // a short on a rail fed through a current-limited regulator (feed ilim, amps) folds that regulator back: the rail and
  // the rails it feeds fall to 0 V and the rest keeps running; any other short trips the supply
  for (const fid of st.faults) if (fid.startsWith('short:')){
    const [, a, b2] = fid.split(':');
    for (const r of [a, b2]) if (own(ev.rails, r)){
      const fd = fedBy[r];
      if (fd && fd.ilim && ev.rails[r] > 0){
        const dead = new Set([r]);
        for (const k of Object.keys(ev.rails)) if (dead.has(k) || (fedBy[k] && fedBy[k].rail && dead.has(fedBy[k].rail))){ dead.add(k); ev.rails[k] = 0; }
        const reg = (fd.via || [])[(fd.via || []).length - 1];
        ev.why = T('Short between {a} and {b}: {name} limits its current, so {rail} falls to 0 V and the rest runs', { a, b: b2, name: reg ? nameOf(reg) : r, rail: r });
      } else { for (const k of Object.keys(ev.rails)) ev.rails[k] = 0; ev.why = T('Short between {a} and {b}: the supply trips', { a, b: b2 }); }
    }
  }
  if (burned){
    const pid = burned.part || '';
    ev.status = 'fault';
    // a victim that fails short pulls its rail to 0 V, and every rail fed from it
    if (burned.short){ const dead = new Set([burned.rail]);
      for (const k of Object.keys(ev.rails)) if (dead.has(k) || (fedBy[k] && fedBy[k].rail && dead.has(fedBy[k].rail))){ dead.add(k); ev.rails[k] = 0; } }
    ev.fault = burned.kind === 'reverse'
      ? { id: 'reverse-polarity:' + st.power, kind: 'hot', part: pid, msg: T('Reverse polarity: {name} burned', { name: nameOf(pid) }), fix: T('Swap the leads') }
      : { id: 'wrong-voltage:' + st.power, kind: 'hot', part: pid, msg: T('{v} V on {src}: {name} is damaged', { v: (+burned.v).toFixed(1), src: T(src.label || st.power), name: nameOf(pid) }), fix: T('Use {range} V', { range: (src.range || [src.v, src.v]).join('–') }) };
    return ev;
  }
  // reversed polar parts on a live board (polar.rail: only while that rail is live, so a cap on VIN is safe on USB)
  for (const p of MD.parts) if (p.polar && isIn(p.id) && isRev(p.id) && isSet(p.id)){
    if (p.polar.rail && !((ev.rails[p.polar.rail] || 0) > .5)) continue;
    const kind = p.polar.fault || (p.kind === 'ecap' || p.kind === 'ecap-smd' ? 'pop' : /led/.test(p.kind) ? 'dark' : 'hot');
    if (kind === 'dark') continue;
    ev.status = 'fault';
    ev.fault = { id: 'reversed:' + p.id, kind, part: p.id, msg: T('{name} is in backwards', { name: nameOf(p.id) }), fix: T('Unplug, then turn it round') };
    return ev;
  }
  const live = Object.values(ev.rails).some(v => v > .5);
  if (!live){ ev.status = 'no-power'; if (!ev.why) ev.why = T('No power: nothing reaches the board'); return ev; }
  ev.status = 'powered';
  const mcu = pw.mcu;
  if (mcu){
    const v = ev.rails[mcu.rail] || 0;
    if (v < .5){ ev.status = 'no-power'; ev.why = T('No power on {rail}: nothing reaches the chip', { rail: mcu.rail }); return ev; }
    if (v < (mcu.min || 0)){ ev.status = 'brownout';
      ev.why = sag ? T('Brown-out: the circuit draws {n} mA, more than {src} gives ({max} mA), so the chip keeps resetting', { n: st.sag.mA, src: T(src.label || st.power), max: st.sag.max })
        : T('Brown-out: {rail} is at {v} V, the chip keeps resetting', { rail: mcu.rail, v: v.toFixed(1) }); return ev; }
    const miss = (mcu.needs || []).find(id => !isSet(id) || coldOff(id));
    if (miss){ ev.why = T('Powered, but nothing runs: {name} is missing', { name: nameOf(miss) }); return ev; }
    // bootNeeds: parts only the power-up start reads (an FPGA's config flash); a program uploaded since runs without them
    const bootMiss = !st.loaded && !st.ext && (mcu.bootNeeds || []).find(id => !isSet(id) || coldOff(id));
    if (bootMiss){ ev.why = T('Powered, but nothing loads at power-up: {name} is missing', { name: nameOf(bootMiss) }); return ev; }
    if (st.ctl && Object.entries(st.ctl).some(([id, v]) => v && MD.byId[id] && MD.byId[id].control && MD.byId[id].control.action === 'reset')){ ev.status = 'reset'; return ev; }
    ev.status = 'running';
    // a strap latched at the last restart that keeps the sketch from starting (ROM boot mode)
    if (st.strap && st.strap.halts){ ev.status = 'fault'; ev.fault = { id: st.strap.fault, kind: 'boot', part: st.strap.part || mcu.part, msg: T(st.strap.msg || 'Boot strap'), fix: T(st.strap.fix || 'Free the pin and press RESET') }; }
  }
  return ev;
}
B.evaluate = () => evaluate();

/* boot straps (def.straps: [{ fault, boot, halts?, part?, blocks?: ['upload', 'serial'], msg, fix }]): the chip reads its
   mode pins when the program (re)starts (power on, RESET released, an upload done), so a strap fault in force then is
   latched until the next restart. halts: the sketch never starts (status fault, kind boot); blocks: it runs, but
   uploads are refused with msg and its Serial lines stop. state.boot reports the latched strap's boot. */
const sampleStraps = () => { st.strap = (MD.def.straps || []).find(x => x && typeof x.fault === 'string' && st.faults.includes(x.fault)) || null; };
const strapBlocks = what => !!(st.strap && (st.strap.blocks || []).includes(what));

/* ---------- outputs: pin levels and LEDs ---------- */
function outputs(){
  const o = { pins: {}, leds: {}, ev: st.ev };
  const ev = st.ev, running = ev.status === 'running' && !st.up && st.t >= 0, bl = MD.def.bootloader;
  if (running){
    if (st.ext) Object.assign(o.pins, st.pins);
    else { const md = MD.modes[st.mode]; if (md && md.out) try { Object.assign(o.pins, md.out(st, st.t) || {}); } catch (e) { note('mode ' + st.mode + ': ' + e.message); } }
  }
  // a cold joint on a header pin breaks the pin, not the trace: what plugs into it (o.pins feeds the breadboard and the
  // wire glow) cuts out in bursts, while an on-board LED on the same net (Nucleo LD2 on D13) keeps the MCU's level
  const mcu = Object.assign({}, o.pins);
  for (const fid of st.faults) if (fid.startsWith('cold:')){ const pin = MD.pins[fid.slice(5)]; if (pin && coldHit(hashS(pin.id), st.on)) o.pins[pin.net] = 0; }
  for (const p of MD.parts){
    if (!p.led || !isSet(p.id)) continue;
    let v = 0;
    const L0 = p.led;
    if (L0.rail) v = (ev.rails[L0.rail] || 0) > 2 ? ((ev.status === 'brownout') ? (coldHit(9, st.on * 2) ? .25 : .7) : 1) : 0;
    else if (L0.net){ const lv = mcu[L0.net]; v = running ? (L0.invert ? 1 - (+lv || 0) : (+lv || 0)) : 0; }
    else if (L0.serial){ v = st.up ? (L0.serial === 'rx' ? (Math.sin(st.upT * 60) > -.2 ? 1 : 0) : (st.upT > st.upDur - .45 && Math.sin(st.upT * 70) > 0 ? 1 : 0)) : (st.txT > 0 && L0.serial === 'tx' ? 1 : 0); }
    if (bl && bl.led === p.id && ev.status === 'running' && !st.up && st.t < 0){ const u = st.t + (bl.wait || 1); v = u < (bl.flashes || 3) / (bl.hz || 8) && Math.floor(u * (bl.hz || 8) * 2) % 2 === 0 ? 1 : 0; }
    if (L0.via && !L0.via.every(id => isSet(id) && !coldOff(id))) v = 0;
    if (isRev(p.id) && p.polar) v = 0;
    if (coldOff(p.id)) v = 0;
    o.leds[p.id] = clamp(v, 0, 1);
  }
  return o;
}
B.outputs = () => outputs();

/* ---------- actions (the only way the state changes) ---------- */
const A = B.actions = {};
const guard = () => { if (st.power){ say(MSG.live); return false; } if (st.exploded){ say(MSG.exploded); return false; } return true; };
const reflowed = () => partsIn('smd').every(p => !isIn(p.id) || isSet(p.id)) && partsIn('smd').some(p => isIn(p.id));
const smdDone = () => partsIn('smd').length === 0 || (st.reflowT == null && partsIn('smd').every(p => st.left[p.id] || isSet(p.id)));
const dropMissing = () => { st.faults = st.faults.filter(f => !f.startsWith('missing:')); };
A.strip = () => { if (!guard()) return; st.placed = {}; dropMissing(); st.matStep = -1; for (const p of MD.parts) if (p.fixed) st.placed[p.id] = { orient: 0, sold: true }; st.reflowT = null; st.solderT = null; sfx('pop'); say('Stripped to the bare PCB: build it back part by part'); refresh(); };
A.pnp = () => {
  if (!guard()) return;
  const todo = partsIn('smd').filter(p => !isIn(p.id) && !st.left[p.id] && !p.fixed);
  if (!todo.length){ say(partsIn('smd').length ? 'Every SMD part is on already' : 'This board has no SMD parts'); return; }
  // 0.22 s a part, faster on a crowded board so the whole run stays under about 3 s
  const gap = Math.min(.22, 2.6 / todo.length);
  todo.forEach((p, i) => { st.drop[p.id] = -gap * i; st.placed[p.id] = { orient: 0, sold: false }; });
  st.reflowT = -gap * todo.length - .3;
  say('Pick and place: {n} parts, then into the reflow oven', { n: todo.length });
  kick();
};
A.place = (id, orient = 0, quiet = false) => {
  const p = MD.byId[id]; if (!p) return say('No part {name} on this board', { name: id });
  if (!guard()) return;
  if (isIn(id)){ return say('{name} is already on the board', { name: nameOf(id) }); }
  if (p.group === 'smd'){ st.drop[id] = 0; st.placed[id] = { orient, sold: true }; delete st.left[id]; backOn(id); if (quiet) return true;
    say('{name} soldered on with hot air', { name: nameOf(id) }); refresh(); return true; }
  if (!smdDone()) return say(MSG.smdFirst);
  if (p.group === 'tall' && partsIn('low').some(q => !isIn(q.id) && !st.left[q.id] && !q.fixed)) return say(MSG.lowFirst);
  if (p.group === 'last'){
    const unsold = MD.parts.some(q => q.group !== 'last' && isIn(q.id) && !isSet(q.id));
    const missingLow = MD.parts.some(q => (q.group === 'low' || q.group === 'tall') && !isIn(q.id) && !st.left[q.id] && !q.fixed);
    if (unsold || missingLow || (p.inSocket && !isSet(p.inSocket))) return say(p.inSocket ? MSG.socketAfter : MSG.lastAfter);
  }
  st.placed[id] = { orient, sold: p.group === 'last' }; st.drop[id] = 0; delete st.left[id]; backOn(id);
  if (quiet) return true;
  sfx('place'); say(orient ? '{name} placed the wrong way round' : '{name} placed', { name: nameOf(id) }); refresh();
  return true;
};
// every missing part of one group, in board order; stops at the first refusal (which it says)
A.placeGroup = g => {
  const todo = MD.parts.filter(p => p.group === g && !p.fixed && !isIn(p.id));
  if (!todo.length) return say('Every part is on the board');
  let n = 0;
  for (const p of todo){ if (A.place(p.id, 0, true) !== true) break; n++; }
  if (n){ sfx('place'); say('{n} parts placed', { n }); refresh(); }
};
A.solder = () => {
  if (!guard()) return;
  const todo = MD.parts.filter(p => isIn(p.id) && !isSet(p.id) && p.group !== 'smd');
  if (!todo.length){ say(MD.parts.some(p => isIn(p.id) && p.group !== 'smd') ? 'Every joint is soldered already' : MSG.nothing); return; }
  st.solderQ = todo.map(p => p.id); st.solderT = 0; say('Soldering {n} parts', { n: todo.length }); kick();
};
A.remove = id => {
  const p = MD.byId[id]; if (!p) return say('No part {name} on this board', { name: id });
  if (p.fixed) return say('{name} is part of the board itself', { name: nameOf(id) });
  if (!guard()) return;
  if (!isIn(id)){ st.left[id] = true; return say('{name} will be left out', { name: nameOf(id) }); }
  // a chip in a socket comes out with the socket
  for (const q of MD.parts) if (q.inSocket === id && isIn(q.id)){ delete st.placed[q.id]; }
  delete st.placed[id]; st.left[id] = true; sfx('pop');
  say(p.group === 'smd' ? '{name} removed with hot air' : '{name} removed', { name: nameOf(id) }); refresh();
};
A.restore = id => { const p = MD.byId[id]; if (!p || isIn(id)) return; if (!guard()) return; st.placed[id] = { orient: 0, sold: true }; delete st.left[id]; backOn(id); refresh(); };
A.build = what => {
  if (st.power) return say(MSG.live);
  st.placed = {}; st.left = {}; st.reflowT = null; st.solderQ = null; dropMissing();
  st.matStep = what === 'assembled' ? MAT.steps.length - 1 : -1;
  if (what === 'assembled') for (const p of MD.parts) st.placed[p.id] = { orient: 0, sold: true };
  else for (const p of MD.parts) if (p.fixed) st.placed[p.id] = { orient: 0, sold: true };
  refresh();
};
A.flip = id => { const p = MD.byId[id]; if (!p || !p.polar || !isIn(id)) return; if (!guard()) return; st.placed[id].orient ^= 1; say(st.placed[id].orient ? '{name} turned the wrong way round' : '{name} turned the right way round', { name: nameOf(id) }); refresh(); };
A.power = key => {
  // unplugged, a Pico forgets the BOOTSEL boot: it boots into mass storage again only with BOOTSEL held at plug-in
  if (key == null || key === 'off'){ if (!st.power) return; st.power = null; st.up = null; st.strap = null; st.sag = null; st.ext = st.ext && false; st.loaded = false;
    if (st.boot === 'uf2') st.boot = null; sfx('unplug'); refresh(); return; }
  const src = (MD.power.sources || {})[key]; if (!src) return say('No supply {name} on this board', { name: key });
  if (st.exploded) return say(MSG.exploded);
  // plugging in the cable that is already in changes nothing (the sketch keeps its clock)
  if (st.power !== key){ st.power = key; st.t = 0; st.on = 0; st.down = null; st.serialN = -1; st.sag = null; st.loaded = false; sfx('plug'); sampleStraps(); }
  refresh(true);
};
A.upload = key => {
  const md = MD.modes[key]; if (!md) return say('No program {name}', { name: key });
  if (st.up) return say(MSG.busy);
  const ups = MD.power.upload || {};
  if (md.instant){ st.mode = key; st.ext = false; st.t = 0; st.serialN = -1; say('{name} running', { name: T(md.title) }); refresh(); return; }
  // upload.source is the port uploads go over; upload.also lists more (the ESP32-S3 DevKitC's native USB port)
  if (!st.power || (ups.source && st.power !== ups.source && !(ups.also || []).includes(st.power))) return say(MSG.plugFirst);
  if (strapBlocks('upload')) return say(st.strap.msg || 'Upload failed');
  if (st.ev.status === 'fault') return say(MSG.faulted);
  // the bootloader runs on the MCU: with its clock or socket out, avrdude never gets in sync
  const miss = [...(ups.needs || []), ...((MD.power.mcu && MD.power.mcu.needs) || [])].find(id => !isSet(id) || coldOff(id));
  if (miss) return say('Upload failed: {name} is missing', { name: nameOf(miss) });
  if (st.ev.status !== 'running' && st.ev.status !== 'powered') return say(st.ev.why || MSG.plugFirst);
  st.up = key; st.upT = 0; st.upDur = md.uploadS || ups.seconds || 2.2; st.ext = false;
  say('Uploading {name}: {bytes} bytes', { name: T(md.title), bytes: md.bytes || 1024 }, 1800); kick();
};
A.mode = key => { if (!MD.modes[key]) return false; st.mode = key; st.ext = false; st.t = 0; st.serialN = -1; refresh(); return true; };
A.press = (id, down) => {
  const p = MD.byId[id]; if (!p || !p.control) return say('No control {name}', { name: id });
  if (!isSet(id)) return say('{name} is missing', { name: nameOf(id) });
  const c = p.control, was = st.ctl[id] || 0;
  if (c.type === 'slide'){ if (down) st.ctl[id] = (was + 1) % ((c.positions || [0, 1]).length); }
  else st.ctl[id] = down ? 1 : 0;
  if (c.action === 'reset' && was && !down){ st.t = MD.def.bootloader ? -(MD.def.bootloader.wait || 1) : 0; st.serialN = -1; sampleStraps();
    if (st.ctlBoot) st.boot = 'download'; else if (st.boot === 'download') st.boot = null; }
  if (c.action === 'boot') st.ctlBoot = !!down;
  if (c.action === 'bootsel' && down && !st.power) st.boot = 'uf2';
  if (down) sfx('click');
  refresh(true);
};
// a circuit may name the built-in program that drives it (circuit.mode), so the figure page alone shows it working;
// switching to it changes nothing while the host drives the pins, or when the same patch names a mode
const pickCircuit = (id, keepMode) => {
  st.circuit = id;
  const c = id && MD.circuits[id];
  if (c && c.mode && MD.modes[c.mode] && !keepMode && !st.ext && !st.up && st.mode !== c.mode){ st.mode = c.mode; st.t = 0; st.serialN = -1; }
};
// a part left out by a fault stays in st.faults as missing:<id> until it is back on the board
const backOn = id => { st.faults = st.faults.filter(f => f !== 'missing:' + id); };
// polar parts sitting backwards: reported as reversed:<id> in state.faults for as long as they are
const reversedIds = () => MD.parts.filter(p => p.polar && isIn(p.id) && isRev(p.id)).map(p => p.id);
const faultsNow = () => [...st.faults, ...reversedIds().map(id => 'reversed:' + id)];
A.fault = id => {
  if (id == null){
    for (const f of st.faults) if (f.startsWith('missing:')){ const pid = f.slice(8); if (MD.byId[pid] && !isIn(pid)){ st.placed[pid] = { orient: 0, sold: true }; delete st.left[pid]; } }
    for (const pid of reversedIds()) st.placed[pid].orient = 0;
    st.faults = []; st.supply = {}; refresh(true); return;
  }
  if (typeof id !== 'string') return;
  const [kind, a, b] = id.split(':');
  // a part of the breadboard circuit (an id the board itself does not have): the circuit redraws without it, or turned
  // round, while the fault is on (bench-bb.js circuitNow)
  if ((kind === 'reversed' || kind === 'missing') && !MD.byId[a] && B.bbPart && B.bbPart(a)){ if (!st.faults.includes(id)) st.faults.push(id); refresh(true); return; }
  if (kind === 'reversed'){ const p = MD.byId[a]; if (!p || !p.polar) return say('{name} has no wrong way round', { name: a }); if (st.power) A.power(null); st.placed[a] = { orient: 1, sold: true }; refresh(); return; }
  if (kind === 'missing'){
    const p = MD.byId[a]; if (!p || p.fixed) return say('No part {name} on this board', { name: a });
    if (st.power) A.power(null);
    if (isIn(a)) A.remove(a);
    if (!isIn(a) && !st.faults.includes(id)) st.faults.push(id);
    refresh(); return;
  }
  if (kind === 'wrong-voltage'){ const v = +b; if (!(MD.power.sources || {})[a] || !Number.isFinite(v)) return say('Unknown supply {name}', { name: a }); st.supply[a] = v; }
  if (kind === 'reverse-polarity' && !(MD.power.sources || {})[a]) return say('Unknown supply {name}', { name: a });
  if (kind === 'brownout' && !brownout() && !listsFault('brownout')) return say('No 5 V pin to put a motor on here');
  if (!st.faults.includes(id)) st.faults.push(id);
  if (st.power && (MD.def.straps || []).some(x => x && x.fault === id)){ st.t = 0; st.serialN = -1; sampleStraps(); }
  refresh(true);
  // a fault the sketch survives (a 3V3 short) still says what it did
  if (st.power && st.ev.status === 'running' && st.ev.why) say(st.ev.why, null, 3200);
};
A.view = v => {
  if (v === 'iso') v = 'board';
  if (v === 'exploded'){ st.view = 'board'; A.explode(true); refresh(); return true; }
  if (v === 'see-through'){ st.view = 'board'; const b = document.getElementById('xrb'); if (b && !(ui && ui.st.xrT)) b.click(); refresh(); return true; }
  if (!['board', 'breadboard', 'schematic', 'power'].includes(v)) return false;
  st.view = v; refresh(); return true;
};
A.explode = on => { const want = on == null ? !st.exploded : !!on; if (want && st.power) return say(MSG.live); st.exploded = want; kick(); };
A.select = id => { st.sel = id && (MD.byId[id] || MAT.byId[id] || (B.bbPart && B.bbPart(id)) || (B.bbProp && B.bbProp(id))) ? id : null; refresh(); };
// set the mat out up to step sid (null: clear it); one step forward at a time, never on a live bench
A.matStep = sid => {
  const i = sid == null ? -1 : MAT.steps.findIndex(s => s.id === sid);
  if (sid != null && i < 0) return say('No mat step {name}', { name: sid });
  if (i > st.matStep + 1) return say('One step at a time: {name} first', { name: T(MAT.steps[st.matStep + 1].label) });
  if (i === st.matStep) return true;
  if (!guard()) return;
  st.matStep = i; sfx(i >= 0 ? 'place' : 'pop'); if (i >= 0) say(MAT.steps[i].label);
  refresh(); return true;
};
// tone() square waves from the host's sketch, by net in Hz (0 or missing: silent); the breadboard solver hands them to
// the buzzer on that net
A.setTones = tones => { st.tones = {}; for (const [k, v] of Object.entries(tones)){ const x = +v; if (typeof k === 'string' && k.length < 24 && Number.isFinite(x) && x > 0) st.tones[k] = clamp(x, 1, 20000); } refresh(); };
A.setPins = pins => { st.ext = true; for (const [k, v] of Object.entries(pins)){ const x = +v; if (typeof k === 'string' && k.length < 24 && Number.isFinite(x)) st.pins[k] = clamp(x, 0, 1); } refresh(); };

/* ---------- sound: figures emit sfx events; the host plays them (S10) ---------- */
const sfx = name => { st.sfx = { name, n: (st.sfx ? st.sfx.n : 0) + 1 }; try { if (window.CF_BRIDGE) CF_BRIDGE.send('sfx', { name }); } catch (e) {} };
B.sfx = n => sfx(n);

/* ---------- clock ---------- */
let looping = false;
const busy = () => st.power || st.reflowT != null || st.solderQ || st.up || Math.abs(st.exK - (st.exploded ? 1 : 0)) > 1e-3 || Object.values(st.drop).some(v => v < 1) || st.txT > 0;
function kick(){ if (looping || !ui) { ui && ui.render(); return; } looping = true; ui.animate(step); }
function step(dt){
  // build animations
  for (const id of Object.keys(st.drop)) if (st.drop[id] < 1) st.drop[id] = Math.min(1, st.drop[id] + dt / .35);
  if (st.reflowT != null){ st.reflowT += dt; if (st.reflowT > 1.3){ st.reflowT = null; for (const p of partsIn('smd')) if (isIn(p.id)) st.placed[p.id].sold = true; say('Reflow done: every SMD joint is soldered'); sfx('ding'); refresh(); } }
  if (st.solderQ){ st.solderT += dt; if (st.solderT > .42){ st.solderT = 0; const id = st.solderQ.shift(); if (st.placed[id]) st.placed[id].sold = true; sfx('tick');
      if (!st.solderQ.length){ st.solderQ = null; say('All joints soldered'); refresh(); } } }
  const ex = st.exploded ? 1 : 0; st.exK += clamp(ex - st.exK, -dt / .6, dt / .6);
  // the program clock
  if (st.power){
    st.t += dt; st.on += dt;
    // a UF2 copied to the mass-storage drive reboots the chip into it, and esptool hard-resets out of ROM download mode
    if (st.up){ st.upT += dt; if (st.upT >= st.upDur){ const key = st.up; st.up = null; st.mode = key; st.t = 0; st.serialN = -1; st.loaded = true;
        if (st.boot === 'uf2' || st.boot === 'download') st.boot = null; sampleStraps();
        say('Done uploading: {name} is running', { name: T(MD.modes[key].title) }); sfx('ding'); } }
    st.ev = evaluate();
    // the supply dropping out under the chip (a brown-out, a cold joint on the connector, a short cleared) resets it:
    // when it comes back the program starts again, after the board's brownoutLine for a brown-out
    const status = st.ev.status;
    if (st.down && status === 'running'){
      st.t = 0; st.serialN = -1; sampleStraps();
      // state.serial carries one line per report: the banner waits 0.1 s behind the brown-out line
      if (st.down === 'brownout' && MD.def.brownoutLine && !st.up && !st.ext){ emit(String(MD.def.brownoutLine)); st.t = -.1; }
    }
    st.down = status === 'brownout' || status === 'no-power' ? status : status === 'running' ? null : st.down;
    const md = MD.modes[st.mode];
    if (st.ev.status === 'running' && !st.up && !st.ext && md && !strapBlocks('serial')){
      const k = Math.floor(st.t);
      if (st.t >= 0 && k !== st.serialN){
        // state.serial carries one line per report: the banner goes out on its own frame (serialN -2), then line k
        // a banner may depend on the state (none in a ROM download mode): md.banner(st)
        const banner = st.serialN === -1 ? (typeof md.banner === 'function' ? md.banner(st) : md.banner) : null;
        if (banner){ emit(String(banner)); st.serialN = -2; }
        else {
          st.serialN = k;
          if (md.serial){ let line = null; try { line = md.serial(k, st); } catch (e) { note('serial: ' + e.message); } if (line != null) emit(String(line)); }
        }
      }
    }
  }
  if (st.txT > 0) st.txT = Math.max(0, st.txT - dt);
  st.o = outputs();
  if (B.bbStep) B.bbStep(st, dt);
  runModel(dt);
  const more = busy();
  if (!more) looping = false;
  return more;
}
// tests and the figure probe run the clock without waiting for frames
B.advance = (seconds, dt = 1 / 30) => { for (let t = 0; t < seconds - 1e-9; t += dt) step(Math.min(dt, seconds - t)); ui && ui.render(); };
const emit = line => { st.serial = { n: (st.serial ? st.serial.n : 0) + 1, line }; st.txT = .09; };

/* a bench's electrical behaviour in its own words: def.model(st, dt) runs after the outputs every frame (dt 0 on a state
   change); st.o.pins, st.ev.rails, st.meas, st.t, st.mode and st.matStep are its inputs. It returns
     { readings: {…}, status: 'text', stats: [[label, value]], meas: {partId: {…}}, report: {key: value},
       flow: {net: bool}, accent: [partId] }   (every field optional)
   readings go out as state.readings (numbers rounded) and to mat parts as their m; status as state.benchStatus and on
   the stats panel; stats on the stats panel while powered; meas merges over the breadboard solver's state.meas;
   report adds top-level state keys (state.levels…) the engine does not use itself; flow lights xr.flow paths and
   mat wires on those nets; accent rings those parts */
const modelErrs = new Set();
const modelNote = m => { if (!modelErrs.has(m)){ modelErrs.add(m); note('model: ' + m); } };
const obj = v => v && typeof v === 'object' && !Array.isArray(v) ? v : null;
function runModel(dt){
  const fn = MD.def.model;
  if (typeof fn !== 'function') return;
  let r = null;
  try { r = fn(st, dt); } catch (e) { modelNote(e.message); }
  st.readings = (r && obj(r.readings)) || {};
  st.benchStatus = r && typeof r.status === 'string' ? r.status : null;
  st.modelStats = r && Array.isArray(r.stats) ? r.stats.filter(x => Array.isArray(x) && x.length === 2) : [];
  st.modelReport = (r && obj(r.report)) || {};
  st.flow = (r && obj(r.flow)) || {};
  st.accent = r && Array.isArray(r.accent) ? r.accent.filter(id => typeof id === 'string') : [];
  if (r && obj(r.meas)) st.meas = Object.assign({}, st.meas || {}, r.meas);
}
const flowOn = net => !!(st.flow && st.flow[net]);
const roundDeep = v => typeof v === 'number' ? (Number.isFinite(v) ? Math.round(v * 1000) / 1000 : null)
  : Array.isArray(v) ? v.map(roundDeep) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, roundDeep(x)])) : v;
function refresh(newPower){
  if (!st) return;
  const prev = st.ev ? st.ev.status : 'off';
  st.ev = evaluate(); st.o = outputs();
  if (B.bbStep) B.bbStep(st, 0);
  runModel(0);
  if (newPower && st.power){
    const ev = st.ev;
    if (ev.status === 'fault' && prev !== 'fault'){ const fk = ev.fault.kind; if (fk !== 'boot') sfx(fk === 'pop' ? 'pop' : 'sizzle'); say(ev.fault.msg, null, 3200); }
    else if (ev.status === 'running' && prev !== 'running'){ const md = MD.modes[st.mode]; say(md && md.powerMsg ? md.powerMsg : 'Powered: {name} starts', { name: md ? T(md.title) : '' }); }
    else if (ev.why && ev.status !== prev) say(ev.why, null, 3000);
  }
  syncKeys();
  kick();
}
B.refresh = () => refresh();

/* ---------- drawing ---------- */
const pcbOutline = () => {
  const { w, h, r } = MD.pcb;
  if (MD.pcb.outline) return MD.pcb.outline;
  const rr = Math.min(r || 0, w / 2, h / 2), pts = [];
  const corner = (cx, cy, a0) => { for (let i = 0; i <= 4; i++){ const a = (a0 + i * 22.5) * Math.PI / 180; pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]); } };
  if (rr <= .05) return [[0, 0], [w, 0], [w, h], [0, h]];
  corner(w - rr, rr, 270); corner(w - rr, h - rr, 0); corner(rr, h - rr, 90); corner(rr, rr, 180);
  return pts;
};
B.pcbOutline = () => pcbOutline();
const area2 = pts => { let a = 0; for (let i = 0; i < pts.length; i++){ const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return a; };

function drawMat(x0, y0, x1, y1){
  // the cutting mat in board coordinates (x0..x1, y0..y1)
  const c = [BP(x0, y0, -G.top), BP(x1, y1, -G.top)];
  const wx0 = Math.min(c[0][0], c[1][0]), wx1 = Math.max(c[0][0], c[1][0]), wy0 = Math.min(c[0][1], c[1][1]), wy1 = Math.max(c[0][1], c[1][1]);
  let s = board(wx0, wy0, wx1, wy1, G.matH, 4, M.mat);
  let g = '';
  for (let x = Math.ceil(wx0 / 10) * 10; x < wx1; x += 10) g += `M${P(x, wy0 + 1, G.matH).map(f).join(' ')}L${P(x, wy1 - 1, G.matH).map(f).join(' ')}`;
  for (let y = Math.ceil(wy0 / 10) * 10; y < wy1; y += 10) g += `M${P(wx0 + 1, y, G.matH).map(f).join(' ')}L${P(wx1 - 1, y, G.matH).map(f).join(' ')}`;
  s += `<path d="${g}" fill="none" stroke="#a9b096" stroke-width=".5" opacity=".7"/>`;
  return { svg: s, top: boardTop(wx0, wy0, wx1, wy1, G.matH, 4) };
}
B.drawMat = drawMat;

function drawPCB(k){
  const pcb = MD.pcb, out = pcbOutline(), th = pcb.thick;
  const top = out.map(([x, y]) => BP(x, y, 0)), bot = out.map(([x, y]) => BP(x, y, -th));
  const sgn = Math.sign(area2(top.map(p => [p[0], p[1]]))) || 1, mm = matOf(pcb.color);
  const walls = [];
  for (let i = 0; i < out.length; i++){
    const j = (i + 1) % out.length, d = sub(top[j], top[i]), n = norm([d[1] * sgn, -d[0] * sgn, 0]);
    if (!vis(n)) continue;
    walls.push({ at: mean([top[i], top[j]]), svg: face(pd([bot[i], bot[j], top[j], top[i]]), toneI(n, { l: mm.m, m: mm.d, d: mix(mm.d, '#000000', .3) })) });
  }
  walls.sort((a, b) => depthOf(a.at) - depthOf(b.at));
  const op = 1 - .4 * k;
  let s = `<g opacity="${f(op)}">` + walls.map(w => w.svg).join('') + fill(pd(top), mm.l) + '</g>';
  // FR-4 core line on the visible edges and the outline
  s += `<path d="${pd(bot)}" fill="none" stroke="${INK}" stroke-width="1"/>` + ink(pd(top), 1.1);
  s += hullInk([...top, ...bot], 1.6);
  // copper traces under the mask
  const tcol = mix(mm.l, '#ffffff', .16);
  for (const tr of MD.def.traces || []) s += `<path d="${pd(tr.map(([x, y]) => BP(x, y, .02)), false)}" fill="none" stroke="${tcol}" style="stroke-width:.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  // mounting holes
  for (const [x, y, d = 3.2] of MD.def.holes || []){
    s += fill(pd(circ(x, y, d / 2 + 1.1).map(([u, v]) => BP(u, v, .03))), M.tin.l) + ink(pd(circ(x, y, d / 2 + 1.1).map(([u, v]) => BP(u, v, .03))), .5);
    s += fill(pd(circ(x, y, d / 2).map(([u, v]) => BP(u, v, .04))), M.hole);
  }
  // silkscreen
  for (const [x, y, str, size = 1.6, rot = 0] of MD.def.silk || []){
    const r = rot * Math.PI / 180;
    s += B.flatText(BP(x, y, .05), Math.cos(r), Math.sin(r), T(str), size * 1.3, pcb.silk, 800);
  }
  // footprints of parts that are off the board: pads and a silk outline
  for (const p of MD.parts){
    if (isIn(p.id) || p.side === 'bottom' || p.kind === 'passives') continue;
    const { ctx } = partCtx(Object.assign({}, p, { z: 0 }), st, {});
    const [l, w] = p.size;
    s += `<path d="${pd([[-l / 2, -w / 2], [l / 2, -w / 2], [l / 2, w / 2], [-l / 2, w / 2]].map(([a, b]) => ctx.W(a, b, .05)))}" fill="none" stroke="${pcb.silk}" stroke-width=".7" stroke-dasharray="1.5 1.2" opacity=".85"/>`;
    const kd = B.kinds[p.kind]; if (kd.pads) s += kd.pads(ctx);
  }
  return { svg: s, top, bot };
}

function drawParts(o, k){
  const items = [];
  const ex = ease(clamp(st.exK, 0, 1));
  for (const p of MD.parts){
    if (!isIn(p.id)) continue;
    const kd = B.kinds[p.kind];
    const drop = st.drop[p.id] != null ? clamp(st.drop[p.id], 0, 1) : 1;
    const lift = (LIFT[p.group] || 0) * ex + (1 - ease(drop)) * 14;
    const fault = st.ev.fault && st.ev.fault.part === p.id ? st.ev.fault.kind : null;
    const opt = { lift, k, lit: o.leds[p.id] || 0, rev: isRev(p.id), sel: st.sel === p.id || (st.accent || []).includes(p.id), hot: fault === 'hot', pop: fault === 'pop',
      on: !!(st.ctl[p.id]), sold: isSet(p.id), o };
    const { ctx, items: its } = partCtx(p, st, opt);
    try { kd.draw(ctx); } catch (e) { note(`${p.id} (${p.kind}): ${e.message}`); }
    if (k > 0 && kd.xr) try { kd.xr(ctx); } catch (e) { note(`${p.id} xr: ${e.message}`); }
    const actName = p.control ? 'ctl' : 'part', data = `data-id="${CF_ESC(p.id)}" data-label="${CF_ESC(p.name)}"`;
    for (const it of its){
      let svg = it.svg;
      if (opt.sel) svg = `<g class="bsel">${svg}</g>`;
      if (opt.hot) svg = `<g filter="url(#bhot)">${svg}</g>`;
      items.push({ box: it.box, svg: act(actName, svg, data) });
    }
    // the soldering iron visits the part being soldered
    if (st.solderQ && st.solderQ[0] === p.id){ const tp = ctx.W(0, 0, p.h + 2); items.push({ box: [[tp[0] - 1, tp[1] - 1, tp[2]], [tp[0] + 1, tp[1] + 1, tp[2] + 30]], svg: ironSvg(tp) }); }
    if ((fault === 'hot' || fault === 'pop') && st.power) items.push({ box: [ctx.W(0, 0, p.h + 1), ctx.W(0, 0, p.h + 1)].map((q, i) => i ? q.map(v => v + 1) : q), svg: smokeSvg(ctx, p) });
  }
  return items;
}
const ironSvg = tp => {
  const a = [tp[0], tp[1], tp[2]], b = [tp[0] + 10, tp[1] + 14, tp[2] + 26];
  return rod(a, [tp[0] + 2.5, tp[1] + 3.5, tp[2] + 6.5], .5, M.steel, toneI, .7, .2) + rod([tp[0] + 2.5, tp[1] + 3.5, tp[2] + 6.5], b, 1.6, matOf('#3f6fb5'), toneI, 1)
    + `<circle cx="${f(P(...a)[0])}" cy="${f(P(...a)[1])}" r="1.4" fill="#ffd27a" opacity=".9"/>`;
};
const smokeSvg = (ctx, p) => {
  const t = st.t; let s = '';
  for (let i = 0; i < 4; i++){ const ph = (t * .7 + i / 4) % 1, [X, Y] = ctx.P(0, 0, p.h + 1 + ph * 16);
    s += `<circle cx="${f(X + Math.sin(i * 2 + t) * 2.5)}" cy="${f(Y)}" r="${f(1.6 + ph * 4)}" fill="#8a847a" opacity="${f(.45 * (1 - ph))}"/>`; }
  return s;
};

/* the plug and cable for the connected source */
function drawSupply(){
  const src = st.power ? MD.power.sources[st.power] : null;
  if (!src || !src.part || !isIn(src.part)) return [];
  const p = MD.byId[src.part], kd = B.kinds[p.kind];
  if (!kd.plug) return [];
  const { ctx, items } = partCtx(p, st, { lift: 0 });
  try { kd.plug(ctx, src, st.faults.includes('reverse-polarity:' + st.power)); } catch (e) { note('plug: ' + e.message); }
  return items;
}

function drawTags(k){
  let s = '';
  if (k > .6) return s;
  for (const [id, dx, dy] of MD.def.tags || []){
    const p = MD.byId[id]; if (!p || !isIn(id)) continue;
    const { ctx } = partCtx(p, st, { lift: (LIFT[p.group] || 0) * ease(clamp(st.exK, 0, 1)) });
    const working = (st.o.leds[id] || 0) > .5 || (st.ev.status === 'running' && MD.power.mcu && MD.power.mcu.part === id) || st.sel === id;
    s += tag(ctx.W(0, 0, p.h), dx, dy, p.short || p.name, working);
  }
  return s;
}
function xrLayer(k){
  if (k < .05) return '';
  let s = '';
  const t = st.t || 0;
  for (const [net, path] of (MD.def.xr && MD.def.xr.flow) || []){
    const live = (st.ev.rails[net] || 0) > .5 || (st.o.pins[net] || 0) > .5 || flowOn(net);
    const pts = path.map(([x, y]) => BP(x, y, .3));
    s += `<path d="${pd(pts, false)}" fill="none" stroke="#f7a531" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="${f(.55 * k)}"/>`;
    if (!live) continue;
    let len = 0; const seg = []; for (let i = 1; i < pts.length; i++){ const d = Math.hypot(...sub(pts[i], pts[i - 1])); seg.push(d); len += d; }
    for (let j = 0; j < Math.max(2, Math.floor(len / 9)); j++){
      let u = ((t * 14 + j * 9) % len); let i = 0; while (i < seg.length - 1 && u > seg[i]){ u -= seg[i]; i++; }
      const a = pts[i], b2 = pts[i + 1] || a, q = seg[i] ? u / seg[i] : 0, pt = a.map((v, kk) => v + (b2[kk] - v) * q), [X, Y] = P(...pt);
      s += `<circle cx="${f(X)}" cy="${f(Y)}" r="1.3" fill="#ffd34d" stroke="${INK}" stroke-width=".5" opacity="${f(k)}"/>`;
    }
  }
  return s;
}
function xrNotes(k){
  if (k <= .6) return '';
  const items = [];
  for (const p of MD.parts){
    if (!isIn(p.id)) continue;
    const kd = B.kinds[p.kind]; if (!kd.xr) continue;
    const notes = (MD.def.xr && MD.def.xr.notes) || [], note2 = notes.find(n => n[0] === p.id);
    if (notes.length ? !note2 : !kd.xrLabel) continue;
    const { ctx } = partCtx(p, st, {});
    items.push({ at: ctx.W(0, 0, p.h), text: note2 ? note2[1] : kd.xrLabel(p), on: (st.o.leds[p.id] || 0) > .5 || (MD.power.mcu && MD.power.mcu.part === p.id && st.ev.status === 'running') });
  }
  if (!items.length) return '';
  items.splice(8);
  const pc = [BP(0, 0, 0), BP(MD.pcb.w, MD.pcb.h, MD.height)];
  LBL.items.push(...items);
  LBL.box = growBox(LBL.box, [[Math.min(pc[0][0], pc[1][0]), Math.min(pc[0][1], pc[1][1]), G.top], [Math.max(pc[0][0], pc[1][0]), Math.max(pc[0][1], pc[1][1]), G.top + 10]]);
  return '';
}
/* callouts: the board's notes (xrNotes) and the see-through labels of breadboard and mat parts, whose draw calls
   ctx.label(at, text, on). scene() lays them all out last, in two columns beside what they label (xrCallouts), outside
   any view scaling, so pills never overlap each other or sit under the drawing */
const LBL = { items: [], box: null };
const growBox = (box, b) => box ? [box[0].map((v, i) => Math.min(v, b[0][i])), box[1].map((v, i) => Math.max(v, b[1][i]))] : [b[0].slice(), b[1].slice()];
// one part's labeller: label() queues its callouts, done(boxes) adds them with the part's drawn boxes as their bounds
B.labeller = () => {
  const mine = [];
  return { label: (at, text, on) => { if (Array.isArray(at) && at.length === 3 && text) mine.push({ at, text, on: !!on }); },
    done: boxes => { if (!mine.length) return; LBL.items.push(...mine); for (const b of boxes) if (b) LBL.box = growBox(LBL.box, b); } };
};

/* things on the mat: a periph board is drawn in its own frame (G and B.md swapped while it draws) */
function inFrame(it, fn){
  const s = { ox: G.ox, oy: G.oy, pw: G.pw, ph: G.ph, z0: G.z0, top: G.top }, md0 = B.md, pc = it.md.pcb;
  G.ox = s.ox + s.ph - it.at[1] - pc.h; G.oy = s.oy + s.pw - it.at[0] - pc.w; G.pw = pc.w; G.ph = pc.h;
  G.z0 = G.matH + pc.standoff; G.top = G.z0 + pc.thick; B.md = it.md;
  try { return fn(); } finally { Object.assign(G, s); B.md = md0; }
}
const matErrs = new Set();
const matNote = m => { if (!matErrs.has(m)){ matErrs.add(m); note(m); } };
const periphData = it => `data-id="${CF_ESC(it.id)}" data-label="${CF_ESC(it.name)}"`;
function periphBoard(it, k, live){
  return inFrame(it, () => {
    const pc = it.md.pcb, items = [], data = periphData(it), sel = st.sel === it.id || (st.accent || []).includes(it.id);
    const wrap = svg => act('periph', sel ? `<g class="bsel">${svg}</g>` : svg, data);
    items.push({ box: aabb([BP(0, 0, -pc.thick), BP(pc.w, pc.h, 0)]), svg: wrap(slabW(BP, 0, 0, pc.w, pc.h, -pc.thick, 0, matOf(pc.color))) });
    for (const [x, y] of [[1.5, 1.5], [pc.w - 1.5, 1.5], [1.5, pc.h - 1.5], [pc.w - 1.5, pc.h - 1.5]]){
      const w = BP(x, y, 0); items.push({ box: [[w[0] - 1, w[1] - 1, G.matH], [w[0] + 1, w[1] + 1, G.z0]], svg: cyl(w[0], w[1], G.matH, G.z0, 1.1, M.gold, toneI, .6, 10) });
    }
    const o = { pins: {}, leds: {}, ev: st.ev };
    for (const p of it.md.parts){
      const kd = B.kinds[p.kind], lit = p.led && p.led.rail && live ? 1 : 0;
      const { ctx, items: its } = partCtx(p, st, { k, lit, sold: true, o });
      try { kd.draw(ctx); } catch (e) { matNote(`periph ${it.id} ${p.id}: ${e.message}`); }
      for (const x of its) items.push({ box: x.box, svg: wrap(x.svg) });
    }
    return items;
  });
}
const legsOf = it => {
  const n = (it.def.legs || []).length, z = G.matH - G.top;
  const pts = it.q.legs || Array.from({ length: n }, (_, i) => [it.at[0] + it.w * (i + 1) / (n + 1), it.at[1]]);
  return pts.map(([x, y]) => BP(x, y, z));
};
function periphPart(it, k, live){
  const z = G.matH - G.top, items = [], sel = st.sel === it.id || (st.accent || []).includes(it.id), legs = legsOf(it);
  const p = Object.assign({ id: it.id, part: it.q.part }, it.def.example || {}, it.q.params || {});
  const pl = { at: (x, y, zz = z) => BP(it.at[0] + x, it.at[1] + y, zz), zTop: z, geo: null };
  const put = (bx, svg) => { if (svg) items.push({ box: bx, svg: act('periph', sel ? `<g class="bsel">${svg}</g>` : svg, periphData(it)) }); };
  const lb = B.labeller();
  try { it.def.draw({ p, st, legs, holes: [], origin: BP(it.at[0] + it.w / 2, it.at[1] + it.h / 2, z), pl, m: (st.readings || {})[it.id] || {}, lit: live ? 1 : 0, sel, k, put, label: lb.label }); }
  catch (e) { matNote(`periph ${it.id} (${it.q.part}): ${e.message}`); }
  lb.done(items.map(x => x.box));
  return items;
}
// a wire end in world coordinates, and the base net it sits on (for the live colour)
function matEnd(ref){
  const m = /^([A-Za-z_][\w-]*)\.(.+)$/.exec(ref), it = m && MAT.byId[m[1]];
  if (it && it.kind === 'board'){
    const pmd = it.md, pin = pmd.pins[m[2]] || (pmd.netPins[m[2]] || []).map(id => pmd.pins[id])[0] || Object.values(pmd.pins).find(q => q.label === m[2]);
    if (!pin) return null;
    const part = pmd.byId[pin.part];
    return { pt: inFrame(it, () => BP(pin.at[0], pin.at[1], part && part.side === 'bottom' ? .5 : (part ? part.h + (part.z || 0) - 2 : 1))), net: null };
  }
  if (it){ const i = (it.def.legs || []).indexOf(m[2]); return i < 0 ? null : { pt: legsOf(it)[i], net: null }; }
  const pin = MD.pins[ref] || (MD.netPins[ref] ? MD.pins[MD.netPins[ref][0]] : null);
  if (!pin) return null;
  const part = MD.byId[pin.part];
  return { pt: BP(pin.at[0], pin.at[1], part && part.side === 'bottom' ? -MD.pcb.thick : (part ? part.h + (part.z || 0) - 2 : 1)), net: pin.net, pin };
}
function matItems(k){
  if (!MAT.items.length && !MAT.wires.length) return [];
  const items = [], live = !!st.power && Object.values(st.ev.rails).some(v => v > .5);
  for (const it of MAT.items) if (stepOn(it.step)) items.push(...(it.kind === 'board' ? periphBoard(it, k, live) : periphPart(it, k, live)));
  const wire = B.parts.wire;
  if (wire) for (const w of MAT.wires){
    if (!stepOn(w.step)) continue;
    const a = matEnd(w.from), b = matEnd(w.to);
    if (!a || !b){ matNote(`wire ${w.from}-${w.to}: unknown end`); continue; }
    const net = a.net || b.net, on = !!net && ((st.o.pins[net] || 0) > .5 || (st.ev.rails[net] || 0) > .5 || flowOn(net));
    const pin = a.pin || b.pin;
    wire.draw({ a: a.pt, b: b.pt, color: w.color || 'green', live: on, k, put: (bx, svg) => items.push({ box: bx, svg: act('pin', svg,
      `data-id="${CF_ESC(pin ? pin.id : w.from)}" data-part="${CF_ESC(pin ? pin.part : '')}" data-label="${CF_ESC(T('Wire from {a} to {b}', { a: w.from, b: w.to }))}"`) }) });
  }
  return items;
}
// the mat's extent in base board mm: the board's margins, grown to hold every periph (set out or not, so the frame never jumps)
const matBox = () => {
  const m = MD.mat, box = [-m.left, -m.front, MD.pcb.w + m.right, MD.pcb.h + m.back];
  for (const it of MAT.items){ box[0] = Math.min(box[0], it.at[0] - 6); box[1] = Math.min(box[1], it.at[1] - 6); box[2] = Math.max(box[2], it.at[0] + it.w + 6); box[3] = Math.max(box[3], it.at[1] + it.h + 6); }
  return box;
};

// the tallest thing on the mat, in board z: the board, or a periph standing higher (a TT motor's wheel, a module on
// its standoffs), so the frame holds it at every step of the mat
const matTop = () => {
  let h = MD.height;
  for (const it of MAT.items){
    if (it.kind === 'board') h = Math.max(h, G.matH + it.md.pcb.standoff + it.md.pcb.thick + it.md.height - G.top);
    else { const ft = Array.isArray(it.def.foot) ? it.def.foot[2] : +it.def.height; if (ft > 0) h = Math.max(h, G.matH - G.top + ft); }
  }
  return h;
};
/* the board view (also the base of the breadboard view) */
B.boardItems = (o, k) => [...drawParts(o, k), ...drawSupply()];
B.drawBoardBase = k => drawPCB(k);
function sceneBoard(k){
  if (MD.def.noBoard) return VIEWS.breadboard ? VIEWS.breadboard.scene(k) : '';
  const mat = drawMat(...matBox());
  const pcb = drawPCB(k);
  let s = mat.svg;
  // standoffs (none on a board that stands on its header pins: pcb.standoffs false), then the PCB's shadow on the mat
  if (MD.pcb.standoffs !== false) for (const [x, y] of MD.def.holes || []){ const w = BP(x, y, 0); s += cyl(w[0], w[1], G.matH, G.z0, 2.3, M.gold, toneI, .8, 12); }
  s += castShadow([...pcb.top, ...pcb.bot], G.matH, mat.top);
  s += pcb.svg;
  const items = [...B.boardItems(st.o, k), ...matItems(k)];
  s += byDepth(items);
  s += xrLayer(k) + drawTags(k) + xrNotes(k);
  return s;
}

/* views share one frame: each view's bounds are fitted into the frame the core computed at mount */
const VIEWS = {};
B.viewDef = (name, def) => { VIEWS[name] = def; };
let fitCache = {};
function viewFit(name, corners){
  // scale at the default camera so turning does not breathe; centre on the rotation centre
  if (!fitCache[name]){
    const saveY = YAW, saveP = PITCH; setCam(YAW0, PITCH0);
    const ext = cs => { const pts = cs.map(c => P(...c)); const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); return [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]; };
    const base = ext(B.boxCorners(VIEWS[B.mountView || 'board'].bounds())), cur = ext(corners);
    fitCache[name] = Math.min(base[0] / cur[0], base[1] / cur[1], 1);
    setCam(saveY, saveP);
  }
  return fitCache[name];
}
B.boxCorners = ([x0, y0, z0, x1, y1, z1]) => { const c = []; for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) c.push([x, y, z]); return c; };
const strokeDiv = (svg, s) => s === 1 ? svg : svg.replace(/stroke-width="([\d.]+)"/g, (m, w) => `stroke-width="${(+w / s).toFixed(3)}"`).replace(/r="([\d.]+)"/g, (m, r) => m);
B.viewDef('board', {
  bounds: () => { const [x0, y0, x1, y1] = matBox(), h = matTop(), a = BP(x0, y0, -G.top), b = BP(x1, y1, h); return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), 0, Math.max(a[0], b[0]), Math.max(a[1], b[1]), G.top + h]; },
  scene: k => sceneBoard(k),
});

const fadeToFrame = svg => {
  const el = document.getElementById('fig'), vb = el && el.viewBox && el.viewBox.baseVal;
  if (!vb || !vb.width) return svg;
  const r = `x="${f(vb.x)}" y="${f(vb.y)}" width="${f(vb.width)}" height="${f(vb.height)}"`;
  return `<defs><radialGradient id="bpfade" cx=".5" cy=".5" r=".5"><stop offset=".68" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>`
    + `<mask id="bpmask" maskUnits="userSpaceOnUse" ${r}><rect ${r} fill="url(#bpfade)"/></mask></defs><g mask="url(#bpmask)">${svg}</g>`;
};
function scene(stt){
  const k = ease(stt.xr || 0);
  const v = VIEWS[stt.view] ? stt.view : 'board';
  const vd = VIEWS[v];
  if (vd.flat) return vd.scene(k);
  const bnd = vd.bounds(), corners = B.boxCorners(bnd);
  // the breadboard view is fitted per circuit: a motor on the mat needs a wider frame than a blinking LED
  const sc = v === (B.mountView || 'board') ? 1 : viewFit(v === 'breadboard' ? v + ':' + stt.circuit : v, corners);
  LBL.items = []; LBL.box = null;
  let svg = vd.scene(k), map = w => w;
  if (sc !== 1){
    const c3 = [(bnd[0] + bnd[3]) / 2, (bnd[1] + bnd[4]) / 2, (bnd[2] + bnd[5]) / 2], pc = P(...c3), rc = P(RC[0], RC[1], RCZ);
    svg = `<g transform="translate(${f(rc[0])} ${f(rc[1])}) scale(${sc.toFixed(4)}) translate(${f(-pc[0])} ${f(-pc[1])})">${strokeDiv(svg, sc)}</g>`;
    // P is affine, so the world point RC + sc·(w − c3) lands where the scaled drawing put w
    map = w => [RC[0] + sc * (w[0] - c3[0]), RC[1] + sc * (w[1] - c3[1]), RCZ + sc * (w[2] - c3[2])];
  }
  // a part page is framed on its part (bench-bb.js partFrame): the breadboard and mat round it fade out at the frame
  if (MD.def.partPage) svg = fadeToFrame(svg);
  if (LBL.items.length && LBL.box){
    const a = map(LBL.box[0]), b = map(LBL.box[1]);
    svg += xrCallouts(LBL.items.map(it => Object.assign({}, it, { at: map(it.at) })), [a[0], b[0], a[1], b[1], a[2], b[2]]);
  }
  return svg;
}

/* ---------- buttons, stats, acts ---------- */
const statusText = () => {
  const s = st.ev.status;
  if (st.up) return T('UPLOADING');
  return T({ off: 'OFF', 'no-power': 'NO POWER', powered: 'POWERED', running: 'RUNNING', brownout: 'BROWN-OUT', fault: 'FAULT', reset: 'IN RESET' }[s] || s);
};
const GROUP_NAMES = { low: 'All low parts', tall: 'All tall parts', last: 'All last parts' };
const PRESET_OHMS = [100, 220, 330, 1000, 4700, 10000, 100000];
const PARAM_NAMES = { color: 'Colour', ohms: 'Value', pos: 'Knob position', lux: 'Light level', turned: 'Turned round', pressed: 'Pressed' };
// picker values for a numeric range: the usual resistor values, two states for an on/off number, decades for wide ranges
const rangeSteps = (k, [lo, hi]) => {
  if (k === 'ohms') return PRESET_OHMS.filter(v => v >= lo && v <= hi);
  if (/^(pressed|on|closed|down)$/.test(k)) return [lo, hi];
  if (lo >= 0 && hi / Math.max(lo, 1) >= 1000){ const out = lo === 0 ? [0] : []; for (let v = Math.max(lo, 1); v <= hi; v *= 10) out.push(v); return out; }
  return [0, .25, .5, .75, 1].map(f => +(lo + (hi - lo) * f).toPrecision(3));
};
function partButtons(){
  const pp = MD.def.partPage, def = B.parts[pp.name], c = MD.circuits[st.circuit], bt = [];
  // a choice changes the selected part, or the first one when nothing is selected
  const target = () => (c.parts || []).find(q => q.id === st.sel) || (c.parts || [])[0];
  for (const [k, spec] of Object.entries(def.params || {})){
    const vals = def.steps && Array.isArray(def.steps[k]) ? def.steps[k] : B.paramRange(spec) ? rangeSteps(k, spec) : spec;
    const onoff = typeof spec[0] === 'boolean' || /^(pressed|on|closed|down)$/.test(k);
    const show = v => onoff ? T(v ? 'yes' : 'no') : k === 'ohms' ? B.ohmsText(v) : k === 'lux' ? v + ' lx' : k === 'pos' ? Math.round(v * 100) + ' %' : T(String(v));
    bt.push({ id: k, label: (def.paramNames && def.paramNames[k]) || PARAM_NAMES[k] || k[0].toUpperCase() + k.slice(1), choices: () => vals.map(v => ({ id: CF_SLUG(String(v)), label: show(v),
      onClick: () => { const q = target(); if (!q) return; B.bbParams(st, { [q.id]: { [k]: v } }); say('{part} is now {value}', { part: q.id, value: show(v) }); } })) });
  }
  return bt;
}
let ctlFolded = {};
const ctlWork = p => () => { A.press(p.id, true); if (p.control.type !== 'slide') setTimeout(() => A.press(p.id, false), 260); };
const keepFolded = () => {
  const box = document.createElement('div'); box.hidden = true; box.id = 'ctlkeep';
  for (const [cid, p] of Object.entries(ctlFolded)){ const b = document.createElement('button'); b.className = 'act'; b.dataset.id = cid; b.tabIndex = -1;
    b.textContent = p.short || p.id; b.onclick = () => { ctlWork(p)(); ui.render(); }; box.appendChild(b); }
  if (box.children.length) document.body.appendChild(box);
};
function buttons(){
  if (MD.def.noBoard) return MD.def.partPage ? partButtons() : [];
  const bt = [];
  const srcs = Object.entries(MD.power.sources || {});
  bt.push({ id: 'power', label: 'Power', choices: () => [
    ...srcs.map(([key, s]) => ({ id: key, label: s.label || key, current: st.power === key, onClick: () => A.power(key) })),
    { id: 'off', label: 'Unplug', current: !st.power, onClick: () => A.power(null) }] });
  const modes = Object.entries(MD.modes);
  // a bench whose modes are positions, not sketches, names the picker: modesLabel { button: 'Move jumper', stat: 'Jumper' }
  if (modes.length) bt.push({ id: 'upload', label: (MD.def.modesLabel && MD.def.modesLabel.button) || 'Upload sketch', choices: () => modes.map(([key, md]) => ({ id: key, label: md.title || key, current: st.mode === key && !st.ext, onClick: () => A.upload(key) })) });
  // a control is a button of its own, ctl-<id>; more than four of a type fold into one picker (an FPGA board's 16
  // switches), each choice still ctl-<id>, and each keeps a hidden ctl-<id> button too (keepFolded), so a host or a
  // content step that presses ctl-sw0 still reaches it
  const ctls = MD.parts.filter(p => p.control), slide = p => p.control.type === 'slide';
  ctlFolded = {};
  for (const [kind, label] of [['slide', T('Flip a switch')], ['press', T('Press a button')]]){
    const group = ctls.filter(p => slide(p) === (kind === 'slide'));
    if (group.length > 4){
      for (const p of group) ctlFolded['ctl-' + p.id.toLowerCase()] = p;
      bt.push({ id: 'ctl-' + kind, label, choices: () => group.map(p => ({ id: 'ctl-' + p.id.toLowerCase(), label: p.short || p.id, onClick: ctlWork(p) })) });
    } else for (const p of group) bt.push({ id: 'ctl-' + p.id.toLowerCase(), label: slide(p) ? T('Flip {name}', { name: p.short || p.id }) : T('Press {name}', { name: p.short || p.id }), onClick: ctlWork(p) });
  }
  bt.push({ id: 'strip', label: 'Strip to bare PCB', onClick: () => A.strip() });
  if (partsIn('smd').length) bt.push({ id: 'pnp', label: 'Pick & place SMD', onClick: () => A.pnp() });
  if (MAT.steps.length) bt.push({ id: 'mat', label: 'Set up the mat', choices: () => MAT.steps.map((s, i) => ({ id: s.id, label: s.label, current: st.matStep >= i, onClick: () => A.matStep(s.id) })) });
  bt.push({ id: 'place', label: 'Place a part', choices: () => {
    const out = [];
    for (const g of ['low', 'tall', 'last']){
      const all = MD.parts.filter(p => p.group === g && !p.fixed);
      if (all.length > 1){ const left = all.filter(p => !isIn(p.id)).length;
        out.push({ id: 'group-' + g, label: T(GROUP_NAMES[g]), disabled: !left, why: left ? undefined : T('Every part is on the board'), onClick: () => A.placeGroup(g) }); }
    }
    for (const p of MD.parts){
      if (isIn(p.id) || p.fixed) continue;
      const nm = p.id + ' · ' + T(p.name);
      if (p.polar){ const op = p.polar.opts || ['right way round', 'wrong way round'];
        out.push({ id: p.id.toLowerCase(), label: nm + ' · ' + T(op[0]), onClick: () => A.place(p.id, 0) });
        out.push({ id: p.id.toLowerCase() + '-rev', label: nm + ' · ' + T(op[1]), onClick: () => A.place(p.id, 1) }); }
      else out.push({ id: p.id.toLowerCase(), label: nm, onClick: () => A.place(p.id, 0) });
    }
    return out.some(c => !c.disabled) ? out : [{ id: 'none', label: 'Every part is on', disabled: true, why: 'Every part is on the board' }];
  } });
  bt.push({ id: 'solder', label: 'Solder joints', onClick: () => A.solder() });
  bt.push({ id: 'remove', label: 'Remove a part', choices: () => MD.parts.filter(p => isIn(p.id) && !p.fixed).map(p => ({ id: p.id.toLowerCase(), label: p.id + ' · ' + T(p.name), onClick: () => A.remove(p.id) })) });
  bt.push({ id: 'break', label: 'Break it', choices: () => faultChoices().map(([id, label]) => ({ id: id ? CF_SLUG(id) : 'repair', label, current: faultsNow().includes(id), onClick: () => A.fault(id) })) });
  bt.push({ id: 'view', label: 'View', choices: () => [
    { id: 'board', label: 'Board', current: st.view === 'board' && !st.exploded, onClick: () => { A.explode(false); A.view('board'); } },
    ...(Object.keys(MD.circuits).length && VIEWS.breadboard ? [{ id: 'breadboard', label: 'Breadboard', current: st.view === 'breadboard', onClick: () => A.view('breadboard') }] : []),
    ...(VIEWS.schematic ? [{ id: 'schematic', label: 'Schematic', current: st.view === 'schematic', onClick: () => A.view('schematic') }] : []),
    ...(VIEWS.power ? [{ id: 'power', label: 'Power tree', current: st.view === 'power', onClick: () => A.view('power') }] : []),
    { id: 'exploded', label: 'Exploded view', current: st.exploded, onClick: () => { A.view('board'); A.explode(); } }] });
  return bt;
}
// the generic brown-out break (a motor on the MCU's supply pin): on with power.mcu, unless power.brownout is false.
// A board or bench that lists its own 'brownout' in faults models it itself (the LED trainer's supply limit).
function brownout(){ return !!(MD.power.mcu && MD.power.brownout !== false); }
const listsFault = id => (MD.def.faults || []).some(fd => (Array.isArray(fd) ? fd[0] : fd) === id);
function faultChoices(){
  const out = [['', '']]; out.length = 0;
  const srcs = MD.power.sources || {};
  for (const [key, s] of Object.entries(srcs)){
    // a scenario source (a sensor's 5 V output on a pin, set up by a lesson) is not a supply to get wrong
    if (s.scenario) continue;
    if (s.plug === 'barrel' || s.pin) out.push(['reverse-polarity:' + key, T('Reverse polarity on {src}', { src: T(s.label || key) })]);
    if (s.range){ out.push([`wrong-voltage:${key}:${s.max != null ? s.max + 4 : s.range[1] * 2}`, T('Too high a voltage on {src}', { src: T(s.label || key) })]);
      out.push([`wrong-voltage:${key}:${Math.max(1, +(s.range[0] * .7).toFixed(1))}`, T('Too low a voltage on {src}', { src: T(s.label || key) })]); }
  }
  if (brownout() && !listsFault('brownout')) out.push(['brownout', T(typeof MD.power.brownout === 'string' ? MD.power.brownout : 'Motor on the 5 V pin (brown-out)')]);
  for (const p of MD.parts) if (p.polar && !p.fixed) out.push(['reversed:' + p.id, T('{name} in backwards', { name: p.id })]);
  for (const fd of MD.def.faults || []){
    const [id, label] = Array.isArray(fd) ? fd : [fd, null];
    if (typeof id === 'string' && !out.some(o => o[0] === id)) out.push([id, label ? T(label) : faultLabel(id)]);
  }
  // six cold joints the board doesn't list itself: a control and an LED first, then in part order
  const pool = MD.parts.filter(p => (p.led || p.control || (MD.power.mcu && (MD.power.mcu.needs || []).includes(p.id))) && !out.some(o => o[0] === 'cold:' + p.id));
  const cold = [...new Set([pool.find(p => p.control), pool.find(p => p.led), ...pool].filter(Boolean))].slice(0, 6);
  for (const p of cold) out.push(['cold:' + p.id, T('Cold joint on {name}', { name: p.id })]);
  out.push(['', T('Repair everything')]);
  return out.map(([id, label]) => [id || null, label]);
}
B.faultChoices = () => faultChoices();
// a Break it label for a listed fault that brings none: 'short:5V:GND' reads "Short from 5V to GND"
function faultLabel(id){
  const [kind, a, b] = id.split(':');
  if (kind === 'short' && a && b) return T('Short from {a} to {b}', { a, b });
  if (kind === 'missing' && a) return T('Leave out {name}', { name: a });
  if (kind === 'reversed' && a) return T('{name} in backwards', { name: a });
  if (kind === 'cold' && a) return T('Cold joint on {name}', { name: a });
  if (kind === 'strap' && a) return T('Wrong level on {name} at reset', { name: a });
  if (kind === 'gpio5v' && a) return T('5 V into {name} (a 3.3 V pin)', { name: a });
  if (kind === 'wrong-voltage' && a && b){ const s = (MD.power.sources || {})[a]; return T('{v} V on {src}', { v: b, src: T((s && s.label) || a) }); }
  if (kind === 'reverse-polarity' && a){ const s = (MD.power.sources || {})[a]; return T('Reverse polarity on {src}', { src: T((s && s.label) || a) }); }
  return T(id);
}
function stats(){
  if (MD.def.noBoard) return [];
  const out = [{ label: T('Status'), value: statusText() }];
  const mcu = MD.power.mcu;
  if (mcu && st.power) out.push({ label: mcu.rail, value: (st.ev.rails[mcu.rail] || 0).toFixed(1) + ' V', small: true });
  if (st.ev.status === 'running' && MD.modes[st.mode]) out.push({ label: T((MD.def.modesLabel && MD.def.modesLabel.stat) || 'Program'), value: st.ext ? T('your sketch') : T(MD.modes[st.mode].title), small: true });
  if (st.benchStatus) out.push({ label: T('Bench'), value: T(st.benchStatus), small: true });
  if (st.power) for (const [label, value] of st.modelStats || []) out.push({ label: T(String(label)), value: typeof value === 'number' ? String(+value.toFixed(2)) : T(String(value)), small: true });
  document.documentElement.classList.toggle('bstats-long', out.length > 4);
  return out;
}

/* ---------- bridge ---------- */
// input controls (buttons A/B, switches) with a net: the level each net reads now, for the host's running program.
// `active` is the level while pressed or switched on: 0 for a button with a pull-up.
const inputParts = () => MD.parts.filter(p => p.control && p.control.action === 'input' && p.control.net);
const inputLevels = () => {
  const out = {};
  for (const p of inputParts()){ const active = p.control.active === 0 ? 0 : 1; out[p.control.net] = st.ctl[p.id] ? active : 1 - active; }
  return out;
};
const report = () => {
  const r = {};
  for (const [k, v] of Object.entries(st.ev.rails)) r[k] = Math.round(v * 10) / 10;
  const leds = {}; for (const [k, v] of Object.entries(st.o.leds)) leds[k] = v > .5 ? 1 : 0;
  const placed = MD.parts.filter(p => isIn(p.id)), sold = placed.filter(p => isSet(p.id));
  const build = !placed.length || placed.every(p => p.fixed) ? 'bare' : sold.length === MD.parts.length ? 'assembled'
    : MD.parts.filter(p => p.group !== 'last').every(p => isSet(p.id) || st.left[p.id]) ? 'soldered'
    : partsIn('smd').every(p => isSet(p.id) || st.left[p.id]) ? (MD.parts.some(p => p.group !== 'smd' && isIn(p.id)) ? 'tht' : 'reflowed') : 'smd';
  const ev = st.ev;
  const r0 = { id: MD.id, view: st.view, exploded: st.exploded, build, power: st.power, status: st.up ? 'uploading' : ev.status,
    mode: st.mode, ext: st.ext, rails: r, fault: ev.fault, faults: faultsNow(), missing: MD.parts.filter(p => !isIn(p.id)).map(p => p.id),
    selected: st.sel, controls: Object.assign({}, st.ctl), boot: st.strap ? (st.strap.boot || null) : st.boot, leds, circuit: st.circuit, meas: st.meas || {}, serial: st.serial, sfx: st.sfx,
    why: ev.why || null, tasks: taskState(), ...(st.circuit ? { volts: st.volts || {}, sound: st.sound || null } : {}),
    ...(inputParts().length ? { inputs: inputLevels() } : {}),
    ...(MAT.steps.length ? { matStep: st.matStep >= 0 ? MAT.steps[st.matStep].id : null } : {}),
    ...(typeof MD.def.model === 'function' ? { readings: roundDeep(st.readings || {}), benchStatus: st.benchStatus || null } : {}) };
  for (const [k, v] of Object.entries(st.modelReport || {})){ if (own(r0, k)) modelNote(`report key "${k}" is the engine's own`); else r0[k] = roundDeep(v); }
  return r0;
};
B.report = () => report();
B.accept = p => accept(st, p);
// One patch is one moment on the bench: unplug first, then change the board (build, parts, fault, mat, controls), then
// plug in, so { power: 'usb', fault: 'missing:Y2' } shows the powered board without Y2 and { power: null, build: 'bare' }
// unplugs before it strips. A host fault replaces the one before it (the host shows one failure at a time).
const accept = (s, p) => {
  let ok = true;
  const bad = m => { ok = m; };
  const powerOk = own(p, 'power') && (p.power === null || own(MD.power.sources, p.power));
  if (own(p, 'power') && !powerOk) bad('unknown power source');
  if (own(p, 'pins')){ if (p.pins && typeof p.pins === 'object') A.setPins(p.pins); else bad('pins must be an object'); }
  if (own(p, 'mode')){ if (!A.mode(p.mode)) bad('unknown mode'); }
  if (powerOk && p.power === null) A.power(null);
  if (own(p, 'exploded')) A.explode(!!p.exploded);
  if (own(p, 'build')){ if (p.build === 'bare' || p.build === 'assembled') A.build(p.build); else bad('build must be bare or assembled'); }
  if (own(p, 'remove') && typeof p.remove === 'string') A.remove(p.remove);
  if (own(p, 'restore') && typeof p.restore === 'string') A.restore(p.restore);
  if (own(p, 'fault')){
    if (p.fault === null) A.fault(null);
    else if (typeof p.fault === 'string'){ if (st.faults.length || reversedIds().length) A.fault(null); A.fault(p.fault); }
    else bad('fault must be a string or null');
  }
  if (own(p, 'matStep')){ if (p.matStep === null || MAT.steps.some(s => s.id === p.matStep)){ if (A.matStep(p.matStep) !== true) bad('mat step refused'); } else bad('unknown mat step'); }
  if (own(p, 'circuit')){ if (p.circuit === null || own(MD.circuits, p.circuit)){ pickCircuit(p.circuit, own(p, 'mode')); refresh(); } else bad('unknown circuit'); }
  if (own(p, 'params') && p.params && typeof p.params === 'object' && B.bbParams) B.bbParams(st, p.params);
  if (own(p, 'tones')){ if (p.tones && typeof p.tones === 'object') A.setTones(p.tones); else bad('tones must be an object'); }
  // keyed by net, a value is the level the net reads (as report() gives it); keyed by part id, it is the control's state
  if (own(p, 'inputs') && p.inputs && typeof p.inputs === 'object') for (const [k, v] of Object.entries(p.inputs)){
    if (MD.byId[k] && MD.byId[k].control){ st.ctl[k] = +v || 0; continue; }
    const part = inputParts().find(q => q.control.net === k);
    if (part) st.ctl[part.id] = +v === (part.control.active === 0 ? 0 : 1) ? 1 : 0;
    else bad(`unknown input ${k}`);
  }
  if (own(p, 'press') && p.press && typeof p.press.id === 'string') A.press(p.press.id, !!p.press.down);
  if (powerOk && p.power !== null) A.power(p.power);
  if (own(p, 'view')){ if (!A.view(p.view)) bad('unknown view'); }
  if (own(p, 'select')) A.select(typeof p.select === 'string' ? p.select : null);
  if (own(p, 'serial') && typeof p.serial === 'string'){ st.txT = .09; kick(); }
  return ok;
};

/* ---------- variants: a patch on a copy of the board (functions kept), applied before a bench merges over it ---------- */
const copyDef = v => Array.isArray(v) ? v.map(copyDef) : v && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype
  ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, copyDef(x)])) : v;
const withVariant = (def, vk) => {
  const v = def && def.variants && vk ? def.variants[vk] : null;
  if (vk && def && def.variants && !v) note(`${def.id}: no variant "${vk}"`);
  if (!v || typeof v.patch !== 'function') return def;
  return v.patch(copyDef(def)) || def;
};
B.withVariant = withVariant;

/* ---------- robotics benches: a board (or none) plus a circuit, programs and practice tasks ---------- */
B.benchToBoard = def => {
  const reg = def.board ? (B.defs.board[def.board] || B.defs.module[def.board]) : null;
  const base = reg ? withVariant(reg, CF_Q.get('variant') || def.variant || reg.variant) : null;
  if (def.board && !base) note(`bench ${def.id}: board "${def.board}" is not on the page (add // @cf use boards/${def.board}.js)`);
  const out = Object.assign({}, base || {}, def);
  if (def.circuit && typeof def.circuit === 'object'){ out.circuits = Object.assign({}, (base && base.circuits) || {}, { bench: def.circuit }); out.circuit = 'bench'; }
  if (!def.modes && base){ out.modes = base.modes; out.mode = base.mode; }
  out.faults = [...((base && base.faults) || []), ...(def.faults || [])];
  out.view = def.view || (out.circuits && Object.keys(out.circuits).length ? 'breadboard' : 'board');
  if (!base && !def.pcb) out.noBoard = true;
  return out;
};
const taskState = () => { const out = {};
  for (const t of MD.def.tasks || []){ let ok = false; try { ok = !!(t.check && t.check(st, st.o)); } catch (e) { note(`task ${t.id}: ${e.message}`); } out[t.id] = ok; }
  return out; };

/* ---------- choice ids: every id a picker can ever offer (content steps press them), checked once at mount ---------- */
function choiceIds(){
  const out = {}, loose = MD.parts.filter(p => !p.fixed);
  for (const b of buttons()){
    if (!b.choices) out[b.id] = null;
    else if (b.id === 'place') out.place = [
      ...['low', 'tall', 'last'].filter(g => loose.filter(p => p.group === g).length > 1).map(g => 'group-' + g),
      ...loose.flatMap(p => p.polar ? [p.id.toLowerCase(), p.id.toLowerCase() + '-rev'] : [p.id.toLowerCase()])];
    else if (b.id === 'remove') out.remove = loose.map(p => p.id.toLowerCase());
    else out[b.id] = b.choices().map(c => c.id);
  }
  // a control folded into a picker is still pressable on its own (its hidden button)
  for (const cid of Object.keys(ctlFolded)) out[cid] = null;
  return out;
}
B.choices = () => choiceIds();
function checkChoices(){
  const ids = new Set();
  for (const b of buttons()){ if (ids.has(b.id)) note(`two buttons have the id "${b.id}"`); ids.add(b.id); }
  for (const [id, list] of Object.entries(choiceIds())){
    const seen = new Set();
    for (const c of list || []){ if (seen.has(c)) note(`button ${id}: two choices have the id "${c}"`); seen.add(c); }
  }
}

/* ---------- mount ---------- */
function mountNow(pick){ try { start(pick); } catch (e) { note('start: ' + e.message); throw e; } }
function start(pick){
  if (B.started) return; B.started = true;
  if (!pick) pick = [...order].reverse().find(([t]) => t === 'bench') || [...order].reverse().find(([t]) => t === 'board' || t === 'module') || [...order].reverse().find(([t]) => t === 'part');
  if (!pick){ note('nothing registered'); return; }
  if (pick[0] === 'part'){ B.started = false; if (B.mountPart) B.mountPart(pick[1]); else note('no part page support'); return; }
  let def = B.defs[pick[0]][pick[1]];
  def = pick[0] === 'bench' ? B.benchToBoard(def) : withVariant(def, CF_Q.get('variant') || def.variant);
  MD = B.md = prep(def, pick[0]); layoutFor(MD); prepMat(def);
  st = B.st = {
    view: 'board', exploded: false, exK: 0, placed: {}, left: {}, drop: {}, reflowT: null, solderQ: null, solderT: 0,
    power: null, supply: {}, faults: [], mode: def.mode || Object.keys(MD.modes)[0] || null, ext: false, pins: {}, t: 0, on: 0, down: null, serialN: -1,
    up: null, upT: 0, upDur: 2.2, ctl: {}, boot: null, sel: null, serial: null, txT: 0, circuit: def.circuit || null, meas: {}, sfx: null, tones: {}, strap: null,
    matStep: MAT.steps.length - 1, readings: {}, benchStatus: null, volts: {}, sound: null, sag: null,
  };
  for (const p of MD.parts) st.placed[p.id] = { orient: 0, sold: true };
  // a slide starts at control.start (a power switch that ships ON), else position 0
  for (const p of MD.parts) if (p.control && p.control.type === 'slide') st.ctl[p.id] = +p.control.start || 0;
  st.ev = evaluate(); st.o = outputs();
  const q = CF_Q;
  if (q.get('bare') === '1' && q.get('build') === 'bare') A.build('bare');
  if (q.get('build') === 'bare') { st.placed = {}; st.matStep = -1; for (const p of MD.parts) if (p.fixed) st.placed[p.id] = { orient: 0, sold: true }; }
  if (q.get('mat') != null){ const i = MAT.steps.findIndex(s => s.id === q.get('mat')); if (i >= 0 || q.get('mat') === '') st.matStep = i; }
  if (def.view && VIEWS[def.view]) st.view = def.view;
  if (q.get('view') && VIEWS[q.get('view')]) st.view = q.get('view');
  B.mountView = VIEWS[st.view] && !VIEWS[st.view].flat ? st.view : 'board';
  if (q.get('circuit') && own(MD.circuits, q.get('circuit'))) st.circuit = q.get('circuit');
  pickCircuit(st.circuit);
  if (q.get('exploded') === '1' || q.get('ex') === '1'){ st.exploded = true; st.exK = 1; }
  if (q.get('mode') && MD.modes[q.get('mode')]) st.mode = q.get('mode');
  if (q.get('sel')) st.sel = q.get('sel');
  for (const fid of (q.get('fault') || '').split(',').filter(Boolean)) { const [kind, a] = fid.split(':'); if (kind === 'reversed' && MD.byId[a]) st.placed[a] = { orient: 1, sold: true }; else if (kind === 'missing' && MD.byId[a]) { delete st.placed[a]; st.left[a] = true; st.faults.push(fid); } else st.faults.push(fid); }
  if (q.get('power') && own(MD.power.sources, q.get('power'))) { st.power = q.get('power'); }
  else if (q.get('power') !== '0' && q.get('build') !== 'bare' && MD.power.default && !q.get('fault')) st.power = MD.power.default;
  else if (q.get('fault') && q.get('power') !== '0' && MD.power.default) st.power = MD.power.default;
  if (st.power) sampleStraps();
  checkChoices();
  // the core frames the box [0,W] x [0,D] x [0,H]: shift the world so the mount view's bounds start at 0
  let vb = VIEWS[B.mountView].bounds(); G.ox -= vb[0]; G.oy -= vb[1]; vb = VIEWS[B.mountView].bounds();
  const z0 = Math.max(0, vb[2] || 0);
  ui = mountFigure({
    fig: def.fig || '', title: def.name, turn: 'full', size: [vb[3] - vb[0], vb[4] - vb[1], vb[5] - z0], center: [(vb[0] + vb[3]) / 2, (vb[1] + vb[4]) / 2],
    palette: def.pal || 'cobalt', state: st, scene: (s) => scene(s), buttons: buttons(), stats: () => stats(),
    acts: {
      part: (s, el) => { const id = el.dataset.id; A.select(st.sel === id ? null : id); },
      ctl: (s, el) => { const id = el.dataset.id; A.press(id, true); held = id; },
      pin: (s, el) => { A.select(el.dataset.part || null); },
      hole: () => {},
      bb: (s, el) => { const id = el.dataset.id; A.select(st.sel === id ? null : id); if (B.bbPress && B.bbPress(id, true)) heldBb = id; },
      periph: (s, el) => { A.select(st.sel === el.dataset.id ? null : el.dataset.id); },
    },
    readout: () => st.msg || '',
    embed: { report: () => report(), accept: (s, p) => accept(s, p) },
    credit: true,
  });
  addEventListener('pointerup', () => { if (heldBb){ const id = heldBb; heldBb = null; B.bbPress(id, false); } if (held){ const id = held; held = null; const p = MD.byId[id]; if (p && p.control && p.control.type !== 'slide') A.press(id, false); } });
  addEventListener('keyup', e => { if (e.key !== 'Enter' && e.key !== ' ') return;
    if (held){ const id = held; held = null; A.press(id, false); } if (heldBb){ const id = heldBb; heldBb = null; B.bbPress(id, false); } });
  // the core frames z from 0; bounds that start higher (a part page framed on its part) move the world down by z0:
  // P is affine, so raising the rotation centre and the screen offset by z0 maps z0 to where the core put 0, at any angle
  if (z0){ RCZ += z0; OY += z0; ui.render(); }
  keepFolded();
  clearStats();
  if (typeof xrMount === 'function') xrMount(() => ui, s => s.xr > .5 ? T('See-through: the chips show their silicon, copper shows where current flows') : '');
  // a hot part gets a red tint filter
  const defs = document.getElementById('fdefs') || document.querySelector('#fig defs');
  if (defs) defs.insertAdjacentHTML('beforeend', '<filter id="bhot"><feColorMatrix type="matrix" values="1 .25 .1 0 .12  .1 .45 .05 0 0  .05 .05 .35 0 0  0 0 0 1 0"/></filter>');
  const css = document.createElement('style');
  // a bench's long stats column (battery, motors, heat…) is set smaller and wraps a value at its spaces, so it stays a
  // narrow strip at the right edge instead of running over the drawing
  css.textContent = '#fig .bsel > *{filter:drop-shadow(0 0 1.6px var(--accent,#f4b829)) drop-shadow(0 0 1.6px var(--accent,#f4b829))}#fig [data-act]{cursor:pointer}'
    + '.stat.small .v{max-width:9em;text-wrap:balance}'
    + 'html.bstats-long .stats{gap:5px}html.bstats-long .stat .k{font-size:9.5px}html.bstats-long .stat .v{font-size:24px}'
    + 'html.bstats-long .stat.small .v{font-size:14px;line-height:1.15;max-width:7.5em;text-wrap:balance}'
    // on a phone the core sets the stats in one row, which runs off the left edge with this many: a three-column grid
    + '@media (max-width:560px){html.bstats-long .stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px 12px;text-align:left}'
    + 'html.bstats-long .stat .v,html.bstats-long .stat.small .v{font-size:14px;max-width:none}}';
  document.head.appendChild(css);
  if (!CF_EMBED) keyList();
  if (st.power) refresh(true); else kick();
}
let held = null, heldBb = null;

// the core frames the drawing a little high and right of centre, so on a wide board the stats column (top right) can
// sit on its far end. Once laid out, the drawing moves down into the room the frame leaves below it, a few px at a
// time, until no stat (with a small margin) covers anything drawn. A stat that appears later (a program's name once it
// runs) only ever moves it further down; a resize starts again from the core's frame, since the stats keep their size
// while the drawing scales. Only in the view it opened in: once someone turns the figure, it stays where they put it.
// A phone's stats sit in a row above the drawing and never trigger it.
function clearStats(){
  const svg = document.getElementById('fig'), art = document.getElementById('art'), box = document.getElementById('stats');
  if (!svg || !art || !box || typeof document.elementsFromPoint !== 'function') return;
  const base = OY, pad = 8, step = 6, yaw = YAW, pitch = PITCH;
  const covered = () => [...box.querySelectorAll('.stat')].some(el => {
    const q = el.getBoundingClientRect(), x0 = q.left - pad, y0 = q.top - pad, w = q.width + 2 * pad, h = q.height + 2 * pad;
    for (let i = 0; i <= 8; i++) for (let j = 0; j <= 4; j++)
      if (document.elementsFromPoint(x0 + w * i / 8, y0 + h * j / 4).some(e => e !== art && art.contains(e))) return true;
    return false;
  });
  const fit = again => {
    const r = svg.getBoundingClientRect(), vb = svg.viewBox && svg.viewBox.baseVal;
    if (!r.width || !vb || !vb.width) return;
    if (again && OY !== base){ OY = base; ui.render(); }
    if (YAW !== yaw || PITCH !== pitch) return;
    const k = vb.width / r.width, most = base + r.height * .3 * k;
    while (OY + step * k <= most && r.bottom - art.getBoundingClientRect().bottom > step && covered()){ OY += step * k; ui.render(); }
  };
  let queued = 0;
  const later = again => { if (!queued) requestAnimationFrame(() => { const a = queued === 2; queued = 0; fit(a); }); queued = Math.max(queued, again ? 2 : 1); };
  later(false);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => later(false));
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => later(false)).observe(box);
  addEventListener('resize', () => later(true));
}

// standalone page: the SVG re-renders all the time, so keyboard and screen-reader access to the parts drawn in it is a
// group of real buttons kept off-screen (the focused one shows as a chip). Focus selects the part, Enter or Space
// presses a control for as long as the key is held. Inside the SimLab host the host's own part list does this.
let keysBox = null, keysKey = '';
function keyList(){
  keysBox = document.createElement('div'); keysBox.className = 'bkeys'; keysBox.setAttribute('role', 'group'); keysBox.setAttribute('aria-label', T('Parts'));
  document.getElementById('fig').insertAdjacentElement('afterend', keysBox);
  const css = document.createElement('style');
  css.textContent = '.bkeys button{position:fixed;left:-9999px;top:0}.bkeys button:focus{left:16px;top:auto;bottom:16px;z-index:9;padding:8px 14px;border:2px solid #1f1b16;border-radius:999px;background:#fff4d6;color:#1f1b16;font:600 14px/1.2 inherit}';
  document.head.appendChild(css);
  keysBox.addEventListener('focusin', e => { const b = e.target.closest('button'); if (b && st.sel !== b.dataset.id) A.select(b.dataset.id); });
  keysBox.addEventListener('keydown', e => { const b = e.target.closest('button'); if (!b || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault(); if (e.repeat) return;
    if (b.dataset.ctl && !held){ A.press(b.dataset.id, true); held = b.dataset.id; }
    else if (b.dataset.press && !heldBb && B.bbPress(b.dataset.id, true)) heldBb = b.dataset.id; });
  // a screen reader's virtual click comes without key events
  keysBox.addEventListener('click', e => { const b = e.target.closest('button'); if (!b || held || heldBb) return;
    const id = b.dataset.id;
    if (b.dataset.ctl){ A.press(id, true); setTimeout(() => A.press(id, false), 200); }
    else if (b.dataset.press && B.bbPress(id, true)) setTimeout(() => B.bbPress(id, false), 200); });
  syncKeys();
}
function syncKeys(){
  if (!keysBox) return;
  const c = st.circuit && B.circuitNow ? B.circuitNow() : null;
  const items = MD.parts.filter(p => isIn(p.id)).map(p => [p.id, T(p.name), !!p.control]);
  if (c && st.view !== 'board') for (const q of c.parts || []) items.push([q.id, q.id + ' · ' + T((B.parts[q.part] || {}).name || q.part), false, typeof (B.parts[q.part] || {}).press === 'function']);
  const key = items.map(i => i[0]).join(' ');
  if (key === keysKey) return;
  keysKey = key; keysBox.textContent = '';
  for (const [id, label, ctl, press] of items){ const b = document.createElement('button'); b.type = 'button'; b.dataset.id = id; if (ctl) b.dataset.ctl = '1'; if (press) b.dataset.press = '1'; b.textContent = label; keysBox.append(b); }
}
B.start = pick => start(pick);
B.ui = () => ui;
// a page built somewhere else (cfbuild --out) mounts the last item once everything has registered
addEventListener('DOMContentLoaded', () => { if (!B.started) mountNow(null); });
})();
