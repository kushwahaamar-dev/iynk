"use client";

import { useEffect, useId, useMemo, useReducer, useRef, useState, useSyncExternalStore } from "react";
import type { ChangeEvent } from "react";
import { Button, Callout, Dialog, InlineStatus, Select, Tabs, TextArea, TextInput } from "@/components/ui";
import type { TabItem } from "@/components/ui";
import type { Diagnostic } from "@/core/result";
import { sha256Hex } from "@/core/sha256";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import { StoreFullError } from "@/local/parts-store";
import type { PutResult } from "@/local/parts-store";
import { checkPng, sanitizeSvg, svgToDataUrl } from "@/parts/art-sanitize";
import type { ArtError } from "@/parts/art-sanitize";
import { digestOf, versionCompare } from "@/parts/descriptor";
import type { Descriptor as ComponentDescriptor } from "@/parts/descriptor";
import { fallbackSpec, pinsCovered } from "@/parts/fallback";
import { classifyChange, requiredNextVersion } from "@/parts/versions";
import { draftFromDescriptor, draftIssues, newDraft, reduceDraft, slugFor, toDescriptor } from "@/studio/parts/draft";
import type { DraftAction, DraftGroup, PartDraft } from "@/studio/parts/draft";
import { PinTable } from "./PinTable";
import type { PartEditorT } from "./PinTable";

export interface PartEditorProps {
  baseKey?: string;
  library: {
    existingKeys(): ReadonlySet<string>;
    get(id: string, version: string): ComponentDescriptor | undefined;
    save(def: ComponentDescriptor, files: ReadonlyMap<string, Blob>): Promise<PutResult>;
  };
  onSaved(def: ComponentDescriptor): void;
  onClose(): void;
  messages: Messages["parteditor"];
  lang: Locale;
}

type Library = PartEditorProps["library"];

const DRAFT_KEY = "iynk:part-draft:v1";
const DEBOUNCE_MS = 250;
const NARROW = "(max-width: 639px)";
const SEMVER = /^\d+\.\d+\.\d+$/;

const CATEGORIES: readonly PartDraft["category"][] = [
  "microcontroller", "dev-board", "passive", "semiconductor", "sensor", "actuator", "motor-driver", "power",
  "display", "communication", "mechanical", "robotics", "drone", "fpga", "instrument", "virtual",
];
const KINDS: readonly PartDraft["kind"][] = [
  "ic", "module", "discrete", "board", "electromechanical", "sensor", "actuator", "connector", "mechanical", "instrument", "virtual",
];
const RENDERERS: readonly PartDraft["fallback"]["renderer"][] = [
  "generic-two-lead", "generic-dip", "generic-header-module", "generic-terminal-module", "generic-box",
];
const GROUP_KINDS: readonly DraftGroup["kind"][] = ["internal-short", "strip", "plane"];

type Section = "identity" | "pins" | "footprint" | "rest";

const sectionOf = (path: string): Section => {
  const head = path.split("/")[1];
  if (head === "pins" || head === "groups") return "pins";
  if (head === "dimensions" || head === "visual") return "footprint";
  if (head === "id" || head === "version" || head === "identity" || head === "provenance") return "identity";
  return "rest";
};

const splitKey = (key: string) => {
  const at = key.lastIndexOf("@");
  return { id: key.slice(0, at), version: key.slice(at + 1) };
};

const localSlugs = (keys: ReadonlySet<string>): Set<string> =>
  new Set([...keys].map((key) => splitKey(key).id).filter((id) => id.startsWith("local.")).map((id) => id.slice("local.".length)));

function readStored(): PartDraft | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null");
    const draft = value as PartDraft | null;
    return draft && typeof draft.name === "string" && (draft.mode === "form" || draft.mode === "json") && Array.isArray(draft.pins) ? draft : null;
  } catch {
    return null;
  }
}

function writeStored(draft: PartDraft | null): void {
  try {
    if (draft) localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...draft, issue: undefined, lastCascade: undefined }));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    // the editor works without the convenience copy
  }
}

interface Boot {
  draft: PartDraft;
  restored: boolean;
  missing: boolean;
  copyOf: boolean;
}

function boot(baseKey: string | undefined, library: Library): Boot {
  const now = new Date().toISOString();
  if (baseKey === undefined) {
    const stored = readStored();
    return stored && stored.baseKey === undefined
      ? { draft: stored, restored: true, missing: false, copyOf: false }
      : { draft: newDraft(now), restored: false, missing: false, copyOf: false };
  }
  const { id, version } = splitKey(baseKey);
  const base = library.get(id, version);
  if (!base) return { draft: newDraft(now), restored: false, missing: true, copyOf: false };
  const draft = draftFromDescriptor(base);
  if (id.startsWith("local.")) return { draft: { ...draft, baseKey }, restored: false, missing: false, copyOf: false };
  const slug = slugFor(draft.name, localSlugs(library.existingKeys()));
  return { draft: { ...draft, slug, version: "1.0.0" }, restored: false, missing: false, copyOf: true };
}

function withVersion(draft: PartDraft, version: string): PartDraft {
  if (draft.mode === "form") return { ...draft, version };
  try {
    const parsed: unknown = JSON.parse(draft.rawJson ?? "");
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return draft;
    return { ...draft, rawJson: JSON.stringify({ ...parsed, version }, null, 2) };
  } catch {
    return draft;
  }
}

interface Analysis {
  issues: Diagnostic[];
  version: string;
  /** Set when this edits a saved part: the lowest version the changes allow, and why. */
  required?: string;
  reasons: string[];
  tooLow: boolean;
}

function analyse(draft: PartDraft, chosen: string, library: Library, digests: Map<string, string>): Analysis {
  const keys = library.existingKeys();
  const installed = new Map<string, string>();
  for (const key of keys) {
    let digest = digests.get(key);
    if (digest === undefined) {
      const { id, version } = splitKey(key);
      const def = library.get(id, version);
      if (!def) continue;
      digest = digestOf(def);
      digests.set(key, digest);
    }
    installed.set(key, digest);
  }

  const next = toDescriptor(draft);
  const base = draft.baseKey ? splitKey(draft.baseKey) : undefined;
  const prev = base && base.id === next.id ? library.get(base.id, base.version) : undefined;
  let version = draft.mode === "form" ? draft.version : next.version;
  let required: string | undefined;
  let reasons: string[] = [];
  let tooLow = false;
  if (prev) {
    const unversioned = { ...next, version: prev.version };
    reasons = classifyChange(prev, unversioned).reasons;
    required = requiredNextVersion(prev, unversioned);
    tooLow = SEMVER.test(chosen) && versionCompare(chosen, required) < 0;
    version = SEMVER.test(chosen) && !tooLow ? chosen : required;
  }
  return { issues: draftIssues(withVersion(draft, version), { installed, existingKeys: keys }), version, required, reasons, tooLow };
}

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; key: string }
  | { kind: "blocked"; count: number }
  | { kind: "conflict"; installed: string; incoming: string }
  | { kind: "full" }
  | { kind: "failed" };

interface Art {
  url?: string;
  error?: ArtError;
  stripped?: string[];
}

function useNarrow(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia?.(NARROW);
      query?.addEventListener("change", notify);
      return () => query?.removeEventListener("change", notify);
    },
    () => window.matchMedia?.(NARROW).matches ?? false,
    () => false,
  );
}

export function PartEditor({ baseKey, library, onSaved, onClose, messages, lang }: PartEditorProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/parteditor`), [lang, messages]);
  const [start] = useState(() => boot(baseKey, library));
  const [draft, dispatch] = useReducer(reduceDraft, start.draft);
  const [restored, setRestored] = useState(start.restored);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [chosen, setChosen] = useState("");
  const [tab, setTab] = useState("identity");
  const [leaving, setLeaving] = useState(false);
  const [art, setArt] = useState<Art>({});
  const files = useRef(new Map<string, Blob>());
  const [digests] = useState(() => new Map<string, string>());
  const narrow = useNarrow();
  const headingId = useId();

  const [analysis, setAnalysis] = useState(() => analyse(draft, chosen, library, digests));
  useEffect(() => {
    const timer = setTimeout(() => setAnalysis(analyse(draft, chosen, library, digests)), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, chosen, library, digests]);

  useEffect(() => {
    if (!draft.dirty || draft.baseKey) return;
    const timer = setTimeout(() => writeStored(draft), 500);
    return () => clearTimeout(timer);
  }, [draft]);

  useEffect(() => {
    if (!draft.dirty) return;
    const guard = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [draft.dirty]);

  useEffect(() => {
    const url = art.url;
    return () => {
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
    };
  }, [art.url]);

  const edit = (action: DraftAction) => {
    setStatus({ kind: "idle" });
    dispatch(action);
  };

  const shown = draft.mode === "json" ? "json" : tab;
  const errors = analysis.issues.filter((i) => i.severity === "error");
  const descriptor = useMemo(() => toDescriptor(draft), [draft]);
  const otherSlugs = () => localSlugs(library.existingKeys());

  function setName(name: string) {
    edit({ type: "setField", field: "name", value: name });
    if (draft.baseKey !== undefined) return;
    const slugs = otherSlugs();
    if (draft.slug === "" || draft.slug === slugFor(draft.name, slugs)) {
      dispatch({ type: "setField", field: "slug", value: slugFor(name, slugs) });
    }
  }

  function pickTab(id: string) {
    setTab(id);
    edit({ type: "switchMode", mode: id === "json" ? "json" : "form" });
  }

  async function addArt(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const png = file.type === "image/png" || /\.png$/i.test(file.name);
    let stored: Uint8Array<ArrayBuffer> = bytes;
    let url: string;
    let stripped: string[] = [];
    if (png) {
      const checked = checkPng(bytes);
      if (!checked.ok) return setArt({ error: checked.error });
      url = URL.createObjectURL(new Blob([bytes], { type: "image/png" }));
    } else {
      const cleaned = sanitizeSvg(new TextDecoder().decode(bytes));
      if (!cleaned.ok) return setArt({ error: cleaned.error });
      stored = new TextEncoder().encode(cleaned.svg);
      url = svgToDataUrl(cleaned.svg);
      stripped = [...cleaned.removed.elements, ...cleaned.removed.attributes];
    }
    const sha256 = sha256Hex(stored);
    const mediaType = png ? "image/png" : "image/svg+xml";
    const path = `art/${sha256.slice(0, 12)}.${png ? "png" : "svg"}`;
    files.current = new Map([[path, new Blob([stored], { type: mediaType })]]);
    edit({ type: "applyPatch", patch: { assets: [{ path, mediaType, sha256, license: draft.license }] } });
    setArt({ url, stripped });
  }

  function removeArt() {
    files.current = new Map();
    setArt({});
    edit({ type: "applyPatch", patch: { assets: [] } });
  }

  async function save() {
    const result = analyse(draft, chosen, library, digests);
    setAnalysis(result);
    const blocking = result.issues.filter((i) => i.severity === "error").length + (result.tooLow ? 1 : 0);
    if (blocking > 0) {
      setStatus({ kind: "blocked", count: blocking });
      return;
    }
    setStatus({ kind: "saving" });
    const def = toDescriptor(withVersion(draft, result.version), new Date().toISOString());
    const key = `${def.id}@${def.version}`;
    try {
      const put = await library.save(def, files.current);
      if (put === "conflict") {
        const stored = library.get(def.id, def.version);
        setStatus({ kind: "conflict", installed: stored ? digestOf(stored) : "", incoming: digestOf(def) });
        return;
      }
      writeStored(null);
      onSaved(def);
      dispatch({ type: "reset", draft: { ...draftFromDescriptor(def), baseKey: key, testFiles: draft.testFiles, template: draft.template } });
      setChosen("");
      setStatus({ kind: "saved", key });
    } catch (error) {
      setStatus({ kind: error instanceof StoreFullError ? "full" : "failed" });
    }
  }

  function startOver() {
    writeStored(null);
    setRestored(false);
    files.current = new Map();
    setArt({});
    edit({ type: "reset", draft: newDraft(new Date().toISOString()) });
  }

  function close() {
    if (draft.dirty) setLeaving(true);
    else onClose();
  }

  const sectionCount = (section: Section) => errors.filter((i) => sectionOf(i.path) === section).length;
  const badge = (section: Section) => (sectionCount(section) > 0 ? String(sectionCount(section)) : undefined);
  const body = (content: React.ReactNode) => (
    <fieldset disabled={narrow} className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
      {content}
    </fieldset>
  );

  const tabs: TabItem[] = [
    {
      id: "identity",
      label: t("tabs.identity"),
      badge: badge("identity"),
      content: body(
        <>
          <TextInput label={t("identity.name")} hint={t("identity.nameHint")} value={draft.name} onChange={(e) => setName(e.target.value)} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label={t("identity.manufacturer")} value={draft.manufacturer} onChange={(e) => edit({ type: "setField", field: "manufacturer", value: e.target.value })} />
            <TextInput label={t("identity.model")} value={draft.model} onChange={(e) => edit({ type: "setField", field: "model", value: e.target.value })} />
            <Select label={t("identity.category")} value={draft.category} onChange={(e) => edit({ type: "setField", field: "category", value: e.target.value })}>
              {CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
            <Select label={t("identity.kind")} value={draft.kind} onChange={(e) => edit({ type: "setField", field: "kind", value: e.target.value })}>
              {KINDS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </div>
          <TextArea label={t("identity.description")} rows={3} value={draft.description} onChange={(e) => edit({ type: "setField", field: "description", value: e.target.value })} />
          <p className="font-mono text-sm text-muted">{t("identity.savedAs", { id: `${descriptor.id}@${analysis.version}` })}</p>
        </>,
      ),
    },
    {
      id: "pins",
      label: t("tabs.pins"),
      badge: badge("pins"),
      content: body(
        <>
          <PinTable pins={draft.pins} dispatch={edit} issues={analysis.issues} t={t} />
          <GroupEditor draft={draft} dispatch={edit} t={t} />
        </>,
      ),
    },
    {
      id: "footprint",
      label: t("tabs.footprint"),
      badge: badge("footprint"),
      content:
        shown === "footprint"
          ? body(<FootprintTab draft={draft} descriptor={descriptor} dispatch={edit} t={t} art={art} onArt={addArt} onRemoveArt={removeArt} />)
          : null,
    },
    {
      id: "json",
      label: t("tabs.json"),
      content: body(
        <TextArea
          label={t("json.label")}
          hint={t("json.hint")}
          rows={24}
          spellCheck={false}
          className="font-mono text-sm"
          value={draft.rawJson ?? ""}
          onChange={(e) => edit({ type: "setRawJson", text: e.target.value })}
        />,
      ),
    },
  ];

  const lowerHint = analysis.required ? t("save.lower", { version: analysis.required }) : undefined;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} className="text-balance text-2xl font-semibold">
          {draft.baseKey ? t("editTitle", { name: draft.name }) : t("newTitle")}
        </h2>
        <Button variant="ghost" onClick={close}>
          {t("close")}
        </Button>
      </header>

      {narrow ? <Callout tone="note">{t("readOnly")}</Callout> : null}
      {start.missing ? <Callout tone="note">{t("notFound")}</Callout> : null}
      {start.copyOf ? <Callout tone="note">{t("copyNote", { id: `local.${draft.slug}` })}</Callout> : null}
      {restored ? (
        <div className="flex flex-wrap items-center gap-3">
          <InlineStatus tone="info">{t("restored")}</InlineStatus>
          <Button size="sm" variant="ghost" onClick={startOver}>
            {t("startOver")}
          </Button>
        </div>
      ) : null}
      {draft.issue ? <InlineStatus tone="bad" live>{draft.issue.message}</InlineStatus> : null}
      {draft.lastCascade?.length ? <InlineStatus tone="warn" live>{t("pins.cascade", { where: draft.lastCascade.join(", ") })}</InlineStatus> : null}

      <Tabs label={t("tabs.label")} tabs={tabs} value={shown} onChange={pickTab} />

      <IssueList issues={analysis.issues} t={t} />

      <div className="flex flex-col gap-3 border-t border-rule pt-4">
        {analysis.required ? (
          <div className="flex max-w-md flex-col gap-2">
            <TextInput
              label={t("save.version")}
              value={chosen || analysis.required}
              error={analysis.tooLow ? lowerHint : undefined}
              hint={analysis.reasons.length > 0 ? t("save.because", { version: analysis.version, reasons: analysis.reasons.join("; ") }) : undefined}
              onChange={(e) => setChosen(e.target.value.trim())}
              className="font-mono"
            />
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" onClick={save} busy={status.kind === "saving"} disabled={narrow}>
            {status.kind === "saving" ? t("save.saving") : t("save.button")}
          </Button>
          <SaveStatus status={status} t={t} />
        </div>
      </div>

      <Dialog
        open={leaving}
        onClose={() => setLeaving(false)}
        title={t("discard.title")}
        description={t("discard.body")}
        closeLabel={t("close")}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setLeaving(false)}>
              {t("discard.keep")}
            </Button>
            <Button variant="secondary" onClick={onClose}>
              {t("discard.confirm")}
            </Button>
          </>
        }
      />
    </section>
  );
}

function SaveStatus({ status, t }: { status: Status; t: PartEditorT }) {
  switch (status.kind) {
    case "saved":
      return <InlineStatus tone="good" live>{t("save.saved", { key: status.key })}</InlineStatus>;
    case "blocked":
      return <InlineStatus tone="bad" live>{t("save.blocked", { count: status.count })}</InlineStatus>;
    case "conflict":
      return <InlineStatus tone="bad" live>{t("save.conflict", { installed: status.installed, incoming: status.incoming })}</InlineStatus>;
    case "full":
      return <InlineStatus tone="bad" live>{t("save.full")}</InlineStatus>;
    case "failed":
      return <InlineStatus tone="bad" live>{t("save.failed")}</InlineStatus>;
    default:
      return null;
  }
}

function IssueList({ issues, t }: { issues: Diagnostic[]; t: PartEditorT }) {
  const sections: Section[] = ["identity", "pins", "footprint", "rest"];
  const errorCount = issues.filter((i) => i.severity === "error").length;
  return (
    <section aria-label={t("issues.heading")} className="flex flex-col gap-2">
      <h3 className="kicker">
        {t("issues.heading")}
        {errorCount > 0 ? `, ${t("issues.count", { count: errorCount })}` : ""}
      </h3>
      {issues.length === 0 ? (
        <InlineStatus tone="good">{t("issues.none")}</InlineStatus>
      ) : (
        sections.map((section) => {
          const rows = issues.filter((i) => sectionOf(i.path) === section);
          if (rows.length === 0) return null;
          return (
            <div key={section}>
              <h4 className="text-sm font-semibold">{t(`issues.sections.${section}`)}</h4>
              <ul className="mt-1 flex flex-col gap-1">
                {rows.map((issue, index) => (
                  <li key={`${issue.code}${issue.path}${index}`}>
                    <InlineStatus tone={issue.severity === "error" ? "bad" : "warn"}>
                      <span className="font-mono text-muted">{issue.path || "/"}</span> {issue.message}
                      {issue.hint ? ` (${issue.hint})` : ""}
                    </InlineStatus>
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}
    </section>
  );
}

function GroupEditor({ draft, dispatch, t }: { draft: PartDraft; dispatch: (a: DraftAction) => void; t: PartEditorT }) {
  return (
    <section className="flex flex-col gap-3 border-t border-rule pt-4">
      <h3 className="text-base font-semibold">{t("pins.groups.heading")}</h3>
      <p className="text-sm text-muted">{t("pins.groups.hint")}</p>
      {draft.groups.length === 0 ? <p className="text-sm text-muted">{t("pins.groups.empty")}</p> : null}
      {draft.groups.map((group) => (
        <div key={group.id} className="flex flex-col gap-2 rounded-lg bg-sunken p-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-48">
              <Select
                label={t("pins.groups.kindLabel", { id: group.id })}
                value={group.kind}
                onChange={(e) => dispatch({ type: "setField", field: "groups", value: draft.groups.map((g) => (g.id === group.id ? { ...g, kind: e.target.value } : g)) })}
              >
                {GROUP_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {t(`pins.groups.kind.${kind}`)}
                  </option>
                ))}
              </Select>
            </div>
            <Button size="sm" variant="ghost" onClick={() => dispatch({ type: "removeGroup", id: group.id })}>
              {t("pins.groups.remove", { id: group.id })}
            </Button>
          </div>
          <fieldset className="m-0 flex flex-wrap gap-x-4 gap-y-2 border-0 p-0">
            <legend className="field-label mb-1">{t("pins.groups.pinsLabel", { id: group.id })}</legend>
            {draft.pins.map((pin) => (
              <label key={pin.uid} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={group.pins.includes(pin.id)}
                  onChange={(e) =>
                    dispatch({
                      type: "setGroupPins",
                      id: group.id,
                      pins: e.target.checked ? [...group.pins, pin.id] : group.pins.filter((id) => id !== pin.id),
                    })
                  }
                />
                <span className="font-mono">{pin.id}</span>
              </label>
            ))}
          </fieldset>
        </div>
      ))}
      <div>
        <Button variant="secondary" onClick={() => dispatch({ type: "addGroup" })}>
          {t("pins.groups.add")}
        </Button>
      </div>
    </section>
  );
}

interface FootprintTabProps {
  draft: PartDraft;
  descriptor: ComponentDescriptor;
  dispatch: (a: DraftAction) => void;
  t: PartEditorT;
  art: Art;
  onArt(event: ChangeEvent<HTMLInputElement>): void;
  onRemoveArt(): void;
}

function FootprintTab({ draft, descriptor, dispatch, t, art, onArt, onRemoveArt }: FootprintTabProps) {
  const number = (field: "w" | "h" | "d" | "accuracy", label: string) => (
    <TextInput
      key={field}
      label={label}
      type="number"
      step="0.01"
      min="0"
      defaultValue={draft.body[field]}
      onChange={(e) => {
        const value = e.target.valueAsNumber;
        if (Number.isFinite(value)) dispatch({ type: "setField", field: "body", value: { ...draft.body, [field]: value } });
      }}
    />
  );
  const asset = draft.assets[0];
  const fileId = useId();

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <h3 className="text-base font-semibold">{t("footprint.heading")}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {number("w", t("footprint.width"))}
            {number("h", t("footprint.height"))}
            {number("d", t("footprint.depth"))}
            {number("accuracy", t("footprint.accuracy"))}
          </div>
          <Select label={t("footprint.renderer")} value={draft.fallback.renderer} onChange={(e) => dispatch({ type: "setFallback", patch: { renderer: e.target.value as PartDraft["fallback"]["renderer"] } })}>
            {RENDERERS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
          <TextInput label={t("footprint.label")} value={draft.fallback.label} onChange={(e) => dispatch({ type: "setFallback", patch: { label: e.target.value } })} />
          <TextInput label={t("footprint.colour")} value={draft.fallback.bodyColour} className="font-mono" onChange={(e) => dispatch({ type: "setFallback", patch: { bodyColour: e.target.value } })} />
          <label className="flex items-center gap-2 text-base">
            <input type="checkbox" checked={draft.fallback.showPinLabels} onChange={(e) => dispatch({ type: "setFallback", patch: { showPinLabels: e.target.checked } })} />
            {t("footprint.showLabels")}
          </label>
        </div>
        <FootprintPreview descriptor={descriptor} t={t} />
      </div>

      {draft.pins.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h3 className="text-base font-semibold">{t("footprint.positions")}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {draft.pins.map((pin) => (
              <div key={pin.uid} className="grid grid-cols-2 gap-2">
                <TextInput
                  label={t("footprint.x", { id: pin.id })}
                  type="number"
                  step="0.01"
                  defaultValue={pin.x}
                  hint={pin.unplaced ? t("footprint.unplaced") : undefined}
                  onChange={(e) => Number.isFinite(e.target.valueAsNumber) && dispatch({ type: "movePin", uid: pin.uid, x: e.target.valueAsNumber, y: pin.y })}
                />
                <TextInput
                  label={t("footprint.y", { id: pin.id })}
                  type="number"
                  step="0.01"
                  defaultValue={pin.y}
                  onChange={(e) => Number.isFinite(e.target.valueAsNumber) && dispatch({ type: "movePin", uid: pin.uid, x: pin.x, y: e.target.valueAsNumber })}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-3 border-t border-rule pt-4">
        <h3 className="text-base font-semibold">{t("footprint.art.heading")}</h3>
        <p className="text-sm text-muted">{t("footprint.art.hint")}</p>
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor={fileId} className="cursor-pointer rounded-lg bg-sunken px-3 py-2 text-base font-semibold motion-fade hover:bg-hover has-focus-visible:outline-2">
            {t("footprint.art.upload")}
            <input id={fileId} type="file" accept="image/svg+xml,image/png,.svg,.png" className="sr-only" onChange={onArt} />
          </label>
          {asset ? (
            <Button variant="ghost" onClick={onRemoveArt}>
              {t("footprint.art.remove")}
            </Button>
          ) : null}
        </div>
        {art.error ? <InlineStatus tone="bad" live>{t(`footprint.art.error.${art.error}`)}</InlineStatus> : null}
        {art.stripped?.length ? <InlineStatus tone="warn">{t("footprint.art.stripped", { what: art.stripped.join(", ") })}</InlineStatus> : null}
        {art.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={art.url} alt="" className="size-32 rounded-lg bg-sunken object-contain p-2" />
        ) : null}
        {asset ? (
          <div className="max-w-sm">
            <TextInput
              label={t("footprint.art.license")}
              value={asset.license}
              className="font-mono"
              onChange={(e) => dispatch({ type: "applyPatch", patch: { assets: [{ ...asset, license: e.target.value }] } })}
            />
          </div>
        ) : null}
      </section>
    </>
  );
}

function FootprintPreview({ descriptor, t }: { descriptor: ComponentDescriptor; t: PartEditorT }) {
  const drawn = useMemo(() => {
    try {
      const spec = fallbackSpec(descriptor);
      return { spec, covered: pinsCovered(descriptor, spec) };
    } catch {
      return null;
    }
  }, [descriptor]);
  if (!drawn) return null;

  const { spec, covered } = drawn;
  const { w, h } = spec.bounds_mm;
  const unit = Math.max(w, h, 1) / 40;
  const flip = (y: number) => h - y;

  return (
    <div className="flex flex-col gap-2">
      <svg viewBox={`${-unit * 4} ${-unit * 4} ${w + unit * 8} ${h + unit * 8}`} role="img" aria-label={t("footprint.previewLabel")} className="max-h-72 w-full rounded-lg bg-sunken text-accent">
        <rect x={0} y={flip(spec.body_mm.h)} width={spec.body_mm.w} height={spec.body_mm.h} rx={unit} fill={spec.bodyColour ?? "currentColor"} fillOpacity={0.35} stroke="currentColor" strokeWidth={unit / 2} />
        {spec.pins.map((pin) => (
          <g key={pin.id}>
            <circle cx={pin.x_mm} cy={flip(pin.y_mm)} r={unit} fill="currentColor" />
            {spec.showPinLabels ? (
              <text x={pin.x_mm} y={flip(pin.y_mm) - unit * 1.8} fontSize={unit * 2.4} textAnchor="middle" fill="currentColor">
                {pin.id}
              </text>
            ) : null}
          </g>
        ))}
      </svg>
      {covered.ok ? null : <InlineStatus tone="warn">{t("footprint.outside", { pins: covered.outside.join(", ") })}</InlineStatus>}
    </div>
  );
}
