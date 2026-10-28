import { useId, type ComponentProps, type ReactNode } from "react";
import { cx } from "./cx";
import { Icon } from "./icons";

type FieldProps = {
  label: ReactNode;
  /** Keep the label for screen readers only (a toolbar select whose row already says what it is). */
  hideLabel?: boolean;
  /** A specific, already translated message under the control. It also marks the control invalid. */
  error?: string;
  /** Quiet help under the control. */
  hint?: string;
};

type MessageProps = { id: string; error?: string; hint?: string };

/** The error or hint line under a control. Custom controls use it with the ids they point `aria-describedby` at. */
export function FieldMessage({ id, error, hint }: MessageProps) {
  if (error) {
    return (
      <p id={id} role="alert" className="mt-1 flex items-start gap-1 text-sm text-bad">
        <Icon name="warn-circle" size={16} className="mt-0.5 shrink-0" />
        <span>{error}</span>
      </p>
    );
  }
  if (hint) {
    return (
      <p id={id} className="mt-1 text-sm text-muted">
        {hint}
      </p>
    );
  }
  return null;
}

const control =
  "ink-field w-full max-w-full motion-fade hover:border-muted aria-invalid:border-bad " +
  "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-rule read-only:text-muted read-only:hover:border-rule";

function useField(id: string | undefined, { error, hint }: Pick<FieldProps, "error" | "hint">) {
  const own = useId();
  const fieldId = id ?? own;
  const messageId = `${fieldId}-msg`;
  return {
    fieldId,
    messageId,
    aria: {
      "aria-invalid": error ? (true as const) : undefined,
      "aria-describedby": error || hint ? messageId : undefined,
    },
  };
}

function Labelled({ fieldId, label, hideLabel, children, message }: { fieldId: string; label: ReactNode; hideLabel?: boolean; children: ReactNode; message: ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={fieldId} className={hideLabel ? "sr-only" : "field-label mb-1 block"}>
        {label}
      </label>
      {children}
      {message}
    </div>
  );
}

/** A labelled select in the one field shape; the caret is drawn here, not by the browser. */
export function Select({ label, hideLabel, error, hint, id, className, children, ...rest }: ComponentProps<"select"> & FieldProps) {
  const { fieldId, messageId, aria } = useField(id, { error, hint });
  return (
    <Labelled fieldId={fieldId} label={label} hideLabel={hideLabel} message={<FieldMessage id={messageId} error={error} hint={hint} />}>
      <div className="relative">
        <select id={fieldId} className={cx(control, className)} {...aria} {...rest}>
          {children}
        </select>
        <Icon name="chevron-down" size={16} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-muted" />
      </div>
    </Labelled>
  );
}

/** A labelled text input in the same shape as Select. */
export function TextInput({ label, hideLabel, error, hint, id, className, type = "text", ...rest }: ComponentProps<"input"> & FieldProps) {
  const { fieldId, messageId, aria } = useField(id, { error, hint });
  return (
    <Labelled fieldId={fieldId} label={label} hideLabel={hideLabel} message={<FieldMessage id={messageId} error={error} hint={hint} />}>
      <input id={fieldId} type={type} className={cx(control, className)} {...aria} {...rest} />
    </Labelled>
  );
}

/** A labelled multi-line field in the same shape as TextInput. */
export function TextArea({ label, hideLabel, error, hint, id, className, rows = 4, ...rest }: ComponentProps<"textarea"> & FieldProps) {
  const { fieldId, messageId, aria } = useField(id, { error, hint });
  return (
    <Labelled fieldId={fieldId} label={label} hideLabel={hideLabel} message={<FieldMessage id={messageId} error={error} hint={hint} />}>
      <textarea id={fieldId} rows={rows} className={cx(control, "resize-y", className)} {...aria} {...rest} />
    </Labelled>
  );
}
