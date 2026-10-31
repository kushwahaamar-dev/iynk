import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bugReportText, clearLog, installErrorCapture, logError, readLog, tally, track } from "./client";

const fetchMock = vi.fn<typeof fetch>();
const sendBeacon = vi.fn<(url: string, body?: BodyInit | null) => boolean>(() => true);

beforeEach(() => {
  fetchMock.mockReset();
  sendBeacon.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: sendBeacon });
  localStorage.setItem("iynk:v1", JSON.stringify({ v: 1, settings: { telemetry: true } }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  localStorage.clear();
});

it("track makes no fetch and no sendBeacon call even with telemetry saved as true", () => {
  track("lesson.pass", { lesson: "a" });
  track("flight.lap");
  window.dispatchEvent(new Event("pagehide"));
  expect(fetchMock).not.toHaveBeenCalled();
  expect(sendBeacon).not.toHaveBeenCalled();
});

it("tally makes no network call", () => {
  tally("led.blink", 5);
  window.dispatchEvent(new Event("pagehide"));
  expect(fetchMock).not.toHaveBeenCalled();
  expect(sendBeacon).not.toHaveBeenCalled();
});

it("registers no visibilitychange listener", () => {
  const add = vi.spyOn(document, "addEventListener");
  track("flight.lap");
  tally("led.blink");
  expect(add).not.toHaveBeenCalledWith("visibilitychange", expect.anything());
});

const CANARY = "iynk-canary-KEY-0001-do-not-use";

describe("local log", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearLog();
  });

  afterEach(() => {
    clearLog();
    vi.useRealTimers();
  });

  it("keeps the newest 200 entries, oldest dropped first", () => {
    for (let i = 0; i < 205; i += 1) {
      logError(`e${i}`);
      vi.advanceTimersByTime(1);
    }
    const log = readLog();
    expect(log).toHaveLength(200);
    expect(log[0]?.name).toBe("e5");
    expect(log.at(-1)?.name).toBe("e204");
  });

  it("redacts a stored key from the detail and truncates to 500 characters", () => {
    localStorage.setItem("iynk:keys:v1", JSON.stringify({ v: 1, search: { key: CANARY } }));
    logError("ai.call", `provider said no to ${CANARY}`);
    expect(readLog()[0]?.detail).toBe("provider said no to [key]");
    logError("long", "x".repeat(900));
    expect(readLog()[1]?.detail).toHaveLength(500);
  });

  it("collapses repeats within a second into one entry with a count", () => {
    logError("boom", "same");
    vi.advanceTimersByTime(300);
    logError("boom", "same");
    logError("boom", "same");
    expect(readLog()).toHaveLength(1);
    expect(readLog()[0]?.detail).toBe("same (x3)");
    vi.advanceTimersByTime(1500);
    logError("boom", "same");
    expect(readLog()).toHaveLength(2);
  });

  it("writes to storage once after 250 ms", () => {
    logError("a");
    logError("b", "x");
    expect(localStorage.getItem("iynk:log:v1")).toBeNull();
    vi.advanceTimersByTime(250);
    expect(JSON.parse(localStorage.getItem("iynk:log:v1") ?? "[]")).toHaveLength(2);
    clearLog();
    expect(localStorage.getItem("iynk:log:v1")).toBeNull();
  });

  it("records window errors and rejections until the remover is called", () => {
    const remove = installErrorCapture();
    window.dispatchEvent(new ErrorEvent("error", { message: "boom" }));
    window.dispatchEvent(Object.assign(new Event("unhandledrejection"), { reason: new TypeError("nope") }));
    remove();
    window.dispatchEvent(new ErrorEvent("error", { message: "after" }));
    expect(readLog().map((e) => [e.kind, e.name, e.detail])).toEqual([
      ["error", "window.error", "boom"],
      ["error", "unhandledrejection", "TypeError: nope"],
    ]);
  });

  it("does not throw when storage fails", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => {
      logError("still works");
      vi.advanceTimersByTime(250);
    }).not.toThrow();
    expect(readLog()).toHaveLength(1);
  });

  it("logs events only while the usage switch is on, and stringifies circular data", () => {
    localStorage.setItem("iynk:v1", JSON.stringify({ v: 1, settings: { telemetry: false } }));
    track("flight.lap", { course: "a", timeMs: 1 });
    expect(readLog()).toHaveLength(0);
    localStorage.setItem("iynk:v1", JSON.stringify({ v: 1, settings: { telemetry: true } }));
    const loop: Record<string, unknown> = { course: "a", timeMs: 1 };
    loop.self = loop;
    track("flight.lap", loop as { course: string; timeMs: number });
    tally("led.blink", 4);
    expect(readLog().map((e) => [e.kind, e.name, e.detail])).toEqual([
      ["event", "flight.lap", '{"course":"a","timeMs":1,"self":"[circular]"}'],
      ["event", "led.blink", '{"count":4}'],
    ]);
  });

  it("makes no network call from any log function", () => {
    const remove = installErrorCapture();
    logError("a", "b");
    track("flight.lap");
    tally("led.blink");
    bugReportText();
    clearLog();
    remove();
    vi.advanceTimersByTime(500);
    window.dispatchEvent(new Event("pagehide"));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it("builds a bug report from the last 50 entries with the key redacted", () => {
    localStorage.setItem("iynk:keys:v1", JSON.stringify({ v: 1, search: { key: CANARY } }));
    for (let i = 0; i < 60; i += 1) {
      logError(`e${i}`, i === 59 ? CANARY : undefined);
      vi.advanceTimersByTime(1);
    }
    const text = bugReportText();
    expect(text).not.toContain(CANARY);
    expect(text).toContain("e59 [key]");
    expect(text).toContain("e10");
    expect(text).not.toContain("e9 ");
    expect(text).toContain("user agent:");
  });
});
