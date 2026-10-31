// @vitest-environment node
import { describe, expect, it } from "vitest";
import { newId } from "../../core/ids.ts";
import type { Op, PinRef, Project } from "../../project/generated/types.ts";
import { netlist } from "../../project/netlist.ts";
import { checkAll } from "../../project/semantic.ts";
import { createSession } from "../../project/session.ts";
import { seededRandom, steppingClock } from "../../project/session.testing.ts";
import { interfaceOf } from "../../parts/pins.ts";
import { registry } from "../testing/breadboard-fixture.ts";
import { blinkCircuit } from "../testing/blink-circuit.ts";
import { createRecordingDoc } from "../testing/recording-doc.ts";
import type { IdSource } from "../views/breadboard.ts";
import { REFUSALS, canConnect, connectedGroups, cutAnalysis, legRecipe, staticFlags, wireRecipe } from "./connect.ts";
import type { WireEndRef } from "./connect.ts";

const VIEW = "vw_bb";
const ids: IdSource = (prefix) => newId(prefix);
const kinds = (batch: Op[]) => batch.map((op) => op.k);
const pin = (c: string, p: string): WireEndRef => ({ kind: "pin", c, p });

const circuit = blinkCircuit();
const hole = (h: string): WireEndRef => ({ kind: "hole", surface: circuit.breadboard, hole: h });
const uno = (p: string) => pin("brd_uno", p);
const refusal = (state: Project, a: WireEndRef, b: WireEndRef | null) => {
  const verdict = canConnect(state, VIEW, a, b);
  return verdict.ok ? "ok" : verdict.code;
};

function withPinType(state: Project, ref: string, pinId: string, type: "mechanical" | "digital_out"): Project {
  return {
    ...state,
    dependencies: {
      ...state.dependencies,
      components: state.dependencies.components.map((dep) =>
        dep.ref === ref ? { ...dep, interface: { ...dep.interface, pins: dep.interface.pins.map((p) => (p.id === pinId ? { ...p, type } : p)) } } : dep,
      ),
    },
  };
}

describe("canConnect", () => {
  const { project } = circuit;

  it("refuses a pin to itself", () => {
    expect(refusal(project, uno("D8"), uno("D8"))).toBe("same-pin");
    expect(refusal(project, hole("a1"), hole("a1"))).toBe("same-pin");
  });

  it("refuses a pin the part does not have", () => {
    expect(refusal(project, uno("D99"), uno("D8"))).toBe("no-such-pin");
    expect(refusal(project, uno("D8"), pin("cmp_missing", "P1"))).toBe("no-such-pin");
  });

  it("refuses a mechanical pin", () => {
    expect(refusal(withPinType(project, "core.uno-r3", "D9", "mechanical"), uno("D8"), uno("D9"))).toBe("mechanical-pin");
  });

  it("refuses a part that is still in the tray", () => {
    const tray = { ...project, views: project.views.map((v) => (v.id === VIEW ? { ...v, placements: v.placements.filter((p) => p.c !== circuit.r1) } : v)) };
    expect(canConnect(tray, VIEW, uno("D8"), pin(circuit.r1, "P1"))).toEqual({ ok: false, code: "not-on-view", args: { part: "R1" } });
  });

  it("refuses a hole the breadboard does not have, or one of another surface", () => {
    expect(refusal(project, uno("D8"), hole("z99"))).toBe("hole-not-on-surface");
    expect(refusal(project, uno("D8"), { kind: "hole", surface: "cmp_other", hole: "a1" })).toBe("hole-not-on-surface");
  });

  it("refuses two holes of one strip", () => {
    expect(canConnect(project, VIEW, hole("a20"), hole("e20"))).toEqual({ ok: false, code: "same-strip", args: { a: "a20", b: "e20" } });
  });

  it("refuses a second wire between the same two ends, in either order", () => {
    expect(refusal(project, uno("D13"), hole("c5"))).toBe("duplicate-wire");
    expect(refusal(project, hole("c5"), uno("D13"))).toBe("duplicate-wire");
  });

  it("refuses a release on empty canvas", () => {
    expect(refusal(project, uno("D8"), null)).toBe("empty-target");
  });

  it("refuses two bare holes, which have nothing to put in a net", () => {
    expect(refusal(project, hole("a20"), hole("a25"))).toBe("empty-target");
  });

  it("refuses a wire past the 5000 a view may hold", () => {
    const wires = Array.from({ length: 5000 }, (_, i) => ({
      id: `wir_q${i}`,
      net: "net_q",
      from: { kind: "junction" as const, id: `jct_a${i}` },
      to: { kind: "junction" as const, id: `jct_b${i}` },
    }));
    const full = { ...project, views: project.views.map((v) => (v.id === VIEW ? { ...v, wires } : v)) };
    expect(canConnect(full, VIEW, uno("D8"), uno("D9"))).toEqual({ ok: false, code: "quota", args: { limit: "5000" } });
  });

  it("refuses a net past the 2000 pins it may hold", () => {
    const net = project.nets.find((n) => n.connections.some((c) => c.p === "D13"))!;
    const crowd = Array.from({ length: 1999 }, (_, i) => ({ c: `cmp_x${i}`, p: "P1" }));
    const crowded = { ...project, nets: project.nets.map((n) => (n === net ? { ...n, connections: [...n.connections, ...crowd] as typeof n.connections } : n)) };
    expect(canConnect(crowded, VIEW, uno("D8"), uno("D13"))).toEqual({ ok: false, code: "quota", args: { limit: "2000" } });
  });

  it("refuses a viewer and a read-only open before looking at the ends", () => {
    expect(canConnect(project, VIEW, uno("D8"), uno("D9"), "viewer")).toMatchObject({ ok: false, code: "permission" });
    expect(canConnect(project, VIEW, uno("D8"), uno("D9"), "read-only")).toMatchObject({ ok: false, code: "read-only" });
  });

  it("covers every refusal code in the closed list", () => {
    expect(REFUSALS).toHaveLength(11);
  });

  it("allows two free pins, a free pin and a netted one, two nets and one net twice", () => {
    expect(refusal(project, uno("D8"), uno("D9"))).toBe("ok");
    expect(refusal(project, uno("D8"), uno("D13"))).toBe("ok");
    expect(refusal(project, uno("D2"), uno("D13"))).toBe("ok");
    expect(refusal(project, uno("D13"), pin(circuit.r1, "P1"))).toBe("ok");
  });

  it("does not refuse a short, it flags it", () => {
    expect(refusal(project, uno("P5V"), uno("GND"))).toBe("ok");
  });
});

describe("wireRecipe", () => {
  const { project } = circuit;
  const wireOf = (batch: Op[]) => (batch[batch.length - 1] as Extract<Op, { k: "wire.add" }>).wire;

  it("makes a net and a wire for two free pins", () => {
    const { batch, label } = wireRecipe(project, VIEW, uno("D8"), uno("D9"), ids);
    expect(kinds(batch)).toEqual(["net.create", "wire.add"]);
    expect(batch[0]).toMatchObject({ net: { connections: [{ c: "brd_uno", p: "D8" }, { c: "brd_uno", p: "D9" }] } });
    expect(wireOf(batch)).toMatchObject({ from: { kind: "pin", p: "D8" }, to: { kind: "pin", p: "D9" } });
    expect(label).toBe("Wire U1.D8 to U1.D9");
  });

  it("connects a free pin to the net of the other", () => {
    const { batch } = wireRecipe(project, VIEW, uno("D8"), uno("D13"), ids);
    expect(kinds(batch)).toEqual(["net.connect", "wire.add"]);
    expect(batch[0]).toMatchObject({ pin: { p: "D8" } });
    expect(wireOf(batch).net).toBe((batch[0] as Extract<Op, { k: "net.connect" }>).net);
  });

  it("merges two nets", () => {
    const { batch } = wireRecipe(project, VIEW, uno("D2"), uno("D13"), ids);
    expect(kinds(batch)).toEqual(["net.merge", "wire.add"]);
    expect(wireOf(batch).net).toBe((batch[0] as Extract<Op, { k: "net.merge" }>).into);
  });

  it("only adds the wire when both ends are in one net", () => {
    expect(kinds(wireRecipe(project, VIEW, uno("D13"), pin(circuit.r1, "P1"), ids).batch)).toEqual(["wire.add"]);
  });

  it("joins the net a strip already carries", () => {
    const { batch } = wireRecipe(project, VIEW, uno("D8"), hole("a12"), ids);
    expect(kinds(batch)).toEqual(["net.connect", "wire.add"]);
    expect(batch[0]).toMatchObject({ pin: { c: "brd_uno", p: "D8" } });
  });

  it("flags a supply tied to ground as a short circuit", () => {
    const { flags } = wireRecipe(project, VIEW, uno("P5V"), uno("GND"), ids);
    expect(flags.map((f) => f.rule)).toEqual(["short-circuit"]);
    expect(flags[0]!.pins.map((p) => p.p).sort()).toContain("P5V");
  });

  it("flags two outputs tied together as contention and says nothing for plain pins", () => {
    const outputs = withPinType(withPinType(project, "core.uno-r3", "D8", "digital_out"), "core.uno-r3", "D9", "digital_out");
    expect(wireRecipe(outputs, VIEW, uno("D8"), uno("D9"), ids).flags.map((f) => f.rule)).toEqual(["output-contention"]);
    expect(wireRecipe(project, VIEW, uno("D8"), uno("D9"), ids).flags).toEqual([]);
  });

  it("commits as one undoable batch that the validators accept", () => {
    const doc = createRecordingDoc(createSession({ state: project, clock: steppingClock(), rnd: seededRandom() }));
    const { batch, label } = wireRecipe(project, VIEW, uno("D8"), uno("D9"), ids);
    expect(doc.commit(batch, { label }).ok).toBe(true);
    expect(doc.commits).toHaveLength(1);
    expect(netlist(doc.getState().state).nodes.some((n) => n.pins.some((p) => p.p === "D8") && n.pins.some((p) => p.p === "D9"))).toBe(true);
    expect(doc.undo()?.ok).toBe(true);
    expect(doc.getState().state.nets).toEqual(project.nets);
  });
});

describe("staticFlags", () => {
  it("reads the electrical node, so a ground joined through a part's internal short counts", () => {
    const shorted = wireRecipe(circuit.project, VIEW, uno("P5V"), uno("POWER_6"), ids);
    const doc = createRecordingDoc(createSession({ state: circuit.project, clock: steppingClock(), rnd: seededRandom() }));
    doc.commit(shorted.batch, { label: shorted.label });
    expect(staticFlags(doc.getState().state, [shorted.flags[0]!.net]).map((f) => f.rule)).toEqual(["short-circuit"]);
  });

  it("is quiet for the blink circuit", () => {
    expect(staticFlags(circuit.project, circuit.project.nets.map((n) => n.id))).toEqual([]);
  });
});

describe("legRecipe", () => {
  const R = (n: number) => `cmp_r${n}`;

  function bench() {
    const resistor = registry.latest("core.resistor")!;
    const doc = createRecordingDoc(createSession({ state: blinkCircuit().project, clock: steppingClock(), rnd: seededRandom() }));
    const parts: Op[] = [
      { k: "dep.set", dependency: { ref: resistor.id, version: resistor.version, origin: "builtin", interface: interfaceOf(resistor) } },
      ...[1, 2, 3].map((n): Op => ({ k: "component.add", component: { id: R(n), definition: { ref: resistor.id, version: resistor.version }, refdes: `R${n + 10}` } })),
    ];
    doc.commit(parts, { label: "parts" });
    const place = (n: number, legs: Record<string, string>) => {
      const state = doc.getState().state;
      const recipe = legRecipe(state, VIEW, R(n), legs, ids);
      const batch: Op[] = [{ k: "view.place", view: VIEW, placement: { c: R(n), x_mm: 0, y_mm: 0, legs } }, ...recipe];
      const done = doc.commit(batch, { label: "legs" });
      if (!done.ok) throw new Error(done.message);
      return recipe;
    };
    const nodes = () => netlist(doc.getState().state).nodes.map((n) => n.pins.map((p) => `${p.c}.${p.p}`));
    return { doc, place, nodes };
  }

  it("writes nothing for a leg in an empty strip", () => {
    const { place } = bench();
    expect(place(1, { P1: "a30" })).toEqual([]);
  });

  it("takes a lone leg of a strip into the net of a wire that ends there", () => {
    const { doc, place, nodes } = bench();
    place(1, { P1: "a30" });
    const wired = wireRecipe(doc.getState().state, VIEW, uno("D8"), { kind: "hole", surface: doc.getState().state.views[0]!.surface!, hole: "c30" }, ids);
    expect(kinds(wired.batch)).toEqual(["net.create", "wire.add"]);
    doc.commit(wired.batch, { label: "wire" });
    expect(nodes()).toContainEqual(["brd_uno.D8", `${R(1)}.P1`]);
  });

  it("makes a net when a second pin lands in the strip", () => {
    const { place, nodes } = bench();
    place(1, { P1: "a30" });
    expect(kinds(place(2, { P1: "c30" }))).toEqual(["net.create"]);
    expect(nodes()).toContainEqual([`${R(1)}.P1`, `${R(2)}.P1`].sort());
  });

  it("connects a third pin to the net the strip carries", () => {
    const { place } = bench();
    place(1, { P1: "a30" });
    place(2, { P1: "b30" });
    expect(kinds(place(3, { P1: "c30" }))).toEqual(["net.connect"]);
  });

  it("takes in a lone pin of the strip when a pin with a net lands there", () => {
    const { place } = bench();
    place(1, { P1: "a30" });
    place(2, { P1: "a29" });
    expect(kinds(place(2, { P1: "c30" }))).toEqual(["net.create"]);
  });

  it("merges when a pin with a net lands in a strip that carries another", () => {
    const { doc, place, nodes } = bench();
    place(1, { P1: "a30" });
    place(2, { P1: "b30" });
    const view = doc.getState().state.views.find((v) => v.id === VIEW)!;
    const wired = wireRecipe(doc.getState().state, VIEW, uno("D8"), pin(R(3), "P1"), ids);
    doc.commit([{ k: "view.place", view: VIEW, placement: { c: R(3), x_mm: 0, y_mm: 0 } }, ...wired.batch], { label: "loose" });
    expect(view.wires.length).toBeGreaterThan(0);
    expect(kinds(place(3, { P1: "c30" }))).toEqual(["net.merge"]);
    expect(nodes().some((pins) => pins.includes("brd_uno.D8") && pins.includes(`${R(1)}.P1`))).toBe(true);
  });

  it("writes nothing for a netted pin that lands in an empty strip, or stays in its strip", () => {
    const { place } = bench();
    place(1, { P1: "a30" });
    place(2, { P1: "b30" });
    expect(place(1, { P1: "c30" })).toEqual([]);
  });

  it("takes a lifted pin out of its net", () => {
    const { place, nodes } = bench();
    place(1, { P1: "a30" });
    place(2, { P1: "b30" });
    expect(kinds(place(2, { P1: "a28" }))).toEqual(["net.disconnect"]);
    expect(nodes().flat()).not.toContain(`${R(2)}.P1`);
  });

  it("splits a net whose pins a moved leg no longer joins, when a wire holds the pin", () => {
    const { doc, place, nodes } = bench();
    place(1, { P1: "a30" });
    const wired = wireRecipe(doc.getState().state, VIEW, pin(R(1), "P1"), uno("D8"), ids);
    doc.commit(wired.batch, { label: "wire" });
    place(2, { P1: "b30" });
    expect(kinds(place(2, { P1: "a28" }))).toEqual(["net.disconnect"]);
    expect(nodes().some((pins) => pins.includes(`${R(1)}.P1`) && pins.includes("brd_uno.D8"))).toBe(true);
  });
});

describe("cutAnalysis", () => {
  const { project, wires } = circuit;

  it("says a wire that is the only link splits its net, with the larger part first", () => {
    const result = cutAnalysis(project, VIEW, wires[0]!);
    expect(result.splits).toBe(true);
    expect(result.groups).toHaveLength(2);
    expect(result.groups.flat().map((p) => p.p).sort()).toEqual(["D13", "P1"]);
  });

  it("says a wire in a loop does not split anything", () => {
    const extra = wireRecipe(project, VIEW, uno("D13"), pin(circuit.r1, "P1"), ids);
    const doc = createRecordingDoc(createSession({ state: project, clock: steppingClock(), rnd: seededRandom() }));
    doc.commit(extra.batch, { label: extra.label });
    const added = (extra.batch[0] as Extract<Op, { k: "wire.add" }>).wire.id;
    expect(cutAnalysis(doc.getState().state, VIEW, added)).toMatchObject({ splits: false });
  });

  it("joins a strip's legs and the shorts inside a part", () => {
    const net = project.nets.find((n) => n.connections.some((c) => c.c === circuit.button && c.p === "P4"))!;
    const groups = connectedGroups(project, VIEW, net.id);
    expect(groups).toHaveLength(1);
  });

  it("answers no groups for a net that does not exist", () => {
    expect(connectedGroups(project, VIEW, "net_none")).toEqual([]);
  });
});

function mulberry(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The partition of the netlist's pins by an independent union-find over wires, legs, strips and shorts inside parts. */
function oracle(state: Project): string[] {
  const parent = new Map<string, string>();
  const find = (k: string): string => {
    const up = parent.get(k) ?? k;
    if (up === k) return k;
    const root = find(up);
    parent.set(k, root);
    return root;
  };
  const union = (a: string, b: string) => void parent.set(find(a), find(b));
  const view = state.views.find((v) => v.id === VIEW)!;
  const bb = state.dependencies.components.find((d) => d.interface.role === "surface")!.interface;
  const stripOf = new Map(bb.groups!.flatMap((g) => g.pins.map((p) => [p, `strip:${g.id}`] as const)));
  const end = (e: Project["views"][number]["wires"][number]["from"]) => (e.kind === "pin" ? `${e.c}/${e.p}` : e.kind === "hole" ? stripOf.get(e.hole)! : e.id);
  for (const w of view.wires) union(end(w.from), end(w.to));
  for (const pl of view.placements) for (const [leg, h] of Object.entries(pl.legs ?? {})) union(`${pl.c}/${leg}`, stripOf.get(h!)!);
  for (const inst of [...state.boards, ...state.components]) {
    const iface = state.dependencies.components.find((d) => d.ref === inst.definition.ref && d.version === inst.definition.version)!.interface;
    for (const g of iface.groups ?? []) if (g.kind !== "strip") for (const p of g.pins) union(`${inst.id}/${g.pins[0]}`, `${inst.id}/${p}`);
  }
  const netted = Object.keys(netlist(state).pinNode).map((k) => k.replace("\u0000", "/"));
  const classes = new Map<string, string[]>();
  for (const k of netted) classes.set(find(k), [...(classes.get(find(k)) ?? []), k]);
  return [...classes.values()].map((c) => c.sort().join(",")).sort();
}

describe("random gestures", () => {
  it("keep the document valid and the nets equal to the union-find oracle", () => {
    const random = mulberry(0x1234abcd);
    const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)]!;
    const start = blinkCircuit();
    const doc = createRecordingDoc(createSession({ state: start.project, clock: steppingClock(), rnd: seededRandom() }));
    const rows = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];
    const holes = [...rows.flatMap((r) => [3, 4, 5, 6].map((n) => `${r}${n}`)), "RAIL_BN2", "RAIL_BN3", "RAIL_BP2"];
    const pinsOf: [string, string[]][] = [
      ["brd_uno", ["D2", "D8", "D9", "D12", "D13", "GND", "P5V", "POWER_6"]],
      [start.r1, ["P1", "P2"]],
      [start.led, ["A", "K"]],
      [start.button, ["P1", "P2", "P3", "P4"]],
    ];
    const anyEnd = (): WireEndRef => {
      if (random() < 0.5) return { kind: "hole", surface: start.breadboard, hole: pick(holes) };
      const [c, ps] = pick(pinsOf);
      return pin(c, pick(ps));
    };

    let wiresMade = 0;
    let moves = 0;
    for (let i = 0; i < 200; i++) {
      const state = doc.getState().state;
      if (random() < 0.65) {
        const a = anyEnd();
        const b = random() < 0.05 ? null : anyEnd();
        const verdict = canConnect(state, VIEW, a, b);
        if (!verdict.ok) continue;
        const recipe = wireRecipe(state, VIEW, a, b!, ids);
        const done = doc.commit(recipe.batch, { label: recipe.label });
        expect(done, `wire ${i}`).toMatchObject({ ok: true });
        wiresMade++;
      } else {
        const [c, ps] = pick(pinsOf.slice(1));
        const taken = new Set(state.views.find((v) => v.id === VIEW)!.placements.filter((p) => p.c !== c).flatMap((p) => Object.values(p.legs ?? {})));
        const free = holes.filter((h) => !taken.has(h));
        const legs: Record<string, string> = {};
        for (const p of ps) {
          if (random() < 0.15) continue;
          const choice = pick(free.filter((h) => !Object.values(legs).includes(h)));
          legs[p] = choice;
        }
        const at = state.views.find((v) => v.id === VIEW)!.placements.find((p) => p.c === c)!;
        const batch: Op[] = [{ k: "view.place", view: VIEW, placement: { ...at, legs } }, ...legRecipe(state, VIEW, c, legs, ids)];
        const done = doc.commit(batch, { label: "move" });
        expect(done, `move ${i}`).toMatchObject({ ok: true });
        moves++;
      }
      const after = doc.getState().state;
      expect(checkAll(after).filter((d) => d.severity === "error"), `V3 after gesture ${i}`).toEqual([]);
      expect(oracle(after), `nets after gesture ${i}`).toEqual(
        netlist(after)
          .nodes.map((n) => n.pins.map((p: PinRef) => `${p.c}/${p.p}`).sort().join(","))
          .sort(),
      );
    }
    expect(wiresMade).toBeGreaterThan(40);
    expect(moves).toBeGreaterThan(40);
  });
});
