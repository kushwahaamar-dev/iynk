import type { Actor, PresencePatch, Role, RoomEvent, RoomSettings, ServerFrame, Welcome } from "../protocol/index.ts";
import type { RoomClient, Timers } from "./client.ts";

export type RoomEventView = Omit<RoomEvent, "t">;

export type MemberView = {
  m: number;
  actor: Actor;
  name: string;
  color: string;
  role: Role;
  spectator: boolean;
  online: boolean;
  host: boolean;
  baton: boolean;
  app?: string;
  status?: string | null;
  view?: string;
  sel?: readonly string[];
  focus?: string | null;
  typing?: string | null;
};

export type CursorView = { m: number; view: string; x_mm: number; y_mm: number; at: number };

export type PresenceSnapshot = {
  me: MemberView | null;
  members: readonly MemberView[];
  host: Actor | null;
  baton: Actor | null;
  cursors: ReadonlyMap<number, CursorView>;
  events: readonly RoomEventView[];
};

type Seat = Omit<MemberView, "host" | "baton">;

const LEAVE_REMOVE_MS = 30_000;
const CURSOR_KEPT_MS = 10_000;
const CURSOR_SWEEP_MS = 1000;
const CURSOR_MIN_GAP_MS = 66;
const PRESENCE_MIN_GAP_MS = 200;
const EVENTS_KEPT = 50;
const MM_STEP = 10;

const quantise = (mm: number): number => Math.round(mm * MM_STEP) / MM_STEP;
const isActor = (v: unknown): v is Actor => typeof v === "string" && v.startsWith("usr_");

function seatOf(actor: Actor, data: Record<string, unknown> | undefined): Seat | null {
  if (!data) return null;
  const { m, name, color, role, spectator, app } = data;
  if (typeof m !== "number" || typeof name !== "string" || typeof color !== "string" || typeof role !== "string") return null;
  return {
    m,
    actor,
    name,
    color,
    role: role as Role,
    spectator: spectator === true,
    online: true,
    ...(typeof app === "string" && { app }),
  };
}

function patched(seat: Seat, patch: PresencePatch): Seat {
  const { vp: _vp, ...rest } = patch;
  return { ...seat, ...rest };
}

/** The room as this client sees it: who is here, who holds the host and the baton, where their pointers are. */
export class PresenceStore {
  private seats = new Map<Actor, Seat>();
  private cursors = new Map<number, CursorView>();
  private events: RoomEventView[] = [];
  private host: Actor | null = null;
  private baton: Actor | null = null;
  private you: Actor | null = null;
  private settings: Pick<RoomSettings, "spectatorCursors"> = { spectatorCursors: false };
  private snapshot: PresenceSnapshot | null = null;
  private readonly listeners = new Set<() => void>();
  private readonly leaving = new Map<Actor, unknown>();
  private sweepTimer: unknown = null;
  private client: RoomClient | null = null;

  private cursorSentAt = Number.NEGATIVE_INFINITY;
  private cursorPending: { view: string; x_mm: number; y_mm: number } | null = null;
  private cursorTimer: unknown = null;
  private presenceSentAt = Number.NEGATIVE_INFINITY;
  private presencePending: PresencePatch | null = null;
  private presenceTimer: unknown = null;

  constructor(
    private readonly clock: () => number,
    private readonly timers: Timers,
    private readonly hidden: () => boolean = () => false,
  ) {}

  attach(client: RoomClient): () => void {
    this.client = client;
    const off = client.on((e) => {
      if (e.t === "room") this.apply(e.frame);
    });
    return () => {
      off();
      if (this.client === client) this.client = null;
      this.clearTimers();
    };
  }

  getSnapshot(): PresenceSnapshot {
    this.snapshot ??= this.build();
    return this.snapshot;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  sendCursor(view: string, x_mm: number, y_mm: number): void {
    if (!Number.isFinite(x_mm) || !Number.isFinite(y_mm) || !this.mayPoint()) return;
    this.cursorPending = { view, x_mm: quantise(x_mm), y_mm: quantise(y_mm) };
    const wait = this.cursorSentAt + CURSOR_MIN_GAP_MS - this.clock();
    if (wait <= 0) this.flushCursor();
    else this.cursorTimer ??= this.timers.setTimeout(() => this.flushCursor(), wait);
  }

  sendPresence(patch: PresencePatch): void {
    this.presencePending = { ...this.presencePending, ...patch };
    const wait = this.presenceSentAt + PRESENCE_MIN_GAP_MS - this.clock();
    if (wait <= 0) this.flushPresence();
    else this.presenceTimer ??= this.timers.setTimeout(() => this.flushPresence(), wait);
  }

  private mayPoint(): boolean {
    const me = this.you === null ? undefined : this.seats.get(this.you);
    if (!me || (me.spectator && !this.settings.spectatorCursors)) return false;
    for (const seat of this.seats.values()) if (seat.online && seat.actor !== me.actor) return true;
    return false;
  }

  private flushCursor(): void {
    this.timers.clearTimeout(this.cursorTimer);
    this.cursorTimer = null;
    const next = this.cursorPending;
    this.cursorPending = null;
    if (!next || this.hidden() || !this.mayPoint()) return;
    this.cursorSentAt = this.clock();
    this.client?.send({ t: "cursor", ...next });
  }

  private flushPresence(): void {
    this.timers.clearTimeout(this.presenceTimer);
    this.presenceTimer = null;
    const patch = this.presencePending;
    this.presencePending = null;
    if (!patch) return;
    this.presenceSentAt = this.clock();
    this.client?.send({ t: "presence", patch });
  }

  private clearTimers(): void {
    for (const t of [this.cursorTimer, this.presenceTimer, this.sweepTimer, ...this.leaving.values()]) this.timers.clearTimeout(t);
    this.cursorTimer = this.presenceTimer = this.sweepTimer = null;
    this.leaving.clear();
    this.cursorPending = null;
    this.presencePending = null;
  }

  private apply(frame: ServerFrame): void {
    switch (frame.t) {
      case "welcome":
        return this.seed(frame);
      case "event":
        return this.onEvent(frame);
      case "presence": {
        const seat = this.seatByM(frame.m);
        if (!seat) return;
        this.seats.set(seat.actor, patched(seat, frame.patch));
        return this.changed();
      }
      case "cursors": {
        const at = this.clock();
        for (const [m, view, x_mm, y_mm] of frame.c) {
          if (Number.isFinite(x_mm) && Number.isFinite(y_mm)) this.cursors.set(m, { m, view, x_mm, y_mm, at });
        }
        this.sweepSoon();
        return this.changed();
      }
      default:
    }
  }

  private seed(w: Welcome): void {
    for (const t of this.leaving.values()) this.timers.clearTimeout(t);
    this.leaving.clear();
    this.you = w.you.actor;
    this.host = w.host;
    this.baton = w.baton;
    this.settings = w.room.settings;
    this.cursors.clear();
    this.seats = new Map(
      w.members.map(({ runner: _runner, host: _host, baton: _baton, ...rest }) => [rest.actor, { ...rest }] as const),
    );
    this.changed();
  }

  private onEvent(frame: ServerFrame & { t: "event" }): void {
    const { t: _t, ...view } = frame;
    this.events = [...this.events, view].slice(-EVENTS_KEPT);
    const { kind, by, data } = frame;
    switch (kind) {
      case "member.join": {
        const seat = by && seatOf(by, data);
        if (seat) this.join(seat);
        break;
      }
      case "member.leave":
        if (by) this.leave(by);
        break;
      case "baton.grant":
      case "baton.take":
        this.baton = isActor(data?.to) ? data.to : this.baton;
        break;
      case "baton.release":
      case "baton.free":
        this.baton = null;
        break;
      case "host.pass":
      case "host.claim":
      case "host.expire":
        this.host = isActor(data?.to) ? data.to : null;
        break;
      case "room.settings":
        if (typeof data?.spectatorCursors === "boolean") this.settings = { spectatorCursors: data.spectatorCursors };
        break;
      default:
    }
    this.changed();
  }

  private join(seat: Seat): void {
    this.timers.clearTimeout(this.leaving.get(seat.actor));
    this.leaving.delete(seat.actor);
    const before = this.seats.get(seat.actor);
    if (before && before.m !== seat.m) this.cursors.delete(before.m);
    this.seats.set(seat.actor, seat);
  }

  private leave(actor: Actor): void {
    const seat = this.seats.get(actor);
    if (!seat) return;
    this.seats.set(actor, { ...seat, online: false });
    this.cursors.delete(seat.m);
    this.timers.clearTimeout(this.leaving.get(actor));
    this.leaving.set(
      actor,
      this.timers.setTimeout(() => {
        this.leaving.delete(actor);
        this.seats.delete(actor);
        this.changed();
      }, LEAVE_REMOVE_MS),
    );
  }

  private seatByM(m: number): Seat | undefined {
    for (const seat of this.seats.values()) if (seat.m === m) return seat;
    return undefined;
  }

  private sweepSoon(): void {
    this.sweepTimer ??= this.timers.setTimeout(() => {
      this.sweepTimer = null;
      const limit = this.clock() - CURSOR_KEPT_MS;
      let removed = false;
      for (const [m, c] of this.cursors) {
        if (c.at <= limit) {
          this.cursors.delete(m);
          removed = true;
        }
      }
      if (this.cursors.size > 0) this.sweepSoon();
      if (removed) this.changed();
    }, CURSOR_SWEEP_MS);
  }

  private changed(): void {
    this.snapshot = null;
    for (const fn of [...this.listeners]) fn();
  }

  private build(): PresenceSnapshot {
    const members = [...this.seats.values()].map(
      (s): MemberView => ({ ...s, host: s.actor === this.host, baton: s.actor === this.baton }),
    );
    return {
      me: members.find((m) => m.actor === this.you) ?? null,
      members,
      host: this.host,
      baton: this.baton,
      cursors: new Map(this.cursors),
      events: this.events,
    };
  }
}
