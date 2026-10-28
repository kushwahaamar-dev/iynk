import { createPublicKey, verify } from "node:crypto";
import { base32Lower, fromBase64Url, signingInput, toBase64Url, type ChallengePurpose } from "../../../src/protocol/identity.ts";
import type { Deps } from "../deps.ts";

const CHALLENGE_TTL_MS = 60_000;
const DEFAULT_CAP = 10_000;
const SIGNATURE_BYTES = 64;

export type Challenge = {
  challengeId: string;
  purpose: ChallengePurpose;
  nonce: string;
  audience: string;
  expiresAt: number;
  signingInput: string;
};

export type ChallengeRequest = { purpose: "register"; keyThumbprint: string } | { purpose: "login"; identityId: string };

export type ConsumedChallenge = { purpose: ChallengePurpose; thumbprint: string; signingInput: string };

type Entry = ConsumedChallenge & { expiresAt: number };

export type ChallengeStore = {
  issue(req: ChallengeRequest, lookupThumbprint: (identityId: string) => string | null): Challenge;
  consume(challengeId: string): ConsumedChallenge | null;
};

/** Every entry lives the same time, so map insertion order is expiry order. */
export function createChallengeStore(deps: Deps, audience: string, cap = DEFAULT_CAP): ChallengeStore {
  const pending = new Map<string, Entry>();

  function evict(now: number): void {
    for (const [id, entry] of pending) {
      if (entry.expiresAt > now && pending.size < cap) break;
      pending.delete(id);
    }
  }

  return {
    issue(req, lookupThumbprint) {
      const now = deps.clock.now();
      evict(now);
      const thumbprint =
        req.purpose === "register" ? req.keyThumbprint : (lookupThumbprint(req.identityId) ?? toBase64Url(deps.ids.random(32)));
      const challengeId = `chl_${base32Lower(deps.ids.random(16))}`;
      const nonce = toBase64Url(deps.ids.random(32));
      const input = signingInput({ purpose: req.purpose, audience, challengeId, nonce, keyThumbprint: thumbprint });
      const expiresAt = now + CHALLENGE_TTL_MS;
      pending.set(challengeId, { purpose: req.purpose, thumbprint, signingInput: input, expiresAt });
      return { challengeId, purpose: req.purpose, nonce, audience, expiresAt, signingInput: input };
    },
    consume(challengeId) {
      const entry = pending.get(challengeId);
      if (!entry) return null;
      pending.delete(challengeId);
      if (entry.expiresAt <= deps.clock.now()) return null;
      return { purpose: entry.purpose, thumbprint: entry.thumbprint, signingInput: entry.signingInput };
    },
  };
}

/** ECDSA P-256 over SHA-256 with the raw 64-byte r||s form WebCrypto produces. Never throws. */
export function verifySignature(spki: Uint8Array, input: string, signatureB64: string): boolean {
  try {
    const signature = fromBase64Url(signatureB64);
    if (!signature || signature.length !== SIGNATURE_BYTES) return false;
    const key = createPublicKey({ key: Buffer.from(spki), format: "der", type: "spki" });
    return verify("sha256", Buffer.from(input, "utf8"), { key, dsaEncoding: "ieee-p1363" }, signature);
  } catch {
    return false;
  }
}
