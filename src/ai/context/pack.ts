import { sha256Hex } from "../../core/sha256.ts";
import type { Mode } from "../log.ts";
import type { PartnerSources } from "../sources.ts";
import { BUDGETS, PackTooLarge, estimateTokens } from "./budget.ts";
import type { PackProfile } from "./budget.ts";
import type { Level } from "./digest.ts";
import { DEFAULT_SHRINK, SOURCE_LABELS, plan } from "./serialise.ts";
import type { SectionInfo, Shrink } from "./serialise.ts";

export type SourceId = "S1" | "S2" | "S3" | "S4" | "S5" | "S6" | "S7" | "S8" | "S9" | "S10" | "S11";

export type PackInput = {
  sources: PartnerSources;
  mode: Mode;
  profile: PackProfile;
  thread: { summary: string | null; turns: readonly { role: "user" | "assistant"; text: string }[] };
  userMessage: string;
  nonce: string;
  toggles: Partial<Record<SourceId, boolean>>;
  /** Running ratio of the provider's input tokens to our estimate for this model. */
  correction: number;
};

export type Pack = {
  text: string;
  stable: string;
  hash: string;
  hash8: string;
  stableHash: string;
  tokensEst: number;
  profile: PackProfile;
  level: Level;
  sections: readonly { id: SourceId; label: string; tokens: number; included: boolean }[];
  evicted: readonly string[];
  redactions: number;
};

type Eviction = { name: string; apply: (state: State) => void };
type State = { level: Level; shrink: Shrink };

const SOURCE_IDS = Object.keys(SOURCE_LABELS) as SourceId[];
const CODE_LADDER = [200, 80, 40, 20];

function codeStep(lines: number): Eviction {
  return { name: `code-window-${lines}`, apply: (s) => void (s.shrink = { ...s.shrink, codeLines: lines }) };
}

/** AI_ARCHITECTURE 5.7, first item first. The attempt digest and the op groups do not exist yet. */
function evictions(profile: PackProfile): Eviction[] {
  const start = profile === "extended" ? 200 : 80;
  return [
    { name: "history", apply: (s) => void (s.shrink = { ...s.shrink, history: "recent" }) },
    ...CODE_LADDER.filter((n) => n < start).map(codeStep),
    { name: "serial-lines", apply: (s) => void (s.shrink = { ...s.shrink, serialLines: 5 }) },
    { name: "digest-D1", apply: (s) => void (s.level = "D1") },
    { name: "digest-D0", apply: (s) => void (s.level = "D0") },
  ];
}

function enabled(i: PackInput, parts: SectionInfo[][]): SectionInfo[][] {
  return parts.map((part) => part.filter((s) => i.toggles[s.id] !== false));
}

function* construct(i: PackInput): Generator<void, Pack> {
  const budget = BUDGETS[i.profile];
  const state: State = {
    level: "D2",
    shrink: { ...DEFAULT_SHRINK, codeLines: i.profile === "extended" ? 200 : DEFAULT_SHRINK.codeLines },
  };
  const ladder = evictions(i.profile);
  const evicted: string[] = [];

  for (let step = 0; ; step++) {
    const { steps, finish } = plan(i, state.level, state.shrink);
    const parts: SectionInfo[][] = [];
    for (const run of steps) {
      parts.push(run());
      yield;
    }
    const built = finish(enabled(i, parts));
    const text = built.stable + built.volatile;
    const tokensEst = estimateTokens(text, i.correction);
    const next = ladder[step];
    if (tokensEst > budget) {
      if (!next) throw new PackTooLarge(tokensEst, budget);
      next.apply(state);
      evicted.push(next.name);
      continue;
    }

    const hash = sha256Hex(text);
    return {
      text,
      stable: built.stable,
      hash,
      hash8: hash.slice(0, 8),
      stableHash: sha256Hex(built.stable),
      tokensEst,
      profile: i.profile,
      level: state.level,
      sections: SOURCE_IDS.map((id) => {
        const mine = built.sections.filter((s) => s.id === id);
        const tokens = mine.reduce((n, s) => n + estimateTokens(s.text, i.correction), 0);
        return { id, label: SOURCE_LABELS[id], tokens, included: mine.length > 0 };
      }),
      evicted,
      redactions: built.redactions,
    };
  }
}

export function buildPack(i: PackInput): Pack {
  const run = construct(i);
  for (let r = run.next(); ; r = run.next()) if (r.done) return r.value;
}

/** Same bytes as `buildPack`, with a yield between the sections so no single task runs long. */
export async function buildPackYielding(i: PackInput, yieldToMain: () => Promise<void>): Promise<Pack> {
  const run = construct(i);
  for (let r = run.next(); ; r = run.next()) {
    if (r.done) return r.value;
    await yieldToMain();
  }
}

export function sameBytes(pack: Pack, requestText: string): boolean {
  return requestText === pack.text;
}
