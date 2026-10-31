"use client";

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from "react";
import type { AiClient } from "@/ai/adapters/types";
import { applyReport, runConformance, type CheckId, type ConformanceReport } from "@/ai/conformance";
import type { ProvidersT } from "@/ai/messages";
import { isStale, type Price } from "@/ai/prices";
import { validateProfile, baseUrlProblem, newProfileId, type ProfileModel, type ProviderProfile } from "@/ai/profiles";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Select, TextInput } from "@/components/ui/Field";
import { Icon } from "@/components/ui/icons";
import { InlineStatus } from "@/components/ui/InlineStatus";
import { useLocale } from "@/i18n/client";
import { htmlLang } from "@/i18n/config";
import { newKeyId, type ProfileStore } from "@/local/ai-profiles";
import { validProviderKey } from "@/protocol/ai-relay";
import { PRESETS, type Preset } from "@/protocol/ai-presets";

const CUSTOM = "custom";
const LOOPBACK_HOSTS = new Set(["127.0.0.1", "[::1]", "localhost"]);
const TIER_LABELS = { fast: "form.tierFast", standard: "form.tierStandard", strong: "form.tierStrong" } as const;
const CHECK_IDS: readonly CheckId[] = ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10"];
const PRICE_SOURCE = "entered in settings";

type ModelDraft = {
  key: number;
  id: string;
  tier: string;
  context: string;
  output: string;
  priceIn: string;
  priceOut: string;
  /** The price the model came with. It keeps its date and cache rates while the two entered rates match it. */
  price?: Price;
};

type Test = { state: "idle" } | { state: "running" } | { state: "failed"; reason: "noModel" | "error" } | { state: "done"; report: ConformanceReport; blocked: boolean };

type ProviderFormProps = {
  /** The profile to edit, or null to add one. */
  initial: ProviderProfile | null;
  store: ProfileStore;
  host: AiClient;
  onSaved: (profile: ProviderProfile) => void;
  onClose: () => void;
  t: ProvidersT;
};

let nextKey = 0;

function draftOf(model?: ProfileModel): ModelDraft {
  return {
    key: nextKey++,
    id: model?.id ?? "",
    tier: model?.tier ?? "",
    context: model ? String(model.contextTokens) : "",
    output: model ? String(model.maxOutputTokens) : "",
    priceIn: model?.price ? String(model.price.in) : "",
    priceOut: model?.price ? String(model.price.out) : "",
    ...(model?.price ? { price: model.price } : {}),
  };
}

function isLoopback(baseUrl: string): boolean {
  try {
    return LOOPBACK_HOSTS.has(new URL(baseUrl).hostname);
  } catch {
    return false;
  }
}

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function priceOf(draft: ModelDraft, today: string): Price | null | "partial" {
  if (draft.priceIn.trim() === "" && draft.priceOut.trim() === "") return null;
  if (draft.priceIn.trim() === "" || draft.priceOut.trim() === "") return "partial";
  const input = Number(draft.priceIn);
  const output = Number(draft.priceOut);
  if (draft.price && draft.price.in === input && draft.price.out === output) return draft.price;
  return { in: input, out: output, cacheRead: null, cacheWrite: null, asOf: today, source: PRICE_SOURCE };
}

export function ProviderForm({ initial, store, host, onSaved, onClose, t }: ProviderFormProps) {
  const ids = useId();
  const locale = useLocale();
  const tag = htmlLang(locale);
  const [presetId, setPresetId] = useState(CUSTOM);
  const [label, setLabel] = useState(initial?.label ?? "");
  const [family, setFamily] = useState<ProviderProfile["family"]>(initial?.family ?? "openai-compat");
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? "");
  const [via, setVia] = useState<ProviderProfile["via"]>(initial?.via ?? "auto");
  const [models, setModels] = useState<ModelDraft[]>(() => (initial?.models ?? []).map(draftOf));
  const [keyDraft, setKeyDraft] = useState("");
  const [tail, setTail] = useState("");
  const [saved, setSaved] = useState(initial);
  const [problems, setProblems] = useState<string[]>([]);
  const [keyProblem, setKeyProblem] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [test, setTest] = useState<Test>({ state: "idle" });
  const run = useRef<AbortController | null>(null);
  const [openedAt] = useState(() => Date.now());

  const local = isLoopback(baseUrl.trim());
  const urlProblem = useMemo(() => (baseUrl.trim() === "" ? null : baseUrlProblem(baseUrl.trim().replace(/\/+$/, ""))), [baseUrl]);
  const dateFormat = useMemo(() => new Intl.DateTimeFormat(tag, { dateStyle: "medium", timeStyle: "short" }), [tag]);

  useEffect(() => {
    if (!initial) return;
    void store.maskedTail(initial.id).then(setTail);
  }, [initial, store]);
  useEffect(() => () => run.current?.abort(), []);

  function choosePreset(id: string) {
    setPresetId(id);
    const preset: Preset | undefined = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setLabel(preset.label);
    setFamily(preset.family);
    setBaseUrl(preset.baseUrl);
    setModels(preset.models.map((model) => draftOf(model)));
  }

  function setModel(key: number, patch: Partial<ModelDraft>) {
    setConfirmed(false);
    setModels((list) => list.map((m) => (m.key === key ? { ...m, ...patch } : m)));
  }

  /** Writes the profile when the form is valid and hands it back. */
  async function persist(): Promise<ProviderProfile | null> {
    const found: string[] = [];
    const today = new Date(openedAt).toISOString().slice(0, 10);
    const built: ProfileModel[] = [];
    models.forEach((draft) => {
      const price = priceOf(draft, today);
      if (price === "partial") found.push(t("form.priceBoth"));
      const model: Record<string, unknown> = { id: draft.id.trim(), contextTokens: Number(draft.context), maxOutputTokens: Number(draft.output) };
      if (draft.tier !== "") model["tier"] = draft.tier;
      if (price && price !== "partial") model["price"] = price;
      built.push(model as ProfileModel);
    });
    const secret = keyDraft === "" ? undefined : keyDraft;
    const badKey = secret !== undefined && !local && !validProviderKey(secret);
    const keyId = local ? null : (saved?.keyId ?? (secret !== undefined ? newKeyId(Math.random) : null));
    const candidate = {
      ...(saved ?? {}),
      id: saved?.id ?? newProfileId(Math.random),
      label: label.trim(),
      family,
      baseUrl: baseUrl.trim().replace(/\/+$/, ""),
      keyId,
      via,
      models: built,
    };
    const checked = validateProfile(candidate);
    if (!checked.ok) found.push(...checked.problems);
    setKeyProblem(badKey);
    setProblems(found);
    if (!checked.ok || found.length > 0 || badKey) return null;
    try {
      await store.put(checked.value, local ? undefined : secret);
    } catch {
      setProblems([t("test.error")]);
      return null;
    }
    setKeyDraft("");
    setSaved(checked.value);
    setTail(await store.maskedTail(checked.value.id));
    setConfirmed(true);
    onSaved(checked.value);
    return checked.value;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await persist();
  }

  async function runTest() {
    const profile = await persist();
    if (!profile) return;
    const model = profile.models[0];
    if (!model) {
      setTest({ state: "failed", reason: "noModel" });
      return;
    }
    const controller = new AbortController();
    run.current = controller;
    const origin = originOf(profile.baseUrl);
    let violated = false;
    const watch = (event: SecurityPolicyViolationEvent) => {
      if (origin !== null && originOf(event.blockedURI) === origin) violated = true;
    };
    document.addEventListener("securitypolicyviolation", watch);
    setTest({ state: "running" });
    try {
      const report = await runConformance({ client: host, profile, modelId: model.id, now: Date.now, signal: controller.signal });
      const next = applyReport(profile, report);
      await store.put(next);
      if (controller.signal.aborted) return;
      setSaved(next);
      const reached = report.results.find((r) => r.id === "C1")?.ok === true;
      setTest({ state: "done", report, blocked: violated && !reached });
    } catch {
      if (!controller.signal.aborted) setTest({ state: "failed", reason: "error" });
    } finally {
      document.removeEventListener("securitypolicyviolation", watch);
    }
  }

  const running = test.state === "running";
  const title = saved ? t("form.editTitle", { label: saved.label }) : t("form.addTitle");
  const priceDate = (m: ModelDraft) => (m.price && isStale(m.price, openedAt) ? m.price.asOf : null);

  return (
    <form onSubmit={submit} noValidate aria-labelledby={`${ids}-title`} className="flex flex-col gap-4 rounded-xl bg-sunken p-4">
      <h3 id={`${ids}-title`} className="text-base font-semibold">
        {title}
      </h3>

      {saved ? null : (
        <Select label={t("form.preset")} value={presetId} onChange={(event) => choosePreset(event.target.value)}>
          <option value={CUSTOM}>{t("form.custom")}</option>
          {PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
        </Select>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <TextInput label={t("form.label")} autoComplete="off" maxLength={60} value={label} onChange={(event) => setLabel(event.target.value)} />
        <Select label={t("form.family")} value={family} onChange={(event) => setFamily(event.target.value as ProviderProfile["family"])}>
          <option value="openai-compat">{t("form.familyOpenai")}</option>
          <option value="anthropic">{t("form.familyAnthropic")}</option>
        </Select>
      </div>

      <TextInput
        label={t("form.baseUrl")}
        inputMode="url"
        autoComplete="off"
        spellCheck={false}
        value={baseUrl}
        onChange={(event) => setBaseUrl(event.target.value)}
        error={urlProblem ?? undefined}
        hint={t("form.baseUrlHint")}
      />

      {local ? (
        <p className="text-sm text-muted">{t("form.keyLocal")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {tail !== "" ? (
            <p className="flex items-center gap-2 text-sm font-semibold tabular-nums">
              <Icon name="check" size={16} className="shrink-0 text-good" aria-hidden="true" />
              {t("form.keySaved", { tail })}
            </p>
          ) : null}
          <TextInput
            label={t("form.key")}
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={keyDraft}
            onChange={(event) => setKeyDraft(event.target.value)}
            error={keyProblem ? t("form.keyBad") : undefined}
            hint={tail !== "" ? t("form.keyKeep") : t("form.keyHint")}
          />
        </div>
      )}

      <Select label={t("form.via")} value={via} onChange={(event) => setVia(event.target.value as ProviderProfile["via"])}>
        <option value="auto">{t("form.viaAuto")}</option>
        <option value="direct">{t("form.viaDirect")}</option>
        <option value="relay">{t("form.viaRelay")}</option>
      </Select>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-semibold">{t("form.models")}</legend>
        {models.length === 0 ? <p className="text-sm text-muted">{t("form.modelsNone")}</p> : null}
        {models.map((model, i) => {
          const stale = priceDate(model);
          return (
            <div key={model.key} className="flex flex-col gap-2 rounded-lg bg-paper p-3">
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <TextInput label={t("form.modelId")} autoComplete="off" spellCheck={false} value={model.id} onChange={(event) => setModel(model.key, { id: event.target.value })} />
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label={t("form.modelRemove", { n: i + 1 })}
                  onClick={() => setModels((list) => list.filter((m) => m.key !== model.key))}
                >
                  <Icon name="close" size={16} aria-hidden="true" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Select label={t("form.tier")} value={model.tier} onChange={(event) => setModel(model.key, { tier: event.target.value })}>
                  <option value="">{t("form.tierNone")}</option>
                  {Object.entries(TIER_LABELS).map(([tier, key]) => (
                    <option key={tier} value={tier}>
                      {t(key)}
                    </option>
                  ))}
                </Select>
                <TextInput label={t("form.context")} inputMode="numeric" className="tabular-nums" value={model.context} onChange={(event) => setModel(model.key, { context: event.target.value })} />
                <TextInput label={t("form.output")} inputMode="numeric" className="tabular-nums" value={model.output} onChange={(event) => setModel(model.key, { output: event.target.value })} />
                <div className="grid grid-cols-2 gap-2 sm:contents">
                  <TextInput label={t("form.priceIn")} inputMode="decimal" className="tabular-nums" value={model.priceIn} onChange={(event) => setModel(model.key, { priceIn: event.target.value })} />
                  <TextInput label={t("form.priceOut")} inputMode="decimal" className="tabular-nums" value={model.priceOut} onChange={(event) => setModel(model.key, { priceOut: event.target.value })} />
                </div>
              </div>
              {stale ? <InlineStatus tone="warn">{t("form.priceStale", { date: stale })}</InlineStatus> : null}
            </div>
          );
        })}
        <div>
          <Button type="button" size="sm" variant="ghost" onClick={() => setModels((list) => [...list, draftOf()])}>
            {t("form.modelAdd")}
          </Button>
        </div>
      </fieldset>

      {problems.length > 0 ? (
        <ul role="alert" className="flex flex-col gap-1 text-sm text-bad">
          {problems.map((problem, i) => (
            <li key={i}>{problem}</li>
          ))}
        </ul>
      ) : null}
      {confirmed && problems.length === 0 ? <InlineStatus tone="good" live>{t("form.saved")}</InlineStatus> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary" disabled={running}>
          {t("form.save")}
        </Button>
        <Button type="button" variant="secondary" busy={running} onClick={() => void runTest()}>
          {running ? t("form.testing") : t("form.test")}
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          {t("form.close")}
        </Button>
      </div>

      <TestResults test={test} t={t} format={(at) => dateFormat.format(at)} />
    </form>
  );
}

function TestResults({ test, t, format }: { test: Test; t: ProvidersT; format: (at: number) => string }) {
  if (test.state === "failed") {
    return <InlineStatus tone="bad" live>{t(test.reason === "noModel" ? "test.noModel" : "test.error")}</InlineStatus>;
  }
  if (test.state !== "done") return null;
  const { report, blocked } = test;
  const failed = new Set(report.results.filter((r) => !r.ok).map((r) => r.id));
  return (
    <section aria-label={t("test.title")} className="flex flex-col gap-2">
      <h4 className="text-sm font-semibold">{t("test.title")}</h4>
      <p className="text-sm text-muted tabular-nums">{t("test.date", { date: format(report.at) })}</p>
      <ol className="flex flex-col gap-1">
        {CHECK_IDS.map((id) => {
          const result = report.results.find((r) => r.id === id);
          if (!result) return null;
          return (
            <li key={id} className="flex items-start gap-2 text-sm">
              <Icon name={result.ok ? "check-circle" : "warn-circle"} size={16} className={result.ok ? "mt-1 shrink-0 text-good" : "mt-1 shrink-0 text-bad"} aria-hidden="true" />
              <span className="min-w-0">
                <span className="font-semibold">{t(`test.check.${id}`)}</span>
                <span className="sr-only">: {t(result.ok ? "test.pass" : "test.fail")}.</span> <span className="text-muted">{result.detail}</span>
              </span>
            </li>
          );
        })}
      </ol>
      {failed.has("C4") ? <Callout tone="warn">{t("test.toolsOff")}</Callout> : null}
      {blocked ? <Callout tone="warn">{t("test.csp")}</Callout> : null}
    </section>
  );
}
