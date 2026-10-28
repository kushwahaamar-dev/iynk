"use client";

import { useId, useState } from "react";
import { Select } from "@/components/ui/Field";
import type { PinCap, PinRow } from "@/content/schema";
import { useText } from "./text";

const FILTERS: PinCap[] = ["digital", "pwm", "analog-in", "interrupt", "i2c", "spi", "uart", "power", "strapping"];

/** Every header pin with its functions, level and current limit; filter by capability. */
export function PinoutTable({ board, rows }: { board: string; rows: PinRow[] }) {
  const { t, tc, has } = useText();
  const id = useId();
  const [cap, setCap] = useState<PinCap | "all">("all");
  const present = FILTERS.filter((c) => rows.some((r) => r.caps.includes(c)));
  const shown = cap === "all" ? rows : rows.filter((r) => r.caps.includes(cap));

  return (
    <section aria-labelledby={`${id}-title`} data-testid="pinout">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id={`${id}-title`} className="sr-only">
          {t("pinout.title")}
        </h2>
        <div className="w-56 max-w-full">
          <Select label={t("pinout.filter")} hideLabel value={cap} onChange={(e) => setCap(e.target.value as PinCap | "all")}>
            <option value="all">{t("pinout.all")}</option>
            {present.map((c) => (
              <option key={c} value={c}>
                {t(`pinout.caps.${c}`)}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {/* Scrolls both ways, so it takes focus (keyboard scrolling) and is named by the section heading. */}
      <div role="region" aria-labelledby={`${id}-title`} tabIndex={0} className="mt-3 max-h-[min(36rem,75svh)] overflow-auto rounded-lg border border-rule">
        <table className="w-full min-w-[640px] text-sm">
          <caption className="sr-only">{t("pinout.caption", { board })}</caption>
          <thead className="sticky top-0 bg-sunken">
            <tr className="text-start text-xs font-semibold text-muted">
              <th scope="col" className="px-2 py-3 text-start">{t("pinout.header")}</th>
              <th scope="col" className="px-2 py-3 text-start">{t("pinout.pin")}</th>
              <th scope="col" className="px-2 py-3 text-start">{t("pinout.label")}</th>
              <th scope="col" className="px-2 py-3 text-start">{t("pinout.functions")}</th>
              <th scope="col" className="px-2 py-3 text-start">{t("pinout.volts")}</th>
              <th scope="col" className="px-2 py-3 text-start">{t("pinout.current")}</th>
              <th scope="col" className="px-2 py-3 text-start">{t("pinout.notes")}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={`${r.header}-${r.pin}`} className="h-10 border-t border-rule align-top" data-net={r.net}>
                <td className="px-2 py-2 text-muted">{r.header}</td>
                <td className="px-2 py-2 tabular">{r.pin}</td>
                <th scope="row" className="px-2 py-2 text-start font-mono font-semibold">
                  {r.label}
                  {r.fpgaPin ? <span className="ms-1 font-normal text-muted">({r.fpgaPin})</span> : null}
                </th>
                <td className="px-2 py-2">
                  {[...r.functions, ...r.caps.filter((c) => c === "strapping" || c === "input-only").map((c) => t(`pinout.caps.${c}`))].join(", ") || t("pinout.none")}
                </td>
                <td className="px-2 py-2 tabular">
                  {r.volts === null ? t("pinout.none") : t("board.volts", { n: r.volts })}
                  {r.fiveVoltTolerant ? <span className="block text-xs text-muted">{t("pinout.fiveVolt")}</span> : null}
                </td>
                <td className="px-2 py-2 tabular">{r.maxCurrentMa ? t("board.ma", { n: r.maxCurrentMa }) : t("pinout.none")}</td>
                <td className="px-2 py-2">{has(r.note) ? tc(r.note) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
