// describeBench(): what is on the learner's bench, as compact text for the
// partner's prompt (H4: at most 12 KB). Each lab adapter reads its store's
// state into BenchFacts; this module renders them most-important first and
// cuts whatever does not fit.

import type { LabKind } from "@/components/dock/types";
import { boardBench } from "./bench/board";
import { droneBench } from "./bench/drone";
import { roboticsBench } from "./bench/robotics";
import type { ApplyResult, BenchAdapter, BenchFacts } from "./bench/types";
import type { ProposedChange } from "./tools";

export const BENCH_MAX_BYTES = 12 * 1024;

const adapters: Record<LabKind, BenchAdapter> = {
  board: boardBench,
  robotics: roboticsBench,
  drone: droneBench,
};

export function benchFacts(lab: LabKind, itemId: string, state: unknown): BenchFacts {
  return adapters[lab].facts(state, itemId);
}

export function applyChange(lab: LabKind, state: unknown, change: ProposedChange): ApplyResult {
  return adapters[lab].apply(state, change);
}

const encoder = new TextEncoder();
const bytes = (text: string) => encoder.encode(text).length;

type Section = { head: string; lines: string[] };

function sections(facts: BenchFacts): Section[] {
  const tests = facts.tests.map(
    (test) =>
      `${test.pass === true ? "PASS" : test.pass === false ? "FAIL" : "not run"} ${test.name}${test.detail ? `: ${test.detail}` : ""}`,
  );
  return [
    { head: `# ${facts.title}`, lines: facts.context },
    { head: "## Active faults", lines: facts.faults },
    { head: "## Compile errors", lines: facts.errors },
    { head: "## Checks", lines: tests },
    { head: `## Code${facts.code?.lang ? ` (${facts.code.lang})` : ""}`, lines: facts.code ? facts.code.text.split("\n") : [] },
    { head: "## Wiring", lines: facts.nets },
    { head: "## Parts", lines: facts.parts },
    { head: "## Serial monitor (latest last)", lines: facts.serial },
    { head: "## Numbers", lines: facts.numbers },
    { head: "## Other state", lines: facts.other ? [facts.other] : [] },
  ].filter((section, index) => index === 0 || section.lines.length > 0);
}

/** Renders bench facts in priority order within `maxBytes`. */
export function renderBench(facts: BenchFacts, maxBytes: number = BENCH_MAX_BYTES): string {
  const out: string[] = [];
  let left = maxBytes;
  for (const { head, lines } of sections(facts)) {
    const headSize = bytes(head) + 1;
    if (headSize > left) break;
    out.push(head);
    left -= headSize;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const size = bytes(line) + 1;
      const rest = lines.length - i;
      const note = `… ${rest} more line${rest === 1 ? "" : "s"}`;
      // Keep room for the "more lines" note unless this is the last line.
      if (size + (rest > 1 ? bytes(note) + 1 : 0) > left) {
        if (bytes(note) + 1 <= left) {
          out.push(note);
          left -= bytes(note) + 1;
        }
        return out.join("\n");
      }
      out.push(line);
      left -= size;
    }
  }
  return out.join("\n");
}

export function describeBench(lab: LabKind, itemId: string, state: unknown): string {
  return renderBench(benchFacts(lab, itemId, state));
}
