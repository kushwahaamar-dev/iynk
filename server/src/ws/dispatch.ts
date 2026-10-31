import type {
  Actor,
  ClientFrame,
  ErrorCode,
  ErrorFrame,
  Hello,
  Member,
  RoomEvent,
  RoomId,
  ServerFrame,
  Submit,
  Welcome,
} from "../../../src/protocol/frames.ts";
import { CAPS, OP_SCHEMA, WIRE_PROTOCOL } from "../../../src/protocol/frames.ts";
import { CLOSE, closeCodeFor, isRetryable } from "../../../src/protocol/close-codes.ts";
import { RUN_LIMITS } from "../../../src/protocol/run-ops.ts";
import { parseClientFrame } from "../../../src/protocol/validate.ts";
import type { CollabLimits } from "../collab-config.ts";
import type { Logger } from "../ops/log.ts";
import type { Timers } from "../rooms/baton.ts";
import type { createCommandRegistry } from "../rooms/commands.ts";
import type { RoomCore } from "../rooms/core.ts";
import type { RoomRegistry } from "../rooms/registry.ts";
import { decideResume } from "../rooms/resume.ts";
import type { RunOutcome } from "../rooms/run-channel.ts";
import { createRunHub } from "../rooms/run-hub.ts";
import type { Subject } from "../rooms/permissions.ts";
import type { MemberRef, Outbound } from "../rooms/types.ts";
import type { MemberRow, RoomsRepo } from "../store/rooms.ts";
import { verifyHello } from "./auth.ts";
import type { AuthLimiter, DeviceLookup, DeviceRow } from "./auth.ts";
import { TokenBucket } from "./bucket.ts";
import type { ChatRing } from "./chat.ts";
import { decodeFrame, encodeFrame } from "./codec.ts";
import type { CursorBatcher } from "./cursors.ts";
import type { LobbyHub } from "./lobby.ts";
import type { NonceStore } from "./nonces.ts";
import type { PresenceHub } from "./presence.ts";
import type { SessionRegistry, SocketHandle } from "./sessions.ts";

const MIN_JOIN_MS = 200;
const CURSOR_FLUSH_MS = 66;
const TICK_MS = 1000;
const UNKNOWN_TYPES_PER_MINUTE = 20;
const MINUTE_MS = 60_000;
const NORMAL_CLOSE = 1000;
const LOBBY = "lobby";

export interface WsLike {
  send(data: string | Buffer): void;
  close(code?: number, reason?: string): void;
  terminate(): void;
  ping(): void;
  readonly bufferedAmount: number;
}

export interface OriginPolicy {
  allows(origin: string): boolean;
}

export interface WsMetrics {
  sockets(count: number): void;
  closed(code: number): void;
  frameIn(type: string): void;
  frameDropped(): void;
  dispatchSeconds(seconds: number): void;
}

export type WsDeps = {
  registry: RoomRegistry;
  lobby: LobbyHub;
  sessions: SessionRegistry;
  nonces: NonceStore;
  limiter: AuthLimiter;
  lookup: DeviceLookup;
  repo: RoomsRepo;
  commands: ReturnType<typeof createCommandRegistry>;
  limits: CollabLimits;
  clock: () => number;
  timers: Timers;
  aud: string;
  origins: OriginPolicy;
  trustProxy: number;
  salt: Uint8Array;
  log: Logger;
  metrics: WsMetrics;
  presence(core: RoomCore): PresenceHub;
  cursors(core: RoomCore): CursorBatcher;
  chat(core: RoomCore): ChatRing;
};

type State = "challenged" | "authenticated" | "joined" | "ready" | "closed";
type Memo = Map<boolean, string | Buffer>;

interface Peer {
  deliver(frame: ServerFrame, memo: Memo): void;
  closeWith(code: number): void;
}

type Channel = {
  peers: Map<number, Peer>;
  presence: PresenceHub;
  cursors: CursorBatcher;
  chat: ChatRing;
  flushQueued: boolean;
  stop: (() => void) | null;
};

function errorFrame(code: ErrorCode, message: string, extra: Partial<Pick<ErrorFrame, "retryAfterMs" | "ref">> = {}): ErrorFrame {
  return { t: "error", code, message, retryable: isRetryable(code), ...extra };
}

function every(timers: Timers, ms: number, fn: () => void): () => void {
  let cancel = (): void => {};
  let stopped = false;
  const arm = (): void => {
    cancel = timers.set(() => {
      fn();
      if (!stopped) arm();
    }, ms);
  };
  arm();
  return () => {
    stopped = true;
    cancel();
  };
}

const isSpectator = (row: MemberRow): boolean => row.spectator || row.role === "viewer";

class RoomHub {
  readonly #d: WsDeps;
  readonly #channels = new WeakMap<RoomCore, Channel>();
  readonly runs: ReturnType<typeof createRunHub>;

  constructor(d: WsDeps) {
    this.#d = d;
    this.runs = createRunHub({
      clock: d.clock,
      repo: d.repo,
      bucket: () => new TokenBucket(RUN_LIMITS.reqPerSec, RUN_LIMITS.reqPerSec, d.clock()),
    });
  }

  emitRun(core: RoomCore, outcome: RunOutcome): void {
    this.emit(core, this.runs.toOutbound(core, outcome));
  }

  channel(core: RoomCore): Channel {
    let ch = this.#channels.get(core);
    if (!ch) {
      ch = {
        peers: new Map(),
        presence: this.#d.presence(core),
        cursors: this.#d.cursors(core),
        chat: this.#d.chat(core),
        flushQueued: false,
        stop: null,
      };
      this.#channels.set(core, ch);
    }
    return ch;
  }

  join(core: RoomCore, ref: MemberRef, peer: Peer, app: string | undefined): void {
    const ch = this.channel(core);
    ch.peers.set(ref.m, peer);
    ch.presence.join(ref.m, { name: ref.name, color: ref.color, ...(app === undefined ? {} : { app }) });
    ch.stop ??= this.#start(core, ch);
  }

  leave(core: RoomCore, ref: MemberRef, reason: string): void {
    const ch = this.channel(core);
    if (ch.peers.get(ref.m) === undefined) return;
    ch.peers.delete(ref.m);
    core.removeMember(ref.m);
    this.emitRun(core, this.runs.forRoom(core).onLeave(ref));
    ch.presence.leave(ref.m);
    ch.cursors.leave(ref.m);
    ch.chat.leave(ref.m);
    this.emit(core, this.#d.commands.memberLeft(core, ref));
    this.announce(core, "member.leave", ref.actor, { m: ref.m, reason });
    if (ch.peers.size === 0) {
      ch.stop?.();
      ch.stop = null;
    }
  }

  emit(core: RoomCore, out: Outbound[]): void {
    const ch = this.#channels.get(core);
    if (!ch) return;
    for (const item of out) {
      if ("close" in item) {
        const peer = ch.peers.get(item.to.m);
        if (item.frame) peer?.deliver(item.frame, new Map());
        peer?.closeWith(item.close);
      } else if (item.to.kind === "member") {
        ch.peers.get(item.to.m)?.deliver(item.frame, new Map());
      } else {
        this.broadcast(ch, item.frame, item.to.except);
      }
    }
  }

  broadcast(ch: Channel, frame: ServerFrame, except?: number): void {
    const memo: Memo = new Map();
    for (const [m, peer] of ch.peers) if (m !== except) peer.deliver(frame, memo);
  }

  announce(core: RoomCore, kind: string, by: MemberRef["actor"], data: Record<string, unknown>): void {
    const at = this.#d.clock();
    this.#d.repo.addEvent(core.id, at, kind, by, data);
    const frame: RoomEvent = { t: "event", at: new Date(at).toISOString(), kind, by, data };
    this.broadcast(this.channel(core), frame);
  }

  scheduleFlush(core: RoomCore): void {
    const ch = this.channel(core);
    if (ch.flushQueued) return;
    ch.flushQueued = true;
    setImmediate(() => {
      ch.flushQueued = false;
      this.emit(core, core.flush());
    });
  }

  #start(core: RoomCore, ch: Channel): () => void {
    const stopCursors = every(this.#d.timers, CURSOR_FLUSH_MS, () => {
      const frame = ch.cursors.drain(ch.peers.size);
      if (frame) this.broadcast(ch, frame);
    });
    const stopTick = every(this.#d.timers, TICK_MS, () => {
      this.emit(core, core.flush());
      this.emit(core, core.tick());
    });
    return () => {
      stopCursors();
      stopTick();
    };
  }
}

const hubs = new WeakMap<WsDeps, RoomHub>();

function hubOf(d: WsDeps): RoomHub {
  let hub = hubs.get(d);
  if (!hub) hubs.set(d, (hub = new RoomHub(d)));
  return hub;
}

/** Routes what a `RoomCore` or the registry produced to the sockets of that room. */
export function emitToRoom(d: WsDeps, core: RoomCore, out: Outbound[]): void {
  hubOf(d).emit(core, out);
}

export class SocketSession implements Peer {
  readonly #sock: WsLike;
  readonly #tag: string;
  readonly #d: WsDeps;
  readonly #hub: RoomHub;
  readonly #handle: SocketHandle;
  readonly #bucket: TokenBucket;
  readonly #openedAt: number;
  readonly #nonce: string;
  readonly #drops: number[] = [];
  readonly #unknown: number[] = [];
  readonly #pending = new Set<number>();
  readonly #cancels: (() => void)[] = [];
  #state: State = "challenged";
  #device: DeviceRow | null = null;
  #gzipOk = false;
  #lastHeard: number;
  #detachLobby: (() => void) | null = null;
  #room: RoomId | null = null;
  #core: RoomCore | null = null;
  #ref: MemberRef | null = null;
  #left = "disconnected";

  constructor(sock: WsLike, req: { tag: string }, d: WsDeps) {
    this.#sock = sock;
    this.#tag = req.tag;
    this.#d = d;
    this.#hub = hubOf(d);
    this.#openedAt = d.clock();
    this.#lastHeard = this.#openedAt;
    this.#bucket = new TokenBucket(d.limits.framesPerSec, d.limits.framesPerSec, this.#openedAt);
    this.#handle = {
      tag: req.tag,
      send: (frame) => this.deliver(frame, new Map()),
      close: (code, reason) => this.#close(code, reason),
    };

    const issued = d.nonces.issue();
    this.#nonce = issued.nonce;
    this.#cancels.push(d.timers.set(() => this.#close(CLOSE.helloTimeout), d.limits.helloTimeoutMs));
    this.#write({ t: "challenge", protocol: WIRE_PROTOCOL, nonce: issued.nonce, aud: d.aud, serverTime: new Date(issued.at).toISOString() });
  }

  onPong(): void {
    this.#lastHeard = this.#d.clock();
  }

  onClose(code: number): void {
    this.#teardown(code);
  }

  /** Ends the socket for a server restart; the client reconnects after `retryAfterMs`. */
  restart(retryAfterMs: number): void {
    this.deliver(errorFrame("server_error", "The server is restarting.", { retryAfterMs }), new Map());
    this.#close(CLOSE.restarting);
  }

  closeWith(code: number): void {
    this.#close(code);
  }

  deliver(frame: ServerFrame, memo: Memo): void {
    if (this.#state === "closed") return;
    this.#settle(frame);
    const queued = this.#sock.bufferedAmount;
    const { lossyBufferedBytes, maxBufferedBytes } = this.#d.limits;
    if (queued > maxBufferedBytes) {
      this.#sock.terminate();
      this.#teardown(1006);
      return;
    }
    if (queued > lossyBufferedBytes && (frame.t === "presence" || frame.t === "cursors")) {
      this.#d.metrics.frameDropped();
      return;
    }
    let encoded = memo.get(this.#gzipOk);
    if (encoded === undefined) {
      encoded = encodeFrame(frame, this.#gzipOk);
      memo.set(this.#gzipOk, encoded);
    }
    this.#sock.send(encoded);
  }

  onMessage(data: Buffer | string, isBinary: boolean): void {
    if (this.#state === "closed") return;
    const started = performance.now();
    const now = this.#d.clock();
    this.#lastHeard = now;
    try {
      if (!this.#bucket.take(now)) this.#drop(now);
      else this.#receive(data, isBinary, now);
    } finally {
      this.#d.metrics.dispatchSeconds((performance.now() - started) / 1000);
    }
  }

  #write(frame: ServerFrame): void {
    this.deliver(frame, new Map());
  }

  #settle(frame: ServerFrame): void {
    if (frame.t === "commit" && frame.ack) this.#pending.delete(frame.ack.sub);
    else if (frame.t === "reject") this.#pending.delete(frame.sub);
    else if (frame.t === "error" && frame.ref !== undefined) this.#pending.delete(Number(frame.ref));
  }

  #drop(now: number): void {
    this.#d.metrics.frameDropped();
    if (this.#flooded(this.#drops, this.#d.limits.floodWindowMs, this.#d.limits.floodDrops, now)) this.#close(CLOSE.rateLimited);
  }

  #flooded(log: number[], windowMs: number, max: number, now: number): boolean {
    log.push(now);
    while ((log[0] as number) <= now - windowMs) log.shift();
    return log.length >= max;
  }

  #receive(data: Buffer | string, isBinary: boolean, now: number): void {
    const awaitingHello = this.#state === "challenged";
    const decoded = isBinary && awaitingHello ? ({ ok: false, code: "bad_frame", close: null } as const) : decodeFrame(data, isBinary);
    if (!decoded.ok) {
      this.#refuseFrame(decoded.code, "The frame could not be read.", decoded.close, awaitingHello);
      return;
    }
    const parsed = parseClientFrame(decoded.text, { inflated: isBinary });
    if (!parsed.ok) {
      const close = parsed.code === "upgrade_required" || parsed.code === "schema_mismatch" ? CLOSE.upgradeRequired : closeCodeFor(parsed.code);
      this.#refuseFrame(parsed.code, parsed.message, close, awaitingHello && close === null);
      if (parsed.code === "bad_type" && this.#state !== "closed") this.#countUnknown(now);
      return;
    }
    const frame = parsed.frame;
    this.#d.metrics.frameIn(frame.t);
    if (awaitingHello) {
      if (frame.t === "hello") this.#authenticate(frame);
      else this.#refuseFrame("bad_type", "Say hello first.", CLOSE.unauthorized, true);
    } else if (this.#state === "authenticated") {
      this.#write(errorFrame("not_ready", "The room is not ready yet."));
    } else if (this.#room === null) {
      this.#lobbyFrame(frame);
    } else {
      this.#roomFrame(frame, now);
    }
  }

  #refuseFrame(code: ErrorCode, message: string, close: number | null, authFailure: boolean): void {
    if (authFailure) this.#d.limiter.failure(this.#tag);
    this.#write(errorFrame(code, message));
    const final = close ?? (authFailure ? CLOSE.unauthorized : null);
    if (final !== null) this.#close(final);
  }

  #countUnknown(now: number): void {
    if (this.#flooded(this.#unknown, MINUTE_MS, UNKNOWN_TYPES_PER_MINUTE, now)) this.#close(CLOSE.rateLimited);
  }

  #authenticate(hello: Hello): void {
    const d = this.#d;
    const verified = verifyHello(hello, { aud: d.aud, nonce: this.#nonce, nonces: d.nonces, room: hello.room ?? null, lookup: d.lookup });
    if (!verified.ok) {
      this.#refuseFrame("unauthorized", "Sign-in failed.", CLOSE.unauthorized, true);
      return;
    }
    this.#device = verified.device;
    this.#gzipOk = hello.caps.includes("gzip");
    this.#state = "authenticated";
    this.#cancels.splice(0).forEach((cancel) => cancel());
    this.#cancels.push(every(d.timers, d.limits.heartbeatMs, () => this.#beat()));
    if (hello.room === undefined) {
      this.#joinLobby(verified.device);
      return;
    }
    const room = hello.room;
    const wait = Math.max(0, MIN_JOIN_MS - (d.clock() - this.#openedAt));
    this.#cancels.push(d.timers.set(() => this.#joinRoom(room, hello, verified.device), wait));
  }

  #beat(): void {
    if (this.#d.clock() - this.#lastHeard >= this.#d.limits.deadPeerMs) {
      this.#sock.terminate();
      this.#teardown(1006);
      return;
    }
    this.#sock.ping();
  }

  #joinLobby(device: DeviceRow): void {
    this.#d.sessions.attach(LOBBY, device.id, this.#handle);
    this.#detachLobby = this.#d.lobby.attach(device.id, (frame) => this.#write(frame));
    this.#state = "ready";
    this.#write({ t: "ready", seq: 0 });
  }

  #lobbyFrame(frame: ClientFrame): void {
    if (frame.t === "ping") this.#write({ t: "pong" });
    else if (frame.t === "bye") this.#close(NORMAL_CLOSE);
    else this.#write(errorFrame("bad_type", "The lobby takes only ping and bye."));
  }

  #unavailable(): void {
    this.#write(errorFrame("room_unavailable", "Room unavailable."));
    this.#close(CLOSE.roomUnavailable);
  }

  #joinRoom(room: RoomId, hello: Hello, device: DeviceRow): void {
    if (this.#state === "closed") return;
    const { repo, registry, limits } = this.#d;
    const row = repo.member(room, device.id);
    if (!row || row.banned) return this.#unavailable();

    const opened = registry.open(room);
    if (opened.status === "corrupt") {
      this.#write({ ...errorFrame("server_error", "The room needs repair."), retryable: false });
      return this.#close(CLOSE.roomCorrupt);
    }
    if (opened.status === "live_cap") {
      this.#write(errorFrame("server_error", "The server is busy."));
      return this.#close(CLOSE.busy);
    }
    if (opened.status !== "ok") return this.#unavailable();

    const core = opened.core;
    const spectator = isSpectator(row);
    const others = core.members().filter((member) => member.device !== device.id);
    const seated = others.filter((member) => member.spectator === spectator).length;
    if (seated >= (spectator ? core.settings.maxSpectators : core.settings.maxMembers)) {
      this.#write(errorFrame("room_full", "The room is full."));
      return this.#close(CLOSE.roomFull);
    }

    this.#d.sessions.attach(room, device.id, this.#handle);
    const ref = core.addMember({ device: device.id, actor: row.actor as Actor, role: row.role, spectator, name: row.name, color: row.color, muted: row.muted });
    this.#room = room;
    this.#core = core;
    this.#ref = ref;
    this.#state = "joined";
    this.#hub.join(core, ref, this, hello.app);

    const plan = decideResume(repo, { id: room, epoch: core.epoch, seq: core.seq, chain: core.chain }, hello, limits);
    const backlog = this.#hub.channel(core).chat.backlog();
    const { run, runner, log } = this.#hub.runs.forRoom(core).welcome();
    this.#write(this.#welcome(core, ref, plan.kind, plan.epochBreak, backlog.length, { run, runner }));
    for (const frame of [...plan.frames, ...backlog, ...log]) this.#write(frame);
    this.#write({ t: "ready", seq: core.seq });
    core.markReady(ref.m);
    this.#state = "ready";

    this.#hub.announce(core, "member.join", ref.actor, {
      m: ref.m,
      name: ref.name,
      color: ref.color,
      role: ref.role,
      spectator: ref.spectator,
      ...(hello.app === undefined ? {} : { app: hello.app }),
    });
    this.#hub.emit(core, this.#d.commands.memberBack(core, ref));
  }

  #welcome(
    core: RoomCore,
    ref: MemberRef,
    resume: Welcome["resume"],
    epochBreak: boolean,
    chat: number,
    running: Pick<Welcome, "run" | "runner">,
  ): Welcome {
    const { repo, limits } = this.#d;
    const presence = this.#hub.channel(core).presence;
    const members: Member[] = core.members().map((member) => {
      const view = presence.view(member.m);
      return {
        actor: member.actor,
        m: member.m,
        name: member.name,
        color: member.color,
        role: member.role,
        spectator: member.spectator,
        online: true,
        host: member.actor === core.host,
        baton: member.actor === core.baton,
        runner: member.actor === running.runner,
        ...(view?.status === undefined ? {} : { status: view.status }),
        ...(view?.app === undefined ? {} : { app: view.app }),
      };
    });
    return {
      t: "welcome",
      protocol: WIRE_PROTOCOL,
      opSchema: OP_SCHEMA,
      room: {
        id: core.id,
        project: core.projectId as Welcome["room"]["project"],
        title: repo.getRoom(core.id)?.title ?? "",
        epoch: core.epoch,
        seq: core.seq,
        chain: core.chain,
        state: core.state,
        settings: core.settings,
      },
      you: { actor: ref.actor, m: ref.m, role: ref.role, spectator: ref.spectator, host: ref.actor === core.host },
      members,
      host: core.host,
      baton: core.baton,
      runner: running.runner,
      resume,
      ...(epochBreak ? { epochBreak: true as const } : {}),
      run: running.run,
      chat,
      limits: { submitPerSec: limits.submitPerSec, maxEnvelopeBytes: CAPS.envelope, maxPending: limits.pendingPerSocket },
    };
  }

  #subject(core: RoomCore, ref: MemberRef): Subject {
    return {
      role: ref.role,
      spectator: ref.spectator,
      actor: ref.actor,
      host: ref.actor === core.host,
      creator: false,
      baton: core.baton,
      codeMode: "baton",
      muted: ref.muted,
    };
  }

  #roomFrame(frame: ClientFrame, now: number): void {
    const core = this.#core as RoomCore;
    const ref = this.#ref as MemberRef;
    const ch = this.#hub.channel(core);
    switch (frame.t) {
      case "ping":
        this.#write({ t: "pong" });
        break;
      case "bye":
        this.#left = "left";
        this.#close(NORMAL_CLOSE);
        break;
      case "submit":
        this.#submit(core, ref, frame);
        break;
      case "resync":
        this.#hub.emit(core, core.resync(ref.m, frame));
        break;
      case "cmd":
        if (frame.name === "runner.set" || frame.name === "run.detach") {
          const outcome = this.#hub.runs.forRoom(core).onCmd(ref, frame.name, frame.args);
          this.#hub.emitRun(core, { ...outcome, errors: outcome.errors.map((e) => ({ ...e, error: { ...e.error, ref: frame.id } })) });
        } else {
          this.#hub.emit(core, core.command(ref.m, frame));
        }
        break;
      case "run.req":
      case "run.ev":
      case "run.tick":
      case "run.check":
        this.#hub.emitRun(core, this.#hub.runs.forRoom(core).onFrame(ref, frame));
        break;
      case "cursor": {
        const verdict = ch.cursors.push(this.#subject(core, ref), ref.m, frame, core.settings.spectatorCursors);
        if (verdict === "permission") this.#write(errorFrame("permission", "Cursors are off for spectators."));
        else if (verdict === "dropped") this.#drop(now);
        break;
      }
      case "presence": {
        const result = ch.presence.patch(ref.m, frame.patch);
        if ("frame" in result) this.#hub.broadcast(ch, result.frame, ref.m);
        else this.#write(errorFrame(result.error, "Slow down.", result.retryAfterMs === undefined ? {} : { retryAfterMs: result.retryAfterMs }));
        break;
      }
      case "chat": {
        const result = ch.chat.send(this.#subject(core, ref), ref.m, frame);
        if ("frame" in result) this.#hub.broadcast(ch, result.frame);
        else this.#write(errorFrame(result.error, "The message was not sent.", result.retryAfterMs === undefined ? {} : { retryAfterMs: result.retryAfterMs }));
        break;
      }
      case "hello":
        this.#write(errorFrame("bad_type", "Hello was already sent."));
        break;
    }
  }

  #submit(core: RoomCore, ref: MemberRef, frame: Submit): void {
    if (this.#pending.size >= this.#d.limits.pendingPerSocket) {
      this.#write(errorFrame("rate_limited", "Wait for earlier edits to be answered.", { ref: String(frame.sub) }));
      return;
    }
    this.#pending.add(frame.sub);
    this.#hub.emit(core, core.submit(ref.m, frame));
    this.#hub.scheduleFlush(core);
  }

  #close(code: number, reason?: string): void {
    if (this.#state === "closed") return;
    this.#sock.close(code, reason);
    if (code === CLOSE.kicked) this.#left = "kicked";
    this.#teardown(code);
  }

  #teardown(code: number): void {
    if (this.#state === "closed") return;
    this.#state = "closed";
    this.#cancels.splice(0).forEach((cancel) => cancel());
    const device = this.#device;
    if (device) {
      if (this.#room !== null) this.#d.sessions.detach(this.#room, device.id, this.#handle);
      else this.#d.sessions.detach(LOBBY, device.id, this.#handle);
    }
    this.#detachLobby?.();
    if (this.#core && this.#ref) this.#hub.leave(this.#core, this.#ref, this.#left);
    this.#d.metrics.closed(code);
    this.#d.log.info("ws.close", { code, tag: this.#tag });
  }
}
