import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { toBase64Url } from "../../src/protocol/identity.ts";
import { collectDiagnostics } from "../src/cli/diagnostics.ts";
import { bearer, challengeFor, enrol, newCode } from "./enrol-flow.ts";
import { startApp, testConfig, type Running } from "./http-helpers.ts";
import { makeDeviceKey } from "./keys.ts";

const CANARIES = {
  token: "iynk_at_CANARYtoken7f3a9cCANARYtoken7f3a9cCANA",
  providerKey: "canary-provider-key-7f3a9c",
  enrolmentCode: "CANARYcode7f3a9cCANARYc",
  enrolmentShape: "canary-enrol-7f3a9c",
  pairingCode: "CANARYpair7f3a9cCANARYp",
  displayName: "CanaryName7f3a9c",
};

let run: Running | undefined;

afterEach(async () => {
  await run?.stop();
  run = undefined;
});

test("BA-09 canaries sent as secrets appear in no log line, diagnostics file or response body", async () => {
  run = await startApp({ env: { IYNK_SERVER_KEY_X: CANARIES.providerKey } });
  const bodies: string[] = [];
  const record = async (res: Response) => {
    bodies.push(await res.text());
    run?.deps.advance(61_000);
    return res;
  };
  const base = run.base;
  const key = makeDeviceKey();

  await record(await fetch(`${base}/v1/identities/me`, { headers: bearer(CANARIES.token) }));
  await record(await fetch(`${base}/v1/server`, { headers: { "x-iynk-provider-key": CANARIES.providerKey } }));
  await record(
    await fetch(`${base}/v1/identities/me`, { headers: { authorization: `Bearer ${CANARIES.token}`, "x-iynk-provider-key": CANARIES.providerKey } }),
  );

  for (const [enrollmentCode, displayName] of [
    [CANARIES.enrolmentCode, "Ada"],
    [CANARIES.enrolmentShape, "Ada"],
    ["0000-0000-0000", CANARIES.displayName],
  ] as const) {
    const challenge = await challengeFor(run, { purpose: "register", keyThumbprint: key.thumbprint });
    const res = await fetch(`${base}/v1/identities`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        challengeId: challenge.challengeId,
        signature: key.sign(challenge.signingInput),
        publicKey: toBase64Url(key.spki),
        displayName,
        enrollmentCode,
      }),
    });
    assert.ok(res.status === 400 || res.status === 401, String(res.status));
    await record(res);
  }

  await record(
    await fetch(`${base}/v1/pairings`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${CANARIES.token}` },
      body: JSON.stringify({ code: CANARIES.pairingCode }),
    }),
  );

  const real = await enrol(run, makeDeviceKey(), { enrollmentCode: newCode(run) });
  const issued = real.body.accessToken.token as string;
  const owner = await fetch(`${base}/v1/identities/me`, { headers: bearer(issued) });
  await record(owner);

  const logs = run.app.log.lines();
  assert.ok(logs.length > 0);
  const diagnostics = Object.values(collectDiagnostics(testConfig({ IYNK_SERVER_KEY_X: CANARIES.providerKey }), run.app.store, run.app.log).files);
  const places = { "a log line": logs, "a diagnostics file": diagnostics, "a response body": bodies };

  for (const [name, canary] of Object.entries({ ...CANARIES, issuedToken: issued })) {
    for (const [place, texts] of Object.entries(places)) {
      if (name === "issuedToken" && place === "a response body") continue;
      assert.equal(texts.filter((text) => text.includes(canary)).length, 0, `${name} found in ${place}`);
    }
  }
});
