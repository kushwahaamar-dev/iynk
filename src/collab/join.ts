import type { Library } from "../local/library.ts";
import type { Project } from "../project/generated/types.ts";
import { chainStart, foldChain, stateHash } from "../project/hash.ts";
import type { ProjectSession } from "../project/session.ts";
import { CLIENT_CAPS, OP_SCHEMA, WIRE_PROTOCOL } from "../protocol/index.ts";
import type { Actor, DeviceId, RoomId } from "../protocol/index.ts";
import { deriveDeviceId, toBase64Url } from "../protocol/identity.ts";
import type { ServerClient } from "../server-client/client.ts";
import type { DeviceKeyStore } from "../server-client/keys.ts";
import { ClientError, NeedsEnrolment } from "../server-client/types.ts";
import { RoomAuthority } from "./authority.ts";
import { RoomClient } from "./client.ts";
import type { HelloState, RoomClientOptions, Timers } from "./client.ts";
import { keepCopy, reconcileLocalCopy } from "./fork.ts";
import type { ApplyFn } from "./rebase.ts";
import { acceptInvite, createRoom, prepareOwnerBinding, redeemInvite } from "./rooms-api.ts";
import type { RoomView } from "./rooms-api.ts";
import { stripForShare, syncAssets } from "./share.ts";
import type { BlobReader } from "./share.ts";
import type { RoomTransport } from "./ws-transport.ts";
import type { HelloSigner } from "./ws-transport.ts";

const SIGN_PREFIX = "iynk.ws.v2";
const APP = "iynk-web";
const STORAGE_PREFIX = "iynk.room.";
const FRAGMENT = /^#\/join\/(rm_[a-z2-7]{16})\.([A-Za-z0-9_-]{22})$/;

export type RoomHandle = { room: RoomView; authority: RoomAuthority; client: RoomClient; leave(): void };

export type RoomOpenDeps = {
  client: ServerClient;
  library: Library;
  connect: (room: RoomId, hello: HelloState) => RoomTransport;
  applyFn: ApplyFn;
  readBlob: BlobReader;
  /** The project this device holds for the room, if any; the tab's remembered room ids and the library decide. */
  localCopy: (room: RoomId) => Promise<Project | null>;
  /** The room's chain value at a revision, or null when the server cannot say. */
  roomChainAt: (room: RoomId, rev: number) => Promise<string | null>;
  clock: () => number;
  random: () => number;
  timers: Timers;
  hidden: () => boolean;
  me: { name: string; identityId: Actor; thumbprint: string; device: DeviceId };
};

let current: Promise<RoomHandle> | null = null;

export function parseJoinFragment(hash: string): { room: RoomId; token: string } | null {
  const match = FRAGMENT.exec(hash);
  return match ? { room: match[1] as RoomId, token: match[2]! } : null;
}

/** The token travels in the fragment, so it never reaches a server log or a Referer header. */
export function inviteLink(origin: string, lang: string, room: RoomId, token: string): string {
  return `${origin}/${lang}/studio#/join/${room}.${token}`;
}

/** WebCrypto signs ECDSA in the fixed-width P1363 form, which is what the server verifies. */
export function createHelloSigner(keys: DeviceKeyStore, origin: string, aud: string): HelloSigner {
  return async (challenge, room) => {
    if (challenge.aud !== aud) throw new Error("The server named a different audience.");
    const key = await keys.get(origin);
    if (!key) throw new NeedsEnrolment();
    const bytes = new TextEncoder().encode([SIGN_PREFIX, aud, challenge.nonce, room ?? "lobby"].join("\n"));
    const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key.privateKey, bytes);
    return {
      t: "hello",
      protocol: WIRE_PROTOCOL,
      app: APP,
      opSchema: OP_SCHEMA,
      device: deriveDeviceId(key.publicSpki) as DeviceId,
      ...(room !== null && { room }),
      sig: toBase64Url(new Uint8Array(sig)),
      caps: [...CLIENT_CAPS],
    };
  };
}

function remember(project: string, room: RoomId): void {
  try {
    sessionStorage.setItem(STORAGE_PREFIX + project, room);
  } catch {
    // The room id is only a convenience for this tab.
  }
}

function forget(project: string): void {
  try {
    sessionStorage.removeItem(STORAGE_PREFIX + project);
  } catch {
    // Nothing was stored.
  }
}

function connected(d: RoomOpenDeps, room: RoomView, start: RoomClientOptions["start"]): RoomHandle {
  const client = new RoomClient({
    room: room.id,
    me: { device: d.me.device },
    connect: (hello) => d.connect(room.id, hello),
    applyFn: d.applyFn,
    clock: d.clock,
    random: d.random,
    timers: d.timers,
    hidden: d.hidden,
    start,
  });
  const authority = new RoomAuthority(client, d.clock);
  let project: string | null = null;
  const note = () => {
    project = client.confirmed?.id ?? null;
    if (project !== null) remember(project, room.id);
    return project !== null;
  };
  const off = note() ? () => undefined : client.on((e) => e.t === "view" && note() && off());
  client.start();
  return {
    room,
    authority,
    client,
    leave() {
      off();
      authority.leave();
      if (project !== null) forget(project);
      current = null;
    },
  };
}

function once(make: () => Promise<RoomHandle>): Promise<RoomHandle> {
  const run = make();
  current = run;
  run.catch(() => {
    if (current === run) current = null;
  });
  return run;
}

async function open(d: RoomOpenDeps, session: ProjectSession, title: string): Promise<RoomHandle> {
  const info = await d.client.probe();
  if (!info.features.rooms) throw new ClientError("needs_server", 501);

  const binding = prepareOwnerBinding(session.state, { actorHint: null, ...d.me });
  if (binding.length > 0) {
    const applied = session.apply(binding, { actor: session.state.access.owners[0], kind: "user" });
    if (!applied.ok) throw new ClientError("invalid", 422);
  }

  const doc = session.state;
  await syncAssets(
    d.client,
    doc.assets.map((asset) => asset.sha256),
    d.readBlob,
    undefined,
    new Map(doc.assets.map((asset) => [asset.sha256, asset.mediaType])),
  );
  const room = await createRoom(d.client, doc, title);
  return connected(d, room, { epoch: room.epoch, seq: room.seq, chain: chainStart(doc.id), doc: stripForShare(doc) });
}

/** Binds the creator to the device key, uploads what the room needs, creates the room and connects. One room per tab. */
export function openRoomFor(d: RoomOpenDeps, session: ProjectSession, title: string): Promise<RoomHandle> {
  return current ?? once(() => open(d, session, title));
}

async function join(d: RoomOpenDeps, id: RoomId, token: string | null, inviteId: string | undefined): Promise<RoomHandle> {
  let room: RoomView;
  if (token !== null) room = await redeemInvite(d.client, id, token);
  else if (inviteId !== undefined) room = await acceptInvite(d.client, id, inviteId);
  else throw new ClientError("invalid", 400);

  const local = await d.localCopy(room.id);
  if (local === null) return connected(d, room, null);
  const position = { rev: local.revision, chain: foldChain(local.history.baseChain, local.history.ops) };
  const roomChain = await d.roomChainAt(room.id, position.rev);
  const verdict = reconcileLocalCopy(position, () => roomChain);
  if (verdict === "ff") return connected(d, room, { local: { ...position, doc: local } });
  if (verdict === "separate") await keepCopy(d.library, local, { project: local.id, revision: local.revision, stateHash: stateHash(local) });
  return connected(d, room, null);
}

/** Redeems a link token, or accepts a buddy invite when `token` is null, then connects. The token is not kept. */
export async function joinRoom(d: RoomOpenDeps, room: RoomId, token: string | null, inviteId?: string): Promise<RoomHandle> {
  if (current) {
    const held = await current;
    if (held.room.id === room) return held;
    throw new ClientError("room_open", 409);
  }
  return once(() => join(d, room, token, inviteId));
}
