import type { ReactNode } from "react";
import { cx } from "./cx";
import { Icon } from "./icons";

export type StepStatus = "done" | "current" | "todo";
export type StepItem = { id: string; label: ReactNode; description?: ReactNode; status: StepStatus };

type StepperProps = {
  /** Accessible name of the list, e.g. "Build steps". */
  label: string;
  steps: readonly StepItem[];
  /** Words read out after a step's name. */
  statusText: { done: string; current: string };
  /** Make steps clickable (jump back to a finished step, say). */
  onSelect?: (id: string) => void;
  orientation?: "vertical" | "horizontal";
  className?: string;
};

/** An ordered list of steps with done, current and upcoming states. */
export function Stepper({ label, steps, statusText, onSelect, orientation = "vertical", className }: StepperProps) {
  return (
    <ol
      aria-label={label}
      className={cx(orientation === "horizontal" ? "flex flex-wrap gap-x-2 gap-y-3" : "flex flex-col", className)}
    >
      {steps.map((step, index) => {
        const marker = (
          <span
            aria-hidden="true"
            className={cx(
              "flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-line font-ui text-sm font-bold",
              step.status === "done" && "bg-mint text-on-color",
              step.status === "current" && "bg-mustard text-on-color shadow-ink-sm",
              step.status === "todo" && "bg-surface text-muted",
            )}
          >
            {step.status === "done" ? <Icon name="check" size={16} strokeWidth={3} /> : index + 1}
          </span>
        );
        const text = (
          <span className="min-w-0 text-start">
            <span className={cx("block font-body text-sm", step.status === "current" ? "font-bold" : "font-semibold")}>
              {step.label}
              {step.status !== "todo" ? <span className="sr-only">, {statusText[step.status]}</span> : null}
            </span>
            {step.description ? <span className="block text-sm text-muted">{step.description}</span> : null}
          </span>
        );
        const body = (
          <>
            {marker}
            {text}
          </>
        );
        return (
          <li
            key={step.id}
            aria-current={step.status === "current" ? "step" : undefined}
            className={cx(
              "relative",
              orientation === "vertical" &&
                "pb-4 last:pb-0 [&:not(:last-child)]:before:absolute [&:not(:last-child)]:before:start-[15px] [&:not(:last-child)]:before:top-9 [&:not(:last-child)]:before:bottom-1 [&:not(:last-child)]:before:w-0.5 [&:not(:last-child)]:before:bg-line",
            )}
          >
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(step.id)}
                className="flex min-h-11 w-full items-start gap-3 rounded-lg text-start hover:bg-sunken"
              >
                {body}
              </button>
            ) : (
              <div className="flex min-h-11 items-start gap-3">{body}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
