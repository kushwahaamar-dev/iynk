"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { rankCommands, type CommandItem } from "@/components/shell/command-items";
import { cx } from "./cx";
import { Icon } from "./icons";
import { nextIndex, type NavKey } from "./menu-nav";
import { useIsClient, useModal } from "./useModal";

export type CommandGroup = { id: string; label: string; items: readonly CommandItem[] };

type CommandMenuProps = {
  open: boolean;
  onClose: () => void;
  /** Accessible name of the dialog and of the search field. */
  label: string;
  placeholder: string;
  emptyLabel: string;
  groups: readonly CommandGroup[];
};

const NAV_KEYS = new Set<string>(["ArrowDown", "ArrowUp", "Home", "End"]);

/** A search field over groups of actions: type to filter, arrows to move, Enter to run, Escape to close. */
export function CommandMenu({ open, onClose, ...rest }: CommandMenuProps) {
  const isClient = useIsClient();
  if (!open || !isClient) return null;
  return createPortal(<CommandPanel onClose={onClose} {...rest} />, document.body);
}

function CommandPanel({ onClose, label, placeholder, emptyLabel, groups }: Omit<CommandMenuProps, "open">) {
  const id = useId();
  const layerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const onModalKeyDown = useModal(true, layerRef, panelRef, onClose);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const visible = groups
    .map((group) => ({ ...group, items: rankCommands(group.items, query) }))
    .filter((group) => group.items.length > 0);
  const flat = visible.flatMap((group) => group.items);
  const current = Math.min(active, flat.length - 1);
  const optionId = (item: CommandItem) => `${id}-o-${item.id}`;

  const activeId = current >= 0 ? optionId(flat[current]) : undefined;
  useEffect(() => {
    if (activeId) document.getElementById(activeId)?.scrollIntoView?.({ block: "nearest" });
  }, [activeId]);

  function run(item: CommandItem) {
    onClose();
    item.onSelect();
  }

  function onInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (NAV_KEYS.has(event.key)) {
      event.preventDefault();
      const next = nextIndex(flat, current, event.key as NavKey);
      if (next >= 0) setActive(next);
    } else if (event.key === "Enter" && !event.nativeEvent.isComposing && current >= 0) {
      event.preventDefault();
      run(flat[current]);
    }
  }

  return (
    <div
      ref={layerRef}
      className="fixed inset-0 z-overlay flex items-start justify-center bg-(--scrim) px-3 pt-16 animate-fade-in sm:px-6 sm:pt-24"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onKeyDown={onModalKeyDown}
        className="flex max-h-[calc(100dvh-8rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-raised text-ink shadow-lg outline-none animate-rise-in"
      >
        <div className="flex items-center gap-3 border-b border-rule px-4 py-3">
          <Icon name="search" size={20} className="shrink-0 text-muted" />
          <input
            data-autofocus
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={`${id}-list`}
            aria-activedescendant={activeId}
            aria-autocomplete="list"
            aria-label={label}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={placeholder}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKeyDown}
            className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted"
          />
        </div>
        <div id={`${id}-list`} role="listbox" aria-label={label} className="max-h-96 overflow-y-auto p-2 empty:hidden">
          {visible.map((group) => (
            <div key={group.id} role="group" aria-labelledby={`${id}-g-${group.id}`}>
              <div id={`${id}-g-${group.id}`} role="presentation" className="kicker px-3 py-2">
                {group.label}
              </div>
              {group.items.map((item) => (
                <div
                  key={item.id}
                  id={optionId(item)}
                  role="option"
                  aria-selected={flat[current] === item}
                  onMouseMove={() => setActive(flat.indexOf(item))}
                  onClick={() => run(item)}
                  className={cx(
                    "flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-base",
                    flat[current] === item && "bg-hover",
                  )}
                >
                  {item.icon ? <Icon name={item.icon} size={20} className="shrink-0 text-muted" /> : null}
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
        {flat.length === 0 ? <p className="px-4 py-8 text-center text-base text-pretty text-muted">{emptyLabel}</p> : null}
      </div>
    </div>
  );
}
