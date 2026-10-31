import { DEFAULT_QUIRKS } from "./adapters/openai.ts";
import type { Quirks } from "./adapters/openai.ts";
import type { AdapterCaps, AiClient, ModelRequest, ToolCallRef, ToolSpec } from "./adapters/types.ts";
import type { AiErrorCode } from "./errors.ts";
import { toAiError } from "./errors.ts";
import type { ProviderProfile } from "./profiles.ts";

export type CheckId = "C1" | "C2" | "C3" | "C4" | "C5" | "C6" | "C7" | "C8" | "C9" | "C10";

export type CheckResult = { id: CheckId; name: string; ok: boolean; detail: string; ms: number };

export type ConformanceReport = { at: number; results: CheckResult[]; caps: AdapterCaps; quirks: Quirks };

/** A client for the same provider with one thing changed, for the checks that need a different request path. */
export type ClientVariant = { quirks?: Quirks; wrongKey?: boolean };

export type ConformanceContext = {
  client: AiClient;
  profile: ProviderProfile;
  modelId: string;
  now(): number;
  signal: AbortSignal;
  /** Asked before every model call. False means the spending cap is reached and the run stops. */
  charge?(): Promise<boolean>;
  /** Builds a client for the variants C2 (token field) and C8 (wrong key) need. Without it those parts are skipped. */
  variant?(v: ClientVariant): AiClient;
  /** False when the run is outside a browser, so it says nothing about browser access. Default true. */
  browser?: boolean;
};

/** The model id rides on the request because `ModelRequest` has no field for it. */
export type ConformanceRequest = ModelRequest & { model: string };

type Run = {
  text: string;
  deltas: number;
  calls: ToolCallRef[];
  usage: { cacheReadTokens: number } | null;
  error: { code: AiErrorCode; status?: number } | null;
};

type Outcome = { ok: boolean; detail: string };

const CHECK_LIMIT_MS = 20_000;
const ABORT_LIMIT_MS = 1_000;
const NO_SUCH_MODEL = "iynk-conformance-no-such-model";
const SECRET_CODE = "7391";
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const TOOL_BLOCK = /```iynk-tool\s*([\s\S]*?)```/;

const LOOKUP: ToolSpec = {
  name: "lookup",
  description: "Looks up the secret code of a name. Call it before answering.",
  parameters: { type: "object", properties: { name: { type: "string" } }, required: ["name"], additionalProperties: false },
};

const CHECK_NAMES: Record<CheckId, string> = {
  C1: "Reachability",
  C2: "Plain chat",
  C3: "Streaming with usage",
  C4: "Tool round trip",
  C5: "Parallel tools",
  C6: "Tool choice none",
  C7: "JSON text fallback",
  C8: "Error mapping",
  C9: "Cache reporting",
  C10: "Abort",
};

function request(model: string, o: Partial<ConformanceRequest> & Pick<ConformanceRequest, "messages">): ConformanceRequest {
  return {
    model,
    system: [{ text: "You are a connection test. Keep every answer short." }],
    tools: [],
    toolChoice: "auto",
    maxOutputTokens: 100,
    requestId: "conformance",
    ...o,
  };
}

function ask(text: string): ConformanceRequest["messages"] {
  return [{ role: "user", text }];
}

function problem(error: NonNullable<Run["error"]>): string {
  return `${error.code}${error.status !== undefined ? `, HTTP ${error.status}` : ""}`;
}

function isLocal(baseUrl: string): boolean {
  try {
    return LOOPBACK_HOSTS.has(new URL(baseUrl).hostname);
  } catch {
    return false;
  }
}

function toolBlockCalls(text: string): boolean {
  const body = TOOL_BLOCK.exec(text)?.[1];
  if (body === undefined) return false;
  try {
    return (JSON.parse(body) as { name?: unknown } | null)?.name === LOOKUP.name;
  } catch {
    return false;
  }
}

function longPrefix(): string {
  return Array.from({ length: 120 }, (_, i) => `Reference note ${i + 1}: part R${i * 7 + 3} is rated for ${i + 5} volts.`).join("\n");
}

export async function runConformance(c: ConformanceContext): Promise<ConformanceReport> {
  const { profile, modelId } = c;
  const model = profile.models.find((m) => m.id === modelId);
  const inBrowser = c.browser ?? true;
  const results: CheckResult[] = [];
  const patch: Partial<AdapterCaps> = {};
  let client = c.client;
  let quirks = profile.quirks ?? DEFAULT_QUIRKS;
  let capped = false;

  async function collect(on: AiClient, req: ConformanceRequest, signal: AbortSignal, onDelta?: () => void): Promise<Run> {
    const run: Run = { text: "", deltas: 0, calls: [], usage: null, error: null };
    if (c.charge && !(await c.charge())) {
      capped = true;
      run.error = { code: "capped" };
      return run;
    }
    try {
      for await (const ev of on.stream(req, profile.id, signal)) {
        if (ev.t === "text") {
          run.text += ev.delta;
          run.deltas++;
          onDelta?.();
        } else if (ev.t === "tool_call") run.calls.push({ id: ev.id, name: ev.name, argsJson: ev.argsJson });
        else if (ev.t === "usage") run.usage = { cacheReadTokens: ev.cacheReadTokens };
        else if (ev.t === "error") run.error = { code: ev.code, ...(ev.status !== undefined ? { status: ev.status } : {}) };
      }
    } catch (error) {
      run.error = { code: toAiError(error, signal).code };
    }
    return run;
  }

  async function check(id: CheckId, body: (signal: AbortSignal) => Promise<Outcome>): Promise<boolean> {
    const started = c.now();
    let outcome: Outcome;
    try {
      outcome = await body(AbortSignal.any([c.signal, AbortSignal.timeout(CHECK_LIMIT_MS)]));
    } catch (error) {
      outcome = { ok: false, detail: toAiError(error, c.signal).message };
    }
    results.push({ id, name: CHECK_NAMES[id], ...outcome, ms: c.now() - started });
    return outcome.ok;
  }

  const nativeTools = () => patch.tools === "native";
  const stopped = () => c.signal.aborted || capped;

  const reachable = await check("C1", async (signal) => {
    const probe = await c.client.probe(profile.id, signal);
    const status = probe.status;
    if (!probe.reachable) {
      if (status !== undefined) return { ok: false, detail: `The call was refused (HTTP ${status}).` };
      if (inBrowser && profile.via !== "relay") {
        patch.browserDirect = "no";
        return { ok: false, detail: "The browser could not reach the provider. It may block browser calls. Use the relay, or check the address." };
      }
      return { ok: false, detail: "The provider could not be reached. Check the address." };
    }
    if (inBrowser && profile.via !== "relay") patch.browserDirect = "yes";
    if (status === 401 || status === 403) return { ok: false, detail: "The provider answered but refused the key." };
    if (status !== undefined && status >= 400 && status !== 404 && status !== 405) return { ok: false, detail: `The provider answered HTTP ${status}.` };
    if (probe.modelIds.length > 0 && !probe.modelIds.includes(modelId)) {
      return { ok: true, detail: "Reached. The model list does not name this model, which may be a different spelling." };
    }
    return { ok: true, detail: status === 404 || status === 405 ? "Reached. The provider has no model list." : "Reached." };
  });

  if (reachable) {
    await check("C2", async (signal) => {
      const req = request(modelId, { messages: ask("Reply with the single word ok.") });
      let run = await collect(client, req, signal);
      let note = "";
      if (run.error?.code === "upstream_failed" && run.error.status === 400 && profile.family === "openai-compat" && c.variant) {
        const other: Quirks = { ...quirks, maxTokensField: quirks.maxTokensField === "max_tokens" ? "max_completion_tokens" : "max_tokens" };
        const alt = c.variant({ quirks: other });
        const retry = await collect(alt, req, signal);
        if (retry.text) {
          client = alt;
          quirks = other;
          run = retry;
          note = ` The provider wants ${other.maxTokensField}.`;
        }
      }
      if (run.error) return { ok: false, detail: `The call failed (${problem(run.error)}).` };
      return run.text ? { ok: true, detail: `Answered.${note}` } : { ok: false, detail: "The provider sent no text." };
    });

    if (!stopped()) {
      await check("C3", async (signal) => {
        const run = await collect(client, request(modelId, { messages: ask("Count from one to five, one number per line.") }), signal);
        if (run.error) return { ok: false, detail: `The call failed (${problem(run.error)}).` };
        patch.usageInStream = run.usage !== null;
        if (run.deltas < 2) return { ok: false, detail: "The answer did not arrive in pieces." };
        return run.usage
          ? { ok: true, detail: "Streamed with token counts." }
          : { ok: false, detail: "Streamed, but no token counts came with the stream. Cost will be estimated." };
      });
    }

    if (!stopped()) {
      await check("C4", async (signal) => {
        const first = request(modelId, { tools: [LOOKUP], messages: ask("Use the lookup tool for the name alpha, then tell me the code it returned.") });
        const one = await collect(client, first, signal);
        if (one.error) return { ok: false, detail: `The call failed (${problem(one.error)}).` };
        const call = one.calls[0];
        if (!call) return { ok: false, detail: "The model did not call the tool." };
        const second = request(modelId, {
          tools: [LOOKUP],
          messages: [
            ...first.messages,
            { role: "assistant", text: one.text, toolCalls: [call] },
            { role: "tool", callId: call.id, text: `code: ${SECRET_CODE}` },
          ],
        });
        const two = await collect(client, second, signal);
        if (two.error) return { ok: false, detail: `The call with the tool result failed (${problem(two.error)}).` };
        if (!two.text.includes(SECRET_CODE)) return { ok: false, detail: "The model did not use the tool result." };
        patch.tools = "native";
        return { ok: true, detail: "Called the tool and used its result." };
      });
    }

    if (!stopped()) {
      await check("C5", async (signal) => {
        if (!nativeTools()) return { ok: false, detail: "Not run, because native tools did not work." };
        const prompt = "Look up the codes of alpha and beta. Call the lookup tool twice in the same turn, once for each name.";
        const run = await collect(client, request(modelId, { tools: [LOOKUP], messages: ask(prompt), maxOutputTokens: 200 }), signal);
        if (run.error) return { ok: false, detail: `The call failed (${problem(run.error)}).` };
        patch.parallelTools = run.calls.length >= 2;
        return patch.parallelTools ? { ok: true, detail: "Made two calls in one turn." } : { ok: false, detail: "Made one call at a time." };
      });
    }

    if (!stopped()) {
      await check("C6", async (signal) => {
        const req = request(modelId, { tools: [LOOKUP], toolChoice: "none", messages: ask("Look up the code of alpha.") });
        const run = await collect(client, req, signal);
        if (run.error) return { ok: false, detail: `The call failed (${problem(run.error)}).` };
        return run.calls.length === 0 ? { ok: true, detail: "Held back from the tool." } : { ok: false, detail: "Called a tool when told not to." };
      });
    }

    if (!stopped()) {
      await check("C7", async (signal) => {
        if (nativeTools()) return { ok: true, detail: "Not needed, native tools work." };
        const system = [
          {
            text:
              "To call a tool, reply with only this block and nothing else:\n```iynk-tool\n" +
              '{"name":"lookup","args":{"name":"alpha"}}\n```\nThe tool lookup(name) returns the secret code of a name.',
          },
        ];
        const run = await collect(client, request(modelId, { system, messages: ask("Find the code of the name alpha.") }), signal);
        if (run.error) return { ok: false, detail: `The call failed (${problem(run.error)}).` };
        const ok = toolBlockCalls(run.text);
        patch.tools = ok ? "json-text" : "none";
        return ok ? { ok: true, detail: "Wrote a tool block the app can read." } : { ok: false, detail: "Did not write a readable tool block. Tools stay off." };
      });
    }

    if (!stopped()) {
      await check("C8", async (signal) => {
        const failures: string[] = [];
        const expect = async (on: AiClient, req: ConformanceRequest, code: AiErrorCode, label: string) => {
          const run = await collect(on, req, signal);
          if (run.error?.code === code) return;
          failures.push(run.error ? `${label} gave ${problem(run.error)}` : `${label} was accepted`);
        };
        const variant = c.variant;
        const keyed = profile.keyId !== null && variant !== undefined;
        if (keyed) await expect(variant({ wrongKey: true, quirks }), request(modelId, { messages: ask("Reply ok."), maxOutputTokens: 20 }), "auth", "A wrong key");
        await expect(client, request(NO_SUCH_MODEL, { messages: ask("Reply ok."), maxOutputTokens: 20 }), "bad_model", "An unknown model");
        const chars = Math.min((model?.contextTokens ?? 200_000) * 6, 8_000_000);
        const huge = "lorem ipsum dolor sit amet ".repeat(Math.ceil(chars / 27));
        await expect(client, request(modelId, { messages: ask(huge), maxOutputTokens: 20 }), "context_too_long", "A too long prompt");
        if (failures.length > 0) return { ok: false, detail: `${failures.join("; ")}.` };
        return { ok: true, detail: keyed ? "Errors map as expected." : "Errors map as expected. The wrong key check was skipped." };
      });
    }

    if (!stopped()) {
      await check("C9", async (signal) => {
        const req = request(modelId, {
          system: [{ text: longPrefix(), cacheBreakpoint: true }],
          messages: ask("Reply with the single word ok."),
          maxOutputTokens: 20,
        });
        const warm = await collect(client, req, signal);
        if (warm.error) return { ok: false, detail: `The call failed (${problem(warm.error)}).` };
        const again = await collect(client, req, signal);
        if (again.error) return { ok: false, detail: `The second call failed (${problem(again.error)}).` };
        const hit = (again.usage?.cacheReadTokens ?? 0) > 0;
        patch.promptCache = hit ? (profile.family === "anthropic" ? "explicit" : "implicit") : "none";
        return hit ? { ok: true, detail: "The second call read from the cache." } : { ok: false, detail: "The second call did not report cache reads." };
      });
    }

    if (!stopped()) {
      await check("C10", async (signal) => {
        const stop = new AbortController();
        let abortedAt: number | null = null;
        const req = request(modelId, { messages: ask("Count from 1 to 500, one number per line."), maxOutputTokens: 1000 });
        await collect(client, req, AbortSignal.any([signal, stop.signal]), () => {
          if (abortedAt !== null) return;
          abortedAt = c.now();
          stop.abort();
        });
        if (abortedAt === null) return { ok: false, detail: "No text arrived to stop." };
        const took = c.now() - abortedAt;
        return took <= ABORT_LIMIT_MS ? { ok: true, detail: `Stopped in ${took} ms.` } : { ok: false, detail: `Took ${took} ms to stop.` };
      });
    }
  }

  const caps: AdapterCaps = {
    tools: "none",
    parallelTools: false,
    usageInStream: false,
    promptCache: "none",
    structuredOutput: false,
    contextTokens: model?.contextTokens ?? 128_000,
    maxOutputTokens: model?.maxOutputTokens ?? 4_096,
    browserDirect: "unknown",
    privacy: isLocal(profile.baseUrl) ? "local" : "cloud",
    ...profile.caps,
    ...patch,
  };
  return { at: c.now(), results, caps, quirks };
}

export function applyReport(p: ProviderProfile, r: ConformanceReport): ProviderProfile {
  const ids = (ok: boolean) => r.results.filter((result) => result.ok === ok).map((result) => result.id);
  return { ...p, caps: r.caps, quirks: r.quirks, lastConformance: { at: r.at, passed: ids(true), failed: ids(false) } };
}
