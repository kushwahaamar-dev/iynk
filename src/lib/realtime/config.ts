import type { LabKind } from "@/components/dock/types";
import { DEFAULT_LOCALE, isLocale, type Locale } from "@/i18n/config";
import { broadcastSupported, createBroadcastTransport } from "./broadcast-transport";
import { isRoomId, newRoomId, normalizeRoomId } from "./protocol";
import type { Transport, TransportKind } from "./transport";
import { createWsTransport } from "./ws-transport";

/** Inlined at build time; unset means "tabs of one browser" over BroadcastChannel. */
const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL ?? "";

export const ROOM_PARAM = "room";

const LAB_PATHS: Record<LabKind, string> = { board: "boards", robotics: "robotics", drone: "drones" };

/** Which transport this deployment uses, or null when neither works in this browser. */
export function transportKind(): TransportKind | null {
  if (REALTIME_URL) return typeof WebSocket === "undefined" ? null : "ws";
  return broadcastSupported() ? "broadcast" : null;
}

export function createTransport(roomId: string): Transport | null {
  const kind = transportKind();
  if (kind === "ws") return createWsTransport(REALTIME_URL);
  if (kind === "broadcast") return createBroadcastTransport(roomId);
  return null;
}

function siteOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/** The language of the current URL ("/es/boards/nano" -> "es"). */
export function currentLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const first = window.location.pathname.split("/")[1];
  return isLocale(first) ? first : DEFAULT_LOCALE;
}

export function labPath(lab: LabKind, itemId: string, locale: Locale): string {
  return `/${locale}/${LAB_PATHS[lab]}/${encodeURIComponent(itemId)}`;
}

export function roomLink(roomId: string, lab: LabKind, itemId: string, locale: Locale = currentLocale()): string {
  const url = new URL(labPath(lab, itemId, locale), siteOrigin());
  url.searchParams.set(ROOM_PARAM, roomId);
  return url.toString();
}

/** H7.1: a link to a fresh room on one lab item. */
export function createRoom(lab: LabKind, itemId: string, locale?: Locale): string {
  return roomLink(newRoomId(), lab, itemId, locale);
}

/** The room id in a pasted link or a typed code, if there is one. */
export function parseRoomInput(input: string): string | null {
  const trimmed = input.trim();
  try {
    const url = new URL(trimmed);
    const fromLink = url.searchParams.get(ROOM_PARAM);
    if (fromLink && isRoomId(normalizeRoomId(fromLink))) return normalizeRoomId(fromLink);
  } catch {
    // Not a link: a typed code.
  }
  const code = normalizeRoomId(trimmed);
  return isRoomId(code) ? code : null;
}
