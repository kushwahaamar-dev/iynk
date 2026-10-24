import "server-only";
import { z } from "zod";
import { LOCALES } from "@/i18n/config";
import { catalog, catalogLines, itemKey, parseItemKey } from "./catalog";
import { LANGUAGE_NAMES, quoted } from "./prompts/language";
import { planPrompt } from "./prompts/plan";
import { chatJson } from "./provider";
import type { PlanRequest, PlanResponse } from "./types";

/**
 * The Build Night planner behind POST /api/ai/plan and the MCP tool
 * plan_build_night. Throws AiError (not_configured when no AI key is set).
 */

export const PlanInput = z.object({
  locale: z.enum(LOCALES),
  participants: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(24),
        lang: z.enum(LOCALES),
        level: z.enum(["new", "some", "lots"]),
        wants: z.string().max(300),
      }),
    )
    .min(1)
    .max(8),
  messages: z.array(z.object({ who: z.string().max(24), text: z.string().max(500) })).max(100).optional(),
}) satisfies z.ZodType<PlanRequest>;

function replySchema(keys: [string, ...string[]]) {
  return z.object({
    title: z.string().min(1).max(120),
    // An enum of the catalog keys: the model cannot name an item that doesn't exist.
    item: z.enum(keys),
    why: z.string().min(1).max(1200),
    roles: z.array(z.object({ name: z.string(), role: z.string().min(1).max(40), firstTask: z.string().min(1).max(300) })),
    steps: z.array(z.string().min(1).max(300)).min(1).max(10),
    parts: z.array(z.string().min(1).max(120)).max(20),
  });
}

export async function planBuildNight(
  { locale, participants, messages = [] }: PlanRequest,
  opts: { signal?: AbortSignal; user?: string } = {},
): Promise<PlanResponse> {
  const items = catalog();
  const keys = items.map(itemKey) as [string, ...string[]];
  const people = participants
    .map((p) => `- ${p.name} (speaks ${LANGUAGE_NAMES[p.lang]}, experience: ${p.level}) wants: ${p.wants || "anything fun"}`)
    .join("\n");
  const chatLog = messages.map((m) => `${m.who}: ${m.text}`).join("\n");

  const { data } = await chatJson(replySchema(keys), "build_night_plan", {
    messages: [
      { role: "system", content: planPrompt(locale, catalogLines(items)) },
      {
        role: "user",
        content: [quoted("Participants", people), ...(chatLog ? [quoted("Group chat", chatLog)] : [])].join("\n\n"),
      },
    ],
    reasoning: "medium",
    maxTokens: 8000,
    signal: opts.signal,
    user: opts.user,
  });

  // Roles only for the people who are actually coming, in their order, one each.
  const roles = participants.flatMap((p) => {
    const role = data.roles.find((r) => r.name.trim().toLowerCase() === p.name.toLowerCase());
    return role ? [{ name: p.name, role: role.role.trim(), firstTask: role.firstTask.trim() }] : [];
  });
  return {
    title: data.title.trim(),
    item: parseItemKey(data.item),
    why: data.why.trim(),
    roles,
    steps: data.steps.map((s) => s.trim()).slice(0, 8),
    ...(data.parts.length ? { parts: data.parts.map((p) => p.trim()) } : {}),
  };
}
