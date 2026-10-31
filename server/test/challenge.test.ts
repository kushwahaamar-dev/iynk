import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { describe, test } from "node:test";
import { signingInput, toBase64Url } from "../../src/protocol/identity.ts";
import { createChallengeStore, verifySignature } from "../src/identity/challenge.ts";
import { fakeDeps } from "./helpers.ts";
import { makeDeviceKey } from "./keys.ts";

const AUDIENCE = "https://iynk.example";

describe("challenge store", () => {
  test("a challenge carries the signing input for its purpose, audience and thumbprint", () => {
    const store = createChallengeStore(fakeDeps(), AUDIENCE);
    const c = store.issue({ purpose: "register", keyThumbprint: "thumb" }, () => null);
    assert.equal(c.audience, AUDIENCE);
    assert.equal(c.signingInput, signingInput({ purpose: "register", audience: AUDIENCE, challengeId: c.challengeId, nonce: c.nonce, keyThumbprint: "thumb" }));
  });

  test("a challenge lives 60 seconds", () => {
    const deps = fakeDeps();
    const store = createChallengeStore(deps, AUDIENCE);
    const c = store.issue({ purpose: "register", keyThumbprint: "t" }, () => null);
    assert.equal(c.expiresAt, deps.clock.now() + 60_000);
    deps.advance(59_999);
    assert.notEqual(store.consume(c.challengeId), null);
    const late = store.issue({ purpose: "register", keyThumbprint: "t" }, () => null);
    deps.advance(60_000);
    assert.equal(store.consume(late.challengeId), null);
  });

  test("a challenge is single use", () => {
    const store = createChallengeStore(fakeDeps(), AUDIENCE);
    const c = store.issue({ purpose: "register", keyThumbprint: "t" }, () => null);
    assert.deepEqual(store.consume(c.challengeId), { purpose: "register", thumbprint: "t", signingInput: c.signingInput });
    assert.equal(store.consume(c.challengeId), null);
    assert.equal(store.consume("chl_unknown"), null);
  });

  test("the oldest challenge is dropped at the cap", () => {
    const store = createChallengeStore(fakeDeps(), AUDIENCE, 3);
    const ids = [1, 2, 3, 4].map(() => store.issue({ purpose: "register", keyThumbprint: "t" }, () => null).challengeId);
    assert.equal(store.consume(ids[0]), null);
    assert.notEqual(store.consume(ids[1]), null);
    assert.notEqual(store.consume(ids[3]), null);
  });

  test("expired challenges are dropped before live ones", () => {
    const deps = fakeDeps();
    const store = createChallengeStore(deps, AUDIENCE, 3);
    const stale = store.issue({ purpose: "register", keyThumbprint: "t" }, () => null);
    deps.advance(30_000);
    const mid = store.issue({ purpose: "register", keyThumbprint: "t" }, () => null);
    deps.advance(30_000);
    const fresh = [store.issue({ purpose: "register", keyThumbprint: "t" }, () => null), store.issue({ purpose: "register", keyThumbprint: "t" }, () => null)];
    assert.equal(store.consume(stale.challengeId), null);
    assert.notEqual(store.consume(mid.challengeId), null);
    assert.notEqual(store.consume(fresh[1].challengeId), null);
  });

  test("an unknown identity gets a challenge that looks like a real one", () => {
    const store = createChallengeStore(fakeDeps(), AUDIENCE);
    const key = makeDeviceKey();
    const real = store.issue({ purpose: "login", identityId: key.identityId }, () => key.thumbprint);
    const fake = store.issue({ purpose: "login", identityId: "usr_nobody" }, () => null);
    assert.equal(Object.keys(fake).sort().join(), Object.keys(real).sort().join());
    assert.equal(fake.nonce.length, real.nonce.length);
    assert.equal(fake.challengeId.length, real.challengeId.length);
    const consumed = store.consume(fake.challengeId);
    assert.equal(consumed?.purpose, "login");
    assert.equal(consumed?.thumbprint.length, key.thumbprint.length);
    assert.notEqual(consumed?.thumbprint, key.thumbprint);
  });
});

describe("verifySignature", () => {
  const input = "iynk.auth.v1\nlogin\naud\nchl\nnonce\nthumb";

  test("accepts a WebCrypto signature", async () => {
    const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
    const spki = new Uint8Array(await crypto.subtle.exportKey("spki", pair.publicKey));
    const raw = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, pair.privateKey, new TextEncoder().encode(input)));
    assert.equal(raw.length, 64);
    assert.equal(verifySignature(spki, input, toBase64Url(raw)), true);
  });

  test("accepts a signature from the test helper", () => {
    const key = makeDeviceKey();
    assert.equal(verifySignature(key.spki, input, key.sign(input)), true);
  });

  test("rejects other data, another key, a short signature and a DER signature", () => {
    const key = makeDeviceKey();
    const other = makeDeviceKey();
    const signature = key.sign(input);
    assert.equal(verifySignature(key.spki, `${input}x`, signature), false);
    assert.equal(verifySignature(other.spki, input, signature), false);
    const raw = Buffer.from(signature, "base64url");
    assert.equal(verifySignature(key.spki, input, toBase64Url(raw.subarray(0, 63))), false);
    const der = sign("sha256", Buffer.from(input), { key: key.privateKey, dsaEncoding: "der" });
    assert.equal(verifySignature(key.spki, input, toBase64Url(new Uint8Array(der))), false);
  });

  test("rejects padded, empty and non-base64url signatures without throwing", () => {
    const key = makeDeviceKey();
    const signature = key.sign(input);
    for (const bad of ["", "!!!", `${signature}=`, `${signature} `]) {
      assert.equal(verifySignature(key.spki, input, bad), false);
    }
  });

  test("rejects a key that is not a valid point or not SPKI", () => {
    const key = makeDeviceKey();
    const offCurve = Uint8Array.from(key.spki);
    offCurve[offCurve.length - 1] ^= 0x01;
    offCurve[offCurve.length - 2] ^= 0x01;
    assert.equal(verifySignature(offCurve, input, key.sign(input)), false);
    assert.equal(verifySignature(new Uint8Array(91), input, key.sign(input)), false);
    assert.equal(verifySignature(new Uint8Array(), input, key.sign(input)), false);
    const rsa = generateKeyPairSync("rsa", { modulusLength: 2048 }).publicKey.export({ format: "der", type: "spki" });
    assert.equal(verifySignature(new Uint8Array(rsa), input, key.sign(input)), false);
  });
});
