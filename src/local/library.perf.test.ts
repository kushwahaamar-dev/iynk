import { describe, expect, it } from "vitest";
import { seededRandom } from "@/project/testing/harness";
import { createLibrary } from "./library";
import { createMemoryRepository } from "./memory-repository";

describe("Library speed", () => {
  it("creates in well under 30 ms", async () => {
    const library = createLibrary({ repo: createMemoryRepository(), clock: () => Date.parse("2026-10-28T09:00:00.000Z"), rnd: seededRandom(3), actor: "usr_owner" });
    const started = performance.now();
    await library.create({ board: "uno", title: "Fast" });
    expect(performance.now() - started).toBeLessThan(30);
  });
});
