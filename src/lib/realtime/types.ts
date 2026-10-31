// The client API of iynk Together (HX-CONTRACT H7.1). Fields marked
// "additive" go beyond H7.1 without changing anything it defines.

import type { Locale } from "@/i18n/config";
import type { ChatKind, Role } from "./protocol";
import type { TransportKind } from "./transport";

export type { Role } from "./protocol";

export type Peer = {
  id: string;
  name: string;
  color: string;
  lang: Locale;
  role?: Role;
  /** True for the one peer holding the code keyboard. */
  baton?: boolean;
  /** Progress keys (D7) for this lab item, so the partner can find a helper. */
  done: string[];
  /** Additive: a short free-text status ("wiring the LED"). */
  status?: string;
};

/** Additive: what a system line is about, so each reader renders it in their own language. */
export type SystemEvent =
  | { event: "join" | "leave" | "host" | "removed"; peer: string; name: string }
  | { event: "baton"; peer: string; name: string; by: string; byName: string }
  | { event: "baton-request"; peer: string; name: string };

export type ChatMsg = {
  id: string;
  from: string;
  text: string;
  lang: Locale;
  kind: ChatKind;
  ts: number;
  translations: Partial<Record<Locale, string>>;
  /** Additive: set on kind 'system'; `text` then holds the English line. */
  system?: SystemEvent;
  /** Additive: true until the relay has echoed our own message. */
  pending?: boolean;
  /** Additive: the sender's name when they sent it (they may have left since). */
  name?: string;
};

/** Additive: where the connection stands, for status lines. */
export type RoomStatus = "connecting" | "syncing" | "live" | "reconnecting" | "ended";

/** Additive: why a room ended. */
export type RoomEnd = "left" | "removed" | "full" | "wrong-item" | "error";

export type CursorPoint = { x: number; y: number };

export type RoomApi = {
  id: string;
  link: string;
  you: Peer;
  /** Everyone else in the room (you are in `you`, not here). */
  peers: Peer[];
  hostId: string;
  connected: boolean;
  transport: TransportKind;
  messages: ChatMsg[];
  chat(text: string, kind?: ChatMsg["kind"], options?: { lang?: Locale }): void;
  setPresence(p: { role?: Role; status?: string; baton?: boolean }): void;
  onPose(cb: (from: string, pose: unknown) => void): () => void;
  sendPose(pose: unknown): void;
  leave(): void;

  // Additive.
  status: RoomStatus;
  ended: RoomEnd | null;
  /** The peer id holding the code keyboard. */
  batonHolder: string;
  passBaton(to: string): void;
  requestBaton(): void;
  rename(name: string): void;
  kick(id: string): void;
  sendCursor(point: CursorPoint | null): void;
  onCursor(cb: (from: string, point: CursorPoint | null) => void): () => void;
  /** Bumped when a local code edit was dropped because someone else holds the keyboard. */
  batonDenied: number;
};
