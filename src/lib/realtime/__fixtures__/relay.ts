// An in-memory relay with the server's rules (H7), for unit tests: total order
// by seq, echo to the sender, the earliest peer hosts, a snapshot request to
// the host on every join. Each connection delivers in order after a latency
// the test chooses, so different clients see the stream at different times.

import type { ClientMsg, ServerMsg, WirePeer } from "../protocol";
import { listeners, type Transport, type TransportStatus } from "../transport";

type Conn = FakeTransport;

type Room = { seq: number; members: Conn[] };

export class FakeRelay {
  readonly rooms = new Map<string, Room>();
  /** Every action frame as stamped, for assertions. */
  readonly stamped: Array<{ room: string; seq: number; from: string; action: { type: string; [key: string]: unknown } }> = [];

  connect(latency: () => number = () => 0): FakeTransport {
    return new FakeTransport(this, latency);
  }

  join(conn: Conn, msg: Extract<ClientMsg, { t: "join" }>) {
    const room = this.rooms.get(msg.room) ?? { seq: 0, members: [] };
    this.rooms.set(msg.room, room);
    room.members = room.members.filter((m) => m.peer?.id !== msg.peer.id);
    conn.peer = msg.peer;
    conn.room = msg.room;
    const others = room.members.slice();
    room.members.push(conn);
    const host = room.members[0];
    conn.deliver({ t: "welcome", you: msg.peer.id, room: { id: msg.room, lab: msg.lab, itemId: msg.itemId }, peers: others.map((m) => m.peer!), host: host.peer!.id, seq: room.seq });
    for (const other of others) other.deliver({ t: "peer", peer: msg.peer });
    if (host !== conn) host.deliver({ t: "snapshot-request", from: msg.peer.id });
  }

  leave(conn: Conn) {
    const room = conn.room ? this.rooms.get(conn.room) : undefined;
    if (!room || !room.members.includes(conn)) return;
    const wasHost = room.members[0] === conn;
    room.members = room.members.filter((m) => m !== conn);
    for (const other of room.members) other.deliver({ t: "leave", id: conn.peer!.id });
    if (wasHost && room.members[0]) for (const other of room.members) other.deliver({ t: "host", id: room.members[0].peer!.id });
  }

  receive(conn: Conn, msg: ClientMsg) {
    const room = conn.room ? this.rooms.get(conn.room) : undefined;
    if (!room || !conn.peer) return;
    const from = conn.peer.id;
    switch (msg.t) {
      case "action": {
        room.seq += 1;
        this.stamped.push({ room: conn.room!, seq: room.seq, from, action: msg.action });
        for (const m of room.members) m.deliver({ t: "action", from, seq: room.seq, action: msg.action });
        return;
      }
      case "state": {
        const to = room.members.find((m) => m.peer?.id === msg.to);
        to?.deliver({ t: "state", from, snapshot: msg.snapshot, seq: msg.seq });
        return;
      }
      case "chat":
        for (const m of room.members) m.deliver({ t: "chat", from, id: msg.id, text: msg.text, lang: msg.lang, kind: msg.kind, ts: 1 });
        return;
      case "presence":
      case "cursor":
      case "pose": {
        const { t, ...rest } = msg;
        for (const m of room.members) if (m !== conn) m.deliver({ t, from, ...rest } as ServerMsg);
        return;
      }
      case "kick": {
        if (room.members[0] !== conn) return;
        const target = room.members.find((m) => m.peer?.id === msg.id);
        if (!target) return;
        target.deliver({ t: "error", code: "removed" });
        this.leave(target);
        return;
      }
      case "ping":
        conn.deliver({ t: "pong" });
        return;
      case "join":
        return;
    }
  }
}

export class FakeTransport implements Transport {
  readonly kind = "ws" as const;
  peer: WirePeer | null = null;
  room: string | null = null;
  sent: ClientMsg[] = [];
  private join: (() => Extract<ClientMsg, { t: "join" }>) | null = null;
  private open = false;
  private closed = false;
  private lastDelivery = 0;
  private readonly messages = listeners<ServerMsg>();
  private readonly statuses = listeners<TransportStatus>();

  constructor(
    private readonly relay: FakeRelay,
    private readonly latency: () => number,
  ) {}

  start(join: () => Extract<ClientMsg, { t: "join" }>) {
    this.join = join;
    this.connect();
  }

  private connect() {
    setTimeout(() => {
      if (this.closed) return;
      this.open = true;
      this.relay.join(this, this.join!());
    }, this.latency());
  }

  /** The network drops: the relay sees a leave, the client reconnects after `afterMs`. */
  drop(afterMs: number) {
    this.open = false;
    this.relay.leave(this);
    this.statuses.emit("reconnecting");
    setTimeout(() => this.connect(), afterMs);
  }

  deliver(msg: ServerMsg) {
    if (!this.open && msg.t !== "welcome") return;
    const at = Math.max(Date.now() + this.latency(), this.lastDelivery);
    this.lastDelivery = at;
    setTimeout(() => {
      if (this.closed) return;
      if (msg.t === "welcome") this.statuses.emit("open");
      this.messages.emit(msg);
    }, at - Date.now());
  }

  send(msg: ClientMsg): boolean {
    if (!this.open || this.closed) return false;
    this.sent.push(msg);
    const json = JSON.parse(JSON.stringify(msg)) as ClientMsg;
    setTimeout(() => {
      if (this.open && !this.closed) this.relay.receive(this, json);
    }, this.latency());
    return true;
  }

  onMessage = (listener: (msg: ServerMsg) => void) => this.messages.add(listener);
  onStatus = (listener: (status: TransportStatus) => void) => this.statuses.add(listener);

  close() {
    if (this.closed) return;
    this.closed = true;
    this.open = false;
    this.relay.leave(this);
  }
}
