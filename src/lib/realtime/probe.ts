import type { LabKind } from "@/components/dock/types";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import { createTransport } from "./config";
import { newId, PROBE_STATUS, welcomeItem } from "./protocol";

export type ProbeResult =
  | { kind: "found"; lab: LabKind; itemId: string; peers: number }
  | { kind: "empty" }
  | { kind: "full" }
  | { kind: "unknown-item" }
  | { kind: "unavailable" }
  | { kind: "timeout" };

/**
 * Looks up which lab item a room code belongs to, for "join by code" in the
 * lobby: joins for a moment as an invisible peer, reads the welcome, leaves.
 */
export function probeRoom(roomId: string, lang: Locale = DEFAULT_LOCALE, timeoutMs = 6000): Promise<ProbeResult> {
  const transport = createTransport(roomId);
  if (!transport) return Promise.resolve({ kind: "unavailable" });
  return new Promise((resolve) => {
    const finish = (result: ProbeResult) => {
      clearTimeout(timer);
      off();
      transport.close();
      resolve(result);
    };
    const timer = setTimeout(() => finish({ kind: "timeout" }), timeoutMs);
    const off = transport.onMessage((msg) => {
      if (msg.t === "error") return finish({ kind: msg.code === "room_full" || msg.code === "full" ? "full" : "timeout" });
      if (msg.t !== "welcome") return;
      const others = msg.peers.filter((peer) => peer.status !== PROBE_STATUS);
      if (others.length === 0) return finish({ kind: "empty" });
      const { lab, itemId } = welcomeItem(msg);
      if (!lab || !itemId) return finish({ kind: "unknown-item" });
      finish({ kind: "found", lab, itemId, peers: others.length });
    });
    transport.start(() => ({
      t: "join",
      room: roomId,
      peer: { id: newId(), name: "lobby", color: "#857d6e", lang, status: PROBE_STATUS, role: "watcher" },
    }));
  });
}
