// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createStorageHealth, fileNudgeDue, type HealthState, type ProgressKv } from "./storage-health";
import { fakeTimers } from "./timers.testing";

function kv(): ProgressKv & { data: Map<string, unknown> } {
  const data = new Map<string, unknown>();
  return { data, get: async (k) => data.get(k), set: async (k, v) => void data.set(k, v) };
}

function rig(estimate: { usage: number; quota: number } | null = { usage: 10, quota: 100 }, persisted = false, grant = true) {
  const storage = {
    estimate: vi.fn(),
    persisted: vi.fn(async () => persisted),
    persist: vi.fn(async () => grant),
  };
  const progress = kv();
  const health = createStorageHealth({ storage, repo: { estimate: async () => estimate }, progress, timers: fakeTimers(1_000) });
  return { storage, progress, health };
}

describe("storage health", () => {
  it("asks for persistence once, on the first save, and records the answer", async () => {
    const { storage, progress, health } = rig();
    await health.init();
    expect(storage.persist).not.toHaveBeenCalled();

    await health.onSaved();
    await health.onSaved();

    expect(storage.persist).toHaveBeenCalledTimes(1);
    expect(progress.data.get("storage.persist")).toEqual({ persisted: true, askedAt: 1_000 });
  });

  it("does not ask again after a reload, and does not ask when already persistent", async () => {
    const first = rig();
    await first.health.onSaved();
    const again = createStorageHealth({
      storage: first.storage,
      repo: { estimate: async () => null },
      progress: first.progress,
      timers: fakeTimers(),
    });
    expect((await again.init()).persisted).toBe(true);
    await again.onSaved();
    expect(first.storage.persist).toHaveBeenCalledTimes(1);

    const already = rig(undefined, true);
    await already.health.onSaved();
    expect(already.storage.persist).not.toHaveBeenCalled();
  });

  it("records a denial", async () => {
    const { health } = rig(undefined, false, false);
    const seen: HealthState[] = [];
    health.subscribe((s) => seen.push(s));
    await health.onSaved();
    expect(seen.at(-1)?.persisted).toBe(false);
  });

  it("warns near full at 80 percent", async () => {
    expect((await rig({ usage: 79, quota: 100 }).health.init()).warn).toBe("none");
    expect(await rig({ usage: 80, quota: 100 }).health.init()).toMatchObject({ warn: "near-full", usage: 80, quota: 100 });
  });

  it("warns after a quota failure until a save succeeds", async () => {
    const { health } = rig();
    await health.init();
    health.onSaveFailed("quota");
    expect((await health.init()).warn).toBe("quota-failed");
    await health.onSaved();
    expect((await health.init()).warn).toBe("none");
  });

  it("reports an unavailable store", async () => {
    const { health } = rig();
    await health.init();
    health.onSaveFailed("unavailable");
    expect((await health.init()).warn).toBe("unavailable");

    const none = createStorageHealth({ storage: undefined, repo: { estimate: async () => null }, progress: kv(), timers: fakeTimers() });
    expect(await none.init()).toMatchObject({ warn: "unavailable", persisted: null });
  });

  it("tells subscribers when the nudge becomes due", () => {
    const { health } = rig();
    const seen = vi.fn();
    health.subscribe(seen);
    health.checkFileNudge({ hasFileCopy: false }, 1_000);
    expect(seen).toHaveBeenLastCalledWith(expect.objectContaining({ fileNudgeDue: false }));
    health.checkFileNudge({ hasFileCopy: false }, 1_000 - 10 * 60_000);
    expect(seen).toHaveBeenLastCalledWith(expect.objectContaining({ fileNudgeDue: true }));
  });
});

describe("fileNudgeDue", () => {
  const ten = 10 * 60_000;

  it("is due after ten minutes of editing without a file copy", () => {
    expect(fileNudgeDue({ hasFileCopy: false }, 0, ten - 1)).toBe(false);
    expect(fileNudgeDue({ hasFileCopy: false }, 0, ten)).toBe(true);
  });

  it("is never due with a file copy or without edits", () => {
    expect(fileNudgeDue({ hasFileCopy: true }, 0, ten * 5)).toBe(false);
    expect(fileNudgeDue({ hasFileCopy: false }, null, ten * 5)).toBe(false);
  });
});
