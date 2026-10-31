import { estimateTokens } from "../context/budget.ts";
import { makeNonce } from "../context/fences.ts";
import type { TokenCounts } from "../prices.ts";
import type { OutputFlag } from "../render/checks.ts";

export type Usage = TokenCounts;

/** A reference in the answer that points at nothing in the project is marked `unverified`; an answer with no words is `empty`. */
export type TurnFlag = OutputFlag | "unverified" | "empty";

export type ToolRecord = {
  id: string;
  name: string;
  argsText: string;
  /** Shown in the panel. Held in memory only, never stored. */
  resultText: string;
  ok: boolean;
  code?: string;
  ms: number;
  bytes: number;
};

export type Turn = {
  id: string;
  role: "user" | "assistant";
  text: string;
  refs: string[];
  tools: ToolRecord[];
  flags: TurnFlag[];
  usage: Usage | null;
  at: number;
};

export type Thread = { id: string; projectId: string | null; turns: Turn[] };

export function newId(prefix: string, random: () => number): string {
  return `${prefix}_${makeNonce(random)}${makeNonce(random)}`;
}

export function newThread(o: { projectId: string | null; random(): number }): Thread {
  return { id: newId("thr", o.random), projectId: o.projectId, turns: [] };
}

/** The newest turns that fit in `budget` tokens, oldest first. */
export function toMessages(turns: readonly Turn[], budget: number): { role: "user" | "assistant"; text: string }[] {
  const kept: { role: "user" | "assistant"; text: string }[] = [];
  let used = 0;
  for (let i = turns.length - 1; i >= 0; i--) {
    const turn = turns[i];
    if (turn.text === "") continue;
    used += estimateTokens(turn.text, 1);
    if (used > budget) break;
    kept.unshift({ role: turn.role, text: turn.text });
  }
  return kept;
}
