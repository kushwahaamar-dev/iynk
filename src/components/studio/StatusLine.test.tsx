import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import messages from "@/i18n/messages/en/studio.json";
import runMessages from "@/i18n/messages/en/studioRun.json";
import type { SceneStatus } from "@/studio/engine/controller";
import { createRunStore } from "@/studio/stores/run";
import { createStore } from "@/studio/stores/select";
import { createSessionStore } from "@/studio/stores/session";
import { createUiStore } from "@/studio/stores/ui";
import { StatusLine } from "./StatusLine";

afterEach(cleanup);

const stats = { items: 12, elements: 80, lod: [1, 4, 7] as [number, number, number], culled: 3, dropped: 0, buildMs: 1 };

function rig() {
  const status = createStore<SceneStatus>({ cursorMm: null, zoom: 4, scene: stats });
  const session = createSessionStore("vw_bb");
  const run = createRunStore();
  const ui = createUiStore("prj_a", { getItem: () => null, setItem: () => {} });
  render(<StatusLine status={status} session={session} run={run} ui={ui} messages={messages} runMessages={runMessages} lang="en" />);
  return { status, session, run, ui };
}

describe("StatusLine", () => {
  it("shows zoom, grid, selection and scene stats", () => {
    rig();
    const group = screen.getByRole("group", { name: messages.canvas.status.label });
    expect(group.getAttribute("aria-live")).toBe("off");
    expect(group.textContent).toContain("4.0 px per mm");
    expect(group.textContent).toContain("Grid 2.54 mm");
    expect(group.textContent).toContain("0 selected");
    expect(group.textContent).toContain("12 drawn, 3 off screen");
    expect(group.textContent).toContain("Detail low 1, medium 4, full 7");
  });

  it("follows the cursor and hides it when the pointer leaves", () => {
    const { status } = rig();
    expect(screen.queryByTitle("Cursor")).toBeNull();
    act(() => status.setState({ cursorMm: { x: 12.34, y: -5.06 }, zoom: 4, scene: stats }));
    expect(screen.getByTitle("Cursor").textContent).toBe("12.3, -5.1 mm");
    act(() => status.setState({ cursorMm: null, zoom: 4, scene: stats }));
    expect(screen.queryByTitle("Cursor")).toBeNull();
  });

  it("counts the selection and reads the grid from the view state", () => {
    const { session, ui } = rig();
    act(() => session.setSelection([{ kind: "part", view: "vw_bb", id: "cmp_0" }]));
    expect(screen.getByText("1 selected")).toBeTruthy();
    act(() => ui.set("gridOn", false));
    expect(screen.getByText("Grid off")).toBeTruthy();
  });

  it("shows the run phase, the simulated time and the slow note", () => {
    const { run } = rig();
    expect(screen.getByText(runMessages.phase.idle)).toBeTruthy();
    act(() => {
      run.apply({ t: "phase", phase: "starting" });
      run.apply({ t: "phase", phase: "running" });
      run.apply({ t: "behind", behind: true });
    });
    expect(screen.getByText(runMessages.phase.running)).toBeTruthy();
    expect(screen.getByText(runMessages.bar.behind)).toBeTruthy();
    expect(screen.getByRole("timer", { name: runMessages.bar.time }).textContent).toBe("0.000 s");
  });
});
