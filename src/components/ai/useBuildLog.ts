"use client";

import { useEffect } from "react";
import type { LabDockProps } from "@/components/dock/types";
import { attachStore, logRoomLines, sessionLogFor, type SessionLog } from "@/lib/ai/session-log";
import { useRoom } from "@/lib/realtime";

/**
 * Keeps this lab item's Build Story log: bench changes from the store and the
 * room's chat lines, attributed to the learner's room name (or `me`). Safe to
 * call from several components; the store is watched once. LabDock calls it
 * so the log runs whichever tab is open.
 */
export function useBuildLog({ lab, itemId, store }: Pick<LabDockProps, "lab" | "itemId" | "store">, me = ""): SessionLog {
  const log = sessionLogFor(lab, itemId);
  const room = useRoom();
  const self = room?.you.name || me;

  useEffect(() => log.setSelf(self), [log, self]);

  useEffect(() => attachStore(log, lab, itemId, store), [log, lab, itemId, store]);

  useEffect(() => {
    if (!room) return;
    const names = new Map([[room.you.id, room.you.name], ...room.peers.map((peer) => [peer.id, peer.name] as const)]);
    logRoomLines(log, room.messages, (id) => names.get(id) ?? id);
  }, [log, room]);

  return log;
}
