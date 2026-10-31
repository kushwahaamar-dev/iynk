import { KEY_HEADER, UPSTREAM_STATUS_HEADER, familyHeaders, upstreamTarget } from "../protocol/ai-relay.ts";
import type { Transport } from "./adapters/types.ts";
import type { Custody } from "./custody.ts";
import { AiError, aiError } from "./errors.ts";
import type { AiErrorCode } from "./errors.ts";

type Send = Parameters<Transport["send"]>[0];

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

async function keyFor(custody: Custody, a: Send): Promise<string | null> {
  const key = a.keyOverride ?? (await custody.keyFor(a.profile.id));
  if (key === null && a.profile.keyId !== null) throw aiError("no_key");
  return key;
}

export function directTransport(d: { fetch: typeof fetch; custody: Custody; browser: boolean }): Transport {
  const { fetch, custody, browser } = d;
  return {
    kind: "direct",
    async send(a) {
      const key = await keyFor(custody, a);
      const { url, method } = upstreamTarget(a.profile, a.path);
      return fetch(url.href, {
        method,
        headers: familyHeaders(a.profile.family, key, { browser }),
        ...(method === "POST" ? { body: JSON.stringify(a.body) } : {}),
        redirect: "error",
        signal: a.signal,
      });
    },
  };
}

const ENVELOPE_CODES: Record<string, AiErrorCode> = {
  provider_key_missing: "no_key",
  relay_target_refused: "relay_denied",
  feature_disabled: "relay_denied",
  unauthorized: "relay_denied",
  forbidden_origin: "relay_denied",
  quota_exhausted: "capped",
  rate_limited: "upstream_busy",
  store_unavailable: "upstream_busy",
  too_large: "context_too_long",
  upstream_timeout: "upstream_timeout",
};

function retryAfterMs(res: Response): number | undefined {
  const seconds = Number(res.headers.get("retry-after"));
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined;
}

/** Turns a relay answer that has no upstream status header into an AiError. Only the code is read from the body. */
async function envelopeError(res: Response): Promise<AiError> {
  let code: unknown;
  try {
    code = ((await res.json()) as { error?: { code?: unknown } }).error?.code;
  } catch {
    code = undefined;
  }
  const mapped = typeof code === "string" ? ENVELOPE_CODES[code] : undefined;
  const after = retryAfterMs(res);
  const detail = { status: res.status, ...(after !== undefined ? { retryAfterMs: after } : {}) };
  if (mapped === "capped") return new AiError("capped", aiError("capped").message, { ...detail, which: "server" });
  if (mapped) return aiError(mapped, detail);
  return aiError(res.status === 504 ? "upstream_timeout" : "upstream_failed", detail);
}

function relayTarget(href: string | null): string {
  if (href === null) throw aiError("relay_denied");
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    throw aiError("relay_denied");
  }
  if (url.protocol === "https:" || (url.protocol === "http:" && LOOPBACK_HOSTS.has(url.hostname))) return url.href;
  throw aiError("relay_denied");
}

export function relayTransport(d: {
  fetch: typeof fetch;
  custody: Custody;
  relayUrl: () => string | null;
  token: () => Promise<string | null>;
}): Transport {
  const { fetch, custody, relayUrl, token } = d;
  return {
    kind: "relay",
    async send(a) {
      const target = relayTarget(relayUrl());
      const bearer = await token();
      if (bearer === null) throw aiError("relay_denied", { status: 401 });
      const key = await keyFor(custody, a);
      const headers: Record<string, string> = { "content-type": "application/json", authorization: `Bearer ${bearer}` };
      if (key !== null) headers[KEY_HEADER] = key;
      const res = await fetch(target, {
        method: "POST",
        headers,
        body: JSON.stringify({ profile: { family: a.profile.family, baseUrl: a.profile.baseUrl }, path: a.path, body: a.body }),
        redirect: "error",
        signal: a.signal,
      });
      if (res.headers.has(UPSTREAM_STATUS_HEADER) || res.ok) return res;
      throw await envelopeError(res);
    },
  };
}

/**
 * Picks the route for a profile that may use either. A profile whose browser calls are known to
 * work goes direct, one that is known to fail goes through the relay, and an unknown one tries
 * direct once. A network failure there moves it to the relay for the rest of the session. This
 * only sees failures that come before a response, so it never switches after output began.
 */
export function autoTransport(direct: Transport, relay: Transport, state: () => { server: boolean }): Transport {
  const viaRelay = new Set<string>();
  return {
    kind: "direct",
    async send(a) {
      const known = a.profile.caps?.browserDirect ?? "unknown";
      if (known === "yes") return direct.send(a);
      if (known === "no" || viaRelay.has(a.profile.id)) return relay.send(a);
      try {
        return await direct.send(a);
      } catch (error) {
        if (!(error instanceof TypeError) || !state().server || a.signal.aborted) throw error;
        viaRelay.add(a.profile.id);
        return relay.send(a);
      }
    },
  };
}
