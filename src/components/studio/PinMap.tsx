"use client";

import { memo, useId, useMemo } from "react";
import { EmptyState, IconButton, cx } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import type { Translate as Translator } from "@/i18n/translate";
import type { PinRef } from "@/project/generated/types";
import type { PinLive, PinMapModel, PinRow } from "@/studio/views/board";

export interface PinMapProps {
  model: PinMapModel;
  live: Record<string, PinLive>;
  running: boolean;
  selectedNet?: string;
  onSelectNet(netId: string | undefined): void;
  onWireFrom(pin: PinRef): void;
  messages: Messages["studio"];
  lang: Locale;
}

type Translate = Translator<Messages["studio"]>;

type RowsProps = {
  board: string;
  rows: readonly PinRow[];
  nameOf?: (row: PinRow, index: number) => string;
  live: Record<string, PinLive>;
  running: boolean;
  selectedNet?: string;
  onSelectNet(netId: string | undefined): void;
  onWireFrom(pin: PinRef): void;
  t: Translate;
};

const HEAD = "py-2 pe-4 text-start text-sm font-medium text-muted";

type LevelProps = { level: PinLive["level"] | undefined; t: Translate };

function Level({ level, t }: LevelProps) {
  if (level === undefined) return null;
  return (
    <span className="inline-flex items-center gap-2 font-mono text-sm font-medium tabular-nums">
      <span aria-hidden className={cx("size-2 rounded-full border border-ink", level === 1 && "bg-ink")} />
      {level === 1 ? t("board.high") : t("board.low")}
    </span>
  );
}

type RowProps = Omit<RowsProps, "rows" | "nameOf" | "live" | "selectedNet"> & { row: PinRow; name: string; level?: PinLive["level"]; selected: boolean };

const Row = memo(function Row({ board, row, name, level, selected, running, onSelectNet, onWireFrom, t }: RowProps) {
  return (
    <tr className={cx("border-t border-rule align-top", selected && "bg-sunken")}>
      <th scope="row" className="py-2 pe-4 text-start font-normal">
        <button
          type="button"
          disabled={row.netId === undefined}
          aria-pressed={row.netId === undefined ? undefined : selected}
          onClick={() => onSelectNet(selected ? undefined : row.netId)}
          className="-mx-2 rounded-md px-2 text-start outline-none motion-fade hover:bg-hover focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-default disabled:hover:bg-transparent"
        >
          <span className="block font-mono text-sm font-semibold">{row.designator}</span>
          {name !== row.designator ? <span className="block text-sm text-muted [overflow-wrap:anywhere]">{name}</span> : null}
        </button>
      </th>
      <td className="py-2 pe-4 text-sm">{t(row.role === "other" ? "board.roles.misc" : `board.roles.${row.role}`)}</td>
      <td className="py-2 pe-4 font-mono text-sm [overflow-wrap:anywhere]">{row.netName ?? row.netId ?? ""}</td>
      <td className="py-2 pe-4 font-mono text-sm [overflow-wrap:anywhere]">
        {row.connectedTo.length > 0 ? row.connectedTo.join(", ") : <span className="font-sans text-muted">{t("board.noneConnected")}</span>}
      </td>
      <td className="py-2 pe-4">{running ? <Level level={level} t={t} /> : null}</td>
      <td className="py-1 text-end">
        <IconButton size="sm" icon="link" label={`${row.designator}: ${t("board.wireThis")}`} onClick={() => onWireFrom({ c: board, p: row.pin })} />
      </td>
    </tr>
  );
});

function PinTable({ board, rows, nameOf, live, running, selectedNet, onSelectNet, onWireFrom, t, caption }: RowsProps & { caption: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-start">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col" className={HEAD}>{t("board.pin")}</th>
            <th scope="col" className={HEAD}>{t("board.role")}</th>
            <th scope="col" className={HEAD}>{t("board.net")}</th>
            <th scope="col" className={HEAD}>{t("board.connectedTo")}</th>
            <th scope="col" className={HEAD}>{t("board.state")}</th>
            <td aria-hidden className={HEAD} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <Row
              key={row.pin}
              board={board}
              row={row}
              name={nameOf?.(row, i) ?? row.name}
              level={live[row.pin]?.level}
              selected={row.netId !== undefined && row.netId === selectedNet}
              running={running}
              onSelectNet={onSelectNet}
              onWireFrom={onWireFrom}
              t={t}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The pins of a board as a table per connector, or per port on an FPGA board. It draws nothing on a canvas. */
export function PinMap({ model, live, running, selectedNet, onSelectNet, onWireFrom, messages, lang }: PinMapProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/studio`), [lang, messages]);
  const headingId = useId();
  const shared = { board: model.board, live, running, selectedNet, onSelectNet, onWireFrom, t };

  if (model.groups.length === 0) {
    return <EmptyState bordered icon="board" title={t("board.missing")} className="m-4" />;
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-6 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <h2 id={headingId} className="text-lg font-semibold">{model.refdes}</h2>
        {running ? null : <p className="text-sm text-muted">{t("board.notRunning")}</p>}
      </div>
      {model.kind === "ports"
        ? model.ports.map((port) => (
            <section key={port.port} aria-label={port.port} className="flex flex-col gap-2">
              <h3 className="flex flex-wrap items-baseline gap-x-2 text-base font-semibold">
                <span className="font-mono">{port.port}</span>
                <span className="text-sm font-normal text-muted">
                  {[t(`board.dir.${port.dir}`), t("board.bits", { count: port.width }), port.activeLow ? t("board.activeLow") : ""].filter(Boolean).join(", ")}
                </span>
              </h3>
              <PinTable {...shared} caption={port.port} rows={port.bits} nameOf={(_, i) => `${port.port}[${i}]`} />
            </section>
          ))
        : model.groups.map((group) => (
            <section key={group.connector} aria-label={group.connector || model.refdes} className="flex flex-col gap-2">
              {group.connector ? <h3 className="font-mono text-base font-semibold">{group.connector}</h3> : null}
              <PinTable {...shared} caption={group.connector || model.refdes} rows={group.rows} />
            </section>
          ))}
    </section>
  );
}
