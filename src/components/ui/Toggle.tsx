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
        <span id={`${id}-l`} className="block text-sm font-semibold">
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
        className="group inline-flex h-11 w-12 shrink-0 cursor-pointer items-center justify-center disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          aria-hidden="true"
          className={cx(
            "motion-fade relative h-6 w-10 rounded-full border border-muted",
            checked ? "bg-accent" : "bg-sunken",
          )}
        >
          <span
            className={cx(
              "motion-move absolute start-0.5 top-0.5 size-5 rounded-full bg-paper shadow-sm",
              checked ? "translate-x-4 rtl:-translate-x-4" : "translate-x-0",
            )}
          />
        </span>
      </button>
    </div>
  );
}
