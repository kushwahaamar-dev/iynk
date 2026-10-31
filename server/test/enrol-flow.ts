import { createEnrolmentCode } from "../src/identity/enrol.ts";
import type { Running } from "./http-helpers.ts";
import type { DeviceKey } from "./keys.ts";
import { toBase64Url } from "../../src/protocol/identity.ts";

// Response bodies are checked field by field in the tests, so they stay loosely typed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = any;

export type Answer = { status: number; headers: Headers; body: Json };

export async function send(run: Running, method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<Answer> {
  const res = await fetch(`${run.base}${path}`, {
    method,
    headers: { ...(body === undefined ? {} : { "content-type": "application/json" }), ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text === "" ? null : JSON.parse(text) };
}

export const bearer = (token: string): Record<string, string> => ({ authorization: `Bearer ${token}` });

export function newCode(run: Running): string {
  return run.app.store.transaction((tx) => createEnrolmentCode(tx, run.deps)).typed;
}

export async function challengeFor(run: Running, req: object): Promise<Json> {
  const res = await send(run, "POST", "/v1/auth/challenges", req);
  return res.body;
}

export async function enrol(run: Running, key: DeviceKey, extra: Record<string, unknown> = {}, headers?: Record<string, string>): Promise<Answer> {
  const challenge = await challengeFor(run, { purpose: "register", keyThumbprint: key.thumbprint });
  return send(
    run,
    "POST",
    "/v1/identities",
    {
      challengeId: challenge.challengeId,
      signature: key.sign(challenge.signingInput),
      publicKey: toBase64Url(key.spki),
      displayName: "Ada",
      enrollmentCode: newCode(run),
      ...extra,
    },
    headers,
  );
}

export async function signIn(run: Running, key: DeviceKey, headers?: Record<string, string>): Promise<Answer> {
  const challenge = await challengeFor(run, { purpose: "login", identityId: key.identityId });
  return send(run, "POST", "/v1/auth/tokens", { challengeId: challenge.challengeId, signature: key.sign(challenge.signingInput) }, headers);
}
