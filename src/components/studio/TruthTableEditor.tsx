"use client";

import { useEffect, useRef, useState } from "react";
import { Button, IconButton, InlineStatus, Select } from "@/components/ui";
import { DRAFT_LIMITS } from "@/studio/parts/draft";
import { completeTable } from "@/studio/parts/templates";
import type { LogicRow } from "@/studio/parts/templates";
import type { PartEditorT } from "./PinTable";

const ROW_PX = 56;
const VIEW_ROWS = 7;
const OVERSCAN = 4;
const WARNINGS_SHOWN = 5;
const IN_LEVELS = ["0", "1", "x"] as const;
const OUT_LEVELS = ["0", "1", "z"] as const;

export interface TruthTableEditorProps {
  inputs: string[];
  outputs: string[];
  rows: LogicRow[];
  onChange(rows: LogicRow[]): void;
  /** Indexes of rows an earlier row hides. */
  warnings: number[];
  t: PartEditorT;
}

const level = (value: unknown): 0 | 1 | "x" | "z" => (value === "0" ? 0 : value === "1" ? 1 : value === "z" ? "z" : "x");

export function TruthTableEditor({ inputs, outputs, rows, onChange, warnings, t }: TruthTableEditorProps) {
  const [first, setFirst] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const grew = useRef(false);

  useEffect(() => {
    if (!grew.current) return;
    grew.current = false;
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [rows.length]);

  const columns = inputs.length + outputs.length;
  const full = rows.length >= DRAFT_LIMITS.tableRows;
  const from = Math.max(0, first - OVERSCAN);
  const to = Math.min(rows.length, first + VIEW_ROWS + OVERSCAN);

  function setCell(index: number, side: "when" | "then", name: string, value: unknown) {
    onChange(rows.map((row, i) => (i === index ? { ...row, [side]: { ...row[side], [name]: level(value) } } : row)));
  }

  function addRow() {
    if (full) return;
    grew.current = true;
    onChange([
      ...rows,
      { when: Object.fromEntries(inputs.map((name) => [name, "x" as const])), then: Object.fromEntries(outputs.map((name) => [name, "z" as const])) },
    ]);
    setAnnouncement(t("model.table.added", { count: rows.length + 1 }));
  }

  function complete() {
    const next = completeTable(inputs, outputs, rows);
    grew.current = next.length > rows.length;
    onChange(next);
    setAnnouncement(t("model.table.completed", { count: next.length - rows.length }));
  }

  function removeRow(index: number) {
    onChange(rows.filter((_, i) => i !== index));
    setAnnouncement(t("model.table.removed", { n: index + 1, count: rows.length - 1 }));
  }

  if (columns === 0) return <p className="text-sm text-muted">{t("model.table.noColumns")}</p>;

  return (
    <div className="flex flex-col gap-3">
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {warnings.slice(0, WARNINGS_SHOWN).map((index) => (
        <InlineStatus key={index} tone="warn">
          {t("model.table.shadowed", { n: index + 1 })}
        </InlineStatus>
      ))}
      {warnings.length > WARNINGS_SHOWN ? <InlineStatus tone="warn">{t("model.table.moreShadowed", { count: warnings.length - WARNINGS_SHOWN })}</InlineStatus> : null}
      <div
        ref={scroller}
        role="region"
        aria-label={t("model.table.caption")}
        tabIndex={0}
        onScroll={(e) => setFirst(Math.floor(e.currentTarget.scrollTop / ROW_PX))}
        style={{ maxHeight: ROW_PX * (VIEW_ROWS + 1) }}
        className="overflow-auto rounded-lg border border-rule"
      >
        <table className="w-full min-w-max border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-sunken text-start text-muted">
            <tr>
              <th scope="col" className="px-2 py-2 text-start font-medium">
                {t("model.table.row")}
              </th>
              {[...inputs, ...outputs].map((name) => (
                <th key={name} scope="col" className="px-2 py-2 text-start font-mono font-medium">
                  {name}
                </th>
              ))}
              <td className="w-12" />
            </tr>
          </thead>
          <tbody>
            {from > 0 ? (
              <tr aria-hidden="true" style={{ height: from * ROW_PX }}>
                <td colSpan={columns + 2} />
              </tr>
            ) : null}
            {rows.slice(from, to).map((row, k) => {
              const index = from + k;
              const cell = (name: string) => t("model.table.cell", { n: index + 1, name });
              return (
                <tr key={index} style={{ height: ROW_PX }} className="border-t border-rule">
                  <td className="px-2 tabular-nums text-muted">{index + 1}</td>
                  {inputs.map((name) => (
                    <td key={name} className="px-1">
                      <Select label={cell(name)} hideLabel className="font-mono" value={String(row.when[name] ?? "x")} onChange={(e) => setCell(index, "when", name, e.target.value)}>
                        {IN_LEVELS.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </Select>
                    </td>
                  ))}
                  {outputs.map((name) => (
                    <td key={name} className="px-1">
                      <Select label={cell(name)} hideLabel className="font-mono" value={String(row.then[name] ?? "z")} onChange={(e) => setCell(index, "then", name, e.target.value)}>
                        {OUT_LEVELS.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </Select>
                    </td>
                  ))}
                  <td className="px-1">
                    <IconButton label={t("model.table.remove", { n: index + 1 })} icon="close" size="sm" onClick={() => removeRow(index)} />
                  </td>
                </tr>
              );
            })}
            {to < rows.length ? (
              <tr aria-hidden="true" style={{ height: (rows.length - to) * ROW_PX }}>
                <td colSpan={columns + 2} />
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" onClick={addRow} disabled={full}>
          {t("model.table.add")}
        </Button>
        <Button variant="ghost" size="sm" onClick={complete} disabled={inputs.length === 0 || full}>
          {t("model.table.complete")}
        </Button>
        <span className="text-sm tabular-nums text-muted">{t("model.table.count", { count: rows.length, max: DRAFT_LIMITS.tableRows })}</span>
      </div>
      {full ? <InlineStatus tone="info">{t("model.table.limit", { max: DRAFT_LIMITS.tableRows })}</InlineStatus> : null}
    </div>
  );
}
