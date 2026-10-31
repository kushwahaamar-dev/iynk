import type { Authority, PendingBatch, SubmitResult } from "../project/authority.ts";
import type { OpEnvelope, Project } from "../project/generated/types.ts";
import type { Actor, ErrorCode, Member, RejectCode, Role, RoomSettings, ServerFrame } from "../protocol/index.ts";
import type { ClientEvent, ClientState, RoomClient } from "./client.ts";

export type EditAccess =
  | { mode: "edit" }
  | {
      mode: "readonly";
      reason: "role" | "queue_full" | "ended" | "share" | "closed";
      action?: { id: "makeCopy" | "keepCopy"; run: () => Promise<void> };
    };

export type RoomStatus = {
  state: ClientState;
  offlineSince: number | null;
  pending: number;
  confirmedSeq: number;
  access: EditAccess;
  you: { actor: Actor; role: Role; spectator: boolean; host: boolean } | null;
  members: readonly Member[];
  host: Actor | null;
  baton: Actor | null;
  settings: RoomSettings | null;
};

const MAX_BATCH_OPS = 40;
const QUEUE_LIMIT = 1000;
const EDITING_ROLES: ReadonlySet<Role> = new Set(["owner", "editor"]);
const REJECT_CODES: ReadonlySet<ErrorCode> = new Set<RejectCode>([
  "malformed",
  "duplicate_id",
  "missing_target",
  "missing_pin",
  "pin_in_use",
  "unknown_definition",
  "missing_pin_map",
  "referenced_by",
  "invariant",
  "stale_base",
  "schema_mismatch",
  "permission",
  "not_baton",
  "quota",
]);

const isRejectCode = (code: ErrorCode): code is RejectCode => REJECT_CODES.has(code);

type Waiting = { batch: PendingBatch; settle: (r: SubmitResult) => void };

export class RoomAuthority implements Authority {
  readonly mode = "room";
  private readonly waiting = new Map<number, Waiting>();
  private readonly remote = new Set<(envs: OpEnvelope[]) => void>();
  private readonly resync = new Set<(snapshot: Project) => void>();
  private readonly listeners = new Set<() => void>();
  private readonly off: () => void;
  private you: RoomStatus["you"] = null;
  private members: readonly Member[] = [];
  private host: Actor | null = null;
  private baton: Actor | null = null;
  private settings: RoomSettings | null = null;
  private offlineSince: number | null = null;
  private closed = false;
  private explained = false;
  private stale = false;
  private status: RoomStatus;

  constructor(
    private readonly client: RoomClient,
    private readonly clock: () => number,
  ) {
    this.status = this.derive();
    this.off = client.on((e) => this.onEvent(e));
  }

  submit(batch: PendingBatch): Promise<SubmitResult> {
    if (batch.ops.length > MAX_BATCH_OPS) return Promise.resolve({ ok: false, reject: "quota" });
    if (this.status.access.mode === "readonly" && this.status.access.reason !== "queue_full") {
      return Promise.resolve({ ok: false, reject: "permission" });
    }
    const sent = this.client.submit(batch.ops, { batch: batch.batchId, kind: batch.author.kind === "ai" ? "ai" : "user" });
    if (!sent.ok) {
      const reject = sent.reason === "queue_full" ? "quota" : sent.reason === "ended" ? "permission" : "stale_base";
      return Promise.resolve({ ok: false, reject });
    }
    const done = new Promise<SubmitResult>((settle) => this.waiting.set(sent.sub, { batch, settle }));
    this.refresh();
    return done;
  }

  onRemote(h: (envs: OpEnvelope[]) => void): () => void {
    this.remote.add(h);
    return () => void this.remote.delete(h);
  }

  onResync(h: (snapshot: Project) => void): () => void {
    this.resync.add(h);
    return () => void this.resync.delete(h);
  }

  getStatus(): RoomStatus {
    return this.status;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => void this.listeners.delete(fn);
  }

  leave(): void {
    this.off();
    this.client.stop();
    this.abandon();
    this.refresh();
  }

  private abandon(): void {
    for (const { settle } of this.waiting.values()) settle({ ok: false, reject: "permission" });
    this.waiting.clear();
  }

  private onEvent(e: ClientEvent): void {
    switch (e.t) {
      case "state":
        if (e.state === "ended" || e.state === "failed") this.abandon();
        this.offlineSince = e.state === "reconnecting" ? (this.offlineSince ?? this.clock()) : e.state === "live" ? null : this.offlineSince;
        break;
      case "remote":
        this.explained = true;
        if (this.client.pendingCount === 0) for (const h of [...this.remote]) h(e.envs);
        else this.stale = true;
        break;
      case "acked":
        this.explained = true;
        this.onAcked(e);
        break;
      case "rejected":
        this.explained = true;
        this.stale = true;
        this.waiting.get(e.sub)?.settle({ ok: false, reject: isRejectCode(e.reason.code) ? e.reason.code : "permission" });
        this.waiting.delete(e.sub);
        break;
      case "room":
        this.onFrame(e.frame);
        break;
      case "view":
        this.flushView();
        break;
      default:
    }
    this.refresh();
  }

  private onAcked(e: Extract<ClientEvent, { t: "acked" }>): void {
    const entry = this.waiting.get(e.sub);
    if (!entry) return;
    this.waiting.delete(e.sub);
    const { batch } = entry;
    const at = new Date(this.clock()).toISOString();
    const actor = this.you?.actor ?? batch.author.actor;
    const envelopes = batch.ops.map((op, i): OpEnvelope => ({
      opId: `${batch.batchId}-${i}`,
      seq: e.seq0 + i,
      base: e.seq0 + i - 1,
      author: { ...batch.author, actor },
      at,
      op,
      ...(batch.ops.length > 1 && { batch: batch.batchId }),
    }));
    entry.settle({ ok: true, envelopes, inverse: e.inverse });
  }

  /** A view that no commit, ack or rejection explains is a snapshot; a rejection or a remote commit over pending work also leaves the visible state stale. */
  private flushView(): void {
    const redo = this.stale || !this.explained;
    this.stale = false;
    this.explained = false;
    const view = redo ? this.client.getView() : null;
    if (view) for (const h of [...this.resync]) h(view);
  }

  private onFrame(f: ServerFrame): void {
    switch (f.t) {
      case "welcome":
        this.you = { actor: f.you.actor, role: f.you.role, spectator: f.you.spectator, host: f.you.host };
        this.members = f.members;
        this.host = f.host;
        this.baton = f.baton;
        this.settings = f.room.settings;
        break;
      case "presence":
        this.members = this.members.map((m) => (m.m === f.m ? { ...m, ...presenceOf(f.patch) } : m));
        break;
      case "event":
        this.onRoomEvent(f);
        break;
      default:
    }
  }

  private onRoomEvent(f: Extract<ServerFrame, { t: "event" }>): void {
    const to = f.data?.to;
    switch (f.kind) {
      case "host.pass":
      case "host.claim":
        if (typeof to === "string") this.setHost(to as Actor);
        break;
      case "baton.free":
        this.baton = null;
        break;
      case "room.settings":
        if (this.settings) this.settings = { ...this.settings, ...(f.data as Partial<RoomSettings>) };
        break;
      case "room.close":
        this.closed = true;
        break;
      default:
    }
  }

  private setHost(actor: Actor): void {
    this.host = actor;
    if (this.you) this.you = { ...this.you, host: this.you.actor === actor };
  }

  private accessNow(): EditAccess {
    const state = this.client.state;
    if (this.closed) return { mode: "readonly", reason: "closed" };
    if (state === "ended" || state === "failed") return { mode: "readonly", reason: "ended" };
    if (this.you && (!EDITING_ROLES.has(this.you.role) || this.you.spectator)) return { mode: "readonly", reason: "role" };
    if (this.client.pendingCount >= QUEUE_LIMIT) return { mode: "readonly", reason: "queue_full" };
    return { mode: "edit" };
  }

  private derive(): RoomStatus {
    return {
      state: this.client.state,
      offlineSince: this.offlineSince,
      pending: this.client.pendingCount,
      confirmedSeq: this.client.confirmedSeq,
      access: this.accessNow(),
      you: this.you,
      members: this.members,
      host: this.host,
      baton: this.baton,
      settings: this.settings,
    };
  }

  private refresh(): void {
    const next = this.derive();
    const prev = this.status;
    const same =
      prev.state === next.state &&
      prev.offlineSince === next.offlineSince &&
      prev.pending === next.pending &&
      prev.confirmedSeq === next.confirmedSeq &&
      prev.access.mode === next.access.mode &&
      (prev.access.mode === "edit" || next.access.mode === "edit" || prev.access.reason === next.access.reason) &&
      prev.you === next.you &&
      prev.members === next.members &&
      prev.host === next.host &&
      prev.baton === next.baton &&
      prev.settings === next.settings;
    if (same) return;
    this.status = next;
    for (const fn of [...this.listeners]) fn();
  }
}

const presenceOf = ({ name, status }: { name?: string; status?: string | null }): Partial<Member> => ({
  ...(name !== undefined && { name }),
  ...(status !== undefined && { status: status ?? undefined }),
});
