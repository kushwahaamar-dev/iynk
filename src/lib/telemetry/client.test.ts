import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { tally, track } from "./client";

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
