"use client";

import { Icon } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import type { Translate } from "@/i18n/translate";
import type { Messages } from "@/i18n/namespaces";
import type { LayerTier, ProjectFidelity } from "@/sim/registry/project";
import type { ValidationRecord } from "@/sim/registry/types";

export type FidelityT = Translate<Messages["fidelity"]>;

type Layer = LayerTier["layer"];

const chipClass = (none: boolean) =>
  cx(
    "inline-flex min-h-8 items-center gap-2 whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold transition-colors duration-300",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:translate-y-px",
    none ? "bg-sunken text-ink hover:bg-rule" : "bg-ink text-paper hover:opacity-90",
  );

/** The newest passing record a person can lean on: a bench run, an oracle or an analytic case. */
export function pickValidation(records: readonly ValidationRecord[]): ValidationRecord | undefined {
  return records
    .filter((r) => r.status === "pass" && (r.kind === "oracle" || r.kind === "analytic" || r.kind === "bench"))
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

export function validationLine(v: ValidationRecord | undefined, t: FidelityT): string {
  if (!v) return t("validation.none");
  if (v.kind === "bench") return t("validation.bench", { n: v.result.n });
  return t("validation.oracle", { pct: v.result.worst, oracle: v.oracle?.name ?? v.dataset, n: v.result.n, date: v.date });
}

export function TierChips({ fidelity, t, onOpenLayer }: { fidelity: ProjectFidelity; t: FidelityT; onOpenLayer(layer: Layer): void }) {
  if (fidelity.layers.length === 0) return null;
  return (
    <ul className="flex flex-wrap items-center gap-2">
      {fidelity.layers.map(({ layer, tier }) => {
        const tierName = t(`tier.${tier}`);
        return (
          <li key={layer}>
            <button type="button" aria-label={t("chip.aria", { layer: t(`layer.${layer}`), tier: tierName })} onClick={() => onOpenLayer(layer)} className={chipClass(tier === "none")}>
              {tier === "none" ? <Icon name="empty" size={16} aria-hidden="true" /> : <span className="font-ui tabular">{tier}</span>}
              <span>
                {t(`layer.${layer}`)}: {tierName}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function TierSummaryChip({ fidelity, t }: { fidelity: ProjectFidelity; t: FidelityT }) {
  if (fidelity.layers.length === 0) return null;
  const { summary } = fidelity;
  return (
    <span className={cx("inline-flex items-center gap-2 whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold", summary === "none" ? "bg-sunken text-ink" : "bg-ink text-paper")}>
      {summary === "none" ? <Icon name="empty" size={16} aria-hidden="true" /> : <span className="font-ui tabular">{summary}</span>}
      {t("summary", { tier: t(`tier.${summary}`) })}
    </span>
  );
}
