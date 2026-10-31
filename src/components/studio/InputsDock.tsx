"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Button, EmptyState, Toggle } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator, type Translate } from "@/i18n/translate";
import { clampStep, type InputSpec } from "@/studio/run/inputs";

export interface InputsDockProps {
  specs: InputSpec[];
  onSet(id: string, value: number): void;
  messages: Messages["studio"];
  lang: Locale;
  /** True while there is no running simulation to drive. */
  disabled?: boolean;
}

type T = Translate<Messages["studio"]>;
type ControlProps = { spec: InputSpec; onSet(id: string, value: number): void; t: T; disabled: boolean };

const isOn = ({ min, max, value }: InputSpec): boolean => value >= (min + max) / 2;

function HoldButton({ spec, onSet, t, disabled }: ControlProps) {
  const pressed = isOn(spec);
  const key = (down: boolean) => (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    if (down && !e.repeat) onSet(spec.id, spec.max);
    if (!down) onSet(spec.id, spec.min);
  };
  return (
    <Button
      aria-pressed={pressed}
      disabled={disabled}
      className="w-full touch-none justify-between text-start"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        onSet(spec.id, spec.max);
      }}
      onPointerUp={() => onSet(spec.id, spec.min)}
      onPointerCancel={() => onSet(spec.id, spec.min)}
      onKeyDown={key(true)}
      onKeyUp={key(false)}
      onBlur={() => pressed && onSet(spec.id, spec.min)}
    >
      <span>{spec.label}</span>
      <span className="text-sm font-normal">{pressed ? t("lesson.inputs.release") : t("lesson.inputs.hold")}</span>
    </Button>
  );
}

/** Sends at most one value per animation frame while a slider is dragged. */
function Slider({ spec, onSet, t, disabled }: ControlProps) {
  const [draft, setDraft] = useState<number | null>(null);
  const frame = useRef(0);
  const latest = useRef(spec.value);
  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const change = (raw: number) => {
    latest.current = clampStep(spec, raw);
    setDraft(latest.current);
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      setDraft(null);
      onSet(spec.id, latest.current);
    });
  };

  const shown = `${draft ?? spec.value}${spec.unit ? ` ${spec.unit}` : ""}`;
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-baseline justify-between gap-2 text-sm font-semibold">
        <span>{t("lesson.inputs.slider", { label: spec.label, value: shown })}</span>
      </span>
      <input
        type="range"
        className="h-11 w-full"
        disabled={disabled}
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={draft ?? spec.value}
        onChange={(e) => change(Number(e.target.value))}
      />
    </label>
  );
}

function Requests({ spec, onSet, disabled }: ControlProps) {
  if (spec.control.kind !== "requests") return null;
  return (
    <div role="group" aria-label={spec.label} className="flex flex-col gap-2">
      <span className="text-sm font-semibold">{spec.label}</span>
      {spec.control.requests.map((r) => (
        <Button key={r.value} disabled={disabled} className="justify-start font-mono" onClick={() => onSet(spec.id, r.value)}>
          {r.label}
        </Button>
      ))}
    </div>
  );
}

function Control(props: ControlProps) {
  const { spec, onSet, disabled } = props;
  switch (spec.control.kind) {
    case "hold":
      return <HoldButton {...props} />;
    case "switch":
      return <Toggle label={spec.label} checked={isOn(spec)} disabled={disabled} onChange={(on) => onSet(spec.id, on ? spec.max : spec.min)} />;
    case "slider":
      return <Slider {...props} />;
    case "requests":
      return <Requests {...props} />;
    case "none":
      return null;
  }
}

export function InputsDock({ specs, onSet, messages, lang, disabled = false }: InputsDockProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/studio`), [lang, messages]);
  const drivable = specs.filter((s) => s.control.kind !== "none");
  return (
    <section aria-labelledby="inputs-dock-title" className="flex flex-col gap-3">
      <h2 id="inputs-dock-title" className="text-base font-semibold">
        {t("lesson.inputs.title")}
      </h2>
      {drivable.length === 0 ? (
        <EmptyState bordered title={t("lesson.inputs.empty")} />
      ) : (
        drivable.map((spec) => <Control key={spec.id} spec={spec} onSet={onSet} t={t} disabled={disabled} />)
      )}
    </section>
  );
}
