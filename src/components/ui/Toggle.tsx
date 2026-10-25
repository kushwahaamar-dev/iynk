"use client";

import { useId } from "react";
import { cx } from "./cx";

type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
};

/** An on/off switch (role="switch") with a visible label. */
export function Toggle({ checked, onChange, label, description, disabled, className }: ToggleProps) {
  const id = useId();
  return (
    <div className={cx("flex min-h-11 items-center justify-between gap-4", className)}>
      <span className="min-w-0">
        <span id={`${id}-l`} className="block font-body text-sm font-semibold">
          {label}
        </span>
        {description ? (
          <span id={`${id}-d`} className="block text-sm text-muted">
            {description}
          </span>
        ) : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-l`}
        aria-describedby={description ? `${id}-d` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="group relative inline-flex h-11 w-16 shrink-0 cursor-pointer items-center rounded-full disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          aria-hidden="true"
          className={cx(
            "absolute inset-x-1 inset-y-2 rounded-full border-2 border-line transition-colors",
            checked ? "bg-mint" : "bg-sunken",
          )}
        />
        <span
          aria-hidden="true"
          className={cx(
            "absolute top-1/2 size-5 -translate-y-1/2 rounded-full border-2 border-line bg-surface shadow-ink-sm transition-[inset-inline-start] duration-150",
            checked ? "start-9" : "start-2",
          )}
        />
      </button>
    </div>
  );
}
