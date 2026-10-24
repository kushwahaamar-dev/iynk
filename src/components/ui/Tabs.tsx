"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "./cx";

export type TabItem = { id: string; label: ReactNode; content: ReactNode };

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
};

/**
 * WAI-ARIA tabs with automatic activation: Left/Right (and Up/Down) move and
 * select, Home/End jump to the ends. Hidden panels stay mounted so what the
 * learner typed in them survives a tab switch.
 */
export function Tabs({ label, tabs, value, defaultValue, onChange, className, panelClassName }: TabsProps) {
  const base = useId();
  const [own, setOwn] = useState(defaultValue ?? tabs[0]?.id);
  const selected = value ?? own;
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function select(id: string) {
    if (value === undefined) setOwn(id);
    onChange?.(id);
  }

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
    <div className={className}>
      <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex gap-1 overflow-x-auto border-b-2 border-line">
        {tabs.map((tab) => {
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
                "-mb-0.5 min-h-11 shrink-0 rounded-t-lg border-2 border-b-0 px-3.5 font-ui text-sm font-bold uppercase tracking-wide",
                active ? "border-line bg-surface text-ink" : "border-transparent text-muted hover:text-ink",
              )}
            >
              {tab.label}
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
          className={cx("pt-4", panelClassName)}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
