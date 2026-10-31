"use client";

import { useState } from "react";
import { Button, Chip, Select, TextInput } from "@/components/ui";
import type { Diagnostic } from "@/core/result";
import type { DraftAction, PartDraft } from "@/studio/parts/draft";
import { SET_BY_YOU } from "@/studio/parts/templates";
import { NumberField } from "./NumberField";
import type { PartEditorT } from "./PinTable";

type Json = Record<string, unknown>;
type Slot = "manufacturer" | "simulation" | "measured";

const SLOTS: readonly Slot[] = ["manufacturer", "simulation", "measured"];
const isEditable = (slot: Slot): slot is "manufacturer" | "simulation" => slot === "manufacturer" || slot === "simulation";
const UNIT_OF = { voltage: "V", current: "A", power: "W", resistance: "ohm", time: "s", temperature: "degC", frequency: "Hz", ratio: "ratio" } as const;
const MEASURES = Object.keys(UNIT_OF) as (keyof typeof UNIT_OF)[];
const SOURCE_KINDS = [
  "datasheet", "application-note", "schematic", "product-page", "reseller-guide", "library", "photo", "measurement", "fact-sheet", "lesson", "standard", "own-estimate",
] as const;
const RELIABILITY = ["primary", "secondary", "unverified"] as const;

const object = (value: unknown): Json | undefined => (typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Json) : undefined);
const num = (value: unknown): number | undefined => (typeof value === "number" ? value : undefined);
const without = (o: Json, key: string): Json => Object.fromEntries(Object.entries(o).filter(([k]) => k !== key));
const english = (value: unknown): string => String(object(value)?.en ?? "");

const nextFree = (taken: ReadonlySet<string>, prefix: string): string => {
  let n = 1;
  while (taken.has(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
};

export interface RatingsFormProps {
  draft: PartDraft;
  dispatch: (a: DraftAction) => void;
  issues: Diagnostic[];
  t: PartEditorT;
}

export function RatingsForm({ draft, dispatch, issues, t }: RatingsFormProps) {
  const ratings = Object.entries(draft.ratings).flatMap(([key, value]) => {
    const rating = object(value);
    return rating ? [[key, rating] as const] : [];
  });
  const sources = draft.sources.flatMap((s) => {
    const source = object(s);
    return source ? [source] : [];
  });

  const setRatings = (next: Record<string, unknown>) => dispatch({ type: "setField", field: "ratings", value: next });
  const setRating = (key: string, rating: Json) => setRatings({ ...draft.ratings, [key]: rating });
  const setSources = (next: Json[]) => dispatch({ type: "setField", field: "sources", value: next });
  const problem = (path: string): string | undefined => issues.find((i) => i.severity === "error" && i.path === path)?.message;

  function addRating(measure: keyof typeof UNIT_OF) {
    const key = nextFree(new Set(Object.keys(draft.ratings)), `${measure}_`);
    setRating(key, {
      measure,
      role: "characteristic",
      scope: { part: true },
      simulation: { unit: UNIT_OF[measure], value: 0, rationale: { en: SET_BY_YOU }, confidence: "low" },
      used_by_model: "none",
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold">{t("ratings.heading")}</h3>
          <p className="text-sm text-muted">{t("ratings.hint")}</p>
        </div>
        {ratings.length === 0 ? <p className="text-base text-muted">{t("ratings.empty")}</p> : null}
        {ratings.map(([key, rating]) => (
          <RatingCard
            key={key}
            name={key}
            rating={rating}
            sources={sources}
            problem={problem}
            onChange={(next) => setRating(key, next)}
            onRemove={() => setRatings(Object.fromEntries(Object.entries(draft.ratings).filter(([k]) => k !== key)))}
            t={t}
          />
        ))}
        <AddRating onAdd={addRating} t={t} />
      </section>
      <SourcesEditor sources={sources} onChange={setSources} t={t} />
    </div>
  );
}

interface RatingCardProps {
  name: string;
  rating: Json;
  sources: Json[];
  problem: (path: string) => string | undefined;
  onChange: (rating: Json) => void;
  onRemove: () => void;
  t: PartEditorT;
}

function RatingCard({ name, rating, sources, problem, onChange, onRemove, t }: RatingCardProps) {
  const present = SLOTS.filter((slot) => object(rating[slot]) !== undefined);
  const used = rating.used_by_model;
  const at = `/ratings/${name}`;

  function setSlot(slot: Slot, next: Json | undefined) {
    const rest = without(rating, slot);
    const updated: Json = next ? { ...rest, [slot]: next } : rest;
    const stillThere = SLOTS.filter((s) => object(updated[s]) !== undefined);
    if (next === undefined && used === slot) updated.used_by_model = stillThere[0] ?? "none";
    onChange(updated);
  }

  function addSlot(slot: Slot) {
    const other = SLOTS.map((s) => object(rating[s])).find((s) => s !== undefined);
    const base = { unit: other?.unit ?? "1", value: num(other?.value) ?? 0 };
    setSlot(slot, slot === "simulation" ? { ...base, rationale: { en: SET_BY_YOU }, confidence: "low" } : base);
  }

  return (
    <article aria-label={name} className="flex flex-col gap-3 rounded-lg bg-sunken p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1">
          <TextInput
            label={<span className="font-mono">{name}</span>}
            hint={t("ratings.descriptionHint")}
            value={english(rating.description)}
            onChange={(e) => onChange({ ...rating, description: e.target.value === "" ? undefined : { en: e.target.value } })}
          />
        </div>
        <Button size="sm" variant="ghost" onClick={onRemove}>
          {t("ratings.remove", { key: name })}
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {SLOTS.map((slot) => {
          const quantity = object(rating[slot]);
          return (
            <fieldset key={slot} className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
              <legend className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold">
                {t(`ratings.slot.${slot}`)}
                {used === slot ? <Chip tone="info">{t("ratings.usedBy")}</Chip> : null}
              </legend>
              {quantity === undefined ? (
                isEditable(slot) ? (
                  <div>
                    <Button size="sm" variant="secondary" onClick={() => addSlot(slot)}>
                      {t(`ratings.add.${slot}`)}
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted">{t("ratings.measuredNote")}</p>
                )
              ) : (
                <SlotFields
                  slot={slot}
                  name={name}
                  quantity={quantity}
                  sources={sources}
                  error={problem(`${at}/${slot}`)}
                  onChange={(next) => setSlot(slot, next)}
                  t={t}
                />
              )}
            </fieldset>
          );
        })}
      </div>
      <div className="max-w-xs">
        <Select
          label={t("ratings.reads", { key: name })}
          value={typeof used === "string" ? used : "none"}
          onChange={(e) => onChange({ ...rating, used_by_model: e.target.value })}
        >
          {present.map((slot) => (
            <option key={slot} value={slot}>
              {t(`ratings.slot.${slot}`)}
            </option>
          ))}
          <option value="none">{t("ratings.readsNone")}</option>
        </Select>
      </div>
    </article>
  );
}

interface SlotFieldsProps {
  slot: Slot;
  name: string;
  quantity: Json;
  sources: Json[];
  error: string | undefined;
  onChange: (quantity: Json | undefined) => void;
  t: PartEditorT;
}

function SlotFields({ slot, name, quantity, sources, error, onChange, t }: SlotFieldsProps) {
  const unit = String(quantity.unit ?? "");
  const triple = ["min", "typ", "max"].some((k) => num(quantity[k]) !== undefined);
  const editable = isEditable(slot) && !triple;
  const sourceRef = object(quantity.source);
  const label = (what: "value" | "source" | "why") => t(`ratings.${what}`, { key: name, unit });
  const dash = (n: unknown) => (typeof n === "number" ? String(n) : "-");

  return (
    <>
      {editable ? (
        <NumberField label={label("value")} value={num(quantity.value)} error={slot === "manufacturer" && sourceRef === undefined ? undefined : error} onValue={(value) => onChange({ ...quantity, value })} />
      ) : (
        <p className="font-mono text-sm tabular-nums">
          {triple ? t("ratings.range", { min: dash(quantity.min), typ: dash(quantity.typ), max: dash(quantity.max), unit }) : `${dash(quantity.value)} ${unit}`}
        </p>
      )}
      {slot === "manufacturer" && editable ? (
        <Select
          label={label("source")}
          value={String(sourceRef?.src ?? "")}
          error={sourceRef === undefined ? t("ratings.needSource", { key: name }) : undefined}
          onChange={(e) => {
            const rest = without(quantity, "source");
            onChange(e.target.value === "" ? rest : { ...rest, source: { src: e.target.value } });
          }}
        >
          <option value="">{t("ratings.chooseSource")}</option>
          {sources.map((s) => (
            <option key={String(s.id)} value={String(s.id)}>
              {String(s.title ?? s.id)}
            </option>
          ))}
        </Select>
      ) : null}
      {slot === "simulation" && editable ? (
        <>
          <TextInput label={label("why")} value={english(quantity.rationale)} onChange={(e) => onChange({ ...quantity, rationale: { en: e.target.value } })} />
          <p className="text-sm text-muted">{t("ratings.confidence")}</p>
        </>
      ) : null}
      {isEditable(slot) ? (
        <div>
          <Button size="sm" variant="ghost" onClick={() => onChange(undefined)}>
            {t("ratings.removeSlot", { key: name, slot: t(`ratings.slot.${slot}`) })}
          </Button>
        </div>
      ) : null}
    </>
  );
}

function AddRating({ onAdd, t }: { onAdd: (measure: keyof typeof UNIT_OF) => void; t: PartEditorT }) {
  const [measure, setMeasure] = useState<keyof typeof UNIT_OF>("voltage");
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-48">
        <Select label={t("ratings.measure")} value={measure} onChange={(e) => setMeasure(e.target.value as keyof typeof UNIT_OF)}>
          {MEASURES.map((value) => (
            <option key={value} value={value}>
              {t(`ratings.measures.${value}`)}
            </option>
          ))}
        </Select>
      </div>
      <Button variant="secondary" onClick={() => onAdd(measure)}>
        {t("ratings.addRating")}
      </Button>
    </div>
  );
}

interface SourcesEditorProps {
  sources: Json[];
  onChange: (sources: Json[]) => void;
  t: PartEditorT;
}

function SourcesEditor({ sources, onChange, t }: SourcesEditorProps) {
  const setSource = (id: unknown, patch: Json) => onChange(sources.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  return (
    <section className="flex flex-col gap-4 border-t border-rule pt-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold">{t("ratings.sources.heading")}</h3>
        <p className="text-sm text-muted">{t("ratings.sources.hint")}</p>
      </div>
      {sources.length === 0 ? <p className="text-sm text-muted">{t("ratings.sources.empty")}</p> : null}
      {sources.map((source) => (
        <div key={String(source.id)} className="flex flex-col gap-3 rounded-lg bg-sunken p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextInput label={t("ratings.sources.title", { id: String(source.id) })} value={String(source.title ?? "")} onChange={(e) => setSource(source.id, { title: e.target.value })} />
            <TextInput
              label={t("ratings.sources.url", { id: String(source.id) })}
              value={String(source.url ?? "")}
              onChange={(e) => setSource(source.id, { url: e.target.value === "" ? undefined : e.target.value })}
              className="font-mono"
            />
            <Select label={t("ratings.sources.kind", { id: String(source.id) })} value={String(source.kind ?? "")} onChange={(e) => setSource(source.id, { kind: e.target.value })}>
              {SOURCE_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </Select>
            <Select
              label={t("ratings.sources.reliability", { id: String(source.id) })}
              value={String(source.reliability ?? "")}
              onChange={(e) => setSource(source.id, { reliability: e.target.value })}
            >
              {RELIABILITY.map((value) => (
                <option key={value} value={value}>
                  {t(`ratings.sources.levels.${value}`)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Button size="sm" variant="ghost" onClick={() => onChange(sources.filter((s) => s.id !== source.id))}>
              {t("ratings.sources.remove", { id: String(source.id) })}
            </Button>
          </div>
        </div>
      ))}
      <div>
        <Button
          variant="secondary"
          onClick={() =>
            onChange([
              ...sources,
              { id: nextFree(new Set(sources.map((s) => String(s.id))), "src"), kind: "datasheet", title: "", reliability: "primary" },
            ])
          }
        >
          {t("ratings.sources.add")}
        </Button>
      </div>
    </section>
  );
}
