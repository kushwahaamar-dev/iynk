import type { Hit, Overlay, Viewport } from "../engine/types.ts";
import { createStore, shallowEqual } from "./select.ts";
import type { Store } from "./select.ts";

export type ToolId = "select" | "place" | "wire";

export type Selectable = { kind: "part" | "wire" | "junction" | "label"; view: string; id: string };

/** `key` is a message key in a Studio namespace; `params` fill its placeholders. */
export type StatusMessage = { key: string; params?: Record<string, string | number> };

export type SessionState = {
  tool: ToolId;
  selection: Selectable[];
  focusNet: string | null;
  hover: Hit | null;
  viewId: string;
  viewports: Record<string, Viewport>;
  armedPart: string | null;
  preview: Overlay[];
  status: StatusMessage | null;
};

export interface SessionActions {
  setTool(tool: ToolId): void;
  setSelection(selection: Selectable[]): void;
  setFocusNet(net: string | null): void;
  setHover(hit: Hit | null): void;
  setView(viewId: string): void;
  setViewport(viewId: string, viewport: Viewport): void;
  armPart(defRef: string | null): void;
  setPreview(preview: Overlay[]): void;
  setStatus(status: StatusMessage | null): void;
  /** Drops selected items that `exists` no longer finds and says how many are left. Returns how many went. */
  pruneSelection(exists: (item: Selectable) => boolean): number;
}

export type SessionStore = Store<SessionState> & SessionActions;

export function createSessionStore(viewId: string): SessionStore {
  const store = createStore<SessionState>({
    tool: "select",
    selection: [],
    focusNet: null,
    hover: null,
    viewId,
    viewports: {},
    armedPart: null,
    preview: [],
    status: null,
  });
  const patch = (changes: Partial<SessionState>) => store.setState((s) => ({ ...s, ...changes }));

  return {
    getState: store.getState,
    subscribe: store.subscribe,
    setTool: (tool) => patch({ tool }),
    setSelection: (selection) => patch({ selection }),
    setFocusNet: (focusNet) => patch({ focusNet }),
    setHover: (hit) => store.setState((s) => (shallowEqual(s.hover, hit) ? s : { ...s, hover: hit })),
    setView: (next) => patch({ viewId: next }),
    setViewport: (id, viewport) => store.setState((s) => ({ ...s, viewports: { ...s.viewports, [id]: viewport } })),
    armPart: (armedPart) => patch({ armedPart }),
    setPreview: (preview) => patch({ preview }),
    setStatus: (status) => patch({ status }),
    pruneSelection(exists) {
      const { selection } = store.getState();
      const kept = selection.filter(exists);
      const removed = selection.length - kept.length;
      if (removed > 0) patch({ selection: kept, status: { key: "selection.pruned", params: { count: kept.length } } });
      return removed;
    },
  };
}
