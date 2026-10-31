"use client";

import { useId } from "react";
import type { DesignPick, DroneContent } from "@/content/schema";
import { Callout, type CalloutTone } from "@/components/ui/Callout";
import { Select } from "@/components/ui/Field";
import { htmlLang, type Locale } from "@/i18n/config";
import { checkLevel, tileDigits, verdicts, type DesignCheck } from "@/lib/drone/calc";
import { evaluateDesign } from "@/lib/drone/design";
import type { DesignKey } from "@/lib/dronelab/workshop";
import { formatNumber, type ContentT, type DroneLabT } from "./text";

const LEVEL_TONE: Record<string, CalloutTone> = { danger: "danger", warn: "warn", info: "note" };

type Props = {
  lang: Locale;
  content: DroneContent;
  pick: DesignPick;
  t: DroneLabT;
  ct: ContentT;
  onPick(key: DesignKey, value: string): void;
};

export function DesignPanel({ lang, content, pick, t, ct, onPick }: Props) {
  const base = useId();
  const { design } = content;
  const { result: r, checks } = evaluateDesign(design, pick);
  const kind = design.model.flight.kind;
  const n = (value: number, digits: number) => formatNumber(lang, value, digits);

  const tiles: { id: string; label: string; value: string }[] = [
    { id: "auw", label: t("design.tiles.auw"), value: t("design.units.g", { value: n(r.auw, tileDigits.auw) }) },
    { id: "tw", label: t("design.tiles.tw"), value: t("design.units.tw", { value: n(r.tw, tileDigits.tw) }) },
    {
      id: "hoverThr",
      label: kind === "wing" ? t("design.tiles.cruiseThr") : t("design.tiles.hoverThr"),
      value: t("design.units.pct", { value: n(r.hoverThr * 100, tileDigits.hoverThrPercent) }),
    },
    { id: "maxA", label: t("design.tiles.maxA"), value: t("design.units.a", { value: n(r.maxA, tileDigits.maxA) }) },
    {
      id: "hoverMin",
      label: kind === "wing" ? t("design.tiles.cruiseMin") : t("design.tiles.hoverMin"),
      value: t("design.units.min", { value: n(r.hoverMin, tileDigits.hoverMin) }),
    },
    {
      id: "flyMin",
      label: kind === "vtol" ? t("design.tiles.cruiseMin") : t("design.tiles.flyMin"),
      value: t("design.units.min", { value: n(r.flyMin, tileDigits.flyMin) }),
    },
  ];
  if (r.cruise) {
    tiles.push({
      id: "speed",
      label: t("design.tiles.speed"),
      value: t("design.units.kmh", { value: n(r.cruise.speed * 3.6, tileDigits.speedKmh) }),
    });
  }

  // An over-spun or weak build always gets a check below that says so with its numbers (evaluateDesign), so
  // only the craft's "ok" verdict line adds anything here.
  const verdictLines = verdicts(r)
    .filter((v) => v === "ok")
    .map((v) => `design.verdict.${v}`)
    .filter((key) => ct.has(key));
  const electrical = design.fixed.filter((p) => p.category === "Electrical").length + 2;
  const mechanical = design.fixed.filter((p) => p.category === "Mechanical").length + 1;
  const money = (value: number) => t("design.cost.money", { value: n(value, 0) });

  const selects: { key: DesignKey; label: string; options: Record<string, { label: string }> }[] = [
    { key: "batt", label: t("design.battery"), options: design.batts },
    { key: "motor", label: t("design.motors"), options: design.motors },
    { key: "prop", label: t("design.props"), options: design.props },
  ];

  return (
    <div className="space-y-4">
      <h2 className="sr-only">{t("design.title")}</h2>
      <p className="text-sm text-muted">{t("design.lede")}</p>
      {/* one pick per row, so "6S 1100 mAh LiPo" is never cut */}
      <div className="space-y-3">
        {selects.map((s) => (
          <Select
            key={s.key}
            label={s.label}
            value={pick[s.key]}
            onChange={(e) => onPick(s.key, e.target.value)}
            data-testid={`design-${s.key}`}
          >
            {Object.entries(s.options).map(([key, option]) => (
              <option key={key} value={key}>
                {option.label}
              </option>
            ))}
          </Select>
        ))}
      </div>

      <section aria-labelledby={`${base}-results`}>
        <h3 id={`${base}-results`} className="kicker">
          {t("design.results")}
        </h3>
        <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3" aria-live="polite" data-testid="design-tiles">
          {tiles.map((tile) => (
            <div key={tile.id} className="min-w-0 rounded-xl border border-rule bg-surface px-3 py-2" data-tile={tile.id}>
              <dt className="field-label hyphens-auto">{tile.label}</dt>
              <dd className="tabular whitespace-nowrap text-lg font-semibold leading-tight">{tile.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby={`${base}-checks`} className="space-y-2">
        <h3 id={`${base}-checks`} className="kicker">
          {t("design.checksTitle")}
        </h3>
        {verdictLines.map((key) => {
          const [lead, rest] = firstSentence(lang, ct(key, { tw: n(r.tw, 1), kv: design.motors[pick.motor].kv, cells: design.batts[pick.batt].cells }));
          return (
            <p key={key} data-testid="design-verdict">
              <strong className="font-semibold">{lead}</strong>
              {rest}
            </p>
          );
        })}
        {checks.length === 0 ? (
          <Callout tone="success">{t("design.allGood")}</Callout>
        ) : (
          <ul className="space-y-2" aria-live="polite">
            {checks.map((check) => {
              const level = checkLevel[check.code];
              return (
                <li key={check.code}>
                  <Callout tone={LEVEL_TONE[level]} title={t(`design.levels.${level}`)}>
                    {checkText(check, t, n)}
                  </Callout>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby={`${base}-cost`}>
        <h3 id={`${base}-cost`} className="kicker">
          {t("design.cost.title")}
        </h3>
        <table className="mt-2 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-[1.5px] border-rule text-start text-xs text-muted">
              <th scope="col" className="py-2 text-start">
                {t("design.cost.category")}
              </th>
              <th scope="col" className="py-2 text-end">
                {t("design.cost.parts")}
              </th>
              <th scope="col" className="py-2 text-end">
                {t("design.cost.price")}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-rule">
              <th scope="row" className="py-2 text-start font-normal">
                {t("design.cost.electrical")}
              </th>
              <td className="tabular py-2 text-end">{n(electrical, 0)}</td>
              <td className="tabular py-2 text-end">{money(r.cost.electrical)}</td>
            </tr>
            <tr className="border-b border-rule">
              <th scope="row" className="py-2 text-start font-normal">
                {t("design.cost.mechanical")}
              </th>
              <td className="tabular py-2 text-end">{n(mechanical, 0)}</td>
              <td className="tabular py-2 text-end">{money(r.cost.mechanical)}</td>
            </tr>
            <tr>
              <th scope="row" className="py-2 text-start">
                {t("design.cost.total")}
              </th>
              <td className="tabular py-2 text-end">{n(electrical + mechanical, 0)}</td>
              <td className="tabular py-2 text-end font-semibold">{money(r.cost.total)}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}

/** The verdict's first sentence (bold on the page) and the rest, split where the language ends a sentence. */
function firstSentence(lang: Locale, text: string): [string, string] {
  const first = new Intl.Segmenter(htmlLang(lang), { granularity: "sentence" }).segment(text)[Symbol.iterator]().next();
  const lead = first.done ? text : first.value.segment;
  return [lead, text.slice(lead.length)];
}

function checkText(check: DesignCheck, t: DroneLabT, n: (value: number, digits: number) => string): string {
  switch (check.code) {
    case "over-spin":
      return t("design.checks.over-spin", { kv: n(check.kv, 0), cells: check.cells });
    case "weak":
      return t("design.checks.weak", { tw: n(check.tw, 1), minTW: n(check.minTW, 1) });
    case "cannot-hover":
      return t("design.checks.cannot-hover", { tw: n(check.tw, 1) });
    case "hover-high":
      return t("design.checks.hover-high", { pct: n(check.hoverThr * 100, 0) });
    case "esc-overcurrent":
      return t("design.checks.esc-overcurrent", { perMotor: n(check.perMotorA, 0), esc: n(check.escA, 0) });
    case "battery-overcurrent":
      return t("design.checks.battery-overcurrent", { maxA: n(check.maxA, 0), limit: n(check.limitA, 0) });
    case "prop-clash":
      return t("design.checks.prop-clash", { span: n(check.spanMm, 0), chord: n(check.chordMm, 0) });
    case "tail-heavy":
      return t("design.checks.tail-heavy");
    case "short-flight":
      return t("design.checks.short-flight", { min: n(check.flyMin, 1) });
  }
}
