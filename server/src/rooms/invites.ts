import { createHash } from "node:crypto";
import type { Op } from "../../../src/project/generated/types.ts";
import type { Actor, DeviceId, RoomId } from "../../../src/protocol/frames.ts";
import { iso } from "../http/auth.ts";
import type { DeviceRow } from "../identity/devices.ts";
import type { InviteRole, InviteRow, MemberRow, RoomRow } from "../store/rooms.ts";
import { randomBase32 } from "./checkpoint.ts";
import { MEMBER_COLORS, roomView } from "./lifecycle.ts";
import type { LifecycleDeps, RoomView } from "./lifecycle.ts";
import type { LobbyHub } from "../ws/lobby.ts";

const HOUR_MS = 3_600_000;
const DIRECT_TTL_MS = 24 * HOUR_MS;
const LINK_TTL_DEFAULT_S = 86_400;
const LINK_TTL_MIN_S = 300;
const LINK_TTL_MAX_S = 604_800;
const LINK_USES_MAX = 20;
const TOKEN_BYTES = 16;
const ID_CHARS = 16;
const ROLES: readonly InviteRole[] = ["editor", "commenter", "viewer"];

export type InviteDeps = LifecycleDeps & {
  lobby: LobbyHub;
  isBuddy(a: string, b: string): boolean;
  deviceOf(identity: Actor): DeviceRow | null;
  publicUrl: string;
};

export type InviteStatus = "open" | "used_up" | "revoked" | "expired";

export type RoomInviteView = {
  id: string;
  roomId: RoomId;
  kind: "buddy" | "link";
  buddy: Actor | null;
  role: InviteRole;
  maxUses: number;
  uses: number;
  status: InviteStatus;
  createdAt: string;
  expiresAt: string;
};

export type CreateOutcome =
  | { ok: true; invite: RoomInviteView; token?: string; url?: string }
  | { ok: false; status: 400 | 404 | 409 | 422; code: string; message: string };

export type JoinOutcome = { ok: true; room: RoomView } | { ok: false; status: 404 | 409 | 503 };
export type AcceptOutcome = { ok: true; room: RoomView } | { ok: false; status: 404 | 409 | 410 | 503 };

const refuse = (status: 400 | 404 | 409 | 422, code: string, message: string): CreateOutcome => ({ ok: false, status, code, message });
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const whole = (value: unknown, min: number, max: number): value is number => typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
const hashOf = (token: string): Uint8Array => createHash("sha256").update(token).digest();
const roleOk = (value: unknown): value is InviteRole => ROLES.some((role) => role === value);

function statusOf(invite: InviteRow, now: number): InviteStatus {
  if (invite.revoked_at !== null) return "revoked";
  if (invite.uses >= invite.max_uses) return "used_up";
  return invite.expires_at <= now ? "expired" : "open";
}

function viewOf(d: InviteDeps, invite: InviteRow, createdAt: number): RoomInviteView {
  const target = invite.target_device === null ? null : d.device(invite.target_device);
  return {
    id: invite.id,
    roomId: invite.room_id as RoomId,
    kind: invite.kind,
    buddy: target === null ? null : (target.identityId as Actor),
    role: invite.role,
    maxUses: invite.max_uses,
    uses: invite.uses,
    status: statusOf(invite, d.clock()),
    createdAt: iso(createdAt),
    expiresAt: iso(invite.expires_at),
  };
}

/** Owners and the current host manage invites; anyone else gets the same answer as for a missing room. */
function manager(d: InviteDeps, by: DeviceRow, id: RoomId): { room: RoomRow; member: MemberRow } | null {
  const room = d.repo.getRoom(id);
  const member = d.repo.member(id, by.id);
  if (!room || !member || member.banned || room.state === "closed" || room.state === "corrupt") return null;
  return member.role === "owner" || member.actor === room.host_actor ? { room, member } : null;
}

function readLink(body: Record<string, unknown>): { maxUses: number; ttlMs: number } | CreateOutcome {
  for (const key of Object.keys(body)) if (key !== "link" && key !== "role" && key !== "maxUses" && key !== "ttlSeconds") return refuse(400, "bad_request", `/${key}: This field is not allowed.`);
  const role = body["role"] as InviteRole;
  const { maxUses = role === "editor" ? 1 : 5, ttlSeconds = LINK_TTL_DEFAULT_S } = body;
  if (!whole(maxUses, 1, LINK_USES_MAX)) return refuse(400, "bad_request", `/maxUses: Use a whole number from 1 to ${LINK_USES_MAX}.`);
  if (!whole(ttlSeconds, LINK_TTL_MIN_S, LINK_TTL_MAX_S)) return refuse(400, "bad_request", `/ttlSeconds: Use a whole number from ${LINK_TTL_MIN_S} to ${LINK_TTL_MAX_S}.`);
  return { maxUses, ttlMs: ttlSeconds * 1000 };
}

export function createInvite(d: InviteDeps, by: DeviceRow, room: RoomId, body: unknown): CreateOutcome {
  const { repo, clock } = d;
  const managed = manager(d, by, room);
  if (managed === null) return refuse(404, "not_found", "Not found.");
  if (!isRecord(body)) return refuse(400, "bad_request", "Send a JSON object.");
  const { role } = body;
  if (typeof role !== "string") return refuse(400, "bad_request", "/role: Use editor, commenter or viewer.");
  if (!roleOk(role)) return refuse(role === "owner" ? 422 : 400, role === "owner" ? "role_not_allowed" : "bad_request", "/role: Use editor, commenter or viewer.");

  const now = clock();
  const link = body["link"] === true;
  const buddy = body["buddy"];
  if (link === (buddy !== undefined)) return refuse(400, "bad_request", "Send either buddy or link.");

  let limits: { maxUses: number; ttlMs: number } = { maxUses: 1, ttlMs: DIRECT_TTL_MS };
  let target: DeviceRow | null = null;
  if (link) {
    const read = readLink(body);
    if ("ok" in read) return read;
    limits = read;
  } else {
    for (const key of Object.keys(body)) if (key !== "buddy" && key !== "role") return refuse(400, "bad_request", `/${key}: This field is not allowed.`);
    if (typeof buddy !== "string") return refuse(400, "bad_request", "/buddy: Send a buddy id.");
    target = d.deviceOf(buddy as Actor);
    if (target === null || target.revokedAt !== null || !d.isBuddy(by.id, target.id)) return refuse(404, "not_found", "Not found.");
    const seated = repo.member(room, target.id);
    if (seated?.banned) return refuse(404, "not_found", "Not found.");
    if (seated) return refuse(409, "already_member", "This buddy is already in the room.");
  }

  if (repo.countActiveInvites(room, now) >= d.limits.activeInvitesPerRoom) {
    return refuse(409, "quota", `This room has ${d.limits.activeInvitesPerRoom} open invites. Revoke one first.`);
  }

  const secret = Buffer.from(d.random(TOKEN_BYTES)).toString("base64url");
  const invite: InviteRow = {
    id: `rinv_${randomBase32(d.random, ID_CHARS)}`,
    room_id: room,
    creator: by.id,
    secret_hash: hashOf(secret),
    kind: link ? "link" : "buddy",
    role,
    max_uses: limits.maxUses,
    uses: 0,
    expires_at: now + limits.ttlMs,
    revoked_at: null,
    target_device: target?.id ?? null,
  };
  repo.addInvite(invite);
  repo.addEvent(room, now, "invite.create", managed.member.actor, { inviteId: invite.id, kind: invite.kind, role });
  const view = viewOf(d, invite, now);

  if (target !== null) {
    d.lobby.pushInvite(target.id as DeviceId, { room, from: by.identityId as Actor, title: managed.room.title, role, expires: view.expiresAt });
    return { ok: true, invite: view };
  }
  return { ok: true, invite: view, token: secret, url: `${new URL(d.publicUrl).origin}/#/join/${room}.${secret}` };
}

export function listInvites(d: InviteDeps, by: DeviceRow, room: RoomId): RoomInviteView[] | null {
  if (manager(d, by, room) === null) return null;
  const created = new Map<string, number>();
  for (const event of d.repo.events(room, 0, Number.MAX_SAFE_INTEGER)) {
    if (event.kind === "invite.create") created.set((event.data as { inviteId: string }).inviteId, event.at);
  }
  return d.repo.listInvites(room).map((invite) => viewOf(d, invite, created.get(invite.id) ?? invite.expires_at));
}

export function revokeInvite(d: InviteDeps, by: DeviceRow, room: RoomId, inviteId: string): boolean {
  const managed = manager(d, by, room);
  const invite = managed === null ? null : d.repo.inviteById(inviteId);
  if (managed === null || invite === null || invite.room_id !== room) return false;
  if (invite.revoked_at === null) {
    const now = d.clock();
    d.repo.revokeInvite(inviteId, now);
    d.repo.addEvent(room, now, "invite.revoke", managed.member.actor, { inviteId });
  }
  return true;
}

function seatsLeft(room: RoomRow, members: MemberRow[], role: InviteRole): boolean {
  const spectator = role === "viewer";
  const seated = members.filter((member) => !member.banned && (member.role === "viewer") === spectator).length;
  return seated < (spectator ? room.settings.maxSpectators : room.settings.maxMembers);
}

/** Admits the device once the invite has been spent: the member row, then the matching document ops as one system batch. */
function admit(d: InviteDeps, who: DeviceRow, room: RoomRow, invite: InviteRow): JoinOutcome {
  const { repo, clock } = d;
  const id = room.id as RoomId;
  const opened = d.registry.open(id);
  if (opened.status !== "ok") {
    repo.unuseInvite(invite.id);
    return { ok: false, status: opened.status === "live_cap" ? 503 : 404 };
  }
  const { core } = opened;
  const members = repo.members(id);
  const known = core.doc.actors.find((actor) => actor.keyThumbprint === who.thumbprint);
  const actor = (known?.id ?? who.identityId) as Actor;
  const color = MEMBER_COLORS.find((candidate) => !members.some((member) => member.color === candidate)) ?? MEMBER_COLORS[members.length % MEMBER_COLORS.length] ?? MEMBER_COLORS[0];
  const now = clock();
  const spectator = invite.role === "viewer";
  repo.upsertMember({ room_id: id, device_id: who.id, actor, role: invite.role, spectator, muted: false, banned: false, name: who.name, color, joined_at: now });

  const inviter = repo.member(id, invite.creator);
  const ops: Op[] = [
    { k: "actor.set", actor: { id: actor, name: who.name, keyThumbprint: who.thumbprint } },
    { k: "access.grant", actor, role: invite.role },
  ];
  try {
    d.emit(core, core.commitSystem((inviter?.actor ?? room.host_actor) as Actor, ops, "invite.redeem"));
  } catch (error) {
    repo.removeMember(id, who.id);
    repo.unuseInvite(invite.id);
    d.log.error("invite.commit_failed", { room: id, error: error instanceof Error ? error.message : String(error) });
    return { ok: false, status: 503 };
  }
  repo.addEvent(id, now, "invite.redeem", actor, { inviteId: invite.id });
  repo.addEvent(id, now, "role.change", actor, { actor, role: invite.role });
  const joined = roomView(d, id, who.id);
  return joined ? { ok: true, room: joined } : { ok: false, status: 503 };
}

const joinable = (room: RoomRow | null): room is RoomRow => room !== null && (room.state === "open" || room.state === "idle");

export function redeemLink(d: InviteDeps, who: DeviceRow, body: { room: RoomId; token: string }): JoinOutcome {
  const { repo, clock } = d;
  const invite = repo.inviteBySecret(hashOf(body.token));
  const room = invite?.kind === "link" && invite.room_id === body.room ? repo.getRoom(body.room) : null;
  if (invite === null || !joinable(room) || statusOf(invite, clock()) !== "open") return { ok: false, status: 404 };
  const seated = repo.member(room.id, who.id);
  if (seated?.banned) return { ok: false, status: 404 };
  if (seated) return { ok: true, room: roomView(d, room.id as RoomId, who.id) as RoomView };
  if (!seatsLeft(room, repo.members(room.id), invite.role)) return { ok: false, status: 409 };
  if (!repo.useInvite(invite.id, clock())) return { ok: false, status: 404 };
  return admit(d, who, room, invite);
}

export function acceptDirect(d: InviteDeps, who: DeviceRow, roomId: RoomId, inviteId: string): AcceptOutcome {
  const { repo, clock } = d;
  const invite = repo.inviteById(inviteId);
  const room = invite !== null && invite.kind === "buddy" && invite.room_id === roomId && invite.target_device === who.id ? repo.getRoom(roomId) : null;
  if (invite === null || !joinable(room) || !d.isBuddy(invite.creator, who.id)) return { ok: false, status: 404 };
  const seated = repo.member(room.id, who.id);
  if (seated?.banned) return { ok: false, status: 404 };
  if (seated) return { ok: false, status: 409 };
  if (statusOf(invite, clock()) !== "open") return { ok: false, status: 410 };
  if (!seatsLeft(room, repo.members(room.id), invite.role)) return { ok: false, status: 409 };
  if (!repo.useInvite(invite.id, clock())) return { ok: false, status: 410 };
  return admit(d, who, room, invite);
}
