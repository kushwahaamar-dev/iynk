import { afterEach, describe, expect, test, vi } from "vitest";
import type { LabStore } from "@/components/dock/types";
import { genericFacts } from "./bench/generic";
import { attachStore, factChanges, logRoomLines, SessionLog, STORE_SETTLE_MS } from "./session-log";

function fakeStore(initial: unknown) {
  let state = initial;
  const listeners = new Set<() => void>();
  const store: LabStore = {
    getState: () => state,
    subscribe: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    dispatch: () => {},
  };
  return {
    store,
    set(next: unknown) {
      state = next;
      for (const fn of listeners) fn();
    },
    listeners,
  };
}

afterEach(() => vi.useRealTimers());

describe("SessionLog", () => {
  test("keeps the newest entries within its limit, trims text and coalesces repeats", () => {
    let now = 1000;
    const log = new SessionLog(3, () => now);
    log.add("Sam", "action", "edited the code");
    now += 5000;
    log.add("Sam", "action", "edited   the\ncode");
    expect(log.entries()).toHaveLength(1);
    expect(log.entries()[0].t).toBe(6000);
    now += 20_000;
    log.add("Sam", "action", "edited the code");
    log.add("Ana", "chat", "x".repeat(400));
    log.add("Sam", "pass", "passed blink");
    expect(log.entries().map((e) => e.kind)).toEqual(["action", "chat", "pass"]);
    expect(log.entries()[1].text).toHaveLength(300);
    log.add("Sam", "chat", "   ");
    expect(log.entries()).toHaveLength(3);
  });

  test("events() is what /api/ai/story takes; helpers() pairs who helped whom", () => {
    const log = new SessionLog(10, () => 42);
    log.add("Sam", "help", "the partner asked Ana to explain: why a resistor?", "Ana");
    log.add("Sam", "help", "the partner asked Ana to explain: which leg?", "Ana");
    expect(log.events()[0]).toEqual({ t: 42, who: "Sam", kind: "help", text: "the partner asked Ana to explain: why a resistor?" });
    expect(log.helpers()).toEqual([{ helper: "Ana", learner: "Sam" }]);
  });

  test("snapshots are stable until something changes", () => {
    const log = new SessionLog();
    const listener = vi.fn();
    log.subscribe(listener);
    const first = log.entries();
    expect(log.entries()).toBe(first);
    log.add("Sam", "chat", "hi");
    expect(log.entries()).not.toBe(first);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("factChanges", () => {
  test("turns bench differences into story lines", () => {
    const before = genericFacts({ wires: [{ from: "a", to: "b" }], faults: [], tests: [{ name: "blinks", pass: false }], code: "x" }, "t");
    const after = genericFacts(
      { wires: [{ from: "a", to: "c" }], faults: ["LED backwards"], tests: [{ name: "blinks", pass: true }], code: "y", errors: [{ line: 3, message: "expected ;" }] },
      "t",
    );
    expect(factChanges(before, after)).toEqual([
      { kind: "action", text: "wired a - c" },
      { kind: "action", text: "unwired a - b" },
      { kind: "action", text: "edited the code" },
      { kind: "fault", text: "compile error: line 3: expected ;" },
      { kind: "fault", text: "LED backwards" },
      { kind: "pass", text: "passed blinks" },
    ]);
    expect(factChanges(after, before)).toContainEqual({ kind: "action", text: "fixed: LED backwards" });
  });
});

describe("attachStore", () => {
  test("logs settled store changes once however many components attach", () => {
    vi.useFakeTimers();
    const fake = fakeStore({ faults: [] });
    const log = new SessionLog();
    log.setSelf("Sam");
    const releaseA = attachStore(log, "board", "uno-r3", fake.store);
    const releaseB = attachStore(log, "board", "uno-r3", fake.store);
    expect(fake.listeners.size).toBe(1);
    fake.set({ faults: ["LED backwards"] });
    fake.set({ faults: ["LED backwards"], tests: [{ name: "blinks", pass: true }] });
    expect(log.entries()).toHaveLength(0);
    vi.advanceTimersByTime(STORE_SETTLE_MS);
    expect(log.events().map(({ who, kind, text }) => [who, kind, text])).toEqual([
      ["Sam", "fault", "LED backwards"],
      ["Sam", "pass", "passed blinks"],
    ]);
    releaseA();
    expect(fake.listeners.size).toBe(1);
    releaseB();
    expect(fake.listeners.size).toBe(0);
  });
});

describe("logRoomLines", () => {
  test("logs each room line once with the sender's name, skipping system lines", () => {
    const log = new SessionLog();
    const lines = [
      { id: "m1", from: "p2", text: "the long leg is +", kind: "voice" as const },
      { id: "m2", from: "p1", text: "Ana joined", kind: "system" as const },
      { id: "m3", from: "p1", text: "@Ana explain it?", kind: "ai" as const },
    ];
    const name = (id: string) => ({ p1: "Sam", p2: "Ana" })[id] ?? id;
    logRoomLines(log, lines, name);
    logRoomLines(log, lines, name);
    expect(log.events().map(({ who, kind, text }) => [who, kind, text])).toEqual([
      ["Ana", "chat", "the long leg is +"],
      ["partner", "ai", "@Ana explain it?"],
    ]);
  });
});
