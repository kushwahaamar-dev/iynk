// @vitest-environment node
import { describe, expect, it } from "vitest";
import { newId } from "../../core/ids.ts";
import type { Project } from "../../project/generated/types.ts";
import { interfaceOf } from "../../parts/pins.ts";
import { blinkCircuit } from "../testing/blink-circuit.ts";
import { registry } from "../testing/breadboard-fixture.ts";
import type { IdSource } from "../views/breadboard.ts";
import { canConnect, wireRecipe } from "./connect.ts";

const VIEW = "vw_bb";

/** The blink circuit with 500 more resistors on the view, each with a net to its neighbour and a wire. */
function crowded(): Project {
  const base = blinkCircuit().project;
  const resistor = registry.latest("core.resistor")!;
  const parts = Array.from({ length: 500 }, (_, i) => `cmp_p${i}`);
  return {
    ...base,
    components: [...base.components, ...parts.map((id, i) => ({ id, definition: { ref: resistor.id, version: resistor.version }, refdes: `R${i + 100}` }))],
    dependencies: {
      ...base.dependencies,
      components: [...base.dependencies.components, { ref: resistor.id, version: resistor.version, origin: "builtin" as const, interface: interfaceOf(resistor) }],
    },
    nets: [...base.nets, ...parts.map((id, i) => ({ id: `net_p${i}`, connections: [{ c: id, p: "P2" }, { c: parts[(i + 1) % parts.length]!, p: "P1" }] as never }))],
    views: base.views.map((v) =>
      v.id === VIEW
        ? {
            ...v,
            placements: [...v.placements, ...parts.map((c, i) => ({ c, x_mm: (i % 25) * 12, y_mm: 100 + Math.floor(i / 25) * 6 }))],
            wires: [
              ...v.wires,
              ...parts.map((c, i) => ({
                id: `wir_p${i}`,
                net: `net_p${i}`,
                from: { kind: "pin" as const, c, p: "P2" },
                to: { kind: "pin" as const, c: parts[(i + 1) % parts.length]!, p: "P1" },
              })),
            ],
          }
        : v,
    ),
  };
}

function medianMs(run: () => void, rounds: number, perRound: number): number {
  const times: number[] = [];
  for (let r = 0; r < rounds; r++) {
    const start = performance.now();
    for (let i = 0; i < perRound; i++) run();
    times.push((performance.now() - start) / perRound);
  }
  return times.sort((a, b) => a - b)[Math.floor(rounds / 2)]!;
}

describe("connection rule budgets at 500 parts", () => {
  const state = crowded();
  const a = { kind: "pin" as const, c: "cmp_p3", p: "P1" };
  const b = { kind: "pin" as const, c: "cmp_p40", p: "P2" };

  it("answers canConnect in under 50 microseconds once the state is indexed", () => {
    canConnect(state, VIEW, a, b);
    expect(medianMs(() => canConnect(state, VIEW, a, b), 9, 500)).toBeLessThan(0.05);
  });

  it("builds a wire recipe in under a millisecond", () => {
    const ids: IdSource = (prefix) => newId(prefix);
    wireRecipe(state, VIEW, a, b, ids);
    expect(medianMs(() => wireRecipe(state, VIEW, a, b, ids), 9, 50)).toBeLessThan(1);
  });
});
