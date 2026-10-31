// Wire protocol v2 (REALTIME_ARCHITECTURE 7.3 and 7.4, ADR-0501). Decisions: D6 (opSchema 1.1), D7 (frames use the
// structural WireOp and WireEnvelope because protocol imports core only), D14 (server_error), D21 (no run frames in B7).

export const WIRE_PROTOCOL = 2 as const;
export const OP_SCHEMA = "1.1" as const;

export type RoomId = `rm_${string}`;
export type Actor = `usr_${string}`;
export type DeviceId = `dev_${string}`;
export type ProjectId = `prj_${string}`;
export type Seq = number;
export type Time = string;
export type Role = "owner" | "editor" | "commenter" | "viewer";

export const CMD_NAMES = [
  "baton.request",
  "baton.grant",
  "baton.release",
  "baton.take",
  "host.pass",
  "host.claim",
  "member.kick",
  "member.mute",
  "room.lock",
  "room.settings",
  "room.close",
  "room.pin",
] as const;
export type CmdName = (typeof CMD_NAMES)[number];

export const CAPS = {
  clientInflated: 524288,
  clientWire: 131072,
  envelope: 65536,
  snapshotInflated: 6291456,
  snapshotWire: 1048576,
  otherServer: 262144,
  gzipAbove: 4096,
} as const;

export const CLIENT_CAPS = ["gzip", "cursors", "chat", "lobby"] as const;

export type RejectCode =
  | "malformed"
  | "duplicate_id"
  | "missing_target"
  | "missing_pin"
  | "pin_in_use"
  | "unknown_definition"
  | "missing_pin_map"
  | "referenced_by"
  | "invariant"
  | "stale_base"
  | "schema_mismatch"
  | "permission"
  | "not_baton"
  | "quota";

export type ErrorCode =
  | "bad_json"
  | "bad_frame"
  | "bad_type"
  | "too_large"
  | "unauthorized"
  | "room_unavailable"
  | "room_full"
  | "locked"
  | "kicked"
  | "superseded"
  | "upgrade_required"
  | "schema_mismatch"
  | "not_ready"
  | "permission"
  | "not_baton"
  | "rate_limited"
  | "quota"
  | "server_error"
  | RejectCode;

/** The op body. The protocol does not read it; `apply()` validates it. */
export type WireOp = Readonly<Record<string, unknown>>;

export type WireEnvelope = {
  opId: string;
  seq: number;
  base: number;
  author: { actor: Actor; kind: "user" | "ai" | "system"; proposal?: string };
  at: string;
  batch?: string;
  op: WireOp;
};

export type RoomSettings = {
  codeMode: "baton" | "open";
  runControl: "editors" | "host";
  spectatorCursors: boolean;
  locked: boolean;
  maxMembers: number;
  maxSpectators: number;
};

export type Member = {
  actor: Actor;
  m: number;
  name: string;
  color: string;
  role: Role;
  spectator: boolean;
  online: boolean;
  host: boolean;
  baton: boolean;
  runner: boolean;
  status?: string;
  app?: string;
};

export type RunState = {
  runId: string;
  state: string;
  runner: Actor | null;
  atSeq: Seq;
  seed: number;
  speed: number;
  horizonNs: number;
  versions: Readonly<Record<string, string>>;
  rseq: number;
};

export type PresencePatch = {
  name?: string;
  status?: string | null;
  view?: string;
  sel?: string[];
  focus?: string | null;
  typing?: string | null;
  vp?: { x: number; y: number; zoom: number };
};

export type EventKind = string;

export type Challenge = { t: "challenge"; protocol: typeof WIRE_PROTOCOL; nonce: string; aud: string; serverTime: Time };

export type Welcome = {
  t: "welcome";
  protocol: typeof WIRE_PROTOCOL;
  opSchema: typeof OP_SCHEMA;
  room: {
    id: RoomId;
    project: ProjectId;
    title: string;
    epoch: string;
    seq: Seq;
    chain: string;
    state: "open" | "locked";
    settings: RoomSettings;
  };
  you: { actor: Actor; m: number; role: Role; spectator: boolean; host: boolean };
  members: Member[];
  host: Actor | null;
  baton: Actor | null;
  runner: Actor | null;
  resume: "none" | "tail" | "snapshot" | "ff";
  epochBreak?: true;
  run: RunState | null;
  chat: number;
  limits: { submitPerSec: number; maxEnvelopeBytes: number; maxPending: number };
};

export type Snapshot = {
  t: "snapshot";
  reason: "join" | "resume" | "resync" | "epoch";
  seq: Seq;
  chain: string;
  stateHash: string;
  doc: Readonly<Record<string, unknown>>;
};

export type Tail = { t: "tail"; from: Seq; to: Seq; envs: WireEnvelope[]; chain: string };
export type Ready = { t: "ready"; seq: Seq };

export type Commit = {
  t: "commit";
  seq0: Seq;
  seq1: Seq;
  chain: string;
  envs?: WireEnvelope[];
  ack?: { sub: number; inverse: WireOp[]; dup?: true };
};

export type Reject = { t: "reject"; sub: number; code: RejectCode; index?: number; rule?: string; message: string };
export type Check = { t: "check"; seq: Seq; chain: string; stateHash?: string };
export type Presence = { t: "presence"; m: number; patch: PresencePatch };
export type Cursors = { t: "cursors"; c: [m: number, view: string, x_mm: number, y_mm: number][] };
export type Chat = { t: "chat"; id: string; m: number; text: string; lang: string; kind: "text" | "system"; at: Time };
export type RoomEvent = { t: "event"; at: Time; kind: EventKind; by?: Actor; data?: Record<string, unknown> };
export type ErrorFrame = {
  t: "error";
  code: ErrorCode;
  message: string;
  retryable: boolean;
  retryAfterMs?: number;
  ref?: string;
};
export type Pong = { t: "pong" };

export type LobbyBuddy = {
  actor: Actor;
  name: string;
  color: string;
  online: boolean;
  activity?: { room: RoomId; title: string };
};
export type LobbyBuddies = { t: "buddies"; list: LobbyBuddy[] };
export type LobbyBuddyPatch = { t: "buddy"; actor: Actor; patch: Partial<LobbyBuddy> };
export type LobbyInvite = { t: "invite"; room: RoomId; from: Actor; title: string; role: Role; expires: Time };

export type ServerFrame =
  | Challenge
  | Welcome
  | Snapshot
  | Tail
  | Ready
  | Commit
  | Reject
  | Check
  | Presence
  | Cursors
  | Chat
  | RoomEvent
  | ErrorFrame
  | Pong
  | LobbyBuddies
  | LobbyBuddyPatch
  | LobbyInvite;

export type Hello = {
  t: "hello";
  protocol: typeof WIRE_PROTOCOL;
  app: string;
  opSchema: typeof OP_SCHEMA;
  device: DeviceId;
  room?: RoomId;
  sig: string;
  caps: string[];
  resume?: { epoch: string; seq: Seq; chain: string };
  local?: { rev: Seq; chain: string };
  engines?: Record<string, string>;
};

export type SubmitOp = { opId: string; base: Seq; op: WireOp; kind?: "user" | "ai"; proposal?: string };
export type Submit = { t: "submit"; sub: number; batch?: string; ops: SubmitOp[] };
export type Resync = { t: "resync"; reason: "chain" | "hash" | "apply"; seq: Seq; chain: string };
export type PresenceUp = { t: "presence"; patch: PresencePatch };
export type CursorUp = { t: "cursor"; view: string; x_mm: number; y_mm: number };
export type ChatUp = { t: "chat"; id: string; text: string; lang: string };
export type Cmd = { t: "cmd"; id: string; name: CmdName; args?: Record<string, unknown> };
export type Ping = { t: "ping" };
export type Bye = { t: "bye" };

export type ClientFrame = Hello | Submit | Resync | PresenceUp | CursorUp | ChatUp | Cmd | Ping | Bye;
