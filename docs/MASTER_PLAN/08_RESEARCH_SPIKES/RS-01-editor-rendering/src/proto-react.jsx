// React 19 SVG: one memoised component per part and per wire. Viewport and scene state live in two components,
// so a pan re-renders only the transform group and a drag or hover re-renders only the parts and wires that changed.
import { memo, useState, useImperativeHandle, forwardRef } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { itemAttrs, partTransform, movePart, WIRE, HOT } from './scene.js';

const camel = k => k.replace(/-(\w)/g, (_, c) => c.toUpperCase());
const reactAttrs = it => Object.fromEntries(Object.entries(itemAttrs(it)).map(([k, v]) => [camel(k), v]));
const Art = memo(({ src }) => src.items.map((it, i) => { const T = it.t.toLowerCase(); return <T key={i} {...reactAttrs(it)} />; }));
const Part = memo(({ x, y, s, bx, by, src }) => <g transform={partTransform({ x, y, s, bx, by })}><Art src={src} /></g>);
const Wire = memo(({ pts, hot }) => <polyline fill="none" strokeLinejoin="round" stroke={hot ? HOT : WIRE} strokeWidth={hot ? 3 : 1.5} points={pts} />);

const Scene = forwardRef(({ scene, bySrc }, ref) => {
  const [, setTick] = useState(0);
  const [hot, setHot] = useState(null);
  useImperativeHandle(ref, () => ({
    move: (id, x, y) => { movePart(scene.parts[id], x, y); flushSync(() => setTick(t => t + 1)); },
    hover: n => flushSync(() => setHot(n)),
  }));
  const hotSet = hot == null ? null : new Set(scene.nets[hot]);
  return <>
    <g>{scene.parts.map(p => <Part key={p.id} x={p.x} y={p.y} s={p.s} bx={p.bx} by={p.by} src={bySrc[p.src]} />)}</g>
    <g>{scene.wires.map(w => <Wire key={w.id} pts={w.str} hot={!!hotSet && hotSet.has(w.id)} />)}</g>
  </>;
});

const Viewport = forwardRef(({ children, w, h }, ref) => {
  const [v, setV] = useState([0, 0, 1]);
  useImperativeHandle(ref, () => ({ set: view => flushSync(() => setV(view)) }));
  return <svg width={w} height={h}><g transform={`matrix(${v[2]} 0 0 ${v[2]} ${v[0]} ${v[1]})`}>{children}</g></svg>;
});

export function mount(root, scene, sources) {
  const bySrc = Object.fromEntries(sources.map(s => [s.name, s]));
  const vp = { current: null }, sc = { current: null };
  const rr = createRoot(root);
  flushSync(() => rr.render(<Viewport ref={vp} w={root.clientWidth} h={root.clientHeight}><Scene ref={sc} scene={scene} bySrc={bySrc} /></Viewport>));
  return {
    name: 'react',
    update(s) {
      if (s.move) sc.current.move(...s.move);
      if ('hot' in s) sc.current.hover(s.hot);
      if (s.view) vp.current.set(s.view);
    },
    nodes: () => root.querySelectorAll('*').length,
  };
}
