"use client";

import { useCallback, useEffect, useId, useMemo, useState, useSyncExternalStore } from "react";
import type { LabDockProps } from "@/components/dock/types";
import { Button, Callout, Chip, Toggle, cx, type ChipTone } from "@/components/ui";
import { useLocale } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { createTranslator, type Translate } from "@/i18n/translate";
import type { BoardSnapshot, FirmataBoard } from "@/lib/hw/board";
import { PinMode } from "@/lib/hw/firmata";
import { loadHwMessages, type HwMessages } from "@/lib/hw/messages";
import { serialSupport, type SerialPortLike, type SerialSupport } from "@/lib/hw/serial";
import { twinSession, type SessionSnapshot } from "@/lib/hw/session";
import { asBoardId, boardLabSim, lessonInputs, lessonOf } from "@/lib/hw/sim";
import { TWIN_BOARDS, type TwinBridge, type TwinOptions, type TwinPin, type TwinReport } from "@/lib/hw/twin";
import { identifyUsb } from "@/lib/hw/usb";
import type { PinView } from "@/lib/interp/world";

type T = Translate<HwMessages>;

const noSubscribe = () => () => {};

/** Re-render at most every `ms`: analog reports arrive at 25 Hz per pin. */
function throttle(subscribe: (l: () => void) => () => void, ms: number) {
  return (listener: () => void) => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const off = subscribe(() => {
      timer ??= setTimeout(() => {
        timer = null;
        listener();
      }, ms);
    });
    return () => {
      if (timer) clearTimeout(timer);
      off();
    };
  };
}

function useHwT(locale: Locale): T | null {
  const [loaded, setLoaded] = useState<{ locale: Locale; t: T } | null>(null);
  useEffect(() => {
    let live = true;
    const load = () =>
      loadHwMessages(locale).then(
        (messages) => live && setLoaded({ locale, t: createTranslator(locale, messages, `${locale}/hw`) }),
        // Offline before the chunk arrived: try again when the network is back.
        () => window.addEventListener("online", load, { once: true }),
      );
    void load();
    return () => {
      live = false;
      window.removeEventListener("online", load);
    };
  }, [locale]);
  return loaded?.locale === locale ? loaded.t : null;
}

/**
 * LabDock "Hardware" tab: connect a real Arduino running StandardFirmata over
 * Web Serial, then let the running sketch drive it and its inputs drive the sim.
 */
export function HardwareTwinPanel({ lab, itemId, store }: LabDockProps) {
  const locale = useLocale();
  const t = useHwT(locale);
  const support = useSyncExternalStore<SerialSupport | null>(noSubscribe, () => serialSupport(), () => null);
  const boardId = lab === "board" ? asBoardId(itemId) : null;
  const compatible = !!boardId && TWIN_BOARDS.includes(boardId);
  const titleId = useId();

  useEffect(() => {
    if (!boardId || !TWIN_BOARDS.includes(boardId)) return;
    const lessonId = lessonOf(store.getState());
    const sim = boardLabSim(store, boardId, lessonId !== null);
    const detach = twinSession.attach(sim);
    let live = true;
    if (lessonId) {
      // If the lesson can't load, its inputs stay unknown and the guard keeps every output off.
      lessonInputs(boardId, lessonId).then(
        (inputs) => live && sim.setInputs(inputs),
        () => undefined,
      );
    }
    return () => {
      live = false;
      detach();
    };
  }, [store, boardId]);

  if (!t || support === null) {
    return <div role="status" aria-busy="true" className="h-40 animate-pulse rounded-ink border-2 border-dashed border-rule bg-sunken motion-reduce:animate-none" />;
  }

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h2 id={titleId} className="font-head text-xl font-bold">
          {t("title")}
        </h2>
        <p className="text-sm text-muted">{t("intro")}</p>
      </header>
      {support !== "supported" ? (
        <Callout tone="note" title={t(support === "insecure" ? "support.insecureTitle" : "support.unsupportedTitle")}>
          {t(support === "insecure" ? "support.insecure" : "support.unsupported")}
        </Callout>
      ) : !compatible ? (
        <Callout tone="note" title={t("lab.unsupportedTitle")}>
          {t("lab.unsupported")}
        </Callout>
      ) : (
        <Twin t={t} />
      )}
    </section>
  );
}

function Twin({ t }: { t: T }) {
  const session = useSyncExternalStore(twinSession.subscribe, twinSession.getSnapshot, twinSession.getSnapshot);
  const connect = useCallback((port?: SerialPortLike) => void twinSession.connect(port), []);

  return (
    <div className="flex flex-col gap-4">
      {session.error ? (
        <Callout tone="danger" title={t("errors.title")} live>
          {t(`errors.${session.error}`)}
        </Callout>
      ) : null}
      {session.phase === "connected" && session.board && session.bridge ? (
        <Connected t={t} board={session.board} bridge={session.bridge} options={session.options} />
      ) : (
        <Setup t={t} session={session} onConnect={connect} />
      )}
    </div>
  );
}

function usbLabel(t: T, port: SerialPortLike): string {
  const usb = identifyUsb(port.getInfo());
  if (usb.kind === "board") return usb.name;
  if (usb.kind === "adapter") return t("board.adapter", { chip: usb.chip });
  return t("board.unknown");
}

function Setup({ t, session, onConnect }: { t: T; session: SessionSnapshot; onConnect: (port?: SerialPortLike) => void }) {
  const connecting = session.phase === "connecting";
  const known = session.known[0];
  return (
    <>
      <div className="ink-card p-4">
        <h3 className="ink-kicker">{t("setup.title")}</h3>
        <ol className="mt-2 flex list-decimal flex-col gap-2 ps-5 text-sm leading-relaxed">
          <li>{t("setup.flash")}</li>
          <li>{t("setup.monitor")}</li>
          <li>{t("setup.wiring")}</li>
        </ol>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap" aria-busy={connecting}>
        {known ? (
          <>
            <Button variant="primary" disabled={connecting} onClick={() => onConnect(known)}>
              {t("reconnect", { name: usbLabel(t, known) })}
            </Button>
            <Button variant="secondary" disabled={connecting} onClick={() => onConnect()}>
              {t("chooseOther")}
            </Button>
          </>
        ) : (
          <Button variant="primary" disabled={connecting} onClick={() => onConnect()}>
            {t("connect")}
          </Button>
        )}
      </div>
      {connecting ? (
        <p role="status" className="font-ui text-sm">
          {t("connecting")}
        </p>
      ) : null}
    </>
  );
}

function Connected({ t, board, bridge, options }: { t: T; board: FirmataBoard; bridge: TwinBridge; options: TwinOptions }) {
  const subscribeBoard = useMemo(() => throttle(board.subscribe, 100), [board]);
  const snap = useSyncExternalStore(subscribeBoard, board.getSnapshot, board.getSnapshot);
  const report = useSyncExternalStore(bridge.subscribe, bridge.getReport, bridge.getReport);
  const usb = identifyUsb(snap.usb);
  const analogCount = snap.pins.filter((p) => p.analogChannel !== null).length;

  return (
    <>
      <div className="ink-card flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="ink-kicker">{t("board.title")}</h3>
          <Button size="sm" variant="secondary" onClick={() => void twinSession.disconnect()}>
            {t("disconnect")}
          </Button>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="font-ui text-muted">{t("board.usb")}</dt>
          <dd className="min-w-0 break-words">
            {usb.kind === "board" ? usb.name : usb.kind === "adapter" ? t("board.adapter", { chip: usb.chip }) : t("board.unknown")}
            {usb.id ? <span className="ms-2 font-ui text-xs text-muted">{usb.id}</span> : null}
          </dd>
          <dt className="font-ui text-muted">{t("board.firmware")}</dt>
          <dd className="min-w-0 break-words">{snap.firmware ? `${snap.firmware.name} ${snap.firmware.major}.${snap.firmware.minor}` : t("pins.none")}</dd>
          <dt className="font-ui text-muted">{t("board.digital")}</dt>
          <dd>{snap.pins.length}</dd>
          <dt className="font-ui text-muted">{t("board.analog")}</dt>
          <dd>{analogCount}</dd>
        </dl>
        {snap.note ? <p className="font-ui text-xs text-muted">{t("board.note", { text: snap.note })}</p> : null}
      </div>

      <div className="flex flex-col gap-1">
        <Toggle
          checked={options.drive}
          onChange={(drive) => twinSession.setOptions({ drive })}
          label={t("toggles.drive")}
          description={t("toggles.driveHint")}
        />
        <Toggle
          checked={options.sense}
          onChange={(sense) => twinSession.setOptions({ sense })}
          label={t("toggles.sense")}
          description={t("toggles.senseHint")}
        />
      </div>

      <p role="status" className="flex items-center gap-2 font-ui text-sm">
        <span aria-hidden="true" className={cx("size-2.5 rounded-full border border-line", report.running ? "bg-mint" : "bg-sunken")} />
        {t(report.running ? "run.running" : "run.stopped")}
      </p>

      <Callout tone="warn" title={t("safety.title")}>
        {report.pinMaxMa !== null ? <p>{t("safety.current", { ma: report.pinMaxMa })}</p> : null}
        <p className="mt-1">{t("safety.inputs")}</p>
      </Callout>

      <PinTable t={t} report={report} board={snap} />
    </>
  );
}

function simText(t: T, view: PinView | null, percent: Intl.NumberFormat): string {
  if (!view) return t("pins.none");
  if (view.servoUs) return t("pins.servo", { us: Math.round(view.servoUs) });
  if (view.hz) return t("pins.tone", { hz: Math.round(view.hz) });
  if (view.mode === "output") return view.duty !== undefined ? t("pins.pwm", { duty: percent.format(view.duty) }) : t(view.level ? "pins.high" : "pins.low");
  if (view.volts !== undefined) return t("pins.volts", { volts: view.volts });
  return t("pins.input");
}

function realText(t: T, board: BoardSnapshot, report: TwinReport, pin: number, percent: Intl.NumberFormat, volts: Intl.NumberFormat): string {
  const p = board.pins[pin];
  if (!p || p.mode === null || p.value === null) return t("pins.none");
  switch (p.mode) {
    case PinMode.OUTPUT:
    case PinMode.INPUT:
    case PinMode.PULLUP:
      return t(p.value ? "pins.high" : "pins.low");
    case PinMode.PWM:
      return t("pins.pwm", { duty: percent.format(p.value / (2 ** (p.modes.get(PinMode.PWM) ?? 8) - 1)) });
    case PinMode.SERVO:
      return t("pins.servo", { us: p.value });
    case PinMode.ANALOG: {
      const max = 2 ** (p.modes.get(PinMode.ANALOG) ?? 10) - 1;
      return t("pins.volts", { volts: volts.format((p.value / max) * (report.adcVref ?? 5)) });
    }
    default:
      return t("pins.none");
  }
}

function statusOf(t: T, pin: TwinPin, report: TwinReport): { text: string; tone: ChipTone } {
  const { role } = pin;
  if (role.kind === "out") return report.drive && report.running ? { text: t("status.mirrored"), tone: "mint" } : { text: t("status.paused"), tone: "plain" };
  if (role.kind === "in") return report.sense ? { text: t("status.sensing"), tone: "cobalt" } : { text: t("status.notRead"), tone: "plain" };
  const danger = role.reason === "lesson-input" || role.reason === "serial";
  return { text: t(`status.${role.reason}`), tone: danger ? "mustard" : "plain" };
}

function PinTable({ t, report, board }: { t: T; report: TwinReport; board: BoardSnapshot }) {
  const locale = useLocale();
  const percent = useMemo(() => new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }), [locale]);
  const volts = useMemo(() => new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), [locale]);
  return (
    <div className="flex flex-col gap-2">
      <h3 className="ink-kicker">{t("pins.title")}</h3>
      {report.pins.length === 0 ? (
        <p className="rounded-ink border-2 border-dashed border-rule bg-sunken p-4 text-sm text-muted">{t("pins.empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-ink border-2 border-line bg-surface">
          <table className="w-full border-collapse text-start font-ui text-xs">
            <caption className="sr-only">{t("pins.caption")}</caption>
            <thead>
              <tr className="border-b-2 border-line text-muted">
                <th scope="col" className="px-2 py-2 text-start font-bold">{t("pins.pin")}</th>
                <th scope="col" className="px-2 py-2 text-start font-bold">{t("pins.sim")}</th>
                <th scope="col" className="px-2 py-2 text-start font-bold">{t("pins.real")}</th>
                <th scope="col" className="px-2 py-2 text-start font-bold">{t("pins.status")}</th>
              </tr>
            </thead>
            <tbody>
              {report.pins.map((pin) => {
                const status = statusOf(t, pin, report);
                return (
                  <tr key={pin.pin} className="border-b border-rule last:border-b-0">
                    <th scope="row" className="px-2 py-2 text-start font-extrabold">{pin.name}</th>
                    <td className="px-2 py-2 tabular-nums">{simText(t, pin.sim, percent)}</td>
                    <td className="px-2 py-2 tabular-nums">{realText(t, board, report, pin.pin, percent, volts)}</td>
                    <td className="px-2 py-2">
                      <Chip tone={status.tone}>{status.text}</Chip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
