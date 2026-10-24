// The relay's wire protocol (HX-CONTRACT H7). Both transports speak it: the
// WebSocket one talks to server/realtime, the BroadcastChannel one plays the
// relay itself between tabs of one browser.

import type { Locale } from "@/i18n/config";
import type { LabKind } from "@/components/dock/types";

export type Role = "wirer" | "coder" | "pilot" | "watcher";
export const ROLES: readonly Role[] = ["wirer", "coder", "pilot", "watcher"];

export type ChatKind = "text" | "voice" | "ai" | "system";

export type Action = { type: string; [key: string]: unknown };

/** A peer as it travels in join and peer frames. */
export type WirePeer = {
  id: string;
  name: string;
  color: string;
  lang: Locale;
  role?: Role;
  status?: string;
  baton?: boolean;
  done?: string[];
};

export type PresenceFields = {
  role?: Role;
  status?: string;
  baton?: boolean;
  /** Additive to H7: lets a peer rename itself and share progress without rejoining. */
  name?: string;
  done?: string[];
};

export type ClientMsg =
  /** `since` (additive): the last seq this peer applied, so a resuming peer can be replayed instead of re-snapshotted. */
  | { t: "join"; room: string; peer: WirePeer; lab?: LabKind; itemId?: string; since?: number; epoch?: string }
  | { t: "action"; action: Action }
  | { t: "state"; to: string; snapshot: unknown; seq: number }
  | { t: "chat"; id: string; text: string; lang: Locale; kind: ChatKind }
  | { t: "cursor"; x: number; y: number }
  | ({ t: "presence" } & PresenceFields)
  | { t: "pose"; p: number[]; q: number[]; v?: unknown; gate?: unknown }
  | { t: "kick"; id: string }
  | { t: "ping" };

/** `room` is the id, or an object that also names the room's lab item. */
export type WelcomeRoom = string | { id: string; lab?: LabKind; itemId?: string };

export type ServerMsg =
  | {
      t: "welcome";
      you: string;
      room: WelcomeRoom;
      peers: WirePeer[];
      host: string;
      seq: number;
      lab?: LabKind | null;
      itemId?: string | null;
      /** The relay's room history id; a resume only replays within one epoch. */
      epoch?: string;
      /** What follows (docs/hacktx/REALTIME.md): nothing, the host's snapshot, or a replay since `since`. */
      sync?: "none" | "snapshot" | "replay";
    }
  | { t: "peer"; peer: WirePeer }
  | { t: "leave"; id: string }
  | { t: "host"; id: string }
  | { t: "action"; from: string; seq: number; action: Action }
  | { t: "snapshot-request"; from: string }
  | { t: "state"; from: string; snapshot: unknown; seq: number }
  | { t: "chat"; from: string; id: string; text: string; lang: Locale; kind: ChatKind; ts: number; name?: string }
  | { t: "cursor"; from: string; x: number; y: number }
  | ({ t: "presence"; from: string } & PresenceFields)
  | { t: "pose"; from: string; p: number[]; q: number[]; v?: unknown; gate?: unknown }
  | { t: "pong" }
  | { t: "error"; code: string; message?: string };

export const ROOM_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";
export const ROOM_ID_LENGTH = 6;
export const MAX_PEERS = 8;
export const MAX_FRAME_BYTES = 64 * 1024;
export const MAX_SNAPSHOT_BYTES = 512 * 1024;
export const MAX_NAME_LENGTH = 24;
export const MAX_CHAT_LENGTH = 500;
export const HEARTBEAT_MS = 15_000;
export const PEER_TIMEOUT_MS = 45_000;
/** Cursor and pose frames are capped at 20 Hz. */
export const STREAM_INTERVAL_MS = 50;

/** Peers with this status are lobby lookups: rooms neither list them nor send them state. */
export const PROBE_STATUS = "lobby";

const ROOM_ID = new RegExp(`^[${ROOM_ALPHABET}]{${ROOM_ID_LENGTH}}$`);

export function isRoomId(value: unknown): value is string {
  return typeof value === "string" && ROOM_ID.test(value);
}

/** Lower-cases and strips what people type around a code ("ABC 23x", "abc-23x"). */
export function normalizeRoomId(input: string): string {
  return input.toLowerCase().replace(/[^0-9a-z]/g, "");
}

function randomFrom(alphabet: string, length: number): string {
  // Rejection sampling keeps every character equally likely.
  const limit = 256 - (256 % alphabet.length);
  let out = "";
  while (out.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length * 2));
    for (const byte of bytes) {
      if (byte < limit && out.length < length) out += alphabet[byte % alphabet.length];
    }
  }
  return out;
}

export function newRoomId(): string {
  return randomFrom(ROOM_ALPHABET, ROOM_ID_LENGTH);
}

export function newId(length = 12): string {
  return randomFrom("0123456789abcdefghijklmnopqrstuvwxyz", length);
}

/** The welcome's room may be a bare id or an object naming the lab item. */
export function welcomeItem(msg: Extract<ServerMsg, { t: "welcome" }>): { lab?: LabKind; itemId?: string } {
  const room = typeof msg.room === "object" && msg.room !== null ? msg.room : null;
  return { lab: room?.lab ?? msg.lab ?? undefined, itemId: room?.itemId ?? msg.itemId ?? undefined };
}

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

const SERVER_TYPES = new Set([
  "welcome",
  "peer",
  "leave",
  "host",
  "action",
  "snapshot-request",
  "state",
  "chat",
  "cursor",
  "presence",
  "pose",
  "pong",
  "error",
]);

/** Parses one text frame from the relay; anything that isn't a known message is dropped. */
export function parseServerMsg(data: unknown): ServerMsg | null {
  if (typeof data !== "string") return null;
  let msg: unknown;
  try {
    msg = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof msg !== "object" || msg === null) return null;
  const t = (msg as { t?: unknown }).t;
  if (typeof t !== "string" || !SERVER_TYPES.has(t)) return null;
  if (t === "action") {
    const { seq, action } = msg as { seq?: unknown; action?: unknown };
    if (typeof seq !== "number" || typeof action !== "object" || action === null) return null;
    if (typeof (action as { type?: unknown }).type !== "string") return null;
  }
  return msg as ServerMsg;
}
