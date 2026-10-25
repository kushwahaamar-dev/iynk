import type { LabKind } from "@/components/dock/types";
import { byteLength, MAX_PEERS, MAX_SNAPSHOT_BYTES, type ClientMsg, type ServerMsg, type WirePeer } from "./protocol";
import { listeners, type Transport, type TransportStatus } from "./transport";

// Without a relay URL, tabs of one browser share a room over BroadcastChannel.
// Every tab runs this small relay; the earliest tab in the room is the host
// and stamps the seq numbers, so the client above sees exactly the server's
// messages and ordering rules.

type Item = { lab?: LabKind; itemId?: string };

type Frame =
  | ({ k: "hello"; peer: WirePeer; since: number } & Item)
  | ({ k: "here"; peer: WirePeer; since: number; seq: number } & Item)
  | { k: "bye"; id: string }
  | { k: "up"; from: string; msg: ClientMsg }
  | { k: "down"; to?: string; msg: ServerMsg };

type Member = { peer: WirePeer; since: number; seen: number } & Item;

type BroadcastOptions = {
  ChannelImpl?: typeof BroadcastChannel;
  /** How long a new tab listens for the others before it decides who hosts. */
  settleMs?: number;
  heartbeatMs?: number;
  /** Long enough to ride out background-tab timer throttling (one tick a minute). */
  timeoutMs?: number;
  now?: () => number;
};

export function broadcastSupported(): boolean {
  return typeof BroadcastChannel !== "undefined";
}

export function createBroadcastTransport(roomId: string, options: BroadcastOptions = {}): Transport {
  const Impl = options.ChannelImpl ?? BroadcastChannel;
  const settleMs = options.settleMs ?? 150;
  const heartbeatMs = options.heartbeatMs ?? 5_000;
  const timeoutMs = options.timeoutMs ?? 70_000;
  const now = options.now ?? Date.now;

  const messages = listeners<ServerMsg>();
  const statuses = listeners<TransportStatus>();
  const members = new Map<string, Member>();

  let channel: BroadcastChannel | null = null;
  let me: Member | null = null;
  let item: Item = {};
  let seq = 0;
  let welcomed = false;
  let host = "";
  let closed = false;
  const early: ServerMsg[] = [];
  const waitingSnapshots: string[] = [];
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  let settle: ReturnType<typeof setTimeout> | undefined;

  const post = (frame: Frame) => channel?.postMessage(frame);

  const deliver = (msg: ServerMsg) => {
    if (welcomed) messages.emit(msg);
    else early.push(msg);
  };

  const pickHost = (): string => {
    let best: Member | null = null;
    for (const member of members.values()) {
      if (!best || member.since < best.since || (member.since === best.since && member.peer.id < best.peer.id)) best = member;
    }
    return best?.peer.id ?? "";
  };

  const iAmHost = () => me !== null && host === me.peer.id;

  const updateHost = () => {
    const next = pickHost();
    if (next === host) return;
    host = next;
    if (welcomed) messages.emit({ t: "host", id: next });
  };

  const others = () => [...members.values()].filter((member) => member !== me).map((member) => member.peer);

  const hereFrame = (): Frame => ({ k: "here", peer: me!.peer, since: me!.since, seq, ...item });

  const sequence = (from: string, action: Extract<ClientMsg, { t: "action" }>["action"]) => {
    seq += 1;
    const out: ServerMsg = { t: "action", from, seq, action };
    post({ k: "down", msg: out });
    deliver(out);
  };

  const remove = (id: string) => {
    if (!members.delete(id)) return;
    if (welcomed) messages.emit({ t: "leave", id });
    updateHost();
  };

  const onFrame = (frame: Frame) => {
    if (closed || !me) return;
    switch (frame.k) {
      case "hello":
      case "here": {
        if (frame.peer.id === me.peer.id) return;
        const known = members.has(frame.peer.id);
        if (!known && members.size >= MAX_PEERS) return;
        members.set(frame.peer.id, { peer: frame.peer, since: frame.since, seen: now(), lab: frame.lab, itemId: frame.itemId });
        if (frame.k === "here") seq = Math.max(seq, frame.seq);
        if (!known && welcomed) messages.emit({ t: "peer", peer: frame.peer });
        updateHost();
        if (frame.k === "hello") {
          post(hereFrame());
          if (iAmHost() && welcomed) messages.emit({ t: "snapshot-request", from: frame.peer.id });
          else if (!welcomed) waitingSnapshots.push(frame.peer.id);
        }
        return;
      }
      case "bye":
        remove(frame.id);
        return;
      case "up":
        if (!iAmHost()) return;
        if (frame.msg.t === "action") sequence(frame.from, frame.msg.action);
        return;
      case "down":
        if (frame.to && frame.to !== me.peer.id) return;
        if (frame.msg.t === "action") seq = Math.max(seq, frame.msg.seq);
        if (frame.msg.t === "presence") {
          const member = members.get(frame.msg.from);
          if (member) {
            const { t: _t, from: _from, ...fields } = frame.msg;
            member.peer = { ...member.peer, ...fields };
          }
        }
        deliver(frame.msg);
        return;
    }
  };

  const prune = () => {
    const cutoff = now() - timeoutMs;
    for (const [id, member] of members) {
      if (member !== me && member.seen < cutoff) remove(id);
    }
  };

  const onPageHide = () => post({ k: "bye", id: me?.peer.id ?? "" });
  const onVisible = () => {
    if (document.visibilityState === "visible" && me) post(hereFrame());
  };

  return {
    kind: "broadcast",
    start(makeJoin) {
      const join = makeJoin();
      item = { lab: join.lab, itemId: join.itemId };
      channel = new Impl(`iynk-room-${roomId}`);
      channel.onmessage = (event: MessageEvent<Frame>) => onFrame(event.data);
      me = { peer: join.peer, since: now(), seen: now(), ...item };
      members.set(join.peer.id, me);
      post({ k: "hello", peer: join.peer, since: me.since, ...item });
      settle = setTimeout(() => {
        if (closed || !me) return;
        if (members.size > MAX_PEERS) {
          messages.emit({ t: "error", code: "room_full" });
          return;
        }
        host = pickHost();
        welcomed = true;
        const hostMember = members.get(host);
        statuses.emit("open");
        messages.emit({
          t: "welcome",
          you: me.peer.id,
          room: { id: roomId, lab: hostMember?.lab, itemId: hostMember?.itemId },
          peers: others(),
          host,
          seq,
        });
        for (const msg of early.splice(0)) messages.emit(msg);
        if (iAmHost()) {
          for (const id of waitingSnapshots.splice(0)) if (members.has(id)) messages.emit({ t: "snapshot-request", from: id });
        }
      }, settleMs);
      heartbeat = setInterval(() => {
        post(hereFrame());
        prune();
      }, heartbeatMs);
      if (typeof window !== "undefined") {
        window.addEventListener("pagehide", onPageHide);
        document.addEventListener("visibilitychange", onVisible);
      }
    },
    send(msg) {
      if (closed || !me || !welcomed) return false;
      const from = me.peer.id;
      switch (msg.t) {
        case "action":
          if (iAmHost()) sequence(from, msg.action);
          else post({ k: "up", from, msg });
          return true;
        case "state":
          if (byteLength(JSON.stringify(msg.snapshot)) > MAX_SNAPSHOT_BYTES) return false;
          post({ k: "down", to: msg.to, msg: { t: "state", from, snapshot: msg.snapshot, seq: msg.seq } });
          return true;
        case "chat": {
          const out: ServerMsg = { t: "chat", from, id: msg.id, text: msg.text, lang: msg.lang, kind: msg.kind, ts: now() };
          post({ k: "down", msg: out });
          deliver(out);
          return true;
        }
        case "presence": {
          const { t: _t, ...fields } = msg;
          me.peer = { ...me.peer, ...fields };
          post({ k: "down", msg: { t: "presence", from, ...fields } });
          return true;
        }
        case "cursor":
          post({ k: "down", msg: { t: "cursor", from, x: msg.x, y: msg.y } });
          return true;
        case "pose":
          post({ k: "down", msg: { ...msg, from } });
          return true;
        case "kick":
          if (!iAmHost()) return false;
          post({ k: "down", to: msg.id, msg: { t: "error", code: "removed" } });
          return true;
        case "ping":
          deliver({ t: "pong" });
          return true;
        case "join":
          return false;
      }
    },
    onMessage: messages.add,
    onStatus: statuses.add,
    close() {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      clearTimeout(settle);
      if (me) post({ k: "bye", id: me.peer.id });
      if (typeof window !== "undefined") {
        window.removeEventListener("pagehide", onPageHide);
        document.removeEventListener("visibilitychange", onVisible);
      }
      channel?.close();
      channel = null;
      statuses.emit("closed");
      messages.clear();
      statuses.clear();
    },
  };
}
