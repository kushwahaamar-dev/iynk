// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { boardIds, loadBoard } from '../../src/project/convert/convert.testing.ts';
import { convertLesson } from '../../src/project/convert/lesson.ts';
import { netlist, nodeOfPin } from '../../src/project/netlist.ts';
import { buildFigure, loadFigure } from './testkit.mjs';

// The converter and the figure share an algorithm (union-find over strips, wires and legs), so a mistake in both
// would pass every other test. This one asks the figure: for each part the solver measures with a `net` (the first
// named net reached through resistors, as the figure walks it), the converted project's netlist must put the part's
// pin in a node reached the same way.

const DRIVE = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`D${i + 2}`, 1]));

let uno;
let page;
beforeAll(async () => {
  expect(boardIds()).toContain('uno-r3');
  uno = await loadBoard('uno-r3');
  page = await loadFigure(buildFigure('boards/uno-r3'), { path: '/figures/boards/uno-r3.html' });
});
afterAll(() => page?.close());

/** The names of the first named node reached from `pin` of `component`, crossing resistors. */
function reachedNames(project, nl, component, pin) {
  const resistors = project.components.filter((c) => c.definition.ref === 'core.resistor');
  const seen = new Set();
  const todo = [nodeOfPin(nl, component, pin)];
  while (todo.length) {
    const node = todo.shift();
    if (!node || seen.has(node.id)) continue;
    seen.add(node.id);
    if (node.names.length > 0) return node.names;
    for (const r of resistors) {
      for (const [here, there] of [['P1', 'P2'], ['P2', 'P1']]) {
        if (node.pins.some((p) => p.c === r.id && p.p === here)) todo.push(nodeOfPin(nl, r.id, there));
      }
    }
  }
  return [];
}

const circuits = () => [...new Set(uno.item.data.lessons.map((l) => l.circuit).filter(Boolean))];

describe('the converted Uno R3 circuits against the figure solver', () => {
  it('has circuits to check', () => {
    expect(circuits().length).toBeGreaterThanOrEqual(14);
  });

  it('puts every measured part in the node the figure names', () => {
    let checked = 0;
    for (const key of circuits()) {
      const lesson = uno.item.data.lessons.find((l) => l.circuit === key);
      const { project } = convertLesson(uno.item, lesson.id, uno.texts, uno.circuits, uno.ctx);
      const nl = netlist(project);

      page.bench.accept({ circuit: key, power: 'usb', pins: DRIVE });
      page.bench.advance(0.3);
      const { meas } = page.bench.report();

      for (const [part, m] of Object.entries(meas)) {
        const component = `cmp_${part.toLowerCase()}`;
        const channels = m.ch ? Object.entries(m.ch).map(([ch, one]) => [ch, one.net]) : [['A', m.net]];
        for (const [pin, net] of channels) {
          if (net === undefined) continue;
          checked++;
          expect(reachedNames(project, nl, component, pin), `${key} ${part}.${pin}`).toContain(net);
        }
      }
    }
    expect(checked).toBeGreaterThanOrEqual(5);
  });
});
