"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SegmentedControl, Select, TextInput, Toggle } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import type { Instrument, PinRef } from "@/project/generated/types";
import { COND, DEFAULT_CONTINUITY_OHMS, MAX_BURDEN_OHMS, METER_MODES, type MeterMode, meterSettings } from "@/sim/probe/meter";
import { digitsFor } from "@/sim/probe/provenance";
import type { Reading } from "@/sim/probe/tap";

export interface ProbePoint {
  pin: PinRef;
  label: string;
  net: string;
  /** The component an ammeter on this pin reads through. */
  element?: string;
}

export interface MultimeterProps {
  instrument: Instrument;
  points: ProbePoint[];
  reading: Reading | null;
  /** Viewers see the reading; only editors change probes. */
  editable: boolean;
  onChange(next: Partial<Instrument>): void;
  messages: Messages["instruments"];
  fidelity: Messages["fidelity"];
  lang: Locale;
}

const MODE_KEY: Record<MeterMode, "dcVolts" | "dcAmps" | "resistance" | "continuity"> = {
  "dc-volts": "dcVolts",
  "dc-amps": "dcAmps",
  resistance: "resistance",
  continuity: "continuity",
};
const NOT_BUILT = ["diode", "frequency", "duty"] as const;
const CONDITION_KEYS = new Set<string>(Object.values(COND));
const LIVE_REGION_MS = 500;

const keyOf = (pin: PinRef): string => `${pin.c}.${pin.p}`;
const shown = (v: number): string => String(Number(v.toPrecision(6)));

/** The newest reading, passed on at most twice a second so a screen reader is not flooded. */
function useSteadyReading(reading: Reading | null): Reading | null {
  const [steady, setSteady] = useState(reading);
  const last = useRef(0);
  useEffect(() => {
    const wait = Math.max(0, last.current + LIVE_REGION_MS - Date.now());
    const timer = setTimeout(() => {
      last.current = Date.now();
      setSteady(reading);
    }, wait);
    return () => clearTimeout(timer);
  }, [reading]);
  return steady;
}

export function Multimeter({ instrument, points, reading, editable, onChange, messages, fidelity, lang }: MultimeterProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/instruments`), [lang, messages]);
  const ft = useMemo(() => createTranslator(lang, fidelity, `${lang}/fidelity`), [lang, fidelity]);
  const settings = meterSettings(instrument);
  const blackKey = String((instrument.settings as Record<string, unknown> | undefined)?.blackPin ?? "");
  const redKey = instrument.target?.pin ? keyOf(instrument.target.pin) : "";
  const steady = useSteadyReading(reading);
  const amps = settings.mode === "dc-amps";

  const setSettings = (patch: Record<string, unknown>) => onChange({ settings: { ...instrument.settings, ...patch } });
  const pickRed = (key: string) => {
    const point = points.find((p) => keyOf(p.pin) === key);
    onChange({ target: { ...instrument.target, pin: point?.pin, net: point?.net, component: point?.element } });
  };

  const valueText = (r: Reading | null): string => {
    if (r === null || r.value === null) return ft("reading.notModelled");
    if (typeof r.value === "boolean") return r.value ? t("meter.connected", { ohms: DEFAULT_CONTINUITY_OHMS }) : t("meter.notConnected");
    if (typeof r.value === "string") return r.value === "open" ? t("meter.open") : r.value;
    if (r.tier === "T0") return ft("tier.T0");
    const digits = digitsFor(r.tier);
    return `${shown(digits === null ? r.value : Number(r.value.toPrecision(digits)))}${r.unit ? ` ${r.unit}` : ""}`;
  };

  const conditions = (steady?.conditions ?? "").split(" ").filter((c) => CONDITION_KEYS.has(c));
  const conditionText = conditions.map((c) => t(c.replace("instruments.", "") as "meter.cond.ideal")).join(". ");
  const band = steady?.band;
  const label = (mode: MeterMode) => t(`meter.mode.${MODE_KEY[mode]}`);
  const options = (
    <>
      <option value="">{t("dock.pickPoint")}</option>
      {points.map((p) => (
        <option key={keyOf(p.pin)} value={keyOf(p.pin)}>
          {p.label}
        </option>
      ))}
    </>
  );

  return (
    <section className="flex min-w-0 flex-col gap-4" data-testid="multimeter" aria-label={t("kind.multimeter")}>
      {editable ? null : <p className="text-sm text-muted">{t("dock.viewerOnly")}</p>}
      <SegmentedControl
        label={t("kind.multimeter")}
        value={settings.mode}
        options={METER_MODES.map((mode) => ({ value: mode, label: label(mode) }))}
        onChange={(mode) => editable && setSettings({ mode })}
        stretch
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label={t("meter.red")} value={redKey} disabled={!editable} onChange={(e) => pickRed(e.target.value)}>
          {options}
        </Select>
        {amps ? null : (
          <Select label={t("meter.black")} value={blackKey} disabled={!editable} onChange={(e) => setSettings({ blackPin: e.target.value })}>
            {options}
          </Select>
        )}
      </div>
      {settings.mode === "dc-volts" ? <Toggle label={t("meter.loading")} checked={settings.loading} disabled={!editable} onChange={(loading) => setSettings({ loading })} /> : null}
      {amps ? (
        <TextInput
          label={t("meter.burden")}
          type="number"
          inputMode="decimal"
          min={0}
          max={MAX_BURDEN_OHMS}
          value={settings.burdenOhms}
          disabled={!editable}
          onChange={(e) => setSettings({ burdenOhms: Number(e.target.value) })}
        />
      ) : null}
      <div role="status" aria-label={t("meter.reading")} className="flex min-w-0 flex-col gap-1 rounded-lg bg-sunken p-4">
        <span className="font-mono text-2xl font-semibold tabular-nums">{valueText(steady)}</span>
        {band ? (
          <span className="font-mono text-sm tabular-nums text-muted">
            {shown(band[0])}–{shown(band[1])} {steady?.unit}
          </span>
        ) : null}
        {steady && steady.value !== null ? (
          <span className="text-sm text-muted">{[ft(`tier.${steady.tier}`), conditionText].filter((s) => s).join(". ")}</span>
        ) : null}
      </div>
      <ul className="flex flex-col gap-1 text-sm text-muted">
        {NOT_BUILT.map((mode) => (
          <li key={mode} aria-disabled="true">
            {t("meter.notBuilt", { mode: t(`meter.mode.${mode}`) })}
          </li>
        ))}
      </ul>
    </section>
  );
}
