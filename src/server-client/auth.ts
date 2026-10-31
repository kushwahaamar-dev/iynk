import {
  cleanDisplayName,
  keyThumbprint,
  parseEnrolmentCode,
  signingInput,
  toBase64Url,
} from "../protocol/identity.ts";
import { createDeviceKey, keySupport } from "./keys.ts";
import type { DeviceKeyStore, StoredKey } from "./keys.ts";
import { parseHash } from "./links.ts";
import {
  ClientError,
  EnrolmentClosed,
  InsecureContext,
  KeysUnsupported,
  NeedsEnrolment,
  ServerUnreachable,
  SigningInputMismatch,
} from "./types.ts";
import type { AccessToken, Api, ApiErrorBody, Identity, ServerInfo } from "./types.ts";

export type Session = { token: string; expiresAt: number; identityId: string };

type Challenge = {
  challengeId: string;
  purpose: "login" | "register";
  nonce: string;
  audience: string;
  signingInput: string;
};

type RequestOptions = { body?: unknown; token?: string | null; headers?: Record<string, string> };

function readError(body: unknown, status: number, header: string | null): ClientError {
  const envelope = (body as Partial<ApiErrorBody> | null)?.error;
  return new ClientError(envelope?.code ?? `http_${status}`, status, envelope?.requestId ?? header, envelope?.retryAfterSeconds ?? null);
}

export async function request<T>(api: Api, method: string, path: string, o: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { accept: "application/json", ...o.headers };
  if (o.body !== undefined) headers["content-type"] = "application/json";
  if (o.token) headers.authorization = `Bearer ${o.token}`;
  let res: Response;
  try {
    res = await api.fetch(`${api.base}/v1${path}`, {
      method,
      headers,
      body: o.body === undefined ? undefined : JSON.stringify(o.body),
    });
  } catch {
    throw new ServerUnreachable();
  }
  if (res.status === 204) return undefined as T;
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) throw readError(body, res.status, res.headers.get("x-request-id"));
  return body as T;
}

export function probeServer(api: Api): Promise<ServerInfo> {
  return request<ServerInfo>(api, "GET", "/server");
}

function toSession(t: AccessToken): Session {
  return { token: t.token, expiresAt: Date.parse(t.expiresAt), identityId: t.identityId };
}

async function sign(key: StoredKey, challenge: Challenge, expected: Parameters<typeof signingInput>[0]): Promise<string> {
  if (challenge.signingInput !== signingInput(expected)) throw new SigningInputMismatch();
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key.privateKey,
    new TextEncoder().encode(challenge.signingInput),
  );
  return toBase64Url(new Uint8Array(signature));
}

function enrolmentCode(raw: string): string {
  const hash = raw.indexOf("#");
  const link = hash === -1 ? null : parseHash(raw.slice(hash));
  const parsed = parseEnrolmentCode(link?.kind === "enrol" ? link.code : raw);
  if (!parsed) throw new ClientError("invalid_enrolment_code", 0);
  return parsed.canonical;
}

async function enrolWithKey(
  api: Api,
  key: StoredKey,
  a: { code: string; displayName: string; locale: string },
): Promise<{ identity: Identity; session: Session }> {
  const thumbprint = keyThumbprint(key.publicSpki);
  const challenge = await request<Challenge>(api, "POST", "/auth/challenges", {
    body: { purpose: "register", keyThumbprint: thumbprint },
  });
  const signature = await sign(key, challenge, {
    purpose: "register",
    audience: challenge.audience,
    challengeId: challenge.challengeId,
    nonce: challenge.nonce,
    keyThumbprint: thumbprint,
  });
  const registered = await request<{ identity: Identity; accessToken: AccessToken }>(api, "POST", "/identities", {
    body: {
      challengeId: challenge.challengeId,
      signature,
      publicKey: toBase64Url(key.publicSpki),
      displayName: a.displayName,
      locale: a.locale,
      enrollmentCode: a.code,
    },
  });
  return { identity: registered.identity, session: toSession(registered.accessToken) };
}

export async function enrol(
  api: Api,
  keys: DeviceKeyStore,
  a: { code: string; displayName: string; locale: string },
): Promise<{ identity: Identity; session: Session }> {
  const support = keySupport();
  if (support === "insecure") throw new InsecureContext();
  if (support === "unsupported") throw new KeysUnsupported();
  const code = enrolmentCode(a.code);
  const displayName = cleanDisplayName(a.displayName, { truncate: true });
  if (!displayName) throw new ClientError("invalid_display_name", 0);
  if ((await probeServer(api)).enrollment === "closed") throw new EnrolmentClosed();

  let previous: StoredKey | null;
  try {
    previous = await keys.get(api.base);
  } catch {
    throw new KeysUnsupported();
  }
  const key = await createDeviceKey();
  await keys.put(api.base, key);
  try {
    return await enrolWithKey(api, key, { code, displayName, locale: a.locale });
  } catch (e) {
    if (previous) await keys.put(api.base, previous);
    else await keys.delete(api.base);
    throw e;
  }
}

export async function signIn(api: Api, keys: DeviceKeyStore, identityId: string): Promise<Session> {
  const key = await keys.get(api.base);
  if (!key) throw new NeedsEnrolment();
  const challenge = await request<Challenge>(api, "POST", "/auth/challenges", {
    body: { purpose: "login", identityId },
  });
  const signature = await sign(key, challenge, {
    purpose: "login",
    audience: challenge.audience,
    challengeId: challenge.challengeId,
    nonce: challenge.nonce,
    keyThumbprint: keyThumbprint(key.publicSpki),
  });
  const token = await request<AccessToken>(api, "POST", "/auth/tokens", {
    body: { challengeId: challenge.challengeId, signature },
  });
  return toSession(token);
}
