"use client";

import { useId } from "react";
import type { DesignPick, DroneContent } from "@/content/schema";
import { Callout } from "@/components/ui/Callout";
import { Chip, type ChipTone } from "@/components/ui/Chip";
import type { Locale } from "@/i18n/config";
import { checkLevel, tileDigits, verdicts, type DesignCheck } from "@/lib/drone/calc";
import { evaluateDesign } from "@/lib/drone/design";
import type { DesignKey } from "@/lib/dronelab/store";
import { formatNumber, type ContentT, type DroneLabT } from "./text";

const LEVEL_TONE: Record<string, ChipTone> = { danger: "tomato", warn: "mustard", info: "cobalt" };
const LEVEL_BORDER: Record<string, string> = { danger: "border-tomato", warn: "border-mustard", info: "border-cobalt" };

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

  const verdictLines = verdicts(r)
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
    <div className="space-y-5">
      <h2 className="text-xl">{t("design.title")}</h2>
      <p className="text-muted">{t("design.lede")}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {selects.map((s) => (
          <div key={s.key} className="flex flex-col gap-1.5">
            <label htmlFor={`${base}-${s.key}`} className="ink-kicker">
              {s.label}
            </label>
            <select
              id={`${base}-${s.key}`}
              value={pick[s.key]}
              onChange={(e) => onPick(s.key, e.target.value)}
              className="ink-field min-h-11 w-full"
              data-testid={`design-${s.key}`}
            >
              {Object.entries(s.options).map(([key, option]) => (
                <option key={key} value={key}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <section aria-labelledby={`${base}-results`}>
        <h3 id={`${base}-results`} className="ink-kicker">
          {t("design.results")}
        </h3>
        <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3" aria-live="polite" data-testid="design-tiles">
          {tiles.map((tile) => (
            <div
              key={tile.id}
              className="rounded-ink border-2 border-line bg-surface px-3 py-2 shadow-ink-sm"
              data-tile={tile.id}
            >
              <dt className="font-ui text-[0.7rem] font-bold uppercase tracking-wider text-muted">{tile.label}</dt>
              <dd className="mt-0.5 font-ui text-lg font-bold">{tile.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby={`${base}-checks`} className="space-y-2">
        <h3 id={`${base}-checks`} className="ink-kicker">
          {t("design.checksTitle")}
        </h3>
        {verdictLines.map((key) => (
          <p key={key} className="font-bold">
            {ct(key, { tw: n(r.tw, 1), kv: design.motors[pick.motor].kv, cells: design.batts[pick.batt].cells })}
          </p>
        ))}
        {checks.length === 0 ? (
          <Callout tone="success">{t("design.allGood")}</Callout>
        ) : (
          <ul className="space-y-2" aria-live="polite">
            {checks.map((check) => {
              const level = checkLevel[check.code];
              return (
                <li
                  key={check.code}
                  className={`flex items-start gap-2 rounded-ink border-2 bg-surface px-3 py-2 ${LEVEL_BORDER[level]}`}
                >
                  <Chip tone={LEVEL_TONE[level]}>{t(`design.levels.${level}`)}</Chip>
                  <span>{checkText(check, t, n)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby={`${base}-cost`}>
        <h3 id={`${base}-cost`} className="ink-kicker">
          {t("design.cost.title")}
        </h3>
        <table className="mt-2 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-line text-start font-ui text-xs uppercase tracking-wider">
              <th scope="col" className="py-1.5 text-start">
                {t("design.cost.category")}
              </th>
              <th scope="col" className="py-1.5 text-end">
                {t("design.cost.parts")}
              </th>
              <th scope="col" className="py-1.5 text-end">
                {t("design.cost.price")}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-rule">
              <th scope="row" className="py-1.5 text-start font-normal">
                {t("design.cost.electrical")}
              </th>
              <td className="py-1.5 text-end font-ui">{n(electrical, 0)}</td>
              <td className="py-1.5 text-end font-ui">{money(r.cost.electrical)}</td>
            </tr>
            <tr className="border-b border-rule">
              <th scope="row" className="py-1.5 text-start font-normal">
                {t("design.cost.mechanical")}
              </th>
              <td className="py-1.5 text-end font-ui">{n(mechanical, 0)}</td>
              <td className="py-1.5 text-end font-ui">{money(r.cost.mechanical)}</td>
            </tr>
            <tr>
              <th scope="row" className="py-1.5 text-start">
                {t("design.cost.total")}
              </th>
              <td className="py-1.5 text-end font-ui">{n(electrical + mechanical, 0)}</td>
              <td className="py-1.5 text-end font-ui font-bold">{money(r.cost.total)}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
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
