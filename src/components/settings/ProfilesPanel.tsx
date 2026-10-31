"use client";

import { useCallback, useEffect, useId, useMemo, useState, type FormEvent } from "react";
import type { AiClient } from "@/ai/adapters/types";
import type { ProvidersT } from "@/ai/messages";
import { DEFAULT_PRICES, PRICE_TABLE_ASOF, isStale } from "@/ai/prices";
import { DEFAULT_CAPS } from "@/ai/ledger";
import { newProfileId, type ProviderProfile } from "@/ai/profiles";
import type { Retention } from "@/ai/retention";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Select, TextInput } from "@/components/ui/Field";
import { InlineStatus } from "@/components/ui/InlineStatus";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Skeleton, SkeletonGroup } from "@/components/ui/Skeleton";
import { useLocale } from "@/i18n/client";
import { htmlLang } from "@/i18n/config";
import { importLegacyKey, newKeyId, type ProfileStore } from "@/local/ai-profiles";
import type { UsageStore } from "@/local/ai-usage";
import type { KeysBackend } from "@/local/keys-backend";
import { removeKey } from "@/lib/keys";
import { PRESETS } from "@/protocol/ai-presets";
import { ProviderForm } from "./ProviderForm";

const MAX_PROFILES = 12;
const MAX_USAGE_ROWS = 20_000;
const CAP_KEYS = ["dayUSD", "monthUSD", "sessionUSD", "dayTokens", "sessionTokens"] as const;
const RETENTIONS: readonly Retention[] = ["session", "project", "forever"];

type CapKey = (typeof CAP_KEYS)[number];

/** A missing field means the default, `null` means no cap. */
export type CapSettings = { [K in CapKey]?: number | null };

/** Where the caps and the retention choice are kept, and the one action that clears the AI stores. */
export interface AiSettings {
  caps(): CapSettings;
  setCaps(caps: CapSettings): void;
  retention(): Retention;
  setRetention(value: Retention): void;
  deleteData(): Promise<void>;
}

export type ProfilesPanelProps = {
  store: ProfileStore;
  usage: UsageStore;
  host: AiClient;
  settings: AiSettings;
  legacy: Pick<KeysBackend, "load" | "save">;
  t: ProvidersT;
};

type Tally = { tokens: number; usd: number; unpriced: number };
type Spent = { today: Tally; month: Tally; searchToday: number; searchMonth: number };
type View = { kind: "list" } | { kind: "form"; profile: ProviderProfile | null };
type CapParse = { ok: true; value: number | null | undefined } | { ok: false; reason: "zero" | "number" };

const EMPTY_TALLY: Tally = { tokens: 0, usd: 0, unpriced: 0 };

function localDay(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseCap(text: string, word: string): CapParse {
  const value = text.trim();
  if (value === "") return { ok: true, value: undefined };
  if (value.toLowerCase() === word.toLowerCase()) return { ok: true, value: null };
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return { ok: false, reason: "number" };
  if (number === 0) return { ok: false, reason: "zero" };
  return { ok: true, value: number };
}

function capText(value: number | null | undefined, word: string): string {
  if (value === undefined) return "";
  return value === null ? word : String(value);
}

async function readSpent(usage: UsageStore, nowMs: number): Promise<Spent> {
  const today = localDay(nowMs);
  const rows = await usage.rows(`${today.slice(0, 7)}-01`, MAX_USAGE_ROWS);
  const spent: Spent = { today: { ...EMPTY_TALLY }, month: { ...EMPTY_TALLY }, searchToday: 0, searchMonth: 0 };
  for (const row of rows) {
    const isToday = row.day === today;
    if (row.provider === "search") {
      spent.searchMonth++;
      if (isToday) spent.searchToday++;
      continue;
    }
    for (const tally of isToday ? [spent.today, spent.month] : [spent.month]) {
      tally.tokens += row.inTokens + row.outTokens;
      tally.usd += row.costUSD ?? 0;
      if (row.costUSD === null) tally.unpriced++;
    }
  }
  return spent;
}

/** The AI providers of this browser, their spending limits and what has been used. */
export function ProfilesPanel({ store, usage, host, settings, legacy, t }: ProfilesPanelProps) {
  const ids = useId();
  const locale = useLocale();
  const tag = htmlLang(locale);
  const [profiles, setProfiles] = useState<ProviderProfile[] | null>(null);
  const [tails, setTails] = useState<Record<string, string>>({});
  const [view, setView] = useState<View>({ kind: "list" });
  const [removing, setRemoving] = useState<string | null>(null);
  const [hasLegacy, setHasLegacy] = useState(false);
  const [legacyPreset, setLegacyPreset] = useState("anthropic");
  const [legacyFailed, setLegacyFailed] = useState(false);
  const [openedAt] = useState(() => Date.now());
  const [spent, setSpent] = useState<Spent | null>(null);
  const [retention, setRetention] = useState(() => settings.retention());
  const [deleting, setDeleting] = useState<"ask" | "done" | "failed" | null>(null);

  const refresh = useCallback(
    () =>
      store
        .list()
        .catch(() => [])
        .then(async (list) => {
          const entries = await Promise.all(list.map(async (p) => [p.id, await store.maskedTail(p.id).catch(() => "")] as const));
          const stored = await legacy.load().catch(() => null);
          setProfiles(list);
          setTails(Object.fromEntries(entries));
          setHasLegacy(stored?.ai != null);
        }),
    [store, legacy],
  );

  const refreshSpent = useCallback(() => readSpent(usage, Date.now()).then(setSpent, () => setSpent(null)), [usage]);

  useEffect(() => {
    void refresh();
    return store.subscribe(() => void refresh());
  }, [refresh, store]);
  useEffect(() => {
    void refreshSpent();
  }, [refreshSpent]);

  const numbers = useMemo(() => new Intl.NumberFormat(tag), [tag]);
  const money = useMemo(() => new Intl.NumberFormat(tag, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 }), [tag]);
  const dates = useMemo(() => new Intl.DateTimeFormat(tag, { dateStyle: "medium", timeStyle: "short" }), [tag]);

  async function importSavedKey() {
    setLegacyFailed(false);
    const preset = PRESETS.find((p) => p.id === legacyPreset);
    if (!preset) return;
    try {
      const key = await importLegacyKey(legacy);
      if (key === null) return;
      removeKey("ai");
      const profile: ProviderProfile = {
        id: newProfileId(Math.random),
        label: preset.label,
        family: preset.family,
        baseUrl: preset.baseUrl,
        keyId: newKeyId(Math.random),
        via: "auto",
        models: preset.models.map((m) => ({ ...m })),
      };
      await store.put(profile, key);
      setHasLegacy(false);
    } catch {
      setLegacyFailed(true);
    }
  }

  async function remove(id: string) {
    setRemoving(null);
    await store.remove(id).catch(() => undefined);
  }

  async function deleteData() {
    try {
      await settings.deleteData();
      setDeleting("done");
      void refreshSpent();
    } catch {
      setDeleting("failed");
    }
  }

  if (!profiles) {
    return (
      <SkeletonGroup label={t("list.title")} className="flex flex-col gap-2">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-16 w-full" />
      </SkeletonGroup>
    );
  }

  const priceDate = DEFAULT_PRICES[0]?.price;
  const priceStale = priceDate ? isStale(priceDate, openedAt) : false;

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby={`${ids}-providers`} className="flex flex-col gap-3">
        <div>
          <h3 id={`${ids}-providers`} className="text-base font-semibold">
            {t("list.title")}
          </h3>
          <p className="text-sm text-muted">{t("list.intro")}</p>
        </div>

        {store.persisted ? null : <InlineStatus tone="warn">{t("list.notPersisted")}</InlineStatus>}

        {hasLegacy && profiles.length === 0 ? (
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <Select label={t("legacy.offer")} value={legacyPreset} onChange={(event) => setLegacyPreset(event.target.value)}>
                {PRESETS.filter((p) => !p.local).map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </Select>
            </div>
            <Button variant="secondary" onClick={() => void importSavedKey()}>
              {t("legacy.use")}
            </Button>
            {legacyFailed ? <InlineStatus tone="bad" live>{t("legacy.failed")}</InlineStatus> : null}
          </div>
        ) : null}

        {profiles.length === 0 && view.kind === "list" ? <p className="text-sm text-muted">{t("list.empty")}</p> : null}

        <ul className="flex flex-col gap-2">
          {profiles.map((profile) => {
            const tail = tails[profile.id] ?? "";
            const last = profile.lastConformance;
            return (
              <li key={profile.id} className="flex flex-col gap-2 rounded-xl bg-sunken p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-base font-semibold">{profile.label}</p>
                    <p className="break-all text-sm text-muted">{profile.baseUrl}</p>
                    <p className="text-sm text-muted tabular-nums">
                      {profile.keyId === null ? t("list.local") : tail !== "" ? t("list.key", { tail }) : t("list.noKey")}
                      {" · "}
                      {t(`list.via.${profile.via}`)}
                    </p>
                    <p className="text-sm text-muted tabular-nums">
                      {last ? t("list.tested", { date: dates.format(last.at), passed: last.passed.length, total: last.passed.length + last.failed.length }) : t("list.untested")}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="ghost" aria-label={`${t("list.edit")}: ${profile.label}`} onClick={() => setView({ kind: "form", profile })}>
                      {t("list.edit")}
                    </Button>
                    <Button size="sm" variant="ghost" aria-label={`${t("list.remove")}: ${profile.label}`} onClick={() => setRemoving(profile.id)}>
                      {t("list.remove")}
                    </Button>
                  </div>
                </div>
                {removing === profile.id ? (
                  <div role="group" aria-label={t("list.removeAsk", { label: profile.label })} className="flex flex-wrap items-center gap-2">
                    <p className="text-sm">{t("list.removeAsk", { label: profile.label })}</p>
                    <Button size="sm" variant="danger" onClick={() => void remove(profile.id)}>
                      {t("list.removeYes")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setRemoving(null)}>
                      {t("list.removeNo")}
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>

        {view.kind === "form" ? (
          <ProviderForm
            key={view.profile?.id ?? "new"}
            initial={view.profile}
            store={store}
            host={host}
            onSaved={() => void refresh()}
            onClose={() => setView({ kind: "list" })}
            t={t}
          />
        ) : profiles.length >= MAX_PROFILES ? (
          <InlineStatus tone="info">{t("list.limit", { count: MAX_PROFILES })}</InlineStatus>
        ) : (
          <div>
            <Button variant="secondary" onClick={() => setView({ kind: "form", profile: null })}>
              {t("list.add")}
            </Button>
          </div>
        )}
      </section>

      <CapsForm settings={settings} t={t} />

      <section aria-labelledby={`${ids}-usage`} className="flex flex-col gap-2">
        <h3 id={`${ids}-usage`} className="text-base font-semibold">
          {t("usage.title")}
        </h3>
        {spent ? (
          <div className="flex flex-col gap-1 text-sm tabular-nums">
            <p>{t("usage.today", { tokens: numbers.format(spent.today.tokens), cost: money.format(spent.today.usd) })}</p>
            <p>{t("usage.month", { tokens: numbers.format(spent.month.tokens), cost: money.format(spent.month.usd) })}</p>
            {spent.month.unpriced > 0 ? <p className="text-muted">{t("usage.unpriced", { count: spent.month.unpriced })}</p> : null}
            <p>{t("usage.search", { today: numbers.format(spent.searchToday), month: numbers.format(spent.searchMonth) })}</p>
          </div>
        ) : null}
        <InlineStatus tone={priceStale ? "warn" : "info"}>{t(priceStale ? "prices.stale" : "prices.asOf", { date: PRICE_TABLE_ASOF })}</InlineStatus>
      </section>

      <section className="flex flex-col gap-3">
        <SegmentedControl
          label={t("retention.title")}
          value={retention}
          options={RETENTIONS.map((value) => ({ value, label: t(`retention.${value}`) }))}
          onChange={(value) => {
            settings.setRetention(value);
            setRetention(value);
          }}
        />
        {deleting === "ask" ? (
          <div role="group" aria-label={t("data.ask")} className="flex flex-wrap items-center gap-2">
            <p className="text-sm">{t("data.ask")}</p>
            <Button size="sm" variant="danger" onClick={() => void deleteData()}>
              {t("data.yes")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDeleting(null)}>
              {t("data.no")}
            </Button>
          </div>
        ) : (
          <div>
            <Button variant="secondary" onClick={() => setDeleting("ask")}>
              {t("data.delete")}
            </Button>
          </div>
        )}
        {deleting === "done" ? <InlineStatus tone="good" live>{t("data.done")}</InlineStatus> : null}
        {deleting === "failed" ? <InlineStatus tone="bad" live>{t("data.failed")}</InlineStatus> : null}
      </section>

      <Callout tone="note">
        <p>{t("notes.relay")}</p>
        <p>{t("notes.cap")}</p>
      </Callout>
    </div>
  );
}

function CapsForm({ settings, t }: { settings: AiSettings; t: ProvidersT }) {
  const ids = useId();
  const word = t("caps.word");
  const [drafts, setDrafts] = useState<Record<CapKey, string>>(() => {
    const current = settings.caps();
    return Object.fromEntries(CAP_KEYS.map((key) => [key, capText(current[key], word)])) as Record<CapKey, string>;
  });
  const [problems, setProblems] = useState<Partial<Record<CapKey, "zero" | "number">>>({});
  const [saved, setSaved] = useState(false);

  function save(event: FormEvent) {
    event.preventDefault();
    const found: Partial<Record<CapKey, "zero" | "number">> = {};
    const next: CapSettings = {};
    for (const key of CAP_KEYS) {
      const parsed = parseCap(drafts[key], word);
      if (!parsed.ok) found[key] = parsed.reason;
      else if (parsed.value !== undefined) next[key] = parsed.value;
    }
    setProblems(found);
    setSaved(false);
    if (Object.keys(found).length > 0) return;
    settings.setCaps(next);
    setSaved(true);
  }

  return (
    <form onSubmit={save} noValidate aria-labelledby={`${ids}-caps`} className="flex flex-col gap-3">
      <div>
        <h3 id={`${ids}-caps`} className="text-base font-semibold">
          {t("caps.title")}
        </h3>
        <p className="text-sm text-muted">{t("caps.hint", { word })}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {CAP_KEYS.map((key) => {
          const problem = problems[key];
          return (
            <TextInput
              key={key}
              label={t(`caps.${key}`)}
              autoComplete="off"
              inputMode="decimal"
              className="tabular-nums"
              placeholder={t("caps.default", { value: DEFAULT_CAPS[key] ?? word })}
              value={drafts[key]}
              onChange={(event) => {
                setSaved(false);
                setDrafts((d) => ({ ...d, [key]: event.target.value }));
              }}
              error={problem ? t(problem === "zero" ? "caps.zero" : "caps.number", { word }) : undefined}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="secondary">
          {t("caps.save")}
        </Button>
        {saved ? <InlineStatus tone="good" live>{t("caps.saved")}</InlineStatus> : null}
      </div>
    </form>
  );
}
