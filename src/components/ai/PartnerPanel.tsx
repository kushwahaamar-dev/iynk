"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useReducer, useRef, useState } from "react";
import type { AiErrorCode } from "@/ai/errors";
import type { Level, Topic } from "@/ai/hints";
import type { PackPreview } from "./WhatItSees";
import type { SourceId } from "@/ai/context/pack";
import type { ToolRecord, Turn } from "@/ai/host/thread";
import type { TurnEvent } from "@/ai/host/turn";
import { useAiT, useEffectsT, useInsightT, type AiT } from "@/ai/messages";
import type { Mode } from "@/ai/modes";
import type { HintPort, LogPort } from "@/ai/proposals/ports";
import type { PartnerSources } from "@/ai/sources";
import type { EffectRequest } from "@/ai/tools/effect";
import { Button, Callout, EmptyState, Icon, Skeleton, TextArea, Toggle } from "@/components/ui";
import { useLocale } from "@/i18n/client";
import { EffectCard } from "./EffectCard";
import { HintBar } from "./HintBar";
import { ModeSwitch } from "./ModeSwitch";
import { ProposalList } from "./ProposalList";
import { readHoldMe, useLadder, writeHoldMe, type GateFlags } from "./wiring/hintsHost";
import type { ProposalHost } from "./wiring/proposalHost";
import { TurnView } from "./TurnView";
import { WhatItSees } from "./WhatItSees";

const MAX_CHARS = 8_000;
const TOPIC_CHARS = 60;
const ANNOUNCE_EVERY_MS = 2_000;
const ANNOUNCE_CHARS = 280;

export type PartnerStatus = "ready" | "not_set_up" | "no_key" | "capped" | "offline" | "busy";

export type UiHost = {
  /** Selects the part, pin or line a reference points at and brings it into view. */
  highlight(ref: string): void;
};

export type PartnerHost = {
  /** `hint` is where the person stands on the ladder, and the buttons they pressed for this message. */
  run(i: { mode: Mode; text: string; signal: AbortSignal; hint?: { level: Level } & GateFlags }): AsyncIterable<TurnEvent>;
  status(): PartnerStatus;
  mode: { get(): Mode; set(mode: Mode): void };
  sources: PartnerSources;
  /** The search the partner wants to run and is waiting on; the panel shows it and reports the choice. */
  effects: { pending(): EffectRequest | null; answer(decision: "allow" | "deny"): void };
  ui: UiHost;
  /** The proposal cards of the open thread. Absent where the partner cannot change the project. */
  proposals?: { host: ProposalHost; threadId: string };
  /** The sealed fault the hints are about. Absent where there is no ladder to climb. */
  hints?: { port: HintPort; log: LogPort };
  preview(): PackPreview;
  toggleSource(id: SourceId, on: boolean): void;
  destination(): { host: string; local: boolean };
  openSettings(): void;
  costChip(): { todayUSD: number | null; capUSD: number | null; tokens: number };
  subscribe(fn: () => void): () => void;
};

type Item = { kind: "turn"; id: string; turn: Turn } | { kind: "note"; id: string; text: string };
type Live = { text: string; tools: ToolRecord[] };

const STATE_TEXT = {
  not_set_up: "partner.state.notSetUp",
  no_key: "partner.state.needsKey",
  capped: "partner.state.capped",
  offline: "partner.state.offline",
  busy: "partner.state.busy",
} as const;

const usd = (value: number) => `$${value.toFixed(value < 1 ? 3 : 2)}`;

function errorKey(code: AiErrorCode): `partner.error.${Exclude<AiErrorCode, "aborted" | "internal">}` | null {
  if (code === "aborted") return null;
  return `partner.error.${code === "internal" ? "upstream_failed" : code}`;
}

function assistantTurn(id: string, live: Live): Turn {
  return { id, role: "assistant", text: live.text, refs: [], tools: live.tools, flags: [], usage: null, at: Date.now() };
}

/** The AI lab partner: the thread, its tool cards and references, and the box to ask in. The host decides where answers come from. */
export function PartnerPanel({ host }: { host: PartnerHost }) {
  const locale = useLocale();
  const t = useAiT(locale);
  const insight = useInsightT(locale);
  const effectsT = useEffectsT(locale);

  if (!t || !insight || !effectsT) {
    return (
      <section aria-busy="true">
        <Skeleton className="h-28 rounded-xl" />
      </section>
    );
  }
  const translators = { t, insight, effectsT };
  return host.hints ? <LadderPartner host={host} hints={host.hints} {...translators} /> : <Partner host={host} ladder={null} {...translators} />;
}

function LadderPartner({ hints, ...rest }: { host: PartnerHost; hints: NonNullable<PartnerHost["hints"]> } & Translators) {
  const ladder = useLadder(hints);
  return <Partner ladder={ladder} {...rest} />;
}

type Translators = {
  t: AiT;
  insight: NonNullable<ReturnType<typeof useInsightT>>;
  effectsT: NonNullable<ReturnType<typeof useEffectsT>>;
};

type LadderControl = ReturnType<typeof useLadder>;

function Partner({ host, ladder, t, insight, effectsT }: { host: PartnerHost; ladder: LadderControl | null } & Translators) {
  const titleId = useId();
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [items, setItems] = useState<Item[]>([]);
  const [live, setLive] = useState<Live | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<AiErrorCode | null>(null);
  const [keyRemoved, setKeyRemoved] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [holdMe, setHoldMe] = useState(readHoldMe);
  const counter = useRef(0);
  const abort = useRef<AbortController | null>(null);
  const liveText = useRef("");
  const announced = useRef(0);
  const previewShown = useRef(false);
  const transcript = useRef<HTMLDivElement>(null);
  const tail = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  useEffect(() => host.subscribe(rerender), [host]);
  useEffect(() => () => abort.current?.abort(), []);

  const running = live !== null;
  const status = host.status();
  const mode = host.mode.get();
  const pending = host.effects.pending();
  const cost = host.costChip();
  const over = draft.length > MAX_CHARS;
  const canAsk = status === "ready" && !running;
  const canSend = canAsk && draft.trim() !== "" && !over;
  const sealedOpen = host.hints?.port.sealedItems().some((item) => !item.revealed) ?? false;
  const topic = hintTopic();
  const level = ladder && topic ? ladder.level(topic) : 0;

  function hintTopic(): Topic | null {
    if (!host.hints) return null;
    const sealed = host.hints.port.sealedItems().find((item) => !item.revealed);
    if (sealed) return { kind: "fault", faultId: sealed.faultId };
    const first = items.find((item) => item.kind === "turn" && item.turn.role === "user");
    return { kind: "concept", label: first?.kind === "turn" ? first.turn.text.slice(0, TOPIC_CHARS) : "" };
  }

  // Streamed text reaches a screen reader in short pieces, at most once every 2 s.
  useEffect(() => {
    if (!running) return;
    const flush = () => {
      const fresh = liveText.current.slice(announced.current).trim();
      if (fresh === "") return;
      announced.current = liveText.current.length;
      setAnnouncement(fresh.slice(-ANNOUNCE_CHARS));
    };
    const timer = setInterval(flush, ANNOUNCE_EVERY_MS);
    return () => {
      clearInterval(timer);
      flush();
    };
  }, [running]);

  // The reader is at the bottom while the tail marker is within reach of the transcript's edge.
  useEffect(() => {
    if (!transcript.current || !tail.current || typeof IntersectionObserver === "undefined") return;
    const watch = new IntersectionObserver(
      ([entry]) => {
        pinned.current = entry.isIntersecting;
      },
      { root: transcript.current, rootMargin: "0px 0px 48px 0px" },
    );
    watch.observe(tail.current);
    return () => watch.disconnect();
  }, []);

  // Follow the reply while the reader is at the bottom; leave them be when they scroll up.
  useLayoutEffect(() => {
    const el = transcript.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [items, live, pending]);

  const nextId = (prefix: string) => `${prefix}${++counter.current}`;

  const addNote = useCallback((text: string) => {
    setItems((all) => [...all, { kind: "note", id: `note${++counter.current}`, text }]);
  }, []);

  async function send(text: string) {
    const controller = new AbortController();
    abort.current = controller;
    const accumulated: Live = { text: "", tools: [] };
    liveText.current = "";
    announced.current = 0;
    setError(null);
    setKeyRemoved(false);
    setItems((all) => [
      ...all,
      { kind: "turn", id: nextId("u"), turn: { id: nextId("turn"), role: "user", text, refs: [], tools: [], flags: [], usage: null, at: Date.now() } },
    ]);
    setLive(accumulated);
    let finished = false;
    try {
      const hint = ladder && topic ? { level: ladder.level(topic), ...ladder.flags() } : undefined;
      for await (const event of host.run({ mode: host.mode.get(), text, signal: controller.signal, ...(hint && { hint }) })) {
        if (event.t === "text") {
          accumulated.text += event.delta;
          liveText.current = accumulated.text;
          setLive({ ...accumulated });
        } else if (event.t === "tool") {
          accumulated.tools = [...accumulated.tools, event.record];
          setLive({ ...accumulated });
        } else if (event.t === "pack") {
          if (event.pack.redactions > 0) setKeyRemoved(true);
        } else if (event.t === "done") {
          finished = true;
          setItems((all) => [...all, { kind: "turn", id: nextId("a"), turn: event.turn }]);
        } else if (event.t === "error") {
          setError(event.error.code);
        }
      }
    } catch {
      setError("internal");
    } finally {
      if (!finished && (accumulated.text || accumulated.tools.length)) {
        setItems((all) => [...all, { kind: "turn", id: nextId("a"), turn: assistantTurn(nextId("turn"), accumulated) }]);
      }
      ladder?.clear();
      if (controller.signal.aborted) addNote(t("panel.stopped"));
      setLive(null);
    }
  }

  function mayAsk(): boolean {
    if (!previewShown.current && !host.destination().local) {
      previewShown.current = true;
      setPreviewOpen(true);
      return false;
    }
    return true;
  }

  function submit() {
    if (!canSend || !mayAsk()) return;
    const text = draft;
    setDraft("");
    void send(text);
  }

  function another() {
    if (!ladder || !topic || !canAsk || !mayAsk()) return;
    ladder.ladder.next(topic, "another");
    void send(t("ladder.another"));
  }

  function showMe(confirmed: boolean) {
    if (!ladder || !topic || !canAsk || !mayAsk()) return;
    if (ladder.ladder.next(topic, "show", confirmed).needsConfirm) return;
    ladder.raise("showMe");
    void send(t("ladder.show"));
  }

  function press(flag: "fixIt" | "applyIt", text: string) {
    if (!ladder || !canAsk || !mayAsk()) return;
    ladder.raise(flag);
    void send(text);
  }

  function changeHoldMe(on: boolean) {
    setHoldMe(on);
    writeHoldMe(on);
  }

  function changeMode(next: Mode) {
    if (next === mode) return;
    host.mode.set(next);
    addNote(`${t(`mode.${next}`)}. ${t(`mode.hint.${next}`)}`);
    rerender();
  }

  const onRefClick = useCallback((raw: string) => host.ui.highlight(raw), [host]);

  const errorText = error ? errorKey(error) : null;
  const stateKey = status === "ready" ? null : STATE_TEXT[status];
  const showCounter = draft.length >= MAX_CHARS * 0.8;

  return (
    <section aria-labelledby={titleId} className="@container flex h-full min-h-[24rem] flex-col text-ink">
      <header className="flex items-center gap-3 border-b border-rule pb-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sunken">
          <Icon name="spark" />
        </span>
        <h2 id={titleId} className="min-w-0 flex-1 truncate text-base font-semibold leading-tight">
          {t("panel.title")}
        </h2>
        <p className="shrink-0 text-xs text-muted tabular-nums">
          <span className="sr-only">{insight("activity.today")}: </span>
          {cost.todayUSD === null
            ? insight("activity.priceUnknown")
            : cost.capUSD === null
              ? usd(cost.todayUSD)
              : insight("activity.of", { used: usd(cost.todayUSD), limit: usd(cost.capUSD) })}
        </p>
      </header>

      <div
        ref={transcript}
        tabIndex={0}
        aria-label={t("panel.transcript")}
        className="-mx-1 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-1 py-3"
      >
        {items.length === 0 && !live ? (
          <EmptyState icon="spark" title={t("panel.inputLabel")}>
            {t("panel.intro")}
          </EmptyState>
        ) : null}
        {items.map((item) =>
          item.kind === "note" ? (
            <p key={item.id} className="text-center text-xs text-muted">
              {item.text}
            </p>
          ) : (
            <TurnView key={item.id} turn={item.turn} sources={host.sources} onRefClick={onRefClick} t={t} />
          ),
        )}
        {host.proposals ? <ProposalList host={host.proposals.host} threadId={host.proposals.threadId} t={t} /> : null}
        {live ? (
          <TurnView turn={assistantTurn("live", live)} sources={host.sources} onRefClick={onRefClick} t={t} streaming />
        ) : null}
        {pending ? (
          <EffectCard request={pending} onAllow={() => host.effects.answer("allow")} onDeny={() => host.effects.answer("deny")} t={effectsT} />
        ) : null}
        {errorText ? (
          <Callout tone={error === "not_configured" || error === "no_key" ? "note" : "warn"} live>
            <p>{t(errorText)}</p>
            {error === "network" ? <p className="text-muted">{t("partner.hint.relay")}</p> : null}
            {error === "context_too_long" ? <p className="text-muted">{t("partner.hint.selectPart")}</p> : null}
          </Callout>
        ) : null}
        <div ref={tail} aria-hidden="true" className="h-px" />
      </div>

      <div className="space-y-2 border-t border-rule pt-3">
        {stateKey ? (
          status === "busy" || status === "offline" ? (
            <p className="text-sm text-muted">{t(stateKey)}</p>
          ) : (
            <button
              type="button"
              onClick={host.openSettings}
              className="w-full rounded-lg bg-sunken p-3 text-start text-sm font-semibold hover:bg-hover"
            >
              {t(stateKey)}
            </button>
          )
        ) : null}
        {keyRemoved ? <p className="text-xs text-muted">{t("partner.keyRemoved")}</p> : null}

        {ladder && mode !== "direct" && mode !== "advanced" ? (
          <div className="space-y-1">
            <HintBar
              mode={mode}
              level={level}
              holdMe={holdMe}
              showFixIt={!sealedOpen}
              showApply={!sealedOpen && level === 3}
              busy={!canAsk}
              t={t}
              onAnother={another}
              onShow={showMe}
              onFixIt={() => press("fixIt", t("ladder.fixIt"))}
              onApply={() => press("applyIt", t("ladder.apply"))}
            />
            {mode !== "debugging" ? <Toggle checked={holdMe} onChange={changeHoldMe} label={t("ladder.holdMe")} /> : null}
          </div>
        ) : null}

        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="min-w-0 flex-1">
            <TextArea
              label={t("panel.inputLabel")}
              hideLabel
              rows={1}
              value={draft}
              placeholder={t("panel.placeholder")}
              error={over ? t("partner.counter", { count: draft.length, max: MAX_CHARS }) : undefined}
              hint={showCounter && !over ? t("partner.counter", { count: draft.length, max: MAX_CHARS }) : undefined}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  submit();
                }
              }}
              className="max-h-32 min-h-10 resize-none! field-sizing-content"
            />
          </div>
          {running ? (
            <Button type="button" variant="danger" onClick={() => abort.current?.abort()} aria-label={t("partner.stop")} className="size-10 px-0 [@media(pointer:coarse)]:size-11">
              <Icon name="stop" />
            </Button>
          ) : (
            <Button type="submit" variant="primary" disabled={!canSend} aria-label={t("partner.send")} className="size-10 px-0 [@media(pointer:coarse)]:size-11">
              <Icon name="send" />
            </Button>
          )}
        </form>

        <ModeSwitch mode={mode} onChange={changeMode} t={t} />

        <Button variant="ghost" size="sm" onClick={() => setPreviewOpen(true)}>
          <Icon name="eye" size={16} />
          {insight("what.title")}
        </Button>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {previewOpen ? (
        <WhatItSees
          preview={host.preview()}
          destination={host.destination()}
          onToggle={(id, on) => {
            host.toggleSource(id, on);
            rerender();
          }}
          onClose={() => setPreviewOpen(false)}
          t={insight}
        />
      ) : null}
    </section>
  );
}
