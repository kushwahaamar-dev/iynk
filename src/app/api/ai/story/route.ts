import { z } from "zod";
import { LOCALES } from "@/i18n/config";
import { LABS } from "@/lib/server/ai/catalog";
import { aiFailure, aiUser, guardAi } from "@/lib/server/ai/guard";
import { LANGUAGE_NAMES, quoted } from "@/lib/server/ai/prompts/language";
import { storyPrompt } from "@/lib/server/ai/prompts/story";
import { chatJson } from "@/lib/server/ai/provider";
import type { StoryResponse } from "@/lib/server/ai/types";
import { json, parseBody } from "@/lib/server/http";

// No `runtime` export: cacheComponents rejects it, and Node.js is the default.
export const maxDuration = 60;

const MAX_WORDS = 250;

const Body = z.object({
  lab: z.enum(LABS),
  itemId: z.string().min(1).max(64),
  locale: z.enum(LOCALES),
  peers: z.array(z.object({ name: z.string().trim().min(1).max(24), lang: z.enum(LOCALES) })).max(8),
  events: z
    .array(
      z.object({
        t: z.number().nonnegative(),
        who: z.string().max(24),
        kind: z.string().min(1).max(24),
        text: z.string().max(500),
      }),
    )
    .min(1)
    .max(300),
});

const Reply = z.object({
  title: z.string().min(1).max(120),
  story: z.string().min(1).max(4000),
  highlights: z.array(z.string().min(1).max(200)).min(1).max(6),
  imagePrompt: z.string().min(1).max(1200),
});

/** Event times may be epoch milliseconds or seconds since the start; both print as m:ss from the first event. */
function clock(t: number, t0: number): string {
  const seconds = Math.max(0, Math.round((t - t0) / (t0 > 1e11 ? 1000 : 1)));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Trims to at most `max` words, ending at the last full sentence when there is one. */
function capWords(text: string, max: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= max) return text.trim();
  const cut = words.slice(0, max).join(" ");
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "), cut.lastIndexOf("。"), cut.lastIndexOf("।"));
  return end > cut.length / 2 ? cut.slice(0, end + 1) : `${cut}…`;
}

export async function POST(req: Request) {
  const refused = guardAi(req, "story", 6);
  if (refused) return refused;
  const parsed = await parseBody(req, Body);
  if (!parsed.ok) return parsed.response;
  const { lab, itemId, locale, peers, events } = parsed.data;

  const t0 = Math.min(...events.map((e) => e.t));
  const log = [...events]
    .sort((a, b) => a.t - b.t)
    .map((e) => `[${clock(e.t, t0)}] ${e.who || "someone"} (${e.kind}): ${e.text}`)
    .join("\n");
  const people = peers.map((p) => `${p.name} (speaks ${LANGUAGE_NAMES[p.lang]})`).join(", ");

  try {
    const { data } = await chatJson(Reply, "build_story", {
      messages: [
        { role: "system", content: storyPrompt(locale) },
        {
          role: "user",
          content: [
            `They worked on ${lab} "${itemId}".`,
            quoted("People", people || "one learner"),
            quoted("Session log", log),
          ].join("\n\n"),
        },
      ],
      reasoning: "low",
      maxTokens: 6000,
      signal: req.signal,
      user: aiUser(req),
    });
    return json({
      title: data.title.trim(),
      story: capWords(data.story, MAX_WORDS),
      highlights: data.highlights.slice(0, 5).map((h) => h.trim()),
      imagePrompt: data.imagePrompt.trim().slice(0, 600),
    } satisfies StoryResponse);
  } catch (error) {
    return aiFailure(error);
  }
}
