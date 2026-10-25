// Board Bench circuit solver (FIGURES-BENCH §9). The lesson circuit becomes a DC network: nodes are breadboard
// strips, power rails, board nets and the legs of parts that sit on the mat. Resistors are conductances, sources are
// Norton equivalents (a rail behind 0.5 Ω, an output pin behind its driver's 25 Ω), and every nonlinear part is
// piecewise linear: an LED or diode junction is off, or its drop plus a small resistance; a transistor is off, active
// (collector current β·IB) or saturated (VCE(sat)). One solve repeats nodal analysis until every junction agrees with
// its own voltages. PWM pins are solved per time slice (an AVR timer starts every period high, so the slices are the
// gaps between the sorted duties) and the results are averaged over the period.
(() => {
const B = SL.bench;
const PIN_R = 25, RAIL_R = .5, GMIN = 1e-9, RBE = 2, RSAT = .01, ROUNDS = 40;
const own = (o, k) => o != null && Object.prototype.hasOwnProperty.call(o, k);
const rnd = (v, k = 10) => Math.round(v * k) / k;

// Gaussian elimination with partial pivoting; a row with no pivot (a node nothing reaches) solves to 0 V
function linsolve(A, b){
  const n = b.length;
  for (let c = 0; c < n; c++){
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    if (Math.abs(A[p][c]) < 1e-18) continue;
    if (p !== c){ const t = A[p]; A[p] = A[c]; A[c] = t; const u = b[p]; b[p] = b[c]; b[c] = u; }
    for (let r = c + 1; r < n; r++){
      const fr = A[r][c] / A[c][c]; if (!fr) continue;
      for (let k = c; k < n; k++) A[r][k] -= fr * A[c][k];
      b[r] -= fr * b[c];
    }
  }
  const x = new Float64Array(n);
  for (let r = n - 1; r >= 0; r--){
    let s = b[r];
    for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k];
    x[r] = Math.abs(A[r][r]) < 1e-18 ? 0 : s / A[r][r];
  }
  return x;
}

/* ---------- netlist: nodes, elements and sources of the circuit on the breadboard ---------- */
function netlist(st, pl){
  const { c, geo } = pl, par = {};
  const add = a => { if (!own(par, a)) par[a] = a; return a; };
  const find = a => { add(a); let r = a; while (par[r] !== r) r = par[r]; while (par[a] !== r){ const n = par[a]; par[a] = r; a = n; } return r; };
  const uni = (a, b) => { if (a == null || b == null) return; const x = find(a), y = find(b); if (x !== y) par[x] = y; };
  const parts = (c.parts || []).map(q => Object.assign({}, q, (st.cparams || {})[q.id] || {}));
  const byId = {}; for (const q of parts) byId[q.id] = q;
  // the node under leg i: its hole's strip, or the leg itself for a part lying on the mat (a wire may end on it)
  const legNode = (q, i) => { const h = q.holes && q.holes[i] ? B.hole(geo, q.holes[i]) : null; return add(h ? h.node : 'L:' + q.id + '.' + i); };
  const end = ref => {
    const h = B.hole(geo, ref); if (h) return add(h.node);
    const m = /^([A-Za-z_][\w-]*)\.([\w+~-]+)$/.exec(ref), q = m && byId[m[1]];
    if (q){ const d = B.parts[q.part], i = d && d.legs ? d.legs.indexOf(m[2]) : -1; return i >= 0 ? legNode(q, i) : null; }
    const pin = B.pinOf(ref); return pin ? add('N:' + pin.net) : null;
  };
  // a node of a part by leg index or name: its legs, then its inside nodes (def.nodes, numbered after the legs)
  const nodeIx = (def, nm) => { if (typeof nm === 'number') return nm; const legs = def.legs || [], i = legs.indexOf(nm);
    if (i >= 0) return i; const j = (def.nodes || []).indexOf(nm); return j >= 0 ? legs.length + j : -1; };
  for (const w of c.wires || []) uni(end(w.from), end(w.to));
  // a plug pushed into another part's socket (`plug: 'DRV1'`): its legs join that part's def.socket nodes, in order
  for (const q of parts){
    if (typeof q.plug !== 'string') continue;
    const d = B.parts[q.part], r = byId[q.plug], rd = r && B.parts[r.part], sock = rd && rd.socket;
    if (!r) continue;                                   // the driver is left out (a fault): the plug hangs free
    if (!d || !Array.isArray(sock)){ B.note(`${q.id}: plug ${q.plug} has no socket`); continue; }
    (d.legs || []).forEach((_, i) => { const j = i < sock.length ? nodeIx(rd, sock[i]) : -1; if (j >= 0) uni(legNode(q, i), legNode(r, j)); });
  }
  const els = [], buttons = [], burnt = st.burnt || {};
  for (const q of parts){
    const def = B.parts[q.part];
    if (!def || typeof def.elec !== 'function') continue;
    let es = null;
    try { es = def.elec(q); } catch (e) { B.note(`${q.id} elec: ${e.message}`); continue; }
    const legs = def.legs || [], N = i => legNode(q, i), named = (nm, i) => N(legs.includes(nm) ? legs.indexOf(nm) : i);
    // an element's own ends (`legs: [a, b]`, indexes or node names), else the part's first two legs
    const ab = e => { const lg = Array.isArray(e.legs) ? e.legs.map(x => nodeIx(def, x)) : [0, 1]; return lg.every(i => i >= 0) ? lg.map(N) : null; };
    for (const e of [].concat(es || [])){
      if (!e || typeof e !== 'object') continue;
      // one of several channels of a part (a driver chip's four Darlingtons): its own key, so it burns alone
      const key = e.ch != null && e.type !== 'led' ? q.id + ':' + e.ch : q.id;
      const base = { id: q.id, key, q, def, e, dead: !!burnt[key] };
      if (Array.isArray(e.legs) && e.type !== 'led' && !ab(e)){ B.note(`${q.id} elec: unknown node in ${e.legs.join(', ')}`); continue; }
      if (e.type === 'wire'){ const [a, b] = ab(e); uni(a, b); }
      else if (e.type === 'res'){ if (!e.open){ const [a, b] = ab(e); els.push({ ...base, k: 'R', a, b, g: 1 / Math.max(+e.ohms || 0, 1e-3) }); } }
      else if (e.type === 'stepper'){
        // a unipolar stepper: one coil from the common lead to each coil lead; energised while its far end is pulled low
        const com = nodeIx(def, e.common), g = 1 / Math.max(+e.ohms || 50, 1);
        for (const w of e.coils || []){ const j = nodeIx(def, w); if (com >= 0 && j >= 0) els.push({ ...base, k: 'R', coil: w, a: N(com), b: N(j), g }); }
      }
      else if (e.type === 'pot'){
        const R = Math.max(+e.ohms || 1e4, 1), x = Math.max(0, Math.min(1, +e.pos || 0));
        els.push({ ...base, k: 'POT', a: N(0), w: N(1), b: N(2), g1: 1 / Math.max(R * x, .5), g2: 1 / Math.max(R * (1 - x), .5), pmax: +e.pmax || .05 });
      }
      else if (e.type === 'button') buttons.push({ ...base, n: legs.map((_, i) => N(i)) });
      else if (e.type === 'led'){
        const lg = e.legs || [0, 1], key = e.ch ? q.id + ':' + e.ch : q.id;
        els.push({ ...base, k: 'D', led: true, key, ch: e.ch || null, dead: !!burnt[key], a: N(lg[0]), b: N(lg[1]), vf: +e.vf || 2, rd: .5, imax: +e.imax || .02 });
      }
      else if (e.type === 'diode'){ const [a, b] = ab(e); els.push({ ...base, k: 'D', a, b, vf: .7, rd: .2, imax: +e.imax || 1, isurge: +e.isurge || 30 }); }
      else if (e.type === 'npn'){
        const pn = e.pins || { B: 0, C: 1, E: 2 }, ix = { B: nodeIx(def, pn.B), C: nodeIx(def, pn.C), E: nodeIx(def, pn.E) };
        if (Object.values(ix).some(i => i < 0)){ B.note(`${q.id} elec: unknown npn pin`); continue; }
        els.push({ ...base, k: 'Q', nb: N(ix.B), nc: N(ix.C), ne: N(ix.E), hfe: +e.hfe || 100, hfr: +e.hfr || 5, vbe: +e.vbe || .7, vcesat: +e.vcesat || .2 });
      }
      else if (e.type === 'motor') els.push({ ...base, k: 'M', a: N(0), b: N(1) });
      else if (e.type === 'servo') els.push({ ...base, k: 'SV', gnd: named('GND', 0), vp: named('V+', 1), sig: named('SIG', 2) });
      else if (e.type === 'sensor' && Array.isArray(e.supply)) els.push({ ...base, k: 'TS', sp: N(e.supply[0]), sn: N(e.supply[1]), out: N(e.out != null ? e.out : 1) });
      else if (e.type === 'buzzer') els.push({ ...base, k: 'BZ', a: N(0), b: N(1), active: e.kind === 'active', vf: .05, rd: (+e.vmin || 3) / (+e.imax || .03) });
    }
  }
  // a push button's pairs are always joined; pressing joins the two pairs. A switched pair already joined (both
  // sides in one strip) shorts the switch
  for (const bt of buttons) for (const pr of bt.e.pairs || []) uni(bt.n[pr[0]], bt.n[pr[1]]);
  for (const bt of buttons){ const pr = bt.e.pairs || []; bt.shorted = pr.length > 1 && find(bt.n[pr[0][0]]) === find(bt.n[pr[1][0]]); }
  for (const bt of buttons){ const pr = bt.e.pairs || []; if (bt.e.pressed && pr.length > 1) uni(bt.n[pr[0][0]], bt.n[pr[1][0]]); }
  // board nets: GND, rails (with their voltage now), output pins (level or PWM duty; a tone is a 50 % square wave), inputs
  const run = st.ev.status === 'running' && !st.up && st.t >= 0, rails = st.ev.rails || {}, pins = (st.o && st.o.pins) || {}, tones = st.tones || {};
  const nets = [];
  for (const key of Object.keys(par)) if (key.startsWith('N:')){
    const net = key.slice(2);
    if (net === 'GND') nets.push({ net, key, kind: 'gnd' });
    else if (own(rails, net)) nets.push({ net, key, kind: 'rail', v: rails[net] || 0 });
    else if (run && tones[net] > 0) nets.push({ net, key, kind: 'pin', level: .5, hz: tones[net] });
    else if (run && pins[net] != null) nets.push({ net, key, kind: 'pin', level: Math.max(0, Math.min(1, +pins[net] || 0)) });
    else nets.push({ net, key, kind: 'input' });
  }
  // resolve every node to its root now that the unions are done
  const R = k => find(k);
  for (const n of nets) n.root = R(n.key);
  for (const el of els) for (const f of ['a', 'b', 'w', 'nb', 'nc', 'ne', 'gnd', 'vp', 'sig', 'sp', 'sn', 'out']) if (el[f] != null) el[f] = R(el[f]);
  const g = nets.find(n => n.kind === 'gnd');
  const gnd = g ? g.root : null, roots = [...new Set(Object.keys(par).map(R))].filter(r => r !== gnd);
  return { parts, byId, els, buttons, nets, gnd, roots };
}

/* ---------- one slice: nodal analysis repeated until every junction state is consistent ---------- */
function solveSlice(nl, high, S, logic){
  const { els, nets, gnd, roots } = nl, n = roots.length, idx = new Map(roots.map((r, i) => [r, i]));
  const ix = r => { const i = idx.get(r); return i == null ? -1 : i; };
  let x = new Float64Array(n);
  const V = r => { const i = ix(r); return i < 0 ? 0 : x[i]; };
  for (let round = 0; round < ROUNDS; round++){
    const A = Array.from({ length: n }, () => new Float64Array(n)), b = new Float64Array(n);
    for (let i = 0; i < n; i++) A[i][i] += GMIN;
    // conductance g between nodes p and q
    const G = (p, q, gg) => { const i = ix(p), j = ix(q); if (i >= 0){ A[i][i] += gg; if (j >= 0) A[i][j] -= gg; } if (j >= 0){ A[j][j] += gg; if (i >= 0) A[j][i] -= gg; } };
    // a branch from p to q carrying gg·(Vp − Vq − v0): a conductance with a built-in drop (junctions, sources)
    const GV = (p, q, gg, v0) => { G(p, q, gg); const i = ix(p), j = ix(q); if (i >= 0) b[i] += gg * v0; if (j >= 0) b[j] -= gg * v0; };
    // a current gm·(Vc − Vx) − off from y to x (a transistor's collector following its base drive)
    const VC = (y, xn, cn, gm, off) => { const iy = ix(y), ixx = ix(xn), ic = ix(cn);
      if (iy >= 0){ if (ic >= 0) A[iy][ic] += gm; if (ixx >= 0) A[iy][ixx] -= gm; b[iy] += off; }
      if (ixx >= 0){ if (ic >= 0) A[ixx][ic] -= gm; A[ixx][ixx] += gm; b[ixx] -= off; } };
    for (const s of nets){
      if (s.kind === 'rail') GV(s.root, gnd, 1 / RAIL_R, s.v);
      else if (s.kind === 'pin') GV(s.root, gnd, 1 / PIN_R, high(s) ? logic : 0);
    }
    for (const el of els){
      const s = S[el.n];
      if (el.k === 'R') G(el.a, el.b, el.g);
      else if (el.k === 'POT'){ if (!el.dead){ G(el.a, el.w, el.g1); G(el.w, el.b, el.g2); } }
      else if (el.k === 'D' || (el.k === 'BZ' && el.active)){ if (!el.dead && s.on) GV(el.a, el.b, 1 / el.rd, el.vf); }
      else if (el.k === 'M'){ if (!el.dead) G(el.a, el.b, el.gm); }
      else if (el.k === 'SV'){ if (!el.dead) G(el.vp, el.gnd, el.gs); }
      else if (el.k === 'TS'){
        if (!el.dead) G(el.sp, el.sn, (+el.e.iq || 5e-5) / 5);
        if (!el.dead && s.on) GV(el.out, el.sn, 1 / 20, el.vout);
      }
      else if (el.k === 'Q'){
        // a burnt Darlington fails short from collector to emitter, a small transistor open
        if (el.dead){ if (el.e.darlington) G(el.nc, el.ne, 10); continue; }
        if (!s.on) continue;
        const y = s.inv ? el.ne : el.nc, xn = s.inv ? el.nc : el.ne, beta = s.inv ? el.hfr : el.hfe;
        GV(el.nb, xn, 1 / RBE, el.vbe);
        if (s.sat) GV(y, xn, 1 / RSAT, el.vcesat);
        else VC(y, xn, el.nb, beta / RBE, beta / RBE * el.vbe);
      }
    }
    x = linsolve(A, b);
    let changed = false;
    for (const el of els){
      const s = S[el.n];
      if (el.dead) continue;
      if (el.k === 'D' || (el.k === 'BZ' && el.active)){
        const vd = V(el.a) - V(el.b);
        if (!s.on && vd > el.vf + 1e-6){ s.on = true; changed = true; }
        else if (s.on && vd < el.vf - 1e-6){ s.on = false; changed = true; }
      } else if (el.k === 'TS'){
        const vs = V(el.sp) - V(el.sn), supplied = vs >= (+el.e.vmin || 2.7) && vs <= (+el.e.vabs || 7);
        if (supplied !== !!s.on){ s.on = supplied; changed = true; }
      } else if (el.k === 'Q'){
        if (!s.on){
          // which end acts as the emitter is read with the junction off: the lower of collector and emitter
          const inv = V(el.ne) > V(el.nc) + 1e-3;
          if (inv !== !!s.inv){ s.inv = inv; changed = true; }
          const xn = s.inv ? el.nc : el.ne;
          if (V(el.nb) - V(xn) > el.vbe + 1e-6){ s.on = true; s.sat = false; changed = true; }
          continue;
        }
        const y = s.inv ? el.ne : el.nc, xn = s.inv ? el.nc : el.ne, beta = s.inv ? el.hfr : el.hfe;
        const ib = (V(el.nb) - V(xn) - el.vbe) / RBE;
        if (ib < -1e-9){ s.on = false; s.sat = false; changed = true; }
        else if (!s.sat){ if (V(y) - V(xn) < el.vcesat - 1e-6){ s.sat = true; changed = true; } }
        else if ((V(y) - V(xn) - el.vcesat) / RSAT > beta * ib + 1e-7){ s.sat = false; changed = true; }
      }
    }
    if (!changed) break;
  }
  // what every element and source carries in this slice
  const out = { V: new Map(roots.map((r, i) => [r, x[i]])), el: [], load: 0 };
  out.V.set(gnd, 0);
  for (const s of nets){
    if (s.kind === 'rail'){ const i = (s.v - V(s.root)) / RAIL_R; if (i > 0) out.load += i; }
    else if (s.kind === 'pin'){ const i = ((high(s) ? logic : 0) - V(s.root)) / PIN_R; if (i > 0) out.load += i; }
  }
  for (const el of els){
    const s = S[el.n], r = {};
    if (el.k === 'D' || el.k === 'BZ'){ r.vd = V(el.a) - V(el.b); r.i = !el.dead && s.on ? (r.vd - el.vf) / el.rd : 0; }
    else if (el.k === 'R' && el.coil) r.i = (V(el.a) - V(el.b)) * el.g;
    else if (el.k === 'M'){ r.v = V(el.a) - V(el.b); r.i = el.dead ? 0 : r.v * el.gm; }
    else if (el.k === 'SV'){ r.vs = V(el.vp) - V(el.gnd); r.sig = V(el.sig) > logic / 2; }
    else if (el.k === 'TS'){ r.vs = V(el.sp) - V(el.sn); r.vo = V(el.out) - V(el.sn); r.on = !!s.on; }
    else if (el.k === 'POT'){ r.vw = V(el.w); r.p = el.dead ? 0 : Math.max(el.g1 * (V(el.a) - V(el.w)) ** 2, el.g2 * (V(el.w) - V(el.b)) ** 2); }
    else if (el.k === 'Q'){
      const y = s.inv ? el.ne : el.nc, xn = s.inv ? el.nc : el.ne, beta = s.inv ? el.hfr : el.hfe;
      r.vce = V(el.nc) - V(el.ne); r.inv = !!s.inv; r.sat = !!(s.on && s.sat);
      if (el.dead){ r.ib = 0; r.ic = el.e.darlington ? Math.abs(r.vce) * 10 : 0; }
      else if (!s.on){ r.ib = 0; r.ic = 0; }
      else { r.ib = Math.max(0, (V(el.nb) - V(xn) - el.vbe) / RBE); r.ic = s.sat ? Math.max(0, (V(y) - V(xn) - el.vcesat) / RSAT) : beta * r.ib; }
    }
    out.el.push(r);
  }
  return out;
}

/* ---------- the whole circuit: slices, motors, averages, then what each part reports ---------- */
const mem = st => st.solverMem || (st.solverMem = {});
const motorI = (el, v) => {
  const md = el.def.model || {}, load = el.q.load || 'prop';
  if (el.e.brushless && el.e.polar && v < 0) return 0;
  if (typeof md.steady === 'function') return Math.abs(md.steady(Math.abs(v), load).i || 0);
  return Math.abs(v) / Math.max(+el.e.ohms || 10, .1);
};
B.solveCircuit = (st, pl, dt = 0) => {
  const md = B.md, logic = md.def.logic || 5, nl = netlist(st, pl), { els, nets } = nl, M = mem(st);
  els.forEach((el, i) => { el.n = i; });
  // PWM slices: the pins at level > the slice's start are high
  const level = s => s.level;
  const duties = [...new Set(nets.filter(s => s.kind === 'pin' && s.level > 0 && s.level < 1).map(level))].sort((a, b) => a - b);
  const slices = []; let from = 0;
  for (const d of [...duties, 1]){ if (d - from > 1e-9){ const f0 = from; slices.push({ w: d - from, high: s => s.level > f0 }); } from = d; }
  // motors: a conductance from the current the motor takes at the voltage it sees while switched on
  for (const el of els) if (el.k === 'M'){
    const m0 = M[el.id] || {};
    el.gm = el.q.load === 'stalled' && el.e.ohms ? 1 / el.e.ohms : m0.gm || motorI(el, 4) / 4 || 1e-3;
  }
  // servos: the current they took last frame (holding, moving or stalled)
  for (const el of els) if (el.k === 'SV') el.gs = ((M[el.id] && M[el.id].i) || +el.e.iidle || .008) / 5;
  for (const el of els) if (el.k === 'TS') el.vout = +el.e.vout || .75;
  let res = null;
  for (let pass = 0; pass < 6; pass++){
    const S = els.map(() => ({ on: false, sat: false, inv: false }));
    res = slices.map(sl => Object.assign(solveSlice(nl, sl.high, S, logic), { w: sl.w }));
    let moved = false;
    for (const el of els) if (el.k === 'M' && !(el.q.load === 'stalled' && el.e.ohms)){
      const von = Math.max(...res.map(r => Math.abs(r.el[el.n].v)));
      const gm = Math.max(1e-3, motorI(el, von) / Math.max(von, .3));
      if (Math.abs(gm - el.gm) > el.gm * .01){ el.gm = gm; moved = true; }
    }
    if (!moved) break;
  }
  for (const el of els) if (el.k === 'M') M[el.id] = Object.assign(M[el.id] || {}, { gm: el.gm });
  const timeAvg = f => res.reduce((a, r) => a + r.w * f(r), 0), peak = f => Math.max(...res.map(f));
  const Vavg = root => timeAvg(r => r.V.get(root) || 0);
  const out = { meas: {}, volts: {}, load: timeAvg(r => r.load) };
  // which roots reach a source through the circuit (skip: an element left out, to tell an open LED)
  const srcRoots = new Set(nets.filter(s => s.kind !== 'input').map(s => s.root));
  const ends = el => ['a', 'b', 'w', 'nb', 'nc', 'ne', 'gnd', 'vp', 'sp', 'sn', 'out'].map(f => el[f]).filter(v => v != null);
  const reaches = (start, skip) => {
    const seen = new Set([start]), todo = [start];
    while (todo.length){
      const r = todo.pop(); if (srcRoots.has(r)) return true;
      for (const el of els){ if (el === skip || (el.dead && el.k !== 'Q')) continue; const e2 = ends(el); if (!e2.includes(r)) continue;
        for (const q of e2) if (!seen.has(q)){ seen.add(q); todo.push(q); } }
    }
    return false;
  };
  const live = el => ends(el).some(r => reaches(r, null));
  // an LED's series resistance and source, walking resistors from a node to the first source (as v1 reported)
  const walk = (start, seen = new Set()) => {
    if (seen.has(start)) return null; seen.add(start);
    const s = nets.find(q => q.root === start && q.kind !== 'input'); if (s) return { net: s.net, r: 0 };
    for (const el of els){ if (el.k !== 'R') continue; const nx = el.a === start ? el.b : el.b === start ? el.a : null;
      if (nx == null) continue; const w = walk(nx, seen); if (w) return { net: w.net, r: w.r + 1 / el.g }; }
    return null;
  };
  const motors = els.filter(el => el.k === 'M');
  const switched = el => peak(r => Math.abs(r.el[el.n].i)) - Math.min(...res.map(r => Math.abs(r.el[el.n].i))) > 1e-3
    || els.some(q => q.k === 'Q' && (q.nc === el.b || q.nc === el.a));
  const flyback = m => els.some(d => d.k === 'D' && !d.led && !d.dead && d.a === m.b && d.b === m.a);
  const burn = (key, msg, vars) => { const b2 = st.burnt || (st.burnt = {}); if (b2[key]) return; b2[key] = true; B.sfx('pop'); B.say(msg, vars, 3000); };
  const leds = {}, chans = {}, coils = {};
  for (const el of els){
    const q = el.q, m = M[el.key] || (M[el.key] = {}), e = el.e, ri = r => r.el[el.n];
    if (el.k === 'R' && el.coil){
      if (!live(el)) continue;
      (coils[q.id] = coils[q.id] || { e, i: {} }).i[el.coil] = timeAvg(r => ri(r).i);
      continue;
    }
    if (el.k === 'D' && el.led){
      const i = timeAvg(r => ri(r).i), ip = peak(r => ri(r).i), rev = timeAvg(r => -ri(r).vd);
      if (!el.dead && ip > el.imax * 2.5) burn(el.key, '{name} burned out: {n} mA is far above its 20 mA', { name: q.id, n: Math.round(ip * 1000) });
      const dead = !!(st.burnt && st.burnt[el.key]);
      const state = dead ? 'burnt' : i > 1e-5 ? 'ok' : !reaches(el.a, el) || !reaches(el.b, el) ? 'open' : rev > Math.max(1, el.vf * .5) ? 'reverse' : 'off';
      const up = walk(el.a), dn = walk(el.b);
      const one = { kind: 'led', i_mA: dead ? 0 : rnd(Math.max(0, i) * 1000), state };
      if (state !== 'open' && up) Object.assign(one, { r: Math.round(up.r + (dn ? dn.r : 0)), net: up.net });
      if (!el.ch){ out.meas[q.id] = one; continue; }
      (leds[q.id] = leds[q.id] || {})[el.ch] = one;
    } else if (el.k === 'D'){
      if (!live(el)) continue;
      const i = timeAvg(r => ri(r).i), ip = peak(r => ri(r).i), rev = timeAvg(r => -ri(r).vd);
      if (!el.dead && (i > el.imax || ip > el.isurge)) burn(el.key, '{name} burned out: {n} mA is more than it can carry', { name: q.id, n: Math.round(Math.max(i, ip) * 1000) });
      const across = motors.find(mm => mm.e.inductive && mm.a === el.b && mm.b === el.a);
      const clamp = across && !across.dead && switched(across) && timeAvg(r => Math.abs(r.el[across.n].i)) > 1e-3 && duties.length > 0;
      const vfx = el.def.model && typeof el.def.model.vf === 'function' ? el.def.model.vf : null;
      const state = el.dead ? 'burnt' : clamp ? 'clamp' : i > 1e-5 ? 'ok' : rev > .5 ? 'block' : 'off';
      if (e.ch != null) continue;
      out.meas[q.id] = { kind: 'diode', state, i_mA: rnd((clamp ? timeAvg(r => Math.abs(r.el[across.n].i)) : Math.max(0, i)) * 1000),
        v: rnd(i > 1e-5 ? (vfx ? vfx(i) : el.vf) : -rev, 100) };
    } else if (el.k === 'Q'){
      if (!live(el)) continue;
      const ib = timeAvg(r => ri(r).ib), ic = timeAvg(r => ri(r).ic), icp = peak(r => ri(r).ic);
      const conducting = res.reduce((a, r) => ri(r).ic > icp * .5 ? r : a, res[0]), vce = ri(conducting).vce;
      const pW = timeAvg(r => ri(r).ic * Math.abs(ri(r).vce) + ri(r).ib * el.vbe), tj = el.def.model && typeof el.def.model.tj === 'function' ? el.def.model.tj(pW) : 25 + (+e.theta || 200) * pW;
      if (!el.dead && (tj > (+e.tjmax || 150) || icp > (+e.icmax || 1) * 1.5)) burn(el.key, '{name} overheated and failed', { name: q.id });
      const hotW = +e.photW || (+e.pmax || .6) * .75, anyInv = res.some(r => ri(r).inv && ri(r).ic > 1e-4);
      // overdrive: the base carries the load (pin and load swapped): more base current than the part takes, and more
      // than flows in its collector
      const over = ib > (+e.ibmax || (+e.icmax || 1) / 10) && ib > ic;
      const state = el.dead ? 'burnt' : q.reversed || anyInv ? 'reverse' : over ? 'overdrive' : pW > hotW ? 'hot' : res.some(r => ri(r).sat && ri(r).ic > 1e-4) ? 'on' : ic > 1e-5 ? 'linear' : 'off';
      const one = { kind: 'npn', state, ib_mA: rnd(ib * 1000, 100), ic_mA: rnd(ic * 1000), vce: rnd(vce, 100), p_W: rnd(pW, 100), tj_C: Math.round(tj) };
      if (e.ch != null){ delete one.kind; (chans[q.id] = chans[q.id] || {})[e.ch] = one; continue; }
      out.meas[q.id] = one;
    } else if (el.k === 'M'){
      if (!live(el)) continue;
      const v = timeAvg(r => ri(r).v), mdl = el.def.model || {}, load = q.load || 'prop';
      const ss = typeof mdl.steady === 'function' ? mdl.steady(v, load) : { rpm: 0, i: v / Math.max(+e.ohms || 10, .1) };
      const vmax = +e.vmax || 12, polarRev = el.e.brushless && el.e.polar && v < -.3;
      const iA = load === 'stalled' ? Math.abs(v) / Math.max(+e.ohms || 1, .1) : polarRev ? 0 : Math.abs(ss.i || 0);
      const spike = e.inductive && Math.abs(v) > .3 && switched(el) && !flyback(el);
      const state = el.dead ? 'burnt' : polarRev ? 'reverse' : load === 'stalled' && Math.abs(v) > .3 ? 'stall' : Math.abs(v) > vmax ? 'over' : spike ? 'spike' : Math.abs(v) > .05 ? 'ok' : 'off';
      out.meas[q.id] = { kind: 'motor', state, v: rnd(v, 100), i_mA: Math.round(iA * 1000), rpm: Math.round(polarRev ? 0 : ss.rpm || 0) };
    } else if (el.k === 'SV'){
      if (!live(el)) continue;
      const vs = timeAvg(r => ri(r).vs), duty = timeAvg(r => ri(r).sig ? 1 : 0), mdl = el.def.model || {};
      const us = duty * (+e.period || .02) * 1e6, a = typeof mdl.angleOf === 'function' ? mdl.angleOf(us) : (us - 500) / 1900 * 180;
      const pulses = duty > 0 && duty <= .2, drv = st.drv && st.drv[q.id];
      const state = el.dead ? 'burnt' : vs < (+e.vmin || 4) ? (vs > .5 ? 'jitter' : 'off') : !pulses ? 'off' : vs > (+e.vmax || 6) + .5 ? 'over' : a < -3 || a > 183 ? 'stop' : 'ok';
      const angle = Math.max(0, Math.min(180, a)), moving = pulses && drv && Math.abs((drv.a || 0) - angle) > 2;
      m.i = state === 'stop' ? +e.istall || .7 : moving ? +e.imove || .2 : +e.iidle || .008;
      out.meas[q.id] = { kind: 'servo', state, ...(pulses ? { us: Math.round(us), angle: Math.round(angle) } : {}), i_mA: vs > .5 ? Math.round(m.i * 1000) : 0 };
    } else if (el.k === 'TS'){
      if (!live(el)) continue;
      const vs = timeAvg(r => ri(r).vs), vo = timeAvg(r => ri(r).on ? ri(r).vo : 0);
      if (vs < -.5) m.revT = (m.revT || 0) + dt; else m.revT = 0;
      if (!el.dead && (vs > (+e.vabs || 7) || m.revT > 3)) burn(el.key, '{name} overheated and failed', { name: q.id });
      const state = el.dead ? 'dead' : vs < -.5 ? 'hot' : vs <= .5 ? 'off' : vs < (+e.vmin || 2.7) ? 'low' : 'ok';
      out.meas[q.id] = { kind: 'sensor', state, v: rnd(vo, 1000), vs: rnd(vs, 100) };
    } else if (el.k === 'POT'){
      if (!live(el)) continue;
      const pp = peak(r => ri(r).p), hot = pp > el.pmax;
      m.hotT = hot ? (m.hotT || 0) + dt : 0;
      if (!el.dead && m.hotT > 2) burn(el.key, '{name} burned out: {w} W is too much for its track', { name: q.id, w: pp.toFixed(2) });
      out.meas[q.id] = { kind: 'pot', state: el.dead ? 'burnt' : hot ? 'hot' : 'ok', v: rnd(timeAvg(r => ri(r).vw), 100) };
    } else if (el.k === 'BZ'){
      const a = el.a, s = nets.find(x2 => x2.root === a && x2.kind === 'pin');
      if (!live(el) && !s) continue;
      const v = timeAvg(r => ri(r).vd), one = { kind: 'buzzer', state: el.active && v < -1 ? 'reverse' : Math.abs(v) > .5 || (s && s.hz) ? 'ok' : 'off', v: rnd(v, 100) };
      if (s) one.f = s.hz ? Math.round(s.hz) : 0;
      if (el.active) one.i_mA = rnd(Math.max(0, timeAvg(r => ri(r).i)) * 1000);
      out.meas[q.id] = one;
    }
  }
  for (const [id, ch] of Object.entries(leds)){
    const all = Object.values(ch), has = s => all.some(x2 => x2.state === s);
    out.meas[id] = { kind: 'led', i_mA: rnd(all.reduce((a, x2) => a + x2.i_mA, 0)), ch,
      state: has('ok') ? 'ok' : has('burnt') ? 'burnt' : has('reverse') ? 'reverse' : all.every(x2 => x2.state === 'open') ? 'open' : 'off' };
  }
  // a driver's channels, worst first; a stepper's coils, energised above a fifth of the rated current
  const WORST = ['burnt', 'hot', 'reverse', 'on', 'linear', 'off'];
  for (const [id, ch] of Object.entries(chans)){
    const all = Object.values(ch);
    out.meas[id] = { kind: 'driver', state: WORST.find(s => all.some(x2 => x2.state === s)) || 'off', ch,
      i_mA: Math.round(all.reduce((a, x2) => a + x2.ic_mA, 0)) };
  }
  for (const [id, { e, i: cs }] of Object.entries(coils)){
    const irated = (+e.vrated || 5) / Math.max(+e.ohms || 50, 1), on = {};
    for (const [w, i] of Object.entries(cs)) on[w] = i > irated / 5;
    out.meas[id] = { kind: 'stepper', state: Object.values(on).some(Boolean) ? 'ok' : 'off', coils: on,
      i_mA: Math.round(Object.values(cs).reduce((a, i) => a + Math.max(0, i), 0) * 1000) };
  }
  for (const bt of nl.buttons) out.meas[bt.id] = { kind: 'button', state: bt.shorted ? 'shorted' : 'ok', closed: !!(bt.shorted || bt.e.pressed) };
  // what a pin reads: the average volts on every board net the circuit uses (analogRead, digitalRead)
  for (const s of nets) if (s.kind === 'pin' || s.kind === 'input') out.volts[s.net] = rnd(Vavg(s.root), 100);
  return out;
};

/* ---------- sound: the loudest part that makes one (def.sound(p, m) → { hz, loud, how }) goes to the host ---------- */
B.solveSound = (st, parts) => {
  let best = null;
  for (const q of parts || []){
    const def = B.parts[q.part];
    if (!def || typeof def.sound !== 'function') continue;
    let snd = null;
    try { snd = def.sound(Object.assign({}, def.defaults || {}, q), (st.meas || {})[q.id]); } catch (e) { B.note(`${q.id} sound: ${e.message}`); }
    if (snd && snd.hz > 0 && (!best || snd.loud > best.loud)) best = { part: q.id, hz: Math.round(snd.hz), loud: rnd(snd.loud || 1, 100), how: snd.how || 'tone' };
  }
  const key = best ? best.part + ':' + best.hz + ':' + best.how : '';
  if (key !== (st.soundKey || '')){
    st.soundKey = key;
    try { if (window.CF_BRIDGE) CF_BRIDGE.send('tone', best || { part: null, hz: 0, loud: 0, how: 'off' }); } catch (e) {}
  }
  st.sound = best;
};
})();
