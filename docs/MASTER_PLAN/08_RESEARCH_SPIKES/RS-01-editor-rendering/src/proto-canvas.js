// Canvas 2D: Path2D per artwork element built once, parts culled to the viewport, normal wires batched into one stroke.
import { WIRE, HOT, movePart, CELL } from './scene.js';

function compile(src) {
  return src.items.map(it => {
    const p = new Path2D();
    if (it.t === 'path') p.addPath(new Path2D(it.d));
    else if (it.t === 'circle') p.arc(+it.cx, +it.cy, +it.r, 0, 6.2832);
    else if (it.t === 'ellipse') p.ellipse(+it.cx, +it.cy, +it.rx, +it.ry, 0, 0, 6.2832);
    else p.rect(+it.x, +it.y, +it.width, +it.height);
    const fill = !it.fill || it.fill === 'none' ? null : it.fill.startsWith('url') ? '#888' : it.fill;
    return { p, fill, stroke: it.stroke && it.stroke !== 'none' ? it.stroke : null, sw: +it['stroke-width'] || 1, lj: it['stroke-linejoin'] || 'miter', lc: it['stroke-linecap'] || 'butt', op: it.opacity ? +it.opacity : 1 };
  });
}

export function mount(root, scene, sources) {
  const vw = root.clientWidth, vh = root.clientHeight, dpr = window.devicePixelRatio || 1;
  const cv = document.createElement('canvas');
  cv.width = vw * dpr; cv.height = vh * dpr; cv.style.width = vw + 'px'; cv.style.height = vh + 'px';
  root.appendChild(cv);
  const ctx = cv.getContext('2d'), art = Object.fromEntries(sources.map(s => [s.name, compile(s)]));
  let view = [0, 0, 1], hot = [];
  function draw() {
    const [tx, ty, k] = view, x0 = -tx / k - CELL, y0 = -ty / k - CELL, x1 = (vw - tx) / k + CELL, y1 = (vh - ty) / k + CELL;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    for (const p of scene.parts) {
      if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
      const m = k * p.s;
      ctx.setTransform(dpr * m, 0, 0, dpr * m, dpr * (tx + k * (p.x - p.bx * p.s)), dpr * (ty + k * (p.y - p.by * p.s)));
      for (const a of art[p.src]) {
        ctx.globalAlpha = a.op;
        if (a.fill) { ctx.fillStyle = a.fill; ctx.fill(a.p); }
        if (a.stroke) { ctx.strokeStyle = a.stroke; ctx.lineWidth = a.sw; ctx.lineJoin = a.lj; ctx.lineCap = a.lc; ctx.stroke(a.p); }
      }
    }
    ctx.globalAlpha = 1; ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * tx, dpr * ty); ctx.lineJoin = 'round';
    const hotSet = new Set(hot), trace = w => { const q = w.pts; ctx.moveTo(q[0], q[1]); ctx.lineTo(q[2], q[3]); ctx.lineTo(q[4], q[5]); ctx.lineTo(q[6], q[7]); };
    ctx.beginPath(); ctx.strokeStyle = WIRE; ctx.lineWidth = 1.5;
    for (const w of scene.wires) if (!hotSet.has(w.id) && Math.max(w.pts[0], w.pts[2], w.pts[6]) > x0 && Math.min(w.pts[0], w.pts[2], w.pts[6]) < x1) trace(w);
    ctx.stroke();
    ctx.beginPath(); ctx.strokeStyle = HOT; ctx.lineWidth = 3; hot.forEach(i => trace(scene.wires[i])); ctx.stroke();
  }
  // one update per frame redraws synchronously, like the DOM prototypes mutate synchronously
  return {
    name: 'canvas',
    update(s) {
      if (s.view) view = s.view;
      if (s.move) movePart(scene.parts[s.move[0]], s.move[1], s.move[2]);
      if ('hot' in s) hot = s.hot == null ? [] : scene.nets[s.hot];
      draw();
    },
    nodes: () => root.querySelectorAll('*').length,
  };
}
