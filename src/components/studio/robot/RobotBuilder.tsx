"use client";

import { useId, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import { Button, Chip, SegmentedControl, Select, TextInput } from "@/components/ui";
import { newId as randomId } from "@/core/ids";
import type { RobotProblem } from "@/core/robot-report";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator, type MessageKey } from "@/i18n/translate";
import type { Project } from "@/project/generated/types";
import type { DocStore } from "@/studio/stores/doc";
import { useStoreSelector } from "@/studio/stores/select";
import {
  LENGTH_UNITS,
  MASS_UNITS,
  fromSi,
  parseNumber,
  readProps,
  recipe,
  setProp,
  toSi,
  type LengthUnit,
  type MassUnit,
  type PropReading,
  type PropTarget,
  type RecipeCtx,
  type RobotPart,
  type UnitPrefs,
} from "@/studio/tools/robot";

export interface RobotBuilderProps {
  doc: DocStore;
  describe: RecipeCtx["describe"];
  problems: RobotProblem[];
  /** The units the form starts in; the picker changes what is shown, never what is stored. */
  unit: UnitPrefs;
  messages: Messages["robot"];
  lang: Locale;
  newId?: RecipeCtx["newId"];
}

type Robot = Messages["robot"];

const PARTS = [
  { part: "chassis", descriptor: "core.chassis-2wd", label: "parts.chassis" },
  { part: "wheel-pair", descriptor: "core.wheel-65", label: "builder.wheelPair" },
  { part: "caster", descriptor: "core.caster-ball", label: "builder.caster" },
  { part: "gearmotor", descriptor: "core.tt-motor", label: "parts.motor" },
  { part: "driver", descriptor: "core.tb6612fng-module", label: "parts.driver" },
  { part: "battery", descriptor: "core.lipo-2s", label: "parts.battery" },
  { part: "line-array", descriptor: "core.qtr-8rc", label: "parts.lineSensor" },
  { part: "ranger", descriptor: "core.hc-sr04", label: "parts.ranger" },
] as const satisfies readonly { part: RobotPart; descriptor: string; label: MessageKey<Robot> }[];

interface Target extends PropTarget {
  label: string;
}

const key = (target: PropTarget): string => `${target.kind}:${target.id}`;

function targetsOf(state: Project): Target[] {
  const { bodies = [], joints = [] } = state.mechanical ?? {};
  const wheels = joints.flatMap((j): Target[] => (j.kind === "wheel" ? [{ kind: "wheel", id: j.id, label: bodies.find((b) => b.id === j.child)?.name ?? j.id }] : []));
  const sensors = (state.domains?.robotics?.data.sensors ?? []).map((s): Target => ({ kind: "sensor", id: s.id, label: s.id }));
  return [...bodies.map((b): Target => ({ kind: "body", id: b.id, label: b.name })), ...wheels, ...sensors];
}

const shown = (si: number, unit: LengthUnit | MassUnit | undefined): string => String(Number((unit ? fromSi(si, unit) : si).toPrecision(6)));

function PropField({ label, unit, valueSi, rejected, onCommit }: { label: string; unit: LengthUnit | MassUnit | undefined; valueSi: number; rejected: string; onCommit(valueSi: number): boolean }) {
  const current = shown(valueSi, unit);
  const [draft, setDraft] = useState(current);
  const [error, setError] = useState<string>();

  function commit() {
    const value = parseNumber(draft);
    if (value === undefined) return setError(rejected);
    if (String(value) === current) return setError(undefined);
    setError(onCommit(unit ? toSi(value, unit) : value) ? undefined : rejected);
  }

  return (
    <TextInput
      label={unit ? `${label} (${unit})` : label}
      inputMode="decimal"
      value={draft}
      error={error}
      className="font-mono tabular-nums"
      onChange={(e) => {
        setDraft(e.target.value);
        setError(undefined);
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
      }}
    />
  );
}

export function RobotBuilder({ doc, describe, problems, unit, messages, lang, newId = randomId }: RobotBuilderProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/robot`), [lang, messages]);
  const state = useStoreSelector(doc, (v) => v.state);
  const canUndo = useStoreSelector(doc, (v) => v.canUndo);
  const canRedo = useStoreSelector(doc, (v) => v.canRedo);
  const readOnly = useStoreSelector(doc, (v) => v.readOnly);
  const listId = useId();
  const [units, setUnits] = useState(unit);
  const [active, setActive] = useState(0);
  const [selected, setSelected] = useState<string>();
  const [notice, setNotice] = useState<{ text: string; error: boolean }>();

  const targets = useMemo(() => targetsOf(state), [state]);
  const target = targets.find((x) => key(x) === selected) ?? targets[0];
  const ctx: RecipeCtx = { doc: state, newId, describe };

  function add(index: number) {
    const entry = PARTS[index]!;
    const name = t(entry.label);
    const made = recipe(entry.part, { descriptor: entry.descriptor }, ctx);
    if (!made.ok) return setNotice({ text: t(`builder.errors.${made.error.code}`), error: true });
    const done = doc.commit(made.value, { label: `Add ${name}` });
    setNotice(done.ok ? { text: t("builder.added", { part: name }), error: false } : { text: t("builder.errors.rejected"), error: true });
  }

  function onListKey(e: KeyboardEvent<HTMLUListElement>) {
    const last = PARTS.length - 1;
    const moves: Record<string, number> = { ArrowDown: Math.min(active + 1, last), ArrowUp: Math.max(active - 1, 0), Home: 0, End: last };
    if (e.key in moves) {
      e.preventDefault();
      setActive(moves[e.key]!);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      add(active);
    }
  }

  function readings(of: Target): { target: PropTarget; reading: PropReading }[] {
    const targetsFor: PropTarget[] = of.kind === "wheel" ? [of, { kind: "joint", id: of.id }] : [of];
    return targetsFor.flatMap((x) => readProps(state, x).map((reading) => ({ target: x, reading })));
  }

  function change(of: PropTarget, prop: string, valueSi: number): boolean {
    const ops = setProp(ctx, of, prop, valueSi);
    return ops.length > 0 && doc.commit(ops, { label: `Set ${prop}` }).ok;
  }

  const unitOf = (reading: PropReading) => (reading.quantity === "length" ? units.length : reading.quantity === "mass" ? units.mass : undefined);

  return (
    <section aria-label={t("builder.title")} className="flex min-h-0 flex-col gap-4" data-testid="robot-builder">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 text-sm font-semibold">{t("builder.title")}</h3>
        <Button variant="ghost" size="sm" disabled={!canUndo || readOnly} onClick={() => doc.undo()}>
          {t("builder.undo")}
        </Button>
        <Button variant="ghost" size="sm" disabled={!canRedo || readOnly} onClick={() => doc.redo()}>
          {t("builder.redo")}
        </Button>
      </div>

      <div>
        <h4 id={`${listId}-label`} className="text-xs font-semibold text-muted">
          {t("builder.add")}
        </h4>
        <ul
          role="listbox"
          tabIndex={0}
          aria-labelledby={`${listId}-label`}
          aria-activedescendant={`${listId}-${active}`}
          aria-disabled={readOnly || undefined}
          onKeyDown={readOnly ? undefined : onListKey}
          className="mt-1 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {PARTS.map((entry, i) => (
            <li
              key={entry.part}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onClick={() => {
                if (readOnly) return;
                setActive(i);
                add(i);
              }}
              className="flex cursor-pointer items-baseline gap-2 rounded-md px-2 py-2 text-base aria-selected:bg-sunken aria-selected:font-semibold"
            >
              <span>{t(entry.label)}</span>
              <span className="min-w-0 truncate text-sm text-muted">{describe(entry.descriptor)?.identity.model}</span>
            </li>
          ))}
        </ul>
        <p role="status" className={notice?.error ? "mt-1 text-sm text-bad" : "mt-1 text-sm text-muted"}>
          {notice?.text}
        </p>
      </div>

      {targets.length === 0 ? <p className="text-sm text-pretty text-muted">{t("builder.empty")}</p> : null}

      <div className="flex flex-wrap gap-4">
        <SegmentedControl label={t("builder.unitLength")} options={LENGTH_UNITS.map((u) => ({ value: u, label: u }))} value={units.length} onChange={(length) => setUnits((u) => ({ ...u, length }))} size="sm" />
        <SegmentedControl label={t("builder.unitMass")} options={MASS_UNITS.map((u) => ({ value: u, label: u }))} value={units.mass} onChange={(mass) => setUnits((u) => ({ ...u, mass }))} size="sm" />
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold text-muted">{t("builder.properties")}</h4>
        {target ? (
          <>
            <Select label={t("builder.target")} value={key(target)} onChange={(e) => setSelected(e.target.value)}>
              {targets.map((x) => (
                <option key={key(x)} value={key(x)}>
                  {x.label}
                </option>
              ))}
            </Select>
            {readings(target).map(({ target: owner, reading }) => (
              <PropField
                key={`${key(owner)}:${reading.prop}:${shown(reading.valueSi, unitOf(reading))}`}
                label={t(`builder.props.${reading.prop as "mass"}`)}
                unit={unitOf(reading)}
                valueSi={reading.valueSi}
                rejected={t("builder.errors.value")}
                onCommit={(value) => change(owner, reading.prop, value)}
              />
            ))}
          </>
        ) : (
          <p className="text-sm text-muted">{t("builder.noTarget")}</p>
        )}
      </div>

      <div>
        <h4 className="text-xs font-semibold text-muted">{t("builder.problems")}</h4>
        {problems.length === 0 ? (
          <p className="py-2 text-sm text-muted">{t("builder.noProblems")}</p>
        ) : (
          <ul>
            {problems.map((p) => (
              <li key={`${p.code}:${p.path}`} className="flex items-start gap-2 border-b border-rule py-2 text-sm last:border-b-0">
                <Chip tone={p.severity === "error" ? "bad" : "warn"}>{p.code}</Chip>
                <span className="min-w-0 flex-1 text-pretty">{t(p.messageKey as MessageKey<Robot>, p.args)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h4 className="text-xs font-semibold text-muted">{t("safety.title")}</h4>
        <ul className="mt-1 list-disc pl-4 text-sm text-pretty">
          <li>{t("safety.lipo")}</li>
          <li>{t("safety.stall")}</li>
        </ul>
      </div>
    </section>
  );
}
