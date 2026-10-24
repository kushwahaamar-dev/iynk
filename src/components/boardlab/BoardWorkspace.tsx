"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { LabDock } from "@/components/dock";
import { FigureFrame } from "@/components/figure";
import type { FigureEvent, FigureHandle } from "@/components/figure/protocol";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/icons";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { BoardContent, PinRow } from "@/content/schema";
import type { Locale } from "@/i18n/config";
import { createBoardLabStore, figureState, initialState, type BoardLabStore } from "@/lib/boardlab/store";
import { progressKey, useDone } from "@/lib/progress";
import { AssemblyPanel } from "./AssemblyPanel";
import { BoardProgress } from "./BoardProgress";
import { FailurePanel } from "./FailurePanel";
import { FigureReadout } from "./FigureReadout";
import type { BoardModel, LessonLink } from "./model";
import { PinoutTable } from "./PinoutTable";
import { BoardLabText, useText, type BoardLabMessages } from "./text";
import { useLab } from "./useLab";
import { ViewBar, homeYaw } from "./ViewBar";
import { WireInPanel } from "./WireInPanel";

export type BoardOverview = {
  model: BoardModel;
  board: Omit<BoardContent, "lessons">;
  lessons: LessonLink[];
  progressText: { count: string; value: string };
};

type Props = { lang: Locale; data: BoardOverview; messages: BoardLabMessages; text: Record<string, unknown> };

export function BoardWorkspace({ lang, data, messages, text }: Props) {
  return (
    <BoardLabText locale={lang} messages={messages} text={text}>
      <Overview lang={lang} data={data} />
    </BoardLabText>
  );
}

function diff(prev: Record<string, unknown>, next: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(next)) if (JSON.stringify(prev[k]) !== JSON.stringify(v)) out[k] = v;
  return out;
}

function LessonCard({ lang, board, lesson }: { lang: string; board: string; lesson: LessonLink }) {
  const { t } = useText();
  const done = useDone(progressKey.boardLesson(board, lesson.id));
  return (
    <li>
      <Link
        href={`/${lang}/boards/${board}/${lesson.id}`}
        className="flex min-h-11 items-center gap-3 rounded-md border-2 border-line bg-surface px-3 py-2 no-underline shadow-ink-sm hover:-translate-y-0.5"
        aria-label={`${t("board.openLesson", { n: lesson.n, title: lesson.title })}${done ? ` · ${t("lesson.done")}` : ""}`}
      >
        <span aria-hidden="true" className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full border-2 font-bold ${done ? "border-good bg-good text-paper" : "border-line"}`}>
          {done ? <Icon name="check" size={14} /> : lesson.n}
        </span>
        <span className="flex flex-col">
          <span className="font-semibold">{lesson.title}</span>
          <span className="text-xs uppercase tracking-wide text-muted">{t(`level.${lesson.level}`)}</span>
        </span>
        <Icon name="chevron-right" size={18} className="ms-auto" aria-hidden="true" />
      </Link>
    </li>
  );
}

function Facts({ board }: { board: BoardOverview["board"] }) {
  const { t, tc, locale } = useText();
  const fmt = new Intl.NumberFormat(locale === "zh" ? "zh-Hans" : locale, { maximumFractionDigits: 1 });
  const bytes = (n?: number) => (n === undefined ? null : n >= 1024 * 1024 ? t("board.mib", { n: fmt.format(n / 1024 / 1024) }) : t("board.kib", { n: fmt.format(n / 1024) }));
  const mcu = board.mcu;
  const titleId = useId();
  const rows: [string, string | null][] = [
    [t("board.mcu"), mcu.part],
    [t("board.core"), mcu.core],
    [t("board.clock"), t("board.mhz", { n: fmt.format(mcu.clockHz / 1e6) })],
    [t("board.flash"), bytes(mcu.flashBytes)],
    [t("board.ram"), bytes(mcu.ramBytes)],
    [t("board.eeprom"), bytes(mcu.eepromBytes)],
    [t("board.logic"), t("board.volts", { n: fmt.format(board.logicVolts) })],
    [t("board.wireless"), mcu.wireless.length ? mcu.wireless.map((w) => ({ wifi: "Wi-Fi", ble: "Bluetooth LE", "bt-classic": "Bluetooth Classic", "802.15.4": "IEEE 802.15.4" })[w]).join(", ") : t("board.wirelessNone")],
    [t("board.fpgaCells"), mcu.fpga ? fmt.format(mcu.fpga.logicCells) : null],
    [t("board.toolchain"), mcu.fpga?.toolchain ?? null],
  ];
  return (
    <section aria-labelledby={titleId} className="ink-card p-3 sm:p-4">
      <h2 id={titleId} className="text-xl">
        {t("board.facts")}
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        {rows
          .filter(([, v]) => v !== null)
          .map(([k, v]) => (
            <div key={k} className="rounded-md bg-sunken p-2">
              <dt className="text-xs uppercase tracking-wide text-muted">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
      </dl>
      {mcu.companions.length > 0 && (
        <>
          <h3 className="mt-4 text-base">{t("board.companions")}</h3>
          <ul className="mt-1 flex flex-col gap-1 text-sm">
            {mcu.companions.map((c) => (
              <li key={c.part}>
                <span className="font-mono font-semibold">{c.part}</span> · {tc(c.role)}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Power({ board }: { board: BoardOverview["board"] }) {
  const { t, tc, has } = useText();
  const p = board.power;
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="ink-card p-3 sm:p-4">
      <h2 id={titleId} className="text-xl">
        {t("board.power")}
      </h2>
      <h3 className="mt-3 text-base">{t("board.inputs")}</h3>
      <ul className="mt-1 flex flex-col gap-2 text-sm">
        {p.inputs.map((i) => (
          <li key={i.id} className="rounded-md border-2 border-line p-2">
            <span className="font-semibold">{t(`connector.${i.connector}` as Parameters<typeof t>[0], { volts: i.volts.recommended?.[0] ?? i.volts.max })}</span>
            <span className="ms-2 tabular">{t("board.range", { min: i.volts.min, max: i.volts.max })}</span>
            {i.volts.recommended && <span className="ms-2 text-muted">{t("board.recommended", { min: i.volts.recommended[0], max: i.volts.recommended[1] })}</span>}
            {i.maxCurrentMa ? <span className="ms-2 text-muted">{t("board.maxCurrent", { n: i.maxCurrentMa })}</span> : null}
            <span className="block">{i.reverseProtected ? t("board.protected") : t("board.unprotected")}</span>
            {has(i.protection) && <span className="block text-muted">{tc(i.protection)}</span>}
          </li>
        ))}
      </ul>
      <h3 className="mt-3 text-base">{t("board.rails")}</h3>
      <ul className="mt-1 flex flex-col gap-1 text-sm">
        {p.rails.map((r) => (
          <li key={r.name}>
            <span className="font-mono font-semibold">{r.name}</span> · {t("board.volts", { n: r.volts })}
            {r.maxCurrentMa ? ` · ${t("board.maxCurrent", { n: r.maxCurrentMa })}` : ""}
            {has(r.note) ? <span className="block text-muted">{tc(r.note)}</span> : null}
          </li>
        ))}
      </ul>
      <h3 className="mt-3 text-base">{t("board.io")}</h3>
      <ul className="mt-1 flex flex-col gap-1 text-sm">
        <li>{t("board.perPin", { n: p.io.perPinMa })}</li>
        {p.io.absMaxPerPinMa ? <li>{t("board.absMax", { n: p.io.absMaxPerPinMa })}</li> : null}
        {p.io.totalMa ? <li>{t("board.total", { n: p.io.totalMa })}</li> : null}
        <li>{t("board.brownout", { n: p.brownoutVolts })}</li>
        <li>{t("board.idle", { n: p.idleMa })}</li>
        {has(p.io.note) ? <li className="text-muted">{tc(p.io.note)}</li> : null}
      </ul>
    </section>
  );
}

function OnBoard({ board, figure }: { board: BoardOverview["board"]; figure: () => FigureHandle | null }) {
  const { t, tc, has } = useText();
  const titleId = useId();
  const press = (id: string, down: boolean) => figure()?.send("set", { state: { press: { id, down } } });
  if (!board.leds.length && !board.controls.length && !board.displays.length) return null;
  return (
    <section aria-labelledby={titleId} className="ink-card p-3 sm:p-4">
      <h2 id={titleId} className="sr-only">
        {t("board.controls")}
      </h2>
      {board.controls.length > 0 && (
        <>
          <h3 className="text-base">{t("board.controls")}</h3>
          <ul className="mt-1 flex flex-col gap-2 text-sm">
            {board.controls.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onPointerDown={() => press(c.id, true)}
                  onPointerUp={() => press(c.id, false)}
                  onPointerLeave={() => press(c.id, false)}
                  onKeyDown={(e) => (e.key === " " || e.key === "Enter") && !e.repeat && press(c.id, true)}
                  onKeyUp={(e) => (e.key === " " || e.key === "Enter") && press(c.id, false)}
                >
                  {t("board.press", { label: c.label })}
                </Button>
                {c.pin ? <span className="font-mono text-muted">{c.pin}</span> : null}
                <span>{tc(c.effect)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {board.leds.length > 0 && (
        <>
          <h3 className="mt-3 text-base">{t("board.leds")}</h3>
          <ul className="mt-1 flex flex-col gap-1 text-sm">
            {board.leds.map((l) => (
              <li key={l.id}>
                <span className="font-semibold">{l.label}</span> · {t("board.drivenBy", { pin: l.drivenBy })}
                {l.activeLow ? ` (${t("board.activeLow")})` : ""}
                {has(l.note) ? <span className="block text-muted">{tc(l.note)}</span> : null}
              </li>
            ))}
          </ul>
        </>
      )}
      {board.displays.length > 0 && (
        <>
          <h3 className="mt-3 text-base">{t("board.displays")}</h3>
          <ul className="mt-1 flex flex-col gap-1 text-sm">
            {board.displays.map((d) => (
              <li key={d.id}>
                <span className="font-semibold">{d.id}</span> · {d.size.join(" × ")}
                {has(d.note) ? <span className="block text-muted">{tc(d.note)}</span> : null}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function Overview({ lang, data }: { lang: Locale; data: BoardOverview }) {
  const { t, tc } = useText();
  const { model, board, lessons } = data;
  const uid = useId();
  const [store] = useState<BoardLabStore>(() =>
    createBoardLabStore(initialState({ board: model.id, lesson: null, variant: model.variants[0]?.figureVariant ?? null, language: model.languages[0] ?? "arduino-cpp", view: "board" })),
  );
  const figureRef = useRef<FigureHandle | null>(null);
  const [figure, setFigure] = useState<FigureHandle | null>(null);
  const attachFigure = useCallback((h: FigureHandle | null) => {
    figureRef.current = h;
    setFigure(h);
  }, []);
  const getFigure = useCallback(() => figureRef.current, []);
  const [xr, setXr] = useState(false);
  const [yaw, setYaw] = useState(45);
  const figureOpts = useMemo(() => ({ circuit: null, failures: model.failures }), [model.failures]);

  useEffect(() => {
    let last = figureState(store.getState(), figureOpts);
    return store.subscribe(() => {
      const next = figureState(store.getState(), figureOpts);
      const patch = diff(last, next);
      last = next;
      if (Object.keys(patch).length) figureRef.current?.send("set", { state: patch });
    });
  }, [store, figureOpts]);

  const view = useLab(store, (s) => s.view);
  const exploded = useLab(store, (s) => s.exploded);
  const power = useLab(store, (s) => s.power);
  const fault = useLab(store, (s) => s.fault);
  const variant = useLab(store, (s) => s.variant);
  const initial = useMemo(() => figureState({ ...store.getState(), view, exploded, power, fault, variant }, figureOpts), [store, view, exploded, power, fault, variant, figureOpts]);

  const onEvent = useCallback(
    (e: FigureEvent) => {
      if (e.type === "ready") {
        setYaw(homeYaw(figureRef.current));
        const state = (e as { state?: unknown }).state;
        if (state && typeof state === "object") store.dispatch({ type: "figure/state", state: state as Record<string, unknown> });
      } else if (e.type === "state") store.dispatch({ type: "figure/state", state: e.state });
    },
    [store],
  );

  const variantDef = board.variants.find((v) => v.figureVariant === variant) ?? board.variants[0];
  const pinout: PinRow[] = useMemo(() => {
    const patch = variantDef?.pinPatch ?? [];
    return board.pinout.map((r) => patch.find((p) => p.header === r.header && p.pin === r.pin) ?? r);
  }, [board.pinout, variantDef]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 pb-16 pt-6 sm:px-6" data-testid="board-workspace" data-board={model.id}>
      <header className="flex flex-col gap-2">
        <Link href={`/${lang}/boards`} className="inline-flex min-h-11 items-center gap-1 self-start text-sm">
          <Icon name="chevron-right" size={16} className="rotate-180" aria-hidden="true" />
          {t("board.back")}
        </Link>
        <p className="ink-kicker">
          {t("index.fig", { n: model.fig })} · {board.maker}
        </p>
        <h1 className="text-3xl sm:text-5xl">{model.name}</h1>
        <p className="max-w-3xl text-lg leading-relaxed">{tc(board.tagline)}</p>
        <div className="max-w-md">
          <BoardProgress
            board={model.id}
            total={lessons.length}
            hasAssembly={board.assembly.length > 0}
            labels={{ lessons: t("index.lessons"), count: data.progressText.count, value: data.progressText.value, assembly: t("index.assembly"), assemblyDone: t("index.assemblyDone") }}
          />
        </div>
      </header>

      {board.variants.length > 1 && (
        <SegmentedControl
          label={t("board.variant")}
          value={variant ?? board.variants[0].figureVariant}
          onChange={(v) => store.dispatch({ type: "variant/set", id: v })}
          options={board.variants.map((v) => ({ value: v.figureVariant, label: v.name }))}
        />
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <ViewBar store={store} board={model} figure={getFigure} views={["board", "power"]} xr={xr} onXr={setXr} yaw={yaw} onYaw={setYaw} />
          <FigureFrame ref={attachFigure} src={model.figurePage} title={model.name} initial={initial} onEvent={onEvent} />
          <FigureReadout store={store} leds={model.leds} />
          <p className="ink-prose max-w-none">{tc(board.overview)}</p>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <Facts board={board} />
          <Power board={board} />
        </div>
      </div>

      <section aria-labelledby={`${uid}-lessons`} className="ink-card p-3 sm:p-4" data-testid="board-lessons">
        <h2 id={`${uid}-lessons`} className="text-xl">
          {t("board.lessons")}
        </h2>
        <p className="mt-1 text-sm text-muted">{t("board.lessonsLede")}</p>
        <ol className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((l) => (
            <LessonCard key={l.id} lang={lang} board={model.id} lesson={l} />
          ))}
        </ol>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <AssemblyPanel store={store} board={model.id} steps={board.assembly} figure={getFigure} />
        <div className="flex flex-col gap-5">
          <OnBoard board={board} figure={getFigure} />
          <FailurePanel store={store} failures={model.failures} figure={getFigure} />
        </div>
      </div>

      <PinoutTable board={model.name} rows={pinout} />
      <WireInPanel wireables={model.wireables} />

      {board.sources.length > 0 && (
        <section aria-labelledby={`${uid}-sources`} className="text-sm">
          <h2 id={`${uid}-sources`} className="text-base">
            {t("board.sources")}
          </h2>
          <ul className="mt-1 flex flex-col gap-1">
            {board.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} rel="noopener noreferrer" target="_blank">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <LabDock lab="board" itemId={model.id} store={store} figure={figure} />
    </div>
  );
}
