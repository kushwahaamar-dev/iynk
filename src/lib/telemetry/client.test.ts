import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { flush, onFlushed, setTelemetryContext, tally, telemetrySession, track } from "./client";

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

it("track makes no fetch and no sendBeacon call even with telemetry saved as true", async () => {
  setTelemetryContext({ room: "ABCD", item: "nano" });
  track("lesson.pass", { lesson: "a" });
  track("flight.lap");
  await flush();
  window.dispatchEvent(new Event("pagehide"));
  expect(fetchMock).not.toHaveBeenCalled();
  expect(sendBeacon).not.toHaveBeenCalled();
});

it("tally and flush make no network call", async () => {
  tally("led.blink", 5);
  await flush();
  window.dispatchEvent(new Event("pagehide"));
  expect(fetchMock).not.toHaveBeenCalled();
  expect(sendBeacon).not.toHaveBeenCalled();
});

it("telemetrySession is empty and onFlushed never calls its listener", async () => {
  const listener = vi.fn();
  const off = onFlushed(listener);
  track("flight.lap");
  await flush();
  off();
  expect(telemetrySession()).toBe("");
  expect(listener).not.toHaveBeenCalled();
});

it("registers no visibilitychange listener", () => {
  const add = vi.spyOn(document, "addEventListener");
  track("flight.lap");
  tally("led.blink");
  expect(add).not.toHaveBeenCalledWith("visibilitychange", expect.anything());
});
