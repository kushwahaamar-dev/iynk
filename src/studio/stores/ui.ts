import { ZOOM_MAX, ZOOM_MIN } from "../engine/constants.ts";
import type { Viewport } from "../engine/types.ts";
import { MAX_BREAKPOINTS_PER_FILE } from "../../sim/debug/breakpoints.ts";
import { VIEW_KINDS } from "../views/registry.ts";
import type { ViewKind } from "../views/registry.ts";
import { createStore } from "./select.ts";
import type { Store } from "./select.ts";

export type UiState = {
  leftRail: "palette" | "files" | "outline";
  rightRail: "inspector" | "problems" | "models" | "history" | "checks" | "partner";
  dock: "code" | "serial" | "faults";
  dockHeightPx: number;
  artMode: "illustrated" | "simple";
  snapMm: number;
  gridOn: boolean;
  singleKeyShortcuts: boolean;
  viewports: Record<string, Viewport>;
  activeView: ViewKind;
  /** Breakpoint lines by source path. They stay on this device and out of the project document. */
  breakpoints: Record<string, number[]>;
};

export type UiStore = Store<UiState> & { set<K extends keyof UiState>(key: K, value: UiState[K]): void };

const MAX_VIEWPORTS = 16;
const SNAP_MIN_MM = 0.1;
const SNAP_MAX_MM = 25.4;
const DOCK_MIN_PX = 80;
const MAX_BREAKPOINT_FILES = 16;

const DEFAULTS: UiState = {
  leftRail: "palette",
  rightRail: "inspector",
  dock: "code",
  dockHeightPx: 240,
  artMode: "illustrated",
  snapMm: 2.54,
  gridOn: true,
  singleKeyShortcuts: true,
  viewports: {},
  activeView: "breadboard",
  breakpoints: {},
};

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T => (options.includes(v as T) ? (v as T) : fallback);

function viewportOf(raw: unknown): Viewport | null {
  if (typeof raw !== "object" || raw === null) return null;
  const { cx_mm, cy_mm, k, w, h, dpr } = raw as Record<string, unknown>;
  if (!finite(cx_mm) || !finite(cy_mm) || !finite(k) || !finite(w) || !finite(h)) return null;
  return { cx_mm, cy_mm, k: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, k)), w, h, dpr: finite(dpr) && dpr > 0 ? dpr : 1 };
}

function viewportsOf(raw: unknown): Record<string, Viewport> {
  const out: Record<string, Viewport> = {};
  if (typeof raw !== "object" || raw === null) return out;
  for (const [id, value] of Object.entries(raw)) {
    if (Object.keys(out).length >= MAX_VIEWPORTS) break;
    const viewport = viewportOf(value);
    if (viewport) out[id] = viewport;
  }
  return out;
}

function breakpointsOf(raw: unknown): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  if (typeof raw !== "object" || raw === null) return out;
  for (const [path, value] of Object.entries(raw)) {
    if (Object.keys(out).length >= MAX_BREAKPOINT_FILES) break;
    if (!Array.isArray(value)) continue;
    const lines = [...new Set(value.filter((n): n is number => Number.isInteger(n) && n >= 1))].sort((a, z) => a - z).slice(0, MAX_BREAKPOINTS_PER_FILE);
    if (lines.length > 0) out[path] = lines;
  }
  return out;
}

/** Keeps the known keys with a valid value and falls back to the default for the rest. */
function normalise(raw: unknown): UiState {
  const r = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    leftRail: oneOf(r.leftRail, ["palette", "files", "outline"], DEFAULTS.leftRail),
    rightRail: oneOf(r.rightRail, ["inspector", "problems", "models", "history", "checks", "partner"], DEFAULTS.rightRail),
    dock: oneOf(r.dock, ["code", "serial", "faults"], DEFAULTS.dock),
    dockHeightPx: finite(r.dockHeightPx) ? Math.max(DOCK_MIN_PX, r.dockHeightPx) : DEFAULTS.dockHeightPx,
    artMode: oneOf(r.artMode, ["illustrated", "simple"], DEFAULTS.artMode),
    snapMm: finite(r.snapMm) ? Math.min(SNAP_MAX_MM, Math.max(SNAP_MIN_MM, r.snapMm)) : DEFAULTS.snapMm,
    gridOn: typeof r.gridOn === "boolean" ? r.gridOn : DEFAULTS.gridOn,
    singleKeyShortcuts: typeof r.singleKeyShortcuts === "boolean" ? r.singleKeyShortcuts : DEFAULTS.singleKeyShortcuts,
    viewports: viewportsOf(r.viewports),
    activeView: oneOf(r.activeView, VIEW_KINDS, DEFAULTS.activeView),
    breakpoints: breakpointsOf(r.breakpoints),
  };
}

function browserStorage(): Pick<Storage, "getItem" | "setItem"> | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function createUiStore(projectId: string, storage: Pick<Storage, "getItem" | "setItem"> | undefined = browserStorage()): UiStore {
  const key = `iynk:studio:ui:${projectId}`;
  let initial = DEFAULTS;
  try {
    const text = storage?.getItem(key);
    if (text) initial = normalise(JSON.parse(text));
  } catch {
    initial = DEFAULTS;
  }
  const store = createStore(initial);

  return {
    getState: store.getState,
    subscribe: store.subscribe,
    set(name, value) {
      const next = normalise({ ...store.getState(), [name]: value });
      store.setState(next);
      try {
        storage?.setItem(key, JSON.stringify(next));
      } catch {
        // Private windows and full quotas refuse writes; the layout just does not persist.
      }
    },
  };
}
