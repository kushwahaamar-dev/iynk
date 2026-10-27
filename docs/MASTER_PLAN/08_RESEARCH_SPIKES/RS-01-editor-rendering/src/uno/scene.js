// Uno + LED + resistor demo scene, shared by the vanilla and xyflow builds. Plain data, no art (art is the same in both).
const unoPins = ['D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5', '5V', 'GND'];
export const nodes = [
  { id: 'uno', label: 'Arduino Uno', x: 0, y: 0, w: 140, h: 360, pins: unoPins.map((p, i) => ({ id: p, side: 'right', y: 20 + i * 16.5 })) },
  { id: 'led', label: 'LED', x: 420, y: 60, w: 60, h: 90, pins: [{ id: 'A', side: 'left', y: 25 }, { id: 'K', side: 'left', y: 65 }] },
  { id: 'r1', label: 'R1 220', x: 420, y: 220, w: 90, h: 50, pins: [{ id: '1', side: 'left', y: 15 }, { id: '2', side: 'left', y: 35 }] },
];
export const edges = [
  ['uno', 'D13', 'r1', '1'], ['r1', '2', 'led', 'A'], ['uno', 'GND', 'led', 'K'],
  ...unoPins.slice(0, 12).map((p, i) => i % 2 ? ['uno', p, 'r1', '2'] : ['uno', p, 'led', 'A']),
  ['uno', '5V', 'r1', '1'], ['uno', 'A0', 'r1', '2'], ['uno', 'A1', 'led', 'K'], ['uno', 'A2', 'led', 'K'], ['uno', 'A3', 'r1', '1'],
].slice(0, 20).map(([a, ap, b, bp], i) => ({ id: 'e' + i, a, ap, b, bp }));
