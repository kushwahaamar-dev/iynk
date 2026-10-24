// Runs the partner's client tools (H4) against the page: the figure, the lab
// store, the room and the dock. Each run returns the tool result the model
// gets back and the card the panel shows.

import type { LabKind, LabStore } from "@/components/dock/types";
import type { FigureHandle } from "@/components/figure/protocol";
import { applyChange } from "./bench";
import type { DockTab, ProposedChange, ToolCall } from "./tools";

/** hx:dock listens for this on window and switches to `detail.tab`. */
export const DOCK_TAB_EVENT = "simlab:dock-tab";

export function openDockTab(tab: DockTab) {
  window.dispatchEvent(new CustomEvent(DOCK_TAB_EVENT, { detail: { tab } }));
}

export type RoomPeer = { id: string; name: string; done: string[] };

export type ToolRoom = {
  peers: RoomPeer[];
  /** Posts the teach-back request in the room chat. */
  ask(peer: RoomPeer, question: string): void;
};

export type ToolContext = {
  lab: LabKind;
  store: LabStore;
  figure: FigureHandle | null;
  room: ToolRoom | null;
  openTab(tab: DockTab): void;
};

export type ChangeStatus = "pending" | "accepted" | "rejected";

export type ToolCard =
  | { kind: "highlight"; partId: string; note: string; shown: boolean }
  | {
      kind: "change";
      change: ProposedChange;
      before: string;
      after: string;
      actions: Array<{ type: string }>;
      status: ChangeStatus;
    }
  | { kind: "peer"; peer: string; question: string; sent: boolean }
  | { kind: "panel"; tab: DockTab };

export type ToolOutcome = { result: Record<string, unknown>; card: ToolCard | null };

export function runClientTool(call: ToolCall, ctx: ToolContext): ToolOutcome {
  switch (call.name) {
    case "highlight_part": {
      const { partId } = call.args;
      const note = call.args.note ?? "";
      if (!ctx.figure) {
        return { result: { ok: false, error: "the 3D figure is not loaded yet" }, card: { kind: "highlight", partId, note, shown: false } };
      }
      // Both figure engines select (and so outline) a part through `set`; the flash names it.
      ctx.figure.send("set", { state: ctx.lab === "drone" ? { sel: partId } : { select: partId } });
      ctx.figure.send("flash", { text: note || partId, ms: 4000 });
      return { result: { ok: true }, card: { kind: "highlight", partId, note, shown: true } };
    }
    case "propose_change": {
      const applied = applyChange(ctx.lab, ctx.store.getState(), call.args);
      if (!applied.ok) return { result: { ok: false, error: applied.error }, card: null };
      const { before, after, actions } = applied.change;
      return {
        result: {
          ok: true,
          shown: true,
          note: "The learner sees the change and decides; you will hear whether they accepted it.",
        },
        card: { kind: "change", change: call.args, before, after, actions, status: "pending" },
      };
    }
    case "ask_peer": {
      const { peerId, question } = call.args;
      const peer = ctx.room?.peers.find((p) => p.id === peerId || p.name === peerId);
      if (!ctx.room || !peer) {
        return {
          result: { ok: false, error: ctx.room ? `no peer "${peerId}" in the room` : "the learner is not in a room" },
          card: { kind: "peer", peer: peer?.name ?? "", question, sent: false },
        };
      }
      ctx.room.ask(peer, question);
      return { result: { ok: true, sent: true, peer: peer.name }, card: { kind: "peer", peer: peer.name, question, sent: true } };
    }
    case "open_panel":
      ctx.openTab(call.args.tab);
      return { result: { ok: true }, card: { kind: "panel", tab: call.args.tab } };
    case "search_datasheet":
    case "find_parts":
      return { result: { ok: false, error: `${call.name} runs on the server` }, card: null };
  }
}
