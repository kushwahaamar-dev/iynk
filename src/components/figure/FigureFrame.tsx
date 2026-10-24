"use client";

import {
  useCallback,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type Ref,
} from "react";
import { cx } from "@/components/ui/cx";
import { useCommonT, useLocale } from "@/i18n/client";
import { loadFigureStrings } from "@/i18n/figure-strings";
import { useResolvedTheme, useSettings } from "@/lib/settings/hooks";
import { CommandQueue } from "./queue";
import {
  envelope,
  parseFigureMessage,
  type FigureEvent,
  type FigureHandle,
  type FigureMessages,
  type FigurePart,
  type FigureTraffic,
  type HostCommand,
  type HostMessageType,
  type SendArgs,
} from "./protocol";

export type FigureFrameProps = {
  ref?: Ref<FigureHandle>;
  /** The built figure page, e.g. "/figures/boards/uno-r3.html". */
  src: string;
  /** Accessible name of the iframe. */
  title: string;
  /**
   * The figure's starting state, sent as `set` after `ready`. A figure can
   * reload at any time (Activity moves it, the user reloads it), so after
   * every `ready` FigureFrame replays this merged with every `set` sent since
   * (newest value per key). Passing the lab's current figure state works too.
   */
  initial?: Record<string, unknown>;
  /** Every figure -> host message, as `{ type, ...payload }`. */
  onEvent?: (event: FigureEvent) => void;
  /** Figure strings (CF_T) for this language; loaded from src/i18n/figures when omitted. */
  strings?: Record<string, string>;
  /** Show the list of the figure's pressable parts under it (default true). */
  controls?: boolean;
  className?: string;
  /** Overrides the iframe's sizing (default: 4:3, about 10:11 on phones). */
  frameClassName?: string;
};

// How long after the iframe's load event a figure may take to say `ready`.
const READY_TIMEOUT_MS = 10_000;

function withLang(src: string, lang: string): string {
  const [path, hash = ""] = src.split("#");
  if (/[?&]lang=/.test(path)) return src;
  return `${path}${path.includes("?") ? "&" : "?"}lang=${encodeURIComponent(lang)}${hash ? `#${hash}` : ""}`;
}

/**
 * Hosts one Colorfigures figure (D11). It owns the hello/ready handshake,
 * queues commands until the figure is ready, restores `initial`, the theme,
 * the language and the labels setting after every `ready`, pauses the figure
 * while Activity hides the page, and lists the figure's pressable parts as
 * real buttons for keyboard and screen-reader users.
 */
export function FigureFrame({
  ref,
  src,
  title,
  initial,
  onEvent,
  strings,
  controls = true,
  className,
  frameClassName,
}: FigureFrameProps) {
  const locale = useLocale();
  const t = useCommonT();
  const theme = useResolvedTheme();
  const { labels } = useSettings();

  const frameRef = useRef<HTMLIFrameElement>(null);
  const readyRef = useRef(false);
  const infoRef = useRef<FigureMessages["ready"] | null>(null);
  const queueRef = useRef(new CommandQueue());
  const observersRef = useRef(new Set<(traffic: FigureTraffic) => void>());
  const hiddenRef = useRef(false);
  // What the host has told this figure about its state, replayed after each ready.
  const stateRef = useRef<{ src: string; state: Record<string, unknown> } | null>(null);
  const initialJson = initial ? JSON.stringify(initial) : "";

  const [info, setInfo] = useState<FigureMessages["ready"] | null>(null);
  // The pressable parts can change as the figure's state changes (a build step adds a part).
  const [parts, setParts] = useState<FigurePart[]>([]);
  const [failed, setFailed] = useState(false);
  const [loadedAt, setLoadedAt] = useState(0);
  const [loadedStrings, setLoadedStrings] = useState<{ locale: string; strings: Record<string, string> } | null>(null);
  const figureStrings = strings ?? (loadedStrings?.locale === locale ? loadedStrings.strings : undefined);

  const notify = useCallback((traffic: FigureTraffic) => {
    for (const observer of [...observersRef.current]) observer(traffic);
  }, []);

  const post = useCallback(
    (command: HostCommand) => {
      const target = frameRef.current?.contentWindow;
      if (!target) return;
      target.postMessage(envelope(command), window.location.origin);
      notify({ dir: "out", message: command, at: performance.now() });
    },
    [notify],
  );

  const dispatch = useCallback(
    (command: HostCommand) => {
      if (command.type === "set" && stateRef.current) {
        stateRef.current.state = { ...stateRef.current.state, ...command.state };
      }
      if (readyRef.current) post(command);
      else queueRef.current.push(command);
    },
    [post],
  );

  const send = useCallback(
    <T extends HostMessageType>(type: T, ...args: SendArgs<T>) => dispatch({ type, ...(args[0] ?? {}) } as HostCommand),
    [dispatch],
  );

  useImperativeHandle(
    ref,
    (): FigureHandle => ({
      send,
      sendCustom: (name, payload = {}) => dispatch({ type: "custom", name, payload }),
      observe(listener) {
        observersRef.current.add(listener);
        return () => {
          observersRef.current.delete(listener);
        };
      },
      isReady: () => readyRef.current,
      info: () => infoRef.current,
      focus: () => {
        frameRef.current?.focus();
        frameRef.current?.contentWindow?.focus();
      },
    }),
    [send, dispatch],
  );

  // Everything the figure must hear after each `ready`: it may be a fresh
  // document that knows nothing about this lab.
  const restore = useEffectEvent(() => {
    post({ type: "theme", mode: theme });
    post({ type: "locale", lang: locale, ...(figureStrings ? { strings: figureStrings } : {}) });
    post({ type: "labels", on: labels });
    const state = stateRef.current?.state;
    if (state && Object.keys(state).length > 0) post({ type: "set", state });
    for (const command of queueRef.current.drain()) post(command);
  });

  const receive = useEffectEvent((message: FigureEvent) => {
    // Until the bridge registers pause/resume, it answers them as unknown;
    // that is not a problem worth reporting to the lab.
    if (message.type === "error" && /^unknown message "(pause|resume)"$/.test(message.message)) return;
    notify({ dir: "in", message, at: performance.now() });
    if (message.type === "ready") {
      readyRef.current = true;
      infoRef.current = message;
      setInfo((previous) => (previous && JSON.stringify(previous) === JSON.stringify(message) ? previous : message));
      setParts((previous) => sameParts(previous, message.parts));
      setFailed(false);
      restore();
    } else if (message.type === "state" && message.parts) {
      const next = message.parts;
      setParts((previous) => sameParts(previous, next));
    }
    onEvent?.(message);
  });

  // Pause on hide, resume on show. Activity runs these cleanups when it hides
  // the page; the contentWindow captured here still reaches the figure.
  useLayoutEffect(() => {
    const target = frameRef.current?.contentWindow;
    if (hiddenRef.current) {
      hiddenRef.current = false;
      target?.postMessage(envelope({ type: "resume" }), window.location.origin);
    }
    return () => {
      hiddenRef.current = true;
      readyRef.current = false;
      target?.postMessage(envelope({ type: "pause" }), window.location.origin);
    };
  }, []);

  // Listen while shown, and say hello on every show: a figure that reloaded
  // while hidden announced itself to nobody.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const frame = frameRef.current;
      if (!frame || event.source !== frame.contentWindow || event.origin !== window.location.origin) return;
      const message = parseFigureMessage(event.data);
      if (message) receive(message);
    };
    window.addEventListener("message", onMessage);
    post({ type: "hello" });
    return () => window.removeEventListener("message", onMessage);
  }, [post]);

  // A new src is a new document: queue until it says ready.
  useLayoutEffect(() => {
    readyRef.current = false;
    infoRef.current = null;
  }, [src]);

  // A new `initial` updates the state to replay; a new figure starts from it.
  useLayoutEffect(() => {
    const base = initialJson ? (JSON.parse(initialJson) as Record<string, unknown>) : {};
    const current = stateRef.current;
    stateRef.current = { src, state: current?.src === src ? { ...current.state, ...base } : base };
  }, [src, initialJson]);

  // Keep a ready figure in step with the host's theme, language and labels.
  useEffect(() => {
    if (readyRef.current) post({ type: "theme", mode: theme });
  }, [post, theme]);
  useEffect(() => {
    if (readyRef.current) post({ type: "labels", on: labels });
  }, [post, labels]);
  useEffect(() => {
    if (readyRef.current && figureStrings) post({ type: "locale", lang: locale, strings: figureStrings });
  }, [post, locale, figureStrings]);

  // Figure strings for this language, unless the page passed them.
  useEffect(() => {
    if (strings || locale === "en") return;
    let live = true;
    loadFigureStrings(locale).then(
      (loaded) => {
        if (live) setLoadedStrings({ locale, strings: loaded });
      },
      (error: unknown) => console.error(error),
    );
    return () => {
      live = false;
    };
  }, [locale, strings]);

  // Never reset readiness on load: a figure's `ready` can arrive before it.
  const onLoad = useCallback(() => {
    post({ type: "hello" });
    setLoadedAt(performance.now());
  }, [post]);

  useEffect(() => {
    if (!loadedAt) return;
    const timer = window.setTimeout(() => {
      if (!readyRef.current && !hiddenRef.current) setFailed(true);
    }, READY_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [loadedAt]);

  const buttons = info?.buttons ?? [];
  const switches = info?.switches ?? [];
  const count = buttons.length + switches.length + parts.length;
  const hasControls = controls && count > 0;

  return (
    <div className={cx("figure-frame flex min-w-0 flex-col gap-3", className)}>
      <div className="relative">
        <iframe
          ref={frameRef}
          src={withLang(src, locale)}
          title={title}
          loading="lazy"
          onLoad={onLoad}
          aria-busy={!info && !failed}
          className={cx("ink-plate block aspect-[10/11] max-h-[80vh] w-full sm:aspect-[4/3]", frameClassName)}
        />
        <p role="status" className={cx(failed ? "mt-2 text-sm font-bold text-bad" : "sr-only")}>
          {failed ? t("figure.failed") : info ? "" : t("figure.loading")}
        </p>
      </div>

      {hasControls && (
        <details className="ink-card px-4 py-3 text-sm">
          <summary className="cursor-pointer font-ui font-bold">
            {t("figure.controls")} ({count})
          </summary>
          <p className="mt-2 text-muted">{t("figure.controlsHint")}</p>
          {buttons.length + switches.length > 0 && (
            <ControlGroup
              label={t("figure.buttons")}
              items={[
                ...buttons.map((button) => ({
                  key: `b:${button.id}`,
                  label: button.label,
                  onPress: () => send("press", { id: button.id }),
                })),
                ...switches.map((toggle) => ({
                  key: `s:${toggle.id}`,
                  label: toggle.label,
                  pressed: toggle.on,
                  onPress: () => send("press", { id: toggle.id }),
                })),
              ]}
            />
          )}
          {parts.length > 0 && (
            <ControlGroup
              label={t("figure.parts")}
              items={parts.map((part) => ({
                key: `p:${part.act}|${part.id ?? ""}`,
                label: part.label,
                onPress: () => send("act", part.id === null ? { name: part.act } : { name: part.act, data: { id: part.id } }),
              }))}
            />
          )}
        </details>
      )}
    </div>
  );
}

function sameParts(previous: FigurePart[], next: FigurePart[]): FigurePart[] {
  return JSON.stringify(previous) === JSON.stringify(next) ? previous : next;
}

type ControlItem = { key: string; label: string; pressed?: boolean; onPress: () => void };

function ControlGroup({ label, items }: { label: string; items: ControlItem[] }) {
  return (
    <div className="mt-3" role="group" aria-label={label}>
      <p className="ink-kicker" aria-hidden="true">
        {label}
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              aria-pressed={item.pressed}
              onClick={item.onPress}
              className="touch-target rounded-full border-2 border-line bg-surface px-3 py-1.5 font-ui text-xs font-bold text-ink hover:bg-sunken"
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
