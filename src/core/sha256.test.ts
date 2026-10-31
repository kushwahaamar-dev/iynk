// @vitest-environment node
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { rng } from "./prng.ts";
import { sha256Bytes, sha256Hex } from "./sha256.ts";

const reference = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

describe("sha256Hex", () => {
  it("matches the NIST vectors", () => {
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(sha256Hex("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq")).toBe(
      "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1",
    );
  });

  it("hashes one million a", () => {
    expect(sha256Hex("a".repeat(1_000_000))).toBe(
      "cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0",
    );
  });

  it("agrees with node:crypto around every padding boundary", () => {
    for (const length of [55, 56, 57, 63, 64, 65, 119, 120, 128]) {
      const bytes = new Uint8Array(length).fill(0x61);
      expect(sha256Hex(bytes)).toBe(reference(bytes));
    }
  });

  it("agrees with node:crypto on 1,000 random byte arrays", () => {
    const r = rng(2026, "sha256");
    for (let i = 0; i < 1000; i++) {
      const bytes = new Uint8Array(r.next() % 301);
      for (let j = 0; j < bytes.length; j++) bytes[j] = r.next() & 0xff;
      expect(sha256Hex(bytes)).toBe(reference(bytes));
    }
  });

  it("hashes a string as its UTF-8 bytes", () => {
    expect(sha256Hex("é😀")).toBe(createHash("sha256").update("é😀", "utf8").digest("hex"));
  });

  it("starts the hash chain of prj_demo", () => {
    expect(sha256Hex("iynk.chain.v1:prj_demo")).toBe(
      "6193a5a80a5088dbc239c4307bca5df7230dda9949008bfbf2f7a42990d3dd2f",
    );
  });

  it("returns 32 bytes and leaves the input alone", () => {
    const input = new Uint8Array([1, 2, 3]);
    expect(sha256Bytes(input)).toHaveLength(32);
    expect([...input]).toEqual([1, 2, 3]);
  });
});
