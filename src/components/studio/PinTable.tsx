"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Button, Dialog, IconButton, Select, TextInput } from "@/components/ui";
import type { Diagnostic } from "@/core/result";
import type { Messages } from "@/i18n/namespaces";
import type { Translate } from "@/i18n/translate";
import { DRAFT_LIMITS } from "@/studio/parts/draft";
import type { DraftAction, DraftPin } from "@/studio/parts/draft";

export type PartEditorT = Translate<Messages["parteditor"]>;

export const PIN_TYPES: readonly DraftPin["type"][] = [
  "power_in", "power_out", "power_io", "ground", "digital_in", "digital_out", "digital_io", "open_drain",
  "analog_in", "analog_out", "passive", "mechanical", "nc",
];
export const PIN_CLASSES: readonly DraftPin["class"][] = ["power", "ground", "digital", "analog", "passive", "bus", "mechanical", "nc"];
export const POLARITIES = ["anode", "cathode", "positive", "negative"] as const;

const COLUMNS = ["id", "name", "designator", "type", "class", "polarity"] as const;

export interface PinTableProps {
  pins: DraftPin[];
  dispatch: (a: DraftAction) => void;
  issues: Diagnostic[];
  t: PartEditorT;
}

export function PinTable({ pins, dispatch, issues, t }: PinTableProps) {
  const [asking, setAsking] = useState<DraftPin | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const body = useRef<HTMLTableSectionElement>(null);
  const focusNewRow = useRef(false);

  useEffect(() => {
    if (!focusNewRow.current) return;
    focusNewRow.current = false;
    body.current?.querySelector<HTMLInputElement>("tr:last-child input")?.focus();
  }, [pins.length]);

  const full = pins.length >= DRAFT_LIMITS.pins;

  function add() {
    if (full) return;
    focusNewRow.current = true;
    dispatch({ type: "addPin" });
    setAnnouncement(t("pins.added", { count: pins.length + 1 }));
  }

  function remove(pin: DraftPin) {
    setAsking(null);
    dispatch({ type: "removePin", uid: pin.uid });
    setAnnouncement(t("pins.removed", { id: pin.id, count: pins.length - 1 }));
  }

  function onKeyDown(event: KeyboardEvent<HTMLTableRowElement>, last: boolean) {
    if (event.key !== "Enter" || !last || !(event.target instanceof HTMLInputElement)) return;
    event.preventDefault();
    add();
  }

  const problem = (index: number, field: string): string | undefined =>
    issues.find((i) => i.severity === "error" && i.path === `/pins/${index}/${field}`)?.message;

  return (
    <div className="flex flex-col gap-3">
      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {pins.length === 0 ? (
        <p className="text-base text-muted">{t("pins.empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr className="text-start text-muted">
                {COLUMNS.map((column) => (
                  <th key={column} scope="col" className="px-1 pb-1 text-start font-medium">
                    {t(`pins.col.${column}`)}
                  </th>
                ))}
                <td className="w-10" />
              </tr>
            </thead>
            <tbody ref={body}>
              {pins.map((pin, index) => {
                const name = (column: (typeof COLUMNS)[number]) => t("pins.cell", { n: index + 1, column: t(`pins.col.${column}`) });
                const set = (field: keyof DraftPin, value: unknown) => dispatch({ type: "setPinField", uid: pin.uid, field, value });
                return (
                  <tr key={pin.uid} onKeyDown={(event) => onKeyDown(event, index === pins.length - 1)} className="align-top">
                    <td className="px-1">
                      <TextInput label={name("id")} hideLabel value={pin.id} error={problem(index, "id")} onChange={(e) => set("id", e.target.value)} className="font-mono" />
                    </td>
                    <td className="px-1">
                      <TextInput label={name("name")} hideLabel value={pin.name} onChange={(e) => set("name", e.target.value)} />
                    </td>
                    <td className="px-1">
                      <TextInput
                        label={name("designator")}
                        hideLabel
                        value={pin.designator}
                        error={problem(index, "designator")}
                        onChange={(e) => set("designator", e.target.value)}
                      />
                    </td>
                    <td className="px-1">
                      <Select label={name("type")} hideLabel value={pin.type} onChange={(e) => set("type", e.target.value)}>
                        {PIN_TYPES.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-1">
                      <Select label={name("class")} hideLabel value={pin.class} onChange={(e) => set("class", e.target.value)}>
                        {PIN_CLASSES.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-1">
                      <Select
                        label={name("polarity")}
                        hideLabel
                        value={pin.polarity ?? ""}
                        onChange={(e) => set("polarity", e.target.value === "" ? undefined : e.target.value)}
                      >
                        <option value="">{t("pins.noPolarity")}</option>
                        {POLARITIES.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-1">
                      <IconButton label={t("pins.remove", { n: index + 1 })} icon="close" size="sm" onClick={() => setAsking(pin)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div>
        <Button variant="secondary" onClick={add} disabled={full}>
          {t("pins.add")}
        </Button>
      </div>
      <Dialog
        open={asking !== null}
        onClose={() => setAsking(null)}
        title={t("pins.removeTitle")}
        description={asking ? t("pins.removeBody", { id: asking.id }) : undefined}
        closeLabel={t("close")}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setAsking(null)}>
              {t("pins.removeKeep")}
            </Button>
            <Button variant="danger" onClick={() => asking && remove(asking)}>
              {t("pins.removeConfirm")}
            </Button>
          </>
        }
      />
    </div>
  );
}
