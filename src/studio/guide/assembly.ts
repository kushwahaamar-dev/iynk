import type { BridgeCommand } from "@/content/schema";
import type { Guide, Text } from "@/project/generated/types";
import type { StepState } from "@/project/guided/engine";

export interface AssemblyStep {
  index: number;
  title: string;
  body: string;
  kind: "build" | "break" | "test";
  command: BridgeCommand | null;
  refusal: string | null;
  state: StepState["state"];
  /** The failure a break step triggers. */
  fault: string | null;
  /** No figure condition and no fault: only the learner can say it is done. */
  manual: boolean;
  /** Done when the figure reports a state, so it cannot complete without the lens. */
  needsLens: boolean;
}

interface CatalogueStep {
  kind: AssemblyStep["kind"];
  action: BridgeCommand | null;
  done: Record<string, unknown>;
  fault?: string;
  title: Text;
  body: Text;
  refusal?: Text;
}

const say = (text: Text, locale: string): string => (typeof text === "string" ? text : (text[locale] ?? text.en));

/** The tour's build steps with the state the engine gave each. */
export function assemblySteps(guide: Guide, states: StepState[], locale: string): AssemblyStep[] {
  const steps = (guide.assembly ?? []) as CatalogueStep[];
  return steps.map((step, index) => {
    const gated = Object.keys(step.done ?? {}).length > 0;
    return {
      index,
      title: say(step.title, locale),
      body: say(step.body, locale),
      kind: step.kind,
      command: step.action,
      refusal: step.refusal === undefined ? null : say(step.refusal, locale),
      state: states.find((s) => s.index === index)?.state ?? "notStarted",
      fault: step.fault ?? null,
      manual: step.kind !== "break" && !gated,
      needsLens: step.kind !== "break" && gated,
    };
  });
}

/** What "Show me" sends through the lens handle, or null when the learner does the step in the figure. */
export function commandFor(step: AssemblyStep): { send: BridgeCommand } | null {
  return step.kind === "build" && step.command ? { send: step.command } : null;
}
