"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "./cx";

export type TabItem = {
  id: string;
  label: ReactNode;
  content: ReactNode;
  /** Drawn after the label, e.g. "2/3". */
  badge?: ReactNode;
};

type TabsProps = {
  /** Accessible name of the tab list. */
  label: string;
  tabs: readonly TabItem[];
  /** Controlled selection; leave out for an uncontrolled list. */
  value?: string;
  defaultValue?: string;
  onChange?: (id: string) => void;
  className?: string;
  panelClassName?: string;
  /** Fill the parent's height: the list stays put and each panel scrolls (workspace rails). */
  fill?: boolean;
  listClassName?: string;
  /** Under sm, lay the tabs out in rows of up to three that each fill the width, labels wrapping, instead of a strip that cuts the last ones. */
  phoneGrid?: boolean;
};

// A six-column grid lets every row fill the width whatever its count: rows of three take 2 columns a tab, rows of two take 3, a lone tab 6.
const PHONE_SPAN = { 1: "max-sm:col-span-6", 2: "max-sm:col-span-3", 3: "max-sm:col-span-2" } as const;

function phoneSpan(index: number, count: number) {
  const perRow = count === 4 ? 2 : Math.min(count, 3);
  const inRow = Math.min(perRow, count - (index - (index % perRow)));
  return PHONE_SPAN[inRow as keyof typeof PHONE_SPAN];
}

/**
 * WAI-ARIA tabs with automatic activation: Left/Right (and Up/Down) move and
 * select, Home/End jump to the ends. Hidden panels stay mounted so what the
 * learner typed in them survives a tab switch.
 */
export function Tabs({ label, tabs, value, defaultValue, onChange, className, panelClassName, fill, listClassName, phoneGrid }: TabsProps) {
  const base = useId();
  const [own, setOwn] = useState(defaultValue ?? tabs[0]?.id);
  const selected = value ?? own;
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const listRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState<"start" | "end" | "both" | undefined>(undefined);

  function select(id: string) {
    if (value === undefined) setOwn(id);
    onChange?.(id);
  }

  // Which ends of a strip that is wider than its box have hidden tabs: they get an edge fade.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const measure = () => {
      const max = list.scrollWidth - list.clientWidth;
      if (max <= 1 || getComputedStyle(list).display === "grid") return setOverflow(undefined);
      const atStart = list.scrollLeft <= 1;
      const atEnd = list.scrollLeft >= max - 1;
      setOverflow(atStart ? "end" : atEnd ? "start" : "both");
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(list);
    list.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer?.disconnect();
      list.removeEventListener("scroll", measure);
    };
  }, [tabs.length]);

  // Keep the selected tab inside the strip (only sideways: the page never jumps).
  useEffect(() => {
    const list = listRef.current;
    const tab = selected ? refs.current[selected] : null;
    if (!list || !tab || list.scrollWidth <= list.clientWidth) return;
    const left = tab.offsetLeft - list.offsetLeft;
    if (left < list.scrollLeft) list.scrollLeft = left - 8;
    else if (left + tab.offsetWidth > list.scrollLeft + list.clientWidth) list.scrollLeft = left + tab.offsetWidth - list.clientWidth + 8;
  }, [selected]);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = tabs.findIndex((t) => t.id === selected);
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % tabs.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    if (next === null) return;
    event.preventDefault();
    const id = tabs[next].id;
    select(id);
    refs.current[id]?.focus();
  }

  return (
    <div className={cx(fill && "flex h-full min-h-0 flex-col", className)}>
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        data-overflow={overflow}
        className={cx(
          "flex shrink-0 gap-1 overflow-x-auto border-b border-rule [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          "data-[overflow=end]:[mask-image:linear-gradient(to_right,#000_calc(100%-2.5rem),transparent)]",
          "data-[overflow=start]:[mask-image:linear-gradient(to_left,#000_calc(100%-2.5rem),transparent)]",
          "data-[overflow=both]:[mask-image:linear-gradient(to_right,transparent,#000_2.5rem,#000_calc(100%-2.5rem),transparent)]",
          phoneGrid && "max-sm:grid max-sm:grid-cols-6 max-sm:gap-0",
          listClassName,
        )}
      >
        {tabs.map((tab, index) => {
          const active = tab.id === selected;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                refs.current[tab.id] = el;
              }}
              id={`${base}-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`${base}-panel-${tab.id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => select(tab.id)}
              className={cx(
                "relative inline-flex min-h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold motion-fade",
                "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:origin-center after:scale-x-0 after:bg-ink after:motion-move aria-selected:after:scale-x-100",
                // The strip scrolls sideways and would clip a ring drawn outside the tab.
                "focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-(--focus) focus-visible:shadow-none",
                phoneGrid && phoneSpan(index, tabs.length),
                phoneGrid && "max-sm:whitespace-normal max-sm:px-2 max-sm:text-center max-sm:leading-tight",
                active ? "text-ink" : "text-muted hover:bg-hover hover:text-ink",
              )}
            >
              {tab.label}
              {tab.badge !== undefined && tab.badge !== null ? (
                <>
                  {/* a space, so the name reads "Steps 0/17"; it collapses at the label's end, the margin draws the gap */}{" "}
                  <span className="tabular ms-2 rounded-md bg-sunken px-2 text-xs font-semibold">{tab.badge}</span>
                </>
              ) : null}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`${base}-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`${base}-tab-${tab.id}`}
          tabIndex={0}
          hidden={tab.id !== selected}
          className={cx(fill ? "min-h-0 flex-1 overflow-y-auto p-4" : "pt-4", panelClassName)}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
