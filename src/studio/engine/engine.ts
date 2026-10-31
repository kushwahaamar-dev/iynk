import type { Project } from "../../project/generated/types.ts";
import type { DocStore } from "../stores/doc.ts";
import type { Selectable, SessionStore } from "../stores/session.ts";
import type { ToolHost } from "../tools/host.ts";
import type { ToolCtx, ToolPointerEvent } from "../tools/types.ts";
import { GESTURE_SETTLE_MS } from "./constants.ts";
import { buildDrawList } from "./draw-list.ts";
import { GridIndex, pickAt, slopFor } from "./hit.ts";
import type { ArtMode, ArtProvider, DrawList, Hit, PointMm, Renderer, ResolvedPartShape, Scene, Viewport } from "./types.ts";
import { fitRect, panBy, pxToMm, zoomAround } from "./viewport.ts";

const DEFAULT_ZOOM = 4;
const FIT_MARGIN = 0.1;
const CLICK_SLOP_PX = 4;
const WHEEL_ZOOM_RATE = 0.0015;
const PINCH_ZOOM_RATE = 0.01;
const LINE_HEIGHT_PX = 33;

export interface EditorEngine {
  mount(el: HTMLElement): void;
  dispose(): void;
  fit(): void;
  fitSelection(): void;
  zoomBy(factor: number, anchorPx?: PointMm): void;
  /** Moves the content by `dx`, `dy` CSS px, as a drag does. */
  panBy(dx: number, dy: number): void;
  /** Redraws from the document, the viewport and the active tool's preview. */
  rebuild(): void;
  viewport(): Viewport;
  scene(): Scene;
  hit(xPx: number, yPx: number, slopPx: number): Hit | null;
}

export type EditorEngineDeps = {
  doc: DocStore;
  session: SessionStore;
  renderer: Renderer;
  art: ArtProvider;
  resolve: (defRef: string) => ResolvedPartShape;
  host: ToolHost;
  snapMm: () => number;
  artMode: () => ArtMode;
  mountOptions: Parameters<Renderer["mount"]>[1];
  /** What a view that draws itself (the schematic) puts on the canvas. Undefined draws the placements and wires of the view. */
  fixed?: (state: Project, viewId: string) => DrawList | undefined;
};

type Pinch = { distance: number; mid: PointMm };

const distanceOf = (a: PointMm, b: PointMm): number => Math.hypot(a.x - b.x, a.y - b.y);
const midOf = (a: PointMm, b: PointMm): PointMm => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

function selectableOf(hit: Hit | null, view: string): Selectable | null {
  switch (hit?.kind) {
    case "part":
      return { kind: "part", view, id: hit.c };
    case "wire":
      return { kind: "wire", view, id: hit.id };
    case "junction":
      return { kind: "junction", view, id: hit.id };
    case "label":
      return { kind: "label", view, id: hit.id };
    default:
      return null;
  }
}

export function createEditorEngine(deps: EditorEngineDeps): EditorEngine {
  const { doc, session, renderer, host } = deps;
  const grid = new GridIndex();
  const initial = session.getState().viewports[session.getState().viewId];
  let viewport: Viewport = initial ?? { cx_mm: 0, cy_mm: 0, k: DEFAULT_ZOOM, w: 0, h: 0, dpr: 1 };
  let needsFit = initial === undefined;
  let scene: Scene | null = null;
  let el: HTMLElement | null = null;
  let resizeObserver: ResizeObserver | undefined;
  let settleTimer: ReturnType<typeof setTimeout> | undefined;
  let unsubscribe: (() => void)[] = [];
  const cleanups: (() => void)[] = [];

  const pointers = new Map<number, PointMm>();
  let panning: { id: number; at: PointMm } | null = null;
  let pinch: Pinch | null = null;
  let suppressed = new Set<number>();
  let press: { at: PointMm; id: number } | null = null;
  let spaceDown = false;
  let lastPreview = session.getState().preview;
  let lastViewId = session.getState().viewId;

  const viewId = () => session.getState().viewId;

  function rebuild() {
    if (!el) return;
    const { scene: next, diff } = buildDrawList({
      state: doc.getState().state,
      viewId: viewId(),
      viewport,
      art: deps.art,
      resolve: deps.resolve,
      index: null,
      prev: scene,
      mode: deps.artMode(),
      overlays: session.getState().preview,
      fixed: deps.fixed?.(doc.getState().state, viewId()),
    });
    grid.rebuild(next.targets);
    scene = { ...next, index: grid };
    renderer.draw(scene, diff);
  }

  function scheduleRebuild() {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(rebuild, GESTURE_SETTLE_MS);
  }

  function setViewport(next: Viewport) {
    if (next.k === viewport.k && next.cx_mm === viewport.cx_mm && next.cy_mm === viewport.cy_mm && next.w === viewport.w && next.h === viewport.h) return;
    viewport = next;
    renderer.setViewport(next);
    session.setViewport(viewId(), next);
    scheduleRebuild();
  }

  function currentScene(): Scene {
    if (!scene) throw new Error("engine is not mounted");
    return scene;
  }

  function fitTo(items: ReadonlySet<string> | null) {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const t of currentScene().targets) {
      if (items && !items.has(t.item)) continue;
      x0 = Math.min(x0, t.bbox.x0);
      y0 = Math.min(y0, t.bbox.y0);
      x1 = Math.max(x1, t.bbox.x1);
      y1 = Math.max(y1, t.bbox.y1);
    }
    if (x0 > x1) {
      if (items) return fitTo(null);
      setViewport({ ...viewport, cx_mm: 0, cy_mm: 0, k: DEFAULT_ZOOM });
      return;
    }
    setViewport(fitRect(viewport, { x0, y0, x1, y1 }, FIT_MARGIN * Math.min(viewport.w, viewport.h)));
  }

  function measure() {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dpr = el.ownerDocument.defaultView?.devicePixelRatio ?? 1;
    setViewport({ ...viewport, w: rect.width, h: rect.height, dpr });
    if (needsFit && rect.width > 0 && rect.height > 0) {
      needsFit = false;
      fitTo(null);
    }
  }

  const canvasPoint = (e: { clientX: number; clientY: number }): PointMm => {
    const rect = el!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  function toolCtx(): ToolCtx | null {
    const view = doc.getState().state.views.find((v) => v.id === viewId());
    if (!view || !scene) return null;
    const hitFor = (ev: ToolPointerEvent) => engine.hit(ev.xPx, ev.yPx, slopFor(ev.pointerType));
    return {
      doc: doc.getState(),
      view,
      viewport,
      scene,
      selection: session.getState().selection,
      snapMm: deps.snapMm(),
      hit: hitFor,
      resolve: deps.resolve,
    };
  }

  function toolEvent(type: ToolPointerEvent["type"], e: PointerEvent, at: PointMm): ToolPointerEvent {
    const mm = pxToMm(viewport, at);
    return {
      type,
      xPx: at.x,
      yPx: at.y,
      xMm: mm.x,
      yMm: mm.y,
      button: e.button === 1 || e.button === 2 ? e.button : 0,
      shift: e.shiftKey,
      alt: e.altKey,
      ctrl: e.ctrlKey || e.metaKey,
      pointerType: e.pointerType === "touch" || e.pointerType === "pen" ? e.pointerType : "mouse",
      pointerId: e.pointerId,
    };
  }

  function selectAt(ev: ToolPointerEvent) {
    if (session.getState().tool !== "select") return;
    const picked = selectableOf(engine.hit(ev.xPx, ev.yPx, slopFor(ev.pointerType)), viewId());
    const current = session.getState().selection;
    if (ev.shift || ev.ctrl) {
      if (!picked) return;
      const has = current.some((s) => s.id === picked.id);
      session.setSelection(has ? current.filter((s) => s.id !== picked.id) : [...current, picked]);
      return;
    }
    session.setSelection(picked ? [picked] : []);
  }

  function onPointerDown(e: PointerEvent) {
    const at = canvasPoint(e);
    pointers.set(e.pointerId, at);
    el!.setPointerCapture?.(e.pointerId);
    if (e.pointerType === "touch" && pointers.size === 2) {
      host.cancel();
      press = null;
      panning = null;
      const [a, b] = [...pointers.values()] as [PointMm, PointMm];
      pinch = { distance: distanceOf(a, b), mid: midOf(a, b) };
      suppressed = new Set(pointers.keys());
      return;
    }
    if (pinch || pointers.size > 2) {
      suppressed.add(e.pointerId);
      return;
    }
    if (e.button === 1 || (e.button === 0 && spaceDown)) {
      e.preventDefault();
      panning = { id: e.pointerId, at };
      return;
    }
    const ctx = toolCtx();
    if (!ctx) return;
    if (e.button === 0) press = { at, id: e.pointerId };
    host.pointer(toolEvent("down", e, at), ctx);
  }

  function onPointerMove(e: PointerEvent) {
    const at = canvasPoint(e);
    pointers.set(e.pointerId, at);
    if (pinch) {
      if (pointers.size < 2) return;
      const [a, b] = [...pointers.values()] as [PointMm, PointMm];
      const mid = midOf(a, b);
      const distance = distanceOf(a, b);
      let next = panBy(viewport, mid.x - pinch.mid.x, mid.y - pinch.mid.y);
      if (pinch.distance > 0 && distance > 0) next = zoomAround(next, distance / pinch.distance, mid);
      pinch = { distance, mid };
      setViewport(next);
      return;
    }
    if (suppressed.has(e.pointerId)) return;
    if (panning?.id === e.pointerId) {
      setViewport(panBy(viewport, at.x - panning.at.x, at.y - panning.at.y));
      panning = { id: e.pointerId, at };
      return;
    }
    if (press?.id === e.pointerId && distanceOf(press.at, at) > CLICK_SLOP_PX) press = null;
    const ctx = toolCtx();
    if (!ctx) return;
    const ev = toolEvent("move", e, at);
    if (e.buttons === 0) session.setHover(engine.hit(ev.xPx, ev.yPx, slopFor(ev.pointerType)));
    host.pointer(ev, ctx);
  }

  function onPointerEnd(e: PointerEvent) {
    const at = canvasPoint(e);
    pointers.delete(e.pointerId);
    el!.releasePointerCapture?.(e.pointerId);
    if (pinch) {
      if (pointers.size < 2) pinch = null;
      suppressed.delete(e.pointerId);
      if (pointers.size === 0) suppressed.clear();
      return;
    }
    if (suppressed.delete(e.pointerId)) return;
    if (panning?.id === e.pointerId) {
      panning = null;
      return;
    }
    const ctx = toolCtx();
    if (!ctx) return;
    const ev = toolEvent(e.type === "pointercancel" ? "cancel" : "up", e, at);
    const clicked = ev.type === "up" && press?.id === e.pointerId;
    if (press?.id === e.pointerId) press = null;
    host.pointer(ev, ctx);
    if (clicked) selectAt(ev);
  }

  function onWheel(e: WheelEvent) {
    e.preventDefault();
    const at = canvasPoint(e);
    const scale = e.deltaMode === 1 ? LINE_HEIGHT_PX : 1;
    const mouseWheel = e.deltaMode === 1 || (Number.isInteger(e.deltaY) && e.deltaX === 0);
    if (e.ctrlKey) engine.zoomBy(Math.exp(-e.deltaY * scale * PINCH_ZOOM_RATE), at);
    else if (mouseWheel) engine.zoomBy(Math.exp(-e.deltaY * scale * WHEEL_ZOOM_RATE), at);
    else engine.panBy(-e.deltaX * scale, -e.deltaY * scale);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === " ") {
      spaceDown = true;
      e.preventDefault();
      return;
    }
    const ctx = toolCtx();
    if (ctx && host.key({ key: e.key, shift: e.shiftKey, alt: e.altKey, ctrl: e.ctrlKey || e.metaKey }, ctx)) e.preventDefault();
  }

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === " ") spaceDown = false;
  };
  const onBlur = () => {
    spaceDown = false;
  };

  const engine: EditorEngine = {
    mount(target) {
      if (el) throw new Error("engine is already mounted");
      el = target;
      renderer.mount(target, deps.mountOptions);
      const on = <K extends keyof HTMLElementEventMap>(type: K, fn: (e: HTMLElementEventMap[K]) => void, options?: AddEventListenerOptions) => {
        target.addEventListener(type, fn, options);
        cleanups.push(() => target.removeEventListener(type, fn, options));
      };
      on("pointerdown", onPointerDown);
      on("pointermove", onPointerMove);
      on("pointerup", onPointerEnd);
      on("pointercancel", onPointerEnd);
      on("wheel", onWheel, { passive: false });
      on("keydown", onKeyDown);
      on("keyup", onKeyUp);
      on("blur", onBlur);
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(measure);
        resizeObserver.observe(target);
      }
      renderer.setViewport(viewport);
      unsubscribe = [
        doc.onChange(rebuild),
        session.subscribe(() => {
          const s = session.getState();
          if (s.preview === lastPreview && s.viewId === lastViewId) return;
          const switched = s.viewId !== lastViewId;
          lastPreview = s.preview;
          lastViewId = s.viewId;
          const saved = s.viewports[s.viewId];
          if (switched && saved) setViewport({ ...saved, w: viewport.w, h: viewport.h, dpr: viewport.dpr });
          rebuild();
          if (switched && !saved) fitTo(null);
        }),
      ];
      rebuild();
      measure();
    },

    dispose() {
      clearTimeout(settleTimer);
      resizeObserver?.disconnect();
      for (const off of [...cleanups, ...unsubscribe]) off();
      cleanups.length = 0;
      unsubscribe = [];
      if (el) renderer.dispose();
      el = null;
      scene = null;
    },

    fit: () => fitTo(null),

    fitSelection() {
      const ids = new Set(session.getState().selection.map((s) => s.id));
      fitTo(ids.size > 0 ? ids : null);
    },

    zoomBy(factor, anchorPx = { x: viewport.w / 2, y: viewport.h / 2 }) {
      setViewport(zoomAround(viewport, factor, anchorPx));
    },

    panBy: (dx, dy) => setViewport(panBy(viewport, dx, dy)),
    rebuild,
    viewport: () => viewport,
    scene: currentScene,
    hit: (xPx, yPx, slopPx) => (scene ? pickAt(scene.index, viewport, xPx, yPx, slopPx) : null),
  };

  return engine;
}
