"use client";

import { useState } from "react";
import { Button, Callout, Chip } from "@/components/ui";
import type { Messages } from "@/i18n/namespaces";
import type { AssemblyStep } from "@/studio/guide/assembly";

export interface AssemblyGuideProps {
  steps: AssemblyStep[];
  figureReady: boolean;
  onShow(step: AssemblyStep): void;
  onMark(index: number): void;
  onBreak?(failureId: string): void;
  messages: Messages["studio"];
}

export function AssemblyGuide({ steps, figureReady, onShow, onMark, onBreak, messages }: AssemblyGuideProps) {
  const { assembly, guide } = messages.lesson;
  const [refused, setRefused] = useState<{ index: number; text: string } | null>(null);

  const show = (step: AssemblyStep) => {
    if (step.state !== "current") {
      setRefused({ index: step.index, text: step.refusal ?? assembly.refused });
      return;
    }
    setRefused(null);
    onShow(step);
  };

  return (
    <section aria-labelledby="assembly-guide-title" className="flex flex-col gap-2" data-testid="assembly-guide">
      <h3 id="assembly-guide-title" className="text-sm font-semibold">
        {assembly.title}
      </h3>
      <ol className="flex flex-col gap-2">
        {steps.map((step) => {
          const waitingForLens = step.needsLens && !figureReady && step.state !== "done";
          return (
            <li key={step.index} data-state={step.state} aria-current={step.state === "current" ? "step" : undefined} className="flex flex-col gap-2 rounded-lg bg-sunken px-3 py-2">
              <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                {step.title}
                <Chip tone={step.state === "done" ? "good" : step.state === "current" ? "info" : "neutral"}>{guide.step.state[step.state]}</Chip>
              </span>
              <p className="text-pretty text-sm text-muted">{step.body}</p>
              {waitingForLens && <p className="text-sm text-muted">{assembly.needsLens}</p>}
              {step.state !== "done" && (
                <span className="flex flex-wrap items-center gap-2">
                  {step.kind === "break" ? (
                    onBreak &&
                    step.fault && (
                      <Button size="sm" variant="secondary" disabled={step.state !== "current"} onClick={() => onBreak(step.fault as string)}>
                        {assembly.break}
                      </Button>
                    )
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => show(step)}>
                      {assembly.showMe}
                    </Button>
                  )}
                  {step.manual && (
                    <Button size="sm" variant="ghost" disabled={step.state !== "current"} onClick={() => onMark(step.index)}>
                      {assembly.manual}
                    </Button>
                  )}
                </span>
              )}
              {refused?.index === step.index && (
                <Callout tone="warn" live>
                  {refused.text}
                </Callout>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
