"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, InlineStatus, Select, TextInput } from "@/components/ui";
import { makeModelEnv, resolveLayers } from "@/sim/models/kinds";
import { toDescriptor } from "@/studio/parts/draft";
import type { DraftAction, PartDraft, TemplateId } from "@/studio/parts/draft";
import { SENSOR_UNITS, applyTemplate, availableTemplates, paramsFrom, templateProblems } from "@/studio/parts/templates";
import type { ParamProblem, TemplateChoice, TemplateParams } from "@/studio/parts/templates";
import { NumberField } from "./NumberField";
import type { PartEditorT } from "./PinTable";
import { TruthTableEditor } from "./TruthTableEditor";

const ENV = makeModelEnv();
const SHADOW_DEBOUNCE_MS = 250;

export interface ModelFormProps {
  draft: PartDraft;
  dispatch: (a: DraftAction) => void;
  t: PartEditorT;
}

const milli = (amps: number): number => Number((amps * 1000).toPrecision(12));
const shown = (n: number): number | undefined => (Number.isNaN(n) ? undefined : n);
const orNaN = (n: number | undefined): number => n ?? Number.NaN;

function shadowedRows(draft: PartDraft, choice: TemplateChoice): number[] {
  const def = toDescriptor({ ...draft, ...applyTemplate(draft, choice), mode: "form" });
  const layer = resolveLayers(def, {}, ENV).layers.find((l) => l.kind === "logic");
  return layer?.kind === "logic" ? layer.model.warnings.flatMap((w) => w.shadowedRows) : [];
}

export function ModelForm({ draft, dispatch, t }: ModelFormProps) {
  const [id, setId] = useState<TemplateId | "">(draft.template?.id ?? "");
  const [params, setParams] = useState<TemplateParams>(() => paramsFrom(draft.template));
  const [shadowed, setShadowed] = useState<number[]>([]);
  const templates = useMemo(() => availableTemplates(ENV), []);

  const choice = id === "" ? undefined : ({ id, params: params[id] } as TemplateChoice);
  const problems = choice ? templateProblems(draft, choice) : [];
  const table = params["truth-table"];

  useEffect(() => {
    if (id !== "truth-table") return;
    const timer = setTimeout(() => setShadowed(shadowedRows(draft, { id, params: table })), SHADOW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [id, draft, table]);

  const set = <K extends TemplateId>(key: K, patch: Partial<TemplateParams[K]>) => setParams((p) => ({ ...p, [key]: { ...p[key], ...patch } }));
  const rangeError = (field: string): string | undefined => {
    const hit = problems.find((p): p is Extract<ParamProblem, { code: "range" }> => p.code === "range" && p.field === field);
    return hit && t("model.problems.range", { min: hit.min, max: hit.max });
  };
  const pinToggle = (list: string[], pin: string, on: boolean) => (on ? draft.pins.map((p) => p.id).filter((p) => p === pin || list.includes(p)) : list.filter((p) => p !== pin));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold">{t("model.heading")}</h3>
        <p className="text-sm text-muted">{t("model.hint")}</p>
        <p className="text-sm text-muted">{t("model.sequentialNote")}</p>
      </div>
      <div className="max-w-sm">
        <Select label={t("model.template")} value={id} onChange={(e) => setId(e.target.value as TemplateId | "")}>
          <option value="">{t("model.choose")}</option>
          {templates.map((value) => (
            <option key={value} value={value}>
              {t(`model.names.${value}`)}
            </option>
          ))}
        </Select>
      </div>
      {draft.template ? <InlineStatus tone="info" live>{t("model.current", { name: t(`model.names.${draft.template.id}`) })}</InlineStatus> : null}

      {id === "resistor-like" ? (
        <div className="max-w-xs">
          <NumberField label={t("model.fields.ohms")} value={shown(params[id].ohms)} error={rangeError("ohms")} onValue={(v) => set(id, { ohms: orNaN(v) })} />
        </div>
      ) : null}
      {id === "switch" ? (
        <label className="flex items-center gap-2 text-base">
          <input type="checkbox" checked={params[id].momentary} onChange={(e) => set(id, { momentary: e.target.checked })} />
          {t("model.fields.momentary")}
        </label>
      ) : null}
      {id === "led-like" ? (
        <div className="grid max-w-xl gap-4 sm:grid-cols-2">
          <NumberField label={t("model.fields.vf")} value={shown(params[id].vf)} error={rangeError("vf")} onValue={(v) => set(id, { vf: orNaN(v) })} />
          <NumberField
            label={t("model.fields.imax")}
            value={shown(milli(params[id].imaxA))}
            error={rangeError("imaxA")}
            onValue={(v) => set(id, { imaxA: v === undefined ? Number.NaN : v / 1000 })}
          />
        </div>
      ) : null}
      {id === "analog-sensor" ? (
        <div className="grid max-w-xl gap-4 sm:grid-cols-3">
          <Select label={t("model.fields.unit")} value={params[id].channelUnit} onChange={(e) => set(id, { channelUnit: e.target.value as TemplateParams[typeof id]["channelUnit"] })}>
            {SENSOR_UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </Select>
          <NumberField label={t("model.fields.min")} value={shown(params[id].min)} error={rangeError("min")} onValue={(v) => set(id, { min: orNaN(v) })} />
          <NumberField label={t("model.fields.max")} value={shown(params[id].max)} error={rangeError("max")} onValue={(v) => set(id, { max: orNaN(v) })} />
        </div>
      ) : null}
      {id === "not-modelled" ? (
        <TextInput label={t("model.fields.reason")} value={params[id].reason} onChange={(e) => set(id, { reason: e.target.value })} />
      ) : null}
      {id === "truth-table" ? (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {(["inputs", "outputs"] as const).map((side) => (
              <fieldset key={side} className="m-0 flex flex-wrap gap-x-4 gap-y-2 border-0 p-0">
                <legend className="field-label mb-1">{t(`model.fields.${side}`)}</legend>
                {draft.pins.map((pin) => (
                  <label key={pin.uid} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={table[side].includes(pin.id)} onChange={(e) => set(id, { [side]: pinToggle(table[side], pin.id, e.target.checked) })} />
                    <span className="font-mono">{pin.id}</span>
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
          <div className="grid max-w-xl gap-4 sm:grid-cols-2">
            <NumberField label={t("model.fields.delay")} value={shown(table.delayNs)} error={rangeError("delayNs")} onValue={(v) => set(id, { delayNs: orNaN(v) })} />
            <NumberField label={t("model.fields.drive")} value={shown(table.driveOhms)} error={rangeError("driveOhms")} onValue={(v) => set(id, { driveOhms: orNaN(v) })} />
          </div>
          <TruthTableEditor inputs={table.inputs} outputs={table.outputs} rows={table.rows} warnings={shadowed} onChange={(rows) => set(id, { rows })} t={t} />
        </div>
      ) : null}

      {problems.filter((p) => p.code !== "range").map((p, index) => (
        <InlineStatus key={index} tone="bad">
          {problemText(p, t)}
        </InlineStatus>
      ))}

      {choice ? (
        <div className="flex flex-col gap-2">
          <div>
            <Button variant="primary" disabled={problems.length > 0} onClick={() => dispatch({ type: "applyPatch", patch: applyTemplate(draft, choice) })}>
              {t("model.apply")}
            </Button>
          </div>
          <p className="text-sm text-muted">{t("model.replaces")}</p>
        </div>
      ) : null}
    </div>
  );
}

function problemText(p: ParamProblem, t: PartEditorT): string {
  switch (p.code) {
    case "pins":
      return t("model.problems.pins", { need: p.need });
    case "empty":
      return t(`model.problems.empty.${p.field}`);
    case "tooMany":
      return t(`model.problems.tooMany.${p.field}`, { max: p.max });
    case "overlap":
      return t("model.problems.overlap");
    case "order":
      return t("model.problems.order");
    case "reason":
      return t("model.problems.reason");
    case "range":
      return t("model.problems.range", { min: p.min, max: p.max });
  }
}
