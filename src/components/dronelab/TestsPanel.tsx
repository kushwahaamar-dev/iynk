"use client";

import type { DroneContent, FigureState } from "@/content/schema";
import { Button } from "@/components/ui/Button";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/icons";
import { InlineStatus } from "@/components/ui/InlineStatus";
import { testStatus, type TestStatus } from "@/lib/dronelab/bench";
import { readBench } from "@/lib/dronelab/figure";
import type { DroneLabAction } from "@/lib/dronelab/store";
import type { ContentT, DroneLabT } from "./text";

const TONE: Record<TestStatus, ChipTone> = { passed: "good", running: "warn", failed: "bad", idle: "neutral" };

type Props = {
  content: DroneContent;
  figure: FigureState;
  attempted: Record<string, true>;
  ready: boolean;
  t: DroneLabT;
  ct: ContentT;
  /** Runs a test (the workspace watches for the figure refusing it). */
  onRun(test: string): void;
  /** The last test the figure refused, with the reason it gave. */
  refusal: { test: string; text: string } | null;
  dispatch(action: DroneLabAction): void;
};

export function TestsPanel({ content, figure, attempted, ready, t, ct, onRun, refusal, dispatch }: Props) {
  const rows = content.tests.map((test) => ({ test, status: testStatus(test, figure, attempted[test.id] === true) }));
  const done = rows.filter((r) => r.status === "passed").length;
  const label: Record<TestStatus, string> = {
    passed: t("tests.passed"),
    running: t("tests.running"),
    failed: t("tests.failed"),
    idle: t("tests.notRun"),
  };
  const busy = rows.some((r) => r.status === "running");
  // one primary: the first test still to pass
  const nextUp = rows.find((r) => r.status !== "passed")?.test.id;
  // the one refusal the host can put right itself: props on for a test that spins the motors
  const props = content.parts.find((p) => /^props?$/i.test(p.id));
  const propsOn = props !== undefined && readBench(figure).placed[props.id] !== undefined;

  return (
    <div className="space-y-4">
      <h2 className="sr-only">{t("tests.title")}</h2>
      <p className="text-muted">{t("tests.lede")}</p>
      <p className="text-sm font-semibold tabular-nums" aria-live="polite" data-testid="tests-count">
        {t("tests.count", { done, total: rows.length })}
      </p>
      <ol className="divide-y divide-rule">
        {rows.map(({ test, status }, i) => {
          const refused = refusal?.test === test.id && status === "idle" ? refusal.text : null;
          return (
            <li key={test.id} className="py-4 first:pt-0" data-test={test.id} data-status={status}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-ui tabular text-xs font-semibold text-muted">{i + 1}.</span>
                <h3 className="font-body text-base font-semibold">{ct(test.title)}</h3>
                <Chip tone={TONE[status]} className="ms-auto">
                  {label[status]}
                </Chip>
              </div>
              <details className="mt-2">
                <summary className="inline-flex min-h-9 cursor-pointer items-center text-sm font-semibold text-muted hover:text-ink">
                  {t("tests.procedure")}
                </summary>
                <p className="mt-1 text-sm">{t(`tests.kinds.${test.kind}`)}</p>
              </details>
              {status === "passed" ? (
                <InlineStatus tone="good" className="mt-2 rounded-lg bg-good-bg px-3 py-2">
                  {ct(test.pass)}
                </InlineStatus>
              ) : null}
              {status === "failed" ? (
                <InlineStatus tone="bad" className="mt-2 rounded-lg bg-bad-bg px-3 py-2">
                  {ct(test.fail)}
                </InlineStatus>
              ) : null}
              {refused ? (
                <div role="alert" className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-bad-bg px-3 py-2 text-sm" data-testid={`test-refused-${test.id}`}>
                  <Icon name="warn-circle" size={16} className="shrink-0 text-bad" />
                  <p className="min-w-0 flex-1 basis-48">{refused}</p>
                  {propsOn && props && /prop/i.test(refused) ? (
                    <Button size="sm" onClick={() => dispatch({ type: "bench/remove", id: props.id })}>
                      {t("build.remove", { short: props.short })}
                    </Button>
                  ) : null}
                </div>
              ) : null}
              <Button
                className="mt-3"
                size="sm"
                variant={test.id === nextUp ? "primary" : "secondary"}
                disabled={!ready || busy}
                onClick={() => onRun(test.id)}
                data-testid={`test-run-${test.id}`}
              >
                {status === "running" ? t("tests.running") : t("tests.run", { title: ct(test.title) })}
              </Button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
