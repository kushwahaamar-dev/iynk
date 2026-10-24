"use client";

import type { DroneContent, FigureState } from "@/content/schema";
import { Button } from "@/components/ui/Button";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { testStatus, type TestStatus } from "@/lib/dronelab/bench";
import type { DroneLabAction } from "@/lib/dronelab/store";
import type { ContentT, DroneLabT } from "./text";

const TONE: Record<TestStatus, ChipTone> = { passed: "mint", running: "mustard", failed: "tomato", idle: "plain" };

type Props = {
  content: DroneContent;
  figure: FigureState;
  attempted: Record<string, true>;
  ready: boolean;
  t: DroneLabT;
  ct: ContentT;
  dispatch(action: DroneLabAction): void;
};

export function TestsPanel({ content, figure, attempted, ready, t, ct, dispatch }: Props) {
  const rows = content.tests.map((test) => ({ test, status: testStatus(test, figure, attempted[test.id] === true) }));
  const done = rows.filter((r) => r.status === "passed").length;
  const label: Record<TestStatus, string> = {
    passed: t("tests.passed"),
    running: t("tests.running"),
    failed: t("tests.failed"),
    idle: t("tests.notRun"),
  };
  const busy = rows.some((r) => r.status === "running");

  return (
    <div className="space-y-4">
      <h2 className="text-xl">{t("tests.title")}</h2>
      <p className="text-muted">{t("tests.lede")}</p>
      <p className="font-ui text-sm font-bold" aria-live="polite" data-testid="tests-count">
        {t("tests.count", { done, total: rows.length })}
      </p>
      <ol className="space-y-3">
        {rows.map(({ test, status }, i) => (
          <li key={test.id} className="rounded-ink border-2 border-line bg-surface p-3" data-test={test.id} data-status={status}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-ui text-xs font-bold text-muted">{i + 1}.</span>
              <h3 className="text-base">{ct(test.title)}</h3>
              <Chip tone={TONE[status]} className="ms-auto">
                {label[status]}
              </Chip>
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer font-ui text-xs font-bold uppercase tracking-wider">
                {t("tests.procedure")}
              </summary>
              <p className="mt-1.5 text-sm">{t(`tests.kinds.${test.kind}`)}</p>
            </details>
            {status === "passed" ? <p className="mt-2 text-sm text-good">{ct(test.pass)}</p> : null}
            {status === "failed" ? <p className="mt-2 text-sm text-bad">{ct(test.fail)}</p> : null}
            <Button
              className="mt-3"
              variant={status === "passed" ? "secondary" : "primary"}
              disabled={!ready || busy}
              onClick={() => dispatch({ type: "test/run", test: test.id })}
              data-testid={`test-run-${test.id}`}
            >
              {status === "running" ? t("tests.running") : t("tests.run", { title: ct(test.title) })}
            </Button>
          </li>
        ))}
      </ol>
    </div>
  );
}
