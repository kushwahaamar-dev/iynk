// @vitest-environment node
import { describe, expect, it } from "vitest";
import { estimateTokens } from "./context/budget.ts";
import { defaultMode } from "./modes.ts";
import { ADVANCED_BLOCK } from "./modes/advanced.ts";
import { SOCRATIC_BLOCK } from "./modes/socratic.ts";
import { systemParts } from "./prompts.ts";
import { gate } from "./proposals/guard.ts";
import type { GateInput } from "./proposals/guard.ts";
import { toolsForCall } from "./tools/registry.ts";
import type { Mode } from "./modes.ts";

const base: GateInput = {
  mode: "direct",
  role: "owner",
  sealedOpen: false,
  ladderLevel: 0,
  showMe: false,
  fixIt: false,
  applyIt: false,
  xTaint: false,
  taintConfirmed: false,
};

const names = (input: Partial<GateInput> & { mode: Mode }) =>
  toolsForCall(input.mode, gate({ ...base, ...input }), new Set(), false, { effect: false }).map((t) => t.name as string);

describe("toolsForCall", () => {
  it("offers no proposal tool to socratic below level 3 or to beginner below level 3", () => {
    for (const input of [{ mode: "socratic" as const }, { mode: "beginner" as const, ladderLevel: 1 as const }, { mode: "debugging" as const }]) {
      const list = names(input);
      expect(list).not.toContain("propose_ops");
      expect(list).not.toContain("try_ops");
      expect(list).not.toContain("request_ops_group");
    }
    expect(names({ mode: "socratic" })).not.toContain("get_revision_diff");
  });

  it("keeps the order sorted by name", () => {
    const list = names({ mode: "socratic", ladderLevel: 3 });
    expect(list).toEqual([...list].sort((a, b) => a.localeCompare(b)));
  });
});

describe("mode blocks", () => {
  it("are the last part of the system text, within 150 to 300 tokens, and carry no digits", () => {
    expect(systemParts("socratic", "en").at(-1)?.text).toBe(SOCRATIC_BLOCK);
    expect(systemParts("advanced", "en").at(-1)?.text).toBe(ADVANCED_BLOCK);
    for (const block of [SOCRATIC_BLOCK, ADVANCED_BLOCK]) {
      expect(estimateTokens(block, 1)).toBeGreaterThanOrEqual(150);
      expect(estimateTokens(block, 1)).toBeLessThanOrEqual(300);
      expect(block).not.toMatch(/\d/);
    }
  });

  it("maps project kinds to default modes", () => {
    expect(["lesson", "task", "tour", "bench", "craft"].map((k) => defaultMode(k as never))).toEqual([
      "socratic",
      "socratic",
      "beginner",
      "debugging",
      "debugging",
    ]);
  });
});
