// @vitest-environment node
import { describe, expect, it } from "vitest";
import { DEFAULT_SHRINK, serialise } from "./serialise.ts";
import { packInput } from "./pack.testing.ts";

const run = {
  phase: "running" as const,
  stale: false,
  tNs: 2_000_000_000,
  readings: [
    { target: "cmp_d1", value: 0.0082, unit: "A", tier: "T1" as const, provenance: "computed" },
    { target: "cmp_r1", value: 1, unit: "V", tier: "not-modelled" as const, provenance: "none" },
  ],
  pins: [{ target: "brd_main.D12", level: "HIGH" as const }],
  serial: Array.from({ length: 30 }, (_, i) => ({ tNs: i, kind: "out" as const, text: `line ${i}` })),
  diagnostics: [],
  solver: { converged: true },
};

describe("serialise", () => {
  it("keeps the stable sections in the documented order", () => {
    const { stable } = serialise(packInput(), "D2", DEFAULT_SHRINK);
    const tags = stable.split("\n").filter((l) => l.startsWith("[")).map((l) => l.split(" ")[0]);
    expect(tags).toEqual(["[PROJECT]", "[BOARDS]", "[COMPONENTS]", "[NETS]", "[SOURCES]", "[TESTS]"]);
  });

  it("writes readings with tier, and never a number for a reading that is not modelled", () => {
    const { volatile } = serialise(packInput({ run }), "D2", DEFAULT_SHRINK);
    expect(volatile).toContain("cmp_d1=0.0082 A (computed T1)");
    expect(volatile).toContain("cmp_r1=not modelled yet");
    expect(volatile).toContain("pins: brd_main.D12=HIGH");
    expect(volatile).toContain("now=2s");
  });

  it("keeps the last serial lines, fewer when shrunk", () => {
    const wide = serialise(packInput({ run }), "D2", DEFAULT_SHRINK).volatile;
    const narrow = serialise(packInput({ run }), "D2", { ...DEFAULT_SHRINK, serialLines: 5 }).volatile;
    expect(wide).toContain('"line 10"');
    expect(wide).not.toContain('"line 9"');
    expect(narrow).toContain('"line 29"');
    expect(narrow).not.toContain('"line 20"');
  });

  it("starts the volatile part with the VOLATILE line", () => {
    expect(serialise(packInput(), "D2", DEFAULT_SHRINK).volatile.startsWith("[VOLATILE] nonce=K7QX2LM9 rev=142 hash=")).toBe(true);
  });
});
