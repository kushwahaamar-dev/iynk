"use client";

import { useId } from "react";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/icons";
import type { PracticeTask, RoboticsContent } from "@/content/schema";
import { allPass } from "@/lib/robotics/runner";
import type { BenchAction, TaskSession } from "@/lib/robotics/store";
import type { BenchT, TextOf } from "./messages";

type Props = {
  bench: RoboticsContent;
  tasks: Record<string, TaskSession>;
  savedDone: (taskId: string) => boolean;
  t: BenchT;
  tx: TextOf;
  dispatch: (action: BenchAction) => void;
  headingId: string;
};

export function TasksPanel({ bench, tasks, savedDone, t, tx, dispatch, headingId }: Props) {
  if (bench.tasks.length === 0) return null;
  const done = bench.tasks.filter((task) => savedDone(task.id)).length;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={headingId} tabIndex={-1} className="text-2xl outline-none">
          {t("tasks.heading")}
        </h2>
        <span className="tabular font-ui text-sm font-bold">{t("tasks.count", { done, total: bench.tasks.length })}</span>
      </div>
      <p className="max-w-3xl text-sm">{t("tasks.intro")}</p>
      {bench.tasks.map((task) => (
        <TaskCard key={task.id} task={task} session={tasks[task.id]} done={savedDone(task.id)} t={t} tx={tx} dispatch={dispatch} />
      ))}
    </section>
  );
}

type CardProps = {
  task: PracticeTask;
  session: TaskSession | undefined;
  done: boolean;
  t: BenchT;
  tx: TextOf;
  dispatch: (action: BenchAction) => void;
};

function TaskCard({ task, session, done, t, tx, dispatch }: CardProps) {
  const id = useId();
  const title = tx(task.title);
  const result = session?.result ?? null;
  const running = session?.running ?? false;
  const passed = result?.status === "ok" ? result.checks.filter((check) => check.pass).length : 0;

  return (
    <article aria-labelledby={`${id}-title`} data-task={task.id} className="ink-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id={`${id}-title`} className="min-w-0 flex-1 text-lg">
          {title}
        </h3>
        <Chip tone="cobalt">{t(`tasks.language.${task.language}`)}</Chip>
        {done ? (
          <Chip tone="mint">
            <Icon name="check" size={14} aria-hidden="true" />
            {t("tasks.done")}
          </Chip>
        ) : null}
      </div>
      <p className="mt-2 text-sm leading-relaxed">{tx(task.brief)}</p>

      <label htmlFor={`${id}-code`} className="ink-kicker mt-4 block">
        {t("tasks.editor", { title })}
      </label>
      <textarea
        id={`${id}-code`}
        value={session?.code ?? ""}
        onChange={(event) => dispatch({ type: "task/edit", task: task.id, code: event.target.value })}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            dispatch({ type: "task/run", task: task.id });
          }
        }}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        rows={Math.min(24, Math.max(8, (session?.code ?? "").split("\n").length + 1))}
        className="mt-1 w-full resize-y rounded-ink-sm border-2 border-line bg-surface p-3 font-ui text-[0.82rem] leading-relaxed text-ink"
        data-task-editor
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => dispatch({ type: "task/run", task: task.id })} disabled={running} aria-describedby={`${id}-result`}>
          <Icon name="play" size={16} aria-hidden="true" />
          {running ? t("tasks.runningNow") : t("tasks.run")}
        </Button>
        <Button variant="secondary" onClick={() => dispatch({ type: "task/reset", task: task.id })}>
          {t("tasks.resetCode")}
        </Button>
        <Button variant="ghost" onClick={() => dispatch({ type: "task/solution", task: task.id })}>
          {t("tasks.solution")}
        </Button>
      </div>

      <div id={`${id}-result`} aria-live="polite" className="mt-3">
        {result?.status === "error" ? (
          <Callout tone="danger">{result.line > 0 ? t("tasks.error", { line: result.line, message: result.message }) : t("tasks.runtime", { message: result.message })}</Callout>
        ) : null}
        {result?.status === "ok" ? (
          allPass(result) ? (
            <Callout tone="success">{t("tasks.passed", { total: result.checks.length })}</Callout>
          ) : (
            <Callout tone="warn">{t("tasks.partial", { passed, total: result.checks.length })}</Callout>
          )
        ) : null}
      </div>

      <h4 className="ink-kicker mt-4">{t("tasks.checks")}</h4>
      <ul className="mt-2 flex flex-col gap-1.5">
        {task.checks.map((check, index) => {
          const outcome = result?.status === "ok" ? result.checks[index] : undefined;
          return (
            <li key={index} className="flex items-start gap-2 text-sm">
              <span
                className={
                  outcome === undefined
                    ? "font-ui text-xs font-bold text-muted"
                    : outcome.pass
                      ? "font-ui text-xs font-bold text-good"
                      : "font-ui text-xs font-bold text-bad"
                }
              >
                {outcome === undefined ? t("tasks.notRun") : outcome.pass ? t("tasks.pass") : t("tasks.fail")}
              </span>
              <span className="min-w-0 flex-1">
                {tx(check.label)}
                {outcome && !outcome.pass && outcome.detail ? <span className="block text-muted">{outcome.detail}</span> : null}
              </span>
            </li>
          );
        })}
      </ul>

      {result?.status === "ok" || result?.status === "error" ? (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-ui text-xs font-bold">{t("tasks.serialOut")}</summary>
          {result.serial.length > 0 ? (
            <pre className="mt-2 max-h-48 overflow-auto rounded-ink-sm border-2 border-line bg-[#1d2a26] p-3 font-ui text-[0.78rem] text-[#8af0ae]">
              {result.serial.join("\n")}
            </pre>
          ) : (
            <p className="mt-2 text-muted">{t("tasks.noSerial")}</p>
          )}
        </details>
      ) : null}

      {task.hints.length > 0 ? (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer font-ui text-xs font-bold">{t("tasks.hints")}</summary>
          <ol className="mt-2 flex list-decimal flex-col gap-1 ps-5">
            {task.hints.map((hint) => (
              <li key={hint}>{tx(hint)}</li>
            ))}
          </ol>
        </details>
      ) : null}
    </article>
  );
}
