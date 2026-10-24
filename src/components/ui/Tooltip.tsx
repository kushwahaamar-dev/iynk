"use client";

import { cloneElement, useEffect, useId, useRef, useState, type ReactElement } from "react";
import { cx } from "./cx";

type TooltipProps = {
  content: string;
  /** One focusable element; it gets aria-describedby pointing at the tip. */
  children: ReactElement<{ "aria-describedby"?: string }>;
  side?: "top" | "bottom";
  className?: string;
};

/**
 * A short hint shown on hover and on keyboard focus, hidden again with Escape.
 * Keep the information elsewhere too: touch screens never show it.
 */
export function Tooltip({ content, children, side = "top", className }: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const delay = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(delay.current), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const show = (wait: number) => {
    clearTimeout(delay.current);
    delay.current = setTimeout(() => setOpen(true), wait);
  };
  const hide = () => {
    clearTimeout(delay.current);
    setOpen(false);
  };

  const described = [children.props["aria-describedby"], id].filter(Boolean).join(" ");

  return (
    <span
      className={cx("relative inline-flex", className)}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") show(350);
      }}
      onPointerLeave={hide}
      onFocus={() => show(0)}
      onBlur={hide}
    >
      {cloneElement(children, { "aria-describedby": described })}
      <span
        id={id}
        role="tooltip"
        hidden={!open}
        className={cx(
          "pointer-events-none absolute start-1/2 z-40 w-max max-w-64 -translate-x-1/2 rounded-lg border-[1.5px] border-line bg-ink px-2.5 py-1 font-ui text-xs font-bold text-paper shadow-ink-sm",
          side === "top" ? "bottom-full mb-2" : "top-full mt-2",
        )}
      >
        {content}
      </span>
    </span>
  );
}
