"use client";

import { useId, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import { Chip, EmptyState, Icon, TextInput, cx } from "@/components/ui";
import type { Messages } from "@/i18n/namespaces";
import type { Translate } from "@/i18n/translate";
import type { Descriptor } from "@/parts/descriptor";
import type { Role } from "@/parts/mechanics";
import { listParts } from "@/studio/drone/picker";
import type { PickerContext, PickerFlag, PickerItem } from "@/studio/drone/picker";

export type DroneBuildT = Translate<Messages["dronebuild"]>;

export interface PartPickerProps {
  role: Role;
  ctx: Omit<PickerContext, "query">;
  lib: readonly Descriptor[];
  value: string | null;
  onPick(id: string): void;
  t: DroneBuildT;
}

function flagText(flag: PickerFlag, t: DroneBuildT): string {
  switch (flag.kind) {
    case "cells-over-motor":
      return t("picker.flag.cellsOverMotor", { max: flag.max });
    case "prop-over-frame":
      return t("picker.flag.propOverFrame", { maxIn: flag.maxIn });
    case "esc-volts":
      return t("picker.flag.escVolts", { max: flag.max });
    case "missing":
      return t("picker.flag.missing", { path: flag.path });
  }
}

function priceText(price: NonNullable<PickerItem["price"]>, t: DroneBuildT): string {
  const params = { amount: price.amount, currency: price.currency, date: price.asOf };
  return t(price.estimate ? "picker.priceEstimate" : "picker.price", params);
}

export function PartPicker({ role, ctx, lib, value, onPick, t }: PartPickerProps) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const { cells, frame } = ctx;

  const hasParts = useMemo(() => listParts(role, lib, { cells, frame }).length > 0, [role, lib, cells, frame]);
  const items = useMemo(() => listParts(role, lib, { cells, frame, query }), [role, lib, cells, frame, query]);
  const active = items.find((i) => i.id === cursor) ?? items.find((i) => i.id === value) ?? items[0];
  const optionId = (item: PickerItem) => `${listId}-${item.id}`;

  function onKeyDown(ev: KeyboardEvent<HTMLInputElement>) {
    if (items.length === 0) return;
    const at = active ? items.indexOf(active) : 0;
    const jump = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: items.length - 1 }[ev.key];
    if (jump !== undefined) {
      ev.preventDefault();
      setCursor(items[Math.min(items.length - 1, Math.max(0, jump))]!.id);
    } else if (ev.key === "Enter" && active) {
      ev.preventDefault();
      onPick(active.id);
    }
  }

  if (!hasParts) {
    return <EmptyState icon="empty" title={t("picker.empty.title")}>{t("picker.empty.body")}</EmptyState>;
  }

  return (
    <div className="flex flex-col gap-3">
      <TextInput
        type="search"
        label={t("picker.search", { role: t(`picker.role.${role}`) })}
        hideLabel
        placeholder={t("picker.search", { role: t(`picker.role.${role}`) })}
        value={query}
        onChange={(ev) => {
          setQuery(ev.target.value);
          setCursor(null);
        }}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded="true"
        aria-controls={listId}
        aria-activedescendant={active ? optionId(active) : undefined}
        autoComplete="off"
        spellCheck={false}
      />
      <p role="status" className="sr-only">
        {t("picker.results", { count: items.length })}
      </p>
      {items.length === 0 ? (
        <EmptyState icon="search" title={t("picker.none", { query: query.trim() })} className="py-8" />
      ) : (
        <div id={listId} role="listbox" aria-label={t("picker.list", { role: t(`picker.role.${role}`) })} className="flex max-h-96 flex-col gap-2 overflow-y-auto">
          {items.map((item) => (
            <div
              key={item.id}
              id={optionId(item)}
              role="option"
              aria-selected={item.id === value}
              onClick={() => onPick(item.id)}
              className={cx(
                "flex min-h-11 cursor-pointer flex-col gap-1 rounded-lg px-3 py-2 text-sm motion-fade hover:bg-hover",
                item.id === value && "bg-sunken",
                item === active && "ring-2 ring-accent",
              )}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="font-semibold">{item.label}</span>
                {item.id === value ? <Icon name="check" size={16} className="shrink-0 text-accent" /> : null}
              </span>
              {item.flags.length > 0 ? (
                <span className="flex flex-wrap gap-2">
                  {item.flags.map((flag) => (
                    <Chip key={`${flag.kind}-${flag.kind === "missing" ? flag.path : ""}`} tone="warn">
                      <Icon name="warn" size={16} />
                      {flagText(flag, t)}
                    </Chip>
                  ))}
                </span>
              ) : null}
              {item.price ? <span className="text-xs tabular text-muted">{priceText(item.price, t)}</span> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
