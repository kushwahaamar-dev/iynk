import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyRecord, withStep, type LearnerRecord } from "@/project/guided/record";
import { createLearnStore } from "./learn-store";
import { createProgressRepo, memoryLearnKv, type ProgressRepo } from "./progress";

const NOW = "2026-10-31T10:00:00.000Z";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function spyRepo(): ProgressRepo & { put: ReturnType<typeof vi.fn> } {
  const inner = createProgressRepo(memoryLearnKv());
  return { ...inner, put: vi.fn(inner.put) };
}

describe("learn store", () => {
  it("returns a stored record after ready on a recreated store", async () => {
    const repo = createProgressRepo(memoryLearnKv());
    const first = createLearnStore(repo);
    await first.ready;
    first.update("prj_uno-r3-blink", () => emptyRecord("prj_uno-r3-blink", NOW), NOW);
    await vi.advanceTimersByTimeAsync(200);
    const second = createLearnStore(repo);
    expect(second.get("prj_uno-r3-blink")).toBeUndefined();
    await second.ready;
    expect(second.get("prj_uno-r3-blink")).toEqual(first.get("prj_uno-r3-blink"));
  });

  it("notifies once per update and keeps the snapshot between updates", async () => {
    const store = createLearnStore(spyRepo());
    await store.ready;
    const listener = vi.fn();
    store.subscribe(listener);
    const before = store.snapshot();
    expect(store.snapshot()).toBe(before);
    store.update("a", () => emptyRecord("a", NOW), NOW);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.snapshot()).not.toBe(before);
  });

  it("writes once for ten updates inside the quiet spell", async () => {
    const repo = spyRepo();
    const store = createLearnStore(repo);
    await store.ready;
    for (let i = 0; i < 10; i++) {
      store.update("a", (r) => withStep(r ?? emptyRecord("a", NOW), i, "gate", NOW), NOW);
      await vi.advanceTimersByTimeAsync(50);
    }
    expect(repo.put).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(repo.put).toHaveBeenCalledTimes(1);
    expect(Object.keys(repo.put.mock.calls[0][0].steps)).toHaveLength(10);
  });

  it("keeps the value and reports a failed write, then retries once", async () => {
    const repo = spyRepo();
    repo.put.mockRejectedValueOnce(new Error("quota"));
    const store = createLearnStore(repo);
    await store.ready;
    store.update("a", () => emptyRecord("a", NOW), NOW);
    await vi.advanceTimersByTimeAsync(200);
    expect(store.persistError()?.message).toBe("quota");
    expect(store.get("a")).toBeDefined();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(repo.put).toHaveBeenCalledTimes(2);
    expect(store.persistError()).toBeNull();
  });

  it("flushes on pagehide", async () => {
    const handlers = new Map<string, () => void>();
    const repo = spyRepo();
    const store = createLearnStore(repo, { target: { addEventListener: (type: string, fn: never) => void handlers.set(type, fn) } });
    await store.ready;
    store.update("a", () => emptyRecord("a", NOW), NOW);
    handlers.get("pagehide")?.();
    await vi.advanceTimersByTimeAsync(0);
    expect(repo.put).toHaveBeenCalledTimes(1);
    const saved: LearnerRecord = repo.put.mock.calls[0][0];
    expect(saved.projectId).toBe("a");
  });
});
