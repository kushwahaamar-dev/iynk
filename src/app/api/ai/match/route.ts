import { z } from "zod";
import { LOCALES } from "@/i18n/config";
import { catalog, catalogLines, itemKey, parseItemKey } from "@/lib/server/ai/catalog";
import { aiFailure, aiUser, guardAi } from "@/lib/server/ai/guard";
import { quoted } from "@/lib/server/ai/prompts/language";
import { matchPrompt } from "@/lib/server/ai/prompts/match";
import { chatJson } from "@/lib/server/ai/provider";
import type { Match, MatchResponse } from "@/lib/server/ai/types";
import { json, parseBody } from "@/lib/server/http";

// No `runtime` export: cacheComponents rejects it, and Node.js is the default.
export const maxDuration = 60;

const MAX_MATCHES = 5;

const Profile = z.object({
  id: z.string().min(1).max(64),
  name: z.string().trim().min(1).max(24),
  lang: z.enum(LOCALES),
  interests: z.array(z.string().trim().min(1).max(40)).max(20),
  built: z.array(z.string().trim().min(1).max(120)).max(100),
  wants: z.string().max(300),
});

type Profile = z.output<typeof Profile>;

const Body = z.object({ me: Profile, pool: z.array(Profile).max(50) });

function replySchema(ids: [string, ...string[]], keys: [string, ...string[]]) {
  return z.object({
    matches: z
      .array(
        z.object({
          id: z.enum(ids),
          score: z.number(),
          why: z.string().min(1).max(600),
          sharedInterest: z.string().min(1).max(120),
          suggestedProject: z.enum(keys),
        }),
      )
      .max(10),
  });
}

const describe = (p: Profile) =>
  JSON.stringify({ id: p.id, name: p.name, lang: p.lang, interests: p.interests, built: p.built.slice(0, 30), wants: p.wants });

export async function POST(req: Request) {
  const refused = guardAi(req, "match", 10);
  if (refused) return refused;
  const parsed = await parseBody(req, Body);
  if (!parsed.ok) return parsed.response;
  const { me } = parsed.data;
  const pool = parsed.data.pool.filter((p, i, all) => p.id !== me.id && all.findIndex((q) => q.id === p.id) === i);
  if (!pool.length) return json({ matches: [] } satisfies MatchResponse);

  const items = catalog();
  const keys = items.map(itemKey) as [string, ...string[]];
  const ids = pool.map((p) => p.id) as [string, ...string[]];

  try {
    const { data } = await chatJson(replySchema(ids, keys), "buddy_matches", {
      messages: [
        { role: "system", content: matchPrompt(me.lang, catalogLines(items)) },
        { role: "user", content: [quoted("Me", describe(me)), quoted("Pool", pool.map(describe).join("\n"))].join("\n\n") },
      ],
      reasoning: "low",
      maxTokens: 6000,
      signal: req.signal,
      user: aiUser(req),
    });
    const matches: Match[] = data.matches
      .filter((m, i, all) => all.findIndex((n) => n.id === m.id) === i)
      .map((m) => ({
        id: m.id,
        score: Math.round(Math.min(100, Math.max(0, m.score))),
        why: m.why.trim(),
        sharedInterest: m.sharedInterest.trim(),
        suggestedProject: parseItemKey(m.suggestedProject),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_MATCHES);
    return json({ matches } satisfies MatchResponse);
  } catch (error) {
    return aiFailure(error);
  }
}
