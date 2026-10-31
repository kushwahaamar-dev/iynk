import { causeMeta, type CauseFamily } from "./causes.ts";
import { SHARED_RUN, wordsOf } from "./items.ts";
import type { CauseId, Finding, HintLadder, HintLevel, ProblemTarget } from "./types.ts";

type Level = 1 | 2 | 3;
type Opened = 0 | Level;
type TemplateFamily = "wiring" | "power" | "code" | "bus" | "value";
type MessageArgs = Record<string, string | number>;

export interface ResolvedLevel {
  level: Level;
  text: string | { key: string; args: Record<string, string | number> };
  focus?: HintLevel["focus"];
  probe?: HintLevel["probe"];
  generated: boolean;
}

export interface LadderInput {
  item?: { ladder?: HintLadder };
  descriptorHints?: { level: Level; text: string }[];
  cause: CauseId;
  finding?: Finding;
  /** The net the generated probe of level 2 measures against. Without it level 2 names no probe. */
  groundNet?: string;
}

const LEVELS: readonly Level[] = [1, 2, 3];
const BANDED_UNITS: ReadonlySet<string> = new Set(["V", "A", "ohm"]);

/** The placeholders each family's level 3 template needs; a finding that cannot fill them gets the level 1 text there. */
const LEVEL_3_ARGS: Record<TemplateFamily, readonly string[]> = {
  wiring: ["part", "pin"],
  power: ["net", "expected", "unit"],
  code: ["part"],
  bus: ["net"],
  value: ["part", "value", "unit", "expected"],
};

const templateFamily = (family: CauseFamily | undefined): TemplateFamily =>
  family === "power" || family === "code" || family === "bus" || family === "value" ? family : "wiring";

const idsOf = (targets: ProblemTarget[], ...kinds: ProblemTarget["kind"][]): string[] =>
  targets.filter((t) => kinds.includes(t.kind)).map((t) => t.id);

function focusOf(targets: ProblemTarget[]): HintLevel["focus"] {
  const components = [...new Set(idsOf(targets, "part", "pin"))];
  const nets = [...new Set(idsOf(targets, "net"))];
  if (components.length === 0 && nets.length === 0) return undefined;
  return { ...(components.length > 0 && { components }), ...(nets.length > 0 && { nets }) };
}

function probeOf(finding: Finding, groundNet: string | undefined): HintLevel["probe"] {
  const pin = finding.targets.find((t) => t.kind === "pin" && t.pin !== undefined);
  const a = pin ? `${pin.id}.${pin.pin}` : idsOf(finding.targets, "net")[0];
  if (a === undefined || groundNet === undefined) return undefined;
  const { min, max, unit } = finding.args;
  const banded = typeof min === "number" && typeof max === "number" && typeof unit === "string" && BANDED_UNITS.has(unit);
  return { a, b: groundNet, ...(banded && { expect: { min, max, unit: unit as "V" | "A" | "ohm" } }) };
}

function argsOf(finding: Finding | undefined): MessageArgs {
  if (!finding) return {};
  const part = finding.targets.find((t) => t.kind === "part" || t.kind === "pin");
  const net = finding.targets.find((t) => t.kind === "net");
  return {
    ...(part && { part: part.id }),
    ...(part?.pin !== undefined && { pin: part.pin }),
    ...(net && { net: net.id }),
    ...finding.args,
  };
}

function generated(level: Level, family: TemplateFamily, finding: Finding | undefined, groundNet: string | undefined): ResolvedLevel {
  const args = argsOf(finding);
  const key = (n: Level) => `hintTemplate.${family}.${n}`;
  if (level === 1) return { level, text: { key: key(1), args: {} }, focus: finding && focusOf(finding.targets), generated: true };
  if (level === 2) {
    const text: ResolvedLevel["text"] = args.part === undefined ? { key: key(1), args: {} } : { key: key(2), args: { part: args.part } };
    return { level, text, probe: finding && probeOf(finding, groundNet), generated: true };
  }
  const needed = Object.fromEntries(LEVEL_3_ARGS[family].map((name) => [name, args[name]]));
  const complete = Object.values(needed).every((v) => v !== undefined);
  return { level, text: complete ? { key: key(3), args: needed as MessageArgs } : { key: key(1), args: {} }, generated: true };
}

/** Three levels, each from the first source that has it: the reviewed item, the part descriptor, then the generator. */
export function ladderFor(input: LadderInput): [ResolvedLevel, ResolvedLevel, ResolvedLevel] {
  const family = templateFamily(causeMeta(input.cause)?.family);
  const resolve = (level: Level): ResolvedLevel => {
    const reviewed = input.item?.ladder?.levels[level - 1];
    if (reviewed && reviewed.text.trim() !== "") {
      return { level, text: reviewed.text, focus: reviewed.focus, probe: reviewed.probe, generated: false };
    }
    const fromPart = input.descriptorHints?.find((h) => h.level === level && h.text.trim() !== "");
    if (fromPart) return { level, text: fromPart.text, generated: false };
    return generated(level, family, input.finding, input.groundNet);
  };
  return LEVELS.map(resolve) as [ResolvedLevel, ResolvedLevel, ResolvedLevel];
}

export function nextLevel(opened: Opened): Level | undefined {
  return opened === 3 ? undefined : ((opened + 1) as Level);
}

/** True when the hint and the fix text share a run of four words. */
export function namesTheFix(level3: string, fix: string): boolean {
  const runs = (text: string): Set<string> => {
    const words = wordsOf(text);
    const out = new Set<string>();
    for (let i = 0; i + SHARED_RUN <= words.length; i++) out.add(words.slice(i, i + SHARED_RUN).join(" "));
    return out;
  };
  const fixRuns = runs(fix);
  return [...runs(level3)].some((run) => fixRuns.has(run));
}
