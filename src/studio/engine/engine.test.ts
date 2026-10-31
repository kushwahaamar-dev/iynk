// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lessonSession } from "../../project/session.testing.ts";
import { createSessionStore } from "../stores/session.ts";
import { createRecordingDoc } from "../testing/recording-doc.ts";
import { createToolHost } from "../tools/host.ts";
import type { Tool } from "../tools/types.ts";
import { GESTURE_SETTLE_MS } from "./constants.ts";
import { createEditorEngine } from "./engine.ts";
import { miniProject, resolveShape, stubArt, VIEW_ID } from "./testing/mini-scene.ts";
import { createNullRenderer } from "./types.ts";
import { pxToMm } from "./viewport.ts";

const W = 800;
const H = 400;

function setup() {
  const doc = createRecordingDoc(lessonSession({}, miniProject(20, 0)));
  const session = createSessionStore(VIEW_ID);
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
  return { doc, session, renderer, host, engine, el };
}

function pointer(type: string, x: number, y: number, init: PointerEventInit = {}) {
  const e = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true, ...init });
  Object.assign(e, { pointerId: init.pointerId ?? 1, pointerType: init.pointerType ?? "mouse" });
  return e as unknown as PointerEvent;
}

function wheel(x: number, y: number, init: WheelEventInit) {
  return new WheelEvent("wheel", { clientX: x, clientY: y, bubbles: true, cancelable: true, ...init });
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("EditorEngine", () => {
  it("mounts the renderer, fits the content and publishes the viewport", () => {
    const { engine, renderer, session } = setup();
    expect(renderer.calls[0]).toMatchObject({ method: "mount" });
    const v = engine.viewport();
    expect(v).toMatchObject({ w: W, h: H });
    const px = (mm: number, c: number, size: number) => (mm - c) * v.k + size / 2;
    expect(px(-0.5, v.cx_mm, W)).toBeGreaterThan(0);
    expect(px(190.5, v.cx_mm, W)).toBeLessThan(W);
    expect(session.getState().viewports[VIEW_ID]).toEqual(v);
    expect(engine.scene().items.length).toBeGreaterThan(0);
  });

  it("zooms with the wheel around the cursor", () => {
    const { engine, el } = setup();
    const at = { x: 300, y: 120 };
    const under = pxToMm(engine.viewport(), at);
    const before = engine.viewport().k;
    el.dispatchEvent(wheel(at.x, at.y, { deltaY: -100 }));
    expect(engine.viewport().k).toBeGreaterThan(before);
    const now = pxToMm(engine.viewport(), at);
    expect(now.x).toBeCloseTo(under.x, 6);
    expect(now.y).toBeCloseTo(under.y, 6);
    el.dispatchEvent(wheel(at.x, at.y, { deltaY: 100 }));
    expect(engine.viewport().k).toBeCloseTo(before, 6);
  });

  it("pans with a trackpad scroll and with the middle button", () => {
    const { engine, el } = setup();
    const start = engine.viewport();
    el.dispatchEvent(wheel(10, 10, { deltaX: 3.5, deltaY: 12.25 }));
    expect(engine.viewport().cx_mm).toBeCloseTo(start.cx_mm + 3.5 / start.k, 9);
    expect(engine.viewport().cy_mm).toBeCloseTo(start.cy_mm + 12.25 / start.k, 9);
    const mid = engine.viewport();
    el.dispatchEvent(pointer("pointerdown", 100, 100, { button: 1 }));
    el.dispatchEvent(pointer("pointermove", 140, 90, { button: 1, buttons: 4 }));
    el.dispatchEvent(pointer("pointerup", 140, 90, { button: 1 }));
    expect(engine.viewport().cx_mm).toBeCloseTo(mid.cx_mm - 40 / mid.k, 9);
    expect(engine.viewport().cy_mm).toBeCloseTo(mid.cy_mm + 10 / mid.k, 9);
  });

  it("pans on Space plus a primary drag without calling the tool", () => {
    const { engine, el, host } = setup();
    const spy = vi.spyOn(host, "pointer");
    const start = engine.viewport();
    el.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    el.dispatchEvent(pointer("pointerdown", 50, 50));
    el.dispatchEvent(pointer("pointermove", 80, 50, { buttons: 1 }));
    el.dispatchEvent(pointer("pointerup", 80, 50));
    el.dispatchEvent(new KeyboardEvent("keyup", { key: " ", bubbles: true }));
    expect(engine.viewport().cx_mm).toBeCloseTo(start.cx_mm - 30 / start.k, 9);
    expect(spy).not.toHaveBeenCalled();
  });

  it("fits all, fits the selection and falls back when the selection is empty", () => {
    const { engine, session } = setup();
    session.setSelection([{ kind: "part", view: VIEW_ID, id: "cmp_0" }]);
    engine.fitSelection();
    const one = engine.viewport();
    expect(one.cx_mm).toBeCloseTo(5, 6);
    session.setSelection([]);
    engine.fitSelection();
    const all = engine.viewport();
    expect(all.k).toBeLessThan(one.k);
    engine.zoomBy(3);
    engine.fit();
    expect(engine.viewport()).toEqual(all);
  });

  it("selects the part under a click and clears on an empty click", () => {
    const { engine, session, el } = setup();
    const v = engine.viewport();
    const px = (x: number, y: number) => ({ x: (x - v.cx_mm) * v.k + W / 2, y: (y - v.cy_mm) * v.k + H / 2 });
    const body = px(5, 1.5);
    el.dispatchEvent(pointer("pointerdown", body.x, body.y));
    el.dispatchEvent(pointer("pointerup", body.x, body.y));
    expect(session.getState().selection).toEqual([{ kind: "part", view: VIEW_ID, id: "cmp_0" }]);
    const other = px(25, 1.5);
    el.dispatchEvent(pointer("pointerdown", other.x, other.y, { shiftKey: true }));
    el.dispatchEvent(pointer("pointerup", other.x, other.y, { shiftKey: true }));
    expect(session.getState().selection.map((s) => s.id)).toEqual(["cmp_0", "cmp_1"]);
    const empty = px(5, 60);
    el.dispatchEvent(pointer("pointerdown", empty.x, empty.y));
    el.dispatchEvent(pointer("pointerup", empty.x, empty.y));
    expect(session.getState().selection).toEqual([]);
  });

  it("leaves the selection and the document alone when an empty canvas is dragged", () => {
    const { engine, session, doc, el } = setup();
    const v = engine.viewport();
    const empty = { x: W / 2, y: (60 - v.cy_mm) * v.k + H / 2 };
    session.setSelection([{ kind: "part", view: VIEW_ID, id: "cmp_0" }]);
    el.dispatchEvent(pointer("pointerdown", empty.x, empty.y));
    el.dispatchEvent(pointer("pointermove", empty.x + 60, empty.y + 5, { buttons: 1 }));
    el.dispatchEvent(pointer("pointerup", empty.x + 60, empty.y + 5));
    expect(session.getState().selection).toHaveLength(1);
    expect(doc.commits).toHaveLength(0);
  });

  it("hits pins at 12 px and parts, and finds pins at the smallest part size", () => {
    const { engine } = setup();
    const v = engine.viewport();
    const pin = { x: (0 - v.cx_mm) * v.k + W / 2, y: (1.5 - v.cy_mm) * v.k + H / 2 };
    expect(engine.hit(pin.x - 12, pin.y, 12)).toEqual({ kind: "pin", c: "cmp_0", p: "1" });
    engine.zoomBy(2 / v.k);
    vi.advanceTimersByTime(GESTURE_SETTLE_MS);
    const small = engine.viewport();
    const at = { x: (0 - small.cx_mm) * small.k + W / 2, y: (1.5 - small.cy_mm) * small.k + H / 2 };
    expect(engine.scene().items.find((i) => i.id === "cmp_0")?.lod).toBe(0);
    expect(engine.hit(at.x, at.y, 12)).toEqual({ kind: "pin", c: "cmp_0", p: "1" });
  });

  it("sends a tool commit through the host and redraws after the change", () => {
    const { engine, el, host, doc, renderer } = setup();
    const tool: Tool = {
      id: "select",
      cursor: () => "default",
      pointer: (e) => (e.type === "up" ? { kind: "commit", batch: [{ k: "view.place", view: VIEW_ID, placement: { c: "cmp_0", x_mm: 0, y_mm: 30 } }], label: "Move" } : { kind: "none" }),
      key: () => ({ kind: "none" }),
      preview: () => [],
    };
    host.register(tool);
    const v = engine.viewport();
    const p = { x: (5 - v.cx_mm) * v.k + W / 2, y: (1.5 - v.cy_mm) * v.k + H / 2 };
    const draws = renderer.calls.filter((c) => c.method === "draw").length;
    el.dispatchEvent(pointer("pointerdown", p.x, p.y));
    el.dispatchEvent(pointer("pointerup", p.x, p.y));
    expect(doc.commits).toHaveLength(1);
    expect(renderer.calls.filter((c) => c.method === "draw").length).toBeGreaterThan(draws);
    expect(engine.scene().items.find((i) => i.id === "cmp_0")?.yMm).toBe(30);
  });

  it("cancels a one-pointer gesture when a second finger lands, then pinch-zooms", () => {
    const { engine, el, host } = setup();
    const events: string[] = [];
    host.register({
      id: "select",
      cursor: () => "default",
      pointer: (e) => {
        events.push(e.type);
        return { kind: "none" };
      },
      key: () => ({ kind: "none" }),
      preview: () => [],
    });
    const touch = (id: number) => ({ pointerType: "touch", pointerId: id });
    el.dispatchEvent(pointer("pointerdown", 300, 200, touch(1)));
    el.dispatchEvent(pointer("pointerdown", 500, 200, touch(2)));
    expect(events).toEqual(["down", "cancel"]);
    const k = engine.viewport().k;
    el.dispatchEvent(pointer("pointermove", 200, 200, touch(1)));
    el.dispatchEvent(pointer("pointermove", 600, 200, touch(2)));
    expect(engine.viewport().k).toBeGreaterThan(k);
    el.dispatchEvent(pointer("pointerup", 200, 200, touch(1)));
    el.dispatchEvent(pointer("pointerup", 600, 200, touch(2)));
    expect(events).toEqual(["down", "cancel"]);
  });

  it("rebuilds the scene a moment after a gesture settles", () => {
    const { engine, renderer } = setup();
    const draws = () => renderer.calls.filter((c) => c.method === "draw").length;
    const before = draws();
    engine.panBy(30, 0);
    engine.panBy(30, 0);
    expect(draws()).toBe(before);
    vi.advanceTimersByTime(GESTURE_SETTLE_MS);
    expect(draws()).toBe(before + 1);
  });

  it("removes its listeners and the renderer on dispose", () => {
    const { engine, el, renderer } = setup();
    engine.dispose();
    expect(renderer.calls.at(-1)).toMatchObject({ method: "dispose" });
    const k = engine.viewport().k;
    el.dispatchEvent(wheel(10, 10, { deltaY: -100 }));
    expect(engine.viewport().k).toBe(k);
  });

  it("copes with a canvas of zero size", () => {
    const doc = createRecordingDoc(lessonSession({}, miniProject()));
    const session = createSessionStore(VIEW_ID);
    const engine = createEditorEngine({
      doc, session, renderer: createNullRenderer(), art: stubArt, resolve: resolveShape, host: createToolHost({ doc, session }),
      snapMm: () => 1, artMode: () => "simple", mountOptions: { locale: "en", theme: "light", reduceMotion: false },
    });
    engine.mount(document.createElement("div"));
    engine.fit();
    expect(Number.isFinite(engine.viewport().k)).toBe(true);
  });
});
