// Vanilla SVG. variant: 'plain' | 'cull' (hide off-screen parts and wires) | 'use' (artwork once in defs, one <use> per part)
// | 'lod' (cull, plus below zoom 0.7 swap the detailed art for one outline rectangle per part)
import { partTransform, partMarkup, WIRE, HOT, movePart, CELL } from './scene.js';
const NS = 'http://www.w3.org/2000/svg';

export function mount(root, scene, sources, variant = 'plain') {
  const vw = root.clientWidth, vh = root.clientHeight;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', vw); svg.setAttribute('height', vh);
  const world = document.createElementNS(NS, 'g');
  svg.appendChild(world); root.appendChild(svg);
  let defs = '';
  if (variant === 'use') defs = '<defs>' + sources.map(s => `<g id="s-${s.name}">${partMarkup(s)}</g>`).join('') + '</defs>';
  const bySrc = Object.fromEntries(sources.map(s => [s.name, s]));
  const parts = scene.parts.map(p => `<g class="p" transform="${partTransform(p)}">` + (variant === 'use' ? `<use href="#s-${p.src}"/>` : variant === 'lod' ? `<rect class="o" display="none" x="${p.bx}" y="${p.by}" width="${p.w / p.s}" height="${p.h / p.s}" fill="#e3e0d2" stroke="#231e16" stroke-width="${2 / p.s}"/><g class="a">${partMarkup(bySrc[p.src])}</g>` : partMarkup(bySrc[p.src])) + '</g>').join('');
  const wires = scene.wires.map(w => `<polyline fill="none" stroke="${WIRE}" stroke-width="1.5" stroke-linejoin="round" points="${w.str}"/>`).join('');
  world.innerHTML = defs + `<g id="parts">${parts}</g><g id="wires">${wires}</g>`;
  const partEls = [...world.querySelector('#parts').children], wireEls = [...world.querySelector('#wires').children];
  const shown = new Uint8Array(partEls.length).fill(1), wshown = new Uint8Array(wireEls.length).fill(1);
  let hot = [], low = false;
  const wb = scene.wires.map(w => { const xs = [w.pts[0], w.pts[2], w.pts[6]], ys = [w.pts[1], w.pts[7]]; return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; });
  return {
    name: 'svg-' + variant,
    setView(tx, ty, k) {
      world.setAttribute('transform', `matrix(${k} 0 0 ${k} ${tx} ${ty})`);
      if (variant === 'lod' && (k < 0.7) !== low) {
        low = k < 0.7;
        partEls.forEach(g => { g.querySelector('.o').setAttribute('display', low ? '' : 'none'); g.querySelector('.a').setAttribute('display', low ? 'none' : ''); });
      }
      if (variant !== 'cull' && variant !== 'lod') return;
      const x0 = -tx / k - CELL, y0 = -ty / k - CELL, x1 = (vw - tx) / k + CELL, y1 = (vh - ty) / k + CELL;
      scene.parts.forEach((p, i) => { const v = p.x > x0 && p.x < x1 && p.y > y0 && p.y < y1 ? 1 : 0; if (v !== shown[i]) { shown[i] = v; partEls[i].style.display = v ? '' : 'none'; } });
      wb.forEach((b, i) => { const v = b[2] > x0 && b[0] < x1 && b[3] > y0 && b[1] < y1 ? 1 : 0; if (v !== wshown[i]) { wshown[i] = v; wireEls[i].style.display = v ? '' : 'none'; } });
    },
    movePart(id, x, y) {
      const p = scene.parts[id];
      partEls[id].setAttribute('transform', (movePart(p, x, y), partTransform(p)));
      p.wires.forEach(w => wireEls[w.id].setAttribute('points', w.str));
    },
    hoverNet(n) {
      hot.forEach(i => { wireEls[i].setAttribute('stroke', WIRE); wireEls[i].setAttribute('stroke-width', 1.5); });
      hot = n == null ? [] : scene.nets[n];
      hot.forEach(i => { wireEls[i].setAttribute('stroke', HOT); wireEls[i].setAttribute('stroke-width', 3); });
    },
    update(s) { if (s.view) this.setView(...s.view); if (s.move) this.movePart(...s.move); if ('hot' in s) this.hoverNet(s.hot); },
    nodes: () => root.querySelectorAll('*').length,
  };
}
