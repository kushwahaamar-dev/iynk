import { z } from "zod";
import { fence } from "../context/fences.ts";
import { redactSecrets } from "../context/redact.ts";
import { cleanField } from "../context/sanitize.ts";
import type { SeenUrls } from "../render/links.ts";
import type { Mode } from "../log.ts";
import type { OfferPartInput } from "../../lib/search/schema.ts";
import type { Result } from "../../lib/search/client.ts";
import type { OffersResponse, WebResponse } from "../../lib/search/types.ts";
import { OFFER_SOURCES } from "../../lib/search/types.ts";
import type { ToolResult } from "./registry.ts";

export type EffectTool = "search_datasheet" | "find_parts";

export type EffectRequest = { id: string; tool: EffectTool; args: unknown; costNote: { searchesAtMost: number } };

export interface EffectHost {
  confirm(req: EffectRequest): Promise<"allow" | "deny">;
}

export type SearchApi = {
  fetchWeb(q: string, extract: boolean): Promise<Result<WebResponse>>;
  fetchOffers(parts: OfferPartInput[]): Promise<Result<OffersResponse>>;
};

const DATASHEET_PER_MESSAGE = 2;
const FIND_PARTS_PER_MESSAGE = 1;
const MAX_PARTS = 10;
const PART_CHARS = 120;
const DATASHEET_SEARCHES = 3;
const PAGE_CHARS = 3_000;
const MAX_RESULTS = 3;
const MAX_OFFERS_PER_PART = 3;

const schemas = {
  search_datasheet: z.strictObject({ query: z.string().trim().min(2).max(200) }),
  find_parts: z.strictObject({ parts: z.array(z.string().trim().min(2).max(PART_CHARS)).min(1).max(MAX_PARTS) }),
};

const fail = (code: Extract<ToolResult, { ok: false }>["code"], message: string): ToolResult => ({ ok: false, code, message });

const cleaned = (raw: string, cap: number): string => redactSecrets(cleanField(raw, cap).text).text;

function summariseWeb(data: WebResponse): { lines: string[]; urls: string[] } {
  const urls: string[] = [];
  const lines: string[] = [];
  for (const [i, r] of data.results.slice(0, MAX_RESULTS).entries()) {
    urls.push(r.url);
    lines.push(`${i + 1}. ${cleaned(r.title, 200)}`, `   ${cleaned(r.url, 300)}`, `   ${cleaned(r.snippet, 400)}`);
  }
  for (const page of (data.extracts ?? []).slice(0, MAX_RESULTS)) {
    urls.push(page.url);
    lines.push(`Page text from ${cleaned(page.url, 300)} (${cleaned(page.title, 200)}):`, cleaned(page.text, PAGE_CHARS));
  }
  return { lines, urls };
}

function summariseOffers(data: OffersResponse, labels: Map<string, string>): { lines: string[]; urls: string[] } {
  const urls: string[] = [];
  const lines: string[] = [];
  for (const part of data.parts) {
    lines.push(`${cleaned(labels.get(part.key) ?? part.key, PART_CHARS)}:`);
    if (part.offers.length === 0) lines.push("   no listings");
    for (const o of part.offers.slice(0, MAX_OFFERS_PER_PART)) {
      urls.push(o.url);
      lines.push(`   ${o.price} ${cleaned(o.currency, 8)} ${cleaned(o.source, 20)}: ${cleaned(o.title, 200)} ${cleaned(o.url, 300)}`);
    }
  }
  if (data.partial) lines.push(`Some prices are missing (${data.partial}).`);
  return { lines, urls };
}

export function createEffectRunner(o: { search: SearchApi; host: EffectHost; nonce(): string; seenUrls: SeenUrls }) {
  async function run(
    call: { id: string; name: string; argsJson: string },
    ctx: { mode: Mode; messageCounters: { searchDatasheet: number; findParts: number } },
  ): Promise<ToolResult> {
    if (call.name !== "search_datasheet" && call.name !== "find_parts") return fail("bad_args", "There is no such effect tool.");
    const tool: EffectTool = call.name;
    let raw: unknown;
    try {
      raw = call.argsJson.trim() === "" ? {} : JSON.parse(call.argsJson);
    } catch {
      return fail("bad_args", "The arguments are not valid JSON.");
    }
    const parsed = schemas[tool].safeParse(raw);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return fail("bad_args", `${issue.path.join(".") || "arguments"}: ${cleanField(issue.message, 120).text}`);
    }

    const counters = ctx.messageCounters;
    if (tool === "search_datasheet") {
      if (counters.searchDatasheet >= DATASHEET_PER_MESSAGE) return fail("rate", `At most ${DATASHEET_PER_MESSAGE} datasheet searches per message.`);
      counters.searchDatasheet++;
    } else {
      if (counters.findParts >= FIND_PARTS_PER_MESSAGE) return fail("rate", `At most ${FIND_PARTS_PER_MESSAGE} parts search per message.`);
      counters.findParts++;
    }

    // A key pasted into a query is replaced before the card shows it and before anything is sent.
    const shown: { query: string } | { parts: string[] } =
      "query" in parsed.data
        ? { query: redactSecrets(parsed.data.query).text }
        : { parts: parsed.data.parts.map((p) => redactSecrets(p).text) };
    const searchesAtMost = "query" in shown ? DATASHEET_SEARCHES : shown.parts.length * OFFER_SOURCES.length;
    const decision = await o.host.confirm({ id: call.id, tool, args: shown, costNote: { searchesAtMost } });
    if (decision === "deny") return fail("denied", "The person said no to this search.");

    let lines: string[];
    let urls: string[];
    if ("query" in shown) {
      const res = await o.search.fetchWeb(shown.query, true);
      if (!res.ok) return failed(res.code);
      ({ lines, urls } = summariseWeb(res.data));
    } else {
      const parts = shown.parts.map((query, i) => ({ key: `p${i}`, query, qty: 1 }));
      const res = await o.search.fetchOffers(parts);
      if (!res.ok) return failed(res.code);
      ({ lines, urls } = summariseOffers(res.data, new Map(parts.map((p) => [p.key, p.query]))));
    }
    if (lines.length === 0) lines = ["no results"];
    for (const url of urls) o.seenUrls.add(url);
    const text = fence(`tool:${tool}`, "X", lines.join("\n"), o.nonce());
    return { ok: true, text, bytes: text.length, taint: ["X"], truncated: false };
  }

  return { run };
}

function failed(code: Extract<Result<unknown>, { ok: false }>["code"]): ToolResult {
  switch (code) {
    case "needs_server":
      return fail("no_key", "This needs a server. Connect one in settings first.");
    case "no_key":
      return fail("no_key", "No search key is set.");
    case "rate_limited":
    case "quota_exhausted":
      return fail("rate", code === "quota_exhausted" ? "The search allowance on the server is used up." : "The server is busy. Try again in a moment.");
    case "not_configured":
      return fail("internal", "Search is switched off on the server.");
    case "failed":
      return fail("internal", "The search did not go through.");
  }
}
