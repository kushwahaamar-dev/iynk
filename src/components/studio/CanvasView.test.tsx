import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import messages from "@/i18n/messages/en/studio.json";
import { lessonSession } from "@/project/session.testing";
import { createSceneController } from "@/studio/engine/controller";
import { createEditorEngine } from "@/studio/engine/engine";
import { miniProject, resolveShape, stubArt, VIEW_ID } from "@/studio/engine/testing/mini-scene";
import { createNullRenderer } from "@/studio/engine/types";
import { createRunStore } from "@/studio/stores/run";
import { createSessionStore } from "@/studio/stores/session";
import { createUiStore } from "@/studio/stores/ui";
import { createRecordingDoc } from "@/studio/testing/recording-doc";
import { createToolHost } from "@/studio/tools/host";
import { CanvasView } from "./CanvasView";

afterEach(cleanup);

function rig() {
  const doc = createRecordingDoc(lessonSession({}, miniProject(20, 0)));
  const session = createSessionStore(VIEW_ID);
  const renderer = createNullRenderer();
  const engine = createEditorEngine({
    doc,
    session,
    renderer,
    art: stubArt,
    resolve: resolveShape,
    host: createToolHost({ doc, session }),
    snapMm: () => 2.54,
    artMode: () => "illustrated",
    mountOptions: { locale: "en", theme: "light", reduceMotion: false },
  });
  const controller = createSceneController({
    doc,
    session,
    ui: createUiStore("prj_mini", { getItem: () => null, setItem: () => {} }),
    run: createRunStore(),
    engine,
    renderer,
    overlays: { net: () => [], state: () => [], air: () => [] },
  });
  return { engine, controller, renderer };
}

function size(el: HTMLElement) {
  el.getBoundingClientRect = () => ({ left: 0, top: 0, right: 800, bottom: 400, width: 800, height: 400, x: 0, y: 0, toJSON: () => ({}) });
}

describe("CanvasView", () => {
  it("is a named, focusable application with its hint", () => {
    const { engine } = rig();
    render(<CanvasView engine={engine} messages={messages} />);
    const canvas = screen.getByRole("application", { name: messages.canvas.label });
    expect(canvas.tabIndex).toBe(0);
    const hint = document.getElementById(canvas.getAttribute("aria-describedby")!);
    expect(hint?.textContent).toBe(messages.canvas.hint);
  });

  it("mounts the engine on the element and disposes it on unmount", () => {
    const { engine, renderer } = rig();
    const mount = vi.spyOn(engine, "mount");
    const { unmount } = render(<CanvasView engine={engine} messages={messages} />);
    expect(mount).toHaveBeenCalledWith(screen.getByRole("application"));
    unmount();
    expect(renderer.calls.at(-1)).toMatchObject({ method: "dispose" });
  });

  it("zooms with the wheel through the engine", () => {
    const { engine } = rig();
    const canvas = render(<CanvasView engine={engine} messages={messages} />).getByRole("application");
    size(canvas);
    const before = engine.viewport().k;
    canvas.dispatchEvent(new WheelEvent("wheel", { deltaY: -100, clientX: 400, clientY: 200, bubbles: true, cancelable: true }));
    expect(engine.viewport().k).toBeGreaterThan(before);
  });

  it("captures the pointer on press", () => {
    const { engine } = rig();
    const canvas = render(<CanvasView engine={engine} messages={messages} />).getByRole("application");
    size(canvas);
    canvas.setPointerCapture = vi.fn();
    const down = new MouseEvent("pointerdown", { clientX: 10, clientY: 10, bubbles: true, cancelable: true });
    Object.assign(down, { pointerId: 7, pointerType: "mouse" });
    canvas.dispatchEvent(down);
    expect(canvas.setPointerCapture).toHaveBeenCalledWith(7);
  });

  it("pans, zooms and fits from the keyboard", () => {
    const { engine } = rig();
    const rect = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ left: 0, top: 0, right: 800, bottom: 400, width: 800, height: 400, x: 0, y: 0, toJSON: () => ({}) });
    render(<CanvasView engine={engine} messages={messages} />);
    rect.mockRestore();
    const canvas = screen.getByRole("application");
    const start = engine.viewport();
    fireEvent.keyDown(canvas, { key: "ArrowRight" });
    expect(engine.viewport().cx_mm).toBeGreaterThan(start.cx_mm);
    fireEvent.keyDown(canvas, { key: "+" });
    expect(engine.viewport().k).toBeGreaterThan(start.k);
    fireEvent.keyDown(canvas, { key: "-" });
    expect(engine.viewport().k).toBeCloseTo(start.k, 9);
    fireEvent.keyDown(canvas, { key: "0" });
    expect(engine.viewport()).toEqual(start);
    fireEvent.keyDown(canvas, { key: "ArrowLeft", ctrlKey: true });
    expect(engine.viewport()).toEqual(start);
  });

  it("tells the controller where the pointer is", () => {
    const { engine, controller } = rig();
    const setCursor = vi.spyOn(controller, "setCursor");
    const canvas = render(<CanvasView engine={engine} controller={controller} messages={messages} />).getByRole("application");
    size(canvas);
    const move = new MouseEvent("pointermove", { clientX: 30, clientY: 40, bubbles: true });
    Object.assign(move, { pointerId: 1, pointerType: "mouse" });
    canvas.dispatchEvent(move);
    expect(setCursor).toHaveBeenLastCalledWith({ x: 30, y: 40 });
    canvas.dispatchEvent(new MouseEvent("pointerleave"));
    expect(setCursor).toHaveBeenLastCalledWith(null);
  });
});
