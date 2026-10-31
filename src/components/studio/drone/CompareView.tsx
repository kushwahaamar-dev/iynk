import { Callout, Chip, type ChipTone } from "@/components/ui";
import { htmlLang, type Locale } from "@/i18n/config";
import { tileDigits } from "@/lib/drone/calc";
import type { CheckResult } from "@/sim/flight/checks";
import type { BuildOutputs } from "@/sim/flight/evaluate";
import { compareOutputs, type CompareId, type CompareRow } from "@/studio/drone/compare";
import type { DronePartsT } from "./PartEntryForm";
import { SafetyNotice, type DroneT } from "./SafetyNotice";

const PERCENT = 100;
const SECONDS_PER_MINUTE = 60;
const TONE: Record<CheckResult, ChipTone> = { fail: "bad", warn: "warn", info: "info", ok: "good" };

type Shown = { unit: "g" | "ratio" | "pct" | "a" | "min"; scale: number; digits: number };

const SHOWN: Record<CompareId, Shown> = {
  auw: { unit: "g", scale: 1, digits: tileDigits.auw },
  tw: { unit: "ratio", scale: 1, digits: tileDigits.tw },
  hoverThrottle: { unit: "pct", scale: PERCENT, digits: tileDigits.hoverThrPercent },
  hoverAmps: { unit: "a", scale: 1, digits: tileDigits.maxA },
  maxAmps: { unit: "a", scale: 1, digits: tileDigits.maxA },
  enduranceTyp: { unit: "min", scale: 1 / SECONDS_PER_MINUTE, digits: tileDigits.flyMin },
};

const LABEL_KEY = {
  auw: "numbers.auw",
  tw: "numbers.tw",
  hoverThrottle: "numbers.hoverThrottle",
  hoverAmps: "numbers.hoverAmps",
  maxAmps: "numbers.maxAmps",
  enduranceTyp: "numbers.endurance",
} as const satisfies Record<CompareId, Parameters<DroneT>[0]>;

function onlyIn(list: readonly string[], other: readonly string[]): string[] {
  const seen = new Set(other);
  return list.filter((item) => !seen.has(item));
}

function Assumptions({ title, items }: { title: string; items: readonly string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <h4 className="text-sm font-medium">{title}</h4>
      <ul className="flex flex-col gap-1 text-sm text-muted">
        {items.map((item) => (
          <li key={item} className="text-pretty">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The pinned build and the current one, figure by figure, with the difference. Blocked figures say so instead of showing zero. */
export function CompareView({
  pinned,
  current,
  lang,
  t,
  tp,
}: {
  pinned: { label: string; out: BuildOutputs } | null;
  current: BuildOutputs;
  lang: Locale;
  t: DroneT;
  tp: DronePartsT;
}) {
  const tag = htmlLang(lang);
  const number = (value: number, digits: number, signed: boolean) =>
    new Intl.NumberFormat(tag, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      signDisplay: signed ? "exceptZero" : "auto",
    }).format(value);
  const figure = (id: CompareId, value: number | null, signed = false) => {
    if (value === null) return tp("compare.blocked");
    const shown = SHOWN[id];
    return tp(`compare.unit.${shown.unit}`, { value: number(value * shown.scale, shown.digits, signed) });
  };
  const change = (row: CompareRow) =>
    row.pct === null ? tp("compare.blocked") : tp("compare.unit.pct", { value: number(row.pct, 1, true) });

  return (
    <section aria-labelledby="compare-title" className="flex flex-col gap-4">
      <h2 id="compare-title" className="text-lg font-semibold text-balance">
        {tp("compare.title")}
      </h2>
      {pinned === null ? (
        <p className="text-sm text-muted text-pretty">{tp("compare.empty")}</p>
      ) : (
        <Comparison pinned={pinned} current={current} figure={figure} change={change} t={t} tp={tp} />
      )}
      <p className="text-sm text-muted text-pretty">{tp("compare.memoryNote")}</p>
      <SafetyNotice id="SN-8" t={t} />
    </section>
  );
}

function Comparison({
  pinned,
  current,
  figure,
  change,
  t,
  tp,
}: {
  pinned: { label: string; out: BuildOutputs };
  current: BuildOutputs;
  figure: (id: CompareId, value: number | null, signed?: boolean) => string;
  change: (row: CompareRow) => string;
  t: DroneT;
  tp: DronePartsT;
}) {
  const { rows, checks, assumptionsEqual } = compareOutputs(pinned.out, current);
  return (
    <>
      <p className="text-sm text-muted text-pretty">{tp("compare.pinnedLabel", { label: pinned.label })}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th scope="col" className="py-2 pr-4 font-medium">
                {tp("compare.figure")}
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium">
                {tp("compare.pinnedHead")}
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium">
                {tp("compare.currentHead")}
              </th>
              <th scope="col" className="px-2 py-2 text-right font-medium">
                {tp("compare.difference")}
              </th>
              <th scope="col" className="py-2 pl-2 text-right font-medium">
                {tp("compare.percent")}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-rule">
                <th scope="row" className="py-2 pr-4 font-medium">
                  {t(LABEL_KEY[row.id])}
                </th>
                <td className="px-2 py-2 text-right font-mono tabular-nums">{figure(row.id, row.a)}</td>
                <td className="px-2 py-2 text-right font-mono tabular-nums">{figure(row.id, row.b)}</td>
                <td className="px-2 py-2 text-right font-mono tabular-nums">{figure(row.id, row.diff, true)}</td>
                <td className="py-2 pl-2 text-right font-mono tabular-nums">{change(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold text-balance">{tp("compare.checksTitle")}</h3>
        {checks.length === 0 ? (
          <p className="text-sm text-muted text-pretty">{tp("compare.checksNone")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {checks.map((check) => (
              <li key={check.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-sunken p-3 text-sm">
                <span>{t(`check.${check.id}.name`)}</span>
                <span className="flex items-center gap-2">
                  <Chip tone={TONE[check.a]}>{t(`check.state.${check.a}`)}</Chip>
                  <Chip tone={TONE[check.b]}>{t(`check.state.${check.b}`)}</Chip>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold text-balance">{tp("compare.assumptionsTitle")}</h3>
        {assumptionsEqual ? (
          <p className="text-sm text-muted text-pretty">{tp("compare.assumptionsSame")}</p>
        ) : (
          <Callout tone="note">
            <p className="text-pretty">{tp("compare.assumptionsDiffer")}</p>
            <div className="mt-2 flex flex-col gap-2">
              <Assumptions title={tp("compare.onlyPinned")} items={onlyIn(pinned.out.assumptions, current.assumptions)} />
              <Assumptions title={tp("compare.onlyCurrent")} items={onlyIn(current.assumptions, pinned.out.assumptions)} />
            </div>
          </Callout>
        )}
      </div>
    </>
  );
}
