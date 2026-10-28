// @vitest-environment node
import { spawnSync } from "node:child_process";
import { createHash, generateKeyPairSync, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  AUTH_CONTEXT,
  base32Lower,
  canonicalCode,
  cleanDisplayName,
  deriveDeviceId,
  deriveIdentityId,
  fromBase64Url,
  isSpkiP256,
  keyThumbprint,
  parseEnrolmentCode,
  parsePairingCode,
  signingInput,
  toBase64Url,
} from "./identity.ts";

const repoRoot = new URL("../..", import.meta.url).pathname;

function spkiKey(): Uint8Array {
  const { publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  return new Uint8Array(publicKey.export({ type: "spki", format: "der" }));
}

function nodeBase32(b: Buffer): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz234567";
  let bits = "";
  for (const byte of b) bits += byte.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i < bits.length; i += 5) out += alphabet[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
  return out;
}

describe("ids derived from a key", () => {
  it("match node:crypto for 1,000 generated P-256 keys", () => {
    for (let i = 0; i < 1000; i++) {
      const spki = spkiKey();
      const digest = createHash("sha256").update(spki).digest();
      const thumb = keyThumbprint(spki);
      expect(thumb).toBe(digest.toString("base64url"));
      expect(thumb).toHaveLength(43);
      expect(deriveDeviceId(spki)).toBe(`dev_${nodeBase32(digest.subarray(0, 16))}`);
      expect(deriveDeviceId(spki)).toHaveLength(30);
      expect(deriveDeviceId(spki)).toMatch(/^dev_[a-z2-7]{26}$/);
      expect(deriveIdentityId(spki)).toBe(`usr_${nodeBase32(digest.subarray(0, 10))}`);
      expect(deriveIdentityId(spki)).toMatch(/^usr_[a-z2-7]{16}$/);
      expect(isSpkiP256(spki)).toBe(true);
    }
  });

  it("rejects a key of the wrong length or curve prefix", () => {
    const spki = spkiKey();
    expect(isSpkiP256(spki.subarray(0, 90))).toBe(false);
    expect(isSpkiP256(new Uint8Array([...spki, 0]))).toBe(false);
    const other = spki.slice();
    other[10] ^= 1;
    expect(isSpkiP256(other)).toBe(false);
  });
});

describe("encodings", () => {
  it("round-trips base64url and agrees with node", () => {
    for (let n = 0; n < 70; n++) {
      const b = randomBytes(n);
      const text = toBase64Url(new Uint8Array(b));
      expect(text).toBe(b.toString("base64url"));
      expect(Buffer.from(fromBase64Url(text) ?? [])).toEqual(b);
    }
  });

  it("refuses base64url that is padded, impure or not canonical", () => {
    expect(fromBase64Url("AA==")).toBeNull();
    expect(fromBase64Url("A+/A")).toBeNull();
    expect(fromBase64Url("A")).toBeNull();
    expect(fromBase64Url("AB")).toBeNull();
    expect(fromBase64Url("")).toEqual(new Uint8Array());
  });

  it("encodes RFC 4648 base32 in lower case without padding", () => {
    const enc = new TextEncoder();
    expect(base32Lower(enc.encode("foobar"))).toBe("mzxw6ytboi");
    expect(base32Lower(enc.encode("fo"))).toBe("mzxq");
    expect(base32Lower(new Uint8Array())).toBe("");
  });
});

describe("signingInput", () => {
  it("joins the context and five fields with line feeds", () => {
    expect(
      signingInput({ purpose: "login", audience: "iynk.example", challengeId: "ch_1", nonce: "n", keyThumbprint: "t" }),
    ).toBe("iynk.auth.v1\nlogin\niynk.example\nch_1\nn\nt");
  });
});

describe("codes", () => {
  it("canonicalises case, hyphens, spaces and look-alikes, and is idempotent", () => {
    expect(canonicalCode("ab12-cd34 ef")).toBe("AB12CD34EF");
    expect(canonicalCode("oOiIlL")).toBe("001111");
    const once = canonicalCode("o1l-xyz");
    expect(canonicalCode(once)).toBe(once);
  });

  it("parses pairing codes with or without the hyphen", () => {
    expect(parsePairingCode("ab12-cd34ef")).toEqual({ channel: "AB12", secret: "CD34EF" });
    expect(parsePairingCode("AB12CD34EF")).toEqual({ channel: "AB12", secret: "CD34EF" });
    expect(parsePairingCode("ab12-cd34e")).toBeNull();
    expect(parsePairingCode("ab12-cd34efg")).toBeNull();
    expect(parsePairingCode("ab1u-cd34ef")).toBeNull();
  });

  it("parses typed and link enrolment codes", () => {
    expect(parseEnrolmentCode("abcd-efgh-jkmn")).toEqual({ kind: "typed", canonical: "ABCDEFGHJKMN" });
    const link = toBase64Url(new Uint8Array(randomBytes(16)));
    expect(link).toHaveLength(22);
    expect(parseEnrolmentCode(link)).toEqual({ kind: "link", canonical: link });
  });

  it("refuses codes of the wrong length or alphabet", () => {
    expect(parseEnrolmentCode("ABCDEFGHJKM")).toBeNull();
    expect(parseEnrolmentCode("ABCDEFGHJKMNP")).toBeNull();
    expect(parseEnrolmentCode("ABCDEFGHJKMU")).toBeNull();
    expect(parseEnrolmentCode("A".repeat(21))).toBeNull();
    expect(parseEnrolmentCode("A".repeat(23))).toBeNull();
    expect(parseEnrolmentCode("")).toBeNull();
  });
});

describe("cleanDisplayName", () => {
  it("trims, collapses spaces and drops control and tab characters", () => {
    expect(cleanDisplayName("  Ada   Lovelace ")).toBe("Ada Lovelace");
    expect(cleanDisplayName("a\tb")).toBe("ab");
    expect(cleanDisplayName("a\u0007b\u007fc\u0085d")).toBe("abcd");
  });

  it("returns null for empty names, including ones made only of junk", () => {
    expect(cleanDisplayName("  ")).toBeNull();
    expect(cleanDisplayName("")).toBeNull();
    expect(cleanDisplayName("‮⁦​﻿")).toBeNull();
  });

  it("strips bidi and zero-width characters inside a name", () => {
    expect(cleanDisplayName("Bo‮b​")).toBe("Bob");
  });

  it("counts emoji with joiners, Devanagari clusters and Arabic marks as single graphemes", () => {
    const family = "👨‍👩‍👧‍👦";
    expect(cleanDisplayName(family.repeat(24))).toBe(family.repeat(24));
    expect(cleanDisplayName(family.repeat(25))).toBeNull();
    expect(cleanDisplayName("नमस्ते".repeat(6))).not.toBeNull();
    expect(cleanDisplayName("مَرْحَبًا".repeat(4))).not.toBeNull();
  });

  it("refuses a name over 24 graphemes, or cuts it when asked to truncate", () => {
    const long = "a".repeat(30);
    expect(cleanDisplayName(long)).toBeNull();
    expect(cleanDisplayName(long, { truncate: true })).toBe("a".repeat(24));
    expect(cleanDisplayName("a".repeat(23) + " bbb", { truncate: true })).toBe("a".repeat(23));
  });
});

describe("plain node", () => {
  it("imports the module with no flags and prints nothing on stderr", () => {
    const run = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", "import('./src/protocol/identity.ts').then(m => console.log(m.AUTH_CONTEXT))"],
      { cwd: repoRoot, encoding: "utf8" },
    );
    expect(run.stderr).toBe("");
    expect(run.stdout.trim()).toBe(AUTH_CONTEXT);
  });
});
