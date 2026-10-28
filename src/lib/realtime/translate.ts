// Live translation of room chat through /api/ai/translate (H4). Each line is
// translated once per reader language and cached for the page's lifetime;
// the server caches by hash as well.

import type { Locale } from "@/i18n/config";
import { withAiAuth } from "@/lib/keys/headers";
import { track } from "@/lib/telemetry";
import type { ChatMsg } from "./types";

const MAX_BATCH = 20;
const cache = new Map<string, string>();
const failed = new Set<string>();
const inflight = new Set<string>();

const keyOf = (to: Locale, from: Locale, text: string) => `${to}\u0000${from}\u0000${text}`;

export function cachedTranslation(to: Locale, from: Locale, text: string): string | undefined {
  return cache.get(keyOf(to, from, text));
}

/** Messages a reader in `to` still needs translated. */
export function needsTranslation(msg: ChatMsg, to: Locale): boolean {
  if (msg.kind === "system" || msg.lang === to || msg.translations[to] !== undefined) return false;
  const key = keyOf(to, msg.lang, msg.text);
  return !failed.has(key) && !inflight.has(key);
}

type TranslateResult = { ok: true; texts: string[] } | { ok: false; code: string };

export async function translateTexts(texts: string[], to: Locale, from: Locale, signal?: AbortSignal): Promise<TranslateResult> {
  const headers = withAiAuth({ "content-type": "application/json" });
  if (!headers) return { ok: false, code: "no_key" };
  track("ai.call", { kind: "translate" });
  try {
    const res = await fetch("/api/ai/translate", {
      method: "POST",
      headers,
      body: JSON.stringify({ texts, to, from }),
      signal,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: { code?: string } } | null;
      const code = res.status === 422 || body?.error?.code === "key_required" ? "no_key" : body?.error?.code;
      return { ok: false, code: code ?? `http_${res.status}` };
    }
    const body = (await res.json()) as { texts?: unknown };
    if (!Array.isArray(body.texts) || body.texts.length !== texts.length) return { ok: false, code: "bad_response" };
    return { ok: true, texts: body.texts.map(String) };
  } catch (error) {
    if ((error as { name?: string }).name === "AbortError") return { ok: false, code: "aborted" };
    return { ok: false, code: "network" };
  }
}

/**
 * Translates every message the reader can't read yet, grouped by source
 * language, and reports each result through `done`. Cached lines resolve
 * without a request.
 */
export async function translateMessages(
  messages: ChatMsg[],
  to: Locale,
  done: (id: string, text: string) => void,
  fail: (id: string) => void,
  signal?: AbortSignal,
): Promise<string | null> {
  const todo = messages.filter((msg) => needsTranslation(msg, to));
  const byLang = new Map<Locale, ChatMsg[]>();
  for (const msg of todo) {
    const hit = cachedTranslation(to, msg.lang, msg.text);
    if (hit !== undefined) {
      done(msg.id, hit);
      continue;
    }
    byLang.set(msg.lang, [...(byLang.get(msg.lang) ?? []), msg]);
  }
  let lastError: string | null = null;
  for (const [from, group] of byLang) {
    for (let i = 0; i < group.length; i += MAX_BATCH) {
      const batch = group.slice(i, i + MAX_BATCH);
      const keys = batch.map((msg) => keyOf(to, from, msg.text));
      for (const key of keys) inflight.add(key);
      const result = await translateTexts(
        batch.map((msg) => msg.text),
        to,
        from,
        signal,
      );
      for (const key of keys) inflight.delete(key);
      if (!result.ok) {
        if (result.code === "aborted") return null;
        lastError = result.code;
        // Don't hammer a failing or unconfigured endpoint with the same lines.
        for (const msg of batch) {
          failed.add(keyOf(to, from, msg.text));
          fail(msg.id);
        }
        continue;
      }
      batch.forEach((msg, index) => {
        cache.set(keyOf(to, from, msg.text), result.texts[index]);
        done(msg.id, result.texts[index]);
      });
    }
  }
  return lastError;
}

/** Lets a reader retry after an error. */
export function forgetFailures() {
  failed.clear();
}
