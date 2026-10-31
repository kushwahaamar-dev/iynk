import type { HintPort, LogPort } from "./proposals/ports.ts";

export type Level = 0 | 1 | 2 | 3;
export type Topic = { kind: "fault"; faultId: string } | { kind: "concept"; label: string };
export type LadderEvent = "another" | "show" | "repeat";

export interface LadderDeps {
  hint: HintPort;
  log: LogPort;
  holdMe(): boolean;
}

export type LadderStep = { level: Level; needsConfirm: boolean; revealed: boolean };

export const DISCLOSURE: Record<Level, "clarify" | "where" | "what_to_try" | "cause"> = {
  0: "clarify",
  1: "where",
  2: "what_to_try",
  3: "cause",
};

const LADDER_BLOCKS: Record<Level, string> = {
  0: "Hint level 0. Ask what the person sees or expects. Do not name a part, a net or a cause.",
  1: "Hint level 1. Point at where to look: a part, a net or a panel. Do not say what is wrong.",
  2: "Hint level 2. Suggest what to try or measure next. Do not state the cause and do not write the fix.",
  3: "Hint level 3. The person asked for the answer. State the cause and the fix plainly.",
};

export function ladderBlock(level: Level): string {
  return LADDER_BLOCKS[level];
}

const TOKEN_MIN = 3;
const SAME_QUESTION = 0.8;

function tokens(text: string): Set<string> {
  return new Set(text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter(Boolean));
}

export function sameQuestion(a: string, b: string): boolean {
  const left = tokens(a);
  const right = tokens(b);
  if (left.size < TOKEN_MIN || right.size < TOKEN_MIN) return false;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  return shared / (left.size + right.size - shared) >= SAME_QUESTION;
}

const topicLabel = (topic: Topic) => (topic.kind === "fault" ? topic.faultId : topic.label);

const raise = (level: Level): Level => (level >= 3 ? 3 : ((level + 1) as Level));

export class Ladder {
  private readonly concepts: Record<string, Level> = Object.create(null);

  constructor(private readonly deps: LadderDeps) {}

  level(topic: Topic): Level {
    if (this.isFault(topic)) return this.deps.hint.hintLevel(topic.faultId);
    return this.concepts[topic.label] ?? 0;
  }

  next(topic: Topic, ev: LadderEvent, confirmed?: boolean): LadderStep {
    if (ev === "show" && this.deps.holdMe() && confirmed !== true) {
      return { level: this.level(topic), needsConfirm: true, revealed: false };
    }
    const fault = this.isFault(topic);
    const step = fault && topic.kind === "fault" ? this.nextFault(topic.faultId, ev) : this.nextConcept(topicLabel(topic), ev);
    this.deps.log.record({
      kind: "hint.level",
      data: { topic: fault ? "fault" : "concept", level: step.level, via: "partner" },
    });
    return step;
  }

  reset(topic?: Topic): void {
    if (!topic) {
      for (const label of Object.keys(this.concepts)) delete this.concepts[label];
    } else if (topic.kind === "concept") {
      delete this.concepts[topic.label];
    }
  }

  private isFault(topic: Topic): topic is Extract<Topic, { kind: "fault" }> {
    return topic.kind === "fault" && this.deps.hint.sealedItems().some((item) => item.faultId === topic.faultId);
  }

  private nextFault(faultId: string, ev: LadderEvent): LadderStep {
    const { hint } = this.deps;
    if (ev === "show") {
      const shown = hint.showCause(faultId);
      return { level: shown.ok ? 3 : hint.hintLevel(faultId), needsConfirm: false, revealed: shown.ok };
    }
    const current = hint.hintLevel(faultId);
    if (current >= 3) return { level: 3, needsConfirm: false, revealed: false };
    const asked = hint.requestHint(faultId, (current + 1) as 1 | 2 | 3);
    return { level: asked.level, needsConfirm: false, revealed: false };
  }

  private nextConcept(label: string, ev: LadderEvent): LadderStep {
    const level = ev === "show" ? 3 : raise(this.concepts[label] ?? 0);
    this.concepts[label] = level;
    return { level, needsConfirm: false, revealed: ev === "show" };
  }
}
