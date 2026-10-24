// Questions worth asking, read off the bench: what is wrong comes first (an
// active fault, a compile error, a failed check), then what is there to ask
// about. Each is an "ai" namespace key under suggest.* plus its parameters.

import type { LabKind } from "@/components/dock/types";
import type { BenchFacts } from "./bench/types";

export type Suggestion =
  | { key: "fault"; params: { fault: string } }
  | { key: "failed"; params: { test: string } }
  | { key: "error" | "start" | "code" | "wiring" | "drone" | "safety" };

const short = (text: string) => (text.length > 60 ? `${text.slice(0, 59)}…` : text);

export function suggestions(lab: LabKind, facts: BenchFacts, max = 3): Suggestion[] {
  const out: Suggestion[] = [];
  const fault = facts.faults[0];
  if (fault) out.push({ key: "fault", params: { fault: short(fault) } });
  if (facts.errors.length) out.push({ key: "error" });
  const failed = facts.tests.find((test) => test.pass === false);
  if (failed) out.push({ key: "failed", params: { test: short(failed.name) } });
  if (lab === "drone") out.push({ key: "drone" });
  if (facts.code?.text.trim()) out.push({ key: "code" });
  if (facts.nets.length) out.push({ key: "wiring" });
  out.push({ key: "start" }, { key: "safety" });
  return out.slice(0, max);
}
