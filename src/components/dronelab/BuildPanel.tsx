"use client";

import { useId } from "react";
import type { DroneContent, FigureState } from "@/content/schema";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Callout } from "@/components/ui/Callout";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import { stepStatus, type StepStatus } from "@/lib/dronelab/bench";
import { readBench } from "@/lib/dronelab/figure";
import type { DroneLabAction } from "@/lib/dronelab/store";
import type { ContentT, DroneLabT } from "./text";

const STATUS_TONE: Record<StepStatus, ChipTone> = { done: "good", flipped: "bad", next: "info", todo: "neutral" };

/** The three mistakes the drone engine knows on every craft that has these parts (docs/FIGURES-DRONE.md §6). */
const MISTAKE_PARTS = ["XT60", "FC", "PROPS"] as const;

type Props = {
  content: DroneContent;
  figure: FigureState;
  ready: boolean;
  sel: string | null;
  t: DroneLabT;
  ct: ContentT;
  dispatch(action: DroneLabAction): void;
};

export function BuildPanel({ content, figure, ready, sel, t, ct, dispatch }: Props) {
  const base = useId();
  const bench = readBench(figure);
  const partOf = (id: string) => content.parts.find((p) => p.id === id);
  const short = (id: string) => partOf(id)?.short ?? id;
  const nextPart = bench.next ? partOf(bench.next) : undefined;
  const statusText: Record<StepStatus, string> = {
    done: t("build.stepDone"),
    flipped: t("build.stepFlipped"),
    next: t("build.stepNext"),
    todo: t("build.stepTodo"),
  };
  const selected = sel ? partOf(sel) : undefined;
  const mistakes = MISTAKE_PARTS.filter((id) => partOf(id));

  return (
    <div className="space-y-6">
      <h2 className="sr-only">{t("build.title")}</h2>
      <p className="text-muted">{t("build.lede")}</p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="tabular text-sm font-bold" aria-live="polite" data-testid="build-count">
          {t("build.count", { fitted: bench.fitted, total: bench.total || content.build.length })}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="primary"
          disabled={!ready || !bench.next}
          onClick={() => bench.next && dispatch({ type: "bench/add", id: bench.next, orient: 0 })}
          data-testid="build-next"
        >
          {bench.next && nextPart ? t("build.next", { name: nextPart.short }) : t("build.nextNone")}
        </Button>
        <Button disabled={!ready} onClick={() => dispatch({ type: "bench/run", run: "build" })}>
          {t("build.buildForMe")}
        </Button>
        <Button disabled={!ready} onClick={() => dispatch({ type: "bench/run", run: "strip" })}>
          {t("build.takeApart")}
        </Button>
        <Button
          disabled={!ready}
          aria-pressed={bench.plugged}
          onClick={() => dispatch({ type: "bench/run", run: bench.plugged ? "unplug" : "plug" })}
        >
          {bench.plugged ? t("build.unplug") : t("build.plug")}
        </Button>
      </div>

      <ol className="divide-y divide-rule" aria-label={t("build.title")}>
        {content.build.map((step, i) => {
          const status = stepStatus(step, figure);
          const part = partOf(step.part);
          const fitted = bench.placed[step.part] !== undefined;
          return (
            <li
              key={step.id}
              className={status === "next" || status === "flipped" ? "-mx-3 rounded-lg bg-hover px-3 py-2" : "py-2"}
              data-step={step.id}
              data-status={status}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="tabular text-xs font-semibold text-muted">{i + 1}.</span>
                <span className="font-semibold">{ct(step.title)}</span>
                <Chip tone={STATUS_TONE[status]}>{statusText[status]}</Chip>
                <span className="ms-auto flex gap-2">
                  {fitted ? (
                    <IconButton
                      icon="close"
                      size="sm"
                      label={t("build.remove", { short: part?.short ?? step.part })}
                      tooltipSide="top"
                      disabled={!ready}
                      onClick={() => dispatch({ type: "bench/remove", id: step.part })}
                    />
                  ) : (
                    <Button size="sm" disabled={!ready} onClick={() => dispatch({ type: "bench/add", id: step.part, orient: 0 })}>
                      {t("build.fit", { short: part?.short ?? step.part })}
                    </Button>
                  )}
                </span>
              </div>
              {status === "next" || status === "flipped" ? <p className="mt-2 text-sm">{ct(step.body)}</p> : null}
            </li>
          );
        })}
      </ol>
      {bench.built && content.build.every((s) => stepStatus(s, figure) === "done") ? (
        <Callout tone="success" live>
          {t("build.complete")}
        </Callout>
      ) : null}

      {mistakes.length > 0 ? (
        <section aria-labelledby={`${base}-mistakes`} className="space-y-2">
          <h3 id={`${base}-mistakes`} className="kicker">
            {t("build.mistakesTitle")}
          </h3>
          <p className="text-sm text-muted">{t("build.mistakesLede")}</p>
          <div className="flex flex-wrap gap-2">
            {mistakes.map((id) => (
              <Button
                key={id}
                size="sm"
                variant="secondary"
                disabled={!ready}
                onClick={() => dispatch({ type: "bench/add", id, orient: 1 })}
              >
                {t("build.fitWrong", { short: short(id) })}
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby={`${base}-selected`} className="rounded-xl bg-sunken p-3">
        <h3 id={`${base}-selected`} className="kicker">
          {t("build.selected")}
        </h3>
        <div aria-live="polite" data-testid="selected-part">
          {selected ? (
            <>
              <p className="mt-1 text-xs font-semibold text-muted">
                {bench.placed[selected.id] !== undefined
                  ? t("build.fitted", { short: selected.short })
                  : t("build.inBox", { short: selected.short })}
              </p>
              <p className="mt-1 font-bold">{ct(selected.name)}</p>
              <p className="mt-1 text-sm">{ct(selected.what)}</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted">{t("build.nothingSelected")}</p>
          )}
        </div>
      </section>

      <section aria-labelledby={`${base}-parts`}>
        <h3 id={`${base}-parts`} className="kicker">
          {t("build.partsList")}
        </h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {content.parts.map((part) => {
            const on = bench.placed[part.id] !== undefined;
            return (
              <Button
                key={part.id}
                size="sm"
                variant="secondary"
                aria-pressed={sel === part.id}
                aria-label={t("build.select", { short: part.short })}
                className={on ? undefined : "opacity-60"}
                onClick={() => dispatch({ type: "select", id: part.id })}
              >
                {part.short}
              </Button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
