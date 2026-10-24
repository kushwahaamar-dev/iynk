"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { LabKind, LabStore } from "@/components/dock/types";
import { PresenceCursors } from "@/components/realtime";
import { RoomProvider } from "@/lib/realtime";

const RegisterContext = createContext<((store: LabStore) => () => void) | null>(null);

/** LabDock calls this so the page-level room attaches to the workspace store. */
export function useRegisterLabStore(): ((store: LabStore) => () => void) | null {
  return useContext(RegisterContext);
}

function idleStore(): LabStore {
  return {
    getState: () => ({}),
    subscribe: () => () => {},
    dispatch: () => {},
  };
}

/**
 * One room for a lab page. The workspace store is created inside the page, so
 * LabDock registers it after mount; until then the provider holds a stand-in
 * that is never joined.
 */
export function LabRoom({ lab, itemId, children }: { lab: LabKind; itemId: string; children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [idle] = useState(idleStore);
  const [registered, setRegistered] = useState<LabStore | null>(null);
  const register = useCallback((next: LabStore) => {
    setRegistered(() => next);
    return () => setRegistered((current) => (current === next ? null : current));
  }, []);

  return (
    <RegisterContext.Provider value={register}>
      <RoomProvider lab={lab} itemId={itemId} store={registered ?? idle}>
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
