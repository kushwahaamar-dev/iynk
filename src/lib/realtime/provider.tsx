"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { LabKind, LabStore } from "@/components/dock/types";
import { useLocale } from "@/i18n/client";
import { useFeatures } from "@/lib/features";
import { progressPrefix, useSaved } from "@/lib/progress";
import { createTransport, ROOM_PARAM, roomLink, transportKind } from "./config";
import { getIdentity, getServerIdentity, subscribeIdentity, type Identity } from "./identity";
import { isRoomId, newId, newRoomId, normalizeRoomId } from "./protocol";
import { RoomClient, type RoomState } from "./room";
import { attachStore } from "./store-sync";
import { translateMessages } from "./translate";
import type { TransportKind } from "./transport";
import type { RoomApi, RoomEnd } from "./types";

// ?room= in the address bar is the only room state that outlives a page: the
// room starts when it appears and ends when it goes. Pages stay static (D14e).

const locationListeners = new Set<() => void>();

function subscribeLocation(listener: () => void) {
  locationListeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    locationListeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

function getRoomParam(): string | null {
  const raw = new URLSearchParams(window.location.search).get(ROOM_PARAM);
  const id = raw ? normalizeRoomId(raw) : "";
  return isRoomId(id) ? id : null;
}

const getServerRoomParam = () => null;

function setRoomParam(id: string | null) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set(ROOM_PARAM, id);
  else url.searchParams.delete(ROOM_PARAM);
  window.history.replaceState(null, "", url);
  for (const listener of [...locationListeners]) listener();
}

export type Together = {
  lab: LabKind;
  itemId: string;
  /** The room in the address bar, joined or not. */
  roomId: string | null;
  identity: Identity | null;
  /** null when this browser has no way to reach a room. */
  transport: TransportKind | null;
  room: RoomApi | null;
  /** Why the last room ended, until you start or join another. */
  ended: RoomEnd | null;
  /** Opens a fresh room on this page, with you as host. */
  start(): void;
  join(id: string): void;
  leave(): void;
};

const TogetherContext = createContext<Together | null>(null);

/** H7.1: null when the page isn't in a room. */
export function useRoom(): RoomApi | null {
  return useContext(TogetherContext)?.room ?? null;
}

/** The name and colour this browser uses in rooms; null until chosen (and on the server). */
export function useIdentity(): Identity | null {
  return useSyncExternalStore(subscribeIdentity, getIdentity, getServerIdentity);
}

/** Everything the Together panel needs, room or not; null outside a RoomProvider. */
export function useTogether(): Together | null {
  return useContext(TogetherContext);
}

function useClientValue<T>(subscribe: (listener: () => void) => () => void, get: () => T, server: () => T): T {
  return useSyncExternalStore(subscribe, get, server);
}

const noopSubscribe = () => () => {};

function toApi(client: RoomClient, state: RoomState): RoomApi {
  return {
    id: state.id,
    link: state.link,
    you: state.you,
    peers: state.peers,
    hostId: state.hostId,
    connected: state.status === "live",
    transport: state.transport,
    messages: state.messages,
    status: state.status,
    ended: state.ended,
    batonHolder: state.batonHolder,
    batonDenied: state.batonDenied,
    chat: (text, kind, options) => client.chat(text, kind, options),
    setPresence: (p) => client.setPresence(p),
    onPose: (cb) => client.onPose(cb),
    sendPose: (pose) => client.sendPose(pose),
    leave: () => client.leave(),
    passBaton: (to) => client.passBaton(to),
    requestBaton: () => client.requestBaton(),
    rename: (name) => client.rename(name),
    kick: (id) => client.kick(id),
    sendCursor: (point) => client.sendCursor(point),
    onCursor: (cb) => client.onCursor(cb),
  };
}

/**
 * H7.1: joins the room named by ?room= and keeps `store` in step with it.
 * Wrap a lab page (figure, controls and LabDock) in one RoomProvider.
 */
export function RoomProvider<S, A extends { type: string }>({
  lab,
  itemId,
  store,
  children,
}: {
  lab: LabKind;
  itemId: string;
  store: LabStore<S, A>;
  children: ReactNode;
}) {
  const locale = useLocale();
  const roomId = useClientValue(subscribeLocation, getRoomParam, getServerRoomParam);
  const identity = useIdentity();
  const kind = useClientValue(noopSubscribe, transportKind, () => null);
  const saved = useSaved();
  const { features } = useFeatures();
  const [client, setClient] = useState<RoomClient | null>(null);
  const [lastEnded, setLastEnded] = useState<RoomEnd | null>(null);

  const prefix = progressPrefix.item(lab, itemId);
  const doneKeys = useMemo(() => Object.keys(saved.done).filter((key) => key.startsWith(prefix)).sort(), [saved, prefix]);
  const doneSignature = doneKeys.join("|");

  // The join reads these when it happens; later changes go out as presence.
  const latest = useRef({ identity, doneKeys });
  useEffect(() => {
    latest.current = { identity, doneKeys };
  });

  // Join the room in the address bar once you have a name.
  const named = identity !== null;
  useEffect(() => {
    const me = latest.current.identity;
    if (!roomId || !me) return;
    const transport = createTransport(roomId);
    if (!transport) return;
    const next = new RoomClient({
      id: roomId,
      link: roomLink(roomId, lab, itemId),
      me: { id: newId(), name: me.name, color: me.color, lang: locale, done: latest.current.doneKeys },
      lab,
      itemId,
      transport,
    });
    const detach = attachStore(store, lab, next);
    // The room ended without us leaving (removed, full, wrong item): drop ?room= so a reload doesn't rejoin.
    const offEnd = next.subscribe(() => {
      const { ended } = next.getState();
      if (!ended || ended === "left") return;
      setLastEnded(ended);
      setRoomParam(null);
    });
    next.start();
    setClient(next);
    return () => {
      offEnd();
      detach();
      next.leave();
      setClient((current) => (current === next ? null : current));
    };
  }, [roomId, named, lab, itemId, store, locale]);

  const name = identity?.name;
  useEffect(() => {
    if (client && name && client.getState().you.name !== name) client.rename(name);
  }, [client, name]);

  useEffect(() => {
    if (client && client.getState().you.done.join("|") !== doneSignature) client.shareDone(doneSignature ? doneSignature.split("|") : []);
  }, [client, doneSignature]);

  const state = useSyncExternalStore(
    client?.subscribe ?? noopSubscribe,
    () => client?.getState() ?? null,
    () => null,
  );


  // Translate every line into this reader's language as it arrives.
  useEffect(() => {
    if (!client || !features.ai) return;
    const controller = new AbortController();
    const run = () => {
      void translateMessages(
        client.getState().messages,
        locale,
        (id, text) => client.setTranslation(id, locale, text),
        (id) => client.failTranslation(id, locale),
        controller.signal,
      );
    };
    run();
    const off = client.subscribe(run);
    return () => {
      off();
      controller.abort();
    };
  }, [client, locale, features.ai]);

  const room = useMemo(() => (client && state ? toApi(client, state) : null), [client, state]);

  const value = useMemo<Together>(
    () => ({
      lab,
      itemId,
      roomId,
      identity,
      transport: kind,
      room,
      ended: lastEnded,
      start: () => {
        setLastEnded(null);
        setRoomParam(newRoomId());
      },
      join: (id) => {
        const clean = normalizeRoomId(id);
        if (!isRoomId(clean)) return;
        setLastEnded(null);
        setRoomParam(clean);
      },
      leave: () => {
        client?.leave();
        setRoomParam(null);
      },
    }),
    [lab, itemId, roomId, identity, kind, room, lastEnded, client],
  );

  return <TogetherContext.Provider value={value}>{children}</TogetherContext.Provider>;
}
