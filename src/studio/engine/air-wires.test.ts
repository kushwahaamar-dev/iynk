// @vitest-environment node
import { describe, expect, it } from "vitest";
import { newId } from "../../core/ids.ts";
import type { Op, Project } from "../../project/generated/types.ts";
import { createSession } from "../../project/session.ts";
import { seededRandom, steppingClock } from "../../project/session.testing.ts";
import { interfaceOf } from "../../parts/pins.ts";
import { blinkCircuit } from "../testing/blink-circuit.ts";
import { registry } from "../testing/breadboard-fixture.ts";
import { createRecordingDoc } from "../testing/recording-doc.ts";
import { airWires } from "./air-wires.ts";
import type { HitTarget, PointMm, Scene } from "./types.ts";

const VIEW = "vw_bb";

function sceneAt(points: Record<string, PointMm>): Scene {
  const targets: HitTarget[] = Object.entries(points).map(([key, at]) => {
    const [c, p] = key.split("/") as [string, string];
    return { item: c, hit: { kind: "pin", c, p }, bbox: { x0: at.x - 0.5, y0: at.y - 0.5, x1: at.x + 0.5, y1: at.y + 0.5 } };
  });
  return { viewId: VIEW, items: [], targets, index: { query: () => [], pick: () => null }, stats: { items: 0, elements: 0, lod: [0, 0, 0], culled: 0, dropped: 0, buildMs: 0 } };
}

const length = (w: { a: PointMm; b: PointMm }) => Math.hypot(w.a.x - w.b.x, w.a.y - w.b.y);

/** Four resistors in one net with nothing drawn between them. */
function undrawn(): Project {
  const resistor = registry.latest("core.resistor")!;
  const doc = createRecordingDoc(createSession({ state: blinkCircuit().project, clock: steppingClock(), rnd: seededRandom() }));
  const parts: Op[] = [
    { k: "dep.set", dependency: { ref: resistor.id, version: resistor.version, origin: "builtin", interface: interfaceOf(resistor) } },
    ...[1, 2, 3, 4].map((n): Op => ({ k: "component.add", component: { id: `cmp_q${n}`, definition: { ref: resistor.id, version: resistor.version }, refdes: `R${n + 20}` } })),
    { k: "net.create", net: { id: newId("net"), connections: [1, 2, 3, 4].map((n) => ({ c: `cmp_q${n}`, p: "P1" })) as never } },
  ];
  const done = doc.commit(parts, { label: "undrawn" });
  if (!done.ok) throw new Error(done.message);
  return doc.getState().state;
}

describe("airWires", () => {
  it("joins four undrawn groups with the three shortest lines", () => {
    const scene = sceneAt({ "cmp_q1/P1": { x: 0, y: 0 }, "cmp_q2/P1": { x: 10, y: 0 }, "cmp_q3/P1": { x: 30, y: 0 }, "cmp_q4/P1": { x: 30, y: 5 } });
    const wires = airWires(undrawn(), VIEW, scene);
    expect(wires).toHaveLength(3);
    expect(wires.map(length).sort((a, b) => a - b)).toEqual([5, 10, 20]);
    expect(new Set(wires.map((w) => w.net)).size).toBe(1);
  });

  it("draws nothing for a net with one group, or for groups that are not on screen", () => {
    const state = undrawn();
    expect(airWires(state, VIEW, sceneAt({ "cmp_q1/P1": { x: 0, y: 0 } }))).toEqual([]);
    expect(airWires(state, VIEW, sceneAt({}))).toEqual([]);
  });

  it("draws nothing for a fully drawn net", () => {
    const { project, uno, r1, led, button } = blinkCircuit();
    const scene = sceneAt({
      [`${uno}/D13`]: { x: 0, y: 0 },
      [`${uno}/D2`]: { x: 0, y: 5 },
      [`${uno}/GND`]: { x: 0, y: 10 },
      [`${r1}/P1`]: { x: 20, y: 0 },
      [`${r1}/P2`]: { x: 30, y: 0 },
      [`${led}/A`]: { x: 30, y: 5 },
      [`${led}/K`]: { x: 32, y: 5 },
      [`${button}/P2`]: { x: 40, y: 0 },
      [`${button}/P4`]: { x: 40, y: 6 },
    });
    expect(airWires(project, VIEW, scene)).toEqual([]);
  });

  it("shows the link again once its wire is deleted", () => {
    const { project, uno, r1, wires } = blinkCircuit();
    const doc = createRecordingDoc(createSession({ state: project, clock: steppingClock(), rnd: seededRandom() }));
    doc.commit([{ k: "wire.remove", view: VIEW, id: wires[0]! }], { label: "delete" });
    const scene = sceneAt({ [`${uno}/D13`]: { x: 0, y: 0 }, [`${r1}/P1`]: { x: 20, y: 0 } });
    expect(airWires(doc.getState().state, VIEW, scene)).toEqual([{ net: expect.any(String), a: { x: 0, y: 0 }, b: { x: 20, y: 0 } }]);
  });
});
