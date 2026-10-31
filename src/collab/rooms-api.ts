import type { Op, Project } from "../project/generated/types.ts";
import type { Actor, Role, RoomId, RoomSettings } from "../protocol/index.ts";
import type { ServerClient } from "../server-client/client.ts";
import { ClientError } from "../server-client/types.ts";
import { stripForShare } from "./share.ts";

export type RoomView = {
  id: RoomId;
  title: string;
  hostId: Actor;
  status: "open" | "locked" | "idle" | "closed" | "corrupt";
  epoch: string;
  seq: number;
  opSchema: string;
  settings: RoomSettings;
  members: { identityId: Actor; displayName: string; role: Role; connected: boolean }[];
  createdAt: string;
};

export type RoomInvite = {
  id: string;
  roomId: RoomId;
  kind: "buddy" | "link";
  buddy?: Actor | null;
  role: "editor" | "commenter" | "viewer";
  maxUses: number;
  uses: number;
  status: "open" | "used_up" | "revoked" | "expired";
  createdAt: string;
  expiresAt: string;
};

export type InviteRequest =
  | { link: true; role: "editor" | "viewer"; maxUses?: number; ttlSeconds?: number }
  | { buddy: Actor; role: "editor" | "commenter" | "viewer" };

export type RoomErrorKind = "needs_server" | "quota" | "tooLarge" | "invalid" | "expired" | "network";

export type OwnerBinding = { actorHint: Actor | null; name: string; thumbprint: string; identityId: Actor };

async function failure(res: Response): Promise<ClientError> {
  const body = (await res.json().catch(() => null)) as { error?: { code?: string; requestId?: string } } | null;
  return new ClientError(body?.error?.code ?? `http_${res.status}`, res.status, body?.error?.requestId ?? res.headers.get("x-request-id"));
}

async function send(c: ServerClient, path: string, init: RequestInit = {}): Promise<Response> {
  const res = await c.fetchAuthed(path, init);
  if (!res.ok) throw await failure(res);
  return res;
}

const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json", accept: "application/json" },
  body: JSON.stringify(body),
});

const roomPath = (room: RoomId) => `/rooms/${encodeURIComponent(room)}`;

async function readView(res: Response): Promise<RoomView> {
  return (await res.json()) as RoomView;
}

/** Ops that tie an owner actor of the document to this device's key, so the server accepts the upload. `[]` when one already is. */
export function prepareOwnerBinding(doc: Project, me: OwnerBinding): Op[] {
  const { owners } = doc.access;
  const thumbprintOf = (id: string) => doc.actors.find((actor) => actor.id === id)?.keyThumbprint;
  if (owners.some((id) => thumbprintOf(id) === me.thumbprint)) return [];
  const local = owners.find((id) => thumbprintOf(id) === undefined);
  const id = me.actorHint ?? local ?? me.identityId;
  const ops: Op[] = [{ k: "actor.set", actor: { id, name: me.name, keyThumbprint: me.thumbprint } }];
  if (!owners.includes(id)) ops.push({ k: "access.set", owners: [...owners, id] });
  return ops;
}

export async function createRoom(c: ServerClient, doc: Project, title: string, settings?: Partial<RoomSettings>): Promise<RoomView> {
  const body = { title, project: stripForShare(doc), ...(settings && { settings }) };
  return readView(await send(c, "/rooms", jsonInit("POST", body)));
}

export async function getRoom(c: ServerClient, id: RoomId): Promise<RoomView> {
  return readView(await send(c, roomPath(id), { headers: { accept: "application/json" } }));
}

export async function closeRoom(c: ServerClient, id: RoomId): Promise<void> {
  await send(c, roomPath(id), { method: "DELETE" });
}

export async function createInvite(c: ServerClient, room: RoomId, body: InviteRequest): Promise<{ invite: RoomInvite; token?: string }> {
  const res = await send(c, `${roomPath(room)}/invites`, jsonInit("POST", body));
  const { token, ...invite } = (await res.json()) as RoomInvite & { token?: string; url?: string };
  delete (invite as { url?: string }).url;
  return token === undefined ? { invite } : { invite, token };
}

export async function revokeInvite(c: ServerClient, room: RoomId, inviteId: string): Promise<void> {
  await send(c, `${roomPath(room)}/invites/${encodeURIComponent(inviteId)}`, { method: "DELETE" });
}

export async function redeemInvite(c: ServerClient, room: RoomId, token: string): Promise<RoomView> {
  return readView(await send(c, "/room-invites/redeem", jsonInit("POST", { room, token })));
}

export async function acceptInvite(c: ServerClient, room: RoomId, inviteId: string): Promise<RoomView> {
  return readView(await send(c, `${roomPath(room)}/invites/${encodeURIComponent(inviteId)}/accept`, { method: "POST" }));
}

export function describeRoomError(e: unknown): RoomErrorKind {
  if (!(e instanceof ClientError)) return "network";
  if (e.status === 413) return "tooLarge";
  if (e.status === 409 && e.code === "quota") return "quota";
  if (e.status === 422) return "invalid";
  if (e.status === 404 || e.status === 410) return "expired";
  if (e.status === 501) return "needs_server";
  return "network";
}
