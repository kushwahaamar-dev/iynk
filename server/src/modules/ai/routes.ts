import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { parseRelayRequest, RELAY_MAX_REQUEST_BYTES } from "../../../../src/protocol/ai-relay.ts";
import type { RouteDeps } from "../../app.ts";
import { defineRoutes, type RouteDef } from "../../http/classes.ts";
import { ApiError, errorBody } from "../../http/errors.ts";
import { StoreError } from "../../store/port.ts";
import { providerKey, requireEnabled } from "../guard.ts";
import { buildAllowList } from "./hosts.ts";
import { createGate, dnsResolver, relayCall } from "./relay.ts";
import { countRelayCall } from "./usage.ts";

export function aiRoutes(ctx: RouteDeps): RouteDef[] {
  const { config, store, deps, log } = ctx;
  const allow = buildAllowList(config.aiAllowedHosts);
  const gate = createGate();
  const relayDeps = { resolve: dnsResolver, request: httpRequest, httpsRequest, clock: deps.clock, log };

  return defineRoutes([
    {
      method: "POST",
      path: "/v1/ai/relay",
      operation: "aiRelay",
      cls: "device",
      bucket: "ai.relay",
      maxBodyBytes: RELAY_MAX_REQUEST_BYTES,
      handler: (c) => {
        requireEnabled(config, "ai");
        const parsed = parseRelayRequest(c.body);
        if (!parsed.ok) throw new ApiError(400, "bad_request", parsed.problem);
        const key = providerKey(c.headers);
        if (!key.ok) throw new ApiError(422, "provider_key_missing", "Send your provider key with this call.");
        const deviceId = (c.authed as NonNullable<typeof c.authed>).deviceId;
        const { family } = parsed.value.profile;
        return relayCall({
          req: parsed.value,
          key: key.key,
          signal: c.signal,
          allow,
          allowPrivate: config.aiAllowPrivate,
          trace: { requestId: c.requestId, deviceId },
          deps: relayDeps,
          admit() {
            const release = gate.enter(deviceId);
            if (release === null) throw new ApiError(429, "rate_limited", "Too many relay calls are running. Try again shortly.");
            try {
              const counted = store.transaction((tx) => countRelayCall(tx, deps.clock, deviceId, `relay:${family}`, config.aiDailyRequests));
              if (counted.ok) return release;
              release();
              const body = errorBody(new ApiError(429, "quota_exhausted", "The daily limit for AI calls through this server is used up."), c.requestId);
              body.error["retryAfterSeconds"] = counted.retryAfterSeconds;
              return { status: 429, body, headers: { "retry-after": String(counted.retryAfterSeconds) } };
            } catch (error) {
              release();
              if (error instanceof StoreError && error.code === "store_unavailable") throw new ApiError(503, "store_unavailable", "The server is busy. Try again shortly.");
              throw error;
            }
          },
        });
      },
    },
  ]);
}
