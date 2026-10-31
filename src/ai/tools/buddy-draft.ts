import { z } from "zod";
import type { Mode } from "../log.ts";
import type { BuddyPort } from "../proposals/ports.ts";
import type { ToolDef } from "./registry.ts";

export const draftArgs: z.ZodType<{ buddy?: string; text: string }> = z.strictObject({
  buddy: z.string().trim().min(1).max(40).optional(),
  text: z.string().trim().min(1).max(600),
});

export interface BuddyDraft {
  buddy?: string;
  text: string;
  includeLink: boolean;
}

export type DraftResult =
  | { ok: true; draft: BuddyDraft }
  | { ok: false; error: "bad_args" | "unknown_ref" | "not_allowed_in_mode" | "forbidden"; message: string };

const MODES: readonly Mode[] = ["socratic", "beginner", "direct", "debugging", "advanced"];
const ALIASES_SHOWN = 5;
// Control characters except tab and newline, plus zero width and bidi marks that hide what a message says.
const HIDDEN = /[\p{Cc}​-‏‪-‮⁠-⁤⁦-⁩﻿]/gu;

const fail = (error: Extract<DraftResult, { ok: false }>["error"], message: string): DraftResult => ({ ok: false, error, message });

const strip = (text: string): string => text.replace(HIDDEN, (ch) => (ch === "\n" || ch === "\t" ? ch : ""));

/** Checks the model's draft. Nothing is sent or stored; the person sees it on a card first. */
export function runDraft(
  args: unknown,
  deps: { buddies: Pick<BuddyPort, "list">; tainted: boolean; secretShape(s: string): boolean },
): DraftResult {
  if (deps.tainted) return fail("not_allowed_in_mode", "A buddy message cannot be drafted after reading outside text in this turn.");
  const parsed = draftArgs.safeParse(args);
  if (!parsed.success) return fail("bad_args", `${parsed.error.issues[0].path.join(".") || "arguments"}: ${parsed.error.issues[0].message}`);

  let buddy: string | undefined;
  if (parsed.data.buddy !== undefined) {
    const wanted = parsed.data.buddy.toLowerCase();
    const aliases = deps.buddies.list().map((b) => b.alias);
    buddy = aliases.find((a) => a.toLowerCase() === wanted);
    if (buddy === undefined) {
      const known = aliases.slice(0, ALIASES_SHOWN).join(", ");
      return fail("unknown_ref", known === "" ? "The person has no buddies." : `No buddy with that alias. Known aliases: ${known}.`);
    }
  }

  const text = strip(parsed.data.text).trim();
  if (text === "") return fail("bad_args", "text: the message is empty.");
  if (deps.secretShape(text)) return fail("forbidden", "The message looks like it contains a key or secret.");
  return { ok: true, draft: { ...(buddy === undefined ? {} : { buddy }), text, includeLink: false } };
}

export type DraftToolDef = Omit<ToolDef, "name"> & { name: "draft_buddy_message" };

export function draftToolDef(): DraftToolDef {
  return {
    name: "draft_buddy_message",
    cls: "effect",
    taint: [],
    description:
      "Write a short message to one of the person's buddies asking for a second look, for the person to review and send themselves. " +
      "Nothing is sent. If the person dismisses the draft, do not offer it again.",
    modes: MODES,
  };
}
