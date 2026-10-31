"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Callout, Chip, EmptyState, Meter, TextInput } from "@/components/ui";
import { formatNumber } from "@/components/dronelab/text";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import type { Translate } from "@/i18n/translate";
import type { Op } from "@/project/generated/types";
import type { Resolve } from "@/project/domains/drone-semantic";
import { isOutOfRange, type OutOfRange } from "@/sim/flight/guards";
import type { Build } from "@/sim/flight/build";
import {
  optimiseIter,
  type Candidate,
  type Constraints,
  type Fail,
  type Library,
  type OptimiseResult,
  type PriceTable,
} from "@/sim/flight/optimise";
import { SafetyNotice, type DroneT } from "./SafetyNotice";

export type DroneOptT = Translate<Messages["droneopt"]>;

interface Props {
  build: Build;
  lib: Library;
  resolve: Resolve;
  prices: PriceTable;
  currency: string;
  /** The project's component instances, to find the ones a swap replaces. */
  components: ReadonlyArray<{ id: string; definition: { ref: string; version: string } }>;
  lang: Locale;
  onApply(ops: Op[], label: string): void;
  t: DroneOptT;
  droneT: DroneT;
}

type Run = { state: "idle" } | { state: "running"; done: number; total: number } | { state: "done"; result: OptimiseResult | OutOfRange };

const SLICE_MS = 8;
const DEFAULT_MIN_TW = "2";
const DEFAULT_MIN_FLIGHT = "3";
const PRUNED_SHOWN = 10;

function parse(text: string): number | null {
  const value = Number(text.trim().replace(",", "."));
  return text.trim() !== "" && Number.isFinite(value) && value >= 0 ? value : null;
}

const refOf = (key: string): string => key.split("@")[0] ?? key;

export function OptimiserPanel({ build, lib, resolve, prices, currency, components, lang, onApply, t, droneT }: Props) {
  const [budget, setBudget] = useState("");
  const [minTW, setMinTW] = useState(DEFAULT_MIN_TW);
  const [minFlight, setMinFlight] = useState(DEFAULT_MIN_FLIGHT);
  const [run, setRun] = useState<Run>({ state: "idle" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => clearTimeout(timer.current ?? undefined), []);

  const n = (value: number, digits: number) => formatNumber(lang, value, digits);
  const money = (amount: number) => t("opt.money", { amount: n(amount, 2), currency });

  const twValue = parse(minTW);
  const flightValue = parse(minFlight);
  const budgetValue = budget.trim() === "" ? null : parse(budget);
  const budgetBad = budget.trim() !== "" && budgetValue === null;
  const ready = twValue !== null && flightValue !== null && !budgetBad && run.state !== "running";

  const asOf = useMemo(() => [...prices.values()].map((p) => p.asOf).sort()[0], [prices]);

  function find() {
    if (twValue === null || flightValue === null || budgetBad) return;
    const constraints: Constraints = { minTW: twValue, minFlightMin: flightValue, budget: budgetValue };
    const search = optimiseIter(build, lib, resolve, prices, constraints);
    setRun({ state: "running", done: 0, total: 0 });
    const slice = () => {
      const until = performance.now() + SLICE_MS;
      let step = search.next();
      while (!step.done && performance.now() < until) step = search.next();
      if (step.done) {
        setRun({ state: "done", result: step.value });
        return;
      }
      setRun({ state: "running", ...step.value });
      timer.current = setTimeout(slice, 0);
    };
    timer.current = setTimeout(slice, 0);
  }

  function cancel() {
    clearTimeout(timer.current ?? undefined);
    setRun({ state: "idle" });
  }

  function apply(result: OptimiseResult) {
    const ops: Op[] = [];
    for (const swap of result.swaps) {
      const to = result.best?.[swap.slot];
      if (!to) continue;
      const [ref = "", version = ""] = to.split("@");
      for (const c of components) {
        if (`${c.definition.ref}@${c.definition.version}` === swap.from || c.definition.ref === swap.from) {
          ops.push({ k: "component.swap", id: c.id, definition: { ref, version }, pinMap: {} });
        }
      }
    }
    onApply(ops, t("opt.applyLabel"));
  }

  return (
    <section aria-labelledby="optimiser-title" className="flex flex-col gap-4">
      <h2 id="optimiser-title" className="text-lg font-semibold text-balance">
        {t("opt.title")}
      </h2>
      <p className="text-sm text-muted text-pretty">{t("opt.intro")}</p>

      <form
        className="grid gap-3 sm:grid-cols-3"
        onSubmit={(ev) => {
          ev.preventDefault();
          find();
        }}
      >
        <TextInput
          label={t("opt.budget", { currency })}
          inputMode="decimal"
          value={budget}
          onChange={(ev) => setBudget(ev.target.value)}
          hint={t("opt.budgetHint")}
          error={budgetBad ? t("opt.invalid") : undefined}
          className="tabular-nums"
        />
        <TextInput
          label={t("opt.minTW")}
          inputMode="decimal"
          value={minTW}
          onChange={(ev) => setMinTW(ev.target.value)}
          error={twValue === null ? t("opt.invalid") : undefined}
          className="tabular-nums"
        />
        <TextInput
          label={t("opt.minFlight")}
          inputMode="decimal"
          value={minFlight}
          onChange={(ev) => setMinFlight(ev.target.value)}
          error={flightValue === null ? t("opt.invalid") : undefined}
          className="tabular-nums"
        />
        <div className="flex gap-2 sm:col-span-3">
          <Button type="submit" disabled={!ready}>
            {t("opt.find")}
          </Button>
          {run.state === "running" ? (
            <Button type="button" variant="secondary" onClick={cancel}>
              {t("opt.cancel")}
            </Button>
          ) : null}
        </div>
      </form>

      {run.state === "running" ? (
        <div aria-live="polite">
          {run.total > 0 ? (
            <Meter
              label={t("opt.progress")}
              value={run.done}
              max={run.total}
              valueText={t("opt.considered", { done: n(run.done, 0), total: n(run.total, 0) })}
            />
          ) : (
            <p className="text-sm text-muted">{t("opt.starting")}</p>
          )}
        </div>
      ) : null}

      {run.state === "idle" ? (
        <EmptyState bordered title={t("opt.empty.title")}>
          {t("opt.empty.body")}
        </EmptyState>
      ) : null}

      {run.state === "done" ? (
        isOutOfRange(run.result) ? (
          <Callout tone="warn" title={t("opt.refused.title")}>
            <p className="text-pretty">{t("opt.refused.body", { count: n(run.result.value, 0), max: n(run.result.max, 0) })}</p>
          </Callout>
        ) : (
          <Result result={run.result} asOf={asOf} n={n} money={money} t={t} onApply={() => apply(run.result as OptimiseResult)} />
        )
      ) : null}

      <SafetyNotice id="SN-8" t={droneT} />
    </section>
  );
}

function unmet(fails: readonly Fail[], t: DroneOptT): string {
  return fails.map((f) => t(`opt.fail.${f}`)).join(", ");
}

function Result({
  result,
  asOf,
  n,
  money,
  t,
  onApply,
}: {
  result: OptimiseResult;
  asOf: string | undefined;
  n: (value: number, digits: number) => string;
  money: (amount: number) => string;
  t: DroneOptT;
  onApply(): void;
}) {
  const shown: Candidate | null = result.best ?? result.cheapest;
  const unpriced = [...new Set([...result.current.unpriced, ...(shown?.unpriced ?? [])])];

  return (
    <div className="flex flex-col gap-4">
      {result.best ? (
        <Callout tone="success" title={t("opt.met.title")}>
          <p className="text-pretty">{t("opt.met.body")}</p>
        </Callout>
      ) : (
        <Callout tone="warn" title={t("opt.unmet.title")}>
          <p className="text-pretty">{t(`opt.reason.${result.reason ?? "constraints"}`)}</p>
          {shown ? <p className="mt-2 text-pretty">{t("opt.unmet.cheapest", { fails: unmet(shown.fails, t) })}</p> : null}
        </Callout>
      )}

      {shown ? (
        <table className="w-full text-sm">
          <caption className="sr-only">{t("opt.table.caption")}</caption>
          <thead>
            <tr className="text-start text-muted">
              <th scope="col" className="py-1 text-start font-medium" />
              <th scope="col" className="py-1 text-end font-medium">
                {t("opt.table.current")}
              </th>
              <th scope="col" className="py-1 text-end font-medium">
                {result.best ? t("opt.table.best") : t("opt.table.cheapest")}
              </th>
              <th scope="col" className="py-1 text-end font-medium">
                {t("opt.table.change")}
              </th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            <Row label={t("opt.row.cost")} a={result.current.cost} b={shown.cost} fmt={money} signed={n} t={t} />
            <Row label={t("opt.row.tw")} a={result.current.tw} b={shown.tw} fmt={(v) => n(v, 2)} signed={n} t={t} digits={2} />
            <Row
              label={t("opt.row.flightLow")}
              a={result.current.flightMin.low}
              b={shown.flightMin.low}
              fmt={(v) => t("opt.minutes", { value: n(v, 1) })}
              signed={n}
              t={t}
              digits={1}
            />
            <Row
              label={t("opt.row.flightTyp")}
              a={result.current.flightMin.typ}
              b={shown.flightMin.typ}
              fmt={(v) => t("opt.minutes", { value: n(v, 1) })}
              signed={n}
              t={t}
              digits={1}
            />
          </tbody>
        </table>
      ) : null}

      {result.swaps.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-base font-semibold">{t("opt.swaps")}</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {result.swaps.map((s) => (
              <li key={s.slot} className="flex flex-wrap items-center gap-2">
                <Chip>{t(`opt.slot.${s.slot}`)}</Chip>
                <span className="text-muted">{refOf(s.from)}</span>
                <span aria-hidden="true">{"→"}</span>
                <span className="sr-only">{t("opt.to")}</span>
                <span className="font-medium">{refOf(s.to)}</span>
              </li>
            ))}
          </ul>
          <div>
            <Button onClick={onApply}>{t("opt.apply")}</Button>
          </div>
        </div>
      ) : result.best ? (
        <p className="text-sm text-muted">{t("opt.noSwaps")}</p>
      ) : null}

      {unpriced.length > 0 ? (
        <div className="text-sm">
          <p className="font-medium">{t("opt.unpriced")}</p>
          <p className="text-muted">{unpriced.map(refOf).join(", ")}</p>
        </div>
      ) : null}

      <p className="text-sm text-muted text-pretty">{asOf ? t("opt.priceNote", { date: asOf }) : t("opt.priceNoDate")}</p>

      {result.pruned > 0 ? (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted">{t("opt.pruned", { count: n(result.pruned, 0), total: n(result.considered, 0) })}</summary>
          <ul className="mt-2 flex flex-col gap-1 text-muted">
            {result.prunedWhy.slice(0, PRUNED_SHOWN).map((w) => (
              <li key={`${w.part}|${w.path}`}>{t("opt.prunedWhy", { part: w.part, path: w.path })}</li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function Row({
  label,
  a,
  b,
  fmt,
  signed,
  t,
  digits = 2,
}: {
  label: string;
  a: number | null;
  b: number | null;
  fmt(value: number): string;
  signed(value: number, digits: number): string;
  t: DroneOptT;
  digits?: number;
}) {
  const diff = a === null || b === null ? null : b - a;
  return (
    <tr className="border-t border-rule">
      <th scope="row" className="py-1 text-start font-sans font-normal">
        {label}
      </th>
      <td className="py-1 text-end">{a === null ? t("opt.unpricedValue") : fmt(a)}</td>
      <td className="py-1 text-end">{b === null ? t("opt.unpricedValue") : fmt(b)}</td>
      <td className="py-1 text-end">{diff === null ? t("opt.unpricedValue") : `${diff > 0 ? "+" : ""}${signed(diff, digits)}`}</td>
    </tr>
  );
}
