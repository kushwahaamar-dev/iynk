import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import instruments from "@/i18n/messages/en/instruments.json";
import messages from "@/i18n/messages/en/studioRun.json";
import { runCommand, type CommandCtx } from "@/studio/commands";
import { createRunStore } from "@/studio/stores/run";
import { RunBar } from "./RunBar";
import type { SimLink } from "./wiring/simLink";

function rig() {
  const run = createRunStore();
  const link: SimLink = { run: vi.fn(async () => {}), stop: vi.fn(), reset: vi.fn(), pause: vi.fn(), resume: vi.fn(), step: vi.fn(), setSpeed: vi.fn(), restart: vi.fn(async () => {}), sendSerial: vi.fn(), press: vi.fn(), dispose: vi.fn() };
  render(<RunBar run={run} link={link} messages={messages} instruments={instruments} lang="en" />);
  return { run, link };
}

const phase = (run: ReturnType<typeof createRunStore>, p: Parameters<typeof run.apply>[0] & { t: "phase" }) => act(() => run.apply(p));

describe("RunBar", () => {
  it("offers Run first, with Stop and Reset off", () => {
    rig();
    expect((screen.getByRole("button", { name: "Run" }) as HTMLButtonElement).disabled).toBe(false);
    expect((screen.getByRole("button", { name: "Stop" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Reset" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("toolbar", { name: messages.bar.label })).toBeTruthy();
  });

  it("calls the link from the buttons", () => {
    const { run, link } = rig();
    fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(link.run).toHaveBeenCalled();
    phase(run, { t: "phase", phase: "starting" });
    phase(run, { t: "phase", phase: "running" });
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(link.stop).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(link.reset).toHaveBeenCalled();
  });

  it("runs from the command registry, which Ctrl+Enter is bound to", () => {
    const { link } = rig();
    expect(runCommand("sim.run", {} as CommandCtx)).toBe(true);
    expect(link.run).toHaveBeenCalled();
  });

  it("frees the commands when it unmounts", () => {
    const run = createRunStore();
    const link = { run: vi.fn(), stop: vi.fn(), reset: vi.fn() } as unknown as SimLink;
    render(<RunBar run={run} link={link} messages={messages} instruments={instruments} lang="en" />).unmount();
    expect(runCommand("sim.run", {} as CommandCtx)).toBe(false);
  });

  it("shows the state and the virtual time", () => {
    const { run } = rig();
    phase(run, { t: "phase", phase: "starting" });
    phase(run, { t: "phase", phase: "running" });
    act(() => run.apply({ t: "frame", frame: { tNs: 1_250_000_000, pins: {}, parts: [] } }));
    expect(screen.getByText("Running")).toBeTruthy();
    expect(screen.getByRole("timer").textContent).toBe("1.250 s");
  });

  it("turns Run into Restart when the run is stale", () => {
    const { run } = rig();
    phase(run, { t: "phase", phase: "starting" });
    phase(run, { t: "phase", phase: "running" });
    act(() => run.markStale());
    expect(screen.getByRole("button", { name: "Restart" })).toBeTruthy();
    expect(screen.getByText(messages.bar.stale)).toBeTruthy();
  });

  it("names the limit that stopped the run", () => {
    const { run } = rig();
    phase(run, { t: "phase", phase: "starting" });
    phase(run, { t: "phase", phase: "limit", limit: { which: "statements", text: "x" } });
    expect(screen.getByText(messages.limit.statements)).toBeTruthy();
    expect(screen.getByText(messages.phase.limit)).toBeTruthy();
  });

  it("shows the first error of a failed start", () => {
    const { run } = rig();
    phase(run, { t: "phase", phase: "starting" });
    act(() => run.apply({ t: "diagnostics", diagnostics: [{ id: "parse", severity: "error", text: "expected ;" }] }));
    phase(run, { t: "phase", phase: "error" });
    expect(screen.getByText("expected ;")).toBeTruthy();
  });

  it("says when the simulator was restarted", () => {
    const { run } = rig();
    phase(run, { t: "phase", phase: "starting" });
    phase(run, { t: "phase", phase: "killed" });
    expect(screen.getByText(messages.killed)).toBeTruthy();
  });
});
