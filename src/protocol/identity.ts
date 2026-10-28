import { sha256Bytes } from "../core/sha256.ts";

export const AUTH_CONTEXT = "iynk.auth.v1";
export const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

const MAX_NAME = 24;
const BASE32 = "abcdefghijklmnopqrstuvwxyz234567";
const BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

const SPKI_P256_PREFIX = Uint8Array.of(
  0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a,
  0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x03, 0x42, 0x00,
);

// C0/C1 controls, DEL, zero-width and bidi override/isolate characters that let a name pose as another.
// eslint-disable-next-line no-control-regex
const NAME_JUNK = /[\u0000-\u001f\u007f-\u009f​‎‏‪-‮⁦-⁩﻿]/g;

export type ChallengePurpose = "login" | "register";

export function signingInput(p: {
  purpose: ChallengePurpose;
  audience: string;
  challengeId: string;
  nonce: string;
  keyThumbprint: string;
}): string {
  return [AUTH_CONTEXT, p.purpose, p.audience, p.challengeId, p.nonce, p.keyThumbprint].join("\n");
}

export function toBase64Url(b: Uint8Array): string {
  let out = "";
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0);
    out += BASE64URL[(n >> 18) & 63] + BASE64URL[(n >> 12) & 63];
    if (i + 1 < b.length) out += BASE64URL[(n >> 6) & 63];
    if (i + 2 < b.length) out += BASE64URL[n & 63];
  }
  return out;
}

/** Strict: only the canonical unpadded form decodes, so one byte string has one text. */
export function fromBase64Url(s: string): Uint8Array | null {
  if (s.length % 4 === 1) return null;
  const bytes = new Uint8Array(Math.floor((s.length * 3) / 4));
  let acc = 0;
  let bits = 0;
  let at = 0;
  for (const ch of s) {
    const v = BASE64URL.indexOf(ch);
    if (v < 0) return null;
    acc = (acc << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[at++] = (acc >> bits) & 255;
      acc &= (1 << bits) - 1;
    }
  }
  return acc === 0 ? bytes : null;
}

export function base32Lower(b: Uint8Array): string {
  let out = "";
  let acc = 0;
  let bits = 0;
  for (const byte of b) {
    acc = ((acc << 8) | byte) & 0xfff;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      out += BASE32[(acc >> bits) & 31];
    }
  }
  if (bits > 0) out += BASE32[(acc << (5 - bits)) & 31];
  return out;
}

export function keyThumbprint(spki: Uint8Array): string {
  return toBase64Url(sha256Bytes(spki));
}

export function deriveDeviceId(spki: Uint8Array): string {
  return `dev_${base32Lower(sha256Bytes(spki).subarray(0, 16))}`;
}

export function deriveIdentityId(spki: Uint8Array): string {
  return `usr_${base32Lower(sha256Bytes(spki).subarray(0, 10))}`;
}

export function isSpkiP256(b: Uint8Array): boolean {
  return b.length === 91 && SPKI_P256_PREFIX.every((v, i) => b[i] === v);
}

export function canonicalCode(s: string): string {
  return s
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
}

const TYPED_CODE = /^[0-9A-HJKMNP-TV-Z]{12}$/;
const LINK_TOKEN = /^[A-Za-z0-9_-]{22}$/;
const PAIRING_CODE = /^([0-9A-HJKMNP-TV-Z]{4})([0-9A-HJKMNP-TV-Z]{6})$/;

export function parseEnrolmentCode(
  s: string,
): { kind: "typed"; canonical: string } | { kind: "link"; canonical: string } | null {
  const text = s.trim();
  if (LINK_TOKEN.test(text) && fromBase64Url(text)) return { kind: "link", canonical: text };
  const canonical = canonicalCode(text);
  return TYPED_CODE.test(canonical) ? { kind: "typed", canonical } : null;
}

export function parsePairingCode(s: string): { channel: string; secret: string } | null {
  const match = PAIRING_CODE.exec(canonicalCode(s));
  return match ? { channel: match[1], secret: match[2] } : null;
}

function graphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), (part) => part.segment);
  }
  return Array.from(text);
}

export function cleanDisplayName(s: string, o: { truncate?: boolean } = {}): string | null {
  const text = s.replace(NAME_JUNK, "").replace(/\s+/g, " ").trim();
  const parts = graphemes(text);
  if (parts.length === 0) return null;
  if (parts.length > MAX_NAME) return o.truncate ? parts.slice(0, MAX_NAME).join("").trim() : null;
  return text;
}
