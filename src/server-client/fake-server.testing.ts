import { deriveIdentityId, fromBase64Url, keyThumbprint, signingInput } from "../protocol/identity.ts";

export const CODE = "7QKX2M9R4TBV";

type Challenge = { id: string; purpose: "login" | "register"; thumbprint: string; identityId?: string; input: string };

export type Seen = { method: string; path: string; authorization: string | null; body: unknown };

export function fakeServer(o: { enrollment?: "code" | "closed"; audience?: string; badInput?: boolean } = {}) {
  const audience = o.audience ?? "https://srv.test";
  const challenges = new Map<string, Challenge>();
  const keys = new Map<string, { key: CryptoKey; thumbprint: string }>();
  const tokens = new Set<string>();
  const seen: Seen[] = [];
  let counter = 0;

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "x-request-id": "req_test" } });
  const fail = (status: number, code: string) => json(status, { error: { code, message: code, requestId: "req_test" } });

  const verify = async (spki: Uint8Array, input: string, signature: string) => {
    const decoded = fromBase64Url(signature);
    if (!decoded) return false;
    const bytes = new Uint8Array(decoded);
    const key = await crypto.subtle.importKey("spki", new Uint8Array(spki), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    return crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, bytes, new TextEncoder().encode(input));
  };

  const mint = (identityId: string) => {
    const token = `iynk_at_${String(++counter).padStart(43, "t")}`;
    tokens.add(token);
    return {
      token,
      tokenType: "Bearer",
      identityId,
      sessionId: `ses_${counter}`,
      expiresAt: "2026-10-28T12:00:00.000Z",
    };
  };

  const identity = (id: string) => ({
    id,
    deviceId: "dev_aaaaaaaaaaaaaaaaaaaaaaaaaa",
    displayName: "Mira",
    locale: "en",
    keyThumbprint: "t".repeat(43),
    showOnline: true,
    showActivity: false,
    createdAt: "2026-10-28T00:00:00.000Z",
  });

  async function handle(method: string, path: string, authorization: string | null, body: Record<string, unknown>) {
    if (path === "/v1/server" && method === "GET") {
      return json(200, { audience, enrollment: o.enrollment ?? "code", software: { name: "iynk-server" } });
    }
    if (path === "/v1/auth/challenges") {
      const purpose = body.purpose as "login" | "register";
      let thumbprint = body.keyThumbprint as string | undefined;
      if (purpose === "login") thumbprint = keys.get(body.identityId as string)?.thumbprint ?? "d".repeat(43);
      const id = `chl_${++counter}`;
      const nonce = "n".repeat(43);
      const input = o.badInput
        ? "something else"
        : signingInput({ purpose, audience, challengeId: id, nonce, keyThumbprint: thumbprint ?? "" });
      challenges.set(id, { id, purpose, thumbprint: thumbprint ?? "", identityId: body.identityId as string | undefined, input });
      return json(201, { challengeId: id, purpose, nonce, audience, expiresAt: "2026-10-28T00:01:00.000Z", signingInput: input });
    }
    if (path === "/v1/identities" && method === "POST") {
      const challenge = challenges.get(body.challengeId as string);
      const spki = fromBase64Url(body.publicKey as string);
      if (!challenge || !spki || body.enrollmentCode !== CODE) return fail(401, "unauthorized");
      challenges.delete(challenge.id);
      if (keyThumbprint(spki) !== challenge.thumbprint) return fail(401, "unauthorized");
      if (!(await verify(spki, challenge.input, body.signature as string))) return fail(401, "unauthorized");
      const id = deriveIdentityId(spki);
      const key = await crypto.subtle.importKey("spki", new Uint8Array(spki), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
      keys.set(id, { key, thumbprint: challenge.thumbprint });
      return json(201, { identity: identity(id), accessToken: mint(id) });
    }
    if (path === "/v1/auth/tokens" && method === "POST") {
      const challenge = challenges.get(body.challengeId as string);
      const device = challenge?.identityId ? keys.get(challenge.identityId) : undefined;
      if (!challenge || !device) return fail(401, "unauthorized");
      challenges.delete(challenge.id);
      const decoded = fromBase64Url(body.signature as string);
      const bytes = decoded && new Uint8Array(decoded);
      const ok = bytes && (await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, device.key, bytes, new TextEncoder().encode(challenge.input)));
      return ok ? json(201, mint(challenge.identityId as string)) : fail(401, "unauthorized");
    }
    if (path === "/v1/pairings/peek") return json(200, { from: { displayName: "Mira" }, expiresAt: "2026-10-29T00:00:00.000Z" });
    if (!authorization || !tokens.has(authorization.replace("Bearer ", ""))) return fail(401, "unauthorized");
    if (path === "/v1/identities/me" && method === "GET") return json(200, identity("usr_me"));
    if (path === "/v1/buddies") return json(200, { items: [], nextCursor: null });
    if (path === "/v1/auth/tokens/current") {
      tokens.delete(authorization.replace("Bearer ", ""));
      return new Response(null, { status: 204 });
    }
    if (path === "/v1/pairings/redeem") return json(200, { buddy: { identityId: "usr_b", deviceId: "dev_b", displayName: "Kai", keyThumbprint: "x", pairedAt: "2026-10-28T00:00:00.000Z" } });
    return fail(404, "not_found");
  }

  const fetchFn: typeof fetch = async (input, init) => {
    const url = new URL(String(input));
    const headers = new Headers(init?.headers);
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
    const path = url.pathname + url.search;
    seen.push({ method: init?.method ?? "GET", path, authorization: headers.get("authorization"), body });
    return handle(init?.method ?? "GET", url.pathname, headers.get("authorization"), body);
  };

  return {
    fetch: fetchFn,
    seen,
    tokens,
    revokeAllTokens: () => tokens.clear(),
    forgetIdentities: () => keys.clear(),
  };
}
