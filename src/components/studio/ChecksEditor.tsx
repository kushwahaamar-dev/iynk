"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { Button, Callout, Chip, EmptyState, Select, TextArea, TextInput, Toggle } from "@/components/ui";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator, type MessageKey, type Translate } from "@/i18n/translate";
import type { CheckResult } from "@/lib/interp/checks";
import type { Op, Project } from "@/project/generated/types";
import {
  AUTHOR_CHECK_KINDS,
  MAX_CHECKS,
  generatedLabel,
  isAuthorCheck,
  labelText,
  newCheck,
  nextCheckId,
  removeCheckOps,
  setCheckOps,
  summarise,
  validateCheck,
  type AuthorCheckKind,
  type BoardPins,
  type CheckIssue,
  type ProjectCheck,
} from "@/studio/checks";

type Strings = Messages["studio"];
type T = Translate<Strings>;
type FieldName = keyof Strings["checks"]["field"];

/** Why a run cannot give results, for the line above the list. */
export type ChecksProblem = "no-source" | "unsupported-language" | "limit";

export interface ChecksEditorProps {
  state: Project;
  checks: ProjectCheck[];
  results: Map<string, CheckResult>;
  running: boolean;
  problem?: ChecksProblem | null;
  board: BoardPins;
  onChange(ops: Op[]): void;
  onRun(): void;
  onCancel(): void;
  messages: Strings;
  lang: Locale;
}

const PROBLEM_KEY = { "no-source": "checks.noSource", "unsupported-language": "checks.unsupportedLanguage", limit: "checks.limit" } as const;

/** A number the person types; the draft only changes while the text parses, so a half typed value does not jump. */
function NumberField({ label, value, onChange, error }: { label: string; value: number; onChange(n: number): void; error?: string }) {
  const [text, setText] = useState(String(value));
  return (
    <TextInput
      label={label}
      inputMode="decimal"
      className="font-mono tabular-nums"
      value={text}
      error={error}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value.trim() !== "" && Number.isFinite(n)) onChange(n);
      }}
    />
  );
}

function RangeField({ legend, from, to, onChange, error, t }: { legend: string; from: number; to: number; onChange(range: [number, number]): void; error?: string; t: T }) {
  return (
    <fieldset className="min-w-0">
      <legend className="field-label mb-1">{legend}</legend>
      <div className="grid grid-cols-2 gap-2">
        <NumberField label={t("checks.field.from")} value={from} onChange={(n) => onChange([n, to])} error={error} />
        <NumberField label={t("checks.field.to")} value={to} onChange={(n) => onChange([from, n])} />
      </div>
    </fieldset>
  );
}

const lines = (text: string) => text.split("\n").filter((l) => l !== "");

interface FormProps {
  draft: ProjectCheck;
  onDraft(c: ProjectCheck): void;
  board: BoardPins;
  inputs: Project["simulation"]["world"]["inputs"];
  issues: CheckIssue[];
  t: T;
}

/** The fields of one kind of check. `draft` is typed on `kind`, so each branch edits only its own fields. */
function KindFields({ draft, onDraft, board, inputs, issues, t }: FormProps) {
  const listId = useId();
  const problem = (field: string) => {
    const issue = issues.find((i) => i.field === field);
    return issue && t(issue.key as MessageKey<Strings>, issue.args);
  };
  const num = (name: FieldName, value: number, set: (n: number) => void, field: string = name) => (
    <NumberField key={name} label={t(`checks.field.${name}`)} value={value} onChange={set} error={problem(field)} />
  );
  const pin = (c: Extract<ProjectCheck, { pin: string }>) => (
    <div key="pin">
      <TextInput label={t("checks.field.pin")} list={listId} className="font-mono" value={c.pin} error={problem("pin")} onChange={(e) => onDraft({ ...c, pin: e.target.value })} />
      <datalist id={listId}>
        {board.names.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </div>
  );

  switch (draft.kind) {
    case "runs":
      return num("minMs", draft.minMs, (minMs) => onDraft({ ...draft, minMs }));
    case "serial":
      return (
        <>
          <TextInput label={t("checks.field.match")} className="font-mono" value={draft.match} error={problem("match")} onChange={(e) => onDraft({ ...draft, match: e.target.value })} />
          <Toggle label={t("checks.field.regex")} checked={draft.regex} onChange={(regex) => onDraft({ ...draft, regex })} />
          {num("minCount", draft.minCount, (minCount) => onDraft({ ...draft, minCount }))}
        </>
      );
    case "pin-level":
      return (
        <>
          {pin(draft)}
          <Select label={t("checks.field.level")} value={draft.level} onChange={(e) => onDraft({ ...draft, level: e.target.value === "1" ? 1 : 0 })}>
            <option value={1}>{t("board.high")}</option>
            <option value={0}>{t("board.low")}</option>
          </Select>
          {num("atMs", draft.atMs, (atMs) => onDraft({ ...draft, atMs }))}
        </>
      );
    case "pin-toggles":
      return (
        <>
          {pin(draft)}
          <RangeField legend={t("checks.field.periodMs")} from={draft.periodMs[0]} to={draft.periodMs[1]} onChange={(periodMs) => onDraft({ ...draft, periodMs })} error={problem("periodMs")} t={t} />
          {num("minCycles", draft.minCycles, (minCycles) => onDraft({ ...draft, minCycles }))}
        </>
      );
    case "pwm":
      return (
        <>
          {pin(draft)}
          <RangeField legend={t("checks.field.duty")} from={draft.duty[0]} to={draft.duty[1]} onChange={(duty) => onDraft({ ...draft, duty })} error={problem("duty")} t={t} />
          {num("atMs", draft.atMs, (atMs) => onDraft({ ...draft, atMs }))}
        </>
      );
    case "tone":
      return (
        <>
          {pin(draft)}
          <RangeField legend={t("checks.field.hz")} from={draft.hz[0]} to={draft.hz[1]} onChange={(hz) => onDraft({ ...draft, hz })} error={problem("hz")} t={t} />
          {num("atMs", draft.atMs, (atMs) => onDraft({ ...draft, atMs }))}
        </>
      );
    case "servo":
      return (
        <>
          {pin(draft)}
          <RangeField legend={t("checks.field.deg")} from={draft.deg[0]} to={draft.deg[1]} onChange={(deg) => onDraft({ ...draft, deg })} error={problem("deg")} t={t} />
          {num("atMs", draft.atMs, (atMs) => onDraft({ ...draft, atMs }))}
        </>
      );
    case "responds":
      return (
        <>
          {inputs.length > 0 ? (
            <Select label={t("checks.field.input")} value={draft.after.input} onChange={(e) => onDraft({ ...draft, after: { ...draft.after, input: e.target.value } })}>
              {inputs.some((i) => i.id === draft.after.input) ? null : <option value={draft.after.input}>{draft.after.input}</option>}
              {inputs.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.id}
                </option>
              ))}
            </Select>
          ) : (
            <TextInput label={t("checks.field.input")} className="font-mono" value={draft.after.input} onChange={(e) => onDraft({ ...draft, after: { ...draft.after, input: e.target.value } })} />
          )}
          {num("afterAt", draft.after.t, (at) => onDraft({ ...draft, after: { ...draft.after, t: at } }), "after.t")}
          {num("afterValue", draft.after.value, (value) => onDraft({ ...draft, after: { ...draft.after, value } }), "after.value")}
          {pin(draft)}
          {num("withinMs", draft.withinMs, (withinMs) => onDraft({ ...draft, withinMs }))}
          <RangeField legend={t("checks.field.v")} from={draft.v[0]} to={draft.v[1]} onChange={(v) => onDraft({ ...draft, v })} error={problem("v")} t={t} />
        </>
      );
    case "code":
      return (
        <>
          <TextArea label={t("checks.field.must")} hint={t("checks.mustHint")} className="font-mono" value={draft.must.join("\n")} onChange={(e) => onDraft({ ...draft, must: lines(e.target.value) })} />
          <TextArea label={t("checks.field.mustNot")} hint={t("checks.mustHint")} className="font-mono" value={draft.mustNot.join("\n")} onChange={(e) => onDraft({ ...draft, mustNot: lines(e.target.value) })} />
        </>
      );
    default:
      return null;
  }
}

function CheckForm({ initial, onSave, onCancel, state, board, t }: { initial: ProjectCheck; onSave(c: ProjectCheck): void; onCancel(): void; state: Project; board: BoardPins; t: T }) {
  const [draft, setDraft] = useState(initial);
  const issues = useMemo(() => validateCheck(draft, board, state.simulation.duration_ms), [draft, board, state.simulation.duration_ms]);

  function submit() {
    // A label nobody wrote follows the check's values; one the person typed stays as typed.
    const generated = labelText(draft) === labelText(initial) && labelText(initial) === generatedLabel(initial);
    const label = generated || labelText(draft).trim() === "" ? generatedLabel(draft) : draft.label;
    onSave({ ...draft, label });
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-lg bg-sunken p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <TextInput label={t("checks.field.label")} maxLength={240} value={labelText(draft)} onChange={(e) => setDraft({ ...draft, label: e.target.value })} />
      <KindFields draft={draft} onDraft={setDraft} board={board} inputs={state.simulation.world.inputs} issues={issues} t={t} />
      <Toggle label={t("checks.hidden")} checked={draft.visibility === "hidden"} onChange={(hidden) => setDraft({ ...draft, visibility: hidden ? "hidden" : "visible" })} />
      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm">
          {t("checks.save")}
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t("dialog.cancel")}
        </Button>
      </div>
    </form>
  );
}

function Verdict({ result, t }: { result: CheckResult | undefined; t: T }) {
  if (!result) return <Chip tone="neutral">{t("checks.notRun")}</Chip>;
  return (
    <span className="flex items-center gap-2">
      <Chip tone={result.ok ? "good" : "bad"}>{result.ok ? t("checks.pass") : t("checks.fail")}</Chip>
      {result.detail ? <span className="font-mono text-sm tabular-nums text-muted">{result.detail}</span> : null}
    </span>
  );
}

function Summary({ check, t }: { check: ProjectCheck; t: T }): ReactNode {
  const label = labelText(check);
  if (!isAuthorCheck(check)) return <span className="text-pretty font-semibold">{label}</span>;
  const { kind, fields } = summarise(check);
  return (
    <>
      <span className="text-pretty font-semibold">{label === generatedLabel(check) ? t(`checks.kind.${kind}`) : label}</span>
      {check.visibility === "hidden" ? (
        <span className="text-sm text-muted">{t("checks.hiddenValue")}</span>
      ) : (
        <span className="flex flex-wrap gap-x-3 text-sm text-muted">
          {Object.entries(fields).map(([name, value]) => (
            <span key={name}>
              {t(`checks.field.${name as FieldName}`)} <span className="font-mono tabular-nums text-ink">{value}</span>
            </span>
          ))}
        </span>
      )}
    </>
  );
}

export function ChecksEditor({ state, checks, results, running, problem, board, onChange, onRun, onCancel, messages, lang }: ChecksEditorProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/studio`), [lang, messages]);
  const [kind, setKind] = useState<AuthorCheckKind>(AUTHOR_CHECK_KINDS[0]);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState<ProjectCheck | null>(null);
  const [edited, setEdited] = useState<{ results: Map<string, CheckResult>; ids: ReadonlySet<string> }>({ results, ids: new Set() });
  const [hiddenNoted, setHiddenNoted] = useState(false);

  const stale = edited.results === results ? edited.ids : new Set<string>();
  const atLimit = checks.length >= MAX_CHECKS;

  function save(check: ProjectCheck) {
    onChange(setCheckOps(state, check));
    setEdited({ results, ids: new Set([...stale, check.id]) });
    if (check.visibility === "hidden") setHiddenNoted(true);
    leaveForm();
  }

  function leaveForm() {
    setEditing(null);
    setCreating(null);
  }

  function remove(id: string) {
    onChange(removeCheckOps(state, id));
    if (editing === id) leaveForm();
  }

  return (
    <section aria-label={t("checks.title")} className="flex min-h-0 flex-col gap-3" data-testid="checks-editor">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{t("checks.title")}</h3>
        <div className="flex gap-2">
          {running ? (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              {t("dialog.cancel")}
            </Button>
          ) : null}
          <Button variant="primary" size="sm" busy={running} disabled={checks.length === 0} onClick={onRun}>
            {running ? t("checks.running") : t("checks.run")}
          </Button>
        </div>
      </div>

      {problem ? <Callout tone="warn" live>{t(PROBLEM_KEY[problem])}</Callout> : null}
      {hiddenNoted ? <Callout variant="quiet">{t("checks.hiddenNote")}</Callout> : null}

      {checks.length === 0 && creating === null ? (
        <EmptyState icon="check-circle" title={t("checks.title")} className="py-8">
          {t("checks.empty")}
        </EmptyState>
      ) : (
        <ul className="flex min-h-0 flex-col gap-2 overflow-y-auto">
          {checks.map((check) => {
            const authored = isAuthorCheck(check);
            return (
              <li key={check.id} className="flex flex-col gap-2 rounded-lg px-3 py-2 hover:bg-hover">
                {editing === check.id && authored ? (
                  <CheckForm initial={check} onSave={save} onCancel={leaveForm} state={state} board={board} t={t} />
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1 text-sm">
                      <Summary check={check} t={t} />
                      <Verdict result={stale.has(check.id) ? undefined : results.get(check.id)} t={t} />
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {authored ? (
                        <Button variant="ghost" size="sm" aria-label={t("checks.edit", { name: labelText(check) })} onClick={() => setEditing(check.id)}>
                          {t("checks.editText")}
                        </Button>
                      ) : null}
                      <Button variant="ghost" size="sm" aria-label={t("checks.delete", { name: labelText(check) })} onClick={() => remove(check.id)}>
                        {t("checks.deleteText")}
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
          {creating ? (
            <li>
              <CheckForm initial={creating} onSave={save} onCancel={leaveForm} state={state} board={board} t={t} />
            </li>
          ) : null}
        </ul>
      )}
      {checks.length > 0 && results.size === 0 && !running ? <p className="text-sm text-muted">{t("checks.needsRun")}</p> : null}

      <div className="flex shrink-0 items-end gap-2">
        <div className="min-w-0 flex-1">
          <Select label={t("checks.kindLabel")} value={kind} onChange={(e) => setKind(e.target.value as AuthorCheckKind)}>
            {AUTHOR_CHECK_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`checks.kind.${k}`)}
              </option>
            ))}
          </Select>
        </div>
        <Button variant="secondary" size="sm" disabled={atLimit || editing !== null || creating !== null} onClick={() => setCreating(newCheck(kind, nextCheckId(checks), board))}>
          {t("checks.add")}
        </Button>
      </div>
    </section>
  );
}
