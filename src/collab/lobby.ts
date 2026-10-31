import type { Actor, LobbyBuddy, LobbyInvite, RoomId, ServerFrame } from "../protocol/index.ts";
import { NeedsEnrolment } from "../server-client/types.ts";
import { backoffMs } from "./backoff.ts";
import type { Timers } from "./client.ts";
import type { CloseEvent, RoomTransport } from "./ws-transport.ts";

export type LobbyState = "idle" | "connecting" | "online" | "reconnecting";

export type LobbySnapshot = {
  state: LobbyState;
  online: ReadonlyMap<Actor, boolean>;
  invites: readonly LobbyInvite[];
  buddies: readonly { actor: Actor; name: string; color: string; online: boolean }[];
};

export type LobbyEnv = { random: () => number; hidden: () => boolean };

const WATCH_MS = 30_000;
const HIDDEN_LIMIT_MS = 5 * 60_000;

/** Which buddies are online and which invitations are waiting. The socket is closed while the tab stays hidden. */
export class LobbyClient {
  private snapshot: LobbySnapshot = { state: "idle", online: new Map(), invites: [], buddies: [] };
  private readonly listeners = new Set<() => void>();
  private transport: RoomTransport | null = null;
  private retry: unknown = null;
  private watch: unknown = null;
  private attempt = 0;
  private running = false;
  private paused = false;
  private hiddenSince: number | null = null;
  private readonly roster = new Map<Actor, LobbyBuddy>();

  constructor(
    private readonly connect: () => RoomTransport,
    private readonly clock: () => number,
    private readonly timers: Timers,
    private readonly env: LobbyEnv,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.open("connecting");
    this.schedulePulse();
  }

  stop(): void {
    this.running = false;
    this.paused = false;
    this.hiddenSince = null;
    this.clearTimers();
    this.drop();
    this.set({ state: "idle" });
  }

  getSnapshot = (): LobbySnapshot => this.snapshot;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };

  dismiss(room: RoomId): void {
    this.set({ invites: this.snapshot.invites.filter((invite) => invite.room !== room) });
  }

  private set(patch: Partial<LobbySnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const fn of [...this.listeners]) fn();
  }

  private publishRoster(): void {
    const buddies = [...this.roster.values()].map(({ actor, name, color, online }) => ({ actor, name, color, online }));
    this.set({ buddies, online: new Map(buddies.map((b) => [b.actor, b.online])) });
  }

  private open(state: LobbyState): void {
    this.set({ state });
    const transport = this.connect();
    this.transport = transport;
    transport.onFrame((frame) => this.receive(transport, frame));
    transport.onClose((event) => this.closed(transport, event));
    transport.connect();
  }

  private drop(): void {
    const transport = this.transport;
    this.transport = null;
    transport?.close();
  }

  private receive(from: RoomTransport, frame: ServerFrame): void {
    if (from !== this.transport) return;
    if (frame.t === "buddies") {
      this.roster.clear();
      for (const buddy of frame.list) this.roster.set(buddy.actor, buddy);
      this.publishRoster();
    } else if (frame.t === "buddy") {
      const known = this.roster.get(frame.actor);
      const next = { ...known, ...frame.patch, actor: frame.actor } as LobbyBuddy;
      if (typeof next.name !== "string" || typeof next.color !== "string") return;
      this.roster.set(frame.actor, { ...next, online: next.online === true });
      this.publishRoster();
    } else if (frame.t === "invite") {
      const now = this.clock();
      const others = this.snapshot.invites.filter((invite) => invite.room !== frame.room && Date.parse(invite.expires) > now);
      this.set({ invites: [...others, frame] });
    } else {
      return;
    }
    this.attempt = 0;
    if (this.snapshot.state !== "online") this.set({ state: "online" });
  }

  private closed(from: RoomTransport, event: CloseEvent): void {
    if (from !== this.transport) return;
    this.transport = null;
    if (!this.running || this.paused) return;
    if (event.error instanceof NeedsEnrolment) {
      this.stop();
      return;
    }
    this.set({ state: "reconnecting" });
    const wait = event.retryAfterMs ?? backoffMs(this.attempt, this.env.random, this.env.hidden());
    this.attempt += 1;
    this.retry = this.timers.setTimeout(() => {
      this.retry = null;
      if (this.running && !this.paused) this.open("reconnecting");
    }, wait);
  }

  private schedulePulse(): void {
    this.watch = this.timers.setTimeout(() => {
      this.watch = null;
      this.pulse();
      if (this.running) this.schedulePulse();
    }, WATCH_MS);
  }

  private pulse(): void {
    const now = this.clock();
    if (!this.env.hidden()) {
      this.hiddenSince = null;
      if (this.paused) {
        this.paused = false;
        this.attempt = 0;
        this.open("connecting");
      }
      return;
    }
    this.hiddenSince ??= now;
    if (!this.paused && now - this.hiddenSince >= HIDDEN_LIMIT_MS) {
      this.paused = true;
      if (this.retry !== null) this.timers.clearTimeout(this.retry);
      this.retry = null;
      this.drop();
      this.set({ state: "idle" });
    }
  }

  private clearTimers(): void {
    if (this.retry !== null) this.timers.clearTimeout(this.retry);
    if (this.watch !== null) this.timers.clearTimeout(this.watch);
    this.retry = null;
    this.watch = null;
  }
}
