import { gunzipSync, gzipSync } from "node:zlib";
import type { Row, ServerStore, SqlValue, Tx } from "./port.ts";

export type RoomId = string;
export type DeviceId = string;
export type Actor = string;

export type RoomState = "open" | "locked" | "idle" | "closed" | "corrupt";
export type RoomRole = "owner" | "editor" | "commenter" | "viewer";
export type InviteRole = "editor" | "commenter" | "viewer";
export type InviteKind = "buddy" | "link";
export type CheckpointKind = "auto" | "named" | "genesis";

export type RoomSettings = {
  codeMode: "baton" | "open";
  runControl: "editors" | "host";
  spectatorCursors: boolean;
  locked: boolean;
  maxMembers: number;
  maxSpectators: number;
};

export type RoomRow = {
  id: RoomId;
  project_id: string;
  title: string;
  creator_device: DeviceId;
  host_actor: Actor;
  baton_actor: Actor | null;
  runner_actor: Actor | null;
  state: RoomState;
  epoch: string;
  seq: number;
  chain: string;
  state_hash: string;
  opschema: string;
  settings: RoomSettings;
  pinned: boolean;
  created_at: number;
  last_active_at: number;
  closed_at: number | null;
};

export type NewRoom = Pick<
  RoomRow,
  "id" | "project_id" | "title" | "creator_device" | "host_actor" | "epoch" | "opschema" | "settings" | "created_at"
>;

export type MemberRow = {
  room_id: RoomId;
  device_id: DeviceId;
  actor: Actor;
  role: RoomRole;
  spectator: boolean;
  muted: boolean;
  banned: boolean;
  name: string;
  color: string;
  joined_at: number;
};

export type MemberPatch = Partial<Pick<MemberRow, "role" | "spectator" | "muted" | "banned" | "name" | "color">>;

export type OpRow = {
  room_id: RoomId;
  seq: number;
  env: Uint8Array | null;
  author_actor: Actor;
  kind: string;
  target: string | null;
  at: number;
  chain: string;
};

export type CheckpointRow = {
  room_id: RoomId;
  seq: number;
  state_hash: string;
  chain: string;
  doc: Uint8Array;
  at: number;
  kind: CheckpointKind;
};

export type SubmissionRow = {
  room_id: RoomId;
  device_id: DeviceId;
  first_op_id: string;
  seq0: number;
  seq1: number;
  inverse: string;
  at: number;
};

export type EventRow = {
  room_id: RoomId;
  n: number;
  at: number;
  kind: string;
  actor: Actor | null;
  data: unknown;
};

export type InviteRow = {
  id: string;
  room_id: RoomId;
  creator: DeviceId;
  secret_hash: Uint8Array;
  kind: InviteKind;
  role: InviteRole;
  max_uses: number;
  uses: number;
  expires_at: number;
  revoked_at: number | null;
  target_device: DeviceId | null;
};

export type CommitWrite = {
  room_id: RoomId;
  device_id: DeviceId;
  first_op_id: string;
  ops: Omit<OpRow, "room_id">[];
  inverse: string;
  state_hash: string;
  at: number;
  events?: { kind: string; actor: Actor | null; data: object }[];
  acl?: ({ device: DeviceId; patch: MemberPatch } | { device: DeviceId; remove: true })[];
};

export interface RoomsRepo {
  createRoom(r: NewRoom, genesis: CheckpointRow, creator: MemberRow): RoomRow;
  getRoom(id: RoomId): RoomRow | null;
  listRoomsFor(device: DeviceId): RoomRow[];
  countStored(): number;
  countStoredBy(device: DeviceId): number;
  setState(id: RoomId, state: RoomState, at: number): void;
  patchRoom(id: RoomId, patch: Partial<Pick<RoomRow, "host_actor" | "baton_actor" | "settings" | "pinned" | "epoch">>): void;
  appendCommits(ws: CommitWrite[]): void;
  loadTail(id: RoomId, fromExclusive: number, limit: number): OpRow[];
  chainAt(id: RoomId, seq: number): string | null;
  putCheckpoint(c: CheckpointRow): void;
  latestCheckpoint(id: RoomId, atOrBefore?: number): CheckpointRow | null;
  pruneCheckpoints(id: RoomId, keep: number): number;
  nullOldPayloads(id: RoomId, keepLatest: number): number;
  member(id: RoomId, device: DeviceId): MemberRow | null;
  members(id: RoomId): MemberRow[];
  upsertMember(m: MemberRow): void;
  patchMember(id: RoomId, device: DeviceId, p: MemberPatch): void;
  removeMember(id: RoomId, device: DeviceId): void;
  findSubmission(id: RoomId, device: DeviceId, firstOpId: string): SubmissionRow | null;
  addInvite(i: InviteRow): void;
  inviteBySecret(hash: Uint8Array): InviteRow | null;
  inviteById(id: string): InviteRow | null;
  useInvite(id: string, now: number): boolean;
  unuseInvite(id: string): void;
  revokeInvite(id: string, now: number): void;
  listInvites(room: RoomId): InviteRow[];
  countActiveInvites(room: RoomId, now: number): number;
  addEvent(id: RoomId, at: number, kind: string, actor: Actor | null, data: object): void;
  events(id: RoomId, afterN: number, limit: number): EventRow[];
  deleteRoom(id: RoomId): void;
  removeCrossMembers(a: DeviceId, b: DeviceId): RoomId[];
  deleteInvitesBetween(a: DeviceId, b: DeviceId): number;
  sweep(now: number, closedRetentionMs: number, idleExpireMs: number): { closed: number; erased: number };
}

const SUBMISSIONS_KEPT = 8;
const REOPEN_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const TRANSITIONS: Record<RoomState, readonly RoomState[]> = {
  open: ["locked", "idle", "closed", "corrupt"],
  locked: ["open", "idle", "closed"],
  idle: ["open", "closed"],
  closed: ["open"],
  corrupt: ["open"],
};

const DEFAULT_SETTINGS: RoomSettings = {
  codeMode: "baton",
  runControl: "editors",
  spectatorCursors: false,
  locked: false,
  maxMembers: 8,
  maxSpectators: 8,
};

const ROOM_COLUMNS =
  "id, project_id, title, creator_device, host_actor, baton_actor, runner_actor, state, epoch, seq, chain, state_hash, opschema, settings, pinned, created_at, last_active_at, closed_at";
const MEMBER_COLUMNS = "room_id, device_id, actor, role, spectator, muted, banned, name, color, joined_at";
const OP_COLUMNS = "room_id, seq, env, author_actor, kind, target, at, chain";
const CHECKPOINT_COLUMNS = "room_id, seq, state_hash, chain, doc, at, kind";
const INVITE_COLUMNS = "id, room_id, creator, secret_hash, kind, role, max_uses, uses, expires_at, revoked_at, target_device";

type RoomColumns = Omit<RoomRow, "settings" | "pinned"> & Row & { settings: string; pinned: number };
type MemberColumns = Omit<MemberRow, "spectator" | "muted" | "banned"> & Row & { spectator: number; muted: number; banned: number };
type InviteColumns = Omit<InviteRow, "kind"> & Row & { kind: "direct" | "link" };
type EventColumns = Omit<EventRow, "data"> & Row & { data: string };

export function packDoc(canonicalJson: string): Uint8Array {
  return gzipSync(canonicalJson);
}

export function unpackDoc(doc: Uint8Array): string {
  return gunzipSync(doc).toString("utf8");
}

function parseSettings(text: string): RoomSettings {
  const raw: unknown = JSON.parse(text);
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) throw new Error("room settings are not an object");
  const value = { ...DEFAULT_SETTINGS, ...raw } as Record<string, unknown>;
  const count = (key: "maxMembers" | "maxSpectators", min: number, max: number) => {
    const n = value[key];
    return typeof n === "number" && Number.isInteger(n) && n >= min && n <= max;
  };
  const valid =
    (value.codeMode === "baton" || value.codeMode === "open") &&
    (value.runControl === "editors" || value.runControl === "host") &&
    typeof value.spectatorCursors === "boolean" &&
    typeof value.locked === "boolean" &&
    count("maxMembers", 2, 8) &&
    count("maxSpectators", 0, 8);
  if (!valid) throw new Error("room settings do not match RoomSettings");
  return value as RoomSettings;
}

function toRoom(row: RoomColumns): RoomRow {
  return { ...row, settings: parseSettings(row.settings), pinned: row.pinned === 1 };
}

function toMember(row: MemberColumns): MemberRow {
  return { ...row, spectator: row.spectator === 1, muted: row.muted === 1, banned: row.banned === 1 };
}

function toInvite(row: InviteColumns): InviteRow {
  return { ...row, kind: row.kind === "direct" ? "buddy" : "link" };
}

function toEvent(row: EventColumns): EventRow {
  return { ...row, data: JSON.parse(row.data) };
}

function flag(value: boolean): number {
  return value ? 1 : 0;
}

function patchColumns(tx: Tx, table: string, where: string, whereParams: SqlValue[], columns: Record<string, SqlValue | undefined>): void {
  const entries = Object.entries(columns).filter((entry): entry is [string, SqlValue] => entry[1] !== undefined);
  if (entries.length === 0) return;
  const set = entries.map(([column]) => `${column} = ?`).join(", ");
  tx.run(`UPDATE ${table} SET ${set} WHERE ${where}`, ...entries.map(([, value]) => value), ...whereParams);
}

function memberColumns(p: MemberPatch): Record<string, SqlValue | undefined> {
  return {
    role: p.role,
    spectator: p.spectator === undefined ? undefined : flag(p.spectator),
    muted: p.muted === undefined ? undefined : flag(p.muted),
    banned: p.banned === undefined ? undefined : flag(p.banned),
    name: p.name,
    color: p.color,
  };
}

function insertEvent(tx: Tx, room: RoomId, at: number, kind: string, actor: Actor | null, data: object): void {
  tx.run(
    "INSERT INTO events (room_id, n, at, kind, actor, data) SELECT ?, COALESCE(MAX(n), 0) + 1, ?, ?, ?, ? FROM events WHERE room_id = ?",
    room,
    at,
    kind,
    actor,
    JSON.stringify(data),
    room,
  );
}

function insertCheckpoint(tx: Tx, c: CheckpointRow): void {
  tx.run(
    "INSERT OR REPLACE INTO checkpoints (room_id, seq, state_hash, chain, doc, at, kind) VALUES (?, ?, ?, ?, ?, ?, ?)",
    c.room_id,
    c.seq,
    c.state_hash,
    c.chain,
    c.doc,
    c.at,
    c.kind,
  );
}

function insertMember(tx: Tx, m: MemberRow): void {
  tx.run(
    `INSERT INTO room_members (${MEMBER_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (room_id, device_id) DO UPDATE SET actor = excluded.actor, role = excluded.role, spectator = excluded.spectator,
       muted = excluded.muted, banned = excluded.banned, name = excluded.name, color = excluded.color`,
    m.room_id,
    m.device_id,
    m.actor,
    m.role,
    flag(m.spectator),
    flag(m.muted),
    flag(m.banned),
    m.name,
    m.color,
    m.joined_at,
  );
}

function requireRoom(tx: Tx, id: RoomId): RoomRow {
  const row = tx.get<RoomColumns>(`SELECT ${ROOM_COLUMNS} FROM rooms WHERE id = ?`, id);
  if (!row) throw new Error(`room ${id} does not exist`);
  return toRoom(row);
}

function appendOne(tx: Tx, w: CommitWrite, expectedSeq0: number): number {
  const first = w.ops[0];
  if (!first || first.seq !== expectedSeq0) {
    throw new Error(`commit for ${w.room_id} starts at ${first?.seq}, expected ${expectedSeq0}`);
  }
  w.ops.forEach((op, i) => {
    if (op.seq !== expectedSeq0 + i) throw new Error(`commit for ${w.room_id} has a gap at op ${op.seq}`);
    tx.run(
      "INSERT INTO ops (room_id, seq, env, author_actor, kind, target, at, chain) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      w.room_id,
      op.seq,
      op.env,
      op.author_actor,
      op.kind,
      op.target,
      op.at,
      op.chain,
    );
  });
  const seq1 = expectedSeq0 + w.ops.length - 1;
  tx.run(
    "INSERT INTO submissions (room_id, device_id, first_op_id, seq0, seq1, inverse, at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    w.room_id,
    w.device_id,
    w.first_op_id,
    expectedSeq0,
    seq1,
    w.inverse,
    w.at,
  );
  tx.run(
    `DELETE FROM submissions WHERE room_id = ? AND device_id = ? AND first_op_id NOT IN
       (SELECT first_op_id FROM submissions WHERE room_id = ? AND device_id = ? ORDER BY seq0 DESC LIMIT ${SUBMISSIONS_KEPT})`,
    w.room_id,
    w.device_id,
    w.room_id,
    w.device_id,
  );
  for (const e of w.events ?? []) insertEvent(tx, w.room_id, w.at, e.kind, e.actor, e.data);
  for (const a of w.acl ?? []) {
    if ("remove" in a) tx.run("DELETE FROM room_members WHERE room_id = ? AND device_id = ?", w.room_id, a.device);
    else patchColumns(tx, "room_members", "room_id = ? AND device_id = ?", [w.room_id, a.device], memberColumns(a.patch));
  }
  return seq1;
}

export function createRoomsRepo(store: ServerStore): RoomsRepo {
  const getRoomTx = (tx: Tx, id: RoomId): RoomRow | null => {
    const row = tx.get<RoomColumns>(`SELECT ${ROOM_COLUMNS} FROM rooms WHERE id = ?`, id);
    return row ? toRoom(row) : null;
  };

  return {
    createRoom(r, genesis, creator) {
      return store.transaction((tx) => {
        tx.run(
          `INSERT INTO rooms (${ROOM_COLUMNS}) VALUES (?, ?, ?, ?, ?, NULL, NULL, 'open', ?, ?, ?, ?, ?, ?, 0, ?, ?, NULL)`,
          r.id,
          r.project_id,
          r.title,
          r.creator_device,
          r.host_actor,
          r.epoch,
          genesis.seq,
          genesis.chain,
          genesis.state_hash,
          r.opschema,
          JSON.stringify(r.settings),
          r.created_at,
          r.created_at,
        );
        insertMember(tx, creator);
        insertCheckpoint(tx, genesis);
        insertEvent(tx, r.id, r.created_at, "room.open", creator.actor, {});
        return requireRoom(tx, r.id);
      });
    },

    getRoom: (id) => store.read((tx) => getRoomTx(tx, id)),

    listRoomsFor: (device) =>
      store.read((tx) =>
        tx
          .all<RoomColumns>(
            `SELECT ${ROOM_COLUMNS.split(", ").map((c) => `r.${c}`).join(", ")} FROM rooms r
             JOIN room_members m ON m.room_id = r.id WHERE m.device_id = ? AND m.banned = 0 ORDER BY r.created_at, r.id`,
            device,
          )
          .map(toRoom),
      ),

    countStored: () => store.read((tx) => tx.get<{ n: number }>("SELECT COUNT(*) AS n FROM rooms WHERE state <> 'closed'")?.n ?? 0),

    countStoredBy: (device) =>
      store.read((tx) => tx.get<{ n: number }>("SELECT COUNT(*) AS n FROM rooms WHERE creator_device = ? AND state <> 'closed'", device)?.n ?? 0),

    setState(id, state, at) {
      store.transaction((tx) => {
        const room = requireRoom(tx, id);
        if (!TRANSITIONS[room.state].includes(state)) throw new Error(`room ${id} cannot go from ${room.state} to ${state}`);
        if (room.state === "closed" && (room.closed_at === null || at - room.closed_at > REOPEN_WINDOW_MS)) {
          throw new Error(`room ${id} was closed more than 30 days ago`);
        }
        tx.run("UPDATE rooms SET state = ?, closed_at = ?, last_active_at = ? WHERE id = ?", state, state === "closed" ? at : null, at, id);
      });
    },

    patchRoom(id, patch) {
      store.transaction((tx) => {
        requireRoom(tx, id);
        patchColumns(tx, "rooms", "id = ?", [id], {
          host_actor: patch.host_actor,
          baton_actor: patch.baton_actor,
          settings: patch.settings === undefined ? undefined : JSON.stringify(patch.settings),
          pinned: patch.pinned === undefined ? undefined : flag(patch.pinned),
          epoch: patch.epoch,
        });
      });
    },

    appendCommits(ws) {
      store.transaction((tx) => {
        const tails = new Map<RoomId, { seq: number; chain: string; state_hash: string; at: number }>();
        for (const w of ws) {
          const tail = tails.get(w.room_id);
          const seq = tail ? tail.seq : requireRoom(tx, w.room_id).seq;
          const last = w.ops[w.ops.length - 1];
          const seq1 = appendOne(tx, w, seq + 1);
          tails.set(w.room_id, { seq: seq1, chain: last?.chain ?? "", state_hash: w.state_hash, at: w.at });
        }
        for (const [room, t] of tails) {
          tx.run("UPDATE rooms SET seq = ?, chain = ?, state_hash = ?, last_active_at = ? WHERE id = ?", t.seq, t.chain, t.state_hash, t.at, room);
        }
      });
    },

    loadTail: (id, fromExclusive, limit) =>
      store.read((tx) =>
        tx.all<OpRow>(`SELECT ${OP_COLUMNS} FROM ops WHERE room_id = ? AND seq > ? ORDER BY seq LIMIT ?`, id, fromExclusive, limit),
      ),

    chainAt: (id, seq) =>
      store.read(
        (tx) =>
          tx.get<{ chain: string }>("SELECT chain FROM ops WHERE room_id = ? AND seq = ?", id, seq)?.chain ??
          tx.get<{ chain: string }>("SELECT chain FROM checkpoints WHERE room_id = ? AND seq = ?", id, seq)?.chain ??
          null,
      ),

    putCheckpoint: (c) => store.transaction((tx) => insertCheckpoint(tx, c)),

    latestCheckpoint: (id, atOrBefore) =>
      store.read(
        (tx) =>
          tx.get<CheckpointRow>(
            `SELECT ${CHECKPOINT_COLUMNS} FROM checkpoints WHERE room_id = ? AND seq <= ? ORDER BY seq DESC LIMIT 1`,
            id,
            atOrBefore ?? Number.MAX_SAFE_INTEGER,
          ) ?? null,
      ),

    pruneCheckpoints: (id, keep) =>
      store.transaction(
        (tx) =>
          tx.run(
            `DELETE FROM checkpoints WHERE room_id = ? AND kind = 'auto' AND seq NOT IN
               (SELECT seq FROM checkpoints WHERE room_id = ? AND kind = 'auto' ORDER BY seq DESC LIMIT ?)`,
            id,
            id,
            keep,
          ).changes,
      ),

    nullOldPayloads: (id, keepLatest) =>
      store.transaction(
        (tx) =>
          tx.run(
            "UPDATE ops SET env = NULL WHERE room_id = ? AND env IS NOT NULL AND seq <= (SELECT MAX(seq) FROM ops WHERE room_id = ?) - ?",
            id,
            id,
            keepLatest,
          ).changes,
      ),

    member: (id, device) =>
      store.read((tx) => {
        const row = tx.get<MemberColumns>(`SELECT ${MEMBER_COLUMNS} FROM room_members WHERE room_id = ? AND device_id = ?`, id, device);
        return row ? toMember(row) : null;
      }),

    members: (id) =>
      store.read((tx) =>
        tx.all<MemberColumns>(`SELECT ${MEMBER_COLUMNS} FROM room_members WHERE room_id = ? ORDER BY joined_at, device_id`, id).map(toMember),
      ),

    upsertMember: (m) => store.transaction((tx) => insertMember(tx, m)),

    patchMember: (id, device, p) =>
      store.transaction((tx) => patchColumns(tx, "room_members", "room_id = ? AND device_id = ?", [id, device], memberColumns(p))),

    removeMember: (id, device) =>
      store.transaction((tx) => {
        tx.run("DELETE FROM room_members WHERE room_id = ? AND device_id = ?", id, device);
      }),

    findSubmission: (id, device, firstOpId) =>
      store.read(
        (tx) =>
          tx.get<SubmissionRow>(
            "SELECT room_id, device_id, first_op_id, seq0, seq1, inverse, at FROM submissions WHERE room_id = ? AND device_id = ? AND first_op_id = ?",
            id,
            device,
            firstOpId,
          ) ?? null,
      ),

    addInvite: (i) =>
      store.transaction((tx) => {
        tx.run(
          `INSERT INTO room_invites (${INVITE_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          i.id,
          i.room_id,
          i.creator,
          i.secret_hash,
          i.kind === "buddy" ? "direct" : "link",
          i.role,
          i.max_uses,
          i.uses,
          i.expires_at,
          i.revoked_at,
          i.target_device,
        );
      }),

    inviteBySecret: (hash) =>
      store.read((tx) => {
        const row = tx.get<InviteColumns>(`SELECT ${INVITE_COLUMNS} FROM room_invites WHERE secret_hash = ?`, hash);
        return row ? toInvite(row) : null;
      }),

    inviteById: (id) =>
      store.read((tx) => {
        const row = tx.get<InviteColumns>(`SELECT ${INVITE_COLUMNS} FROM room_invites WHERE id = ?`, id);
        return row ? toInvite(row) : null;
      }),

    useInvite: (id, now) =>
      store.transaction(
        (tx) =>
          tx.run(
            "UPDATE room_invites SET uses = uses + 1 WHERE id = ? AND uses < max_uses AND revoked_at IS NULL AND expires_at > ?",
            id,
            now,
          ).changes === 1,
      ),

    unuseInvite: (id) =>
      store.transaction((tx) => {
        tx.run("UPDATE room_invites SET uses = uses - 1 WHERE id = ? AND uses > 0", id);
      }),

    revokeInvite: (id, now) =>
      store.transaction((tx) => {
        tx.run("UPDATE room_invites SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL", now, id);
      }),

    listInvites: (room) =>
      store.read((tx) =>
        tx.all<InviteColumns>(`SELECT ${INVITE_COLUMNS} FROM room_invites WHERE room_id = ? ORDER BY expires_at, id`, room).map(toInvite),
      ),

    countActiveInvites: (room, now) =>
      store.read(
        (tx) =>
          tx.get<{ n: number }>(
            "SELECT COUNT(*) AS n FROM room_invites WHERE room_id = ? AND revoked_at IS NULL AND expires_at > ? AND uses < max_uses",
            room,
            now,
          )?.n ?? 0,
      ),

    addEvent: (id, at, kind, actor, data) => store.transaction((tx) => insertEvent(tx, id, at, kind, actor, data)),

    events: (id, afterN, limit) =>
      store.read((tx) =>
        tx
          .all<EventColumns>("SELECT room_id, n, at, kind, actor, data FROM events WHERE room_id = ? AND n > ? ORDER BY n LIMIT ?", id, afterN, limit)
          .map(toEvent),
      ),

    deleteRoom: (id) =>
      store.transaction((tx) => {
        tx.run("DELETE FROM rooms WHERE id = ?", id);
      }),

    removeCrossMembers: (a, b) =>
      store.transaction((tx) => {
        const crossed = "(m.device_id = ? AND r.creator_device = ?) OR (m.device_id = ? AND r.creator_device = ?)";
        const params = [b, a, a, b];
        const touched = tx
          .all<{ room_id: RoomId }>(
            `SELECT DISTINCT m.room_id FROM room_members m JOIN rooms r ON r.id = m.room_id WHERE ${crossed} ORDER BY m.room_id`,
            ...params,
          )
          .map((row) => row.room_id);
        tx.run(
          `DELETE FROM room_members WHERE rowid IN
             (SELECT m.rowid FROM room_members m JOIN rooms r ON r.id = m.room_id WHERE ${crossed})`,
          ...params,
        );
        return touched;
      }),

    deleteInvitesBetween: (a, b) =>
      store.transaction(
        (tx) =>
          tx.run(
            "DELETE FROM room_invites WHERE kind = 'direct' AND ((creator = ? AND target_device = ?) OR (creator = ? AND target_device = ?))",
            a,
            b,
            b,
            a,
          ).changes,
      ),

    sweep: (now, closedRetentionMs, idleExpireMs) =>
      store.transaction((tx) => {
        const closed = tx.run(
          "UPDATE rooms SET state = 'closed', closed_at = ? WHERE state = 'idle' AND pinned = 0 AND last_active_at <= ?",
          now,
          now - idleExpireMs,
        ).changes;
        const erased = tx.run("DELETE FROM rooms WHERE state = 'closed' AND closed_at <= ?", now - closedRetentionMs).changes;
        return { closed, erased };
      }),
  };
}
