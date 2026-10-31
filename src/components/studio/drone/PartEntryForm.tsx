"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Button, Callout, InlineStatus, SegmentedControl, Select, TextArea, TextInput, Toggle } from "@/components/ui";
import type { Messages } from "@/i18n/namespaces";
import type { Translate } from "@/i18n/translate";
import { logError } from "@/lib/telemetry";
import { digestOf } from "@/parts/descriptor";
import { getPartLibrary } from "@/parts/browser/library";
import type { PartLibrary } from "@/parts/browser/library";
import { MAX_ROWS, PROTOCOLS, entryToDescriptors, parseRows, slugOf } from "@/studio/drone/entry";
import type { EntryResult, PartEntry, PartIssue, RowError, SourceEntry } from "@/studio/drone/entry";

export type DronePartsT = Translate<Messages["droneparts"]>;

export interface PartEntryFormProps {
  onSaved(ids: string[]): void;
  t: DronePartsT;
}

type Kind = "motor" | "pack" | "esc";

const DEBOUNCE_MS = 150;
const PERCENT = 100;
const CHEMISTRIES = ["lipo", "lihv", "liion"] as const;
const SOURCE_KINDS = ["manufacturer-datasheet", "own-measurement", "community"] as const;

const BLANK = {
  motorName: "", kv: "", r: "", i0: "", vMax: "", iMax: "", motorMass: "",
  propName: "", diameter: "", pitch: "", blades: "2", propMass: "",
  rowsText: "",
  escName: "", escCurrent: "", escBurst: "", escChannels: "4", protocol: "dshot600", efficiency: "", escVMax: "", escMass: "",
  packName: "", cells: "", parallel: "", capacity: "", c: "", rCell: "", chemistry: "lipo", packMass: "",
  srcTitle: "", srcUrl: "", srcKind: "manufacturer-datasheet", srcNote: "",
  license: "", version: "",
};

type Fields = typeof BLANK;
type FieldKey = keyof Fields;

interface Draft {
  kind: Kind;
  withProp: boolean;
  fields: Fields;
}

const FIELD_OF_PATH: Readonly<Record<string, FieldKey>> = {
  "/mechanics/motor/kv_rpm_per_v": "kv",
  "/mechanics/motor/r_ohm": "r",
  "/mechanics/motor/i_noload_a": "i0",
  "/mechanics/motor/v_max": "vMax",
  "/mechanics/motor/i_max_a": "iMax",
  "/mechanics/motor/mass_g": "motorMass",
  "/mechanics/prop/diameter_mm": "diameter",
  "/mechanics/prop/pitch_mm": "pitch",
  "/mechanics/prop/blades": "blades",
  "/mechanics/prop/mass_g": "propMass",
  "/mechanics/esc/i_cont_a": "escCurrent",
  "/mechanics/esc/i_burst_a": "escBurst",
  "/mechanics/esc/channels": "escChannels",
  "/mechanics/esc/protocol": "protocol",
  "/mechanics/esc/efficiency": "efficiency",
  "/mechanics/esc/v_max": "escVMax",
  "/mechanics/esc/mass_g": "escMass",
  "/mechanics/battery/cells": "cells",
  "/mechanics/battery/parallel": "parallel",
  "/mechanics/battery/capacity_mah": "capacity",
  "/mechanics/battery/c_continuous": "c",
  "/mechanics/battery/r_cell_ohm": "rCell",
  "/mechanics/battery/mass_g": "packMass",
  "/sources/0/title": "srcTitle",
  "/sources/0/url": "srcUrl",
  "/provenance/license": "license",
  "/version": "version",
};

const NAME_OF_ROLE: Readonly<Record<string, FieldKey>> = { motor: "motorName", prop: "propName", esc: "escName", battery: "packName" };

const number = (s: string): number => (s.trim() === "" ? NaN : Number(s.trim().replace(",", ".")));
const optional = (s: string): number | undefined => (s.trim() === "" ? undefined : number(s));
const text = (s: string): string | undefined => (s.trim() === "" ? undefined : s.trim());

function buildEntry({ kind, withProp, fields: f }: Draft, rows: PartEntry["rows"]): PartEntry {
  const source: SourceEntry = { title: f.srcTitle, url: text(f.srcUrl), kind: f.srcKind as SourceEntry["kind"], note: text(f.srcNote) };
  const common = { source, license: text(f.license), version: text(f.version) };
  if (kind === "esc") {
    return { ...common, esc: { name: f.escName, i_cont_a: number(f.escCurrent), i_burst_a: optional(f.escBurst), channels: number(f.escChannels), protocol: f.protocol, efficiency: optional(f.efficiency), v_max: optional(f.escVMax), mass_g: number(f.escMass) } };
  }
  if (kind === "pack") {
    return { ...common, pack: { name: f.packName, cells: number(f.cells), parallel: optional(f.parallel), capacity_mah: number(f.capacity), c_continuous: optional(f.c), r_cell_mohm: optional(f.rCell), chemistry: f.chemistry as (typeof CHEMISTRIES)[number], mass_g: number(f.packMass) } };
  }
  return {
    ...common,
    motor: { name: f.motorName, kv_rpm_per_v: number(f.kv), r_ohm: number(f.r), i_noload_a: number(f.i0), v_max: optional(f.vMax), i_max_a: optional(f.iMax), mass_g: number(f.motorMass) },
    prop: withProp ? { name: f.propName, diameter_in: number(f.diameter), pitch_in: number(f.pitch), blades: number(f.blades), mass_g: number(f.propMass) } : undefined,
    rows,
  };
}

function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
}

function rowErrorText(error: RowError, t: DronePartsT): string {
  switch (error.kind) {
    case "tooMany":
      return t("rows.error.tooMany", { count: error.count, max: MAX_ROWS });
    case "columns":
      return t("rows.error.columns", { line: error.line });
    case "notNumber":
      return t("rows.error.notNumber", { line: error.line });
  }
}

function issueText(issue: PartIssue, t: DronePartsT): string {
  switch (issue.code) {
    case "P-ENTRY-NUMBER":
      return t("issues.number");
    case "P-ENTRY-NAME":
      return t("issues.name");
    case "P-ENTRY-DUPLICATE":
      return t("issues.duplicate");
    case "P-ENTRY-SOURCE":
      return t("issues.source");
    default:
      return issue.message;
  }
}

const percent = (band: number): string => (band * PERCENT).toFixed(1);

const formatted = (n: number): string => String(Number(n.toPrecision(4)));

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-base font-semibold text-balance">{title}</h3>
      {children}
    </section>
  );
}

const grid = "grid gap-3 sm:grid-cols-2";

export function PartEntryForm({ onSaved, t }: PartEntryFormProps) {
  const [draft, setDraft] = useState<Draft>({ kind: "motor", withProp: false, fields: BLANK });
  const [touched, setTouched] = useState(false);
  const [library, setLibrary] = useState<PartLibrary | null>(null);
  const [status, setStatus] = useState<{ kind: "idle" } | { kind: "saving" } | { kind: "saved"; names: string } | { kind: "conflict" } | { kind: "failed" }>({ kind: "idle" });

  useEffect(() => {
    let live = true;
    void getPartLibrary().then((l) => {
      if (live) setLibrary(l);
    });
    return () => {
      live = false;
    };
  }, []);

  const settled = useDebounced(draft, DEBOUNCE_MS);
  const parsed = useMemo(() => parseRows(settled.fields.rowsText), [settled.fields.rowsText]);
  const result = useMemo<EntryResult>(() => entryToDescriptors(buildEntry(settled, parsed.rows)), [settled, parsed.rows]);

  const { fields } = draft;
  const errors = result.issues.filter((i) => i.severity === "error");
  const blocked = errors.length + (settled.withProp && settled.kind === "motor" ? parsed.errors.length : 0);
  const ready = settled === draft && blocked === 0 && result.descriptors.length > 0 && library !== null && status.kind !== "saving";

  function edit(key: FieldKey, value: string) {
    setTouched(true);
    setStatus({ kind: "idle" });
    setDraft((d) => ({ ...d, fields: { ...d.fields, [key]: value } }));
  }

  const nameFieldOf = (issue: PartIssue): FieldKey | undefined => {
    const byRole = NAME_OF_ROLE[issue.part];
    if (byRole) return byRole;
    const names: FieldKey[] = ["motorName", "propName", "escName", "packName"];
    return names.find((k) => `local.${slugOf(settled.fields[k])}` === issue.part);
  };

  const fieldErrors = new Map<FieldKey, string>();
  const loose: PartIssue[] = [];
  for (const issue of errors) {
    if (issue.code === "P-ENTRY-FIT") continue;
    const key = issue.path === "/identity/model" ? nameFieldOf(issue) : FIELD_OF_PATH[issue.path];
    if (key === undefined) loose.push(issue);
    else if (settled.fields[key].trim() !== "" && !fieldErrors.has(key)) fieldErrors.set(key, issueText(issue, t));
  }
  const err = (key: FieldKey): string | undefined => (settled === draft ? fieldErrors.get(key) : undefined);

  const num = (key: FieldKey, label: string, hint?: string) => (
    <TextInput label={label} hint={hint} inputMode="decimal" autoComplete="off" value={fields[key]} error={err(key)} onChange={(ev) => edit(key, ev.target.value)} />
  );
  const word = (key: FieldKey, label: string, hint?: string) => (
    <TextInput label={label} hint={hint} autoComplete="off" value={fields[key]} error={err(key)} onChange={(ev) => edit(key, ev.target.value)} />
  );

  async function save() {
    if (!library) return;
    const rows = parseRows(draft.fields.rowsText);
    const fresh = entryToDescriptors(buildEntry(draft, rows.rows));
    const blockedRows = draft.kind === "motor" && draft.withProp && rows.errors.length > 0;
    if (blockedRows || fresh.descriptors.length === 0 || fresh.issues.some((i) => i.severity === "error")) return;
    const taken = fresh.descriptors.some((d) => {
      const stored = library.get(d.id, d.version);
      return stored !== undefined && digestOf(stored) !== digestOf(d);
    });
    if (taken) return setStatus({ kind: "conflict" });
    setStatus({ kind: "saving" });
    try {
      for (const d of fresh.descriptors) {
        if ((await library.save(d, new Map())) === "conflict") return setStatus({ kind: "conflict" });
      }
    } catch {
      logError("drone.parts", "save failed");
      return setStatus({ kind: "failed" });
    }
    setDraft({ kind: draft.kind, withProp: false, fields: BLANK });
    setTouched(false);
    setStatus({ kind: "saved", names: fresh.descriptors.map((d) => d.identity.model).join(", ") });
    onSaved(fresh.descriptors.map((d) => d.id));
  }

  const showFit = settled.kind === "motor" && settled.withProp;
  const fit = result.fit;
  const fitIssue = result.issues.some((i) => i.code === "P-ENTRY-FIT");

  return (
    <form
      className="flex max-w-3xl flex-col gap-6"
      onSubmit={(ev) => {
        ev.preventDefault();
        void save();
      }}
    >
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-balance">{t("title")}</h2>
        <p className="text-sm text-muted text-pretty">{t("intro")}</p>
      </header>

      <SegmentedControl
        label={t("kind.label")}
        value={draft.kind}
        options={[
          { value: "motor", label: t("kind.motor") },
          { value: "pack", label: t("kind.pack") },
          { value: "esc", label: t("kind.esc") },
        ]}
        onChange={(kind) => {
          setStatus({ kind: "idle" });
          setDraft((d) => ({ ...d, kind }));
        }}
        stretch
      />

      {draft.kind === "motor" ? (
        <>
          <Section title={t("motor.heading")}>
            {word("motorName", t("motor.name"))}
            <div className={grid}>
              {num("kv", t("motor.kv"))}
              {num("r", t("motor.r"))}
              {num("i0", t("motor.i0"))}
              {num("motorMass", t("motor.mass"))}
              {num("vMax", t("motor.vMax"))}
              {num("iMax", t("motor.iMax"))}
            </div>
          </Section>

          <Section title={t("prop.heading")}>
            <Toggle checked={draft.withProp} onChange={(withProp) => setDraft((d) => ({ ...d, withProp }))} label={t("prop.toggle")} description={t("prop.toggleHint")} />
            {draft.withProp ? (
              <>
                {word("propName", t("prop.name"))}
                <div className={grid}>
                  {num("diameter", t("prop.diameter"))}
                  {num("pitch", t("prop.pitch"))}
                  {num("blades", t("prop.blades"))}
                  {num("propMass", t("prop.mass"))}
                </div>
                <TextArea
                  label={t("rows.label")}
                  hint={t("rows.hint", { max: MAX_ROWS })}
                  placeholder={t("rows.placeholder")}
                  rows={6}
                  spellCheck={false}
                  className="font-mono tabular-nums"
                  value={fields.rowsText}
                  onChange={(ev) => edit("rowsText", ev.target.value)}
                />
                {parsed.errors.length > 0 ? (
                  <ul className="flex flex-col gap-1">
                    {parsed.errors.map((e, i) => (
                      <li key={i}>
                        <InlineStatus tone="bad">{rowErrorText(e, t)}</InlineStatus>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {parsed.rows.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold">
                      {t("rows.parsed")}: <span className="font-normal text-muted">{t("rows.count", { count: parsed.rows.length })}</span>
                    </p>
                    <div className="max-h-56 overflow-auto rounded-lg bg-sunken">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-start text-muted">
                            {(["rows.volts", "rows.throttle", "rows.thrust", "rows.current"] as const).map((key) => (
                              <th key={key} scope="col" className="px-3 py-2 text-end font-semibold">
                                {t(key)}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="font-mono tabular-nums">
                          {parsed.rows.map((row, i) => (
                            <tr key={i}>
                              <td className="px-3 py-1 text-end">{formatted(row.v_pack)}</td>
                              <td className="px-3 py-1 text-end">{formatted(row.throttle)}</td>
                              <td className="px-3 py-1 text-end">{formatted(row.thrust_g)}</td>
                              <td className="px-3 py-1 text-end">{formatted(row.current_a)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </>
            ) : null}
          </Section>

          {showFit ? (
            <Section title={t("fit.heading")}>
              {fit && fit.band !== null ? (
                <div className="flex flex-col gap-3" role="status">
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {(
                      [
                        ["fit.ct0", fit.ct0.toFixed(4)],
                        ["fit.cp0", fit.cp0.toFixed(4)],
                        ["fit.thrust", `${percent(fit.rms_thrust)} %`],
                        ["fit.current", `${percent(fit.rms_current)} %`],
                      ] as const
                    ).map(([key, value]) => (
                      <div key={key} className="flex flex-col gap-1">
                        <dt className="text-sm text-muted">{t(key)}</dt>
                        <dd className="font-mono text-base font-semibold tabular-nums">{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <Callout tone="note">{t("fit.band", { percent: percent(fit.band) })}</Callout>
                </div>
              ) : (
                <InlineStatus tone="info">{fit && fitIssue ? t("fit.unsettled") : t("fit.needed")}</InlineStatus>
              )}
            </Section>
          ) : null}
        </>
      ) : null}

      {draft.kind === "esc" ? (
        <Section title={t("esc.heading")}>
          {word("escName", t("esc.name"))}
          <div className={grid}>
            {num("escCurrent", t("esc.current"))}
            {num("escBurst", t("esc.burst"))}
            {num("escChannels", t("esc.channels"))}
            <Select label={t("esc.protocol")} value={fields.protocol} onChange={(ev) => edit("protocol", ev.target.value)}>
              {PROTOCOLS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
            {num("efficiency", t("esc.efficiency"))}
            {num("escVMax", t("esc.vMax"))}
            {num("escMass", t("esc.mass"))}
          </div>
        </Section>
      ) : null}

      {draft.kind === "pack" ? (
        <Section title={t("pack.heading")}>
          {word("packName", t("pack.name"))}
          <div className={grid}>
            {num("cells", t("pack.cells"))}
            {num("parallel", t("pack.parallel"))}
            {num("capacity", t("pack.capacity"))}
            {num("c", t("pack.c"))}
            {num("rCell", t("pack.r"), t("pack.rHint"))}
            <Select label={t("pack.chemistry")} value={fields.chemistry} onChange={(ev) => edit("chemistry", ev.target.value)}>
              {CHEMISTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            {num("packMass", t("pack.mass"))}
          </div>
        </Section>
      ) : null}

      <Section title={t("source.heading")}>
        {word("srcTitle", t("source.title"), t("source.titleHint"))}
        <div className={grid}>
          <Select label={t("source.kind")} value={fields.srcKind} onChange={(ev) => edit("srcKind", ev.target.value)}>
            {SOURCE_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`source.kinds.${k}`)}
              </option>
            ))}
          </Select>
          <TextInput label={t("source.url")} type="url" autoComplete="off" value={fields.srcUrl} error={err("srcUrl")} onChange={(ev) => edit("srcUrl", ev.target.value)} />
        </div>
        {word("srcNote", t("source.note"))}
        <div className={grid}>
          {word("license", t("license.label"), t("license.hint"))}
          {word("version", t("version"))}
        </div>
      </Section>

      {loose.length > 0 && settled === draft ? (
        <Section title={t("issues.heading")}>
          <ul className="flex flex-col gap-1">
            {loose.map((issue, i) => (
              <li key={i}>
                <InlineStatus tone="bad">{issueText(issue, t)}</InlineStatus>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary" disabled={!ready} busy={status.kind === "saving"}>
          {status.kind === "saving" ? t("save.saving") : t("save.action")}
        </Button>
        {library === null ? <InlineStatus>{t("save.loading")}</InlineStatus> : null}
        {touched && blocked > 0 && status.kind === "idle" ? <InlineStatus tone="warn">{t("issues.blocked", { count: blocked })}</InlineStatus> : null}
        {status.kind === "saved" ? (
          <InlineStatus tone="good" live>
            {t("save.saved", { names: status.names })}
          </InlineStatus>
        ) : null}
        {status.kind === "conflict" ? (
          <InlineStatus tone="bad" live>
            {t("save.conflict")}
          </InlineStatus>
        ) : null}
        {status.kind === "failed" ? (
          <InlineStatus tone="bad" live>
            {t("save.failed")}
          </InlineStatus>
        ) : null}
      </div>
    </form>
  );
}
