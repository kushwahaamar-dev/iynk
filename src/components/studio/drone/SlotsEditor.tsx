"use client";

import { useRef, useState } from "react";
import { Callout, EmptyState, Popover, Toggle, buttonClass } from "@/components/ui";
import type { Descriptor } from "@/parts/descriptor";
import { roleOf, type Role } from "@/parts/mechanics";
import { setBatteryPatch, setControllerPatch, slotPatch, type MotorSlot } from "@/project/domains/drone-ops";
import type { Op, Project } from "@/project/generated/types";
import { sameForAllPatch } from "@/studio/drone/layout";
import type { Build } from "@/sim/flight/build";
import type { PickerContext } from "@/studio/drone/picker";
import { PartPicker, type DroneBuildT } from "./PartPicker";

export interface SlotsEditorProps {
  build: Build;
  project: Project;
  lib: readonly Descriptor[];
  readOnly: boolean;
  onChange(ops: Op[], label: string): void;
  t: DroneBuildT;
}

type SlotRole = "motor" | "prop" | "esc";
type Pickable = SlotRole | "battery" | "fc";

const SLOT_ROLES: readonly SlotRole[] = ["motor", "prop", "esc"];
const MIN_SLOTS = 3;
const MAX_SLOTS = 12;
const LABEL = "drone.pick";
const TAG: Record<Pickable, string> = { motor: "M", prop: "P", esc: "ESC", battery: "BAT", fc: "FC" };

/** The project's instance of this exact part, or the op that adds one. */
function instanceFor(project: Project, role: Pickable, part: Descriptor): { id: string; add: Op[] } {
  const pool = role === "fc" ? project.boards : project.components;
  const found = pool.find((c) => c.definition.ref === part.id && c.definition.version === part.version);
  if (found) return { id: found.id, add: [] };

  const taken = new Set([...project.components, ...project.boards].flatMap((c) => [c.id, c.refdes]));
  let n = 1;
  while (taken.has(`${TAG[role]}${n}`) || taken.has(`${role === "fc" ? "brd" : "cmp"}_${role}${n}`)) n++;
  const instance = { id: `${role === "fc" ? "brd" : "cmp"}_${role}${n}`, definition: { ref: part.id, version: part.version }, refdes: `${TAG[role]}${n}` };
  return { id: instance.id, add: [role === "fc" ? { k: "board.add", board: instance } : { k: "component.add", component: instance }] };
}

const partOf = (project: Project, instanceId: string | undefined): string | undefined =>
  [...project.components, ...project.boards].find((c) => c.id === instanceId)?.definition.ref;

interface PickerCellProps {
  label: string;
  shown: string;
  disabled: boolean;
  role: Pickable;
  lib: readonly Descriptor[];
  ctx: Omit<PickerContext, "query">;
  value: string | null;
  onPick(part: Descriptor): void;
  t: DroneBuildT;
}

function PickerCell({ label, shown, disabled, role, lib, ctx, value, onPick, t }: PickerCellProps) {
  const body = useRef<HTMLDivElement>(null);
  return (
    <Popover
      label={label}
      align="start"
      trigger={
        <button type="button" disabled={disabled} aria-label={label} className={buttonClass("secondary", "sm", "max-w-48")}>
          <span className="truncate">{shown}</span>
        </button>
      }
    >
      <div ref={body}>
        <PartPicker
          role={role}
          ctx={ctx}
          lib={lib}
          value={value}
          t={t}
          onPick={(id) => {
            const part = lib.find((d) => d.id === id);
            if (part) onPick(part);
            body.current?.closest<HTMLElement>("[popover]")?.hidePopover();
          }}
        />
      </div>
    </Popover>
  );
}

export function SlotsEditor({ build, project, lib, readOnly, onChange, t }: SlotsEditorProps) {
  const [same, setSame] = useState(true);
  const [refusal, setRefusal] = useState<string | null>(null);
  const data = project.domains?.drone?.data;
  const slots = data?.motors ?? [];
  const blocked = readOnly || slots.length < MIN_SLOTS || slots.length > MAX_SLOTS;
  const ctx = { cells: build.pack?.cells, frame: build.frame };

  function pick(role: Pickable, part: Descriptor, slot?: MotorSlot) {
    if (!data) return;
    if (roleOf(part) !== role) {
      setRefusal(t("slots.refused", { part: part.identity.model, role: t(`slots.kind.${role}`) }));
      return;
    }
    setRefusal(null);
    const { id, add } = instanceFor(project, role, part);
    let patch: Op;
    if (role === "battery") patch = setBatteryPatch(id);
    else if (role === "fc") patch = setControllerPatch(id);
    else if (same || !slot) patch = sameForAllPatch(data, { [role]: id });
    else patch = slotPatch(data, { ...slot, [role]: id });
    onChange([...add, patch], LABEL);
  }

  function picker(role: Pickable, instanceId: string | undefined, name: string, disabled: boolean, slot?: MotorSlot) {
    const ref = partOf(project, instanceId);
    const model = lib.find((d) => d.id === ref)?.identity.model ?? ref ?? null;
    const shown = model ?? t("slots.choose");
    const label = t("slots.trigger", { role: t(`slots.kind.${role}`), slot: name, part: shown });
    const onPick = (part: Descriptor) => pick(role, part, slot);
    return <PickerCell label={label} shown={shown} disabled={disabled} role={role} lib={lib} ctx={ctx} value={ref ?? null} onPick={onPick} t={t} />;
  }

  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-base font-semibold">{t("slots.title")}</h3>
      <Toggle checked={same} onChange={setSame} label={t("slots.sameForAll")} description={t("slots.sameForAllHint")} disabled={readOnly} />
      {slots.length === 0 ? (
        <EmptyState icon="empty" title={t("slots.empty")} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">{t("slots.title")}</caption>
            <thead>
              <tr className="text-start text-muted">
                <th scope="col" className="py-2 pe-3 text-start font-semibold">{t("slots.col.slot")}</th>
                {SLOT_ROLES.map((role) => (
                  <th key={role} scope="col" className="px-2 py-2 text-start font-semibold">
                    {t(`slots.col.${role}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((slot) => (
                <tr key={slot.id}>
                  <th scope="row" className="py-1 pe-3 text-start font-semibold tabular">{slot.id}</th>
                  {SLOT_ROLES.map((role) => (
                    <td key={role} className="px-2 py-1">
                      {picker(role, slot[role], slot.id, blocked, slot)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {slots.length > 0 && (slots.length < MIN_SLOTS || slots.length > MAX_SLOTS) ? (
        <Callout tone="warn" live>{t("slots.count", { count: slots.length })}</Callout>
      ) : null}
      {refusal ? <Callout tone="danger" live>{refusal}</Callout> : null}
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold">{t("slots.shared.title")}</h4>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted">{t("slots.shared.battery")}</span>
          {picker("battery", data?.battery, t("slots.shared.battery"), readOnly)}
          <span className="text-sm text-muted">{t("slots.shared.fc")}</span>
          {picker("fc", data?.controller, t("slots.shared.fc"), readOnly)}
        </div>
      </div>
    </section>
  );
}
