import type { RoomId } from "../../../src/protocol/frames.ts";
import { acceptDirect, createInvite, listInvites, redeemLink, revokeInvite } from "../rooms/invites.ts";
import type { InviteDeps } from "../rooms/invites.ts";
import { badField } from "./auth.ts";
import { defineRoutes, type Authed, type Ctx, type Reply, type RouteDef } from "./classes.ts";
import { ApiError, unauthorized } from "./errors.ts";
import { notFound, readCursor, readLimit, ROOM_ID } from "./rooms.ts";

const INVITE_ID = /^rinv_[a-z2-7]{16}$/;
const TOKEN = /^[A-Za-z0-9_-]{22}$/;
const LIST_DEFAULT = 50;
const LIST_MAX = 100;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

export function inviteRoutes(d: InviteDeps): RouteDef[] {
  const caller = (c: Ctx) => {
    const device = d.device((c.authed as Authed).deviceId);
    if (device === null) throw unauthorized();
    return device;
  };

  const roomOf = (c: Ctx): RoomId => {
    const id = c.params["roomId"] as string;
    if (!ROOM_ID.test(id)) throw notFound();
    return id as RoomId;
  };

  const inviteOf = (c: Ctx): string => {
    const id = c.params["inviteId"] as string;
    if (!INVITE_ID.test(id)) throw notFound();
    return id;
  };

  const create = (c: Ctx): Reply => {
    const outcome = createInvite(d, caller(c), roomOf(c), c.body);
    if (outcome.ok) return { status: 201, body: { ...outcome.invite, ...(outcome.token !== undefined && { token: outcome.token, url: outcome.url }) } };
    throw outcome.status === 404 ? notFound() : new ApiError(outcome.status, outcome.code, outcome.message);
  };

  const list = (c: Ctx): Reply => {
    const limit = readLimit(c, LIST_DEFAULT, LIST_MAX);
    const offset = readCursor(c);
    const invites = listInvites(d, caller(c), roomOf(c));
    if (invites === null) throw notFound();
    return { status: 200, body: { items: invites.slice(offset, offset + limit), nextCursor: offset + limit < invites.length ? String(offset + limit) : null } };
  };

  const revoke = (c: Ctx): Reply => {
    if (!revokeInvite(d, caller(c), roomOf(c), inviteOf(c))) throw notFound();
    return { status: 204 };
  };

  const accept = (c: Ctx): Reply => {
    const outcome = acceptDirect(d, caller(c), roomOf(c), inviteOf(c));
    if (outcome.ok) return { status: 200, body: outcome.room };
    if (outcome.status === 410) throw new ApiError(410, "gone", "This invite is no longer open.");
    if (outcome.status === 409) throw new ApiError(409, "conflict", "You cannot join this room right now.");
    if (outcome.status === 503) throw new ApiError(503, "unavailable", "The room is busy. Try again shortly.");
    throw notFound();
  };

  const redeem = (c: Ctx): Reply => {
    const { body } = c;
    if (!isRecord(body)) throw badField("", "Send a JSON object.");
    for (const key of Object.keys(body)) if (key !== "room" && key !== "token") throw badField(`/${key}`, "This field is not allowed.");
    const { room, token } = body;
    if (typeof room !== "string" || !ROOM_ID.test(room)) throw badField("/room", "This room id is not valid.");
    if (typeof token !== "string" || !TOKEN.test(token)) throw badField("/token", "This token is not valid.");
    const outcome = redeemLink(d, caller(c), { room: room as RoomId, token });
    if (outcome.ok) return { status: 200, body: outcome.room };
    if (outcome.status === 409) throw new ApiError(409, "room_full", "This room is full.");
    if (outcome.status === 503) throw new ApiError(503, "unavailable", "The room is busy. Try again shortly.");
    throw notFound();
  };

  return defineRoutes([
    { method: "POST", path: "/v1/rooms/{roomId}/invites", operation: "createRoomInvite", cls: "device", bucket: "room.write", handler: create },
    { method: "GET", path: "/v1/rooms/{roomId}/invites", operation: "listRoomInvites", cls: "device", bucket: "room.read", handler: list },
    { method: "DELETE", path: "/v1/rooms/{roomId}/invites/{inviteId}", operation: "revokeRoomInvite", cls: "device", bucket: "room.write", handler: revoke },
    { method: "POST", path: "/v1/rooms/{roomId}/invites/{inviteId}/accept", operation: "acceptRoomInvite", cls: "device", bucket: "room.invite.redeem", handler: accept },
    { method: "POST", path: "/v1/room-invites/redeem", operation: "redeemRoomInvite", cls: "device", bucket: "room.invite.redeem", handler: redeem },
  ]);
}
