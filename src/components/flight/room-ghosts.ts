"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRoom } from "@/lib/realtime";
import type { PeerGhost, RangePose } from "./FlightRange";

// Friends in the room fly beside you: each range sends its pose through the room (BroadcastChannel between tabs
// until the relay is approved), and the others draw it as a ghost with the sender's name and colour. The relay
// checks a pose is { p: 3 numbers, q: 4 numbers, gate?: id }: q carries yaw, pitch, roll and a 0, gate the course.

/** A friend's pose this old (ms) means they stopped flying or left. */
const STALE_MS = 2000;
const LIMIT = 1000;

type Seen = { pose: [number, number, number, number, number, number]; course: string; at: number };

function readPose(raw: unknown): Omit<Seen, "at"> | null {
  if (!raw || typeof raw !== "object") return null;
  const { p, q, gate } = raw as { p?: unknown; q?: unknown; gate?: unknown };
  const nums = (v: unknown, n: number): v is number[] =>
    Array.isArray(v) && v.length === n && v.every((x) => typeof x === "number" && Number.isFinite(x) && Math.abs(x) < LIMIT);
  if (!nums(p, 3) || !nums(q, 4) || typeof gate !== "string") return null;
  return { pose: [p[0], p[1], p[2], q[0], q[1], q[2]], course: gate };
}

/** `peers` and `onPose` for the range, or nothing outside a room. */
export function useRoomGhosts(course: string) {
  const room = useRoom();
  const roomRef = useRef(room);
  useEffect(() => {
    roomRef.current = room;
  });
  const seen = useRef(new Map<string, Seen>());
  const roomId = room?.id ?? null;
  useEffect(() => {
    const live = roomRef.current;
    const map = seen.current;
    map.clear();
    if (!live) return;
    return live.onPose((from, raw) => {
      const pose = readPose(raw);
      if (pose) map.set(from, { ...pose, at: performance.now() });
    });
  }, [roomId]);

  const peers = useCallback((): PeerGhost[] => {
    const live = roomRef.current;
    if (!live) return [];
    const now = performance.now();
    const out: PeerGhost[] = [];
    for (const [id, s] of seen.current) {
      const peer = live.peers.find((p) => p.id === id);
      if (!peer || now - s.at > STALE_MS) {
        if (!peer) seen.current.delete(id);
        continue;
      }
      if (s.course !== course) continue;
      const [x, y, z, yaw, pitch, roll] = s.pose;
      out.push({ x, y, z, yaw, pitch, roll, label: peer.name, col: peer.color });
    }
    return out;
  }, [course]);

  const onPose = useCallback((pose: RangePose) => {
    roomRef.current?.sendPose({ p: pose.p, q: [...pose.q, 0], gate: pose.course });
  }, []);

  return room ? { peers, onPose } : { peers: undefined, onPose: undefined };
}
