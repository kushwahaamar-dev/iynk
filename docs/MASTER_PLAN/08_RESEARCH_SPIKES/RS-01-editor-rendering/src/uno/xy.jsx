import { ReactFlow, Handle, Position, Background } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { createRoot } from 'react-dom/client';
import { nodes, edges } from './scene.js';

const Part = ({ data }) => <div style={{ width: data.w, height: data.h, background: '#fff', border: '1.5px solid #231e16', borderRadius: 6, fontSize: 11 }}>
  {data.label}
  {data.pins.map(p => <Handle key={p.id} id={p.id} type="source" position={p.side === 'right' ? Position.Right : Position.Left} style={{ top: p.y }} />)}
</div>;
const nodeTypes = { part: Part };
const rfNodes = nodes.map(n => ({ id: n.id, type: 'part', position: { x: n.x, y: n.y }, data: n }));
const rfEdges = edges.map(e => ({ id: e.id, source: e.a, sourceHandle: e.ap, target: e.b, targetHandle: e.bp, type: 'step' }));
createRoot(document.getElementById('app')).render(
  <div style={{ width: '100%', height: '100%' }}><ReactFlow nodes={rfNodes} edges={rfEdges} nodeTypes={nodeTypes} connectionMode="loose" fitView><Background /></ReactFlow></div>);
