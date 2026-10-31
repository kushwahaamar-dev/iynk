import type { DocStore } from "../stores/doc.ts";
import type { RunView } from "../stores/run.ts";
import { createStore } from "../stores/select.ts";
import type { Store } from "../stores/select.ts";
import type { SessionStore } from "../stores/session.ts";
import type { UiStore } from "../stores/ui.ts";
import { GESTURE_SETTLE_MS } from "./constants.ts";
import type { EditorEngine } from "./engine.ts";
import type { DrawItem, DrawStats, Overlay, PointMm, Renderer, Viewport } from "./types.ts";
import { pxToMm } from "./viewport.ts";

export type OverlayProviders = { net: () => Overlay[]; state: () => Overlay[]; air: () => Overlay[] };

type ProviderContext = { viewport: Viewport; viewId: string };
type RegisteredProvider = (ctx: ProviderContext) => Overlay[];

const registered = new Map<RegisteredProvider, () => void>();
const watchers = new Set<() => void>();

const notifyWatchers = () => {
  for (const wake of [...watchers]) wake();
};

/**
 * Adds an overlay layer that this module does not own, such as other members' pointers. Controllers call it after
 * `air` with the active viewport and view id. `subscribe` names what makes the items change, so a quiet scene still
 * redraws. Returns the function that removes the provider.
 */
export function registerOverlayProvider(p: RegisteredProvider, subscribe?: (fn: () => void) => () => void): () => void {
  const unsubscribe = subscribe?.(notifyWatchers) ?? (() => {});
  registered.set(p, unsubscribe);
  notifyWatchers();
  return () => {
    registered.get(p)?.();
    registered.delete(p);
    notifyWatchers();
  };
}

export type SceneStatus = { cursorMm: PointMm | null; zoom: number; scene: DrawStats };

export interface SceneController {
  /** Call once the engine is mounted. Restores the saved viewport and starts following the document. */
  start(): void;
  stop(): void;
  /** Redraws the document and the overlay layer now. */
  rebuild(): void;
  /** The pointer position over the canvas in CSS px, or null once it leaves. */
  setCursor(px: PointMm | null): void;
  readonly status: Store<SceneStatus>;
}

export type SceneControllerDeps = {
  doc: DocStore;
  session: SessionStore;
  ui: UiStore;
  run: Store<RunView>;
  engine: EditorEngine;
  renderer: Renderer;
  overlays: OverlayProviders;
  now?: () => number;
};

const OVERLAY_GATE_MS = 33;
const VIEWPORT_SAVE_MS = 300;
const Z_OVERLAY = 300;

const EMPTY_STATS: DrawStats = { items: 0, elements: 0, lod: [0, 0, 0], culled: 0, dropped: 0, buildMs: 0 };

const sameMm = (a: PointMm | null, b: PointMm | null): boolean => (a === null || b === null ? a === b : a.x === b.x && a.y === b.y);

function sameStatus(a: SceneStatus, b: SceneStatus): boolean {
  const x = a.scene;
  const y = b.scene;
  return (
    sameMm(a.cursorMm, b.cursorMm) &&
    a.zoom === b.zoom &&
    x.items === y.items &&
    x.elements === y.elements &&
    x.culled === y.culled &&
    x.dropped === y.dropped &&
    x.lod.every((n, i) => n === y.lod[i])
  );
}

function overlayItem(o: Overlay): DrawItem {
  return {
    id: o.id,
    kind: "overlay",
    z: Z_OVERLAY,
    lod: 2,
    xMm: o.xMm,
    yMm: o.yMm,
    rotation: 0,
    bbox: { x0: o.xMm, y0: o.yMm, x1: o.xMm, y1: o.yMm },
    elements: o.elements,
    title: "",
  };
}

/**
 * Joins the document, the engine and the renderer. The engine redraws the parts and wires itself on every document
 * change, and its draw list diff already names only the items that differ. This adds what the engine does not know
 * about: the net, state and air-wire overlays, plus any registered provider's (redrawn at most 30 times a second), the numbers behind the status
 * line, and the viewport that outlives the page in the viewer's local view state.
 */
export function createSceneController(deps: SceneControllerDeps): SceneController {
  const { doc, session, ui, run, engine, renderer, overlays } = deps;
  const now = deps.now ?? (() => performance.now());
  const status = createStore<SceneStatus>({ cursorMm: null, zoom: engine.viewport().k, scene: EMPTY_STATS });

  let running = false;
  let dirty = false;
  let frame: number | null = null;
  let lastRefresh = Number.NEGATIVE_INFINITY;
  let cursorPx: PointMm | null = null;
  let shown = new Map<string, Overlay>();
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let savePending = false;
  let settleTimer: ReturnType<typeof setTimeout> | undefined;
  let lastViewport: Viewport | undefined;
  let unsubscribe: (() => void)[] = [];

  function restoreViewport() {
    const saved = ui.getState().viewports[session.getState().viewId];
    if (!saved) return;
    engine.zoomBy(saved.k / engine.viewport().k);
    const { k, cx_mm, cy_mm } = engine.viewport();
    engine.panBy((cx_mm - saved.cx_mm) * k, (cy_mm - saved.cy_mm) * k);
  }

  function refreshOverlays() {
    const next = new Map<string, Overlay>();
    const ctx = { viewport: engine.viewport(), viewId: session.getState().viewId };
    const extra = [...registered.keys()].flatMap((p) => p(ctx));
    for (const o of [...overlays.net(), ...overlays.state(), ...overlays.air(), ...extra]) next.set(o.id, o);
    const diff = { added: [] as string[], changed: [] as string[], removed: [] as string[] };
    for (const [id, o] of next) {
      const before = shown.get(id);
      if (!before) diff.added.push(id);
      else if (before !== o && (before.xMm !== o.xMm || before.yMm !== o.yMm || JSON.stringify(before.elements) !== JSON.stringify(o.elements))) diff.changed.push(id);
    }
    for (const id of shown.keys()) if (!next.has(id)) diff.removed.push(id);
    shown = next;
    if (diff.added.length + diff.changed.length + diff.removed.length === 0) return;
    const scene = engine.scene();
    renderer.draw({ ...scene, items: [...scene.items, ...[...next.values()].map(overlayItem)] }, diff);
  }

  function refreshStatus() {
    const viewport = engine.viewport();
    const next: SceneStatus = {
      cursorMm: cursorPx ? pxToMm(viewport, cursorPx) : null,
      zoom: viewport.k,
      scene: engine.scene().stats,
    };
    if (!sameStatus(status.getState(), next)) status.setState(next);
  }

  function refresh() {
    lastRefresh = now();
    dirty = false;
    refreshOverlays();
    refreshStatus();
  }

  function schedule() {
    dirty = true;
    if (!running || frame !== null) return;
    frame = requestAnimationFrame(tick);
  }

  function tick() {
    frame = null;
    if (!running) return;
    if (now() - lastRefresh < OVERLAY_GATE_MS) {
      frame = requestAnimationFrame(tick);
      return;
    }
    if (dirty) refresh();
  }

  function saveViewport() {
    clearTimeout(saveTimer);
    savePending = false;
    const { viewId, viewports } = session.getState();
    const viewport = viewports[viewId];
    if (viewport) ui.set("viewports", { ...ui.getState().viewports, [viewId]: viewport });
  }

  function persistViewport() {
    clearTimeout(saveTimer);
    savePending = true;
    saveTimer = setTimeout(saveViewport, VIEWPORT_SAVE_MS);
  }

  function onSession() {
    const { viewId, viewports } = session.getState();
    const viewport = viewports[viewId];
    if (viewport !== lastViewport) {
      lastViewport = viewport;
      persistViewport();
      clearTimeout(settleTimer);
      settleTimer = setTimeout(schedule, GESTURE_SETTLE_MS + OVERLAY_GATE_MS);
    }
    schedule();
  }

  return {
    status,

    start() {
      if (running) return;
      running = true;
      restoreViewport();
      lastViewport = session.getState().viewports[session.getState().viewId];
      watchers.add(schedule);
      unsubscribe = [() => watchers.delete(schedule), doc.onChange(schedule), session.subscribe(onSession), run.subscribe(schedule)];
      refresh();
    },

    stop() {
      running = false;
      if (savePending) saveViewport();
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      clearTimeout(settleTimer);
      for (const off of unsubscribe) off();
      unsubscribe = [];
      shown = new Map();
    },

    rebuild() {
      engine.rebuild();
      refresh();
    },

    setCursor(px) {
      cursorPx = px;
      schedule();
    },
  };
}
