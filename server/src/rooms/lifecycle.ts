import { utf8Length } from "../../../src/core/canonical.ts";
import type { Project } from "../../../src/project/generated/types.ts";
import { chainStart, stateHash } from "../../../src/project/hash.ts";
import { toCanonicalText } from "../../../src/project/normalize.ts";
import { OP_SCHEMA } from "../../../src/protocol/frames.ts";
import type { Actor, Role, RoomId, RoomSettings } from "../../../src/protocol/frames.ts";
import type { CollabLimits } from "../collab-config.ts";
import { iso } from "../http/auth.ts";
import type { DeviceRow } from "../identity/devices.ts";
import type { Logger } from "../ops/log.ts";
import type { Sleep } from "../deps.ts";
import { validateInWorker } from "../shares/validate-worker.ts";
import { packDoc } from "../store/rooms.ts";
import type { DeviceId, RoomRow, RoomState, RoomsRepo } from "../store/rooms.ts";
import { randomBase32, restoreFromCheckpoint } from "./checkpoint.ts";
import { IDLE_EXPIRE_MS, settleState } from "./registry.ts";
import type { RoomRegistry } from "./registry.ts";
import type { RoomCore } from "./core.ts";
import type { CommandRegistry, MemberRef, Outbound } from "./types.ts";

const DAY_MS = 86_400_000;
const VALIDATE_TIMEOUT_MS = 5000;
const ENVELOPE_ALLOWANCE = 1.1;
const ID_CHARS = 16;
const TITLE_MAX = 120;
const NAME_MAX = 24;
const EVENTS_MAX = 1000;

export const MEMBER_COLORS = ["#e5484d", "#f76b15", "#ffb224", "#30a46c", "#12a594", "#0090ff", "#6e56cf", "#d6409f"] as const;

export type LifecycleDeps = {
  repo: RoomsRepo;
  registry: RoomRegistry;
  commands: CommandRegistry;
  emit: (core: RoomCore, out: Outbound[]) => void;
  limits: CollabLimits;
  clock: () => number;
  random: (n: number) => Uint8Array;
  sleep: Sleep;
  log: Logger;
  device: (id: DeviceId) => DeviceRow | null;
};

export type RoomView = {
  id: RoomId;
  title: string;
  hostId: Actor;
  status: RoomState;
  epoch: string;
  seq: number;
  opSchema: string;
  settings: RoomSettings;
  members: { identityId: Actor; displayName: string; role: Role; connected: boolean }[];
  createdAt: string;
  closesAt: string | null;
  closedAt: string | null;
};

export type RoomEventView = { seq: number; at: string; kind: string; actor: Actor | null; data: object };

type Refusal = { ok: false; status: 400 | 403 | 409 | 413 | 422 | 429; code: string; message: string };
export type CreateOutcome = { ok: true; room: RoomView } | Refusal;

const refuse = (status: Refusal["status"], code: string, message: string): Refusal => ({ ok: false, status, code, message });
const badField = (path: string, message: string) => refuse(400, "bad_request", `${path}: ${message}`);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

function readSettings(raw: unknown, limits: CollabLimits): RoomSettings | Refusal {
  const settings: RoomSettings = {
    codeMode: "baton",
    runControl: "editors",
    spectatorCursors: false,
    locked: false,
    maxMembers: limits.maxMembers,
    maxSpectators: limits.maxSpectators,
  };
  if (raw === undefined) return settings;
  if (!isRecord(raw)) return badField("/settings", "Send a JSON object.");
  const whole = (value: unknown, min: number, max: number): value is number => typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
  for (const [key, value] of Object.entries(raw)) {
    switch (key) {
      case "codeMode":
        if (value === "open") return refuse(422, "code_mode_unavailable", "Open code mode is not available.");
        if (value !== "baton") return badField("/settings/codeMode", "Use baton.");
        break;
      case "runControl":
        if (value !== "editors" && value !== "host") return badField("/settings/runControl", "Use editors or host.");
        settings.runControl = value;
        break;
      case "spectatorCursors":
        if (typeof value !== "boolean") return badField("/settings/spectatorCursors", "Send true or false.");
        settings.spectatorCursors = value;
        break;
      case "locked":
        if (value !== false) return badField("/settings/locked", "Lock the room once it is open.");
        break;
      case "maxMembers":
        if (!whole(value, 2, limits.maxMembers)) return badField("/settings/maxMembers", `Use a whole number from 2 to ${limits.maxMembers}.`);
        settings.maxMembers = value;
        break;
      case "maxSpectators":
        if (!whole(value, 0, limits.maxSpectators)) return badField("/settings/maxSpectators", `Use a whole number from 0 to ${limits.maxSpectators}.`);
        settings.maxSpectators = value;
        break;
      default:
        return badField(`/settings/${key}`, "This field is not allowed.");
    }
  }
  return settings;
}

function quotaRefusal(d: LifecycleDeps, device: DeviceId): Refusal | null {
  const { repo, limits } = d;
  if (repo.countStoredBy(device) >= limits.storedRoomsPerDevice) {
    return refuse(409, "quota", `You have ${limits.storedRoomsPerDevice} rooms. Close one first.`);
  }
  if (repo.countStored() >= limits.maxStoredRooms) return refuse(409, "quota", "This server is full.");
  return null;
}

function refused(d: LifecycleDeps, reason: string, outcome: Refusal): Refusal {
  d.log.info("room.create_refused", { reason });
  return outcome;
}

/** The actor the caller signs as: an owner of the document whose key is the caller's device key. */
function boundOwner(doc: Project, thumbprint: string): Actor | null {
  const owner = doc.access.owners.find((id) => doc.actors.some((actor) => actor.id === id && actor.keyThumbprint === thumbprint));
  return (owner as Actor | undefined) ?? null;
}

export async function createRoom(d: LifecycleDeps, device: DeviceRow, body: unknown): Promise<CreateOutcome> {
  const { repo, limits, clock } = d;
  if (utf8Length(JSON.stringify(body)) > limits.maxProjectBytes * ENVELOPE_ALLOWANCE) {
    return refused(d, "size", refuse(413, "quota", "The project is larger than a room may hold."));
  }
  if (!isRecord(body)) return refused(d, "body", badField("", "Send a JSON object."));
  for (const key of Object.keys(body)) if (key !== "title" && key !== "project" && key !== "settings") return refused(d, "body", badField(`/${key}`, "This field is not allowed."));
  const { title, project } = body;
  if (typeof title !== "string" || title.trim() === "" || Array.from(title).length > TITLE_MAX) {
    return refused(d, "body", badField("/title", `Use 1 to ${TITLE_MAX} characters.`));
  }
  if (!isRecord(project)) return refused(d, "body", badField("/project", "Send a project document."));
  const settings = readSettings(body["settings"], limits);
  if ("ok" in settings) return refused(d, "settings", settings);

  const full = quotaRefusal(d, device.id);
  if (full) return refused(d, "quota", full);

  const checked = await validateInWorker(project, VALIDATE_TIMEOUT_MS);
  if (!checked.ok) {
    const outcome = checked.code === "quota" ? refuse(413, "quota", "The project is larger than a room may hold.") : refuse(422, checked.code, checked.message);
    return refused(d, "invalid", outcome);
  }
  if (checked.canonicalBytes > limits.maxProjectBytes) return refused(d, "size", refuse(413, "quota", "The project is larger than a room may hold."));

  const host = boundOwner(checked.doc, device.thumbprint);
  if (host === null) return refused(d, "owner_not_bound", refuse(422, "owner_not_bound", "Sign the project as one of its owners first."));

  const doc: Project = {
    ...checked.doc,
    history: { baseRevision: checked.doc.revision, baseChain: chainStart(checked.doc.id), checkpoints: [], ops: [] },
  };
  const lateFull = quotaRefusal(d, device.id);
  if (lateFull) return refused(d, "quota", lateFull);

  const now = clock();
  const id: RoomId = `rm_${randomBase32(d.random, ID_CHARS)}`;
  const row = repo.createRoom(
    {
      id,
      project_id: doc.id,
      title: title.trim(),
      creator_device: device.id,
      host_actor: host,
      epoch: randomBase32(d.random, 8),
      opschema: OP_SCHEMA,
      settings,
      created_at: now,
    },
    { room_id: id, seq: doc.revision, state_hash: stateHash(doc), chain: chainStart(doc.id), doc: packDoc(toCanonicalText(doc)), at: now, kind: "genesis" },
    {
      room_id: id,
      device_id: device.id,
      actor: host,
      role: "owner",
      spectator: false,
      muted: false,
      banned: false,
      name: device.name,
      color: MEMBER_COLORS[0],
      joined_at: now,
    },
  );
  d.log.info("room.open", { room: id });
  return { ok: true, room: viewOf(d, row) };
}

function viewOf(d: LifecycleDeps, room: RoomRow): RoomView {
  const connected = new Set(d.registry.live().find((core) => core.id === room.id)?.members().map((member) => member.actor));
  const closesAt =
    room.state === "closed" && room.closed_at !== null
      ? room.closed_at + d.limits.closedRetentionDays * DAY_MS
      : room.state === "idle"
        ? room.last_active_at + IDLE_EXPIRE_MS
        : null;
  return {
    id: room.id as RoomId,
    title: room.title,
    hostId: room.host_actor as Actor,
    status: room.state,
    epoch: room.epoch,
    seq: room.seq,
    opSchema: room.opschema,
    settings: room.settings,
    members: d.repo
      .members(room.id)
      .filter((member) => !member.banned)
      .map((member) => ({
        identityId: member.actor as Actor,
        displayName: Array.from(member.name).slice(0, NAME_MAX).join(""),
        role: member.role,
        connected: connected.has(member.actor as Actor),
      })),
    createdAt: iso(room.created_at),
    closesAt: closesAt === null ? null : iso(closesAt),
    closedAt: room.closed_at === null ? null : iso(room.closed_at),
  };
}

export function roomView(d: LifecycleDeps, id: RoomId, device: DeviceId): RoomView | null {
  const room = d.repo.getRoom(id);
  const member = d.repo.member(id, device);
  return room && member && !member.banned ? viewOf(d, room) : null;
}

export function listRoomsFor(d: LifecycleDeps, device: DeviceId): RoomView[] {
  return d.repo
    .listRoomsFor(device)
    .reverse()
    .map((room) => viewOf(d, room));
}

export function closeRoomByHttp(d: LifecycleDeps, device: DeviceRow, id: RoomId): { ok: true } | { ok: false; status: 404 } {
  const { repo, clock } = d;
  const room = repo.getRoom(id);
  const member = repo.member(id, device.id);
  if (!room || !member || member.banned || !(member.role === "owner" || member.actor === room.host_actor)) return { ok: false, status: 404 };
  if (room.state === "closed" || room.state === "corrupt") return { ok: true };

  const core = d.registry.live().find((live) => live.id === id);
  if (core) {
    const by: MemberRef = { m: 0, device: device.id as MemberRef["device"], actor: member.actor as Actor, role: member.role, spectator: false, name: member.name, color: member.color, muted: false, ready: true };
    d.emit(core, d.commands.handle(core, by, { t: "cmd", id: "http", name: "room.close" }));
    d.registry.forget(id);
  } else {
    const now = clock();
    repo.setState(id, "closed", now);
    repo.addEvent(id, now, "room.close", member.actor, { seq: room.seq, chain: room.chain });
  }
  d.log.info("room.close", { room: id });
  return { ok: true };
}

export function reopenRoom(d: LifecycleDeps, device: DeviceRow, id: RoomId): { ok: true; room: RoomView } | { ok: false; status: 404 | 409 | 410 } {
  const { repo, clock, limits } = d;
  const room = repo.getRoom(id);
  const member = repo.member(id, device.id);
  if (!room || !member || member.banned || member.role !== "owner") return { ok: false, status: 404 };
  const now = clock();

  if (room.state === "closed") {
    if (room.closed_at === null || now - room.closed_at > limits.closedRetentionDays * DAY_MS) return { ok: false, status: 410 };
    if (repo.countStoredBy(room.creator_device) >= limits.storedRoomsPerDevice) return { ok: false, status: 409 };
    repo.setState(id, "open", now);
    settleState(repo, room, now);
    repo.addEvent(id, now, "room.open", member.actor, { reopened: true });
  } else if (room.state === "corrupt") {
    if (restoreFromCheckpoint(repo, id, d.random, clock) === null) return { ok: false, status: 409 };
    settleState(repo, room, now);
  } else {
    return { ok: false, status: 409 };
  }
  d.log.info("room.open", { room: id, reopened: true });
  const reopened = roomView(d, id, device.id);
  return reopened ? { ok: true, room: reopened } : { ok: false, status: 404 };
}

export function listEvents(
  d: LifecycleDeps,
  device: DeviceRow,
  id: RoomId,
  after: number,
  limit: number,
): { items: RoomEventView[]; next: number | null } | null {
  const member = d.repo.member(id, device.id);
  if (!d.repo.getRoom(id) || !member || member.banned || member.role !== "owner") return null;
  const page = Math.min(limit, EVENTS_MAX);
  const rows = d.repo.events(id, after, page + 1);
  const items = rows.slice(0, page).map((row) => ({
    seq: row.n,
    at: iso(row.at),
    kind: row.kind,
    actor: row.actor as Actor | null,
    data: row.data as object,
  }));
  return { items, next: rows.length > page ? (items[items.length - 1]?.seq ?? null) : null };
}
