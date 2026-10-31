"use client";

import { useId, useMemo, useState } from "react";
import { summarise } from "@/ai/activity";
import type { Caps } from "@/ai/ledger";
import type { AiLogRow } from "@/ai/log";
import { PRICE_TABLE_ASOF, isStale } from "@/ai/prices";
import { Button, Callout, EmptyState, Meter, Stat } from "@/components/ui";
import type { InsightT } from "./WhatItSees";

type ActivityPanelProps = {
  rows: readonly AiLogRow[];
  caps: Caps;
  onDelete: () => void;
  t: InsightT;
};

const usd = (value: number) => `$${value.toFixed(value < 1 ? 3 : 2)}`;

function SpendMeter({ label, used, limit, t }: { label: string; used: number; limit: number | null; t: InsightT }) {
  if (limit === null) return <Stat size="sm" label={label} value={usd(used)} />;
  return (
    <Meter
      label={label}
      value={used}
      max={limit || 1}
      warn={limit * 0.8}
      danger={limit}
      valueText={t("activity.of", { used: usd(used), limit: usd(limit) })}
    />
  );
}

/** Spend and call figures from the local AI log. Only counts and model names appear; nothing a person or a model wrote. */
export function ActivityPanel({ rows, caps, onDelete, t }: ActivityPanelProps) {
  const headingId = useId();
  const [confirming, setConfirming] = useState(false);
  const [now] = useState(() => Date.now());
  const activity = useMemo(() => summarise(rows, now), [rows, now]);
  const stale = isStale({ in: 0, cacheRead: null, cacheWrite: null, out: 0, asOf: PRICE_TABLE_ASOF, source: "" }, now);

  return (
    <section aria-labelledby={headingId} className="@container space-y-6 text-ink">
      <h2 id={headingId} className="text-lg font-semibold">
        {t("activity.title")}
      </h2>

      {rows.length === 0 ? (
        <EmptyState title={t("activity.empty")} />
      ) : (
        <>
          <div className="grid gap-4 @sm:grid-cols-2">
            <SpendMeter label={t("activity.today")} used={activity.today.usd} limit={caps.dayUSD} t={t} />
            <SpendMeter label={t("activity.month")} used={activity.month.usd} limit={caps.monthUSD} t={t} />
          </div>
          {stale ? <Callout tone="warn">{t("activity.stale", { date: PRICE_TABLE_ASOF })}</Callout> : null}

          <div className="space-y-2">
            <h3 className="text-base font-semibold">{t("activity.models")}</h3>
            <ul className="divide-y divide-rule">
              {activity.perModel.map((m) => (
                <li key={m.model} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2 text-sm">
                  <span className="min-w-0 break-words font-mono">{m.model}</span>
                  <span className="tabular-nums text-muted">
                    {m.usd === null ? t("activity.priceUnknown") : usd(m.usd)}
                    {" · "}
                    {t("activity.calls", { count: m.calls })}
                    {" · "}
                    {t("activity.cacheShare", { percent: Math.round(m.cacheReadRatio * 100) })}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-4 @sm:grid-cols-3">
            <Stat
              size="sm"
              label={t("activity.callsPerMessage")}
              value={activity.callsPerMessage.p50}
              hint={t("activity.p95", { value: activity.callsPerMessage.p95 })}
            />
            <Stat
              size="sm"
              label={t("activity.firstToken")}
              value={activity.firstTokenMs.p50}
              unit="ms"
              hint={t("activity.p95", { value: `${activity.firstTokenMs.p95} ms` })}
            />
            <Stat size="sm" label={t("activity.capped")} value={activity.capped} />
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-semibold">{t("activity.toolErrors")}</h3>
            {activity.toolErrors.length === 0 ? (
              <p className="text-sm text-muted">{t("activity.none")}</p>
            ) : (
              <ul className="divide-y divide-rule">
                {activity.toolErrors.map((e) => (
                  <li key={e.code} className="flex justify-between gap-4 py-2 text-sm">
                    <span className="font-mono">{e.code}</span>
                    <span className="tabular-nums text-muted">{e.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-semibold">{t("activity.policy")}</h3>
            <dl className="divide-y divide-rule text-sm">
              {(["forbiddenOps", "modeBlocked", "injectionFlags", "secretsRedacted"] as const).map((key) => (
                <div key={key} className="flex justify-between gap-4 py-2">
                  <dt>{t(`activity.${key}`)}</dt>
                  <dd className="tabular-nums text-muted">{activity.policy[key]}</dd>
                </div>
              ))}
            </dl>
          </div>
        </>
      )}

      {confirming ? (
        <Callout tone="danger" live>
          <p>{t("activity.deleteConfirm")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>
              {t("activity.cancel")}
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                setConfirming(false);
                onDelete();
              }}
            >
              {t("activity.deleteYes")}
            </Button>
          </div>
        </Callout>
      ) : (
        <Button size="sm" variant="danger" onClick={() => setConfirming(true)}>
          {t("activity.delete")}
        </Button>
      )}
    </section>
  );
}
