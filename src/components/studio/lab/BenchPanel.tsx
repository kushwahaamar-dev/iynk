"use client";

import { useMemo } from "react";
import { BenchView } from "@/components/robotics/BenchView";
import type { BenchMessages } from "@/components/robotics/messages";
import { Chip } from "@/components/ui/Chip";
import { TermList } from "@/components/ui/Term";
import type { TermId } from "@/i18n/terms";
import { learnStore } from "@/lib/learn/facade";
import type { BenchSetup } from "@/lib/robotics/session";
import { isConceptBench } from "@/studio/lab/bench-select";
import type { DocStore } from "@/studio/stores/doc";
import { useStoreSelector } from "@/studio/stores/select";
import { useBench } from "./useBench";

const BENCH_TERMS: readonly TermId[] = ["resistor", "voltage", "current", "pwm", "motor-driver", "i2c"];

export type BenchPanelProps = {
  doc: DocStore;
  setup: BenchSetup;
  messages: BenchMessages;
};

/** A robotics bench open as a project: the bench view over the project's faults and the learner record. */
export function BenchPanel({ doc, setup, messages }: BenchPanelProps) {
  const learn = useMemo(() => learnStore(), []);
  const concept = useStoreSelector(doc, (s) => isConceptBench(s.state));
  const bench = useBench({ doc, setup, learn, clearLabel: messages.faults.clear });

  return (
    <BenchView
      setup={setup}
      messages={messages}
      state={bench.state}
      dispatch={bench.dispatch}
      active={bench.active}
      figure={bench.figure.handle}
      onHandle={bench.figure.ref}
      onFigure={bench.figure.onEvent}
      savedDone={bench.savedDone}
      best={bench.best}
      notice={
        <>
          {concept ? <Chip tone="warn" role="note" className="whitespace-normal leading-snug">{messages.bench.concept}</Chip> : null}
          <TermList ids={BENCH_TERMS} />
        </>
      }
    />
  );
}
