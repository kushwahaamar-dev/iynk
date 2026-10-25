import { useId, type ComponentProps, type ReactNode } from "react";
import { cx } from "./cx";

type FieldProps = {
  label: ReactNode;
  /** Keep the label for screen readers only (a toolbar select whose row already says what it is). */
  hideLabel?: boolean;
};

function FieldLabel({ id, label, hideLabel }: FieldProps & { id: string }) {
  return (
    <label htmlFor={id} className={hideLabel ? "sr-only" : "ink-label mb-1 block"}>
      {label}
    </label>
  );
}

/** A labelled select in the one field shape (the 44 px pill). */
export function Select({ label, hideLabel, id, className, children, ...rest }: ComponentProps<"select"> & FieldProps) {
  const own = useId();
  const fieldId = id ?? own;
  return (
    <div className="min-w-0">
      <FieldLabel id={fieldId} label={label} hideLabel={hideLabel} />
      <select id={fieldId} className={cx("ink-field w-full max-w-full", className)} {...rest}>
        {children}
      </select>
    </div>
  );
}

/** A labelled text input in the same shape as Select. */
export function TextInput({ label, hideLabel, id, className, type = "text", ...rest }: ComponentProps<"input"> & FieldProps) {
  const own = useId();
  const fieldId = id ?? own;
  return (
    <div className="min-w-0">
      <FieldLabel id={fieldId} label={label} hideLabel={hideLabel} />
      <input id={fieldId} type={type} className={cx("ink-field w-full max-w-full pe-4", className)} {...rest} />
    </div>
  );
}
