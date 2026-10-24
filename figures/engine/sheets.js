// Board Bench flat sheets: the schematic of the lesson circuit and the board's power tree. Both are drawn in viewBox
// units on a paper plate inside #art, so they get the same hand-ink filter, wobble and grain as the 3D views. Every
// symbol is pressable and selects the same part id as the 3D figure; live pin levels, rail voltages, LED current
// and state are drawn on the sheet. Data: the circuit (FIGURES-BENCH.md §9) and power.rails (§6).
(() => {
const B = SL.bench, T = B.T;
const vb = () => { const el = document.getElementById('fig'); const v = el && el.viewBox && el.viewBox.baseVal; return v && v.width ? v : { x: 0, y: 0, width: 200, height: 150 }; };
// the part of the frame the figure's own buttons and stats leave free (all of it with ?bare=1 or on a phone)
const sheetBox = () => { const v = vb(), el = document.getElementById('fig'); let x0 = v.x, x1 = v.x + v.width;
  try { const m = el.getScreenCTM(); if (m){ const inv = m.inverse(), btn = document.getElementById('btns'), sts = document.getElementById('stats');
    if (btn && btn.offsetParent){ const r = btn.getBoundingClientRect(), q = new DOMPoint(r.right + 10, r.top).matrixTransform(inv); if (q.x > x0 && q.x < v.x + v.width * .45) x0 = q.x; }
    if (sts && sts.offsetParent){ const r = sts.getBoundingClientRect(), q = new DOMPoint(r.left - 10, r.top).matrixTransform(inv); if (q.x < x1 && q.x > v.x + v.width * .55) x1 = q.x; } } } catch (e) {}
  return { x: x0, y: v.y, width: x1 - x0, height: v.height }; };
const esc = s => CF_ESC(String(s));
const txt = (x, y, s, size, col = INK, anchor = 'middle', weight = 700) => `<text x="${f(x)}" y="${f(y)}" font-size="${f(size)}" fill="${col}" text-anchor="${anchor}" font-family="ui-monospace,Menlo,monospace" font-weight="${weight}">${esc(s)}</text>`;
const ln = (pts, w = 1.1, col = INK, extra = '') => `<path d="M${pts.map(p => p.map(f).join(' ')).join('L')}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
const plate = (v, title) => {
  const m = v.width * .04;
  return `<rect x="${f(v.x + m)}" y="${f(v.y + m)}" width="${f(v.width - 2 * m)}" height="${f(v.height - 2 * m)}" rx="${f(m * .4)}" fill="#fbf8ef" stroke="${INK}" stroke-width="1.4"/>`
    + txt(v.x + m * 2, v.y + m * 2 + v.width * .022, title, v.width * .028, INK, 'start', 800);
};
const accent = 'var(--accent,#f4b829)';

/* ---------- schematic ---------- */
// series chains found by the solver: board pin -> resistors -> LED -> resistors -> GND
function chains(){
  const md = B.md, st = B.st, c = md.circuits[st.circuit]; if (!c) return [];
  const pl = B.bbPlace(); if (!pl) return [];
  const geo = pl.geo, par = {}, find = a => { while (par[a] && par[a] !== a) a = par[a]; return a; };
  const node = ref => { const h = B.hole(geo, ref); if (h) return h.node; const pin = B.pinOf(ref); return pin ? 'N:' + pin.net : null; };
  const uni = (a, b) => { par[a] = par[a] || a; par[b] = par[b] || b; const x = find(a), y = find(b); if (x !== y) par[x] = y; };
  for (const w of c.wires || []){ const a = node(w.from), b = node(w.to); if (a && b) uni(a, b); }
  const parts = (c.parts || []).map(p => Object.assign({}, p, (st.cparams || {})[p.id] || {}));
  const ns = p => (p.holes || []).map(h => { const n = node(h); if (n) par[n] = par[n] || n; return n; });
  const res = parts.filter(p => p.part === 'resistor').map(p => ({ p, n: ns(p) }));
  const netOf = n => { const r = find(n); for (const k of Object.keys(par)) if (k.startsWith('N:') && find(k) === r) return k.slice(2); return null; };
  const walk = (n, seen) => { const r = find(n); if (seen.has(r)) return null; seen.add(r); const net = netOf(n); if (net) return { net, rs: [] };
    for (const e of res){ const a = find(e.n[0]), b = find(e.n[1]), nx = a === r ? e.n[1] : b === r ? e.n[0] : null; if (!nx) continue; const w = walk(nx, seen); if (w) return { net: w.net, rs: [e.p, ...w.rs] }; }
    return null; };
  const out = [];
  for (const p of parts.filter(q => q.part === 'led')){ const [a, k] = ns(p); const up = a && walk(a, new Set()), dn = k && walk(k, new Set());
    out.push({ led: p, up, dn }); }
  return out;
}
const resSym = (x, y, w, sel, hi) => { const n = 6, h = w * .13, pts = [[x, y]]; for (let i = 0; i < n; i++) pts.push([x + w * (i + .5) / n, y + (i % 2 ? h : -h)]); pts.push([x + w, y]);
  return ln(pts, sel ? 2 : 1.3, hi ? '#b8402f' : INK); };
const ledSym = (x, y, s, lit, col, sel) => {
  const tri = [[x, y - s * .5], [x, y + s * .5], [x + s * .8, y]];
  let g = `<path d="M${tri.map(p => p.map(f).join(' ')).join('L')}Z" fill="${lit > .05 ? col : '#fbf8ef'}" stroke="${INK}" stroke-width="${sel ? 2 : 1.3}" stroke-linejoin="round"/>` + ln([[x + s * .8, y - s * .5], [x + s * .8, y + s * .5]], 1.4);
  for (const d of [0, 1]){ const ax = x + s * (.3 + d * .3), ay = y - s * .6; g += ln([[ax, ay], [ax + s * .35, ay - s * .4]], .9) + ln([[ax + s * .35, ay - s * .4], [ax + s * .18, ay - s * .37]], .9) + ln([[ax + s * .35, ay - s * .4], [ax + s * .32, ay - s * .22]], .9); }
  if (lit > .05) g = `<circle cx="${f(x + s * .4)}" cy="${f(y)}" r="${f(s * (.9 + lit * .5))}" fill="${col}" opacity="${f(.25 * lit)}"/>` + g;
  return g; };
const gndSym = (x, y, s) => ln([[x - s * .5, y], [x + s * .5, y]], 1.3) + ln([[x - s * .32, y + s * .2], [x + s * .32, y + s * .2]], 1.1) + ln([[x - s * .14, y + s * .4], [x + s * .14, y + s * .4]], 1);
B.viewDef('schematic', { flat: true, scene: () => {
  const v = sheetBox(), md = B.md, st = B.st, c = md.circuits[st.circuit];
  let s = plate(v, T('Schematic · {name}', { name: c ? T(c.title || st.circuit) : T(md.name) }));
  const u = v.width / 100, x0 = v.x + 12 * u, y0 = v.y + 20 * u;
  if (!c){ return s + txt(v.x + v.width / 2, v.y + v.height / 2, T('No circuit on the breadboard'), 3.2 * u, '#857d6e'); }
  const ch = chains(), meas = st.meas || {};
  // the board as a block with the pins the circuit uses
  const used = [...new Set(ch.flatMap(q => [q.up && q.up.net, q.dn && q.dn.net]).filter(Boolean))];
  const bh = Math.max(24 * u, used.length * 12 * u + 8 * u), bw = 20 * u;
  s += act('part', `<rect x="${f(x0)}" y="${f(y0)}" width="${f(bw)}" height="${f(bh)}" rx="${f(u)}" fill="#e8f1ef" stroke="${INK}" stroke-width="1.6"/>` + txt(x0 + bw / 2, y0 + bh / 2, T(md.name), 2.3 * u, INK, 'middle', 800), `data-id="${esc(md.power.mcu ? md.power.mcu.part : '')}" data-label="${esc(md.name)}"`);
  const pinY = {}; used.forEach((net, i) => { pinY[net] = y0 + 8 * u + i * 12 * u;
    const lv = st.o.pins[net], live = (+lv || 0) > .5 || (st.ev.rails[net] || 0) > .5;
    s += txt(x0 + bw - 1.2 * u, pinY[net] + 1.1 * u, net, 2.4 * u, live ? '#b8402f' : INK, 'end', 800)
      + (net !== 'GND' ? txt(x0 + bw + 2 * u, pinY[net] - 1.6 * u, live ? 'HIGH' : 'LOW', 1.8 * u, live ? '#b8402f' : '#857d6e', 'start', 800) : ''); });
  let row = 0;
  for (const q of ch){
    const y = (q.up && pinY[q.up.net]) || y0 + 8 * u + row * 12 * u; row++;
    const live = q.up && (((+st.o.pins[q.up.net] || 0) > .5) || (st.ev.rails[q.up.net] || 0) > .5);
    let x = x0 + bw; const seg = w => { const a = x; x += w; return a; };
    const wcol = live ? '#b8402f' : INK;
    s += ln([[seg(6 * u), y], [x, y]], 1.3, wcol);
    for (const r of (q.up ? q.up.rs : [])){ const a = seg(12 * u); s += act('bb', resSym(a, y, 12 * u, st.sel === r.id, live) + txt(a + 6 * u, y - 3.2 * u, r.id + ' ' + B.ohmsText(r.ohms), 2.1 * u), `data-id="${esc(r.id)}" data-label="${esc(T('Resistor') + ' ' + r.id)}"`); s += ln([[x, y], [x + 4 * u, y]], 1.3, wcol); x += 4 * u; }
    const m = meas[q.led.id] || {}, lit = m.state === 'ok' ? Math.min(1, Math.pow(Math.max(0, m.i_mA) / 13.6, .55)) : 0, col = (B.LED_COLORS || {})[q.led.color] || '#e8392e';
    const lx = seg(9 * u);
    s += act('bb', ledSym(lx, y, 6 * u, lit, col, st.sel === q.led.id) + txt(lx + 3 * u, y + 7.5 * u, q.led.id + ' ' + T(q.led.color || ''), 2.1 * u)
      + txt(lx + 3 * u, y - 9.5 * u, m.state === 'ok' && m.i_mA > 0 ? T('{n} mA', { n: m.i_mA.toFixed(1) }) : m.state ? T(m.state) : '', 2 * u, m.state === 'burnt' ? '#b8402f' : '#2f6b4f', 'middle', 800), `data-id="${esc(q.led.id)}" data-label="${esc(T('LED') + ' ' + q.led.id)}"`);
    s += ln([[x - 3 * u, y], [x + 4 * u, y]], 1.3); x += 4 * u;
    for (const r of (q.dn ? q.dn.rs : [])){ const a = seg(12 * u); s += act('bb', resSym(a, y, 12 * u, st.sel === r.id, false) + txt(a + 6 * u, y - 3.2 * u, r.id + ' ' + B.ohmsText(r.ohms), 2.1 * u), `data-id="${esc(r.id)}" data-label="${esc(T('Resistor') + ' ' + r.id)}"`); s += ln([[x, y], [x + 4 * u, y]], 1.3); x += 4 * u; }
    if (q.dn && q.dn.net === 'GND'){ s += ln([[x, y], [x, y + 8 * u]], 1.3) + gndSym(x, y + 8 * u, 6 * u) + txt(x + 5 * u, y + 9 * u, 'GND', 2 * u, INK, 'start'); }
    else s += txt(x + 2 * u, y + .8 * u, q.dn ? q.dn.net : T('not connected'), 2.2 * u, '#b8402f', 'start', 800);
  }
  return s;
} });

/* ---------- power tree ---------- */
B.viewDef('power', { flat: true, scene: () => {
  const v = sheetBox(), md = B.md, st = B.st, pw = md.power, u = v.width / 100;
  let s = plate(v, T('Power tree · {name}', { name: T(md.name) }));
  const rails = pw.rails || {}, srcs = pw.sources || {};
  // columns: sources, then rails by depth
  const depth = {}; const dOf = id => { if (depth[id] != null) return depth[id]; depth[id] = 1; const r = rails[id];
    let d = 1; for (const fd of r.from || []) if (fd.rail && rails[fd.rail] && fd.rail !== id) d = Math.max(d, dOf(fd.rail) + 1); return depth[id] = d; };
  Object.keys(rails).forEach(dOf);
  const cols = Math.max(1, ...Object.values(depth)) + 1, cw = (v.width - 16 * u) / cols, pos = {};
  const place = (ids, col) => ids.forEach((id, i) => { pos[id] = [v.x + 8 * u + cw * col + cw * .1, v.y + 16 * u + i * (v.height - 22 * u) / Math.max(1, ids.length) + 2 * u]; });
  place(Object.keys(srcs), 0);
  for (let d = 1; d < cols; d++) place(Object.keys(rails).filter(id => depth[id] === d), d);
  const bw = cw * .58, bh = 9 * u;
  // edges first, then the boxes, then the via-part pills on top
  let pills = '';
  for (const [rid, r] of Object.entries(rails)) for (const fd of r.from || []){
    const a = pos[fd.src || fd.rail], b = pos[rid]; if (!a || !b) continue;
    const live = (st.ev.rails[rid] || 0) > .5 && (fd.src ? st.power === fd.src : (st.ev.rails[fd.rail] || 0) > .5);
    const p0 = [a[0] + bw, a[1] + bh / 2], p1 = [b[0], b[1] + bh / 2], mx = (p0[0] + p1[0]) / 2;
    s += ln([p0, [mx, p0[1]], [mx, p1[1]], p1], live ? 2 : 1.1, live ? '#b8402f' : '#857d6e');
    const via = (fd.via || []).filter(id => !(srcs[fd.src] && srcs[fd.src].part === id));
    // a pill on a straight run between two boxes only has the gap, so it keeps to the part ids
    const horiz = Math.abs(p1[1] - p0[1]) < 1;
    if (via.length){ const lbl = via.join(' + ') + (!horiz && fd.reg != null ? ' · ' + T('{v} V reg.', { v: fd.reg }) : ''), missing = via.filter(id => !B.isSet(id));
      const fs = horiz ? Math.min(1.9 * u, (p1[0] - p0[0] - 2) / (CF_TW(lbl, 1) + 1.2)) : 1.9 * u, pw2 = CF_TW(lbl, fs) + fs * 1.2, my = (p0[1] + p1[1]) / 2;
      pills += act('part', `<rect x="${f(mx - pw2 / 2)}" y="${f(my - fs * .95)}" width="${f(pw2)}" height="${f(fs * 1.9)}" rx="${f(fs * .95)}" fill="${missing.length ? '#f6d1c9' : '#fff4d6'}" stroke="${INK}" stroke-width=".9"/>`
        + txt(mx, my + fs * .36, lbl, fs, INK, 'middle', 800), `data-id="${esc(via[0])}" data-label="${esc(B.md.byId[via[0]] ? B.md.byId[via[0]].name : via[0])}"`); }
  }
  const boxAt = (id, label, sub, live, actId) => { const [x, y] = pos[id];
    return act('part', `<rect x="${f(x)}" y="${f(y)}" width="${f(bw)}" height="${f(bh)}" rx="${f(1.5 * u)}" fill="${live ? accent : '#fbf8ef'}" stroke="${INK}" stroke-width="1.4"/>`
      + txt(x + bw / 2, y + bh * .45, label, Math.min(2.4 * u, bw / Math.max(4, label.length) * 1.3), INK, 'middle', 800) + txt(x + bw / 2, y + bh * .82, sub, Math.min(1.9 * u, bw / Math.max(4, String(sub).length) * 1.3), INK, 'middle', 700), `data-id="${esc(actId || '')}" data-label="${esc(label)}"`); };
  for (const [k, src] of Object.entries(srcs)){ const on = st.power === k, v2 = st.supply[k] != null ? st.supply[k] : src.v;
    s += boxAt(k, T(src.label || k), on ? T('{v} V connected', { v: v2 }) : T('{v} V', { v: src.range ? src.range.join('–') : src.v }), on, src.part); }
  for (const rid of Object.keys(rails)){ const vv = st.ev.rails[rid] || 0; s += boxAt(rid, rid, vv > .05 ? vv.toFixed(2) + ' V' : T('off'), vv > .5, ''); }
  s += pills;
  if (st.ev.why) s += txt(v.x + v.width / 2, v.y + v.height - 7 * u, st.ev.why, 2.2 * u, '#b8402f', 'middle', 800);
  return s;
} });
})();
