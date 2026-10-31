"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { EditAccess, RoomStatus } from "@/collab/authority";
import type { Timers } from "@/collab/client";
import type { RoomHandle } from "@/collab/join";
import { PresenceStore } from "@/collab/presence";
import type { Translate } from "@/i18n/translate";
import { registerOverlayProvider } from "@/studio/engine/controller";
import { cursorsProvider } from "@/studio/overlays/cursors";
import type { StudioRooms } from "../ShareDialog";

export type StudioRoomsT = Translate<StudioRooms>;

const WINDOW_TIMERS: Timers = {
  setTimeout: (fn, ms) => window.setTimeout(fn, ms),
  clearTimeout: (handle) => window.clearTimeout(handle as number),
};
const NO_ROOM = (): (() => void) => () => {};
const EDIT: EditAccess = { mode: "edit" };

type Dock = { handle: RoomHandle | null; access: EditAccess };

const DockContext = createContext<Dock>({ handle: null, access: EDIT });

/** Holds the room for the Studio shell: the banner, side panel and toolbar areas read it through the hooks below. */
export function RoomProvider({ handle, access, children }: { handle: RoomHandle | null; access: EditAccess; children: ReactNode }) {
  useEffect(() => {
    if (!handle) return;
    const presence = new PresenceStore(Date.now, WINDOW_TIMERS, () => document.hidden);
    const detach = presence.attach(handle.client);
    const unregister = registerOverlayProvider(cursorsProvider(presence, Date.now), presence.subscribe.bind(presence));
    return () => {
      unregister();
      detach();
    };
  }, [handle]);

  const value = useMemo(() => ({ handle, access }), [handle, access]);
  return <DockContext.Provider value={value}>{children}</DockContext.Provider>;
}

export function useRoomHandle(): RoomHandle | null {
  return useContext(DockContext).handle;
}

export function useRoomStatus(): RoomStatus | null {
  const handle = useRoomHandle();
  const authority = handle?.authority;
  return useSyncExternalStore(
    (fn) => authority?.subscribe(fn) ?? NO_ROOM(),
    () => authority?.getStatus() ?? null,
    () => null,
  );
}

/** Inside a room the authority decides; outside one, the access the provider was given (a share is read only). */
export function useEditAccess(): EditAccess {
  const status = useRoomStatus();
  const { access } = useContext(DockContext);
  return status?.access ?? access;
}
