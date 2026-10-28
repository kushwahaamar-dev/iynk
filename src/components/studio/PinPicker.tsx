"use client";

import { useId, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import { Dialog, EmptyState, TextInput, cx } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import type { Project as ProjectState } from "@/project/generated/types";
import { canConnect, endLabel, sameEnd } from "@/studio/rules/connect";
import type { Access, Refusal, WireEndRef } from "@/studio/rules/connect";
import { pinEntries } from "@/studio/tools/keyboard";
import type { PinEntry } from "@/studio/tools/keyboard";

export interface PinPickerProps {
  /** The end the wire starts at; null while the person is still choosing it. */
  from: WireEndRef | null;
  state: ProjectState;
  viewId: string;
  access?: Access;
  onPick(end: WireEndRef): void;
  onCancel(): void;
  messages: Messages["studioWire"];
  lang: Locale;
}

type Row = { entry: PinEntry; text: string; detail: string; refusal: { code: Refusal; args: Record<string, string> } | null };

/** Pins this close to the first end are listed first. */
export const NEARBY_MM = 20;

const haystack = (entry: PinEntry, polarity: string): string =>
  [entry.part, entry.pin, entry.end.p, polarity, entry.net?.name ?? ""].join(" ").toLowerCase();

/** Every word the person typed has to appear somewhere in the part and pin names, in any order. */
const matchesQuery = (text: string, query: string): boolean => query.toLowerCase().split(/\s+/).filter(Boolean).every((word) => text.includes(word));

export function PinPicker({ from, state, viewId, access = "edit", onPick, onCancel, messages, lang }: PinPickerProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/studioWire`), [lang, messages]);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [refused, setRefused] = useState<string | null>(null);

  const rows = useMemo(() => {
    const origin = from?.kind === "pin" ? pinEntries(state, viewId).find((e) => sameEnd(e.end, from))?.at : undefined;
    const make = (entry: PinEntry): Row => {
      const polarity = entry.polarity ? t(`pin.polarity.${entry.polarity}`) : "";
      const verdict = from === null ? ({ ok: true } as const) : canConnect(state, viewId, from, entry.end, access);
      const refusal = verdict.ok ? null : { code: verdict.code, args: verdict.args };
      const others = entry.others.join(", ");
      const link = entry.net === null ? t("pin.unconnected") : entry.moreOthers > 0 ? t("pin.connectedMore", { others, more: entry.moreOthers }) : t("pin.connected", { others: others || entry.net.id });
      return {
        entry,
        text: `${entry.part} ${polarity || entry.pin}`,
        detail: entry.net?.name ? `${link}, ${t("pinPicker.net", { name: entry.net.name })}` : link,
        refusal,
      };
    };
    const all = pinEntries(state, viewId).filter((e) => from === null || !sameEnd(e.end, from));
    const wanted = all.filter((e) => matchesQuery(haystack(e, e.polarity ? t(`pin.polarity.${e.polarity}`) : ""), query));
    const near = (e: PinEntry) => origin != null && e.at !== null && Math.hypot(e.at.x - origin.x, e.at.y - origin.y) <= NEARBY_MM;
    return { nearby: wanted.filter(near).map(make), rest: wanted.filter((e) => !near(e)).map(make) };
  }, [state, viewId, from, access, query, t]);

  const ordered = [...rows.nearby, ...rows.rest];
  const keyOf = (row: Row) => `${row.entry.end.c}/${row.entry.end.p}`;
  const active = ordered.find((r) => keyOf(r) === picked) ?? ordered.find((r) => r.refusal === null) ?? ordered[0];

  function choose(row: Row) {
    if (row.refusal === null) onPick(row.entry.end);
    else setRefused(t(`wire.refuse.${row.refusal!.code}`, row.refusal!.args));
  }

  function onKeyDown(ev: KeyboardEvent<HTMLInputElement>) {
    if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
      ev.preventDefault();
      const at = ordered.findIndex((r) => r === active);
      const next = ordered[Math.min(ordered.length - 1, Math.max(0, at + (ev.key === "ArrowDown" ? 1 : -1)))];
      if (next) setPicked(keyOf(next));
      setRefused(null);
    } else if (ev.key === "Enter" && active) {
      ev.preventDefault();
      choose(active);
    }
  }

  const option = (row: Row) => {
    const id = `${listId}-${keyOf(row)}`;
    const reason = row.refusal ? t(`wire.refuse.${row.refusal.code}`, row.refusal.args) : null;
    return (
      <div
        key={id}
        id={id}
        role="option"
        aria-selected={row === active}
        aria-disabled={reason !== null || undefined}
        onClick={() => choose(row)}
        className={cx(
          "flex min-h-11 cursor-pointer flex-col justify-center rounded-lg px-3 py-2 text-sm motion-fade hover:bg-hover",
          row === active && "bg-sunken ring-2 ring-accent",
          reason !== null && "cursor-not-allowed text-muted",
        )}
      >
        <span className="font-semibold">{row.text}</span>
        <span className="text-xs text-muted">{reason ?? row.detail}</span>
      </div>
    );
  };

  const group = (label: string, list: Row[]) =>
    list.length === 0 ? null : (
      <div role="group" aria-label={label} className="flex flex-col">
        <span aria-hidden="true" className="px-3 pb-1 pt-2 text-xs font-semibold text-muted">
          {label}
        </span>
        {list.map(option)}
      </div>
    );

  return (
    <Dialog
      open
      onClose={onCancel}
      closeLabel={t("pinPicker.close")}
      title={from === null ? t("pinPicker.fromTitle") : t("pinPicker.toTitle", { from: endLabel(state, from) })}
      description={t("pinPicker.searchHint")}
      size="sm"
    >
      <div className="flex flex-col gap-3">
        <TextInput
          data-autofocus
          type="search"
          label={t("pinPicker.search")}
          hideLabel
          placeholder={t("pinPicker.search")}
          value={query}
          onChange={(ev) => {
            setQuery(ev.target.value);
            setPicked(null);
            setRefused(null);
          }}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={active ? `${listId}-${keyOf(active)}` : undefined}
          autoComplete="off"
          spellCheck={false}
        />
        <p role="status" className="sr-only">
          {t("pinPicker.results", { count: ordered.length })}
        </p>
        {refused ? (
          <p role="alert" className="rounded-lg bg-warn-bg p-3 text-sm text-pretty">
            {refused}
          </p>
        ) : null}
        {ordered.length === 0 ? (
          <EmptyState icon="search" title={t("pinPicker.none", { query: query.trim() })} className="py-8" />
        ) : (
          <div id={listId} role="listbox" aria-label={t("pinPicker.search")} className="flex max-h-80 flex-col overflow-y-auto">
            {group(t("pinPicker.nearby"), rows.nearby)}
            {group(t("pinPicker.all"), rows.rest)}
          </div>
        )}
      </div>
    </Dialog>
  );
}
