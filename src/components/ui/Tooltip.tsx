"use client";

import { cloneElement, useEffect, useId, useLayoutEffect, useRef, useState, type FocusEvent, type PointerEvent, type ReactElement, type ReactNode } from "react";
import { cx } from "./cx";
import { Kbd } from "./Kbd";

const HOVER_DELAY = 400;
// The closest a tip comes to the edge of the screen.
const EDGE = 8;

// A touch screen has no hover to take a tip away again, and a tip that shows when a menu moves focus to its
// close button only covers the menu. Touch screens get the information from the visible text and labels instead.
function coarsePointer() {
  return typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches === true;
}

/**
 * When a tip shows: after a short hover with a mouse or pen, at once on keyboard focus, never on a coarse
 * pointer. Escape, leaving, a press or blur hides it. Spread the handlers on the element the tip belongs to.
 */
export function useTip() {
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

  const hide = () => {
    clearTimeout(delay.current);
    setOpen(false);
  };

  return {
    open,
    hide,
    onPointerEnter: (event: PointerEvent<Element>) => {
      if (event.pointerType === "touch" || coarsePointer()) return;
      clearTimeout(delay.current);
      delay.current = setTimeout(() => setOpen(true), HOVER_DELAY);
    },
    onPointerLeave: hide,
    onFocus: (event: FocusEvent<Element>) => {
      if (!coarsePointer() && (event.target as Element).matches(":focus-visible")) setOpen(true);
    },
    onBlur: hide,
  };
}

type TipBubbleProps = {
  id?: string;
  open: boolean;
  children: ReactNode;
  side?: "top" | "bottom";
  shortcut?: string;
  /** For a tip that repeats what the element already says to screen readers. */
  "aria-hidden"?: boolean;
};

/**
 * The tip itself, centred over or under its `relative` parent and moved sideways
 * as far as it takes to stay on the screen.
 */
export function TipBubble({ id, open, children, side = "top", shortcut, "aria-hidden": ariaHidden }: TipBubbleProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const tip = ref.current;
    if (!tip || !open) return;
    tip.style.translate = "";
    const rect = tip.getBoundingClientRect();
    const right = document.documentElement.clientWidth - EDGE;
    const shift = rect.right > right ? right - rect.right : rect.left < EDGE ? EDGE - rect.left : 0;
    if (shift !== 0) tip.style.translate = `calc(-50% + ${Math.round(shift)}px) 0`;
  }, [open]);

  return (
    <span
      ref={ref}
      id={id}
      role="tooltip"
      aria-hidden={ariaHidden || undefined}
      hidden={!open}
      className={cx(
        "pointer-events-none absolute start-1/2 z-40 flex w-max max-w-64 -translate-x-1/2 items-center gap-1.5 rounded-lg border-[1.5px] border-line bg-ink px-2.5 py-1 font-body text-xs font-semibold leading-snug text-paper shadow-ink-sm",
        side === "top" ? "bottom-full mb-2" : "top-full mt-2",
      )}
    >
      {children}
      {shortcut ? <Kbd className="text-ink">{shortcut}</Kbd> : null}
    </span>
  );
}

type TooltipProps = {
  content: string;
  /** One focusable element; it gets aria-describedby pointing at the tip. */
  children: ReactElement<{ "aria-describedby"?: string }>;
  side?: "top" | "bottom";
  /** A key that does the same thing, shown after the text. */
  shortcut?: string;
  className?: string;
};

/**
 * A short hint shown on hover and on keyboard focus, hidden again with Escape.
 * Keep the information elsewhere too: touch screens never show it.
 */
export function Tooltip({ content, children, side = "top", shortcut, className }: TooltipProps) {
  const id = useId();
  const tip = useTip();
  const described = [children.props["aria-describedby"], id].filter(Boolean).join(" ");

  return (
    <span
      className={cx("relative inline-flex", className)}
      onPointerEnter={tip.onPointerEnter}
      onPointerLeave={tip.onPointerLeave}
      onFocus={tip.onFocus}
      onBlur={tip.onBlur}
    >
      {cloneElement(children, { "aria-describedby": described })}
      <TipBubble id={id} open={tip.open} side={side} shortcut={shortcut}>
        {content}
      </TipBubble>
    </span>
  );
}
