import { createHash } from "node:crypto";
import type { CollabLimits } from "../collab-config.ts";
import { badField, readObject } from "../http/auth.ts";
import { defineRoutes, type Ctx, type Reply, type RouteDef } from "../http/classes.ts";
import { ApiError } from "../http/errors.ts";
import type { Role } from "../rooms/permissions.ts";
import type { DeviceId, RoomId } from "../store/rooms.ts";
import { QuotaError, type AssetsRepo } from "./store.ts";

export type AssetRouteDeps = {
  repo: AssetsRepo;
  roleOf(room: RoomId, device: DeviceId): Role | null;
  roomsOf(device: DeviceId): RoomId[];
  roomListsAsset(room: RoomId, sha256Hex: string): boolean;
  limits: CollabLimits;
  now(): number;
};

export const ASSET_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/svg+xml",
  "image/webp",
  "model/gltf-binary",
  "model/stl",
  "application/pdf",
  "application/octet-stream",
  "application/json",
  "text/plain",
] as const;

type Sniff = { offset: number; bytes: number[] }[];

export const ASSET_SNIFF: Record<string, Sniff> = {
  "image/png": [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  "image/jpeg": [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  "image/webp": [
    { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
    { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] },
  ],
  "application/pdf": [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] }],
  "model/gltf-binary": [{ offset: 0, bytes: [0x67, 0x6c, 0x54, 0x46] }],
};

const HOUR = 3_600_000;
const SWEEP_AFTER_MS = 24 * HOUR;
const HOURLY_BYTES = 512 * 1024 * 1024;
const QUERY_MAX = 256;
const SHA256_HEX = /^[0-9a-f]{64}$/;
const ROOM_ID = /^rm_[a-z0-9]{1,64}$/;
const RANGE = /^bytes=(\d*)-(\d*)$/;

const notFound = (): ApiError => new ApiError(404, "not_found", "Not found.");

export function sniffMatches(mime: string, bytes: Uint8Array): boolean {
  const table = ASSET_SNIFF[mime];
  if (table === undefined) return true;
  return table.every(({ offset, bytes: magic }) => magic.every((byte, i) => bytes[offset + i] === byte));
}

function readMime(ctx: Ctx): string {
  const mime = (ctx.headers.get("content-type") ?? "").split(";", 1)[0]?.trim().toLowerCase() ?? "";
  if (!(ASSET_MIME_TYPES as readonly string[]).includes(mime)) {
    throw new ApiError(415, "unsupported_media_type", "This file type is not accepted.");
  }
  return mime;
}

/** The byte range a `Range` header asks for, null for none or for forms served whole, "bad" when unsatisfiable. */
function readRange(header: string | null, size: number): { start: number; end: number } | null | "bad" {
  const match = header === null ? null : RANGE.exec(header.trim());
  if (match === null) return null;
  const [, from = "", to = ""] = match;
  if (from === "" && to === "") return null;
  if (from === "") {
    const tail = Number(to);
    return tail === 0 ? "bad" : { start: Math.max(0, size - tail), end: size - 1 };
  }
  const start = Number(from);
  const end = to === "" ? size - 1 : Math.min(Number(to), size - 1);
  return start >= size || end < start ? "bad" : { start, end };
}

export function assetRoutes(deps: AssetRouteDeps): RouteDef[] {
  const { repo, limits } = deps;
  const asBytes = (hex: string): Uint8Array => Buffer.from(hex, "hex");

  const visible = (device: DeviceId, hex: string): boolean =>
    deps.roomsOf(device).some((room) => deps.roleOf(room, device) !== null && deps.roomListsAsset(room, hex));

  const put = (c: Ctx): Reply => {
    const device = (c.authed as NonNullable<Ctx["authed"]>).deviceId;
    const hex = c.params["sha256"] as string;
    if (!SHA256_HEX.test(hex)) throw badField("/sha256", "Send 64 lowercase hex characters.");
    const declared = c.headers.get("content-length");
    if (declared === null) throw new ApiError(411, "length_required", "Send a Content-Length.");
    if (Number(declared) > limits.assetBytes) throw new ApiError(413, "too_large", "The file is too large.");
    const mime = readMime(c);
    const roomParam = c.query.get("room");
    if (roomParam !== null) {
      const role = ROOM_ID.test(roomParam) ? deps.roleOf(roomParam, device) : null;
      if (role !== "owner" && role !== "editor") throw notFound();
    }
    const bytes = c.raw as Buffer;
    if (bytes.length === 0) throw new ApiError(422, "empty_file", "The file is empty.");
    if (!sniffMatches(mime, bytes)) throw new ApiError(415, "unsupported_media_type", "The file does not match its type.");
    const digest = createHash("sha256").update(bytes).digest();
    if (digest.toString("hex") !== hex) throw new ApiError(422, "hash_mismatch", "The file does not match its hash.");
    const now = deps.now();
    if (repo.usage(device, now - HOUR) + bytes.length > HOURLY_BYTES) {
      throw new ApiError(429, "rate_limited", "Too much uploaded in the last hour. Try again later.");
    }
    try {
      const outcome = repo.put(device, digest, bytes, mime, roomParam, now);
      return { status: outcome === "created" ? 201 : 200, body: { sha256: hex, size: bytes.length } };
    } catch (error) {
      if (error instanceof QuotaError) throw new ApiError(409, "quota", "The upload quota for this device is used up.");
      throw error;
    }
  };

  const get = (c: Ctx): Reply => {
    const device = (c.authed as NonNullable<Ctx["authed"]>).deviceId;
    const hex = c.params["sha256"] as string;
    const blob = SHA256_HEX.test(hex) && visible(device, hex) ? repo.get(asBytes(hex)) : null;
    if (blob === null) throw notFound();
    const size = blob.bytes.byteLength;
    const headers: Record<string, string> = {
      "content-type": blob.mime,
      "cache-control": "private, max-age=31536000, immutable",
      etag: `"${hex}"`,
      "accept-ranges": "bytes",
      "content-security-policy": "sandbox; default-src 'none'",
      "x-content-type-options": "nosniff",
    };
    const range = readRange(c.headers.get("range"), size);
    if (range === "bad") return { status: 416, headers: { ...headers, "content-range": `bytes */${size}` } };
    if (range === null) return { status: 200, bytes: blob.bytes, headers };
    return {
      status: 206,
      bytes: blob.bytes.subarray(range.start, range.end + 1),
      headers: { ...headers, "content-range": `bytes ${range.start}-${range.end}/${size}` },
    };
  };

  const query = (c: Ctx): Reply => {
    const device = (c.authed as NonNullable<Ctx["authed"]>).deviceId;
    const fields = readObject(c.body, ["sha256"], ["sha256"]);
    const list = fields["sha256"];
    if (!Array.isArray(list) || list.length < 1 || list.length > QUERY_MAX) {
      throw badField("/sha256", `Send 1 to ${QUERY_MAX} hashes.`);
    }
    if (!list.every((hash) => typeof hash === "string" && SHA256_HEX.test(hash))) {
      throw badField("/sha256", "Send 64 lowercase hex characters for each hash.");
    }
    const hashes = list as string[];
    if (new Set(hashes).size !== hashes.length) throw badField("/sha256", "Send each hash once.");
    const present: string[] = [];
    const missing: string[] = [];
    for (const hash of hashes) (repo.uploaded(device, hash) || visible(device, hash) ? present : missing).push(hash);
    return { status: 200, body: { present, missing } };
  };

  return defineRoutes([
    { method: "PUT", path: "/v1/assets/{sha256}", operation: "putAsset", cls: "device", bucket: "asset.write", maxBodyBytes: limits.assetBytes, rawBody: true, handler: put },
    { method: "POST", path: "/v1/assets/query", operation: "queryAssets", cls: "device", bucket: "read", handler: query },
    { method: "GET", path: "/v1/assets/{sha256}", operation: "getAsset", cls: "device", bucket: "read", handler: get },
  ]);
}
