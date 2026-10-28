import { parseEnrolmentCode } from "../protocol/identity.ts";

export type HashAction = { kind: "enrol"; code: string } | { kind: "pair"; token: string } | null;

const PAIR_TOKEN = /^[A-Za-z0-9_-]{22}$/;

export function parseHash(hash: string): HashAction {
  const text = hash.startsWith("#") ? hash.slice(1) : hash;
  if (text.startsWith("enrol=")) {
    const code = safeDecode(text.slice("enrol=".length));
    return code !== null && parseEnrolmentCode(code) ? { kind: "enrol", code } : null;
  }
  if (text.startsWith("/pair/")) {
    const token = text.slice("/pair/".length);
    return PAIR_TOKEN.test(token) ? { kind: "pair", token } : null;
  }
  return null;
}

export function enrolHash(code: string): string {
  return `#enrol=${encodeURIComponent(code)}`;
}

export function pairLink(origin: string, token: string): string {
  return `${origin}/together#/pair/${token}`;
}

function safeDecode(s: string): string | null {
  try {
    return decodeURIComponent(s);
  } catch {
    return null;
  }
}
