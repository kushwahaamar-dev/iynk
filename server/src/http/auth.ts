import type { RouteDeps } from "../app.ts";
import type { ChallengeStore } from "../identity/challenge.ts";
import { loginDevice, revokeSession } from "../identity/tokens.ts";
import { defineRoutes, type Ctx, type Reply, type RouteDef } from "./classes.ts";
import { ApiError, errorBody, unauthorized } from "./errors.ts";

export const CHALLENGE_ID = /^chl_[a-z0-9][a-z0-9_-]{0,63}$/;
export const SIGNATURE = /^[A-Za-z0-9_-]{86}$/;
const THUMBPRINT = /^[A-Za-z0-9_-]{43}$/;
const IDENTITY_ID = /^usr_[a-z0-9][a-z0-9_-]{0,63}$/;
const CLIENT_MAX = 120;

export type AuthRouteDeps = RouteDeps & { challenges: ChallengeStore };

export const iso = (ms: number): string => new Date(ms).toISOString();

export function badField(path: string, message: string): ApiError {
  return new ApiError(400, "bad_request", "A body field is invalid.", [{ code: "invalid_field", severity: "error", path, message }]);
}

/** The reply for every credential problem; a thrown 401 would lose the WWW-Authenticate header. */
export function denied(ctx: Ctx): Reply {
  return { status: 401, body: errorBody(unauthorized(), ctx.requestId), headers: { "www-authenticate": 'Bearer realm="iynk"' } };
}

export function readObject(body: unknown, allowed: readonly string[], required: readonly string[]): Record<string, unknown> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) throw badField("", "Send a JSON object.");
  const fields = body as Record<string, unknown>;
  for (const key of Object.keys(fields)) if (!allowed.includes(key)) throw badField(`/${key}`, "This field is not allowed.");
  for (const key of required) if (fields[key] === undefined) throw badField(`/${key}`, "This field is required.");
  return fields;
}

export function readText(fields: Record<string, unknown>, key: string, pattern?: RegExp, maxLength?: number): string | undefined {
  const value = fields[key];
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw badField(`/${key}`, "Send text.");
  if ((maxLength !== undefined && value.length > maxLength) || (pattern !== undefined && !pattern.test(value))) {
    throw badField(`/${key}`, "This value has the wrong shape.");
  }
  return value;
}

export function clientHeader(ctx: Ctx): string | null {
  const value = ctx.headers.get("iynk-client");
  return value === null || value === "" ? null : value.slice(0, CLIENT_MAX);
}

type SessionRow = { id: string; created_at: number; last_used_at: number; expires_at: number; client: string | null };

export function authRoutes(ctx: AuthRouteDeps): RouteDef[] {
  const { store, deps, config, challenges, limiter, log } = ctx;
  const lookupThumbprint = (identityId: string): string | null =>
    store.read((tx) => tx.get<{ thumbprint: string }>("SELECT thumbprint FROM devices WHERE identity_id = ?", identityId)?.thumbprint ?? null);

  const createChallenge = (c: Ctx): Reply => {
    const fields = readObject(c.body, ["purpose", "identityId", "keyThumbprint"], ["purpose"]);
    const purpose = fields["purpose"];
    let issued;
    if (purpose === "login") {
      readObject(c.body, ["purpose", "identityId"], ["purpose", "identityId"]);
      issued = challenges.issue({ purpose, identityId: readText(fields, "identityId", IDENTITY_ID, 72) as string }, lookupThumbprint);
    } else if (purpose === "register") {
      readObject(c.body, ["purpose", "keyThumbprint"], ["purpose", "keyThumbprint"]);
      issued = challenges.issue({ purpose, keyThumbprint: readText(fields, "keyThumbprint", THUMBPRINT) as string }, lookupThumbprint);
    } else {
      throw badField("/purpose", "Use login or register.");
    }
    return { status: 201, body: { ...issued, expiresAt: iso(issued.expiresAt) } };
  };

  const createAccessToken = (c: Ctx): Reply => {
    const fields = readObject(c.body, ["challengeId", "signature"], ["challengeId", "signature"]);
    const challengeId = readText(fields, "challengeId", CHALLENGE_ID, 72) as string;
    const signature = readText(fields, "signature", SIGNATURE) as string;
    const challenge = challenges.consume(challengeId);
    if (!challenge || challenge.purpose !== "login") return denied(c);

    const identityId = store.read((tx) => tx.get<{ identity_id: string }>("SELECT identity_id FROM devices WHERE thumbprint = ?", challenge.thumbprint)?.identity_id ?? null);
    const login = store.transaction((tx) =>
      loginDevice(tx, deps, {
        identityId: identityId ?? "",
        thumbprint: challenge.thumbprint,
        signingInput: challenge.signingInput,
        signature,
        ttlMs: config.tokenTtlMs,
        client: clientHeader(c),
      }),
    );
    if (!login) {
      if (identityId !== null) {
        const taken = limiter.take("auth.token.identity", `id:${identityId}`);
        if (!taken.ok) {
          const body = errorBody(new ApiError(429, "rate_limited", "Too many requests. Try again shortly."), c.requestId);
          body.error["retryAfterSeconds"] = taken.retryAfter;
          return { status: 429, body, headers: { "retry-after": String(taken.retryAfter) } };
        }
      }
      return denied(c);
    }
    log.info("signed_in", { device: login.deviceId });
    return {
      status: 201,
      body: { token: login.token, tokenType: "Bearer", identityId: identityId as string, sessionId: login.sessionId, expiresAt: iso(login.expiresAt) },
    };
  };

  const revokeCurrentToken = (c: Ctx): Reply => {
    const { deviceId, sessionId } = c.authed as NonNullable<Ctx["authed"]>;
    store.transaction((tx) => revokeSession(tx, deviceId, sessionId, deps.clock.now()));
    return { status: 204 };
  };

  const listSessions = (c: Ctx): Reply => {
    const { deviceId, sessionId } = c.authed as NonNullable<Ctx["authed"]>;
    const rows = store.read((tx) =>
      tx.all<SessionRow>(
        "SELECT id, created_at, last_used_at, expires_at, client FROM sessions WHERE device_id = ? AND revoked_at IS NULL AND expires_at > ? ORDER BY created_at, rowid",
        deviceId,
        deps.clock.now(),
      ),
    );
    const items = rows.map((row) => ({
      id: row.id,
      createdAt: iso(row.created_at),
      lastUsedAt: iso(row.last_used_at),
      expiresAt: iso(row.expires_at),
      ...(row.client === null ? {} : { client: row.client }),
      current: row.id === sessionId,
    }));
    return { status: 200, body: { items, nextCursor: null } };
  };

  const revokeOne = (c: Ctx): Reply => {
    const { deviceId } = c.authed as NonNullable<Ctx["authed"]>;
    const revoked = store.transaction((tx) => revokeSession(tx, deviceId, c.params["sessionId"] as string, deps.clock.now()));
    if (!revoked) throw new ApiError(404, "not_found", "Not found.");
    return { status: 204 };
  };

  return defineRoutes([
    { method: "POST", path: "/v1/auth/challenges", operation: "createChallenge", cls: "public", bucket: "auth.challenge", handler: createChallenge },
    { method: "POST", path: "/v1/auth/tokens", operation: "createAccessToken", cls: "public", bucket: "auth.token", handler: createAccessToken },
    { method: "DELETE", path: "/v1/auth/tokens/current", operation: "revokeCurrentToken", cls: "device", bucket: "write", handler: revokeCurrentToken },
    { method: "GET", path: "/v1/auth/sessions", operation: "listSessions", cls: "device", bucket: "read", handler: listSessions },
    { method: "DELETE", path: "/v1/auth/sessions/{sessionId}", operation: "revokeSession", cls: "device", bucket: "write", handler: revokeOne },
  ]);
}
