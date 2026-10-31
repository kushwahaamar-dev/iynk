// The vanilla editor core: pan, wheel zoom about the cursor, draggable nodes, orthogonal wires, drag-from-pin to wire.
import { nodes, edges } from './scene.js';
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent && parent.appendChild(e); return e; };

export function createEditor(root, nodeData, edgeData) {
  const svg = el('svg', { width: '100%', height: '100%' }, root), world = el('g', {}, svg);
  const wireLayer = el('g', {}, world), nodeLayer = el('g', {}, world), ghost = el('polyline', { fill: 'none', stroke: '#e8392e', 'stroke-width': 2 }, world);
  const view = { x: 40, y: 40, k: 1 }, byId = {}, wires = edgeData.map(e => ({ ...e }));
  const apply = () => world.setAttribute('transform', `matrix(${view.k} 0 0 ${view.k} ${view.x} ${view.y})`);
  const toWorld = ev => { const r = svg.getBoundingClientRect(); return [(ev.clientX - r.left - view.x) / view.k, (ev.clientY - r.top - view.y) / view.k]; };
  const pinXY = (n, p) => [n.x + (p.side === 'right' ? n.w : 0), n.y + p.y];
  const path = (a, b) => { const mx = (a[0] + b[0]) / 2; return [a, [mx, a[1]], [mx, b[1]], b].map(q => q.join(',')).join(' '); };
  const pin = (id, pid) => { const n = byId[id]; return pinXY(n, n.pins.find(p => p.id === pid)); };

  for (const n of nodeData) {
    byId[n.id] = n;
    n.g = el('g', { transform: `translate(${n.x} ${n.y})`, cursor: 'move' }, nodeLayer);
    el('rect', { width: n.w, height: n.h, rx: 6, fill: '#fff', stroke: '#231e16', 'stroke-width': 1.5 }, n.g);
    el('text', { x: 6, y: -6, 'font-size': 11 }, n.g).textContent = n.label;
    for (const p of n.pins) {
      const c = el('circle', { cx: p.side === 'right' ? n.w : 0, cy: p.y, r: 4, fill: '#2b3a55', cursor: 'crosshair' }, n.g);
      c.addEventListener('pointerdown', ev => startWire(ev, n, p));
    }
    n.g.addEventListener('pointerdown', ev => { if (ev.target.tagName !== 'circle') drag(ev, d => { n.x += d[0]; n.y += d[1]; n.g.setAttribute('transform', `translate(${n.x} ${n.y})`); redraw(); }); });
  }
  function redraw() { wires.forEach(w => { w.el ||= el('polyline', { fill: 'none', stroke: '#2b3a55', 'stroke-width': 1.5 }, wireLayer); w.el.setAttribute('points', path(pin(w.a, w.ap), pin(w.b, w.bp))); }); }
  function drag(ev, onMove) {
    ev.stopPropagation(); let last = [ev.clientX, ev.clientY];
    const move = e => { onMove([(e.clientX - last[0]) / view.k, (e.clientY - last[1]) / view.k]); last = [e.clientX, e.clientY]; };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  }
  function startWire(ev, n, p) {
    ev.stopPropagation(); const from = pinXY(n, p);
    const move = e => ghost.setAttribute('points', path(from, toWorld(e)));
    const up = e => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up); ghost.setAttribute('points', '');
      const hit = nodeData.flatMap(m => m.pins.map(q => [m, q])).find(([m, q]) => Math.hypot(...toWorld(e).map((v, i) => v - pinXY(m, q)[i])) < 8);
      if (hit) { wires.push({ id: 'e' + wires.length, a: n.id, ap: p.id, b: hit[0].id, bp: hit[1].id }); redraw(); }
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  }
  svg.addEventListener('pointerdown', ev => drag(ev, d => { view.x += d[0] * view.k; view.y += d[1] * view.k; apply(); }));
  svg.addEventListener('wheel', ev => {
    ev.preventDefault(); const r = svg.getBoundingClientRect(), k = Math.min(4, Math.max(0.2, view.k * Math.exp(-ev.deltaY * 0.002))), mx = ev.clientX - r.left, my = ev.clientY - r.top;
    view.x = mx - (mx - view.x) * k / view.k; view.y = my - (my - view.y) * k / view.k; view.k = k; apply();
  }, { passive: false });
  apply(); redraw();
  return { view, wires, byId, redraw };
}
if (typeof document !== 'undefined') { window.editor = createEditor(document.getElementById('app'), nodes.map(n => ({ ...n })), edges); }
