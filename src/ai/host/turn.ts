import type { Msg, ModelRequest, ToolCallRef, ToolSpec, AiClient } from "../adapters/types.ts";
import { resolveAll } from "../citations.ts";
import { PackTooLarge, chooseProfile, estimateTokens } from "../context/budget.ts";
import type { PackProfile } from "../context/budget.ts";
import { makeNonce } from "../context/fences.ts";
import { buildPack } from "../context/pack.ts";
import type { Pack, PackInput } from "../context/pack.ts";
import { redactSecrets } from "../context/redact.ts";
import { AiError, aiError, toAiError } from "../errors.ts";
import type { Caps, Ledger } from "../ledger.ts";
import type { AiLogRow, ToolCallRecord } from "../log.ts";
import { MODE_SETTINGS, specsFor } from "../modes.ts";
import type { Mode } from "../modes.ts";
import { costUSD, priceFor } from "../prices.ts";
import type { ProfileModel, ProviderProfile } from "../profiles.ts";
import { FINAL_ROUND_NOTE, PROMPT_VERSION, systemParts } from "../prompts.ts";
import { checkAnswer } from "../render/checks.ts";
import type { SeenUrls } from "../render/links.ts";
import type { PartnerSources } from "../sources.ts";
import { TOOL_NAMES } from "../tools/schemas.ts";
import type { ToolResult } from "../tools/registry.ts";
import { newId, toMessages } from "./thread.ts";
import type { ToolRecord, Turn, TurnFlag, Usage } from "./thread.ts";
import type { Locale } from "../../i18n/config.ts";

export type PackSummary = Pick<Pack, "hash8" | "tokensEst" | "profile" | "level" | "sections" | "evicted" | "redactions">;

export type TurnEvent =
  | { t: "pack"; pack: PackSummary }
  | { t: "text"; delta: string }
  | { t: "tool"; record: ToolRecord }
  | { t: "usage"; usage: Usage; costUSD: number | null }
  | { t: "done"; turn: Turn }
  | { t: "error"; error: AiError };

type ToolCall = { id: string; name: string; argsJson: string };

export interface ToolRunnerLike {
  run(call: ToolCall, ctx: { mode: Mode; round: number }): Promise<ToolResult>;
  resetMessage(): void;
}

/** Runs the tools that change or fetch something outside the project, such as web search. */
export interface EffectRunnerLike {
  readonly specs: readonly ToolSpec[];
  run(call: ToolCall, ctx: { mode: Mode; round: number; signal: AbortSignal }): Promise<ToolResult>;
}

export type TurnDeps = {
  client: AiClient;
  ledger: Ledger;
  sources: PartnerSources;
  tools: ToolRunnerLike;
  effects: EffectRunnerLike | null;
  profile: ProviderProfile;
  model: ProfileModel;
  caps: Caps;
  log(row: AiLogRow): Promise<void>;
  seenUrls: SeenUrls;
  random(): number;
  now(): number;
  locale: Locale;
  threadId: string;
  projectId: string | null;
  /** Running ratio of the provider's input tokens to our estimate. */
  correction(): number;
};

export type TurnInput = {
  mode: Mode;
  text: string;
  thread: Turn[];
  toggles?: PackInput["toggles"];
  selection?: readonly string[];
  signal: AbortSignal;
};

type Streamed = {
  text: string;
  calls: ToolCallRef[];
  usage: Usage | null;
  reason: "stop" | "tool" | "length" | "filter";
  firstTokenMs: number;
  error: AiError | null;
};

const MAX_TEXT = 8_000;
const MAX_ROUNDS = 6;
const CALLS_PER_ROUND = 8;
const HISTORY_TOKENS = 3_000;
const SMALLER: Record<PackProfile, PackProfile | null> = { extended: "standard", standard: "compact", compact: null };

const pad = (n: number) => String(n).padStart(2, "0");

function localDay(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const addUsage = (a: Usage, b: Usage): Usage => ({
  inTokens: a.inTokens + b.inTokens,
  cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
  cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
  outTokens: a.outTokens + b.outTokens,
});

async function* streamCall(d: TurnDeps, req: ModelRequest, signal: AbortSignal): AsyncGenerator<TurnEvent, Streamed> {
  const started = d.now();
  let firstAt: number | null = null;
  const out: Streamed = { text: "", calls: [], usage: null, reason: "stop", firstTokenMs: 0, error: null };
  try {
    for await (const ev of d.client.stream(req, d.profile.id, signal)) {
      if (ev.t === "text" || ev.t === "tool_call") firstAt ??= d.now();
      if (ev.t === "text") {
        out.text += ev.delta;
        yield { t: "text", delta: ev.delta };
      } else if (ev.t === "tool_call") {
        out.calls.push({ id: ev.id, name: ev.name, argsJson: ev.argsJson });
      } else if (ev.t === "usage") {
        out.usage = { inTokens: ev.inTokens, cacheReadTokens: ev.cacheReadTokens, cacheWriteTokens: ev.cacheWriteTokens, outTokens: ev.outTokens };
      } else if (ev.t === "done") {
        out.reason = ev.reason;
      } else {
        out.error = aiError(ev.code, { status: ev.status, retryAfterMs: ev.retryAfterMs });
        break;
      }
    }
  } catch (error) {
    out.error = toAiError(error, signal);
  }
  if (!out.error && signal.aborted) out.error = aiError("aborted");
  out.firstTokenMs = firstAt === null ? 0 : firstAt - started;
  return out;
}

async function runCall(d: TurnDeps, call: ToolCall, n: number, ctx: { mode: Mode; round: number; signal: AbortSignal }) {
  const started = d.now();
  let result: ToolResult;
  if (n >= CALLS_PER_ROUND) result = { ok: false, code: "rate", message: `At most ${CALLS_PER_ROUND} tool calls per round.` };
  else if ((TOOL_NAMES as string[]).includes(call.name)) result = await d.tools.run(call, ctx);
  else if (d.effects) result = await d.effects.run(call, ctx);
  else result = { ok: false, code: "not_allowed_in_mode", message: `${call.name} is not available in ${ctx.mode} mode.` };

  const resultText = result.ok ? result.text : `error ${result.code}: ${result.message}`;
  const record: ToolRecord = {
    id: call.id,
    name: call.name,
    argsText: call.argsJson,
    resultText,
    ok: result.ok,
    ...(result.ok ? {} : { code: result.code }),
    ms: d.now() - started,
    bytes: result.ok ? result.bytes : 0,
  };
  return { record, result };
}

export async function* runTurn(d: TurnDeps, i: TurnInput): AsyncGenerator<TurnEvent> {
  if (i.text.trim() === "") throw new RangeError("the message is empty");
  if (i.text.length > MAX_TEXT) throw new RangeError(`the message is longer than ${MAX_TEXT} characters`);

  const redacted = redactSecrets(i.text);
  const settings = MODE_SETTINGS[i.mode];
  const rounds = Math.max(1, Math.min(MAX_ROUNDS, d.caps.maxCallsPerMessage));
  const specs = [...specsFor(i.mode), ...(d.effects?.specs ?? [])];
  const privacy = d.profile.caps?.privacy ?? "cloud";
  const price = priceFor(d.model, d.profile.id);
  const requestId = newId("req", d.random);
  const sources: PartnerSources = i.selection ? { ...d.sources, selection: () => i.selection! } : d.sources;

  const messages: Msg[] = [];
  const records: ToolRecord[] = [];
  const toolTexts: string[] = [];
  let answer = "";
  let total: Usage | null = null;
  let profile = chooseProfile(d.model);
  let shrunk = false;
  let cached: { key: string; pack: Pack } | null = null;
  let unlogged = redacted.count;

  d.tools.resetMessage();

  function packFor(): { pack: Pack; fresh: boolean } {
    const { revision, stateHash } = sources.project();
    const key = `${revision}:${stateHash}:${sources.selection().join(",")}:${profile}`;
    if (cached?.key === key) return { pack: cached.pack, fresh: false };
    const pack = buildPack({
      sources,
      mode: i.mode,
      profile,
      thread: { summary: null, turns: toMessages(i.thread, HISTORY_TOKENS) },
      userMessage: redacted.text,
      nonce: makeNonce(d.random),
      toggles: i.toggles ?? {},
      correction: d.correction(),
    });
    cached = { key, pack };
    return { pack, fresh: true };
  }

  function rowFor(r: {
    round: number;
    pack: Pack;
    startedAt: number;
    outcome: AiLogRow["outcome"];
    errorCode?: string;
    usage?: Usage;
    firstTokenMs?: number;
    toolCalls?: ToolCallRecord[];
    taint?: ("P" | "X")[];
    modeBlocked?: number;
    outputFlags?: string[];
  }): AiLogRow {
    const usage = r.usage ?? { inTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, outTokens: 0 };
    const secretsRedacted = unlogged;
    unlogged = 0;
    return {
      id: newId("log", d.random),
      at: r.startedAt,
      day: localDay(r.startedAt),
      projectId: d.projectId,
      threadId: d.threadId,
      requestId,
      round: r.round,
      task: "chat",
      mode: i.mode,
      tier: settings.tier,
      provider: d.profile.id,
      model: d.model.id,
      path: d.profile.via === "relay" ? "relay" : "direct",
      promptVersion: PROMPT_VERSION,
      packProfile: r.pack.profile,
      packTokensEst: r.pack.tokensEst,
      packHash8: r.pack.hash8,
      ...usage,
      costUSD: r.usage && price && privacy === "cloud" ? costUSD(price, usage) : null,
      priceAsOf: price?.asOf ?? null,
      firstTokenMs: r.firstTokenMs ?? 0,
      totalMs: d.now() - r.startedAt,
      toolCalls: r.toolCalls ?? [],
      outcome: r.outcome,
      ...(r.errorCode ? { errorCode: r.errorCode } : {}),
      policy: {
        forbiddenOps: 0,
        modeBlocked: r.modeBlocked ?? 0,
        taint: r.taint ?? [],
        injectionFlags: 0,
        secretsRedacted,
        outputFlags: r.outputFlags ?? [],
      },
    };
  }

  for (let round = 1; round <= rounds; round++) {
    const final = round === rounds;
    if (final && messages.at(-1)?.role === "tool") {
      const last = messages.at(-1)!;
      messages[messages.length - 1] = { ...last, text: last.text + FINAL_ROUND_NOTE } as Msg;
    }

    let got: Streamed;
    let pack: Pack;
    let reservationId: string;
    let startedAt: number;
    for (;;) {
      if (i.signal.aborted) {
        yield { t: "error", error: aiError("aborted") };
        return;
      }
      let built: { pack: Pack; fresh: boolean };
      try {
        built = packFor();
      } catch (error) {
        if (!(error instanceof PackTooLarge)) throw error;
        yield { t: "error", error: aiError("context_too_long") };
        return;
      }
      pack = built.pack;
      messages[0] = { role: "user", text: pack.text };
      if (built.fresh) {
        const { hash8, tokensEst, profile: packProfile, level, sections, evicted, redactions } = pack;
        yield { t: "pack", pack: { hash8, tokensEst, profile: packProfile, level, sections, evicted, redactions } };
      }

      startedAt = d.now();
      const gate = await d.ledger.check({
        provider: d.profile.id,
        model: d.model.id,
        privacy,
        price,
        packTokensEst: pack.tokensEst + estimateTokens(messages.slice(1).map((m) => m.text).join("\n"), d.correction()),
        correction: 1,
        maxOutputTokens: Math.min(settings.outputTokens, d.model.maxOutputTokens),
        sessionId: d.threadId,
      });
      if (!gate.ok) {
        await d.log(rowFor({ round, pack, startedAt, outcome: "capped", errorCode: "capped" }));
        yield { t: "error", error: aiError("capped", { which: gate.which }) };
        return;
      }
      reservationId = gate.reservationId;

      const request: ModelRequest = {
        system: systemParts(i.mode, d.locale),
        messages,
        tools: final ? [] : specs,
        toolChoice: final ? "none" : "auto",
        maxOutputTokens: gate.maxOutputTokens,
        requestId,
      };
      got = yield* streamCall(d, request, i.signal);

      const retry = got.error?.code === "context_too_long" && got.text === "" && got.calls.length === 0 && !shrunk && SMALLER[profile];
      if (!retry) break;
      await d.ledger.settle(reservationId, rowFor({ round, pack, startedAt, outcome: "error", errorCode: "context_too_long" }));
      profile = SMALLER[profile]!;
      shrunk = true;
    }

    if (got.error) {
      const { code } = got.error;
      if (code === "not_configured" || code === "no_key") {
        d.ledger.release(reservationId);
      } else {
        const outcome = code === "aborted" ? "aborted" : "error";
        await d.ledger.settle(reservationId, rowFor({ round, pack, startedAt, outcome, errorCode: code, firstTokenMs: got.firstTokenMs }));
      }
      yield { t: "error", error: got.error };
      return;
    }

    const usage = got.usage ?? {
      inTokens: pack.tokensEst,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      outTokens: estimateTokens(got.text, 1),
    };
    total = total ? addUsage(total, usage) : usage;
    answer += got.text;

    const results = final || got.calls.length === 0 ? [] : await Promise.all(got.calls.map((call, n) => runCall(d, call, n, { mode: i.mode, round, signal: i.signal })));
    for (const { record, result } of results) {
      records.push(record);
      toolTexts.push(record.resultText);
      if (result.ok) d.seenUrls.add(result.text);
      yield { t: "tool", record };
    }

    const finished = results.length === 0;
    let flags: TurnFlag[] = [];
    if (finished) {
      const checked = checkAnswer(answer, { packText: pack.text, toolTexts, changed: false });
      flags = [...new Set<TurnFlag>(checked.flags.map((f) => f.kind))];
    }
    const outcome: AiLogRow["outcome"] =
      final && got.calls.length > 0 ? "tool_limit" : got.reason === "length" ? "length" : got.reason === "filter" ? "filtered" : "ok";
    const taint = [...new Set(results.flatMap(({ result }) => (result.ok ? result.taint : [])).filter((c): c is "P" | "X" => c === "P" || c === "X"))];
    await d.ledger.settle(
      reservationId,
      rowFor({
        round,
        pack,
        startedAt,
        outcome,
        usage,
        firstTokenMs: got.firstTokenMs,
        toolCalls: results.map(({ record }) => ({ name: record.name, ok: record.ok, ...(record.code ? { code: record.code } : {}), ms: record.ms, bytes: record.bytes })),
        taint,
        modeBlocked: results.filter(({ record }) => record.code === "not_allowed_in_mode").length,
        outputFlags: flags,
      }),
    );
    yield { t: "usage", usage, costUSD: price && privacy === "cloud" ? costUSD(price, usage) : null };

    if (!finished) {
      messages.push({ role: "assistant", text: got.text, toolCalls: got.calls });
      for (const { record } of results) messages.push({ role: "tool", callId: record.id, text: record.resultText });
      continue;
    }

    const { resolved, unresolved } = resolveAll(answer, d.sources);
    if (unresolved.length > 0) flags.push("unverified");
    if (answer.trim() === "") flags.push("empty");
    yield {
      t: "done",
      turn: { id: newId("trn", d.random), role: "assistant", text: answer, refs: resolved.map((r) => r.raw), tools: records, flags, usage: total, at: d.now() },
    };
    return;
  }
}
