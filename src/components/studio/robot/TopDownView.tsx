"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { Button, IconButton, cx } from "@/components/ui";
import type { PhysicsFrame } from "@/core/robot-report";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/namespaces";
import { createTranslator } from "@/i18n/translate";
import type { Project } from "@/project/generated/types";
import { fitRect, panBy, zoomAround } from "@/studio/engine/viewport";
import type { ArtElement, DrawItem, RectMm, Viewport } from "@/studio/engine/types";
import { buildTopDown, poseText } from "@/studio/views/topdown";
import type { LengthUnit } from "@/studio/views/topdown";

export interface TopDownViewProps {
  doc: Project;
  frame?: PhysicsFrame;
  trail?: Array<[number, number]>;
  selection?: string;
  onSelect(id: string): void;
  unit: LengthUnit;
  messages: Messages["robot"];
  lang: Locale;
}

const FIT_MARGIN_PX = 24;
const ZOOM_STEP = 1.25;
const WHEEL_STEP = 1.1;
const PAN_STEP_PX = 40;
const CLICK_SLOP_PX = 4;
const BODY_PREFIX = "body:";

/** The paper plate stays light in both themes, like the rest of the canvas. */
const PLATE: CSSProperties = {
  ["--studio-ink" as string]: "var(--color-ink-fixed)",
  ["--studio-body" as string]: "var(--color-mono-50)",
  ["--studio-pin" as string]: "var(--color-metal-d)",
  ["--studio-wire-blue" as string]: "var(--color-cobalt-m)",
  ["--studio-wire-red" as string]: "var(--color-tomato-m)",
  background: "var(--color-paper-fixed)",
};

type Pan = { x: number; y: number; moved: boolean };

function Element({ e, scaled }: { e: ArtElement; scaled: boolean }) {
  const paint = {
    fill: e.t === "path" || e.t === "circle" ? (e.fill ?? "none") : undefined,
    stroke: e.t === "path" || e.t === "circle" ? e.stroke : undefined,
    strokeWidth: e.t === "path" || e.t === "circle" ? e.sw : undefined,
    vectorEffect: scaled ? undefined : ("non-scaling-stroke" as const),
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (e.t === "path") return <path d={e.d} {...paint} />;
  if (e.t === "circle") return <circle cx={e.cx} cy={e.cy} r={e.r} {...paint} />;
  return null;
}

function Item({ item, selected, onSelect }: { item: DrawItem; selected: boolean; onSelect(id: string): void }) {
  const body = item.id.startsWith(BODY_PREFIX) ? item.id.slice(BODY_PREFIX.length) : null;
  return (
    <g
      data-item={item.id}
      onClick={body ? () => onSelect(body) : undefined}
      className={cx(body && "cursor-pointer", selected && "[&_*]:stroke-(--studio-wire-blue)")}
      style={body ? undefined : { pointerEvents: "none" }}
    >
      <title>{item.title}</title>
      {item.elements.map((e, i) => (
        <Element key={i} e={e} scaled={item.kind === "surface"} />
      ))}
    </g>
  );
}

const flipped = (r: RectMm): RectMm => ({ x0: r.x0, y0: -r.y1, x1: r.x1, y1: -r.y0 });

export function TopDownView({ doc, frame, trail, selection, onSelect, unit, messages, lang }: TopDownViewProps) {
  const t = useMemo(() => createTranslator(lang, messages, `${lang}/robot`), [lang, messages]);
  const scene = useMemo(() => buildTopDown(doc, frame, { trail }), [doc, frame, trail]);
  const stageRef = useRef<HTMLDivElement>(null);
  const pan = useRef<Pan | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [camera, setCamera] = useState<Viewport | null>(null);

  const extent = useMemo(() => {
    const floor = scene.items.find((i) => i.id === "floor") ?? scene.items[0];
    return floor ? flipped(floor.bbox) : null;
  }, [scene.items]);

  const fitted = useMemo<Viewport | null>(() => {
    if (!extent || size.w === 0 || size.h === 0) return null;
    return fitRect({ cx_mm: 0, cy_mm: 0, k: 1, w: size.w, h: size.h, dpr: 1 }, extent, FIT_MARGIN_PX);
  }, [extent, size]);
  const view = camera && camera.w === size.w && camera.h === size.h ? camera : fitted;

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const watch = new ResizeObserver(measure);
    watch.observe(el);
    return () => watch.disconnect();
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || !view) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const box = el.getBoundingClientRect();
      const factor = event.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP;
      setCamera(zoomAround(view, factor, { x: event.clientX - box.left, y: event.clientY - box.top }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [view]);

  function zoomBy(factor: number) {
    if (view) setCamera(zoomAround(view, factor, { x: view.w / 2, y: view.h / 2 }));
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    pan.current = { x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = pan.current;
    if (!start || !view) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.moved && Math.hypot(dx, dy) < CLICK_SLOP_PX) return;
    start.moved = true;
    pan.current = { ...start, x: event.clientX, y: event.clientY };
    setCamera(panBy(view, dx, dy));
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.releasePointerCapture(event.pointerId);
    window.setTimeout(() => (pan.current = null), 0);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!view) return;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [PAN_STEP_PX, 0],
      ArrowRight: [-PAN_STEP_PX, 0],
      ArrowUp: [0, PAN_STEP_PX],
      ArrowDown: [0, -PAN_STEP_PX],
    };
    const move = moves[event.key];
    if (move) setCamera(panBy(view, move[0], move[1]));
    else if (event.key === "+" || event.key === "=") zoomBy(ZOOM_STEP);
    else if (event.key === "-") zoomBy(1 / ZOOM_STEP);
    else if (event.key === "0") setCamera(null);
    else return;
    event.preventDefault();
  }

  function select(id: string) {
    if (!pan.current?.moved) onSelect(id);
  }

  const bodies = doc.mechanical?.bodies ?? [];
  const items = [...scene.items].sort((a, b) => a.z - b.z);
  const skipped = scene.skipped.map((id) => bodies.find((b) => b.id === id)?.name ?? id);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="relative min-h-64 flex-1 overflow-clip rounded-xl border border-rule" style={PLATE}>
        <div
          ref={stageRef}
          role="application"
          aria-label={t("topdown.canvas")}
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          className="absolute inset-0 cursor-grab touch-none focus-visible:outline-2 focus-visible:outline-(--focus) active:cursor-grabbing"
        >
          {view ? (
            <svg
              width={view.w}
              height={view.h}
              viewBox={`${view.cx_mm - view.w / (2 * view.k)} ${view.cy_mm - view.h / (2 * view.k)} ${view.w / view.k} ${view.h / view.k}`}
              aria-hidden="true"
              className="block"
            >
              <g transform="scale(1 -1)">
                {items.map((item) => (
                  <Item key={item.id} item={item} selected={selection !== undefined && item.id === `${BODY_PREFIX}${selection}`} onSelect={select} />
                ))}
              </g>
            </svg>
          ) : null}
        </div>
        <div className="absolute end-2 top-2 flex gap-1 rounded-lg bg-surface/90 p-1 backdrop-blur-sm">
          <Button variant="ghost" size="sm" aria-label={t("topdown.zoomIn")} onClick={() => zoomBy(ZOOM_STEP)}>
            +
          </Button>
          <Button variant="ghost" size="sm" aria-label={t("topdown.zoomOut")} onClick={() => zoomBy(1 / ZOOM_STEP)}>
            -
          </Button>
          <IconButton icon="expand" size="sm" label={t("topdown.fit")} onClick={() => setCamera(null)} />
        </div>
      </div>

      <section aria-label={t("topdown.readout")} className="flex flex-col gap-1">
        {bodies.length === 0 ? <p className="text-sm text-muted">{t("topdown.empty")}</p> : null}
        {bodies.length > 0 && !frame ? <p className="text-sm text-muted">{t("topdown.noFrame")}</p> : null}
        {skipped.length > 0 ? <p className="text-sm text-muted">{t("topdown.skipped", { names: skipped.join(", ") })}</p> : null}
        <ul className="flex flex-col gap-1">
          {bodies.map((body) => {
            const text = frame ? poseText(doc, frame, body.id, unit) : "";
            return (
              <li key={body.id}>
                <button
                  type="button"
                  aria-pressed={selection === body.id}
                  onClick={() => onSelect(body.id)}
                  className="w-full rounded-lg px-2 py-1 text-start text-sm motion-fade hover:bg-hover focus-visible:outline-2 focus-visible:outline-(--focus) aria-pressed:bg-sunken"
                >
                  <span className="font-semibold">{body.name}</span>
                  {text ? (
                    <span className="ms-2 font-mono text-muted tabular-nums">
                      <span className="sr-only">{t("topdown.groundTruth")}: </span>
                      {text.slice(body.name.length + 2)}
                    </span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
