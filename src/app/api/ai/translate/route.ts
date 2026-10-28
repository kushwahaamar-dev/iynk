import { createHash } from "node:crypto";
import { z } from "zod";
import { LOCALES, type Locale } from "@/i18n/config";
import { aiCap, aiFailure, aiUser, callerKey, guardAi } from "@/lib/server/ai/guard";
import { ledger } from "@/lib/server/ai/ledger";
import { quoted } from "@/lib/server/ai/prompts/language";
import { mask, translatePrompt, unmask } from "@/lib/server/ai/prompts/translate";
import { AiError, chatJson } from "@/lib/server/ai/provider";
import type { TranslateResponse } from "@/lib/server/ai/types";
import { json, parseBody } from "@/lib/server/http";

const encoder = new TextEncoder();

const Body = z.object({
  texts: z
    .array(z.string().max(2048).refine((t) => encoder.encode(t).length <= 2048, "each text must be at most 2 KB"))
    .min(1)
    .max(20),
  to: z.enum(LOCALES),
  from: z.enum(LOCALES).optional(),
});

const Source = z.enum([...LOCALES, "und"]);
type Source = z.output<typeof Source>;

const Reply = z.object({ from: Source, texts: z.array(z.string()) });

/** Finished translations by hash of (from, to, text); a room translates the same line once per language. */
const CACHE_MAX = 5000;
const cache = new Map<string, { text: string; from: Source }>();

const keyOf = (text: string, to: Locale, from?: Locale) =>
  createHash("sha256").update(`${from ?? "auto"}\u0000${to}\u0000${text}`).digest("hex");

function remember(key: string, value: { text: string; from: Source }) {
  cache.delete(key);
  cache.set(key, value);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value as string);
}

export async function POST(req: Request) {
  const refused = guardAi(req, "translate", 60);
  if (refused) return refused;
  const key = callerKey(req);
  if (!key.ok) return key.response;
  const parsed = await parseBody(req, Body);
  if (!parsed.ok) return parsed.response;
  const { texts, to, from } = parsed.data;

  if (from === to) return json({ texts, from } satisfies TranslateResponse);

  const out: string[] = [...texts];
  const sources: Source[] = [];
  const todo: number[] = [];
  texts.forEach((text, i) => {
    if (!text.trim()) return;
    const hit = cache.get(keyOf(text, to, from));
    if (hit) {
      out[i] = hit.text;
      sources.push(hit.from);
    } else {
      todo.push(i);
    }
  });

  if (todo.length) {
    const keyId = ledger.keyId(key.key);
    const capped = aiCap(keyId);
    if (capped) return capped;
    const masked = todo.map((i) => mask(texts[i]));
    try {
      const { data, usage } = await chatJson(Reply, "translation", {
        messages: [
          { role: "system", content: translatePrompt(to, from) },
          { role: "user", content: quoted("Texts (JSON)", JSON.stringify({ texts: masked.map((m) => m.text) })) },
        ],
        reasoning: "low",
        maxTokens: 16_000,
        signal: req.signal,
        user: aiUser(req),
        key: key.key,
      });
      await ledger.recordAi(keyId, { tokens: usage.inTokens + usage.outTokens });
      if (data.texts.length !== todo.length) return aiFailure(new AiError("bad_output", "translation count mismatch"));
      todo.forEach((index, j) => {
        // A translation that lost a protected token falls back to the original text.
        const text = unmask(data.texts[j], masked[j].tokens) ?? texts[index];
        out[index] = text;
        remember(keyOf(texts[index], to, from), { text, from: from ?? data.from });
      });
      sources.push(from ?? data.from);
    } catch (error) {
      return aiFailure(error);
    }
  }

  return json({ texts: out, from: from ?? sources[0] ?? "und" } satisfies TranslateResponse);
}
