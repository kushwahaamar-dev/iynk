"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "./cx";

export type SegmentOption<V extends string> = { value: V; label: string; icon?: ReactNode };

type SegmentedControlProps<V extends string> = {
  label: string;
  options: readonly SegmentOption<V>[];
  value: V;
  onChange: (value: V) => void;
  /** Show only the icons; the labels stay as accessible names. */
  iconOnly?: boolean;
  size?: "sm" | "md";
  className?: string;
};

/**
 * One choice out of a few (role="radiogroup"). Arrow keys move the choice,
 * Home and End jump to the ends; only the chosen option is in the tab order.
 */
export function SegmentedControl<V extends string>({ label, options, value, onChange, iconOnly, size = "md", className }: SegmentedControlProps<V>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const current = Math.max(0, options.findIndex((o) => o.value === value));

  function move(index: number) {
    const next = (index + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const keys: Record<string, number> = {
      ArrowRight: current + 1,
      ArrowDown: current + 1,
      ArrowLeft: current - 1,
      ArrowUp: current - 1,
      Home: 0,
      End: options.length - 1,
    };
    if (event.key in keys) {
      event.preventDefault();
      move(keys[event.key]);
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cx("inline-flex rounded-full border-2 border-line bg-surface p-0.5", className)}
    >
      {options.map((option, i) => {
        const checked = i === current;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={iconOnly ? option.label : undefined}
            title={iconOnly ? option.label : undefined}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cx(
              "inline-flex items-center justify-center gap-1.5 rounded-full font-ui font-bold transition-colors",
              size === "sm" ? "min-h-9 px-2.5 text-xs" : "min-h-10 px-3.5 text-sm",
              iconOnly && (size === "sm" ? "min-w-9 px-0" : "min-w-10 px-0"),
              "[@media(pointer:coarse)]:min-h-11",
              iconOnly && "[@media(pointer:coarse)]:min-w-11",
              checked ? "bg-ink text-paper" : "text-ink hover:bg-sunken",
            )}
          >
            {option.icon}
            {iconOnly ? null : <span>{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
