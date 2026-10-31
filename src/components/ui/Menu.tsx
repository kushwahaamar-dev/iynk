"use client";

import { cloneElement, useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactElement } from "react";
import { cx } from "./cx";
import { Icon, type IconName } from "./icons";
import { Kbd } from "./Kbd";
import { nextIndex, typeahead, type NavKey } from "./menu-nav";

export type MenuItem =
  | {
      id: string;
      label: string;
      icon?: IconName;
      /** A key that does the same thing, drawn at the end of the row. */
      shortcut?: string;
      onSelect: () => void;
      disabled?: boolean;
      tone?: "danger";
    }
  | { separator: true };

type TriggerProps = {
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
  "aria-haspopup"?: "menu";
  popoverTarget?: string;
};

type MenuProps = {
  /** Accessible name of the menu. */
  label: string;
  /** A button: it becomes the menu's invoker. */
  trigger: ReactElement<TriggerProps>;
  items: readonly MenuItem[];
  /** Which edge of the trigger the panel lines up with. */
  align?: "start" | "end";
  className?: string;
};

const GAP = 6;
const EDGE = 8;
const TYPING_PAUSE_MS = 700;

const NAV_KEYS = new Set<string>(["ArrowDown", "ArrowUp", "Home", "End"]);

/**
 * A list of actions opened from a button. It uses the native popover (top layer
 * and light dismiss from the browser) with menu semantics: arrows, Home, End and
 * typing a letter move between items, Enter or Space runs one and closes the menu,
 * Escape closes it and focus goes back to the trigger.
 */
export function Menu({ label, trigger, items, align = "end", className }: MenuProps) {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const [open, setOpen] = useState(false);

  const actions = items.filter((item): item is Exclude<MenuItem, { separator: true }> => !("separator" in item));

  const invoker = useCallback(() => {
    const panel = panelRef.current;
    return panel ? document.querySelector<HTMLElement>(`[popovertarget="${CSS.escape(panel.id)}"]`) : null;
  }, []);

  const place = useCallback(() => {
    const panel = panelRef.current;
    const anchor = invoker();
    if (!panel || !anchor) return;
    const rect = anchor.getBoundingClientRect();
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    let left = align === "end" ? rect.right - width : rect.left;
    left = Math.min(Math.max(EDGE, left), window.innerWidth - width - EDGE);
    let top = rect.bottom + GAP;
    if (top + height > window.innerHeight - EDGE && rect.top - GAP - height >= EDGE) top = rect.top - GAP - height;
    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(Math.max(EDGE, top))}px`;
  }, [align, invoker]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const onToggle = (event: Event) => {
      const next = (event as ToggleEvent).newState === "open";
      setOpen(next);
      if (next) {
        place();
        panel.focus();
      } else if (panel.contains(document.activeElement) || document.activeElement === document.body) {
        invoker()?.focus();
      }
    };
    panel.addEventListener("toggle", onToggle);
    return () => panel.removeEventListener("toggle", onToggle);
  }, [place, invoker]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [open, place]);

  function rows(): HTMLElement[] {
    return Array.from(panelRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
  }

  function close() {
    panelRef.current?.hidePopover();
  }

  function select(item: Exclude<MenuItem, { separator: true }>) {
    if (item.disabled) return;
    close();
    item.onSelect();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const current = rows().indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "Tab") {
      close();
    } else if (NAV_KEYS.has(event.key)) {
      event.preventDefault();
      rows()[nextIndex(actions, current, event.key as NavKey)]?.focus();
    } else if ((event.key === "Enter" || event.key === " ") && current >= 0) {
      event.preventDefault();
      select(actions[current]);
    } else if (event.key.length === 1 && event.key !== " ") {
      event.preventDefault();
      const now = event.timeStamp;
      const text = now - typed.current.at > TYPING_PAUSE_MS ? event.key : typed.current.text + event.key;
      typed.current = { text, at: now };
      rows()[typeahead(actions, current, text)]?.focus();
    }
  }

  return (
    <>
      {cloneElement(trigger, { "aria-expanded": open, "aria-controls": id, "aria-haspopup": "menu", popoverTarget: id })}
      <div
        ref={panelRef}
        id={id}
        popover="auto"
        role="menu"
        aria-label={label}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={cx(
          "fixed inset-auto m-0 min-w-48 rounded-2xl bg-raised p-2 text-ink shadow-lg outline-none open:animate-fade-in",
          className,
        )}
      >
        {items.map((item, index) =>
          "separator" in item ? (
            <div key={`separator-${index}`} role="separator" className="my-2 h-px bg-rule" />
          ) : (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              tabIndex={-1}
              aria-disabled={item.disabled || undefined}
              onClick={() => select(item)}
              className={cx(
                "motion-fade motion-press flex min-h-10 w-full select-none items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-semibold hover:bg-hover focus:bg-hover active:scale-98",
                item.tone === "danger" ? "text-bad" : "text-ink",
                "aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-transparent aria-disabled:active:scale-100",
              )}
            >
              {item.icon ? <Icon name={item.icon} size={20} /> : null}
              <span className="min-w-0 flex-1">{item.label}</span>
              {item.shortcut ? <Kbd>{item.shortcut}</Kbd> : null}
            </button>
          ),
        )}
      </div>
    </>
  );
}
