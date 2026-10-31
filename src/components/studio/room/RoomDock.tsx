"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { EditAccess, RoomStatus } from "@/collab/authority";
import type { Timers } from "@/collab/client";
import { ChatStore } from "@/collab/chat";
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

type Dock = { handle: RoomHandle | null; access: EditAccess; presence: PresenceStore | null; chat: ChatStore | null };

const DockContext = createContext<Dock>({ handle: null, access: EDIT, presence: null, chat: null });

/** Holds the room for the Studio shell: the banner, side panel and toolbar areas read it through the hooks below. */
export function RoomProvider({ handle, access, children }: { handle: RoomHandle | null; access: EditAccess; children: ReactNode }) {
  const stores = useMemo(
    () =>
      handle && {
        presence: new PresenceStore(Date.now, WINDOW_TIMERS, () => document.hidden),
        chat: new ChatStore(Date.now, Math.random),
      },
    [handle],
  );

  useEffect(() => {
    if (!handle || !stores) return;
    const { presence, chat } = stores;
    const detach = presence.attach(handle.client);
    const detachChat = chat.attach(handle.client, presence);
    const unregister = registerOverlayProvider(cursorsProvider(presence, Date.now), presence.subscribe.bind(presence));
    return () => {
      unregister();
      detachChat();
      detach();
    };
  }, [handle, stores]);

  const value = useMemo(
    () => ({ handle, access, presence: stores?.presence ?? null, chat: stores?.chat ?? null }),
    [handle, access, stores],
  );
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

export function usePresence(): PresenceStore | null {
  return useContext(DockContext).presence;
}

export function useChatStore(): ChatStore | null {
  return useContext(DockContext).chat;
}
