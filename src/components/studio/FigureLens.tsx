"use client";

import { useEffect, useRef } from "react";
import { FigureFrame } from "@/components/figure/FigureFrame";
import type { FigureEvent, FigureHandle } from "@/components/figure/protocol";
import { Button } from "@/components/ui/Button";
import type { Messages } from "@/i18n/namespaces";
import { lensPatch, lensSrc, lensState, type LensInput } from "@/studio/guide/lens-state";

export type LensMode = "view" | "tour";

export interface FigureLensProps {
  /** A tour step acts on the figure itself, so only `tour` hands the figure's handle out. */
  mode: LensMode;
  onHandle?(h: FigureHandle | null): void;
  legacyFigure: LensInput["legacyFigure"];
  state: Omit<LensInput, "legacyFigure">;
  /** The figure's own state, for the assembly gates that read it. */
  onFigureState?(s: Record<string, unknown>): void;
  title: string;
  open: boolean;
  onToggle(): void;
  messages: Messages["studio"];
}

// The Run button is Studio's, so the figure's own copy of it stays hidden.
const HOST_CHROME = ["run", "stats"] as const;

export function FigureLens({ legacyFigure, open, onToggle, messages, title, ...rest }: FigureLensProps) {
  const text = messages.lesson.lens;
  return (
    <section className="flex min-w-0 flex-col gap-2" aria-label={title}>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="secondary" aria-expanded={open} onClick={onToggle}>
          {open ? text.close : text.open}
        </Button>
        {open && <p className="text-sm text-muted">{text.readOnly}</p>}
      </div>
      {open && <OpenLens {...rest} legacyFigure={legacyFigure} title={title} />}
    </section>
  );
}

function OpenLens({
  mode,
  onHandle,
  legacyFigure,
  state,
  onFigureState,
  title,
}: Pick<FigureLensProps, "mode" | "onHandle" | "legacyFigure" | "state" | "onFigureState" | "title">) {
  const handle = useRef<FigureHandle>(null);
  const next = lensState({ ...state, legacyFigure });
  const sent = useRef(next);

  useEffect(() => {
    const patch = lensPatch(sent.current, next);
    sent.current = next;
    if (Object.keys(patch).length > 0) handle.current?.send("set", { state: patch });
  }, [next]);

  useEffect(() => {
    if (mode !== "tour" || !onHandle) return;
    onHandle(handle.current);
    return () => onHandle(null);
  }, [mode, onHandle]);

  const onEvent = (event: FigureEvent) => {
    if (event.type === "state") onFigureState?.(event.state);
  };

  return (
    <FigureFrame
      ref={handle}
      src={lensSrc(legacyFigure)}
      title={title}
      initial={next}
      onEvent={onEvent}
      controls={false}
      hideChrome={HOST_CHROME}
    />
  );
}
