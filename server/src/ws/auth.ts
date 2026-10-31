import { createHash, createPublicKey, verify } from "node:crypto";
import type { Actor, DeviceId, Hello, RoomId } from "../../../src/protocol/frames.ts";
import { deriveDeviceId, fromBase64Url, toBase64Url } from "../../../src/protocol/identity.ts";
import type { CollabLimits } from "../collab-config.ts";
import type { NonceStore } from "./nonces.ts";

export const SIGN_PREFIX = "iynk.ws.v2";

const SIGNATURE_BYTES = 64;
const SIGNATURE_CHARS = 86;
const MINUTE_MS = 60_000;

export type DeviceRow = { id: DeviceId; identityId: Actor; publicKey: Uint8Array; name: string; revokedAt: number | null };
export type DeviceLookup = (id: DeviceId) => DeviceRow | null;

export type HelloContext = { aud: string; nonce: string; nonces: NonceStore; room: RoomId | null; lookup: DeviceLookup };
export type HelloResult = { ok: true; device: DeviceRow } | { ok: false; code: "unauthorized" };

const REFUSED: HelloResult = { ok: false, code: "unauthorized" };

export function signedBytes(aud: string, nonce: string, room: RoomId | null): Uint8Array {
  return Buffer.from([SIGN_PREFIX, aud, nonce, room ?? "lobby"].join("\n"), "utf8");
}

function signatureMatches(spki: Uint8Array, data: Uint8Array, sig: string): boolean {
  try {
    const signature = sig.length === SIGNATURE_CHARS ? fromBase64Url(sig) : null;
    if (!signature || signature.length !== SIGNATURE_BYTES) return false;
    const key = createPublicKey({ key: Buffer.from(spki), format: "der", type: "spki" });
    return verify("sha256", data, { key, dsaEncoding: "ieee-p1363" }, signature);
  } catch {
    return false;
  }
}

/** Every failure gives the same answer, so a caller cannot tell an unknown device from a revoked one. */
export function verifyHello(h: Hello, ctx: HelloContext): HelloResult {
  const fresh = ctx.nonces.consume(ctx.nonce);
  const device = ctx.lookup(h.device);
  if (!device) return REFUSED;
  const roomMatches = (h.room ?? null) === ctx.room;
  const selfCertifying = deriveDeviceId(device.publicKey) === device.id;
  const signed = signatureMatches(device.publicKey, signedBytes(ctx.aud, ctx.nonce, ctx.room), h.sig);
  return fresh && roomMatches && selfCertifying && signed && device.revokedAt === null ? { ok: true, device } : REFUSED;
}

export class AuthLimiter {
  private readonly failures = new Map<string, number[]>();
  private readonly lockedUntil = new Map<string, number>();

  private readonly limits: Pick<CollabLimits, "authFailuresPerMin" | "authLockoutMs">;
  private readonly clock: () => number;

  constructor(limits: Pick<CollabLimits, "authFailuresPerMin" | "authLockoutMs">, clock: () => number) {
    this.limits = limits;
    this.clock = clock;
  }

  failure(addrTag: string): void {
    const now = this.clock();
    const recent = (this.failures.get(addrTag) ?? []).filter((at) => at > now - MINUTE_MS);
    recent.push(now);
    if (recent.length >= this.limits.authFailuresPerMin) {
      this.lockedUntil.set(addrTag, now + this.limits.authLockoutMs);
      this.failures.delete(addrTag);
    } else {
      this.failures.set(addrTag, recent);
    }
  }

  blocked(addrTag: string): boolean {
    const until = this.lockedUntil.get(addrTag);
    if (until === undefined) return false;
    if (until > this.clock()) return true;
    this.lockedUntil.delete(addrTag);
    return false;
  }
}

export function addressTag(salt: Uint8Array, ip: string): string {
  return toBase64Url(createHash("sha256").update(salt).update(ip).digest().subarray(0, 12));
}
