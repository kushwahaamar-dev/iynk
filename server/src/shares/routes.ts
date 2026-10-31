import { createHash } from "node:crypto";
import { newId } from "../../../src/core/ids.ts";
import type { Project } from "../../../src/project/generated/types.ts";
import { chainStart } from "../../../src/project/hash.ts";
import { toCanonicalText } from "../../../src/project/normalize.ts";
import { scanSecrets } from "../../../src/project/secret-scan.ts";
import type { CollabLimits } from "../collab-config.ts";
import { badField, iso, readObject } from "../http/auth.ts";
import { defineRoutes, type Authed, type Ctx, type Reply, type RouteDef } from "../http/classes.ts";
import { ApiError } from "../http/errors.ts";
import type { Logger } from "../ops/log.ts";
import { packDoc, unpackDoc, type DeviceId } from "../store/rooms.ts";
import { ShareQuotaError, type ShareAudience, type ShareRow, type SharesRepo } from "./store.ts";
import { validateInWorker } from "./validate-worker.ts";

export type ShareRouteDeps = {
  repo: SharesRepo;
  ownsBlob(owner: DeviceId, sha256Hex: string): boolean;
  isBuddy(a: DeviceId, b: DeviceId): boolean;
  blob(sha256: Uint8Array): { bytes: Uint8Array; mime: string } | null;
  authenticateBearer(header: string | null): Authed | null;
  limits: CollabLimits;
  now: () => number;
  random: (bytes: number) => Uint8Array;
  log: Logger;
  publicUrl: string;
};

type BinaryReply = Reply & { bytes: Uint8Array };

const DAY_MS = 86_400_000;
const VALIDATE_TIMEOUT_MS = 5000;
const TOKEN = /^[A-Za-z0-9_-]{22}$/;
const SHARE_ID = /^shr_[a-z0-9]{13}$/;
const SHA256_HEX = /^[0-9a-f]{64}$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T/;
const LABEL_MAX = 60;
const LIST_DEFAULT = 50;
const LIST_MAX = 100;
const MAX_EXPIRY_DAYS = 365;
const BASE32 = "0123456789abcdefghjkmnpqrstvwxyz";
const UNIQUE_TRIES = 3;

const notFound = (): ApiError => new ApiError(404, "not_found", "Not found.");
const hashToken = (token: string): Buffer => createHash("sha256").update(token).digest();
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isLive = (share: ShareRow, now: number): boolean => share.revoked_at === null && (share.expires_at === null || now < share.expires_at);

function shareId(random: (bytes: number) => Uint8Array): string {
  let bits = BigInt(`0x${Buffer.from(random(8)).toString("hex")}`);
  let id = "";
  for (let i = 0; i < 13; i += 1) {
    id = BASE32[Number(bits & 31n)] + id;
    bits >>= 5n;
  }
  return `shr_${id}`;
}

/** Keeps no author, no key and no history of the original: one new actor owns the copy. */
function anonymise(snapshot: Record<string, unknown>, actor: string, name: string, audience: ShareAudience): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...snapshot };
  delete copy["exports"];
  copy["actors"] = [{ id: actor, name }];
  copy["access"] = { owners: [actor], visibility: audience, grants: [], authority: "advisory" };
  copy["history"] = {
    baseRevision: typeof snapshot["revision"] === "number" ? snapshot["revision"] : 0,
    baseChain: typeof snapshot["id"] === "string" ? chainStart(snapshot["id"]) : "",
    checkpoints: [],
    ops: [],
  };
  if (isRecord(snapshot["provenance"])) {
    const provenance: Record<string, unknown> = { ...snapshot["provenance"], createdBy: actor };
    delete provenance["contributors"];
    copy["provenance"] = provenance;
  }
  return copy;
}

function readRange(header: string | null, size: number): { start: number; end: number } | "bad" | null {
  if (header === null) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (match[1] === "" && match[2] === "")) return "bad";
  const [from, to] = [match[1] as string, match[2] as string];
  const start = from === "" ? Math.max(0, size - Number(to)) : Number(from);
  const end = from === "" || to === "" ? size - 1 : Math.min(Number(to), size - 1);
  return start >= size || end < start ? "bad" : { start, end };
}

export function shareRoutes(deps: ShareRouteDeps): RouteDef[] {
  const { repo, limits, log } = deps;
  const maxExpiryDays = Math.min(MAX_EXPIRY_DAYS, limits.shareMaxDays ?? MAX_EXPIRY_DAYS);

  const view = (share: ShareRow) => ({
    id: share.id,
    audience: share.audience,
    revision: share.revision,
    stateHash: share.state_hash,
    allowFork: share.allow_fork,
    ...(share.label === null ? {} : { label: share.label }),
    createdAt: iso(share.created_at),
    expiresAt: share.expires_at === null ? null : iso(share.expires_at),
    lastOpenedAt: share.last_opened_at === null ? null : iso(share.last_opened_at),
    opens: share.opens,
    revokedAt: share.revoked_at === null ? null : iso(share.revoked_at),
  });

  const readExpiry = (value: unknown, now: number): number | null => {
    if (value === undefined) return now + Math.min(limits.shareDefaultDays, maxExpiryDays) * DAY_MS;
    if (value === null) {
      if (limits.shareMaxDays !== null) throw new ApiError(422, "invalid_expiry", "This server does not allow a share that never expires.");
      return null;
    }
    if (typeof value !== "string" || !TIMESTAMP.test(value) || Number.isNaN(Date.parse(value))) throw badField("/expiresAt", "Send a date and time.");
    const at = Date.parse(value);
    if (at <= now || at > now + maxExpiryDays * DAY_MS) {
      throw new ApiError(422, "invalid_expiry", `Choose a time up to ${maxExpiryDays} days from now.`);
    }
    return at;
  };

  const readLabel = (value: unknown): string | null => {
    if (value === undefined) return null;
    if (typeof value !== "string" || Array.from(value).length > LABEL_MAX) throw badField("/label", `Use at most ${LABEL_MAX} characters.`);
    return value.trim() === "" ? null : value.trim();
  };

  /** Every miss, whatever the reason, is the same 404. */
  const open = (c: Ctx): ShareRow => {
    const token = c.params["shareRef"] as string;
    const share = TOKEN.test(token) ? repo.byTokenHash(hashToken(token)) : null;
    const miss = (): never => {
      log.info("share.404");
      throw notFound();
    };
    if (share === null || !isLive(share, deps.now())) return miss();
    if (share.audience === "buddies") {
      const caller = deps.authenticateBearer(c.headers.get("authorization"));
      if (caller === null || (caller.deviceId !== share.owner && !deps.isBuddy(share.owner, caller.deviceId))) return miss();
    }
    return share;
  };

  const create = async (c: Ctx): Promise<Reply> => {
    const owner = c.authed as Authed;
    const fields = readObject(c.body, ["snapshot", "audience", "expiresAt", "allowFork", "label"], ["snapshot"]);
    const audience = fields["audience"] ?? "link";
    if (audience !== "link" && audience !== "buddies") throw badField("/audience", "Use link or buddies.");
    const allowFork = fields["allowFork"] ?? true;
    if (typeof allowFork !== "boolean") throw badField("/allowFork", "Send true or false.");
    const snapshot = fields["snapshot"];
    if (!isRecord(snapshot)) throw badField("/snapshot", "Send a project document.");
    if (audience === "link" && !limits.allowLinks) throw new ApiError(403, "links_disabled", "This server does not allow link shares.");
    const label = readLabel(fields["label"]);
    const now = deps.now();
    const expiresAt = readExpiry(fields["expiresAt"], now);

    const actor = newId("usr", { bytes: deps.random });
    const checked = await validateInWorker(anonymise(snapshot, actor, owner.name, audience), VALIDATE_TIMEOUT_MS);
    if (!checked.ok) throw new ApiError(422, checked.code, checked.message);
    if (checked.canonicalBytes > limits.maxProjectBytes) throw new ApiError(422, "quota", "The project is larger than this server allows.");

    const hits = scanSecrets(checked.doc);
    if (hits.length > 0) {
      throw new ApiError(422, "secret_in_document", "The project looks like it holds a secret.", hits.map((hit) => ({ code: hit.rule, severity: "error", path: hit.field })));
    }

    const hashes = [...new Set(checked.doc.assets.map((asset) => asset.sha256))];
    if (!hashes.every((hash) => deps.ownsBlob(owner.deviceId, hash))) throw new ApiError(422, "asset_missing", "Upload every file the project uses before sharing it.");

    const doc = packDoc(toCanonicalText(checked.doc));
    for (let attempt = 1; ; attempt += 1) {
      const token = Buffer.from(deps.random(16)).toString("base64url");
      const id = shareId(deps.random);
      try {
        const row = repo.create({
          id,
          token_hash: hashToken(token),
          owner: owner.deviceId,
          created_at: now,
          expires_at: expiresAt,
          doc,
          state_hash: checked.stateHash,
          audience,
          allow_fork: allowFork,
          label,
          revision: checked.doc.revision,
          blobs: hashes.map((hash) => Buffer.from(hash, "hex")),
        });
        log.info("share.create", { id: row.id, bytes: row.bytes, audience });
        return { status: 201, body: { ...view(row), token, url: `${deps.publicUrl}/en/studio#share=${token}` } };
      } catch (error) {
        if (error instanceof ShareQuotaError) throw new ApiError(409, "quota", "You have reached the limit for shares.");
        const clash = error instanceof Error && error.message.includes("UNIQUE constraint failed");
        if (!clash || attempt === UNIQUE_TRIES) throw error;
      }
    }
  };

  const list = (c: Ctx): Reply => {
    const { deviceId } = c.authed as Authed;
    const raw = c.query.get("limit");
    const limit = raw === null ? LIST_DEFAULT : Number(raw);
    if (!Number.isInteger(limit) || limit < 1 || limit > LIST_MAX) throw badField("/limit", `Use a whole number from 1 to ${LIST_MAX}.`);
    const { items, next } = repo.listOwned(deviceId, limit, c.query.get("cursor"));
    return { status: 200, body: { items: items.map(view), nextCursor: next } };
  };

  const revoke = (c: Ctx): Reply => {
    const { deviceId } = c.authed as Authed;
    const id = c.params["shareId"] as string;
    if (!SHARE_ID.test(id) || !repo.revoke(id, deviceId, deps.now())) throw notFound();
    return { status: 204 };
  };

  const openShare = (c: Ctx): Reply => {
    const share = open(c);
    const packed = repo.docOf(share.id);
    if (packed === null) throw notFound();
    const document = JSON.parse(unpackDoc(packed)) as Project;
    repo.touch(share.id, deps.now());
    log.info("share.open", { id: share.id });
    const seen = new Set<string>();
    const assets = document.assets
      .filter((asset) => !seen.has(asset.sha256) && seen.add(asset.sha256))
      .map((asset) => ({ sha256: asset.sha256, bytes: asset.bytes, mediaType: asset.mediaType }));
    const definitions = document.dependencies.components.flatMap((dep) =>
      dep.origin !== "builtin" && dep.digest !== undefined ? [{ ref: dep.ref, version: dep.version, digest: dep.digest }] : [],
    );
    return {
      status: 200,
      headers: { "referrer-policy": "no-referrer" },
      body: {
        share: { id: share.id, allowFork: share.allow_fork, revision: share.revision, expiresAt: share.expires_at === null ? null : iso(share.expires_at) },
        owner: { displayName: share.owner_name },
        stateHash: share.state_hash,
        document,
        assets,
        definitions,
      },
    };
  };

  const sharedAsset = (c: Ctx): Reply => {
    const share = open(c);
    const hex = c.params["sha256"] as string;
    const blob = SHA256_HEX.test(hex) && repo.hasBlob(share.id, Buffer.from(hex, "hex")) ? deps.blob(Buffer.from(hex, "hex")) : null;
    if (blob === null) throw notFound();
    const size = blob.bytes.byteLength;
    const headers: Record<string, string> = {
      "content-type": blob.mime,
      "cache-control": "private, max-age=31536000, immutable",
      etag: `"${hex}"`,
      "accept-ranges": "bytes",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
      ...(blob.mime === "image/svg+xml" && { "content-security-policy": "sandbox; default-src 'none'" }),
    };
    const range = readRange(c.headers.get("range"), size);
    if (range === "bad") return { status: 416, headers: { ...headers, "content-range": `bytes */${size}` } };
    const reply: BinaryReply =
      range === null
        ? { status: 200, bytes: blob.bytes, headers }
        : { status: 206, bytes: blob.bytes.subarray(range.start, range.end + 1), headers: { ...headers, "content-range": `bytes ${range.start}-${range.end}/${size}` } };
    return reply;
  };

  return defineRoutes([
    { method: "POST", path: "/v1/shares", operation: "createShare", cls: "device", bucket: "write", maxBodyBytes: limits.maxShareBytes, handler: create },
    { method: "GET", path: "/v1/shares", operation: "listShares", cls: "device", bucket: "read", handler: list },
    { method: "DELETE", path: "/v1/shares/{shareId}", operation: "revokeShare", cls: "device", bucket: "write", handler: revoke },
    { method: "GET", path: "/v1/shares/{shareRef}", operation: "openShare", cls: "capability", bucket: "share.read", handler: openShare },
    { method: "GET", path: "/v1/shares/{shareRef}/assets/{sha256}", operation: "getSharedAsset", cls: "capability", bucket: "share.read", handler: sharedAsset },
  ]);
}
