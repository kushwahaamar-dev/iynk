// Shared scene model: parts laid out on a grid, wires grouped into nets, orthogonal routing.
export const CELL = 90, PART = 50;
export function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function buildScene(sources, nParts, nWires, seed = 1) {
  const r = rng(seed), cols = Math.ceil(Math.sqrt(nParts * 1.25)), parts = [];
  for (let i = 0; i < nParts; i++) {
    const src = sources[Math.floor(r() * sources.length)], [bx, by, bw, bh] = src.bbox, s = PART / Math.max(bw, bh);
    const w = bw * s, h = bh * s, col = i % cols, row = Math.floor(i / cols);
    parts.push({ id: i, src: src.name, s, bx, by, w, h, col, row, x: col * CELL + CELL / 2 - w / 2, y: row * CELL + CELL / 2 - h / 2,
      off: [[-5, h / 2], [w + 5, h / 2], [w / 2, -5], [w / 2, h + 5]], used: [0, 0, 0, 0], wires: [] });
  }
  const wires = [], nets = [];
  for (let guard = 0; wires.length < nWires && guard < nWires * 30; guard++) {
    const a = parts[Math.floor(r() * nParts)], cand = [];
    for (let dr = -3; dr <= 3; dr++) for (let dc = -3; dc <= 3; dc++) {
      const q = parts[(a.row + dr) * cols + a.col + dc];
      if (q && a.row + dr >= 0 && a.col + dc >= 0 && a.col + dc < cols) for (let j = 0; j < 4; j++) if (!q.used[j]) cand.push([q, j]);
    }
    const k = Math.min(2 + Math.floor(r() * 4), cand.length);
    if (k < 2) continue;
    const pick = [];
    while (pick.length < k) pick.push(cand.splice(Math.floor(r() * cand.length), 1)[0]);
    pick.forEach(([q, j]) => { q.used[j] = 1; });
    pick.sort((u, v) => u[0].x - v[0].x);
    const ids = [], net = nets.length;
    for (let i = 0; i < k - 1 && wires.length < nWires; i++) {
      const w = { id: wires.length, net, a: pick[i], b: pick[i + 1], j: (r() - 0.5) * 24, pts: null, str: '' };
      route(w); pick[i][0].wires.push(w); pick[i + 1][0].wires.push(w); wires.push(w); ids.push(w.id);
    }
    nets.push(ids);
  }
  return { parts, wires, nets, cols, rows: Math.ceil(nParts / cols), width: cols * CELL, height: Math.ceil(nParts / cols) * CELL };
}

export function pinPos(p, j) { return [p.x + p.off[j][0], p.y + p.off[j][1]]; }
export function route(w) {
  const [ax, ay] = pinPos(w.a[0], w.a[1]), [bx, by] = pinPos(w.b[0], w.b[1]), mx = (ax + bx) / 2 + w.j;
  w.pts = [ax, ay, mx, ay, mx, by, bx, by];
  w.str = ax.toFixed(1) + ',' + ay.toFixed(1) + ' ' + mx.toFixed(1) + ',' + ay.toFixed(1) + ' ' + mx.toFixed(1) + ',' + by.toFixed(1) + ' ' + bx.toFixed(1) + ',' + by.toFixed(1);
}
export function movePart(p, x, y) { p.x = x; p.y = y; p.wires.forEach(route); return p.wires; }
export const partTransform = p => `translate(${p.x.toFixed(2)} ${p.y.toFixed(2)}) scale(${p.s.toFixed(4)}) translate(${-p.bx} ${-p.by})`;
export const WIRE = '#2b3a55', HOT = '#e8392e';

export function itemAttrs(it) { const o = {}; for (const k in it) if (k !== 't') o[k] = it[k]; return o; }
export function partMarkup(src) {
  return src.items.map(it => `<${it.t.toLowerCase()} ${Object.entries(itemAttrs(it)).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`).join('');
}
