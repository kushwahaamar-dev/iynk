import { lookup } from "node:dns/promises";
import type { IncomingMessage, request as httpRequest } from "node:http";
import type { request as httpsRequest } from "node:https";
import type { LookupFunction } from "node:net";
import {
  familyHeaders,
  isPassThrough,
  RELAY_MAX_RESPONSE_BYTES,
  RELAY_TIMEOUT_MS,
  UPSTREAM_STATUS_HEADER,
  upstreamTarget,
  type RelayRequest,
} from "../../../../src/protocol/ai-relay.ts";
import type { Clock } from "../../deps.ts";
import { ApiError } from "../../http/errors.ts";
import type { Reply } from "../../http/classes.ts";
import type { Logger } from "../../ops/log.ts";
import { checkTarget } from "./hosts.ts";
import { checkAddresses, type Resolver } from "./ssrf.ts";

export type RelayDeps = {
  resolve: Resolver;
  request: typeof httpRequest;
  httpsRequest: typeof httpsRequest;
  clock: Clock;
  log: Logger;
};

const PER_DEVICE = 4;
const PER_SERVER = 16;
const TIMEOUT_STATUSES = new Set([408, 504]);

export const dnsResolver: Resolver = async (host) => {
  const answers = await lookup(host, { all: true, verbatim: true });
  return answers.map(({ address, family }) => ({ address, family: family === 6 ? 6 : 4 }));
};

export function createGate(): { enter(deviceId: string): (() => void) | null } {
  const perDevice = new Map<string, number>();
  let total = 0;
  return {
    enter(deviceId) {
      const held = perDevice.get(deviceId) ?? 0;
      if (held >= PER_DEVICE || total >= PER_SERVER) return null;
      perDevice.set(deviceId, held + 1);
      total += 1;
      let released = false;
      return () => {
        if (released) return;
        released = true;
        total -= 1;
        const left = (perDevice.get(deviceId) ?? 1) - 1;
        if (left <= 0) perDevice.delete(deviceId);
        else perDevice.set(deviceId, left);
      };
    },
  };
}

function refused(code: string): ApiError {
  return new ApiError(422, "relay_target_refused", "The relay will not call that address.", [{ code }]);
}

async function* capped(upstream: IncomingMessage, signal: AbortSignal): AsyncGenerator<Uint8Array> {
  let sent = 0;
  try {
    for await (const chunk of upstream as AsyncIterable<Uint8Array>) {
      const room = RELAY_MAX_RESPONSE_BYTES - sent;
      if (chunk.length >= room) {
        if (room > 0) yield chunk.subarray(0, room);
        return;
      }
      sent += chunk.length;
      yield chunk;
    }
  } catch (error) {
    if (!signal.aborted) throw error;
  } finally {
    upstream.destroy();
  }
}

type Answer = { upstream: IncomingMessage; destroy(): void };

function pinnedLookup(pick: { address: string; family: 4 | 6 }): LookupFunction {
  return (_name, options, done) => {
    if (options.all === true) done(null, [{ address: pick.address, family: pick.family }]);
    else done(null, pick.address, pick.family);
  };
}

function send(a: { req: RelayRequest; key: string; base: URL; pick: { address: string; family: 4 | 6 }; signal: AbortSignal; deps: RelayDeps }, payload: string): Promise<Answer> {
  const { url, method } = upstreamTarget(a.req.profile, a.req.path);
  const headers: Record<string, string> = { ...familyHeaders(a.req.profile.family, a.key, { browser: false }), host: a.base.host };
  if (method === "POST") headers["content-length"] = String(Buffer.byteLength(payload));
  const secure = a.base.protocol === "https:";
  return new Promise<Answer>((resolve, reject) => {
    const call = (secure ? a.deps.httpsRequest : a.deps.request)(
      {
        host: a.base.hostname,
        port: a.base.port === "" ? undefined : Number(a.base.port),
        path: url.pathname,
        method,
        headers,
        agent: false,
        servername: secure ? a.base.hostname : undefined,
        lookup: pinnedLookup(a.pick),
      },
      (upstream) => resolve({ upstream, destroy: () => call.destroy() }),
    );
    const stop = (): void => {
      call.destroy(new Error("aborted"));
    };
    if (a.signal.aborted) stop();
    a.signal.addEventListener("abort", stop, { once: true });
    call.on("error", reject);
    call.once("close", () => a.signal.removeEventListener("abort", stop));
    call.end(method === "POST" ? payload : undefined);
  });
}

export async function relayCall(a: {
  req: RelayRequest;
  key: string;
  signal: AbortSignal;
  allow: ReadonlySet<string>;
  allowPrivate: boolean;
  trace: { requestId: string; deviceId: string };
  admit: () => (() => void) | Reply;
  deps: RelayDeps;
}): Promise<Reply> {
  const { deps } = a;
  const target = checkTarget(a.req.profile.baseUrl, a.allow, a.allowPrivate);
  if (!target.ok) throw refused(target.code);
  const host = target.url.hostname;
  const addresses = await deps.resolve(host).catch(() => []);
  const checked = checkAddresses(addresses, { allowPrivate: a.allowPrivate, hostAllowed: target.hostAllowed });
  if (!checked.ok) throw refused(checked.code);
  if (a.signal.aborted) throw new ApiError(502, "upstream_failed", "The call was cancelled.");

  const admitted = a.admit();
  if (typeof admitted !== "function") return admitted;
  const release = admitted;

  const started = deps.clock.now();
  const payload = JSON.stringify(a.req.body);
  const deadline = AbortSignal.timeout(RELAY_TIMEOUT_MS);
  const signal = AbortSignal.any([a.signal, deadline]);
  const finish = (status: number, bytes: number): void => {
    release();
    deps.log.info("ai.relay", { req: a.trace.requestId, dev: a.trace.deviceId, status, in: Buffer.byteLength(payload), out: bytes, ms: deps.clock.now() - started, host: target.url.host });
  };

  let answer: Answer;
  try {
    answer = await send({ req: a.req, key: a.key, base: target.url, pick: checked.pick, signal, deps }, payload);
  } catch {
    finish(deadline.aborted ? 504 : 502, 0);
    if (deadline.aborted) throw new ApiError(504, "upstream_timeout", "The provider took too long to answer.");
    throw new ApiError(502, "upstream_failed", "The provider could not be reached.");
  }

  const { upstream } = answer;
  const status = upstream.statusCode ?? 0;
  if (!isPassThrough(status)) {
    answer.destroy();
    const timedOut = TIMEOUT_STATUSES.has(status);
    finish(timedOut ? 504 : 502, 0);
    if (timedOut) throw new ApiError(504, "upstream_timeout", "The provider took too long to answer.");
    throw new ApiError(502, "upstream_failed", "The provider could not complete the call.");
  }

  const headers: Record<string, string> = { [UPSTREAM_STATUS_HEADER]: String(status) };
  for (const name of ["content-type", "retry-after"] as const) {
    const value = upstream.headers[name];
    if (typeof value === "string") headers[name] = value;
  }
  return {
    status,
    headers,
    stream: capped(upstream, signal),
    onFinish: ({ bytes }) => {
      answer.destroy();
      finish(status, bytes);
    },
  };
}
