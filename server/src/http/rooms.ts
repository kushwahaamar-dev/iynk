import type { RoomId } from "../../../src/protocol/frames.ts";
import { closeRoomByHttp, createRoom, listEvents, listRoomsFor, reopenRoom, roomView } from "../rooms/lifecycle.ts";
import type { LifecycleDeps } from "../rooms/lifecycle.ts";
import { badField } from "./auth.ts";
import { defineRoutes, type Authed, type Ctx, type Reply, type RouteDef } from "./classes.ts";
import { ApiError, unauthorized } from "./errors.ts";

const ROOM_ID = /^rm_[a-z2-7]{16}$/;
const STATUSES = ["open", "locked", "idle", "closed", "corrupt"] as const;
const NOT_FOUND_FLOOR_MS = 200;
const ENVELOPE_ALLOWANCE = 1.1;
const LIST_DEFAULT = 50;
const LIST_MAX = 100;
const EVENTS_DEFAULT = 100;
const EVENTS_MAX = 1000;

const notFound = (): ApiError => new ApiError(404, "not_found", "Not found.");

function readLimit(c: Ctx, fallback: number, max: number): number {
  const raw = c.query.get("limit");
  const limit = raw === null ? fallback : Number(raw);
  if (!Number.isInteger(limit) || limit < 1 || limit > max) throw badField("/limit", `Use a whole number from 1 to ${max}.`);
  return limit;
}

function readCursor(c: Ctx): number {
  const raw = c.query.get("cursor");
  if (raw === null) return 0;
  if (!/^\d{1,9}$/.test(raw)) throw badField("/cursor", "This cursor is not valid.");
  return Number(raw);
}

export function roomRoutes(d: LifecycleDeps): RouteDef[] {
  const caller = (c: Ctx) => {
    const device = d.device((c.authed as Authed).deviceId);
    if (device === null) throw unauthorized();
    return device;
  };

  /** Every miss takes the same time, so a stranger cannot tell a missing room from one they are not in. */
  const miss = async (started: number): Promise<never> => {
    await d.sleep(Math.max(0, NOT_FOUND_FLOOR_MS - (d.clock() - started)));
    throw notFound();
  };

  const roomIdOf = (c: Ctx): RoomId | null => {
    const id = c.params["roomId"] as string;
    return ROOM_ID.test(id) ? (id as RoomId) : null;
  };

  const list = (c: Ctx): Reply => {
    const { deviceId } = c.authed as Authed;
    const limit = readLimit(c, LIST_DEFAULT, LIST_MAX);
    const offset = readCursor(c);
    const status = c.query.get("status");
    if (status !== null && !STATUSES.some((known) => known === status)) throw badField("/status", "Use open, locked, idle, closed or corrupt.");
    const rooms = listRoomsFor(d, deviceId).filter((room) => status === null || room.status === status);
    const items = rooms.slice(offset, offset + limit);
    return { status: 200, body: { items, nextCursor: offset + limit < rooms.length ? String(offset + limit) : null } };
  };

  const create = async (c: Ctx): Promise<Reply> => {
    const outcome = await createRoom(d, caller(c), c.body);
    if (!outcome.ok) throw new ApiError(outcome.status, outcome.code, outcome.message);
    return { status: 201, body: outcome.room };
  };

  const get = async (c: Ctx): Promise<Reply> => {
    const started = d.clock();
    const id = roomIdOf(c);
    const room = id === null ? null : roomView(d, id, (c.authed as Authed).deviceId);
    return room === null ? miss(started) : { status: 200, body: room };
  };

  const close = async (c: Ctx): Promise<Reply> => {
    const started = d.clock();
    const id = roomIdOf(c);
    const outcome = id === null ? { ok: false as const } : closeRoomByHttp(d, caller(c), id);
    return outcome.ok ? { status: 204 } : miss(started);
  };

  const reopen = async (c: Ctx): Promise<Reply> => {
    const started = d.clock();
    const id = roomIdOf(c);
    const outcome = id === null ? ({ ok: false, status: 404 } as const) : reopenRoom(d, caller(c), id);
    if (outcome.ok) return { status: 200, body: outcome.room };
    if (outcome.status === 404) return miss(started);
    if (outcome.status === 410) throw new ApiError(410, "gone", "This room was closed too long ago to reopen.");
    throw new ApiError(409, "conflict", "This room cannot be reopened right now.");
  };

  const events = async (c: Ctx): Promise<Reply> => {
    const started = d.clock();
    const id = roomIdOf(c);
    const limit = readLimit(c, EVENTS_DEFAULT, EVENTS_MAX);
    const after = readCursor(c);
    const page = id === null ? null : listEvents(d, caller(c), id, after, limit);
    return page === null ? miss(started) : { status: 200, body: { items: page.items, nextCursor: page.next === null ? null : String(page.next) } };
  };

  return defineRoutes([
    { method: "GET", path: "/v1/rooms", operation: "listRooms", cls: "device", bucket: "read", handler: list },
    { method: "POST", path: "/v1/rooms", operation: "createRoom", cls: "device", bucket: "room.create", maxBodyBytes: Math.ceil(d.limits.maxProjectBytes * ENVELOPE_ALLOWANCE), handler: create },
    { method: "GET", path: "/v1/rooms/{roomId}", operation: "getRoom", cls: "device", bucket: "read", handler: get },
    { method: "DELETE", path: "/v1/rooms/{roomId}", operation: "closeRoom", cls: "device", bucket: "room.write", handler: close },
    { method: "POST", path: "/v1/rooms/{roomId}/reopen", operation: "reopenRoom", cls: "device", bucket: "room.write", handler: reopen },
    { method: "GET", path: "/v1/rooms/{roomId}/events", operation: "listRoomEvents", cls: "device", bucket: "room.read", handler: events },
  ]);
}
