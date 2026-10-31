import { buildScene } from './scene.js';
import * as svgProto from './proto-svg.js';
import * as canvasProto from './proto-canvas.js';
import * as reactProto from './proto-react.jsx';

const DUR = 5000, WARM = 500;
let api, scene, W, H;
const lerp = (a, b, t) => a + (b - a) * t;
const view = (cx, cy, k) => [W / 2 - cx * k, H / 2 - cy * k, k];

window.__mount = async (proto, nParts, nWires) => {
  const sources = await (await fetch('parts.json')).json();
  scene = buildScene(sources, nParts, nWires);
  const root = document.getElementById('root'); root.innerHTML = '';
  W = root.clientWidth; H = root.clientHeight;
  const t0 = performance.now();
  const [kind, variant] = proto.split('-');
  api = kind === 'svg' ? svgProto.mount(root, scene, sources, variant || 'plain') : kind === 'canvas' ? canvasProto.mount(root, scene, sources) : reactProto.mount(root, scene, sources);
  api.update({ view: view(scene.width / 2, scene.height / 2, 1) });
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const arts = sources.reduce((s, x) => s + x.items.length, 0) / sources.length;
  return { mountMs: performance.now() - t0, nodes: api.nodes(), wires: scene.wires.length, nets: scene.nets.length, parts: scene.parts.length,
    elementsDrawn: scene.parts.reduce((s, p) => s + sources.find(x => x.name === p.src).items.length, 0), meanArt: arts };
};

// the part nearest the scene centre is dragged; the nets near it are hovered
const centre = () => scene.parts.reduce((b, p) => Math.hypot(p.x - scene.width / 2, p.y - scene.height / 2) < Math.hypot(b.x - scene.width / 2, b.y - scene.height / 2) ? p : b);
const scripts = {
  'pan-1x': u => ({ view: view(scene.width / 2 + 700 * Math.sin(2 * Math.PI * u), scene.height / 2 + 450 * Math.sin(4 * Math.PI * u), 1) }),
  'pan-fit': u => ({ view: view(scene.width / 2 + 90 * Math.sin(2 * Math.PI * u), scene.height / 2 + 60 * Math.sin(4 * Math.PI * u), 0.4) }),
  'zoom': u => ({ view: view(scene.width / 2, scene.height / 2, Math.exp(lerp(Math.log(0.4), Math.log(2.5), 0.5 - 0.5 * Math.cos(2 * Math.PI * u)))) }),
  'drag': (u, i, ctx) => ({ move: [ctx.part.id, ctx.x0 + 80 * Math.cos(4 * Math.PI * u) - 80, ctx.y0 + 80 * Math.sin(4 * Math.PI * u)] }),
  'hover': (u, i, ctx) => (i % 6 === 0 ? { hot: ctx.nets[(i / 6) % ctx.nets.length] } : null),
};

function run(name) {
  return new Promise(res => {
    const part = centre(), x0 = part.x, y0 = part.y;
    api.update({ view: view(scene.width / 2, scene.height / 2, name === 'pan-fit' ? 0.4 : 1) });
    const ctx = { part, x0, y0, nets: scene.nets.map((_, i) => i).filter(i => scene.nets[i].length >= 2).slice(0, 60) };
    const deltas = [], js = [];
    let start = null, last = null, i = 0;
    const f = ts => {
      if (start === null) start = ts;
      const t = ts - start;
      if (last !== null && t > WARM) deltas.push(ts - last);
      last = ts;
      if (t >= DUR + WARM) {
        if (name === 'drag') api.update({ move: [part.id, x0, y0] });
        return res({ deltas, js });
      }
      const s = scripts[name]((t) / (DUR + WARM), i++, ctx);
      const a = performance.now();
      if (s) api.update(s);
      if (t > WARM) js.push(performance.now() - a);
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
}
window.__run = run;
window.__names = Object.keys(scripts);
