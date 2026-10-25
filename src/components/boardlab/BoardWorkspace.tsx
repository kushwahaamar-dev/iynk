"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { LabDock } from "@/components/dock";
import { FigureFrame } from "@/components/figure";
import { SoundToggle } from "@/components/settings";
import type { FigureEvent, FigureHandle } from "@/components/figure/protocol";
import { WorkspaceBar, WorkspaceFrame } from "@/components/shell/workspace";
import { Button, ButtonLink } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Icon } from "@/components/ui/icons";
import { Panel } from "@/components/ui/Panel";
import { Tabs } from "@/components/ui/Tabs";
import type { BoardContent, PinRow } from "@/content/schema";
import type { Locale } from "@/i18n/config";
import { createBoardLabStore, figurePatch, figureState, initialState, type BoardLabStore } from "@/lib/boardlab/store";
import { progressKey, useDone, useSaved } from "@/lib/progress";
import { boardMoments } from "@/lib/sound/moments";
import { useFigureSound, useLabMoments } from "@/lib/sound/react";
import { AssemblyPanel } from "./AssemblyPanel";
import { BoardProgress } from "./BoardProgress";
import { FailurePanel } from "./FailurePanel";
import { FigureReadout } from "./FigureReadout";
import type { BoardModel, LessonLink } from "./model";
import { PinoutTable } from "./PinoutTable";
import { ScrollRow } from "./ScrollRow";
import { BoardLabText, useText, type BoardLabMessages } from "./text";
import { useLab } from "./useLab";
import { ViewBar, boardHidden, hideHostDrawn, homeYaw } from "./ViewBar";
import { WireInPanel } from "./WireInPanel";

export type BoardOverview = {
  model: BoardModel;
  board: Omit<BoardContent, "lessons">;
  lessons: LessonLink[];
  progressText: { count: string; value: string };
};

type Props = {
  lang: Locale;
  data: BoardOverview;
  messages: BoardLabMessages;
  text: Record<string, unknown>;
  /** The untranslated chip, rendered on the server. */
  notice?: ReactNode;
};

export function BoardWorkspace({ lang, data, messages, text, notice }: Props) {
  return (
    <BoardLabText locale={lang} messages={messages} text={text}>
      <Overview lang={lang} data={data} notice={notice} />
    </BoardLabText>
  );
}

function LessonRow({ lang, board, lesson }: { lang: string; board: string; lesson: LessonLink }) {
  const { t } = useText();
  const done = useDone(progressKey.boardLesson(board, lesson.id));
  return (
    <li>
      <Link
        href={`/${lang}/boards/${board}/${lesson.id}`}
        className="-mx-2 flex min-h-11 items-center gap-3 rounded-ink-sm px-2 py-1.5 text-sm text-ink no-underline hover:bg-sunken"
        aria-label={`${t("board.openLesson", { n: lesson.n, title: lesson.title })}${done ? ` · ${t("lesson.done")}` : ""}`}
      >
        <span
          aria-hidden="true"
          className={cx(
            "tabular inline-flex size-6 shrink-0 items-center justify-center rounded-full border-[1.5px] font-ui text-xs font-bold",
            done ? "border-good bg-good text-paper" : "border-rule text-muted",
          )}
        >
          {done ? <Icon name="check" size={12} /> : lesson.n}
        </span>
        <span className="min-w-0 flex-1 font-semibold leading-snug">{lesson.title}</span>
        <span className="shrink-0 text-xs text-muted">{t(`level.${lesson.level}`)}</span>
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
    <section aria-labelledby={titleId}>
      <h3 id={titleId} className="sr-only">
        {t("board.facts")}
      </h3>
      <dl className="grid grid-cols-2 gap-x-4 text-sm">
        {rows
          .filter(([, v]) => v !== null)
          .map(([k, v]) => (
            <div key={k} className="min-w-0 border-b-[1.5px] border-rule py-2">
              <dt className="ink-label">{k}</dt>
              <dd className="font-semibold break-words">{v}</dd>
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
    <section aria-labelledby={titleId} className="max-w-[72ch]">
      <h2 id={titleId} className="sr-only">
        {t("board.power")}
      </h2>
      <h3 className="text-base">{t("board.inputs")}</h3>
      <ul className="mt-1 divide-y-[1.5px] divide-rule border-y-[1.5px] border-rule text-sm">
        {p.inputs.map((i) => (
          <li key={i.id} className="py-2">
            <span className="font-semibold">{t(`connector.${i.connector}` as Parameters<typeof t>[0], { volts: i.volts.recommended?.[0] ?? i.volts.max })}</span>
            <span className="ms-2 tabular">{t("board.range", { min: i.volts.min, max: i.volts.max })}</span>
            {i.volts.recommended && <span className="ms-2 text-muted">{t("board.recommended", { min: i.volts.recommended[0], max: i.volts.recommended[1] })}</span>}
            {i.maxCurrentMa ? <span className="ms-2 text-muted">{t("board.maxCurrent", { n: i.maxCurrentMa })}</span> : null}
            <span className="block">{i.reverseProtected ? t("board.protected") : t("board.unprotected")}</span>
            {has(i.protection) && <span className="block text-muted">{tc(i.protection)}</span>}
          </li>
        ))}
      </ul>
      <h3 className="mt-6 text-base">{t("board.rails")}</h3>
      <ul className="mt-1 flex flex-col gap-1 text-sm">
        {p.rails.map((r) => (
          <li key={r.name}>
            <span className="font-mono font-semibold">{r.name}</span> · {t("board.volts", { n: r.volts })}
            {r.maxCurrentMa ? ` · ${t("board.maxCurrent", { n: r.maxCurrentMa })}` : ""}
            {has(r.note) ? <span className="block text-muted">{tc(r.note)}</span> : null}
          </li>
        ))}
      </ul>
      <h3 className="mt-6 text-base">{t("board.io")}</h3>
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
    <section aria-labelledby={titleId} className="mt-6">
      <h3 id={titleId} className="sr-only">
        {t("board.controls")}
      </h3>
      {board.controls.length > 0 && (
        <>
          <h4 className="text-base">{t("board.controls")}</h4>
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
                <span className="min-w-0 flex-1">
                  {c.pin && c.pin !== c.label ? <span className="me-1.5 font-mono text-muted">{c.pin}</span> : null}
                  {tc(c.effect)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {board.leds.length > 0 && (
        <>
          <h4 className="mt-4 text-base">{t("board.leds")}</h4>
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
          <h4 className="mt-4 text-base">{t("board.displays")}</h4>
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

function Overview({ lang, data, notice }: { lang: Locale; data: BoardOverview; notice?: ReactNode }) {
  const { t, tc } = useText();
  const { model, board, lessons } = data;
  const uid = useId();
  const saved = useSaved();
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
      const patch = figurePatch(last, next);
      last = next;
      if (Object.keys(patch).length) figureRef.current?.send("set", { state: patch });
    });
  }, [store, figureOpts]);

  useLabMoments(store, boardMoments, model.id);
  const figureSound = useFigureSound();

  const view = useLab(store, (s) => s.view);
  const exploded = useLab(store, (s) => s.exploded);
  const power = useLab(store, (s) => s.power);
  const fault = useLab(store, (s) => s.fault);
  const variant = useLab(store, (s) => s.variant);
  const assemblyDone = useLab(store, (s) => s.assembly.length);
  const initial = useMemo(() => figureState({ ...store.getState(), view, exploded, power, fault, variant }, figureOpts), [store, view, exploded, power, fault, variant, figureOpts]);

  const onEvent = useCallback(
    (e: FigureEvent) => {
      figureSound(e);
      if (e.type === "ready") {
        setYaw(homeYaw(figureRef.current));
        hideHostDrawn(figureRef.current, e.buttons, boardHidden());
        const state = (e as { state?: unknown }).state;
        if (state && typeof state === "object") store.dispatch({ type: "figure/state", state: state as Record<string, unknown> });
      } else if (e.type === "state") store.dispatch({ type: "figure/state", state: e.state });
    },
    [store, figureSound],
  );

  const variantDef = board.variants.find((v) => v.figureVariant === variant) ?? board.variants[0];
  const pinout: PinRow[] = useMemo(() => {
    const patch = variantDef?.pinPatch ?? [];
    return board.pinout.map((r) => patch.find((p) => p.header === r.header && p.pin === r.pin) ?? r);
  }, [board.pinout, variantDef]);

  // The one next step: the first lesson not done yet ("Start" before any is done).
  const anyDone = lessons.some((l) => saved.done[progressKey.boardLesson(model.id, l.id)]);
  const nextLesson = lessons.find((l) => !saved.done[progressKey.boardLesson(model.id, l.id)]) ?? null;

  const railTabs = [
    {
      id: "lessons",
      label: t("board.lessons"),
      content: (
        <div data-testid="board-lessons">
          <h3 className="sr-only">{t("board.lessons")}</h3>
          <p className="mb-2 text-sm text-muted">{t("board.lessonsLede")}</p>
          <ol>
            {lessons.map((l) => (
              <LessonRow key={l.id} lang={lang} board={model.id} lesson={l} />
            ))}
          </ol>
        </div>
      ),
    },
    ...(board.assembly.length
      ? [
          {
            id: "assembly",
            label: t("index.assembly"),
            badge: assemblyDone ? `${assemblyDone}/${board.assembly.length}` : null,
            content: <AssemblyPanel store={store} board={model.id} steps={board.assembly} figure={getFigure} />,
          },
        ]
      : []),
    ...(model.failures.length ? [{ id: "failures", label: t("failures.title"), content: <FailurePanel store={store} failures={model.failures} figure={getFigure} /> }] : []),
    {
      id: "facts",
      label: t("board.facts"),
      content: (
        <>
          <Facts board={board} />
          <OnBoard board={board} figure={getFigure} />
        </>
      ),
    },
  ];

  const belowTabs = [
    { id: "pinout", label: t("pinout.title"), content: <PinoutTable board={model.name} rows={pinout} /> },
    ...(model.wireables.length ? [{ id: "wire", label: t("wire.title"), content: <WireInPanel wireables={model.wireables} /> }] : []),
    { id: "power", label: t("board.power"), content: <Power board={board} /> },
    ...(board.sources.length
      ? [
          {
            id: "sources",
            label: t("board.sources"),
            content: (
              <section aria-labelledby={`${uid}-sources`} className="max-w-[72ch] text-sm">
                <h2 id={`${uid}-sources`} className="sr-only">
                  {t("board.sources")}
                </h2>
                <ul className="flex flex-col gap-2">
                  {board.sources.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} rel="noopener noreferrer" target="_blank">
                        {s.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ),
          },
        ]
      : []),
  ];

  return (
    <WorkspaceFrame
      data-testid="board-workspace"
      data-board={model.id}
      bar={
        <WorkspaceBar
          back={{ href: `/${lang}/boards`, label: t("board.back") }}
          tone="cobalt"
          kicker={`${t("index.fig", { n: model.fig })} · ${board.maker}`}
          title={model.name}
          status={notice}
          actions={
            <>
              <SoundToggle compact />
              <LabDock lab="board" itemId={model.id} store={store} figure={figure} />
            </>
          }
        />
      }
      stage={
        <>
          <ViewBar store={store} board={model} figure={getFigure} views={["board", "power"]} variants={model.variants} xr={xr} onXr={setXr} yaw={yaw} onYaw={setYaw} />
          <FigureFrame fill ref={attachFigure} src={model.figurePage} title={model.name} initial={initial} onEvent={onEvent} />
          <ScrollRow label={t("readout.label")} className="min-h-8">
            <FigureReadout store={store} leds={model.leds} />
          </ScrollRow>
        </>
      }
      rail={
        <Panel>
          <div className="flex shrink-0 flex-col gap-3 border-b-[1.5px] border-rule p-4">
            <p className="line-clamp-3 text-sm leading-relaxed">{tc(board.tagline)}</p>
            <BoardProgress
              board={model.id}
              total={lessons.length}
              hasAssembly={board.assembly.length > 0}
              labels={{ lessons: t("index.lessons"), count: data.progressText.count, value: data.progressText.value, assembly: t("index.assemblyTodo"), assemblyDone: t("index.assemblyDone") }}
              size="sm"
            />
            {nextLesson && (
              <ButtonLink href={`/${lang}/boards/${model.id}/${nextLesson.id}`} variant="primary" className="self-start">
                {t(anyDone ? "board.continue" : "board.start", { title: nextLesson.title })}
                <Icon name="chevron-right" size={16} aria-hidden="true" />
              </ButtonLink>
            )}
          </div>
          <div className="flex min-h-0 flex-1 flex-col">
            <Tabs fill phoneGrid label={model.name} tabs={railTabs} defaultValue="lessons" listClassName="ws-sticky-tabs" />
          </div>
        </Panel>
      }
      below={
        <div className="flex flex-col gap-8">
          <p className="ink-prose text-lg">{tc(board.overview)}</p>
          <Tabs label={t("board.reference")} tabs={belowTabs} defaultValue="pinout" phoneGrid />
        </div>
      }
    />
  );
}
