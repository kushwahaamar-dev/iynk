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
  /** Equal-width segments across the full width of the parent. */
  stretch?: boolean;
  className?: string;
};

/**
 * One choice out of a few (role="radiogroup"). Arrow keys move the choice,
 * Home and End jump to the ends; only the chosen option is in the tab order.
 * It never wraps: a row too long for its box scrolls sideways.
 */
export function SegmentedControl<V extends string>({ label, options, value, onChange, iconOnly, size = "md", stretch, className }: SegmentedControlProps<V>) {
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
      className={cx(
        "max-w-full flex-nowrap overflow-x-auto rounded-full border-2 border-line bg-surface p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        stretch ? "flex w-full" : "inline-flex shrink-0",
        className,
      )}
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
              "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-body font-semibold transition-colors",
              size === "sm" ? "min-h-8 px-2.5 text-sm" : "min-h-10 px-3.5 text-sm",
              stretch && "min-w-0 flex-1",
              iconOnly && (size === "sm" ? "min-w-8 px-0" : "min-w-10 px-0"),
              "[@media(pointer:coarse)]:min-h-11",
              iconOnly && "[@media(pointer:coarse)]:min-w-11",
              // The row may scroll, which would clip a ring drawn outside the option, so the ring is drawn inside it:
              // paper on the ink fill of the checked option, ink on the others.
              "focus-visible:outline-2 focus-visible:outline-offset-[-5px] focus-visible:shadow-none",
              checked ? "bg-ink text-paper focus-visible:outline-(--paper)" : "text-ink hover:bg-sunken focus-visible:outline-(--ink)",
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
