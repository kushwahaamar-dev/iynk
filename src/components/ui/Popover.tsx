"use client";

import { cloneElement, useCallback, useEffect, useId, useRef, useState, type ReactElement, type ReactNode } from "react";
import { cx } from "./cx";
import { focusableIn } from "./useModal";

type TriggerProps = {
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
  "aria-haspopup"?: "dialog";
  popoverTarget?: string;
};

type PopoverProps = {
  /** Accessible name of the panel. */
  label: string;
  /** A button: it becomes the popover's invoker. */
  trigger: ReactElement<TriggerProps>;
  /** Which edge of the trigger the panel lines up with. */
  align?: "start" | "end";
  children: ReactNode;
  className?: string;
};

const GAP = 6;
const EDGE = 8;

/**
 * A small panel over the page (a menu, a few settings), opened by its trigger.
 * It uses the native popover: top layer, light dismiss and Escape come from the
 * browser. Focus moves to the first control on open and back to the trigger on close.
 */
export function Popover({ label, trigger, align = "end", children, className }: PopoverProps) {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const place = useCallback(() => {
    const panel = panelRef.current;
    const invoker = panel ? document.querySelector<HTMLElement>(`[popovertarget="${CSS.escape(panel.id)}"]`) : null;
    if (!panel || !invoker) return;
    const rect = invoker.getBoundingClientRect();
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    let left = align === "end" ? rect.right - width : rect.left;
    left = Math.min(Math.max(EDGE, left), window.innerWidth - width - EDGE);
    let top = rect.bottom + GAP;
    if (top + height > window.innerHeight - EDGE && rect.top - GAP - height >= EDGE) top = rect.top - GAP - height;
    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(Math.max(EDGE, top))}px`;
  }, [align]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const onToggle = (event: Event) => {
      const next = (event as ToggleEvent).newState === "open";
      setOpen(next);
      if (next) {
        place();
        focusableIn(panel)[0]?.focus();
      } else if (panel.contains(document.activeElement) || document.activeElement === document.body) {
        document.querySelector<HTMLElement>(`[popovertarget="${CSS.escape(panel.id)}"]`)?.focus();
      }
    };
    panel.addEventListener("toggle", onToggle);
    return () => panel.removeEventListener("toggle", onToggle);
  }, [place]);

  useEffect(() => {
    if (!open) return;
    const onMove = () => place();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, place]);

  return (
    <>
      {cloneElement(trigger, { "aria-expanded": open, "aria-controls": id, "aria-haspopup": "dialog", popoverTarget: id })}
      <div
        ref={panelRef}
        id={id}
        popover="auto"
        role="dialog"
        aria-label={label}
        className={cx(
          "fixed inset-auto m-0 w-[min(20rem,calc(100vw-2rem))] rounded-2xl bg-raised p-4 text-ink shadow-lg open:animate-fade-in",
          className,
        )}
      >
        {children}
      </div>
    </>
  );
}
