// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { createEventLog, LEARNING_KINDS, MAX_EVENTS, MAX_PAYLOAD_BYTES } from "./events";
import { createMemoryRepository } from "./memory-repository";

function setup() {
  const repo = createMemoryRepository();
  let n = 0;
  const log = createEventLog(repo, { isoNow: () => `2026-10-30T00:00:${String(n % 60).padStart(2, "0")}Z` }, () => `e${n++}`);
  return { repo, log };
}

describe("learning event log", () => {
  it("keeps its kinds out of the telemetry kinds", () => {
    const kinds = readFileSync("src/lib/telemetry/kinds.ts", "utf8");
    for (const kind of LEARNING_KINDS) expect(kinds).not.toContain(`"${kind}"`);
  });

  it("writes nothing while the switch is off", async () => {
    const { log } = setup();
    for (let i = 0; i < 100; i++) await log.append("reveal", { projectId: "prj_a" });
    expect(await log.list()).toEqual([]);
  });

  it("writes once the switch is on and lists newest first", async () => {
    const { log } = setup();
    await log.setEnabled(true);
    await log.append("hint.open", { projectId: "prj_a", level: 1, via: "ladder" });
    await log.append("reveal", { projectId: "prj_a" });
    const rows = await log.list();
    expect(rows.map((r) => r.kind)).toEqual(["reveal", "hint.open"]);
    expect(rows[1]).toMatchObject({ payload: { level: 1 } });
    expect(await log.list(1)).toHaveLength(1);
  });

  it("keeps the newest 5,000 rows", async () => {
    const { log } = setup();
    await log.setEnabled(true);
    for (let i = 0; i <= MAX_EVENTS; i++) await log.append("hint.open", { projectId: "prj_a", level: 1, via: "ladder" });
    const rows = await log.list();
    expect(rows).toHaveLength(MAX_EVENTS);
    expect(rows[0]?.id).toBe(`e${MAX_EVENTS}`);
    expect(rows.at(-1)?.id).toBe("e1");
  }, 120_000);

  it("clears", async () => {
    const { log } = setup();
    await log.setEnabled(true);
    await log.append("reveal", { projectId: "prj_a" });
    await log.clear();
    expect(await log.list()).toEqual([]);
    await log.append("reveal", { projectId: "prj_a" });
    expect(await log.list()).toHaveLength(1);
  });

  it("drops free text, extra keys on code.changed and oversize payloads", async () => {
    const { log } = setup();
    await log.setEnabled(true);
    await log.append("hint.open", { projectId: "prj_a", note: "my robot" });
    await log.append("code.changed", { projectId: "prj_a", text: "int x;" });
    await log.append("diagnosis.record", { projectId: "prj_a", diagnosis: "x".repeat(MAX_PAYLOAD_BYTES) });
    expect(await log.list()).toEqual([]);
    expect(log.stats()).toEqual({ dropped: 3, unsaved: 0 });
  });

  it("does not throw when the repository fails", async () => {
    const { repo, log } = setup();
    await log.setEnabled(true);
    vi.spyOn(repo.events, "append").mockRejectedValue(new Error("quota"));
    await expect(log.append("reveal", { projectId: "prj_a" })).resolves.toBeUndefined();
    expect(log.stats().unsaved).toBe(1);
  });

  it("makes no network call", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response());
    const { log } = setup();
    await log.setEnabled(true);
    await log.append("reveal", { projectId: "prj_a" });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
