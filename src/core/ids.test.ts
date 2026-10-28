// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ENTITY_PREFIXES,
  cryptoRandom,
  isDefRefName,
  isEntityId,
  isLocalId,
  isPinId,
  isRefdes,
  newId,
  newProjectId,
  prefixOf,
  uniqueId,
} from "./ids.ts";
import type { EntityPrefix, RandomSource } from "./ids.ts";

const schemaText = readFileSync(
  new URL("../../docs/MASTER_PLAN/04_ARCHITECTURE/schemas/project.schema.json", import.meta.url),
  "utf8",
);
const schema = JSON.parse(schemaText) as { $defs: Record<string, { pattern: string }> };

function seeded(seed: number): RandomSource {
  let s = seed >>> 0;
  return {
    bytes(n) {
      const out = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        out[i] = s >>> 24;
      }
      return out;
    },
  };
}

const constant = (byte: number): RandomSource => ({ bytes: (n) => new Uint8Array(n).fill(byte) });

describe("schema agreement", () => {
  const found = [...new Set([...schemaText.matchAll(/"pattern": "\^([a-z]{2,3})_\[a-z0-9\]/g)].map((m) => m[1]))].sort();

  it("lists the same 22 prefixes as the schema patterns", () => {
    expect(found).toHaveLength(22);
    expect([...ENTITY_PREFIXES].sort()).toEqual(found);
  });

  it("matches the shape of every prefixed schema pattern", () => {
    const patterns = [...new Set([...schemaText.matchAll(/"pattern": "(\^[a-z]{2,3}_[^"]*)"/g)].map((m) => m[1]))];
    expect(patterns).toHaveLength(22);
    for (const p of patterns) expect(p).toMatch(/^\^[a-z]{2,3}_\[a-z0-9\]\[a-z0-9_-\]\{0,63\}\$$/);
  });

  it("uses the schema patterns for local ids, pins, refdes and definition names", () => {
    expect(isLocalId("a")).toBe(true);
    for (const [name, check] of [
      ["LocalId", isLocalId],
      ["PinId", isPinId],
      ["Refdes", isRefdes],
      ["DefRefName", isDefRefName],
    ] as const) {
      const pattern = new RegExp(schema.$defs[name]!.pattern);
      for (const sample of ["a", "A1", "R_1", "core.led-5mm", "1", "-a", "", "x".repeat(60)]) {
        expect(check(sample)).toBe(pattern.test(sample));
      }
    }
  });
});

describe("newId", () => {
  it("matches the schema pattern for every prefix and stays short", () => {
    for (const prefix of ENTITY_PREFIXES) {
      const id = newId(prefix, seeded(7));
      expect(id).toMatch(new RegExp(`^${prefix}_[a-z0-9][a-z0-9_-]{0,63}$`));
      expect(id).toHaveLength(prefix.length + 17);
      expect(id.length).toBeLessThanOrEqual(72);
      expect(isEntityId(id, prefix)).toBe(true);
    }
  });

  it("gives fixed output for a fixed source", () => {
    expect(newId("cmp", constant(0))).toBe("cmp_aaaaaaaaaaaaaaaa");
    expect(newId("net", constant(0xff))).toBe("net_7777777777777777");
    expect(newId("cmp", seeded(1))).toBe(newId("cmp", seeded(1)));
    expect(newId("cmp", seeded(1))).not.toBe(newId("cmp", seeded(2)));
  });

  it("does not collide in 100,000 draws from the platform source", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 100_000; i++) seen.add(newId("cmp", cryptoRandom));
    expect(seen.size).toBe(100_000);
  });

  it("throws on an unknown prefix", () => {
    expect(() => newId("zzz" as EntityPrefix)).toThrow("unknown id prefix");
  });

  it("throws when there is no crypto and no source", () => {
    const real = Object.getOwnPropertyDescriptor(globalThis, "crypto");
    Object.defineProperty(globalThis, "crypto", { value: undefined, configurable: true });
    try {
      expect(() => newId("cmp")).toThrow("no crypto.getRandomValues; pass a RandomSource");
    } finally {
      if (real) Object.defineProperty(globalThis, "crypto", real);
    }
  });
});

describe("newProjectId", () => {
  it("is prj_ and 26 lowercase ULID characters", () => {
    const id = newProjectId(1_761_000_000_000, seeded(3));
    expect(id).toMatch(/^prj_[0-9a-hjkmnp-tv-z]{26}$/);
    expect(isEntityId(id, "prj")).toBe(true);
  });

  it("encodes the time in the first ten characters", () => {
    expect(newProjectId(0, constant(0))).toBe(`prj_${"0".repeat(26)}`);
    expect(newProjectId(31, constant(0)).slice(4, 14)).toBe("000000000z");
  });

  it("sorts by time", () => {
    const a = newProjectId(1_761_000_000_000, seeded(9));
    const b = newProjectId(1_761_000_000_001, seeded(9));
    expect(a < b).toBe(true);
  });

  it("rejects a time outside 48 bits", () => {
    expect(() => newProjectId(-1)).toThrow(RangeError);
    expect(() => newProjectId(2 ** 48)).toThrow(RangeError);
    expect(() => newProjectId(1.5)).toThrow(RangeError);
  });
});

describe("uniqueId", () => {
  it("skips an id that is taken", () => {
    const rnd = seeded(5);
    const first = newId("cmp", seeded(5));
    const id = uniqueId("cmp", new Set([first]), rnd);
    expect(id).not.toBe(first);
  });

  it("throws id_space_exhausted after 8 collisions", () => {
    const taken = new Set([newId("cmp", constant(0))]);
    expect(() => uniqueId("cmp", taken, constant(0))).toThrow("id_space_exhausted");
  });
});

describe("recognisers", () => {
  it("isEntityId and prefixOf", () => {
    expect(isEntityId("cmp_abc123")).toBe(true);
    expect(isEntityId("cmp_abc123", "net")).toBe(false);
    expect(isEntityId("xyz_abc")).toBe(false);
    expect(isEntityId("cmp_")).toBe(false);
    expect(isEntityId("cmp_Abc")).toBe(false);
    expect(isEntityId(42)).toBe(false);
    expect(prefixOf("vw_main")).toBe("vw");
    expect(prefixOf("op_1")).toBe("op");
    expect(prefixOf("nope")).toBeNull();
  });

  it("isLocalId", () => {
    for (const ok of ["a", "A1", "0", "a-b_c", "x".repeat(48)]) expect(isLocalId(ok)).toBe(true);
    for (const bad of ["", "-a", "_a", "a b", "x".repeat(49), 5]) expect(isLocalId(bad)).toBe(false);
  });

  it("isPinId rejects bare digits (C-LEG) and accepts P1", () => {
    for (const ok of ["P1", "D13", "a", "SDA_1", "A".repeat(32)]) expect(isPinId(ok)).toBe(true);
    for (const bad of ["1", "1A", "", "_a", "a-b", "A".repeat(33)]) expect(isPinId(bad)).toBe(false);
  });

  it("isRefdes", () => {
    for (const ok of ["R1", "LED_2", "U", "A".repeat(16)]) expect(isRefdes(ok)).toBe(true);
    for (const bad of ["1R", "", "R-1", "R 1", "A".repeat(17), null]) expect(isRefdes(bad)).toBe(false);
  });

  it("isDefRefName", () => {
    for (const ok of ["core.led-5mm", "a.b", "core.uno-r3"]) expect(isDefRefName(ok)).toBe(true);
    for (const bad of ["core", "Core.led", "core.-led", "core.led-", ".led", `a.${"b".repeat(80)}`]) {
      expect(isDefRefName(bad)).toBe(false);
    }
  });
});
