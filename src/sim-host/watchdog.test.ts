// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWatchdog, STALL_MS, type KillReason } from "./watchdog";

const timers = {
  setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
  clearTimeout: (handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

function rig() {
  const kills: KillReason[] = [];
  const dog = createWatchdog({
    timers,
    kill: async (reason) => {
      kills.push(reason);
    },
  });
  return { dog, kills };
}

describe("watchdog", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("kills when no beat arrives for the stall window", () => {
    const { dog, kills } = rig();
    dog.beat();
    vi.advanceTimersByTime(STALL_MS - 1);
    expect(kills).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(kills).toEqual(["wall-stall"]);
    expect(dog.stalled()).toBe(true);
  });

  it("never kills while beats keep coming inside the window", () => {
    const { dog, kills } = rig();
    dog.beat();
    for (let i = 0; i < 20; i++) {
      vi.advanceTimersByTime(1900);
      dog.beat();
    }
    expect(kills).toEqual([]);
    expect(dog.stalled()).toBe(false);
  });

  it("kills once and stays quiet until the next beat", () => {
    const { dog, kills } = rig();
    dog.beat();
    vi.advanceTimersByTime(10 * STALL_MS);
    expect(kills).toHaveLength(1);
    dog.beat();
    expect(dog.stalled()).toBe(false);
  });

  it("does not kill a cancel that is answered in time", () => {
    const { dog, kills } = rig();
    dog.armCancel();
    vi.advanceTimersByTime(STALL_MS - 1);
    dog.disarm();
    vi.advanceTimersByTime(STALL_MS);
    expect(kills).toEqual([]);
  });

  it("kills an unanswered cancel and records why", () => {
    const { dog, kills } = rig();
    dog.armCancel();
    vi.advanceTimersByTime(STALL_MS);
    expect(kills).toEqual(["cancel-unanswered"]);
  });

  it("disarm stops the stall timer too", () => {
    const { dog, kills } = rig();
    dog.beat();
    dog.disarm();
    vi.advanceTimersByTime(STALL_MS * 2);
    expect(kills).toEqual([]);
  });
});
