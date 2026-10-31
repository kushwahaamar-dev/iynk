import type { WorkerHandler } from "../../protocol/index.ts";
import type { ProfileStore } from "../../local/ai-profiles.ts";
import { anthropicWire } from "../adapters/anthropic.ts";
import { DEFAULT_QUIRKS, openaiWire } from "../adapters/openai.ts";
import type { ConformanceInput, Transport } from "../adapters/types.ts";
import { withRetry } from "../adapters/wire.ts";
import { createCustody } from "../custody.ts";
import type { Custody, SecretReader } from "../custody.ts";
import { aiError, toAiError } from "../errors.ts";
import type { ProviderProfile } from "../profiles.ts";
import { autoTransport, directTransport, relayTransport } from "../transports.ts";
import type { AiToHost, HostToAi } from "./protocol.ts";

const PROBE_TIMEOUT_MS = 15_000;

export type AiHandlerDeps = {
  store: ProfileStore;
  secrets: SecretReader;
  fetch: typeof fetch;
  browser: boolean;
};

async function scrubDeep(custody: Custody, value: unknown): Promise<unknown> {
  if (typeof value === "string") return (await custody.scrub(value)).text;
  if (Array.isArray(value)) return Promise.all(value.map((item) => scrubDeep(custody, item)));
  if (typeof value === "object" && value !== null) {
    const entries = await Promise.all(Object.entries(value).map(async ([key, item]) => [key, await scrubDeep(custody, item)] as const));
    return Object.fromEntries(entries);
  }
  return value;
}

function modelIds(body: unknown): string[] {
  const data = (body as { data?: unknown } | null)?.data;
  if (!Array.isArray(data)) return [];
  return data.flatMap((item) => (typeof (item as { id?: unknown } | null)?.id === "string" ? [(item as { id: string }).id] : []));
}

export function createAiHandler(deps: AiHandlerDeps): WorkerHandler<HostToAi, AiToHost> {
  const custody = createCustody(deps.store, deps.secrets);
  let token: string | null = null;
  let relayUrl: string | null = null;
  const controllers = new Map<string, AbortController>();

  const direct = directTransport({ fetch: deps.fetch, custody, browser: deps.browser });
  const relay = relayTransport({ fetch: deps.fetch, custody, relayUrl: () => relayUrl, token: async () => token });
  const auto = autoTransport(direct, relay, () => ({ server: relayUrl !== null }));

  async function profileOf(profileId: string): Promise<ProviderProfile> {
    const profile = await deps.store.get(profileId);
    if (!profile) throw aiError("not_configured");
    return profile;
  }

  function transportFor(profile: ProviderProfile): Transport {
    if (profile.via === "direct") return direct;
    return profile.via === "relay" ? relay : auto;
  }

  async function stream(msg: Extract<HostToAi, { t: "stream" }>, emit: (ev: AiToHost) => void): Promise<void> {
    const controller = new AbortController();
    const { signal } = controller;
    controllers.set(msg.id, controller);
    try {
      const profile = await profileOf(msg.profileId);
      const wire = profile.family === "anthropic" ? anthropicWire : openaiWire;
      const built = wire.buildBody(msg.req, { stream: true, quirks: profile.quirks ?? DEFAULT_QUIRKS });
      const body = (await scrubDeep(custody, built)) as object;
      const transport = transportFor(profile);
      const res = await withRetry(() => transport.send({ profile, path: "chat", body, signal }), signal);
      for await (const ev of wire.parse(res, signal)) emit({ t: "event", id: msg.id, ev });
    } catch (error) {
      const { code, detail } = toAiError(error, signal);
      emit({
        t: "event",
        id: msg.id,
        ev: {
          t: "error",
          code,
          ...(detail?.status !== undefined ? { status: detail.status } : {}),
          ...(detail?.retryAfterMs !== undefined ? { retryAfterMs: detail.retryAfterMs } : {}),
        },
      });
    } finally {
      controllers.delete(msg.id);
      emit({ t: "end", id: msg.id });
    }
  }

  async function probe(msg: Extract<HostToAi, { t: "probe" }>, emit: (ev: AiToHost) => void): Promise<void> {
    const controller = new AbortController();
    controllers.set(msg.id, controller);
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    let result: ConformanceInput = { reachable: false, modelIds: [] };
    try {
      const profile = await profileOf(msg.profileId);
      const res = await transportFor(profile).send({ profile, path: "models", body: {}, signal: controller.signal });
      const ids = res.ok ? modelIds(await res.json().catch(() => null)) : [];
      await res.body?.cancel().catch(() => {});
      result = { reachable: true, status: res.status, modelIds: ids };
    } catch (error) {
      const { detail } = toAiError(error, controller.signal);
      result = { reachable: false, ...(detail?.status !== undefined ? { status: detail.status } : {}), modelIds: [] };
    } finally {
      clearTimeout(timer);
      controllers.delete(msg.id);
    }
    emit({ t: "probe", id: msg.id, result });
  }

  return async (msg, emit) => {
    switch (msg.t) {
      case "stream":
        return stream(msg, emit);
      case "probe":
        return probe(msg, emit);
      case "abort":
        controllers.get(msg.id)?.abort();
        return;
      case "token":
        token = msg.token;
        return;
      case "config":
        relayUrl = msg.relayUrl;
        return;
    }
  };
}
