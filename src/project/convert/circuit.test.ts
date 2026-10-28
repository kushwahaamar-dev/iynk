// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractBoardCircuits, extractBoardHeaders, extractPartLegs } from "../../../scripts/figure-extract.mjs";
import { listItems, loadItem } from "../../../scripts/convert-io.mjs";
import type { Project } from "../generated/types.ts";
import type { InterfaceSnapshot } from "../holes.ts";
import { pinSets } from "../netlist.ts";
import { BOARD_INSTANCE, circuitToNets, partInstance } from "./circuit.ts";
import type { CircuitContext } from "./circuit.ts";
import { boardInterface, partInterface } from "./interfaces.ts";
import type { BoardInterface } from "./interfaces.ts";
import type { CatalogueItem, FigureCircuit, FigureHeader } from "./types.ts";

type BoardItem = CatalogueItem & { lab: "board" };

const example = JSON.parse(
  readFileSync(new URL("../../../docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples/lesson-uno-r3-button.project.json", import.meta.url), "utf8")
    .replaceAll("brd_uno", BOARD_INSTANCE)
    .replaceAll("cmp_bb1", "cmp_bb"),
) as Project;

const legsOf = new Map<string, string[]>();
async function contextOf(circuit: FigureCircuit): Promise<CircuitContext> {
  const parts = new Map<string, InterfaceSnapshot>();
  for (const part of circuit.parts) {
    if (!legsOf.has(part.part)) legsOf.set(part.part, (await extractPartLegs(`figures/parts/${part.part}.js`)) as string[]);
    parts.set(part.id, partInterface(part.part, legsOf.get(part.part)!));
  }
  return { parts, surface: "cmp_bb", kind: circuit.breadboard };
}

async function boardOf(id: string): Promise<{ board: BoardInterface; circuits: Record<string, FigureCircuit> }> {
  const item = loadItem("board", id) as BoardItem;
  const headers = (await extractBoardHeaders(id)) as FigureHeader[];
  return { board: boardInterface(item, headers), circuits: (await extractBoardCircuits(id)) as Record<string, FigureCircuit> };
}

const uno = await boardOf("uno-r3");
const convert = async (circuit: FigureCircuit) => circuitToNets(circuit, uno.board, await contextOf(circuit));
const members = (nets: { connections: { c: string; p: string }[] }[]) =>
  nets.map((n) => n.connections.map((m) => `${m.c}.${m.p}`).sort()).sort();

describe("circuitToNets for the Uno R3 button circuit", () => {
  it("gives the five nets, five wires and placements of the lesson example", async () => {
    const out = await convert(uno.circuits.button!);
    const view = example.views[0]!;
    expect(out.report).toEqual([]);
    expect(out.nets).toEqual(example.nets);
    expect(out.wires).toEqual(view.wires);
    expect(out.placements).toEqual(view.placements);
  });

  it("has the members of PDM 11.4", async () => {
    const { nets } = await convert(uno.circuits.button!);
    expect(nets.map((n) => n.name)).toEqual(["5V", "D13", "D2", "GND", undefined]);
    expect(members(nets)).toEqual(
      [
        ["brd_main.P5V", "cmp_btn1.P1"],
        ["brd_main.D2", "cmp_btn1.P3", "cmp_res1.P1"],
        ["brd_main.GND", "cmp_led1.K", "cmp_res1.P2"],
        ["brd_main.D13", "cmp_res2.P1"],
        ["cmp_led1.A", "cmp_res2.P2"],
      ].map((m) => m.sort()).sort(),
    );
  });

  it("is deterministic", async () => {
    expect(JSON.stringify(await convert(uno.circuits.button!))).toBe(JSON.stringify(await convert(uno.circuits.button!)));
  });

  it("gives the same nets as the netlist of the example", async () => {
    const { nets } = await convert(uno.circuits.button!);
    const doc = structuredClone(example);
    doc.nets = nets;
    expect(pinSets(await import("../netlist.ts").then((m) => m.netlist(doc)))).toEqual(
      pinSets(await import("../netlist.ts").then((m) => m.netlist(example))),
    );
  });
});

describe("circuitToNets for the Uno R3 blink circuit", () => {
  it("joins the pin D13 to the resistor, and the LED cathode to GND", async () => {
    const out = await convert(uno.circuits.blink!);
    expect(out.report).toEqual([]);
    expect(out.wires).toHaveLength(2);
    expect(members(out.nets)).toEqual(
      [
        ["brd_main.D13", "cmp_res1.P1"],
        ["brd_main.GND", "cmp_led1.K"],
        ["cmp_led1.A", "cmp_res1.P2"],
      ].map((m) => m.sort()).sort(),
    );
  });
});

describe("circuitToNets on bad and special data", () => {
  const circuit = (over: Partial<FigureCircuit>): FigureCircuit => ({
    breadboard: "half",
    parts: [{ id: "RES1", part: "resistor", holes: ["b10", "b14"] }],
    wires: [],
    ...over,
  });

  it("reports a wire that names a hole off the breadboard, keeps no wire for it and invents no net", async () => {
    const bad = circuit({ wires: [{ from: "IOH.5", to: "b64" }, { from: "D2", to: "a10", color: "blue" }] });
    const out = await convert(bad);
    expect(out.report).toHaveLength(1);
    expect(out.report[0]).toMatchObject({ code: "unresolved-endpoint", refs: ["wire 1", "b64"] });
    expect(out.report[0]!.message).toContain("wire 1");
    expect(out.wires.map((w) => w.id)).toEqual(["wir_2"]);
    expect(members(out.nets)).toEqual([["brd_main.D2", "cmp_res1.P1"]]);
  });

  it("reports a header reference that is not on the board", async () => {
    const out = await convert(circuit({ wires: [{ from: "IOH.99", to: "a10" }] }));
    expect(out.report.map((r) => r.code)).toEqual(["unresolved-endpoint"]);
    expect(out.nets).toEqual([]);
    expect(out.wires).toEqual([]);
  });

  it("reports a leg whose hole is off the breadboard", async () => {
    const out = await convert(circuit({ parts: [{ id: "RES1", part: "resistor", holes: ["b10", "k14"] }] }));
    expect(out.report).toMatchObject([{ code: "unresolved-endpoint", refs: ["RES1", "k14"] }]);
    expect(out.placements.find((p) => p.c === "cmp_res1")!.legs).toEqual({ P1: "b10" });
  });

  it("reports a hole count that does not match the legs", async () => {
    const out = await convert(circuit({ parts: [{ id: "RES1", part: "resistor", holes: ["b10", "b14", "b15"] }] }));
    expect(out.report.map((r) => r.code)).toEqual(["unresolved-endpoint"]);
  });

  it("reports a part that has no interface", async () => {
    const wired = circuit({ parts: [{ id: "X1", part: "resistor", holes: ["b10", "b14"] }] });
    const ctx = await contextOf(wired);
    ctx.parts.clear();
    const out = circuitToNets(wired, uno.board, ctx);
    expect(out.report).toMatchObject([{ code: "unknown-part", refs: ["X1"] }]);
  });

  it("reports a wire that joins no pin and keeps no net for it", async () => {
    const out = await convert(circuit({ wires: [{ from: "j1", to: "j2" }] }));
    expect(out.report).toMatchObject([{ code: "skipped", refs: ["wire 1"] }]);
    expect(out.wires).toEqual([]);
  });

  it("makes one net of two wires with the same ends", async () => {
    const out = await convert(circuit({ wires: [{ from: "D2", to: "a10" }, { from: "a10", to: "D2" }] }));
    expect(out.wires).toHaveLength(2);
    expect(out.nets).toHaveLength(1);
    expect(new Set(out.wires.map((w) => w.net))).toEqual(new Set([out.nets[0]!.id]));
  });

  it("gives a part with no holes a placement without legs", async () => {
    const out = await convert(circuit({ parts: [{ id: "LED1", part: "led" }] }));
    expect(out.placements.find((p) => p.c === "cmp_led1")).toEqual({ c: "cmp_led1", x_mm: 0, y_mm: 0 });
    expect(out.nets).toEqual([]);
  });

  it("makes no net of the two legs of one internal short", async () => {
    const button = circuit({ parts: [{ id: "BTN1", part: "push-button", holes: ["e8", "d8", "e10", "f10"] }] });
    const out = await convert(button);
    expect(out.report).toEqual([]);
    expect(out.nets).toEqual([]);
  });

  it("names an unnamed net from its members and hashes a long name", async () => {
    const ids = ["VERYLONGPARTIDENTIFIER1", "VERYLONGPARTIDENTIFIER2", "VERYLONGPARTIDENTIFIER3"];
    const holes = [["a5", "a20"], ["b5", "b21"], ["c5", "c22"]];
    const long = circuit({ parts: ids.map((id, i) => ({ id, part: "resistor", holes: holes[i]! })) });
    const first = await convert(long);
    expect(first.nets).toHaveLength(1);
    const id = first.nets[0]!.id;
    expect(id).toMatch(/^net_[a-z0-9][a-z0-9_-]{0,63}$/);
    expect(id.length).toBe(4 + 64);
    expect(id).toMatch(/_[0-9a-f]{8}$/);
    expect((await convert(long)).nets[0]!.id).toBe(id);

    const short = circuit({ parts: [{ id: "A1", part: "resistor", holes: ["a5", "a20"] }, { id: "B1", part: "resistor", holes: ["b5", "b21"] }] });
    expect((await convert(short)).nets[0]!.id).toBe("net_a1p1_b1p1");
  });

  it("builds instance ids from circuit part ids", () => {
    expect(partInstance("RES1")).toBe("cmp_res1");
    expect(partInstance("LED-1")).toBe("cmp_led-1");
  });
});

describe("circuitToNets over the figure circuits of all 12 boards", () => {
  const boardIds = listItems()
    .filter((i: { lab: string }) => i.lab === "board")
    .map((i: { id: string }) => i.id) as string[];

  it("converts every circuit, and reports what it could not", async () => {
    const t0 = performance.now();
    const unresolved: string[] = [];
    let count = 0;
    for (const id of boardIds) {
      const { board, circuits } = await boardOf(id);
      for (const [key, circuit] of Object.entries(circuits)) {
        const out = circuitToNets(circuit, board, { ...(await contextOf(circuit)), item: `${id}/${key}` });
        count++;
        for (const r of out.report) unresolved.push(`${r.item}: ${r.code} ${r.message}`);
        expect(out.nets.length, `${id}/${key}`).toBeGreaterThan(0);
      }
    }
    expect(count).toBe(57);
    expect(unresolved).toEqual([]);
    expect(performance.now() - t0).toBeLessThan(10_000);
  });
});
