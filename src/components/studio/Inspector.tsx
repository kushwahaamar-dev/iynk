"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { Button, Chip, EmptyState, Icon, Select, TextInput, Toggle } from "@/components/ui";
import { REFDES_PATTERN } from "@/core/ids";
import { LIMITS } from "@/core/limits";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator, type Translate } from "@/i18n/translate";
import { builtinRegistry } from "@/parts/builtin";
import type { Op, ParamValue, Project as ProjectState } from "@/project/generated/types";
import { modelRows } from "@/studio/fidelity/static-tier";
import type { PartLookup } from "@/studio/fidelity/static-tier";
import type { DocStore } from "@/studio/stores/doc";
import { useStoreSelector } from "@/studio/stores/select";
import type { SessionStore } from "@/studio/stores/session";
import { selectableExists } from "@/studio/tools/select";
import { formatValue, parseValue, quantityOf } from "@/studio/units";
import type { Quantity } from "@/studio/units";
import { TierChip } from "./ModelsPanel";

const builtin = builtinRegistry();

const COLLAPSED_PINS = 8;
const ROTATIONS = [0, 90, 180, 270];
const PARAM_LIMIT = 1e15;
const LAYOUT_LIMITS = { min: -LIMITS.layoutAbsMm, max: LIMITS.layoutAbsMm };

type InspectorMessages = Messages["studioInspect"];
type T = Translate<InspectorMessages>;

export interface InspectorProps {
  doc: DocStore;
  session: SessionStore;
  messages: InspectorMessages;
  modelMessages: Messages["studioModels"];
  lang: Locale;
  registry?: PartLookup;
}

type Instance = ProjectState["boards"][number] | ProjectState["components"][number];

const textOf = (text: Record<string, string | undefined> | undefined, lang: string, fallback: string): string =>
  text?.[lang] ?? text?.en ?? Object.values(text ?? {}).find((v) => v !== undefined) ?? fallback;

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <h3 id={id} className="kicker">
        {title}
      </h3>
      {children}
    </section>
  );
}

type CommitFieldProps = {
  label: string;
  value: string;
  readOnly: boolean;
  hint?: string;
  inputMode?: "decimal" | "text";
  /** Returns the message to show when the text is refused, or null once it was taken. */
  onCommit(text: string): string | null;
};

/** A text field that keeps what is typed until Enter or leaving the field, then either takes it or says why not. */
function CommitField({ label, value, readOnly, hint, inputMode, onCommit }: CommitFieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | undefined>();

  function settle() {
    if (draft === null || readOnly) return;
    const problem = draft === value ? null : onCommit(draft);
    setError(problem ?? undefined);
    if (problem === null) setDraft(null);
  }

  return (
    <TextInput
      label={label}
      hint={hint}
      error={error}
      inputMode={inputMode}
      className="tabular-nums"
      value={draft ?? value}
      readOnly={readOnly}
      aria-disabled={readOnly || undefined}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={settle}
      onKeyDown={(event) => {
        if (event.key === "Enter") settle();
        if (event.key === "Escape") {
          setDraft(null);
          setError(undefined);
        }
      }}
    />
  );
}

type PartProps = {
  state: ProjectState;
  instance: Instance;
  viewId: string;
  readOnly: boolean;
  lang: Locale;
  t: T;
  registry: PartLookup;
  modelMessages: Messages["studioModels"];
  commit(batch: Op[], label: string): boolean;
};

const isBoard = (state: ProjectState, id: string): boolean => state.boards.some((b) => b.id === id);

function patchOp(state: ProjectState, id: string, patch: { set?: Record<string, unknown>; params?: Record<string, unknown> }): Op {
  return isBoard(state, id) ? { k: "board.set", id, ...patch } : { k: "component.set", id, ...patch };
}

function Identity({ state, instance, readOnly, t, commit }: PartProps) {
  const others = [...state.boards, ...state.components].filter((x) => x.id !== instance.id);
  return (
    <Section title={t("sections.identity")}>
      <CommitField
        label={t("identity.refdes")}
        value={instance.refdes}
        readOnly={readOnly}
        onCommit={(text) => {
          const refdes = text.trim();
          if (!REFDES_PATTERN.test(refdes)) return t("identity.refdesInvalid");
          if (others.some((x) => x.refdes === refdes)) return t("identity.refdesTaken", { refdes });
          commit([patchOp(state, instance.id, { set: { refdes } })], `Rename ${instance.refdes} to ${refdes}`);
          return null;
        }}
      />
      <CommitField
        label={t("identity.label")}
        value={instance.label ?? ""}
        readOnly={readOnly}
        onCommit={(text) => {
          commit([patchOp(state, instance.id, { set: { label: text.trim() === "" ? null : text.trim() } })], `Label ${instance.refdes}`);
          return null;
        }}
      />
    </Section>
  );
}

function ValueRow({ param, current, quantity, part, name }: { param: InterfaceParamLike; current: ParamValue | undefined; quantity: Quantity; part: PartProps; name: string }) {
  const { t, readOnly, instance, state, commit } = part;
  const value = current ?? param.default;
  const write = (next: number | string | boolean) =>
    commit([patchOp(state, instance.id, { params: { [param.id]: next } })], `Set ${instance.refdes} ${name}`);

  if (typeof value === "object") {
    return <TextInput label={name} value={value.param} readOnly aria-disabled hint={t("values.bound")} />;
  }
  if (param.type === "boolean") {
    return <Toggle label={name} checked={value === true} disabled={readOnly} onChange={write} />;
  }
  if (param.type === "enum") {
    return (
      <Select label={name} value={String(value)} disabled={readOnly} aria-disabled={readOnly || undefined} onChange={(event) => write(param.values?.find((v) => String(v) === event.target.value) ?? event.target.value)}>
        {(param.values ?? []).map((v) => (
          <option key={String(v)} value={String(v)}>
            {String(v)}
          </option>
        ))}
      </Select>
    );
  }
  const limits = { min: param.min ?? -PARAM_LIMIT, max: param.max ?? PARAM_LIMIT };
  return (
    <CommitField
      label={name}
      value={formatValue(Number(value), quantity)}
      readOnly={readOnly}
      inputMode="decimal"
      hint={t("values.default", { value: formatValue(Number(param.default), quantity) })}
      onCommit={(text) => {
        const parsed = parseValue(text, quantity, limits);
        if (!parsed.ok) {
          return parsed.reason === "range"
            ? t("value.range", { min: formatValue(parsed.min, quantity), max: formatValue(parsed.max, quantity) })
            : parsed.reason === "unit"
              ? t("value.unit", { unit: t(`units.${quantity}`) })
              : t(`value.${parsed.reason}`);
        }
        write(parsed.value);
        return null;
      }}
    />
  );
}

type InterfaceParamLike = {
  id: string;
  type: "enum" | "number" | "boolean";
  unit?: string;
  default: number | string | boolean;
  values?: readonly (number | string)[];
  min?: number;
  max?: number;
};

function Values(part: PartProps) {
  const { state, instance, registry, lang, t } = part;
  const dependency = state.dependencies.components.find((d) => d.ref === instance.definition.ref && d.version === instance.definition.version);
  const params = dependency?.interface.params ?? [];
  const descriptor = registry.get(instance.definition.ref, instance.definition.version);
  return (
    <Section title={t("sections.values")}>
      {params.length === 0 ? (
        <p className="text-sm text-muted">{t("values.none")}</p>
      ) : (
        params.map((param) => (
          <ValueRow
            key={param.id}
            param={param}
            current={instance.params?.[param.id]}
            quantity={quantityOf(param.unit)}
            part={part}
            name={textOf(descriptor?.parameters?.find((p) => p.id === param.id)?.name, lang, param.id)}
          />
        ))
      )}
    </Section>
  );
}

function netLabel(state: ProjectState, netId: string, t: T): string {
  const index = state.nets.findIndex((n) => n.id === netId);
  return state.nets[index]?.name ?? t("nets.unnamed", { number: index + 1 });
}

function Pins({ state, instance, registry, lang, t }: PartProps) {
  const [open, setOpen] = useState(false);
  const pins = state.dependencies.components.find((d) => d.ref === instance.definition.ref && d.version === instance.definition.version)?.interface.pins ?? [];
  const descriptor = registry.get(instance.definition.ref, instance.definition.version);
  const netOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const net of state.nets) for (const pin of net.connections) if (pin.c === instance.id) map.set(pin.p, net.id);
    return map;
  }, [state.nets, instance.id]);
  const shown = open ? pins : pins.slice(0, COLLAPSED_PINS);
  if (pins.length === 0) return null;
  return (
    <Section title={t("sections.pins")}>
      <ul>
        {shown.map((pin) => {
          const netId = netOf.get(pin.id);
          const name = textOf(descriptor?.pins.find((p) => p.id === pin.id)?.name, lang, "");
          return (
            <li key={pin.id} className="flex items-baseline gap-2 border-b border-rule py-2 last:border-b-0">
              <Chip mono>{pin.designator ?? pin.id}</Chip>
              <span className="min-w-0 flex-1 truncate text-sm">{name || pin.id}</span>
              <span className="text-sm text-muted">{netId === undefined ? t("pins.unconnected") : t("pins.inNet", { name: netLabel(state, netId, t) })}</span>
            </li>
          );
        })}
      </ul>
      {pins.length > COLLAPSED_PINS ? (
        <Button variant="ghost" size="sm" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? t("pins.showLess") : t("pins.showAll")}
        </Button>
      ) : null}
    </Section>
  );
}

function Position({ state, instance, viewId, readOnly, t, commit }: PartProps) {
  const placement = state.views.find((v) => v.id === viewId)?.placements.find((p) => p.c === instance.id);
  if (!placement) {
    return (
      <Section title={t("sections.position")}>
        <p className="text-sm text-muted">{t("position.notPlaced")}</p>
      </Section>
    );
  }
  const move = (to: { x_mm?: number; y_mm?: number; rotation_deg?: number }, label: string) =>
    commit([{ k: "view.place", view: viewId, placement: { ...placement, ...to } }], `${label} ${instance.refdes}`);
  const axis = (name: "x_mm" | "y_mm", label: string) => (
    <CommitField
      label={label}
      value={formatValue(placement[name], "none")}
      readOnly={readOnly}
      inputMode="decimal"
      onCommit={(text) => {
        const parsed = parseValue(text, "none", LAYOUT_LIMITS);
        if (!parsed.ok) return t("position.invalid", { min: String(parsed.min), max: String(parsed.max) });
        move({ [name]: parsed.value }, "Move");
        return null;
      }}
    />
  );
  const turn = placement.rotation_deg ?? 0;
  return (
    <Section title={t("sections.position")}>
      <div className="grid grid-cols-2 gap-2">
        {axis("x_mm", t("position.x"))}
        {axis("y_mm", t("position.y"))}
      </div>
      <Select
        label={t("position.rotation")}
        value={String(turn)}
        disabled={readOnly}
        aria-disabled={readOnly || undefined}
        onChange={(event) => move({ rotation_deg: Number(event.target.value) }, "Turn")}
      >
        {(ROTATIONS.includes(turn) ? ROTATIONS : [...ROTATIONS, turn]).map((deg) => (
          <option key={deg} value={String(deg)}>
            {t("position.degrees", { deg })}
          </option>
        ))}
      </Select>
    </Section>
  );
}

function Model({ state, instance, registry, t, modelMessages }: PartProps) {
  const row = useMemo(() => modelRows(state, registry).find((r) => r.c === instance.id), [state, registry, instance.id]);
  if (!row) return null;
  return (
    <Section title={t("sections.model")}>
      <div className="flex flex-wrap items-center gap-2">
        <TierChip tier={row.tier} messages={modelMessages} />
        <span className="text-sm text-muted">{modelMessages.status[row.status]}</span>
      </div>
    </Section>
  );
}

function Nets({ state, session, t }: { state: ProjectState; session: SessionStore; t: T }) {
  const focus = useStoreSelector(session, (s) => s.focusNet);
  return (
    <Section title={t("sections.nets")}>
      {state.nets.length === 0 ? (
        <p className="text-sm text-muted text-pretty">{t("nets.none")}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {state.nets.map((net, index) => {
            const on = focus === net.id;
            return (
              <li key={net.id}>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-pressed={on}
                  title={t("nets.focus", { name: net.name ?? t("nets.unnamed", { number: index + 1 }) })}
                  className="w-full justify-between"
                  onClick={() => session.setFocusNet(on ? null : net.id)}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {on ? <Icon name="target" size={16} /> : null}
                    <span className="truncate">{net.name ?? t("nets.unnamed", { number: index + 1 })}</span>
                  </span>
                  <span className="tabular font-normal">{t("nets.pins", { count: net.connections.length })}</span>
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

/** The right rail: what the selected part is made of and set to, and the nets of the project. */
export function Inspector({ doc, session, messages, modelMessages, lang, registry = builtin }: InspectorProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/studioInspect`), [lang, messages]);
  const state = useStoreSelector(doc, (s) => s.state);
  const readOnly = useStoreSelector(doc, (s) => s.readOnly);
  const selection = useStoreSelector(session, (s) => s.selection);
  const viewId = useStoreSelector(session, (s) => s.viewId);

  useEffect(() => {
    session.pruneSelection((item) => selectableExists(state, item));
  }, [state, session]);

  function commit(batch: Op[], label: string): boolean {
    const done = doc.commit(batch, { label });
    if (!done.ok) session.setStatus({ key: `ops.reject.${done.reject}`, params: { message: done.message } });
    return done.ok;
  }

  const parts = selection
    .filter((s) => s.kind === "part" && s.view === viewId)
    .flatMap((s) => [...state.boards, ...state.components].filter((x) => x.id === s.id));
  const only = parts.length === 1 ? parts[0]! : null;
  const part: PartProps | null = only && { state, instance: only, viewId, readOnly, lang, t, registry, modelMessages, commit };

  return (
    <div className="flex flex-col gap-6">
      {part ? (
        <div key={part.instance.id} className="flex flex-col gap-6">
          <Identity {...part} />
          <Values {...part} />
          <Pins {...part} />
          <Position {...part} />
          <Model {...part} />
        </div>
      ) : parts.length > 1 ? (
        <p className="text-base font-semibold">{t("many", { count: parts.length })}</p>
      ) : (
        <EmptyState title={t("empty.title")}>{t("empty.hint")}</EmptyState>
      )}
      <Nets state={state} session={session} t={t} />
    </div>
  );
}
