"use client";

import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { VisuallyHidden } from "@/components/ui";
import type { Messages } from "@/i18n/namespaces";
import type { SceneController } from "@/studio/engine/controller";
import type { EditorEngine } from "@/studio/engine/engine";

export interface CanvasViewProps {
  engine: EditorEngine;
  /** Gets the pointer position for the status line. */
  controller?: SceneController;
  messages: Messages["studio"];
}

const PAN_STEP_PX = 48;
const ZOOM_STEP = 1.25;

const PAN_KEYS: Record<string, [number, number]> = {
  ArrowLeft: [PAN_STEP_PX, 0],
  ArrowRight: [-PAN_STEP_PX, 0],
  ArrowUp: [0, PAN_STEP_PX],
  ArrowDown: [0, -PAN_STEP_PX],
};

export function CanvasView({ engine, controller, messages }: CanvasViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const hintId = useId();

  useEffect(() => {
    const el = ref.current!;
    engine.mount(el);
    const track = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      controller?.setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    const leave = () => controller?.setCursor(null);
    el.addEventListener("pointermove", track);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", track);
      el.removeEventListener("pointerleave", leave);
      engine.dispose();
    };
  }, [engine, controller]);

  function onKeyDown(e: KeyboardEvent) {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const pan = PAN_KEYS[e.key];
    if (pan) engine.panBy(pan[0], pan[1]);
    else if (e.key === "+" || e.key === "=") engine.zoomBy(ZOOM_STEP);
    else if (e.key === "-") engine.zoomBy(1 / ZOOM_STEP);
    else if (e.key === "0") engine.fit();
    else return;
    e.preventDefault();
  }

  return (
    <div
      ref={ref}
      role="application"
      tabIndex={0}
      aria-label={messages.canvas.label}
      aria-describedby={hintId}
      onKeyDown={onKeyDown}
      className="relative size-full min-h-0 touch-none overflow-hidden bg-paper select-none focus-visible:-outline-offset-2"
    >
      <VisuallyHidden id={hintId}>{messages.canvas.hint}</VisuallyHidden>
    </div>
  );
}
