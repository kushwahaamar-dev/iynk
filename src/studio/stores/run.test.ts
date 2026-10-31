// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { SERIAL_RING, createRunStore, formatStamp } from "./run.ts";
import type { PartStateFrame } from "./run.ts";

const out = (tNs: number, text: string) => ({ t: "serial", tNs, kind: "out", text }) as const;
const frame = (tNs: number): PartStateFrame => ({ tNs, pins: {}, parts: [] });

describe("RunStore", () => {
  it("formats stamps from integer nanoseconds", () => {
    expect(formatStamp(1_000_000_000)).toBe("[t=1.000 s]");
    expect(formatStamp(1_234_567_890)).toBe("[t=1.235 s]");
    expect(formatStamp(0)).toBe("[t=0.000 s]");
  });

  it("splits text into lines and finishes a partial line in place", () => {
    const run = createRunStore();
    run.apply(out(1e9, "on\nof"));
    run.apply(out(2e9, "f\n"));
    run.apply(out(3e9, "x"));
    expect(run.getState().serial.map((e) => [e.tNs, e.text])).toEqual([[1e9, "on"], [1e9, "off"], [3e9, "x"]]);
  });

  it("treats a lone carriage return as a line break", () => {
    const run = createRunStore();
    run.apply(out(0, "a\rb\r\nc\n"));
    expect(run.getState().serial.map((e) => e.text)).toEqual(["a", "b", "c"]);
  });

  it("keeps the last 5,000 lines and counts the dropped ones", () => {
    const run = createRunStore();
    run.apply(out(0, Array.from({ length: SERIAL_RING + 120 }, (_, i) => `l${i}`).join("\n") + "\n"));
    const { serial, serialDropped } = run.getState();
    expect(serial).toHaveLength(SERIAL_RING);
    expect(serialDropped).toBe(120);
    expect(serial[0]!.text).toBe("l120");
    expect(serial.at(-1)!.text).toBe(`l${SERIAL_RING + 119}`);
  });

  it("survives a burst of one megabyte", () => {
    const run = createRunStore();
    run.apply(out(0, "0123456789abcdef\n".repeat(65_536)));
    expect(run.getState().serial).toHaveLength(SERIAL_RING);
    expect(run.getState().serialDropped).toBe(65_536 - SERIAL_RING);
  });

  it("clears the serial text but keeps the rest", () => {
    const run = createRunStore();
    run.apply({ t: "phase", phase: "starting" });
    run.apply(out(0, "a\n"));
    run.clearSerial();
    expect(run.getState()).toMatchObject({ serial: [], serialDropped: 0, phase: "starting" });
  });

  it("marks stale only while a run exists", () => {
    const run = createRunStore();
    run.markStale();
    expect(run.getState().stale).toBe(false);
    run.apply({ t: "phase", phase: "starting" });
    run.apply({ t: "phase", phase: "running" });
    run.markStale();
    expect(run.getState().stale).toBe(true);
    run.apply({ t: "phase", phase: "starting" });
    expect(run.getState().stale).toBe(false);
  });

  it("clears the old run when a new one starts", () => {
    const run = createRunStore();
    run.apply({ t: "phase", phase: "starting" });
    run.apply(out(0, "a\n"));
    run.apply({ t: "diagnostics", diagnostics: [{ id: "x", severity: "error", text: "bad" }] });
    run.apply({ t: "phase", phase: "error" });
    run.apply({ t: "phase", phase: "starting" });
    expect(run.getState()).toMatchObject({ serial: [], diagnostics: [], phase: "starting" });
  });

  it("keeps the limit that stopped the run", () => {
    const run = createRunStore();
    run.apply({ t: "phase", phase: "starting" });
    run.apply({ t: "phase", phase: "limit", limit: { which: "statements", text: "too many" } });
    expect(run.getState()).toMatchObject({ phase: "limit", limit: { which: "statements" } });
  });

  it("appends or replaces diagnostics", () => {
    const run = createRunStore();
    const d = (id: string) => ({ id, severity: "warning" as const, text: id });
    run.apply({ t: "diagnostics", diagnostics: [d("a")] });
    run.apply({ t: "diagnostics", diagnostics: [d("b")], append: true });
    expect(run.getState().diagnostics.map((x) => x.id)).toEqual(["a", "b"]);
    run.apply({ t: "diagnostics", diagnostics: [d("c")] });
    expect(run.getState().diagnostics.map((x) => x.id)).toEqual(["c"]);
  });

  it("lets at most 30 frames per simulated second through and keeps the last one", () => {
    const run = createRunStore();
    run.apply({ t: "phase", phase: "starting" });
    run.apply({ t: "phase", phase: "running" });
    let accepted = 0;
    run.subscribe(() => accepted++);
    for (let ms = 0; ms <= 1000; ms += 5) run.apply({ t: "frame", frame: frame(ms * 1e6) });
    expect(accepted).toBeLessThanOrEqual(31);
    expect(accepted).toBeGreaterThan(20);
    run.apply({ t: "phase", phase: "done" });
    expect(run.getState().frame!.tNs).toBe(1000e6);
    expect(run.getState().tNs).toBe(1000e6);
  });

  it("takes a frame from an earlier time after a restart", () => {
    const run = createRunStore();
    run.apply({ t: "frame", frame: frame(5e9) });
    run.apply({ t: "frame", frame: frame(0) });
    expect(run.getState().tNs).toBe(0);
  });

  it("records when the run started and when it was running", () => {
    const clock = vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(180);
    const run = createRunStore(clock);
    run.apply({ t: "phase", phase: "starting" });
    run.apply({ t: "phase", phase: "running" });
    run.apply({ t: "phase", phase: "running" });
    expect(run.getState()).toMatchObject({ startedAtMs: 100, runningAtMs: 180 });
  });

  it("resets to the idle view", () => {
    const run = createRunStore();
    run.apply({ t: "phase", phase: "starting" });
    run.apply(out(0, "a\n"));
    run.reset();
    expect(run.getState()).toMatchObject({ phase: "idle", serial: [], stale: false, tNs: 0, frame: null });
  });
});
