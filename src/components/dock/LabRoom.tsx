"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { LabKind, LabStore } from "@/components/dock/types";
import { PresenceCursors } from "@/components/realtime";
import { RoomProvider } from "@/lib/realtime";

const RegisterContext = createContext<((store: LabStore) => () => void) | null>(null);

/** LabDock calls this so the page-level room attaches to the workspace store. */
export function useRegisterLabStore(): ((store: LabStore) => () => void) | null {
  return useContext(RegisterContext);
}

const NO_STATE = {};

/**
 * The store the room sees for the page's whole life. The workspace store is
 * created inside the page and registered after mount; if the room were handed
 * that store directly, the swap from a stand-in would make a guest join, leave
 * and join again. So the room gets this one object, and the registered store
 * is routed through it: the room's sync wraps `dispatch` on the object it was
 * given, and the workspace's own `dispatch` calls go through that wrapper.
 */
function stableStore() {
  let target: LabStore | null = null;
  let waiting: { type: string }[] = [];
  const listeners = new Set<() => void>();
  const notify = () => {
    for (const listener of [...listeners]) listener();
  };
  const store: LabStore = {
    getState: () => (target ? target.getState() : NO_STATE),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    // What the room's sync keeps as the "original" dispatch: the registered store's own.
    dispatch(action) {
      if (target) target.dispatch(action);
      else if (waiting.length < 64) waiting.push(action);
    },
  };

  function attach(next: LabStore) {
    const own = next.dispatch;
    const mine: LabStore = { getState: () => next.getState(), subscribe: (l) => next.subscribe(l), dispatch: (action) => own.call(next, action) };
    target = mine;
    next.dispatch = (action) => store.dispatch(action);
    const off = next.subscribe(notify);
    // A room snapshot that arrived before the page's store existed.
    const queued = waiting;
    waiting = [];
    for (const action of queued) mine.dispatch(action);
    notify();
    return () => {
      off();
      next.dispatch = own;
      if (target !== mine) return;
      target = null;
      notify();
    };
  }

  return { store, attach };
}

/**
 * One room for a lab page. The workspace store is created inside the page, so
 * LabDock registers it after mount; the room holds one stable store throughout
 * and joins once.
 */
export function LabRoom({ lab, itemId, children }: { lab: LabKind; itemId: string; children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [{ store, attach }] = useState(stableStore);

  return (
    <RegisterContext.Provider value={attach}>
      <RoomProvider lab={lab} itemId={itemId} store={store}>
        <div ref={rootRef} data-lab-room={lab} data-lab-item={itemId} className="contents">
          {children}
          <FigureCursors rootRef={rootRef} />
        </div>
      </RoomProvider>
    </RegisterContext.Provider>
  );
}

/** Others' pointers sit on the figure. FigureFrame's plate is the positioned box. */
function FigureCursors({ rootRef }: { rootRef: RefObject<HTMLDivElement | null> }) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const pick = () => root.querySelector<HTMLElement>(".figure-frame > .relative");
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const next = pick();
        setHost((current) => (current === next ? current : next));
      });
    };
    schedule();
    const observer = new MutationObserver(schedule);
    observer.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [rootRef]);

  if (!host) return null;
  return createPortal(<PresenceCursors />, host);
}
