// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lessonSession } from "../../project/session.testing.ts";
import { createRunStore } from "../stores/run.ts";
import { createSessionStore } from "../stores/session.ts";
import { createUiStore } from "../stores/ui.ts";
import { createRecordingDoc } from "../testing/recording-doc.ts";
import { createToolHost } from "../tools/host.ts";
import { createSceneController } from "./controller.ts";
import type { OverlayProviders } from "./controller.ts";
import { GESTURE_SETTLE_MS } from "./constants.ts";
import { createEditorEngine } from "./engine.ts";
import { miniProject, resolveShape, stubArt, VIEW_ID } from "./testing/mini-scene.ts";
import { createNullRenderer } from "./types.ts";
import type { Overlay, SceneDiff } from "./types.ts";

const W = 800;
const H = 400;

const ring = (id: string, xMm = 0): Overlay => ({ id, xMm, yMm: 0, elements: [{ t: "circle", cx: 0, cy: 0, r: 1, stroke: "var(--studio-ink)" }] });

function setup(options: { projectParts?: number; storage?: Pick<Storage, "getItem" | "setItem"> } = {}) {
  const doc = createRecordingDoc(lessonSession({}, miniProject(options.projectParts ?? 20, 0)));
  const session = createSessionStore(VIEW_ID);
  const ui = createUiStore("prj_mini", options.storage ?? { getItem: () => null, setItem: () => {} });
  const run = createRunStore();
  const renderer = createNullRenderer();
  const host = createToolHost({ doc, session });
  const engine = createEditorEngine({
    doc,
    session,
    renderer,
    art: stubArt,
    resolve: resolveShape,
    host,
    snapMm: () => 2.54,
    artMode: () => "illustrated",
    mountOptions: { locale: "en", theme: "light", reduceMotion: false },
  });
  const el = document.createElement("div");
  el.getBoundingClientRect = () => ({ left: 0, top: 0, right: W, bottom: H, width: W, height: H, x: 0, y: 0, toJSON: () => ({}) });
  document.body.append(el);
  engine.mount(el);
  vi.advanceTimersByTime(GESTURE_SETTLE_MS);
  let clock = 0;
  const net = vi.fn<OverlayProviders["net"]>(() => []);
  const overlays: OverlayProviders = { net, state: () => [], air: () => [] };
  const controller = createSceneController({ doc, session, ui, run, engine, renderer, overlays, now: () => clock });
  const draws = () => renderer.calls.filter((c) => c.method === "draw") as { method: "draw"; diff: SceneDiff }[];
  return { doc, session, ui, run, renderer, engine, controller, net, draws, advance: (ms: number) => void (clock += ms) };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("createSceneController", () => {
  it("redraws one item when one part moves", () => {
    const { doc, controller, draws } = setup();
    controller.start();
    const before = draws().length;
    doc.commit([{ k: "view.place", view: VIEW_ID, placement: { c: "cmp_0", x_mm: 0, y_mm: 30 } }], { label: "Move" });
    const made = draws().slice(before);
    expect(made).toHaveLength(1);
    expect(made[0]!.diff).toEqual({ added: [], changed: ["cmp_0"], removed: [] });
  });

  it("redraws every item that differs when another project loads", () => {
    const { doc, controller, draws } = setup({ projectParts: 3 });
    controller.start();
    const before = draws().length;
    doc.replaceSession(lessonSession({}, miniProject(5, 0)));
    const diff = draws().slice(before).at(-1)!.diff;
    expect(diff.added).toEqual(expect.arrayContaining(["cmp_3", "cmp_4"]));
    expect(diff.added).toHaveLength(2);
  });

  it("draws overlays at most every 33 ms and only what changed", () => {
    const { controller, net, draws, advance } = setup();
    controller.start();
    const base = draws().length;
    net.mockReturnValue([ring("focus:a")]);
    controller.setCursor({ x: 1, y: 1 });
    vi.advanceTimersByTime(16);
    expect(draws().length).toBe(base);
    advance(40);
    vi.advanceTimersByTime(16);
    const first = draws().at(-1)!;
    expect(draws().length).toBe(base + 1);
    expect(first.diff).toEqual({ added: ["focus:a"], changed: [], removed: [] });
    advance(40);
    controller.setCursor({ x: 2, y: 2 });
    vi.advanceTimersByTime(16);
    expect(draws().length).toBe(base + 1);
    net.mockReturnValue([ring("focus:a", 3)]);
    advance(40);
    controller.setCursor({ x: 3, y: 3 });
    vi.advanceTimersByTime(16);
    expect(draws().at(-1)!.diff).toEqual({ added: [], changed: ["focus:a"], removed: [] });
    net.mockReturnValue([]);
    advance(40);
    controller.setCursor(null);
    vi.advanceTimersByTime(16);
    expect(draws().at(-1)!.diff).toEqual({ added: [], changed: [], removed: ["focus:a"] });
  });

  it("reports the cursor in mm, the zoom and the scene stats", () => {
    const { controller, engine, advance } = setup();
    controller.start();
    advance(40);
    controller.setCursor({ x: W / 2, y: H / 2 });
    vi.advanceTimersByTime(16);
    const { cx_mm, cy_mm, k } = engine.viewport();
    const status = controller.status.getState();
    expect(status.cursorMm).toEqual({ x: cx_mm, y: cy_mm });
    expect(status.zoom).toBe(k);
    expect(status.scene.items).toBeGreaterThan(0);
  });

  it("saves the viewport once, 300 ms after the last of 50 pan events", () => {
    const { controller, engine, ui, session } = setup();
    const set = vi.spyOn(ui, "set");
    controller.start();
    set.mockClear();
    for (let i = 0; i < 50; i++) {
      engine.panBy(1, 1);
      vi.advanceTimersByTime(5);
    }
    expect(set).not.toHaveBeenCalled();
    vi.advanceTimersByTime(294);
    expect(set).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(set).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith("viewports", { [VIEW_ID]: session.getState().viewports[VIEW_ID] });
  });

  it("starts from the viewport saved in the view state", () => {
    const saved = { cx_mm: 40, cy_mm: 12, k: 2.5, w: 500, h: 300, dpr: 1 };
    const storage = { getItem: () => JSON.stringify({ viewports: { [VIEW_ID]: saved } }), setItem: () => {} };
    const { controller, engine, session } = setup({ storage });
    controller.start();
    const v = engine.viewport();
    expect(v.k).toBeCloseTo(2.5, 9);
    expect(v.cx_mm).toBeCloseTo(40, 9);
    expect(v.cy_mm).toBeCloseTo(12, 9);
    expect([v.w, v.h]).toEqual([W, H]);
    expect(session.getState().viewports[VIEW_ID]).toEqual(v);
  });

  it("flushes a pending save on stop and saves nothing after", () => {
    const { controller, engine, ui } = setup();
    const set = vi.spyOn(ui, "set");
    controller.start();
    set.mockClear();
    engine.panBy(10, 0);
    controller.stop();
    expect(set).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(GESTURE_SETTLE_MS + 1000);
    expect(set).toHaveBeenCalledTimes(1);
    engine.panBy(10, 0);
    vi.advanceTimersByTime(1000);
    expect(set).toHaveBeenCalledTimes(1);
  });

  it("redraws on request", () => {
    const { controller, net, draws } = setup();
    controller.start();
    net.mockReturnValue([ring("focus:b")]);
    controller.rebuild();
    expect(draws().at(-1)!.diff.added).toEqual(["focus:b"]);
  });
});
