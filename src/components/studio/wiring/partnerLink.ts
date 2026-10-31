import type { PartnerHost, PartnerStatus, UiHost as PanelUi } from "@/components/ai";
import type { PackPreview } from "@/components/ai/WhatItSees";
import type { AiClient } from "@/ai/adapters/types";
import { chooseProfile } from "@/ai/context/budget";
import { makeNonce } from "@/ai/context/fences";
import { buildPack, type SourceId } from "@/ai/context/pack";
import { redactSecrets } from "@/ai/context/redact";
import { aiError } from "@/ai/errors";
import { HISTORY_TOKENS, localDay, runTurn, type TurnEvent } from "@/ai/host/turn";
import { newId, newThread, toMessages, type Thread, type Turn } from "@/ai/host/thread";
import type { Caps, Ledger } from "@/ai/ledger";
import type { AiLogRow } from "@/ai/log";
import { MODE_SETTINGS, type Mode } from "@/ai/modes";
import type { ProfileModel, ProviderProfile } from "@/ai/profiles";
import type { Retention } from "@/ai/retention";
import { createSeenUrls } from "@/ai/render/links";
import type { ItemState, PartnerSources, PartRegistryView, RuleFinding, RunSnapshot } from "@/ai/sources";
import { parseRef } from "@/ai/tools/refs";
import { createToolRunner, type UiHost as ToolUi } from "@/ai/tools/registry";
import type { Locale } from "@/i18n/config";
import type { ProfileStore } from "@/local/ai-profiles";
import type { ThreadStore } from "@/local/ai-threads";
import type { Diagnosis } from "@/project/diagnosis";
import { stateHash } from "@/project/hash";
import type { DocStore } from "@/studio/stores/doc";
import type { RunStore, RunView } from "@/studio/stores/run";
import type { SessionStore } from "@/studio/stores/session";
import type { UiStore } from "@/studio/stores/ui";

export interface PartnerLinkDeps {
  doc: DocStore;
  run: RunStore;
  session: SessionStore;
  profiles: ProfileStore;
  ledger: Ledger;
  ai: AiClient;
  threads: ThreadStore;
  server: () => { ready: boolean; url: string | null };
  locale: () => Locale;
  registry: () => PartRegistryView;
  rules: (scope?: readonly string[]) => readonly RuleFinding[];
  traceOf: PartnerSources["trace"];
  diagnoses: () => readonly Diagnosis[];
  itemState: () => ItemState | null;
  ui: ToolUi;
  openSettings: () => void;
  caps: () => Caps;
  log: (row: AiLogRow) => Promise<void>;
  retention: () => Retention;
  random(): number;
  now(): number;
}

type Choice = { profile: ProviderProfile; model: ProfileModel; hasKey: boolean };

const PIN_LEVELS = { 0: "LOW", 1: "HIGH", Z: "Z" } as const;
const TITLE_CHARS = 60;
const FALLBACK_MODEL = { contextTokens: 32_000 };

function snapshotOf(view: RunView): RunSnapshot | null {
  if (view.phase === "idle" && view.serial.length === 0) return null;
  const pins = Object.entries(view.frame?.pins ?? {}).flatMap(([target, level]) => (level === "X" ? [] : [{ target, level: PIN_LEVELS[level] }]));
  return {
    phase: view.phase,
    stale: view.stale,
    tNs: view.tNs,
    readings: [],
    pins,
    serial: view.serial.map(({ tNs, kind, text }) => ({ tNs, kind, text })),
    diagnostics: view.diagnostics.map(({ text, file, line }) => ({ message: text, ...(file ? { file } : {}), ...(line ? { line } : {}) })),
    solver: null,
  };
}

/** What the partner's pointing tools do in Studio: select the part, focus the net, show the code, open the partner tab. */
export function studioUi(d: { session: SessionStore; ui: UiStore; fitSelection(): void }): ToolUi {
  return {
    highlight(ref) {
      if (ref.kind === "component" || ref.kind === "pin") {
        d.session.setSelection([{ kind: "part", view: d.session.getState().viewId, id: ref.id }]);
        d.fitSelection();
      } else if (ref.kind === "net") {
        d.session.setFocusNet(ref.id);
      } else if (ref.kind === "source") {
        d.ui.set("dock", "code");
      }
    },
    openPanel(tab) {
      if (tab === "partner") d.ui.set("rightRail", "partner");
    },
  };
}

/**
 * Joins the open project to the lab partner. The partner reads the stores and never writes to them: nothing here commits
 * an op, so a suggestion can only change the project when the person does it.
 */
export function linkPartner(d: PartnerLinkDeps): PartnerHost & { dispose(): void } {
  const listeners = new Set<() => void>();
  const active = new Set<AbortController>();
  const toggles: Partial<Record<SourceId, boolean>> = {};
  const seenUrls = createSeenUrls();
  const thread: Thread = newThread({ projectId: d.doc.getState().state.id, random: d.random });
  const createdAt = d.now();

  let mode: Mode = "direct";
  let choice: Choice | null = null;
  let totals = { todayUSD: null as number | null, tokens: 0 };
  let cappedDay: string | null = null;
  let correction = 1;
  let hash: { revision: number; value: string } | null = null;
  let preview: { key: string; value: PackPreview } | null = null;
  let disposed = false;

  const notify = () => listeners.forEach((fn) => fn());

  async function refreshChoice() {
    const [profile] = await d.profiles.list();
    const model = profile?.models[0];
    choice = profile && model ? { profile, model, hasKey: await d.profiles.hasSecret(profile.id) } : null;
    if (!disposed) notify();
  }

  async function refreshTotals() {
    const day = await d.ledger.totals();
    totals = { todayUSD: day.requests > 0 && day.unpricedCalls === day.requests ? null : day.usd, tokens: day.inTokens + day.outTokens };
    if (!disposed) notify();
  }

  const sources: PartnerSources = {
    locale: d.locale,
    project() {
      const { revision, state } = d.doc.getState();
      if (hash?.revision !== revision) hash = { revision, value: stateHash(state) };
      return { revision, stateHash: hash.value, doc: state };
    },
    selection: () => d.session.getState().selection.flatMap((item) => (item.kind === "part" ? [item.id] : [])),
    run: () => snapshotOf(d.run.getState()),
    trace: d.traceOf,
    diagnoses: d.diagnoses,
    itemState: d.itemState,
    registry: d.registry,
    rules: d.rules,
    actors: () => new Map(d.doc.getState().state.actors.map((actor, i) => [actor.id, i === 0 ? "you" : `buddy-${i}`])),
  };

  const tools = createToolRunner(sources, d.ui, { random: d.random });

  const panelUi: PanelUi = {
    highlight(raw) {
      const ref = parseRef(raw);
      if (ref) d.ui.highlight(ref);
    },
  };

  function modelFor(m: Mode): ProfileModel | null {
    if (!choice) return null;
    const { tier } = MODE_SETTINGS[m];
    return choice.profile.models.find((candidate) => candidate.tier === tier) ?? choice.model;
  }

  function previewNow(): PackPreview {
    const view = d.run.getState();
    const { revision } = d.doc.getState();
    const model = modelFor(mode);
    const key = [revision, sources.selection().join(","), view.phase, view.serial.length, mode, model?.id, JSON.stringify(toggles), thread.turns.length].join("|");
    if (preview?.key === key) return preview.value;
    const pack = buildPack({
      sources,
      mode,
      profile: chooseProfile(model ?? FALLBACK_MODEL),
      thread: { summary: null, turns: toMessages(thread.turns, HISTORY_TOKENS) },
      userMessage: "",
      nonce: makeNonce(d.random),
      toggles,
      correction,
    });
    const { text, hash8, sections, tokensEst, profile } = pack;
    preview = { key, value: { text, hash8, sections, tokensEst, profile } };
    return preview.value;
  }

  function persist() {
    const [first] = thread.turns;
    void d.threads
      .save({
        id: thread.id,
        projectId: d.doc.getState().state.id,
        mode,
        title: first ? first.text.slice(0, TITLE_CHARS) : "",
        createdAt,
        lastUsedAt: d.now(),
        turns: thread.turns.map(({ id, role, text, tools: used, at }) => ({ id, role, text, tools: used.map(({ name, ok }) => ({ name, ok })), at })),
      })
      // A history that cannot be kept is not worth interrupting an answer for.
      .catch(() => undefined);
  }

  async function* run(i: { mode: Mode; text: string; signal: AbortSignal }): AsyncGenerator<TurnEvent> {
    await refreshChoice();
    const picked = choice;
    const model = modelFor(i.mode);
    if (!picked || !model) {
      yield { t: "error", error: aiError("not_configured") };
      return;
    }
    const controller = new AbortController();
    const relay = () => controller.abort();
    if (i.signal.aborted) controller.abort();
    i.signal.addEventListener("abort", relay, { once: true });
    active.add(controller);
    let packTokens = 0;
    try {
      const deps = {
        client: d.ai,
        ledger: d.ledger,
        sources,
        tools,
        effects: null,
        profile: picked.profile,
        model,
        caps: d.caps(),
        log: d.log,
        seenUrls,
        random: d.random,
        now: d.now,
        locale: d.locale(),
        threadId: thread.id,
        projectId: thread.projectId,
        correction: () => correction,
      };
      for await (const event of runTurn(deps, { mode: i.mode, text: i.text, thread: thread.turns, toggles, signal: controller.signal })) {
        if (event.t === "pack") packTokens = event.pack.tokensEst;
        else if (event.t === "usage" && packTokens > 0 && event.usage.inTokens > 0) correction = Math.min(2, Math.max(0.5, event.usage.inTokens / packTokens));
        else if (event.t === "error" && event.error.code === "capped") cappedDay = localDay(d.now());
        else if (event.t === "done") {
          const user: Turn = { id: newId("trn", d.random), role: "user", text: redactSecrets(i.text).text, refs: [], tools: [], flags: [], usage: null, at: d.now() };
          thread.turns.push(user, event.turn);
          persist();
        }
        yield event;
      }
    } finally {
      i.signal.removeEventListener("abort", relay);
      active.delete(controller);
      void refreshTotals();
    }
  }

  const offProfiles = d.profiles.subscribe(() => void refreshChoice());
  void refreshChoice();
  void refreshTotals();
  void d.threads.prune(d.retention(), d.now()).catch(() => undefined);

  return {
    run,
    sources,
    ui: panelUi,
    mode: {
      get: () => mode,
      set(next) {
        mode = next;
        notify();
      },
    },
    status(): PartnerStatus {
      if (!choice) return "not_set_up";
      const { privacy } = choice.profile.caps ?? { privacy: "cloud" };
      if (privacy === "cloud" && !choice.hasKey) return "no_key";
      if (cappedDay === localDay(d.now())) return "capped";
      if (privacy === "cloud" && typeof navigator !== "undefined" && navigator.onLine === false) return "offline";
      return active.size > 0 ? "busy" : "ready";
    },
    effects: { pending: () => null, answer() {} },
    preview: previewNow,
    toggleSource(id, on) {
      toggles[id] = on;
      notify();
    },
    destination() {
      if (!choice) return { host: "", local: false };
      const { profile } = choice;
      const url = profile.via === "relay" ? d.server().url : null;
      return { host: new URL(url ?? profile.baseUrl).host, local: profile.caps?.privacy === "local" };
    },
    openSettings: d.openSettings,
    costChip: () => ({ todayUSD: totals.todayUSD, capUSD: d.caps().dayUSD, tokens: totals.tokens }),
    subscribe(fn) {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
    dispose() {
      disposed = true;
      offProfiles();
      for (const controller of active) controller.abort();
      listeners.clear();
    },
  };
}
