import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { createEnrolmentCode } from "../src/identity/enrol.ts";
import { toBase64Url } from "../../src/protocol/identity.ts";
import { bearer, challengeFor, enrol, newCode, send } from "./enrol-flow.ts";
import { startApp, type Running } from "./http-helpers.ts";
import { makeDeviceKey } from "./keys.ts";

let run: Running | undefined;

afterEach(async () => {
  await run?.stop();
  run = undefined;
});

const roleOf = (r: Running, identityId: string) => r.app.store.read((tx) => tx.get<{ server_role: string }>("SELECT server_role FROM devices WHERE identity_id = ?", identityId)?.server_role);

describe("registering", () => {
  test("the first enrolment is the owner, the second a member, and the token has the documented shape", async () => {
    run = await startApp();
    const first = makeDeviceKey();
    const second = makeDeviceKey();
    const a = await enrol(run, first, { locale: "de", color: "#aabbcc" });
    assert.equal(a.status, 201);
    assert.match(a.body.accessToken.token, /^iynk_at_[A-Za-z0-9_-]{43}$/);
    assert.equal(a.body.identity.id, first.identityId);
    assert.equal(a.body.identity.deviceId, first.deviceId);
    assert.equal(a.body.identity.deletion, null);
    assert.equal(a.body.identity.locale, "de");
    assert.equal(a.body.identity.color, "#aabbcc");
    assert.equal("role" in a.body.identity, false);
    assert.equal(roleOf(run, first.identityId), "owner");
    assert.equal((await enrol(run, second)).status, 201);
    assert.equal(roleOf(run, second.identityId), "member");
  });

  test("the link form of a code works", async () => {
    run = await startApp();
    const { link } = run.app.store.transaction((tx) => createEnrolmentCode(tx, run!.deps));
    assert.equal((await enrol(run, makeDeviceKey(), { enrollmentCode: link })).status, 201);
  });

  test("a used code, an expired code and a made-up code are all the same 401", async () => {
    run = await startApp();
    const used = newCode(run);
    assert.equal((await enrol(run, makeDeviceKey(), { enrollmentCode: used })).status, 201);
    const expired = newCode(run);
    run.deps.advance(25 * 3_600_000);
    const answers = [
      await enrol(run, makeDeviceKey(), { enrollmentCode: used }, { "x-request-id": "req_fixed_0001" }),
      await enrol(run, makeDeviceKey(), { enrollmentCode: expired }, { "x-request-id": "req_fixed_0001" }),
      await enrol(run, makeDeviceKey(), { enrollmentCode: "0000-0000-0000" }, { "x-request-id": "req_fixed_0001" }),
    ];
    for (const answer of answers) {
      assert.equal(answer.status, 401);
      assert.deepEqual(answer.body, answers[0]?.body);
    }
    const count = run.app.store.read((tx) => tx.get<{ n: number }>("SELECT COUNT(*) AS n FROM devices")?.n);
    assert.equal(count, 1);
  });

  test("a missing code and closed mode are 401 too", async () => {
    run = await startApp();
    const key = makeDeviceKey();
    const challenge = await challengeFor(run, { purpose: "register", keyThumbprint: key.thumbprint });
    const base = { challengeId: challenge.challengeId, signature: key.sign(challenge.signingInput), publicKey: toBase64Url(key.spki), displayName: "Ada" };
    assert.equal((await send(run, "POST", "/v1/identities", base)).status, 401);
    await run.stop();

    run = await startApp({ env: { IYNK_ENROL: "closed" } });
    assert.equal((await enrol(run, makeDeviceKey())).status, 401);
  });

  test("a bad signature or a challenge for another key is 401 and keeps the code", async () => {
    run = await startApp();
    const key = makeDeviceKey();
    const other = makeDeviceKey();
    const code = newCode(run);
    const challenge = await challengeFor(run, { purpose: "register", keyThumbprint: key.thumbprint });
    const res = await send(run, "POST", "/v1/identities", {
      challengeId: challenge.challengeId,
      signature: other.sign(challenge.signingInput),
      publicKey: toBase64Url(key.spki),
      displayName: "Ada",
      enrollmentCode: code,
    });
    assert.equal(res.status, 401);
    const wrongKey = await challengeFor(run, { purpose: "register", keyThumbprint: other.thumbprint });
    const swapped = await send(run, "POST", "/v1/identities", {
      challengeId: wrongKey.challengeId,
      signature: key.sign(wrongKey.signingInput),
      publicKey: toBase64Url(key.spki),
      displayName: "Ada",
      enrollmentCode: code,
    });
    assert.equal(swapped.status, 401);
    assert.equal((await enrol(run, key, { enrollmentCode: code })).status, 201);
  });

  test("a duplicate key is a 409 only with a valid code, and the code is not spent", async () => {
    run = await startApp();
    const key = makeDeviceKey();
    assert.equal((await enrol(run, key)).status, 201);
    assert.equal((await enrol(run, key, { enrollmentCode: "0000-0000-0000" })).status, 401);
    const code = newCode(run);
    const dup = await enrol(run, key, { enrollmentCode: code });
    assert.equal(dup.status, 409);
    assert.equal(dup.body.error.code, "already_exists");
    assert.equal((await enrol(run, makeDeviceKey(), { enrollmentCode: code })).status, 201);
  });

  test("a full server is a 409 quota", async () => {
    run = await startApp({ env: { IYNK_MAX_IDENTITIES: "1" } });
    assert.equal((await enrol(run, makeDeviceKey())).status, 201);
    const res = await enrol(run, makeDeviceKey());
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, "quota");
  });

  test("display name, key and field rules answer 400 with the field path", async () => {
    run = await startApp();
    const cases: [Record<string, unknown>, string][] = [
      [{ displayName: "" }, "/displayName"],
      [{ displayName: "​‮" }, "/displayName"],
      [{ displayName: "x".repeat(25) }, "/displayName"],
      [{ displayName: 5 }, "/displayName"],
      [{ publicKey: "A".repeat(122) }, "/publicKey"],
      [{ publicKey: "short" }, "/publicKey"],
      [{ locale: "NOT A LOCALE" }, "/locale"],
      [{ color: "red" }, "/color"],
      [{ enrollmentCode: "nope" }, "/enrollmentCode"],
      [{ signature: "short" }, "/signature"],
      [{ role: "owner" }, "/role"],
    ];
    for (const [extra, path] of cases) {
      run.deps.advance(61_000);
      const res = await enrol(run, makeDeviceKey(), extra);
      assert.equal(res.status, 400, JSON.stringify(extra));
      assert.equal(res.body.error.code, "bad_request");
      assert.equal(res.body.error.details[0].path, path);
    }
  });

  test("the name is cleaned and a long grapheme count is counted as graphemes", async () => {
    run = await startApp();
    const res = await enrol(run, makeDeviceKey(), { displayName: "  A​da   Lovelace " });
    assert.equal(res.body.identity.displayName, "Ada Lovelace");
  });

  test("a bad media type is 415", async () => {
    run = await startApp();
    const res = await fetch(`${run.base}/v1/identities`, { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" });
    assert.equal(res.status, 415);
  });
});

describe("my identity", () => {
  async function member() {
    const key = makeDeviceKey();
    const res = await enrol(run as Running, key);
    return { key, token: res.body.accessToken.token as string };
  }

  test("GET returns the identity and needs a token", async () => {
    run = await startApp();
    const { key, token } = await member();
    const me = await send(run, "GET", "/v1/identities/me", undefined, bearer(token));
    assert.equal(me.status, 200);
    assert.equal(me.body.keyThumbprint, key.thumbprint);
    assert.equal(me.body.showOnline, true);
    assert.equal(me.body.showActivity, false);
    assert.equal(me.body.locale, "en");
    assert.equal((await send(run, "GET", "/v1/identities/me")).status, 401);
  });

  test("PATCH changes fields, including showActivity", async () => {
    run = await startApp();
    const { token } = await member();
    const res = await send(run, "PATCH", "/v1/identities/me", { displayName: " Grace ", showActivity: true, showOnline: false, color: "#112233", locale: "fr" }, bearer(token));
    assert.equal(res.status, 200);
    assert.equal(res.body.displayName, "Grace");
    assert.equal(res.body.showActivity, true);
    assert.equal(res.body.showOnline, false);
    assert.equal(res.body.color, "#112233");
    assert.equal(res.body.locale, "fr");
    const again = await send(run, "GET", "/v1/identities/me", undefined, bearer(token));
    assert.deepEqual(again.body, res.body);
  });

  test("PATCH needs a field and rejects unknown or wrong ones", async () => {
    run = await startApp();
    const { token } = await member();
    for (const body of [{}, { key: "x" }, { showActivity: "yes" }, { displayName: "" }, { color: "#12" }]) {
      const res = await send(run, "PATCH", "/v1/identities/me", body, bearer(token));
      assert.equal(res.status, 400, JSON.stringify(body));
    }
    const after = await send(run, "GET", "/v1/identities/me", undefined, bearer(token));
    assert.equal(after.body.displayName, "Ada");
  });
});
