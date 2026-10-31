import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import messages from "@/i18n/messages/en/studio.json";
import type { AssemblyStep } from "@/studio/guide/assembly";
import { AssemblyGuide } from "./AssemblyGuide";

afterEach(cleanup);

const step = (over: Partial<AssemblyStep>): AssemblyStep => ({
  index: 0,
  title: "Strip",
  body: "Take it off",
  kind: "build",
  command: { type: "press", id: "strip" },
  refusal: null,
  state: "current",
  fault: null,
  manual: false,
  needsLens: true,
  ...over,
});

const view = (steps: AssemblyStep[], figureReady = true) => {
  const fns = { onShow: vi.fn(), onMark: vi.fn(), onBreak: vi.fn() };
  render(<AssemblyGuide steps={steps} figureReady={figureReady} messages={messages} {...fns} />);
  return fns;
};

describe("AssemblyGuide", () => {
  it("shows the current step through onShow", () => {
    const { onShow } = view([step({})]);
    fireEvent.click(screen.getByRole("button", { name: "Show me" }));
    expect(onShow).toHaveBeenCalledWith(expect.objectContaining({ index: 0 }));
  });

  it("refuses a step tried out of order", () => {
    const { onShow } = view([step({ state: "notStarted", refusal: "Plug it in first." })]);
    fireEvent.click(screen.getByRole("button", { name: "Show me" }));
    expect(onShow).not.toHaveBeenCalled();
    expect(screen.getByText("Plug it in first.")).toBeTruthy();
  });

  it("falls back to the standard refusal", () => {
    view([step({ state: "notStarted" })]);
    fireEvent.click(screen.getByRole("button", { name: "Show me" }));
    expect(screen.getByText("Do the earlier steps first.")).toBeTruthy();
  });

  it("says a figure-checked step needs the lens", () => {
    view([step({})], false);
    expect(screen.getByText("This step is checked in the figure view.")).toBeTruthy();
  });

  it("marks a manual step done", () => {
    const { onMark } = view([step({ index: 2, manual: true, needsLens: false })]);
    fireEvent.click(screen.getByRole("button", { name: "Mark as done" }));
    expect(onMark).toHaveBeenCalledWith(2);
  });

  it("breaks the fault of a break step", () => {
    const { onBreak } = view([step({ kind: "break", fault: "short", needsLens: false, command: null })]);
    fireEvent.click(screen.getByRole("button", { name: "Break" }));
    expect(onBreak).toHaveBeenCalledWith("short");
  });
});
