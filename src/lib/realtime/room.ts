import type { Locale } from "@/i18n/config";
import type { LabKind } from "@/components/dock/types";
import {
  MAX_CHAT_LENGTH,
  MAX_NAME_LENGTH,
  newId,
  PROBE_STATUS,
  STREAM_INTERVAL_MS,
  type Action,
  type ChatKind,
  type ClientMsg,
  type PresenceFields,
  type Role,
  type ServerMsg,
  type WirePeer,
} from "./protocol";
import type { Transport, TransportKind } from "./transport";
import type { ChatMsg, CursorPoint, Peer, RoomEnd, RoomStatus, SystemEvent } from "./types";

/** How the room reads and writes the lab store; see store-sync.ts. */
export type SyncTarget = {
  snapshot(): unknown;
  hydrate(state: unknown): void;
  /** One shared action, in seq order; `from` is the peer that sent it. */
  apply(action: Action, from: string): void;
};

export type RoomSnapshot = { v: 1; lab?: LabKind; itemId?: string; state: unknown; baton: string | null };

export type RoomState = {
  id: string;
  link: string;
  transport: TransportKind;
  status: RoomStatus;
  ended: RoomEnd | null;
  you: Peer;
  peers: Peer[];
  hostId: string;
  baton: string | null;
  batonHolder: string;
  batonDenied: number;
  messages: ChatMsg[];
  seq: number;
};

export type RoomClientOptions = {
  id: string;
  link: string;
  me: WirePeer & { done: string[] };
  lab?: LabKind;
  itemId?: string;
  transport: Transport;
  /** Give up waiting for the host's snapshot after this long and go live with what we have. */
  snapshotTimeoutMs?: number;
  now?: () => number;
};

const MAX_MESSAGES = 200;

/** Relay errors that end the session (docs/hacktx/REALTIME.md). */
const END_CODES: Record<string, RoomEnd> = {
  removed: "removed",
  kicked: "removed",
  room_full: "full",
  full: "full",
  wrong_item: "wrong-item",
  server_full: "error",
};
/** The relay allows 60 frames a second per peer; stay well under it. */
const FRAMES_PER_SECOND = 40;
const OUTBOX_LIMIT = 500;

const toPeer = (wire: WirePeer): Peer => ({
  id: wire.id,
  name: wire.name.slice(0, MAX_NAME_LENGTH),
  color: wire.color,
  lang: wire.lang,
  role: wire.role,
  status: wire.status,
  done: Array.isArray(wire.done) ? wire.done : [],
});

const englishSystem: Record<SystemEvent["event"], (e: SystemEvent) => string> = {
  join: (e) => `${e.name} joined`,
  leave: (e) => `${e.name} left`,
  host: (e) => `${e.name} is now the host`,
  removed: (e) => `${e.name} was removed by the host`,
  baton: (e) => `${"byName" in e ? e.byName : ""} passed the keyboard to ${e.name}`,
  "baton-request": (e) => `${e.name} asked for the keyboard`,
};

/**
 * One peer's view of one room: who is here, the chat, and the ordered stream
 * of shared actions. Every shared action, our own included, reaches the store
 * only when the relay hands it back with the next seq (H7 consistency).
 */
export class RoomClient {
  private state: RoomState;
  private readonly listeners = new Set<() => void>();
  private readonly poseListeners = new Set<(from: string, pose: unknown) => void>();
  private readonly cursorListeners = new Set<(from: string, point: CursorPoint | null) => void>();
  private readonly pending = new Map<number, { from: string; action: Action }>();
  private readonly outbox: ClientMsg[] = [];
  private readonly lastStream = new Map<string, number>();
  private readonly now: () => number;
  private target: SyncTarget | null = null;
  private synced = false;
  private applied = 0;
  private tokens = FRAMES_PER_SECOND;
  private refilledAt = 0;
  private pump: ReturnType<typeof setTimeout> | undefined;
  private snapshotWait: ReturnType<typeof setTimeout> | undefined;
  private unsubscribers: Array<() => void> = [];
  private presence: PresenceFields = {};
  private epoch: string | undefined;
  private readonly passHooks = new Set<() => void>();
  private readonly kicked = new Set<string>();
  private readonly probes = new Set<string>();

  constructor(private readonly options: RoomClientOptions) {
    this.now = options.now ?? Date.now;
    const you = { ...toPeer(options.me), done: options.me.done };
    this.state = {
      id: options.id,
      link: options.link,
      transport: options.transport.kind,
      status: "connecting",
      ended: null,
      you,
      peers: [],
      hostId: "",
      baton: null,
      batonHolder: "",
      batonDenied: 0,
      messages: [],
      seq: 0,
    };
  }

  getState = (): RoomState => this.state;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** The store the shared actions land in. Set it before start(). */
  bind(target: SyncTarget | null) {
    this.target = target;
  }

  start() {
    const { transport } = this.options;
    this.unsubscribers.push(
      transport.onMessage((msg) => this.receive(msg)),
      transport.onStatus((status) => {
        if (status === "reconnecting" && this.state.status !== "ended") {
          this.synced = false;
          this.set({ status: "reconnecting" });
        }
      }),
    );
    transport.start(() => ({
      t: "join",
      room: this.options.id,
      peer: this.wirePeer(),
      lab: this.options.lab,
      itemId: this.options.itemId,
      since: this.applied,
      ...(this.epoch ? { epoch: this.epoch } : {}),
    }));
  }

  isLive(): boolean {
    return this.state.status === "live";
  }

  holdsBaton(): boolean {
    return this.state.batonHolder === this.state.you.id;
  }

  /** A shared action from this tab: it goes to the relay and comes back in order. */
  sendAction(action: Action) {
    this.enqueue({ t: "action", action });
  }

  denyBaton() {
    this.set({ batonDenied: this.state.batonDenied + 1 });
  }

  chat(text: string, kind: ChatKind = "text", options: { lang?: Locale } = {}) {
    const clean = text.trim().slice(0, MAX_CHAT_LENGTH);
    if (!clean || this.state.ended) return;
    const lang = options.lang ?? this.state.you.lang;
    const id = newId();
    this.addMessage({ id, from: this.state.you.id, text: clean, lang, kind, ts: this.now(), translations: {}, pending: true });
    this.enqueue({ t: "chat", id, text: clean, lang, kind });
  }

  setPresence(fields: { role?: Role; status?: string; baton?: boolean }) {
    const { baton, ...rest } = fields;
    if (baton === true && !this.holdsBaton()) {
      if (this.canTakeBaton()) this.passBaton(this.state.you.id);
      else this.requestBaton();
    } else if (baton === false && this.holdsBaton()) {
      this.passBaton(null);
    }
    if (Object.keys(rest).length === 0) return;
    this.updatePresence(rest);
  }

  rename(name: string) {
    const clean = name.trim().slice(0, MAX_NAME_LENGTH);
    if (!clean) return;
    this.updatePresence({ name: clean });
  }

  shareDone(done: string[]) {
    this.updatePresence({ done });
  }

  passBaton(to: string | null) {
    if (!this.holdsBaton() && !this.canTakeBaton()) return;
    // Pending code goes out first, so it lands while we still hold the keyboard.
    for (const hook of [...this.passHooks]) hook();
    this.sendAction({ type: "room/baton", to });
  }

  /** Runs right before this tab passes the keyboard on. */
  beforeBatonPass(hook: () => void): () => void {
    this.passHooks.add(hook);
    return () => {
      this.passHooks.delete(hook);
    };
  }

  requestBaton() {
    this.sendAction({ type: "room/baton-request" });
  }

  kick(id: string) {
    if (this.state.hostId !== this.state.you.id || id === this.state.you.id) return;
    const peer = this.state.peers.find((p) => p.id === id);
    if (!peer) return;
    this.kicked.add(id);
    this.enqueue({ t: "kick", id });
    this.system({ event: "removed", peer: id, name: peer.name });
  }

  sendCursor(point: CursorPoint | null) {
    if (!this.stream("cursor", point === null)) return;
    const msg: ClientMsg = point
      ? { t: "cursor", x: clamp01(point.x), y: clamp01(point.y) }
      : { t: "cursor", x: -1, y: -1 };
    this.trySend(msg);
  }

  onCursor(listener: (from: string, point: CursorPoint | null) => void) {
    this.cursorListeners.add(listener);
    return () => {
      this.cursorListeners.delete(listener);
    };
  }

  sendPose(pose: unknown) {
    if (!pose || typeof pose !== "object" || !this.stream("pose")) return;
    this.trySend({ t: "pose", ...(pose as { p: number[]; q: number[] }) });
  }

  onPose(listener: (from: string, pose: unknown) => void) {
    this.poseListeners.add(listener);
    return () => {
      this.poseListeners.delete(listener);
    };
  }

  leave(reason: RoomEnd = "left") {
    if (this.state.ended) return;
    clearTimeout(this.pump);
    clearTimeout(this.snapshotWait);
    for (const off of this.unsubscribers.splice(0)) off();
    this.options.transport.close();
    this.set({ status: "ended", ended: reason });
  }

  // ---------------------------------------------------------------------------

  private canTakeBaton(): boolean {
    const { baton, hostId, you } = this.state;
    const holderHere = baton !== null && (baton === you.id || this.state.peers.some((peer) => peer.id === baton));
    return hostId === you.id || !holderHere;
  }

  private updatePresence(fields: PresenceFields) {
    this.presence = { ...this.presence, ...fields };
    const you = { ...this.state.you, ...fields, done: fields.done ?? this.state.you.done };
    this.set({ you: this.withBaton(you) });
    this.enqueue({ t: "presence", ...fields });
  }

  private wirePeer(): WirePeer {
    const { you } = this.state;
    return { id: you.id, name: you.name, color: you.color, lang: you.lang, role: you.role, status: you.status, done: you.done };
  }

  private set(patch: Partial<RoomState>) {
    const next = { ...this.state, ...patch };
    if ("baton" in patch || "peers" in patch || "hostId" in patch || "you" in patch) {
      const holder = this.effectiveHolder(next);
      next.batonHolder = holder;
      next.you = { ...next.you, baton: holder === next.you.id };
      next.peers = next.peers.map((peer) => (peer.baton === (holder === peer.id) ? peer : { ...peer, baton: holder === peer.id }));
    }
    this.state = next;
    for (const listener of [...this.listeners]) listener();
  }

  private withBaton(peer: Peer): Peer {
    return { ...peer, baton: this.state.batonHolder === peer.id };
  }

  private effectiveHolder(state: RoomState): string {
    const present = state.baton !== null && (state.baton === state.you.id || state.peers.some((peer) => peer.id === state.baton));
    return present ? state.baton! : state.hostId;
  }

  private nameOf(id: string): string {
    if (id === this.state.you.id) return this.state.you.name;
    return this.state.peers.find((peer) => peer.id === id)?.name ?? "";
  }

  private system(event: SystemEvent) {
    this.addMessage({
      id: newId(),
      from: "",
      text: englishSystem[event.event](event),
      lang: "en",
      kind: "system",
      ts: this.now(),
      translations: {},
      system: event,
    });
  }

  private addMessage(msg: ChatMsg) {
    const messages = [...this.state.messages, msg];
    if (messages.length > MAX_MESSAGES) messages.splice(0, messages.length - MAX_MESSAGES);
    this.set({ messages });
  }

  private stream(kind: "cursor" | "pose", force = false): boolean {
    if (!this.isLive()) return false;
    const t = this.now();
    if (!force && t - (this.lastStream.get(kind) ?? 0) < STREAM_INTERVAL_MS) return false;
    this.lastStream.set(kind, t);
    return true;
  }

  private refill() {
    const t = this.now();
    this.tokens = Math.min(FRAMES_PER_SECOND, this.tokens + ((t - this.refilledAt) / 1000) * FRAMES_PER_SECOND);
    this.refilledAt = t;
  }

  /** Droppable frames (cursor, pose): sent now or not at all. */
  private trySend(msg: ClientMsg) {
    this.refill();
    if (this.tokens < 1) return;
    if (this.options.transport.send(msg)) this.tokens -= 1;
  }

  /** Frames that must arrive (actions, chat, presence): queued until the room is live. */
  private enqueue(msg: ClientMsg) {
    if (this.state.ended) return;
    if (this.outbox.length >= OUTBOX_LIMIT) this.outbox.shift();
    this.outbox.push(msg);
    this.flush();
  }

  private flush() {
    clearTimeout(this.pump);
    this.pump = undefined;
    // The relay refuses actions from a peer still waiting for its snapshot.
    if (this.state.status !== "live") return;
    this.refill();
    while (this.outbox.length > 0 && this.tokens >= 1) {
      const msg = this.outbox[0];
      if (!this.options.transport.send(msg)) return;
      this.outbox.shift();
      this.tokens -= 1;
      // Not every relay echoes chat to its sender, so "sent" means handed to the socket.
      if (msg.t === "chat") this.markSent(msg.id);
    }
    if (this.outbox.length > 0) this.pump = setTimeout(() => this.flush(), 1000 / FRAMES_PER_SECOND);
  }

  private markSent(id: string) {
    if (!this.state.messages.some((m) => m.id === id && m.pending)) return;
    this.set({ messages: this.state.messages.map((m) => (m.id === id ? { ...m, pending: false } : m)) });
  }

  private receive(msg: ServerMsg) {
    if (this.state.ended) return;
    switch (msg.t) {
      case "welcome":
        return this.onWelcome(msg);
      case "peer": {
        if (msg.peer.id === this.state.you.id) return;
        if (msg.peer.status === PROBE_STATUS) {
          this.probes.add(msg.peer.id);
          return;
        }
        const known = this.state.peers.some((peer) => peer.id === msg.peer.id);
        const peers = known
          ? this.state.peers.map((peer) => (peer.id === msg.peer.id ? toPeer(msg.peer) : peer))
          : [...this.state.peers, toPeer(msg.peer)];
        this.set({ peers });
        if (!known) this.system({ event: "join", peer: msg.peer.id, name: msg.peer.name });
        return;
      }
      case "leave": {
        if (this.probes.delete(msg.id)) return;
        const gone = this.state.peers.find((peer) => peer.id === msg.id);
        if (!gone) return;
        this.set({ peers: this.state.peers.filter((peer) => peer.id !== msg.id) });
        if (!this.kicked.delete(gone.id)) this.system({ event: "leave", peer: gone.id, name: gone.name });
        return;
      }
      case "host":
        if (msg.id === this.state.hostId) return;
        this.set({ hostId: msg.id });
        this.system({ event: "host", peer: msg.id, name: this.nameOf(msg.id) });
        return;
      case "action":
        if (msg.seq <= this.applied) return;
        this.pending.set(msg.seq, { from: msg.from, action: msg.action });
        this.drain();
        return;
      case "snapshot-request":
        return this.answerSnapshot(msg.from);
      case "state":
        return this.onSnapshot(msg.snapshot, msg.seq);
      case "chat":
        return this.onChat(msg);
      case "presence": {
        const { t: _t, from, ...fields } = msg;
        if (from === this.state.you.id) return;
        const peers = this.state.peers.map((peer) =>
          peer.id === from
            ? {
                ...peer,
                ...(fields.role !== undefined ? { role: fields.role } : {}),
                ...(fields.status !== undefined ? { status: fields.status } : {}),
                ...(fields.name ? { name: fields.name.slice(0, MAX_NAME_LENGTH) } : {}),
                ...(Array.isArray(fields.done) ? { done: fields.done } : {}),
              }
            : peer,
        );
        this.set({ peers });
        return;
      }
      case "cursor": {
        const point = msg.x < 0 || msg.y < 0 || msg.x > 1 || msg.y > 1 ? null : { x: msg.x, y: msg.y };
        for (const listener of [...this.cursorListeners]) listener(msg.from, point);
        return;
      }
      case "pose": {
        const { t: _t, from, ...pose } = msg;
        for (const listener of [...this.poseListeners]) listener(from, pose);
        return;
      }
      case "error": {
        const end = END_CODES[msg.code];
        if (end) this.leave(end);
        return;
      }
      case "pong":
        return;
    }
  }

  private onWelcome(msg: Extract<ServerMsg, { t: "welcome" }>) {
    const peers = msg.peers.filter((peer) => peer.id !== this.state.you.id && peer.status !== PROBE_STATUS).map(toPeer);
    const first = this.state.status === "connecting";
    clearTimeout(this.snapshotWait);
    this.pending.clear();
    if (msg.epoch) this.epoch = msg.epoch;
    // The relay says what follows; the tab relay and older relays leave it to "am I the host?".
    const sync = msg.sync ?? (msg.host === this.state.you.id ? "none" : "snapshot");
    const baton = first ? msg.host : this.state.baton;
    if (sync === "none") {
      // Our state is the room's state at msg.seq (a new history restarts the count).
      this.synced = true;
      this.applied = msg.seq;
      this.set({ status: "live", peers, hostId: msg.host, seq: this.applied, baton });
    } else if (sync === "replay") {
      this.synced = true;
      this.set({ status: "live", peers, hostId: msg.host, seq: this.applied, baton: this.state.baton });
    } else {
      this.synced = false;
      this.set({ status: "syncing", peers, hostId: msg.host });
      // The relay retries other peers itself and closes us if nobody answers; the tab relay can't.
      if (msg.sync === undefined) this.snapshotWait = setTimeout(() => {
        // The host never answered: go live from the room's current seq.
        if (this.synced || this.state.ended) return;
        this.synced = true;
        this.applied = Math.max(this.applied, msg.seq);
        for (const seq of [...this.pending.keys()]) if (seq <= this.applied) this.pending.delete(seq);
        this.set({ status: "live", seq: this.applied });
        this.drain();
      }, this.options.snapshotTimeoutMs ?? 8000);
    }
    if (Object.keys(this.presence).length > 0) this.outbox.unshift({ t: "presence", ...this.presence });
    this.flush();
  }

  private answerSnapshot(to: string) {
    if (!this.synced || !this.target || this.probes.has(to)) return;
    const snapshot: RoomSnapshot = {
      v: 1,
      lab: this.options.lab,
      itemId: this.options.itemId,
      state: this.target.snapshot(),
      baton: this.state.baton,
    };
    this.options.transport.send({ t: "state", to, snapshot, seq: this.applied });
  }

  private onSnapshot(raw: unknown, seq: number) {
    if (this.synced) return;
    if (raw === null) {
      // Nobody else holds the room: our own state is the room state at `seq`.
      clearTimeout(this.snapshotWait);
      this.synced = true;
      this.applied = seq;
      this.set({ status: "live", seq });
      this.drain();
      this.flush();
      return;
    }
    const snapshot = raw as Partial<RoomSnapshot>;
    if (snapshot.v !== 1) return;
    if (snapshot.lab !== this.options.lab || snapshot.itemId !== this.options.itemId) return;
    clearTimeout(this.snapshotWait);
    if (snapshot.state !== undefined && snapshot.state !== null) this.target?.hydrate(snapshot.state);
    this.synced = true;
    this.applied = seq;
    for (const key of [...this.pending.keys()]) if (key <= seq) this.pending.delete(key);
    this.set({ status: "live", seq, baton: typeof snapshot.baton === "string" ? snapshot.baton : null });
    this.drain();
    this.flush();
  }

  private drain() {
    if (!this.synced) return;
    let next = this.pending.get(this.applied + 1);
    if (!next && this.pending.size > 0) {
      // A hole the relay will never fill (a resume across a restart): skip to what we have.
      const lowest = Math.min(...this.pending.keys());
      this.applied = lowest - 1;
      next = this.pending.get(lowest);
    }
    while (next) {
      this.applied += 1;
      this.pending.delete(this.applied);
      this.applyOne(next.from, next.action);
      next = this.pending.get(this.applied + 1);
    }
    if (this.state.seq !== this.applied) this.set({ seq: this.applied });
  }

  private applyOne(from: string, action: Action) {
    if (action.type === "room/baton") {
      const to = typeof action.to === "string" ? action.to : null;
      if (to === this.state.baton) return;
      this.set({ baton: to, batonDenied: 0 });
      const holder = this.state.batonHolder;
      this.system({ event: "baton", peer: holder, name: this.nameOf(holder), by: from, byName: this.nameOf(from) });
      return;
    }
    if (action.type === "room/baton-request") {
      this.system({ event: "baton-request", peer: from, name: this.nameOf(from) });
      return;
    }
    if (action.type.startsWith("room/")) return;
    this.target?.apply(action, from);
  }

  private onChat(msg: Extract<ServerMsg, { t: "chat" }>) {
    const existing = this.state.messages.find((m) => m.id === msg.id);
    if (existing) {
      if (existing.pending) {
        this.set({ messages: this.state.messages.map((m) => (m.id === msg.id ? { ...m, ts: msg.ts, pending: false } : m)) });
      }
      return;
    }
    this.addMessage({
      id: msg.id,
      from: msg.from,
      text: String(msg.text).slice(0, MAX_CHAT_LENGTH),
      lang: msg.lang,
      kind: msg.kind,
      ts: msg.ts,
      translations: {},
      ...(typeof msg.name === "string" ? { name: msg.name.slice(0, MAX_NAME_LENGTH) } : {}),
    });
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
}
