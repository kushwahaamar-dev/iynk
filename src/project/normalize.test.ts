// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CanonicalError } from "../core/canonical.ts";
import { rng } from "../core/prng.ts";
import type { Rng } from "../core/prng.ts";
import type { Project } from "./generated/types.ts";
import { normalizeForWrite, SET_SORT_KEYS, toCanonicalText, toFileText } from "./normalize.ts";

const dir = join(process.cwd(), "docs/MASTER_PLAN/04_ARCHITECTURE/schemas/examples");
const files = readdirSync(dir).filter((name) => name.endsWith(".project.json"));
const read = (name: string) => readFileSync(join(dir, name), "utf8");
const examples = files.map((name) => JSON.parse(read(name)) as Project);

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function shuffled<T>(items: T[], r: Rng): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r.float() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Shuffles every set array and every key order. The world script is a sequence with ties, so it stays. */
function scramble(value: unknown, r: Rng, path = ""): unknown {
  if (Array.isArray(value)) {
    const items = value.map((item) => scramble(item, r, path));
    return path in SET_SORT_KEYS && path !== "simulation.world.script" ? shuffled(items, r) : items;
  }
  if (typeof value !== "object" || value === null) return value;
  const entries = shuffled(Object.entries(value), r);
  return Object.fromEntries(entries.map(([k, v]) => [k, scramble(v, r, path === "" ? k : path + "." + k)]));
}

function withExtraParts(doc: Project, count: number): Project {
  const copy = clone(doc);
  for (let i = 0; i < count; i++) {
    copy.components.push({ id: `cmp_x${i}`, definition: { ref: "core.resistor", version: "1.0.0" }, refdes: `RX${i}` });
    copy.nets.push({ id: `net_x${i}`, connections: [{ c: `cmp_x${i}`, p: "1" }, { c: `cmp_x${(i + 1) % count}`, p: "2" }] });
  }
  return copy;
}

describe("the examples", () => {
  it("finds the five", () => {
    expect(files).toHaveLength(5);
  });

  it.each(files)("%s is already in written form", (name) => {
    const doc = JSON.parse(read(name)) as Project;
    expect(normalizeForWrite(doc)).toBe(doc);
    expect(toFileText(doc)).toBe(read(name));
  });

  it("gives the same canonical text for 1,000 shuffled documents", () => {
    const r = rng(7, "normalize");
    const bases = examples.map((doc) => withExtraParts(doc, 12));
    const wanted = bases.map((doc) => toCanonicalText(doc));
    for (let n = 0; n < 1000; n++) {
      const i = n % bases.length;
      expect(toCanonicalText(scramble(bases[i], r) as Project)).toBe(wanted[i]);
    }
  });
});

describe("normalizeForWrite", () => {
  const base = () => clone(examples[0]);

  it("is idempotent and never changes its input", () => {
    const doc = base();
    doc.meta.title = "é";
    doc.components.reverse();
    const frozen = JSON.stringify(doc);
    const once = normalizeForWrite(doc);
    expect(JSON.stringify(doc)).toBe(frozen);
    expect(normalizeForWrite(once)).toBe(once);
  });

  it("keeps the reference of what it did not change", () => {
    const doc = base();
    doc.components.reverse();
    const out = normalizeForWrite(doc);
    expect(out.components).not.toBe(doc.components);
    expect(out.nets).toBe(doc.nets);
    expect(out.simulation).toBe(doc.simulation);
  });

  it("sorts sets by their keys and leaves sequences", () => {
    const doc = base();
    doc.nets = [
      { id: "net_b", connections: [{ c: "z", p: "1" }, { c: "a", p: "2" }, { c: "a", p: "1" }] },
      { id: "net_a", connections: [{ c: "a", p: "1" }] },
    ];
    const out = normalizeForWrite(doc);
    expect(out.nets.map((n) => n.id)).toEqual(["net_a", "net_b"]);
    expect(out.nets[1].connections.map((p) => p.c + p.p)).toEqual(["a1", "a2", "z1"]);
    doc.views[0].groups = [{ id: "grp_a", members: ["z", "y"] }];
    expect(normalizeForWrite(doc).views[0].groups?.[0].members).toEqual(["y", "z"]);
    doc.history.ops = shuffled(doc.history.ops, rng(1, "ops"));
    expect(normalizeForWrite(doc).history.ops).toEqual(doc.history.ops);
  });

  it("sorts by UTF-16 code unit, not by locale", () => {
    const doc = base();
    doc.views[0].groups = [{ id: "grp_a", members: ["\uff5e", "\u{1f600}", "a", "B"] }];
    expect(normalizeForWrite(doc).views[0].groups?.[0].members).toEqual(["B", "a", "\u{1f600}", "\uff5e"]);
  });

  it("keeps the input order of two elements with the same key", () => {
    const doc = base();
    doc.nets = [
      { id: "net_a", name: "first", connections: [{ c: "a", p: "1" }] },
      { id: "net_a", name: "second", connections: [{ c: "a", p: "2" }] },
    ];
    expect(normalizeForWrite(doc).nets.map((n) => n.name)).toEqual(["first", "second"]);
  });

  it("puts the world script in time order, then input, then original order", () => {
    const doc = base();
    doc.simulation.world.script = [
      { t: 20, input: "b", value: 1 },
      { t: 10, input: "z", value: 2 },
      { t: 10, input: "a", value: 3 },
      { t: 10, input: "a", value: 4 },
      { t: 0.1 + 0.2, input: "a", value: 5 },
    ];
    const out = normalizeForWrite(doc).simulation.world.script;
    expect(out.map((e) => e.value)).toEqual([5, 3, 4, 2, 1]);
    expect(out[0].t).toBe(0.3);
  });

  it("writes decomposed text as one code point in names but not in source code", () => {
    const doc = base();
    doc.meta.title = "café";
    doc.sources = [{ ...doc.sources[0], content: "puts(\"café\");\r\nnext\rlast" }];
    const out = normalizeForWrite(doc);
    expect(out.meta.title).toBe("café");
    expect(out.sources[0].content).toBe("puts(\"café\");\nnext\nlast");
  });

  it("rounds lengths, angles and authored time, and nothing else", () => {
    const doc = base();
    doc.views[0].placements = [{ c: "a", x_mm: 0.1 + 0.2, y_mm: 2.5004, rotation_deg: 90.004 }];
    doc.simulation.duration_ms = 1000.0004;
    doc.simulation.seed = 12345;
    doc.simulation.environment = { ambient_degC: 21.123456 };
    const out = normalizeForWrite(doc);
    expect(out.views[0].placements[0]).toEqual({ c: "a", x_mm: 0.3, y_mm: 2.5, rotation_deg: 90 });
    expect(out.simulation.duration_ms).toBe(1000);
    expect(out.simulation.environment?.ambient_degC).toBe(21.123456);
  });

  it("rounds numbers inside arrays of a length field", () => {
    const doc = base();
    doc.views[0].wires = [
      { id: "w", net: "n", from: { kind: "pin", c: "a", p: "1" }, to: { kind: "pin", c: "b", p: "1" }, route_mm: [[0.1 + 0.2, 1.00049]] },
    ];
    expect(normalizeForWrite(doc).views[0].wires[0].route_mm).toEqual([[0.3, 1]]);
  });

  it("writes negative zero as zero", () => {
    const doc = base();
    doc.views[0].placements = [{ c: "a", x_mm: -0, y_mm: -0.0001 }];
    const placement = normalizeForWrite(doc).views[0].placements[0];
    expect(Object.is(placement.x_mm, 0)).toBe(true);
    expect(Object.is(placement.y_mm, 0)).toBe(true);
  });

  it("drops undefined fields", () => {
    const doc = base();
    (doc.meta as { description?: string }).description = undefined;
    expect("description" in normalizeForWrite(doc).meta).toBe(false);
  });

  it("leaves domains, ext, history and exports as given", () => {
    const doc = base();
    const domains = { robotics: { schemaVersion: "1.0", data: { gain: 0.1 + 0.2, name: "é" } } };
    const ext = { x_mm: 0.1 + 0.2 };
    doc.domains = domains as unknown as Project["domains"];
    doc.ext = ext;
    const out = normalizeForWrite(doc);
    expect(out.domains).toBe(domains);
    expect(out.ext).toBe(ext);
    expect(out.history).toBe(doc.history);
  });

  it("throws CanonicalError with a pointer for NaN and infinities", () => {
    for (const bad of [NaN, Infinity, -Infinity]) {
      const doc = base();
      doc.views[0].placements = [{ c: "a", x_mm: bad, y_mm: 0 }];
      const run = () => normalizeForWrite(doc);
      expect(run).toThrow(CanonicalError);
      expect(run).toThrow(expect.objectContaining({ path: "/views/0/placements/0/x_mm" }));
    }
  });
});
