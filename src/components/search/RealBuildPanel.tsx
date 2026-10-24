"use client";

import { useEffect, useId, useMemo, useState, useSyncExternalStore } from "react";
import type { LabDockProps, LabStore } from "@/components/dock/types";
import { Button, Callout, Chip, Icon, Stat, cx } from "@/components/ui";
import { isBoardId, isDroneId, isRoboticsId } from "@/content/ids";
import { loadDrone } from "@/content/index.generated";
import type { DesignPick, DroneDesign } from "@/content/schema";
import { useLocale } from "@/i18n/client";
import { SHORT_FLIGHT_MIN } from "@/lib/drone/calc";
import { isDesignPick } from "@/lib/drone/design";
import type { DroneLabAction } from "@/lib/dronelab/store";
import { boardBom, droneBom, offerParts, roboticsBom, type BomLine, type Slot } from "@/lib/search/bom";
import { fetchOffers, type FailCode } from "@/lib/search/client";
import { lineCost, listingsNeeded, sumMoney } from "@/lib/search/cost";
import { useSearchT, type SearchT } from "@/lib/search/messages";
import { costRange, optimize, priceLines, type Candidate, type OptimizeResult } from "@/lib/search/optimize";
import type { Offer, OffersGap, PartOffers } from "@/lib/search/types";
import { SourcesList } from "./SourcesList";
import { PanelHead, PanelSkeleton, StatusError, external, useFormat, useSearchAvailability, type Format } from "./shared";

/* ---------- the parts list ---------- */

type Bom =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "ready"; lines: BomLine[]; drone: { design: DroneDesign; pick: DesignPick } | null };

/** The pick in a Drone Lab store (src/lib/dronelab/store.ts keeps it as state.pick). */
function storePick(store: LabStore, design: DroneDesign | null): DesignPick | null {
  const pick = (store.getState() as { pick?: Partial<DesignPick> } | null)?.pick;
  return design && pick && isDesignPick(design, pick) ? pick : null;
}

/**
 * The item's parts list as picked now (`bom`), and the lines to price
 * (`request`): those stay the same while the pick changes, since every
 * option is priced up front.
 */
function useBom({ lab, itemId, store }: Pick<LabDockProps, "lab" | "itemId" | "store">): { bom: Bom & { live: boolean }; request: BomLine[] | null } {
  const [design, setDesign] = useState<{ id: string; design: DroneDesign | null } | null>(null);

  useEffect(() => {
    if (lab !== "drone" || !isDroneId(itemId)) return;
    let alive = true;
    loadDrone(itemId)
      .then((content) => alive && setDesign({ id: itemId, design: content?.design ?? null }))
      .catch(() => alive && setDesign({ id: itemId, design: null }));
    return () => {
      alive = false;
    };
  }, [lab, itemId]);

  const loaded = design?.id === itemId ? design.design : null;
  const pickInStore = useSyncExternalStore(
    store.subscribe,
    () => storePick(store, loaded),
    () => null,
  );

  const bom = useMemo((): Bom & { live: boolean } => {
    if (lab === "board") return isBoardId(itemId) ? { status: "ready", lines: boardBom(itemId), drone: null, live: false } : { status: "missing", live: false };
    if (lab === "robotics") return isRoboticsId(itemId) ? { status: "ready", lines: roboticsBom(itemId), drone: null, live: false } : { status: "missing", live: false };
    if (!isDroneId(itemId)) return { status: "missing", live: false };
    if (design?.id !== itemId) return { status: "loading", live: false };
    if (!loaded) return { status: "missing", live: false };
    const pick = pickInStore ?? loaded.default;
    return { status: "ready", lines: droneBom(itemId, loaded, pick), drone: { design: loaded, pick }, live: pickInStore !== null };
  }, [lab, itemId, design, loaded, pickInStore]);

  const request = useMemo(() => {
    if (lab === "drone") return isDroneId(itemId) && loaded ? droneBom(itemId, loaded, loaded.default) : null;
    return bom.status === "ready" ? bom.lines : null;
  }, [lab, itemId, loaded, bom]);

  return { bom, request };
}

/* ---------- live offers ---------- */

type Prices = {
  key: string;
  offers: Map<string, PartOffers>;
  done: number;
  total: number;
  partial?: OffersGap;
  failure?: FailCode;
  fetchedAt?: string;
};

const BATCH = 5;
const PARALLEL = 2;

/** Prices the lines in small batches, so the list fills in as stores answer; again on "check again". */
function useOffers(lines: BomLine[] | null, enabled: boolean, itemKey: string) {
  const [round, setRound] = useState(0);
  const [prices, setPrices] = useState<Prices | null>(null);
  const key = `${itemKey}#${round}`;

  useEffect(() => {
    if (!enabled || !lines) return;
    const parts = offerParts(lines);
    const batches: (typeof parts)[] = [];
    for (let i = 0; i < parts.length; i += BATCH) batches.push(parts.slice(i, i + BATCH));
    const controller = new AbortController();
    const merge = (patch: (p: Prices) => Prices) =>
      setPrices((prev) => patch(prev?.key === key ? prev : { key, offers: new Map(), done: 0, total: batches.length }));

    let next = 0;
    const worker = async () => {
      while (next < batches.length && !controller.signal.aborted) {
        const batch = batches[next++];
        const result = await fetchOffers({ parts: batch }, controller.signal).catch(() => null);
        if (!result || controller.signal.aborted) return;
        merge((p) => {
          if (!result.ok) return { ...p, done: p.done + 1, failure: p.failure ?? result.code };
          const offers = new Map(p.offers);
          for (const part of result.data.parts) offers.set(part.key, part);
          return { ...p, offers, done: p.done + 1, partial: result.data.partial ?? p.partial, fetchedAt: result.data.fetchedAt };
        });
      }
    };
    void Promise.all(Array.from({ length: Math.min(PARALLEL, batches.length) }, worker));
    return () => controller.abort();
  }, [enabled, lines, key]);

  const current = prices?.key === key ? prices : null;
  return {
    prices: current,
    loading: enabled && Boolean(lines) && (!current || current.done < current.total),
    refresh: () => setRound((r) => r + 1),
  };
}

/* ---------- pieces ---------- */

const bestOf = (found: PartOffers | undefined): Offer | undefined => (found?.best !== undefined ? found.offers[found.best] : undefined);

function lineName(line: BomLine, t: SearchT): string {
  return "part" in line.label ? t(`part.${line.label.part}`) : line.label.literal;
}

function OfferRow({ offer, line, t, f }: { offer: Offer; line: BomLine; t: SearchT; f: Format }) {
  const store = t(`store.${offer.source}`);
  return (
    <li className="flex items-start justify-between gap-2 border-t border-rule py-1.5 first:border-t-0">
      <div className="min-w-0">
        <a href={offer.url} {...external} className="line-clamp-2 text-sm underline underline-offset-2">
          {offer.title}
        </a>
        <div className="font-ui text-xs text-muted">
          {offer.seller && offer.seller !== store ? `${store} · ${offer.seller}` : store}
          {offer.pack ? ` · ${t("real.pack", { count: offer.pack })}` : null}
          {offer.inStock === false ? ` · ${t("real.outOfStock")}` : null}
        </div>
      </div>
      <span className="tabular shrink-0 font-ui text-sm font-bold">{f.money(lineCost(offer, line.qty, line.pack), offer.currency)}</span>
    </li>
  );
}

function LineItem({ line, found, t, f }: { line: BomLine; found: PartOffers | undefined; t: SearchT; f: Format }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const best = bestOf(found);
  const name = lineName(line, t);
  const others = found?.offers ?? [];
  const needed = best ? listingsNeeded(best, line.qty, line.pack) : 0;
  return (
    <li className="py-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold">
            {name}
            {line.qty > 1 ? <span className="tabular ms-1 font-ui text-sm text-muted">{t("real.qty", { count: line.qty })}</span> : null}
          </div>
          {best ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <a href={best.url} {...external} className="inline-flex items-center gap-1 underline underline-offset-2">
                {t("real.view", { store: best.seller ?? t(`store.${best.source}`) })}
                <Icon name="external" size={14} aria-hidden="true" />
              </a>
              {best.inStock === true ? (
                <Chip tone="mint" className="text-xs">
                  <Icon name="check" size={12} aria-hidden="true" />
                  {t("real.inStock")}
                </Chip>
              ) : null}
              {needed > 1 ? <span className="font-ui text-xs text-muted">{t("real.listings", { count: needed })}</span> : null}
            </div>
          ) : (
            <div className="font-ui text-xs text-muted">{line.estimate !== undefined ? t("real.estimate") : t("real.noOffer")}</div>
          )}
        </div>
        <span className={cx("tabular shrink-0 font-ui font-bold", !best && "text-muted")}>
          {best ? f.money(lineCost(best, line.qty, line.pack), best.currency) : line.estimate !== undefined ? f.money(line.estimate) : "—"}
        </span>
      </div>
      {others.length > 0 ? (
        <div className="mt-1">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setOpen((o) => !o)}
            className="inline-flex min-h-8 items-center gap-1 font-ui text-xs font-bold uppercase tracking-wide text-muted hover:text-ink"
          >
            <Icon name="chevron-down" size={14} aria-hidden="true" className={cx("transition-transform motion-reduce:transition-none", open && "rotate-180")} />
            {open ? t("real.offersHide") : t("real.offersShow", { count: others.length })}
          </button>
          <ul id={id} hidden={!open} aria-label={t("real.offersLabel", { part: name })} className="mt-1 rounded-ink border-2 border-line bg-sunken px-2">
            {others.map((offer) => (
              <OfferRow key={offer.url} offer={offer} line={line} t={t} f={f} />
            ))}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

/* ---------- optimiser ---------- */

function slotLabel(design: DroneDesign, slot: Slot, option: string): string {
  const table = slot === "batt" ? design.batts : slot === "motor" ? design.motors : design.props;
  return table[option]?.label ?? option;
}

function NumberField({ id, label, value, onChange, step, max }: { id: string; label: string; value: number; onChange: (v: number) => void; step: number; max: number }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="ink-kicker block">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={0}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v) && v >= 0 && v <= max) onChange(v);
        }}
        className="ink-field tabular mt-1 w-full pe-3"
      />
    </div>
  );
}

function Optimiser({
  design,
  pick,
  lines,
  offers,
  canApply,
  store,
  t,
  f,
}: {
  design: DroneDesign;
  pick: DesignPick;
  lines: BomLine[];
  offers: Map<string, PartOffers>;
  canApply: boolean;
  store: LabStore;
  t: SearchT;
  f: Format;
}) {
  const id = useId();
  const priced = useMemo(() => priceLines(lines, offers), [lines, offers]);
  const range = useMemo(() => costRange(priced), [priced]);
  const [chosenBudget, setBudget] = useState<number | null>(null);
  const [minTW, setMinTW] = useState(design.model.minTW);
  const [minFlightMin, setMinFlight] = useState(SHORT_FLIGHT_MIN);
  const [applied, setApplied] = useState<string | null>(null);

  const step = range.max - range.min > 200 ? 10 : 5;
  const low = Math.floor(range.min / step) * step;
  const high = Math.max(low + step, Math.ceil(range.max / step) * step);
  const currentCost = useMemo(() => optimize({ design, ...priced, budget: Infinity, constraints: { minTW: 0, minFlightMin: 0 }, current: pick }).current.cost, [design, priced, pick]);
  const budget = Math.min(high, Math.max(low, chosenBudget ?? Math.ceil(currentCost / step) * step));

  const result: OptimizeResult = useMemo(
    () => optimize({ design, ...priced, budget, constraints: { minTW, minFlightMin }, current: pick }),
    [design, priced, budget, minTW, minFlightMin, pick],
  );
  const pickKey = `${pick.batt}|${pick.motor}|${pick.prop}`;

  function apply(best: Candidate) {
    for (const swap of result.swaps) {
      const action: DroneLabAction = { type: "design/pick", key: swap.slot, value: swap.to };
      store.dispatch(action);
    }
    setApplied(`${best.pick.batt}|${best.pick.motor}|${best.pick.prop}`);
  }

  const best = result.best;
  const now = result.current;
  return (
    <section aria-labelledby={`${id}-title`} className="ink-card space-y-3 p-3">
      <div>
        <h3 id={`${id}-title`} className="font-ui text-sm font-extrabold uppercase tracking-wide">
          {t("opt.heading")}
        </h3>
        <p className="text-sm text-muted">{t("opt.lede")}</p>
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor={`${id}-budget`} className="ink-kicker">
            {t("opt.budget")}
          </label>
          <output htmlFor={`${id}-budget`} className="tabular font-ui text-lg font-extrabold">
            {f.whole(budget)}
          </output>
        </div>
        <input
          id={`${id}-budget`}
          type="range"
          min={low}
          max={high}
          step={step}
          value={budget}
          aria-valuetext={t("opt.budgetValue", { amount: f.whole(budget) })}
          onChange={(e) => setBudget(Number(e.target.value))}
          className="mt-1 w-full accent-[var(--color-tomato)]"
        />
        <div className="tabular flex justify-between font-ui text-xs text-muted" aria-hidden="true">
          <span>{f.whole(low)}</span>
          <span>{f.whole(high)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <NumberField id={`${id}-tw`} label={t("opt.minTW")} value={minTW} onChange={setMinTW} step={0.5} max={30} />
        <NumberField id={`${id}-fly`} label={t("opt.minFlight")} value={minFlightMin} onChange={setMinFlight} step={0.5} max={120} />
      </div>

      <div aria-live="polite" className="space-y-2">
        {best ? (
          <>
            <h4 className="font-semibold">{t("opt.best", { amount: f.whole(budget) })}</h4>
            {result.swaps.length === 0 ? (
              <p className="text-sm">{applied === pickKey ? t("opt.applied") : t("opt.keep")}</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {result.swaps.map((swap) => (
                  <li key={swap.slot} className="flex gap-2">
                    <Icon name="chevron-right" size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-tomato" />
                    <span>
                      {t("opt.swap", {
                        slot: t(`opt.slot.${swap.slot}`),
                        from: slotLabel(design, swap.slot, swap.from),
                        to: slotLabel(design, swap.slot, swap.to),
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Stat size="sm" label={t("opt.cost")} value={f.money(best.cost)} hint={t("opt.was", { value: f.money(now.cost) })} />
              <Stat size="sm" label={t("opt.tw")} value={f.one(best.tw)} hint={t("opt.was", { value: f.one(now.tw) })} />
              <Stat size="sm" label={t("opt.flight")} value={t("opt.minutes", { value: f.one(best.flyMin) })} hint={t("opt.was", { value: t("opt.minutes", { value: f.one(now.flyMin) }) })} />
              <Stat size="sm" label={t("opt.weight")} value={t("opt.grams", { value: f.int(best.auw) })} hint={t("opt.was", { value: t("opt.grams", { value: f.int(now.auw) }) })} />
            </div>
            {best.estimate ? <p className="font-ui text-xs text-muted">{t("opt.estimateNote")}</p> : null}
            {result.swaps.length > 0 && canApply ? (
              <Button variant="primary" size="sm" onClick={() => apply(best)}>
                {t("opt.apply")}
              </Button>
            ) : null}
            {result.upgrade ? (
              <p className="text-sm text-muted">
                {t("opt.upgrade", {
                  amount: f.money(sumMoney([result.upgrade.cost, -best.cost])),
                  tw: f.one(result.upgrade.tw),
                  minutes: f.one(result.upgrade.flyMin),
                })}
              </p>
            ) : null}
          </>
        ) : (
          <Callout tone="warn">
            {result.reason === "budget" && result.cheapest
              ? t("opt.noneBudget", { amount: f.whole(budget), cheapest: f.money(result.cheapest.cost) })
              : t("opt.noneConstraints")}
          </Callout>
        )}
        <p className="font-ui text-xs text-muted">{t("opt.checked", { count: result.considered })}</p>
      </div>
    </section>
  );
}

/* ---------- the panel ---------- */

/** "Build it for real": the item's parts with live offers, the cheapest total and, for drones, the budget optimiser. */
export function RealBuildPanel({ lab, itemId, store }: LabDockProps) {
  const locale = useLocale();
  const t = useSearchT(locale);
  const f = useFormat(locale);
  const availability = useSearchAvailability();
  const id = useId();
  const { bom, request } = useBom({ lab, itemId, store });
  const lines = bom.status === "ready" ? bom.lines : null;
  const { prices, loading, refresh } = useOffers(request, availability === "ready", `${lab}:${itemId}`);
  const offers = useMemo(() => prices?.offers ?? new Map<string, PartOffers>(), [prices]);

  if (!t) return <PanelSkeleton />;

  const build = lines?.filter((l) => l.inBuild) ?? [];
  const alternatives = lines?.filter((l) => !l.inBuild) ?? [];
  const costs = build.map((line) => {
    const best = bestOf(offers.get(line.key));
    return best ? { live: true, cost: lineCost(best, line.qty, line.pack) } : line.estimate !== undefined ? { live: false, cost: line.estimate } : null;
  });
  const total = sumMoney(costs.map((c) => c?.cost ?? 0));
  const estimated = costs.filter((c) => c && !c.live).length;
  const unpriced = costs.filter((c) => c === null).length;
  const sources = build
    .map((line) => ({ line, best: bestOf(offers.get(line.key)) }))
    .filter((x): x is { line: BomLine; best: Offer } => x.best !== undefined)
    .map(({ line, best }) => ({ title: `${lineName(line, t)}: ${best.title}`, url: best.url }));

  return (
    <section aria-labelledby={`${id}-title`} className="space-y-3">
      <PanelHead id={`${id}-title`} title={t("real.title")} lede={t("real.lede")}>
        {availability === "ready" && lines ? (
          <Button size="sm" variant="ghost" onClick={refresh} disabled={loading}>
            {t("real.refresh")}
          </Button>
        ) : null}
      </PanelHead>

      {availability === "error" ? <StatusError t={t} /> : null}
      {availability === "off" ? (
        <Callout tone="note" title={t("real.notSetUp")}>
          {lab === "drone" ? t("real.notSetUpDrone") : null}
        </Callout>
      ) : null}
      {prices?.failure ? (
        <Callout tone="warn" title={prices.failure === "rate_limited" ? t("real.rateLimited") : t("real.failed")}>
          <Button size="sm" onClick={refresh}>
            {t("real.retry")}
          </Button>
        </Callout>
      ) : null}
      {prices?.partial ? <Callout tone="note">{t(`real.partial.${prices.partial}`)}</Callout> : null}

      {bom.status === "loading" || availability === "loading" ? <PanelSkeleton /> : null}
      {bom.status === "missing" ? <Callout tone="note">{t("real.noContent")}</Callout> : null}

      {lines && availability !== "loading" ? (
        <>
          <div aria-live="polite" aria-busy={loading}>
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="ink-kicker">{t("real.parts")}</h3>
              {loading ? <span className="font-ui text-xs text-muted">{t("real.loading")}</span> : null}
              {!loading && prices?.fetchedAt ? <span className="font-ui text-xs text-muted">{t("real.checked", { time: f.time(prices.fetchedAt) })}</span> : null}
            </div>
            <ul className="divide-y divide-rule">
              {build.map((line) => (
                <LineItem key={line.key} line={line} found={offers.get(line.key)} t={t} f={f} />
              ))}
            </ul>
          </div>

          <div className="ink-card flex items-end justify-between gap-3 p-3">
            <Stat label={t("real.total")} value={f.money(total)} size="md" />
            <div className="text-end font-ui text-xs text-muted">
              {estimated === 0 && unpriced === 0 && availability === "ready" && !loading ? <div>{t("real.allLive")}</div> : null}
              {estimated > 0 ? <div>{t("real.estimated", { count: estimated })}</div> : null}
              {unpriced > 0 ? <div>{t("real.unpriced", { count: unpriced })}</div> : null}
            </div>
          </div>

          {bom.status === "ready" && bom.drone ? (
            <Optimiser design={bom.drone.design} pick={bom.drone.pick} lines={lines} offers={offers} canApply={bom.live} store={store} t={t} f={f} />
          ) : null}

          {alternatives.length > 0 ? (
            <details className="rounded-ink border-2 border-dashed border-line p-2">
              <summary className="cursor-pointer font-ui text-sm font-bold">{t("real.alternatives")}</summary>
              <ul className="divide-y divide-rule">
                {alternatives.map((line) => (
                  <LineItem key={line.key} line={line} found={offers.get(line.key)} t={t} f={f} />
                ))}
              </ul>
            </details>
          ) : null}

          <SourcesList sources={sources} />
          <p className="text-xs text-muted">{t("real.storesNote")}</p>
        </>
      ) : null}
    </section>
  );
}
