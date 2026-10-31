import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import studio from "@/i18n/messages/en/studio.json";
import studioModels from "@/i18n/messages/en/studioModels.json";
import { createSession } from "@/project/session";
import { seededRandom, steppingClock } from "@/project/session.testing";
import { createDocStore, type SaveChip } from "@/studio/stores/doc";
import { createRunStore } from "@/studio/stores/run";
import { blinkCircuit } from "@/studio/testing/blink-circuit";
import { TopBar } from "./TopBar";
import type { SimLink } from "./wiring/simLink";

function rig() {
  const doc = createDocStore(createSession({ state: blinkCircuit().project, clock: steppingClock(), rnd: seededRandom() }));
  const run = createRunStore();
  const link: SimLink = { run: vi.fn(async () => {}), stop: vi.fn(), reset: vi.fn(), pause: vi.fn(), resume: vi.fn(), step: vi.fn(), setSpeed: vi.fn(), restart: vi.fn(async () => {}), sendSerial: vi.fn(), press: vi.fn(), dispose: vi.fn() };
  render(<TopBar doc={doc} run={run} link={link} menu={null} settings={<span>settings slot</span>} messages={studio} modelMessages={studioModels} />);
  return { doc, run, link };
}

const name = () => screen.getByRole("textbox", { name: studio.topBar.name }) as HTMLInputElement;
const disabled = (label: string) => (screen.getByRole("button", { name: label }) as HTMLButtonElement).disabled;

describe("TopBar", () => {
  it("is a named toolbar with the settings slot", () => {
    rig();
    expect(screen.getByRole("toolbar", { name: studio.topBar.label })).toBeTruthy();
    expect(screen.getByText("settings slot")).toBeTruthy();
  });

  it("renames the project through meta.set", () => {
    const { doc } = rig();
    fireEvent.change(name(), { target: { value: "  Door lamp  " } });
    fireEvent.keyDown(name(), { key: "Enter" });
    expect(doc.getState().state.meta.title).toBe("Door lamp");
    expect(name().value).toBe("Door lamp");
    expect(doc.getState().canUndo).toBe(true);
  });

  it("refuses an empty name with an inline message and keeps the old one", () => {
    const { doc } = rig();
    const before = doc.getState().state.meta.title;
    fireEvent.change(name(), { target: { value: "   " } });
    fireEvent.keyDown(name(), { key: "Enter" });
    expect(screen.getByRole("alert").textContent).toContain(studio.rename.invalid);
    expect(doc.getState().state.meta.title).toBe(before);
    fireEvent.keyDown(name(), { key: "Escape" });
    expect(name().value).toBe(before);
  });

  it("does not commit when the name is unchanged", () => {
    const { doc } = rig();
    const before = doc.getState();
    fireEvent.keyDown(name(), { key: "Enter" });
    expect(doc.getState()).toBe(before);
  });

  it("disables Undo and Redo until there is something to undo or redo", () => {
    const { doc } = rig();
    expect(disabled(studio.topBar.undo)).toBe(true);
    expect(disabled(studio.topBar.redo)).toBe(true);
    fireEvent.change(name(), { target: { value: "Lamp" } });
    fireEvent.keyDown(name(), { key: "Enter" });
    expect(disabled(studio.topBar.undo)).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: studio.topBar.undo }));
    expect(doc.getState().state.meta.title).not.toBe("Lamp");
    expect(disabled(studio.topBar.redo)).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: studio.topBar.redo }));
    expect(doc.getState().state.meta.title).toBe("Lamp");
  });

  it.each<[SaveChip, string]>([
    ["saved", studio.topBar.save.saved],
    ["saving", studio.topBar.save.saving],
    ["unsaved", studio.topBar.save.unsaved],
    ["autosave-failed", studio.topBar.save.failed],
    ["read-only", studio.topBar.save.readOnly],
  ])("says %s in words", (chip, text) => {
    const { doc } = rig();
    act(() => doc.setSaveChip(chip));
    expect(screen.getByText(text)).toBeTruthy();
  });

  it("locks the name when the project is read only", () => {
    const { doc } = rig();
    act(() => doc.setSaveChip("read-only"));
    expect(name().readOnly).toBe(true);
  });

  it("drives the run link and enables Stop only while a run is active", () => {
    const { run, link } = rig();
    expect(disabled(studio.topBar.stop)).toBe(true);
    expect(disabled(studio.topBar.reset)).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: studio.topBar.run }));
    expect(link.run).toHaveBeenCalled();
    act(() => run.apply({ t: "phase", phase: "running" }));
    fireEvent.click(screen.getByRole("button", { name: studio.topBar.stop }));
    expect(link.stop).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: studio.topBar.reset }));
    expect(link.reset).toHaveBeenCalled();
  });

  it("shows the weakest model tier in use", () => {
    rig();
    expect(screen.getByLabelText(new RegExp(`^${studioModels.chip}`))).toBeTruthy();
  });
});
